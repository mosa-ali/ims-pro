/**
 * ============================================================================
 * RECRUITMENT MODULE - CONSTANTS & TRANSLATIONS
 * ============================================================================
 * Full bilingual support (EN/AR) with RTL/LTR compatibility
 * ============================================================================
 */

// ============================================================================
// STATUS ENUMS
// ============================================================================

export const VACANCY_STATUS = {
  DRAFT: 'draft',
  OPEN: 'open',
  ON_HOLD: 'on_hold',
  CLOSED: 'closed',
  FILLED: 'filled',
  CANCELLED: 'cancelled',
} as const;

export const CANDIDATE_STATUS = {
  APPLIED: 'applied',
  SCREENING: 'screening',
  SHORTLISTED: 'shortlisted',
  INTERVIEW_SCHEDULED: 'interview_scheduled',
  INTERVIEWED: 'interviewed',
  OFFERED: 'offered',
  HIRED: 'hired',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
} as const;

export const INTERVIEW_TYPE = {
  PHONE: 'Phone',
  VIDEO: 'Video',
  IN_PERSON: 'In-Person',
  GROUP: 'Group',
} as const;

export const INTERVIEW_STATUS = {
  SCHEDULED: 'Scheduled',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No-Show',
} as const;

export const OFFER_STATUS = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
} as const;

export const CANDIDATE_SOURCE = {
  ADVERTISEMENT: 'Advertisement',
  REFERRAL: 'Referral',
  DATABASE: 'Database',
  INTERNAL: 'Internal',
} as const;

export const CRITERIA_TYPE = {
  YES_NO: 'YesNo',
  NUMERIC: 'Numeric',
  SCALE: 'Scale',
  CHECKLIST: 'Checklist',
} as const;

// ============================================================================
// BILINGUAL TRANSLATIONS
// ============================================================================

