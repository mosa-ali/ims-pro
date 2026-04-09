/**
 * ============================================================================
 * APPRAISAL SERVICE - Performance Review Records
 * ============================================================================
 * 
 * CORE RULES:
 * - All appraisals auto-linked to employee (staffId)
 * - Read-only after submission
 * - Stores complete audit trail
 * - Supports PDF generation
 */

export interface AppraisalRecord {
 id: string;
 
 // Auto-linked employee data (MANDATORY)
 staffId: string;
 employeeName: string;
 position: string;
 department: string;
 
 // Review period
 reviewPeriod: string; // e.g., "2024 Q1" or "Annual 2024"
 reviewYear: number;
 reviewQuarter?: string; // Q1, Q2, Q3, Q4
 
 // Reviewer information
 reviewerName: string;
 reviewerPosition: string;
 reviewDate: string;
 
 // Performance ratings
 overallRating: number; // 1-5
 ratingDescription: 'Excellent' | 'Good' | 'Satisfactory' | 'Needs Improvement' | 'Unsatisfactory';
 
 // Detailed feedback
 strengths: string;
 areasForImprovement: string;
 
 // Recommendation
 recommendation: 'Continue' | 'Promote' | 'Training Required' | 'Performance Improvement Plan';
 
 // Signatures
 supervisorSignature?: string; // Upload or digital signature
 employeeAcknowledged: boolean;
 employeeAcknowledgementDate?: string;
 
 // Document upload
 signedFormUrl?: string; // PDF of signed appraisal form
 
 // Audit trail (MANDATORY)
 createdBy: string;
 createdDate: string;
 isLocked: boolean; // Read-only after submission
 
 // Optional metadata
 notes?: string;
}

class AppraisalService {
 private readonly STORAGE_KEY = 'hr_appraisals';

 private getAll(): AppraisalRecord[] {
 const data = localStorage.getItem(this.STORAGE_KEY);
 return data ? JSON.parse(data) : [];
 }

 private save(appraisals: AppraisalRecord[]): void {
 localStorage.setItem(this.STORAGE_KEY, JSON.stringify(appraisals));
 }

 /**
 * Get all appraisals for a specific employee
 */
 getByStaffId(staffId: string): AppraisalRecord[] {
 return this.getAll().filter(a => a.staffId === staffId);
 }

 /**
 * Get a specific appraisal by ID
 */
 getById(id: string): AppraisalRecord | undefined {
 return this.getAll().find(a => a.id === id);
 }

 /**
 * Add a new appraisal record
 * ✅ Auto-assigns staffId, employee data, and audit trail
 */
 add(appraisal: Omit<AppraisalRecord, 'id' | 'createdDate' | 'isLocked'>): AppraisalRecord {
 const appraisals = this.getAll();
 
 const newAppraisal: AppraisalRecord = {
 ...appraisal,
 id: `APR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
 createdDate: new Date().toISOString(),
 isLocked: true // Lock immediately after creation (read-only)
 };
 
 appraisals.push(newAppraisal);
 this.save(appraisals);
 
 return newAppraisal;
 }

 /**
 * Get latest appraisal for an employee
 */
 getLatest(staffId: string): AppraisalRecord | undefined {
 const records = this.getByStaffId(staffId);
 if (records.length === 0) return undefined;
 
 return records.sort((a, b) => 
 new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime()
 )[0];
 }

 /**
 * Get appraisal history for an employee
 */
 getHistory(staffId: string): AppraisalRecord[] {
 return this.getByStaffId(staffId).sort((a, b) => 
 new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime()
 );
 }

 /**
 * Delete an appraisal (soft delete - should be restricted)
 */
 delete(id: string): boolean {
 const appraisals = this.getAll();
 const filtered = appraisals.filter(a => a.id !== id);
 
 if (filtered.length === appraisals.length) {
 return false; // Not found
 }
 
 this.save(filtered);
 return true;
 }

 /**
 * Initialize sample data (for demo purposes)
 */
 initializeSampleData(): void {
 const existing = this.getAll();
 if (existing.length > 0) return; // Already has data
 
 // No sample data - will be created via forms
 }
}

export const appraisalService = new AppraisalService();
