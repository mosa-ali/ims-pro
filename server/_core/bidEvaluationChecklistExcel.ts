/**
 * Bid Evaluation Checklist Excel Generator
 * 
 * Two modes:
 *   "template" → Empty template with headers, section structure, bidder columns (no scores)
 *   "data"     → Fully populated with all scores, totals, and status
 * 
 * All fields exported in standard format. RTL/LTR support via column ordering.
 */

import ExcelJS from "exceljs";
import { getDb } from "../db";
import {
  bidAnalyses,
  bidAnalysisBidders,
  bidEvaluationCriteria,
  bidEvaluationScores,
  organizations,
  purchaseRequests,
} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import {
  buildScoringConfig,
  computeBidderScores,
  type CriterionConfig,
} from "../services/bidEvaluationScoringService";

type ExcelLang = "en" | "ar";
type ExcelMode = "template" | "data";

// ============================================================================
// TRANSLATIONS
// ============================================================================
const t = {
  en: {
    sheetName: "Bid Evaluation Checklist",
    documentTitle: "BID EVALUATION CHECKLIST",
    prReference: "PR Reference",
    officialRecordFor: "Official record for",
    organization: "Organization",
    generatedOn: "Generated on",
    section: "Section",
    requirement: "Requirement",
    maxScore: "Max Score",
    details: "Details",
    sectionTotal: "Section Total",
    totalTechnicalScore: "Total Technical Score (Sections 1-5)",
    totalOfferPrice: "Total Offer Price",
    financialScore: "Financial Score",
    finalScore: "Final Score (Technical + Financial)",
    status: "Status",
    qualified: "Qualified",
    notQualified: "Not Qualified",
    technical: "Technical (50)",
    financial: "Financial (50)",
    total: "Total (100)",
    biddersSummary: "Bidders Summary",
    bidderName: "Bidder Name",
    mandatory: "(Mandatory)",
    screening: "(Screening)",
    paymentTerms: "Payment Terms",
    emptyTemplateNote: "TEMPLATE - Fill in scores for each bidder",
    remarks: "Remarks",
    remarksDescription: "Auto-collected feedback for Not Qualified bidders",
    noRemarksAllQualified: "All bidders are qualified \u2014 no remarks to display.",
    reasonPrefix: "Reason",
    mandatoryCriteriaFailed: "Mandatory criteria failed",
    technicalBelowThreshold: "Technical score is below 70% threshold",
    priceMissingOrInvalid: "Total Offer Price is missing or invalid (must be > 0)",
  },
  ar: {
    sheetName: "قائمة تقييم العطاءات",
    documentTitle: "قائمة تقييم العطاءات",
    prReference: "مرجع طلب الشراء",
    officialRecordFor: "سجل رسمي لـ",
    organization: "المنظمة",
    generatedOn: "تم الإنشاء في",
    section: "القسم",
    requirement: "المتطلب",
    maxScore: "الدرجة القصوى",
    details: "التفاصيل",
    sectionTotal: "إجمالي القسم",
    totalTechnicalScore: "إجمالي الدرجة الفنية (الأقسام 1-5)",
    totalOfferPrice: "إجمالي سعر العرض",
    financialScore: "الدرجة المالية",
    finalScore: "الدرجة النهائية (فني + مالي)",
    status: "الحالة",
    qualified: "مؤهل",
    notQualified: "غير مؤهل",
    technical: "فني (50)",
    financial: "مالي (50)",
    total: "إجمالي (100)",
    biddersSummary: "ملخص المناقصين",
    bidderName: "اسم المناقص",
    mandatory: "(إلزامي)",
    screening: "(فحص)",
    paymentTerms: "شروط الدفع",
    emptyTemplateNote: "نموذج - أدخل الدرجات لكل مناقص",
    remarks: "ملاحظات",
    remarksDescription: "ملاحظات مجمعة تلقائيًا للمناقصين غير المؤهلين",
    noRemarksAllQualified: "جميع المناقصين مؤهلون — لا توجد ملاحظات للعرض.",
    reasonPrefix: "السبب",
    mandatoryCriteriaFailed: "معايير إلزامية لم يتم استيفاؤها",
    technicalBelowThreshold: "الدرجة الفنية أقل من حد 70%",
    priceMissingOrInvalid: "إجمالي سعر العرض مفقود أو غير صالح (يجب أن يكون > 0)",
  },
};

