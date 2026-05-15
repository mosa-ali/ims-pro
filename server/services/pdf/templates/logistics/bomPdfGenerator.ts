/**
 * ============================================================================
 * BID OPENING MINUTES (BOM) PDF GENERATOR - FIXED
 * ============================================================================
 * 
 * FIX: Ensures context.direction is always defined before use
 * 
 * Generates professional Bid Opening Minutes PDFs using OfficialPdfEngine.
 * Produces real PDFs with:
 * - Selectable text
 * - Searchable content
 * - Real tables
 * - Vector graphics (no pixelation)
 * - Standard official header with organization branding
 * - RTL/LTR support for Arabic/English
 * - Integrated with System-Wide Official PDF Output Framework
 * 
 * ============================================================================
 */
import {
  generateOfficialPdf,
} from '../../OfficialPdfEngine';
import type { OfficialPdfOptions } from '../../OfficialPdfEngine';
import type { OfficialPdfContext } from '../../buildOfficialPdfContext';

export interface BidOpeningMinutesPDFData {
  // Organization Info
  context: OfficialPdfContext;
  department?: string;
  
  // BOM Details
  bomNumber: string;
  bidDate: string;
  openingTime: string;
  location: string;
  openingMode: 'physical' | 'online' | 'hybrid';
  
  // Committee
  chairpersonName: string;
  member1Name?: string;
  member2Name?: string;
  member3Name?: string;
  
  // Bids Information
  totalBidsReceived: number;
  bidsOpenedCount: number;
  
// Additional Info
openingNotes?: string;
irregularities?: string;

// ✅ ADD HERE
  // Bidders (no prices)
  bidders: Array<{
    bidderName: string;
    submissionDate: string;
    status: string;
  }>;

// Signatures Section (NEW)
signatures?: {
  memberName: string;
  role: string;
  signatureDataUrl?: string;
}[];

// Language & Direction
language: 'en' | 'ar';
}

/**
 * Format date for display
 */
function formatDate(dateStr: string, isRTL: boolean = false): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get localized labels for BOM
 */
function getLabels(language: 'en' | 'ar') {
  const isArabic = language === 'ar';
  
  return {
    title: isArabic ? 'محضر فتح العروض' : 'Bid Opening Minutes',
    bomNumber: isArabic ? 'رقم المحضر' : 'BOM Number',
    bidDate: isArabic ? 'تاريخ الفتح' : 'Bid Opening Date',
    openingTime: isArabic ? 'وقت الفتح' : 'Opening Time',
    location: isArabic ? 'مكان الفتح' : 'Location',
    openingMode: isArabic ? 'طريقة الفتح' : 'Opening Mode',
    chairperson: isArabic ? 'رئيس اللجنة' : 'Chairperson',
    members: isArabic ? 'أعضاء اللجنة' : 'Committee Members',
    totalBids: isArabic ? 'إجمالي العروض المستلمة' : 'Total Bids Received',
    bidsOpened: isArabic ? 'العروض المفتوحة' : 'Bids Opened',
    notes: isArabic ? 'ملاحظات' : 'Notes',
    irregularities: isArabic ? 'المخالفات' : 'Irregularities',
    generatedOn: isArabic ? 'تم الإنشاء في' : 'Generated on',
    member: isArabic ? 'عضو' : 'Member',
    biddersSection: isArabic ? 'العروض المستلمة' : 'Bidders Received',
    bidderName: isArabic ? 'اسم المورد' : 'Bidder Name',
    submissionStatus: isArabic ? 'حالة الاستقبال' : 'Status',
    submissionDate: isArabic ? 'تاريخ الاستقبال' : 'Submission Date',
    noBidders: isArabic ? 'لم يتم تسجيل أي مزايدين' : 'No Bidders Recorded',
    signatures: isArabic ? 'التوقيعات' : 'Signatures',
  };
}

/**
 * Generate BOM-specific body HTML (content only, no wrapper)
 */
