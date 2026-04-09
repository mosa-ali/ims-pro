/**
 * ============================================================================
 * INITIALIZE SYSTEM-GENERATED DOCUMENTS
 * ============================================================================
 * 
 * Creates sample auto-generated Excel files for testing
 * 
 * ============================================================================
 */

import { ExcelGenerationService } from './ExcelGenerationService';

export function initializeSystemGeneratedDocuments() {
  console.log('📊 Initializing system-generated documents...');

  // ============================================================================
  // SAMPLE ACTIVITIES DATA
  // ============================================================================

  const proj001Activities = [
    {
      activity_code: 'ACT-1.1',
      activity_name: 'Digital Skills Training - Basic Level',
      activity_name_ar: 'التدريب على المهارات الرقمية - المستوى الأساسي',
      department: 'Program',
      start_date: '2024-01-15',
      end_date: '2024-03-31',
      status: 'Completed',
      responsible_name: 'Sarah Johnson',
      progress: 100,
      tasks: []
    },
    {
      activity_code: 'ACT-1.2',
      activity_name: 'Digital Skills Training - Intermediate Level',
      activity_name_ar: 'التدريب على المهارات الرقمية - المستوى المتوسط',
      department: 'Program',
      start_date: '2024-04-01',
      end_date: '2024-06-30',
      status: 'Ongoing',
      responsible_name: 'Ahmad Hassan',
      progress: 65,
      tasks: []
    },
    {
      activity_code: 'ACT-2.1',
      activity_name: 'Community Awareness Campaigns',
      activity_name_ar: 'حملات التوعية المجتمعية',
      department: 'MEAL',
      start_date: '2024-02-01',
      end_date: '2024-12-31',
      status: 'Ongoing',
      responsible_name: 'Maria Garcia',
      progress: 45,
      tasks: []
    },
    {
      activity_code: 'ACT-3.1',
      activity_name: 'Equipment Distribution',
      activity_name_ar: 'توزيع المعدات',
      department: 'Procurement',
      start_date: '2024-03-01',
      end_date: '2024-05-31',
      status: 'Ongoing',
      responsible_name: 'John Smith',
      progress: 80,
      tasks: []
    },
    {
      activity_code: 'ACT-4.1',
      activity_name: 'Monitoring & Evaluation',
      activity_name_ar: 'المراقبة والتقييم',
      department: 'MEAL',
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      status: 'Ongoing',
      responsible_name: 'Maria Garcia',
      progress: 40,
      tasks: []
    }
  ];

  const proj001Tasks = [
    {
      task_code: 'TASK-1.1.1',
      task_name: 'Prepare training materials',
      task_name_ar: 'إعداد المواد التدريبية',
      activity_code: 'ACT-1.1',
      start_date: '2024-01-15',
      end_date: '2024-01-31',
      status: 'Completed',
      responsible: 'Sarah Johnson'
    },
    {
      task_code: 'TASK-1.1.2',
      task_name: 'Conduct training sessions',
      task_name_ar: 'إجراء جلسات تدريبية',
      activity_code: 'ACT-1.1',
      start_date: '2024-02-01',
      end_date: '2024-03-31',
      status: 'Completed',
      responsible: 'Sarah Johnson'
    },
    {
      task_code: 'TASK-1.2.1',
      task_name: 'Recruit trainers',
      task_name_ar: 'توظيف المدربين',
      activity_code: 'ACT-1.2',
      start_date: '2024-04-01',
      end_date: '2024-04-15',
      status: 'Completed',
      responsible: 'Ahmad Hassan'
    },
    {
      task_code: 'TASK-1.2.2',
      task_name: 'Conduct intermediate training',
      task_name_ar: 'إجراء التدريب المتوسط',
      activity_code: 'ACT-1.2',
      start_date: '2024-04-16',
      end_date: '2024-06-30',
      status: 'Ongoing',
      responsible: 'Ahmad Hassan'
    },
    {
      task_code: 'TASK-3.1.1',
      task_name: 'Procure laptops',
      task_name_ar: 'شراء أجهزة الكمبيوتر المحمولة',
      activity_code: 'ACT-3.1',
      start_date: '2024-03-01',
      end_date: '2024-04-30',
      status: 'Completed',
      responsible: 'John Smith'
    },
    {
      task_code: 'TASK-3.1.2',
      task_name: 'Distribute equipment to beneficiaries',
      task_name_ar: 'توزيع المعدات على المستفيدين',
      activity_code: 'ACT-3.1',
      start_date: '2024-05-01',
      end_date: '2024-05-31',
      status: 'Ongoing',
      responsible: 'John Smith'
    }
  ];

  const proj002Activities = [
    {
      activity_code: 'ACT-1.1',
      activity_name: 'Health Screening Campaigns',
      activity_name_ar: 'حملات الفحص الصحي',
      department: 'Health',
      start_date: '2024-01-01',
      end_date: '2024-06-30',
      status: 'Ongoing',
      responsible_name: 'Maria Garcia',
      progress: 55,
      tasks: []
    },
    {
      activity_code: 'ACT-2.1',
      activity_name: 'Nutrition Awareness Sessions',
      activity_name_ar: 'جلسات التوعية بالتغذية',
      department: 'Health',
      start_date: '2024-02-01',
      end_date: '2024-08-31',
      status: 'Ongoing',
      responsible_name: 'Maria Garcia',
      progress: 40,
      tasks: []
    },
    {
      activity_code: 'ACT-3.1',
      activity_name: 'Medical Supply Distribution',
      activity_name_ar: 'توزيع الإمدادات الطبية',
      department: 'Health',
      start_date: '2024-03-01',
      end_date: '2024-12-31',
      status: 'Not Started',
      responsible_name: 'Ahmad Hassan',
      progress: 0,
      tasks: []
    }
  ];

  // ============================================================================
  // GENERATE DOCUMENTS
  // ============================================================================

  try {
    // Generate Activities Excel for PROJ-001 (Version 1 - Initial)
    const doc1 = await ExcelGenerationService.generateActivitiesExcel({
      project_id: 'PROJ-001',
      project_code: 'PROJ-001',
      project_name: 'Digital Literacy Enhancement Program',
      trigger: 'create',
      activities: proj001Activities,
      tasks: proj001Tasks
    });

    console.log(`✅ Generated: ${doc1.file_name}`);

    // Simulate an update - Generate Version 2
    // (In real app, this would happen when activities are updated)
    await new Promise(resolve => setTimeout(resolve, 100));

    const doc2 = await ExcelGenerationService.generateActivitiesExcel({
      project_id: 'PROJ-001',
      project_code: 'PROJ-001',
      project_name: 'Digital Literacy Enhancement Program',
      trigger: 'update',
      activities: proj001Activities,
      tasks: proj001Tasks
    });

    console.log(`✅ Generated: ${doc2.file_name} (updated version)`);

    // Generate Activities Excel for PROJ-002
    const doc3 = await ExcelGenerationService.generateActivitiesExcel({
      project_id: 'PROJ-002',
      project_code: 'PROJ-002',
      project_name: 'Community Health Initiative',
      trigger: 'create',
      activities: proj002Activities,
      tasks: []
    });

    console.log(`✅ Generated: ${doc3.file_name}`);

    // ============================================================================
    // SUMMARY
    // ============================================================================

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ SYSTEM-GENERATED DOCUMENTS INITIALIZED');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 Documents Generated:');
    console.log(`   - PROJ-001: ${doc1.file_name}`);
    console.log(`   - PROJ-001: ${doc2.file_name} (v2 - latest)`);
    console.log(`   - PROJ-002: ${doc3.file_name}`);
    console.log('');
    console.log('📄 Total Activities: 8');
    console.log('📋 Total Tasks: 6');
    console.log('🔒 All documents: READ-ONLY');
    console.log('🚫 Upload: NOT ALLOWED');
    console.log('✅ Download: ALLOWED');
    console.log('═══════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Failed to initialize system-generated documents:', error);
  }
}

/**
 * DEMO: Trigger regeneration
 * Call this when activities change
 */
export async function demoRegenerateActivities() {
  console.log('🔄 Demo: Triggering regeneration...');

  const activities = [
    {
      activity_code: 'ACT-1.1',
      activity_name: 'Digital Skills Training - Updated',
      activity_name_ar: 'التدريب على المهارات الرقمية - محدث',
      department: 'Program',
      start_date: '2024-01-15',
      end_date: '2024-03-31',
      status: 'Completed',
      responsible_name: 'Sarah Johnson',
      progress: 100,
      tasks: []
    }
  ];

  const doc = await ExcelGenerationService.triggerRegeneration(
    'PROJ-001',
    'PROJ-001',
    'Digital Literacy Enhancement Program',
    'update',
    activities,
    []
  );

  console.log(`✅ Regenerated: ${doc.file_name}`);
  console.log(`   Version: ${doc.version}`);
  
  return doc;
}
