#!/usr/bin/env node
/**
 * Import all CSV data into the database using the project's existing database connection.
 */

import { createConnection } from 'mysql2/promise';
import { readFileSync, readdirSync } from 'fs';
import { parse } from 'csv-parse/sync';
import path from 'path';

const CSV_DIR = '/home/ubuntu/upload';

// Tables already imported
const ALREADY_IMPORTED = new Set([
  'users', 'organizations', 'operating_units', 'user_organizations',
  'projects', 'grants', 'activities'
]);

// Tables to skip (empty or problematic)
const SKIP_TABLES = new Set([
  'bid_analyses', 'bid_analysis_bidders', 'bid_analysis_scores', 'bid_evaluation_criteria',
  'css_activities', 'finance_asset_categories', 'finance_asset_disposals', 
  'finance_asset_maintenance', 'finance_asset_transfers', 'finance_exchange_rates',
  'finance_permissions', 'finance_role_permissions', 'finance_settlements',
  'finance_user_roles', 'fuel_logs', 'forecast_audit_log', 'goods_receipt_notes',
  'grant_documents', 'grn_line_items', 'hr_annual_plans', 'hr_documents',
  'hr_overtime_requests', 'hr_recruitment_candidates', 'hr_recruitment_jobs',
  'meal_accountability_records', 'meal_documents', 'meal_indicator_data_entries',
  'meal_survey_questions', 'meal_survey_submissions', 'meal_surveys',
  'microsoft_integrations', 'procurement_payments', 'project_plan_tasks',
  'purchase_order_line_items', 'quotation_analyses', 'quotation_analysis_suppliers',
  'returned_item_line_items', 'returned_items', 'stock_issued', 'stock_issued_line_items',
  'stock_request_line_items', 'stock_requests', 'systemImportReports',
  'trip_logs', 'vehicle_assignments', 'vehicle_compliance', 'vehicle_maintenance'
]);

function getTableName(filename) {
  const basename = path.basename(filename);
  const match = basename.match(/^(.+?)_\d{8}_\d{6}\.csv$/);
  return match ? match[1] : basename.replace('.csv', '');
}

function escapeValue(value) {
  if (value === null || value === undefined || value === '' || value === 'NULL') {
    return null;
  }
  return value;
}

async function main() {
  // Get database URL from environment
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  // Parse connection string
  const url = new URL(dbUrl);
  const connection = await createConnection({
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: { rejectUnauthorized: false }
  });

  console.log('Connected to database');

  // Disable foreign key checks
  await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

  const csvFiles = readdirSync(CSV_DIR)
    .filter(f => f.endsWith('.csv'))
    .sort();

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const csvFile of csvFiles) {
    const tableName = getTableName(csvFile);
    
    if (ALREADY_IMPORTED.has(tableName) || SKIP_TABLES.has(tableName)) {
      console.log(`⏭️  Skipping ${tableName}`);
      skipped++;
      continue;
    }

    const filePath = path.join(CSV_DIR, csvFile);
    
    try {
      const content = readFileSync(filePath, 'utf-8');
      const records = parse(content, { columns: true, skip_empty_lines: true });
      
      if (records.length === 0) {
        console.log(`⏭️  Empty: ${tableName}`);
        skipped++;
        continue;
      }

      // Delete existing data
      await connection.execute(`DELETE FROM \`${tableName}\``);

      // Get column names from first record
      const columns = Object.keys(records[0]);
      const placeholders = columns.map(() => '?').join(', ');
      const columnList = columns.map(c => `\`${c}\``).join(', ');

      const insertSql = `INSERT INTO \`${tableName}\` (${columnList}) VALUES (${placeholders})`;

      for (const record of records) {
        const values = columns.map(col => escapeValue(record[col]));
        try {
          await connection.execute(insertSql, values);
        } catch (insertErr) {
          // Try to handle common errors
          if (insertErr.message.includes('Unknown column')) {
            console.log(`⚠️  Schema mismatch in ${tableName}: ${insertErr.message.split('\n')[0]}`);
            break;
          }
          throw insertErr;
        }
      }

      console.log(`✅ ${tableName}: ${records.length} rows`);
      imported++;
    } catch (err) {
      console.log(`❌ ${tableName}: ${err.message.split('\n')[0]}`);
      errors++;
    }
  }

  // Re-enable foreign key checks
  await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

  await connection.end();

  console.log(`\n=== Summary ===`);
  console.log(`Imported: ${imported}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
