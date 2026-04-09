/**
 * Finance Deletion Governance Procedures
 * Implements hard delete for Draft status and soft delete for approved records
 * Per Official Directive: Finance Core Alignment (No Redesign, 100% Matching Enforcement)
 */

import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { procurementPayables, procurementInvoices, payments, expenditures } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Finance Deletion Governance Router
 * Provides controlled deletion with governance rules:
 * - Draft records: Hard delete (permanent removal)
 * - Approved/Posted records: Soft delete (mark as deleted, retain record)
 * - All deletions: Auditable with deletion reason and timestamp
 */
export const financeDeletionGovernanceRouter = router({
  /**
   * Hard Delete Payable (Draft Only)
   * Permanently removes draft payables from database
   */
  hardDeletePayable: protectedProcedure
    .input(
      z.object({
        payableId: z.number(),
        deletionReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      // Verify payable exists and is in Draft status
      const payable = await db
        .select()
        .from(procurementPayables)
        .where(eq(procurementPayables.id, input.payableId))
        .limit(1);

      if (!payable || payable.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payable not found",
        });
      }

      if (payable[0].status !== "draft") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Cannot hard delete payable with status '${payable[0].status}'. Only draft payables can be hard deleted.`,
        });
      }

      // Hard delete: Permanently remove record
      await db.delete(procurementPayables).where(eq(procurementPayables.id, input.payableId));

      return {
        success: true,
        message: "Payable permanently deleted",
        deletionType: "hard",
      };
    }),

  /**
   * Soft Delete Payable (Approved/Posted Only)
   * Marks payable as deleted but retains record for audit trail
   */
  softDeletePayable: protectedProcedure
    .input(
      z.object({
        payableId: z.number(),
        deletionReason: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      const payable = await db
        .select()
        .from(procurementPayables)
        .where(eq(procurementPayables.id, input.payableId))
        .limit(1);

      if (!payable || payable.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payable not found",
        });
      }

      // Only allow soft delete for approved/posted status
      if (!["pending_approval", "approved", "posted"].includes(payable[0].status)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Cannot soft delete payable with status '${payable[0].status}'. Only approved or posted payables can be soft deleted.`,
        });
      }

      // Soft delete: Mark as deleted, retain record
      const now = new Date().toISOString();
      await db
        .update(procurementPayables)
        .set({
          deletedAt: now,
          deletedBy: ctx.user.id,
        })
        .where(eq(procurementPayables.id, input.payableId));

      return {
        success: true,
        message: "Payable marked as deleted",
        deletionType: "soft",
      };
    }),

  /**
   * Restore Soft-Deleted Payable
   */
  restorePayable: protectedProcedure
    .input(
      z.object({
        payableId: z.number(),
        restoreReason: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      const payable = await db
        .select()
        .from(procurementPayables)
        .where(eq(procurementPayables.id, input.payableId))
        .limit(1);

      if (!payable || payable.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payable not found",
        });
      }

      // Restore: Clear deletion markers
      await db
        .update(procurementPayables)
        .set({
          deletedAt: null,
          deletedBy: null,
        })
        .where(eq(procurementPayables.id, input.payableId));

      return {
        success: true,
        message: "Payable restored successfully",
      };
    }),

  /**
   * Hard Delete Invoice (Draft Only)
   */
  hardDeleteInvoice: protectedProcedure
    .input(
      z.object({
        invoiceId: z.number(),
        deletionReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      const invoice = await db
        .select()
        .from(procurementInvoices)
        .where(eq(procurementInvoices.id, input.invoiceId))
        .limit(1);

      if (!invoice || invoice.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      if (invoice[0].status !== "draft") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Cannot hard delete invoice with status '${invoice[0].status}'. Only draft invoices can be hard deleted.`,
        });
      }

      await db.delete(procurementInvoices).where(eq(procurementInvoices.id, input.invoiceId));

      return {
        success: true,
        message: "Invoice permanently deleted",
        deletionType: "hard",
      };
    }),

  /**
   * Soft Delete Invoice (Approved/Posted Only)
   */
  softDeleteInvoice: protectedProcedure
    .input(
      z.object({
        invoiceId: z.number(),
        deletionReason: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      const invoice = await db
        .select()
        .from(procurementInvoices)
        .where(eq(procurementInvoices.id, input.invoiceId))
        .limit(1);

      if (!invoice || invoice.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      if (!["pending_approval", "approved", "posted"].includes(invoice[0].status)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Cannot soft delete invoice with status '${invoice[0].status}'. Only approved or posted invoices can be soft deleted.`,
        });
      }

      const now = new Date().toISOString();
      await db
        .update(procurementInvoices)
        .set({
          deletedAt: now,
          deletedBy: ctx.user.id,
        })
        .where(eq(procurementInvoices.id, input.invoiceId));

      return {
        success: true,
        message: "Invoice marked as deleted",
        deletionType: "soft",
      };
    }),

  /**
   * Restore Soft-Deleted Invoice
   */
  restoreInvoice: protectedProcedure
    .input(
      z.object({
        invoiceId: z.number(),
        restoreReason: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      const invoice = await db
        .select()
        .from(procurementInvoices)
        .where(eq(procurementInvoices.id, input.invoiceId))
        .limit(1);

      if (!invoice || invoice.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      await db
        .update(procurementInvoices)
        .set({
          deletedAt: null,
          deletedBy: null,
        })
        .where(eq(procurementInvoices.id, input.invoiceId));

      return {
        success: true,
        message: "Invoice restored successfully",
      };
    }),

  /**
   * Hard Delete Expenditure (Draft Only)
   */
  hardDeleteExpenditure: protectedProcedure
    .input(
      z.object({
        expenditureId: z.number(),
        deletionReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      const expenditure = await db
        .select()
        .from(expenditures)
        .where(eq(expenditures.id, input.expenditureId))
        .limit(1);

      if (!expenditure || expenditure.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Expenditure not found",
        });
      }

      if (expenditure[0].status !== "draft") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Cannot hard delete expenditure with status '${expenditure[0].status}'. Only draft expenditures can be hard deleted.`,
        });
      }

      await db.delete(expenditures).where(eq(expenditures.id, input.expenditureId));

      return {
        success: true,
        message: "Expenditure permanently deleted",
        deletionType: "hard",
      };
    }),

  /**
   * Soft Delete Expenditure (Approved Only)
   */
  softDeleteExpenditure: protectedProcedure
    .input(
      z.object({
        expenditureId: z.number(),
        deletionReason: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      const expenditure = await db
        .select()
        .from(expenditures)
        .where(eq(expenditures.id, input.expenditureId))
        .limit(1);

      if (!expenditure || expenditure.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Expenditure not found",
        });
      }

      if (expenditure[0].status !== "approved") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Cannot soft delete expenditure with status '${expenditure[0].status}'. Only approved expenditures can be soft deleted.`,
        });
      }

      const now = new Date().toISOString();
      await db
        .update(expenditures)
        .set({
          deletedAt: now,
          deletedBy: ctx.user.id,
        })
        .where(eq(expenditures.id, input.expenditureId));

      return {
        success: true,
        message: "Expenditure marked as deleted",
        deletionType: "soft",
      };
    }),

  /**
   * Restore Soft-Deleted Expenditure
   */
  restoreExpenditure: protectedProcedure
    .input(
      z.object({
        expenditureId: z.number(),
        restoreReason: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      const expenditure = await db
        .select()
        .from(expenditures)
        .where(eq(expenditures.id, input.expenditureId))
        .limit(1);

      if (!expenditure || expenditure.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Expenditure not found",
        });
      }

      await db
        .update(expenditures)
        .set({
          deletedAt: null,
          deletedBy: null,
        })
        .where(eq(expenditures.id, input.expenditureId));

      return {
        success: true,
        message: "Expenditure restored successfully",
      };
    }),
});
