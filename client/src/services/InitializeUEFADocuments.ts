/**
 * ============================================================================
 * INITIALIZE UEFA PROJECT DOCUMENTS - COMPLETE AUTO-SYNC TEST
 * ============================================================================
 * 
 * This service initializes the UEFA project with COMPLETE data and
 * auto-generates ALL documents from project tabs
 * 
 * Demonstrates 100% functional Central Documents with:
 * - Activities data → Activities.xlsx
 * - Tasks data → Tasks.xlsx
 * - Budget data → Budget_vs_Actual.xlsx
 * - Forecast data → Forecast_Plan.xlsx
 * - Procurement data → Procurement_Plan.xlsx
 * - Indicators data → Indicator_Tracking.xlsx
 * - Beneficiaries data → Beneficiaries_Register.xlsx
 * 
 * All synced to Central Documents with SharePoint/OneDrive status
 * 
 * ============================================================================
 */

import { AllTabsExcelService } from './AllTabsExcelGenerationService';
import { DocumentServiceEnhanced } from './DocumentServiceEnhanced';

// UEFA Project full data
const UEFA_PROJECT = {
 project_id: 'UEFA-FOUND-001',
 project_code: 'UEFA-FOUND-001',
 project_name: 'Promoting Inclusion and Social Change through Sports',
 project_name_ar: 'تعزيز الشمول والتغيير الاجتماعي من خلال الرياضة',
 donor: 'UEFA Foundation',
 start_date: '2026-01-01',
 end_date: '2027-06-30',
 total_budget: 750000,
 currency: 'EUR',
 location: 'Multiple Locations, Yemen',
 status: 'Ongoing'
};

// ============================================================================
// ACTIVITIES DATA (From Activities Tab)
// ============================================================================

const UEFA_ACTIVITIES = [
 {
 activity_code: 'ACT-1.1',
 activity_name: 'Youth Football Training Program',
 activity_name_ar: 'برنامج تدريب كرة القدم للشباب',
 description: 'Organize weekly football training sessions for 500 youth',
 start_date: '2026-02-01',
 end_date: '2027-05-31',
 status: 'Ongoing',
 progress: 45,
 budget: 250000,
 spent: 112500,
 responsible: 'Ahmad Al-Hassan',
 beneficiaries_targeted: 500,
 beneficiaries_reached: 225,
 location: 'Sana\'a, Aden, Taiz'
 },
 {
 activity_code: 'ACT-1.2',
 activity_name: 'Coach Training and Certification',
 activity_name_ar: 'تدريب واعتماد المدربين',
 description: 'Train and certify 50 local coaches in inclusive sports methodology',
 start_date: '2026-01-15',
 end_date: '2026-06-30',
 status: 'Completed',
 progress: 100,
 budget: 150000,
 spent: 145000,
 responsible: 'Sarah Johnson',
 beneficiaries_targeted: 50,
 beneficiaries_reached: 52,
 location: 'Sana\'a'
 },
 {
 activity_code: 'ACT-2.1',
 activity_name: 'Sports Equipment Distribution',
 activity_name_ar: 'توزيع المعدات الرياضية',
 description: 'Procure and distribute sports equipment to 20 community centers',
 start_date: '2026-03-01',
 end_date: '2026-09-30',
 status: 'Ongoing',
 progress: 65,
 budget: 100000,
 spent: 65000,
 responsible: 'Maria Garcia',
 beneficiaries_targeted: 20,
 beneficiaries_reached: 13,
 location: 'Multiple Locations'
 },
 {
 activity_code: 'ACT-3.1',
 activity_name: 'Community Sports Events',
 activity_name_ar: 'الفعاليات الرياضية المجتمعية',
 description: 'Organize 12 community sports tournaments promoting social inclusion',
 start_date: '2026-04-01',
 end_date: '2027-04-30',
 status: 'Ongoing',
 progress: 30,
 budget: 180000,
 spent: 54000,
 responsible: 'John Smith',
 beneficiaries_targeted: 1000,
 beneficiaries_reached: 300,
 location: 'Sana\'a, Aden, Taiz, Hodeidah'
 },
 {
 activity_code: 'ACT-4.1',
 activity_name: 'MEAL and Documentation',
 activity_name_ar: 'الرصد والتقييم والتوثيق',
 description: 'Conduct baseline, midline, and endline assessments',
 start_date: '2026-01-15',
 end_date: '2027-06-15',
 status: 'Ongoing',
 progress: 40,
 budget: 70000,
 spent: 28000,
 responsible: 'Ahmad Al-Hassan',
 beneficiaries_targeted: 500,
 beneficiaries_reached: 200,
 location: 'All project locations'
 }
];

