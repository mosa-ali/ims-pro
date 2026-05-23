/**
 * ============================================================================
 * COMPETITIVE BID ANALYSIS (CBA) PDF GENERATOR - COMPLETE VERSION
 * ============================================================================
 * 
 * COMPLETE: Includes ALL sections from the form:
 * ✅ Document Details
 * ✅ Technical Evaluation (50 Points) with all criteria
 * ✅ Financial Evaluation (50 Points) with pricing
 * ✅ Combined Score (100 Points)
 * ✅ Decision & Justification
 * ✅ Approval & Signatures
 * 
 * Uses OfficialPdfEngine for consistent styling and centralized PDF generation.
 * A4 LANDSCAPE, full RTL/LTR support.
 * Includes digital signatures and QR verification codes.
 */

import {
  generateOfficialPdf,
} from '../../OfficialPdfEngine';
import type { OfficialPdfOptions } from '../../OfficialPdfEngine';
import type { OfficialPdfContext } from '../../buildOfficialPdfContext';

export type PdfLang = "en" | "ar";

// ============================================================================
// INTERFACE: CBA PDF Data (passed from wrapper)
// ============================================================================

export interface CompetitiveBidAnalysisPDFData {
  // ✅ Pre-built context from wrapper
  context: OfficialPdfContext;
  department?: string;

  // CBA Details
  cbaNumber: string;
  prNumber?: string;
  tenderDate: string;
  budgetAmount?: number;
  itemDescription?: string;
  currency?: string;

  // Bidders with scores
  bidders: Array<{
    rank: number;
    supplierName: string;
    technicalScore: number;
    financialScore: number;
    totalScore: number;
    status: 'qualified' | 'not_qualified' | 'disqualified';
    offeredPrice?: number;
  }>;

  // Evaluation criteria (for Technical Evaluation section)
  criteria?: Array<{
    section: string;
    name: string;
    maxScore: number;
    scores?: Array<{
      bidderId: number;
      score: number;
    }>;
  }>;

  // Decision & Justification
  selectedSupplierId?: number;
  selectedSupplierName?: string;
  justification?: string;
  lowestBidAmount?: number;

  // Signatures
  signatures?: Array<{
    memberName: string;
    role: string;
    roleAr?: string;
    signatureDataUrl?: string;
    signedAt?: string;
    verificationCode?: string;
  }>;

  // Language & Direction
  language: 'en' | 'ar';
}

// ============================================================================
// LABELS
// ============================================================================

const t = {
  en: {
    documentTitle: "COMPETITIVE BID ANALYSIS (CBA)",
    prReference: "PR Reference",
    date: "Date",
    budgetAmount: "Budget Amount",
    itemDescription: "Item Description",
    tenderRfqNumber: "Tender / RFQ Number",
    currency: "Currency",
    technicalEvaluation: "Technical Evaluation (50 Points)",
    financialEvaluation: "Financial Evaluation (50 Points)",
    combinedScore: "Combined Score (100 Points)",
    supplier: "Supplier",
    section: "Section",
    criterion: "Criterion",
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
    threshold: "Technical Threshold: 70% — Only applicants reaching ≥70% of max technical score are eligible for financial evaluation",
    decisionJustification: "Decision & Justification",
    selectedSupplier: "Selected Supplier",
    justification: "Justification (MANDATORY if not lowest bidder)",
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
    bidders: "Bidders / Applicants",
  },
  ar: {
    documentTitle: "تحليل العطاءات التنافسية (CBA)",
    prReference: "مرجع طلب الشراء",
    date: "التاريخ",
    budgetAmount: "مبلغ الميزانية",
    itemDescription: "وصف الصنف",
    tenderRfqNumber: "رقم العطاء / RFQ",
    currency: "العملة",
    technicalEvaluation: "التقييم الفني (50 نقطة)",
    financialEvaluation: "التقييم المالي (50 نقطة)",
    combinedScore: "الدرجة المجمعة (100 نقطة)",
    supplier: "المورد",
    section: "القسم",
    criterion: "المعيار",
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
    threshold: "الحد الأدنى الفني: 70٪ — فقط المتقدمون الذين يحققون ≥70٪ من الدرجة الفنية القصوى مؤهلون للتقييم المالي",
    decisionJustification: "القرار والتبرير",
    selectedSupplier: "المورد المختار",
    justification: "التبرير (إلزامي إذا لم يكن أقل مقدم عطاء)",
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
    bidders: "مقدمو العطاءات / المتقدمون",
  },
};

