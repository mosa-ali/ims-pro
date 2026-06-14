/**
 * ============================================================================
 * HR TYPE DEFINITIONS - Matching Figma Design
 * ============================================================================
 * 
 * These types match the exact structure expected by the Figma-designed
 * employee card components. The adapter functions below convert database
 * records to these types.
 * 
 * UPDATED: Added Italian language support (EN/AR/IT) and helper functions
 */

/**
 * Localized text structure - supports EN/AR/IT
 */
export interface LocalizedText {
  en: string;
  ar: string;
  it: string;
}

/**
 * Helper function to get localized text
 */
export function getText(en: string, ar: string, it: string, language: 'en' | 'ar' | 'it'): string {
  switch (language) {
    case 'ar':
      return ar;
    case 'it':
      return it;
    default:
      return en;
  }
}

/**
 * Helper function to get language key for object indexing
 */
export function getLanguageKey(language: string): 'en' | 'ar' | 'it' {
  if (language === 'ar') return 'ar';
  if (language === 'it') return 'it';
  return 'en';
}

/**
 * Helper function to format date based on language
 */
export function formatDateByLanguage(date: string | Date | undefined, language: 'en' | 'ar' | 'it'): string {
  if (!date) return '-';
  try {
    const locale = language === 'ar' ? 'ar-SA' : language === 'it' ? 'it-IT' : 'en-US';
    return new Date(date).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return String(date);
  }
}

/**
 * Helper function to format currency based on language
 */
export function formatCurrencyByLanguage(amount: number | string, currency: string, language: 'en' | 'ar' | 'it'): string {
  if (!amount) return '-';
  try {
    const locale = language === 'ar' ? 'ar-SA' : language === 'it' ? 'it-IT' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency || 'USD'
    }).format(Number(amount));
  } catch {
    return String(amount);
  }
}

export interface StaffMember {
 id: string;
 staffId: string; // Auto-generated: STF-001, STF-002, etc.
 fullName: string;
 firstName?: string;
 lastName?: string;
 gender: 'Male' | 'Female' | 'Other' | string;
 nationality: string;
 position: string;
 jobTitle?: string;
 department: string;
 projects: string[]; // Multiple projects allowed
 contractType: 'Fixed-Term' | 'Short-Term' | 'Consultancy' | 'Volunteer' | 'Daily Worker' | string;
 employmentType?: string;
 
 // Grade & Scale (links to Salary Scale Table)
 grade?: string; // e.g., 'G1', 'G2', 'G3', 'G4', 'G5'
 gradeLevel?: string;
 step?: string; // e.g., 'Step 1', 'Step 2', 'Step 3'
 salaryStep?: string;
 
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
 reportingTo?: string;
 supervisorEmail?: string;
 
 // Exit process fields
 exitStarted?: boolean;
 exitCompleted?: boolean;
 exitType?: 'Resignation' | 'Termination' | 'End of Contract' | 'Death';
 lastWorkingDay?: string;
 
 // Organization context
 organizationId?: number;
 operatingUnitId?: number;
 employeeCode?: string;
 
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
 firstName: dbEmployee.firstName,
 lastName: dbEmployee.lastName,
 gender: dbEmployee.gender || 'Other',
 nationality: dbEmployee.nationality || '',
 position: dbEmployee.jobTitle || '',
 jobTitle: dbEmployee.jobTitle,
 department: dbEmployee.department || '',
 projects: dbEmployee.projects ? dbEmployee.projects.split(',').map((p: string) => p.trim()) : [],
 contractType: dbEmployee.employmentType || 'Fixed-Term',
 employmentType: dbEmployee.employmentType,
 
 grade: dbEmployee.gradeLevel || undefined,
 gradeLevel: dbEmployee.gradeLevel,
 step: dbEmployee.salaryStep || undefined,
 salaryStep: dbEmployee.salaryStep,
 
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
 reportingTo: dbEmployee.reportingTo,
 supervisorEmail: dbEmployee.supervisorEmail || undefined,
 
 exitStarted: dbEmployee.exitStarted || false,
 exitCompleted: dbEmployee.exitCompleted || false,
 exitType: dbEmployee.exitType || undefined,
 lastWorkingDay: dbEmployee.lastWorkingDay ? new Date(dbEmployee.lastWorkingDay).toISOString() : undefined,
 
 organizationId: dbEmployee.organizationId,
 operatingUnitId: dbEmployee.operatingUnitId,
 employeeCode: dbEmployee.employeeCode,
 
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
