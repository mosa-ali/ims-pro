import { readFileSync } from 'fs';
import { createConnection } from 'mysql2/promise';

console.log('Reading IMS schema file...');
const schema = readFileSync('/home/ubuntu/upload/IMS_COMPLETE_SCHEMA_EXPORT.sql', 'utf-8');

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
  ssl: { rejectUnauthorized: true },
  multipleStatements: true
});

console.log('Importing schema...');
await conn.query(schema);

console.log('✅ Schema imported successfully');

// Verify table count
const [rows] = await conn.execute('SHOW TABLES');
console.log(`\nTotal tables in database: ${rows.length}`);

await conn.end();
