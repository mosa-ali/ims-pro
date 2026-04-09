/**
 * ============================================================================
 * CASE MANAGEMENT SERVICE
 * AUTHORITATIVE DATA SOURCE for Case Management Module
 * ============================================================================
 * 
 * STORAGE KEYS:
 * - pms_case_records: CaseRecord[]
 * - pms_pss_sessions: PSSSession[]
 * - pms_case_referrals: CaseReferral[]
 * - pms_case_activities: CaseActivity[]
 * - pms_css_locations: ChildSafeSpace[]
 * - pms_css_activities: CSSActivity[]
 * 
 * BUSINESS RULES:
 * 1. All case codes must be unique and follow format: CM-{PROJECT_CODE}-{NUMBER}
 * 2. Risk level assessment required for all new cases
 * 3. Informed consent MUST be obtained before recording sensitive data
 * 4. Follow-up dates automatically tracked
 * 5. Referrals must have consent before external sharing
 * 6. Soft delete only - maintain audit trail
 * 
 * ============================================================================
 */

import type {
 CaseRecord,
 CaseManagementKPIs,
 PSSSession,
 CaseReferral,
 CaseActivity,
 ChildSafeSpace,
 CSSActivity,
 CaseFilters,
 CaseManagementReport,
 ReportFilters
} from '@/app/types/caseManagement';

const STORAGE_KEYS = {
 CASE_RECORDS: 'pms_case_records',
 PSS_SESSIONS: 'pms_pss_sessions',
 CASE_REFERRALS: 'pms_case_referrals',
 CASE_ACTIVITIES: 'pms_case_activities',
 CSS_LOCATIONS: 'pms_css_locations',
 CSS_ACTIVITIES: 'pms_css_activities'
} as const;

// ============================================================================
// CASE MANAGEMENT KPIs
// ============================================================================

export function getCaseManagementKPIs(projectId?: number): CaseManagementKPIs {
 const cases = getCaseRecords(projectId);
 const pssSessions = getPSSSessions();
 const referrals = getCaseReferrals();
 const cssActivities = getCSSActivities();
 const cssLocations = getCSSLocations();

 const now = new Date();
 const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

 const activeCases = cases.filter(c => c.status === 'open' || c.status === 'ongoing');
 const newCasesThisMonth = cases.filter(c => c.openedAt >= thisMonthStart);
 const closedCases = cases.filter(c => c.status === 'closed');
 const highRiskCases = cases.filter(c => c.riskLevel === 'high' && c.status !== 'closed');

 const pendingReferrals = referrals.filter(r => 
 r.status === 'pending' || r.status === 'in_progress'
 );

 const individualSessions = pssSessions.filter(s => s.sessionType === 'individual');
 const groupSessions = pssSessions.filter(s => s.sessionType === 'group');

 const childrenReached = cssActivities.reduce((sum, act) => sum + act.participantsCount, 0);

 return {
 totalActiveCases: activeCases.length,
 newCasesThisMonth: newCasesThisMonth.length,
 closedCases: closedCases.length,
 highRiskCases: highRiskCases.length,
 pendingReferrals: pendingReferrals.length,
 followUpsDue: referrals.filter(r => 
 r.followUpDate && r.followUpDate <= now.toISOString().split('T')[0]
 ).length,
 
 totalPSSSessions: pssSessions.length,
 individualSessions: individualSessions.length,
 groupSessions: groupSessions.length,
 
 activeCSSLocations: cssLocations.filter(css => !css.isDeleted).length,
 totalCSSActivities: cssActivities.length,
 childrenReached,
 
 totalReferrals: referrals.length,
 completedReferrals: referrals.filter(r => r.status === 'completed').length,
 pendingFollowUps: pendingReferrals.filter(r => !r.feedbackReceived).length
 };
}

// ============================================================================
// CASE RECORDS - CRUD OPERATIONS
// ============================================================================

