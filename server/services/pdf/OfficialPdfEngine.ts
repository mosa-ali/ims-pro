import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";
import { storagePut } from "../../storage";
import { generateOfficialPdfHtml } from "./templates/layout/OfficialWrapper";

const execAsync = promisify(exec);

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
 * Generate official PDF using wkhtmltopdf (no Chromium required)
 * Implements System-Wide Official PDF Output Framework
 * - A4 format enforced
 * - Standard header/footer rendered in-page
 * - Org + OU from scope
 * - Logo from Branding settings
 * - RTL/LTR support
 * - No browser dependencies - uses wkhtmltopdf
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

  // Create temporary HTML file
  const tempDir = os.tmpdir();
  const htmlFileName = `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.html`;
  const htmlFilePath = path.join(tempDir, htmlFileName);
  const pdfFileName = htmlFileName.replace(".html", ".pdf");
  const pdfFilePath = path.join(tempDir, pdfFileName);

  try {
    // Write HTML to temporary file
    fs.writeFileSync(htmlFilePath, htmlContent, "utf-8");
    console.log(`[PDF] HTML written to: ${htmlFilePath}`);

    // Use wkhtmltopdf to convert HTML to PDF
    // wkhtmltopdf is a reliable tool for HTML to PDF conversion
    const command = `wkhtmltopdf \
      --page-size A4 \
      --margin-top 14mm \
      --margin-right 14mm \
      --margin-bottom 16mm \
      --margin-left 14mm \
      --print-media-type \
      --enable-local-file-access \
      "${htmlFilePath}" \
      "${pdfFilePath}"`;

    console.log(`[PDF] Executing wkhtmltopdf...`);
    try {
      await execAsync(command);
    } catch (error) {
      // wkhtmltopdf may exit with code 1 even on success, so check if file was created
      if (!fs.existsSync(pdfFilePath)) {
        throw error;
      }
      console.warn(`[PDF] wkhtmltopdf warning (file was created):`, error);
    }

    // Read the generated PDF
    const pdfBuffer = fs.readFileSync(pdfFilePath);
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
  } finally {
    // Clean up temporary files
    try {
      if (fs.existsSync(htmlFilePath)) {
        fs.unlinkSync(htmlFilePath);
        console.log(`[PDF] Cleaned up HTML file: ${htmlFilePath}`);
      }
      if (fs.existsSync(pdfFilePath)) {
        fs.unlinkSync(pdfFilePath);
        console.log(`[PDF] Cleaned up PDF file: ${pdfFilePath}`);
      }
    } catch (cleanupError) {
      console.warn("[PDF] Error cleaning up temporary files:", cleanupError);
    }
  }
}

export { generateOfficialPdfHtml };
