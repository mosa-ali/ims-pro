/**
 * Competitive Bid Analysis (CBA) PDF Generator - Centralized
 * 
 * Uses OfficialPdfEngine for consistent styling and centralized PDF generation.
 * A4 landscape, full RTL/LTR support.
 * Includes digital signatures and QR verification codes.
 */

import { getDb } from "../../../../db";
import {
  bidAnalyses,
  bidAnalysisBidders,
  bidEvaluationCriteria,
  bidEvaluationScores,
  cbaApprovalSignatures,
  purchaseRequests,
  budgetLines,
} from "drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";
import {
  buildScoringConfig,
  computeBidderScores,
  type CriterionConfig,
} from "../../../../services/bidEvaluationScoringService";
import {
  buildOfficialPdfContext,
} from "../../buildOfficialPdfContext";

import type {
  OfficialPdfContext,
} from "../../buildOfficialPdfContext";
import {
  generateOfficialPdf,
} from '../../OfficialPdfEngine';
import type { OfficialPdfOptions } from '../../OfficialPdfEngine';

export type PdfLang = "en" | "ar";

const t = {
  en: {
    documentTitle: "COMPETITIVE BID ANALYSIS (CBA)",
    prReference: "PR Reference",
    date: "Date",
    budgetAmount: "Budget Amount",
    itemDescription: "Item Description",
    country: "Country",
    tenderRfqNumber: "Tender / RFQ Number",
    budgetLine: "Budget Line",
    technicalEvaluation: "Technical Evaluation (50 Points)",
    financialEvaluation: "Financial Evaluation (50 Points)",
    combinedScore: "Combined Score (100 Points)",
    supplier: "Supplier",
    section: "Section",
    maxScore: "Max Score",
    totalTechnical: "Total Technical",
    offeredPrice: "Offered Price",
    financialScore: "Financial Score",
    lowestBid: "Lowest Bid Amount",
    rank: "Rank",
    technical: "Technical",
    financial: "Financial",
    total: "Total (100)",
    status: "Status",
    qualified: "Qualified",
    notQualified: "Not Qualified",
    disqualified: "Disqualified",
    threshold: "Technical Threshold: 70% — Only applicants reaching ≥70% of max technical score are eligible",
    decisionJustification: "Decision & Justification",
    selectedSupplier: "Selected Supplier",
    justification: "Justification",
    approvalSignatures: "Approval & Signatures",
    role: "Role",
    name: "Name",
    signature: "Signature",
    signedOn: "Signed on",
    verificationCode: "Verification",
    page: "Page",
    of: "of",
    generatedOn: "Generated on",
    operatingUnit: "Operating Unit",
    department: "Logistics & Procurement",
    notApplicable: "N/A",
    formulaNote: "Financial Score = (Lowest Bid / Offered Price) × 50",
    availableBalance: "Available Balance",
    totalOfferPrice: "Total Offer Price",
  },
  ar: {
    documentTitle: "تحليل العطاءات التنافسية (CBA)",
    prReference: "مرجع طلب الشراء",
    date: "التاريخ",
    budgetAmount: "مبلغ الميزانية",
    itemDescription: "وصف الصنف",
    country: "الدولة",
    tenderRfqNumber: "رقم العطاء / RFQ",
    budgetLine: "بند الميزانية",
    technicalEvaluation: "التقييم الفني (50 نقطة)",
    financialEvaluation: "التقييم المالي (50 نقطة)",
    combinedScore: "الدرجة المجمعة (100 نقطة)",
    supplier: "المورد",
    section: "القسم",
    maxScore: "الدرجة القصوى",
    totalTechnical: "إجمالي الفني",
    offeredPrice: "السعر المعروض",
    financialScore: "الدرجة المالية",
    lowestBid: "أقل مبلغ عطاء",
    rank: "الترتيب",
    technical: "فني",
    financial: "مالي",
    total: "الإجمالي (100)",
    status: "الحالة",
    qualified: "مؤهل",
    notQualified: "غير مؤهل",
    disqualified: "مستبعد",
    threshold: "الحد الأدنى الفني: 70٪ — فقط المتقدمون الذين يحققون ≥70٪ من الدرجة الفنية القصوى مؤهلون",
    decisionJustification: "القرار والتبرير",
    selectedSupplier: "المورد المختار",
    justification: "التبرير",
    approvalSignatures: "الموافقة والتوقيعات",
    role: "الدور",
    name: "الاسم",
    signature: "التوقيع",
    signedOn: "تم التوقيع في",
    verificationCode: "التحقق",
    page: "صفحة",
    of: "من",
    generatedOn: "تم الإنشاء في",
    operatingUnit: "وحدة التشغيل",
    department: "الخدمات اللوجستية والمشتريات",
    notApplicable: "غ/م",
    formulaNote: "الدرجة المالية = (أقل عطاء / السعر المعروض) × 50",
    availableBalance: "الرصيد المتاح",
    totalOfferPrice: "إجمالي السعر المعروض",
  },
};

