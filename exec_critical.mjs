import { readFileSync } from 'fs';
import { createConnection } from 'mysql2/promise';

const sql = readFileSync('/home/ubuntu/ims_website/create_critical_tables.sql', 'utf-8');

const dbUrl = process.env.DATABASE_URL;
const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:\/]+):(\d+)\/([^?]+)/);
const [, user, password, host, port, database] = match;

const conn = await createConnection({ 
  host, port, user, password, database,
  ssl: { rejectUnauthorized: true },
  multipleStatements: true
});

console.log('Creating critical tables...');
await conn.query(sql);
console.log('✅ Critical tables created successfully');

// Verify
const [rows] = await conn.execute('SHOW TABLES');
const tables = rows.map(r => Object.values(r)[0]);

const critical = ['activities', 'budgets', 'budget_items'];
critical.forEach(t => {
  console.log(`  ${tables.includes(t) ? '✅' : '❌'} ${t}`);
});

console.log(`\nTotal tables: ${tables.length}`);

await conn.end();
