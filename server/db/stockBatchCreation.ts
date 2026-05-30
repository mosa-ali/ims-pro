/**
 * Stock Batch Creation from GRN
 * When a GRN is accepted, create stock batch records for each line item
 * This enables partial issuance and FEFO/FIFO workflow
 */

import { getDb } from "../db";
import { isNotNull } from "drizzle-orm";

export async function createStockBatchesFromGRN(
  grnId: number,
  organizationId: number,
  operatingUnitId: number | null,
  userId: number
): Promise<{ success: boolean; batchCount: number; batches: Array<{ id: number; batchNumber: string }> }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const {
      goodsReceiptNotes,
      grnLineItems,
      stockBatches,
      stockItems,
      stockLedger,
      purchaseOrderLineItems,
    } = await import("../../drizzle/schema");
    const { eq, and } = await import("drizzle-orm");

    // Get GRN details
    const [grn] = await db
      .select()
      .from(goodsReceiptNotes)
      .where(
        and(
          eq(goodsReceiptNotes.id, grnId),
          eq(goodsReceiptNotes.organizationId, organizationId)
        )
      );

    if (!grn) {
      throw new Error(`GRN not found: ${grnId}`);
    }

    // Get GRN line items
    const grnItems = await db
      .select()
      .from(grnLineItems)
      .where(eq(grnLineItems.grnId, grnId));

    if (grnItems.length === 0) {
      throw new Error(`No line items found for GRN: ${grnId}`);
    }

    const createdBatches: Array<{ id: number; batchNumber: string }> = [];

    // Create stock batch for each GRN line item
    for (const grnItem of grnItems) {
      // Get item details to check for expiry date
      const [item] = await db
        .select()
        .from(stockItems)
        .where(eq(stockItems.id, grnItem.itemId));

      if (!item) {
        console.warn(`Stock item not found: ${grnItem.itemId}`);
        continue;
      }

      // Generate batch number (format: BATCH-GRN-XXXXXXX-SEQ)
      const timestamp = Date.now().toString().slice(-5);
      const sequence = grnItem.lineNumber || 1;
      const batchNumber = `BATCH-${grn.grnNumber}-${sequence}`;

      // Get PO line item for additional details
      const [poLineItem] = grnItem.poLineItemId
        ? await db
            .select()
            .from(purchaseOrderLineItems)
            .where(eq(purchaseOrderLineItems.id, grnItem.poLineItemId))
        : [null];

      // Create stock batch
      const [batchResult] = await db
        .insert(stockBatches)
        .values({
          organizationId,
          operatingUnitId,
          batchNumber,
          grnLineItemId: grnItem.id,
          itemId: grnItem.itemId,
          warehouseId: grn.warehouseId,
          warehouseName: grn.warehouseName,
          receivedQty: grnItem.receivedQty,
          acceptedQty: grnItem.acceptedQty, // Use accepted quantity as available
          reservedQty: 0,
          issuedQty: 0,
          lossAdjustments: 0,
          returnsAccepted: 0,
          expiryDate: poLineItem?.expiryDate || null,
          lotNumber: grnItem.lotNumber || null,
          serialNumber: grnItem.serialNumber || null,
          unitCost: poLineItem?.unitCost || 0,
          batchStatus: "available",
          receivedDate: grn.createdAt,
        })
        .$returningId();

      if (!batchResult?.id) {
        throw new Error(`Failed to create stock batch for GRN line item: ${grnItem.id}`);
      }

      createdBatches.push({
        id: batchResult.id,
        batchNumber,
      });

      // Create stock ledger entry for GRN_IN
      await db
        .insert(stockLedger)
        .values({
          organizationId,
          operatingUnitId,
          movementType: "GRN_IN",
          referenceType: "GRN",
          referenceId: grnId,
          referenceNumber: grn.grnNumber,
          warehouseId: grn.warehouseId,
          warehouseName: grn.warehouseName,
          batchId: batchResult.id,
          itemId: grnItem.itemId,
          qtyChange: grnItem.acceptedQty, // Positive for IN
          unit: grnItem.unit,
          unitCost: poLineItem?.unitCost || 0,
          totalValue: (parseFloat(String(grnItem.acceptedQty)) * parseFloat(String(poLineItem?.unitCost || 0))),
          userId,
          notes: `Stock batch created from GRN: ${grn.grnNumber}`,
          transactionDate: new Date(),
        });

      console.log(`[Stock] Batch created: ${batchNumber} (ID: ${batchResult.id})`);
    }

    console.log(`[Stock] ${createdBatches.length} stock batches created from GRN: ${grn.grnNumber}`);
    return {
      success: true,
      batchCount: createdBatches.length,
      batches: createdBatches,
    };
  } catch (error) {
    console.error("[Stock] Error creating stock batches from GRN:", error);
    throw error;
  }
}