export function getCaseRecords(projectId?: number, filters?: CaseFilters): CaseRecord[] {
 const dataStr = localStorage.getItem(STORAGE_KEYS.CASE_RECORDS);
 let cases: CaseRecord[] = dataStr ? JSON.parse(dataStr) : [];

 // Filter by project
 if (projectId) {
 cases = cases.filter(c => c.projectId === projectId);
 }

 // Filter out soft-deleted records
 cases = cases.filter(c => !c.isDeleted);

 // Apply additional filters
 if (filters) {
 if (filters.gender) {
 cases = cases.filter(c => c.gender === filters.gender);
 }
 if (filters.riskLevel) {
 cases = cases.filter(c => c.riskLevel === filters.riskLevel);
 }
 if (filters.status) {
 cases = cases.filter(c => c.status === filters.status);
 }
 if (filters.caseType) {
 cases = cases.filter(c => c.caseType === filters.caseType);
 }
 if (filters.assignedPssOfficerId) {
 cases = cases.filter(c => c.assignedPssOfficerId === filters.assignedPssOfficerId);
 }
 if (filters.assignedCaseWorkerId) {
 cases = cases.filter(c => c.assignedCaseWorkerId === filters.assignedCaseWorkerId);
 }
 if (filters.dateFrom) {
 cases = cases.filter(c => c.openedAt >= filters.dateFrom!);
 }
 if (filters.dateTo) {
 cases = cases.filter(c => c.openedAt <= filters.dateTo!);
 }
 }

 return cases;
}

export function getCaseById(caseId: number): CaseRecord | null {
 const cases = getCaseRecords();
 return cases.find(c => c.id === caseId) || null;
}

export function createCaseRecord(
 caseData: Omit<CaseRecord, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>,
 currentUserId: number
): CaseRecord {
 const cases = getCaseRecords();

 // Generate unique ID
 const newId = cases.length > 0 ? Math.max(...cases.map(c => c.id)) + 1 : 1;

 // Generate unique case code if not provided
 if (!caseData.caseCode) {
 const projectCases = cases.filter(c => c.projectId === caseData.projectId);
 const caseNumber = (projectCases.length + 1).toString().padStart(4, '0');
 caseData.caseCode = `CM-PRJ${caseData.projectId}-${caseNumber}`;
 }

 const now = new Date().toISOString();

 const newCase: CaseRecord = {
 ...caseData,
 id: newId,
 createdAt: now,
 updatedAt: now,
 createdBy: currentUserId,
 updatedBy: currentUserId,
 isDeleted: false
 };

 cases.push(newCase);
 localStorage.setItem(STORAGE_KEYS.CASE_RECORDS, JSON.stringify(cases));

 console.log(`✅ Case created: ${newCase.caseCode}`);
 return newCase;
}

export function updateCaseRecord(
 caseId: number,
 updates: Partial<CaseRecord>,
 currentUserId: number
): CaseRecord {
 const cases = getCaseRecords();
 const caseIndex = cases.findIndex(c => c.id === caseId && !c.isDeleted);

 if (caseIndex === -1) {
 throw new Error(`Case with ID ${caseId} not found`);
 }

 const updatedCase: CaseRecord = {
 ...cases[caseIndex],
 ...updates,
 id: caseId, // Preserve ID
 updatedAt: new Date().toISOString(),
 updatedBy: currentUserId
 };

 cases[caseIndex] = updatedCase;
 localStorage.setItem(STORAGE_KEYS.CASE_RECORDS, JSON.stringify(cases));

 console.log(`✅ Case updated: ${updatedCase.caseCode}`);
 return updatedCase;
}

export function deleteCaseRecord(caseId: number, currentUserId: number): void {
 const dataStr = localStorage.getItem(STORAGE_KEYS.CASE_RECORDS);
 const cases: CaseRecord[] = dataStr ? JSON.parse(dataStr) : [];

 const caseIndex = cases.findIndex(c => c.id === caseId);

 if (caseIndex === -1) {
 throw new Error(`Case with ID ${caseId} not found`);
 }

 // Soft delete
 cases[caseIndex].isDeleted = true;
 cases[caseIndex].deletedAt = new Date().toISOString();
 cases[caseIndex].deletedBy = currentUserId;
 cases[caseIndex].updatedAt = new Date().toISOString();
 cases[caseIndex].updatedBy = currentUserId;

 localStorage.setItem(STORAGE_KEYS.CASE_RECORDS, JSON.stringify(cases));

 // Add to deleted records tracking
 const deletedRecords = localStorage.getItem('pms_deleted_records');
 const deleted = deletedRecords ? JSON.parse(deletedRecords) : [];
 deleted.push({
 type: 'case_record',
 id: caseId,
 deletedAt: cases[caseIndex].deletedAt,
 deletedBy: currentUserId,
 data: cases[caseIndex]
 });
 localStorage.setItem('pms_deleted_records', JSON.stringify(deleted));

 console.log(`✅ Case soft-deleted: ID ${caseId}`);
}

