/**
 * Procurement Import Configuration
 * 
 * Defines validation rules and column mappings for Procurement Excel import.
 * Used by both frontend (preview) and backend (authoritative validation).
 */

import { ImportConfig, ColumnDefinition } from '../importFramework';

/**
 * Supported procurement categories
 */
export const PROCUREMENT_CATEGORIES = ['GOODS', 'SERVICES', 'WORKS', 'CONSULTANCY'] as const;

/**
 * Supported procurement methods
 */
export const PROCUREMENT_METHODS = [
  'DIRECT_PURCHASE',
  'COMPETITIVE_BIDDING',
  'REQUEST_FOR_QUOTATION',
  'FRAMEWORK_AGREEMENT',
  'OTHER'
] as const;

/**
 * Supported procurement statuses
 */
export const PROCUREMENT_STATUSES = [
  'PLANNED',
  'REQUESTED',
  'APPROVED',
  'IN_PROCUREMENT',
  'ORDERED',
  'DELIVERED',
  'CANCELLED'
] as const;

/**
 * Supported currencies for procurement
 */
export const PROCUREMENT_CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF'] as const;

/**
 * Procurement column definitions
 */
export const PROCUREMENT_COLUMNS: ColumnDefinition[] = [
  {
    key: 'itemName',
    header: 'Item Name',
    headerAr: 'اسم الصنف',
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
    key: 'category',
    header: 'Category',
    headerAr: 'الفئة',
    required: true,
    dataType: 'enum',
    enumValues: [...PROCUREMENT_CATEGORIES],
  },
  {
    key: 'subcategory',
    header: 'Subcategory',
    headerAr: 'الفئة الفرعية',
    required: false,
    dataType: 'string',
  },
  {
    key: 'quantity',
    header: 'Quantity',
    headerAr: 'الكمية',
    required: true,
    dataType: 'number',
    min: 0.01,
  },
  {
    key: 'unit',
    header: 'Unit',
    headerAr: 'الوحدة',
    required: true,
    dataType: 'string',
  },
  {
    key: 'estimatedCost',
    header: 'Estimated Cost',
    headerAr: 'التكلفة المقدرة',
    required: true,
    dataType: 'number',
    min: 0,
  },
  {
    key: 'actualCost',
    header: 'Actual Cost',
    headerAr: 'التكلفة الفعلية',
    required: false,
    dataType: 'number',
    min: 0,
  },
  {
    key: 'currency',
    header: 'Currency',
    headerAr: 'العملة',
    required: true,
    dataType: 'enum',
    enumValues: [...PROCUREMENT_CURRENCIES],
    customValidator: (value: any, context?: any) => {
      const curr = String(value).trim().toUpperCase();
      
      // STRICT MODE: If organization currency is provided, only allow that currency
      if (context?.organizationCurrency) {
        const orgCurrency = context.organizationCurrency.toUpperCase();
        if (curr !== orgCurrency) {
          return `Only ${orgCurrency} is allowed for this organization. Found: ${curr}.`;
        }
        return null;
      }
      
      // FALLBACK: If no organization currency, allow any supported currency
      if (!(PROCUREMENT_CURRENCIES as readonly string[]).includes(curr)) {
        return `Currency "${value}" is not supported. Allowed values: ${PROCUREMENT_CURRENCIES.join(', ')}.`;
      }
      return null;
    },
  },
  {
    key: 'plannedProcurementDate',
    header: 'Planned Procurement Date',
    headerAr: 'تاريخ الشراء المخطط',
    required: true,
    dataType: 'date',
  },
  {
    key: 'actualProcurementDate',
    header: 'Actual Procurement Date',
    headerAr: 'تاريخ الشراء الفعلي',
    required: false,
    dataType: 'date',
  },
  {
    key: 'deliveryDate',
    header: 'Delivery Date',
    headerAr: 'تاريخ التسليم',
    required: false,
    dataType: 'date',
  },
  {
    key: 'procurementMethod',
    header: 'Procurement Method',
    headerAr: 'طريقة الشراء',
    required: true,
    dataType: 'enum',
    enumValues: [...PROCUREMENT_METHODS],
  },
  {
    key: 'status',
    header: 'Status',
    headerAr: 'الحالة',
    required: true,
    dataType: 'enum',
    enumValues: [...PROCUREMENT_STATUSES],
  },
  {
    key: 'supplierName',
    header: 'Supplier Name',
    headerAr: 'اسم المورد',
    required: false,
    dataType: 'string',
  },
  {
    key: 'supplierContact',
    header: 'Supplier Contact',
    headerAr: 'جهة اتصال المورد',
    required: false,
    dataType: 'string',
  },
  {
    key: 'budgetLine',
    header: 'Budget Line',
    headerAr: 'بند الميزانية',
    required: false,
    dataType: 'string',
  },
  {
    key: 'notes',
    header: 'Notes',
    headerAr: 'ملاحظات',
    required: false,
    dataType: 'string',
  },
];

/**
 * Procurement import configuration
 */
export const PROCUREMENT_CONFIG: ImportConfig = {
  moduleName: 'Procurement',
  moduleNameAr: 'المشتريات',
  sheetName: 'Procurement',
  sheetNameAr: 'المشتريات',
  columns: PROCUREMENT_COLUMNS,
  allowDuplicates: true, // Procurement items can have duplicate names
};
