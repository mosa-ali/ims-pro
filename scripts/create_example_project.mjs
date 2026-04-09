import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

console.log('=== CREATING EXAMPLE PROJECT FOR END-TO-END VALIDATION ===');
console.log('Organization: EFADAH (ID: 180001)');
console.log('Operating Unit: Headquarters (ID: 1)');

const orgId = 180001;
const ouId = 1;
const userId = 1;
const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
const today = new Date().toISOString().slice(0, 10);

// 1. Create Example Project (using actual DB column names)
console.log('\n1. Creating Example Project...');
const projectCode = 'WASH-2026-001';
try {
  await conn.query(`
    INSERT INTO projects (
      organizationId, operatingUnitId, projectCode, titleEn, titleAr,
      description, descriptionAr, startDate, endDate, status,
      totalBudget, currency, location, locationAr,
      createdAt, updatedAt, createdBy, isDeleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE titleEn = VALUES(titleEn)
  `, [
    orgId, ouId, projectCode,
    'Water & Sanitation Emergency Response - Phase 2',
    'الاستجابة الطارئة للمياه والصرف الصحي - المرحلة 2',
    'Emergency WASH intervention providing clean water access and sanitation facilities to 50,000 beneficiaries in conflict-affected areas.',
    'تدخل طارئ للمياه والصرف الصحي يوفر الوصول إلى المياه النظيفة ومرافق الصرف الصحي لـ 50,000 مستفيد في المناطق المتأثرة بالنزاع.',
    '2026-01-01', '2026-12-31', 'active',
    500000, 'USD', 'Sana\'a, Yemen', 'صنعاء، اليمن',
    now, now, userId, 0
  ]);
  console.log('  ✅ Project created: ' + projectCode);
} catch (e) {
  if (e.code === 'ER_DUP_ENTRY') {
    console.log('  ℹ️ Project already exists: ' + projectCode);
  } else {
    throw e;
  }
}

// Get project ID
const [[project]] = await conn.query('SELECT id FROM projects WHERE projectCode = ? AND organizationId = ?', [projectCode, orgId]);
const projectId = project?.id || 1;
console.log('  Project ID: ' + projectId);

// 2. Create Example Grant linked to project
console.log('\n2. Creating Example Grant...');
const grantCode = 'ECHO-YEM-2026-001';
try {
  await conn.query(`
    INSERT INTO grants (
      organizationId, operatingUnitId, projectId, grantCode, title, titleAr,
      donorName, amount, totalBudget, currency, status, startDate, endDate,
      description, descriptionAr, createdAt, updatedAt, createdBy, isDeleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE title = VALUES(title)
  `, [
    orgId, ouId, projectId, grantCode,
    'ECHO Emergency WASH Response Yemen 2026',
    'استجابة ECHO الطارئة للمياه والصرف الصحي اليمن 2026',
    'European Commission Humanitarian Aid (ECHO)',
    500000, 500000, 'USD', 'approved', '2026-01-01', '2026-12-31',
    'Emergency humanitarian response grant for WASH activities in Yemen.',
    'منحة الاستجابة الإنسانية الطارئة لأنشطة المياه والصرف الصحي في اليمن.',
    now, now, userId, 0
  ]);
  console.log('  ✅ Grant created: ' + grantCode);
} catch (e) {
  if (e.code === 'ER_DUP_ENTRY') {
    console.log('  ℹ️ Grant already exists: ' + grantCode);
  } else {
    throw e;
  }
}

// Get grant ID
const [[grant]] = await conn.query('SELECT id FROM grants WHERE grantCode = ? AND organizationId = ?', [grantCode, orgId]);
const grantId = grant?.id || 1;

