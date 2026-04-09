/**
 * ============================================================================
 * FILE STORAGE SERVICE
 * ============================================================================
 * Handles file uploads, storage, and retrieval for employee documents
 * Uses localStorage with base64 encoding for frontend-only implementation
 */

export interface FileMetadata {
 id: string;
 fileName: string;
 fileType: string;
 fileSize: number;
 uploadedBy: string;
 uploadedAt: string;
 category: 'identity' | 'cv' | 'contract' | 'performance' | 'training' | 'sanction' | 'exit' | 'other';
 employeeId: string;
 base64Data: string;
}

const STORAGE_KEY = 'hr_employee_files';

function getFromStorage<T>(key: string, defaultValue: T): T {
 try {
 const item = localStorage.getItem(key);
 return item ? JSON.parse(item) : defaultValue;
 } catch (error) {
 console.error(`Error reading ${key} from storage:`, error);
 return defaultValue;
 }
}

function saveToStorage<T>(key: string, value: T): void {
 try {
 localStorage.setItem(key, JSON.stringify(value));
 } catch (error) {
 console.error(`Error saving ${key} to storage:`, error);
 }
}

function generateId(): string {
 return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const fileStorageService = {
 /**
 * Upload a file and store it
 */
 async uploadFile(
 file: File,
 employeeId: string,
 category: FileMetadata['category'],
 uploadedBy: string
 ): Promise<FileMetadata> {
 return new Promise((resolve, reject) => {
 const reader = new FileReader();
 
 reader.onload = () => {
 const base64Data = reader.result as string;
 
 const metadata: FileMetadata = {
 id: generateId(),
 fileName: file.name,
 fileType: file.type,
 fileSize: file.size,
 uploadedBy,
 uploadedAt: new Date().toISOString(),
 category,
 employeeId,
 base64Data
 };
 
 const files = getFromStorage<FileMetadata[]>(STORAGE_KEY, []);
 files.push(metadata);
 saveToStorage(STORAGE_KEY, files);
 
 resolve(metadata);
 };
 
 reader.onerror = () => {
 reject(new Error('Failed to read file'));
 };
 
 reader.readAsDataURL(file);
 });
 },

 /**
 * Get all files for an employee
 */
 getEmployeeFiles(employeeId: string, category?: FileMetadata['category']): FileMetadata[] {
 const allFiles = getFromStorage<FileMetadata[]>(STORAGE_KEY, []);
 let filtered = allFiles.filter(f => f.employeeId === employeeId);
 
 if (category) {
 filtered = filtered.filter(f => f.category === category);
 }
 
 return filtered;
 },

 /**
 * Get a specific file by ID
 */
 getFile(fileId: string): FileMetadata | undefined {
 const files = getFromStorage<FileMetadata[]>(STORAGE_KEY, []);
 return files.find(f => f.id === fileId);
 },

 /**
 * Delete a file
 */
 deleteFile(fileId: string): boolean {
 const files = getFromStorage<FileMetadata[]>(STORAGE_KEY, []);
 const filtered = files.filter(f => f.id !== fileId);
 
 if (filtered.length === files.length) return false;
 
 saveToStorage(STORAGE_KEY, filtered);
 return true;
 },

 /**
 * Download a file
 */
 downloadFile(fileId: string): void {
 const file = this.getFile(fileId);
 if (!file) return;
 
 const link = document.createElement('a');
 link.href = file.base64Data;
 link.download = file.fileName;
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 }
};
