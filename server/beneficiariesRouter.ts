import { z } from "zod";
import { publicProcedure, protectedProcedure, scopedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { beneficiaries, projects } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { canAccess, logSensitiveAccess } from "./rbacService";
import { TRPCError } from "@trpc/server";
import { isPlatformAdmin } from "../shared/const";

/**
 * Middleware: Enforce RBAC for Beneficiaries (sensitive workspace - PII data).
 * Requires explicit screen-level permission for beneficiary_records.
 */
const beneficiaryProcedure = scopedProcedure.use(async ({ ctx, next }) => {
  const userId = ctx.user?.id;
  const orgId = ctx.scope?.organizationId;
  if (!userId || !orgId) throw new TRPCError({ code: 'UNAUTHORIZED' });
  if (isPlatformAdmin(ctx.user?.role)) return next({ ctx });
  const allowed = await canAccess(userId, orgId, 'projects', 'beneficiary_records', undefined, 'view');
  if (!allowed) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have permission to access Beneficiary Records. This is a sensitive workspace containing PII data.' });
  }
  await logSensitiveAccess(userId, orgId, null, 'sensitive_access', 'projects', 'beneficiary_records', 'beneficiary_management');
  return next({ ctx });
});

/**
 * Beneficiaries Router - Project Beneficiaries Management
 * MANDATORY: All queries filter isDeleted = false
 * MANDATORY: Delete operations use soft delete only (no hard delete)
 * 
 * PLATFORM-LEVEL ISOLATION: Uses beneficiaryProcedure to automatically inject
 * organizationId and operatingUnitId from HTTP headers via ctx.scope
 */