// 3. Create Example HR Employee
console.log('\n3. Creating Example HR Employee...');
try {
  await conn.query(`
    INSERT INTO hr_employees (
      organizationId, operatingUnitId, employeeCode, firstName, lastName,
      firstNameAr, lastNameAr, email, phone, department, position, positionAr,
      employmentType, hireDate, status, createdAt, updatedAt, createdBy, isDeleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    orgId, ouId, 'EMP-001',
    'Ahmed', 'Al-Rashid',
    'أحمد', 'الراشد',
    'ahmed.rashid@efadah.org', '+967-777-123456',
    'WASH', 'Project Manager', 'مدير المشروع',
    'full_time', '2024-01-15', 'active',
    now, now, userId, 0
  ]);
  console.log('  ✅ Employee created: Ahmed Al-Rashid (EMP-001)');
} catch (e) {
  if (e.code === 'ER_DUP_ENTRY') {
    console.log('  ℹ️ Employee already exists: EMP-001');
  } else {
    console.log('  ⚠️ HR Employee error: ' + e.message);
  }
}

// 4. Create Example Supplier
console.log('\n4. Creating Example Supplier...');
try {
  await conn.query(`
    INSERT INTO suppliers (
      organizationId, supplierCode, name, nameAr, contactPerson, email, phone,
      address, city, country, category, status, createdAt, updatedAt, createdBy, isDeleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    orgId, 'SUP-001',
    'Yemen Water Equipment Co.', 'شركة معدات المياه اليمنية',
    'Mohammed Ali', 'sales@ywe.ye', '+967-1-234567',
    'Industrial Area, Street 15', 'Sana\'a', 'Yemen',
    'goods', 'active',
    now, now, userId, 0
  ]);
  console.log('  ✅ Supplier created: Yemen Water Equipment Co. (SUP-001)');
} catch (e) {
  if (e.code === 'ER_DUP_ENTRY') {
    console.log('  ℹ️ Supplier already exists: SUP-001');
  } else {
    console.log('  ⚠️ Supplier error: ' + e.message);
  }
}

// 5. Create Example Purchase Request
console.log('\n5. Creating Example Purchase Request...');
try {
  await conn.query(`
    INSERT INTO purchase_requests (
      organizationId, operatingUnitId, requestNumber, title, titleAr,
      description, requestDate, requiredDate, requesterId, projectId, grantId,
      totalAmount, currency, priority, status, createdAt, updatedAt, createdBy, isDeleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    orgId, ouId, 'PR-2026-001',
    'Water Pumps and Pipes for WASH Project',
    'مضخات المياه والأنابيب لمشروع المياه والصرف الصحي',
    'Procurement of water pumps and HDPE pipes for emergency water distribution.',
    today, '2026-02-15', userId, projectId, grantId,
    25000, 'USD', 'high', 'pending',
    now, now, userId, 0
  ]);
  console.log('  ✅ Purchase Request created: PR-2026-001');
} catch (e) {
  if (e.code === 'ER_DUP_ENTRY') {
    console.log('  ℹ️ Purchase Request already exists: PR-2026-001');
  } else {
    console.log('  ⚠️ Purchase Request error: ' + e.message);
  }
}

// 6. Create Example Stock Item
console.log('\n6. Creating Example Stock Item...');
try {
  await conn.query(`
    INSERT INTO stock_items (
      organizationId, operatingUnitId, itemCode, name, nameAr,
      description, category, unit, currentQuantity, minimumQuantity,
      unitCost, currency, location, status, createdAt, updatedAt, createdBy, isDeleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    orgId, ouId, 'STK-001',
    'Water Purification Tablets', 'أقراص تنقية المياه',
    'Chlorine-based water purification tablets for emergency use.',
    'WASH Supplies', 'Box', 500, 100,
    15.00, 'USD', 'Warehouse A', 'active',
    now, now, userId, 0
  ]);
  console.log('  ✅ Stock Item created: Water Purification Tablets (STK-001)');
} catch (e) {
  if (e.code === 'ER_DUP_ENTRY') {
    console.log('  ℹ️ Stock Item already exists: STK-001');
  } else {
    console.log('  ⚠️ Stock Item error: ' + e.message);
  }
}

