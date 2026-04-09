/**
 * Beneficiaries Import Configuration
 * 
 * Defines validation rules and column mappings for Beneficiaries Excel import.
 * Used by both frontend (preview) and backend (authoritative validation).
 */

import { ImportConfig, ColumnDefinition } from '../importFramework';

/**
 * Supported gender values
 */
export const BENEFICIARY_GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const;

/**
 * Supported age groups
 */
export const BENEFICIARY_AGE_GROUPS = ['0-5', '6-12', '13-17', '18-35', '36-60', '60+'] as const;

/**
 * Supported service statuses
 */
export const BENEFICIARY_SERVICE_STATUSES = ['REGISTERED', 'ACTIVE', 'COMPLETED', 'SUSPENDED'] as const;

/**
 * Beneficiaries column definitions
 */
export const BENEFICIARIES_COLUMNS: ColumnDefinition[] = [
  {
    key: 'fullName',
    header: 'Full Name',
    headerAr: 'الاسم الكامل',
    required: true,
    dataType: 'string',
  },
  {
    key: 'nationalId',
    header: 'National ID',
    headerAr: 'الرقم الوطني',
    required: false,
    dataType: 'string',
  },
  {
    key: 'dateOfBirth',
    header: 'Date of Birth',
    headerAr: 'تاريخ الميلاد',
    required: false,
    dataType: 'date',
  },
  {
    key: 'gender',
    header: 'Gender',
    headerAr: 'الجنس',
    required: true,
    dataType: 'enum',
    enumValues: [...BENEFICIARY_GENDERS],
  },
  {
    key: 'ageGroup',
    header: 'Age Group',
    headerAr: 'الفئة العمرية',
    required: false,
    dataType: 'enum',
    enumValues: [...BENEFICIARY_AGE_GROUPS],
  },
  {
    key: 'nationality',
    header: 'Nationality',
    headerAr: 'الجنسية',
    required: false,
    dataType: 'string',
  },
  {
    key: 'phoneNumber',
    header: 'Phone Number',
    headerAr: 'رقم الهاتف',
    required: false,
    dataType: 'string',
  },
  {
    key: 'email',
    header: 'Email',
    headerAr: 'البريد الإلكتروني',
    required: false,
    dataType: 'string',
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  {
    key: 'governorate',
    header: 'Governorate',
    headerAr: 'المحافظة',
    required: false,
    dataType: 'string',
  },
  {
    key: 'district',
    header: 'District',
    headerAr: 'المديرية',
    required: false,
    dataType: 'string',
  },
  {
    key: 'village',
    header: 'Village',
    headerAr: 'القرية',
    required: false,
    dataType: 'string',
  },
  {
    key: 'address',
    header: 'Address',
    headerAr: 'العنوان',
    required: false,
    dataType: 'string',
  },
  {
    key: 'householdSize',
    header: 'Household Size',
    headerAr: 'حجم الأسرة',
    required: false,
    dataType: 'number',
    min: 1,
  },
  {
    key: 'dependents',
    header: 'Number of Dependents',
    headerAr: 'عدد المعالين',
    required: false,
    dataType: 'number',
    min: 0,
  },
  {
    key: 'vulnerabilityCategory',
    header: 'Vulnerability Category',
    headerAr: 'فئة الضعف',
    required: false,
    dataType: 'string',
  },
  {
    key: 'disabilityStatus',
    header: 'Has Disability',
    headerAr: 'لديه إعاقة',
    required: false,
    dataType: 'boolean',
  },
  {
    key: 'disabilityType',
    header: 'Disability Type',
    headerAr: 'نوع الإعاقة',
    required: false,
    dataType: 'string',
  },
  {
    key: 'registrationDate',
    header: 'Registration Date',
    headerAr: 'تاريخ التسجيل',
    required: true,
    dataType: 'date',
  },
  {
    key: 'serviceType',
    header: 'Service Type',
    headerAr: 'نوع الخدمة',
    required: false,
    dataType: 'string',
  },
  {
    key: 'serviceStatus',
    header: 'Service Status',
    headerAr: 'حالة الخدمة',
    required: true,
    dataType: 'enum',
    enumValues: [...BENEFICIARY_SERVICE_STATUSES],
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
 * Beneficiaries import configuration
 */
export const BENEFICIARIES_CONFIG: ImportConfig = {
  moduleName: 'Beneficiaries',
  moduleNameAr: 'المستفيدون',
  sheetName: 'Beneficiaries',
  sheetNameAr: 'المستفيدون',
  columns: BENEFICIARIES_COLUMNS,
  allowDuplicates: false, // Beneficiaries should be unique (checked by nationalId if provided)
};
