/**
 * ============================================================================
 * SANCTIONS & DISCIPLINARY - TYPE DEFINITIONS
 * ============================================================================
 */

export type CaseStatus = 
  | 'draft'
  | 'investigation-pending'
  | 'investigation-in-progress'
  | 'investigation-completed'
  | 'decision-pending'
  | 'approval-pending'
  | 'approved-closed'
  | 'rejected';

export type RiskLevel = 'Low' | 'Medium' | 'High';

export type ApprovalDecision = 'Approve' | 'Reject';

// ============================================================================
// FORM 1: DISCIPLINARY CASE INITIATION
// ============================================================================

export interface DisciplinaryCaseInitiation {
  // Auto-filled (Read-only)
  staffId: string;
  fullName: string;
  position: string;
  department: string;
  
  // Form fields
  caseReferenceNumber: string; // Auto-generated
  caseTitle: string;
  allegationSummary: string;
  dateOfAllegation: string;
  reportedBy: string;
  initialRiskLevel: RiskLevel;
  immediateActionTaken: string;
  
  // Metadata
  createdBy: string;
  createdDate: string;
  submittedDate?: string;
  status: 'draft' | 'submitted';
}

// ============================================================================
// FORM 2: INVESTIGATION APPOINTMENT
// ============================================================================

export interface InvestigationAppointment {
  caseReferenceNumber: string;
  
  // Form fields
  investigationStartDate: string;
  expectedEndDate: string;
  investigationLead: string;
  investigationTeamMembers: string;
  scopeOfInvestigation: string;
  applicablePolicyReference: string;
  
  // Metadata
  createdBy: string;
  createdDate: string;
  confirmedDate?: string;
  status: 'draft' | 'confirmed';
}

// ============================================================================
// FORM 3: INVESTIGATION REPORT
// ============================================================================

export interface InvestigationReport {
  caseReferenceNumber: string;
  
  // Form fields
  summaryOfInvestigation: string;
  evidenceReviewed: string;
  witnesses: string;
  findings: string;
  conclusion: string;
  recommendation: string; // FREE TEXT - no predefined sanctions
  
  // Uploads
  evidenceFiles: UploadedFile[];
  interviewRecords: UploadedFile[];
  supportingDocuments: UploadedFile[];
  
  // Metadata
  createdBy: string;
  createdDate: string;
  submittedDate?: string;
  status: 'draft' | 'submitted';
}

// ============================================================================
// FORM 4: DISCIPLINARY DECISION
// ============================================================================

export interface DisciplinaryDecision {
  caseReferenceNumber: string;
  
  // Form fields
  decisionDate: string;
  decisionAuthority: string;
  finalDisciplinaryAction: string; // FREE TEXT - NOT DROPDOWN
  justification: string;
  effectiveDate: string;
  payrollImpact: boolean;
  payrollImpactDescription: string;
  
  // Uploads
  signedDisciplinaryLetter: UploadedFile[];
  supportingDocuments: UploadedFile[];
  
  // Metadata
  createdBy: string;
  createdDate: string;
  submittedDate?: string;
  status: 'draft' | 'submitted';
}

// ============================================================================
// FORM 5: DISCIPLINARY APPROVAL
// ============================================================================

export interface DisciplinaryApproval {
  caseReferenceNumber: string;
  
  // Form fields
  reviewedBy: string;
  approvalDecision: ApprovalDecision;
  approvalDate: string;
  approvalNotes: string;
  
  // Metadata
  createdBy: string;
  createdDate: string;
  status: 'draft' | 'approved' | 'rejected';
}

// ============================================================================
// FORM 6: FINAL DISCIPLINARY RECORD (AUTO-GENERATED)
// ============================================================================

export interface FinalDisciplinaryRecord {
  caseReferenceNumber: string;
  
  // Employee Details
  staffId: string;
  fullName: string;
  position: string;
  department: string;
  
  // Final Action
  finalActionTaken: string;
  effectiveDate: string;
  approvalAuthority: string;
  approvalDate: string;
  
  // Flags
  payrollImpact: boolean;
  statusChange: boolean;
  
  // Metadata
  generatedDate: string;
  generatedBy: string;
}

// ============================================================================
// COMPLETE DISCIPLINARY CASE
// ============================================================================

export interface DisciplinaryCase {
  // Core identification
  caseReferenceNumber: string;
  staffId: string;
  fullName: string;
  position: string;
  department: string;
  
  // Status tracking
  currentStatus: CaseStatus;
  createdDate: string;
  lastUpdatedDate: string;
  
  // Forms (nullable until completed)
  form1_initiation: DisciplinaryCaseInitiation;
  form2_investigation?: InvestigationAppointment;
  form3_report?: InvestigationReport;
  form4_decision?: DisciplinaryDecision;
  form5_approval?: DisciplinaryApproval;
  form6_final?: FinalDisciplinaryRecord;
  
  // Audit trail
  auditTrail: AuditEntry[];
}

// ============================================================================
// AUDIT TRAIL
// ============================================================================

export interface AuditEntry {
  timestamp: string;
  action: string;
  performedBy: string;
  details: string;
  formStep: 'form1' | 'form2' | 'form3' | 'form4' | 'form5' | 'form6';
}

// ============================================================================
// FILE UPLOADS
// ============================================================================

export interface UploadedFile {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedDate: string;
  uploadedBy: string;
  fileData?: string; // base64 for browser storage
}

// ============================================================================
// POLICY DOCUMENT
// ============================================================================

export interface PolicyDocument {
  id: string;
  title: string;
  description: string;
  version: string;
  effectiveDate: string;
  uploadedDate: string;
  uploadedBy: string;
  fileName: string;
  fileData?: string; // base64
}
