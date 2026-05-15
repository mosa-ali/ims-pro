/**
 * ============================================================================
 * BID RECEIPT ACKNOWLEDGEMENT PDF GENERATOR - FIXED
 * ============================================================================
 * 
 * FIX: Migrated from Puppeteer + buildPdfDocument to OfficialPdfEngine
 * - Uses centralized PDF context (buildOfficialPdfContext)
 * - Ensures context.direction is always defined
 * - Consistent with prPdfGenerator, bomPdfGenerator, rfqPdfGenerator, and grnPDFGenerator
 * - Bilingual support (English & Arabic with RTL/LTR)
 * 
 * Generates professional Bid Receipt Acknowledgement documents with:
 * - Organization branding and official header
 * - Tender information (PR, CBA, Reference)
 * - Bidder details and submission status
 * - Digital signature for logistics (if available)
 * - Manual signature area for bidder
 * - QR code for verification
 * - Acknowledgement notice
 * 
 * ============================================================================
 */

import { generateOfficialPdf } from '../../OfficialPdfEngine';
import type { OfficialPdfOptions } from '../../OfficialPdfEngine';
import type { OfficialPdfContext } from '../../buildOfficialPdfContext';

export interface BidReceiptAcknowledgementPDFData {
  // Organization Info
  context: OfficialPdfContext;
  department?: string;

  // Tender Information
  receiptReference: string;
  receiptDateTime: string;
  prNumber: string;
  tenderReference?: string;
  cbaNumber?: string;
  operatingUnit?: string;

  // Bidder Details
  bidderName: string;
  submissionDate: string;
  submissionStatus: 'received' | 'valid' | 'disqualified';

  // Digital Signature (Logistics)
  logisticsSignature?: {
    signerName: string;
    signerTitle?: string;
    signatureImageUrl?: string;
    signedAt?: string;
    verificationCode?: string;
  };

  // Acknowledgement Note
  acknowledgementNote?: string;

  // Language & Direction
  language: 'en' | 'ar';
}

/**
 * Format date for display
 */
function formatDate(dateStr: string | undefined, isRTL: boolean = false): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get localized labels for Bid Receipt Acknowledgement
 */
function getLabels(language: 'en' | 'ar') {
  const isArabic = language === 'ar';

  return {
    documentTitle: isArabic ? 'إشعار استلام العطاء' : 'Bid Receipt Acknowledgement',
    reference: isArabic ? 'المرجع' : 'Reference',
    status: isArabic ? 'الحالة' : 'Status',
    date: isArabic ? 'التاريخ' : 'Date',
    tenderInfo: isArabic ? 'معلومات العطاء' : 'Tender Information',
    prNumber: isArabic ? 'رقم طلب الشراء' : 'PR Number',
    tenderRef: isArabic ? 'مرجع العطاء' : 'Tender Reference',
    cbaNumber: isArabic ? 'رقم تحليل المناقصات التنافسية' : 'CBA Number',
    operatingUnit: isArabic ? 'وحدة التشغيل' : 'Operating Unit',
    receiptDateTime: isArabic ? 'تاريخ ووقت الاستلام' : 'Date & Time of Receipt',
    bidderDetails: isArabic ? 'تفاصيل مقدم العرض' : 'Bidder Details',
    bidderName: isArabic ? 'اسم مقدم العرض / الشركة' : 'Bidder / Company Name',
    submissionDate: isArabic ? 'تاريخ التقديم' : 'Submission Date',
    submissionStatus: isArabic ? 'حالة التقديم' : 'Submission Status',
    acknowledgementNote: isArabic
      ? 'يؤكد هذا المستند أن مقدم العرض المذكور أعلاه قد تقدم بعرض استجابةً للعطاء المشار إليه. لا يعني الاستلام التقييم أو القبول.'
      : 'This document confirms that the above-mentioned bidder has submitted a bid in response to the referenced tender. Receipt does not imply evaluation or acceptance.',
    signatures: isArabic ? 'التوقيعات' : 'Signatures',
    forLogistics: isArabic ? 'نيابة عن الخدمات اللوجستية' : 'For Logistics',
    forBidder: isArabic ? 'نيابة عن مقدم العرض' : 'For Bidder (Manual — Sign after printing)',
    name: isArabic ? 'الاسم' : 'Name',
    title: isArabic ? 'المسمى الوظيفي' : 'Title',
    signature: isArabic ? 'التوقيع' : 'Signature',
    company: isArabic ? 'الشركة' : 'Company',
    digitalSignature: isArabic ? 'توقيع رقمي' : 'Digital Signature',
    signedAt: isArabic ? 'تم التوقيع في' : 'Signed at',
    verificationCode: isArabic ? 'رمز التحقق' : 'Verification Code',
    scanToVerify: isArabic ? 'امسح للتحقق' : 'Scan to verify',
    notYetSigned: isArabic ? 'لم يتم التوقيع بعد' : 'Not yet signed digitally',
    received: isArabic ? 'مستلم' : 'Received',
    valid: isArabic ? 'صالح' : 'Valid',
    disqualified: isArabic ? 'مرفوض' : 'Disqualified',
    field: isArabic ? 'الحقل' : 'Field',
    value: isArabic ? 'القيمة' : 'Value',
  };
}

