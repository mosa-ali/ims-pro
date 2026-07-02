/**
 * AccrualEngine.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Automatic Accrual Engine
 *
 * PHASE 4: GL Modernization
 *
 * Manages accrual accounting entries:
 *   - Creates accrual entries at period end (recognize revenue/expense)
 *   - Auto-reverses accruals at start of next period
 *   - Tracks accrual schedules (recurring accruals)
 *   - Ensures accruals don't duplicate (idempotent by period)
 *
 * Common humanitarian NGO accruals:
 *   - Salary accrual (December payroll paid in January)
 *   - Rent accrual (quarterly rent, monthly recognition)
 *   - Grant revenue recognition (earned but not yet received)
 *   - Leave provision (earned leave not yet taken)
 *
 * All entries generated via journalEntriesRouter.create
 */

import { v4 as uuidv4 } from 'uuid';
import type { ILogger, IConfigService, RepositoryScope } from '../PHASE3_HARDENED/PlatformInterfaces';
import type { JournalEntryInput, JournalLineInput } from './GeneralLedgerEngine';

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

export type AccrualFrequency = 'monthly' | 'quarterly' | 'annually';
export type AccrualStatus = 'active' | 'paused' | 'completed' | 'cancelled';

export interface AccrualSchedule {
  scheduleId: string;
  organizationId: number;
  operatingUnitId: number;
  name: string;
  description: string;
  descriptionAr?: string;

  // Accrual accounts
  accrualAccountId: number;   // e.g., 2100 Accrued Expenses
  expenseAccountId: number;   // e.g., 6100 Salary Expense
  amount: number;
  currency: string;

  // Schedule
  frequency: AccrualFrequency;
  startDate: string;
  endDate?: string;
  autoReverse: boolean;       // Auto-reverse at start of next period
  reversalDay: number;        // Day of month for reversal (typically 1)

  // Dimensions
  projectId?: number;
  grantId?: number;
  activityId?: number;
  costCenterId?: number;

  // Tracking
  status: AccrualStatus;
  lastAccrualDate?: string;
  lastReversalDate?: string;
  totalAccrued: number;
  periodsProcessed: number;
  createdBy: number;
  createdAt: string;
}

export interface AccrualEntry {
  type: 'accrual' | 'reversal';
  scheduleId: string;
  periodDate: string;
  journalEntryInput: JournalEntryInput;
}

// ────────────────────────────────────────────────────────────────────────────
// REPOSITORY
// ────────────────────────────────────────────────────────────────────────────

export interface IAccrualRepository {
  saveSchedule(schedule: AccrualSchedule): Promise<void>;
  getSchedule(scheduleId: string, scope: RepositoryScope): Promise<AccrualSchedule | null>;
  listSchedules(scope: RepositoryScope, status?: AccrualStatus): Promise<AccrualSchedule[]>;
  updateSchedule(scheduleId: string, fields: Partial<AccrualSchedule>): Promise<void>;
  listDueAccruals(periodEndDate: string): Promise<AccrualSchedule[]>;
  listDueReversals(periodStartDate: string): Promise<AccrualSchedule[]>;
  hasAccrualForPeriod(scheduleId: string, periodDate: string): Promise<boolean>;
}

export interface AccrualEngineDependencies {
  accrualRepo: IAccrualRepository;
  logger: ILogger;
  config: IConfigService;
}

// ────────────────────────────────────────────────────────────────────────────
// ENGINE
// ────────────────────────────────────────────────────────────────────────────

export class AccrualEngine {
  private repo: IAccrualRepository;
  private logger: ILogger;

  constructor(deps: AccrualEngineDependencies) {
    this.repo = deps.accrualRepo;
    this.logger = deps.logger.child({ service: 'AccrualEngine' });
  }

  // ── SCHEDULE MANAGEMENT ──

  async createSchedule(
    input: Omit<AccrualSchedule, 'scheduleId' | 'createdAt' | 'totalAccrued' | 'periodsProcessed'>,
  ): Promise<AccrualSchedule> {
    if (input.amount <= 0) throw new Error('Accrual amount must be positive');
    if (input.accrualAccountId === input.expenseAccountId) {
      throw new Error('Accrual and expense accounts must be different');
    }

    const schedule: AccrualSchedule = {
      ...input,
      scheduleId: uuidv4(),
      createdAt: new Date().toISOString(),
      totalAccrued: 0,
      periodsProcessed: 0,
    };

    await this.repo.saveSchedule(schedule);
    this.logger.info('Accrual schedule created', {
      scheduleId: schedule.scheduleId, name: schedule.name, amount: schedule.amount,
    });
    return schedule;
  }

  // ── GENERATE ACCRUALS ──