// ============================================================================
// TASKS DATA (From Tasks Tab)
// ============================================================================

const UEFA_TASKS = [
 {
 task_code: 'TASK-001',
 task_name: 'Conduct baseline assessment',
 task_name_ar: 'إجراء التقييم الأساسي',
 activity_code: 'ACT-4.1',
 assigned_to: 'Ahmad Al-Hassan',
 status: 'Completed',
 priority: 'High',
 start_date: '2026-01-15',
 due_date: '2026-02-15',
 completed_date: '2026-02-10',
 progress: 100,
 estimated_hours: 40,
 actual_hours: 38
 },
 {
 task_code: 'TASK-002',
 task_name: 'Design coach training curriculum',
 task_name_ar: 'تصميم منهج تدريب المدربين',
 activity_code: 'ACT-1.2',
 assigned_to: 'Sarah Johnson',
 status: 'Completed',
 priority: 'High',
 start_date: '2026-01-10',
 due_date: '2026-01-31',
 completed_date: '2026-01-28',
 progress: 100,
 estimated_hours: 60,
 actual_hours: 55
 },
 {
 task_code: 'TASK-003',
 task_name: 'Procure sports equipment',
 task_name_ar: 'شراء المعدات الرياضية',
 activity_code: 'ACT-2.1',
 assigned_to: 'Maria Garcia',
 status: 'In Progress',
 priority: 'Medium',
 start_date: '2026-03-01',
 due_date: '2026-05-31',
 completed_date: null,
 progress: 70,
 estimated_hours: 80,
 actual_hours: 56
 },
 {
 task_code: 'TASK-004',
 task_name: 'Organize first community tournament',
 task_name_ar: 'تنظيم البطولة المجتمعية الأولى',
 activity_code: 'ACT-3.1',
 assigned_to: 'John Smith',
 status: 'In Progress',
 priority: 'High',
 start_date: '2026-04-01',
 due_date: '2026-04-30',
 completed_date: null,
 progress: 85,
 estimated_hours: 120,
 actual_hours: 102
 },
 {
 task_code: 'TASK-005',
 task_name: 'Submit Q1 2026 donor report',
 task_name_ar: 'تقديم التقرير الفصلي الأول 2026',
 activity_code: 'ACT-4.1',
 assigned_to: 'Ahmad Al-Hassan',
 status: 'Not Started',
 priority: 'Urgent',
 start_date: '2026-03-15',
 due_date: '2026-03-31',
 completed_date: null,
 progress: 0,
 estimated_hours: 24,
 actual_hours: 0
 }
];

// ============================================================================
// BUDGET/FINANCE DATA (From Finance Tab)
// ============================================================================

