/**
 * ============================================================================
 * BID EVALUATION CHECKLIST PDF GENERATOR - MIGRATED TO CENTRAL PDF ENGINE
 * ============================================================================
 * 
 * MIGRATED: From Puppeteer to OfficialPdfEngine
 * - Uses centralized PDF context (buildOfficialPdfContext)
 * - Ensures context.direction is always defined
 * - Consistent with rfqPdfGenerator, prPdfGenerator, bomPdfGenerator, and grnPDFGenerator
 * - Bilingual support (English & Arabic with RTL/LTR)
 * 
 * Generates professional Bid Evaluation Checklist documents with:
 * - Organization branding and official header
 * - Bid analysis details and PR reference
 * - Evaluation criteria and scoring sections
 * - Bidder summary with scores
 * - Remarks for non-qualified bidders
 * - Approval signatures
 * 
 * ============================================================================
 */

import { generateOfficialPdf } from '../../OfficialPdfEngine';
import type { OfficialPdfOptions } from '../../OfficialPdfEngine';
import type { OfficialPdfContext } from '../../buildOfficialPdfContext';

export interface BidderCalc {
  bidderId: number;
  bidderName: string;
  technicalScore: number;
  financialScore: number;
  finalScore: number;
  status: string;
}

export interface BidEvaluationChecklistPDFData {
  // Organization Info
  context: OfficialPdfContext;
  department?: string;

  // Bid Analysis Details
  bidAnalysisId: number;
  organizationId: number;
  operatingUnitId: number;
  prNumber: string;
  prReference?: string;

  // Document Info
  documentTitle: string;
  generatedOn: string;

  // Evaluation Data
  sections: any[];
  activeBidders: BidderCalc[];
  calculatedScores: BidderCalc[];
  remarks: any[];

  // Language & Direction
  language: 'en' | 'ar';
}

// ============================================================================
// TRANSLATIONS
// ============================================================================
function getLabels(language: 'en' | 'ar') {
  const labels = {
    en: {
      title: 'BID EVALUATION CHECKLIST',
      prReference: 'PR Reference',
      bidAnalysisId: 'Bid Analysis ID',
      technical: 'Technical',
      financial: 'Financial',
      finalScore: 'Final Score',
      status: 'Status',
      qualified: 'Qualified',
      notQualified: 'Not Qualified',
      biddersSummary: 'Bidders Summary',
      remarks: 'Remarks',
      generatedOn: 'Generated on',
      department: 'Logistics & Procurement',
    },
    ar: {
      title: 'قائمة تقييم العطاءات',
      prReference: 'مرجع طلب الشراء',
      bidAnalysisId: 'معرف تحليل العطاء',
      technical: 'فني',
      financial: 'مالي',
      finalScore: 'الدرجة النهائية',
      status: 'الحالة',
      qualified: 'مؤهل',
      notQualified: 'غير مؤهل',
      biddersSummary: 'ملخص المناقصين',
      remarks: 'ملاحظات',
      generatedOn: 'تم الإنشاء في',
      department: 'الخدمات اللوجستية والمشتريات',
    },
  };
  return labels[language];
}

/**
 * Format date for display
 */
function formatDate(dateStr: string | undefined, isRTL: boolean = false): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Generate HTML body for Bid Evaluation Checklist
 */
/**
 * Generate HTML body for Bid Evaluation Checklist with FULL EVALUATION MATRIX
 * Includes all criteria rows, scores, and color coding from old print
 */
