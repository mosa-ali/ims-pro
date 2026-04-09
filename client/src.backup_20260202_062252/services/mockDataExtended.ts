// ============================================================================
// EXTENDED MOCK DATA - Phase 3.5
// Sample data for new tables (tasks, reporting periods, etc.)
// ============================================================================

import {
  ProjectTask,
  TaskStatus,
  TaskPriority,
  TaskComment,
  ReportingPeriod,
  ReportingPeriodStatus,
  ReportingFrequency,
  ActivityMilestone,
  ProjectActivityEnhanced,
  ActivityProgressUnit,
  TaskStatistics,
  ProjectDetailView,
  DashboardStatistics
} from '@/app/types/extended.types';

// ============================================================================
// MOCK PROJECTS FOR DOCUMENT MANAGEMENT
// ============================================================================

export const mockProjects = [
  {
    project_id: 'PROJ-001',
    project_name: 'Digital Literacy Project',
    project_name_ar: 'مشروع محو الأمية الرقمية',
    status: 'Active',
    start_date: '2024-01-01',
    end_date: '2024-12-31'
  },
  {
    project_id: 'PROJ-002',
    project_name: 'Health Services Expansion',
    project_name_ar: 'توسيع الخدمات الصحية',
    status: 'Active',
    start_date: '2024-02-01',
    end_date: '2025-01-31'
  },
  {
    project_id: 'PROJ-003',
    project_name: 'Community Resilience Program',
    project_name_ar: 'برنامج مرونة المجتمع',
    status: 'Active',
    start_date: '2024-03-01',
    end_date: '2024-11-30'
  }
];

// ============================================================================
// PROJECT TASKS
// ============================================================================

