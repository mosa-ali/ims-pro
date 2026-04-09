import { createConnection } from 'mysql2/promise';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

try {
  const conn = await createConnection(databaseUrl);
  
  const [rows] = await conn.execute(
    'SELECT id, email, name, passwordHash, isActive, authenticationProvider FROM users WHERE email = ?',
    ['mdrwesh82@gmail.com']
  );
  
  if (rows.length === 0) {
    console.log('❌ User not found in database');
  } else {
    console.log('✅ User found:');
    console.log(JSON.stringify(rows[0], null, 2));
  }
  
  conn.end();
} catch (error) {
  console.error('Database error:', error.message);
}
