/**
 * Seed Demo Users Script
 * 
 * Creates 6 demo users with different roles for development and testing.
 * Password for all accounts: demo123
 * 
 * Run with: tsx scripts/seed-demo-users.ts
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eq, and } from 'drizzle-orm';
import * as schema from '../drizzle/schema';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function main() {
  console.log('🌱 Seeding demo users...\n');

  // Create database connection
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection, { schema, mode: 'default' });

  // Demo users configuration
  const demoUsers = [
    {
      openId: 'demo_org_admin_001',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@relief-intl.org',
      loginMethod: 'demo',
      role: 'admin' as const,
      orgRole: 'org_admin' as const,
      roleDescription: 'Full system access',
      languagePreference: 'en'
    },
    {
      openId: 'demo_program_manager_002',
      name: 'Ahmad Hassan',
      email: 'ahmad.hassan@relief-intl.org',
      loginMethod: 'demo',
      role: 'manager' as const,
      orgRole: 'program_manager' as const,
      roleDescription: 'Grants & Projects management',
      languagePreference: 'ar'
    },
    {
      openId: 'demo_finance_manager_003',
      name: 'Maria Garcia',
      email: 'maria.garcia@relief-intl.org',
      loginMethod: 'demo',
      role: 'manager' as const,
      orgRole: 'finance_manager' as const,
      roleDescription: 'Finance & Budget management',
      languagePreference: 'en'
    },
    {
      openId: 'demo_meal_officer_004',
      name: 'Fatima Al-Sayed',
      email: 'fatima.alsayed@ijpn.org.jo',
      loginMethod: 'demo',
      role: 'user' as const,
      orgRole: 'meal_officer' as const,
      roleDescription: 'M&E and Indicators',
      languagePreference: 'ar'
    },
    {
      openId: 'demo_case_worker_005',
      name: 'John Smith',
      email: 'john.smith@relief-intl.org',
      loginMethod: 'demo',
      role: 'user' as const,
      orgRole: 'case_worker' as const,
      roleDescription: 'Cases & Beneficiaries',
      languagePreference: 'en'
    },
    {
      openId: 'demo_viewer_006',
      name: 'Laura Martinez',
      email: 'laura.martinez@iom.int',
      loginMethod: 'demo',
      role: 'user' as const,
      orgRole: 'viewer' as const,
      roleDescription: 'Read-only access',
      languagePreference: 'en'
    }
  ];

  try {
    // Get or create demo organization
    let demoOrg = await db.select()
      .from(schema.organizations)
      .where(eq(schema.organizations.code, 'DEMO-ORG'))
      .limit(1)
      .then(rows => rows[0]);

    if (!demoOrg) {
      console.log('📦 Creating demo organization...');
      const insertResult = await db.insert(schema.organizations).values({
        name: 'Demo Relief International',
        nameAr: 'منظمة الإغاثة الدولية التجريبية',
        code: 'DEMO-ORG',
        description: 'Demo organization for testing and development',
        descriptionAr: 'منظمة تجريبية للاختبار والتطوير',
        country: 'Yemen',
        defaultCurrency: 'USD',
        contactEmail: 'demo@relief-intl.org',
        defaultLanguage: 'ar',
        status: 'active'
      });
      
      // Fetch the newly created organization by code
      demoOrg = await db.select()
        .from(schema.organizations)
        .where(eq(schema.organizations.code, 'DEMO-ORG'))
        .limit(1)
        .then(rows => rows[0]);
      
      console.log(`✅ Created organization: ${demoOrg.name} (ID: ${demoOrg.id})\n`);
    } else {
      console.log(`✅ Using existing organization: ${demoOrg.name} (ID: ${demoOrg.id})\n`);
    }

    // Create demo users
    for (const userData of demoUsers) {
      // Check if user already exists
      const existingUser = await db.select()
        .from(schema.users)
        .where(eq(schema.users.openId, userData.openId))
        .limit(1)
        .then(rows => rows[0]);

      let userId: number;

      if (existingUser) {
        console.log(`⚠️  User already exists: ${userData.email}`);
        userId = existingUser.id;
      } else {
        // Insert user
        await db.insert(schema.users).values({
          openId: userData.openId,
          name: userData.name,
          email: userData.email,
          loginMethod: userData.loginMethod,
          role: userData.role,
          organizationId: demoOrg.id,
          currentOrganizationId: demoOrg.id,
          languagePreference: userData.languagePreference
        });

        // Fetch the newly created user by openId to get the ID
        const newUser = await db.select()
          .from(schema.users)
          .where(eq(schema.users.openId, userData.openId))
          .limit(1)
          .then(rows => rows[0]);
        
        userId = newUser.id;
        console.log(`✅ Created user: ${userData.name} (${userData.email})`);
      }

      // Check if user-organization relationship exists
      const existingUserOrg = await db.select()
        .from(schema.userOrganizations)
        .where(
          and(
            eq(schema.userOrganizations.userId, userId),
            eq(schema.userOrganizations.organizationId, demoOrg.id)
          )
        )
        .limit(1)
        .then(rows => rows[0]);

      if (!existingUserOrg) {
        // Link user to organization
        console.log(`   → Linking user ${userId} to organization ${demoOrg.id}`);
        await db.insert(schema.userOrganizations).values({
          userId: userId,
          organizationId: demoOrg.id,
          isPrimary: true
        });
      }

      // Check if role assignment exists
      const existingRole = await db.select()
        .from(schema.userOrganizationRoles)
        .where(
          and(
            eq(schema.userOrganizationRoles.userId, userId),
            eq(schema.userOrganizationRoles.organizationId, demoOrg.id)
          )
        )
        .limit(1)
        .then(rows => rows[0]);

      if (!existingRole) {
        // Assign organization role
        await db.insert(schema.userOrganizationRoles).values({
          userId: userId,
          organizationId: demoOrg.id,
          role: userData.orgRole
        });
        console.log(`   → Role: ${userData.orgRole} - ${userData.roleDescription}`);
      }
    }

    console.log('\n✅ Demo users seeded successfully!');
    console.log('\n📋 Demo Accounts:');
    console.log('   Password for all accounts: demo123\n');
    
    demoUsers.forEach(user => {
      console.log(`   ${user.name}`);
      console.log(`   ${user.email}`);
      console.log(`   Role: ${user.orgRole} - ${user.roleDescription}\n`);
    });

  } catch (error) {
    console.error('❌ Error seeding demo users:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();
