import { readFileSync } from 'fs';
import { createConnection } from 'mysql2/promise';

// Read schema tables
const schemaTables = readFileSync('/home/ubuntu/schema_tables.txt', 'utf-8')
  .split('\n')
  .filter(t => t.trim())
  .sort();

console.log(`IMS Schema has ${schemaTables.length} tables`);

// Connect to database
const dbUrl = process.env.DATABASE_URL;
const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:\/]+):(\d+)\/([^?]+)/);
const [, user, password, host, port, database] = match;

const conn = await createConnection({ 
  host, port, user, password, database,
  ssl: { rejectUnauthorized: true }
});

// Get current tables
const [rows] = await conn.execute('SHOW TABLES');
const currentTables = rows.map(r => Object.values(r)[0]).sort();

console.log(`Current database has ${currentTables.length} tables`);

// Find missing tables (in schema but not in database)
const missingTables = schemaTables.filter(t => !currentTables.includes(t));

console.log(`\nMissing tables (${missingTables.length}):`);
missingTables.forEach(t => console.log(`  - ${t}`));

// Find extra tables (in database but not in schema - these are Phase 2 tables)
const extraTables = currentTables.filter(t => !schemaTables.includes(t));

console.log(`\nPhase 2 custom tables (${extraTables.length}):`);
extraTables.forEach(t => console.log(`  - ${t}`));

// Math check
console.log(`\n=== Math Check ===`);
console.log(`Schema tables: ${schemaTables.length}`);
console.log(`Dropped: 173`);
console.log(`Should have created: ${schemaTables.length - 2} (excluding organizations & operating_units)`);
console.log(`Actually created: ${currentTables.length - extraTables.length}`);
console.log(`Missing: ${missingTables.length}`);
console.log(`Phase 2 preserved: ${extraTables.length}`);
console.log(`Total in DB: ${currentTables.length}`);

await conn.end();
