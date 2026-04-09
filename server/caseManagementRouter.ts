/**
 * Case Management Router
 * tRPC API for Case Management module
 * 
 * Sub-modules:
 * 1. Cases List (CRUD for case_records)
 * 2. PSS Sessions (CRUD for pss_sessions)
 * 3. Child Safe Spaces (CRUD for child_safe_spaces)
 * 4. CSS Activities (CRUD for css_activities)
 * 5. Referrals (CRUD for case_referrals)
 * 6. Case Activities (CRUD for case_activities)
 * 7. Dashboard KPIs (aggregated statistics)
 */

import { z } from "zod";
import { router, protectedProcedure, scopedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { isPlatformAdmin } from "../shared/const";
import { 
  caseRecords, 
  pssSessions, 
  childSafeSpaces, 
  cssActivities, 
  caseReferrals, 
  caseActivities,
  projects,
  indicators
} from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { canAccess, logSensitiveAccess } from "./rbacService";

/**
 * Middleware: Enforce RBAC for Case Management (sensitive workspace).
 * Requires explicit screen-level permission for cases_list.
 */
const caseMgmtProcedure = scopedProcedure.use(async ({ ctx, next }) => {
  const userId = ctx.user?.id;
  const orgId = ctx.scope?.organizationId;
  if (!userId || !orgId) throw new TRPCError({ code: 'UNAUTHORIZED' });
  // Platform admins bypass
  if (isPlatformAdmin(ctx.user?.role)) return next({ ctx });
  const allowed = await canAccess(userId, orgId, 'cases', 'cases_list', undefined, 'view');
  if (!allowed) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have permission to access Case Management. This is a sensitive workspace requiring explicit authorization.' });
  }
  // Log sensitive access
  await logSensitiveAccess(userId, orgId, null, 'sensitive_access', 'cases', 'cases_list', 'case_management');
  return next({ ctx });
});

// ============================================================================
// CASE RECORDS ROUTER
// ============================================================================

