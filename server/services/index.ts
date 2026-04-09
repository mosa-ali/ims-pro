/**
 * Services Module Export
 * 
 * Exports all service functions including PDF generation
 */

// Re-export PDF generator functions
export { generateProjectReportPDF, generateCaseManagementReportPDF } from './pdfGenerator';
export type { ProjectReportPDFData, CaseManagementReportPDFData } from './pdfGenerator';

// PDF Generator wrapper for template-based generation
import Handlebars from 'handlebars';
import puppeteer, { Browser, PuppeteerLaunchOptions } from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PDFGenerateOptions {
  templateName: string;
  data: Record<string, any>;
  language?: 'en' | 'ar';
  format?: 'A4' | 'Letter';
  margin?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
}

class PDFGeneratorService {
  private browser: Browser | null = null;
  private templatesDir: string;

  constructor() {
    this.templatesDir = path.join(__dirname, '..', 'templates');
  }

  /**
   * Initialize Puppeteer browser
   */
  private async initBrowser(): Promise<Browser> {
    if (this.browser) {
      return this.browser;
    }

    const launchOptions: PuppeteerLaunchOptions = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    };

    this.browser = await puppeteer.launch(launchOptions);
    return this.browser;
  }

  /**
   * Load and compile Handlebars template
   */
  private loadTemplate(templateName: string): HandlebarsTemplateDelegate {
    const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templatePath}`);
    }

    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    return Handlebars.compile(templateContent);
  }

  /**
   * Generate PDF from template and data
   */
  async generatePDF(options: PDFGenerateOptions): Promise<Buffer> {
    try {
      // Load template
      const template = this.loadTemplate(options.templateName);

      // Render HTML from template
      const html = template(options.data);

      // Initialize browser
      const browser = await this.initBrowser();
      const page = await browser.newPage();

      // Set content
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: options.format || 'A4',
        margin: {
          top: options.margin?.top || '10mm',
          bottom: options.margin?.bottom || '10mm',
          left: options.margin?.left || '10mm',
          right: options.margin?.right || '10mm',
        },
      });

      await page.close();

      return pdfBuffer;
    } catch (error) {
      console.error('PDF Generation Error:', error);
      throw error;
    }
  }

  /**
   * Close browser and cleanup
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Singleton instance
let pdfGeneratorInstance: PDFGeneratorService | null = null;

/**
 * Get PDF Generator singleton instance
 */
export function getPDFGenerator(): PDFGeneratorService {
  if (!pdfGeneratorInstance) {
    pdfGeneratorInstance = new PDFGeneratorService();
  }
  return pdfGeneratorInstance;
}

/**
 * Close PDF Generator Service
 * Call this during graceful shutdown
 */
export async function closePDFGenerator(): Promise<void> {
  if (pdfGeneratorInstance) {
    await pdfGeneratorInstance.close();
    pdfGeneratorInstance = null;
  }
}

// Cleanup on process exit
process.on('exit', async () => {
  await closePDFGenerator();
});
