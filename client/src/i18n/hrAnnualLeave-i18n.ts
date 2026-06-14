/**
 * HR Annual Leave Management - Multilingual Translation File
 * Supports: English (EN), Arabic (AR), Italian (IT)
 * 
 * Usage in components:
 * const { language } = useLanguage();
 * const t = hrAnnualLeaveTranslations[language];
 * 
 * Or use with useTranslation hook:
 * const { t } = useTranslation();
 */

export type SupportedLanguage = 'en' | 'ar' | 'it';

export interface HRAnnualLeaveTranslations {
  // ========== PAGE TITLES & HEADERS ==========
  pageTitle: string;
  pageSubtitle: string;
  
  // ========== TABS ==========
  tabs: {
    leaveBalances: string;
    employeesAnnualLeave: string;
    pending: string;
    approved: string;
  };

  // ========== BUTTONS ==========
  buttons: {
    newLeaveRequest: string;
    saveAsDraft: string;
    submitRequest: string;
    cancel: string;
    edit: string;
    delete: string;
    export: string;
    import: string;
    search: string;
    filter: string;
    reset: string;
    apply: string;
    save: string;
    close: string;
    back: string;
    next: string;
    previous: string;
  };

  // ========== STATISTICS CARDS ==========
  statistics: {
    totalRequests: string;
    pendingApproval: string;
    approved: string;
    rejected: string;
    totalActiveStaff: string;
    avgAvailableBalance: string;
    totalLeaveUsed: string;
    totalPending: string;
    totalEntitlement: string;
    totalAccrual: string;
    expiredContracts: string;
  };

  // ========== EMPLOYEE INFORMATION ==========
  employeeInfo: {
    title: string;
    staffId: string;
    fullName: string;
    firstName: string;
    lastName: string;
    position: string;
    jobTitle: string;
    department: string;
    contractPeriod: string;
    contractStartDate: string;
    contractEndDate: string;
    employeeCode: string;
    status: string;
    active: string;
    inactive: string;
    suspended: string;
    terminated: string;
    resigned: string;
  };

  // ========== LEAVE BALANCE ==========
  leaveBalance: {
    title: string;
    openingBalance: string;
    accrued: string;
    used: string;
    pending: string;
    remaining: string;
    available: string;
    carriedOver: string;
    entitlement: string;
    monthlyAccrualRate: string;
    insufficientBalance: string;
    insufficientBalanceMessage: string;
  };

  // ========== LEAVE DETAILS ==========
  leaveDetails: {
    title: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    totalDays: string;
    reason: string;
    medicalReport: string;
    medicalReportOptional: string;
    justification: string;
    attachmentUrl: string;
    request: string;
  };

  // ========== LEAVE TYPES ==========
  leaveTypes: {
    annualLeave: string;
    sickLeave: string;
    casualLeave: string;
    maternityLeave: string;
    paternityLeave: string;
    unpaidLeave: string;
    studyLeave: string;
    bereavement: string;
    emergencyLeave: string;
    other: string;
  };

  // ========== LEAVE REQUEST STATUS ==========
  leaveStatus: {
    draft: string;
    pending: string;
    approved: string;
    rejected: string;
    cancelled: string;
    expired: string;
  };

  // ========== TABLE COLUMNS ==========
  tableColumns: {
    staffId: string;
    name: string;
    department: string;
    position: string;
    contractStart: string;
    contractEnd: string;
    contractPeriod: string;
    monthlyRate: string;
    annualEntitlement: string;
    carryForward: string;
    entitlement: string;
    accrued: string;
    used: string;
    pending: string;
    remaining: string;
    available: string;
    status: string;
    actions: string;
    startDate: string;
    endDate: string;
    totalDays: string;
    leaveType: string;
    requestedBy: string;
    approvedBy: string;
    approvalDate: string;
    reason: string;
    notes: string;
  };

  // ========== SEARCH & FILTER ==========
  search: {
    placeholder: string;
    searchByStaffId: string;
    searchByName: string;
    searchByPosition: string;
    searchByDepartment: string;
    year: string;
    selectYear: string;
    fromDate: string;
    toDate: string;
    leaveTypeFilter: string;
    statusFilter: string;
    departmentFilter: string;
    noResults: string;
    noEmployeesFound: string;
  };

  // ========== FORM LABELS & PLACEHOLDERS ==========
  form: {
    required: string;
    optional: string;
    leaveRequest: string;
    enterReason: string;
    enterJustification: string;
    selectLeaveType: string;
    selectDepartment: string;
    selectStatus: string;
    selectYear: string;
    uploadFile: string;
    fileUploaded: string;
    fileSize: string;
    maxFileSize: string;
    supportedFormats: string;
  };

  // ========== MESSAGES & ALERTS ==========
  messages: {
    loading: string;
    saving: string;
    saved: string;
    leaveRequestSubmitted: string;
    failedToSave: string;
    error: string;
    success: string;
    warning: string;
    info: string;
    confirmDelete: string;
    deleteSuccess: string;
    deleteError: string;
    updateSuccess: string;
    updateError: string;
    createSuccess: string;
    createError: string;
    noData: string;
    noDataAvailable: string;
    loadingData: string;
    fetchError: string;
    networkError: string;
    sessionExpired: string;
    unauthorized: string;
    forbidden: string;
    notFound: string;
  };

  // ========== UNITS & MEASUREMENTS ==========
  units: {
    days: string;
    day: string;
    hours: string;
    hour: string;
    months: string;
    month: string;
    years: string;
    year: string;
  };

  // ========== ANNUAL LEAVE VIEW SPECIFIC ==========
  annualLeaveView: {
    title: string;
    subtitle: string;
    description: string;
    employeesList: string;
    statisticsCard: string;
    totalActiveStaff: string;
    avgAccrualRate: string;
    totalEntitlements: string;
    expiredContracts: string;
    editEntitlement: string;
    editEntitlementModal: string;
    updateSuccess: string;
    updateError: string;
    deleteConfirm: string;
    deleteSuccess: string;
    deleteError: string;
    exportData: string;
    exportSuccess: string;
    exportError: string;
    importData: string;
    importSuccess: string;
    importError: string;
  };

  // ========== LEAVE BALANCE VIEW SPECIFIC ==========
  leaveBalanceView: {
    title: string;
    subtitle: string;
    description: string;
    staffLeaveBalances: string;
    annualLeaveEntitlements: string;
    balancesForAllActiveStaff: string;
    searchPlaceholder: string;
    yearSelector: string;
    selectYear: string;
    noActiveStaffFound: string;
    colorCodedBalance: string;
    redIndicatesNegative: string;
    orangeIndicatesLow: string;
    greenIndicatesHealthy: string;
  };

  // ========== LEAVE REQUEST FORM SPECIFIC ==========
  leaveRequestForm: {
    title: string;
    editTitle: string;
    newRequestTitle: string;
    employeeInformation: string;
    leaveBalance: string;
    leaveDetails: string;
    selectEmployee: string;
    selectEmployeeFromList: string;
    employeeSelected: string;
    changeEmployee: string;
    startDateRequired: string;
    endDateRequired: string;
    startDateAfterEnd: string;
    insufficientBalance: string;
    insufficientBalanceWarning: string;
    requestWillBeSubmitted: string;
    requestWillBeSavedAsDraft: string;
    confirmSubmit: string;
    confirmSaveDraft: string;
  };

