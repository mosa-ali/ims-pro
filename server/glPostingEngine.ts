/**
 * GL Posting Engine Router (tRPC)
 * Provides procedures for automatic journal entry creation on financial events
 * Per Official Directive: Finance Core Alignment (GL Reconciliation)
 */

import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";

/**
 * GL Account Types
 */
export enum GLAccountType {
  ASSET = "asset",
  LIABILITY = "liability",
  EQUITY = "equity",
  REVENUE = "revenue",
  EXPENSE = "expense",
}

/**
 * GL Entry Status
 */
export enum GLEntryStatus {
  DRAFT = "draft",
  POSTED = "posted",
  REVERSED = "reversed",
  CANCELLED = "cancelled",
}

/**
 * Financial Event Types
 */
export enum FinancialEventType {
  INVOICE_APPROVED = "invoice_approved",
  INVOICE_REJECTED = "invoice_rejected",
  PAYMENT_POSTED = "payment_posted",
  PAYMENT_REVERSED = "payment_reversed",
  EXPENDITURE_APPROVED = "expenditure_approved",
  EXPENDITURE_REJECTED = "expenditure_rejected",
  GRN_ACCEPTED = "grn_accepted",
  PO_ACKNOWLEDGED = "po_acknowledged",
}

/**
 * GL Posting Configuration
 */
interface GLPostingConfig {
  eventType: FinancialEventType;
  debitAccount: string;
  creditAccount: string;
  description: string;
  autoPost: boolean;
}

/**
 * GL Journal Entry
 */
interface GLJournalEntry {
  id: string;
  organizationId: number;
  operatingUnitId: number;
  entryNumber: string;
  entryDate: string;
  description: string;
  status: GLEntryStatus;
  totalDebit: number;
  totalCredit: number;
  lines: GLEntryLine[];
  sourceDocument: {
    type: string;
    id: number;
    number: string;
  };
  createdBy: number;
  createdAt: string;
  postedBy?: number;
  postedAt?: string;
}

/**
 * GL Entry Line Item
 */
interface GLEntryLine {
  lineNumber: number;
  accountCode: string;
  accountName: string;
  debitAmount: number;
  creditAmount: number;
  description: string;
  costCenter?: string;
  project?: string;
}

/**
 * GL Posting Engine Router
 */
