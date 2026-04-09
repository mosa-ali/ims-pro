/**
 * ============================================================================
 * HR SERVICE ADAPTER
 * ============================================================================
 * 
 * This adapter bridges the original localStorage-based API to tRPC database calls.
 * It maintains the same interface as the original hrService so that UI components
 * can work without modification.
 * 
 * IMPORTANT: This is a synchronous-looking API that wraps async tRPC calls.
 * For React components, use the hooks in hrTrpcService.ts instead.
 * 
 * ============================================================================
 */

import { trpc } from "@/lib/trpc";

// ============================================================================
// TYPE DEFINITIONS (matching original design)
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
  housingAllowance: number;
  transportAllowance: number;
  representationAllowance: number;
  otherAllowances: number;
  
  // Default deductions
  socialSecurityRate: number;
  healthInsuranceRate: number;
  taxRate: number;
  
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
  
  // Exit process fields
  exitStarted?: boolean;
  exitCompleted?: boolean;
  exitType?: 'Resignation' | 'Termination' | 'End of Contract' | 'Death';
  lastWorkingDay?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface PayrollRecord {
  id: string;
  staffId: string;
  staffName: string;
  position: string;
  project: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  representationAllowance: number;
  otherAllowances: number;
  grossSalary: number;
  taxableIncomeBase: number;
  taxRate: number;
  taxAmount: number;
  socialSecurityRate: number;
  socialSecurityAmount: number;
  healthInsuranceRate: number;
  healthInsuranceAmount: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  currency: string;
}

