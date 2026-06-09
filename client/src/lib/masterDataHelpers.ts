/**
 * Master Data Helpers
 * Centralized utilities for managing option sets, values, and types across IMS
 * 
 * Pattern: Similar to GLOBAL_CURRENCIES in BudgetInformationSection.tsx
 * Supports both static local datasets and database-managed datasets
 * Bilingual support (English + Arabic)
 */

/**
 * Base interfaces for master data structures
 */

export interface MasterDataOption {
  value: string;
  label: string;
  labelAr?: string;
  type?: string;
  category?: string;
  active?: boolean;
  sortOrder?: number;
  color?: string;
  icon?: string;
}

export interface MasterDataValue {
  id?: number;
  optionSetId?: number;

  value: string;

  label: string;
  labelAr?: string | null;

  category?: string;
  type?: string;

  description?: string;
  descriptionAr?: string | null;

  active?: boolean;
  isActive?: boolean;

  sortOrder?: number;

  color?: string;
  icon?: string;

  isGlobal?: boolean;
}

export type UnitCategory =
  | 'goods'
  | 'time_based'
  | 'programmatic';

export interface MasterDataSet {
  id?: number;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  values: MasterDataValue[];
  type?: string;
  category?: string;
  isSystem?: boolean;
  isLocal?: boolean; // Indicates if this is a local/static dataset
}

export interface MasterDataType {
  id?: number;
  name: string;
  nameAr?: string;
  category?: string;
  description?: string;
  descriptionAr?: string;
  active?: boolean;
  sortOrder?: number;
}

/**
 * Dropdown option interface for UI components
 */
export interface DropdownOption {
  value: string;
  label: string;
  labelAr?: string | null;
  group?: string;
  disabled?: boolean;
  icon?: string;
  color?: string;
}

/**
 * Build localized dropdown options from master data
 * Pattern: Similar to currency dropdown generation
 * 
 * @param data - Array of master data values
 * @param isRTL - Whether to use RTL layout
 * @param language - Current language ('en' or 'ar')
 * @returns Array of dropdown options
 */
export function buildLocalizedOptions(
  data: MasterDataValue[],
  isRTL: boolean = false,
  language: 'en' | 'ar' | 'it' = 'en'
): DropdownOption[] {
  return data
    .filter((item) => item.active !== false) // Filter out inactive items
    .sort((a, b) => {
      // Sort by sortOrder if available, then by label
      if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
        return a.sortOrder - b.sortOrder;
      }
      const labelA = language === 'ar' ? (a.labelAr || a.label) : a.label;
      const labelB = language === 'ar' ? (b.labelAr || b.label) : b.label;
      return labelA.localeCompare(labelB);
    })
    .map((item) => ({
      value: item.value,
      label: language === 'ar' ? (item.labelAr || item.label) : item.label,
      labelAr: item.labelAr || undefined,
      group: item.category || item.type,
      icon: item.icon,
      color: item.color,
    }));
}

/**
 * Get localized label for a value
 * 
 * @param value - The value to find
 * @param data - Array of master data values
 * @param language - Current language ('en' or 'ar')
 * @returns Localized label or the value itself if not found
 */
export function getLocalizedLabel(
  value: string,
  data: MasterDataValue[],
  language: 'en' | 'ar' | 'it' = 'en'
): string {
  const item = data.find((d) => d.value === value);
  if (!item) return value;
  return language === 'ar' ? (item.labelAr || item.label) : item.label;
}

/**
 * Group options by category/type
 * Useful for rendering grouped dropdowns
 * 
 * @param data - Array of master data values
 * @param language - Current language
 * @returns Object with categories as keys and options as values
 */
