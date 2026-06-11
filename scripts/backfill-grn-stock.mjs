#!/usr/bin/env node

/**
 * Backfill Script: Process Existing GRNs into Stock
 * 
 * This script retroactively processes all accepted GRNs that haven't been
 * stock-posted yet, creating stock items, batches, and ledger entries.
 * 
 * Usage:
 *   node backfill-grn-stock.mjs [--dry-run] [--grn-ids 60002,60003,60009,60010]
 * 
 * Examples:
 *   node backfill-grn-stock.mjs                    # Process all unposted GRNs
 *   node backfill-grn-stock.mjs --dry-run          # Preview without changes
 *   node backfill-grn-stock.mjs --grn-ids 60002    # Process specific GRN
 */

import mysql from 'mysql2/promise';
import { config } from 'dotenv';

config();

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hci',
};

const SYSTEM_USER_ID = 1; // System/automation user

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const grnIdsArg = args.find(arg => arg.startsWith('--grn-ids='));
const specificGrnIds = grnIdsArg ? grnIdsArg.split('=')[1].split(',').map(Number) : null;

console.log('═══════════════════════════════════════════════════════════════');
console.log('GRN-to-Stock Backfill Script');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (no changes)' : '⚡ LIVE (will make changes)'}`);
console.log(`Target GRNs: ${specificGrnIds ? specificGrnIds.join(', ') : 'All unposted accepted GRNs'}`);
console.log('');

let connection;

