/**
 * Populate HR and Finance Example Data for WASH-2026-001 Project
 * 
 * This script creates:
 * 1. HR Employees assigned to the project
 * 2. Bank Accounts for the organization
 * 3. Salary Grades
 * 4. Leave Balances
 */

import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Get project and organization info
const [[project]] = await conn.query(
  'SELECT id, organizationId, operatingUnitId FROM projects WHERE projectCode = ?',
  ['WASH-2026-001']
);

if (!project) {
  console.error('❌ Project WASH-2026-001 not found!');
  process.exit(1);
}

const projectId = project.id;
const orgId = project.organizationId;
const ouId = project.operatingUnitId;

console.log('=== POPULATING HR & FINANCE DATA ===');
console.log('Project ID:', projectId);
console.log('Organization ID:', orgId);
console.log('Operating Unit ID:', ouId);

// ============================================================================
// 1. HR EMPLOYEES
// ============================================================================
console.log('\n--- 1. Creating HR Employees ---');

const employees = [
  {
    employeeCode: 'EMP-001',
    firstName: 'Ahmed',
    lastName: 'Al-Rashid',
    firstNameAr: 'أحمد',
    lastNameAr: 'الراشد',
    email: 'ahmed.rashid@efadah.org',
    phone: '+967-777-123456',
    gender: 'male',
    nationality: 'Yemeni',
    employmentType: 'full_time',
    staffCategory: 'national',
    department: 'Programs',
    position: 'Project Manager',
    jobTitle: 'WASH Project Manager',
    gradeLevel: 'P4',
    hireDate: '2023-03-15',
    status: 'active'
  },
  {
    employeeCode: 'EMP-002',
    firstName: 'Fatima',
    lastName: 'Hassan',
    firstNameAr: 'فاطمة',
    lastNameAr: 'حسن',
    email: 'fatima.hassan@efadah.org',
    phone: '+967-777-234567',
    gender: 'female',
    nationality: 'Yemeni',
    employmentType: 'full_time',
    staffCategory: 'national',
    department: 'MEAL',
    position: 'MEAL Officer',
    jobTitle: 'Monitoring & Evaluation Officer',
    gradeLevel: 'P3',
    hireDate: '2024-01-10',
    status: 'active'
  },
  {
    employeeCode: 'EMP-003',
    firstName: 'Mohammed',
    lastName: 'Saleh',
    firstNameAr: 'محمد',
    lastNameAr: 'صالح',
    email: 'mohammed.saleh@efadah.org',
    phone: '+967-777-345678',
    gender: 'male',
    nationality: 'Yemeni',
    employmentType: 'full_time',
    staffCategory: 'national',
    department: 'Finance',
    position: 'Finance Officer',
    jobTitle: 'Senior Finance Officer',
    gradeLevel: 'P3',
    hireDate: '2022-06-01',
    status: 'active'
  },
  {
    employeeCode: 'EMP-004',
    firstName: 'Sarah',
    lastName: 'Abdullah',
    firstNameAr: 'سارة',
    lastNameAr: 'عبدالله',
    email: 'sarah.abdullah@efadah.org',
    phone: '+967-777-456789',
    gender: 'female',
    nationality: 'Yemeni',
    employmentType: 'full_time',
    staffCategory: 'national',
    department: 'Logistics',
    position: 'Logistics Coordinator',
    jobTitle: 'Logistics & Procurement Coordinator',
    gradeLevel: 'P2',
    hireDate: '2024-06-15',
    status: 'active'
  },
  {
    employeeCode: 'EMP-005',
    firstName: 'Omar',
    lastName: 'Nasser',
    firstNameAr: 'عمر',
    lastNameAr: 'ناصر',
    email: 'omar.nasser@efadah.org',
    phone: '+967-777-567890',
    gender: 'male',
    nationality: 'Yemeni',
    employmentType: 'contract',
    staffCategory: 'national',
    department: 'Programs',
    position: 'Field Engineer',
    jobTitle: 'WASH Field Engineer',
    gradeLevel: 'P2',
    hireDate: '2025-01-01',
    contractEndDate: '2026-12-31',
    status: 'active'
  }
];

