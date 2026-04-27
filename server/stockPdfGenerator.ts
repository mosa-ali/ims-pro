/**
 * Stock PDF Generator
 * Generates professional PDFs for stock documents with OfficialWrapper pattern
 * Supports: StockRequest, StockIssue, StockReturn, Adjustment, Transfer, PhysicalCount
 */

import { generateOfficialPdfHtml } from "./services/pdf/templates/layout/OfficialWrapper";
import puppeteer from "puppeteer";
import QRCode from "qrcode";

// Inline translations for bilingual support
const translations = {
  en: {
    stockRequest: "Stock Request",
    stockIssue: "Stock Issue",
    stockReturn: "Stock Return",
    adjustment: "Stock Adjustment",
    transfer: "Warehouse Transfer",
    physicalCount: "Physical Count",
    itemCode: "Item Code",
    itemName: "Item Name",
    batch: "Batch",
    quantity: "Quantity",
    unit: "Unit",
    unitCost: "Unit Cost",
    totalValue: "Total Value",
    warehouse: "Warehouse",
    status: "Status",
    date: "Date",
    requestedBy: "Requested By",
    approvedBy: "Approved By",
    receivedBy: "Received By",
    notes: "Notes",
    signature: "Signature",
    signatureBlock: "Authorized Signature",
    qrCode: "Document QR Code",
  },
  ar: {
    stockRequest: "طلب مخزون",
    stockIssue: "إصدار مخزون",
    stockReturn: "مرتجع مخزون",
    adjustment: "تسوية مخزون",
    transfer: "تحويل بين المستودعات",
    physicalCount: "جرد فعلي",
    itemCode: "رمز الصنف",
    itemName: "اسم الصنف",
    batch: "الدفعة",
    quantity: "الكمية",
    unit: "الوحدة",
    unitCost: "سعر الوحدة",
    totalValue: "القيمة الإجمالية",
    warehouse: "المستودع",
    status: "الحالة",
    date: "التاريخ",
    requestedBy: "طلب بواسطة",
    approvedBy: "موافق من",
    receivedBy: "استلم بواسطة",
    notes: "ملاحظات",
    signature: "التوقيع",
    signatureBlock: "التوقيع المصرح",
    qrCode: "رمز QR للمستند",
  },
};

type Language = "en" | "ar";

interface StockDocumentData {
  documentNumber: string;
  documentDate: string;
  organizationName: string;
  operatingUnitName?: string;
  organizationLogo?: string;
  department: string;
  status: string;
  lines: Array<{
    itemCode: string;
    itemName: string;
    batchNumber?: string;
    quantity: number;
    unit: string;
    unitCost: number;
    totalValue: number;
  }>;
  warehouse?: string;
  requestedBy?: string;
  approvedBy?: string;
  receivedBy?: string;
  notes?: string;
}

/**
 * Generate signature block HTML with space for manual signature
 */
function generateSignatureBlock(label: string, language: Language): string {
  const t = translations[language];
  return `
    <div class="signature-block">
      <div class="signature-label">${label}</div>
      <div class="signature-line"></div>
      <div class="signature-date">${t.date}: __________</div>
    </div>
  `;
}

/**
 * Generate QR code for document verification
 */
async function generateQRCode(data: string): Promise<string> {
  try {
    return await QRCode.toDataURL(data, {
      errorCorrectionLevel: "H",
      type: "image/png",
      width: 120,
      margin: 1,
    });
  } catch (err) {
    console.error("QR code generation failed:", err);
    return "";
  }
}

/**
 * Generate PDF HTML for stock documents
 */
