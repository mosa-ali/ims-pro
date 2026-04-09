/**
 * ============================================================================
 * RISK & COMPLIANCE SERVICE
 * ============================================================================
 * 
 * PURPOSE: Service layer for Risk & Compliance module
 * 
 * ARCHITECTURE:
 * Component → Hook → Service → tRPC Router → Database
 * 
 * This service provides a clean abstraction over tRPC calls for:
 * - Reusable data logic
 * - Testability
 * - Future caching
 * - Clean separation
 * - Scalability
 * 
 * GOVERNANCE:
 * - All data operations happen in backend (riskComplianceRouter.ts)
 * - This service ONLY calls tRPC endpoints
 * - NO frontend aggregation
 * - NO mock data
 * - NO localStorage
 * 
 * ============================================================================
 */

import { trpc } from '@/lib/trpc';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Risk {
 id: number;
 organizationId: number;
 operatingUnitId: number | null;
 riskCode: string | null;
 title: string;
 titleAr: string | null;
 description: string | null;
 descriptionAr: string | null;
 category: "operational" | "financial" | "strategic" | "compliance" | "reputational" | "technological" | "environmental" | "security" | "legal" | "other";
 likelihood: number; // 1-5
 impact: number; // 1-5
 score: number; // 1-25 (likelihood × impact)
 level: "low" | "medium" | "high" | "critical";
 status: "identified" | "assessed" | "mitigated" | "accepted" | "transferred" | "closed";
 mitigationPlan: string | null;
 mitigationPlanAr: string | null;
 owner: number | null;
 ownerName?: string | null;
 identifiedDate: Date | null;
 reviewDate: Date | null;
 targetClosureDate: Date | null;
 closedDate: Date | null;
 attachments: string | null; // JSON array
 notes: string | null;
 isDeleted: boolean;
 deletedAt: Date | null;
 deletedBy: number | null;
 createdAt: Date;
 updatedAt: Date;
 createdBy: number | null;
}

export interface Incident {
 id: number;
 organizationId: number;
 operatingUnitId: number | null;
 incidentCode: string | null;
 title: string;
 titleAr: string | null;
 description: string;
 descriptionAr: string | null;
 category: "safety" | "security" | "data_breach" | "operational" | "hr" | "financial" | "environmental" | "legal" | "reputational" | "other";
 severity: "minor" | "moderate" | "major" | "critical";
 incidentDate: Date;
 reportedDate: Date;
 location: string | null;
 reportedBy: number | null;
 reportedByName?: string | null;
 affectedParties: string | null; // JSON array
 witnesses: string | null; // JSON array
 investigationStatus: "pending" | "in_progress" | "completed" | "closed";
 investigationNotes: string | null;
 investigatedBy: number | null;
 investigationCompletedAt: Date | null;
 rootCause: string | null;
 rootCauseAr: string | null;
 correctiveActions: string | null; // JSON array
 preventiveActions: string | null; // JSON array
 relatedRiskId: number | null;
 relatedRiskTitle?: string | null;
 status: "open" | "under_investigation" | "resolved" | "closed";
 resolutionDate: Date | null;
 resolutionNotes: string | null;
 attachments: string | null; // JSON array
 notes: string | null;
 isDeleted: boolean;
 deletedAt: Date | null;
 deletedBy: number | null;
 createdAt: Date;
 updatedAt: Date;
 createdBy: number | null;
}

export interface RiskHistory {
 id: number;
 riskId: number;
 organizationId: number;
 operatingUnitId: number | null;
 changeType: "created" | "status_changed" | "owner_changed" | "assessment_updated" | "mitigation_updated" | "closed" | "reopened" | "other";
 previousValue: any;
 newValue: any;
 description: string | null;
 descriptionAr: string | null;
 changedBy: number | null;
 changedByName?: string;
 changedAt: Date;
}

export interface DashboardData {
 totalRisks: number;
 highCriticalRisks: number;
 mitigatedRisks: number;
 levelDistribution: {
 low: number;
 medium: number;
 high: number;
 critical: number;
 };
 monthlyTrends: {
 month: string;
 count: number;
 high: number;
 critical: number;
 }[];
 categoryBreakdown: {
 category: string;
 count: number;
 }[];
}

export interface CreateRiskInput {
 riskCode?: string;
 title: string;
 titleAr?: string;
 description?: string;
 descriptionAr?: string;
 category: Risk['category'];
 likelihood: number;
 impact: number;
 status?: Risk['status'];
 mitigationPlan?: string;
 mitigationPlanAr?: string;
 owner?: number;
 identifiedDate?: string;
 reviewDate?: string;
 targetClosureDate?: string;
 attachments?: string;
 notes?: string;
}

