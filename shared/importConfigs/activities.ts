/**
 * Activities Import Configuration
 * 
 * Defines validation rules and column mappings for Activities Excel import.
 * Used by both frontend (preview) and backend (authoritative validation).
 */

import { ImportConfig, ColumnDefinition } from '../importFramework';

/**
 * Supported activity statuses (matching UI format)
 */
export const ACTIVITY_STATUSES = [
  'Not Started',
  'In Progress',
  'Completed',
  'On Hold',
  'Cancelled'
] as const;

/**
 * Activities column definitions
 */
export const ACTIVITIES_COLUMNS: ColumnDefinition[] = [
  {
    key: 'activityCode',
    header: 'Activity Code',
    headerAr: 'رمز النشاط',
    required: true,
    dataType: 'string',
  },
  {
    key: 'activityName',
    header: 'Activity Title',
    headerAr: 'عنوان النشاء',
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
    key: 'plannedStartDate',
    header: 'Planned Start Date',
    headerAr: 'تاريخ البدء المخطط',
    required: true,
    dataType: 'date',
  },
  {
    key: 'plannedEndDate',
    header: 'Planned End Date',
    headerAr: 'تاريخ الانتهاء المخطط',
    required: true,
    dataType: 'date',
    customValidator: (value, context) => {
      // Note: Date range validation requires full row data, which is not available in customValidator
      // This validation is moved to backend business rules layer
      return null;
    },
  },
  {
    key: 'actualStartDate',
    header: 'Actual Start Date',
    headerAr: 'تاريخ البدء الفعلي',
    required: false,
    dataType: 'date',
  },
  {
    key: 'actualEndDate',
    header: 'Actual End Date',
    headerAr: 'تاريخ الانتهاء الفعلي',
    required: false,
    dataType: 'date',
  },
  {
    key: 'status',
    header: 'Status',
    headerAr: 'الحالة',
    required: true,
    dataType: 'enum',
    enumValues: [...ACTIVITY_STATUSES],
  },
  {
    key: 'progressPercentage',
    header: 'Progress (%)',
    headerAr: 'التقدم (%)',
    required: false,
    dataType: 'percentage',
    min: 0,
    max: 100,
  },
  {
    key: 'budgetAllocated',
    header: 'Budget',
    headerAr: 'الميزانية',
    required: false,
    dataType: 'number',
    min: 0,
  },
  {
    key: 'actualSpent',
    header: 'Spent',
    headerAr: 'المصروف',
    required: false,
    dataType: 'number',
    min: 0,
  },
  {
    key: 'location',
    header: 'Location',
    headerAr: 'الموقع',
    required: false,
    dataType: 'string',
  },
  {
    key: 'responsiblePerson',
    header: 'Responsible',
    headerAr: 'المسؤول',
    required: false,
    dataType: 'string',
  },
];

/**
 * Activities import configuration
 */
export const ACTIVITIES_CONFIG: ImportConfig = {
  moduleName: 'Activities',
  moduleNameAr: 'الأنشطة',
  sheetName: 'Activities',
  sheetNameAr: 'الأنشطة',
  columns: ACTIVITIES_COLUMNS,
  allowDuplicates: true, // Activities can have duplicate names
};
