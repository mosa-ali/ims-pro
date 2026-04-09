#!/usr/bin/env python3
import mysql.connector
import csv
from pathlib import Path
from datetime import datetime

# Database configuration
db_config = {
    'host': 'gateway02.us-east-1.prod.aws.tidbcloud.com',
    'port': 4000,
    'user': '22aWfraQ8tS98ev.root',
    'password': 'G1Ay0h26s6ssgEerqTu2',
    'database': 'SyqFTnEociiwryMADE4XT4',
    'ssl_disabled': False,
}

# Mapping of CSV files to database tables
CSV_TO_TABLE_MAPPING = {
    'activities.csv': 'activities',
    'allocation_bases.csv': 'allocation_bases',
    'allocation_keys.csv': 'allocation_keys',
    'allocation_periods.csv': 'allocation_periods',
    'allocation_results.csv': 'allocation_results',
    'allocation_reversals.csv': 'allocation_reversals',
    'allocation_rules.csv': 'allocation_rules',
    'allocation_template_rules.csv': 'allocation_template_rules',
    'allocation_templates.csv': 'allocation_templates',
    'asset_depreciation_schedule.csv': 'asset_depreciation_schedule',
    'audit_log_export_history.csv': 'audit_log_export_history',
    'audit_log_export_schedules.csv': 'audit_log_export_schedules',
    'audit_logs.csv': 'audit_logs',
    'bank_reconciliations.csv': 'bank_reconciliations',
    'bank_transactions.csv': 'bank_transactions',
    'beneficiaries.csv': 'beneficiaries',
    'bid_analyses.csv': 'bid_analyses',
    'bid_analysis_bidders.csv': 'bid_analysis_bidders',
    'bid_evaluation_criteria.csv': 'bid_evaluation_criteria',
    'bid_evaluation_scores.csv': 'bid_evaluation_scores',
    'bid_opening_minutes.csv': 'bid_opening_minutes',
    'budget_items.csv': 'budget_items',
    'budget_lines.csv': 'budget_lines',
    'budget_monthly_allocations.csv': 'budget_monthly_allocations',
    'budget_reallocation_lines.csv': 'budget_reallocation_lines',
    'budget_reallocations.csv': 'budget_reallocations',
    'budgets.csv': 'budgets',
    'case_activities.csv': 'case_activities',
    'case_records.csv': 'case_records',
    'case_referrals.csv': 'case_referrals',
    'chart_of_accounts.csv': 'chart_of_accounts',
    'child_safe_spaces.csv': 'child_safe_spaces',
    'cost_centers.csv': 'cost_centers',
    'cost_pool_transactions.csv': 'cost_pool_transactions',
    'cost_pools.csv': 'cost_pools',
    'css_activities.csv': 'css_activities',
    'donor_budget_mapping.csv': 'donor_budget_mapping',
    'donor_communications.csv': 'donor_communications',
    'donor_projects.csv': 'donor_projects',
    'donor_reports.csv': 'donor_reports',
    'donors.csv': 'donors',
    'drivers.csv': 'drivers',
    'email_provider_settings.csv': 'email_provider_settings',
    'email_templates.csv': 'email_templates',
    'expenses.csv': 'expenses',
    'finance_advances.csv': 'finance_advances',
    'finance_approval_thresholds.csv': 'finance_approval_thresholds',
    'finance_asset_categories.csv': 'finance_asset_categories',
    'finance_asset_disposals.csv': 'finance_asset_disposals',
    'finance_asset_maintenance.csv': 'finance_asset_maintenance',
    'finance_asset_transfers.csv': 'finance_asset_transfers',
    'finance_assets.csv': 'finance_assets',
    'finance_bank_accounts.csv': 'finance_bank_accounts',
    'finance_budget_categories.csv': 'finance_budget_categories',
    'finance_cash_transactions.csv': 'finance_cash_transactions',
    'finance_currencies.csv': 'finance_currencies',
    'finance_exchange_rates.csv': 'finance_exchange_rates',
    'finance_fiscal_years.csv': 'finance_fiscal_years',
    'finance_fund_balances.csv': 'finance_fund_balances',
    'finance_permissions.csv': 'finance_permissions',
    'finance_role_permissions.csv': 'finance_role_permissions',
    'finance_roles.csv': 'finance_roles',
    'finance_settlements.csv': 'finance_settlements',
    'finance_user_roles.csv': 'finance_user_roles',
    'fiscal_periods.csv': 'fiscal_periods',
    'forecast_audit_log.csv': 'forecast_audit_log',
    'forecast_plan.csv': 'forecast_plan',
    'fuel_logs.csv': 'fuel_logs',
    'gl_account_categories.csv': 'gl_account_categories',
    'gl_accounts.csv': 'gl_accounts',
    'globalSettings.csv': 'globalSettings',
    'goods_receipt_notes.csv': 'goods_receipt_notes',
    'grant_documents.csv': 'grant_documents',
    'grants.csv': 'grants',
    'grn_line_items.csv': 'grn_line_items',
    'hr_annual_plans.csv': 'hr_annual_plans',
    'hr_attendance_records.csv': 'hr_attendance_records',
    'hr_documents.csv': 'hr_documents',
    'hr_employees.csv': 'hr_employees',
    'hr_leave_balances.csv': 'hr_leave_balances',
    'hr_leave_requests.csv': 'hr_leave_requests',
    'hr_payroll_records.csv': 'hr_payroll_records',
    'hr_recruitment_candidates.csv': 'hr_recruitment_candidates',
    'hr_recruitment_jobs.csv': 'hr_recruitment_jobs',
    'hr_salary_grades.csv': 'hr_salary_grades',
    'hr_salary_scale.csv': 'hr_salary_scale',
    'hr_sanctions.csv': 'hr_sanctions',
    'import_history.csv': 'import_history',
    'indicators.csv': 'indicators',
    'invitations.csv': 'invitations',
    'journal_entries.csv': 'journal_entries',
    'journal_lines.csv': 'journal_lines',
    'landing_settings.csv': 'landing_settings',
    'meal_accountability_records.csv': 'meal_accountability_records',
    'meal_audit_log.csv': 'meal_audit_log',
    'meal_documents.csv': 'meal_documents',
    'meal_dqa_actions.csv': 'meal_dqa_actions',
    'meal_dqa_findings.csv': 'meal_dqa_findings',
    'meal_dqa_visits.csv': 'meal_dqa_visits',
    'meal_indicator_data_entries.csv': 'meal_indicator_data_entries',
    'meal_indicator_templates.csv': 'meal_indicator_templates',
    'meal_learning_actions.csv': 'meal_learning_actions',
    'meal_learning_items.csv': 'meal_learning_items',
    'meal_survey_questions.csv': 'meal_survey_questions',
    'meal_survey_standards.csv': 'meal_survey_standards',
    'meal_survey_submissions.csv': 'meal_survey_submissions',
    'meal_surveys.csv': 'meal_surveys',
    'microsoft_integrations.csv': 'microsoft_integrations',
    'notification_event_settings.csv': 'notification_event_settings',
    'notification_outbox.csv': 'notification_outbox',
    'notification_preferences.csv': 'notification_preferences',
    'operating_units.csv': 'operating_units',
    'opportunities.csv': 'opportunities',
    'option_set_values.csv': 'option_set_values',
    'option_sets.csv': 'option_sets',
    'organization_branding.csv': 'organization_branding',
    'organizations.csv': 'organizations',
    'payment_lines.csv': 'payment_lines',
    'payments.csv': 'payments',
    'permission_reviews.csv': 'permission_reviews',
    'pipeline_opportunities.csv': 'pipeline_opportunities',
    'procurement_number_sequences.csv': 'procurement_number_sequences',
    'procurement_payments.csv': 'procurement_payments',
    'procurement_plan.csv': 'procurement_plan',
    'procurement_workflow_tracker.csv': 'procurement_workflow_tracker',
    'project_plan_activities.csv': 'project_plan_activities',
    'project_plan_objectives.csv': 'project_plan_objectives',
    'project_plan_results.csv': 'project_plan_results',
    'project_plan_tasks.csv': 'project_plan_tasks',
    'project_reporting_schedules.csv': 'project_reporting_schedules',
    'projects.csv': 'projects',
    'proposals.csv': 'proposals',
    'pss_sessions.csv': 'pss_sessions',
    'purchase_order_line_items.csv': 'purchase_order_line_items',
    'purchase_orders.csv': 'purchase_orders',
    'purchase_request_line_items.csv': 'purchase_request_line_items',
    'purchase_requests.csv': 'purchase_requests',
    'purge_notifications.csv': 'purge_notifications',
    'quotation_analyses.csv': 'quotation_analyses',
    'quotation_analysis_line_items.csv': 'quotation_analysis_line_items',
    'quotation_analysis_suppliers.csv': 'quotation_analysis_suppliers',
    'rbac_roles.csv': 'rbac_roles',
    'rbac_user_permissions.csv': 'rbac_user_permissions',
    'reporting_schedules.csv': 'reporting_schedules',
    'returned_item_line_items.csv': 'returned_item_line_items',
    'returned_items.csv': 'returned_items',
    'rfq_vendors.csv': 'rfq_vendors',
    'settlement_lines.csv': 'settlement_lines',
    'stock_issued.csv': 'stock_issued',
    'stock_issued_line_items.csv': 'stock_issued_line_items',
    'stock_items.csv': 'stock_items',
    'stock_request_line_items.csv': 'stock_request_line_items',
    'stock_requests.csv': 'stock_requests',
    'suppliers.csv': 'suppliers',
    'systemImportReports.csv': 'systemImportReports',
    'system_settings.csv': 'system_settings',
    'tasks.csv': 'tasks',
    'trip_logs.csv': 'trip_logs',
    'user_archive_log.csv': 'user_archive_log',
    'user_operating_units.csv': 'user_operating_units',
    'user_organizations.csv': 'user_organizations',
    'user_permission_overrides.csv': 'user_permission_overrides',
    'users.csv': 'users',
    'variance_alert_config.csv': 'variance_alert_config',
    'variance_alert_history.csv': 'variance_alert_history',
    'variance_alert_thresholds.csv': 'variance_alert_thresholds',
    'variance_alerts.csv': 'variance_alerts',
    'vehicle_assignments.csv': 'vehicle_assignments',
    'vehicle_compliance.csv': 'vehicle_compliance',
    'vehicle_maintenance.csv': 'vehicle_maintenance',
    'vehicles.csv': 'vehicles',
    'vendors.csv': 'vendors',
}

