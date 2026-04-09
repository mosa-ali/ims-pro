-- ============================================================================
-- Test Data Insertion Script for Reports & Analytics Module
-- Uses ACTUAL Operating Unit IDs from the database
-- ============================================================================

-- First, let's identify the correct OU IDs
-- Run this query first to see available OUs:
-- SELECT id, name, organizationId FROM operating_units WHERE organizationId IN (30001, 30002);

-- Expected structure (based on query results):
-- YDH (30001): Multiple OUs
-- EFADAH (30002): Multiple OUs

-- ============================================================================
-- STEP 1: Clean up any existing test data created with wrong OU IDs
-- ============================================================================

DELETE FROM hr_attendance_records WHERE operatingUnitId IN (270093, 270094, 270095, 270096);
DELETE FROM hr_payroll_records WHERE operatingUnitId IN (270093, 270094, 270095, 270096);
DELETE FROM hr_employees WHERE operatingUnitId IN (270093, 270094, 270095, 270096);

-- ============================================================================
-- STEP 2: Insert test employees for FIRST available OU in each organization
-- We'll use the FIRST OU returned by the query for each org
-- ============================================================================

-- Get the first OU ID for YDH (organizationId = 30001)
SET @ydh_ou1 = (SELECT id FROM operating_units WHERE organizationId = 30001 ORDER BY id LIMIT 1);

-- Get the second OU ID for YDH (if exists)
SET @ydh_ou2 = (SELECT id FROM operating_units WHERE organizationId = 30001 ORDER BY id LIMIT 1 OFFSET 1);

-- Get the first OU ID for EFADAH (organizationId = 30002)
SET @efadah_ou1 = (SELECT id FROM operating_units WHERE organizationId = 30002 ORDER BY id LIMIT 1);

-- Get the second OU ID for EFADAH (if exists)
SET @efadah_ou2 = (SELECT id FROM operating_units WHERE organizationId = 30002 ORDER BY id LIMIT 1 OFFSET 1);

-- Display the OU IDs we're using
SELECT 
  @ydh_ou1 AS 'YDH OU 1',
  @ydh_ou2 AS 'YDH OU 2',
  @efadah_ou1 AS 'EFADAH OU 1',
  @efadah_ou2 AS 'EFADAH OU 2';

-- ============================================================================
-- STEP 3: Insert test employees for YDH Organization - OU 1
-- ============================================================================

INSERT INTO hr_employees (
  organizationId, operatingUnitId, employeeCode, firstName, lastName,
  gender, dateOfBirth, nationality, email, phone, position, department,
  employmentType, contractType, hireDate, salary, status,
  isDeleted, createdAt, updatedAt
) VALUES
-- YDH OU 1 - 5 employees
(30001, @ydh_ou1, 'YDH-001', 'Ahmed', 'Al-Sayed', 'male', '1985-03-15', 'Yemeni', 'ahmed.alsayed@ydh.org', '+967-777-111-001', 'Project Manager', 'Programs', 'full_time', 'permanent', '2023-01-15', 2500.00, 'active', 0, NOW(), NOW()),
(30001, @ydh_ou1, 'YDH-002', 'Fatima', 'Mohammed', 'female', '1990-07-22', 'Yemeni', 'fatima.mohammed@ydh.org', '+967-777-111-002', 'Finance Officer', 'Finance', 'full_time', 'permanent', '2023-02-01', 2200.00, 'active', 0, NOW(), NOW()),
(30001, @ydh_ou1, 'YDH-003', 'Hassan', 'Ali', 'male', '1988-11-10', 'Yemeni', 'hassan.ali@ydh.org', '+967-777-111-003', 'Field Coordinator', 'Operations', 'full_time', 'contract', '2023-03-15', 1800.00, 'active', 0, NOW(), NOW()),
(30001, @ydh_ou1, 'YDH-004', 'Nadia', 'Saleh', 'female', '1992-05-18', 'Yemeni', 'nadia.saleh@ydh.org', '+967-777-111-004', 'HR Specialist', 'HR', 'full_time', 'permanent', '2023-04-01', 2000.00, 'active', 0, NOW(), NOW()),
(30001, @ydh_ou1, 'YDH-005', 'Omar', 'Abdullah', 'male', '1987-09-25', 'Yemeni', 'omar.abdullah@ydh.org', '+967-777-111-005', 'Logistics Officer', 'Logistics', 'full_time', 'contract', '2023-05-15', 1900.00, 'active', 0, NOW(), NOW());

-- ============================================================================
-- STEP 4: Insert test employees for YDH Organization - OU 2 (if exists)
-- ============================================================================