function escapeHtml(s: string | undefined | null): string {
  if (s == null) return "";
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function generateCBAPDF(
  bidAnalysisId: number,
  organizationId: number,
  operatingUnitId: string,
  userId: string,
  language: PdfLang = "en"
): Promise<Buffer> {
  const db = await getDb();
  const isRTL = language === "ar";
  const l = t[language];

  console.log(`[CBA PDF] Generating CBA PDF for bidAnalysisId=${bidAnalysisId}, language=${language}`);

  // ── Fetch data ──────────────────────────────────────────────────────────
  const ba = await db.query.bidAnalyses.findFirst({
    where: and(
      eq(bidAnalyses.id, bidAnalysisId),
      eq(bidAnalyses.organizationId, organizationId),
      isNull(bidAnalyses.deletedAt)
    ),
  });

  if (!ba) {
    throw new Error("Bid Analysis not found");
  }

  console.log(`[CBA PDF] Fetched bid analysis: ${ba.announcementReference}`);

  // ✅ Build official context
  const officialContext = await buildOfficialPdfContext({
    db,
    organizationId: Number(ba.organizationId || 0),
    operatingUnitId: Number(ba.operatingUnitId || 0),
    userId: Number(userId || 0),
    language: language as 'en' | 'ar',
    documentType: 'cba',
    documentId: bidAnalysisId,
    documentModule: 'Logistics',
  });

  const bidders = await db.query.bidAnalysisBidders.findMany({
    where: eq(bidAnalysisBidders.bidAnalysisId, bidAnalysisId),
  });
  const activeBidders = bidders.filter(b => b.submissionStatus !== "disqualified");

  const criteria = await db.query.bidEvaluationCriteria.findMany({
    where: eq(bidEvaluationCriteria.bidAnalysisId, bidAnalysisId),
  });

  const scores = await db.query.bidEvaluationScores.findMany({
    where: eq(bidEvaluationScores.bidAnalysisId, bidAnalysisId),
  });

  const signatures = await db.query.cbaApprovalSignatures.findMany({
    where: and(
      eq(cbaApprovalSignatures.bidAnalysisId, bidAnalysisId),
      eq(cbaApprovalSignatures.organizationId, organizationId)
    ),
  });

  // Score map
  const scoreMap: Record<string, number> = {};
  scores.forEach(s => {
    scoreMap[`${s.criterionId}-${s.bidderId}`] = parseFloat(s.score || "0");
  });

  // ── Calculate scores ──────────────────────────────────────────────────
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
  let prCurrency = "USD";
  let prDescription = "";
  let prTotalBudgetLine: number | undefined;
  let budgetLineName = "";
  let budgetLineAvailable: number | undefined;
  
  if (ba.purchaseRequestId) {
    const pr = await db.query.purchaseRequests.findFirst({
      where: eq(purchaseRequests.id, ba.purchaseRequestId),
    });
    
    if (pr) {
      if (pr.prTotalUsd) prTotalUsd = Number(pr.prTotalUsd);
      if (pr.totalBudgetLine) prTotalBudgetLine = Number(pr.totalBudgetLine);
      prNumber = pr.prNumber || "";
      prCurrency = pr.currency || "USD";
      prDescription = pr.projectTitle || "";
      
      // Fetch budget line details
      if (pr.budgetLineId) {
        const bl = await db.query.budgetLines.findFirst({
          where: eq(budgetLines.id, pr.budgetLineId),
        });
        
        if (bl) {
          budgetLineName = bl.description || "";
          if (bl.availableBalance) budgetLineAvailable = Number(bl.availableBalance);
        }
      }
      
      // Fallback to PR budgetTitle if no budget line record found
      if (!budgetLineName && pr.budgetTitle) {
        budgetLineName = pr.budgetTitle;
      }
      if (budgetLineAvailable === undefined && pr.totalBudgetLine) {
        budgetLineAvailable = Number(pr.totalBudgetLine);
      }
    }
  }

  interface BidderCalc {
    bidderId: number;
    bidderName: string;
    technicalScore: number;
    financialScore: number;
    finalScore: number;
    isQualified: boolean;
    totalBidAmount: number;
    currency: string;
    rank: number;
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
      isQualified: result.isQualified,
      totalBidAmount: Number(bidder.totalBidAmount || 0),
      currency: bidder.currency || prCurrency,
      rank: 0,
    };
  });

  // Sort and rank
  calculatedScores.sort((a, b) => b.finalScore - a.finalScore);
  calculatedScores.forEach((b, i) => { b.rank = i + 1; });

  // ── Group criteria by section ─────────────────────────────────────────
  const groupedSections: Record<number, {
    sectionNumber: number;
    sectionName: string;
    sectionNameAr: string;
    maxScore: number;
    criteria: typeof criteria;
  }> = {};

  criteria.forEach(c => {
    const sn = c.sectionNumber || 1;
    if (!groupedSections[sn]) {
      groupedSections[sn] = {
        sectionNumber: sn,
        sectionName: c.sectionName || `Section ${sn}`,
        sectionNameAr: (c as any).sectionNameAr || c.sectionName || `القسم ${sn}`,
        maxScore: 0,
        criteria: [],
      };
    }
    groupedSections[sn].maxScore += Number(c.maxScore || 0);
    groupedSections[sn].criteria.push(c);
  });

  const sections = Object.values(groupedSections).sort((a, b) => a.sectionNumber - b.sectionNumber);

  const budgetAmountDisplay = prTotalBudgetLine !== undefined
    ? `${prCurrency} ${prTotalBudgetLine.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : (prTotalUsd !== undefined ? `USD ${prTotalUsd.toFixed(2)}` : "0.00");

  const availableBalanceDisplay = budgetLineAvailable !== undefined
    ? `${prCurrency} ${budgetLineAvailable.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "";

  // Build a compact details table
  const headerInfoHtml = `
    <table class="details-table" style="width:100%;margin-bottom:3mm;font-size:9pt;border:1px solid #d1d5db;">
      <tbody>
        <tr>
          <td style="width:15%;font-weight:800;background:#f3f4f6;padding:2mm 3mm;border:1px solid #d1d5db;">${escapeHtml(l.date)}</td>
          <td style="width:35%;padding:2mm 3mm;border:1px solid #d1d5db;" class="ltr-safe">${escapeHtml(new Date().toLocaleDateString(language === "ar" ? "ar-SA" : "en-US"))}</td>
          <td style="width:15%;font-weight:800;background:#f3f4f6;padding:2mm 3mm;border:1px solid #d1d5db;">${escapeHtml(l.budgetAmount)}</td>
          <td style="width:35%;padding:2mm 3mm;border:1px solid #d1d5db;" class="ltr-safe">${escapeHtml(budgetAmountDisplay)}</td>
        </tr>
        <tr>
          <td style="font-weight:800;background:#f3f4f6;padding:2mm 3mm;border:1px solid #d1d5db;">${escapeHtml(l.itemDescription)}</td>
          <td style="padding:2mm 3mm;border:1px solid #d1d5db;">${escapeHtml(prDescription)}</td>
          <td style="font-weight:800;background:#f3f4f6;padding:2mm 3mm;border:1px solid #d1d5db;">${escapeHtml(l.tenderRfqNumber)}</td>
          <td style="padding:2mm 3mm;border:1px solid #d1d5db;" class="ltr-safe">${escapeHtml(ba.announcementReference || "")}</td>
        </tr>
        <tr>
          <td style="font-weight:800;background:#f3f4f6;padding:2mm 3mm;border:1px solid #d1d5db;">${escapeHtml(l.budgetLine)}</td>
          <td style="padding:2mm 3mm;border:1px solid #d1d5db;">${escapeHtml(budgetLineName || l.notApplicable)}</td>
          <td style="font-weight:800;background:#f3f4f6;padding:2mm 3mm;border:1px solid #d1d5db;">${escapeHtml(l.availableBalance)}</td>
          <td style="padding:2mm 3mm;border:1px solid #d1d5db;" class="ltr-safe">${escapeHtml(availableBalanceDisplay || l.notApplicable)}</td>
        </tr>
      </tbody>
    </table>
  `;

  // ── Technical Evaluation Table ────────────────────────────────────────
  const techHeaderCols = sections.map(s => {
    const name = isRTL ? s.sectionNameAr : s.sectionName;
    return `<th style="text-align:center;font-size:7.5pt;padding:1.5mm 1mm;min-width:50px;">${escapeHtml(name)}<br/><span style="font-size:6.5pt;color:#6b7280;">(${s.maxScore})</span></th>`;
  }).join("");

  const techRows = calculatedScores.map(bidder => {
    const sectionCells = sections.map(section => {
      let sectionTotal = 0;
      section.criteria.forEach(c => {
        const key = `${c.id}-${bidder.bidderId}`;
        sectionTotal += scoreMap[key] || 0;
      });
      return `<td style="text-align:center;font-size:8.5pt;padding:1.5mm;">${sectionTotal.toFixed(2)}</td>`;
    }).join("");

    return `
      <tr>
        <td style="font-weight:600;font-size:8.5pt;padding:1.5mm 2mm;">${escapeHtml(bidder.bidderName)}</td>
        ${sectionCells}
        <td style="text-align:center;font-size:8.5pt;padding:1.5mm;">0.00</td>
        <td style="text-align:center;font-weight:700;font-size:8.5pt;padding:1.5mm;">50</td>
        <td style="text-align:center;font-weight:900;font-size:9pt;padding:1.5mm;color:${bidder.isQualified ? '#15803d' : '#dc2626'};">${bidder.technicalScore.toFixed(2)}</td>
      </tr>
    `;
  }).join("");

  const technicalHtml = `
    <div style="margin-bottom:3mm;">
      <div style="background:#0d9488;color:white;padding:2mm 4mm;border-radius:3px 3px 0 0;font-weight:800;font-size:10pt;">${escapeHtml(l.technicalEvaluation)}</div>
      <div style="font-size:7.5pt;color:#4b5563;background:#fef9c3;padding:1.5mm 4mm;border:1px solid #fde68a;border-top:none;">${escapeHtml(l.threshold)}</div>
      <table style="width:100%;margin-top:0;">
        <thead>
          <tr>
            <th style="text-align:${isRTL ? 'right' : 'left'};font-size:8pt;padding:1.5mm 2mm;">${escapeHtml(l.supplier)}</th>
            ${techHeaderCols}
            <th style="text-align:center;font-size:7.5pt;padding:1.5mm;">${escapeHtml(l.totalOfferPrice)}<br/><span style="font-size:6.5pt;color:#6b7280;"></span></th>
            <th style="text-align:center;font-size:7.5pt;padding:1.5mm;">${escapeHtml(l.maxScore)}<br/><span style="font-size:6.5pt;color:#6b7280;">(50)</span></th>
            <th style="text-align:center;font-size:8pt;padding:1.5mm;">${escapeHtml(l.totalTechnical)}</th>
          </tr>
        </thead>
        <tbody>${techRows}</tbody>
      </table>
    </div>
  `;

  // ── Financial Evaluation Table ────────────────────────────────────────
  const financialRows = calculatedScores.map(bidder => {
    const priceDisplay = bidder.totalBidAmount > 0
      ? `${bidder.currency} ${bidder.totalBidAmount.toFixed(2)}`
      : l.notApplicable;
    const scoreDisplay = bidder.isQualified
      ? bidder.financialScore.toFixed(2)
      : l.notApplicable;
    return `
      <tr>
        <td style="font-weight:600;font-size:8.5pt;padding:1.5mm 2mm;">${escapeHtml(bidder.bidderName)}</td>
        <td style="text-align:${isRTL ? 'left' : 'right'};font-size:8.5pt;padding:1.5mm 2mm;" class="ltr-safe">${escapeHtml(priceDisplay)}</td>
        <td style="text-align:center;font-weight:700;font-size:9pt;padding:1.5mm;">${escapeHtml(scoreDisplay)}</td>
      </tr>
    `;
  }).join("");

  const financialHtml = `
    <div style="margin-bottom:3mm;">
      <div style="background:#0d9488;color:white;padding:2mm 4mm;border-radius:3px 3px 0 0;font-weight:800;font-size:10pt;">${escapeHtml(l.financialEvaluation)}</div>
      <div style="font-size:7.5pt;color:#4b5563;padding:1.5mm 4mm;border:1px solid #e5e7eb;border-top:none;background:#f9fafb;">${escapeHtml(l.formulaNote)}</div>
      <table style="width:100%;margin-top:0;">
        <thead>
          <tr>
            <th style="text-align:${isRTL ? 'right' : 'left'};font-size:8pt;padding:1.5mm 2mm;">${escapeHtml(l.supplier)}</th>
            <th style="text-align:${isRTL ? 'left' : 'right'};font-size:8pt;padding:1.5mm 2mm;">${escapeHtml(l.offeredPrice)}</th>
            <th style="text-align:center;font-size:8pt;padding:1.5mm;">${escapeHtml(l.financialScore)}</th>
          </tr>
        </thead>
        <tbody>${financialRows}</tbody>
      </table>
      <div style="margin-top:1.5mm;padding:1.5mm 4mm;background:#f3f4f6;border-radius:3px;font-size:8.5pt;">
        <strong>${escapeHtml(l.lowestBid)}:</strong> <span class="ltr-safe">${lowestPrice.toFixed(2)}</span>
      </div>
    </div>
  `;

  // ── Combined Score Table ──────────────────────────────────────────────
  const combinedRows = calculatedScores.map(bidder => {
    const statusText = bidder.isQualified ? l.qualified : l.notQualified;
    const statusColor = bidder.isQualified ? "#15803d" : "#dc2626";
    const statusIcon = bidder.isQualified ? "✓" : "✗";
    return `
      <tr${bidder.rank === 1 ? ' style="background:#f0fdf4;"' : ''}>
        <td style="text-align:center;font-weight:700;font-size:9pt;padding:1.5mm;">
          ${bidder.rank === 1 ? '🏆 ' : ''}#${bidder.rank}
        </td>
        <td style="font-weight:600;font-size:8.5pt;padding:1.5mm 2mm;">${escapeHtml(bidder.bidderName)}</td>
        <td style="text-align:center;font-size:8.5pt;padding:1.5mm;">${bidder.technicalScore.toFixed(2)}</td>
        <td style="text-align:center;font-size:8.5pt;padding:1.5mm;">${bidder.isQualified ? bidder.financialScore.toFixed(2) : l.notApplicable}</td>
        <td style="text-align:center;font-weight:900;font-size:10pt;padding:1.5mm;">${bidder.isQualified ? bidder.finalScore.toFixed(2) : l.disqualified}</td>
        <td style="text-align:center;font-weight:700;color:${statusColor};font-size:8.5pt;padding:1.5mm;">${statusIcon} ${escapeHtml(statusText)}</td>
      </tr>
    `;
  }).join("");

  const combinedHtml = `
    <div style="margin-bottom:3mm;">
      <div style="background:#0d9488;color:white;padding:2mm 4mm;border-radius:3px 3px 0 0;font-weight:800;font-size:10pt;">${escapeHtml(l.combinedScore)}</div>
      <table style="width:100%;margin-top:0;">
        <thead>
          <tr>
            <th style="text-align:center;font-size:8pt;padding:1.5mm;">${escapeHtml(l.rank)}</th>
            <th style="text-align:${isRTL ? 'right' : 'left'};font-size:8pt;padding:1.5mm 2mm;">${escapeHtml(l.supplier)}</th>
            <th style="text-align:center;font-size:8pt;padding:1.5mm;">${escapeHtml(l.technical)} (50)</th>
            <th style="text-align:center;font-size:8pt;padding:1.5mm;">${escapeHtml(l.financial)} (50)</th>
            <th style="text-align:center;font-size:8pt;padding:1.5mm;">${escapeHtml(l.total)}</th>
            <th style="text-align:center;font-size:8pt;padding:1.5mm;">${escapeHtml(l.status)}</th>
          </tr>
        </thead>
        <tbody>${combinedRows}</tbody>
      </table>
    </div>
  `;

  // ── Decision & Justification ──────────────────────────────────────────
  const winner = calculatedScores.find(b => b.bidderId === ba.selectedBidderId) || calculatedScores[0];
  const justificationHtml = `
    <div class="avoid-break" style="margin-bottom:3mm;">
      <h3 style="font-size:10pt;font-weight:900;margin:2mm 0 1.5mm 0;${isRTL ? 'text-align:right;' : ''}">${escapeHtml(l.decisionJustification)}</h3>
      <div style="padding:2mm 4mm;background:#f0fdf4;border:1px solid #86efac;border-radius:3px;margin-bottom:2mm;">
        <div style="font-size:8pt;color:#4b5563;">${escapeHtml(l.selectedSupplier)}:</div>
        <div style="font-size:11pt;font-weight:900;color:#15803d;">${escapeHtml(winner?.bidderName || "")}</div>
      </div>
      ${ba.selectionJustification ? `
        <div style="padding:2mm 4mm;background:#f8fafc;border:1px solid #e2e8f0;border-radius:3px;">
          <div style="font-size:8pt;color:#4b5563;margin-bottom:1mm;">${escapeHtml(l.justification)}:</div>
          <div style="font-size:9pt;line-height:1.4;">${escapeHtml(ba.selectionJustification)}</div>
        </div>
      ` : ''}
    </div>
  `;

  // ── Approval Signatures ───────────────────────────────────────────────
  let signaturesHtml = "";
  if (signatures.length > 0) {
    const sigRows = signatures.map(sig => {
      const roleDisplay = sig.role || "";
      const signatureCell = sig.signatureDataUrl
        ? `<img src="${sig.signatureDataUrl}" style="max-width:150px;max-height:50px;display:block;margin:0 auto;" />`
        : '<div style="border-bottom:1px solid #6b7280;height:8mm;margin:1mm 0;"></div>';
      const dateCell = sig.signedAt
        ? new Date(sig.signedAt).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US")
        : "";
      const qrCell = sig.qrCodeDataUrl
        ? `<img src="${sig.qrCodeDataUrl}" style="width:40px;height:40px;display:block;margin:0 auto;" />`
        : "";

      return `
        <tr>
          <td style="font-weight:600;font-size:8.5pt;vertical-align:middle;padding:1.5mm 2mm;">${escapeHtml(roleDisplay)}</td>
          <td style="font-size:8.5pt;vertical-align:middle;padding:1.5mm 2mm;">${escapeHtml(sig.memberName || "")}</td>
          <td style="text-align:center;vertical-align:middle;padding:1.5mm;">${signatureCell}</td>
          <td style="text-align:center;font-size:8pt;vertical-align:middle;padding:1.5mm;" class="ltr-safe">${escapeHtml(dateCell)}</td>
          <td style="text-align:center;vertical-align:middle;padding:1.5mm;">${qrCell}</td>
        </tr>
      `;
    }).join("");

    signaturesHtml = `
      <div class="avoid-break" style="margin-top:3mm;">
        <h3 style="font-size:10pt;font-weight:900;margin:2mm 0 1.5mm 0;${isRTL ? 'text-align:right;' : ''}">${escapeHtml(l.approvalSignatures)}</h3>
        <table style="width:100%;">
          <thead>
            <tr>
              <th style="text-align:${isRTL ? 'right' : 'left'};font-size:8pt;width:15%;padding:1.5mm 2mm;">${escapeHtml(l.role)}</th>
              <th style="text-align:${isRTL ? 'right' : 'left'};font-size:8pt;width:20%;padding:1.5mm 2mm;">${escapeHtml(l.name)}</th>
              <th style="text-align:center;font-size:8pt;width:30%;padding:1.5mm;">${escapeHtml(l.signature)}</th>
              <th style="text-align:center;font-size:8pt;width:15%;padding:1.5mm;">${escapeHtml(l.date)}</th>
              <th style="text-align:center;font-size:8pt;width:20%;padding:1.5mm;">${escapeHtml(l.verificationCode)}</th>
            </tr>
          </thead>
          <tbody>${sigRows}</tbody>
        </table>
      </div>
    `;
  } else {
    // Default 3 empty signature rows with proper role names
    const defaultRoles = isRTL
      ? ["رئيس اللجنة", "مسؤول المشتريات", "المسؤول المالي"]
      : ["Committee Chair", "Procurement Officer", "Finance Officer"];
    const emptyRows = defaultRoles.map(role => `
      <tr>
        <td style="font-weight:600;font-size:8.5pt;padding:1.5mm 2mm;">${escapeHtml(role)}</td>
        <td style="padding:1.5mm 2mm;"><div style="border-bottom:1px solid #d1d5db;height:6mm;"></div></td>
        <td style="padding:1.5mm;"><div style="border-bottom:1px solid #d1d5db;height:6mm;"></div></td>
        <td style="padding:1.5mm;"><div style="border-bottom:1px solid #d1d5db;height:6mm;"></div></td>
        <td style="padding:1.5mm;"></td>
      </tr>
    `).join("");

    signaturesHtml = `
      <div class="avoid-break" style="margin-top:3mm;">
        <h3 style="font-size:10pt;font-weight:900;margin:2mm 0 1.5mm 0;${isRTL ? 'text-align:right;' : ''}">${escapeHtml(l.approvalSignatures)}</h3>
        <table style="width:100%;">
          <thead>
            <tr>
              <th style="text-align:${isRTL ? 'right' : 'left'};font-size:8pt;width:15%;padding:1.5mm 2mm;">${escapeHtml(l.role)}</th>
              <th style="text-align:${isRTL ? 'right' : 'left'};font-size:8pt;width:20%;padding:1.5mm 2mm;">${escapeHtml(l.name)}</th>
              <th style="text-align:center;font-size:8pt;width:30%;padding:1.5mm;">${escapeHtml(l.signature)}</th>
              <th style="text-align:center;font-size:8pt;width:15%;padding:1.5mm;">${escapeHtml(l.date)}</th>
              <th style="text-align:center;font-size:8pt;width:20%;padding:1.5mm;">${escapeHtml(l.verificationCode)}</th>
            </tr>
          </thead>
          <tbody>${emptyRows}</tbody>
        </table>
      </div>
    `;
  }

  // ── Assemble body ────────────────────────────────────────────────────
  const bodyHtml = `
    ${headerInfoHtml}
    ${technicalHtml}
    ${financialHtml}
    ${combinedHtml}
    ${justificationHtml}
    ${signaturesHtml}
  `;

  // ✅ Use OfficialPdfEngine for PDF generation
  console.log(`[CBA PDF] Generating PDF using OfficialPdfEngine`);
  
  const pdfBuffer = await generateOfficialPdf({
    context: officialContext,
    department: 'Logistics & Procurement',
    documentTitle: l.documentTitle,
    formNumber: ba.announcementReference || `CBA-${ba.id}`,
    formDate: new Date().toISOString().split('T')[0],
    bodyHtml,
  });

  console.log(`[CBA PDF] CBA PDF generated successfully`);
  
  return pdfBuffer;
}
