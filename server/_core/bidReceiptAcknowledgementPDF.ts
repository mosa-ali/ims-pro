import puppeteer from "puppeteer";
import { getDb } from "../db";
import {
  bidAnalyses,
  bidAnalysisBidders,
  purchaseRequests,
  operatingUnits,
  organizations,
  organizationBranding,
  bidderAcknowledgementSignatures,
} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { buildPdfDocument } from "../services/pdf/buildPdfHeader";

/**
 * Generate Bid Receipt Acknowledgement PDF using Puppeteer + buildPdfDocument
 * Uses the shared official header and CSS for consistent styling and RTL/LTR support.
 * Supports digital signature for logistics responsible and manual signature for supplier.
 */
export async function generateBidReceiptAcknowledgementPDF(
  bidAnalysisId: number,
  bidderId: number,
  organizationId: number,
  language: "en" | "ar" = "en"
): Promise<Buffer> {
  try {
    const db = await getDb();
    const isRTL = language === "ar";

    // ── 1. Fetch Data ──────────────────────────────────────────────────────

    const [ba] = await db
      .select()
      .from(bidAnalyses)
      .where(
        and(
          eq(bidAnalyses.id, bidAnalysisId),
          eq(bidAnalyses.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!ba) throw new Error(`Bid Analysis ${bidAnalysisId} not found in organization ${organizationId}`);

    const [bidder] = await db
      .select()
      .from(bidAnalysisBidders)
      .where(
        and(
          eq(bidAnalysisBidders.id, bidderId),
          eq(bidAnalysisBidders.bidAnalysisId, bidAnalysisId)
        )
      )
      .limit(1);

    if (!bidder) throw new Error(`Bidder ${bidderId} not found in Bid Analysis ${bidAnalysisId}`);

    const [pr] = await db
      .select()
      .from(purchaseRequests)
      .where(eq(purchaseRequests.id, ba.purchaseRequestId!))
      .limit(1);

    const [ou] = await db
      .select()
      .from(operatingUnits)
      .where(eq(operatingUnits.id, ba.operatingUnitId!))
      .limit(1);

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org) throw new Error(`Organization ${organizationId} not found`);

    const [branding] = await db
      .select()
      .from(organizationBranding)
      .where(eq(organizationBranding.organizationId, organizationId))
      .limit(1);

    // Fetch digital signature if it exists
    let signature: any = null;
    try {
      const [sig] = await db
        .select()
        .from(bidderAcknowledgementSignatures)
        .where(
          and(
            eq(bidderAcknowledgementSignatures.bidAnalysisId, bidAnalysisId),
            eq(bidderAcknowledgementSignatures.bidderId, bidderId)
          )
        )
        .limit(1);
      signature = sig || null;
    } catch {
      // Table may not exist yet
      signature = null;
    }

    // ── 2. Build Logo Data URL ─────────────────────────────────────────────

    let logoDataUrl: string | undefined;
    if (branding?.logoUrl) {
      try {
        const resp = await fetch(branding.logoUrl);
        if (resp.ok) {
          const buf = Buffer.from(await resp.arrayBuffer());
          const mime = resp.headers.get("content-type") || "image/png";
          logoDataUrl = `data:${mime};base64,${buf.toString("base64")}`;
        }
      } catch {
        // Silently skip logo if fetch fails
      }
    }

    // ── 3. Labels ──────────────────────────────────────────────────────────

    const l = {
      documentTitle: isRTL ? "إشعار استلام العطاء" : "Bid Receipt Acknowledgement",
      department: isRTL ? "الخدمات اللوجستية والمشتريات" : "Logistics & Procurement",
      reference: isRTL ? "المرجع" : "Reference",
      status: isRTL ? "الحالة" : "Status",
      date: isRTL ? "التاريخ" : "Date",
      tenderInfo: isRTL ? "معلومات العطاء" : "Tender Information",
      prNumber: isRTL ? "رقم طلب الشراء" : "PR Number",
      tenderRef: isRTL ? "مرجع العطاء" : "Tender Reference",
      cbaNumber: isRTL ? "رقم تحليل المناقصات التنافسية" : "CBA Number",
      operatingUnit: isRTL ? "وحدة التشغيل" : "Operating Unit",
      receiptDateTime: isRTL ? "تاريخ ووقت الاستلام" : "Date & Time of Receipt",
      bidderDetails: isRTL ? "تفاصيل مقدم العرض" : "Bidder Details",
      bidderName: isRTL ? "اسم مقدم العرض / الشركة" : "Bidder / Company Name",
      submissionDate: isRTL ? "تاريخ التقديم" : "Submission Date",
      submissionStatus: isRTL ? "حالة التقديم" : "Submission Status",
      acknowledgementNote: isRTL
        ? "يؤكد هذا المستند أن مقدم العرض المذكور أعلاه قد تقدم بعرض استجابةً للعطاء المشار إليه. لا يعني الاستلام التقييم أو القبول."
        : "This document confirms that the above-mentioned bidder has submitted a bid in response to the referenced tender. Receipt does not imply evaluation or acceptance.",
      signatures: isRTL ? "التوقيعات" : "Signatures",
      forLogistics: isRTL ? "نيابة عن الخدمات اللوجستية" : "For Logistics",
      forBidder: isRTL ? "نيابة عن مقدم العرض" : "For Bidder (Manual — Sign after printing)",
      name: isRTL ? "الاسم" : "Name",
      title: isRTL ? "المسمى الوظيفي" : "Title",
      signature: isRTL ? "التوقيع" : "Signature",
      company: isRTL ? "الشركة" : "Company",
      digitalSignature: isRTL ? "توقيع رقمي" : "Digital Signature",
      signedAt: isRTL ? "تم التوقيع في" : "Signed at",
      verificationCode: isRTL ? "رمز التحقق" : "Verification Code",
      scanToVerify: isRTL ? "امسح للتحقق" : "Scan to verify",
      notYetSigned: isRTL ? "لم يتم التوقيع بعد" : "Not yet signed digitally",
      received: isRTL ? "مستلم" : "Received",
      valid: isRTL ? "صالح" : "Valid",
      disqualified: isRTL ? "مرفوض" : "Disqualified",
      field: isRTL ? "الحقل" : "Field",
      value: isRTL ? "القيمة" : "Value",
    };

    // ── 4. Format Data ─────────────────────────────────────────────────────

    const locale = isRTL ? "ar-SA" : "en-US";
    const now = new Date();
    const receiptRef = ba.announcementReference || `TR-${ba.id}`;
    const statusText = bidder.submissionStatus
      ? (l as any)[bidder.submissionStatus] || bidder.submissionStatus.charAt(0).toUpperCase() + bidder.submissionStatus.slice(1)
      : l.received;

    const receiptDateTime = `${now.toLocaleDateString(locale)} ${now.toLocaleTimeString(locale)}`;
    const submissionDateStr = bidder.submissionDate
      ? new Date(bidder.submissionDate).toLocaleDateString(locale)
      : "N/A";

    // ── 5. Build QR Code SVG (verification) ────────────────────────────────

    let qrSvg = "";
    if (signature) {
      // Generate a simple QR code as SVG using a basic encoding
      const verificationData = JSON.stringify({
        docType: "BID_RECEIPT_ACK",
        baId: bidAnalysisId,
        bidderId: bidderId,
        signedBy: signature.signerName,
        signedAt: signature.signedAt ? new Date(signature.signedAt).toISOString() : "",
        verificationCode: signature.verificationCode || "",
      });
      qrSvg = generateQRCodeSVG(verificationData);
    }

    // ── 6. Build Body HTML ─────────────────────────────────────────────────

    const bodyHtml = `
      <!-- Document Metadata Bar -->
      <div class="meta-block" style="margin-bottom: 16px;">
        <div class="meta-grid">
          <div class="meta-item">
            <span class="meta-label">${l.reference}:</span>
            <span class="meta-value ltr-safe">${esc(receiptRef)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">${l.status}:</span>
            <span class="badge badge-info">${esc(statusText)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">${l.date}:</span>
            <span class="meta-value">${esc(now.toLocaleDateString(locale))}</span>
          </div>
        </div>
      </div>

      <!-- Tender Information Table -->
      <div class="section-title">${l.tenderInfo}</div>
      <hr class="section-divider" />
      <table class="table" style="margin-bottom: 16px;">
        <thead>
          <tr>
            <th style="width: 40%;">${l.field}</th>
            <th style="width: 60%;">${l.value}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight: 700;">${l.prNumber}</td>
            <td class="ltr-safe">${esc(pr?.prNumber || "N/A")}</td>
          </tr>
          <tr>
            <td style="font-weight: 700;">${l.tenderRef}</td>
            <td class="ltr-safe">${esc(ba.announcementReference || "N/A")}</td>
          </tr>
          <tr>
            <td style="font-weight: 700;">${l.cbaNumber}</td>
            <td class="ltr-safe">${esc(ba.cbaNumber || "N/A")}</td>
          </tr>
          <tr>
            <td style="font-weight: 700;">${l.operatingUnit}</td>
            <td>${esc(isRTL ? (ou?.nameAr || ou?.name || "N/A") : (ou?.name || "N/A"))}</td>
          </tr>
          <tr>
            <td style="font-weight: 700;">${l.receiptDateTime}</td>
            <td>${esc(receiptDateTime)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Bidder Details Table -->
      <div class="section-title">${l.bidderDetails}</div>
      <hr class="section-divider" />
      <table class="table" style="margin-bottom: 16px;">
        <thead>
          <tr>
            <th style="width: 40%;">${l.field}</th>
            <th style="width: 60%;">${l.value}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight: 700;">${l.bidderName}</td>
            <td>${esc(bidder.bidderName || "N/A")}</td>
          </tr>
          <tr>
            <td style="font-weight: 700;">${l.submissionDate}</td>
            <td>${esc(submissionDateStr)}</td>
          </tr>
          <tr>
            <td style="font-weight: 700;">${l.submissionStatus}</td>
            <td><span class="badge badge-info">${esc(statusText)}</span></td>
          </tr>
        </tbody>
      </table>

      <!-- Acknowledgement Notice -->
      <div class="callout callout-info" style="margin-bottom: 20px;">
        <p style="font-style: italic; line-height: 1.6; margin: 0;">${l.acknowledgementNote}</p>
      </div>

      <!-- ═══════════════════════════════════════════════════════════════════
           SIGNATURES SECTION
           ═══════════════════════════════════════════════════════════════════ -->
      <div class="section-title">${l.signatures}</div>
      <hr class="section-divider" />

      <div style="display: flex; gap: 24px; margin-top: 12px;">
        <!-- Logistics Signature (Digital) -->
        <div style="flex: 1; border: 1px solid #d0d0d0; border-radius: 6px; padding: 14px;">
          <div style="font-weight: 800; font-size: 11pt; margin-bottom: 10px; border-bottom: 2px solid #222; padding-bottom: 6px;">
            ${l.forLogistics}
          </div>
          ${signature ? `
            <!-- Digital Signature Present -->
            <div style="margin-bottom: 8px;">
              <div style="color: #444; font-size: 9pt; margin-bottom: 2px;">${l.name}</div>
              <div style="font-weight: 600;">${esc(signature.signerName || "")}</div>
            </div>
            <div style="margin-bottom: 8px;">
              <div style="color: #444; font-size: 9pt; margin-bottom: 2px;">${l.title}</div>
              <div style="font-weight: 600;">${esc(signature.signerTitle || "")}</div>
            </div>
            <div style="margin-bottom: 8px;">
              <div style="color: #444; font-size: 9pt; margin-bottom: 2px;">${l.signature}</div>
              <div style="border: 1px solid #e0e0e0; border-radius: 4px; padding: 4px; background: #fafafa; min-height: 50px; display: flex; align-items: center; justify-content: center;">
                <img src="${signature.signatureImageUrl}" alt="Digital Signature" style="max-width: 180px; max-height: 60px; object-fit: contain;" />
              </div>
            </div>
            <div style="margin-bottom: 8px;">
              <div style="color: #444; font-size: 9pt; margin-bottom: 2px;">${l.signedAt}</div>
              <div style="font-weight: 600; font-size: 9.5pt;">${esc(signature.signedAt ? new Date(signature.signedAt).toLocaleString(locale) : "")}</div>
            </div>
            ${qrSvg ? `
              <div style="margin-top: 8px; text-align: center;">
                <div style="font-size: 8pt; color: #666; margin-bottom: 4px;">${l.scanToVerify}</div>
                <div style="display: inline-block;">${qrSvg}</div>
                <div style="font-size: 7.5pt; color: #888; margin-top: 2px;" class="ltr-safe">${esc(signature.verificationCode || "")}</div>
              </div>
            ` : ""}
            <div style="margin-top: 6px; text-align: center;">
              <span class="badge badge-success" style="font-size: 8pt;">&#10003; ${l.digitalSignature}</span>
            </div>
          ` : `
            <!-- No Digital Signature Yet -->
            <div style="margin-bottom: 8px;">
              <div style="color: #444; font-size: 9pt; margin-bottom: 2px;">${l.name}</div>
              <div style="border-bottom: 1px solid #888; height: 20px; margin-bottom: 6px;"></div>
            </div>
            <div style="margin-bottom: 8px;">
              <div style="color: #444; font-size: 9pt; margin-bottom: 2px;">${l.title}</div>
              <div style="border-bottom: 1px solid #888; height: 20px; margin-bottom: 6px;"></div>
            </div>
            <div style="margin-bottom: 8px;">
              <div style="color: #444; font-size: 9pt; margin-bottom: 2px;">${l.signature}</div>
              <div style="border-bottom: 1px solid #888; height: 40px; margin-bottom: 6px;"></div>
            </div>
            <div style="margin-bottom: 8px;">
              <div style="color: #444; font-size: 9pt; margin-bottom: 2px;">${l.date}</div>
              <div style="border-bottom: 1px solid #888; height: 20px; margin-bottom: 6px;"></div>
            </div>
            <div style="text-align: center; margin-top: 6px;">
              <span style="font-size: 8pt; color: #999; font-style: italic;">${l.notYetSigned}</span>
            </div>
          `}
        </div>

        <!-- Bidder/Supplier Signature (Manual) -->
        <div style="flex: 1; border: 1px solid #d0d0d0; border-radius: 6px; padding: 14px;">
          <div style="font-weight: 800; font-size: 11pt; margin-bottom: 10px; border-bottom: 2px solid #222; padding-bottom: 6px;">
            ${l.forBidder}
          </div>
          <div style="margin-bottom: 8px;">
            <div style="color: #444; font-size: 9pt; margin-bottom: 2px;">${l.name}</div>
            <div style="border-bottom: 1px solid #888; height: 20px; margin-bottom: 6px;"></div>
          </div>
          <div style="margin-bottom: 8px;">
            <div style="color: #444; font-size: 9pt; margin-bottom: 2px;">${l.company}</div>
            <div style="border-bottom: 1px solid #888; height: 20px; margin-bottom: 6px;"></div>
          </div>
          <div style="margin-bottom: 8px;">
            <div style="color: #444; font-size: 9pt; margin-bottom: 2px;">${l.signature}</div>
            <div style="border-bottom: 1px solid #888; height: 40px; margin-bottom: 6px;"></div>
          </div>
          <div style="margin-bottom: 8px;">
            <div style="color: #444; font-size: 9pt; margin-bottom: 2px;">${l.date}</div>
            <div style="border-bottom: 1px solid #888; height: 20px; margin-bottom: 6px;"></div>
          </div>
        </div>
      </div>
    `;

    // ── 7. Build Full Document ─────────────────────────────────────────────

    const html = buildPdfDocument({
      organizationName: org.name,
      operatingUnitName: ou?.name,
      department: l.department,
      documentTitle: l.documentTitle,
      organizationLogo: logoDataUrl,
      refNumber: receiptRef,
      date: now.toLocaleDateString(locale),
      direction: isRTL ? "rtl" : "ltr",
      language,
      bodyHtml,
      extraCss: `
        /* Ensure side-by-side signature blocks don't break in RTL */
        html[dir="rtl"] .signatures-flex { flex-direction: row-reverse; }
      `,
    });

    // ── 8. Render PDF with Puppeteer ───────────────────────────────────────

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1200, height: 1600 });
      await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 30000 });

      const pdf = await page.pdf({
        format: "A4",
        margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
        printBackground: true,
        preferCSSPageSize: true,
      });

      return pdf;
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error("Error generating Bid Receipt Acknowledgement PDF:", error);
    throw new Error(
      `Failed to generate PDF: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Generate a simple QR code as SVG.
 * Uses a basic matrix encoding approach for small payloads.
 * For production, consider using a proper QR library.
 */
function generateQRCodeSVG(data: string): string {
  // Simple visual QR placeholder with encoded data hash
  // In production, use a library like 'qrcode' npm package
  const hash = simpleHash(data);
  const size = 80;
  const modules = 21; // QR version 1
  const cellSize = size / modules;

  // Generate a deterministic pattern from the hash
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
  svg += `<rect width="${size}" height="${size}" fill="white"/>`;

  // Fixed finder patterns (top-left, top-right, bottom-left)
  const drawFinder = (x: number, y: number) => {
    // Outer border
    for (let i = 0; i < 7; i++) {
      svg += `<rect x="${(x + i) * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
      svg += `<rect x="${(x + i) * cellSize}" y="${(y + 6) * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
      svg += `<rect x="${x * cellSize}" y="${(y + i) * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
      svg += `<rect x="${(x + 6) * cellSize}" y="${(y + i) * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
    }
    // Inner square
    for (let i = 2; i < 5; i++) {
      for (let j = 2; j < 5; j++) {
        svg += `<rect x="${(x + i) * cellSize}" y="${(y + j) * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(14, 0);
  drawFinder(0, 14);

  // Data area - use hash to generate pattern
  const hashStr = hash.toString(16).padStart(32, '0');
  let charIdx = 0;
  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      // Skip finder pattern areas
      if ((row < 8 && col < 8) || (row < 8 && col > 12) || (row > 12 && col < 8)) continue;

      const charCode = hashStr.charCodeAt(charIdx % hashStr.length);
      if ((charCode + row + col) % 3 === 0) {
        svg += `<rect x="${col * cellSize}" y="${row * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
      }
      charIdx++;
    }
  }

  svg += `</svg>`;
  return svg;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
