-- Create missing tables from schema.ts that don't exist in database
-- Safe migration: CREATE TABLE IF NOT EXISTS

-- 1. activities
CREATE TABLE IF NOT EXISTS activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organizationId INT NOT NULL,
  operatingUnitId INT,
  projectId INT,
  name VARCHAR(255) NOT NULL,
  nameAr VARCHAR(255),
  description TEXT,
  status VARCHAR(50) DEFAULT 'planned',
  startDate DATE,
  endDate DATE,
  budget DECIMAL(15,2),
  isDeleted BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  createdBy INT,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updatedBy INT
);

-- 2. indicators
CREATE TABLE IF NOT EXISTS indicators (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organizationId INT NOT NULL,
  operatingUnitId INT,
  projectId INT,
  code VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  nameAr VARCHAR(255),
  type VARCHAR(50) DEFAULT 'output',
  unit VARCHAR(100),
  baselineValue DECIMAL(15,2),
  targetValue DECIMAL(15,2),
  currentValue DECIMAL(15,2),
  isDeleted BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  createdBy INT,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updatedBy INT
);

-- 3. tasks
CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organizationId INT NOT NULL,
  operatingUnitId INT,
  projectId INT,
  activityId INT,
  title VARCHAR(255) NOT NULL,
  titleAr VARCHAR(255),
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  priority VARCHAR(50) DEFAULT 'medium',
  assignedTo INT,
  dueDate DATE,
  completedAt TIMESTAMP,
  isDeleted BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  createdBy INT,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updatedBy INT
);

-- 4. expenses
CREATE TABLE IF NOT EXISTS expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organizationId INT NOT NULL,
  operatingUnitId INT,
  projectId INT,
  grantId INT,
  accountCode VARCHAR(50),
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  description TEXT,
  expenseDate DATE,
  reference VARCHAR(100),
  status VARCHAR(50) DEFAULT 'draft',
  isDeleted BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  createdBy INT,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updatedBy INT
);

-- 5. budget_items
CREATE TABLE IF NOT EXISTS budget_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organizationId INT NOT NULL,
  operatingUnitId INT,
  projectId INT,
  grantId INT,
  budgetCategoryId INT,
  lineItem VARCHAR(255) NOT NULL,
  lineItemAr VARCHAR(255),
  budgetedAmount DECIMAL(15,2) DEFAULT 0,
  actualAmount DECIMAL(15,2) DEFAULT 0,
  variance DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  isDeleted BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  createdBy INT,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updatedBy INT
);

-- 6. forecast_plan
CREATE TABLE IF NOT EXISTS forecast_plan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organizationId INT NOT NULL,
  operatingUnitId INT,
  projectId INT,
  period VARCHAR(50),
  forecastAmount DECIMAL(15,2),
  actualAmount DECIMAL(15,2),
  variance DECIMAL(15,2),
  notes TEXT,
  isDeleted BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  createdBy INT,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updatedBy INT
);

-- 7. forecast_audit_log
CREATE TABLE IF NOT EXISTS forecast_audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  forecastPlanId INT,
  action VARCHAR(50),
  previousValue TEXT,
  newValue TEXT,
  changedBy INT,
  changedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. globalSettings
CREATE TABLE IF NOT EXISTS globalSettings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  settingKey VARCHAR(100) NOT NULL UNIQUE,
  settingValue TEXT,
  description TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 9. opportunities
CREATE TABLE IF NOT EXISTS opportunities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organizationId INT NOT NULL,
  operatingUnitId INT,
  title VARCHAR(255) NOT NULL,
  titleAr VARCHAR(255),
  donorId INT,
  status VARCHAR(50) DEFAULT 'identified',
  estimatedValue DECIMAL(15,2),
  probability INT DEFAULT 50,
  deadline DATE,
  notes TEXT,
  isDeleted BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  createdBy INT,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updatedBy INT
);

-- 10. pipeline_opportunities
CREATE TABLE IF NOT EXISTS pipeline_opportunities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organizationId INT NOT NULL,
  operatingUnitId INT,
  opportunityId INT,
  stage VARCHAR(50) DEFAULT 'lead',
  probability INT DEFAULT 10,
  expectedCloseDate DATE,
  notes TEXT,
  isDeleted BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  createdBy INT,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updatedBy INT
);

-- 11. proposals
CREATE TABLE IF NOT EXISTS proposals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organizationId INT NOT NULL,
  operatingUnitId INT,
  opportunityId INT,
  title VARCHAR(255) NOT NULL,
  titleAr VARCHAR(255),
  status VARCHAR(50) DEFAULT 'draft',
  submissionDate DATE,
  requestedAmount DECIMAL(15,2),
  notes TEXT,
  isDeleted BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  createdBy INT,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updatedBy INT
);