def convert_value(val, col_name):
    """Convert CSV value to appropriate database type"""
    if val == '' or val == 'NULL' or val is None:
        return None
    
    if isinstance(val, str):
        if val.lower() == 'true':
            return 1
        if val.lower() == 'false':
            return 0
        
        # Handle date/timestamp columns
        if 'date' in col_name.lower() or 'time' in col_name.lower():
            try:
                for fmt in ['%Y-%m-%d %H:%M:%S', '%Y-%m-%d', '%d/%m/%Y']:
                    try:
                        dt = datetime.strptime(val, fmt)
                        if 'time' in col_name.lower():
                            return dt.strftime('%Y-%m-%d %H:%M:%S')
                        else:
                            return dt.strftime('%Y-%m-%d')
                    except ValueError:
                        continue
            except:
                pass
    
    return val

def import_csv_data():
    print('📡 Connecting to TiDB Cloud (ims_dev)...')
    
    try:
        cnx = mysql.connector.connect(**db_config)
        cursor = cnx.cursor()
        print('✅ Connected successfully!\n')
    except Exception as e:
        print(f'❌ Connection failed: {e}')
        return
    
    schema_dir = Path('Schema tables')
    csv_files = sorted([f for f in schema_dir.glob('*.csv')])
    
    print(f'📋 Found {len(csv_files)} CSV files to import\n')
    
    success_count = 0
    skip_count = 0
    error_count = 0
    total_rows = 0
    
    for csv_file in csv_files:
        filename = csv_file.name
        table_name = CSV_TO_TABLE_MAPPING.get(filename)
        
        if not table_name:
            print(f'⏭️  {filename}: SKIPPED (no mapping)')
            skip_count += 1
            continue
        
        try:
            with open(csv_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                rows = list(reader)
            
            if not rows:
                print(f'⏭️  {table_name}: SKIPPED (empty)')
                skip_count += 1
                continue
            
            columns = list(rows[0].keys())
            placeholders = ','.join(['%s'] * len(columns))
            column_names = ','.join([f'`{col}`' for col in columns])
            query = f'INSERT INTO `{table_name}` ({column_names}) VALUES ({placeholders})'
            
            inserted_count = 0
            skipped_rows = 0
            
            for row in rows:
                values = [convert_value(row.get(col, ''), col) for col in columns]
                
                try:
                    cursor.execute(query, values)
                    inserted_count += 1
                except mysql.connector.Error as err:
                    error_code = err.errno
                    error_msg = str(err)
                    
                    if error_code == 1062 or 'Duplicate entry' in error_msg:
                        skipped_rows += 1
                        continue
                    elif error_code == 1452 or 'foreign key constraint' in error_msg.lower():
                        skipped_rows += 1
                        continue
                    else:
                        raise
            
            cnx.commit()
            
            if inserted_count > 0:
                print(f'✅ {table_name}: {inserted_count} rows inserted', end='')
                if skipped_rows > 0:
                    print(f' ({skipped_rows} skipped)')
                else:
                    print()
                success_count += 1
                total_rows += inserted_count
            else:
                print(f'⏭️  {table_name}: SKIPPED (no rows inserted)')
                skip_count += 1
            
        except Exception as error:
            error_msg = str(error)
            print(f'❌ {table_name}: {error_msg[:100]}')
            error_count += 1
    
    print(f'\n📊 Import Summary:')
    print(f'   ✅ Successful tables: {success_count}')
    print(f'   ⏭️  Skipped tables: {skip_count}')
    print(f'   ❌ Error tables: {error_count}')
    print(f'   📈 Total rows inserted: {total_rows}')
    print(f'\n✅ Data import complete!')
    
    cursor.close()
    cnx.close()

if __name__ == '__main__':
    import_csv_data()
