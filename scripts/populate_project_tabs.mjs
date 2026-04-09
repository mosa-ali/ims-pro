/**
 * Populate WASH-2026-001 Project Tabs with Example Data
 * 
 * This script populates all required project tabs:
 * 1. Activities (source of truth)
 * 2. Indicators (linked to Activities)
 * 3. Budget Items (linked to Activities)
 * 4. Forecast Plan (references budget items)
 * 5. Procurement Plan (auto-loads Activity code/name)
 * 6. Tasks (linked to Activities)
 * 7. Project Plan
 */

import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Get project ID
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

console.log('=== POPULATING PROJECT TABS FOR WASH-2026-001 ===');
console.log('Project ID:', projectId);
console.log('Organization ID:', orgId);
console.log('Operating Unit ID:', ouId);

// ============================================================================
// 1. ACTIVITIES (Source of Truth)
// ============================================================================
console.log('\n--- 1. Creating Activities ---');

const activities = [
  {
    code: 'ACT-001',
    name: 'Water Point Rehabilitation',
    nameAr: 'إعادة تأهيل نقاط المياه',
    description: 'Rehabilitate 50 water points in target communities',
    status: 'in_progress',
    startDate: '2026-01-15',
    endDate: '2026-06-30',
    budget: 150000.00
  },
  {
    code: 'ACT-002',
    name: 'Hygiene Promotion Campaign',
    nameAr: 'حملة تعزيز النظافة',
    description: 'Conduct hygiene awareness sessions in 100 communities',
    status: 'planned',
    startDate: '2026-02-01',
    endDate: '2026-08-31',
    budget: 75000.00
  },
  {
    code: 'ACT-003',
    name: 'Latrine Construction',
    nameAr: 'بناء المراحيض',
    description: 'Construct 200 household latrines in underserved areas',
    status: 'planned',
    startDate: '2026-03-01',
    endDate: '2026-09-30',
    budget: 200000.00
  },
  {
    code: 'ACT-004',
    name: 'Water Quality Testing',
    nameAr: 'اختبار جودة المياه',
    description: 'Regular water quality monitoring at all water points',
    status: 'in_progress',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    budget: 25000.00
  }
];

const activityIds = {};
for (const act of activities) {
  await conn.query(`
    INSERT INTO activities (organizationId, operatingUnitId, projectId, name, nameAr, description, status, startDate, endDate, budget, isDeleted, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, NOW())
    ON DUPLICATE KEY UPDATE name = VALUES(name)
  `, [orgId, ouId, projectId, act.name, act.nameAr, act.description, act.status, act.startDate, act.endDate, act.budget]);
  
  const [[inserted]] = await conn.query('SELECT id FROM activities WHERE projectId = ? AND name = ?', [projectId, act.name]);
  activityIds[act.code] = inserted.id;
  console.log(`✅ Activity: ${act.code} - ${act.name} (ID: ${inserted.id})`);
}

// ============================================================================
// 2. INDICATORS (Linked to Activities)
// ============================================================================
console.log('\n--- 2. Creating Indicators ---');

const indicators = [
  {
    code: 'IND-001',
    name: 'Number of water points rehabilitated',
    nameAr: 'عدد نقاط المياه المعاد تأهيلها',
    type: 'output',
    unit: 'water points',
    baselineValue: 0,
    targetValue: 50,
    currentValue: 12,
    activityCode: 'ACT-001'
  },
  {
    code: 'IND-002',
    name: 'Number of beneficiaries with access to safe water',
    nameAr: 'عدد المستفيدين الذين لديهم إمكانية الوصول إلى المياه الآمنة',
    type: 'outcome',
    unit: 'people',
    baselineValue: 5000,
    targetValue: 25000,
    currentValue: 8500,
    activityCode: 'ACT-001'
  },
  {
    code: 'IND-003',
    name: 'Number of hygiene sessions conducted',
    nameAr: 'عدد جلسات النظافة المنفذة',
    type: 'output',
    unit: 'sessions',
    baselineValue: 0,
    targetValue: 200,
    currentValue: 0,
    activityCode: 'ACT-002'
  },
  {
    code: 'IND-004',
    name: 'Number of latrines constructed',
    nameAr: 'عدد المراحيض المبنية',
    type: 'output',
    unit: 'latrines',
    baselineValue: 0,
    targetValue: 200,
    currentValue: 0,
    activityCode: 'ACT-003'
  },
  {
    code: 'IND-005',
    name: 'Percentage of water samples meeting quality standards',
    nameAr: 'نسبة عينات المياه المطابقة لمعايير الجودة',
    type: 'outcome',
    unit: 'percent',
    baselineValue: 60,
    targetValue: 95,
    currentValue: 78,
    activityCode: 'ACT-004'
  }
];

for (const ind of indicators) {
  await conn.query(`
    INSERT INTO indicators (organizationId, operatingUnitId, projectId, code, name, nameAr, type, unit, baselineValue, targetValue, currentValue, isDeleted, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, NOW())
    ON DUPLICATE KEY UPDATE currentValue = VALUES(currentValue)
  `, [orgId, ouId, projectId, ind.code, ind.name, ind.nameAr, ind.type, ind.unit, ind.baselineValue, ind.targetValue, ind.currentValue]);
  console.log(`✅ Indicator: ${ind.code} - ${ind.name}`);
}

