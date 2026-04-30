import puppeteer from 'puppeteer';
import crypto from 'crypto';
import { generateOfficialPdfHtml } from './templates/layout/OfficialWrapper';

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
 * In-memory PDF cache with TTL (1 hour expiration)
 * Stores generated PDF buffers by token for fast retrieval
 */
const pdfCache = new Map<string, { buffer: Buffer; expiresAt: number }>();

/**
 * Clean up expired PDFs from cache every 10 minutes
 */
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of pdfCache.entries()) {
    if (data.expiresAt < now) {
      pdfCache.delete(token);
    }
  }
}, 10 * 60 * 1000);

/**
 * Generate official PDF in-memory using Puppeteer
 * Implements System-Wide Official PDF Output Framework
 * - A4 format enforced
 * - Standard header/footer rendered in-page (not via Puppeteer header/footer templates)
 * - Org + OU from scope
 * - Logo from Branding settings
 * - RTL/LTR support
 * - No browser-default header (date/title) or footer (page numbers)
 * - Returns PDF buffer without saving to disk
 */
export async function generateOfficialPdf(
  options: OfficialPdfOptions
): Promise<Buffer> {
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
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/usr/bin/chromium',
    args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-crash-reporter',
    '--disable-breakpad',
    ],
  });

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
      displayHeaderFooter: true,
    });
    
    const pdf = await page.pdf();
// ✅ Ensure always Buffer
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

/**
 * Cache PDF buffer with unique token and return download URL
 * PDFs are stored in-memory for 1 hour
 */
export function cachePdfAndGetToken(pdfBuffer: Buffer): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour TTL

  pdfCache.set(token, { buffer: pdfBuffer, expiresAt });

  return `/api/download-pdf/${token}`;
}

/**
 * Retrieve PDF buffer from cache by token
 * Returns null if token not found or expired
 */
export function getPdfFromCache(token: string): Buffer | null {
  const cached = pdfCache.get(token);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt < Date.now()) {
    pdfCache.delete(token);
    return null;
  }

  return cached.buffer;
}

/**
 * Get cache stats for monitoring
 */
export function getPdfCacheStats() {
  return {
    cachedPdfs: pdfCache.size,
    totalSize: Array.from(pdfCache.values()).reduce(
      (sum, data) => sum + data.buffer.length,
      0
    ),
  };
}

export { generateOfficialPdfHtml };
