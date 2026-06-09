/**
 * ============================================================================
 * RECRUITMENT CANONICAL CONSTANTS
 * ============================================================================
 * 
 * Bilingual constants for recruitment module.
 * All strings support English and Arabic.
 * 
 * ============================================================================
 */

import {
  JobStatus,
  CandidateStatus,
  InterviewType,
  InterviewStatus,
  OfferStatus,
  JobEmploymentType,
  CandidateSource,
} from '../types/recruitment-canonical';

// ============================================================================
// BILINGUAL TRANSLATIONS
// ============================================================================

export const RECRUITMENT_TRANSLATIONS = {
  en: {
    // Common
    actions: 'Actions',
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
    view: 'View',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    confirm: 'Confirm',
    
    // Jobs
    jobs: 'Jobs',
    jobManagement: 'Job Management',
    newJob: 'New Job',
    jobTitle: 'Job Title',
    department: 'Department',
    status: 'Status',
    
    // Candidates
    candidates: 'Candidates',
    candidateManagement: 'Candidate Management',
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
    phone: 'Phone',
    
    // Interviews
    interviews: 'Interviews',
    interviewManagement: 'Interview Management',
    interviewType: 'Interview Type',
    interviewDate: 'Interview Date',
    
    // Hiring Decisions
    hiringDecisions: 'Hiring Decisions',
    hiringDecision: 'Hiring Decision',
    offerSalary: 'Offer Salary',
    startDate: 'Start Date',
    approve: 'Approve',
    reject: 'Reject',
  },

  ar: {
    // Common
    actions: 'الإجراءات',
    add: 'إضافة',
    edit: 'تعديل',
    delete: 'حذف',
    view: 'عرض',
    save: 'حفظ',
    cancel: 'إلغاء',
    close: 'إغلاق',
    loading: 'جاري التحميل...',
    error: 'خطأ',
    success: 'نجح',
    confirm: 'تأكيد',
    
    // Jobs
    jobs: 'الوظائف',
    jobManagement: 'إدارة الوظائف',
    newJob: 'وظيفة جديدة',
    jobTitle: 'اسم الوظيفة',
    department: 'القسم',
    status: 'الحالة',
    
    // Candidates
    candidates: 'المرشحون',
    candidateManagement: 'إدارة المرشحين',
    firstName: 'الاسم الأول',
    lastName: 'الاسم الأخير',
    email: 'البريد الإلكتروني',
    phone: 'الهاتف',
    
    // Interviews
    interviews: 'المقابلات',
    interviewManagement: 'إدارة المقابلات',
    interviewType: 'نوع المقابلة',
    interviewDate: 'تاريخ المقابلة',
    
    // Hiring Decisions
    hiringDecisions: 'قرارات التوظيف',
    hiringDecision: 'قرار التوظيف',
    offerSalary: 'راتب العرض',
    startDate: 'تاريخ البدء',
    approve: 'موافقة',
    reject: 'رفض',
  },
};

// ============================================================================
// STATUS COLOR MAPPINGS
// ============================================================================

export const JOB_STATUS_COLORS: Record<JobStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  open: 'bg-green-100 text-green-700',
  on_hold: 'bg-yellow-100 text-yellow-700',
  closed: 'bg-red-100 text-red-700',
  filled: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-200 text-red-800',
};

export const CANDIDATE_STATUS_COLORS: Record<CandidateStatus, string> = {
  all: 'bg-blue-100 text-blue-700',
  new: 'bg-blue-100 text-blue-700',
  applied: 'bg-blue-100 text-blue-700',
  screening: 'bg-yellow-100 text-yellow-700',
  shortlisted: 'bg-purple-100 text-purple-700',
  interview_scheduled: 'bg-cyan-100 text-cyan-700',
  interviewed: 'bg-cyan-100 text-cyan-700',
  offer_pending: 'bg-orange-100 text-orange-700',
  offer_sent: 'bg-orange-100 text-orange-700',
  offered: 'bg-green-100 text-green-700',
  hired: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  withdrawn: 'bg-gray-100 text-gray-700',
};

export const INTERVIEW_STATUS_COLORS: Record<InterviewStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  rescheduled: 'bg-yellow-100 text-yellow-700',
  no_show: 'bg-red-200 text-red-800',
};

export const OFFER_STATUS_COLORS: Record<OfferStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  withdrawn: 'bg-gray-100 text-gray-700',
};

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

export const RECRUITMENT_VALIDATION = {
  jobTitle: {
    minLength: 3,
    maxLength: 255,
  },
  firstName: {
    minLength: 2,
    maxLength: 100,
  },
  lastName: {
    minLength: 2,
    maxLength: 100,
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  phone: {
    minLength: 10,
    maxLength: 20,
  },
  salary: {
    minValue: 0,
    maxValue: 999999999,
  },
};

// ============================================================================
// PAGINATION CONSTANTS
// ============================================================================

export const RECRUITMENT_PAGINATION = {
  defaultLimit: 20,
  maxLimit: 100,
  pageSizes: [10, 20, 50, 100],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get translation for a key
 */
export function getRecruitmentTranslation(key: string, language: 'en' | 'ar' | 'it' = 'en'): string {
  const translations = RECRUITMENT_TRANSLATIONS[language];
  return (translations as any)[key] || key;
}

/**
 * Get status color
 */
export function getStatusColor(status: string, type: 'job' | 'candidate' | 'interview' | 'offer'): string {
  switch (type) {
    case 'job':
      return JOB_STATUS_COLORS[status as JobStatus] || 'bg-gray-100 text-gray-700';
    case 'candidate':
      return CANDIDATE_STATUS_COLORS[status as CandidateStatus] || 'bg-gray-100 text-gray-700';
    case 'interview':
      return INTERVIEW_STATUS_COLORS[status as InterviewStatus] || 'bg-gray-100 text-gray-700';
    case 'offer':
      return OFFER_STATUS_COLORS[status as OfferStatus] || 'bg-gray-100 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}
