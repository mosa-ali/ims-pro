/**
 * ExportQueueEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Asynchronous Export Queue
 *
 * EXPORT PLATFORM ENHANCEMENT #1  ★★★★★
 *
 * Flow:
 *   Export Request → Queue → Worker → Excel → Storage → Notification → Download
 *
 * Why async:
 *  - Donor reports: 300,000+ rows, multiple worksheets, charts, formulas
 *  - User shouldn't wait 30-60 seconds staring at spinner
 *  - Workers can run on separate processes/servers
 *  - Retry on failure without losing user's request
 *  - Rate limiting (don't overload DB with concurrent report queries)
 *
 * Enhancement #9/#10: Large report handling
 *  - Auto-split >50,000 rows into multiple worksheets
 *  - Streaming mode for 1M+ rows (memory-efficient)
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, IConfigService, RepositoryScope } from '../PHASE3_HARDENED/PlatformInterfaces';
import type { ExportRequest, ExportResult, ExportStatus } from './ReportExportTypes';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export type JobPriority = 'high' | 'normal' | 'low';
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'retrying';

export interface ExportJob {
  jobId: string;
  exportRequest: ExportRequest;
  priority: JobPriority;
  status: JobStatus;
  attempt: number;
  maxAttempts: number;
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  error?: string;
  result?: ExportResult;
  /** Worker that picked up this job */
  workerId?: string;
  /** Estimated row count (for progress tracking) */
  estimatedRows?: number;
  /** Processing progress (0-100) */
  progress: number;
  /** Performance flags */
  performanceHints: {
    /** Auto-split worksheets if rows > threshold */
    autoSplitThreshold: number;
    /** Use streaming mode if rows > threshold */
    streamingThreshold: number;
    /** Enable chart generation */
    includeCharts: boolean;
  };
}

export interface QueueStats {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  averageProcessingMs: number;
  oldestQueuedAge?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// INTERFACES
// ────────────────────────────────────────────────────────────────────────────

export interface IExportJobRepository {
  enqueue(job: ExportJob): Promise<void>;
  dequeue(workerId: string): Promise<ExportJob | null>;
  getJob(jobId: string): Promise<ExportJob | null>;
  updateJob(jobId: string, fields: Partial<ExportJob>): Promise<void>;
  listByUser(userId: number, scope: RepositoryScope, limit?: number): Promise<ExportJob[]>;
  getStats(): Promise<QueueStats>;
  cleanupCompleted(olderThanHours: number): Promise<number>;
}

export interface IExportNotifier {
  notifyCompleted(userId: number, jobId: string, fileName: string, downloadUrl: string): Promise<void>;
  notifyFailed(userId: number, jobId: string, error: string): Promise<void>;
}

export interface IExportWorkerCallback {
  processExport(request: ExportRequest): Promise<ExportResult>;
}

export interface ExportQueueDependencies {
  jobRepo: IExportJobRepository;
  notifier: IExportNotifier;
  logger: ILogger;
  config: IConfigService;
}

// ────────────────────────────────────────────────────────────────────────────
// QUEUE ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class ExportQueueEngine {
  private jobRepo: IExportJobRepository;
  private notifier: IExportNotifier;
  private logger: ILogger;
  private config: IConfigService;

  constructor(deps: ExportQueueDependencies) {
    this.jobRepo = deps.jobRepo;
    this.notifier = deps.notifier;
    this.logger = deps.logger.child({ service: 'ExportQueueEngine' });
    this.config = deps.config;
  }

  /**
   * Submit an export request to the queue.
   * Returns immediately with a jobId for polling.
   */
  async submit(
    request: ExportRequest,
    options?: {
      priority?: JobPriority;
      estimatedRows?: number;
      includeCharts?: boolean;
    },
  ): Promise<{ jobId: string; status: JobStatus; estimatedWaitMs: number }> {
    const jobId = uuidv4();
    const splitThreshold = this.config.getNumber('export.autoSplitThreshold', 50_000);
    const streamThreshold = this.config.getNumber('export.streamingThreshold', 1_000_000);
    const maxAttempts = this.config.getNumber('export.maxAttempts', 3);

    const job: ExportJob = {
      jobId,
      exportRequest: request,
      priority: options?.priority || 'normal',
      status: 'queued',
      attempt: 0,
      maxAttempts,
      queuedAt: new Date().toISOString(),
      progress: 0,
      estimatedRows: options?.estimatedRows,
      performanceHints: {
        autoSplitThreshold: splitThreshold,
        streamingThreshold: streamThreshold,
        includeCharts: options?.includeCharts || false,
      },
    };

    await this.jobRepo.enqueue(job);

    // Estimate wait time based on queue depth
    const stats = await this.jobRepo.getStats();
    const avgMs = stats.averageProcessingMs || 5000;
    const estimatedWaitMs = (stats.queued + stats.processing) * avgMs;

    this.logger.info('Export job queued', {
      jobId,
      reportId: request.reportId,
      priority: job.priority,
      queueDepth: stats.queued,
    });

    return { jobId, status: 'queued', estimatedWaitMs };
  }

