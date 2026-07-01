# Phase 4: Commitment Accounting Implementation

This phase focuses on implementing the core logic for commitment accounting, specifically handling the creation and cancellation of encumbrances based on purchase order events. It leverages the Finance Synchronization Engine and Event Bus established in previous phases.

## Key Implementations

### 1. `CommitmentSynchronizer.ts`

-   **Purpose**: This synchronizer is responsible for updating financial records related to commitments (encumbrances) in response to `PurchaseOrderSentEvent` and `PurchaseOrderCancelledEvent`.
-   **`handlePurchaseOrderSent`**: When a `PurchaseOrderSentEvent` is received, this method updates the `financeEncumbrances` table. It sets the encumbrance status to `active`, links it to the `purchaseOrderId`, and records the `encumberedAmount` and `remainingAmount`.
-   **`handlePurchaseOrderCancelled`**: Upon receiving a `PurchaseOrderCancelledEvent`, this method updates the `financeEncumbrances` table by setting the status to `cancelled` and `remainingAmount` to `0`. Crucially, it also updates the `prBudgetReservations` table, setting the status to `cancelled` and recording `cancelledAt` for the associated `purchaseRequestId`.

### 2. `prFinanceRouter.ts` Updates

-   **`createEncumbrance` Mutation**: This mutation, responsible for converting a budget reservation into a formal encumbrance when a vendor is selected, now emits a `PurchaseOrderSentEvent`. The event payload includes `purchaseOrderId`, `encumbranceId`, `totalAmount`, `currency`, and `exchangeRate`.
-   **`cancelPurchaseOrder` Mutation (New)**: A new mutation has been added to handle the cancellation of purchase orders. This mutation:
    -   Takes `purchaseOrderId` as input.
    -   Fetches the `purchaseOrder` to retrieve the associated `purchaseRequestId`.
    -   Updates the `purchaseOrders` table, setting the status to `cancelled`, and recording `cancelledAt` and `cancelledBy`.
    -   Emits a `PurchaseOrderCancelledEvent` with `purchaseOrderId` and `purchaseRequestId` in its payload. This event triggers the `handlePurchaseOrderCancelled` method in the `CommitmentSynchronizer`.

## Event Flow

1.  **Purchase Order Creation**: When `createEncumbrance` is called (e.g., after a PO is generated), a `PurchaseOrderSentEvent` is published.
    -   `CommitmentSynchronizer` listens for this event and updates `financeEncumbrances`.
2.  **Purchase Order Cancellation**: When `cancelPurchaseOrder` is called, a `PurchaseOrderCancelledEvent` is published.
    -   `CommitmentSynchronizer` listens for this event and updates both `financeEncumbrances` and `prBudgetReservations`.

## Data Consistency

-   The `CommitmentSynchronizer` ensures that `financeEncumbrances` and `prBudgetReservations` are kept consistent with the state of purchase orders through event-driven updates.
-   Transactional integrity is maintained by executing all updates within a database transaction via `FinanceTransactionManager`.

## Remaining Work for Phase 4

-   Implement unit and integration tests for `CommitmentSynchronizer`.
-   Verify end-to-end flow for commitment creation and cancellation.
-   Refine error handling and logging within the synchronizer.
