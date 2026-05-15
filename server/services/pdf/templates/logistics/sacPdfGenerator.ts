/**
 * Service Acceptance Certificate (SAC) PDF Generator - Centralized
 * 
 * Uses OfficialPdfEngine for consistent styling and centralized PDF generation.
 * A4 landscape, full RTL/LTR support.
 */

import { getDb } from "../../../../db";
import {
  serviceAcceptanceCertificates,
  contracts,
  purchaseRequests,
  contractMilestones,
  vendors,
  users,
} from "drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";
import { buildOfficialPdfContext } from "../../buildOfficialPdfContext";
import { generateOfficialPdf } from "../../OfficialPdfEngine";

export type PdfLang = "en" | "ar";

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
    notApplicable: "N/A",
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

export async function generateSACPDF(
  sacId: number,
  organizationId: number,
  operatingUnitId: string,
  userId: string,
  language: PdfLang = "en"
): Promise<Buffer> {
  const db = await getDb();
  const isRTL = language === "ar";
  const l = t[language];

  console.log(`[SAC PDF] Generating SAC PDF for ID=${sacId}, language=${language}`);

  // ── Fetch data ──────────────────────────────────────────────────────────
  const sac = await db.query.serviceAcceptanceCertificates.findFirst({
    where: and(
      eq(serviceAcceptanceCertificates.id, sacId),
      isNull(serviceAcceptanceCertificates.deletedAt)
    ),
  });

  if (!sac) {
    throw new Error("SAC not found");
  }

  console.log(`[SAC PDF] Fetched SAC: ${sac.sacNumber}`);

  // ✅ Build official context
  const officialContext = await buildOfficialPdfContext({
    db,
    organizationId,
    operatingUnitId: Number(operatingUnitId) || 0,
    userId: Number(userId) || 0,
    language: language as 'en' | 'ar',
    documentType: 'service_acceptance_certificate',
    documentId: sacId,
    documentModule: 'Logistics',
  });

  // Fetch contract
  const contract = await db.query.contracts.findFirst({
    where: eq(contracts.id, sac.contractId),
  });

  if (!contract) {
    throw new Error("Contract not found");
  }

  // Get PR
  let prNumber = "";
  let projectTitle = "";
  if (contract.purchaseRequestId) {
    const pr = await db.query.purchaseRequests.findFirst({
      where: eq(purchaseRequests.id, contract.purchaseRequestId),
    });
    if (pr) {
      prNumber = pr.prNumber || "";
      projectTitle = pr.projectTitle || "";
    }
  }

  // Get vendor
  let vendorName = "";
  if (contract.vendorId) {
    const vendor = await db.query.vendors.findFirst({
      where: eq(vendors.id, contract.vendorId),
    });
    if (vendor) vendorName = vendor.name || "";
  }

  // Get signer
  let signerName = "";
  if (sac.signedBy) {
    const signer = await db.query.users.findFirst({
      where: eq(users.id, sac.signedBy),
    });
    if (signer) signerName = signer.name || "";
  }

  // Get creator
  let creatorName = "";
  if (sac.createdBy) {
    const creator = await db.query.users.findFirst({
      where: eq(users.id, sac.createdBy),
    });
    if (creator) creatorName = creator.name || "";
  }

  // Get milestones/deliverables
  const milestones = await db.query.contractMilestones.findMany({
    where: eq(contractMilestones.contractId, contract.id),
  });

  // ── Header Info ──────────────────────────────────────────────────────
  const headerHtml = `
    <table style="width:100%;margin-bottom:3mm;font-size:9pt;border:1px solid #d1d5db;">
      <tbody>
        <tr>
          <td style="width:25%;font-weight:800;background:#f3f4f6;padding:2mm 3mm;border:1px solid #d1d5db;">${escapeHtml(l.sacNumber)}</td>
          <td style="width:25%;padding:2mm 3mm;border:1px solid #d1d5db;" class="ltr-safe">${escapeHtml(sac.sacNumber || "")}</td>
          <td style="width:25%;font-weight:800;background:#f3f4f6;padding:2mm 3mm;border:1px solid #d1d5db;">${escapeHtml(l.date)}</td>
          <td style="width:25%;padding:2mm 3mm;border:1px solid #d1d5db;" class="ltr-safe">${escapeHtml(new Date(sac.createdAt || new Date()).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US"))}</td>
        </tr>
        <tr>
          <td style="font-weight:800;background:#f3f4f6;padding:2mm 3mm;border:1px solid #d1d5db;">${escapeHtml(l.prReference)}</td>
          <td style="padding:2mm 3mm;border:1px solid #d1d5db;" class="ltr-safe">${escapeHtml(prNumber)}</td>
          <td style="font-weight:800;background:#f3f4f6;padding:2mm 3mm;border:1px solid #d1d5db;">${escapeHtml(l.contractRef)}</td>
          <td style="padding:2mm 3mm;border:1px solid #d1d5db;" class="ltr-safe">${escapeHtml(contract.contractNumber || "")}</td>
        </tr>
        <tr>
          <td style="font-weight:800;background:#f3f4f6;padding:2mm 3mm;border:1px solid #d1d5db;">${escapeHtml(l.vendor)}</td>
          <td style="padding:2mm 3mm;border:1px solid #d1d5db;">${escapeHtml(vendorName)}</td>
          <td style="font-weight:800;background:#f3f4f6;padding:2mm 3mm;border:1px solid #d1d5db;">${escapeHtml(l.status)}</td>
          <td style="padding:2mm 3mm;border:1px solid #d1d5db;">${sac.status === "approved" ? escapeHtml(l.statusApproved) : escapeHtml(l.statusDraft)}</td>
        </tr>
      </tbody>
    </table>
  `;

  // ── Deliverables Table ───────────────────────────────────────────────
  const deliverableRows = milestones.map((milestone, idx) => {
    const statusLabel = deliverableStatusLabel(milestone.status || "pending", language);
    const statusCol = statusColor(milestone.status || "pending");
    return `
      <tr>
        <td style="text-align:center;font-size:8.5pt;padding:1.5mm;border:1px solid #d1d5db;">${idx + 1}</td>
        <td style="text-align:${isRTL ? 'right' : 'left'};font-size:8.5pt;padding:1.5mm;border:1px solid #d1d5db;">${escapeHtml(milestone.title || "")}</td>
        <td style="text-align:${isRTL ? 'right' : 'left'};font-size:8.5pt;padding:1.5mm;border:1px solid #d1d5db;">${escapeHtml(milestone.description || "")}</td>
        <td style="text-align:center;font-size:8.5pt;padding:1.5mm;border:1px solid #d1d5db;"><span style="background:${statusCol};color:white;padding:1mm 2mm;border-radius:2px;font-size:7.5pt;font-weight:700;">${escapeHtml(statusLabel)}</span></td>
        <td style="text-align:center;font-size:8.5pt;padding:1.5mm;border:1px solid #d1d5db;">${milestone.completionPercentage || 0}%</td>
      </tr>
    `;
  }).join("");

  const deliverableTableHtml = `
    <div style="margin-bottom:3mm;">
      <div style="background:#0d9488;color:white;padding:2mm 4mm;border-radius:3px 3px 0 0;font-weight:800;font-size:10pt;">${escapeHtml(l.deliverablesSection)}</div>
      <table style="width:100%;margin-top:0;border-collapse:collapse;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="text-align:center;font-size:8.5pt;font-weight:700;padding:1.5mm;border:1px solid #d1d5db;width:6%;">#</th>
            <th style="text-align:${isRTL ? 'right' : 'left'};font-size:8.5pt;font-weight:700;padding:1.5mm;border:1px solid #d1d5db;width:25%;">${escapeHtml(l.deliverable)}</th>
            <th style="text-align:${isRTL ? 'right' : 'left'};font-size:8.5pt;font-weight:700;padding:1.5mm;border:1px solid #d1d5db;width:35%;">${escapeHtml(l.description)}</th>
            <th style="text-align:center;font-size:8.5pt;font-weight:700;padding:1.5mm;border:1px solid #d1d5db;width:18%;">${escapeHtml(l.completionStatus)}</th>
            <th style="text-align:center;font-size:8.5pt;font-weight:700;padding:1.5mm;border:1px solid #d1d5db;width:16%;">${escapeHtml(l.completionPercent)}</th>
          </tr>
        </thead>
        <tbody>
          ${deliverableRows || `<tr><td colspan="5" style="text-align:center;padding:2mm;font-size:8.5pt;">${escapeHtml(l.notApplicable)}</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  // ── Acceptance Confirmation ──────────────────────────────────────────
  const acceptanceHtml = `
    <div style="margin-bottom:3mm;padding:2mm 4mm;background:#f0fdf4;border:1px solid #86efac;border-radius:3px;">
      <div style="font-size:9pt;font-weight:700;margin-bottom:2mm;">${escapeHtml(l.acceptanceSection)}</div>
      <div style="font-size:8.5pt;line-height:1.6;">
        <div style="margin-bottom:1mm;">✓ ${escapeHtml(l.verifiedBoqs)}</div>
        <div style="margin-bottom:1mm;">✓ ${escapeHtml(l.verifiedContractTerms)}</div>
        <div>✓ ${escapeHtml(l.verifiedDeliverables)}</div>
      </div>
    </div>
  `;

  // ── Signature section ────────────────────────────────────────────────
  const signatureHtml = `
    <div style="margin-top:5mm;padding-top:3mm;border-top:1px solid #d1d5db;">
      <div style="font-size:9pt;font-weight:700;margin-bottom:3mm;">${escapeHtml(l.signatureSection)}</div>
      <table style="width:100%;">
        <tr>
          <td style="width:50%;text-align:center;font-size:8pt;">
            <div style="border-bottom:1px solid #6b7280;height:8mm;margin-bottom:1mm;"></div>
            <div style="font-weight:700;">${escapeHtml(l.preparedBy)}</div>
            <div style="font-size:7.5pt;margin-top:1mm;">${escapeHtml(creatorName)}</div>
          </td>
          <td style="width:50%;text-align:center;font-size:8pt;">
            <div style="border-bottom:1px solid #6b7280;height:8mm;margin-bottom:1mm;"></div>
            <div style="font-weight:700;">${escapeHtml(l.signedBy)}</div>
            <div style="font-size:7.5pt;margin-top:1mm;">${escapeHtml(signerName)}</div>
          </td>
        </tr>
      </table>
    </div>
  `;

  // ── Assemble body ────────────────────────────────────────────────────
  const bodyHtml = `
    ${headerHtml}
    ${deliverableTableHtml}
    ${acceptanceHtml}
    ${signatureHtml}
  `;

  // ✅ Use OfficialPdfEngine for PDF generation
  console.log(`[SAC PDF] Generating PDF using OfficialPdfEngine`);
  
  const pdfBuffer = await generateOfficialPdf({
    context: officialContext,
    department: 'Logistics & Procurement',
    documentTitle: l.documentTitle,
    formNumber: sac.sacNumber || `SAC-${sac.id}`,
    formDate: new Date(sac.createdAt || new Date()).toISOString().split('T')[0],
    bodyHtml,
  });

  console.log(`[SAC PDF] SAC PDF generated successfully`);
  
  return pdfBuffer;
}
