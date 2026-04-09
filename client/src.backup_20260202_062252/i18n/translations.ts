// ============================================================================
// COMPREHENSIVE BILINGUAL TRANSLATION SYSTEM
// Centralized EN/AR translations - NO HARDCODED STRINGS ALLOWED
// ============================================================================

export interface Translations {
  // ========== COMMON ==========
  common: {
    loading: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    add: string;
    create: string;
    update: string;
    search: string;
    filter: string;
    export: string;
    import: string;
    download: string;
    upload: string;
    submit: string;
    confirm: string;
    close: string;
    back: string;
    next: string;
    previous: string;
    yes: string;
    no: string;
    all: string;
    none: string;
    select: string;
    selected: string;
    clear: string;
    reset: string;
    apply: string;
    view: string;
    actions: string;
    status: string;
    date: string;
    name: string;
    description: string;
    type: string;
    total: string;
    success: string;
    error: string;
    warning: string;
    info: string;
    required: string;
    optional: string;
    active: string;
    inactive: string;
    enabled: string;
    disabled: string;
    showMore: string;
    showLess: string;
    noData: string;
    noResults: string;
    searchPlaceholder: string;
    loadingData: string;
    savingChanges: string;
    savedSuccessfully: string;
    errorOccurred: string;
    tryAgain: string;
    refresh: string;
    print: string;
    share: string;
    copy: string;
    paste: string;
    duplicate: string;
    archive: string;
    restore: string;
    manage: string;
    settings: string;
    help: string;
    logout: string;
    profile: string;
    today: string;
    yesterday: string;
    thisWeek: string;
    thisMonth: string;
    thisYear: string;
    customRange: string;
    from: string;
    to: string;
    between: string;
    equals: string;
    contains: string;
    startsWith: string;
    endsWith: string;
  };

  // ========== NAVIGATION ==========
  navigation: {
    dashboard: string;
    organizations: string;
    grants: string;
    projects: string;
    finance: string;
    meal: string;
    surveys: string;
    cases: string;
    documents: string;
    importHistory: string;
    deletedRecords: string;
    settings: string;
    reporting: string;
    proposals: string;
  };

  // ========== HEADER ==========
  header: {
    switchOrganization: string;
    currentOrganization: string;
    switchLanguage: string;
    languageEn: string;
    languageAr: string;
    userMenu: string;
    viewProfile: string;
    accountSettings: string;
    logoutConfirm: string;
    notifications: string;
    noNotifications: string;
    markAllRead: string;
    projectsManagement: string;
    ltr: string;
    rtl: string;
  };

  // ========== SIDEBAR ==========
  sidebar: {
    collapseSidebar: string;
    expandSidebar: string;
    mainMenu: string;
    administration: string;
  };

  // ========== PLATFORM ADMIN ==========
  platform: {
    dashboard: {
      title: string;
      subtitle: string;
      accessRestrictionTitle: string;
      accessRestrictionDesc: string;
      totalOrganizations: string;
      totalUsers: string;
      platformUsers: string;
      orgUsers: string;
      microsoft365: string;
      ready: string;
      entraReady: string;
      systemHealth: string;
      healthy: string;
      allSystemsOperational: string;
      quickActions: string;
      viewAllOrganizations: string;
      viewAllOrganizationsDesc: string;
      manageIntegrations: string;
      manageIntegrationsDesc: string;
      viewAuditLogs: string;
      viewAuditLogsDesc: string;
      platformActivity: string;
      platformActivityDesc: string;
      activityChartComingSoon: string;
      phase1Analytics: string;
      organizations: string;
      organizationsDesc: string;
      orgName: string;
      orgCode: string;
      orgStatus: string;
      orgProjects: string;
      orgUsers: string;
      orgActions: string;
      viewOrg: string;
      noOrganizations: string;
    };
    organizationManagement: string;
    platformSettings: string;
    sidebarTitle: string;
    sidebarSubtitle: string;
  };

  // ========== ORGANIZATION DASHBOARD ==========
  organization: {
    dashboard: {
      operatingUnitContext: string;
      compliance: string;
      activeGrants: string;
      activeProjects: string;
      acrossAllPrograms: string;
      totalEmployees: string;
      fullTimeStaff: string;
      totalBudget: string;
      allocatedFunds: string;
      grantExecution: string;
      onTrack: string;
      complianceAlerts: string;
      complianceAlertsDesc: string;
      highPriority: string;
      mediumPriority: string;
      daysAgo: string;
      reportOverdue: string;
      reportOverdueDesc: string;
      budgetReview: string;
      budgetReviewDesc: string;
      projectPipeline: string;
      projectPipelineDesc: string;
      waterSanitation: string;
      waterSanitationDesc: string;
      progress: string;
      budget: string;
      endDate: string;
      educationSupport: string;
      educationSupportDesc: string;
      inProgress: string;
    };
  };

  // ========== DASHBOARD ==========
  dashboard: {
    title: string;
    subtitle: string;
    welcome: string;
    overview: string;
    quickStats: string;
    recentActivity: string;
    upcomingTasks: string;
    alerts: string;
    totalProjects: string;
    activeProjects: string;
    completedProjects: string;
    onHoldProjects: string;
    totalBudget: string;
    spentBudget: string;
    remainingBudget: string;
    budgetUtilization: string;
    totalBeneficiaries: string;
    directBeneficiaries: string;
    indirectBeneficiaries: string;
    reportsOverdue: string;
    reportsDueThisWeek: string;
    reportsSubmitted: string;
    projectsByStatus: string;
    projectsByDonor: string;
    budgetByProject: string;
    beneficiariesByProject: string;
    viewAllProjects: string;
    viewAllReports: string;
    noActiveProjects: string;
    noRecentActivity: string;
    lastUpdated: string;
    refreshDashboard: string;
  };

  // ========== PROJECTS ==========
  projects: {
    title: string;
    subtitle: string;
    createNew: string;
    editProject: string;
    deleteProject: string;
    deleteConfirm: string;
    projectDetails: string;
    projectInfo: string;
    projectCode: string;
    projectName: string;
    projectDescription: string;
    startDate: string;
    endDate: string;
    duration: string;
    donor: string;
    grantId: string;
    budget: string;
    totalBudget: string;
    spentAmount: string;
    remainingAmount: string;
    status: string;
    statusActive: string;
    statusCompleted: string;
    statusOnHold: string;
    statusPlanning: string;
    statusClosed: string;
    priority: string;
    priorityHigh: string;
    priorityMedium: string;
    priorityLow: string;
    manager: string;
    team: string;
    location: string;
    locations: string;
    sector: string;
    sectors: string;
    beneficiaries: string;
    directBeneficiaries: string;
    indirectBeneficiaries: string;
    beneficiaryTypes: string;
    objectives: string;
    activities: string;
    milestones: string;
    deliverables: string;
    risks: string;
    documents: string;
    reporting: string;
    financials: string;
    progress: string;
    progressPercent: string;
    timeline: string;
    created: string;
    createdBy: string;
    modified: string;
    modifiedBy: string;
    noProjects: string;
    noProjectsDesc: string;
    createFirstProject: string;
    searchProjects: string;
    filterByStatus: string;
    filterByDonor: string;
    filterByDate: string;
    sortBy: string;
    sortByName: string;
    sortByDate: string;
    sortByBudget: string;
    sortAZ: string;
    sortZA: string;
    sortNewestFirst: string;
    sortOldestFirst: string;
    exportList: string;
    importProjects: string;
    bulkActions: string;
    selectedProjects: string;
    // Project Dashboard Specific
    dashboardTitle: string;
    dashboardSubtitle: string;
    grantManagement: string;
    grantManagementDesc: string;
    reportingSchedule: string;
    reportingScheduleDesc: string;
    proposalPipeline: string;
    proposalPipelineDesc: string;
    activePrograms: string;
    activeProgramsDesc: string;
    active: string;
    opportunities: string;
    totalBudgetUSD: string;
    actualSpentUSD: string;
    balanceUSD: string;
    avgCompletionRate: string;
    ongoingProjectsOnly: string;
    allOngoingProjects: string;
    fromFinanceOverview: string;
    budgetMinusSpent: string;
    projectList: string;
    exportToExcel: string;
    exportTemplate: string;
    importExcel: string;
    addNewProject: string;
    searchByTitle: string;
    viewDetails: string;
    updateProject: string;
    notAvailable: string;
    budgetUtilization: string;
    currency: string;
    spent: string;
    balance: string;
    all: string;
    statusOngoing: string;
    statusPlanned: string;
    statusNotStarted: string;
    statusSuspended: string;
    submitted: string;
    approved: string;
    upcoming: string;
    tabs: {
      overview: string;
      team: string;
      budget: string;
      beneficiaries: string;
      locations: string;
      activities: string;
      reporting: string;
      documents: string;
      timeline: string;
      settings: string;
    };
  };

