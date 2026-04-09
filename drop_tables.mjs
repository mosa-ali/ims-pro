import { readFileSync } from 'fs';
import { createConnection } from 'mysql2/promise';

// Read drop statements
const dropStatements = readFileSync('/home/ubuntu/drop_tables.sql', 'utf-8')
  .split('\n')
  .filter(s => s.trim());

console.log(`Executing ${dropStatements.length} DROP statements...`);

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

let dropped = 0;
for (const statement of dropStatements) {
  if (statement.trim()) {
    await conn.execute(statement);
    dropped++;
    if (dropped % 20 === 0) {
      console.log(`Dropped ${dropped}/${dropStatements.length} tables...`);
    }
  }
}

console.log(`\n✅ Successfully dropped ${dropped} tables`);

// Verify remaining tables
const [rows] = await conn.execute('SHOW TABLES');
const remaining = rows.map(r => Object.values(r)[0]);

console.log(`\nRemaining tables (${remaining.length}):`);
remaining.forEach(t => console.log(`  - ${t}`));

await conn.end();
