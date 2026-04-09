import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, X, Calendar, Users, ChevronDown, ChevronRight,
  CheckCircle2, Clock, AlertCircle, Target, ListTree, AlertTriangle, Layers
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { UnifiedExportButton } from '@/components/exports/UnifiedExportButton';
import { useProjectData } from '@/hooks/useProjectData';
import { useOrganization } from '@/contexts/OrganizationContext';
import { exportToStandardExcel, exportExcelTemplate, type ExcelColumn } from '@/lib/standardExcelExport';

interface ProjectPlanTabProps {
  projectId: string;
}

// ============================================================================
// CORE DATE UTILITY FUNCTIONS (CRITICAL)
// ============================================================================

interface TimelineMonth {
  month: string;
  year: number;
  date: Date;
}

interface ProjectYear {
  yearNumber: number;
  label: string;
  startDate: string;
  endDate: string;
  months: TimelineMonth[];
}

/**
 * Generate all months between project start and end dates
 */
function generateTimelineMonths(startDate: string, endDate: string): TimelineMonth[] {
  const months: TimelineMonth[] = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  let current = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  
  while (current <= endMonth) {
    months.push({
      month: monthNames[current.getMonth()],
      year: current.getFullYear(),
      date: new Date(current)
    });
    current.setMonth(current.getMonth() + 1);
  }
  
  return months;
}

/**
 * Split project into year-based plans (for projects > 12 months)
 * CRITICAL: Uses actual project start/end dates, not calculated month boundaries
 */
function splitIntoProjectYears(startDate: string, endDate: string, allMonths: TimelineMonth[]): ProjectYear[] {
  const years: ProjectYear[] = [];
  const totalMonths = allMonths.length;
  const projectStartDate = startDate; // Actual project start date
  const projectEndDate = endDate;     // Actual project end date
  
  if (totalMonths <= 12) {
    return [{
      yearNumber: 1,
      label: 'Year 1',
      startDate: projectStartDate,
      endDate: projectEndDate,
      months: allMonths
    }];
  }
  
  let yearNumber = 1;
  while (yearNumber * 12 <= totalMonths + 11) {
    const yearStartIndex = (yearNumber - 1) * 12;
    const yearEndIndex = Math.min(yearNumber * 12, totalMonths);
    const yearMonths = allMonths.slice(yearStartIndex, yearEndIndex);
    
    if (yearMonths.length === 0) break;
    
    // For Year 1: Use actual project start date
    // For other years: Use first day of the first month in that year
    let yearStartStr: string;
    if (yearNumber === 1) {
      yearStartStr = projectStartDate;
    } else {
      const yearStart = yearMonths[0].date;
      yearStartStr = yearStart.toISOString().split('T')[0];
    }
    
    // For last year: Use actual project end date
    // For other years: Use last day of the last month in that year
    let yearEndStr: string;
    const isLastYear = yearEndIndex >= totalMonths;
    if (isLastYear) {
      yearEndStr = projectEndDate;
    } else {
      const yearEnd = new Date(yearMonths[yearMonths.length - 1].date);
      yearEnd.setMonth(yearEnd.getMonth() + 1);
      yearEnd.setDate(yearEnd.getDate() - 1);
      yearEndStr = yearEnd.toISOString().split('T')[0];
    }
    
    years.push({
      yearNumber,
      label: `Year ${yearNumber}`,
      startDate: yearStartStr,
      endDate: yearEndStr,
      months: yearMonths
    });
    
    yearNumber++;
  }
  
  return years;
}

/**
 * Validate if a date range falls within project boundaries
 */
function validateDateRange(
  itemStartDate: string,
  itemEndDate: string,
  projectStartDate: string,
  projectEndDate: string
): string | null {
  if (!itemStartDate || !itemEndDate) {
    return 'Start date and end date are required';
  }
  
  const itemStart = new Date(itemStartDate);
  const itemEnd = new Date(itemEndDate);
  const projStart = new Date(projectStartDate);
  const projEnd = new Date(projectEndDate);
  
  if (itemStart < projStart) {
    return `Start date cannot be before project start date (${projectStartDate})`;
  }
  
  if (itemEnd > projEnd) {
    return `End date cannot be after project end date (${projectEndDate})`;
  }
  
  if (itemStart > itemEnd) {
    return 'Start date cannot be after end date';
  }
  
  return null;
}

/**
 * Check if a task/activity is active during a specific month
 */
function isActiveInMonth(itemStartDate: string, itemEndDate: string, monthDate: Date): boolean {
  const start = new Date(itemStartDate);
  const end = new Date(itemEndDate);
  
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  
  return start <= monthEnd && end >= monthStart;
}

