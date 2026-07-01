import type { FinanceSynchronizationContext } from "../FinanceSynchronizationContext";
import { FinanceEventBus } from "../FinanceEventBus";
import { FinanceTransactionManager } from "../FinanceTransactionManager";
import { FinanceSynchronizationLogger } from "../FinanceSynchronizationLogger";
import { ExpenditureApprovedEvent, JournalEntryPostedEvent, FinanceEvent } from "../../../../shared/events/FinanceEventTypes";
import * as schema from "../../../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { DB } from "../../../db/_scope";

export class ExpenditureSynchronizer {
  constructor(
    private eventBus: FinanceEventBus,
    private transactionManager: FinanceTransactionManager,
    private logger: FinanceSynchronizationLogger
  ) {}

  public initialize() {
    this.eventBus.on(
      "ExpenditureApproved",
      this.handleExpenditureApproved.bind(this)
    );
    this.eventBus.on(
      "JournalEntryPosted",
      this.handleJournalEntryPosted.bind(this)
    );
    this.logger.log("ExpenditureSynchronizer initialized and subscribed to ExpenditureApprovedEvent and JournalEntryPostedEvent.");
  }

  private async handleExpenditureApproved(event: FinanceEvent, context: FinanceSynchronizationContext, db?: DB) {
    const typedEvent = event as ExpenditureApprovedEvent;
    await this.transactionManager.runInTransaction(async (tx) => {
      this.logger.log(`Processing ExpenditureApprovedEvent for Invoice: ${typedEvent.payload.invoiceId}`);

      // 1. Create a new expenditure record
      await tx.insert(schema.financeExpenditures).values({
        organizationId: typedEvent.organizationId,
        operatingUnitId: typedEvent.operatingUnitId,
        payeeType: "vendor" as const,
        payeeName: typedEvent.payload.vendorName || "Unknown",
        expenditureNumber: `EXP-${typedEvent.payload.invoiceId}`,
        expenditureDate: new Date().toISOString().split('T')[0],
        amount: typedEvent.payload.totalAmount.toString(),
        status: "approved",
        approvalStatus: "approved",
        createdBy: 1, // Default user ID
        // Add other relevant fields from event payload
      });

      this.logger.log(`Created expenditure record for Invoice: ${typedEvent.payload.invoiceId}`);

      // 2. Liquidate associated encumbrance if present
      if (typedEvent.payload.encumbranceId) {
        await tx.update(schema.financeEncumbrances)
          .set({
            remainingAmount: sql`${schema.financeEncumbrances.remainingAmount} - ${typedEvent.payload.totalAmount.toString()}`,
            status: "partially_liquidated" as const,
          })
          .where(eq(schema.financeEncumbrances.id, typedEvent.payload.encumbranceId));
        this.logger.log(`Liquidated encumbrance ${typedEvent.payload.encumbranceId} for Invoice: ${typedEvent.payload.invoiceId}`);
      }

      this.logger.log(`Successfully processed ExpenditureApprovedEvent for Invoice: ${typedEvent.payload.invoiceId}`);
    }, { organizationId: typedEvent.organizationId, operatingUnitId: typedEvent.operatingUnitId } as FinanceSynchronizationContext);
  }

  private async handleJournalEntryPosted(event: FinanceEvent, context: FinanceSynchronizationContext, db?: DB) {
    const typedEvent = event as JournalEntryPostedEvent;
    await this.transactionManager.runInTransaction(async (tx) => {
      this.logger.log(`Processing JournalEntryPostedEvent for Journal Entry: ${typedEvent.payload.journalEntryId}`);

      // 1. Create a new journal entry
      await tx.insert(schema.journalEntries).values({
        organizationId: typedEvent.organizationId,
        operatingUnitId: typedEvent.operatingUnitId,
        entryNumber: `JE-${typedEvent.payload.journalEntryId}`,
        entryDate: typedEvent.payload.entryDate,
        sourceModule: "procurement",
        sourceDocumentId: typedEvent.payload.sourceDocumentId,
        sourceDocumentType: typedEvent.payload.sourceDocumentType,
        description: typedEvent.payload.description,
        totalDebit: typedEvent.payload.totalDebit.toString(),
        totalCredit: typedEvent.payload.totalCredit.toString(),
        status: "posted",
        postedAt: new Date().toISOString(),
        postedBy: typedEvent.payload.postedBy,
      });

      this.logger.log(`Created Journal Entry for event: ${typedEvent.payload.journalEntryId}`);

      // 2. Create journal lines
      if (typedEvent.payload.lines && typedEvent.payload.lines.length > 0) {
        const journalLinesToInsert = typedEvent.payload.lines.map(line => ({
          organizationId: typedEvent.organizationId,
          journalEntryId: typedEvent.payload.journalEntryId,
          lineNumber: line.lineNumber,
          glAccountId: line.glAccountId,
          description: line.description,
          debitAmount: line.debitAmount?.toString() || "0",
          creditAmount: line.creditAmount?.toString() || "0",
          projectId: line.projectId,
          grantId: line.grantId,
          activityId: line.activityId,
          budgetLineId: line.budgetLineId,
          costCenterId: line.costCenterId,
        }));
        await tx.insert(schema.journalLines).values(journalLinesToInsert);
        this.logger.log(`Created ${journalLinesToInsert.length} journal lines for Journal Entry`);
      }

      this.logger.log(`Successfully processed JournalEntryPostedEvent for Journal Entry: ${typedEvent.payload.journalEntryId}`);
    }, { organizationId: typedEvent.organizationId, operatingUnitId: typedEvent.operatingUnitId } as FinanceSynchronizationContext);
  }
}
