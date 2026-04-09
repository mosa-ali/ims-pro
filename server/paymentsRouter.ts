import { z } from "zod";
import { router, protectedProcedure, scopedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { payments, paymentLines, vendors, financeBankAccounts, procurementPayables, financeEncumbrances } from "../drizzle/schema";
import { eq, and, isNull, like, or, sql, desc, asc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const paymentsRouter = router({
  // Create revision (versioning)
  createRevision: scopedProcedure
    .input(z.object({
      id: z.number(),
      revisionReason: z.string(),
      changes: z.object({
        amount: z.string().optional(),
        description: z.string().optional(),
        paymentDate: z.date().optional(),
        status: z.enum(['draft', 'pending_approval', 'approved', 'rejected', 'processing', 'completed', 'cancelled', 'failed']).optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      
      // Get current payment
      const current = await db.select().from(payments)
        .where(and(
          eq(payments.id, input.id),
          eq(payments.organizationId, organizationId)
        ))
        .limit(1);
      if (current.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Payment not found" });
      }
      
      // Mark current version as not latest
      await db.update(payments).set({ isLatestVersion: false }).where(eq(payments.id, input.id));
      
      // Create new version
      const newVersion = {
        ...current[0],
        ...input.changes,
        id: undefined,
        version: (current[0].version || 1) + 1,
        parentId: current[0].parentId || input.id,
        revisionReason: input.revisionReason,
        isLatestVersion: true,
        createdBy: ctx.user.id,
      };
      
      const result = await db.insert(payments).values(newVersion);
      return { id: result[0].insertId, version: newVersion.version };
    }),
  
  // Get version history
  getVersionHistory: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      
      // Get the payment to find its parentId
      const current = await db.select().from(payments)
        .where(and(
          eq(payments.id, input.id),
          eq(payments.organizationId, organizationId)
        ))
        .limit(1);
      if (current.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Payment not found" });
      }
      
      const rootId = current[0].parentId || input.id;
      
      // Get all versions
      const versions = await db.select().from(payments)
        .where(
          and(
            eq(payments.organizationId, organizationId),
            or(
              eq(payments.id, rootId),
              eq(payments.parentId, rootId)
            )
          )
        )
        .orderBy(desc(payments.version));
      
      return versions;
    }),

  list: scopedProcedure
    .input(z.object({
      projectId: z.number().optional(),
      grantId: z.number().optional(),
      vendorId: z.number().optional(),
      paymentType: z.enum(['vendor', 'staff', 'advance', 'refund', 'other']).optional(),
      paymentMethod: z.enum(['bank_transfer', 'check', 'cash', 'wire', 'mobile_money', 'other']).optional(),
      status: z.enum(['draft', 'pending_approval', 'approved', 'rejected', 'processing', 'completed', 'cancelled', 'failed']).optional(),
      fromDate: z.date().optional(),
      toDate: z.date().optional(),
      search: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
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
      if (input.projectId) {
        conditions.push(eq(payments.projectId, input.projectId));
      }
      if (input.grantId) {
        conditions.push(eq(payments.grantId, input.grantId));
      }
      if (input.vendorId) {
        conditions.push(eq(payments.vendorId, input.vendorId));
      }
      if (input.paymentType) {
        conditions.push(eq(payments.paymentType, input.paymentType));
      }
      if (input.paymentMethod) {
        conditions.push(eq(payments.paymentMethod, input.paymentMethod));
      }
      if (input.status) {
        conditions.push(eq(payments.status, input.status));
      }
      if (input.fromDate) {
        conditions.push(sql`${payments.paymentDate} >= ${input.fromDate}`);
      }
      if (input.toDate) {
        conditions.push(sql`${payments.paymentDate} <= ${input.toDate}`);
      }
      if (input.search) {
        conditions.push(or(
          like(payments.paymentNumber, `%${input.search}%`),
          like(payments.payeeName, `%${input.search}%`),
          like(payments.description, `%${input.search}%`),
          like(payments.reference, `%${input.search}%`)
        )!);
      }
      
      const [paymentList, countResult] = await Promise.all([
        db.select().from(payments)
          .where(and(...conditions))
          .orderBy(desc(payments.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        db.select({ count: sql<number>`count(*)` }).from(payments)
          .where(and(...conditions)),
      ]);
      
      return {
        payments: paymentList,
        total: countResult[0]?.count || 0,
      };
    }),

  getById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      const result = await db.select().from(payments)
        .where(and(
          eq(payments.id, input.id),
          eq(payments.organizationId, organizationId),
          isNull(payments.deletedAt)
        ))
        .limit(1);
      
      if (!result[0]) return null;
      
      // Get payment lines
      const lines = await db.select().from(paymentLines)
        .where(eq(paymentLines.paymentId, input.id))
        .orderBy(asc(paymentLines.lineNumber));
      
      return {
        ...result[0],
        lines,
      };
    }),

  create: scopedProcedure
    .input(z.object({
      projectId: z.number().optional(),
      grantId: z.number().optional(),
      vendorId: z.number().optional(),
      payeeName: z.string().min(1).max(255),
      payeeNameAr: z.string().max(255).optional(),
      paymentType: z.enum(['vendor', 'staff', 'advance', 'refund', 'other']).default('vendor'),
      paymentMethod: z.enum(['bank_transfer', 'check', 'cash', 'wire', 'mobile_money', 'other']).default('bank_transfer'),
      bankAccountId: z.number().optional(),
      paymentDate: z.date(),
      dueDate: z.date().optional(),
      currencyId: z.number().optional(),
      exchangeRate: z.string().optional(),
      totalAmount: z.string(),
      amountInBaseCurrency: z.string().optional(),
      description: z.string().optional(),
      descriptionAr: z.string().optional(),
      reference: z.string().max(100).optional(),
      payeeBankName: z.string().max(255).optional(),
      payeeBankAccount: z.string().max(100).optional(),
      payeeIban: z.string().max(50).optional(),
      payeeSwiftCode: z.string().max(20).optional(),
      lines: z.array(z.object({
        description: z.string().min(1).max(500),
        descriptionAr: z.string().max(500).optional(),
        glAccountId: z.number().optional(),
        budgetLineId: z.number().optional(),
        expenseId: z.number().optional(),
        amount: z.string(),
        taxAmount: z.string().optional(),
        netAmount: z.string(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      
      // Generate payment number
      const year = new Date().getFullYear();
      const countResult = await db.select({ 
        count: sql<number>`count(*)` 
      }).from(payments)
        .where(eq(payments.organizationId, organizationId));
      const nextNum = (countResult[0]?.count || 0) + 1;
      const paymentNumber = `PAY-${year}-${nextNum.toString().padStart(6, '0')}`;
      
      const { lines, ...paymentData } = input;
      
      const result = await db.insert(payments).values({
        ...paymentData,
        organizationId,
        operatingUnitId: operatingUnitId || null,
        paymentNumber,
        status: 'draft',
        createdBy: ctx.user?.id,
        updatedBy: ctx.user?.id,
      });
      
      const paymentId = Number(result.insertId);
      
      // Insert payment lines if provided
      if (lines && lines.length > 0) {
        for (let i = 0; i < lines.length; i++) {
          await db.insert(paymentLines).values({
            paymentId,
            lineNumber: i + 1,
            ...lines[i],
            createdBy: ctx.user?.id,
          });
        }
      }
      
      return { id: paymentId, paymentNumber, success: true };
    }),

  update: scopedProcedure
    .input(z.object({
      id: z.number(),
      vendorId: z.number().optional().nullable(),
      payeeName: z.string().min(1).max(255).optional(),
      payeeNameAr: z.string().max(255).optional().nullable(),
      paymentType: z.enum(['vendor', 'staff', 'advance', 'refund', 'other']).optional(),
      paymentMethod: z.enum(['bank_transfer', 'check', 'cash', 'wire', 'mobile_money', 'other']).optional(),
      bankAccountId: z.number().optional().nullable(),
      paymentDate: z.date().optional(),
      dueDate: z.date().optional().nullable(),
      currencyId: z.number().optional().nullable(),
      exchangeRate: z.string().optional().nullable(),
      totalAmount: z.string().optional(),
      amountInBaseCurrency: z.string().optional().nullable(),
      description: z.string().optional().nullable(),
      descriptionAr: z.string().optional().nullable(),
      reference: z.string().max(100).optional().nullable(),
      payeeBankName: z.string().max(255).optional().nullable(),
      payeeBankAccount: z.string().max(100).optional().nullable(),
      payeeIban: z.string().max(50).optional().nullable(),
      payeeSwiftCode: z.string().max(20).optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      
      // Check if payment is in draft status
      const existing = await db.select().from(payments)
        .where(and(
          eq(payments.id, input.id),
          eq(payments.organizationId, organizationId)
        ))
        .limit(1);
      
      if (!existing[0]) {
        throw new Error('Payment not found');
      }
      
      if (existing[0].status !== 'draft') {
        throw new Error('Only draft payments can be edited');
      }
      
      const { id, ...updateData } = input;
      await db.update(payments)
        .set({ ...updateData, updatedBy: ctx.user?.id })
        .where(and(
          eq(payments.id, id),
          eq(payments.organizationId, organizationId)
        ));
      
      return { success: true };
    }),

  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      
      // Check if payment is in draft status
      const existing = await db.select().from(payments)
        .where(and(
          eq(payments.id, input.id),
          eq(payments.organizationId, organizationId)
        ))
        .limit(1);
      
      if (!existing[0]) {
        throw new Error('Payment not found');
      }
      
      if (existing[0].status !== 'draft' && existing[0].status !== 'rejected') {
        throw new Error('Only draft or rejected payments can be deleted');
      }
      
      // Soft delete
      await db.update(payments)
        .set({ 
          deletedAt: new Date(),
          deletedBy: ctx.user?.id,
        })
        .where(and(
          eq(payments.id, input.id),
          eq(payments.organizationId, organizationId)
        ));
      
      return { success: true };
    }),

  // Submit for approval
  submitForApproval: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      
      const existing = await db.select().from(payments)
        .where(and(
          eq(payments.id, input.id),
          eq(payments.organizationId, organizationId)
        ))
        .limit(1);
      
      if (!existing[0]) {
        throw new Error('Payment not found');
      }
      
      if (existing[0].status !== 'draft') {
        throw new Error('Only draft payments can be submitted for approval');
      }
      
      await db.update(payments)
        .set({ 
          status: 'pending_approval',
          submittedAt: new Date(),
          submittedBy: ctx.user?.id,
          updatedBy: ctx.user?.id,
        })
        .where(eq(payments.id, input.id));
      
      return { success: true };
    }),

  // Approve payment
  approve: scopedProcedure
    .input(z.object({ 
      id: z.number(),
      approvalNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { generatePaymentApprovalEvidence } = await import('./evidenceGeneration');
      const { organizationId } = ctx.scope;
      const db = await getDb();
      
      const existing = await db.select().from(payments)
        .where(and(
          eq(payments.id, input.id),
          eq(payments.organizationId, organizationId)
        ))
        .limit(1);
      
      if (!existing[0]) {
        throw new Error('Payment not found');
      }
      
      if (existing[0].status !== 'pending_approval') {
        throw new Error('Only pending payments can be approved');
      }
      
      const approvedAt = new Date();
      await db.update(payments)
        .set({ 
          status: 'approved',
          approvedAt,
          approvedBy: ctx.user?.id,
          approvalNotes: input.approvalNotes,
          updatedBy: ctx.user?.id,
        })
        .where(eq(payments.id, input.id));
      
      // Generate evidence document
      try {
        await generatePaymentApprovalEvidence({
          paymentId: String(input.id),
          paymentData: {
            amount: existing[0].amount,
            vendor: existing[0].vendorName || existing[0].vendorId?.toString(),
            description: existing[0].description,
          },
          approvalData: {
            approvedBy: ctx.user?.id || 0,
            approvedAt,
            comments: input.approvalNotes,
          },
          context: {
            organizationId,
            operatingUnitId: ctx.scope.operatingUnitId,
            userId: ctx.user?.id || 0,
          },
        });
      } catch (error) {
        console.error('Failed to generate payment approval evidence:', error);
        // Don't fail the approval if evidence generation fails
      }
      
      return { success: true };
    }),

  // Reject payment
  reject: scopedProcedure
    .input(z.object({ 
      id: z.number(),
      rejectionReason: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      
      const existing = await db.select().from(payments)
        .where(and(
          eq(payments.id, input.id),
          eq(payments.organizationId, organizationId)
        ))
        .limit(1);
      
      if (!existing[0]) {
        throw new Error('Payment not found');
      }
      
      if (existing[0].status !== 'pending_approval') {
        throw new Error('Only pending payments can be rejected');
      }
      
      await db.update(payments)
        .set({ 
          status: 'rejected',
          rejectedAt: new Date(),
          rejectedBy: ctx.user?.id,
          rejectionReason: input.rejectionReason,
          updatedBy: ctx.user?.id,
        })
        .where(eq(payments.id, input.id));
      
      return { success: true };
    }),

  // Process payment (mark as processing)
  process: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      
      const existing = await db.select().from(payments)
        .where(and(
          eq(payments.id, input.id),
          eq(payments.organizationId, organizationId)
        ))
        .limit(1);
      
      if (!existing[0]) {
        throw new Error('Payment not found');
      }
      
      if (existing[0].status !== 'approved') {
        throw new Error('Only approved payments can be processed');
      }
      
      await db.update(payments)
        .set({ 
          status: 'processing',
          updatedBy: ctx.user?.id,
        })
        .where(eq(payments.id, input.id));
      
      return { success: true };
    }),

  // Complete payment
  complete: scopedProcedure
    .input(z.object({ 
      id: z.number(),
      transactionReference: z.string().optional(),
      completedDate: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      
      const existing = await db.select().from(payments)
        .where(and(
          eq(payments.id, input.id),
          eq(payments.organizationId, organizationId)
        ))
        .limit(1);
      
      if (!existing[0]) {
        throw new Error('Payment not found');
      }
      
      if (existing[0].status !== 'approved' && existing[0].status !== 'processing') {
        throw new Error('Only approved or processing payments can be completed');
      }
      
      // Update payment status
      await db.update(payments)
        .set({ 
          status: 'completed',
          paidAt: input.completedDate || new Date(),
          transactionReference: input.transactionReference,
          updatedBy: ctx.user?.id,
        })
        .where(eq(payments.id, input.id));
      
      // Generate automated journal entry
      try {
        const { generatePaymentJournalEntry } = await import('./services/autoJournalEntryService');
        const journalEntryId = await generatePaymentJournalEntry(existing[0], ctx.user?.id || 'system');
        
        // Link journal entry to payment
        await db.update(payments)
          .set({ journalEntryId })
          .where(eq(payments.id, input.id));
      } catch (error) {
        // Log error but don't fail the completion
        console.error('Failed to generate journal entry for payment:', error);
        // In production, you might want to queue this for retry or alert finance team
      }

      // ============================================================================
      // PR-FINANCE INTEGRATION: Close Financial Cycle on Payment Completion
      // ============================================================================

      // Find procurement payable linked to this payment
      const [payable] = await db
        .select()
        .from(procurementPayables)
        .where(
          and(
            eq(procurementPayables.vendorId, existing[0].vendorId || 0),
            eq(procurementPayables.status, "approved")
          )
        )
        .limit(1);

      if (payable) {
        // Update payable to paid
        await db
          .update(procurementPayables)
          .set({
            status: "paid",
            paidAmount: existing[0].amount,
          })
          .where(eq(procurementPayables.id, payable.id));

        // Liquidate encumbrance
        if (payable.encumbranceId) {
          await db
            .update(financeEncumbrances)
            .set({
              status: "liquidated",
              liquidatedAmount: existing[0].amount,
              liquidatedDate: input.completedDate || new Date().toISOString(),
            })
            .where(eq(financeEncumbrances.id, payable.encumbranceId));
        }
      }
      
      return {
        success: true,
        message: payable ? "Payment completed - PR financial cycle closed" : "Payment completed",
      };
    }),

  // Cancel payment
  cancel: scopedProcedure
    .input(z.object({ 
      id: z.number(),
      cancellationReason: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      
      const existing = await db.select().from(payments)
        .where(and(
          eq(payments.id, input.id),
          eq(payments.organizationId, organizationId)
        ))
        .limit(1);
      
      if (!existing[0]) {
        throw new Error('Payment not found');
      }
      
      if (existing[0].status === 'completed') {
        throw new Error('Completed payments cannot be cancelled');
      }
      
      await db.update(payments)
        .set({ 
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledBy: ctx.user?.id,
          cancellationReason: input.cancellationReason,
          updatedBy: ctx.user?.id,
        })
        .where(eq(payments.id, input.id));
      
      return { success: true };
    }),

  // Get payment statistics
  getStats: scopedProcedure
    .input(z.object({
      fromDate: z.date().optional(),
      toDate: z.date().optional(),
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
      if (input.fromDate) {
        conditions.push(sql`${payments.paymentDate} >= ${input.fromDate}`);
      }
      if (input.toDate) {
        conditions.push(sql`${payments.paymentDate} <= ${input.toDate}`);
      }
      
      const stats = await db.select({
        status: payments.status,
        count: sql<number>`count(*)`,
        totalAmount: sql<string>`COALESCE(SUM(CAST(totalAmount AS DECIMAL(18,2))), 0)`,
      }).from(payments)
        .where(and(...conditions))
        .groupBy(payments.status);
      
      return stats;
    }),

  // Generate next payment number
  generateNumber: scopedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const { organizationId } = ctx.scope;
      const db = await getDb();
      const year = new Date().getFullYear();
      const result = await db.select({ 
        count: sql<number>`count(*)` 
      }).from(payments)
        .where(eq(payments.organizationId, organizationId));
      
      const nextNum = (result[0]?.count || 0) + 1;
      return `PAY-${year}-${nextNum.toString().padStart(6, '0')}`;
    }),
});

// Payment Lines Router
export const paymentLinesRouter = router({
  list: scopedProcedure
    .input(z.object({
      paymentId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      return db.select().from(paymentLines)
        .where(eq(paymentLines.paymentId, input.paymentId))
        .orderBy(asc(paymentLines.lineNumber));
    }),

  create: scopedProcedure
    .input(z.object({
      paymentId: z.number(),
      description: z.string().min(1).max(500),
      descriptionAr: z.string().max(500).optional(),
      glAccountId: z.number().optional(),
      budgetLineId: z.number().optional(),
      expenseId: z.number().optional(),
      amount: z.string(),
      taxAmount: z.string().optional(),
      netAmount: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      // Get next line number
      const existing = await db.select({
        maxLine: sql<number>`MAX(lineNumber)`
      }).from(paymentLines)
        .where(eq(paymentLines.paymentId, input.paymentId));
      
      const lineNumber = (existing[0]?.maxLine || 0) + 1;
      
      const result = await db.insert(paymentLines).values({
        ...input,
        lineNumber,
        createdBy: ctx.user?.id,
      });
      
      return { id: Number(result.insertId), success: true };
    }),

  update: scopedProcedure
    .input(z.object({
      id: z.number(),
      description: z.string().min(1).max(500).optional(),
      descriptionAr: z.string().max(500).optional().nullable(),
      glAccountId: z.number().optional().nullable(),
      budgetLineId: z.number().optional().nullable(),
      expenseId: z.number().optional().nullable(),
      amount: z.string().optional(),
      taxAmount: z.string().optional().nullable(),
      netAmount: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const { id, ...updateData } = input;
      await db.update(paymentLines)
        .set(updateData)
        .where(eq(paymentLines.id, id));
      return { success: true };
    }),

  delete: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.delete(paymentLines)
        .where(eq(paymentLines.id, input.id));
      return { success: true };
    }),
});
