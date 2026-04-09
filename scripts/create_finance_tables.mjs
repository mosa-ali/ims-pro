import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

console.log('=== CREATING FINANCE MODULE TABLES ===');
console.log('SAFETY: Only CREATE TABLE IF NOT EXISTS - no DROP statements');

const financeTables = [
  {
    name: 'finance_currencies',
    sql: `CREATE TABLE IF NOT EXISTS finance_currencies (
      id INT(11) AUTO_INCREMENT PRIMARY KEY,
      organizationId INT(11) NOT NULL,
      code VARCHAR(10) NOT NULL,
      name VARCHAR(100) NOT NULL,
      nameAr VARCHAR(100) NULL,
      symbol VARCHAR(10) NULL,
      isBaseCurrency TINYINT(1) DEFAULT 0,
      isActive TINYINT(1) DEFAULT 1 NOT NULL,
      decimalPlaces INT(11) DEFAULT 2,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
      createdBy INT(11) NULL,
      updatedBy INT(11) NULL
    )`
  },
  {
    name: 'finance_exchange_rates',
    sql: `CREATE TABLE IF NOT EXISTS finance_exchange_rates (
      id INT(11) AUTO_INCREMENT PRIMARY KEY,
      organizationId INT(11) NOT NULL,
      fromCurrency VARCHAR(10) NOT NULL,
      toCurrency VARCHAR(10) NOT NULL,
      rate DECIMAL(15,6) NOT NULL,
      effectiveDate DATE NOT NULL,
      expiryDate DATE NULL,
      source VARCHAR(100) NULL,
      isActive TINYINT(1) DEFAULT 1 NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
      createdBy INT(11) NULL,
      updatedBy INT(11) NULL
    )`
  },
  {
    name: 'finance_fiscal_years',
    sql: `CREATE TABLE IF NOT EXISTS finance_fiscal_years (
      id INT(11) AUTO_INCREMENT PRIMARY KEY,
      organizationId INT(11) NOT NULL,
      name VARCHAR(100) NOT NULL,
      nameAr VARCHAR(100) NULL,
      startDate DATE NOT NULL,
      endDate DATE NOT NULL,
      status ENUM('draft', 'open', 'closed', 'locked') DEFAULT 'draft' NOT NULL,
      isCurrent TINYINT(1) DEFAULT 0,
      closedAt TIMESTAMP NULL,
      closedBy INT(11) NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
      createdBy INT(11) NULL,
      updatedBy INT(11) NULL
    )`
  },
  {
    name: 'finance_bank_accounts',
    sql: `CREATE TABLE IF NOT EXISTS finance_bank_accounts (
      id INT(11) AUTO_INCREMENT PRIMARY KEY,
      organizationId INT(11) NOT NULL,
      operatingUnitId INT(11) NULL,
      accountName VARCHAR(255) NOT NULL,
      accountNameAr VARCHAR(255) NULL,
      accountNumber VARCHAR(100) NOT NULL,
      bankName VARCHAR(255) NOT NULL,
      bankNameAr VARCHAR(255) NULL,
      branchName VARCHAR(255) NULL,
      branchCode VARCHAR(50) NULL,
      swiftCode VARCHAR(20) NULL,
      iban VARCHAR(50) NULL,
      currency VARCHAR(10) DEFAULT 'USD',
      accountType ENUM('checking', 'savings', 'money_market', 'petty_cash') DEFAULT 'checking',
      currentBalance DECIMAL(15,2) DEFAULT 0,
      openingBalance DECIMAL(15,2) DEFAULT 0,
      openingDate DATE NULL,
      status ENUM('active', 'inactive', 'closed') DEFAULT 'active' NOT NULL,
      chartOfAccountId INT(11) NULL,
      isDeleted TINYINT(1) DEFAULT 0 NOT NULL,
      deletedAt TIMESTAMP NULL,
      deletedBy INT(11) NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
      createdBy INT(11) NULL,
      updatedBy INT(11) NULL
    )`
  },
  {
    name: 'finance_budget_categories',
    sql: `CREATE TABLE IF NOT EXISTS finance_budget_categories (
      id INT(11) AUTO_INCREMENT PRIMARY KEY,
      organizationId INT(11) NOT NULL,
      code VARCHAR(50) NOT NULL,
      name VARCHAR(255) NOT NULL,
      nameAr VARCHAR(255) NULL,
      parentId INT(11) NULL,
      level INT(11) DEFAULT 1,
      categoryType ENUM('income', 'expense', 'asset', 'liability') NOT NULL,
      chartOfAccountId INT(11) NULL,
      description TEXT NULL,
      descriptionAr TEXT NULL,
      isActive TINYINT(1) DEFAULT 1 NOT NULL,
      isDeleted TINYINT(1) DEFAULT 0 NOT NULL,
      deletedAt TIMESTAMP NULL,
      deletedBy INT(11) NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
      createdBy INT(11) NULL,
      updatedBy INT(11) NULL
    )`
  },
  {
    name: 'finance_fund_balances',
    sql: `CREATE TABLE IF NOT EXISTS finance_fund_balances (
      id INT(11) AUTO_INCREMENT PRIMARY KEY,
      organizationId INT(11) NOT NULL,
      operatingUnitId INT(11) NULL,
      grantId INT(11) NULL,
      projectId INT(11) NULL,
      budgetCategoryId INT(11) NULL,
      fiscalYearId INT(11) NULL,
      budgetedAmount DECIMAL(15,2) DEFAULT 0,
      actualAmount DECIMAL(15,2) DEFAULT 0,
      committedAmount DECIMAL(15,2) DEFAULT 0,
      availableAmount DECIMAL(15,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'USD',
      asOfDate DATE NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
      createdBy INT(11) NULL,
      updatedBy INT(11) NULL
    )`
  },
  {
    name: 'finance_cash_transactions',
    sql: `CREATE TABLE IF NOT EXISTS finance_cash_transactions (
      id INT(11) AUTO_INCREMENT PRIMARY KEY,
      organizationId INT(11) NOT NULL,
      operatingUnitId INT(11) NULL,
      bankAccountId INT(11) NOT NULL,
      transactionType ENUM('deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'adjustment') NOT NULL,
      transactionNumber VARCHAR(50) NOT NULL,
      transactionDate DATE NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      currency VARCHAR(10) DEFAULT 'USD',
      exchangeRate DECIMAL(15,6) DEFAULT 1,
      amountInBaseCurrency DECIMAL(15,2) NULL,
      description TEXT NULL,
      descriptionAr TEXT NULL,
      reference VARCHAR(255) NULL,
      relatedEntityType ENUM('expense', 'advance', 'payroll', 'vendor_payment', 'other') NULL,
      relatedEntityId INT(11) NULL,
      status ENUM('pending', 'completed', 'cancelled', 'reversed') DEFAULT 'pending' NOT NULL,
      approvedBy INT(11) NULL,
      approvedAt TIMESTAMP NULL,
      isDeleted TINYINT(1) DEFAULT 0 NOT NULL,
      deletedAt TIMESTAMP NULL,
      deletedBy INT(11) NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
      createdBy INT(11) NULL,
      updatedBy INT(11) NULL
    )`
  },
  {
    name: 'finance_advances',
    sql: `CREATE TABLE IF NOT EXISTS finance_advances (
      id INT(11) AUTO_INCREMENT PRIMARY KEY,
      organizationId INT(11) NOT NULL,
      advanceNumber VARCHAR(50) NOT NULL,
      employeeId INT(11) NULL,
      employeeName VARCHAR(255) NOT NULL,
      employeeNameAr VARCHAR(255) NULL,
      department VARCHAR(100) NULL,
      advanceType ENUM('TRAVEL', 'PROJECT', 'OPERATIONAL', 'SALARY', 'OTHER') NOT NULL,
      purpose TEXT NOT NULL,
      purposeAr TEXT NULL,
      requestedAmount DECIMAL(15,2) NOT NULL,
      approvedAmount DECIMAL(15,2) NULL,
      currency VARCHAR(10) DEFAULT 'USD' NOT NULL,
      requestDate TIMESTAMP NOT NULL,
      expectedSettlementDate TIMESTAMP NULL,
      actualSettlementDate TIMESTAMP NULL,
      status ENUM('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PARTIALLY_SETTLED', 'FULLY_SETTLED', 'CANCELLED') DEFAULT 'DRAFT' NOT NULL,
      approvedBy INT(11) NULL,
      approvedAt TIMESTAMP NULL,
      rejectionReason TEXT NULL,
      projectId INT(11) NULL,
      grantId INT(11) NULL,
      budgetLineId INT(11) NULL,
      attachmentUrl TEXT NULL,
      notes TEXT NULL,
      notesAr TEXT NULL,
      isDeleted TINYINT(1) DEFAULT 0 NOT NULL,
      deletedAt TIMESTAMP NULL,
      deletedBy INT(11) NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
      createdBy INT(11) NULL,
      updatedBy INT(11) NULL
    )`
  },
  {
    name: 'finance_settlements',
    sql: `CREATE TABLE IF NOT EXISTS finance_settlements (
      id INT(11) AUTO_INCREMENT PRIMARY KEY,
      organizationId INT(11) NOT NULL,
      advanceId INT(11) NOT NULL,
      settlementNumber VARCHAR(50) NOT NULL,
      settlementDate TIMESTAMP NOT NULL,
      settledAmount DECIMAL(15,2) NOT NULL,
      returnedAmount DECIMAL(15,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'USD' NOT NULL,
      status ENUM('DRAFT', 'PENDING', 'APPROVED', 'REJECTED') DEFAULT 'DRAFT' NOT NULL,
      approvedBy INT(11) NULL,
      approvedAt TIMESTAMP NULL,
      rejectionReason TEXT NULL,
      attachmentUrl TEXT NULL,
      notes TEXT NULL,
      notesAr TEXT NULL,
      isDeleted TINYINT(1) DEFAULT 0 NOT NULL,
      deletedAt TIMESTAMP NULL,
      deletedBy INT(11) NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
      createdBy INT(11) NULL,
      updatedBy INT(11) NULL
    )`
  },
  {
    name: 'finance_approval_thresholds',
    sql: `CREATE TABLE IF NOT EXISTS finance_approval_thresholds (
      id INT(11) AUTO_INCREMENT PRIMARY KEY,
      organizationId INT(11) NOT NULL,
      transactionType ENUM('expense', 'advance', 'purchase_request', 'purchase_order', 'payment') NOT NULL,
      minAmount DECIMAL(15,2) NOT NULL,
      maxAmount DECIMAL(15,2) NULL,
      currency VARCHAR(10) DEFAULT 'USD',
      requiredApproverRole VARCHAR(100) NOT NULL,
      requiresMultipleApprovers TINYINT(1) DEFAULT 0,
      numberOfApprovers INT(11) DEFAULT 1,
      isActive TINYINT(1) DEFAULT 1 NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
      createdBy INT(11) NULL,
      updatedBy INT(11) NULL
    )`
  },
  {
    name: 'finance_asset_categories',
    sql: `CREATE TABLE IF NOT EXISTS finance_asset_categories (
      id INT(11) AUTO_INCREMENT PRIMARY KEY,
      organizationId INT(11) NOT NULL,
      code VARCHAR(50) NOT NULL,
      name VARCHAR(255) NOT NULL,
      nameAr VARCHAR(255) NULL,
      parentId INT(11) NULL,
      depreciationMethod ENUM('straight_line', 'declining_balance', 'units_of_production', 'none') DEFAULT 'straight_line',
      usefulLifeYears INT(11) NULL,
      salvageValuePercent DECIMAL(5,2) DEFAULT 0,
      chartOfAccountId INT(11) NULL,
      depreciationAccountId INT(11) NULL,
      description TEXT NULL,
      isActive TINYINT(1) DEFAULT 1 NOT NULL,
      isDeleted TINYINT(1) DEFAULT 0 NOT NULL,
      deletedAt TIMESTAMP NULL,
      deletedBy INT(11) NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
      createdBy INT(11) NULL,
      updatedBy INT(11) NULL
    )`
  },
  {
    name: 'finance_assets',
    sql: `CREATE TABLE IF NOT EXISTS finance_assets (
      id INT(11) AUTO_INCREMENT PRIMARY KEY,
      organizationId INT(11) NOT NULL,
      operatingUnitId INT(11) NULL,
      categoryId INT(11) NOT NULL,
      assetCode VARCHAR(50) NOT NULL,
      name VARCHAR(255) NOT NULL,
      nameAr VARCHAR(255) NULL,
      description TEXT NULL,
      descriptionAr TEXT NULL,
      serialNumber VARCHAR(100) NULL,
      manufacturer VARCHAR(255) NULL,
      model VARCHAR(255) NULL,
      purchaseDate DATE NULL,
      purchasePrice DECIMAL(15,2) NULL,
      currency VARCHAR(10) DEFAULT 'USD',
      currentValue DECIMAL(15,2) NULL,
      accumulatedDepreciation DECIMAL(15,2) DEFAULT 0,
      location VARCHAR(255) NULL,
      assignedTo INT(11) NULL,
      status ENUM('active', 'in_maintenance', 'disposed', 'lost', 'stolen') DEFAULT 'active' NOT NULL,
      warrantyExpiryDate DATE NULL,
      lastMaintenanceDate DATE NULL,
      nextMaintenanceDate DATE NULL,
      projectId INT(11) NULL,
      grantId INT(11) NULL,
      photoUrl TEXT NULL,
      isDeleted TINYINT(1) DEFAULT 0 NOT NULL,
      deletedAt TIMESTAMP NULL,
      deletedBy INT(11) NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
      createdBy INT(11) NULL,
      updatedBy INT(11) NULL
    )`
  },
  {
    name: 'finance_asset_maintenance',
    sql: `CREATE TABLE IF NOT EXISTS finance_asset_maintenance (
      id INT(11) AUTO_INCREMENT PRIMARY KEY,
      organizationId INT(11) NOT NULL,
      assetId INT(11) NOT NULL,
      maintenanceType ENUM('preventive', 'corrective', 'emergency') NOT NULL,
      description TEXT NOT NULL,
      descriptionAr TEXT NULL,
      scheduledDate DATE NULL,
      completedDate DATE NULL,
      cost DECIMAL(15,2) NULL,
      currency VARCHAR(10) DEFAULT 'USD',
      vendorName VARCHAR(255) NULL,
      status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled' NOT NULL,
      notes TEXT NULL,
      isDeleted TINYINT(1) DEFAULT 0 NOT NULL,
      deletedAt TIMESTAMP NULL,
      deletedBy INT(11) NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
      createdBy INT(11) NULL,
      updatedBy INT(11) NULL
    )`
  },
  {
    name: 'finance_asset_transfers',
    sql: `CREATE TABLE IF NOT EXISTS finance_asset_transfers (
      id INT(11) AUTO_INCREMENT PRIMARY KEY,
      organizationId INT(11) NOT NULL,
      assetId INT(11) NOT NULL,
      transferNumber VARCHAR(50) NOT NULL,
      fromOperatingUnitId INT(11) NULL,
      toOperatingUnitId INT(11) NULL,
      fromLocation VARCHAR(255) NULL,
      toLocation VARCHAR(255) NULL,
      fromAssignee INT(11) NULL,
      toAssignee INT(11) NULL,
      transferDate DATE NOT NULL,
      reason TEXT NULL,
      status ENUM('pending', 'approved', 'completed', 'rejected') DEFAULT 'pending' NOT NULL,
      approvedBy INT(11) NULL,
      approvedAt TIMESTAMP NULL,
      isDeleted TINYINT(1) DEFAULT 0 NOT NULL,
      deletedAt TIMESTAMP NULL,
      deletedBy INT(11) NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
      createdBy INT(11) NULL,
      updatedBy INT(11) NULL
    )`
  },
  {
    name: 'finance_asset_disposals',
    sql: `CREATE TABLE IF NOT EXISTS finance_asset_disposals (
      id INT(11) AUTO_INCREMENT PRIMARY KEY,
      organizationId INT(11) NOT NULL,
      assetId INT(11) NOT NULL,
      disposalNumber VARCHAR(50) NOT NULL,
      disposalDate DATE NOT NULL,
      disposalMethod ENUM('sale', 'donation', 'scrap', 'theft', 'loss', 'other') NOT NULL,
      disposalReason TEXT NULL,
      saleAmount DECIMAL(15,2) NULL,
      currency VARCHAR(10) DEFAULT 'USD',
      buyerName VARCHAR(255) NULL,
      bookValue DECIMAL(15,2) NULL,
      gainLoss DECIMAL(15,2) NULL,
      status ENUM('pending', 'approved', 'completed', 'rejected') DEFAULT 'pending' NOT NULL,
      approvedBy INT(11) NULL,
      approvedAt TIMESTAMP NULL,
      attachmentUrl TEXT NULL,
      notes TEXT NULL,
      isDeleted TINYINT(1) DEFAULT 0 NOT NULL,
      deletedAt TIMESTAMP NULL,
      deletedBy INT(11) NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
      createdBy INT(11) NULL,
      updatedBy INT(11) NULL
    )`
  },
  {
    name: 'finance_roles',
    sql: `CREATE TABLE IF NOT EXISTS finance_roles (
      id INT(11) AUTO_INCREMENT PRIMARY KEY,
      organizationId INT(11) NOT NULL,
      name VARCHAR(100) NOT NULL,
      nameAr VARCHAR(100) NULL,
      description TEXT NULL,
      isSystemRole TINYINT(1) DEFAULT 0,
      isActive TINYINT(1) DEFAULT 1 NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
      createdBy INT(11) NULL,
      updatedBy INT(11) NULL
    )`
  },
  {
    name: 'finance_permissions',
    sql: `CREATE TABLE IF NOT EXISTS finance_permissions (
      id INT(11) AUTO_INCREMENT PRIMARY KEY,
      organizationId INT(11) NOT NULL,
      code VARCHAR(100) NOT NULL,
      name VARCHAR(255) NOT NULL,
      nameAr VARCHAR(255) NULL,
      module VARCHAR(100) NOT NULL,
      description TEXT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
    )`
  },
  {
    name: 'finance_role_permissions',
    sql: `CREATE TABLE IF NOT EXISTS finance_role_permissions (
      id INT(11) AUTO_INCREMENT PRIMARY KEY,
      roleId INT(11) NOT NULL,
      permissionId INT(11) NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      UNIQUE KEY unique_role_permission (roleId, permissionId)
    )`
  },
  {
    name: 'finance_user_roles',
    sql: `CREATE TABLE IF NOT EXISTS finance_user_roles (
      id INT(11) AUTO_INCREMENT PRIMARY KEY,
      userId INT(11) NOT NULL,
      roleId INT(11) NOT NULL,
      organizationId INT(11) NOT NULL,
      operatingUnitId INT(11) NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      UNIQUE KEY unique_user_role_org (userId, roleId, organizationId)
    )`
  }
];

for (const table of financeTables) {
  console.log(`Creating ${table.name}...`);
  try {
    await conn.query(table.sql);
    console.log(`  ✅ ${table.name} created`);
  } catch (err) {
    console.log(`  ⚠️ ${table.name} error: ${err.message}`);
  }
}

console.log('\n=== VERIFYING FINANCE TABLES ===');
for (const table of financeTables) {
  try {
    await conn.query('SELECT 1 FROM `' + table.name + '` LIMIT 1');
    console.log(`  ✅ ${table.name} exists`);
  } catch (e) {
    console.log(`  ❌ ${table.name} does NOT exist`);
  }
}

console.log('\n=== FINANCE TABLES MIGRATION COMPLETE ===');
await conn.end();
