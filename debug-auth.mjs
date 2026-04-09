import mysql from 'mysql2/promise';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Load env
try {
  dotenv.config({ path: '.env.local' });
} catch (e) {}
try {
  dotenv.config({ path: '.env' });
} catch (e) {}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const connection = await mysql.createConnection(dbUrl);

// Check test user
const [rows] = await connection.execute(
  "SELECT id, name, email, authenticationProvider, passwordHash, isActive, role FROM users WHERE email = 'test@example.com'"
);

console.log('Test user rows:', JSON.stringify(rows, null, 2));

if (rows.length === 0) {
  console.log('No test user found. Creating one...');
  const hash = await bcryptjs.hash('TestPassword123!', 10);
  await connection.execute(
    "INSERT INTO users (name, email, authenticationProvider, passwordHash, isActive, role) VALUES (?, ?, ?, ?, ?, ?)",
    ['Test User', 'test@example.com', 'email', hash, 1, 'user']
  );
  console.log('Test user created with email: test@example.com, password: TestPassword123!');
} else {
  const user = rows[0];
  console.log('\nUser found:');
  console.log('  id:', user.id);
  console.log('  email:', user.email);
  console.log('  authenticationProvider:', user.authenticationProvider);
  console.log('  isActive:', user.isActive);
  console.log('  role:', user.role);
  console.log('  passwordHash exists:', !!user.passwordHash);
  
  if (user.passwordHash) {
    const valid = await bcryptjs.compare('TestPassword123!', user.passwordHash);
    console.log('  Password "TestPassword123!" matches hash:', valid);
  } else {
    console.log('  No password hash! Updating...');
    const hash = await bcryptjs.hash('TestPassword123!', 10);
    await connection.execute(
      "UPDATE users SET passwordHash = ?, authenticationProvider = 'email', isActive = 1 WHERE email = 'test@example.com'",
      [hash]
    );
    console.log('  Password hash updated!');
  }
}

// Also check if there's a platform admin test user
const [adminRows] = await connection.execute(
  "SELECT id, name, email, authenticationProvider, passwordHash, isActive, role FROM users WHERE email = 'admin@ims.local'"
);

if (adminRows.length === 0) {
  console.log('\nCreating platform admin test user...');
  const hash = await bcryptjs.hash('AdminPassword123!', 10);
  await connection.execute(
    "INSERT INTO users (name, email, authenticationProvider, passwordHash, isActive, role) VALUES (?, ?, ?, ?, ?, ?)",
    ['Platform Admin', 'admin@ims.local', 'email', hash, 1, 'platform_admin']
  );
  console.log('Platform admin created with email: admin@ims.local, password: AdminPassword123!');
} else {
  const admin = adminRows[0];
  console.log('\nPlatform admin found:');
  console.log('  id:', admin.id);
  console.log('  email:', admin.email);
  console.log('  role:', admin.role);
  console.log('  authenticationProvider:', admin.authenticationProvider);
  console.log('  isActive:', admin.isActive);
  if (admin.passwordHash) {
    const valid = await bcryptjs.compare('AdminPassword123!', admin.passwordHash);
    console.log('  Password "AdminPassword123!" matches hash:', valid);
  } else {
    const hash = await bcryptjs.hash('AdminPassword123!', 10);
    await connection.execute(
      "UPDATE users SET passwordHash = ?, authenticationProvider = 'email', isActive = 1 WHERE email = 'admin@ims.local'",
      [hash]
    );
    console.log('  Password hash updated!');
  }
}

await connection.end();
console.log('\nDone!');
