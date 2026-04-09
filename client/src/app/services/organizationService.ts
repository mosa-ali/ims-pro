/**
 * ============================================================================
 * ORGANIZATION SETTINGS SERVICE
 * ============================================================================
 * 
 * PURPOSE: Centralized organization branding and settings
 * 
 * CRITICAL RULES:
 * - Logo is uploaded ONCE in Organization Settings
 * - Logo is stored as base64 data URL in localStorage
 * - Logo is automatically loaded everywhere (UI + Print)
 * - Fallback: If no logo, show organization name only
 * 
 * USAGE:
 * - Organization Settings → Branding → Upload Logo
 * - All forms/prints automatically fetch logo from here
 * 
 * ============================================================================
 */

export interface OrganizationSettings {
 name: string;
 nameAr?: string; // Arabic organization name
 logo?: string; // Base64 data URL (e.g., "data:image/png;base64,...")
 logoFileName?: string; // Original file name
 logoUploadedAt?: string; // ISO timestamp
 
 // Contact info (optional)
 email?: string;
 phone?: string;
 address?: string;
 addressAr?: string;
 
 // Audit
 updatedAt: string;
 updatedBy: string;
}

const STORAGE_KEY = 'organization_settings';

// Default organization settings
const DEFAULT_SETTINGS: OrganizationSettings = {
 name: 'Humanitarian Organization',
 nameAr: 'المنظمة الإنسانية',
 updatedAt: new Date().toISOString(),
 updatedBy: 'System'
};

/**
 * Get organization settings
 */
export function getOrganizationSettings(): OrganizationSettings {
 try {
 const stored = localStorage.getItem(STORAGE_KEY);
 if (stored) {
 return JSON.parse(stored);
 }
 } catch (error) {
 console.error('Error reading organization settings:', error);
 }
 return DEFAULT_SETTINGS;
}

/**
 * Update organization settings
 */
export function updateOrganizationSettings(
 updates: Partial<OrganizationSettings>,
 updatedBy: string
): OrganizationSettings {
 const current = getOrganizationSettings();
 const updated: OrganizationSettings = {
 ...current,
 ...updates,
 updatedAt: new Date().toISOString(),
 updatedBy
 };
 
 try {
 localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
 } catch (error) {
 console.error('Error saving organization settings:', error);
 }
 
 return updated;
}

/**
 * Upload organization logo
 * Converts file to base64 data URL for storage
 */
export async function uploadOrganizationLogo(
 file: File,
 updatedBy: string
): Promise<OrganizationSettings> {
 return new Promise((resolve, reject) => {
 // Validate file type
 const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
 if (!validTypes.includes(file.type)) {
 reject(new Error('Invalid file type. Please upload PNG, JPG, or SVG.'));
 return;
 }

 // Validate file size (max 2MB)
 const maxSize = 2 * 1024 * 1024; // 2MB
 if (file.size > maxSize) {
 reject(new Error('File too large. Maximum size is 2MB.'));
 return;
 }

 // Convert to base64
 const reader = new FileReader();
 
 reader.onload = (e) => {
 const dataUrl = e.target?.result as string;
 
 const updated = updateOrganizationSettings({
 logo: dataUrl,
 logoFileName: file.name,
 logoUploadedAt: new Date().toISOString()
 }, updatedBy);
 
 resolve(updated);
 };
 
 reader.onerror = () => {
 reject(new Error('Failed to read file.'));
 };
 
 reader.readAsDataURL(file);
 });
}

/**
 * Remove organization logo
 */
export function removeOrganizationLogo(updatedBy: string): OrganizationSettings {
 return updateOrganizationSettings({
 logo: undefined,
 logoFileName: undefined,
 logoUploadedAt: undefined
 }, updatedBy);
}

/**
 * Get organization logo URL
 * Returns logo data URL or undefined if no logo
 */
export function getOrganizationLogo(): string | undefined {
 const settings = getOrganizationSettings();
 return settings.logo;
}

/**
 * Get organization name (with fallback)
 */
export function getOrganizationName(language: 'en' | 'ar' = 'en'): string {
 const settings = getOrganizationSettings();
 if (language === 'ar' && settings.nameAr) {
 return settings.nameAr;
 }
 return settings.name;
}
