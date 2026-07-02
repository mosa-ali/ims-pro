/**
 * BudgetAvailabilityEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Real-Time Budget Availability
 *
 * PHASE 5: Budget Intelligence
 *
 * Calculates available budget considering ALL encumbrances:
 *
 *   Available = Approved − Actual − Committed − Obligated
 *
 * Provides:
 *  - Real-time availability check (before PO, before payment)
 *  - Budget line availability with drill-down
 *  - Grant-level availability (donor compliance)
 *  - Project-level availability (cross-budget)
 *  - Threshold alerts (configurable warning levels)
 *  - Availability reservation (temporary hold during approval)
 *
 * Called by:
 *  - GLPostingPipeline (before posting expenses)
 *  - ProcurementModule (before issuing PO)
 *  - PaymentsRouter (before releasing payment)
 *  - FinancialRulesEngine (as a validation check)
 */

import type { ILogger, IConfigService, RepositoryScope } from '../../engines/finance/PlatformInterfaces';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface BudgetAvailability {
  budgetId: number;
  budgetLineId?: number;
  asOfDate: string;
  currency: string;

  // Components
  approved: number;
  actual: number;
  committed: number;
  obligated: number;
  reserved: number;      // Temporary holds during approval
  available: number;     // approved - actual - committed - obligated - reserved

  // Percentages
  utilizationPercent: number;  // (actual / approved) × 100
  encumbrancePercent: number;  // ((actual + committed + obligated) / approved) × 100
  availablePercent: number;    // (available / approved) × 100

  // Threshold status
  thresholdStatus: 'green' | 'yellow' | 'red';
  thresholdMessage?: string;
}

export interface AvailabilityCheckResult {
  budgetLineId: number;
  requestedAmount: number;
  available: number;
  sufficient: boolean;
  shortfall: number;
  message: string;
}

export interface BudgetReservation {
  reservationId: string;
  budgetId: number;
  budgetLineId: number;
  amount: number;
  reason: string;
  reservedBy: number;
  reservedAt: string;
  expiresAt: string;     // Auto-release if not confirmed
  status: 'active' | 'confirmed' | 'released' | 'expired';
}

export interface GrantAvailability {
  grantId: number;
  grantName: string;
  donorName: string;
  totalGrantAmount: number;
  totalApproved: number;
  totalActual: number;
  totalCommitted: number;
  totalAvailable: number;
  utilizationPercent: number;
  budgetCount: number;
}

// ────────────────────────────────────────────────────────────────────────────
// REPOSITORY
// ────────────────────────────────────────────────────────────────────────────

export interface IBudgetAvailabilityRepository {
  getBudgetTotals(budgetId: number, scope: RepositoryScope): Promise<{
    approved: number;
    actual: number;
    currency: string;
  } | null>;

  getLineTotals(budgetLineId: number, scope: RepositoryScope): Promise<{
    approved: number;
    actual: number;
  } | null>;

  getCommitmentTotals(budgetId: number, budgetLineId: number | undefined, scope: RepositoryScope): Promise<{
    committed: number;
    obligated: number;
  }>;

  getReservationTotal(budgetId: number, budgetLineId: number | undefined, scope: RepositoryScope): Promise<number>;

  getGrantAvailability(grantId: number, scope: RepositoryScope): Promise<GrantAvailability | null>;

  // Reservation management
  saveReservation(reservation: BudgetReservation): Promise<void>;
  getReservation(reservationId: string): Promise<BudgetReservation | null>;
  updateReservation(reservationId: string, fields: Partial<BudgetReservation>): Promise<void>;
  expireOldReservations(): Promise<number>;
}