  // ========== PROJECT DETAIL ==========
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
    tabProjectIndicators: string;
    tabBeneficiaries: string;
    tabFinancialOverview: string;
    tabForecastPlan: string;
    tabProcurementPlan: string;
    tabCaseManagement: string;
    tabProjectReport: string;
    tabProjectPlan: string;
    // Procurement Plan
    procurementPlanTitle: string;
    procurementPlanSubtitle: string;
    procurementPlanPeriod: string;
    itemDescription: string;
    procurementCategory: string;
    quantityLabel: string;
    unitOfMeasure: string;
    estimatedUnitCost: string;
    estimatedTotalCost: string;
    procurementMethod: string;
    procurementType: string;
    plannedStartDate: string;
    plannedEndDate: string;
    responsibleDepartment: string;
    addProcurementItem: string;
    editProcurementItem: string;
    noProcurementItemsFound: string;
    searchProcurementItems: string;
    totalProcurementItems: string;
    totalEstimatedCost: string;
    remainingBudget: string;
    budgetExceededWarning: string;
    // Procurement Categories
    categoryGoods: string;
    categoryServices: string;
    categoryWorks: string;
    // Procurement Methods
    methodDirectProcurement: string;
    methodRFQ: string;
    methodNationalBidding: string;
    methodInternationalBidding: string;
    methodLTA: string;
    methodEmergency: string;
    methodOneQuotation: string;
    methodThreeQuotation: string;
    methodNegotiable: string;
    methodTender: string;
    categoryConsultancy: string;
    activityName: string;
    noProcurementItems: string;
    // Procurement Types
    typeOneTime: string;
    typeFramework: string;
    typeRecurrent: string;
    // Procurement Status
    statusPlanned: string;
    statusSubmitted: string;
    statusApproved: string;
    statusInProgress: string;
    statusCompleted: string;
    statusCancelled: string;
    // Departments
    deptProgram: string;
    deptLogistics: string;
    deptProcurement: string;
    deptFinance: string;
    deptMEAL: string;
    deptOther: string;
    overviewStatActivities: string;
    overviewStatIndicators: string;
    overviewStatBeneficiaries: string;
    overviewStatBudgetUtilization: string;
    overviewBudgetSubtitle: string;
    overviewKeyActivities: string;
    overviewProjectTimeline: string;
    overviewTimelineVisualization: string;
    noActivitiesYet: string;
    noDescriptionProvided: string;
    activitiesPageTitle: string;
    activitiesPageSubtitle: string;
    activityCode: string;
    activityTitle: string;
    activityDescription: string;
    activityStatus: string;
    activityStartDate: string;
    activityEndDate: string;
    activityDuration: string;
    activityBudget: string;
    activitySpent: string;
    activityCompletion: string;
    activityProgress: string;
    activityResponsible: string;
    activityLocation: string;
    activityStatusNotStarted: string;
    activityStatusInProgress: string;
    activityStatusCompleted: string;
    activityStatusOnHold: string;
    activityStatusCancelled: string;
    addActivity: string;
    editActivity: string;
    deleteActivity: string;
    viewActivity: string;
    addNewActivity: string;
    exportActivities: string;
    exportActivitiesTemplate: string;
    importActivities: string;
    timelineView: string;
    tableView: string;
    totalActivities: string;
    inProgress: string;
    completed: string;
    totalBudget: string;
    searchActivities: string;
    noActivitiesFound: string;
    activityCodeRequired: string;
    activityTitleRequired: string;
    confirmDeleteActivity: string;
    activityCreatedSuccess: string;
    activityUpdatedSuccess: string;
    activityDeletedSuccess: string;
    importActivitiesTitle: string;
    importActivitiesDesc: string;
    fillRequiredFields: string;
    successfullyImported: string;
    code: string;
    title: string;
    responsible: string;
    actions: string;
    tasksPageTitle: string;
    tasksPageSubtitle: string;
    taskCode: string;
    taskTitle: string;
    taskDescription: string;
    taskStatus: string;
    taskPriority: string;
    taskHours: string;
    taskAssignedTo: string;
    taskDueDate: string;
    taskEstimatedHours: string;
    taskActualHours: string;
    taskStatusToDo: string;
    taskStatusInProgress: string;
    taskStatusReview: string;
    taskStatusCompleted: string;
    statusToDo: string;
    statusInProgress: string;
    statusReview: string;
    statusCompleted: string;
    taskPriorityLow: string;
    taskPriorityMedium: string;
    taskPriorityHigh: string;
    taskPriorityUrgent: string;
    priorityLow: string;
    priorityMedium: string;
    priorityHigh: string;
    priorityUrgent: string;
    addTask: string;
    editTask: string;
    addNewTask: string;
    kanbanView: string;
    totalTasks: string;
    totalHoursEst: string;
    searchTasks: string;
    noTasksFound: string;
    noTasks: string;
    taskCodeRequired: string;
    taskTitleRequired: string;
    taskDueDateRequired: string;
    taskCreatedSuccess: string;
    taskUpdatedSuccess: string;
    taskDeletedSuccess: string;
    importTasksTitle: string;
    importTasksDescription: string;
    createTask: string;
    updateTask: string;
    deleteTaskConfirm: string;
    tasksImportedSuccess: string;
    importErrors: string;
    row: string;
    noTasksFoundClickAdd: string;
    totalEstHours: string;
    taskEstHours: string;
    taskActualHours: string;
    hours: string;
    indicatorsPageTitle: string;
    indicatorsPageSubtitle: string;
    indicatorCode: string;
    indicatorTitle: string;
    indicatorType: string;
    indicatorUnit: string;
    indicatorBaseline: string;
    indicatorTarget: string;
    indicatorAchieved: string;
    indicatorTypeOutput: string;
    indicatorTypeOutcome: string;
    indicatorTypeImpact: string;
    addIndicator: string;
    totalIndicators: string;
    searchIndicators: string;
    noIndicatorsFound: string;
    beneficiariesPageTitle: string;
    beneficiariesPageSubtitle: string;
    beneficiaryId: string;
    fullName: string;
    gender: string;
    genderMale: string;
    genderFemale: string;
    genderOther: string;
    genderPreferNotToSay: string;
    ageGroup: string;
    ageGroup05: string;
    ageGroup617: string;
    ageGroup1859: string;
    ageGroup60Plus: string;
    beneficiaryType: string;
    beneficiaryTypeDirect: string;
    beneficiaryTypeIndirect: string;
    beneficiaryFullName: string;
    vulnerability: string;
    district: string;
    governorate: string;
    registrationDate: string;
    phone: string;
    age: string;
    registerBeneficiary: string;
    allGenders: string;
    allAgeGroups: string;
    allTypes: string;
    genderDisaggregation: string;
    ageDisaggregation: string;
    children: string;
    adults: string;
    elderly: string;
    locations: string;
    uniqueLocations: string;
    activity: string;
    noBeneficiariesFound: string;
    addBeneficiary: string;
    totalBeneficiaries: string;
    searchBeneficiaries: string;
    financialPageTitle: string;
    financialPageSubtitle: string;
    budgetCode: string;
    budgetItem: string;
    subItem: string;
    approvedBudget: string;
    totalApprovedBudget: string;
    actualSpent: string;
    spent: string;
    committed: string;
    committedFunds: string;
    balance: string;
    remainingBalance: string;
    variance: string;
    burnRate: string;
    burnRateOnTrack: string;
    burnRateMonitor: string;
    burnRateCritical: string;
    budgetLines: string;
    budgetLinesSubtitle: string;
    addBudgetLine: string;
    noBudgetLines: string;
    addBudgetLinePrompt: string;
    budgetTemplate: string;
    importBudgetLines: string;
    deleteBudgetLineConfirm: string;
    approved: string;
  };

  // ========== FINANCE ==========
  finance: {
    title: string;
    subtitle: string;
    chartOfAccounts: string;
    budgets: string;
    expenditures: string;
    transactions: string;
    reports: string;
    accountCode: string;
    accountName: string;
    accountType: string;
    accountTypeAsset: string;
    accountTypeLiability: string;
    accountTypeEquity: string;
    accountTypeRevenue: string;
    accountTypeExpense: string;
    parentAccount: string;
    balance: string;
    debit: string;
    credit: string;
    budgetLine: string;
    budgetedAmount: string;
    actualAmount: string;
    variance: string;
    variancePercent: string;
    expenditureDate: string;
    expenditureAmount: string;
    expenditureType: string;
    paymentMethod: string;
    paymentMethodCash: string;
    paymentMethodBank: string;
    paymentMethodCheck: string;
    paymentMethodMobile: string;
    vendor: string;
    invoice: string;
    receipt: string;
    approvedBy: string;
    approvalDate: string;
    reconciliationStatus: string;
    reconciledStatusPending: string;
    reconciledStatusReconciled: string;
    reconciledStatusDisputed: string;
    noFinancialData: string;
  };

  // ========== FORMS ==========
  forms: {
    requiredField: string;
    invalidEmail: string;
    invalidPhone: string;
    invalidUrl: string;
    invalidDate: string;
    invalidNumber: string;
    minLength: string;
    maxLength: string;
    minValue: string;
    maxValue: string;
    mustBePositive: string;
    mustBeUnique: string;
    passwordMismatch: string;
    selectOption: string;
    selectMultiple: string;
    enterValue: string;
    chooseFile: string;
    uploadFile: string;
    fileSelected: string;
    filesSelected: string;
    maxFileSize: string;
    allowedFileTypes: string;
    dragDropFile: string;
    browseFiles: string;
    removeFile: string;
  };

  // ========== TABLES ==========
  tables: {
    columns: string;
    rows: string;
    rowsPerPage: string;
    page: string;
    of: string;
    showing: string;
    noDataAvailable: string;
    noMatchingRecords: string;
    loadingRecords: string;
    selectAll: string;
    deselectAll: string;
    selectedCount: string;
    sortAscending: string;
    sortDescending: string;
    filterColumn: string;
    hideColumn: string;
    showColumn: string;
    exportTable: string;
    exportCSV: string;
    exportExcel: string;
    exportPDF: string;
    printTable: string;
    refreshTable: string;
  };

  // ========== CASE MANAGEMENT ==========
  caseManagement: {
    // Sub-Navigation
    dashboard: string;
    casesList: string;
    caseProfile: string;
    pssSessions: string;
    activities: string;
    safeSpace: string;
    referrals: string;
    reports: string;
    
    // Dashboard KPIs
    totalActiveCases: string;
    newCasesThisMonth: string;
    closedCases: string;
    highRiskCases: string;
    pendingReferrals: string;
    followUpsDue: string;
    
    // Dashboard & List Headers
    caseManagementDashboard: string;
    project: string;
    donor: string;
    role: string;
    recentCases: string;
    
    // Filters
    allGender: string;
    male: string;
    female: string;
    allRiskLevels: string;
    riskHigh: string;
    riskMedium: string;
    riskLow: string;
    allStatus: string;
    statusOpen: string;
    statusOngoing: string;
    statusClosed: string;
    allCaseTypes: string;
    typePSS: string;
    typeCP: string;
    typeGBV: string;
    typeProtection: string;
    
    // Table Headers
    caseId: string;
    beneficiaryCode: string;
    gender: string;
    age: string;
    riskLevel: string;
    caseType: string;
    status: string;
    actions: string;
    view: string;
    
    // Case List
    addNewCase: string;
    searchCases: string;
    exportCases: string;
    exportTemplate: string;
    importCases: string;
    noCasesMatch: string;
    
    // Case Form Fields
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    nationality: string;
    idNumber: string;
    phoneNumber: string;
    email: string;
    address: string;
    referralSource: string;
    intakeDate: string;
    assignedTo: string;
    notes: string;
    
    // Case Profile Sections
    backToCasesList: string;
    caseIdLabel: string;
    beneficiaryInformation: string;
    caseDetails: string;
    casePlan: string;
    disability: string;
    location: string;
    district: string;
    householdSize: string;
    vulnerabilityCategory: string;
    caseOpeningDate: string;
    informedConsent: string;
    identifiedNeeds: string;
    riskFactors: string;
    immediateConcerns: string;
    plannedInterventions: string;
    expectedOutcomes: string;
    timeline: string;
    yes: string;
    no: string;
    notAvailable: string;
    
    // PSS Sessions
    pssSessionsTitle: string;
    pssSessionsDescription: string;
    addSession: string;
    exportSessions: string;
    exportSessionsTemplate: string;
    importSessions: string;
    totalSessions: string;
    individualSessions: string;
    groupSessions: string;
    avgSessionDuration: string;
    sessionDate: string;
    sessionType: string;
    sessionDuration: string;
    pssApproach: string;
    topicsDiscussed: string;
    followUpDate: string;
    facilitator: string;
    participantsCount: string;
    typeIndividual: string;
    typeGroup: string;
    editSession: string;
    deleteSession: string;
    noSessionsFound: string;
    addNewSession: string;
    updateSession: string;
    confirmDeleteSession: string;
    sessionDeleteMessage: string;
    fillRequiredFields: string;
    sessionAddedSuccess: string;
    sessionUpdatedSuccess: string;
    sessionDeletedSuccess: string;
    minutes: string;
    
    // Activities & Services
    activitiesTitle: string;
    activitiesDescription: string;
    addActivity: string;
    exportActivities: string;
    exportActivitiesTemplate: string;
    importActivities: string;
    totalActivities: string;
    activitiesCompleted: string;
    beneficiariesServed: string;
    activitiesThisMonth: string;
    activityDate: string;
    activityType: string;
    serviceProvided: string;
    duration: string;
    outcome: string;
    editActivity: string;
    deleteActivity: string;
    noActivitiesFound: string;
    addNewActivity: string;
    updateActivity: string;
    confirmDeleteActivity: string;
    activityDeleteMessage: string;
    activityAddedSuccess: string;
    activityUpdatedSuccess: string;
    activityDeletedSuccess: string;
    
    // Child Safe Space
    childSafeSpaceTitle: string;
    childSafeSpaceDescription: string;
    addCSSSession: string;
    exportCSSSessions: string;
    exportCSSTemplate: string;
    importCSSSessions: string;
    totalCSSSessions: string;
    childrenAttended: string;
    avgAttendance: string;
    activitiesHeld: string;
    activityTheme: string;
    attendanceCount: string;
    ageGroup: string;
    safeguardingIncidents: string;
    editCSSSession: string;
    deleteCSSSession: string;
    noCSSSessionsFound: string;
    addNewCSSSession: string;
    updateCSSSession: string;
    confirmDeleteCSSSession: string;
    cssSessionDeleteMessage: string;
    cssSessionAddedSuccess: string;
    cssSessionUpdatedSuccess: string;
    cssSessionDeletedSuccess: string;
    
    // Referrals
    referralsTitle: string;
    referralsDescription: string;
    addReferral: string;
    exportReferrals: string;
    exportReferralsTemplate: string;
    importReferrals: string;
    totalReferrals: string;
    pendingReferralsCount: string;
    completedReferrals: string;
    referralsThisMonth: string;
    referralDate: string;
    referredTo: string;
    serviceType: string;
    priority: string;
    referralStatus: string;
    completionDate: string;
    feedback: string;
    priorityHigh: string;
    priorityMedium: string;
    priorityLow: string;
    statusPending: string;
    statusInProgress: string;
    statusCompleted: string;
    editReferral: string;
    deleteReferral: string;
    noReferralsFound: string;
    addNewReferral: string;
    updateReferral: string;
    confirmDeleteReferral: string;
    referralDeleteMessage: string;
    referralAddedSuccess: string;
    referralUpdatedSuccess: string;
    referralDeletedSuccess: string;
    
    // Reports & Analytics
    reportsTitle: string;
    reportsDescription: string;
    generateReport: string;
    exportReport: string;
    reportType: string;
    dateRange: string;
    caseManagementSummary: string;
    caseLoad: string;
    demographics: string;
    services: string;
    outcomes: string;
    totalCasesManaged: string;
    newIntakes: string;
    closedSuccessfully: string;
    averageCaseDuration: string;
    byGender: string;
    byAgeGroup: string;
    byRiskLevel: string;
    byType: string;
    pssSessionsProvided: string;
    activitiesCompletedCount: string;
    referralsMade: string;
    followUpsCompleted: string;
    successfulCaseClosure: string;
    averageSatisfactionScore: string;
    beneficiariesReachedTarget: string;
    servicesDeliveredOnTime: string;
    exportPDF: string;
    days: string;
  };

  // ========== ORGANIZATIONS ==========
  organizations: {
    title: string;
    subtitle: string;
    createOrganization: string;
    editOrganization: string;
    deleteOrganization: string;
    organizationName: string;
    organizationType: string;
    typeNGO: string;
    typeINGO: string;
    typeUN: string;
    typeGovernment: string;
    typeCommunity: string;
    country: string;
    region: string;
    city: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    registrationNumber: string;
    taxId: string;
    activeUsers: string;
    totalProjects: string;
    established: string;
    noOrganizations: string;
    switchOrganization: string;
  };

  // ========== USERS & PERMISSIONS ==========
  users: {
    title: string;
    subtitle: string;
    createUser: string;
    editUser: string;
    deleteUser: string;
    userName: string;
    userEmail: string;
    userRole: string;
    roleSystemAdmin: string;
    roleOrgAdmin: string;
    roleProjectManager: string;
    roleFinanceOfficer: string;
    roleMEALOfficer: string;
    roleFieldOfficer: string;
    roleViewer: string;
    permissions: string;
    permissionsView: string;
    permissionsCreate: string;
    permissionsEdit: string;
    permissionsDelete: string;
    permissionsManage: string;
    lastLogin: string;
    accountStatus: string;
    inviteUser: string;
    resendInvitation: string;
    deactivateUser: string;
    activateUser: string;
    resetPassword: string;
    changePassword: string;
    noUsers: string;
  };

  // ========== SETTINGS ==========
  settings: {
    title: string;
    subtitle: string;
    generalSettings: string;
    userManagement: string;
    rolesPermissions: string;
    optionSets: string;
    emailNotifications: string;
    logoBranding: string;
    publishSync: string;
    adminAccess: string;
    systemPreferences: string;
    languageRegion: string;
    dateTimeFormat: string;
    currency: string;
    timezone: string;
    fiscalYearStart: string;
    saveSettings: string;
    settingsSaved: string;
    settingsError: string;
  };

  // ========== IMPORT / EXPORT ==========
  importExport: {
    importData: string;
    exportData: string;
    importHistory: string;
    importStatus: string;
    statusPending: string;
    statusProcessing: string;
    statusCompleted: string;
    statusFailed: string;
    statusPartial: string;
    recordsImported: string;
    recordsFailed: string;
    recordsSkipped: string;
    totalRecords: string;
    validationErrors: string;
    duplicatesFound: string;
    importDate: string;
    importedBy: string;
    downloadTemplate: string;
    downloadErrors: string;
    selectFile: string;
    mapColumns: string;
    validateData: string;
    confirmImport: string;
    importInProgress: string;
    importCompleted: string;
    importFailed: string;
    viewDetails: string;
    duplicateHandling: string;
    duplicateSkip: string;
    duplicateUpdate: string;
    duplicateCreateNew: string;
  };

  // ========== REPORTS ==========
  reports: {
    title: string;
    subtitle: string;
    generateReport: string;
    scheduleReport: string;
    reportTemplate: string;
    reportType: string;
    reportPeriod: string;
    reportFormat: string;
    formatPDF: string;
    formatExcel: string;
    formatWord: string;
    donors: string;
    internalReports: string;
    customReports: string;
    reportDue: string;
    reportOverdue: string;
    reportSubmitted: string;
    reportApproved: string;
    reportRejected: string;
    submitReport: string;
    approveReport: string;
    rejectReport: string;
    reportComments: string;
    noReports: string;
    viewReport: string;
    editReport: string;
    deleteReport: string;
  };

  // ========== NOTIFICATIONS ==========
  notifications: {
    title: string;
    markAsRead: string;
    markAsUnread: string;
    deleteNotification: string;
    notificationSettings: string;
    emailNotifications: string;
    pushNotifications: string;
    smsNotifications: string;
    notifyProjectUpdates: string;
    notifyReportsDue: string;
    notifyBudgetAlerts: string;
    notifyApprovals: string;
    notifyMentions: string;
    noNewNotifications: string;
  };

  // ========== ERRORS & MESSAGES ==========
  messages: {
    success: {
      created: string;
      updated: string;
      deleted: string;
      saved: string;
      imported: string;
      exported: string;
      sent: string;
      approved: string;
      rejected: string;
      published: string;
      archived: string;
      restored: string;
    };
    error: {
      generic: string;
      notFound: string;
      unauthorized: string;
      forbidden: string;
      serverError: string;
      networkError: string;
      validationFailed: string;
      duplicateEntry: string;
      missingFields: string;
      invalidData: string;
      operationFailed: string;
      uploadFailed: string;
      downloadFailed: string;
    };
    confirm: {
      delete: string;
      deleteMultiple: string;
      archive: string;
      restore: string;
      submit: string;
      approve: string;
      reject: string;
      logout: string;
      cancelChanges: string;
      overwriteData: string;
    };
  };

  // ========== DELETED RECORDS ==========
  deletedRecords: {
    title: string;
    subtitle: string;
    deletedBy: string;
    deletedDate: string;
    deletionReason: string;
    restoreRecord: string;
    permanentlyDelete: string;
    restoreConfirm: string;
    permanentDeleteConfirm: string;
    noDeletedRecords: string;
    recordType: string;
    recordName: string;
    originalId: string;
  };

  // ========== MEAL MODULE ==========
  meal: {
    // General
    moduleTitle: string;
    moduleSubtitle: string;
    // Surveys
    surveys: string;
    surveyName: string;
    surveyType: string;
    surveyStatus: string;
    createSurvey: string;
    editSurvey: string;
    surveyCreated: string;
    surveyUpdated: string;
    surveyDeleted: string;
    // Indicators
    indicators: string;
    indicatorCode: string;
    indicatorName: string;
    indicatorType: string;
    indicatorCategory: string;
    indicatorSector: string;
    indicatorUnit: string;
    indicatorDataSource: string;
    indicatorBaseline: string;
    indicatorTarget: string;
    indicatorCurrent: string;
    indicatorStatus: string;
    createIndicator: string;
    editIndicator: string;
    addIndicator: string;
    indicatorCreated: string;
    indicatorUpdated: string;
    indicatorDeleted: string;
    // Data Entry
    dataEntry: string;
    period: string;
    value: string;
    disaggregation: string;
    notes: string;
    verified: string;
    verifiedBy: string;
    verifiedAt: string;
    // Common
    project: string;
    responsiblePerson: string;
    collectionFrequency: string;
    frequencyMonthly: string;
    frequencyQuarterly: string;
    frequencyAnnually: string;
    frequencyAdhoc: string;
    saveError: string;
    loadError: string;
    // Extended Indicator Fields
    basicInformation: string;
    classification: string;
    measurement: string;
    dataCollection: string;
    description: string;
    descriptionPlaceholder: string;
    indicatorNamePlaceholder: string;
    indicatorCodeRequired: string;
    indicatorNameRequired: string;
    categoryRequired: string;
    sectorRequired: string;
    targetRequired: string;
    responsiblePersonRequired: string;
    category: string;
    categoryPlaceholder: string;
    sector: string;
    selectSector: string;
    sectorProtection: string;
    sectorHealth: string;
    sectorEducation: string;
    sectorWASH: string;
    sectorNutrition: string;
    sectorLivelihoods: string;
    sectorMultiSector: string;
    unit: string;
    unitNumber: string;
    unitPercentage: string;
    unitRatio: string;
    unitIndex: string;
    baseline: string;
    target: string;
    dataSource: string;
    sourceManual: string;
    sourceSurvey: string;
    sourceAutomatic: string;
    sourceExternal: string;
    responsiblePersonPlaceholder: string;
    disaggregationDesc: string;
    disaggregationGender: string;
    disaggregationAge: string;
    disaggregationLocation: string;
    disaggregationDisability: string;
    status: string;
    statusActive: string;
    statusInactive: string;
    output: string;
    outcome: string;
    impact: string;
  };

  // ========== LOGIN & AUTH ==========
  auth: {
    login: string;
    logout: string;
    email: string;
    password: string;
    rememberMe: string;
    forgotPassword: string;
    resetPassword: string;
    welcomeBack: string;
    loginToContinue: string;
    invalidCredentials: string;
    accountLocked: string;
    sessionExpired: string;
    loginSuccess: string;
    logoutSuccess: string;
    enterEmail: string;
    enterPassword: string;
    passwordReset: string;
    checkEmail: string;
  };

  // ========== RISK MANAGEMENT ==========
  risk: {
    title: string;
    subtitle: string;
    dashboard: string;
    registry: string;
    incidents: string;
    reports: string;
    addRisk: string;
    editRisk: string;
    reportIncident: string;
    riskTitle: string;
    category: string;
    likelihood: string;
    impact: string;
    score: string;
    level: string;
    status: string;
    mitigationPlan: string;
    owner: string;
    incidentTitle: string;
    severity: string;
    location: string;
    actionsTaken: string;
  };

  // ========== PROPOSALS & PIPELINE ==========
  proposals: {
    // Page Titles
    title: string;
    subtitle: string;
    pipelineTab: string;
    proposalsTab: string;
    
    // Pipeline Management
    pipelineTitle: string;
    pipelineSubtitle: string;
    opportunityTitle: string;
    donorName: string;
    callReference: string;
    fundingAmount: string;
    budgetRange: string;
    probability: string;
    submissionDeadline: string;
    opportunityStatus: string;
    statusIdentified: string;
    statusUnderReview: string;
    statusMatchedToProposal: string;
    statusNotPursuing: string;
    stageIdentified: string;
    stageUnderReview: string;
    stageGoDecision: string;
    stageNoGo: string;
    stageConceptRequested: string;
    stageProposalRequested: string;
    addOpportunity: string;
    editOpportunity: string;
    deleteOpportunity: string;
    convertToProposal: string;
    
    // Proposal Development
    proposalTitle: string;
    proposalType: string;
    typeConceptNote: string;
    typeFullProposal: string;
    country: string;
    governorate: string;
    sector: string;
    projectDuration: string;
    totalRequestedBudget: string;
    currency: string;
    proposalStatus: string;
    statusDraft: string;
    statusUnderInternalReview: string;
    statusSubmitted: string;
    statusApproved: string;
    statusRejected: string;
    completionPercentage: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    
    // Actions
    createProposal: string;
    editProposal: string;
    deleteProposal: string;
    approveProposal: string;
    submitProposal: string;
    exportProposal: string;
    viewProposal: string;
    
    // Dashboard Stats
    totalOpportunities: string;
    activeProposals: string;
    successRate: string;
    totalFundingPipeline: string;
    conceptNotesRequested: string;
    
    // Filters
    filterByStatus: string;
    filterByDonor: string;
    filterByStage: string;
    searchOpportunities: string;
    searchProposals: string;
    
    // Messages
    noOpportunities: string;
    noProposals: string;
    deleteConfirm: string;
    approveConfirm: string;
    convertSuccess: string;
    deleteSuccess: string;
    createSuccess: string;
    updateSuccess: string;
    
    // How This Works Section
    howThisWorksTitle: string;
    howThisWorksPipeline: string;
    howThisWorksPipelineDesc: string;
    howThisWorksProposals: string;
    howThisWorksProposalsDesc: string;
    howThisWorksWorkflow: string;
    howThisWorksWorkflowDesc: string;
    howThisWorksExport: string;
    howThisWorksExportDesc: string;
    howThisWorksTemplates: string;
    howThisWorksTemplatesDesc: string;
  };

  // ========== FORECAST PLAN ==========
  forecastPlan: {
    // Page Title & Description
    title: string;
    subtitle: string;
    
    // Action Buttons
    reinitialize: string;
    print: string;
    import: string;
    exportExcel: string;
    export: string;
    
    // KPI / Summary Cards
    balance: string;
    actualSpent: string;
    totalForecast: string;
    totalBudget: string;
    
    // Alerts & Warnings
    balanceWarning: string;
    balanceWarningBody: string;
    varianceAlert: string;
    varianceAlertBody: string;
    forecastExceedsBalance: string;
    
    // Fiscal Year Tabs
    fiscalYear: string;
    
    // Table Headers
    activityCode: string;
    activity: string;
    budgetCode: string;
    subBL: string;
    budgetItem: string;
    prevYearBalance: string;
    month1: string;
    month2: string;
    month3: string;
    month4: string;
    month5: string;
    month6: string;
    month7: string;
    month8: string;
    month9: string;
    month10: string;
    month11: string;
    month12: string;
    
    // Empty States / System Messages
    noForecastData: string;
    noBudgetItems: string;
    noActivitiesLinked: string;
    loadingForecast: string;
    forecastNotInitialized: string;
    initializeForecastPrompt: string;
    initializeForecastButton: string;
    initializing: string;
    
    // Import/Export
    importSuccess: string;
    importFailed: string;
    forecastsUpdated: string;
    forecastsSkipped: string;
    
    // Additional keys for modal and warnings
    budgetLinesWarning: string;
    budgetLinesExceeded: string;
    viewOnlyMode: string;
    viewOnlyModeDesc: string;
    importForecastPlan: string;
    importForecastDesc: string;
    selectExcelFile: string;
    dataPreview: string;
    rows: string;
    andMoreRows: string;
    allowDuplicates: string;
    allowDuplicatesDesc: string;
    skipDuplicates: string;
    replaceExisting: string;
    cancel: string;
  };
}

