import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import * as schema from '../drizzle/schema.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env') });

async function pushSchema() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('DATABASE_URL not found in environment');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const connection = await mysql.createConnection(connectionString);
  const db = drizzle(connection, { schema, mode: 'default' });

  try {
    console.log('Running migrations...');
    await migrate(db, { migrationsFolder: join(__dirname, '..', 'drizzle', 'migrations') });
    console.log('✅ Schema pushed successfully!');
  } catch (error) {
    console.error('Error pushing schema:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

pushSchema().catch(console.error);