const UEFA_BUDGET = {
 total_budget: 750000,
 total_spent: 404500,
 committed: 125000,
 available: 220500,
 variance_percentage: 12.5,
 categories: [
 {
 category: 'Personnel',
 category_ar: 'الموظفون',
 budget: 280000,
 actual: 140000,
 committed: 70000,
 available: 70000,
 variance: 0
 },
 {
 category: 'Training & Capacity Building',
 category_ar: 'التدريب وبناء القدرات',
 budget: 200000,
 actual: 145000,
 committed: 25000,
 available: 30000,
 variance: -5000
 },
 {
 category: 'Equipment & Supplies',
 category_ar: 'المعدات واللوازم',
 budget: 120000,
 actual: 65000,
 committed: 20000,
 available: 35000,
 variance: +10000
 },
 {
 category: 'Events & Tournaments',
 category_ar: 'الفعاليات والبطولات',
 budget: 100000,
 actual: 54000,
 committed: 10000,
 available: 36000,
 variance: +4000
 },
 {
 category: 'MEAL & Documentation',
 category_ar: 'الرصد والتقييم والتوثيق',
 budget: 50000,
 actual: 28000,
 committed: 0,
 available: 22000,
 variance: -6000
 }
 ],
 monthly_burn_rate: 32000,
 forecasted_completion: '2027-05-15'
};

// ============================================================================
// FORECAST PLAN DATA (From Forecast Tab)
// ============================================================================

const UEFA_FORECAST = [
 { period: '2026-01', planned: 45000, forecasted: 43000, actual: 42500, variance: -5.6 },
 { period: '2026-02', planned: 50000, forecasted: 52000, actual: 51800, variance: +3.6 },
 { period: '2026-03', planned: 48000, forecasted: 47000, actual: 46500, variance: -3.1 },
 { period: '2026-04', planned: 52000, forecasted: 54000, actual: 53500, variance: +2.9 },
 { period: '2026-05', planned: 55000, forecasted: 53000, actual: null, variance: null },
 { period: '2026-06', planned: 60000, forecasted: 62000, actual: null, variance: null },
 { period: '2026-07', planned: 58000, forecasted: 60000, actual: null, variance: null },
 { period: '2026-08', planned: 50000, forecasted: 48000, actual: null, variance: null },
 { period: '2026-09', planned: 55000, forecasted: 57000, actual: null, variance: null },
 { period: '2026-10', planned: 60000, forecasted: 62000, actual: null, variance: null },
 { period: '2026-11', planned: 58000, forecasted: 56000, actual: null, variance: null },
 { period: '2026-12', planned: 62000, forecasted: 64000, actual: null, variance: null }
];

// ============================================================================
// PROCUREMENT PLAN DATA (From Procurement Tab)
// ============================================================================

const UEFA_PROCUREMENT = [
 {
 item_code: 'PROC-001',
 item_name: 'Football Equipment Package (500 sets)',
 item_name_ar: 'حزمة معدات كرة القدم (500 مجموعة)',
 activity_code: 'ACT-2.1',
 quantity: 500,
 unit_of_measure: 'Sets',
 estimated_unit_cost: 80,
 estimated_total_cost: 40000,
 procurement_method: 'Competitive Bidding',
 procurement_type: 'Goods',
 planned_start_date: '2026-03-01',
 planned_completion_date: '2026-04-30',
 status: 'In Progress',
 supplier: 'Sports Equipment Ltd',
 actual_cost: null
 },
 {
 item_code: 'PROC-002',
 item_name: 'Training Materials for Coaches',
 item_name_ar: 'مواد تدريبية للمدربين',
 activity_code: 'ACT-1.2',
 quantity: 50,
 unit_of_measure: 'Kits',
 estimated_unit_cost: 120,
 estimated_total_cost: 6000,
 procurement_method: 'Direct Purchase',
 procurement_type: 'Goods',
 planned_start_date: '2026-01-15',
 planned_completion_date: '2026-02-15',
 status: 'Completed',
 supplier: 'Education Supplies Co.',
 actual_cost: 5800
 },
 {
 item_code: 'PROC-003',
 item_name: 'Community Center Renovation',
 item_name_ar: 'تجديد المراكز المجتمعية',
 activity_code: 'ACT-2.1',
 quantity: 5,
 unit_of_measure: 'Centers',
 estimated_unit_cost: 8000,
 estimated_total_cost: 40000,
 procurement_method: 'Competitive Bidding',
 procurement_type: 'Works',
 planned_start_date: '2026-05-01',
 planned_completion_date: '2026-08-31',
 status: 'Not Started',
 supplier: null,
 actual_cost: null
 }
];