export interface PayrollSheet {
  id: string;
  month: string;
  year: string;
  monthName: string;
  records: PayrollRecord[];
  totalBasicSalary: number;
  totalGrossSalary: number;
  totalDeductions: number;
  totalNetSalary: number;
  preparedBy: string;
  preparedByTitle?: string;
  approvedBy?: string;
  approvedByTitle?: string;
  status: 'draft' | 'submitted' | 'approved';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============================================================================
// HELPER: Convert database employee to StaffMember format
// ============================================================================

function dbEmployeeToStaffMember(emp: any): StaffMember {
  // Map database status to original 3-status model
  let status: 'active' | 'archived' | 'exited' = 'active';
  if (emp.status === 'terminated' || emp.status === 'resigned') {
    status = 'exited';
  } else if (emp.status === 'suspended') {
    status = 'archived';
  }
  
  // Map employment type to contract type
  let contractType: StaffMember['contractType'] = 'Fixed-Term';
  if (emp.employmentType === 'contract') contractType = 'Short-Term';
  if (emp.employmentType === 'consultant') contractType = 'Consultancy';
  if (emp.employmentType === 'intern') contractType = 'Volunteer';
  
  return {
    id: String(emp.id),
    staffId: emp.employeeCode || `STF-${String(emp.id).padStart(3, '0')}`,
    fullName: `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
    gender: emp.gender === 'male' ? 'Male' : emp.gender === 'female' ? 'Female' : 'Other',
    nationality: emp.nationality || '',
    position: emp.position || emp.jobTitle || '',
    department: emp.department || '',
    projects: [], // Will be populated from related data
    contractType,
    status,
    hireDate: emp.hireDate ? new Date(emp.hireDate).toISOString().split('T')[0] : '',
    contractStartDate: emp.contractStartDate ? new Date(emp.contractStartDate).toISOString().split('T')[0] : '',
    contractEndDate: emp.contractEndDate ? new Date(emp.contractEndDate).toISOString().split('T')[0] : undefined,
    basicSalary: 0, // Will be populated from salary scale
    housingAllowance: 0,
    transportAllowance: 0,
    representationAllowance: 0,
    otherAllowances: 0,
    socialSecurityRate: 7,
    healthInsuranceRate: 5,
    taxRate: 15,
    currency: 'USD',
    bankName: emp.bankName,
    accountNumber: emp.bankAccountNumber,
    iban: emp.bankIban,
    dateOfBirth: emp.dateOfBirth ? new Date(emp.dateOfBirth).toISOString().split('T')[0] : undefined,
    phone: emp.phone,
    email: emp.email,
    address: emp.address,
    createdAt: emp.createdAt ? new Date(emp.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: emp.updatedAt ? new Date(emp.updatedAt).toISOString() : new Date().toISOString(),
  };
}

// ============================================================================
// REACT HOOK: Staff Service with tRPC
// ============================================================================

/**
 * React hook that provides staffService-like API using tRPC
 * Use this in React components instead of the static staffService
 */
export function useStaffService(organizationId: number, operatingUnitId: number) {
  const employeesQuery = trpc.hrEmployees.getAll.useQuery({
    organizationId,
    operatingUnitId,
  });
  
  const createMutation = trpc.hrEmployees.create.useMutation();
  const updateMutation = trpc.hrEmployees.update.useMutation();
  const deleteMutation = trpc.hrEmployees.delete.useMutation();
  
  const getAll = (): StaffMember[] => {
    if (!employeesQuery.data) return [];
    return employeesQuery.data.map(dbEmployeeToStaffMember);
  };
  
  const getActive = (): StaffMember[] => {
    return getAll().filter(s => s.status === 'active');
  };
  
  const getArchived = (): StaffMember[] => {
    return getAll().filter(s => s.status === 'archived');
  };
  
  const getExited = (): StaffMember[] => {
    return getAll().filter(s => s.status === 'exited');
  };
  
  const getById = (id: string): StaffMember | undefined => {
    return getAll().find(s => s.id === id);
  };
  
  const getByStaffId = (staffId: string): StaffMember | undefined => {
    return getAll().find(s => s.staffId === staffId);
  };
  
  return {
    // Data
    employees: getAll(),
    isLoading: employeesQuery.isLoading,
    error: employeesQuery.error,
    refetch: employeesQuery.refetch,
    
    // Query methods
    getAll,
    getActive,
    getArchived,
    getExited,
    getById,
    getByStaffId,
    
    // Mutation methods
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// ============================================================================
// STATIC SERVICE (for non-React contexts - uses cached data)
// ============================================================================

// Cache for static service (populated by React components)
let cachedEmployees: StaffMember[] = [];

export const staffService = {
  // Set cache from React component
  setCache(employees: StaffMember[]) {
    cachedEmployees = employees;
  },
  
  getAll(): StaffMember[] {
    return cachedEmployees;
  },
  
  getById(id: string): StaffMember | undefined {
    return cachedEmployees.find(s => s.id === id);
  },
  
  getByStaffId(staffId: string): StaffMember | undefined {
    return cachedEmployees.find(s => s.staffId === staffId);
  },
  
  getActive(): StaffMember[] {
    return cachedEmployees.filter(s => s.status === 'active');
  },
  
  getArchived(): StaffMember[] {
    return cachedEmployees.filter(s => s.status === 'archived');
  },
  
  getExited(): StaffMember[] {
    return cachedEmployees.filter(s => s.status === 'exited');
  },
  
  // These methods are stubs - actual operations should use the hook
  create(data: Partial<StaffMember>): StaffMember {
    console.warn('staffService.create() is deprecated. Use useStaffService hook instead.');
    throw new Error('Use useStaffService hook for mutations');
  },
  
  update(id: string, data: Partial<StaffMember>): StaffMember | null {
    console.warn('staffService.update() is deprecated. Use useStaffService hook instead.');
    throw new Error('Use useStaffService hook for mutations');
  },
  
  delete(id: string): boolean {
    console.warn('staffService.delete() is deprecated. Use useStaffService hook instead.');
    throw new Error('Use useStaffService hook for mutations');
  },
  
  softDelete(id: string): StaffMember | null {
    console.warn('staffService.softDelete() is deprecated. Use useStaffService hook instead.');
    throw new Error('Use useStaffService hook for mutations');
  },
  
  archive(id: string): boolean {
    console.warn('staffService.archive() is deprecated. Use useStaffService hook instead.');
    throw new Error('Use useStaffService hook for mutations');
  },
  
  restore(staffData: StaffMember): boolean {
    console.warn('staffService.restore() is deprecated. Use useStaffService hook instead.');
    throw new Error('Use useStaffService hook for mutations');
  },
  
  initializeSampleData(): void {
    // No-op - data is in database
  },
};

// ============================================================================
// PAYROLL SERVICE (uses tRPC)
// ============================================================================

export function usePayrollService(organizationId: number, operatingUnitId: number) {
  const payrollQuery = trpc.hrPayroll.getAll.useQuery({
    organizationId,
    operatingUnitId,
  });
  
  const createMutation = trpc.hrPayroll.create.useMutation();
  const updateMutation = trpc.hrPayroll.update.useMutation();
  const deleteMutation = trpc.hrPayroll.delete.useMutation();
  const generateMutation = trpc.hrPayroll.generateFromSalaryScale.useMutation();
  
  return {
    payrolls: payrollQuery.data || [],
    isLoading: payrollQuery.isLoading,
    error: payrollQuery.error,
    refetch: payrollQuery.refetch,
    
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    generate: generateMutation.mutateAsync,
    
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isGenerating: generateMutation.isPending,
  };
}

// Static payroll service (for non-React contexts)
export const payrollService = {
  getAll(): PayrollSheet[] {
    console.warn('payrollService.getAll() is deprecated. Use usePayrollService hook instead.');
    return [];
  },
  
  getById(id: string): PayrollSheet | undefined {
    console.warn('payrollService.getById() is deprecated. Use usePayrollService hook instead.');
    return undefined;
  },
  
  getByMonth(month: string): PayrollSheet | undefined {
    console.warn('payrollService.getByMonth() is deprecated. Use usePayrollService hook instead.');
    return undefined;
  },
  
  generate(month: string, year: string, monthName: string, preparedBy: string, createdBy: string): PayrollSheet | { error: string } {
    console.warn('payrollService.generate() is deprecated. Use usePayrollService hook instead.');
    throw new Error('Use usePayrollService hook for mutations');
  },
};

// ============================================================================
// INITIALIZATION (no-op for database-backed system)
// ============================================================================

export function initializeHRData(): void {
  // No-op - data is in database
  console.log('[HR Service] Using database-backed tRPC service');
}

export function resetHRData(): void {
  // No-op - use database admin tools
  console.warn('resetHRData() is not available in database-backed system');
}

export function fixPayrollTotals(): void {
  // No-op - use database admin tools
  console.warn('fixPayrollTotals() is not available in database-backed system');
}
