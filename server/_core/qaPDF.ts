/**
 * QA (Quotation Analysis) PDF Generator
 *
 * Uses Puppeteer + official-pdf.css (BOM flexbox approach) for consistent styling.
 * A4 landscape, full RTL/LTR support.
 * Matches CBA PDF approach with bilingual en/ar translations.
 *
 * Sections:
 * - Header with QA info (QA number, date, PR details, total)
 * - Supplier Offer Matrix table
 * - Multi-Criteria Scoring Method box (Price 60%, Delivery 20%, Warranty 10%, Technical 10%)
 * - Vendors Evaluation table with individual and weighted scores
 * - Winner selection and Evaluation Report
 * - Approval signatures
 */

import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { getDb } from "../db";
import {
  quotationAnalyses,
  quotationAnalysisSuppliers,
  quotationAnalysisLineItems,
  purchaseRequests,
  purchaseRequestLineItems,
  organizations,
  organizationBranding,
  operatingUnits,
} from "../../drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";

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
    page: "Page",
    of: "of",
    generatedOn: "Generated on",
    department: "Logistics & Procurement",
    notApplicable: "N/A",
    operatingUnit: "Operating Unit",
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
    page: "صفحة",
    of: "من",
    generatedOn: "تم الإنشاء في",
    department: "الخدمات اللوجستية والمشتريات",
    notApplicable: "غ/م",
    operatingUnit: "وحدة التشغيل",
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
  language: PdfLang = "en"
): Promise<Buffer> {
  const db = await getDb();
  const isRTL = language === "ar";
  const dir = isRTL ? "rtl" : "ltr";
  const l = t[language];

  // ── Fetch data ──────────────────────────────────────────────────────────
  const [qa] = await db
    .select()
    .from(quotationAnalyses)
    .where(
      and(
        eq(quotationAnalyses.id, qaId),
        eq(quotationAnalyses.organizationId, organizationId),
        isNull(quotationAnalyses.deletedAt)
      )
    )
    .limit(1);

  if (!qa) throw new Error("Quotation Analysis not found");

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  const [branding] = await db
    .select()
    .from(organizationBranding)
    .where(eq(organizationBranding.organizationId, organizationId))
    .limit(1);

  let ouName = "";
  let ouNameAr = "";
  if (qa.operatingUnitId) {
    const [ou] = await db
      .select()
      .from(operatingUnits)
      .where(eq(operatingUnits.id, qa.operatingUnitId))
      .limit(1);
    if (ou) {
      ouName = ou.name || "";
      ouNameAr = (ou as any).nameAr || ou.name || "";
    }
  }

  // Get PR
  let prNumber = "";
  let prCurrency = "USD";
  let prTotal = 0;
  let prDescription = "";
  if (qa.purchaseRequestId) {
    const [pr] = await db
      .select()
      .from(purchaseRequests)
      .where(eq(purchaseRequests.id, qa.purchaseRequestId))
      .limit(1);
    if (pr) {
      prNumber = pr.prNumber || "";
      prCurrency = pr.currency || "USD";
      prTotal = Number(pr.prTotalUsd || 0);
      prDescription = pr.projectTitle || "";
    }
  }

  // Get PR line items
  const prLineItems = qa.purchaseRequestId
    ? await db
        .select()
        .from(purchaseRequestLineItems)
        .where(eq(purchaseRequestLineItems.purchaseRequestId, qa.purchaseRequestId!))
    : [];

  // Get suppliers
  const qaSuppliers = await db
    .select()
    .from(quotationAnalysisSuppliers)
    .where(eq(quotationAnalysisSuppliers.quotationAnalysisId, qaId));

  // Get line item offers
  const qaLineItems = await db
    .select()
    .from(quotationAnalysisLineItems)
    .where(eq(quotationAnalysisLineItems.quotationAnalysisId, qaId));

  // Build offer lookup: supplierId -> lineItemId -> unitPrice
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

  // ── Read CSS ──────────────────────────────────────────────────────────
  // Use official-pdf.css (BOM's flexbox approach) — proven RTL mirroring
  const cssPath = path.join(import.meta.dirname, "../services/pdf/templates/styles/official-pdf.css");
  const css = fs.readFileSync(cssPath, "utf-8");

  const orgName = isRTL
    ? (org as any)?.nameAr || org?.name || "المنظمة"
    : org?.name || "Organization";
  const operatingUnitDisplay = isRTL ? ouNameAr || ouName : ouName || ouNameAr;
  const logoUrl = branding?.logoUrl || "";
  const dateText = qa.createdAt
    ? new Date(qa.createdAt).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US")
    : new Date().toLocaleDateString(language === "ar" ? "ar-SA" : "en-US");

  // ── Header Info Table ────────────────────────────────────────────────
  const headerInfoHtml = `
    <table class="details-table" style="width:100%;margin-bottom:3mm;font-size:9pt;border:1px solid #d1d5db;">
      <tbody>
        <tr>
          <td style="width:15%;font-weight:800;background:#f3f4f6;padding:2mm 3mm;border:1px solid #d1d5db;">${escapeHtml(l.prReference)}</td>
          <td style="width:35%;padding:2mm 3mm;border:1px solid #d1d5db;" class="ltr-safe">${escapeHtml(prNumber)}</td>
          <td style="width:15%;font-weight:800;background:#f3f4f6;padding:2mm 3mm;border:1px solid #d1d5db;">${escapeHtml(l.prTotal)}</td>
          <td style="width:35%;padding:2mm 3mm;border:1px solid #d1d5db;" class="ltr-safe">${escapeHtml(prCurrency)} ${fmtNum(prTotal)}</td>
        </tr>
        <tr>
          <td style="font-weight:800;background:#f3f4f6;padding:2mm 3mm;border:1px solid #d1d5db;">${escapeHtml(l.date)}</td>
          <td style="padding:2mm 3mm;border:1px solid #d1d5db;" class="ltr-safe">${escapeHtml(dateText)}</td>
          <td style="font-weight:800;background:#f3f4f6;padding:2mm 3mm;border:1px solid #d1d5db;">${escapeHtml(l.currency)}</td>
          <td style="padding:2mm 3mm;border:1px solid #d1d5db;" class="ltr-safe">${escapeHtml(prCurrency)}</td>
        </tr>
        <tr>
          <td style="font-weight:800;background:#f3f4f6;padding:2mm 3mm;border:1px solid #d1d5db;">${escapeHtml(l.status)}</td>
          <td style="padding:2mm 3mm;border:1px solid #d1d5db;">${escapeHtml((qa.status || "draft").replace(/_/g, " "))}</td>
          <td style="font-weight:800;background:#f3f4f6;padding:2mm 3mm;border:1px solid #d1d5db;">${escapeHtml(l.numberOfSuppliers)}</td>
          <td style="padding:2mm 3mm;border:1px solid #d1d5db;">${qaSuppliers.length}</td>
        </tr>
      </tbody>
    </table>
  `;

  // ── Supplier Offer Comparison Matrix ────────────────────────────────
  const supplierHeaders = qaSuppliers
    .map(
      (s) =>
        `<th style="text-align:center;font-size:7.5pt;padding:1.5mm 1mm;min-width:60px;">${escapeHtml(s.supplierName || `Supplier ${s.id}`)}</th>`
    )
    .join("");

  const offerRows = prLineItems
    .map((li, idx) => {
      const supplierCells = qaSuppliers
        .map((s) => {
          const unitPrice = offerLookup[s.id]?.[li.id] || 0;
          const qty = Number(li.quantity || 0);
          const lineTotal = unitPrice * qty;
          return `<td style="text-align:center;font-size:8.5pt;padding:1.5mm;" class="ltr-safe">${lineTotal > 0 ? fmtNum(lineTotal) : "-"}</td>`;
        })
        .join("");

      return `
        <tr>
          <td style="text-align:center;font-size:8.5pt;padding:1.5mm;">${idx + 1}</td>
          <td style="font-size:8.5pt;padding:1.5mm 2mm;">${escapeHtml(li.description || "-")}</td>
          <td style="text-align:center;font-size:8.5pt;padding:1.5mm;">${li.unit || "-"}</td>
          <td style="text-align:center;font-size:8.5pt;padding:1.5mm;">${Number(li.quantity || 0)}</td>
          <td style="text-align:center;font-size:8.5pt;padding:1.5mm;" class="ltr-safe">${fmtNum(Number(li.unitPrice || 0))}</td>
          ${supplierCells}
        </tr>
      `;
    })
    .join("");

  const totalCells = qaSuppliers
    .map(
      (s) =>
        `<td style="text-align:center;font-weight:700;font-size:8.5pt;padding:1.5mm;" class="ltr-safe">${fmtNum(supplierTotals[s.id] || 0)}</td>`
    )
    .join("");

  const offerMatrixHtml = `
    <div style="margin-bottom:3mm;">
      <div style="background:#0d9488;color:white;padding:2mm 4mm;border-radius:3px 3px 0 0;font-weight:800;font-size:10pt;">${escapeHtml(l.supplierQuotationComparison)}</div>
      <table style="width:100%;margin-top:0;">
        <thead>
          <tr>
            <th style="text-align:center;font-size:8pt;padding:1.5mm;width:30px;">#</th>
            <th style="text-align:${isRTL ? "right" : "left"};font-size:8pt;padding:1.5mm 2mm;">${escapeHtml(l.description)}</th>
            <th style="text-align:center;font-size:8pt;padding:1.5mm;">${escapeHtml(l.unit)}</th>
            <th style="text-align:center;font-size:8pt;padding:1.5mm;">${escapeHtml(l.qty)}</th>
            <th style="text-align:center;font-size:8pt;padding:1.5mm;">${escapeHtml(l.estPrice)}</th>
            ${supplierHeaders}
          </tr>
        </thead>
        <tbody>
          ${offerRows}
          <tr style="background:#f3f4f6;font-weight:700;">
            <td colspan="4" style="text-align:${isRTL ? "left" : "right"};font-size:8.5pt;padding:1.5mm 2mm;">${escapeHtml(l.total)}</td>
            <td style="text-align:center;font-size:8.5pt;padding:1.5mm;" class="ltr-safe">${fmtNum(prTotal)}</td>
            ${totalCells}
          </tr>
        </tbody>
      </table>
    </div>
  `;

  // ── Multi-Criteria Scoring Method ────────────────────────────────────
  const isMultiCriteria = prTotal > 5000;
  const scoringMethodHtml = isMultiCriteria
    ? `
    <div style="margin-bottom:3mm;">
      <div style="background:#0d9488;color:white;padding:2mm 4mm;border-radius:3px 3px 0 0;font-weight:800;font-size:10pt;">${escapeHtml(l.multiCriteriaScoringMethod)}</div>
      <div style="border:1px solid #e5e7eb;border-top:none;padding:3mm 4mm;background:#f0f9ff;">
        <div style="font-size:8.5pt;color:#4b5563;margin-bottom:2mm;">${escapeHtml(l.multiCriteriaDesc)}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:3mm;">
          <div style="border:1px solid #d1d5db;border-radius:3px;padding:2mm 3mm;">
            <div style="font-weight:800;color:#2563eb;font-size:11pt;">${escapeHtml(l.priceWeight)}</div>
            <div style="font-weight:600;font-size:9pt;">${escapeHtml(l.price)}</div>
            <div style="font-size:7.5pt;color:#6b7280;">${escapeHtml(l.totalQuotedAmount)}</div>
          </div>
          <div style="border:1px solid #d1d5db;border-radius:3px;padding:2mm 3mm;">
            <div style="font-weight:800;color:#16a34a;font-size:11pt;">${escapeHtml(l.deliveryWeight)}</div>
            <div style="font-weight:600;font-size:9pt;">${escapeHtml(l.delivery)}</div>
            <div style="font-size:7.5pt;color:#6b7280;">${escapeHtml(l.deliveryDays)}</div>
          </div>
          <div style="border:1px solid #d1d5db;border-radius:3px;padding:2mm 3mm;">
            <div style="font-weight:800;color:#9333ea;font-size:11pt;">${escapeHtml(l.warrantyWeight)}</div>
            <div style="font-weight:600;font-size:9pt;">${escapeHtml(l.warranty)}</div>
            <div style="font-size:7.5pt;color:#6b7280;">${escapeHtml(l.warrantyMonths)}</div>
          </div>
          <div style="border:1px solid #d1d5db;border-radius:3px;padding:2mm 3mm;">
            <div style="font-weight:800;color:#ea580c;font-size:11pt;">${escapeHtml(l.technicalWeight)}</div>
            <div style="font-weight:600;font-size:9pt;">${escapeHtml(l.technical)}</div>
            <div style="font-size:7.5pt;color:#6b7280;">${escapeHtml(l.experienceYears)}</div>
          </div>
        </div>
      </div>
    </div>
  `
    : `
    <div style="margin-bottom:3mm;">
      <div style="background:#0d9488;color:white;padding:2mm 4mm;border-radius:3px 3px 0 0;font-weight:800;font-size:10pt;">${escapeHtml(l.financialScoring)}</div>
      <div style="border:1px solid #e5e7eb;border-top:none;padding:3mm 4mm;background:#f0f9ff;">
        <div style="font-size:8.5pt;color:#4b5563;"><strong>${escapeHtml(l.costOnlyScoring)}</strong> ${escapeHtml(l.costOnlyDesc)}</div>
      </div>
    </div>
  `;

  // ── Vendors Evaluation Table ─────────────────────────────────────────
  let evaluationHtml = "";
  if (isMultiCriteria) {
    const evalRows = qaSuppliers
      .map((s, idx) => {
        const priceScore = Number(s.priceScore || 0);
        const deliveryScore = Number(s.deliveryScore || 0);
        const warrantyScore = Number(s.warrantyScore || 0);
        const technicalScore = Number(s.technicalCriterionScore || 0);
        const pw = (priceScore * 0.6).toFixed(1);
        const dw = (deliveryScore * 0.2).toFixed(1);
        const ww = (warrantyScore * 0.1).toFixed(1);
        const tw = (technicalScore * 0.1).toFixed(1);
        const totalScoreVal = (parseFloat(pw) + parseFloat(dw) + parseFloat(ww) + parseFloat(tw)).toFixed(1);
        const isWinner = s.isSelected;

        return `
          <tr${isWinner ? ' style="background:#f0fdf4;"' : ""}>
            <td style="text-align:center;font-weight:700;font-size:9pt;padding:1.5mm;">#${idx + 1}</td>
            <td style="font-weight:600;font-size:8.5pt;padding:1.5mm 2mm;">${escapeHtml(s.supplierName || "")}</td>
            <td style="text-align:center;font-size:8.5pt;padding:1.5mm;">${priceScore.toFixed(1)} (${pw})</td>
            <td style="text-align:center;font-size:8.5pt;padding:1.5mm;">${deliveryScore.toFixed(1)} (${dw})</td>
            <td style="text-align:center;font-size:8.5pt;padding:1.5mm;">${warrantyScore.toFixed(1)} (${ww})</td>
            <td style="text-align:center;font-size:8.5pt;padding:1.5mm;">${technicalScore.toFixed(1)} (${tw})</td>
            <td style="text-align:center;font-weight:900;font-size:9pt;padding:1.5mm;">${totalScoreVal}</td>
            <td style="text-align:center;font-weight:700;color:${isWinner ? "#15803d" : "#6b7280"};font-size:8.5pt;padding:1.5mm;">
              ${isWinner ? `✓ ${escapeHtml(l.winner)}` : "-"}
            </td>
          </tr>
        `;
      })
      .join("");

    evaluationHtml = `
      <div style="margin-bottom:3mm;">
        <div style="background:#0d9488;color:white;padding:2mm 4mm;border-radius:3px 3px 0 0;font-weight:800;font-size:10pt;">${escapeHtml(l.vendorsEvaluation)}</div>
        <table style="width:100%;margin-top:0;">
          <thead>
            <tr>
              <th style="text-align:center;font-size:8pt;padding:1.5mm;">${escapeHtml(l.rank)}</th>
              <th style="text-align:${isRTL ? "right" : "left"};font-size:8pt;padding:1.5mm 2mm;">${escapeHtml(l.supplier)}</th>
              <th style="text-align:center;font-size:7.5pt;padding:1.5mm;">${escapeHtml(l.priceScore)}</th>
              <th style="text-align:center;font-size:7.5pt;padding:1.5mm;">${escapeHtml(l.deliveryScore)}</th>
              <th style="text-align:center;font-size:7.5pt;padding:1.5mm;">${escapeHtml(l.warrantyScore)}</th>
              <th style="text-align:center;font-size:7.5pt;padding:1.5mm;">${escapeHtml(l.technicalScore)}</th>
              <th style="text-align:center;font-size:8pt;padding:1.5mm;">${escapeHtml(l.totalScore)}</th>
              <th style="text-align:center;font-size:8pt;padding:1.5mm;">${escapeHtml(l.statusCol)}</th>
            </tr>
          </thead>
          <tbody>${evalRows}</tbody>
        </table>
      </div>
    `;
  } else {
    // Cost-only: simple financial scoring table
    const finRows = qaSuppliers
      .map((s, idx) => {
        const isWinner = s.isSelected;
        return `
          <tr${isWinner ? ' style="background:#f0fdf4;"' : ""}>
            <td style="text-align:center;font-size:8.5pt;padding:1.5mm;">${idx + 1}</td>
            <td style="font-weight:600;font-size:8.5pt;padding:1.5mm 2mm;">${escapeHtml(s.supplierName || "")}</td>
            <td style="text-align:center;font-size:8.5pt;padding:1.5mm;" class="ltr-safe">${escapeHtml(prCurrency)} ${fmtNum(supplierTotals[s.id] || 0)}</td>
            <td style="text-align:center;font-weight:700;font-size:9pt;padding:1.5mm;">${Number(s.financialScore || 0).toFixed(1)}</td>
            <td style="text-align:center;font-weight:700;color:${isWinner ? "#15803d" : "#6b7280"};font-size:8.5pt;padding:1.5mm;">
              ${isWinner ? "✓" : ""}
            </td>
          </tr>
        `;
      })
      .join("");

    evaluationHtml = `
      <div style="margin-bottom:3mm;">
        <div style="background:#0d9488;color:white;padding:2mm 4mm;border-radius:3px 3px 0 0;font-weight:800;font-size:10pt;">${escapeHtml(l.financialScoring)}</div>
        <table style="width:100%;margin-top:0;">
          <thead>
            <tr>
              <th style="text-align:center;font-size:8pt;padding:1.5mm;width:30px;">#</th>
              <th style="text-align:${isRTL ? "right" : "left"};font-size:8pt;padding:1.5mm 2mm;">${escapeHtml(l.supplier)}</th>
              <th style="text-align:center;font-size:8pt;padding:1.5mm;">${escapeHtml(l.totalOffer)}</th>
              <th style="text-align:center;font-size:8pt;padding:1.5mm;">${escapeHtml(l.financialScore)}</th>
              <th style="text-align:center;font-size:8pt;padding:1.5mm;">${escapeHtml(l.selected)}</th>
            </tr>
          </thead>
          <tbody>${finRows}</tbody>
        </table>
      </div>
    `;
  }

  // ── Selection Decision ───────────────────────────────────────────────
  let selectionHtml = "";
  if (selectedSupplier) {
    selectionHtml = `
      <div class="avoid-break" style="margin-bottom:3mm;">
        <h3 style="font-size:10pt;font-weight:900;margin:2mm 0 1.5mm 0;">${escapeHtml(l.selectionDecision)}</h3>
        <div style="padding:2mm 4mm;background:#f0fdf4;border:1px solid #86efac;border-radius:3px;margin-bottom:2mm;">
          <div style="font-size:8pt;color:#4b5563;">${escapeHtml(l.selectedSupplier)}:</div>
          <div style="font-size:11pt;font-weight:900;color:#15803d;">${escapeHtml(selectedSupplier.supplierName || "")}</div>
        </div>
        ${
          qa.selectionJustification
            ? `
          <div style="padding:2mm 4mm;background:#f8fafc;border:1px solid #e2e8f0;border-radius:3px;">
            <div style="font-size:8pt;color:#4b5563;margin-bottom:1mm;">${escapeHtml(l.justification)}:</div>
            <div style="font-size:9pt;line-height:1.4;">${escapeHtml(qa.selectionJustification)}</div>
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  // ── Evaluation Report ────────────────────────────────────────────────
  let evalReportHtml = "";
  if (qa.evaluationReport) {
    evalReportHtml = `
      <div class="avoid-break" style="margin-bottom:3mm;">
        <h3 style="font-size:10pt;font-weight:900;margin:2mm 0 1.5mm 0;">${escapeHtml(l.evaluationReport)}</h3>
        <div style="padding:3mm 4mm;background:#f8fafc;border:2px solid #4b5563;font-size:9pt;line-height:1.5;">
          ${escapeHtml(qa.evaluationReport)}
        </div>
      </div>
    `;
  }

  // ── Approval Signatures ──────────────────────────────────────────────
  const defaultRoles = isRTL
    ? [l.preparedBy, l.reviewedBy, l.approvedBy]
    : [l.preparedBy, l.reviewedBy, l.approvedBy];

  const emptyRows = defaultRoles
    .map(
      (role) => `
      <tr>
        <td style="font-weight:600;font-size:8.5pt;padding:1.5mm 2mm;">${escapeHtml(role)}</td>
        <td style="padding:1.5mm 2mm;"><div style="border-bottom:1px solid #d1d5db;height:6mm;"></div></td>
        <td style="padding:1.5mm;"><div style="border-bottom:1px solid #d1d5db;height:6mm;"></div></td>
        <td style="padding:1.5mm;"><div style="border-bottom:1px solid #d1d5db;height:6mm;"></div></td>
      </tr>
    `
    )
    .join("");

  const signaturesHtml = `
    <div class="avoid-break" style="margin-top:3mm;">
      <h3 style="font-size:10pt;font-weight:900;margin:2mm 0 1.5mm 0;">${escapeHtml(l.approvalSignatures)}</h3>
      <table style="width:100%;">
        <thead>
          <tr>
            <th style="text-align:${isRTL ? "right" : "left"};font-size:8pt;width:20%;padding:1.5mm 2mm;">${escapeHtml(isRTL ? "الدور" : "Role")}</th>
            <th style="text-align:${isRTL ? "right" : "left"};font-size:8pt;width:25%;padding:1.5mm 2mm;">${escapeHtml(l.name)}</th>
            <th style="text-align:center;font-size:8pt;width:35%;padding:1.5mm;">${escapeHtml(l.signature)}</th>
            <th style="text-align:center;font-size:8pt;width:20%;padding:1.5mm;">${escapeHtml(l.signedDate)}</th>
          </tr>
        </thead>
        <tbody>${emptyRows}</tbody>
      </table>
    </div>
  `;

  // ── Assemble full body ────────────────────────────────────────────────
  const bodyHtml = `
    ${headerInfoHtml}
    ${offerMatrixHtml}
    ${scoringMethodHtml}
    ${evaluationHtml}
    ${selectionHtml}
    ${evalReportHtml}
    ${signaturesHtml}
  `;

  // ── Build full HTML ───────────────────────────────────────────────────
  const fullHtml = `
<!doctype html>
<html dir="${dir}" lang="${language}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(l.documentTitle)}</title>
  <style>${css}</style>
  <style>
    @page {
      size: A4 landscape;
      margin: 6mm 8mm;
    }
    body {
      font-size: 9pt;
      line-height: 1.3;
    }
    .pdf-page {
      padding: 0 4mm;
    }
    .pdf-content {
      margin-top: 2mm;
    }
    .pdf-header-divider {
      margin: 3mm 0 2mm 0;
    }
    table {
      page-break-inside: auto;
      margin-top: 0;
    }
    th, td {
      padding: 1.5mm 2mm;
    }
    tr { page-break-inside: avoid; break-inside: avoid; }
    thead { display: table-header-group; }
    .details-table td {
      border: 1px solid #d1d5db;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    html[dir="rtl"] th {
      text-align: right;
    }
    html[dir="rtl"] th[style*="text-align:center"] {
      text-align: center !important;
    }
  </style>
</head>
<body>
  <div class="pdf-page">
    <div class="official-header" style="margin-top:1mm;">
      <div class="header-left">
        <div class="org-block">
          <div class="org-name" style="font-size:10.5pt;">${escapeHtml(orgName)}</div>
          ${operatingUnitDisplay ? `<div class="ou-name" style="font-size:9pt;">${escapeHtml(operatingUnitDisplay)}</div>` : ""}
          <div class="module-name" style="font-size:9pt;">${escapeHtml(l.department)}</div>
        </div>
      </div>
      <div class="header-center">
        <div class="doc-title" style="font-size:13pt;">${escapeHtml(l.documentTitle)}</div>
      </div>
      <div class="header-right">
        ${logoUrl ? `<img class="org-logo" src="${escapeHtml(logoUrl)}" alt="Logo" style="width:48px;height:48px;" />` : ""}
        <div class="ref-date" style="font-size:9pt;">
          <div class="value ltr-safe">${escapeHtml(qa.qaNumber || "")}</div>
          <div class="value ltr-safe">${escapeHtml(dateText)}</div>
        </div>
      </div>
    </div>
    <hr class="hr-strong" />
    <div class="pdf-content">
      ${bodyHtml}
    </div>
  </div>
</body>
</html>
`.trim();

  // ── Generate PDF with Puppeteer ───────────────────────────────────────
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 1200 });
    await page.setContent(fullHtml, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    const pdf = await page.pdf({
      landscape: true,
      format: "A4",
      margin: {
        top: "6mm",
        bottom: "8mm",
        left: "8mm",
        right: "8mm",
      },
      printBackground: true,
      preferCSSPageSize: false,
    });

    return pdf;
  } finally {
    await browser.close();
  }
}
