import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbConfig = {
  host: 'gateway03.us-east-1.prod.aws.tidbcloud.com',
  port: 4000,
  user: '3DLEw35gkkimUcv.root',
  password: 'H3QADzT1G3dsb0sQY46Q',
  database: 'ims_db',
  ssl: 'Amazon RDS',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

async function setupDatabase() {
  let connection;
  try {
    console.log('📡 Connecting to TiDB Cloud...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('✅ Connected successfully!');
    
    // Read and execute Drizzle migrations
    const drizzleDir = path.join(__dirname, 'drizzle');
    const sqlFiles = fs.readdirSync(drizzleDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    console.log(`\n📋 Found ${sqlFiles.length} migration files`);
    
    for (const file of sqlFiles) {
      const filePath = path.join(drizzleDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      if (sql.trim()) {
        try {
          console.log(`  ▶ Executing ${file}...`);
          await connection.query(sql);
          console.log(`  ✅ ${file} completed`);
        } catch (error) {
          console.warn(`  ⚠️  ${file}: ${error.message.substring(0, 100)}`);
        }
      }
    }
    
    console.log('\n✅ Database schema setup complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

setupDatabase();