  // ========== EMPLOYEES ANNUAL LEAVE VIEW SPECIFIC ==========
  employeesAnnualLeaveView: {
    title: string;
    subtitle: string;
    description: string;
    employeesAnnualLeaves: string;
    manageEmployeeLeaveEntitlements: string;
    employeeList: string;
    editEmployee: string;
    editEmployeeLeaveEntitlement: string;
    viewEmployeeBalance: string;
    viewLeaveHistory: string;
    leaveHistory: string;
    noLeaveHistory: string;
    editModal: {
      title: string;
      annualEntitlement: string;
      monthlyAccrualRate: string;
      carryForwardDays: string;
      notes: string;
      save: string;
      cancel: string;
    };
  };

  // ========== VALIDATION MESSAGES ==========
  validation: {
    fieldRequired: string;
    invalidEmail: string;
    invalidDate: string;
    invalidDateRange: string;
    invalidNumber: string;
    minimumLength: string;
    maximumLength: string;
    passwordMismatch: string;
    fileTooBig: string;
    invalidFileType: string;
    startDateBeforeEnd: string;
    endDateAfterStart: string;
    dateInPast: string;
    dateInFuture: string;
    pdfOnly: string;
    fileTooLarge: string;
  };

  // ========== DATE & TIME FORMATS ==========
  dateTime: {
    today: string;
    yesterday: string;
    tomorrow: string;
    thisWeek: string;
    thisMonth: string;
    thisYear: string;
    lastWeek: string;
    lastMonth: string;
    lastYear: string;
    january: string;
    february: string;
    march: string;
    april: string;
    may: string;
    june: string;
    july: string;
    august: string;
    september: string;
    october: string;
    november: string;
    december: string;
    from: string;
    to: string;
    after: string;
  };

  // ========== EMPTY STATES ==========
  emptyStates: {
    noData: string;
    noEmployees: string;
    noRequests: string;
    noBalance: string;
    noHistory: string;
    startByCreating: string;
    tryAdjustingFilters: string;
    checkBackLater: string;
  };

  // ========== TOOLTIPS & HELP TEXT ==========
  help: {
    annualEntitlementHelp: string;
    monthlyAccrualRateHelp: string;
    carryForwardHelp: string;
    leaveBalanceHelp: string;
    accruedHelp: string;
    usedHelp: string;
    pendingHelp: string;
    availableHelp: string;
  };
}

