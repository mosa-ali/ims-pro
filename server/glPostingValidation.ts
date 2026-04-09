/**
 * GL Posting Validation and Enforcement Engine
 * Ensures automatic GL posting on financial events
 * Validates journal entry balance and org+OU scoping
 * 
 * ENFORCEMENT RULES:
 * - Journal entries must be balanced (debit = credit)
 * - All entries must include org + OU scoping
 * - Source document reference is mandatory
 * - Reversing entries must link to original entry
 * - Automatic posting on configured financial events
 */

import { TRPCError } from "@trpc/server";

export type FinancialEventType =
  | "invoice_approved"
  | "invoice_rejected"
  | "payment_posted"
  | "payment_reversed"
  | "expenditure_approved"
  | "expenditure_rejected"
  | "grn_accepted"
  | "po_acknowledged";

export interface GLJournalEntryLine {
  accountCode: string;
  accountName: string;
  debitAmount: number;
  creditAmount: number;
  description: string;
  costCenter?: string;
  project?: string;
}

export interface GLJournalEntry {
  entryNumber: string;
  entryDate: Date;
  description: string;
  lines: GLJournalEntryLine[];
  organizationId: number;
  operatingUnitId: number;
  sourceDocumentType: string;
  sourceDocumentId: number;
  sourceDocumentNumber: string;
  createdBy: number;
  autoPost?: boolean;
}

/**
 * Validate journal entry balance
 * ENFORCEMENT: Debit must equal credit
 */
export function validateJournalEntryBalance(
  lines: GLJournalEntryLine[]
): { valid: boolean; totalDebit: number; totalCredit: number; error?: string } {
  const totalDebit = lines.reduce((sum, line) => sum + line.debitAmount, 0);
  const totalCredit = lines.reduce((sum, line) => sum + line.creditAmount, 0);

  // Allow small floating point differences (0.01)
  const difference = Math.abs(totalDebit - totalCredit);

  if (difference > 0.01) {
    return {
      valid: false,
      totalDebit,
      totalCredit,
      error: `Journal entry out of balance. Debit: $${totalDebit.toFixed(2)}, Credit: $${totalCredit.toFixed(2)}, Difference: $${difference.toFixed(2)}`,
    };
  }

  return {
    valid: true,
    totalDebit,
    totalCredit,
  };
}

/**
 * Validate GL entry lines
 * ENFORCEMENT: Each line must have either debit or credit (not both)
 */