export const caseRecordsRouter = router({
  // Alias for frontend compatibility
  list: caseMgmtProcedure
    .input(z.object({
      projectId: z.number(),
      filters: z.object({
        gender: z.string().optional(),
        riskLevel: z.string().optional(),
        status: z.string().optional(),
        caseType: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const conditions: any[] = [
        eq(caseRecords.projectId, input.projectId),
        eq(caseRecords.isDeleted, false),
      ];

      if (input.filters?.gender) {
        conditions.push(eq(caseRecords.gender, input.filters.gender));
      }
      if (input.filters?.riskLevel) {
        conditions.push(eq(caseRecords.riskLevel, input.filters.riskLevel));
      }
      if (input.filters?.status) {
        conditions.push(eq(caseRecords.status, input.filters.status));
      }
      if (input.filters?.caseType) {
        conditions.push(eq(caseRecords.caseType, input.filters.caseType));
      }

      const cases = await db
        .select()
        .from(caseRecords)
        .where(and(...conditions))
        .orderBy(desc(caseRecords.createdAt));

      return cases;
    }),

  // Get all cases for a project
  getByProject: caseMgmtProcedure
    .input(z.object({
      projectId: z.number(),
      filters: z.object({
        gender: z.string().optional(),
        riskLevel: z.string().optional(),
        status: z.string().optional(),
        caseType: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const conditions: any[] = [
        eq(caseRecords.projectId, input.projectId),
        eq(caseRecords.isDeleted, false),
      ];

      if (input.filters?.gender) {
        conditions.push(eq(caseRecords.gender, input.filters.gender));
      }
      if (input.filters?.riskLevel) {
        conditions.push(eq(caseRecords.riskLevel, input.filters.riskLevel));
      }
      if (input.filters?.status) {
        conditions.push(eq(caseRecords.status, input.filters.status));
      }
      if (input.filters?.caseType) {
        conditions.push(eq(caseRecords.caseType, input.filters.caseType));
      }

      const cases = await db
        .select()
        .from(caseRecords)
        .where(and(...conditions))
        .orderBy(desc(caseRecords.createdAt));

      return cases;
    }),

  // Get single case by ID
  getById: caseMgmtProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const [caseRecord] = await db
        .select()
        .from(caseRecords)
        .where(and(
          eq(caseRecords.id, input.id),
          eq(caseRecords.isDeleted, false)
        ));
      return caseRecord || null;
    }),

  // Create new case
  create: caseMgmtProcedure
    .input(z.object({
      projectId: z.number(),
      beneficiaryCode: z.string(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      dateOfBirth: z.string().optional(),
      gender: z.string().optional(),
      age: z.number().nullable().optional(),
      nationality: z.string().optional(),
      idNumber: z.string().optional(),
      hasDisability: z.boolean().optional(),
      location: z.string().optional(),
      district: z.string().optional(),
      community: z.string().optional(),
      householdSize: z.number().optional(),
      vulnerabilityCategory: z.string().optional(),
      phoneNumber: z.string().optional(),
      email: z.string().optional(),
      address: z.string().optional(),
      caseType: z.string(),
      riskLevel: z.string(),
      status: z.string().optional(),
      referralSource: z.string().optional(),
      intakeDate: z.string().optional(),
      identifiedNeeds: z.string().optional(),
      riskFactors: z.string().optional(),
      immediateConcerns: z.string().optional(),
      informedConsentObtained: z.boolean().optional(),
      consentDate: z.string().optional(),
      assignedTo: z.string().optional(),
      plannedInterventions: z.string().optional(),
      responsiblePerson: z.string().optional(),
      expectedOutcomes: z.string().optional(),
      timeline: z.string().optional(),
      reviewDate: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get project to get organizationId
      const [project] = await db
        .select({ organizationId: projects.organizationId })
        .from(projects)
        .where(eq(projects.id, input.projectId));

      if (!project) {
        throw new Error("Project not found");
      }

      // Generate case code
      const existingCases = await db
        .select({ id: caseRecords.id })
        .from(caseRecords)
        .where(eq(caseRecords.projectId, input.projectId));
      
      const caseNumber = (existingCases.length + 1).toString().padStart(4, '0');
      const caseCode = `CM-PRJ${input.projectId}-${caseNumber}`;

      const [newCase] = await db
        .insert(caseRecords)
        .values({
          ...input,
          caseCode,
          organizationId: project.organizationId,
          status: input.status || 'open',
          informedConsentObtained: input.informedConsentObtained || false,
          hasDisability: input.hasDisability || false,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
          intakeDate: input.intakeDate ? new Date(input.intakeDate) : null,
          consentDate: input.consentDate ? new Date(input.consentDate) : null,
          reviewDate: input.reviewDate ? new Date(input.reviewDate) : null,
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .$returningId();

      return { id: newCase.id, caseCode };
    }),

  // Update case
  update: caseMgmtProcedure
    .input(z.object({
      id: z.number(),
      beneficiaryCode: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      dateOfBirth: z.string().optional(),
      gender: z.string().optional(),
      age: z.number().nullable().optional(),
      nationality: z.string().optional(),
      idNumber: z.string().optional(),
      hasDisability: z.boolean().optional(),
      location: z.string().optional(),
      district: z.string().optional(),
      community: z.string().optional(),
      householdSize: z.number().optional(),
      vulnerabilityCategory: z.string().optional(),
      phoneNumber: z.string().optional(),
      email: z.string().optional(),
      address: z.string().optional(),
      caseType: z.string().optional(),
      riskLevel: z.string().optional(),
      status: z.string().optional(),
      referralSource: z.string().optional(),
      intakeDate: z.string().optional(),
      identifiedNeeds: z.string().optional(),
      riskFactors: z.string().optional(),
      immediateConcerns: z.string().optional(),
      informedConsentObtained: z.boolean().optional(),
      consentDate: z.string().optional(),
      assignedTo: z.string().optional(),
      plannedInterventions: z.string().optional(),
      responsiblePerson: z.string().optional(),
      expectedOutcomes: z.string().optional(),
      timeline: z.string().optional(),
      reviewDate: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, ...updateData } = input;
      
      // Convert date strings to Date objects, handle empty strings as null
      const processedData: Record<string, unknown> = { ...updateData };
      if (updateData.dateOfBirth && updateData.dateOfBirth.trim() !== '') {
        processedData.dateOfBirth = new Date(updateData.dateOfBirth);
      } else {
        delete processedData.dateOfBirth;
      }
      if (updateData.intakeDate && updateData.intakeDate.trim() !== '') {
        processedData.intakeDate = new Date(updateData.intakeDate);
      } else {
        delete processedData.intakeDate;
      }
      if (updateData.consentDate && updateData.consentDate.trim() !== '') {
        processedData.consentDate = new Date(updateData.consentDate);
      } else {
        delete processedData.consentDate;
      }
      if (updateData.reviewDate && updateData.reviewDate.trim() !== '') {
        processedData.reviewDate = new Date(updateData.reviewDate);
      } else {
        delete processedData.reviewDate;
      }
      
      processedData.updatedBy = ctx.user.id;

      await db
        .update(caseRecords)
        .set(processedData)
        .where(eq(caseRecords.id, id));

      return { success: true };
    }),

  // Soft delete case
  delete: caseMgmtProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(caseRecords)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .where(eq(caseRecords.id, input.id));

      return { success: true };
    }),

  // Get KPIs for dashboard
  getKPIs: caseMgmtProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get all cases for this project
      const cases = await db
        .select()
        .from(caseRecords)
        .where(and(
          eq(caseRecords.projectId, input.projectId),
          eq(caseRecords.isDeleted, false)
        ));

      // Get PSS sessions
      const sessions = await db
        .select()
        .from(pssSessions)
        .where(and(
          eq(pssSessions.projectId, input.projectId),
          eq(pssSessions.isDeleted, false)
        ));

      // Get referrals
      const referrals = await db
        .select()
        .from(caseReferrals)
        .where(and(
          eq(caseReferrals.projectId, input.projectId),
          eq(caseReferrals.isDeleted, false)
        ));

      // Get CSS locations
      const cssLocations = await db
        .select()
        .from(childSafeSpaces)
        .where(and(
          eq(childSafeSpaces.projectId, input.projectId),
          eq(childSafeSpaces.isDeleted, false)
        ));

      // Get CSS activities
      const cssActs = await db
        .select()
        .from(cssActivities)
        .where(and(
          eq(cssActivities.projectId, input.projectId),
          eq(cssActivities.isDeleted, false)
        ));

      // Calculate KPIs
      const activeCases = cases.filter(c => c.status === 'open' || c.status === 'ongoing');
      const newCasesThisMonth = cases.filter(c => 
        c.createdAt && new Date(c.createdAt) >= thisMonthStart
      );
      const closedCases = cases.filter(c => c.status === 'closed');
      const highRiskCases = activeCases.filter(c => c.riskLevel === 'high');

      const pendingReferrals = referrals.filter(r => 
        r.status === 'pending' || r.status === 'in_progress'
      );

      const individualSessions = sessions.filter(s => s.sessionType === 'individual');
      const groupSessions = sessions.filter(s => s.sessionType === 'group');

      const childrenReached = cssActs.reduce((sum, act) => sum + (act.participantsCount || 0), 0);

      return {
        totalActiveCases: activeCases.length,
        newCasesThisMonth: newCasesThisMonth.length,
        closedCases: closedCases.length,
        highRiskCases: highRiskCases.length,
        pendingReferrals: pendingReferrals.length,
        followUpsDue: referrals.filter(r => 
          r.followUpDate && new Date(r.followUpDate) <= now
        ).length,
        totalPSSSessions: sessions.length,
        individualSessions: individualSessions.length,
        groupSessions: groupSessions.length,
        activeCSSLocations: cssLocations.length,
        totalCSSActivities: cssActs.length,
        childrenReached,
        totalReferrals: referrals.length,
        completedReferrals: referrals.filter(r => r.status === 'completed').length,
        pendingFollowUps: pendingReferrals.filter(r => !r.feedbackReceived).length,
      };
    }),
});

// ============================================================================
// PSS SESSIONS ROUTER
// ============================================================================

export const pssSessionsRouter = router({
  // Alias for frontend compatibility
  list: caseMgmtProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const sessions = await db
        .select({
          session: pssSessions,
          caseCode: caseRecords.caseCode,
          beneficiaryCode: caseRecords.beneficiaryCode,
        })
        .from(pssSessions)
        .leftJoin(caseRecords, eq(pssSessions.caseId, caseRecords.id))
        .where(and(
          eq(pssSessions.projectId, input.projectId),
          eq(pssSessions.isDeleted, false)
        ))
        .orderBy(desc(pssSessions.sessionDate));

      return sessions.map(s => ({
        ...s.session,
        caseCode: s.caseCode,
        beneficiaryCode: s.beneficiaryCode,
      }));
    }),

  getByProject: caseMgmtProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const sessions = await db
        .select({
          session: pssSessions,
          caseCode: caseRecords.caseCode,
          beneficiaryCode: caseRecords.beneficiaryCode,
        })
        .from(pssSessions)
        .leftJoin(caseRecords, eq(pssSessions.caseId, caseRecords.id))
        .where(and(
          eq(pssSessions.projectId, input.projectId),
          eq(pssSessions.isDeleted, false)
        ))
        .orderBy(desc(pssSessions.sessionDate));

      return sessions.map(s => ({
        ...s.session,
        caseCode: s.caseCode,
        beneficiaryCode: s.beneficiaryCode,
      }));
    }),

  getByCase: caseMgmtProcedure
    .input(z.object({ caseId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const sessions = await db
        .select()
        .from(pssSessions)
        .where(and(
          eq(pssSessions.caseId, input.caseId),
          eq(pssSessions.isDeleted, false)
        ))
        .orderBy(desc(pssSessions.sessionDate));

      return sessions;
    }),

  create: caseMgmtProcedure
    .input(z.object({
      caseId: z.number(),
      projectId: z.number(),
      sessionDate: z.string(),
      sessionType: z.string(),
      pssApproach: z.string().optional(),
      facilitatorName: z.string().optional(),
      duration: z.number().optional(),
      keyObservations: z.string().optional(),
      beneficiaryResponse: z.string().optional(),
      nextSessionDate: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get project to get organizationId
      const [project] = await db
        .select({ organizationId: projects.organizationId })
        .from(projects)
        .where(eq(projects.id, input.projectId));

      if (!project) {
        throw new Error("Project not found");
      }

      const [newSession] = await db
        .insert(pssSessions)
        .values({
          ...input,
          organizationId: project.organizationId,
          sessionDate: new Date(input.sessionDate),
          nextSessionDate: input.nextSessionDate ? new Date(input.nextSessionDate) : null,
          createdBy: ctx.user.id,
        })
        .$returningId();

      return { id: newSession.id };
    }),

  update: caseMgmtProcedure
    .input(z.object({
      id: z.number(),
      sessionDate: z.string().optional(),
      sessionType: z.string().optional(),
      pssApproach: z.string().optional(),
      facilitatorName: z.string().optional(),
      duration: z.number().optional(),
      keyObservations: z.string().optional(),
      beneficiaryResponse: z.string().optional(),
      nextSessionDate: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, ...updateData } = input;
      
      const processedData: Record<string, unknown> = { ...updateData };
      if (updateData.sessionDate) processedData.sessionDate = new Date(updateData.sessionDate);
      if (updateData.nextSessionDate) processedData.nextSessionDate = new Date(updateData.nextSessionDate);

      await db
        .update(pssSessions)
        .set(processedData)
        .where(eq(pssSessions.id, id));

      return { success: true };
    }),

  delete: caseMgmtProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(pssSessions)
        .set({ isDeleted: true })
        .where(eq(pssSessions.id, input.id));

      return { success: true };
    }),
});

