import puppeteer, { Browser } from "puppeteer";
import { storagePut } from "../../storage";
import { generateOfficialPdfHtml } from "./templates/layout/OfficialWrapper";
import { ENV } from "../../_core/env";

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
  templateVersion?: string;
}

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
    templateVersion,
  } = options;

  let browser: Browser | null = null;

  try {
    //-----------------------------------
    // Generate wrapped HTML
    //-----------------------------------
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

    //-----------------------------------
    // Resolve executable path safely
    //-----------------------------------
    const executablePath =
      ENV.PUPPETEER_EXECUTABLE_PATH ||
      puppeteer.executablePath();

    console.log("PDF Engine Starting...");
    console.log("Using Chromium Path:", executablePath);
    console.log("Resolved Puppeteer path:", puppeteer.executablePath());
    console.log("ENV executable path:", process.env.PUPPETEER_EXECUTABLE_PATH);

    //-----------------------------------
    // Launch browser
    //-----------------------------------
    browser = await puppeteer.launch({
      headless: true,
      executablePath,
      timeout: 120000,
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

    const page = await browser.newPage();

    //-----------------------------------
    // Better PDF rendering stability
    //-----------------------------------
    await page.setViewport({
      width: 1400,
      height: 1800,
    });

    await page.emulateMediaType("screen");

    //-----------------------------------
    // Load HTML
    //-----------------------------------
    await page.setContent(htmlContent, {
      waitUntil: "networkidle0",
      timeout: 120000,
    });

    //-----------------------------------
    // Extra wait for fonts/images
    //-----------------------------------
    await page.evaluate(async () => {
      if ((document as any).fonts?.ready) {
        await (document as any).fonts.ready;
      }
    });

    //-----------------------------------
    // Generate real PDF
    //-----------------------------------
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,

      margin: {
        top: "15mm",
        right: "15mm",
        bottom: "15mm",
        left: "15mm",
      },

      displayHeaderFooter: false,
    });

    //-----------------------------------
    // Safe filename
    //-----------------------------------
    const timestamp = Date.now();

    const cleanTitle = documentTitle
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");

    const languageCode = language === "ar" ? "ar" : "en";

    const versionSuffix = templateVersion
      ? `-${templateVersion}`
      : "";

    const fileName = `attendance/pdf/${cleanTitle}-${formNumber}-${languageCode}${versionSuffix}-${timestamp}.pdf`;

    //-----------------------------------
    // Upload real PDF
    //-----------------------------------
    const { url, key } = await storagePut(
      fileName,
      Buffer.from(pdfBuffer),
      "application/pdf"
    );

    console.log("PDF uploaded successfully:", url);

    return {
      url,
      key,
    };
  } catch (error: any) {
    console.error("Official PDF generation failed:", error);

    throw new Error(
      `Failed to generate attendance PDF: ${error.message}`
    );
  } finally {
    //-----------------------------------
    // Prevent browser-close crashes
    //-----------------------------------
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error(
          "Failed closing browser:",
          closeError
        );
      }
    }
  }
}

export { generateOfficialPdfHtml };