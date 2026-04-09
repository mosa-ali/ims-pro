import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';

const url = process.env.DATABASE_URL;
console.log('DB URL exists:', !!url);
console.log('DB URL:', url ? url.substring(0, 30) + '...' : 'N/A');

if (url) {
  try {
    console.log('Trying with mode: default and schema...');
    // Import schema dynamically
    const schema = await import('./drizzle/schema.ts');
    console.log('Schema loaded, keys:', Object.keys(schema).length);
    const db = drizzle(url, { schema, mode: 'default' });
    console.log('Drizzle instance created with schema');
    const result = await db.execute(sql`SELECT 1 as test`);
    console.log('Query result:', JSON.stringify(result[0]));
    console.log('SUCCESS!');
    process.exit(0);
  } catch(e) {
    console.error('Error with schema:', e.message);
    console.error('Stack:', e.stack);
    
    try {
      console.log('\nTrying without schema...');
      const db = drizzle(url);
      const result = await db.execute(sql`SELECT 1 as test`);
      console.log('Query result without schema:', JSON.stringify(result[0]));
      console.log('SUCCESS without schema!');
      process.exit(0);
    } catch(e2) {
      console.error('Error without schema:', e2.message);
      process.exit(1);
    }
  }
}
