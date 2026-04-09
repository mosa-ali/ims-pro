/**
 * Automated Journal Entry Service
 * 
 * Automatically generates GL journal entries when financial transactions are approved.
 * Implements double-entry bookkeeping rules for:
 * - Expense approvals
 * - Payment processing
 * - Advance disbursements
 * 
 * Each transaction type follows standard accounting principles:
 * - Expense Approval: Debit Expense Account, Credit Accounts Payable
 * - Payment Processing: Debit Accounts Payable, Credit Cash/Bank Account
 * - Advance Disbursement: Debit Advances to Staff, Credit Cash/Bank Account
 */

import { getDb } from "../db";
import { journalEntries, journalLines, glAccounts } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

interface JournalEntryLine {
  glAccountId: number;
  description: string;
  descriptionAr?: string;
  debitAmount: string;
  creditAmount: string;
  projectId?: number;
  grantId?: number;
  budgetLineId?: number;
  reference?: string;
}

interface CreateJournalEntryParams {
  organizationId: number;
  operatingUnitId?: number;
  entryDate: Date;
  sourceModule: 'expense' | 'advance' | 'settlement' | 'cash_transaction';
  sourceDocumentId: number;
  sourceDocumentType: string;
  description: string;
  descriptionAr?: string;
  lines: JournalEntryLine[];
  projectId?: number;
  grantId?: number;
  fiscalYearId?: number;
  fiscalPeriodId?: number;
  createdBy: string;
}

/**
 * Generate next journal entry number
 * Format: JE-YYYY-NNNNNN (e.g., JE-2026-000001)
 */
async function generateEntryNumber(organizationId: number, year: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.organizationId, organizationId))
    .orderBy(journalEntries.id);

  const yearPrefix = `JE-${year}-`;
  const existingNumbers = result
    .map(e => e.entryNumber)
    .filter(n => n.startsWith(yearPrefix))
    .map(n => parseInt(n.split('-')[2]))
    .filter(n => !isNaN(n));

  const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
  const nextNumber = maxNumber + 1;

  return `${yearPrefix}${nextNumber.toString().padStart(6, '0')}`;
}

/**
 * Validate journal entry lines (debit = credit)
 */
function validateLines(lines: JournalEntryLine[]): { valid: boolean; totalDebit: number; totalCredit: number; error?: string } {
  if (lines.length === 0) {
    return { valid: false, totalDebit: 0, totalCredit: 0, error: "Journal entry must have at least one line" };
  }

  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of lines) {
    const debit = parseFloat(line.debitAmount || '0');
    const credit = parseFloat(line.creditAmount || '0');

    if (debit < 0 || credit < 0) {
      return { valid: false, totalDebit: 0, totalCredit: 0, error: "Debit and credit amounts must be non-negative" };
    }

    if (debit > 0 && credit > 0) {
      return { valid: false, totalDebit: 0, totalCredit: 0, error: "A line cannot have both debit and credit amounts" };
    }

    if (debit === 0 && credit === 0) {
      return { valid: false, totalDebit: 0, totalCredit: 0, error: "A line must have either debit or credit amount" };
    }

    totalDebit += debit;
    totalCredit += credit;
  }

  // Allow small rounding differences (0.01)
  const difference = Math.abs(totalDebit - totalCredit);
  if (difference > 0.01) {
    return { 
      valid: false, 
      totalDebit, 
      totalCredit, 
      error: `Debit (${totalDebit.toFixed(2)}) must equal Credit (${totalCredit.toFixed(2)}). Difference: ${difference.toFixed(2)}` 
    };
  }

  return { valid: true, totalDebit, totalCredit };
}

/**
 * Create automated journal entry
 * Returns the created journal entry ID
 */
