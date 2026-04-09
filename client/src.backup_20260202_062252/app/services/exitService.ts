/**
 * ============================================================================
 * EXIT SERVICE - Employee Exit & Offboarding Records
 * ============================================================================
 * 
 * CORE RULES:
 * - All exit records auto-linked to employee
 * - Three mandatory forms: Resignation, Clearance, Exit Interview
 * - Triggers status change: Active → Exited
 * - Profile becomes read-only after exit complete
 */

// ============================================================================
// RESIGNATION LETTER
// ============================================================================
export interface ResignationRecord {
  id: string;
  
  // Auto-linked employee data (MANDATORY)
  staffId: string;
  employeeName: string;
  position: string;
  department: string;
  
  // Resignation details
  resignationDate: string; // Date letter submitted
  lastWorkingDay: string;
  reason: string; // Detailed reason
  noticePeriod: number; // Days
  
  // Acknowledgement
  acknowledgedBy: string; // HR / Supervisor
  acknowledgedByRole: string;
  acknowledgementDate?: string;
  
  // Document
  resignationLetterUrl?: string; // Uploaded signed letter
  
  // Audit trail (MANDATORY)
  createdBy: string;
  createdDate: string;
  isLocked: boolean;
  
  // Metadata
  notes?: string;
}

// ============================================================================
// CLEARANCE FORM
// ============================================================================
export interface ClearanceItem {
  department: string;
  cleared: boolean;
  clearedBy?: string;
  clearedDate?: string;
  remarks?: string;
}

export interface ClearanceRecord {
  id: string;
  
  // Auto-linked employee data (MANDATORY)
  staffId: string;
  employeeName: string;
  position: string;
  department: string;
  
  // Clearance checklist
  checklist: ClearanceItem[];
  
  // Final confirmation
  allCleared: boolean;
  clearanceCompletedDate?: string;
  confirmedBy?: string; // HR Manager
  confirmedByRole?: string;
  
  // Document
  signedClearanceFormUrl?: string; // Uploaded signed clearance
  
  // Audit trail (MANDATORY)
  createdBy: string;
  createdDate: string;
  lastModifiedBy?: string;
  lastModifiedDate?: string;
  isLocked: boolean;
  
  // Metadata
  notes?: string;
}

// ============================================================================
// EXIT INTERVIEW NOTES
// ============================================================================
export interface ExitInterviewRecord {
  id: string;
  
  // Auto-linked employee data (MANDATORY)
  staffId: string;
  employeeName: string;
  position: string;
  department: string;
  
  // Interview details
  interviewDate: string;
  interviewedBy: string;
  interviewedByRole: string;
  
  // Exit type
  exitType: 'Resignation' | 'End of Contract' | 'Termination';
  
  // Feedback
  primaryReasonForLeaving: string;
  whatWorkedWell: string;
  areasForImprovement: string;
  wouldReturn: boolean;
  additionalComments?: string;
  
  // Ratings (optional)
  workEnvironmentRating?: number; // 1-5
  managementRating?: number; // 1-5
  compensationRating?: number; // 1-5
  careerDevelopmentRating?: number; // 1-5
  
  // Document
  exitInterviewNotesUrl?: string; // Uploaded or generated PDF
  
  // Audit trail (MANDATORY)
  createdBy: string;
  createdDate: string;
  isLocked: boolean;
  
  // Metadata
  notes?: string;
}

// ============================================================================
// EXIT PROCESS (COMPLETE)
// ============================================================================
export interface ExitProcess {
  staffId: string;
  resignationSubmitted: boolean;
  resignationId?: string;
  clearanceCompleted: boolean;
  clearanceId?: string;
  exitInterviewCompleted: boolean;
  exitInterviewId?: string;
  exitProcessComplete: boolean;
  exitCompletedDate?: string;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================
class ExitService {
  private readonly RESIGNATION_KEY = 'hr_resignations';
  private readonly CLEARANCE_KEY = 'hr_clearances';
  private readonly EXIT_INTERVIEW_KEY = 'hr_exit_interviews';
  private readonly EXIT_PROCESS_KEY = 'hr_exit_processes';

  // ========================================================================
  // RESIGNATION METHODS
  // ========================================================================
  