// ============================================================================
// ENGLISH TRANSLATIONS
// ============================================================================
export const hrAnnualLeaveTranslationsEN: HRAnnualLeaveTranslations = {
  pageTitle: 'Leave Management',
  pageSubtitle: 'Manage leave requests, approvals, and balances',

  tabs: {
    leaveBalances: 'Leave Balances',
    employeesAnnualLeave: 'Employees Annual Leave',
    pending: 'Pending',
    approved: 'Approved',
  },

  buttons: {
    newLeaveRequest: 'New Leave Request',
    saveAsDraft: 'Save as Draft',
    submitRequest: 'Submit Request',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    export: 'Export',
    import: 'Import',
    search: 'Search',
    filter: 'Filter',
    reset: 'Reset',
    apply: 'Apply',
    save: 'Save',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
  },

  statistics: {
    totalRequests: 'Total Requests',
    pendingApproval: 'Pending Approval',
    approved: 'Approved',
    rejected: 'Rejected',
    totalActiveStaff: 'TOTAL ACTIVE STAFF',
    avgAvailableBalance: 'AVG. AVAILABLE BALANCE',
    totalLeaveUsed: 'TOTAL LEAVE USED',
    totalPending: 'TOTAL PENDING',
    totalEntitlement: 'Total Entitlement',
    totalAccrual: 'Total Accrual',
    expiredContracts: 'Expired Contracts',
  },

  employeeInfo: {
    title: 'Employee Information',
    staffId: 'Staff ID',
    fullName: 'Full Name',
    firstName: 'First Name',
    lastName: 'Last Name',
    position: 'Position',
    jobTitle: 'Job Title',
    department: 'Department',
    contractPeriod: 'Contract Period',
    contractStartDate: 'Contract Start Date',
    contractEndDate: 'Contract End Date',
    employeeCode: 'Employee Code',
    status: 'Status',
    active: 'Active',
    inactive: 'Inactive',
    suspended: 'Suspended',
    terminated: 'Terminated',
    resigned: 'Resigned',
  },

  leaveBalance: {
    title: 'Leave Balance',
    openingBalance: 'Opening Balance',
    accrued: 'Accrued',
    used: 'Used',
    pending: 'Pending',
    remaining: 'Remaining',
    available: 'Available',
    carriedOver: 'Carried Over',
    entitlement: 'Entitlement',
    monthlyAccrualRate: 'Monthly Accrual Rate',
    insufficientBalance: 'Insufficient leave balance',
    insufficientBalanceMessage: 'You do not have enough leave balance for this request',
  },

  leaveDetails: {
    title: 'Leave Details',
    leaveType: 'Leave Type',
    startDate: 'Start Date',
    endDate: 'End Date',
    totalDays: 'Total Leave Days',
    reason: 'Reason for Leave',
    medicalReport: 'Medical Report (if applicable)',
    medicalReportOptional: 'Medical Report (optional)',
    justification: 'Justification',
    attachmentUrl: 'Attachment',
    request: 'Request',
  },

  leaveTypes: {
    annualLeave: 'Annual Leave',
    sickLeave: 'Sick Leave',
    casualLeave: 'Casual Leave',
    maternityLeave: 'Maternity Leave',
    paternityLeave: 'Paternity Leave',
    unpaidLeave: 'Unpaid Leave',
    studyLeave: 'Study Leave',
    bereavement: 'Bereavement Leave',
    emergencyLeave: 'Emergency Leave',
    other: 'Other',
  },

  leaveStatus: {
    draft: 'Draft',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
    expired: 'Expired',
  },

  tableColumns: {
    staffId: 'Staff ID',
    name: 'Name',
    department: 'Department',
    position: 'Position',
    contractStart: 'Contract Start',
    contractEnd: 'Contract End',
    contractPeriod: 'Contract Period',
    monthlyRate: 'Monthly Rate',
    annualEntitlement: 'Annual Entitlement',
    carryForward: 'Carry Forward',
    entitlement: 'Entitlement',
    accrued: 'Accrued',
    used: 'Used',
    pending: 'Pending',
    remaining: 'Remaining',
    available: 'Available',
    status: 'Status',
    actions: 'Actions',
    startDate: 'Start Date',
    endDate: 'End Date',
    totalDays: 'Total Days',
    leaveType: 'Leave Type',
    requestedBy: 'Requested By',
    approvedBy: 'Approved By',
    approvalDate: 'Approval Date',
    reason: 'Reason',
    notes: 'Notes',
  },

  search: {
    placeholder: 'Search...',
    searchByStaffId: 'Search by Staff ID',
    searchByName: 'Search by Name',
    searchByPosition: 'Search by Position',
    searchByDepartment: 'Search by Department',
    year: 'Year',
    selectYear: 'Select Year',
    fromDate: 'From Date',
    toDate: 'To Date',
    leaveTypeFilter: 'Leave Type',
    statusFilter: 'Status',
    departmentFilter: 'Department',
    noResults: 'No results found',
    noEmployeesFound: 'No employees found',
  },

  form: {
    required: 'Required',
    optional: 'Optional',
    leaveRequest: 'Leave Request',
    enterReason: 'Enter reason...',
    enterJustification: 'Enter justification...',
    selectLeaveType: 'Select leave type',
    selectDepartment: 'Select department',
    selectStatus: 'Select status',
    selectYear: 'Select year',
    uploadFile: 'Upload file',
    fileUploaded: 'File Uploaded',
    fileSize: 'File size',
    maxFileSize: 'Maximum file size: 5MB',
    supportedFormats: 'Supported formats: PDF, DOC, DOCX, JPG, PNG',
  },

  messages: {
    loading: 'Loading...',
    saving: 'Saving...',
    saved: 'Saved successfully',
    leaveRequestSubmitted: 'Leave Request Submitted',
    failedToSave: 'Failed To Save',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    info: 'Information',
    confirmDelete: 'Are you sure you want to delete this?',
    deleteSuccess: 'Deleted successfully',
    deleteError: 'Failed to delete',
    updateSuccess: 'Updated successfully',
    updateError: 'Failed to update',
    createSuccess: 'Created successfully',
    createError: 'Failed to create',
    noData: 'No data available',
    noDataAvailable: 'No data available',
    loadingData: 'Loading data...',
    fetchError: 'Failed to fetch data',
    networkError: 'Network error',
    sessionExpired: 'Session expired',
    unauthorized: 'Unauthorized',
    forbidden: 'Forbidden',
    notFound: 'Not found',
  },

  units: {
    days: 'days',
    day: 'day',
    hours: 'hours',
    hour: 'hour',
    months: 'months',
    month: 'month',
    years: 'years',
    year: 'year',
  },

  annualLeaveView: {
    title: 'Employees Annual Leave',
    subtitle: 'Manage employee annual leave entitlements and calculations',
    description: 'View and manage annual leave entitlements for all active employees',
    employeesList: 'Employees List',
    statisticsCard: 'Statistics',
    totalActiveStaff: 'Total Active Staff',
    avgAccrualRate: 'Avg. Accrual Rate',
    totalEntitlements: 'Total Entitlements',
    expiredContracts: 'Expired Contracts',
    editEntitlement: 'Edit Entitlement',
    editEntitlementModal: 'Edit Employee Annual Leave',
    updateSuccess: 'Annual leave entitlement updated successfully',
    updateError: 'Failed to update annual leave entitlement',
    deleteConfirm: 'Are you sure you want to delete this record?',
    deleteSuccess: 'Record deleted successfully',
    deleteError: 'Failed to delete record',
    exportData: 'Export Data',
    exportSuccess: 'Data exported successfully',
    exportError: 'Failed to export data',
    importData: 'Import Data',
    importSuccess: 'Data imported successfully',
    importError: 'Failed to import data',
  },

  leaveBalanceView: {
    title: 'Staff Leave Balances',
    subtitle: 'Annual leave entitlements and balances for all active staff',
    description: 'View leave balances and accrual information',
    staffLeaveBalances: 'Staff Leave Balances',
    annualLeaveEntitlements: 'Annual Leave Entitlements',
    balancesForAllActiveStaff: 'Balances for all active staff',
    searchPlaceholder: 'Search by Staff ID, Name, Position, Department...',
    yearSelector: 'Year',
    selectYear: 'Select Year',
    noActiveStaffFound: 'No active staff found',
    colorCodedBalance: 'Color-coded balance indicator',
    redIndicatesNegative: 'Red indicates negative balance',
    orangeIndicatesLow: 'Orange indicates low balance (< 3 days)',
    greenIndicatesHealthy: 'Green indicates healthy balance',
  },

  leaveRequestForm: {
    title: 'Leave Request',
    editTitle: 'Edit Leave Request',
    newRequestTitle: 'New Leave Request',
    employeeInformation: 'Employee Information',
    leaveBalance: 'Leave Balance',
    leaveDetails: 'Leave Details',
    selectEmployee: 'Select Employee',
    selectEmployeeFromList: 'Select employee from list',
    employeeSelected: 'Employee selected',
    changeEmployee: 'Change Employee',
    startDateRequired: 'Start date is required',
    endDateRequired: 'End date is required',
    startDateAfterEnd: 'Start date must be before end date',
    insufficientBalance: 'Insufficient leave balance',
    insufficientBalanceWarning: 'You do not have enough leave balance for this request',
    requestWillBeSubmitted: 'This request will be submitted for approval',
    requestWillBeSavedAsDraft: 'This request will be saved as draft',
    confirmSubmit: 'Confirm Submit',
    confirmSaveDraft: 'Confirm Save as Draft',
  },

  employeesAnnualLeaveView: {
    title: 'Employees Annual Leave',
    subtitle: 'Manage employee annual leave entitlements',
    description: 'View and manage annual leave entitlements for all active employees',
    employeesAnnualLeaves: 'Employees Annual Leaves',
    manageEmployeeLeaveEntitlements: 'Manage employee leave entitlements and calculations',
    employeeList: 'Employee List',
    editEmployee: 'Edit Employee',
    editEmployeeLeaveEntitlement: 'Edit Employee Annual Leave Entitlement',
    viewEmployeeBalance: 'View Employee Balance',
    viewLeaveHistory: 'View Leave History',
    leaveHistory: 'Leave History',
    noLeaveHistory: 'No leave history available',
    editModal: {
      title: 'Edit Annual Leave Entitlement',
      annualEntitlement: 'Annual Entitlement (days)',
      monthlyAccrualRate: 'Monthly Accrual Rate (days/month)',
      carryForwardDays: 'Carry Forward Days',
      notes: 'Notes',
      save: 'Save Changes',
      cancel: 'Cancel',
    },
  },

  validation: {
    fieldRequired: 'This field is required',
    invalidEmail: 'Invalid email address',
    invalidDate: 'Invalid date',
    invalidDateRange: 'Invalid date range',
    invalidNumber: 'Invalid number',
    minimumLength: 'Minimum length is {min} characters',
    maximumLength: 'Maximum length is {max} characters',
    passwordMismatch: 'Passwords do not match',
    fileTooBig: 'File is too big',
    invalidFileType: 'Invalid file type',
    startDateBeforeEnd: 'Start date must be before end date',
    endDateAfterStart: 'End date must be after start date',
    dateInPast: 'Date cannot be in the past',
    dateInFuture: 'Date cannot be in the future',
    pdfOnly: 'PDF Only',
    fileTooLarge: 'File Too Large',
  },

  dateTime: {
    today: 'Today',
    yesterday: 'Yesterday',
    tomorrow: 'Tomorrow',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    thisYear: 'This Year',
    lastWeek: 'Last Week',
    lastMonth: 'Last Month',
    lastYear: 'Last Year',
    january: 'January',
    february: 'February',
    march: 'March',
    april: 'April',
    may: 'May',
    june: 'June',
    july: 'July',
    august: 'August',
    september: 'September',
    october: 'October',
    november: 'November',
    december: 'December',
    from: 'From',
    to: 'To',
    after: 'After',
  },

  emptyStates: {
    noData: 'No data available',
    noEmployees: 'No employees found',
    noRequests: 'No requests found',
    noBalance: 'No balance information available',
    noHistory: 'No history available',
    startByCreating: 'Start by creating a new entry',
    tryAdjustingFilters: 'Try adjusting your filters',
    checkBackLater: 'Check back later',
  },

  help: {
    annualEntitlementHelp: 'Total annual leave days the employee is entitled to (default: 30 days)',
    monthlyAccrualRateHelp: 'Leave days accrued per month (default: 2.5 days/month)',
    carryForwardHelp: 'Leave days carried forward from the previous year',
    leaveBalanceHelp: 'Current leave balance summary',
    accruedHelp: 'Leave days accrued to date (minimum of monthly accrual or annual entitlement)',
    usedHelp: 'Leave days already used (approved requests)',
    pendingHelp: 'Leave days pending approval',
    availableHelp: 'Leave days available for use (remaining - pending)',
  },
};

