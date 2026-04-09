import { z } from "zod";
import { router, scopedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { 
  bidOpeningMinutes,
  bidAnalyses,
  purchaseRequests,
  bomApprovalSignatures,
  users,
} from "../../../drizzle/schema";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import QRCode from "qrcode";

/**
 * Bid Opening Minutes (BOM) Router
 * 
 * BOM is used ONLY for Tenders (PR > $25K)
 * Uses standard db.select() queries for TiDB compatibility
 */

export const bidOpeningMinutesRouter = router({
  /**
   * Create BOM for a tender
   */
  create: scopedProcedure
    .input(z.object({
      purchaseRequestId: z.number(),
      bidAnalysisId: z.number(),
      openingDate: z.coerce.date(),
      openingTime: z.string(),
      openingVenue: z.string(),
      openingMode: z.enum(["physical", "online", "hybrid"]).default("physical"),
      openingLocation: z.string().optional(),
      chairpersonName: z.string().optional(),
      member1Name: z.string().optional(),
      member2Name: z.string().optional(),
      member3Name: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { purchaseRequestId, bidAnalysisId, ...bomData } = input;
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();

      // Verify PR exists
      const [pr] = await db.select()
        .from(purchaseRequests)
        .where(and(
          eq(purchaseRequests.id, purchaseRequestId),
          eq(purchaseRequests.organizationId, organizationId)
        ))
        .limit(1);

      if (!pr) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Purchase Request not found",
        });
      }

      const prTotal = parseFloat(pr.prTotalUsd || "0");
      if (prTotal <= 25000) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "BOM is only for Tenders (PR > USD 25,000).",
        });
      }

      // Verify BA exists
      const [ba] = await db.select()
        .from(bidAnalyses)
        .where(and(
          eq(bidAnalyses.id, bidAnalysisId),
          eq(bidAnalyses.organizationId, organizationId),
          isNull(bidAnalyses.deletedAt)
        ))
        .limit(1);

      if (!ba) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bid Analysis not found",
        });
      }

      // Check if announcement has closed
      if (ba.announcementEndDate && new Date() < ba.announcementEndDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot create BOM before announcement end date.",
        });
      }

      // Check if BOM already exists
      const [existingBOM] = await db.select()
        .from(bidOpeningMinutes)
        .where(and(
          eq(bidOpeningMinutes.purchaseRequestId, purchaseRequestId),
          eq(bidOpeningMinutes.organizationId, organizationId),
          isNull(bidOpeningMinutes.deletedAt)
        ))
        .limit(1);

      if (existingBOM) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "BOM already exists for this tender",
        });
      }

      // Generate BOM number (CBA number already includes year)
      const bomNumber = `BOM-${ba.cbaNumber}`;

      // Create BOM
      const [result] = await db.insert(bidOpeningMinutes).values({
        organizationId,
        operatingUnitId,
        purchaseRequestId,
        bidAnalysisId,
        minutesNumber: bomNumber,
        ...bomData,
        status: "draft",
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
        isDeleted: 0,  // Dual-column synchronization
      });

      const [createdBOM] = await db.select()
        .from(bidOpeningMinutes)
        .where(eq(bidOpeningMinutes.id, Number(result.insertId)))
        .limit(1);

      return createdBOM;
    }),

  /**
   * Update BOM committee members
   */
  updateCommittee: scopedProcedure
    .input(z.object({
      bomId: z.number(),
      chairpersonId: z.number(),
      chairpersonName: z.string(),
      member1Id: z.number(),
      member1Name: z.string(),
      member2Id: z.number(),
      member2Name: z.string(),
      member3Id: z.number().optional(),
      member3Name: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { bomId, ...committeeData } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      const [bom] = await db.select()
        .from(bidOpeningMinutes)
        .where(and(
          eq(bidOpeningMinutes.id, bomId),
          eq(bidOpeningMinutes.organizationId, organizationId),
          isNull(bidOpeningMinutes.deletedAt)
        ))
        .limit(1);

      if (!bom) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "BOM not found",
        });
      }

      if (bom.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot update committee after BOM is finalized",
        });
      }

      await db.update(bidOpeningMinutes)
        .set({
          ...committeeData,
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(eq(bidOpeningMinutes.id, bomId));

      return { success: true };
    }),

  /**
   * Update bid submission summary
   */
  updateBidSummary: scopedProcedure
    .input(z.object({
      bomId: z.number(),
      totalBidsReceived: z.number(),
      bidsOpenedCount: z.number(),
      openingNotes: z.string().optional(),
      irregularities: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { bomId, ...summaryData } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      const [bom] = await db.select()
        .from(bidOpeningMinutes)
        .where(and(
          eq(bidOpeningMinutes.id, bomId),
          eq(bidOpeningMinutes.organizationId, organizationId),
          isNull(bidOpeningMinutes.deletedAt)
        ))
        .limit(1);

      if (!bom) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "BOM not found",
        });
      }

      if (bom.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot update bid summary after BOM is finalized",
        });
      }

      await db.update(bidOpeningMinutes)
        .set({
          ...summaryData,
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(eq(bidOpeningMinutes.id, bomId));

      return { success: true };
    }),

  /**
   * Finalize BOM
   */
  finalize: scopedProcedure
    .input(z.object({
      bomId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      console.log('[BOM finalize] Called:', { bomId: input.bomId, organizationId: ctx.scope.organizationId });
      const { bomId } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      const [bom] = await db.select()
        .from(bidOpeningMinutes)
        .where(and(
          eq(bidOpeningMinutes.id, bomId),
          eq(bidOpeningMinutes.organizationId, organizationId),
          isNull(bidOpeningMinutes.deletedAt)
        ))
        .limit(1);

      if (!bom) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "BOM not found",
        });
      }

      if (!bom.chairpersonName || !bom.member1Name || !bom.member2Name) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot finalize BOM: minimum 3 committee members required",
        });
      }

      if (!bom.totalBidsReceived || bom.totalBidsReceived === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot finalize BOM: bid summary is required",
        });
      }

      await db.update(bidOpeningMinutes)
        .set({
          status: "finalized",
          finalizedAt: new Date(),
          finalizedBy: ctx.user.id,
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(eq(bidOpeningMinutes.id, bomId));

      // Auto-initialize signature slots for committee members
      const existingSlots = await db.select()
        .from(bomApprovalSignatures)
        .where(and(
          eq(bomApprovalSignatures.bomId, bomId),
          eq(bomApprovalSignatures.organizationId, organizationId)
        ));

      if (existingSlots.length === 0) {
        const members: Array<{ role: string; roleAr: string; name: string; sortOrder: number }> = [];
        if (bom.chairpersonName) {
          members.push({ role: 'Chairperson', roleAr: 'رئيس اللجنة', name: bom.chairpersonName, sortOrder: 1 });
        }
        if (bom.member1Name) {
          members.push({ role: 'Member 1', roleAr: 'العضو 1', name: bom.member1Name, sortOrder: 2 });
        }
        if (bom.member2Name) {
          members.push({ role: 'Member 2', roleAr: 'العضو 2', name: bom.member2Name, sortOrder: 3 });
        }
        if (bom.member3Name) {
          members.push({ role: 'Member 3', roleAr: 'العضو 3', name: bom.member3Name, sortOrder: 4 });
        }
        for (const member of members) {
          await db.insert(bomApprovalSignatures).values({
            bomId,
            organizationId,
            operatingUnitId: bom.operatingUnitId,
            sortOrder: member.sortOrder,
            role: member.role,
            roleAr: member.roleAr,
            memberName: member.name,
          });
        }
      }

      return { success: true };
    }),

  /**
   * Approve BOM
   */
  approve: scopedProcedure
    .input(z.object({
      bomId: z.number(),
      approverComments: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      console.log("[BOM approve] Called:", { bomId: input.bomId, userId: ctx.user.id, platformRole: ctx.user.platformRole });
      const { bomId, approverComments } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Authorization check: Only platform/org admins can approve
      const allowedRoles = ['platform_super_admin', 'platform_admin', 'organization_admin', 'admin'];
      if (!ctx.user.role || !allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can approve Bid Opening Minutes",
        });
      }

      const [bom] = await db.select()
        .from(bidOpeningMinutes)
        .where(and(
          eq(bidOpeningMinutes.id, bomId),
          eq(bidOpeningMinutes.organizationId, organizationId),
          isNull(bidOpeningMinutes.deletedAt)
        ))
        .limit(1);

      if (!bom) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "BOM not found",
        });
      }

      if (bom.status !== "finalized") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot approve BOM: must be finalized first",
        });
      }

      if (bom.status === "approved") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "BOM is already approved",
        });
      }

      // Check that all committee members have signed
      const signatures = await db.select()
        .from(bomApprovalSignatures)
        .where(and(
          eq(bomApprovalSignatures.bomId, bomId),
          eq(bomApprovalSignatures.organizationId, organizationId)
        ));

      if (signatures.length > 0) {
        const unsignedMembers = signatures.filter(s => !s.signatureDataUrl);
        if (unsignedMembers.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot approve BOM: ${unsignedMembers.length} committee member(s) have not signed yet`,
          });
        }
      }

      await db.update(bidOpeningMinutes)
        .set({
          status: "approved",
          approvedAt: new Date(),
          approvedBy: ctx.user.id,
          approverComments: approverComments || null,
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(eq(bidOpeningMinutes.id, bomId));

      // Also set bomCompleted = true on the parent bid_analyses record
      if (bom.bidAnalysisId) {
        await db.update(bidAnalyses)
          .set({
            bomCompleted: 1,
            updatedAt: new Date(),
          })
          .where(eq(bidAnalyses.id, bom.bidAnalysisId));
      }

      return { success: true };
    }),

  /**
   * Get BOM by ID
   */
  getById: scopedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const { id } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      const [bom] = await db.select()
        .from(bidOpeningMinutes)
        .where(and(
          eq(bidOpeningMinutes.id, id),
          eq(bidOpeningMinutes.organizationId, organizationId),
          isNull(bidOpeningMinutes.deletedAt)
        ))
        .limit(1);

      if (!bom) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "BOM not found",
        });
      }

      // Get PR
      const [purchaseRequest] = await db.select()
        .from(purchaseRequests)
        .where(eq(purchaseRequests.id, bom.purchaseRequestId))
        .limit(1);

      // Get BA
      const [bidAnalysis] = await db.select()
        .from(bidAnalyses)
        .where(eq(bidAnalyses.id, bom.bidAnalysisId))
        .limit(1);

      return {
        ...bom,
        purchaseRequest,
        bidAnalysis,
      };
    }),

  /**
   * Get BOM by Purchase Request ID
   */
  getByPurchaseRequestId: scopedProcedure
    .input(z.object({
      purchaseRequestId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const { purchaseRequestId } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();
      
      console.log('[BOM getByPurchaseRequestId] Called:', { purchaseRequestId, organizationId });

      const [bom] = await db.select()
        .from(bidOpeningMinutes)
        .where(and(
          eq(bidOpeningMinutes.purchaseRequestId, purchaseRequestId),
          eq(bidOpeningMinutes.organizationId, organizationId),
          isNull(bidOpeningMinutes.deletedAt)
        ))
        .limit(1);

      console.log('[BOM getByPurchaseRequestId] Query result:', { found: !!bom });
      
      if (!bom) return null;

      const [purchaseRequest] = await db.select()
        .from(purchaseRequests)
        .where(eq(purchaseRequests.id, bom.purchaseRequestId))
        .limit(1);

      const [bidAnalysis] = await db.select()
        .from(bidAnalyses)
        .where(eq(bidAnalyses.id, bom.bidAnalysisId))
        .limit(1);

      return {
        ...bom,
        purchaseRequest,
        bidAnalysis,
      };
    }),

  /**
   * Get BOM by Bid Analysis ID
   */
  getByBidAnalysisId: scopedProcedure
    .input(z.object({
      bidAnalysisId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const { bidAnalysisId } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      const [bom] = await db.select()
        .from(bidOpeningMinutes)
        .where(and(
          eq(bidOpeningMinutes.bidAnalysisId, bidAnalysisId),
          eq(bidOpeningMinutes.organizationId, organizationId),
          isNull(bidOpeningMinutes.deletedAt)
        ))
        .limit(1);

      if (!bom) return null;

      const [purchaseRequest] = await db.select()
        .from(purchaseRequests)
        .where(eq(purchaseRequests.id, bom.purchaseRequestId))
        .limit(1);

      const [bidAnalysis] = await db.select()
        .from(bidAnalyses)
        .where(eq(bidAnalyses.id, bom.bidAnalysisId))
        .limit(1);

      return {
        ...bom,
        purchaseRequest,
        bidAnalysis,
      };
    }),

  /**
   * List all BOMs for organization
   */
  list: scopedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      status: z.enum(["draft", "finalized", "approved"]).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const { limit, offset, status } = input;
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();

      const conditions = [
        eq(bidOpeningMinutes.organizationId, organizationId),
        isNull(bidOpeningMinutes.deletedAt),
      ];

      if (operatingUnitId) {
        conditions.push(eq(bidOpeningMinutes.operatingUnitId, operatingUnitId));
      }

      if (status) {
        conditions.push(eq(bidOpeningMinutes.status, status));
      }

      const boms = await db.select()
        .from(bidOpeningMinutes)
        .where(and(...conditions))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(bidOpeningMinutes.createdAt));

      return boms;
    }),

  /**
   * Auto-create or get existing BOM
   * Called when user first accesses BOM page after announcement end date
   */
  autoCreateOrGet: scopedProcedure
    .input(z.object({
      purchaseRequestId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { purchaseRequestId } = input;
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();

      // Fetch PR
      const [pr] = await db.select()
        .from(purchaseRequests)
        .where(and(
          eq(purchaseRequests.id, purchaseRequestId),
          eq(purchaseRequests.organizationId, organizationId),
          eq(purchaseRequests.operatingUnitId, operatingUnitId),
          isNull(purchaseRequests.deletedAt)
        ))
        .limit(1);

      if (!pr) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Purchase Request not found",
        });
      }

      const prTotal = parseFloat(pr.prTotalUsd || "0");
      if (prTotal <= 25000) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "BOM is only for Tenders (PR > USD 25,000).",
        });
      }

      // Check if BOM already exists
      const [existingBOM] = await db.select()
        .from(bidOpeningMinutes)
        .where(and(
          eq(bidOpeningMinutes.purchaseRequestId, purchaseRequestId),
          eq(bidOpeningMinutes.organizationId, organizationId),
          isNull(bidOpeningMinutes.deletedAt)
        ))
        .limit(1);

      if (existingBOM) {
        return existingBOM;
      }

      // Get BA to check announcement end date
      const [ba] = await db.select()
        .from(bidAnalyses)
        .where(and(
          eq(bidAnalyses.purchaseRequestId, purchaseRequestId),
          eq(bidAnalyses.organizationId, organizationId),
          isNull(bidAnalyses.deletedAt)
        ))
        .limit(1);

      // Check if announcement has closed
      if (!ba || (ba.announcementEndDate && new Date() < new Date(ba.announcementEndDate))) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot create BOM before announcement end date.",
        });
      }

      // Auto-create BOM with minimal data (CBA number already includes year)
      const bomNumber = `BOM-${ba.cbaNumber || "AUTO"}`;

      const [result] = await db.insert(bidOpeningMinutes).values({
        organizationId,
        operatingUnitId,
        purchaseRequestId,
        bidAnalysisId: ba.id,
        minutesNumber: bomNumber,
        status: "draft",
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
        isDeleted: 0,
      });

      const [createdBOM] = await db.select()
        .from(bidOpeningMinutes)
        .where(eq(bidOpeningMinutes.id, Number(result.insertId)))
        .limit(1);

      return createdBOM;
    }),

  /**
   * Generate PDF for finalized BOM using Official PDF Framework
   */
  generatePDF: scopedProcedure
    .input(z.object({
      bomId: z.number(),
      language: z.enum(['en', 'ar']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { bomId } = input;
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();
      const { generateOfficialPdf } = await import('../../services/pdf/OfficialPdfEngine.js');
      const { organizations, operatingUnits, organizationBranding, bomApprovalSignatures } = await import('../../../drizzle/schema.js');

      // Inline bilingual translations (proven approach matching CBA PDF)
      const bomTranslations = {
        en: {
          documentTitle: 'BID OPENING MINUTES',
          department: 'Logistics & Procurement',
          statusApproved: 'APPROVED',
          statusFinalized: 'FINALIZED',
          statusDraft: 'DRAFT',
          openingModePhysical: 'Physical',
          openingModeOnline: 'Online',
          openingModeHybrid: 'Hybrid',
          prReference: 'PR Reference',
          status: 'Status',
          prTotal: 'PR Total',
          prDescription: 'PR Description',
          meetingDetails: 'Meeting Details',
          openingDate: 'Opening Date',
          openingTime: 'Opening Time',
          venue: 'Venue',
          openingMode: 'Opening Mode',
          openingCommittee: 'Opening Committee',
          role: 'Role',
          name: 'Name',
          signature: 'Signature',
          chairperson: 'Chairperson',
          member: 'Member',
          bidSummary: 'Bid Summary',
          totalBidsReceived: 'Total Bids Received',
          bidsOpened: 'Bids Opened',
          openingNotes: 'Opening Notes',
          irregularities: 'Irregularities or Issues',
          approvalInformation: 'Approval Information',
          approvedAt: 'Approved At',
          approverComments: 'Approver Comments',
          signedAt: 'Signed At',
          verification: 'Verification',
        },
        ar: {
          documentTitle: 'محضر فتح العروض',
          department: 'الخدمات اللوجستية والمشتريات',
          statusApproved: 'معتمد',
          statusFinalized: 'نهائي',
          statusDraft: 'مسودة',
          openingModePhysical: 'فعلي',
          openingModeOnline: 'عبر الإنترنت',
          openingModeHybrid: 'مختلط',
          prReference: 'مرجع طلب الشراء',
          status: 'الحالة',
          prTotal: 'إجمالي طلب الشراء',
          prDescription: 'وصف طلب الشراء',
          meetingDetails: 'تفاصيل الاجتماع',
          openingDate: 'تاريخ الفتح',
          openingTime: 'وقت الفتح',
          venue: 'المكان',
          openingMode: 'طريقة الفتح',
          openingCommittee: 'لجنة الفتح',
          role: 'الدور',
          name: 'الاسم',
          signature: 'التوقيع',
          chairperson: 'رئيس اللجنة',
          member: 'العضو',
          bidSummary: 'ملخص العروض',
          totalBidsReceived: 'إجمالي العروض المستلمة',
          bidsOpened: 'العروض المفتوحة',
          openingNotes: 'ملاحظات الفتح',
          irregularities: 'المخالفات أو المشاكل',
          approvalInformation: 'معلومات الموافقة',
          approvedAt: 'تاريخ الموافقة',
          approverComments: 'تعليقات الموافق',
          signedAt: 'تاريخ التوقيع',
          verification: 'رمز التحقق',
        },
      } as const;

      // Fetch BOM with related data
      const [bom] = await db.select()
        .from(bidOpeningMinutes)
        .where(and(
          eq(bidOpeningMinutes.id, bomId),
          eq(bidOpeningMinutes.organizationId, organizationId),
          isNull(bidOpeningMinutes.deletedAt)
        ))
        .limit(1);

      if (!bom) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "BOM not found",
        });
      }

      if (bom.status !== "finalized" && bom.status !== "approved") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only generate PDF for finalized or approved BOMs",
        });
      }

      // Fetch PR
      const [pr] = await db.select()
        .from(purchaseRequests)
        .where(eq(purchaseRequests.id, bom.purchaseRequestId))
        .limit(1);

      // Fetch BA
      const [ba] = await db.select()
        .from(bidAnalyses)
        .where(eq(bidAnalyses.id, bom.bidAnalysisId))
        .limit(1);

      // Fetch organization for logo and name
      const [org] = await db.select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      // Fetch operating unit for name
      const [ou] = await db.select()
        .from(operatingUnits)
        .where(eq(operatingUnits.id, operatingUnitId))
        .limit(1);

      // Fetch organization branding for logo
      const [branding] = await db.select()
        .from(organizationBranding)
        .where(eq(organizationBranding.organizationId, organizationId))
        .limit(1);

      // Use language from frontend (user's active UI language) with fallback to English
      const language = input.language || 'en';

      // Fetch committee signatures for the approval section (must be before cache check)
      const bomSignatures = await db.select()
        .from(bomApprovalSignatures)
        .where(and(
          eq(bomApprovalSignatures.bomId, bomId),
          eq(bomApprovalSignatures.organizationId, organizationId)
        ))
        .orderBy(bomApprovalSignatures.sortOrder);
      
      // PDF template version - increment when CSS/HTML structure changes to force regeneration
      const PDF_TEMPLATE_VERSION = 'v3';

      // Always regenerate PDF when signatures exist (signatures may have changed)
      if (bomSignatures.length > 0) {
        // Force regeneration when signatures exist to ensure latest signature data
        bom.pdfFileUrl = null;
      }

      // Check if PDF exists, matches current language, and matches template version
      if (bom.pdfFileUrl) {
        const hasLanguageCode = bom.pdfFileUrl.includes('-en-') || bom.pdfFileUrl.includes('-ar-');
        const hasTemplateVersion = bom.pdfFileUrl.includes(`-${PDF_TEMPLATE_VERSION}-`);
        
        if (hasLanguageCode && hasTemplateVersion) {
          const existingLanguage = bom.pdfFileUrl.includes('-ar-') ? 'ar' : 'en';
          if (existingLanguage === language) {
            // PDF exists, matches current language AND template version
            return { pdfUrl: bom.pdfFileUrl };
          }
        }
        // Language changed, template version changed, or old format - force regeneration
        bom.pdfFileUrl = null;
      }
      const isRtl = language === 'ar';
      const labels = bomTranslations[language] || bomTranslations.en;

      // Generate body HTML for BOM using Official Framework with global classes
      const bodyHtml = `
        <!-- Meta Block: PR Information -->
        <div class="meta-block">
          <div class="meta-grid">
            <div class="meta-item">
              <div class="meta-label">${labels.prReference}</div>
              <div class="meta-value ltr-safe">${pr?.prNumber || 'N/A'}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">${labels.status}</div>
              <div class="meta-value"><span class="status-badge status-${bom.status}">${bom.status === 'approved' ? labels.statusApproved : bom.status === 'finalized' ? labels.statusFinalized : bom.status === 'draft' ? labels.statusDraft : bom.status.toUpperCase()}</span></div>
            </div>
            <div class="meta-item">
              <div class="meta-label">${labels.prTotal}</div>
              <div class="meta-value ltr-safe">USD ${pr?.prTotalUsd || '0.00'}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">${labels.prDescription}</div>
              <div class="meta-value">${pr?.prDescription || 'N/A'}</div>
            </div>
          </div>
        </div>

        <!-- Meeting Details Section -->
        <div class="section-title">${labels.meetingDetails}</div>
        <div class="section-divider"></div>
        <div class="meta-block">
          <div class="meta-grid">
            <div class="meta-item">
              <div class="meta-label">${labels.openingDate}</div>
              <div class="meta-value">${new Date(bom.openingDate).toLocaleDateString()}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">${labels.openingTime}</div>
              <div class="meta-value ltr-safe">${bom.openingTime || 'N/A'}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">${labels.venue}</div>
              <div class="meta-value">${bom.openingVenue || 'N/A'}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">${labels.openingMode}</div>
              <div class="meta-value">${bom.openingMode === 'physical' ? labels.openingModePhysical : bom.openingMode === 'online' ? labels.openingModeOnline : bom.openingMode === 'hybrid' ? labels.openingModeHybrid : (bom.openingMode || 'N/A')}</div>
            </div>
          </div>
        </div>

        <!-- Opening Committee Section (no Signature column per user request) -->
        <div class="section-title">${labels.openingCommittee}</div>
        <div class="section-divider"></div>
        <table class="table">
          <thead>
            <tr>
              <th>${labels.role}</th>
              <th>${labels.name}</th>
            </tr>
          </thead>
          <tbody>
            ${bom.chairpersonName ? `<tr><td>${labels.chairperson}</td><td>${bom.chairpersonName}</td></tr>` : ''}
            ${bom.member1Name ? `<tr><td>${labels.member} 1</td><td>${bom.member1Name}</td></tr>` : ''}
            ${bom.member2Name ? `<tr><td>${labels.member} 2</td><td>${bom.member2Name}</td></tr>` : ''}
            ${bom.member3Name ? `<tr><td>${labels.member} 3</td><td>${bom.member3Name}</td></tr>` : ''}
          </tbody>
        </table>

        <!-- Bid Summary Section -->
        <div class="section-title">${labels.bidSummary}</div>
        <div class="section-divider"></div>
        <div class="meta-block">
          <div class="meta-grid">
            <div class="meta-item">
              <div class="meta-label">${labels.totalBidsReceived}</div>
              <div class="meta-value ltr-safe">${bom.totalBidsReceived || 0}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">${labels.bidsOpened}</div>
              <div class="meta-value ltr-safe">${bom.bidsOpenedCount || 0}</div>
            </div>
          </div>
        </div>

        <!-- Opening Notes Callout -->
        ${bom.openingNotes ? `
        <div class="section-title">${labels.openingNotes}</div>
        <div class="section-divider"></div>
        <div class="callout callout-info">
          <div class="callout-content">${bom.openingNotes}</div>
        </div>
        ` : ''}

        <!-- Irregularities Callout -->
        ${bom.irregularities ? `
        <div class="section-title">${labels.irregularities}</div>
        <div class="section-divider"></div>
        <div class="callout callout-warning">
          <div class="callout-content">${bom.irregularities}</div>
        </div>
        ` : ''}

        <!-- Approval Information Section with Committee Signatures -->
        ${bom.status === 'approved' && bom.approvedAt ? `
        <div class="section-title">${labels.approvalInformation}</div>
        <div class="section-divider"></div>
        
        <!-- Committee Signatures Table -->
        ${bomSignatures.length > 0 ? `
        <table class="table" style="margin-bottom: 20px;">
          <thead>
            <tr>
              <th>${labels.role}</th>
              <th>${labels.name}</th>
              <th>${labels.signature}</th>
              <th>${labels.signedAt}</th>
              <th>${labels.verification}</th>
            </tr>
          </thead>
          <tbody>
            ${bomSignatures.map((sig: any) => `
              <tr>
                <td>${isRtl && sig.roleAr ? sig.roleAr : sig.role}</td>
                <td>${sig.memberName || '-'}</td>
                <td style="text-align: center; padding: 4px;">
                  ${sig.signatureDataUrl ? `<img src="${sig.signatureDataUrl}" style="max-width: 120px; max-height: 50px; object-fit: contain;" alt="Signature" />` : '<span style="color: #999;">-</span>'}
                </td>
                <td class="ltr-safe">${sig.signedAt ? new Date(sig.signedAt).toLocaleString() : '-'}</td>
                <td style="text-align: center; padding: 4px;">
                  ${sig.qrCodeDataUrl ? `<img src="${sig.qrCodeDataUrl}" style="width: 50px; height: 50px;" alt="QR" />` : (sig.verificationCode || '-')}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : ''}
        
        <div class="meta-block">
          <div class="meta-grid">
            <div class="meta-item">
              <div class="meta-label">${labels.approvedAt}</div>
              <div class="meta-value">${new Date(bom.approvedAt).toLocaleString()}</div>
            </div>
          </div>
          ${bom.approverComments ? `
          <div class="meta-item" style="margin-top: 15px;">
            <div class="meta-label">${labels.approverComments}</div>
            <div class="meta-value" style="margin-top: 8px;">${bom.approverComments}</div>
          </div>
          ` : ''}
        </div>
        ` : ''}
      `;

      // Generate PDF using Official PDF Engine with server-side language detection
      const { url: pdfUrl } = await generateOfficialPdf({
        organizationName: org?.name || 'Organization',
        operatingUnitName: ou?.name,
        organizationLogo: branding?.logoUrl || org?.logoUrl,
        department: labels.department,
        documentTitle: labels.documentTitle,
        formNumber: bom.minutesNumber,
        formDate: '', // Removed per user request - no date in header
        bodyHtml,
        direction: isRtl ? 'rtl' : 'ltr',
        language,
        templateVersion: PDF_TEMPLATE_VERSION,
      });

      // Update BOM with PDF URL
      await db.update(bidOpeningMinutes)
        .set({
          pdfFileUrl: pdfUrl,
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(eq(bidOpeningMinutes.id, bomId));

      return { pdfUrl };
    }),

  /**
   * Delete BOM (soft delete)
   */
  delete: scopedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      const [bom] = await db.select()
        .from(bidOpeningMinutes)
        .where(and(
          eq(bidOpeningMinutes.id, id),
          eq(bidOpeningMinutes.organizationId, organizationId),
          isNull(bidOpeningMinutes.deletedAt)
        ))
        .limit(1);

      if (!bom) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "BOM not found",
        });
      }

      if (bom.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete BOM after it has been finalized",
        });
      }

      await db.update(bidOpeningMinutes)
        .set({
          deletedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
          deletedBy: ctx.user.id,
        })
        .where(eq(bidOpeningMinutes.id, id));

      return { success: true };
    }),

  /**
   * Initialize signature slots for BOM committee members
   * Creates empty signature rows for each committee member when BOM is finalized
   */
  initSignatureSlots: scopedProcedure
    .input(z.object({
      bomId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { bomId } = input;
      const { organizationId, operatingUnitId } = ctx.scope;
      const db = await getDb();

      // Fetch BOM
      const [bom] = await db.select()
        .from(bidOpeningMinutes)
        .where(and(
          eq(bidOpeningMinutes.id, bomId),
          eq(bidOpeningMinutes.organizationId, organizationId),
          isNull(bidOpeningMinutes.deletedAt)
        ))
        .limit(1);

      if (!bom) {
        throw new TRPCError({ code: "NOT_FOUND", message: "BOM not found" });
      }

      // Check if slots already exist
      const existingSlots = await db.select()
        .from(bomApprovalSignatures)
        .where(and(
          eq(bomApprovalSignatures.bomId, bomId),
          eq(bomApprovalSignatures.organizationId, organizationId)
        ));

      if (existingSlots.length > 0) {
        return { success: true, slots: existingSlots };
      }

      // Create signature slots for each committee member
      const members: Array<{ role: string; roleAr: string; name: string; sortOrder: number }> = [];

      if (bom.chairpersonName) {
        members.push({ role: 'Chairperson', roleAr: 'رئيس اللجنة', name: bom.chairpersonName, sortOrder: 1 });
      }
      if (bom.member1Name) {
        members.push({ role: 'Member 1', roleAr: 'العضو 1', name: bom.member1Name, sortOrder: 2 });
      }
      if (bom.member2Name) {
        members.push({ role: 'Member 2', roleAr: 'العضو 2', name: bom.member2Name, sortOrder: 3 });
      }
      if (bom.member3Name) {
        members.push({ role: 'Member 3', roleAr: 'العضو 3', name: bom.member3Name, sortOrder: 4 });
      }

      for (const member of members) {
        await db.insert(bomApprovalSignatures).values({
          bomId,
          organizationId,
          operatingUnitId,
          sortOrder: member.sortOrder,
          role: member.role,
          roleAr: member.roleAr,
          memberName: member.name,
        });
      }

      // Return the created slots
      const slots = await db.select()
        .from(bomApprovalSignatures)
        .where(and(
          eq(bomApprovalSignatures.bomId, bomId),
          eq(bomApprovalSignatures.organizationId, organizationId)
        ))
        .orderBy(bomApprovalSignatures.sortOrder);

      return { success: true, slots };
    }),

  /**
   * Get BOM signatures for a specific BOM
   */
  getBomSignatures: scopedProcedure
    .input(z.object({
      bomId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const { bomId } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      const signatures = await db.select()
        .from(bomApprovalSignatures)
        .where(and(
          eq(bomApprovalSignatures.bomId, bomId),
          eq(bomApprovalSignatures.organizationId, organizationId)
        ))
        .orderBy(bomApprovalSignatures.sortOrder);

      return signatures;
    }),

  /**
   * Save a committee member's digital signature
   * Generates a verification code and QR code for the signature
   */
  saveBomSignature: scopedProcedure
    .input(z.object({
      signatureId: z.number(),
      signatureDataUrl: z.string(), // Base64 canvas data URL
    }))
    .mutation(async ({ input, ctx }) => {
      const { signatureId, signatureDataUrl } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Fetch the signature slot
      const [slot] = await db.select()
        .from(bomApprovalSignatures)
        .where(and(
          eq(bomApprovalSignatures.id, signatureId),
          eq(bomApprovalSignatures.organizationId, organizationId)
        ))
        .limit(1);

      if (!slot) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Signature slot not found" });
      }

      if (slot.signatureDataUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Signature already captured for this member" });
      }

      // Verify BOM is in finalized status (signatures collected before approval)
      const [bom] = await db.select()
        .from(bidOpeningMinutes)
        .where(eq(bidOpeningMinutes.id, slot.bomId))
        .limit(1);

      if (!bom || bom.status !== 'finalized') {
        throw new TRPCError({ code: "BAD_REQUEST", message: "BOM must be finalized before collecting signatures" });
      }

      // Generate verification code
      const verificationCode = `BOM-SIG-${nanoid(10).toUpperCase()}`;

      // Generate QR code as data URL
      let qrCodeDataUrl: string | null = null;
      try {
        qrCodeDataUrl = await QRCode.toDataURL(verificationCode, {
          width: 100,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
        });
      } catch (err) {
        console.error('QR code generation failed:', err);
        // Continue without QR code - verification code is still stored
      }

      // Update the signature slot
      const now = new Date();
      await db.update(bomApprovalSignatures)
        .set({
          signatureDataUrl,
          signedAt: now.toISOString().slice(0, 19).replace('T', ' '),
          signedByUserId: ctx.user.id,
          verificationCode,
          qrCodeDataUrl,
          updatedAt: now,
        })
        .where(eq(bomApprovalSignatures.id, signatureId));

      // Return updated slot
      const [updated] = await db.select()
        .from(bomApprovalSignatures)
        .where(eq(bomApprovalSignatures.id, signatureId))
        .limit(1);

      return updated;
    }),

  /**
   * Revoke a committee member's signature (admin only)
   * Clears the signature data, timestamp, verification code, and QR code
   * so the member can re-sign. Only works on finalized (not approved) BOMs.
   */
  revokeBomSignature: scopedProcedure
    .input(z.object({
      signatureId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { signatureId } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      // Authorization: Only admins can revoke signatures
      const allowedRoles = ['platform_super_admin', 'platform_admin', 'organization_admin', 'admin'];
      if (!ctx.user.role || !allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can revoke signatures",
        });
      }

      // Fetch the signature slot
      const [slot] = await db.select()
        .from(bomApprovalSignatures)
        .where(and(
          eq(bomApprovalSignatures.id, signatureId),
          eq(bomApprovalSignatures.organizationId, organizationId)
        ))
        .limit(1);

      if (!slot) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Signature slot not found" });
      }

      if (!slot.signatureDataUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No signature to revoke for this member" });
      }

      // Verify BOM is in finalized status (cannot revoke after approval)
      const [bom] = await db.select()
        .from(bidOpeningMinutes)
        .where(eq(bidOpeningMinutes.id, slot.bomId))
        .limit(1);

      if (!bom) {
        throw new TRPCError({ code: "NOT_FOUND", message: "BOM not found" });
      }

      if (bom.status === 'approved') {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot revoke signatures on an approved BOM" });
      }

      if (bom.status !== 'finalized') {
        throw new TRPCError({ code: "BAD_REQUEST", message: "BOM must be in finalized status to revoke signatures" });
      }

      // Clear the signature data
      await db.update(bomApprovalSignatures)
        .set({
          signatureDataUrl: null,
          signedAt: null,
          signedByUserId: null,
          verificationCode: null,
          qrCodeDataUrl: null,
          updatedAt: new Date(),
        })
        .where(eq(bomApprovalSignatures.id, signatureId));

      // Also clear cached PDF since signatures changed
      await db.update(bidOpeningMinutes)
        .set({
          pdfFileUrl: null,
          updatedAt: new Date(),
          updatedBy: ctx.user.id,
        })
        .where(eq(bidOpeningMinutes.id, slot.bomId));

      return { success: true, memberName: slot.memberName, role: slot.role };
    }),

  /**
   * Check if all committee members have signed
   */
  checkAllSigned: scopedProcedure
    .input(z.object({
      bomId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const { bomId } = input;
      const { organizationId } = ctx.scope;
      const db = await getDb();

      const signatures = await db.select()
        .from(bomApprovalSignatures)
        .where(and(
          eq(bomApprovalSignatures.bomId, bomId),
          eq(bomApprovalSignatures.organizationId, organizationId)
        ));

      const totalSlots = signatures.length;
      const signedSlots = signatures.filter(s => s.signatureDataUrl !== null).length;

      return {
        totalSlots,
        signedSlots,
        allSigned: totalSlots > 0 && signedSlots === totalSlots,
      };
    }),
});
