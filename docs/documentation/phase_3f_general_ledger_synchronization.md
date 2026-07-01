## Phase 6: General Ledger Synchronization

This phase focuses on synchronizing journal entries and general ledger (GL) posting. The `ExpenditureSynchronizer` is responsible for handling `JournalEntryPostedEvent` to ensure that all financial transactions are accurately reflected in the GL.

### Objectives:

- Implement the `handleJournalEntryPosted` method in `ExpenditureSynchronizer.ts` to create new journal entries and their corresponding lines in the `journalEntries` and `journalLines` tables.
- Ensure that the `JournalEntryPostedEvent` payload contains all necessary information for a complete GL entry, including line item details.
- Verify that data isolation (`organizationId` and `operatingUnitId`) is maintained for all GL entries.
- Update `prFinanceRouter.ts` to emit `JournalEntryPostedEvent` when a payment is processed.

### Files Modified/Created:

- **`@shared/events/FinanceEventTypes.ts`**: Updated the `JournalEntryPostedEvent` interface to include detailed line item information.
- **`server/services/finance/synchronizers/ExpenditureSynchronizer.ts`**: Implemented the `handleJournalEntryPosted` method to process `JournalEntryPostedEvent` and create GL entries.
- **`server/prFinanceRouter.ts`**: Modified the `processPayment` mutation to emit `JournalEntryPostedEvent`.

### Implementation Details:

#### `ExpenditureSynchronizer.ts` - `handleJournalEntryPosted` method:

This method is triggered by the `JournalEntryPostedEvent`. It performs the following actions within a transaction:

1.  **Creates a new journal entry**: An entry is inserted into the `journalEntries` table using data from the event payload. This includes `organizationId`, `operatingUnitId`, `entryNumber`, `entryDate`, `sourceModule`, `sourceDocumentId`, `sourceDocumentType`, `description`, `totalDebit`, `totalCredit`, `status`, `postedAt`, and `postedBy`.
2.  **Creates journal lines**: For each line item in the event payload, a corresponding entry is inserted into the `journalLines` table. Each line includes `organizationId`, `journalEntryId` (linked to the newly created journal entry), `lineNumber`, `glAccountId`, `description`, `debitAmount`, `creditAmount`, and optional dimensions like `projectId`, `grantId`, `activityId`, `budgetLineId`, and `costCenterId`.

#### `prFinanceRouter.ts` - `processPayment` mutation:

The `processPayment` mutation now emits a `JournalEntryPostedEvent` after successfully processing a payment. The event payload is constructed with comprehensive details of the journal entry and its lines, ensuring that the `ExpenditureSynchronizer` has all the necessary information to create accurate GL records.

### Risks and Mitigation:

- **Data Inconsistency**: Ensuring that the `JournalEntryPostedEvent` payload is complete and accurate is crucial. This is mitigated by carefully constructing the event payload in `prFinanceRouter.ts` and validating it against the `FinanceEventTypes.ts` interface.
- **Transaction Failures**: All GL updates are performed within a database transaction managed by `FinanceTransactionManager` to ensure atomicity. If any part of the GL posting fails, the entire transaction is rolled back.

### Remaining Work:

- Comprehensive unit and integration tests for the `ExpenditureSynchronizer`'s `handleJournalEntryPosted` method.
- Validation of GL entries against source documents and financial reports.
