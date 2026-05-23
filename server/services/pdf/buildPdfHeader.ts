/**
 * Shared PDF Header Utility
 *
 * Provides a single, reusable function for building the official IMS PDF header
 * that correctly mirrors in both LTR (English) and RTL (Arabic) modes.
 *
 * Uses the proven flexbox approach from official-pdf.css:
 *   LTR: Org LEFT | Title CENTER | Logo RIGHT
 *   RTL: Logo LEFT | Title CENTER | Org RIGHT
 *
 * See docs/PDF_HEADER_RTL_LTR_GUIDELINE.md for full documentation.
 *
 * Usage:
 *   import { buildPdfHeader, loadOfficialPdfCss } from "../services/pdf/buildPdfHeader";
 *
 *   const css = loadOfficialPdfCss();
 *   const headerHtml = buildPdfHeader({ ... });
 */

import fs from 'fs';
import path from 'path';
import { OfficialPdfContext } from './buildOfficialPdfContext';
import { generateOfficialPdfHtml, OfficialWrapperOptions } from '../pdf/templates/layout/OfficialWrapper';

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
        ${organizationLogo ? `<img class="org-logo" src="${escapeHtml(organizationLogo)}" alt="Organization Logo"${logoStyleAttr} />` : ""}
      </div>
    </div>
    <hr class="hr-strong" />
  `;
}

// ─── Context-Based Header Builder ───────────────────────────────────────────

/**
 * Build PDF header HTML from OfficialPdfContext
 * 
 * @param context - Official PDF context with org/OU/branding data
 * @param options - Header options (title, ref, date)
 * @returns Header HTML string
 */
export function buildPdfHeaderFromContext(
  context: OfficialPdfContext,
  options: { documentTitle: string; titleStyle?: string; logoStyle?: string }
): string {
  const {
    documentTitle,
    titleStyle,
    logoStyle,
  } = options;

  const titleStyleAttr = titleStyle ? ` style="${titleStyle}"` : '';
  const logoStyleAttr = logoStyle ? ` style="${logoStyle}"` : '';
  const isRTL = context.isRTL;

  return `
    <div class="official-header" style="direction: ${isRTL ? 'rtl' : 'ltr'};">
      <div class="header-left" style="text-align: ${isRTL ? 'right' : 'left'};">
        <div class="org-block">
          <div class="org-name">${escapeHtml(context.organizationName)}</div>
          ${context.operatingUnitName ? `<div class="ou-name">${escapeHtml(context.operatingUnitName)}</div>` : ''}
          ${context.documentModule ? `<div class="module-name">${escapeHtml(context.documentModule)}</div>` : ''}
        </div>
      </div>

      <div class="header-center">
        <div class="doc-title"${titleStyleAttr} style="color: ${context.primaryColor};">
          ${escapeHtml(documentTitle)}
        </div>
      </div>

      <div class="header-right" style="text-align: ${isRTL ? 'left' : 'right'}; justify-content: ${isRTL ? 'flex-start' : 'flex-end'};">
        ${(context.organizationLogo || context.brandingLogoUrl) ? `<img class="org-logo" src="${escapeHtml(context.organizationLogo || context.brandingLogoUrl || '')}" alt="Organization Logo"${logoStyleAttr} />` : ''}
      </div>
    </div>
    <hr class="hr-strong" style="border-top: 2px solid ${context.borderColor};" />
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

/**
 * Build complete PDF HTML document with official header and context
 * 
 * @param context - Official PDF context
 * @param options - Document options (header + body + extra CSS)
 * @returns Complete HTML document ready for PDF rendering
 */
export function buildPdfDocumentFromContext(
  context: OfficialPdfContext,
  options: { documentTitle: string; titleStyle?: string; logoStyle?: string; bodyHtml: string; extraCss?: string; pageSize?: string }
): string {
  const {
    bodyHtml,
    extraCss = '',
    pageSize = 'A4',
    ...headerOptions
  } = options;

  const officialCss = loadOfficialPdfCss();
  const headerHtml = buildPdfHeaderFromContext(context, headerOptions);

  const pageSizeCss = pageSize ? `@page { size: ${pageSize}; }` : '';

  return `<!DOCTYPE html>
<html dir="${context.direction}" lang="${context.language}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(options.documentTitle)}</title>
  <style>
    ${officialCss}
    ${pageSizeCss}
    
    /* Official PDF Context Styling */
    body {
      color: ${context.textColor};
      background-color: ${context.backgroundColor};
    }

    .official-header {
      background-color: ${context.headerBackgroundColor};
    }

    .doc-title {
      color: ${context.primaryColor};
    }

    th {
      background-color: #f3f4f6;
      border-color: ${context.borderColor};
    }

    td {
      border-color: ${context.borderColor};
    }

    .section-title {
      background-color: ${context.primaryColor};
      color: white;
    }

    .metadata {
      background-color: #f9fafb;
      border-color: ${context.borderColor};
    }

    .metadata-label {
      color: ${context.primaryColor};
    }

    /* Custom extra CSS */
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
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Build complete official PDF HTML using OfficialWrapper and OfficialPdfContext
 * 
 * This is the primary function for generating official PDF HTML with wrapper.
 * It combines OfficialPdfContext with module-specific body content using the OfficialWrapper.
 * 
 * @param context - Official PDF context with org/OU/branding/metadata
 * @param bodyHtml - Module-specific body HTML content
 * @returns Complete HTML document ready for PDF rendering
 */
export function buildOfficialPdfHtmlFromContext(
  context: OfficialPdfContext,
  bodyHtml: string
): string {
  const wrapperOptions: OfficialWrapperOptions = {
    context: context,
    department: context.documentModule,
    documentTitle: context.documentType,
    formNumber: `ID: ${context.documentId}`,
    formDate: context.generatedAtFormatted,
    bodyHtml: bodyHtml,
  };

  return generateOfficialPdfHtml(wrapperOptions);
}

/**
 * Format date for PDF display
 */
export function formatDateForDisplay(date: Date, language: 'en' | 'ar'): string {
  if (language === 'ar') {
    const formatter = new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}
