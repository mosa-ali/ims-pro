import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();
const conn = await mysql.createConnection(process.env.DATABASE_URL);

// GRN 60001 (PR 660003, under $1K - broken payable $0)
const [lines1] = await conn.query(`SELECT * FROM grn_line_items WHERE grnId = 60001`);
console.log('=== GRN 60001 line items (PR 660003, under $1K) ===');
for (const l of lines1) {
  console.log(`  ID=${l.id} | desc=${l.description} | orderedQty=${l.orderedQty} | receivedQty=${l.receivedQty} | acceptedQty=${l.acceptedQty} | rejectedQty=${l.rejectedQty} | poLineItemId=${l.poLineItemId}`);
}

// GRN 60009 (PR 510050, over $25K - working payable $23500)
const [lines2] = await conn.query(`SELECT * FROM grn_line_items WHERE grnId = 60009`);
console.log('\n=== GRN 60009 line items (PR 510050, over $25K) ===');
for (const l of lines2) {
  console.log(`  ID=${l.id} | desc=${l.description} | orderedQty=${l.orderedQty} | receivedQty=${l.receivedQty} | acceptedQty=${l.acceptedQty} | rejectedQty=${l.rejectedQty} | poLineItemId=${l.poLineItemId}`);
}

// GRN 60002 (PR 660001, $1K-$25K - working)
const [lines3] = await conn.query(`SELECT * FROM grn_line_items WHERE grnId = 60002`);
console.log('\n=== GRN 60002 line items (PR 660001, $1K-$25K) ===');
for (const l of lines3) {
  console.log(`  ID=${l.id} | desc=${l.description} | orderedQty=${l.orderedQty} | receivedQty=${l.receivedQty} | acceptedQty=${l.acceptedQty} | rejectedQty=${l.rejectedQty} | poLineItemId=${l.poLineItemId}`);
}

// Check the PO line items for PO-024 (linked to GRN 60001)
const [poLines] = await conn.query(`SELECT id, purchaseOrderId, description, quantity, unitPrice, totalPrice FROM purchase_order_line_items WHERE purchaseOrderId = 150006`);
console.log('\n=== PO-024 (id=150006) line items ===');
for (const l of poLines) {
  console.log(`  ID=${l.id} | desc=${l.description} | qty=${l.quantity} | unitPrice=${l.unitPrice} | totalPrice=${l.totalPrice}`);
}

await conn.end();
