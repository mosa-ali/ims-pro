import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Get all tables in the database
const [tables] = await conn.query("SHOW TABLES");
const dbTables = new Set(tables.map(t => Object.values(t)[0]));

// Tables defined in schema.ts (extracted manually)
const codeTables = new Set([
  'users', 'globalSettings', 'organizations', 'operating_units', 'user_organizations',
  'user_operating_units', 'invitations', 'audit_logs', 'projects', 'grants', 'grant_documents',
  'indicators', 'activities', 'tasks', 'beneficiaries', 'reporting_schedules',
  'hr_employees', 'hr_salary_grades', 'hr_salary_scale', 'hr_documents', 'hr_leave_requests',
  'hr_leave_balances', 'hr_attendance_records', 'hr_payroll_records', 'hr_annual_plans',
  'hr_recruitment_jobs', 'hr_recruitment_candidates', 'hr_sanctions',
  'finance_fiscal_years', 'finance_currencies', 'finance_exchange_rates', 'finance_bank_accounts',
  'finance_budget_categories', 'finance_cash_transactions', 'finance_advances', 'finance_settlements',
  'finance_approval_thresholds', 'finance_roles', 'finance_permissions', 'finance_role_permissions',
  'finance_user_roles', 'finance_assets', 'finance_asset_categories', 'finance_asset_transfers',
  'finance_asset_disposals', 'finance_asset_maintenance', 'finance_fund_balances',
  'chart_of_accounts', 'budget_items', 'expenses',
  'suppliers', 'purchase_requests', 'purchase_request_line_items', 'purchase_orders',
  'purchase_order_line_items', 'goods_receipt_notes', 'grn_line_items', 'returned_items',
  'returned_item_line_items', 'procurement_payments', 'bid_analyses', 'bid_analysis_bidders',
  'bid_evaluation_criteria', 'quotation_analyses', 'quotation_analysis_suppliers', 'procurement_plan',
  'stock_items', 'stock_requests', 'stock_request_line_items', 'stock_issued', 'stock_issued_line_items',
  'vehicles', 'drivers', 'vehicle_assignments', 'vehicle_maintenance', 'vehicle_compliance',
  'fuel_logs', 'trip_logs',
  'meal_surveys', 'meal_survey_questions', 'meal_survey_submissions', 'meal_indicator_data_entries',
  'meal_documents', 'meal_accountability_records',
  'opportunities', 'proposals', 'pipeline_opportunities',
  'case_records', 'case_activities', 'case_referrals', 'child_safe_spaces', 'css_activities', 'pss_sessions',
  'project_plan_objectives', 'project_plan_results', 'project_plan_activities', 'project_plan_tasks',
  'forecast_plan', 'forecast_audit_log',
  'microsoft_integrations', 'systemImportReports'
]);

console.log("=== SCHEMA AUDIT REPORT ===\n");
console.log("Generated:", new Date().toISOString());
console.log("\n");

// Tables only in DB (not in code)
const dbOnly = [...dbTables].filter(t => !codeTables.has(t) && !t.startsWith('__'));
console.log("=== TABLES IN DATABASE ONLY (not in code) ===");
dbOnly.forEach(t => console.log(`  - ${t}`));

// Tables only in code (not in DB)
const codeOnly = [...codeTables].filter(t => !dbTables.has(t));
console.log("\n=== TABLES IN CODE ONLY (not in database) ===");
codeOnly.forEach(t => console.log(`  - ${t}`));

// Tables in both - need column comparison
const commonTables = [...codeTables].filter(t => dbTables.has(t));
console.log("\n=== TABLES IN BOTH (need column comparison) ===");
console.log(`Total: ${commonTables.length} tables`);

// For critical tables, do detailed column comparison
const criticalTables = [
  'users', 'organizations', 'operating_units', 'projects', 'grants',
  'hr_employees', 'finance_fiscal_years', 'suppliers', 'purchase_requests',
  'vehicles', 'meal_surveys', 'beneficiaries'
];

console.log("\n\n=== DETAILED COLUMN AUDIT FOR CRITICAL TABLES ===\n");

for (const table of criticalTables) {
  if (!dbTables.has(table)) {
    console.log(`\n--- ${table} ---`);
    console.log("  STATUS: TABLE MISSING FROM DATABASE");
    continue;
  }
  
  const [cols] = await conn.query(`DESCRIBE \`${table}\``);
  console.log(`\n--- ${table} ---`);
  console.log(`  DB Columns: ${cols.length}`);
  cols.forEach(c => {
    console.log(`    ${c.Field}: ${c.Type} ${c.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
  });
}

await conn.end();
