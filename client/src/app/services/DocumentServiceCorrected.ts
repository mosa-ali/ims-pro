/**
 * ============================================================================
 * FINAL SYSTEM-WIDE DOCUMENT SERVICE - REVISED MODULE ARCHITECTURE
 * ============================================================================
 * 
 * MANDATORY ARCHITECTURE - TOP-LEVEL MODULE WORKSPACES
 * 
 * Workspace Hierarchy:
 * 1. Project Workspace (Tab-driven outputs)
 * 2. MEAL Module (Advanced datasets & monitoring)
 * 3. Financial Management (Compliance & accounting)
 * 4. Logistics & Procurement (Supply chain & assets)
 * 5. Human Resources (Staff-centric - Cross-project)
 * 6. Donor CRM (Donor-centric - Cross-project)
 */

export type MainWorkspaceId = 'projects' | 'meal' | 'finance' | 'logistics' | 'hr' | 'donor';

export interface MainWorkspace {
 id: MainWorkspaceId;
 name_en: string;
 name_ar: string;
 type: 'project_indexed' | 'functional_indexed';
 description_en: string;
 description_ar: string;
}

export const MAIN_WORKSPACES: MainWorkspace[] = [
 {
 id: 'projects',
 name_en: 'Project Workspace',
 name_ar: 'مساحة عمل المشروع',
 type: 'project_indexed',
 description_en: 'Direct outputs from project dashboard tabs.',
 description_ar: 'المخرجات المباشرة من تبويبات لوحة معلومات المشروع.'
 },
 {
 id: 'meal',
 name_en: 'MEAL Module',
 name_ar: 'وحدة الرصد والتقييم',
 type: 'project_indexed',
 description_en: 'Advanced monitoring datasets and evaluation outputs.',
 description_ar: 'بيانات الرصد المتقدمة ومخرجات التقييم.'
 },
 {
 id: 'finance',
 name_en: 'Financial Management',
 name_ar: 'الإدارة المالية',
 type: 'project_indexed',
 description_en: 'Accounting, treasury, and financial compliance documents.',
 description_ar: 'وثائق المحاسبة والخزينة والامتثال المالي.'
 },
 {
 id: 'logistics',
 name_en: 'Logistics & Procurement',
 name_ar: 'الخدمات اللوجستية والمشتريات',
 type: 'project_indexed',
 description_en: 'Supply chain audit and vendor compliance documentation.',
 description_ar: 'وثائق تدقيق سلسلة التوريد والامتثال للموردين.'
 },
 {
 id: 'hr',
 name_en: 'Human Resources (HR)',
 name_ar: 'الموارد البشرية',
 type: 'functional_indexed',
 description_en: 'Staff registry, payroll, and organizational HR records.',
 description_ar: 'سجل الموظفين والرواتب وسجلات الموارد البشرية التنظيمية.'
 },
 {
 id: 'donor',
 name_en: 'Donor CRM',
 name_ar: 'إدارة ع��اقات المانحين',
 type: 'functional_indexed',
 description_en: 'Donor profiles, grant agreements, and proposals.',
 description_ar: 'ملفات المانحين واتفاقيات المنح والمقترحات.'
 }
];

export interface ModuleSubFolder {
 folder_id: string;
 workspace_id: MainWorkspaceId;
 name_en: string;
 name_ar: string;
 physical_name: string;
 format_standard: 'xlsx' | 'pdf' | 'mixed';
}

