/**
 * GLPostingPipeline.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Single Authoritative Posting Pipeline
 *
 * PHASE 4 REFINEMENT #1
 *
 * All journal entries flow through ONE pipeline:
 *
 *   Any Engine (Accrual, Allocation, Template, Manual)
 *     ↓ JournalEntryInput
 *   GLPostingPipeline.submit()
 *     ↓ 1. Posting Validation (10+ controls)
 *     ↓ 2. Approval Workflow (if required)
 *     ↓ 3. Finance Orchestrator (saga, idempotency)
 *     ↓ 4. Event Bus (publish GL_POSTED)
 *     ↓ 5. Journal Router (journalEntriesRouter.create + .post)
 *     ↓ JournalEntryResult
 *
 * No engine ever calls journalEntriesRouter directly.
 * This creates one auditable path for every GL posting.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, RepositoryScope } from '../PHASE3_HARDENED/PlatformInterfaces';
import type { JournalEntryInput } from './GeneralLedgerEngine';
import type { PostingValidationEngine, ValidationResult } from './PostingValidationEngine';
import type { ApprovalWorkflowEngine, ApprovalStatus } from './ApprovalWorkflowEngine';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export type PipelineStage =
  | 'validation'
  | 'approval_check'
  | 'awaiting_approval'
  | 'posting'
  | 'event_publishing'
  | 'completed'
  | 'rejected';

export interface PipelineResult {
  pipelineId: string;
  stage: PipelineStage;
  journalEntryId?: number;
  entryNumber?: string;
  validationResult: ValidationResult;
  approvalStatus?: ApprovalStatus;
  eventId?: string;
  timestamp: string;
  /** If stage is 'awaiting_approval', caller must wait for approval callback */
  awaitingApproval: boolean;
}

export interface PipelineSubmission {
  /** The journal entry to post */
  entry: JournalEntryInput;
  /** Who submitted this (from ctx.user.id) */
  submittedBy: number;
  /** Source system that generated this entry */
  sourceEngine: string;
  /** Idempotency key — prevents duplicate submissions */
  idempotencyKey: string;
}

// ────────────────────────────────────────────────────────────────────────────
// PIPELINE CALLBACKS (injected — no circular dependencies)
// ────────────────────────────────────────────────────────────────────────────

export interface IJournalPoster {
  /** Create + post a journal entry via the existing router */
  createAndPost(
    entry: JournalEntryInput,
    scope: RepositoryScope,
    userId: number,
  ): Promise<{ journalEntryId: number; entryNumber: string }>;
}

export interface IEventPublisher {
  /** Publish GL_POSTED event */
  publishGLPosted(
    journalEntryId: number,
    entryNumber: string,
    totalDebit: number,
    totalCredit: number,
    context: {
      sourceEventId: string;
      organizationId: number;
      operatingUnitId: number;
      userId: number;
    },
  ): Promise<{ eventId: string }>;
}

export interface IPipelineRepository {
  /** Track pipeline execution for audit */
  recordExecution(record: PipelineAuditRecord): Promise<void>;
  /** Check idempotency — has this key been processed? */
  findByIdempotencyKey(key: string, scope: RepositoryScope): Promise<PipelineResult | null>;
}

export interface PipelineAuditRecord {
  pipelineId: string;
  idempotencyKey: string;
  sourceEngine: string;
  submittedBy: number;
  stage: PipelineStage;
  journalEntryId?: number;
  validationPassed: boolean;
  approvalRequired: boolean;
  eventId?: string;
  organizationId: number;
  operatingUnitId: number;
  timestamp: string;
}

// ────────────────────────────────────────────────────────────────────────────
// PIPELINE
// ────────────────────────────────────────────────────────────────────────────

export class GLPostingPipeline {
  private validation: PostingValidationEngine;
  private approval: ApprovalWorkflowEngine;
  private poster: IJournalPoster;
  private publisher: IEventPublisher;
  private pipelineRepo: IPipelineRepository;
  private logger: ILogger;

  constructor(deps: {
    validation: PostingValidationEngine;
    approval: ApprovalWorkflowEngine;
    poster: IJournalPoster;
    publisher: IEventPublisher;
    pipelineRepo: IPipelineRepository;
    logger: ILogger;
  }) {
    this.validation = deps.validation;
    this.approval = deps.approval;
    this.poster = deps.poster;
    this.publisher = deps.publisher;
    this.pipelineRepo = deps.pipelineRepo;
    this.logger = deps.logger.child({ service: 'GLPostingPipeline' });
  }

