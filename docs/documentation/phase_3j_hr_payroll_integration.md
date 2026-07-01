# Phase 10: HR & Payroll Integration

## Overview
This phase focuses on integrating the HR and Payroll systems with the Finance Synchronization Engine. The goal is to ensure that payroll processing, benefit deductions, and tax withholdings automatically trigger the appropriate financial events and updates in the general ledger and budget systems.

## Implemented Components

### 1. `HRSynchronizer`
- **Location:** `server/services/finance/synchronizers/HRSynchronizer.ts`
- **Purpose:** Listens for HR and payroll-related events and synchronizes them with the core finance tables.
- **Handled Events:**
  - `PayrollProcessedEvent`: Triggered when a payroll run is completed. This event should result in the creation of journal entries for gross pay, net pay, taxes, and deductions, and update relevant budget lines.
  - `BenefitDeductionEvent`: Triggered when a benefit deduction is processed for an employee. This event should update the corresponding liability accounts and budget lines.
  - `TaxWithholdingEvent`: Triggered when taxes are withheld from an employee's pay. This event should update the tax liability accounts and budget lines.

### 2. Event Definitions
- **Location:** `shared/events/FinanceEventTypes.ts`
- **Added Events:**
  - `PayrollProcessedEvent`
  - `BenefitDeductionEvent`
  - `TaxWithholdingEvent`

### 3. Engine Integration
- **Location:** `server/services/finance/initFinanceEngine.ts`
- **Update:** The `HRSynchronizer` has been instantiated and registered with the `FinanceEventBus` during engine initialization.

## Next Steps
- **Event Emission:** The HR and Payroll modules (e.g., `hrRouter.ts`, `payrollRouter.ts`) need to be updated to emit these events at the appropriate points in their workflows.
- **Detailed Implementation:** The `HRSynchronizer` currently contains placeholder logic. It needs to be fully implemented to interact with the `journalEntries`, `journalLines`, and `budgetLines` tables based on the specific accounting rules for payroll and benefits.
- **Testing:** Comprehensive unit and integration tests must be written to verify the correct handling of HR and payroll events and their impact on the financial ledgers.
