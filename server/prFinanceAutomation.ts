/**
 * PR-Finance Integration Automation
 * Handles budget validation, reservation, encumbrance, payables, invoices, and payment closure
 */

import { eq, and, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  purchaseRequests,
  budgetLines,
  prBudgetReservations,
  financeEncumbrances,
  procurementPayables,
  procurementInvoices,
  purchaseOrders,
  goodsReceiptNotes,
  vendors,
} from "../drizzle/schema";

// ============================================================================
// PHASE 1: BUDGET VALIDATION & RESERVATION
// ============================================================================

/**
 * Validate if budget line has sufficient remaining amount for PR
 */
export async function validateBudgetAvailability(
  budgetLineId: number,
  requestedAmount: number
): Promise<{
  available: boolean;
  remainingAmount: number;
  message: string;
}> {
  const db = await getDb();
  
  const budgetLine = await db
    .select()
    .from(budgetLines)
    .where(eq(budgetLines.id, budgetLineId))
    .limit(1);

  if (!budgetLine[0]) {
    return {
      available: false,
      remainingAmount: 0,
      message: "Budget line not found",
    };
  }

  const remaining = parseFloat(budgetLine[0].remainingAmount || "0");

  if (remaining < requestedAmount) {
    return {
      available: false,
      remainingAmount: remaining,
      message: `Insufficient budget. Available: ${remaining.toFixed(2)}, Requested: ${requestedAmount.toFixed(2)}`,
    };
  }

  return {
    available: true,
    remainingAmount: remaining - requestedAmount,
    message: "Budget available",
  };
}

/**
 * Create budget reservation when PR is submitted
 */
export async function createBudgetReservation(params: {
  purchaseRequestId: number;
  budgetLineId: number;
  projectId: number;
  organizationId: number;
  operatingUnitId?: number;
  reservedAmount: number;
  currency: string;
  exchangeRate?: number;
  userId?: number;
}): Promise<{ success: boolean; reservationId?: number; message: string }> {
  const db = await getDb();

  try {
    // 1. Validate budget availability
    const validation = await validateBudgetAvailability(
      params.budgetLineId,
      params.reservedAmount
    );

    if (!validation.available) {
      return {
        success: false,
        message: validation.message,
      };
    }

    // 2. Generate reservation number
    const reservationNumber = await generateReservationNumber(params.organizationId);

    // 3. Calculate base currency amount
    const exchangeRate = params.exchangeRate || 1;
    const baseCurrencyAmount = params.reservedAmount * exchangeRate;

    // 4. Create reservation record
    const [reservation] = await db.insert(prBudgetReservations).values({
      purchaseRequestId: params.purchaseRequestId,
      budgetLineId: params.budgetLineId,
      projectId: params.projectId,
      organizationId: params.organizationId,
      operatingUnitId: params.operatingUnitId,
      reservationNumber,
      reservedAmount: params.reservedAmount.toString(),
      currency: params.currency,
      exchangeRate: exchangeRate.toString(),
      baseCurrencyAmount: baseCurrencyAmount.toString(),
      status: "active",
      createdBy: params.userId,
    });

    // 5. Update budget line committed amount
    await db
      .update(budgetLines)
      .set({
        committedAmount: sql`${budgetLines.committedAmount} + ${params.reservedAmount}`,
        remainingAmount: sql`${budgetLines.remainingAmount} - ${params.reservedAmount}`,
      })
      .where(eq(budgetLines.id, params.budgetLineId));

    return {
      success: true,
      reservationId: reservation.insertId,
      message: `Budget reservation ${reservationNumber} created successfully`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to create budget reservation: ${error.message}`,
    };
  }
}

/**
 * Generate unique reservation number (RES-YYYY-NNNN)
 */
async function generateReservationNumber(organizationId: number): Promise<string> {
  const db = await getDb();
  const year = new Date().getFullYear();
  
  const [result] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(prBudgetReservations)
    .where(
      and(
        eq(prBudgetReservations.organizationId, organizationId),
        sql`YEAR(${prBudgetReservations.createdAt}) = ${year}`
      )
    );

  const count = (result?.count || 0) + 1;
  return `RES-${year}-${count.toString().padStart(4, "0")}`;
}

/**
 * Release budget reservation (when PR is rejected or cancelled)
 */
export async function releaseBudgetReservation(
  reservationId: number
): Promise<{ success: boolean; message: string }> {
  const db = await getDb();

  try {
    // 1. Get reservation details
    const [reservation] = await db
      .select()
      .from(prBudgetReservations)
      .where(eq(prBudgetReservations.id, reservationId))
      .limit(1);

    if (!reservation) {
      return { success: false, message: "Reservation not found" };
    }

    if (reservation.status !== "active") {
      return {
        success: false,
        message: `Cannot release reservation with status: ${reservation.status}`,
      };
    }

    // 2. Update reservation status
    await db
      .update(prBudgetReservations)
      .set({
        status: "released",
        releasedAt: new Date().toISOString(),
      })
      .where(eq(prBudgetReservations.id, reservationId));

    // 3. Restore budget line amounts
    const reservedAmount = parseFloat(reservation.reservedAmount);
    await db
      .update(budgetLines)
      .set({
        committedAmount: sql`${budgetLines.committedAmount} - ${reservedAmount}`,
        remainingAmount: sql`${budgetLines.remainingAmount} + ${reservedAmount}`,
      })
      .where(eq(budgetLines.id, reservation.budgetLineId));

    return {
      success: true,
      message: `Budget reservation ${reservation.reservationNumber} released successfully`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to release budget reservation: ${error.message}`,
    };
  }
}

