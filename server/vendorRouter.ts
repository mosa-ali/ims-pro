/**
 * Vendor Management tRPC Router
 * Handles vendor CRUD, automation, and lifecycle management
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { vendors, vendorParticipationHistory, vendorPerformanceEvaluations, vendorDocuments } from "../drizzle/schema";
import { eq, and, like, or, desc, sql } from "drizzle-orm";
import {
  autoRegisterVendor,
  findDuplicateVendor,
  recordVendorParticipation,
  updateVendorStatistics,
  activateVendorFinancially,
  calculateVendorPerformanceRating,
} from "./vendorAutomation";

export const vendorRouter = router({
  /**
   * List all vendors with filtering and pagination
   */
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        vendorType: z.enum(["supplier", "contractor", "service_provider", "consultant", "other"]).optional(),
        isActive: z.boolean().optional(),
        isFinanciallyActive: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const conditions = [eq(vendors.organizationId, ctx.organizationId)];

      if (input.search) {
        conditions.push(
          or(
            like(vendors.name, `%${input.search}%`),
            like(vendors.vendorCode, `%${input.search}%`),
            like(vendors.email, `%${input.search}%`)
          )!
        );
      }

      if (input.vendorType) {
        conditions.push(eq(vendors.vendorType, input.vendorType));
      }

      if (input.isActive !== undefined) {
        conditions.push(eq(vendors.isActive, input.isActive ? 1 : 0));
      }
      if (input.isFinanciallyActive !== undefined) {
        conditions.push(eq(vendors.isFinanciallyActive, input.isFinanciallyActive ? 1 : 0));
      }

      const [vendorList, [{ total }]] = await Promise.all([
        db
          .select({
            id: vendors.id,
            organizationId: vendors.organizationId,
            operatingUnitId: vendors.operatingUnitId,
            vendorCode: vendors.vendorCode,
            name: vendors.name,
            vendorType: vendors.vendorType,
            isActive: vendors.isActive,
          })
          .from(vendors)
          .where(and(...conditions))
          .orderBy(desc(vendors.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        db
          .select({ total: sql<number>`count(*)` })
          .from(vendors)
          .where(and(...conditions)),
      ]);

      return {
        vendors: vendorList,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  /**
   * Get vendor by ID with full details
   */
  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input, ctx }) => {
    const db = await getDb();
    const [vendor] = await db
      .select()
      .from(vendors)
      .where(and(eq(vendors.id, input.id), eq(vendors.organizationId, ctx.organizationId)));

    if (!vendor) {
      throw new Error("Vendor not found");
    }

    // Get participation history
    const participations = await db
      .select()
      .from(vendorParticipationHistory)
      .where(eq(vendorParticipationHistory.vendorId, input.id))
      .orderBy(desc(vendorParticipationHistory.createdAt))
      .limit(10);

    // Get performance evaluations
    const evaluations = await db
      .select()
      .from(vendorPerformanceEvaluations)
      .where(eq(vendorPerformanceEvaluations.vendorId, input.id))
      .orderBy(desc(vendorPerformanceEvaluations.evaluationDate))
      .limit(5);

    // Get documents
    const documents = await db
      .select()
      .from(vendorDocuments)
      .where(eq(vendorDocuments.vendorId, input.id))
      .orderBy(desc(vendorDocuments.createdAt));

    return {
      vendor,
      participations,
      evaluations,
      documents,
    };
  }),

  /**
   * Auto-register vendor from procurement workflow
   */
  autoRegister: protectedProcedure
    .input(
      z.object({
        legalName: z.string().min(1),
        legalNameAr: z.string().optional(),
        tradeName: z.string().optional(),
        contactPerson: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        mobile: z.string().optional(),
        addressLine1: z.string().optional(),
        city: z.string().optional(),
        country: z.string().optional(),
        registrationNumber: z.string().optional(),
        taxId: z.string().optional(),
        primaryCategory: z.string().optional(),
        sourceModule: z.enum(["procurement", "logistics", "finance", "manual"]),
        sourceReferenceId: z.number().optional(),
        sourceReferenceType: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await autoRegisterVendor({
        organizationId: ctx.organizationId,
        operatingUnitId: ctx.operatingUnitId,
        ...input,
        createdBy: ctx.user.id,
      });

      return result;
    }),

  /**
   * Check for duplicate vendors
   */
  checkDuplicate: protectedProcedure
    .input(
      z.object({
        legalName: z.string().optional(),
        name: z.string().optional(),
        registrationNumber: z.string().optional(),
        taxId: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const duplicate = await findDuplicateVendor({
        organizationId: ctx.organizationId,
        ...input,
      });

      return {
        isDuplicate: !!duplicate,
        existingVendor: duplicate,
      };
    }),

  /**
   * Record vendor participation in procurement
   */
  recordParticipation: protectedProcedure
    .input(
      z.object({
        vendorId: z.number(),
        participationType: z.enum(["rfq", "tender", "quotation", "bid"]),
        purchaseRequestId: z.number().optional(),
        quotationAnalysisId: z.number().optional(),
        bidAnalysisId: z.number().optional(),
        submissionDate: z.date().optional(),
        submissionStatus: z.enum(["invited", "submitted", "withdrawn", "disqualified"]).optional(),
        technicalScore: z.number().optional(),
        financialScore: z.number().optional(),
        totalScore: z.number().optional(),
        ranking: z.number().optional(),
        isWinner: z.boolean().optional(),
        awardedContractValue: z.number().optional(),
        currency: z.string().optional(),
        evaluationNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await recordVendorParticipation({
        ...input,
        organizationId: ctx.organizationId,
        operatingUnitId: ctx.operatingUnitId,
      });

      return { success: true };
    }),

  /**
   * Activate vendor for financial operations
   */
  activateFinancially: protectedProcedure
    .input(
      z.object({
        vendorId: z.number(),
        bankName: z.string().optional(),
        bankAccountNumber: z.string().optional(),
        bankAccountName: z.string().optional(),
        iban: z.string().optional(),
        swiftCode: z.string().optional(),
        glAccountId: z.number().optional(),
        paymentTerms: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await activateVendorFinancially({
        ...input,
        activatedBy: ctx.user.id,
      });

      return { success: true };
    }),

  /**
   * Update vendor performance rating
   */
  updatePerformanceRating: protectedProcedure
    .input(z.object({ vendorId: z.number() }))
    .mutation(async ({ input }) => {
      const rating = await calculateVendorPerformanceRating(input.vendorId);

      return { rating };
    }),

  /**
   * Get vendor statistics dashboard
   */
  getStatistics: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const [stats] = await db
      .select({
        totalVendors: sql<number>`COUNT(*)`,
        activeVendors: sql<number>`SUM(CASE WHEN ${vendors.isActive} = true THEN 1 ELSE 0 END)`,
        financiallyActiveVendors: sql<number>`SUM(CASE WHEN ${vendors.isFinanciallyActive} = true THEN 1 ELSE 0 END)`,
        pendingApproval: sql<number>`SUM(CASE WHEN ${vendors.approvalStatus} = 'pending_approval' THEN 1 ELSE 0 END)`,
        blacklistedVendors: sql<number>`SUM(CASE WHEN ${vendors.isBlacklisted} = true THEN 1 ELSE 0 END)`,
      })
      .from(vendors)
      .where(eq(vendors.organizationId, ctx.organizationId));

    return stats;
  }),

  /**
   * Get vendor participation history
   */
  getParticipationHistory: protectedProcedure
    .input(z.object({ vendorId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const history = await db
        .select()
        .from(vendorParticipationHistory)
        .where(
          and(
            eq(vendorParticipationHistory.vendorId, input.vendorId),
            eq(vendorParticipationHistory.organizationId, ctx.organizationId)
          )
        )
        .orderBy(desc(vendorParticipationHistory.submissionDate));

      return history;
    }),

  /**
   * Get vendor performance evaluations
   */
  getPerformanceEvaluations: protectedProcedure
    .input(z.object({ vendorId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const evaluations = await db
        .select()
        .from(vendorPerformanceEvaluations)
        .where(
          and(
            eq(vendorPerformanceEvaluations.vendorId, input.vendorId),
            eq(vendorPerformanceEvaluations.organizationId, ctx.organizationId)
          )
        )
        .orderBy(desc(vendorPerformanceEvaluations.evaluationDate));

      return evaluations;
    }),

  /**
   * Get vendor documents
   */
  getDocuments: protectedProcedure
    .input(z.object({ vendorId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const documents = await db
        .select()
        .from(vendorDocuments)
        .where(
          and(
            eq(vendorDocuments.vendorId, input.vendorId),
            eq(vendorDocuments.organizationId, ctx.organizationId)
          )
        )
        .orderBy(desc(vendorDocuments.uploadedAt));

      return documents;
    }),

  /**
   * Add performance evaluation
   */
  addPerformanceEvaluation: protectedProcedure
    .input(
      z.object({
        vendorId: z.number(),
        evaluationPeriodStart: z.string().optional(),
        evaluationPeriodEnd: z.string().optional(),
        evaluationDate: z.date(),
        qualityScore: z.number().min(0).max(10),
        deliveryScore: z.number().min(0).max(10),
        complianceScore: z.number().min(0).max(10),
        communicationScore: z.number().min(0).max(10).optional(),
        strengths: z.string().optional(),
        weaknesses: z.string().optional(),
        recommendations: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      // Calculate overall score (average of provided scores)
      const scores = [input.qualityScore, input.deliveryScore, input.complianceScore];
      if (input.communicationScore !== undefined) scores.push(input.communicationScore);
      const overallScore = scores.reduce((a, b) => a + b, 0) / scores.length;

      // Insert evaluation
      await db.insert(vendorPerformanceEvaluations).values({
        vendorId: input.vendorId,
        organizationId: ctx.organizationId,
        operatingUnitId: ctx.operatingUnitId,
        evaluationDate: new Date(input.evaluationDate),
        evaluationPeriodStart: input.evaluationPeriodStart ? new Date(input.evaluationPeriodStart) : null,
        evaluationPeriodEnd: input.evaluationPeriodEnd ? new Date(input.evaluationPeriodEnd) : null,
        qualityScore: String(input.qualityScore),
        deliveryScore: String(input.deliveryScore),
        complianceScore: String(input.complianceScore),
        communicationScore: input.communicationScore !== undefined ? String(input.communicationScore) : null,
        overallScore: String(overallScore.toFixed(2)),
        strengths: input.strengths,
        weaknesses: input.weaknesses,
        recommendations: input.recommendations,
        evaluatedBy: ctx.user.id,
      });

      return { success: true };
    }),

  /**
   * Create or update vendor
   */
  upsert: protectedProcedure
    .input(
      z.object({
        id: z.number().optional(),
        name: z.string().min(1),
        legalName: z.string().optional(),
        vendorType: z.enum(["supplier", "contractor", "service_provider", "consultant", "other"]).optional(),
        contactPerson: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        mobile: z.string().optional(),
        addressLine1: z.string().optional(),
        city: z.string().optional(),
        country: z.string().optional(),
        registrationNumber: z.string().optional(),
        taxId: z.string().optional(),
        bankName: z.string().optional(),
        bankAccountNumber: z.string().optional(),
        iban: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (input.id) {
        // Update existing vendor
        await db
          .update(vendors)
          .set({
            ...input,
            updatedAt: new Date(),
            updatedBy: ctx.user.id,
          })
          .where(and(eq(vendors.id, input.id), eq(vendors.organizationId, ctx.organizationId)));

        return { id: input.id };
      } else {
        // Create new vendor
        const vendorCode = `VEN-${Date.now()}`;
        const [inserted] = await db
          .insert(vendors)
          .values({
            organizationId: ctx.organizationId,
            operatingUnitId: ctx.operatingUnitId,
            vendorCode,
            ...input,
            createdBy: ctx.user.id,
          })
          .$returningId();

        return { id: inserted.id };
      }
    }),
});