  private getAllResignations(): ResignationRecord[] {
    const data = localStorage.getItem(this.RESIGNATION_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveResignations(records: ResignationRecord[]): void {
    localStorage.setItem(this.RESIGNATION_KEY, JSON.stringify(records));
  }

  getResignationByStaffId(staffId: string): ResignationRecord | undefined {
    return this.getAllResignations().find(r => r.staffId === staffId);
  }

  addResignation(record: Omit<ResignationRecord, 'id' | 'createdDate' | 'isLocked'>): ResignationRecord {
    const records = this.getAllResignations();
    
    const newRecord: ResignationRecord = {
      ...record,
      id: `RES-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdDate: new Date().toISOString(),
      isLocked: true
    };
    
    records.push(newRecord);
    this.saveResignations(records);
    
    // Update exit process
    this.updateExitProcess(record.staffId, { resignationSubmitted: true, resignationId: newRecord.id });
    
    return newRecord;
  }

  // ========================================================================
  // CLEARANCE METHODS
  // ========================================================================
  
  private getAllClearances(): ClearanceRecord[] {
    const data = localStorage.getItem(this.CLEARANCE_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveClearances(records: ClearanceRecord[]): void {
    localStorage.setItem(this.CLEARANCE_KEY, JSON.stringify(records));
  }

  getClearanceByStaffId(staffId: string): ClearanceRecord | undefined {
    return this.getAllClearances().find(r => r.staffId === staffId);
  }

  addClearance(record: Omit<ClearanceRecord, 'id' | 'createdDate' | 'isLocked'>): ClearanceRecord {
    const records = this.getAllClearances();
    
    const newRecord: ClearanceRecord = {
      ...record,
      id: `CLR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdDate: new Date().toISOString(),
      isLocked: false // Can be updated until all cleared
    };
    
    records.push(newRecord);
    this.saveClearances(records);
    
    return newRecord;
  }

  updateClearance(id: string, updates: Partial<ClearanceRecord>): ClearanceRecord | null {
    const records = this.getAllClearances();
    const index = records.findIndex(r => r.id === id);
    
    if (index === -1) return null;
    
    records[index] = {
      ...records[index],
      ...updates,
      lastModifiedDate: new Date().toISOString()
    };
    
    // Check if all cleared
    const allCleared = records[index].checklist.every(item => item.cleared);
    if (allCleared) {
      records[index].allCleared = true;
      records[index].isLocked = true;
      records[index].clearanceCompletedDate = new Date().toISOString();
      
      // Update exit process
      this.updateExitProcess(records[index].staffId, { clearanceCompleted: true, clearanceId: id });
    }
    
    this.saveClearances(records);
    return records[index];
  }

  // ========================================================================
  // EXIT INTERVIEW METHODS
  // ========================================================================
  
  private getAllExitInterviews(): ExitInterviewRecord[] {
    const data = localStorage.getItem(this.EXIT_INTERVIEW_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveExitInterviews(records: ExitInterviewRecord[]): void {
    localStorage.setItem(this.EXIT_INTERVIEW_KEY, JSON.stringify(records));
  }

  getExitInterviewByStaffId(staffId: string): ExitInterviewRecord | undefined {
    return this.getAllExitInterviews().find(r => r.staffId === staffId);
  }

  addExitInterview(record: Omit<ExitInterviewRecord, 'id' | 'createdDate' | 'isLocked'>): ExitInterviewRecord {
    const records = this.getAllExitInterviews();
    
    const newRecord: ExitInterviewRecord = {
      ...record,
      id: `EXI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdDate: new Date().toISOString(),
      isLocked: true
    };
    
    records.push(newRecord);
    this.saveExitInterviews(records);
    
    // Update exit process
    this.updateExitProcess(record.staffId, { exitInterviewCompleted: true, exitInterviewId: newRecord.id });
    
    return newRecord;
  }

  // ========================================================================
  // EXIT PROCESS TRACKING
  // ========================================================================
  
  private getAllExitProcesses(): ExitProcess[] {
    const data = localStorage.getItem(this.EXIT_PROCESS_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveExitProcesses(processes: ExitProcess[]): void {
    localStorage.setItem(this.EXIT_PROCESS_KEY, JSON.stringify(processes));
  }

  getExitProcess(staffId: string): ExitProcess {
    const processes = this.getAllExitProcesses();
    let process = processes.find(p => p.staffId === staffId);
    
    if (!process) {
      process = {
        staffId,
        resignationSubmitted: false,
        clearanceCompleted: false,
        exitInterviewCompleted: false,
        exitProcessComplete: false
      };
      processes.push(process);
      this.saveExitProcesses(processes);
    }
    
    return process;
  }

  private updateExitProcess(staffId: string, updates: Partial<ExitProcess>): void {
    const processes = this.getAllExitProcesses();
    const index = processes.findIndex(p => p.staffId === staffId);
    
    if (index === -1) {
      processes.push({
        staffId,
        resignationSubmitted: false,
        clearanceCompleted: false,
        exitInterviewCompleted: false,
        exitProcessComplete: false,
        ...updates
      });
    } else {
      processes[index] = {
        ...processes[index],
        ...updates
      };
    }
    
    // Check if exit process is complete
    const process = processes[index] || processes[processes.length - 1];
    if (process.resignationSubmitted && process.clearanceCompleted && process.exitInterviewCompleted) {
      process.exitProcessComplete = true;
      process.exitCompletedDate = new Date().toISOString();
    }
    
    this.saveExitProcesses(processes);
  }

  /**
   * Check if employee can be marked as Exited
   */
  canCompleteExit(staffId: string): boolean {
    const process = this.getExitProcess(staffId);
    return process.resignationSubmitted && process.clearanceCompleted && process.exitInterviewCompleted;
  }

  /**
   * Get all exit-related data for an employee
   */
  getAllExitData(staffId: string) {
    return {
      resignation: this.getResignationByStaffId(staffId),
      clearance: this.getClearanceByStaffId(staffId),
      exitInterview: this.getExitInterviewByStaffId(staffId),
      process: this.getExitProcess(staffId)
    };
  }
}

export const exitService = new ExitService();