for (const emp of employees) {
  await conn.query(`
    INSERT INTO hr_employees (
      organizationId, operatingUnitId, employeeCode, firstName, lastName, 
      firstNameAr, lastNameAr, email, phone, gender, nationality,
      employmentType, staffCategory, department, position, jobTitle, gradeLevel,
      hireDate, contractEndDate, status, isDeleted, createdAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, NOW())
    ON DUPLICATE KEY UPDATE status = VALUES(status)
  `, [
    orgId, ouId, emp.employeeCode, emp.firstName, emp.lastName,
    emp.firstNameAr, emp.lastNameAr, emp.email, emp.phone, emp.gender, emp.nationality,
    emp.employmentType, emp.staffCategory, emp.department, emp.position, emp.jobTitle, emp.gradeLevel,
    emp.hireDate, emp.contractEndDate || null, emp.status
  ]);
  console.log(`✅ Employee: ${emp.employeeCode} - ${emp.firstName} ${emp.lastName} (${emp.position})`);
}

// ============================================================================
// 2. SALARY GRADES
// ============================================================================
console.log('\n--- 2. Creating Salary Grades ---');

const salaryGrades = [
  { gradeCode: 'P1', gradeName: 'Entry Level', gradeNameAr: 'مستوى مبتدئ', minSalary: 500, maxSalary: 800 },
  { gradeCode: 'P2', gradeName: 'Junior Professional', gradeNameAr: 'محترف مبتدئ', minSalary: 800, maxSalary: 1200 },
  { gradeCode: 'P3', gradeName: 'Professional', gradeNameAr: 'محترف', minSalary: 1200, maxSalary: 1800 },
  { gradeCode: 'P4', gradeName: 'Senior Professional', gradeNameAr: 'محترف أول', minSalary: 1800, maxSalary: 2500 },
  { gradeCode: 'P5', gradeName: 'Manager', gradeNameAr: 'مدير', minSalary: 2500, maxSalary: 3500 },
  { gradeCode: 'D1', gradeName: 'Director', gradeNameAr: 'مدير إدارة', minSalary: 3500, maxSalary: 5000 }
];

for (const grade of salaryGrades) {
  await conn.query(`
    INSERT INTO hr_salary_grades (organizationId, gradeCode, gradeName, gradeNameAr, minSalary, maxSalary, currency, isDeleted, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, 'USD', FALSE, NOW())
    ON DUPLICATE KEY UPDATE minSalary = VALUES(minSalary)
  `, [orgId, grade.gradeCode, grade.gradeName, grade.gradeNameAr, grade.minSalary, grade.maxSalary]);
  console.log(`✅ Salary Grade: ${grade.gradeCode} - ${grade.gradeName} ($${grade.minSalary}-$${grade.maxSalary})`);
}

// ============================================================================
// 3. BANK ACCOUNTS
// ============================================================================
console.log('\n--- 3. Creating Bank Accounts ---');

const bankAccounts = [
  {
    accountName: 'Main Operating Account',
    accountNameAr: 'الحساب التشغيلي الرئيسي',
    accountNumber: '1234567890',
    bankName: 'Yemen International Bank',
    bankNameAr: 'بنك اليمن الدولي',
    currency: 'USD',
    accountType: 'checking',
    currentBalance: 250000,
    openingBalance: 500000,
    status: 'active'
  },
  {
    accountName: 'WASH Project Account',
    accountNameAr: 'حساب مشروع المياه والصرف الصحي',
    accountNumber: '1234567891',
    bankName: 'Yemen International Bank',
    bankNameAr: 'بنك اليمن الدولي',
    currency: 'USD',
    accountType: 'checking',
    currentBalance: 394500,
    openingBalance: 450000,
    status: 'active'
  },
  {
    accountName: 'Petty Cash - Headquarters',
    accountNameAr: 'النثرية - المقر الرئيسي',
    accountNumber: 'PC-HQ-001',
    bankName: 'Internal',
    bankNameAr: 'داخلي',
    currency: 'YER',
    accountType: 'petty_cash',
    currentBalance: 500000,
    openingBalance: 500000,
    status: 'active'
  }
];

