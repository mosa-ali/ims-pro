/**
 * ============================================================================
 * DOCUMENT MANAGEMENT TYPES
 * System-wide document service types
 * ============================================================================
 */

export type DocumentModuleType = 
 | 'activities' 
 | 'project-plan' 
 | 'tasks-mgt' 
 | 'case-mgt' 
 | 'indicators'
 | 'beneficiaries'
 | 'finance'
 | 'forecast-plan'
 | 'procurement-plan'
 | 'project-report';

export type DocumentType = 
 | 'PROJECT_PROPOSAL'
 | 'GRANT_AGREEMENT'
 | 'BUDGET'
 | 'FINANCIAL_REPORT'
 | 'PROGRESS_REPORT'
 | 'PROCUREMENT_PLAN'
 | 'CONTRACT'
 | 'INDICATOR_DATA'
 | 'CASE_FILE'
 | 'HR_DOCUMENT'
 | 'OTHER';

export interface DocumentFolder {
 id: string;
 name: string;
 nameAr: string;
 path: string;
 projectId?: string;
 projectCode?: string;
 parentId?: string | null;
 moduleType?: DocumentModuleType;
 createdAt: string;
 createdBy: string;
 syncStatus?: 'synced' | 'pending' | 'error' | 'not_configured';
 syncProvider?: 'sharepoint' | 'onedrive' | null;
}

export interface DocumentFile {
 id: string;
 name: string;
 originalName: string;
 folderId: string;
 projectId?: string;
 moduleType: DocumentModuleType;
 documentType: DocumentType;
 version: number;
 fileSize: number;
 mimeType: string;
 uploadedBy: string;
 uploadedAt: string;
 description?: string;
 tags?: string[];
 // File reference (in production, this would be a URL or blob storage key)
 fileReference: string;
 // Versioning
 parentVersionId?: string;
 isLatestVersion: boolean;
}

export interface DocumentMetadata {
 projectId?: string;
 projectCode?: string;
 projectName?: string;
 moduleType: DocumentModuleType;
 documentType: DocumentType;
 uploadedBy: string;
 uploadedAt: string;
 version: number;
}

export interface SyncConfiguration {
 projectId: string;
 provider: 'sharepoint' | 'onedrive';
 enabled: boolean;
 syncMode: 'one-way' | 'two-way';
 lastSyncAt?: string;
 syncStatus: 'synced' | 'pending' | 'error';
 errorMessage?: string;
}

export const STANDARD_SUBFOLDERS: Array<{ 
 id: DocumentModuleType; 
 name: string; 
 nameAr: string; 
 order: number;
}> = [
 { id: 'activities', name: 'Activities', nameAr: 'أنشطة', order: 1 },
 { id: 'project-plan', name: 'Project Plan', nameAr: 'خطة المشروع', order: 2 },
 { id: 'tasks-mgt', name: 'Tasks Management', nameAr: 'إدارة المهام', order: 3 },
 { id: 'case-mgt', name: 'Case Management', nameAr: 'إدارة الحالات', order: 4 },
 { id: 'indicators', name: 'Indicators', nameAr: 'مؤشرات', order: 5 },
 { id: 'beneficiaries', name: 'Beneficiaries', nameAr: 'المستفيدين', order: 6 },
 { id: 'finance', name: 'Finance', nameAr: 'المالية', order: 7 },
 { id: 'forecast-plan', name: 'Forecast Plan', nameAr: 'خطة التنبؤ', order: 8 },
 { id: 'procurement-plan', name: 'Procurement Plan', nameAr: 'خطة المشتريات', order: 9 },
 { id: 'project-report', name: 'Project Report', nameAr: 'تقرير المشروع', order: 10 }
];

/**
 * Module-to-folder auto-routing map
 * Determines which folder documents are stored in based on originating module
 */
export const MODULE_FOLDER_ROUTING: Record<string, DocumentModuleType> = {
 'activities': 'activities',
 'project_plan': 'project-plan',
 'tasks': 'tasks-mgt',
 'case_management': 'case-mgt',
 'indicators': 'indicators',
 'beneficiaries': 'beneficiaries',
 'finance': 'finance',
 'budget': 'finance',
 'forecast': 'forecast-plan',
 'procurement': 'procurement-plan',
 'reports': 'project-report'
};