// ============================================================================
// ARABIC TRANSLATIONS
// ============================================================================
export const hrAnnualLeaveTranslationsAR: HRAnnualLeaveTranslations = {
  pageTitle: 'إدارة الإجازات',
  pageSubtitle: 'إدارة طلبات الإجازات والموافقات والأرصدة',

  tabs: {
    leaveBalances: 'أرصدة الإجازات',
    employeesAnnualLeave: 'الإجازات السنوية للموظفين',
    pending: 'قيد الانتظار',
    approved: 'موافق عليه',
  },

  buttons: {
    newLeaveRequest: 'طلب إجازة جديد',
    saveAsDraft: 'حفظ كمسودة',
    submitRequest: 'إرسال الطلب',
    cancel: 'إلغاء',
    edit: 'تعديل',
    delete: 'حذف',
    export: 'تصدير',
    import: 'استيراد',
    search: 'بحث',
    filter: 'تصفية',
    reset: 'إعادة تعيين',
    apply: 'تطبيق',
    save: 'حفظ',
    close: 'إغلاق',
    back: 'رجوع',
    next: 'التالي',
    previous: 'السابق',
  },

  statistics: {
    totalRequests: 'إجمالي الطلبات',
    pendingApproval: 'قيد الموافقة',
    approved: 'موافق عليه',
    rejected: 'مرفوض',
    totalActiveStaff: 'إجمالي الموظفين النشطين',
    avgAvailableBalance: 'متوسط الرصيد المتاح',
    totalLeaveUsed: 'إجمالي الإجازات المستخدمة',
    totalPending: 'إجمالي قيد الانتظار',
    totalEntitlement: 'إجمالي الاستحقاق',
    totalAccrual: 'إجمالي الاستحقاق الشهري',
    expiredContracts: 'العقود المنتهية',
  },

  employeeInfo: {
    title: 'معلومات الموظف',
    staffId: 'رقم الموظف',
    fullName: 'الاسم الكامل',
    firstName: 'الاسم الأول',
    lastName: 'اسم العائلة',
    position: 'المنصب',
    jobTitle: 'المسمى الوظيفي',
    department: 'القسم',
    contractPeriod: 'فترة العقد',
    contractStartDate: 'تاريخ بداية العقد',
    contractEndDate: 'تاريخ نهاية العقد',
    employeeCode: 'كود الموظف',
    status: 'الحالة',
    active: 'نشط',
    inactive: 'غير نشط',
    suspended: 'موقوف',
    terminated: 'منهي',
    resigned: 'استقال',
  },

  leaveBalance: {
    title: 'رصيد الإجازة',
    openingBalance: 'الرصيد الافتتاحي',
    accrued: 'المستحق',
    used: 'المستخدم',
    pending: 'قيد الانتظار',
    remaining: 'المتبقي',
    available: 'المتاح',
    carriedOver: 'المنقول من السنة السابقة',
    entitlement: 'الاستحقاق',
    monthlyAccrualRate: 'معدل الاستحقاق الشهري',
    insufficientBalance: 'رصيد إجازة غير كافي',
    insufficientBalanceMessage: 'ليس لديك رصيد إجازة كافي لهذا الطلب',
  },

  leaveDetails: {
    title: 'تفاصيل الإجازة',
    leaveType: 'نوع الإجازة',
    startDate: 'تاريخ البداية',
    endDate: 'تاريخ النهاية',
    totalDays: 'إجمالي أيام الإجازة',
    reason: 'سبب الإجازة',
    medicalReport: 'التقرير الطبي (إن أمكن)',
    medicalReportOptional: 'التقرير الطبي (اختياري)',
    justification: 'التبرير',
    attachmentUrl: 'المرفق',
    request: 'طلب',
  },

  leaveTypes: {
    annualLeave: 'إجازة سنوية',
    sickLeave: 'إجازة مرضية',
    casualLeave: 'إجازة عادية',
    maternityLeave: 'إجازة أمومة',
    paternityLeave: 'إجازة أبوة',
    unpaidLeave: 'إجازة بدون راتب',
    studyLeave: 'إجازة دراسية',
    bereavement: 'إجازة وفاة',
    emergencyLeave: 'إجازة طارئة',
    other: 'أخرى',
  },

  leaveStatus: {
    draft: 'مسودة',
    pending: 'قيد الانتظار',
    approved: 'موافق عليه',
    rejected: 'مرفوض',
    cancelled: 'ملغاة',
    expired: 'منتهية',
  },

  tableColumns: {
    staffId: 'رقم الموظف',
    name: 'الاسم',
    department: 'القسم',
    position: 'المنصب',
    contractStart: 'بداية العقد',
    contractEnd: 'نهاية العقد',
    contractPeriod: 'فترة العقد',
    monthlyRate: 'المعدل الشهري',
    annualEntitlement: 'الاستحقاق السنوي',
    carryForward: 'المنقول',
    entitlement: 'الاستحقاق',
    accrued: 'المستحق',
    used: 'المستخدم',
    pending: 'قيد الانتظار',
    remaining: 'المتبقي',
    available: 'المتاح',
    status: 'الحالة',
    actions: 'الإجراءات',
    startDate: 'تاريخ البداية',
    endDate: 'تاريخ النهاية',
    totalDays: 'إجمالي الأيام',
    leaveType: 'نوع الإجازة',
    requestedBy: 'مقدم الطلب',
    approvedBy: 'موافق من',
    approvalDate: 'تاريخ الموافقة',
    reason: 'السبب',
    notes: 'ملاحظات',
  },

  search: {
    placeholder: 'بحث...',
    searchByStaffId: 'ابحث برقم الموظف',
    searchByName: 'ابحث بالاسم',
    searchByPosition: 'ابحث بالمنصب',
    searchByDepartment: 'ابحث بالقسم',
    year: 'السنة',
    selectYear: 'اختر السنة',
    fromDate: 'من التاريخ',
    toDate: 'إلى التاريخ',
    leaveTypeFilter: 'نوع الإجازة',
    statusFilter: 'الحالة',
    departmentFilter: 'القسم',
    noResults: 'لم يتم العثور على نتائج',
    noEmployeesFound: 'لم يتم العثور على موظفين',
  },

  form: {
    required: 'مطلوب',
    optional: 'اختياري',
    enterReason: 'أدخل السبب...',
    leaveRequest: 'طلب إجازة',
    enterJustification: 'أدخل التبرير...',
    selectLeaveType: 'اختر نوع الإجازة',
    selectDepartment: 'اختر القسم',
    selectStatus: 'اختر الحالة',
    selectYear: 'اختر السنة',
    uploadFile: 'رفع ملف',
    fileUploaded: 'تم تحميل الملف',
    fileSize: 'حجم الملف',
    maxFileSize: 'الحد الأقصى لحجم الملف: 5 ميجابايت',
    supportedFormats: 'الصيغ المدعومة: PDF، DOC، DOCX، JPG، PNG',
  },

  messages: {
    loading: 'جاري التحميل...',
    saving: 'جاري الحفظ...',
    saved: 'تم الحفظ بنجاح',
    leaveRequestSubmitted: "تم تقديم طلب الإجازة",
    failedToSave: "فشل الحفظ",
    error: 'خطأ',
    success: 'نجح',
    warning: 'تحذير',
    info: 'معلومة',
    confirmDelete: 'هل أنت متأكد من رغبتك في حذف هذا؟',
    deleteSuccess: 'تم الحذف بنجاح',
    deleteError: 'فشل الحذف',
    updateSuccess: 'تم التحديث بنجاح',
    updateError: 'فشل التحديث',
    createSuccess: 'تم الإنشاء بنجاح',
    createError: 'فشل الإنشاء',
    noData: 'لا توجد بيانات متاحة',
    noDataAvailable: 'لا توجد بيانات متاحة',
    loadingData: 'جاري تحميل البيانات...',
    fetchError: 'فشل في جلب البيانات',
    networkError: 'خطأ في الشبكة',
    sessionExpired: 'انتهت الجلسة',
    unauthorized: 'غير مصرح',
    forbidden: 'محظور',
    notFound: 'غير موجود',
  },

  units: {
    days: 'أيام',
    day: 'يوم',
    hours: 'ساعات',
    hour: 'ساعة',
    months: 'أشهر',
    month: 'شهر',
    years: 'سنوات',
    year: 'سنة',
  },

  annualLeaveView: {
    title: 'الإجازات السنوية للموظفين',
    subtitle: 'إدارة استحقاقات الإجازات السنوية للموظفين',
    description: 'عرض وإدارة استحقاقات الإجازات السنوية لجميع الموظفين النشطين',
    employeesList: 'قائمة الموظفين',
    statisticsCard: 'الإحصائيات',
    totalActiveStaff: 'إجمالي الموظفين النشطين',
    avgAccrualRate: 'متوسط معدل الاستحقاق',
    totalEntitlements: 'إجمالي الاستحقاقات',
    expiredContracts: 'العقود المنتهية',
    editEntitlement: 'تعديل الاستحقاق',
    editEntitlementModal: 'تعديل استحقاق الإجازة السنوية للموظف',
    updateSuccess: 'تم تحديث استحقاق الإجازة السنوية بنجاح',
    updateError: 'فشل تحديث استحقاق الإجازة السنوية',
    deleteConfirm: 'هل أنت متأكد من رغبتك في حذف هذا السجل؟',
    deleteSuccess: 'تم حذف السجل بنجاح',
    deleteError: 'فشل حذف السجل',
    exportData: 'تصدير البيانات',
    exportSuccess: 'تم تصدير البيانات بنجاح',
    exportError: 'فشل تصدير البيانات',
    importData: 'استيراد البيانات',
    importSuccess: 'تم استيراد البيانات بنجاح',
    importError: 'فشل استيراد البيانات',
  },

  leaveBalanceView: {
    title: 'أرصدة إجازات الموظفين',
    subtitle: 'استحقاقات الإجازات السنوية والأرصدة لجميع الموظفين النشطين',
    description: 'عرض أرصدة الإجازات ومعلومات الاستحقاق',
    staffLeaveBalances: 'أرصدة إجازات الموظفين',
    annualLeaveEntitlements: 'استحقاقات الإجازات السنوية',
    balancesForAllActiveStaff: 'الأرصدة لجميع الموظفين النشطين',
    searchPlaceholder: 'ابحث برقم الموظف أو الاسم أو المنصب أو القسم...',
    yearSelector: 'السنة',
    selectYear: 'اختر السنة',
    noActiveStaffFound: 'لم يتم العثور على موظفين نشطين',
    colorCodedBalance: 'مؤشر الرصيد الملون',
    redIndicatesNegative: 'الأحمر يشير إلى رصيد سالب',
    orangeIndicatesLow: 'البرتقالي يشير إلى رصيد منخفض (< 3 أيام)',
    greenIndicatesHealthy: 'الأخضر يشير إلى رصيد صحي',
  },

  leaveRequestForm: {
    title: 'طلب إجازة',
    editTitle: 'تعديل طلب الإجازة',
    newRequestTitle: 'طلب إجازة جديد',
    employeeInformation: 'معلومات الموظف',
    leaveBalance: 'رصيد الإجازة',
    leaveDetails: 'تفاصيل الإجازة',
    selectEmployee: 'اختر الموظف',
    selectEmployeeFromList: 'اختر الموظف من القائمة',
    employeeSelected: 'تم اختيار الموظف',
    changeEmployee: 'تغيير الموظف',
    startDateRequired: 'تاريخ البداية مطلوب',
    endDateRequired: 'تاريخ النهاية مطلوب',
    startDateAfterEnd: 'يجب أن يكون تاريخ البداية قبل تاريخ النهاية',
    insufficientBalance: 'رصيد إجازة غير كافي',
    insufficientBalanceWarning: 'ليس لديك رصيد إجازة كافي لهذا الطلب',
    requestWillBeSubmitted: 'سيتم إرسال هذا الطلب للموافقة',
    requestWillBeSavedAsDraft: 'سيتم حفظ هذا الطلب كمسودة',
    confirmSubmit: 'تأكيد الإرسال',
    confirmSaveDraft: 'تأكيد الحفظ كمسودة',
  },

  employeesAnnualLeaveView: {
    title: 'الإجازات السنوية للموظفين',
    subtitle: 'إدارة استحقاقات الإجازات السنوية للموظفين',
    description: 'عرض وإدارة استحقاقات الإجازات السنوية لجميع الموظفين النشطين',
    employeesAnnualLeaves: 'إجازات الموظفين السنوية',
    manageEmployeeLeaveEntitlements: 'إدارة استحقاقات الإجازات للموظفين والحسابات',
    employeeList: 'قائمة الموظفين',
    editEmployee: 'تعديل الموظف',
    editEmployeeLeaveEntitlement: 'تعديل استحقاق الإجازة السنوية للموظف',
    viewEmployeeBalance: 'عرض رصيد الموظف',
    viewLeaveHistory: 'عرض سجل الإجازات',
    leaveHistory: 'سجل الإجازات',
    noLeaveHistory: 'لا يوجد سجل إجازات متاح',
    editModal: {
      title: 'تعديل استحقاق الإجازة السنوية',
      annualEntitlement: 'الاستحقاق السنوي (أيام)',
      monthlyAccrualRate: 'معدل الاستحقاق الشهري (أيام/شهر)',
      carryForwardDays: 'أيام المنقول',
      notes: 'ملاحظات',
      save: 'حفظ التغييرات',
      cancel: 'إلغاء',
    },
  },

  validation: {
    fieldRequired: 'هذا الحقل مطلوب',
    invalidEmail: 'عنوان بريد إلكتروني غير صحيح',
    invalidDate: 'تاريخ غير صحيح',
    invalidDateRange: 'نطاق تاريخ غير صحيح',
    invalidNumber: 'رقم غير صحيح',
    minimumLength: 'الحد الأدنى للطول هو {min} أحرف',
    maximumLength: 'الحد الأقصى للطول هو {max} أحرف',
    passwordMismatch: 'كلمات المرور غير متطابقة',
    fileTooBig: 'الملف كبير جداً',
    invalidFileType: 'نوع ملف غير صحيح',
    startDateBeforeEnd: 'يجب أن يكون تاريخ البداية قبل تاريخ النهاية',
    endDateAfterStart: 'يجب أن يكون تاريخ النهاية بعد تاريخ البداية',
    dateInPast: 'لا يمكن أن يكون التاريخ في الماضي',
    dateInFuture: 'لا يمكن أن يكون التاريخ في المستقبل',
    pdfOnly: 'ملفات بي جي اف فقط',
    fileTooLarge: 'الملف كبير جدًا',
  },

  dateTime: {
    today: 'اليوم',
    yesterday: 'أمس',
    tomorrow: 'غداً',
    thisWeek: 'هذا الأسبوع',
    thisMonth: 'هذا الشهر',
    thisYear: 'هذا العام',
    lastWeek: 'الأسبوع الماضي',
    lastMonth: 'الشهر الماضي',
    lastYear: 'العام الماضي',
    january: 'يناير',
    february: 'فبراير',
    march: 'مارس',
    april: 'أبريل',
    may: 'مايو',
    june: 'يونيو',
    july: 'يوليو',
    august: 'أغسطس',
    september: 'سبتمبر',
    october: 'أكتوبر',
    november: 'نوفمبر',
    december: 'ديسمبر',
    from: 'من',
    to: 'الى',
    after: 'بعد',
  },

  emptyStates: {
    noData: 'لا توجد بيانات متاحة',
    noEmployees: 'لم يتم العثور على موظفين',
    noRequests: 'لم يتم العثور على طلبات',
    noBalance: 'لا توجد معلومات رصيد متاحة',
    noHistory: 'لا يوجد سجل متاح',
    startByCreating: 'ابدأ بإنشاء إدخال جديد',
    tryAdjustingFilters: 'حاول تعديل المرشحات الخاصة بك',
    checkBackLater: 'تحقق لاحقاً',
  },

  help: {
    annualEntitlementHelp: 'إجمالي أيام الإجازة السنوية التي يستحقها الموظف (الافتراضي: 30 يوماً)',
    monthlyAccrualRateHelp: 'أيام الإجازة المستحقة شهرياً (الافتراضي: 2.5 يوم/شهر)',
    carryForwardHelp: 'أيام الإجازة المنقولة من السنة السابقة',
    leaveBalanceHelp: 'ملخص رصيد الإجازة الحالي',
    accruedHelp: 'أيام الإجازة المستحقة حتى الآن (الحد الأدنى من الاستحقاق الشهري أو الاستحقاق السنوي)',
    usedHelp: 'أيام الإجازة المستخدمة بالفعل (الطلبات الموافق عليها)',
    pendingHelp: 'أيام الإجازة قيد الموافقة',
    availableHelp: 'أيام الإجازة المتاحة للاستخدام (المتبقي - قيد الانتظار)',
  },
};