  /**
   * Generate accrual entries for period end.
   * Called at month/quarter/year end.
   * Returns entries ready for journalEntriesRouter.create
   */
  async generateAccruals(periodEndDate: string): Promise<AccrualEntry[]> {
    const dueSchedules = await this.repo.listDueAccruals(periodEndDate);
    const entries: AccrualEntry[] = [];

    for (const schedule of dueSchedules) {
      if (schedule.status !== 'active') continue;
      if (schedule.endDate && periodEndDate > schedule.endDate) continue;

      // Check idempotency — don't accrue twice for same period
      const alreadyAccrued = await this.repo.hasAccrualForPeriod(schedule.scheduleId, periodEndDate);
      if (alreadyAccrued) {
        this.logger.info('Accrual already exists for period, skipping', {
          scheduleId: schedule.scheduleId, periodEndDate,
        });
        continue;
      }

      // Build accrual journal entry
      // DR Expense Account, CR Accrual Account
      const lines: JournalLineInput[] = [
        {
          lineNumber: 1,
          glAccountId: schedule.expenseAccountId,
          description: `Accrual: ${schedule.name}`,
          debitAmount: schedule.amount.toFixed(2),
          creditAmount: '0.00',
          dimensions: {
            projectId: schedule.projectId,
            grantId: schedule.grantId,
            activityId: schedule.activityId,
            costCenterId: schedule.costCenterId,
          },
        },
        {
          lineNumber: 2,
          glAccountId: schedule.accrualAccountId,
          description: `Accrual: ${schedule.name}`,
          debitAmount: '0.00',
          creditAmount: schedule.amount.toFixed(2),
        },
      ];

      const journalEntryInput: JournalEntryInput = {
        entryDate: periodEndDate,
        entryType: 'adjusting',
        sourceModule: 'manual',
        description: `Accrual: ${schedule.name} - ${periodEndDate}`,
        descriptionAr: schedule.descriptionAr
          ? `استحقاق: ${schedule.descriptionAr} - ${periodEndDate}`
          : undefined,
        projectId: schedule.projectId,
        grantId: schedule.grantId,
        lines,
      };

      entries.push({
        type: 'accrual',
        scheduleId: schedule.scheduleId,
        periodDate: periodEndDate,
        journalEntryInput,
      });

      // Update tracking
      await this.repo.updateSchedule(schedule.scheduleId, {
        lastAccrualDate: periodEndDate,
        totalAccrued: schedule.totalAccrued + schedule.amount,
        periodsProcessed: schedule.periodsProcessed + 1,
      });

      this.logger.info('Accrual generated', {
        scheduleId: schedule.scheduleId, amount: schedule.amount, periodEndDate,
      });
    }

    return entries;
  }

  /**
   * Generate reversal entries for period start.
   * Reverses accruals from previous period.
   * Returns entries ready for journalEntriesRouter.create
   */
  async generateReversals(periodStartDate: string): Promise<AccrualEntry[]> {
    const dueReversals = await this.repo.listDueReversals(periodStartDate);
    const entries: AccrualEntry[] = [];

    for (const schedule of dueReversals) {
      if (!schedule.autoReverse) continue;
      if (!schedule.lastAccrualDate) continue;

      // Build reversal (swap debit/credit from accrual)
      const lines: JournalLineInput[] = [
        {
          lineNumber: 1,
          glAccountId: schedule.accrualAccountId,
          description: `Reversal: ${schedule.name}`,
          debitAmount: schedule.amount.toFixed(2),
          creditAmount: '0.00',
        },
        {
          lineNumber: 2,
          glAccountId: schedule.expenseAccountId,
          description: `Reversal: ${schedule.name}`,
          debitAmount: '0.00',
          creditAmount: schedule.amount.toFixed(2),
          dimensions: {
            projectId: schedule.projectId,
            grantId: schedule.grantId,
            activityId: schedule.activityId,
            costCenterId: schedule.costCenterId,
          },
        },
      ];

      entries.push({
        type: 'reversal',
        scheduleId: schedule.scheduleId,
        periodDate: periodStartDate,
        journalEntryInput: {
          entryDate: periodStartDate,
          entryType: 'reversing',
          sourceModule: 'manual',
          description: `Accrual reversal: ${schedule.name} - ${periodStartDate}`,
          projectId: schedule.projectId,
          grantId: schedule.grantId,
          lines,
        },
      });

      await this.repo.updateSchedule(schedule.scheduleId, {
        lastReversalDate: periodStartDate,
      });

      this.logger.info('Accrual reversal generated', {
        scheduleId: schedule.scheduleId, amount: schedule.amount, periodStartDate,
      });
    }

    return entries;
  }
}