// ============================================================================
// PSS SESSIONS
// ============================================================================

export function getPSSSessions(caseId?: number): PSSSession[] {
 const dataStr = localStorage.getItem(STORAGE_KEYS.PSS_SESSIONS);
 let sessions: PSSSession[] = dataStr ? JSON.parse(dataStr) : [];

 sessions = sessions.filter(s => !s.isDeleted);

 if (caseId) {
 sessions = sessions.filter(s => s.caseId === caseId);
 }

 return sessions.sort((a, b) => 
 new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
 );
}

export function createPSSSession(
 sessionData: Omit<PSSSession, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>,
 currentUserId: number
): PSSSession {
 const sessions = getPSSSessions();
 const newId = sessions.length > 0 ? Math.max(...sessions.map(s => s.id)) + 1 : 1;

 const now = new Date().toISOString();

 const newSession: PSSSession = {
 ...sessionData,
 id: newId,
 createdAt: now,
 updatedAt: now,
 createdBy: currentUserId,
 isDeleted: false
 };

 sessions.push(newSession);
 localStorage.setItem(STORAGE_KEYS.PSS_SESSIONS, JSON.stringify(sessions));

 console.log(`✅ PSS Session created for case ${sessionData.caseId}`);
 return newSession;
}

// ============================================================================
// CASE REFERRALS
// ============================================================================

export function getCaseReferrals(caseId?: number): CaseReferral[] {
 const dataStr = localStorage.getItem(STORAGE_KEYS.CASE_REFERRALS);
 let referrals: CaseReferral[] = dataStr ? JSON.parse(dataStr) : [];

 referrals = referrals.filter(r => !r.isDeleted);

 if (caseId) {
 referrals = referrals.filter(r => r.caseId === caseId);
 }

 return referrals.sort((a, b) => 
 new Date(b.referralDate).getTime() - new Date(a.referralDate).getTime()
 );
}

export function createCaseReferral(
 referralData: Omit<CaseReferral, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>,
 currentUserId: number
): CaseReferral {
 const referrals = getCaseReferrals();
 const newId = referrals.length > 0 ? Math.max(...referrals.map(r => r.id)) + 1 : 1;

 const now = new Date().toISOString();

 const newReferral: CaseReferral = {
 ...referralData,
 id: newId,
 createdAt: now,
 updatedAt: now,
 createdBy: currentUserId,
 isDeleted: false
 };

 referrals.push(newReferral);
 localStorage.setItem(STORAGE_KEYS.CASE_REFERRALS, JSON.stringify(referrals));

 console.log(`✅ Referral created for case ${referralData.caseId}`);
 return newReferral;
}

export function updateCaseReferral(
 referralId: number,
 updates: Partial<CaseReferral>,
 currentUserId: number
): CaseReferral {
 const referrals = getCaseReferrals();
 const referralIndex = referrals.findIndex(r => r.id === referralId);

 if (referralIndex === -1) {
 throw new Error(`Referral with ID ${referralId} not found`);
 }

 const updatedReferral: CaseReferral = {
 ...referrals[referralIndex],
 ...updates,
 id: referralId,
 updatedAt: new Date().toISOString()
 };

 referrals[referralIndex] = updatedReferral;
 localStorage.setItem(STORAGE_KEYS.CASE_REFERRALS, JSON.stringify(referrals));

 return updatedReferral;
}

// ============================================================================
// CASE ACTIVITIES
// ============================================================================

export function getCaseActivities(caseId?: number): CaseActivity[] {
 const dataStr = localStorage.getItem(STORAGE_KEYS.CASE_ACTIVITIES);
 let activities: CaseActivity[] = dataStr ? JSON.parse(dataStr) : [];

 activities = activities.filter(a => !a.isDeleted);

 if (caseId) {
 activities = activities.filter(a => a.caseId === caseId);
 }

 return activities.sort((a, b) => 
 new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime()
 );
}

export function createCaseActivity(
 activityData: Omit<CaseActivity, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>,
 currentUserId: number
): CaseActivity {
 const activities = getCaseActivities();
 const newId = activities.length > 0 ? Math.max(...activities.map(a => a.id)) + 1 : 1;

 const now = new Date().toISOString();

 const newActivity: CaseActivity = {
 ...activityData,
 id: newId,
 createdAt: now,
 updatedAt: now,
 createdBy: currentUserId,
 isDeleted: false
 };

 activities.push(newActivity);
 localStorage.setItem(STORAGE_KEYS.CASE_ACTIVITIES, JSON.stringify(activities));

 console.log(`✅ Activity created for case ${activityData.caseId}`);
 return newActivity;
}

