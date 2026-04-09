/**
 * Bank Statement Import Router
 * 
 * Handles bank statement file uploads, parsing, and transaction import
 */

import { router, protectedProcedure, scopedProcedure } from "./_core/trpc";
import { z } from "zod";
import { parseBankStatement, previewBankStatement, type ColumnMapping } from "./services/bankStatementParser";
import { getDb } from "./db";
import { bankTransactions, bankReconciliations } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

export const bankStatementImportRouter = router({
  /**
   * Preview bank statement file
   * Returns headers, sample rows, and detected column mappings
   */
  preview: scopedProcedure
    .input(z.object({
      fileData: z.string(), // base64 encoded file
      fileName: z.string(),
      rowCount: z.number().default(10),
    }))
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.fileData, 'base64');
      const result = await previewBankStatement(buffer, input.fileName, input.rowCount);
      
      return {
        success: result.success,
        headers: result.headers,
        rows: result.rows,
        detectedColumns: result.detectedColumns,
        errors: result.errors,
      };
    }),

  /**
   * Parse and import bank statement
   * Creates bank transactions and optionally starts reconciliation
   */
  import: scopedProcedure
    .input(z.object({
      bankAccountId: z.number(),
      fileData: z.string(), // base64 encoded file
      fileName: z.string(),
      columnMapping: z.object({
        date: z.string(),
        description: z.string(),
        reference: z.string().optional(),
        debit: z.string(),
        credit: z.string(),
        balance: z.string().optional(),
      }),
      startReconciliation: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      
      // Parse the file
      const buffer = Buffer.from(input.fileData, 'base64');
      const parseResult = await parseBankStatement(
        buffer,
        input.fileName,
        input.columnMapping as ColumnMapping
      );
      
      if (!parseResult.success) {
        return {
          success: false,
          errors: parseResult.errors,
          imported: 0,
          duplicates: 0,
        };
      }
      
      // Check for duplicates
      const existingTransactions = await db
        .select({ reference: bankTransactions.referenceNumber })
        .from(bankTransactions)
        .where(
          and(
            eq(bankTransactions.organizationId, organizationId),
            eq(bankTransactions.bankAccountId, input.bankAccountId)
          )
        );
      
      const existingRefs = new Set(
        existingTransactions.map(t => t.reference).filter(Boolean)
      );
      
      let imported = 0;
      let duplicates = 0;
      const errors: string[] = [];
      
      // Import transactions
      for (const transaction of parseResult.transactions) {
        try {
          // Skip duplicates if reference exists
          if (transaction.reference && existingRefs.has(transaction.reference)) {
            duplicates++;
            continue;
          }
          
          // Determine transaction type
          const amount = transaction.debit > 0 ? transaction.debit : transaction.credit;
          const transactionType = transaction.debit > 0 ? 'debit' : 'credit';
          
          await db.insert(bankTransactions).values({
            organizationId,
            operatingUnitId,
            bankAccountId: input.bankAccountId,
            transactionDate: transaction.date!,
            referenceNumber: transaction.reference || null,
            description: transaction.description,
            transactionType: transactionType as 'debit' | 'credit',
            amount,
            runningBalance: transaction.balance,
            status: 'unreconciled' as const,
            source: 'import' as const,
            importFileName: input.fileName,
            createdBy: ctx.user.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          
          imported++;
        } catch (err) {
          errors.push(
            `Failed to import transaction: ${transaction.description} - ${
              err instanceof Error ? err.message : 'Unknown error'
            }`
          );
        }
      }
      
      // Create reconciliation session if requested
      let reconciliationId: number | null = null;
      if (input.startReconciliation && imported > 0) {
        try {
          const result = await db.insert(bankReconciliations).values({
            organizationId,
            operatingUnitId,
            bankAccountId: input.bankAccountId,
            reconciliationDate: new Date(),
            status: 'in_progress' as const,
            statementStartDate: parseResult.transactions[0]?.date || new Date(),
            statementEndDate: parseResult.transactions[parseResult.transactions.length - 1]?.date || new Date(),
            statementEndingBalance: parseResult.transactions[parseResult.transactions.length - 1]?.balance || null,
            createdBy: ctx.user.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          
          reconciliationId = result[0].insertId;
        } catch (err) {
          errors.push(
            `Failed to create reconciliation session: ${
              err instanceof Error ? err.message : 'Unknown error'
            }`
          );
        }
      }
      
      return {
        success: imported > 0,
        imported,
        duplicates,
        errors: [...parseResult.errors, ...errors],
        reconciliationId,
      };
    }),

  /**
   * Get import history
   */
  getImportHistory: scopedProcedure
    .input(z.object({
      bankAccountId: z.number().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      
      const conditions = [
        eq(bankTransactions.organizationId, organizationId),
        eq(bankTransactions.source, 'import'),
      ];
      
      if (input.bankAccountId) {
        conditions.push(eq(bankTransactions.bankAccountId, input.bankAccountId));
      }
      
      // Get unique import file names with counts
      const imports = await db
        .select({
          fileName: bankTransactions.importFileName,
          count: sql<number>`count(*)`,
          minDate: sql<Date>`min(${bankTransactions.transactionDate})`,
          maxDate: sql<Date>`max(${bankTransactions.transactionDate})`,
          totalAmount: sql<number>`sum(${bankTransactions.amount})`,
        })
        .from(bankTransactions)
        .where(and(...conditions))
        .groupBy(bankTransactions.importFileName)
        .orderBy(sql`max(${bankTransactions.createdAt}) desc`)
        .limit(input.limit)
        .offset(input.offset);
      
      return { imports };
    }),
});

export type BankStatementImportRouter = typeof bankStatementImportRouter;
