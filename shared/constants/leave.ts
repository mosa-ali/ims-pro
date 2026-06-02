/**
 * Leave Management Constants and Helpers
 * Centralized definitions for leave types, statuses, and formatting utilities
 */

// ============================================================================
// LEAVE REQUEST STATUS
// ============================================================================

export const LEAVE_REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const;

export type LeaveRequestStatus = typeof LEAVE_REQUEST_STATUS[keyof typeof LEAVE_REQUEST_STATUS];

export const LEAVE_REQUEST_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'approved', label: 'Approved', color: 'bg-green-100 text-green-800' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-800' },
] as const;

// ============================================================================
// LEAVE TYPES
// ============================================================================

export const LEAVE_TYPES = {
  ANNUAL: 'annual',
  SICK: 'sick',
  MATERNITY: 'maternity',
  PATERNITY: 'paternity',
  UNPAID: 'unpaid',
  COMPASSIONATE: 'compassionate',
  STUDY: 'study',
  OTHER: 'other',
} as const;

export type LeaveType = typeof LEAVE_TYPES[keyof typeof LEAVE_TYPES];

export const LEAVE_TYPE_OPTIONS = [
  { value: 'annual', label: 'Annual Leave', labelAr: 'إجازة سنوية', icon: '🏖️' },
  { value: 'sick', label: 'Sick Leave', labelAr: 'إجازة مرضية', icon: '🏥' },
  { value: 'maternity', label: 'Maternity Leave', labelAr: 'إجازة أمومة', icon: '👶' },
  { value: 'paternity', label: 'Paternity Leave', labelAr: 'إجازة أبوة', icon: '👨‍👧' },
  { value: 'unpaid', label: 'Unpaid Leave', labelAr: 'إجازة بدون راتب', icon: '💼' },
  { value: 'compassionate', label: 'Compassionate Leave', labelAr: 'إجازة رحيم', icon: '🤝' },
  { value: 'study', label: 'Study Leave', labelAr: 'إجازة دراسية', icon: '📚' },
  { value: 'other', label: 'Other Leave', labelAr: 'إجازة أخرى', icon: '📋' },
] as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get status information including label and color
 */
export function getLeaveRequestStatusInfo(status?: LeaveRequestStatus) {
  return LEAVE_REQUEST_STATUS_OPTIONS.find((opt) => opt.value === status) || LEAVE_REQUEST_STATUS_OPTIONS[0];
}

/**
 * Get leave type information including label and icon
 */
export function getLeaveTypeInfo(leaveType?: LeaveType) {
  return LEAVE_TYPE_OPTIONS.find((opt) => opt.value === leaveType) || LEAVE_TYPE_OPTIONS[0];
}

/**
 * Format leave type for display
 */
export function formatLeaveType(leaveType?: LeaveType): string {
  const info = getLeaveTypeInfo(leaveType);
  return `${info.icon} ${info.label}`;
}

/**
 * Format leave status for display
 */
export function formatLeaveStatus(status?: LeaveRequestStatus): string {
  const info = getLeaveRequestStatusInfo(status);
  return info.label;
}

/**
 * Get status badge color class
 */
export function getStatusBadgeColor(status?: LeaveRequestStatus): string {
  const info = getLeaveRequestStatusInfo(status);
  return info.color;
}

/**
 * Calculate total leave days between two dates (inclusive)
 */
export function calculateLeaveDays(startDate: Date | string, endDate: Date | string): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  // Reset time to avoid timezone issues
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  // Calculate difference in milliseconds and convert to days
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Add 1 to include both start and end dates
  return diffDays + 1;
}

/**
 * Check if leave request is pending
 */
export function isLeavePending(status?: LeaveRequestStatus): boolean {
  return status === LEAVE_REQUEST_STATUS.PENDING;
}

/**
 * Check if leave request is approved
 */
export function isLeaveApproved(status?: LeaveRequestStatus): boolean {
  return status === LEAVE_REQUEST_STATUS.APPROVED;
}

/**
 * Check if leave request is rejected
 */
export function isLeaveRejected(status?: LeaveRequestStatus): boolean {
  return status === LEAVE_REQUEST_STATUS.REJECTED;
}

/**
 * Check if leave request is cancelled
 */
export function isLeaveCancelled(status?: LeaveRequestStatus): boolean {
  return status === LEAVE_REQUEST_STATUS.CANCELLED;
}

/**
 * Check if leave request can be edited
 */
export function canEditLeaveRequest(status?: LeaveRequestStatus): boolean {
  return isLeavePending(status);
}

/**
 * Check if leave request can be approved
 */
export function canApproveLeaveRequest(status?: LeaveRequestStatus): boolean {
  return isLeavePending(status);
}

/**
 * Check if leave request can be rejected
 */
export function canRejectLeaveRequest(status?: LeaveRequestStatus): boolean {
  return isLeavePending(status);
}

/**
 * Check if leave request can be cancelled
 */
export function canCancelLeaveRequest(status?: LeaveRequestStatus): boolean {
  return isLeaveApproved(status);
}

/**
 * Format date range for display
 */
export function formatDateRange(startDate: string | Date, endDate: string | Date): string {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return `${startStr} - ${endStr}`;
}

/**
 * Get leave balance status
 */
export function getBalanceStatus(remaining: number): 'critical' | 'warning' | 'healthy' {
  if (remaining <= 2) return 'critical';
  if (remaining <= 5) return 'warning';
  return 'healthy';
}

/**
 * Format leave balance for display
 */
