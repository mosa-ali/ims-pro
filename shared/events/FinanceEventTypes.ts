/**
 * @module FinanceEventTypes
 * @description Defines common types and interfaces for the Finance Synchronization Engine, including specific event types.
 */

/**
 * Base interface for all finance events.
 * All events should carry organizationId and operatingUnitId for data isolation.
 */
export interface FinanceEvent {
  type: string; // Unique identifier for the event type (e.g., 'PurchaseOrderApproved', 'ExpenditureApproved')
  timestamp: Date; // When the event occurred
  organizationId: number;
  operatingUnitId: number;
  payload: any; // Event-specific data
  // Add common fields that all events should have, e.g., userId, correlationId
  userId?: number;
  correlationId?: string;
}

// ============================================================================
// Commitment Events
// ============================================================================

export interface PurchaseRequestApprovedEvent extends FinanceEvent {
  type: 'PurchaseRequestApproved';
  payload: {
    purchaseRequestId: number;
    budgetLineId: number;
    totalAmount: number;
    currency: string;
    exchangeRate?: number; // Optional, as it might not always be present
    organizationId: number;
    operatingUnitId: number;
    // Add other relevant details for pre-encumbrance
  };
}

export interface PurchaseOrderSentEvent extends FinanceEvent {
  type: 'PurchaseOrderSent';
  payload: {
    purchaseOrderId: number;
    encumbranceId: number;
    totalAmount: number;
    currency: string;
    exchangeRate?: number; // Optional, as it might not always be present
    organizationId: number;
    operatingUnitId: number;
    // Add other relevant details for formal encumbrance
  };
}





export interface PurchaseOrderCancelledEvent extends FinanceEvent {
  type: 'PurchaseOrderCancelled';
  payload: {
    purchaseOrderId: number;
    purchaseRequestId: number; // Added for linking to budget reservations
    organizationId: number;
    operatingUnitId: number;
    // Add other relevant details for encumbrance liquidation
  };
}

export interface InvoiceMatchedEvent extends FinanceEvent {
  type: 'InvoiceMatched';
  payload: {
    invoiceId: number;
    purchaseOrderId?: number; // Optional, if invoice matches a PO
    amount: number;
    currency: string;
    organizationId: number;
    operatingUnitId: number;
    // Add other relevant details for invoice matching
  };
}

// ============================================================================
// Budget Events (Placeholder - to be expanded in Phase 3)
// ============================================================================

export interface BudgetApprovedEvent extends FinanceEvent {
  type: 'BudgetApproved';
  payload: {
    budgetId: number;
    totalApprovedAmount: number;
    organizationId: number;
    operatingUnitId: number;
  };
}

export interface BudgetRevisedEvent extends FinanceEvent {
  type: 'BudgetRevised';
  payload: {
    budgetId: number;
    revisionId: number;
    organizationId: number;
    operatingUnitId: number;
  };
}

// ============================================================================
// Ledger Events (Placeholder - to be expanded in Phase 6)
// ============================================================================

export interface JournalEntryPostedEvent extends FinanceEvent {
  type: 'JournalEntryPosted';
  payload: {
    journalEntryId: number;
    entryDate: string;
    sourceDocumentId: number;
    sourceDocumentType: string;
    description: string;
    totalDebit: number;
    totalCredit: number;
    postedBy: number;
    organizationId: number;
    operatingUnitId: number;
    lines: Array<{
      lineNumber: number;
      glAccountId: number;
      description?: string;
      debitAmount?: number;
      creditAmount?: number;
      projectId?: number;
      grantId?: number;
      activityId?: number;
      budgetLineId?: number;
      costCenterId?: number;
    }>;
  };
}

export interface ExpenditureApprovedEvent extends FinanceEvent {
  type: 'ExpenditureApproved';
  payload: {
    invoiceId: number;
    vendorName: string;
    totalAmount: number;
    currency: string;
    encumbranceId?: number; // Optional, as not all expenditures might have an encumbrance
    organizationId: number;
    operatingUnitId: number;
    // ... other relevant expenditure details
  };
}

// ============================================================================
// HR & Payroll Events (Placeholder - to be expanded in Phase 10)
// ============================================================================

export interface PayrollProcessedEvent extends FinanceEvent {
  type: 'PayrollProcessed';
  payload: {
    payrollRunId: number;
    periodStart: string; // ISO string
    periodEnd: string; // ISO string
    totalGrossPay: number;
    totalNetPay: number;
    totalTaxes: number;
    totalDeductions: number;
    currency: string;
    organizationId: number;
    operatingUnitId: number;
    // ... other relevant payroll details
  };
}

export interface BenefitDeductionEvent extends FinanceEvent {
  type: 'BenefitDeduction';
  payload: {
    employeeId: number;
    benefitType: string;
    amount: number;
    currency: string;
    deductionDate: string; // ISO string
    organizationId: number;
    operatingUnitId: number;
    // ... other relevant benefit deduction details
  };
}

export interface TaxWithholdingEvent extends FinanceEvent {
  type: 'TaxWithholding';
  payload: {
    employeeId: number;
    taxType: string;
    amount: number;
    currency: string;
    withholdingDate: string; // ISO string
    organizationId: number;
    operatingUnitId: number;
    // ... other relevant tax withholding details
  };
}

// ============================================================================
// Asset Events (Placeholder - to be expanded in Phase 8)
// ============================================================================

