import type { FinanceSynchronizationContext } from "../FinanceSynchronizationContext";
import { FinanceEventBus } from "../FinanceEventBus";
import { FinanceTransactionManager } from "../FinanceTransactionManager";
import { FinanceSynchronizationLogger } from "../FinanceSynchronizationLogger";
import { PurchaseRequestApprovedEvent, FinanceEvent } from "@shared/events/FinanceEventTypes";

import { DB } from "../../../db/_scope";
import * as schema from "drizzle/schema.ts";
import { eq, sql } from "drizzle-orm";

export class BudgetSynchronizer {
  constructor(
    private eventBus: FinanceEventBus,
    private transactionManager: FinanceTransactionManager,
    private logger: FinanceSynchronizationLogger
  ) {}

  public initialize() {
    this.eventBus.on(
      "PurchaseRequestApproved",
      this.handlePurchaseRequestApproved.bind(this)
    );
    this.logger.log("BudgetSynchronizer initialized and subscribed to PurchaseRequestApprovedEvent.");
  }

  private async handlePurchaseRequestApproved(event: FinanceEvent, context: FinanceSynchronizationContext) {
    const typedEvent = event as PurchaseRequestApprovedEvent;
    await this.transactionManager.runInTransaction(async (tx) => {
      this.logger.log(`Processing PurchaseRequestApprovedEvent for PR: ${typedEvent.payload.purchaseRequestId}`);
      // 1. Find the budgetLineId associated with the purchaseRequestId
      const [reservation] = await tx.select()
        .from(schema.prBudgetReservations)
        .where(eq(schema.prBudgetReservations.purchaseRequestId, typedEvent.payload.purchaseRequestId))
        .limit(1);

      if (!reservation) {
        this.logger.warn(`No budget reservation found for purchase request ID: ${typedEvent.payload.purchaseRequestId}. Skipping budget update.`);
        return;
      }

      const budgetLineId = reservation.budgetLineId;
      const amount = typedEvent.payload.totalAmount;

      // 2. Update the commitments and availableBalance in budgetLines table
      await tx.update(schema.budgetLines)
        .set({
          commitments: sql`${schema.budgetLines.commitments} + ${amount}`,
          availableBalance: sql`${schema.budgetLines.availableBalance} - ${amount}`
        })
        .where(eq(schema.budgetLines.id, budgetLineId));

      this.logger.log(`Updated commitments and availableBalance for budgetLineId: ${budgetLineId} by amount: ${amount}`);
      this.logger.log(`Successfully processed PurchaseRequestApprovedEvent for PR: ${typedEvent.payload.purchaseRequestId}`);
    }, { organizationId: typedEvent.organizationId, operatingUnitId: typedEvent.operatingUnitId } as FinanceSynchronizationContext);
  }
}
