
import { officialPdfStyles } from "../styles/officialPdfStyles";
import type { OfficialPdfContext } from "../../buildOfficialPdfContext";

export interface OfficialWrapperOptions {
  context: OfficialPdfContext;
  department: string;
  documentTitle: string;
  formNumber: string;
  formDate: string;
  bodyHtml: string;
  // footerLabels is no longer used - footer has been removed per user request
  footerLabels?: { page: string; of: string };
}

export function generateOfficialPdfHtml(options: OfficialWrapperOptions): string {
  const {
    context,
    department,
    documentTitle,
    formNumber,
    formDate,
    bodyHtml,
  } = options;

  const direction = context.direction || "ltr";
const language = context.language || "en";

const organizationName =
  language === "ar"
    ? context.organizationNameAr || context.organizationName
    : context.organizationName;

    const operatingUnitName =
      context.language === "ar"
        ? context.operatingUnitName || context.operatingUnitName: context.operatingUnitName;

  const organizationLogo = context.organizationLogo;

  const officialCss = officialPdfStyles;

  // Single header markup (no RTL/LTR branching)
  // CSS controls mirroring using html[dir="rtl"] selectors.
  const headerHtml = `
    <div class="official-header">
      <div class="header-left">
        <div class="org-block">
          <div class="org-name">${organizationName}</div>
          ${operatingUnitName ? `<div class="ou-name">${operatingUnitName}</div>` : ""}
          <div class="module-name">${department}</div>
        </div>
      </div>

      <div class="header-center">
        <div class="doc-title">${documentTitle}</div>
      </div>

      <div class="header-right">
        ${organizationLogo ? `<img src="${organizationLogo}" alt="Logo" class="org-logo" />` : ""}
        <div class="ref-date">
          ${formNumber ? `<div class="value ltr-safe">${formNumber}</div>` : ''}
          ${formDate ? `<div class="value ltr-safe">${formDate}</div>` : ''}
        </div>
      </div>
    </div>
    <hr class="hr-strong" />
  `;

  // Footer removed per user request - no "Page # of #" text
  return `
    <!DOCTYPE html>
    <html dir="${direction}" lang="${language}">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${documentTitle}</title>
        <style>${officialCss}</style>
      </head>
      <body>
        ${headerHtml}

        <div class="pdf-content">
          ${bodyHtml}
        </div>
      </body>
    </html>
  `;
}
