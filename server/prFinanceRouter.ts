/**
 * PR-Finance Integration tRPC Router
 * Exposes PR-Finance automation functions to frontend
 */

import { z } from "zod";
import { protectedProcedure, scopedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { sendPayableNotification } from "./payableNotificationService";
import {
  validateBudgetAvailability,
  createBudgetReservation,
  releaseBudgetReservation,
  createEncumbranceFromReservation,
  createPayableFromPO,
  createInvoiceWith3WayMatching,
  processPaymentAndClose,
} from "./prFinanceAutomation";
import { validateInvoiceMatchingBeforeApproval, storeMatchingResult } from "./matchingEnforcement";
import { validateInvoiceApprovalThreshold, validatePaymentApprovalThreshold } from "./approvalThresholdEngine";
import { getDb } from "./db";
import { eq, and, isNull } from "drizzle-orm";
import {
  prBudgetReservations,
  financeEncumbrances,
  procurementPayables,
  procurementInvoices,
  payableApprovalHistory,
  payments,
  paymentLines,
  // TEMP UNBLOCK: invoiceAuditTrail missing export
  // invoiceAuditTrail,
  users,
  organizations,
  userOrganizations,
} from "../drizzle/schema";
import { desc } from "drizzle-orm";

export const prFinanceRouter = router({
  // ============================================================================
  // BUDGET VALIDATION & RESERVATION
  // ============================================================================

  /**
   * Validate budget availability before PR submission
   */
  validateBudget: scopedProcedure
    .input(
      z.object({
        budgetLineId: z.number(),
        requestedAmount: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await validateBudgetAvailability(
        input.budgetLineId,
        input.requestedAmount
      );
    }),

  /**
   * Create budget reservation when PR is submitted
   */
  createReservation: scopedProcedure
    .input(
      z.object({
        purchaseRequestId: z.number(),
        budgetLineId: z.number(),
        projectId: z.number(),
        reservedAmount: z.number(),
        currency: z.string(),
        exchangeRate: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await createBudgetReservation({
        ...input,
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
        userId: ctx.user.id,
      });
    }),

  /**
   * Release budget reservation (PR rejected/cancelled)
   */
  releaseReservation: scopedProcedure
    .input(
      z.object({
        reservationId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify reservation belongs to this org before releasing
      const db = await getDb();
      const [reservation] = await db.select().from(prBudgetReservations)
        .where(and(
          eq(prBudgetReservations.id, input.reservationId),
          eq(prBudgetReservations.organizationId, ctx.scope.organizationId)
        )).limit(1);
      if (!reservation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Reservation not found' });
      }
      return await releaseBudgetReservation(input.reservationId);
    }),

  /**
   * Get budget reservation by PR ID
   */
  getReservationByPR: scopedProcedure
    .input(
      z.object({
        purchaseRequestId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const reservation = await db
        .select()
        .from(prBudgetReservations)
        .where(and(
          eq(prBudgetReservations.purchaseRequestId, input.purchaseRequestId),
          eq(prBudgetReservations.organizationId, ctx.scope.organizationId)
        ))
        .limit(1);
      return reservation[0] || null;
    }),

  // ============================================================================
  // ENCUMBRANCE MANAGEMENT
  // ============================================================================

  /**
   * Convert reservation to encumbrance when vendor selected
   */
  createEncumbrance: scopedProcedure
    .input(
      z.object({
        reservationId: z.number(),
        purchaseOrderId: z.number().optional(),
        vendorId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify reservation belongs to this org
      const db = await getDb();
      const [reservation] = await db.select().from(prBudgetReservations)
        .where(and(
          eq(prBudgetReservations.id, input.reservationId),
          eq(prBudgetReservations.organizationId, ctx.scope.organizationId)
        )).limit(1);
      if (!reservation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Reservation not found in this organization' });
      }
      return await createEncumbranceFromReservation({
        ...input,
        userId: ctx.user.id,
      });
    }),

  /**
   * Get encumbrance by PR ID
   */
  getEncumbranceByPR: scopedProcedure
    .input(
      z.object({
        purchaseRequestId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const encumbrance = await db
        .select()
        .from(financeEncumbrances)
        .where(and(
          eq(financeEncumbrances.purchaseRequestId, input.purchaseRequestId),
          eq(financeEncumbrances.organizationId, ctx.scope.organizationId)
        ))
        .limit(1);
      return encumbrance[0] || null;
    }),

  // ============================================================================
  // PAYABLES MANAGEMENT
  // ============================================================================

  /**
   * Create payable from purchase order
   */
  createPayable: scopedProcedure
    .input(
      z.object({
        purchaseRequestId: z.number(),
        purchaseOrderId: z.number(),
        vendorId: z.number(),
        encumbranceId: z.number().optional(),
        totalAmount: z.number(),
        currency: z.string(),
        exchangeRate: z.number().optional(),
        paymentTerms: z.string().optional(),
        dueDate: z.string().optional(), // YYYY-MM-DD date string
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await createPayableFromPO({
        ...input,
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
        userId: ctx.user.id,
      });
    }),

  /**
   * Get payable by PR ID
   */
  getPayableByPR: scopedProcedure
    .input(
      z.object({
        purchaseRequestId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const payable = await db
        .select()
        .from(procurementPayables)
        .where(and(
          eq(procurementPayables.purchaseRequestId, input.purchaseRequestId),
          eq(procurementPayables.organizationId, ctx.scope.organizationId),
          isNull(procurementPayables.deletedAt)
        ))
        .limit(1);
      return payable[0] || null;
    }),

  /**
   * Update payable status after GRN
   */
  updatePayableAfterGRN: scopedProcedure
    .input(
      z.object({
        payableId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      // Verify payable belongs to this org
      const [payable] = await db.select().from(procurementPayables)
        .where(and(
          eq(procurementPayables.id, input.payableId),
          eq(procurementPayables.organizationId, ctx.scope.organizationId),
          isNull(procurementPayables.deletedAt)
        )).limit(1);
      if (!payable) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Payable not found' });
      }
      await db
        .update(procurementPayables)
        .set({
          status: "pending_invoice",
        })
        .where(eq(procurementPayables.id, input.payableId));
      return { success: true, message: "Payable updated - ready for invoice" };
    }),

  // ============================================================================
  // INVOICE MATCHING & APPROVAL
  // ============================================================================

  /**
   * Create invoice with 3-way matching
   */
  createInvoice: scopedProcedure
    .input(
      z.object({
        purchaseRequestId: z.number(),
        purchaseOrderId: z.number(),
        grnId: z.number(),
        vendorId: z.number(),
        payableId: z.number().optional(),
        vendorInvoiceNumber: z.string(),
        invoiceDate: z.union([z.date(), z.string()]),
        invoiceAmount: z.number(),
        currency: z.string(),
        exchangeRate: z.number().optional(),
        invoiceDocumentUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await createInvoiceWith3WayMatching({
        ...input,
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
        userId: ctx.user.id,
      });
    }),

  /**
   * Get invoice by PR ID
   */
  getInvoiceByPR: scopedProcedure
    .input(
      z.object({
        purchaseRequestId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const invoice = await db
        .select()
        .from(procurementInvoices)
        .where(and(
          eq(procurementInvoices.purchaseRequestId, input.purchaseRequestId),
          eq(procurementInvoices.organizationId, ctx.scope.organizationId)
        ))
        .limit(1);
      return invoice[0] || null;
    }),

  /**
   * Approve invoice manually (for variance cases)
   */
  approveInvoice: scopedProcedure
    .input(
      z.object({
        invoiceId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      // Fetch invoice for validation - scoped to org
      const [invoice] = await db
        .select()
        .from(procurementInvoices)
        .where(and(
          eq(procurementInvoices.id, input.invoiceId),
          eq(procurementInvoices.organizationId, ctx.scope.organizationId)
        ))
        .limit(1);

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      // CRITICAL: Validate 3-way matching before approval
      await validateInvoiceMatchingBeforeApproval(db, input.invoiceId);
      
      // CRITICAL: Validate approval threshold (amount-based routing)
      // This enforces sequential approval tiers and makes skip-level approval impossible
      const invoiceAmount = parseFloat(invoice.invoiceAmount || "0");
      const userRole = ctx.user.role || "user";
      await validateInvoiceApprovalThreshold(db, input.invoiceId, invoiceAmount, userRole);

      // Approve invoice only after all validations pass
      await db
        .update(procurementInvoices)
        .set({
          approvalStatus: "approved",
          approvedBy: ctx.user.id,
          approvedAt: new Date().toISOString(),
        })
        .where(eq(procurementInvoices.id, input.invoiceId));

      // Update payable status
      if (invoice?.payableId) {
        await db
          .update(procurementPayables)
          .set({
            status: "pending_payment",
          })
          .where(eq(procurementPayables.id, invoice.payableId));
      }

      return { success: true, message: "Invoice approved successfully (3-way matching + approval threshold enforced)" };
    }),

    rejectInvoice: scopedProcedure
    .input(
      z.object({
        invoiceId: z.number(),
        rejectionReason: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      // Verify invoice belongs to this org
      const [invoice] = await db.select().from(procurementInvoices)
        .where(and(
          eq(procurementInvoices.id, input.invoiceId),
          eq(procurementInvoices.organizationId, ctx.scope.organizationId)
        )).limit(1);
      if (!invoice) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
      }
      await db
        .update(procurementInvoices)
        .set({
          approvalStatus: "rejected",
          rejectionReason: input.rejectionReason,
          matchingStatus: "rejected",
        })
        .where(eq(procurementInvoices.id, input.invoiceId));

      return { success: true, message: "Invoice rejected" };
    }),

  // ============================================================================
  // PAYMENT & CLOSURE
  // ============================================================================

  /**
   * Process payment and close PR financial cycle
   */
  processPayment: scopedProcedure
    .input(
      z.object({
        invoiceId: z.number(),
        paymentId: z.number(),
        paidAmount: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify invoice belongs to this org before processing payment
      const db = await getDb();
      const [invoice] = await db.select().from(procurementInvoices)
        .where(and(
          eq(procurementInvoices.id, input.invoiceId),
          eq(procurementInvoices.organizationId, ctx.scope.organizationId)
        )).limit(1);
      if (!invoice) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });
      }
      return await processPaymentAndClose({
        ...input,
        userId: ctx.user.id,
      });
    }),

  // ============================================================================
  // REPORTING & DASHBOARD
  // ============================================================================

  /**
   * Get complete PR financial status
   */
  getFinancialStatus: scopedProcedure
    .input(
      z.object({
        purchaseRequestId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();

      // Get all financial records for this PR - scoped to org
      const [reservation] = await db
        .select()
        .from(prBudgetReservations)
        .where(and(
          eq(prBudgetReservations.purchaseRequestId, input.purchaseRequestId),
          eq(prBudgetReservations.organizationId, ctx.scope.organizationId)
        ))
        .limit(1);

      const [encumbrance] = await db
        .select()
        .from(financeEncumbrances)
        .where(and(
          eq(financeEncumbrances.purchaseRequestId, input.purchaseRequestId),
          eq(financeEncumbrances.organizationId, ctx.scope.organizationId)
        ))
        .limit(1);

      const [payable] = await db
        .select()
        .from(procurementPayables)
        .where(and(
          eq(procurementPayables.purchaseRequestId, input.purchaseRequestId),
          eq(procurementPayables.organizationId, ctx.scope.organizationId),
          isNull(procurementPayables.deletedAt)
        ))
        .limit(1);

      const [invoice] = await db
        .select()
        .from(procurementInvoices)
        .where(and(
          eq(procurementInvoices.purchaseRequestId, input.purchaseRequestId),
          eq(procurementInvoices.organizationId, ctx.scope.organizationId)
        ))
        .limit(1);

      return {
        reservation: reservation || null,
        encumbrance: encumbrance || null,
        payable: payable || null,
        invoice: invoice || null,
        financialStage: invoice
          ? "payment"
          : payable
            ? "invoice"
            : encumbrance
              ? "encumbrance"
              : reservation
                ? "reservation"
                : "none",
      };
    }),

  /**
   * Get complete PR financial status (alias for backward compatibility)
   */
  getPRFinancialStatus: scopedProcedure
    .input(
      z.object({
        purchaseRequestId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();

      // Get all financial records for this PR - scoped to org
      const [reservation] = await db
        .select()
        .from(prBudgetReservations)
        .where(and(
          eq(prBudgetReservations.purchaseRequestId, input.purchaseRequestId),
          eq(prBudgetReservations.organizationId, ctx.scope.organizationId)
        ))
        .limit(1);

      const [encumbrance] = await db
        .select()
        .from(financeEncumbrances)
        .where(and(
          eq(financeEncumbrances.purchaseRequestId, input.purchaseRequestId),
          eq(financeEncumbrances.organizationId, ctx.scope.organizationId)
        ))
        .limit(1);

      const [payable] = await db
        .select()
        .from(procurementPayables)
        .where(and(
          eq(procurementPayables.purchaseRequestId, input.purchaseRequestId),
          eq(procurementPayables.organizationId, ctx.scope.organizationId),
          isNull(procurementPayables.deletedAt)
        ))
        .limit(1);

      const [invoice] = await db
        .select()
        .from(procurementInvoices)
        .where(and(
          eq(procurementInvoices.purchaseRequestId, input.purchaseRequestId),
          eq(procurementInvoices.organizationId, ctx.scope.organizationId)
        ))
        .limit(1);

      return {
        reservation: reservation || null,
        encumbrance: encumbrance || null,
        payable: payable || null,
        invoice: invoice || null,
        financialStage: invoice
          ? "payment"
          : payable
            ? "invoice"
            : encumbrance
              ? "encumbrance"
              : reservation
                ? "reservation"
                : "none",
      };
    }),

  /**
   * Get budget line financial summary
   */
  getBudgetLineSummary: scopedProcedure
    .input(
      z.object({
        budgetLineId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();

      // Get active reservations - scoped to org
      const activeReservations = await db
        .select()
        .from(prBudgetReservations)
        .where(and(
          eq(prBudgetReservations.budgetLineId, input.budgetLineId),
          eq(prBudgetReservations.organizationId, ctx.scope.organizationId)
        ));

      // Get active encumbrances - scoped to org
      const activeEncumbrances = await db
        .select()
        .from(financeEncumbrances)
        .where(and(
          eq(financeEncumbrances.budgetLineId, input.budgetLineId),
          eq(financeEncumbrances.organizationId, ctx.scope.organizationId)
        ));

      const totalReserved = activeReservations
        .filter((r) => r.status === "active")
        .reduce((sum, r) => sum + parseFloat(r.reservedAmount), 0);

      const totalEncumbered = activeEncumbrances
        .filter((e) => e.status === "active" || e.status === "partially_liquidated")
        .reduce((sum, e) => sum + parseFloat(e.remainingAmount || "0"), 0);

      return {
        activeReservationsCount: activeReservations.filter((r) => r.status === "active").length,
        totalReserved,
        activeEncumbrancesCount: activeEncumbrances.filter(
          (e) => e.status === "active" || e.status === "partially_liquidated"
        ).length,
        totalEncumbered,
        totalCommitted: totalReserved + totalEncumbered,
      };
    }),

  // ============================================================================
  // INVOICE MATCHING UI SUPPORT
  // ============================================================================

  /**
   * Get payable by ID for invoice matching
   */
  getPayableById: scopedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const [payable] = await db
        .select()
        .from(procurementPayables)
        .where(and(
          eq(procurementPayables.id, input.id),
          eq(procurementPayables.organizationId, ctx.scope.organizationId),
          isNull(procurementPayables.deletedAt)
        ))
        .limit(1);
      return payable;
    }),

  /**
   * Get matching data (PR/PO/GRN amounts) for 3-way matching
   */
  getMatchingData: scopedProcedure
    .input(z.object({ payableId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const { purchaseRequests, purchaseOrders, goodsReceiptNotes, vendors, purchaseRequestLineItems, purchaseOrderLineItems, grnLineItems, contracts, serviceAcceptanceCertificates } = await import("../drizzle/schema");

      // Get payable
      const [payable] = await db
        .select()
        .from(procurementPayables)
        .where(
          and(
            eq(procurementPayables.id, input.payableId),
            eq(procurementPayables.organizationId, ctx.scope.organizationId)
          )
        )
        .limit(1);

      if (!payable) {
        throw new Error("Payable not found");
      }

      // Determine matching type based on payable source
      const isServicesPayable = !!(payable as any).sacId;

      // Get vendor (common to both flows)
      const [vendor] = payable.vendorId
        ? await db
            .select()
            .from(vendors)
            .where(eq(vendors.id, payable.vendorId))
            .limit(1)
        : [null];

      const payableAmount = parseFloat(payable.totalAmount || "0");

      // ════════════════════════════════════════════════════════════════════════
      // SERVICES MATCHING: Contract / SAC / Invoice
      // ════════════════════════════════════════════════════════════════════════
      if (isServicesPayable) {
        // Get Contract
        const [contract] = (payable as any).contractId
          ? await db
              .select()
              .from(contracts)
              .where(eq(contracts.id, (payable as any).contractId))
              .limit(1)
          : [null];

        // Get SAC
        const [sac] = (payable as any).sacId
          ? await db
              .select()
              .from(serviceAcceptanceCertificates)
              .where(eq(serviceAcceptanceCertificates.id, (payable as any).sacId))
              .limit(1)
          : [null];

        // Get Invoice linked to this payable (if any)
        const [invoice] = await db
          .select()
          .from(procurementInvoices)
          .where(
            and(
              eq(procurementInvoices.purchaseRequestId, payable.purchaseRequestId),
              eq(procurementInvoices.organizationId, ctx.scope.organizationId)
            )
          )
          .limit(1);

        // Contract value = total contract value
        const contractAmount = parseFloat(contract?.contractValue?.toString() || "0");

        // SAC approved amount = amount certified for this specific SAC
        const sacAmount = parseFloat(sac?.approvedAmount?.toString() || "0");

        // Invoice amount (if uploaded)
        const invoiceAmount = invoice ? parseFloat(invoice.invoiceAmount?.toString() || "0") : 0;
        const hasInvoice = !!invoice;

        // Calculate cumulative SAC payables for this contract
        let cumulativeSacPayables = 0;
        if ((payable as any).contractId) {
          const contractPayables = await db
            .select()
            .from(procurementPayables)
            .where(
              and(
                eq((procurementPayables as any).contractId, (payable as any).contractId),
                eq(procurementPayables.organizationId, ctx.scope.organizationId)
              )
            );
          cumulativeSacPayables = contractPayables
            .filter((p: any) => p.status !== 'cancelled')
            .reduce((sum: number, p: any) => sum + parseFloat(p.totalAmount?.toString() || '0'), 0);
        }

        // Services 3-way matching:
        // 1. Contract Value vs Cumulative SAC Payables (budget control)
        // 2. SAC Approved Amount vs Payable Amount (should match exactly)
        // 3. Invoice Amount vs SAC Approved Amount (if invoice uploaded)
        const discrepancies: string[] = [];

        // Check 1: Cumulative payables vs contract value
        const contractVariance = cumulativeSacPayables - contractAmount;
        if (contractAmount > 0 && contractVariance > 0) {
          discrepancies.push(
            `Cumulative SAC payables ($${cumulativeSacPayables.toFixed(2)}) exceed contract value ($${contractAmount.toFixed(2)}) by $${contractVariance.toFixed(2)}`
          );
        }

        // Check 2: SAC amount vs payable amount
        const sacPayableVariance = payableAmount - sacAmount;
        if (sacAmount > 0 && Math.abs(sacPayableVariance) > 0.01) {
          discrepancies.push(
            `Payable amount ($${payableAmount.toFixed(2)}) differs from SAC approved amount ($${sacAmount.toFixed(2)}) by $${Math.abs(sacPayableVariance).toFixed(2)}`
          );
        }

        // Check 3: Invoice amount vs SAC amount (if invoice exists)
        if (hasInvoice && invoiceAmount > 0) {
          const invoiceSacVariance = invoiceAmount - sacAmount;
          if (Math.abs(invoiceSacVariance) > 0.01) {
            discrepancies.push(
              `Invoice amount ($${invoiceAmount.toFixed(2)}) differs from SAC approved amount ($${sacAmount.toFixed(2)}) by $${Math.abs(invoiceSacVariance).toFixed(2)}`
            );
          }
        }

        // Overall variance: payable vs SAC (primary matching)
        const variance = sacAmount > 0 ? payableAmount - sacAmount : 0;
        const variancePercentage = sacAmount > 0 ? (variance / sacAmount) * 100 : 0;

        // Determine matching status
        let matchingStatus: 'matched' | 'variance_detected' | 'pending' = 'pending';
        if (hasInvoice) {
          matchingStatus = discrepancies.length === 0 ? 'matched' : 'variance_detected';
        }

        return {
          matchingType: 'services' as const,
          // Services-specific fields
          contractNumber: contract?.contractNumber || "N/A",
          contractAmount: contractAmount.toFixed(2),
          sacNumber: sac?.sacNumber || "N/A",
          sacAmount: sacAmount.toFixed(2),
          invoiceNumber: invoice?.invoiceNumber || "N/A",
          invoiceAmount: invoiceAmount.toFixed(2),
          hasInvoice,
          cumulativeSacPayables: cumulativeSacPayables.toFixed(2),
          // Common fields
          payableAmount: payableAmount.toFixed(2),
          variance: variance.toFixed(2),
          variancePercentage: variancePercentage.toFixed(2),
          vendorName: vendor?.name || "Unknown Vendor",
          discrepancies,
          matchingStatus,
          // Goods fields (null for services)
          prNumber: "N/A",
          prAmount: "0.00",
          poNumber: "N/A",
          poAmount: "0.00",
          grnNumber: "N/A",
          grnReceivedAmount: "0.00",
          grnAcceptedAmount: "0.00",
          grnAmount: "0.00",
        };
      }

      // ════════════════════════════════════════════════════════════════════════
      // GOODS/WORKS MATCHING: PR / PO / GRN (existing logic)
      // ════════════════════════════════════════════════════════════════════════

      // Get PR
      const [pr] = payable.purchaseRequestId
        ? await db
            .select()
            .from(purchaseRequests)
            .where(eq(purchaseRequests.id, payable.purchaseRequestId))
            .limit(1)
        : [null];

      // Get PO
      const [po] = payable.purchaseOrderId
        ? await db
            .select()
            .from(purchaseOrders)
            .where(eq(purchaseOrders.id, payable.purchaseOrderId))
            .limit(1)
        : [null];

      // Get GRN
      const [grn] = payable.grnId
        ? await db
            .select()
            .from(goodsReceiptNotes)
            .where(eq(goodsReceiptNotes.id, payable.grnId))
            .limit(1)
        : [null];

      // Use prTotalUsd from the purchase request record
      const prAmount = parseFloat(pr?.prTotalUsd?.toString() || pr?.total?.toString() || "0");

      // Calculate PO Amount from PO line items
      let poAmount = 0;
      if (po?.id) {
        const poLines = await db
          .select()
          .from(purchaseOrderLineItems)
          .where(eq(purchaseOrderLineItems.purchaseOrderId, po.id));
        poAmount = poLines.reduce((sum, line) => sum + parseFloat(line.totalPrice || "0"), 0);
      }

      // Calculate GRN Amount from GRN line items (receivedQty * PO unitPrice)
      let grnReceivedAmount = 0;
      let grnAcceptedAmount = 0;
      if (grn?.id) {
        const grnLines = await db
          .select()
          .from(grnLineItems)
          .where(eq(grnLineItems.grnId, grn.id));
        
        for (const grnLine of grnLines) {
          if (grnLine.poLineItemId) {
            const [poLine] = await db
              .select()
              .from(purchaseOrderLineItems)
              .where(eq(purchaseOrderLineItems.id, grnLine.poLineItemId))
              .limit(1);
            
            if (poLine) {
              const receivedQty = parseFloat(grnLine.receivedQty || "0");
              const acceptedQty = parseFloat(grnLine.acceptedQty || "0");
              const unitPrice = parseFloat(poLine.unitPrice || "0");
              
              grnReceivedAmount += receivedQty * unitPrice;
              grnAcceptedAmount += acceptedQty * unitPrice;
            }
          }
        }
      }

      // Variance: Payable - GRN Accepted
      const variance = payableAmount - grnAcceptedAmount;
      const variancePercentage = grnAcceptedAmount > 0 ? (variance / grnAcceptedAmount) * 100 : 0;

      return {
        matchingType: 'goods' as const,
        prNumber: pr?.prNumber || "N/A",
        prAmount: prAmount.toFixed(2),
        poNumber: po?.poNumber || "N/A",
        poAmount: poAmount.toFixed(2),
        grnNumber: grn?.grnNumber || "N/A",
        grnReceivedAmount: grnReceivedAmount.toFixed(2),
        grnAcceptedAmount: grnAcceptedAmount.toFixed(2),
        grnAmount: grnAcceptedAmount.toFixed(2),
        payableAmount: payableAmount.toFixed(2),
        variance: variance.toFixed(2),
        variancePercentage: variancePercentage.toFixed(2),
        vendorName: vendor?.name || "Unknown Vendor",
        discrepancies: variance !== 0 ? [`Variance of $${Math.abs(variance).toFixed(2)} detected between payable and GRN accepted amount`] : [],
        // Services fields (null for goods)
        contractNumber: "N/A",
        contractAmount: "0.00",
        sacNumber: "N/A",
        sacAmount: "0.00",
        invoiceNumber: "N/A",
        invoiceAmount: "0.00",
        hasInvoice: false,
        cumulativeSacPayables: "0.00",
        matchingStatus: variance === 0 ? 'matched' as const : 'variance_detected' as const,
      };
    }),

  /**
   * Submit invoice with automatic 3-way matching
   */
  submitInvoice: scopedProcedure
    .input(
      z.object({
        payableId: z.number(),
        invoiceNumber: z.string(),
        invoiceDate: z.union([z.date(), z.string()]),
        invoiceAmount: z.string(),
        description: z.string().optional(),
        attachmentUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const TOLERANCE_THRESHOLD = 0.05; // 5%

      // Get payable and matching data - scoped to org + soft delete
      const [payable] = await db
        .select()
        .from(procurementPayables)
        .where(and(
          eq(procurementPayables.id, input.payableId),
          eq(procurementPayables.organizationId, ctx.scope.organizationId),
          isNull(procurementPayables.deletedAt)
        ))
        .limit(1);

      if (!payable) {
        throw new TRPCError({ code: 'NOT_FOUND', message: "Payable not found" });
      }

      const invoiceAmount = parseFloat(input.invoiceAmount);
      const isServicesPayable = !!(payable as any).sacId;

      let matchingStatus: string;
      let withinTolerance: boolean;
      let poAmountVal = 0;
      let grnAmountVal = 0;
      let sacAmountVal = 0;
      let contractAmountVal = 0;
      let varianceAmount = 0;
      let poVariance = 0;
      let grnVariance = 0;

      if (isServicesPayable) {
        // ═══════════════════════════════════════════════════════════════
        // SERVICES MATCHING: Contract / SAC / Invoice
        // ═══════════════════════════════════════════════════════════════
        const { contracts, serviceAcceptanceCertificates } = await import("../drizzle/schema");

        // Get Contract
        const [contract] = (payable as any).contractId
          ? await db.select().from(contracts).where(eq(contracts.id, (payable as any).contractId)).limit(1)
          : [null];

        // Get SAC
        const [sac] = (payable as any).sacId
          ? await db.select().from(serviceAcceptanceCertificates).where(eq(serviceAcceptanceCertificates.id, (payable as any).sacId)).limit(1)
          : [null];

        contractAmountVal = parseFloat(contract?.contractValue?.toString() || "0");
        sacAmountVal = parseFloat(sac?.approvedAmount?.toString() || "0");

        // Services matching: Invoice vs SAC approved amount
        const sacVariance = sacAmountVal > 0 ? Math.abs((invoiceAmount - sacAmountVal) / sacAmountVal) : 0;
        varianceAmount = invoiceAmount - sacAmountVal;

        // Also check cumulative payables vs contract ceiling
        let cumulativeSacPayables = 0;
        if ((payable as any).contractId) {
          const contractPayables = await db.select().from(procurementPayables)
            .where(and(
              eq((procurementPayables as any).contractId, (payable as any).contractId),
              eq(procurementPayables.organizationId, ctx.scope.organizationId),
              isNull(procurementPayables.deletedAt)
            ));
          cumulativeSacPayables = contractPayables
            .filter((p: any) => p.status !== 'cancelled')
            .reduce((sum: number, p: any) => sum + parseFloat(p.totalAmount?.toString() || '0'), 0);
        }

        const exceedsContract = contractAmountVal > 0 && cumulativeSacPayables > contractAmountVal;
        withinTolerance = sacVariance <= TOLERANCE_THRESHOLD && !exceedsContract;
        matchingStatus = withinTolerance ? "matched" : "variance_detected";

      } else {
        // ═══════════════════════════════════════════════════════════════
        // GOODS MATCHING: PO / GRN / Invoice
        // ═══════════════════════════════════════════════════════════════
        const { purchaseOrders, goodsReceiptNotes } = await import("../drizzle/schema");
        const [po] = payable.purchaseOrderId
          ? await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, payable.purchaseOrderId)).limit(1)
          : [null];

        const [grn] = payable.grnId
          ? await db.select().from(goodsReceiptNotes).where(eq(goodsReceiptNotes.id, payable.grnId)).limit(1)
          : [null];

        poAmountVal = parseFloat(po?.totalAmount || "0");
        grnAmountVal = parseFloat(grn?.totalAmount || "0");

        poVariance = poAmountVal > 0 ? Math.abs((invoiceAmount - poAmountVal) / poAmountVal) : 0;
        grnVariance = grnAmountVal > 0 ? Math.abs((invoiceAmount - grnAmountVal) / grnAmountVal) : 0;
        const maxVariance = Math.max(poVariance, grnVariance);

        withinTolerance = maxVariance <= TOLERANCE_THRESHOLD;
        matchingStatus = withinTolerance ? "matched" : "variance_detected";
        varianceAmount = invoiceAmount - grnAmountVal;
      }

      const invoiceStatus = withinTolerance ? "approved" : "pending_approval";

      // Create invoice record
      const invoiceResult = await db
        .insert(procurementInvoices)
        .values({
          payableId: input.payableId,
          purchaseRequestId: payable.purchaseRequestId,
          purchaseOrderId: payable.purchaseOrderId,
          grnId: payable.grnId,
          vendorId: payable.vendorId,
          organizationId: ctx.scope.organizationId,
          operatingUnitId: ctx.scope.operatingUnitId,
          invoiceNumber: input.invoiceNumber,
          invoiceDate: input.invoiceDate instanceof Date ? input.invoiceDate.toISOString().split('T')[0] : String(input.invoiceDate).split('T')[0],
          invoiceAmount: input.invoiceAmount,
          matchingStatus,
          approvalStatus: invoiceStatus === "approved" ? "approved" : "pending",
          prAmount: payable.totalAmount || "0",
          poAmount: poAmountVal.toFixed(2),
          grnAmount: grnAmountVal.toFixed(2),
          varianceAmount: varianceAmount.toFixed(2),
          invoiceDocumentUrl: input.attachmentUrl || null,
          createdBy: ctx.user.id,
        })
        .$returningId();
      const invoiceId = invoiceResult[0]?.id ?? 0;

      // Update payable status and matching status
      await db
        .update(procurementPayables)
        .set({
          status: withinTolerance ? "pending_payment" : "pending_approval",
          matchingStatus: matchingStatus as any,
        })
        .where(eq(procurementPayables.id, input.payableId));

      return {
        invoiceId,
        autoApproved: withinTolerance,
        matchingStatus,
        matchingType: isServicesPayable ? 'services' : 'goods',
        poVariance: (poVariance * 100).toFixed(2) + "%",
        grnVariance: (grnVariance * 100).toFixed(2) + "%",
        sacVariance: sacAmountVal > 0 ? ((Math.abs(invoiceAmount - sacAmountVal) / sacAmountVal) * 100).toFixed(2) + "%" : "0.00%",
      };
    }),

  // ============================================================================
  // BUDGET UTILIZATION DASHBOARD
  // ============================================================================

  /**
   * Get budget lines with utilization data
   */
  getBudgetLinesUtilization: scopedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const { budgetLines, projects, donors } = await import("../drizzle/schema");

    // Get all budget lines scoped to org
    const allBudgetLines = await db.select().from(budgetLines)
      .where(eq(budgetLines.organizationId, ctx.scope.organizationId));

    // Calculate utilization for each budget line
    const utilizationData = await Promise.all(
      allBudgetLines.map(async (bl) => {
        // Get active reservations - scoped to org
        const activeReservations = await db
          .select()
          .from(prBudgetReservations)
          .where(and(
            eq(prBudgetReservations.budgetLineId, bl.id),
            eq(prBudgetReservations.organizationId, ctx.scope.organizationId)
          ));

        const totalReserved = activeReservations
          .filter((r) => r.status === "active")
          .reduce((sum, r) => sum + parseFloat(r.reservedAmount), 0);

        // Get active encumbrances - scoped to org
        const activeEncumbrances = await db
          .select()
          .from(financeEncumbrances)
          .where(and(
            eq(financeEncumbrances.budgetLineId, bl.id),
            eq(financeEncumbrances.organizationId, ctx.scope.organizationId)
          ));

        const totalEncumbered = activeEncumbrances
          .filter((e) => e.status === "active" || e.status === "partially_liquidated")
          .reduce((sum, e) => sum + parseFloat(e.remainingAmount || "0"), 0);

        // Get project/donor name
        let projectName = null;
        let donorName = null;

        if (bl.projectId) {
          const [project] = await db
            .select()
            .from(projects)
            .where(eq(projects.id, bl.projectId))
            .limit(1);
          projectName = project?.name;
        }

        if (bl.donorId) {
          const [donor] = await db
            .select()
            .from(donors)
            .where(eq(donors.id, bl.donorId))
            .limit(1);
          donorName = donor?.name;
        }

        return {
          id: bl.id,
          code: bl.code,
          description: bl.description,
          totalAmount: bl.totalAmount,
          totalReserved: totalReserved.toString(),
          totalEncumbered: totalEncumbered.toString(),
          projectName,
          donorName,
        };
      })
    );

    return utilizationData;
  }),

  /**
   * Get reservations by budget line
   */
  getReservationsByBudgetLine: scopedProcedure
    .input(z.object({ budgetLineId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const { purchaseRequests } = await import("../drizzle/schema");

      const reservations = await db
        .select()
        .from(prBudgetReservations)
        .where(and(
          eq(prBudgetReservations.budgetLineId, input.budgetLineId),
          eq(prBudgetReservations.organizationId, ctx.scope.organizationId)
        ));

      // Enrich with PR numbers
      const enrichedReservations = await Promise.all(
        reservations.map(async (res) => {
          const [pr] = res.purchaseRequestId
            ? await db
                .select()
                .from(purchaseRequests)
                .where(eq(purchaseRequests.id, res.purchaseRequestId))
                .limit(1)
            : [null];

          return {
            ...res,
            prNumber: pr?.prNumber || "N/A",
          };
        })
      );

      return enrichedReservations;
    }),

  /**
   * Get encumbrances by budget line
   */
  getEncumbrancesByBudgetLine: scopedProcedure
    .input(z.object({ budgetLineId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const { purchaseOrders } = await import("../drizzle/schema");

      const encumbrances = await db
        .select()
        .from(financeEncumbrances)
        .where(and(
          eq(financeEncumbrances.budgetLineId, input.budgetLineId),
          eq(financeEncumbrances.organizationId, ctx.scope.organizationId)
        ));

      // Enrich with PO numbers
      const enrichedEncumbrances = await Promise.all(
        encumbrances.map(async (enc) => {
          const [po] = enc.purchaseOrderId
            ? await db
                .select()
                .from(purchaseOrders)
                .where(eq(purchaseOrders.id, enc.purchaseOrderId))
                .limit(1)
            : [null];

          return {
            ...enc,
            poNumber: po?.poNumber || "N/A",
          };
        })
      );

      return enrichedEncumbrances;
    }),

  /**
   * Get payables list with filtering
   */
  getPayablesList: scopedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        vendorSearch: z.string().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const { purchaseRequests, purchaseOrders, goodsReceiptNotes, vendors, contracts, serviceAcceptanceCertificates } = await import("../drizzle/schema");

      // Get payables filtered by active scope (from header selector, not user's default org)
      let query = db.select().from(procurementPayables)
        .where(and(
          eq(procurementPayables.organizationId, ctx.scope.organizationId),
          isNull(procurementPayables.deletedAt)
        ));
      
      if (ctx.scope.operatingUnitId) {
        query = query.where(eq(procurementPayables.operatingUnitId, ctx.scope.operatingUnitId));
      }

      // Apply status filter
      if (input.status) {
        query = query.where(eq(procurementPayables.status, input.status)) as any;
      }

      const allPayables = await query;

      // Enrich with PR/PO/GRN/Contract/SAC/Vendor data and apply additional filters
      const enrichedPayables = await Promise.all(
        allPayables.map(async (payable) => {
          // Get PR
          const [pr] = payable.purchaseRequestId
            ? await db
                .select()
                .from(purchaseRequests)
                .where(eq(purchaseRequests.id, payable.purchaseRequestId))
                .limit(1)
            : [null];

          // Get PO (Goods/Works workflow)
          const [po] = payable.purchaseOrderId
            ? await db
                .select()
                .from(purchaseOrders)
                .where(eq(purchaseOrders.id, payable.purchaseOrderId))
                .limit(1)
            : [null];

          // Get GRN (Goods/Works workflow)
          const [grn] = payable.grnId
            ? await db
                .select()
                .from(goodsReceiptNotes)
                .where(eq(goodsReceiptNotes.id, payable.grnId))
                .limit(1)
            : [null];

          // Get Contract (Services workflow)
          const [contract] = (payable as any).contractId
            ? await db
                .select()
                .from(contracts)
                .where(eq(contracts.id, (payable as any).contractId))
                .limit(1)
            : [null];

          // Get SAC (Services workflow)
          const [sac] = (payable as any).sacId
            ? await db
                .select()
                .from(serviceAcceptanceCertificates)
                .where(eq(serviceAcceptanceCertificates.id, (payable as any).sacId))
                .limit(1)
            : [null];

          // Get Vendor
          const [vendor] = payable.vendorId
            ? await db
                .select()
                .from(vendors)
                .where(eq(vendors.id, payable.vendorId))
                .limit(1)
            : [null];

          // Determine source type: 'goods' (PO/GRN) or 'services' (Contract/SAC)
          const sourceType = (payable as any).sacId ? 'services' : 'goods';

          // For services: compute cumulative payables against contract value
          let contractValue: string | null = null;
          let cumulativePayables: number | null = null;
          let contractExceeded = false;
          if (contract) {
            contractValue = contract.contractValue?.toString() || null;
            if (contractValue) {
              // Sum all payables for this contract (excluding cancelled)
              const contractPayables = allPayables.filter(
                (p: any) => p.contractId === (payable as any).contractId && p.status !== 'cancelled'
              );
              cumulativePayables = contractPayables.reduce(
                (sum: number, p: any) => sum + parseFloat(p.totalAmount?.toString() || '0'), 0
              );
              contractExceeded = cumulativePayables > parseFloat(contractValue);
            }
          }

          return {
            id: payable.id,
            payableId: payable.payableNumber || `PAY-${payable.id}`,
            // Raw numeric IDs for dialog props
            purchaseRequestId: payable.purchaseRequestId,
            purchaseOrderId: payable.purchaseOrderId || null,
            grnId: payable.grnId || null,
            vendorId: payable.vendorId,
            organizationId: payable.organizationId,
            operatingUnitId: payable.operatingUnitId,
            // Display fields
            prNumber: pr?.prNumber || null,
            poNumber: po?.poNumber || null,
            grnNumber: grn?.grnNumber || null,
            contractNumber: contract?.contractNumber || null,
            sacNumber: sac?.sacNumber || null,
            vendorName: vendor?.name || null,
            amount: payable.totalAmount?.toString() || "0",
            // Default dueDate to createdAt + 30 days when null
            dueDate: payable.dueDate ?? (payable.createdAt ? new Date(new Date(payable.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000) : null),
            status: payable.status,
            approvalStatus: (payable as any).approvalStatus || null,
            createdAt: payable.createdAt,
            sourceType,
            contractValue,
            cumulativePayables: cumulativePayables?.toString() || null,
            contractExceeded,
            matchingStatus: (payable as any).matchingStatus || 'pending',
            paidAmount: payable.paidAmount?.toString() || '0',
            remainingAmount: payable.remainingAmount?.toString() || payable.totalAmount?.toString() || '0',
            contractId: (payable as any).contractId || null,
            sacId: (payable as any).sacId || null,
          };
        })
      );

      // Apply vendor search filter
      let filteredPayables = enrichedPayables;
      if (input.vendorSearch) {
        const searchLower = input.vendorSearch.toLowerCase();
        filteredPayables = filteredPayables.filter(
          (p) => p.vendorName?.toLowerCase().includes(searchLower)
        );
      }

      // Apply date range filter
      if (input.dateFrom) {
        filteredPayables = filteredPayables.filter(
          (p) => p.createdAt && new Date(p.createdAt) >= input.dateFrom!
        );
      }
      if (input.dateTo) {
        filteredPayables = filteredPayables.filter(
          (p) => p.createdAt && new Date(p.createdAt) <= input.dateTo!
        );
      }

      // Sort by created date descending
      filteredPayables.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      return filteredPayables;
    }),

  /**
   * Get payables summary statistics
   */
  getPayablesSummary: scopedProcedure.query(async ({ ctx }) => {
    const db = await getDb();

    // Filter payables by active scope (from header selector, not user's default org)
    let query = db.select().from(procurementPayables)
      .where(and(
        eq(procurementPayables.organizationId, ctx.scope.organizationId),
        isNull(procurementPayables.deletedAt)
      ));
    
    if (ctx.scope.operatingUnitId) {
      query = query.where(eq(procurementPayables.operatingUnitId, ctx.scope.operatingUnitId));
    }

    const allPayables = await query;

    const totalPayables = allPayables.reduce(
      (sum, p) => sum + parseFloat(p.totalAmount || "0"),
      0
    );

    const pendingInvoices = allPayables.filter(
      (p) => p.status === "pending_invoice"
    ).length;

    const pendingApprovals = allPayables.filter(
      (p) => p.status === "pending_approval"
    ).length;

    const approved = allPayables.filter((p) => p.status === "approved").length;

    const paid = allPayables.filter((p) => p.status === "paid").length;

    return {
      totalPayables,
      pendingInvoices,
      pendingApprovals,
      approved,
      paid,
    };
  }),

  /**
   * Upload invoice file and create invoice record
   */
  uploadInvoice: scopedProcedure
    .input(
      z.object({
        purchaseRequestId: z.number(),
        purchaseOrderId: z.number(),
        grnId: z.number(),
        vendorId: z.number(),
        vendorInvoiceNumber: z.string(),
        invoiceDate: z.union([z.date(), z.string()]),
        invoiceAmount: z.number(),
        currency: z.string().default("USD"),
        exchangeRate: z.number().optional(),
        invoiceDocumentUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await createInvoiceWith3WayMatching({
        ...input,
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
        userId: ctx.user.id,
      });
    }),

  /**
   * Get all invoices for a PR with matching status
   */
  getInvoicesByPR: scopedProcedure
    .input(
      z.object({
        purchaseRequestId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const invoices = await db
        .select()
        .from(procurementInvoices)
        .where(and(
          eq(procurementInvoices.purchaseRequestId, input.purchaseRequestId),
          eq(procurementInvoices.organizationId, ctx.scope.organizationId),
        ));
      return invoices || [];
    }),

  /**
   * Record a payment for a payable
   */
  recordPayment: scopedProcedure
    .input(
      z.object({
        payableId: z.number(),
        paymentDate: z.string(), // YYYY-MM-DD date string to avoid timezone shifts
        paymentMethod: z.enum(["bank_transfer", "cheque", "cash", "wire"]),
        referenceNumber: z.string(),
        amount: z.number(),
        remarks: z.string().optional(),
        proofFileUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { vendors } = await import("../drizzle/schema");
      try {
        const [payable] = await db
          .select()
          .from(procurementPayables)
          .where(and(
            eq(procurementPayables.id, input.payableId),
            eq(procurementPayables.organizationId, ctx.scope.organizationId),
            isNull(procurementPayables.deletedAt)
          ))
          .limit(1);
        if (!payable) {
          return { success: false, message: "Payable not found" };
        }
        // Look up vendor name from vendors table
        let vendorName = 'Unknown';
        if (payable.vendorId) {
          const [vendor] = await db.select().from(vendors).where(eq(vendors.id, payable.vendorId)).limit(1);
          if (vendor) vendorName = vendor.name || 'Unknown';
        }
        const paymentNumber = `PAY-${ctx.scope.organizationId}-${Date.now()}`;
        const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
        // Use unified payments table
        const paymentInsertResult = await db
          .insert(payments)
          .values({
            organizationId: ctx.scope.organizationId,
            operatingUnitId: ctx.scope.operatingUnitId || payable.operatingUnitId,
            paymentNumber,
            paymentDate: input.paymentDate,
            paymentType: 'vendor',
            paymentMethod: input.paymentMethod,
            payeeType: 'vendor',
            payeeId: payable.vendorId,
            payeeName: vendorName,
            amount: input.amount,
            description: input.remarks || `Payment for payable ${payable.payableNumber}`,
            referenceNumber: input.referenceNumber,
            status: 'approved',
            approvedBy: ctx.user.id,
            approvedAt: nowStr,
            paidBy: ctx.user.id,
            paidAt: nowStr,
            postingStatus: 'unposted',
            createdBy: ctx.user.id,
          });
        
        // MySQL returns insertId in the result header
        const paymentId = (paymentInsertResult as any)[0]?.insertId ?? (paymentInsertResult as any)?.insertId ?? null;
        
        // Calculate new paid amount and determine status
        const currentPaid = parseFloat(payable.paidAmount || '0');
        const newPaidTotal = currentPaid + input.amount;
        const totalAmount = parseFloat(payable.totalAmount || '0');
        const newStatus = newPaidTotal >= totalAmount ? 'fully_paid' : 'partially_paid';
        
        // Update payable with new paid amount and status
        await db
          .update(procurementPayables)
          .set({ 
            status: newStatus, 
            paidAmount: String(newPaidTotal),
            remainingAmount: String(Math.max(0, totalAmount - newPaidTotal)),
          })
          .where(eq(procurementPayables.id, input.payableId));
        
        // Link payment to invoice if exists
        if (paymentId) {
          await db
            .update(procurementInvoices)
            .set({ 
              paymentId, 
              paymentStatus: newStatus === 'fully_paid' ? 'paid' : 'payment_scheduled',
              paidAt: nowStr,
            })
            .where(eq(procurementInvoices.payableId, input.payableId));
        }
        
        // Create payment line for audit trail
        if (paymentId) {
          await db
            .insert(paymentLines)
            .values({
              organizationId: ctx.scope.organizationId,
              paymentId,
              lineNumber: 1,
              sourceType: 'invoice',
              description: `Payment for payable ${payable.payableNumber}`,
              amount: input.amount,
              glAccountId: null,
            });
        }
        return {
          success: true,
          paymentId,
          paymentNumber,
          message: `Payment ${paymentNumber} recorded successfully`,
        };
      } catch (error: any) {
        console.error('recordPayment error:', error);
        return {
          success: false,
          message: error.message || "Error recording payment",
        };
      }
    }),

  /**
   * Delete payable (soft delete with isDeleted flag)
   * Only allows deletion of payables with status pending_invoice or pending_approval
   */
  deletePayable: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Get the payable to verify it exists and check status
      const [payable] = await db
        .select()
        .from(procurementPayables)
        .where(
          and(
            eq(procurementPayables.id, input.id),
            eq(procurementPayables.organizationId, ctx.scope.organizationId)
          )
        )
        .limit(1);

      if (!payable) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payable not found",
        });
      }

      // Check operating unit if specified
      if (ctx.scope.operatingUnitId && payable.operatingUnitId !== ctx.scope.operatingUnitId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to delete this payable",
        });
      }

      // Prevent deletion of approved or paid payables
      if (["approved", "paid"].includes(payable.status || "")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete payable with status "${payable.status}". Only pending payables can be deleted.`,
        });
      }

      // Soft delete: mark as deleted with timestamp and user
      await db
        .update(procurementPayables)
        .set({
          isDeleted: true,
          deletedBy: ctx.user.id,
          deletedAt: new Date().toISOString(),
        })
        .where(eq(procurementPayables.id, input.id));

      return {
        success: true,
        message: `Payable ${payable.payableNumber} deleted successfully`,
      };
    }),

  /**
   * Bulk delete payables (soft delete)
   * Only allows deletion of payables with status pending_invoice or pending_approval
   */
  bulkDeletePayables: scopedProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Get all payables to verify they exist and check status
      const payables = await db
        .select()
        .from(procurementPayables)
        .where(
          and(
            procurementPayables.id.inArray(input.ids),
            eq(procurementPayables.organizationId, ctx.scope.organizationId)
          )
        );

      if (payables.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No payables found",
        });
      }

      // Check operating unit if specified
      if (ctx.scope.operatingUnitId) {
        const invalidPayables = payables.filter(p => p.operatingUnitId !== ctx.scope.operatingUnitId);
        if (invalidPayables.length > 0) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized to delete some of these payables",
          });
        }
      }

      // Prevent deletion of approved or paid payables
      const protectedPayables = payables.filter(p => ["approved", "paid"].includes(p.status || ""));
      if (protectedPayables.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete ${protectedPayables.length} payable(s) with status approved or paid. Only pending payables can be deleted.`,
        });
      }

      // Soft delete all payables
      await db
        .update(procurementPayables)
        .set({
          isDeleted: true,
          deletedBy: ctx.user.id,
          deletedAt: new Date().toISOString(),
        })
        .where(procurementPayables.id.inArray(input.ids));

      const totalAmount = payables.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);

      return {
        success: true,
        count: payables.length,
        totalAmount: totalAmount.toFixed(2),
        message: `${payables.length} payable(s) deleted successfully (Total: $${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })})`
      };
    }),

  /**
   * Update payable status with validation and audit logging
   */
  updatePayableStatus: scopedProcedure
    .input(z.object({
      id: z.number(),
      newStatus: z.enum(["pending_invoice", "pending_approval", "approved", "paid"])
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Get the payable
      const [payable] = await db
        .select()
        .from(procurementPayables)
        .where(
          and(
            eq(procurementPayables.id, input.id),
            eq(procurementPayables.organizationId, ctx.scope.organizationId)
          )
        )
        .limit(1);

      if (!payable) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payable not found",
        });
      }

      // Check operating unit if specified
      if (ctx.scope.operatingUnitId && payable.operatingUnitId !== ctx.scope.operatingUnitId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to update this payable",
        });
      }

      // Validate status transition
      const validTransitions: Record<string, string[]> = {
        "pending_invoice": ["pending_approval"],
        "pending_approval": ["approved"],
        "approved": ["paid"],
        "paid": []
      };

      const currentStatus = payable.status || "pending_invoice";
      const allowedTransitions = validTransitions[currentStatus] || [];

      if (!allowedTransitions.includes(input.newStatus)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot transition from ${currentStatus} to ${input.newStatus}`
        });
      }

      // Update status
      await db
        .update(procurementPayables)
        .set({
          status: input.newStatus,
        })
        .where(eq(procurementPayables.id, input.id));

      // Record approval history if transitioning to approved
      if (input.newStatus === "approved") {
        await db
          .insert(payableApprovalHistory)
          .values({
            payableId: input.id,
            organizationId: ctx.scope.organizationId,
            operatingUnitId: ctx.scope.operatingUnitId,
            action: "approved",
            actionBy: ctx.user.id,
            actionByName: ctx.user.name || ctx.user.email,
            actionByEmail: ctx.user.email,
          });

        // Send email notification to logistics manager/officer
        try {
          await sendPayableNotification({
            payableId: input.id,
            organizationId: ctx.scope.organizationId,
            action: "approved",
            actionByName: ctx.user.name || ctx.user.email,
          });
        } catch (error) {
          console.error("Failed to send approval notification:", error);
        }
      }

      return {
        success: true,
        message: `Payable status updated from ${currentStatus} to ${input.newStatus}`
      };
    }),

  /**
   * Get approval history for a payable
   */
  getPayableApprovalHistory: scopedProcedure
    .input(z.object({
      payableId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();

      const history = await db
        .select()
        .from(payableApprovalHistory)
        .where(
          and(
            eq(payableApprovalHistory.payableId, input.payableId),
            eq(payableApprovalHistory.organizationId, ctx.scope.organizationId)
          )
        )
        .orderBy(desc(payableApprovalHistory.createdAt));

      return history;
    }),

  /**
   * Reject a payable in pending_approval status
   */
  rejectPayable: scopedProcedure
    .input(z.object({
      id: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Get the payable
      const [payable] = await db
        .select()
        .from(procurementPayables)
        .where(
          and(
            eq(procurementPayables.id, input.id),
            eq(procurementPayables.organizationId, ctx.scope.organizationId)
          )
        )
        .limit(1);

      if (!payable) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payable not found",
        });
      }

      // Check operating unit if specified
      if (ctx.scope.operatingUnitId && payable.operatingUnitId !== ctx.scope.operatingUnitId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to reject this payable",
        });
      }

      // Only allow rejection from pending_approval status
      if (payable.status !== "pending_approval") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot reject payable in ${payable.status} status. Only pending_approval payables can be rejected.`
        });
      }

      // Update status to rejected
      await db
        .update(procurementPayables)
        .set({
          status: "rejected",
        })
        .where(eq(procurementPayables.id, input.id));

      // Record approval history
      await db
        .insert(payableApprovalHistory)
        .values({
          payableId: input.id,
          organizationId: ctx.scope.organizationId,
          operatingUnitId: ctx.scope.operatingUnitId,
          action: "rejected",
          actionBy: ctx.user.id,
          actionByName: ctx.user.name || ctx.user.email,
          actionByEmail: ctx.user.email,
          reason: input.reason,
        });

      // Send email notification to logistics manager/officer
      try {
        await sendPayableNotification({
          payableId: input.id,
          organizationId: ctx.scope.organizationId,
          action: "rejected",
          actionByName: ctx.user.name || ctx.user.email,
          reason: input.reason,
        });
      } catch (error) {
        console.error("Failed to send rejection notification:", error);
        // Don't fail the operation if email fails
      }

      return {
        success: true,
        message: `Payable rejected${input.reason ? ` with reason: ${input.reason}` : ''}`
      };
    }),

  /**
   * Cancel a payable in pending_approval or pending_invoice status
   */
  cancelPayable: scopedProcedure
    .input(z.object({
      id: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Get the payable
      const [payable] = await db
        .select()
        .from(procurementPayables)
        .where(
          and(
            eq(procurementPayables.id, input.id),
            eq(procurementPayables.organizationId, ctx.scope.organizationId)
          )
        )
        .limit(1);

      if (!payable) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payable not found",
        });
      }

      // Check operating unit if specified
      if (ctx.scope.operatingUnitId && payable.operatingUnitId !== ctx.scope.operatingUnitId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to cancel this payable",
        });
      }

      // Only allow cancellation from pending_approval or pending_invoice status
      if (!["pending_approval", "pending_invoice"].includes(payable.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot cancel payable in ${payable.status} status. Only pending_approval or pending_invoice payables can be cancelled.`
        });
      }

      // Update status to cancelled
      await db
        .update(procurementPayables)
        .set({
          status: "cancelled",
        })
        .where(eq(procurementPayables.id, input.id));

      // Record approval history
      await db
        .insert(payableApprovalHistory)
        .values({
          payableId: input.id,
          organizationId: ctx.scope.organizationId,
          operatingUnitId: ctx.scope.operatingUnitId,
          action: "cancelled",
          actionBy: ctx.user.id,
          actionByName: ctx.user.name || ctx.user.email,
          actionByEmail: ctx.user.email,
          reason: input.reason,
        });

      // Send email notification to logistics manager/officer
      try {
        await sendPayableNotification({
          payableId: input.id,
          organizationId: ctx.scope.organizationId,
          action: "cancelled",
          actionByName: ctx.user.name || ctx.user.email,
          reason: input.reason,
        });
      } catch (error) {
        console.error("Failed to send cancellation notification:", error);
        // Don't fail the operation if email fails
      }

      return {
        success: true,
        message: `Payable cancelled${input.reason ? ` with reason: ${input.reason}` : ''}`
      };
    }),

  /**
   * Get invoice details by payable ID
   * Used by Finance to view invoice uploaded in Logistics
   */
  getInvoiceByPayableId: scopedProcedure
    .input(z.object({
      payableId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();

      // Get invoice for this payable
      const [invoice] = await db
        .select()
        .from(procurementInvoices)
        .where(
          and(
            eq(procurementInvoices.payableId, input.payableId),
            eq(procurementInvoices.organizationId, ctx.scope.organizationId)
          )
        )
        .limit(1);

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found for this payable",
        });
      }

      return invoice;
    }),

  //   rejectInvoice: scopedProcedure
  //     .input(z.object({
  //       invoiceId: z.number(),
  //       reason: z.string(),
  //     }))
  //     .mutation(async ({ input, ctx }) => {
  //       const db = await getDb();
  //       const [invoice] = await db
  //         .select()
  //         .from(procurementInvoices)
  //         .where(
  //           and(
  //             eq(procurementInvoices.id, input.invoiceId),
  //             eq(procurementInvoices.organizationId, ctx.scope.organizationId)
  //           )
  //         )
  //         .limit(1);
  // 
  //       if (!invoice) {
  //         throw new TRPCError({
  //           code: "NOT_FOUND",
  //           message: "Invoice not found",
  //         });
  //       }
  // 
  //       await db
  //         .update(procurementInvoices)
  //         .set({
  //           approvalStatus: "rejected",
  //           rejectionReason: input.reason,
  //           updatedAt: new Date(),
  //         })
  //         .where(eq(procurementInvoices.id, input.invoiceId));
  // 
  //       await db
  //         .insert(invoiceAuditTrail)
  //         .values({
  //           invoiceId: input.invoiceId,
  //           payableId: invoice.payableId,
  //           organizationId: ctx.scope.organizationId,
  //           operatingUnitId: ctx.scope.operatingUnitId,
  //           action: "rejected",
  //           actionBy: ctx.user.id,
  //           actionByName: ctx.user.name || ctx.user.email,
  //           actionByEmail: ctx.user.email,
  //           reason: input.reason,
  //         });
  // 
  //       return {
  //         success: true,
  //         message: `Invoice rejected with reason: ${input.reason}`,
  //       };
  //     }),

  getInvoiceAuditTrail: scopedProcedure
    .input(z.object({
      invoiceId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const trail = await db
        .select()
        .from(invoiceAuditTrail)
        .where(
          and(
            eq(invoiceAuditTrail.invoiceId, input.invoiceId),
            eq(invoiceAuditTrail.organizationId, ctx.scope.organizationId)
          )
        )
        .orderBy(desc(invoiceAuditTrail.createdAt));

      return trail;
    }),

  perform3WayMatching: scopedProcedure
    .input(z.object({
      invoiceId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const [invoice] = await db
        .select()
        .from(procurementInvoices)
        .where(
          and(
            eq(procurementInvoices.id, input.invoiceId),
            eq(procurementInvoices.organizationId, ctx.scope.organizationId)
          )
        )
        .limit(1);

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      const prAmount = invoice.prAmount ? parseFloat(invoice.prAmount as any) : 0;
      const poAmount = invoice.poAmount ? parseFloat(invoice.poAmount as any) : 0;
      const grnAmount = invoice.grnAmount ? parseFloat(invoice.grnAmount as any) : 0;
      const invoiceAmount = parseFloat(invoice.invoiceAmount as any);

      const prVariance = Math.abs(invoiceAmount - prAmount);
      const poVariance = Math.abs(invoiceAmount - poAmount);
      const grnVariance = Math.abs(invoiceAmount - grnAmount);

      let matchingStatus = "matched";
      let varianceReason = "";
      const varianceThreshold = 100;

      if (prVariance > varianceThreshold || poVariance > varianceThreshold || grnVariance > varianceThreshold) {
        matchingStatus = "variance_detected";
        const variances = [];
        if (prVariance > varianceThreshold) variances.push(`PR variance: ${prVariance}`);
        if (poVariance > varianceThreshold) variances.push(`PO variance: ${poVariance}`);
        if (grnVariance > varianceThreshold) variances.push(`GRN variance: ${grnVariance}`);
        varianceReason = variances.join("; ");
      }

      await db
        .update(procurementInvoices)
        .set({
          matchingStatus: matchingStatus as any,
          varianceAmount: Math.max(prVariance, poVariance, grnVariance) || undefined,
          varianceReason: varianceReason || undefined,
        })
        .where(eq(procurementInvoices.id, input.invoiceId));

      await db
        .insert(invoiceAuditTrail)
        .values({
          invoiceId: input.invoiceId,
          payableId: invoice.payableId,
          organizationId: ctx.scope.organizationId,
          operatingUnitId: ctx.scope.operatingUnitId,
          action: "matching_completed",
          actionBy: ctx.user.id,
          actionByName: ctx.user.name || ctx.user.email,
          actionByEmail: ctx.user.email,
          details: JSON.stringify({
            prAmount,
            poAmount,
            grnAmount,
            invoiceAmount,
            matchingStatus,
          }),
        });

      return {
        success: true,
        matchingStatus,
        varianceReason: varianceReason || "No variances detected",
        message: `3-way matching completed. Status: ${matchingStatus}`,
      };
    }),

  resubmitInvoice: scopedProcedure
    .input(z.object({
      invoiceId: z.number(),
      newDocumentUrl: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const [invoice] = await db
        .select()
        .from(procurementInvoices)
        .where(
          and(
            eq(procurementInvoices.id, input.invoiceId),
            eq(procurementInvoices.organizationId, ctx.scope.organizationId)
          )
        )
        .limit(1);

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      if (invoice.approvalStatus !== "rejected") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only rejected invoices can be resubmitted",
        });
      }

      await db
        .update(procurementInvoices)
        .set({
          approvalStatus: "pending",
          rejectionReason: null,
          invoiceDocumentUrl: input.newDocumentUrl || invoice.invoiceDocumentUrl,
        })
        .where(eq(procurementInvoices.id, input.invoiceId));

      await db
        .insert(invoiceAuditTrail)
        .values({
          invoiceId: input.invoiceId,
          payableId: invoice.payableId,
          organizationId: ctx.scope.organizationId,
          operatingUnitId: ctx.scope.operatingUnitId,
          action: "resubmitted",
          actionBy: ctx.user.id,
          actionByName: ctx.user.name || ctx.user.email,
          actionByEmail: ctx.user.email,
          reason: input.notes,
        });

      return {
        success: true,
        message: "Invoice resubmitted successfully",
      };
    }),

  /**
   * Update payable due date
   * Allows users to set a custom due date on a payable
   */
  updatePayableDueDate: scopedProcedure
    .input(z.object({
      payableId: z.number(),
      dueDate: z.string(), // ISO date string
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Verify payable belongs to this org/OU
      const [payable] = await db
        .select()
        .from(procurementPayables)
        .where(
          and(
            eq(procurementPayables.id, input.payableId),
            eq(procurementPayables.organizationId, ctx.scope.organizationId),
            isNull(procurementPayables.deletedAt)
          )
        )
        .limit(1);

      if (!payable) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payable not found",
        });
      }

      // Check operating unit if specified
      if (ctx.scope.operatingUnitId && payable.operatingUnitId !== ctx.scope.operatingUnitId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to update this payable",
        });
      }

      // Don't allow updating due date on paid or cancelled payables
      if (["paid", "cancelled"].includes(payable.status || "")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot update due date on ${payable.status} payable`,
        });
      }

      // Extract just the date portion (YYYY-MM-DD) to avoid timezone shifts
      const rawDate = input.dueDate instanceof Date ? (input.dueDate as any).toISOString() : String(input.dueDate);
      const dateStr = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;
      await db
        .update(procurementPayables)
        .set({
          dueDate: dateStr,
        })
        .where(eq(procurementPayables.id, input.payableId));

      return {
        success: true,
       message: "Due date updated successfully",
     };
   }),

  /**
   * Generate payables from approved SACs that don't have payables yet
   * This handles cases where SAC was approved before the automation was in place
   */
  generatePayablesFromSAC: scopedProcedure
    .input(z.object({
      purchaseRequestId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { contracts, serviceAcceptanceCertificates } = await import("../drizzle/schema");
      const { createPayableFromSAC } = await import("./automation/sacToPayableAutomation");

      // Find contracts for this PR
      const prContracts = await db
        .select()
        .from(contracts)
        .where(
          and(
            eq(contracts.purchaseRequestId, input.purchaseRequestId),
            eq(contracts.organizationId, ctx.scope.organizationId)
          )
        );

      if (!prContracts || prContracts.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No contracts found for this PR' });
      }

      let payablesCreated = 0;
      let errors: string[] = [];

      for (const contract of prContracts) {
        // Find approved SACs for this contract
        const approvedSACs = await db
          .select()
          .from(serviceAcceptanceCertificates)
          .where(
            and(
              eq(serviceAcceptanceCertificates.contractId, contract.id),
              eq(serviceAcceptanceCertificates.organizationId, ctx.scope.organizationId),
              eq(serviceAcceptanceCertificates.status, 'approved')
            )
          );

        for (const sac of approvedSACs) {
          // Check if payable already exists for this SAC
          const existing = await db
            .select()
            .from(procurementPayables)
            .where(
              and(
                eq(procurementPayables.sacId, sac.id),
                eq(procurementPayables.organizationId, ctx.scope.organizationId),
                isNull(procurementPayables.deletedAt)
              )
            )
            .limit(1);

          if (existing && existing.length > 0) {
            continue; // Already has a payable
          }

          // Create payable from this SAC
          try {
            await createPayableFromSAC(db, sac.id, {
              scope: { organizationId: ctx.scope.organizationId, operatingUnitId: ctx.scope.operatingUnitId || 0 },
              user: { id: ctx.user.id },
            });
            payablesCreated++;
          } catch (err: any) {
            errors.push(`SAC ${sac.sacNumber}: ${err.message}`);
          }
        }
      }

      return {
        success: true,
        payablesCreated,
        errors: errors.length > 0 ? errors : undefined,
      };
    }),

  // ============================================================================
  // S3-BACKED INVOICE FILE UPLOAD
  // ============================================================================

  /**
   * Upload invoice PDF to S3 and return the URL
   * Used by Logistics to attach invoice documents
   */
  uploadInvoiceFile: scopedProcedure
    .input(
      z.object({
        payableId: z.number(),
        fileName: z.string(),
        fileData: z.string(), // base64 encoded
        fileType: z.string().default("application/pdf"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { storagePut } = await import("./storage");
      const { nanoid } = await import("nanoid");
      const db = await getDb();

      // Verify payable exists and belongs to org
      const [payable] = await db
        .select()
        .from(procurementPayables)
        .where(and(
          eq(procurementPayables.id, input.payableId),
          eq(procurementPayables.organizationId, ctx.scope.organizationId),
          isNull(procurementPayables.deletedAt)
        ))
        .limit(1);

      if (!payable) {
        throw new TRPCError({ code: 'NOT_FOUND', message: "Payable not found" });
      }

      // Decode base64 and upload to S3
      const fileBuffer = Buffer.from(input.fileData, "base64");
      const fileKey = `invoices/${ctx.scope.organizationId}/${input.payableId}/${nanoid()}-${input.fileName}`;
      const { url } = await storagePut(fileKey, fileBuffer, input.fileType);

      return {
        success: true,
        fileUrl: url,
        fileName: input.fileName,
      };
    }),

  // ============================================================================
  // PAYMENT VOUCHER GENERATION
  // ============================================================================

  /**
   * Generate a payment voucher PDF when a payable is marked as paid
   */
  generatePaymentVoucher: scopedProcedure
    .input(
      z.object({
        payableId: z.number(),
        paymentId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { storagePut } = await import("./storage");
      const { nanoid } = await import("nanoid");
      const db = await getDb();
      const { vendors, purchaseRequests, purchaseOrders, organizations } = await import("../drizzle/schema");

      // Get payable
      const [payable] = await db
        .select()
        .from(procurementPayables)
        .where(and(
          eq(procurementPayables.id, input.payableId),
          eq(procurementPayables.organizationId, ctx.scope.organizationId),
          isNull(procurementPayables.deletedAt)
        ))
        .limit(1);

      if (!payable) {
        throw new TRPCError({ code: 'NOT_FOUND', message: "Payable not found" });
      }

      // Get payment - use provided paymentId or find via invoice link
      let payment;
      if (input.paymentId) {
        const [p] = await db.select().from(payments).where(eq(payments.id, input.paymentId)).limit(1);
        payment = p;
      } else {
        // Find payment through the invoice's paymentId
        const [invoice_for_payment] = await db.select()
          .from(procurementInvoices)
          .where(eq(procurementInvoices.payableId, input.payableId))
          .limit(1);
        if (invoice_for_payment?.paymentId) {
          const [p] = await db.select().from(payments).where(eq(payments.id, invoice_for_payment.paymentId)).limit(1);
          payment = p;
        }
      }

      if (!payment) {
        throw new TRPCError({ code: 'NOT_FOUND', message: "Payment not found" });
      }

      // Get related data
      const [vendor] = payable.vendorId
        ? await db.select().from(vendors).where(eq(vendors.id, payable.vendorId)).limit(1)
        : [null];

      const [pr] = payable.purchaseRequestId
        ? await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, payable.purchaseRequestId)).limit(1)
        : [null];

      const [po] = payable.purchaseOrderId
        ? await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, payable.purchaseOrderId)).limit(1)
        : [null];

      const [org] = await db.select().from(organizations).where(eq(organizations.id, ctx.scope.organizationId)).limit(1);

      // Get invoice
      const [invoice] = await db
        .select()
        .from(procurementInvoices)
        .where(eq(procurementInvoices.payableId, input.payableId))
        .limit(1);

      // Generate HTML voucher
      const voucherNumber = `PV-${payable.payableNumber || input.payableId}-${nanoid(6)}`;
      const paymentDate = payment.paymentDate || new Date().toISOString().split('T')[0];
      const paymentMethod = (payment.paymentMethod || 'bank_transfer').replace(/_/g, ' ');

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    .header { text-align: center; border-bottom: 3px solid #1a56db; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #1a56db; margin: 0; font-size: 28px; }
    .header h2 { color: #666; margin: 5px 0; font-size: 16px; font-weight: normal; }
    .voucher-title { text-align: center; font-size: 22px; font-weight: bold; color: #1a56db; margin: 20px 0; text-transform: uppercase; letter-spacing: 2px; }
    .voucher-number { text-align: center; font-size: 14px; color: #666; margin-bottom: 30px; }
    .section { margin-bottom: 25px; }
    .section-title { font-size: 14px; font-weight: bold; color: #1a56db; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; text-transform: uppercase; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .field { margin-bottom: 8px; }
    .field-label { font-size: 11px; color: #888; text-transform: uppercase; }
    .field-value { font-size: 14px; font-weight: 500; }
    .amount-box { background: #f0f7ff; border: 2px solid #1a56db; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
    .amount-box .label { font-size: 12px; color: #666; text-transform: uppercase; }
    .amount-box .amount { font-size: 32px; font-weight: bold; color: #1a56db; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; margin-top: 60px; }
    .sig-block { text-align: center; }
    .sig-line { border-top: 1px solid #333; margin-top: 60px; padding-top: 5px; }
    .sig-label { font-size: 11px; color: #666; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 11px; color: #999; }
    .stamp { border: 2px solid #22c55e; color: #22c55e; padding: 5px 15px; display: inline-block; font-weight: bold; font-size: 14px; transform: rotate(-5deg); margin-top: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${org?.name || 'Organization'}</h1>
    <h2>${org?.country || ''}</h2>
  </div>

  <div class="voucher-title">Payment Voucher</div>
  <div class="voucher-number">Voucher No: ${voucherNumber} | Date: ${paymentDate}</div>

  <div class="section">
    <div class="section-title">Payment Details</div>
    <div class="grid">
      <div class="field">
        <div class="field-label">Payment Number</div>
        <div class="field-value">${payment.paymentNumber || 'N/A'}</div>
      </div>
      <div class="field">
        <div class="field-label">Payment Date</div>
        <div class="field-value">${paymentDate}</div>
      </div>
      <div class="field">
        <div class="field-label">Payment Method</div>
        <div class="field-value" style="text-transform:capitalize">${paymentMethod}</div>
      </div>
      <div class="field">
        <div class="field-label">Reference Number</div>
        <div class="field-value">${payment.referenceNumber || 'N/A'}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Payee Information</div>
    <div class="grid">
      <div class="field">
        <div class="field-label">Vendor / Payee</div>
        <div class="field-value">${vendor?.name || payment.payeeName || 'Unknown'}</div>
      </div>
      <div class="field">
        <div class="field-label">Payable Number</div>
        <div class="field-value">${payable.payableNumber || '#' + payable.id}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Reference Documents</div>
    <div class="grid">
      <div class="field">
        <div class="field-label">Purchase Request</div>
        <div class="field-value">${pr?.prNumber || 'N/A'}</div>
      </div>
      <div class="field">
        <div class="field-label">Purchase Order</div>
        <div class="field-value">${po?.poNumber || 'N/A'}</div>
      </div>
      <div class="field">
        <div class="field-label">Invoice Number</div>
        <div class="field-value">${invoice?.invoiceNumber || 'N/A'}</div>
      </div>
      <div class="field">
        <div class="field-label">Invoice Amount</div>
        <div class="field-value">$${parseFloat(invoice?.invoiceAmount?.toString() || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
      </div>
    </div>
  </div>

  <div class="amount-box">
    <div class="label">Amount Paid</div>
    <div class="amount">$${parseFloat(payment.amount?.toString() || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
    <div class="stamp">PAID</div>
  </div>

  ${payment.description ? `<div class="section"><div class="section-title">Description</div><p>${payment.description}</p></div>` : ''}

  <div class="signatures">
    <div class="sig-block">
      <div class="sig-line">Prepared By</div>
      <div class="sig-label">${ctx.user.name || 'Finance Officer'}</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">Reviewed By</div>
      <div class="sig-label">Finance Manager</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">Approved By</div>
      <div class="sig-label">Authorized Signatory</div>
    </div>
  </div>

  <div class="footer">
    Generated on ${new Date().toISOString().split('T')[0]} | ${org?.name || 'Organization'} - Integrated Management System
  </div>
</body>
</html>`;

      // Convert HTML to PDF-like content and upload to S3
      const fileKey = `payment-vouchers/${ctx.scope.organizationId}/${voucherNumber}-${nanoid(6)}.html`;
      const { url } = await storagePut(fileKey, htmlContent, "text/html");

      // Update payment record with voucher URL
      await db
        .update(payments)
        .set({ voucherUrl: url })
        .where(eq(payments.id, input.paymentId));

      return {
        success: true,
        voucherUrl: url,
        voucherNumber,
      };
    }),

  // ============================================================================
  // VARIANCE APPROVAL WORKFLOW
  // ============================================================================

  /**
   * Review variance on an invoice — approve or reject with comments.
   * When approved, the invoice approvalStatus moves to 'approved' and the
   * payable status moves to 'pending_payment'.
   * When rejected, the invoice approvalStatus moves to 'rejected' and the
   * payable status moves back to 'pending_invoice'.
   */
  reviewVariance: scopedProcedure
    .input(
      z.object({
        payableId: z.number(),
        action: z.enum(['approve', 'reject']),
        comments: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // 1. Find the payable
      const [payable] = await db
        .select()
        .from(procurementPayables)
        .where(
          and(
            eq(procurementPayables.id, input.payableId),
            eq(procurementPayables.organizationId, ctx.scope.organizationId),
            isNull(procurementPayables.deletedAt)
          )
        )
        .limit(1);

      if (!payable) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Payable not found' });
      }

      // 2. Find the linked invoice
      const [invoice] = await db
        .select()
        .from(procurementInvoices)
        .where(
          and(
            eq(procurementInvoices.purchaseRequestId, payable.purchaseRequestId),
            eq(procurementInvoices.organizationId, ctx.scope.organizationId)
          )
        )
        .limit(1);

      if (!invoice) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No invoice found for this payable' });
      }

      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      if (input.action === 'approve') {
        // Approve the variance — update invoice approval status
        await db
          .update(procurementInvoices)
          .set({
            approvalStatus: 'approved',
            approvedBy: ctx.user.id,
            approvedAt: now,
            rejectionReason: null,
          })
          .where(eq(procurementInvoices.id, invoice.id));

        // Update payable matching status to 'matched' and move to pending_payment
        await db
          .update(procurementPayables)
          .set({
            matchingStatus: 'matched',
            status: 'pending_payment',
          })
          .where(eq(procurementPayables.id, payable.id));

        // Record in approval history
        await db.insert(payableApprovalHistory).values({
          payableId: payable.id,
          organizationId: ctx.scope.organizationId,
          operatingUnitId: ctx.scope.operatingUnitId || undefined,
          action: 'approved',
          actionBy: ctx.user.id,
          actionByName: ctx.user.name || ctx.user.email || 'Unknown',
          actionByEmail: ctx.user.email || '',
          reason: input.comments || 'Variance approved by finance manager',
        });

        return {
          success: true,
          message: 'Variance approved. Payable moved to pending payment.',
        };
      } else {
        // Reject the variance — update invoice approval status
        await db
          .update(procurementInvoices)
          .set({
            approvalStatus: 'rejected',
            rejectionReason: input.comments || 'Variance rejected',
          })
          .where(eq(procurementInvoices.id, invoice.id));

        // Update payable matching status back to variance_detected and status to pending_invoice
        await db
          .update(procurementPayables)
          .set({
            matchingStatus: 'variance_detected',
            status: 'pending_invoice',
          })
          .where(eq(procurementPayables.id, payable.id));

        // Record in approval history
        await db.insert(payableApprovalHistory).values({
          payableId: payable.id,
          organizationId: ctx.scope.organizationId,
          operatingUnitId: ctx.scope.operatingUnitId || undefined,
          action: 'rejected',
          actionBy: ctx.user.id,
          actionByName: ctx.user.name || ctx.user.email || 'Unknown',
          actionByEmail: ctx.user.email || '',
          reason: input.comments || 'Variance rejected',
        });

        return {
          success: true,
          message: 'Variance rejected. Invoice sent back for re-submission.',
        };
      }
    }),
});
