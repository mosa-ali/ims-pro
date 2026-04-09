/**
 * GRN-to-Stock Automation
 * 
 * When a GRN is approved/accepted, this module automatically:
 * 1. Creates or finds stock items for each GRN line
 * 2. Creates stock batch records linked to GRN/PO/Vendor
 * 3. Posts GRN_IN ledger entries for audit traceability
 * 4. Updates stock item quantities
 * 5. Marks the GRN as stockPosted to prevent duplicate posting
 * 
 * Flow: GRN Approved → Stock Item (find/create) → Stock Batch → Stock Ledger → Available Stock
 * 
 * Rules:
 * - Only processes Goods category PRs
 * - Only uses accepted quantities (not rejected/damaged)
 * - Blocks duplicate posting from the same GRN
 * - Full traceability: Stock → GRN → PO → PR → Vendor
 */

import { eq, and, like, sql } from "drizzle-orm";
import {
  goodsReceiptNotes,
  grnLineItems,
  stockItems,
  stockBatches,
  stockLedger,
  purchaseOrders,
  purchaseOrderLineItems,
  purchaseRequests,
} from "../../drizzle/schema";

interface GrnToStockResult {
  success: boolean;
  stockItemsCreated: number;
  batchesCreated: number;
  ledgerEntriesCreated: number;
  error?: string;
}

/**
 * Process an approved GRN into stock records.
 * Called inside a transaction from the GRN approval flow.
 * 
 * @param trx - Database transaction
 * @param grnId - The GRN ID to process
 * @param userId - The user performing the action
 */
export async function processGrnToStock(
  trx: any,
  grnId: number,
  userId: number
): Promise<GrnToStockResult> {
  // 1. Get the GRN with its details
  const [grn] = await trx
    .select()
    .from(goodsReceiptNotes)
    .where(eq(goodsReceiptNotes.id, grnId))
    .limit(1);

  if (!grn) {
    return { success: false, stockItemsCreated: 0, batchesCreated: 0, ledgerEntriesCreated: 0, error: "GRN not found" };
  }

  // 2. Check if stock already posted from this GRN (prevent duplicates)
  if (grn.stockPosted === 1) {
    return { success: false, stockItemsCreated: 0, batchesCreated: 0, ledgerEntriesCreated: 0, error: "Stock has already been generated from this GRN." };
  }

  // 3. Validate this is a Goods PR (only Goods trigger stock)
  if (grn.purchaseOrderId) {
    const [po] = await trx
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, grn.purchaseOrderId))
      .limit(1);

    if (po?.purchaseRequestId) {
      const [pr] = await trx
        .select({ category: purchaseRequests.category })
        .from(purchaseRequests)
        .where(eq(purchaseRequests.id, po.purchaseRequestId))
        .limit(1);

      if (pr && pr.category !== "goods") {
        // Not a goods PR - skip stock creation (services/works don't go to stock)
        return { success: true, stockItemsCreated: 0, batchesCreated: 0, ledgerEntriesCreated: 0 };
      }
    }
  }

  // 4. Get GRN line items
  const grnLines = await trx
    .select()
    .from(grnLineItems)
    .where(eq(grnLineItems.grnId, grnId));

  if (!grnLines.length) {
    return { success: false, stockItemsCreated: 0, batchesCreated: 0, ledgerEntriesCreated: 0, error: "No GRN line items found" };
  }

  // 5. Get PO line items for unit price mapping
  let poLineMap: Record<number, { unitPrice: string; description: string }> = {};
  if (grn.purchaseOrderId) {
    const poLines = await trx
      .select()
      .from(purchaseOrderLineItems)
      .where(eq(purchaseOrderLineItems.purchaseOrderId, grn.purchaseOrderId));

    for (const pol of poLines) {
      poLineMap[pol.id] = {
        unitPrice: String(pol.unitPrice || "0"),
        description: typeof pol.description === "string" ? pol.description : "",
      };
    }
  }

  const organizationId = grn.organizationId;
  const operatingUnitId = grn.operatingUnitId;
  let stockItemsCreated = 0;
  let batchesCreated = 0;
  let ledgerEntriesCreated = 0;

  // 6. Process each GRN line item
  for (const line of grnLines) {
    const acceptedQty = parseFloat(String(line.acceptedQty || "0"));
    if (acceptedQty <= 0) continue; // Skip lines with no accepted quantity

    const description = String(line.description || "");
    const unit = String(line.unit || "Piece");
    const unitPrice = line.poLineItemId && poLineMap[line.poLineItemId]
      ? parseFloat(poLineMap[line.poLineItemId].unitPrice)
      : 0;

    // 6a. Find or create stock item
    let stockItemId: number;
    
    // Try to find existing stock item by description match (case-insensitive)
    const existingItems = await trx
      .select()
      .from(stockItems)
      .where(and(
        eq(stockItems.organizationId, organizationId),
        like(stockItems.itemName, description),
        sql`${stockItems.isDeleted} = 0`
      ))
      .limit(1);

    if (existingItems.length > 0) {
      stockItemId = existingItems[0].id;
      
      // Update the existing item's quantity
      const currentQty = parseFloat(String(existingItems[0].currentQuantity || "0"));
      const currentCost = parseFloat(String(existingItems[0].unitCost || "0"));
      const newQty = currentQty + acceptedQty;
      const newTotalValue = (newQty * (unitPrice || currentCost)).toFixed(2);
      
      await trx.update(stockItems).set({
        currentQuantity: String(newQty),
        totalValue: newTotalValue,
        unitCost: unitPrice > 0 ? String(unitPrice) : String(currentCost),
        operatingUnitId: operatingUnitId,
      }).where(eq(stockItems.id, stockItemId));
    } else {
      // Create new stock item
      const itemCode = await generateItemCode(trx, organizationId, description);
      
      const insertResult = await trx.insert(stockItems).values({
        organizationId,
        operatingUnitId,
        itemCode,
        itemName: description,
        description: `Auto-created from GRN ${grn.grnNumber}`,
        category: "Goods",
        unitType: unit,
        currentQuantity: String(acceptedQty),
        minimumQuantity: "0",
        unitCost: String(unitPrice),
        totalValue: (acceptedQty * unitPrice).toFixed(2),
        currency: "USD",
        createdBy: userId,
      });
      
      stockItemId = insertResult[0].insertId;
      stockItemsCreated++;
    }

    // 6b. Create stock batch
    const batchNumber = `BATCH-${grn.grnNumber}-L${line.lineNumber}`;
    
    const batchResult = await trx.insert(stockBatches).values({
      organizationId,
      operatingUnitId,
      batchNumber,
      grnId: grnId,
      grnLineItemId: line.id,
      poId: grn.purchaseOrderId || null,
      vendorId: grn.supplierId || null,
      itemId: stockItemId,
      warehouseId: null,
      warehouseName: grn.warehouse || null,
      receivedQty: String(parseFloat(String(line.receivedQty || "0"))),
      acceptedQty: String(acceptedQty),
      reservedQty: "0",
      issuedQty: "0",
      lossAdjustments: "0",
      returnsAccepted: "0",
      unitCost: String(unitPrice),
      batchStatus: "available",
      receivedDate: grn.grnDate || new Date(),
    });

    const batchId = batchResult[0].insertId;
    batchesCreated++;

    // 6c. Post stock ledger entry (GRN_IN)
    await trx.insert(stockLedger).values({
      organizationId,
      operatingUnitId,
      movementType: "GRN_IN",
      referenceType: "GRN",
      referenceId: grnId,
      referenceNumber: grn.grnNumber,
      warehouseId: null,
      warehouseName: grn.warehouse || null,
      batchId,
      itemId: stockItemId,
      qtyChange: String(acceptedQty),
      unit,
      unitCost: String(unitPrice),
      totalValue: (acceptedQty * unitPrice).toFixed(2),
      userId,
      notes: `Auto-posted from GRN ${grn.grnNumber}, Line ${line.lineNumber}: ${description}`,
      transactionDate: grn.grnDate || new Date(),
    });
    ledgerEntriesCreated++;
  }

  // 7. Mark GRN as stock posted
  await trx.update(goodsReceiptNotes).set({
    stockPosted: 1,
  }).where(eq(goodsReceiptNotes.id, grnId));

  return {
    success: true,
    stockItemsCreated,
    batchesCreated,
    ledgerEntriesCreated,
  };
}

