/**
 * Forecast Plan Import Configuration
 * 
 * Defines validation rules and column mappings for Forecast Plan Excel import.
 * Used by both frontend (preview) and backend (authoritative validation).
 * 
 * Note: Forecast Plan is linked to Budget Items, so budgetItemId must be valid.
 */

import { ImportConfig, ColumnDefinition } from '../importFramework';

/**
 * Forecast Plan column definitions
 */
export const FORECAST_COLUMNS: ColumnDefinition[] = [
  {
    key: 'budgetCode',
    header: 'Budget Code',
    headerAr: 'رمز الميزانية',
    required: true,
    dataType: 'string',
    referenceTable: 'budgetItems', // Will be validated in Layer 5 (backend)
  },
  {
    key: 'fiscalYear',
    header: 'Fiscal Year',
    headerAr: 'السنة المالية',
    required: true,
    dataType: 'string',
    pattern: /^FY\d{4}$/,
    customValidator: (value) => {
      if (!/^FY\d{4}$/.test(value)) {
        return 'Fiscal Year must be in format FY2024, FY2025, etc.';
      }
      return null;
    },
  },
  {
    key: 'yearNumber',
    header: 'Year Number',
    headerAr: 'رقم السنة',
    required: true,
    dataType: 'number',
    min: 1,
  },
  {
    key: 'm1',
    header: 'Month 1',
    headerAr: 'الشهر 1',
    required: false,
    dataType: 'number',
    min: 0,
  },
  {
    key: 'm2',
    header: 'Month 2',
    headerAr: 'الشهر 2',
    required: false,
    dataType: 'number',
    min: 0,
  },
  {
    key: 'm3',
    header: 'Month 3',
    headerAr: 'الشهر 3',
    required: false,
    dataType: 'number',
    min: 0,
  },
  {
    key: 'm4',
    header: 'Month 4',
    headerAr: 'الشهر 4',
    required: false,
    dataType: 'number',
    min: 0,
  },
  {
    key: 'm5',
    header: 'Month 5',
    headerAr: 'الشهر 5',
    required: false,
    dataType: 'number',
    min: 0,
  },
  {
    key: 'm6',
    header: 'Month 6',
    headerAr: 'الشهر 6',
    required: false,
    dataType: 'number',
    min: 0,
  },
  {
    key: 'm7',
    header: 'Month 7',
    headerAr: 'الشهر 7',
    required: false,
    dataType: 'number',
    min: 0,
  },
  {
    key: 'm8',
    header: 'Month 8',
    headerAr: 'الشهر 8',
    required: false,
    dataType: 'number',
    min: 0,
  },
  {
    key: 'm9',
    header: 'Month 9',
    headerAr: 'الشهر 9',
    required: false,
    dataType: 'number',
    min: 0,
  },
  {
    key: 'm10',
    header: 'Month 10',
    headerAr: 'الشهر 10',
    required: false,
    dataType: 'number',
    min: 0,
  },
  {
    key: 'm11',
    header: 'Month 11',
    headerAr: 'الشهر 11',
    required: false,
    dataType: 'number',
    min: 0,
  },
  {
    key: 'm12',
    header: 'Month 12',
    headerAr: 'الشهر 12',
    required: false,
    dataType: 'number',
    min: 0,
  },
];

/**
 * Forecast Plan import configuration
 */
export const FORECAST_CONFIG: ImportConfig = {
  moduleName: 'Forecast Plan',
  moduleNameAr: 'خطة التوقعات',
  sheetName: 'Forecast Plan',
  sheetNameAr: 'خطة التوقعات',
  columns: FORECAST_COLUMNS,
  allowDuplicates: false, // One forecast per budget item per fiscal year
};
