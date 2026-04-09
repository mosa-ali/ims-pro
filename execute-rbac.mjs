import mysql from 'mysql2/promise';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  // Read the SQL file
  const sqlContent = fs.readFileSync('./upload/06_RBAC_ROLES_FINAL_CORRECTED.sql', 'utf-8');

  // Split by INSERT statements
  const statements = sqlContent
    .split(/;(?=\s*INSERT)/i)
    .map(s => s.trim())
    .filter(s => s.length > 0 && s.includes('INSERT'));

  console.log(`Found ${statements.length} INSERT statements`);

  let executed = 0;
  for (const stmt of statements) {
    try {
      let query = stmt.trim();
      if (!query.endsWith(';')) {
        query = query + ';';
      }
      await connection.execute(query);
      executed++;
      console.log(`✓ Statement ${executed}/${statements.length}`);
    } catch (error) {
      console.error(`✗ Error:`, error.message);
    }
  }

  console.log(`\nCompleted: ${executed}/${statements.length}`);
  await connection.end();
}

main().catch(console.error);