function generateBOMBodyHTML(data: BidOpeningMinutesPDFData): string {
  const isRTL = data.language === 'ar';
  const labels = getLabels(data.language);
  const formattedDate = formatDate(data.bidDate, isRTL);

  return `
    <style>
      .bom-container {
        width: 100%;
        font-size: 9pt;
        line-height: 1.4;
      }
      
      .bom-section {
        padding: 10px 0;
        margin-bottom: 8px;
      }
      
      .bom-section-title {
        font-size: 11pt;
        font-weight: 700;
        color: #1e3a5f;
        margin-bottom: 8px;
        padding-bottom: 4px;
        border-bottom: 2px solid #00a8a8;
      }
      
      .bom-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 8px;
      }
      
      .bom-table th,
      .bom-table td {
        padding: 6px 8px;
        text-align: ${isRTL ? 'right' : 'left'};
        border: 1px solid #e2e8f0;
        font-size: 8pt;
      }
      
      .bom-table th {
        background: #00a8a8;
        color: white;
        font-weight: 600;
      }
      
      .bom-label-cell {
        background: #f8fafc;
        font-weight: 600;
        width: 35%;
      }
      
      .bom-info-box {
        background: #f8fafc;
        ${isRTL ? 'border-right' : 'border-left'}: 4px solid #00a8a8;
        padding: 12px;
        margin-bottom: 10px;
      }
      
      .bom-info-box p {
        margin: 4px 0;
        font-size: 9pt;
        color: #334155;
        line-height: 1.5;
      }
      
      .no-break {
        page-break-inside: avoid;
      }
    </style>
    
    <div class="bom-container">
      <!-- BOM DETAILS SECTION -->
      <div class="bom-section no-break">
        <div class="bom-section-title">📋 ${labels.bomNumber}</div>
        <table class="bom-table">
          <tbody>
            <tr>
              <td class="bom-label-cell">${labels.bomNumber}</td>
              <td>${data.bomNumber}</td>
            </tr>
            <tr>
              <td class="bom-label-cell">${labels.bidDate}</td>
              <td>${formattedDate}</td>
            </tr>
            <tr>
              <td class="bom-label-cell">${labels.openingTime}</td>
              <td>${data.openingTime || 'N/A'}</td>
            </tr>
            <tr>
              <td class="bom-label-cell">${labels.location}</td>
              <td>${data.location || 'N/A'}</td>
            </tr>
            <tr>
              <td class="bom-label-cell">${labels.openingMode}</td>
              <td>${data.openingMode}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- COMMITTEE SECTION -->
      <div class="bom-section no-break">
        <div class="bom-section-title">👥 ${labels.members}</div>
        <table class="bom-table">
          <tbody>
            <tr>
              <td class="bom-label-cell">${labels.chairperson}</td>
              <td>${data.chairpersonName || 'N/A'}</td>
            </tr>
            ${data.member1Name ? `
            <tr>
              <td class="bom-label-cell">${labels.member} 1</td>
              <td>${data.member1Name}</td>
            </tr>
            ` : ''}
            ${data.member2Name ? `
            <tr>
              <td class="bom-label-cell">${labels.member} 2</td>
              <td>${data.member2Name}</td>
            </tr>
            ` : ''}
            ${data.member3Name ? `
            <tr>
              <td class="bom-label-cell">${labels.member} 3</td>
              <td>${data.member3Name}</td>
            </tr>
            ` : ''}
          </tbody>
        </table>
      </div>
      
      <!-- BIDS SECTION -->
      <div class="bom-section no-break">
        <div class="bom-section-title">📊 ${labels.totalBids}</div>
        <table class="bom-table">
          <tbody>
            <tr>
              <td class="bom-label-cell">${labels.totalBids}</td>
              <td>${data.totalBidsReceived}</td>
            </tr>
            <tr>
              <td class="bom-label-cell">${labels.bidsOpened}</td>
              <td>${data.bidsOpenedCount}</td>
            </tr>
          </tbody>
        </table>
      </div>
            <!-- BIDDERS LIST SECTION -->
            ${data.bidders && data.bidders.length > 0 ? `
            <div class="bom-section no-break">

              <div class="bom-section-title">
                📄 ${labels.biddersSection || 'Bidders Received'}
              </div>

              <div style="
                font-size:8pt;
                color:#475569;
                margin-bottom:8px;
                font-style:italic;
              ">
                (Bid amounts are NOT disclosed in the BOM)
              </div>

              <table class="bom-table">
                <thead>
                  <tr>
                    <th style="width:8%;">#</th>

                    <th style="width:45%;">
                      ${labels.bidderName || 'Bidder Name'}
                    </th>

                    <th style="width:25%;">
                      ${labels.submissionDate || 'Submission Date'}
                    </th>

                    <th style="width:22%;">
                      ${labels.submissionStatus || 'Status'}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  ${data.bidders.map((b, index) => `
                    <tr>
                      <td>${index + 1}</td>

                      <td>
                        ${b.bidderName || '-'}
                      </td>

                      <td>
                        ${b.submissionDate || ''}
                      </td>
                      
                      <td>
                      ${b.status || 'received'}
                    </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

            </div>
            ` : `
            <div class="bom-section no-break">

              <div class="bom-section-title">
                📄 ${labels.biddersSection || 'Bidders Received'}
              </div>

              <div class="bom-info-box">
                <p>
                  ${labels.noBidders || 'No bidders recorded'}
                </p>
              </div>

            </div>
            `}
      
      <!-- NOTES SECTION -->
      ${data.openingNotes ? `
      <div class="bom-section no-break">
        <div class="bom-section-title">📝 ${labels.notes}</div>
        <div class="bom-info-box">
          <p>${data.openingNotes}</p>
        </div>
      </div>
      ` : ''}
      
      <!-- IRREGULARITIES SECTION -->
      ${data.irregularities ? `
      <div class="bom-section no-break">
        <div class="bom-section-title">⚠️ ${labels.irregularities}</div>
        <div class="bom-info-box">
          <p>${data.irregularities}</p>
        </div>
      </div>
      ` : ''}

      <!-- SIGNATURES SECTION -->
      ${data.signatures && data.signatures.length > 0 ? `
      <div class="bom-section">
        <div class="bom-section-title">✍️ ${labels.signatures || 'Signatures'}</div>

        <table class="bom-table" style="text-align:center;">
          <tbody>
            <tr>
              ${data.signatures.map(sig => `
                <td style="width:${100 / labels.signatures.length}%;">
                  <div style="min-height:60px;">
                    ${
                      sig.signatureDataUrl
                        ? `<img src="${sig.signatureDataUrl}" style="max-height:60px;" />`
                        : `<div style="height:60px;"></div>`
                    }
                  </div>
                  <div style="margin-top:6px; font-weight:600;">
                    ${sig.memberName}
                  </div>
                  <div style="font-size:8pt; color:#64748b;">
                    ${sig.role}
                  </div>
                </td>
              `).join('')}
            </tr>
          </tbody>
        </table>
      </div>
      ` : ''}

    </div>
  `;
}

/**
 * Main function to generate BOM PDF
 * Uses OfficialPdfEngine for consistent styling and structure
 * Returns Buffer 
 * 
 * FIX: Validates context.direction is defined before use
 */
export async function generateBidOpeningMinutesPDF(
  data: BidOpeningMinutesPDFData
): Promise<{ buffer: Buffer; fileName: string }> {
  // ============================
  // STEP 0: VALIDATE CONTEXT
  // ============================
  // ✅ FIX: Ensure context and direction are defined
  if (!data.context) {
    throw new Error('BOM PDF Data missing required context object');
  }

  if (!data.context.direction || !['ltr', 'rtl'].includes(data.context.direction)) {
    throw new Error(
      `Invalid or missing context.direction: "${data.context.direction}". ` +
      `Must be 'ltr' or 'rtl'. Language: ${data.language}`
    );
  }

  console.log(`[BOM PDF Generator] ✅ Context validated - direction=${data.context.direction}, language=${data.language}`);

  // ============================
  // STEP 1: Safety - Escape HTML inputs
  // ============================
  const escapeHtml = (str?: string): string => {
    if (!str) return '';
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };

  // Sanitize user-input fields
  // ✅ FIX: Preserve context during sanitization
  const sanitizedData: BidOpeningMinutesPDFData = {
    ...data,
    context: data.context, // ✅ Explicitly preserve context
    openingNotes: escapeHtml(data.openingNotes),
    irregularities: escapeHtml(data.irregularities),
    chairpersonName: escapeHtml(data.chairpersonName),
    member1Name: escapeHtml(data.member1Name),
    member2Name: escapeHtml(data.member2Name),
    member3Name: escapeHtml(data.member3Name),
    location: escapeHtml(data.location),
  };

  // ============================
  // STEP 2: Generate Body HTML
  // ============================
  const bodyHtml = generateBOMBodyHTML(sanitizedData);

  // ============================
  // STEP 3: Layout + Direction
  // ============================
  // ✅ FIX: Use context.direction directly (already validated)
  const direction = sanitizedData.context.direction;
  const labels = getLabels(sanitizedData.language);

  console.log(`[BOM PDF Generator] Using direction=${direction} from context`);

  // ============================
  // STEP 4: Prepare PDF Options
  // ============================
  const pdfOptions: OfficialPdfOptions = {
    context: sanitizedData.context, // ✅ Pass complete context with direction
    department: sanitizedData.department ?? "",
    documentTitle: labels.title,
    formNumber: `BOM-${sanitizedData.bomNumber}`,
    formDate: formatDate(
      sanitizedData.bidDate,
      direction === "rtl"
    ),
    bodyHtml,
  };

  // ============================
  // STEP 5: Generate PDF (via central engine)
  // ============================
  console.log(`[BOM PDF Generator] Calling generateOfficialPdf with context.direction=${pdfOptions.context.direction}`);
  
  const buffer = await generateOfficialPdf(pdfOptions);

  // ============================
  // STEP 6: Return structured response
  // ============================
  return {
    buffer,
    fileName: `BOM-${sanitizedData.bomNumber}.pdf`,
  };
}
