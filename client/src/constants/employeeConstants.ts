/**
 * ============================================================================
 * EMPLOYEE CONSTANTS
 * ============================================================================
 * 
 * Centralized constants for employee management
 * Used across components to ensure consistency
 * 
 * ============================================================================
 */

// ============================================================================
// EMPLOYEE STATUS
// ============================================================================

export const EMPLOYEE_STATUS = {
  ACTIVE: "active",
  ON_LEAVE: "on_leave",
  SUSPENDED: "suspended",
  TERMINATED: "terminated",
  RESIGNED: "resigned",
} as const;

export const EMPLOYEE_STATUS_OPTIONS = [
  { value: "active", label: "Active", labelAr: "نشط" },
  { value: "on_leave", label: "On Leave", labelAr: "في إجازة" },
  { value: "suspended", label: "Suspended", labelAr: "موقوف" },
  { value: "terminated", label: "Terminated", labelAr: "منهى الخدمة" },
  { value: "resigned", label: "Resigned", labelAr: "استقال" },
] as const;

export const EMPLOYEE_STATUS_COLORS = {
  active: "bg-green-100 text-green-800",
  on_leave: "bg-yellow-100 text-yellow-800",
  suspended: "bg-red-100 text-red-800",
  terminated: "bg-gray-100 text-gray-800",
  resigned: "bg-blue-100 text-blue-800",
} as const;

// ============================================================================
// EMPLOYMENT TYPE
// ============================================================================

export const EMPLOYMENT_TYPE = {
  FULL_TIME: "full_time",
  PART_TIME: "part_time",
  CONTRACT: "contract",
  CONSULTANT: "consultant",
  INTERN: "intern",
} as const;

export const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "full_time", label: "Full Time", labelAr: "دوام كامل" },
  { value: "part_time", label: "Part Time", labelAr: "دوام جزئي" },
  { value: "contract", label: "Contract", labelAr: "عقد" },
  { value: "consultant", label: "Consultant", labelAr: "استشاري" },
  { value: "intern", label: "Intern", labelAr: "متدرب" },
] as const;

// ============================================================================
// STAFF CATEGORY
// ============================================================================

export const STAFF_CATEGORY = {
  NATIONAL: "national",
  INTERNATIONAL: "international",
  EXPATRIATE: "expatriate",
} as const;

export const STAFF_CATEGORY_OPTIONS = [
  { value: "national", label: "National", labelAr: "وطني" },
  { value: "international", label: "International", labelAr: "دولي" },
  { value: "expatriate", label: "Expatriate", labelAr: "أجنبي" },
] as const;

// ============================================================================
// GENDER
// ============================================================================

export const GENDER = {
  MALE: "male",
  FEMALE: "female",
  OTHER: "other",
} as const;

export const GENDER_OPTIONS = [
  { value: "male", label: "Male", labelAr: "ذكر" },
  { value: "female", label: "Female", labelAr: "أنثى" },
  { value: "other", label: "Other", labelAr: "أخرى" },
] as const;

// ============================================================================
// AUDIT ACTIONS
// ============================================================================

export const AUDIT_ACTION = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  RESTORE: "RESTORE",
} as const;

export const AUDIT_ACTION_LABELS = {
  CREATE: "Created",
  UPDATE: "Updated",
  DELETE: "Deleted",
  RESTORE: "Restored",
} as const;

export const AUDIT_ACTION_LABELS_AR = {
  CREATE: "تم الإنشاء",
  UPDATE: "تم التحديث",
  DELETE: "تم الحذف",
  RESTORE: "تم الاستعادة",
} as const;

// ============================================================================
// VALIDATION RULES
// ============================================================================

export const EMPLOYEE_VALIDATION = {
  EMPLOYEE_CODE_MAX_LENGTH: 50,
  FIRST_NAME_MAX_LENGTH: 100,
  LAST_NAME_MAX_LENGTH: 100,
  EMAIL_MAX_LENGTH: 255,
  PHONE_MAX_LENGTH: 20,
  NATIONALITY_MAX_LENGTH: 100,
  NATIONAL_ID_MAX_LENGTH: 50,
  PASSPORT_NUMBER_MAX_LENGTH: 50,
  DEPARTMENT_MAX_LENGTH: 100,
  POSITION_MAX_LENGTH: 100,
  JOB_TITLE_MAX_LENGTH: 100,
  GRADE_LEVEL_MAX_LENGTH: 50,
  ADDRESS_MAX_LENGTH: 255,
  CITY_MAX_LENGTH: 100,
  COUNTRY_MAX_LENGTH: 100,
  EMERGENCY_CONTACT_NAME_MAX_LENGTH: 100,
  EMERGENCY_CONTACT_PHONE_MAX_LENGTH: 20,
  EMERGENCY_CONTACT_RELATION_MAX_LENGTH: 50,
  BANK_NAME_MAX_LENGTH: 100,
  BANK_ACCOUNT_NUMBER_MAX_LENGTH: 50,
  IBAN_MAX_LENGTH: 50,
  NOTES_MAX_LENGTH: 1000,
} as const;

