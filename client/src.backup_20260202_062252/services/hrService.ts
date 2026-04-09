import { calculatePayroll, PayrollCalculationInput } from '@/app/utils/payrollCalculations';
import { salaryScaleService } from './salaryScaleService';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface StaffMember {
  id: string;
  staffId: string; // Auto-generated: STF-001, STF-002, etc.
  fullName: string;
  gender: 'Male' | 'Female' | 'Other';
  nationality: string;
  position: string;
  department: string;
  projects: string[]; // Multiple projects allowed
  contractType: 'Fixed-Term' | 'Short-Term' | 'Consultancy' | 'Volunteer' | 'Daily Worker';
  
  // Grade & Scale (links to Salary Scale Table)
  grade?: string; // e.g., 'G1', 'G2', 'G3', 'G4', 'G5'
  step?: string; // e.g., 'Step 1', 'Step 2', 'Step 3'
  
  // ✅ EMPLOYMENT STATUS (PRIMARY - HR BEST PRACTICE MODEL)
  status: 'active' | 'archived' | 'exited'; // LOCKED: Only three canonical values
  
  // Date fields
  hireDate: string; // Date when staff was hired by organization
  contractStartDate: string; // Current contract start date
  contractEndDate?: string; // Current contract end date (optional for ongoing)
  
  // Default salary info (used for payroll generation)
  basicSalary: number;
  housingAllowance: number; // Can be value or calculated from %
  transportAllowance: number; // Can be value or calculated from %
  representationAllowance: number; // Can be value or calculated from %
  otherAllowances: number;
  
  // Default deductions
  socialSecurityRate: number; // Percentage (e.g., 7 for 7%)
  healthInsuranceRate: number; // Percentage (e.g., 5 for 5%)
  taxRate: number; // Percentage (e.g., 15 for 15%)
  
  currency: string;
  bankName?: string;
  accountNumber?: string;
  iban?: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  address?: string;
  supervisor?: string;
  supervisorEmail?: string;
  
  // Exit process fields (workflow-driven - only when status = 'exited')
  exitStarted?: boolean; // Exit workflow initiated
  exitCompleted?: boolean; // Exit workflow finalized (status becomes 'exited')
  exitType?: 'Resignation' | 'Termination' | 'End of Contract' | 'Death';
  lastWorkingDay?: string;
  
  createdAt: string;
  updatedAt: string;
}

/**
 * PayrollRecord - FULLY EDITABLE
 * 
 * All fields can be edited by HR/Finance to apply country-specific policies.
 * The system calculates totals but does NOT enforce rules.
 */
export interface PayrollRecord {
  id: string;
  staffId: string;
  staffName: string;
  position: string;
  project: string;
  
  // SALARY & ALLOWANCES (All Editable)
  basicSalary: number;
  housingAllowance: number; // Value (can be calculated from % if needed)
  transportAllowance: number; // Value (can be calculated from % if needed)
  representationAllowance: number; // Value (can be calculated from % if needed)
  otherAllowances: number; // Value
  
  // GROSS SALARY (Auto-calculated)
  grossSalary: number; // = Basic + All Allowances
  
  // TAXABLE INCOME (EDITABLE - This is the key flexibility point)
  taxableIncomeBase: number; // EDITABLE: Yemen=Basic, Others=Gross, Custom=Any
  taxRate: number; // EDITABLE: Percentage (e.g., 15 for 15%)
  taxAmount: number; // Auto: taxableIncomeBase * (taxRate / 100)
  
  // DEDUCTIONS (All Editable)
  socialSecurityRate: number; // Percentage
  socialSecurityAmount: number; // Auto or editable
  healthInsuranceRate: number; // Percentage
  healthInsuranceAmount: number; // Auto or editable
  otherDeductions: number; // Value
  
  // TOTALS (Auto-calculated)
  totalDeductions: number; // = Tax + Social + Health + Other
  netSalary: number; // = Gross - Total Deductions
  
  currency: string;
}

export interface PayrollSheet {
  id: string;
  month: string; // Format: "2026-01" (YYYY-MM)
  year: string;
  monthName: string; // e.g., "January"
  records: PayrollRecord[];
  
