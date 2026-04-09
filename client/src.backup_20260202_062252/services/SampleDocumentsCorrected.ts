/**
 * ============================================================================
 * SAMPLE DOCUMENTS - CORRECTED PROJECT-TAB-ALIGNED STRUCTURE
 * ============================================================================
 * 
 * Demonstrates the CORRECT folder structure:
 * - Activities
 * - Project Plan
 * - Tasks Management
 * - Case Management
 * - Indicators
 * - Beneficiaries
 * - Finance
 * - Forecast Plan
 * - Procurement Plan
 * - Project Reports
 * 
 * ============================================================================
 */

import { DocumentServiceCorrected, DocumentRecordCorrected } from './DocumentServiceCorrected';

// Sample PDF content (minimal valid PDF in Base64)
const SAMPLE_PDF_BASE64 = 'JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL1Jlc291cmNlczw8L0ZvbnQ8PC9GMSA1IDAgUj4+Pj4vTWVkaWFCb3hbMCAwIDYxMiA3OTJdL0NvbnRlbnRzIDQgMCBSPj4KZW5kb2JqCjQgMCBvYmoKPDwvTGVuZ3RoIDQ0Pj4Kc3RyZWFtCkJUCi9GMSA0OCBUZIP0bmcgMzA2IDM5NiBUZApTYW1wbGUgRG9jdW1lbnQKRVQKZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqCjw8L1R5cGUvRm9udC9TdWJ0eXBlL1R5cGUxL0Jhc2VGb250L1RpbWVzLVJvbWFuPj4KZW5kb2JqCjIgMCBvYmoKPDwvVHlwZS9QYWdlcy9LaWRzWzMgMCBSXS9Db3VudCAxPj4KZW5kb2JqCjEgMCBvYmoKPDwvVHlwZS9DYXRhbG9nL1BhZ2VzIDIgMCBSPj4KZW5kb2JqCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDIyNiAwMDAwMCBuIAowMDAwMDAwMTc1IDAwMDAwIG4gCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDEyNCAwMDAwMCBuIAowMDAwMDAwMTU0IDAwMDAwIG4gCnRyYWlsZXIKPDwvU2l6ZSA2L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKMjc1CiUlRU9G';