export const MODULE_SUB_FOLDERS: ModuleSubFolder[] = [
 // PROJECT WORKSPACE (Matches Project Dashboard Tabs - 12 Items)
 { folder_id: 'prj-fin-overview', workspace_id: 'projects', name_en: 'Financial Overview', name_ar: 'نظرة عامة مالية', physical_name: 'Financial_Overview', format_standard: 'xlsx' },
 { folder_id: 'prj-variance', workspace_id: 'projects', name_en: 'Variance Alerts', name_ar: 'تنبيهات الانحراف', physical_name: 'Variance_Alerts', format_standard: 'pdf' },
 { folder_id: 'prj-activities', workspace_id: 'projects', name_en: 'Activities', name_ar: 'الأنشطة', physical_name: 'Activities', format_standard: 'xlsx' },
 { folder_id: 'prj-indicators', workspace_id: 'projects', name_en: 'Project Indicators', name_ar: 'مؤشرات المشروع', physical_name: 'Project_Indicators', format_standard: 'xlsx' },
 { folder_id: 'prj-beneficiaries', workspace_id: 'projects', name_en: 'Beneficiaries', name_ar: 'المستفيدين', physical_name: 'Beneficiaries', format_standard: 'xlsx' },
 { folder_id: 'prj-cases', workspace_id: 'projects', name_en: 'Case Management', name_ar: 'إدارة الحالات', physical_name: 'Case_Management', format_standard: 'pdf' },
 { folder_id: 'prj-tasks', workspace_id: 'projects', name_en: 'Tasks', name_ar: 'المهام', physical_name: 'Tasks', format_standard: 'pdf' },
 { folder_id: 'prj-plan', workspace_id: 'projects', name_en: 'Project Plan', name_ar: 'خطة المشروع', physical_name: 'Project_Plan', format_standard: 'pdf' },
 { folder_id: 'prj-forecast', workspace_id: 'projects', name_en: 'Forecast Plan', name_ar: 'خطة التوقعات', physical_name: 'Forecast_Plan', format_standard: 'xlsx' },
 { folder_id: 'prj-procurement', workspace_id: 'projects', name_en: 'Procurement Plan', name_ar: 'خطة المشتريات', physical_name: 'Procurement_Plan', format_standard: 'xlsx' },
 { folder_id: 'prj-report', workspace_id: 'projects', name_en: 'Project Report', name_ar: 'تقرير المشروع', physical_name: 'Project_Report', format_standard: 'pdf' },
 { folder_id: 'prj-monthly', workspace_id: 'projects', name_en: 'Monthly Report', name_ar: 'التقرير الشهري', physical_name: 'Monthly_Report', format_standard: 'pdf' },

 // MEAL MODULE
 { folder_id: 'meal-datasets', workspace_id: 'meal', name_en: 'Monitoring Datasets', name_ar: 'بيانات الرصد', physical_name: 'Monitoring_Datasets', format_standard: 'xlsx' },
 { folder_id: 'meal-evals', workspace_id: 'meal', name_en: 'Evaluation Reports', name_ar: 'تقارير التقييم', physical_name: 'Evaluation_Reports', format_standard: 'pdf' },
 { folder_id: 'meal-frameworks', workspace_id: 'meal', name_en: 'Indicator Frameworks', name_ar: 'أطر المؤشرات', physical_name: 'Indicator_Frameworks', format_standard: 'pdf' },
 { folder_id: 'meal-tools', workspace_id: 'meal', name_en: 'Data Collection Tools', name_ar: 'أدوات جمع البيانات', physical_name: 'Data_Collection_Tools', format_standard: 'xlsx' },

 // FINANCE
 { folder_id: 'fin-budget', workspace_id: 'finance', name_en: 'Budget Documents', name_ar: 'وثائق الميزانية', physical_name: 'Budget_Documents', format_standard: 'xlsx' },
 { folder_id: 'fin-payments', workspace_id: 'finance', name_en: 'Payment Records', name_ar: 'سجلات الدفع', physical_name: 'Payment_Records', format_standard: 'pdf' },
 { folder_id: 'fin-advances', workspace_id: 'finance', name_en: 'Advances', name_ar: 'السلف', physical_name: 'Advances', format_standard: 'pdf' },
 { folder_id: 'fin-recon', workspace_id: 'finance', name_en: 'Bank Reconciliation', name_ar: 'تسوية بنكية', physical_name: 'Bank_Reconciliation', format_standard: 'xlsx' },
 { folder_id: 'fin-reports', workspace_id: 'finance', name_en: 'Financial Reports', name_ar: 'تقارير مالية', physical_name: 'Financial_Reports', format_standard: 'pdf' },
 { folder_id: 'fin-audit', workspace_id: 'finance', name_en: 'Audit Supporting Documents', name_ar: 'الوثائق الداعمة للتدقيق', physical_name: 'Audit_Supporting', format_standard: 'pdf' },

 // LOGISTICS
 { folder_id: 'log-po', workspace_id: 'logistics', name_en: 'Purchase Orders', name_ar: 'أوامر الشراء', physical_name: 'Purchase_Orders', format_standard: 'pdf' },
 { folder_id: 'log-contracts', workspace_id: 'logistics', name_en: 'Vendor Contracts', name_ar: 'عقود الموردين', physical_name: 'Vendor_Contracts', format_standard: 'pdf' },
 { folder_id: 'log-grn', workspace_id: 'logistics', name_en: 'Goods Received Notes', name_ar: 'إشعارات استلام البضائع', physical_name: 'Goods_Received_Notes', format_standard: 'pdf' },
 { folder_id: 'log-plans', workspace_id: 'logistics', name_en: 'Procurement Plans', name_ar: 'خطط المشتريات', physical_name: 'Procurement_Plans', format_standard: 'xlsx' },
 { folder_id: 'log-assets', workspace_id: 'logistics', name_en: 'Asset Delivery Documentation', name_ar: 'وثائق تسليم الأصول', physical_name: 'Asset_Delivery', format_standard: 'pdf' },
 { folder_id: 'log-tracking', workspace_id: 'logistics', name_en: 'Logistics Tracking Reports', name_ar: 'تقارير تتبع الخدمات اللوجستية', physical_name: 'Logistics_Tracking', format_standard: 'xlsx' },

 // HR (Functional)
 { folder_id: 'hr-registry', workspace_id: 'hr', name_en: 'Staff Registry', name_ar: 'سجل الموظفين', physical_name: 'Staff_Registry', format_standard: 'xlsx' },
 { folder_id: 'hr-payroll', workspace_id: 'hr', name_en: 'Payroll Records', name_ar: 'سجلات الرواتب', physical_name: 'Payroll_Records', format_standard: 'pdf' },
 { folder_id: 'hr-contracts', workspace_id: 'hr', name_en: 'Contracts', name_ar: 'العقود', physical_name: 'Contracts', format_standard: 'pdf' },
 { folder_id: 'hr-leave', workspace_id: 'hr', name_en: 'Leave & Attendance', name_ar: 'الإجازات والحضور', physical_name: 'Leave_Attendance', format_standard: 'xlsx' },
 { folder_id: 'hr-disc', workspace_id: 'hr', name_en: 'Disciplinary Records', name_ar: 'السجلات التأديبية', physical_name: 'Disciplinary_Records', format_standard: 'pdf' },
 { folder_id: 'hr-recruit', workspace_id: 'hr', name_en: 'Recruitment Files', name_ar: 'ملفات التوظيف', physical_name: 'Recruitment_Files', format_standard: 'pdf' },
 { folder_id: 'hr-reports', workspace_id: 'hr', name_en: 'Organizational HR Reports', name_ar: 'تقارير الموارد البشرية التنظيمية', physical_name: 'HR_Reports', format_standard: 'pdf' },

 // DONOR CRM (Functional)
 { folder_id: 'donor-profiles', workspace_id: 'donor', name_en: 'Donor Profiles', name_ar: 'ملفات المانحين', physical_name: 'Donor_Profiles', format_standard: 'pdf' },
 { folder_id: 'donor-grants', workspace_id: 'donor', name_en: 'Grant Agreements', name_ar: 'اتفاقيات المنح', physical_name: 'Grant_Agreements', format_standard: 'pdf' },
 { folder_id: 'donor-proposals', workspace_id: 'donor', name_en: 'Proposal Submissions', name_ar: 'تقديم المقترحات', physical_name: 'Proposal_Submissions', format_standard: 'pdf' },
 { folder_id: 'donor-comm', workspace_id: 'donor', name_en: 'Donor Communications', name_ar: 'اتصالات المانحين', physical_name: 'Donor_Communications', format_standard: 'pdf' },
 { folder_id: 'donor-reports', workspace_id: 'donor', name_en: 'Funding Reports', name_ar: 'تقارير التمويل', physical_name: 'Funding_Reports', format_standard: 'pdf' },
 { folder_id: 'donor-pipeline', workspace_id: 'donor', name_en: 'Pipeline Documentation', name_ar: 'وثائق التمويل المستقبلي', physical_name: 'Pipeline_Documentation', format_standard: 'xlsx' }
];

