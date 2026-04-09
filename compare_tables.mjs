import { readFileSync, writeFileSync } from 'fs';
import { createConnection } from 'mysql2/promise';

// Read schema tables
const schemaTables = readFileSync('/home/ubuntu/schema_tables.txt', 'utf-8')
  .split('\n')
  .filter(t => t.trim())
  .sort();

console.log(`Schema has ${schemaTables.length} tables`);

// Connect to database with SSL
const dbUrl = process.env.DATABASE_URL;
const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:\/]+):(\d+)\/([^?]+)/);
const [, user, password, host, port, database] = match;

const conn = await createConnection({ 
  host, 
  port, 
  user, 
  password, 
  database,
  ssl: { rejectUnauthorized: true }
});

// Get current tables
const [rows] = await conn.execute('SHOW TABLES');
const currentTables = rows.map(r => Object.values(r)[0]).sort();

console.log(`Database has ${currentTables.length} tables`);

// Find tables to drop (in schema) and tables to keep (not in schema)
const toDrop = currentTables.filter(t => schemaTables.includes(t) && t !== 'organizations' && t !== 'operating_units');
const toKeep = currentTables.filter(t => !schemaTables.includes(t) || t === 'organizations' || t === 'operating_units');

console.log(`\nTables to DROP (${toDrop.length}):`);
toDrop.slice(0, 20).forEach(t => console.log(`  - ${t}`));
if (toDrop.length > 20) console.log(`  ... and ${toDrop.length - 20} more`);

console.log(`\nTables to KEEP (${toKeep.length}):`);
toKeep.forEach(t => console.log(`  - ${t}`));

// Generate DROP statements
const dropStatements = toDrop.map(t => `DROP TABLE IF EXISTS \`${t}\`;`).join('\n');
writeFileSync('/home/ubuntu/drop_tables.sql', dropStatements);

console.log(`\nGenerated /home/ubuntu/drop_tables.sql with ${toDrop.length} DROP statements`);

await conn.end();
