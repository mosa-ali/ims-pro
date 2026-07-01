import { FinanceEventBus } from "../FinanceEventBus";
import { FinanceTransactionManager } from "../FinanceTransactionManager";
import { FinanceSynchronizationLogger } from "../FinanceSynchronizationLogger";
import type { FinanceSynchronizationContext } from "../FinanceSynchronizationContext";
import { PurchaseOrderSentEvent, PurchaseOrderCancelledEvent, FinanceEvent } from "../../../../shared/events/FinanceEventTypes";
import { financeEncumbrances, prBudgetReservations } from "../../../../drizzle/schema.ts";
import { eq, sql } from "drizzle-orm";
import { DB } from "../../../db/_scope";

export class CommitmentSynchronizer {
  constructor(
    private eventBus: FinanceEventBus,
    private transactionManager: FinanceTransactionManager,
    private logger: FinanceSynchronizationLogger
  ) {}

  public initialize() {
    this.eventBus.on(
      "PurchaseOrderSent",
      this.handlePurchaseOrderSent.bind(this)
    );
    this.eventBus.on(
      "PurchaseOrderCancelled",
      this.handlePurchaseOrderCancelled.bind(this)
    );
    this.logger.log("CommitmentSynchronizer initialized and subscribed to PurchaseOrderSentEvent and PurchaseOrderCancelledEvent.");
  }

  private async handlePurchaseOrderSent(event: FinanceEvent, context: FinanceSynchronizationContext, db?: DB) {
    const typedEvent = event as PurchaseOrderSentEvent;
    await this.transactionManager.runInTransaction(async (tx) => {
      this.logger.log(`Processing PurchaseOrderSentEvent for PO: ${typedEvent.payload.purchaseOrderId}`);

      // Update financeEncumbrances status to active and link to purchase order
      await tx.update(financeEncumbrances)
        .set({
          status: "active",
          purchaseOrderId: typedEvent.payload.purchaseOrderId,
          encumberedAmount: typedEvent.payload.totalAmount.toString(), // Convert to string for decimal column
          remainingAmount: typedEvent.payload.totalAmount.toString(), // Convert to string for decimal column
        })
        .where(eq(financeEncumbrances.id, typedEvent.payload.encumbranceId));

      this.logger.log(`Updated encumbrance ${typedEvent.payload.encumbranceId} for PO ${typedEvent.payload.purchaseOrderId} to active.`);
      this.logger.log(`Successfully processed PurchaseOrderSentEvent for PO: ${typedEvent.payload.purchaseOrderId}`);
    }, { organizationId: typedEvent.organizationId, operatingUnitId: typedEvent.operatingUnitId } as FinanceSynchronizationContext);
  }

  private async handlePurchaseOrderCancelled(event: FinanceEvent, context: FinanceSynchronizationContext, db?: DB) {
    const typedEvent = event as PurchaseOrderCancelledEvent;
    await this.transactionManager.runInTransaction(async (tx) => {
      this.logger.log(`Processing PurchaseOrderCancelledEvent for PO: ${typedEvent.payload.purchaseOrderId}`);

      // Update financeEncumbrances status to cancelled
      await tx.update(financeEncumbrances)
        .set({
          status: "cancelled" as const,
          remainingAmount: "0", // Convert to string for decimal column
        })
        .where(eq(financeEncumbrances.purchaseOrderId, typedEvent.payload.purchaseOrderId));

      // Also release any associated budget reservations if they exist and are not yet converted
      await tx.update(prBudgetReservations)
        .set({
          status: "released",
          releasedAt: new Date().toISOString(), // if this column exists
        })
        .where(
          eq(
            prBudgetReservations.purchaseRequestId,
            typedEvent.payload.purchaseRequestId
          )
        );

      this.logger.log(`Cancelled encumbrance and associated budget reservation for PO: ${typedEvent.payload.purchaseOrderId}`);
      this.logger.log(`Successfully processed PurchaseOrderCancelledEvent for PO: ${typedEvent.payload.purchaseOrderId}`);
    }, { organizationId: typedEvent.organizationId, operatingUnitId: typedEvent.operatingUnitId } as FinanceSynchronizationContext);
  }
}
