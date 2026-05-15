/**
 * QA (Quotation Analysis) PDF Generator - Centralized
 * 
 * Uses OfficialPdfEngine for consistent styling and centralized PDF generation.
 * A4 landscape, full RTL/LTR support.
 */

import { getDb } from "../../../../db";
import {
  quotationAnalyses,
  quotationAnalysisSuppliers,
  quotationAnalysisLineItems,
  purchaseRequests,
  purchaseRequestLineItems,
} from "drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";
import { buildOfficialPdfContext } from "../../buildOfficialPdfContext";
import { generateOfficialPdf } from "../../OfficialPdfEngine";

export type PdfLang = "en" | "ar";

const t = {
  en: {
    documentTitle: "QUOTATION ANALYSIS (QA)",
    prReference: "PR Reference",
    date: "Date",
    currency: "Currency",
    prTotal: "PR Total",
    numberOfSuppliers: "No. of Suppliers",
    status: "Status",
    supplierQuotationComparison: "Supplier Quotation Comparison",
    description: "Description",
    unit: "Unit",
    qty: "Qty",
    estPrice: "Est. Price",
    total: "Total",
    multiCriteriaScoringMethod: "Multi-Criteria Scoring Method",
    costOnlyScoring: "Cost-Only Scoring",
    costOnlyDesc: "(PR ≤ $5,000): Lowest total offer receives 100 points. Other suppliers scored proportionally.",
    multiCriteriaDesc: "(PR $5,001-$25,000): Suppliers evaluated using four weighted criteria:",
    price: "Price",
    delivery: "Delivery",
    warranty: "Warranty",
    technical: "Technical",
    priceWeight: "60%",
    deliveryWeight: "20%",
    warrantyWeight: "10%",
    technicalWeight: "10%",
    totalQuotedAmount: "Total quoted amount",
    deliveryDays: "Delivery days",
    warrantyMonths: "Warranty months",
    experienceYears: "Experience (3+ yrs)",
    vendorsEvaluation: "Vendors Evaluation - Individual and Weighted Scores",
    rank: "Rank",
    supplier: "Supplier",
    priceScore: "Price Score (60%)",
    deliveryScore: "Delivery Score (20%)",
    warrantyScore: "Warranty Score (10%)",
    technicalScore: "Technical Score (10%)",
    totalScore: "Total Score",
    statusCol: "Status",
    winner: "Winner",
    financialScoring: "Financial Scoring",
    totalOffer: "Total Offer",
    financialScore: "Financial Score",
    selected: "Selected",
    selectionDecision: "Selection Decision",
    selectedSupplier: "Selected Supplier",
    justification: "Justification",
    evaluationReport: "Evaluation Report",
    noEvaluationReport: "No evaluation report provided",
    approvalSignatures: "Approval & Signatures",
    preparedBy: "Prepared By",
    reviewedBy: "Reviewed By",
    approvedBy: "Approved By",
    name: "Name",
    signature: "Signature",
    signedDate: "Date",
    generatedOn: "Generated on",
    department: "Logistics & Procurement",
    notApplicable: "N/A",
  },
  ar: {
    documentTitle: "تحليل عروض الأسعار (QA)",
    prReference: "مرجع طلب الشراء",
    date: "التاريخ",
    currency: "العملة",
    prTotal: "إجمالي طلب الشراء",
    numberOfSuppliers: "عدد الموردين",
    status: "الحالة",
    supplierQuotationComparison: "مقارنة عروض أسعار الموردين",
    description: "الوصف",
    unit: "الوحدة",
    qty: "الكمية",
    estPrice: "السعر التقديري",
    total: "الإجمالي",
    multiCriteriaScoringMethod: "طريقة التقييم متعدد المعايير",
    costOnlyScoring: "تقييم التكلفة فقط",
    costOnlyDesc: "(طلب شراء ≤ 5,000$): أقل عرض إجمالي يحصل على 100 نقطة. يتم تقييم الموردين الآخرين بشكل تناسبي.",
    multiCriteriaDesc: "(طلب شراء 5,001$-25,000$): يتم تقييم الموردين باستخدام أربعة معايير مرجحة:",
    price: "السعر",
    delivery: "التسليم",
    warranty: "الضمان",
    technical: "الفني",
    priceWeight: "60%",
    deliveryWeight: "20%",
    warrantyWeight: "10%",
    technicalWeight: "10%",
    totalQuotedAmount: "إجمالي المبلغ المعروض",
    deliveryDays: "أيام التسليم",
    warrantyMonths: "أشهر الضمان",
    experienceYears: "الخبرة (3+ سنوات)",
    vendorsEvaluation: "تقييم الموردين - الدرجات الفردية والمرجحة",
    rank: "الترتيب",
    supplier: "المورد",
    priceScore: "درجة السعر (60%)",
    deliveryScore: "درجة التسليم (20%)",
    warrantyScore: "درجة الضمان (10%)",
    technicalScore: "الدرجة الفنية (10%)",
    totalScore: "الدرجة الإجمالية",
    statusCol: "الحالة",
    winner: "الفائز",
    financialScoring: "التقييم المالي",
    totalOffer: "إجمالي العرض",
    financialScore: "الدرجة المالية",
    selected: "مختار",
    selectionDecision: "قرار الاختيار",
    selectedSupplier: "المورد المختار",
    justification: "التبرير",
    evaluationReport: "تقرير التقييم",
    noEvaluationReport: "لم يتم تقديم تقرير تقييم",
    approvalSignatures: "الموافقة والتوقيعات",
    preparedBy: "أعد بواسطة",
    reviewedBy: "راجع بواسطة",
    approvedBy: "اعتمد بواسطة",
    name: "الاسم",
    signature: "التوقيع",
    signedDate: "التاريخ",
    generatedOn: "تم الإنشاء في",
    department: "الخدمات اللوجستية والمشتريات",
    notApplicable: "غ/م",
  },
};

