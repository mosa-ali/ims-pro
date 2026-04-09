#!/usr/bin/env node
/**
 * Cleanup Duplicate Records (TiDB Compatible)
 * 
 * This script removes duplicate records from key tables in the database.
 * Uses TiDB-compatible SQL syntax.
 */

import mysql from "mysql2/promise";
import { URL } from "url";

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

// Cleanup queries for each table (TiDB compatible)
const CLEANUP_QUERIES = [
  {
    table: "purchase_requests",
    query: `
      DELETE pr1 FROM purchase_requests pr1
      INNER JOIN (
        SELECT prNumber, organizationId, operatingUnitId, MIN(id) as min_id
        FROM purchase_requests
        GROUP BY prNumber, organizationId, operatingUnitId
        HAVING COUNT(*) > 1
      ) pr2 ON pr1.prNumber = pr2.prNumber 
        AND pr1.organizationId = pr2.organizationId
        AND pr1.operatingUnitId = pr2.operatingUnitId
        AND pr1.id > pr2.min_id
    `,
  },
  {
    table: "purchase_request_line_items",
    query: `
      DELETE prl1 FROM purchase_request_line_items prl1
      INNER JOIN (
        SELECT prId, lineNumber, organizationId, operatingUnitId, MIN(id) as min_id
        FROM purchase_request_line_items
        GROUP BY prId, lineNumber, organizationId, operatingUnitId
        HAVING COUNT(*) > 1
      ) prl2 ON prl1.prId = prl2.prId 
        AND prl1.lineNumber = prl2.lineNumber
        AND prl1.organizationId = prl2.organizationId
        AND prl1.operatingUnitId = prl2.operatingUnitId
        AND prl1.id > prl2.min_id
    `,
  },
  {
    table: "purchase_orders",
    query: `
      DELETE po1 FROM purchase_orders po1
      INNER JOIN (
        SELECT po_number, organizationId, operatingUnitId, MIN(id) as min_id
        FROM purchase_orders
        GROUP BY po_number, organizationId, operatingUnitId
        HAVING COUNT(*) > 1
      ) po2 ON po1.po_number = po2.po_number 
        AND po1.organizationId = po2.organizationId
        AND po1.operatingUnitId = po2.operatingUnitId
        AND po1.id > po2.min_id
    `,
  },
  {
    table: "purchase_order_line_items",
    query: `
      DELETE pol1 FROM purchase_order_line_items pol1
      INNER JOIN (
        SELECT poId, lineNumber, organizationId, operatingUnitId, MIN(id) as min_id
        FROM purchase_order_line_items
        GROUP BY poId, lineNumber, organizationId, operatingUnitId
        HAVING COUNT(*) > 1
      ) pol2 ON pol1.poId = pol2.poId 
        AND pol1.lineNumber = pol2.lineNumber
        AND pol1.organizationId = pol2.organizationId
        AND pol1.operatingUnitId = pol2.operatingUnitId
        AND pol1.id > pol2.min_id
    `,
  },
  {
    table: "rfqs",
    query: `
      DELETE r1 FROM rfqs r1
      INNER JOIN (
        SELECT rfqNumber, organizationId, operatingUnitId, MIN(id) as min_id
        FROM rfqs
        GROUP BY rfqNumber, organizationId, operatingUnitId
        HAVING COUNT(*) > 1
      ) r2 ON r1.rfqNumber = r2.rfqNumber 
        AND r1.organizationId = r2.organizationId
        AND r1.operatingUnitId = r2.operatingUnitId
        AND r1.id > r2.min_id
    `,
  },
  {
    table: "rfq_vendors",
    query: `
      DELETE rv1 FROM rfq_vendors rv1
      INNER JOIN (
        SELECT rfqId, vendorId, organizationId, operatingUnitId, MIN(id) as min_id
        FROM rfq_vendors
        GROUP BY rfqId, vendorId, organizationId, operatingUnitId
        HAVING COUNT(*) > 1
      ) rv2 ON rv1.rfqId = rv2.rfqId 
        AND rv1.vendorId = rv2.vendorId
        AND rv1.organizationId = rv2.organizationId
        AND rv1.operatingUnitId = rv2.operatingUnitId
        AND rv1.id > rv2.min_id
    `,
  },
  {
    table: "rfq_vendor_items",
    query: `
      DELETE rvi1 FROM rfq_vendor_items rvi1
      INNER JOIN (
        SELECT rfqVendorId, itemId, organizationId, operatingUnitId, MIN(id) as min_id
        FROM rfq_vendor_items
        GROUP BY rfqVendorId, itemId, organizationId, operatingUnitId
        HAVING COUNT(*) > 1
      ) rvi2 ON rvi1.rfqVendorId = rvi2.rfqVendorId 
        AND rvi1.itemId = rvi2.itemId
        AND rvi1.organizationId = rvi2.organizationId
        AND rvi1.operatingUnitId = rvi2.operatingUnitId
        AND rvi1.id > rvi2.min_id
    `,
  },
  {
    table: "supplier_quotation_headers",
    query: `
      DELETE sq1 FROM supplier_quotation_headers sq1
      INNER JOIN (
        SELECT quotationNumber, organizationId, operatingUnitId, MIN(id) as min_id
        FROM supplier_quotation_headers
        GROUP BY quotationNumber, organizationId, operatingUnitId
        HAVING COUNT(*) > 1
      ) sq2 ON sq1.quotationNumber = sq2.quotationNumber 
        AND sq1.organizationId = sq2.organizationId
        AND sq1.operatingUnitId = sq2.operatingUnitId
        AND sq1.id > sq2.min_id
    `,
  },
  {
    table: "supplier_quotation_lines",
    query: `
      DELETE sql1 FROM supplier_quotation_lines sql1
      INNER JOIN (
        SELECT quotationHeaderId, lineNumber, organizationId, operatingUnitId, MIN(id) as min_id
        FROM supplier_quotation_lines
        GROUP BY quotationHeaderId, lineNumber, organizationId, operatingUnitId
        HAVING COUNT(*) > 1
      ) sql2 ON sql1.quotationHeaderId = sql2.quotationHeaderId 
        AND sql1.lineNumber = sql2.lineNumber
        AND sql1.organizationId = sql2.organizationId
        AND sql1.operatingUnitId = sql2.operatingUnitId
        AND sql1.id > sql2.min_id
    `,
  },
  {
    table: "contracts",
    query: `
      DELETE c1 FROM contracts c1
      INNER JOIN (
        SELECT contractNumber, organizationId, operatingUnitId, MIN(id) as min_id
        FROM contracts
        GROUP BY contractNumber, organizationId, operatingUnitId
        HAVING COUNT(*) > 1
      ) c2 ON c1.contractNumber = c2.contractNumber 
        AND c1.organizationId = c2.organizationId
        AND c1.operatingUnitId = c2.operatingUnitId
        AND c1.id > c2.min_id
    `,
  },
  {
    table: "goods_receipt_notes",
    query: `
      DELETE g1 FROM goods_receipt_notes g1
      INNER JOIN (
        SELECT grnNumber, organizationId, operatingUnitId, MIN(id) as min_id
        FROM goods_receipt_notes
        GROUP BY grnNumber, organizationId, operatingUnitId
        HAVING COUNT(*) > 1
      ) g2 ON g1.grnNumber = g2.grnNumber 
        AND g1.organizationId = g2.organizationId
        AND g1.operatingUnitId = g2.operatingUnitId
        AND g1.id > g2.min_id
    `,
  },
  {
    table: "grn_line_items",
    query: `
      DELETE gl1 FROM grn_line_items gl1
      INNER JOIN (
        SELECT grnId, lineNumber, organizationId, operatingUnitId, MIN(id) as min_id
        FROM grn_line_items
        GROUP BY grnId, lineNumber, organizationId, operatingUnitId
        HAVING COUNT(*) > 1
      ) gl2 ON gl1.grnId = gl2.grnId 
        AND gl1.lineNumber = gl2.lineNumber
        AND gl1.organizationId = gl2.organizationId
        AND gl1.operatingUnitId = gl2.operatingUnitId
        AND gl1.id > gl2.min_id
    `,
  },
  {
    table: "delivery_notes",
    query: `
      DELETE d1 FROM delivery_notes d1
      INNER JOIN (
        SELECT deliveryNoteNumber, organizationId, operatingUnitId, MIN(id) as min_id
        FROM delivery_notes
        GROUP BY deliveryNoteNumber, organizationId, operatingUnitId
        HAVING COUNT(*) > 1
      ) d2 ON d1.deliveryNoteNumber = d2.deliveryNoteNumber 
        AND d1.organizationId = d2.organizationId
        AND d1.operatingUnitId = d2.operatingUnitId
        AND d1.id > d2.min_id
    `,
  },
  {
    table: "payments",
    query: `
      DELETE p1 FROM payments p1
      INNER JOIN (
        SELECT paymentNumber, organizationId, operatingUnitId, MIN(id) as min_id
        FROM payments
        GROUP BY paymentNumber, organizationId, operatingUnitId
        HAVING COUNT(*) > 1
      ) p2 ON p1.paymentNumber = p2.paymentNumber 
        AND p1.organizationId = p2.organizationId
        AND p1.operatingUnitId = p2.operatingUnitId
        AND p1.id > p2.min_id
    `,
  },
];

/**
 * Main cleanup function
 */
async function cleanupDuplicates() {
  console.log("🧹 Starting duplicate cleanup (TiDB compatible)...\n");

  let connection;
  try {
    // Create connection
    connection = await mysql.createConnection(dbConfig);
    console.log("✓ Connected to database\n");

    let totalDeleted = 0;

    // Process each cleanup query
    for (const item of CLEANUP_QUERIES) {
      try {
        console.log(`🔍 Cleaning ${item.table}...`);
        const [result] = await connection.execute(item.query);
        const deleted = result.affectedRows;
        totalDeleted += deleted;
        
        if (deleted > 0) {
          console.log(`  ✓ Removed ${deleted} duplicate records`);
        } else {
          console.log(`  ✓ No duplicates found`);
        }
      } catch (error) {
        if (error.code === "ER_NO_SUCH_TABLE") {
          console.log(`  ⊘ Table ${item.table} does not exist, skipping`);
        } else {
          console.warn(`  ⚠ Error cleaning ${item.table}: ${error.message}`);
        }
      }
    }

    console.log(`\n✅ Cleanup complete! Total duplicate records removed: ${totalDeleted}`);

  } catch (error) {
    console.error("❌ Cleanup failed:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run cleanup
cleanupDuplicates();
