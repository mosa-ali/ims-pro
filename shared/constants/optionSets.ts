/**
 * Global Option Sets Constant
 * 
 * ARCHITECTURE:
 * - All 15 system/global option sets hardcoded with correct bilingual labels
 * - Database Arabic values are corrupted (stored as ????), so we use hardcoded constants
 * - These are immutable, read-only, and always available
 * - Custom option sets from database are merged at runtime
 * 
 * Pattern: Similar to GLOBAL_CURRENCIES in BudgetInformationSection.tsx
 * 
 * Usage:
 * ```typescript
 * import { GLOBAL_OPTION_SETS } from '@/shared/constants/optionSets';
 * import { buildLocalizedOptions } from '@/lib/masterDataHelpers';
 * 
 * const activityStatusOptions = buildLocalizedOptions(
 *   GLOBAL_OPTION_SETS.find(s => s.systemKey === 'activity_status')?.values || [],
 *   isRTL,
 *   language
 * );
 * ```
 */

import { MasterDataValue } from '@/lib/masterDataHelpers';

export interface GlobalOptionSet {
  id: number;
  systemKey: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  isSystem: boolean;
  values: MasterDataValue[];
}

export const GLOBAL_OPTION_SETS: GlobalOptionSet[] = [
  // ============================================================================
  // 1. ACTIVITY STATUS
  // ============================================================================
  {
    id: 31,
    systemKey: 'activity_status',
    name: 'Activity Status',
    nameAr: 'حالة النشاط',
    description: 'Status options for activities and tasks',
    descriptionAr: 'خيارات الحالة للأنشطة والمهام',
    isSystem: true,
    values: [
      {
        id: 1,
        value: 'not_started',
        label: 'Not Started',
        labelAr: 'لم يبدأ',
        category: 'workflow',
        sortOrder: 1,
      },
      {
        id: 2,
        value: 'in_progress',
        label: 'In Progress',
        labelAr: 'جاري التنفيذ',
        category: 'workflow',
        sortOrder: 2,
      },
      {
        id: 3,
        value: 'on_hold',
        label: 'On Hold',
        labelAr: 'معلق',
        category: 'workflow',
        sortOrder: 3,
      },
      {
        id: 4,
        value: 'completed',
        label: 'Completed',
        labelAr: 'مكتمل',
        category: 'workflow',
        sortOrder: 4,
      },
      {
        id: 5,
        value: 'cancelled',
        label: 'Cancelled',
        labelAr: 'ملغى',
        category: 'workflow',
        sortOrder: 5,
      },
    ],
  },

  // ============================================================================
  // 2. PROJECT STATUS
  // ============================================================================
  {
    id: 32,
    systemKey: 'project_status',
    name: 'Project Status',
    nameAr: 'حالة المشروع',
    description: 'Status options for projects',
    descriptionAr: 'خيارات الحالة للمشاريع',
    isSystem: true,
    values: [
      {
        id: 1,
        value: 'planning',
        label: 'Planning',
        labelAr: 'التخطيط',
        category: 'workflow',
        sortOrder: 1,
      },
      {
        id: 2,
        value: 'initiation',
        label: 'Initiation',
        labelAr: 'البدء',
        category: 'workflow',
        sortOrder: 2,
      },
      {
        id: 3,
        value: 'execution',
        label: 'Execution',
        labelAr: 'التنفيذ',
        category: 'workflow',
        sortOrder: 3,
      },
      {
        id: 4,
        value: 'monitoring',
        label: 'Monitoring',
        labelAr: 'المراقبة',
        category: 'workflow',
        sortOrder: 4,
      },
      {
        id: 5,
        value: 'closure',
        label: 'Closure',
        labelAr: 'الإغلاق',
        category: 'workflow',
        sortOrder: 5,
      },
      {
        id: 6,
        value: 'suspended',
        label: 'Suspended',
        labelAr: 'معلق',
        category: 'workflow',
        sortOrder: 6,
      },
    ],
  },

  // ============================================================================
  // 3. PRIORITY LEVEL
  // ============================================================================
  {
    id: 33,
    systemKey: 'priority_level',
    name: 'Priority Level',
    nameAr: 'مستوى الأولوية',
    description: 'Priority levels for tasks and activities',
    descriptionAr: 'مستويات الأولوية للمهام والأنشطة',
    isSystem: true,
    values: [
      {
        id: 1,
        value: 'critical',
        label: 'Critical',
        labelAr: 'حرج',
        category: 'priority',
        sortOrder: 1,
      },
      {
        id: 2,
        value: 'high',
        label: 'High',
        labelAr: 'عالي',
        category: 'priority',
        sortOrder: 2,
      },
      {
        id: 3,
        value: 'medium',
        label: 'Medium',
        labelAr: 'متوسط',
        category: 'priority',
        sortOrder: 3,
      },
      {
        id: 4,
        value: 'low',
        label: 'Low',
        labelAr: 'منخفض',
        category: 'priority',
        sortOrder: 4,
      },
    ],
  },

  // ============================================================================
  // 4. APPROVAL STATUS
  // ============================================================================
  {
    id: 34,
    systemKey: 'approval_status',
    name: 'Approval Status',
    nameAr: 'حالة الموافقة',
    description: 'Approval workflow statuses',
    descriptionAr: 'حالات سير عمل الموافقة',
    isSystem: true,
    values: [
      {
        id: 1,
        value: 'pending',
        label: 'Pending',
        labelAr: 'قيد الانتظار',
        category: 'approval',
        sortOrder: 1,
      },
      {
        id: 2,
        value: 'approved',
        label: 'Approved',
        labelAr: 'موافق عليه',
        category: 'approval',
        sortOrder: 2,
      },
      {
        id: 3,
        value: 'rejected',
        label: 'Rejected',
        labelAr: 'مرفوض',
        category: 'approval',
        sortOrder: 3,
      },
      {
        id: 4,
        value: 'revision_needed',
        label: 'Revision Needed',
        labelAr: 'يحتاج إلى مراجعة',
        category: 'approval',
        sortOrder: 4,
      },
    ],
  },

  // ============================================================================
  // 5. BUDGET STATUS
  // ============================================================================
  {
    id: 35,
    systemKey: 'budget_status',
    name: 'Budget Status',
    nameAr: 'حالة الميزانية',
    description: 'Budget tracking statuses',
    descriptionAr: 'حالات تتبع الميزانية',
    isSystem: true,
    values: [
      {
        id: 1,
        value: 'draft',
        label: 'Draft',
        labelAr: 'مسودة',
        category: 'budget',
        sortOrder: 1,
      },
      {
        id: 2,
        value: 'submitted',
        label: 'Submitted',
        labelAr: 'مقدم',
        category: 'budget',
        sortOrder: 2,
      },
      {
        id: 3,
        value: 'approved',
        label: 'Approved',
        labelAr: 'موافق عليه',
        category: 'budget',
        sortOrder: 3,
      },
      {
        id: 4,
        value: 'active',
        label: 'Active',
        labelAr: 'نشط',
        category: 'budget',
        sortOrder: 4,
      },
      {
        id: 5,
        value: 'closed',
        label: 'Closed',
        labelAr: 'مغلق',
        category: 'budget',
        sortOrder: 5,
      },
    ],
  },

  // ============================================================================
  // 6. PROCUREMENT STATUS
  // ============================================================================
  {
    id: 36,
    systemKey: 'procurement_status',
    name: 'Procurement Status',
    nameAr: 'حالة الشراء',
    description: 'Procurement process statuses',
    descriptionAr: 'حالات عملية الشراء',
    isSystem: true,
    values: [
      {
        id: 1,
        value: 'draft',
        label: 'Draft',
        labelAr: 'مسودة',
        category: 'procurement',
        sortOrder: 1,
      },
      {
        id: 2,
        value: 'submitted',
        label: 'Submitted',
        labelAr: 'مقدم',
        category: 'procurement',
        sortOrder: 2,
      },
      {
        id: 3,
        value: 'approved',
        label: 'Approved',
        labelAr: 'موافق عليه',
        category: 'procurement',
        sortOrder: 3,
      },
      {
        id: 4,
        value: 'bidding',
        label: 'Bidding',
        labelAr: 'المزايدة',
        category: 'procurement',
        sortOrder: 4,
      },
      {
        id: 5,
        value: 'awarded',
        label: 'Awarded',
        labelAr: 'مُمنح',
        category: 'procurement',
        sortOrder: 5,
      },
      {
        id: 6,
        value: 'completed',
        label: 'Completed',
        labelAr: 'مكتمل',
        category: 'procurement',
        sortOrder: 6,
      },
      {
        id: 7,
        value: 'cancelled',
        label: 'Cancelled',
        labelAr: 'ملغى',
        category: 'procurement',
        sortOrder: 7,
      },
    ],
  },

  // ============================================================================
  // 7. DOCUMENT TYPE
  // ============================================================================
  {
    id: 37,
    systemKey: 'document_type',
    name: 'Document Type',
    nameAr: 'نوع المستند',
    description: 'Types of documents',
    descriptionAr: 'أنواع المستندات',
    isSystem: true,
    values: [
      {
        id: 1,
        value: 'contract',
        label: 'Contract',
        labelAr: 'عقد',
        category: 'document',
        sortOrder: 1,
      },
      {
        id: 2,
        value: 'invoice',
        label: 'Invoice',
        labelAr: 'فاتورة',
        category: 'document',
        sortOrder: 2,
      },
      {
        id: 3,
        value: 'report',
        label: 'Report',
        labelAr: 'تقرير',
        category: 'document',
        sortOrder: 3,
      },
      {
        id: 4,
        value: 'proposal',
        label: 'Proposal',
        labelAr: 'اقتراح',
        category: 'document',
        sortOrder: 4,
      },
      {
        id: 5,
        value: 'agreement',
        label: 'Agreement',
        labelAr: 'اتفاقية',
        category: 'document',
        sortOrder: 5,
      },
      {
        id: 6,
        value: 'memo',
        label: 'Memo',
        labelAr: 'مذكرة',
        category: 'document',
        sortOrder: 6,
      },
    ],
  },

  // ============================================================================
  // 8. RISK LEVEL
  // ============================================================================
  {
    id: 38,
    systemKey: 'risk_level',
    name: 'Risk Level',
    nameAr: 'مستوى المخاطرة',
    description: 'Risk assessment levels',
    descriptionAr: 'مستويات تقييم المخاطرة',
    isSystem: true,
    values: [
      {
        id: 1,
        value: 'critical',
        label: 'Critical',
        labelAr: 'حرج',
        category: 'risk',
        sortOrder: 1,
      },
      {
        id: 2,
        value: 'high',
        label: 'High',
        labelAr: 'عالي',
        category: 'risk',
        sortOrder: 2,
      },
      {
        id: 3,
        value: 'medium',
        label: 'Medium',
        labelAr: 'متوسط',
        category: 'risk',
        sortOrder: 3,
      },
      {
        id: 4,
        value: 'low',
        label: 'Low',
        labelAr: 'منخفض',
        category: 'risk',
        sortOrder: 4,
      },
    ],
  },

  // ============================================================================
  // 9. FREQUENCY
  // ============================================================================
  {
    id: 39,
    systemKey: 'frequency',
    name: 'Frequency',
    nameAr: 'التكرار',
    description: 'Frequency options for recurring items',
    descriptionAr: 'خيارات التكرار للعناصر المتكررة',
    isSystem: true,
    values: [
      {
        id: 1,
        value: 'daily',
        label: 'Daily',
        labelAr: 'يومي',
        category: 'frequency',
        sortOrder: 1,
      },
      {
        id: 2,
        value: 'weekly',
        label: 'Weekly',
        labelAr: 'أسبوعي',
        category: 'frequency',
        sortOrder: 2,
      },
      {
        id: 3,
        value: 'monthly',
        label: 'Monthly',
        labelAr: 'شهري',
        category: 'frequency',
        sortOrder: 3,
      },
      {
        id: 4,
        value: 'quarterly',
        label: 'Quarterly',
        labelAr: 'ربع سنوي',
        category: 'frequency',
        sortOrder: 4,
      },
      {
        id: 5,
        value: 'annually',
        label: 'Annually',
        labelAr: 'سنوي',
        category: 'frequency',
        sortOrder: 5,
      },
      {
        id: 6,
        value: 'one_time',
        label: 'One Time',
        labelAr: 'مرة واحدة',
        category: 'frequency',
        sortOrder: 6,
      },
    ],
  },

  // ============================================================================
  // 10. GENDER
  // ============================================================================
  {
    id: 40,
    systemKey: 'gender',
    name: 'Gender',
    nameAr: 'النوع',
    description: 'Gender options',
    descriptionAr: 'خيارات النوع',
    isSystem: true,
    values: [
      {
        id: 1,
        value: 'male',
        label: 'Male',
        labelAr: 'ذكر',
        category: 'demographic',
        sortOrder: 1,
      },
      {
        id: 2,
        value: 'female',
        label: 'Female',
        labelAr: 'أنثى',
        category: 'demographic',
        sortOrder: 2,
      },
      {
        id: 3,
        value: 'other',
        label: 'Other',
        labelAr: 'آخر',
        category: 'demographic',
        sortOrder: 3,
      },
      {
        id: 4,
        value: 'prefer_not_to_say',
        label: 'Prefer Not to Say',
        labelAr: 'أفضل عدم الكشف',
        category: 'demographic',
        sortOrder: 4,
      },
    ],
  },

  // ============================================================================
  // 11. EDUCATION LEVEL
  // ============================================================================
  {
    id: 41,
    systemKey: 'education_level',
    name: 'Education Level',
    nameAr: 'مستوى التعليم',
    description: 'Educational attainment levels',
    descriptionAr: 'مستويات الإنجاز التعليمي',
    isSystem: true,
    values: [
      {
        id: 1,
        value: 'primary',
        label: 'Primary',
        labelAr: 'ابتدائي',
        category: 'education',
        sortOrder: 1,
      },
      {
        id: 2,
        value: 'secondary',
        label: 'Secondary',
        labelAr: 'ثانوي',
        category: 'education',
        sortOrder: 2,
      },
      {
        id: 3,
        value: 'diploma',
        label: 'Diploma',
        labelAr: 'دبلوم',
        category: 'education',
        sortOrder: 3,
      },
      {
        id: 4,
        value: 'bachelor',
        label: 'Bachelor',
        labelAr: 'بكالوريوس',
        category: 'education',
        sortOrder: 4,
      },
      {
        id: 5,
        value: 'master',
        label: 'Master',
        labelAr: 'ماجستير',
        category: 'education',
        sortOrder: 5,
      },
      {
        id: 6,
        value: 'phd',
        label: 'PhD',
        labelAr: 'دكتوراه',
        category: 'education',
        sortOrder: 6,
      },
    ],
  },

  // ============================================================================
  // 12. EMPLOYMENT STATUS
  // ============================================================================
  {
    id: 42,
    systemKey: 'employment_status',
    name: 'Employment Status',
    nameAr: 'حالة التوظيف',
    description: 'Employment status options',
    descriptionAr: 'خيارات حالة التوظيف',
    isSystem: true,
    values: [
      {
        id: 1,
        value: 'employed',
        label: 'Employed',
        labelAr: 'موظف',
        category: 'employment',
        sortOrder: 1,
      },
      {
        id: 2,
        value: 'unemployed',
        label: 'Unemployed',
        labelAr: 'عاطل عن العمل',
        category: 'employment',
        sortOrder: 2,
      },
      {
        id: 3,
        value: 'self_employed',
        label: 'Self-Employed',
        labelAr: 'العمل الحر',
        category: 'employment',
        sortOrder: 3,
      },
      {
        id: 4,
        value: 'student',
        label: 'Student',
        labelAr: 'طالب',
        category: 'employment',
        sortOrder: 4,
      },
      {
        id: 5,
        value: 'retired',
        label: 'Retired',
        labelAr: 'متقاعد',
        category: 'employment',
        sortOrder: 5,
      },
    ],
  },

  // ============================================================================
  // 13. MARITAL STATUS
  // ============================================================================
  {
    id: 43,
    systemKey: 'marital_status',
    name: 'Marital Status',
    nameAr: 'الحالة الاجتماعية',
    description: 'Marital status options',
    descriptionAr: 'خيارات الحالة الاجتماعية',
    isSystem: true,
    values: [
      {
        id: 1,
        value: 'single',
        label: 'Single',
        labelAr: 'أعزب',
        category: 'marital',
        sortOrder: 1,
      },
      {
        id: 2,
        value: 'married',
        label: 'Married',
        labelAr: 'متزوج',
        category: 'marital',
        sortOrder: 2,
      },
      {
        id: 3,
        value: 'divorced',
        label: 'Divorced',
        labelAr: 'مطلق',
        category: 'marital',
        sortOrder: 3,
      },
      {
        id: 4,
        value: 'widowed',
        label: 'Widowed',
        labelAr: 'أرمل',
        category: 'marital',
        sortOrder: 4,
      },
    ],
  },

  // ============================================================================
  // 14. DISABILITY STATUS
  // ============================================================================
  {
    id: 44,
    systemKey: 'disability_status',
    name: 'Disability Status',
    nameAr: 'حالة الإعاقة',
    description: 'Disability status options',
    descriptionAr: 'خيارات حالة الإعاقة',
    isSystem: true,
    values: [
      {
        id: 1,
        value: 'no_disability',
        label: 'No Disability',
        labelAr: 'بدون إعاقة',
        category: 'disability',
        sortOrder: 1,
      },
      {
        id: 2,
        value: 'physical',
        label: 'Physical',
        labelAr: 'حركية',
        category: 'disability',
        sortOrder: 2,
      },
      {
        id: 3,
        value: 'visual',
        label: 'Visual',
        labelAr: 'بصرية',
        category: 'disability',
        sortOrder: 3,
      },
      {
        id: 4,
        value: 'hearing',
        label: 'Hearing',
        labelAr: 'سمعية',
        category: 'disability',
        sortOrder: 4,
      },
      {
        id: 5,
        value: 'intellectual',
        label: 'Intellectual',
        labelAr: 'ذهنية',
        category: 'disability',
        sortOrder: 5,
      },
      {
        id: 6,
        value: 'multiple',
        label: 'Multiple',
        labelAr: 'متعددة',
        category: 'disability',
        sortOrder: 6,
      },
    ],
  },

  // ============================================================================
  // 15. BENEFICIARY TYPE
  // ============================================================================
  {
    id: 45,
    systemKey: 'beneficiary_type',
    name: 'Beneficiary Type',
    nameAr: 'نوع المستفيد',
    description: 'Types of program beneficiaries',
    descriptionAr: 'أنواع مستفيدي البرنامج',
    isSystem: true,
    values: [
      {
        id: 1,
        value: 'individual',
        label: 'Individual',
        labelAr: 'فرد',
        category: 'beneficiary',
        sortOrder: 1,
      },
      {
        id: 2,
        value: 'household',
        label: 'Household',
        labelAr: 'أسرة',
        category: 'beneficiary',
        sortOrder: 2,
      },
      {
        id: 3,
        value: 'community',
        label: 'Community',
        labelAr: 'مجتمع',
        category: 'beneficiary',
        sortOrder: 3,
      },
      {
        id: 4,
        value: 'organization',
        label: 'Organization',
        labelAr: 'منظمة',
        category: 'beneficiary',
        sortOrder: 4,
      },
      {
        id: 5,
        value: 'institution',
        label: 'Institution',
        labelAr: 'مؤسسة',
        category: 'beneficiary',
        sortOrder: 5,
      },
    ],
  },
];