for (const acct of bankAccounts) {
  await conn.query(`
    INSERT INTO finance_bank_accounts (
      organizationId, operatingUnitId, accountName, accountNameAr, accountNumber,
      bankName, bankNameAr, currency, accountType, currentBalance, openingBalance, status,
      isDeleted, createdAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, NOW())
    ON DUPLICATE KEY UPDATE currentBalance = VALUES(currentBalance)
  `, [
    orgId, ouId, acct.accountName, acct.accountNameAr, acct.accountNumber,
    acct.bankName, acct.bankNameAr, acct.currency, acct.accountType,
    acct.currentBalance, acct.openingBalance, acct.status
  ]);
  console.log(`✅ Bank Account: ${acct.accountNumber} - ${acct.accountName} (${acct.currency} ${acct.currentBalance})`);
}

// ============================================================================
// 4. LEAVE BALANCES
// ============================================================================
console.log('\n--- 4. Creating Leave Balances ---');

// Get employee IDs
const [empRows] = await conn.query(
  'SELECT id, employeeCode FROM hr_employees WHERE organizationId = ? AND employeeCode LIKE ?',
  [orgId, 'EMP-%']
);

for (const emp of empRows) {
  // Annual leave (entitlement - used - pending = remaining)
  await conn.query(`
    INSERT INTO hr_leave_balances (organizationId, employeeId, leaveType, year, entitlement, used, pending, carriedOver, isDeleted, createdAt)
    VALUES (?, ?, 'annual', 2026, 21, 3, 0, 0, FALSE, NOW())
    ON DUPLICATE KEY UPDATE used = VALUES(used)
  `, [orgId, emp.id]);
  
  // Sick leave
  await conn.query(`
    INSERT INTO hr_leave_balances (organizationId, employeeId, leaveType, year, entitlement, used, pending, carriedOver, isDeleted, createdAt)
    VALUES (?, ?, 'sick', 2026, 14, 0, 0, 0, FALSE, NOW())
    ON DUPLICATE KEY UPDATE used = VALUES(used)
  `, [orgId, emp.id]);
  
  console.log(`✅ Leave Balance: ${emp.employeeCode} (Annual: 18 days remaining, Sick: 14 days remaining)`);
}

// ============================================================================
// 5. FISCAL YEAR
// ============================================================================
console.log('\n--- 5. Creating Fiscal Year ---');

await conn.query(`
  INSERT INTO finance_fiscal_years (organizationId, name, nameAr, startDate, endDate, status, isCurrent, createdAt)
  VALUES (?, 'FY 2026', 'السنة المالية 2026', '2026-01-01', '2026-12-31', 'open', TRUE, NOW())
  ON DUPLICATE KEY UPDATE status = VALUES(status)
`, [orgId]);
console.log('✅ Fiscal Year: FY 2026 (Open, Current)');

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n=== HR & FINANCE POPULATION COMPLETE ===');

// Verify counts
const [empCount] = await conn.query('SELECT COUNT(*) as count FROM hr_employees WHERE organizationId = ?', [orgId]);
const [gradeCount] = await conn.query('SELECT COUNT(*) as count FROM hr_salary_grades WHERE organizationId = ?', [orgId]);
const [bankCount] = await conn.query('SELECT COUNT(*) as count FROM finance_bank_accounts WHERE organizationId = ?', [orgId]);
const [leaveCount] = await conn.query('SELECT COUNT(*) as count FROM hr_leave_balances WHERE organizationId = ?', [orgId]);
const [fyCount] = await conn.query('SELECT COUNT(*) as count FROM finance_fiscal_years WHERE organizationId = ?', [orgId]);

console.log('\nFinal Counts:');
console.log('  HR Employees:', empCount[0].count);
console.log('  Salary Grades:', gradeCount[0].count);
console.log('  Bank Accounts:', bankCount[0].count);
console.log('  Leave Balances:', leaveCount[0].count);
console.log('  Fiscal Years:', fyCount[0].count);

await conn.end();
console.log('\n✅ All HR & Finance data populated successfully!');
