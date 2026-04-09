import { createConnection } from 'mysql2/promise';

const conn = await createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'clientsphere',
});

const [rows] = await conn.execute(
  'SELECT id, email, name, passwordHash, isActive, authenticationProvider FROM users WHERE email = ?',
  ['mdrwesh82@gmail.com']
);

console.log('User query result:', JSON.stringify(rows, null, 2));
conn.end();