export function formatLeaveBalance(
  entitlement: number,
  used: number,
  remaining: number,
  pending: number = 0
): string {
  return `${remaining}/${entitlement} days (Used: ${used}, Pending: ${pending})`;
}

/**
 * Get balance color based on remaining days
 */
export function getBalanceColor(remaining: number): string {
  const status = getBalanceStatus(remaining);
  switch (status) {
    case 'critical':
      return 'text-red-600';
    case 'warning':
      return 'text-yellow-600';
    default:
      return 'text-green-600';
  }
}

/**
 * Get balance background color based on remaining days
 */
export function getBalanceBgColor(remaining: number): string {
  const status = getBalanceStatus(remaining);
  switch (status) {
    case 'critical':
      return 'bg-red-50';
    case 'warning':
      return 'bg-yellow-50';
    default:
      return 'bg-green-50';
  }
}

/**
 * Check if leave type requires approval
 */
export function requiresApproval(leaveType?: LeaveType): boolean {
  // All leave types require approval
  return true;
}

/**
 * Check if leave type is paid
 */
export function isPaidLeave(leaveType?: LeaveType): boolean {
  return leaveType !== LEAVE_TYPES.UNPAID;
}

/**
 * Get default entitlement for leave type
 */
export function getDefaultEntitlement(leaveType?: LeaveType): number {
  switch (leaveType) {
    case LEAVE_TYPES.ANNUAL:
      return 20;
    case LEAVE_TYPES.SICK:
      return 10;
    case LEAVE_TYPES.MATERNITY:
      return 90;
    case LEAVE_TYPES.PATERNITY:
      return 14;
    case LEAVE_TYPES.UNPAID:
      return 0;
    case LEAVE_TYPES.COMPASSIONATE:
      return 3;
    case LEAVE_TYPES.STUDY:
      return 5;
    default:
      return 0;
  }
}

/**
 * Validate leave request dates
 */
export function validateLeaveDates(startDate: string | Date, endDate: string | Date): {
  isValid: boolean;
  error?: string;
} {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  if (start > end) {
    return { isValid: false, error: 'Start date must be before end date' };
  }

  if (start < new Date()) {
    return { isValid: false, error: 'Start date cannot be in the past' };
  }

  return { isValid: true };
}

/**
 * Get leave request summary
 */
export function getLeaveRequestSummary(
  leaveType: LeaveType,
  totalDays: number,
  status: LeaveRequestStatus
): string {
  const typeInfo = getLeaveTypeInfo(leaveType);
  const statusInfo = getLeaveRequestStatusInfo(status);

  return `${typeInfo.label} - ${totalDays} days (${statusInfo.label})`;
}

// ============================================================================
// BILINGUAL TRANSLATIONS
// ============================================================================

export const LEAVE_TRANSLATIONS = {
  en: {
    title: 'Leave Management',
    description: 'Manage employee leave requests and balances',
    newRequest: 'New Request',
    totalRequests: 'Total Requests',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    requests: 'Leave Requests',
    balances: 'Leave Balances',
    filters: 'Filters',
    search: 'Search by staff name or ID...',
    selectLeaveType: 'Select Leave Type',
    allTypes: 'All Types',
    clearFilters: 'Clear Filters',
    all: 'All',
    staffName: 'Staff Name',
    leaveType: 'Leave Type',
    startDate: 'Start Date',
    endDate: 'End Date',
    days: 'Days',
    status: 'Status',
    actions: 'Actions',
    noRequests: 'No leave requests found',
    confirmApprove: 'Are you sure you want to approve this leave request?',
    confirmDelete: 'Are you sure you want to delete this leave request?',
    rejectionReason: 'Please enter rejection reason:',
    edit: 'Edit',
    approve: 'Approve',
    reject: 'Reject',
    delete: 'Delete',
    print: 'Print',
  },
  ar: {
    title: 'إدارة الإجازات',
    description: 'إدارة طلبات الإجازات والأرصدة للموظفين',
    newRequest: 'طلب جديد',
    totalRequests: 'إجمالي الطلبات',
    pending: 'قيد الانتظار',
    approved: 'موافق عليه',
    rejected: 'مرفوض',
    requests: 'طلبات الإجازات',
    balances: 'أرصدة الإجازات',
    filters: 'المرشحات',
    search: 'البحث باسم الموظف أو الرقم...',
    selectLeaveType: 'اختر نوع الإجازة',
    allTypes: 'جميع الأنواع',
    clearFilters: 'مسح المرشحات',
    all: 'الكل',
    staffName: 'اسم الموظف',
    leaveType: 'نوع الإجازة',
    startDate: 'تاريخ البداية',
    endDate: 'تاريخ النهاية',
    days: 'أيام',
    status: 'الحالة',
    actions: 'الإجراءات',
    noRequests: 'لم يتم العثور على طلبات إجازة',
    confirmApprove: 'هل أنت متأكد من رغبتك في الموافقة على طلب الإجازة هذا؟',
    confirmDelete: 'هل أنت متأكد من رغبتك في حذف طلب الإجازة هذا؟',
    rejectionReason: 'يرجى إدخال سبب الرفض:',
    edit: 'تعديل',
    approve: 'موافقة',
    reject: 'رفض',
    delete: 'حذف',
    print: 'طباعة',
  },
} as const;

export const LEAVE_STATUSES = [
  { value: 'pending', label: 'Pending', labelAr: 'قيد الانتظار' },
  { value: 'approved', label: 'Approved', labelAr: 'موافق عليه' },
  { value: 'rejected', label: 'Rejected', labelAr: 'مرفوض' },
  { value: 'cancelled', label: 'Cancelled', labelAr: 'ملغى' },
] as const;