// ============================================================================
// ITALIAN TRANSLATIONS
// ============================================================================
export const hrAnnualLeaveTranslationsIT: HRAnnualLeaveTranslations = {
  pageTitle: 'Gestione Ferie',
  pageSubtitle: 'Gestisci richieste di ferie, approvazioni e saldi',

  tabs: {
    leaveBalances: 'Saldi Ferie',
    employeesAnnualLeave: 'Ferie Annuali Dipendenti',
    pending: 'In Sospeso',
    approved: 'Approvato',
  },

  buttons: {
    newLeaveRequest: 'Nuova Richiesta Ferie',
    saveAsDraft: 'Salva come Bozza',
    submitRequest: 'Invia Richiesta',
    cancel: 'Annulla',
    edit: 'Modifica',
    delete: 'Elimina',
    export: 'Esporta',
    import: 'Importa',
    search: 'Cerca',
    filter: 'Filtra',
    reset: 'Ripristina',
    apply: 'Applica',
    save: 'Salva',
    close: 'Chiudi',
    back: 'Indietro',
    next: 'Avanti',
    previous: 'Precedente',
  },

  statistics: {
    totalRequests: 'Richieste Totali',
    pendingApproval: 'In Attesa di Approvazione',
    approved: 'Approvato',
    rejected: 'Rifiutato',
    totalActiveStaff: 'PERSONALE ATTIVO TOTALE',
    avgAvailableBalance: 'SALDO DISPONIBILE MEDIO',
    totalLeaveUsed: 'FERIE TOTALI UTILIZZATE',
    totalPending: 'TOTALE IN SOSPESO',
    totalEntitlement: 'Diritto Totale',
    totalAccrual: 'Accantonamento Totale',
    expiredContracts: 'Contratti Scaduti',
  },

  employeeInfo: {
    title: 'Informazioni Dipendente',
    staffId: 'ID Dipendente',
    fullName: 'Nome Completo',
    firstName: 'Nome',
    lastName: 'Cognome',
    position: 'Posizione',
    jobTitle: 'Titolo Lavoro',
    department: 'Dipartimento',
    contractPeriod: 'Periodo Contratto',
    contractStartDate: 'Data Inizio Contratto',
    contractEndDate: 'Data Fine Contratto',
    employeeCode: 'Codice Dipendente',
    status: 'Stato',
    active: 'Attivo',
    inactive: 'Inattivo',
    suspended: 'Sospeso',
    terminated: 'Terminato',
    resigned: 'Dimesso',
  },

  leaveBalance: {
    title: 'Saldo Ferie',
    openingBalance: 'Saldo Iniziale',
    accrued: 'Accantonato',
    used: 'Utilizzato',
    pending: 'In Sospeso',
    remaining: 'Rimanente',
    available: 'Disponibile',
    carriedOver: 'Riportato',
    entitlement: 'Diritto',
    monthlyAccrualRate: 'Tasso Accantonamento Mensile',
    insufficientBalance: 'Saldo ferie insufficiente',
    insufficientBalanceMessage: 'Non hai un saldo ferie sufficiente per questa richiesta',
  },

  leaveDetails: {
    title: 'Dettagli Ferie',
    leaveType: 'Tipo Ferie',
    startDate: 'Data Inizio',
    endDate: 'Data Fine',
    totalDays: 'Giorni Ferie Totali',
    reason: 'Motivo Ferie',
    medicalReport: 'Certificato Medico (se applicabile)',
    medicalReportOptional: 'Certificato Medico (opzionale)',
    justification: 'Giustificazione',
    attachmentUrl: 'Allegato',
    request: 'richiesta',
  },

  leaveTypes: {
    annualLeave: 'Ferie Annuali',
    sickLeave: 'Malattia',
    casualLeave: 'Ferie Ordinarie',
    maternityLeave: 'Maternità',
    paternityLeave: 'Paternità',
    unpaidLeave: 'Ferie Non Retribuite',
    studyLeave: 'Ferie Studio',
    bereavement: 'Lutto',
    emergencyLeave: 'Congedo di emergenza',
    other: 'Altro',
  },

  leaveStatus: {
    draft: 'Bozza',
    pending: 'In Sospeso',
    approved: 'Approvato',
    rejected: 'Rifiutato',
    cancelled: 'Annullato',
    expired: 'Scaduto',
  },

  tableColumns: {
    staffId: 'ID Dipendente',
    name: 'Nome',
    department: 'Dipartimento',
    position: 'Posizione',
    contractStart: 'Inizio Contratto',
    contractEnd: 'Fine Contratto',
    contractPeriod: 'Periodo Contratto',
    monthlyRate: 'Tasso Mensile',
    annualEntitlement: 'Diritto Annuale',
    carryForward: 'Riportato',
    entitlement: 'Diritto',
    accrued: 'Accantonato',
    used: 'Utilizzato',
    pending: 'In Sospeso',
    remaining: 'Rimanente',
    available: 'Disponibile',
    status: 'Stato',
    actions: 'Azioni',
    startDate: 'Data Inizio',
    endDate: 'Data Fine',
    totalDays: 'Giorni Totali',
    leaveType: 'Tipo Ferie',
    requestedBy: 'Richiesto da',
    approvedBy: 'Approvato da',
    approvalDate: 'Data Approvazione',
    reason: 'Motivo',
    notes: 'Note',
  },

  search: {
    placeholder: 'Cerca...',
    searchByStaffId: 'Cerca per ID Dipendente',
    searchByName: 'Cerca per Nome',
    searchByPosition: 'Cerca per Posizione',
    searchByDepartment: 'Cerca per Dipartimento',
    year: 'Anno',
    selectYear: 'Seleziona Anno',
    fromDate: 'Da Data',
    toDate: 'A Data',
    leaveTypeFilter: 'Tipo Ferie',
    statusFilter: 'Stato',
    departmentFilter: 'Dipartimento',
    noResults: 'Nessun risultato trovato',
    noEmployeesFound: 'Nessun dipendente trovato',
  },

  form: {
    required: 'Obbligatorio',
    optional: 'Opzionale',
    enterReason: 'Inserisci motivo...',
    enterJustification: 'Inserisci giustificazione...',
    leaveRequest: 'Richiesta di congedo',
    selectLeaveType: 'Seleziona tipo ferie',
    selectDepartment: 'Seleziona dipartimento',
    selectStatus: 'Seleziona stato',
    selectYear: 'Seleziona anno',
    uploadFile: 'Carica file',
    fileUploaded: 'File caricato',
    fileSize: 'Dimensione file',
    maxFileSize: 'Dimensione massima file: 5MB',
    supportedFormats: 'Formati supportati: PDF, DOC, DOCX, JPG, PNG',
  },

  messages: {
    loading: 'Caricamento...',
    saving: 'Salvataggio...',
    saved: 'Salvato con successo',
    leaveRequestSubmitted: 'Richiesta di congedo inviata',
    failedToSave: 'Salvataggio non riuscito',
    error: 'Errore',
    success: 'Successo',
    warning: 'Avviso',
    info: 'Informazione',
    confirmDelete: 'Sei sicuro di voler eliminare questo?',
    deleteSuccess: 'Eliminato con successo',
    deleteError: 'Errore durante l\'eliminazione',
    updateSuccess: 'Aggiornato con successo',
    updateError: 'Errore durante l\'aggiornamento',
    createSuccess: 'Creato con successo',
    createError: 'Errore durante la creazione',
    noData: 'Nessun dato disponibile',
    noDataAvailable: 'Nessun dato disponibile',
    loadingData: 'Caricamento dati...',
    fetchError: 'Errore nel recupero dei dati',
    networkError: 'Errore di rete',
    sessionExpired: 'Sessione scaduta',
    unauthorized: 'Non autorizzato',
    forbidden: 'Vietato',
    notFound: 'Non trovato',
  },

  units: {
    days: 'giorni',
    day: 'giorno',
    hours: 'ore',
    hour: 'ora',
    months: 'mesi',
    month: 'mese',
    years: 'anni',
    year: 'anno',
  },

  annualLeaveView: {
    title: 'Ferie Annuali Dipendenti',
    subtitle: 'Gestisci diritti ferie annuali dipendenti',
    description: 'Visualizza e gestisci diritti ferie annuali per tutti i dipendenti attivi',
    employeesList: 'Elenco Dipendenti',
    statisticsCard: 'Statistiche',
    totalActiveStaff: 'Personale Attivo Totale',
    avgAccrualRate: 'Tasso Accantonamento Medio',
    totalEntitlements: 'Diritti Totali',
    expiredContracts: 'Contratti Scaduti',
    editEntitlement: 'Modifica Diritto',
    editEntitlementModal: 'Modifica Ferie Annuali Dipendente',
    updateSuccess: 'Diritto ferie annuale aggiornato con successo',
    updateError: 'Errore nell\'aggiornamento del diritto ferie annuale',
    deleteConfirm: 'Sei sicuro di voler eliminare questo record?',
    deleteSuccess: 'Record eliminato con successo',
    deleteError: 'Errore durante l\'eliminazione del record',
    exportData: 'Esporta Dati',
    exportSuccess: 'Dati esportati con successo',
    exportError: 'Errore nell\'esportazione dei dati',
    importData: 'Importa Dati',
    importSuccess: 'Dati importati con successo',
    importError: 'Errore nell\'importazione dei dati',
  },

  leaveBalanceView: {
    title: 'Saldi Ferie Personale',
    subtitle: 'Diritti ferie annuali e saldi per tutto il personale attivo',
    description: 'Visualizza saldi ferie e informazioni accantonamento',
    staffLeaveBalances: 'Saldi Ferie Personale',
    annualLeaveEntitlements: 'Diritti Ferie Annuali',
    balancesForAllActiveStaff: 'Saldi per tutto il personale attivo',
    searchPlaceholder: 'Cerca per ID Dipendente, Nome, Posizione, Dipartimento...',
    yearSelector: 'Anno',
    selectYear: 'Seleziona Anno',
    noActiveStaffFound: 'Nessun personale attivo trovato',
    colorCodedBalance: 'Indicatore saldo codificato per colore',
    redIndicatesNegative: 'Rosso indica saldo negativo',
    orangeIndicatesLow: 'Arancione indica saldo basso (< 3 giorni)',
    greenIndicatesHealthy: 'Verde indica saldo sano',
  },

  leaveRequestForm: {
    title: 'Richiesta Ferie',
    editTitle: 'Modifica Richiesta Ferie',
    newRequestTitle: 'Nuova Richiesta Ferie',
    employeeInformation: 'Informazioni Dipendente',
    leaveBalance: 'Saldo Ferie',
    leaveDetails: 'Dettagli Ferie',
    selectEmployee: 'Seleziona Dipendente',
    selectEmployeeFromList: 'Seleziona dipendente dall\'elenco',
    employeeSelected: 'Dipendente selezionato',
    changeEmployee: 'Cambia Dipendente',
    startDateRequired: 'Data inizio obbligatoria',
    endDateRequired: 'Data fine obbligatoria',
    startDateAfterEnd: 'La data inizio deve essere prima della data fine',
    insufficientBalance: 'Saldo ferie insufficiente',
    insufficientBalanceWarning: 'Non hai un saldo ferie sufficiente per questa richiesta',
    requestWillBeSubmitted: 'Questa richiesta sarà inviata per approvazione',
    requestWillBeSavedAsDraft: 'Questa richiesta sarà salvata come bozza',
    confirmSubmit: 'Conferma Invio',
    confirmSaveDraft: 'Conferma Salva come Bozza',
  },

  employeesAnnualLeaveView: {
    title: 'Ferie Annuali Dipendenti',
    subtitle: 'Gestisci diritti ferie annuali dipendenti',
    description: 'Visualizza e gestisci diritti ferie annuali per tutti i dipendenti attivi',
    employeesAnnualLeaves: 'Ferie Annuali Dipendenti',
    manageEmployeeLeaveEntitlements: 'Gestisci diritti ferie dipendenti e calcoli',
    employeeList: 'Elenco Dipendenti',
    editEmployee: 'Modifica Dipendente',
    editEmployeeLeaveEntitlement: 'Modifica Diritto Ferie Annuale Dipendente',
    viewEmployeeBalance: 'Visualizza Saldo Dipendente',
    viewLeaveHistory: 'Visualizza Cronologia Ferie',
    leaveHistory: 'Cronologia Ferie',
    noLeaveHistory: 'Nessuna cronologia ferie disponibile',
    editModal: {
      title: 'Modifica Diritto Ferie Annuale',
      annualEntitlement: 'Diritto Annuale (giorni)',
      monthlyAccrualRate: 'Tasso Accantonamento Mensile (giorni/mese)',
      carryForwardDays: 'Giorni Riportati',
      notes: 'Note',
      save: 'Salva Modifiche',
      cancel: 'Annulla',
    },
  },

  validation: {
    fieldRequired: 'Questo campo è obbligatorio',
    invalidEmail: 'Indirizzo email non valido',
    invalidDate: 'Data non valida',
    invalidDateRange: 'Intervallo date non valido',
    invalidNumber: 'Numero non valido',
    minimumLength: 'La lunghezza minima è {min} caratteri',
    maximumLength: 'La lunghezza massima è {max} caratteri',
    passwordMismatch: 'Le password non corrispondono',
    fileTooBig: 'Il file è troppo grande',
    invalidFileType: 'Tipo di file non valido',
    startDateBeforeEnd: 'La data inizio deve essere prima della data fine',
    endDateAfterStart: 'La data fine deve essere dopo la data inizio',
    dateInPast: 'La data non può essere nel passato',
    dateInFuture: 'La data non può essere nel futuro',
    pdfOnly: 'Solo PDF',
    fileTooLarge: 'File troppo grande',
  },

  dateTime: {
    today: 'Oggi',
    yesterday: 'Ieri',
    tomorrow: 'Domani',
    thisWeek: 'Questa Settimana',
    thisMonth: 'Questo Mese',
    thisYear: 'Questo Anno',
    lastWeek: 'Settimana Scorsa',
    lastMonth: 'Mese Scorso',
    lastYear: 'Anno Scorso',
    january: 'Gennaio',
    february: 'Febbraio',
    march: 'Marzo',
    april: 'Aprile',
    may: 'Maggio',
    june: 'Giugno',
    july: 'Luglio',
    august: 'Agosto',
    september: 'Settembre',
    october: 'Ottobre',
    november: 'Novembre',
    december: 'Dicembre',
    from: 'da',
    to: 'A',
    after: 'Dopo',
  },

  emptyStates: {
    noData: 'Nessun dato disponibile',
    noEmployees: 'Nessun dipendente trovato',
    noRequests: 'Nessuna richiesta trovata',
    noBalance: 'Nessuna informazione saldo disponibile',
    noHistory: 'Nessuna cronologia disponibile',
    startByCreating: 'Inizia creando una nuova voce',
    tryAdjustingFilters: 'Prova ad aggiustare i tuoi filtri',
    checkBackLater: 'Controlla più tardi',
  },

  help: {
    annualEntitlementHelp: 'Giorni ferie annuali totali a cui il dipendente ha diritto (predefinito: 30 giorni)',
    monthlyAccrualRateHelp: 'Giorni ferie accantonati al mese (predefinito: 2,5 giorni/mese)',
    carryForwardHelp: 'Giorni ferie riportati dall\'anno precedente',
    leaveBalanceHelp: 'Riepilogo saldo ferie corrente',
    accruedHelp: 'Giorni ferie accantonati a oggi (minimo tra accantonamento mensile e diritto annuale)',
    usedHelp: 'Giorni ferie già utilizzati (richieste approvate)',
    pendingHelp: 'Giorni ferie in attesa di approvazione',
    availableHelp: 'Giorni ferie disponibili per l\'uso (rimanente - in sospeso)',
  },
};

// ============================================================================
// EXPORT TRANSLATIONS BY LANGUAGE
// ============================================================================
export const hrAnnualLeaveTranslations: Record<SupportedLanguage, HRAnnualLeaveTranslations> = {
  en: hrAnnualLeaveTranslationsEN,
  ar: hrAnnualLeaveTranslationsAR,
  it: hrAnnualLeaveTranslationsIT,
};

/**
 * Hook to use translations in components
 * Usage: const t = useHRAnnualLeaveTranslations();
 */
export function useHRAnnualLeaveTranslations(language: SupportedLanguage = 'en'): HRAnnualLeaveTranslations {
  return hrAnnualLeaveTranslations[language];
}
