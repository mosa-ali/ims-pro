import { z } from 'zod';
import { scopedProcedure, router } from '../../_core/trpc';
import { getDb } from '../../db';
import {
  procurementInvoices,
  serviceAcceptanceCertificates,
  contracts,
  procurementPayables,
} from '../../../drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

/**
 * Type 2 Invoice Router - Consultancy Procurement
 * 
 * Invoice creation for Type 2 (consultancy) PRs.
 * Validates that invoice amount does not exceed total approved SAC amounts.
 * Uses contractId + sacId instead of purchaseOrderId + grnId.
 */

const Type2InvoiceCreateInput = z.object({
  purchaseRequestId: z.number().int().positive(),
  contractId: z.number().int().positive(),
  sacId: z.number().int().positive().optional(), // Optional: link to specific SAC
  vendorId: z.number().int().positive(),
  vendorInvoiceNumber: z.string().min(1),
  invoiceDate: z.coerce.date(),
  invoiceAmount: z.number().positive(),
  currency: z.string().default('USD'),
  exchangeRate: z.number().optional(),
  invoiceDocumentUrl: z.string().optional(),
});

export const type2InvoiceRouter = router({
  /**
   * Upload supplier invoice document to S3
   */
  uploadDocument: scopedProcedure
    .input(z.object({
      fileName: z.string(),
      fileData: z.string(), // base64 encoded
      mimeType: z.string().default('application/pdf'),
      contractId: z.number().int().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { storagePut } = await import('../../storage');
      const { nanoid } = await import('nanoid');

      const orgId = ctx.scope.organizationId;
      const buffer = Buffer.from(input.fileData, 'base64');
      const randomSuffix = nanoid(8);
      const fileKey = `invoices/${orgId}/${input.contractId}/${randomSuffix}-${input.fileName}`;

      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      return { url, fileKey };
    }),

  /**
   * Check if invoice can be created (SAC coverage validation)
   */
  canCreate: scopedProcedure
    .input(z.object({ contractId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const orgId = ctx.scope.organizationId;

      // Check contract exists and is approved/active
      const contract = await db.query.contracts.findFirst({
        where: and(
          eq(contracts.id, input.contractId),
          eq(contracts.organizationId, orgId),
          sql`${contracts.isDeleted} = 0`
        ),
      });

      if (!contract) {
        return { allowed: false, reason: 'CONTRACT_NOT_FOUND' };
      }

      if (!['approved', 'active'].includes(contract.status)) {
        return { allowed: false, reason: 'CONTRACT_NOT_APPROVED' };
      }

      // Check at least one SAC is approved
      const approvedSACs = await db
        .select({
          count: sql<number>`COUNT(*)`,
          totalApproved: sql<string>`COALESCE(SUM(${serviceAcceptanceCertificates.approvedAmount}), 0)`,
        })
        .from(serviceAcceptanceCertificates)
        .where(
          and(
            eq(serviceAcceptanceCertificates.contractId, input.contractId),
            eq(serviceAcceptanceCertificates.status, 'approved'),
            sql`${serviceAcceptanceCertificates.isDeleted} = 0`
          )
        );

      const sacCount = Number(approvedSACs[0]?.count || 0);
      const totalApproved = parseFloat(approvedSACs[0]?.totalApproved || '0');

      if (sacCount === 0) {
        return { allowed: false, reason: 'NO_APPROVED_SAC' };
      }

      // Check existing invoice amounts
      const existingInvoices = await db
        .select({
          totalInvoiced: sql<string>`COALESCE(SUM(${procurementInvoices.invoiceAmount}), 0)`,
        })
        .from(procurementInvoices)
        .where(
          and(
            eq(procurementInvoices.contractId, input.contractId),
            sql`${procurementInvoices.approvalStatus} != 'rejected'`
          )
        );

      const totalInvoiced = parseFloat(existingInvoices[0]?.totalInvoiced || '0');
      const remaining = totalApproved - totalInvoiced;

      return {
        allowed: remaining > 0,
        reason: remaining <= 0 ? 'ALL_SAC_INVOICED' : undefined,
        data: {
          contractValue: contract.contractValue,
          totalApprovedSAC: totalApproved.toFixed(2),
          totalInvoiced: totalInvoiced.toFixed(2),
          remainingToInvoice: remaining.toFixed(2),
          currency: contract.currency,
        },
      };
    }),

  /**
   * Create Type 2 invoice (consultancy)
   */
  create: scopedProcedure
    .input(Type2InvoiceCreateInput)
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const orgId = ctx.scope.organizationId;
        const ouId = ctx.scope.operatingUnitId;

        // Validate contract
        const contract = await db.query.contracts.findFirst({
          where: and(
            eq(contracts.id, input.contractId),
            eq(contracts.organizationId, orgId),
            sql`${contracts.isDeleted} = 0`
          ),
        });

        if (!contract || !['approved', 'active'].includes(contract.status)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Contract must be approved' });
        }

        // Get total approved SAC amount
        const approvedSACs = await db
          .select({
            totalApproved: sql<string>`COALESCE(SUM(${serviceAcceptanceCertificates.approvedAmount}), 0)`,
          })
          .from(serviceAcceptanceCertificates)
          .where(
            and(
              eq(serviceAcceptanceCertificates.contractId, input.contractId),
              eq(serviceAcceptanceCertificates.status, 'approved'),
              sql`${serviceAcceptanceCertificates.isDeleted} = 0`
            )
          );

        const totalApproved = parseFloat(approvedSACs[0]?.totalApproved || '0');

        // Get existing invoiced amount
        const existingInvoices = await db
          .select({
            totalInvoiced: sql<string>`COALESCE(SUM(${procurementInvoices.invoiceAmount}), 0)`,
          })
          .from(procurementInvoices)
          .where(
            and(
              eq(procurementInvoices.contractId, input.contractId),
              sql`${procurementInvoices.approvalStatus} != 'rejected'`
            )
          );

        const totalInvoiced = parseFloat(existingInvoices[0]?.totalInvoiced || '0');
        const remaining = totalApproved - totalInvoiced;

        if (input.invoiceAmount > remaining) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Invoice amount (${input.invoiceAmount}) exceeds remaining SAC coverage (${remaining.toFixed(2)}). Total approved SAC: ${totalApproved.toFixed(2)}, Already invoiced: ${totalInvoiced.toFixed(2)}`,
          });
        }

        // Generate invoice number
        const invoiceNumber = `INV-${orgId}-${Date.now()}`;

        // Create invoice
        const [invoice] = await db
          .insert(procurementInvoices)
          .values({
            purchaseRequestId: input.purchaseRequestId,
            contractId: input.contractId,
            sacId: input.sacId || null,
            purchaseOrderId: null, // Type 2 has no PO
            grnId: null, // Type 2 has no GRN
            vendorId: input.vendorId,
            organizationId: orgId,
            operatingUnitId: ouId || 0,
            invoiceNumber,
            vendorInvoiceNumber: input.vendorInvoiceNumber,
            invoiceDate: input.invoiceDate.toISOString().split('T')[0],
            invoiceAmount: String(input.invoiceAmount),
            currency: input.currency,
            exchangeRate: input.exchangeRate ? String(input.exchangeRate) : '1.000000',
            invoiceDocumentUrl: input.invoiceDocumentUrl || null,
            matchingStatus: 'matched', // Type 2 uses SAC matching, not 3-way
            approvalStatus: 'pending',
            paymentStatus: 'unpaid',
            createdBy: ctx.user.id,
          })
          .$returningId();

        // Create payable record
        const payableNumber = `PAY-${orgId}-${Date.now()}`;
        await db.insert(procurementPayables).values({
          organizationId: orgId,
          operatingUnitId: ouId || 0,
          purchaseRequestId: input.purchaseRequestId,
          invoiceId: invoice.id,
          vendorId: input.vendorId,
          vendorName: contract.vendorName || 'Unknown',
          payableNumber,
          payableDate: input.invoiceDate.toISOString().split('T')[0],
          amount: String(input.invoiceAmount),
          currency: input.currency,
          status: 'pending',
          createdBy: ctx.user.id,
        });

        // Update invoice with payable link
        const payables = await db
          .select()
          .from(procurementPayables)
          .where(eq(procurementPayables.payableNumber, payableNumber))
          .limit(1);

        if (payables[0]) {
          await db
            .update(procurementInvoices)
            .set({ payableId: payables[0].id })
            .where(eq(procurementInvoices.id, invoice.id));
        }

        return { id: invoice.id, invoiceNumber };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('[Type2Invoice] Create error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create invoice',
        });
      }
    }),

  /**
   * List invoices for a contract (Type 2)
   */
  listByContract: scopedProcedure
    .input(z.object({ contractId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const invoices = await db
        .select()
        .from(procurementInvoices)
        .where(eq(procurementInvoices.contractId, input.contractId))
        .orderBy(desc(procurementInvoices.createdAt));

      return invoices;
    }),

  /**
   * Approve or reject Type 2 invoice
   */
  approve: scopedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      approve: z.boolean(),
      rejectionReason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const [invoice] = await db
        .select()
        .from(procurementInvoices)
        .where(eq(procurementInvoices.id, input.id))
        .limit(1);

      if (!invoice) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
      }

      if (invoice.approvalStatus !== 'pending') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot approve invoice in ${invoice.approvalStatus} status`,
        });
      }

      const newStatus = input.approve ? 'approved' : 'rejected';

      await db
        .update(procurementInvoices)
        .set({
          approvalStatus: newStatus,
          approvedBy: input.approve ? ctx.user.id : null,
          approvedAt: input.approve ? new Date().toISOString() : null,
          rejectionReason: !input.approve ? input.rejectionReason || null : null,
        })
        .where(eq(procurementInvoices.id, input.id));

      // If approved, update payable status
      if (input.approve && invoice.payableId) {
        await db
          .update(procurementPayables)
          .set({ status: 'approved' })
          .where(eq(procurementPayables.id, invoice.payableId));
      }

      return { success: true, status: newStatus };
    }),
});
