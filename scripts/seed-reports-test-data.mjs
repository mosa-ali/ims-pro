/**
 * ============================================================================
 * SEED REPORTS & ANALYTICS TEST DATA
 * ============================================================================
 * 
 * Creates test data for governance compliance verification:
 * - 2 Organizations: YDH and EFADAH
 * - 2 Operating Units per organization
 * - Employees, payroll records, and attendance data per OU
 * 
 * Usage: node scripts/seed-reports-test-data.mjs
 * ============================================================================
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema.js';
import { eq, and } from 'drizzle-orm';
import 'dotenv/config';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

console.log('🌱 Starting Reports & Analytics test data seeding...\n');

// ============================================================================
// STEP 1: Get or Create Organizations
// ============================================================================

console.log('📊 Step 1: Setting up organizations...');

const existingOrgs = await db.select().from(schema.organizations);
console.log(`Found ${existingOrgs.length} existing organizations`);

let ydhOrg = existingOrgs.find(o => o.name.includes('YDH'));
let efadahOrg = existingOrgs.find(o => o.name.includes('EFADAH'));

if (!ydhOrg) {
  const [inserted] = await db.insert(schema.organizations).values({
    name: 'Yemen Development House (YDH)',
    country: 'Yemen',
    city: 'Sana\'a',
    isActive: true,
  });
  ydhOrg = { id: inserted.insertId, name: 'Yemen Development House (YDH)' };
  console.log(`✅ Created YDH organization (ID: ${ydhOrg.id})`);
} else {
  console.log(`✅ Using existing YDH organization (ID: ${ydhOrg.id})`);
}

if (!efadahOrg) {
  const [inserted] = await db.insert(schema.organizations).values({
    name: 'EFADAH Organization for Development',
    country: 'Yemen',
    city: 'Aden',
    isActive: true,
  });
  efadahOrg = { id: inserted.insertId, name: 'EFADAH Organization for Development' };
  console.log(`✅ Created EFADAH organization (ID: ${efadahOrg.id})`);
} else {
  console.log(`✅ Using existing EFADAH organization (ID: ${efadahOrg.id})`);
}

// ============================================================================
// STEP 2: Create Operating Units
// ============================================================================

console.log('\n📍 Step 2: Creating Operating Units...');

const ydhOU1 = await db.insert(schema.operatingUnits).values({
  organizationId: ydhOrg.id,
  name: 'YDH Headquarters',
  location: 'Sana\'a',
  isActive: true,
}).then(r => ({ id: r[0].insertId, name: 'YDH Headquarters' }));
console.log(`✅ Created ${ydhOU1.name} (ID: ${ydhOU1.id})`);

const ydhOU2 = await db.insert(schema.operatingUnits).values({
  organizationId: ydhOrg.id,
  name: 'YDH Taiz Branch',
  location: 'Taiz',
  isActive: true,
}).then(r => ({ id: r[0].insertId, name: 'YDH Taiz Branch' }));
console.log(`✅ Created ${ydhOU2.name} (ID: ${ydhOU2.id})`);

const efadahOU1 = await db.insert(schema.operatingUnits).values({
  organizationId: efadahOrg.id,
  name: 'EFADAH Headquarters',
  location: 'Aden',
  isActive: true,
}).then(r => ({ id: r[0].insertId, name: 'EFADAH Headquarters' }));
console.log(`✅ Created ${efadahOU1.name} (ID: ${efadahOU1.id})`);

const efadahOU2 = await db.insert(schema.operatingUnits).values({
  organizationId: efadahOrg.id,
  name: 'EFADAH Hadramout Branch',
  location: 'Hadramout',
  isActive: true,
}).then(r => ({ id: r[0].insertId, name: 'EFADAH Hadramout Branch' }));
console.log(`✅ Created ${efadahOU2.name} (ID: ${efadahOU2.id})`);

// ============================================================================
// STEP 3: Create Employees
// ============================================================================

console.log('\n👥 Step 3: Creating employees...');

const createEmployees = async (orgId, ouId, ouName, count, prefix) => {
  const employees = [];
  for (let i = 1; i <= count; i++) {
    const [result] = await db.insert(schema.hrEmployees).values({
      organizationId: orgId,
      operatingUnitId: ouId,
      employeeCode: `${prefix}-${String(i).padStart(3, '0')}`,
      firstName: `Employee${i}`,
      lastName: ouName.split(' ')[0],
      email: `employee${i}.${prefix.toLowerCase()}@example.com`,
      phone: `+967${Math.floor(Math.random() * 900000000 + 100000000)}`,
      dateOfBirth: new Date(1985 + Math.floor(Math.random() * 15), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
      gender: i % 3 === 0 ? 'Female' : 'Male',
      nationality: 'Yemeni',
      department: ['HR', 'Finance', 'Programs', 'Logistics', 'MEAL'][i % 5],
      position: ['Manager', 'Officer', 'Coordinator', 'Assistant', 'Specialist'][i % 5],
      contractType: i % 2 === 0 ? 'Permanent' : 'Fixed-term',
      employmentType: i % 3 === 0 ? 'Part-time' : 'Full-time',
      hireDate: new Date(2020 + Math.floor(Math.random() * 5), Math.floor(Math.random() * 12), 1),
      status: i > count - 2 ? 'exited' : (i === count - 2 ? 'archived' : 'active'),
      basicSalary: 500 + (i * 50),
      isDeleted: false,
    });
    employees.push({ id: result.insertId, code: `${prefix}-${String(i).padStart(3, '0')}` });
  }
  console.log(`✅ Created ${count} employees for ${ouName}`);
  return employees;
};

const ydhOU1Employees = await createEmployees(ydhOrg.id, ydhOU1.id, ydhOU1.name, 10, 'YDH-HQ');
const ydhOU2Employees = await createEmployees(ydhOrg.id, ydhOU2.id, ydhOU2.name, 8, 'YDH-TZ');
const efadahOU1Employees = await createEmployees(efadahOrg.id, efadahOU1.id, efadahOU1.name, 12, 'EFD-HQ');
const efadahOU2Employees = await createEmployees(efadahOrg.id, efadahOU2.id, efadahOU2.name, 7, 'EFD-HD');

// ============================================================================
// STEP 4: Create Payroll Records
// ============================================================================

console.log('\n💰 Step 4: Creating payroll records...');

const createPayrollRecords = async (orgId, ouId, employees, ouName) => {
  const months = ['2025-01', '2025-02', '2025-03'];
  let recordCount = 0;
  
  for (const month of months) {
    for (const emp of employees) {
      const basicSalary = 500 + (Math.random() * 1000);
      const allowances = basicSalary * 0.2;
      const deductions = basicSalary * 0.1;
      
      await db.insert(schema.hrPayrollRecords).values({
        organizationId: orgId,
        operatingUnitId: ouId,
        employeeId: emp.id,
        payPeriodStart: new Date(`${month}-01`),
        payPeriodEnd: new Date(`${month}-28`),
        basicSalary,
        allowances,
        deductions,
        netSalary: basicSalary + allowances - deductions,
        status: 'paid',
        isDeleted: false,
      });
      recordCount++;
    }
  }
  console.log(`✅ Created ${recordCount} payroll records for ${ouName}`);
};

await createPayrollRecords(ydhOrg.id, ydhOU1.id, ydhOU1Employees, ydhOU1.name);
await createPayrollRecords(ydhOrg.id, ydhOU2.id, ydhOU2Employees, ydhOU2.name);
await createPayrollRecords(efadahOrg.id, efadahOU1.id, efadahOU1Employees, efadahOU1.name);
await createPayrollRecords(efadahOrg.id, efadahOU2.id, efadahOU2Employees, efadahOU2.name);

// ============================================================================
// STEP 5: Create Attendance Records
// ============================================================================

console.log('\n📅 Step 5: Creating attendance records...');

const createAttendanceRecords = async (orgId, ouId, employees, ouName) => {
  let recordCount = 0;
  const today = new Date();
  
  // Create 30 days of attendance for each employee
  for (let day = 0; day < 30; day++) {
    const date = new Date(today);
    date.setDate(date.getDate() - day);
    
    for (const emp of employees) {
      const isPresent = Math.random() > 0.1; // 90% attendance rate
      
      if (isPresent) {
        await db.insert(schema.hrAttendanceRecords).values({
          organizationId: orgId,
          operatingUnitId: ouId,
          employeeId: emp.id,
          date,
          checkIn: new Date(date.setHours(8, Math.floor(Math.random() * 30))),
          checkOut: new Date(date.setHours(17, Math.floor(Math.random() * 30))),
          status: 'present',
          isDeleted: false,
        });
        recordCount++;
      }
    }
  }
  console.log(`✅ Created ${recordCount} attendance records for ${ouName}`);
};

await createAttendanceRecords(ydhOrg.id, ydhOU1.id, ydhOU1Employees, ydhOU1.name);
await createAttendanceRecords(ydhOrg.id, ydhOU2.id, ydhOU2Employees, ydhOU2.name);
await createAttendanceRecords(efadahOrg.id, efadahOU1.id, efadahOU1Employees, efadahOU1.name);
await createAttendanceRecords(efadahOrg.id, efadahOU2.id, efadahOU2Employees, efadahOU2.name);

// ============================================================================
// Summary
// ============================================================================

console.log('\n✅ Test data seeding completed successfully!\n');
console.log('📊 Summary:');
console.log(`   Organizations: 2 (YDH, EFADAH)`);
console.log(`   Operating Units: 4 (2 per organization)`);
console.log(`   Employees: ${ydhOU1Employees.length + ydhOU2Employees.length + efadahOU1Employees.length + efadahOU2Employees.length}`);
console.log(`   Payroll Records: ${(ydhOU1Employees.length + ydhOU2Employees.length + efadahOU1Employees.length + efadahOU2Employees.length) * 3}`);
console.log(`   Attendance Records: ~${(ydhOU1Employees.length + ydhOU2Employees.length + efadahOU1Employees.length + efadahOU2Employees.length) * 30 * 0.9}`);
console.log('\n🎯 Ready for cross-organization testing!');

await connection.end();
