/**
 * ============================================================================
 * HR TYPE DEFINITIONS - Matching Figma Design
 * ============================================================================
 * 
 * These types match the exact structure expected by the Figma-designed
 * employee card components. The adapter functions below convert database
 * records to these types.
 */

export interface StaffMember {
 id: string;
 staffId: string; // Auto-generated: STF-001, STF-002, etc.
 fullName: string;
 gender: 'Male' | 'Female' | 'Other' | string;
 nationality: string;
 position: string;
 department: string;
 projects: string[]; // Multiple projects allowed
 contractType: 'Fixed-Term' | 'Short-Term' | 'Consultancy' | 'Volunteer' | 'Daily Worker' | string;
 
 // Grade & Scale (links to Salary Scale Table)
 grade?: string; // e.g., 'G1', 'G2', 'G3', 'G4', 'G5'
 step?: string; // e.g., 'Step 1', 'Step 2', 'Step 3'
 
 // Employment Status
 status: 'active' | 'archived' | 'exited';
 
 // Date fields
 hireDate: string;
 contractStartDate: string;
 contractEndDate?: string;
 
 // Salary info
 basicSalary: number;
 housingAllowance: number;
 transportAllowance: number;
 representationAllowance: number;
 otherAllowances: number;
 
 // Deductions
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

/**
 * Adapter function to convert database employee record to StaffMember type
 * This ensures compatibility with Figma-designed components
 */
export function toStaffMember(dbEmployee: any): StaffMember {
 return {
 id: String(dbEmployee.id),
 staffId: dbEmployee.employeeCode || `STF-${String(dbEmployee.id).padStart(3, '0')}`,
 fullName: `${dbEmployee.firstName || ''} ${dbEmployee.lastName || ''}`.trim(),
 gender: dbEmployee.gender || 'Other',
 nationality: dbEmployee.nationality || '',
 position: dbEmployee.jobTitle || '',
 department: dbEmployee.department || '',
 projects: dbEmployee.projects ? dbEmployee.projects.split(',').map((p: string) => p.trim()) : [],
 contractType: dbEmployee.employmentType || 'Fixed-Term',
 
 grade: dbEmployee.gradeLevel || undefined,
 step: dbEmployee.salaryStep || undefined,
 
 status: (dbEmployee.status as 'active' | 'archived' | 'exited') || 'active',
 
 hireDate: dbEmployee.hireDate ? new Date(dbEmployee.hireDate).toISOString() : new Date().toISOString(),
 contractStartDate: dbEmployee.contractStartDate 
 ? new Date(dbEmployee.contractStartDate).toISOString() 
 : (dbEmployee.hireDate ? new Date(dbEmployee.hireDate).toISOString() : new Date().toISOString()),
 contractEndDate: dbEmployee.contractEndDate ? new Date(dbEmployee.contractEndDate).toISOString() : undefined,
 
 basicSalary: Number(dbEmployee.basicSalary) || 0,
 housingAllowance: Number(dbEmployee.housingAllowance) || 0,
 transportAllowance: Number(dbEmployee.transportAllowance) || 0,
 representationAllowance: Number(dbEmployee.representationAllowance) || 0,
 otherAllowances: Number(dbEmployee.otherAllowances) || 0,
 
 socialSecurityRate: Number(dbEmployee.socialSecurityRate) || 0,
 healthInsuranceRate: Number(dbEmployee.healthInsuranceRate) || 0,
 taxRate: Number(dbEmployee.taxRate) || 0,
 
 currency: dbEmployee.currency || 'USD',
 bankName: dbEmployee.bankName || undefined,
 accountNumber: dbEmployee.accountNumber || undefined,
 iban: dbEmployee.iban || undefined,
 dateOfBirth: dbEmployee.dateOfBirth ? new Date(dbEmployee.dateOfBirth).toISOString() : undefined,
 phone: dbEmployee.phone || undefined,
 email: dbEmployee.email || undefined,
 address: dbEmployee.address || undefined,
 supervisor: dbEmployee.reportingTo || undefined,
 supervisorEmail: dbEmployee.supervisorEmail || undefined,
 
 exitStarted: dbEmployee.exitStarted || false,
 exitCompleted: dbEmployee.exitCompleted || false,
 exitType: dbEmployee.exitType || undefined,
 lastWorkingDay: dbEmployee.lastWorkingDay ? new Date(dbEmployee.lastWorkingDay).toISOString() : undefined,
 
 createdAt: dbEmployee.createdAt ? new Date(dbEmployee.createdAt).toISOString() : new Date().toISOString(),
 updatedAt: dbEmployee.updatedAt ? new Date(dbEmployee.updatedAt).toISOString() : new Date().toISOString(),
 };
}


/**
 * PayrollRecord - Payroll slip data
 */
export interface PayrollRecord {
 id: string;
 staffId: string;
 staffName: string;
 position: string;
 project: string;
 