  /**
   * Submit a journal entry through the full posting pipeline.
   *
   * Every engine calls this instead of journalEntriesRouter directly.
   */
  async submit(
    submission: PipelineSubmission,
    scope: RepositoryScope,
  ): Promise<PipelineResult> {
    const pipelineId = uuidv4();

    this.logger.info('Pipeline started', {
      pipelineId,
      sourceEngine: submission.sourceEngine,
      idempotencyKey: submission.idempotencyKey,
    });

    // ── STAGE 0: IDEMPOTENCY CHECK ──
    const existing = await this.pipelineRepo.findByIdempotencyKey(
      submission.idempotencyKey, scope,
    );
    if (existing) {
      this.logger.info('Idempotent submission — returning cached result', {
        pipelineId, cachedPipelineId: existing.pipelineId,
      });
      return existing;
    }

    // ── STAGE 1: VALIDATION ──
    const validationResult = await this.validation.validate(
      submission.entry, submission.submittedBy, scope,
    );

    if (!validationResult.valid) {
      const result = this.buildResult(pipelineId, 'rejected', validationResult);

      await this.pipelineRepo.recordExecution({
        pipelineId,
        idempotencyKey: submission.idempotencyKey,
        sourceEngine: submission.sourceEngine,
        submittedBy: submission.submittedBy,
        stage: 'rejected',
        validationPassed: false,
        approvalRequired: false,
        organizationId: scope.organizationId,
        operatingUnitId: scope.operatingUnitId,
        timestamp: result.timestamp,
      });

      this.logger.warn('Pipeline rejected at validation', {
        pipelineId,
        errors: validationResult.issues.filter(i => i.severity === 'error').length,
      });

      return result;
    }

    // ── STAGE 2: APPROVAL CHECK ──
    if (validationResult.requiresApproval) {
      const approvalRequest = await this.approval.requestApproval({
        entityType: 'journal_entry',
        entityData: submission.entry,
        reason: validationResult.approvalReason || 'Approval required',
        requestedBy: submission.submittedBy,
        organizationId: scope.organizationId,
        operatingUnitId: scope.operatingUnitId,
      });

      const result = this.buildResult(pipelineId, 'awaiting_approval', validationResult, {
        approvalStatus: approvalRequest.status,
        awaitingApproval: true,
      });

      await this.pipelineRepo.recordExecution({
        pipelineId,
        idempotencyKey: submission.idempotencyKey,
        sourceEngine: submission.sourceEngine,
        submittedBy: submission.submittedBy,
        stage: 'awaiting_approval',
        validationPassed: true,
        approvalRequired: true,
        organizationId: scope.organizationId,
        operatingUnitId: scope.operatingUnitId,
        timestamp: result.timestamp,
      });

      this.logger.info('Pipeline awaiting approval', { pipelineId });
      return result;
    }

    // ── STAGE 3: POST ──
    const { journalEntryId, entryNumber } = await this.poster.createAndPost(
      submission.entry, scope, submission.submittedBy,
    );

    // ── STAGE 4: PUBLISH EVENT ──
    const totalDebit = submission.entry.lines.reduce(
      (s, l) => s + parseFloat(l.debitAmount), 0,
    );
    const totalCredit = submission.entry.lines.reduce(
      (s, l) => s + parseFloat(l.creditAmount), 0,
    );

    const { eventId } = await this.publisher.publishGLPosted(
      journalEntryId, entryNumber, totalDebit, totalCredit,
      {
        sourceEventId: submission.idempotencyKey,
        organizationId: scope.organizationId,
        operatingUnitId: scope.operatingUnitId,
        userId: submission.submittedBy,
      },
    );

    // ── STAGE 5: COMPLETED ──
    const result = this.buildResult(pipelineId, 'completed', validationResult, {
      journalEntryId,
      entryNumber,
      eventId,
    });

    await this.pipelineRepo.recordExecution({
      pipelineId,
      idempotencyKey: submission.idempotencyKey,
      sourceEngine: submission.sourceEngine,
      submittedBy: submission.submittedBy,
      stage: 'completed',
      journalEntryId,
      validationPassed: true,
      approvalRequired: false,
      eventId,
      organizationId: scope.organizationId,
      operatingUnitId: scope.operatingUnitId,
      timestamp: result.timestamp,
    });

    this.logger.info('Pipeline completed', {
      pipelineId, journalEntryId, entryNumber, eventId,
    });

    return result;
  }

  // ── PRIVATE ──

  private buildResult(
    pipelineId: string,
    stage: PipelineStage,
    validationResult: ValidationResult,
    extras?: {
      journalEntryId?: number;
      entryNumber?: string;
      eventId?: string;
      approvalStatus?: ApprovalStatus;
      awaitingApproval?: boolean;
    },
  ): PipelineResult {
    return {
      pipelineId,
      stage,
      journalEntryId: extras?.journalEntryId,
      entryNumber: extras?.entryNumber,
      validationResult,
      approvalStatus: extras?.approvalStatus,
      eventId: extras?.eventId,
      timestamp: new Date().toISOString(),
      awaitingApproval: extras?.awaitingApproval || false,
    };
  }
}
