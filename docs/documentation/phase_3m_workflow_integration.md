# Phase 13: Workflow Integration

## Overview
This phase focuses on integrating all Finance processes with the Workflow Engine. The goal is to ensure that financial events are seamlessly integrated into existing or new workflow processes, enabling automated approvals, rejections, and status updates.

## Implemented Components

### 1. `WorkflowSynchronizer`
- **Location:** `server/services/finance/synchronizers/WorkflowSynchronizer.ts`
- **Purpose:** Listens for workflow-related events and synchronizes them with the core finance tables, particularly for updating document statuses based on workflow outcomes.
- **Handled Events:**
  - `WorkflowInitiatedEvent`: Triggered when a new workflow is started for a financial document. This event will contain logic to record workflow initiation, link to relevant finance documents, or update status.
  - `WorkflowCompletedEvent`: Triggered when a workflow for a financial document is successfully completed. This event will update finance document status upon workflow completion, and can trigger subsequent finance events (e.g., `ExpenditureApprovedEvent` after an invoice approval workflow).
  - `WorkflowRejectedEvent`: Triggered when a workflow for a financial document is rejected. This event will revert changes, update finance document status to rejected, or trigger corrective actions.

### 2. Event Definitions
- **Location:** `shared/events/FinanceEventTypes.ts`
- **Added Events:**
  - `WorkflowInitiatedEvent`
  - `WorkflowCompletedEvent`
  - `WorkflowRejectedEvent`

### 3. Engine Integration
- **Location:** `server/services/finance/initFinanceEngine.ts`
- **Update:** The `WorkflowSynchronizer` has been instantiated and registered with the `FinanceEventBus` during engine initialization.

## Next Steps
- **Event Emission:** Existing workflow modules or new workflow orchestration services need to be updated to emit `WorkflowInitiatedEvent`, `WorkflowCompletedEvent`, and `WorkflowRejectedEvent` at appropriate stages of their processes.
- **Detailed Implementation:** The `WorkflowSynchronizer` currently contains placeholder logic. It needs to be fully implemented to interact with financial tables for updating document statuses and triggering subsequent finance events based on workflow outcomes.
- **Testing:** Comprehensive unit and integration tests must be written to verify the correct handling of workflow integration events and their impact on financial records.