 // SALARY & ALLOWANCES
 basicSalary: number;
 housingAllowance: number;
 transportAllowance: number;
 representationAllowance: number;
 otherAllowances: number;
 
 // GROSS SALARY
 grossSalary: number;
 
 // TAXABLE INCOME
 taxableIncomeBase: number;
 taxRate: number;
 taxAmount: number;
 
 // DEDUCTIONS
 socialSecurityRate: number;
 socialSecurityAmount: number;
 healthInsuranceRate: number;
 healthInsuranceAmount: number;
 otherDeductions: number;
 
 // TOTALS
 totalDeductions: number;
 netSalary: number;
 
 // METADATA
 month: string;
 year: string;
 currency: string;
 status: 'draft' | 'approved' | 'paid';
 createdAt: string;
 updatedAt: string;
}

/**
 * AppraisalRecord - Performance appraisal data
 */
export interface AppraisalRecord {
 id: string;
 staffId: string;
 staffName: string;
 position: string;
 department: string;
 reviewPeriod: string;
 reviewPeriodStart?: string;
 reviewPeriodEnd?: string;
 reviewDate: string;
 reviewerName: string;
 overallRating: 'Excellent' | 'Good' | 'Satisfactory' | 'Needs Improvement' | 'Unsatisfactory';
 
 // Ratings by category
 technicalSkills?: number;
 communication?: number;
 teamwork?: number;
 leadership?: number;
 problemSolving?: number;
 
 // Comments
 achievements?: string;
 areasForDevelopment?: string;
 goals?: string;
 employeeComments?: string;
 supervisorComments?: string;
 
 status: 'draft' | 'submitted' | 'approved';
 createdAt: string;
 updatedAt: string;
}

/**
 * DisciplinaryRecord - Sanctions and disciplinary actions
 */
export interface DisciplinaryRecord {
 id: string;
 staffId: string;
 staffName: string;
 position: string;
 department: string;
 
 incidentDate?: string;
 date: string;
 type: 'Observation / Note' | 'Verbal Warning' | 'Written Warning' | 'Final Warning' | 'Suspension' | 'Termination';
 severity: 'Low' | 'Medium' | 'High' | 'Critical';
 description?: string;
 reason: string;
 actionTaken: string;
 
 status: 'Open' | 'Under Review' | 'Closed (Action Taken)' | 'Appealed';
 issuedBy: string;
 witnessName?: string;
 
 createdAt: string;
 updatedAt: string;
}

/**
 * TrainingRecord - Training and development records
 */
export interface TrainingRecord {
 id: string;
 staffId: string;
 staffName: string;
 
 trainingName: string;
 trainingType: 'Internal' | 'External' | 'Online' | 'Workshop' | 'Conference';
 provider: string;
 startDate: string;
 endDate: string;
 duration: string;
 
 status: 'Planned' | 'In Progress' | 'Completed' | 'Cancelled';
 certificateIssued: boolean;
 certificateUrl?: string;
 
 cost?: number;
 currency?: string;
 
 notes?: string;
 createdAt: string;
 updatedAt: string;
}

/**
 * PerformanceReview - Performance review records
 */
export interface PerformanceReview {
 id: string;
 staffId: string;
 staffName: string;
 position: string;
 department: string;
 
 reviewType: 'Annual' | 'Mid-Year' | 'Quarterly' | 'Probation';
 reviewPeriod: string;
 reviewDate: string;
 reviewerName: string;
 
 overallRating: 'Excellent' | 'Good' | 'Satisfactory' | 'Needs Improvement' | 'Unsatisfactory';
 
 strengths?: string;
 areasForImprovement?: string;
 goals?: string;
 comments?: string;
 
 status: 'draft' | 'submitted' | 'approved';
 createdAt: string;
 updatedAt: string;
}

/**
 * ExitRecord - Exit and offboarding records
 */
export interface ExitRecord {
 id: string;
 staffId: string;
 staffName: string;
 position: string;
 department: string;
 
 exitType: 'Resignation' | 'Termination' | 'End of Contract' | 'Death' | 'Retirement';
 exitDate: string;
 lastWorkingDay: string;
 
 resignationDate?: string;
 resignationReason?: string;
 
 clearanceCompleted: boolean;
 exitInterviewCompleted: boolean;
 
 finalSettlementAmount?: number;
 finalSettlementPaid: boolean;
 
 notes?: string;
 createdAt: string;
 updatedAt: string;
}

/**
 * ReferenceRequest - Reference and verification records
 */
export interface ReferenceRequest {
 id: string;
 staffId: string;
 staffName: string;
 position: string;
 department: string;
 
 requestDate: string;
 requestedBy: string;
 requestingOrganization: string;
 
 referenceType: 'Employment Verification' | 'Character Reference' | 'Performance Reference';
 
 status: 'Pending' | 'In Progress' | 'Completed' | 'Declined';
 
 referenceDocument?: string;
 notes?: string;
 
 createdAt: string;
 updatedAt: string;
}