export const RECRUITMENT_TRANSLATIONS = {
  en: {
    // Page Titles
    recruitmentManagement: 'Recruitment Management',
    recruitmentSubtitle: 'End-to-end recruitment process management',
    
    // Tabs
    dashboard: 'Dashboard',
    vacancies: 'Vacancies',
    candidates: 'Candidates',
    interviews: 'Interviews',
    hiringDecisions: 'Hiring Decisions',
    
    // KPIs
    openVacancies: 'Open Vacancies',
    candidatesInPipeline: 'Candidates in Pipeline',
    interviewsScheduled: 'Interviews Scheduled',
    positionsFilled: 'Positions Filled',
    avgTimeToHire: 'Avg. Time to Hire',
    totalApplications: 'Total Applications',
    shortlistedCandidates: 'Shortlisted Candidates',
    offersMade: 'Offers Made',
    offersAccepted: 'Offers Accepted',
    offersRejected: 'Offers Rejected',
    days: 'days',
    
    // Actions
    newVacancy: 'New Vacancy',
    newCandidate: 'Add Candidate',
    scheduleInterview: 'Schedule Interview',
    makeOffer: 'Make Offer',
    viewAll: 'View All',
    
    // Vacancy Fields
    positionTitle: 'Position Title',
    department: 'Department',
    project: 'Project/Program',
    dutyStation: 'Duty Station',
    contractType: 'Contract Type',
    grade: 'Grade',
    vacancyType: 'Vacancy Type',
    justification: 'Justification',
    openingDate: 'Opening Date',
    closingDate: 'Closing Date',
    hiringManager: 'Hiring Manager',
    numberOfPositions: 'Number of Positions',
    minSalary: 'Minimum Salary',
    maxSalary: 'Maximum Salary',
    proposedGrade: 'Proposed Grade',
    shortlistThreshold: 'Shortlist Threshold (%)',
    
    // Candidate Fields
    fullName: 'Full Name',
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
    phone: 'Phone',
    currentPosition: 'Current Position',
    yearsOfExperience: 'Years of Experience',
    educationLevel: 'Education Level',
    fieldOfStudy: 'Field of Study',
    nationality: 'Nationality',
    dateOfBirth: 'Date of Birth',
    currentLocation: 'Current Location',
    currentEmployer: 'Current Employer',
    source: 'Source',
    submissionDate: 'Submission Date',
    
    // Interview Fields
    interviewType: 'Interview Type',
    interviewDate: 'Interview Date',
    interviewTime: 'Interview Time',
    duration: 'Duration (minutes)',
    location: 'Location',
    meetingLink: 'Meeting Link',
    panelMembers: 'Panel Members',
    notes: 'Notes',
    feedback: 'Feedback',
    overallScore: 'Overall Score',
    
    // Hiring Decision Fields
    proposedSalary: 'Proposed Salary',
    reportingTo: 'Reporting To',
    probationPeriod: 'Probation Period (months)',
    benefits: 'Benefits',
    startDate: 'Start Date',
    autoCreateEmployee: 'Auto-create Employee',
    
    // Status Labels
    draft: 'Draft',
    open: 'Open',
    onHold: 'On Hold',
    closed: 'Closed',
    filled: 'Filled',
    cancelled: 'Cancelled',
    applied: 'Applied',
    screening: 'Screening',
    shortlisted: 'Shortlisted',
    interviewScheduled: 'Interview Scheduled',
    interviewed: 'Interviewed',
    offered: 'Offered',
    hired: 'Hired',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
    pending: 'Pending',
    accepted: 'Accepted',
    
    // Messages
    noVacancies: 'No vacancies available',
    noCandidates: 'No candidates found',
    noInterviews: 'No interviews scheduled',
    vacancyCreatedSuccess: 'Vacancy created successfully',
    vacancyUpdatedSuccess: 'Vacancy updated successfully',
    vacancyDeletedSuccess: 'Vacancy deleted successfully',
    candidateAddedSuccess: 'Candidate added successfully',
    candidateUpdatedSuccess: 'Candidate updated successfully',
    interviewScheduledSuccess: 'Interview scheduled successfully',
    offerMadeSuccess: 'Offer made successfully',
    employeeCreatedSuccess: 'Employee created successfully',
    
    // Error Messages
    errorLoadingVacancies: 'Error loading vacancies',
    errorLoadingCandidates: 'Error loading candidates',
    errorCreatingVacancy: 'Error creating vacancy',
    errorUpdatingCandidate: 'Error updating candidate',
    errorSchedulingInterview: 'Error scheduling interview',
    errorMakingOffer: 'Error making offer',
    
    // Confirmation Messages
    confirmDeleteVacancy: 'Are you sure you want to delete this vacancy?',
    confirmRejectCandidate: 'Are you sure you want to reject this candidate?',
    confirmWithdrawOffer: 'Are you sure you want to withdraw this offer?',
    
    // Placeholder
    fullRecruitmentModuleComingSoon: 'Full recruitment module features coming soon',
  },
  ar: {
    // Page Titles
    recruitmentManagement: 'إدارة التوظيف',
    recruitmentSubtitle: 'إدارة عملية التوظيف من البداية إلى النهاية',
    
    // Tabs
    dashboard: 'لوحة التحكم',
    vacancies: 'الوظائف الشاغرة',
    candidates: 'المرشحون',
    interviews: 'المقابلات',
    hiringDecisions: 'قرارات التوظيف',
    
    // KPIs
    openVacancies: 'الوظائف الشاغرة المفتوحة',
    candidatesInPipeline: 'المرشحون في خط الأنابيب',
    interviewsScheduled: 'المقابلات المجدولة',
    positionsFilled: 'الوظائف المملوءة',
    avgTimeToHire: 'متوسط وقت التوظيف',
    totalApplications: 'إجمالي الطلبات',
    shortlistedCandidates: 'المرشحون المختارون',
    offersMade: 'العروض المقدمة',
    offersAccepted: 'العروض المقبولة',
    offersRejected: 'العروض المرفوضة',
    days: 'أيام',
    
    // Actions
    newVacancy: 'وظيفة جديدة',
    newCandidate: 'إضافة مرشح',
    scheduleInterview: 'جدولة مقابلة',
    makeOffer: 'تقديم عرض',
    viewAll: 'عرض الكل',
    
    // Vacancy Fields
    positionTitle: 'عنوان الوظيفة',
    department: 'القسم',
    project: 'المشروع/البرنامج',
    dutyStation: 'مقر العمل',
    contractType: 'نوع العقد',
    grade: 'الدرجة',
    vacancyType: 'نوع الوظيفة',
    justification: 'التبرير',
    openingDate: 'تاريخ الفتح',
    closingDate: 'تاريخ الإغلاق',
    hiringManager: 'مدير التوظيف',
    numberOfPositions: 'عدد الوظائف',
    minSalary: 'الحد الأدنى للراتب',
    maxSalary: 'الحد الأقصى للراتب',
    proposedGrade: 'الدرجة المقترحة',
    shortlistThreshold: 'حد الاختيار (%)',
    
    // Candidate Fields
    fullName: 'الاسم الكامل',
    firstName: 'الاسم الأول',
    lastName: 'اسم العائلة',
    email: 'البريد الإلكتروني',
    phone: 'الهاتف',
    currentPosition: 'الموضع الحالي',
    yearsOfExperience: 'سنوات الخبرة',
    educationLevel: 'مستوى التعليم',
    fieldOfStudy: 'مجال الدراسة',
    nationality: 'الجنسية',
    dateOfBirth: 'تاريخ الميلاد',
    currentLocation: 'الموقع الحالي',
    currentEmployer: 'صاحب العمل الحالي',
    source: 'المصدر',
    submissionDate: 'تاريخ التقديم',
    
    // Interview Fields
    interviewType: 'نوع المقابلة',
    interviewDate: 'تاريخ المقابلة',
    interviewTime: 'وقت المقابلة',
    duration: 'المدة (دقائق)',
    location: 'الموقع',
    meetingLink: 'رابط الاجتماع',
    panelMembers: 'أعضاء اللجنة',
    notes: 'ملاحظات',
    feedback: 'التعليقات',
    overallScore: 'النتيجة الإجمالية',
    
    // Hiring Decision Fields
    proposedSalary: 'الراتب المقترح',
    reportingTo: 'يرفع إلى',
    probationPeriod: 'فترة التجربة (أشهر)',
    benefits: 'المزايا',
    startDate: 'تاريخ البدء',
    autoCreateEmployee: 'إنشاء موظف تلقائي',
    
    // Status Labels
    draft: 'مسودة',
    open: 'مفتوح',
    onHold: 'قيد الانتظار',
    closed: 'مغلق',
    filled: 'مملوء',
    cancelled: 'ملغى',
    applied: 'تم التقديم',
    screening: 'الفحص',
    shortlisted: 'مختار',
    interviewScheduled: 'مقابلة مجدولة',
    interviewed: 'تمت المقابلة',
    offered: 'تم تقديم عرض',
    hired: 'تم التوظيف',
    rejected: 'مرفوض',
    withdrawn: 'مسحوب',
    pending: 'قيد الانتظار',
    accepted: 'مقبول',
    
    // Messages
    noVacancies: 'لا توجد وظائف شاغرة',
    noCandidates: 'لم يتم العثور على مرشحين',
    noInterviews: 'لا توجد مقابلات مجدولة',
    vacancyCreatedSuccess: 'تم إنشاء الوظيفة بنجاح',
    vacancyUpdatedSuccess: 'تم تحديث الوظيفة بنجاح',
    vacancyDeletedSuccess: 'تم حذف الوظيفة بنجاح',
    candidateAddedSuccess: 'تم إضافة المرشح بنجاح',
    candidateUpdatedSuccess: 'تم تحديث المرشح بنجاح',
    interviewScheduledSuccess: 'تم جدولة المقابلة بنجاح',
    offerMadeSuccess: 'تم تقديم العرض بنجاح',
    employeeCreatedSuccess: 'تم إنشاء الموظف بنجاح',
    
    // Error Messages
    errorLoadingVacancies: 'خطأ في تحميل الوظائف الشاغرة',
    errorLoadingCandidates: 'خطأ في تحميل المرشحين',
    errorCreatingVacancy: 'خطأ في إنشاء الوظيفة',
    errorUpdatingCandidate: 'خطأ في تحديث المرشح',
    errorSchedulingInterview: 'خطأ في جدولة المقابلة',
    errorMakingOffer: 'خطأ في تقديم العرض',
    
    // Confirmation Messages
    confirmDeleteVacancy: 'هل أنت متأكد من رغبتك في حذف هذه الوظيفة؟',
    confirmRejectCandidate: 'هل أنت متأكد من رغبتك في رفض هذا المرشح؟',
    confirmWithdrawOffer: 'هل أنت متأكد من رغبتك في سحب هذا العرض؟',
    
    // Placeholder
    fullRecruitmentModuleComingSoon: 'ميزات وحدة التوظيف الكاملة قريباً',
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get vacancy status label in the specified language
 */
export function getVacancyStatusLabel(status: string, language: 'en' | 'ar' = 'en'): string {
  const statusMap: Record<string, keyof typeof RECRUITMENT_TRANSLATIONS.en> = {
    draft: 'draft',
    open: 'open',
    on_hold: 'onHold',
    closed: 'closed',
    filled: 'filled',
    cancelled: 'cancelled',
  };
  
  const key = statusMap[status];
  return key ? RECRUITMENT_TRANSLATIONS[language][key] : status;
}

/**
 * Get candidate status label in the specified language
 */
export function getCandidateStatusLabel(status: string, language: 'en' | 'ar' = 'en'): string {
  const statusMap: Record<string, keyof typeof RECRUITMENT_TRANSLATIONS.en> = {
    applied: 'applied',
    screening: 'screening',
    shortlisted: 'shortlisted',
    interview_scheduled: 'interviewScheduled',
    interviewed: 'interviewed',
    offered: 'offered',
    hired: 'hired',
    rejected: 'rejected',
    withdrawn: 'withdrawn',
  };
  
  const key = statusMap[status];
  return key ? RECRUITMENT_TRANSLATIONS[language][key] : status;
}

/**
 * Get status badge color based on vacancy status
 */
export function getVacancyStatusColor(status: string): string {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-700 border-gray-300';
    case 'open':
      return 'bg-green-100 text-green-700 border-green-300';
    case 'on_hold':
      return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    case 'closed':
      return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'filled':
      return 'bg-purple-100 text-purple-700 border-purple-300';
    case 'cancelled':
      return 'bg-red-100 text-red-700 border-red-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
}

/**
 * Get status badge color based on candidate status
 */
export function getCandidateStatusColor(status: string): string {
  switch (status) {
    case 'applied':
      return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'screening':
      return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    case 'shortlisted':
      return 'bg-purple-100 text-purple-700 border-purple-300';
    case 'interview_scheduled':
      return 'bg-orange-100 text-orange-700 border-orange-300';
    case 'interviewed':
      return 'bg-cyan-100 text-cyan-700 border-cyan-300';
    case 'offered':
      return 'bg-green-100 text-green-700 border-green-300';
    case 'hired':
      return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    case 'rejected':
      return 'bg-red-100 text-red-700 border-red-300';
    case 'withdrawn':
      return 'bg-gray-100 text-gray-700 border-gray-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
}

/**
 * Get translation for a specific key
 */
export function getRecruitmentTranslation(
  key: keyof typeof RECRUITMENT_TRANSLATIONS.en,
  language: 'en' | 'ar' = 'en'
): string {
  return RECRUITMENT_TRANSLATIONS[language][key] || '';
}

/**
 * Calculate average time to hire (in days)
 */
export function calculateAverageTimeToHire(
  hiredCandidates: Array<{ submissionDate: string; hireDate?: string }>
): number {
  if (hiredCandidates.length === 0) return 0;
  
  const totalDays = hiredCandidates.reduce((sum, candidate) => {
    const submissionDate = new Date(candidate.submissionDate);
    const hireDate = candidate.hireDate ? new Date(candidate.hireDate) : new Date();
    const days = Math.floor((hireDate.getTime() - submissionDate.getTime()) / (1000 * 60 * 60 * 24));
    return sum + days;
  }, 0);
  
  return Math.round(totalDays / hiredCandidates.length);
}

/**
 * Validate vacancy data
 */
export function validateVacancyData(data: {
  positionTitle: string;
  department: string;
  openingDate: string;
  closingDate: string;
  numberOfPositions?: number;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.positionTitle || data.positionTitle.trim().length === 0) {
    errors.push('Position title is required');
  }
  
  if (!data.department || data.department.trim().length === 0) {
    errors.push('Department is required');
  }
  
  const opening = new Date(data.openingDate);
  const closing = new Date(data.closingDate);
  
  if (opening >= closing) {
    errors.push('Closing date must be after opening date');
  }
  
  if (data.numberOfPositions && data.numberOfPositions < 1) {
    errors.push('Number of positions must be at least 1');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