// ============================================================================
// PHASE 2: ENCUMBRANCE CREATION
// ============================================================================

/**
 * Convert budget reservation to encumbrance when vendor is selected
 */
export async function createEncumbranceFromReservation(params: {
  reservationId: number;
  purchaseOrderId?: number;
  vendorId: number;
  userId?: number;
}): Promise<{ success: boolean; encumbranceId?: number; message: string }> {
  const db = await getDb();

  try {
    // 1. Get reservation details
    const [reservation] = await db
      .select()
      .from(prBudgetReservations)
      .where(eq(prBudgetReservations.id, params.reservationId))
      .limit(1);

    if (!reservation) {
      return { success: false, message: "Reservation not found" };
    }

    if (reservation.status !== "active") {
      return {
        success: false,
        message: `Cannot convert reservation with status: ${reservation.status}`,
      };
    }

    // 2. Generate encumbrance number
    const encumbranceNumber = await generateEncumbranceNumber(reservation.organizationId);

    // 3. Create encumbrance record
    const [encumbrance] = await db.insert(financeEncumbrances).values({
      purchaseRequestId: reservation.purchaseRequestId,
      purchaseOrderId: params.purchaseOrderId,
      budgetLineId: reservation.budgetLineId,
      vendorId: params.vendorId,
      projectId: reservation.projectId,
      organizationId: reservation.organizationId,
      operatingUnitId: reservation.operatingUnitId,
      encumbranceNumber,
      encumberedAmount: reservation.reservedAmount,
      currency: reservation.currency,
      exchangeRate: reservation.exchangeRate,
      baseCurrencyAmount: reservation.baseCurrencyAmount,
      status: "active",
      liquidatedAmount: "0",
      remainingAmount: reservation.reservedAmount,
      reservationId: params.reservationId,
      createdBy: params.userId,
    });

    // 4. Update reservation status
    await db
      .update(prBudgetReservations)
      .set({
        status: "converted_to_encumbrance",
        convertedToEncumbranceAt: new Date().toISOString(),
      })
      .where(eq(prBudgetReservations.id, params.reservationId));

    return {
      success: true,
      encumbranceId: encumbrance.insertId,
      message: `Encumbrance ${encumbranceNumber} created successfully`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to create encumbrance: ${error.message}`,
    };
  }
}

/**
 * Generate unique encumbrance number (ENC-YYYY-NNNN)
 */
async function generateEncumbranceNumber(organizationId: number): Promise<string> {
  const db = await getDb();
  const year = new Date().getFullYear();
  
  const [result] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(financeEncumbrances)
    .where(
      and(
        eq(financeEncumbrances.organizationId, organizationId),
        sql`YEAR(${financeEncumbrances.createdAt}) = ${year}`
      )
    );

  const count = (result?.count || 0) + 1;
  return `ENC-${year}-${count.toString().padStart(4, "0")}`;
}

// ============================================================================
// PHASE 3: ACCOUNTS PAYABLE CREATION
// ============================================================================

/**
 * Create accounts payable from purchase order
 */
export async function createPayableFromPO(params: {
  purchaseRequestId: number;
  purchaseOrderId: number;
  vendorId: number;
  encumbranceId?: number;
  organizationId: number;
  operatingUnitId?: number;
  totalAmount: number;
  currency: string;
  exchangeRate?: number;
  paymentTerms?: string;
  dueDate?: string; // YYYY-MM-DD date string
  userId?: number;
}): Promise<{ success: boolean; payableId?: number; message: string }> {
  const db = await getDb();

  try {
    // 1. Generate payable number
    const payableNumber = await generatePayableNumber(params.organizationId);

    // 2. Calculate base currency amount
    const exchangeRate = params.exchangeRate || 1;
    const baseCurrencyAmount = params.totalAmount * exchangeRate;

    // 3. Create payable record
    const [payable] = await db.insert(procurementPayables).values({
      purchaseRequestId: params.purchaseRequestId,
      purchaseOrderId: params.purchaseOrderId,
      vendorId: params.vendorId,
      encumbranceId: params.encumbranceId,
      organizationId: params.organizationId,
      operatingUnitId: params.operatingUnitId,
      payableNumber,
      totalAmount: params.totalAmount.toString(),
      currency: params.currency,
      exchangeRate: exchangeRate.toString(),
      baseCurrencyAmount: baseCurrencyAmount.toString(),
      paymentTerms: params.paymentTerms,
      dueDate: params.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default: 30 days from creation
      status: "pending_grn",
      paidAmount: "0",
      remainingAmount: params.totalAmount.toString(),
      createdBy: params.userId,
    });

    return {
      success: true,
      payableId: payable.insertId,
      message: `Payable ${payableNumber} created successfully`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to create payable: ${error.message}`,
    };
  }
}

