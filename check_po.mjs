import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Find PO-025
const [pos] = await conn.query(`SELECT id, poNumber, purchaseRequestId, supplierId, subtotal, totalAmount, currency FROM purchase_orders WHERE poNumber = 'PO-EFADAH01-2026-025'`);
console.log('PO-025:', JSON.stringify(pos, null, 2));

if (pos.length > 0) {
  const poId = pos[0].id;
  const prId = pos[0].purchaseRequestId;
  
  // PO line items
  const [poLines] = await conn.query(`SELECT id, lineNumber, description, quantity, unitPrice, totalPrice FROM purchase_order_line_items WHERE purchaseOrderId = ?`, [poId]);
  console.log('\nPO Line Items:', JSON.stringify(poLines, null, 2));
  
  // PR line items
  const [prLines] = await conn.query(`SELECT id, lineNumber, description, quantity, unitPrice, totalPrice FROM purchase_request_line_items WHERE purchaseRequestId = ?`, [prId]);
  console.log('\nPR Line Items:', JSON.stringify(prLines, null, 2));
  
  // RFQ vendor items
  const [rfqVendors] = await conn.query(`SELECT rv.id, rv.supplierId, rv.quotedAmount FROM rfq_vendors rv WHERE rv.purchaseRequestId = ?`, [prId]);
  console.log('\nRFQ Vendors:', JSON.stringify(rfqVendors, null, 2));
  
  if (rfqVendors.length > 0) {
    for (const rv of rfqVendors) {
      const [items] = await conn.query(`SELECT id, prLineItemId, quotedUnitPrice, quotedTotalPrice FROM rfq_vendor_items WHERE rfqVendorId = ?`, [rv.id]);
      console.log(`\nRFQ Vendor ${rv.id} Items:`, JSON.stringify(items, null, 2));
    }
  }
}

await conn.end();