-- 12. case_records
CREATE TABLE IF NOT EXISTS case_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organizationId INT NOT NULL,
  operatingUnitId INT,
  caseCode VARCHAR(50),
  clientName VARCHAR(255),
  clientNameAr VARCHAR(255),
  caseType VARCHAR(100),
  status VARCHAR(50) DEFAULT 'open',
  priority VARCHAR(50) DEFAULT 'medium',
  assignedTo INT,
  openedDate DATE,
  closedDate DATE,
  notes TEXT,
  isDeleted BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  createdBy INT,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updatedBy INT
);

-- 13. case_activities
CREATE TABLE IF NOT EXISTS case_activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  caseId INT NOT NULL,
  activityType VARCHAR(100),
  description TEXT,
  performedBy INT,
  performedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  isDeleted BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. case_referrals
CREATE TABLE IF NOT EXISTS case_referrals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  caseId INT NOT NULL,
  referredTo VARCHAR(255),
  referralType VARCHAR(100),
  referralDate DATE,
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  isDeleted BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  createdBy INT,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 15. pss_sessions
CREATE TABLE IF NOT EXISTS pss_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organizationId INT NOT NULL,
  operatingUnitId INT,
  sessionCode VARCHAR(50),
  sessionType VARCHAR(100),
  facilitator INT,
  sessionDate DATE,
  duration INT,
  participantCount INT,
  location VARCHAR(255),
  notes TEXT,
  isDeleted BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  createdBy INT,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updatedBy INT
);

-- 16. child_safe_spaces
CREATE TABLE IF NOT EXISTS child_safe_spaces (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organizationId INT NOT NULL,
  operatingUnitId INT,
  spaceCode VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  nameAr VARCHAR(255),
  location VARCHAR(255),
  capacity INT,
  status VARCHAR(50) DEFAULT 'active',
  openingDate DATE,
  notes TEXT,
  isDeleted BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  createdBy INT,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updatedBy INT
);

-- 17. css_activities
CREATE TABLE IF NOT EXISTS css_activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  childSafeSpaceId INT NOT NULL,
  activityType VARCHAR(100),
  activityDate DATE,
  facilitator INT,
  participantCount INT,
  notes TEXT,
  isDeleted BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  createdBy INT,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 18. meal_survey_questions
CREATE TABLE IF NOT EXISTS meal_survey_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  surveyId INT NOT NULL,
  questionText TEXT NOT NULL,
  questionTextAr TEXT,
  questionType VARCHAR(50) DEFAULT 'text',
  options TEXT,
  isRequired BOOLEAN DEFAULT FALSE,
  orderIndex INT DEFAULT 0,
  isDeleted BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 19. project_plan_activities
CREATE TABLE IF NOT EXISTS project_plan_activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  resultId INT NOT NULL,
  activityCode VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  titleAr VARCHAR(255),
  description TEXT,
  startDate DATE,
  endDate DATE,
  budget DECIMAL(15,2),
  status VARCHAR(50) DEFAULT 'planned',
  isDeleted BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  createdBy INT,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updatedBy INT
);

-- 20. project_plan_tasks
CREATE TABLE IF NOT EXISTS project_plan_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activityId INT NOT NULL,
  taskCode VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  titleAr VARCHAR(255),
  description TEXT,
  assignedTo INT,
  dueDate DATE,
  status VARCHAR(50) DEFAULT 'pending',
  isDeleted BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  createdBy INT,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updatedBy INT
);

-- 21. bid_analyses
CREATE TABLE IF NOT EXISTS bid_analyses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organizationId INT NOT NULL,
  operatingUnitId INT,
  purchaseRequestId INT,
  analysisCode VARCHAR(50),
  analysisDate DATE,
  status VARCHAR(50) DEFAULT 'draft',
  selectedBidderId INT,
  notes TEXT,
  isDeleted BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  createdBy INT,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updatedBy INT
);

-- 22. bid_analysis_bidders
CREATE TABLE IF NOT EXISTS bid_analysis_bidders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bidAnalysisId INT NOT NULL,
  supplierId INT,
  bidAmount DECIMAL(15,2),
  technicalScore DECIMAL(5,2),
  financialScore DECIMAL(5,2),
  totalScore DECIMAL(5,2),
  isSelected BOOLEAN DEFAULT FALSE,
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 23. bid_evaluation_criteria
CREATE TABLE IF NOT EXISTS bid_evaluation_criteria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bidAnalysisId INT NOT NULL,
  criteriaName VARCHAR(255) NOT NULL,
  weight DECIMAL(5,2) DEFAULT 0,
  description TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 24. systemImportReports
CREATE TABLE IF NOT EXISTS systemImportReports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organizationId INT NOT NULL,
  importType VARCHAR(100),
  fileName VARCHAR(255),
  totalRows INT DEFAULT 0,
  successRows INT DEFAULT 0,
  errorRows INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  errorLog TEXT,
  importedBy INT,
  importedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