export const mockProjectTasks: ProjectTask[] = [
  {
    id: 1,
    organizationId: 1,
    projectId: 1, // Links to mock project
    activityId: 1, // Links to mock activity
    title: 'Conduct baseline assessment for sports program',
    titleAr: 'إجراء التقييم الأساسي لبرنامج الرياضة',
    description: 'Complete baseline assessment survey with 100 youth participants',
    descriptionAr: null,
    assignedTo: 2, // Ahmad Al-Hassan
    assignedTeam: [2, 5],
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    startDate: '2024-01-15',
    dueDate: '2024-02-15',
    completedDate: null,
    progressPercentage: 35,
    estimatedHours: 40,
    actualHours: 14,
    tags: ['assessment', 'baseline', 'youth'],
    dependencies: null,
    blockedBy: null,
    notifyOnDueDate: true,
    notifyAssignee: true,
    createdBy: 1,
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z',
    isDeleted: false,
    deletedAt: null,
    deletedBy: null
  },
  {
    id: 2,
    organizationId: 1,
    projectId: 1,
    activityId: 1,
    title: 'Prepare training materials for coaches',
    titleAr: 'إعداد المواد التدريبية للمدربين',
    description: 'Design and print coaching manuals and session plans',
    descriptionAr: null,
    assignedTo: 5, // John Smith
    assignedTeam: null,
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    startDate: '2024-02-01',
    dueDate: '2024-02-20',
    completedDate: null,
    progressPercentage: 0,
    estimatedHours: 20,
    actualHours: 0,
    tags: ['training', 'materials', 'coaches'],
    dependencies: [1], // Depends on baseline assessment
    blockedBy: null,
    notifyOnDueDate: true,
    notifyAssignee: true,
    createdBy: 2,
    createdAt: '2024-01-12T09:00:00Z',
    updatedAt: '2024-01-12T09:00:00Z',
    isDeleted: false,
    deletedAt: null,
    deletedBy: null
  },
  {
    id: 3,
    organizationId: 1,
    projectId: 1,
    activityId: null, // General project task, not linked to specific activity
    title: 'Submit quarterly donor report',
    titleAr: 'تقديم التقرير الفصلي للمانح',
    description: 'Compile Q1 2024 narrative and financial report for EU',
    descriptionAr: null,
    assignedTo: 2, // Ahmad Al-Hassan
    assignedTeam: [2, 3], // Program Manager + Finance
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.URGENT,
    startDate: '2024-01-20',
    dueDate: '2024-01-31',
    completedDate: null,
    progressPercentage: 60,
    estimatedHours: 16,
    actualHours: 10,
    tags: ['reporting', 'donor', 'EU', 'quarterly'],
    dependencies: null,
    blockedBy: null,
    notifyOnDueDate: true,
    notifyAssignee: true,
    createdBy: 1,
    createdAt: '2024-01-05T08:00:00Z',
    updatedAt: '2024-01-25T16:00:00Z',
    isDeleted: false,
    deletedAt: null,
    deletedBy: null
  },
  {
    id: 4,
    organizationId: 1,
    projectId: 1,
    activityId: 1,
    title: 'Procure sports equipment',
    titleAr: 'شراء المعدات الرياضية',
    description: 'Purchase footballs, basketballs, and training cones',
    descriptionAr: null,
    assignedTo: 3, // Maria Garcia (Finance)
    assignedTeam: null,
    status: TaskStatus.BLOCKED,
    priority: TaskPriority.HIGH,
    startDate: '2024-01-18',
    dueDate: '2024-02-05',
    completedDate: null,
    progressPercentage: 25,
    estimatedHours: 8,
    actualHours: 2,
    tags: ['procurement', 'equipment', 'sports'],
    dependencies: null,
    blockedBy: 'Waiting for budget approval from finance team',
    notifyOnDueDate: true,
    notifyAssignee: true,
    createdBy: 2,
    createdAt: '2024-01-15T11:00:00Z',
    updatedAt: '2024-01-22T10:00:00Z',
    isDeleted: false,
    deletedAt: null,
    deletedBy: null
  },
  {
    id: 5,
    organizationId: 1,
    projectId: 1,
    activityId: 1,
    title: 'Conduct coach training workshop',
    titleAr: 'إجراء ورشة تدريب المدربين',
    description: '3-day workshop for 15 coaches on inclusive sports methods',
    descriptionAr: null,
    assignedTo: 2,
    assignedTeam: [2, 5],
    status: TaskStatus.COMPLETED,
    priority: TaskPriority.HIGH,
    startDate: '2023-12-10',
    dueDate: '2023-12-15',
    completedDate: '2023-12-14T17:00:00Z',
    progressPercentage: 100,
    estimatedHours: 24,
    actualHours: 22,
    tags: ['training', 'coaches', 'workshop', 'completed'],
    dependencies: null,
    blockedBy: null,
    notifyOnDueDate: false,
    notifyAssignee: false,
    createdBy: 1,
    createdAt: '2023-11-20T09:00:00Z',
    updatedAt: '2023-12-14T17:00:00Z',
    isDeleted: false,
    deletedAt: null,
    deletedBy: null
  }
];

// ============================================================================
// TASK COMMENTS
// ============================================================================

export const mockTaskComments: TaskComment[] = [
  {
    id: 1,
    taskId: 1,
    comment: 'Completed survey with 35 participants so far. On track to finish by deadline.',
    commentAr: null,
    attachments: null,
    mentions: [1], // Mentions org admin
    isInternal: false,
    createdBy: 2,
    createdAt: '2024-01-20T14:30:00Z',
    updatedAt: '2024-01-20T14:30:00Z'
  },
  {
    id: 2,
    taskId: 3,
    comment: 'Financial data compiled. Waiting for MEAL inputs from indicators team.',
    commentAr: null,
    attachments: ['https://example.com/files/q1-finance-draft.xlsx'],
    mentions: [4], // Mentions MEAL officer
    isInternal: true,
    createdBy: 3,
    createdAt: '2024-01-24T11:00:00Z',
    updatedAt: '2024-01-24T11:00:00Z'
  },
  {
    id: 3,
    taskId: 4,
    comment: 'Budget approval pending. Finance team requested revised quotations.',
    commentAr: null,
    attachments: null,
    mentions: [2, 3],
    isInternal: false,
    createdBy: 5,
    createdAt: '2024-01-22T10:00:00Z',
    updatedAt: '2024-01-22T10:00:00Z'
  }
];