try {
  // Connect to database
  connection = await mysql.createConnection(DB_CONFIG);
  console.log('✅ Connected to database');

  // Find unposted GRNs
  let query = `
    SELECT 
      g.id,
      g.grnNumber,
      g.purchaseOrderId,
      g.supplierId,
      g.organizationId,
      g.operatingUnitId,
      g.status,
      g.stockPosted,
      g.grnDate,
      g.warehouse,
      COUNT(l.id) as lineCount,
      SUM(CAST(l.acceptedQty AS DECIMAL(15,2))) as totalAcceptedQty
    FROM goods_receipt_notes g
    LEFT JOIN grn_line_items l ON l.grnId = g.id AND CAST(l.acceptedQty AS DECIMAL(15,2)) > 0
    WHERE g.status = 'accepted'
      AND g.stockPosted = 0
      AND g.isDeleted = 0
  `;

  if (specificGrnIds) {
    query += ` AND g.id IN (${specificGrnIds.join(',')})`;
  }

  query += ` GROUP BY g.id ORDER BY g.grnDate DESC`;

  const [unpostedGrns] = await connection.execute(query);

  console.log(`Found ${unpostedGrns.length} unposted GRN(s)\n`);

  if (unpostedGrns.length === 0) {
    console.log('ℹ️  No unposted GRNs found. All GRNs have been processed.');
    process.exit(0);
  }

  // Display summary
  console.log('GRNs to Process:');
  console.log('─────────────────────────────────────────────────────────────');
  for (const grn of unpostedGrns) {
    console.log(`  ${grn.grnNumber} (ID: ${grn.id})`);
    console.log(`    Lines: ${grn.lineCount} | Total Qty: ${grn.totalAcceptedQty} | Org: ${grn.organizationId}`);
  }
  console.log('');

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
    console.log('To apply changes, run without --dry-run flag');
    process.exit(0);
  }

  // Process each GRN
  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (const grn of unpostedGrns) {
    try {
      console.log(`Processing GRN ${grn.grnNumber} (ID: ${grn.id})...`);

      // Get GRN line items
      const [grnLines] = await connection.execute(
        `SELECT * FROM grn_line_items WHERE grnId = ? AND CAST(acceptedQty AS DECIMAL(15,2)) > 0`,
        [grn.id]
      );

      if (!grnLines.length) {
        console.log(`  ⚠️  No line items with accepted qty found`);
        continue;
      }

      // Get PO line items for unit price mapping
      const [poLines] = await connection.execute(
        `SELECT id, unitPrice FROM purchase_order_line_items WHERE purchaseOrderId = ?`,
        [grn.purchaseOrderId]
      );

      const poLineMap = {};
      for (const pol of poLines) {
        poLineMap[pol.id] = pol.unitPrice || 0;
      }

      let batchesCreated = 0;
      let ledgerEntriesCreated = 0;

      // Process each line
      for (const line of grnLines) {
        const acceptedQty = parseFloat(line.acceptedQty || '0');
        if (acceptedQty <= 0) continue;

        const description = line.description || 'Unknown Item';
        const unit = line.unit || 'Piece';
        const unitPrice = line.poLineItemId && poLineMap[line.poLineItemId]
          ? parseFloat(poLineMap[line.poLineItemId])
          : 0;

        // Find or create stock item
        const [existingItems] = await connection.execute(
          `SELECT id FROM stock_items 
           WHERE organizationId = ? AND itemName LIKE ? AND isDeleted = 0 LIMIT 1`,
          [grn.organizationId, `%${description}%`]
        );

        let stockItemId;
        if (existingItems.length > 0) {
          stockItemId = existingItems[0].id;
          console.log(`    ✓ Using existing stock item (ID: ${stockItemId})`);

          // Update existing item quantity
          const [currentItem] = await connection.execute(
            `SELECT currentQuantity, unitCost FROM stock_items WHERE id = ?`,
            [stockItemId]
          );

          const newQty = parseFloat(currentItem[0].currentQuantity || '0') + acceptedQty;
          const newCost = unitPrice > 0 ? unitPrice : parseFloat(currentItem[0].unitCost || '0');
          const newValue = (newQty * newCost).toFixed(2);

          await connection.execute(
            `UPDATE stock_items SET currentQuantity = ?, unitCost = ?, totalValue = ? WHERE id = ?`,
            [newQty, newCost, newValue, stockItemId]
          );
        } else {
          // Create new stock item
          const itemCode = `STK-${description.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X')}-${String(Date.now()).slice(-4)}`;

          const [result] = await connection.execute(
            `INSERT INTO stock_items 
             (organizationId, operatingUnitId, itemCode, itemName, description, category, unitType, currentQuantity, minimumQuantity, unitCost, totalValue, currency, createdBy)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              grn.organizationId,
              grn.operatingUnitId,
              itemCode,
              description,
              `Auto-created from GRN ${grn.grnNumber}`,
              'Goods',
              unit,
              acceptedQty,
              '0',
              unitPrice,
              (acceptedQty * unitPrice).toFixed(2),
              'USD',
              SYSTEM_USER_ID,
            ]
          );

          stockItemId = result.insertId;
          console.log(`    ✓ Created new stock item (ID: ${stockItemId})`);
        }

        // Create stock batch
        const batchNumber = `BATCH-${grn.grnNumber}-L${line.lineNumber}`;

        const [batchResult] = await connection.execute(
          `INSERT INTO stock_batches 
           (organizationId, operatingUnitId, batchNumber, grnId, grnLineItemId, poId, vendorId, itemId, warehouseId, warehouseName, receivedQty, acceptedQty, reservedQty, issuedQty, lossAdjustments, returnsAccepted, unitCost, batchStatus, receivedDate)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            grn.organizationId,
            grn.operatingUnitId,
            batchNumber,
            grn.id,
            line.id,
            grn.purchaseOrderId,
            grn.supplierId,
            stockItemId,
            null,
            grn.warehouse,
            parseFloat(line.receivedQty || '0'),
            acceptedQty,
            '0',
            '0',
            '0',
            '0',
            unitPrice,
            'available',
            grn.grnDate,
          ]
        );

        const batchId = batchResult.insertId;
        batchesCreated++;
        console.log(`    ✓ Created stock batch: ${batchNumber} (ID: ${batchId})`);

        // Create stock ledger entry (GRN_IN)
        await connection.execute(
          `INSERT INTO stock_ledger 
           (organizationId, operatingUnitId, movementType, referenceType, referenceId, referenceNumber, warehouseId, warehouseName, batchId, itemId, qtyChange, unit, unitCost, totalValue, userId, notes, transactionDate)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            grn.organizationId,
            grn.operatingUnitId,
            'GRN_IN',
            'GRN',
            grn.id,
            grn.grnNumber,
            null,
            grn.warehouse,
            batchId,
            stockItemId,
            acceptedQty,
            unit,
            unitPrice,
            (acceptedQty * unitPrice).toFixed(2),
            SYSTEM_USER_ID,
            `Auto-posted from GRN ${grn.grnNumber}, Line ${line.lineNumber}: ${description}`,
            grn.grnDate,
          ]
        );

        ledgerEntriesCreated++;
        console.log(`    ✓ Created ledger entry (GRN_IN)`);
      }

      // Mark GRN as stock posted
      await connection.execute(
        `UPDATE goods_receipt_notes SET stockPosted = 1 WHERE id = ?`,
        [grn.id]
      );

      console.log(`  ✅ GRN processed: ${batchesCreated} batch(es), ${ledgerEntriesCreated} ledger entry(ies)\n`);
      successCount++;
    } catch (err) {
      console.error(`  ❌ Error: ${err.message}\n`);
      errors.push(`GRN ${grn.grnNumber}: ${err.message}`);
      errorCount++;
    }
  }

  // Summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('Backfill Complete');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);

  if (errors.length > 0) {
    console.log('\nErrors:');
    for (const error of errors) {
      console.log(`  • ${error}`);
    }
  }

  // Verification
  console.log('\n📊 Verification:');
  const [batchCount] = await connection.execute(
    `SELECT COUNT(*) as count FROM stock_batches WHERE grnId IN (${unpostedGrns.map(g => g.id).join(',')})`
  );
  console.log(`  Stock batches created: ${batchCount[0].count}`);

  const [ledgerCount] = await connection.execute(
    `SELECT COUNT(*) as count FROM stock_ledger WHERE referenceType = 'GRN' AND referenceId IN (${unpostedGrns.map(g => g.id).join(',')})`
  );
  console.log(`  Ledger entries created: ${ledgerCount[0].count}`);

  const [postedGrnCount] = await connection.execute(
    `SELECT COUNT(*) as count FROM goods_receipt_notes WHERE id IN (${unpostedGrns.map(g => g.id).join(',')}) AND stockPosted = 1`
  );
  console.log(`  GRNs marked as posted: ${postedGrnCount[0].count}`);

  process.exit(successCount === unpostedGrns.length ? 0 : 1);
} catch (err) {
  console.error('❌ Fatal Error:', err.message);
  process.exit(1);
} finally {
  if (connection) {
    await connection.end();
  }
}
