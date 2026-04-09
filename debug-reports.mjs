import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Check what's in the donor_reports table
  const [reports] = await connection.execute('SELECT id, organizationId, operatingUnitId, title, status, deletedAt FROM donor_reports');
  console.log('Reports in database:', reports);
  
  // Check the context values being used
  console.log('\nExpected context:');
  console.log('  organizationId: 30001');
  console.log('  operatingUnitId: 30001');
  
  // Check if the query would match
  const [matchingReports] = await connection.execute(
    'SELECT id, title FROM donor_reports WHERE organizationId = ? AND operatingUnitId = ? AND deletedAt IS NULL',
    [30001, 30001]
  );
  console.log('\nMatching reports:', matchingReports);
  
  await connection.end();
}

main().catch(console.error);
