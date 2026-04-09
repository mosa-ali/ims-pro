/**
 * 3-Way Matching Logic for Invoice Validation
 * Validates PO-GRN-Invoice alignment and detects discrepancies
 */

import { getDb } from "./db";
import { eq } from "drizzle-orm";
import {
  purchaseOrders,
  purchaseOrderLineItems,
  goodsReceiptNotes,
  grnLineItems,
  procurementInvoices,
} from "../drizzle/schema";

export interface MatchingDiscrepancy {
  type: "quantity_mismatch" | "amount_mismatch" | "missing_item" | "extra_item";
  lineNumber?: number;
  description?: string;
  poQuantity?: number;
  grnQuantity?: number;
  invoiceQuantity?: number;
  poAmount?: number;
  invoiceAmount?: number;
  message: string;
}

export interface ThreeWayMatchingResult {
  matchingStatus: "matched" | "variance_detected" | "unmatched";
  discrepancies: MatchingDiscrepancy[];
  varianceAmount: number;
  prAmount: number;
  poAmount: number;
  grnAmount: number;
}

/**
 * Perform 3-way matching between PO, GRN, and Invoice
 */
export async function performThreeWayMatching(
  invoiceId: number,
  purchaseOrderId: number,
  grnId: number,
  invoiceAmount: number
): Promise<ThreeWayMatchingResult> {
  const db = await getDb();
  const discrepancies: MatchingDiscrepancy[] = [];

  // Fetch PO and its line items
  const [po] = await db
    .select()
    .from(purchaseOrders)
    .where(eq(purchaseOrders.id, purchaseOrderId));

  if (!po) {
    return {
      matchingStatus: "unmatched",
      discrepancies: [
        {
          type: "missing_item",
          message: "Purchase Order not found",
        },
      ],
      varianceAmount: invoiceAmount,
      prAmount: 0,
      poAmount: 0,
      grnAmount: 0,
    };
  }

  // Fetch GRN and its line items
  const [grn] = await db
    .select()
    .from(goodsReceiptNotes)
    .where(eq(goodsReceiptNotes.id, grnId));

  if (!grn) {
    return {
      matchingStatus: "unmatched",
      discrepancies: [
        {
          type: "missing_item",
          message: "Goods Receipt Note not found",
        },
      ],
      varianceAmount: invoiceAmount,
      prAmount: 0,
      poAmount: parseFloat(po.totalAmount?.toString() || "0"),
      grnAmount: 0,
    };
  }

  // Fetch PO line items
  const poLineItems = await db
    .select()
    .from(purchaseOrderLineItems)
    .where(eq(purchaseOrderLineItems.purchaseOrderId, purchaseOrderId));

  // Fetch GRN line items
  const grnLineItemsData = await db
    .select()
    .from(grnLineItems)
    .where(eq(grnLineItems.grnId, grnId));

  // Calculate totals
  const poAmount = parseFloat(po.totalAmount?.toString() || "0");
  const grnAmount = grnLineItemsData.reduce(
    (sum, item) => sum + parseFloat(item.acceptedQty?.toString() || "0") * parseFloat(item.orderedQty?.toString() || "0"),
    0
  );

  // Check for quantity mismatches
  for (const poLine of poLineItems) {
    const grnLine = grnLineItemsData.find(
      (g) => g.poLineItemId === poLine.id
    );

    if (!grnLine) {
      discrepancies.push({
        type: "missing_item",
        lineNumber: poLine.lineNumber,
        description: poLine.description,
        poQuantity: parseFloat(poLine.quantity?.toString() || "0"),
        message: `Line ${poLine.lineNumber}: Item not received in GRN`,
      });
      continue;
    }

    const poQty = parseFloat(poLine.quantity?.toString() || "0");
    const grnQty = parseFloat(grnLine.acceptedQty?.toString() || "0");

    // Check quantity mismatch
    if (poQty !== grnQty) {
      discrepancies.push({
        type: "quantity_mismatch",
        lineNumber: poLine.lineNumber,
        description: poLine.description,
        poQuantity: poQty,
        grnQuantity: grnQty,
        message: `Line ${poLine.lineNumber}: Quantity mismatch - PO: ${poQty}, GRN: ${grnQty}`,
      });
    }

    // Check amount mismatch
    const poLineAmount = parseFloat(poLine.totalPrice?.toString() || "0");
    const grnLineAmount = grnQty * parseFloat(poLine.unitPrice?.toString() || "0");

    if (Math.abs(poLineAmount - grnLineAmount) > 0.01) {
      discrepancies.push({
        type: "amount_mismatch",
        lineNumber: poLine.lineNumber,
        description: poLine.description,
        poAmount: poLineAmount,
        invoiceAmount: grnLineAmount,
        message: `Line ${poLine.lineNumber}: Amount mismatch - PO: ${poLineAmount}, GRN: ${grnLineAmount}`,
      });
    }
  }

  // Check for extra items in GRN
  for (const grnLine of grnLineItemsData) {
    const poLine = poLineItems.find((p) => p.id === grnLine.poLineItemId);
    if (!poLine) {
      discrepancies.push({
        type: "extra_item",
        lineNumber: grnLine.lineNumber,
        description: grnLine.description,
        grnQuantity: parseFloat(grnLine.acceptedQty?.toString() || "0"),
        message: `Line ${grnLine.lineNumber}: Extra item received not in PO`,
      });
    }
  }

  // Check invoice amount against PO total
  const varianceAmount = Math.abs(invoiceAmount - poAmount);
  const tolerancePercentage = 0.05; // 5% tolerance
  const tolerance = poAmount * tolerancePercentage;

  if (varianceAmount > tolerance) {
    discrepancies.push({
      type: "amount_mismatch",
      poAmount: poAmount,
      invoiceAmount: invoiceAmount,
      message: `Invoice amount (${invoiceAmount}) differs from PO amount (${poAmount}) by ${varianceAmount}`,
    });
  }

  // Determine matching status
  let matchingStatus: "matched" | "variance_detected" | "unmatched" = "matched";

  if (discrepancies.length > 0) {
    // Check if all discrepancies are minor (within tolerance)
    const hasSignificantDiscrepancies = discrepancies.some(
      (d) =>
        d.type === "missing_item" ||
        d.type === "extra_item" ||
        (d.type === "quantity_mismatch" && d.poQuantity !== d.grnQuantity) ||
        (d.type === "amount_mismatch" && Math.abs(d.poAmount || 0 - d.invoiceAmount || 0) > tolerance)
    );

    matchingStatus = hasSignificantDiscrepancies ? "unmatched" : "variance_detected";
  }

  return {
    matchingStatus,
    discrepancies,
    varianceAmount,
    prAmount: parseFloat(po.totalAmount?.toString() || "0"),
    poAmount,
    grnAmount,
  };
}

/**
 * Get matching status label for display
 */
export function getMatchingStatusLabel(status: string, language: string = "en"): string {
  const labels = {
    en: {
      matched: "Matched",
      variance_detected: "Variance Detected",
      unmatched: "Unmatched",
      pending: "Pending",
    },
    ar: {
      matched: "متطابقة",
      variance_detected: "اكتشاف تباين",
      unmatched: "غير متطابقة",
      pending: "قيد الانتظار",
    },
  };

  const lang = language as keyof typeof labels;
  return labels[lang]?.[status as keyof typeof labels.en] || status;
}

/**
 * Get matching status color for UI display
 */
export function getMatchingStatusColor(status: string): string {
  switch (status) {
    case "matched":
      return "bg-green-100 text-green-800";
    case "variance_detected":
      return "bg-yellow-100 text-yellow-800";
    case "unmatched":
      return "bg-red-100 text-red-800";
    case "pending":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
