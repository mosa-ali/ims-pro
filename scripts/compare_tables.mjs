import mysql from 'mysql2/promise';
import { execSync } from 'child_process';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [tables] = await conn.query('SHOW TABLES');
const dbTables = new Set(tables.map(t => Object.values(t)[0]));

// Get schema tables
const schemaOutput = execSync('grep -E "mysqlTable\\\\(" drizzle/schema.ts | sed \'s/.*mysqlTable("\\([^"]*\\)".*/\\1/\' | sort').toString();
const schemaTables = new Set(schemaOutput.trim().split('\n').filter(t => t && !t.includes('export const')));

console.log('=== TABLES IN DB BUT NOT IN SCHEMA ===');
const dbOnly = [...dbTables].filter(t => {
  return !schemaTables.has(t) && !t.startsWith('__');
}).sort();
dbOnly.forEach(t => console.log('  - ' + t));
console.log('Total: ' + dbOnly.length);

console.log('\n=== TABLES IN SCHEMA BUT NOT IN DB ===');
const schemaOnly = [...schemaTables].filter(t => {
  return !dbTables.has(t);
}).sort();
schemaOnly.forEach(t => console.log('  - ' + t));
console.log('Total: ' + schemaOnly.length);

await conn.end();
