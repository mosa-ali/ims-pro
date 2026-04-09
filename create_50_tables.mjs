import { readFileSync } from 'fs';
import { createConnection } from 'mysql2/promise';

const sqlFile = readFileSync('/home/ubuntu/missing_tables.sql', 'utf-8');

// Split into individual CREATE TABLE statements
const statements = [];
const lines = sqlFile.split('\n');
let currentStatement = '';

for (const line of lines) {
  if (line.startsWith('-- ') && currentStatement.trim()) {
    statements.push(currentStatement.trim());
    currentStatement = '';
  }
  if (!line.startsWith('--') && line.trim()) {
    currentStatement += line + '\n';
  }
}
if (currentStatement.trim()) {
  statements.push(currentStatement.trim());
}

console.log(`Found ${statements.length} CREATE TABLE statements\n`);

// Connect to database
const dbUrl = process.env.DATABASE_URL;
const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:\/]+):(\d+)\/([^?]+)/);
const [, user, password, host, port, database] = match;

const conn = await createConnection({ 
  host, port, user, password, database,
  ssl: { rejectUnauthorized: true }
});

// Disable foreign key checks
await conn.execute('SET FOREIGN_KEY_CHECKS = 0;');
console.log('✅ Foreign key checks disabled\n');

let created = 0;
let failed = 0;
const errors = [];

for (const statement of statements) {
  const match = statement.match(/CREATE TABLE `([^`]+)`/);
  const tableName = match ? match[1] : 'unknown';
  
  try {
    await conn.execute(statement);
    created++;
    console.log(`✅ ${created}. ${tableName}`);
  } catch (err) {
    failed++;
    console.log(`❌ ${tableName}: ${err.message.substring(0, 80)}`);
    errors.push({ table: tableName, error: err.message });
  }
}

// Re-enable foreign key checks
await conn.execute('SET FOREIGN_KEY_CHECKS = 1;');
console.log('\n✅ Foreign key checks re-enabled');

// Final count
const [rows] = await conn.execute('SHOW TABLES');
console.log(`\n=== Summary ===`);
console.log(`Created: ${created}`);
console.log(`Failed: ${failed}`);
console.log(`Total tables in database: ${rows.length}`);

if (errors.length > 0) {
  console.log(`\nErrors:`);
  errors.forEach(e => console.log(`  - ${e.table}: ${e.error.substring(0, 100)}`));
}

await conn.end();
