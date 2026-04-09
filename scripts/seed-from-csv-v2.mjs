#!/usr/bin/env node
/**
 * Seed Database from CSV Files (v2 - No Duplicates)
 * 
 * This script loads data from CSV files in /home/ubuntu/upload/ into the database.
 * It checks for existing records before inserting to prevent duplicates.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "csv-parse/sync";
import mysql from "mysql2/promise";
import { URL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse DATABASE_URL
function parseConnectionString(connectionString) {
  if (!connectionString) {
    return {
      host: "localhost",
      user: "root",
      password: "",
      database: "ims_local",
    };
  }

  try {
    const url = new URL(connectionString);
    const dbName = url.pathname.replace("/", "");
    const sslParam = url.searchParams.get("ssl");
    
    return {
      host: url.hostname,
      port: url.port ? parseInt(url.port) : 3306,
      user: url.username,
      password: url.password,
      database: dbName,
      ssl: sslParam ? JSON.parse(sslParam) : true,
    };
  } catch (error) {
    console.error("Error parsing DATABASE_URL:", error.message);
    return {
      host: "localhost",
      user: "root",
      password: "",
      database: "ims_local",
    };
  }
}

// Database configuration
const dbConfig = parseConnectionString(process.env.DATABASE_URL);

console.log("Database Config:", {
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  database: dbConfig.database,
});

// CSV files to load (in dependency order)
const CSV_FILES = [
  "option_sets.csv",
  "option_set_values.csv",
  "unit_types.csv",
  "finance_currencies.csv",
  "gl_account_categories.csv",
  "gl_accounts.csv",
  "globalSettings.csv",
  "email_provider_settings.csv",
  "email_templates.csv",
  "microsoft_integrations.csv",
  "vendors.csv",
  "vendor_participation_history.csv",
  "vendor_qualification_scores.csv",
  "hr_employees.csv",
  "hr_salary_scale.csv",
  "hr_payroll_records.csv",
  "stock_items.csv",
  "stock_batches.csv",
  "stock_ledger.csv",
  "budgets.csv",
  "budget_lines.csv",
  "budget_items.csv",
  "purchase_requests.csv",
  "purchase_request_line_items.csv",
  "rfqs.csv",
  "rfq_vendors.csv",
  "rfq_vendor_items.csv",
  "supplier_quotation_headers.csv",
  "supplier_quotation_lines.csv",
  "quotation_analyses.csv",
  "quotation_analysis_suppliers.csv",
  "quotation_analysis_line_items.csv",
  "bid_opening_minutes.csv",
  "bid_evaluation_criteria.csv",
  "bid_evaluation_scores.csv",
  "bid_analyses.csv",
  "bid_analysis_bidders.csv",
  "bid_analysis_line_items.csv",
  "purchase_orders.csv",
  "purchase_order_line_items.csv",
  "contracts.csv",
  "contract_milestones.csv",
  "goods_receipt_notes.csv",
  "grn_line_items.csv",
  "delivery_notes.csv",
  "service_acceptance_certificates.csv",
  "payments.csv",
  "payment_lines.csv",
  "procurement_invoices.csv",
  "procurement_payables.csv",
  "procurement_audit_trail.csv",
  "procurement_number_sequences.csv",
  "finance_advances.csv",
  "gl_posting_events.csv",
  "activities.csv",
  "forecast_plan.csv",
  "meal_indicator_templates.csv",
  "meal_survey_standards.csv",
  "meal_dqa_visits.csv",
  "meal_learning_items.csv",
  "permission_reviews.csv",
  "rbac_user_permissions.csv",
  "bom_approval_signatures.csv",
  "cba_approval_signatures.csv",
];

const CSV_DIR = "/home/ubuntu/upload";

// Define unique key fields for each table
const TABLE_UNIQUE_KEYS = {
  vendors: ["vendorCode", "organizationId"],
  purchase_requests: ["prNumber", "organizationId"],
  purchase_orders: ["po_number", "organizationId"],
  contracts: ["contractNumber", "organizationId"],
  rfqs: ["rfqNumber", "organizationId"],
  stock_items: ["itemCode", "organizationId"],
  // Add more as needed
};

/**
 * Parse CSV file and return records
 */
function parseCSV(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
    });
    return records;
  } catch (error) {
    console.error(`Error parsing ${path.basename(filePath)}:`, error.message);
    return [];
  }
}

/**
 * Convert CSV values to appropriate types
 */