export interface AvailabilityEngineDependencies {
  availabilityRepo: IBudgetAvailabilityRepository;
  logger: ILogger;
  config: IConfigService;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class BudgetAvailabilityEngine {
  private repo: IBudgetAvailabilityRepository;
  private logger: ILogger;
  private config: IConfigService;

  constructor(deps: AvailabilityEngineDependencies) {
    this.repo = deps.availabilityRepo;
    this.logger = deps.logger.child({ service: 'BudgetAvailabilityEngine' });
    this.config = deps.config;
  }

  /**
   * Get real-time budget availability.
   */
  async getAvailability(
    budgetId: number,
    budgetLineId: number | undefined,
    scope: RepositoryScope,
  ): Promise<BudgetAvailability> {
    const totals = budgetLineId
      ? await this.repo.getLineTotals(budgetLineId, scope)
      : await this.repo.getBudgetTotals(budgetId, scope);

    if (!totals) throw new Error(`Budget ${budgetId} not found`);

    const commitments = await this.repo.getCommitmentTotals(budgetId, budgetLineId, scope);
    const reserved = await this.repo.getReservationTotal(budgetId, budgetLineId, scope);

    const approved = totals.approved;
    const actual = totals.actual;
    const committed = commitments.committed;
    const obligated = commitments.obligated;
    const available = approved - actual - committed - obligated - reserved;

    const utilizationPercent = approved > 0 ? Math.round((actual / approved) * 100) : 0;
    const encumbrancePercent = approved > 0
      ? Math.round(((actual + committed + obligated) / approved) * 100)
      : 0;
    const availablePercent = approved > 0 ? Math.round((available / approved) * 100) : 0;

    // Threshold check
    const yellowThreshold = this.config.getNumber('budget.threshold.yellow', 20);
    const redThreshold = this.config.getNumber('budget.threshold.red', 5);

    let thresholdStatus: BudgetAvailability['thresholdStatus'] = 'green';
    let thresholdMessage: string | undefined;

    if (availablePercent <= redThreshold) {
      thresholdStatus = 'red';
      thresholdMessage = `Only ${availablePercent}% budget remaining`;
    } else if (availablePercent <= yellowThreshold) {
      thresholdStatus = 'yellow';
      thresholdMessage = `${availablePercent}% budget remaining — approaching limit`;
    }

    return {
      budgetId,
      budgetLineId,
      asOfDate: new Date().toISOString(),
      currency: (totals as any).currency || 'USD',
      approved,
      actual,
      committed,
      obligated,
      reserved,
      available: Math.max(0, available),
      utilizationPercent,
      encumbrancePercent,
      availablePercent,
      thresholdStatus,
      thresholdMessage,
    };
  }

  /**
   * Check if a specific amount can be committed/spent.
   * Called before PO issuance or payment.
   */
  async checkAvailability(
    budgetId: number,
    budgetLineId: number,
    requestedAmount: number,
    scope: RepositoryScope,
  ): Promise<AvailabilityCheckResult> {
    const availability = await this.getAvailability(budgetId, budgetLineId, scope);

    const sufficient = availability.available >= requestedAmount;
    const shortfall = sufficient ? 0 : requestedAmount - availability.available;

    const result: AvailabilityCheckResult = {
      budgetLineId,
      requestedAmount,
      available: availability.available,
      sufficient,
      shortfall,
      message: sufficient
        ? `Budget available: ${availability.available.toFixed(2)} (requested: ${requestedAmount.toFixed(2)})`
        : `Insufficient budget: available ${availability.available.toFixed(2)}, requested ${requestedAmount.toFixed(2)}, shortfall ${shortfall.toFixed(2)}`,
    };

    if (!sufficient) {
      this.logger.warn('Budget availability check failed', {
        budgetId, budgetLineId, requestedAmount,
        available: availability.available, shortfall,
      });
    }

    return result;
  }

  /**
   * Reserve budget temporarily (during approval process).
   * Auto-expires after configurable timeout (default 24 hours).
   */
  async reserve(
    budgetId: number,
    budgetLineId: number,
    amount: number,
    reason: string,
    userId: number,
    scope: RepositoryScope,
  ): Promise<BudgetReservation> {
    // First check availability
    const check = await this.checkAvailability(budgetId, budgetLineId, amount, scope);
    if (!check.sufficient) {
      throw new Error(check.message);
    }

    const expiryHours = this.config.getNumber('budget.reservation.expiryHours', 24);
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();

    const reservation: BudgetReservation = {
      reservationId: require('uuid').v4(),
      budgetId,
      budgetLineId,
      amount,
      reason,
      reservedBy: userId,
      reservedAt: new Date().toISOString(),
      expiresAt,
      status: 'active',
    };

    await this.repo.saveReservation(reservation);

    this.logger.info('Budget reserved', {
      reservationId: reservation.reservationId,
      budgetLineId,
      amount,
      expiresAt,
    });

    return reservation;
  }

  /**
   * Confirm a reservation (when approval is granted).
   */
  async confirmReservation(reservationId: string): Promise<void> {
    await this.repo.updateReservation(reservationId, { status: 'confirmed' });
    this.logger.info('Reservation confirmed', { reservationId });
  }

  /**
   * Release a reservation (when approval is rejected or cancelled).
   */
  async releaseReservation(reservationId: string): Promise<void> {
    await this.repo.updateReservation(reservationId, { status: 'released' });
    this.logger.info('Reservation released', { reservationId });
  }

  /**
   * Get grant-level availability (cross-budget, donor compliance).
   */
  async getGrantAvailability(
    grantId: number,
    scope: RepositoryScope,
  ): Promise<GrantAvailability> {
    const availability = await this.repo.getGrantAvailability(grantId, scope);
    if (!availability) throw new Error(`Grant ${grantId} not found`);
    return availability;
  }

  /**
   * Expire old reservations (called by scheduler).
   */
  async cleanupExpiredReservations(): Promise<number> {
    const expired = await this.repo.expireOldReservations();
    if (expired > 0) {
      this.logger.info('Expired reservations cleaned up', { count: expired });
    }
    return expired;
  }
}
