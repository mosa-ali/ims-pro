/**
 * ============================================================================
 * LEAVE MANAGEMENT - TYPE DEFINITIONS
 * ============================================================================
 */

export type LeaveType = 'Annual Leave' | 'Emergency Leave' | 'Sick Leave' | 'Other Leave';

export type LeaveStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected';

export interface LeaveRequest {
 id: string;
 staffId: string;
 staffName: string;
 position: string;
 department: string;
 
 leaveType: LeaveType;
 startDate: string;
 endDate: string;
 totalDays: number; // Auto-calculated, supports decimals
 
 reason: string; // Always required
 justification?: string; // Required if Emergency > 3 days
 medicalReportFile?: string; // Required if Sick > 3 days (base64)
 medicalReportFileName?: string;
 
 status: LeaveStatus;
 submittedDate?: string;
 approvedDate?: string;
 rejectedDate?: string;
 approvedBy?: string;
 rejectedBy?: string;
 rejectionReason?: string;
 
 createdAt: string;
 updatedAt: string;
}

export interface LeaveBalance {
 staffId: string;
 contractStartDate: string;
 contractEndDate: string;
 contractDays: number;
 
 // Annual Leave Balance
 openingBalance: number; // Calculated from contract
 usedLeave: number; // Approved annual leave
 pendingLeave: number; // Submitted but not approved
 remainingBalance: number; // Opening - Used
 availableBalance: number; // Remaining - Pending
 
 // Non-deductible leave (for reporting only)
 emergencyLeaveTaken: number;
 sickLeaveTaken: number;
 otherLeaveTaken: number;
 
 lastCalculated: string;
}
