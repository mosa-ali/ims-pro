/**
 * Indicators Import Configuration
 * 
 * Defines validation rules and column mappings for Indicators Excel import.
 * Used by both frontend (preview) and backend (authoritative validation).
 */

import { ImportConfig, ColumnDefinition } from '../importFramework';

/**
 * Supported indicator types
 */
export const INDICATOR_TYPES = ['OUTPUT', 'OUTCOME', 'IMPACT'] as const;

/**
 * Supported indicator statuses
 */
export const INDICATOR_STATUSES = ['ON_TRACK', 'AT_RISK', 'OFF_TRACK', 'ACHIEVED'] as const;

/**
 * Indicators column definitions
 */
export const INDICATORS_COLUMNS: ColumnDefinition[] = [
  {
    key: 'indicatorName',
    header: 'Indicator Name',
    headerAr: 'اسم المؤشر',
    required: true,
    dataType: 'string',
  },
  {
    key: 'description',
    header: 'Description',
    headerAr: 'الوصف',
    required: false,
    dataType: 'string',
  },
  {
    key: 'type',
    header: 'Type',
    headerAr: 'النوع',
    required: true,
    dataType: 'enum',
    enumValues: [...INDICATOR_TYPES],
  },
  {
    key: 'category',
    header: 'Category',
    headerAr: 'الفئة',
    required: false,
    dataType: 'string',
  },
  {
    key: 'unit',
    header: 'Unit of Measurement',
    headerAr: 'وحدة القياس',
    required: true,
    dataType: 'string',
  },
  {
    key: 'baseline',
    header: 'Baseline Value',
    headerAr: 'القيمة الأساسية',
    required: false,
    dataType: 'number',
    min: 0,
  },
  {
    key: 'target',
    header: 'Target Value',
    headerAr: 'القيمة المستهدفة',
    required: true,
    dataType: 'number',
    min: 0,
  },
  {
    key: 'achievedValue',
    header: 'Achieved Value',
    headerAr: 'القيمة المحققة',
    required: false,
    dataType: 'number',
    min: 0,
  },
  {
    key: 'targetDate',
    header: 'Target Date',
    headerAr: 'التاريخ المستهدف',
    required: false,
    dataType: 'date',
  },
  {
    key: 'dataSource',
    header: 'Data Source',
    headerAr: 'مصدر البيانات',
    required: false,
    dataType: 'string',
  },
  {
    key: 'verificationMethod',
    header: 'Verification Method',
    headerAr: 'طريقة التحقق',
    required: false,
    dataType: 'string',
  },
  {
    key: 'status',
    header: 'Status',
    headerAr: 'الحالة',
    required: true,
    dataType: 'enum',
    enumValues: [...INDICATOR_STATUSES],
  },
];

/**
 * Indicators import configuration
 */
export const INDICATORS_CONFIG: ImportConfig = {
  moduleName: 'Indicators',
  moduleNameAr: 'المؤشرات',
  sheetName: 'Indicators',
  sheetNameAr: 'المؤشرات',
  columns: INDICATORS_COLUMNS,
  allowDuplicates: true, // Indicators can have duplicate names
};