export async function createAutoJournalEntry(params: CreateJournalEntryParams): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Validate lines
  const validation = validateLines(params.lines);
  if (!validation.valid) {
    throw new TRPCError({ 
      code: "BAD_REQUEST", 
      message: `Invalid journal entry: ${validation.error}` 
    });
  }

  // Generate entry number
  const entryYear = params.entryDate.getFullYear();
  const entryNumber = await generateEntryNumber(params.organizationId, entryYear);

  // Create journal entry header
  const entryResult = await db.insert(journalEntries).values({
    organizationId: params.organizationId,
    operatingUnitId: params.operatingUnitId,
    entryNumber,
    entryDate: params.entryDate,
    fiscalYearId: params.fiscalYearId,
    fiscalPeriodId: params.fiscalPeriodId,
    entryType: 'standard',
    sourceModule: params.sourceModule,
    sourceDocumentId: params.sourceDocumentId,
    sourceDocumentType: params.sourceDocumentType,
    description: params.description,
    descriptionAr: params.descriptionAr,
    totalDebit: validation.totalDebit.toFixed(2),
    totalCredit: validation.totalCredit.toFixed(2),
    projectId: params.projectId,
    grantId: params.grantId,
    status: 'posted', // Auto-generated entries are immediately posted
    postedAt: new Date(),
    postedBy: params.createdBy,
    createdBy: params.createdBy,
  });

  const journalEntryId = (entryResult as any).insertId;

  // Create journal lines
  const lineValues = params.lines.map((line, index) => ({
    organizationId: params.organizationId,
    journalEntryId,
    lineNumber: index + 1,
    glAccountId: line.glAccountId,
    description: line.description,
    descriptionAr: line.descriptionAr,
    debitAmount: line.debitAmount,
    creditAmount: line.creditAmount,
    projectId: line.projectId || params.projectId,
    grantId: line.grantId || params.grantId,
    budgetLineId: line.budgetLineId,
    reference: line.reference,
  }));

  await db.insert(journalLines).values(lineValues);

  return journalEntryId;
}

/**
 * Get GL account by code
 */
async function getGLAccountByCode(organizationId: number, accountCode: string): Promise<number | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [account] = await db
    .select()
    .from(glAccounts)
    .where(and(
      eq(glAccounts.organizationId, organizationId),
      eq(glAccounts.accountCode, accountCode),
      eq(glAccounts.isDeleted, false)
    ))
    .limit(1);

  return account?.id || null;
}

/**
 * Generate journal entry for expense approval
 * Debit: Expense Account (from expenditure.glAccountId or default)
 * Credit: Accounts Payable (2100)
 */
export async function generateExpenseJournalEntry(
  expenditure: any,
  userId: string
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get expense GL account
  const expenseAccountId = expenditure.glAccountId;
  if (!expenseAccountId) {
    throw new TRPCError({ 
      code: "BAD_REQUEST", 
      message: "Expenditure must have a GL account assigned" 
    });
  }

  // Get Accounts Payable account (2100)
  const accountsPayableId = await getGLAccountByCode(expenditure.organizationId, '2100');
  if (!accountsPayableId) {
    throw new TRPCError({ 
      code: "BAD_REQUEST", 
      message: "Accounts Payable account (2100) not found in Chart of Accounts" 
    });
  }

  const amount = expenditure.amount;
  const description = `Expense: ${expenditure.description || expenditure.vendorName}`;
  const descriptionAr = expenditure.descriptionAr || `مصروف: ${expenditure.vendorNameAr || expenditure.vendorName}`;

  return await createAutoJournalEntry({
    organizationId: expenditure.organizationId,
    operatingUnitId: expenditure.operatingUnitId,
    entryDate: new Date(expenditure.expenditureDate),
    sourceModule: 'expense',
    sourceDocumentId: expenditure.id,
    sourceDocumentType: 'expenditure',
    description,
    descriptionAr,
    projectId: expenditure.projectId,
    grantId: expenditure.grantId,
    fiscalYearId: expenditure.fiscalYearId,
    fiscalPeriodId: expenditure.fiscalPeriodId,
    lines: [
      {
        glAccountId: expenseAccountId,
        description: `Expense - ${expenditure.vendorName}`,
        descriptionAr: `مصروف - ${expenditure.vendorNameAr || expenditure.vendorName}`,
        debitAmount: amount,
        creditAmount: '0.00',
        projectId: expenditure.projectId,
        grantId: expenditure.grantId,
        budgetLineId: expenditure.budgetLineId,
        reference: expenditure.expenditureNumber,
      },
      {
        glAccountId: accountsPayableId,
        description: `Accounts Payable - ${expenditure.vendorName}`,
        descriptionAr: `حسابات مستحقة الدفع - ${expenditure.vendorNameAr || expenditure.vendorName}`,
        debitAmount: '0.00',
        creditAmount: amount,
        projectId: expenditure.projectId,
        grantId: expenditure.grantId,
        reference: expenditure.expenditureNumber,
      },
    ],
    createdBy: userId,
  });
}

/**
 * Generate journal entry for payment processing
 * Debit: Accounts Payable (2100)
 * Credit: Cash/Bank Account (from payment.bankAccountId or default Cash 1010)
 */
