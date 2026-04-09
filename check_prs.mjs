import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("No DATABASE_URL");
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection);

const [rows] = await connection.execute(
  "SELECT id, prNumber, projectTitle, status, organizationId, prTotalUSD, currency FROM purchase_requests WHERE isDeleted = 0 ORDER BY id DESC LIMIT 20"
);
console.log("PRs:", JSON.stringify(rows, null, 2));

// Check QA table
const [qaRows] = await connection.execute(
  "SELECT id, qaNumber, purchaseRequestId, status, organizationId FROM quotation_analyses WHERE deletedAt IS NULL LIMIT 10"
);
console.log("QAs:", JSON.stringify(qaRows, null, 2));

// Check BA table
const [baRows] = await connection.execute(
  "SELECT id, cbaNumber, purchaseRequestId, status, organizationId FROM bid_analyses WHERE deletedAt IS NULL LIMIT 10"
);
console.log("BAs:", JSON.stringify(baRows, null, 2));

await connection.end();
