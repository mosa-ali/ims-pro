/**
 * ============================================================================
 * LEAVE SERVICE - DATA PERSISTENCE
 * ============================================================================
 * 
 * Manages leave requests and balances in localStorage
 * Integrates with Staff Dictionary for employee data
 * 
 * ============================================================================
 */

import { LeaveRequest, LeaveBalance, LeaveType, LeaveStatus } from './types';
import { calculateAnnualLeaveEntitlement, calculateDaysBetween } from './leaveCalculations';
import { staffService, StaffMember } from '@/app/services/hrService';

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEYS = {
  LEAVE_REQUESTS: 'hr_leave_requests',
  LEAVE_BALANCES: 'hr_leave_balances'
};

// ============================================================================
// LEAVE REQUEST SERVICE
// ============================================================================

export const leaveRequestService = {
  /**
   * Get all leave requests
   */
  getAll(): LeaveRequest[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LEAVE_REQUESTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  /**
   * Get leave requests by staff ID
   */
  getByStaffId(staffId: string): LeaveRequest[] {
    return this.getAll().filter(req => req.staffId === staffId);
  },

  /**
   * Get leave request by ID
   */
  getById(id: string): LeaveRequest | null {
    return this.getAll().find(req => req.id === id) || null;
  },

  /**
   * Create new leave request
   */
  create(data: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>): LeaveRequest {
    const requests = this.getAll();
    
    const newRequest: LeaveRequest = {
      ...data,
      id: `LR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    requests.push(newRequest);
    localStorage.setItem(STORAGE_KEYS.LEAVE_REQUESTS, JSON.stringify(requests));
    
    // Recalculate balance for this employee
    this.recalculateBalance(data.staffId);
    
    return newRequest;
  },

  /**
   * Update leave request
   */
  update(id: string, data: Partial<LeaveRequest>): boolean {
    const requests = this.getAll();
    const index = requests.findIndex(req => req.id === id);
    
    if (index === -1) return false;
    
    const originalStaffId = requests[index].staffId;
    
    requests[index] = {
      ...requests[index],
      ...data,
      id: requests[index].id,
      createdAt: requests[index].createdAt,
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem(STORAGE_KEYS.LEAVE_REQUESTS, JSON.stringify(requests));
    
    // Recalculate balance if status changed
    if (data.status) {
      this.recalculateBalance(originalStaffId);
    }
    
    return true;
  },

  /**
   * Delete leave request
   */
  delete(id: string): boolean {
    const requests = this.getAll();
    const request = requests.find(req => req.id === id);
    
    if (!request) return false;
    
    const filtered = requests.filter(req => req.id !== id);
    localStorage.setItem(STORAGE_KEYS.LEAVE_REQUESTS, JSON.stringify(filtered));
    
    // Recalculate balance
    this.recalculateBalance(request.staffId);
    
    return true;
  },

  /**
   * Submit leave request (change status from Draft to Submitted)
   */
  submit(id: string): boolean {
    return this.update(id, {
      status: 'Submitted',
      submittedDate: new Date().toISOString()
    });
  },

  /**
   * Approve leave request
   */
  approve(id: string, approvedBy: string): boolean {
    return this.update(id, {
      status: 'Approved',
      approvedDate: new Date().toISOString(),
      approvedBy
    });
  },

  /**
   * Reject leave request
   */
  reject(id: string, rejectedBy: string, rejectionReason: string): boolean {
    return this.update(id, {
      status: 'Rejected',
      rejectedDate: new Date().toISOString(),
      rejectedBy,
      rejectionReason
    });
  },

  /**
   * Recalculate leave balance for a staff member
   */
  recalculateBalance(staffId: string): void {
    const employee = staffService.getByStaffId(staffId);
    if (!employee) return;
    
    const balance = leaveBalanceService.calculateBalance(employee);
    leaveBalanceService.saveBalance(balance);
  }
};

// ============================================================================
// LEAVE BALANCE SERVICE
// ============================================================================

export const leaveBalanceService = {
  /**
   * Get all leave balances
   */
  getAll(): LeaveBalance[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LEAVE_BALANCES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  /**
   * Get leave balance by staff ID
   */
  getByStaffId(staffId: string): LeaveBalance | null {
    return this.getAll().find(bal => bal.staffId === staffId) || null;
  },

  /**
   * Calculate leave balance for a staff member
   */
  calculateBalance(employee: StaffMember): LeaveBalance {
    const requests = leaveRequestService.getByStaffId(employee.staffId);
    
    // Calculate opening balance from contract dates
    const contractDays = calculateDaysBetween(
      employee.contractStartDate,
      employee.contractEndDate || new Date().toISOString()
    );
    
    const openingBalance = calculateAnnualLeaveEntitlement(
      employee.contractStartDate,
      employee.contractEndDate || new Date().toISOString()
    );
    
    // Calculate used leave (Approved Annual Leave only)
    const usedLeave = requests
      .filter(req => req.status === 'Approved' && req.leaveType === 'Annual Leave')
      .reduce((sum, req) => sum + req.totalDays, 0);
    
    // Calculate pending leave (Submitted Annual Leave only)
    const pendingLeave = requests
      .filter(req => req.status === 'Submitted' && req.leaveType === 'Annual Leave')
      .reduce((sum, req) => sum + req.totalDays, 0);
    
    // Calculate non-deductible leave (for reporting)
    const emergencyLeaveTaken = requests
      .filter(req => req.status === 'Approved' && req.leaveType === 'Emergency Leave')
      .reduce((sum, req) => sum + req.totalDays, 0);
    
    const sickLeaveTaken = requests
      .filter(req => req.status === 'Approved' && req.leaveType === 'Sick Leave')
      .reduce((sum, req) => sum + req.totalDays, 0);
    
    const otherLeaveTaken = requests
      .filter(req => req.status === 'Approved' && req.leaveType === 'Other Leave')
      .reduce((sum, req) => sum + req.totalDays, 0);
    
    const remainingBalance = openingBalance - usedLeave;
    const availableBalance = remainingBalance - pendingLeave;
    
    return {
      staffId: employee.staffId,
      contractStartDate: employee.contractStartDate,
      contractEndDate: employee.contractEndDate || new Date().toISOString(),
      contractDays,
      openingBalance,
      usedLeave,
      pendingLeave,
      remainingBalance,
      availableBalance,
      emergencyLeaveTaken,
      sickLeaveTaken,
      otherLeaveTaken,
      lastCalculated: new Date().toISOString()
    };
  },

  /**
   * Save leave balance
   */
  saveBalance(balance: LeaveBalance): void {
    const balances = this.getAll();
    const index = balances.findIndex(bal => bal.staffId === balance.staffId);
    
    if (index >= 0) {
      balances[index] = balance;
    } else {
      balances.push(balance);
    }
    
    localStorage.setItem(STORAGE_KEYS.LEAVE_BALANCES, JSON.stringify(balances));
  },

  /**
   * Calculate and save balance for all active staff
   */
  recalculateAllBalances(): void {
    const allStaff = staffService.getAll();
    const activeStaff = allStaff.filter(s => s.status === 'active');
    
    activeStaff.forEach(employee => {
      const balance = this.calculateBalance(employee);
      this.saveBalance(balance);
    });
  }
};