// ============================================================================
// INDICATORS DATA (From Indicators Tab)
// ============================================================================

const UEFA_INDICATORS = [
 {
 indicator_code: 'IND-001',
 indicator_name: '# of youth participating in sports programs',
 indicator_name_ar: 'عدد الشباب المشاركين في البرامج الرياضية',
 type: 'Output',
 category: 'Participation',
 unit: 'Persons',
 baseline: 0,
 target: 500,
 actual: 225,
 achievement_percentage: 45,
 status: 'On Track',
 disaggregation: { male: 135, female: 90, pwd: 15 }
 },
 {
 indicator_code: 'IND-002',
 indicator_name: '# of coaches trained and certified',
 indicator_name_ar: 'عدد المدربين المدربين والمعتمدين',
 type: 'Output',
 category: 'Capacity Building',
 unit: 'Persons',
 baseline: 0,
 target: 50,
 actual: 52,
 achievement_percentage: 104,
 status: 'Exceeded',
 disaggregation: { male: 38, female: 14, pwd: 2 }
 },
 {
 indicator_code: 'IND-003',
 indicator_name: '% of participants reporting improved social skills',
 indicator_name_ar: 'نسبة المشاركين الذين أبلغوا عن تحسن المهارات الاجتماعية',
 type: 'Outcome',
 category: 'Social Change',
 unit: 'Percentage',
 baseline: 0,
 target: 75,
 actual: 68,
 achievement_percentage: 91,
 status: 'On Track',
 disaggregation: { male: 70, female: 65 }
 }
];

// ============================================================================
// BENEFICIARIES DATA (From Beneficiaries Tab)
// ============================================================================

const UEFA_BENEFICIARIES = [
 {
 beneficiary_id: 'BEN-UEFA-001',
 name: 'Ahmed Ali Mohammed',
 name_ar: 'أحمد علي محمد',
 age: 16,
 gender: 'Male',
 disability_status: 'None',
 location: 'Sana\'a',
 registration_date: '2026-02-15',
 status: 'Active',
 activities_participated: ['ACT-1.1', 'ACT-3.1']
 },
 {
 beneficiary_id: 'BEN-UEFA-002',
 name: 'Fatima Hassan Ali',
 name_ar: 'فاطمة حسن علي',
 age: 15,
 gender: 'Female',
 disability_status: 'None',
 location: 'Aden',
 registration_date: '2026-02-20',
 status: 'Active',
 activities_participated: ['ACT-1.1']
 },
 {
 beneficiary_id: 'BEN-UEFA-003',
 name: 'Mohammed Said Abdullah',
 name_ar: 'محمد سعيد عبدالله',
 age: 17,
 gender: 'Male',
 disability_status: 'Physical Disability',
 location: 'Taiz',
 registration_date: '2026-02-18',
 status: 'Active',
 activities_participated: ['ACT-1.1', 'ACT-3.1']
 }
 // In real system, this would have 225+ beneficiaries
];

// ============================================================================
// INITIALIZATION FUNCTION
// ============================================================================

