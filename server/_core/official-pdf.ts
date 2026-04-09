/**
 * IMS — Official PDF Wrapper Helper (TypeScript)
 * Purpose: centralize how official-pdf-v2.css is injected and how header is rendered.
 *
 * Locked guideline alignment:
 * - dir/lang set ONCE at <html>
 * - body inherits direction
 * - use .ltr-safe only for codes/refs/amounts
 */

import fs from "fs";
import path from "path";

export type PdfDir = "ltr" | "rtl";
export type PdfLang = "en" | "ar";

export interface OfficialPdfWrapperOptions {
  dir: PdfDir;
  lang: PdfLang;

  organizationName: string;
  operatingUnitName?: string;
  departmentLine?: string;

  documentTitle: string;

  /** Ref no shown under logo (e.g., BOM-..., QA-...) */
  referenceNumber: string;

  /** Date shown under reference */
  dateText: string;

  /** Absolute/valid data URL or http(s) URL resolved by puppeteer */
  logoUrl?: string;

  /** Body HTML must be template BODY ONLY (no header/footer CSS) */
  bodyHtml: string;

  /** Optional: for adding extra head tags, e.g., custom fonts */
  extraHeadHtml?: string;
}

export function buildOfficialPdfHtml(opts: OfficialPdfWrapperOptions): string {
  const cssPath = path.join(import.meta.dirname, "./official-pdf-v2.css");
  const css = fs.readFileSync(cssPath, "utf-8");

  const dept = opts.departmentLine ?? "";

  // Header: LTR/RTL mirroring handled by CSS grid areas based on html[dir]
  const header = `
    <div class="pdf-page">
      <div class="pdf-header">
        <div class="header-left">
          <div class="org-name">${escapeHtml(opts.organizationName)}</div>
          ${opts.operatingUnitName ? `<div class="ou-name">${escapeHtml(opts.operatingUnitName)}</div>` : ""}
          ${dept ? `<div class="department">${escapeHtml(dept)}</div>` : ""}
        </div>

        <div class="header-center">
          <h1 class="document-title">${escapeHtml(opts.documentTitle)}</h1>
        </div>

        <div class="header-right">
          ${opts.logoUrl ? `<img class="org-logo" src="${escapeAttr(opts.logoUrl)}" alt="Logo" />` : ""}
          <div class="header-meta">
            <div class="meta-ref ltr-safe">${escapeHtml(opts.referenceNumber)}</div>
            <div class="meta-date ltr-safe">${escapeHtml(opts.dateText)}</div>
          </div>
        </div>
      </div>

      <hr class="pdf-header-divider" />

      <div class="pdf-content">
        ${opts.bodyHtml}
      </div>

      <div class="pdf-footer">
        <div class="footer-inner">
          <div class="page-number ltr-safe">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>
        </div>
      </div>
    </div>
  `;

  return `
<!doctype html>
<html dir="${opts.dir}" lang="${opts.lang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(opts.documentTitle)}</title>
  <style>${css}</style>
  ${opts.extraHeadHtml ?? ""}
</head>
<body>
  ${header}
</body>
</html>
`.trim();
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