// ========== ENGLISH TRANSLATIONS ==========
export const en: Translations = {
  common: {
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    create: 'Create',
    update: 'Update',
    search: 'Search',
    filter: 'Filter',
    export: 'Export',
    import: 'Import',
    download: 'Download',
    upload: 'Upload',
    submit: 'Submit',
    confirm: 'Confirm',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    yes: 'Yes',
    no: 'No',
    all: 'All',
    none: 'None',
    select: 'Select',
    selected: 'Selected',
    clear: 'Clear',
    reset: 'Reset',
    apply: 'Apply',
    view: 'View',
    actions: 'Actions',
    status: 'Status',
    date: 'Date',
    name: 'Name',
    description: 'Description',
    type: 'Type',
    total: 'Total',
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Info',
    required: 'Required',
    optional: 'Optional',
    active: 'Active',
    inactive: 'Inactive',
    enabled: 'Enabled',
    disabled: 'Disabled',
    showMore: 'Show More',
    showLess: 'Show Less',
    noData: 'No data available',
    noResults: 'No results found',
    searchPlaceholder: 'Search...',
    loadingData: 'Loading data...',
    savingChanges: 'Saving changes...',
    savedSuccessfully: 'Saved successfully',
    errorOccurred: 'An error occurred',
    tryAgain: 'Try again',
    refresh: 'Refresh',
    print: 'Print',
    share: 'Share',
    copy: 'Copy',
    paste: 'Paste',
    duplicate: 'Duplicate',
    archive: 'Archive',
    restore: 'Restore',
    manage: 'Manage',
    settings: 'Settings',
    help: 'Help',
    logout: 'Logout',
    profile: 'Profile',
    today: 'Today',
    yesterday: 'Yesterday',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    thisYear: 'This Year',
    customRange: 'Custom Range',
    from: 'From',
    to: 'To',
    between: 'Between',
    equals: 'Equals',
    contains: 'Contains',
    startsWith: 'Starts With',
    endsWith: 'Ends With',
  },

  navigation: {
    dashboard: 'Dashboard',
    organizations: 'Organizations',
    grants: 'Grants',
    projects: 'Projects',
    finance: 'Finance',
    meal: 'MEAL',
    surveys: 'Surveys',
    cases: 'Cases',
    documents: 'Documents',
    importHistory: 'Import History',
    deletedRecords: 'Deleted Records',
    settings: 'Settings',
    reporting: 'Reporting',
    proposals: 'Proposals',
  },

  header: {
    switchOrganization: 'Switch Organization',
    currentOrganization: 'Current Organization',
    switchLanguage: 'Switch Language',
    languageEn: 'English',
    languageAr: 'العربية',
    userMenu: 'User Menu',
    viewProfile: 'View Profile',
    accountSettings: 'Account Settings',
    logoutConfirm: 'Are you sure you want to logout?',
    notifications: 'Notifications',
    noNotifications: 'No new notifications',
    markAllRead: 'Mark All as Read',
    projectsManagement: 'Integrated Management System (IMS)',
    ltr: 'LTR',
    rtl: 'RTL',
  },

  sidebar: {
    collapseSidebar: 'Collapse Sidebar',
    expandSidebar: 'Expand Sidebar',
    mainMenu: 'Main Menu',
    administration: 'Administration',
  },

  platform: {
    dashboard: {
      title: 'Platform Dashboard',
      subtitle: 'System-wide management and monitoring',
      accessRestrictionTitle: 'Platform Administration Access',
      accessRestrictionDesc: 'This dashboard is restricted to Platform Administrators. You can view and manage all organizations, users, and system settings from here.',
      totalOrganizations: 'Total Organizations',
      totalUsers: 'Total Users',
      platformUsers: 'Platform Users',
      orgUsers: 'Org Users',
      microsoft365: 'Microsoft 365',
      ready: 'Ready',
      entraReady: 'Entra ID Ready',
      systemHealth: 'System Health',
      healthy: 'Healthy',
      allSystemsOperational: 'All systems operational',
      quickActions: 'Quick Actions',
      viewAllOrganizations: 'View All Organizations',
      viewAllOrganizationsDesc: 'Manage and monitor all registered organizations',
      manageIntegrations: 'Manage Integrations',
      manageIntegrationsDesc: 'Configure external service connections',
      viewAuditLogs: 'View Audit Logs',
      viewAuditLogsDesc: 'Review system activity and security events',
      platformActivity: 'Platform Activity',
      platformActivityDesc: 'User activity and system events over time',
      activityChartComingSoon: 'Activity Chart Coming Soon',
      phase1Analytics: 'Phase 1 - Analytics Dashboard',
      organizations: 'Organizations Overview',
      organizationsDesc: 'All registered organizations in the system',
      orgName: 'Organization Name',
      orgCode: 'Code',
      orgStatus: 'Status',
      orgProjects: 'Projects',
      orgActions: 'Actions',
      viewOrg: 'View',
      noOrganizations: 'No organizations found',
    },
    organizationManagement: 'Organization Management',
    platformSettings: 'Platform Settings',
    sidebarTitle: 'Platform Administration',
    sidebarSubtitle: 'System-wide management',
    organizationDetail: {
      title: 'Organization Details',
      statistics: 'Organization Statistics',
      statisticsDescription: 'Key metrics and performance indicators',
      totalUsers: 'Total Users',
      activeProjects: 'Active Projects',
      budgetAllocation: 'Budget Allocation',
      comingSoon: 'Coming soon',
      organizationInfo: 'Organization Information',
      country: 'Country',
      domain: 'Domain',
      timezone: 'Timezone',
      currency: 'Currency',
      createdAt: 'Created At',
      lastUpdated: 'Last Updated',
      operatingUnits: 'Operating Units',
      operatingUnitsCount: 'operating units',
      backToOrganizations: 'Back to Organizations',
    },
  },

  organization: {
    dashboard: {
      operatingUnitContext: 'Operating Unit Context',
      compliance: 'Compliance',
      activeGrants: 'Active Grants',
      activeProjects: 'Active Projects',
      acrossAllPrograms: 'Across all programs',
      totalEmployees: 'Total Employees',
      fullTimeStaff: 'Full-time staff',
      totalBudget: 'Total Budget',
      allocatedFunds: 'Allocated funds',
      grantExecution: 'Grant Execution',
      onTrack: 'On Track',
      complianceAlerts: 'Compliance Alerts',
      complianceAlertsDesc: 'Items requiring attention',
      highPriority: 'High Priority',
      mediumPriority: 'Medium Priority',
      daysAgo: 'days ago',
      reportOverdue: 'Report Overdue',
      reportOverdueDesc: 'Q4 Financial Report submission pending',
      budgetReview: 'Budget Review',
      budgetReviewDesc: 'Annual budget review scheduled',
      projectPipeline: 'Project Pipeline',
      projectPipelineDesc: 'Active and upcoming projects',
      waterSanitation: 'Water & Sanitation',
      waterSanitationDesc: 'Rural water access program',
      progress: 'Progress',
      budget: 'Budget',
      endDate: 'End Date',
      educationSupport: 'Education Support',
      educationSupportDesc: 'School infrastructure development',
      inProgress: 'In Progress',
    },
  },

  dashboard: {
    title: 'Dashboard',
    subtitle: 'Welcome to Integrated Management System (IMS)',
    welcome: 'Welcome',
    overview: 'Overview',
    quickStats: 'Quick Stats',
    recentActivity: 'Recent Activity',
    upcomingTasks: 'Upcoming Tasks',
    alerts: 'Alerts',
    totalProjects: 'Total Projects',
    activeProjects: 'Active Projects',
    completedProjects: 'Completed Projects',
    onHoldProjects: 'On Hold',
    totalBudget: 'Total Budget',
    spentBudget: 'Spent',
    remainingBudget: 'Remaining',
    budgetUtilization: 'Budget Utilization',
    totalBeneficiaries: 'Total Beneficiaries',
    directBeneficiaries: 'Direct',
    indirectBeneficiaries: 'Indirect',
    reportsOverdue: 'Overdue Reports',
    reportsDueThisWeek: 'Due This Week',
    reportsSubmitted: 'Submitted',
    projectsByStatus: 'Projects by Status',
    projectsByDonor: 'Projects by Donor',
    budgetByProject: 'Budget by Project',
    beneficiariesByProject: 'Beneficiaries by Project',
    viewAllProjects: 'View All Projects',
    viewAllReports: 'View All Reports',
    noActiveProjects: 'No active projects',
    noRecentActivity: 'No recent activity',
    lastUpdated: 'Last updated',
    refreshDashboard: 'Refresh Dashboard',
  },

  projects: {
    title: 'Projects',
    subtitle: 'Manage all projects',
    createNew: 'Create New Project',
    editProject: 'Edit Project',
    deleteProject: 'Delete Project',
    deleteConfirm: 'Are you sure you want to delete this project?',
    projectDetails: 'Project Details',
    projectInfo: 'Project Information',
    projectCode: 'Project Code',
    projectName: 'Project Name',
    projectDescription: 'Project Description',
    startDate: 'Start Date',
    endDate: 'End Date',
    duration: 'Duration',
    donor: 'Donor',
    grantId: 'Grant ID',
    budget: 'Budget',
    totalBudget: 'Total Budget',
    spentAmount: 'Spent Amount',
    remainingAmount: 'Remaining',
    status: 'Status',
    statusActive: 'Active',
    statusCompleted: 'Completed',
    statusOnHold: 'On Hold',
    statusPlanning: 'Planning',
    statusClosed: 'Closed',
    priority: 'Priority',
    priorityHigh: 'High',
    priorityMedium: 'Medium',
    priorityLow: 'Low',
    manager: 'Manager',
    team: 'Team',
    location: 'Location',
    locations: 'Locations',
    sector: 'Sector',
    sectors: 'Sectors',
    beneficiaries: 'Beneficiaries',
    directBeneficiaries: 'Direct Beneficiaries',
    indirectBeneficiaries: 'Indirect Beneficiaries',
    beneficiaryTypes: 'Beneficiary Types',
    objectives: 'Objectives',
    activities: 'Activities',
    milestones: 'Milestones',
    deliverables: 'Deliverables',
    risks: 'Risks',
    documents: 'Documents',
    reporting: 'Reporting',
    financials: 'Financials',
    progress: 'Progress',
    progressPercent: 'Progress',
    timeline: 'Timeline',
    created: 'Created',
    createdBy: 'Created By',
    modified: 'Modified',
    modifiedBy: 'Modified By',
    noProjects: 'No projects found',
    noProjectsDesc: 'Get started by creating your first project',
    createFirstProject: 'Create First Project',
    searchProjects: 'Search projects...',
    filterByStatus: 'Filter by Status',
    filterByDonor: 'Filter by Donor',
    filterByDate: 'Filter by Date',
    sortBy: 'Sort By',
    sortByName: 'Name',
    sortByDate: 'Date',
    sortByBudget: 'Budget',
    sortAZ: 'A-Z',
    sortZA: 'Z-A',
    sortNewestFirst: 'Newest First',
    sortOldestFirst: 'Oldest First',
    exportList: 'Export List',
    importProjects: 'Import Projects',
    bulkActions: 'Bulk Actions',
    selectedProjects: 'Selected Projects',
    // Project Dashboard Specific
    dashboardTitle: 'Project Management Dashboard',
    dashboardSubtitle: 'Comprehensive overview of all projects, budgets, and performance metrics',
    grantManagement: 'Grant Management',
    grantManagementDesc: 'Manage and track grants effectively',
    reportingSchedule: 'Project Reporting Schedule',
    reportingScheduleDesc: 'View active reporting timelines',
    proposalPipeline: 'Proposal & Pipeline',
    proposalPipelineDesc: 'Track funding opportunities and proposals',
    activePrograms: 'Active Programs',
    activeProgramsDesc: 'All ongoing project implementations',
    active: 'Active',
    opportunities: 'Opportunities',
    totalBudgetUSD: 'Total Budget (USD)',
    actualSpentUSD: 'Actual Spent (USD)',
    balanceUSD: 'Balance (USD)',
    avgCompletionRate: 'Avg. Completion Rate',
    ongoingProjectsOnly: 'Ongoing Projects Only',
    allOngoingProjects: 'All Ongoing Projects',
    fromFinanceOverview: 'From Finance Overview',
    budgetMinusSpent: 'Budget - Spent',
    projectList: 'Project List',
    exportToExcel: 'Export to Excel',
    exportTemplate: 'Export Template',
    importExcel: 'Import Excel',
    addNewProject: 'Add New Project',
    searchByTitle: 'Search by Title',
    viewDetails: 'View Details',
    updateProject: 'Update',
    notAvailable: 'N/A',
    budgetUtilization: 'Budget Utilization',
    currency: 'Currency',
    spent: 'Spent',
    balance: 'Balance',
    all: 'All',
    statusOngoing: 'Ongoing',
    statusPlanned: 'Planned',
    statusNotStarted: 'Not Started',
    statusSuspended: 'Suspended',
    submitted: 'Submitted',
    approved: 'Approved',
    upcoming: 'Upcoming',
    // Create Project Form
    createNewProject: 'Create New Project',
    fillProjectDetails: 'Fill in the project details to get started',
    basicInformation: 'Basic Information',
    coreProjectDetails: 'Core project details and identification',
    projectTitleEN: 'Project Title',
    projectTitleAR: 'Project Title (Arabic)',
    enterProjectTitle: 'Enter project title',
    enterProjectTitleAR: 'أدخل عنوان المشروع',
    projectCodePlaceholder: 'e.g., PROJ-2025-001',
    associatedGrant: 'Associated Grant',
    selectGrant: 'Select a grant',
    locationDetails: 'Location & Details',
    projectLocationDesc: 'Project location and descriptive information',
    locationEN: 'Location',
    locationAR: 'Location (Arabic)',
    locationPlaceholder: 'City, Region, Country',
    locationPlaceholderAR: 'المدينة�� المنطقة، البلد',
    descriptionEN: 'Description',
    descriptionAR: 'Description (Arabic)',
    descriptionPlaceholder: 'Describe the project purpose and scope',
    descriptionPlaceholderAR: 'وصف غرض المشروع ونطاقه',
    objectivesEN: 'Objectives',
    objectivesAR: 'Objectives (Arabic)',
    objectivesPlaceholder: 'List key project objectives',
    objectivesPlaceholderAR: 'قائمة أهداف المشروع الرئيسية',
    projectManagement: 'Project Management',
    managementBeneficiaryInfo: 'Management and beneficiary information',
    projectManager: 'Project Manager',
    projectManagerPlaceholder: 'Name of project manager',
    targetBeneficiaryCount: 'Target Beneficiary Count',
    beneficiaryCountPlaceholder: 'Expected number of beneficiaries',
    cancel: 'Cancel',
    createProject: 'Create Project',
    projectCreationPending: 'Project creation functionality will be connected to backend API',
    tabs: {
      overview: 'Overview',
      team: 'Team',
      budget: 'Budget',
      beneficiaries: 'Beneficiaries',
      locations: 'Locations',
      activities: 'Activities',
      reporting: 'Reporting',
      documents: 'Documents',
      timeline: 'Timeline',
      settings: 'Settings',
    },
  },

  projectDetail: {
    backToProjects: 'Back to Projects',
    editProject: 'Edit Project',
    projectCode: 'Project Code',
    donorGrant: 'Donor/Grant',
    description: 'Description',
    daysRemaining: 'days remaining',
    // Tab Labels
    tabProgramsOverview: 'Overview',
    tabViewAllActivities: 'Activities',
    tabTasksMgt: 'Tasks Mgt',
    tabProjectIndicators: 'Indicators',
    tabBeneficiaries: 'Beneficiaries',
    tabFinancialOverview: 'Financial Overview',
    tabForecastPlan: 'Forecast Plan',
    tabProcurementPlan: 'Procurement Plan',
    tabCaseManagement: 'Case Mgt', // SHORTENED from "Case Management" to fit tabs in one row
    tabProjectReport: 'Reports', // SHORTENED from "Project Report" to fit tabs in one row
    tabProjectPlan: 'Project Plan',
    // Procurement Plan
    procurementPlanTitle: 'Procurement Plan',
    procurementPlanSubtitle: 'Plan and manage procurement activities with budget control and compliance tracking',
    procurementPlanPeriod: 'Procurement Plan Period',
    itemDescription: 'Item Description',
    procurementCategory: 'Category',
    quantityLabel: 'Quantity',
    unitOfMeasure: 'Unit of Measure',
    estimatedUnitCost: 'Estimated Unit Cost',
    estimatedTotalCost: 'Estimated Total Cost',
    procurementMethod: 'Procurement Method',
    procurementType: 'Procurement Type',
    plannedStartDate: 'Planned Start Date',
    plannedEndDate: 'Planned End Date',
    responsibleDepartment: 'Responsible Department',
    addProcurementItem: 'Add Procurement Item',
    editProcurementItem: 'Edit Procurement Item',
    noProcurementItemsFound: 'No procurement items found',
    searchProcurementItems: 'Search procurement items...',
    totalProcurementItems: 'Total Items',
    totalEstimatedCost: 'Total Estimated Cost',
    remainingBudget: 'Remaining Budget',
    budgetExceededWarning: 'Warning: Total cost exceeds available budget',
    // Procurement Categories
    categoryGoods: 'Goods',
    categoryServices: 'Services',
    categoryWorks: 'Works',
    // Procurement Methods
    methodDirectProcurement: 'Direct Procurement',
    methodRFQ: 'Request for Quotation (RFQ)',
    methodNationalBidding: 'National Competitive Bidding',
    methodInternationalBidding: 'International Competitive Bidding',
    methodLTA: 'Long-Term Agreement (LTA)',
    methodEmergency: 'Emergency Procurement',
    methodOneQuotation: 'One Quotation',
    methodThreeQuotation: 'Three Quotations',
    methodNegotiable: 'Negotiable',
    methodTender: 'Tender',
    categoryConsultancy: 'Consultancy',
    activityName: 'Activity',
    noProcurementItems: 'No procurement items found',
    // Procurement Types
    typeOneTime: 'One-time',
    typeFramework: 'Framework / LTA',
    typeRecurrent: 'Recurrent',
    // Procurement Status
    statusPlanned: 'Planned',
    statusSubmitted: 'Submitted',
    statusApproved: 'Approved',
    statusInProgress: 'In Progress',
    statusCompleted: 'Completed',
    statusCancelled: 'Cancelled',
    // Departments
    deptProgram: 'Program',
    deptLogistics: 'Logistics',
    deptProcurement: 'Procurement',
    deptFinance: 'Finance',
    deptMEAL: 'MEAL',
    deptOther: 'Other',
    // Overview Tab
    overviewStatActivities: 'Activities',
    overviewStatIndicators: 'Indicators',
    overviewStatBeneficiaries: 'Beneficiaries',
    overviewStatBudgetUtilization: 'Budget Utilization',
    overviewBudgetSubtitle: 'Of total budget spent',
    overviewKeyActivities: 'Key Activities',
    overviewProjectTimeline: 'Project Timeline',
    overviewTimelineVisualization: 'Timeline visualization',
    noActivitiesYet: 'No activities yet',
    noDescriptionProvided: 'No description provided',
    // Activities Tab
    activitiesPageTitle: 'Project Activities',
    activitiesPageSubtitle: 'Manage and track all project activities',
    activityCode: 'Activity Code',
    activityTitle: 'Activity Name',
    activityDescription: 'Description',
    activityStatus: 'Status',
    activityStartDate: 'Start Date',
    activityEndDate: 'End Date',
    activityDuration: 'Duration',
    activityBudget: 'Budget',
    activitySpent: 'Spent',
    activityCompletion: 'Completion',
    activityProgress: 'Progress',
    activityResponsible: 'Responsible Person',
    activityLocation: 'Location',
    activityStatusNotStarted: 'Not Started',
    activityStatusInProgress: 'In Progress',
    activityStatusCompleted: 'Completed',
    activityStatusOnHold: 'On Hold',
    activityStatusCancelled: 'Cancelled',
    addActivity: 'Add Activity',
    editActivity: 'Edit Activity',
    deleteActivity: 'Delete Activity',
    viewActivity: 'View Activity',
    addNewActivity: 'Add New Activity',
    exportActivities: 'Export Excel',
    exportActivitiesTemplate: 'Export Template',
    importActivities: 'Import Excel',
    timelineView: 'Timeline View',
    tableView: 'Table View',
    totalActivities: 'Total Activities',
    inProgress: 'In Progress',
    completed: 'Completed',
    totalBudget: 'Total Budget',
    searchActivities: 'Search activities by name, code, or responsible person...',
    noActivitiesFound: 'No activities found. Click "Add Activity" to create one.',
    activityCodeRequired: 'Activity Code*',
    activityTitleRequired: 'Activity Name*',
    confirmDeleteActivity: 'Are you sure you want to delete activity "{0}"? This action cannot be undone.',
    activityCreatedSuccess: 'Activity created successfully!',
    activityUpdatedSuccess: 'Activity updated successfully!',
    activityDeletedSuccess: 'Activity deleted successfully!',
    importActivitiesTitle: 'Import Activities from Excel',
    importActivitiesDesc: 'Upload an Excel file with activity data. Make sure to use the correct template format.',
    fillRequiredFields: 'Please fill in all required fields',
    successfullyImported: 'Successfully imported {0} activities!',
    code: 'Code',
    title: 'Activity Name',
    responsible: 'Responsible',
    actions: 'Actions',
    // Tasks Tab
    tasksPageTitle: 'Project Tasks',
    tasksPageSubtitle: 'Manage tasks, assignments, and deadlines',
    taskCode: 'Task Code',
    taskTitle: 'Task Title',
    taskDescription: 'Description',
    taskStatus: 'Status',
    taskPriority: 'Priority',
    taskHours: 'Hours',
    taskAssignedTo: 'Assigned To',
    taskDueDate: 'Due Date',
    taskEstimatedHours: 'Est. Hours',
    taskActualHours: 'Actual Hours',
    taskStatusToDo: 'To Do',
    taskStatusInProgress: 'In Progress',
    taskStatusReview: 'Review',
    taskStatusCompleted: 'Completed',
    taskPriorityLow: 'Low',
    taskPriorityMedium: 'Medium',
    taskPriorityHigh: 'High',
    taskPriorityUrgent: 'Urgent',
    priorityLow: 'Low',
    priorityMedium: 'Medium',
    priorityHigh: 'High',
    priorityUrgent: 'Urgent',
    addTask: 'Add Task',
    editTask: 'Edit Task',
    addNewTask: 'Add New Task',
    kanbanView: 'Kanban View',
    totalTasks: 'Total Tasks',
    totalHoursEst: 'Total Hours (Est.)',
    searchTasks: 'Search tasks by title, code, or assignee...',
    noTasksFound: 'No tasks found. Click "Add Task" to create one.',
    noTasks: 'No tasks',
    taskCodeRequired: 'Task Code*',
    taskTitleRequired: 'Task Title*',
    taskCreatedSuccess: 'Task created successfully!',
    taskUpdatedSuccess: 'Task updated successfully!',
    taskDeletedSuccess: 'Task deleted successfully!',
    importTasksTitle: 'Import Tasks from Excel',
    importTasksDesc: 'Upload an Excel file with task data. Make sure to use the correct template format.',
    confirmDeleteTask: 'Are you sure you want to delete task "{0}"? This action cannot be undone.',
    hours: 'Hours',
    // Indicators Tab
    indicatorsPageTitle: 'Project Indicators',
    indicatorsPageSubtitle: 'Track and monitor key performance indicators',
    indicatorCode: 'Indicator Code',
    indicatorTitle: 'Indicator Title',
    indicatorType: 'Type',
    indicatorUnit: 'Unit',
    indicatorBaseline: 'Baseline',
    indicatorTarget: 'Target',
    indicatorAchieved: 'Achieved',
    indicatorTypeOutput: 'Output',
    indicatorTypeOutcome: 'Outcome',
    indicatorTypeImpact: 'Impact',
    addIndicator: 'Add Indicator',
    totalIndicators: 'Total Indicators',
    searchIndicators: 'Search indicators...',
    noIndicatorsFound: 'No indicators found.',
    // Beneficiaries Tab
    beneficiariesPageTitle: 'Project Beneficiaries',
    beneficiariesPageSubtitle: 'Manage and track beneficiary information',
    beneficiaryId: 'Beneficiary ID',
    fullName: 'Full Name',
    gender: 'Gender',
    genderMale: 'Male',
    genderFemale: 'Female',
    genderOther: 'Other',
    genderPreferNotToSay: 'Prefer not to say',
    ageGroup: 'Age Group',
    ageGroup05: 'Children (0-5)',
    ageGroup617: 'Youth (6-17)',
    ageGroup1859: 'Adults (18-59)',
    ageGroup60Plus: 'Elderly (60+)',
    beneficiaryType: 'Beneficiary Type',
    beneficiaryTypeDirect: 'Direct',
    beneficiaryTypeIndirect: 'Indirect',
    beneficiaryFullName: 'Full Name',
    vulnerability: 'Vulnerability',
    district: 'District',
    governorate: 'Governorate',
    registrationDate: 'Registration Date',
    phone: 'Phone',
    age: 'Age',
    registerBeneficiary: 'Register Beneficiary',
    allGenders: 'All Genders',
    allAgeGroups: 'All Age Groups',
    allTypes: 'All Types',
    genderDisaggregation: 'Gender Disaggregation',
    ageDisaggregation: 'Age Disaggregation',
    children: 'Children (0-17)',
    adults: 'Adults (18-59)',
    elderly: 'Elderly (60+)',
    locations: 'Locations',
    uniqueLocations: 'Unique locations covered',
    activity: 'Activity',
    noBeneficiariesFound: 'No beneficiaries found.',
    addBeneficiary: 'Add Beneficiary',
    totalBeneficiaries: 'Total Beneficiaries',
    searchBeneficiaries: 'Search beneficiaries...',
    // Financial Tab
    financialPageTitle: 'Financial Overview',
    financialPageSubtitle: 'Monitor budget execution and expenditure',
    budgetCode: 'Budget Code',
    budgetItem: 'Budget Item',
    subItem: 'Sub-Item',
    approvedBudget: 'Approved Budget',
    totalApprovedBudget: 'Total Approved Budget',
    actualSpent: 'Actual Spent',
    spent: 'Spent',
    committed: 'Committed',
    committedFunds: 'Committed Funds',
    balance: 'Balance',
    remainingBalance: 'Remaining Balance',
    variance: 'Variance %',
    burnRate: 'Burn Rate',
    burnRateOnTrack: 'On Track',
    burnRateMonitor: 'Monitor',
    burnRateCritical: 'Critical',
    budgetLines: 'Budget Lines',
    budgetLinesSubtitle: 'Excel-like grid with approved budget, expenditures, and variance tracking',
    addBudgetLine: 'Add Budget Line',
    noBudgetLines: 'No budget lines added yet',
    addBudgetLinePrompt: 'Click "Add Budget Line" to get started',
    budgetTemplate: 'Budget Template',
    importBudgetLines: 'Import Budget Lines',
    deleteBudgetLineConfirm: 'Are you sure you want to delete this budget line? This action cannot be undone.',
    approved: 'Approved',
  },

  finance: {
    title: 'Finance',
    subtitle: 'Financial management and tracking',
    chartOfAccounts: 'Chart of Accounts',
    budgets: 'Budgets',
    expenditures: 'Expenditures',
    transactions: 'Transactions',
    reports: 'Reports',
    accountCode: 'Account Code',
    accountName: 'Account Name',
    accountType: 'Account Type',
    accountTypeAsset: 'Asset',
    accountTypeLiability: 'Liability',
    accountTypeEquity: 'Equity',
    accountTypeRevenue: 'Revenue',
    accountTypeExpense: 'Expense',
    parentAccount: 'Parent Account',
    balance: 'Balance',
    debit: 'Debit',
    credit: 'Credit',
    budgetLine: 'Budget Line',
    budgetedAmount: 'Budgeted Amount',
    actualAmount: 'Actual Amount',
    variance: 'Variance',
    variancePercent: 'Variance %',
    expenditureDate: 'Expenditure Date',
    expenditureAmount: 'Amount',
    expenditureType: 'Expenditure Type',
    paymentMethod: 'Payment Method',
    paymentMethodCash: 'Cash',
    paymentMethodBank: 'Bank Transfer',
    paymentMethodCheck: 'Check',
    paymentMethodMobile: 'Mobile Money',
    vendor: 'Vendor',
    invoice: 'Invoice',
    receipt: 'Receipt',
    approvedBy: 'Approved By',
    approvalDate: 'Approval Date',
    reconciliationStatus: 'Reconciliation Status',
    reconciledStatusPending: 'Pending',
    reconciledStatusReconciled: 'Reconciled',
    reconciledStatusDisputed: 'Disputed',
    noFinancialData: 'No financial data available',
  },

  forms: {
    requiredField: 'This field is required',
    invalidEmail: 'Invalid email address',
    invalidPhone: 'Invalid phone number',
    invalidUrl: 'Invalid URL',
    invalidDate: 'Invalid date',
    invalidNumber: 'Invalid number',
    minLength: 'Minimum length is',
    maxLength: 'Maximum length is',
    minValue: 'Minimum value is',
    maxValue: 'Maximum value is',
    mustBePositive: 'Must be a positive number',
    mustBeUnique: 'Value must be unique',
    passwordMismatch: 'Passwords do not match',
    selectOption: 'Select an option',
    selectMultiple: 'Select one or more options',
    enterValue: 'Enter a value',
    chooseFile: 'Choose a file',
    uploadFile: 'Upload File',
    fileSelected: 'file selected',
    filesSelected: 'files selected',
    maxFileSize: 'Maximum file size',
    allowedFileTypes: 'Allowed file types',
    dragDropFile: 'Drag and drop file here',
    browseFiles: 'Browse Files',
    removeFile: 'Remove File',
  },

  tables: {
    columns: 'Columns',
    rows: 'Rows',
    rowsPerPage: 'Rows per page',
    page: 'Page',
    of: 'of',
    showing: 'Showing',
    noDataAvailable: 'No data available',
    noMatchingRecords: 'No matching records found',
    loadingRecords: 'Loading records...',
    selectAll: 'Select All',
    deselectAll: 'Deselect All',
    selectedCount: 'selected',
    sortAscending: 'Sort Ascending',
    sortDescending: 'Sort Descending',
    filterColumn: 'Filter Column',
    hideColumn: 'Hide Column',
    showColumn: 'Show Column',
    exportTable: 'Export Table',
    exportCSV: 'Export as CSV',
    exportExcel: 'Export as Excel',
    exportPDF: 'Export as PDF',
    printTable: 'Print Table',
    refreshTable: 'Refresh Table',
  },

  caseManagement: {
    // Sub-Navigation
    dashboard: 'Dashboard',
    casesList: 'Cases List',
    caseProfile: 'Case Profile',
    pssSessions: 'PSS Sessions',
    activities: 'Activities',
    safeSpace: 'Safe Space',
    referrals: 'Referrals',
    reports: 'Reports',
    
    // Dashboard KPIs
    totalActiveCases: 'Total Active Cases',
    newCasesThisMonth: 'New Cases (This Month)',
    closedCases: 'Closed Cases',
    highRiskCases: 'High-Risk Cases',
    pendingReferrals: 'Pending Referrals',
    followUpsDue: 'Follow-ups Due',
    
    // Dashboard & List Headers
    caseManagementDashboard: 'Case Management Dashboard',
    project: 'Project',
    donor: 'Donor',
    role: 'Role',
    recentCases: 'Recent Cases',
    
    // Filters
    allGender: 'All Gender',
    male: 'Male',
    female: 'Female',
    allRiskLevels: 'All Risk Levels',
    riskHigh: 'High',
    riskMedium: 'Medium',
    riskLow: 'Low',
    allStatus: 'All Status',
    statusOpen: 'Open',
    statusOngoing: 'Ongoing',
    statusClosed: 'Closed',
    allCaseTypes: 'All Case Types',
    typePSS: 'PSS',
    typeCP: 'Child Protection',
    typeGBV: 'GBV',
    typeProtection: 'Protection',
    
    // Table Headers
    caseId: 'Case ID',
    beneficiaryCode: 'Beneficiary Code',
    gender: 'Gender',
    age: 'Age',
    riskLevel: 'Risk Level',
    caseType: 'Type',
    status: 'Status',
    actions: 'Actions',
    view: 'View',
    
    // Case List
    addNewCase: 'Add New Case',
    searchCases: 'Search cases...',
    exportCases: 'Export Cases',
    exportTemplate: 'Export Template',
    importCases: 'Import Cases',
    noCasesMatch: 'No cases match the current filters',
    
    // Case Form Fields
    firstName: 'First Name',
    lastName: 'Last Name',
    dateOfBirth: 'Date of Birth',
    nationality: 'Nationality',
    idNumber: 'ID Number',
    phoneNumber: 'Phone Number',
    email: 'Email',
    address: 'Address',
    referralSource: 'Referral Source',
    intakeDate: 'Intake Date',
    assignedTo: 'Assigned To',
    notes: 'Notes',
    
    // Case Profile Sections
    backToCasesList: 'Back to Cases List',
    caseIdLabel: 'Case ID',
    beneficiaryInformation: 'A. Beneficiary Information',
    caseDetails: 'B. Case Details',
    casePlan: 'C. Case Plan',
    disability: 'Disability',
    location: 'Location',
    district: 'District',
    householdSize: 'Household Size',
    vulnerabilityCategory: 'Vulnerability Category',
    caseOpeningDate: 'Case Opening Date',
    informedConsent: 'Informed Consent',
    identifiedNeeds: 'Identified Needs',
    riskFactors: 'Risk Factors',
    immediateConcerns: 'Immediate Concerns',
    plannedInterventions: 'Planned Interventions',
    expectedOutcomes: 'Expected Outcomes',
    timeline: 'Timeline',
    yes: 'Yes',
    no: 'No',
    notAvailable: 'N/A',
    
    // PSS Sessions
    pssSessionsTitle: 'PSS Sessions',
    pssSessionsDescription: 'Track and manage psychosocial support sessions',
    addSession: 'Add Session',
    exportSessions: 'Export Sessions',
    exportSessionsTemplate: 'Export Template',
    importSessions: 'Import Sessions',
    totalSessions: 'Total Sessions',
    individualSessions: 'Individual',
    groupSessions: 'Group',
    avgSessionDuration: 'Avg Duration',
    sessionDate: 'Session Date',
    sessionType: 'Session Type',
    sessionDuration: 'Duration (minutes)',
    pssApproach: 'PSS Approach',
    topicsDiscussed: 'Topics Discussed',
    followUpDate: 'Follow-up Date',
    facilitator: 'Facilitator',
    participantsCount: 'Participants',
    typeIndividual: 'Individual',
    typeGroup: 'Group',
    editSession: 'Edit',
    deleteSession: 'Delete',
    noSessionsFound: 'No sessions found',
    addNewSession: 'Add New Session',
    updateSession: 'Update Session',
    confirmDeleteSession: 'Confirm Delete',
    sessionDeleteMessage: 'Are you sure you want to delete this session?',
    fillRequiredFields: 'Please fill all required fields',
    sessionAddedSuccess: '✅ Session added successfully!',
    sessionUpdatedSuccess: '✅ Session updated successfully!',
    sessionDeletedSuccess: '✅ Session deleted successfully!',
    minutes: 'minutes',
    
    // Activities & Services
    activitiesTitle: 'Activities & Services',
    activitiesDescription: 'Track activities and services provided to beneficiaries',
    addActivity: 'Add Activity',
    exportActivities: 'Export Activities',
    exportActivitiesTemplate: 'Export Template',
    importActivities: 'Import Activities',
    totalActivities: 'Total Activities',
    activitiesCompleted: 'Completed',
    beneficiariesServed: 'Beneficiaries Served',
    activitiesThisMonth: 'This Month',
    activityDate: 'Activity Date',
    activityType: 'Activity Type',
    serviceProvided: 'Service Provided',
    duration: 'Duration',
    outcome: 'Outcome',
    editActivity: 'Edit',
    deleteActivity: 'Delete',
    noActivitiesFound: 'No activities found',
    addNewActivity: 'Add New Activity',
    updateActivity: 'Update Activity',
    confirmDeleteActivity: 'Confirm Delete',
    activityDeleteMessage: 'Are you sure you want to delete this activity?',
    activityAddedSuccess: '✅ Activity added successfully!',
    activityUpdatedSuccess: '✅ Activity updated successfully!',
    activityDeletedSuccess: '✅ Activity deleted successfully!',
    providedBy: 'Provided By',
    followUp: 'Follow-up',
    followUpRequired: 'Follow-up Required',
    
    // Child Safe Space
    childSafeSpaceTitle: 'Child Safe Space',
    childSafeSpaceDescription: 'Track Child Safe Space sessions and activities',
    addCSSSession: 'Add CSS Session',
    exportCSSSessions: 'Export Sessions',
    exportCSSTemplate: 'Export Template',
    importCSSSessions: 'Import Sessions',
    totalCSSSessions: 'Total Sessions',
    childrenAttended: 'Children Attended',
    avgAttendance: 'Avg Attendance',
    activitiesHeld: 'Activities Held',
    activityTheme: 'Activity Theme',
    attendanceCount: 'Attendance',
    ageGroup: 'Age Group',
    safeguardingIncidents: 'Safeguarding Incidents',
    editCSSSession: 'Edit',
    deleteCSSSession: 'Delete',
    noCSSSessionsFound: 'No sessions found',
    addNewCSSSession: 'Add New CSS Session',
    updateCSSSession: 'Update CSS Session',
    confirmDeleteCSSSession: 'Confirm Delete',
    cssSessionDeleteMessage: 'Are you sure you want to delete this session?',
    cssSessionAddedSuccess: '✅ CSS session added successfully!',
    cssSessionUpdatedSuccess: '✅ CSS session updated successfully!',
    cssSessionDeletedSuccess: '✅ CSS session deleted successfully!',
    
    // Referrals
    referralsTitle: 'Referrals',
    referralsDescription: 'Track and manage case referrals',
    addReferral: 'Add Referral',
    exportReferrals: 'Export Referrals',
    exportReferralsTemplate: 'Export Template',
    importReferrals: 'Import Referrals',
    totalReferrals: 'Total Referrals',
    pendingReferralsCount: 'Pending',
    completedReferrals: 'Completed',
    referralsThisMonth: 'This Month',
    referralDate: 'Referral Date',
    referredTo: 'Referred To',
    serviceType: 'Service Type',
    priority: 'Priority',
    referralStatus: 'Status',
    completionDate: 'Completion Date',
    feedback: 'Feedback',
    priorityHigh: 'High',
    priorityMedium: 'Medium',
    priorityLow: 'Low',
    statusPending: 'Pending',
    statusInProgress: 'In Progress',
    statusCompleted: 'Completed',
    editReferral: 'Edit',
    deleteReferral: 'Delete',
    noReferralsFound: 'No referrals found',
    addNewReferral: 'Add New Referral',
    updateReferral: 'Update Referral',
    confirmDeleteReferral: 'Confirm Delete',
    referralDeleteMessage: 'Are you sure you want to delete this referral?',
    referralAddedSuccess: '✅ Referral added successfully!',
    referralUpdatedSuccess: '✅ Referral updated successfully!',
    referralDeletedSuccess: '✅ Referral deleted successfully!',
    
    // Reports & Analytics
    reportsTitle: 'Reports & Analytics',
    reportsDescription: 'Generate and view case management reports',
    generateReport: 'Generate Report',
    exportReport: 'Export Report',
    reportType: 'Report Type',
    dateRange: 'Date Range',
    caseManagementSummary: 'Case Management Summary',
    caseLoad: 'Case Load',
    demographics: 'Demographics',
    services: 'Services',
    outcomes: 'Outcomes',
    totalCasesManaged: 'Total Cases Managed',
    newIntakes: 'New Intakes',
    closedSuccessfully: 'Closed Successfully',
    averageCaseDuration: 'Average Case Duration',
    byGender: 'By Gender',
    byAgeGroup: 'By Age Group',
    byRiskLevel: 'By Risk Level',
    byType: 'By Type',
    pssSessionsProvided: 'PSS Sessions Provided',
    activitiesCompletedCount: 'Activities Completed',
    referralsMade: 'Referrals Made',
    followUpsCompleted: 'Follow-ups Completed',
    successfulCaseClosure: 'Successful Case Closure Rate',
    averageSatisfactionScore: 'Average Satisfaction Score',
    beneficiariesReachedTarget: 'Beneficiaries Reached Target',
    servicesDeliveredOnTime: 'Services Delivered On Time',
    exportPDF: 'Export PDF',
    days: 'days',
    
    // Reports & Analytics - Auto-Report Labels
    caseManagementAutoReport: 'Case Management Auto-Report',
    autoGeneratedFromData: 'Auto-generated from real Case Management data',
    printSaveAsPDF: 'Print / Save as PDF',
    exportExcel: 'Export Excel',
    caseManagementReport: 'Case Management Report',
    reportingPeriod: 'Reporting Period',
    generatedOn: 'Generated on',
    to: 'to',
    executiveSummary: 'Executive Summary',
    keyMetrics: 'Key Metrics',
    keyAchievements: 'Key Achievements',
    totalBeneficiaries: 'Total Beneficiaries',
    childrenReached: 'Children Reached',
    cssLocations: 'CSS Locations',
    cases: 'Cases',
    safeSpaces: 'Safe Spaces',
    detailedTables: 'Detailed Tables',
    casesOverview: 'Cases Overview',
    metric: 'Metric',
    value: 'Value',
    totalCases: 'Total Cases',
    newCasesPeriod: 'New Cases (Period)',
    activeCases: 'Active Cases',
    avgCaseDuration: 'Average Case Duration',
    indicator: 'Indicator',
    totalPSSSessions: 'Total PSS Sessions',
    individualSessionsLabel: 'Individual Sessions',
    groupSessionsLabel: 'Group Sessions',
    avgDuration: 'Average Duration',
    followUpsScheduled: 'Follow-ups Scheduled',
    internalReferrals: 'Internal Referrals',
    externalReferrals: 'External Referrals',
    completedReferralsLabel: 'Completed Referrals',
    completionRate: 'Completion Rate',
    activeCSSLocations: 'Active CSS Locations',
    totalCSSActivities: 'Total CSS Activities',
    avgChildrenPerSession: 'Avg. Children per Session',
    activitiesServices: 'Activities & Services',
    activityTypeLabel: 'Activity Type',
    count: 'Count',
    
    // Detailed Tables Labels
    casesLabel: 'Cases',
    pssSessionsLabel: 'PSS Sessions',
    referralsLabel: 'Referrals',
    safeSpacesLabel: 'Safe Spaces',
    totalCasesLabel: 'Total Cases',
    newCasesLabel: 'New Cases (Period)',
    activeCasesLabel: 'Active Cases',
    closedCasesLabel: 'Closed Cases',
    highRiskCasesLabel: 'High-Risk Cases',
    avgDurationLabel: 'Avg. Duration',
    totalSessionsLabel: 'Total Sessions',
    individualSessionsCount: 'Individual Sessions',
    groupSessionsCount: 'Group Sessions',
    followUpsScheduledLabel: 'Follow-ups Scheduled',
    totalReferralsLabel: 'Total Referrals',
    internalReferralsLabel: 'Internal Referrals',
    externalReferralsLabel: 'External Referrals',
    completedLabel: 'Completed',
    completionRateLabel: 'Completion Rate',
    activeLocationsLabel: 'Active Locations',
    totalActivitiesLabel: 'Total Activities',
    avgPerSessionLabel: 'Avg. per Session',
  },

  organizations: {
    title: 'Organizations',
    subtitle: 'Manage organizations',
    createOrganization: 'Create Organization',
    editOrganization: 'Edit Organization',
    deleteOrganization: 'Delete Organization',
    organizationName: 'Organization Name',
    organizationType: 'Organization Type',
    typeNGO: 'NGO',
    typeINGO: 'INGO',
    typeUN: 'UN Agency',
    typeGovernment: 'Government',
    typeCommunity: 'Community Organization',
    country: 'Country',
    region: 'Region',
    city: 'City',
    address: 'Address',
    phone: 'Phone',
    email: 'Email',
    website: 'Website',
    registrationNumber: 'Registration Number',
    taxId: 'Tax ID',
    activeUsers: 'Active Users',
    totalProjects: 'Total Projects',
    established: 'Established',
    noOrganizations: 'No organizations found',
    switchOrganization: 'Switch Organization',
  },

  users: {
    title: 'Users',
    subtitle: 'User management',
    createUser: 'Create User',
    editUser: 'Edit User',
    deleteUser: 'Delete User',
    userName: 'User Name',
    userEmail: 'Email',
    userRole: 'Role',
    roleSystemAdmin: 'System Admin',
    roleOrgAdmin: 'Organization Admin',
    roleProjectManager: 'Project Manager',
    roleFinanceOfficer: 'Finance Officer',
    roleMEALOfficer: 'MEAL Officer',
    roleFieldOfficer: 'Field Officer',
    roleViewer: 'Viewer',
    permissions: 'Permissions',
    permissionsView: 'View',
    permissionsCreate: 'Create',
    permissionsEdit: 'Edit',
    permissionsDelete: 'Delete',
    permissionsManage: 'Manage',
    lastLogin: 'Last Login',
    accountStatus: 'Account Status',
    inviteUser: 'Invite User',
    resendInvitation: 'Resend Invitation',
    deactivateUser: 'Deactivate User',
    activateUser: 'Activate User',
    resetPassword: 'Reset Password',
    changePassword: 'Change Password',
    noUsers: 'No users found',
  },

  settings: {
    title: 'Settings',
    subtitle: 'System settings',
    generalSettings: 'General Settings',
    userManagement: 'User Management',
    rolesPermissions: 'Roles & Permissions',
    optionSets: 'Option Sets',
    emailNotifications: 'Email Notifications',
    logoBranding: 'Logo & Branding',
    publishSync: 'Publish & Sync',
    adminAccess: 'Admin Access',
    systemPreferences: 'System Preferences',
    languageRegion: 'Language & Region',
    dateTimeFormat: 'Date & Time Format',
    currency: 'Currency',
    timezone: 'Timezone',
    fiscalYearStart: 'Fiscal Year Start',
    saveSettings: 'Save Settings',
    settingsSaved: 'Settings saved successfully',
    settingsError: 'Error saving settings',
  },

  importExport: {
    importData: 'Import Data',
    exportData: 'Export Data',
    importHistory: 'Import History',
    importStatus: 'Import Status',
    statusPending: 'Pending',
    statusProcessing: 'Processing',
    statusCompleted: 'Completed',
    statusFailed: 'Failed',
    statusPartial: 'Partial Success',
    recordsImported: 'Records Imported',
    recordsFailed: 'Records Failed',
    recordsSkipped: 'Records Skipped',
    totalRecords: 'Total Records',
    validationErrors: 'Validation Errors',
    duplicatesFound: 'Duplicates Found',
    importDate: 'Import Date',
    importedBy: 'Imported By',
    downloadTemplate: 'Download Template',
    downloadErrors: 'Download Errors',
    selectFile: 'Select File',
    mapColumns: 'Map Columns',
    validateData: 'Validate Data',
    confirmImport: 'Confirm Import',
    importInProgress: 'Import in Progress',
    importCompleted: 'Import Completed',
    importFailed: 'Import Failed',
    viewDetails: 'View Details',
    duplicateHandling: 'Duplicate Handling',
    duplicateSkip: 'Skip Duplicates',
    duplicateUpdate: 'Update Existing',
    duplicateCreateNew: 'Create New',
  },

  reports: {
    title: 'Reports',
    subtitle: 'Generate and manage reports',
    generateReport: 'Generate Report',
    scheduleReport: 'Schedule Report',
    reportTemplate: 'Report Template',
    reportType: 'Report Type',
    reportPeriod: 'Report Period',
    reportFormat: 'Report Format',
    formatPDF: 'PDF',
    formatExcel: 'Excel',
    formatWord: 'Word',
    donors: 'Donor Reports',
    internalReports: 'Internal Reports',
    customReports: 'Custom Reports',
    reportDue: 'Due',
    reportOverdue: 'Overdue',
    reportSubmitted: 'Submitted',
    reportApproved: 'Approved',
    reportRejected: 'Rejected',
    submitReport: 'Submit Report',
    approveReport: 'Approve Report',
    rejectReport: 'Reject Report',
    reportComments: 'Comments',
    noReports: 'No reports found',
    viewReport: 'View Report',
    editReport: 'Edit Report',
    deleteReport: 'Delete Report',
  },

  notifications: {
    title: 'Notifications',
    markAsRead: 'Mark as Read',
    markAsUnread: 'Mark as Unread',
    deleteNotification: 'Delete Notification',
    notificationSettings: 'Notification Settings',
    emailNotifications: 'Email Notifications',
    pushNotifications: 'Push Notifications',
    smsNotifications: 'SMS Notifications',
    notifyProjectUpdates: 'Project Updates',
    notifyReportsDue: 'Reports Due',
    notifyBudgetAlerts: 'Budget Alerts',
    notifyApprovals: 'Approvals Required',
    notifyMentions: 'Mentions',
    noNewNotifications: 'No new notifications',
  },

  messages: {
    success: {
      created: 'Created successfully',
      updated: 'Updated successfully',
      deleted: 'Deleted successfully',
      saved: 'Saved successfully',
      imported: 'Imported successfully',
      exported: 'Exported successfully',
      sent: 'Sent successfully',
      approved: 'Approved successfully',
      rejected: 'Rejected successfully',
      published: 'Published successfully',
      archived: 'Archived successfully',
      restored: 'Restored successfully',
    },
    error: {
      generic: 'An error occurred',
      notFound: 'Record not found',
      unauthorized: 'Unauthorized access',
      forbidden: 'Access forbidden',
      serverError: 'Server error',
      networkError: 'Network error',
      validationFailed: 'Validation failed',
      duplicateEntry: 'Duplicate entry',
      missingFields: 'Required fields missing',
      invalidData: 'Invalid data',
      operationFailed: 'Operation failed',
      uploadFailed: 'Upload failed',
      downloadFailed: 'Download failed',
    },
    confirm: {
      delete: 'Are you sure you want to delete this item?',
      deleteMultiple: 'Are you sure you want to delete selected items?',
      archive: 'Are you sure you want to archive this item?',
      restore: 'Are you sure you want to restore this item?',
      submit: 'Are you sure you want to submit?',
      approve: 'Are you sure you want to approve?',
      reject: 'Are you sure you want to reject?',
      logout: 'Are you sure you want to logout?',
      cancelChanges: 'Discard unsaved changes?',
      overwriteData: 'This will overwrite existing data. Continue?',
    },
  },

  deletedRecords: {
    title: 'Deleted Records',
    subtitle: 'View and manage deleted records',
    deletedBy: 'Deleted By',
    deletedDate: 'Deleted Date',
    deletionReason: 'Deletion Reason',
    restoreRecord: 'Restore Record',
    permanentlyDelete: 'Permanently Delete',
    restoreConfirm: 'Are you sure you want to restore this record?',
    permanentDeleteConfirm: 'This action cannot be undone. Permanently delete?',
    noDeletedRecords: 'No deleted records found',
    recordType: 'Record Type',
    recordName: 'Record Name',
    originalId: 'Original ID',
  },

  meal: {
    // General
    moduleTitle: 'MEAL Management',
    moduleSubtitle: 'Monitoring, Evaluation, Accountability & Learning',
    // Surveys
    surveys: 'Surveys',
    surveyName: 'Survey Name',
    surveyType: 'Survey Type',
    surveyStatus: 'Status',
    createSurvey: 'Create Survey',
    editSurvey: 'Edit Survey',
    surveyCreated: 'Survey created successfully',
    surveyUpdated: 'Survey updated successfully',
    surveyDeleted: 'Survey deleted successfully',
    // Indicators
    indicators: 'Indicators',
    indicatorCode: 'Indicator Code',
    indicatorName: 'Indicator Name',
    indicatorType: 'Type',
    indicatorCategory: 'Category',
    indicatorSector: 'Sector',
    indicatorUnit: 'Unit of Measurement',
    indicatorDataSource: 'Data Source',
    indicatorBaseline: 'Baseline',
    indicatorTarget: 'Target',
    indicatorCurrent: 'Current',
    indicatorStatus: 'Status',
    createIndicator: 'Create Indicator',
    editIndicator: 'Edit Indicator',
    addIndicator: 'Add Indicator',
    indicatorCreated: 'Indicator created successfully',
    indicatorUpdated: 'Indicator updated successfully',
    indicatorDeleted: 'Indicator deleted successfully',
    // Data Entry
    dataEntry: 'Data Entry',
    period: 'Period',
    value: 'Value',
    disaggregation: 'Disaggregation',
    notes: 'Notes',
    verified: 'Verified',
    verifiedBy: 'Verified By',
    verifiedAt: 'Verified At',
    // Common
    project: 'Project',
    responsiblePerson: 'Responsible Person',
    collectionFrequency: 'Collection Frequency',
    frequencyMonthly: 'Monthly',
    frequencyQuarterly: 'Quarterly',
    frequencyAnnually: 'Annually',
    frequencyAdhoc: 'Ad-hoc',
    saveError: 'Failed to save. Please try again.',
    loadError: 'Failed to load data. Please refresh.',
    // Extended Indicator Fields
    basicInformation: 'Basic Information',
    classification: 'Classification',
    measurement: 'Measurement',
    dataCollection: 'Data Collection',
    description: 'Description',
    descriptionPlaceholder: 'Describe what this indicator measures...',
    indicatorNamePlaceholder: 'e.g., Number of beneficiaries reached',
    indicatorCodeRequired: 'Indicator code is required',
    indicatorNameRequired: 'Indicator name is required',
    categoryRequired: 'Category is required',
    sectorRequired: 'Sector is required',
    targetRequired: 'Target value is required',
    responsiblePersonRequired: 'Responsible person is required',
    category: 'Category',
    categoryPlaceholder: 'e.g., Service Delivery',
    sector: 'Sector',
    selectSector: 'Select Sector',
    sectorProtection: 'Protection',
    sectorHealth: 'Health',
    sectorEducation: 'Education',
    sectorWASH: 'WASH',
    sectorNutrition: 'Nutrition',
    sectorLivelihoods: 'Livelihoods',
    sectorMultiSector: 'Multi-sector',
    unit: 'Unit',
    unitNumber: 'Number',
    unitPercentage: 'Percentage',
    unitRatio: 'Ratio',
    unitIndex: 'Index',
    baseline: 'Baseline',
    target: 'Target',
    dataSource: 'Data Source',
    sourceManual: 'Manual Entry',
    sourceSurvey: 'Survey',
    sourceAutomatic: 'Automatic',
    sourceExternal: 'External System',
    responsiblePersonPlaceholder: 'Enter responsible person name',
    disaggregationDesc: 'Select how data should be disaggregated',
    disaggregationGender: 'Gender',
    disaggregationAge: 'Age',
    disaggregationLocation: 'Location',
    disaggregationDisability: 'Disability',
    status: 'Status',
    statusActive: 'Active',
    statusInactive: 'Inactive',
    output: 'Output',
    outcome: 'Outcome',
    impact: 'Impact',
  },

  auth: {
    login: 'Login',
    logout: 'Logout',
    email: 'Email',
    password: 'Password',
    rememberMe: 'Remember Me',
    forgotPassword: 'Forgot Password?',
    resetPassword: 'Reset Password',
    welcomeBack: 'Welcome Back',
    loginToContinue: 'Login to continue',
    invalidCredentials: 'Invalid email or password',
    accountLocked: 'Account locked. Contact administrator.',
    sessionExpired: 'Session expired. Please login again.',
    loginSuccess: 'Login successful',
    logoutSuccess: 'Logged out successfully',
    enterEmail: 'Enter your email',
    enterPassword: 'Enter your password',
    passwordReset: 'Password reset link sent',
    checkEmail: 'Check your email for reset instructions',
  },

  // ========== RISK MANAGEMENT ==========
  risk: {
    title: 'Risk Management',
    subtitle: 'Monitor and control operational, financial, and security threats',
    dashboard: 'Risk Dashboard',
    registry: 'Risk Registry',
    incidents: 'Incident Log',
    reports: 'Risk Reports',
    addRisk: 'Add New Risk',
    editRisk: 'Edit Risk',
    reportIncident: 'Report New Incident',
    riskTitle: 'Risk Title',
    category: 'Category',
    likelihood: 'Likelihood',
    impact: 'Impact',
    score: 'Score',
    level: 'Level',
    status: 'Status',
    mitigationPlan: 'Mitigation Plan',
    owner: 'Owner',
    incidentTitle: 'Incident Title',
    severity: 'Severity',
    location: 'Location',
    actionsTaken: 'Actions Taken',
  },

  proposals: {
    // Page Titles
    title: 'Proposal & Pipeline Management',
    subtitle: 'Track funding opportunities, develop proposals, and manage the full project lifecycle from idea to approval',
    pipelineTab: 'Pipeline Opportunities',
    proposalsTab: 'Proposal Development',
    
    // Pipeline Management
    pipelineTitle: 'Pipeline Opportunities Management',
    pipelineSubtitle: 'Identify and track funding opportunities',
    opportunityTitle: 'Opportunity Title',
    donorName: 'Donor Name',
    callReference: 'Call Reference',
    fundingAmount: 'Funding Amount',
    budgetRange: 'Budget Range',
    probability: 'Probability',
    submissionDeadline: 'Submission Deadline',
    opportunityStatus: 'Opportunity Status',
    statusIdentified: 'Identified',
    statusUnderReview: 'Under Review',
    statusMatchedToProposal: 'Matched to Proposal',
    statusNotPursuing: 'Not Pursuing',
    stageIdentified: 'Identified',
    stageUnderReview: 'Under Review',
    stageGoDecision: 'Go Decision',
    stageNoGo: 'No-Go',
    stageConceptRequested: 'Concept Requested',
    stageProposalRequested: 'Proposal Requested',
    addOpportunity: 'Add Opportunity',
    editOpportunity: 'Edit Opportunity',
    deleteOpportunity: 'Delete Opportunity',
    convertToProposal: 'Convert to Proposal',
    
    // Proposal Development
    proposalTitle: 'Proposal Title',
    proposalType: 'Proposal Type',
    typeConceptNote: 'Concept Note',
    typeFullProposal: 'Full Proposal',
    country: 'Country',
    governorate: 'Governorate',
    sector: 'Sector',
    projectDuration: 'Project Duration (months)',
    totalRequestedBudget: 'Total Requested Budget',
    currency: 'Currency',
    proposalStatus: 'Proposal Status',
    statusDraft: 'Draft',
    statusUnderInternalReview: 'Under Internal Review',
    statusSubmitted: 'Submitted',
    statusApproved: 'Approved',
    statusRejected: 'Rejected',
    completionPercentage: 'Completion %',
    createdBy: 'Created By',
    createdAt: 'Created At',
    updatedAt: 'Updated At',
    
    // Actions
    createProposal: 'Create Proposal',
    editProposal: 'Edit Proposal',
    deleteProposal: 'Delete Proposal',
    approveProposal: 'Approve Proposal',
    submitProposal: 'Submit Proposal',
    exportProposal: 'Export Proposal',
    viewProposal: 'View Proposal',
    
    // Dashboard Stats
    totalOpportunities: 'Total Opportunities',
    activeProposals: 'Active Proposals',
    successRate: 'Success Rate',
    totalFundingPipeline: 'Total Funding Pipeline',
    conceptNotesRequested: 'concept notes requested',
    
    // Filters
    filterByStatus: 'Filter by Status',
    filterByDonor: 'Filter by Donor',
    filterByStage: 'Filter by Stage',
    searchOpportunities: 'Search opportunities...',
    searchProposals: 'Search proposals...',
    
    // Messages
    noOpportunities: 'No opportunities found',
    noProposals: 'No proposals found',
    deleteConfirm: 'Are you sure you want to delete this item?',
    approveConfirm: 'Are you sure you want to approve this proposal? It will be converted to a Grant and Project.',
    convertSuccess: 'Proposal converted to Grant and Project successfully!',
    deleteSuccess: 'Item deleted successfully!',
    createSuccess: 'Item created successfully!',
    updateSuccess: 'Item updated successfully!',
    
    // How This Works Section
    howThisWorksTitle: 'How This Works',
    howThisWorksPipeline: 'Pipeline:',
    howThisWorksPipelineDesc: 'Track funding opportunities before writing proposals (Go/No-Go decisions)',
    howThisWorksProposals: 'Proposals:',
    howThisWorksProposalsDesc: 'Develop full proposals IN-SYSTEM with structured forms',
    howThisWorksWorkflow: 'Workflow:',
    howThisWorksWorkflowDesc: 'Pipeline → Concept Note → Full Proposal → Submission → Approval → Project Creation',
    howThisWorksExport: 'Export:',
    howThisWorksExportDesc: 'Generate PDF and Word documents from structured data',
    howThisWorksTemplates: 'Templates:',
    howThisWorksTemplatesDesc: 'Pre-configured templates for national and international organizations',
  },

  // ========== FORECAST PLAN ==========
  forecastPlan: {
    // Page Title & Description
    title: 'Forecast Plan',
    subtitle: 'Monthly financial planning for the project',
    
    // Action Buttons
    reinitialize: 'Reinitialize',
    print: 'Print',
    import: 'Import',
    exportExcel: 'Export Excel',
    export: 'Export',
    
    // KPI / Summary Cards
    balance: 'Balance',
    actualSpent: 'Actual Spent',
    totalForecast: 'Total Forecast',
    totalBudget: 'Total Budget',
    
    // Alerts & Warnings
    balanceWarning: 'Balance Warning',
    balanceWarningBody: 'budget line(s) forecasted at >90% of remaining balance',
    varianceAlert: 'Variance Alert',
    varianceAlertBody: 'budget line(s) exceeded forecast (actual spending higher than planned)',
    forecastExceedsBalance: 'Forecast exceeds available balance',
    
    // Fiscal Year Tabs
    fiscalYear: 'FY',
    
    // Table Headers
    activityCode: 'Activity Code',
    activity: 'Activity',
    budgetCode: 'Budget Code',
    subBL: 'Sub-BL',
    budgetItem: 'Budget Item',
    prevYearBalance: 'Prev Year Balance',
    month1: 'M1',
    month2: 'M2',
    month3: 'M3',
    month4: 'M4',
    month5: 'M5',
    month6: 'M6',
    month7: 'M7',
    month8: 'M8',
    month9: 'M9',
    month10: 'M10',
    month11: 'M11',
    month12: 'M12',
    
    // Empty States / System Messages
    noForecastData: 'No forecast data found',
    noBudgetItems: 'No Budget Items Found',
    noActivitiesLinked: 'No activities linked',
    loadingForecast: 'Loading forecast plan...',
    forecastNotInitialized: 'Forecast Plan Not Initialized',
    initializeForecastPrompt: 'Generate a forecast plan for the selected year to view and edit monthly forecasts.',
    initializeForecastButton: 'Initialize Forecast Plan for',
    initializing: 'Initializing...',
    
    // Import/Export
    importSuccess: 'Import successful',
    importFailed: 'Import failed',
    forecastsUpdated: 'forecasts updated',
    forecastsSkipped: 'skipped',
    
    // Additional keys for modal and warnings
    budgetLinesWarning: 'budget line(s) forecasted at >90% of remaining balance',
    budgetLinesExceeded: 'budget line(s) exceeded forecast (actual spending higher than planned)',
    viewOnlyMode: 'View-Only Mode',
    viewOnlyModeDesc: 'Only administrators can edit forecast values. Contact your administrator if you need to make changes.',
    importForecastPlan: 'Import Forecast Plan',
    importForecastDesc: 'Upload Excel file with monthly forecast values',
    selectExcelFile: 'Select Excel File',
    dataPreview: 'Data Preview',
    rows: 'rows',
    andMoreRows: '...and {count} more rows',
    allowDuplicates: 'Allow Duplicates?',
    allowDuplicatesDesc: 'If forecasts already exist for these items, do you want to replace them or skip?',
    skipDuplicates: 'Skip Duplicates',
    replaceExisting: 'Replace Existing',
    cancel: 'Cancel',
  },
};