/**
 * Generate unique payable number (PAY-YYYY-NNNN)
 */
async function generatePayableNumber(organizationId: number): Promise<string> {
  const db = await getDb();
  const year = new Date().getFullYear();
  
  const [result] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(procurementPayables)
    .where(
      and(
        eq(procurementPayables.organizationId, organizationId),
        sql`YEAR(${procurementPayables.createdAt}) = ${year}`
      )
    );

  const count = (result?.count || 0) + 1;
  return `PAY-${year}-${count.toString().padStart(4, "0")}`;
}

// ============================================================================
// PHASE 4: INVOICE MATCHING & APPROVAL
// ============================================================================

/**
 * Create invoice and perform 3-way matching
 */
export async function createInvoiceWith3WayMatching(params: {
  purchaseRequestId: number;
  purchaseOrderId: number;
  grnId: number;
  vendorId: number;
  payableId?: number;
  organizationId: number;
  operatingUnitId?: number;
  vendorInvoiceNumber: string;
  invoiceDate: Date;
  invoiceAmount: number;
  currency: string;
  exchangeRate?: number;
  invoiceDocumentUrl?: string;
  userId?: number;
}): Promise<{
  success: boolean;
  invoiceId?: number;
  matchingStatus: "matched" | "variance_detected" | "rejected";
  varianceAmount?: number;
  message: string;
}> {
  const db = await getDb();

  try {
    // 1. Get PR, PO, and GRN amounts for 3-way matching
    const [pr] = await db
      .select()
      .from(purchaseRequests)
      .where(eq(purchaseRequests.id, params.purchaseRequestId))
      .limit(1);

    const [po] = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, params.purchaseOrderId))
      .limit(1);

    const [grn] = await db
      .select()
      .from(goodsReceiptNotes)
      .where(eq(goodsReceiptNotes.id, params.grnId))
      .limit(1);

    if (!pr || !po || !grn) {
      return {
        success: false,
        matchingStatus: "rejected",
        message: "PR, PO, or GRN not found",
      };
    }

    const prAmount = parseFloat(pr.prTotalUSD || "0");
    const poAmount = parseFloat(po.totalAmountUSD || "0");
    const grnAmount = parseFloat(grn.totalAmountUSD || "0");

    // 2. Perform 3-way matching
    const variance = params.invoiceAmount - grnAmount;
    const variancePercentage = Math.abs((variance / grnAmount) * 100);

    let matchingStatus: "matched" | "variance_detected" | "rejected" = "matched";
    let varianceReason = "";

    if (variancePercentage > 5) {
      matchingStatus = "variance_detected";
      varianceReason = `Invoice amount (${params.invoiceAmount}) differs from GRN amount (${grnAmount}) by ${variancePercentage.toFixed(2)}%`;
    } else if (variancePercentage > 0 && variancePercentage <= 5) {
      matchingStatus = "matched";
      varianceReason = `Minor variance of ${variancePercentage.toFixed(2)}% within acceptable threshold`;
    }

    // 3. Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(params.organizationId);

    // 4. Calculate base currency amount
    const exchangeRate = params.exchangeRate || 1;
    const baseCurrencyAmount = params.invoiceAmount * exchangeRate;

    // 5. Create invoice record
    const [invoice] = await db.insert(procurementInvoices).values({
      purchaseRequestId: params.purchaseRequestId,
      purchaseOrderId: params.purchaseOrderId,
      grnId: params.grnId,
      vendorId: params.vendorId,
      payableId: params.payableId,
      organizationId: params.organizationId,
      operatingUnitId: params.operatingUnitId,
      invoiceNumber,
      vendorInvoiceNumber: params.vendorInvoiceNumber,
      invoiceDate: params.invoiceDate,
      invoiceAmount: params.invoiceAmount.toString(),
      currency: params.currency,
      exchangeRate: exchangeRate.toString(),
      baseCurrencyAmount: baseCurrencyAmount.toString(),
      matchingStatus,
      prAmount: prAmount.toString(),
      poAmount: poAmount.toString(),
      grnAmount: grnAmount.toString(),
      varianceAmount: variance.toString(),
      varianceReason,
      approvalStatus: matchingStatus === "matched" ? "approved" : "pending",
      approvedBy: matchingStatus === "matched" ? params.userId : undefined,
      approvedAt: matchingStatus === "matched" ? new Date() : undefined,
      paymentStatus: "unpaid",
      invoiceDocumentUrl: params.invoiceDocumentUrl,
      createdBy: params.userId,
    });

    // 6. Update payable status
    if (params.payableId) {
      await db
        .update(procurementPayables)
        .set({
          status: matchingStatus === "matched" ? "pending_payment" : "pending_invoice",
          matchingStatus: matchingStatus,
        })
        .where(eq(procurementPayables.id, params.payableId));
    }

    return {
      success: true,
      invoiceId: invoice.insertId,
      matchingStatus,
      varianceAmount: Math.abs(variance),
      message:
        matchingStatus === "matched"
          ? `Invoice ${invoiceNumber} matched and auto-approved`
          : `Invoice ${invoiceNumber} created with variance - requires manual approval`,
    };
  } catch (error: any) {
    return {
      success: false,
      matchingStatus: "rejected",
      message: `Failed to create invoice: ${error.message}`,
    };
  }
}

