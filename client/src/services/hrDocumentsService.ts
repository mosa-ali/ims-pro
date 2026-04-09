/**
 * ============================================================================
 * HR DOCUMENTS SERVICE
 * ============================================================================
 * 
 * Central archive for all HR documents
 * Read-only metadata store (not a form system)
 * Auto-synced from source modules
 * 
 * ============================================================================
 */

export interface HRDocument {
 documentId: string;
 staffId: string;
 staffFullName: string;
 documentType: 'Contract' | 'Appraisal' | 'Disciplinary' | 'Clearance' | 'Exit' | 'Recruitment' | 'Reference' | 'Offer Letter' | 'Training' | 'Leave';
 sourceModule: 'Recruitment' | 'Payroll' | 'Performance' | 'Disciplinary' | 'Exit' | 'Employees Profiles' | 'Leave' | 'Training' | 'Salary Scale';
 referenceId: string; // ID of the source record
 fileName: string;
 fileDescription?: string;
 createdBy: string;
 createdDate: string;
 locked: boolean;
 folder: 'Contracts' | 'Performance' | 'Disciplinary' | 'Training' | 'Exit & Offboarding' | 'Recruitment';
}

export interface DocumentFolder {
 folderId: string;
 folderName: string;
 displayOrder: number;
 documentCount: number;
}

const STORAGE_KEY = 'hr_documents';
const FOLDERS_KEY = 'hr_document_folders';

class HRDocumentsService {
 
 // Initialize folders
 initializeFolders(): void {
 const existing = localStorage.getItem(FOLDERS_KEY);
 if (!existing) {
 const defaultFolders: DocumentFolder[] = [
 { folderId: 'F1', folderName: 'Contracts', displayOrder: 1, documentCount: 0 },
 { folderId: 'F2', folderName: 'Performance', displayOrder: 2, documentCount: 0 },
 { folderId: 'F3', folderName: 'Disciplinary', displayOrder: 3, documentCount: 0 },
 { folderId: 'F4', folderName: 'Training', displayOrder: 4, documentCount: 0 },
 { folderId: 'F5', folderName: 'Exit & Offboarding', displayOrder: 5, documentCount: 0 },
 { folderId: 'F6', folderName: 'Recruitment', displayOrder: 6, documentCount: 0 }
 ];
 localStorage.setItem(FOLDERS_KEY, JSON.stringify(defaultFolders));
 }
 }

 // Get all folders
 getFolders(): DocumentFolder[] {
 this.initializeFolders();
 const data = localStorage.getItem(FOLDERS_KEY);
 if (!data) return [];
 const folders: DocumentFolder[] = JSON.parse(data);
 
 // Update document counts
 const documents = this.getAll();
 folders.forEach(folder => {
 folder.documentCount = documents.filter(doc => doc.folder === folder.folderName).length;
 });
 
 return folders.sort((a, b) => a.displayOrder - b.displayOrder);
 }

 // Get all documents
 getAll(): HRDocument[] {
 const data = localStorage.getItem(STORAGE_KEY);
 if (!data) return [];
 return JSON.parse(data);
 }

 // Get by staff ID
 getByStaffId(staffId: string): HRDocument[] {
 return this.getAll().filter(doc => doc.staffId === staffId);
 }

 // Get by folder
 getByFolder(folderName: string): HRDocument[] {
 return this.getAll().filter(doc => doc.folder === folderName);
 }

 // Get by document type
 getByType(documentType: string): HRDocument[] {
 return this.getAll().filter(doc => doc.documentType === documentType);
 }

 // Get by ID
 getById(documentId: string): HRDocument | null {
 return this.getAll().find(doc => doc.documentId === documentId) || null;
 }

