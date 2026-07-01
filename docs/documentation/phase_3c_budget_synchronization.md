# Phase 3: Budget Synchronization

## Objectives

- Transform existing Budget Sync into official Budget Synchronizer.
- Update budget and budget line items based on financial events.

## Implementation Details

### BudgetSynchronizer (`server/services/finance/synchronizers/BudgetSynchronizer.ts`)

This synchronizer is responsible for updating budget-related tables (`budgets`, `budgetLines`, `prBudgetReservations`) in response to specific financial events.

- **Subscribed Events:**
  - `PurchaseRequestApprovedEvent`: When a purchase request is approved, the `handlePurchaseRequestApproved` method is triggered. This method updates the `committedAmount` and `availableBalance` in the `budgetLines` table based on the reserved amount for the purchase request.

### Event Emission in `prFinanceRouter.ts`

The `prFinanceRouter.ts` has been updated to emit the following events at critical points in the procurement and finance workflow:

- **`createReservation` Mutation:**
  - Emits `PurchaseRequestApprovedEvent` after a budget reservation is successfully created. The event payload includes `purchaseRequestId`, `budgetLineId`, `totalAmount`, `currency`, and `exchangeRate`.

- **`createEncumbrance` Mutation:**
  - Emits `PurchaseOrderSentEvent` after a reservation is converted into an encumbrance (typically when a purchase order is sent). The event payload includes `purchaseOrderId`, `encumbranceId`, `totalAmount`, `currency`, and `exchangeRate`.

- **`approveInvoice` Mutation:**
  - Emits `ExpenditureApprovedEvent` after an invoice is approved. The event payload includes `invoiceId`, `totalAmount`, `currency`, and `encumbranceId`.

- **`processPayment` Mutation:**
  - Emits `JournalEntryPostedEvent` after a payment is processed. The event payload includes `journalEntryId` (using `paymentId`), `totalDebit`, `totalCredit`, `organizationId`, and `operatingUnitId`.

## Risks and Mitigation

- **Event Payload Mismatch:** Ensure that the event payloads emitted by the routers strictly adhere to the `FinanceEventTypes.ts` definitions. Any discrepancies can lead to runtime errors in the synchronizers. This has been addressed by carefully aligning the emitted event objects with the defined types.
- **Transactionality:** All budget updates within the `BudgetSynchronizer` are wrapped in a database transaction using `FinanceTransactionManager.runInTransaction` to ensure atomicity and data consistency.
- **Error Handling:** Robust error handling is implemented within the synchronizers to log failures and prevent cascading issues.

## Remaining Work

- Implement additional synchronizers for other event types (e.g., `CommitmentSynchronizer` for `PurchaseOrderSentEvent`, `ExpenditureSynchronizer` for `ExpenditureApprovedEvent`, `GeneralLedgerSynchronizer` for `JournalEntryPostedEvent`).
- Develop comprehensive unit and integration tests for the `BudgetSynchronizer` and event emission points.
- Update the `initFinanceEngine.ts` to register other synchronizers as they are implemented.
