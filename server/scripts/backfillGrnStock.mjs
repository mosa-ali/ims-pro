/**
 * One-time migration script: Backfill stock records from existing accepted GRNs
 * 
 * Run: node server/scripts/backfillGrnStock.mjs
 * 
 * This processes all GRNs with status='accepted' and stockPosted=0,
 * creating stock items, batches, and ledger entries.
 */

import dotenv from "dotenv";
dotenv.config();

import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  
  try {
    // 1. Find all accepted GRNs that haven't been stock-posted
    const [grns] = await conn.query(
      `SELECT g.*, po.purchaseRequestId, po.supplierId as poSupplierId
       FROM goods_receipt_notes g
       LEFT JOIN purchase_orders po ON g.purchaseOrderId = po.id
       WHERE g.status = 'accepted' AND g.stockPosted = 0 AND g.isDeleted = 0`
    );
    
    console.log(`Found ${grns.length} unposted GRNs to process`);
    
    if (grns.length === 0) {
      console.log("No GRNs to process. Exiting.");
      await conn.end();
      return;
    }
    
    for (const grn of grns) {
      console.log(`\nProcessing GRN ${grn.grnNumber} (ID: ${grn.id})...`);
      
      // Check if this is a goods PR (skip services)
      if (grn.purchaseRequestId) {
        const [prs] = await conn.query(
          `SELECT category FROM purchase_requests WHERE id = ?`,
          [grn.purchaseRequestId]
        );
        if (prs.length > 0 && prs[0].category !== "goods") {
          console.log(`  Skipping - PR category is '${prs[0].category}' (not goods)`);
          continue;
        }
      }
      
      // 2. Get GRN line items
      const [grnLines] = await conn.query(
        `SELECT gl.*, pol.unitPrice as poUnitPrice, pol.description as poDescription
         FROM grn_line_items gl
         LEFT JOIN purchase_order_line_items pol ON gl.poLineItemId = pol.id
         WHERE gl.grnId = ?`,
        [grn.id]
      );
      
      console.log(`  Found ${grnLines.length} line items`);
      
      await conn.beginTransaction();
      
      try {
        for (const line of grnLines) {
          const acceptedQty = parseFloat(line.acceptedQty || "0");
          if (acceptedQty <= 0) {
            console.log(`  Line ${line.lineNumber}: Skipping (0 accepted qty)`);
            continue;
          }
          
          const description = line.description || line.poDescription || "Unknown Item";
          const unit = line.unit || "Piece";
          const unitPrice = parseFloat(line.poUnitPrice || "0");
          
          // 3. Find or create stock item
          const [existingItems] = await conn.query(
            `SELECT * FROM stock_items WHERE organizationId = ? AND itemName = ? AND isDeleted = 0 LIMIT 1`,
            [grn.organizationId, description]
          );
          
          let stockItemId;
          
          if (existingItems.length > 0) {
            stockItemId = existingItems[0].id;
            const currentQty = parseFloat(existingItems[0].currentQuantity || "0");
            const newQty = currentQty + acceptedQty;
            const newTotalValue = (newQty * (unitPrice || parseFloat(existingItems[0].unitCost || "0"))).toFixed(2);
            
            await conn.query(
              `UPDATE stock_items SET currentQuantity = ?, totalValue = ?, unitCost = ?, operatingUnitId = ? WHERE id = ?`,
              [String(newQty), newTotalValue, unitPrice > 0 ? String(unitPrice) : existingItems[0].unitCost, grn.operatingUnitId, stockItemId]
            );
            console.log(`  Line ${line.lineNumber}: Updated existing stock item '${description}' (qty: ${currentQty} → ${newQty})`);
          } else {
            // Count existing items for code generation
            const [countResult] = await conn.query(
              `SELECT COUNT(*) as cnt FROM stock_items WHERE organizationId = ?`,
              [grn.organizationId]
            );
            const seq = (countResult[0].cnt || 0) + 1;
            const prefix = description.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "X");
            const itemCode = `STK-${prefix}-${String(seq).padStart(4, "0")}`;
            
            const [insertResult] = await conn.query(
              `INSERT INTO stock_items (organizationId, operatingUnitId, itemCode, itemName, description, category, unitType, currentQuantity, minimumQuantity, unitCost, totalValue, currency, createdBy)
               VALUES (?, ?, ?, ?, ?, 'Goods', ?, ?, '0', ?, ?, 'USD', ?)`,
              [
                grn.organizationId,
                grn.operatingUnitId,
                itemCode,
                description,
                `Auto-created from GRN ${grn.grnNumber}`,
                unit,
                String(acceptedQty),
                String(unitPrice),
                (acceptedQty * unitPrice).toFixed(2),
                grn.createdBy || 1,
              ]
            );
            stockItemId = insertResult.insertId;
            console.log(`  Line ${line.lineNumber}: Created new stock item '${description}' (code: ${itemCode}, qty: ${acceptedQty})`);
          }
          
          // 4. Create stock batch
          const batchNumber = `BATCH-${grn.grnNumber}-L${line.lineNumber}`;
          
          const [batchResult] = await conn.query(
            `INSERT INTO stock_batches (organizationId, operatingUnitId, batchNumber, grnId, grnLineItemId, poId, vendorId, itemId, warehouseName, receivedQty, acceptedQty, reservedQty, issuedQty, lossAdjustments, returnsAccepted, unitCost, batchStatus, receivedDate)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '0', '0', '0', '0', ?, 'available', ?)`,
            [
              grn.organizationId,
              grn.operatingUnitId,
              batchNumber,
              grn.id,
              line.id,
              grn.purchaseOrderId,
              grn.supplierId,
              stockItemId,
              grn.warehouse,
              String(parseFloat(line.receivedQty || "0")),
              String(acceptedQty),
              String(unitPrice),
              grn.grnDate || new Date().toISOString().slice(0, 19),
            ]
          );
          const batchId = batchResult.insertId;
          console.log(`  Line ${line.lineNumber}: Created batch '${batchNumber}' (batchId: ${batchId})`);
          
          // 5. Post stock ledger entry
          await conn.query(
            `INSERT INTO stock_ledger (organizationId, operatingUnitId, movementType, referenceType, referenceId, referenceNumber, warehouseName, batchId, itemId, qtyChange, unit, unitCost, totalValue, userId, notes, transactionDate)
             VALUES (?, ?, 'GRN_IN', 'GRN', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              grn.organizationId,
              grn.operatingUnitId,
              grn.id,
              grn.grnNumber,
              grn.warehouse,
              batchId,
              stockItemId,
              String(acceptedQty),
              unit,
              String(unitPrice),
              (acceptedQty * unitPrice).toFixed(2),
              grn.createdBy || 1,
              `Auto-posted from GRN ${grn.grnNumber}, Line ${line.lineNumber}: ${description}`,
              grn.grnDate || new Date().toISOString().slice(0, 19),
            ]
          );
          console.log(`  Line ${line.lineNumber}: Posted ledger entry (GRN_IN, qty: ${acceptedQty})`);
        }
        
        // 6. Mark GRN as stock posted
        await conn.query(
          `UPDATE goods_receipt_notes SET stockPosted = 1 WHERE id = ?`,
          [grn.id]
        );
        
        await conn.commit();
        console.log(`  ✅ GRN ${grn.grnNumber} processed successfully`);
        
      } catch (err) {
        await conn.rollback();
        console.error(`  ❌ Error processing GRN ${grn.grnNumber}:`, err.message);
      }
    }
    
    // Summary
    const [stockItemCount] = await conn.query(`SELECT COUNT(*) as cnt FROM stock_items WHERE isDeleted = 0`);
    const [batchCount] = await conn.query(`SELECT COUNT(*) as cnt FROM stock_batches`);
    const [ledgerCount] = await conn.query(`SELECT COUNT(*) as cnt FROM stock_ledger`);
    
    console.log("\n=== SUMMARY ===");
    console.log(`Stock Items: ${stockItemCount[0].cnt}`);
    console.log(`Stock Batches: ${batchCount[0].cnt}`);
    console.log(`Ledger Entries: ${ledgerCount[0].cnt}`);
    
  } finally {
    await conn.end();
  }
}

main().catch(console.error);
