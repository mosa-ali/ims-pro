## Phase 9: Treasury Integration

This phase focuses on integrating treasury management with the Finance Synchronization Engine. The goal is to ensure that treasury-related events (cash receipts, bank reconciliations, fund transfers) automatically trigger the appropriate financial events, which are then processed by the `TreasurySynchronizer` to update relevant financial records.

### Objectives:

- Implement the `TreasurySynchronizer` to handle treasury-related financial events.
- Define event types for cash received, bank reconciliation, and fund transfers.
- Ensure that treasury events are correctly reflected in financial records.
- Maintain data isolation (`organizationId` and `operatingUnitId`) throughout the integration.

### Files Modified/Created:

- **`@shared/events/FinanceEventTypes.ts`**: Updated to include `CashReceivedEvent`, `BankReconciliationEvent`, and `FundTransferEvent`.
- **`server/services/finance/synchronizers/TreasurySynchronizer.ts`**: Created to subscribe to and handle treasury-related events.
- **`server/services/finance/initFinanceEngine.ts`**: Updated to initialize and register the `TreasurySynchronizer`.

### Implementation Details:

#### `TreasurySynchronizer.ts`:

This synchronizer subscribes to the following events:

1.  **`CashReceivedEvent`**: When cash is received, this event triggers logic to record the cash receipt in a cash/bank ledger or update relevant financial records. This might involve inserting into a `cashReceipts` table or updating `bankAccounts` balance.
2.  **`BankReconciliationEvent`**: When a bank reconciliation is performed, this event triggers logic to record the reconciliation status and any adjustments. This could involve updating `bankAccounts` reconciliation status and recording discrepancies.
3.  **`FundTransferEvent`**: When funds are transferred between accounts, this event triggers logic to record the fund transfer and update balances in the respective `bankAccounts` or `internalAccounts` tables.

Each event handler within the `TreasurySynchronizer` operates within a database transaction managed by `FinanceTransactionManager` to ensure data consistency.

#### Event Emission Points:

Event emission for treasury-related events would typically originate from a Treasury Management module (not yet implemented) or from external bank integrations. For example:

-   A Treasury Management UI/API would emit `CashReceivedEvent` upon recording a cash inflow.
-   A bank reconciliation process would emit `BankReconciliationEvent`.
-   A fund transfer initiation would emit `FundTransferEvent`.

### Risks and Mitigation:

-   **Missing Treasury Module**: The current implementation of `TreasurySynchronizer` includes placeholder logic as a dedicated Treasury Management module is not yet integrated. This is mitigated by clearly outlining the expected event emission points and planning for future integration.
-   **External System Integration**: Integration with external banking systems for real-time cash flow and reconciliation will require robust API connections and error handling. This will be addressed in future phases focusing on external integrations.

### Remaining Work:

-   Development of a dedicated Treasury Management module or integration with external systems to emit `CashReceivedEvent`, `BankReconciliationEvent`, and `FundTransferEvent`.
-   Comprehensive unit and integration tests for the `TreasurySynchronizer`.
-   Definition of `cashReceipts`, `bankAccounts`, and `internalAccounts` tables in `drizzle/schema.ts` (if not already present).
