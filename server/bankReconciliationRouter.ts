import { z } from "zod";
import { router, protectedProcedure, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { bankTransactions, bankReconciliations, financeBankAccounts } from "../drizzle/schema";
import { eq, and, isNull, like, or, sql, desc, asc, between, gte, lte } from "drizzle-orm";
import { autoMatchTransactions, validateManualMatch } from "./services/reconciliationMatcher";

// Bank Transactions Router
export const bankTransactionsRouter = router({
  list: scopedProcedure
    .input(z.object({
      bankAccountId: z.number().optional(),
      reconciliationId: z.number().optional(),
      transactionType: z.enum(['credit', 'debit']).optional(),
      isReconciled: z.boolean().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().default(100),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const conditions = [
        eq(bankTransactions.organizationId, organizationId),
      ];
      
      if (operatingUnitId) {
        conditions.push(eq(bankTransactions.operatingUnitId, operatingUnitId));
      }
      if (input.bankAccountId) {
        conditions.push(eq(bankTransactions.bankAccountId, input.bankAccountId));
      }
      if (input.reconciliationId) {
        conditions.push(eq(bankTransactions.reconciliationId, input.reconciliationId));
      }
      if (input.transactionType) {
        conditions.push(eq(bankTransactions.transactionType, input.transactionType));
      }
      if (input.isReconciled !== undefined) {
        conditions.push(eq(bankTransactions.isReconciled, input.isReconciled));
      }
      if (input.startDate) {
        conditions.push(gte(bankTransactions.transactionDate, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(bankTransactions.transactionDate, new Date(input.endDate)));
      }
      if (input.search) {
        conditions.push(or(
          like(bankTransactions.reference, `%${input.search}%`),
          like(bankTransactions.description, `%${input.search}%`),
          like(bankTransactions.payee, `%${input.search}%`)
        )!);
      }
      
      const [transactions, countResult] = await Promise.all([
        db.select().from(bankTransactions)
          .where(and(...conditions))
          .orderBy(desc(bankTransactions.transactionDate))
          .limit(input.limit)
          .offset(input.offset),
        db.select({ count: sql<number>`count(*)` }).from(bankTransactions)
          .where(and(...conditions)),
      ]);
      
      return {
        transactions,
        total: countResult[0]?.count || 0,
      };
    }),

  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const result = await db.select().from(bankTransactions)
        .where(eq(bankTransactions.id, input.id))
        .limit(1);
      return result[0] || null;
    }),

  create: scopedProcedure
    .input(z.object({
      bankAccountId: z.number(),
      transactionDate: z.string(),
      valueDate: z.string().optional(),
      transactionType: z.enum(['credit', 'debit']),
      amount: z.string(),
      currencyId: z.number().optional(),
      exchangeRate: z.string().optional(),
      amountInBaseCurrency: z.string().optional(),
      reference: z.string().max(100).optional(),
      description: z.string().optional(),
      payee: z.string().max(255).optional(),
      checkNumber: z.string().max(50).optional(),
      statementBalance: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const result = await db.insert(bankTransactions).values({
        organizationId,
        operatingUnitId,
        bankAccountId: input.bankAccountId,
        transactionDate: input.transactionDate,
        valueDate: input.valueDate,
        transactionType: input.transactionType,
        amount: input.amount,
        currencyId: input.currencyId,
        exchangeRate: input.exchangeRate,
        amountInBaseCurrency: input.amountInBaseCurrency,
        reference: input.reference,
        description: input.description,
        isReconciled: false,
      });
      return { id: Number(result.insertId), success: true };
    }),

  update: scopedProcedure
    .input(z.object({
      id: z.number(),
      transactionDate: z.string().optional(),
      valueDate: z.string().optional().nullable(),
      transactionType: z.enum(['credit', 'debit']).optional(),
      amount: z.string().optional(),
      currencyId: z.number().optional().nullable(),
      exchangeRate: z.string().optional().nullable(),
      amountInBaseCurrency: z.string().optional().nullable(),
      reference: z.string().max(100).optional().nullable(),
      description: z.string().optional().nullable(),
      payee: z.string().max(255).optional().nullable(),
      checkNumber: z.string().max(50).optional().nullable(),
      statementBalance: z.string().optional().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { id, transactionDate, valueDate, ...rest } = input;
      const updateData: any = { ...rest };
      
      if (transactionDate) {
        updateData.transactionDate = new Date(transactionDate);
      }
      if (valueDate !== undefined) {
        updateData.valueDate = valueDate ? new Date(valueDate) : null;
      }
      
      await db.update(bankTransactions)
        .set(updateData)
        .where(eq(bankTransactions.id, id));
      return { success: true };
    }),

  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      // Note: bankTransactions table doesn't have soft delete columns
      // For now, we'll do a hard delete
      await db.delete(bankTransactions)
        .where(eq(bankTransactions.id, input.id));
      return { success: true };
    }),

  // Import bank statement (batch create)
  importStatement: scopedProcedure
    .input(z.object({
      bankAccountId: z.number(),
      transactions: z.array(z.object({
        transactionDate: z.string(),
        valueDate: z.string().optional(),
        transactionType: z.enum(['credit', 'debit']),
        amount: z.string(),
        reference: z.string().optional(),
        description: z.string().optional(),
        payee: z.string().optional(),
        checkNumber: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const insertData = input.transactions.map(t => ({
        organizationId,
        operatingUnitId,
        bankAccountId: input.bankAccountId,
        transactionDate: new Date(t.transactionDate),
        valueDate: t.valueDate ? new Date(t.valueDate) : null,
        transactionType: t.transactionType,
        amount: t.amount,
        reference: t.reference,
        description: t.description,
        isReconciled: false,
      }));
      
      if (insertData.length > 0) {
        await db.insert(bankTransactions).values(insertData);
      }
      
      return { success: true, count: insertData.length };
    }),

  // Match transaction to system record
  matchTransaction: scopedProcedure
    .input(z.object({
      id: z.number(),
      matchedTransactionType: z.enum(['expense', 'advance', 'settlement', 'payment', 'journal']),
      matchedTransactionId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      await db.update(bankTransactions)
        .set({ 
          matchedTransactionType: input.matchedTransactionType,
          matchedTransactionId: input.matchedTransactionId,
        })
        .where(eq(bankTransactions.id, input.id));
      return { success: true };
    }),

  // Unmatch transaction
  unmatchTransaction: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      await db.update(bankTransactions)
        .set({ 
          matchedTransactionType: null,
          matchedTransactionId: null,
        })
        .where(eq(bankTransactions.id, input.id));
      return { success: true };
    }),

  // Get unreconciled transactions for a bank account
  getUnreconciled: scopedProcedure
    .input(z.object({
      bankAccountId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      return db.select().from(bankTransactions)
        .where(and(
          eq(bankTransactions.organizationId, organizationId),
          eq(bankTransactions.bankAccountId, input.bankAccountId),
          eq(bankTransactions.isReconciled, false)
        ))
        .orderBy(desc(bankTransactions.transactionDate));
    }),
});

// Bank Reconciliations Router
export const bankReconciliationsRouter = router({
  list: scopedProcedure
    .input(z.object({
      bankAccountId: z.number().optional(),
      status: z.enum(['draft', 'in_progress', 'completed', 'approved']).optional(),
      fiscalYear: z.number().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const conditions = [
        eq(bankReconciliations.organizationId, organizationId),
      ];
      
      if (operatingUnitId) {
        conditions.push(eq(bankReconciliations.operatingUnitId, operatingUnitId));
      }
      if (input.bankAccountId) {
        conditions.push(eq(bankReconciliations.bankAccountId, input.bankAccountId));
      }
      if (input.status) {
        conditions.push(eq(bankReconciliations.status, input.status));
      }
      // Note: fiscalYear column doesn't exist in schema
      
      const [reconciliations, countResult] = await Promise.all([
        db.select().from(bankReconciliations)
          .where(and(...conditions))
          .orderBy(desc(bankReconciliations.reconciliationDate))
          .limit(input.limit)
          .offset(input.offset),
        db.select({ count: sql<number>`count(*)` }).from(bankReconciliations)
          .where(and(...conditions)),
      ]);
      
      return {
        reconciliations,
        total: countResult[0]?.count || 0,
      };
    }),

  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const result = await db.select().from(bankReconciliations)
        .where(eq(bankReconciliations.id, input.id))
        .limit(1);
      return result[0] || null;
    }),

  create: scopedProcedure
    .input(z.object({
      bankAccountId: z.number(),
      reconciliationDate: z.string(),
      periodStart: z.string(),
      periodEnd: z.string(),
      fiscalYear: z.number().optional(),
      fiscalPeriod: z.number().optional(),
      statementBalance: z.string(),
      bookBalance: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      // Generate reconciliation number
      const countResult = await db.select({ count: sql<number>`count(*)` }).from(bankReconciliations)
        .where(eq(bankReconciliations.organizationId, organizationId));
      const nextNum = (countResult[0]?.count || 0) + 1;
      const reconciliationNumber = `REC-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`;
      
      const result = await db.insert(bankReconciliations).values({
        organizationId,
        operatingUnitId,
        bankAccountId: input.bankAccountId,
        reconciliationNumber,
        reconciliationDate: input.reconciliationDate,
        statementDate: input.reconciliationDate,
        statementBalance: input.statementBalance,
        bookBalance: input.bookBalance,
        status: 'draft',
        difference: (parseFloat(input.statementBalance) - parseFloat(input.bookBalance)).toFixed(2),
        notes: input.notes,
        createdBy: ctx.user?.id,
        updatedBy: ctx.user?.id,
      });
      return { id: Number(result.insertId), success: true };
    }),

  update: scopedProcedure
    .input(z.object({
      id: z.number(),
      reconciliationDate: z.string().optional(),
      periodStart: z.string().optional(),
      periodEnd: z.string().optional(),
      fiscalYear: z.number().optional().nullable(),
      fiscalPeriod: z.number().optional().nullable(),
      statementBalance: z.string().optional(),
      bookBalance: z.string().optional(),
      reconciledBalance: z.string().optional(),
      notes: z.string().optional().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { id, reconciliationDate, periodStart, periodEnd, statementBalance, bookBalance, ...rest } = input;
      const updateData: any = { ...rest };
      
      if (reconciliationDate) {
        updateData.reconciliationDate = new Date(reconciliationDate);
      }
      // Note: periodStart and periodEnd columns don't exist in schema
      if (statementBalance !== undefined || bookBalance !== undefined) {
        // Recalculate difference
        const current = await db.select().from(bankReconciliations).where(eq(bankReconciliations.id, id)).limit(1);
        if (current[0]) {
          const stmt = statementBalance !== undefined ? parseFloat(statementBalance) : parseFloat(current[0].statementBalance || '0');
          const book = bookBalance !== undefined ? parseFloat(bookBalance) : parseFloat(current[0].bookBalance || '0');
          updateData.difference = (stmt - book).toFixed(2);
          if (statementBalance !== undefined) updateData.statementBalance = statementBalance;
          if (bookBalance !== undefined) updateData.bookBalance = bookBalance;
        }
      }
      
      await db.update(bankReconciliations)
        .set(updateData)
        .where(eq(bankReconciliations.id, id));
      return { success: true };
    }),

  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      // Note: bankReconciliations table doesn't have soft delete columns
      // For now, we'll do a hard delete
      await db.delete(bankReconciliations)
        .where(eq(bankReconciliations.id, input.id));
      return { success: true };
    }),

  // Start reconciliation (change status to in_progress)
  startReconciliation: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      await db.update(bankReconciliations)
        .set({ 
          status: 'in_progress',
          updatedBy: ctx.user?.id,
        })
        .where(eq(bankReconciliations.id, input.id));
      return { success: true };
    }),

  // Complete reconciliation
  completeReconciliation: scopedProcedure
    .input(z.object({ 
      id: z.number(),
      reconciledBalance: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      // Get reconciliation details
      const recon = await db.select().from(bankReconciliations)
        .where(eq(bankReconciliations.id, input.id))
        .limit(1);
      
      if (!recon[0]) {
        throw new Error('Reconciliation not found');
      }
      
      // Mark all associated transactions as reconciled
      await db.update(bankTransactions)
        .set({ 
          isReconciled: true,
          reconciledAt: new Date(),
          reconciledBy: ctx.user?.id,
          reconciliationId: input.id,
        })
        .where(eq(bankTransactions.reconciliationId, input.id));
      
      // Update reconciliation status
      await db.update(bankReconciliations)
        .set({ 
          status: 'completed',
          adjustedBookBalance: input.reconciledBalance,
          difference: (parseFloat(recon[0].statementBalance || '0') - parseFloat(input.reconciledBalance)).toFixed(2),
          completedAt: new Date(),
          completedBy: ctx.user?.id,
          updatedBy: ctx.user?.id,
        })
        .where(eq(bankReconciliations.id, input.id));
      
      return { success: true };
    }),

  // Approve reconciliation
  approveReconciliation: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      await db.update(bankReconciliations)
        .set({ 
          status: 'approved',
          approvedAt: new Date(),
          approvedBy: ctx.user?.id,
          updatedBy: ctx.user?.id,
        })
        .where(eq(bankReconciliations.id, input.id));
      return { success: true };
    }),

  // Add transactions to reconciliation
  addTransactions: scopedProcedure
    .input(z.object({
      reconciliationId: z.number(),
      transactionIds: z.array(z.number()),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      for (const txId of input.transactionIds) {
        await db.update(bankTransactions)
          .set({ 
            reconciliationId: input.reconciliationId,
          })
          .where(eq(bankTransactions.id, txId));
      }
      
      return { success: true, count: input.transactionIds.length };
    }),

  // Remove transactions from reconciliation
  removeTransactions: scopedProcedure
    .input(z.object({
      reconciliationId: z.number(),
      transactionIds: z.array(z.number()),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      for (const txId of input.transactionIds) {
        await db.update(bankTransactions)
          .set({ 
            reconciliationId: null,
            isReconciled: false,
            reconciledAt: null,
            reconciledBy: null,
          })
          .where(eq(bankTransactions.id, txId));
      }
      
      return { success: true, count: input.transactionIds.length };
    }),

  // Get reconciliation summary with transactions
  getSummary: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      const [recon] = await db.select().from(bankReconciliations)
        .where(eq(bankReconciliations.id, input.id))
        .limit(1);
      
      if (!recon) {
        return null;
      }
      
      // Get associated transactions
      const transactions = await db.select().from(bankTransactions)
        .where(eq(bankTransactions.reconciliationId, input.id))
        .orderBy(desc(bankTransactions.transactionDate));
      
      // Calculate totals
      let totalCredits = 0;
      let totalDebits = 0;
      
      for (const tx of transactions) {
        const amount = parseFloat(tx.amount || '0');
        if (tx.transactionType === 'credit') {
          totalCredits += amount;
        } else {
          totalDebits += amount;
        }
      }
      
      return {
        ...recon,
        transactions,
        totalCredits: totalCredits.toFixed(2),
        totalDebits: totalDebits.toFixed(2),
        netMovement: (totalCredits - totalDebits).toFixed(2),
        transactionCount: transactions.length,
      };
    }),

  // Get unmatched bank transactions for reconciliation
  getUnmatchedBankTransactions: scopedProcedure
    .input(z.object({
      bankAccountId: z.number(),
      reconciliationId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      
      const conditions = [
        eq(bankTransactions.organizationId, organizationId),
        eq(bankTransactions.bankAccountId, input.bankAccountId),
        eq(bankTransactions.isReconciled, false),
      ];
      
      if (input.reconciliationId) {
        conditions.push(eq(bankTransactions.reconciliationId, input.reconciliationId));
      }
      
      const transactions = await db.select().from(bankTransactions)
        .where(and(...conditions))
        .orderBy(desc(bankTransactions.transactionDate));
      
      return { transactions };
    }),

  // Get auto-match suggestions
  getMatchSuggestions: scopedProcedure
    .input(z.object({
      bankAccountId: z.number(),
      reconciliationId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      
      // Get unmatched bank transactions
      const bankTxs = await db.select().from(bankTransactions)
        .where(and(
          eq(bankTransactions.organizationId, organizationId),
          eq(bankTransactions.bankAccountId, input.bankAccountId),
          eq(bankTransactions.reconciliationId, input.reconciliationId),
          eq(bankTransactions.isReconciled, false)
        ));
      
      // TODO: Get unmatched GL entries (requires GL journal entries table)
      // For now, return empty GL entries array
      const glEntries: any[] = [];
      
      // Run auto-matching algorithm
      const suggestions = autoMatchTransactions(
        bankTxs.map(tx => ({
          id: tx.id,
          transactionDate: new Date(tx.transactionDate),
          amount: parseFloat(tx.amount || '0'),
          description: tx.description || '',
          referenceNumber: tx.referenceNumber,
          transactionType: tx.transactionType as 'debit' | 'credit',
        })),
        glEntries
      );
      
      return { suggestions };
    }),

  // Manual match bank transaction with GL entry
  manualMatch: scopedProcedure
    .input(z.object({
      bankTransactionId: z.number(),
      glEntryId: z.number(),
      reconciliationId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      // Get bank transaction
      const [bankTx] = await db.select().from(bankTransactions)
        .where(eq(bankTransactions.id, input.bankTransactionId))
        .limit(1);
      
      if (!bankTx) {
        throw new Error('Bank transaction not found');
      }
      
      // TODO: Get GL entry (requires GL journal entries table)
      // For now, validate and mark as reconciled
      
      // Mark bank transaction as reconciled
      await db.update(bankTransactions)
        .set({
          isReconciled: true,
          reconciledAt: new Date(),
          reconciledBy: ctx.user?.id,
          reconciliationId: input.reconciliationId,
        })
        .where(eq(bankTransactions.id, input.bankTransactionId));
      
      return { success: true };
    }),

  // Unmatch bank transaction
  unmatch: scopedProcedure
    .input(z.object({
      bankTransactionId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      await db.update(bankTransactions)
        .set({
          isReconciled: false,
          reconciledAt: null,
          reconciledBy: null,
        })
        .where(eq(bankTransactions.id, input.bankTransactionId));
      
      return { success: true };
    }),
});