export interface DocumentRecordCorrected {
 document_id: string;
 workspace_id: MainWorkspaceId;
 project_id?: string; // Optional for functional workspaces
 project_code?: string;
 folder_id: string; 
 folder_path: string; 
 
 // Organization & OU Scoping
 organization_id: number;
 operating_unit_id: number;
 
 sync_source_module: string;
 sync_type: 'automatic' | 'manual';
 
 document_type: string; 
 file_name: string;
 file_size: number;
 mime_type: string;
 file_extension: string;
 file_data: string; 
 
 version: string; 
 status: 'Draft' | 'Final' | 'Approved' | 'Archived';
 is_latest: boolean; 
 
 uploaded_by: string;
 uploaded_at: string;
 
 tags?: string[];
}

class DocumentServiceCorrectedClass {
 private readonly STORAGE_KEY = 'pms_documents_v3';

 /**
 * AUTOMATIC SYNCHRONIZATION FROM SOURCE MODULES
 */
 async syncDocument(params: {
 workspace_id: MainWorkspaceId;
 folder_id: string;
 project_id?: string;
 organization_id: number;
 operating_unit_id: number;
 project_code?: string;
 document_type: string;
 file_name: string;
 file_data: string; // Base64
 file_extension: 'xlsx' | 'pdf';
 uploaded_by: string;
 source_module: string;
 }): Promise<DocumentRecordCorrected> {
 const workspace = MAIN_WORKSPACES.find(w => w.id === params.workspace_id);
 const subFolder = MODULE_SUB_FOLDERS.find(sf => sf.folder_id === params.folder_id);

 if (!workspace || !subFolder) throw new Error('Invalid workspace or folder configuration.');

 const folder_path = workspace.type === 'project_indexed' && params.project_code
 ? `Documents/${workspace.name_en}/${params.project_code}/${subFolder.physical_name}/`
 : `Documents/${workspace.name_en}/${subFolder.physical_name}/`;

 const document: DocumentRecordCorrected = {
 document_id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
 workspace_id: params.workspace_id,
 project_id: params.project_id,
 project_code: params.project_code,
 folder_id: params.folder_id,
 folder_path: folder_path,
 organization_id: params.organization_id,
 operating_unit_id: params.operating_unit_id,
 sync_source_module: params.source_module,
 sync_type: 'automatic',
 document_type: params.document_type,
 file_name: params.file_name,
 file_size: Math.floor(params.file_data.length * 0.75),
 mime_type: params.file_extension === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf',
 file_extension: params.file_extension,
 file_data: params.file_data,
 version: this.getNextVersion(params.workspace_id, params.folder_id, params.document_type, params.project_id),
 status: 'Final',
 is_latest: true,
 uploaded_by: params.uploaded_by,
 uploaded_at: new Date().toISOString()
 };

 this.saveDocument(document);
 return document;
 }