/**
 * Get available stock for an item (across all batches)
 * availableQty = acceptedQty - issuedQty - reservedQty - adjustments + returns
 */
export async function getAvailableStock(
  itemId: number,
  organizationId: number,
  warehouseId?: number | null
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const { stockBatches } = await import("../../drizzle/schema");
    const { eq, and, sql } = await import("drizzle-orm");

    const whereConditions = [
      eq(stockBatches.itemId, itemId),
      eq(stockBatches.organizationId, organizationId),
      eq(stockBatches.batchStatus, "available"),
    ];

    if (warehouseId) {
      whereConditions.push(eq(stockBatches.warehouseId, warehouseId));
    }

    const batches = await db
      .select()
      .from(stockBatches)
      .where(and(...whereConditions));

    const totalAvailable = batches.reduce((sum, batch) => {
      const available =
        parseFloat(String(batch.acceptedQty || 0)) -
        parseFloat(String(batch.issuedQty || 0)) -
        parseFloat(String(batch.reservedQty || 0)) -
        parseFloat(String(batch.lossAdjustments || 0)) +
        parseFloat(String(batch.returnsAccepted || 0));
      return sum + available;
    }, 0);

    return {
      totalAvailable,
      batches: batches.map((b) => ({
        id: b.id,
        batchNumber: b.batchNumber,
        availableQty:
          parseFloat(String(b.acceptedQty || 0)) -
          parseFloat(String(b.issuedQty || 0)) -
          parseFloat(String(b.reservedQty || 0)) -
          parseFloat(String(b.lossAdjustments || 0)) +
          parseFloat(String(b.returnsAccepted || 0)),
        expiryDate: b.expiryDate,
        lotNumber: b.lotNumber,
        receivedDate: b.receivedDate,
      })),
    };
  } catch (error) {
    console.error("[Stock] Error getting available stock:", error);
    throw error;
  }
}

/**
 * Get FEFO (Earliest Expiry First) batches for issuance
 * Sorts by expiryDate ASC, then receivedDate ASC
 */
export async function getFEFOBatches(
  itemId: number,
  organizationId: number,
  warehouseId?: number | null
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const { stockBatches } = await import("../../drizzle/schema");
    const { eq, and, isNotNull, sql } = await import("drizzle-orm");

    const whereConditions = [
      eq(stockBatches.itemId, itemId),
      eq(stockBatches.organizationId, organizationId),
      eq(stockBatches.batchStatus, "available"),
      isNotNull(stockBatches.expiryDate),
    ];

    if (warehouseId) {
      whereConditions.push(eq(stockBatches.warehouseId, warehouseId));
    }

    const batches = await db
      .select()
      .from(stockBatches)
      .where(and(...whereConditions))
      .orderBy(stockBatches.expiryDate, stockBatches.receivedDate);

    return batches.map((b) => ({
      id: b.id,
      batchNumber: b.batchNumber,
      availableQty:
        parseFloat(String(b.acceptedQty || 0)) -
        parseFloat(String(b.issuedQty || 0)) -
        parseFloat(String(b.reservedQty || 0)) -
        parseFloat(String(b.lossAdjustments || 0)) +
        parseFloat(String(b.returnsAccepted || 0)),
      expiryDate: b.expiryDate,
      lotNumber: b.lotNumber,
      receivedDate: b.receivedDate,
    }));
  } catch (error) {
    console.error("[Stock] Error getting FEFO batches:", error);
    throw error;
  }
}

/**
 * Get FIFO (First In First Out) batches for issuance
 * Sorts by receivedDate ASC
 */
export async function getFIFOBatches(
  itemId: number,
  organizationId: number,
  warehouseId?: number | null
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const { stockBatches } = await import("../../drizzle/schema");
    const { eq, and } = await import("drizzle-orm");

    const whereConditions = [
      eq(stockBatches.itemId, itemId),
      eq(stockBatches.organizationId, organizationId),
      eq(stockBatches.batchStatus, "available"),
    ];

    if (warehouseId) {
      whereConditions.push(eq(stockBatches.warehouseId, warehouseId));
    }

    const batches = await db
      .select()
      .from(stockBatches)
      .where(and(...whereConditions))
      .orderBy(stockBatches.receivedDate);

    return batches.map((b) => ({
      id: b.id,
      batchNumber: b.batchNumber,
      availableQty:
        parseFloat(String(b.acceptedQty || 0)) -
        parseFloat(String(b.issuedQty || 0)) -
        parseFloat(String(b.reservedQty || 0)) -
        parseFloat(String(b.lossAdjustments || 0)) +
        parseFloat(String(b.returnsAccepted || 0)),
      expiryDate: b.expiryDate,
      lotNumber: b.lotNumber,
      receivedDate: b.receivedDate,
    }));
  } catch (error) {
    console.error("[Stock] Error getting FIFO batches:", error);
    throw error;
  }
}