export function groupOptionsByCategory(
  data: MasterDataValue[],
  language: 'en' | 'ar' | 'it' = 'en'
): Record<string, DropdownOption[]> {
  const grouped: Record<string, DropdownOption[]> = {};

  data
    .filter((item) => item.active !== false)
    .forEach((item) => {
      const category = item.category || item.type || 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push({
        value: item.value,
        label: language === 'ar' ? (item.labelAr || item.label) : item.label,
        labelAr: item.labelAr || undefined,
        icon: item.icon,
        color: item.color,
      });
    });

  return grouped;
}

/**
 * Filter options by category/type
 * 
 * @param data - Array of master data values
 * @param category - Category to filter by
 * @param language - Current language
 * @returns Filtered dropdown options
 */
export function filterOptionsByCategory(
  data: MasterDataValue[],
  category: string,
  language: 'en' | 'ar' | 'it' = 'en'
): DropdownOption[] {
  return buildLocalizedOptions(
    data.filter((item) => item.category === category || item.type === category),
    false,
    language
  );
}

/**
 * Convert master data values to dropdown options
 * Handles bilingual labels and sorting
 * 
 * @param values - Array of master data values
 * @param language - Current language
 * @returns Array of dropdown options
 */
export function mapToDropdownOptions(
  values: MasterDataValue[],
  language: 'en' | 'ar' | 'it' = 'en'
): DropdownOption[] {
  return values
    .filter((v) => v.active !== false)
    .sort((a, b) => {
      if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
        return a.sortOrder - b.sortOrder;
      }
      const labelA = language === 'ar' ? (a.labelAr || a.label) : a.label;
      const labelB = language === 'ar' ? (b.labelAr || b.label) : b.label;
      return labelA.localeCompare(labelB);
    })
    .map((v) => ({
      value: v.value,
      label: language === 'ar' ? (v.labelAr || v.label) : v.label,
      labelAr: v.labelAr,
      group: v.category || v.type,
      icon: v.icon,
      color: v.color,
    }));
}

/**
 * Build option set from array of values
 * Pattern: Similar to GLOBAL_CURRENCIES structure
 * 
 * @param name - Name of the option set
 * @param nameAr - Arabic name
 * @param values - Array of values
 * @param isLocal - Whether this is a local/static dataset
 * @returns MasterDataSet object
 */
export function buildOptionSet(
  name: string,
  nameAr: string | undefined,
  values: MasterDataValue[],
  isLocal: boolean = true
): MasterDataSet {
  return {
    name,
    nameAr,
    values,
    isLocal,
    isSystem: false,
  };
}

/**
 * Merge local and database option sets
 * Allows hybrid approach: static data + dynamic data
 * 
 * @param localSets - Array of local/static option sets
 * @param dbSets - Array of database option sets
 * @returns Merged array with local sets first
 */
export function mergeOptionSets(
  localSets: MasterDataSet[],
  dbSets: MasterDataSet[]
): MasterDataSet[] {
  const merged = [...localSets];
  const localNames = new Set(localSets.map((s) => s.name));

  // Add DB sets that don't conflict with local sets
  dbSets.forEach((dbSet) => {
    if (!localNames.has(dbSet.name)) {
      merged.push(dbSet);
    }
  });

  return merged;
}

/**
 * Validate master data structure
 * Ensures required fields are present
 * 
 * @param data - Master data to validate
 * @returns true if valid, false otherwise
 */
export function validateMasterData(data: MasterDataValue[]): boolean {
  return data.every((item) => {
    return item.value && item.label && typeof item.value === 'string' && typeof item.label === 'string';
  });
}

/**
 * Transform database option set to dropdown options
 * Handles null/undefined values gracefully
 * 
 * @param optionSet - Option set from database
 * @param language - Current language
 * @returns Array of dropdown options
 */
export function transformOptionSetToDropdown(
  optionSet: any,
  language: 'en' | 'ar' | 'it' = 'en'
): DropdownOption[] {
  if (!optionSet || !optionSet.values || !Array.isArray(optionSet.values)) {
    return [];
  }

  return optionSet.values
    .filter((v: any) => v && v.isActive !== false)
    .map((v: any) => ({
      value: v.value || '',
      label: language === 'ar' ? (v.labelAr || v.label || '') : (v.label || ''),
      labelAr: v.labelAr,
      group: v.type || v.category,
      icon: v.icon,
      color: v.color,
    }));
}

