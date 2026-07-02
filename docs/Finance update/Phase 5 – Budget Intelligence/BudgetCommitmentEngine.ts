/**
 * BudgetCommitmentEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Budget Commitments, Obligations, and Encumbrance
 *
 * PHASE 5: Budget Intelligence
 *
 * Tracks the lifecycle of budget commitments:
 *
 *   Pre-commitment (PR approved) → Commitment (PO issued) →
 *   Obligation (Invoice received) → Expenditure (Payment made)
 *
 * Budget availability = Approved - Actual - Committed - Obligated
 *
 * This engine ensures:
 *  - Budget is reserved when PO is issued (commitment)
 *  - Commitment converts to obligation when invoice is received
 *  - Obligation clears when payment is made (becomes actual)
 *  - Budget is never double-counted
 *  - Donor compliance is maintained throughout lifecycle
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, IConfigService, RepositoryScope } from '../PHASE3_HARDENED/PlatformInterfaces';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export type CommitmentStatus =
  | 'pre_committed'   // PR approved, PO not yet issued
  | 'committed'       // PO issued, goods/services not yet received
  | 'obligated'       // Invoice received, awaiting payment
  | 'partially_paid'  // Partial payment made
  | 'fully_paid'      // Payment complete (becomes actual)
  | 'cancelled'       // Commitment cancelled
  | 'expired';        // Past expiry date without fulfilment

export interface BudgetCommitment {
  commitmentId: string;
  budgetId: number;
  budgetLineId: number;
  organizationId: number;
  operatingUnitId: number;

  // Source document
  sourceType: 'purchase_request' | 'purchase_order' | 'contract' | 'manual';
  sourceDocumentId: number;
  sourceDocumentNumber: string;

  // Amounts
  committedAmount: number;
  obligatedAmount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: string;

  // Lifecycle
  status: CommitmentStatus;
  committedAt: string;
  obligatedAt?: string;
  paidAt?: string;
  cancelledAt?: string;
  expiryDate?: string;

  // Tracking
  vendorId?: number;
  vendorName?: string;
  description: string;
  projectId?: number;
  grantId?: number;
  activityId?: number;

  // Audit
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommitmentSummary {
  budgetId: number;
  budgetLineId?: number;
  totalPreCommitted: number;
  totalCommitted: number;
  totalObligated: number;
  totalPaid: number;
  totalCancelled: number;
  totalExpired: number;
  activeCommitments: number;
  commitmentCount: number;
}

export interface CommitmentLifecycleEvent {
  eventId: string;
  commitmentId: string;
  fromStatus: CommitmentStatus;
  toStatus: CommitmentStatus;
  amount: number;
  performedBy: number;
  performedAt: string;
  reason?: string;
  sourceDocumentId?: number;
}

// ────────────────────────────────────────────────────────────────────────────
// REPOSITORY
// ────────────────────────────────────────────────────────────────────────────

export interface IBudgetCommitmentRepository {
  save(commitment: BudgetCommitment): Promise<void>;
  getById(commitmentId: string, scope: RepositoryScope): Promise<BudgetCommitment | null>;
  getByBudgetLine(budgetLineId: number, scope: RepositoryScope): Promise<BudgetCommitment[]>;
  getByBudget(budgetId: number, scope: RepositoryScope): Promise<BudgetCommitment[]>;
  getBySourceDocument(sourceType: string, sourceDocumentId: number, scope: RepositoryScope): Promise<BudgetCommitment | null>;
  update(commitmentId: string, fields: Partial<BudgetCommitment>): Promise<void>;
  getSummary(budgetId: number, scope: RepositoryScope): Promise<CommitmentSummary>;
  getSummaryByLine(budgetLineId: number, scope: RepositoryScope): Promise<CommitmentSummary>;
  saveEvent(event: CommitmentLifecycleEvent): Promise<void>;
  getEvents(commitmentId: string): Promise<CommitmentLifecycleEvent[]>;
}

export interface CommitmentEngineDependencies {
  commitmentRepo: IBudgetCommitmentRepository;
  logger: ILogger;
  config: IConfigService;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class BudgetCommitmentEngine {
  private repo: IBudgetCommitmentRepository;
  private logger: ILogger;

  constructor(deps: CommitmentEngineDependencies) {
    this.repo = deps.commitmentRepo;
    this.logger = deps.logger.child({ service: 'BudgetCommitmentEngine' });
  }

  // Valid transitions
  private static readonly TRANSITIONS: Record<CommitmentStatus, CommitmentStatus[]> = {
    pre_committed: ['committed', 'cancelled'],
    committed: ['obligated', 'cancelled', 'expired'],
    obligated: ['partially_paid', 'fully_paid', 'cancelled'],
    partially_paid: ['fully_paid', 'cancelled'],
    fully_paid: [],
    cancelled: [],
    expired: [],
  };

  /**
   * Create a new budget commitment (when PO is issued).
   */
  async createCommitment(
    input: {
      budgetId: number;
      budgetLineId: number;
      sourceType: BudgetCommitment['sourceType'];
      sourceDocumentId: number;
      sourceDocumentNumber: string;
      amount: number;
      currency: string;
      description: string;
      vendorId?: number;
      vendorName?: string;
      projectId?: number;
      grantId?: number;
      activityId?: number;
      expiryDate?: string;
    },
    userId: number,
    scope: RepositoryScope,
  ): Promise<BudgetCommitment> {
    const commitment: BudgetCommitment = {
      commitmentId: uuidv4(),
      budgetId: input.budgetId,
      budgetLineId: input.budgetLineId,
      organizationId: scope.organizationId,
      operatingUnitId: scope.operatingUnitId,
      sourceType: input.sourceType,
      sourceDocumentId: input.sourceDocumentId,
      sourceDocumentNumber: input.sourceDocumentNumber,
      committedAmount: input.amount,
      obligatedAmount: 0,
      paidAmount: 0,
      remainingAmount: input.amount,
      currency: input.currency,
      status: input.sourceType === 'purchase_request' ? 'pre_committed' : 'committed',
      committedAt: new Date().toISOString(),
      description: input.description,
      vendorId: input.vendorId,
      vendorName: input.vendorName,
      projectId: input.projectId,
      grantId: input.grantId,
      activityId: input.activityId,
      expiryDate: input.expiryDate,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.repo.save(commitment);

    await this.repo.saveEvent({
      eventId: uuidv4(),
      commitmentId: commitment.commitmentId,
      fromStatus: 'pre_committed',
      toStatus: commitment.status,
      amount: input.amount,
      performedBy: userId,
      performedAt: new Date().toISOString(),
    });

    this.logger.info('Commitment created', {
      commitmentId: commitment.commitmentId,
      budgetLineId: input.budgetLineId,
      amount: input.amount,
      sourceType: input.sourceType,
    });

    return commitment;
  }

  /**
   * Transition commitment to obligated (invoice received).
   */
  async obligate(
    commitmentId: string,
    invoiceAmount: number,
    invoiceId: number,
    userId: number,
    scope: RepositoryScope,
  ): Promise<BudgetCommitment> {
    return this.transition(commitmentId, 'obligated', {
      obligatedAmount: invoiceAmount,
      obligatedAt: new Date().toISOString(),
      remainingAmount: invoiceAmount, // Reset remaining to invoice amount
    }, userId, scope, `Invoice #${invoiceId} received`);
  }

  /**
   * Record payment against commitment.
   */
  async recordPayment(
    commitmentId: string,
    paymentAmount: number,
    paymentId: number,
    userId: number,
    scope: RepositoryScope,
  ): Promise<BudgetCommitment> {
    const commitment = await this.repo.getById(commitmentId, scope);
    if (!commitment) throw new Error(`Commitment ${commitmentId} not found`);

    const newPaidAmount = commitment.paidAmount + paymentAmount;
    const newRemaining = commitment.obligatedAmount - newPaidAmount;
    const isFullyPaid = newRemaining <= 0.01;

    return this.transition(commitmentId, isFullyPaid ? 'fully_paid' : 'partially_paid', {
      paidAmount: newPaidAmount,
      paidAt: isFullyPaid ? new Date().toISOString() : undefined,
      remainingAmount: Math.max(0, newRemaining),
    }, userId, scope, `Payment #${paymentId}: ${paymentAmount}`);
  }

  /**
   * Cancel a commitment.
   */
  async cancel(
    commitmentId: string,
    reason: string,
    userId: number,
    scope: RepositoryScope,
  ): Promise<BudgetCommitment> {
    return this.transition(commitmentId, 'cancelled', {
      cancelledAt: new Date().toISOString(),
      remainingAmount: 0,
    }, userId, scope, reason);
  }

  /**
   * Get commitment summary for a budget or budget line.
   */
  async getSummary(
    budgetId: number,
    budgetLineId: number | undefined,
    scope: RepositoryScope,
  ): Promise<CommitmentSummary> {
    if (budgetLineId) {
      return this.repo.getSummaryByLine(budgetLineId, scope);
    }
    return this.repo.getSummary(budgetId, scope);
  }

  /**
   * Get commitment lifecycle history.
   */
  async getLifecycle(commitmentId: string): Promise<CommitmentLifecycleEvent[]> {
    return this.repo.getEvents(commitmentId);
  }

  // ── PRIVATE ──

  private async transition(
    commitmentId: string,
    toStatus: CommitmentStatus,
    updates: Partial<BudgetCommitment>,
    userId: number,
    scope: RepositoryScope,
    reason?: string,
  ): Promise<BudgetCommitment> {
    const commitment = await this.repo.getById(commitmentId, scope);
    if (!commitment) throw new Error(`Commitment ${commitmentId} not found`);

    const allowed = BudgetCommitmentEngine.TRANSITIONS[commitment.status];
    if (!allowed?.includes(toStatus)) {
      throw new Error(`Invalid transition: ${commitment.status} → ${toStatus}`);
    }

    await this.repo.update(commitmentId, {
      ...updates,
      status: toStatus,
      updatedAt: new Date().toISOString(),
    });

    await this.repo.saveEvent({
      eventId: uuidv4(),
      commitmentId,
      fromStatus: commitment.status,
      toStatus,
      amount: updates.paidAmount || updates.obligatedAmount || commitment.committedAmount,
      performedBy: userId,
      performedAt: new Date().toISOString(),
      reason,
    });

    this.logger.info('Commitment transitioned', {
      commitmentId,
      from: commitment.status,
      to: toStatus,
      reason,
    });

    return { ...commitment, ...updates, status: toStatus };
  }
}
