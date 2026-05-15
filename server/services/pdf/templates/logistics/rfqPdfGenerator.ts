/**
 * ============================================================================
 * REQUEST FOR QUOTATION (RFQ) PDF GENERATOR - FIXED
 * ============================================================================
 * 
 * FIX: Migrated from custom HTML generation to OfficialPdfEngine
 * - Uses centralized PDF context (buildOfficialPdfContext)
 * - Ensures context.direction is always defined
 * - Consistent with prPdfGenerator, bomPdfGenerator, and grnPDFGenerator
 * - Bilingual support (English & Arabic with RTL/LTR)
 * 
 * Generates professional Request for Quotation (RFQ) documents with:
 * - Organization branding and official header
 * - RFQ details and PR reference
 * - Line items with specifications
 * - Submission instructions
 * - Terms & conditions
 * - Approval signatures
 * 
 * ============================================================================
 */

import { generateOfficialPdf } from '../../OfficialPdfEngine';
import type { OfficialPdfOptions } from '../../OfficialPdfEngine';
import type { OfficialPdfContext } from '../../buildOfficialPdfContext';

export interface RFQLineItem {
  description: string;
  specifications?: string;
  quantity: number;
  unit: string;
  purpose?: string;
}

export interface RFQPDFData {
  // Organization Info
  context: OfficialPdfContext;
  department?: string;

  // RFQ Details
  rfqNumber: string;
  issueDate: string;
  submissionDeadline?: string;

  // PR Reference
  prNumber: string;
  requesterName?: string;
  priority?: string;
  requiredDeliveryDate?: string;

  // Content
  justification?: string;
  lineItems: RFQLineItem[];

  // Submission Instructions
  submissionInstructions?: {
    format?: string;
    currency?: string;
    deliveryTerms?: string;
    warranty?: string;
    validity?: string;
    reference?: string;
  };

  // Terms & Conditions
  termsAndConditions?: string[];

