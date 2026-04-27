/**
 * Service Acceptance Certificate (SAC) PDF Generator
 *
 * Clean A4 landscape layout with inline CSS.
 * Includes digital signature and QR verification code.
 * Full RTL/LTR support.
 */

import puppeteer from "puppeteer";
import QRCode from "qrcode";
import { getDb } from "../db";
import {
  serviceAcceptanceCertificates,
  contracts,
  purchaseRequests,
  organizations,
  organizationBranding,
  operatingUnits,
  contractMilestones,
  vendors,
  users,
} from "../../drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";

export type PdfLang = "en" | "ar";

/* ── Translations ─────────────────────────────────────────────────────── */
const t = {
  en: {
    documentTitle: "SERVICE ACCEPTANCE CERTIFICATE",
    sacNumber: "SAC Number",
    date: "Date",
    prReference: "PR Reference",
    contractRef: "Contract Reference",
    vendor: "Vendor",
    project: "Project",
    contractStartDate: "Contract Start",
    contractEndDate: "Contract End",
    contractValue: "Contract Value",
    sacApprovedAmount: "SAC Approved Amount",
    acceptanceDate: "Acceptance Date",
    status: "Status",
    statusDraft: "Draft",
    statusApproved: "Signed",
    deliverablesSection: "Contract Deliverables",
    deliverable: "Deliverable",
    description: "Description",
    plannedAmount: "Planned Amount",
    dueDate: "Due Date",
    completionStatus: "Status",
    notes: "Notes",
    completionPercent: "Completion %",
    remainingWorkLabel: "Remarks / Pending Work",
    acceptanceSection: "Acceptance Confirmation",
    acceptanceStatement: "Acceptance Statement",
    verifiedBoqs: "Verified against BoQs",
    verifiedContractTerms: "Verified against Contract Terms",
    verifiedDeliverables: "Verified deliverables received",
    preparedBy: "Prepared By",
    role: "Role / Title",
    dateOfPreparation: "Date of Preparation",
    signatureSection: "Digital Signature",
    signedBy: "Signed By",
    signedAt: "Signed At",
    signature: "Signature",
    verification: "Verification",
    department: "Logistics & Procurement",
    draftWatermark: "DRAFT — NOT FINAL",
    operatingUnit: "Operating Unit",
  },
  ar: {
    documentTitle: "شهادة قبول خدمة",
    sacNumber: "رقم الشهادة",
    date: "التاريخ",
    prReference: "مرجع طلب الشراء",
    contractRef: "مرجع العقد",
    vendor: "المورد",
    project: "المشروع",
    contractStartDate: "بداية العقد",
    contractEndDate: "نهاية العقد",
    contractValue: "قيمة العقد",
    sacApprovedAmount: "المبلغ المعتمد للشهادة",
    acceptanceDate: "تاريخ القبول",
    status: "الحالة",
    statusDraft: "مسودة",
    statusApproved: "موقّع",
    deliverablesSection: "مخرجات العقد",
    deliverable: "المخرج",
    description: "الوصف",
    plannedAmount: "المبلغ المخطط",
    dueDate: "تاريخ الاستحقاق",
    completionStatus: "الحالة",
    notes: "ملاحظات",
    completionPercent: "نسبة الإنجاز %",
    remainingWorkLabel: "ملاحظات / الأعمال المتبقية",
    acceptanceSection: "تأكيد القبول",
    acceptanceStatement: "بيان القبول",
    verifiedBoqs: "تم التحقق من جداول الكميات",
    verifiedContractTerms: "تم التحقق من شروط العقد",
    verifiedDeliverables: "تم التحقق من استلام المخرجات",
    preparedBy: "أعدّه",
    role: "المسمى الوظيفي",
    dateOfPreparation: "تاريخ الإعداد",
    signatureSection: "التوقيع الرقمي",
    signedBy: "وقّعه",
    signedAt: "تاريخ التوقيع",
    signature: "التوقيع",
    verification: "التحقق",
    department: "الخدمات اللوجستية والمشتريات",
    draftWatermark: "مسودة — غير نهائي",
    operatingUnit: "وحدة التشغيل",
  },
};