// ============================================================================
// REPORTING PERIODS
// ============================================================================

export const mockReportingPeriods: ReportingPeriod[] = [
  {
    id: 1,
    organizationId: 1,
    projectId: 1,
    grantId: 1,
    name: 'Q1 2024 Reporting Period',
    nameAr: 'فترة التقرير للربع الأول 2024',
    description: 'First quarter reporting for EU grant',
    frequency: ReportingFrequency.QUARTERLY,
    startDate: '2024-01-01',
    endDate: '2024-03-31',
    status: ReportingPeriodStatus.ACTIVE,
    reportDueDate: '2024-04-15',
    reportSubmittedDate: null,
    reportApprovedDate: null,
    donorId: 1,
    donorReportFormat: 'EU',
    isLocked: false,
    notes: 'Include baseline assessment results',
    notesAr: null,
    createdBy: 1,
    createdAt: '2023-12-15T10:00:00Z',
    updatedAt: '2024-01-10T09:00:00Z',
    isDeleted: false,
    deletedAt: null,
    deletedBy: null
  },
  {
    id: 2,
    organizationId: 1,
    projectId: 1,
    grantId: 1,
    name: 'Q4 2023 Reporting Period',
    nameAr: 'فترة التقرير للربع الرابع 2023',
    description: 'Final quarter reporting for 2023',
    frequency: ReportingFrequency.QUARTERLY,
    startDate: '2023-10-01',
    endDate: '2023-12-31',
    status: ReportingPeriodStatus.CLOSED,
    reportDueDate: '2024-01-15',
    reportSubmittedDate: '2024-01-12T16:00:00Z',
    reportApprovedDate: '2024-01-18T10:00:00Z',
    donorId: 1,
    donorReportFormat: 'EU',
    isLocked: true,
    notes: 'Report approved by donor',
    notesAr: null,
    createdBy: 1,
    createdAt: '2023-09-20T10:00:00Z',
    updatedAt: '2024-01-18T10:00:00Z',
    isDeleted: false,
    deletedAt: null,
    deletedBy: null
  },
  {
    id: 3,
    organizationId: 1,
    projectId: null, // Organization-wide period
    grantId: null,
    name: 'Annual Report 2023',
    nameAr: 'التقرير السنوي 2023',
    description: 'Organization-wide annual reporting',
    frequency: ReportingFrequency.ANNUAL,
    startDate: '2023-01-01',
    endDate: '2023-12-31',
    status: ReportingPeriodStatus.SUBMITTED,
    reportDueDate: '2024-02-28',
    reportSubmittedDate: '2024-02-15T14:00:00Z',
    reportApprovedDate: null,
    donorId: null,
    donorReportFormat: null,
    isLocked: true,
    notes: 'Submitted to board of directors',
    notesAr: null,
    createdBy: 1,
    createdAt: '2023-12-01T09:00:00Z',
    updatedAt: '2024-02-15T14:00:00Z',
    isDeleted: false,
    deletedAt: null,
    deletedBy: null
  }
];

// ============================================================================
// ENHANCED ACTIVITIES (with progress tracking)
// ============================================================================

