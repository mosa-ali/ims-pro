/**
 * 3-Way Matching Enforcement
 * Implements mandatory matching validation before invoice approval
 * Blocks approval if matching status is invalid or variance exceeds threshold
 */

import { TRPCError } from "@trpc/server";
import { procurementInvoices, procurementPayables } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Validate 3-way matching before invoice approval
 * Throws PRECONDITION_FAILED if matching is invalid or variance exceeds threshold
 * 
 * ENFORCEMENT RULES:
 * 1. Invoice MUST have valid matching status
 * 2. Matching status MUST be "matched" or "acceptable_variance"
 * 3. If matching status is "rejected" or "unmatched" → approval is IMPOSSIBLE
 * 4. If matching status is "pending" → approval is IMPOSSIBLE (must perform matching first)
 * 5. Variance must be persisted in database with acceptedQty basis (NOT receivedQty)
 */
export async function validateInvoiceMatchingBeforeApproval(
  db: any,
  invoiceId: number
): Promise<void> {
  // Fetch invoice with matching details
  const [invoice] = await db
    .select()
    .from(procurementInvoices)
    .where(eq(procurementInvoices.id, invoiceId))
    .limit(1);

  if (!invoice) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Invoice not found",
    });
  }

  // ENFORCEMENT: Check matching status - approval is IMPOSSIBLE without valid matching
  if (!invoice.matchingStatus) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Invoice approval blocked: 3-way matching status is missing. Please perform matching validation before approval.",
    });
  }

  if (invoice.matchingStatus === "rejected") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Invoice approval blocked: 3-way matching validation failed. Variance exceeds configured threshold. Please resolve matching issues before approval.",
    });
  }

  if (invoice.matchingStatus === "unmatched") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Invoice approval blocked: Invoice has not been matched with PO and GRN. Please perform 3-way matching validation before approval.",
    });
  }

  if (invoice.matchingStatus === "pending") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Invoice approval blocked: 3-way matching validation is pending. Please complete matching validation before approval.",
    });
  }

  // ENFORCEMENT: Only allow approval if matching status is explicitly "matched" or "acceptable_variance"
  if (invoice.matchingStatus !== "matched" && invoice.matchingStatus !== "acceptable_variance") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `Invoice approval blocked: Invalid matching status "${invoice.matchingStatus}". Only "matched" or "acceptable_variance" statuses allow approval.`,
    });
  }

  // Verify variance is persisted in database
  if (invoice.quantityVariance === null || invoice.quantityVariance === undefined) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Invoice approval blocked: Quantity variance not recorded in database. Please perform matching validation.",
    });
  }

  if (invoice.amountVariance === null || invoice.amountVariance === undefined) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Invoice approval blocked: Amount variance not recorded in database. Please perform matching validation.",
    });
  }

  // Verify acceptedQty basis is used (not receivedQty)
  if (invoice.matchingBasis && invoice.matchingBasis !== "acceptedQty") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Invoice approval blocked: Matching basis must be acceptedQty, not receivedQty.",
    });
  }
}

/**
 * Store matching result with variance details
 * Persists matching status, variance amounts, and basis for audit trail
 */
export async function storeMatchingResult(
  db: any,
  invoiceId: number,
  matchingStatus: "matched" | "acceptable_variance" | "rejected" | "unmatched",
  quantityVariance: number,
  amountVariance: number,
  acceptedQty: number
): Promise<void> {
  await db
    .update(procurementInvoices)
    .set({
      matchingStatus,
      quantityVariance,
      amountVariance,
      matchingBasis: "acceptedQty",
      acceptedQty,
    })
    .where(eq(procurementInvoices.id, invoiceId));
}
