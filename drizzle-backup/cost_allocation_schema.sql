-- Cost Allocation Module Schema
-- Enables distribution of overhead costs across projects based on configurable allocation keys

-- Cost Pools: Define overhead cost categories to be allocated
CREATE TABLE IF NOT EXISTS cost_pools (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organizationId INT NOT NULL,
  operatingUnitId INT,
  poolCode VARCHAR(50) NOT NULL,
  poolName VARCHAR(255) NOT NULL,
  poolNameAr VARCHAR(255),
  description TEXT,
  descriptionAr TEXT,
  poolType ENUM('overhead', 'shared_service', 'administrative', 'facility', 'other') DEFAULT 'overhead',
  glAccountId INT, -- Link to GL account for cost pool
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  createdBy VARCHAR(255),
  updatedBy VARCHAR(255),
  deletedAt TIMESTAMP NULL,
  deletedBy VARCHAR(255),
  UNIQUE KEY unique_pool_code (organizationId, poolCode),
  INDEX idx_organization (organizationId),
  INDEX idx_operating_unit (operatingUnitId)
);

-- Allocation Keys: Define how costs should be distributed
CREATE TABLE IF NOT EXISTS allocation_keys (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organizationId INT NOT NULL,
  keyCode VARCHAR(50) NOT NULL,
  keyName VARCHAR(255) NOT NULL,
  keyNameAr VARCHAR(255),
  keyType ENUM('headcount', 'budget_percentage', 'direct_costs', 'custom', 'equal', 'revenue') DEFAULT 'budget_percentage',
  description TEXT,
  descriptionAr TEXT,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  createdBy VARCHAR(255),
  updatedBy VARCHAR(255),
  UNIQUE KEY unique_key_code (organizationId, keyCode),
  INDEX idx_organization (organizationId)
);

-- Allocation Rules: Map cost pools to allocation keys
CREATE TABLE IF NOT EXISTS allocation_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organizationId INT NOT NULL,
  costPoolId INT NOT NULL,
  allocationKeyId INT NOT NULL,
  effectiveFrom DATE NOT NULL,
  effectiveTo DATE,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  createdBy VARCHAR(255),
  updatedBy VARCHAR(255),
  INDEX idx_organization (organizationId),
  INDEX idx_cost_pool (costPoolId),
  INDEX idx_allocation_key (allocationKeyId),
  INDEX idx_effective_dates (effectiveFrom, effectiveTo)
);

-- Allocation Periods: Define time periods for allocation execution
CREATE TABLE IF NOT EXISTS allocation_periods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organizationId INT NOT NULL,
  periodCode VARCHAR(50) NOT NULL,
  periodName VARCHAR(255) NOT NULL,
  periodNameAr VARCHAR(255),
  periodType ENUM('monthly', 'quarterly', 'annual', 'custom') DEFAULT 'monthly',
  startDate DATE NOT NULL,
  endDate DATE NOT NULL,
  fiscalYearId INT,
  fiscalPeriodId INT,
  status ENUM('draft', 'in_progress', 'completed', 'reversed') DEFAULT 'draft',
  executedAt TIMESTAMP NULL,
  executedBy VARCHAR(255),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  createdBy VARCHAR(255),
  updatedBy VARCHAR(255),
  UNIQUE KEY unique_period_code (organizationId, periodCode),
  INDEX idx_organization (organizationId),
  INDEX idx_dates (startDate, endDate),
  INDEX idx_status (status)
);

-- Allocation Bases: Store the basis data for allocation calculations
CREATE TABLE IF NOT EXISTS allocation_bases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organizationId INT NOT NULL,
  allocationPeriodId INT NOT NULL,
  projectId INT NOT NULL,
  allocationKeyId INT NOT NULL,
  basisValue DECIMAL(15, 2) NOT NULL DEFAULT 0.00, -- Headcount, budget amount, direct costs, etc.
  basisPercentage DECIMAL(5, 2) NOT NULL DEFAULT 0.00, -- Calculated percentage of total
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_allocation_base (allocationPeriodId, projectId, allocationKeyId),
  INDEX idx_organization (organizationId),
  INDEX idx_period (allocationPeriodId),
  INDEX idx_project (projectId),
  INDEX idx_key (allocationKeyId)
);

-- Allocation Results: Store the final allocated amounts
CREATE TABLE IF NOT EXISTS allocation_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organizationId INT NOT NULL,
  allocationPeriodId INT NOT NULL,
  costPoolId INT NOT NULL,
  projectId INT NOT NULL,
  allocationKeyId INT NOT NULL,
  totalPoolAmount DECIMAL(15, 2) NOT NULL DEFAULT 0.00, -- Total cost pool amount
  allocationPercentage DECIMAL(5, 2) NOT NULL DEFAULT 0.00, -- Project's share percentage
  allocatedAmount DECIMAL(15, 2) NOT NULL DEFAULT 0.00, -- Amount allocated to project
  journalEntryId INT, -- Link to generated journal entry
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_allocation_result (allocationPeriodId, costPoolId, projectId),
  INDEX idx_organization (organizationId),
  INDEX idx_period (allocationPeriodId),
  INDEX idx_cost_pool (costPoolId),
  INDEX idx_project (projectId),
  INDEX idx_journal_entry (journalEntryId)
);

-- Cost Pool Transactions: Track actual costs in each pool
CREATE TABLE IF NOT EXISTS cost_pool_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organizationId INT NOT NULL,
  costPoolId INT NOT NULL,
  transactionDate DATE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  description TEXT,
  descriptionAr TEXT,
  sourceModule ENUM('manual', 'expense', 'payment', 'journal_entry', 'import') DEFAULT 'manual',
  sourceDocumentId INT,
  sourceDocumentType VARCHAR(50),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  createdBy VARCHAR(255),
  updatedBy VARCHAR(255),
  INDEX idx_organization (organizationId),
  INDEX idx_cost_pool (costPoolId),
  INDEX idx_transaction_date (transactionDate),
  INDEX idx_source (sourceModule, sourceDocumentId)
);

-- Comments on tables
ALTER TABLE cost_pools COMMENT = 'Overhead cost categories to be allocated across projects';
ALTER TABLE allocation_keys COMMENT = 'Methods for distributing costs (headcount, budget %, etc.)';
ALTER TABLE allocation_rules COMMENT = 'Maps cost pools to allocation keys with effective dates';
ALTER TABLE allocation_periods COMMENT = 'Time periods for executing allocations (monthly, quarterly, etc.)';
ALTER TABLE allocation_bases COMMENT = 'Stores basis data for allocation calculations per project';
ALTER TABLE allocation_results COMMENT = 'Final allocated amounts per project per cost pool';
ALTER TABLE cost_pool_transactions COMMENT = 'Actual costs accumulated in each cost pool';