export const mockEnhancedActivities: ProjectActivityEnhanced[] = [
  {
    id: 1,
    organizationId: 1,
    projectId: 1,
    title: 'Sports Training Sessions',
    titleAr: 'جلسات التدريب الرياضي',
    description: 'Weekly sports training sessions for youth',
    descriptionAr: null,
    activityType: 'training',
    plannedStartDate: '2024-01-10',
    plannedEndDate: '2024-06-30',
    actualStartDate: '2024-01-10',
    actualEndDate: null,
    status: 'in_progress',
    completionPercentage: 0,
    progressUnit: ActivityProgressUnit.SESSIONS,
    targetQuantity: 50,
    achievedQuantity: 0,
    budget: 15000,
    assignedTo: 2, // Ahmad Al-Hassan
    assignedTeam: [2, 5],
    targetBeneficiaries: 100,
    actualBeneficiaries: 0,
    deliverables: [
      'Training manual',
      'Session attendance sheets',
      'Progress reports'
    ],
    location: 'Zaatari Camp',
    locationAr: 'مخيم الزعتري',
    governorate: 'Mafraq',
    district: 'Zaatari',
    linkedIndicators: [1, 2],
    notes: 'Sessions conducted twice weekly',
    notesAr: null,
    createdBy: 1,
    createdAt: '2023-12-20T10:00:00Z',
    updatedAt: '2024-01-10T09:00:00Z',
    isDeleted: false,
    deletedAt: null,
    deletedBy: null
  },
  {
    id: 2,
    organizationId: 1,
    projectId: 1,
    title: 'Psychosocial Support Workshops',
    titleAr: 'ورش الدعم النفسي الاجتماعي',
    description: 'Monthly PSS workshops for vulnerable youth',
    descriptionAr: null,
    activityType: 'workshop',
    plannedStartDate: '2024-02-01',
    plannedEndDate: '2024-12-31',
    actualStartDate: null,
    actualEndDate: null,
    status: 'planned',
    completionPercentage: 0,
    progressUnit: ActivityProgressUnit.PARTICIPANTS,
    targetQuantity: 150,
    achievedQuantity: 0,
    budget: 8000,
    assignedTo: 5,
    assignedTeam: [5],
    targetBeneficiaries: 150,
    actualBeneficiaries: 0,
    deliverables: [
      'PSS assessment reports',
      'Workshop materials',
      'Case referral system'
    ],
    location: 'Azraq Camp',
    locationAr: 'مخيم الأزرق',
    governorate: 'Zarqa',
    district: 'Azraq',
    linkedIndicators: [3],
    notes: null,
    notesAr: null,
    createdBy: 2,
    createdAt: '2024-01-05T11:00:00Z',
    updatedAt: '2024-01-05T11:00:00Z',
    isDeleted: false,
    deletedAt: null,
    deletedBy: null
  }
];

// ============================================================================
// ACTIVITY MILESTONES
// ============================================================================

