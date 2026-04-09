import { createConnection } from 'mysql2/promise';

const databaseUrl = process.env.DATABASE_URL;

try {
  const conn = await createConnection(databaseUrl);
  
  // Set password hash for the specific user ID
  const passwordHash = '$2b$10$I744/NHS57/y3NS.eJN2u.C/8Is5WYsaSsU7d5yQLoE9jRYuWQ3bO';
  
  const [result] = await conn.execute(
    'UPDATE users SET passwordHash = ? WHERE id = ?',
    [passwordHash, 1444657]
  );
  
  console.log('✅ Updated rows:', result.affectedRows);
  
  // Verify
  const [rows] = await conn.execute(
    'SELECT id, email, passwordHash FROM users WHERE id = ?',
    [1444657]
  );
  
  console.log('Verification:', rows[0]);
  conn.end();
} catch (error) {
  console.error('Error:', error.message);
}