export function validateGLEntryLines(lines: GLJournalEntryLine[]): { valid: boolean; error?: string } {
  if (!lines || lines.length === 0) {
    return {
      valid: false,
      error: "Journal entry must have at least one line",
    };
  }

  if (lines.length < 2) {
    return {
      valid: false,
      error: "Journal entry must have at least two lines (debit and credit)",
    };
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Validate account code
    if (!line.accountCode || line.accountCode.trim() === "") {
      return {
        valid: false,
        error: `Line ${i + 1}: Account code is required`,
      };
    }

    // Validate account name
    if (!line.accountName || line.accountName.trim() === "") {
      return {
        valid: false,
        error: `Line ${i + 1}: Account name is required`,
      };
    }

    // Validate debit/credit amounts
    if (line.debitAmount < 0 || line.creditAmount < 0) {
      return {
        valid: false,
        error: `Line ${i + 1}: Debit and credit amounts must be non-negative`,
      };
    }

    // Validate that line has either debit or credit (not both)
    if (line.debitAmount > 0 && line.creditAmount > 0) {
      return {
        valid: false,
        error: `Line ${i + 1}: Line cannot have both debit and credit amounts`,
      };
    }

    // Validate that line has debit or credit (not neither)
    if (line.debitAmount === 0 && line.creditAmount === 0) {
      return {
        valid: false,
        error: `Line ${i + 1}: Line must have either debit or credit amount`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate org + OU scoping
 * ENFORCEMENT: All entries must include organization and operating unit
 */
export function validateOrgOUScoping(
  organizationId: number | undefined,
  operatingUnitId: number | undefined
): { valid: boolean; error?: string } {
  if (!organizationId || organizationId <= 0) {
    return {
      valid: false,
      error: "Organization ID is required and must be positive",
    };
  }

  if (!operatingUnitId || operatingUnitId <= 0) {
    return {
      valid: false,
      error: "Operating Unit ID is required and must be positive",
    };
  }

  return { valid: true };
}

/**
 * Validate source document reference
 * ENFORCEMENT: Source document is mandatory
 */
export function validateSourceDocument(
  sourceDocumentType: string | undefined,
  sourceDocumentId: number | undefined,
  sourceDocumentNumber: string | undefined
): { valid: boolean; error?: string } {
  if (!sourceDocumentType || sourceDocumentType.trim() === "") {
    return {
      valid: false,
      error: "Source document type is required",
    };
  }

  if (!sourceDocumentId || sourceDocumentId <= 0) {
    return {
      valid: false,
      error: "Source document ID is required and must be positive",
    };
  }

  if (!sourceDocumentNumber || sourceDocumentNumber.trim() === "") {
    return {
      valid: false,
      error: "Source document number is required",
    };
  }

  return { valid: true };
}

/**
 * Validate complete GL journal entry
 * ENFORCEMENT: All validation rules must pass
 */
export function validateGLJournalEntry(entry: GLJournalEntry): { valid: boolean; error?: string } {
  // Validate lines
  const linesValidation = validateGLEntryLines(entry.lines);
  if (!linesValidation.valid) {
    return linesValidation;
  }

  // Validate balance
  const balanceValidation = validateJournalEntryBalance(entry.lines);
  if (!balanceValidation.valid) {
    return balanceValidation;
  }

  // Validate org + OU scoping
  const scopingValidation = validateOrgOUScoping(entry.organizationId, entry.operatingUnitId);
  if (!scopingValidation.valid) {
    return scopingValidation;
  }

  // Validate source document
  const sourceValidation = validateSourceDocument(
    entry.sourceDocumentType,
    entry.sourceDocumentId,
    entry.sourceDocumentNumber
  );
  if (!sourceValidation.valid) {
    return sourceValidation;
  }

  return { valid: true };
}

/**
 * Get GL posting configuration for financial event
 * Returns debit/credit accounts for automatic posting
 */
export function getGLPostingConfig(eventType: FinancialEventType): {
  debitAccount: string;
  creditAccount: string;
  description: string;
} | null {
  const configs: Record<
    FinancialEventType,
    { debitAccount: string; creditAccount: string; description: string }
  > = {
    invoice_approved: {
      debitAccount: "5000", // Purchases/Expenses
      creditAccount: "2000", // Accounts Payable
      description: "Invoice approved",
    },
    invoice_rejected: {
      debitAccount: "2000", // Accounts Payable
      creditAccount: "5000", // Purchases/Expenses
      description: "Invoice rejected - reversal",
    },
    payment_posted: {
      debitAccount: "2000", // Accounts Payable
      creditAccount: "1000", // Cash/Bank
      description: "Payment posted",
    },
    payment_reversed: {
      debitAccount: "1000", // Cash/Bank
      creditAccount: "2000", // Accounts Payable
      description: "Payment reversed",
    },
    expenditure_approved: {
      debitAccount: "5100", // Operating Expenses
      creditAccount: "2100", // Accrued Expenses
      description: "Expenditure approved",
    },
    expenditure_rejected: {
      debitAccount: "2100", // Accrued Expenses
      creditAccount: "5100", // Operating Expenses
      description: "Expenditure rejected - reversal",
    },
    grn_accepted: {
      debitAccount: "1200", // Inventory
      creditAccount: "2000", // Accounts Payable
      description: "GRN accepted",
    },
    po_acknowledged: {
      debitAccount: "3000", // Encumbrance
      creditAccount: "3100", // Commitment
      description: "PO acknowledged",
    },
  };

  return configs[eventType] || null;
}

/**
 * Create GL entry for financial event
 * ENFORCEMENT: Automatic posting on configured events
 */
export function createGLEntryForFinancialEvent(
  eventType: FinancialEventType,
  amount: number,
  sourceDocumentId: number,
  sourceDocumentNumber: string,
  organizationId: number,
  operatingUnitId: number,
  userId: number,
  description?: string
): GLJournalEntry | null {
  const config = getGLPostingConfig(eventType);
  if (!config) {
    return null;
  }

  const entry: GLJournalEntry = {
    entryNumber: `JE-${organizationId}-${Date.now()}`,
    entryDate: new Date(),
    description: description || config.description,
    lines: [
      {
        accountCode: config.debitAccount,
        accountName: `Account ${config.debitAccount}`,
        debitAmount: amount,
        creditAmount: 0,
        description: `${config.description} - Debit`,
      },
      {
        accountCode: config.creditAccount,
        accountName: `Account ${config.creditAccount}`,
        debitAmount: 0,
        creditAmount: amount,
        description: `${config.description} - Credit`,
      },
    ],
    organizationId,
    operatingUnitId,
    sourceDocumentType: eventType.split("_")[0], // e.g., "invoice", "payment"
    sourceDocumentId,
    sourceDocumentNumber,
    createdBy: userId,
    autoPost: true, // Automatic posting for financial events
  };

  return entry;
}

/**
 * Validate GL entry before posting
 * ENFORCEMENT: All rules must pass before posting
 */
export async function validateGLEntryBeforePosting(
  entry: GLJournalEntry
): Promise<{ valid: boolean; error?: string }> {
  // Validate complete entry
  const validation = validateGLJournalEntry(entry);
  if (!validation.valid) {
    return validation;
  }

  // Additional validation for posting
  if (!entry.entryNumber || entry.entryNumber.trim() === "") {
    return {
      valid: false,
      error: "Entry number is required",
    };
  }

  if (!entry.entryDate) {
    return {
      valid: false,
      error: "Entry date is required",
    };
  }

  if (!entry.createdBy || entry.createdBy <= 0) {
    return {
      valid: false,
      error: "Creator user ID is required",
    };
  }

  return { valid: true };
}

/**
 * Create reversing entry for GL entry
 * ENFORCEMENT: Reversing entries must link to original
 */
export function createReversingEntry(
  originalEntry: GLJournalEntry,
  reversalDate: Date,
  reason: string,
  userId: number
): GLJournalEntry {
  const reversingLines = originalEntry.lines.map((line) => ({
    ...line,
    debitAmount: line.creditAmount, // Swap debit/credit
    creditAmount: line.debitAmount,
    description: `Reversal: ${line.description}`,
  }));

  return {
    entryNumber: `JE-REV-${originalEntry.organizationId}-${Date.now()}`,
    entryDate: reversalDate,
    description: `Reversal of ${originalEntry.entryNumber}: ${reason}`,
    lines: reversingLines,
    organizationId: originalEntry.organizationId,
    operatingUnitId: originalEntry.operatingUnitId,
    sourceDocumentType: originalEntry.sourceDocumentType,
    sourceDocumentId: originalEntry.sourceDocumentId,
    sourceDocumentNumber: `${originalEntry.sourceDocumentNumber}-REV`,
    createdBy: userId,
    autoPost: true,
  };
}

/**
 * Check if GL entry can be reversed
 */
export function canReverseGLEntry(entryStatus: string): boolean {
  return entryStatus === "posted";
}
