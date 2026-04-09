import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';

const url = process.env.DATABASE_URL;
console.log('DB URL exists:', !!url);

if (url) {
  try {
    const db = drizzle(url);
    console.log('Drizzle instance created (no schema)');
    const result = await db.execute(sql`SELECT 1 as test`);
    console.log('Query result:', result);
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
