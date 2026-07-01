## Phase 8: Asset Integration

This phase focuses on integrating asset management with the Finance Synchronization Engine. The goal is to ensure that asset lifecycle events (acquisition, depreciation, disposal) automatically trigger the appropriate financial events, which are then processed by the `AssetSynchronizer` to update relevant financial records.

### Objectives:

- Implement the `AssetSynchronizer` to handle asset-related financial events.
- Define event types for asset acquisition, depreciation, and disposal.
- Ensure that asset lifecycle events are correctly reflected in financial records.
- Maintain data isolation (`organizationId` and `operatingUnitId`) throughout the integration.

### Files Modified/Created:

- **`@shared/events/FinanceEventTypes.ts`**: Updated to include `AssetAcquiredEvent`, `AssetDisposedEvent`, and `AssetDepreciatedEvent`.
- **`server/services/finance/synchronizers/AssetSynchronizer.ts`**: Created to subscribe to and handle asset-related events.
- **`server/services/finance/initFinanceEngine.ts`**: Updated to initialize and register the `AssetSynchronizer`.

### Implementation Details:

#### `AssetSynchronizer.ts`:

This synchronizer subscribes to the following events:

1.  **`AssetAcquiredEvent`**: When an asset is acquired, this event triggers logic to record the asset in a dedicated assets table (e.g., `fixedAssets`) or update relevant financial records. This might involve creating an initial asset entry with its cost and acquisition date.
2.  **`AssetDisposedEvent`**: When an asset is disposed of, this event triggers logic to record the disposal, update the asset's status, and potentially record any disposal proceeds or losses. This could involve updating the `fixedAssets` table and generating relevant journal entries.
3.  **`AssetDepreciatedEvent`**: This event is triggered periodically (e.g., monthly, annually) to record depreciation expense. The synchronizer's logic would update the asset's accumulated depreciation and book value, and potentially generate journal entries for depreciation expense.

Each event handler within the `AssetSynchronizer` operates within a database transaction managed by `FinanceTransactionManager` to ensure data consistency.

#### Event Emission Points:

Event emission for asset-related events would typically originate from an Asset Management module (not yet implemented). For example:

-   An Asset Management UI/API would emit `AssetAcquiredEvent` upon the creation of a new asset record.
-   A process for asset disposal would emit `AssetDisposedEvent`.
-   A scheduled job for depreciation calculation would emit `AssetDepreciatedEvent`.

### Risks and Mitigation:

-   **Missing Asset Module**: The current implementation of `AssetSynchronizer` includes placeholder logic as a dedicated Asset Management module is not yet integrated. This is mitigated by clearly outlining the expected event emission points and planning for future integration.
-   **Depreciation Calculation Accuracy**: Ensuring correct depreciation calculation methods (straight-line, declining balance, etc.) and their accurate reflection in financial records is critical. This will require detailed implementation within the Asset Management module and careful testing of the `AssetDepreciatedEvent` handler.

### Remaining Work:

-   Development of a dedicated Asset Management module to emit `AssetAcquiredEvent`, `AssetDisposedEvent`, and `AssetDepreciatedEvent`.
-   Comprehensive unit and integration tests for the `AssetSynchronizer`.
-   Definition of `fixedAssets` and `depreciationEntries` tables in `drizzle/schema.ts` (if not already present).
