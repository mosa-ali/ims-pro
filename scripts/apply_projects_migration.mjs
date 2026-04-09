import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

console.log('=== APPLYING PROJECTS MIGRATION ===');

// Check if columns exist before adding
const [cols] = await conn.query('DESCRIBE projects');
const colNames = cols.map(c => c.Field);

console.log('Current columns:', colNames.join(', '));

// List of columns that should exist in the projects table
const requiredColumns = [
  { name: 'grantId', sql: 'ALTER TABLE projects ADD COLUMN grantId INT(11) NULL' },
  { name: 'projectCode', sql: 'ALTER TABLE projects ADD COLUMN projectCode VARCHAR(100) NOT NULL DEFAULT ""' },
  { name: 'titleEn', sql: 'ALTER TABLE projects ADD COLUMN titleEn VARCHAR(500) NOT NULL DEFAULT ""' },
  { name: 'objectives', sql: 'ALTER TABLE projects ADD COLUMN objectives TEXT NULL' },
  { name: 'objectivesAr', sql: 'ALTER TABLE projects ADD COLUMN objectivesAr TEXT NULL' },
  { name: 'beneficiaryCount', sql: 'ALTER TABLE projects ADD COLUMN beneficiaryCount INT(11) NULL' },
  { name: 'projectManager', sql: 'ALTER TABLE projects ADD COLUMN projectManager INT(11) NULL' },
  { name: 'operatingUnitId', sql: 'ALTER TABLE projects ADD COLUMN operatingUnitId INT(11) NULL' },
  { name: 'code', sql: 'ALTER TABLE projects ADD COLUMN code VARCHAR(100) NULL' },
  { name: 'title', sql: 'ALTER TABLE projects ADD COLUMN title TEXT NULL' },
  { name: 'totalBudget', sql: 'ALTER TABLE projects ADD COLUMN totalBudget DECIMAL(15,2) NULL' },
  { name: 'spent', sql: 'ALTER TABLE projects ADD COLUMN spent DECIMAL(15,2) NULL' },
  { name: 'currency', sql: 'ALTER TABLE projects ADD COLUMN currency ENUM("USD","EUR","GBP","CHF") NULL' },
  { name: 'physicalProgressPercentage', sql: 'ALTER TABLE projects ADD COLUMN physicalProgressPercentage DECIMAL(5,2) NULL' },
  { name: 'sectors', sql: 'ALTER TABLE projects ADD COLUMN sectors JSON NULL' },
  { name: 'donor', sql: 'ALTER TABLE projects ADD COLUMN donor VARCHAR(255) NULL' },
  { name: 'implementingPartner', sql: 'ALTER TABLE projects ADD COLUMN implementingPartner VARCHAR(255) NULL' },
  { name: 'managerId', sql: 'ALTER TABLE projects ADD COLUMN managerId INT(11) NULL' },
  { name: 'updatedBy', sql: 'ALTER TABLE projects ADD COLUMN updatedBy INT(11) NULL' },
];

for (const col of requiredColumns) {
  if (colNames.indexOf(col.name) === -1) {
    console.log(`Adding ${col.name} column...`);
    try {
      await conn.query(col.sql);
      console.log(`  ✅ ${col.name} added`);
    } catch (err) {
      console.log(`  ⚠️ ${col.name} error: ${err.message}`);
    }
  } else {
    console.log(`  ✅ ${col.name} already exists`);
  }
}

console.log('\n=== MIGRATION COMPLETE ===');

// Verify final structure
const [finalCols] = await conn.query('DESCRIBE projects');
console.log('\nFinal projects table structure:');
finalCols.forEach(c => console.log(`  ${c.Field}: ${c.Type} ${c.Null === 'YES' ? 'NULL' : 'NOT NULL'}`));

await conn.end();
