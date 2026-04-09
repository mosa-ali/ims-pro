/**
 * ============================================================================
 * SAMPLE DOCUMENTS FOR DEMONSTRATION
 * ============================================================================
 * 
 * Demonstrates:
 * - Documents from multiple modules (projects, finance, procurement, etc.)
 * - Auto-routing to correct folders (01_, 02_, 03_)
 * - Sync status tracking
 * - Version management
 * 
 * Run this once to populate the Document Management system with sample data
 * ============================================================================
 */

import { DocumentServiceEnhanced, DocumentRecordEnhanced } from './DocumentServiceEnhanced';

// Sample PDF content (minimal valid PDF in Base64)
const SAMPLE_PDF_BASE64 = 'JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL1Jlc291cmNlczw8L0ZvbnQ8PC9GMSA1IDAgUj4+Pj4vTWVkaWFCb3hbMCAwIDYxMiA3OTJdL0NvbnRlbnRzIDQgMCBSPj4KZW5kb2JqCjQgMCBvYmoKPDwvTGVuZ3RoIDQ0Pj4Kc3RyZWFtCkJUCi9GMSA0OCBUZIP0bmcgMzA2IDM5NiBUZApTYW1wbGUgRG9jdW1lbnQKRVQKZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqCjw8L1R5cGUvRm9udC9TdWJ0eXBlL1R5cGUxL0Jhc2VGb250L1RpbWVzLVJvbWFuPj4KZW5kb2JqCjIgMCBvYmoKPDwvVHlwZS9QYWdlcy9LaWRzWzMgMCBSXS9Db3VudCAxPj4KZW5kb2JqCjEgMCBvYmoKPDwvVHlwZS9DYXRhbG9nL1BhZ2VzIDIgMCBSPj4KZW5kb2JqCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDIyNiAwMDAwMCBuIAowMDAwMDAwMTc1IDAwMDAwIG4gCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDEyNCAwMDAwMCBuIAowMDAwMDAwMTU0IDAwMDAwIG4gCnRyYWlsZXIKPDwvU2l6ZSA2L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKMjc1CiUlRU9G';

