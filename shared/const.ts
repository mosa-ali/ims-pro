export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';

/**
 * Check if a user role has platform admin privileges
 * Platform Super Admin and Platform Admin both have platform-level access
 */
export function isPlatformAdmin(role?: string): boolean {
  return role === 'platform_super_admin' || role === 'platform_admin';
}

/**
 * Global currency list for the system
 * Used across budgets, purchase requests, and financial modules
 */
export const GLOBAL_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'YER', name: 'Yemeni Rial', symbol: 'ر.ي' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'JOD', name: 'Jordanian Dinar', symbol: 'د.ا' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'ج.م' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق' },
  { code: 'OMR', name: 'Omani Rial', symbol: 'ر.ع' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'د.ب' },
];
