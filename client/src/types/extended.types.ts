// ============================================================================
// EXTENDED SCHEMA TYPES - Phase 3.5
// Additional tables not in original Prisma schema
// ============================================================================

import { BaseEntity, SoftDeletable, OrganizationScoped, UserTracked } from './schema.types';

// ----------------------------------------------------------------------------
// ENUMS FOR NEW TABLES
// ----------------------------------------------------------------------------

export enum TaskStatus {
 TODO = 'todo',
 IN_PROGRESS = 'in_progress',
 IN_REVIEW = 'in_review',
 COMPLETED = 'completed',
 BLOCKED = 'blocked',
 CANCELLED = 'cancelled'
}

export enum TaskPriority {
 LOW = 'low',
 MEDIUM = 'medium',
 HIGH = 'high',
 URGENT = 'urgent'
}

export enum ReportingPeriodStatus {
 DRAFT = 'draft',
 ACTIVE = 'active',
 CLOSED = 'closed',
 SUBMITTED = 'submitted'
}

export enum ReportingFrequency {
 MONTHLY = 'monthly',
 QUARTERLY = 'quarterly',
 SEMI_ANNUAL = 'semi_annual',
 ANNUAL = 'annual',
 CUSTOM = 'custom'
}

export enum ActivityProgressUnit {
 PERCENTAGE = 'percentage',
 SESSIONS = 'sessions',
 PARTICIPANTS = 'participants',
 ITEMS = 'items',
 QUANTITY = 'quantity'
}

// ----------------------------------------------------------------------------
// PROJECT TASKS (NEW)
// ----------------------------------------------------------------------------

export interface ProjectTask extends BaseEntity, OrganizationScoped, UserTracked, SoftDeletable {
 projectId: number;
 activityId: number | null; // Link to project activity
 title: string;
 titleAr: string | null;
 description: string | null;
 descriptionAr: string | null;
 
 // Assignment
 assignedTo: number | null; // User ID
 assignedTeam: number[] | null; // Array of user IDs
 
 // Status & Priority
 status: TaskStatus;
 priority: TaskPriority;
 
 // Dates
 startDate: string | null;
 dueDate: string | null;
 completedDate: string | null;
 
 // Progress
 progressPercentage: number; // 0-100
 estimatedHours: number | null;
 actualHours: number | null;
 
 // Metadata
 tags: string[] | null;
 dependencies: number[] | null; // Array of task IDs this depends on
 blockedBy: string | null; // Reason if blocked
 
 // Notifications
 notifyOnDueDate: boolean;
 notifyAssignee: boolean;
}

// ----------------------------------------------------------------------------
// TASK COMMENTS (NEW)
// ----------------------------------------------------------------------------

export interface TaskComment extends BaseEntity, UserTracked {
 taskId: number;
 comment: string;
 commentAr: string | null;
 attachments: string[] | null; // Array of file URLs
 mentions: number[] | null; // Array of user IDs mentioned
 isInternal: boolean; // Internal note vs external comment
}

// ----------------------------------------------------------------------------
// TASK ATTACHMENTS (NEW)
// ----------------------------------------------------------------------------

export interface TaskAttachment extends BaseEntity, UserTracked {
 taskId: number;
 fileName: string;
 fileUrl: string;
 fileKey: string;
 fileSize: number | null;
 mimeType: string | null;
}

// ----------------------------------------------------------------------------
// REPORTING PERIODS (NEW)
// ----------------------------------------------------------------------------

export interface ReportingPeriod extends BaseEntity, OrganizationScoped, UserTracked, SoftDeletable {
 projectId: number | null; // Null = organization-wide period
 grantId: number | null; // Link to specific grant
 
 name: string;
 nameAr: string | null;
 description: string | null;
 
 // Period Definition
 frequency: ReportingFrequency;
 startDate: string;
 endDate: string;
 
 // Status
 status: ReportingPeriodStatus;
 
 // Reporting Dates
 reportDueDate: string | null;
 reportSubmittedDate: string | null;
 reportApprovedDate: string | null;
 
 // Donor Specific
 donorId: number | null;
 donorReportFormat: string | null; // EU, UN, ECHO, etc.
 