/* ── Helpers ───────────────────────────────────────────────────────────── */
function esc(s: string | undefined | null): string {
  if (s == null) return "";
  return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function deliverableStatusLabel(status: string, lang: PdfLang): string {
  const map: Record<string, { en: string; ar: string }> = {
    completed: { en: "Completed", ar: "مكتمل" },
    achieved: { en: "Achieved", ar: "محقق" },
    received: { en: "Received", ar: "مستلم" },
    pending: { en: "Pending", ar: "معلق" },
    in_progress: { en: "In Progress", ar: "قيد التنفيذ" },
    partial_completed: { en: "Partial", ar: "جزئي" },
  };
  return map[status]?.[lang] || status;
}

function statusColor(status: string): string {
  if (["completed", "achieved", "received"].includes(status)) return "#059669";
  if (status === "partial_completed") return "#ea580c";
  if (status === "in_progress") return "#2563eb";
  return "#6b7280";
}

/* ── Main Generator ───────────────────────────────────────────────────── */
export async function generateSACPDF(
  sacId: number,
  organizationId: number,
  language: PdfLang = "en"
): Promise<Buffer> {
  const db = await getDb();
  const isRTL = language === "ar";
  const dir = isRTL ? "rtl" : "ltr";
  const l = t[language];

  // ── Fetch data ──────────────────────────────────────────────────────
  const [sac] = await db
    .select()
    .from(serviceAcceptanceCertificates)
    .where(and(eq(serviceAcceptanceCertificates.id, sacId), isNull(serviceAcceptanceCertificates.deletedAt)))
    .limit(1);
  if (!sac) throw new Error("SAC not found");

  const [contract] = await db.select().from(contracts).where(eq(contracts.id, sac.contractId)).limit(1);
  if (!contract) throw new Error("Contract not found");

  let prNumber = "";
  let projectTitle = "";
  if (contract.purchaseRequestId) {
    const [pr] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, contract.purchaseRequestId)).limit(1);
    if (pr) { prNumber = pr.prNumber || ""; projectTitle = pr.projectTitle || ""; }
  }

  const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
  const [branding] = await db.select().from(organizationBranding).where(eq(organizationBranding.organizationId, organizationId)).limit(1);

  let ouName = "";
  if (contract.operatingUnitId) {
    const [ou] = await db.select().from(operatingUnits).where(eq(operatingUnits.id, contract.operatingUnitId)).limit(1);
    if (ou) ouName = ou.name || "";
  }

  let vendorName = "";
  if (contract.vendorId) {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, contract.vendorId)).limit(1);
    if (vendor) vendorName = vendor.name || "";
  }

  let signerName = "";
  if (sac.signedBy) {
    const [signer] = await db.select().from(users).where(eq(users.id, sac.signedBy)).limit(1);
    if (signer) signerName = signer.name || "";
  }

  let creatorName = "";
  if (sac.createdBy) {
    const [creator] = await db.select().from(users).where(eq(users.id, sac.createdBy)).limit(1);
    if (creator) creatorName = creator.name || "";
  }

  // QR Code
  let qrCodeSvg = "";
  if (sac.verificationCode && sac.status === "approved") {
    const verifyUrl = `${process.env.VITE_OAUTH_PORTAL_URL || ""}/verify/${sac.verificationCode}`;
    try {
      qrCodeSvg = await QRCode.toString(verifyUrl, { type: "svg", width: 70, margin: 1, color: { dark: "#1a1a1a", light: "#ffffff" } });
    } catch { qrCodeSvg = ""; }
  }

  // Milestones & deliverable statuses
  const milestones = await db.select().from(contractMilestones).where(eq(contractMilestones.contractId, sac.contractId));
  let deliverableStatuses: any[] = [];
  try {
    if (sac.deliverableStatuses) {
      deliverableStatuses = typeof sac.deliverableStatuses === "string" ? JSON.parse(sac.deliverableStatuses) : sac.deliverableStatuses;
    }
  } catch { deliverableStatuses = []; }

  const currency = contract.currency || "USD";
  const contractValue = parseFloat(contract.contractValue || "0");
  const sacAmount = parseFloat(sac.approvedAmount || "0");
  const isSigned = sac.status === "approved";
  const statusLabel = isSigned ? l.statusApproved : l.statusDraft;
  const statusBadgeColor = isSigned ? "#059669" : "#6b7280";
  const hasPartial = deliverableStatuses.some((d: any) => d.status === "partial_completed");

  const logoHtml = branding?.logoUrl ? `<img src="${esc(branding.logoUrl)}" style="width:52px;height:52px;object-fit:contain;border-radius:4px;" />` : "";

  // ── Build HTML ─────────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="${language}" dir="${dir}">
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4 landscape; margin: 10mm 12mm 10mm 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { font-family: Arial, "Segoe UI", "Simplified Arabic", sans-serif; font-size: 10pt; line-height: 1.4; color: #1a1a1a; }
  html[dir="rtl"] body { direction: rtl; text-align: right; }
  html[dir="ltr"] body { direction: ltr; text-align: left; }
  .ltr { direction: ltr; unicode-bidi: isolate; text-align: left; }

  /* Header */
  .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 8px; border-bottom: 2.5px solid #1a1a1a; margin-bottom: 10px; }
  .header-left { display: flex; flex-direction: column; gap: 2px; }
  .header-left .org { font-size: 11pt; font-weight: 800; }
  .header-left .sub { font-size: 9pt; color: #555; }
  .header-center { text-align: center; }
  .header-center .title { font-size: 15pt; font-weight: 900; letter-spacing: 0.5px; }
  .header-right { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .header-right .sac-ref { font-size: 9pt; font-weight: 700; color: #333; }

  /* Metadata */
  .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px 16px; margin-bottom: 12px; padding: 8px 10px; background: #f8f9fa; border: 1px solid #e5e7eb; border-radius: 6px; }
  .meta-item { display: flex; flex-direction: column; gap: 1px; }
  .meta-label { font-size: 8pt; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
  .meta-val { font-size: 9.5pt; font-weight: 700; color: #1a1a1a; }
  .meta-val.green { color: #059669; font-weight: 900; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 8.5pt; font-weight: 800; color: #fff; }

  /* Section */
  .section { font-size: 11pt; font-weight: 800; color: #1a1a1a; margin: 12px 0 6px 0; padding-bottom: 3px; border-bottom: 1.5px solid #d1d5db; }

  /* Table */
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #d1d5db; padding: 5px 8px; vertical-align: top; font-size: 9.5pt; }
  th { background: #f3f4f6; font-weight: 800; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.2px; }
  td { font-weight: 500; }
  html[dir="rtl"] th, html[dir="rtl"] td { text-align: right; }
  .num { text-align: ${isRTL ? "left" : "right"}; }
  .center { text-align: center; }

  /* Acceptance */
  .stmt-box { background: #f8f9fa; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 12px; margin-bottom: 8px; font-size: 9.5pt; line-height: 1.5; }
  .check-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px 16px; margin-bottom: 8px; }
  .check-item { display: flex; align-items: center; gap: 6px; font-size: 9pt; }
  .check-icon { font-size: 12pt; }
  .check-icon.yes { color: #059669; }
  .check-icon.no { color: #dc2626; }

  /* Prepared + Signature row */
  .bottom-row { display: flex; gap: 20px; margin-top: 10px; }
  .bottom-col { flex: 1; }
  .info-grid { display: grid; grid-template-columns: auto 1fr; gap: 3px 10px; font-size: 9pt; }
  .info-label { color: #6b7280; font-weight: 700; }
  .info-val { font-weight: 600; }

  /* Signature block */
  .sig-block { display: flex; align-items: flex-start; gap: 16px; margin-top: 6px; }
  .sig-img { border: 1px solid #d1d5db; border-radius: 6px; padding: 6px; background: #fff; }
  .sig-img img { max-height: 60px; max-width: 200px; display: block; }
  .qr-block { text-align: center; }
  .qr-block svg { display: block; }

  /* Draft signature lines */
  .sig-line { border-bottom: 1px solid #999; height: 30px; margin-top: 6px; }
  .sig-hint { font-size: 8pt; color: #888; margin-top: 2px; }

  /* Watermark */
  ${!isSigned ? `.watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg); font-size: 72pt; font-weight: 900; color: rgba(220, 38, 38, 0.06); white-space: nowrap; z-index: 0; pointer-events: none; }` : ""}

  /* Avoid breaks */
  .avoid-break { page-break-inside: avoid; }
</style>
</head>
<body>
${!isSigned ? `<div class="watermark">${l.draftWatermark}</div>` : ""}

<!-- HEADER -->
<div class="header">
  <div class="header-left">
    <div class="org">${esc(org?.name || "")}</div>
    ${ouName ? `<div class="sub">${esc(ouName)}</div>` : ""}
    <div class="sub">${l.department}</div>
  </div>
  <div class="header-center">
    <div class="title">${l.documentTitle}</div>
  </div>
  <div class="header-right">
    ${logoHtml}
    <div class="sac-ref ltr">${esc(sac.sacNumber || "")}</div>
  </div>
</div>

<!-- METADATA -->
<div class="meta">
  <div class="meta-item">
    <span class="meta-label">${l.sacNumber}</span>
    <span class="meta-val ltr">${esc(sac.sacNumber)}</span>
  </div>
  <div class="meta-item">
    <span class="meta-label">${l.prReference}</span>
    <span class="meta-val ltr">${esc(prNumber)}</span>
  </div>
  <div class="meta-item">
    <span class="meta-label">${l.contractRef}</span>
    <span class="meta-val ltr">${esc(contract.contractNumber || "")}</span>
  </div>
  <div class="meta-item">
    <span class="meta-label">${l.vendor}</span>
    <span class="meta-val">${esc(vendorName)}</span>
  </div>
  <div class="meta-item">
    <span class="meta-label">${l.project}</span>
    <span class="meta-val">${esc(projectTitle)}</span>
  </div>
  <div class="meta-item">
    <span class="meta-label">${l.contractStartDate}</span>
    <span class="meta-val ltr">${contract.startDate ? new Date(contract.startDate).toLocaleDateString() : "—"}</span>
  </div>
  <div class="meta-item">
    <span class="meta-label">${l.contractEndDate}</span>
    <span class="meta-val ltr">${contract.endDate ? new Date(contract.endDate).toLocaleDateString() : "—"}</span>
  </div>
  <div class="meta-item">
    <span class="meta-label">${l.contractValue}</span>
    <span class="meta-val ltr">${currency} ${contractValue.toLocaleString()}</span>
  </div>
  <div class="meta-item">
    <span class="meta-label">${l.sacApprovedAmount}</span>
    <span class="meta-val green ltr">${currency} ${sacAmount.toLocaleString()}</span>
  </div>
  <div class="meta-item">
    <span class="meta-label">${l.acceptanceDate}</span>
    <span class="meta-val ltr">${sac.acceptanceDate ? new Date(sac.acceptanceDate).toLocaleDateString() : "—"}</span>
  </div>
  <div class="meta-item">
    <span class="meta-label">${l.date}</span>
    <span class="meta-val ltr">${sac.createdAt ? new Date(sac.createdAt).toLocaleDateString() : ""}</span>
  </div>
  <div class="meta-item">
    <span class="meta-label">${l.status}</span>
    <span class="badge" style="background:${statusBadgeColor};">${statusLabel}</span>
  </div>
</div>

<!-- DELIVERABLES TABLE -->
<div class="section">${l.deliverablesSection}</div>
${milestones.length > 0 ? `
<table>
  <thead>
    <tr>
      <th style="width:30px;" class="center">#</th>
      <th style="width:${hasPartial ? '18%' : '24%'}">${l.deliverable}</th>
      <th style="width:${hasPartial ? '14%' : '18%'}">${l.description}</th>
      <th class="num" style="width:12%">${l.plannedAmount}</th>
      <th style="width:9%" class="center">${l.dueDate}</th>
      <th style="width:9%" class="center">${l.completionStatus}</th>
      ${hasPartial ? `<th style="width:7%" class="center">${l.completionPercent}</th>` : ""}
      <th style="width:${hasPartial ? '25%' : '20%'}">${hasPartial ? l.remainingWorkLabel : l.notes}</th>
    </tr>
  </thead>
  <tbody>
    ${milestones.map((m, idx) => {
      const saved = deliverableStatuses.find((d: any) => d.milestoneId === m.id);
      const st = saved?.status || "pending";
      const notes = saved?.notes || "";
      const isPartialRow = st === "partial_completed";
      return `<tr class="avoid-break">
        <td class="center">${idx + 1}</td>
        <td style="word-wrap:break-word;">${esc(m.title || "")}</td>
        <td style="word-wrap:break-word;">${esc(m.description || "")}</td>
        <td class="num ltr">${m.amount ? `${currency} ${parseFloat(m.amount).toLocaleString()}` : "—"}</td>
        <td class="center ltr">${m.dueDate ? new Date(m.dueDate).toLocaleDateString(undefined, { timeZone: "UTC" }) : "—"}</td>
        <td class="center" style="color:${statusColor(st)};font-weight:700;">${deliverableStatusLabel(st, language)}</td>
        ${hasPartial ? `<td class="center">${isPartialRow && saved?.completionPercent != null ? `<strong>${saved.completionPercent}%</strong>` : "—"}</td>` : ""}
        <td style="word-wrap:break-word;">${hasPartial ? (isPartialRow && saved?.remainingWork ? esc(saved.remainingWork) : "—") : esc(notes)}</td>
      </tr>`;
    }).join("")}
  </tbody>
</table>` : `<p style="color:#6b7280;font-style:italic;">No deliverables found.</p>`}

<!-- ACCEPTANCE CONFIRMATION -->
<div class="section">${l.acceptanceSection}</div>
<div class="stmt-box">${esc(sac.acceptanceText || "—")}</div>
<div class="check-grid">
  <div class="check-item">
    <span class="check-icon ${sac.verifiedBoqs ? "yes" : "no"}">${sac.verifiedBoqs ? "✓" : "✗"}</span>
    <span>${l.verifiedBoqs}</span>
  </div>
  <div class="check-item">
    <span class="check-icon ${sac.verifiedContractTerms ? "yes" : "no"}">${sac.verifiedContractTerms ? "✓" : "✗"}</span>
    <span>${l.verifiedContractTerms}</span>
  </div>
  <div class="check-item">
    <span class="check-icon ${sac.verifiedDeliverablesReceived ? "yes" : "no"}">${sac.verifiedDeliverablesReceived ? "✓" : "✗"}</span>
    <span>${l.verifiedDeliverables}</span>
  </div>
</div>

<!-- BOTTOM ROW: Prepared By + Signature -->
<div class="bottom-row avoid-break">
  <!-- Prepared By -->
  <div class="bottom-col">
    <div class="section" style="margin-top:0;">${l.preparedBy}</div>
    <div class="info-grid">
      <span class="info-label">${l.preparedBy}:</span>
      <span class="info-val">${esc(creatorName || sac.preparedByName || "")}</span>
      <span class="info-label">${l.role}:</span>
      <span class="info-val">${esc(sac.preparedByRole || "")}</span>
      <span class="info-label">${l.dateOfPreparation}:</span>
      <span class="info-val ltr">${sac.createdAt ? new Date(sac.createdAt).toLocaleDateString() : ""}</span>
    </div>
  </div>

  <!-- Digital Signature -->
  <div class="bottom-col">
    <div class="section" style="margin-top:0;">${l.signatureSection}</div>
    ${isSigned && sac.signatureImageUrl ? `
    <div class="info-grid" style="margin-bottom:6px;">
      <span class="info-label">${l.signedBy}:</span>
      <span class="info-val">${esc(signerName)}</span>
      <span class="info-label">${l.signedAt}:</span>
      <span class="info-val ltr">${sac.signedAt ? new Date(sac.signedAt).toLocaleString() : ""}</span>
    </div>
    <div class="sig-block">
      <div class="sig-img">
        <img src="${esc(sac.signatureImageUrl)}" />
      </div>
      ${qrCodeSvg ? `
      <div class="qr-block">
        ${qrCodeSvg}
      </div>` : ""}
    </div>
    ` : `
    <div style="display:flex;gap:20px;">
      <div style="flex:1;">
        <div class="sig-line"></div>
        <div class="sig-hint">${l.signature}</div>
      </div>
      <div style="flex:1;">
        <div class="sig-line"></div>
        <div class="sig-hint">${l.date}</div>
      </div>
    </div>
    `}
  </div>
</div>

</body>
</html>`.trim();

  // ── Render PDF ─────────────────────────────────────────────────────
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 30000 });

    const pdf = await page.pdf({
      landscape: true,
      format: "A4",
      margin: { top: "8mm", bottom: "8mm", left: "10mm", right: "10mm" },
      printBackground: true,
      preferCSSPageSize: false,
    });

    return pdf;
  } finally {
    await browser.close();
  }
}
