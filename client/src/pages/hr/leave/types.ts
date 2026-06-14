/**
 * ============================================================================
 * LEAVE MANAGEMENT - TYPE DEFINITIONS
 * ============================================================================
 */

export type LeaveType =
  | 'annual'
  | 'sick'
  | 'maternity'
  | 'paternity'
  | 'unpaid'
  | 'compassionate'
  | 'study'
  | 'other';

export type LeaveStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export interface LeaveRequest {
  id: string;

  organizationId?: number;
  operatingUnitId?: number;

  employeeId: number;

  staffId: string;
  staffName: string;

  position: string;
  department: string;
  fullAddress?: string;

  leaveType: LeaveType;

  startDate: string;
  endDate: string;

  totalDays: number;

  reason: string;

  attachmentUrl?: string;

  status: LeaveStatus;

  submittedAt?: string | null;

  approvedBy?: number | null;
  approvedAt?: string | null;

  rejectedBy?: number | null;
  rejectedAt?: string | null;

  rejectionReason?: string | null;

  balanceBefore?: number;
  balanceAfter?: number;

  notes?: string;

  createdAt: string;
  updatedAt: string;
   medicalReportFile?: string; // Required if Sick > 3 days (base64)
   medicalReportFileName?: string;
}

export interface LeaveBalance {
  employeeId: number;

  staffId: string;
  staffName: string;

  department: string;
  position: string;

  contractStartDate?: string;
  contractEndDate?: string;

  annualEntitlement: number;

  accrued: number;
  used: number;
  pending: number;
  remaining: number;
  available: number;
}

export interface LeaveBalanceSummary {
  totalStaff: number;
  avgAvailable: number;
  totalUsed: number;
  totalPending: number;
}

export interface LeaveApprovalAction {
  requestId: number;
  action: 'approve' | 'reject';
  rejectionReason?: string;
}