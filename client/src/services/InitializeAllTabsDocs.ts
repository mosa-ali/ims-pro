/**
 * ============================================================================
 * INITIALIZE ALL PROJECT TABS SYSTEM-GENERATED DOCUMENTS
 * ============================================================================
 * 
 * Creates sample documents for ALL 10 project tabs
 * 
 * ============================================================================
 */

import { AllTabsExcelService, ALL_PROJECT_TABS } from './AllTabsExcelGenerationService';

export async function initializeAllTabsDocuments() {
 console.log('📊 Initializing system-generated documents for ALL project tabs...');

 // Sample data for each tab
 const sampleData = {
 // 1. Activities
 activities: [
 { activity_code: 'ACT-1.1', name: 'Digital Skills Training', status: 'Completed', progress: 100 },
 { activity_code: 'ACT-1.2', name: 'Community Awareness', status: 'Ongoing', progress: 65 },
 { activity_code: 'ACT-2.1', name: 'Equipment Distribution', status: 'Ongoing', progress: 80 }
 ],

 // 2. Project Plan
 'project-plan': {
 milestones: [
 { milestone: 'Project Initiation', date: '2024-01-15', status: 'Completed' },
 { milestone: 'Mid-term Review', date: '2024-06-30', status: 'Pending' }
 ],
 objectives: ['Objective 1', 'Objective 2'],
 timeline: '12 months'
 },

 // 3. Tasks
 tasks: [
 { task_code: 'TASK-1', name: 'Prepare training materials', status: 'Completed', assignee: 'Sarah' },
 { task_code: 'TASK-2', name: 'Conduct training sessions', status: 'Ongoing', assignee: 'Ahmad' },
 { task_code: 'TASK-3', name: 'Monitor progress', status: 'Not Started', assignee: 'Maria' }
 ],

 // 4. Cases
 cases: [
 { case_id: 'CASE-001', beneficiary: 'Ahmed Ali', status: 'Active', priority: 'High' },
 { case_id: 'CASE-002', beneficiary: 'Fatima Hassan', status: 'Closed', priority: 'Medium' }
 ],

 // 5. Indicators
 indicators: [
 { indicator: '# of trained participants', baseline: 0, target: 500, actual: 350, achievement: '70%' },
 { indicator: '% of participants passing assessment', baseline: 0, target: 80, actual: 75, achievement: '94%' }
 ],

 // 6. Beneficiaries
 beneficiaries: [
 { id: 'BEN-001', name: 'Ahmed Ali', age: 25, gender: 'Male', status: 'Active' },
 { id: 'BEN-002', name: 'Fatima Hassan', age: 30, gender: 'Female', status: 'Active' },
 { id: 'BEN-003', name: 'Mohammed Said', age: 22, gender: 'Male', status: 'Active' }
 ],

 // 7. Finance
 finance: {
 budget_total: 500000,
 actual_spent: 325000,
 committed: 50000,
 available: 125000,
 variance: '+25%',
 categories: [
 { category: 'Personnel', budget: 200000, actual: 150000 },
 { category: 'Equipment', budget: 150000, actual: 100000 },
 { category: 'Training', budget: 100000, actual: 75000 }
 ]
 },

 // 8. Forecast
 forecast: [
 { month: 'Jan 2024', planned: 40000, forecasted: 38000, variance: -5 },
 { month: 'Feb 2024', planned: 45000, forecasted: 47000, variance: +4.4 },
 { month: 'Mar 2024', planned: 50000, forecasted: 52000, variance: +4 }
 ],

 // 9. Procurement
 procurement: [
 { item: 'Laptops (50 units)', status: 'Delivered', value: 50000, supplier: 'Tech Co.' },
 { item: 'Projectors (10 units)', status: 'In Transit', value: 15000, supplier: 'Office Supplies Ltd' },
 { item: 'Training Materials', status: 'Ordered', value: 5000, supplier: 'Print House' }
 ],

 // 10. Reports
 reports: {
 report_type: 'Quarterly Progress Report',
 period: 'Q1 2024',
 status: 'Draft',
 sections: ['Executive Summary', 'Activities', 'Results', 'Challenges', 'Next Steps'],
 submitted: false
 }
 };

 const projects = [
 {
 project_id: 'PROJ-001',
 project_code: 'PROJ-001',
 project_name: 'Digital Literacy Enhancement Program'
 },
 {
 project_id: 'PROJ-002',
 project_code: 'PROJ-002',
 project_name: 'Community Health Initiative'
 }
 ];

 try {
 let totalGenerated = 0;

 // Generate documents for each project and each tab
 for (const project of projects) {
 console.log(`\n📁 Generating documents for ${project.project_code}...`);

 for (const tabConfig of ALL_PROJECT_TABS) {
 // Get sample data for this tab
 const tabData = sampleData[tabConfig.tab_id];
 
 if (tabData) {
 // Generate initial version
 const doc = await AllTabsExcelService.generateTabDocument(
 tabConfig.tab_id,
 project.project_id,
 project.project_code,
 project.project_name,
 tabData,
 'initial'
 );

 console.log(` ✅ ${tabConfig.tab_name_en}: ${doc.file_name}`);
 totalGenerated++;
 }
 }
 }

 // Generate a version 2 for some tabs (simulate updates)
 console.log(`\n🔄 Generating updated versions (v2) for select tabs...`);

 // Update Activities for PROJ-001
 const updatedActivities = [
 ...sampleData.activities,
 { activity_code: 'ACT-3.1', name: 'Follow-up Assessment', status: 'Not Started', progress: 0 }
 ];

 const doc2 = await AllTabsExcelService.generateTabDocument(
 'activities',
 'PROJ-001',
 'PROJ-001',
 'Digital Literacy Enhancement Program',
 updatedActivities,
 'data_change'
 );

 console.log(` ✅ Activities (updated): ${doc2.file_name}`);
 totalGenerated++;

 // Update Finance for PROJ-001
 const updatedFinance = {
 ...sampleData.finance,
 actual_spent: 340000,
 available: 110000
 };

 const doc3 = await AllTabsExcelService.generateTabDocument(
 'finance',
 'PROJ-001',
 'PROJ-001',
 'Digital Literacy Enhancement Program',
 updatedFinance,
 'data_change'
 );

 console.log(` ✅ Finance (updated): ${doc3.file_name}`);
 totalGenerated++;

 // ============================================================================
 // SUMMARY
 // ============================================================================

 console.log('\n═══════════════════════════════════════════════════════════');
 console.log('✅ ALL TABS SYSTEM-GENERATED DOCUMENTS INITIALIZED');
 console.log('═══════════════════════════════════════════════════════════');
 console.log(`📊 Total Documents Generated: ${totalGenerated}`);
 console.log(`📁 Projects: ${projects.length}`);
 console.log(`📋 Tabs per Project: ${ALL_PROJECT_TABS.length}`);
 console.log('');
 console.log('📄 Document Types:');
 ALL_PROJECT_TABS.forEach(tab => {
 console.log(` - ${tab.tab_name_en} (${tab.file_prefix}${tab.file_extension})`);
 });
 console.log('');
 console.log('🔒 All documents: SYSTEM-GENERATED, READ-ONLY');
 console.log('🚫 Upload: NOT ALLOWED');
 console.log('🚫 Edit: NOT ALLOWED');
 console.log('✅ Download: ALLOWED');
 console.log('🔄 Sync Data: ROLE-BASED');
 console.log('═══════════════════════════════════════════════════════════');

 } catch (error) {
 console.error('❌ Failed to initialize documents:', error);
 throw error;
 }
}

/**
 * DEMO: Manual Sync Data
 */
export async function demoManualSync(
 document_id: string,
 user_name: string,
 user_role: string
) {
 console.log(`\n🔄 DEMO: Manual Sync Data triggered by ${user_name} (${user_role})`);

 try {
 const result = await AllTabsExcelService.syncData({
 document_id,
 triggered_by_user: user_name,
 user_role
 });

 console.log(`✅ Sync complete!`);
 console.log(` New file: ${result.file_name}`);
 console.log(` Version: v${result.version}`);
 console.log(` Records: ${result.record_count}`);

 return result;
 } catch (error) {
 console.error(`❌ Sync failed:`, error);
 throw error;
 }
}