  // Totals
  totalBasicSalary: number;
  totalGrossSalary: number;
  totalDeductions: number;
  totalNetSalary: number;
  
  // Metadata
  preparedBy: string;
  preparedByTitle?: string;
  approvedBy?: string;
  approvedByTitle?: string;
  status: 'draft' | 'submitted' | 'approved';
  
  // Audit trail
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEYS = {
  STAFF: 'hr_staff_members',
  PAYROLL: 'hr_payroll_sheets',
  NEXT_STAFF_ID: 'hr_next_staff_id'
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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

function generateStaffId(): string {
  const nextId = getFromStorage<number>(STORAGE_KEYS.NEXT_STAFF_ID, 1);
  const staffId = `STF-${String(nextId).padStart(3, '0')}`;
  saveToStorage(STORAGE_KEYS.NEXT_STAFF_ID, nextId + 1);
  return staffId;
}

/**
 * ✅ VALIDATE EMPLOYMENT STATUS
 * Enforces canonical three-status model: active | archived | exited
 * Throws error if invalid status is provided
 */
function validateEmploymentStatus(status: string): 'active' | 'archived' | 'exited' {
  const validStatuses: Array<'active' | 'archived' | 'exited'> = ['active', 'archived', 'exited'];
  
  if (!validStatuses.includes(status as any)) {
    throw new Error(
      `❌ INVALID STATUS: "${status}"\n\n` +
      `Only these statuses are allowed:\n` +
      `✅ active - Active employees (payroll-eligible)\n` +
      `✅ archived - Inactive employees (not exited)\n` +
      `✅ exited - Exited employees (exit completed)\n\n` +
      `Invalid statuses like "ended", "inactive", "contract ended" are NOT permitted.`
    );
  }
  
  return status as 'active' | 'archived' | 'exited';
}

// ============================================================================
// STAFF MANAGEMENT
// ============================================================================

export const staffService = {
  getAll(): StaffMember[] {
    return getFromStorage<StaffMember[]>(STORAGE_KEYS.STAFF, []);
  },

  getById(id: string): StaffMember | undefined {
    return this.getAll().find(s => s.id === id);
  },

  getByStaffId(staffId: string): StaffMember | undefined {
    return this.getAll().find(s => s.staffId === staffId);
  },

  create(data: Omit<StaffMember, 'id' | 'staffId' | 'createdAt' | 'updatedAt'>): StaffMember {
    const staff = this.getAll();
    const newStaff: StaffMember = {
      ...data,
      id: generateId(),
      staffId: generateStaffId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    staff.push(newStaff);
    saveToStorage(STORAGE_KEYS.STAFF, staff);
    return newStaff;
  },

  addMultiple(dataArray: Partial<StaffMember>[]): StaffMember[] {
    const staff = this.getAll();
    const newStaffList: StaffMember[] = [];
    
    dataArray.forEach(data => {
      const newStaff: StaffMember = {
        fullName: data.fullName || '',
        gender: data.gender || 'Male',
        nationality: data.nationality || '',
        position: data.position || '',
        department: data.department || '',
        projects: data.projects || ['Unassigned'],
        contractType: data.contractType || 'Fixed-Term',
        status: data.status || 'active',
        hireDate: data.hireDate || '',
        contractStartDate: data.contractStartDate || '',
        contractEndDate: data.contractEndDate,
        basicSalary: data.basicSalary || 0,
        housingAllowance: data.housingAllowance || 0,
        transportAllowance: data.transportAllowance || 0,
        representationAllowance: data.representationAllowance || 0,
        otherAllowances: data.otherAllowances || 0,
        socialSecurityRate: data.socialSecurityRate || 7,
        healthInsuranceRate: data.healthInsuranceRate || 5,
        taxRate: data.taxRate || 15,
        currency: data.currency || 'USD',
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        iban: data.iban,
        dateOfBirth: data.dateOfBirth,
        phone: data.phone,
        email: data.email,
        address: data.address,
        supervisor: data.supervisor,
        supervisorEmail: data.supervisorEmail,
        id: generateId(),
        staffId: generateStaffId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      newStaffList.push(newStaff);
    });
    
    staff.push(...newStaffList);
    saveToStorage(STORAGE_KEYS.STAFF, staff);
    return newStaffList;
  },

  update(id: string, data: Partial<StaffMember>): StaffMember | null {
    const staff = this.getAll();
    const index = staff.findIndex(s => s.id === id);
    
    if (index === -1) return null;
    
    staff[index] = {
      ...staff[index],
      ...data,
      id: staff[index].id,
      staffId: staff[index].staffId,
      createdAt: staff[index].createdAt,
      updatedAt: new Date().toISOString()
    };
    
    saveToStorage(STORAGE_KEYS.STAFF, staff);
    return staff[index];
  },

  delete(id: string): boolean {
    const staff = this.getAll();
    const filtered = staff.filter(s => s.id !== id);
    
    if (filtered.length === staff.length) return false;
    
    saveToStorage(STORAGE_KEYS.STAFF, filtered);
    
    // Dispatch event for soft-delete integration
    window.dispatchEvent(new CustomEvent('staff-deleted', { 
      detail: { staffId: id } 
    }));
    
    return true;
  },
  
  /**
   * SOFT DELETE - Removes staff from active list
   * Returns the deleted staff member for archiving
   */
  softDelete(id: string): StaffMember | null {
    const staff = this.getAll();
    const index = staff.findIndex(s => s.id === id);
    
    if (index === -1) return null;
    
    const deletedStaff = staff[index];
    staff.splice(index, 1);
    saveToStorage(STORAGE_KEYS.STAFF, staff);
    
    return deletedStaff;
  },
  
  /**
   * ✅ ARCHIVE STAFF - Change status to 'archived'
   * Archived staff are excluded from Payroll, Salary Scale, Leave, etc.
   * But preserved for historical records and potential restore
   */
  archive(id: string): boolean {
    const staff = this.getAll();
    const index = staff.findIndex(s => s.id === id);
    
    if (index === -1) return false;
    
    // Update status to archived
    staff[index].status = 'archived';
    staff[index].updatedAt = new Date().toISOString();
    
    saveToStorage(STORAGE_KEYS.STAFF, staff);
    
    // Dispatch event for system-wide notification
    window.dispatchEvent(new CustomEvent('staff-archived', { 
      detail: { staffId: id } 
    }));
    
    return true;
  },
  
  /**
   * RESTORE - Adds staff back from deleted records
   */
  restore(staffData: StaffMember): boolean {
    const staff = this.getAll();
    
    // Check if staff already exists
    const exists = staff.some(s => s.id === staffData.id);
    if (exists) return false;
    
    // Mark as restored to active status
    staffData.status = 'active';
    staffData.updatedAt = new Date().toISOString();
    staff.push(staffData);
    saveToStorage(STORAGE_KEYS.STAFF, staff);
    
    return true;
  },

  /**
   * ✅ CANONICAL: Get all active staff (payroll-eligible)
   * Used by: Payroll, Salary Scale, Leave Management
   */
  getActive(): StaffMember[] {
    return this.getAll().filter(s => s.status === 'active');
  },

  /**
   * ✅ CANONICAL: Get all archived staff (inactive but not exited)
   * Suspended, long-term hold, etc.
   */
  getArchived(): StaffMember[] {
    return this.getAll().filter(s => s.status === 'archived');
  },

  /**
   * ✅ CANONICAL: Get all exited staff (employment ended)
   * Used by: Reference & Verification
   */
  getExited(): StaffMember[] {
    return this.getAll().filter(s => s.status === 'exited');
  },

  initializeSampleData(): void {
    const existing = this.getAll();
    if (existing.length > 0) return;

    const sampleStaff: Omit<StaffMember, 'id' | 'staffId' | 'createdAt' | 'updatedAt'>[] = [
      {
        fullName: 'Ahmed Hassan Mohamed',
        gender: 'Male',
        nationality: 'Yemen',
        position: 'Project Manager',
        department: 'Programs',
        projects: ['ECHO-YEM-001', 'UNHCR-SYR-002'],
        contractType: 'Fixed-Term',
        status: 'active',
        hireDate: '2024-01-15',
        contractStartDate: '2025-01-01',
        contractEndDate: '2026-12-31',
        basicSalary: 2500,
        housingAllowance: 500,
        transportAllowance: 375,
        representationAllowance: 625,
        otherAllowances: 100,
        socialSecurityRate: 7,
        healthInsuranceRate: 5,
        taxRate: 15,
        currency: 'USD',
        bankName: 'Jordan Bank',
        email: 'ahmed.hassan@example.org'
      },
      {
        fullName: 'Sarah Johnson',
        gender: 'Female',
        nationality: 'USA',
        position: 'MEAL Officer',
        department: 'MEAL',
        projects: ['SC-MENA-003'],
        contractType: 'Fixed-Term',
        status: 'active',
        hireDate: '2023-06-01',
        contractStartDate: '2025-06-01',
        contractEndDate: '2026-05-31',
        basicSalary: 3500,
        housingAllowance: 700,
        transportAllowance: 600,
        representationAllowance: 1000,
        otherAllowances: 150,
        socialSecurityRate: 7,
        healthInsuranceRate: 5,
        taxRate: 15,
        currency: 'USD',
        bankName: 'International Bank',
        email: 'sarah.johnson@example.org'
      },
      {
        fullName: 'Fatima Al-Zahra',
        gender: 'Female',
        nationality: 'Syria',
        position: 'Field Coordinator',
        department: 'Operations',
        projects: ['WFP-IRQ-004'],
        contractType: 'Short-Term',
        status: 'active',
        hireDate: '2025-03-01',
        contractStartDate: '2025-03-01',
        contractEndDate: '2026-02-28',
        basicSalary: 2000,
        housingAllowance: 400,
        transportAllowance: 300,
        representationAllowance: 500,
        otherAllowances: 80,
        socialSecurityRate: 7,
        healthInsuranceRate: 5,
        taxRate: 15,
        currency: 'USD',
        bankName: 'National Bank',
        email: 'fatima.zahra@example.org'
      },
      {
        fullName: 'Mohammed Ali Ibrahim',
        gender: 'Male',
        nationality: 'Iraq',
        position: 'Finance Officer',
        department: 'Finance',
        projects: ['ECHO-YEM-001'],
        contractType: 'Fixed-Term',
        status: 'active',
        hireDate: '2024-08-01',
        contractStartDate: '2024-08-01',
        contractEndDate: '2026-07-31',
        basicSalary: 2800,
        housingAllowance: 560,
        transportAllowance: 420,
        representationAllowance: 700,
        otherAllowances: 120,
        socialSecurityRate: 7,
        healthInsuranceRate: 5,
        taxRate: 15,
        currency: 'USD',
        bankName: 'Baghdad Bank',
        email: 'mohammed.ali@example.org'
      },
      {
        fullName: 'Leila Hassan',
        gender: 'Female',
        nationality: 'Lebanon',
        position: 'HR Coordinator',
        department: 'Human Resources',
        projects: ['SC-MENA-003', 'UNHCR-SYR-002'],
        contractType: 'Fixed-Term',
        status: 'active',
        hireDate: '2023-11-01',
        contractStartDate: '2024-11-01',
        contractEndDate: '2026-10-31',
        basicSalary: 2400,
        housingAllowance: 480,
        transportAllowance: 360,
        representationAllowance: 600,
        otherAllowances: 90,
        socialSecurityRate: 7,
        healthInsuranceRate: 5,
        taxRate: 15,
        currency: 'USD',
        bankName: 'Beirut Bank',
        email: 'leila.hassan@example.org'
      },
      {
        fullName: 'Omar Khaled',
        gender: 'Male',
        nationality: 'Jordan',
        position: 'Logistics Manager',
        department: 'Operations',
        projects: ['WFP-IRQ-004'],
        contractType: 'Fixed-Term',
        status: 'active',
        hireDate: '2024-04-01',
        contractStartDate: '2024-04-01',
        contractEndDate: '2026-03-31',
        basicSalary: 2600,
        housingAllowance: 520,
        transportAllowance: 390,
        representationAllowance: 650,
        otherAllowances: 110,
        socialSecurityRate: 7,
        healthInsuranceRate: 5,
        taxRate: 15,
        currency: 'USD',
        bankName: 'Jordan Bank',
        email: 'omar.khaled@example.org'
      },
      {
        fullName: 'Amira Saeed',
        gender: 'Female',
        nationality: 'Palestine',
        position: 'Communications Officer',
        department: 'Programs',
        projects: ['SC-MENA-003'],
        contractType: 'Fixed-Term',
        status: 'active',
        hireDate: '2025-01-01',
        contractStartDate: '2025-01-01',
        contractEndDate: '2026-12-31',
        basicSalary: 2200,
        housingAllowance: 440,
        transportAllowance: 330,
        representationAllowance: 550,
        otherAllowances: 85,
        socialSecurityRate: 7,
        healthInsuranceRate: 5,
        taxRate: 15,
        currency: 'USD',
        bankName: 'National Bank',
        email: 'amira.saeed@example.org'
      },
      {
        fullName: 'Youssef Rahman',
        gender: 'Male',
        nationality: 'Egypt',
        position: 'IT Support Specialist',
        department: 'Operations',
        projects: ['ECHO-YEM-001', 'UNHCR-SYR-002'],
        contractType: 'Consultancy',
        status: 'active',
        hireDate: '2024-09-15',
        contractStartDate: '2024-09-15',
        contractEndDate: '2026-09-14',
        basicSalary: 2100,
        housingAllowance: 420,
        transportAllowance: 315,
        representationAllowance: 525,
        otherAllowances: 75,
        socialSecurityRate: 7,
        healthInsuranceRate: 5,
        taxRate: 15,
        currency: 'USD',
        bankName: 'Cairo Bank',
        email: 'youssef.rahman@example.org'
      }
    ];

    sampleStaff.forEach(data => this.create(data));
  }
};

// ============================================================================
// PAYROLL MANAGEMENT
// ============================================================================

export const payrollService = {
  getAll(): PayrollSheet[] {
    return getFromStorage<PayrollSheet[]>(STORAGE_KEYS.PAYROLL, []);
  },

  getById(id: string): PayrollSheet | undefined {
    return this.getAll().find(p => p.id === id);
  },

  getByMonth(month: string): PayrollSheet | undefined {
    return this.getAll().find(p => p.month === month);
  },

  /**
   * Create payroll record from staff
   * Uses staff defaults but ALL values remain editable
   */
  createRecordFromStaff(staff: StaffMember): PayrollRecord {
    const input: PayrollCalculationInput = {
      basicSalary: staff.basicSalary,
      housingAllowance: staff.housingAllowance,
      transportAllowance: staff.transportAllowance,
      representationAllowance: staff.representationAllowance,
      otherAllowances: staff.otherAllowances,
      socialSecurityRate: staff.socialSecurityRate,
      healthInsuranceRate: staff.healthInsuranceRate,
      taxRate: staff.taxRate
    };

    const result = calculatePayroll(input);

    return {
      id: generateId(),
      staffId: staff.staffId,
      staffName: staff.fullName,
      position: staff.position,
      project: staff.projects[0] || 'N/A',
      basicSalary: staff.basicSalary,
      housingAllowance: staff.housingAllowance,
      transportAllowance: staff.transportAllowance,
      representationAllowance: staff.representationAllowance,
      otherAllowances: staff.otherAllowances,
      grossSalary: result.grossSalary,
      taxableIncomeBase: result.taxableIncomeBase,
      taxRate: staff.taxRate,
      taxAmount: result.taxAmount,
      socialSecurityRate: staff.socialSecurityRate,
      socialSecurityAmount: result.socialSecurityAmount,
      healthInsuranceRate: staff.healthInsuranceRate,
      healthInsuranceAmount: result.healthInsuranceAmount,
      otherDeductions: 0,
      totalDeductions: result.totalDeductions,
      netSalary: result.netSalary,
      currency: staff.currency
    };
  },

  /**
   * Generate payroll sheet for a month
   * 🔒 CRITICAL: Reads ONLY from Salary Scale Table (Active records)
   * Validates that all active staff have approved salary scales
   */
  generate(
    month: string,
    year: string,
    monthName: string,
    preparedBy: string,
    createdBy: string
  ): PayrollSheet | { error: string; missingStaff: string[] } {
    // Get all active staff from Staff Dictionary
    const activeStaff = staffService.getActive();
    
    if (activeStaff.length === 0) {
      return {
        error: 'No active staff found in Staff Dictionary',
        missingStaff: []
      };
    }
    
    // VALIDATION: Check that each active staff has an approved salary scale
    const missingStaff: string[] = [];
    const staffWithoutApprovedScale: string[] = [];
    
    activeStaff.forEach(staff => {
      const salaryScale = salaryScaleService.getActiveByStaffId(staff.staffId);
      
      if (!salaryScale) {
        missingStaff.push(`${staff.fullName} (${staff.staffId})`);
      } else if (salaryScale.status !== 'active') {
        staffWithoutApprovedScale.push(`${staff.fullName} (${staff.staffId}) - Status: ${salaryScale.status}`);
      }
    });
    
    // BLOCK if validation fails
    if (missingStaff.length > 0 || staffWithoutApprovedScale.length > 0) {
      const allMissing = [...missingStaff, ...staffWithoutApprovedScale];
      return {
        error: `Cannot generate payroll. The following staff members do not have active approved salary scales:\n${allMissing.join('\n')}`,
        missingStaff: allMissing
      };
    }
    
    // Generate payroll records from SALARY SCALE (not Staff Dictionary)
    const records: PayrollRecord[] = activeStaff.map(staff => {
      const salaryScale = salaryScaleService.getActiveByStaffId(staff.staffId)!;
      
      // Calculate total gross from salary scale
      const grossSalary = salaryScale.approvedGrossSalary;
      
      // Calculate deductions
      const taxableIncomeBase = grossSalary;
      const taxAmount = (taxableIncomeBase * 15) / 100; // Using default 15% tax rate
      const socialSecurityAmount = (grossSalary * 7) / 100; // Using default 7% social security
      const healthInsuranceAmount = (grossSalary * 5) / 100; // Using default 5% health insurance
      const totalDeductions = taxAmount + socialSecurityAmount + healthInsuranceAmount;
      const netSalary = grossSalary - totalDeductions;
      
      // Mark salary scale as used in payroll
      salaryScaleService.markUsedInPayroll(staff.staffId);
      
      return {
        id: generateId(),
        staffId: staff.staffId,
        staffName: staff.fullName,
        position: staff.position,
        project: staff.projects[0] || 'N/A',
        // 🔒 READ-ONLY: All values from Salary Scale
        basicSalary: salaryScale.approvedGrossSalary - salaryScale.housingAllowance - salaryScale.transportAllowance - salaryScale.representationAllowance - salaryScale.otherAllowances,
        housingAllowance: salaryScale.housingAllowance,
        transportAllowance: salaryScale.transportAllowance,
        representationAllowance: salaryScale.representationAllowance,
        otherAllowances: salaryScale.otherAllowances,
        grossSalary: grossSalary,
        taxableIncomeBase: taxableIncomeBase,
        taxRate: 15, // Default tax rate
        taxAmount: taxAmount,
        socialSecurityRate: 7, // Default social security rate
        socialSecurityAmount: socialSecurityAmount,
        healthInsuranceRate: 5, // Default health insurance rate
        healthInsuranceAmount: healthInsuranceAmount,
        otherDeductions: 0,
        totalDeductions: totalDeductions,
        netSalary: netSalary,
        currency: salaryScale.currency
      };
    });

    const totalBasicSalary = records.reduce((sum, r) => sum + r.basicSalary, 0);
    const totalGrossSalary = records.reduce((sum, r) => sum + r.grossSalary, 0);
    const totalDeductions = records.reduce((sum, r) => sum + r.totalDeductions, 0);
    const totalNetSalary = records.reduce((sum, r) => sum + r.netSalary, 0);

    const payroll: PayrollSheet = {
      id: generateId(),
      month,
      year,
      monthName,
      records,
      totalBasicSalary,
      totalGrossSalary,
      totalDeductions,
      totalNetSalary,
      preparedBy,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy
    };

    const payrolls = this.getAll();
    payrolls.push(payroll);
    saveToStorage(STORAGE_KEYS.PAYROLL, payrolls);

    return payroll;
  },

  /**
   * Update payroll record
   * Recalculates dependent values using canonical calculation engine
   */
  updateRecord(payrollId: string, recordId: string, updates: Partial<PayrollRecord>): PayrollSheet | null {
    const payroll = this.getById(payrollId);
    if (!payroll) return null;

    const recordIndex = payroll.records.findIndex(r => r.id === recordId);
    if (recordIndex === -1) return null;

    // Apply updates
    const record = { ...payroll.records[recordIndex], ...updates };

    // Recalculate using canonical engine
    const input: PayrollCalculationInput = {
      basicSalary: record.basicSalary,
      housingAllowance: record.housingAllowance,
      transportAllowance: record.transportAllowance,
      representationAllowance: record.representationAllowance,
      otherAllowances: record.otherAllowances,
      taxableIncomeBase: record.taxableIncomeBase,
      taxRate: record.taxRate,
      socialSecurityRate: record.socialSecurityRate,
      healthInsuranceRate: record.healthInsuranceRate,
      otherDeductions: record.otherDeductions
    };

    const result = calculatePayroll(input);

    // Update record with calculated values
    record.grossSalary = result.grossSalary;
    record.taxAmount = result.taxAmount;
    record.socialSecurityAmount = result.socialSecurityAmount;
    record.healthInsuranceAmount = result.healthInsuranceAmount;
    record.totalDeductions = result.totalDeductions;
    record.netSalary = result.netSalary;

    // Update record
    payroll.records[recordIndex] = record;

    // Recalculate totals
    payroll.totalBasicSalary = payroll.records.reduce((sum, r) => sum + r.basicSalary, 0);
    payroll.totalGrossSalary = payroll.records.reduce((sum, r) => sum + r.grossSalary, 0);
    payroll.totalDeductions = payroll.records.reduce((sum, r) => sum + r.totalDeductions, 0);
    payroll.totalNetSalary = payroll.records.reduce((sum, r) => sum + r.netSalary, 0);

    return this.update(payrollId, payroll);
  },

  update(id: string, data: Partial<PayrollSheet>): PayrollSheet | null {
    const payrolls = this.getAll();
    const index = payrolls.findIndex(p => p.id === id);
    
    if (index === -1) return null;
    
    payrolls[index] = {
      ...payrolls[index],
      ...data,
      id: payrolls[index].id,
      createdAt: payrolls[index].createdAt,
      updatedAt: new Date().toISOString()
    };
    
    saveToStorage(STORAGE_KEYS.PAYROLL, payrolls);
    return payrolls[index];
  },

  delete(id: string): boolean {
    const payrolls = this.getAll();
    const filtered = payrolls.filter(p => p.id !== id);
    
    if (filtered.length === payrolls.length) return false;
    
    saveToStorage(STORAGE_KEYS.PAYROLL, filtered);
    return true;
  },

  submit(id: string): PayrollSheet | null {
    return this.update(id, { status: 'submitted' });
  },

  approve(id: string, approvedBy: string, approvedByTitle?: string): PayrollSheet | null {
    return this.update(id, { 
      status: 'approved',
      approvedBy,
      approvedByTitle
    });
  }
};

// ============================================================================
// INITIALIZATION
// ============================================================================

export function initializeHRData(): void {
  staffService.initializeSampleData();
  
  // Initialize salary scales for all sample staff if they don't exist
  initializeSampleSalaryScales();
  
  // Generate sample January 2026 payroll if it doesn't exist
  initializeSamplePayroll();
}

/**
 * Initialize salary scales for all active staff members
 * This function is safe to call multiple times - it only creates missing scales
 */
function initializeSampleSalaryScales(): void {
  const activeStaff = staffService.getActive();
  
  let createdCount = 0;
  
  activeStaff.forEach(staff => {
    // Check if this staff member already has a salary scale
    const existingScale = salaryScaleService.getActiveByStaffId(staff.staffId);
    if (existingScale) return; // Already has a scale
    
    // Create a salary scale from their staff record
    const grossSalary = 
      staff.basicSalary +
      staff.housingAllowance +
      staff.transportAllowance +
      staff.representationAllowance +
      staff.otherAllowances;
    
    try {
      salaryScaleService.create({
        staffId: staff.staffId,
        staffName: staff.fullName,
        position: staff.position,
        department: staff.department,
        grade: staff.grade || 'G3',
        step: staff.step || 'Step 1',
        effectiveDate: staff.contractStartDate,
        basicSalary: staff.basicSalary,
        housingAllowance: staff.housingAllowance,
        transportAllowance: staff.transportAllowance,
        representationAllowance: staff.representationAllowance,
        otherAllowances: staff.otherAllowances,
        grossSalary: grossSalary,
        currency: staff.currency,
        status: 'active', // Auto-approve for sample data
        approvedBy: 'System Administrator',
        approvedDate: new Date().toISOString(),
        approvedGrossSalary: grossSalary,
        notes: 'Auto-generated from staff record during initialization'
      });
      createdCount++;
    } catch (error) {
      console.error(`Failed to create salary scale for ${staff.fullName} (${staff.staffId}):`, error);
    }
  });
  
  if (createdCount > 0) {
    console.log(`[initializeSampleSalaryScales] Created ${createdCount} salary scale(s) for staff members`);
  }
}

/**
 * Initialize sample payroll for January 2026
 */
function initializeSamplePayroll(): void {
  const existingPayroll = payrollService.getByMonth('2026-01');
  if (existingPayroll) return; // Already exists
  
  const activeStaff = staffService.getActive();
  if (activeStaff.length === 0) return; // No staff to process
  
  // Generate January 2026 payroll
  const result = payrollService.generate(
    '2026-01',
    '2026',
    'January',
    'HR Manager - System',
    'System Administrator'
  );
  
  // Check if generation was successful (not an error object)
  if (result && 'id' in result) {
    // Submit and approve it immediately for demo purposes
    payrollService.submit(result.id);
    payrollService.approve(result.id, 'Finance Director', 'Chief Financial Officer');
  } else if (result && 'error' in result) {
    console.warn('[initializeSamplePayroll] Could not generate sample payroll:', result.error);
  }
}

/**
 * EMERGENCY: Clear all HR data and reinitialize
 * Call this if data is corrupted or incomplete
 */
export function resetHRData(): void {
  localStorage.removeItem(STORAGE_KEYS.STAFF);
  localStorage.removeItem(STORAGE_KEYS.PAYROLL);
  localStorage.removeItem(STORAGE_KEYS.NEXT_STAFF_ID);
  initializeHRData();
}

/**
 * FIX CORRUPTED PAYROLL TOTALS
 * Recalculates totalDeductions and totalNetSalary for all existing payrolls
 */
export function fixPayrollTotals(): void {
  const payrolls = payrollService.getAll();
  
  payrolls.forEach(payroll => {
    // Recalculate totals from records
    payroll.totalBasicSalary = payroll.records.reduce((sum, r) => sum + r.basicSalary, 0);
    payroll.totalGrossSalary = payroll.records.reduce((sum, r) => sum + r.grossSalary, 0);
    payroll.totalDeductions = payroll.records.reduce((sum, r) => sum + r.totalDeductions, 0);
    payroll.totalNetSalary = payroll.records.reduce((sum, r) => sum + r.netSalary, 0);
  });
  
  // Save updated payrolls
  saveToStorage(STORAGE_KEYS.PAYROLL, payrolls);
  console.log('[fixPayrollTotals] Fixed totals for', payrolls.length, 'payroll sheets');
}