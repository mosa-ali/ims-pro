import { createConnection } from 'mysql2/promise';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

try {
  const conn = await createConnection(databaseUrl);
  
  // Update password hash for the test user
  const passwordHash = '$2b$10$I744/NHS57/y3NS.eJN2u.C/8Is5WYsaSsU7d5yQLoE9jRYuWQ3bO';
  
  const [result] = await conn.execute(
    'UPDATE users SET passwordHash = ?, updatedAt = NOW() WHERE email = ?',
    [passwordHash, 'mdrwesh82@gmail.com']
  );
  
  console.log('✅ Password updated successfully');
  console.log(`   Affected rows: ${result.affectedRows}`);
  
  // Verify the update
  const [rows] = await conn.execute(
    'SELECT id, email, name, passwordHash FROM users WHERE email = ?',
    ['mdrwesh82@gmail.com']
  );
  
  console.log('\n✅ Verification:');
  console.log(JSON.stringify(rows[0], null, 2));
  
  conn.end();
} catch (error) {
  console.error('❌ Database error:', error.message);
}
