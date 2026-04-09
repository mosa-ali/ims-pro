/**
 * One-time migration script to create RFQs for approved PRs that don't have RFQs yet
 * Run with: node scripts/create-missing-rfqs.mjs
 */

import { config } from "dotenv";
import mysql from "mysql2/promise";

// Load environment variables
config();

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("❌ DATABASE_URL not found in environment");
  process.exit(1);
}

async function main() {
  console.log("🔄 Starting RFQ migration for approved PRs...\n");

  const connection = await mysql.createConnection(DB_URL);

  try {
    // Find all approved PRs without RFQs (≤ $25K threshold)
    const [approvedPRs] = await connection.execute(`
      SELECT 
        pr.id,
        pr.prNumber,
        pr.organizationId,
        pr.operatingUnitId,
        pr.prTotalUSD,
        pr.approvedBy,
        pr.approvedOn
      FROM purchase_requests pr
      LEFT JOIN rfqs r ON r.purchaseRequestId = pr.id AND r.isDeleted = 0
      WHERE pr.status = 'approved'
        AND pr.isDeleted = 0
        AND pr.prTotalUSD <= 25000
        AND r.id IS NULL
      ORDER BY pr.id
    `);

    if (approvedPRs.length === 0) {
      console.log("✅ No approved PRs found without RFQs. All good!");
      return;
    }

    console.log(`📋 Found ${approvedPRs.length} approved PRs without RFQs:\n`);

    for (const pr of approvedPRs) {
      console.log(`   PR ${pr.prNumber} (ID: ${pr.id}) - $${pr.prTotalUSD}`);

      // Generate RFQ number
      const [lastRfq] = await connection.execute(`
        SELECT rfqNumber 
        FROM rfqs 
        WHERE organizationId = ? AND isDeleted = 0 
        ORDER BY id DESC 
        LIMIT 1
      `, [pr.organizationId]);

      const lastNum = lastRfq[0]?.rfqNumber?.match(/\d+$/)?.[0] || "0";
      const nextNum = (parseInt(lastNum) + 1).toString().padStart(3, "0");
      const rfqNumber = `RFQ-${new Date().getFullYear()}-${nextNum}`;

      // Create RFQ
      const [result] = await connection.execute(`
        INSERT INTO rfqs (
          organizationId,
          operatingUnitId,
          purchaseRequestId,
          rfqNumber,
          status,
          issueDate,
          createdBy,
          createdAt
        ) VALUES (?, ?, ?, ?, 'draft', NOW(), ?, NOW())
      `, [
        pr.organizationId,
        pr.operatingUnitId,
        pr.id,
        rfqNumber,
        pr.approvedBy
      ]);

      console.log(`   ✅ Created RFQ ${rfqNumber} (ID: ${result.insertId})\n`);
    }

    console.log(`\n✅ Migration complete! Created ${approvedPRs.length} RFQs.`);

  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