export interface AssetAcquiredEvent extends FinanceEvent {
  type: 'AssetAcquired';
  payload: {
    assetId: number;
    name: string;
    acquisitionDate: string; // ISO string
    cost: number;
    currency: string;
    organizationId: number;
    operatingUnitId: number;
    // ... other relevant asset acquisition details
  };
}

export interface AssetDisposedEvent extends FinanceEvent {
  type: 'AssetDisposed';
  payload: {
    assetId: number;
    disposalDate: string; // ISO string
    disposalProceeds: number;
    currency: string;
    organizationId: number;
    operatingUnitId: number;
    // ... other relevant asset disposal details
  };
}

export interface AssetDepreciatedEvent extends FinanceEvent {
  type: 'AssetDepreciated';
  payload: {
    assetId: number;
    depreciationAmount: number;
    depreciationDate: string; // ISO string
    organizationId: number;
    operatingUnitId: number;
    // ... other relevant depreciation details
  };
}

// ============================================================================
// Treasury Events (Placeholder - to be expanded in Phase 9)
// ============================================================================

export interface CashReceivedEvent extends FinanceEvent {
  type: 'CashReceived';
  payload: {
    transactionId: number;
    amount: number;
    currency: string;
    receivedDate: string; // ISO string
    bankAccountId: number;
    organizationId: number;
    operatingUnitId: number;
    // ... other relevant cash receipt details
  };
}

export interface BankReconciliationEvent extends FinanceEvent {
  type: 'BankReconciliation';
  payload: {
    bankAccountId: number;
    reconciliationDate: string; // ISO string
    status: 'reconciled' | 'partial' | 'unreconciled';
    organizationId: number;
    operatingUnitId: number;
    // ... other relevant reconciliation details
  };
}

export interface FundTransferEvent extends FinanceEvent {
  type: 'FundTransfer';
  payload: {
    fromAccountId: number;
    toAccountId: number;
    amount: number;
    currency: string;
    transferDate: string; // ISO string
    organizationId: number;
    operatingUnitId: number;
    // ... other relevant fund transfer details
  };
}

// ============================================================================
// Multi-Currency Events (Placeholder - to be expanded in Phase 11)
// ============================================================================

export interface CurrencyRevaluationEvent extends FinanceEvent {
  type: 'CurrencyRevaluation';
  payload: {
    currency: string;
    newExchangeRate: number;
    revaluationDate: string; // ISO string
    revaluedRecordsCount: number;
    organizationId: number;
    operatingUnitId: number;
    // ... other relevant revaluation details
  };
}

export interface ExchangeRateUpdatedEvent extends FinanceEvent {
  type: 'ExchangeRateUpdated';
  payload: {
    currencyPair: string; // e.g., 'USD/EUR'
    newRate: number;
    effectiveDate: string; // ISO string
    organizationId: number;
    operatingUnitId: number;
    // ... other relevant exchange rate details
  };
}

// ============================================================================
// Workflow Events (Placeholder - to be expanded in Phase 13)
// ============================================================================

export interface WorkflowInitiatedEvent extends FinanceEvent {
  type: 'WorkflowInitiated';
  payload: {
    workflowId: number;
    documentType: string; // e.g., 'PurchaseRequest', 'Invoice'
    documentId: number;
    initiatorId: number;
    organizationId: number;
    operatingUnitId: number;
    // ... other relevant workflow initiation details
  };
}

export interface WorkflowCompletedEvent extends FinanceEvent {
  type: 'WorkflowCompleted';
  payload: {
    workflowId: number;
    documentType: string;
    documentId: number;
    approverId: number;
    organizationId: number;
    operatingUnitId: number;
    // ... other relevant workflow completion details
  };
}

export interface WorkflowRejectedEvent extends FinanceEvent {
  type: 'WorkflowRejected';
  payload: {
    workflowId: number;
    documentType: string;
    documentId: number;
    rejecterId: number;
    reason: string;
    organizationId: number;
    operatingUnitId: number;
    // ... other relevant workflow rejection details
  };
}

// ============================================================================
// Donor Events (Placeholder - to be expanded in Phase 12)
// ============================================================================

export interface DonorContributionReceivedEvent extends FinanceEvent {
  type: 'DonorContributionReceived';
  payload: {
    donorId: number;
    donorName: string;
    amount: number;
    currency: string;
    contributionDate: string; // ISO string
    organizationId: number;
    operatingUnitId: number;
    // ... other relevant donor contribution details
  };
}

export interface DonorReportSubmittedEvent extends FinanceEvent {
  type: 'DonorReportSubmitted';
  payload: {
    donorId: number;
    donorName: string;
    reportId: number;
    reportType: string;
    submissionDate: string; // ISO string
    organizationId: number;
    operatingUnitId: number;
    // ... other relevant donor report details
  };
}

// ============================================================================
// Executive Reporting Events (Placeholder - to be expanded in Phase 14)
// ============================================================================

export interface ReportGeneratedEvent extends FinanceEvent {
  type: 'ReportGenerated';
  payload: {
    reportId: number;
    reportName: string;
    reportType: string; // e.g., 'FinancialStatement', 'BudgetVsActual'
    generationDate: string; // ISO string
    organizationId: number;
    operatingUnitId: number;
    // ... other relevant report details
  };
}

export interface DashboardUpdatedEvent extends FinanceEvent {
  type: 'DashboardUpdated';
  payload: {
    dashboardId: number;
    dashboardName: string;
    updateDate: string; // ISO string
    organizationId: number;
    operatingUnitId: number;
    // ... other relevant dashboard update details
  };
}