 // Metadata
 isLocked: boolean; // Lock period to prevent data changes
 notes: string | null;
 notesAr: string | null;
}

// ----------------------------------------------------------------------------
// ENHANCED PROJECT ACTIVITIES (Updates to existing)
// ----------------------------------------------------------------------------

export interface ProjectActivityEnhanced extends BaseEntity, OrganizationScoped, UserTracked, SoftDeletable {
 projectId: number;
 
 // Basic Info
 title: string;
 titleAr: string | null;
 description: string | null;
 descriptionAr: string | null;
 activityType: string;
 
 // Timeline
 plannedStartDate: string | null;
 plannedEndDate: string | null;
 actualStartDate: string | null;
 actualEndDate: string | null;
 
 // Status
 status: string; // 'planned' | 'in_progress' | 'completed' | 'cancelled'
 completionPercentage: number;
 
 // Progress Tracking (NEW)
 progressUnit: ActivityProgressUnit;
 targetQuantity: number | null; // e.g., 50 sessions
 achievedQuantity: number | null; // e.g., 25 sessions completed
 
 // Resources
 budget: number | null;
 assignedTo: number | null;
 assignedTeam: number[] | null; // Array of user IDs
 
 // Outputs (NEW)
 targetBeneficiaries: number | null;
 actualBeneficiaries: number | null;
 deliverables: string[] | null;
 
 // Location
 location: string | null;
 locationAr: string | null;
 governorate: string | null;
 district: string | null;
 
 // Indicators Linkage
 linkedIndicators: number[] | null; // Array of indicator IDs
 
 // Notes
 notes: string | null;
 notesAr: string | null;
}

// ----------------------------------------------------------------------------
// ACTIVITY MILESTONES (NEW)
// ----------------------------------------------------------------------------

export interface ActivityMilestone extends BaseEntity, UserTracked {
 activityId: number;
 title: string;
 titleAr: string | null;
 description: string | null;
 targetDate: string;
 actualDate: string | null;
 status: 'pending' | 'completed' | 'delayed';
 completionPercentage: number;
}

// ----------------------------------------------------------------------------
// PROJECT GRANTS (Clarification - using existing grants table)
// ----------------------------------------------------------------------------

// Note: The existing 'grants' table in your schema can serve as project funding lines
// We just need to ensure the UI treats them as "funding sources" within projects
// The schema already has: grants.projectId (can be null for standalone grants)

export interface ProjectGrantSummary {
 totalGrants: number;
 totalBudget: number;
 activeGrants: number;
 currency: string;
 grants: {
 id: number;
 grantCode: string;
 donorName: string;
 amount: number;
 currency: string;
 startDate: string;
 endDate: string;
 status: string;
 }[];
}

// ----------------------------------------------------------------------------
// SYSTEM ADMINISTRATION (NEW)
// ----------------------------------------------------------------------------

export interface SystemHealth {
 status: 'healthy' | 'degraded' | 'down';
 database: {
 status: 'connected' | 'disconnected';
 responseTime: number; // ms
 lastChecked: string;
 };
 api: {
 status: 'operational' | 'error';
 responseTime: number;
 lastChecked: string;
 };
 storage: {
 status: 'available' | 'unavailable';
 usedSpace: number; // GB
 totalSpace: number; // GB
 };
}

export interface MaintenanceMode {
 isEnabled: boolean;
 message: string;
 messageAr: string | null;
 enabledBy: number | null;
 enabledAt: string | null;
 scheduledEndTime: string | null;
}

// ----------------------------------------------------------------------------
// ENHANCED AUDIT LOG (Extension of existing)
// ----------------------------------------------------------------------------

export interface EnhancedAuditLog {
 id: number;
 organizationId: number;
 userId: number;
 userName: string; // Denormalized for performance
 userRole: string;
 
 // Action Details
 action: string; // 'create' | 'update' | 'delete' | 'restore' | 'export' | 'import' | 'login' | 'logout'
 module: string; // 'projects' | 'grants' | 'finance' | etc.
 entityType: string;
 entityId: number;
 entityName: string | null; // Denormalized entity name for quick display
 
 // Changes
 changesSummary: string | null; // Human-readable summary
 changes: {
 before?: Record<string, any>;
 after?: Record<string, any>;
 } | null;
 
