/**
 * Evidence Generation Helpers
 * 
 * Functions to automatically generate evidence documents for all trigger events.
 * These are called from module routers when evidence-producing actions occur.
 */

import { findDocumentMapEntry, generateEvidenceDocument, type TriggerEvent } from "./documentMapping";
import puppeteer from "puppeteer";

/**
 * Generate PDF Evidence from HTML
 * Used for approval workflows, submissions, etc.
 */
export async function generatePDFEvidence(params: {
  module: string;
  screen: string;
  triggerEvent: TriggerEvent;
  entityType: string;
  entityId: string;
  htmlContent: string;
  variables: Record<string, any>;
  context: {
    organizationId: number;
    operatingUnitId: number;
    userId: number;
  };
}) {
  const { module, screen, triggerEvent, entityType, htmlContent, variables, context } = params;
  
  // Find document map entry
  const mapEntry = findDocumentMapEntry(module, screen, triggerEvent, entityType);
  if (!mapEntry) {
    throw new Error(
      `No document map entry found for ${module}/${screen}/${triggerEvent}/${entityType}`
    );
  }
  
  // Generate PDF using Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    executablePath:
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      '/usr/bin/chromium',
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
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
    });
    
    // Generate evidence document
    const document = await generateEvidenceDocument(
      mapEntry,
      Buffer.from(pdfBuffer),
      variables,
      context
    );
    
    return document;
  } finally {
    await browser.close();
  }
}

/**
 * Generate Excel Evidence
 * Used for financial reports, payroll, etc.
 */
export async function generateExcelEvidence(params: {
  module: string;
  screen: string;
  triggerEvent: TriggerEvent;
  entityType: string;
  entityId: string;
  excelBuffer: Buffer;
  variables: Record<string, any>;
  context: {
    organizationId: number;
    operatingUnitId: number;
    userId: number;
  };
}) {
  const { module, screen, triggerEvent, entityType, excelBuffer, variables, context } = params;
  
  // Find document map entry
  const mapEntry = findDocumentMapEntry(module, screen, triggerEvent, entityType);
  if (!mapEntry) {
    throw new Error(
      `No document map entry found for ${module}/${screen}/${triggerEvent}/${entityType}`
    );
  }
  
  // Generate evidence document
  const document = await generateEvidenceDocument(
    mapEntry,
    excelBuffer,
    variables,
    context
  );
  
  return document;
}

/**
 * Generate System Snapshot Evidence
 * Captures current state of an entity as JSON/HTML for audit trail
 */
