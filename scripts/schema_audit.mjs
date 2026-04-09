import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Get all tables in the database
const [tables] = await conn.query("SHOW TABLES");
const tableNames = tables.map(t => Object.values(t)[0]);

console.log("=== DATABASE TABLES ===");
console.log(tableNames.join(", "));
console.log("\n");

// For each table, get its structure
const audit = {};
for (const table of tableNames) {
  const [cols] = await conn.query(`DESCRIBE \`${table}\``);
  audit[table] = cols.map(c => ({
    field: c.Field,
    type: c.Type,
    null: c.Null,
    default: c.Default
  }));
}

// Output detailed structure
for (const [table, cols] of Object.entries(audit)) {
  console.log(`\n=== TABLE: ${table} ===`);
  console.log("Columns:");
  cols.forEach(c => {
    console.log(`  - ${c.field}: ${c.type} ${c.null === 'YES' ? 'NULL' : 'NOT NULL'} ${c.default ? 'DEFAULT ' + c.default : ''}`);
  });
}

await conn.end();
