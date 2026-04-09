import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
});

console.log('Operating Units for org 30001:');
const [ous] = await connection.execute('SELECT id, name, code FROM operating_units WHERE organizationId = 30001');
console.table(ous);

console.log('\nDonors:');
const [donors] = await connection.execute('SELECT id, code, name, organizationId, operatingUnitId FROM donors');
console.table(donors);

await connection.end();
