/**
 * ============================================================================
 * TRAINING SERVICE - Training & Development Records
 * ============================================================================
 * 
 * CORE RULES:
 * - All training records auto-linked to employee
 * - Historical tracking
 * - Certificate storage
 */

export interface TrainingRecord {
  id: string;
  
  // Auto-linked employee data (MANDATORY)
  staffId: string;
  employeeName: string;
  position: string;
  department: string;
  
  // Training details
  trainingTitle: string;
  provider: string; // Organization or institution
  trainingType: 'Technical' | 'Soft Skills' | 'Management' | 'Compliance' | 'Safety' | 'Other';
  
  // Schedule
  startDate: string;
  endDate: string;
  duration?: string; // e.g., "3 days", "40 hours"
  
  // Status
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  completionDate?: string;
  
  // Certificate
  certificateUrl?: string; // Uploaded certificate PDF
  certificateIssued: boolean;
  certificateNumber?: string;
  
  // Cost (optional)
  cost?: number;
  currency?: string;
  fundedBy?: string; // Project code or "Organization"
  
  // Audit trail (MANDATORY)
  createdBy: string;
  createdDate: string;
  lastModifiedBy?: string;
  lastModifiedDate?: string;
  
  // Metadata
  notes?: string;
  skills?: string[]; // Skills acquired
}

class TrainingService {
  private readonly STORAGE_KEY = 'hr_training_records';

  private getAll(): TrainingRecord[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  private save(records: TrainingRecord[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(records));
  }

  /**
   * Get all training records for a specific employee
   */
  getByStaffId(staffId: string): TrainingRecord[] {
    return this.getAll().filter(r => r.staffId === staffId);
  }

  /**
   * Get a specific record by ID
   */
  getById(id: string): TrainingRecord | undefined {
    return this.getAll().find(r => r.id === id);
  }

  /**
   * Add a new training record
   * ✅ Auto-assigns staffId, employee data, and audit trail
   */
  add(record: Omit<TrainingRecord, 'id' | 'createdDate'>): TrainingRecord {
    const records = this.getAll();
    
    const newRecord: TrainingRecord = {
      ...record,
      id: `TRN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdDate: new Date().toISOString()
    };
    
    records.push(newRecord);
    this.save(records);
    
    return newRecord;
  }

  /**
   * Update a training record
   */
  update(id: string, updates: Partial<TrainingRecord>): TrainingRecord | null {
    const records = this.getAll();
    const index = records.findIndex(r => r.id === id);
    
    if (index === -1) return null;
    
    records[index] = {
      ...records[index],
      ...updates,
      lastModifiedDate: new Date().toISOString()
    };
    
    this.save(records);
    return records[index];
  }

  /**
   * Get training history for an employee
   */
  getHistory(staffId: string): TrainingRecord[] {
    return this.getByStaffId(staffId).sort((a, b) => 
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );
  }

  /**
   * Get completed trainings
   */
  getCompleted(staffId: string): TrainingRecord[] {
    return this.getByStaffId(staffId).filter(r => r.status === 'Completed');
  }

  /**
   * Get upcoming trainings
   */
  getUpcoming(staffId: string): TrainingRecord[] {
    const now = new Date();
    return this.getByStaffId(staffId).filter(r => 
      r.status === 'Scheduled' && new Date(r.startDate) > now
    );
  }

  /**
   * Delete a training record
   */
  delete(id: string): boolean {
    const records = this.getAll();
    const filtered = records.filter(r => r.id !== id);
    
    if (filtered.length === records.length) {
      return false; // Not found
    }
    
    this.save(filtered);
    return true;
  }

  /**
   * Get total training hours for an employee
   */
  getTotalHours(staffId: string): number {
    const completed = this.getCompleted(staffId);
    let totalHours = 0;
    
    completed.forEach(r => {
      if (r.duration) {
        // Parse duration like "40 hours" or "3 days"
        const match = r.duration.match(/(\d+)\s*(hour|day)/i);
        if (match) {
          const value = parseInt(match[1]);
          const unit = match[2].toLowerCase();
          totalHours += unit === 'day' ? value * 8 : value;
        }
      }
    });
    
    return totalHours;
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

export const trainingService = new TrainingService();