  // Approval Workflow
  approvals?: {
    preparedBy?: {
      name: string;
      title?: string;
      date?: string;
      signature?: string;
    };
    reviewedBy?: {
      name: string;
      title?: string;
      date?: string;
      signature?: string;
    };
    approvedBy?: {
      name: string;
      title?: string;
      date?: string;
      signature?: string;
    };
  };

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
 * Get localized labels for RFQ
 */
function getLabels(language: 'en' | 'ar') {
  const isArabic = language === 'ar';

  return {
    title: isArabic ? 'طلب عرض أسعار' : 'Request for Quotation',
    rfqNumber: isArabic ? 'رقم طلب عرض الأسعار' : 'RFQ Number',
    issueDate: isArabic ? 'تاريخ الإصدار' : 'Issue Date',
    submissionDeadline: isArabic ? 'الموعد النهائي للتقديم' : 'Submission Deadline',
    prNumber: isArabic ? 'رقم طلب الشراء' : 'PR Number',
    requester: isArabic ? 'مقدم الطلب' : 'Requester',
    priority: isArabic ? 'الأولوية' : 'Priority',
    requiredDeliveryDate: isArabic ? 'تاريخ التسليم المطلوب' : 'Required Delivery Date',
    justification: isArabic ? 'المبرر' : 'Justification',
    itemsRequested: isArabic ? 'البنود المطلوبة' : 'Items Requested',
    description: isArabic ? 'الوصف' : 'Description',
    specifications: isArabic ? 'المواصفات' : 'Specifications',
    quantity: isArabic ? 'الكمية' : 'Qty',
    unit: isArabic ? 'الوحدة' : 'Unit',
    purpose: isArabic ? 'الغرض' : 'Purpose',
    submissionInstructions: isArabic ? 'تعليمات التقديم' : 'Submission Instructions',
    format: isArabic ? 'الصيغة' : 'Format',
    currency: isArabic ? 'العملة' : 'Currency',
    deliveryTerms: isArabic ? 'شروط التسليم' : 'Delivery Terms',
    warranty: isArabic ? 'الضمان' : 'Warranty',
    validity: isArabic ? 'الصلاحية' : 'Validity',
    reference: isArabic ? 'المرجع' : 'Reference',
    termsAndConditions: isArabic ? 'الشروط والأحكام' : 'Terms & Conditions',
    approvals: isArabic ? 'التوقيعات' : 'Approvals',
    preparedBy: isArabic ? 'أعدّه' : 'Prepared By',
    reviewedBy: isArabic ? 'راجعه' : 'Reviewed By',
    approvedBy: isArabic ? 'اعتمده' : 'Approved By',
  };
}

/**
 * Generate RFQ-specific body HTML (content only, no wrapper)
 */
function generateRFQBodyHTML(data: RFQPDFData): string {
  const isRTL = data.language === 'ar';
  const labels = getLabels(data.language);
  const formattedIssueDate = formatDate(data.issueDate, isRTL);
  const formattedDeadline = formatDate(data.submissionDeadline, isRTL);
  const formattedDeliveryDate = formatDate(data.requiredDeliveryDate, isRTL);

  // Build approvals HTML
  const approvalsHtml = data.approvals ? `
    <div class="rfq-section no-break">
      <div class="rfq-section-title">✍️ ${labels.approvals}</div>
      <table class="rfq-table" style="text-align:center;">
        <tbody>
          <tr>
            ${data.approvals.preparedBy ? `
            <td style="width:33%;">
              <div style="min-height:60px;"></div>
              <div style="margin-top:6px; font-weight:600;">${data.approvals.preparedBy.name}</div>
              <div style="font-size:8pt; color:#64748b;">${data.approvals.preparedBy.title || labels.preparedBy}</div>
              <div style="font-size:7pt; color:#94a3b8;">${data.approvals.preparedBy.date || ''}</div>
            </td>
            ` : ''}
            ${data.approvals.reviewedBy ? `
            <td style="width:33%;">
              <div style="min-height:60px;"></div>
              <div style="margin-top:6px; font-weight:600;">${data.approvals.reviewedBy.name}</div>
              <div style="font-size:8pt; color:#64748b;">${data.approvals.reviewedBy.title || labels.reviewedBy}</div>
              <div style="font-size:7pt; color:#94a3b8;">${data.approvals.reviewedBy.date || ''}</div>
            </td>
            ` : ''}
            ${data.approvals.approvedBy ? `
            <td style="width:33%;">
              <div style="min-height:60px;"></div>
              <div style="margin-top:6px; font-weight:600;">${data.approvals.approvedBy.name}</div>
              <div style="font-size:8pt; color:#64748b;">${data.approvals.approvedBy.title || labels.approvedBy}</div>
              <div style="font-size:7pt; color:#94a3b8;">${data.approvals.approvedBy.date || ''}</div>
            </td>
            ` : ''}
          </tr>
        </tbody>
      </table>
    </div>
  ` : '';

  // Build terms and conditions HTML
  const termsHtml = data.termsAndConditions && data.termsAndConditions.length > 0 ? `
    <div class="rfq-section no-break">
      <div class="rfq-section-title">📋 ${labels.termsAndConditions}</div>
      <ul style="margin-left:20px; line-height:1.6;">
        ${data.termsAndConditions.map(term => `<li style="margin-bottom:6px;">${term}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  return `
    <style>
      .rfq-container {
        width: 100%;
        font-size: 9pt;
        line-height: 1.4;
      }
      
      .rfq-section {
        padding: 10px 0;
        margin-bottom: 12px;
        page-break-inside: avoid;
      }
      
      .rfq-section-title {
        font-size: 11pt;
        font-weight: 700;
        color: #1e3a5f;
        margin-bottom: 8px;
        padding-bottom: 4px;
        border-bottom: 2px solid #00a8a8;
      }
      
      .rfq-metadata {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 12px;
      }
      
      .rfq-metadata-item {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        border-bottom: 1px solid #f0f0f0;
      }
      
      .rfq-metadata-label {
        font-weight: 600;
        color: #1e3a5f;
        width: 40%;
      }
      
      .rfq-metadata-value {
        color: #334155;
        width: 60%;
        text-align: ${isRTL ? 'left' : 'right'};
      }
      
      .rfq-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 12px;
      }
      
      .rfq-table th {
        background: #00a8a8;
        color: white;
        font-weight: 600;
        padding: 8px;
        text-align: ${isRTL ? 'right' : 'left'};
        border: 1px solid #00a8a8;
        font-size: 8pt;
      }
      
      .rfq-table td {
        padding: 6px 8px;
        border: 1px solid #e2e8f0;
        font-size: 8pt;
      }
      
      .rfq-info-box {
        background: #f8fafc;
        border-${isRTL ? 'right' : 'left'}: 4px solid #00a8a8;
        padding: 12px;
        margin-bottom: 10px;
        white-space: pre-wrap;
      }
      
      .no-break {
        page-break-inside: avoid;
      }
    </style>
    
    <div class="rfq-container">
      <!-- RFQ METADATA SECTION -->
      <div class="rfq-section">
        <div class="rfq-section-title">📋 ${labels.rfqNumber}</div>
        <div class="rfq-metadata">
          <div>
            <div class="rfq-metadata-item">
              <span class="rfq-metadata-label">${labels.rfqNumber}</span>
              <span class="rfq-metadata-value">${data.rfqNumber}</span>
            </div>
            <div class="rfq-metadata-item">
              <span class="rfq-metadata-label">${labels.issueDate}</span>
              <span class="rfq-metadata-value">${formattedIssueDate}</span>
            </div>
            <div class="rfq-metadata-item">
              <span class="rfq-metadata-label">${labels.submissionDeadline}</span>
              <span class="rfq-metadata-value">${formattedDeadline}</span>
            </div>
          </div>
          <div>
            <div class="rfq-metadata-item">
              <span class="rfq-metadata-label">${labels.prNumber}</span>
              <span class="rfq-metadata-value">${data.prNumber || '-'}</span>
            </div>
            <div class="rfq-metadata-item">
              <span class="rfq-metadata-label">${labels.requester}</span>
              <span class="rfq-metadata-value">${data.requesterName || '-'}</span>
            </div>
            <div class="rfq-metadata-item">
              <span class="rfq-metadata-label">${labels.priority}</span>
              <span class="rfq-metadata-value">${data.priority || '-'}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- DELIVERY SECTION -->
      <div class="rfq-section">
        <div class="rfq-section-title">📦 ${labels.requiredDeliveryDate}</div>
        <div class="rfq-metadata">
          <div>
            <div class="rfq-metadata-item">
              <span class="rfq-metadata-label">${labels.requiredDeliveryDate}</span>
              <span class="rfq-metadata-value">${formattedDeliveryDate}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- LINE ITEMS SECTION -->
      <div class="rfq-section no-break">
        <div class="rfq-section-title">📦 ${labels.itemsRequested}</div>
        <table class="rfq-table">
          <thead>
            <tr>
              <th style="width:5%;">#</th>
              <th style="width:30%;">${labels.description}</th>
              <th style="width:20%;">${labels.specifications}</th>
              <th style="width:10%;">${labels.quantity}</th>
              <th style="width:10%;">${labels.unit}</th>
              <th style="width:25%;">${labels.purpose}</th>
            </tr>
          </thead>
          <tbody>
            ${(data.lineItems || []).map((item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.description || '-'}</td>
                <td>${item.specifications || '-'}</td>
                <td style="text-align:center;">${item.quantity || 0}</td>
                <td style="text-align:center;">${item.unit || '-'}</td>
                <td>${item.purpose || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <!-- JUSTIFICATION SECTION -->
      ${data.justification ? `
      <div class="rfq-section no-break">
        <div class="rfq-section-title">📝 ${labels.justification}</div>
        <div class="rfq-info-box">
          ${data.justification}
        </div>
      </div>
      ` : ''}

      <!-- SUBMISSION INSTRUCTIONS SECTION -->
      ${data.submissionInstructions ? `
      <div class="rfq-section no-break">
        <div class="rfq-section-title">📬 ${labels.submissionInstructions}</div>
        ${data.submissionInstructions.format ? `
        <div class="rfq-info-box">
          <strong>${labels.format}:</strong><br/>
          ${data.submissionInstructions.format}
        </div>
        ` : ''}
        ${data.submissionInstructions.currency ? `
        <div class="rfq-info-box">
          <strong>${labels.currency}:</strong><br/>
          ${data.submissionInstructions.currency}
        </div>
        ` : ''}
        ${data.submissionInstructions.deliveryTerms ? `
        <div class="rfq-info-box">
          <strong>${labels.deliveryTerms}:</strong><br/>
          ${data.submissionInstructions.deliveryTerms}
        </div>
        ` : ''}
        ${data.submissionInstructions.warranty ? `
        <div class="rfq-info-box">
          <strong>${labels.warranty}:</strong><br/>
          ${data.submissionInstructions.warranty}
        </div>
        ` : ''}
        ${data.submissionInstructions.validity ? `
        <div class="rfq-info-box">
          <strong>${labels.validity}:</strong><br/>
          ${data.submissionInstructions.validity}
        </div>
        ` : ''}
        ${data.submissionInstructions.reference ? `
        <div class="rfq-info-box">
          <strong>${labels.reference}:</strong><br/>
          ${data.submissionInstructions.reference}
        </div>
        ` : ''}
      </div>
      ` : ''}

      <!-- TERMS AND CONDITIONS SECTION -->
      ${termsHtml}

      <!-- APPROVAL WORKFLOW SECTION -->
      ${approvalsHtml}
    </div>
  `;
}

/**
 * Main function to generate RFQ PDF
 * Uses OfficialPdfEngine for consistent styling and structure
 * Returns buffer + fileName (aligned with prPdfGenerator)
 * 
 * FIX: Validates context.direction is defined before use
 */
export async function generateRFQPDF(
  data: RFQPDFData
): Promise<{ buffer: Buffer; fileName: string }> {
  // ============================
  // STEP 0: VALIDATE CONTEXT
  // ============================
  // ✅ FIX: Ensure context and direction are defined
  if (!data.context) {
    throw new Error('RFQ PDF Data missing required context object');
  }

  if (!data.context.direction || !['ltr', 'rtl'].includes(data.context.direction)) {
    throw new Error(
      `Invalid or missing context.direction: "${data.context.direction}". ` +
      `Must be 'ltr' or 'rtl'. Language: ${data.language}`
    );
  }

  console.log(`[RFQ PDF Generator] ✅ Context validated - direction=${data.context.direction}, language=${data.language}`);

  // ============================
  // STEP 1: Safety - Escape HTML inputs
  // ============================
  const escapeHtml = (str?: string): string => {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };

  const sanitizeLineItem = (item: RFQLineItem): RFQLineItem => ({
    ...item,
    description: escapeHtml(item.description),
    specifications: escapeHtml(item.specifications),
    purpose: escapeHtml(item.purpose),
    unit: escapeHtml(item.unit),
  });

  // Sanitize user-input fields
  // ✅ FIX: Preserve context during sanitization
  const sanitizedData: RFQPDFData = {
    ...data,
    context: data.context, // ✅ Explicitly preserve context
    rfqNumber: escapeHtml(data.rfqNumber),
    prNumber: escapeHtml(data.prNumber),
    requesterName: escapeHtml(data.requesterName),
    priority: escapeHtml(data.priority),
    justification: escapeHtml(data.justification),
    lineItems: (data.lineItems || []).map(sanitizeLineItem),
    submissionInstructions: data.submissionInstructions ? {
      format: escapeHtml(data.submissionInstructions.format),
      currency: escapeHtml(data.submissionInstructions.currency),
      deliveryTerms: escapeHtml(data.submissionInstructions.deliveryTerms),
      warranty: escapeHtml(data.submissionInstructions.warranty),
      validity: escapeHtml(data.submissionInstructions.validity),
      reference: escapeHtml(data.submissionInstructions.reference),
    } : undefined,
    termsAndConditions: (data.termsAndConditions || []).map(escapeHtml),
    approvals: data.approvals ? {
      preparedBy: data.approvals.preparedBy ? {
        ...data.approvals.preparedBy,
        name: escapeHtml(data.approvals.preparedBy.name),
        title: escapeHtml(data.approvals.preparedBy.title),
      } : undefined,
      reviewedBy: data.approvals.reviewedBy ? {
        ...data.approvals.reviewedBy,
        name: escapeHtml(data.approvals.reviewedBy.name),
        title: escapeHtml(data.approvals.reviewedBy.title),
      } : undefined,
      approvedBy: data.approvals.approvedBy ? {
        ...data.approvals.approvedBy,
        name: escapeHtml(data.approvals.approvedBy.name),
        title: escapeHtml(data.approvals.approvedBy.title),
      } : undefined,
    } : undefined,
  };

  // ============================
  // STEP 2: Generate Body HTML
  // ============================
  const bodyHtml = generateRFQBodyHTML(sanitizedData);

  // ============================
  // STEP 3: Layout + Direction
  // ============================
  // ✅ FIX: Use context.direction directly (already validated)
  const direction = sanitizedData.context.direction;
  const labels = getLabels(sanitizedData.language);

  console.log(`[RFQ PDF Generator] Using direction=${direction} from context`);

  // ============================
  // STEP 4: Prepare PDF Options
  // ============================
  const pdfOptions: OfficialPdfOptions = {
    context: sanitizedData.context, // ✅ Pass complete context with direction
    department: sanitizedData.department ?? "Procurement",
    documentTitle: labels.title,
    formNumber: `RFQ-${sanitizedData.rfqNumber}`,
    formDate: formatDate(
      sanitizedData.issueDate,
      direction === "rtl"
    ),
    bodyHtml,
  };

  // ============================
  // STEP 5: Generate PDF
  // ============================
  console.log(`[RFQ PDF Generator] Calling generateOfficialPdf with context.direction=${pdfOptions.context.direction}`);

  const buffer = await generateOfficialPdf(pdfOptions);

  // ============================
  // STEP 6: Return structured response
  // ============================
  return {
    buffer,
    fileName: `RFQ-${sanitizedData.rfqNumber}.pdf`,
  };
}
