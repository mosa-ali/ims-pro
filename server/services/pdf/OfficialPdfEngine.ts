import { storagePut } from "../../storage";
import { generateOfficialPdfHtml } from "./templates/layout/OfficialWrapper";

export interface OfficialPdfOptions {
  organizationName: string;
  operatingUnitName?: string;
  organizationLogo?: string;
  department: string;
  documentTitle: string;
  formNumber: string;
  formDate: string;
  bodyHtml: string;
  direction?: "ltr" | "rtl";
  language?: "en" | "ar";
  /** Optional template version string for cache invalidation (e.g., 'v3') */
  templateVersion?: string;
}

/**
 * Generate official PDF using external PDF API service (no server-side dependencies)
 * Implements System-Wide Official PDF Output Framework
 * - A4 format enforced
 * - Standard header/footer rendered in-page
 * - Org + OU from scope
 * - Logo from Branding settings
 * - RTL/LTR support
 * - Uses third-party PDF API (e.g., pdfshift.io, htmltopdf.com)
 */
export async function generateOfficialPdf(
  options: OfficialPdfOptions
): Promise<{ url: string; key: string }> {
  const {
    organizationName,
    operatingUnitName,
    organizationLogo,
    department,
    documentTitle,
    formNumber,
    formDate,
    bodyHtml,
    direction = "ltr",
    language = "en",
  } = options;

  // Generate complete HTML with wrapper (header and content are rendered in-page)
  const htmlContent = generateOfficialPdfHtml({
    organizationName,
    operatingUnitName,
    organizationLogo,
    department,
    documentTitle,
    formNumber,
    formDate,
    bodyHtml,
    direction,
    language,
  });

  try {
    console.log(`[PDF] Generating PDF for: ${documentTitle}`);

    // Call external PDF API
    const pdfBuffer = await generatePdfViaExternalAPI(htmlContent);

    console.log(`[PDF] PDF generated successfully, size: ${pdfBuffer.length} bytes`);

    // Upload to S3 with language-aware filename
    const timestamp = Date.now();
    const languageCode = language === "ar" ? "ar" : "en";
    const versionSuffix = options.templateVersion ? `-${options.templateVersion}` : "";
    const fileName = `procurement/pdf/${documentTitle.replace(/\s+/g, "-")}-${formNumber}-${languageCode}${versionSuffix}-${timestamp}.pdf`;

    console.log(`[PDF] Uploading to S3: ${fileName}`);
    const { url, key } = await storagePut(
      fileName,
      Buffer.from(pdfBuffer),
      "application/pdf"
    );

    console.log(`[PDF] PDF uploaded successfully: ${url}`);
    return { url, key };
  } catch (error) {
    console.error("[PDF] Error generating PDF:", error);
    throw new Error(
      `Failed to generate PDF: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generate PDF via external API service
 * Supports multiple providers:
 * 1. pdfshift.io (recommended - free tier available)
 * 2. htmltopdf.com
 * 3. Any HTML-to-PDF API
 */
async function generatePdfViaExternalAPI(htmlContent: string): Promise<Buffer> {
  // Try pdfshift.io first (free tier: 50 conversions/month)
  const pdfshiftApiKey = process.env.PDFSHIFT_API_KEY;

  if (pdfshiftApiKey) {
    return generatePdfViaPdfshift(htmlContent, pdfshiftApiKey);
  }

  // Try htmltopdf.com
  const htmltopdfApiKey = process.env.HTMLTOPDF_API_KEY;
  if (htmltopdfApiKey) {
    return generatePdfViaHtmltopdf(htmlContent, htmltopdfApiKey);
  }

  throw new Error(
    "No PDF API credentials configured. Set PDFSHIFT_API_KEY or HTMLTOPDF_API_KEY environment variable"
  );
}

/**
 * Generate PDF using pdfshift.io API
 * https://pdfshift.io/documentation
 */
async function generatePdfViaPdfshift(
  htmlContent: string,
  apiKey: string
): Promise<Buffer> {
  console.log("[PDF] Using pdfshift.io for PDF generation");

  const response = await fetch("https://api.pdfshift.io/v3/convert/html", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      source: htmlContent,
      format: "A4",
      margin: {
        top: "14mm",
        right: "14mm",
        bottom: "16mm",
        left: "14mm",
      },
      print_background: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`pdfshift.io error: ${response.status} - ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generate PDF using htmltopdf.com API
 * https://htmltopdf.com/api
 */
async function generatePdfViaHtmltopdf(
  htmlContent: string,
  apiKey: string
): Promise<Buffer> {
  console.log("[PDF] Using htmltopdf.com for PDF generation");

  const response = await fetch("https://api.htmltopdf.com/convert", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({
      html: htmlContent,
      format: "A4",
      margin_top: 14,
      margin_right: 14,
      margin_bottom: 16,
      margin_left: 14,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`htmltopdf.com error: ${response.status} - ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export { generateOfficialPdfHtml };
