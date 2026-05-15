/**
 * ============================================================================
 * PURCHASE REQUEST (PR) PDF GENERATOR
 * ============================================================================
 * 
 * Generates professional Purchase Request PDFs using OfficialPdfEngine.
 * Produces real PDFs with:
 * - Selectable text
 * - Searchable content
 * - Real tables with line items
 * - Vector graphics (no pixelation)
 * - Standard official header with organization branding
 * - RTL/LTR support for Arabic/English
 * - Complete approval workflow signatures
 * - Integrated with System-Wide Official PDF Output Framework
 * 
 * ============================================================================
 */
import {
  generateOfficialPdf,
} from '../../OfficialPdfEngine';
import type { OfficialPdfOptions } from '../../OfficialPdfEngine';
import type { OfficialPdfContext } from '../../buildOfficialPdfContext';

export interface PurchaseRequestLineItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  recurrence?: number;
  totalPrice: number;
  prTotalUsd: number;
}

export interface PurchaseRequestPDFData {
  // Organization Info
  context: OfficialPdfContext;
  department?: string;
  
  // PR Details
  prNumber: string;
  prDate: string;
  projectTitle: string;
  category: string;
  urgency?: string;
  
  // Requester Info
  requesterName: string;
  requesterTitle?: string;
  
  // Budget & Financial
  donorName?: string;
  budgetCode?: string;
  currency: string;
  total: number;
  exchangeTo?: string;
  prTotalUsd: number;
  totalPrice: number;

  
  // Timeline
  neededBy?: string;
  
  // Content
  justification?: string;
  lineItems: PurchaseRequestLineItem[];
  
