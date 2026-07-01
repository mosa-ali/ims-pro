import type { FinanceSynchronizationContext } from "../FinanceSynchronizationContext";
import { FinanceEventBus } from "../FinanceEventBus";
import { FinanceTransactionManager } from "../FinanceTransactionManager";
import { FinanceSynchronizationLogger } from "../FinanceSynchronizationLogger";
import type {
    FinanceEvent,
    PayrollProcessedEvent,
    BenefitDeductionEvent,
    TaxWithholdingEvent,
} from "@shared/events/FinanceEventTypes";

import { eq, and, sql } from "drizzle-orm";
import { DB } from "../../../db/_scope";

export class HRSynchronizer {
  private eventBus: FinanceEventBus;
  private transactionManager: FinanceTransactionManager;
  private logger: FinanceSynchronizationLogger;

  constructor(
    eventBus: FinanceEventBus,
    transactionManager: FinanceTransactionManager,
    logger: FinanceSynchronizationLogger
  ) {
    this.eventBus = eventBus;
    this.transactionManager = transactionManager;
    this.logger = logger;
  }

  public initialize() {
  this.eventBus.on(
    "PayrollProcessed",
    async (event, context, db) => {
      await this.handlePayrollProcessed(event, context, db);
    }
  );

  this.eventBus.on(
    "BenefitDeduction",
    async (event, context, db) => {
      await this.handleBenefitDeduction(event, context, db);
    }
  );

  this.eventBus.on(
    "TaxWithholding",
    async (event, context, db) => {
      await this.handleTaxWithholding(event, context, db);
    }
  );

  this.logger.log(
    "HRSynchronizer initialized and subscribed to PayrollProcessedEvent, BenefitDeductionEvent, and TaxWithholdingEvent."
  );
}

  private async handlePayrollProcessed(
      event: FinanceEvent,
      context: FinanceSynchronizationContext,
      db?: DB
    ) {
    await this.transactionManager.runInTransaction(async (tx) => {
      this.logger.log(`Processing PayrollProcessedEvent for payroll run: ${event.payload.payrollRunId}`);

      // Logic to record payroll expenses and liabilities in the GL
      // Example: Insert journal entries for salaries, taxes, benefits
      // await tx.insert(db.schema.journalEntries).values({
      //   organizationId: event.organizationId,
      //   operatingUnitId: event.operatingUnitId,
      //   entryDate: event.timestamp.toISOString(),
      //   description: `Payroll for ${event.payload.periodStart} to ${event.payload.periodEnd}`,
      //   // ... other journal entry details
      // });

      this.logger.log(`Successfully processed PayrollProcessedEvent for payroll run: ${event.payload.payrollRunId}`);
    }, context);
  }

  private async handleBenefitDeduction(
    event: FinanceEvent,
    context: FinanceSynchronizationContext,
    db?: DB
) {
    const typedEvent = event as BenefitDeductionEvent;

    await this.transactionManager.runInTransaction(async (tx) => {

        this.logger.log(
            `Processing BenefitDeductionEvent for employee: ${typedEvent.payload.employeeId}`
        );

      // Logic to record benefit deductions as liabilities or expenses
      // Example: Update GL accounts for benefits payable
      // await tx.update(db.schema.glAccounts)
      //   .set({ balance: sql`${db.schema.glAccounts.balance} + ${event.payload.amount}` })
      //   .where(eq(db.schema.glAccounts.id, event.payload.glAccountId));

      this.logger.log(`Successfully processed BenefitDeductionEvent for employee: ${event.payload.employeeId}`);
    }, context);
  }

  private async handleTaxWithholding(
    event: FinanceEvent,
    context: FinanceSynchronizationContext,
    db?: DB
) {
    const typedEvent = event as TaxWithholdingEvent;

    await this.transactionManager.runInTransaction(async (tx) => {

        this.logger.log(
            `Processing TaxWithholdingEvent for employee: ${typedEvent.payload.employeeId}`
        );

      // Logic to record tax withholdings as liabilities
      // Example: Update GL accounts for taxes payable
      // await tx.update(db.schema.glAccounts)
      //   .set({ balance: sql`${db.schema.glAccounts.balance} + ${event.payload.amount}` })
      //   .where(eq(db.schema.glAccounts.id, event.payload.glAccountId));

      this.logger.log(`Successfully processed TaxWithholdingEvent for employee: ${event.payload.employeeId}`);
    }, context);
  }
}
