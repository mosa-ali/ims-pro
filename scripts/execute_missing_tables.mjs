import mysql from 'mysql2/promise';
import fs from 'fs';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const sql = fs.readFileSync('scripts/create_missing_tables.sql', 'utf8');

// Remove comments and split by CREATE TABLE
const cleanSql = sql.replace(/--[^\n]*/g, '');
const createStatements = cleanSql.split(/(?=CREATE TABLE)/i).filter(s => s.trim().startsWith('CREATE TABLE'));

let created = 0;

for (const stmt of createStatements) {
  const trimmed = stmt.trim();
  if (!trimmed) continue;
  try {
    await conn.query(trimmed);
    // Extract table name
    const match = trimmed.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
    if (match) {
      console.log('✅ Created/verified: ' + match[1]);
      created++;
    }
  } catch (err) {
    const match = trimmed.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
    console.log('❌ Error on ' + (match ? match[1] : 'unknown') + ': ' + err.message.substring(0, 80));
  }
}

console.log('\n=== SUMMARY ===');
console.log('Tables created/verified: ' + created);

await conn.end();