 // Context
 ipAddress: string | null;
 userAgent: string | null;
 location: string | null;
 sessionId: string | null;
 
 // Risk & Compliance
 riskLevel: 'low' | 'medium' | 'high' | null;
 requiresApproval: boolean;
 approvedBy: number | null;
 approvedAt: string | null;
 
 timestamp: string;
}

// ----------------------------------------------------------------------------
// PERMISSION AUDIT (NEW)
// ----------------------------------------------------------------------------

export interface PermissionAudit extends BaseEntity {
 organizationId: number;
 userId: number;
 module: string;
 action: string; // 'view' | 'create' | 'edit' | 'delete'
 wasGranted: boolean;
 roleAtTime: string;
 ipAddress: string | null;
 reason: string | null; // Why denied if wasGranted = false
}

// ----------------------------------------------------------------------------
// VIEW MODELS (Combined data for UI)
// ----------------------------------------------------------------------------

export interface ProjectDetailView {
 project: {
 id: number;
 title: string;
 projectCode: string;
 status: string;
 startDate: string;
 endDate: string;
 daysRemaining: number;
 description: string;
 };
 
 statistics: {
 activities: {
 total: number;
 completed: number;
 completionPercentage: number;
 };
 indicators: {
 total: number;
 achieved: number;
 achievementPercentage: number;
 };
 beneficiaries: {
 target: number;
 reached: number;
 reachedPercentage: number;
 };
 budget: {
 total: number;
 spent: number;
 utilization: number;
 currency: string;
 };
 };
 
 grants: ProjectGrantSummary;
 
 timeline: {
 startDate: string;
 endDate: string;
 phases: {
 name: string;
 startDate: string;
 endDate: string;
 status: string;
 }[];
 };
}

export interface TaskStatistics {
 total: number;
 completed: number;
 inProgress: number;
 overdue: number;
 pending: number;
 blocked: number;
 byPriority: {
 low: number;
 medium: number;
 high: number;
 urgent: number;
 };
 byAssignee: {
 userId: number;
 userName: string;
 taskCount: number;
 }[];
}

export interface ActivityWithProgress {
 id: number;
 title: string;
 status: string;
 progressPercentage: number;
 progressUnit: ActivityProgressUnit;
 targetQuantity: number | null;
 achievedQuantity: number | null;
 progressDisplay: string; // e.g., "25/50 sessions (50%)"
 assignedTo: {
 userId: number;
 userName: string;
 } | null;
 dateRange: {
 start: string;
 end: string;
 };
 linkedTasks: number;
 linkedIndicators: number;
}

// ----------------------------------------------------------------------------
// DASHBOARD STATISTICS (Enhanced)
// ----------------------------------------------------------------------------

export interface DashboardStatistics {
 overview: {
 activeProjects: number;
 activeGrants: number;
 totalBudget: number;
 actualSpent: number;
 balance: number;
 avgCompletionRate: number; // MEAL-based
 };
 
 alerts: {
 total: number;
 critical: number;
 warning: number;
 info: number;
 };
 
 pendingApprovals: {
 expenditures: number;
 reports: number;
 tasks: number;
 };
 
 recentActivity: EnhancedAuditLog[];
}

// ----------------------------------------------------------------------------
// FORM TYPES
// ----------------------------------------------------------------------------

export type ProjectTaskFormData = Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt' | 'deletedBy'>;
export type ReportingPeriodFormData = Omit<ReportingPeriod, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt' | 'deletedBy'>;
export type ActivityMilestoneFormData = Omit<ActivityMilestone, 'id' | 'createdAt' | 'updatedAt'>;

// ----------------------------------------------------------------------------
// FILTER TYPES
// ----------------------------------------------------------------------------

export interface TaskFilters {
 status?: TaskStatus[];
 priority?: TaskPriority[];
 assignedTo?: number[];
 projectId?: number;
 activityId?: number;
 dueDateFrom?: string;
 dueDateTo?: string;
 isOverdue?: boolean;
 search?: string;
}

export interface ActivityFilters {
 status?: string[];
 projectId?: number;
 assignedTo?: number[];
 activityType?: string[];
 dateFrom?: string;
 dateTo?: string;
 search?: string;
}