export async function generateSnapshotEvidence(params: {
  module: string;
  screen: string;
  triggerEvent: TriggerEvent;
  entityType: string;
  entityId: string;
  snapshotData: any;
  variables: Record<string, any>;
  context: {
    organizationId: number;
    operatingUnitId: number;
    userId: number;
  };
}) {
  const { module, screen, triggerEvent, entityType, snapshotData, variables, context } = params;
  
  // Find document map entry
  const mapEntry = findDocumentMapEntry(module, screen, triggerEvent, entityType);
  if (!mapEntry) {
    throw new Error(
      `No document map entry found for ${module}/${screen}/${triggerEvent}/${entityType}`
    );
  }
  
  // Convert snapshot to HTML for PDF generation
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${entityType} Snapshot</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .metadata { background-color: #f9f9f9; padding: 10px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <h1>${entityType} Snapshot - ${variables.entityId}</h1>
      <div class="metadata">
        <p><strong>Trigger:</strong> ${triggerEvent}</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><strong>User:</strong> ${context.userId}</p>
      </div>
      <pre>${JSON.stringify(snapshotData, null, 2)}</pre>
    </body>
    </html>
  `;
  
  return generatePDFEvidence({
    module,
    screen,
    triggerEvent,
    entityType,
    entityId: variables.entityId,
    htmlContent,
    variables,
    context,
  });
}

/**
 * Activity Submission Evidence
 * Generates PDF evidence when an activity is submitted for approval
 */
export async function generateActivitySubmissionEvidence(params: {
  activityId: string;
  projectCode: string;
  activityData: any;
  context: {
    organizationId: number;
    operatingUnitId: number;
    userId: number;
  };
}) {
  const { activityId, projectCode, activityData, context } = params;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Activity Submission</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #2563eb; }
        .header { background-color: #f0f9ff; padding: 15px; margin-bottom: 20px; }
        .field { margin: 10px 0; }
        .label { font-weight: bold; color: #666; }
        .value { color: #333; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Activity Submission</h1>
        <p><strong>Project:</strong> ${projectCode}</p>
        <p><strong>Activity ID:</strong> ${activityId}</p>
        <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
      </div>
      <div class="field">
        <div class="label">Activity Name:</div>
        <div class="value">${activityData.name || "N/A"}</div>
      </div>
      <div class="field">
        <div class="label">Description:</div>
        <div class="value">${activityData.description || "N/A"}</div>
      </div>
      <div class="field">
        <div class="label">Status:</div>
        <div class="value">${activityData.status || "N/A"}</div>
      </div>
      <div class="field">
        <div class="label">Start Date:</div>
        <div class="value">${activityData.startDate || "N/A"}</div>
      </div>
      <div class="field">
        <div class="label">End Date:</div>
        <div class="value">${activityData.endDate || "N/A"}</div>
      </div>
    </body>
    </html>
  `;
  
  return generatePDFEvidence({
    module: "projects",
    screen: "activities",
    triggerEvent: "submit",
    entityType: "Activity",
    entityId: activityId,
    htmlContent,
    variables: { projectCode, entityId: activityId },
    context,
  });
}

/**
 * Activity Approval Evidence
 * Generates PDF evidence when an activity is approved
 */
export async function generateActivityApprovalEvidence(params: {
  activityId: string;
  projectCode: string;
  activityData: any;
  approvalData: {
    approvedBy: number;
    approvedAt: Date;
    comments?: string;
  };
  context: {
    organizationId: number;
    operatingUnitId: number;
    userId: number;
  };
}) {
  const { activityId, projectCode, activityData, approvalData, context } = params;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Activity Approval</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #16a34a; }
        .header { background-color: #f0fdf4; padding: 15px; margin-bottom: 20px; }
        .approval-badge { background-color: #16a34a; color: white; padding: 5px 10px; border-radius: 4px; }
        .field { margin: 10px 0; }
        .label { font-weight: bold; color: #666; }
        .value { color: #333; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Activity Approval <span class="approval-badge">APPROVED</span></h1>
        <p><strong>Project:</strong> ${projectCode}</p>
        <p><strong>Activity ID:</strong> ${activityId}</p>
        <p><strong>Approved:</strong> ${approvalData.approvedAt.toLocaleString()}</p>
        <p><strong>Approved By:</strong> User ${approvalData.approvedBy}</p>
      </div>
      <div class="field">
        <div class="label">Activity Name:</div>
        <div class="value">${activityData.name || "N/A"}</div>
      </div>
      <div class="field">
        <div class="label">Description:</div>
        <div class="value">${activityData.description || "N/A"}</div>
      </div>
      ${
        approvalData.comments
          ? `
      <div class="field">
        <div class="label">Approval Comments:</div>
        <div class="value">${approvalData.comments}</div>
      </div>
      `
          : ""
      }
    </body>
    </html>
  `;
  
  return generatePDFEvidence({
    module: "projects",
    screen: "activities",
    triggerEvent: "approve",
    entityType: "Activity",
    entityId: activityId,
    htmlContent,
    variables: { projectCode, entityId: activityId },
    context,
  });
}

/**
 * Payment Approval Evidence
 * Generates PDF evidence when a payment is approved
 */
export async function generatePaymentApprovalEvidence(params: {
  paymentId: string;
  paymentData: any;
  approvalData: {
    approvedBy: number;
    approvedAt: Date;
    comments?: string;
  };
  context: {
    organizationId: number;
    operatingUnitId: number;
    userId: number;
  };
}) {
  const { paymentId, paymentData, approvalData, context } = params;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Payment Approval</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #16a34a; }
        .header { background-color: #f0fdf4; padding: 15px; margin-bottom: 20px; border: 2px solid #16a34a; }
        .approval-badge { background-color: #16a34a; color: white; padding: 5px 10px; border-radius: 4px; }
        .field { margin: 10px 0; }
        .label { font-weight: bold; color: #666; }
        .value { color: #333; }
        .amount { font-size: 24px; font-weight: bold; color: #16a34a; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Payment Approval <span class="approval-badge">APPROVED</span></h1>
        <p><strong>Payment ID:</strong> ${paymentId}</p>
        <p><strong>Approved:</strong> ${approvalData.approvedAt.toLocaleString()}</p>
        <p><strong>Approved By:</strong> User ${approvalData.approvedBy}</p>
      </div>
      <div class="field">
        <div class="label">Amount:</div>
        <div class="amount">$${paymentData.amount || "0.00"}</div>
      </div>
      <div class="field">
        <div class="label">Vendor/Payee:</div>
        <div class="value">${paymentData.vendor || "N/A"}</div>
      </div>
      <div class="field">
        <div class="label">Description:</div>
        <div class="value">${paymentData.description || "N/A"}</div>
      </div>
      ${
        approvalData.comments
          ? `
      <div class="field">
        <div class="label">Approval Comments:</div>
        <div class="value">${approvalData.comments}</div>
      </div>
      `
          : ""
      }
    </body>
    </html>
  `;
  
  return generatePDFEvidence({
    module: "finance",
    screen: "payments",
    triggerEvent: "payment_approve",
    entityType: "Payment",
    entityId: paymentId,
    htmlContent,
    variables: { paymentId, entityId: paymentId },
    context,
  });
}

/**
 * Contract Finalization Evidence
 * Generates PDF evidence when a contract is finalized
 */
export async function generateContractFinalizationEvidence(params: {
  contractId: string;
  employeeId: string;
  contractData: any;
  context: {
    organizationId: number;
    operatingUnitId: number;
    userId: number;
  };
}) {
  const { contractId, employeeId, contractData, context } = params;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Contract Finalization</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #2563eb; }
        .header { background-color: #f0f9ff; padding: 15px; margin-bottom: 20px; border: 2px solid #2563eb; }
        .field { margin: 10px 0; }
        .label { font-weight: bold; color: #666; }
        .value { color: #333; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Employment Contract - FINALIZED</h1>
        <p><strong>Contract ID:</strong> ${contractId}</p>
        <p><strong>Employee ID:</strong> ${employeeId}</p>
        <p><strong>Finalized:</strong> ${new Date().toLocaleString()}</p>
      </div>
      <div class="field">
        <div class="label">Employee Name:</div>
        <div class="value">${contractData.employeeName || "N/A"}</div>
      </div>
      <div class="field">
        <div class="label">Position:</div>
        <div class="value">${contractData.position || "N/A"}</div>
      </div>
      <div class="field">
        <div class="label">Contract Type:</div>
        <div class="value">${contractData.contractType || "N/A"}</div>
      </div>
      <div class="field">
        <div class="label">Start Date:</div>
        <div class="value">${contractData.startDate || "N/A"}</div>
      </div>
      <div class="field">
        <div class="label">End Date:</div>
        <div class="value">${contractData.endDate || "N/A"}</div>
      </div>
      <div class="field">
        <div class="label">Salary:</div>
        <div class="value">$${contractData.salary || "0.00"}</div>
      </div>
    </body>
    </html>
  `;
  
  const year = new Date().getFullYear();
  
  return generatePDFEvidence({
    module: "hr",
    screen: "contracts",
    triggerEvent: "contract_finalize",
    entityType: "Contract",
    entityId: contractId,
    htmlContent,
    variables: { contractId, employeeId, entityId: contractId, year, operatingUnit: context.operatingUnitId },
    context,
  });
}


/**
 * Generate Payroll Approval Evidence
 * Called when HR payroll is approved
 */
export async function generatePayrollApprovalEvidence(
  payrollRecord: any,
  context: {
    organizationId: number;
    operatingUnitId: number;
    userId: number;
  }
) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .info { margin: 20px 0; }
        .label { font-weight: bold; display: inline-block; width: 200px; }
        .value { display: inline-block; }
      </style>
    </head>
    <body>
      <h1>Payroll Approval Evidence</h1>
      <div class="info">
        <div><span class="label">Payroll ID:</span><span class="value">${payrollRecord.id}</span></div>
        <div><span class="label">Employee ID:</span><span class="value">${payrollRecord.employeeId}</span></div>
        <div><span class="label">Month/Year:</span><span class="value">${payrollRecord.payrollMonth}/${payrollRecord.payrollYear}</span></div>
        <div><span class="label">Gross Salary:</span><span class="value">${payrollRecord.grossSalary}</span></div>
        <div><span class="label">Net Salary:</span><span class="value">${payrollRecord.netSalary}</span></div>
        <div><span class="label">Status:</span><span class="value">${payrollRecord.status}</span></div>
        <div><span class="label">Approved At:</span><span class="value">${new Date().toISOString()}</span></div>
      </div>
    </body>
    </html>
  `;
  
  return generatePDFEvidence({
    module: "hr",
    screen: "payroll",
    triggerEvent: "approve",
    entityType: "Payroll",
    entityId: payrollRecord.id.toString(),
    htmlContent,
    variables: {
      payrollId: payrollRecord.id,
      month: payrollRecord.payrollMonth,
      year: payrollRecord.payrollYear,
    },
    context,
  });
}

/**
 * Generate Leave Approval Evidence
 * Called when HR leave request is approved
 */
export async function generateLeaveApprovalEvidence(
  leaveRequest: any,
  context: {
    organizationId: number;
    operatingUnitId: number;
    userId: number;
  }
) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        h1 { color: #333; border-bottom: 2px solid #28a745; padding-bottom: 10px; }
        .info { margin: 20px 0; }
        .label { font-weight: bold; display: inline-block; width: 200px; }
        .value { display: inline-block; }
      </style>
    </head>
    <body>
      <h1>Leave Request Approval Evidence</h1>
      <div class="info">
        <div><span class="label">Request ID:</span><span class="value">${leaveRequest.id}</span></div>
        <div><span class="label">Employee ID:</span><span class="value">${leaveRequest.employeeId}</span></div>
        <div><span class="label">Leave Type:</span><span class="value">${leaveRequest.leaveType}</span></div>
        <div><span class="label">Start Date:</span><span class="value">${leaveRequest.startDate}</span></div>
        <div><span class="label">End Date:</span><span class="value">${leaveRequest.endDate}</span></div>
        <div><span class="label">Total Days:</span><span class="value">${leaveRequest.totalDays}</span></div>
        <div><span class="label">Status:</span><span class="value">${leaveRequest.status}</span></div>
        <div><span class="label">Approved At:</span><span class="value">${new Date().toISOString()}</span></div>
      </div>
    </body>
    </html>
  `;
  
  return generatePDFEvidence({
    module: "hr",
    screen: "leave",
    triggerEvent: "approve",
    entityType: "LeaveRequest",
    entityId: leaveRequest.id.toString(),
    htmlContent,
    variables: {
      requestId: leaveRequest.id,
      employeeId: leaveRequest.employeeId,
      leaveType: leaveRequest.leaveType,
    },
    context,
  });
}


/**
 * Generate Purchase Request Approval Evidence
 * Called when logistics purchase request is approved
 */
export async function generatePurchaseRequestApprovalEvidence(
  purchaseRequest: any,
  context: {
    organizationId: number;
    operatingUnitId: number;
    userId: number;
  }
) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        h1 { color: #333; border-bottom: 2px solid #17a2b8; padding-bottom: 10px; }
        .info { margin: 20px 0; }
        .label { font-weight: bold; display: inline-block; width: 200px; }
        .value { display: inline-block; }
      </style>
    </head>
    <body>
      <h1>Purchase Request Approval Evidence</h1>
      <div class="info">
        <div><span class="label">Request ID:</span><span class="value">${purchaseRequest.id}</span></div>
        <div><span class="label">Request Number:</span><span class="value">${purchaseRequest.requestNumber || 'N/A'}</span></div>
        <div><span class="label">Description:</span><span class="value">${purchaseRequest.description || 'N/A'}</span></div>
        <div><span class="label">Total Amount:</span><span class="value">${purchaseRequest.totalAmount || 'N/A'}</span></div>
        <div><span class="label">Status:</span><span class="value">${purchaseRequest.status}</span></div>
        <div><span class="label">Approved At:</span><span class="value">${new Date().toISOString()}</span></div>
      </div>
    </body>
    </html>
  `;
  
  return generatePDFEvidence({
    module: "logistics",
    screen: "purchase_requests",
    triggerEvent: "approve",
    entityType: "PurchaseRequest",
    entityId: purchaseRequest.id.toString(),
    htmlContent,
    variables: {
      requestId: purchaseRequest.id,
      requestNumber: purchaseRequest.requestNumber,
    },
    context,
  });
}


/**
 * Generate Asset Transfer Approval Evidence
 * Called when asset transfer is approved
 */
export async function generateAssetTransferApprovalEvidence(
  transfer: any,
  context: {
    organizationId: number;
    operatingUnitId: number;
    userId: number;
  }
) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        h1 { color: #333; border-bottom: 2px solid #28a745; padding-bottom: 10px; }
        .info { margin: 20px 0; }
        .label { font-weight: bold; display: inline-block; width: 200px; }
        .value { display: inline-block; }
      </style>
    </head>
    <body>
      <h1>Asset Transfer Approval Evidence</h1>
      <div class="info">
        <div><span class="label">Transfer ID:</span><span class="value">${transfer.id}</span></div>
        <div><span class="label">Transfer Code:</span><span class="value">${transfer.transferCode || 'N/A'}</span></div>
        <div><span class="label">Asset ID:</span><span class="value">${transfer.assetId}</span></div>
        <div><span class="label">From Location:</span><span class="value">${transfer.fromLocation || 'N/A'}</span></div>
        <div><span class="label">To Location:</span><span class="value">${transfer.toLocation || 'N/A'}</span></div>
        <div><span class="label">Transfer Date:</span><span class="value">${transfer.transferDate || 'N/A'}</span></div>
        <div><span class="label">Status:</span><span class="value">${transfer.status}</span></div>
        <div><span class="label">Approved At:</span><span class="value">${new Date().toISOString()}</span></div>
      </div>
    </body>
    </html>
  `;
  
  return generatePDFEvidence({
    module: "finance",
    screen: "asset_transfers",
    triggerEvent: "approve",
    entityType: "AssetTransfer",
    entityId: transfer.id.toString(),
    htmlContent,
    variables: {
      transferId: transfer.id,
      transferCode: transfer.transferCode,
    },
    context,
  });
}

/**
 * Generate Asset Disposal Approval Evidence
 * Called when asset disposal is approved
 */
export async function generateAssetDisposalApprovalEvidence(
  disposal: any,
  context: {
    organizationId: number;
    operatingUnitId: number;
    userId: number;
  }
) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        h1 { color: #333; border-bottom: 2px solid #dc3545; padding-bottom: 10px; }
        .info { margin: 20px 0; }
        .label { font-weight: bold; display: inline-block; width: 200px; }
        .value { display: inline-block; }
      </style>
    </head>
    <body>
      <h1>Asset Disposal Approval Evidence</h1>
      <div class="info">
        <div><span class="label">Disposal ID:</span><span class="value">${disposal.id}</span></div>
        <div><span class="label">Disposal Code:</span><span class="value">${disposal.disposalCode || 'N/A'}</span></div>
        <div><span class="label">Asset ID:</span><span class="value">${disposal.assetId}</span></div>
        <div><span class="label">Disposal Type:</span><span class="value">${disposal.disposalType || 'N/A'}</span></div>
        <div><span class="label">Proposed Value:</span><span class="value">${disposal.proposedValue || 'N/A'}</span></div>
        <div><span class="label">Reason:</span><span class="value">${disposal.reason || 'N/A'}</span></div>
        <div><span class="label">Status:</span><span class="value">${disposal.status}</span></div>
        <div><span class="label">Approved At:</span><span class="value">${new Date().toISOString()}</span></div>
      </div>
    </body>
    </html>
  `;
  
  return generatePDFEvidence({
    module: "finance",
    screen: "asset_disposals",
    triggerEvent: "approve",
    entityType: "AssetDisposal",
    entityId: disposal.id.toString(),
    htmlContent,
    variables: {
      disposalId: disposal.id,
      disposalCode: disposal.disposalCode,
    },
    context,
  });
}