export async function initializeUEFADocuments(): Promise<void> {
 console.log('🏆 ======================================================');
 console.log('🏆 INITIALIZING UEFA PROJECT WITH COMPLETE DATA');
 console.log('🏆 ======================================================\n');

 try {
 // Check if already initialized
 const existing = AllTabsExcelService.getProjectDocuments(UEFA_PROJECT.project_id);
 if (existing.length > 0) {
 console.log('✅ UEFA documents already exist. Use "Sync Data" button to regenerate.\n');
 return;
 }

 let generatedCount = 0;

 // 1. Generate Activities Document
 console.log('📊 Generating Activities document...');
 await AllTabsExcelService.generateTabDocument(
 'activities',
 UEFA_PROJECT.project_id,
 UEFA_PROJECT.project_code,
 UEFA_PROJECT.project_name,
 UEFA_ACTIVITIES,
 'initial',
 'system'
 );
 generatedCount++;

 // 2. Generate Tasks Document
 console.log('📋 Generating Tasks document...');
 await AllTabsExcelService.generateTabDocument(
 'tasks',
 UEFA_PROJECT.project_id,
 UEFA_PROJECT.project_code,
 UEFA_PROJECT.project_name,
 UEFA_TASKS,
 'initial',
 'system'
 );
 generatedCount++;

 // 3. Generate Finance/Budget Document
 console.log('💰 Generating Finance document...');
 await AllTabsExcelService.generateTabDocument(
 'finance',
 UEFA_PROJECT.project_id,
 UEFA_PROJECT.project_code,
 UEFA_PROJECT.project_name,
 UEFA_BUDGET,
 'initial',
 'system'
 );
 generatedCount++;

 // 4. Generate Forecast Plan Document
 console.log('📈 Generating Forecast Plan document...');
 await AllTabsExcelService.generateTabDocument(
 'forecast',
 UEFA_PROJECT.project_id,
 UEFA_PROJECT.project_code,
 UEFA_PROJECT.project_name,
 UEFA_FORECAST,
 'initial',
 'system'
 );
 generatedCount++;

 // 5. Generate Procurement Plan Document
 console.log('🛒 Generating Procurement Plan document...');
 await AllTabsExcelService.generateTabDocument(
 'procurement',
 UEFA_PROJECT.project_id,
 UEFA_PROJECT.project_code,
 UEFA_PROJECT.project_name,
 UEFA_PROCUREMENT,
 'initial',
 'system'
 );
 generatedCount++;

 // 6. Generate Indicators Document
 console.log('📊 Generating Indicators document...');
 await AllTabsExcelService.generateTabDocument(
 'indicators',
 UEFA_PROJECT.project_id,
 UEFA_PROJECT.project_code,
 UEFA_PROJECT.project_name,
 UEFA_INDICATORS,
 'initial',
 'system'
 );
 generatedCount++;

 // 7. Generate Beneficiaries Document
 console.log('👥 Generating Beneficiaries document...');
 await AllTabsExcelService.generateTabDocument(
 'beneficiaries',
 UEFA_PROJECT.project_id,
 UEFA_PROJECT.project_code,
 UEFA_PROJECT.project_name,
 UEFA_BENEFICIARIES,
 'initial',
 'system'
 );
 generatedCount++;

 console.log('\n✅ ======================================================');
 console.log(`✅ UEFA INITIALIZATION COMPLETE!`);
 console.log(`✅ Generated ${generatedCount} documents`);
 console.log('✅ ======================================================\n');

 console.log('📁 Documents are now available in Central Documents:');
 console.log(' - Activities_UEFA-FOUND-001_v1.0.xlsx');
 console.log(' - Tasks_UEFA-FOUND-001_v1.0.xlsx');
 console.log(' - Budget_vs_Actual_UEFA-FOUND-001_v1.0.xlsx');
 console.log(' - Forecast_UEFA-FOUND-001_v1.0.xlsx');
 console.log(' - Procurement_Plan_UEFA-FOUND-001_v1.0.xlsx');
 console.log(' - Indicator_Tracking_UEFA-FOUND-001_v1.0.xlsx');
 console.log(' - Beneficiaries_Register_UEFA-FOUND-001_v1.0.xlsx\n');

 console.log('🔄 All documents are synced and ready for SharePoint/OneDrive\n');

 } catch (error) {
 console.error('❌ Error initializing UEFA documents:', error);
 throw error;
 }
}

// ============================================================================
// EXPORT DATA FOR EXTERNAL USE
// ============================================================================

export const UEFAProjectData = {
 project: UEFA_PROJECT,
 activities: UEFA_ACTIVITIES,
 tasks: UEFA_TASKS,
 budget: UEFA_BUDGET,
 forecast: UEFA_FORECAST,
 procurement: UEFA_PROCUREMENT,
 indicators: UEFA_INDICATORS,
 beneficiaries: UEFA_BENEFICIARIES
};

export default {
 initializeUEFADocuments,
 UEFAProjectData
};
