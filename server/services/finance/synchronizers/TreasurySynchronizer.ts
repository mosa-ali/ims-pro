import type { FinanceSynchronizationContext } from "../FinanceSynchronizationContext";
import { FinanceEventBus } from "../FinanceEventBus";
import { FinanceTransactionManager } from "../FinanceTransactionManager";
import { FinanceSynchronizationLogger } from "../FinanceSynchronizationLogger";
import { CashReceivedEvent, BankReconciliationEvent, FundTransferEvent } from "@shared/events/FinanceEventTypes";

import { eq, and, sql } from "drizzle-orm";
import { DB } from "../../../db/_scope";

export class TreasurySynchronizer {
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
      "CashReceived",
      this.handleCashReceived.bind(this)
    );
    this.eventBus.on(
      "BankReconciliation",
      this.handleBankReconciliation.bind(this)
    );
    this.eventBus.on(
      "FundTransfer",
      this.handleFundTransfer.bind(this)
    );
    this.logger.log("TreasurySynchronizer initialized and subscribed to CashReceivedEvent, BankReconciliationEvent, and FundTransferEvent.");
  }

  private async handleCashReceived(event: CashReceivedEvent, context: FinanceSynchronizationContext, db: DB) {
    await this.transactionManager.runInTransaction(async (tx) => {
      this.logger.log(`Processing CashReceivedEvent for transaction: ${event.payload.transactionId}`);

      // Logic to record cash receipt in a cash/bank ledger or update relevant financial records
      // Example: Insert into a 'cashReceipts' table or update 'bankAccounts' balance
      // await tx.insert(db.schema.cashReceipts).values({
      //   organizationId: event.organizationId,
      //   operatingUnitId: event.operatingUnitId,
      //   transactionId: event.payload.transactionId,
      //   amount: event.payload.amount,
      //   currency: event.payload.currency,
      //   receivedDate: event.payload.receivedDate,
      //   // ... other cash receipt details
      // });

      this.logger.log(`Successfully processed CashReceivedEvent for transaction: ${event.payload.transactionId}`);
    }, context);
  }

  private async handleBankReconciliation(event: BankReconciliationEvent, context: FinanceSynchronizationContext, db: DB) {
    await this.transactionManager.runInTransaction(async (tx) => {
      this.logger.log(`Processing BankReconciliationEvent for account: ${event.payload.bankAccountId}`);

      // Logic to record bank reconciliation status and adjustments
      // Example: Update 'bankAccounts' reconciliation status and record discrepancies
      // await tx.update(db.schema.bankAccounts)
      //   .set({
      //     lastReconciledDate: event.payload.reconciliationDate,
      //     reconciliationStatus: event.payload.status,
      //   })
      //   .where(eq(db.schema.bankAccounts.id, event.payload.bankAccountId));

      this.logger.log(`Successfully processed BankReconciliationEvent for account: ${event.payload.bankAccountId}`);
    }, context);
  }

  private async handleFundTransfer(event: FundTransferEvent, context: FinanceSynchronizationContext, db: DB) {
    await this.transactionManager.runInTransaction(async (tx) => {
      this.logger.log(`Processing FundTransferEvent from account: ${event.payload.fromAccountId} to ${event.payload.toAccountId}`);

      // Logic to record fund transfer between bank accounts or internal accounts
      // Example: Update balances in 'bankAccounts' or 'internalAccounts' tables
      // await tx.update(db.schema.bankAccounts)
      //   .set({ balance: sql`${db.schema.bankAccounts.balance} - ${event.payload.amount}` })
      //   .where(eq(db.schema.bankAccounts.id, event.payload.fromAccountId));
      // await tx.update(db.schema.bankAccounts)
      //   .set({ balance: sql`${db.schema.bankAccounts.balance} + ${event.payload.amount}` })
      //   .where(eq(db.schema.bankAccounts.id, event.payload.toAccountId));

      this.logger.log(`Successfully processed FundTransferEvent from account: ${event.payload.fromAccountId} to ${event.payload.toAccountId}`);
    }, context);
  }
}