// ============================================================================
// CHILD SAFE SPACES ROUTER
// ============================================================================

export const childSafeSpacesRouter = router({
  // Alias for frontend compatibility
  list: caseMgmtProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const spaces = await db
        .select()
        .from(childSafeSpaces)
        .where(and(
          eq(childSafeSpaces.projectId, input.projectId),
          eq(childSafeSpaces.isDeleted, false)
        ))
        .orderBy(desc(childSafeSpaces.createdAt));

      return spaces;
    }),

  getByProject: caseMgmtProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const spaces = await db
        .select()
        .from(childSafeSpaces)
        .where(and(
          eq(childSafeSpaces.projectId, input.projectId),
          eq(childSafeSpaces.isDeleted, false)
        ))
        .orderBy(desc(childSafeSpaces.createdAt));

      return spaces;
    }),

  create: caseMgmtProcedure
    .input(z.object({
      projectId: z.number(),
      cssName: z.string(),
      cssCode: z.string(),
      location: z.string(),
      operatingPartner: z.string().optional(),
      capacity: z.number().optional(),
      ageGroupsServed: z.string().optional(),
      genderSegregation: z.boolean().optional(),
      operatingDays: z.string().optional(),
      operatingHours: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get project to get organizationId
      const [project] = await db
        .select({ organizationId: projects.organizationId })
        .from(projects)
        .where(eq(projects.id, input.projectId));

      if (!project) {
        throw new Error("Project not found");
      }

      const [newSpace] = await db
        .insert(childSafeSpaces)
        .values({
          ...input,
          organizationId: project.organizationId,
          genderSegregation: input.genderSegregation || false,
          createdBy: ctx.user.id,
        })
        .$returningId();

      return { id: newSpace.id };
    }),

  update: caseMgmtProcedure
    .input(z.object({
      id: z.number(),
      cssName: z.string().optional(),
      cssCode: z.string().optional(),
      location: z.string().optional(),
      operatingPartner: z.string().optional(),
      capacity: z.number().optional(),
      ageGroupsServed: z.string().optional(),
      genderSegregation: z.boolean().optional(),
      operatingDays: z.string().optional(),
      operatingHours: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, ...updateData } = input;

      await db
        .update(childSafeSpaces)
        .set(updateData)
        .where(eq(childSafeSpaces.id, id));

      return { success: true };
    }),

  delete: caseMgmtProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(childSafeSpaces)
        .set({ isDeleted: true })
        .where(eq(childSafeSpaces.id, input.id));

      return { success: true };
    }),
});

