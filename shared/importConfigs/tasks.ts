/**
 * Tasks Import Configuration
 * 
 * Defines validation rules and column mappings for Tasks Excel import.
 * Used by both frontend (preview) and backend (authoritative validation).
 */

import { ImportConfig, ColumnDefinition } from '../importFramework';

/**
 * Supported task statuses
 */
export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'BLOCKED'] as const;

/**
 * Supported task priorities
 */
export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

/**
 * Tasks column definitions
 */
export const TASKS_COLUMNS: ColumnDefinition[] = [
  {
    key: 'taskName',
    header: 'Task Name',
    headerAr: 'اسم المهمة',
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
    key: 'status',
    header: 'Status',
    headerAr: 'الحالة',
    required: true,
    dataType: 'enum',
    enumValues: [...TASK_STATUSES],
  },
  {
    key: 'priority',
    header: 'Priority',
    headerAr: 'الأولوية',
    required: true,
    dataType: 'enum',
    enumValues: [...TASK_PRIORITIES],
  },
  {
    key: 'dueDate',
    header: 'Due Date',
    headerAr: 'تاريخ الاستحقاق',
    required: false,
    dataType: 'date',
  },
  {
    key: 'startDate',
    header: 'Start Date',
    headerAr: 'تاريخ البدء',
    required: false,
    dataType: 'date',
  },
  {
    key: 'completedDate',
    header: 'Completed Date',
    headerAr: 'تاريخ الإنجاز',
    required: false,
    dataType: 'date',
  },
  {
    key: 'assignedToName',
    header: 'Assigned To',
    headerAr: 'مسند إلى',
    required: false,
    dataType: 'string',
  },
  {
    key: 'progressPercentage',
    header: 'Progress %',
    headerAr: 'نسبة الإنجاز %',
    required: false,
    dataType: 'percentage',
    min: 0,
    max: 100,
  },
  {
    key: 'category',
    header: 'Category',
    headerAr: 'الفئة',
    required: false,
    dataType: 'string',
  },
];

/**
 * Tasks import configuration
 */
export const TASKS_CONFIG: ImportConfig = {
  moduleName: 'Tasks',
  moduleNameAr: 'المهام',
  sheetName: 'Tasks',
  sheetNameAr: 'المهام',
  columns: TASKS_COLUMNS,
  allowDuplicates: true, // Tasks can have duplicate names
};
