#!/usr/bin/env node

/**
 * Database Seed Script
 * 
 * This script seeds the database with test data for local development.
 * It creates:
 * - Test users (admin, super admin, regular users)
 * - Test organizations
 * - Test operating units
 * - Test projects
 * - Test purchase requests
 * - Test vendors
 * 
 * Usage: node scripts/seed-db.mjs
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env.local');
  process.exit(1);
}

// Parse DATABASE_URL: mysql://user:password@host:port/database
const urlMatch = DATABASE_URL.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
if (!urlMatch) {
  console.error('❌ Invalid DATABASE_URL format');
  process.exit(1);
}

const [, user, password, host, port, database] = urlMatch;

const config = {
  host,
  port: parseInt(port),
  user,
  password,
  database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

async function seedDatabase() {
  let connection;
  
  try {
    console.log('🌱 Starting database seed...\n');
    
    connection = await mysql.createConnection(config);
    console.log('✓ Connected to database\n');

    // Clear existing test data (optional - comment out to preserve data)
    console.log('🗑️  Clearing existing test data...');
    await connection.execute('DELETE FROM users WHERE email IN (?, ?, ?)', [
      'mdrwesh@outlook.com',
      'mosamali2050@gmail.com',
      'mdrwesh82@gmail.com'
    ]);
    console.log('✓ Cleared existing users\n');

    // Create test users
    console.log('👥 Creating test users...');
    const users = [
      {
        name: 'Mosa Ali',
        email: 'mdrwesh@outlook.com',
        role: 'platform_admin',
        password: 'hashed_password_1'
      },
      {
        name: 'Super Admin User',
        email: 'mosamali2050@gmail.com',
        role: 'platform_super_admin',
        password: 'hashed_password_2'
      },
      {
        name: 'Another Super Admin',
        email: 'mdrwesh82@gmail.com',
        role: 'platform_super_admin',
        password: 'hashed_password_3'
      }
    ];

    for (const user of users) {
      await connection.execute(
        `INSERT INTO users (name, email, role, password, createdAt, updatedAt) 
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [user.name, user.email, user.role, user.password]
      );
      console.log(`  ✓ Created user: ${user.email} (${user.role})`);
    }
    console.log('');

    // Create test organizations
    console.log('🏢 Creating test organizations...');
    const organizations = [
      {
        name: 'EFADAH Organization',
        code: 'EFADAH',
        country: 'Sudan',
        currency: 'SDG'
      },
      {
        name: 'Test Organization',
        code: 'TEST',
        country: 'Sudan',
        currency: 'SDG'
      }
    ];

    const orgIds = [];
    for (const org of organizations) {
      const [result] = await connection.execute(
        `INSERT INTO organizations (name, code, country, currency, createdAt, updatedAt) 
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [org.name, org.code, org.country, org.currency]
      );
      orgIds.push(result.insertId);
      console.log(`  ✓ Created organization: ${org.name}`);
    }
    console.log('');

    // Create test operating units
    console.log('🏭 Creating test operating units...');
    const operatingUnits = [
      {
        name: 'Khartoum Office',
        code: 'KH-001',
        organizationId: orgIds[0]
      },
      {
        name: 'Port Sudan Office',
        code: 'PS-001',
        organizationId: orgIds[0]
      },
      {
        name: 'Test OU',
        code: 'TEST-001',
        organizationId: orgIds[1]
      }
    ];

    const ouIds = [];
    for (const ou of operatingUnits) {
      const [result] = await connection.execute(
        `INSERT INTO operating_units (name, code, organizationId, createdAt, updatedAt) 
         VALUES (?, ?, ?, NOW(), NOW())`,
        [ou.name, ou.code, ou.organizationId]
      );
      ouIds.push(result.insertId);
      console.log(`  ✓ Created operating unit: ${ou.name}`);
    }
    console.log('');

    // Create test projects
    console.log('📋 Creating test projects...');
    const projects = [
      {
        name: 'Emergency Response Project',
        code: 'ERP-001',
        description: 'Emergency response and humanitarian aid',
        organizationId: orgIds[0],
        operatingUnitId: ouIds[0],
        status: 'active'
      },
      {
        name: 'Development Initiative',
        code: 'DEV-001',
        description: 'Community development and capacity building',
        organizationId: orgIds[0],
        operatingUnitId: ouIds[1],
        status: 'active'
      }
    ];

    const projectIds = [];
    for (const project of projects) {
      const [result] = await connection.execute(
        `INSERT INTO projects (name, code, description, organizationId, operatingUnitId, status, createdAt, updatedAt) 
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [project.name, project.code, project.description, project.organizationId, project.operatingUnitId, project.status]
      );
      projectIds.push(result.insertId);
      console.log(`  ✓ Created project: ${project.name}`);
    }
    console.log('');

    // Create test vendors
    console.log('🏪 Creating test vendors...');
    const vendors = [
      {
        name: 'Local Supplier Co.',
        code: 'VEN-001',
        email: 'supplier1@example.com',
        phone: '+249123456789',
        country: 'Sudan',
        organizationId: orgIds[0]
      },
      {
        name: 'International Vendor Ltd.',
        code: 'VEN-002',
        email: 'vendor@international.com',
        phone: '+44123456789',
        country: 'UK',
        organizationId: orgIds[0]
      },
      {
        name: 'Test Vendor',
        code: 'VEN-003',
        email: 'test@vendor.com',
        phone: '+249987654321',
        country: 'Sudan',
        organizationId: orgIds[1]
      }
    ];

    const vendorIds = [];
    for (const vendor of vendors) {
      const [result] = await connection.execute(
        `INSERT INTO vendors (name, code, email, phone, country, organizationId, createdAt, updatedAt) 
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [vendor.name, vendor.code, vendor.email, vendor.phone, vendor.country, vendor.organizationId]
      );
      vendorIds.push(result.insertId);
      console.log(`  ✓ Created vendor: ${vendor.name}`);
    }
    console.log('');

    // Create test purchase requests
    console.log('📦 Creating test purchase requests...');
    const purchaseRequests = [
      {
        prNumber: 'PR-EFADAH01-2026-001',
        projectId: projectIds[0],
        organizationId: orgIds[0],
        operatingUnitId: ouIds[0],
        description: 'Medical supplies for emergency response',
        totalCost: 4250.10,
        currency: 'USD',
        status: 'approved',
        procurementType: 'direct'
      },
      {
        prNumber: 'PR-EFADAH01-2026-002',
        projectId: projectIds[0],
        organizationId: orgIds[0],
        operatingUnitId: ouIds[0],
        description: 'Vehicle maintenance and spare parts',
        totalCost: 30000.00,
        currency: 'USD',
        status: 'approved',
        procurementType: 'tender'
      }
    ];

    for (const pr of purchaseRequests) {
      const [result] = await connection.execute(
        `INSERT INTO purchase_requests 
         (prNumber, projectId, organizationId, operatingUnitId, description, totalCost, currency, status, procurementType, createdAt, updatedAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [pr.prNumber, pr.projectId, pr.organizationId, pr.operatingUnitId, pr.description, pr.totalCost, pr.currency, pr.status, pr.procurementType]
      );
      console.log(`  ✓ Created PR: ${pr.prNumber}`);
    }
    console.log('');

    console.log('✅ Database seed completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`  - Users: ${users.length}`);
    console.log(`  - Organizations: ${organizations.length}`);
    console.log(`  - Operating Units: ${operatingUnits.length}`);
    console.log(`  - Projects: ${projects.length}`);
    console.log(`  - Vendors: ${vendors.length}`);
    console.log(`  - Purchase Requests: ${purchaseRequests.length}`);
    console.log('');
    console.log('🚀 You can now start the dev server with: pnpm dev');

  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the seed script
seedDatabase();
