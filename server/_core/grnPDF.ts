/**
 * GRN PDF Generation
 *
 * Generates server-side GRN receipt with organization branding and bilingual support.
 * Uses Puppeteer + official-pdf.css (flexbox approach) for consistent RTL/LTR mirroring.
 *
 * Header pattern (auto-mirrors via flexbox):
 *   LTR: Org LEFT | Title CENTER | Logo+Ref RIGHT
 *   RTL: Logo+Ref LEFT | Title CENTER | Org RIGHT
 *
 * See docs/PDF_HEADER_RTL_LTR_GUIDELINE.md
 */

import puppeteer from "puppeteer";
import { getDb } from "../db";
import {
  goodsReceiptNotes,
  grnLineItems,
  purchaseOrders,
  vendors,
  organizations,
  organizationBranding,
  operatingUnits,
  users,
} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { buildPdfDocument } from "../services/pdf/buildPdfHeader";

interface GRNPDFOptions {
  grnId: number;
  organizationId: number;
  language?: "en" | "ar";
  includeQR?: boolean;
}

const translations = {
  en: {
    title: "Goods Receipt Note",
    department: "Logistics & Procurement",
    grnNumber: "GRN Number",
    poNumber: "PO Number",
    vendor: "Vendor",
    receivedDate: "Received Date",
    receivedBy: "Received By",
    inspectedBy: "Inspected By",
    status: "Status",
    warehouse: "Warehouse",
    deliveryNote: "Delivery Note No.",
    invoiceNo: "Invoice No.",
    lineItems: "Line Items",
    itemNo: "#",
    description: "Description",
    unit: "Unit",
    orderedQty: "Ordered Qty",
    receivedQty: "Received Qty",
    acceptedQty: "Accepted Qty",
    rejectedQty: "Rejected Qty",
    condition: "Condition",
    remarks: "Remarks",
    approvedBy: "Approved By",
    approvalDate: "Approval Date",
    generatedOn: "Generated on",
    signatureReceivedBy: "Received By",
    signatureInspectedBy: "Inspected By",
    signatureApprovedBy: "Approved By",
    good: "Good",
    pending: "Pending",
    accepted: "Accepted",
    rejected: "Rejected",
  },
  ar: {
    title: "إشعار استلام البضائع",
    department: "الخدمات اللوجستية والمشتريات",
    grnNumber: "رقم الإشعار",
    poNumber: "رقم أمر الشراء",
    vendor: "المورد",
    receivedDate: "تاريخ الاستلام",
    receivedBy: "استلمه",
    inspectedBy: "فحصه",
    status: "الحالة",
    warehouse: "المستودع",
    deliveryNote: "رقم إشعار التسليم",
    invoiceNo: "رقم الفاتورة",
    lineItems: "بنود الاستلام",
    itemNo: "#",
    description: "الوصف",
    unit: "الوحدة",
    orderedQty: "الكمية المطلوبة",
    receivedQty: "الكمية المستلمة",
    acceptedQty: "الكمية المقبولة",
    rejectedQty: "الكمية المرفوضة",
    condition: "الحالة",
    remarks: "ملاحظات",
    approvedBy: "وافق عليه",
    approvalDate: "تاريخ الموافقة",
    generatedOn: "تم الإنشاء في",
    signatureReceivedBy: "استلم بواسطة",
    signatureInspectedBy: "فحص بواسطة",
    signatureApprovedBy: "اعتمد بواسطة",
    good: "جيد",
    pending: "قيد الانتظار",
    accepted: "مقبول",
    rejected: "مرفوض",
  },
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatStatus(status: string, t: typeof translations.en): string {
  const statusMap: Record<string, string> = {
    pending_inspection: t.pending,
    inspected: t.pending,
    accepted: t.accepted,
    partially_accepted: t.accepted,
    rejected: t.rejected,
  };
  return statusMap[status] || status.replace(/_/g, " ");
}

export async function generateGRNPDF(options: GRNPDFOptions): Promise<Buffer> {
  const { grnId, organizationId, language = "en" } = options;
  const isRTL = language === "ar";
  const dir = isRTL ? "rtl" : "ltr";
  const t = translations[language];
  const db = await getDb();

  // ── Fetch GRN details ──────────────────────────────────────────────────
  const [grn] = await db
    .select()
    .from(goodsReceiptNotes)
    .where(
      and(
        eq(goodsReceiptNotes.id, grnId),
        eq(goodsReceiptNotes.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!grn) {
    throw new Error("GRN not found");
  }

  // Fetch related data
  const [po] = grn.purchaseOrderId
    ? await db
        .select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.id, grn.purchaseOrderId))
        .limit(1)
    : [null];

  const [vendor] = grn.supplierId
    ? await db
        .select()
        .from(vendors)
        .where(eq(vendors.id, grn.supplierId))
        .limit(1)
    : [null];

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  // Fetch branding (logo)
  const [branding] = await db
    .select()
    .from(organizationBranding)
    .where(eq(organizationBranding.organizationId, organizationId))
    .limit(1);

  // Fetch operating unit
  let ouName = "";
  if (grn.operatingUnitId) {
    const [ou] = await db
      .select()
      .from(operatingUnits)
      .where(eq(operatingUnits.id, grn.operatingUnitId))
      .limit(1);
    if (ou) {
      ouName = isRTL ? ((ou as any).nameAr || ou.name || "") : (ou.name || "");
    }
  }

  const items = await db
    .select()
    .from(grnLineItems)
    .where(eq(grnLineItems.grnId, grnId));

  const [approver] = grn.approvedBy
    ? await db
        .select()
        .from(users)
        .where(eq(users.id, grn.approvedBy))
        .limit(1)
    : [null];

  // ── Build body HTML ────────────────────────────────────────────────────
  const orgName = org?.name || "Organization";
  const logoUrl = branding?.logoUrl || "";
  const grnDate = grn.grnDate
    ? new Date(grn.grnDate).toLocaleDateString(isRTL ? "ar-SA" : "en-US")
    : "N/A";
  const dateText = new Date().toLocaleDateString(isRTL ? "ar-SA" : "en-US");

  // Metadata section
  const metaHtml = `
    <div class="meta-block stack-12">
      <div class="meta-grid">
        <div class="meta-item"><span class="k">${escapeHtml(t.grnNumber)}:</span> <span class="v ltr-safe">${escapeHtml(grn.grnNumber)}</span></div>
        <div class="meta-item"><span class="k">${escapeHtml(t.poNumber)}:</span> <span class="v ltr-safe">${escapeHtml(po?.poNumber || "N/A")}</span></div>
        <div class="meta-item"><span class="k">${escapeHtml(t.vendor)}:</span> <span class="v">${escapeHtml(vendor?.name || "N/A")}</span></div>
        <div class="meta-item"><span class="k">${escapeHtml(t.status)}:</span> <span class="v">${escapeHtml(formatStatus(grn.status, t))}</span></div>
        <div class="meta-item"><span class="k">${escapeHtml(t.receivedDate)}:</span> <span class="v ltr-safe">${escapeHtml(grnDate)}</span></div>
        <div class="meta-item"><span class="k">${escapeHtml(t.warehouse)}:</span> <span class="v">${escapeHtml(isRTL ? (grn.warehouseAr || grn.warehouse || "-") : (grn.warehouse || "-"))}</span></div>
        <div class="meta-item"><span class="k">${escapeHtml(t.deliveryNote)}:</span> <span class="v ltr-safe">${escapeHtml(grn.deliveryNoteNumber || "-")}</span></div>
        <div class="meta-item"><span class="k">${escapeHtml(t.invoiceNo)}:</span> <span class="v ltr-safe">${escapeHtml(grn.invoiceNumber || "-")}</span></div>
        <div class="meta-item"><span class="k">${escapeHtml(t.receivedBy)}:</span> <span class="v">${escapeHtml(grn.receivedBy || "-")}</span></div>
        <div class="meta-item"><span class="k">${escapeHtml(t.inspectedBy)}:</span> <span class="v">${escapeHtml(grn.inspectedBy || "-")}</span></div>
      </div>
    </div>
  `;

  // Line items table
  const lineItemRows = items
    .map(
      (item, idx) => `
      <tr>
        <td class="num">${idx + 1}</td>
        <td>${escapeHtml(item.description || "")}</td>
        <td>${escapeHtml(item.unit || "-")}</td>
        <td class="num">${item.orderedQty || 0}</td>
        <td class="num">${item.receivedQty || 0}</td>
        <td class="num">${item.acceptedQty || 0}</td>
        <td class="num">${item.rejectedQty || 0}</td>
        <td>${escapeHtml(item.remarks || "-")}</td>
      </tr>
    `
    )
    .join("");

  const tableHtml = `
    <div class="section-title stack-16">${escapeHtml(t.lineItems)}</div>
    <hr class="section-divider" />
    <table class="table">
      <thead>
        <tr>
          <th style="width:5%;">${escapeHtml(t.itemNo)}</th>
          <th style="width:25%;">${escapeHtml(t.description)}</th>
          <th style="width:8%;">${escapeHtml(t.unit)}</th>
          <th style="width:10%;" class="num">${escapeHtml(t.orderedQty)}</th>
          <th style="width:10%;" class="num">${escapeHtml(t.receivedQty)}</th>
          <th style="width:10%;" class="num">${escapeHtml(t.acceptedQty)}</th>
          <th style="width:10%;" class="num">${escapeHtml(t.rejectedQty)}</th>
          <th style="width:22%;">${escapeHtml(t.remarks)}</th>
        </tr>
      </thead>
      <tbody>
        ${lineItemRows || `<tr><td colspan="8" style="text-align:center;color:#888;">—</td></tr>`}
      </tbody>
    </table>
  `;

  // Remarks section
  const remarksHtml =
    grn.remarks || grn.remarksAr
      ? `
    <div class="section-title stack-16">${escapeHtml(t.remarks)}</div>
    <hr class="section-divider" />
    <p style="font-size:10pt;color:#333;">${escapeHtml(isRTL ? (grn.remarksAr || grn.remarks || "") : (grn.remarks || ""))}</p>
  `
      : "";

  // Approval info
  const approvalHtml = approver
    ? `
    <div class="callout callout-info stack-12">
      <strong>${escapeHtml(t.approvedBy)}:</strong> ${escapeHtml(approver.name || "")}
      ${grn.approvedAt ? ` — <span class="ltr-safe">${escapeHtml(new Date(grn.approvedAt).toLocaleDateString(isRTL ? "ar-SA" : "en-US"))}</span>` : ""}
    </div>
  `
    : "";

  // Signature blocks
  const signaturesHtml = `
    <div class="signatures">
      <div class="sig">
        <div class="role">${escapeHtml(t.signatureReceivedBy)}</div>
        <div class="line"></div>
        <div class="hint">${escapeHtml(grn.receivedBy || "")}</div>
      </div>
      <div class="sig">
        <div class="role">${escapeHtml(t.signatureInspectedBy)}</div>
        <div class="line"></div>
        <div class="hint">${escapeHtml(grn.inspectedBy || "")}</div>
      </div>
      <div class="sig">
        <div class="role">${escapeHtml(t.signatureApprovedBy)}</div>
        <div class="line"></div>
        <div class="hint">${escapeHtml(approver?.name || "")}</div>
      </div>
    </div>
  `;

  // Footer
  const footerHtml = `
    <div style="margin-top:20px;font-size:8pt;color:#888;text-align:center;">
      ${escapeHtml(t.generatedOn)}: ${escapeHtml(dateText)}
    </div>
  `;

  const bodyHtml = `
    ${metaHtml}
    ${tableHtml}
    ${remarksHtml}
    ${approvalHtml}
    ${signaturesHtml}
    ${footerHtml}
  `;

  // ── Build full HTML using shared utility ───────────────────────────────
  const fullHtml = buildPdfDocument({
    organizationName: orgName,
    operatingUnitName: ouName || undefined,
    organizationLogo: logoUrl || undefined,
    department: t.department,
    documentTitle: t.title,
    refNumber: grn.grnNumber,
    date: dateText,
    direction: dir,
    language,
    bodyHtml,
  });

  // ── Generate PDF with Puppeteer ────────────────────────────────────────
  const browser = await puppeteer.launch({
    headless: true,
    executablePath:
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      '/usr/bin/chromium',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-crash-reporter',
      '--disable-breakpad',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(fullHtml, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "8mm",
        right: "8mm",
        bottom: "8mm",
        left: "8mm",
      },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
