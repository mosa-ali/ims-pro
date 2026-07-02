/**
 * FinancialProjectionEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Builds and maintains read models from event streams
 *
 * Per Mosa's architectural recommendation:
 *   EventBus → ProjectionEngine → Read Models → Dashboards/Reports/AI/Search
 *
 * Instead of replaying the entire event history for every query,
 * projections maintain materialised views that are updated incrementally
 * as new events arrive.
 *
 * Projections:
 *   - BudgetProjection    (budget utilisation, remaining balance)
 *   - CashProjection      (cash position by account/currency)
 *   - GrantProjection     (grant allocation, burn rate)
 *   - DonorProjection     (donor compliance status)
 *   - VendorProjection    (vendor payment history, outstanding)
 *   - ExecutiveDashboard  (KPIs, aggregates)
 *
 * Each projection subscribes to relevant events and updates
 * its read model in-place. Queries hit the read model directly —
 * no replay needed.
 */

import type { ILogger } from './PlatformInterfaces';
import type { EventBus } from './EventBus';
import { FinancialEventType } from './FinancialEventTypes';

// ────────────────────────────────────────────────────────────────────────────
// PROJECTION INTERFACE
// ────────────────────────────────────────────────────────────────────────────

/**
 * A projection subscribes to events and builds a read model.
 * Each projection is responsible for one bounded context.
 */
export interface IProjection<TReadModel = Record<string, unknown>> {
  /** Unique name for this projection (e.g. "budget_utilisation") */
  readonly name: string;
  /** Event types this projection subscribes to */
  readonly subscribedEvents: string[];
  /** Handle a single event and update the read model */
  apply(eventType: string, payload: Record<string, unknown>, metadata: Record<string, unknown>): void;
  /** Get the current read model */
  getState(): TReadModel;
  /** Reset read model (for rebuild from scratch) */
  reset(): void;
}

