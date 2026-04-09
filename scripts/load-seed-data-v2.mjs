import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const seedFiles = [
  '01_ORGANIZATIONS_OPERATING_UNITS_UPSERT.sql',
  '02_USERS_UPSERT.sql',
  '03_PLATFORM_ADMIN_ROLES_PERMISSIONS.sql',
  '04_USER_ORGANIZATION_ASSIGNMENTS.sql',
  '05_USER_OPERATING_UNIT_ASSIGNMENTS.sql',
  '06_RBAC_ROLES_FINAL_CORRECTED.sql',
];

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  console.log('🌱 Loading seed data...\n');
  
  for (const file of seedFiles) {
    const filePath = path.join('/home/ubuntu/upload', file);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${file}`);
      continue;
    }
    
    try {
      let sql = fs.readFileSync(filePath, 'utf8');
      
      // Remove BOM if present
      if (sql.charCodeAt(0) === 0xFEFF) {
        sql = sql.slice(1);
      }
      
      // Remove comments and empty lines, but keep the actual SQL
      const lines = sql
        .split('\n')
        .map(line => {
          // Remove SQL comments
          const commentIdx = line.indexOf('--');
          return commentIdx >= 0 ? line.substring(0, commentIdx) : line;
        })
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      // Join lines and split by semicolon
      const fullSql = lines.join('\n');
      const statements = fullSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      console.log(`📄 Processing ${file} (${statements.length} statements)...`);
      
      let success = 0;
      let errors = 0;
      
      for (const stmt of statements) {
        try {
          await conn.execute(stmt);
          success++;
        } catch (e) {
          const msg = e.message || '';
          // Ignore duplicate key and already exists errors
          if (msg.includes('Duplicate entry') || msg.includes('already exists')) {
            success++;
          } else {
            console.error(`   ❌ Error: ${msg.substring(0, 150)}`);
            errors++;
          }
        }
      }
      
      console.log(`   ✅ Success: ${success}, Errors: ${errors}\n`);
    } catch (e) {
      console.error(`❌ Failed to process ${file}:`, e.message);
    }
  }
  
  await conn.end();
  console.log('✅ Seed data loading complete!');
}

run().catch(e => {
  console.error('Fatal error:', e.message);
  process.exit(1);
});
