/**
 * Bid Evaluation Checklist PDF Generator
 * 
 * Uses Puppeteer + official-pdf.css (BOM flexbox approach) for consistent styling.
 * A4 landscape, dynamic width for any number of suppliers.
 * Full RTL/LTR support (Arabic and English).
 * 
 * SINGLE-HEADER pattern: one table header row at the top,
 * sections flow as colored title rows within the table body.
 * 
 * Auto-loads org logo, name, operating unit from database.
 */

import puppeteer from "puppeteer";
import chromium from "@sparticuz/chromium";
import fs from "fs";
import path from "path";
import { getDb } from "../db";
import {
  bidAnalyses,
  bidAnalysisBidders,
  bidEvaluationCriteria,
  bidEvaluationScores,
  organizations,
  organizationBranding,
  operatingUnits,
  purchaseRequests,
} from "../../drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";
import {
  buildScoringConfig,
  computeBidderScores,
  type CriterionConfig,
} from "../services/bidEvaluationScoringService";

export type PdfLang = "en" | "ar";

interface BidderCalc {
  bidderId: number;
  bidderName: string;
  technicalScore: number;
  financialScore: number;
  finalScore: number;
  status: string;
}

// ============================================================================
// TRANSLATIONS
// ============================================================================
const t = {
  en: {
    documentTitle: "BID EVALUATION CHECKLIST",
    prReference: "PR Reference",
    officialRecordFor: "Official record for",
    technical: "Technical",
    financial: "Financial",
    section: "Section",
    requirement: "Requirement",
    maxScore: "Max Score",
    details: "Details",
    sectionTotal: "Section Total",
    totalTechnicalScore: "Total Technical Score",
    sumOfSections: "Sum of Sections 1–5",
    totalOfferPrice: "Total Offer Price",
    financialScore: "Financial Score",
    paymentTerms: "Payment Terms",
    bidder: "Bidder",
    finalScore: "Final Score",
    status: "Status",
    qualified: "Qualified",
    notQualified: "Not Qualified",
    technicalPlusFinancial: "Technical + Financial",
    biddersSummary: "Bidders Summary",
    mandatoryNote: "* = Mandatory hard-stop criterion. Score of 0 results in automatic disqualification.",
    screening: "Screening",
    price: "Price",
    score: "Score",
    page: "Page",
    of: "of",
    generatedOn: "Generated on",
    operatingUnit: "Operating Unit",
    department: "Logistics & Procurement",
    remarks: "Remarks",
    remarksDescription: "Auto-collected feedback for Not Qualified bidders",
    noRemarksAllQualified: "All bidders are qualified \u2014 no remarks to display.",
    mandatoryCriteriaFailed: "Mandatory criteria failed",
    technicalBelowThreshold: "Technical score is below 70% threshold",
    priceMissingOrInvalid: "Total Offer Price is missing or invalid (must be > 0)",
  },
  ar: {
    documentTitle: "قائمة تقييم العطاءات",
    prReference: "مرجع طلب الشراء",
    officialRecordFor: "سجل رسمي لـ",
    technical: "فني",
    financial: "مالي",
    section: "القسم",
    requirement: "المتطلب",
    maxScore: "الدرجة القصوى",
    details: "التفاصيل",
    sectionTotal: "إجمالي القسم",
    totalTechnicalScore: "إجمالي الدرجة الفنية",
    sumOfSections: "مجموع الأقسام 1–5",
    totalOfferPrice: "إجمالي سعر العرض",
    financialScore: "الدرجة المالية",
    paymentTerms: "شروط الدفع",
    bidder: "المناقص",
    finalScore: "الدرجة النهائية",
    status: "الحالة",
    qualified: "مؤهل",
    notQualified: "غير مؤهل",
    technicalPlusFinancial: "فني + مالي",
    biddersSummary: "ملخص المناقصين",
    mandatoryNote: "* = معيار إلزامي. الحصول على درجة 0 يؤدي إلى الاستبعاد التلقائي.",
    screening: "فحص",
    price: "السعر",
    score: "الدرجة",
    page: "صفحة",
    of: "من",
    generatedOn: "تم الإنشاء في",
    operatingUnit: "وحدة التشغيل",
    department: "الخدمات اللوجستية والمشتريات",
    remarks: "ملاحظات",
    remarksDescription: "ملاحظات مجمعة تلقائيًا للمناقصين غير المؤهلين",
    noRemarksAllQualified: "جميع المناقصين مؤهلون — لا توجد ملاحظات للعرض.",
    mandatoryCriteriaFailed: "معايير إلزامية لم يتم استيفاؤها",
    technicalBelowThreshold: "الدرجة الفنية أقل من حد 70%",
    priceMissingOrInvalid: "إجمالي سعر العرض مفقود أو غير صالح (يجب أن يكون > 0)",
  },
};