// ============================================================================
// CHILD SAFE SPACES (CSS)
// ============================================================================

export function getCSSLocations(projectId?: number): ChildSafeSpace[] {
 const dataStr = localStorage.getItem(STORAGE_KEYS.CSS_LOCATIONS);
 let locations: ChildSafeSpace[] = dataStr ? JSON.parse(dataStr) : [];

 locations = locations.filter(l => !l.isDeleted);

 if (projectId) {
 locations = locations.filter(l => l.projectId === projectId);
 }

 return locations;
}

export function getCSSActivities(cssId?: number): CSSActivity[] {
 const dataStr = localStorage.getItem(STORAGE_KEYS.CSS_ACTIVITIES);
 let activities: CSSActivity[] = dataStr ? JSON.parse(dataStr) : [];

 activities = activities.filter(a => !a.isDeleted);

 if (cssId) {
 activities = activities.filter(a => a.cssId === cssId);
 }

 return activities.sort((a, b) => 
 new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime()
 );
}

// ============================================================================
// ALIAS FUNCTIONS (for backward compatibility)
// ============================================================================

/**
 * Alias for getPSSSessions (backward compatibility)
 */
export const getAllPSSSessions = getPSSSessions;

/**
 * Alias for getCaseActivities (backward compatibility)
 */
export const getAllCaseActivities = getCaseActivities;

/**
 * Alias for getCSSActivities (backward compatibility)
 */
export const getAllCSSActivities = getCSSActivities;

/**
 * Alias for getCaseReferrals (backward compatibility)
 */
export const getReferrals = getCaseReferrals;

/**
 * Alias for getCSSLocations (backward compatibility)
 */
export const getChildSafeSpaces = getCSSLocations;

// ============================================================================
// REPORTING & ANALYTICS
// ============================================================================

