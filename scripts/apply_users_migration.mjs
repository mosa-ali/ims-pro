import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

console.log('=== APPLYING USERS MIGRATION ===');

// Check if columns exist before adding
const [cols] = await conn.query('DESCRIBE users');
const colNames = cols.map(c => c.Field);

console.log('Current columns:', colNames.join(', '));

// Add organizationId if not exists
if (colNames.indexOf('organizationId') === -1) {
  console.log('Adding organizationId column...');
  await conn.query('ALTER TABLE users ADD COLUMN organizationId INT(11) NULL');
  console.log('  ✅ organizationId added');
} else {
  console.log('  ✅ organizationId already exists');
}

// Add currentOrganizationId if not exists
if (colNames.indexOf('currentOrganizationId') === -1) {
  console.log('Adding currentOrganizationId column...');
  await conn.query('ALTER TABLE users ADD COLUMN currentOrganizationId INT(11) NULL');
  console.log('  ✅ currentOrganizationId added');
} else {
  console.log('  ✅ currentOrganizationId already exists');
}

// Add languagePreference if not exists
if (colNames.indexOf('languagePreference') === -1) {
  console.log('Adding languagePreference column...');
  await conn.query('ALTER TABLE users ADD COLUMN languagePreference VARCHAR(10) NULL');
  console.log('  ✅ languagePreference added');
} else {
  console.log('  ✅ languagePreference already exists');
}

console.log('\n=== MIGRATION COMPLETE ===');

// Verify final structure
const [finalCols] = await conn.query('DESCRIBE users');
console.log('\nFinal users table structure:');
finalCols.forEach(c => console.log(`  ${c.Field}: ${c.Type} ${c.Null === 'YES' ? 'NULL' : 'NOT NULL'}`));

await conn.end();