// Badge colors for bidder columns (print-safe)
const BADGE_COLORS = [
  { bg: "#fef2f2", text: "#b91c1c", border: "#fca5a5" },
  { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  { bg: "#f0fdf4", text: "#15803d", border: "#86efac" },
  { bg: "#faf5ff", text: "#7e22ce", border: "#c4b5fd" },
  { bg: "#fff7ed", text: "#ea580c", border: "#fdba74" },
  { bg: "#f0fdfa", text: "#0f766e", border: "#5eead4" },
  { bg: "#fdf2f8", text: "#be185d", border: "#f9a8d4" },
];

function escapeHtml(s: string | undefined | null): string {
  if (s == null) return "";
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ============================================================================
// MAIN EXPORT
// ============================================================================
export async function generateBidEvaluationChecklistPDF(
  bidAnalysisId: number,
  organizationId: number,
  language: PdfLang = "en"
): Promise<Buffer> {
  const db = await getDb();
  const isRTL = language === "ar";
  const dir = isRTL ? "rtl" : "ltr";
  const labels = t[language];

  // ── Fetch data ──────────────────────────────────────────────────────────
  const [ba] = await db.select()
    .from(bidAnalyses)
    .where(and(
      eq(bidAnalyses.id, bidAnalysisId),
      eq(bidAnalyses.organizationId, organizationId),
      isNull(bidAnalyses.deletedAt)
    ))
    .limit(1);

  if (!ba) throw new Error("Bid Analysis not found");

  // Fetch organization
  const [org] = await db.select().from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  // Fetch organization branding (logo)
  const [branding] = await db.select().from(organizationBranding)
    .where(eq(organizationBranding.organizationId, organizationId))
    .limit(1);

  // Fetch operating unit
  let ouName = "";
  let ouNameAr = "";
  if (ba.operatingUnitId) {
    const [ou] = await db.select().from(operatingUnits)
      .where(eq(operatingUnits.id, ba.operatingUnitId))
      .limit(1);
    if (ou) {
      ouName = ou.name || "";
      ouNameAr = (ou as any).nameAr || ou.name || "";
    }
  }

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

  // ── Calculate scores using governance engine ────────────────────────────
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

  // Fetch PR budget for governance
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

  const calculatedScores: BidderCalc[] = activeBidders.map(bidder => {
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
      status: result.isQualified ? "Qualified" : "Not Qualified",
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

  // ── Calculate section totals ────────────────────────────────────────────
  const calcSectionTotal = (sectionCriteria: typeof criteria, bidderId: number): number => {
    let total = 0;
    const optionGroups = new Map<string, number>();
    sectionCriteria.forEach(c => {
      const key = `${c.id}-${bidderId}`;
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
  };

  // ── Read CSS ────────────────────────────────────────────────────────────
  // Use official-pdf.css (BOM's flexbox approach) — proven RTL mirroring
  const cssPath = path.join(import.meta.dirname, "../services/pdf/templates/styles/official-pdf.css");
  const css = fs.readFileSync(cssPath, "utf-8");

  // ── Build HTML ──────────────────────────────────────────────────────────
  const numBidders = activeBidders.length;
  const fixedColsWidth = 490; // requirement + maxScore + details
  const bidderColWidth = 150;
  const tableMinWidth = fixedColsWidth + numBidders * bidderColWidth;

  // Build bidder header cells (width set by colgroup, not inline)
  const bidderHeaders = activeBidders.map((b, idx) => {
    const color = BADGE_COLORS[idx % BADGE_COLORS.length];
    return `<th style="background:${color.bg};color:${color.text};border:1px solid ${color.border};text-align:center;font-weight:700;font-size:9pt;padding:3mm 2mm;word-break:break-word;">${escapeHtml(b.bidderName || "")}</th>`;
  }).join("\n");

  // ── Build SINGLE unified table with all sections ───────────────────────
  let tableBodyHtml = "";
  const totalCols = 3 + numBidders;

  for (const section of sections) {
    const isFinancialSection = section.sectionNumber === 6;
    const regularCriteria = section.criteria.filter(c => !c.optionGroup);
    const paymentGroup = section.criteria.filter(c => c.optionGroup === "payment_terms");

    // Insert Total Technical Score row before Section 6
    if (isFinancialSection) {
      tableBodyHtml += `
        <tr style="background:#2563eb;border-top:3px solid #1d4ed8;border-bottom:3px solid #1d4ed8;">
          <td style="padding:3.5mm 3.5mm;font-weight:900;color:#ffffff;font-size:10.5pt;border:1px solid rgba(255,255,255,0.2);" colspan="1">${escapeHtml(labels.totalTechnicalScore)}</td>
          <td style="padding:3.5mm 3.5mm;text-align:center;font-weight:700;color:#ffffff;font-size:10.5pt;border:1px solid rgba(255,255,255,0.2);">50</td>
          <td style="padding:3.5mm 3.5mm;font-size:8.5pt;color:#bfdbfe;border:1px solid rgba(255,255,255,0.2);">${escapeHtml(labels.sumOfSections)}</td>
          ${activeBidders.map(bidder => {
            const calc = calculatedScores.find(c => c.bidderId === bidder.id);
            const techScore = calc?.technicalScore ?? 0;
            const isQualified = techScore >= 35;
            return `<td style="padding:3.5mm 3.5mm;text-align:center;font-weight:900;font-size:11pt;color:${isQualified ? '#86efac' : '#fca5a5'};border:1px solid rgba(255,255,255,0.2);">${techScore.toFixed(2)}</td>`;
          }).join("")}
        </tr>
        <tr><td colspan="${totalCols}" style="border:none;padding:2mm 0;"></td></tr>
      `;
    }

    // Section title row — MEDIUM visual weight
    const sectionTitle = `${labels.section} ${section.sectionNumber}: ${isRTL ? section.sectionNameAr : section.sectionName}`;
    tableBodyHtml += `
      <tr style="background:#dbeafe;border-top:2px solid #93c5fd;">
        <td colspan="${totalCols}" style="padding:3mm 3.5mm;font-weight:900;font-size:10.5pt;color:#1e3a8a;border:1px solid #93c5fd;">${escapeHtml(sectionTitle)}</td>
      </tr>
    `;

    // Regular criteria rows
    for (const criterion of regularCriteria) {
      const reqLabel = isRTL
        ? (criterion.requirementLabelAr || criterion.requirementLabel || criterion.name)
        : (criterion.requirementLabel || criterion.name);
      const detailsLabel = isRTL
        ? (criterion.detailsTextAr || criterion.detailsText || "")
        : (criterion.detailsText || "");
      const mandatoryMark = criterion.isMandatoryHardStop ? ' <span style="color:#dc2626;">*</span>' : "";
      const screeningMark = criterion.isScreening ? ` <span style="font-size:7.5pt;color:#16a34a;">(${escapeHtml(labels.screening)})</span>` : "";

      if (isFinancialSection) {
        tableBodyHtml += `
          <tr>
            <td style="font-size:9pt;font-weight:600;">${escapeHtml(reqLabel)}${mandatoryMark}</td>
            <td style="text-align:center;font-size:9pt;">${parseFloat(criterion.maxScore as any).toFixed(0)}</td>
            <td style="font-size:8.5pt;color:#4b5563;">${escapeHtml(detailsLabel)}</td>
            ${activeBidders.map(bidder => {
              const calc = calculatedScores.find(c => c.bidderId === bidder.id);
              const price = bidder.totalBidAmount ? Number(bidder.totalBidAmount) : 0;
              const currency = bidder.currency || "USD";
              return `<td style="text-align:center;font-size:8.5pt;">
                <div style="font-weight:600;" class="ltr-safe">${currency} ${price > 0 ? price.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "—"}</div>
                <div style="font-size:8pt;color:#4b5563;margin-top:1mm;">${escapeHtml(labels.score)}: <strong>${calc?.financialScore?.toFixed(2) ?? "0.00"}</strong></div>
              </td>`;
            }).join("")}
          </tr>
        `;
      } else {
        tableBodyHtml += `
          <tr${criterion.isScreening ? ' style="background:#f0fdf4;"' : ""}>
            <td style="font-size:9pt;font-weight:500;">${escapeHtml(reqLabel)}${screeningMark}${mandatoryMark}</td>
            <td style="text-align:center;font-size:9pt;">${parseFloat(criterion.maxScore as any).toFixed(1)}</td>
            <td style="font-size:8.5pt;color:#4b5563;">${escapeHtml(detailsLabel)}</td>
            ${activeBidders.map(bidder => {
              const key = `${criterion.id}-${bidder.id}`;
              const score = scoreMap[key] || 0;
              return `<td style="text-align:center;font-size:9.5pt;font-weight:600;">${score.toFixed(1)}</td>`;
            }).join("")}
          </tr>
        `;
      }
    }

    // Payment terms rows
    if (paymentGroup.length > 0) {
      tableBodyHtml += `
        <tr style="background:#f3f4f6;">
          <td colspan="${totalCols}" style="font-size:9pt;font-weight:700;padding:2mm 3.5mm;">${escapeHtml(labels.paymentTerms)}</td>
        </tr>
      `;
      for (const option of paymentGroup) {
        const optLabel = isRTL
          ? (option.detailsTextAr || option.detailsText || option.name)
          : (option.detailsText || option.name);
        tableBodyHtml += `
          <tr>
            <td style="font-size:8.5pt;padding-${isRTL ? 'right' : 'left'}:8mm;">${escapeHtml(optLabel)}</td>
            <td style="text-align:center;font-size:9pt;">${parseFloat(option.maxScore as any).toFixed(0)}</td>
            <td></td>
            ${activeBidders.map(bidder => {
              const key = `${option.id}-${bidder.id}`;
              const score = scoreMap[key] || 0;
              return `<td style="text-align:center;font-size:9pt;">${score > 0 ? "●" : "○"} ${score > 0 ? score.toFixed(0) : ""}</td>`;
            }).join("")}
          </tr>
        `;
      }
    }

    // Section total row — SUBTLE visual weight
    tableBodyHtml += `
      <tr style="background:#f1f5f9;border-bottom:1px solid #cbd5e1;">
        <td colspan="3" style="font-size:9.5pt;font-weight:700;color:#475569;border:1px solid #e2e8f0;">${escapeHtml(labels.sectionTotal)}</td>
        ${activeBidders.map(bidder => {
          if (isFinancialSection) {
            const calc = calculatedScores.find(c => c.bidderId === bidder.id);
            return `<td style="text-align:center;font-size:10pt;font-weight:700;color:#15803d;border:1px solid #e2e8f0;">${calc?.financialScore?.toFixed(2) ?? "0.00"}</td>`;
          }
          const total = calcSectionTotal(section.criteria, bidder.id);
          return `<td style="text-align:center;font-size:10pt;font-weight:700;color:#15803d;border:1px solid #e2e8f0;">${total.toFixed(2)}</td>`;
        }).join("")}
      </tr>
    `;

    // Add a small spacer row between sections (except after the last)
    if (section !== sections[sections.length - 1]) {
      tableBodyHtml += `<tr><td colspan="${totalCols}" style="border:none;padding:1.5mm 0;"></td></tr>`;
    }
  }

  // ── Grand Total Table ───────────────────────────────────────────────────
  const grandTotalHtml = `
    <div class="avoid-break" style="margin-top:6mm;">
      <h3 class="section-title" style="font-size:12pt;${isRTL ? 'text-align:right;' : ''}">${escapeHtml(labels.technicalPlusFinancial)} = 100</h3>
      <table style="width:100%;">
        <thead>
          <tr>
            <th style="text-align:${isRTL ? 'right' : 'left'};">${escapeHtml(labels.bidder)}</th>
            <th style="text-align:center;">${escapeHtml(labels.technical)} (50)</th>
            <th style="text-align:center;">${escapeHtml(labels.financial)} (50)</th>
            <th style="text-align:center;">${escapeHtml(labels.finalScore)} (100)</th>
            <th style="text-align:center;">${escapeHtml(labels.status)}</th>
          </tr>
        </thead>
        <tbody>
          ${activeBidders.map(bidder => {
            const calc = calculatedScores.find(c => c.bidderId === bidder.id);
            const isQualified = calc?.status === "Qualified";
            return `
              <tr>
                <td style="font-weight:600;">${escapeHtml(bidder.bidderName || "")}</td>
                <td style="text-align:center;font-weight:700;">${calc?.technicalScore?.toFixed(2) ?? "0.00"}</td>
                <td style="text-align:center;font-weight:700;">${calc?.financialScore?.toFixed(2) ?? "0.00"}</td>
                <td style="text-align:center;font-weight:900;font-size:12pt;">${calc?.finalScore?.toFixed(2) ?? "0.00"}</td>
                <td style="text-align:center;font-weight:700;color:${isQualified ? '#15803d' : '#dc2626'};">
                  ${isQualified ? "✓" : "✗"} ${escapeHtml(isQualified ? labels.qualified : labels.notQualified)}
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;

  // ── Bidders Summary Cards ───────────────────────────────────────────────
  const cardsPerRow = Math.min(numBidders, 5);
  const summaryCardsHtml = `
    <div style="margin-bottom:5mm;">
      <h3 class="section-title" style="font-size:11pt;${isRTL ? 'text-align:right;' : ''}">${escapeHtml(labels.biddersSummary)}</h3>
      <div style="display:grid;grid-template-columns:repeat(${cardsPerRow}, 1fr);gap:3mm;width:100%;">
        ${activeBidders.map((bidder, idx) => {
          const calc = calculatedScores.find(c => c.bidderId === bidder.id);
          const isQualified = calc?.status === "Qualified";
          return `
            <div style="border:2px solid ${isQualified ? '#86efac' : '#fca5a5'};border-radius:6px;padding:3mm;background:${isQualified ? '#f0fdf4' : '#fef2f2'};">
              <div style="font-weight:700;font-size:9.5pt;margin-bottom:2mm;word-break:break-word;">${escapeHtml(bidder.bidderName || "")}</div>
              <div style="font-size:8.5pt;display:flex;justify-content:space-between;"><span style="color:#4b5563;">${escapeHtml(labels.technical)}:</span><strong>${calc?.technicalScore?.toFixed(2) ?? "0.00"}/50</strong></div>
              <div style="font-size:8.5pt;display:flex;justify-content:space-between;"><span style="color:#4b5563;">${escapeHtml(labels.financial)}:</span><strong>${calc?.financialScore?.toFixed(2) ?? "0.00"}/50</strong></div>
              <div style="font-size:8.5pt;display:flex;justify-content:space-between;border-top:1px solid #e5e7eb;padding-top:1.5mm;margin-top:1.5mm;"><span style="color:#4b5563;font-weight:600;">${escapeHtml(labels.finalScore)}:</span><strong style="font-size:11pt;">${calc?.finalScore?.toFixed(2) ?? "0.00"}/100</strong></div>
              <div style="font-size:8pt;font-weight:700;margin-top:1.5mm;color:${isQualified ? '#15803d' : '#dc2626'};">${isQualified ? "✓" : "✗"} ${escapeHtml(isQualified ? labels.qualified : labels.notQualified)}</div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;

  // ── Assemble the single unified evaluation table ───────────────────────
  // Calculate dynamic column widths to ensure all bidders fit on the page
  // A4 landscape: 297mm - 20mm @page margins - 16mm .pdf-page padding = 261mm ≈ 987px at 96dpi
  const pageUsableWidth = 980;
  const minFixedWidth = 300; // minimum for requirement + maxScore + details
  const minBidderColWidth = 90;
  const dynamicBidderColWidth = Math.max(minBidderColWidth, Math.floor((pageUsableWidth - minFixedWidth) / numBidders));
  const dynamicFixedWidth = pageUsableWidth - (dynamicBidderColWidth * numBidders);
  const reqColWidth = Math.floor(dynamicFixedWidth * 0.35);
  const maxScoreColWidth = Math.floor(dynamicFixedWidth * 0.15);
  const detailsColWidth = dynamicFixedWidth - reqColWidth - maxScoreColWidth;
  const dynamicTableWidth = dynamicFixedWidth + (dynamicBidderColWidth * numBidders);

  const unifiedTableHtml = `
    <div style="overflow-x:visible;">
      <table style="width:100%;table-layout:fixed;">
        <colgroup>
          <col style="width:${reqColWidth}px" />
          <col style="width:${maxScoreColWidth}px" />
          <col style="width:${detailsColWidth}px" />
          ${activeBidders.map(() => `<col style="width:${dynamicBidderColWidth}px" />`).join("")}
        </colgroup>
        <thead>
          <tr>
            <th style="text-align:${isRTL ? 'right' : 'left'};font-size:9pt;">${escapeHtml(labels.requirement)}</th>
            <th style="text-align:center;font-size:9pt;">${escapeHtml(labels.maxScore)}</th>
            <th style="text-align:${isRTL ? 'right' : 'left'};font-size:9pt;">${escapeHtml(labels.details)}</th>
            ${bidderHeaders}
          </tr>
        </thead>
        <tbody>
          ${tableBodyHtml}
        </tbody>
      </table>
    </div>
  `;

  // ── Build Remarks Section ──────────────────────────────────────────────
  const notQualifiedBidders = calculatedScores.filter(c => c.status !== "Qualified");
  const rtlAlign = isRTL ? 'text-align:right;' : 'text-align:left;';
  let remarksHtml = "";
  if (notQualifiedBidders.length > 0) {
    remarksHtml = `
      <div class="avoid-break" style="margin-top:6mm;direction:${dir};${rtlAlign}">
        <h3 style="font-size:12pt;font-weight:900;color:#1e3a8a;margin-bottom:2mm;border-bottom:2px solid #93c5fd;padding-bottom:1.5mm;${rtlAlign}">${escapeHtml(labels.remarks)}</h3>
        <p style="font-size:8.5pt;color:#4b5563;margin-bottom:3mm;${rtlAlign}">${escapeHtml(labels.remarksDescription)}</p>
        ${notQualifiedBidders.map(bidder => {
          const bidderData = activeBidders.find(b => b.id === bidder.bidderId);
          const bidderScoreMap = new Map<number, number>();
          scores
            .filter(s => s.bidderId === bidder.bidderId)
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
          return `
            <div style="border:1.5px solid #fca5a5;border-radius:4px;padding:3mm;margin-bottom:3mm;background:#fef2f2;direction:${dir};${rtlAlign}">
              <div style="font-weight:700;font-size:9.5pt;color:#991b1b;margin-bottom:2mm;${rtlAlign}">\u2717 ${escapeHtml(bidder.bidderName)} <span style="font-size:8pt;font-weight:400;color:#dc2626;">(${escapeHtml(labels.notQualified)})</span></div>
              <ul style="margin:0;padding-${isRTL ? 'right' : 'left'}:5mm;font-size:8.5pt;color:#7f1d1d;${rtlAlign}">
                ${reasons.map(r => `<li style="margin-bottom:1mm;">${escapeHtml(translateReason(r))}</li>`).join("")}
                ${reasons.length === 0 ? `<li style="color:#6b7280;">${escapeHtml(labels.notQualified)}</li>` : ""}
              </ul>
            </div>
          `;
        }).join("")}
      </div>
    `;
  } else {
    remarksHtml = `
      <div class="avoid-break" style="margin-top:6mm;direction:${dir};${rtlAlign}">
        <h3 style="font-size:12pt;font-weight:900;color:#1e3a8a;margin-bottom:2mm;border-bottom:2px solid #93c5fd;padding-bottom:1.5mm;${rtlAlign}">${escapeHtml(labels.remarks)}</h3>
        <p style="font-size:9pt;color:#15803d;${rtlAlign}">\u2713 ${escapeHtml(labels.noRemarksAllQualified)}</p>
      </div>
    `;
  }

  // ── Assemble full body ──────────────────────────────────────────────────
  const bodyHtml = `
    ${summaryCardsHtml}
    ${unifiedTableHtml}
    ${grandTotalHtml}
    <div style="margin-top:4mm;font-size:8pt;color:#4b5563;">
      <span style="color:#dc2626;">*</span> = ${escapeHtml(labels.mandatoryNote)}
    </div>
    ${remarksHtml}
  `;

  // ── Build full HTML using official wrapper pattern ──────────────────────
  const orgName = isRTL
    ? ((org as any)?.nameAr || org?.name || "المنظمة")
    : (org?.name || "Organization");
  const operatingUnitDisplay = isRTL ? (ouNameAr || ouName) : (ouName || ouNameAr);
  const logoUrl = branding?.logoUrl || "";
  const dateText = new Date().toLocaleDateString(language === "ar" ? "ar-SA" : "en-US");

  const fullHtml = `
<!doctype html>
<html dir="${dir}" lang="${language}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(labels.documentTitle)}</title>
  <style>${css}</style>
  <style>
    /* Override for landscape with dynamic width */
    @page {
      size: A4 landscape;
      margin: 8mm 10mm;
    }
    body {
      font-size: 9.5pt;
      line-height: 1.35;
    }
    .pdf-page {
      padding: 0 8mm;
    }
    .pdf-content {
      margin-top: 4mm;
    }
    /* Ensure tables don't break mid-row */
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    thead { display: table-header-group; }
    /* Summary cards flex */
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    /* RTL-specific overrides (flexbox auto-mirrors via official-pdf.css) */
    html[dir="rtl"] th {
      text-align: right;
    }
    html[dir="rtl"] th[style*="text-align:center"] {
      text-align: center !important;
    }
  </style>
</head>
<body>
  <div class="pdf-page">
    <div class="official-header">
      <div class="header-left">
        <div class="org-block">
          <div class="org-name">${escapeHtml(orgName)}</div>
          ${operatingUnitDisplay ? `<div class="ou-name">${escapeHtml(operatingUnitDisplay)}</div>` : ""}
          <div class="module-name">${escapeHtml(labels.department)}</div>
        </div>
      </div>
      <div class="header-center">
        <div class="doc-title" style="font-size:14pt;">${escapeHtml(labels.documentTitle)}</div>
      </div>
      <div class="header-right">
        ${logoUrl ? `<img class="org-logo" src="${escapeHtml(logoUrl)}" alt="Logo" />` : ""}
        <div class="ref-date">
          <div class="value ltr-safe">${escapeHtml(prNumber || "")}</div>
          <div class="value ltr-safe">${escapeHtml(dateText)}</div>
        </div>
      </div>
    </div>
    <hr class="hr-strong" />
    <div class="pdf-content">
      <div style="margin-bottom:3mm;font-size:9pt;color:#4b5563;${isRTL ? 'text-align:right;' : ''}">
        ${escapeHtml(labels.officialRecordFor)} <strong class="ltr-safe">${escapeHtml(prNumber)}</strong> | ${escapeHtml(labels.technical)} (50) + ${escapeHtml(labels.financial)} (50) = 100
      </div>
      ${bodyHtml}
    </div>
  </div>
</body>
</html>
`.trim();

  // ── Generate PDF with Puppeteer ─────────────────────────────────────────
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  try {
    const page = await browser.newPage();

    // Set viewport wide enough for all bidder columns
    const viewportWidth = Math.max(1400, pageUsableWidth + 200);
    await page.setViewport({ width: viewportWidth, height: 1200 });

    await page.setContent(fullHtml, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    const pdf = await page.pdf({
      landscape: true,
      format: "A4",
      margin: {
        top: "8mm",
        bottom: "12mm",
        left: "10mm",
        right: "10mm",
      },
      printBackground: true,
      preferCSSPageSize: false,
    });

    return pdf;
  } finally {
    await browser.close();
  }
}
