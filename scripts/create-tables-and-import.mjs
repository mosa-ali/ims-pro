import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env') });

// Table creation SQL statements based on Drizzle schema
const createTableStatements = [
  // Core tables first (no dependencies)
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    openId VARCHAR(64) NOT NULL UNIQUE,
    name TEXT,
    email VARCHAR(320),
    loginMethod VARCHAR(64),
    role ENUM('platform_admin', 'organization_admin', 'user', 'admin', 'manager') NOT NULL DEFAULT 'user',
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    lastSignedIn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    organizationId INT,
    currentOrganizationId INT,
    languagePreference VARCHAR(10)
  )`,
  
  `CREATE TABLE IF NOT EXISTS globalSettings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    defaultLanguage VARCHAR(10) NOT NULL DEFAULT 'en',
    defaultTimezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
    defaultCurrency VARCHAR(10) NOT NULL DEFAULT 'USD',
    environmentLabel ENUM('production', 'staging', 'test') NOT NULL DEFAULT 'production',
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updatedBy INT
  )`,
  
  `CREATE TABLE IF NOT EXISTS organizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    organizationCode VARCHAR(50) UNIQUE,
    shortCode VARCHAR(20),
    tenantId VARCHAR(36),
    primaryAdminId INT,
    secondaryAdminId INT,
    domain VARCHAR(255),
    status ENUM('active', 'suspended', 'inactive') NOT NULL DEFAULT 'active',
    country VARCHAR(100),
    timezone VARCHAR(100) DEFAULT 'UTC',
    currency VARCHAR(10) DEFAULT 'USD',
    isDeleted BOOLEAN NOT NULL DEFAULT FALSE,
    deletedAt TIMESTAMP NULL,
    deletedBy INT,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  
  `CREATE TABLE IF NOT EXISTS operating_units (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organizationId INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    type ENUM('hq', 'country', 'regional', 'field') NOT NULL,
    country VARCHAR(100),
    city VARCHAR(100),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(320),
    timezone VARCHAR(100) DEFAULT 'UTC',
    currency VARCHAR(10) DEFAULT 'USD',
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    isDeleted BOOLEAN NOT NULL DEFAULT FALSE,
    deletedAt TIMESTAMP NULL,
    deletedBy INT,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  
  `CREATE TABLE IF NOT EXISTS user_organizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    organizationId INT NOT NULL,
    role ENUM('admin', 'manager', 'user') NOT NULL DEFAULT 'user',
    isDefault BOOLEAN NOT NULL DEFAULT FALSE,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  
  `CREATE TABLE IF NOT EXISTS user_operating_units (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    operatingUnitId INT NOT NULL,
    role ENUM('admin', 'manager', 'user') NOT NULL DEFAULT 'user',
    isDefault BOOLEAN NOT NULL DEFAULT FALSE,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  
  `CREATE TABLE IF NOT EXISTS organization_branding (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organizationId INT NOT NULL UNIQUE,
    logoUrl TEXT,
    faviconUrl TEXT,
    primaryColor VARCHAR(20),
    secondaryColor VARCHAR(20),
    headerText VARCHAR(255),
    footerText TEXT,
    customCss TEXT,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organizationId INT,
    userId INT,
    action VARCHAR(100) NOT NULL,
    entityType VARCHAR(100),
    entityId INT,
    oldValue JSON,
    newValue JSON,
    ipAddress VARCHAR(45),
    userAgent TEXT,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  
  `CREATE TABLE IF NOT EXISTS activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organizationId INT NOT NULL,
    operatingUnitId INT,
    userId INT,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    metadata JSON,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  
  `CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organizationId INT NOT NULL,
    operatingUnitId INT,
    assignedTo INT,
    createdBy INT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
    priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
    dueDate TIMESTAMP NULL,
    completedAt TIMESTAMP NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  
  `CREATE TABLE IF NOT EXISTS import_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organizationId INT NOT NULL,
    userId INT,
    entityType VARCHAR(100) NOT NULL,
    fileName VARCHAR(255),
    totalRows INT DEFAULT 0,
    successRows INT DEFAULT 0,
    errorRows INT DEFAULT 0,
    status ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
    errorLog JSON,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completedAt TIMESTAMP NULL
  )`,
  
  `CREATE TABLE IF NOT EXISTS systemImportReports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organizationId INT NOT NULL,
    importType VARCHAR(100) NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
    totalRecords INT DEFAULT 0,
    processedRecords INT DEFAULT 0,
    errorRecords INT DEFAULT 0,
    errorDetails JSON,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completedAt TIMESTAMP NULL
  )`,
  
  `CREATE TABLE IF NOT EXISTS microsoft_integrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organizationId INT NOT NULL UNIQUE,
    tenantId VARCHAR(100),
    clientId VARCHAR(100),
    clientSecret TEXT,
    refreshToken TEXT,
    accessToken TEXT,
    tokenExpiry TIMESTAMP NULL,
    sharepointSiteId VARCHAR(255),
    sharepointDriveId VARCHAR(255),
    isActive BOOLEAN NOT NULL DEFAULT FALSE,
    lastSyncAt TIMESTAMP NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`
];

async function createTablesAndImport() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('DATABASE_URL not found in environment');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const connection = await mysql.createConnection(connectionString);

  try {
    // Disable foreign key checks for table creation
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
    
    console.log('Creating tables...');
    for (const sql of createTableStatements) {
      const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1] || 'unknown';
      try {
        await connection.execute(sql);
        console.log('  ✓ Created table: ' + tableName);
      } catch (error) {
        console.error('  ✗ Error creating table ' + tableName + ':', error.message);
      }
    }
    
    // Re-enable foreign key checks
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
    
    // Verify tables created
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('\n✅ Created ' + tables.length + ' tables');
    
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

createTablesAndImport().catch(console.error);