/**
 * Get option value metadata (type, category, etc.)
 * 
 * @param value - The value to find
 * @param data - Array of master data values
 * @returns Metadata object or null if not found
 */
export function getOptionMetadata(
  value: string,
  data: MasterDataValue[]
): Partial<MasterDataValue> | null {
  return data.find((d) => d.value === value) || null;
}

/**
 * Create a new option value with defaults
 * 
 * @param value - The value key
 * @param label - English label
 * @param labelAr - Arabic label
 * @param type - Type/category
 * @returns New MasterDataValue object
 */
export function createOptionValue(
  value: string,
  label: string,
  labelAr?: string,
  type?: string
): MasterDataValue {
  return {
    value,
    label,
    labelAr: labelAr || label,
    type,
    active: true,
    sortOrder: 0,
  };
}

/**
 * Sort options by multiple criteria
 * 
 * @param options - Array of options to sort
 * @param sortBy - Field to sort by ('label', 'value', 'sortOrder')
 * @param language - Current language
 * @returns Sorted array
 */
export function sortOptions(
  options: MasterDataValue[],
  sortBy: 'label' | 'value' | 'sortOrder' = 'label',
  language: 'en' | 'ar' | 'it' = 'en'
): MasterDataValue[] {
  return [...options].sort((a, b) => {
    switch (sortBy) {
      case 'value':
        return a.value.localeCompare(b.value);
      case 'sortOrder':
        return (a.sortOrder || 0) - (b.sortOrder || 0);
      case 'label':
      default:
        const labelA = language === 'ar' ? (a.labelAr || a.label) : a.label;
        const labelB = language === 'ar' ? (b.labelAr || b.label) : b.label;
        return labelA.localeCompare(labelB);
    }
  });
}

/**
 * Check if option value exists in dataset
 * 
 * @param value - Value to check
 * @param data - Array of master data values
 * @returns true if value exists, false otherwise
 */
export function optionValueExists(value: string, data: MasterDataValue[]): boolean {
  return data.some((d) => d.value === value);
}

/**
 * Get all unique categories from option values
 * 
 * @param data - Array of master data values
 * @returns Array of unique categories
 */
export function getUniqueCategories(data: MasterDataValue[]): string[] {
  const categories = new Set<string>();
  data.forEach((item) => {
    if (item.category) categories.add(item.category);
    if (item.type) categories.add(item.type);
  });
  return Array.from(categories).sort();
}

/**
 * Export option set to CSV format
 * Useful for data migration and backup
 * 
 * @param optionSet - Option set to export
 * @returns CSV string
 */
export function exportOptionSetToCSV(optionSet: MasterDataSet): string {
  const headers = ['value', 'label', 'labelAr', 'type', 'category', 'active', 'sortOrder'];
  const rows = optionSet.values.map((v) => [
    v.value,
    v.label,
    v.labelAr || '',
    v.type || '',
    v.category || '',
    v.active ? 'true' : 'false',
    v.sortOrder || 0,
  ]);

  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
  return csv;
}

/**
 * Import option set from CSV format
 * 
 * @param csv - CSV string
 * @returns Array of MasterDataValue objects
 */
export function importOptionSetFromCSV(csv: string): MasterDataValue[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.replace(/"/g, '').trim());
  const values: MasterDataValue[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map((c) => c.replace(/"/g, '').trim());
    const row: Record<string, any> = {};

    headers.forEach((header, index) => {
      row[header] = cells[index];
    });

    values.push({
      value: row.value,
      label: row.label,
      labelAr: row.labelAr,
      type: row.type,
      category: row.category,
      active: row.active === 'true',
      sortOrder: parseInt(row.sortOrder) || 0,
    });
  }

  return values;
}
