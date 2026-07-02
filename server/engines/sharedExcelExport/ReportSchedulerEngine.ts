/**
 * ReportSchedulerEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Scheduled Report Generation
 *
 * EXPORT PLATFORM ENHANCEMENT #2  ★★★★★
 *
 * Examples:
 *   Every month  → Generate Trial Balance → Email CFO
 *   Every Monday → Generate Cash Forecast → Email Treasury
 *   Quarterly    → Generate Donor Report  → Email Grant Manager
 *
 * Supports: daily, weekly, monthly, quarterly, yearly
 * Delivery: email, in-app notification, shared drive
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, IConfigService, RepositoryScope } from '../../engines/finance/PlatformInterfaces';
import type { ExportRequest, ExportResult } from './ReportExportTypes';
import type { ExportQueueEngine } from './ExportQueueEngine';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export type ScheduleFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
export type DeliveryChannel = 'email' | 'in_app' | 'shared_drive';
export type ScheduleStatus = 'active' | 'paused' | 'completed' | 'disabled';

export interface ReportSchedule {
  scheduleId: string;
  reportId: string;
  organizationId: number;
  operatingUnitId: number;
  name: string;
  description: string;
  frequency: ScheduleFrequency;
  /** Day of week for weekly (0=Sun, 1=Mon, ...) */
  dayOfWeek?: number;
  /** Day of month for monthly/quarterly */
  dayOfMonth?: number;
  /** Time of day (HH:MM) */
  timeOfDay: string;
  /** Report locale */
  locale: 'en' | 'ar' | 'it';
  /** Filters applied to report */
  filters: Record<string, unknown>;
  /** Dynamic filter: use current fiscal year, current month, etc. */
  dynamicFilters: DynamicFilter[];
  /** Who receives the report */
  recipients: ScheduleRecipient[];
  /** Delivery channels */
  deliveryChannels: DeliveryChannel[];
  /** Schedule metadata */
  status: ScheduleStatus;
  nextRunAt: string;
  lastRunAt?: string;
  lastRunStatus?: 'success' | 'failure';
  lastRunError?: string;
  runCount: number;
  maxRuns?: number;
  startDate: string;
  endDate?: string;
  createdBy: number;
  createdAt: string;
}

export interface DynamicFilter {
  filterKey: string;
  /** Expression: 'current_month_end', 'current_fiscal_year', 'last_month_start', etc. */
  expression: string;
}

export interface ScheduleRecipient {
  userId?: number;
  email: string;
  name: string;
  role?: string;
}

export interface ScheduleRun {
  runId: string;
  scheduleId: string;
  triggeredAt: string;
  status: 'success' | 'failure' | 'skipped';
  exportJobId?: string;
  fileName?: string;
  deliveryResults: Array<{
    channel: DeliveryChannel;
    recipient: string;
    status: 'sent' | 'failed';
    error?: string;
  }>;
  durationMs?: number;
  error?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// REPOSITORY
// ────────────────────────────────────────────────────────────────────────────

export interface IScheduleRepository {
  save(schedule: ReportSchedule): Promise<void>;
  getById(scheduleId: string): Promise<ReportSchedule | null>;
  listActive(scope: RepositoryScope): Promise<ReportSchedule[]>;
  listDue(asOfDate: string): Promise<ReportSchedule[]>;
  update(scheduleId: string, fields: Partial<ReportSchedule>): Promise<void>;
  saveRun(run: ScheduleRun): Promise<void>;
  getRunHistory(scheduleId: string, limit?: number): Promise<ScheduleRun[]>;
}

export interface IReportDelivery {
  deliverViaEmail(
    recipients: ScheduleRecipient[],
    reportName: string,
    downloadUrl: string,
    locale: string,
  ): Promise<Array<{ recipient: string; status: 'sent' | 'failed'; error?: string }>>;

