/**
 * ============================================================================
 * MEAL CENTRAL DOCUMENT SERVICE
 * ============================================================================
 * 
 * Handles automatic folder creation, document sync, and versioning for MEAL
 * 
 * FEATURES:
 * - Auto-create MEAL folder structure on project creation
 * - Auto-sync documents from MEAL tabs
 * - Versioning for system-generated documents
 * - Bilingual folder labels (EN/AR)
 * - Read-only system documents
 * - Role-based access control (future)
 * 
 * FOLDER STRUCTURE:
 * /Documents
 * /Projects
 * /[Project Code] - [Project Name]
 * /MEAL
 * /01_Indicators (تتبع المؤشرات)
 * /02_Surveys (الاستبيانات)
 * /03_Reports (التقارير)
 * /04_Accountability (المساءلة)
 * /99_Other (أخرى)
 * 
 * ============================================================================
 */

import { v7 as uuidv7 } from 'uuid';

const uuidv4 = uuidv7;

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface DocumentFile {
 id: string;
 name: string;
 nameAr?: string;
 folderId: string;
 folderPath: string;
 fileType: 'excel' | 'pdf' | 'word' | 'csv' | 'image' | 'other';
 mimeType: string;
 size: number;
 version: number;
 isSystemGenerated: boolean;
 isReadOnly: boolean;
 sourceTab?: 'indicators' | 'surveys' | 'reports' | 'accountability';
 uploadedBy: string;
 uploadedAt: string;
 lastModified: string;
 url?: string; // For actual file storage (future phase)
 metadata?: Record<string, any>;
}

export interface FolderNode {
 id: string;
 name: string;
 nameAr: string;
 path: string;
 parentId: string | null;
 projectId?: string;
 isSystemFolder: boolean;
 isExpanded?: boolean;
 children?: FolderNode[];
 documentCount?: number;
 createdAt: string;
}

