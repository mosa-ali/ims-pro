import { readFileSync } from 'fs';
import { createConnection } from 'mysql2/promise';

// Read IMS schema
const schema = readFileSync('/home/ubuntu/upload/IMS_COMPLETE_SCHEMA_EXPORT.sql', 'utf-8');

// Extract CREATE TABLE statements (without DROP TABLE)
const createStatements = [];
const lines = schema.split('\n');
let currentStatement = '';
let inCreateTable = false;

for (const line of lines) {
  if (line.startsWith('CREATE TABLE')) {
    inCreateTable = true;
    currentStatement = line;
  } else if (inCreateTable) {
    currentStatement += '\n' + line;
    if (line.trim().startsWith(') ENGINE=')) {
      createStatements.push(currentStatement);
      currentStatement = '';
      inCreateTable = false;
    }
  }
}

console.log(`Found ${createStatements.length} CREATE TABLE statements`);

// Connect to database
const dbUrl = process.env.DATABASE_URL;
const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:\/]+):(\d+)\/([^?]+)/);
const [, user, password, host, port, database] = match;

const conn = await createConnection({ 
  host, port, user, password, database,
  ssl: { rejectUnauthorized: true }
});

// Get existing tables
const [rows] = await conn.execute('SHOW TABLES');
const existingTables = rows.map(r => Object.values(r)[0]);

console.log(`Database has ${existingTables.length} existing tables`);

// Create missing tables
let created = 0;
for (const statement of createStatements) {
  const match = statement.match(/CREATE TABLE `([^`]+)`/);
  if (match) {
    const tableName = match[1];
    if (!existingTables.includes(tableName)) {
      try {
        // Remove TiDB-specific comments
        const cleanStatement = statement
          .replace(/\/\*T!\[clustered_index\] CLUSTERED \*\//g, '')
          .replace(/\/\*!40101.*?\*\//g, '')
          .replace(/\/\*!50503.*?\*\//g, '');
        
        await conn.execute(cleanStatement);
        created++;
        if (created % 10 === 0) {
          console.log(`Created ${created} tables...`);
        }
      } catch (err) {
        console.error(`Error creating ${tableName}:`, err.message);
      }
    }
  }
}

console.log(`\n✅ Created ${created} new tables`);

// Final count
const [finalRows] = await conn.execute('SHOW TABLES');
console.log(`Total tables now: ${finalRows.length}`);

await conn.end();
