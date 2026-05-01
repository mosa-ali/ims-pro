/**
 * ============================================================================
 * BID OPENING MINUTES (BOM) PDF GENERATOR
 * ============================================================================
 * 
 * Generates professional Bid Opening Minutes PDFs using Puppeteer (headless Chrome).
 * Produces real PDFs with:
 * - Selectable text
 * - Searchable content
 * - Real tables
 * - Vector graphics (no pixelation)
 * - Full header with organization branding
 * - RTL/LTR support for Arabic/English
 * 
 * USAGE:
 * const pdf = await generateBidOpeningMinutesPDF(bomData, language);
 * // Returns: { pdf: base64String, filename: string }
 * 
 * ============================================================================
 */

export interface BidOpeningMinutesPDFData {
  // Organization Info
  organizationName: string;
  organizationLogo?: string;
  operatingUnitName?: string;
  
  // BOM Details
  bomNumber: string;
  bidDate: string;
  openingTime: string;
  location: string;
  openingMode: 'physical' | 'online' | 'hybrid';
  
  // Committee
  chairpersonName: string;
  member1Name?: string;
  member2Name?: string;
  member3Name?: string;
  
  // Bids Information
  totalBidsReceived: number;
  bidsOpenedCount: number;
  
  // Additional Info
  openingNotes?: string;
  irregularities?: string;
  
  // Language
  language: 'en' | 'ar';
}

/**
 * Format date for display
 */
function formatDate(dateStr: string, isArabic: boolean = false): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get localized labels for BOM
 */
function getLabels(language: 'en' | 'ar') {
  const isArabic = language === 'ar';
  
  return {
    title: isArabic ? 'محضر فتح العروض' : 'Bid Opening Minutes',
    bomNumber: isArabic ? 'رقم المحضر' : 'BOM Number',
    bidDate: isArabic ? 'تاريخ الفتح' : 'Bid Opening Date',
    openingTime: isArabic ? 'وقت الفتح' : 'Opening Time',
    location: isArabic ? 'مكان الفتح' : 'Location',
    openingMode: isArabic ? 'طريقة الفتح' : 'Opening Mode',
    chairperson: isArabic ? 'رئيس اللجنة' : 'Chairperson',
    members: isArabic ? 'أعضاء اللجنة' : 'Committee Members',
    totalBids: isArabic ? 'إجمالي العروض المستلمة' : 'Total Bids Received',
    bidsOpened: isArabic ? 'العروض المفتوحة' : 'Bids Opened',
    notes: isArabic ? 'ملاحظات' : 'Notes',
    irregularities: isArabic ? 'المخالفات' : 'Irregularities',
    generatedOn: isArabic ? 'تم الإنشاء في' : 'Generated on',
    page: isArabic ? 'صفحة' : 'Page',
  };
}

/**
 * Generate HTML content for BOM PDF
 */