  deliverToSharedDrive(
    fileName: string,
    filePath: string,
    folder: string,
  ): Promise<{ status: 'sent' | 'failed'; error?: string }>;
}

export interface SchedulerDependencies {
  scheduleRepo: IScheduleRepository;
  exportQueue: ExportQueueEngine;
  delivery: IReportDelivery;
  logger: ILogger;
  config: IConfigService;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class ReportSchedulerEngine {
  private repo: IScheduleRepository;
  private exportQueue: ExportQueueEngine;
  private delivery: IReportDelivery;
  private logger: ILogger;
  private config: IConfigService;

  constructor(deps: SchedulerDependencies) {
    this.repo = deps.scheduleRepo;
    this.exportQueue = deps.exportQueue;
    this.delivery = deps.delivery;
    this.logger = deps.logger.child({ service: 'ReportSchedulerEngine' });
    this.config = deps.config;
  }

  /**
   * Create a new report schedule.
   */
  async createSchedule(
    input: Omit<ReportSchedule, 'scheduleId' | 'createdAt' | 'runCount' | 'status'>,
  ): Promise<ReportSchedule> {
    const schedule: ReportSchedule = {
      ...input,
      scheduleId: uuidv4(),
      createdAt: new Date().toISOString(),
      runCount: 0,
      status: 'active',
    };

    if (schedule.recipients.length === 0) {
      throw new Error('Schedule must have at least one recipient');
    }

    await this.repo.save(schedule);
    this.logger.info('Report schedule created', {
      scheduleId: schedule.scheduleId,
      reportId: schedule.reportId,
      frequency: schedule.frequency,
      recipients: schedule.recipients.length,
    });
    return schedule;
  }

  /**
   * Process all due schedules.
   * Called by cron job (e.g., every 15 minutes).
   */
  async processDueSchedules(): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    skipped: number;
  }> {
    const now = new Date().toISOString();
    const dueSchedules = await this.repo.listDue(now);

    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    for (const schedule of dueSchedules) {
      if (schedule.status !== 'active') { skipped++; continue; }
      if (schedule.endDate && now > schedule.endDate) { skipped++; continue; }
      if (schedule.maxRuns && schedule.runCount >= schedule.maxRuns) { skipped++; continue; }

      processed++;
      const runId = uuidv4();

      try {
        // Resolve dynamic filters
        const resolvedFilters = this.resolveDynamicFilters(
          schedule.filters,
          schedule.dynamicFilters,
        );

        // Submit to export queue
        const scope: RepositoryScope = {
          organizationId: schedule.organizationId,
          operatingUnitId: schedule.operatingUnitId,
        };

        const exportRequest: ExportRequest = {
          reportId: schedule.reportId,
          format: 'xlsx',
          locale: schedule.locale,
          filters: resolvedFilters,
          scope,
          requestedBy: schedule.createdBy,
          requestedAt: new Date().toISOString(),
        };

        const { jobId } = await this.exportQueue.submit(exportRequest, {
          priority: 'normal',
        });

        // Note: delivery happens after job completes (via notification callback)
        // For now, record the run
        const run: ScheduleRun = {
          runId,
          scheduleId: schedule.scheduleId,
          triggeredAt: now,
          status: 'success',
          exportJobId: jobId,
          deliveryResults: [],
        };

        await this.repo.saveRun(run);

        // Update schedule
        await this.repo.update(schedule.scheduleId, {
          lastRunAt: now,
          lastRunStatus: 'success',
          nextRunAt: this.calculateNextRun(schedule),
          runCount: schedule.runCount + 1,
        });

        succeeded++;

        this.logger.info('Scheduled report triggered', {
          scheduleId: schedule.scheduleId,
          reportId: schedule.reportId,
          jobId,
        });

      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        failed++;

        await this.repo.saveRun({
          runId,
          scheduleId: schedule.scheduleId,
          triggeredAt: now,
          status: 'failure',
          error,
          deliveryResults: [],
        });

        await this.repo.update(schedule.scheduleId, {
          lastRunAt: now,
          lastRunStatus: 'failure',
          lastRunError: error,
          nextRunAt: this.calculateNextRun(schedule),
          runCount: schedule.runCount + 1,
        });

        this.logger.error('Scheduled report failed', {
          scheduleId: schedule.scheduleId,
          error,
        });
      }
    }

    if (processed > 0) {
      this.logger.info('Schedule processing completed', {
        processed, succeeded, failed, skipped,
      });
    }

    return { processed, succeeded, failed, skipped };
  }

  /**
   * Deliver a completed export to schedule recipients.
   * Called when export job completes (via notification callback).
   */
  async deliverToRecipients(
    scheduleId: string,
    exportResult: ExportResult,
  ): Promise<void> {
    const schedule = await this.repo.getById(scheduleId);
    if (!schedule || !exportResult.downloadUrl) return;

    for (const channel of schedule.deliveryChannels) {
      if (channel === 'email') {
        await this.delivery.deliverViaEmail(
          schedule.recipients,
          schedule.name,
          exportResult.downloadUrl,
          schedule.locale,
        );
      } else if (channel === 'shared_drive') {
        await this.delivery.deliverToSharedDrive(
          exportResult.fileName,
          exportResult.filePath || '',
          `scheduled/${schedule.reportId}`,
        );
      }
    }
  }

  // ── PRIVATE ──

  private resolveDynamicFilters(
    staticFilters: Record<string, unknown>,
    dynamicFilters: DynamicFilter[],
  ): Record<string, unknown> {
    const resolved = { ...staticFilters };
    const now = new Date();

    for (const df of dynamicFilters) {
      switch (df.expression) {
        case 'current_date':
          resolved[df.filterKey] = now.toISOString().split('T')[0];
          break;
        case 'current_month_start':
          resolved[df.filterKey] = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
          break;
        case 'current_month_end': {
          const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          resolved[df.filterKey] = lastDay.toISOString().split('T')[0];
          break;
        }
        case 'last_month_start': {
          const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          resolved[df.filterKey] = lm.toISOString().split('T')[0];
          break;
        }
        case 'last_month_end': {
          const lme = new Date(now.getFullYear(), now.getMonth(), 0);
          resolved[df.filterKey] = lme.toISOString().split('T')[0];
          break;
        }
        case 'current_fiscal_year':
          resolved[df.filterKey] = String(now.getFullYear());
          break;
        case 'current_quarter_end': {
          const q = Math.ceil((now.getMonth() + 1) / 3);
          const qEnd = new Date(now.getFullYear(), q * 3, 0);
          resolved[df.filterKey] = qEnd.toISOString().split('T')[0];
          break;
        }
      }
    }

    return resolved;
  }

  private calculateNextRun(schedule: ReportSchedule): string {
    const current = new Date(schedule.nextRunAt || new Date());

    switch (schedule.frequency) {
      case 'daily': current.setDate(current.getDate() + 1); break;
      case 'weekly': current.setDate(current.getDate() + 7); break;
      case 'biweekly': current.setDate(current.getDate() + 14); break;
      case 'monthly': current.setMonth(current.getMonth() + 1); break;
      case 'quarterly': current.setMonth(current.getMonth() + 3); break;
      case 'yearly': current.setFullYear(current.getFullYear() + 1); break;
    }

    // Apply time of day
    if (schedule.timeOfDay) {
      const [hours, minutes] = schedule.timeOfDay.split(':').map(Number);
      current.setHours(hours || 0, minutes || 0, 0, 0);
    }

    return current.toISOString();
  }
}