/**
 * Generate unique invoice number (INV-YYYY-NNNN)
 */
async function generateInvoiceNumber(organizationId: number): Promise<string> {
  const db = await getDb();
  const year = new Date().getFullYear();
  
  const [result] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(procurementInvoices)
    .where(
      and(
        eq(procurementInvoices.organizationId, organizationId),
        sql`YEAR(${procurementInvoices.createdAt}) = ${year}`
      )
    );

  const count = (result?.count || 0) + 1;
  return `INV-${year}-${count.toString().padStart(4, "0")}`;
}

// ============================================================================
// PHASE 5: PAYMENT & CLOSURE
// ============================================================================

/**
 * Process payment and close financial cycle
 */
export async function processPaymentAndClose(params: {
  invoiceId: number;
  paymentId: number;
  paidAmount: number;
  userId?: number;
}): Promise<{ success: boolean; message: string }> {
  const db = await getDb();

  try {
    // 1. Get invoice details
    const [invoice] = await db
      .select()
      .from(procurementInvoices)
      .where(eq(procurementInvoices.id, params.invoiceId))
      .limit(1);

    if (!invoice) {
      return { success: false, message: "Invoice not found" };
    }

    // 2. Update invoice payment status
    await db
      .update(procurementInvoices)
      .set({
        paymentStatus: "paid",
        paymentId: params.paymentId,
        paidAt: new Date().toISOString(),
      })
      .where(eq(procurementInvoices.id, params.invoiceId));

    // 3. Update payable
    if (invoice.payableId) {
      await db
        .update(procurementPayables)
        .set({
          status: "fully_paid",
          paidAmount: params.paidAmount.toString(),
          remainingAmount: "0",
        })
        .where(eq(procurementPayables.id, invoice.payableId));

      // 4. Get payable to find encumbrance
      const [payable] = await db
        .select()
        .from(procurementPayables)
        .where(eq(procurementPayables.id, invoice.payableId))
        .limit(1);

      // 5. Liquidate encumbrance
      if (payable?.encumbranceId) {
        await db
          .update(financeEncumbrances)
          .set({
            status: "fully_liquidated",
            liquidatedAmount: params.paidAmount.toString(),
            remainingAmount: "0",
            closedAt: new Date().toISOString(),
          })
          .where(eq(financeEncumbrances.id, payable.encumbranceId));

        // 6. Get encumbrance to update budget line
        const [encumbrance] = await db
          .select()
          .from(financeEncumbrances)
          .where(eq(financeEncumbrances.id, payable.encumbranceId))
          .limit(1);

        // 7. Update budget line actual amount
        if (encumbrance) {
          await db
            .update(budgetLines)
            .set({
              actualAmount: sql`${budgetLines.actualAmount} + ${params.paidAmount}`,
              committedAmount: sql`${budgetLines.committedAmount} - ${params.paidAmount}`,
            })
            .where(eq(budgetLines.id, encumbrance.budgetLineId));
        }
      }
    }

    // 8. Update PR status to completed
    await db
      .update(purchaseRequests)
      .set({
        procurementStatus: "completed",
      })
      .where(eq(purchaseRequests.id, invoice.purchaseRequestId));

    return {
      success: true,
      message: `Payment processed and PR lifecycle closed successfully`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to process payment: ${error.message}`,
    };
  }
}
