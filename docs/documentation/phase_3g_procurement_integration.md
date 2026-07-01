## Phase 7: Procurement Integration

This phase focuses on integrating the procurement workflow with the Finance Synchronization Engine. The goal is to ensure that procurement actions (like creating a PR, sending a PO, or approving an invoice) automatically trigger the appropriate financial events, which are then processed by the synchronizers to update budgets, commitments, and expenditures.

### Objectives:

- Ensure all relevant procurement actions emit the correct finance events.
- Verify that the `CommitmentSynchronizer` and `ExpenditureSynchronizer` correctly handle these events to update the financial state.
- Maintain data isolation (`organizationId` and `operatingUnitId`) throughout the integration.

### Files Modified/Created:

- **`server/prFinanceRouter.ts`**: This file was previously updated in Phases 2, 4, and 5 to emit events. In this phase, we review and consolidate these integrations.
- **`server/services/finance/synchronizers/CommitmentSynchronizer.ts`**: Handles `PurchaseRequestApprovedEvent`, `PurchaseOrderSentEvent`, and `PurchaseOrderCancelledEvent`.
- **`server/services/finance/synchronizers/ExpenditureSynchronizer.ts`**: Handles `ExpenditureApprovedEvent` and `JournalEntryPostedEvent`.

### Implementation Details:

The integration relies on the Event Bus architecture established in Phase 2. The `prFinanceRouter` acts as the event publisher, while the synchronizers act as subscribers.

#### Event Emission Points in `prFinanceRouter.ts`:

1.  **`createReservation`**: Emits `PurchaseRequestApprovedEvent`. This signifies a soft commitment (pre-encumbrance) of funds.
2.  **`createEncumbrance`**: Emits `PurchaseOrderSentEvent`. This signifies a formal commitment (encumbrance) of funds, usually transitioning from a soft commitment.
3.  **`cancelPurchaseOrder`**: Emits `PurchaseOrderCancelledEvent`. This signifies the release of a formal commitment.
4.  **`approveInvoice`**: Emits `ExpenditureApprovedEvent`. This signifies an actual expenditure, which should liquidate the corresponding encumbrance.
5.  **`processPayment`**: Emits `JournalEntryPostedEvent`. This signifies the final posting of the transaction to the General Ledger.

#### Event Handling in Synchronizers:

- **`CommitmentSynchronizer`**:
    - Listens for `PurchaseRequestApprovedEvent` to create `prBudgetReservations`.
    - Listens for `PurchaseOrderSentEvent` to create `financeEncumbrances` and update `prBudgetReservations` status.
    - Listens for `PurchaseOrderCancelledEvent` to update `prBudgetReservations` status to 'cancelled'.
- **`ExpenditureSynchronizer`**:
    - Listens for `ExpenditureApprovedEvent` to create `financeExpenditures` and liquidate `financeEncumbrances`.
    - Listens for `JournalEntryPostedEvent` to create `journalEntries` and `journalLines`.

### Risks and Mitigation:

- **Event Ordering**: Ensuring events are processed in the correct order (e.g., PR approved before PO sent) is critical. The current architecture relies on the synchronous nature of the event bus within the same Node.js process. For distributed systems, a more robust message queue might be needed.
- **Data Consistency**: If an event handler fails, the financial state might become inconsistent with the procurement state. The `FinanceTransactionManager` mitigates this by wrapping event handling in database transactions.

### Remaining Work:

- Comprehensive end-to-end testing of the procurement-to-finance workflow.
- Implementation of retry mechanisms for failed event processing (if moving to an asynchronous event bus).