function generateBOMHTML(data: BidOpeningMinutesPDFData): string {
  const isRTL = data.language === 'ar';
  const labels = getLabels(data.language);
  const formattedDate = formatDate(data.bidDate, isRTL);
  const generatedDate = new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
<!DOCTYPE html>
<html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${data.language}">
<head>
  <meta charset="UTF-8">
  <title>${labels.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { 
      box-sizing: border-box; 
      margin: 0; 
      padding: 0; 
    }
    
    @page {
      size: A4 portrait;
      margin: 12mm 12mm 15mm 12mm;
    }
    
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .page-break {
        page-break-after: always;
      }
    }
    
    body {
      font-family: ${isRTL ? "'Noto Sans Arabic', 'Arial', sans-serif" : "'Inter', 'Arial', sans-serif"};
      font-size: 10pt;
      line-height: 1.5;
      color: #1a1a1a;
      background: white;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .container {
      width: 100%;
      max-width: none;
    }
    
    /* ===== HEADER SECTION ===== */
    .header {
      background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
      color: white;
      padding: 16px 20px;
      margin-bottom: 20px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(255,255,255,0.2);
    }
    
    .logo-section {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .logo {
      width: 40px;
      height: 40px;
      background: white;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: #1e3a5f;
      font-size: 12pt;
    }
    
    .logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 4px;
    }
    
    .org-info {
      font-size: 11pt;
      font-weight: 600;
    }
    
    .org-unit {
      font-size: 9pt;
      opacity: 0.9;
    }
    
    .report-meta {
      text-align: ${isRTL ? 'left' : 'right'};
      font-size: 9pt;
    }
    
    .report-meta .title {
      font-weight: 600;
      font-size: 11pt;
    }
    
    .header-divider {
      height: 3px;
      background: #00a8a8;
      margin-top: 12px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    /* ===== CONTENT SECTION ===== */
    .content {
      padding: 0 20px;
    }
    
    .document-title {
      font-size: 18pt;
      font-weight: 700;
      color: #1e3a5f;
      text-align: center;
      margin-bottom: 20px;
      text-transform: uppercase;
    }
    
    /* ===== SECTIONS ===== */
    .section {
      margin-bottom: 16px;
    }
    
    .section-title {
      font-size: 12pt;
      font-weight: 700;
      color: white;
      background: #1e3a5f;
      padding: 8px 12px;
      margin-bottom: 10px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    /* ===== TABLES ===== */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    
    th, td {
      padding: 8px 10px;
      text-align: ${isRTL ? 'right' : 'left'};
      border: 1px solid #d0d0d0;
      font-size: 9pt;
    }
    
    th {
      background: #00a8a8;
      color: white;
      font-weight: 600;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    tr:nth-child(even) {
      background: #f8f8f8;
    }
    
    .label-cell {
      background: #f0f0f0;
      font-weight: 600;
      width: 40%;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    /* ===== INFO BOX ===== */
    .info-box {
      background: #f0f7ff;
      border-left: 4px solid #00a8a8;
      padding: 12px;
      margin-bottom: 12px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .info-box p {
      margin: 4px 0;
      font-size: 9pt;
    }
    
    /* ===== FOOTER ===== */
    .footer {
      margin-top: 30px;
      padding-top: 10px;
      border-top: 2px solid #d0d0d0;
      font-size: 8pt;
      color: #666;
      text-align: center;
    }
    
    /* ===== PRINT SPECIFIC ===== */
    @media print {
      header {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        page-break-inside: avoid !important;
      }
      
      .section {
        page-break-inside: avoid;
      }
      
      table {
        page-break-inside: avoid;
      }
      
      tr {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- ===== HEADER ===== -->
    <header class="header">
      <div class="header-top">
        <div class="logo-section">
          ${data.organizationLogo ? `<div class="logo"><img src="${data.organizationLogo}" alt="Logo" /></div>` : '<div class="logo">ORG</div>'}
          <div>
            <div class="org-info">${data.organizationName}</div>
            ${data.operatingUnitName ? `<div class="org-unit">${data.operatingUnitName}</div>` : ''}
          </div>
        </div>
        <div class="report-meta">
          <div class="title">${labels.title}</div>
          <div>${labels.bomNumber}: ${data.bomNumber}</div>
        </div>
      </div>
      <div class="header-divider"></div>
    </header>
    
    <!-- ===== CONTENT ===== -->
    <div class="content">
      <div class="document-title">${labels.title}</div>
      
      <!-- ===== BOM DETAILS SECTION ===== -->
      <div class="section">
        <div class="section-title">${labels.bomNumber}</div>
        <table>
          <tr>
            <td class="label-cell">${labels.bomNumber}</td>
            <td>${data.bomNumber}</td>
          </tr>
          <tr>
            <td class="label-cell">${labels.bidDate}</td>
            <td>${formattedDate}</td>
          </tr>
          <tr>
            <td class="label-cell">${labels.openingTime}</td>
            <td>${data.openingTime || 'N/A'}</td>
          </tr>
          <tr>
            <td class="label-cell">${labels.location}</td>
            <td>${data.location || 'N/A'}</td>
          </tr>
          <tr>
            <td class="label-cell">${labels.openingMode}</td>
            <td>${data.openingMode}</td>
          </tr>
        </table>
      </div>
      
      <!-- ===== COMMITTEE SECTION ===== -->
      <div class="section">
        <div class="section-title">${labels.members}</div>
        <table>
          <tr>
            <td class="label-cell">${labels.chairperson}</td>
            <td>${data.chairpersonName || 'N/A'}</td>
          </tr>
          ${data.member1Name ? `
          <tr>
            <td class="label-cell">Member 1</td>
            <td>${data.member1Name}</td>
          </tr>
          ` : ''}
          ${data.member2Name ? `
          <tr>
            <td class="label-cell">Member 2</td>
            <td>${data.member2Name}</td>
          </tr>
          ` : ''}
          ${data.member3Name ? `
          <tr>
            <td class="label-cell">Member 3</td>
            <td>${data.member3Name}</td>
          </tr>
          ` : ''}
        </table>
      </div>
      
      <!-- ===== BIDS SECTION ===== -->
      <div class="section">
        <div class="section-title">${labels.totalBids}</div>
        <table>
          <tr>
            <td class="label-cell">${labels.totalBids}</td>
            <td>${data.totalBidsReceived}</td>
          </tr>
          <tr>
            <td class="label-cell">${labels.bidsOpened}</td>
            <td>${data.bidsOpenedCount}</td>
          </tr>
        </table>
      </div>
      
      <!-- ===== NOTES SECTION ===== -->
      ${data.openingNotes ? `
      <div class="section">
        <div class="section-title">${labels.notes}</div>
        <div class="info-box">
          <p>${data.openingNotes}</p>
        </div>
      </div>
      ` : ''}
      
      <!-- ===== IRREGULARITIES SECTION ===== -->
      ${data.irregularities ? `
      <div class="section">
        <div class="section-title">${labels.irregularities}</div>
        <div class="info-box">
          <p>${data.irregularities}</p>
        </div>
      </div>
      ` : ''}
      
      <!-- ===== FOOTER ===== -->
      <div class="footer">
        <p>${labels.generatedOn}: ${generatedDate}</p>
        <p>Document ID: ${data.bomNumber}</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate PDF from HTML using Puppeteer
 * Returns base64-encoded PDF string
 */

import puppeteer from "puppeteer";

export async function generatePDFFromHTML(htmlContent: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath:
      process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium",
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

    // Ensure consistent rendering
    await page.setViewport({ width: 1920, height: 1080 });

    // Load HTML
    await page.setContent(htmlContent, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // ✅ CRITICAL: wait for fonts (fix header + Arabic)
    await page.evaluate(() => document.fonts.ready);

    // Generate PDF (same as Project Report)
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "12mm",
        right: "12mm",
        bottom: "15mm",
        left: "12mm",
      },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

/**
 * Main function to generate BOM PDF
 * Returns base64-encoded PDF and filename
 */
export async function generateBidOpeningMinutesPDF(
  data: BidOpeningMinutesPDFData
): Promise<{ pdf: string; filename: string }> {
  try {
    console.log(`[BOM PDF] Generating PDF: ${data.bomNumber}, Language: ${data.language}`);

    // Generate HTML
    const htmlContent = generateBOMHTML(data);

    // Generate PDF from HTML
    const pdfBuffer = await generatePDFFromHTML(htmlContent);

    // Convert to base64
    const base64PDF = pdfBuffer.toString('base64');

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `BOM-${data.bomNumber}-${data.language}-${timestamp}.pdf`;

    console.log(`[BOM PDF] PDF generated successfully: ${filename}, Size: ${(pdfBuffer.length / 1024).toFixed(2)}KB`);

    return {
      pdf: base64PDF,
      filename,
    };
  } catch (error) {
    console.error('[BOM PDF] Error in generateBidOpeningMinutesPDF:', error);
    throw error;
  }
}

export default generateBidOpeningMinutesPDF;
