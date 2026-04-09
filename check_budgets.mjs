import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function checkBudgets() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  console.log('\n=== BUDGET MODULE DATABASE CHECK ===\n');
  
  // Check budgets count
  const [budgets] = await connection.execute('SELECT COUNT(*) as count FROM budgets WHERE deletedAt IS NULL');
  console.log(`Budgets: ${budgets[0].count}`);
  
  // Check budget lines count
  const [lines] = await connection.execute('SELECT COUNT(*) as count FROM budget_lines WHERE deletedAt IS NULL');
  console.log(`Budget Lines: ${lines[0].count}`);
  
  // Check monthly allocations count
  const [allocations] = await connection.execute('SELECT COUNT(*) as count FROM budget_monthly_allocations');
  console.log(`Monthly Allocations: ${allocations[0].count}`);
  
  // Check budget status distribution
  const [statuses] = await connection.execute('SELECT status, COUNT(*) as count FROM budgets WHERE deletedAt IS NULL GROUP BY status');
  console.log('\nBudget Status Distribution:');
  statuses.forEach(s => console.log(`  ${s.status}: ${s.count}`));
  
  // Check projects with budgets
  const [projectBudgets] = await connection.execute(`
    SELECT p.id, p.title, COUNT(b.id) as budget_count, SUM(CAST(b.totalApprovedAmount AS DECIMAL(15,2))) as total_budget
    FROM projects p
    LEFT JOIN budgets b ON p.id = b.projectId AND b.deletedAt IS NULL
    WHERE p.deletedAt IS NULL
    GROUP BY p.id, p.title
    LIMIT 10
  `);
  console.log('\nProjects with Budgets:');
  projectBudgets.forEach(p => console.log(`  ${p.title}: ${p.budget_count} budgets, Total: $${p.total_budget || 0}`));
  
  // Check budget lines per budget
  const [linesPerBudget] = await connection.execute(`
    SELECT b.budgetCode, COUNT(bl.id) as line_count
    FROM budgets b
    LEFT JOIN budget_lines bl ON b.id = bl.budgetId AND bl.deletedAt IS NULL
    WHERE b.deletedAt IS NULL
    GROUP BY b.id, b.budgetCode
    LIMIT 10
  `);
  console.log('\nBudget Lines per Budget:');
  linesPerBudget.forEach(b => console.log(`  ${b.budgetCode}: ${b.line_count} lines`));
  
  await connection.end();
}

checkBudgets().catch(console.error);