export interface MEALFolderStructure {
 indicators: string; // Folder ID for Indicators
 surveys: string; // Folder ID for Surveys
 reports: string; // Folder ID for Reports
 accountability: string; // Folder ID for Accountability
 other: string; // Folder ID for Other
}

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEYS = {
 FOLDERS: 'meal_document_folders',
 FILES: 'meal_document_files',
 PROJECT_MEAL_FOLDERS: 'meal_project_folder_map', // Maps projectId to MEAL folder IDs
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getFromStorage<T>(key: string): T[] {
 try {
 const data = localStorage.getItem(key);
 return data ? JSON.parse(data) : [];
 } catch (error) {
 console.error(`Error reading from localStorage (${key}):`, error);
 return [];
 }
}

function saveToStorage<T>(key: string, data: T[]): void {
 try {
 localStorage.setItem(key, JSON.stringify(data));
 } catch (error) {
 console.error(`Error writing to localStorage (${key}):`, error);
 }
}

// ============================================================================
// DOCUMENT SERVICE
// ============================================================================

export const documentService = {
 /**
 * AUTO-CREATE MEAL FOLDER STRUCTURE
 * Called automatically when a project is created
 */
 createMEALFolderStructure(projectId: string, projectCode: string, projectName: string): MEALFolderStructure {
 const folders = getFromStorage<FolderNode>(STORAGE_KEYS.FOLDERS);
 
 // Check if MEAL folders already exist for this project
 const projectFolderMap = this.getProjectMEALFolders(projectId);
 if (projectFolderMap) {
 console.log(`MEAL folders already exist for project ${projectId}`);
 return projectFolderMap;
 }

 // Create root Documents folder if it doesn't exist
 let rootFolder = folders.find(f => f.id === 'root');
 if (!rootFolder) {
 rootFolder = {
 id: 'root',
 name: 'Documents',
 nameAr: 'المستندات',
 path: '/Documents',
 parentId: null,
 isSystemFolder: true,
 isExpanded: true,
 createdAt: new Date().toISOString(),
 };
 folders.push(rootFolder);
 }

 // Create Projects folder if it doesn't exist
 let projectsFolder = folders.find(f => f.id === 'projects');
 if (!projectsFolder) {
 projectsFolder = {
 id: 'projects',
 name: 'Projects',
 nameAr: 'المشاريع',
 path: '/Documents/Projects',
 parentId: 'root',
 isSystemFolder: true,
 isExpanded: true,
 createdAt: new Date().toISOString(),
 };
 folders.push(projectsFolder);
 }

 // Create individual project folder
 const projectFolderId = `project-${projectId}`;
 const projectFolderName = `${projectCode} - ${projectName}`;
 const projectFolder: FolderNode = {
 id: projectFolderId,
 name: projectFolderName,
 nameAr: projectFolderName, // Same for now, can be customized
 path: `/Documents/Projects/${projectFolderName}`,
 parentId: 'projects',
 projectId,
 isSystemFolder: true,
 isExpanded: false,
 createdAt: new Date().toISOString(),
 };
 folders.push(projectFolder);

 // Create MEAL parent folder
 const mealFolderId = `meal-${projectId}`;
 const mealFolder: FolderNode = {
 id: mealFolderId,
 name: 'MEAL',
 nameAr: 'MEAL',
 path: `${projectFolder.path}/MEAL`,
 parentId: projectFolderId,
 projectId,
 isSystemFolder: true,
 isExpanded: false,
 createdAt: new Date().toISOString(),
 };
 folders.push(mealFolder);

 // Create MEAL sub-folders
 const mealSubFolders = [
 { 
 id: `meal-indicators-${projectId}`,
 name: '01_Indicators',
 nameAr: '01_تتبع المؤشرات',
 key: 'indicators'
 },
 { 
 id: `meal-surveys-${projectId}`,
 name: '02_Surveys',
 nameAr: '02_الاستبيانات',
 key: 'surveys'
 },
 { 
 id: `meal-reports-${projectId}`,
 name: '03_Reports',
 nameAr: '03_التقارير',
 key: 'reports'
 },
 { 
 id: `meal-accountability-${projectId}`,
 name: '04_Accountability',
 nameAr: '04_المساءلة',
 key: 'accountability'
 },
 { 
 id: `meal-other-${projectId}`,
 name: '99_Other',
 nameAr: '99_أخرى',
 key: 'other'
 },
 ];

 const folderMap: Record<string, string> = {};

 mealSubFolders.forEach(subFolder => {
 const folder: FolderNode = {
 id: subFolder.id,
 name: subFolder.name,
 nameAr: subFolder.nameAr,
 path: `${mealFolder.path}/${subFolder.name}`,
 parentId: mealFolderId,
 projectId,
 isSystemFolder: true,
 isExpanded: false,
 createdAt: new Date().toISOString(),
 };
 folders.push(folder);
 folderMap[subFolder.key] = subFolder.id;
 });

 // Save all folders
 saveToStorage(STORAGE_KEYS.FOLDERS, folders);

 // Save project -> MEAL folder mapping
 const projectMealMap = getFromStorage<Record<string, MEALFolderStructure>>(STORAGE_KEYS.PROJECT_MEAL_FOLDERS);
 const mealStructure: MEALFolderStructure = {
 indicators: folderMap.indicators,
 surveys: folderMap.surveys,
 reports: folderMap.reports,
 accountability: folderMap.accountability,
 other: folderMap.other,
 };
 
 const mapEntry = { projectId, ...mealStructure };
 projectMealMap.push(mapEntry as any);
 saveToStorage(STORAGE_KEYS.PROJECT_MEAL_FOLDERS, projectMealMap);

 console.log(`✅ MEAL folder structure created for project: ${projectCode}`);
 return mealStructure;
 },

 /**
 * GET MEAL FOLDER STRUCTURE FOR PROJECT
 */
 getProjectMEALFolders(projectId: string): MEALFolderStructure | null {
 const projectMealMap = getFromStorage<any>(STORAGE_KEYS.PROJECT_MEAL_FOLDERS);
 const entry = projectMealMap.find((m: any) => m.projectId === projectId);
 
 if (!entry) return null;
 
 return {
 indicators: entry.indicators,
 surveys: entry.surveys,
 reports: entry.reports,
 accountability: entry.accountability,
 other: entry.other,
 };
 },

 /**
 * AUTO-SYNC INDICATOR DOCUMENTS
 * Called when exporting indicator data
 */
 syncIndicatorDocument(
 projectId: string,
 fileName: string,
 fileData: Blob | null,
 userId: string,
 metadata?: Record<string, any>
 ): DocumentFile | null {
 const mealFolders = this.getProjectMEALFolders(projectId);
 if (!mealFolders) {
 console.error('MEAL folders not found for project:', projectId);
 return null;
 }

 const files = getFromStorage<DocumentFile>(STORAGE_KEYS.FILES);
 
 // Check existing versions
 const existingVersions = files.filter(
 f => f.folderId === mealFolders.indicators && f.name.startsWith(fileName.split('.')[0])
 );
 const nextVersion = existingVersions.length + 1;

 const document: DocumentFile = {
 id: uuidv4(),
 name: fileName,
 folderId: mealFolders.indicators,
 folderPath: this.getFolderPath(mealFolders.indicators),
 fileType: 'excel',
 mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 size: fileData?.size || 0,
 version: nextVersion,
 isSystemGenerated: true,
 isReadOnly: true,
 sourceTab: 'indicators',
 uploadedBy: userId,
 uploadedAt: new Date().toISOString(),
 lastModified: new Date().toISOString(),
 metadata,
 };

 files.push(document);
 saveToStorage(STORAGE_KEYS.FILES, files);

 console.log(`✅ Indicator document synced: ${fileName} (v${nextVersion})`);
 return document;
 },

 /**
 * AUTO-SYNC SURVEY DOCUMENTS
 */
 syncSurveyDocument(
 projectId: string,
 fileName: string,
 fileData: Blob | null,
 userId: string,
 metadata?: Record<string, any>
 ): DocumentFile | null {
 const mealFolders = this.getProjectMEALFolders(projectId);
 if (!mealFolders) {
 console.error('MEAL folders not found for project:', projectId);
 return null;
 }

 const files = getFromStorage<DocumentFile>(STORAGE_KEYS.FILES);
 
 const existingVersions = files.filter(
 f => f.folderId === mealFolders.surveys && f.name.startsWith(fileName.split('.')[0])
 );
 const nextVersion = existingVersions.length + 1;

 const document: DocumentFile = {
 id: uuidv4(),
 name: fileName,
 folderId: mealFolders.surveys,
 folderPath: this.getFolderPath(mealFolders.surveys),
 fileType: fileName.endsWith('.xlsx') ? 'excel' : 'csv',
 mimeType: fileName.endsWith('.xlsx') 
 ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
 : 'text/csv',
 size: fileData?.size || 0,
 version: nextVersion,
 isSystemGenerated: true,
 isReadOnly: true,
 sourceTab: 'surveys',
 uploadedBy: userId,
 uploadedAt: new Date().toISOString(),
 lastModified: new Date().toISOString(),
 metadata,
 };

 files.push(document);
 saveToStorage(STORAGE_KEYS.FILES, files);

 console.log(`✅ Survey document synced: ${fileName} (v${nextVersion})`);
 return document;
 },

 /**
 * AUTO-SYNC REPORT DOCUMENTS
 * Special naming: "MEAL Report – YYYY-MM-DD – Day"
 */
 syncReportDocument(
 projectId: string,
 reportDate: Date,
 fileData: Blob | null,
 userId: string,
 metadata?: Record<string, any>
 ): DocumentFile | null {
 const mealFolders = this.getProjectMEALFolders(projectId);
 if (!mealFolders) {
 console.error('MEAL folders not found for project:', projectId);
 return null;
 }

 const files = getFromStorage<DocumentFile>(STORAGE_KEYS.FILES);
 
 // Generate report name with special convention
 const dateStr = reportDate.toISOString().split('T')[0]; // YYYY-MM-DD
 const dayName = reportDate.toLocaleDateString('en-US', { weekday: 'long' });
 const fileName = `MEAL Report – ${dateStr} – ${dayName}.pdf`;

 const existingVersions = files.filter(
 f => f.folderId === mealFolders.reports && f.name.includes(dateStr)
 );
 const nextVersion = existingVersions.length + 1;

 const document: DocumentFile = {
 id: uuidv4(),
 name: fileName,
 folderId: mealFolders.reports,
 folderPath: this.getFolderPath(mealFolders.reports),
 fileType: 'pdf',
 mimeType: 'application/pdf',
 size: fileData?.size || 0,
 version: nextVersion,
 isSystemGenerated: true,
 isReadOnly: true,
 sourceTab: 'reports',
 uploadedBy: userId,
 uploadedAt: new Date().toISOString(),
 lastModified: new Date().toISOString(),
 metadata: {
 ...metadata,
 reportDate: dateStr,
 dayOfWeek: dayName,
 },
 };

 files.push(document);
 saveToStorage(STORAGE_KEYS.FILES, files);

 console.log(`✅ Report document synced: ${fileName} (v${nextVersion})`);
 return document;
 },

 /**
 * AUTO-SYNC ACCOUNTABILITY DOCUMENTS
 */
 syncAccountabilityDocument(
 projectId: string,
 fileName: string,
 fileData: Blob | null,
 userId: string,
 metadata?: Record<string, any>
 ): DocumentFile | null {
 const mealFolders = this.getProjectMEALFolders(projectId);
 if (!mealFolders) {
 console.error('MEAL folders not found for project:', projectId);
 return null;
 }

 const files = getFromStorage<DocumentFile>(STORAGE_KEYS.FILES);
 
 const existingVersions = files.filter(
 f => f.folderId === mealFolders.accountability && f.name.startsWith(fileName.split('.')[0])
 );
 const nextVersion = existingVersions.length + 1;

 const document: DocumentFile = {
 id: uuidv4(),
 name: fileName,
 folderId: mealFolders.accountability,
 folderPath: this.getFolderPath(mealFolders.accountability),
 fileType: fileName.endsWith('.pdf') ? 'pdf' : 'excel',
 mimeType: fileName.endsWith('.pdf') 
 ? 'application/pdf'
 : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 size: fileData?.size || 0,
 version: nextVersion,
 isSystemGenerated: true,
 isReadOnly: true,
 sourceTab: 'accountability',
 uploadedBy: userId,
 uploadedAt: new Date().toISOString(),
 lastModified: new Date().toISOString(),
 metadata: {
 ...metadata,
 sensitive: true, // Accountability data is sensitive
 },
 };

 files.push(document);
 saveToStorage(STORAGE_KEYS.FILES, files);

 console.log(`✅ Accountability document synced: ${fileName} (v${nextVersion})`);
 return document;
 },

 /**
 * GET ALL FOLDERS
 */
 getAllFolders(): FolderNode[] {
 return getFromStorage<FolderNode>(STORAGE_KEYS.FOLDERS);
 },

 /**
 * GET FOLDER BY ID
 */
 getFolder(folderId: string): FolderNode | null {
 const folders = getFromStorage<FolderNode>(STORAGE_KEYS.FOLDERS);
 return folders.find(f => f.id === folderId) || null;
 },

 /**
 * GET FOLDER PATH
 */
 getFolderPath(folderId: string): string {
 const folder = this.getFolder(folderId);
 return folder?.path || '/Documents';
 },

 /**
 * GET DOCUMENTS IN FOLDER
 */
 getDocumentsInFolder(folderId: string): DocumentFile[] {
 const files = getFromStorage<DocumentFile>(STORAGE_KEYS.FILES);
 return files.filter(f => f.folderId === folderId);
 },

 /**
 * GET ALL MEAL DOCUMENTS FOR PROJECT
 */
 getAllMEALDocuments(projectId: string): DocumentFile[] {
 const mealFolders = this.getProjectMEALFolders(projectId);
 if (!mealFolders) return [];

 const files = getFromStorage<DocumentFile>(STORAGE_KEYS.FILES);
 const folderIds = Object.values(mealFolders);
 
 return files.filter(f => folderIds.includes(f.folderId));
 },

 /**
 * GET FOLDER TREE FOR RENDERING
 */
 getFolderTree(): FolderNode | null {
 const folders = getFromStorage<FolderNode>(STORAGE_KEYS.FOLDERS);
 const files = getFromStorage<DocumentFile>(STORAGE_KEYS.FILES);
 
 // Build tree structure
 const buildTree = (parentId: string | null): FolderNode[] => {
 return folders
 .filter(f => f.parentId === parentId)
 .map(folder => ({
 ...folder,
 children: buildTree(folder.id),
 documentCount: files.filter(file => file.folderId === folder.id).length,
 }))
 .sort((a, b) => a.name.localeCompare(b.name));
 };

 const rootFolder = folders.find(f => f.id === 'root');
 if (!rootFolder) return null;

 return {
 ...rootFolder,
 children: buildTree('root'),
 documentCount: 0,
 };
 },

 /**
 * DELETE DOCUMENT (Admin only - future)
 */
 deleteDocument(documentId: string, userId: string): boolean {
 const files = getFromStorage<DocumentFile>(STORAGE_KEYS.FILES);
 const document = files.find(f => f.id === documentId);
 
 if (!document) {
 console.error('Document not found:', documentId);
 return false;
 }

 if (document.isReadOnly && document.isSystemGenerated) {
 console.error('Cannot delete system-generated read-only document');
 return false;
 }

 const updatedFiles = files.filter(f => f.id !== documentId);
 saveToStorage(STORAGE_KEYS.FILES, updatedFiles);

 console.log(`✅ Document deleted: ${document.name}`);
 return true;
 },

 /**
 * INITIALIZE SAMPLE DATA (Development only)
 */
 initializeSampleData(projectId: string, projectCode: string, projectName: string): void {
 // Create MEAL folder structure
 this.createMEALFolderStructure(projectId, projectCode, projectName);

 // Add sample documents
 this.syncIndicatorDocument(
 projectId,
 'Indicator Tracking Report - 2026-01.xlsx',
 null,
 'system',
 { month: '2026-01', indicators: 12 }
 );

 this.syncSurveyDocument(
 projectId,
 'Baseline Survey Results - 2026.xlsx',
 null,
 'system',
 { surveyType: 'baseline', responses: 245 }
 );

 this.syncReportDocument(
 projectId,
 new Date('2026-01-15'),
 null,
 'system',
 { reportType: 'monthly', period: 'January 2026' }
 );

 this.syncAccountabilityDocument(
 projectId,
 'Feedback Summary - Q1 2026.pdf',
 null,
 'system',
 { quarter: 'Q1', feedbackCount: 48 }
 );

 console.log('✅ Sample MEAL documents initialized');
 },
};
