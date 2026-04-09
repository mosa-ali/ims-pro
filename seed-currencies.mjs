import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the CSV file
const csvPath = path.join(__dirname, "Schema tables", "finance_currencies.csv");
const csvContent = fs.readFileSync(csvPath, "utf-8");
const lines = csvContent.trim().split("\n");

// Parse CSV
const headers = lines[0].split(",");
const currencies = lines.slice(1).map((line) => {
  const values = line.split(",");
  const obj = {};
  headers.forEach((header, index) => {
    obj[header.trim()] = values[index]?.trim() || null;
  });
  return obj;
});

console.log(`Parsed ${currencies.length} currencies from CSV`);

// Database connection
const connection = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "ims",
});

try {
  console.log("Connecting to database...");
  await connection.connect();
  console.log("Connected successfully");

  // Clear existing currencies (optional - comment out if you want to keep existing)
  // await connection.execute("DELETE FROM finance_currencies WHERE organizationId = 30001");
  // console.log("Cleared existing currencies");

  // Insert currencies
  let inserted = 0;
  let skipped = 0;

  for (const currency of currencies) {
    try {
      // Check if currency already exists
      const [existing] = await connection.execute(
        "SELECT id FROM finance_currencies WHERE code = ? AND organizationId = ?",
        [currency.code, currency.organizationId]
      );

      if (existing.length > 0) {
        console.log(`⊘ Skipping ${currency.code} (already exists)`);
        skipped++;
        continue;
      }

      // Insert currency
      await connection.execute(
        `INSERT INTO finance_currencies 
        (code, name, nameAr, symbol, exchangeRateToUsd, isBaseCurrency, isActive, decimalPlaces, organizationId, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          currency.code,
          currency.name,
          currency.nameAr,
          currency.symbol,
          parseFloat(currency.exchangeRateToUSD) || 1.0,
          currency.isBaseCurrency === "1" ? 1 : 0,
          currency.isActive === "1" ? 1 : 0,
          parseInt(currency.decimalPlaces) || 2,
          parseInt(currency.organizationId),
        ]
      );

      console.log(`✓ Inserted ${currency.code}`);
      inserted++;
    } catch (error) {
      console.error(`✗ Error inserting ${currency.code}:`, error.message);
    }
  }

  // Get final count
  const [result] = await connection.execute(
    "SELECT COUNT(*) as count FROM finance_currencies WHERE organizationId = 30001 AND isActive = 1"
  );

  console.log(`\n=== SUMMARY ===`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Total Active Currencies: ${result[0].count}`);
  console.log(`Coverage: ${((result[0].count / 160) * 100).toFixed(1)}% of ~160 world currencies`);

  // Sample query
  console.log(`\n=== SAMPLE CURRENCIES ===`);
  const [samples] = await connection.execute(
    "SELECT code, name, nameAr, exchangeRateToUsd FROM finance_currencies WHERE organizationId = 30001 AND isActive = 1 ORDER BY code LIMIT 10"
  );
  samples.forEach((c) => {
    console.log(`${c.code} - ${c.name} (${c.nameAr}) @ ${c.exchangeRateToUsd}`);
  });
} catch (error) {
  console.error("Error:", error);
  process.exit(1);
} finally {
  await connection.end();
}