async function generateStockDocumentHtml(
  documentType: "request" | "issue" | "return" | "adjustment" | "transfer" | "physicalCount",
  data: StockDocumentData,
  language: Language = "en"
): Promise<string> {
  const t = translations[language];
  const direction = language === "ar" ? "rtl" : "ltr";

  // Generate QR code for document
  const qrCodeData = await generateQRCode(
    `${data.organizationName}|${data.documentNumber}|${data.documentDate}`
  );

  // Document title mapping
  const titleMap = {
    request: t.stockRequest,
    issue: t.stockIssue,
    return: t.stockReturn,
    adjustment: t.adjustment,
    transfer: t.transfer,
    physicalCount: t.physicalCount,
  };

  // Items table HTML
  const itemsTableHtml = `
    <table class="items-table">
      <thead>
        <tr>
          <th>${t.itemCode}</th>
          <th>${t.itemName}</th>
          <th>${t.batch}</th>
          <th class="text-right">${t.quantity}</th>
          <th>${t.unit}</th>
          <th class="text-right">${t.unitCost}</th>
          <th class="text-right">${t.totalValue}</th>
        </tr>
      </thead>
      <tbody>
        ${data.lines
          .map(
            (line) => `
          <tr>
            <td>${line.itemCode}</td>
            <td>${line.itemName}</td>
            <td>${line.batchNumber || "—"}</td>
            <td class="text-right">${line.quantity.toFixed(2)}</td>
            <td>${line.unit}</td>
            <td class="text-right">$${line.unitCost.toFixed(2)}</td>
            <td class="text-right">$${line.totalValue.toFixed(2)}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;

  // Document details section
  const detailsHtml = `
    <div class="document-details">
      <div class="detail-row">
        <span class="detail-label">${t.status}:</span>
        <span class="detail-value">${data.status}</span>
      </div>
      ${data.warehouse ? `<div class="detail-row"><span class="detail-label">${t.warehouse}:</span><span class="detail-value">${data.warehouse}</span></div>` : ""}
      ${data.requestedBy ? `<div class="detail-row"><span class="detail-label">${t.requestedBy}:</span><span class="detail-value">${data.requestedBy}</span></div>` : ""}
      ${data.approvedBy ? `<div class="detail-row"><span class="detail-label">${t.approvedBy}:</span><span class="detail-value">${data.approvedBy}</span></div>` : ""}
      ${data.receivedBy ? `<div class="detail-row"><span class="detail-label">${t.receivedBy}:</span><span class="detail-value">${data.receivedBy}</span></div>` : ""}
      ${data.notes ? `<div class="detail-row"><span class="detail-label">${t.notes}:</span><span class="detail-value">${data.notes}</span></div>` : ""}
    </div>
  `;

  // Signature blocks
  const signatureBlocksHtml = `
    <div class="signatures-section">
      <div class="signatures-grid">
        ${generateSignatureBlock(t.requestedBy || "Requested By", language)}
        ${generateSignatureBlock(t.approvedBy || "Approved By", language)}
        ${generateSignatureBlock(t.receivedBy || "Received By", language)}
      </div>
    </div>
  `;

  // QR code section
  const qrCodeHtml = qrCodeData
    ? `
    <div class="qr-section">
      <div class="qr-label">${t.qrCode}</div>
      <img src="${qrCodeData}" alt="QR Code" class="qr-code" />
    </div>
  `
    : "";

  // Body HTML combining all sections
  const bodyHtml = `
    ${itemsTableHtml}
    ${detailsHtml}
    ${signatureBlocksHtml}
    ${qrCodeHtml}
    <style>
      .items-table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
        font-size: 11px;
      }
      .items-table th, .items-table td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
      }
      .items-table th {
        background-color: #f5f5f5;
        font-weight: bold;
      }
      .items-table .text-right {
        text-align: right;
      }
      .document-details {
        margin: 20px 0;
        font-size: 11px;
      }
      .detail-row {
        display: flex;
        margin: 8px 0;
      }
      .detail-label {
        font-weight: bold;
        width: 150px;
        flex-shrink: 0;
      }
      .detail-value {
        flex: 1;
      }
      .signatures-section {
        margin-top: 40px;
        page-break-inside: avoid;
      }
      .signatures-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
        margin-top: 20px;
      }
      .signature-block {
        text-align: center;
        border-top: 1px solid #333;
        padding-top: 40px;
        font-size: 10px;
      }
      .signature-label {
        font-weight: bold;
        margin-bottom: 30px;
      }
      .signature-line {
        height: 1px;
        background-color: #333;
        margin: 30px 0;
      }
      .signature-date {
        font-size: 9px;
        margin-top: 10px;
      }
      .qr-section {
        margin-top: 30px;
        text-align: center;
        page-break-inside: avoid;
      }
      .qr-label {
        font-size: 10px;
        font-weight: bold;
        margin-bottom: 10px;
      }
      .qr-code {
        width: 120px;
        height: 120px;
        border: 1px solid #ddd;
      }
    </style>
  `;

  // Generate official PDF HTML using OfficialWrapper
  const pdfHtml = generateOfficialPdfHtml({
    organizationName: data.organizationName,
    operatingUnitName: data.operatingUnitName,
    organizationLogo: data.organizationLogo,
    department: data.department,
    documentTitle: titleMap[documentType],
    formNumber: data.documentNumber,
    formDate: data.documentDate,
    bodyHtml,
    direction,
    language,
  });

  return pdfHtml;
}

/**
 * Render PDF from HTML using Puppeteer
 */
export async function generateStockPdf(
  documentType: "request" | "issue" | "return" | "adjustment" | "transfer" | "physicalCount",
  data: StockDocumentData,
  language: Language = "en"
): Promise<Buffer> {
  try {
    const html = await generateStockDocumentHtml(documentType, data, language);
    
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/home/ubuntu/.cache/puppeteer/chrome/linux-144.0.7559.96/chrome-linux64/chrome',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none',
      ],
    });
    
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.evaluate(() => document.fonts.ready);
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: {
          top: '12mm',
          right: '12mm',
          bottom: '15mm',
          left: '12mm',
        },
      });
      
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  } catch (err) {
    console.error(`Failed to generate ${documentType} PDF:`, err);
    throw err;
  }
}

export { StockDocumentData };
