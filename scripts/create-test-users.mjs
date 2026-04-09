/**
 * ============================================================================
 * CREATE TEST USERS FOR GOVERNANCE COMPLIANCE TESTING
 * ============================================================================
 * 
 * Creates test users for each organization and operating unit:
 * - YDH HQ User
 * - YDH Taiz User
 * - EFADAH HQ User
 * - EFADAH Hadramout User
 * 
 * Usage: node scripts/create-test-users.mjs
 * ============================================================================
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema.js';
import { eq } from 'drizzle-orm';
import 'dotenv/config';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

console.log('👥 Creating test users for governance compliance testing...\n');

// Get organizations and OUs
const orgs = await db.select().from(schema.organizations);
const ydhOrg = orgs.find(o => o.name.includes('YDH'));
const efadahOrg = orgs.find(o => o.name.includes('EFADAH'));

const ous = await db.select().from(schema.operatingUnits);
const ydhHQ = ous.find(ou => ou.organizationId === ydhOrg.id && ou.name.includes('Headquarters'));
const ydhTaiz = ous.find(ou => ou.organizationId === ydhOrg.id && ou.name.includes('Taiz'));
const efadahHQ = ous.find(ou => ou.organizationId === efadahOrg.id && ou.name.includes('Headquarters'));
const efadahHadramout = ous.find(ou => ou.organizationId === efadahOrg.id && ou.name.includes('Hadramout'));

console.log('📊 Found organizations and OUs:');
console.log(`   YDH (${ydhOrg.id}): HQ (${ydhHQ.id}), Taiz (${ydhTaiz.id})`);
console.log(`   EFADAH (${efadahOrg.id}): HQ (${efadahHQ.id}), Hadramout (${efadahHadramout.id})\n`);

// Test users configuration
const testUsers = [
  {
    email: 'ydh.hq@test.com',
    name: 'YDH HQ Admin',
    openId: 'test_ydh_hq',
    organizationId: ydhOrg.id,
    operatingUnitId: ydhHQ.id,
    role: 'admin',
    platformRole: 'org_user',
  },
  {
    email: 'ydh.taiz@test.com',
    name: 'YDH Taiz Admin',
    openId: 'test_ydh_taiz',
    organizationId: ydhOrg.id,
    operatingUnitId: ydhTaiz.id,
    role: 'admin',
    platformRole: 'org_user',
  },
  {
    email: 'efadah.hq@test.com',
    name: 'EFADAH HQ Admin',
    openId: 'test_efadah_hq',
    organizationId: efadahOrg.id,
    operatingUnitId: efadahHQ.id,
    role: 'admin',
    platformRole: 'org_user',
  },
  {
    email: 'efadah.hadramout@test.com',
    name: 'EFADAH Hadramout Admin',
    openId: 'test_efadah_hadramout',
    organizationId: efadahOrg.id,
    operatingUnitId: efadahHadramout.id,
    role: 'admin',
    platformRole: 'org_user',
  },
];

console.log('👤 Creating test users...\n');

for (const userData of testUsers) {
  // Check if user already exists
  const existing = await db.select().from(schema.users).where(eq(schema.users.email, userData.email));
  
  if (existing.length > 0) {
    console.log(`⚠️  User ${userData.email} already exists, skipping...`);
    continue;
  }

  // Create user
  await db.insert(schema.users).values({
    email: userData.email,
    name: userData.name,
    openId: userData.openId,
    role: userData.role,
    platformRole: userData.platformRole,
    isDeleted: false,
  });

  // Create organization membership
  const [userResult] = await db.select().from(schema.users).where(eq(schema.users.email, userData.email));
  
  await db.insert(schema.organizationMembers).values({
    userId: userResult.id,
    organizationId: userData.organizationId,
    operatingUnitId: userData.operatingUnitId,
    role: userData.role,
    isDeleted: false,
  });

  console.log(`✅ Created ${userData.name} (${userData.email})`);
  console.log(`   Organization: ${userData.organizationId}, OU: ${userData.operatingUnitId}`);
}

console.log('\n✅ Test users created successfully!\n');
console.log('📋 Login credentials for testing:');
console.log('   YDH HQ: ydh.hq@test.com');
console.log('   YDH Taiz: ydh.taiz@test.com');
console.log('   EFADAH HQ: efadah.hq@test.com');
console.log('   EFADAH Hadramout: efadah.hadramout@test.com');
console.log('\n🎯 Ready for cross-organization testing!');

await connection.end();