  /**
   * Poll job status (called by UI for progress updates).
   */
  async getJobStatus(jobId: string): Promise<{
    status: JobStatus;
    progress: number;
    result?: ExportResult;
    error?: string;
  }> {
    const job = await this.jobRepo.getJob(jobId);
    if (!job) throw new Error(`Export job ${jobId} not found`);

    return {
      status: job.status,
      progress: job.progress,
      result: job.result,
      error: job.error,
    };
  }

  /**
   * Cancel a queued job (cannot cancel processing jobs).
   */
  async cancel(jobId: string): Promise<void> {
    const job = await this.jobRepo.getJob(jobId);
    if (!job) throw new Error(`Export job ${jobId} not found`);
    if (job.status !== 'queued') throw new Error('Can only cancel queued jobs');

    await this.jobRepo.updateJob(jobId, { status: 'cancelled' });
    this.logger.info('Export job cancelled', { jobId });
  }

  // ────────────────────────────────────────────────────────────────────────
  // WORKER SIDE
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Worker picks up next job from queue.
   * Called by the worker process in a loop.
   */
  async pickupNextJob(workerId: string): Promise<ExportJob | null> {
    const job = await this.jobRepo.dequeue(workerId);
    if (!job) return null;

    await this.jobRepo.updateJob(job.jobId, {
      status: 'processing',
      startedAt: new Date().toISOString(),
      workerId,
      attempt: job.attempt + 1,
    });

    this.logger.info('Worker picked up job', { jobId: job.jobId, workerId });
    return job;
  }

  /**
   * Worker reports job completed.
   */
  async completeJob(jobId: string, result: ExportResult): Promise<void> {
    const job = await this.jobRepo.getJob(jobId);
    if (!job) return;

    await this.jobRepo.updateJob(jobId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      result,
      progress: 100,
    });

    // Notify user
    if (result.downloadUrl) {
      await this.notifier.notifyCompleted(
        job.exportRequest.requestedBy,
        jobId,
        result.fileName,
        result.downloadUrl,
      );
    }

    this.logger.info('Export job completed', {
      jobId,
      durationMs: result.durationMs,
      rows: result.rowCount,
    });
  }

  /**
   * Worker reports job failed. Auto-retry if attempts remain.
   */
  async failJob(jobId: string, error: string): Promise<void> {
    const job = await this.jobRepo.getJob(jobId);
    if (!job) return;

    if (job.attempt < job.maxAttempts) {
      // Retry with exponential backoff
      const delayMs = 1000 * Math.pow(2, job.attempt);
      await this.jobRepo.updateJob(jobId, {
        status: 'retrying',
        error,
        failedAt: new Date().toISOString(),
      });

      this.logger.warn('Export job failed, will retry', {
        jobId,
        attempt: job.attempt,
        maxAttempts: job.maxAttempts,
        retryDelayMs: delayMs,
        error,
      });

      // Re-queue after delay (in production, use job scheduler)
      setTimeout(async () => {
        await this.jobRepo.updateJob(jobId, { status: 'queued' });
      }, delayMs);
    } else {
      // Final failure
      await this.jobRepo.updateJob(jobId, {
        status: 'failed',
        error,
        failedAt: new Date().toISOString(),
      });

      await this.notifier.notifyFailed(
        job.exportRequest.requestedBy,
        jobId,
        error,
      );

      this.logger.error('Export job permanently failed', {
        jobId,
        attempts: job.attempt,
        error,
      });
    }
  }

  /**
   * Worker reports progress update.
   */
  async updateProgress(jobId: string, progress: number): Promise<void> {
    await this.jobRepo.updateJob(jobId, { progress: Math.min(99, Math.max(0, progress)) });
  }

  // ────────────────────────────────────────────────────────────────────────
  // LARGE REPORT HELPERS
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Determine if a report needs special handling.
   */
  getPerformanceStrategy(rowCount: number, job: ExportJob): {
    mode: 'standard' | 'split' | 'streaming';
    worksheetCount: number;
    rowsPerSheet: number;
  } {
    const { autoSplitThreshold, streamingThreshold } = job.performanceHints;

    if (rowCount > streamingThreshold) {
      return {
        mode: 'streaming',
        worksheetCount: Math.ceil(rowCount / autoSplitThreshold),
        rowsPerSheet: autoSplitThreshold,
      };
    }

    if (rowCount > autoSplitThreshold) {
      return {
        mode: 'split',
        worksheetCount: Math.ceil(rowCount / autoSplitThreshold),
        rowsPerSheet: autoSplitThreshold,
      };
    }

    return { mode: 'standard', worksheetCount: 1, rowsPerSheet: rowCount };
  }
}