function generateBidEvaluationChecklistBodyHTML(data: BidEvaluationChecklistPDFData): string {
  const isRTL = data.language === 'ar';
  const labels = getLabels(data.language);
  const TEAL = '#008080';
  const TEAL_LIGHT = '#e0f2f1';
  const YELLOW_BG = '#ffff00';
  const GREEN_BG = '#00b050';

  // Build bidders table rows
  const biddersTableHtml = (data.calculatedScores || [])
    .map(
      (bidder) => `
    <tr>
      <td>${bidder.bidderName}</td>
      <td style="text-align: center;">${bidder.technicalScore.toFixed(2)}</td>
      <td style="text-align: center;">${bidder.financialScore.toFixed(2)}</td>
      <td style="text-align: center;">${bidder.finalScore.toFixed(2)}</td>
      <td style="text-align: center; color: ${bidder.status === labels.qualified ? '#15803d' : '#b91c1c'};">
        ${bidder.status}
      </td>
    </tr>
  `
    )
    .join('');

  // Build evaluation criteria matrix
  const criteriaMatrixHtml = (data.sections || [])
    .map((section: any) => {
      const criteriaRows = (section.criteria || [])
        .map((criterion: any) => {
          const bidderScores = (data.activeBidders || [])
            .map((bidder: any) => {
              // Find score for this criterion-bidder pair
              const score = criterion.scores?.[bidder.id] || 0;
              const status = criterion.statuses?.[bidder.id] || 'scored';
              
              let cellStyle = '';
              let cellContent = score;
              
              if (status === 'none') {
                cellStyle = `background-color: ${YELLOW_BG}; font-weight: bold;`;
                cellContent = 'None';
              } else if (criterion.isScreening) {
                cellStyle = `background-color: ${GREEN_BG}; color: white; font-weight: bold;`;
              }
              
              return `<td style="text-align: center; ${cellStyle}">${cellContent}</td>`;
            })
            .join('');
          
          return `
          <tr>
            <td>${section.number}</td>
            <td>${section.name}</td>
            <td>${criterion.name}</td>
            <td>${criterion.stage || '-'}</td>
            <td style="text-align: center; font-weight: bold;">${criterion.maxScore}</td>
            ${bidderScores}
          </tr>
          `;
        })
        .join('');
      
      return criteriaRows;
    })
    .join('');

  const remarksHtml =
    (data.remarks || []).length > 0
      ? `
    <div class="bec-section">
      <div class="bec-section-title">${labels.remarks}</div>
      <table class="bec-table">
        <tbody>
          ${(data.remarks || [])
            .map(
              (remark: any) => `
            <tr>
              <td>${remark.bidderName || '-'}</td>
              <td>${remark.remark || '-'}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `
      : '';

  return `
    <style>
      .bec-container {
        width: 100%;
        font-size: 9pt;
        line-height: 1.4;
      }

      .bec-section {
        padding: 10px 0;
        margin-bottom: 12px;
        page-break-inside: avoid;
      }

      .bec-section-title {
        font-size: 11pt;
        font-weight: 700;
        color: #1e3a5f;
        margin-bottom: 8px;
        padding-bottom: 4px;
        border-bottom: 2px solid #00a8a8;
      }

      .bec-metadata {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 12px;
      }

      .bec-metadata-item {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        border-bottom: 1px solid #f0f0f0;
      }

      .bec-metadata-label {
        font-weight: 600;
        color: #1e3a5f;
        width: 40%;
      }

      .bec-metadata-value {
        color: #334155;
        width: 60%;
        text-align: ${isRTL ? 'left' : 'right'};
      }

      .bec-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 12px;
        font-size: 7pt;
      }

      .bec-table th {
        background: #00a8a8;
        color: white;
        font-weight: 600;
        padding: 6px 4px;
        text-align: ${isRTL ? 'right' : 'left'};
        border: 1px solid #00a8a8;
        font-size: 7pt;
      }

      .bec-table td {
        padding: 4px 4px;
        border: 1px solid #e2e8f0;
        font-size: 7pt;
      }

      .bec-info-box {
        background: #f8fafc;
        border-${isRTL ? 'right' : 'left'}: 4px solid #00a8a8;
        padding: 12px;
        margin-bottom: 10px;
        white-space: pre-wrap;
      }

      .no-break {
        page-break-inside: avoid;
      }

      .criteria-matrix {
        width: 100%;
        border-collapse: collapse;
        font-size: 6.5pt;
        margin-bottom: 12px;
      }

      .criteria-matrix th {
        background: ${TEAL};
        color: white;
        font-weight: 600;
        padding: 4px 2px;
        text-align: center;
        border: 1px solid ${TEAL};
      }

      .criteria-matrix td {
        padding: 3px 2px;
        border: 1px solid #ccc;
        text-align: center;
      }
    </style>

    <div class="bec-container">
      <!-- ANALYSIS METADATA SECTION -->
      <div class="bec-section">
        <div class="bec-section-title">📋 ${labels.bidAnalysisId}</div>
        <div class="bec-metadata">
          <div>
            <div class="bec-metadata-item">
              <span class="bec-metadata-label">${labels.prReference}</span>
              <span class="bec-metadata-value">${data.prNumber || '-'}</span>
            </div>
            <div class="bec-metadata-item">
              <span class="bec-metadata-label">${labels.bidAnalysisId}</span>
              <span class="bec-metadata-value">${data.bidAnalysisId}</span>
            </div>
          </div>
          <div>
            <div class="bec-metadata-item">
              <span class="bec-metadata-label">${labels.generatedOn}</span>
              <span class="bec-metadata-value">${formatDate(data.generatedOn, isRTL)}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- EVALUATION CRITERIA MATRIX -->
      <div class="bec-section">
        <div class="bec-section-title">📊 Evaluation Criteria Matrix</div>
        <table class="criteria-matrix">
          <thead>
            <tr>
              <th style="width: 5%;">#</th>
              <th style="width: 15%;">Section</th>
              <th style="width: 30%;">Requirement</th>
              <th style="width: 15%;">Stage</th>
              <th style="width: 8%;">Weight</th>
              ${(data.activeBidders || [])
                .map((b: any) => `<th style="width: 8%;">${b.bidderName.substring(0, 10)}</th>`)
                .join('')}
            </tr>
          </thead>
          <tbody>
            ${criteriaMatrixHtml}
          </tbody>
        </table>
      </div>

      <!-- BIDDERS SUMMARY SECTION -->
      <div class="bec-section no-break">
        <div class="bec-section-title">📊 ${labels.biddersSummary}</div>
        <table class="bec-table">
          <thead>
            <tr>
              <th style="width:30%;">Bidder Name</th>
              <th style="width:17.5%;">${labels.technical}</th>
              <th style="width:17.5%;">${labels.financial}</th>
              <th style="width:17.5%;">${labels.finalScore}</th>
              <th style="width:17.5%;">${labels.status}</th>
            </tr>
          </thead>
          <tbody>
            ${biddersTableHtml}
          </tbody>
        </table>
      </div>

      <!-- REMARKS SECTION -->
      ${remarksHtml}
    </div>
  `;
}

/**
 * Main function to generate Bid Evaluation Checklist PDF
 * Uses OfficialPdfEngine for consistent styling and structure
 * Returns buffer + fileName (aligned with rfqPdfGenerator)
 *
 * FIX: Validates context.direction is defined before use
 */
export async function generateBidEvaluationChecklistPDF(
  data: BidEvaluationChecklistPDFData
): Promise<{ buffer: Buffer; fileName: string }> {
  // ============================
  // STEP 0: VALIDATE CONTEXT
  // ============================
  // ✅ FIX: Ensure context and direction are defined
  if (!data.context) {
    throw new Error('Bid Evaluation Checklist PDF Data missing required context object');
  }

  if (!data.context.direction || !['ltr', 'rtl'].includes(data.context.direction)) {
    throw new Error(
      `Invalid or missing context.direction: "${data.context.direction}". ` +
      `Must be 'ltr' or 'rtl'. Language: ${data.language}`
    );
  }

  console.log(`[Bid Evaluation Checklist PDF Generator] ✅ Context validated - direction=${data.context.direction}, language=${data.language}`);

  // ============================
  // STEP 1: Safety - Escape HTML inputs
  // ============================
  const escapeHtml = (str?: string): string => {
    if (!str) return '';
    return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
    };

  // ✅ FIX: Preserve context during sanitization
  const sanitizedData: BidEvaluationChecklistPDFData = {
    ...data,
    context: data.context, // ✅ Explicitly preserve context
    prNumber: escapeHtml(data.prNumber),
    prReference: escapeHtml(data.prReference),
    documentTitle: escapeHtml(data.documentTitle),
    generatedOn: data.generatedOn,
    calculatedScores: (data.calculatedScores || []).map((score) => ({
      ...score,
      bidderName: escapeHtml(score.bidderName),
    })),
    remarks: (data.remarks || []).map((remark) => ({
      ...remark,
      bidderName: escapeHtml(remark.bidderName),
      remark: escapeHtml(remark.remark),
    })),
  };

  // ============================
  // STEP 2: Generate Body HTML
  // ============================
  const bodyHtml = generateBidEvaluationChecklistBodyHTML(sanitizedData);

  // ============================
  // STEP 3: Layout + Direction
  // ============================
  // ✅ FIX: Use context.direction directly (already validated)
  const direction = sanitizedData.context.direction;
  const labels = getLabels(sanitizedData.language);

  console.log(`[Bid Evaluation Checklist PDF Generator] Using direction=${direction} from context`);

  // ============================
  // STEP 4: Prepare PDF Options
  // ============================
  const pdfOptions: OfficialPdfOptions = {
    context: sanitizedData.context, // ✅ Pass complete context with direction
    department: sanitizedData.department ?? labels.department,
    documentTitle: labels.title,
    formNumber: `BEC-${sanitizedData.bidAnalysisId}`,
    formDate: formatDate(sanitizedData.generatedOn, direction === 'rtl'),
    bodyHtml,
  };

  // ============================
  // STEP 5: Generate PDF
  // ============================
  console.log(`[Bid Evaluation Checklist PDF Generator] Calling generateOfficialPdf with context.direction=${pdfOptions.context.direction}`);

  const buffer = await generateOfficialPdf(pdfOptions);

if (!buffer || buffer.length === 0) {
    throw new Error('Generated Bid Evaluation Checklist PDF buffer is empty');
  }

  if (buffer.toString('ascii', 0, 4) !== '%PDF') {
    throw new Error('Generated content is not a valid PDF');
  }

  // ============================
  // STEP 6: Return structured response
  // ============================
  return {
    buffer,
    fileName: `BEC-${sanitizedData.bidAnalysisId}.pdf`,
  };
}