export function ProjectPlanTab({ projectId }: ProjectPlanTabProps) {
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  const { organizationId } = useOrganization();
  
  // ✅ CRITICAL: Load project data to get start/end dates
  const { project, loading: projectLoading, error: projectError } = useProjectData(projectId);

  // ============================================================================
  // tRPC QUERIES - REAL DATABASE DATA (NO MOCK DATA)
  // ============================================================================
  
  // Load Objectives from database
  const { data: objectives = [], refetch: refetchObjectives } = trpc.projectPlan.getObjectives.useQuery(
    { projectId: Number(projectId), organizationId: organizationId || 0 },
    { enabled: !!projectId && !!organizationId }
  );

  // Load Results from database
  const { data: results = [], refetch: refetchResults } = trpc.projectPlan.getResults.useQuery(
    { projectId: Number(projectId), organizationId: organizationId || 0 },
    { enabled: !!projectId && !!organizationId }
  );

  // Load Plan Activities from database
  const { data: planActivities = [], refetch: refetchActivities } = trpc.projectPlan.getPlanActivities.useQuery(
    { projectId: Number(projectId), organizationId: organizationId || 0 },
    { enabled: !!projectId && !!organizationId }
  );

  // Load Plan Tasks from database
  const { data: planTasks = [], refetch: refetchTasks } = trpc.projectPlan.getPlanTasks.useQuery(
    { projectId: Number(projectId), organizationId: organizationId || 0 },
    { enabled: !!projectId && !!organizationId }
  );

  // ✅ SINGLE SOURCE OF TRUTH: Load activities from Activities tab for dropdown
  const { data: activitiesFromTab = [] } = trpc.activities.getDropdownList.useQuery(
    { projectId: Number(projectId) },
    { enabled: !!projectId }
  );

  // ============================================================================
  // tRPC MUTATIONS
  // ============================================================================
  
  const createObjectiveMutation = trpc.projectPlan.createObjective.useMutation({
    onSuccess: () => {
      refetchObjectives();
      setShowObjectiveModal(false);
      setObjectiveForm({ title: '', titleAr: '', description: '' });
    }
  });

  const createResultMutation = trpc.projectPlan.createResult.useMutation({
    onSuccess: () => {
      refetchResults();
      setShowResultModal(false);
      setResultForm({ objectiveId: 0, title: '', titleAr: '', description: '' });
    }
  });

  const createActivityMutation = trpc.projectPlan.createPlanActivity.useMutation({
    onSuccess: () => {
      refetchActivities();
      setShowActivityModal(false);
      resetActivityForm();
    }
  });

  const syncActivityMutation = trpc.projectPlan.syncActivityFromTab.useMutation({
    onSuccess: () => {
      refetchActivities();
      setShowActivityModal(false);
      resetActivityForm();
    }
  });

  const createTaskMutation = trpc.projectPlan.createPlanTask.useMutation({
    onSuccess: () => {
      refetchTasks();
      // Don't close modal - allow adding more tasks
      setTaskForm(prev => ({
        ...prev,
        title: '',
        titleAr: '',
        responsible: '',
        startDate: '',
        endDate: ''
      }));
    }
  });

  const deleteObjectiveMutation = trpc.projectPlan.deleteObjective.useMutation({
    onSuccess: () => refetchObjectives()
  });

  const deleteResultMutation = trpc.projectPlan.deleteResult.useMutation({
    onSuccess: () => refetchResults()
  });

  const deleteActivityMutation = trpc.projectPlan.deletePlanActivity.useMutation({
    onSuccess: () => refetchActivities()
  });

  const deleteTaskMutation = trpc.projectPlan.deletePlanTask.useMutation({
    onSuccess: () => refetchTasks()
  });

  // State Management
  const [department, setDepartment] = useState<string>('Program');
  const [otherDepartment, setOtherDepartment] = useState<string>('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [activeYear, setActiveYear] = useState<number>(1);
  
  // Modal States
  const [showObjectiveModal, setShowObjectiveModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [validationError, setValidationError] = useState<string>('');

  // Form State
  const [objectiveForm, setObjectiveForm] = useState({
    title: '',
    titleAr: '',
    description: ''
  });

  const [resultForm, setResultForm] = useState({
    objectiveId: 0,
    title: '',
    titleAr: '',
    description: ''
  });

  const [activityForm, setActivityForm] = useState({
    resultId: 0,
    activityTabId: 0, // ID from Activities tab (Single Source of Truth)
    title: '',
    titleAr: '',
    description: '',
    responsible: '',
    startDate: '',
    endDate: ''
  });

  const [taskForm, setTaskForm] = useState({
    planActivityId: 0,
    title: '',
    titleAr: '',
    responsible: '',
    startDate: '',
    endDate: ''
  });

  // Pending tasks for batch creation
  const [pendingTasks, setPendingTasks] = useState<Array<{
    title: string;
    titleAr: string;
    responsible: string;
    startDate: string;
    endDate: string;
  }>>([]);

  const resetActivityForm = () => {
    setActivityForm({
      resultId: 0,
      activityTabId: 0,
      title: '',
      titleAr: '',
      description: '',
      responsible: '',
      startDate: '',
      endDate: ''
    });
    setTaskForm({
      planActivityId: 0,
      title: '',
      titleAr: '',
      responsible: '',
      startDate: '',
      endDate: ''
    });
    setPendingTasks([]);
    setValidationError('');
  };

  // ============================================================================
  // CRITICAL: Auto-generate timeline from project dates
  // ============================================================================
  
  const timelineMonths = useMemo(() => {
    if (!project) return [];
    return generateTimelineMonths(project.startDate, project.endDate);
  }, [project]);
  
  const projectYears = useMemo(() => {
    if (!project || timelineMonths.length === 0) return [];
    return splitIntoProjectYears(project.startDate, project.endDate, timelineMonths);
  }, [project, timelineMonths]);
  
  const activeYearData = useMemo(() => {
    return projectYears.find(y => y.yearNumber === activeYear) || projectYears[0];
  }, [projectYears, activeYear]);

  // ============================================================================
  // HIERARCHICAL BUTTON VISIBILITY
  // ============================================================================
  
  // Result button appears only after at least one Objective exists
  const canAddResult = objectives.length > 0;
  
  // Activity/Task button appears only after at least one Result exists
  const canAddActivityTask = results.length > 0;

  // Translations
  const translations = {
    en: {
      title: 'Project Plan',
      subtitle: 'Operational planning and implementation tracking',
      department: 'Department',
      selectDepartment: 'Select Department',
      otherSpecify: 'Specify Department',
      addObjective: 'Add Objective',
      addResult: 'Add Result',
      addActivityTask: 'Add Activity & Task',
      code: 'Code',
      mainActivity: 'Main Activity',
      subActivity: 'Sub-Activity (Task)',
      status: 'Status',
      responsible: 'Responsible',
      notStarted: 'Not Started',
      ongoing: 'Ongoing',
      completed: 'Completed',
      objective: 'Objective',
      result: 'Result',
      activity: 'Activity',
      task: 'Task',
      description: 'Description',
      startDate: 'Start Date',
      endDate: 'End Date',
      cancel: 'Cancel',
      save: 'Save',
      create: 'Create',
      delete: 'Delete',
      noData: 'No project plan items. Click "Add Objective" to start.',
      maxResultsWarning: 'Maximum 3 results per objective',
      projectDuration: 'Project Duration',
      projectYears: 'Project Years',
      selectActivity: 'Select Activity (Source of Truth)',
      addTask: 'Add Task',
      pendingTasks: 'Pending Tasks',
      createFirstObjective: 'Create an Objective first to enable Results',
      createFirstResult: 'Create a Result first to enable Activities & Tasks',
      departments: {
        Program: 'Program',
        MEAL: 'MEAL',
        Logistics: 'Logistics',
        Finance: 'Finance',
        HR: 'HR',
        Security: 'Security',
        Other: 'Other'
      }
    },
    ar: {
      title: 'خطة المشروع',
      subtitle: 'التخطيط التشغيلي وتتبع التنفيذ',
      department: 'القسم',
      selectDepartment: 'اختر القسم',
      otherSpecify: 'حدد القسم',
      addObjective: 'إضافة هدف',
      addResult: 'إضافة نتيجة',
      addActivityTask: 'إضافة نشاط ومهمة',
      code: 'الرمز',
      mainActivity: 'النشاط الرئيسي',
      subActivity: 'النشاط الفرعي (المهمة)',
      status: 'الحالة',
      responsible: 'المسؤول',
      notStarted: 'لم تبدأ',
      ongoing: 'جارية',
      completed: 'مكتملة',
      objective: 'هدف',
      result: 'نتيجة',
      activity: 'نشاط',
      task: 'مهمة',
      description: 'الوصف',
      startDate: 'تاريخ البدء',
      endDate: 'تاريخ الانتهاء',
      cancel: 'إلغاء',
      save: 'حفظ',
      create: 'إنشاء',
      delete: 'حذف',
      noData: 'لا توجد عناصر في خطة المشروع. انقر على "إضافة هدف" للبدء.',
      maxResultsWarning: 'الحد الأقصى 3 نتائج لكل هدف',
      projectDuration: 'مدة المشروع',
      projectYears: 'سنوات المشروع',
      selectActivity: 'اختر النشاط (مصدر الحقيقة)',
      addTask: 'إضافة مهمة',
      pendingTasks: 'المهام المعلقة',
      createFirstObjective: 'أنشئ هدفاً أولاً لتمكين النتائج',
      createFirstResult: 'أنشئ نتيجة أولاً لتمكين الأنشطة والمهام',
      departments: {
        Program: 'البرنامج',
        MEAL: 'المراقبة والتقييم',
        Logistics: 'اللوجستيات',
        Finance: 'المالية',
        HR: 'الموارد البشرية',
        Security: 'الأمن',
        Other: 'أخرى'
      }
    }
  };

  const lang = translations[isRTL ? 'ar' : 'en'];

  const departments = ['Program', 'MEAL', 'Logistics', 'Finance', 'HR', 'Security', 'Other'];

  // Toggle row expansion
  const toggleExpand = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // ============================================================================
  // CRUD HANDLERS
  // ============================================================================

  const handleCreateObjective = () => {
    if (!objectiveForm.title.trim()) {
      setValidationError('Title is required');
      return;
    }

    const code = `OBJ-${(objectives.length + 1).toString().padStart(2, '0')}`;
    
    createObjectiveMutation.mutate({
      projectId: Number(projectId),
      organizationId: organizationId || 0,
      code,
      title: objectiveForm.title,
      titleAr: objectiveForm.titleAr,
      description: objectiveForm.description
    });
  };

  const handleCreateResult = () => {
    if (!resultForm.objectiveId) {
      setValidationError('Please select an objective');
      return;
    }
    if (!resultForm.title.trim()) {
      setValidationError('Title is required');
      return;
    }

    const resultsForObjective = results.filter(r => r.objectiveId === resultForm.objectiveId);
    if (resultsForObjective.length >= 3) {
      setValidationError(lang.maxResultsWarning);
      return;
    }

    const code = `R${resultsForObjective.length + 1}`;
    
    createResultMutation.mutate({
      projectId: Number(projectId),
      organizationId: organizationId || 0,
      objectiveId: resultForm.objectiveId,
      code,
      title: resultForm.title,
      titleAr: resultForm.titleAr,
      description: resultForm.description
    });
  };

  const handleCreateActivityWithTasks = async () => {
    if (!project) {
      setValidationError('Project data not loaded');
      return;
    }

    if (department === 'Program' && !activityForm.resultId) {
      setValidationError('Please select a result');
      return;
    }

    if (!activityForm.activityTabId) {
      setValidationError('Please select an activity from the Activities tab');
      return;
    }

    // Validate dates
    const dateError = validateDateRange(
      activityForm.startDate,
      activityForm.endDate,
      project.startDate,
      project.endDate
    );
    
    if (dateError) {
      setValidationError(dateError);
      return;
    }

    // Sync activity from Activities tab
    syncActivityMutation.mutate({
      projectId: Number(projectId),
      organizationId: organizationId || 0,
      activityTabId: activityForm.activityTabId,
      resultId: activityForm.resultId || undefined,
      department: department as any
    });
  };

  const handleAddPendingTask = () => {
    if (!taskForm.title.trim()) {
      setValidationError('Task title is required');
      return;
    }

    setPendingTasks(prev => [...prev, {
      title: taskForm.title,
      titleAr: taskForm.titleAr,
      responsible: taskForm.responsible,
      startDate: taskForm.startDate,
      endDate: taskForm.endDate
    }]);

    setTaskForm(prev => ({
      ...prev,
      title: '',
      titleAr: '',
      responsible: '',
      startDate: '',
      endDate: ''
    }));
  };

  const handleRemovePendingTask = (index: number) => {
    setPendingTasks(prev => prev.filter((_, i) => i !== index));
  };

  // Auto-fill activity form when selecting from dropdown
  const handleActivitySelect = (activityTabId: number) => {
    const selectedActivity = activitiesFromTab.find(a => a.id === activityTabId);
    if (selectedActivity) {
      setActivityForm(prev => ({
        ...prev,
        activityTabId,
        title: selectedActivity.activityName,
        titleAr: selectedActivity.activityNameAr || '',
        startDate: selectedActivity.startDate || '',
        endDate: selectedActivity.endDate || ''
      }));
    }
  };

  // Get status badge style
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-700';
      case 'Ongoing':
        return 'bg-blue-100 text-blue-700';
      case 'Not Started':
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Export to Excel
  const handleExportExcel = async () => {
    const exportData: any[] = [];
    
    objectives.forEach(obj => {
      exportData.push({
        level: 'Objective',
        code: obj.code,
        title: obj.title,
        titleAr: obj.titleAr,
        status: obj.status || 'Not Started',
        responsible: '',
        startDate: '',
        endDate: '',
        department: department
      });

      const objResults = results.filter(r => r.objectiveId === obj.id);
      objResults.forEach(res => {
        exportData.push({
          level: 'Result',
          code: res.code,
          title: res.title,
          titleAr: res.titleAr,
          status: res.status || 'Not Started',
          responsible: '',
          startDate: '',
          endDate: '',
          department: department
        });

        const resActivities = planActivities.filter(a => a.resultId === res.id);
        resActivities.forEach(act => {
          // Activity row
          exportData.push({
            level: 'Activity',
            code: act.code,
            title: act.title,
            titleAr: act.titleAr,
            status: act.status || 'Not Started',
            responsible: act.responsible,
            startDate: act.startDate,
            endDate: act.endDate,
            department: department
          });

          // Task rows (SEPARATE from Activity)
          const actTasks = planTasks.filter(t => t.planActivityId === act.id);
          actTasks.forEach(task => {
            exportData.push({
              level: 'Task',
              code: task.code,
              title: task.title,
              titleAr: task.titleAr,
              status: task.status || 'Not Started',
              responsible: task.responsible,
              startDate: task.startDate,
              endDate: task.endDate,
              department: department
            });
          });
        });
      });
    });

    const columns: ExcelColumn[] = [
      { name: 'Level', key: 'level', width: 15, type: 'text' },
      { name: 'Code', key: 'code', width: 15, type: 'text' },
      { name: 'Title (EN)', key: 'title', width: 40, type: 'text' },
      { name: 'Title (AR)', key: 'titleAr', width: 40, type: 'text' },
      { name: 'Status', key: 'status', width: 15, type: 'text' },
      { name: 'Responsible', key: 'responsible', width: 20, type: 'text' },
      { name: 'Start Date', key: 'startDate', width: 15, type: 'date' },
      { name: 'End Date', key: 'endDate', width: 15, type: 'date' },
      { name: 'Department', key: 'department', width: 15, type: 'text' },
    ];

    await exportToStandardExcel({
      sheetName: 'Project Plan',
      columns,
      data: exportData,
      fileName: `Project_Plan_${projectId}_${new Date().toISOString().split('T')[0]}`,
      includeTotals: false,
      isRTL,
    });
  };

  const handleExportTemplate = async () => {
    const columns: ExcelColumn[] = [
      { name: 'Level*', key: 'level', width: 15, type: 'text' },
      { name: 'Code (Auto)', key: 'code', width: 15, type: 'text' },
      { name: 'Title (EN)*', key: 'title', width: 40, type: 'text' },
      { name: 'Title (AR)*', key: 'titleAr', width: 40, type: 'text' },
      { name: 'Status*', key: 'status', width: 15, type: 'text' },
      { name: 'Responsible', key: 'responsible', width: 20, type: 'text' },
      { name: 'Start Date (YYYY-MM-DD)', key: 'startDate', width: 20, type: 'date' },
      { name: 'End Date (YYYY-MM-DD)', key: 'endDate', width: 20, type: 'date' },
      { name: 'Department*', key: 'department', width: 15, type: 'text' },
    ];

    await exportExcelTemplate({
      sheetName: 'Project Plan Template',
      columns,
      fileName: 'Project_Plan_Template',
      isRTL,
    });
  };

  // Loading state
  if (projectLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project plan...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (projectError || !project) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600" />
          <div>
            <h3 className="font-semibold text-red-900">Cannot Load Project Plan</h3>
            <p className="text-sm text-red-700 mt-1">
              {projectError || 'Project data is required to generate the timeline'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between mt-6">
        <div className="text-start">
          <h2 className="text-sm font-semibold text-gray-900">{lang.title}</h2>
          <p className="text-xs text-gray-600 mt-0.5">{lang.subtitle}</p>
        </div>
      </div>

      {/* Project Duration Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-blue-600" />
          <div className="text-start">
            <p className="text-sm font-medium text-blue-900">
              {lang.projectDuration}: <span dir="ltr">{project.startDate} → {project.endDate}</span>
            </p>
            <p className="text-xs text-blue-700 mt-1">
              {timelineMonths.length} months | {projectYears.length} year{projectYears.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Multi-Year Selector */}
      {projectYears.length > 1 && (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">{lang.projectYears}:</span>
            <div className="flex gap-2">
              {projectYears.map(year => (
                <button
                  key={year.yearNumber}
                  onClick={() => setActiveYear(year.yearNumber)}
                  className={`px-4 py-2 text-sm rounded-md transition-all ${
                    activeYear === year.yearNumber
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {year.label}
                  <span className="text-xs block mt-0.5" dir="ltr">
                    ({year.startDate} - {year.endDate})
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Department Selector */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-start">
              {lang.department} *
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start"
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>
                  {lang.departments[dept as keyof typeof lang.departments]}
                </option>
              ))}
            </select>
          </div>
          {department === 'Other' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-start">
                {lang.otherSpecify} *
              </label>
              <input
                type="text"
                value={otherDepartment}
                onChange={(e) => setOtherDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start"
                placeholder={lang.otherSpecify}
              />
            </div>
          )}
        </div>
      </div>

      {/* ============================================================================
          HIERARCHICAL ACTION BUTTONS
          Result appears after Objective, Activity/Task appears after Result
          ============================================================================ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {department === 'Program' && (
            <>
              {/* Always show Add Objective */}
              <button
                onClick={() => setShowObjectiveModal(true)}
                className="px-3 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-2"
              >
                <Target className="w-4 h-4" />
                {lang.addObjective}
              </button>

              {/* Add Result - only visible after Objective exists */}
              {canAddResult ? (
                <button
                  onClick={() => setShowResultModal(true)}
                  className="px-3 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2"
                >
                  <ListTree className="w-4 h-4" />
                  {lang.addResult}
                </button>
              ) : (
                <span className="px-3 py-2 text-sm text-gray-400 bg-gray-100 rounded-md flex items-center gap-2">
                  <ListTree className="w-4 h-4" />
                  {lang.addResult}
                  <span className="text-xs">({lang.createFirstObjective})</span>
                </span>
              )}
            </>
          )}

          {/* Add Activity & Task - only visible after Result exists */}
          {canAddActivityTask ? (
            <button
              onClick={() => setShowActivityModal(true)}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <Layers className="w-4 h-4" />
              {lang.addActivityTask}
            </button>
          ) : (
            <span className="px-3 py-2 text-sm text-gray-400 bg-gray-100 rounded-md flex items-center gap-2">
              <Layers className="w-4 h-4" />
              {lang.addActivityTask}
              <span className="text-xs">({lang.createFirstResult})</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <UnifiedExportButton
            hasData={planActivities.length > 0 || planTasks.length > 0 || objectives.length > 0}
            onExportData={handleExportExcel}
            onExportTemplate={handleExportTemplate}
            moduleName="Project Plan"
            showModal={true}
          />
        </div>
      </div>

      {/* ============================================================================
          TIMELINE TABLE - SEPARATE ACTIVITY AND TASK ROWS
          ============================================================================ */}
      {activeYearData && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto" dir={isRTL ? 'rtl' : 'ltr'}>
            <table className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider sticky ${isRTL ? 'right-0' : 'left-0'} bg-gray-50 z-10 text-start`} style={{ minWidth: '300px' }}>
                    {lang.code} / {lang.activity}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase text-start">
                    {lang.status}
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase text-start">
                    {lang.responsible}
                  </th>
                  {activeYearData.months.map((month, idx) => (
                    <th key={idx} className="px-2 py-3 text-center text-xs font-semibold text-gray-700 uppercase" style={{ minWidth: '60px' }}>
                      <div>{month.month}</div>
                      <div className="text-gray-500 font-normal">{month.year}</div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase text-center">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {objectives.length === 0 ? (
                  <tr>
                    <td colSpan={activeYearData.months.length + 4} className="px-4 py-8 text-center text-gray-500">
                      {lang.noData}
                    </td>
                  </tr>
                ) : (
                  <>
                    {objectives.map(objective => {
                      const objResults = results.filter(r => r.objectiveId === objective.id);
                      return (
                        <React.Fragment key={`obj-${objective.id}`}>
                          {/* Objective Row */}
                          <tr className="bg-purple-50">
                            <td className={`px-4 py-3 sticky ${isRTL ? 'right-0' : 'left-0'} bg-purple-50 z-10`}>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => toggleExpand(`obj-${objective.id}`)}
                                  className="text-purple-600 hover:text-purple-800"
                                >
                                  {expandedRows.has(`obj-${objective.id}`) ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </button>
                                <Target className="w-4 h-4 text-purple-600" />
                                <span className="font-semibold text-purple-900">
                                  {objective.code}: {isRTL ? objective.titleAr : objective.title}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(objective.status || 'Not Started')}`}>
                                {objective.status || 'Not Started'}
                              </span>
                            </td>
                            <td className="px-4 py-3">-</td>
                            {activeYearData.months.map((_, idx) => (
                              <td key={idx} className="px-2 py-3"></td>
                            ))}
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => deleteObjectiveMutation.mutate({ id: objective.id })}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>

                          {/* Results under this Objective */}
                          {expandedRows.has(`obj-${objective.id}`) && objResults.map(result => {
                            const resActivities = planActivities.filter(a => a.resultId === result.id);
                            return (
                              <React.Fragment key={`res-${result.id}`}>
                                {/* Result Row */}
                                <tr className="bg-indigo-50">
                                  <td className={`px-4 py-3 ps-10 sticky ${isRTL ? 'right-0' : 'left-0'} bg-indigo-50 z-10`}>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => toggleExpand(`res-${result.id}`)}
                                        className="text-indigo-600 hover:text-indigo-800"
                                      >
                                        {expandedRows.has(`res-${result.id}`) ? (
                                          <ChevronDown className="w-4 h-4" />
                                        ) : (
                                          <ChevronRight className="w-4 h-4" />
                                        )}
                                      </button>
                                      <ListTree className="w-4 h-4 text-indigo-600" />
                                      <span className="font-medium text-indigo-900">
                                        {result.code}: {isRTL ? result.titleAr : result.title}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(result.status || 'Not Started')}`}>
                                      {result.status || 'Not Started'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">-</td>
                                  {activeYearData.months.map((_, idx) => (
                                    <td key={idx} className="px-2 py-3"></td>
                                  ))}
                                  <td className="px-4 py-3 text-center">
                                    <button
                                      onClick={() => deleteResultMutation.mutate({ id: result.id })}
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>

                                {/* Activities under this Result */}
                                {expandedRows.has(`res-${result.id}`) && resActivities.map(activity => {
                                  const actTasks = planTasks.filter(t => t.planActivityId === activity.id);
                                  return (
                                    <React.Fragment key={`act-${activity.id}`}>
                                      {/* ============================================================================
                                          ACTIVITY ROW (SEPARATE FROM TASKS)
                                          ============================================================================ */}
                                      <tr className="bg-blue-50 hover:bg-blue-100">
                                        <td className={`px-4 py-3 ps-16 sticky ${isRTL ? 'right-0' : 'left-0'} bg-blue-50 z-10`}>
                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={() => toggleExpand(`act-${activity.id}`)}
                                              className="text-blue-600 hover:text-blue-800"
                                            >
                                              {expandedRows.has(`act-${activity.id}`) ? (
                                                <ChevronDown className="w-4 h-4" />
                                              ) : (
                                                <ChevronRight className="w-4 h-4" />
                                              )}
                                            </button>
                                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                            <span className="font-medium text-blue-900">
                                              {activity.code}: {isRTL ? activity.titleAr : activity.title}
                                            </span>
                                            {activity.isSynced && (
                                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                                Synced
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="px-4 py-3">
                                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(activity.status || 'Not Started')}`}>
                                            {activity.status || 'Not Started'}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                          {activity.responsible || '-'}
                                        </td>
                                        {activeYearData.months.map((month, idx) => (
                                          <td key={idx} className="px-2 py-3">
                                            {activity.startDate && activity.endDate && isActiveInMonth(activity.startDate, activity.endDate, month.date) && (
                                              <div className="h-3 bg-blue-400 rounded"></div>
                                            )}
                                          </td>
                                        ))}
                                        <td className="px-4 py-3 text-center">
                                          <button
                                            onClick={() => deleteActivityMutation.mutate({ id: activity.id })}
                                            className="text-red-600 hover:text-red-800"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </td>
                                      </tr>

                                      {/* ============================================================================
                                          TASK ROWS (SEPARATE FROM ACTIVITY)
                                          ============================================================================ */}
                                      {expandedRows.has(`act-${activity.id}`) && actTasks.map(task => (
                                        <tr key={`task-${task.id}`} className="bg-white hover:bg-gray-50">
                                          <td className={`px-4 py-2 ps-24 sticky ${isRTL ? 'right-0' : 'left-0'} bg-white z-10`}>
                                            <div className="flex items-center gap-2">
                                              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                                              <span className="text-sm text-gray-700">
                                                {task.code}: {isRTL ? task.titleAr : task.title}
                                              </span>
                                            </div>
                                          </td>
                                          <td className="px-4 py-2">
                                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(task.status || 'Not Started')}`}>
                                              {task.status || 'Not Started'}
                                            </span>
                                          </td>
                                          <td className="px-4 py-2 text-sm text-gray-600">
                                            {task.responsible || '-'}
                                          </td>
                                          {activeYearData.months.map((month, idx) => (
                                            <td key={idx} className="px-2 py-2">
                                              {task.startDate && task.endDate && isActiveInMonth(task.startDate, task.endDate, month.date) && (
                                                <div className="h-2 bg-gray-400 rounded"></div>
                                              )}
                                            </td>
                                          ))}
                                          <td className="px-4 py-2 text-center">
                                            <button
                                              onClick={() => deleteTaskMutation.mutate({ id: task.id })}
                                              className="text-red-600 hover:text-red-800"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </React.Fragment>
                                  );
                                })}
                              </React.Fragment>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================================
          MODALS
          ============================================================================ */}

      {/* Add Objective Modal */}
      {showObjectiveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{lang.addObjective}</h3>
              <button onClick={() => setShowObjectiveModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {validationError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm">
                  {validationError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title (EN) *</label>
                <input
                  type="text"
                  value={objectiveForm.title}
                  onChange={(e) => setObjectiveForm({ ...objectiveForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Enter objective title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title (AR)</label>
                <input
                  type="text"
                  value={objectiveForm.titleAr}
                  onChange={(e) => setObjectiveForm({ ...objectiveForm, titleAr: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="أدخل عنوان الهدف"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{lang.description}</label>
                <textarea
                  value={objectiveForm.description}
                  onChange={(e) => setObjectiveForm({ ...objectiveForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  rows={3}
                  placeholder="Enter description"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button
                onClick={() => {
                  setShowObjectiveModal(false);
                  setValidationError('');
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {lang.cancel}
              </button>
              <button
                onClick={handleCreateObjective}
                disabled={createObjectiveMutation.isPending}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {createObjectiveMutation.isPending ? 'Creating...' : lang.create}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Result Modal */}
      {showResultModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{lang.addResult}</h3>
              <button onClick={() => setShowResultModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {validationError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm">
                  {validationError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{lang.objective} *</label>
                <select
                  value={resultForm.objectiveId}
                  onChange={(e) => setResultForm({ ...resultForm, objectiveId: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value={0}>-- Select Objective --</option>
                  {objectives.map(obj => (
                    <option key={obj.id} value={obj.id}>
                      {obj.code}: {isRTL ? obj.titleAr : obj.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title (EN) *</label>
                <input
                  type="text"
                  value={resultForm.title}
                  onChange={(e) => setResultForm({ ...resultForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Enter result title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title (AR)</label>
                <input
                  type="text"
                  value={resultForm.titleAr}
                  onChange={(e) => setResultForm({ ...resultForm, titleAr: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="أدخل عنوان النتيجة"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{lang.description}</label>
                <textarea
                  value={resultForm.description}
                  onChange={(e) => setResultForm({ ...resultForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  rows={3}
                  placeholder="Enter description"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button
                onClick={() => {
                  setShowResultModal(false);
                  setValidationError('');
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {lang.cancel}
              </button>
              <button
                onClick={handleCreateResult}
                disabled={createResultMutation.isPending}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {createResultMutation.isPending ? 'Creating...' : lang.create}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Activity & Task Modal (MERGED FORM) */}
      {showActivityModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold">{lang.addActivityTask}</h3>
              <button onClick={() => { setShowActivityModal(false); resetActivityForm(); }} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-6">
              {validationError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm">
                  {validationError}
                </div>
              )}

              {/* ACTIVITY SECTION */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  {lang.activity} (Source of Truth)
                </h4>

                {department === 'Program' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{lang.result} *</label>
                    <select
                      value={activityForm.resultId}
                      onChange={(e) => setActivityForm({ ...activityForm, resultId: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value={0}>-- Select Result --</option>
                      {results.map(res => (
                        <option key={res.id} value={res.id}>
                          {res.code}: {isRTL ? res.titleAr : res.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {lang.selectActivity} *
                    <span className="text-xs text-green-600 ml-2">(Auto-synced from Activities tab)</span>
                  </label>
                  <select
                    value={activityForm.activityTabId}
                    onChange={(e) => handleActivitySelect(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value={0}>-- Select Activity --</option>
                    {activitiesFromTab.map(act => (
                      <option key={act.id} value={act.id}>
                        {act.activityCode} - {act.activityName}
                      </option>
                    ))}
                  </select>
                </div>

                {activityForm.activityTabId > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{lang.startDate} *</label>
                      <input
                        type="date"
                        value={activityForm.startDate}
                        onChange={(e) => setActivityForm({ ...activityForm, startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                        min={project?.startDate}
                        max={project?.endDate}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{lang.endDate} *</label>
                      <input
                        type="date"
                        value={activityForm.endDate}
                        onChange={(e) => setActivityForm({ ...activityForm, endDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                        min={project?.startDate}
                        max={project?.endDate}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* TASKS SECTION */}
              {activityForm.activityTabId > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                    {lang.task} (Sub-Activities)
                  </h4>

                  {/* Pending Tasks List */}
                  {pendingTasks.length > 0 && (
                    <div className="mb-4 space-y-2">
                      <p className="text-sm font-medium text-gray-700">{lang.pendingTasks}:</p>
                      {pendingTasks.map((task, index) => (
                        <div key={index} className="flex items-center justify-between bg-white border border-gray-200 rounded-md px-3 py-2">
                          <span className="text-sm">{task.title}</span>
                          <button
                            onClick={() => handleRemovePendingTask(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Task Form */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Task Title (EN)</label>
                        <input
                          type="text"
                          value={taskForm.title}
                          onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                          placeholder="Enter task title"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Task Title (AR)</label>
                        <input
                          type="text"
                          value={taskForm.titleAr}
                          onChange={(e) => setTaskForm({ ...taskForm, titleAr: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                          placeholder="أدخل عنوان المهمة"
                          dir="rtl"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{lang.responsible}</label>
                        <input
                          type="text"
                          value={taskForm.responsible}
                          onChange={(e) => setTaskForm({ ...taskForm, responsible: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                          placeholder="Responsible person"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{lang.startDate}</label>
                        <input
                          type="date"
                          value={taskForm.startDate}
                          onChange={(e) => setTaskForm({ ...taskForm, startDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                          min={activityForm.startDate || project?.startDate}
                          max={activityForm.endDate || project?.endDate}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{lang.endDate}</label>
                        <input
                          type="date"
                          value={taskForm.endDate}
                          onChange={(e) => setTaskForm({ ...taskForm, endDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                          min={activityForm.startDate || project?.startDate}
                          max={activityForm.endDate || project?.endDate}
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleAddPendingTask}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      {lang.addTask}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-4 border-t sticky bottom-0 bg-white">
              <button
                onClick={() => { setShowActivityModal(false); resetActivityForm(); }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {lang.cancel}
              </button>
              <button
                onClick={handleCreateActivityWithTasks}
                disabled={syncActivityMutation.isPending || !activityForm.activityTabId}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {syncActivityMutation.isPending ? 'Creating...' : `${lang.create} Activity${pendingTasks.length > 0 ? ` + ${pendingTasks.length} Tasks` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