// ============================================================================
// CSS ACTIVITIES ROUTER
// ============================================================================

export const cssActivitiesRouter = router({
  // Alias for frontend compatibility
  list: caseMgmtProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const activities = await db
        .select({
          activity: cssActivities,
          cssName: childSafeSpaces.cssName,
          cssCode: childSafeSpaces.cssCode,
        })
        .from(cssActivities)
        .leftJoin(childSafeSpaces, eq(cssActivities.cssId, childSafeSpaces.id))
        .where(and(
          eq(cssActivities.projectId, input.projectId),
          eq(cssActivities.isDeleted, false)
        ))
        .orderBy(desc(cssActivities.activityDate));

      return activities.map(a => ({
        ...a.activity,
        cssName: a.cssName,
        cssCode: a.cssCode,
      }));
    }),

  getByProject: caseMgmtProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const activities = await db
        .select({
          activity: cssActivities,
          cssName: childSafeSpaces.cssName,
          cssCode: childSafeSpaces.cssCode,
        })
        .from(cssActivities)
        .leftJoin(childSafeSpaces, eq(cssActivities.cssId, childSafeSpaces.id))
        .where(and(
          eq(cssActivities.projectId, input.projectId),
          eq(cssActivities.isDeleted, false)
        ))
        .orderBy(desc(cssActivities.activityDate));

      return activities.map(a => ({
        ...a.activity,
        cssName: a.cssName,
        cssCode: a.cssCode,
      }));
    }),

  getByCss: caseMgmtProcedure
    .input(z.object({ cssId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const activities = await db
        .select()
        .from(cssActivities)
        .where(and(
          eq(cssActivities.cssId, input.cssId),
          eq(cssActivities.isDeleted, false)
        ))
        .orderBy(desc(cssActivities.activityDate));

      return activities;
    }),

  create: caseMgmtProcedure
    .input(z.object({
      cssId: z.number(),
      projectId: z.number(),
      activityType: z.string(),
      activityDate: z.string(),
      facilitatorName: z.string().optional(),
      participantsCount: z.number(),
      maleCount: z.number().optional(),
      femaleCount: z.number().optional(),
      notes: z.string().optional(),
      linkedCaseId: z.number().optional(),
      linkedIndicatorId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get project to get organizationId
      const [project] = await db
        .select({ organizationId: projects.organizationId })
        .from(projects)
        .where(eq(projects.id, input.projectId));

      if (!project) {
        throw new Error("Project not found");
      }

      const [newActivity] = await db
        .insert(cssActivities)
        .values({
          ...input,
          organizationId: project.organizationId,
          activityDate: new Date(input.activityDate),
          maleCount: input.maleCount || 0,
          femaleCount: input.femaleCount || 0,
          createdBy: ctx.user.id,
        })
        .$returningId();

      return { id: newActivity.id };
    }),

  update: caseMgmtProcedure
    .input(z.object({
      id: z.number(),
      activityType: z.string().optional(),
      activityDate: z.string().optional(),
      facilitatorName: z.string().optional(),
      participantsCount: z.number().optional(),
      maleCount: z.number().optional(),
      femaleCount: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, ...updateData } = input;
      
      const processedData: Record<string, unknown> = { ...updateData };
      if (updateData.activityDate) processedData.activityDate = new Date(updateData.activityDate);

      await db
        .update(cssActivities)
        .set(processedData)
        .where(eq(cssActivities.id, id));

      return { success: true };
    }),

  delete: caseMgmtProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(cssActivities)
        .set({ isDeleted: true })
        .where(eq(cssActivities.id, input.id));

      return { success: true };
    }),
});