// ============================================================================
// MAIN EXPORT
// ============================================================================
export async function generateBidEvaluationChecklistExcel(
  bidAnalysisId: number,
  organizationId: number,
  language: ExcelLang = "en",
  mode: ExcelMode = "data"
): Promise<Buffer> {
  const db = await getDb();
  const isRTL = language === "ar";
  const labels = t[language];

  // ── Fetch data ──────────────────────────────────────────────────────────
  const [ba] = await db.select()
    .from(bidAnalyses)
    .where(and(
      eq(bidAnalyses.id, bidAnalysisId),
      eq(bidAnalyses.organizationId, organizationId)
    ))
    .limit(1);

  if (!ba) throw new Error("Bid Analysis not found");

  const [org] = await db.select().from(organizations)
    .where(eq(organizations.id, organizationId));

  const bidders = await db.select().from(bidAnalysisBidders)
    .where(eq(bidAnalysisBidders.bidAnalysisId, bidAnalysisId));

  const activeBidders = bidders.filter(b => b.submissionStatus !== "disqualified");

  const criteria = await db.select().from(bidEvaluationCriteria)
    .where(eq(bidEvaluationCriteria.bidAnalysisId, bidAnalysisId));

  const scores = await db.select().from(bidEvaluationScores)
    .where(eq(bidEvaluationScores.bidAnalysisId, bidAnalysisId));

  // Build score map
  const scoreMap: Record<string, number> = {};
  scores.forEach(s => {
    scoreMap[`${s.criterionId}-${s.bidderId}`] = parseFloat(s.score || "0");
  });

  // ── Calculate scores ────────────────────────────────────────────────────
  const criteriaConfigs: CriterionConfig[] = criteria.map(c => ({
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

  const validPrices = activeBidders
    .filter(b => b.totalBidAmount && Number(b.totalBidAmount) > 0)
    .map(b => Number(b.totalBidAmount || 0));
  const lowestPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;

  let prTotalUsd: number | undefined;
  let prNumber = "";
  if (ba.purchaseRequestId) {
    const [pr] = await db.select({ prTotalUsd: purchaseRequests.prTotalUsd, prNumber: purchaseRequests.prNumber })
      .from(purchaseRequests)
      .where(eq(purchaseRequests.id, ba.purchaseRequestId))
      .limit(1);
    if (pr?.prTotalUsd) prTotalUsd = Number(pr.prTotalUsd);
    if (pr?.prNumber) prNumber = pr.prNumber;
  }

  const calculatedScores = activeBidders.map(bidder => {
    const bidderScoreMap = new Map<number, number>();
    scores
      .filter(s => s.bidderId === bidder.id)
      .forEach(s => bidderScoreMap.set(s.criterionId, Number(s.score || 0)));

    const result = computeBidderScores({
      bidderScores: bidderScoreMap,
      totalOfferPrice: bidder.totalBidAmount ? Number(bidder.totalBidAmount) : undefined,
      lowestPrice,
      criteria: criteriaConfigs,
      config,
      prTotalUsd,
    });

    return {
      bidderId: bidder.id,
      bidderName: bidder.bidderName || "",
      technicalScore: result.technicalScore,
      financialScore: result.financialScore,
      finalScore: result.finalScore,
      status: result.isQualified ? labels.qualified : labels.notQualified,
    };
  });

  // ── Group criteria by section ───────────────────────────────────────────
  const groupedSections: Record<number, {
    sectionNumber: number;
    sectionName: string;
    sectionNameAr: string;
    criteria: typeof criteria;
  }> = {};

  criteria.forEach(c => {
    const sn = c.sectionNumber || 1;
    if (!groupedSections[sn]) {
      groupedSections[sn] = {
        sectionNumber: sn,
        sectionName: c.sectionName || `Section ${sn}`,
        sectionNameAr: c.sectionNameAr || c.sectionName || `القسم ${sn}`,
        criteria: [],
      };
    }
    groupedSections[sn].criteria.push(c);
  });

  const sections = Object.values(groupedSections).sort((a, b) => a.sectionNumber - b.sectionNumber);

  // ── Build Excel ─────────────────────────────────────────────────────────
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "IMS";
  workbook.created = new Date();

  const ws = workbook.addWorksheet(labels.sheetName, {
    views: [{ rightToLeft: isRTL }],
    properties: { defaultColWidth: 15 },
  });

  const numBidders = activeBidders.length;
  const fixedCols = 3; // Requirement, Max Score, Details
  const totalCols = fixedCols + numBidders;

  // Styles
  const headerFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
  const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  const sectionFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } };
  const sectionFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FF1E40AF" }, size: 11 };
  const totalFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  const totalFont: Partial<ExcelJS.Font> = { bold: true, size: 11, color: { argb: "FF475569" } };
  // Total Technical Score row — STRONGEST visual weight
  const techTotalFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
  const techTotalFont: Partial<ExcelJS.Font> = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
  // Remarks section styles
  const remarkHeaderFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF2F2" } };
  const remarkHeaderFont: Partial<ExcelJS.Font> = { bold: true, size: 11, color: { argb: "FF991B1B" } };
  const remarkReasonFont: Partial<ExcelJS.Font> = { size: 10, color: { argb: "FF7F1D1D" } };
  const qualifiedFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FF15803D" }, size: 11 };
  const notQualifiedFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFDC2626" }, size: 11 };
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" },
  };

  // ── Row 1: Title ────────────────────────────────────────────────────────
  const titleRow = ws.addRow([labels.documentTitle]);
  ws.mergeCells(1, 1, 1, totalCols);
  titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: "FF1D4ED8" } };
  titleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  titleRow.height = 30;

  // ── Row 2: Meta ─────────────────────────────────────────────────────────
  const metaRow = ws.addRow([
    `${labels.organization}: ${org?.name || ""}  |  ${labels.officialRecordFor} ${prNumber}  |  ${labels.generatedOn}: ${new Date().toLocaleDateString(language === "ar" ? "ar-SA" : "en-US")}`,
  ]);
  ws.mergeCells(2, 1, 2, totalCols);
  metaRow.getCell(1).font = { size: 10, color: { argb: "FF4B5563" } };
  metaRow.getCell(1).alignment = { horizontal: "center" };

  if (mode === "template") {
    const noteRow = ws.addRow([labels.emptyTemplateNote]);
    ws.mergeCells(3, 1, 3, totalCols);
    noteRow.getCell(1).font = { bold: true, size: 11, color: { argb: "FFEA580C" } };
    noteRow.getCell(1).alignment = { horizontal: "center" };
    noteRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF7ED" } };
  }

  // ── Blank row ───────────────────────────────────────────────────────────
  ws.addRow([]);

  // ── Single column header row (appears once at the top) ─────────────────
  const colHeaderRow = ws.addRow([
    labels.requirement,
    labels.maxScore,
    labels.details,
    ...activeBidders.map(b => b.bidderName || ""),
  ]);
  for (let c = 1; c <= totalCols; c++) {
    colHeaderRow.getCell(c).fill = headerFill;
    colHeaderRow.getCell(c).font = headerFont;
    colHeaderRow.getCell(c).border = thinBorder;
    colHeaderRow.getCell(c).alignment = { horizontal: c > fixedCols ? "center" : "left", vertical: "middle", wrapText: true };
  }
  colHeaderRow.height = 24;

  // ── Process each section ────────────────────────────────────────────────
  for (const section of sections) {
    const isFinancialSection = section.sectionNumber === 6;
    const regularCriteria = section.criteria.filter(c => !c.optionGroup);
    const paymentGroup = section.criteria.filter(c => c.optionGroup === "payment_terms");

    // Insert Total Technical Score before Section 6
    if (isFinancialSection) {
      const techTotalRow = ws.addRow([
        labels.totalTechnicalScore,
        50,
        "",
        ...activeBidders.map(bidder => {
          if (mode === "template") return "";
          const calc = calculatedScores.find(c => c.bidderId === bidder.id);
          return calc?.technicalScore ?? 0;
        }),
      ]);
      for (let c = 1; c <= totalCols; c++) {
        techTotalRow.getCell(c).fill = techTotalFill;
        techTotalRow.getCell(c).font = techTotalFont;
        techTotalRow.getCell(c).border = thinBorder;
        if (c > fixedCols) techTotalRow.getCell(c).alignment = { horizontal: "center" };
      }
      techTotalRow.height = 24;
      ws.addRow([]);
    }

    // Section title row (merged across all columns, light blue background)
    const sectionTitle = `${labels.section} ${section.sectionNumber}: ${isRTL ? section.sectionNameAr : section.sectionName}`;
    const sectionHeaderRow = ws.addRow([sectionTitle]);
    ws.mergeCells(sectionHeaderRow.number, 1, sectionHeaderRow.number, totalCols);
    sectionHeaderRow.getCell(1).font = sectionFont;
    sectionHeaderRow.getCell(1).fill = sectionFill;
    sectionHeaderRow.getCell(1).border = thinBorder;
    sectionHeaderRow.height = 22;

    // Criteria rows (no repeated column header)
    for (const criterion of regularCriteria) {
      const reqLabel = isRTL
        ? (criterion.requirementLabelAr || criterion.requirementLabel || criterion.name)
        : (criterion.requirementLabel || criterion.name);
      const detailsLabel = isRTL
        ? (criterion.detailsTextAr || criterion.detailsText || "")
        : (criterion.detailsText || "");
      const suffix = criterion.isMandatoryHardStop ? ` ${labels.mandatory}` : "";
      const screeningSuffix = criterion.isScreening ? ` ${labels.screening}` : "";

      const row = ws.addRow([
        `${reqLabel}${suffix}${screeningSuffix}`,
        Number(criterion.maxScore),
        detailsLabel,
        ...activeBidders.map(bidder => {
          if (mode === "template") return "";
          if (isFinancialSection) {
            const price = bidder.totalBidAmount ? Number(bidder.totalBidAmount) : 0;
            return price > 0 ? price : "";
          }
          const key = `${criterion.id}-${bidder.id}`;
          return scoreMap[key] || 0;
        }),
      ]);

      for (let c = 1; c <= totalCols; c++) {
        row.getCell(c).border = thinBorder;
        row.getCell(c).alignment = { vertical: "top", wrapText: true };
        if (c > fixedCols) row.getCell(c).alignment = { horizontal: "center", vertical: "middle" };
        if (c === 2) row.getCell(c).alignment = { horizontal: "center" };
      }

      if (criterion.isMandatoryHardStop) {
        row.getCell(1).font = { bold: true, color: { argb: "FFDC2626" } };
      }
      if (criterion.isScreening) {
        for (let c = 1; c <= totalCols; c++) {
          row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } };
        }
      }
    }

    // Payment terms
    if (paymentGroup.length > 0) {
      const ptHeaderRow = ws.addRow([labels.paymentTerms]);
      ws.mergeCells(ptHeaderRow.number, 1, ptHeaderRow.number, totalCols);
      ptHeaderRow.getCell(1).font = { bold: true, italic: true };
      ptHeaderRow.getCell(1).fill = totalFill;
      ptHeaderRow.getCell(1).border = thinBorder;

      for (const option of paymentGroup) {
        const optLabel = isRTL
          ? (option.detailsTextAr || option.detailsText || option.name)
          : (option.detailsText || option.name);
        const row = ws.addRow([
          `  ${optLabel}`,
          Number(option.maxScore),
          "",
          ...activeBidders.map(bidder => {
            if (mode === "template") return "";
            const key = `${option.id}-${bidder.id}`;
            return scoreMap[key] || 0;
          }),
        ]);
        for (let c = 1; c <= totalCols; c++) {
          row.getCell(c).border = thinBorder;
          if (c > fixedCols) row.getCell(c).alignment = { horizontal: "center" };
        }
      }
    }

    // Section total row
    const sectionTotalRow = ws.addRow([
      labels.sectionTotal,
      "",
      "",
      ...activeBidders.map(bidder => {
        if (mode === "template") return "";
        if (isFinancialSection) {
          const calc = calculatedScores.find(c => c.bidderId === bidder.id);
          return calc?.financialScore ?? 0;
        }
        // Calculate section raw total
        let total = 0;
        const optionGroups = new Map<string, number>();
        section.criteria.forEach(c => {
          const key = `${c.id}-${bidder.id}`;
          const score = scoreMap[key] || 0;
          if (c.optionGroup) {
            const current = optionGroups.get(c.optionGroup) || 0;
            if (score > current) optionGroups.set(c.optionGroup, score);
          } else {
            total += score;
          }
        });
        optionGroups.forEach(v => { total += v; });
        return total;
      }),
    ]);
    for (let c = 1; c <= totalCols; c++) {
      sectionTotalRow.getCell(c).fill = totalFill;
      sectionTotalRow.getCell(c).font = totalFont;
      sectionTotalRow.getCell(c).border = thinBorder;
      if (c > fixedCols) sectionTotalRow.getCell(c).alignment = { horizontal: "center" };
    }

    // Blank row between sections
    ws.addRow([]);
  }

  // ── Grand Total / Summary ──────────────────────────────────────────────
  ws.addRow([]);
  const summaryHeaderRow = ws.addRow([labels.biddersSummary]);
  ws.mergeCells(summaryHeaderRow.number, 1, summaryHeaderRow.number, totalCols);
  summaryHeaderRow.getCell(1).font = { bold: true, size: 13, color: { argb: "FF1D4ED8" } };
  summaryHeaderRow.getCell(1).fill = sectionFill;
  summaryHeaderRow.getCell(1).border = thinBorder;

  // Summary column headers
  const summaryColRow = ws.addRow([
    labels.bidderName,
    labels.technical,
    labels.financial,
    labels.total,
    labels.status,
  ]);
  for (let c = 1; c <= 5; c++) {
    summaryColRow.getCell(c).fill = headerFill;
    summaryColRow.getCell(c).font = headerFont;
    summaryColRow.getCell(c).border = thinBorder;
    summaryColRow.getCell(c).alignment = { horizontal: c > 1 ? "center" : "left" };
  }

  // Summary data rows
  for (const bidder of activeBidders) {
    const calc = calculatedScores.find(c => c.bidderId === bidder.id);
    const isQualified = calc?.status === labels.qualified;
    const row = ws.addRow([
      bidder.bidderName || "",
      mode === "template" ? "" : (calc?.technicalScore ?? 0),
      mode === "template" ? "" : (calc?.financialScore ?? 0),
      mode === "template" ? "" : (calc?.finalScore ?? 0),
      mode === "template" ? "" : (calc?.status || ""),
    ]);
    for (let c = 1; c <= 5; c++) {
      row.getCell(c).border = thinBorder;
      if (c > 1) row.getCell(c).alignment = { horizontal: "center" };
    }
    if (mode === "data") {
      row.getCell(5).font = isQualified ? qualifiedFont : notQualifiedFont;
      row.getCell(4).font = { bold: true, size: 12 };
    }
  }

  // ── Remarks Section ───────────────────────────────────────────────────
  if (mode === "data") {
    ws.addRow([]);
    ws.addRow([]);
    const remarksHeaderRow = ws.addRow([labels.remarks]);
    ws.mergeCells(remarksHeaderRow.number, 1, remarksHeaderRow.number, totalCols);
    remarksHeaderRow.getCell(1).font = { bold: true, size: 13, color: { argb: "FF1E3A8A" } };
    remarksHeaderRow.getCell(1).fill = sectionFill;
    remarksHeaderRow.getCell(1).border = thinBorder;
    remarksHeaderRow.getCell(1).alignment = { horizontal: isRTL ? "right" : "left", vertical: "middle", readingOrder: isRTL ? 2 : 1 };
    remarksHeaderRow.height = 24;

    const remarksDescRow = ws.addRow([labels.remarksDescription]);
    ws.mergeCells(remarksDescRow.number, 1, remarksDescRow.number, totalCols);
    remarksDescRow.getCell(1).font = { size: 9, italic: true, color: { argb: "FF4B5563" } };
    remarksDescRow.getCell(1).alignment = { horizontal: isRTL ? "right" : "left", readingOrder: isRTL ? 2 : 1 };

    const notQualifiedBidders = calculatedScores.filter(c => c.status !== labels.qualified);
    if (notQualifiedBidders.length === 0) {
      const allQualRow = ws.addRow([labels.noRemarksAllQualified]);
      ws.mergeCells(allQualRow.number, 1, allQualRow.number, totalCols);
      allQualRow.getCell(1).font = { size: 10, color: { argb: "FF15803D" } };
      allQualRow.getCell(1).alignment = { horizontal: isRTL ? "right" : "left", readingOrder: isRTL ? 2 : 1 };
    } else {
      for (const nqBidder of notQualifiedBidders) {
        const bidderData = activeBidders.find(b => b.id === nqBidder.bidderId);
        // Compute reasons using the scoring engine
        const bidderScoreMap = new Map<number, number>();
        scores
          .filter(s => s.bidderId === nqBidder.bidderId)
          .forEach(s => bidderScoreMap.set(s.criterionId, Number(s.score || 0)));
        const result = computeBidderScores({
          bidderScores: bidderScoreMap,
          totalOfferPrice: bidderData?.totalBidAmount ? Number(bidderData.totalBidAmount) : undefined,
          lowestPrice,
          criteria: criteriaConfigs,
          config,
          prTotalUsd,
        });
        const reasons = result.reasons;
        // Translate server-side English reasons when in Arabic mode
        const translateReason = (reason: string): string => {
          if (!isRTL) return reason;
          const mandatoryMatch = reason.match(/^Mandatory criteria failed:\s*(.+)$/);
          if (mandatoryMatch) return `${labels.mandatoryCriteriaFailed}: ${mandatoryMatch[1]}`;
          const mandatoryNotMetMatch = reason.match(/^Mandatory criteria not met \((\d+) failed\)$/);
          if (mandatoryNotMetMatch) return `${labels.mandatoryCriteriaFailed} (${mandatoryNotMetMatch[1]})`;
          const techMatch = reason.match(/^Technical score \(([\d.]+)\/?(\d+)?\).*(?:below|threshold).*\(([\d.]+)\/?(\d+)?\)/);
          if (techMatch) return `${labels.technicalBelowThreshold} (${techMatch[1]}/${techMatch[2] || '50'}) - (${techMatch[3]}/${techMatch[4] || '50'})`;
          const techSimpleMatch = reason.match(/^Technical score \(([\d.]+)\) below minimum threshold \(([\d.]+)\)/);
          if (techSimpleMatch) return `${labels.technicalBelowThreshold} (${techSimpleMatch[1]}) - (${techSimpleMatch[2]})`;
          if (reason.includes('Total Offer Price is missing') || reason.includes('Total Offer Price')) return labels.priceMissingOrInvalid;
          return reason;
        };

        // Bidder name row
        const bidderRow = ws.addRow([`\u2717 ${nqBidder.bidderName} (${labels.notQualified})`]);
        ws.mergeCells(bidderRow.number, 1, bidderRow.number, totalCols);
        bidderRow.getCell(1).fill = remarkHeaderFill;
        bidderRow.getCell(1).font = remarkHeaderFont;
        bidderRow.getCell(1).border = thinBorder;
        bidderRow.getCell(1).alignment = { horizontal: isRTL ? "right" : "left", readingOrder: isRTL ? 2 : 1 };

        // Reason rows
        for (let i = 0; i < reasons.length; i++) {
          const reasonRow = ws.addRow([`  ${labels.reasonPrefix} ${i + 1}: ${translateReason(reasons[i])}`]);
          ws.mergeCells(reasonRow.number, 1, reasonRow.number, totalCols);
          reasonRow.getCell(1).font = remarkReasonFont;
          reasonRow.getCell(1).border = thinBorder;
          reasonRow.getCell(1).alignment = { horizontal: isRTL ? "right" : "left", readingOrder: isRTL ? 2 : 1, wrapText: true };
        }
        if (reasons.length === 0) {
          const noReasonRow = ws.addRow([`  ${labels.notQualified}`]);
          ws.mergeCells(noReasonRow.number, 1, noReasonRow.number, totalCols);
          noReasonRow.getCell(1).font = remarkReasonFont;
          noReasonRow.getCell(1).alignment = { horizontal: isRTL ? "right" : "left", readingOrder: isRTL ? 2 : 1 };
        }
      }
    }
  }

  // ── Column widths ──────────────────────────────────────────────────────
  ws.getColumn(1).width = 40; // Requirement
  ws.getColumn(2).width = 12; // Max Score
  ws.getColumn(3).width = 45; // Details
  for (let i = 0; i < numBidders; i++) {
    ws.getColumn(fixedCols + 1 + i).width = 20;
  }

  // ── Generate buffer ───────────────────────────────────────────────────
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
