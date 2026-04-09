/**
 * Bid Evaluation Router
 * 
 * Manages bid opening, evaluation criteria, and scoring for procurement requests
 * Supports both Quotation Analysis (3 quotes) and Bid Analysis (tender)
 */

import { z } from "zod";
import { router, scopedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import {
  bidAnalyses,
  bidAnalysisBidders,
  bidEvaluationCriteria,
  bidEvaluationScores,
  quotationAnalyses,
  quotationAnalysisSuppliers,
  purchaseRequests,
} from "../../../drizzle/schema";
import { eq, and, desc, isNull } from 'drizzle-orm';
import { TRPCError } from "@trpc/server";
import { generateBANumber, generateQANumber } from "../../services/procurementNumbering";
import {
  buildScoringConfig,
  calculateTechnicalScore,
  checkMandatoryCompliance,
  calculateFinancialScore,
  calculateFinalScore,
  determineStatus,
  buildDisqualificationReasons,
  validateScore,
  validateTotalOfferPrice,
  validatePaymentTerms,
  computeBidderScores,
  checkBudgetCeiling,
  type CriterionConfig,
  type ScoringConfig,
} from "../../services/bidEvaluationScoringService";

export const bidEvaluationRouter = router({
  /**
   * Create Quotation Analysis (for 3-quote procurement)
   */
  createQuotationAnalysis: scopedProcedure
    .input(
      z.object({
        purchaseRequestId: z.number(),
        analysisDate: z.date(),
        analysisBy: z.string(),
        recommendations: z.string().optional(),
        selectedSupplierId: z.number().optional(),
        suppliers: z.array(
          z.object({
            supplierId: z.number(),
            quotedAmount: z.number(),
            currency: z.string().default("USD"),
            deliveryDays: z.number().optional(),
            warrantyMonths: z.number().optional(),
            technicalScore: z.number().optional(),
            financialScore: z.number().optional(),
            totalScore: z.number().optional(),
            rank: z.number().optional(),
            notes: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Generate QA number
      const qaNumber = await generateQANumber(
        ctx.scope.organizationId,
        ctx.scope.operatingUnitId || 0
      );

      // Create quotation analysis
      const [result] = await db.insert(quotationAnalyses).values({
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
        purchaseRequestId: input.purchaseRequestId,
        qaNumber,
        analysisDate: input.analysisDate,
        analysisBy: input.analysisBy,
        recommendations: input.recommendations,
        selectedSupplierId: input.selectedSupplierId,
        status: "draft",
        createdBy: ctx.user.id,
        isDeleted: 0,  // Dual-column synchronization
      });

      const qaId = result.insertId;

      // Create supplier entries
      if (input.suppliers.length > 0) {
        await db.insert(quotationAnalysisSuppliers).values(
          input.suppliers.map((supplier) => ({
            quotationAnalysisId: qaId,
            supplierId: supplier.supplierId,
            quotedAmount: supplier.quotedAmount.toString(),
            currency: supplier.currency,
            deliveryDays: supplier.deliveryDays,
            warrantyMonths: supplier.warrantyMonths,
            technicalScore: supplier.technicalScore?.toString(),
            financialScore: supplier.financialScore?.toString(),
            totalScore: supplier.totalScore?.toString(),
            rank: supplier.rank,
            notes: supplier.notes,
          }))
        );
      }

      return { id: qaId, qaNumber, success: true };
    }),

  /**
   * Create Bid Analysis (for tender procurement)
   */
  createBidAnalysis: scopedProcedure
    .input(
      z.object({
        purchaseRequestId: z.number(),
        bidOpeningDate: z.date(),
        bidOpeningLocation: z.string(),
        committeeMembers: z.string(),
        evaluationDate: z.date().optional(),
        recommendations: z.string().optional(),
        selectedBidderId: z.number().optional(),
        bidders: z.array(
          z.object({
            supplierId: z.number(),
            bidAmount: z.number(),
            currency: z.string().default("USD"),
            technicalScore: z.number().optional(),
            financialScore: z.number().optional(),
            totalScore: z.number().optional(),
            rank: z.number().optional(),
            notes: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Generate BA number
      const baNumber = await generateBANumber(
        ctx.scope.organizationId,
        ctx.scope.operatingUnitId || 0
      );

      // Create bid analysis
      const [result] = await db.insert(bidAnalyses).values({
        organizationId: ctx.scope.organizationId,
        operatingUnitId: ctx.scope.operatingUnitId,
        purchaseRequestId: input.purchaseRequestId,
        baNumber,
        bidOpeningDate: input.bidOpeningDate,
        bidOpeningLocation: input.bidOpeningLocation,
        committeeMembers: input.committeeMembers,
        evaluationDate: input.evaluationDate,
        recommendations: input.recommendations,
        selectedBidderId: input.selectedBidderId,
        status: "draft",
        createdBy: ctx.user.id,
        isDeleted: 0,  // Dual-column synchronization
      });

      const baId = result.insertId;

      // Create bidder entries
      if (input.bidders.length > 0) {
        await db.insert(bidAnalysisBidders).values(
          input.bidders.map((bidder) => ({
            bidAnalysisId: baId,
            supplierId: bidder.supplierId,
            bidAmount: bidder.bidAmount.toString(),
            currency: bidder.currency,
            technicalScore: bidder.technicalScore?.toString(),
            financialScore: bidder.financialScore?.toString(),
            totalScore: bidder.totalScore?.toString(),
            rank: bidder.rank,
            notes: bidder.notes,
          }))
        );
      }

      return { id: baId, baNumber, success: true };
    }),

  /**
   * Add evaluation criteria
   */
  addCriteria: scopedProcedure
    .input(
      z.object({
        bidAnalysisId: z.number(),
        name: z.string(),
        nameAr: z.string().optional(),
        sectionNumber: z.number().optional(),
        sectionName: z.string().optional(),
        sectionNameAr: z.string().optional(),
        criteriaType: z.enum(["technical", "financial"]).default("technical"),
        stage: z.string().optional(),
        stageAr: z.string().optional(),
        weight: z.number(),
        maxScore: z.number(),
        description: z.string().optional(),
        isScreening: z.boolean().optional(),
        isApplicable: z.boolean().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      const [result] = await db.insert(bidEvaluationCriteria).values({
        bidAnalysisId: input.bidAnalysisId,
        name: input.name,
        nameAr: input.nameAr,
        sectionNumber: input.sectionNumber,
        sectionName: input.sectionName,
        sectionNameAr: input.sectionNameAr,
        criteriaType: input.criteriaType,
        stage: input.stage,
        stageAr: input.stageAr,
        weight: input.weight.toString(),
        maxScore: input.maxScore.toString(),
        description: input.description,
        isScreening: input.isScreening,
        isApplicable: input.isApplicable,
        sortOrder: input.sortOrder,
        isDeleted: 0,  // Dual-column synchronization
      });

      return { id: Number(result.insertId), success: true };
    }),

  /**
   * Update evaluation criteria
   */
  updateCriteria: scopedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        nameAr: z.string().optional(),
        sectionNumber: z.number().optional(),
        sectionName: z.string().optional(),
        sectionNameAr: z.string().optional(),
        criteriaType: z.enum(["technical", "financial"]).optional(),
        stage: z.string().optional(),
        stageAr: z.string().optional(),
        weight: z.number().optional(),
        maxScore: z.number().optional(),
        description: z.string().optional(),
        isScreening: z.boolean().optional(),
        isApplicable: z.boolean().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { id, ...updates } = input;
      const setData: any = { updatedAt: new Date() };
      if (updates.name !== undefined) setData.name = updates.name;
      if (updates.nameAr !== undefined) setData.nameAr = updates.nameAr;
      if (updates.sectionNumber !== undefined) setData.sectionNumber = updates.sectionNumber;
      if (updates.sectionName !== undefined) setData.sectionName = updates.sectionName;
      if (updates.sectionNameAr !== undefined) setData.sectionNameAr = updates.sectionNameAr;
      if (updates.criteriaType !== undefined) setData.criteriaType = updates.criteriaType;
      if (updates.stage !== undefined) setData.stage = updates.stage;
      if (updates.stageAr !== undefined) setData.stageAr = updates.stageAr;
      if (updates.weight !== undefined) setData.weight = updates.weight.toString();
      if (updates.maxScore !== undefined) setData.maxScore = updates.maxScore.toString();
      if (updates.description !== undefined) setData.description = updates.description;
      if (updates.isScreening !== undefined) setData.isScreening = updates.isScreening;
      if (updates.isApplicable !== undefined) setData.isApplicable = updates.isApplicable;
      if (updates.sortOrder !== undefined) setData.sortOrder = updates.sortOrder;

      await db.update(bidEvaluationCriteria)
        .set(setData)
        .where(eq(bidEvaluationCriteria.id, id));

      return { success: true };
    }),

  /**
   * Delete evaluation criteria
   */
  deleteCriteria: scopedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      await db.delete(bidEvaluationCriteria)
        .where(eq(bidEvaluationCriteria.id, input.id));
      return { success: true };
    }),

  /**
   * List evaluation criteria for a bid analysis
   */
  listCriteria: scopedProcedure
    .input(z.object({ bidAnalysisId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const criteria = await db.select()
        .from(bidEvaluationCriteria)
        .where(eq(bidEvaluationCriteria.bidAnalysisId, input.bidAnalysisId))
        .orderBy(bidEvaluationCriteria.sectionNumber, bidEvaluationCriteria.sortOrder);
      return criteria;
    }),

  /**
   * Bulk add default evaluation criteria template
   */
  addDefaultCriteria: scopedProcedure
    .input(z.object({ bidAnalysisId: z.number(), samplesEnabled: z.boolean().default(false) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const defaultCriteria = [
        // Section 1: Legal & Administrative (subtotal = 12)
        { sectionNumber: 1, sectionName: "Legal & Administrative", sectionNameAr: "القانونية والإدارية", criteriaType: "technical" as const, name: "Company Registration", nameAr: "تسجيل الشركة", requirementLabel: "Valid company registration", requirementLabelAr: "تسجيل شركة ساري", detailsText: "Submission of valid and current commercial registration document.", detailsTextAr: "تقديم وثيقة تسجيل تجاري سارية وحالية.", stage: "MUST be Submitted with the Bid", stageAr: "يجب تقديمه مع العطاء", maxScore: "2", weight: "1", sortOrder: 1, isMandatoryHardStop: 1 },
        { sectionNumber: 1, sectionName: "Legal & Administrative", sectionNameAr: "القانونية والإدارية", criteriaType: "technical" as const, name: "Tax Card", nameAr: "البطاقة الضريبية", requirementLabel: "Tax Card", requirementLabelAr: "البطاقة الضريبية", detailsText: "Submission of valid tax registration card.", detailsTextAr: "تقديم بطاقة ضريبية سارية.", stage: "MUST be Submitted with the Bid", stageAr: "يجب تقديمه مع العطاء", maxScore: "2", weight: "1", sortOrder: 2, isMandatoryHardStop: 1 },
        { sectionNumber: 1, sectionName: "Legal & Administrative", sectionNameAr: "القانونية والإدارية", criteriaType: "technical" as const, name: "Insurance Card", nameAr: "بطاقة التأمين", requirementLabel: "Insurance Card", requirementLabelAr: "بطاقة التأمين", detailsText: "Submission of valid insurance coverage documentation.", detailsTextAr: "تقديم وثائق تغطية تأمينية سارية.", stage: "MUST be Submitted with the Bid", stageAr: "يجب تقديمه مع العطاء", maxScore: "2", weight: "1", sortOrder: 3 },
        { sectionNumber: 1, sectionName: "Legal & Administrative", sectionNameAr: "القانونية والإدارية", criteriaType: "technical" as const, name: "Signed Declarations", nameAr: "الإقرارات الموقعة", requirementLabel: "Signed declarations", requirementLabelAr: "إقرارات موقعة", detailsText: "Submission of all required signed declarations regarding debarment, anti-corruption, and conflict of interest.", detailsTextAr: "تقديم جميع الإقرارات الموقعة المطلوبة بشأن الحرمان ومكافحة الفساد وتضارب المصالح.", stage: "MUST be Submitted with the Bid", stageAr: "يجب تقديمه مع العطاء", maxScore: "3", weight: "1", sortOrder: 4, isMandatoryHardStop: 1 },
        { sectionNumber: 1, sectionName: "Legal & Administrative", sectionNameAr: "القانونية والإدارية", criteriaType: "technical" as const, name: "Sanctions / Screening", nameAr: "الفحص / العقوبات", requirementLabel: "Sanctions screening", requirementLabelAr: "فحص العقوبات", detailsText: "Successful clearance from terrorism and sanctions screening checks.", detailsTextAr: "الحصول على تصريح ناجح من فحوصات الإرهاب والعقوبات.", stage: "MUST be Submitted with the Bid", stageAr: "يجب تقديمه مع العطاء", maxScore: "3", weight: "1", sortOrder: 5, isScreening: true, isMandatoryHardStop: 1 },

        // Section 2: Experience & Technical Capacity (subtotal = 10)
        { sectionNumber: 2, sectionName: "Experience & Technical Capacity", sectionNameAr: "الخبرة والقدرة الفنية", criteriaType: "technical" as const, name: "Company Profile", nameAr: "ملف الشركة", requirementLabel: "Company profile document", requirementLabelAr: "وثيقة ملف الشركة", detailsText: "Submission of a complete and up-to-date company profile and annual report.", detailsTextAr: "تقديم ملف شركة كامل ومحدث وتقرير سنوي.", stage: "MUST be Submitted with the Bid", stageAr: "يجب تقديمه مع العطاء", maxScore: "3", weight: "1", sortOrder: 1 },
        { sectionNumber: 2, sectionName: "Experience & Technical Capacity", sectionNameAr: "الخبرة والقدرة الفنية", criteriaType: "technical" as const, name: "Years of Experience", nameAr: "سنوات الخبرة", requirementLabel: "Years of Experience", requirementLabelAr: "سنوات الخبرة", detailsText: "More than 3 years of experience with documented proof (registration and contracts).", detailsTextAr: "أكثر من 3 سنوات خبرة مع إثبات موثق (تسجيل وعقود).", stage: "MUST be Submitted with the Bid", stageAr: "يجب تقديمه مع العطاء", maxScore: "4", weight: "1", sortOrder: 2, isMandatoryHardStop: 1 },
        { sectionNumber: 2, sectionName: "Experience & Technical Capacity", sectionNameAr: "الخبرة والقدرة الفنية", criteriaType: "technical" as const, name: "INGO Experience", nameAr: "خبرة المنظمات الدولية", requirementLabel: "I/NGO experience", requirementLabelAr: "خبرة المنظمات الدولية", detailsText: "Verifiable experience with at least two I/NGOs on similar projects.", detailsTextAr: "خبرة يمكن التحقق منها مع منظمتين دوليتين/غير حكوميتين على الأقل في مشاريع مماثلة.", stage: "MUST be Submitted with the Bid", stageAr: "يجب تقديمه مع العطاء", maxScore: "3", weight: "1", sortOrder: 3 },

        // Section 3: Operational & Financial Capacity (subtotal = 20)
        { sectionNumber: 3, sectionName: "Operational & Financial Capacity", sectionNameAr: "القدرة التشغيلية والمالية", criteriaType: "technical" as const, name: "Target Geography Presence", nameAr: "التواجد في المنطقة المستهدفة", requirementLabel: "Target geography presence", requirementLabelAr: "التواجد الجغرافي", detailsText: "Registered and operational office with verifiable proof of presence in the target area.", detailsTextAr: "مكتب مسجل وعامل مع إثبات يمكن التحقق منه للتواجد في المنطقة المستهدفة.", stage: "MUST be Submitted with the Bid", stageAr: "يجب تقديمه مع العطاء", maxScore: "1", weight: "1", sortOrder: 1 },
        { sectionNumber: 3, sectionName: "Operational & Financial Capacity", sectionNameAr: "القدرة التشغيلية والمالية", criteriaType: "technical" as const, name: "Work & Safety Plan", nameAr: "خطة العمل والسلامة", requirementLabel: "Work & Safety Plan", requirementLabelAr: "خطة العمل والسلامة", detailsText: "For Activity include building, construction, infrastructure maintenance, rehabilitation.", detailsTextAr: "للأنشطة التي تشمل البناء والتشييد وصيانة البنية التحتية وإعادة التأهيل.", stage: "MUST be Submitted with the Bid", stageAr: "يجب تقديمه مع العطاء", maxScore: "5", weight: "1", sortOrder: 2 },
        { sectionNumber: 3, sectionName: "Operational & Financial Capacity", sectionNameAr: "القدرة التشغيلية والمالية", criteriaType: "technical" as const, name: "Delivery Time", nameAr: "وقت التسليم", requirementLabel: "Delivery Time", requirementLabelAr: "وقت التسليم", detailsText: "Proposing a delivery time of 15 days or less from the purchase order date.", detailsTextAr: "اقتراح وقت تسليم 15 يومًا أو أقل من تاريخ أمر الشراء.", stage: "MUST be Submitted with the Bid", stageAr: "يجب تقديمه مع العطاء", maxScore: "2", weight: "1", sortOrder: 3 },
        { sectionNumber: 3, sectionName: "Operational & Financial Capacity", sectionNameAr: "القدرة التشغيلية والمالية", criteriaType: "technical" as const, name: "Validity of Offer", nameAr: "صلاحية العرض", requirementLabel: "Validity of Offer", requirementLabelAr: "صلاحية العرض", detailsText: "Offer is valid for at least 90 days.", detailsTextAr: "العرض صالح لمدة 90 يومًا على الأقل.", stage: "MUST be Submitted with the Bid", stageAr: "يجب تقديمه مع العطاء", maxScore: "2", weight: "1", sortOrder: 4 },
        { sectionNumber: 3, sectionName: "Operational & Financial Capacity", sectionNameAr: "القدرة التشغيلية والمالية", criteriaType: "technical" as const, name: "Replacement Period", nameAr: "فترة الاستبدال", requirementLabel: "Replacement Period", requirementLabelAr: "فترة الاستبدال", detailsText: "Supplier commits to replacing rejected items within 7 days at their own cost.", detailsTextAr: "يلتزم المورد باستبدال العناصر المرفوضة خلال 7 أيام على نفقته.", stage: "MUST be Submitted with the Bid", stageAr: "يجب تقديمه مع العطاء", maxScore: "2", weight: "1", sortOrder: 5 },
        // Payment Terms — 3 mutually exclusive options (optionGroup)
        { sectionNumber: 3, sectionName: "Operational & Financial Capacity", sectionNameAr: "القدرة التشغيلية والمالية", criteriaType: "technical" as const, name: "Payment Terms A", nameAr: "شروط الدفع أ", requirementLabel: "Payment Terms", requirementLabelAr: "شروط الدفع", detailsText: "0% upfront, 100% after delivery", detailsTextAr: "0% مقدمًا، 100% بعد التسليم", stage: "MUST be Submitted with the Bid", stageAr: "يجب تقديمه مع العطاء", maxScore: "3", weight: "1", sortOrder: 6, optionGroup: "payment_terms" },
        { sectionNumber: 3, sectionName: "Operational & Financial Capacity", sectionNameAr: "القدرة التشغيلية والمالية", criteriaType: "technical" as const, name: "Payment Terms B", nameAr: "شروط الدفع ب", requirementLabel: "Payment Terms", requirementLabelAr: "شروط الدفع", detailsText: "30% upfront, 70% after delivery", detailsTextAr: "30% مقدمًا، 70% بعد التسليم", stage: "MUST be Submitted with the Bid", stageAr: "يجب تقديمه مع العطاء", maxScore: "2", weight: "1", sortOrder: 7, optionGroup: "payment_terms" },
        { sectionNumber: 3, sectionName: "Operational & Financial Capacity", sectionNameAr: "القدرة التشغيلية والمالية", criteriaType: "technical" as const, name: "Payment Terms C", nameAr: "شروط الدفع ج", requirementLabel: "Payment Terms", requirementLabelAr: "شروط الدفع", detailsText: "50% upfront, 50% after delivery", detailsTextAr: "50% مقدمًا، 50% بعد التسليم", stage: "MUST be Submitted with the Bid", stageAr: "يجب تقديمه مع العطاء", maxScore: "1", weight: "1", sortOrder: 8, optionGroup: "payment_terms" },
        { sectionNumber: 3, sectionName: "Operational & Financial Capacity", sectionNameAr: "القدرة التشغيلية والمالية", criteriaType: "technical" as const, name: "Bank Guarantee", nameAr: "الضمان البنكي", requirementLabel: "Bank Guarantee", requirementLabelAr: "ضمان بنكي", detailsText: "Submission of an original and verifiable bank guarantee.", detailsTextAr: "تقديم ضمان بنكي أصلي وقابل للتحقق.", stage: "Mandatory before contract signature", stageAr: "إلزامي قبل توقيع العقد", maxScore: "1", weight: "1", sortOrder: 9, isMandatoryHardStop: 1 },
        { sectionNumber: 3, sectionName: "Operational & Financial Capacity", sectionNameAr: "القدرة التشغيلية والمالية", criteriaType: "technical" as const, name: "Bank Account Details", nameAr: "تفاصيل الحساب البنكي", requirementLabel: "Bank account details", requirementLabelAr: "تفاصيل الحساب البنكي", detailsText: "Submission of complete and verified bank account details.", detailsTextAr: "تقديم تفاصيل حساب بنكي كاملة ومتحقق منها.", stage: "Verification process, mandatory before award", stageAr: "عملية التحقق، إلزامية قبل الترسية", maxScore: "1", weight: "1", sortOrder: 10 },

        // Section 4: Samples (if relevant) (subtotal = 5, conditional)
        { sectionNumber: 4, sectionName: "Samples (if relevant)", sectionNameAr: "العينات (إن وجدت)", criteriaType: "technical" as const, name: "Samples", nameAr: "العينات", requirementLabel: "Samples", requirementLabelAr: "العينات", detailsText: "Verification process, mandatory before award.", detailsTextAr: "عملية التحقق، إلزامية قبل الترسية.", stage: "Verification process, mandatory before award", stageAr: "عملية التحقق، إلزامية قبل الترسية", maxScore: "5", weight: "1", sortOrder: 1, isConditional: 1, isApplicable: input.samplesEnabled ? 1 : 0 },

        // Section 5: References (subtotal = 6)
        { sectionNumber: 5, sectionName: "References", sectionNameAr: "المراجع", criteriaType: "technical" as const, name: "References", nameAr: "المراجع", requirementLabel: "References", requirementLabelAr: "المراجع", detailsText: "Contact details / letters, ideally from UN/INGOs or local NGOs.", detailsTextAr: "تفاصيل الاتصال / خطابات، يفضل من المنظمات الدولية أو المحلية.", stage: "MUST be Submitted with the Bid", stageAr: "يجب تقديمه مع العطاء", maxScore: "6", weight: "1", sortOrder: 1, isMandatoryHardStop: 1 },

        // Section 6: Total Offer Price (Financial) (subtotal = 50)
        { sectionNumber: 6, sectionName: "Total Offer Price", sectionNameAr: "إجمالي سعر العرض", criteriaType: "financial" as const, name: "Total Offer Price", nameAr: "إجمالي سعر العرض", requirementLabel: "Total bidder offer", requirementLabelAr: "إجمالي عرض مقدم العطاء", detailsText: "Financial Score (auto calculated)", detailsTextAr: "الدرجة المالية (محسوبة تلقائيًا)", stage: "Financial Evaluation", stageAr: "التقييم المالي", maxScore: "50", weight: "1", sortOrder: 1, isMandatoryHardStop: 1 },
      ];

      for (const c of defaultCriteria) {
        await db.insert(bidEvaluationCriteria).values({
          bidAnalysisId: input.bidAnalysisId,
          ...c,
          isDeleted: 0,
        });
      }

      return { success: true, count: defaultCriteria.length };
    }),

  /**
   * Save evaluation scores (bulk upsert for a bidder)
   */
  saveScores: scopedProcedure
    .input(
      z.object({
        bidAnalysisId: z.number(),
        scores: z.array(
          z.object({
            criterionId: z.number(),
            bidderId: z.number(),
            score: z.number(),
            status: z.enum(["scored", "none", "na", "not_yet_completed"]).default("scored"),
            notes: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Fetch criterion max scores for validation
      const criteria = await db.select()
        .from(bidEvaluationCriteria)
        .where(eq(bidEvaluationCriteria.bidAnalysisId, input.bidAnalysisId));

      const criteriaMap = new Map(criteria.map(c => [c.id, c]));

      // Validate each score against criterion max
      for (const s of input.scores) {
        const criterion = criteriaMap.get(s.criterionId);
        if (!criterion) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Criterion ${s.criterionId} not found`,
          });
        }

        const maxScore = Number(criterion.maxScore || 0);
        const validation = validateScore(s.score, maxScore);
        
        if (!validation.valid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Score validation failed: ${validation.error}`,
          });
        }
      }

      // Save scores
      for (const s of input.scores) {
        // Check if score already exists
        const [existing] = await db.select()
          .from(bidEvaluationScores)
          .where(
            and(
              eq(bidEvaluationScores.criterionId, s.criterionId),
              eq(bidEvaluationScores.bidderId, s.bidderId)
            )
          )
          .limit(1);

        if (existing) {
          await db.update(bidEvaluationScores)
            .set({
              score: s.score.toString(),
              status: s.status,
              notes: s.notes,
              updatedAt: new Date(),
            })
            .where(eq(bidEvaluationScores.id, existing.id));
        } else {
          await db.insert(bidEvaluationScores).values({
            bidAnalysisId: input.bidAnalysisId,
            criterionId: s.criterionId,
            bidderId: s.bidderId,
            score: s.score.toString(),
            status: s.status,
            notes: s.notes,
        isDeleted: 0,  // Dual-column synchronization
          });
        }
      }

      return { success: true, count: input.scores.length };
    }),

  /**
   * Get all evaluation scores for a bid analysis
   */
  getScores: scopedProcedure
    .input(z.object({ bidAnalysisId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const scores = await db.select()
        .from(bidEvaluationScores)
        .where(eq(bidEvaluationScores.bidAnalysisId, input.bidAnalysisId));
      return scores;
    }),

  /**
   * Get Quotation Analysis by PR
   */
  getQuotationAnalysisByPR: scopedProcedure
    .input(z.object({ purchaseRequestId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();

      const [qa] = await db
        .select()
        .from(quotationAnalyses)
        .where(
          and(
            eq(quotationAnalyses.purchaseRequestId, input.purchaseRequestId),
            eq(quotationAnalyses.organizationId, ctx.scope.organizationId),
            isNull(quotationAnalyses.deletedAt)
          )
        )
        .limit(1);

      if (!qa) return null;

      // Get suppliers
      const suppliers = await db
        .select()
        .from(quotationAnalysisSuppliers)
        .where(eq(quotationAnalysisSuppliers.quotationAnalysisId, qa.id));

      return { ...qa, suppliers };
    }),

  /**
   * Get Bid Analysis by PR
   */
  getBidAnalysisByPR: scopedProcedure
    .input(z.object({ purchaseRequestId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();

      const [ba] = await db
        .select()
        .from(bidAnalyses)
        .where(
          and(
            eq(bidAnalyses.purchaseRequestId, input.purchaseRequestId),
            eq(bidAnalyses.organizationId, ctx.scope.organizationId),
            isNull(bidAnalyses.deletedAt)
          )
        )
        .limit(1);

      if (!ba) return null;

      // Get bidders
      const bidders = await db
        .select()
        .from(bidAnalysisBidders)
        .where(eq(bidAnalysisBidders.bidAnalysisId, ba.id));

      // Get criteria
      const criteria = await db
        .select()
        .from(bidEvaluationCriteria)
        .where(eq(bidEvaluationCriteria.bidAnalysisId, ba.id));

      // Get evaluation scores
      const scores = await db.select()
        .from(bidEvaluationScores)
        .where(eq(bidEvaluationScores.bidAnalysisId, ba.id));

      // Resolve the actual vendor/supplier ID from the selected bidder row
      let selectedVendorId: number | null = null;
      if (ba.selectedBidderId) {
        const selectedBidder = bidders.find((b) => b.id === ba.selectedBidderId);
        if (selectedBidder) {
          selectedVendorId = selectedBidder.supplierId || null;
        }
      }

      return { ...ba, selectedVendorId, bidders, criteria, scores };
    }),

  /**
   * Approve evaluation (finalize)
   */
  approveEvaluation: scopedProcedure
    .input(
      z.object({
        type: z.enum(["quotation", "bid"]),
        id: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      if (input.type === "quotation") {
        await db
          .update(quotationAnalyses)
          .set({
            status: "approved",
            approvedBy: ctx.user.id,
            approvedOn: new Date(),
          })
          .where(
            and(
              eq(quotationAnalyses.id, input.id),
              eq(quotationAnalyses.organizationId, ctx.scope.organizationId)
            )
          );
      } else {
        await db
          .update(bidAnalyses)
          .set({
            status: "approved",
            approvedBy: ctx.user.id,
            approvedOn: new Date(),
          })
          .where(
            and(
              eq(bidAnalyses.id, input.id),
              eq(bidAnalyses.organizationId, ctx.scope.organizationId)
            )
          );
      }

      return { success: true };
    }),

  /**
   * Get calculated scores with governance applied
   * Returns technical, financial, final scores and qualification status
   * Uses the new scoring service with criteria-based config (isMandatoryHardStop, optionGroup, etc.)
   */
  getCalculatedScores: scopedProcedure
    .input(z.object({ bidAnalysisId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const { bidAnalysisId } = input;

      // Fetch bidders
      const bidders = await db.select()
        .from(bidAnalysisBidders)
        .where(and(
          eq(bidAnalysisBidders.bidAnalysisId, bidAnalysisId),
          eq(bidAnalysisBidders.organizationId, ctx.scope.organizationId)
        ));

      if (bidders.length === 0) {
        return [];
      }

      // Fetch criteria and build config
      const rawCriteria = await db.select()
        .from(bidEvaluationCriteria)
        .where(eq(bidEvaluationCriteria.bidAnalysisId, bidAnalysisId));

      const criteriaConfigs: CriterionConfig[] = rawCriteria.map(c => ({
        id: c.id,
        sectionNumber: c.sectionNumber || 1,
        criteriaType: c.criteriaType as "technical" | "financial",
        name: c.name,
        maxScore: Number(c.maxScore || 0),
        isMandatoryHardStop: Boolean(c.isMandatoryHardStop),
        isConditional: Boolean(c.isConditional),
        isApplicable: c.isApplicable !== 0,
        optionGroup: c.optionGroup || null,
      }));

      const config = buildScoringConfig(criteriaConfigs);

      // Fetch all scores
      const allScores = await db.select()
        .from(bidEvaluationScores)
        .where(eq(bidEvaluationScores.bidAnalysisId, bidAnalysisId));

      // Find lowest valid price
      const validPrices = bidders
        .filter(b => b.totalBidAmount && Number(b.totalBidAmount) > 0)
        .map(b => Number(b.totalBidAmount || 0));
      const lowestPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;

      // Fetch PR prTotalUsd for governance flag (ABOVE_BUDGET_REVIEW_REQUIRED)
      // Dynamically read from DB — no hardcoded values
      let prTotalUsd: number | undefined;
      const [ba] = await db.select({ purchaseRequestId: bidAnalyses.purchaseRequestId })
        .from(bidAnalyses)
        .where(eq(bidAnalyses.id, bidAnalysisId))
        .limit(1);
      if (ba?.purchaseRequestId) {
        const [pr] = await db.select({ prTotalUsd: purchaseRequests.prTotalUsd })
          .from(purchaseRequests)
          .where(eq(purchaseRequests.id, ba.purchaseRequestId))
          .limit(1);
        if (pr?.prTotalUsd) {
          prTotalUsd = Number(pr.prTotalUsd);
        }
      }

      // Calculate scores for each bidder using the new scoring service
      const results = bidders.map(bidder => {
        const scoreMap = new Map<number, number>();
        allScores
          .filter(s => s.bidderId === bidder.id)
          .forEach(s => {
            scoreMap.set(s.criterionId, Number(s.score || 0));
          });

        const result = computeBidderScores({
          bidderScores: scoreMap,
          totalOfferPrice: bidder.totalBidAmount ? Number(bidder.totalBidAmount) : undefined,
          lowestPrice,
          criteria: criteriaConfigs,
          config,
          prTotalUsd, // governance flag input — dynamically from DB
        });

        return {
          bidderId: bidder.id,
          bidderName: bidder.bidderName || "",
          technicalScore: result.technicalScore,
          financialScore: result.financialScore,
          finalScore: result.finalScore,
          percentage: result.percentage,
          status: result.isQualified ? "Qualified" : "Not Qualified",
          disqualificationReasons: result.reasons,
          isAboveBudget: result.isAboveBudget, // ABOVE_BUDGET_REVIEW_REQUIRED flag
        };
      });

      return results;
    }),

  /**
   * Save total offer price
   */
  saveTotalOfferPrice: scopedProcedure
    .input(z.object({
      bidAnalysisId: z.number(),
      bidderId: z.number(),
      totalOfferPrice: z.number(),
      currency: z.string().default("USD"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const validation = validateTotalOfferPrice(input.totalOfferPrice);

      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validation.error || "Invalid total offer price",
        });
      }

      await db.update(bidAnalysisBidders)
        .set({
          totalBidAmount: input.totalOfferPrice.toString(),
          currency: input.currency,
          updatedAt: new Date(),
        })
        .where(and(
          eq(bidAnalysisBidders.id, input.bidderId),
          eq(bidAnalysisBidders.organizationId, ctx.scope.organizationId)
        ));

      return { success: true };
    }),

  /**
   * Finalize evaluation - locks scores, updates BA status to 'financial_evaluation',
   * and marks the evaluation as ready for CBA.
   * The CBA card in ProcurementWorkspace reads from the same bid_analyses record.
   */
  finalizeEvaluation: scopedProcedure
    .input(z.object({
      bidAnalysisId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { bidAnalysisId } = input;
      const { organizationId } = ctx.scope;

      // Fetch the BA
      const [ba] = await db.select()
        .from(bidAnalyses)
        .where(and(
          eq(bidAnalyses.id, bidAnalysisId),
          eq(bidAnalyses.organizationId, organizationId),
          isNull(bidAnalyses.deletedAt)
        ))
        .limit(1);

      if (!ba) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Bid Analysis not found" });
      }

      // Check if already finalized
      if (ba.status === 'financial_evaluation' || ba.status === 'awarded') {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Evaluation has already been finalized" });
      }

      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      // Lock scoring if not already locked
      if (!ba.scoringLockedAt) {
        await db.update(bidAnalyses)
          .set({
            scoringLockedAt: now,
            scoringLockedBy: ctx.user.id,
          })
          .where(eq(bidAnalyses.id, bidAnalysisId));
      }

      // Update status to financial_evaluation (CBA stage)
      await db.update(bidAnalyses)
        .set({
          status: 'financial_evaluation',
          approvedBy: ctx.user.id,
          approvedAt: now,
          updatedBy: ctx.user.id,
        })
        .where(eq(bidAnalyses.id, bidAnalysisId));

      return { success: true };
    }),
});
