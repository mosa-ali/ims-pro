/**
 * GRN to Payable Automation
 * Automatically creates payable records when GRN is accepted
 * Implements financial automation linkage for proper accounting
 * 
 * Calculation: Payable Amount = SUM(accepted_qty × PO unit_price)
 * Initial Status: pending_invoice
 * Per GRN: One GRN = One Payable (for partial deliveries)
 */

import {
  goodsReceiptNotes,
  grnLineItems,
  purchaseOrders,
  purchaseOrderLineItems,
  procurementPayables,
  purchaseRequests,
} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function createPayableFromGRN(
  dbOrTrx: any, // Can be db or transaction object
  grn: any,
  ctx: any
) {
  try {
    console.log(`\n🔄 [GRN→Payable] Starting automation for GRN ${grn.id}`);

    // Step 1: Check if payable already exists (duplicate prevention)
    const existingPayable = await dbOrTrx
      .select()
      .from(procurementPayables)
      .where(
        and(
          eq(procurementPayables.grnId, grn.id),
          eq(procurementPayables.organizationId, ctx.scope.organizationId),
          eq(procurementPayables.operatingUnitId, ctx.scope.operatingUnitId)
        )
      )
      .limit(1);

    if (existingPayable && existingPayable.length > 0) {
      console.log(`⚠️ [GRN→Payable] Payable already exists for GRN ${grn.id} - skipping duplicate`);
      return existingPayable[0];
    }

    // Step 2: Get GRN line items with accepted quantities
    const grnLines = await dbOrTrx
      .select()
      .from(grnLineItems)
      .where(eq(grnLineItems.grnId, grn.id));

    if (!grnLines || grnLines.length === 0) {
      console.log(`⚠️ [GRN→Payable] No GRN line items found for GRN ${grn.id}`);
      return null;
    }

    console.log(`📦 [GRN→Payable] Found ${grnLines.length} GRN line items`);

    // Step 3: Get PO details
    const poResults = await dbOrTrx
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, grn.poId));

    const po = poResults && poResults.length > 0 ? poResults[0] : null;

    if (!po) {
      console.error(`❌ [GRN→Payable] PO not found for GRN ${grn.id}`);
      throw new Error(`PO not found for GRN ${grn.id}`);
    }

    console.log(`📋 [GRN→Payable] Found PO: ${po.poNumber}`);

    // Step 4: Get PO line items for price lookup
    const poLines = await dbOrTrx
      .select()
      .from(purchaseOrderLineItems)
      .where(eq(purchaseOrderLineItems.poId, po.id));

    if (!poLines || poLines.length === 0) {
      console.error(`❌ [GRN→Payable] No PO line items found for PO ${po.id}`);
      throw new Error(`No PO line items found for PO ${po.id}`);
    }

    console.log(`💰 [GRN→Payable] Found ${poLines.length} PO line items for pricing`);

    // Step 5: Calculate payable amount
    // CRITICAL: Payable Amount = SUM(accepted_qty × PO unit_price)
    let totalPayableAmount = 0;
    let lineItemCount = 0;

    for (const grnLine of grnLines) {
      // Match GRN line to PO line by poLineItemId (most reliable)
      const poLine = poLines.find(
        (pl: any) => pl.id === grnLine.poLineItemId
      );

      if (!poLine) {
        console.warn(`⚠️ [GRN→Payable] No matching PO line for GRN line item ${grnLine.id}`);
        continue;
      }

      // Use acceptedQty (verified received quantity) × unitPrice (agreed PO price)
      const acceptedQty = grnLine.acceptedQty || 0;
      const unitPrice = parseFloat(poLine.unitPrice || 0);
      const lineAmount = acceptedQty * unitPrice;

      console.log(`  📊 Line: ${acceptedQty} units × $${unitPrice} = $${lineAmount}`);

      totalPayableAmount += lineAmount;
      lineItemCount++;
    }

    if (totalPayableAmount <= 0) {
      console.warn(`⚠️ [GRN→Payable] No valid payable amount calculated for GRN ${grn.id}`);
      return null;
    }

    console.log(`✅ [GRN→Payable] Total payable amount: $${totalPayableAmount} (${lineItemCount} items)`);

    // Step 6: Get PR details for linking
    const prResults = await dbOrTrx
      .select()
      .from(purchaseRequests)
      .where(eq(purchaseRequests.id, po.prId));

    // Step 7: Create payable record
    // Initial status: pending_invoice (goods received, waiting for vendor invoice)
    const payableNumber = `PAY-${nanoid(12).toUpperCase()}`;
    
    const payableRecord = {
      purchaseRequestId: po.prId,
      purchaseOrderId: po.id,
      grnId: grn.id,
      vendorId: po.vendorId,
      totalAmount: totalPayableAmount,
      currency: po.currency || "USD",
      status: "pending_invoice", // Initial status per architecture
      dueDate: po.paymentTerms ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
      payableNumber: payableNumber,
      organizationId: ctx.scope.organizationId,
      operatingUnitId: ctx.scope.operatingUnitId,
      createdBy: ctx.user?.id || "system",
      createdAt: new Date(),
      updatedBy: ctx.user?.id || "system",
      updatedAt: new Date(),
    };

    const insertResult = await dbOrTrx.insert(procurementPayables).values(payableRecord);

    console.log(`\n✅ [GRN→Payable] SUCCESS: Payable ${payableNumber} created`);
    console.log(`   - PR: ${po.prId}`);
    console.log(`   - PO: ${po.poNumber}`);
    console.log(`   - GRN: ${grn.id}`);
    console.log(`   - Amount: $${totalPayableAmount}`);
    console.log(`   - Status: pending_invoice\n`);

    return payableRecord;
  } catch (error) {
    console.error("\n❌ [GRN→Payable] ERROR in createPayableFromGRN:", error);
    throw error; // Propagate error to trigger transaction rollback
  }
}