/**
 * Get option set by system key
 * 
 * @param systemKey - The system key (e.g., 'activity_status', 'priority_level')
 * @returns Option set object or undefined
 */
export function getOptionSetBySystemKey(systemKey: string): GlobalOptionSet | undefined {
  return GLOBAL_OPTION_SETS.find((set) => set.systemKey === systemKey);
}

/**
 * Get option set values by system key
 * 
 * @param systemKey - The system key
 * @returns Array of values for the option set
 */
export function getOptionSetValues(systemKey: string): MasterDataValue[] {
  const optionSet = getOptionSetBySystemKey(systemKey);
  return optionSet?.values || [];
}

/**
 * Get option value label in specific language
 * 
 * @param systemKey - The system key
 * @param value - The value key
 * @param language - 'en' or 'ar'
 * @returns Localized label or the value itself if not found
 */
export function getOptionLabel(
  systemKey: string,
  value: string,
  language: 'en' | 'ar' | 'it' = 'en'
): string {
  const optionSet = getOptionSetBySystemKey(systemKey);
  if (!optionSet) return value;

  const option = optionSet.values.find((v) => v.value === value);
  if (!option) return value;

  return language === 'ar' ? (option.labelAr || option.label) : option.label;
}

/**
 * Get all option set system keys
 * 
 * @returns Array of system keys
 */
export function getAllOptionSetKeys(): string[] {
  return GLOBAL_OPTION_SETS.map((set) => set.systemKey);
}

/**
 * Get all option sets
 * 
 * @returns Array of all global option sets
 */
export function getAllOptionSets(): GlobalOptionSet[] {
  return GLOBAL_OPTION_SETS;
}

/**
 * Export option sets as CSV
 * Useful for data migration and backup
 * 
 * @returns CSV string
 */
export function exportOptionSetsToCSV(): string {
  let csv = 'systemKey,name,nameAr,value,label,labelAr,sortOrder\n';

  GLOBAL_OPTION_SETS.forEach((set) => {
    set.values.forEach((val) => {
      csv += `"${set.systemKey}","${set.name}","${set.nameAr}","${val.value}","${val.label}","${val.labelAr}","${val.sortOrder || 0}"\n`;
    });
  });

  return csv;
}