// ────────────────────────────────────────────────────────────────────────────
// PROJECTION ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class FinancialProjectionEngine {
  private projections = new Map<string, IProjection>();
  private logger: ILogger;
  private eventBus: EventBus;
  private started = false;

  constructor(eventBus: EventBus, logger: ILogger) {
    this.eventBus = eventBus;
    this.logger = logger.child({ service: 'ProjectionEngine' });
  }

  /**
   * Register a projection. Must be called before start().
   */
  register(projection: IProjection): void {
    if (this.started) {
      throw new Error('Cannot register projections after engine has started');
    }
    this.projections.set(projection.name, projection);
    this.logger.info('Projection registered', {
      name: projection.name,
      events: projection.subscribedEvents,
    });
  }

  /**
   * Start the engine: subscribe all projections to the event bus.
   */
  async start(): Promise<void> {
    for (const [name, projection] of this.projections) {
      const patterns = projection.subscribedEvents;

      await this.eventBus.subscribe(
        patterns,
        async (eventType, payload, metadata) => {
          try {
            projection.apply(eventType, payload, metadata);
          } catch (err) {
            this.logger.error('Projection apply error', {
              projection: name,
              eventType,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        },
      );

      this.logger.info('Projection subscribed', { name, patterns });
    }

    this.started = true;
    this.logger.info('ProjectionEngine started', {
      projections: [...this.projections.keys()],
    });
  }

  /**
   * Get a projection's current read model.
   */
  getProjection<T = Record<string, unknown>>(name: string): T | null {
    const projection = this.projections.get(name);
    if (!projection) return null;
    return projection.getState() as T;
  }

  /**
   * List all registered projections.
   */
  listProjections(): Array<{ name: string; subscribedEvents: string[] }> {
    return [...this.projections.values()].map(p => ({
      name: p.name,
      subscribedEvents: p.subscribedEvents,
    }));
  }

  /**
   * Rebuild a projection from scratch (replay all events).
   */
  async rebuild(projectionName: string): Promise<{ eventsProcessed: number; duration: string }> {
    const projection = this.projections.get(projectionName);
    if (!projection) throw new Error(`Projection ${projectionName} not found`);

    projection.reset();
    const t0 = Date.now();
    let count = 0;

    const result = await this.eventBus.replay(
      { eventTypePattern: '*' },
      async (eventType, payload, metadata) => {
        if (projection.subscribedEvents.some(p => this.matchPattern(eventType, p))) {
          projection.apply(eventType, payload, metadata);
          count++;
        }
      },
    );

    const duration = `${Date.now() - t0}ms`;
    this.logger.info('Projection rebuilt', {
      projection: projectionName,
      eventsProcessed: count,
      duration,
    });
    return { eventsProcessed: count, duration };
  }

  private matchPattern(eventType: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern === eventType) return true;
    if (pattern.endsWith('*')) return eventType.startsWith(pattern.slice(0, -1));
    return false;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// BUILT-IN PROJECTIONS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Budget Utilisation Projection
 * Tracks budget allocation vs actuals per budget ID.
 */
export interface BudgetReadModel {
  budgets: Record<number, {
    budgetId: number;
    budgetName: string;
    totalAllocated: number;
    totalActual: number;
    remaining: number;
    utilizationPercent: number;
    exceeded: boolean;
    lastUpdated: string;
  }>;
}

export class BudgetProjection implements IProjection<BudgetReadModel> {
  readonly name = 'budget_utilisation';
  readonly subscribedEvents = [
    FinancialEventType.BUDGET_ALLOCATED,
    FinancialEventType.BUDGET_EXCEEDED,
    FinancialEventType.BUDGET_APPROVED,
    FinancialEventType.BUDGET_CLOSED,
  ];

  private state: BudgetReadModel = { budgets: {} };

  apply(eventType: string, payload: Record<string, unknown>): void {
    const budgetId = payload.budgetId as number;
    if (!budgetId) return;

    if (!this.state.budgets[budgetId]) {
      this.state.budgets[budgetId] = {
        budgetId,
        budgetName: (payload.budgetName as string) || '',
        totalAllocated: 0,
        totalActual: 0,
        remaining: 0,
        utilizationPercent: 0,
        exceeded: false,
        lastUpdated: new Date().toISOString(),
      };
    }

    const b = this.state.budgets[budgetId];

    if (eventType === FinancialEventType.BUDGET_ALLOCATED) {
      b.totalAllocated += (payload.allocationAmount as number) || 0;
      b.remaining = b.totalAllocated - b.totalActual;
      b.utilizationPercent = b.totalAllocated > 0
        ? Math.round((b.totalActual / b.totalAllocated) * 100)
        : 0;
    }

    if (eventType === FinancialEventType.BUDGET_EXCEEDED) {
      b.exceeded = true;
      b.totalActual = (payload.actualAmount as number) || b.totalActual;
      b.remaining = b.totalAllocated - b.totalActual;
      b.utilizationPercent = b.totalAllocated > 0
        ? Math.round((b.totalActual / b.totalAllocated) * 100)
        : 0;
    }

    b.lastUpdated = new Date().toISOString();
  }

  getState(): BudgetReadModel { return this.state; }
  reset(): void { this.state = { budgets: {} }; }
}

/**
 * Cash Position Projection
 * Tracks cash balances by bank account.
 */
export interface CashReadModel {
  accounts: Record<number, {
    bankAccountId: number;
    accountNumber: string;
    currentBalance: number;
    currency: string;
    belowThreshold: boolean;
    lastUpdated: string;
  }>;
  totalBalance: number;
}

export class CashProjection implements IProjection<CashReadModel> {
  readonly name = 'cash_position';
  readonly subscribedEvents = [
    FinancialEventType.CASH_POSITION_UPDATED,
    FinancialEventType.CASH_THRESHOLD_BREACHED,
  ];

  private state: CashReadModel = { accounts: {}, totalBalance: 0 };

  apply(eventType: string, payload: Record<string, unknown>): void {
    const bankAccountId = payload.bankAccountId as number;
    if (!bankAccountId) return;

    if (!this.state.accounts[bankAccountId]) {
      this.state.accounts[bankAccountId] = {
        bankAccountId,
        accountNumber: (payload.accountNumber as string) || '',
        currentBalance: 0,
        currency: (payload.currency as string) || 'USD',
        belowThreshold: false,
        lastUpdated: new Date().toISOString(),
      };
    }

    const a = this.state.accounts[bankAccountId];

    if (eventType === FinancialEventType.CASH_POSITION_UPDATED) {
      a.currentBalance = (payload.currentBalance as number) ?? a.currentBalance;
    }

    if (eventType === FinancialEventType.CASH_THRESHOLD_BREACHED) {
      a.belowThreshold = true;
      a.currentBalance = (payload.currentBalance as number) ?? a.currentBalance;
    }

    a.lastUpdated = new Date().toISOString();

    // Recalculate total
    this.state.totalBalance = Object.values(this.state.accounts)
      .reduce((sum, acc) => sum + acc.currentBalance, 0);
  }

  getState(): CashReadModel { return this.state; }
  reset(): void { this.state = { accounts: {}, totalBalance: 0 }; }
}

/**
 * Executive Dashboard Projection
 * Aggregates high-level KPIs from all financial events.
 */
export interface ExecutiveDashboardReadModel {
  glEntriesPosted: number;
  glEntriesReversed: number;
  totalBudgetAllocated: number;
  budgetsExceeded: number;
  advancesIssued: number;
  advancesLiquidated: number;
  paymentsCompleted: number;
  paymentsFailed: number;
  complianceViolations: number;
  lastUpdated: string;
}

export class ExecutiveDashboardProjection implements IProjection<ExecutiveDashboardReadModel> {
  readonly name = 'executive_dashboard';
  readonly subscribedEvents = ['finance:*'];

  private state: ExecutiveDashboardReadModel = {
    glEntriesPosted: 0,
    glEntriesReversed: 0,
    totalBudgetAllocated: 0,
    budgetsExceeded: 0,
    advancesIssued: 0,
    advancesLiquidated: 0,
    paymentsCompleted: 0,
    paymentsFailed: 0,
    complianceViolations: 0,
    lastUpdated: new Date().toISOString(),
  };

  apply(eventType: string, payload: Record<string, unknown>): void {
    switch (eventType) {
      case FinancialEventType.GL_POSTED:
        this.state.glEntriesPosted++;
        break;
      case FinancialEventType.GL_REVERSED:
        this.state.glEntriesReversed++;
        break;
      case FinancialEventType.BUDGET_ALLOCATED:
        this.state.totalBudgetAllocated += (payload.allocationAmount as number) || 0;
        break;
      case FinancialEventType.BUDGET_EXCEEDED:
        this.state.budgetsExceeded++;
        break;
      case FinancialEventType.ADVANCE_ISSUED:
        this.state.advancesIssued++;
        break;
      case FinancialEventType.ADVANCE_LIQUIDATED:
        this.state.advancesLiquidated++;
        break;
      case FinancialEventType.PAYMENT_COMPLETED:
        this.state.paymentsCompleted++;
        break;
      case FinancialEventType.PAYMENT_FAILED:
        this.state.paymentsFailed++;
        break;
      case FinancialEventType.DONOR_COMPLIANCE_VIOLATION:
        this.state.complianceViolations++;
        break;
    }
    this.state.lastUpdated = new Date().toISOString();
  }

  getState(): ExecutiveDashboardReadModel { return this.state; }
  reset(): void {
    this.state = {
      glEntriesPosted: 0, glEntriesReversed: 0,
      totalBudgetAllocated: 0, budgetsExceeded: 0,
      advancesIssued: 0, advancesLiquidated: 0,
      paymentsCompleted: 0, paymentsFailed: 0,
      complianceViolations: 0, lastUpdated: new Date().toISOString(),
    };
  }
}
