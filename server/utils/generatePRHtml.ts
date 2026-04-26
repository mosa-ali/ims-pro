import fs from "fs";
import path from "path";

interface PRData {
  organizationName?: string;
  organizationLogo?: string;
  operatingUnitName?: string;
  id: number;
  prNumber: string;
  organizationId: string;
  operatingUnitId: string;
  category: string;
  projectTitle: string;
  donorName: string;
  budgetTitle: string;
  currency: string;
  exchangeRate: number;
  exchangeTo: string;
  total: number;
  prTotalUsd: number;
  requesterName: string;
  requesterEmail: string;
  department: string;
  justification: string;
  createdAt: Date;
  neededBy: string | null;
  status: string;
  logisticsSignerName?: string;
  logisticsSignerTitle?: string;
  logisticsSignatureDataUrl?: string;
  logValidatedOn?: Date;
  financeSignerName?: string;
  financeSignerTitle?: string;
  financeSignatureDataUrl?: string;
  finValidatedOn?: Date;
  pmSignerName?: string;
  pmSignerTitle?: string;
  pmSignatureDataUrl?: string;
  pmApprovedOn?: Date;
  lineItems: Array<{
    id: number;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    recurrence: number;
    totalPrice: number;
  }>;
}

export function generatePRHtml(pr: PRData): string {
  // Load CSS file
  const cssPath = path.join(
    process.cwd(),
    "server/templates/official-pdf.css"
  );

  let css = "";
  try {
    css = fs.readFileSync(cssPath, "utf8");
  } catch (error) {
    console.warn("CSS file not found, using minimal styles");
  }

  // Format date
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `${pr.exchangeTo} ${amount.toFixed(2)}`;
  };

  // Generate line items rows
  const lineItemsRows = pr.lineItems
    .map(
      (item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${item.description}</td>
      <td style="text-align: right;">${(typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity).toFixed(2)}</td>
      <td>${item.unit}</td>
      <td style="text-align: right;">${formatCurrency(typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice)}</td>
      <td style="text-align: right;">${item.recurrence ?? 1}</td>
      <td style="text-align: right;">${formatCurrency(typeof item.totalPrice === 'string' ? parseFloat(item.totalPrice) : item.totalPrice)}</td>
    </tr>
  `
    )
    .join("");

  // Generate signature blocks
  const signatureBlocks = `
    <div style="display: flex; justify-content: space-between; margin-top: 30px; page-break-inside: avoid;">
      <!-- Requested By -->
      <div style="flex: 1; text-align: center; margin-right: 10px;">
        <p style="font-weight: 600; margin-bottom: 20px;">Requested By</p>
        <p style="border-top: 1px solid #000; padding-top: 10px; min-height: 60px;"></p>
        <p style="font-size: 9pt; margin-top: 5px;">${pr.requesterName}</p>
        <p style="font-size: 8pt; color: #666;">${pr.department || "-"}</p>
        <p style="font-size: 8pt; color: #666;">${formatDate(pr.createdAt)}</p>
      </div>

      <!-- Logistics Validation -->
      <div style="flex: 1; text-align: center; margin-right: 10px;">
        <p style="font-weight: 600; margin-bottom: 20px;">Logistics Validation</p>
        ${
          pr.logisticsSignatureDataUrl
            ? `<img src="${pr.logisticsSignatureDataUrl}" alt="Logistics Signature" style="max-width: 100%; max-height: 60px; margin-bottom: 10px;" />`
            : `<p style="border-top: 1px solid #000; padding-top: 10px; min-height: 60px;"></p>`
        }
        <p style="font-size: 9pt; margin-top: 5px;">${pr.logisticsSignerName || "Not signed yet"}</p>
        <p style="font-size: 8pt; color: #666;">${pr.logisticsSignerTitle || "-"}</p>
        <p style="font-size: 8pt; color: #666;">${formatDate(pr.logValidatedOn)}</p>
      </div>

      <!-- Finance Validation -->
      <div style="flex: 1; text-align: center; margin-right: 10px;">
        <p style="font-weight: 600; margin-bottom: 20px;">Finance Validation</p>
        ${
          pr.financeSignatureDataUrl
            ? `<img src="${pr.financeSignatureDataUrl}" alt="Finance Signature" style="max-width: 100%; max-height: 60px; margin-bottom: 10px;" />`
            : `<p style="border-top: 1px solid #000; padding-top: 10px; min-height: 60px;"></p>`
        }
        <p style="font-size: 9pt; margin-top: 5px;">${pr.financeSignerName || "Not signed yet"}</p>
        <p style="font-size: 8pt; color: #666;">${pr.financeSignerTitle || "-"}</p>
        <p style="font-size: 8pt; color: #666;">${formatDate(pr.finValidatedOn)}</p>
      </div>

      <!-- Final Approval -->
      <div style="flex: 1; text-align: center;">
        <p style="font-weight: 600; margin-bottom: 20px;">Final Approval</p>
        ${
          pr.pmSignatureDataUrl
            ? `<img src="${pr.pmSignatureDataUrl}" alt="PM Signature" style="max-width: 100%; max-height: 60px; margin-bottom: 10px;" />`
            : `<p style="border-top: 1px solid #000; padding-top: 10px; min-height: 60px;"></p>`
        }
        <p style="font-size: 9pt; margin-top: 5px;">${pr.pmSignerName || "Not signed yet"}</p>
        <p style="font-size: 8pt; color: #666;">${pr.pmSignerTitle || "-"}</p>
        <p style="font-size: 8pt; color: #666;">${formatDate(pr.pmApprovedOn)}</p>
      </div>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Purchase Request ${pr.prNumber}</title>
      <style>
        ${css}
      </style>
    </head>
    <body>
      <!-- Header Section -->
      <div class="document-header">
        <div class="header-left">
            ${
              pr.organizationLogo
                ? `
                  <img 
                    src="${pr.organizationLogo}" 
                    alt="logoUrl"
                    style="
                      width:70px;
                      height:70px;
                      object-fit:contain;
                      margin-right:15px;
                    "
                  />
                `
                  : ""
              }
          <div class="header-info">
            <h1>${pr.organizationName}</h1>
            <p>${pr.operatingUnitName || "Logistics & Procurement"}</p>
          </div>
        </div>
        <div class="header-right">
          <p style="font-weight: 600;">${pr.prNumber}</p>
          <p>${formatDate(pr.createdAt)}</p>
        </div>
      </div>

      <!-- Document Title -->
      <div class="document-title">PURCHASE REQUEST</div>

      <!-- Metadata Section -->
      <div class="section">
        <div class="data-grid">
          <div class="data-item">
            <div class="data-label">Project</div>
            <div class="data-value">${pr.projectTitle || "-"}</div>
          </div>
          <div class="data-item">
            <div class="data-label">Donor</div>
            <div class="data-value">${pr.donorName || "-"}</div>
          </div>
          <div class="data-item">
            <div class="data-label">Category</div>
            <div class="data-value">${pr.category || "-"}</div>
          </div>
          <div class="data-item">
            <div class="data-label">Budget Code</div>
            <div class="data-value">${pr.budgetTitle || "-"}</div>
          </div>
          <div class="data-item">
            <div class="data-label">Department</div>
            <div class="data-value">${pr.department || "-"}</div>
          </div>
          <div class="data-item">
            <div class="data-label">Needed By</div>
            <div class="data-value">${formatDate(pr.neededBy ? new Date(pr.neededBy) : null)}</div>
          </div>
          <div class="data-item">
            <div class="data-label">Currency</div>
            <div class="data-value">${pr.exchangeTo}</div>
          </div>
          <div class="data-item">
            <div class="data-label">Exchange Rate</div>
            <div class="data-value">${pr.exchangeRate.toFixed(4)}</div>
          </div>
        </div>
      </div>

      <!-- Line Items Table -->
      <div class="section">
        <div class="section-title">Line Items</div>
        <table>
          <thead>
            <tr>
              <th style="width: 5%;">#</th>
              <th style="width: 35%;">Description</th>
              <th style="width: 10%; text-align: right;">Qty</th>
              <th style="width: 10%;">Unit</th>
              <th style="width: 15%; text-align: right;">Unit Price</th>
              <th style="width: 10%; text-align: right;">Recurrence</th>
              <th style="width: 15%; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${lineItemsRows}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="6" style="text-align: right; font-weight: 600;">Total:</td>
              <td style="text-align: right; font-weight: 600;">${formatCurrency(pr.prTotalUsd)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Justification Section -->
      <div class="section">
        <div class="section-title">Justification</div>
        <div class="section-content" style="padding: 10px; background-color: #F9FAFB; border-left: 3px solid #2563EB;">
          ${pr.justification || "-"}
        </div>
      </div>

      <!-- Signatures Section -->
      <div class="section">
        <div class="section-title">Approval Workflow Signatures</div>
        ${signatureBlocks}
      </div>

      <!-- Footer -->
      <div class="document-footer">
        <div class="footer-line">Generated on ${new Date().toLocaleString()}</div>
        <div class="footer-line">This is an official document generated by the IMS Platform</div>
      </div>
    </body>
    </html>
  `;
}