export async function generatePaymentJournalEntry(
  payment: any,
  userId: string
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get Accounts Payable account (2100)
  const accountsPayableId = await getGLAccountByCode(payment.organizationId, '2100');
  if (!accountsPayableId) {
    throw new TRPCError({ 
      code: "BAD_REQUEST", 
      message: "Accounts Payable account (2100) not found in Chart of Accounts" 
    });
  }

  // Get Cash/Bank account (default to Cash on Hand 1010 if no bank account specified)
  let cashAccountId: number | null = null;
  
  if (payment.bankAccountId) {
    // TODO: Get GL account from bank account mapping
    // For now, use default Cash on Hand
    cashAccountId = await getGLAccountByCode(payment.organizationId, '1010');
  } else {
    cashAccountId = await getGLAccountByCode(payment.organizationId, '1010');
  }

  if (!cashAccountId) {
    throw new TRPCError({ 
      code: "BAD_REQUEST", 
      message: "Cash account (1010) not found in Chart of Accounts" 
    });
  }

  const amount = payment.amount;
  const description = `Payment: ${payment.description || payment.paymentNumber}`;
  const descriptionAr = payment.descriptionAr || `دفع: ${payment.paymentNumber}`;

  return await createAutoJournalEntry({
    organizationId: payment.organizationId,
    operatingUnitId: payment.operatingUnitId,
    entryDate: payment.paymentDate ? new Date(payment.paymentDate) : new Date(),
    sourceModule: 'cash_transaction',
    sourceDocumentId: payment.id,
    sourceDocumentType: 'payment',
    description,
    descriptionAr,
    projectId: payment.projectId,
    grantId: payment.grantId,
    lines: [
      {
        glAccountId: accountsPayableId,
        description: `Payment - ${payment.paymentNumber}`,
        descriptionAr: `دفع - ${payment.paymentNumber}`,
        debitAmount: amount,
        creditAmount: '0.00',
        projectId: payment.projectId,
        grantId: payment.grantId,
        reference: payment.paymentNumber,
      },
      {
        glAccountId: cashAccountId,
        description: `Cash/Bank - ${payment.paymentNumber}`,
        descriptionAr: `نقد/بنك - ${payment.paymentNumber}`,
        debitAmount: '0.00',
        creditAmount: amount,
        projectId: payment.projectId,
        grantId: payment.grantId,
        reference: payment.paymentNumber,
      },
    ],
    createdBy: userId,
  });
}

/**
 * Generate journal entry for advance disbursement
 * Debit: Advances to Staff (1310)
 * Credit: Cash/Bank Account (1010 or from bank account)
 */
export async function generateAdvanceJournalEntry(
  advance: any,
  userId: string
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get Advances to Staff account (1310)
  const advancesAccountId = await getGLAccountByCode(advance.organizationId, '1310');
  if (!advancesAccountId) {
    throw new TRPCError({ 
      code: "BAD_REQUEST", 
      message: "Advances to Staff account (1310) not found in Chart of Accounts" 
    });
  }

  // Get Cash/Bank account (default to Cash on Hand 1010)
  const cashAccountId = await getGLAccountByCode(advance.organizationId, '1010');
  if (!cashAccountId) {
    throw new TRPCError({ 
      code: "BAD_REQUEST", 
      message: "Cash account (1010) not found in Chart of Accounts" 
    });
  }

  const amount = advance.advanceAmount;
  const description = `Advance: ${advance.purpose || advance.advanceNumber}`;
  const descriptionAr = advance.purposeAr || `سلفة: ${advance.advanceNumber}`;

  return await createAutoJournalEntry({
    organizationId: advance.organizationId,
    operatingUnitId: advance.operatingUnitId,
    entryDate: new Date(advance.advanceDate),
    sourceModule: 'advance',
    sourceDocumentId: advance.id,
    sourceDocumentType: 'advance',
    description,
    descriptionAr,
    projectId: advance.projectId,
    grantId: advance.grantId,
    lines: [
      {
        glAccountId: advancesAccountId,
        description: `Advance - ${advance.advanceNumber}`,
        descriptionAr: `سلفة - ${advance.advanceNumber}`,
        debitAmount: amount,
        creditAmount: '0.00',
        projectId: advance.projectId,
        grantId: advance.grantId,
        reference: advance.advanceNumber,
      },
      {
        glAccountId: cashAccountId,
        description: `Cash/Bank - ${advance.advanceNumber}`,
        descriptionAr: `نقد/بنك - ${advance.advanceNumber}`,
        debitAmount: '0.00',
        creditAmount: amount,
        projectId: advance.projectId,
        grantId: advance.grantId,
        reference: advance.advanceNumber,
      },
    ],
    createdBy: userId,
  });
}