INSERT INTO hr_employees (
  organizationId, operatingUnitId, employeeCode, firstName, lastName,
  gender, dateOfBirth, nationality, email, phone, position, department,
  employmentType, contractType, hireDate, salary, status,
  isDeleted, createdAt, updatedAt
) VALUES
-- YDH OU 2 - 4 employees
(30001, @ydh_ou2, 'YDH-006', 'Maryam', 'Hussein', 'female', '1991-02-14', 'Yemeni', 'maryam.hussein@ydh.org', '+967-777-112-001', 'Program Officer', 'Programs', 'full_time', 'permanent', '2023-06-01', 1700.00, 'active', 0, NOW(), NOW()),
(30001, @ydh_ou2, 'YDH-007', 'Khaled', 'Ahmed', 'male', '1989-08-30', 'Yemeni', 'khaled.ahmed@ydh.org', '+967-777-112-002', 'Driver', 'Logistics', 'full_time', 'contract', '2023-07-15', 1200.00, 'active', 0, NOW(), NOW()),
(30001, @ydh_ou2, 'YDH-008', 'Aisha', 'Omar', 'female', '1993-12-05', 'Yemeni', 'aisha.omar@ydh.org', '+967-777-112-003', 'Admin Assistant', 'Admin', 'part_time', 'contract', '2023-08-01', 1000.00, 'active', 0, NOW(), NOW()),
(30001, @ydh_ou2, 'YDH-009', 'Youssef', 'Nasser', 'male', '1986-04-20', 'Yemeni', 'youssef.nasser@ydh.org', '+967-777-112-004', 'Security Guard', 'Security', 'full_time', 'contract', '2023-09-01', 1100.00, 'active', 0, NOW(), NOW());

-- ============================================================================
-- STEP 5: Insert test employees for EFADAH Organization - OU 1
-- ============================================================================

INSERT INTO hr_employees (
  organizationId, operatingUnitId, employeeCode, firstName, lastName,
  gender, dateOfBirth, nationality, email, phone, position, department,
  employmentType, contractType, hireDate, salary, status,
  isDeleted, createdAt, updatedAt
) VALUES
-- EFADAH OU 1 - 6 employees
(30002, @efadah_ou1, 'EFA-001', 'Sara', 'Khalid', 'female', '1988-06-12', 'Yemeni', 'sara.khalid@efadah.org', '+967-777-221-001', 'Executive Director', 'Management', 'full_time', 'permanent', '2022-01-10', 3500.00, 'active', 0, NOW(), NOW()),
(30002, @efadah_ou1, 'EFA-002', 'Mohammed', 'Salim', 'male', '1985-10-08', 'Yemeni', 'mohammed.salim@efadah.org', '+967-777-221-002', 'Finance Manager', 'Finance', 'full_time', 'permanent', '2022-02-15', 3000.00, 'active', 0, NOW(), NOW()),
(30002, @efadah_ou1, 'EFA-003', 'Layla', 'Hassan', 'female', '1990-03-25', 'Yemeni', 'layla.hassan@efadah.org', '+967-777-221-003', 'Program Coordinator', 'Programs', 'full_time', 'permanent', '2022-03-01', 2400.00, 'active', 0, NOW(), NOW()),
(30002, @efadah_ou1, 'EFA-004', 'Abdullah', 'Yahya', 'male', '1987-11-30', 'Yemeni', 'abdullah.yahya@efadah.org', '+967-777-221-004', 'IT Specialist', 'IT', 'full_time', 'contract', '2022-04-15', 2100.00, 'active', 0, NOW(), NOW()),
(30002, @efadah_ou1, 'EFA-005', 'Huda', 'Ali', 'female', '1992-07-18', 'Yemeni', 'huda.ali@efadah.org', '+967-777-221-005', 'M&E Officer', 'Programs', 'full_time', 'permanent', '2022-05-01', 2200.00, 'active', 0, NOW(), NOW()),
(30002, @efadah_ou1, 'EFA-006', 'Tariq', 'Mohammed', 'male', '1989-01-22', 'Yemeni', 'tariq.mohammed@efadah.org', '+967-777-221-006', 'Procurement Officer', 'Procurement', 'full_time', 'contract', '2022-06-15', 1900.00, 'active', 0, NOW(), NOW());

-- ============================================================================
-- STEP 6: Insert test employees for EFADAH Organization - OU 2 (if exists)
-- ============================================================================

