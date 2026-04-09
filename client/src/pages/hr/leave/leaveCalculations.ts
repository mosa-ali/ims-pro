/**
 * ============================================================================
 * LEAVE CALCULATIONS - BUSINESS LOGIC
 * ============================================================================
 * 
 * CORE RULE:
 * Leave is calculated from CONTRACT dates, NOT hire date
 * 
 * FORMULA:
 * Total Leave Days = (Contract Days ÷ 30) × 2.5
 * 
 * EXAMPLES:
 * - Full year (365 days): (365 ÷ 30) × 2.5 = 30.4 days
 * - 6 months (180 days): (180 ÷ 30) × 2.5 = 15 days
 * - Partial (293 days): (293 ÷ 30) × 2.5 = 24.4 days
 * 
 * ============================================================================
 */

/**
 * Calculate number of days between two dates (inclusive)
 */
export function calculateDaysBetween(startDate: string, endDate: string): number {
 const start = new Date(startDate);
 const end = new Date(endDate);
 
 // Calculate difference in milliseconds
 const diffTime = end.getTime() - start.getTime();
 
 // Convert to days and add 1 (inclusive of both start and end)
 const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
 
 return diffDays;
}

/**
 * Calculate annual leave entitlement based on contract period
 * 
 * @param contractStartDate - Contract start date
 * @param contractEndDate - Contract end date
 * @returns Annual leave entitlement in days (with decimals)
 */
export function calculateAnnualLeaveEntitlement(
 contractStartDate: string,
 contractEndDate: string
): number {
 const contractDays = calculateDaysBetween(contractStartDate, contractEndDate);
 
 // Formula: (Contract Days ÷ 30) × 2.5
 const leaveEntitlement = (contractDays / 30) * 2.5;
 
 // Round to 1 decimal place
 return Math.round(leaveEntitlement * 10) / 10;
}

/**
 * Calculate leave days for a leave request
 * 
 * @param startDate - Leave start date
 * @param endDate - Leave end date
 * @returns Number of leave days (inclusive)
 */
export function calculateLeaveDays(startDate: string, endDate: string): number {
 return calculateDaysBetween(startDate, endDate);
}

/**
 * Check if leave dates are within contract period
 */
export function isLeaveDateWithinContract(
 leaveStartDate: string,
 leaveEndDate: string,
 contractStartDate: string,
 contractEndDate: string
): boolean {
 const leaveStart = new Date(leaveStartDate);
 const leaveEnd = new Date(leaveEndDate);
 const contractStart = new Date(contractStartDate);
 const contractEnd = new Date(contractEndDate);
 
 return leaveStart >= contractStart && leaveEnd <= contractEnd;
}

/**
 * Validate leave request business rules
 */
export function validateLeaveRequest(request: {
 leaveType: string;
 startDate: string;
 endDate: string;
 totalDays: number;
 reason: string;
 justification?: string;
 medicalReportFile?: string;
 availableBalance?: number;
 contractStartDate: string;
 contractEndDate: string;
}): { valid: boolean; errors: string[] } {
 const errors: string[] = [];
 
 // 1. Check dates are valid
 const startDate = new Date(request.startDate);
 const endDate = new Date(request.endDate);
 
 if (endDate < startDate) {
 errors.push('End date must be after start date');
 }
 
 // 2. Check dates are within contract period
 if (!isLeaveDateWithinContract(
 request.startDate,
 request.endDate,
 request.contractStartDate,
 request.contractEndDate
 )) {
 errors.push('Leave dates must be within your contract period');
 }
 
 // 3. Check reason is provided
 if (!request.reason || request.reason.trim() === '') {
 errors.push('Reason is required');
 }
 
 // 4. Emergency leave > 3 days requires justification
 if (request.leaveType === 'Emergency Leave' && request.totalDays > 3) {
 if (!request.justification || request.justification.trim() === '') {
 errors.push('Justification is required for emergency leave exceeding 3 days');
 }
 }
 
 // 5. Sick leave > 3 days requires medical report
 if (request.leaveType === 'Sick Leave' && request.totalDays > 3) {
 if (!request.medicalReportFile) {
 errors.push('Medical report is required for sick leave exceeding 3 days');
 }
 }
 
 // 6. Annual leave cannot exceed available balance
 if (request.leaveType === 'Annual Leave') {
 if (request.availableBalance !== undefined && request.totalDays > request.availableBalance) {
 errors.push(`Insufficient leave balance. Available: ${request.availableBalance} days, Requested: ${request.totalDays} days`);
 }
 }
 
 return {
 valid: errors.length === 0,
 errors
 };
}