// ============================================================================
// CASE REFERRALS ROUTER
// ============================================================================

export const caseReferralsRouter = router({
  // Alias for frontend compatibility
  list: caseMgmtProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const referrals = await db
        .select({
          referral: caseReferrals,
          caseCode: caseRecords.caseCode,
          beneficiaryCode: caseRecords.beneficiaryCode,
        })
        .from(caseReferrals)
        .leftJoin(caseRecords, eq(caseReferrals.caseId, caseRecords.id))
        .where(and(
          eq(caseReferrals.projectId, input.projectId),
          eq(caseReferrals.isDeleted, false)
        ))
        .orderBy(desc(caseReferrals.referralDate));

      return referrals.map(r => ({
        ...r.referral,
        caseCode: r.caseCode,
        beneficiaryCode: r.beneficiaryCode,
      }));
    }),

  getByProject: caseMgmtProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const referrals = await db
        .select({
          referral: caseReferrals,
          caseCode: caseRecords.caseCode,
          beneficiaryCode: caseRecords.beneficiaryCode,
        })
        .from(caseReferrals)
        .leftJoin(caseRecords, eq(caseReferrals.caseId, caseRecords.id))
        .where(and(
          eq(caseReferrals.projectId, input.projectId),
          eq(caseReferrals.isDeleted, false)
        ))
        .orderBy(desc(caseReferrals.referralDate));

      return referrals.map(r => ({
        ...r.referral,
        caseCode: r.caseCode,
        beneficiaryCode: r.beneficiaryCode,
      }));
    }),

  getByCase: caseMgmtProcedure
    .input(z.object({ caseId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const referrals = await db
        .select()
        .from(caseReferrals)
        .where(and(
          eq(caseReferrals.caseId, input.caseId),
          eq(caseReferrals.isDeleted, false)
        ))
        .orderBy(desc(caseReferrals.referralDate));

      return referrals;
    }),

  create: caseMgmtProcedure
    .input(z.object({
      caseId: z.number(),
      projectId: z.number(),
      referralDate: z.string(),
      referralType: z.string(),
      serviceRequired: z.string(),
      receivingOrganization: z.string(),
      focalPoint: z.string().optional(),
      focalPointContact: z.string().optional(),
      status: z.string().optional(),
      followUpDate: z.string().optional(),
      consentObtained: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get project to get organizationId
      const [project] = await db
        .select({ organizationId: projects.organizationId })
        .from(projects)
        .where(eq(projects.id, input.projectId));

      if (!project) {
        throw new Error("Project not found");
      }

      const [newReferral] = await db
        .insert(caseReferrals)
        .values({
          ...input,
          organizationId: project.organizationId,
          referralDate: new Date(input.referralDate),
          followUpDate: input.followUpDate ? new Date(input.followUpDate) : null,
          status: input.status || 'pending',
          feedbackReceived: false,
          createdBy: ctx.user.id,
        })
        .$returningId();

      return { id: newReferral.id };
    }),

  update: caseMgmtProcedure
    .input(z.object({
      id: z.number(),
      referralDate: z.string().optional(),
      referralType: z.string().optional(),
      serviceRequired: z.string().optional(),
      receivingOrganization: z.string().optional(),
      focalPoint: z.string().optional(),
      focalPointContact: z.string().optional(),
      status: z.string().optional(),
      followUpDate: z.string().optional(),
      feedbackReceived: z.boolean().optional(),
      feedbackNotes: z.string().optional(),
      consentObtained: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, ...updateData } = input;
      
      const processedData: Record<string, unknown> = { ...updateData };
      if (updateData.referralDate) processedData.referralDate = new Date(updateData.referralDate);
      if (updateData.followUpDate) processedData.followUpDate = new Date(updateData.followUpDate);

      await db
        .update(caseReferrals)
        .set(processedData)
        .where(eq(caseReferrals.id, id));

      return { success: true };
    }),

  delete: caseMgmtProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(caseReferrals)
        .set({ isDeleted: true })
        .where(eq(caseReferrals.id, input.id));

      return { success: true };
    }),
});

