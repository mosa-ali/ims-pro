/**
 * Bid Opening Minutes PDF Template
 * Backend template for generating HTML content for BOM PDFs
 * This is NOT a React component - it's pure HTML generation
 */

export interface BidOpeningMinutesData {
  id: number;
  bomNumber: string;
  bidDate: string;
  openingTime: string;
  location: string;
  chairman: string;
  secretary: string;
  committee: Array<{
    name: string;
    title: string;
  }>;
  bids: Array<{
    bidderName: string;
    bidAmount: number;
    currency: string;
    submittedBy: string;
    submissionTime: string;
  }>;
  notes: string;
  language?: "en" | "ar";
}

/**
 * Build HTML content for Bid Opening Minutes PDF
 * @param data - BOM data from database
 * @param language - Language for labels ("en" or "ar")
 * @returns HTML string ready for PDF generation
 */
export function buildBidOpeningMinutesHtml(
  data: BidOpeningMinutesData,
  language: "en" | "ar" = "en"
): string {
  const isArabic = language === "ar";

  // Label translations
  const labels = {
    bomNumber: isArabic ? "رقم محضر الفتح" : "BOM Number",
    bidDate: isArabic ? "تاريخ الفتح" : "Bid Opening Date",
    openingTime: isArabic ? "وقت الفتح" : "Opening Time",
    location: isArabic ? "مكان الفتح" : "Location",
    chairman: isArabic ? "رئيس اللجنة" : "Chairman",
    secretary: isArabic ? "الأمين" : "Secretary",
    committee: isArabic ? "أعضاء اللجنة" : "Committee Members",
    bids: isArabic ? "العروض المقدمة" : "Submitted Bids",
    bidderName: isArabic ? "اسم المقدم" : "Bidder Name",
    bidAmount: isArabic ? "المبلغ" : "Amount",
    currency: isArabic ? "العملة" : "Currency",
    submittedBy: isArabic ? "مقدم من" : "Submitted By",
    submissionTime: isArabic ? "وقت التقديم" : "Submission Time",
    notes: isArabic ? "ملاحظات" : "Notes",
    name: isArabic ? "الاسم" : "Name",
    title: isArabic ? "المنصب" : "Title"
  };

  // Format date
  const formattedDate = new Date(data.bidDate).toLocaleDateString(
    isArabic ? "ar-SA" : "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  // Build committee members table rows
  const committeeRows = data.committee
    .map(
      (member) => `
    <tr>
      <td>${member.name}</td>
      <td>${member.title}</td>
    </tr>
  `
    )
    .join("");

  // Build bids table rows
  const bidsRows = data.bids
    .map(
      (bid) => `
    <tr>
      <td>${bid.bidderName}</td>
      <td style="text-align: right;">${bid.bidAmount.toLocaleString()}</td>
      <td>${bid.currency}</td>
      <td>${bid.submittedBy}</td>
      <td>${bid.submissionTime}</td>
    </tr>
  `
    )
    .join("");

  return `
    <div class="bid-opening-minutes">
      <!-- Header Section -->
      <div class="section-title">${labels.bomNumber}</div>
      <table class="info-table">
        <tr>
          <td class="label">${labels.bomNumber}:</td>
          <td>${data.bomNumber}</td>
        </tr>
        <tr>
          <td class="label">${labels.bidDate}:</td>
          <td>${formattedDate}</td>
        </tr>
        <tr>
          <td class="label">${labels.openingTime}:</td>
          <td>${data.openingTime}</td>
        </tr>
        <tr>
          <td class="label">${labels.location}:</td>
          <td>${data.location}</td>
        </tr>
      </table>

      <!-- Committee Section -->
      <div class="section-title">${labels.committee}</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>${labels.name}</th>
            <th>${labels.title}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${data.chairman}</td>
            <td>${labels.chairman}</td>
          </tr>
          <tr>
            <td>${data.secretary}</td>
            <td>${labels.secretary}</td>
          </tr>
          ${committeeRows}
        </tbody>
      </table>

      <!-- Bids Section -->
      <div class="section-title">${labels.bids}</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>${labels.bidderName}</th>
            <th>${labels.bidAmount}</th>
            <th>${labels.currency}</th>
            <th>${labels.submittedBy}</th>
            <th>${labels.submissionTime}</th>
          </tr>
        </thead>
        <tbody>
          ${bidsRows}
        </tbody>
      </table>

      <!-- Notes Section -->
      ${
        data.notes
          ? `
      <div class="section-title">${labels.notes}</div>
      <div class="notes-content">
        ${data.notes}
      </div>
      `
          : ""
      }

      <!-- Signature Block -->
      <div class="signature-block">
        <div class="signature-line">
          <div class="signature-space"></div>
          <div class="signature-label">${labels.chairman}</div>
        </div>
        <div class="signature-line">
          <div class="signature-space"></div>
          <div class="signature-label">${labels.secretary}</div>
        </div>
      </div>
    </div>

    <style>
      .bid-opening-minutes {
        font-family: Arial, sans-serif;
        font-size: 12px;
        line-height: 1.6;
      }

      .section-title {
        font-weight: bold;
        font-size: 13px;
        margin-top: 15px;
        margin-bottom: 10px;
        border-bottom: 1px solid #999;
        padding-bottom: 5px;
      }

      .info-table {
        width: 100%;
        margin-bottom: 15px;
        border-collapse: collapse;
      }

      .info-table td {
        padding: 8px;
        border: none;
        border-bottom: 1px solid #ddd;
      }

      .info-table .label {
        font-weight: bold;
        width: 30%;
      }

      .data-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 15px;
      }

      .data-table th,
      .data-table td {
        border: 1px solid #999;
        padding: 8px;
        text-align: left;
        font-size: 11px;
      }

      .data-table th {
        background-color: #f0f0f0;
        font-weight: bold;
      }

      .notes-content {
        border: 1px solid #ddd;
        padding: 10px;
        background-color: #f9f9f9;
        margin-bottom: 15px;
        line-height: 1.8;
      }

      .signature-block {
        display: flex;
        justify-content: space-around;
        margin-top: 30px;
        gap: 20px;
      }

      .signature-line {
        text-align: center;
        flex: 1;
      }

      .signature-space {
        border-top: 1px solid #000;
        height: 50px;
        margin-bottom: 5px;
      }

      .signature-label {
        font-size: 10px;
        font-weight: bold;
      }
    </style>
  `;
}