// ============================================================================
// PAGINATION
// ============================================================================

export const EMPLOYEE_PAGINATION = {
  DEFAULT_LIMIT: 100,
  DEFAULT_OFFSET: 0,
  MAX_LIMIT: 500,
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get status label in English
 */
export const getStatusLabel = (status?: string): string => {
  const option = EMPLOYEE_STATUS_OPTIONS.find((o) => o.value === status);
  return option?.label || "Unknown";
};

/**
 * Get status label in Arabic
 */
export const getStatusLabelAr = (status?: string): string => {
  const option = EMPLOYEE_STATUS_OPTIONS.find((o) => o.value === status);
  return option?.labelAr || "غير معروف";
};

/**
 * Get employment type label in English
 */
export const getEmploymentTypeLabel = (type?: string): string => {
  const option = EMPLOYMENT_TYPE_OPTIONS.find((o) => o.value === type);
  return option?.label || "Unknown";
};

/**
 * Get employment type label in Arabic
 */
export const getEmploymentTypeLabelAr = (type?: string): string => {
  const option = EMPLOYMENT_TYPE_OPTIONS.find((o) => o.value === type);
  return option?.labelAr || "غير معروف";
};

/**
 * Get staff category label in English
 */
export const getStaffCategoryLabel = (category?: string): string => {
  const option = STAFF_CATEGORY_OPTIONS.find((o) => o.value === category);
  return option?.label || "Unknown";
};

/**
 * Get staff category label in Arabic
 */
export const getStaffCategoryLabelAr = (category?: string): string => {
  const option = STAFF_CATEGORY_OPTIONS.find((o) => o.value === category);
  return option?.labelAr || "غير معروف";
};

/**
 * Get gender label in English
 */
export const getGenderLabel = (gender?: string): string => {
  const option = GENDER_OPTIONS.find((o) => o.value === gender);
  return option?.label || "Unknown";
};

/**
 * Get gender label in Arabic
 */
export const getGenderLabelAr = (gender?: string): string => {
  const option = GENDER_OPTIONS.find((o) => o.value === gender);
  return option?.labelAr || "غير معروف";
};

/**
 * Get status badge color
 */
export const getStatusBadgeColor = (status?: string): string => {
  return EMPLOYEE_STATUS_COLORS[status as keyof typeof EMPLOYEE_STATUS_COLORS] || "bg-gray-100 text-gray-800";
};

/**
 * Get audit action label in English
 */
export const getAuditActionLabel = (action?: string): string => {
  return AUDIT_ACTION_LABELS[action as keyof typeof AUDIT_ACTION_LABELS] || "Unknown";
};

/**
 * Get audit action label in Arabic
 */
export const getAuditActionLabelAr = (action?: string): string => {
  return AUDIT_ACTION_LABELS_AR[action as keyof typeof AUDIT_ACTION_LABELS_AR] || "غير معروف";
};

/**
 * Format full name
 */
export const formatFullName = (firstName?: string, lastName?: string): string => {
  return `${firstName || ""} ${lastName || ""}`.trim() || "Unknown";
};

/**
 * Format full name in Arabic
 */
export const formatFullNameAr = (firstNameAr?: string, lastNameAr?: string): string => {
  return `${firstNameAr || ""} ${lastNameAr || ""}`.trim() || "غير معروف";
};

/**
 * Calculate age from date of birth
 */
export const calculateAge = (dateOfBirth?: string): number | null => {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

/**
 * Calculate years of service
 */
export const calculateYearsOfService = (hireDate?: string): number | null => {
  if (!hireDate) return null;
  const today = new Date();
  const hire = new Date(hireDate);
  let years = today.getFullYear() - hire.getFullYear();
  const monthDiff = today.getMonth() - hire.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < hire.getDate())) {
    years--;
  }
  return years;
};

/**
 * Check if employee contract is expiring soon (within 30 days)
 */
export const isContractExpiringSoon = (contractEndDate?: string): boolean => {
  if (!contractEndDate) return false;
  const today = new Date();
  const endDate = new Date(contractEndDate);
  const daysUntilExpiry = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
};

/**
 * Check if employee contract has expired
 */
export const isContractExpired = (contractEndDate?: string): boolean => {
  if (!contractEndDate) return false;
  const today = new Date();
  const endDate = new Date(contractEndDate);
  return endDate < today;
};

/**
 * Check if employee is in probation period
 */
export const isInProbation = (contractStartDate?: string, probationEndDate?: string): boolean => {
  if (!contractStartDate || !probationEndDate) return false;
  const today = new Date();
  const start = new Date(contractStartDate);
  const probationEnd = new Date(probationEndDate);
  return today >= start && today <= probationEnd;
};

/**
 * Get days until contract expiry
 */
export const getDaysUntilContractExpiry = (contractEndDate?: string): number | null => {
  if (!contractEndDate) return null;
  const today = new Date();
  const endDate = new Date(contractEndDate);
  return Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};