function convertValue(value, columnName) {
  if (!value || value === "" || value === "NULL" || value === "null") {
    return null;
  }

  // Boolean fields
  if (columnName.toLowerCase().includes("is") || columnName.toLowerCase().includes("active")) {
    return value === "1" || value === "true" || value === "True" ? 1 : 0;
  }

  // Numeric fields
  if (
    columnName.includes("Id") ||
    columnName.includes("id") ||
    columnName.includes("Count") ||
    columnName.includes("Quantity") ||
    columnName.includes("Amount") ||
    columnName.includes("Total") ||
    columnName.includes("Rate") ||
    columnName.includes("Cost") ||
    columnName.includes("Value") ||
    columnName.includes("Limit") ||
    columnName.includes("Balance") ||
    columnName.includes("Exchange")
  ) {
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  }

  // Date fields
  if (columnName.includes("Date") || columnName.includes("At")) {
    return value;
  }

  return value;
}

/**
 * Check if record already exists
 */
async function recordExists(connection, tableName, record) {
  const uniqueKeys = TABLE_UNIQUE_KEYS[tableName];
  
  // If no unique keys defined, assume it doesn't exist (will insert)
  if (!uniqueKeys) {
    return false;
  }

  try {
    const whereClause = uniqueKeys.map(key => `\`${key}\` = ?`).join(" AND ");
    const values = uniqueKeys.map(key => convertValue(record[key], key));
    
    const query = `SELECT COUNT(*) as cnt FROM \`${tableName}\` WHERE ${whereClause}`;
    const [rows] = await connection.execute(query, values);
    
    return rows[0].cnt > 0;
  } catch (error) {
    // If error, assume doesn't exist
    return false;
  }
}

/**
 * Insert records into database
 */
async function insertRecords(connection, tableName, records) {
  if (records.length === 0) {
    console.log(`  ✓ No records to insert for ${tableName}`);
    return 0;
  }

  try {
    // Get column names from first record
    const columns = Object.keys(records[0]);

    let inserted = 0;
    let skipped = 0;

    // Check each record before inserting
    for (const record of records) {
      const exists = await recordExists(connection, tableName, record);
      
      if (exists) {
        skipped++;
        continue;
      }

      const values = columns.map((col) => convertValue(record[col], col));
      const placeholders = columns.map(() => "?").join(",");

      const query = `INSERT INTO \`${tableName}\` (\`${columns.join("`,`")}\`) VALUES (${placeholders})`;

      try {
        const [result] = await connection.execute(query, values);
        inserted += result.affectedRows;
      } catch (error) {
        if (error.code === "ER_NO_SUCH_TABLE") {
          console.warn(`  ⚠ Table ${tableName} does not exist, skipping...`);
          return 0;
        }
        // Skip this record on error
        console.warn(`  ⚠ Skipped record in ${tableName}: ${error.message}`);
      }
    }

    if (inserted > 0 || skipped > 0) {
      console.log(`  ✓ Inserted ${inserted} records, skipped ${skipped} existing records in ${tableName}`);
    } else {
      console.log(`  ✓ No new records to insert for ${tableName}`);
    }
    
    return inserted;
  } catch (error) {
    console.error(`  ✗ Error inserting into ${tableName}:`, error.message);
    return 0;
  }
}

/**
 * Main seeding function
 */
async function seedDatabase() {
  console.log("🌱 Starting database seeding from CSV files (v2 - No Duplicates)...\n");

  let connection;
  try {
    // Create connection
    connection = await mysql.createConnection(dbConfig);
    console.log("✓ Connected to database\n");

    let totalRecords = 0;

    // Process each CSV file
    for (const csvFile of CSV_FILES) {
      const filePath = path.join(CSV_DIR, csvFile);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.log(`⊘ ${csvFile} - File not found, skipping`);
        continue;
      }

      // Get table name from CSV filename
      const tableName = csvFile.replace(".csv", "");

      console.log(`📄 Processing ${csvFile}...`);

      // Parse CSV
      const records = parseCSV(filePath);

      if (records.length === 0) {
        console.log(`  ⊘ No records found in ${csvFile}`);
        continue;
      }

      console.log(`  📊 Found ${records.length} records`);

      // Insert records
      const inserted = await insertRecords(connection, tableName, records);
      totalRecords += inserted;
    }

    console.log(`\n✅ Seeding complete! Total new records inserted: ${totalRecords}`);

    // Show summary
    console.log("\n📈 Database Seeding Summary:");
    console.log(`   - CSV Files Processed: ${CSV_FILES.length}`);
    console.log(`   - Total New Records: ${totalRecords}`);
    console.log(`   - Database: ${dbConfig.database}`);

  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run seeding
seedDatabase();
