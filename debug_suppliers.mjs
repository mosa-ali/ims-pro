import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'ims_website'
});

const [rows] = await connection.execute(
  `SELECT id, supplierName, quoteReference, totalAmount 
   FROM quotation_analysis_suppliers 
   WHERE quotationAnalysisId = (SELECT id FROM quotation_analyses WHERE qaNumber = 'QA-HQ-2026-003')`
);

console.log('Supplier Data:');
rows.forEach(row => {
  console.log(`ID: ${row.id}`);
  console.log(`  supplierName: "${row.supplierName}" (length: ${row.supplierName?.length})`);
  console.log(`  quoteReference: "${row.quoteReference}" (length: ${row.quoteReference?.length})`);
  console.log(`  totalAmount: ${row.totalAmount}`);
  
  // Check for hidden characters
  if (row.supplierName) {
    const codes = Array.from(row.supplierName).map(c => c.charCodeAt(0)).join(',');
    console.log(`  charCodes: ${codes}`);
  }
  console.log('');
});

await connection.end();
