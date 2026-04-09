/**
 * ============================================================================
 * EMPLOYEE RECORDS SERVICE
 * ============================================================================
 * Manages all employee-related records (contracts, training, performance, etc.)
 */

const STORAGE_KEYS = {
  CONTRACTS: 'hr_employee_contracts',
  TRAINING: 'hr_employee_training',
  PERFORMANCE: 'hr_employee_performance',
  SANCTIONS: 'hr_employee_sanctions',
  EXIT_RECORDS: 'hr_employee_exit_records'
};

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

// ============================================================================
// CONTRACT RECORDS
// ============================================================================

export interface ContractRecord {
  id: string;
  employeeId: string;
  contractType: 'Fixed-Term' | 'Short-Term' | 'Consultancy' | 'Volunteer' | 'Daily Worker';
  startDate: string;
  endDate?: string;
  position: string;
  department: string;
  projects: string[];
  salary: number;
  currency: string;
  status: 'active' | 'expired' | 'terminated';
  signedDocumentId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export const contractService = {
  getAll(employeeId: string): ContractRecord[] {
    const all = getFromStorage<ContractRecord[]>(STORAGE_KEYS.CONTRACTS, []);
    return all.filter(c => c.employeeId === employeeId);
  },

  create(data: Omit<ContractRecord, 'id' | 'createdAt' | 'updatedAt'>): ContractRecord {
    const contracts = getFromStorage<ContractRecord[]>(STORAGE_KEYS.CONTRACTS, []);
    const record: ContractRecord = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    contracts.push(record);
    saveToStorage(STORAGE_KEYS.CONTRACTS, contracts);
    return record;
  },

  update(id: string, data: Partial<ContractRecord>): ContractRecord | null {
    const contracts = getFromStorage<ContractRecord[]>(STORAGE_KEYS.CONTRACTS, []);
    const index = contracts.findIndex(c => c.id === id);
    if (index === -1) return null;
    
    contracts[index] = {
      ...contracts[index],
      ...data,
      id: contracts[index].id,
      createdAt: contracts[index].createdAt,
      updatedAt: new Date().toISOString()
    };
    
    saveToStorage(STORAGE_KEYS.CONTRACTS, contracts);
    return contracts[index];
  }
};

// ============================================================================
// TRAINING RECORDS
// ============================================================================

export interface TrainingRecord {
  id: string;
  employeeId: string;
  trainingTitle: string;
  trainingProvider: string;
  trainingType: 'Internal' | 'External' | 'Online' | 'Workshop' | 'Conference';
  startDate: string;
  endDate?: string;
  duration: string; // e.g., "3 days", "2 weeks"
  status: 'Planned' | 'In Progress' | 'Completed' | 'Cancelled';
  certificateId?: string;
  cost?: number;
  currency?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const trainingService = {
  getAll(employeeId: string): TrainingRecord[] {
    const all = getFromStorage<TrainingRecord[]>(STORAGE_KEYS.TRAINING, []);
    return all.filter(t => t.employeeId === employeeId);
  },

  create(data: Omit<TrainingRecord, 'id' | 'createdAt' | 'updatedAt'>): TrainingRecord {
    const records = getFromStorage<TrainingRecord[]>(STORAGE_KEYS.TRAINING, []);
    const record: TrainingRecord = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    records.push(record);
    saveToStorage(STORAGE_KEYS.TRAINING, records);
    return record;
  },

  update(id: string, data: Partial<TrainingRecord>): TrainingRecord | null {
    const records = getFromStorage<TrainingRecord[]>(STORAGE_KEYS.TRAINING, []);
    const index = records.findIndex(r => r.id === id);
    if (index === -1) return null;
    
    records[index] = {
      ...records[index],
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    saveToStorage(STORAGE_KEYS.TRAINING, records);
    return records[index];
  }
};

// ============================================================================
// PERFORMANCE RECORDS
// ============================================================================

export interface PerformanceRecord {
  id: string;
  employeeId: string;
  reviewPeriod: string; // e.g., "2025 Annual Review"
  reviewDate: string;
  reviewType: 'Annual' | 'Mid-Year' | 'Probation' | 'Special';
  overallRating: 1 | 2 | 3 | 4 | 5; // 1=Poor, 5=Excellent
  strengths?: string;
  areasForImprovement?: string;
  goals?: string;
  reviewerName: string;
  reviewerPosition: string;
  documentId?: string;
  status: 'draft' | 'submitted' | 'approved';
  createdAt: string;
  updatedAt: string;
}

export const performanceService = {
  getAll(employeeId: string): PerformanceRecord[] {
    const all = getFromStorage<PerformanceRecord[]>(STORAGE_KEYS.PERFORMANCE, []);
    return all.filter(p => p.employeeId === employeeId);
  },

  create(data: Omit<PerformanceRecord, 'id' | 'createdAt' | 'updatedAt'>): PerformanceRecord {
    const records = getFromStorage<PerformanceRecord[]>(STORAGE_KEYS.PERFORMANCE, []);
    const record: PerformanceRecord = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    records.push(record);
    saveToStorage(STORAGE_KEYS.PERFORMANCE, records);
    return record;
  },

  update(id: string, data: Partial<PerformanceRecord>): PerformanceRecord | null {
    const records = getFromStorage<PerformanceRecord[]>(STORAGE_KEYS.PERFORMANCE, []);
    const index = records.findIndex(r => r.id === id);
    if (index === -1) return null;
    
    records[index] = {
      ...records[index],
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    saveToStorage(STORAGE_KEYS.PERFORMANCE, records);
    return records[index];
  }
};

// ============================================================================
// SANCTION RECORDS
// ============================================================================

export interface SanctionRecord {
  id: string;
  employeeId: string;
  sanctionType: 'Verbal Warning' | 'Written Warning' | 'Suspension' | 'Termination' | 'Other';
  issueDate: string;
  reason: string;
  description?: string;
  issuedBy: string;
  documentId?: string;
  status: 'active' | 'resolved' | 'appealed';
  createdAt: string;
  updatedAt: string;
}

export const sanctionService = {
  getAll(employeeId: string): SanctionRecord[] {
    const all = getFromStorage<SanctionRecord[]>(STORAGE_KEYS.SANCTIONS, []);
    return all.filter(s => s.employeeId === employeeId);
  },

  create(data: Omit<SanctionRecord, 'id' | 'createdAt' | 'updatedAt'>): SanctionRecord {
    const records = getFromStorage<SanctionRecord[]>(STORAGE_KEYS.SANCTIONS, []);
    const record: SanctionRecord = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    records.push(record);
    saveToStorage(STORAGE_KEYS.SANCTIONS, records);
    return record;
  }
};

// ============================================================================
// EXIT RECORDS
// ============================================================================

export interface ExitRecord {
  id: string;
  employeeId: string;
  exitType: 'Resignation' | 'Termination' | 'End of Contract' | 'Death';
  lastWorkingDay: string;
  noticeDate?: string;
  reason?: string;
  clearanceChecklist: {
    assetReturn: boolean;
    documentsHandover: boolean;
    accessRevoked: boolean;
    finalPayment: boolean;
    exitInterview: boolean;
  };
  exitInterviewNotes?: string;
  status: 'initiated' | 'in-progress' | 'completed';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export const exitService = {
  get(employeeId: string): ExitRecord | null {
    const all = getFromStorage<ExitRecord[]>(STORAGE_KEYS.EXIT_RECORDS, []);
    return all.find(e => e.employeeId === employeeId) || null;
  },

  create(data: Omit<ExitRecord, 'id' | 'createdAt' | 'updatedAt'>): ExitRecord {
    const records = getFromStorage<ExitRecord[]>(STORAGE_KEYS.EXIT_RECORDS, []);
    const record: ExitRecord = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    records.push(record);
    saveToStorage(STORAGE_KEYS.EXIT_RECORDS, records);
    return record;
  },

  update(id: string, data: Partial<ExitRecord>): ExitRecord | null {
    const records = getFromStorage<ExitRecord[]>(STORAGE_KEYS.EXIT_RECORDS, []);
    const index = records.findIndex(r => r.id === id);
    if (index === -1) return null;
    
    records[index] = {
      ...records[index],
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    saveToStorage(STORAGE_KEYS.EXIT_RECORDS, records);
    return records[index];
  }
};
