import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env') });

async function resetDatabase() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('DATABASE_URL not found in environment');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const connection = await mysql.createConnection(connectionString);

  try {
    // Disable foreign key checks
    console.log('Disabling foreign key checks...');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

    // Get all tables
    console.log('Getting list of all tables...');
    const [tables] = await connection.execute(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()`
    );

    console.log(`Found ${tables.length} tables to drop`);

    // Drop each table
    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      console.log(`  Dropping table: ${tableName}`);
      await connection.execute(`DROP TABLE IF EXISTS \`${tableName}\``);
    }

    // Re-enable foreign key checks
    console.log('Re-enabling foreign key checks...');
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    // Verify all tables are dropped
    const [remaining] = await connection.execute(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()`
    );

    console.log(`\\n✅ Database reset complete!`);
    console.log(`   Tables remaining: ${remaining.length}`);

    if (remaining.length > 0) {
      console.log('   Remaining tables:', remaining.map(t => t.TABLE_NAME).join(', '));
    }

  } catch (error) {
    console.error('Error resetting database:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

resetDatabase().catch(console.error);