// 7. Create Example Vehicle
console.log('\n7. Creating Example Vehicle...');
try {
  await conn.query(`
    INSERT INTO vehicles (
      organizationId, operatingUnitId, vehicleCode, plateNumber, make, model,
      year, color, vehicleType, fuelType, mileage, status,
      createdAt, updatedAt, createdBy, isDeleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    orgId, ouId, 'VEH-001', 'YEM-12345',
    'Toyota', 'Land Cruiser', 2023, 'White',
    'suv', 'diesel', 15000, 'active',
    now, now, userId, 0
  ]);
  console.log('  ✅ Vehicle created: Toyota Land Cruiser (VEH-001)');
} catch (e) {
  if (e.code === 'ER_DUP_ENTRY') {
    console.log('  ℹ️ Vehicle already exists: VEH-001');
  } else {
    console.log('  ⚠️ Vehicle error: ' + e.message);
  }
}

// 8. Create Example Driver
console.log('\n8. Creating Example Driver...');
try {
  await conn.query(`
    INSERT INTO drivers (
      organizationId, operatingUnitId, driverCode, firstName, lastName,
      firstNameAr, lastNameAr, phone, licenseNumber, licenseType,
      licenseExpiryDate, status, createdAt, updatedAt, createdBy, isDeleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    orgId, ouId, 'DRV-001',
    'Khalid', 'Hassan',
    'خالد', 'حسن',
    '+967-777-654321', 'LIC-2024-12345', 'Heavy',
    '2027-06-30', 'active',
    now, now, userId, 0
  ]);
  console.log('  ✅ Driver created: Khalid Hassan (DRV-001)');
} catch (e) {
  if (e.code === 'ER_DUP_ENTRY') {
    console.log('  ℹ️ Driver already exists: DRV-001');
  } else {
    console.log('  ⚠️ Driver error: ' + e.message);
  }
}

// 9. Create Example Finance Record (Bank Account)
console.log('\n9. Creating Example Bank Account...');
try {
  await conn.query(`
    INSERT INTO finance_bank_accounts (
      organizationId, operatingUnitId, accountCode, accountName, accountNameAr,
      bankName, bankNameAr, accountNumber, currency, accountType, status,
      createdAt, updatedAt, createdBy, isDeleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    orgId, ouId, 'BA-001',
    'Main Operating Account', 'الحساب التشغيلي الرئيسي',
    'Yemen Commercial Bank', 'البنك التجاري اليمني',
    '1234567890', 'USD', 'operating', 'active',
    now, now, userId, 0
  ]);
  console.log('  ✅ Bank Account created: Main Operating Account (BA-001)');
} catch (e) {
  if (e.code === 'ER_DUP_ENTRY') {
    console.log('  ℹ️ Bank Account already exists: BA-001');
  } else {
    console.log('  ⚠️ Bank Account error: ' + e.message);
  }
}

// 10. Create Example Chart of Account entry
console.log('\n10. Creating Example Chart of Account...');
try {
  await conn.query(`
    INSERT INTO chart_of_accounts (
      organizationId, accountCode, accountNameEn, accountNameAr,
      accountType, isActive, isDeleted, createdAt, updatedAt, createdBy
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE accountNameEn = VALUES(accountNameEn)
  `, [
    orgId, '1000',
    'Assets', 'الأصول',
    'asset', 1, 0, now, now, userId
  ]);
  await conn.query(`
    INSERT INTO chart_of_accounts (
      organizationId, accountCode, accountNameEn, accountNameAr,
      accountType, parentAccountCode, isActive, isDeleted, createdAt, updatedAt, createdBy
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE accountNameEn = VALUES(accountNameEn)
  `, [
    orgId, '1100',
    'Cash and Bank', 'النقد والبنك',
    'asset', '1000', 1, 0, now, now, userId
  ]);
  console.log('  ✅ Chart of Accounts created: Assets (1000), Cash and Bank (1100)');
} catch (e) {
  console.log('  ⚠️ Chart of Accounts error: ' + e.message);
}

console.log('\n=== EXAMPLE PROJECT DATA CREATION COMPLETE ===');
console.log('\nSummary:');
console.log('  Project: ' + projectCode + ' (ID: ' + projectId + ')');
console.log('  Grant: ' + grantCode + ' (ID: ' + grantId + ')');
console.log('  Employee: EMP-001 (Ahmed Al-Rashid)');
console.log('  Supplier: SUP-001 (Yemen Water Equipment Co.)');
console.log('  Purchase Request: PR-2026-001');
console.log('  Stock Item: STK-001 (Water Purification Tablets)');
console.log('  Vehicle: VEH-001 (Toyota Land Cruiser)');
console.log('  Driver: DRV-001 (Khalid Hassan)');
console.log('  Bank Account: BA-001 (Main Operating Account)');
console.log('  Chart of Accounts: 1000 (Assets), 1100 (Cash and Bank)');

await conn.end();