 // Add document (called by source modules)
 add(document: Omit<HRDocument, 'documentId' | 'createdDate' | 'locked'>): HRDocument {
 const documents = this.getAll();
 
 const newDocument: HRDocument = {
 ...document,
 documentId: `DOC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
 createdDate: new Date().toISOString(),
 locked: false
 };
 
 documents.push(newDocument);
 localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
 
 return newDocument;
 }

 // Lock document (prevent deletion)
 lock(documentId: string): boolean {
 const documents = this.getAll();
 const doc = documents.find(d => d.documentId === documentId);
 if (!doc) return false;
 
 doc.locked = true;
 localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
 return true;
 }

 // Unlock document
 unlock(documentId: string): boolean {
 const documents = this.getAll();
 const doc = documents.find(d => d.documentId === documentId);
 if (!doc) return false;
 
 doc.locked = false;
 localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
 return true;
 }

 // Delete document (only if not locked)
 delete(documentId: string): boolean {
 const documents = this.getAll();
 const doc = documents.find(d => d.documentId === documentId);
 
 if (!doc) return false;
 if (doc.locked) throw new Error('Cannot delete locked document');
 
 const filtered = documents.filter(d => d.documentId !== documentId);
 localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
 return true;
 }

 // Search documents
 search(query: string): HRDocument[] {
 const lowerQuery = query.toLowerCase();
 return this.getAll().filter(doc => 
 doc.staffFullName.toLowerCase().includes(lowerQuery) ||
 doc.fileName.toLowerCase().includes(lowerQuery) ||
 doc.documentType.toLowerCase().includes(lowerQuery) ||
 doc.staffId.toLowerCase().includes(lowerQuery)
 );
 }

 // Get statistics
 getStatistics() {
 const documents = this.getAll();
 const folders = this.getFolders();
 
 return {
 totalDocuments: documents.length,
 lockedDocuments: documents.filter(d => d.locked).length,
 byFolder: folders.map(folder => ({
 folder: folder.folderName,
 count: documents.filter(d => d.folder === folder.folderName).length
 })),
 byType: this.getDocumentTypeCounts(),
 byMonth: this.getDocumentsByMonth()
 };
 }

 private getDocumentTypeCounts() {
 const documents = this.getAll();
 const types = ['Contract', 'Appraisal', 'Disciplinary', 'Clearance', 'Exit', 'Recruitment', 'Reference', 'Offer Letter', 'Training', 'Leave'];
 
 return types.map(type => ({
 type,
 count: documents.filter(d => d.documentType === type).length
 }));
 }

 private getDocumentsByMonth() {
 const documents = this.getAll();
 const monthCounts: Record<string, number> = {};
 
 documents.forEach(doc => {
 const month = doc.createdDate.substring(0, 7); // YYYY-MM
 monthCounts[month] = (monthCounts[month] || 0) + 1;
 });
 
 return Object.entries(monthCounts).map(([month, count]) => ({
 month,
 count
 })).sort((a, b) => b.month.localeCompare(a.month));
 }

 // Auto-sync from source modules (called on system load)
 autoSyncFromModules(): void {
 // This will be called by individual modules when they create finalized documents
 // For now, we'll create sample data
 this.createSampleDocuments();
 }

 private createSampleDocuments(): void {
 const existing = this.getAll();
 if (existing.length > 0) return; // Already have documents
 
 // Sample documents (will be replaced by real auto-sync)
 const sampleDocs: Omit<HRDocument, 'documentId' | 'createdDate' | 'locked'>[] = [
 {
 staffId: 'STF-001',
 staffFullName: 'Ahmed Hassan Mohamed',
 documentType: 'Contract',
 sourceModule: 'Employees Profiles',
 referenceId: 'CONTRACT-001',
 fileName: 'Employment_Contract_Ahmed_Hassan.pdf',
 fileDescription: 'Fixed-term employment contract',
 createdBy: 'Sarah Johnson',
 folder: 'Contracts'
 },
 {
 staffId: 'STF-002',
 staffFullName: 'Fatima Ali Abdullah',
 documentType: 'Appraisal',
 sourceModule: 'Performance',
 referenceId: 'APPR-001',
 fileName: 'Performance_Appraisal_Fatima_Ali_2025.pdf',
 fileDescription: 'Annual performance review 2025',
 createdBy: 'Sarah Johnson',
 folder: 'Performance'
 },
 {
 staffId: 'STF-001',
 staffFullName: 'Ahmed Hassan Mohamed',
 documentType: 'Offer Letter',
 sourceModule: 'Recruitment',
 referenceId: 'OFFER-001',
 fileName: 'Offer_Letter_Ahmed_Hassan.pdf',
 fileDescription: 'Employment offer letter',
 createdBy: 'HR Department',
 folder: 'Recruitment'
 }
 ];
 
 sampleDocs.forEach(doc => this.add(doc));
 }
}

export const hrDocumentsService = new HRDocumentsService();