export function initializeSampleDocuments() {
 // Clear existing documents first (for testing)
 // DocumentServiceEnhanced.clearAll();

 const sampleDocs: Omit<DocumentRecordEnhanced, 'document_id'>[] = [
 // ========== PROJECT DOCUMENTS (01_Project) ==========
 {
 project_id: 'PROJ-001',
 module: 'projects',
 document_type: 'Project Proposal',
 file_name: 'Digital_Literacy_Proposal_v2.0.pdf',
 file_size: 2458624,
 mime_type: 'application/pdf',
 file_extension: 'pdf',
 file_data: SAMPLE_PDF_BASE64,
 folder_code: '01',
 folder_path: 'Projects/PROJ-001/01_Project/',
 version: '2.0',
 status: 'Approved',
 is_latest: true,
 category: 'Programmatic',
 uploaded_by: 'Sarah Johnson',
 uploaded_by_id: '1',
 uploaded_at: '2024-01-15T10:30:00Z',
 sync_status: 'synced',
 sync_last_attempt: '2024-01-15T11:00:00Z',
 description: 'Main project proposal document - approved version'
 },
 {
 project_id: 'PROJ-001',
 module: 'projects',
 document_type: 'Logical Framework',
 file_name: 'LogFrame_Digital_Literacy.xlsx',
 file_size: 845632,
 mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 file_extension: 'xlsx',
 file_data: SAMPLE_PDF_BASE64,
 folder_code: '01',
 folder_path: 'Projects/PROJ-001/01_Project/',
 version: '1.0',
 status: 'Final',
 is_latest: true,
 category: 'Programmatic',
 uploaded_by: 'Sarah Johnson',
 uploaded_by_id: '1',
 uploaded_at: '2024-01-16T09:15:00Z',
 sync_status: 'synced',
 description: 'Project logical framework matrix'
 },

 // ========== GRANTS DOCUMENTS (02_Grants) ==========
 {
 project_id: 'PROJ-001',
 grant_id: 'GR-2024-001',
 module: 'grants',
 document_type: 'Grant Agreement',
 file_name: 'UNICEF_Grant_Agreement_Signed.pdf',
 file_size: 3254789,
 mime_type: 'application/pdf',
 file_extension: 'pdf',
 file_data: SAMPLE_PDF_BASE64,
 folder_code: '02',
 folder_path: 'Projects/PROJ-001/02_Grants/',
 version: '1.0',
 status: 'Approved',
 is_latest: true,
 category: 'Contractual',
 uploaded_by: 'Ahmad Hassan',
 uploaded_by_id: '2',
 uploaded_at: '2024-01-20T14:30:00Z',
 sync_status: 'synced',
 sharepoint_url: 'https://sharepoint.com/sites/projects/PROJ-001/02_Grants/UNICEF_Grant_Agreement_Signed.pdf',
 description: 'Signed grant agreement with UNICEF'
 },

 // ========== FINANCE DOCUMENTS (03_Finance) ==========
 {
 project_id: 'PROJ-001',
 budget_id: 'BUD-2024-001',
 module: 'finance',
 document_type: 'Budget',
 file_name: 'Detailed_Budget_2024.xlsx',
 file_size: 1254896,
 mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 file_extension: 'xlsx',
 file_data: SAMPLE_PDF_BASE64,
 folder_code: '03',
 folder_path: 'Projects/PROJ-001/03_Finance/',
 version: '1.2',
 status: 'Final',
 is_latest: true,
 category: 'Financial',
 uploaded_by: 'Fatima Al-Rashid',
 uploaded_by_id: '3',
 uploaded_at: '2024-01-22T11:00:00Z',
 sync_status: 'synced',
 description: 'Detailed project budget breakdown'
 },
 {
 project_id: 'PROJ-001',
 module: 'finance',
 document_type: 'Financial Report',
 file_name: 'Q1_2024_Financial_Report.pdf',
 file_size: 956324,
 mime_type: 'application/pdf',
 file_extension: 'pdf',
 file_data: SAMPLE_PDF_BASE64,
 folder_code: '03',
 folder_path: 'Projects/PROJ-001/03_Finance/',
 version: '1.0',
 status: 'Final',
 is_latest: true,
 category: 'Financial',
 uploaded_by: 'Fatima Al-Rashid',
 uploaded_by_id: '3',
 uploaded_at: '2024-04-05T16:30:00Z',
 sync_status: 'pending',
 description: 'Q1 2024 financial report'
 },

 // ========== PROCUREMENT DOCUMENTS (04_Procurement) ==========
 {
 project_id: 'PROJ-001',
 procurement_id: 'PO-2024-045',
 module: 'procurement',
 document_type: 'Purchase Order',
 file_name: 'PO_Laptops_and_Equipment.pdf',
 file_size: 458963,
 mime_type: 'application/pdf',
 file_extension: 'pdf',
 file_data: SAMPLE_PDF_BASE64,
 folder_code: '04',
 folder_path: 'Projects/PROJ-001/04_Procurement/',
 version: '1.0',
 status: 'Approved',
 is_latest: true,
 category: 'Contractual',
 uploaded_by: 'John Smith',
 uploaded_by_id: '4',
 uploaded_at: '2024-02-10T10:00:00Z',
 sync_status: 'synced',
 description: 'Purchase order for laptops and training equipment'
 },

 // ========== MEAL DOCUMENTS (05_MEAL) ==========
 {
 project_id: 'PROJ-001',
 module: 'meal',
 document_type: 'Baseline Survey',
 file_name: 'Baseline_Survey_Results_2024.xlsx',
 file_size: 2145896,
 mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 file_extension: 'xlsx',
 file_data: SAMPLE_PDF_BASE64,
 folder_code: '05',
 folder_path: 'Projects/PROJ-001/05_MEAL/',
 version: '1.0',
 status: 'Final',
 is_latest: true,
 category: 'Programmatic',
 uploaded_by: 'Maria Garcia',
 uploaded_by_id: '5',
 uploaded_at: '2024-02-25T13:45:00Z',
 sync_status: 'synced',
 description: 'Baseline survey data and analysis'
 },
 {
 project_id: 'PROJ-001',
 module: 'meal',
 document_type: 'Monitoring Report',
 file_name: 'Monthly_Monitoring_Report_March_2024.pdf',
 file_size: 1354789,
 mime_type: 'application/pdf',
 file_extension: 'pdf',
 file_data: SAMPLE_PDF_BASE64,
 folder_code: '05',
 folder_path: 'Projects/PROJ-001/05_MEAL/',
 version: '1.0',
 status: 'Final',
 is_latest: true,
 category: 'Programmatic',
 uploaded_by: 'Maria Garcia',
 uploaded_by_id: '5',
 uploaded_at: '2024-04-02T09:30:00Z',
 sync_status: 'not_synced',
 description: 'Monthly monitoring report for March 2024'
 },

 // ========== REPORTS DOCUMENTS (06_Reports) ==========
 {
 project_id: 'PROJ-001',
 report_id: 'REP-2024-Q1',
 module: 'reports',
 document_type: 'Quarterly Report',
 file_name: 'Q1_2024_Narrative_Report.pdf',
 file_size: 2854632,
 mime_type: 'application/pdf',
 file_extension: 'pdf',
 file_data: SAMPLE_PDF_BASE64,
 folder_code: '06',
 folder_path: 'Projects/PROJ-001/06_Reports/',
 version: '2.0',
 status: 'Approved',
 is_latest: true,
 category: 'Programmatic',
 uploaded_by: 'Sarah Johnson',
 uploaded_by_id: '1',
 uploaded_at: '2024-04-15T15:00:00Z',
 sync_status: 'synced',
 description: 'Q1 2024 narrative report - final version'
 },

 // ========== PROPOSALS DOCUMENTS (08_Proposals) ==========
 {
 project_id: 'PROJ-002',
 proposal_id: 'PROP-2024-005',
 module: 'proposals',
 document_type: 'Concept Note',
 file_name: 'Community_Health_Concept_Note.pdf',
 file_size: 1458963,
 mime_type: 'application/pdf',
 file_extension: 'pdf',
 file_data: SAMPLE_PDF_BASE64,
 folder_code: '08',
 folder_path: 'Projects/PROJ-002/08_Proposals/',
 version: '1.0',
 status: 'Draft',
 is_latest: true,
 category: 'Programmatic',
 uploaded_by: 'Ahmad Hassan',
 uploaded_by_id: '2',
 uploaded_at: '2024-05-01T10:00:00Z',
 sync_status: 'not_synced',
 description: 'Initial concept note for community health project'
 },

 // ========== SECOND PROJECT DOCUMENTS ==========
 {
 project_id: 'PROJ-002',
 module: 'projects',
 document_type: 'Project Charter',
 file_name: 'Community_Health_Charter.pdf',
 file_size: 854236,
 mime_type: 'application/pdf',
 file_extension: 'pdf',
 file_data: SAMPLE_PDF_BASE64,
 folder_code: '01',
 folder_path: 'Projects/PROJ-002/01_Project/',
 version: '1.0',
 status: 'Final',
 is_latest: true,
 category: 'Programmatic',
 uploaded_by: 'Sarah Johnson',
 uploaded_by_id: '1',
 uploaded_at: '2024-03-10T12:00:00Z',
 sync_status: 'error',
 sync_error_message: 'SharePoint connection timeout',
 description: 'Project charter document'
 }
 ];

 // Create sample documents in the system
 sampleDocs.forEach((doc, index) => {
 const fullDoc: DocumentRecordEnhanced = {
 ...doc,
 document_id: `doc-sample-${Date.now()}-${index}`
 };

 // Save directly to localStorage (bypassing upload to avoid Base64 conversion overhead)
 const stored = localStorage.getItem('pms_documents_enhanced');
 const allDocs = stored ? JSON.parse(stored) : [];
 
 // Only add if doesn't already exist
 const exists = allDocs.some((d: DocumentRecordEnhanced) => 
 d.file_name === fullDoc.file_name && 
 d.project_id === fullDoc.project_id &&
 d.module === fullDoc.module
 );

 if (!exists) {
 allDocs.push(fullDoc);
 }

 localStorage.setItem('pms_documents_enhanced', JSON.stringify(allDocs));
 });

 // Initialize sync status for projects
 const syncStatuses = {
 'PROJ-001': {
 project_id: 'PROJ-001',
 project_name: 'Digital Literacy Enhancement Program',
 sync_enabled: true,
 sync_provider: 'sharepoint' as const,
 sync_status: 'synced' as const,
 last_sync_at: '2024-04-15T16:00:00Z',
 total_documents: 9,
 synced_documents: 7,
 pending_documents: 1,
 failed_documents: 0
 },
 'PROJ-002': {
 project_id: 'PROJ-002',
 project_name: 'Community Health Initiative',
 sync_enabled: true,
 sync_provider: 'sharepoint' as const,
 sync_status: 'error' as const,
 last_sync_at: '2024-05-02T10:30:00Z',
 sync_error_message: 'SharePoint connection timeout',
 total_documents: 2,
 synced_documents: 0,
 pending_documents: 1,
 failed_documents: 1
 }
 };

 localStorage.setItem('pms_folder_sync_status', JSON.stringify(syncStatuses));

 console.log('✅ Sample documents initialized successfully!');
 console.log(`📁 Created ${sampleDocs.length} sample documents`);
 console.log('📊 Documents by module:');
 console.log(' - Projects: 3 documents');
 console.log(' - Grants: 1 document');
 console.log(' - Finance: 2 documents');
 console.log(' - Procurement: 1 document');
 console.log(' - MEAL: 2 documents');
 console.log(' - Reports: 1 document');
 console.log(' - Proposals: 1 document');
 console.log('');
 console.log('🔗 Navigate to /documents-enhanced to view all documents');
}