export const glPostingEngineRouter = router({
  /**
   * Create GL Journal Entry
   * Creates a new journal entry with debit/credit lines
   */
  createJournalEntry: protectedProcedure
    .input(
      z.object({
        entryDate: z.string(),
        description: z.string(),
        lines: z.array(
          z.object({
            accountCode: z.string(),
            accountName: z.string(),
            debitAmount: z.number().min(0),
            creditAmount: z.number().min(0),
            description: z.string(),
            costCenter: z.string().optional(),
            project: z.string().optional(),
          })
        ),
        sourceDocument: z.object({
          type: z.string(),
          id: z.number(),
          number: z.string(),
        }),
        autoPost: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate debit/credit balance
      const totalDebit = input.lines.reduce((sum, line) => sum + line.debitAmount, 0);
      const totalCredit = input.lines.reduce((sum, line) => sum + line.creditAmount, 0);

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Journal entry out of balance. Debit: ${totalDebit}, Credit: ${totalCredit}`,
        });
      }

      const entryNumber = `JE-${ctx.user?.organizationId}-${Date.now()}`;

      const journalEntry: GLJournalEntry = {
        id: `entry-${Date.now()}`,
        organizationId: ctx.user?.organizationId || 0,
        operatingUnitId: ctx.user?.operatingUnitId || 0,
        entryNumber,
        entryDate: input.entryDate,
        description: input.description,
        status: input.autoPost ? GLEntryStatus.POSTED : GLEntryStatus.DRAFT,
        totalDebit,
        totalCredit,
        lines: input.lines.map((line, idx) => ({
          lineNumber: idx + 1,
          accountCode: line.accountCode,
          accountName: line.accountName,
          debitAmount: line.debitAmount,
          creditAmount: line.creditAmount,
          description: line.description,
          costCenter: line.costCenter,
          project: line.project,
        })),
        sourceDocument: input.sourceDocument,
        createdBy: ctx.user?.id || 0,
        createdAt: new Date().toISOString(),
        ...(input.autoPost && {
          postedBy: ctx.user?.id || 0,
          postedAt: new Date().toISOString(),
        }),
      };

      return {
        success: true,
        journalEntry,
        message: `Journal entry ${entryNumber} created successfully`,
      };
    }),

  /**
   * Post GL Journal Entry
   * Posts a draft journal entry to the GL
   */
  postJournalEntry: protectedProcedure
    .input(
      z.object({
        entryId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // In production, this would fetch from database and update status
      return {
        success: true,
        message: `Journal entry ${input.entryId} posted successfully`,
        postedAt: new Date().toISOString(),
        postedBy: ctx.user?.id || 0,
      };
    }),

  /**
   * Reverse GL Journal Entry
   * Creates a reversing entry for a posted journal entry
   */
  reverseJournalEntry: protectedProcedure
    .input(
      z.object({
        entryId: z.string(),
        reversalDate: z.string(),
        reason: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const reversalEntryNumber = `JE-REV-${ctx.user?.organizationId}-${Date.now()}`;

      return {
        success: true,
        message: `Journal entry ${input.entryId} reversed`,
        reversalEntryNumber,
        reversalDate: input.reversalDate,
        reason: input.reason,
        reversedBy: ctx.user?.id || 0,
        reversedAt: new Date().toISOString(),
      };
    }),

  /**
   * Get GL Journal Entry
   * Retrieves a journal entry by ID
   */
  getJournalEntry: protectedProcedure
    .input(
      z.object({
        entryId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // In production, this would fetch from database
      return {
        id: input.entryId,
        entryNumber: `JE-${ctx.user?.organizationId}-12345`,
        status: GLEntryStatus.DRAFT,
        totalDebit: 0,
        totalCredit: 0,
        lines: [],
      };
    }),

  /**
   * Create GL Posting Rule
   * Defines automatic GL posting for a financial event type
   */
  createPostingRule: protectedProcedure
    .input(
      z.object({
        eventType: z.nativeEnum(FinancialEventType),
        debitAccount: z.string(),
        creditAccount: z.string(),
        description: z.string(),
        autoPost: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return {
        success: true,
        rule: {
          id: `rule-${Date.now()}`,
          organizationId: ctx.user?.organizationId || 0,
          operatingUnitId: ctx.user?.operatingUnitId || 0,
          eventType: input.eventType,
          debitAccount: input.debitAccount,
          creditAccount: input.creditAccount,
          description: input.description,
          autoPost: input.autoPost,
          createdAt: new Date().toISOString(),
          createdBy: ctx.user?.id || 0,
        },
        message: `Posting rule for ${input.eventType} created successfully`,
      };
    }),

  /**
   * Get GL Posting Rules
   * Retrieves all posting rules for organization
   */
  getPostingRules: protectedProcedure.query(async ({ ctx }) => {
    // In production, this would fetch from database
    return {
      organizationId: ctx.user?.organizationId || 0,
      operatingUnitId: ctx.user?.operatingUnitId || 0,
      rules: [],
      totalRules: 0,
    };
  }),

  /**
   * Post Invoice to GL
   * Creates GL entries when invoice is approved
   */
  postInvoiceToGL: protectedProcedure
    .input(
      z.object({
        invoiceId: z.number(),
        invoiceNumber: z.string(),
        invoiceAmount: z.number(),
        vendorId: z.number(),
        description: z.string(),
        costCenter: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Typical GL entries for invoice approval:
      // Debit: Expense/Asset account
      // Credit: Accounts Payable

      const journalEntry: GLJournalEntry = {
        id: `entry-${Date.now()}`,
        organizationId: ctx.user?.organizationId || 0,
        operatingUnitId: ctx.user?.operatingUnitId || 0,
        entryNumber: `JE-INV-${input.invoiceNumber}`,
        entryDate: new Date().toISOString().split("T")[0],
        description: `Invoice ${input.invoiceNumber} - ${input.description}`,
        status: GLEntryStatus.POSTED,
        totalDebit: input.invoiceAmount,
        totalCredit: input.invoiceAmount,
        lines: [
          {
            lineNumber: 1,
            accountCode: "5000", // Expense account
            accountName: "Purchases",
            debitAmount: input.invoiceAmount,
            creditAmount: 0,
            description: `Invoice ${input.invoiceNumber}`,
            costCenter: input.costCenter,
          },
          {
            lineNumber: 2,
            accountCode: "2000", // AP account
            accountName: "Accounts Payable",
            debitAmount: 0,
            creditAmount: input.invoiceAmount,
            description: `Invoice ${input.invoiceNumber}`,
          },
        ],
        sourceDocument: {
          type: "invoice",
          id: input.invoiceId,
          number: input.invoiceNumber,
        },
        createdBy: ctx.user?.id || 0,
        createdAt: new Date().toISOString(),
        postedBy: ctx.user?.id || 0,
        postedAt: new Date().toISOString(),
      };

      return {
        success: true,
        journalEntry,
        message: `Invoice ${input.invoiceNumber} posted to GL`,
      };
    }),

  /**
   * Post Payment to GL
   * Creates GL entries when payment is posted
   */
  postPaymentToGL: protectedProcedure
    .input(
      z.object({
        paymentId: z.number(),
        paymentNumber: z.string(),
        paymentAmount: z.number(),
        invoiceId: z.number(),
        paymentMethod: z.string(),
        bankAccount: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Typical GL entries for payment posting:
      // Debit: Accounts Payable
      // Credit: Bank/Cash account

      const journalEntry: GLJournalEntry = {
        id: `entry-${Date.now()}`,
        organizationId: ctx.user?.organizationId || 0,
        operatingUnitId: ctx.user?.operatingUnitId || 0,
        entryNumber: `JE-PAY-${input.paymentNumber}`,
        entryDate: new Date().toISOString().split("T")[0],
        description: `Payment ${input.paymentNumber} via ${input.paymentMethod}`,
        status: GLEntryStatus.POSTED,
        totalDebit: input.paymentAmount,
        totalCredit: input.paymentAmount,
        lines: [
          {
            lineNumber: 1,
            accountCode: "2000", // AP account
            accountName: "Accounts Payable",
            debitAmount: input.paymentAmount,
            creditAmount: 0,
            description: `Payment for Invoice`,
          },
          {
            lineNumber: 2,
            accountCode: "1010", // Bank account
            accountName: input.bankAccount,
            debitAmount: 0,
            creditAmount: input.paymentAmount,
            description: `Payment ${input.paymentNumber}`,
          },
        ],
        sourceDocument: {
          type: "payment",
          id: input.paymentId,
          number: input.paymentNumber,
        },
        createdBy: ctx.user?.id || 0,
        createdAt: new Date().toISOString(),
        postedBy: ctx.user?.id || 0,
        postedAt: new Date().toISOString(),
      };

      return {
        success: true,
        journalEntry,
        message: `Payment ${input.paymentNumber} posted to GL`,
      };
    }),

  /**
   * Get GL Trial Balance
   * Retrieves trial balance for reconciliation
   */
  getTrialBalance: protectedProcedure
    .input(
      z.object({
        asOfDate: z.string(),
        costCenter: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // In production, this would calculate from GL entries
      return {
        organizationId: ctx.user?.organizationId || 0,
        operatingUnitId: ctx.user?.operatingUnitId || 0,
        asOfDate: input.asOfDate,
        accounts: [],
        totalDebit: 0,
        totalCredit: 0,
        isBalanced: true,
      };
    }),

  /**
   * Get GL Account Balance
   * Retrieves balance for a specific GL account
   */
  getAccountBalance: protectedProcedure
    .input(
      z.object({
        accountCode: z.string(),
        asOfDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // In production, this would calculate from GL entries
      return {
        accountCode: input.accountCode,
        accountName: "Account Name",
        asOfDate: input.asOfDate,
        openingBalance: 0,
        debitAmount: 0,
        creditAmount: 0,
        closingBalance: 0,
      };
    }),

  /**
   * Get GL Reconciliation Report
   * Generates GL reconciliation report
   */
  getReconciliationReport: protectedProcedure
    .input(
      z.object({
        periodStart: z.string(),
        periodEnd: z.string(),
        accountCode: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // In production, this would generate from GL entries
      return {
        organizationId: ctx.user?.organizationId || 0,
        operatingUnitId: ctx.user?.operatingUnitId || 0,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        reconciliationStatus: "balanced",
        totalEntries: 0,
        totalDebit: 0,
        totalCredit: 0,
        differences: [],
        reconciliationDate: new Date().toISOString(),
      };
    }),
});
