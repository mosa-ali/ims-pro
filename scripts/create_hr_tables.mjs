import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

console.log('=== CREATING HR MODULE TABLES ===');
console.log('SAFETY: Only CREATE TABLE IF NOT EXISTS - no DROP statements');

const hrTables = [
  {
    name: 'hr_employees',
    sql: `CREATE TABLE IF NOT EXISTS hr_employees (
      id INT(11) AUTO_INCREMENT PRIMARY KEY,
      organizationId INT(11) NOT NULL,
      operatingUnitId INT(11) NULL,
      employeeCode VARCHAR(50) NOT NULL,
      firstName VARCHAR(100) NOT NULL,
      lastName VARCHAR(100) NOT NULL,
      firstNameAr VARCHAR(100) NULL,
      lastNameAr VARCHAR(100) NULL,
      email VARCHAR(320) NULL,
      phone VARCHAR(50) NULL,
      dateOfBirth DATE NULL,
      gender ENUM('male', 'female', 'other') NULL,
      nationality VARCHAR(100) NULL,
      nationalId VARCHAR(100) NULL,
      passportNumber VARCHAR(100) NULL,
      employmentType ENUM('full_time', 'part_time', 'contract', 'consultant', 'intern') DEFAULT 'full_time',
      staffCategory ENUM('national', 'international', 'expatriate') DEFAULT 'national',
      department VARCHAR(100) NULL,
      position VARCHAR(100) NULL,
      jobTitle VARCHAR(255) NULL,
      gradeLevel VARCHAR(50) NULL,
      reportingTo INT(11) NULL,
      hireDate DATE NULL,
      contractStartDate DATE NULL,
      contractEndDate DATE NULL,
      probationEndDate DATE NULL,
      terminationDate DATE NULL,
      status ENUM('active', 'on_leave', 'suspended', 'terminated', 'resigned') DEFAULT 'active' NOT NULL,
      address TEXT NULL,
      city VARCHAR(100) NULL,
      country VARCHAR(100) NULL,
      emergencyContactName VARCHAR(200) NULL,
      emergencyContactPhone VARCHAR(50) NULL,
      emergencyContactRelation VARCHAR(100) NULL,
      bankName VARCHAR(200) NULL,
      bankAccountNumber VARCHAR(100) NULL,
      bankIban VARCHAR(50) NULL,
      photoUrl TEXT NULL,
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
    name: 'hr_salary_grades',
    sql: `CREATE TABLE IF NOT EXISTS hr_salary_grades (
      id INT(11) AUTO_INCREMENT PRIMARY KEY,
      organizationId INT(11) NOT NULL,
      gradeCode VARCHAR(50) NOT NULL,
      gradeName VARCHAR(100) NOT NULL,
      gradeNameAr VARCHAR(100) NULL,
      minSalary DECIMAL(15,2) NOT NULL,
      maxSalary DECIMAL(15,2) NOT NULL,
      currency VARCHAR(10) DEFAULT 'USD',
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
    name: 'hr_salary_scale',
    sql: `CREATE TABLE IF NOT EXISTS hr_salary_scale (
      id INT(11) AUTO_INCREMENT PRIMARY KEY,
      organizationId INT(11) NOT NULL,
      gradeId INT(11) NOT NULL,
      step INT(11) NOT NULL,
      baseSalary DECIMAL(15,2) NOT NULL,
      allowances DECIMAL(15,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'USD',
      effectiveDate DATE NOT NULL,
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
    name: 'hr_attendance_records',
    sql: `CREATE TABLE IF NOT EXISTS hr_attendance_records (
      id INT(11) AUTO_INCREMENT PRIMARY KEY,
      organizationId INT(11) NOT NULL,
      operatingUnitId INT(11) NULL,
      employeeId INT(11) NOT NULL,
      date DATE NOT NULL,
      checkIn TIMESTAMP NULL,
      checkOut TIMESTAMP NULL,
      status ENUM('present', 'absent', 'late', 'half_day', 'on_leave', 'holiday', 'weekend') DEFAULT 'present' NOT NULL,
      workHours DECIMAL(5,2) NULL,
      overtimeHours DECIMAL(5,2) DEFAULT 0,
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
    name: 'hr_leave_balances',
    sql: `CREATE TABLE IF NOT EXISTS hr_leave_balances (
      id INT(11) AUTO_INCREMENT PRIMARY KEY,
      organizationId INT(11) NOT NULL,
      employeeId INT(11) NOT NULL,
      leaveType ENUM('annual', 'sick', 'maternity', 'paternity', 'unpaid', 'compassionate', 'study', 'other') NOT NULL,
      year INT(11) NOT NULL,
      entitlement DECIMAL(5,2) NOT NULL,
      used DECIMAL(5,2) DEFAULT 0,
      pending DECIMAL(5,2) DEFAULT 0,
      carriedOver DECIMAL(5,2) DEFAULT 0,
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
    name: 'hr_leave_requests',
    sql: `CREATE TABLE IF NOT EXISTS hr_leave_requests (
      id INT(11) AUTO_INCREMENT PRIMARY KEY,
      organizationId INT(11) NOT NULL,
      operatingUnitId INT(11) NULL,
      employeeId INT(11) NOT NULL,
      leaveType ENUM('annual', 'sick', 'maternity', 'paternity', 'unpaid', 'compassionate', 'study', 'other') NOT NULL,
      startDate DATE NOT NULL,
      endDate DATE NOT NULL,
      days DECIMAL(5,2) NOT NULL,
      reason TEXT NULL,
      status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending' NOT NULL,
      approvedBy INT(11) NULL,
      approvedAt TIMESTAMP NULL,
      rejectionReason TEXT NULL,
      attachmentUrl TEXT NULL,
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
    name: 'hr_payroll_records',
    sql: `CREATE TABLE IF NOT EXISTS hr_payroll_records (
      id INT(11) AUTO_INCREMENT PRIMARY KEY,
      organizationId INT(11) NOT NULL,
      operatingUnitId INT(11) NULL,
      employeeId INT(11) NOT NULL,
      month INT(11) NOT NULL,
      year INT(11) NOT NULL,
      baseSalary DECIMAL(15,2) NOT NULL,
      allowances DECIMAL(15,2) DEFAULT 0,
      deductions DECIMAL(15,2) DEFAULT 0,
      overtime DECIMAL(15,2) DEFAULT 0,
      bonus DECIMAL(15,2) DEFAULT 0,
      netSalary DECIMAL(15,2) NOT NULL,
      currency VARCHAR(10) DEFAULT 'USD',
      status ENUM('draft', 'pending', 'approved', 'paid') DEFAULT 'draft' NOT NULL,
      paymentDate DATE NULL,
      paymentMethod ENUM('bank_transfer', 'cash', 'check') NULL,
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
    name: 'hr_documents',
    sql: `CREATE TABLE IF NOT EXISTS hr_documents (
      id INT(11) AUTO_INCREMENT PRIMARY KEY,
      organizationId INT(11) NOT NULL,
      employeeId INT(11) NOT NULL,
      documentType ENUM('contract', 'id_card', 'passport', 'visa', 'work_permit', 'certificate', 'evaluation', 'warning', 'other') NOT NULL,
      title VARCHAR(255) NOT NULL,
      titleAr VARCHAR(255) NULL,
      description TEXT NULL,
      fileUrl TEXT NOT NULL,
      fileName VARCHAR(255) NULL,
      fileSize INT(11) NULL,
      mimeType VARCHAR(100) NULL,
      expiryDate DATE NULL,
      isConfidential TINYINT(1) DEFAULT 0,
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
    name: 'hr_annual_plans',
    sql: `CREATE TABLE IF NOT EXISTS hr_annual_plans (
      id INT(11) AUTO_INCREMENT PRIMARY KEY,
      organizationId INT(11) NOT NULL,
      operatingUnitId INT(11) NULL,
      year INT(11) NOT NULL,
      title VARCHAR(255) NOT NULL,
      titleAr VARCHAR(255) NULL,
      description TEXT NULL,
      status ENUM('draft', 'approved', 'in_progress', 'completed') DEFAULT 'draft' NOT NULL,
      plannedHeadcount INT(11) NULL,
      actualHeadcount INT(11) NULL,
      plannedBudget DECIMAL(15,2) NULL,
      actualBudget DECIMAL(15,2) NULL,
      currency VARCHAR(10) DEFAULT 'USD',
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
    name: 'hr_recruitment_jobs',
    sql: `CREATE TABLE IF NOT EXISTS hr_recruitment_jobs (
      id INT(11) AUTO_INCREMENT PRIMARY KEY,
      organizationId INT(11) NOT NULL,
      operatingUnitId INT(11) NULL,
      jobTitle VARCHAR(255) NOT NULL,
      jobTitleAr VARCHAR(255) NULL,
      department VARCHAR(100) NULL,
      location VARCHAR(255) NULL,
      employmentType ENUM('full_time', 'part_time', 'contract', 'consultant', 'intern') DEFAULT 'full_time',
      description TEXT NULL,
      descriptionAr TEXT NULL,
      requirements TEXT NULL,
      requirementsAr TEXT NULL,
      salaryMin DECIMAL(15,2) NULL,
      salaryMax DECIMAL(15,2) NULL,
      currency VARCHAR(10) DEFAULT 'USD',
      openings INT(11) DEFAULT 1,
      status ENUM('draft', 'open', 'on_hold', 'closed', 'filled') DEFAULT 'draft' NOT NULL,
      publishDate DATE NULL,
      closingDate DATE NULL,
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
    name: 'hr_recruitment_candidates',
    sql: `CREATE TABLE IF NOT EXISTS hr_recruitment_candidates (
      id INT(11) AUTO_INCREMENT PRIMARY KEY,
      organizationId INT(11) NOT NULL,
      jobId INT(11) NOT NULL,
      firstName VARCHAR(100) NOT NULL,
      lastName VARCHAR(100) NOT NULL,
      email VARCHAR(320) NOT NULL,
      phone VARCHAR(50) NULL,
      resumeUrl TEXT NULL,
      coverLetterUrl TEXT NULL,
      source ENUM('website', 'referral', 'linkedin', 'job_board', 'agency', 'other') NULL,
      status ENUM('new', 'screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn') DEFAULT 'new' NOT NULL,
      rating INT(11) NULL,
      notes TEXT NULL,
      interviewDate TIMESTAMP NULL,
      interviewNotes TEXT NULL,
      offerAmount DECIMAL(15,2) NULL,
      offerDate DATE NULL,
      hireDate DATE NULL,
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
    name: 'hr_sanctions',
    sql: `CREATE TABLE IF NOT EXISTS hr_sanctions (
      id INT(11) AUTO_INCREMENT PRIMARY KEY,
      organizationId INT(11) NOT NULL,
      employeeId INT(11) NOT NULL,
      sanctionType ENUM('verbal_warning', 'written_warning', 'suspension', 'demotion', 'termination', 'other') NOT NULL,
      reason TEXT NOT NULL,
      reasonAr TEXT NULL,
      issueDate DATE NOT NULL,
      effectiveDate DATE NULL,
      expiryDate DATE NULL,
      status ENUM('active', 'expired', 'revoked') DEFAULT 'active' NOT NULL,
      issuedBy INT(11) NOT NULL,
      documentUrl TEXT NULL,
      notes TEXT NULL,
      isDeleted TINYINT(1) DEFAULT 0 NOT NULL,
      deletedAt TIMESTAMP NULL,
      deletedBy INT(11) NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
      createdBy INT(11) NULL,
      updatedBy INT(11) NULL
    )`
  }
];

for (const table of hrTables) {
  console.log(`Creating ${table.name}...`);
  try {
    await conn.query(table.sql);
    console.log(`  ✅ ${table.name} created`);
  } catch (err) {
    console.log(`  ⚠️ ${table.name} error: ${err.message}`);
  }
}

console.log('\n=== VERIFYING HR TABLES ===');
for (const table of hrTables) {
  try {
    await conn.query('SELECT 1 FROM `' + table.name + '` LIMIT 1');
    console.log(`  ✅ ${table.name} exists`);
  } catch (e) {
    console.log(`  ❌ ${table.name} does NOT exist`);
  }
}

console.log('\n=== HR TABLES MIGRATION COMPLETE ===');
await conn.end();
