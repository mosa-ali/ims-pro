import 'dotenv/config';
import mysql from 'mysql2/promise';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error('No DATABASE_URL'); process.exit(1); }

const conn = await mysql.createConnection(dbUrl);

const [contracts] = await conn.query(
  "SELECT id, vendorId, contractNumber, contractValue, currency, status FROM contracts WHERE purchaseRequestId = 450001 AND isDeleted = 0"
);
console.log('=== CONTRACT ===');
console.log(JSON.stringify(contracts, null, 2));

const [bidders] = await conn.query(
  "SELECT bab.id, bab.supplierId, bab.bidderName, bab.totalBidAmount, bab.currency, bab.isSelected FROM bid_analysis_bidders bab INNER JOIN bid_analyses ba ON bab.bidAnalysisId = ba.id WHERE ba.purchaseRequestId = 450001 ORDER BY bab.isSelected DESC"
);
console.log('\n=== BIDDERS ===');
console.log(JSON.stringify(bidders, null, 2));

const [ba] = await conn.query(
  "SELECT id, selectedBidderId, status, cbaFinalizedAt FROM bid_analyses WHERE purchaseRequestId = 450001"
);
console.log('\n=== BID ANALYSIS ===');
console.log(JSON.stringify(ba, null, 2));

if (contracts.length > 0) {
  const [vendor] = await conn.query("SELECT id, name, legalName FROM vendors WHERE id = ?", [contracts[0].vendorId]);
  console.log('\n=== VENDOR ===');
  console.log(JSON.stringify(vendor, null, 2));
}

await conn.end();