/**
 * Generate a unique item code for a new stock item.
 * Format: STK-{ORG_ID}-{SEQ_NUMBER}
 */
async function generateItemCode(
  trx: any,
  organizationId: number,
  description: string
): Promise<string> {
  // Get the count of existing items for this org to generate sequence
  const countResult = await trx
    .select({ count: sql<number>`count(*)` })
    .from(stockItems)
    .where(eq(stockItems.organizationId, organizationId));

  const seq = (countResult[0]?.count || 0) + 1;
  const prefix = description.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "X");
  return `STK-${prefix}-${String(seq).padStart(4, "0")}`;
}

/**
 * Retroactively process all accepted GRNs that haven't been stock-posted yet.
 * This is called once to backfill stock from existing approved GRNs.
 */
export async function retroactivelyProcessAcceptedGrns(
  db: any,
  userId: number
): Promise<{ processed: number; errors: string[] }> {
  // Find all accepted GRNs that haven't been stock-posted
  const unpostedGrns = await db
    .select()
    .from(goodsReceiptNotes)
    .where(and(
      eq(goodsReceiptNotes.status, "accepted"),
      eq(goodsReceiptNotes.stockPosted, 0),
      sql`${goodsReceiptNotes.isDeleted} = 0`
    ));

  let processed = 0;
  const errors: string[] = [];

  for (const grn of unpostedGrns) {
    try {
      // Process each GRN in its own transaction
      await db.transaction(async (trx: any) => {
        const result = await processGrnToStock(trx, grn.id, userId);
        if (result.success) {
          processed++;
        } else if (result.error) {
          errors.push(`GRN ${grn.grnNumber}: ${result.error}`);
        }
      });
    } catch (err: any) {
      errors.push(`GRN ${grn.grnNumber}: ${err.message}`);
    }
  }

  return { processed, errors };
}