export const beneficiariesRouter = router({
  // Get all beneficiaries for a project (excludes soft-deleted)
  // Uses beneficiaryProcedure - organizationId and operatingUnitId come from ctx.scope
  getByProject: beneficiaryProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { organizationId, operatingUnitId } = ctx.scope;
      
      return await db.select().from(beneficiaries).where(
          and(
            eq(beneficiaries.projectId, input.projectId),
            eq(beneficiaries.organizationId, organizationId),
            eq(beneficiaries.operatingUnitId, operatingUnitId),
            eq(beneficiaries.isDeleted, 0)
          )
        ).orderBy(desc(beneficiaries.createdAt));
    }),

  // Get statistics for Overview tab (excludes soft-deleted)
  // Uses beneficiaryProcedure - organizationId and operatingUnitId come from ctx.scope
  getStatistics: beneficiaryProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { organizationId, operatingUnitId } = ctx.scope;
      
      const all = await db.select().from(beneficiaries).where(
          and(
            eq(beneficiaries.projectId, input.projectId),
            eq(beneficiaries.organizationId, organizationId),
            eq(beneficiaries.operatingUnitId, operatingUnitId),
            eq(beneficiaries.isDeleted, 0)
          )
        );
      
      const males = all.filter((b: any) => b.gender === 'MALE').length;
      const females = all.filter((b: any) => b.gender === 'FEMALE').length;
      const verified = all.filter((b: any) => b.verificationStatus === 'VERIFIED').length;
      const pending = all.filter((b: any) => b.verificationStatus === 'PENDING').length;
      const notEligible = all.filter((b: any) => b.verificationStatus === 'NOT_ELIGIBLE').length;
      
      return { total: all.length, males, females, verified, pending, notEligible };
    }),

  // Create beneficiary with new fields
  // Uses beneficiaryProcedure - organizationId and operatingUnitId come from ctx.scope
  create: beneficiaryProcedure
    .input(z.object({
      projectId: z.number(),
      fullName: z.string(),
      fullNameAr: z.string().optional(),
      dateOfBirth: z.string().optional(),
      gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
      ageGroup: z.string().optional(),
      nationality: z.string().optional(),
      phoneNumber: z.string().optional(),
      email: z.string().optional(),
      
      // New identification fields
      identificationType: z.enum(['ID_CARD', 'PASSPORT', 'FAMILY_CARD', 'OTHER']).optional(),
      identificationTypeOther: z.string().optional(),
      identificationNumber: z.string().optional(),
      identificationAttachment: z.string().optional(), // URL to S3
      
      // Location fields
      country: z.string().optional(),
      governorate: z.string().optional(),
      district: z.string().optional(),
      village: z.string().optional(),
      address: z.string().optional(),
      addressAr: z.string().optional(),
      
      // Community type (replaces displacement status)
      communityType: z.enum(['IDP', 'REFUGEE', 'HOST_COMMUNITY', 'RETURNEE', 'OTHER']).optional(),
      communityTypeOther: z.string().optional(),
      
      // Household
      householdSize: z.number().optional(),
      dependents: z.number().optional(),
      
      // Vulnerability
      vulnerabilityCategory: z.string().optional(),
      vulnerabilityOther: z.string().optional(),
      disabilityStatus: z.boolean().default(false),
      disabilityType: z.string().optional(),
      
      // Program & Service
      activityId: z.number().optional(),
      serviceType: z.enum(['TRAINING', 'WORKSHOP', 'ITEMS_DISTRIBUTION', 'PSS', 'OTHER']).optional(),
      serviceTypeOther: z.string().optional(),
      serviceStatus: z.enum(['REGISTERED', 'ACTIVE', 'COMPLETED', 'SUSPENDED']).default('REGISTERED'),
      
      // Verification
      registrationDate: z.string(),
      verificationStatus: z.enum(['VERIFIED', 'NOT_ELIGIBLE', 'PENDING']).default('PENDING'),
      verifiedBy: z.string().optional(),
      verificationDate: z.string().optional(),
      
      notes: z.string().optional(),
      notesAr: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { organizationId, operatingUnitId } = ctx.scope;
      
      // Verify project belongs to current scope
      const [project] = await db
        .select()
        .from(projects)
        .where(and(
          eq(projects.id, input.projectId),
          eq(projects.organizationId, organizationId),
          eq(projects.operatingUnitId, operatingUnitId)
        ))
        .limit(1);
      
      if (!project) {
        throw new Error("Project not found");
      }
      
      // Clean up empty string values to null for optional fields
      const cleanedInput = {
        ...input,
        dateOfBirth: input.dateOfBirth || null,
        verificationDate: input.verificationDate || null,
        identificationTypeOther: input.identificationTypeOther || null,
        identificationNumber: input.identificationNumber || null,
        identificationAttachment: input.identificationAttachment || null,
        country: input.country || null,
        governorate: input.governorate || null,
        district: input.district || null,
        village: input.village || null,
        address: input.address || null,
        addressAr: input.addressAr || null,
        communityTypeOther: input.communityTypeOther || null,
        vulnerabilityCategory: input.vulnerabilityCategory || null,
        vulnerabilityOther: input.vulnerabilityOther || null,
        disabilityType: input.disabilityType || null,
        serviceTypeOther: input.serviceTypeOther || null,
        verifiedBy: input.verifiedBy || null,
        notes: input.notes || null,
        notesAr: input.notesAr || null,
      };
      
      const result = await db.insert(beneficiaries).values({
        ...cleanedInput,
        organizationId,
        operatingUnitId,
        createdBy: ctx.user?.id,
        updatedBy: ctx.user?.id,
      });
      
      return { success: true, id: result[0].insertId };
    }),

  // Update beneficiary
  // Uses beneficiaryProcedure - organizationId and operatingUnitId come from ctx.scope
  update: beneficiaryProcedure
    .input(z.object({
      id: z.number(),
      fullName: z.string().optional(),
      fullNameAr: z.string().optional(),
      dateOfBirth: z.string().optional(),
      gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
      ageGroup: z.string().optional(),
      nationality: z.string().optional(),
      phoneNumber: z.string().optional(),
      email: z.string().optional(),
      
      // New identification fields
      identificationType: z.enum(['ID_CARD', 'PASSPORT', 'FAMILY_CARD', 'OTHER']).optional(),
      identificationTypeOther: z.string().optional(),
      identificationNumber: z.string().optional(),
      identificationAttachment: z.string().optional(),
      
      // Location fields
      country: z.string().optional(),
      governorate: z.string().optional(),
      district: z.string().optional(),
      village: z.string().optional(),
      address: z.string().optional(),
      addressAr: z.string().optional(),
      
      // Community type
      communityType: z.enum(['IDP', 'REFUGEE', 'HOST_COMMUNITY', 'RETURNEE', 'OTHER']).optional(),
      communityTypeOther: z.string().optional(),
      
      // Household
      householdSize: z.number().optional(),
      dependents: z.number().optional(),
      
      // Vulnerability
      vulnerabilityCategory: z.string().optional(),
      vulnerabilityOther: z.string().optional(),
      disabilityStatus: z.boolean().optional(),
      disabilityType: z.string().optional(),
      
      // Program & Service
      activityId: z.number().optional(),
      serviceType: z.enum(['TRAINING', 'WORKSHOP', 'ITEMS_DISTRIBUTION', 'PSS', 'OTHER']).optional(),
      serviceTypeOther: z.string().optional(),
      serviceStatus: z.enum(['REGISTERED', 'ACTIVE', 'COMPLETED', 'SUSPENDED']).optional(),
      
      // Verification
      registrationDate: z.string().optional(),
      verificationStatus: z.enum(['VERIFIED', 'NOT_ELIGIBLE', 'PENDING']).optional(),
      verifiedBy: z.string().optional(),
      verificationDate: z.string().optional(),
      
      notes: z.string().optional(),
      notesAr: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { organizationId, operatingUnitId } = ctx.scope;
      const { id, ...updateData } = input;
      
      // Verify beneficiary belongs to current scope
      const [beneficiary] = await db
        .select()
        .from(beneficiaries)
        .where(and(
          eq(beneficiaries.id, id),
          eq(beneficiaries.organizationId, organizationId),
          eq(beneficiaries.operatingUnitId, operatingUnitId)
        ))
        .limit(1);
      
      if (!beneficiary) {
        throw new Error("Beneficiary not found");
      }
      
      await db.update(beneficiaries).set({ ...updateData, updatedBy: ctx.user?.id })
        .where(and(
          eq(beneficiaries.id, id),
          eq(beneficiaries.organizationId, organizationId),
          eq(beneficiaries.operatingUnitId, operatingUnitId)
        ));
      return { success: true };
    }),

  // BULK IMPORT FROM EXCEL
  // Uses beneficiaryProcedure - organizationId and operatingUnitId come from ctx.scope
  bulkImport: beneficiaryProcedure
    .input(z.object({
      projectId: z.number(),
      beneficiaries: z.array(z.object({
        fullName: z.string(),
        gender: z.string(),
        dateOfBirth: z.string().optional(),
        identificationType: z.string().optional(),
        identificationNumber: z.string().optional(),
        country: z.string().optional(),
        governorate: z.string().optional(),
        district: z.string().optional(),
        village: z.string().optional(),
        communityType: z.string().optional(),
        householdSize: z.number().optional(),
        dependents: z.number().optional(),
        vulnerabilityCategory: z.string().optional(),
        disabilityStatus: z.boolean().optional(),
        serviceType: z.string().optional(),
        registrationDate: z.string(),
        notes: z.string().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { organizationId, operatingUnitId } = ctx.scope;

      // Verify project belongs to current scope
      const [project] = await db
        .select()
        .from(projects)
        .where(and(
          eq(projects.id, input.projectId),
          eq(projects.organizationId, organizationId),
          eq(projects.operatingUnitId, operatingUnitId)
        ))
        .limit(1);
      
      if (!project) {
        throw new Error("Project not found");
      }

      const results = {
        imported: 0,
        skipped: 0,
        errors: [] as Array<{
          row: number;
          field: string;
          value: any;
          errorType: string;
          message: string;
          suggestedFix?: string;
          originalData: Record<string, any>;
        }>,
      };

      for (let i = 0; i < input.beneficiaries.length; i++) {
        const rowData = input.beneficiaries[i];
        const rowNumber = i + 2;

        try {
          // Validate gender
          const gender = rowData.gender?.toUpperCase();
          if (!['MALE', 'FEMALE', 'OTHER'].includes(gender)) {
            results.errors.push({
              row: rowNumber,
              field: 'gender',
              value: rowData.gender,
              errorType: 'validation',
              message: `Invalid gender: ${rowData.gender}. Must be MALE, FEMALE, or OTHER`,
              suggestedFix: 'Use MALE, FEMALE, or OTHER',
              originalData: rowData,
            });
            results.skipped++;
            continue;
          }

          // Check for duplicate identificationNumber if provided
          if (rowData.identificationNumber) {
            const existing = await db.select().from(beneficiaries)
              .where(and(
                eq(beneficiaries.identificationNumber, rowData.identificationNumber),
                eq(beneficiaries.projectId, input.projectId),
                eq(beneficiaries.organizationId, organizationId),
                eq(beneficiaries.operatingUnitId, operatingUnitId),
                eq(beneficiaries.isDeleted, 0)
              ));
            
            if (existing.length > 0) {
              results.errors.push({
                row: rowNumber,
                field: 'identificationNumber',
                value: rowData.identificationNumber,
                errorType: 'business',
                message: `Beneficiary with ID Number "${rowData.identificationNumber}" already exists in this project`,
                suggestedFix: 'Use a unique ID Number or leave blank',
                originalData: rowData,
              });
              results.skipped++;
              continue;
            }
          }

          await db.insert(beneficiaries).values({
            projectId: input.projectId,
            organizationId,
            operatingUnitId,
            fullName: rowData.fullName,
            gender: gender as 'MALE' | 'FEMALE' | 'OTHER',
            dateOfBirth: rowData.dateOfBirth,
            identificationType: rowData.identificationType as any,
            identificationNumber: rowData.identificationNumber,
            country: rowData.country,
            governorate: rowData.governorate,
            district: rowData.district,
            village: rowData.village,
            communityType: rowData.communityType as any,
            householdSize: rowData.householdSize,
            dependents: rowData.dependents,
            vulnerabilityCategory: rowData.vulnerabilityCategory,
            disabilityStatus: rowData.disabilityStatus || false,
            serviceType: rowData.serviceType as any,
            serviceStatus: 'REGISTERED',
            registrationDate: rowData.registrationDate,
            verificationStatus: 'PENDING',
            notes: rowData.notes,
            createdBy: ctx.user?.id,
            updatedBy: ctx.user?.id,
          });

          results.imported++;
        } catch (error: any) {
          results.errors.push({
            row: rowNumber,
            field: 'system',
            value: null,
            errorType: 'system',
            message: 'A system error occurred while processing this record',
            suggestedFix: 'Please contact support if this error persists',
            originalData: rowData,
          });
          results.skipped++;
        }
      }

      return results;
    }),

  /**
   * Portfolio-level beneficiary summary for the Program Management Dashboard.
   * Aggregates beneficiary counts across ALL projects in the current org/OU scope.
   * Returns totals and a per-project breakdown for the BeneficiaryProgress component.
   */
  getBeneficiarySummary: beneficiaryProcedure
    .input(z.object({
      organizationId: z.number().optional(),
      operatingUnitId: z.union([z.number(), z.string()]).optional(),
    }))
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { organizationId, operatingUnitId } = ctx.scope;

      // Fetch all non-deleted beneficiaries for the scope
      const all = await db
        .select({
          id: beneficiaries.id,
          projectId: beneficiaries.projectId,
          gender: beneficiaries.gender,
          verificationStatus: beneficiaries.verificationStatus,
          serviceStatus: beneficiaries.serviceStatus,
          communityType: beneficiaries.communityType,
          disabilityStatus: beneficiaries.disabilityStatus,
        })
        .from(beneficiaries)
        .where(
          and(
            eq(beneficiaries.organizationId, organizationId),
            eq(beneficiaries.operatingUnitId, operatingUnitId),
            eq(beneficiaries.isDeleted, 0)
          )
        );

      // Portfolio-level totals
      const total = all.length;
      const males = all.filter(b => b.gender === 'MALE').length;
      const females = all.filter(b => b.gender === 'FEMALE').length;
      const verified = all.filter(b => b.verificationStatus === 'VERIFIED').length;
      const pending = all.filter(b => b.verificationStatus === 'PENDING').length;
      const notEligible = all.filter(b => b.verificationStatus === 'NOT_ELIGIBLE').length;
      const withDisability = all.filter(b => b.disabilityStatus).length;
      const completed = all.filter(b => b.serviceStatus === 'COMPLETED').length;
      const active = all.filter(b => b.serviceStatus === 'ACTIVE').length;

      // Per-project breakdown — join with projects table to get names
      const projectIds = [...new Set(all.map(b => b.projectId).filter(Boolean))] as number[];

      let projectNames: Record<number, string> = {};
      if (projectIds.length > 0) {
        const projectRows = await db
          .select({ id: projects.id, title: projects.title })
          .from(projects)
          .where(
            and(
              eq(projects.organizationId, organizationId),
              eq(projects.operatingUnitId, operatingUnitId),
              eq(projects.isDeleted, 0)
            )
          );
        for (const p of projectRows) {
          projectNames[p.id] = p.title;
        }
      }

      // Aggregate per project
      const byProjectMap: Record<number, { total: number; verified: number; males: number; females: number }> = {};
      for (const b of all) {
        if (!b.projectId) continue;
        if (!byProjectMap[b.projectId]) {
          byProjectMap[b.projectId] = { total: 0, verified: 0, males: 0, females: 0 };
        }
        byProjectMap[b.projectId].total++;
        if (b.verificationStatus === 'VERIFIED') byProjectMap[b.projectId].verified++;
        if (b.gender === 'MALE') byProjectMap[b.projectId].males++;
        if (b.gender === 'FEMALE') byProjectMap[b.projectId].females++;
      }

      const byProject = Object.entries(byProjectMap).map(([projectId, stats]) => ({
        projectId: Number(projectId),
        projectName: projectNames[Number(projectId)] || `Project #${projectId}`,
        total: stats.total,
        verified: stats.verified,
        males: stats.males,
        females: stats.females,
      })).sort((a, b) => b.total - a.total);

      return {
        total,
        males,
        females,
        verified,
        pending,
        notEligible,
        withDisability,
        completed,
        active,
        byProject,
      };
    }),

  // SOFT DELETE ONLY - NO HARD DELETE ALLOWED
  // Uses beneficiaryProcedure - organizationId and operatingUnitId come from ctx.scope
  delete: beneficiaryProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { organizationId, operatingUnitId } = ctx.scope;
      
      // Verify beneficiary belongs to current scope
      const [beneficiary] = await db
        .select()
        .from(beneficiaries)
        .where(and(
          eq(beneficiaries.id, input.id),
          eq(beneficiaries.organizationId, organizationId),
          eq(beneficiaries.operatingUnitId, operatingUnitId)
        ))
        .limit(1);
      
      if (!beneficiary) {
        throw new Error("Beneficiary not found");
      }
      
      await db.update(beneficiaries).set({
          isDeleted: 1,
          deletedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
          deletedBy: ctx.user?.id,
        }).where(and(
          eq(beneficiaries.id, input.id),
          eq(beneficiaries.organizationId, organizationId),
          eq(beneficiaries.operatingUnitId, operatingUnitId)
        ));
      
      return { success: true };
    }),
});
