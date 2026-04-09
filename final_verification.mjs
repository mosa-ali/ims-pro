import { createConnection } from 'mysql2/promise';

const dbUrl = process.env.DATABASE_URL;
const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:\/]+):(\d+)\/([^?]+)/);
const [, user, password, host, port, database] = match;

const conn = await createConnection({ 
  host, port, user, password, database,
  ssl: { rejectUnauthorized: true }
});

// Get all tables
const [rows] = await conn.execute('SHOW TABLES');
const allTables = rows.map(r => Object.values(r)[0]).sort();

console.log(`=== FINAL DATABASE STATUS ===\n`);
console.log(`Total tables: ${allTables.length}\n`);

// Check critical tables
const criticalTables = [
  'organizations', 'operating_units', 'users', 'projects', 'activities',
  'budgets', 'budget_items', 'budget_lines', 'grants', 'donors',
  'rbac_roles', 'rbac_user_permissions', 'audit_logs', 'beneficiaries',
  'expenses', 'finance_assets', 'chart_of_accounts'
];

console.log(`Critical Tables Status:`);
criticalTables.forEach(t => {
  const exists = allTables.includes(t);
  console.log(`  ${exists ? '✅' : '❌'} ${t}`);
});

// Check the 50 previously missing tables
const previouslyMissing = [
  'audit_log_export_history', 'audit_log_export_schedules', 'audit_logs',
  'beneficiaries', 'bid_analyses', 'bid_analysis_bidders', 'bid_evaluation_criteria',
  'bid_evaluation_scores', 'bid_opening_minutes', 'budget_lines', 'budget_monthly_allocations',
  'case_activities', 'case_records', 'case_referrals', 'chart_of_accounts',
  'child_safe_spaces', 'css_activities', 'donor_budget_mapping', 'donor_projects',
  'drivers', 'email_templates', 'expenses', 'finance_advances', 'finance_approval_thresholds',
  'finance_asset_categories', 'finance_asset_disposals', 'finance_asset_maintenance',
  'finance_asset_transfers', 'finance_assets', 'landing_settings', 'meal_dqa_actions',
  'meal_dqa_findings', 'meal_learning_actions', 'monthly_report_audit_history',
  'monthly_reports', 'notification_preferences', 'option_set_values', 'option_sets',
  'permission_reviews', 'project_reporting_schedules', 'quotation_analysis_line_items',
  'rbac_roles', 'rbac_user_permissions', 'user_archive_log', 'user_permission_overrides',
  'variance_alert_config', 'variance_alert_history', 'budget_reallocation_lines',
  'budget_reallocations', 'meal_dqa_visits'
];

const presentCount = previouslyMissing.filter(t => allTables.includes(t)).length;
console.log(`\nPreviously Missing Tables (50 total):`);
console.log(`  Present: ${presentCount}/50`);
console.log(`  Missing: ${50 - presentCount}/50`);

if (presentCount < 50) {
  console.log(`\nStill missing:`);
  previouslyMissing.forEach(t => {
    if (!allTables.includes(t)) {
      console.log(`  - ${t}`);
    }
  });
}

await conn.end();
