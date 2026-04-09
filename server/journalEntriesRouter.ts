/**
 * Journal Entries Router
 * Handles General Ledger journal entries with double-entry bookkeeping
 */

import { router, protectedProcedure, scopedProcedure } from './_core/trpc';
import { z } from 'zod';
import { getDb } from './db';
import { journalEntries, journalLines, glAccounts } from '../drizzle/schema';
import { eq, and, desc, sql, isNull, gte, lte, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const journalEntriesRouter = router({
  // List journal entries
  list: scopedProcedure
    .input(
      z.object({
        status: z.enum(['draft', 'posted', 'reversed', 'void']).optional(),
        entryType: z.enum(['standard', 'adjusting', 'closing', 'reversing', 'opening']).optional(),
        sourceModule: z.enum(['manual', 'expense', 'advance', 'settlement', 'cash_transaction', 'asset', 'payroll', 'procurement', 'budget']).optional(),
        projectId: z.number().optional(),
        grantId: z.number().optional(),
        fiscalYearId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const conditions = [
        eq(journalEntries.organizationId, organizationId),
        isNull(journalEntries.deletedAt),
      ];

      if (operatingUnitId) {
        conditions.push(eq(journalEntries.operatingUnitId, operatingUnitId));
      }
      if (input.status) {
        conditions.push(eq(journalEntries.status, input.status));
      }
      if (input.entryType) {
        conditions.push(eq(journalEntries.entryType, input.entryType));
      }
      if (input.sourceModule) {
        conditions.push(eq(journalEntries.sourceModule, input.sourceModule));
      }
      if (input.projectId) {
        conditions.push(eq(journalEntries.projectId, input.projectId));
      }
      if (input.grantId) {
        conditions.push(eq(journalEntries.grantId, input.grantId));
      }
      if (input.fiscalYearId) {
        conditions.push(eq(journalEntries.fiscalYearId, input.fiscalYearId));
      }
      if (input.startDate) {
        conditions.push(gte(journalEntries.entryDate, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(journalEntries.entryDate, new Date(input.endDate)));
      }

      const entries = await db
        .select()
        .from(journalEntries)
        .where(and(...conditions))
        .orderBy(desc(journalEntries.entryDate), desc(journalEntries.entryNumber))
        .limit(input.limit)
        .offset(input.offset);

      return entries;
    }),

  // Get journal entry by ID with lines
  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const entry = await db
        .select()
        .from(journalEntries)
        .where(and(
          eq(journalEntries.id, input.id),
          eq(journalEntries.organizationId, organizationId),
          isNull(journalEntries.deletedAt)
        ))
        .limit(1);

      if (!entry.length) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Journal entry not found' });
      }

      const lines = await db
        .select({
          id: journalLines.id,
          lineNumber: journalLines.lineNumber,
          glAccountId: journalLines.glAccountId,
          glAccountCode: glAccounts.accountCode,
          glAccountName: glAccounts.accountName,
          glAccountNameAr: glAccounts.accountNameAr,
          description: journalLines.description,
          descriptionAr: journalLines.descriptionAr,
          debitAmount: journalLines.debitAmount,
          creditAmount: journalLines.creditAmount,
          projectId: journalLines.projectId,
          grantId: journalLines.grantId,
          activityId: journalLines.activityId,
          budgetLineId: journalLines.budgetLineId,
          costCenterId: journalLines.costCenterId,
          vendorId: journalLines.vendorId,
        })
        .from(journalLines)
        .leftJoin(glAccounts, eq(journalLines.glAccountId, glAccounts.id))
        .where(eq(journalLines.journalEntryId, input.id))
        .orderBy(journalLines.lineNumber);

      return {
        ...entry[0],
        lines,
      };
    }),

  // Create journal entry
  create: scopedProcedure
    .input(
      z.object({
        entryDate: z.string(),
        fiscalYearId: z.number().optional(),
        fiscalPeriodId: z.number().optional(),
        entryType: z.enum(['standard', 'adjusting', 'closing', 'reversing', 'opening']).default('standard'),
        sourceModule: z.enum(['manual', 'expense', 'advance', 'settlement', 'cash_transaction', 'asset', 'payroll', 'procurement', 'budget']).default('manual'),
        sourceDocumentId: z.number().optional(),
        sourceDocumentType: z.string().optional(),
        description: z.string(),
        descriptionAr: z.string().optional(),
        projectId: z.number().optional(),
        grantId: z.number().optional(),
        lines: z.array(
          z.object({
            lineNumber: z.number(),
            glAccountId: z.number(),
            description: z.string().optional(),
            descriptionAr: z.string().optional(),
            debitAmount: z.string().default('0.00'),
            creditAmount: z.string().default('0.00'),
            projectId: z.number().optional(),
            grantId: z.number().optional(),
            activityId: z.number().optional(),
            budgetLineId: z.number().optional(),
            costCenterId: z.number().optional(),
            vendorId: z.number().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Validate debits = credits
      const totalDebit = input.lines.reduce((sum, line) => sum + parseFloat(line.debitAmount), 0);
      const totalCredit = input.lines.reduce((sum, line) => sum + parseFloat(line.creditAmount), 0);

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Journal entry must balance. Debits: ${totalDebit.toFixed(2)}, Credits: ${totalCredit.toFixed(2)}`,
        });
      }

      // Generate entry number (JE-YYYY-NNNNNN)
      const year = new Date(input.entryDate).getFullYear();
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(journalEntries)
        .where(eq(journalEntries.organizationId, organizationId));
      const count = countResult[0]?.count || 0;
      const entryNumber = `JE-${year}-${String(count + 1).padStart(6, '0')}`;

      // Insert journal entry header
      const [result] = await db.insert(journalEntries).values({
        organizationId,
        operatingUnitId: operatingUnitId || null,
        entryNumber,
        entryDate: new Date(input.entryDate),
        fiscalYearId: input.fiscalYearId || null,
        fiscalPeriodId: input.fiscalPeriodId || null,
        entryType: input.entryType,
        sourceModule: input.sourceModule,
        sourceDocumentId: input.sourceDocumentId || null,
        sourceDocumentType: input.sourceDocumentType || null,
        description: input.description,
        descriptionAr: input.descriptionAr || null,
        projectId: input.projectId || null,
        grantId: input.grantId || null,
        status: 'draft',
        createdBy: ctx.user?.id,
      });

      const journalEntryId = Number(result.insertId);

      // Insert journal lines
      const lineValues = input.lines.map((line) => ({
        journalEntryId,
        lineNumber: line.lineNumber,
        glAccountId: line.glAccountId,
        description: line.description || null,
        descriptionAr: line.descriptionAr || null,
        debitAmount: line.debitAmount,
        creditAmount: line.creditAmount,
        projectId: line.projectId || null,
        grantId: line.grantId || null,
        activityId: line.activityId || null,
        budgetLineId: line.budgetLineId || null,
        costCenterId: line.costCenterId || null,
        vendorId: line.vendorId || null,
      }));

      await db.insert(journalLines).values(lineValues);

      return { id: journalEntryId, entryNumber };
    }),

  // Update journal entry (draft only)
  update: scopedProcedure
    .input(
      z.object({
        id: z.number(),
        entryDate: z.string().optional(),
        description: z.string().optional(),
        descriptionAr: z.string().optional(),
        reference: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Check if entry is draft
      const entry = await db
        .select()
        .from(journalEntries)
        .where(and(
          eq(journalEntries.id, input.id),
          eq(journalEntries.organizationId, organizationId)
        ))
        .limit(1);

      if (!entry.length) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Journal entry not found' });
      }

      if (entry[0].status !== 'draft') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only draft entries can be updated',
        });
      }

      const { id, entryDate, ...rest } = input;
      const updateData: any = { ...rest, updatedBy: ctx.user?.id };
      if (entryDate) {
        updateData.entryDate = new Date(entryDate);
      }

      await db.update(journalEntries).set(updateData).where(eq(journalEntries.id, id));

      return { success: true };
    }),

  // Delete journal entry (soft delete, draft only)
  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const entry = await db
        .select()
        .from(journalEntries)
        .where(and(
          eq(journalEntries.id, input.id),
          eq(journalEntries.organizationId, organizationId)
        ))
        .limit(1);

      if (!entry.length) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Journal entry not found' });
      }

      if (entry[0].status !== 'draft') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only draft entries can be deleted',
        });
      }

      await db
        .update(journalEntries)
        .set({
          deletedAt: new Date(),
          deletedBy: ctx.user?.id,
        })
        .where(eq(journalEntries.id, input.id));

      return { success: true };
    }),

  // Post journal entry (draft -> posted)
  post: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const entry = await db
        .select()
        .from(journalEntries)
        .where(and(
          eq(journalEntries.id, input.id),
          eq(journalEntries.organizationId, organizationId)
        ))
        .limit(1);

      if (!entry.length) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Journal entry not found' });
      }

      if (entry[0].status !== 'draft') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only draft entries can be posted',
        });
      }

      // Get lines to update GL account balances
      const lines = await db
        .select()
        .from(journalLines)
        .where(eq(journalLines.journalEntryId, input.id));

      // Update GL account balances
      for (const line of lines) {
        const debit = parseFloat(line.debitAmount);
        const credit = parseFloat(line.creditAmount);
        const netChange = debit - credit;

        await db
          .update(glAccounts)
          .set({
            currentBalance: sql`current_balance + ${netChange}`,
          })
          .where(eq(glAccounts.id, line.glAccountId));
      }

      // Mark as posted
      await db
        .update(journalEntries)
        .set({
          status: 'posted',
          postedAt: new Date(),
          postedBy: ctx.user?.id,
          updatedBy: ctx.user?.id,
        })
        .where(eq(journalEntries.id, input.id));

      return { success: true };
    }),

  // Reverse journal entry (creates reversing entry)
  reverse: scopedProcedure
    .input(
      z.object({
        id: z.number(),
        reversalDate: z.string(),
        reversalReason: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const entry = await db
        .select()
        .from(journalEntries)
        .where(and(
          eq(journalEntries.id, input.id),
          eq(journalEntries.organizationId, organizationId)
        ))
        .limit(1);

      if (!entry.length) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Journal entry not found' });
      }

      if (entry[0].status !== 'posted') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only posted entries can be reversed',
        });
      }

      // Get original lines
      const originalLines = await db
        .select()
        .from(journalLines)
        .where(eq(journalLines.journalEntryId, input.id));

      // Generate reversing entry number
      const year = new Date(input.reversalDate).getFullYear();
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(journalEntries)
        .where(eq(journalEntries.organizationId, entry[0].organizationId));
      const count = countResult[0]?.count || 0;
      const entryNumber = `JE-${year}-${String(count + 1).padStart(6, '0')}`;

      // Create reversing entry
      const [result] = await db.insert(journalEntries).values({
        organizationId: entry[0].organizationId,
        operatingUnitId: entry[0].operatingUnitId,
        entryNumber,
        entryDate: new Date(input.reversalDate),
        fiscalYearId: entry[0].fiscalYearId,
        fiscalPeriodId: entry[0].fiscalPeriodId,
        entryType: 'reversing',
        sourceModule: entry[0].sourceModule,
        sourceDocumentId: entry[0].sourceDocumentId,
        sourceDocumentType: entry[0].sourceDocumentType,
        description: `Reversal of ${entry[0].entryNumber}: ${input.reversalReason}`,
        descriptionAr: entry[0].descriptionAr ? `عكس ${entry[0].entryNumber}: ${input.reversalReason}` : null,
        projectId: entry[0].projectId,
        grantId: entry[0].grantId,
        reversalOfEntryId: input.id,
        status: 'posted',
        postedAt: new Date(),
        postedBy: ctx.user?.id,
        createdBy: ctx.user?.id,
      });

      const reversingEntryId = Number(result.insertId);

      // Create reversing lines (swap debits and credits)
      const reversingLineValues = originalLines.map((line) => ({
        journalEntryId: reversingEntryId,
        lineNumber: line.lineNumber,
        glAccountId: line.glAccountId,
        description: line.description,
        descriptionAr: line.descriptionAr,
        debitAmount: line.creditAmount, // Swap
        creditAmount: line.debitAmount, // Swap
        projectId: line.projectId,
        grantId: line.grantId,
        activityId: line.activityId,
        budgetLineId: line.budgetLineId,
        costCenterId: line.costCenterId,
        vendorId: line.vendorId,
      }));

      await db.insert(journalLines).values(reversingLineValues);

      // Update GL account balances (reverse the original entry)
      for (const line of originalLines) {
        const debit = parseFloat(line.debitAmount);
        const credit = parseFloat(line.creditAmount);
        const netChange = credit - debit; // Reversed

        await db
          .update(glAccounts)
          .set({
            currentBalance: sql`current_balance + ${netChange}`,
          })
          .where(eq(glAccounts.id, line.glAccountId));
      }

      // Mark original as reversed
      await db
        .update(journalEntries)
        .set({
          status: 'reversed',
          reversedAt: new Date(),
          reversedBy: ctx.user?.id,
          updatedBy: ctx.user?.id,
        })
        .where(eq(journalEntries.id, input.id));

      return { id: reversingEntryId, entryNumber };
    }),

  // Get trial balance
  getTrialBalance: scopedProcedure
    .input(
      z.object({
        asOfDate: z.string(),
        fiscalYearId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Build query conditions
      const conditions = [
        eq(journalEntries.organizationId, organizationId),
        eq(journalEntries.status, 'posted'),
        lte(journalEntries.entryDate, new Date(input.asOfDate)),
        isNull(journalEntries.deletedAt),
      ];

      if (operatingUnitId) {
        conditions.push(eq(journalEntries.operatingUnitId, operatingUnitId));
      }
      if (input.fiscalYearId) {
        conditions.push(eq(journalEntries.fiscalYearId, input.fiscalYearId));
      }

      // Get all posted journal lines up to the as-of date
      const result = await db
        .select({
          glAccountId: journalLines.glAccountId,
          accountCode: glAccounts.accountCode,
          accountName: glAccounts.accountName,
          accountNameAr: glAccounts.accountNameAr,
          accountType: glAccounts.accountType,
          totalDebit: sql<string>`SUM(${journalLines.debitAmount})`,
          totalCredit: sql<string>`SUM(${journalLines.creditAmount})`,
        })
        .from(journalLines)
        .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
        .innerJoin(glAccounts, eq(journalLines.glAccountId, glAccounts.id))
        .where(and(...conditions))
        .groupBy(journalLines.glAccountId, glAccounts.accountCode, glAccounts.accountName, glAccounts.accountNameAr, glAccounts.accountType);

      // Calculate totals
      let totalDebits = 0;
      let totalCredits = 0;
      const accounts = result.map((row) => {
        const debit = parseFloat(row.totalDebit);
        const credit = parseFloat(row.totalCredit);
        totalDebits += debit;
        totalCredits += credit;

        return {
          ...row,
          balance: (debit - credit).toFixed(2),
        };
      });

      return {
        accounts,
        totalDebits: totalDebits.toFixed(2),
        totalCredits: totalCredits.toFixed(2),
        difference: (totalDebits - totalCredits).toFixed(2),
        asOfDate: input.asOfDate,
      };
    }),

  // Get account ledger (transaction history)
  getAccountLedger: scopedProcedure
    .input(
      z.object({
        glAccountId: z.number(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const conditions = [
        eq(journalLines.glAccountId, input.glAccountId),
        eq(journalEntries.organizationId, organizationId),
        eq(journalEntries.status, 'posted'),
        isNull(journalEntries.deletedAt),
      ];

      if (input.dateFrom) {
        conditions.push(gte(journalEntries.entryDate, new Date(input.dateFrom)));
      }
      if (input.dateTo) {
        conditions.push(lte(journalEntries.entryDate, new Date(input.dateTo)));
      }

      const transactions = await db
        .select({
          id: journalLines.id,
          entryDate: journalEntries.entryDate,
          entryNumber: journalEntries.entryNumber,
          description: journalLines.description,
          descriptionAr: journalLines.descriptionAr,
          debitAmount: journalLines.debitAmount,
          creditAmount: journalLines.creditAmount,
          entryType: journalEntries.entryType,
          sourceModule: journalEntries.sourceModule,
        })
        .from(journalLines)
        .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
        .where(and(...conditions))
        .orderBy(desc(journalEntries.entryDate), desc(journalEntries.entryNumber))
        .limit(input.limit)
        .offset(input.offset);

      // Calculate running balance
      let runningBalance = 0;
      const ledger = transactions.map((tx) => {
        const debit = parseFloat(tx.debitAmount);
        const credit = parseFloat(tx.creditAmount);
        runningBalance += debit - credit;

        return {
          ...tx,
          balance: runningBalance.toFixed(2),
        };
      });

      return ledger;
    }),
});