// ========== ARABIC TRANSLATIONS ==========
export const ar: Translations = {
  common: {
    loading: 'جاري التحميل...',
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    add: 'إضافة',
    create: 'إنشاء',
    update: 'تحديث',
    search: 'بحث',
    filter: 'تصفية',
    export: 'تصدير',
    import: 'استيراد',
    download: 'تنزيل',
    upload: 'رفع',
    submit: 'إرسال',
    confirm: 'تأكيد',
    close: 'إغلاق',
    back: 'رجوع',
    next: 'التالي',
    previous: 'السابق',
    yes: 'نعم',
    no: 'لا',
    all: 'الكل',
    none: 'لا شيء',
    select: 'اختر',
    selected: 'محدد',
    clear: 'مسح',
    reset: 'إعادة تعيين',
    apply: 'تطبيق',
    view: 'عرض',
    actions: 'إجراءات',
    status: 'الحالة',
    date: 'التاريخ',
    name: 'الاسم',
    description: 'الوصف',
    type: 'النوع',
    total: 'المجموع',
    success: 'نجح',
    error: 'خطأ',
    warning: 'تحذير',
    info: 'معلومات',
    required: 'مطلوب',
    optional: 'اختياري',
    active: 'نشط',
    inactive: 'غير نشط',
    enabled: 'مفعّل',
    disabled: 'معطّل',
    showMore: 'عرض المزيد',
    showLess: 'عرض أقل',
    noData: 'لا توجد بيانات متاحة',
    noResults: 'لم يتم العثور على نتائج',
    searchPlaceholder: 'بحث...',
    loadingData: 'جاري تحميل البيانات...',
    savingChanges: 'جاري حفظ التغييرات...',
    savedSuccessfully: 'تم الحفظ بنجاح',
    errorOccurred: 'حدث خطأ',
    tryAgain: 'حاول مرة أخرى',
    refresh: 'تحديث',
    print: 'طباعة',
    share: 'مشاركة',
    copy: 'نسخ',
    paste: 'لصق',
    duplicate: 'تكرار',
    archive: 'أرشفة',
    restore: 'استعادة',
    manage: 'إدارة',
    settings: 'الإعدادات',
    help: 'مساعدة',
    logout: 'تسجيل خروج',
    profile: 'الملف الشخصي',
    today: 'اليوم',
    yesterday: 'أمس',
    thisWeek: 'هذا الأسبوع',
    thisMonth: 'هذا الشهر',
    thisYear: 'هذا العام',
    customRange: 'نطاق مخصص',
    from: 'من',
    to: 'إلى',
    between: 'بين',
    equals: 'يساوي',
    contains: 'يحتوي على',
    startsWith: 'يب��أ بـ',
    endsWith: 'ينتهي بـ',
  },

  navigation: {
    dashboard: 'لوحة التحكم',
    organizations: 'المنظمات',
    grants: 'المنح',
    projects: 'المشاريع',
    finance: 'المالية',
    meal: 'المتابعة والتقييم',
    surveys: 'الاستبيانات',
    cases: 'الحالات',
    documents: 'الوثائق',
    importHistory: 'سجل الاستيراد',
    deletedRecords: 'السجلات المحذوفة',
    settings: 'الإعدادات',
    reporting: 'التقارير',
    proposals: 'المقترحات',
  },

  header: {
    switchOrganization: 'تبديل المنظمة',
    currentOrganization: 'المنظمة الحالية',
    switchLanguage: 'تغيير اللغة',
    languageEn: 'English',
    languageAr: 'العربية',
    userMenu: 'قائمة الم��تخدم',
    viewProfile: 'عرض الملف الشخصي',
    accountSettings: 'إعدادات الحساب',
    logoutConfirm: 'هل أنت متأكد من تسجيل الخروج؟',
    notifications: 'الإشعارات',
    noNotifications: 'لا توجد إشعارات جديدة',
    markAllRead: 'تحديد الكل كمقروء',
    projectsManagement: 'نظام الإدارة المتكامل (IMS)',
    ltr: 'LTR',
    rtl: 'RTL',
  },

  sidebar: {
    collapseSidebar: 'طي الشريط الجانبي',
    expandSidebar: 'توسيع الشريط الجانبي',
    mainMenu: 'القائمة الرئيسية',
    administration: 'الإدارة',
  },

  platform: {
    dashboard: {
      title: 'لوحة تحكم المنصة',
      subtitle: 'الإدارة والمراقبة على مستوى النظام',
      accessRestrictionTitle: 'صلاحية إدارة المنصة',
      accessRestrictionDesc: 'هذه اللوحة مخصصة لمسؤولي المنصة فقط. يمكنك عرض وإدارة جميع المنظمات والمستخدمين وإعدادات النظام من هنا.',
      totalOrganizations: 'إجمالي المنظمات',
      totalUsers: 'إجمالي المستخدمين',
      platformUsers: 'مستخدمو المنصة',
      orgUsers: 'مستخدمو المنظمات',
      microsoft365: 'مايكروسوفت 365',
      ready: 'جاهز',
      entraReady: 'Entra ID جاهز',
      systemHealth: 'صحة النظام',
      healthy: 'سليم',
      allSystemsOperational: 'جميع الأنظمة تعمل بشكل طبيعي',
      quickActions: 'إجراءات سريعة',
      viewAllOrganizations: 'عرض جميع المنظمات',
      viewAllOrganizationsDesc: 'إدارة ومراقبة جميع المنظمات المسجلة',
      manageIntegrations: 'إدارة التكاملات',
      manageIntegrationsDesc: 'تكوين اتصالات الخدمات الخارجية',
      viewAuditLogs: 'عرض سجلات التدقيق',
      viewAuditLogsDesc: 'مراجعة نشاط النظام وأحداث الأمان',
      platformActivity: 'نشاط المنصة',
      platformActivityDesc: 'نشاط المستخدمين وأحداث النظام عبر الزمن',
      activityChartComingSoon: 'مخطط النشاط قريباً',
      phase1Analytics: 'المرحلة 1 - لوحة التحليلات',
      organizations: 'نظرة عامة على المنظمات',
      organizationsDesc: 'جميع المنظمات المسجلة في النظام',
      orgName: 'اسم المنظمة',
      orgCode: 'الرمز',
      orgStatus: 'الحالة',
      orgProjects: 'المشاريع',
      orgActions: 'الإجراءات',
      viewOrg: 'عرض',
      noOrganizations: 'لم يتم العثور على منظمات',
    },
    organizationManagement: 'إدارة المنظمات',
    platformSettings: 'إعدادات المنصة',
    sidebarTitle: 'إدارة المنصة',
    sidebarSubtitle: 'الإدارة على مستوى النظام',
    organizationDetail: {
      title: 'تفاصيل المنظمة',
      statistics: 'إحصائيات المنظمة',
      statisticsDescription: 'المقاييس الرئيسية ومؤشرات الأداء',
      totalUsers: 'إجمالي المستخدمين',
      activeProjects: 'المشاريع النشطة',
      budgetAllocation: 'تخصيص الميزانية',
      comingSoon: 'قريباً',
      organizationInfo: 'معلومات المنظمة',
      country: 'الدولة',
      domain: 'النطاق',
      timezone: 'المنطقة الزمنية',
      currency: 'العملة',
      createdAt: 'تاريخ الإنشاء',
      lastUpdated: 'آخر تحديث',
      operatingUnits: 'وحدات التشغيل',
      operatingUnitsCount: 'وحدة تشغيل',
      backToOrganizations: 'العودة إلى المنظمات',
    },
  },

  organization: {
    dashboard: {
      operatingUnitContext: 'سياق وحدة التشغيل',
      compliance: 'الامتثال',
      activeGrants: 'المنح النشطة',
      activeProjects: 'المشاريع النشطة',
      acrossAllPrograms: 'عبر جميع البرامج',
      totalEmployees: 'إجمالي الموظفين',
      fullTimeStaff: 'موظفون بدوام كامل',
      totalBudget: 'إجمالي الميزانية',
      allocatedFunds: 'الأموال المخصصة',
      grantExecution: 'تنفيذ المنح',
      onTrack: 'على المسار',
      complianceAlerts: 'تنبيهات الامتثال',
      complianceAlertsDesc: 'عناصر تتطلب الانتباه',
      highPriority: 'أولوية عالية',
      mediumPriority: 'أولوية متوسطة',
      daysAgo: 'أيام مضت',
      reportOverdue: 'تقرير متأخر',
      reportOverdueDesc: 'تقديم التقرير المالي للربع الرابع معلق',
      budgetReview: 'مراجعة الميزانية',
      budgetReviewDesc: 'مراجعة الميزانية السنوية مجدولة',
      projectPipeline: 'خط المشاريع',
      projectPipelineDesc: 'المشاريع النشطة والقادمة',
      waterSanitation: 'المياه والصرف الصحي',
      waterSanitationDesc: 'برنامج الوصول للمياه الريفية',
      progress: 'التقدم',
      budget: 'الميزانية',
      endDate: 'تاريخ الانتهاء',
      educationSupport: 'دعم التعليم',
      educationSupportDesc: 'تطوير البنية التحتية للمدارس',
      inProgress: 'قيد التنفيذ',
    },
  },

  dashboard: {
    title: 'لوحة التحكم',
    subtitle: 'مرحباً بك في نظام الإدارة المتكامل (IMS)',
    welcome: 'مرحباً',
    overview: 'نظرة عامة',
    quickStats: 'إحصائيات سريعة',
    recentActivity: 'النشاط الأخير',
    upcomingTasks: 'المهام القادمة',
    alerts: 'التنبيهات',
    totalProjects: 'إجمالي المشاريع',
    activeProjects: 'المشاريع النشطة',
    completedProjects: 'المشاريع المكتملة',
    onHoldProjects: 'معلقة',
    totalBudget: 'الميزانية الإجمالية',
    spentBudget: 'المصروف',
    remainingBudget: 'المتبقي',
    budgetUtilization: 'استخدام الميزانية',
    totalBeneficiaries: 'إجمالي المستفيدين',
    directBeneficiaries: 'مباشر',
    indirectBeneficiaries: 'غير مباشر',
    reportsOverdue: 'تقارير متأخرة',
    reportsDueThisWeek: 'مطلوبة هذا الأسبوع',
    reportsSubmitted: 'مقدمة',
    projectsByStatus: 'المشاريع حسب الحالة',
    projectsByDonor: 'المشاريع حسب الممول',
    budgetByProject: 'الميزانية حسب المشروع',
    beneficiariesByProject: 'المستفيدون حسب المشروع',
    viewAllProjects: 'عرض جميع المشاريع',
    viewAllReports: 'عرض جميع التقارير',
    noActiveProjects: 'لا توجد مشاريع نشطة',
    noRecentActivity: 'لا يوجد نشاط حديث',
    lastUpdated: 'آخر تحديث',
    refreshDashboard: 'تحديث لوحة التحكم',
  },

  projects: {
    title: 'المشاريع',
    subtitle: 'إدارة جميع المشاريع',
    createNew: 'إنشاء مشروع جديد',
    editProject: 'تعديل المشروع',
    deleteProject: 'حذف المشروع',
    deleteConfirm: 'هل أنت متأكد من حذف هذا المشروع؟',
    projectDetails: 'تفاصيل المشروع',
    projectInfo: 'معلومات المشروع',
    projectCode: 'رمز ال��شروع',
    projectName: 'اسم المشروع',
    projectDescription: 'وصف المشروع',
    startDate: 'تاريخ البدء',
    endDate: 'تاريخ الانتهاء',
    duration: 'المدة',
    donor: 'الممول',
    grantId: 'رقم المنحة',
    budget: 'الميزانية',
    totalBudget: 'الميزانية الإجمالية',
    spentAmount: 'المبلغ المصروف',
    remainingAmount: 'المتبقي',
    status: 'الحالة',
    statusActive: 'نشط',
    statusCompleted: 'مكتمل',
    statusOnHold: 'معلق',
    statusPlanning: 'قيد التخطيط',
    statusClosed: 'مغلق',
    priority: 'الأولوية',
    priorityHigh: 'عالية',
    priorityMedium: 'متوسطة',
    priorityLow: 'منخفضة',
    manager: 'المدير',
    team: 'الفريق',
    location: 'الموقع',
    locations: 'المواقع',
    sector: 'القطاع',
    sectors: 'القطاعات',
    beneficiaries: 'المستفيدون',
    directBeneficiaries: 'مستفيدون مباشرون',
    indirectBeneficiaries: 'مستفيدون غير مباشرين',
    beneficiaryTypes: 'أنواع المستفيدين',
    objectives: 'الأهداف',
    activities: 'الأنشطة',
    milestones: 'المعالم',
    deliverables: 'المخرجات',
    risks: 'المخاطر',
    documents: 'الوثائق',
    reporting: 'التقارير',
    financials: 'الماليات',
    progress: 'التقدم',
    progressPercent: 'نسبة التقدم',
    timeline: 'الجدول الزمني',
    created: 'تاريخ الإنشاء',
    createdBy: 'أنشئ بواسطة',
    modified: 'تاريخ التعديل',
    modifiedBy: 'عُدّل بواسطة',
    noProjects: 'لم يتم العثور على مشاريع',
    noProjectsDesc: 'ابدأ بإنشاء مشروعك الأول',
    createFirstProject: 'إنشاء أول مش��وع',
    searchProjects: 'بحث عن المشاريع...',
    filterByStatus: 'تصفية حسب الحالة',
    filterByDonor: 'تصفية حسب الممول',
    filterByDate: 'تصفية حسب التاريخ',
    sortBy: 'ترتيب حسب',
    sortByName: 'الاسم',
    sortByDate: 'التاريخ',
    sortByBudget: 'الميزانية',
    sortAZ: 'أ-ي',
    sortZA: 'ي-أ',
    sortNewestFirst: 'الأحدث أولاً',
    sortOldestFirst: 'الأقدم أولاً',
    exportList: 'تصدير القائمة',
    importProjects: 'استيراد المشاريع',
    bulkActions: 'إجراءات جماعية',
    selectedProjects: 'المشاريع المحددة',
    // Project Dashboard Specific
    dashboardTitle: 'لوحة إدارة المشاريع',
    dashboardSubtitle: 'نظرة شاملة على جميع المشاريع والميزانيات ومؤشرات الأداء',
    grantManagement: 'إدارة المنح',
    grantManagementDesc: 'إدارة وتتبع المنح بفعالية',
    reportingSchedule: 'جدول التقارير',
    reportingScheduleDesc: 'عرض وإدارة مواعيد تسليم التقارير',
    proposalPipeline: 'مسار المقترحات',
    proposalPipelineDesc: 'تتبع المقترحات من التقديم إلى الموافقة',
    activePrograms: 'البرامج الجارية',
    activeProgramsDesc: 'مشاريع قيد التنفيذ',
    active: 'جارٍ',
    opportunities: 'فرص تمويل',
    totalBudgetUSD: 'إجمالي الميزانية (دولار أمريكي)',
    actualSpentUSD: 'الإنفاق الفعلي (دولار أمريكي)',
    balanceUSD: 'الرصيد المتبقي (دولار أمريكي)',
    avgCompletionRate: 'متوسط نسبة الإنجاز',
    ongoingProjectsOnly: 'المشاريع الجارية فقط',
    allOngoingProjects: 'جميع المشاريع الجارية',
    fromFinanceOverview: 'من لوحة الماليات',
    budgetMinusSpent: 'الميزانية - الإنفاق',
    projectList: 'قائمة المشاريع',
    exportToExcel: 'تصدير إلى Excel',
    exportTemplate: 'تصدير النموذج',
    importExcel: 'استيراد Excel',
    addNewProject: 'إضافة مشروع جديد',
    searchByTitle: 'البحث بعنوان المشروع',
    viewDetails: 'عرض التفاصيل',
    updateProject: 'تحديث',
    notAvailable: 'غير متوفر',
    budgetUtilization: 'استهلاك الميزانية',
    currency: 'العملة',
    spent: 'المصروف',
    balance: 'الرصيد',
    all: 'الكل',
    statusOngoing: 'جارٍ',
    statusPlanned: 'مخطط',
    statusNotStarted: 'لم يبدأ',
    statusSuspended: 'معلق',
    submitted: 'مُقدَّم',
    approved: 'مُعتمَد',
    upcoming: 'قادم',
    // Create Project Form
    createNewProject: 'إنشاء مشروع جديد',
    fillProjectDetails: 'أدخل تفاصيل المشروع للبدء',
    basicInformation: 'المعلومات الأساسية',
    coreProjectDetails: 'تفاصيل المشروع الأساسية والتعريف',
    projectTitleEN: 'عنوان المشروع',
    projectTitleAR: 'عنوان المشروع (عربي)',
    enterProjectTitle: 'Enter project title',
    enterProjectTitleAR: 'أدخل عنوان المشروع',
    projectCodePlaceholder: 'مثال: PROJ-2025-001',
    associatedGrant: 'المنحة المرتبطة',
    selectGrant: 'اختر منحة',
    locationDetails: 'الموقع والتفاصيل',
    projectLocationDesc: 'موقع المشروع والمعلومات الوصفية',
    locationEN: 'الموقع',
    locationAR: 'الموقع (عربي)',
    locationPlaceholder: 'City, Region, Country',
    locationPlaceholderAR: 'المدينة، المنطقة، البلد',
    descriptionEN: 'الوصف',
    descriptionAR: 'الوصف (عربي)',
    descriptionPlaceholder: 'Describe the project purpose and scope',
    descriptionPlaceholderAR: 'وصف غرض المشروع ونطاقه',
    objectivesEN: 'الأهداف',
    objectivesAR: 'الأهداف (عربي)',
    objectivesPlaceholder: 'List key project objectives',
    objectivesPlaceholderAR: 'قائمة أهداف المشروع الرئيسية',
    projectManagement: 'إدارة المشروع',
    managementBeneficiaryInfo: 'معلومات الإدارة والمستفيدين',
    projectManager: 'مدير المشروع',
    projectManagerPlaceholder: 'Name of project manager',
    targetBeneficiaryCount: 'عدد المستفيدين المستهدف',
    beneficiaryCountPlaceholder: 'Expected number of beneficiaries',
    cancel: 'إلغاء',
    createProject: 'إنشاء المشروع',
    projectCreationPending: 'سيتم ربط وظيفة إنشاء المشروع بواجهة برمجة التطبيقات الخلفية',
    tabs: {
      overview: 'نظرة عامة',
      team: 'الفريق',
      budget: 'الميزانية',
      beneficiaries: 'المستفيدون',
      locations: 'المواقع',
      activities: 'الأنشطة',
      reporting: 'التقارير',
      documents: 'الوثائق',
      timeline: 'الجدول الزمني',
      settings: 'الإعدادات',
    },
  },

  projectDetail: {
    backToProjects: 'العودة إلى المشاريع',
    editProject: 'تعديل المشروع',
    projectCode: 'رمز المشروع',
    donorGrant: 'الممول/المنحة',
    description: 'الوصف',
    daysRemaining: 'يوماً متبقياً',
    // Tab Labels
    tabProgramsOverview: 'نظرة عامة على البرامج',
    tabViewAllActivities: 'جميع الأنشطة',
    tabTasksMgt: 'إدارة المهام',
    tabProjectIndicators: 'مؤشرات المشروع',
    tabBeneficiaries: 'المستفيدون',
    tabFinancialOverview: 'النظرة المالية',
    tabForecastPlan: 'خطة التوقعات',
    tabProcurementPlan: 'خطة المشتريات',
    tabCaseManagement: 'إدارة الحالات',
    tabProjectReport: 'التقارير', // SHORTENED from "تقرير المشروع" to fit tabs in one row
    tabProjectPlan: 'خطة المشروع',
    // Procurement Plan
    procurementPlanTitle: 'خطة المشتريات',
    procurementPlanSubtitle: 'تخطيط وإدارة أنشطة المشتريات مع مراقبة الميزانية وتتبع الامتثال.',
    procurementPlanPeriod: 'فترة خطة المشتريات',
    itemDescription: 'وصف الصنف / الخدمة',
    procurementCategory: 'الفئة',
    quantityLabel: 'الكمية',
    unitOfMeasure: 'وحدة القياس',
    estimatedUnitCost: 'التكلفة التقديرية للوحدة',
    estimatedTotalCost: 'التكلفة التقديرية الإجمالية',
    procurementMethod: 'طريقة الشراء',
    procurementType: 'نوع المشتريات',
    plannedStartDate: 'تاريخ البدء المخطط',
    plannedEndDate: 'تاريخ الانتهاء المخطط',
    responsibleDepartment: 'الجهة المسؤولة',
    addProcurementItem: 'إضافة عنصر مشتريات',
    editProcurementItem: 'تعديل عنصر المشتريات',
    noProcurementItemsFound: 'لم يتم العثور على عناصر مشتريات',
    searchProcurementItems: 'البحث في عناصر المشتريات...',
    totalProcurementItems: 'إجمالي العناصر',
    totalEstimatedCost: 'التكلفة التقديرية الإجمالية',
    remainingBudget: 'الميزانية المتبقية',
    budgetExceededWarning: 'تحذير: التكلفة الإجمالية تتجاوز الميزانية المتاحة',
    // Procurement Categories
    categoryGoods: 'سلع',
    categoryServices: 'خدمات',
    categoryWorks: 'أشغال',
    // Procurement Methods
    methodDirectProcurement: 'شراء مباشر',
    methodRFQ: 'طلب عرض سعر',
    methodNationalBidding: 'مناقصة وطنية',
    methodInternationalBidding: 'مناقصة دولية',
    methodLTA: 'اتفاقية طويلة الأجل',
    methodEmergency: 'شراء طارئ',
    methodOneQuotation: 'عرض سعر واحد',
    methodThreeQuotation: 'ثلاثة عروض أسعار',
    methodNegotiable: 'قابل للتفاوض',
    methodTender: 'مناقصة',
    categoryConsultancy: 'استشارات',
    activityName: 'النشاط',
    noProcurementItems: 'لا توجد عناصر مشتريات',
    // Procurement Types
    typeOneTime: 'مرة واحدة',
    typeFramework: 'اتفاقية إطار',
    typeRecurrent: 'متكرر',
    // Procurement Status
    statusPlanned: 'مخطط',
    statusSubmitted: 'مقدم',
    statusApproved: 'معتمد',
    statusInProgress: 'قيد التنفيذ',
    statusCompleted: 'مكتمل',
    statusCancelled: 'ملغى',
    // Departments
    deptProgram: 'البرامج',
    deptLogistics: 'اللوجستيات',
    deptProcurement: 'المشتريات',
    deptFinance: 'المالية',
    deptMEAL: 'المتابعة والتقييم',
    deptOther: 'أخرى',
    // Overview Tab
    overviewStatActivities: 'الأنشطة',
    overviewStatIndicators: 'المؤشرات',
    overviewStatBeneficiaries: 'المستفيدون',
    overviewStatBudgetUtilization: 'استخدام الميزانية',
    overviewBudgetSubtitle: 'من إجمالي الميزانية المُنفقة',
    overviewKeyActivities: 'الأنشطة الرئيسية',
    overviewProjectTimeline: 'الجدول الزمني للمشروع',
    overviewTimelineVisualization: 'عرض الجدول الزمني',
    noActivitiesYet: 'لا توجد أنشطة بعد',
    noDescriptionProvided: 'لا يوجد وصف متاح',
    // Activities Tab
    activitiesPageTitle: 'أنشطة المشروع',
    activitiesPageSubtitle: 'إدارة ومتابعة جميع أنشطة المشروع',
    activityCode: 'رمز النشاط',
    activityTitle: 'اسم النشاط',
    activityDescription: 'الوصف',
    activityStatus: 'الحالة',
    activityStartDate: 'تاريخ البدء',
    activityEndDate: 'تاريخ الانتهاء',
    activityDuration: 'المدة',
    activityBudget: 'الميزانية',
    activitySpent: 'المُنفَق',
    activityCompletion: 'نسبة الإنجاز',
    activityProgress: 'التقدم',
    activityResponsible: 'الشخص المسؤول',
    activityLocation: 'الموقع',
    activityStatusNotStarted: 'لم يبدأ',
    activityStatusInProgress: 'قيد التنفيذ',
    activityStatusCompleted: 'مكتمل',
    activityStatusOnHold: 'معلق',
    activityStatusCancelled: 'مُلغى',
    addActivity: 'إضافة نشاط',
    editActivity: 'تعديل النشاط',
    deleteActivity: 'حذف النشاط',
    viewActivity: 'عرض النشاط',
    addNewActivity: 'إضافة نشاط جديد',
    exportActivities: 'تصدير إلى Excel',
    exportActivitiesTemplate: 'تصدير نموذج',
    importActivities: 'استيراد Excel',
    timelineView: 'عرض زمني',
    tableView: 'عرض جدولي',
    totalActivities: 'إجمالي الأنشطة',
    inProgress: 'قيد التنفيذ',
    completed: 'مكتمل',
    totalBudget: 'إجمالي الميزانية',
    searchActivities: 'البحث عن الأنشطة بالاسم أو الرمز أو الشخص المسؤول...',
    noActivitiesFound: 'لم يتم العثور على أنشطة. انقر على "إضافة نشاط" لإنشاء واحد.',
    activityCodeRequired: 'رمز النشاط*',
    activityTitleRequired: 'اسم النشاط*',
    confirmDeleteActivity: 'هل أنت متأكد من حذف النشاط "{0}"؟ لا يمكن التراجع عن هذا الإجراء.',
    activityCreatedSuccess: 'تم إنشاء النشاط بنجاح!',
    activityUpdatedSuccess: 'تم تحديث النشاط بنجاح!',
    activityDeletedSuccess: 'تم حذف النشاط بنجاح!',
    importActivitiesTitle: 'استيراد الأنشطة من Excel',
    importActivitiesDesc: 'قم بتحميل ملف Excel يحتوي على بيانات الأنشطة. تأكد من استخد��م تنسيق النموذج الصحيح.',
    fillRequiredFields: 'الرجاء ملء جميع الحقول المطلوبة',
    successfullyImported: 'تم استيراد {0} نشاط بنجاح!',
    code: 'الرمز',
    title: 'اسم النشاط',
    responsible: 'المسؤول',
    actions: 'الإجراءات',
    // Tasks Tab
    tasksPageTitle: 'مهام المشروع',
    tasksPageSubtitle: 'إدارة المهام والتعيينات والمواعيد النهائية',
    taskCode: 'رمز المهمة',
    taskTitle: 'عنوان المهمة',
    taskStatus: 'الحالة',
    taskPriority: 'الأولوية',
    taskAssignedTo: 'مُعيَّن إلى',
    taskDueDate: 'تاريخ الاستحقاق',
    taskEstimatedHours: 'الساعات المُقدَّرة',
    taskActualHours: 'الساعات الفعلية',
    taskStatusToDo: 'قيد الانتظار',
    taskStatusInProgress: 'قيد التنفيذ',
    taskStatusReview: 'قيد المراجعة',
    taskStatusCompleted: 'مكتملة',
    taskPriorityLow: 'منخفضة',
    taskPriorityMedium: 'متوسطة',
    taskPriorityHigh: 'عالية',
    taskPriorityUrgent: 'عاجلة',
    addTask: 'إضافة مهمة',
    editTask: 'تعديل المهمة',
    addNewTask: 'إضافة مهمة جديدة',
    kanbanView: 'عرض كانبان',
    totalTasks: 'إجمالي المهام',
    totalHoursEst: 'إجمالي الساعات (مُقدَّرة)',
    searchTasks: 'البحث عن المهام بالعنوان أو الرمز أو المُعيَّن...',
    noTasksFound: 'لم يت�� ��لعثور على مهام. انقر على "إضافة مهمة" لإنشاء واحدة.',
    noTasks: 'لا توجد مهام',
    taskCodeRequired: 'رمز المهمة*',
    taskTitleRequired: 'عنوان المهمة*',
    taskCreatedSuccess: 'تم إنشاء المهمة بنجاح!',
    taskUpdatedSuccess: 'تم تحديث المهمة بنجاح!',
    taskDeletedSuccess: 'تم حذف المهمة بنجاح!',
    importTasksTitle: 'استيراد المهام من Excel',
    importTasksDesc: 'قم بتحميل ملف Excel يحتوي على بيانات المهام. تأكد من استخدام تنسيق النموذج الصحيح.',
    confirmDeleteTask: 'هل أنت متأكد من حذف المهمة "{0}"؟ لا يمكن التراجع عن هذا الإجراء.',
    hours: 'ساعات',
    // Indicators Tab
    indicatorsPageTitle: 'مؤشرات المشروع',
    indicatorsPageSubtitle: 'تتبع ومراقبة مؤشرات الأداء الرئيسية',
    indicatorCode: 'رمز المؤشر',
    indicatorTitle: 'عنوان المؤشر',
    indicatorType: 'النوع',
    indicatorUnit: 'الوح��ة',
    indicatorBaseline: 'القيمة الأساسية',
    indicatorTarget: 'الهدف',
    indicatorAchieved: 'المُنجَز',
    indicatorTypeOutput: 'مُخرَج',
    indicatorTypeOutcome: 'نتيجة',
    indicatorTypeImpact: 'أثر',
    addIndicator: 'إضافة مؤشر',
    totalIndicators: 'إجمالي المؤشرات',
    searchIndicators: 'البحث عن المؤشرات...',
    noIndicatorsFound: 'لم يتم العثور على مؤشرات.',
    // Beneficiaries Tab  
    beneficiariesPageTitle: 'مستفيدو المشروع',
    beneficiariesPageSubtitle: 'إدارة ومتابعة معلومات المستفيدين',
    beneficiaryId: 'رقم المستفيد',
    fullName: 'الاسم الكامل',
    gender: 'الجنس',
    genderMale: 'ذكر',
    genderFemale: 'أنثى',
    genderOther: 'آخر',
    genderPreferNotToSay: 'أفضل عدم الإفصاح',
    ageGroup: 'الفئة العمرية',
    ageGroup05: 'أطفال (0-5)',
    ageGroup617: 'شباب (6-17)',
    ageGroup1859: 'بالغون (18-59)',
    ageGroup60Plus: 'كبار السن (60+)',
    beneficiaryType: 'نوع المستفيد',
    beneficiaryTypeDirect: 'مباشر',
    beneficiaryTypeIndirect: 'غير مباشر',
    beneficiaryFullName: 'الاسم الكامل',
    vulnerability: 'الفئة الضعيفة',
    district: 'المديرية',
    governorate: 'المحافظة',
    registrationDate: 'تاريخ التسجيل',
    phone: 'الهاتف',
    age: 'العمر',
    registerBeneficiary: 'تسجيل مستفيد',
    allGenders: 'جميع الأجناس',
    allAgeGroups: 'جميع الفئات العمرية',
    allTypes: 'جميع الأنواع',
    genderDisaggregation: 'التصنيف حسب الجنس',
    ageDisaggregation: 'التصنيف حسب العمر',
    children: 'أطفال (0-17)',
    adults: 'بالغون (18-59)',
    elderly: 'كبار السن (60+)',
    locations: 'المواقع',
    uniqueLocations: 'عدد المواقع المغطاة',
    activity: 'النشاط',
    noBeneficiariesFound: 'لم يتم العثور على مستفيدين.',
    addBeneficiary: 'إضافة مستفيد',
    totalBeneficiaries: 'إجمالي المستفيدين',
    searchBeneficiaries: 'البحث عن المستفيدين...',
    // Financial Tab
    financialPageTitle: 'النظرة المالية',
    financialPageSubtitle: 'مراقبة تنفيذ الميزانية والنفقات',
    budgetCode: 'رمز الميزانية',
    budgetItem: 'بند الميزانية',
    subItem: 'البند الفرعي',
    approvedBudget: 'الميزانية المُعتمدة',
    totalApprovedBudget: 'إجمالي الميزانية المُعتمدة',
    actualSpent: 'المُنفَق الفعلي',
    spent: 'تم الإنفاق',
    committed: 'ملتزم به',
    committedFunds: 'الأموال الملتزم بها',
    balance: 'الرصيد',
    remainingBalance: 'الرصيد المتبقي',
    variance: 'نسبة الانحراف %',
    burnRate: 'معدل الإنفاق',
    burnRateOnTrack: 'ضمن المسار',
    burnRateMonitor: 'مراقبة',
    burnRateCritical: 'حرج',
    budgetLines: 'بنود الميزانية',
    budgetLinesSubtitle: 'شبكة شبيهة بـ Excel مع الميزانية المعتمدة والنفقات وتتبع الانحراف',
    addBudgetLine: 'إضافة بند ميزانية',
    noBudgetLines: 'لم تتم إضافة بنود ميزانية بعد',
    addBudgetLinePrompt: 'انقر على "إضافة بند ميزانية" للبدء',
    budgetTemplate: 'نموذج الميزانية',
    importBudgetLines: 'استيراد بنود الميزانية',
    deleteBudgetLineConfirm: 'هل أنت متأكد من حذف بند الميزانية هذا؟ لا يمكن التراجع عن هذا الإجراء.',
    approved: 'معتمد',
  },

  finance: {
    title: 'المالية',
    subtitle: 'الإدارة المالية والمتابعة',
    chartOfAccounts: 'دليل الحسابات',
    budgets: 'الميزانيات',
    expenditures: 'النفقات',
    transactions: 'المعاملات',
    reports: 'التقارير',
    accountCode: 'رمز الحساب',
    accountName: 'اسم الحساب',
    accountType: 'نوع الحساب',
    accountTypeAsset: 'أصل',
    accountTypeLiability: 'التزام',
    accountTypeEquity: 'حقوق ملكية',
    accountTypeRevenue: 'إيراد',
    accountTypeExpense: 'مصروف',
    parentAccount: 'الحساب الأب',
    balance: 'الرصيد',
    debit: 'مدين',
    credit: 'دائن',
    budgetLine: 'بند الميزانية',
    budgetedAmount: 'المبلغ المقدر',
    actualAmount: 'المبلغ الفعلي',
    variance: 'الفرق',
    variancePercent: 'نسبة الفرق',
    expenditureDate: 'تاريخ الصرف',
    expenditureAmount: 'المبلغ',
    expenditureType: 'نوع المصروف',
    paymentMethod: 'طريقة الدفع',
    paymentMethodCash: 'نقدي',
    paymentMethodBank: 'حوالة بنكية',
    paymentMethodCheck: 'شيك',
    paymentMethodMobile: 'محفظة إلكترونية',
    vendor: 'المورد',
    invoice: 'فاتورة',
    receipt: 'إيصال',
    approvedBy: 'تمت الموافقة بواسطة',
    approvalDate: 'تاريخ الموافقة',
    reconciliationStatus: 'حالة التسوية',
    reconciledStatusPending: 'قيد الانتظار',
    reconciledStatusReconciled: 'مسوّى',
    reconciledStatusDisputed: 'متنازع عليه',
    noFinancialData: 'لا توجد بيانات مالية متاحة',
  },

  forms: {
    requiredField: 'هذا الحقل مطلوب',
    invalidEmail: 'عنوان بريد إلكتروني غير صالح',
    invalidPhone: 'رقم هاتف غير صالح',
    invalidUrl: 'رابط غير صالح',
    invalidDate: 'تاريخ غير صالح',
    invalidNumber: 'رقم غير صالح',
    minLength: 'الحد الأدنى للطول هو',
    maxLength: 'الحد الأقصى للطول هو',
    minValue: 'الحد الأدنى للقيمة هو',
    maxValue: 'الحد الأقصى للقيمة هو',
    mustBePositive: 'يجب أن يكون رقماً موجباً',
    mustBeUnique: 'يجب أن تكون القيمة فريدة',
    passwordMismatch: 'كلمات المرور غير متطابقة',
    selectOption: 'اختر خياراً',
    selectMultiple: 'اختر خياراً أو أكثر',
    enterValue: 'أدخل قيمة',
    chooseFile: 'اختر ملفاً',
    uploadFile: 'رفع ملف',
    fileSelected: 'ملف محدد',
    filesSelected: 'ملفات محددة',
    maxFileSize: 'الحد الأقصى لحجم الملف',
    allowedFileTypes: 'أنواع الملفات المسموحة',
    dragDropFile: 'اسحب وأفلت الملف هنا',
    browseFiles: 'تصفح الملفات',
    removeFile: 'إزالة الملف',
  },

  tables: {
    columns: 'الأعمدة',
    rows: 'الصفوف',
    rowsPerPage: 'صفوف لكل صفحة',
    page: 'صفحة',
    of: 'من',
    showing: 'عرض',
    noDataAvailable: 'لا توجد بيانات متاحة',
    noMatchingRecords: 'لم يتم العثور على سجلات مطابقة',
    loadingRecords: 'جاري تحميل السجلات...',
    selectAll: 'تحديد الكل',
    deselectAll: 'إلغاء تحديد الكل',
    selectedCount: 'محدد',
    sortAscending: 'ترتيب تصاعدي',
    sortDescending: 'ترتيب تنازلي',
    filterColumn: 'تصفية العمود',
    hideColumn: 'إخفاء العمود',
    showColumn: 'إظهار العمود',
    exportTable: 'تصدير الجدول',
    exportCSV: 'تصدير بصيغة CSV',
    exportExcel: 'تصدير بصيغة Excel',
    exportPDF: 'تصدير بصيغة PDF',
    printTable: 'طباعة الجدول',
    refreshTable: 'تحديث الجدول',
  },

  caseManagement: {
    // Sub-Navigation
    dashboard: 'لوحة المعلومات',
    casesList: 'قائمة الحالات',
    caseProfile: 'ملف الحالة',
    pssSessions: 'جلسات الدعم النفسي الاجتماعي',
    activities: 'الأنشطة',
    safeSpace: 'المساحات الآمنة',
    referrals: 'الإحالات',
    reports: 'التقارير',
    
    // Dashboard KPIs
    totalActiveCases: 'إجمالي الحالات النشطة',
    newCasesThisMonth: 'حالات جديدة (هذا الشهر)',
    closedCases: 'الحالات المُغلقة',
    highRiskCases: 'الحالات عالية الخطورة',
    pendingReferrals: 'الإحالات المعلقة',
    followUpsDue: 'المتابعات المستحقة',
    
    // Dashboard & List Headers
    caseManagementDashboard: 'لوحة معلومات إدارة الحالات',
    project: 'المشروع',
    donor: 'الجهة المانحة',
    role: 'الدور',
    recentCases: 'الحالات الأخيرة',
    
    // Filters
    allGender: 'كل الجنسيات',
    male: 'ذكر',
    female: 'أنثى',
    allRiskLevels: 'كل مستويات الخطر',
    riskHigh: 'عالي',
    riskMedium: 'متوسط',
    riskLow: 'منخفض',
    allStatus: 'كل الحالات',
    statusOpen: 'مفتوحة',
    statusOngoing: 'قيد التنفيذ',
    statusClosed: 'مُغلقة',
    allCaseTypes: 'كل أنواع الحالات',
    typePSS: 'دعم نفسي',
    typeCP: 'حماية الطفل',
    typeGBV: 'عنف جنساني',
    typeProtection: 'حماية',
    
    // Table Headers
    caseId: 'رقم الحالة',
    beneficiaryCode: 'رمز المستفيد',
    gender: 'الجنس',
    age: 'العمر',
    riskLevel: 'مستوى الخطر',
    caseType: 'النوع',
    status: 'الحالة',
    actions: 'الإجراءات',
    view: 'عرض',
    
    // Case List
    addNewCase: 'إضافة حالة جديدة',
    searchCases: 'البحث عن حالات...',
    exportCases: 'تصدير الحالات',
    exportTemplate: 'تصدير النموذج',
    importCases: 'استيراد الحالات',
    noCasesMatch: 'لا توجد حالات تطابق المرشحات الحالية',
    
    // Case Form Fields
    firstName: 'الاسم الأول',
    lastName: 'اسم العائلة',
    dateOfBirth: 'تاريخ الميلاد',
    nationality: 'الجنسية',
    idNumber: 'رقم الهوية',
    phoneNumber: 'رقم الهاتف',
    email: 'البريد الإلكتروني',
    address: 'العنوان',
    referralSource: 'مصدر الإحالة',
    intakeDate: 'تاريخ التسجيل',
    assignedTo: 'مُسند إلى',
    notes: 'ملاحظات',
    
    // Case Profile Sections
    backToCasesList: 'العودة إلى قائمة الحالات',
    caseIdLabel: 'رقم الحالة',
    beneficiaryInformation: 'أ. معلومات المستفيد',
    caseDetails: 'ب. تفاصيل الحالة',
    casePlan: 'ج. خطة الحالة',
    disability: 'الإعاقة',
    location: 'الموقع',
    district: 'المنطقة',
    householdSize: 'حجم الأسرة',
    vulnerabilityCategory: 'فئة الضعف',
    caseOpeningDate: 'تاريخ فتح الحالة',
    informedConsent: 'الموافقة المستنيرة',
    identifiedNeeds: 'الاحتياجات المحددة',
    riskFactors: 'عوامل الخطر',
    immediateConcerns: 'المخاوف الفورية',
    plannedInterventions: 'التدخلات المخططة',
    expectedOutcomes: 'النتائج المتوقعة',
    timeline: 'الجدول الزمني',
    yes: 'نعم',
    no: 'لا',
    notAvailable: 'غير متاح',
    
    // PSS Sessions
    pssSessionsTitle: 'جلسات الدعم النفسي والاجتماعي',
    pssSessionsDescription: 'تتبع وإدارة جلسات الدعم النفسي والاجتماعي',
    addSession: 'إضافة جلسة',
    exportSessions: 'تصدير الجلسات',
    exportSessionsTemplate: 'تصدير النموذج',
    importSessions: 'استيراد الجلسات',
    totalSessions: 'إجمالي الجلسات',
    individualSessions: 'فردية',
    groupSessions: 'جماعية',
    avgSessionDuration: 'متوسط المدة',
    sessionDate: 'تاريخ الجلسة',
    sessionType: 'نوع الجلسة',
    sessionDuration: 'المدة (دقائق)',
    pssApproach: 'نهج الدعم النفسي',
    topicsDiscussed: 'المواضيع المناقَشة',
    followUpDate: 'تاريخ المتابعة',
    facilitator: 'الميسر',
    participantsCount: 'المشاركون',
    typeIndividual: 'فردية',
    typeGroup: 'جماعية',
    editSession: 'تعديل',
    deleteSession: 'حذف',
    noSessionsFound: 'لم يتم العثور على جلسات',
    addNewSession: 'إضافة جلسة جديدة',
    updateSession: 'تحديث الجلسة',
    confirmDeleteSession: 'تأكيد الحذف',
    sessionDeleteMessage: 'هل أنت متأكد من حذف هذه الجلسة؟',
    fillRequiredFields: 'يرجى ملء جميع الحقول المطلوبة',
    sessionAddedSuccess: '✅ تمت إضافة الجلسة بنجاح!',
    sessionUpdatedSuccess: '✅ تم تحديث الجلسة بنجاح!',
    sessionDeletedSuccess: '✅ تم حذف الجلسة بنجاح!',
    minutes: 'دقائق',
    
    // Activities & Services
    activitiesTitle: 'الأنشطة والخدمات',
    activitiesDescription: 'تتبع الأنشطة والخدمات المقدمة للمستفيدين',
    addActivity: 'إضافة نشاط',
    exportActivities: 'تصدير الأنشطة',
    exportActivitiesTemplate: 'تصدير النموذج',
    importActivities: 'است��راد الأنشطة',
    totalActivities: 'إجمالي الأنشطة',
    activitiesCompleted: 'المكتملة',
    beneficiariesServed: 'المستفيدون المخدومون',
    activitiesThisMonth: 'هذا الشهر',
    activityDate: 'تاريخ النشاط',
    activityType: 'نوع النشاط',
    serviceProvided: 'الخدمة المقدمة',
    duration: 'المدة',
    outcome: 'النتيجة',
    editActivity: 'تعديل',
    deleteActivity: 'حذف',
    noActivitiesFound: 'لم يتم العثور على أنشطة',
    addNewActivity: 'إضافة نشاط جديد',
    updateActivity: 'تحديث النشاط',
    confirmDeleteActivity: 'تأكيد الحذف',
    activityDeleteMessage: 'هل أنت متأكد من حذف هذا النشاط؟',
    activityAddedSuccess: '✅ تمت إضافة النشاط بنجاح!',
    activityUpdatedSuccess: '✅ تم تحديث النشاط بنجاح!',
    activityDeletedSuccess: '✅ تم حذف النشاط بنجاح!',
    providedBy: 'مقدم الخدمة',
    followUp: 'المتابعة',
    followUpRequired: 'يتطلب متابعة',
    
    // Child Safe Space
    childSafeSpaceTitle: 'المساحة الآمنة للأطفال',
    childSafeSpaceDescription: 'تتبع جلسات وأنشطة المساحة الآمنة للأطفال',
    addCSSSession: 'إضافة جلسة مساحة آمنة',
    exportCSSSessions: 'تصدير الجلسات',
    exportCSSTemplate: 'تصدير النموذج',
    importCSSSessions: 'استيراد الجلسات',
    totalCSSSessions: 'إجمالي الجلسات',
    childrenAttended: 'الأطفال الحاضرون',
    avgAttendance: 'متوسط الحضور',
    activitiesHeld: 'الأنشطة المنفذة',
    activityTheme: 'موضوع النشاط',
    attendanceCount: 'الحضور',
    ageGroup: 'الفئة العمرية',
    safeguardingIncidents: 'حوادث الحماية',
    editCSSSession: 'تعديل',
    deleteCSSSession: 'حذف',
    noCSSSessionsFound: 'لم يتم العثور على جلسات',
    addNewCSSSession: 'إضافة جلسة مساحة آمنة جديدة',
    updateCSSSession: 'تحديث جلسة المساحة الآمنة',
    confirmDeleteCSSSession: 'تأكيد الحذف',
    cssSessionDeleteMessage: 'هل أنت متأكد من حذف هذه الجلسة؟',
    cssSessionAddedSuccess: '✅ تمت إضافة جلسة المساحة الآمنة بنجاح!',
    cssSessionUpdatedSuccess: '✅ تم تحديث جلسة المساحة الآمنة بنجاح!',
    cssSessionDeletedSuccess: '✅ تم حذف جلسة المساحة الآمنة بنجاح!',
    
    // Referrals
    referralsTitle: 'الإحالات',
    referralsDescription: 'تتبع وإدارة إحالات الحالات',
    addReferral: 'إضافة إحالة',
    exportReferrals: 'تصدير الإحالات',
    exportReferralsTemplate: 'تصدير النموذج',
    importReferrals: 'استيرا�� الإحالات',
    totalReferrals: 'إجمالي الإحالات',
    pendingReferralsCount: 'المعلقة',
    completedReferrals: 'المكتملة',
    referralsThisMonth: 'هذا الشهر',
    referralDate: 'تاريخ الإحالة',
    referredTo: 'المُحال إليه',
    serviceType: 'نوع الخدمة',
    priority: 'الأولوية',
    referralStatus: 'الحالة',
    completionDate: 'تاريخ الإكمال',
    feedback: 'التغذية الراجعة',
    priorityHigh: 'عالية',
    priorityMedium: 'متوسطة',
    priorityLow: 'منخفضة',
    statusPending: 'معلقة',
    statusInProgress: 'قيد التنفيذ',
    statusCompleted: 'مكتملة',
    editReferral: 'تعديل',
    deleteReferral: 'حذف',
    noReferralsFound: 'لم يتم العثور على إحالات',
    addNewReferral: 'إضافة إحالة جديدة',
    updateReferral: 'تحديث الإحالة',
    confirmDeleteReferral: 'تأكيد الحذف',
    referralDeleteMessage: 'هل أنت متأكد من حذف هذه الإحالة؟',
    referralAddedSuccess: '✅ تمت إضافة الإحالة بنجاح!',
    referralUpdatedSuccess: '✅ تم تحديث الإحالة بنجاح!',
    referralDeletedSuccess: '✅ تم حذف الإحالة بنجاح!',
    
    // Reports & Analytics
    reportsTitle: 'التقارير والتحليلات',
    reportsDescription: 'إنشاء وعرض تقارير إدارة الحالات',
    generateReport: 'إنشاء تقرير',
    exportReport: 'تصدير التقرير',
    reportType: 'نوع التقرير',
    dateRange: 'النطاق الزمني',
    caseManagementSummary: 'ملخص إدارة الحالات',
    caseLoad: 'عبء الحالات',
    demographics: 'التركيبة السكانية',
    services: 'الخدمات',
    outcomes: 'النتائج',
    totalCasesManaged: 'إجمالي الحالات المُدارة',
    newIntakes: 'التسجيلات الجديدة',
    closedSuccessfully: 'المُغلقة بنجاح',
    averageCaseDuration: 'متوسط مدة الحالة',
    byGender: 'حسب الجنس',
    byAgeGroup: 'حسب الفئة العمرية',
    byRiskLevel: 'حسب مستوى الخطر',
    byType: 'حسب النوع',
    pssSessionsProvided: 'جلسات الدعم النفسي المقدمة',
    activitiesCompletedCount: 'الأنشطة المكتملة',
    referralsMade: 'الإحالات المنفذة',
    followUpsCompleted: 'المتابعات المكتملة',
    successfulCaseClosure: 'معدل إغلاق الحالات بنجاح',
    averageSatisfactionScore: 'متوسط درجة الرضا',
    beneficiariesReachedTarget: 'هدف المستفيدين المحقق',
    servicesDeliveredOnTime: 'الخدمات المقدمة في الوقت المحدد',
    exportPDF: 'تصدير PDF',
    days: 'أيام',
    
    // Reports & Analytics - Auto-Report Labels
    caseManagementAutoReport: 'تقرير إدارة الحالات التلقائي',
    autoGeneratedFromData: 'يتم إنشاؤه تلقائيًا من بيانات إدارة الحالات الفعلية',
    printSaveAsPDF: 'طباعة / حفظ كـ PDF',
    exportExcel: 'تصدير Excel',
    caseManagementReport: 'تقرير إدارة الحالات',
    reportingPeriod: 'فترة التقرير',
    generatedOn: 'تم إنشاؤه في',
    to: 'إلى',
    executiveSummary: 'الملخص التنفيذي',
    keyMetrics: 'المؤشرات الرئيسية',
    keyAchievements: 'الإنجازات الرئيسية',
    totalBeneficiaries: 'إجمالي المستفيدين',
    childrenReached: 'الأطفال الذين تم الوصول إليهم',
    cssLocations: 'مواقع المساحات الآمنة',
    cases: 'الحالات',
    safeSpaces: 'المساحات الآمنة',
    detailedTables: 'جداول مفصلة',
    casesOverview: 'نظرة عامة على الحالات',
    metric: 'المقياس',
    value: 'القيمة',
    totalCases: 'إجمالي الحالات',
    newCasesPeriod: 'الحالات الجديدة (الفترة)',
    activeCases: 'الحالات النشطة',
    avgCaseDuration: 'متوسط مدة الحالة',
    indicator: 'المؤشر',
    totalPSSSessions: 'إجمالي جلسات الدعم النفسي',
    individualSessionsLabel: 'الجلسات الفردية',
    groupSessionsLabel: 'الجلسات الجماعية',
    avgDuration: 'متوسط المدة',
    followUpsScheduled: 'المتابعات المجدولة',
    internalReferrals: 'الإحالات الداخلية',
    externalReferrals: 'الإحالات الخارجية',
    completedReferralsLabel: 'الإحالات المكتملة',
    completionRate: 'معدل الإكمال',
    activeCSSLocations: 'مواقع المساحات الآمنة النشطة',
    totalCSSActivities: 'إجمالي أنشطة المساحات الآمنة',
    avgChildrenPerSession: 'متوسط الأطفال لكل جلسة',
    activitiesServices: 'الأنشطة والخدمات',
    activityTypeLabel: 'نوع النشاط',
    count: 'العدد',
    
    // Detailed Tables Labels
    casesLabel: 'الحالات',
    pssSessionsLabel: 'جلسات الدعم النفسي',
    referralsLabel: 'الإحالات',
    safeSpacesLabel: 'المساحات الآمنة',
    totalCasesLabel: 'إجمالي الحالات',
    newCasesLabel: 'الحالات الجديدة (الفترة)',
    activeCasesLabel: 'الحالات النشطة',
    closedCasesLabel: 'الحالات المغلقة',
    highRiskCasesLabel: 'الحالات عالية الخطورة',
    avgDurationLabel: 'متوسط المدة',
    totalSessionsLabel: 'إجمالي الجلسات',
    individualSessionsCount: 'الجلسات الفردية',
    groupSessionsCount: 'الجلسات الجماعية',
    followUpsScheduledLabel: 'المتابعات المجدولة',
    totalReferralsLabel: 'إجمالي الإحالات',
    internalReferralsLabel: 'الإحالات الداخلية',
    externalReferralsLabel: 'الإحالات الخارجية',
    completedLabel: 'المكتملة',
    completionRateLabel: 'معدل الإكمال',
    activeLocationsLabel: 'المواقع النشطة',
    totalActivitiesLabel: 'إجمالي الأنشطة',
    avgPerSessionLabel: 'المتوسط لكل جلسة',
  },

  organizations: {
    title: 'المنظمات',
    subtitle: 'إدارة المنظمات',
    createOrganization: 'إنشاء منظمة',
    editOrganization: 'تعديل المنظمة',
    deleteOrganization: 'حذف المنظمة',
    organizationName: 'اسم المنظمة',
    organizationType: 'نوع المنظمة',
    typeNGO: 'منظمة غير حكومية محلية',
    typeINGO: 'منظمة غير حكومية دولية',
    typeUN: 'وكالة الأمم المتحدة',
    typeGovernment: 'حكومية',
    typeCommunity: 'منظمة مجتمعية',
    country: 'البلد',
    region: 'المنطقة',
    city: 'المدينة',
    address: 'العنوان',
    phone: 'الهاتف',
    email: 'البريد الإلكتروني',
    website: 'الموقع الإلكتروني',
    registrationNumber: 'رقم التسجيل',
    taxId: 'الرقم الضريبي',
    activeUsers: 'المستخدمون النشطون',
    totalProjects: 'إجمالي المشاريع',
    established: 'تاريخ التأسيس',
    noOrganizations: 'لم يتم العثور على منظمات',
    switchOrganization: 'تبديل المنظمة',
  },

  users: {
    title: 'المستخدمون',
    subtitle: 'إدارة المستخدمين',
    createUser: 'إنشاء مستخدم',
    editUser: 'تعديل المستخدم',
    deleteUser: 'حذف المستخدم',
    userName: 'اسم المستخدم',
    userEmail: 'البريد الإلكتروني',
    userRole: 'الدور',
    roleSystemAdmin: 'مسؤول النظام',
    roleOrgAdmin: 'مسؤول المنظمة',
    roleProjectManager: 'مدير مشروع',
    roleFinanceOfficer: 'مسؤول مالي',
    roleMEALOfficer: 'مسؤول متابعة وتقييم',
    roleFieldOfficer: 'مسؤول ميداني',
    roleViewer: 'مشاهد',
    permissions: 'الصلاحيات',
    permissionsView: 'عرض',
    permissionsCreate: 'إنشاء',
    permissionsEdit: 'تعديل',
    permissionsDelete: 'حذف',
    permissionsManage: 'إدارة',
    lastLogin: 'آخر تسجيل دخول',
    accountStatus: 'حالة الحساب',
    inviteUser: 'دعوة مستخدم',
    resendInvitation: 'إعادة إرسال الدعوة',
    deactivateUser: 'تعطيل المستخدم',
    activateUser: 'تفعيل المستخدم',
    resetPassword: 'إعادة تعيين كلمة المرور',
    changePassword: 'تغيير كلمة المرور',
    noUsers: 'لم يتم العثور على مستخدمين',
  },

  settings: {
    title: 'الإعدادات',
    subtitle: 'إعدادات النظام',
    generalSettings: 'الإعدادات العامة',
    userManagement: 'إدارة المستخدمين',
    rolesPermissions: 'الأدوار والصلاحيات',
    optionSets: 'مجموعات الخيارات',
    emailNotifications: 'إشعارات البريد الإلكتروني',
    logoBranding: 'الشعار والعلامة التجارية',
    publishSync: 'النشر والمزامنة',
    adminAccess: 'الوصول الإداري',
    systemPreferences: 'تفضيلات النظام',
    languageRegion: 'اللغة والمنطقة',
    dateTimeFormat: 'تنسيق التاريخ والوقت',
    currency: 'العملة',
    timezone: 'المنطقة الزمنية',
    fiscalYearStart: 'بداية السنة المالية',
    saveSettings: 'حفظ الإعدادات',
    settingsSaved: 'تم حفظ الإعدادات بنجاح',
    settingsError: 'خطأ في حفظ الإعدادات',
  },

  importExport: {
    importData: 'استيراد البيانات',
    exportData: 'تصدير البيانات',
    importHistory: 'سجل الاستيراد',
    importStatus: 'حالة الاستيراد',
    statusPending: 'قيد الانتظار',
    statusProcessing: 'قيد المعالجة',
    statusCompleted: 'مكتمل',
    statusFailed: 'فشل',
    statusPartial: 'نجاح جزئي',
    recordsImported: 'السجلات المستوردة',
    recordsFailed: 'السجلات الفاشلة',
    recordsSkipped: 'السجلات المتجاوزة',
    totalRecords: 'إجمالي السجلات',
    validationErrors: 'أخطاء التحقق',
    duplicatesFound: 'التكرارات الموجودة',
    importDate: 'تاريخ الاستيراد',
    importedBy: 'تم الاستيراد بواسطة',
    downloadTemplate: 'تنزيل النموذج',
    downloadErrors: 'تنزيل الأخطاء',
    selectFile: 'اختر ملفاً',
    mapColumns: 'تعيين الأعمدة',
    validateData: 'التحقق من البيانات',
    confirmImport: 'تأكيد الاستيراد',
    importInProgress: 'الاستيراد قيد التنفيذ',
    importCompleted: 'اكتمل الاستيراد',
    importFailed: 'فشل الاستيراد',
    viewDetails: 'عرض التفاصيل',
    duplicateHandling: 'معالجة التكرارات',
    duplicateSkip: 'تجاوز التكرارات',
    duplicateUpdate: 'تحديث الموجود',
    duplicateCreateNew: 'إنشاء جديد',
  },

  reports: {
    title: 'التقارير',
    subtitle: 'إنشاء وإدارة التقارير',
    generateReport: 'إنشاء تقرير',
    scheduleReport: 'جدولة تقرير',
    reportTemplate: 'نموذج التقرير',
    reportType: 'نوع التقرير',
    reportPeriod: 'فترة التقرير',
    reportFormat: 'صيغة التقرير',
    formatPDF: 'PDF',
    formatExcel: 'Excel',
    formatWord: 'Word',
    donors: 'تقارير الممولين',
    internalReports: 'تقارير داخلية',
    customReports: 'تقارير مخصصة',
    reportDue: 'مستحق',
    reportOverdue: 'متأخر',
    reportSubmitted: 'مقدم',
    reportApproved: 'موافق عليه',
    reportRejected: 'مرفوض',
    submitReport: 'تقديم التقرير',
    approveReport: 'الموافقة على التقرير',
    rejectReport: 'رفض التقرير',
    reportComments: 'التعليقات',
    noReports: 'لم يتم العثور على تقارير',
    viewReport: 'عرض التقرير',
    editReport: 'تعديل التقرير',
    deleteReport: 'حذف التقرير',
  },

  notifications: {
    title: 'الإشعارات',
    markAsRead: 'تحديد كمقروء',
    markAsUnread: 'تحديد كغير مقروء',
    deleteNotification: 'حذف الإشعار',
    notificationSettings: 'إعدادات الإشعارات',
    emailNotifications: 'إشعارات البريد الإلكتروني',
    pushNotifications: 'الإشعارات الفورية',
    smsNotifications: 'إشعارات الرسائل النصية',
    notifyProjectUpdates: 'تحديثات المشاريع',
    notifyReportsDue: 'التقارير المستحقة',
    notifyBudgetAlerts: 'تنبيهات الميزانية',
    notifyApprovals: 'الموافقات المطلوبة',
    notifyMentions: 'الإشارات',
    noNewNotifications: 'لا توجد إشعارات جديدة',
  },

  messages: {
    success: {
      created: 'تم الإنشاء بنجاح',
      updated: 'تم التحديث بنجاح',
      deleted: 'تم الحذف بنجاح',
      saved: 'تم الحفظ بنجاح',
      imported: 'تم الاستيراد بنجاح',
      exported: 'تم التصدير بنجاح',
      sent: 'تم الإرسال بنجاح',
      approved: 'تمت الموافقة بنجاح',
      rejected: 'تم الرفض بنجاح',
      published: 'تم النشر بنجاح',
      archived: 'تمت الأرشفة بنجاح',
      restored: 'تمت الاستعادة بنجاح',
    },
    error: {
      generic: 'حدث خطأ',
      notFound: 'السجل غير موجود',
      unauthorized: 'وصول غير مصرح به',
      forbidden: 'وصول محظور',
      serverError: 'خطأ في الخادم',
      networkError: 'خطأ في الشبكة',
      validationFailed: 'فشل التحقق',
      duplicateEntry: 'إدخال مكرر',
      missingFields: 'حقول مطلوبة مفقودة',
      invalidData: 'بيانات غير صالحة',
      operationFailed: 'فشلت العملية',
      uploadFailed: 'فشل الرفع',
      downloadFailed: 'فشل التنزيل',
    },
    confirm: {
      delete: 'هل أنت متأكد من حذف هذا العنصر؟',
      deleteMultiple: 'هل أنت متأكد من حذف العناصر المحددة؟',
      archive: 'هل أنت متأكد من أرشفة هذا العنصر؟',
      restore: 'هل أنت متأكد من استعادة هذا العنصر؟',
      submit: 'هل أنت متأكد من الإرسال؟',
      approve: 'هل أنت متأكد من الموافقة؟',
      reject: 'هل أنت متأكد من الرفض؟',
      logout: 'هل أنت متأكد من تسجيل الخروج؟',
      cancelChanges: 'تجاهل التغييرات غير المحفوظة؟',
      overwriteData: 'سيؤدي هذا إلى الكتابة فوق البيانات الموجودة. متابعة؟',
    },
  },

  deletedRecords: {
    title: 'السجلات المحذوفة',
    subtitle: 'عرض وإدارة السجلات المحذوفة',
    deletedBy: 'حُذف بواسطة',
    deletedDate: 'تاريخ الحذف',
    deletionReason: 'سبب الحذف',
    restoreRecord: 'استعادة السجل',
    permanentlyDelete: 'حذف نهائي',
    restoreConfirm: 'هل أنت متأكد من استعادة هذا السجل؟',
    permanentDeleteConfirm: 'لا يمكن التراجع عن هذا الإجراء. حذف نهائي؟',
    noDeletedRecords: 'لم يتم العثور على سجلات محذوفة',
    recordType: 'نوع السجل',
    recordName: 'اسم السجل',
    originalId: 'المعرّف الأصلي',
  },

  meal: {
    // General
    moduleTitle: 'إدارة المتابعة والتقييم',
    moduleSubtitle: 'المتابعة والتقييم والمساءلة والتعلم',
    // Surveys
    surveys: 'الاستبيانات',
    surveyName: 'اسم الاستبيان',
    surveyType: 'نوع الاستبيان',
    surveyStatus: 'الحالة',
    createSurvey: 'إنشاء استبيان',
    editSurvey: 'تعديل الاستبيان',
    surveyCreated: 'تم إنشاء الاستبيان بنجاح',
    surveyUpdated: 'تم تحديث الاستبيان بنجاح',
    surveyDeleted: 'تم حذف الاستبيان بنجاح',
    // Indicators
    indicators: 'المؤشرات',
    indicatorCode: 'رمز المؤشر',
    indicatorName: 'اسم المؤشر',
    indicatorType: 'النوع',
    indicatorCategory: 'الفئة',
    indicatorSector: 'القطاع',
    indicatorUnit: 'وحدة القياس',
    indicatorDataSource: 'مصدر البيانات',
    indicatorBaseline: 'القيمة الأساسية',
    indicatorTarget: 'الهدف',
    indicatorCurrent: 'القيمة الحالية',
    indicatorStatus: 'الحالة',
    createIndicator: 'إنشاء مؤشر',
    editIndicator: 'تعديل المؤشر',
    addIndicator: 'إضافة مؤشر',
    indicatorCreated: 'تم إنشاء المؤشر بنجاح',
    indicatorUpdated: 'تم تحديث المؤشر بنجاح',
    indicatorDeleted: 'تم حذف المؤشر بنجاح',
    // Data Entry
    dataEntry: 'إدخال البيانات',
    period: 'الفترة',
    value: 'القيمة',
    disaggregation: 'التفصيل',
    notes: 'ملاحظات',
    verified: 'مُحقَّق',
    verifiedBy: 'حُقِّق بواسطة',
    verifiedAt: 'تاريخ التحقق',
    // Common
    project: 'المشروع',
    responsiblePerson: 'الشخص المسؤول',
    collectionFrequency: 'تكرار الجمع',
    frequencyMonthly: 'شهري',
    frequencyQuarterly: 'ربع سنوي',
    frequencyAnnually: 'سنوي',
    frequencyAdhoc: 'حسب الحاجة',
    saveError: 'فشل الحفظ. يرجى المحاولة مرة أخرى.',
    loadError: 'فشل تحميل البيانات. يرجى التحديث.',
    // Extended Indicator Fields
    basicInformation: 'المعلومات الأساسية',
    classification: 'التصنيف',
    measurement: 'القياس',
    dataCollection: 'جمع البيانات',
    description: 'الوصف',
    descriptionPlaceholder: 'صف ما يقيسه هذا المؤشر...',
    indicatorNamePlaceholder: 'مثال: عدد المستفيدين الذين تم الوصول إليهم',
    indicatorCodeRequired: 'رمز المؤشر مطلوب',
    indicatorNameRequired: 'اسم المؤشر مطلوب',
    categoryRequired: 'الفئة مطلوبة',
    sectorRequired: 'القطاع مطلوب',
    targetRequired: 'القيمة المستهدفة مطلوبة',
    responsiblePersonRequired: 'الشخص المسؤول مطلوب',
    category: 'الفئة',
    categoryPlaceholder: 'مثال: تقديم الخدمات',
    sector: 'القطاع',
    selectSector: 'اختر القطاع',
    sectorProtection: 'الحماية',
    sectorHealth: 'الصحة',
    sectorEducation: 'التعليم',
    sectorWASH: 'المياه والصرف الصحي',
    sectorNutrition: 'التغذية',
    sectorLivelihoods: 'سبل العيش',
    sectorMultiSector: 'متعدد القطاعات',
    unit: 'الوحدة',
    unitNumber: 'رقم',
    unitPercentage: 'نسبة مئوية',
    unitRatio: 'نسبة',
    unitIndex: 'مؤشر',
    baseline: 'القيمة الأساسية',
    target: 'الهدف',
    dataSource: 'مصدر البيانات',
    sourceManual: 'إدخال يدوي',
    sourceSurvey: 'استبيان',
    sourceAutomatic: 'تلقائي',
    sourceExternal: 'نظام خارجي',
    responsiblePersonPlaceholder: 'أدخل اسم الشخص المسؤول',
    disaggregationDesc: 'اختر كيفية تفصيل البيانات',
    disaggregationGender: 'الجنس',
    disaggregationAge: 'العمر',
    disaggregationLocation: 'الموقع',
    disaggregationDisability: 'الإعاقة',
    status: 'الحالة',
    statusActive: 'نشط',
    statusInactive: 'غير نشط',
    output: 'مخرج',
    outcome: 'نتيجة',
    impact: 'أثر',
  },

  auth: {
    login: 'تسجيل الدخول',
    logout: 'تسجيل الخروج',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    rememberMe: 'تذكرني',
    forgotPassword: 'نسيت كلمة المرور؟',
    resetPassword: 'إعادة تعيين كلمة المرور',
    welcomeBack: 'مرحباً بعودتك',
    loginToContinue: 'سجّل الدخول ل��متابعة',
    invalidCredentials: 'بريد إلكتروني أو كلمة مرور غير صالحة',
    accountLocked: 'الحساب مقفل. اتصل بالمسؤول.',
    sessionExpired: 'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.',
    loginSuccess: 'تم تسجيل الدخول بنجاح',
    logoutSuccess: 'تم تسجيل الخروج بنجاح',
    enterEmail: 'أدخل بريدك الإلكتروني',
    enterPassword: 'أدخل كلمة المرور',
    passwordReset: 'تم إرسال رابط إعادة تعيين كلمة المرور',
    checkEmail: 'تحقق من بريدك الإلكتروني للحصول على تعليمات إعادة التعيين',
  },

  proposals: {
    // Page Titles
    title: 'إدارة مقترحات المشاريع وفرص التمويل',
    subtitle: 'تتبع فرص التمويل وتطوير المقترحات وإدارة دورة حياة المشروع الكاملة من الفكرة إلى الموافقة',
    pipelineTab: 'خط الفرص والتمويل',
    proposalsTab: 'تطوير المقترحات',
    
    // Pipeline Management
    pipelineTitle: 'إدارة خط فرص التمويل',
    pipelineSubtitle: 'تحديد وتتبع فرص التمويل',
    opportunityTitle: 'عنوان الفرصة',
    donorName: 'اسم الجهة المانحة',
    callReference: 'مرجع الدعوة',
    fundingAmount: 'مبلغ التمويل',
    budgetRange: 'نطاق الميزانية',
    probability: 'الاحتمالية',
    submissionDeadline: 'الموعد النهائي للتقديم',
    opportunityStatus: 'حالة الفرصة',
    statusIdentified: 'محددة',
    statusUnderReview: 'قيد المراجعة',
    statusMatchedToProposal: 'مطابقة لمقترح',
    statusNotPursuing: 'لن يتم المتابعة',
    stageIdentified: 'محددة',
    stageUnderReview: 'قيد المراجعة',
    stageGoDecision: 'قرار المتابعة',
    stageNoGo: 'عدم المتابعة',
    stageConceptRequested: 'مذكرة مفاهيمية مطلوبة',
    stageProposalRequested: 'مقترح مطلوب',
    addOpportunity: 'إضافة فرصة',
    editOpportunity: 'تعديل الفرصة',
    deleteOpportunity: 'حذف الفرصة',
    convertToProposal: 'تحويل إلى مقترح',
    
    // Proposal Development
    proposalTitle: 'عنوان المقترح',
    proposalType: 'نوع المقترح',
    typeConceptNote: 'مذكرة مفاهيمية',
    typeFullProposal: 'مقترح كامل',
    country: 'الدولة',
    governorate: 'المحافظة',
    sector: 'القطاع',
    projectDuration: 'مدة المشروع (بالأشهر)',
    totalRequestedBudget: 'إجمالي الميزانية المطلوبة',
    currency: 'العملة',
    proposalStatus: 'حالة المقترح',
    statusDraft: 'مسودة',
    statusUnderInternalReview: 'قيد المراجعة الداخلية',
    statusSubmitted: 'مقدم',
    statusApproved: 'موافق عليه',
    statusRejected: 'مرفوض',
    completionPercentage: 'نسبة الإنجاز %',
    createdBy: 'أنشئ بواسطة',
    createdAt: 'تاريخ الإنشاء',
    updatedAt: 'تاريخ التحديث',
    
    // Actions
    createProposal: 'إنشاء مقترح',
    editProposal: 'تعديل المقترح',
    deleteProposal: 'حذف المقترح',
    approveProposal: 'الموافقة على المقترح',
    submitProposal: 'تقديم المقترح',
    exportProposal: 'تصدير المقترح',
    viewProposal: 'عرض المقترح',
    
    // Dashboard Stats
    totalOpportunities: 'إجمالي الفرص',
    activeProposals: 'المقترحات النشطة',
    successRate: 'معدل النجاح',
    totalFundingPipeline: 'إجمالي خط التمويل',
    conceptNotesRequested: 'مذكرة مفاهيمية مطلوبة',
    
    // Filters
    filterByStatus: 'تصفية حسب الحالة',
    filterByDonor: 'تصفية حسب الجهة المانحة',
    filterByStage: 'تصفية حسب المرحلة',
    searchOpportunities: 'البحث في الفرص...',
    searchProposals: 'البحث في المقترحات...',
    
    // Messages
    noOpportunities: 'لا توجد فرص',
    noProposals: 'لا توجد مقترحات',
    deleteConfirm: 'هل أنت متأكد من حذف هذا العنصر؟',
    approveConfirm: 'هل أنت متأكد من الموافقة على هذا المقترح؟ سيتم تحويله إلى منحة ومشروع.',
    convertSuccess: 'تم تحويل المقترح إلى منحة ومشروع بنجاح!',
    deleteSuccess: 'تم حذف العنصر بنجاح!',
    createSuccess: 'تم إنشاء العنصر بنجاح!',
    updateSuccess: 'تم تحديث العنصر بنجاح!',
    
    // How This Works Section
    howThisWorksTitle: 'كيف يعمل هذا',
    howThisWorksPipeline: 'خط الفرص:',
    howThisWorksPipelineDesc: 'تتبع فرص التمويل قبل كتابة المقترحات (قرارات المتابعة/عدم المتابعة)',
    howThisWorksProposals: 'المقترحات:',
    howThisWorksProposalsDesc: 'تطوير مقترحات كاملة داخل النظام باستخدام نماذج منظمة',
    howThisWorksWorkflow: 'سير العمل:',
    howThisWorksWorkflowDesc: 'خط الفرص ← مذكرة مفاهيمية ← مقترح كامل ← تقديم ← موافقة ← إنشاء مشروع',
    howThisWorksExport: 'التصدير:',
    howThisWorksExportDesc: 'إنشاء مستندات PDF و Word من البيانات المنظمة',
    howThisWorksTemplates: 'القوالب:',
    howThisWorksTemplatesDesc: 'قوالب محددة مسبقاً للمنظمات الوطنية والدولية',
  },

  // ========== FORECAST PLAN ==========
  forecastPlan: {
    // Page Title & Description
    title: 'خطة التنبؤ',
    subtitle: 'التخطيط المالي الشهري للمشروع',
    
    // Action Buttons
    reinitialize: 'إعادة التهيئة',
    print: 'طباعة',
    import: 'استيراد',
    exportExcel: 'تصدير إكسل',
    export: 'تصدير',
    
    // KPI / Summary Cards
    balance: 'الرصيد',
    actualSpent: 'المصروف الفعلي',
    totalForecast: 'إجمالي التنبؤ',
    totalBudget: 'إجمالي الميزانية',
    
    // Alerts & Warnings
    balanceWarning: 'تحذير الرصيد',
    balanceWarningBody: 'بند(بنود) ميزانية متوقعة بنسبة >90% من الرصيد المتبقي',
    varianceAlert: 'تنبيه الانحراف',
    varianceAlertBody: 'بند(بنود) ميزانية تجاوزت التنبؤ (الإنفاق الفعلي أعلى من المخطط)',
    forecastExceedsBalance: 'التنبؤ يتجاوز الرصيد المتاح',
    
    // Fiscal Year Tabs
    fiscalYear: 'السنة المالية',
    
    // Table Headers
    activityCode: 'رمز النشاط',
    activity: 'النشاط',
    budgetCode: 'رمز الميزانية',
    subBL: 'البند الفرعي',
    budgetItem: 'بند الميزانية',
    prevYearBalance: 'رصيد السنة السابقة',
    month1: 'ش١',
    month2: 'ش٢',
    month3: 'ش٣',
    month4: 'ش٤',
    month5: 'ش٥',
    month6: 'ش٦',
    month7: 'ش٧',
    month8: 'ش٨',
    month9: 'ش٩',
    month10: 'ش١٠',
    month11: 'ش١١',
    month12: 'ش١٢',
    
    // Empty States / System Messages
    noForecastData: 'لا توجد بيانات تنبؤ',
    noBudgetItems: 'لا توجد بنود ميزانية',
    noActivitiesLinked: 'لا توجد أنشطة مرتبطة',
    loadingForecast: 'جاري تحميل خطة التنبؤ...',
    forecastNotInitialized: 'خطة التنبؤ غير مهيأة',
    initializeForecastPrompt: 'قم بإنشاء خطة تنبؤ للسنة المحددة لعرض وتعديل التنبؤات الشهرية.',
    initializeForecastButton: 'تهيئة خطة التنبؤ لـ',
    initializing: 'جاري التهيئة...',
    
    // Import/Export
    importSuccess: 'تم الاستيراد بنجاح',
    importFailed: 'فشل الاستيراد',
    forecastsUpdated: 'تنبؤات محدثة',
    forecastsSkipped: 'تم تخطيها',
    
    // Additional keys for modal and warnings
    budgetLinesWarning: 'بند(بنود) ميزانية متوقعة بنسبة >90% من الرصيد المتبقي',
    budgetLinesExceeded: 'بند(بنود) ميزانية تجاوزت التنبؤ (الإنفاق الفعلي أعلى من المخطط)',
    viewOnlyMode: 'وضع العرض فقط',
    viewOnlyModeDesc: 'يمكن للمسؤولين فقط تعديل قيم التنبؤ. تواصل مع المسؤول إذا كنت بحاجة لإجراء تغييرات.',
    importForecastPlan: 'استيراد خطة التنبؤ',
    importForecastDesc: 'رفع ملف Excel بقيم التنبؤ الشهرية',
    selectExcelFile: 'اختر ملف Excel',
    dataPreview: 'معاينة البيانات',
    rows: 'صفوف',
    andMoreRows: '...و {count} صفوف إضافية',
    allowDuplicates: 'السماح بالتكرارات؟',
    allowDuplicatesDesc: 'إذا كانت التنبؤات موجودة بالفعل لهذه العناصر، هل تريد استبدالها أم تخطيها؟',
    skipDuplicates: 'تخطي التكرارات',
    replaceExisting: 'استبدال الموجود',
    cancel: 'إلغاء',
  },
};