export interface UpdateRiskInput {
 id: number;
 riskCode?: string;
 title?: string;
 titleAr?: string;
 description?: string;
 descriptionAr?: string;
 category?: Risk['category'];
 likelihood?: number;
 impact?: number;
 status?: Risk['status'];
 mitigationPlan?: string;
 mitigationPlanAr?: string;
 owner?: number;
 identifiedDate?: string;
 reviewDate?: string;
 targetClosureDate?: string;
 closedDate?: string;
 attachments?: string;
 notes?: string;
}

export interface CreateIncidentInput {
 incidentCode?: string;
 title: string;
 titleAr?: string;
 description: string;
 descriptionAr?: string;
 category: Incident['category'];
 severity: Incident['severity'];
 incidentDate: string;
 location?: string;
 reportedBy?: number;
 affectedParties?: string;
 witnesses?: string;
 relatedRiskId?: number;
 attachments?: string;
 notes?: string;
}

export interface UpdateIncidentInput {
 id: number;
 incidentCode?: string;
 title?: string;
 titleAr?: string;
 description?: string;
 descriptionAr?: string;
 category?: Incident['category'];
 severity?: Incident['severity'];
 incidentDate?: string;
 location?: string;
 reportedBy?: number;
 affectedParties?: string;
 witnesses?: string;
 investigationStatus?: Incident['investigationStatus'];
 investigationNotes?: string;
 investigatedBy?: number;
 investigationCompletedAt?: string;
 rootCause?: string;
 rootCauseAr?: string;
 correctiveActions?: string;
 preventiveActions?: string;
 relatedRiskId?: number;
 status?: Incident['status'];
 resolutionDate?: string;
 resolutionNotes?: string;
 attachments?: string;
 notes?: string;
}

// ============================================================================
// RISK & COMPLIANCE SERVICE
// ============================================================================

/**
 * Risk & Compliance Service
 * 
 * Provides methods to fetch and mutate risk and incident data via tRPC.
 * All methods return tRPC query/mutation hooks that can be used in React components.
 */
