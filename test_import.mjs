import { drizzle } from "drizzle-orm/mysql2";
import { grants } from "./drizzle/schema.js";

const db = drizzle(process.env.DATABASE_URL);

const testGrant = {
  grantCode: "ADIDAS-YEM 007",
  title: "Promoting Inclusion and Social Change through Sports",
  donorName: "Adidas Foundation",
  amount: "366690.00",
  totalBudget: "366690.00",
  currency: "Euro",
  startDate: new Date("2025-01-01"),
  endDate: new Date("2026-06-30"),
  status: "ongoing",
  organizationId: 1,
  createdBy: 1,
};

console.log("Testing grant insert with data:", testGrant);

try {
  const result = await db.insert(grants).values(testGrant);
  console.log("✅ Insert successful! ID:", result[0].insertId);
} catch (error) {
  console.error("❌ Insert failed:", error.message);
  console.error("Full error:", error);
}

process.exit(0);
