/**
 * Annual Planning Module - Constants, Helpers, and Bilingual Support
 * Full support for Arabic (AR) and English (EN) with RTL/LTR compatibility
 */

// ============================================================================
// PLAN STATUS ENUMS
// ============================================================================

export const PLAN_STATUS = {
  DRAFT: "draft",
  PENDING_REVIEW: "pending_review",
  PENDING_APPROVAL: "pending_approval",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type PlanStatus = typeof PLAN_STATUS[keyof typeof PLAN_STATUS];

// ============================================================================
// BILINGUAL TRANSLATIONS
// ============================================================================

export const ANNUAL_PLANNING_TRANSLATIONS = {
  en: {
    // Page Titles
    hrAnnualPlan: "HR Annual Plan",
    annualPlanSubtitle: "Strategic workforce planning and resource allocation",
    
    // Plan Status Labels
    draft: "Draft",
    pendingReview: "Pending Review",
    pendingApproval: "Pending Approval",
    approved: "Approved",
    rejected: "Rejected",
    
    // KPI Labels
    totalPlannedPositions: "Total Planned Positions",
    existingStaffStartOfYear: "Existing Staff (Start of Year)",
    newPositionsRequired: "New Positions Required",
    estimatedHrCostAnnual: "Estimated HR Cost (Annual)",
    recruitmentActionsPlanned: "Recruitment Actions Planned",
    trainingActionsPlanned: "Training Actions Planned",
    
    // Filter Labels
    year: "Year",
    department: "Department",
    projectProgram: "Project/Program",
    allDepartments: "All Departments",
    allProjects: "All Projects",
    
    // Action Labels
    createNewPlan: "Create New Plan",
    exportPlans: "Export Plans",
    viewApprovedPlans: "View Approved Plans",
    
    // Table Headers
    planYear: "Plan Year",
    organization: "Organization",
    preparedBy: "Prepared By",
    preparationDate: "Preparation Date",
    status: "Status",
    positions: "Positions",
    estCost: "Est. Cost",
    actions: "Actions",
    
    // Action Buttons
    view: "View",
    edit: "Edit",
    approve: "Approve",
    reject: "Reject",
    submit: "Submit for Review",
    delete: "Delete",
    revert: "Revert to Draft",
    
    // Form Labels
    planName: "Plan Name",
    existingWorkforce: "Existing Workforce",
    plannedStaffing: "Planned Staffing",
    recruitmentPlan: "Recruitment Plan",
    budgetEstimate: "Budget Estimate",
    trainingPlan: "Training Plan",
    hrRisks: "HR Risks & Mitigation",
    notes: "Notes",
    
    // Sections
    strategicHrPlanning: "Strategic HR Planning",
    strategicHrPlanningDesc: "HR Annual Plans are strategic documents that guide recruitment, budgeting, and capacity building. Once approved, plans become read-only and serve as references for operational modules.",
    
    // Messages
    noPlans: "No annual plans created yet. Create your first strategic HR plan.",
    planCreatedSuccess: "Annual plan created successfully",
    planUpdatedSuccess: "Annual plan updated successfully",
    planDeletedSuccess: "Annual plan deleted successfully",
    planApprovedSuccess: "Annual plan approved successfully",
    planRejectedSuccess: "Annual plan rejected successfully",
    
    // Confirmation Messages
    confirmDelete: "Are you sure you want to delete this plan? This action cannot be undone.",
    confirmReject: "Are you sure you want to reject this plan?",
    
    // Error Messages
    errorLoadingPlans: "Error loading annual plans",
    errorCreatingPlan: "Error creating annual plan",
    errorUpdatingPlan: "Error updating annual plan",
    errorDeletingPlan: "Error deleting annual plan",
    errorApprovingPlan: "Error approving annual plan",
    errorRejectingPlan: "Error rejecting annual plan",
  },
  ar: {
    // Page Titles
    hrAnnualPlan: "الخطة السنوية للموارد البشرية",
    annualPlanSubtitle: "التخطيط الاستراتيجي للقوى العاملة وتخصيص الموارد",
    
    // Plan Status Labels
    draft: "مسودة",
    pendingReview: "قيد المراجعة",
    pendingApproval: "قيد الموافقة",
    approved: "موافق عليه",
    rejected: "مرفوض",
    
    // KPI Labels
    totalPlannedPositions: "إجمالي الوظائف المخطط لها",
    existingStaffStartOfYear: "الموظفون الحاليون (بداية السنة)",
    newPositionsRequired: "الوظائف الجديدة المطلوبة",
    estimatedHrCostAnnual: "التكلفة المقدرة للموارد البشرية (سنوية)",
    recruitmentActionsPlanned: "إجراءات التوظيف المخطط لها",
    trainingActionsPlanned: "إجراءات التدريب المخطط لها",
    
    // Filter Labels
    year: "السنة",
    department: "القسم",
    projectProgram: "المشروع/البرنامج",
    allDepartments: "جميع الأقسام",
    allProjects: "جميع المشاريع",
    
    // Action Labels
    createNewPlan: "إنشاء خطة جديدة",
    exportPlans: "تصدير الخطط",
    viewApprovedPlans: "عرض الخطط الموافق عليها",
    
    // Table Headers
    planYear: "سنة الخطة",
    organization: "المنظمة",
    preparedBy: "معد من قبل",
    preparationDate: "تاريخ التحضير",
    status: "الحالة",
    positions: "الوظائف",
    estCost: "التكلفة المقدرة",
    actions: "الإجراءات",
    
    // Action Buttons
    view: "عرض",
    edit: "تعديل",
    approve: "موافقة",
    reject: "رفض",
    submit: "إرسال للمراجعة",
    delete: "حذف",
    revert: "العودة إلى المسودة",
    
    // Form Labels
    planName: "اسم الخطة",
    existingWorkforce: "القوى العاملة الحالية",
    plannedStaffing: "الموظفون المخطط لهم",
    recruitmentPlan: "خطة التوظيف",
    budgetEstimate: "تقدير الميزانية",
    trainingPlan: "خطة التدريب",
    hrRisks: "مخاطر الموارد البشرية والتخفيف منها",
    notes: "ملاحظات",
    
    // Sections
    strategicHrPlanning: "التخطيط الاستراتيجي للموارد البشرية",
    strategicHrPlanningDesc: "خطط الموارد البشرية السنوية هي وثائق استراتيجية توجه التوظيف والميزانية وبناء القدرات. بمجرد الموافقة عليها، تصبح الخطط للقراءة فقط وتخدم كمراجع للوحدات التشغيلية.",
    
    // Messages
    noPlans: "لم يتم إنشاء أي خطط سنوية حتى الآن. أنشئ خطتك الاستراتيجية الأولى للموارد البشرية.",
    planCreatedSuccess: "تم إنشاء الخطة السنوية بنجاح",
    planUpdatedSuccess: "تم تحديث الخطة السنوية بنجاح",
    planDeletedSuccess: "تم حذف الخطة السنوية بنجاح",
    planApprovedSuccess: "تمت الموافقة على الخطة السنوية بنجاح",
    planRejectedSuccess: "تم رفض الخطة السنوية بنجاح",
    
    // Confirmation Messages
    confirmDelete: "هل أنت متأكد من رغبتك في حذف هذه الخطة؟ لا يمكن التراجع عن هذا الإجراء.",
    confirmReject: "هل أنت متأكد من رغبتك في رفض هذه الخطة؟",
    
    // Error Messages
    errorLoadingPlans: "خطأ في تحميل الخطط السنوية",
    errorCreatingPlan: "خطأ في إنشاء الخطة السنوية",
    errorUpdatingPlan: "خطأ في تحديث الخطة السنوية",
    errorDeletingPlan: "خطأ في حذف الخطة السنوية",
    errorApprovingPlan: "خطأ في الموافقة على الخطة السنوية",
    errorRejectingPlan: "خطأ في رفض الخطة السنوية",
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get plan status label in the specified language
 */
export function getPlanStatusLabel(status: PlanStatus, language: "en" | "ar" = "en"): string {
  const statusMap: Record<PlanStatus, keyof typeof ANNUAL_PLANNING_TRANSLATIONS.en> = {
    draft: "draft",
    pending_review: "pendingReview",
    pending_approval: "pendingApproval",
    approved: "approved",
    rejected: "rejected",
  };
  
  const key = statusMap[status];
  return ANNUAL_PLANNING_TRANSLATIONS[language][key];
}

/**
 * Get status badge color based on plan status
 */
export function getStatusBadgeColor(status: PlanStatus): string {
  switch (status) {
    case "draft":
      return "bg-gray-100 text-gray-700 border-gray-300";
    case "pending_review":
      return "bg-yellow-100 text-yellow-700 border-yellow-300";
    case "pending_approval":
      return "bg-blue-100 text-blue-700 border-blue-300";
    case "approved":
      return "bg-green-100 text-green-700 border-green-300";
    case "rejected":
      return "bg-red-100 text-red-700 border-red-300";
    default:
      return "bg-gray-100 text-gray-700 border-gray-300";
  }
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: string = "USD"): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return formatter.format(amount);
}

/**
 * Format date in the specified language
 */
export function formatPlanDate(date: Date | string, language: "en" | "ar" = "en"): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  if (language === "ar") {
    return dateObj.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  
  return dateObj.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Check if plan can be edited
 */
export function canEditPlan(status: PlanStatus): boolean {
  return status === "draft";
}

/**
 * Check if plan can be submitted for review
 */
export function canSubmitForReview(status: PlanStatus): boolean {
  return status === "draft";
}

/**
 * Check if plan can be approved
 */
export function canApprovePlan(status: PlanStatus): boolean {
  return status === "pending_approval";
}

/**
 * Check if plan can be rejected
 */
export function canRejectPlan(status: PlanStatus): boolean {
  return status === "pending_review" || status === "pending_approval";
}

/**
 * Check if plan can be reverted to draft
 */
export function canRevertToDraft(status: PlanStatus): boolean {
  return status === "pending_review" || status === "pending_approval";
}

/**
 * Check if plan is locked (read-only)
 */
export function isPlanLocked(status: PlanStatus): boolean {
  return status === "approved";
}

/**
 * Get available plan years
 */
export function getAvailablePlanYears(currentYear: number = new Date().getFullYear()): number[] {
  return Array.from({ length: 6 }, (_, i) => currentYear + i);
}

/**
 * Calculate total positions change
 */
export function calculatePositionsChange(
  totalPlanned: number,
  existingStaff: number
): number {
  return totalPlanned - existingStaff;
}

/**
 * Validate plan data
 */
export function validatePlanData(data: {
  planYear: number;
  planName: string;
  totalPlannedPositions?: number;
  existingStaff?: number;
  estimatedHrCost?: number;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.planName || data.planName.trim().length === 0) {
    errors.push("Plan name is required");
  }
  
  if (data.planYear < new Date().getFullYear()) {
    errors.push("Plan year cannot be in the past");
  }
  
  if (data.totalPlannedPositions !== undefined && data.totalPlannedPositions < 0) {
    errors.push("Total planned positions cannot be negative");
  }
  
  if (data.existingStaff !== undefined && data.existingStaff < 0) {
    errors.push("Existing staff count cannot be negative");
  }
  
  if (data.estimatedHrCost !== undefined && data.estimatedHrCost < 0) {
    errors.push("Estimated HR cost cannot be negative");
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get translation for a specific key
 */
export function getTranslation(
  key: keyof typeof ANNUAL_PLANNING_TRANSLATIONS.en,
  language: "en" | "ar" = "en"
): string {
  return ANNUAL_PLANNING_TRANSLATIONS[language][key] || "";
}
