import { createConnection } from 'mysql2/promise';

const databaseUrl = process.env.DATABASE_URL;

try {
  const conn = await createConnection(databaseUrl);
  
  const [rows] = await conn.execute(
    'SELECT id, email, name, passwordHash, isActive, authenticationProvider FROM users WHERE email = ?',
    ['mdrwesh82@gmail.com']
  );
  
  console.log('User count:', rows.length);
  rows.forEach((r, i) => {
    console.log(`User ${i}:`, {
      id: r.id,
      email: r.email,
      name: r.name,
      hasPassword: !!r.passwordHash,
      passwordHash: r.passwordHash ? r.passwordHash.substring(0, 20) + '...' : 'NULL',
      isActive: r.isActive,
      authProvider: r.authenticationProvider,
    });
  });
  
  conn.end();
} catch (error) {
  console.error('Error:', error.message);
}
