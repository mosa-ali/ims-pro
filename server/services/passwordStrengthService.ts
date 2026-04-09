/**
 * Password strength requirements
 */
export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

/**
 * Password strength feedback
 */
export interface PasswordStrengthFeedback {
  score: number; // 0-100
  strength: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumbers: boolean;
    hasSpecialChars: boolean;
  };
  feedback: string[];
}

/**
 * Default password requirements
 */
const DEFAULT_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false,
};

/**
 * Evaluate password strength
 */
export function evaluatePasswordStrength(
  password: string,
  requirements: PasswordRequirements = DEFAULT_REQUIREMENTS
): PasswordStrengthFeedback {
  const feedback: string[] = [];
  let score = 0;

  // Check minimum length
  const hasMinLength = password.length >= requirements.minLength;
  if (!hasMinLength) {
    feedback.push(`Password must be at least ${requirements.minLength} characters`);
  } else {
    score += 20;
    // Bonus points for longer passwords
    if (password.length >= 12) score += 5;
    if (password.length >= 16) score += 5;
  }

  // Check uppercase letters
  const hasUppercase = /[A-Z]/.test(password);
  if (requirements.requireUppercase && !hasUppercase) {
    feedback.push('Password must contain at least one uppercase letter');
  } else if (hasUppercase) {
    score += 15;
  }

  // Check lowercase letters
  const hasLowercase = /[a-z]/.test(password);
  if (requirements.requireLowercase && !hasLowercase) {
    feedback.push('Password must contain at least one lowercase letter');
  } else if (hasLowercase) {
    score += 15;
  }

  // Check numbers
  const hasNumbers = /[0-9]/.test(password);
  if (requirements.requireNumbers && !hasNumbers) {
    feedback.push('Password must contain at least one number');
  } else if (hasNumbers) {
    score += 20;
  }

  // Check special characters
  const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  if (requirements.requireSpecialChars && !hasSpecialChars) {
    feedback.push('Password must contain at least one special character');
  } else if (hasSpecialChars) {
    score += 20;
  }

  // Check for common patterns
  if (/(.)\1{2,}/.test(password)) {
    feedback.push('Password contains repeated characters');
    score -= 10;
  }

  // Check for sequential characters
  if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password)) {
    feedback.push('Password contains sequential characters');
    score -= 10;
  }

  // Ensure score is between 0 and 100
  score = Math.max(0, Math.min(100, score));

  // Determine strength level
  let strength: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
  if (score < 20) {
    strength = 'weak';
  } else if (score < 40) {
    strength = 'fair';
  } else if (score < 60) {
    strength = 'good';
  } else if (score < 80) {
    strength = 'strong';
  } else {
    strength = 'very-strong';
  }

  return {
    score,
    strength,
    requirements: {
      minLength: hasMinLength,
      hasUppercase,
      hasLowercase,
      hasNumbers,
      hasSpecialChars,
    },
    feedback,
  };
}

/**
 * Validate password meets all requirements
 */
export function isPasswordValid(
  password: string,
  requirements: PasswordRequirements = DEFAULT_REQUIREMENTS
): { valid: boolean; errors: string[] } {
  const feedback = evaluatePasswordStrength(password, requirements);

  return {
    valid: feedback.feedback.length === 0,
    errors: feedback.feedback,
  };
}

/**
 * Get password strength color
 */
export function getPasswordStrengthColor(strength: string): string {
  switch (strength) {
    case 'weak':
      return '#ef4444'; // red
    case 'fair':
      return '#f97316'; // orange
    case 'good':
      return '#eab308'; // yellow
    case 'strong':
      return '#84cc16'; // lime
    case 'very-strong':
      return '#22c55e'; // green
    default:
      return '#d1d5db'; // gray
  }
}

/**
 * Get password strength label
 */
export function getPasswordStrengthLabel(strength: string, language: 'en' | 'ar' = 'en'): string {
  const labels = {
    en: {
      weak: 'Weak',
      fair: 'Fair',
      good: 'Good',
      strong: 'Strong',
      'very-strong': 'Very Strong',
    },
    ar: {
      weak: 'ضعيف',
      fair: 'مقبول',
      good: 'جيد',
      strong: 'قوي',
      'very-strong': 'قوي جداً',
    },
  };

  return labels[language][strength as keyof typeof labels['en']] || strength;
}
