/**
 * ============================================================================
 * DISCIPLINARY SERVICE - Disciplinary Action Records
 * ============================================================================
 * 
 * CORE RULES:
 * - HR Manager / Admin only
 * - All records auto-linked to employee
 * - Read-only after submission (NO EDITS, NO DELETES)
 * - Complete audit trail
 * 
 * CRITICAL REVISION:
 * - Process-first, decision-later approach
 * - Disciplinary Stage tracks process (not punishment)
 * - Action Description is free text (required)
 * - Final Action Type is optional (only when closed with action)
 */

export interface DisciplinaryRecord {
  id: string;
  
  // Auto-linked employee data (MANDATORY)
  staffId: string;
  employeeName: string;
  position: string;
  department: string;
  
  // ✅ NEW APPROACH: Process-First Model
  actionDate: string;
  
  // Disciplinary Stage (tracks process, NOT punishment)
  disciplinaryStage: 
    | 'Observation / Note'
    | 'Investigation Initiated'
    | 'Verbal Warning'
    | 'Written Warning'
    | 'Final Warning'
    | 'Escalated'
    | 'Closed (No Action)'
    | 'Closed (Action Taken)';
  
  // Action Description (FREE TEXT - REQUIRED)
  // Example: "Formal written warning issued", "Investigation ongoing - no decision yet", etc.
  actionDescription: string;
  
  // Final Action Type (OPTIONAL - Only when stage = "Closed (Action Taken)")
  finalActionType?: 'Warning' | 'Suspension' | 'Salary Deduction' | 'Termination' | 'Other';
  finalActionDetails?: string; // Additional details if "Other" is selected
  
  // Policy and authority
  policyReference?: string; // Optional policy citation
  issuedBy: string;
  issuedByRole: string;
  
  // Duration (if applicable)
  duration?: string; // e.g., "3 days", "1 week"
  effectiveFrom?: string;
  effectiveTo?: string;
  
  // Payroll impact
  hasPayrollImpact: boolean;
  payrollImpactDescription?: string;
  
  // Documents
  disciplinaryLetterUrl?: string; // Uploaded PDF
  supportingDocuments?: string[]; // Additional evidence
  
  // Audit trail (MANDATORY)
  createdBy: string;
  createdDate: string;
  isLocked: boolean; // Always true after creation
  
  // Metadata
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  notes?: string;
}

class DisciplinaryService {
  private readonly STORAGE_KEY = 'hr_disciplinary_records';

  private getAll(): DisciplinaryRecord[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  private save(records: DisciplinaryRecord[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(records));
  }

  /**
   * Get all disciplinary records for a specific employee
   */
  getByStaffId(staffId: string): DisciplinaryRecord[] {
    return this.getAll().filter(r => r.staffId === staffId);
  }

  /**
   * Get a specific record by ID
   */
  getById(id: string): DisciplinaryRecord | undefined {
    return this.getAll().find(r => r.id === id);
  }

  /**
   * Add a new disciplinary record
   * ✅ Auto-assigns staffId, employee data, and audit trail
   * 🔒 Immediately locked (read-only)
   */
  add(record: Omit<DisciplinaryRecord, 'id' | 'createdDate' | 'isLocked'>): DisciplinaryRecord {
    const records = this.getAll();
    
    const newRecord: DisciplinaryRecord = {
      ...record,
      id: `DIS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdDate: new Date().toISOString(),
      isLocked: true // LOCKED - No edits allowed
    };
    
    records.push(newRecord);
    this.save(records);
    
    return newRecord;
  }

  /**
   * Get disciplinary history for an employee
   */
  getHistory(staffId: string): DisciplinaryRecord[] {
    return this.getByStaffId(staffId).sort((a, b) => 
      new Date(b.actionDate).getTime() - new Date(a.actionDate).getTime()
    );
  }

  /**
   * Get count of disciplinary actions by type
   */
  getCountByType(staffId: string): Record<string, number> {
    const records = this.getByStaffId(staffId);
    const counts: Record<string, number> = {
      'Warning': 0,
      'Suspension': 0,
      'Salary Deduction': 0,
      'Termination': 0
    };
    
    records.forEach(r => {
      counts[r.finalActionType || 'Warning']++;
    });
    
    return counts;
  }

  /**
   * Check if employee has active sanctions
   */
  hasActiveSanctions(staffId: string): boolean {
    const records = this.getByStaffId(staffId);
    const now = new Date();
    
    return records.some(r => {
      if (!r.effectiveTo) return false;
      return new Date(r.effectiveTo) > now;
    });
  }

  /**
   * Archive (hide) a record - NOT DELETE
   * Only for admin cleanup
   */
  archive(id: string): boolean {
    // In production, this would just mark as archived, not delete
    // For now, we keep records permanently
    return false; // Archiving disabled - records are permanent
  }

  /**
   * Initialize sample data (for demo purposes)
   */
  initializeSampleData(): void {
    const existing = this.getAll();
    if (existing.length > 0) return;
    
    // No sample data - will be created via forms
  }
}

export const disciplinaryService = new DisciplinaryService();