export const riskComplianceService = {
 // ============================================================================
 // RISKS
 // ============================================================================

 /**
 * List all risks with optional filters
 */
 useRisksList: (filters?: {
 status?: Risk['status'];
 level?: Risk['level'];
 category?: Risk['category'];
 ownerId?: number;
 }) => {
 return trpc.riskCompliance.risks.list.useQuery(filters);
 },

 /**
 * Get single risk by ID
 */
 useRisk: (id: number) => {
 return trpc.riskCompliance.risks.getById.useQuery({ id });
 },

 /**
 * Create new risk
 */
 useCreateRisk: () => {
 return trpc.riskCompliance.risks.create.useMutation();
 },

 /**
 * Update existing risk
 */
 useUpdateRisk: () => {
 return trpc.riskCompliance.risks.update.useMutation();
 },

 /**
 * Delete risk (soft delete)
 */
 useDeleteRisk: () => {
 return trpc.riskCompliance.risks.delete.useMutation();
 },

 /**
 * Get risk history (audit trail)
 */
 useRiskHistory: (riskId: number) => {
 return trpc.riskCompliance.risks.getHistory.useQuery({ riskId });
 },

 /**
 * Get related incidents for a risk
 */
 useRiskRelatedIncidents: (riskId: number) => {
 return trpc.riskCompliance.risks.getRelatedIncidents.useQuery({ riskId });
 },

 // ============================================================================
 // INCIDENTS
 // ============================================================================

 /**
 * List all incidents with optional filters
 */
 useIncidentsList: (filters?: {
 status?: Incident['status'];
 severity?: Incident['severity'];
 category?: Incident['category'];
 relatedRiskId?: number;
 }) => {
 return trpc.riskCompliance.incidents.list.useQuery(filters);
 },

 /**
 * Get single incident by ID
 */
 useIncident: (id: number) => {
 return trpc.riskCompliance.incidents.getById.useQuery({ id });
 },

 /**
 * Create new incident
 */
 useCreateIncident: () => {
 return trpc.riskCompliance.incidents.create.useMutation();
 },

 /**
 * Update existing incident
 */
 useUpdateIncident: () => {
 return trpc.riskCompliance.incidents.update.useMutation();
 },

 /**
 * Delete incident (soft delete)
 */
 useDeleteIncident: () => {
 return trpc.riskCompliance.incidents.delete.useMutation();
 },

 // ============================================================================
 // DASHBOARD
 // ============================================================================

 /**
 * Get dashboard analytics data
 */
 useDashboard: () => {
 return trpc.riskCompliance.dashboard.getDashboardData.useQuery();
 },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Export utility functions for risk scoring and formatting
 * These are pure functions that don't fetch data
 */
export const riskComplianceUtils = {
 /**
 * Calculate risk score and level (client-side validation only)
 * Backend is the source of truth for scoring
 */
 calculateRiskScore: (likelihood: number, impact: number): { score: number; level: Risk['level'] } => {
 const score = likelihood * impact;
 
 let level: Risk['level'];
 if (score >= 1 && score <= 4) {
 level = "low";
 } else if (score >= 5 && score <= 10) {
 level = "medium";
 } else if (score >= 11 && score <= 19) {
 level = "high";
 } else {
 level = "critical";
 }
 
 return { score, level };
 },

 /**
 * Get color for risk level
 */
 getLevelColor: (level: Risk['level']): string => {
 const colors = {
 low: 'green',
 medium: 'yellow',
 high: 'orange',
 critical: 'red',
 };
 return colors[level];
 },

 /**
 * Get color for incident severity
 */
 getSeverityColor: (severity: Incident['severity']): string => {
 const colors = {
 minor: 'green',
 moderate: 'yellow',
 major: 'orange',
 critical: 'red',
 };
 return colors[severity];
 },

 /**
 * Format date for display
 */
 formatDate: (date: Date | string | null): string => {
 if (!date) return 'N/A';
 return new Date(date).toLocaleDateString('en-US', {
 year: 'numeric',
 month: 'short',
 day: 'numeric',
 });
 },

 /**
 * Parse JSON attachments
 */
 parseAttachments: (attachments: string | null): any[] => {
 if (!attachments) return [];
 try {
 return JSON.parse(attachments);
 } catch {
 return [];
 }
 },

 /**
 * Stringify attachments for storage
 */
 stringifyAttachments: (attachments: any[]): string => {
 return JSON.stringify(attachments);
 },

 /**
 * Get category label (bilingual support)
 */
 getCategoryLabel: (category: Risk['category'] | Incident['category'], language: 'en' | 'ar'): string => {
 const labels: Record<string, { en: string; ar: string }> = {
 operational: { en: 'Operational', ar: 'تشغيلي' },
 financial: { en: 'Financial', ar: 'مالي' },
 strategic: { en: 'Strategic', ar: 'استراتيجي' },
 compliance: { en: 'Compliance', ar: 'امتثال' },
 reputational: { en: 'Reputational', ar: 'سمعة' },
 technological: { en: 'Technological', ar: 'تكنولوجي' },
 environmental: { en: 'Environmental', ar: 'بيئي' },
 security: { en: 'Security', ar: 'أمني' },
 legal: { en: 'Legal', ar: 'قانوني' },
 safety: { en: 'Safety', ar: 'سلامة' },
 data_breach: { en: 'Data Breach', ar: 'اختراق بيانات' },
 hr: { en: 'HR', ar: 'موارد بشرية' },
 other: { en: 'Other', ar: 'أخرى' },
 };
 return labels[category]?.[language] || category;
 },

 /**
 * Get status label (bilingual support)
 */
 getStatusLabel: (status: Risk['status'] | Incident['status'], language: 'en' | 'ar'): string => {
 const labels: Record<string, { en: string; ar: string }> = {
 identified: { en: 'Identified', ar: 'محدد' },
 assessed: { en: 'Assessed', ar: 'مقيّم' },
 mitigated: { en: 'Mitigated', ar: 'مخفف' },
 accepted: { en: 'Accepted', ar: 'مقبول' },
 transferred: { en: 'Transferred', ar: 'منقول' },
 closed: { en: 'Closed', ar: 'مغلق' },
 open: { en: 'Open', ar: 'مفتوح' },
 under_investigation: { en: 'Under Investigation', ar: 'قيد التحقيق' },
 resolved: { en: 'Resolved', ar: 'محلول' },
 };
 return labels[status]?.[language] || status;
 },

 /**
 * Get level label (bilingual support)
 */
 getLevelLabel: (level: Risk['level'], language: 'en' | 'ar'): string => {
 const labels: Record<Risk['level'], { en: string; ar: string }> = {
 low: { en: 'Low', ar: 'منخفض' },
 medium: { en: 'Medium', ar: 'متوسط' },
 high: { en: 'High', ar: 'عالي' },
 critical: { en: 'Critical', ar: 'حرج' },
 };
 return labels[level][language];
 },

 /**
 * Get severity label (bilingual support)
 */
 getSeverityLabel: (severity: Incident['severity'], language: 'en' | 'ar'): string => {
 const labels: Record<Incident['severity'], { en: string; ar: string }> = {
 minor: { en: 'Minor', ar: 'طفيف' },
 moderate: { en: 'Moderate', ar: 'متوسط' },
 major: { en: 'Major', ar: 'كبير' },
 critical: { en: 'Critical', ar: 'حرج' },
 };
 return labels[severity][language];
 },
};