// ============================================================================
// CASE ACTIVITIES ROUTER
// ============================================================================

export const caseActivitiesRouter = router({
  // Alias for frontend compatibility
  list: caseMgmtProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const activities = await db
        .select({
          activity: caseActivities,
          caseCode: caseRecords.caseCode,
          beneficiaryCode: caseRecords.beneficiaryCode,
        })
        .from(caseActivities)
        .leftJoin(caseRecords, eq(caseActivities.caseId, caseRecords.id))
        .where(and(
          eq(caseActivities.projectId, input.projectId),
          eq(caseActivities.isDeleted, false)
        ))
        .orderBy(desc(caseActivities.activityDate));

      return activities.map(a => ({
        ...a.activity,
        caseCode: a.caseCode,
        beneficiaryCode: a.beneficiaryCode,
      }));
    }),

  getByProject: caseMgmtProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const activities = await db
        .select({
          activity: caseActivities,
          caseCode: caseRecords.caseCode,
          beneficiaryCode: caseRecords.beneficiaryCode,
        })
        .from(caseActivities)
        .leftJoin(caseRecords, eq(caseActivities.caseId, caseRecords.id))
        .where(and(
          eq(caseActivities.projectId, input.projectId),
          eq(caseActivities.isDeleted, false)
        ))
        .orderBy(desc(caseActivities.activityDate));

      return activities.map(a => ({
        ...a.activity,
        caseCode: a.caseCode,
        beneficiaryCode: a.beneficiaryCode,
      }));
    }),

  getByCase: caseMgmtProcedure
    .input(z.object({ caseId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const activities = await db
        .select()
        .from(caseActivities)
        .where(and(
          eq(caseActivities.caseId, input.caseId),
          eq(caseActivities.isDeleted, false)
        ))
        .orderBy(desc(caseActivities.activityDate));

      return activities;
    }),

  create: caseMgmtProcedure
    .input(z.object({
      caseId: z.number(),
      projectId: z.number(),
      activityType: z.string(),
      activityDate: z.string(),
      provider: z.string().optional(),
      notes: z.string().optional(),
      linkedActivityId: z.number().optional(),
      linkedIndicatorId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Get project to get organizationId
      const [project] = await db
        .select({ organizationId: projects.organizationId })
        .from(projects)
        .where(eq(projects.id, input.projectId));

      if (!project) {
        throw new Error("Project not found");
      }

      const [newActivity] = await db
        .insert(caseActivities)
        .values({
          ...input,
          organizationId: project.organizationId,
          activityDate: new Date(input.activityDate),
          createdBy: ctx.user.id,
        })
        .$returningId();

      return { id: newActivity.id };
    }),

  update: caseMgmtProcedure
    .input(z.object({
      id: z.number(),
      activityType: z.string().optional(),
      activityDate: z.string().optional(),
      provider: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, ...updateData } = input;
      
      const processedData: Record<string, unknown> = { ...updateData };
      if (updateData.activityDate) processedData.activityDate = new Date(updateData.activityDate);

      await db
        .update(caseActivities)
        .set(processedData)
        .where(eq(caseActivities.id, id));

      return { success: true };
    }),

  delete: caseMgmtProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(caseActivities)
        .set({ isDeleted: true })
        .where(eq(caseActivities.id, input.id));

      return { success: true };
    }),
});

