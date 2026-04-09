#!/usr/bin/env node

/**
 * Data Migration: Populate NULL operatingUnitId values
 * 
 * This script safely populates NULL operatingUnitId values in operational tables
 * before adding the NOT NULL constraint. It uses a mapping strategy:
 * 
 * 1. For each organization, find the primary operating unit
 * 2. Update all records with NULL operatingUnitId to use the primary operating unit
 * 3. Verify no NULL values remain
 * 4. Log all changes for audit trail
 * 
 * Usage: node scripts/populate-operating-unit-ids.mjs
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Parse DATABASE_URL or use individual env vars
let DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT = 3306;

if (process.env.DATABASE_URL) {
  // Parse DATABASE_URL: mysql://user:password@host:port/database
  const url = new URL(process.env.DATABASE_URL);
  DB_HOST = url.hostname;
  DB_USER = url.username;
  DB_PASSWORD = url.password;
  DB_NAME = url.pathname.substring(1);
  DB_PORT = parseInt(url.port) || 4000;
} else {
  DB_HOST = process.env.DB_HOST || 'localhost';
  DB_USER = process.env.DB_USER || 'root';
  DB_PASSWORD = process.env.DB_PASSWORD || '';
  DB_NAME = process.env.DB_NAME || 'ims_database';
  DB_PORT = parseInt(process.env.DB_PORT) || 3306;
}

const OPERATIONAL_TABLES = [
  'purchase_requests',
  'quotation_analyses',
  'purchase_orders',
  'goods_receipt_notes',
  'delivery_notes',
  'projects',
  'budgets',
  'journal_entries',
  'payments',
];

let connection;

/**
 * Connect to database
 */
async function connectDatabase() {
  try {
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      ssl: { rejectUnauthorized: true },
    });
    console.log('✅ Connected to database');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
    process.exit(1);
  }
}

/**
 * Get the primary operating unit for an organization
 * (lowest operatingUnitId that belongs to the organization)
 */
async function getPrimaryOperatingUnit(organizationId) {
  try {
    const [rows] = await connection.query(
      'SELECT id FROM operating_units WHERE organizationId = ? ORDER BY id ASC LIMIT 1',
      [organizationId]
    );
    
    if (rows.length === 0) {
      console.warn(`⚠️  No operating unit found for organization ${organizationId}`);
      return null;
    }
    
    return rows[0].id;
  } catch (error) {
    console.error(`❌ Error getting primary operating unit for org ${organizationId}:`, error.message);
    return null;
  }
}

/**
 * Get organizations with NULL operatingUnitId records
 */
async function getOrganizationsWithNullOperatingUnits(tableName) {
  try {
    const [rows] = await connection.query(
      `SELECT DISTINCT organizationId FROM ${tableName} WHERE operatingUnitId IS NULL`
    );
    return rows.map(r => r.organizationId);
  } catch (error) {
    console.error(`❌ Error getting organizations for ${tableName}:`, error.message);
    return [];
  }
}

/**
 * Count NULL operatingUnitId records in a table
 */
async function countNullOperatingUnits(tableName) {
  try {
    const [rows] = await connection.query(
      `SELECT COUNT(*) as count FROM ${tableName} WHERE operatingUnitId IS NULL`
    );
    return rows[0].count;
  } catch (error) {
    console.error(`❌ Error counting NULL operatingUnitId in ${tableName}:`, error.message);
    return 0;
  }
}

/**
 * Update NULL operatingUnitId values in a table
 */
async function updateNullOperatingUnits(tableName, organizationId, operatingUnitId) {
  try {
    const [result] = await connection.query(
      `UPDATE ${tableName} SET operatingUnitId = ? WHERE organizationId = ? AND operatingUnitId IS NULL`,
      [operatingUnitId, organizationId]
    );
    
    return result.affectedRows;
  } catch (error) {
    console.error(`❌ Error updating ${tableName}:`, error.message);
    throw error;
  }
}

/**
 * Process a single table
 */
async function processTable(tableName) {
  console.log(`\n📋 Processing table: ${tableName}`);
  
  const nullCount = await countNullOperatingUnits(tableName);
  if (nullCount === 0) {
    console.log(`  ✅ No NULL operatingUnitId values found`);
    return { table: tableName, processed: 0, errors: 0 };
  }
  
  console.log(`  📊 Found ${nullCount} records with NULL operatingUnitId`);
  
  const organizations = await getOrganizationsWithNullOperatingUnits(tableName);
  console.log(`  🏢 Organizations affected: ${organizations.join(', ')}`);
  
  let totalProcessed = 0;
  let errors = 0;
  
  for (const orgId of organizations) {
    const operatingUnitId = await getPrimaryOperatingUnit(orgId);
    
    if (!operatingUnitId) {
      console.warn(`  ⚠️  Skipping org ${orgId} - no operating unit found`);
      errors++;
      continue;
    }
    
    try {
      const affected = await updateNullOperatingUnits(tableName, orgId, operatingUnitId);
      console.log(`  ✅ Updated ${affected} records for org ${orgId} → operating unit ${operatingUnitId}`);
      totalProcessed += affected;
    } catch (error) {
      console.error(`  ❌ Error updating org ${orgId}:`, error.message);
      errors++;
    }
  }
  
  // Verify no NULL values remain
  const remainingNull = await countNullOperatingUnits(tableName);
  if (remainingNull === 0) {
    console.log(`  ✅ Verification: No NULL operatingUnitId values remain`);
  } else {
    console.warn(`  ⚠️  Verification: ${remainingNull} NULL operatingUnitId values still exist`);
    errors++;
  }
  
  return { table: tableName, processed: totalProcessed, errors };
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('🚀 Starting operatingUnitId population migration\n');
  console.log(`📍 Database: ${DB_NAME}`);
  console.log(`📋 Tables: ${OPERATIONAL_TABLES.join(', ')}\n`);
  
  await connectDatabase();
  
  const results = [];
  let totalProcessed = 0;
  let totalErrors = 0;
  
  try {
    // Start transaction
    await connection.query('START TRANSACTION');
    console.log('🔒 Transaction started\n');
    
    // Process each table
    for (const tableName of OPERATIONAL_TABLES) {
      const result = await processTable(tableName);
      results.push(result);
      totalProcessed += result.processed;
      totalErrors += result.errors;
    }
    
    // Commit transaction
    await connection.query('COMMIT');
    console.log('\n✅ Transaction committed\n');
    
  } catch (error) {
    console.error('\n❌ Error during migration, rolling back transaction:', error.message);
    try {
      await connection.query('ROLLBACK');
      console.log('✅ Transaction rolled back');
    } catch (rollbackError) {
      console.error('❌ Error rolling back transaction:', rollbackError.message);
    }
    process.exit(1);
  }
  
  // Summary
  console.log('📊 Migration Summary:');
  console.log(`  Total records processed: ${totalProcessed}`);
  console.log(`  Total errors: ${totalErrors}`);
  
  if (totalErrors === 0) {
    console.log('\n✅ Migration completed successfully!');
    console.log('\n🎯 Next steps:');
    console.log('  1. Review the changes above');
    console.log('  2. Update schema.ts to add .notNull() to operatingUnitId');
    console.log('  3. Run: pnpm db:push');
    console.log('  4. Verify: All operational tables have operatingUnitId NOT NULL');
  } else {
    console.log('\n⚠️  Migration completed with errors. Please review above.');
    process.exit(1);
  }
  
  await connection.end();
}

// Run migration
migrate().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