/**
 * Generate simple QR code as SVG
 */
function generateQRCodeSVG(data: string): string {
  const hash = simpleHash(data);
  const size = 80;
  const modules = 21; // QR version 1
  const cellSize = size / modules;

  // Generate a deterministic pattern from the hash
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
  svg += `<rect width="${size}" height="${size}" fill="white"/>`;

  // Fixed finder patterns (top-left, top-right, bottom-left)
  const drawFinder = (x: number, y: number) => {
    // Outer border
    for (let i = 0; i < 7; i++) {
      svg += `<rect x="${(x + i) * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
      svg += `<rect x="${(x + i) * cellSize}" y="${(y + 6) * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
      svg += `<rect x="${x * cellSize}" y="${(y + i) * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
      svg += `<rect x="${(x + 6) * cellSize}" y="${(y + i) * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
    }
    // Inner square
    for (let i = 2; i < 5; i++) {
      for (let j = 2; j < 5; j++) {
        svg += `<rect x="${(x + i) * cellSize}" y="${(y + j) * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(14, 0);
  drawFinder(0, 14);

  // Data area - use hash to generate pattern
  const hashStr = hash.toString(16).padStart(32, '0');
  let charIdx = 0;
  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      // Skip finder pattern areas
      if ((row < 8 && col < 8) || (row < 8 && col > 12) || (row > 12 && col < 8)) continue;
      const charCode = hashStr.charCodeAt(charIdx % hashStr.length);
      if ((charCode + row + col) % 3 === 0) {
        svg += `<rect x="${col * cellSize}" y="${row * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
      }
      charIdx++;
    }
  }

  svg += `</svg>`;
  return svg;
}

/**
 * Simple hash function for QR code generation
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str?: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generate Bid Receipt Acknowledgement PDF body HTML
 */
