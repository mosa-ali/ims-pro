import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

console.log('=== VERIFYING GRANTS TABLE ALIGNMENT ===');

// Get current columns from database
const [cols] = await conn.query('DESCRIBE grants');
const dbColumns = cols.map(c => c.Field);

// Expected columns from code schema
const expectedColumns = [
  'id', 'organizationId', 'operatingUnitId', 'donorId', 'projectId',
  'grantCode', 'title', 'titleAr', 'grantNumber', 'grantName', 'grantNameAr',
  'donorName', 'donorReference', 'grantAmount', 'amount', 'totalBudget', 'currency',
  'status', 'reportingStatus', 'submissionDate', 'approvalDate', 'startDate', 'endDate',
  'description', 'descriptionAr', 'objectives', 'objectivesAr',
  'proposalDocumentUrl', 'approvalDocumentUrl', 'sector', 'responsible', 'reportingFrequency',
  'coFunding', 'coFunderName',
  'createdBy', 'createdAt', 'updatedAt', 'updatedBy',
  'isDeleted', 'deletedAt', 'deletedBy'
];

console.log('\n=== COLUMN COMPARISON ===');

// Check for columns in code but not in DB
const missingInDb = expectedColumns.filter(c => dbColumns.indexOf(c) === -1);
if (missingInDb.length > 0) {
  console.log('\n❌ Columns in CODE but NOT in DATABASE:');
  missingInDb.forEach(c => console.log('  - ' + c));
} else {
  console.log('\n✅ All code columns exist in database');
}

// Check for columns in DB but not in code
const missingInCode = dbColumns.filter(c => expectedColumns.indexOf(c) === -1);
if (missingInCode.length > 0) {
  console.log('\n⚠️ Columns in DATABASE but NOT in CODE:');
  missingInCode.forEach(c => console.log('  - ' + c));
} else {
  console.log('✅ All database columns exist in code');
}

console.log('\n=== GRANTS TABLE STRUCTURE ===');
cols.forEach(c => console.log(`  ${c.Field}: ${c.Type} ${c.Null === 'YES' ? 'NULL' : 'NOT NULL'}`));

console.log('\n=== VERIFICATION COMPLETE ===');
console.log(`Database columns: ${dbColumns.length}`);
console.log(`Expected columns: ${expectedColumns.length}`);
console.log(`Alignment: ${missingInDb.length === 0 && missingInCode.length === 0 ? '✅ ALIGNED' : '⚠️ NEEDS ATTENTION'}`);

await conn.end();
