/**
 * ============================================================================
 * RETURNED ITEMS PDF GENERATOR - CENTRALIZED VERSION
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
 * server/services/pdf/templates/logistics/returnedItemsPDF.ts
 * ============================================================================
 */

import { getDb } from "../../../../db";

import {
  returnedItems,
  returnedItemLineItems,
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
    documentTitle: "RETURNED ITEMS RECEIPT",
    returnNumber: "Return Number",
    returnDate: "Return Date",
    returnedBy: "Returned By",
    inspectedBy: "Inspected By",
    department: "Department",
    reason: "Reason",
    remarks: "Remarks",
    itemDescription: "Item Description",
    quantityReturned: "Quantity Returned",
    acceptedQuantity: "Accepted Quantity",
    condition: "Condition",
    unit: "Unit",
    totalItems: "Total Items",
    notApplicable: "N/A",
    authorized: "Authorized",
  },

  ar: {
    documentTitle: "سند إرجاع أصناف",
    returnNumber: "رقم السند",
    returnDate: "التاريخ",
    returnedBy: "أرجع بواسطة",
    inspectedBy: "فحص بواسطة",
    department: "القسم",
    reason: "السبب",
    remarks: "ملاحظات",
    itemDescription: "وصف الصنف",
    quantityReturned: "الكمية المرجعة",
    acceptedQuantity: "الكمية المقبولة",
    condition: "الحالة",
    unit: "الوحدة",
    totalItems: "إجمالي الأصناف",
    notApplicable: "غ/م",
    authorized: "اعتماد",
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

export async function generateReturnedItemsPDF(
  returnId: number,
  organizationId: number,
  operatingUnitId: string,
  userId: string,
  language: PdfLang = "en"
): Promise<Buffer> {

  const db = await getDb();

  const isRTL = language === "ar";

  const l = t[language];

  console.log(
    `[Returned Items PDF] Generating PDF for ID=${returnId}, language=${language}`
  );

  // ==========================================================================
  // FETCH RETURN RECORD
  // ==========================================================================

  const returnRecord = await db.query.returnedItems.findFirst({
    where: and(
      eq(returnedItems.id, returnId),
      eq(returnedItems.organizationId, organizationId),
      isNull(returnedItems.deletedAt)
    ),
  });

  if (!returnRecord) {
    throw new Error(
      `Returned Items record not found: ID=${returnId}`
    );
  }

  console.log(
    `[Returned Items PDF] Found return record: ${returnRecord.returnNumber}`
  );

  // ==========================================================================
  // BUILD OFFICIAL CONTEXT
  // ==========================================================================

  const officialContext = await buildOfficialPdfContext({
    db,
    organizationId: returnRecord.organizationId,
    operatingUnitId: Number(operatingUnitId) || 0,
    userId: Number(userId) || 0,
    language: language as 'en' | 'ar',
    documentType: "returned_items",
    documentId: returnId,
    documentModule: "Logistics",
  });

  // ==========================================================================
  // FETCH LINE ITEMS
  // ==========================================================================

  const items = await db.query.returnedItemLineItems.findMany({
    where: eq(
      returnedItemLineItems.returnedItemId,
      returnId
    ),
  });

  console.log(
    `[Returned Items PDF] Found ${items.length} line items`
  );

  // ==========================================================================
  // BUILD ITEMS TABLE
  // ==========================================================================

  const itemRows = items
    .map((item: any, index: number) => {

      const acceptedQty =
        item.acceptedQuantity !== null &&
        item.acceptedQuantity !== undefined
          ? Number(item.acceptedQuantity).toLocaleString()
          : l.notApplicable;

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
            ${escapeHtml(item.itemDescription || "")}
          </td>

          <td
            style="
              text-align:center;
              padding:2mm;
              border:1px solid #d1d5db;
              font-size:9pt;
            "
          >
            ${Number(
              item.quantityReturned || 0
            ).toLocaleString()}
          </td>

          <td
            style="
              text-align:center;
              padding:2mm;
              border:1px solid #d1d5db;
              font-size:9pt;
            "
          >
            ${escapeHtml(acceptedQty)}
          </td>

          <td
            style="
              text-align:center;
              padding:2mm;
              border:1px solid #d1d5db;
              font-size:9pt;
            "
          >
            ${escapeHtml(item.condition || "")}
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
  // HEADER TABLE
  // ==========================================================================

  const headerInfoHtml = `
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
            ${escapeHtml(l.returnNumber)}
          </td>

          <td
            style="
              width:25%;
              border:1px solid #d1d5db;
              padding:2mm;
            "
            class="ltr-safe"
          >
            ${escapeHtml(
              returnRecord.returnNumber || ""
            )}
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
            ${escapeHtml(l.returnDate)}
          </td>

          <td
            style="
              width:25%;
              border:1px solid #d1d5db;
              padding:2mm;
            "
            class="ltr-safe"
          >
            ${escapeHtml(
              new Date(
                returnRecord.returnDate || new Date()
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
            ${escapeHtml(l.returnedBy)}
          </td>

          <td
            style="
              border:1px solid #d1d5db;
              padding:2mm;
            "
          >
            ${escapeHtml(
              returnRecord.returnedBy ||
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
            ${escapeHtml(l.inspectedBy)}
          </td>

          <td
            style="
              border:1px solid #d1d5db;
              padding:2mm;
            "
          >
            ${escapeHtml(
              returnRecord.inspectedBy ||
              l.notApplicable
            )}
          </td>

        </tr>

        ${
          returnRecord.department
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
            ${escapeHtml(returnRecord.department)}
          </td>

        </tr>
        `
            : ""
        }

        ${
          returnRecord.reason
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
            ${escapeHtml(l.reason)}
          </td>

          <td
            colspan="3"
            style="
              border:1px solid #d1d5db;
              padding:2mm;
            "
          >
            ${escapeHtml(returnRecord.reason)}
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

            <th style="width:6%;border:1px solid #d1d5db;padding:2mm;">
              #
            </th>

            <th
              style="
                width:34%;
                border:1px solid #d1d5db;
                padding:2mm;
                text-align:${isRTL ? "right" : "left"};
              "
            >
              ${escapeHtml(l.itemDescription)}
            </th>

            <th style="width:15%;border:1px solid #d1d5db;padding:2mm;">
              ${escapeHtml(l.quantityReturned)}
            </th>

            <th style="width:15%;border:1px solid #d1d5db;padding:2mm;">
              ${escapeHtml(l.acceptedQuantity)}
            </th>

            <th style="width:15%;border:1px solid #d1d5db;padding:2mm;">
              ${escapeHtml(l.condition)}
            </th>

            <th style="width:15%;border:1px solid #d1d5db;padding:2mm;">
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

  if (returnRecord.remarks) {
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
          ${escapeHtml(returnRecord.remarks)}
        </div>

      </div>
    `;
  }

  // ==========================================================================
  // SIGNATURES
  // ==========================================================================

  const signatureHtml = `
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
              ${escapeHtml(l.returnedBy)}
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
              ${escapeHtml(l.inspectedBy)}
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

        </tr>

      </table>

    </div>
  `;

  // ==========================================================================
  // BODY HTML
  // ==========================================================================

  const bodyHtml = `
    ${headerInfoHtml}
    ${itemsTableHtml}
    ${remarksHtml}
    ${signatureHtml}
  `;

  // ==========================================================================
  // GENERATE PDF
  // ==========================================================================

  console.log(
    `[Returned Items PDF] Generating PDF using OfficialPdfEngine`
  );

  const pdfBuffer = await generateOfficialPdf({
    context: officialContext,
    department: "Logistics & Procurement",
    documentTitle: l.documentTitle,
    formNumber:
      returnRecord.returnNumber ||
      `RI-${returnRecord.id}`,
    formDate:
      new Date(
        returnRecord.returnDate || new Date()
      )
        .toISOString()
        .split("T")[0],
    bodyHtml,
  });

  console.log(
    `[Returned Items PDF] PDF generated successfully`
  );

  return pdfBuffer;
}