  // Approval Workflow
  approvals?: {
    requestedBy?: {
      name: string;
      title?: string;
      date?: string;
      signature?: string;
    };
    logisticsValidation?: {
      name: string;
      title?: string;
      date?: string;
      signature?: string;
    };
    financeValidation?: {
      name: string;
      title?: string;
      date?: string;
      signature?: string;
    };
    finalApproval?: {
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
 * Format currency safely
 */
function formatCurrency(
  amount?: number | string | null,
  currency: string = 'USD'
): string {

  const safeAmount = Number(amount || 0);

  return `${currency} ${safeAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Get localized labels for PR
 */
function getLabels(language: 'en' | 'ar') {
  const isArabic = language === 'ar';
  
  return {
    title: isArabic ? 'طلب شراء' : 'Purchase Request',
    prNumber: isArabic ? 'رقم الطلب' : 'PR Number',
    prDate: isArabic ? 'تاريخ الطلب' : 'PR Date',
    projectTitle: isArabic ? 'عنوان المشروع' : 'Project Title',
    category: isArabic ? 'الفئة' : 'Category',
    urgency: isArabic ? 'الأولوية' : 'Urgency',
    requester: isArabic ? 'مقدم الطلب' : 'Requester',
    donor: isArabic ? 'الجهة المانحة' : 'Donor',
    budgetCode: isArabic ? 'رمز الميزانية' : 'Budget Code',
    neededBy: isArabic ? 'مطلوب بحلول' : 'Needed By',
    justification: isArabic ? 'المبررات' : 'Justification',
    lineItems: isArabic ? 'بنود الطلب' : 'Line Items',
    description: isArabic ? 'الوصف' : 'Description',
    quantity: isArabic ? 'الكمية' : 'Qty',
    unit: isArabic ? 'الوحدة' : 'Unit',
    unitPrice: isArabic ? 'سعر الوحدة' : 'Unit Price',
    recurrence: isArabic ? 'التكرار' : 'Recurrence',
    totalPrice: isArabic ? 'إجمالي البند' : 'Line Total',
    prTotalUsd: isArabic ? 'الإجمالي' : 'Total',
    total: isArabic ? 'الإجمالي' : 'Total',
    approvals: isArabic ? 'سير الموافقات' : 'Approval Workflow',
    requestedBy: isArabic ? 'مقدم الطلب' : 'Requested By',
    logisticsValidation: isArabic ? 'اعتماد اللوجستيات' : 'Logistics Validation',
    financeValidation: isArabic ? 'اعتماد المالية' : 'Finance Validation',
    finalApproval: isArabic ? 'الاعتماد النهائي' : 'Final Approval',
    notSigned: isArabic ? 'لم يتم التوقيع بعد' : 'Not signed yet',
    signature: isArabic ? 'التوقيع' : 'Signature',
    date: isArabic ? 'التاريخ' : 'Date',
  };
}

/**
 * Generate PR-specific body HTML (content only, no wrapper)
 */
function generatePRBodyHTML(data: PurchaseRequestPDFData): string {
  const isRTL = data.language === 'ar';
  const labels = getLabels(data.language);
  const formattedDate = formatDate(data.prDate, isRTL);
  const neededByDate = formatDate(data.neededBy, isRTL);

  const lineItemsHtml = data.lineItems.map((item, idx) => `
    <tr>
      <td style="text-align: center; padding: 6px 8px; border: 1px solid #e2e8f0; font-size: 8pt;">${idx + 1}</td>
      <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-size: 8pt;">${item.description}</td>
      <td style="text-align: ${isRTL ? 'left' : 'right'}; padding: 6px 8px; border: 1px solid #e2e8f0; font-size: 8pt;">${item.quantity.toFixed(2)}</td>
      <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-size: 8pt;">${item.unit}</td>
      <td style="text-align: ${isRTL ? 'left' : 'right'}; padding: 6px 8px; border: 1px solid #e2e8f0; font-size: 8pt;">${formatCurrency(item.unitPrice, data.exchangeTo)}</td>
      <td style="text-align: center; padding: 6px 8px; border: 1px solid #e2e8f0; font-size: 8pt;">${item.recurrence || 1}</td>
      <td style="text-align: ${isRTL ? 'left' : 'right'}; padding: 6px 8px; border: 1px solid #e2e8f0; font-size: 8pt; font-weight: 600;">${formatCurrency(item.prTotalUsd, data.exchangeTo)}</td>
    </tr>
  `).join('');

  const approvalsHtml = `
    <div style="margin-top: 20px; page-break-inside: avoid;">
      <div style="font-size: 11pt; font-weight: 700; color: #1e3a5f; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #00a8a8;">
        ✓ ${labels.approvals}
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; font-size: 8pt;">
        <!-- Requested By -->
        <div style="text-align: center; padding: 10px; border: 1px solid #e2e8f0; border-radius: 4px;">
          <div style="font-weight: 600; margin-bottom: 8px;">${labels.requestedBy}</div>
          ${data.approvals?.requestedBy?.signature ? `
            <img src="${data.approvals.requestedBy.signature}" alt="Signature" style="height: 40px; margin: 8px 0; object-fit: contain;" />
          ` : `
            <div style="height: 40px; margin: 8px 0; border-bottom: 1px solid #999;"></div>
          `}
          <div style="margin-top: 8px; font-weight: 600;">${data.approvals?.requestedBy?.name || '-'}</div>
          <div style="font-size: 7pt; color: #666;">${data.approvals?.requestedBy?.title || ''}</div>
          <div style="font-size: 7pt; color: #666; margin-top: 4px;">${formatDate(data.approvals?.requestedBy?.date, isRTL)}</div>
        </div>

        <!-- Logistics Validation -->
        <div style="text-align: center; padding: 10px; border: 1px solid #e2e8f0; border-radius: 4px;">
          <div style="font-weight: 600; margin-bottom: 8px;">${labels.logisticsValidation}</div>
          ${data.approvals?.logisticsValidation?.signature ? `
            <img src="${data.approvals.logisticsValidation.signature}" alt="Signature" style="height: 40px; margin: 8px 0; object-fit: contain;" />
          ` : `
            <div style="height: 40px; margin: 8px 0; border-bottom: 1px solid #999;"></div>
          `}
          <div style="margin-top: 8px; font-weight: 600;">${data.approvals?.logisticsValidation?.name || '-'}</div>
          <div style="font-size: 7pt; color: #666;">${data.approvals?.logisticsValidation?.title || ''}</div>
          <div style="font-size: 7pt; color: #666; margin-top: 4px;">${formatDate(data.approvals?.logisticsValidation?.date, isRTL)}</div>
        </div>

        <!-- Finance Validation -->
        <div style="text-align: center; padding: 10px; border: 1px solid #e2e8f0; border-radius: 4px;">
          <div style="font-weight: 600; margin-bottom: 8px;">${labels.financeValidation}</div>
          ${data.approvals?.financeValidation?.signature ? `
            <img src="${data.approvals.financeValidation.signature}" alt="Signature" style="height: 40px; margin: 8px 0; object-fit: contain;" />
          ` : `
            <div style="height: 40px; margin: 8px 0; border-bottom: 1px solid #999;"></div>
          `}
          <div style="margin-top: 8px; font-weight: 600;">${data.approvals?.financeValidation?.name || '-'}</div>
          <div style="font-size: 7pt; color: #666;">${data.approvals?.financeValidation?.title || ''}</div>
          <div style="font-size: 7pt; color: #666; margin-top: 4px;">${formatDate(data.approvals?.financeValidation?.date, isRTL)}</div>
        </div>

        <!-- Final Approval -->
        <div style="text-align: center; padding: 10px; border: 1px solid #e2e8f0; border-radius: 4px;">
          <div style="font-weight: 600; margin-bottom: 8px;">${labels.finalApproval}</div>
          ${data.approvals?.finalApproval?.signature ? `
            <img src="${data.approvals.finalApproval.signature}" alt="Signature" style="height: 40px; margin: 8px 0; object-fit: contain;" />
          ` : `
            <div style="height: 40px; margin: 8px 0; border-bottom: 1px solid #999;"></div>
          `}
          <div style="margin-top: 8px; font-weight: 600;">${data.approvals?.finalApproval?.name || '-'}</div>
          <div style="font-size: 7pt; color: #666;">${data.approvals?.finalApproval?.title || ''}</div>
          <div style="font-size: 7pt; color: #666; margin-top: 4px;">${formatDate(data.approvals?.finalApproval?.date, isRTL)}</div>
        </div>
      </div>
    </div>
  `;

  return `
    <style>
      .pr-container {
        width: 100%;
        font-size: 9pt;
        line-height: 1.4;
      }
      
      .pr-section {
        padding: 10px 0;
        margin-bottom: 12px;
        page-break-inside: avoid;
      }
      
      .pr-section-title {
        font-size: 11pt;
        font-weight: 700;
        color: #1e3a5f;
        margin-bottom: 8px;
        padding-bottom: 4px;
        border-bottom: 2px solid #00a8a8;
      }
      
      .pr-metadata {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 12px;
      }
      
      .pr-metadata-item {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        border-bottom: 1px solid #f0f0f0;
      }
      
      .pr-metadata-label {
        font-weight: 600;
        color: #1e3a5f;
        width: 40%;
      }
      
      .pr-metadata-value {
        color: #334155;
        width: 60%;
        text-align: ${isRTL ? 'left' : 'right'};
      }
      
      .pr-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 12px;
      }
      
      .pr-table th {
        background: #00a8a8;
        color: white;
        font-weight: 600;
        padding: 8px;
        text-align: ${isRTL ? 'right' : 'left'};
        border: 1px solid #00a8a8;
        font-size: 8pt;
      }
      
      .pr-table td {
        padding: 6px 8px;
        border: 1px solid #e2e8f0;
        font-size: 8pt;
      }
      
      .pr-info-box {
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
    
    <div class="pr-container">
      <!-- PR METADATA SECTION -->
      <div class="pr-section">
        <div class="pr-section-title">📋 ${labels.prNumber}</div>
        <div class="pr-metadata">
          <div>
            <div class="pr-metadata-item">
              <span class="pr-metadata-label">${labels.prNumber}</span>
              <span class="pr-metadata-value">${data.prNumber}</span>
            </div>
            <div class="pr-metadata-item">
              <span class="pr-metadata-label">${labels.prDate}</span>
              <span class="pr-metadata-value">${formattedDate}</span>
            </div>
            <div class="pr-metadata-item">
              <span class="pr-metadata-label">${labels.projectTitle}</span>
              <span class="pr-metadata-value">${data.projectTitle || '-'}</span>
            </div>
            <div class="pr-metadata-item">
              <span class="pr-metadata-label">${labels.category}</span>
              <span class="pr-metadata-value">${data.category || '-'}</span>
            </div>
          </div>
          <div>
            <div class="pr-metadata-item">
              <span class="pr-metadata-label">${labels.requester}</span>
              <span class="pr-metadata-value">${data.requesterName || '-'}</span>
            </div>
            <div class="pr-metadata-item">
              <span class="pr-metadata-label">${labels.urgency}</span>
              <span class="pr-metadata-value">${data.urgency || '-'}</span>
            </div>
            <div class="pr-metadata-item">
              <span class="pr-metadata-label">${labels.neededBy}</span>
              <span class="pr-metadata-value">${neededByDate}</span>
            </div>
            <div class="pr-metadata-item">
              <span class="pr-metadata-label">${labels.total}</span>
              <span class="pr-metadata-value" style="font-weight: 700; color: #00a8a8;">${formatCurrency(data.prTotalUsd, data.exchangeTo)}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- BUDGET SECTION -->
      <div class="pr-section">
        <div class="pr-section-title">💰 ${labels.budgetCode}</div>
        <div class="pr-metadata">
          <div>
            <div class="pr-metadata-item">
              <span class="pr-metadata-label">${labels.donor}</span>
              <span class="pr-metadata-value">${data.donorName || '-'}</span>
            </div>
          </div>
          <div>
            <div class="pr-metadata-item">
              <span class="pr-metadata-label">${labels.budgetCode}</span>
              <span class="pr-metadata-value">${data.budgetCode || '-'}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- LINE ITEMS SECTION -->
      <div class="pr-section no-break">
        <div class="pr-section-title">📦 ${labels.lineItems}</div>
        <table class="pr-table">
          <thead>
            <tr>
              <th style="width: 5%; text-align: center;">#</th>
              <th style="width: 25%;">${labels.description}</th>
              <th style="width: 12%; text-align: center;">${labels.quantity}</th>
              <th style="width: 10%;">${labels.unit}</th>
              <th style="width: 15%; text-align: right;">${labels.unitPrice}</th>
              <th style="width: 8%; text-align: center;">${labels.recurrence}</th>
              <th style="width: 15%; text-align: right;">${labels.totalPrice}</th>
            </tr>
          </thead>
          <tbody>
            ${lineItemsHtml}
          </tbody>
          <tfoot>
            <tr style="background: #f3f4f6; font-weight: 700;">
              <td colspan="6" style="text-align: ${isRTL ? 'left' : 'right'}; padding: 8px; border: 1px solid #e2e8f0;">${labels.total}:</td>
              <td style="text-align: ${isRTL ? 'left' : 'right'}; padding: 8px; border: 1px solid #e2e8f0; color: #00a8a8;">${formatCurrency(data.prTotalUsd, data.exchangeTo)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      <!-- JUSTIFICATION SECTION -->
      ${data.justification ? `
      <div class="pr-section">
        <div class="pr-section-title">📝 ${labels.justification}</div>
        <div class="pr-info-box">
          ${data.justification}
        </div>
      </div>
      ` : ''}
      
      <!-- APPROVAL WORKFLOW SECTION -->
      ${approvalsHtml}
    </div>
  `;
}

/**
 * Main function to generate PR PDF
 * Uses OfficialPdfEngine for consistent styling and structure
 * Returns buffer + fileName (aligned with BOM)
 */
export async function generatePDF(
  data: PurchaseRequestPDFData
): Promise<{ buffer: Buffer; fileName: string }> {
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

  const sanitizeLineItem = (item: PurchaseRequestLineItem): PurchaseRequestLineItem => ({
    ...item,
    description: escapeHtml(item.description),
    unit: escapeHtml(item.unit),
  });

  // Sanitize user-input fields
  const sanitizedData: PurchaseRequestPDFData = {
    ...data,
    projectTitle: escapeHtml(data.projectTitle),
    category: escapeHtml(data.category),
    urgency: escapeHtml(data.urgency),
    requesterName: escapeHtml(data.requesterName),
    requesterTitle: escapeHtml(data.requesterTitle),
    donorName: escapeHtml(data.donorName),
    budgetCode: escapeHtml(data.budgetCode),
    justification: escapeHtml(data.justification),
    exchangeTo: escapeHtml(data.exchangeTo),
    lineItems: (data.lineItems || []).map(sanitizeLineItem),

    approvals: data.approvals
      ? {
          requestedBy: data.approvals.requestedBy
            ? {
                ...data.approvals.requestedBy,
                name: escapeHtml(data.approvals.requestedBy.name),
                title: escapeHtml(data.approvals.requestedBy.title),
              }
            : undefined,
          logisticsValidation: data.approvals.logisticsValidation
            ? {
                ...data.approvals.logisticsValidation,
                name: escapeHtml(data.approvals.logisticsValidation.name),
                title: escapeHtml(data.approvals.logisticsValidation.title),
              }
            : undefined,
          financeValidation: data.approvals.financeValidation
            ? {
                ...data.approvals.financeValidation,
                name: escapeHtml(data.approvals.financeValidation.name),
                title: escapeHtml(data.approvals.financeValidation.title),
              }
            : undefined,
          finalApproval: data.approvals.finalApproval
            ? {
                ...data.approvals.finalApproval,
                name: escapeHtml(data.approvals.finalApproval.name),
                title: escapeHtml(data.approvals.finalApproval.title),
              }
            : undefined,
        }
      : undefined,
  };

  // ============================
  // STEP 2: Generate Body HTML
  // ============================
  const bodyHtml = generatePRBodyHTML(sanitizedData);

  // ============================
  // STEP 3: Layout + Direction
  // ============================
  const direction = sanitizedData.language === "ar" ? "rtl" : "ltr";
  const labels = getLabels(sanitizedData.language);

  // ============================
  // STEP 4: Prepare PDF Options
  // ============================
  const pdfOptions: OfficialPdfOptions = {
    context: sanitizedData.context,

    // Avoid hardcoding Procurement (multi-module ready)
    department: sanitizedData.department ?? "",

    documentTitle: labels.title,
    formNumber: `PR-${sanitizedData.prNumber}`,
    formDate: formatDate(
      sanitizedData.prDate,
      direction === "rtl"
    ),

    bodyHtml,
  };

  // ============================
  // STEP 5: Generate PDF
  // ============================
  const buffer = await generateOfficialPdf(pdfOptions);

  // ============================
  // STEP 6: Return structured response
  // ============================
  return {
    buffer,
    fileName: `PR-${sanitizedData.prNumber}.pdf`,
  };
}
