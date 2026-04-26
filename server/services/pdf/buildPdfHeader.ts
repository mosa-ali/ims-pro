/**
 * Shared PDF Header Utility
 *
 * Provides a single, reusable function for building the official IMS PDF header
 * that correctly mirrors in both LTR (English) and RTL (Arabic) modes.
 *
 * Uses the proven flexbox approach from official-pdf.css:
 *   LTR: Org LEFT | Title CENTER | Logo+Ref RIGHT
 *   RTL: Logo+Ref LEFT | Title CENTER | Org RIGHT
 *
 * See docs/PDF_HEADER_RTL_LTR_GUIDELINE.md for full documentation.
 *
 * Usage:
 *   import { buildPdfHeader, loadOfficialPdfCss } from "../services/pdf/buildPdfHeader";
 *
 *   const css = loadOfficialPdfCss();
 *   const headerHtml = buildPdfHeader({ ... });
 */

import fs from "fs";
import path from "path";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PdfHeaderOptions {
  /** Organization name (always English, e.g. "Efadah Organization for Development (EFADAH)") */
  organizationName: string;
  /** Operating unit name (e.g. "EFADAH Headquarters") — optional */
  operatingUnitName?: string;
  /** Department / module name (translated, e.g. "Logistics & Procurement" or "الخدمات اللوجستية والمشتريات") */
  department?: string;
  /** Document title (translated, e.g. "BID EVALUATION CHECKLIST" or "قائمة تقييم العطاءات") */
  documentTitle: string;
  /** Organization logo — data URL or absolute URL accessible to Puppeteer */
  organizationLogo?: string;
  /** Reference / form number (e.g. "PR-EFADAH01-2026-031") */
  refNumber?: string;
  /** Date string (e.g. "3/5/2026" or "٢٠٢٦/٣/٥") */
  date?: string;
  /** Optional inline style overrides for the doc-title element (e.g. "font-size:14pt;") */
  titleStyle?: string;
  /** Optional inline style overrides for the org-logo element (e.g. "width:48px;height:48px;") */
  logoStyle?: string;
}

// ─── CSS Loader ──────────────────────────────────────────────────────────────

let _cachedCss: string | null = null;

/**
 * Load the official-pdf.css content (cached after first read).
 * This is the ONLY approved CSS for PDF headers.
 */
export function loadOfficialPdfCss(): string {
  if (_cachedCss) return _cachedCss;
  const cssPath = path.join(
    import.meta.dirname,
    "templates/styles/official-pdf.css"
  );
  _cachedCss = fs.readFileSync(cssPath, "utf-8");
  return _cachedCss;
}

// ─── Header Builder ──────────────────────────────────────────────────────────

/**
 * Build the official PDF header HTML string.
 *
 * Returns the header HTML (from `<div class="official-header">` through `<hr class="hr-strong" />`).
 * Does NOT include `<html>`, `<head>`, `<body>`, or `<style>` tags — the caller is responsible
 * for wrapping this in a full HTML document with the correct `dir` and `lang` attributes.
 *
 * @example
 * ```ts
 * const headerHtml = buildPdfHeader({
 *   organizationName: "Efadah Organization for Development (EFADAH)",
 *   operatingUnitName: "EFADAH Headquarters",
 *   department: "Logistics & Procurement",
 *   documentTitle: "BID EVALUATION CHECKLIST",
 *   organizationLogo: logoDataUrl,
 *   refNumber: "PR-EFADAH01-2026-031",
 *   date: "3/5/2026",
 * });
 * ```
 */
export function buildPdfHeader(options: PdfHeaderOptions): string {
  const {
    organizationName,
    operatingUnitName,
    department,
    documentTitle,
    organizationLogo,
    refNumber,
    date,
    titleStyle,
    logoStyle,
  } = options;

  const titleStyleAttr = titleStyle ? ` style="${titleStyle}"` : "";
  const logoStyleAttr = logoStyle ? ` style="${logoStyle}"` : "";

  return `
    <div class="official-header">
      <div class="header-left">
        <div class="org-block">
          <div class="org-name">${escapeHtml(organizationName)}</div>
          ${operatingUnitName ? `<div class="ou-name">${escapeHtml(operatingUnitName)}</div>` : ""}
          ${department ? `<div class="module-name">${escapeHtml(department)}</div>` : ""}
        </div>
      </div>

      <div class="header-center">
        <div class="doc-title"${titleStyleAttr}>${escapeHtml(documentTitle)}</div>
      </div>

      <div class="header-right">
        ${organizationLogo ? `<img class="org-logo" src="${escapeHtml(organizationLogo)}" alt="Logo"${logoStyleAttr} />` : ""}
        <div class="ref-date">
          ${refNumber ? `<div class="value ltr-safe">${escapeHtml(refNumber)}</div>` : ""}
          ${date ? `<div class="value ltr-safe">${escapeHtml(date)}</div>` : ""}
        </div>
      </div>
    </div>
    <hr class="hr-strong" />
  `;
}

// ─── Full Document Builder ───────────────────────────────────────────────────

export interface PdfDocumentOptions extends PdfHeaderOptions {
  /** Text direction: "ltr" for English, "rtl" for Arabic */
  direction?: "ltr" | "rtl";
  /** Language code */
  language?: "en" | "ar";
  /** The body HTML content (everything below the header) */
  bodyHtml: string;
  /** Additional CSS to inject after official-pdf.css (for body-specific styles) */
  extraCss?: string;
  /** Page size override (default: A4) */
  pageSize?: string;
}

/**
 * Build a complete PDF HTML document with the official header, CSS, and body content.
 *
 * This is a convenience wrapper that combines loadOfficialPdfCss() + buildPdfHeader()
 * into a full `<!DOCTYPE html>` document ready for Puppeteer rendering.
 *
 * @example
 * ```ts
 * const html = buildPdfDocument({
 *   organizationName: "Efadah Organization for Development (EFADAH)",
 *   documentTitle: "BID EVALUATION CHECKLIST",
 *   direction: "rtl",
 *   language: "ar",
 *   bodyHtml: "<p>Content here</p>",
 *   extraCss: "body { font-size: 9pt; }",
 * });
 * ```
 */
export function buildPdfDocument(options: PdfDocumentOptions): string {
  const {
    direction = "ltr",
    language = "en",
    bodyHtml,
    extraCss = "",
    pageSize,
    ...headerOptions
  } = options;

  const officialCss = loadOfficialPdfCss();
  const headerHtml = buildPdfHeader(headerOptions);

  const pageSizeCss = pageSize
    ? `@page { size: ${pageSize}; }`
    : "";

  return `<!DOCTYPE html>
<html dir="${direction}" lang="${language}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(headerOptions.documentTitle)}</title>
  <style>
    ${officialCss}
    ${pageSizeCss}
    ${extraCss}
  </style>
</head>
<body>
  ${headerHtml}
  <div class="pdf-content">
    ${bodyHtml}
  </div>
</body>
</html>`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Escape HTML special characters to prevent XSS in PDF output */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
