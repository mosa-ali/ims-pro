import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();
const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Check GRN 60001
const [grn] = await conn.query(`SELECT * FROM goods_receipt_notes WHERE id = 60001`);
console.log('=== GRN 60001 ===');
console.log(`  purchaseOrderId=${grn[0].purchaseOrderId} | status=${grn[0].status} | grnNumber=${grn[0].grnNumber}`);

// Check the PO linked to GRN 60001
const poId = grn[0].purchaseOrderId;
const [po] = await conn.query(`SELECT id, poNumber, purchaseRequestId, subtotal, totalAmount FROM purchase_orders WHERE id = ?`, [poId]);
console.log('\n=== PO linked to GRN 60001 ===');
console.log(po[0]);

// Check PO line items for this PO
const [poLines] = await conn.query(`SELECT * FROM purchase_order_line_items WHERE purchaseOrderId = ?`, [poId]);
console.log('\n=== PO line items ===');
for (const l of poLines) {
  console.log(`  ID=${l.id} | desc=${l.description} | qty=${l.quantity} | unitPrice=${l.unitPrice} | totalPrice=${l.totalPrice}`);
}

// Check the PR for this PO
const prId = po[0]?.purchaseRequestId;
const [pr] = await conn.query(`SELECT id, prNumber, estimatedCost, category FROM purchase_requests WHERE id = ?`, [prId]);
console.log('\n=== PR ===');
console.log(pr[0]);

// Check PR line items
const [prLines] = await conn.query(`SELECT * FROM purchase_request_line_items WHERE purchaseRequestId = ?`, [prId]);
console.log('\n=== PR line items ===');
for (const l of prLines) {
  console.log(`  ID=${l.id} | desc=${l.description} | qty=${l.quantity} | unitPrice=${l.unitPrice} | totalPrice=${l.totalPrice}`);
}

// Now check the payable creation code - where does totalAmount come from?
// Check all columns of payable 90007
const [payable] = await conn.query(`SELECT * FROM procurement_payables WHERE id = 90007`);
console.log('\n=== Payable 90007 full record ===');
const cols = Object.keys(payable[0]);
for (const c of cols) {
  console.log(`  ${c} = ${payable[0][c]}`);
}

await conn.end();