 getAllDocuments(): DocumentRecordCorrected[] {
 const stored = localStorage.getItem(this.STORAGE_KEY);
 return stored ? JSON.parse(stored) : [];
 }

 private saveDocument(doc: DocumentRecordCorrected): void {
 const all = this.getAllDocuments();
 all.forEach(d => {
 if (d.workspace_id === doc.workspace_id && d.folder_id === doc.folder_id && d.document_type === doc.document_type && d.project_id === doc.project_id) {
 d.is_latest = false;
 }
 });
 all.push(doc);
 localStorage.setItem(this.STORAGE_KEY, JSON.stringify(all));
 }

 private getNextVersion(w_id: string, f_id: string, type: string, p_id?: string): string {
 const existing = this.getAllDocuments().filter(d => d.workspace_id === w_id && d.folder_id === f_id && d.document_type === type && d.project_id === p_id);
 if (existing.length === 0) return '1.0';
 const max = Math.max(...existing.map(d => parseFloat(d.version)));
 return (max + 0.1).toFixed(1);
 }

 downloadDocument(id: string): void {
 const d = this.getAllDocuments().find(doc => doc.document_id === id);
 if (!d) return;
 const bytes = atob(d.file_data);
 const arr = new Uint8Array(bytes.length);
 for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
 const blob = new Blob([arr], { type: d.mime_type });
 const url = URL.createObjectURL(blob);
 const link = document.createElement('a');
 link.href = url;
 link.download = d.file_name;
 link.click();
 URL.revokeObjectURL(url);
 }

 viewDocument(id: string): void {
 const d = this.getAllDocuments().find(doc => doc.document_id === id);
 if (!d) return;
 if (d.file_extension === 'pdf') {
 const bytes = atob(d.file_data);
 const arr = new Uint8Array(bytes.length);
 for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
 const blob = new Blob([arr], { type: d.mime_type });
 window.open(URL.createObjectURL(blob), '_blank');
 } else {
 this.downloadDocument(id);
 }
 }
}

export const DocumentServiceCorrected = new DocumentServiceCorrectedClass();
