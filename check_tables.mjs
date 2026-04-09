import { createConnection } from 'mysql2/promise';

const dbUrl = process.env.DATABASE_URL;
const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:\/]+):(\d+)\/([^?]+)/);
const [, user, password, host, port, database] = match;

const conn = await createConnection({ 
  host, port, user, password, database,
  ssl: { rejectUnauthorized: true }
});

const [rows] = await conn.execute('SHOW TABLES');
const tables = rows.map(r => Object.values(r)[0]).sort();

const critical = ['organizations', 'operating_units', 'users', 'projects', 'activities', 'budget_items', 'budgets'];

console.log('Critical tables status:');
critical.forEach(t => {
  const exists = tables.includes(t);
  console.log(`  ${exists ? '✅' : '❌'} ${t}`);
});

console.log(`\nTotal tables: ${tables.length}`);

await conn.end();
