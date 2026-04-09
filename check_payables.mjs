import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();
const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Check all payables with full columns
const [payables] = await conn.query(`SELECT * FROM procurement_payables ORDER BY id`);
console.log('=== All procurement_payables ===');
for (const p of payables) {
  console.log(`  ID=${p.id} | ${p.payableNumber} | grnId=${p.grnId} | supplierId=${p.supplierId}`);
  console.log(`    amount=${p.amount} | subtotal=${p.subtotal} | taxAmount=${p.taxAmount} | totalAmount=${p.totalAmount}`);
  console.log(`    status=${p.status} | currency=${p.currency}`);
}

// Check PO line items for PO-024 (PR 660003, under $1K)
const [po24Lines] = await conn.query(`SELECT * FROM purchase_order_line_items WHERE purchaseOrderId = 150008`);
console.log('\n=== PO-024 line items ===');
for (const l of po24Lines) {
  console.log(`  ID=${l.id} | desc=${l.description} | qty=${l.quantity} | unitPrice=${l.unitPrice} | totalPrice=${l.totalPrice}`);
}

// Check PO-024 header
const [po24] = await conn.query(`SELECT id, poNumber, subtotal, taxAmount, totalAmount FROM purchase_orders WHERE id = 150008`);
console.log('\n=== PO-024 header ===');
console.log(po24[0]);

// Check PO-027 header for comparison
const [po27] = await conn.query(`SELECT id, poNumber, subtotal, taxAmount, totalAmount FROM purchase_orders WHERE id = 150009`);
console.log('\n=== PO-027 header ===');
console.log(po27[0]);

await conn.end();