// ============================================================================
// COMBINED CASE MANAGEMENT ROUTER
// ============================================================================

// ============================================================================
// PDF GENERATION ROUTER
// ============================================================================

const pdfRouter = router({
  /**
   * Generate PDF report for Case Management
   * Returns a document-based PDF with selectable text
   */
  generatePDF: caseMgmtProcedure
    .input(
      z.object({
        projectId: z.number(),
        language: z.enum(['en', 'ar']).default('en'),
        reportData: z.object({
          projectName: z.string(),
          donorName: z.string(),
          dateFrom: z.string(),
          dateTo: z.string(),
          executiveSummary: z.string(),
          keyAchievements: z.string(),
          cases: z.object({
            total: z.number(),
            new: z.number(),
            active: z.number(),
            closed: z.number(),
            highRisk: z.number(),
            avgCaseDuration: z.number(),
          }),
          pssSessions: z.object({
            total: z.number(),
            individual: z.number(),
            group: z.number(),
            avgDuration: z.number(),
            followUpsScheduled: z.number(),
          }),
          safeSpaces: z.object({
            locations: z.number(),
            totalActivities: z.number(),
            childrenReached: z.number(),
            avgChildrenPerSession: z.number(),
          }),
          referrals: z.object({
            total: z.number(),
            internal: z.number(),
            external: z.number(),
            completed: z.number(),
            completionRate: z.number(),
          }),
          activities: z.object({
            total: z.number(),
            byType: z.array(z.object({
              type: z.string(),
              count: z.number(),
            })),
          }),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const { generateCaseManagementReportPDF } = await import('./pdfGenerator');
      
      try {
        const pdfBuffer = await generateCaseManagementReportPDF({
          ...input.reportData,
          language: input.language,
        });
        
        // Convert buffer to base64 for transmission
        const base64PDF = pdfBuffer.toString('base64');
        
        return {
          success: true,
          pdf: base64PDF,
          filename: `CaseManagement_Report_${input.reportData.dateFrom}_${input.reportData.dateTo}.pdf`,
        };
      } catch (error) {
        console.error('PDF generation error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate PDF report',
        });
      }
    }),
});

export const caseManagementRouter = router({
  cases: caseRecordsRouter,
  pssSessions: pssSessionsRouter,
  childSafeSpaces: childSafeSpacesRouter,
  cssActivities: cssActivitiesRouter,
  referrals: caseReferralsRouter,
  activities: caseActivitiesRouter,
  caseActivities: caseActivitiesRouter, // Alias for frontend compatibility
  pdf: pdfRouter,
});
