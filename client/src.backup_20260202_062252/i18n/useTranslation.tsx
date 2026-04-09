// ============================================================================
// SIMPLE TRANSLATION HOOK
// Provides bilingual support (English/Arabic) without external libraries
// ============================================================================

import { useLanguage } from '@/app/contexts/LanguageContext';

// Translation interface
export interface Translations {
  header: {
    projectsManagement: string;
    dashboard: string;
    settings: string;
    logout: string;
    switchOrganization: string;
    changeLanguage: string;
  };
  sidebar: {
    dashboard: string;
    projects: string;
    finance: string;
    caseManagement: string;
    proposals: string;
    reports: string;
    settings: string;
  };
  common: {
    search: string;
    filter: string;
    export: string;
    import: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    view: string;
    add: string;
    create: string;
    update: string;
    loading: string;
    error: string;
    success: string;
    confirm: string;
  };
  projects: {
    statusOngoing: string;
    statusPlanned: string;
    statusCompleted: string;
    statusNotStarted: string;
  };
  projectDetail: {
    backToProjects: string;
    editProject: string;
    projectCode: string;
    donorGrant: string;
    description: string;
    daysRemaining: string;
    tabProgramsOverview: string;
    tabViewAllActivities: string;
    tabTasksMgt: string;
    tabCaseManagement: string;
    tabProjectIndicators: string;
    tabBeneficiaries: string;
    tabFinancialOverview: string;
    tabForecastPlan: string;
    tabProjectReport: string;
  };
}

// English translations
const en: Translations = {
  header: {
    projectsManagement: 'Projects Management',
    dashboard: 'Dashboard',
    settings: 'Settings',
    logout: 'Logout',
    switchOrganization: 'Switch Organization',
    changeLanguage: 'Change Language',
  },
  sidebar: {
    dashboard: 'Dashboard',
    projects: 'Projects',
    finance: 'Finance',
    caseManagement: 'Case Management',
    proposals: 'Proposals',
    reports: 'Reports',
    settings: 'Settings',
  },
  common: {
    search: 'Search',
    filter: 'Filter',
    export: 'Export',
    import: 'Import',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    view: 'View',
    add: 'Add',
    create: 'Create',
    update: 'Update',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    confirm: 'Confirm',
  },
  projects: {
    statusOngoing: 'Ongoing',
    statusPlanned: 'Planned',
    statusCompleted: 'Completed',
    statusNotStarted: 'Not Started',
  },
  projectDetail: {
    backToProjects: 'Back to Projects',
    editProject: 'Edit Project',
    projectCode: 'Project Code',
    donorGrant: 'Donor Grant',
    description: 'Description',
    daysRemaining: 'Days Remaining',
    tabProgramsOverview: 'Overview',
    tabViewAllActivities: 'Activities',
    tabTasksMgt: 'Tasks',
    tabCaseManagement: 'Cases',
    tabProjectIndicators: 'Indicators',
    tabBeneficiaries: 'Beneficiaries',
    tabFinancialOverview: 'Financial',
    tabForecastPlan: 'Forecast',
    tabProjectReport: 'Report',
  },
};

// Arabic translations
const ar: Translations = {
  header: {
    projectsManagement: 'إدارة المشاريع',
    dashboard: 'لوحة التحكم',
    settings: 'الإعدادات',
    logout: 'تسجيل الخروج',
    switchOrganization: 'تبديل المنظمة',
    changeLanguage: 'تغيير اللغة',
  },
  sidebar: {
    dashboard: 'لوحة التحكم',
    projects: 'المشاريع',
    finance: 'المالية',
    caseManagement: 'إدارة الحالات',
    proposals: 'العروض',
    reports: 'التقارير',
    settings: 'الإعدادات',
  },
  common: {
    search: 'بحث',
    filter: 'تصفية',
    export: 'تصدير',
    import: 'استيراد',
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    view: 'عرض',
    add: 'إضافة',
    create: 'إنشاء',
    update: 'تحديث',
    loading: 'جاري التحميل...',
    error: 'خطأ',
    success: 'نجاح',
    confirm: 'تأكيد',
  },
  projects: {
    statusOngoing: 'مستمر',
    statusPlanned: 'مخطط له',
    statusCompleted: 'مكتمل',
    statusNotStarted: 'لم يبدأ بعد',
  },
  projectDetail: {
    backToProjects: 'العودة إلى المشاريع',
    editProject: 'تحرير المشروع',
    projectCode: 'رمز المشروع',
    donorGrant: 'منح المانح',
    description: 'الوصف',
    daysRemaining: 'الأيام المتبقية',
    tabProgramsOverview: 'عامة',
    tabViewAllActivities: 'الأنشطة',
    tabTasksMgt: 'المهام',
    tabCaseManagement: 'الحالات',
    tabProjectIndicators: 'المؤشرات',
    tabBeneficiaries: 'المستفيدين',
    tabFinancialOverview: 'المالية',
    tabForecastPlan: 'التوقعات',
    tabProjectReport: 'التقرير',
  },
};

// Translation map
const translations = { en, ar };

// Hook
export function useTranslation() {
  const { language } = useLanguage();
  return { t: translations[language] };
}