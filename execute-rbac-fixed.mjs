import mysql from 'mysql2/promise';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  // Read the SQL file
  const sqlContent = fs.readFileSync('./upload/06_RBAC_ROLES_FINAL_CORRECTED.sql', 'utf-8');

  // Split by lines and find INSERT statements
  const lines = sqlContent.split('\n');
  let currentStatement = '';
  const statements = [];

  for (const line of lines) {
    currentStatement += line + '\n';
    
    // Check if we've reached the end of a statement (ON DUPLICATE KEY UPDATE ... ;)
    if (line.trim().endsWith(';') && currentStatement.includes('INSERT INTO')) {
      statements.push(currentStatement.trim());
      currentStatement = '';
    }
  }

  console.log(`Found ${statements.length} complete INSERT statements`);

  let executed = 0;
  for (const stmt of statements) {
    try {
      await connection.execute(stmt);
      executed++;
      console.log(`✓ Statement ${executed}/${statements.length}`);
    } catch (error) {
      console.error(`✗ Error on statement ${executed + 1}:`, error.message.substring(0, 100));
    }
  }

  console.log(`\nCompleted: ${executed}/${statements.length}`);
  await connection.end();
}

main().catch(console.error);
