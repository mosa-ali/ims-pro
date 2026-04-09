/**
 * ============================================================================
 * ACCOUNTABILITY SERVICE
 * AUTHORITATIVE DATA SOURCE for MEAL Accountability & CRM Module
 * ============================================================================
 * 
 * STORAGE KEYS:
 * - pms_accountability_records: AccountabilityRecord[]
 * 
 * BUSINESS RULES:
 * 1. All record codes must be unique and follow format: ACC-YYYY-NNN
 * 2. Anonymous submissions do not require complainant information
 * 3. Sensitive cases require special handling and access control
 * 4. Resolution tracking: Open → In Progress → Closed
 * 5. Maintain full audit trail for all cases
 * 
 * ============================================================================
 */

export interface AccountabilityRecord {
  id: string;
  recordCode: string;
  projectId: number;
  type: 'Complaint' | 'Feedback' | 'Suggestion';
  category: string;
  severity: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'In Progress' | 'Closed';
  subject: string;
  description: string;
  submittedVia: string;
  anonymous: boolean;
  complainantName?: string;
  complainantGender?: string;
  complainantAgeGroup?: string;
  complainantContact?: string;
  complainantLocation?: string;
  sensitiveCase: boolean;
  receivedAt: Date;
  resolvedAt?: Date;
  createdBy: string;
}

const STORAGE_KEY = 'pms_accountability_records';

// ============================================================================
// CORE CRUD OPERATIONS
// ============================================================================

export function getAllRecords(): AccountabilityRecord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const records = JSON.parse(stored);
    // Parse date strings back to Date objects
    return records.map((r: any) => ({
      ...r,
      receivedAt: new Date(r.receivedAt),
      resolvedAt: r.resolvedAt ? new Date(r.resolvedAt) : undefined,
    }));
  } catch (error) {
    console.error('Error loading accountability records:', error);
    return [];
  }
}

export function getRecordById(id: string): AccountabilityRecord | null {
  const records = getAllRecords();
  return records.find(r => r.id === id) || null;
}

export function getRecordsByProject(projectId: number): AccountabilityRecord[] {
  const records = getAllRecords();
  return records.filter(r => r.projectId === projectId);
}

export function createRecord(record: Omit<AccountabilityRecord, 'id' | 'recordCode'>): AccountabilityRecord {
  const records = getAllRecords();
  
  // Generate new ID
  const newId = records.length > 0 
    ? String(Math.max(...records.map(r => parseInt(r.id))) + 1)
    : '1';
  
  // Generate record code
  const year = new Date().getFullYear();
  const existingCodes = records.filter(r => r.recordCode.startsWith(`ACC-${year}`));
  const nextNumber = existingCodes.length + 1;
  const recordCode = `ACC-${year}-${String(nextNumber).padStart(3, '0')}`;
  
  const newRecord: AccountabilityRecord = {
    ...record,
    id: newId,
    recordCode,
  };
  
  records.push(newRecord);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  
  return newRecord;
}

export function updateRecord(id: string, updates: Partial<AccountabilityRecord>): AccountabilityRecord | null {
  const records = getAllRecords();
  const index = records.findIndex(r => r.id === id);
  
  if (index === -1) return null;
  
  records[index] = { ...records[index], ...updates };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  
  return records[index];
}

export function deleteRecord(id: string): boolean {
  const records = getAllRecords();
  const filtered = records.filter(r => r.id !== id);
  
  if (filtered.length === records.length) return false;
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

// ============================================================================
// ANALYTICS & REPORTING
// ============================================================================

export interface AccountabilityKPIs {
  totalCases: number;
  openCases: number;
  inProgressCases: number;
  closedCases: number;
  resolutionRate: number;
  avgResolutionTime: number; // in days
  byType: {
    complaints: number;
    feedback: number;
    suggestions: number;
  };
  byCategory: Array<{ category: string; count: number }>;
  bySeverity: {
    high: number;
    medium: number;
    low: number;
  };
}

export function getAccountabilityKPIs(projectId?: number): AccountabilityKPIs {
  const records = projectId 
    ? getRecordsByProject(projectId)
    : getAllRecords();
  
  const totalCases = records.length;
  const openCases = records.filter(r => r.status === 'Open').length;
  const inProgressCases = records.filter(r => r.status === 'In Progress').length;
  const closedCases = records.filter(r => r.status === 'Closed').length;
  
  const resolutionRate = totalCases > 0 
    ? Math.round((closedCases / totalCases) * 100)
    : 0;
  
  // Calculate average resolution time for closed cases
  const resolvedCases = records.filter(r => r.status === 'Closed' && r.resolvedAt);
  const avgResolutionTime = resolvedCases.length > 0
    ? Math.round(
        resolvedCases.reduce((sum, r) => {
          const days = Math.floor(
            (new Date(r.resolvedAt!).getTime() - new Date(r.receivedAt).getTime()) / 
            (1000 * 60 * 60 * 24)
          );
          return sum + days;
        }, 0) / resolvedCases.length
      )
    : 0;
  
  // By type
  const byType = {
    complaints: records.filter(r => r.type === 'Complaint').length,
    feedback: records.filter(r => r.type === 'Feedback').length,
    suggestions: records.filter(r => r.type === 'Suggestion').length,
  };
  
  // By category
  const categoryMap = new Map<string, number>();
  records.forEach(r => {
    if (r.category) {
      categoryMap.set(r.category, (categoryMap.get(r.category) || 0) + 1);
    }
  });
  const byCategory = Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
  
  // By severity
  const bySeverity = {
    high: records.filter(r => r.severity === 'High').length,
    medium: records.filter(r => r.severity === 'Medium').length,
    low: records.filter(r => r.severity === 'Low').length,
  };
  
  return {
    totalCases,
    openCases,
    inProgressCases,
    closedCases,
    resolutionRate,
    avgResolutionTime,
    byType,
    byCategory,
    bySeverity,
  };
}

// ============================================================================
// INITIALIZE SAMPLE DATA
// ============================================================================

export function initializeSampleData(): void {
  const existing = getAllRecords();
  if (existing.length > 0) return; // Don't overwrite existing data
  
  const sampleRecords: AccountabilityRecord[] = [
    {
      id: '1',
      recordCode: 'ACC-2024-001',
      projectId: 1,
      type: 'Complaint',
      category: 'Service Quality',
      severity: 'High',
      status: 'Open',
      subject: 'Water quality issue in Al-Hudaydah',
      description: 'Beneficiaries reporting contaminated water supply',
      submittedVia: 'Hotline',
      anonymous: false,
      complainantName: 'Ahmed Hassan',
      complainantContact: '+967 123 456 789',
      sensitiveCase: true,
      receivedAt: new Date('2024-01-15'),
      createdBy: 'System',
    },
    {
      id: '2',
      recordCode: 'ACC-2024-002',
      projectId: 2,
      type: 'Feedback',
      category: 'Staff Conduct',
      severity: 'Medium',
      status: 'In Progress',
      subject: 'Excellent teacher performance',
      description: 'Parents appreciate the dedication of teachers',
      submittedVia: 'In-person',
      anonymous: false,
      complainantName: 'Fatima Ali',
      sensitiveCase: false,
      receivedAt: new Date('2024-02-01'),
      createdBy: 'System',
    },
  ];
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleRecords));
}

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export const accountabilityService = {
  getAllRecords,
  getRecordById,
  getRecordsByProject,
  createRecord,
  updateRecord,
  deleteRecord,
  getAccountabilityKPIs,
  initializeSampleData,
};
