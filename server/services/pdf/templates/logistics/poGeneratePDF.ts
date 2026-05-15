/**
 * ============================================================================
 * PURCHASE ORDER (PO) PDF GENERATOR
 * ============================================================================
 * 
 * Main function to generate PO PDF
 * Uses OfficialPdfEngine for consistent styling and structure
 * Returns Buffer
 * 
 * FIX: Validates context.direction is defined before use
 * 
 * Generates professional Purchase Order documents with:
 * - Organization branding and official header
 * - PO details (number, date, supplier, delivery info)
 * - Line items with descriptions, quantities, unit prices, and totals
 * - Payment terms and delivery location
 * - Terms & conditions
 * - Approval signatures
 * - Bilingual support (English & Arabic with RTL/LTR)
 * 
 * Uses centralized PDF context (buildOfficialPdfContext) and OfficialPdfEngine
 * for consistent formatting across all logistics documents.
 * 
 * ============================================================================
 */

import { generateOfficialPdf } from '../../OfficialPdfEngine';
import type { OfficialPdfOptions } from '../../OfficialPdfEngine';
import type { OfficialPdfContext } from '../../buildOfficialPdfContext';

export interface POLineItem {
  id?: number;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface POPDFData {
  // Organization & Context
  context: OfficialPdfContext;
  department?: string;

  // PO Details
  poNumber: string;
  poDate: string;
  supplierId?: number;
  supplierName?: string;
  supplierAddress?: string;

  // PR Reference
  prNumber?: string;
  prReference?: string;

  // Delivery Information
  deliveryDate?: string;
  deliveryLocation?: string;
  paymentTerms?: string;

  // Financial Information
  currency: string;
  lineItems: POLineItem[];
  totalAmount: number;

  // Additional Information
  remarks?: string;
  termsAndConditions?: string[];

  // Approval Workflow
  approvals?: {
    preparedBy?: {
      name: string;
      title?: string;
      date?: string;
    };
    reviewedBy?: {
      name: string;
      title?: string;
      date?: string;
    };
    authorizedBy?: {
      name: string;
      title?: string;
      date?: string;
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
  try {
    return new Date(dateStr).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format currency value
 */
function formatCurrency(value: number, currency: string): string {
  return `${currency} ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Get localized labels for PO
 */
function getLabels(language: 'en' | 'ar') {
  const isArabic = language === 'ar';

  return {
    title: isArabic ? 'أمر شراء' : 'Purchase Order',
    poNumber: isArabic ? 'رقم أمر الشراء' : 'PO Number',
    poDate: isArabic ? 'تاريخ الأمر' : 'PO Date',
    supplier: isArabic ? 'المورد' : 'Supplier',
    supplierAddress: isArabic ? 'عنوان المورد' : 'Supplier Address',
    prReference: isArabic ? 'مرجع طلب الشراء' : 'PR Reference',
    deliveryDate: isArabic ? 'تاريخ التسليم' : 'Delivery Date',
    deliveryLocation: isArabic ? 'موقع التسليم' : 'Delivery Location',
    paymentTerms: isArabic ? 'شروط الدفع' : 'Payment Terms',
    lineItems: isArabic ? 'بنود الأمر' : 'Line Items',
    itemNo: isArabic ? 'رقم' : 'Item #',
    description: isArabic ? 'الوصف' : 'Description',
    quantity: isArabic ? 'الكمية' : 'Qty',
    unit: isArabic ? 'الوحدة' : 'Unit',
    unitPrice: isArabic ? 'سعر الوحدة' : 'Unit Price',
    total: isArabic ? 'الإجمالي' : 'Total',
    totalAmount: isArabic ? 'المبلغ الإجمالي' : 'Total Amount',
    remarks: isArabic ? 'ملاحظات' : 'Remarks',
    termsAndConditions: isArabic ? 'الشروط والأحكام' : 'Terms & Conditions',
    approvals: isArabic ? 'التوقيعات' : 'Approvals',
    preparedBy: isArabic ? 'أعد بواسطة' : 'Prepared By',
    reviewedBy: isArabic ? 'راجع بواسطة' : 'Reviewed By',
    authorizedBy: isArabic ? 'اعتمد بواسطة' : 'Authorized By',
  };
}

/**
 * Safety - Escape HTML inputs to prevent injection
 */
function escapeHtml(str?: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate PO-specific body HTML (content only, no wrapper)
 */
function generatePOBodyHTML(data: POPDFData): string {
  const isRTL = data.language === 'ar';
  const labels = getLabels(data.language);
  const formattedPODate = formatDate(data.poDate, isRTL);
  const formattedDeliveryDate = formatDate(data.deliveryDate, isRTL);

  // Build line items table
  const lineItemsHtml = `
    <table class="po-table">
      <thead>
        <tr>
          <th style="width: 5%;">${labels.itemNo}</th>
          <th style="width: 40%;">${labels.description}</th>
          <th style="width: 12%; text-align: center;">${labels.quantity}</th>
          <th style="width: 12%; text-align: center;">${labels.unit}</th>
          <th style="width: 15%; text-align: right;">${labels.unitPrice}</th>
          <th style="width: 16%; text-align: right;">${labels.total}</th>
        </tr>
      </thead>
      <tbody>
        ${data.lineItems.map((item, idx) => `
          <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td>${escapeHtml(item.description)}</td>
            <td style="text-align: center;">${item.quantity}</td>
            <td style="text-align: center;">${escapeHtml(item.unit)}</td>
            <td style="text-align: right;">${formatCurrency(item.unitPrice, data.currency)}</td>
            <td style="text-align: right;">${formatCurrency(item.totalPrice, data.currency)}</td>
          </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr class="po-total-row">
          <td colSpan="5" style="text-align: right; font-weight: 700;">${labels.totalAmount}</td>
          <td style="text-align: right; font-weight: 700;">${formatCurrency(data.totalAmount, data.currency)}</td>
        </tr>
      </tfoot>
    </table>
  `;

  // Build approvals HTML
  const approvalsHtml = data.approvals ? `
    <div class="po-section no-break">
      <div class="po-section-title">✍️ ${labels.approvals}</div>
      <table class="po-approvals-table">
        <tbody>
          <tr>
            ${data.approvals.preparedBy ? `
            <td>
              <div style="min-height: 60px;"></div>
              <div style="margin-top: 6px; font-weight: 600;">${escapeHtml(data.approvals.preparedBy.name)}</div>
              <div style="font-size: 8pt; color: #64748b;">${escapeHtml(data.approvals.preparedBy.title || labels.preparedBy)}</div>
              <div style="font-size: 7pt; color: #94a3b8;">${escapeHtml(data.approvals.preparedBy.date || '')}</div>
            </td>
            ` : ''}
            ${data.approvals.reviewedBy ? `
            <td>
              <div style="min-height: 60px;"></div>
              <div style="margin-top: 6px; font-weight: 600;">${escapeHtml(data.approvals.reviewedBy.name)}</div>
              <div style="font-size: 8pt; color: #64748b;">${escapeHtml(data.approvals.reviewedBy.title || labels.reviewedBy)}</div>
              <div style="font-size: 7pt; color: #94a3b8;">${escapeHtml(data.approvals.reviewedBy.date || '')}</div>
            </td>
            ` : ''}
            ${data.approvals.authorizedBy ? `
            <td>
              <div style="min-height: 60px;"></div>
              <div style="margin-top: 6px; font-weight: 600;">${escapeHtml(data.approvals.authorizedBy.name)}</div>
              <div style="font-size: 8pt; color: #64748b;">${escapeHtml(data.approvals.authorizedBy.title || labels.authorizedBy)}</div>
              <div style="font-size: 7pt; color: #94a3b8;">${escapeHtml(data.approvals.authorizedBy.date || '')}</div>
            </td>
            ` : ''}
          </tr>
        </tbody>
      </table>
    </div>
  ` : '';

  // Build terms and conditions HTML
  const termsHtml = data.termsAndConditions && data.termsAndConditions.length > 0 ? `
    <div class="po-section no-break">
      <div class="po-section-title">📋 ${labels.termsAndConditions}</div>
      <ul style="margin-left: 20px; line-height: 1.6;">
        ${data.termsAndConditions.map(term => `<li style="margin-bottom: 6px;">${escapeHtml(term)}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  // Build remarks section
  const remarksHtml = data.remarks ? `
    <div class="po-section">
      <div class="po-section-title">📝 ${labels.remarks}</div>
      <div class="po-info-box">${escapeHtml(data.remarks)}</div>
    </div>
  ` : '';

  return `
    <style>
      .po-container {
        width: 100%;
        font-size: 9pt;
        line-height: 1.4;
      }
      
      .po-section {
        padding: 10px 0;
        margin-bottom: 12px;
        page-break-inside: avoid;
      }
      
      .po-section-title {
        font-size: 11pt;
        font-weight: 700;
        color: #1e3a5f;
        margin-bottom: 8px;
        padding-bottom: 4px;
        border-bottom: 2px solid #00a8a8;
      }
      
      .po-metadata {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 12px;
      }
      
      .po-metadata-item {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        border-bottom: 1px solid #f0f0f0;
      }
      
      .po-metadata-label {
        font-weight: 600;
        color: #1e3a5f;
        width: 40%;
      }
      
      .po-metadata-value {
        color: #334155;
        width: 60%;
        text-align: ${isRTL ? 'left' : 'right'};
      }
      
      .po-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 12px;
      }
      
      .po-table th {
        background: #00a8a8;
        color: white;
        font-weight: 600;
        padding: 8px;
        text-align: ${isRTL ? 'right' : 'left'};
        border: 1px solid #00a8a8;
        font-size: 8pt;
      }
      
      .po-table td {
        padding: 6px 8px;
        border: 1px solid #e2e8f0;
        font-size: 8pt;
      }
      
      .po-total-row {
        background: #f0f9f9;
        font-weight: 700;
      }
      
      .po-total-row td {
        padding: 8px;
        border: 1px solid #00a8a8;
      }
      
      .po-approvals-table {
        width: 100%;
        border-collapse: collapse;
      }
      
      .po-approvals-table td {
        width: 33%;
        text-align: center;
        padding: 12px;
      }
      
      .po-info-box {
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
    
    <div class="po-container">
      <!-- PO METADATA SECTION -->
      <div class="po-section">
        <div class="po-section-title">📋 ${labels.poNumber}</div>
        <div class="po-metadata">
          <div>
            <div class="po-metadata-item">
              <span class="po-metadata-label">${labels.poNumber}</span>
              <span class="po-metadata-value">${escapeHtml(data.poNumber)}</span>
            </div>
            <div class="po-metadata-item">
              <span class="po-metadata-label">${labels.poDate}</span>
              <span class="po-metadata-value">${formattedPODate}</span>
            </div>
            <div class="po-metadata-item">
              <span class="po-metadata-label">${labels.paymentTerms}</span>
              <span class="po-metadata-value">${escapeHtml(data.paymentTerms || '-')}</span>
            </div>
          </div>
          <div>
            <div class="po-metadata-item">
              <span class="po-metadata-label">${labels.supplier}</span>
              <span class="po-metadata-value">${escapeHtml(data.supplierName || '-')}</span>
            </div>
            <div class="po-metadata-item">
              <span class="po-metadata-label">${labels.deliveryDate}</span>
              <span class="po-metadata-value">${formattedDeliveryDate}</span>
            </div>
            <div class="po-metadata-item">
              <span class="po-metadata-label">${labels.deliveryLocation}</span>
              <span class="po-metadata-value">${escapeHtml(data.deliveryLocation || '-')}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- LINE ITEMS SECTION -->
      <div class="po-section">
        <div class="po-section-title">📦 ${labels.lineItems}</div>
        ${lineItemsHtml}
      </div>

      ${remarksHtml}
      ${termsHtml}
      ${approvalsHtml}
    </div>
  `;
}

/**
 * Main function to generate PO PDF
 * Uses OfficialPdfEngine for consistent styling and structure
 * Returns Buffer
 * 
 * FIX: Validates context.direction is defined before use
 */
export async function generatePurchaseOrderPDF(
  data: POPDFData
): Promise<{ buffer: Buffer; fileName: string }> {
  // ============================
  // STEP 0: VALIDATE CONTEXT
  // ============================
  // ✅ FIX: Ensure context and direction are defined
  if (!data.context) {
    throw new Error('PO PDF Data missing required context object');
  }

  if (!data.context.direction || !['ltr', 'rtl'].includes(data.context.direction)) {
    throw new Error(
      `Invalid or missing context.direction: "${data.context.direction}". ` +
      `Must be 'ltr' or 'rtl'. Language: ${data.language}`
    );
  }

  console.log(`[PO PDF Generator] ✅ Context validated - direction=${data.context.direction}, language=${data.language}`);

  // ============================
  // STEP 1: Safety - Escape HTML inputs
  // ============================
  // Sanitize user-input fields
  // ✅ FIX: Preserve context during sanitization
  const sanitizedData: POPDFData = {
    ...data,
    context: data.context, // ✅ Explicitly preserve context
    poNumber: escapeHtml(data.poNumber),
    supplierName: escapeHtml(data.supplierName),
    supplierAddress: escapeHtml(data.supplierAddress),
    prNumber: escapeHtml(data.prNumber),
    prReference: escapeHtml(data.prReference),
    deliveryLocation: escapeHtml(data.deliveryLocation),
    paymentTerms: escapeHtml(data.paymentTerms),
    remarks: escapeHtml(data.remarks),
    lineItems: data.lineItems.map(item => ({
      ...item,
      description: escapeHtml(item.description),
      unit: escapeHtml(item.unit),
    })),
    termsAndConditions: data.termsAndConditions?.map(term => escapeHtml(term)),
    approvals: data.approvals ? {
      preparedBy: data.approvals.preparedBy ? {
        ...data.approvals.preparedBy,
        name: escapeHtml(data.approvals.preparedBy.name),
        title: escapeHtml(data.approvals.preparedBy.title),
        date: escapeHtml(data.approvals.preparedBy.date),
      } : undefined,
      reviewedBy: data.approvals.reviewedBy ? {
        ...data.approvals.reviewedBy,
        name: escapeHtml(data.approvals.reviewedBy.name),
        title: escapeHtml(data.approvals.reviewedBy.title),
        date: escapeHtml(data.approvals.reviewedBy.date),
      } : undefined,
      authorizedBy: data.approvals.authorizedBy ? {
        ...data.approvals.authorizedBy,
        name: escapeHtml(data.approvals.authorizedBy.name),
        title: escapeHtml(data.approvals.authorizedBy.title),
        date: escapeHtml(data.approvals.authorizedBy.date),
      } : undefined,
    } : undefined,
  };

  // ============================
  // STEP 2: Generate Body HTML
  // ============================
  const bodyHtml = generatePOBodyHTML(sanitizedData);

  // ============================
  // STEP 3: Layout + Direction
  // ============================
  // ✅ FIX: Use context.direction directly (already validated)
  const direction = sanitizedData.context.direction;
  const labels = getLabels(sanitizedData.language);

  console.log(`[PO PDF Generator] Using direction=${direction} from context`);

  // ============================
  // STEP 4: Prepare PDF Options
  // ============================
  const pdfOptions: OfficialPdfOptions = {
    context: sanitizedData.context, // ✅ Pass complete context with direction
    department: sanitizedData.department ?? '',
    documentTitle: labels.title,
    formNumber: `PO-${sanitizedData.poNumber}`,
    formDate: formatDate(
      sanitizedData.poDate,
      direction === 'rtl'
    ),
    bodyHtml,
  };

  // ============================
  // STEP 5: Generate PDF
  // ============================
  try {
    console.log(`[PO PDF Generator] Generating PDF for PO: ${sanitizedData.poNumber}`);

    const buffer = await generateOfficialPdf(pdfOptions);

    const fileName = `PO-${sanitizedData.poNumber}-${new Date().getTime()}.pdf`;

    console.log(`[PO PDF Generator] ✅ Successfully generated: ${fileName}`);

    return {
      buffer,
      fileName,
    };
  } catch (error) {
    console.error(`[PO PDF Generator] ❌ Error generating PDF:`, error);
    throw error;
  }
}
