import { z } from "zod";
import { router, protectedProcedure, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { payments, paymentLines, vendors, bankTransactions } from "../drizzle/schema";
import { eq, and, isNull, like, or, sql, desc, asc, inArray, gte, lte, between } from "drizzle-orm";

// Payment Batch Processing Router
export const paymentBatchRouter = router({
  // Create multiple payments in a batch
  createBatch: scopedProcedure
    .input(z.object({
      batchName: z.string().min(1).max(100),
      batchDescription: z.string().optional(),
      payments: z.array(z.object({
        vendorId: z.number().optional(),
        payeeName: z.string().min(1).max(255),
        payeeNameAr: z.string().max(255).optional(),
        paymentType: z.enum(['vendor', 'staff', 'advance', 'refund', 'other']).default('vendor'),
        paymentMethod: z.enum(['bank_transfer', 'check', 'cash', 'wire', 'mobile_money', 'other']).default('bank_transfer'),
        bankAccountId: z.number().optional(),
        paymentDate: z.date(),
        dueDate: z.date().optional(),
        currencyId: z.number().optional(),
        totalAmount: z.string(),
        description: z.string().optional(),
        descriptionAr: z.string().optional(),
        reference: z.string().max(100).optional(),
        projectId: z.number().optional(),
        grantId: z.number().optional(),
      })).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const year = new Date().getFullYear();
      const batchId = `BATCH-${year}-${Date.now().toString(36).toUpperCase()}`;
      
      // Get current payment count for numbering
      const countResult = await db.select({ 
        count: sql<number>`count(*)` 
      }).from(payments)
        .where(eq(payments.organizationId, organizationId));
      
      let nextNum = (countResult[0]?.count || 0) + 1;
      const createdPayments: { id: number; paymentNumber: string }[] = [];
      
      for (const paymentData of input.payments) {
        const paymentNumber = `PAY-${year}-${nextNum.toString().padStart(6, '0')}`;
        
        const result = await db.insert(payments).values({
          organizationId,
          operatingUnitId,
          paymentNumber,
          paymentDate: paymentData.paymentDate,
          paymentType: paymentData.paymentType,
          paymentMethod: paymentData.paymentMethod,
          payeeType: paymentData.vendorId ? 'vendor' : 'other',
          payeeId: paymentData.vendorId,
          payeeName: paymentData.payeeName,
          payeeNameAr: paymentData.payeeNameAr,
          bankAccountId: paymentData.bankAccountId,
          amount: paymentData.totalAmount,
          currencyId: paymentData.currencyId,
          description: paymentData.description,
          descriptionAr: paymentData.descriptionAr,
          projectId: paymentData.projectId,
          grantId: paymentData.grantId,
          status: 'draft',
          createdBy: ctx.user?.id,
          updatedBy: ctx.user?.id,
        });
        
        createdPayments.push({
          id: Number(result.insertId),
          paymentNumber,
        });
        nextNum++;
      }
      
      return {
        success: true,
        batchId,
        batchName: input.batchName,
        count: createdPayments.length,
        payments: createdPayments,
      };
    }),

  // Submit multiple payments for approval
  submitBatch: scopedProcedure
    .input(z.object({
      paymentIds: z.array(z.number()).min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      // Verify all payments are in draft status
      const existingPayments = await db.select().from(payments)
        .where(and(
          inArray(payments.id, input.paymentIds),
          isNull(payments.deletedAt)
        ));
      
      const draftPayments = existingPayments.filter(p => p.status === 'draft');
      
      if (draftPayments.length !== input.paymentIds.length) {
        const nonDraftCount = input.paymentIds.length - draftPayments.length;
        throw new Error(`${nonDraftCount} payment(s) are not in draft status and cannot be submitted`);
      }
      
      // Update all to pending_approval
      await db.update(payments)
        .set({ 
          status: 'pending_approval',
          updatedBy: ctx.user?.id,
        })
        .where(inArray(payments.id, input.paymentIds));
      
      return { 
        success: true, 
        count: draftPayments.length,
        message: `${draftPayments.length} payment(s) submitted for approval`,
      };
    }),

  // Approve multiple payments at once
  approveBatch: scopedProcedure
    .input(z.object({
      paymentIds: z.array(z.number()).min(1),
      approvalNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      // Verify all payments are pending approval
      const existingPayments = await db.select().from(payments)
        .where(and(
          inArray(payments.id, input.paymentIds),
          isNull(payments.deletedAt)
        ));
      
      const pendingPayments = existingPayments.filter(p => p.status === 'pending_approval');
      
      if (pendingPayments.length === 0) {
        throw new Error('No payments found in pending approval status');
      }
      
      // Update all to approved
      await db.update(payments)
        .set({ 
          status: 'approved',
          approvedAt: new Date(),
          approvedBy: ctx.user?.id,
          updatedBy: ctx.user?.id,
        })
        .where(and(
          inArray(payments.id, input.paymentIds),
          eq(payments.status, 'pending_approval')
        ));
      
      return { 
        success: true, 
        count: pendingPayments.length,
        message: `${pendingPayments.length} payment(s) approved`,
      };
    }),

  // Reject multiple payments at once
  rejectBatch: scopedProcedure
    .input(z.object({
      paymentIds: z.array(z.number()).min(1),
      rejectionReason: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      // Verify all payments are pending approval
      const existingPayments = await db.select().from(payments)
        .where(and(
          inArray(payments.id, input.paymentIds),
          isNull(payments.deletedAt)
        ));
      
      const pendingPayments = existingPayments.filter(p => p.status === 'pending_approval');
      
      if (pendingPayments.length === 0) {
        throw new Error('No payments found in pending approval status');
      }
      
      // Update all to rejected
      await db.update(payments)
        .set({ 
          status: 'cancelled', // Using cancelled as rejected equivalent
          updatedBy: ctx.user?.id,
        })
        .where(and(
          inArray(payments.id, input.paymentIds),
          eq(payments.status, 'pending_approval')
        ));
      
      return { 
        success: true, 
        count: pendingPayments.length,
        message: `${pendingPayments.length} payment(s) rejected`,
      };
    }),

  // Complete multiple approved payments
  completeBatch: scopedProcedure
    .input(z.object({
      paymentIds: z.array(z.number()).min(1),
      completedDate: z.date().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      // Verify all payments are approved
      const existingPayments = await db.select().from(payments)
        .where(and(
          inArray(payments.id, input.paymentIds),
          isNull(payments.deletedAt)
        ));
      
      const approvedPayments = existingPayments.filter(p => p.status === 'approved');
      
      if (approvedPayments.length === 0) {
        throw new Error('No payments found in approved status');
      }
      
      // Update all to paid
      await db.update(payments)
        .set({ 
          status: 'paid',
          paidAt: input.completedDate || new Date(),
          paidBy: ctx.user?.id,
          updatedBy: ctx.user?.id,
        })
        .where(and(
          inArray(payments.id, input.paymentIds),
          eq(payments.status, 'approved')
        ));
      
      return { 
        success: true, 
        count: approvedPayments.length,
        message: `${approvedPayments.length} payment(s) marked as paid`,
      };
    }),

  // Delete multiple draft payments
  deleteBatch: scopedProcedure
    .input(z.object({
      paymentIds: z.array(z.number()).min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      // Verify all payments are in draft status
      const existingPayments = await db.select().from(payments)
        .where(and(
          inArray(payments.id, input.paymentIds),
          isNull(payments.deletedAt)
        ));
      
      const draftPayments = existingPayments.filter(p => p.status === 'draft');
      
      if (draftPayments.length === 0) {
        throw new Error('No draft payments found to delete');
      }
      
      // Soft delete all draft payments
      await db.update(payments)
        .set({ 
          deletedAt: new Date(),
          deletedBy: ctx.user?.id,
        })
        .where(and(
          inArray(payments.id, draftPayments.map(p => p.id)),
          eq(payments.status, 'draft')
        ));
      
      return { 
        success: true, 
        count: draftPayments.length,
        message: `${draftPayments.length} draft payment(s) deleted`,
      };
    }),
});

// Payment Reports Router
export const paymentReportsRouter = router({
  // Payment Aging Report (0-30, 31-60, 61-90, 90+ days)
  agingReport: scopedProcedure
    .input(z.object({
      asOfDate: z.date().optional(),
      vendorId: z.number().optional(),
      projectId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const asOfDate = input.asOfDate || new Date();
      
      const conditions = [
        eq(payments.organizationId, organizationId),
        isNull(payments.deletedAt),
        // Include pending and approved payments (not yet paid)
        or(
          eq(payments.status, 'pending_approval'),
          eq(payments.status, 'approved')
        )!,
      ];
      
      if (operatingUnitId) {
        conditions.push(eq(payments.operatingUnitId, operatingUnitId));
      }
      if (input.vendorId) {
        conditions.push(eq(payments.payeeId, input.vendorId));
      }
      if (input.projectId) {
        conditions.push(eq(payments.projectId, input.projectId));
      }
      
      const allPayments = await db.select().from(payments)
        .where(and(...conditions))
        .orderBy(desc(payments.paymentDate));
      
      // Categorize by aging buckets
      const aging = {
        current: { count: 0, total: 0, payments: [] as typeof allPayments },
        days30: { count: 0, total: 0, payments: [] as typeof allPayments },
        days60: { count: 0, total: 0, payments: [] as typeof allPayments },
        days90: { count: 0, total: 0, payments: [] as typeof allPayments },
        over90: { count: 0, total: 0, payments: [] as typeof allPayments },
      };
      
      for (const payment of allPayments) {
        const paymentDate = new Date(payment.paymentDate);
        const daysDiff = Math.floor((asOfDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));
        const amount = parseFloat(payment.amount || '0');
        
        if (daysDiff <= 0) {
          aging.current.count++;
          aging.current.total += amount;
          aging.current.payments.push(payment);
        } else if (daysDiff <= 30) {
          aging.days30.count++;
          aging.days30.total += amount;
          aging.days30.payments.push(payment);
        } else if (daysDiff <= 60) {
          aging.days60.count++;
          aging.days60.total += amount;
          aging.days60.payments.push(payment);
        } else if (daysDiff <= 90) {
          aging.days90.count++;
          aging.days90.total += amount;
          aging.days90.payments.push(payment);
        } else {
          aging.over90.count++;
          aging.over90.total += amount;
          aging.over90.payments.push(payment);
        }
      }
      
      return {
        asOfDate: asOfDate.toISOString(),
        summary: {
          current: { count: aging.current.count, total: aging.current.total.toFixed(2) },
          days1to30: { count: aging.days30.count, total: aging.days30.total.toFixed(2) },
          days31to60: { count: aging.days60.count, total: aging.days60.total.toFixed(2) },
          days61to90: { count: aging.days90.count, total: aging.days90.total.toFixed(2) },
          over90: { count: aging.over90.count, total: aging.over90.total.toFixed(2) },
          grandTotal: {
            count: allPayments.length,
            total: (aging.current.total + aging.days30.total + aging.days60.total + aging.days90.total + aging.over90.total).toFixed(2),
          },
        },
        details: {
          current: aging.current.payments,
          days1to30: aging.days30.payments,
          days31to60: aging.days60.payments,
          days61to90: aging.days90.payments,
          over90: aging.over90.payments,
        },
      };
    }),

  // Payment History by Vendor
  vendorHistory: scopedProcedure
    .input(z.object({
      vendorId: z.number().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      status: z.enum(['draft', 'pending_approval', 'approved', 'paid', 'cancelled', 'void']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      
      const conditions = [
        eq(payments.organizationId, organizationId),
        isNull(payments.deletedAt),
        eq(payments.payeeType, 'vendor'),
      ];
      
      if (operatingUnitId) {
        conditions.push(eq(payments.operatingUnitId, operatingUnitId));
      }
      if (input.vendorId) {
        conditions.push(eq(payments.payeeId, input.vendorId));
      }
      if (input.status) {
        conditions.push(eq(payments.status, input.status));
      }
      if (input.startDate) {
        conditions.push(gte(payments.paymentDate, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(payments.paymentDate, input.endDate));
      }
      
      // Get all vendor payments
      const vendorPayments = await db.select().from(payments)
        .where(and(...conditions))
        .orderBy(desc(payments.paymentDate));
      
      // Group by vendor
      const vendorMap = new Map<number, {
        vendorId: number;
        vendorName: string;
        vendorNameAr: string | null;
        totalPayments: number;
        totalAmount: number;
        paidAmount: number;
        pendingAmount: number;
        payments: typeof vendorPayments;
      }>();
      
      for (const payment of vendorPayments) {
        const vendorId = payment.payeeId || 0;
        const amount = parseFloat(payment.amount || '0');
        
        if (!vendorMap.has(vendorId)) {
          vendorMap.set(vendorId, {
            vendorId,
            vendorName: payment.payeeName,
            vendorNameAr: payment.payeeNameAr,
            totalPayments: 0,
            totalAmount: 0,
            paidAmount: 0,
            pendingAmount: 0,
            payments: [],
          });
        }
        
        const vendor = vendorMap.get(vendorId)!;
        vendor.totalPayments++;
        vendor.totalAmount += amount;
        
        if (payment.status === 'paid') {
          vendor.paidAmount += amount;
        } else if (payment.status === 'pending_approval' || payment.status === 'approved') {
          vendor.pendingAmount += amount;
        }
        
        vendor.payments.push(payment);
      }
      
      const vendorSummaries = Array.from(vendorMap.values()).map(v => ({
        ...v,
        totalAmount: v.totalAmount.toFixed(2),
        paidAmount: v.paidAmount.toFixed(2),
        pendingAmount: v.pendingAmount.toFixed(2),
      }));
      
      // Sort by total amount descending
      vendorSummaries.sort((a, b) => parseFloat(b.totalAmount) - parseFloat(a.totalAmount));
      
      return {
        vendors: vendorSummaries,
        summary: {
          totalVendors: vendorSummaries.length,
          totalPayments: vendorPayments.length,
          totalAmount: vendorSummaries.reduce((sum, v) => sum + parseFloat(v.totalAmount), 0).toFixed(2),
          totalPaid: vendorSummaries.reduce((sum, v) => sum + parseFloat(v.paidAmount), 0).toFixed(2),
          totalPending: vendorSummaries.reduce((sum, v) => sum + parseFloat(v.pendingAmount), 0).toFixed(2),
        },
      };
    }),

  // Cash Flow Forecast based on scheduled/pending payments
  cashFlowForecast: scopedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
      bankAccountId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      
      const conditions = [
        eq(payments.organizationId, organizationId),
        isNull(payments.deletedAt),
        // Include pending and approved payments (outflows)
        or(
          eq(payments.status, 'pending_approval'),
          eq(payments.status, 'approved')
        )!,
        gte(payments.paymentDate, input.startDate),
        lte(payments.paymentDate, input.endDate),
      ];
      
      if (operatingUnitId) {
        conditions.push(eq(payments.operatingUnitId, operatingUnitId));
      }
      if (input.bankAccountId) {
        conditions.push(eq(payments.bankAccountId, input.bankAccountId));
      }
      
      const scheduledPayments = await db.select().from(payments)
        .where(and(...conditions))
        .orderBy(asc(payments.paymentDate));
      
      // Group by week
      const weeklyForecast: {
        weekStart: string;
        weekEnd: string;
        outflows: number;
        paymentCount: number;
        payments: typeof scheduledPayments;
      }[] = [];
      
      // Generate weekly buckets
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);
      let currentWeekStart = new Date(startDate);
      
      while (currentWeekStart <= endDate) {
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        const weekPayments = scheduledPayments.filter(p => {
          const paymentDate = new Date(p.paymentDate);
          return paymentDate >= currentWeekStart && paymentDate <= weekEnd;
        });
        
        const outflows = weekPayments.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
        
        weeklyForecast.push({
          weekStart: currentWeekStart.toISOString().split('T')[0],
          weekEnd: weekEnd.toISOString().split('T')[0],
          outflows,
          paymentCount: weekPayments.length,
          payments: weekPayments,
        });
        
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      }
      
      // Calculate monthly summary
      const monthlyForecast: {
        month: string;
        outflows: number;
        paymentCount: number;
      }[] = [];
      
      const monthMap = new Map<string, { outflows: number; count: number }>();
      
      for (const payment of scheduledPayments) {
        const paymentDate = new Date(payment.paymentDate);
        const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthMap.has(monthKey)) {
          monthMap.set(monthKey, { outflows: 0, count: 0 });
        }
        
        const month = monthMap.get(monthKey)!;
        month.outflows += parseFloat(payment.amount || '0');
        month.count++;
      }
      
      for (const [month, data] of monthMap.entries()) {
        monthlyForecast.push({
          month,
          outflows: data.outflows,
          paymentCount: data.count,
        });
      }
      
      monthlyForecast.sort((a, b) => a.month.localeCompare(b.month));
      
      return {
        period: {
          startDate: input.startDate.toISOString().split('T')[0],
          endDate: input.endDate.toISOString().split('T')[0],
        },
        summary: {
          totalOutflows: scheduledPayments.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0).toFixed(2),
          totalPayments: scheduledPayments.length,
          averageWeeklyOutflow: (scheduledPayments.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0) / Math.max(weeklyForecast.length, 1)).toFixed(2),
        },
        weeklyForecast: weeklyForecast.map(w => ({
          ...w,
          outflows: w.outflows.toFixed(2),
        })),
        monthlyForecast: monthlyForecast.map(m => ({
          ...m,
          outflows: m.outflows.toFixed(2),
        })),
      };
    }),

  // Payment Summary by Status
  statusSummary: scopedProcedure
    .input(z.object({
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      
      const conditions = [
        eq(payments.organizationId, organizationId),
        isNull(payments.deletedAt),
      ];
      
      if (operatingUnitId) {
        conditions.push(eq(payments.operatingUnitId, operatingUnitId));
      }
      if (input.startDate) {
        conditions.push(gte(payments.paymentDate, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(payments.paymentDate, input.endDate));
      }
      
      const statusStats = await db.select({
        status: payments.status,
        count: sql<number>`count(*)`,
        totalAmount: sql<string>`COALESCE(SUM(CAST(amount AS DECIMAL(18,2))), 0)`,
      }).from(payments)
        .where(and(...conditions))
        .groupBy(payments.status);
      
      const methodStats = await db.select({
        paymentMethod: payments.paymentMethod,
        count: sql<number>`count(*)`,
        totalAmount: sql<string>`COALESCE(SUM(CAST(amount AS DECIMAL(18,2))), 0)`,
      }).from(payments)
        .where(and(...conditions))
        .groupBy(payments.paymentMethod);
      
      const typeStats = await db.select({
        paymentType: payments.paymentType,
        count: sql<number>`count(*)`,
        totalAmount: sql<string>`COALESCE(SUM(CAST(amount AS DECIMAL(18,2))), 0)`,
      }).from(payments)
        .where(and(...conditions))
        .groupBy(payments.paymentType);
      
      return {
        byStatus: statusStats,
        byMethod: methodStats,
        byType: typeStats,
        grandTotal: {
          count: statusStats.reduce((sum, s) => sum + s.count, 0),
          amount: statusStats.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0).toFixed(2),
        },
      };
    }),
});

// Payment-Bank Reconciliation Integration Router
export const paymentReconciliationRouter = router({
  // Link a payment to a bank transaction
  linkPaymentToTransaction: scopedProcedure
    .input(z.object({
      paymentId: z.number(),
      bankTransactionId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      // Verify payment exists and is paid
      const payment = await db.select().from(payments)
        .where(and(
          eq(payments.id, input.paymentId),
          isNull(payments.deletedAt)
        ))
        .limit(1);
      
      if (!payment[0]) {
        throw new Error('Payment not found');
      }
      
      if (payment[0].status !== 'paid') {
        throw new Error('Only paid payments can be linked to bank transactions');
      }
      
      // Verify bank transaction exists
      const transaction = await db.select().from(bankTransactions)
        .where(and(
          eq(bankTransactions.id, input.bankTransactionId),
          isNull(bankTransactions.deletedAt)
        ))
        .limit(1);
      
      if (!transaction[0]) {
        throw new Error('Bank transaction not found');
      }
      
      // Link the transaction to the payment
      await db.update(bankTransactions)
        .set({
          matchedTransactionType: 'payment',
          matchedTransactionId: input.paymentId,
          updatedBy: ctx.user?.id,
        })
        .where(eq(bankTransactions.id, input.bankTransactionId));
      
      return { success: true };
    }),

  // Unlink a payment from a bank transaction
  unlinkPaymentFromTransaction: scopedProcedure
    .input(z.object({
      bankTransactionId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      await db.update(bankTransactions)
        .set({
          matchedTransactionType: null,
          matchedTransactionId: null,
          updatedBy: ctx.user?.id,
        })
        .where(eq(bankTransactions.id, input.bankTransactionId));
      
      return { success: true };
    }),

  // Auto-match payments to bank transactions
  autoMatchPayments: scopedProcedure
    .input(z.object({
      bankAccountId: z.number(),
      toleranceAmount: z.number().default(0.01), // Allow small differences
      toleranceDays: z.number().default(3), // Allow date variance
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      
      // Get unmatched bank transactions (debits = outflows)
      const unmatchedTransactions = await db.select().from(bankTransactions)
        .where(and(
          eq(bankTransactions.organizationId, organizationId),
          eq(bankTransactions.bankAccountId, input.bankAccountId),
          eq(bankTransactions.transactionType, 'debit'),
          isNull(bankTransactions.matchedTransactionId),
          isNull(bankTransactions.deletedAt)
        ));
      
      // Get paid payments from the same bank account
      const paidPayments = await db.select().from(payments)
        .where(and(
          eq(payments.organizationId, organizationId),
          eq(payments.bankAccountId, input.bankAccountId),
          eq(payments.status, 'paid'),
          isNull(payments.deletedAt)
        ));
      
      // Find already matched payment IDs
      const matchedPaymentIds = new Set(
        unmatchedTransactions
          .filter(t => t.matchedTransactionId)
          .map(t => t.matchedTransactionId)
      );
      
      // Get all transactions to check for existing matches
      const allTransactions = await db.select().from(bankTransactions)
        .where(and(
          eq(bankTransactions.organizationId, organizationId),
          eq(bankTransactions.bankAccountId, input.bankAccountId),
          sql`${bankTransactions.matchedTransactionType} = 'payment'`,
          isNull(bankTransactions.deletedAt)
        ));
      
      for (const tx of allTransactions) {
        if (tx.matchedTransactionId) {
          matchedPaymentIds.add(tx.matchedTransactionId);
        }
      }
      
      // Available payments for matching
      const availablePayments = paidPayments.filter(p => !matchedPaymentIds.has(p.id));
      
      const matches: { transactionId: number; paymentId: number; confidence: string }[] = [];
      
      for (const transaction of unmatchedTransactions) {
        const txAmount = parseFloat(transaction.amount || '0');
        const txDate = new Date(transaction.transactionDate);
        
        // Find matching payment
        for (const payment of availablePayments) {
          const paymentAmount = parseFloat(payment.amount || '0');
          const paymentDate = payment.paidAt ? new Date(payment.paidAt) : new Date(payment.paymentDate);
          
          // Check amount match (within tolerance)
          const amountDiff = Math.abs(txAmount - paymentAmount);
          if (amountDiff > input.toleranceAmount) continue;
          
          // Check date match (within tolerance days)
          const daysDiff = Math.abs(Math.floor((txDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24)));
          if (daysDiff > input.toleranceDays) continue;
          
          // Match found - link them
          await db.update(bankTransactions)
            .set({
              matchedTransactionType: 'payment',
              matchedTransactionId: payment.id,
              updatedBy: ctx.user?.id,
            })
            .where(eq(bankTransactions.id, transaction.id));
          
          matches.push({
            transactionId: transaction.id,
            paymentId: payment.id,
            confidence: amountDiff === 0 && daysDiff === 0 ? 'high' : 'medium',
          });
          
          // Remove from available payments
          const idx = availablePayments.indexOf(payment);
          if (idx > -1) availablePayments.splice(idx, 1);
          
          break;
        }
      }
      
      return {
        success: true,
        matchedCount: matches.length,
        matches,
      };
    }),

  // Get payments available for matching
  getUnmatchedPayments: scopedProcedure
    .input(z.object({
      bankAccountId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      
      // Get all paid payments for this bank account
      const paidPayments = await db.select().from(payments)
        .where(and(
          eq(payments.organizationId, organizationId),
          eq(payments.bankAccountId, input.bankAccountId),
          eq(payments.status, 'paid'),
          isNull(payments.deletedAt)
        ))
        .orderBy(desc(payments.paidAt));
      
      // Get already matched payment IDs
      const matchedTransactions = await db.select().from(bankTransactions)
        .where(and(
          eq(bankTransactions.organizationId, organizationId),
          eq(bankTransactions.bankAccountId, input.bankAccountId),
          sql`${bankTransactions.matchedTransactionType} = 'payment'`,
          isNull(bankTransactions.deletedAt)
        ));
      
      const matchedPaymentIds = new Set(matchedTransactions.map(t => t.matchedTransactionId));
      
      // Filter out already matched payments
      const unmatchedPayments = paidPayments.filter(p => !matchedPaymentIds.has(p.id));
      
      return {
        payments: unmatchedPayments,
        total: unmatchedPayments.length,
      };
    }),

  // Get bank transactions linked to payments
  getLinkedTransactions: scopedProcedure
    .input(z.object({
      bankAccountId: z.number().optional(),
      reconciliationId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      
      const conditions = [
        eq(bankTransactions.organizationId, organizationId),
        sql`${bankTransactions.matchedTransactionType} = 'payment'`,
        isNull(bankTransactions.deletedAt),
      ];
      
      if (input.bankAccountId) {
        conditions.push(eq(bankTransactions.bankAccountId, input.bankAccountId));
      }
      if (input.reconciliationId) {
        conditions.push(eq(bankTransactions.reconciliationId, input.reconciliationId));
      }
      
      const linkedTransactions = await db.select().from(bankTransactions)
        .where(and(...conditions))
        .orderBy(desc(bankTransactions.transactionDate));
      
      // Get payment details for each linked transaction
      const paymentIds = linkedTransactions
        .map(t => t.matchedTransactionId)
        .filter((id): id is number => id !== null);
      
      const linkedPayments = paymentIds.length > 0
        ? await db.select().from(payments)
            .where(inArray(payments.id, paymentIds))
        : [];
      
      const paymentMap = new Map(linkedPayments.map(p => [p.id, p]));
      
      return linkedTransactions.map(tx => ({
        ...tx,
        linkedPayment: tx.matchedTransactionId ? paymentMap.get(tx.matchedTransactionId) : null,
      }));
    }),
});
