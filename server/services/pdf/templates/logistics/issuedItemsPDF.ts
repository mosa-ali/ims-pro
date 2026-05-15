/**
 * ============================================================================
 * STOCK ISSUE (ISSUED ITEMS) PDF GENERATOR - CENTRALIZED VERSION
 * ============================================================================
 *
 * Uses OfficialPdfEngine for:
 * ✅ Unified branding
 * ✅ Multi-organization support
 * ✅ Multi-operating unit support
 * ✅ RTL / Arabic support
 * ✅ Consistent headers/footers
 * ✅ Centralized PDF styling
 * ✅ Proper validation
 *
 * FILE:
 * server/services/pdf/templates/logistics/issuedItemsPDF.ts
 * ============================================================================
 */

import { getDb } from "../../../../db";

import {
  stockIssued,
  stockIssuedLineItems,
} from "drizzle/schema";

import {
  eq,
  and,
  isNull,
} from "drizzle-orm";

import {
  buildOfficialPdfContext,
} from "../../buildOfficialPdfContext";

import {
  generateOfficialPdf,
} from "../../OfficialPdfEngine";

// ============================================================================
// TYPES
// ============================================================================

export type PdfLang = "en" | "ar";

// ============================================================================
// TRANSLATIONS
// ============================================================================

const t = {
  en: {
    documentTitle: "STOCK ISSUE VOUCHER",
    issueNumber: "Issue Number",
    issueDate: "Issue Date",
    issuedTo: "Issued To",
    issuedBy: "Issued By",
    department: "Department",
    remarks: "Remarks",
    itemDescription: "Item Description",
    quantityIssued: "Quantity Issued",
    unit: "Unit",
    totalItems: "Total Items",
    generatedOn: "Generated on",
    notApplicable: "N/A",
    authorized: "Authorized",
    received: "Received",
  },

  ar: {
    documentTitle: "سند صرف أصناف",
    issueNumber: "رقم السند",
    issueDate: "التاريخ",
    issuedTo: "صرف إلى",
    issuedBy: "صرف بواسطة",
    department: "القسم",
    remarks: "ملاحظات",
    itemDescription: "وصف الصنف",
    quantityIssued: "الكمية المصروفة",
    unit: "الوحدة",
    totalItems: "إجمالي الأصناف",
    generatedOn: "تم الإنشاء في",
    notApplicable: "غ/م",
    authorized: "اعتماد",
    received: "استلام",
  },
};

// ============================================================================
// HELPERS
// ============================================================================

function escapeHtml(
  value: string | number | undefined | null
): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

