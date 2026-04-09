import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

// List of all missing tables
const missingTables = [
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

console.log(`Analyzing ${missingTables.length} CSV files...\n`);

// Read one CSV from each table to understand structure
const csvAnalysis = {};

for (const table of missingTables) {
  try {
    const csvPath = `/home/ubuntu/upload/${table}.csv`;
    const csvContent = readFileSync(csvPath, 'utf-8');
    const records = parse(csvContent, { columns: true, skip_empty_lines: true });
    
    if (records.length > 0) {
      const columns = Object.keys(records[0]);
      const sampleRow = records[0];
      
      csvAnalysis[table] = {
        columns,
        sampleRow,
        rowCount: records.length
      };
      
      console.log(`✅ ${table}: ${columns.length} columns, ${records.length} rows`);
    } else {
      console.log(`⚠️  ${table}: Empty CSV`);
      csvAnalysis[table] = { columns: [], sampleRow: {}, rowCount: 0 };
    }
  } catch (err) {
    console.log(`❌ ${table}: ${err.message}`);
  }
}

// Save analysis
writeFileSync('/home/ubuntu/csv_analysis.json', JSON.stringify(csvAnalysis, null, 2));
console.log('\n✅ CSV analysis saved to /home/ubuntu/csv_analysis.json');
