/**
 * ============================================================================
 * Employee Constants & Validation - PHASE 1
 * ============================================================================
 *
 * Centralized constants for employee management.
 * Aligned with database schema and backend status enums.
 */

// ============================================================================
// EMPLOYEE STATUS
// ============================================================================

export const EMPLOYEE_STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'on_leave', label: 'On Leave', color: 'bg-blue-100 text-blue-800' },
  { value: 'suspended', label: 'Suspended', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'terminated', label: 'Terminated', color: 'bg-red-100 text-red-800' },
  { value: 'resigned', label: 'Resigned', color: 'bg-gray-100 text-gray-800' },
] as const;

export const EMPLOYEE_STATUS_MAP = Object.fromEntries(
  EMPLOYEE_STATUS_OPTIONS.map((opt) => [opt.value, opt])
);

// ============================================================================
// EMPLOYMENT TYPE
// ============================================================================

export const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'intern', label: 'Intern' },
] as const;

export const EMPLOYMENT_TYPE_MAP = Object.fromEntries(
  EMPLOYMENT_TYPE_OPTIONS.map((opt) => [opt.value, opt])
);

// ============================================================================
// STAFF CATEGORY
// ============================================================================

export const STAFF_CATEGORY_OPTIONS = [
  { value: 'national', label: 'National' },
  { value: 'international', label: 'International' },
  { value: 'expatriate', label: 'Expatriate' },
] as const;

export const STAFF_CATEGORY_MAP = Object.fromEntries(
  STAFF_CATEGORY_OPTIONS.map((opt) => [opt.value, opt])
);

// ============================================================================
// GENDER
// ============================================================================

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
] as const;

export const GENDER_MAP = Object.fromEntries(GENDER_OPTIONS.map((opt) => [opt.value, opt]));

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get status display info
 */
export function getEmployeeStatusInfo(status: string) {
  return EMPLOYEE_STATUS_MAP[status as keyof typeof EMPLOYEE_STATUS_MAP] || EMPLOYEE_STATUS_OPTIONS[0];
}

/**
 * Get employment type display info
 */
export function getEmploymentTypeInfo(type: string) {
  return EMPLOYMENT_TYPE_MAP[type as keyof typeof EMPLOYMENT_TYPE_MAP] || EMPLOYMENT_TYPE_OPTIONS[0];
}

/**
 * Get staff category display info
 */
export function getStaffCategoryInfo(category: string) {
  return STAFF_CATEGORY_MAP[category as keyof typeof STAFF_CATEGORY_MAP] || STAFF_CATEGORY_OPTIONS[0];
}

/**
 * Get gender display info
 */
export function getGenderInfo(gender: string) {
  return GENDER_MAP[gender as keyof typeof GENDER_MAP] || GENDER_OPTIONS[0];
}

/**
 * Format employee full name
 */
export function formatEmployeeFullName(firstName?: string | null, lastName?: string | null): string {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Unknown';
}

/**
 * Format employee display name (with fallback)
 */
export function formatEmployeeDisplayName(
  firstName?: string | null,
  lastName?: string | null,
  email?: string | null
): string {
  const fullName = formatEmployeeFullName(firstName, lastName);
  return fullName !== 'Unknown' ? fullName : email || 'Unknown';
}
