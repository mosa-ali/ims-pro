import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Disable FK checks to allow tables to be created in any order
  await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
  
  // Read the generated migration SQL
  const sqlFile = path.join(__dirname, '../drizzle/0000_strange_the_executioner.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');
  
  // Split by drizzle's statement-breakpoint markers
  const statements = sql
    .split('--> statement-breakpoint')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  let success = 0;
  let errors = 0;
  
  for (const stmt of statements) {
    try {
      await conn.execute(stmt);
      success++;
    } catch(e) {
      const msg = e.message || '';
      if (msg.includes('already exists') || msg.includes('Duplicate')) {
        success++;
      } else {
        console.error('Error:', msg.substring(0, 150));
        errors++;
      }
    }
  }
  
  await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
  
  // Mark migration as applied in drizzle journal
  try {
    await conn.execute(`CREATE TABLE IF NOT EXISTS \`__drizzle_migrations\` (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hash TEXT NOT NULL,
      created_at BIGINT
    )`);
    
    await conn.execute(
      "INSERT IGNORE INTO `__drizzle_migrations` (hash, created_at) VALUES (?, ?)",
      ['0000_strange_the_executioner', Date.now()]
    );
  } catch(e) {
    console.log('Note:', e.message.substring(0, 100));
  }
  
  await conn.end();
  console.log(`✅ Migration complete! Success: ${success}, Errors: ${errors}`);
}

run().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