export async function generateStockIssuePDF(
  stockIssueId: number,
  organizationId: number,
  operatingUnitId: string,
  userId: string,
  language: PdfLang = "en"
): Promise<Buffer> {

  const db = await getDb();

  const isRTL = language === "ar";

  const l = t[language];

  console.log(
    `[Stock Issue PDF] Generating PDF for ID=${stockIssueId}, language=${language}`
  );

  // ==========================================================================
  // FETCH STOCK ISSUE
  // ==========================================================================

  const issue = await db.query.stockIssued.findFirst({
    where: and(
      eq(stockIssued.id, stockIssueId),
      eq(stockIssued.organizationId, organizationId),
      isNull(stockIssued.deletedAt)
    ),
  });

  if (!issue) {
    throw new Error(
      `Stock Issue not found: ID=${stockIssueId}`
    );
  }

  console.log(
    `[Stock Issue PDF] Found stock issue: ${issue.issueNumber}`
  );

  // ==========================================================================
  // BUILD OFFICIAL CONTEXT
  // ==========================================================================

  const officialContext = await buildOfficialPdfContext({
    db,
    organizationId,
    operatingUnitId: Number(operatingUnitId) || 0,
    userId: Number(userId) || 0,
    language: language as 'en' | 'ar',
    documentType: "stock_issue",
    documentId: stockIssueId,
    documentModule: "Logistics",
  });

  // ==========================================================================
  // FETCH LINE ITEMS
  // ==========================================================================

  const items = await db.query.stockIssuedLineItems.findMany({
    where: eq(
      stockIssuedLineItems.stockIssuedId,
      stockIssueId
    ),
  });

  console.log(
    `[Stock Issue PDF] Found ${items.length} line items`
  );

  // ==========================================================================
  // ITEMS TABLE
  // ==========================================================================

  const itemRows = items
    .map((item: any, index: number) => {
      return `
        <tr>
          <td
            style="
              text-align:center;
              padding:2mm;
              border:1px solid #d1d5db;
              font-size:9pt;
            "
          >
            ${index + 1}
          </td>

          <td
            style="
              text-align:${isRTL ? "right" : "left"};
              padding:2mm;
              border:1px solid #d1d5db;
              font-size:9pt;
            "
          >
            ${escapeHtml(item.description || "")}
          </td>

          <td
            style="
              text-align:center;
              padding:2mm;
              border:1px solid #d1d5db;
              font-size:9pt;
            "
          >
            ${Number(item.issuedQty || 0).toLocaleString()}
          </td>

          <td
            style="
              text-align:center;
              padding:2mm;
              border:1px solid #d1d5db;
              font-size:9pt;
            "
          >
            ${escapeHtml(item.unit || "")}
          </td>
        </tr>
      `;
    })
    .join("");

  // ==========================================================================
  // HEADER DETAILS TABLE
  // ==========================================================================

  const detailsHtml = `
    <table
      style="
        width:100%;
        border-collapse:collapse;
        margin-bottom:5mm;
        font-size:9pt;
      "
    >
      <tbody>

        <tr>
          <td
            style="
              width:25%;
              font-weight:700;
              background:#f3f4f6;
              border:1px solid #d1d5db;
              padding:2mm;
            "
          >
            ${escapeHtml(l.issueNumber)}
          </td>

          <td
            style="
              width:25%;
              border:1px solid #d1d5db;
              padding:2mm;
            "
            class="ltr-safe"
          >
            ${escapeHtml(issue.issueNumber || "")}
          </td>

          <td
            style="
              width:25%;
              font-weight:700;
              background:#f3f4f6;
              border:1px solid #d1d5db;
              padding:2mm;
            "
          >
            ${escapeHtml(l.issueDate)}
          </td>

          <td
            style="
              width:25%;
              border:1px solid #d1d5db;
              padding:2mm;
            "
          >
            ${escapeHtml(
              new Date(
                issue.issueDate || new Date()
              ).toLocaleDateString(
                language === "ar"
                  ? "ar-SA"
                  : "en-US"
              )
            )}
          </td>
        </tr>

        <tr>
          <td
            style="
              font-weight:700;
              background:#f3f4f6;
              border:1px solid #d1d5db;
              padding:2mm;
            "
          >
            ${escapeHtml(l.issuedTo)}
          </td>

          <td
            style="
              border:1px solid #d1d5db;
              padding:2mm;
            "
          >
            ${escapeHtml(
              issue.issuedTo ||
              l.notApplicable
            )}
          </td>

          <td
            style="
              font-weight:700;
              background:#f3f4f6;
              border:1px solid #d1d5db;
              padding:2mm;
            "
          >
            ${escapeHtml(l.issuedBy)}
          </td>

          <td
            style="
              border:1px solid #d1d5db;
              padding:2mm;
            "
          >
            ${escapeHtml(
              issue.issuedBy ||
              l.notApplicable
            )}
          </td>
        </tr>

        ${
          issue.department
            ? `
        <tr>
          <td
            style="
              font-weight:700;
              background:#f3f4f6;
              border:1px solid #d1d5db;
              padding:2mm;
            "
          >
            ${escapeHtml(l.department)}
          </td>

          <td
            colspan="3"
            style="
              border:1px solid #d1d5db;
              padding:2mm;
            "
          >
            ${escapeHtml(issue.department)}
          </td>
        </tr>
        `
            : ""
        }

      </tbody>
    </table>
  `;

  // ==========================================================================
  // ITEMS TABLE HTML
  // ==========================================================================

  const itemsTableHtml = `
    <div style="margin-bottom:5mm;">

      <div
        style="
          background:#0d9488;
          color:white;
          padding:3mm 4mm;
          font-size:10pt;
          font-weight:700;
          border-radius:4px 4px 0 0;
        "
      >
        ${escapeHtml(l.documentTitle)}
      </div>

      <table
        style="
          width:100%;
          border-collapse:collapse;
        "
      >
        <thead>
          <tr style="background:#f3f4f6;">

            <th
              style="
                width:8%;
                border:1px solid #d1d5db;
                padding:2mm;
                font-size:9pt;
              "
            >
              #
            </th>

            <th
              style="
                width:52%;
                border:1px solid #d1d5db;
                padding:2mm;
                font-size:9pt;
                text-align:${isRTL ? "right" : "left"};
              "
            >
              ${escapeHtml(l.itemDescription)}
            </th>

            <th
              style="
                width:20%;
                border:1px solid #d1d5db;
                padding:2mm;
                font-size:9pt;
              "
            >
              ${escapeHtml(l.quantityIssued)}
            </th>

            <th
              style="
                width:20%;
                border:1px solid #d1d5db;
                padding:2mm;
                font-size:9pt;
              "
            >
              ${escapeHtml(l.unit)}
            </th>

          </tr>
        </thead>

        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <div
        style="
          margin-top:2mm;
          padding:2mm 4mm;
          background:#f9fafb;
          border:1px solid #e5e7eb;
          border-radius:3px;
          font-size:9pt;
        "
      >
        <strong>
          ${escapeHtml(l.totalItems)}:
        </strong>

        ${items.length}
      </div>
    </div>
  `;

  // ==========================================================================
  // REMARKS
  // ==========================================================================

  let remarksHtml = "";

  if (issue.remarks) {
    remarksHtml = `
      <div
        style="
          margin-bottom:5mm;
          padding:3mm 4mm;
          background:#f0fdf4;
          border:1px solid #86efac;
          border-radius:4px;
        "
      >
        <div
          style="
            font-size:9pt;
            font-weight:700;
            margin-bottom:1mm;
          "
        >
          ${escapeHtml(l.remarks)}
        </div>

        <div
          style="
            font-size:9pt;
            line-height:1.5;
          "
        >
          ${escapeHtml(issue.remarks)}
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // SIGNATURES
  // ==========================================================================

  const signaturesHtml = `
    <div
      style="
        margin-top:10mm;
        padding-top:5mm;
        border-top:1px solid #d1d5db;
      "
    >

      <table style="width:100%;">

        <tr>

          <td
            style="
              width:33%;
              text-align:center;
              font-size:8pt;
            "
          >
            <div
              style="
                border-bottom:1px solid #6b7280;
                height:10mm;
                margin-bottom:2mm;
              "
            ></div>

            <div style="font-weight:700;">
              ${escapeHtml(l.issuedBy)}
            </div>
          </td>

          <td
            style="
              width:33%;
              text-align:center;
              font-size:8pt;
            "
          >
            <div
              style="
                border-bottom:1px solid #6b7280;
                height:10mm;
                margin-bottom:2mm;
              "
            ></div>

            <div style="font-weight:700;">
              ${escapeHtml(l.authorized)}
            </div>
          </td>

          <td
            style="
              width:33%;
              text-align:center;
              font-size:8pt;
            "
          >
            <div
              style="
                border-bottom:1px solid #6b7280;
                height:10mm;
                margin-bottom:2mm;
              "
            ></div>

            <div style="font-weight:700;">
              ${escapeHtml(l.received)}
            </div>
          </td>

        </tr>

      </table>
    </div>
  `;

  // ==========================================================================
  // BODY HTML
  // ==========================================================================

  const bodyHtml = `
    ${detailsHtml}
    ${itemsTableHtml}
    ${remarksHtml}
    ${signaturesHtml}
  `;

  // ==========================================================================
  // GENERATE PDF
  // ==========================================================================

  console.log(
    `[Stock Issue PDF] Generating PDF using OfficialPdfEngine`
  );

  const pdfBuffer = await generateOfficialPdf({
    context: officialContext,
    department: "Logistics & Procurement",
    documentTitle: l.documentTitle,
    formNumber:
      issue.issueNumber ||
      `SI-${issue.id}`,
    formDate:
      new Date(
        issue.issueDate || new Date()
      )
        .toISOString()
        .split("T")[0],
    bodyHtml,
  });

  console.log(
    `[Stock Issue PDF] PDF generated successfully`
  );

  return pdfBuffer;
}