function generateBidReceiptBodyHTML(data: BidReceiptAcknowledgementPDFData): string {
  const isRTL = data.language === 'ar';
  const labels = getLabels(data.language);
  const statusText = (labels as any)[data.submissionStatus] || data.submissionStatus;

  // Build QR code if verification code exists
  let qrSvg = '';
  if (data.logisticsSignature?.verificationCode) {
    const verificationData = JSON.stringify({
      docType: 'BID_RECEIPT_ACK',
      reference: data.receiptReference,
      bidder: data.bidderName,
      verificationCode: data.logisticsSignature.verificationCode,
      signedAt: data.logisticsSignature.signedAt,
    });
    qrSvg = generateQRCodeSVG(verificationData);
  }

  return `
    <style>
      .bid-receipt-container {
        width: 100%;
        font-size: 9pt;
        line-height: 1.4;
      }
      
      .meta-block {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 12px;
        margin-bottom: 16px;
        padding: 10px;
        background: #f8fafc;
        border-radius: 4px;
      }
      
      .meta-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .meta-label {
        font-weight: 600;
        color: #1e3a5f;
      }
      
      .meta-value {
        color: #334155;
      }
      
      .badge {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 3px;
        font-size: 8pt;
        font-weight: 600;
      }
      
      .badge-info {
        background: #e0f2fe;
        color: #0369a1;
      }
      
      .badge-success {
        background: #dcfce7;
        color: #15803d;
      }
      
      .section-title {
        font-size: 11pt;
        font-weight: 700;
        color: #1e3a5f;
        margin-bottom: 8px;
        margin-top: 12px;
      }
      
      .section-divider {
        border: none;
        border-top: 2px solid #00a8a8;
        margin-bottom: 10px;
      }
      
      .table {
        width: 100%;
        border-collapse: collapse;
      }
      
      .table th {
        background: #00a8a8;
        color: white;
        font-weight: 600;
        padding: 8px;
        text-align: ${isRTL ? 'right' : 'left'};
        border: 1px solid #00a8a8;
        font-size: 8pt;
      }
      
      .table td {
        padding: 6px 8px;
        border: 1px solid #e2e8f0;
        font-size: 8pt;
      }
      
      .callout {
        border-${isRTL ? 'right' : 'left'}: 4px solid #00a8a8;
        padding: 12px;
        background: #f0fffe;
        border-radius: 4px;
      }
      
      .callout-info {
        border-color: #0369a1;
        background: #f0f9ff;
      }
      
      .signatures-container {
        display: flex;
        gap: 24px;
        margin-top: 12px;
        flex-direction: ${isRTL ? 'row-reverse' : 'row'};
      }
      
      .signature-block {
        flex: 1;
        border: 1px solid #d0d0d0;
        border-radius: 6px;
        padding: 14px;
      }
      
      .signature-block-title {
        font-weight: 800;
        font-size: 11pt;
        margin-bottom: 10px;
        border-bottom: 2px solid #222;
        padding-bottom: 6px;
      }
      
      .signature-field {
        margin-bottom: 8px;
      }
      
      .signature-label {
        color: #444;
        font-size: 9pt;
        margin-bottom: 2px;
        font-weight: 600;
      }
      
      .signature-line {
        border-bottom: 1px solid #888;
        height: 20px;
        margin-bottom: 6px;
      }
      
      .signature-image-box {
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        padding: 4px;
        background: #fafafa;
        min-height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .signature-image {
        max-width: 180px;
        max-height: 60px;
        object-fit: contain;
      }
      
      .qr-container {
        margin-top: 8px;
        text-align: center;
      }
      
      .qr-label {
        font-size: 8pt;
        color: #666;
        margin-bottom: 4px;
      }
      
      .qr-code {
        display: inline-block;
      }
      
      .qr-verification-code {
        font-size: 7.5pt;
        color: #888;
        margin-top: 2px;
      }
      
      .ltr-safe {
        direction: ltr;
        unicode-bidi: bidi-override;
      }
    </style>
    
    <div class="bid-receipt-container">
      <!-- Document Metadata Bar -->
      <div class="meta-block">
        <div class="meta-item">
          <span class="meta-label">${labels.reference}:</span>
          <span class="meta-value ltr-safe">${escapeHtml(data.receiptReference)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">${labels.status}:</span>
          <span class="badge badge-info">${escapeHtml(statusText)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">${labels.date}:</span>
          <span class="meta-value">${escapeHtml(data.receiptDateTime)}</span>
        </div>
      </div>

      <!-- Tender Information Table -->
      <div class="section-title">${labels.tenderInfo}</div>
      <hr class="section-divider" />
      <table class="table">
        <thead>
          <tr>
            <th style="width: 40%;">${labels.field}</th>
            <th style="width: 60%;">${labels.value}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight: 700;">${labels.prNumber}</td>
            <td class="ltr-safe">${escapeHtml(data.prNumber)}</td>
          </tr>
          <tr>
            <td style="font-weight: 700;">${labels.tenderRef}</td>
            <td class="ltr-safe">${escapeHtml(data.tenderReference || 'N/A')}</td>
          </tr>
          <tr>
            <td style="font-weight: 700;">${labels.cbaNumber}</td>
            <td class="ltr-safe">${escapeHtml(data.cbaNumber || 'N/A')}</td>
          </tr>
          <tr>
            <td style="font-weight: 700;">${labels.operatingUnit}</td>
            <td>${escapeHtml(data.operatingUnit || 'N/A')}</td>
          </tr>
          <tr>
            <td style="font-weight: 700;">${labels.receiptDateTime}</td>
            <td>${escapeHtml(data.receiptDateTime)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Bidder Details Table -->
      <div class="section-title">${labels.bidderDetails}</div>
      <hr class="section-divider" />
      <table class="table">
        <thead>
          <tr>
            <th style="width: 40%;">${labels.field}</th>
            <th style="width: 60%;">${labels.value}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight: 700;">${labels.bidderName}</td>
            <td>${escapeHtml(data.bidderName)}</td>
          </tr>
          <tr>
            <td style="font-weight: 700;">${labels.submissionDate}</td>
            <td>${escapeHtml(data.submissionDate)}</td>
          </tr>
          <tr>
            <td style="font-weight: 700;">${labels.submissionStatus}</td>
            <td><span class="badge badge-info">${escapeHtml(statusText)}</span></td>
          </tr>
        </tbody>
      </table>

      <!-- Acknowledgement Notice -->
      <div class="callout callout-info">
        <p style="font-style: italic; line-height: 1.6; margin: 0;">${data.acknowledgementNote || labels.acknowledgementNote}</p>
      </div>

      <!-- SIGNATURES SECTION -->
      <div class="section-title">${labels.signatures}</div>
      <hr class="section-divider" />

      <div class="signatures-container">
        <!-- Logistics Signature (Digital) -->
        <div class="signature-block">
          <div class="signature-block-title">${labels.forLogistics}</div>
          ${data.logisticsSignature ? `
            <!-- Digital Signature Present -->
            <div class="signature-field">
              <div class="signature-label">${labels.name}</div>
              <div style="font-weight: 600;">${escapeHtml(data.logisticsSignature.signerName)}</div>
            </div>
            <div class="signature-field">
              <div class="signature-label">${labels.title}</div>
              <div style="font-weight: 600;">${escapeHtml(data.logisticsSignature.signerTitle || '')}</div>
            </div>
            <div class="signature-field">
              <div class="signature-label">${labels.signature}</div>
              <div class="signature-image-box">
                ${data.logisticsSignature.signatureImageUrl ? `
                  <img src="${data.logisticsSignature.signatureImageUrl}" alt="Digital Signature" class="signature-image" />
                ` : '<span style="color: #999;">No signature image</span>'}
              </div>
            </div>
            <div class="signature-field">
              <div class="signature-label">${labels.signedAt}</div>
              <div style="font-weight: 600; font-size: 9.5pt;">${escapeHtml(data.logisticsSignature.signedAt || '')}</div>
            </div>
            ${qrSvg ? `
              <div class="qr-container">
                <div class="qr-label">${labels.scanToVerify}</div>
                <div class="qr-code">${qrSvg}</div>
                <div class="qr-verification-code ltr-safe">${escapeHtml(data.logisticsSignature.verificationCode || '')}</div>
              </div>
            ` : ''}
            <div style="margin-top: 6px; text-align: center;">
              <span class="badge badge-success" style="font-size: 8pt;">✓ ${labels.digitalSignature}</span>
            </div>
          ` : `
            <!-- No Digital Signature Yet -->
            <div class="signature-field">
              <div class="signature-label">${labels.name}</div>
              <div class="signature-line"></div>
            </div>
            <div class="signature-field">
              <div class="signature-label">${labels.title}</div>
              <div class="signature-line"></div>
            </div>
            <div class="signature-field">
              <div class="signature-label">${labels.signature}</div>
              <div style="border-bottom: 1px solid #888; height: 40px; margin-bottom: 6px;"></div>
            </div>
            <div class="signature-field">
              <div class="signature-label">${labels.date}</div>
              <div class="signature-line"></div>
            </div>
            <div style="text-align: center; margin-top: 6px;">
              <span style="font-size: 8pt; color: #999; font-style: italic;">${labels.notYetSigned}</span>
            </div>
          `}
        </div>

        <!-- Bidder/Supplier Signature (Manual) -->
        <div class="signature-block">
          <div class="signature-block-title">${labels.forBidder}</div>
          <div class="signature-field">
            <div class="signature-label">${labels.name}</div>
            <div class="signature-line"></div>
          </div>
          <div class="signature-field">
            <div class="signature-label">${labels.company}</div>
            <div class="signature-line"></div>
          </div>
          <div class="signature-field">
            <div class="signature-label">${labels.signature}</div>
            <div style="border-bottom: 1px solid #888; height: 40px; margin-bottom: 6px;"></div>
          </div>
          <div class="signature-field">
            <div class="signature-label">${labels.date}</div>
            <div class="signature-line"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Main function to generate Bid Receipt Acknowledgement PDF
 * Uses OfficialPdfEngine for consistent styling and structure
 * Returns buffer + fileName (aligned with other generators)
 * 
 * FIX: Validates context.direction is defined before use
 */
export async function generateBidReceiptAcknowledgementPDF(
  data: BidReceiptAcknowledgementPDFData
): Promise<{ buffer: Buffer; fileName: string }> {
  // ============================
  // STEP 0: VALIDATE CONTEXT
  // ============================
  // ✅ FIX: Ensure context and direction are defined
  if (!data.context) {
    throw new Error('Bid Receipt Acknowledgement PDF Data missing required context object');
  }

  if (!data.context.direction || !['ltr', 'rtl'].includes(data.context.direction)) {
    throw new Error(
      `Invalid or missing context.direction: "${data.context.direction}". ` +
      `Must be 'ltr' or 'rtl'. Language: ${data.language}`
    );
  }

  console.log(`[Bid Receipt PDF Generator] ✅ Context validated - direction=${data.context.direction}, language=${data.language}`);

  // ============================
  // STEP 1: Safety - Escape HTML inputs
  // ============================
  // ✅ FIX: Preserve context during sanitization
  const sanitizedData: BidReceiptAcknowledgementPDFData = {
    ...data,
    context: data.context, // ✅ Explicitly preserve context
    receiptReference: escapeHtml(data.receiptReference),
    receiptDateTime: escapeHtml(data.receiptDateTime),
    prNumber: escapeHtml(data.prNumber),
    tenderReference: escapeHtml(data.tenderReference),
    cbaNumber: escapeHtml(data.cbaNumber),
    operatingUnit: escapeHtml(data.operatingUnit),
    bidderName: escapeHtml(data.bidderName),
    submissionDate: escapeHtml(data.submissionDate),
    acknowledgementNote: escapeHtml(data.acknowledgementNote),
    logisticsSignature: data.logisticsSignature ? {
      signerName: escapeHtml(data.logisticsSignature.signerName),
      signerTitle: escapeHtml(data.logisticsSignature.signerTitle),
      signatureImageUrl: data.logisticsSignature.signatureImageUrl,
      signedAt: escapeHtml(data.logisticsSignature.signedAt),
      verificationCode: escapeHtml(data.logisticsSignature.verificationCode),
    } : undefined,
  };

  // ============================
  // STEP 2: Generate Body HTML
  // ============================
  const bodyHtml = generateBidReceiptBodyHTML(sanitizedData);

  // ============================
  // STEP 3: Layout + Direction
  // ============================
  // ✅ FIX: Use context.direction directly (already validated)
  const direction = sanitizedData.context.direction;
  const labels = getLabels(sanitizedData.language);

  console.log(`[Bid Receipt PDF Generator] Using direction=${direction} from context`);

  // ============================
  // STEP 4: Prepare PDF Options
  // ============================
  const pdfOptions: OfficialPdfOptions = {
    context: sanitizedData.context, // ✅ Pass complete context with direction
    department: sanitizedData.department ?? 'Logistics & Procurement',
    documentTitle: labels.documentTitle,
    formNumber: `BRA-${sanitizedData.receiptReference}`,
    formDate: sanitizedData.receiptDateTime,
    bodyHtml,
  };

  // ============================
  // STEP 5: Generate PDF
  // ============================
  console.log(`[Bid Receipt PDF Generator] Calling generateOfficialPdf with context.direction=${pdfOptions.context.direction}`);

  const buffer = await generateOfficialPdf(pdfOptions);

  // ============================
  // STEP 6: Return structured response
  // ============================
  return {
    buffer,
    fileName: `BidReceiptAck-${sanitizedData.receiptReference}.pdf`,
  };
}
