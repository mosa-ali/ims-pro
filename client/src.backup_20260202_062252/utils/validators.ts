/**
 * ============================================================================
 * VALIDATION UTILITIES
 * Reusable validation functions for forms
 * ============================================================================
 */

/**
 * Validate required field
 */
export function validateRequired(value: any, fieldName: string = 'This field'): string | null {
  if (value === null || value === undefined || value === '') {
    return `${fieldName} is required`;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return `${fieldName} is required`;
  }
  return null;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): string | null {
  if (!email) return null; // Allow empty if not required

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Invalid email format';
  }
  return null;
}

/**
 * Validate phone number
 */
export function validatePhoneNumber(phone: string): string | null {
  if (!phone) return null; // Allow empty if not required

  // Remove spaces and special characters
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length < 8) {
    return 'Phone number must be at least 8 digits';
  }
  if (cleaned.length > 15) {
    return 'Phone number must be at most 15 digits';
  }
  return null;
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function validateDate(date: string): string | null {
  if (!date) return null;

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return 'Invalid date format (YYYY-MM-DD)';
  }

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }

  return null;
}

/**
 * Validate date is not in the future
 */
export function validateDateNotFuture(date: string): string | null {
  if (!date) return null;

  const dateObj = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (dateObj > today) {
    return 'Date cannot be in the future';
  }

  return null;
}

/**
 * Validate date range
 */
export function validateDateRange(startDate: string, endDate: string): string | null {
  if (!startDate || !endDate) return null;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    return 'Start date must be before end date';
  }

  return null;
}

/**
 * Validate number range
 */
export function validateNumberRange(
  value: number,
  min?: number,
  max?: number
): string | null {
  if (value === null || value === undefined) return null;

  if (min !== undefined && value < min) {
    return `Value must be at least ${min}`;
  }

  if (max !== undefined && value > max) {
    return `Value must be at most ${max}`;
  }

  return null;
}

/**
 * Validate positive number
 */
export function validatePositiveNumber(value: number): string | null {
  if (value === null || value === undefined) return null;

  if (value < 0) {
    return 'Value must be positive';
  }

  return null;
}

/**
 * Validate percentage (0-100)
 */
export function validatePercentage(value: number): string | null {
  if (value === null || value === undefined) return null;

  if (value < 0 || value > 100) {
    return 'Percentage must be between 0 and 100';
  }

  return null;
}

/**
 * Validate string length
 */
export function validateLength(
  value: string,
  minLength?: number,
  maxLength?: number,
  fieldName: string = 'This field'
): string | null {
  if (!value) return null;

  if (minLength !== undefined && value.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`;
  }

  if (maxLength !== undefined && value.length > maxLength) {
    return `${fieldName} must be at most ${maxLength} characters`;
  }

  return null;
}

/**
 * Validate unique value in array
 */
export function validateUnique<T>(
  value: T,
  existingValues: T[],
  fieldName: string = 'This value'
): string | null {
  if (existingValues.includes(value)) {
    return `${fieldName} must be unique`;
  }
  return null;
}

/**
 * Validate project code format
 */
export function validateProjectCode(code: string): string | null {
  if (!code) return null;

  // Format: ABC-XYZ-2024-CAT-001
  const codeRegex = /^[A-Z0-9]+-[A-Z0-9]+-\d{4}-[A-Z]+-\d{3,4}$/;

  if (!codeRegex.test(code)) {
    return 'Invalid project code format (e.g., UNICEF-YEM-2024-EDU-007)';
  }

  return null;
}

/**
 * Validate case code format
 */
export function validateCaseCode(code: string): string | null {
  if (!code) return null;

  // Format: CM-PRJ001-0001
  const codeRegex = /^CM-[A-Z0-9]+-\d{4}$/;

  if (!codeRegex.test(code)) {
    return 'Invalid case code format (e.g., CM-PRJ001-0001)';
  }

  return null;
}

/**
 * Validate URL format
 */
export function validateURL(url: string): string | null {
  if (!url) return null;

  try {
    new URL(url);
    return null;
  } catch {
    return 'Invalid URL format';
  }
}

/**
 * Validate file size
 */
export function validateFileSize(
  file: File,
  maxSizeMB: number = 10
): string | null {
  const maxBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxBytes) {
    return `File size must be less than ${maxSizeMB}MB`;
  }

  return null;
}

/**
 * Validate file type
 */
export function validateFileType(
  file: File,
  allowedTypes: string[]
): string | null {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();

  if (!fileExtension || !allowedTypes.includes(fileExtension)) {
    return `File type must be one of: ${allowedTypes.join(', ')}`;
  }

  return null;
}

/**
 * Combine multiple validation results
 */
export function combineValidations(...errors: (string | null)[]): string | null {
  const firstError = errors.find(error => error !== null);
  return firstError || null;
}

/**
 * Validate object with schema
 */
export function validateObject<T extends Record<string, any>>(
  data: T,
  schema: Record<keyof T, (value: any) => string | null>
): Record<keyof T, string | null> {
  const errors: Record<string, string | null> = {};

  for (const key in schema) {
    const validator = schema[key];
    const value = data[key];
    errors[key] = validator(value);
  }

  return errors as Record<keyof T, string | null>;
}

/**
 * Check if validation errors exist
 */
export function hasValidationErrors(
  errors: Record<string, string | null>
): boolean {
  return Object.values(errors).some(error => error !== null);
}

/**
 * Get first validation error message
 */
export function getFirstError(
  errors: Record<string, string | null>
): string | null {
  const firstError = Object.values(errors).find(error => error !== null);
  return firstError || null;
}
