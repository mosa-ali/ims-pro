import { createConnection } from 'mysql2/promise';

const dbUrl = process.env.DATABASE_URL;
const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:\/]+):(\d+)\/([^?]+)/);
const [, user, password, host, port, database] = match;

const conn = await createConnection({ 
  host, port, user, password, database,
  ssl: { rejectUnauthorized: true }
});

// Check budget_items schema
const [columns] = await conn.execute(`
  SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'budget_items'
  ORDER BY ORDINAL_POSITION
`, [database]);

console.log('budget_items table schema:');
console.log('Column Name          | Type                | Nullable | Default');
console.log('---------------------|---------------------|----------|--------');
columns.forEach(col => {
  const name = col.COLUMN_NAME.padEnd(20);
  const type = col.COLUMN_TYPE.padEnd(19);
  const nullable = col.IS_NULLABLE.padEnd(8);
  const def = (col.COLUMN_DEFAULT || 'NULL').substring(0, 20);
  console.log(`${name} | ${type} | ${nullable} | ${def}`);
});

// Test insert
console.log('\nTesting budget item creation...');
try {
  await conn.execute(`
    INSERT INTO budget_items (
      projectId, organizationId, budgetCode, budgetItem,
      quantity, unitCost, totalBudgetLine, startDate, endDate
    ) VALUES (
      1, 1, 'BL1', 'Test Budget Item',
      1, 100, 100, '2026-01-01', '2026-12-31'
    )
  `);
  console.log('✅ Budget item created successfully!');
  console.log('✅ budgetCode column accepts string values (varchar)');
  
  // Clean up
  await conn.execute('DELETE FROM budget_items WHERE budgetCode = ?', ['BL1']);
} catch (err) {
  console.log('❌ Error:', err.message);
}

await conn.end();
