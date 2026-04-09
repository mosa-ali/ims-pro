/**
 * ============================================================================
 * REFERENCE UPLOAD SERVICE - External Reference Document Management
 * ============================================================================
 * 
 * CORE PRINCIPLES:
 * - Reference forms are filled EXTERNALLY by requesting organizations
 * - Forms are printed, signed, and returned to HR
 * - System stores these official documents
 * - No editing allowed, only upload
 * - Archive only (no delete)
 */

export type ReferenceType = 
  | 'Employment'
  | 'Salary'
  | 'Conduct'
  | 'General';

export interface ReferenceUpload {
  id: string;
  
  // Employee link
  staffId: string;
  employeeName: string;
  
  // Document metadata
  requestingOrganization: string;  // UN, NGO, Bank, Embassy, etc.
  referenceType: ReferenceType;
  dateRequested: string;
  dateIssued?: string;              // When HR signed/issued
  
  // File information
  fileName: string;
  fileType: string;                 // PDF, DOC, DOCX
  fileSize: number;                 // In bytes
  fileUrl: string;                  // Storage URL or base64
  
  // Audit trail
  uploadedBy: string;
  uploadDate: string;
  isArchived: boolean;
  
  // Optional metadata
  notes?: string;
  expiryDate?: string;              // Some references have validity period
}

class ReferenceUploadService {
  private readonly STORAGE_KEY = 'hr_reference_uploads';

  private getAll(): ReferenceUpload[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  private save(uploads: ReferenceUpload[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(uploads));
  }

  /**
   * Get all reference uploads for a specific employee
   */
  getByStaffId(staffId: string): ReferenceUpload[] {
    return this.getAll()
      .filter(r => r.staffId === staffId && !r.isArchived)
      .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
  }

  /**
   * Get a specific upload by ID
   */
  getById(id: string): ReferenceUpload | undefined {
    return this.getAll().find(r => r.id === id);
  }

  /**
   * Add a new reference upload
   * ✅ File is uploaded by HR Manager/Admin
   * ✅ Immediately permanent (no edits)
   */
  add(upload: Omit<ReferenceUpload, 'id' | 'uploadDate' | 'isArchived'>): ReferenceUpload {
    const uploads = this.getAll();
    
    const newUpload: ReferenceUpload = {
      ...upload,
      id: `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      uploadDate: new Date().toISOString(),
      isArchived: false
    };
    
    uploads.push(newUpload);
    this.save(uploads);
    
    return newUpload;
  }

  /**
   * Archive a reference upload (NOT DELETE)
   * Only for admin cleanup
   */
  archive(id: string): boolean {
    const uploads = this.getAll();
    const index = uploads.findIndex(r => r.id === id);
    
    if (index === -1) return false;
    
    uploads[index].isArchived = true;
    this.save(uploads);
    
    return true;
  }

  /**
   * Get count of uploads by type for an employee
   */
  getCountByType(staffId: string): Record<ReferenceType, number> {
    const uploads = this.getByStaffId(staffId);
    const counts: Record<ReferenceType, number> = {
      'Employment': 0,
      'Salary': 0,
      'Conduct': 0,
      'General': 0
    };
    
    uploads.forEach(u => {
      counts[u.referenceType]++;
    });
    
    return counts;
  }

  /**
   * Check if employee has any reference uploads
   */
  hasReferences(staffId: string): boolean {
    return this.getByStaffId(staffId).length > 0;
  }

  /**
   * Get all uploads (for admin view)
   */
  getAllUploads(): ReferenceUpload[] {
    return this.getAll().filter(r => !r.isArchived);
  }

  /**
   * Initialize sample data (for demo purposes)
   */
  initializeSampleData(): void {
    const existing = this.getAll();
    if (existing.length > 0) return;
    
    // No sample data - will be created via upload
  }
}

export const referenceUploadService = new ReferenceUploadService();