// ============================================================================
// 3. BUDGET ITEMS (Linked to Activities)
// ============================================================================
console.log('\n--- 3. Creating Budget Items ---');

const budgetItems = [
  {
    lineItem: 'Water pump equipment',
    lineItemAr: 'معدات مضخات المياه',
    budgetedAmount: 80000,
    actualAmount: 25000,
    activityCode: 'ACT-001'
  },
  {
    lineItem: 'Pipe materials and fittings',
    lineItemAr: 'مواد الأنابيب والتجهيزات',
    budgetedAmount: 45000,
    actualAmount: 15000,
    activityCode: 'ACT-001'
  },
  {
    lineItem: 'Labor costs - rehabilitation',
    lineItemAr: 'تكاليف العمالة - إعادة التأهيل',
    budgetedAmount: 25000,
    actualAmount: 8000,
    activityCode: 'ACT-001'
  },
  {
    lineItem: 'Hygiene promotion materials',
    lineItemAr: 'مواد تعزيز النظافة',
    budgetedAmount: 30000,
    actualAmount: 0,
    activityCode: 'ACT-002'
  },
  {
    lineItem: 'Training and workshops',
    lineItemAr: 'التدريب وورش العمل',
    budgetedAmount: 45000,
    actualAmount: 0,
    activityCode: 'ACT-002'
  },
  {
    lineItem: 'Latrine construction materials',
    lineItemAr: 'مواد بناء المراحيض',
    budgetedAmount: 150000,
    actualAmount: 0,
    activityCode: 'ACT-003'
  },
  {
    lineItem: 'Labor costs - construction',
    lineItemAr: 'تكاليف العمالة - البناء',
    budgetedAmount: 50000,
    actualAmount: 0,
    activityCode: 'ACT-003'
  },
  {
    lineItem: 'Water testing kits and equipment',
    lineItemAr: 'أدوات ومعدات اختبار المياه',
    budgetedAmount: 15000,
    actualAmount: 5000,
    activityCode: 'ACT-004'
  },
  {
    lineItem: 'Laboratory analysis fees',
    lineItemAr: 'رسوم التحليل المخبري',
    budgetedAmount: 10000,
    actualAmount: 2500,
    activityCode: 'ACT-004'
  }
];

const budgetItemIds = [];
for (const item of budgetItems) {
  const variance = item.budgetedAmount - item.actualAmount;
  await conn.query(`
    INSERT INTO budget_items (organizationId, operatingUnitId, projectId, lineItem, lineItemAr, budgetedAmount, actualAmount, variance, isDeleted, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, FALSE, NOW())
    ON DUPLICATE KEY UPDATE actualAmount = VALUES(actualAmount), variance = VALUES(variance)
  `, [orgId, ouId, projectId, item.lineItem, item.lineItemAr, item.budgetedAmount, item.actualAmount, variance]);
  
  const [[inserted]] = await conn.query('SELECT id FROM budget_items WHERE projectId = ? AND lineItem = ?', [projectId, item.lineItem]);
  budgetItemIds.push(inserted.id);
  console.log(`✅ Budget Item: ${item.lineItem} (Budget: $${item.budgetedAmount}, Actual: $${item.actualAmount})`);
}

// ============================================================================
// 4. FORECAST PLAN (References Budget Items)
// ============================================================================
console.log('\n--- 4. Creating Forecast Plan ---');

const forecasts = [
  { period: 'Q1-2026', forecastAmount: 100000, actualAmount: 55500 },
  { period: 'Q2-2026', forecastAmount: 150000, actualAmount: 0 },
  { period: 'Q3-2026', forecastAmount: 150000, actualAmount: 0 },
  { period: 'Q4-2026', forecastAmount: 50000, actualAmount: 0 }
];

for (const fc of forecasts) {
  const variance = fc.forecastAmount - fc.actualAmount;
  await conn.query(`
    INSERT INTO forecast_plan (organizationId, operatingUnitId, projectId, period, forecastAmount, actualAmount, variance, isDeleted, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, NOW())
    ON DUPLICATE KEY UPDATE actualAmount = VALUES(actualAmount), variance = VALUES(variance)
  `, [orgId, ouId, projectId, fc.period, fc.forecastAmount, fc.actualAmount, variance]);
  console.log(`✅ Forecast: ${fc.period} (Forecast: $${fc.forecastAmount}, Actual: $${fc.actualAmount})`);
}

// ============================================================================
// 5. PROCUREMENT PLAN (Project-level plan)
// ============================================================================
console.log('\n--- 5. Creating Procurement Plan ---');