// ============================================================================
// HELPER: Format date
// ============================================================================

function formatDate(dateStr: string, isRTL: boolean = false): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ============================================================================
// HELPER: Escape HTML
// ============================================================================

function escapeHtml(str?: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ============================================================================
// MAIN FUNCTION: Generate CBA PDF
// ============================================================================

export async function generateCompetitiveBidAnalysisPDF(
  data: CompetitiveBidAnalysisPDFData
): Promise<{ buffer: Buffer; fileName: string }> {
  // ============================
  // STEP 0: VALIDATE CONTEXT
  // ============================
  if (!data.context) {
    throw new Error('CBA PDF Data missing required context object');
  }
  if (!data.context.direction || !['ltr', 'rtl'].includes(data.context.direction)) {
    throw new Error(
      `Invalid or missing context.direction: "${data.context.direction}". ` +
      `Must be 'ltr' or 'rtl'. Language: ${data.language}`
    );
  }

  console.log(`[CBA PDF Generator] ✅ Context validated - direction=${data.context.direction}, language=${data.language}`);

  // ============================
  // STEP 1: Prepare variables
  // ============================
  const isRTL = data.language === "ar";
  const l = t[data.language];
  const sanitizedData = {
    ...data,
    cbaNumber: escapeHtml(data.cbaNumber),
    prNumber: escapeHtml(data.prNumber),
    itemDescription: escapeHtml(data.itemDescription),
    selectedSupplierName: escapeHtml(data.selectedSupplierName),
    justification: escapeHtml(data.justification),
  };

  console.log(`[CBA PDF Generator] Generating CBA PDF: ${sanitizedData.cbaNumber}`);
  console.log(`[CBA PDF Generator] Data summary: ${sanitizedData.bidders.length} bidders, ${sanitizedData.criteria?.length || 0} criteria, ${sanitizedData.signatures?.length || 0} signatures`);
  console.log(`[CBA PDF Generator] Selected supplier: ${sanitizedData.selectedSupplierName || 'NONE'}, Justification: ${sanitizedData.justification ? 'YES' : 'NO'}`);

  // ============================
  // STEP 2: Generate body HTML
  // ============================
  const bodyHtml = generateCBABodyHTML({
    data: sanitizedData,
    isRTL,
    l,
  });

  // ============================
  // STEP 3: Prepare PDF options
  // ============================
  const pdfOptions: OfficialPdfOptions = {
    context: sanitizedData.context,
    department: sanitizedData.department ?? "",
    documentTitle: l.documentTitle,
    formNumber: `CBA-${sanitizedData.cbaNumber}`,
    formDate: formatDate(sanitizedData.tenderDate, isRTL),
    bodyHtml,
    // ✅ LANDSCAPE A4 - This is the key fix
    landscape: true,
  };

  // ============================
  // STEP 4: Generate PDF (via central engine)
  // ============================
  console.log(`[CBA PDF Generator] Calling generateOfficialPdf with landscape=true, context.direction=${pdfOptions.context.direction}`);

  const buffer = await generateOfficialPdf(pdfOptions);

  // ============================
  // STEP 5: Return structured response
  // ============================
  return {
    buffer,
    fileName: `CBA-${sanitizedData.cbaNumber}.pdf`,
  };
}

// ============================================================================
// HELPER: Generate CBA Body HTML (COMPLETE WITH ALL SECTIONS)
// ============================================================================

function generateCBABodyHTML(params: {
  data: CompetitiveBidAnalysisPDFData;
  isRTL: boolean;
  l: any;
}): string {
  const { data, isRTL, l } = params;

  // Calculate lowest bid from qualified bidders
  const qualifiedBidders = data.bidders.filter(b => b.status === 'qualified' && b.offeredPrice && b.offeredPrice > 0);
  const lowestBid = data.lowestBidAmount || (qualifiedBidders.length > 0
    ? Math.min(...qualifiedBidders.map(b => b.offeredPrice!))
    : 0);

  let html = `
    <style>
      .cba-container { width: 100%; font-size: 9pt; line-height: 1.4; }
      .cba-section { margin-bottom: 14px; page-break-inside: avoid; }
      .cba-section-title { font-size: 11pt; font-weight: 700; color: #1e3a5f; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 2px solid #00a8a8; }
      .cba-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
      .cba-table th, .cba-table td { padding: 6px 8px; text-align: ${isRTL ? 'right' : 'left'}; border: 1px solid #e2e8f0; font-size: 8pt; }
      .cba-table th { background: #00a8a8; color: white; font-weight: 600; }
      .cba-label-cell { background: #f8fafc; font-weight: 600; width: 30%; }
      .cba-info-box { background: #f8fafc; ${isRTL ? 'border-right' : 'border-left'}: 4px solid #00a8a8; padding: 10px; margin-bottom: 10px; }
      .cba-info-box p { margin: 4px 0; font-size: 9pt; color: #334155; line-height: 1.5; }
      .cba-justification-box { background: #f0f9ff; ${isRTL ? 'border-right' : 'border-left'}: 4px solid #0284c7; padding: 12px; margin-bottom: 10px; }
      .cba-justification-box p { margin: 4px 0; font-size: 9pt; color: #0c4a6e; line-height: 1.5; }
      .cba-sig-table td { vertical-align: top; padding: 8px; }
      .cba-sig-img { max-height: 40px; max-width: 120px; }
      .cba-bidders-grid { display: flex; flex-wrap: wrap; gap: 4px 20px; margin-bottom: 10px; }
      .cba-bidder-item { font-size: 9pt; padding: 2px 0; }
    </style>
    
    <div class="cba-container">
      <!-- ═══════════════════════════════════════════════════════════════ -->
      <!-- SECTION 1: DOCUMENT DETAILS -->
      <!-- ═══════════════════════════════════════════════════════════════ -->
      <div class="cba-section">
        <div class="cba-section-title">📋 ${l.documentTitle}</div>
        <table class="cba-table">
          <tbody>
            <tr>
              <td class="cba-label-cell">${l.tenderRfqNumber}</td>
              <td>${data.cbaNumber}</td>
            </tr>
            <tr>
              <td class="cba-label-cell">${l.prReference}</td>
              <td>${data.prNumber || l.notApplicable}</td>
            </tr>
            <tr>
              <td class="cba-label-cell">${l.date}</td>
              <td>${formatDate(data.tenderDate, isRTL)}</td>
            </tr>
            ${data.currency ? `
              <tr>
                <td class="cba-label-cell">${l.currency}</td>
                <td>${data.currency}</td>
              </tr>
            ` : ''}
            ${data.budgetAmount ? `
              <tr>
                <td class="cba-label-cell">${l.budgetAmount}</td>
                <td>${data.currency || ''} ${data.budgetAmount.toLocaleString()}</td>
              </tr>
            ` : ''}
            ${data.itemDescription ? `
              <tr>
                <td class="cba-label-cell">${l.itemDescription}</td>
                <td>${data.itemDescription}</td>
              </tr>
            ` : ''}
          </tbody>
        </table>
      </div>

      <!-- ═══════════════════════════════════════════════════════════════ -->
      <!-- SECTION 2: BIDDERS LIST -->
      <!-- ═══════════════════════════════════════════════════════════════ -->
      <div class="cba-section">
        <div class="cba-section-title">👥 ${l.bidders}</div>
        <div class="cba-bidders-grid">
          ${data.bidders.map((bidder, idx) => `
            <div class="cba-bidder-item"><strong>${idx + 1}.</strong> ${bidder.supplierName}</div>
          `).join('')}
        </div>
      </div>

      <!-- ═══════════════════════════════════════════════════════════════ -->
      <!-- SECTION 3: TECHNICAL EVALUATION (50 POINTS) -->
      <!-- ═══════════════════════════════════════════════════════════════ -->
      <div class="cba-section">
        <div class="cba-section-title">📊 ${l.technicalEvaluation}</div>
        <div class="cba-info-box">
          <p>${l.threshold}</p>
        </div>
        ${data.criteria && data.criteria.length > 0 ? `
          <table class="cba-table">
            <thead>
              <tr>
                <th style="width: 200px;">${l.criterion}</th>
                <th style="text-align: center; width: 60px;">${l.maxScore}</th>
                ${data.bidders.map(bidder => `<th style="text-align: center;">${bidder.supplierName}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.criteria.map(criterion => `
                <tr>
                  <td>${escapeHtml(criterion.name)}</td>
                  <td style="text-align: center; font-weight: 600;">${criterion.maxScore}</td>
                  ${data.bidders.map((bidder, bidderIdx) => {
                    const score = criterion.scores?.find(s => s.bidderId === bidder.rank || s.bidderId === bidderIdx)?.score || 0;
                    return `<td style="text-align: center;">${score.toFixed(2)}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
              <!-- TOTAL ROW -->
              <tr style="background: #f1f5f9; font-weight: 700;">
                <td>${l.totalTechnical}</td>
                <td style="text-align: center;">50</td>
                ${data.bidders.map(bidder => `
                  <td style="text-align: center; font-weight: 700;">${bidder.technicalScore.toFixed(2)}</td>
                `).join('')}
              </tr>
            </tbody>
          </table>
        ` : `
          <table class="cba-table">
            <thead>
              <tr>
                <th>${l.supplier}</th>
                <th style="text-align: center;">${l.technical} (50)</th>
                <th style="text-align: center;">${l.status}</th>
              </tr>
            </thead>
            <tbody>
              ${data.bidders.map(bidder => `
                <tr>
                  <td>${bidder.supplierName}</td>
                  <td style="text-align: center; font-weight: 600;">${bidder.technicalScore.toFixed(2)}</td>
                  <td style="text-align: center;">${bidder.status === 'qualified' ? '✓ ' + l.qualified : bidder.status === 'disqualified' ? '✗ ' + l.disqualified : '✗ ' + l.notQualified}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>

      <!-- ═══════════════════════════════════════════════════════════════ -->
      <!-- SECTION 4: FINANCIAL EVALUATION (50 POINTS) -->
      <!-- ═══════════════════════════════════════════════════════════════ -->
      <div class="cba-section">
        <div class="cba-section-title">💰 ${l.financialEvaluation}</div>
        <div class="cba-info-box">
          <p>${l.formulaNote}</p>
          <p><strong>${l.lowestBid}:</strong> ${data.currency || ''} ${lowestBid.toLocaleString()}</p>
        </div>
        <table class="cba-table">
          <thead>
            <tr>
              <th>${l.supplier}</th>
              <th style="text-align: center;">${l.offeredPrice}</th>
              <th style="text-align: center;">${l.financialScore} (50)</th>
            </tr>
          </thead>
          <tbody>
            ${data.bidders.map(bidder => `
              <tr>
                <td>${bidder.supplierName}</td>
                <td style="text-align: center;">${bidder.offeredPrice ? (data.currency || '') + ' ' + bidder.offeredPrice.toLocaleString() : l.notApplicable}</td>
                <td style="text-align: center; font-weight: 600;">${bidder.status === 'qualified' ? bidder.financialScore.toFixed(2) : l.notApplicable}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- ═══════════════════════════════════════════════════════════════ -->
      <!-- SECTION 5: COMBINED SCORE (100 POINTS) -->
      <!-- ═══════════════════════════════════════════════════════════════ -->
      <div class="cba-section">
        <div class="cba-section-title">🏆 ${l.combinedScore}</div>
        <table class="cba-table">
          <thead>
            <tr>
              <th style="width: 50px;">${l.rank}</th>
              <th>${l.supplier}</th>
              <th style="text-align: center;">${l.technical}</th>
              <th style="text-align: center;">${l.financial}</th>
              <th style="text-align: center;">${l.total}</th>
              <th style="text-align: center;">${l.status}</th>
            </tr>
          </thead>
          <tbody>
            ${data.bidders
              .map(
                (bidder) => `
              <tr${bidder.rank === 1 ? ' style="background: #f0fdf4;"' : ''}>
                <td style="text-align: center; font-weight: 700;">${bidder.rank}</td>
                <td>${bidder.supplierName}${bidder.rank === 1 ? ' <strong>★</strong>' : ''}</td>
                <td style="text-align: center;">${bidder.technicalScore.toFixed(2)}</td>
                <td style="text-align: center;">${bidder.status === 'qualified' ? bidder.financialScore.toFixed(2) : l.notApplicable}</td>
                <td style="text-align: center; font-weight: 700;">${bidder.status === 'qualified' ? bidder.totalScore.toFixed(2) : l.disqualified}</td>
                <td style="text-align: center;">
                  ${
                    bidder.status === 'qualified'
                      ? '<span style="color: #16a34a;">✓ ' + l.qualified + '</span>'
                      : bidder.status === 'not_qualified'
                        ? '<span style="color: #dc2626;">✗ ' + l.notQualified + '</span>'
                        : '<span style="color: #dc2626;">✗ ' + l.disqualified + '</span>'
                  }
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>

      <!-- ═══════════════════════════════════════════════════════════════ -->
      <!-- SECTION 6: DECISION & JUSTIFICATION -->
      <!-- ═══════════════════════════════════════════════════════════════ -->
      <div class="cba-section">
        <div class="cba-section-title">✅ ${l.decisionJustification}</div>
        <table class="cba-table">
          <tbody>
            <tr>
              <td class="cba-label-cell">${l.selectedSupplier}</td>
              <td><strong>${data.selectedSupplierName || l.notApplicable}</strong></td>
            </tr>
            <tr>
              <td class="cba-label-cell">${l.lowestBid}</td>
              <td>${data.currency || ''} ${lowestBid.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
        ${data.justification ? `
          <div class="cba-justification-box">
            <p><strong>${l.justification}:</strong></p>
            <p style="margin-top: 8px;">${data.justification}</p>
          </div>
        ` : ''}
      </div>

      <!-- ═══════════════════════════════════════════════════════════════ -->
      <!-- SECTION 7: APPROVAL & SIGNATURES -->
      <!-- ═══════════════════════════════════════════════════════════════ -->
      ${data.signatures && data.signatures.length > 0 ? `
        <div class="cba-section">
          <div class="cba-section-title">✍️ ${l.approvalSignatures}</div>
          <table class="cba-table cba-sig-table">
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th>${l.role}</th>
                <th>${l.name}</th>
                <th style="text-align: center;">${l.signature}</th>
                <th style="text-align: center;">${l.signedOn}</th>
                <th style="text-align: center;">${l.verificationCode}</th>
              </tr>
            </thead>
            <tbody>
              ${data.signatures
                .map(
                  (sig, idx) => `
                <tr>
                  <td style="text-align: center;">${idx + 1}</td>
                  <td>${isRTL && sig.roleAr ? sig.roleAr : sig.role}</td>
                  <td>${sig.memberName}</td>
                  <td style="text-align: center;">
                    ${sig.signatureDataUrl ? `<img src="${sig.signatureDataUrl}" class="cba-sig-img" alt="Signature" />` : '___________'}
                  </td>
                  <td style="text-align: center;">${sig.signedAt ? formatDate(sig.signedAt, isRTL) : '___________'}</td>
                  <td style="text-align: center; font-size: 7pt;">${sig.verificationCode || ''}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
    </div>
  `;

  return html;
}