function escapeHtml(s: string | undefined | null): string {
  if (s == null) return "";
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fmtNum(n: number, decimals = 2): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export async function generateQAPDF(
  qaId: number,
  organizationId: number,
  operatingUnitId: string,
  userId: string,
  language: PdfLang = "en"
): Promise<Buffer> {
  const db = await getDb();
  const isRTL = language === "ar";
  const l = t[language];

  console.log(`[QA PDF] Generating QA PDF for ID=${qaId}, language=${language}`);

  // ── Fetch data ──────────────────────────────────────────────────────────
  const qa = await db.query.quotationAnalyses.findFirst({
    where: and(
      eq(quotationAnalyses.id, qaId),
      eq(quotationAnalyses.organizationId, organizationId),
      isNull(quotationAnalyses.deletedAt)
    ),
  });

  if (!qa) {
    throw new Error("Quotation Analysis not found");
  }

  console.log(`[QA PDF] Fetched QA: ${qa.qaNumber}`);

  // ✅ Build official context
  const officialContext = await buildOfficialPdfContext({
    db,
    organizationId,
    operatingUnitId: Number(operatingUnitId) || 0,
    userId: Number(userId) || 0,
    language: language as 'en' | 'ar',
    documentType: 'quotation_analysis',
    documentId: qaId,
    documentModule: 'Logistics',
  });

  // Get PR
  let prNumber = "";
  let prCurrency = "USD";
  let prTotal = 0;
  if (qa.purchaseRequestId) {
    const pr = await db.query.purchaseRequests.findFirst({
      where: eq(purchaseRequests.id, qa.purchaseRequestId),
    });
    if (pr) {
      prNumber = pr.prNumber || "";
      prCurrency = pr.currency || "USD";
      prTotal = Number(pr.prTotalUsd || 0);
    }
  }

  // Get PR line items
  const prLineItems = qa.purchaseRequestId
    ? await db.query.purchaseRequestLineItems.findMany({
        where: eq(purchaseRequestLineItems.purchaseRequestId, qa.purchaseRequestId),
      })
    : [];

  // Get suppliers
  const qaSuppliers = await db.query.quotationAnalysisSuppliers.findMany({
    where: eq(quotationAnalysisSuppliers.quotationAnalysisId, qaId),
  });

  // Get line item offers
  const qaLineItems = await db.query.quotationAnalysisLineItems.findMany({
    where: eq(quotationAnalysisLineItems.quotationAnalysisId, qaId),
  });

  // Build offer lookup
  const offerLookup: Record<number, Record<number, number>> = {};
  for (const s of qaSuppliers) {
    offerLookup[s.id] = {};
  }
  for (const li of qaLineItems) {
    if (offerLookup[li.supplierId]) {
      offerLookup[li.supplierId][li.lineItemId] = Number(li.unitPrice || 0);
    }
  }

  // Calculate supplier totals
  const supplierTotals: Record<number, number> = {};
  for (const s of qaSuppliers) {
    let total = 0;
    for (const li of prLineItems) {
      const price = offerLookup[s.id]?.[li.id] || 0;
      const qty = Number(li.quantity || 0);
      total += price * qty;
    }
    supplierTotals[s.id] = total;
  }

  // Find selected supplier
  const selectedSupplier = qaSuppliers.find((s) => s.isSelected);

  // ── Header Info ──────────────────────────────────────────────────────
  const headerHtml = `
    <table style="width:100%;margin-bottom:3mm;font-size:9pt;border:1px solid #d1d5db;">
      <tbody>
        <tr>
          <td style="width:25%;font-weight:800;background:#f3f4f6;padding:2mm 3mm;border:1px solid #d1d5db;">${escapeHtml(l.prReference)}</td>
          <td style="width:25%;padding:2mm 3mm;border:1px solid #d1d5db;" class="ltr-safe">${escapeHtml(prNumber)}</td>
          <td style="width:25%;font-weight:800;background:#f3f4f6;padding:2mm 3mm;border:1px solid #d1d5db;">${escapeHtml(l.date)}</td>
          <td style="width:25%;padding:2mm 3mm;border:1px solid #d1d5db;" class="ltr-safe">${escapeHtml(new Date(qa.createdAt || new Date()).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US"))}</td>
        </tr>
        <tr>
          <td style="font-weight:800;background:#f3f4f6;padding:2mm 3mm;border:1px solid #d1d5db;">${escapeHtml(l.currency)}</td>
          <td style="padding:2mm 3mm;border:1px solid #d1d5db;" class="ltr-safe">${escapeHtml(prCurrency)}</td>
          <td style="font-weight:800;background:#f3f4f6;padding:2mm 3mm;border:1px solid #d1d5db;">${escapeHtml(l.numberOfSuppliers)}</td>
          <td style="padding:2mm 3mm;border:1px solid #d1d5db;">${qaSuppliers.length}</td>
        </tr>
        <tr>
          <td style="font-weight:800;background:#f3f4f6;padding:2mm 3mm;border:1px solid #d1d5db;">${escapeHtml(l.prTotal)}</td>
          <td style="padding:2mm 3mm;border:1px solid #d1d5db;" class="ltr-safe">${escapeHtml(prCurrency)} ${fmtNum(prTotal)}</td>
          <td style="font-weight:800;background:#f3f4f6;padding:2mm 3mm;border:1px solid #d1d5db;">${escapeHtml(l.status)}</td>
          <td style="padding:2mm 3mm;border:1px solid #d1d5db;">${escapeHtml(qa.status || l.notApplicable)}</td>
        </tr>
      </tbody>
    </table>
  `;

  // ── Supplier Quotation Comparison ────────────────────────────────────
  const supplierRows = qaSuppliers.map((supplier, idx) => {
    const total = supplierTotals[supplier.id] || 0;
    return `
      <tr>
        <td style="text-align:center;font-size:8.5pt;padding:1.5mm;border:1px solid #d1d5db;">${idx + 1}</td>
        <td style="text-align:${isRTL ? 'right' : 'left'};font-size:8.5pt;padding:1.5mm;border:1px solid #d1d5db;">${escapeHtml(supplier.supplierName || "")}</td>
        <td style="text-align:center;font-size:8.5pt;padding:1.5mm;border:1px solid #d1d5db;" class="ltr-safe">${escapeHtml(prCurrency)} ${fmtNum(total)}</td>
      </tr>
    `;
  }).join("");

  const supplierTableHtml = `
    <div style="margin-bottom:3mm;">
      <div style="background:#0d9488;color:white;padding:2mm 4mm;border-radius:3px 3px 0 0;font-weight:800;font-size:10pt;">${escapeHtml(l.supplierQuotationComparison)}</div>
      <table style="width:100%;margin-top:0;border-collapse:collapse;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="text-align:center;font-size:9pt;font-weight:700;padding:1.5mm;border:1px solid #d1d5db;width:8%;">#</th>
            <th style="text-align:${isRTL ? 'right' : 'left'};font-size:9pt;font-weight:700;padding:1.5mm;border:1px solid #d1d5db;width:60%;">${escapeHtml(l.supplier)}</th>
            <th style="text-align:center;font-size:9pt;font-weight:700;padding:1.5mm;border:1px solid #d1d5db;width:32%;">${escapeHtml(l.totalOffer)}</th>
          </tr>
        </thead>
        <tbody>
          ${supplierRows}
        </tbody>
      </table>
    </div>
  `;

  // ── Scoring Method ───────────────────────────────────────────────────
  const scoringHtml = `
    <div style="margin-bottom:3mm;padding:2mm 4mm;background:#f0fdf4;border:1px solid #86efac;border-radius:3px;">
      <div style="font-size:9pt;font-weight:700;margin-bottom:2mm;">${escapeHtml(l.multiCriteriaScoringMethod)}</div>
      <div style="font-size:8.5pt;line-height:1.5;margin-bottom:2mm;">${escapeHtml(l.multiCriteriaDesc)}</div>
      <table style="width:100%;font-size:8.5pt;border-collapse:collapse;">
        <tr>
          <td style="padding:1mm;font-weight:700;width:25%;">${escapeHtml(l.price)}</td>
          <td style="padding:1mm;width:25%;">${escapeHtml(l.priceWeight)}</td>
          <td style="padding:1mm;font-weight:700;width:25%;">${escapeHtml(l.delivery)}</td>
          <td style="padding:1mm;width:25%;">${escapeHtml(l.deliveryWeight)}</td>
        </tr>
        <tr>
          <td style="padding:1mm;font-weight:700;">${escapeHtml(l.warranty)}</td>
          <td style="padding:1mm;">${escapeHtml(l.warrantyWeight)}</td>
          <td style="padding:1mm;font-weight:700;">${escapeHtml(l.technical)}</td>
          <td style="padding:1mm;">${escapeHtml(l.technicalWeight)}</td>
        </tr>
      </table>
    </div>
  `;

  // ── Selection Decision ───────────────────────────────────────────────
  let selectionHtml = "";
  if (selectedSupplier) {
    selectionHtml = `
      <div style="margin-bottom:3mm;padding:2mm 4mm;background:#fef3c7;border:1px solid #fcd34d;border-radius:3px;">
        <div style="font-size:9pt;font-weight:700;margin-bottom:1mm;">${escapeHtml(l.selectionDecision)}</div>
        <div style="font-size:8.5pt;line-height:1.5;">
          <strong>${escapeHtml(l.selectedSupplier)}:</strong> ${escapeHtml(selectedSupplier.supplierName || "")}<br/>
          <strong>${escapeHtml(l.totalOffer)}:</strong> ${escapeHtml(prCurrency)} ${fmtNum(supplierTotals[selectedSupplier.id] || 0)}<br/>
          ${qa.selectionJustification ? `<strong>${escapeHtml(l.justification)}:</strong> ${escapeHtml(qa.selectionJustification)}` : ""}
        </div>
      </div>
    `;
  }

  // ── Signature section ────────────────────────────────────────────────
  const signatureHtml = `
    <div style="margin-top:5mm;padding-top:3mm;border-top:1px solid #d1d5db;">
      <div style="font-size:9pt;font-weight:700;margin-bottom:3mm;">${escapeHtml(l.approvalSignatures)}</div>
      <table style="width:100%;">
        <tr>
          <td style="width:33%;text-align:center;font-size:8pt;">
            <div style="border-bottom:1px solid #6b7280;height:8mm;margin-bottom:1mm;"></div>
            <div style="font-weight:700;">${escapeHtml(l.preparedBy)}</div>
          </td>
          <td style="width:33%;text-align:center;font-size:8pt;">
            <div style="border-bottom:1px solid #6b7280;height:8mm;margin-bottom:1mm;"></div>
            <div style="font-weight:700;">${escapeHtml(l.reviewedBy)}</div>
          </td>
          <td style="width:33%;text-align:center;font-size:8pt;">
            <div style="border-bottom:1px solid #6b7280;height:8mm;margin-bottom:1mm;"></div>
            <div style="font-weight:700;">${escapeHtml(l.approvedBy)}</div>
          </td>
        </tr>
      </table>
    </div>
  `;

  // ── Assemble body ────────────────────────────────────────────────────
  const bodyHtml = `
    ${headerHtml}
    ${supplierTableHtml}
    ${scoringHtml}
    ${selectionHtml}
    ${signatureHtml}
  `;

  // ✅ Use OfficialPdfEngine for PDF generation
  console.log(`[QA PDF] Generating PDF using OfficialPdfEngine`);
  
  const pdfBuffer = await generateOfficialPdf({
    context: officialContext,
    department: 'Logistics & Procurement',
    documentTitle: l.documentTitle,
    formNumber: qa.qaNumber || `QA-${qa.id}`,
    formDate: new Date(qa.createdAt || new Date()).toISOString().split('T')[0],
    bodyHtml,
  });

  console.log(`[QA PDF] QA PDF generated successfully`);
  
  return pdfBuffer;
}
