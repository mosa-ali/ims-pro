import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbConfig = {
  host: 'gateway03.us-east-1.prod.aws.tidbcloud.com',
  port: 4000,
  user: '3DLEw35gkkimUcv.root',
  password: 'H3QADzT1G3dsb0sQY46Q',
  database: 'ims_db',
  ssl: {
    rejectUnauthorized: false,
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

async function importCSVData() {
  let connection;
  try {
    console.log('📡 Connecting to TiDB Cloud...');
    try {
      connection = await mysql.createConnection(dbConfig);
    } catch (err) {
      console.log('⚠️  Retrying with SSL disabled...');
      dbConfig.ssl = false;
      connection = await mysql.createConnection(dbConfig);
    }
    console.log('✅ Connected successfully!');
    
    const schemaDir = path.join(__dirname, 'Schema tables');
    const csvFiles = fs.readdirSync(schemaDir)
      .filter(f => f.endsWith('.csv'))
      .sort();
    
    console.log(`\n📋 Found ${csvFiles.length} CSV files to import\n`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const file of csvFiles) {
      const filePath = path.join(schemaDir, file);
      const tableName = file.replace(/_\d{8}_\d{6}\.csv$/, '');
      
      try {
        const rows = [];
        await new Promise((resolve, reject) => {
          fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => rows.push(row))
            .on('end', resolve)
            .on('error', reject);
        });
        
        if (rows.length === 0) {
          console.log(`⏭️  ${tableName}: SKIPPED (empty)`);
          skipCount++;
          continue;
        }
        
        // Get column names from first row
        const columns = Object.keys(rows[0]);
        const placeholders = columns.map(() => '?').join(',');
        const columnNames = columns.join(',');
        
        const query = `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`;
        
        let insertedCount = 0;
        for (const row of rows) {
          const values = columns.map(col => {
            const val = row[col];
            // Handle NULL values
            if (val === '' || val === 'NULL' || val === null) return null;
            // Handle boolean values
            if (val === 'true') return 1;
            if (val === 'false') return 0;
            return val;
          });
          
          try {
            await connection.query(query, values);
            insertedCount++;
          } catch (err) {
            // Silently skip duplicate key errors
            if (!err.message.includes('Duplicate entry')) {
              throw err;
            }
          }
        }
        
        console.log(`✅ ${tableName}: ${insertedCount}/${rows.length} rows inserted`);
        successCount++;
        
      } catch (error) {
        if (error.message.includes('no such table') || error.message.includes("doesn't exist")) {
          console.log(`⏭️  ${tableName}: SKIPPED (table doesn't exist)`);
          skipCount++;
        } else {
          console.error(`❌ ${tableName}: ${error.message.substring(0, 80)}`);
          errorCount++;
        }
      }
    }
    
    console.log(`\n📊 Import Summary:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ⏭️  Skipped: ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`\n✅ Data import complete!`);
    
  } catch (error) {
    console.error('❌ Fatal Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

importCSVData();
