#!/usr/bin/env node
/**
 * Clean Seeded CSV Data and Reseed with Correct Org/OU IDs
 * 
 * This script:
 * 1. Deletes all records from tables that were seeded from CSV
 * 2. Re-inserts the data with the correct organizationId and operatingUnitId
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

const dbConfig = parseConnectionString(process.env.DATABASE_URL);

// Tables to clean (from CSV seed)
const TABLES_TO_CLEAN = [
  "payment_lines",
  "payments",
  "delivery_notes",
  "grn_line_items",
  "goods_receipt_notes",
  "service_acceptance_certificates",
  "contract_milestones",
  "contracts",
  "bid_analysis_line_items",
  "bid_analysis_bidders",
  "bid_analyses",
  "bid_evaluation_scores",
  "bid_evaluation_criteria",
  "bid_opening_minutes",
  "quotation_analysis_line_items",
  "quotation_analysis_suppliers",
  "quotation_analyses",
  "supplier_quotation_lines",
  "supplier_quotation_headers",
  "rfq_vendor_items",
  "rfq_vendors",
  "rfqs",
  "purchase_order_line_items",
  "purchase_orders",
  "purchase_request_line_items",
  "purchase_requests",
  "budget_items",
  "budget_lines",
  "budgets",
  "procurement_audit_trail",
  "procurement_payables",
  "procurement_invoices",
  "procurement_number_sequences",
  "finance_advances",
  "gl_posting_events",
];

// CSV files to reseed (in dependency order)
const CSV_FILES = [
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
];

const CSV_DIR = "/home/ubuntu/upload";

// Get current user's organization and operating unit
async function getCurrentUserScope(connection) {
  try {
    // Query the users table to get the current user's org/ou
    const [rows] = await connection.execute(
      `SELECT organizationId, operatingUnitId FROM users LIMIT 1`
    );
    
    if (rows.length > 0) {
      return {
        organizationId: rows[0].organizationId,
        operatingUnitId: rows[0].operatingUnitId,
      };
    }
    
    // Fallback: use the first org/ou from organizations table
    const [orgRows] = await connection.execute(
      `SELECT id FROM organizations LIMIT 1`
    );
    
    if (orgRows.length > 0) {
      const orgId = orgRows[0].id;
      const [ouRows] = await connection.execute(
        `SELECT id FROM operating_units WHERE organizationId = ? LIMIT 1`,
        [orgId]
      );
      
      if (ouRows.length > 0) {
        return {
          organizationId: orgId,
          operatingUnitId: ouRows[0].id,
        };
      }
    }
    
    // Default fallback
    return {
      organizationId: 30002,
      operatingUnitId: 30002,
    };
  } catch (error) {
    console.warn("Could not determine user scope, using default:", error.message);
    return {
      organizationId: 30002,
      operatingUnitId: 30002,
    };
  }
}

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

  return value;
}

/**
 * Insert records into database with correct org/ou
 */
async function insertRecords(connection, tableName, records, scope) {
  if (records.length === 0) {
    console.log(`  ✓ No records to insert for ${tableName}`);
    return 0;
  }

  try {
    let inserted = 0;

    for (const record of records) {
      // Add organization and operating unit IDs
      record.organizationId = scope.organizationId;
      record.operatingUnitId = scope.operatingUnitId;

      const columns = Object.keys(record);
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

    if (inserted > 0) {
      console.log(`  ✓ Inserted ${inserted} records in ${tableName}`);
    } else {
      console.log(`  ✓ No records inserted for ${tableName}`);
    }
    
    return inserted;
  } catch (error) {
    console.error(`  ✗ Error inserting into ${tableName}:`, error.message);
    return 0;
  }
}

/**
 * Main cleanup and reseed function
 */
async function cleanAndReseed() {
  console.log("🧹 Starting clean and reseed process...\n");

  let connection;
  try {
    // Create connection
    connection = await mysql.createConnection(dbConfig);
    console.log("✓ Connected to database\n");

    // Get current user's scope
    console.log("📍 Determining user scope...");
    const scope = await getCurrentUserScope(connection);
    console.log(`   Organization ID: ${scope.organizationId}`);
    console.log(`   Operating Unit ID: ${scope.operatingUnitId}\n`);

    // Clean tables
    console.log("🗑️  Cleaning seeded tables...");
    for (const table of TABLES_TO_CLEAN) {
      try {
        const [result] = await connection.execute(`DELETE FROM \`${table}\``);
        console.log(`  ✓ Cleaned ${table} (${result.affectedRows} records deleted)`);
      } catch (error) {
        if (error.code !== "ER_NO_SUCH_TABLE") {
          console.warn(`  ⚠ Error cleaning ${table}: ${error.message}`);
        }
      }
    }

    console.log("\n🌱 Reseeding with correct org/ou...");
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

      // Insert records with correct scope
      const inserted = await insertRecords(connection, tableName, records, scope);
      totalRecords += inserted;
    }

    console.log(`\n✅ Clean and reseed complete! Total records inserted: ${totalRecords}`);

  } catch (error) {
    console.error("❌ Process failed:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run cleanup and reseed
cleanAndReseed();
