import puppeteer from "puppeteer";
import { storagePut } from '../../storage';
import { generateOfficialPdfHtml } from './templates/layout/OfficialWrapper';

export async function launchBrowser() {
  const executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

  console.log(
    "[PDF] Using Chrome executable:",
    executablePath || "default system path"
  );

  return puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
    ],
  });
}

export interface OfficialPdfOptions {
  organizationName: string;
  operatingUnitName?: string;
  organizationLogo?: string;
  department: string;
  documentTitle: string;
  formNumber: string;
  formDate: string;
  bodyHtml: string;
  direction?: 'ltr' | 'rtl';
  language?: 'en' | 'ar';
  /** Optional template version string for cache invalidation (e.g., 'v3') */
  templateVersion?: string;
}

/**
 * Generate official PDF using Puppeteer and upload to S3
 * Implements System-Wide Official PDF Output Framework
 * - A4 format enforced
 * - Standard header/footer rendered in-page (not via Puppeteer header/footer templates)
 * - Org + OU from scope
 * - Logo from Branding settings
 * - RTL/LTR support
 * - No browser-default header (date/title) or footer (page numbers)
 */
export async function generateOfficialPdf(options: OfficialPdfOptions): Promise<{ url: string; key: string }> {
  const {
    organizationName,
    operatingUnitName,
    organizationLogo,
    department,
    documentTitle,
    formNumber,
    formDate,
    bodyHtml,
    direction = 'ltr',
    language = 'en',
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

  // Launch Puppeteer
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    
    // Set content and wait for network idle
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // Generate PDF with A4 format
    // displayHeaderFooter is FALSE to prevent Puppeteer's default date/title header
    // and "Page X of Y" footer from appearing
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm',
      },
      displayHeaderFooter: false,
    });

    // Upload to S3 with language-aware filename (includes template version for cache invalidation)
    const timestamp = Date.now();
    const languageCode = language === 'ar' ? 'ar' : 'en';
    const versionSuffix = options.templateVersion ? `-${options.templateVersion}` : '';
    const fileName = `procurement/pdf/${documentTitle.replace(/\s+/g, '-')}-${formNumber}-${languageCode}${versionSuffix}-${timestamp}.pdf`;
    const { url, key } = await storagePut(fileName, Buffer.from(pdfBuffer), 'application/pdf');

    return { url, key };
  } finally {
    await browser.close();
  }
}

export { generateOfficialPdfHtml };