// The procurement_plan table is a project-level plan, not line items
// Create a single procurement plan for the project
await conn.query(`
  INSERT INTO procurement_plan (organizationId, operatingUnitId, projectId, planNumber, title, titleAr, fiscalYear, totalBudget, currency, status, isDeleted, createdAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, NOW())
  ON DUPLICATE KEY UPDATE status = VALUES(status)
`, [orgId, ouId, projectId, 'PP-2026-001', 'WASH Project Procurement Plan 2026', 'خطة المشتريات لمشروع المياه والصرف الصحي 2026', 2026, 215000, 'USD', 'approved']);
console.log('✅ Procurement Plan: PP-2026-001 - WASH Project Procurement Plan 2026');

// ============================================================================
// 6. TASKS (Linked to Activities)
// ============================================================================
console.log('\n--- 6. Creating Tasks ---');

const tasks = [
  {
    title: 'Site assessment for water points',
    titleAr: 'تقييم الموقع لنقاط المياه',
    status: 'completed',
    priority: 'high',
    dueDate: '2026-01-31',
    activityCode: 'ACT-001'
  },
  {
    title: 'Procure water pumps',
    titleAr: 'شراء مضخات المياه',
    status: 'in_progress',
    priority: 'high',
    dueDate: '2026-03-15',
    activityCode: 'ACT-001'
  },
  {
    title: 'Install water distribution network',
    titleAr: 'تركيب شبكة توزيع المياه',
    status: 'pending',
    priority: 'medium',
    dueDate: '2026-05-30',
    activityCode: 'ACT-001'
  },
  {
    title: 'Develop hygiene training curriculum',
    titleAr: 'تطوير منهج التدريب على النظافة',
    status: 'pending',
    priority: 'medium',
    dueDate: '2026-02-28',
    activityCode: 'ACT-002'
  },
  {
    title: 'Train community health workers',
    titleAr: 'تدريب العاملين الصحيين المجتمعيين',
    status: 'pending',
    priority: 'high',
    dueDate: '2026-03-31',
    activityCode: 'ACT-002'
  },
  {
    title: 'Identify latrine construction sites',
    titleAr: 'تحديد مواقع بناء المراحيض',
    status: 'pending',
    priority: 'medium',
    dueDate: '2026-03-15',
    activityCode: 'ACT-003'
  },
  {
    title: 'Establish water quality baseline',
    titleAr: 'إنشاء خط أساس لجودة المياه',
    status: 'completed',
    priority: 'high',
    dueDate: '2026-01-31',
    activityCode: 'ACT-004'
  },
  {
    title: 'Monthly water quality monitoring',
    titleAr: 'المراقبة الشهرية لجودة المياه',
    status: 'in_progress',
    priority: 'medium',
    dueDate: '2026-12-31',
    activityCode: 'ACT-004'
  }
];

for (const task of tasks) {
  const activityId = activityIds[task.activityCode];
  await conn.query(`
    INSERT INTO tasks (organizationId, operatingUnitId, projectId, activityId, title, titleAr, status, priority, dueDate, isDeleted, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, NOW())
    ON DUPLICATE KEY UPDATE status = VALUES(status)
  `, [orgId, ouId, projectId, activityId, task.title, task.titleAr, task.status, task.priority, task.dueDate]);
  console.log(`✅ Task: ${task.title} (Activity: ${task.activityCode})`);
}

// ============================================================================
// 7. PROJECT PLAN
// ============================================================================
console.log('\n--- 7. Creating Project Plan ---');

await conn.query(`
  INSERT INTO project_plans (organizationId, projectId, department, planName, planNameAr, version, status, createdBy, isDeleted, createdAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, 1, FALSE, NOW())
  ON DUPLICATE KEY UPDATE status = VALUES(status)
`, [orgId, projectId, 'program', 'WASH Phase 2 Implementation Plan', 'خطة تنفيذ المرحلة الثانية للمياه والصرف الصحي', 1, 'active']);
console.log('✅ Project Plan: WASH Phase 2 Implementation Plan');

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n=== POPULATION COMPLETE ===');

// Verify counts
const [actCount] = await conn.query('SELECT COUNT(*) as count FROM activities WHERE projectId = ?', [projectId]);
const [indCount] = await conn.query('SELECT COUNT(*) as count FROM indicators WHERE projectId = ?', [projectId]);
const [budCount] = await conn.query('SELECT COUNT(*) as count FROM budget_items WHERE projectId = ?', [projectId]);
const [fcCount] = await conn.query('SELECT COUNT(*) as count FROM forecast_plan WHERE projectId = ?', [projectId]);
const [procCount] = await conn.query('SELECT COUNT(*) as count FROM procurement_plan WHERE projectId = ?', [projectId]);
const [taskCount] = await conn.query('SELECT COUNT(*) as count FROM tasks WHERE projectId = ?', [projectId]);
const [planCount] = await conn.query('SELECT COUNT(*) as count FROM project_plans WHERE projectId = ?', [projectId]);

console.log('\nFinal Counts:');
console.log('  Activities:', actCount[0].count);
console.log('  Indicators:', indCount[0].count);
console.log('  Budget Items:', budCount[0].count);
console.log('  Forecast Plans:', fcCount[0].count);
console.log('  Procurement Plans:', procCount[0].count);
console.log('  Tasks:', taskCount[0].count);
console.log('  Project Plans:', planCount[0].count);

await conn.end();
console.log('\n✅ All project tabs populated successfully!');
