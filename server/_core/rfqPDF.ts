/**
 * RFQ PDF Generator
 * 
 * Generates professional Request for Quotation (RFQ) documents
 * Includes organization branding, PR details, line items, specifications, and submission instructions
 */

import { getDb } from "../db";
import { purchaseRequests, purchaseRequestLineItems, rfqVendors, organizations, operatingUnits } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

interface RFQPDFOptions {
  rfqVendorId: number;
  organizationId: number;
  operatingUnitId?: number | null;
}

/**
 * Generate RFQ PDF document
 * Returns HTML string that can be converted to PDF using manus-md-to-pdf or similar
 */
export async function generateRFQPDF(options: RFQPDFOptions): Promise<string> {
  const db = await getDb();

  // Fetch RFQ vendor details
  const [rfqVendor] = await db
    .select()
    .from(rfqVendors)
    .where(eq(rfqVendors.id, options.rfqVendorId))
    .limit(1);

  if (!rfqVendor) {
    throw new Error("RFQ vendor not found");
  }

  // Fetch PR details
  const [pr] = await db
    .select()
    .from(purchaseRequests)
    .where(eq(purchaseRequests.id, rfqVendor.purchaseRequestId))
    .limit(1);

  if (!pr) {
    throw new Error("Purchase Request not found");
  }

  // Fetch PR line items
  const lineItems = await db
    .select()
    .from(purchaseRequestLineItems)
    .where(eq(purchaseRequestLineItems.purchaseRequestId, pr.id));

  // Fetch organization details
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, options.organizationId))
    .limit(1);

  // Fetch operating unit details (if applicable)
  let ou = null;
  if (options.operatingUnitId) {
    [ou] = await db
      .select()
      .from(operatingUnits)
      .where(eq(operatingUnits.id, options.operatingUnitId))
      .limit(1);
  }

  // Generate HTML
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RFQ ${rfqVendor.rfqNumber || "Document"}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #333;
      padding: 40px;
      max-width: 210mm;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #2563eb;
    }
    .header h1 {
      color: #2563eb;
      font-size: 24pt;
      margin-bottom: 10px;
    }
    .header .org-name {
      font-size: 16pt;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 5px;
    }
    .header .org-details {
      font-size: 10pt;
      color: #666;
    }
    .section {
      margin-bottom: 25px;
    }
    .section-title {
      font-size: 14pt;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 2px solid #e5e7eb;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 20px;
    }
    .info-item {
      padding: 8px;
      background: #f9fafb;
      border-left: 3px solid #2563eb;
    }
    .info-label {
      font-weight: bold;
      color: #4b5563;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .info-value {
      color: #111827;
      font-size: 11pt;
      margin-top: 3px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      font-size: 10pt;
    }
    thead {
      background: #2563eb;
      color: white;
    }
    th {
      padding: 12px 8px;
      text-align: left;
      font-weight: bold;
      font-size: 10pt;
    }
    td {
      padding: 10px 8px;
      border-bottom: 1px solid #e5e7eb;
    }
    tbody tr:hover {
      background: #f9fafb;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .instructions {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin-top: 20px;
    }
    .instructions h3 {
      color: #92400e;
      margin-bottom: 10px;
      font-size: 12pt;
    }
    .instructions ul {
      margin-left: 20px;
      color: #78350f;
    }
    .instructions li {
      margin-bottom: 5px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      font-size: 9pt;
      color: #6b7280;
    }
    .highlight {
      background: #dbeafe;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>REQUEST FOR QUOTATION (RFQ)</h1>
    <div class="org-name">${org?.name || "Organization Name"}</div>
    <div class="org-details">
      ${ou?.name ? `${ou.name} | ` : ""}${org?.country || ""}
    </div>
  </div>

  <div class="section">
    <div class="section-title">RFQ Information</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">RFQ Number</div>
        <div class="info-value highlight">${rfqVendor.rfqNumber || "N/A"}</div>
      </div>
      <div class="info-item">
        <div class="info-label">PR Number</div>
        <div class="info-value">${pr.prNumber || "N/A"}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Issue Date</div>
        <div class="info-value">${rfqVendor.invitationSentDate ? new Date(rfqVendor.invitationSentDate).toLocaleDateString() : new Date().toLocaleDateString()}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Submission Deadline</div>
        <div class="info-value highlight">${rfqVendor.submissionDeadline ? new Date(rfqVendor.submissionDeadline).toLocaleDateString() : "To be confirmed"}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Purchase Request Details</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Requester</div>
        <div class="info-value">${pr.requesterName || "N/A"}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Department</div>
        <div class="info-value">${pr.requesterDepartment || "N/A"}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Priority</div>
        <div class="info-value">${pr.priority || "Normal"}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Required Delivery Date</div>
        <div class="info-value">${pr.requiredDeliveryDate ? new Date(pr.requiredDeliveryDate).toLocaleDateString() : "N/A"}</div>
      </div>
    </div>
    ${pr.justification ? `
    <div class="info-item" style="margin-top: 15px;">
      <div class="info-label">Justification</div>
      <div class="info-value">${pr.justification}</div>
    </div>
    ` : ""}
  </div>

  <div class="section">
    <div class="section-title">Items Requested</div>
    <table>
      <thead>
        <tr>
          <th style="width: 5%;">#</th>
          <th style="width: 25%;">Item Description</th>
          <th style="width: 30%;">Specifications</th>
          <th style="width: 10%;" class="text-center">Qty</th>
          <th style="width: 10%;" class="text-center">Unit</th>
          <th style="width: 20%;">Purpose</th>
        </tr>
      </thead>
      <tbody>
        ${lineItems.map((item, index) => `
        <tr>
          <td class="text-center">${index + 1}</td>
          <td><strong>${item.itemName || item.itemDescription || "N/A"}</strong></td>
          <td>${item.specifications || "-"}</td>
          <td class="text-center">${item.quantity || 0}</td>
          <td class="text-center">${item.unit || "N/A"}</td>
          <td>${item.purpose || "-"}</td>
        </tr>
        `).join("")}
      </tbody>
    </table>
  </div>

  <div class="instructions">
    <h3>📋 Submission Instructions</h3>
    <ul>
      <li><strong>Deadline:</strong> Please submit your quotation by <span class="highlight">${rfqVendor.submissionDeadline ? new Date(rfqVendor.submissionDeadline).toLocaleDateString() : "[To be confirmed]"}</span></li>
      <li><strong>Format:</strong> Provide unit prices for each item listed above in your quotation</li>
      <li><strong>Currency:</strong> Clearly specify the currency (USD, EUR, etc.) for all prices</li>
      <li><strong>Delivery Terms:</strong> Include estimated delivery time in days</li>
      <li><strong>Warranty:</strong> Specify warranty period in months (if applicable)</li>
      <li><strong>Validity:</strong> Your quotation should be valid for at least 30 days from submission</li>
      <li><strong>Reference:</strong> Please quote RFQ Number <strong>${rfqVendor.rfqNumber || "N/A"}</strong> in your response</li>
      <li><strong>Contact:</strong> For any clarifications, please contact the procurement department</li>
    </ul>
  </div>

  <div class="section" style="margin-top: 30px;">
    <div class="section-title">Terms & Conditions</div>
    <ul style="margin-left: 20px; font-size: 10pt; color: #4b5563;">
      <li>Prices should include all applicable taxes and duties</li>
      <li>Payment terms will be discussed after quotation evaluation</li>
      <li>The organization reserves the right to accept or reject any quotation</li>
      <li>Partial fulfillment of items may be considered</li>
      <li>Quality certifications and compliance documents may be requested</li>
    </ul>
  </div>

  <div class="footer">
    <p>This is an official Request for Quotation document generated by ${org?.name || "the organization"}</p>
    <p>Generated on ${new Date().toLocaleString()}</p>
    <p style="margin-top: 10px; font-size: 8pt;">RFQ Reference: ${rfqVendor.rfqNumber || "N/A"} | PR Reference: ${pr.prNumber || "N/A"}</p>
  </div>
</body>
</html>
  `;

  return html;
}
