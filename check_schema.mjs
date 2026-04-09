import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Get actual columns from database
const [dbColumns] = await conn.execute(`
  SELECT COLUMN_NAME 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'purchase_requests' 
  AND TABLE_SCHEMA = DATABASE()
  ORDER BY ORDINAL_POSITION
`);

console.log('Columns in database:');
dbColumns.forEach((col, i) => {
  console.log(`${i + 1}. ${col.COLUMN_NAME}`);
});
console.log(`\nTotal: ${dbColumns.length} columns\n`);

await conn.end();