export function initializeCorrectedSampleDocuments() {
  // Clear old data
  // DocumentServiceCorrected.clearAll();

  // Create project folders first
  DocumentServiceCorrected.createProjectFolder(
    'PROJ-001',
    'PROJ-001',
    'Digital Literacy Enhancement Program',
    'برنامج تعزيز محو الأمية الرقمية',
    'System Admin'
  );

  DocumentServiceCorrected.createProjectFolder(
    'PROJ-002',
    'PROJ-002',
    'Community Health Initiative',
    'مبادرة الصحة المجتمعية',
    'System Admin'
  );

  // Create sample documents with CORRECTED structure
  const sampleDocs: Omit<DocumentRecordCorrected, 'document_id'>[] = [
    // ========== ACTIVITIES FOLDER ==========
    {
      project_id: 'PROJ-001',
      project_code: 'PROJ-001',
      project_name: 'Digital Literacy Enhancement Program',
      project_tab: 'activities',
      document_type: 'Activity Report',
      file_name: 'Training_Session_Report_Q1_2024.pdf',
      file_size: 1254896,
      mime_type: 'application/pdf',
      file_extension: 'pdf',
      file_data: SAMPLE_PDF_BASE64,
      folder_id: 'activities',
      folder_path: 'Documents/Projects/PROJ-001 - Digital Literacy Enhancement Program/Activities/',
      version: '1.0',
      status: 'Final',
      is_latest: true,
      uploaded_by: 'Sarah Johnson',
      uploaded_by_id: '1',
      uploaded_at: '2024-03-15T10:30:00Z',
      sync_status: 'synced',
      description: 'Q1 training session activity report'
    },
    {
      project_id: 'PROJ-001',
      project_code: 'PROJ-001',
      project_name: 'Digital Literacy Enhancement Program',
      project_tab: 'activities',
      document_type: 'Activity Photos',
      file_name: 'Training_Photos_March_2024.pdf',
      file_size: 3458963,
      mime_type: 'application/pdf',
      file_extension: 'pdf',
      file_data: SAMPLE_PDF_BASE64,
      folder_id: 'activities',
      folder_path: 'Documents/Projects/PROJ-001 - Digital Literacy Enhancement Program/Activities/',
      version: '1.0',
      status: 'Final',
      is_latest: true,
      uploaded_by: 'Maria Garcia',
      uploaded_by_id: '5',
      uploaded_at: '2024-03-20T14:00:00Z',
      sync_status: 'synced',
      description: 'Photos from March training sessions'
    },

    // ========== INDICATORS FOLDER ==========
    {
      project_id: 'PROJ-001',
      project_code: 'PROJ-001',
      project_name: 'Digital Literacy Enhancement Program',
      project_tab: 'indicators',
      document_type: 'Indicator Baseline',
      file_name: 'Baseline_Survey_Data_2024.xlsx',
      file_size: 2145896,
      mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      file_extension: 'xlsx',
      file_data: SAMPLE_PDF_BASE64,
      folder_id: 'indicators',
      folder_path: 'Documents/Projects/PROJ-001 - Digital Literacy Enhancement Program/Indicators/',
      version: '1.0',
      status: 'Final',
      is_latest: true,
      uploaded_by: 'Maria Garcia',
      uploaded_by_id: '5',
      uploaded_at: '2024-02-10T09:15:00Z',
      sync_status: 'synced',
      description: 'Baseline survey data for all indicators'
    },

    // ========== BENEFICIARIES FOLDER ==========
    {
      project_id: 'PROJ-001',
      project_code: 'PROJ-001',
      project_name: 'Digital Literacy Enhancement Program',
      project_tab: 'beneficiaries',
      document_type: 'Beneficiary List',
      file_name: 'Registered_Beneficiaries_Q1_2024.xlsx',
      file_size: 845632,
      mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      file_extension: 'xlsx',
      file_data: SAMPLE_PDF_BASE64,
      folder_id: 'beneficiaries',
      folder_path: 'Documents/Projects/PROJ-001 - Digital Literacy Enhancement Program/Beneficiaries/',
      version: '1.1',
      status: 'Final',
      is_latest: true,
      uploaded_by: 'Ahmad Hassan',
      uploaded_by_id: '2',
      uploaded_at: '2024-04-01T11:00:00Z',
      sync_status: 'synced',
      description: 'Updated beneficiary registration list'
    },

    // ========== FINANCE FOLDER ==========
    {
      project_id: 'PROJ-001',
      project_code: 'PROJ-001',
      project_name: 'Digital Literacy Enhancement Program',
      project_tab: 'finance',
      document_type: 'Budget',
      file_name: 'Detailed_Budget_2024.xlsx',
      file_size: 1254896,
      mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      file_extension: 'xlsx',
      file_data: SAMPLE_PDF_BASE64,
      folder_id: 'finance',
      folder_path: 'Documents/Projects/PROJ-001 - Digital Literacy Enhancement Program/Finance/',
      version: '1.2',
      status: 'Approved',
      is_latest: true,
      uploaded_by: 'Fatima Al-Rashid',
      uploaded_by_id: '3',
      uploaded_at: '2024-01-22T11:00:00Z',
      sync_status: 'synced',
      description: 'Approved project budget'
    },
    {
      project_id: 'PROJ-001',
      project_code: 'PROJ-001',
      project_name: 'Digital Literacy Enhancement Program',
      project_tab: 'finance',
      document_type: 'Financial Report',
      file_name: 'Q1_2024_Financial_Report.pdf',
      file_size: 956324,
      mime_type: 'application/pdf',
      file_extension: 'pdf',
      file_data: SAMPLE_PDF_BASE64,
      folder_id: 'finance',
      folder_path: 'Documents/Projects/PROJ-001 - Digital Literacy Enhancement Program/Finance/',
      version: '1.0',
      status: 'Final',
      is_latest: true,
      uploaded_by: 'Fatima Al-Rashid',
      uploaded_by_id: '3',
      uploaded_at: '2024-04-05T16:30:00Z',
      sync_status: 'pending',
      description: 'Q1 2024 financial report'
    },

    // ========== FORECAST PLAN FOLDER ==========
    {
      project_id: 'PROJ-001',
      project_code: 'PROJ-001',
      project_name: 'Digital Literacy Enhancement Program',
      project_tab: 'forecast',
      document_type: 'Forecast Plan',
      file_name: 'Cash_Forecast_2024_H2.xlsx',
      file_size: 658945,
      mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      file_extension: 'xlsx',
      file_data: SAMPLE_PDF_BASE64,
      folder_id: 'forecast-plan',
      folder_path: 'Documents/Projects/PROJ-001 - Digital Literacy Enhancement Program/Forecast_Plan/',
      version: '1.0',
      status: 'Draft',
      is_latest: true,
      uploaded_by: 'Fatima Al-Rashid',
      uploaded_by_id: '3',
      uploaded_at: '2024-06-10T10:00:00Z',
      sync_status: 'not_synced',
      description: 'H2 2024 cash forecast plan'
    },

    // ========== PROJECT REPORTS FOLDER ==========
    {
      project_id: 'PROJ-001',
      project_code: 'PROJ-001',
      project_name: 'Digital Literacy Enhancement Program',
      project_tab: 'reports',
      document_type: 'Quarterly Report',
      file_name: 'Q1_2024_Narrative_Report.pdf',
      file_size: 2854632,
      mime_type: 'application/pdf',
      file_extension: 'pdf',
      file_data: SAMPLE_PDF_BASE64,
      folder_id: 'project-reports',
      folder_path: 'Documents/Projects/PROJ-001 - Digital Literacy Enhancement Program/Project_Reports/',
      version: '2.0',
      status: 'Approved',
      is_latest: true,
      uploaded_by: 'Sarah Johnson',
      uploaded_by_id: '1',
      uploaded_at: '2024-04-15T15:00:00Z',
      sync_status: 'synced',
      description: 'Q1 2024 narrative report - final approved version'
    },

    // ========== PROCUREMENT PLAN FOLDER (Tab activated) ==========
    {
      project_id: 'PROJ-001',
      project_code: 'PROJ-001',
      project_name: 'Digital Literacy Enhancement Program',
      project_tab: 'procurement',
      document_type: 'Procurement Plan',
      file_name: 'Annual_Procurement_Plan_2024.xlsx',
      file_size: 754896,
      mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      file_extension: 'xlsx',
      file_data: SAMPLE_PDF_BASE64,
      folder_id: 'procurement-plan',
      folder_path: 'Documents/Projects/PROJ-001 - Digital Literacy Enhancement Program/Procurement_Plan/',
      version: '1.0',
      status: 'Final',
      is_latest: true,
      uploaded_by: 'John Smith',
      uploaded_by_id: '4',
      uploaded_at: '2024-02-01T10:00:00Z',
      sync_status: 'synced',
      description: 'Annual procurement plan for 2024'
    },
    {
      project_id: 'PROJ-001',
      project_code: 'PROJ-001',
      project_name: 'Digital Literacy Enhancement Program',
      project_tab: 'procurement',
      document_type: 'Purchase Order',
      file_name: 'PO_Laptops_Equipment_2024.pdf',
      file_size: 458963,
      mime_type: 'application/pdf',
      file_extension: 'pdf',
      file_data: SAMPLE_PDF_BASE64,
      folder_id: 'procurement-plan',
      folder_path: 'Documents/Projects/PROJ-001 - Digital Literacy Enhancement Program/Procurement_Plan/',
      version: '1.0',
      status: 'Approved',
      is_latest: true,
      uploaded_by: 'John Smith',
      uploaded_by_id: '4',
      uploaded_at: '2024-02-15T14:30:00Z',
      sync_status: 'synced',
      description: 'Purchase order for laptops and training equipment'
    },

    // ========== PROJECT 2 DOCUMENTS ==========
    {
      project_id: 'PROJ-002',
      project_code: 'PROJ-002',
      project_name: 'Community Health Initiative',
      project_tab: 'activities',
      document_type: 'Activity Report',
      file_name: 'Health_Screening_Campaign_Report.pdf',
      file_size: 1854632,
      mime_type: 'application/pdf',
      file_extension: 'pdf',
      file_data: SAMPLE_PDF_BASE64,
      folder_id: 'activities',
      folder_path: 'Documents/Projects/PROJ-002 - Community Health Initiative/Activities/',
      version: '1.0',
      status: 'Final',
      is_latest: true,
      uploaded_by: 'Maria Garcia',
      uploaded_by_id: '5',
      uploaded_at: '2024-05-10T12:00:00Z',
      sync_status: 'error',
      sync_error_message: 'SharePoint connection timeout',
      description: 'Community health screening campaign report'
    }
  ];

  // Create Procurement Plan folder for PROJ-001 (simulating tab activation)
  DocumentServiceCorrected.createTabFolder('PROJ-001', 'procurement-plan');

  // Save documents
  sampleDocs.forEach((doc, index) => {
    const fullDoc: DocumentRecordCorrected = {
      ...doc,
      document_id: `doc-corrected-${Date.now()}-${index}`
    };

    const stored = localStorage.getItem('pms_documents_corrected');
    const allDocs = stored ? JSON.parse(stored) : [];
    
    const exists = allDocs.some((d: DocumentRecordCorrected) => 
      d.file_name === fullDoc.file_name && 
      d.project_id === fullDoc.project_id &&
      d.project_tab === fullDoc.project_tab
    );

    if (!exists) {
      allDocs.push(fullDoc);
    }

    localStorage.setItem('pms_documents_corrected', JSON.stringify(allDocs));
  });

  // Initialize sync status
  const syncStatuses = {
    'PROJ-001': {
      project_id: 'PROJ-001',
      project_name: 'Digital Literacy Enhancement Program',
      sync_enabled: true,
      sync_provider: 'sharepoint' as const,
      sync_status: 'synced' as const,
      last_sync_at: '2024-06-15T16:00:00Z',
      total_documents: 10,
      synced_documents: 8,
      pending_documents: 1,
      failed_documents: 0
    },
    'PROJ-002': {
      project_id: 'PROJ-002',
      project_name: 'Community Health Initiative',
      sync_enabled: true,
      sync_provider: 'sharepoint' as const,
      sync_status: 'error' as const,
      last_sync_at: '2024-05-10T13:30:00Z',
      sync_error_message: 'SharePoint connection timeout',
      total_documents: 1,
      synced_documents: 0,
      pending_documents: 0,
      failed_documents: 1
    }
  };

  localStorage.setItem('pms_project_sync_status', JSON.stringify(syncStatuses));

  console.log('✅ CORRECTED sample documents initialized!');
  console.log(`📁 Created ${sampleDocs.length} documents with PROJECT-TAB-ALIGNED structure`);
  console.log('📊 Documents by folder:');
  console.log('   - Activities: 3 documents');
  console.log('   - Indicators: 1 document');
  console.log('   - Beneficiaries: 1 document');
  console.log('   - Finance: 2 documents');
  console.log('   - Forecast Plan: 1 document');
  console.log('   - Project Reports: 1 document');
  console.log('   - Procurement Plan: 2 documents');
}