export function generateCaseManagementReport(
 projectId: number,
 filters: ReportFilters,
 currentUser: { name: string }
): CaseManagementReport {
 const cases = getCaseRecords(projectId).filter(c => {
 const inRange = c.openedAt >= filters.reportingPeriodStart && 
 c.openedAt <= filters.reportingPeriodEnd;
 const matchesType = !filters.caseType || c.caseType === filters.caseType;
 const matchesRisk = !filters.riskLevel || c.riskLevel === filters.riskLevel;
 return inRange && matchesType && matchesRisk;
 });

 const pssSessions = getPSSSessions().filter(s => {
 const caseMatch = cases.find(c => c.id === s.caseId);
 return caseMatch && s.sessionDate >= filters.reportingPeriodStart && 
 s.sessionDate <= filters.reportingPeriodEnd;
 });

 const referrals = getCaseReferrals().filter(r => {
 const caseMatch = cases.find(c => c.id === r.caseId);
 return caseMatch && r.referralDate >= filters.reportingPeriodStart && 
 r.referralDate <= filters.reportingPeriodEnd;
 });

 const activities = getCaseActivities().filter(a => {
 const caseMatch = cases.find(c => c.id === a.caseId);
 return caseMatch && a.activityDate >= filters.reportingPeriodStart && 
 a.activityDate <= filters.reportingPeriodEnd;
 });

 const cssActivities = getCSSActivities().filter(a => 
 a.activityDate >= filters.reportingPeriodStart && 
 a.activityDate <= filters.reportingPeriodEnd
 );

 // Get project info
 const projectsData = localStorage.getItem('pms_projects');
 const projects = projectsData ? JSON.parse(projectsData) : [];
 const project = projects.find((p: any) => p.id === projectId);

 const newCases = cases.filter(c => 
 c.openedAt >= filters.reportingPeriodStart
 );
 const activeCases = cases.filter(c => c.status !== 'closed');
 const closedCases = cases.filter(c => 
 c.status === 'closed' && c.closedAt && 
 c.closedAt >= filters.reportingPeriodStart &&
 c.closedAt <= filters.reportingPeriodEnd
 );
 const highRiskCases = cases.filter(c => c.riskLevel === 'high');

 const individualSessions = pssSessions.filter(s => s.sessionType === 'individual');
 const groupSessions = pssSessions.filter(s => s.sessionType === 'group');

 const internalReferrals = referrals.filter(r => r.referralType === 'internal');
 const externalReferrals = referrals.filter(r => r.referralType === 'external');
 const completedReferrals = referrals.filter(r => r.status === 'completed');

 // Calculate averages
 const caseDurations = closedCases
 .filter(c => c.closedAt)
 .map(c => {
 const opened = new Date(c.openedAt);
 const closed = new Date(c.closedAt!);
 return Math.floor((closed.getTime() - opened.getTime()) / (1000 * 60 * 60 * 24));
 });
 const avgCaseDuration = caseDurations.length > 0 
 ? caseDurations.reduce((a, b) => a + b, 0) / caseDurations.length 
 : 0;

 const avgSessionDuration = pssSessions.length > 0
 ? pssSessions.reduce((sum, s) => sum + s.duration, 0) / pssSessions.length
 : 0;

 const childrenReached = cssActivities.reduce((sum, a) => sum + a.participantsCount, 0);
 const avgChildrenPerSession = cssActivities.length > 0
 ? childrenReached / cssActivities.length
 : 0;

 // Activities by type
 const activitiesByType: Record<string, number> = {};
 activities.forEach(a => {
 activitiesByType[a.activityType] = (activitiesByType[a.activityType] || 0) + 1;
 });

 const cssActivitiesByType: Record<string, number> = {};
 cssActivities.forEach(a => {
 cssActivitiesByType[a.activityType] = (cssActivitiesByType[a.activityType] || 0) + 1;
 });

 // Generate executive summary
 const executiveSummary = `During the reporting period from ${filters.reportingPeriodStart} to ${filters.reportingPeriodEnd}, ${newCases.length} new cases were registered, bringing the total active caseload to ${activeCases.length}. A total of ${pssSessions.length} PSS sessions were conducted (${individualSessions.length} individual, ${groupSessions.length} group), reaching individuals with psychosocial support interventions. ${referrals.length} referrals were made to specialized services, with ${completedReferrals.length} successfully completed. Child Safe Space activities reached ${childrenReached} children through ${cssActivities.length} structured activities.`;

 return {
 projectName: project?.title || 'Unknown Project',
 donorName: project?.donor || 'Unknown Donor',
 reportingPeriodStart: filters.reportingPeriodStart,
 reportingPeriodEnd: filters.reportingPeriodEnd,
 generatedAt: new Date().toISOString(),
 generatedBy: currentUser.name,

 executiveSummary,

 caseOverview: {
 totalCases: cases.length,
 newCases: newCases.length,
 activeCases: activeCases.length,
 closedCases: closedCases.length,
 highRiskCases: highRiskCases.length,
 averageCaseDuration: Math.round(avgCaseDuration)
 },

 pssSummary: {
 totalSessions: pssSessions.length,
 individualSessions: individualSessions.length,
 groupSessions: groupSessions.length,
 averageDuration: Math.round(avgSessionDuration),
 followUpsScheduled: pssSessions.filter(s => s.nextSessionDate).length
 },

 cssSummary: {
 activeCSSLocations: getCSSLocations(projectId).length,
 totalActivities: cssActivities.length,
 childrenReached,
 averageChildrenPerSession: Math.round(avgChildrenPerSession),
 activitiesByType: cssActivitiesByType as any
 },

 activitiesSummary: {
 byType: activitiesByType as any
 },

 referralsSummary: {
 totalReferrals: referrals.length,
 internalReferrals: internalReferrals.length,
 externalReferrals: externalReferrals.length,
 completedReferrals: completedReferrals.length,
 pendingFollowUps: referrals.filter(r => !r.feedbackReceived).length
 },

 riskSnapshot: {
 high: cases.filter(c => c.riskLevel === 'high').length,
 medium: cases.filter(c => c.riskLevel === 'medium').length,
 low: cases.filter(c => c.riskLevel === 'low').length
 },

 auditTrail: {
 updatesThisPeriod: cases.filter(c => 
 c.updatedAt >= filters.reportingPeriodStart
 ).length,
 activeCaseWorkers: new Set(cases.map(c => c.assignedCaseWorkerId)).size,
 lastActivityDate: activities.length > 0 
 ? activities[0].activityDate 
 : 'N/A'
 }
 };
}