export const mockActivityMilestones: ActivityMilestone[] = [
  {
    id: 1,
    activityId: 1,
    title: 'Complete coach training',
    titleAr: 'إكمال تدريب المدربين',
    description: 'Train 15 coaches on inclusive sports methods',
    targetDate: '2023-12-15',
    actualDate: '2023-12-14',
    status: 'completed',
    completionPercentage: 100,
    createdBy: 1,
    createdAt: '2023-11-20T10:00:00Z',
    updatedAt: '2023-12-14T17:00:00Z'
  },
  {
    id: 2,
    activityId: 1,
    title: 'Conduct 25 training sessions',
    titleAr: 'إجراء 25 جلسة تدريبية',
    description: 'Halfway point milestone for training sessions',
    targetDate: '2024-03-31',
    actualDate: null,
    status: 'pending',
    completionPercentage: 0,
    createdBy: 2,
    createdAt: '2024-01-10T09:00:00Z',
    updatedAt: '2024-01-10T09:00:00Z'
  },
  {
    id: 3,
    activityId: 1,
    title: 'Complete all 50 sessions',
    titleAr: 'إكمال جميع الـ 50 جلسة',
    description: 'Final milestone - complete all planned sessions',
    targetDate: '2024-06-30',
    actualDate: null,
    status: 'pending',
    completionPercentage: 0,
    createdBy: 2,
    createdAt: '2024-01-10T09:00:00Z',
    updatedAt: '2024-01-10T09:00:00Z'
  }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const getTasksByProject = (projectId: number): ProjectTask[] => {
  return mockProjectTasks.filter(t => t.projectId === projectId && !t.isDeleted);
};

export const getTasksByStatus = (status: TaskStatus): ProjectTask[] => {
  return mockProjectTasks.filter(t => t.status === status && !t.isDeleted);
};

export const getOverdueTasks = (): ProjectTask[] => {
  const today = new Date();
  return mockProjectTasks.filter(t => {
    if (t.isDeleted || t.status === TaskStatus.COMPLETED) return false;
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < today;
  });
};

export const getTaskStatistics = (projectId?: number): TaskStatistics => {
  let tasks = mockProjectTasks.filter(t => !t.isDeleted);
  if (projectId) {
    tasks = tasks.filter(t => t.projectId === projectId);
  }

  const today = new Date();
  const overdue = tasks.filter(t => 
    t.status !== TaskStatus.COMPLETED && 
    t.dueDate && 
    new Date(t.dueDate) < today
  );

  return {
    total: tasks.length,
    completed: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
    inProgress: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
    overdue: overdue.length,
    pending: tasks.filter(t => t.status === TaskStatus.TODO).length,
    blocked: tasks.filter(t => t.status === TaskStatus.BLOCKED).length,
    byPriority: {
      low: tasks.filter(t => t.priority === TaskPriority.LOW).length,
      medium: tasks.filter(t => t.priority === TaskPriority.MEDIUM).length,
      high: tasks.filter(t => t.priority === TaskPriority.HIGH).length,
      urgent: tasks.filter(t => t.priority === TaskPriority.URGENT).length
    },
    byAssignee: [] // Would calculate from actual data
  };
};

export const getActivityProgress = (activityId: number): string => {
  const activity = mockEnhancedActivities.find(a => a.id === activityId);
  if (!activity) return 'N/A';

  if (activity.progressUnit === ActivityProgressUnit.SESSIONS) {
    return `${activity.achievedQuantity || 0}/${activity.targetQuantity || 0} sessions (${activity.completionPercentage}%)`;
  }
  
  if (activity.progressUnit === ActivityProgressUnit.PARTICIPANTS) {
    return `${activity.achievedQuantity || 0}/${activity.targetQuantity || 0} participants (${activity.completionPercentage}%)`;
  }

  return `${activity.completionPercentage}%`;
};

export const getProjectDetailView = (projectId: number): ProjectDetailView | null => {
  // This would fetch from multiple tables
  // Simplified mock version
  return {
    project: {
      id: projectId,
      title: 'Promoting Inclusion and Social Change through Sports',
      projectCode: 'ADIDAS-YEM 007',
      status: 'active',
      startDate: '2024-01-01',
      endDate: '2024-06-30',
      daysRemaining: 167,
      description: '' // Empty - UI will hide if no description
    },
    statistics: {
      activities: {
        total: 1,
        completed: 0,
        completionPercentage: 0
      },
      indicators: {
        total: 0,
        achieved: 0,
        achievementPercentage: 0
      },
      beneficiaries: {
        target: 0,
        reached: 0,
        reachedPercentage: 0
      },
      budget: {
        total: 0,
        spent: 0,
        utilization: 0,
        currency: 'USD'
      }
    },
    grants: {
      totalGrants: 0,
      totalBudget: 0,
      activeGrants: 0,
      currency: 'USD',
      grants: []
    },
    timeline: {
      startDate: '2024-01-01',
      endDate: '2024-06-30',
      phases: [
        {
          name: 'Project Implementation',
          startDate: '2024-01-01',
          endDate: '2024-06-30',
          status: 'active'
        }
      ]
    }
  };
};