INSERT INTO hr_employees (
  organizationId, operatingUnitId, employeeCode, firstName, lastName,
  gender, dateOfBirth, nationality, email, phone, position, department,
  employmentType, contractType, hireDate, salary, status,
  isDeleted, createdAt, updatedAt
) VALUES
-- EFADAH OU 2 - 4 employees
(30002, @efadah_ou2, 'EFA-007', 'Amina', 'Salem', 'female', '1991-09-14', 'Yemeni', 'amina.salem@efadah.org', '+967-777-222-001', 'Branch Manager', 'Management', 'full_time', 'permanent', '2022-07-01', 2800.00, 'active', 0, NOW(), NOW()),
(30002, @efadah_ou2, 'EFA-008', 'Faisal', 'Ahmed', 'male', '1988-12-03', 'Yemeni', 'faisal.ahmed@efadah.org', '+967-777-222-002', 'Field Officer', 'Operations', 'full_time', 'contract', '2022-08-15', 1600.00, 'active', 0, NOW(), NOW()),
(30002, @efadah_ou2, 'EFA-009', 'Zainab', 'Nasser', 'female', '1993-04-27', 'Yemeni', 'zainab.nasser@efadah.org', '+967-777-222-003', 'Community Mobilizer', 'Programs', 'part_time', 'contract', '2022-09-01', 1400.00, 'active', 0, NOW(), NOW()),
(30002, @efadah_ou2, 'EFA-010', 'Rashid', 'Abdullah', 'male', '1986-08-11', 'Yemeni', 'rashid.abdullah@efadah.org', '+967-777-222-004', 'Warehouse Keeper', 'Logistics', 'full_time', 'contract', '2022-10-01', 1300.00, 'active', 0, NOW(), NOW());

-- ============================================================================
-- STEP 7: Insert payroll records for all employees (last 3 months)
-- ============================================================================

-- This will be generated dynamically based on the inserted employees
-- For now, we'll insert sample payroll records for the first few employees

INSERT INTO hr_payroll_records (
  organizationId, operatingUnitId, employeeId, payPeriodStart, payPeriodEnd,
  basicSalary, allowances, deductions, netSalary, paymentStatus, paymentDate,
  isDeleted, createdAt, updatedAt
)
SELECT 
  e.organizationId,
  e.operatingUnitId,
  e.id AS employeeId,
  DATE_SUB(CURDATE(), INTERVAL 1 MONTH) AS payPeriodStart,
  LAST_DAY(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AS payPeriodEnd,
  e.salary AS basicSalary,
  e.salary * 0.15 AS allowances,
  e.salary * 0.10 AS deductions,
  e.salary * 1.05 AS netSalary,
  'paid' AS paymentStatus,
  LAST_DAY(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AS paymentDate,
  0 AS isDeleted,
  NOW() AS createdAt,
  NOW() AS updatedAt
FROM hr_employees e
WHERE e.employeeCode LIKE 'YDH-%' OR e.employeeCode LIKE 'EFA-%';

-- ============================================================================
-- STEP 8: Insert attendance records for all employees (last 30 days)
-- ============================================================================

-- Generate attendance records for each employee for the past 30 days
INSERT INTO hr_attendance_records (
  organizationId, operatingUnitId, employeeId, attendanceDate,
  checkInTime, checkOutTime, status, workingHours, overtimeHours,
  isDeleted, createdAt, updatedAt
)
SELECT 
  e.organizationId,
  e.operatingUnitId,
  e.id AS employeeId,
  DATE_SUB(CURDATE(), INTERVAL n.num DAY) AS attendanceDate,
  CONCAT(DATE_SUB(CURDATE(), INTERVAL n.num DAY), ' 08:00:00') AS checkInTime,
  CONCAT(DATE_SUB(CURDATE(), INTERVAL n.num DAY), ' 17:00:00') AS checkOutTime,
  'present' AS status,
  8.0 AS workingHours,
  0.0 AS overtimeHours,
  0 AS isDeleted,
  NOW() AS createdAt,
  NOW() AS updatedAt
FROM hr_employees e
CROSS JOIN (
  SELECT 0 AS num UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION
  SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION
  SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION
  SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION
  SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION
  SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29
) n
WHERE e.employeeCode LIKE 'YDH-%' OR e.employeeCode LIKE 'EFA-%';

-- ============================================================================
-- STEP 9: Verify the inserted data
-- ============================================================================

SELECT 
  'Employee Count by OU' AS report_type,
  ou.name AS ou_name,
  o.name AS org_name,
  COUNT(e.id) AS employee_count
FROM operating_units ou
JOIN organizations o ON ou.organizationId = o.id
LEFT JOIN hr_employees e ON e.operatingUnitId = ou.id AND e.isDeleted = 0
WHERE ou.organizationId IN (30001, 30002)
GROUP BY ou.id, ou.name, o.name
ORDER BY o.name, ou.name;

SELECT 'Test Data Insertion Complete!' AS status;
