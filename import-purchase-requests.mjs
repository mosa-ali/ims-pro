import { createConnection } from 'mysql2/promise';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  // Parse "2/7/2026 1:58" format
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

async function importData() {
  const connection = await createConnection(DATABASE_URL);
  
  try {
    // Read and parse CSV files
    const purchaseRequestsCSV = fs.readFileSync('/home/ubuntu/upload/purchase_requests.csv', 'utf-8');
    const lineItemsCSV = fs.readFileSync('/home/ubuntu/upload/purchase_request_line_items.csv', 'utf-8');
    
    const purchaseRequests = parse(purchaseRequestsCSV, { columns: true, skip_empty_lines: true });
    const lineItems = parse(lineItemsCSV, { columns: true, skip_empty_lines: true });
    
    console.log(`Found ${purchaseRequests.length} purchase requests and ${lineItems.length} line items`);
    
    // Import purchase requests
    for (const pr of purchaseRequests) {
      const query = `
        INSERT INTO purchase_requests (
          id, prNumber, category, projectId, projectTitle, donorId, donorName, 
          budgetCode, subBudgetLine, activityName, totalBudgetLine, exchangeRateToUSD,
          totalBudgetLineUSD, currency, prTotalUSD, department, requesterName, 
          requesterEmail, requesterId, prDate, urgency, neededBy, deliveryLocation,
          justification, procurementLadder, status, procurementStatus, logValidatedBy,
          logValidatedOn, logValidatorEmail, finValidatedBy, finValidatedOn, 
          finValidatorEmail, approvedBy, approvedOn, approverEmail, rejectReason,
          rejectionStage, pmRejectedBy, pmRejectedOn, logRejectedBy, logRejectedOn,
          finRejectedBy, finRejectedOn, quotationAnalysisNumber, bidsAnalysisNumber,
          purchaseOrderNumber, grnNumber, operatingUnitId, organizationId, isDeleted,
          deletedAt, deletedBy, createdBy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          prNumber = VALUES(prNumber),
          category = VALUES(category),
          projectTitle = VALUES(projectTitle),
          prTotalUSD = VALUES(prTotalUSD),
          status = VALUES(status)
      `;
      
      await connection.execute(query, [
        pr.id, 
        pr.prNumber, 
        pr.category, 
        pr.projectId || null, 
        pr.projectTitle || null,
        pr.donorId || null, 
        pr.donorName || null, 
        pr.budgetCode || null, 
        pr.subBudgetLine || null,
        pr.activityName || null, 
        pr.totalBudgetLine || 0, 
        pr.exchangeRateToUSD || 0,
        pr.totalBudgetLineUSD || 0, 
        pr.currency || 'USD', 
        pr.prTotalUSD || 0,
        pr.department || null, 
        pr.requesterName || null, 
        pr.requesterEmail || null,
        pr.requesterId || null, 
        parseDate(pr.prDate), 
        pr.urgency || 'normal',
        parseDate(pr.neededBy), 
        pr.deliveryLocation || null, 
        pr.justification || null,
        pr.procurementLadder || null, 
        pr.status || 'draft', 
        pr.procurementStatus || null,
        pr.logValidatedBy || null, 
        parseDate(pr.logValidatedOn), 
        pr.logValidatorEmail || null,
        pr.finValidatedBy || null, 
        parseDate(pr.finValidatedOn), 
        pr.finValidatorEmail || null,
        pr.approvedBy || null, 
        parseDate(pr.approvedOn), 
        pr.approverEmail || null,
        pr.rejectReason || null, 
        pr.rejectionStage || null, 
        pr.pmRejectedBy || null,
        parseDate(pr.pmRejectedOn), 
        pr.logRejectedBy || null, 
        parseDate(pr.logRejectedOn),
        pr.finRejectedBy || null, 
        parseDate(pr.finRejectedOn), 
        pr.quotationAnalysisNumber || null,
        pr.bidsAnalysisNumber || null, 
        pr.purchaseOrderNumber || null, 
        pr.grnNumber || null,
        pr.operatingUnitId || null, 
        pr.organizationId || null, 
        pr.isDeleted || 0,
        pr.deletedAt ? parseDate(pr.deletedAt) : null, 
        pr.deletedBy || null, 
        pr.createdBy || null
      ]);
      
      console.log(`✓ Imported purchase request: ${pr.prNumber}`);
    }
    
    // Import line items
    for (const item of lineItems) {
      const query = `
        INSERT INTO purchase_request_line_items (
          id, purchaseRequestId, lineNumber, budgetLine, description, descriptionAr,
          specifications, specificationsAr, quantity, unit, unitPrice, totalPrice
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          description = VALUES(description),
          quantity = VALUES(quantity),
          unitPrice = VALUES(unitPrice),
          totalPrice = VALUES(totalPrice)
      `;
      
      await connection.execute(query, [
        item.id, 
        item.purchaseRequestId, 
        item.lineNumber || 1, 
        item.budgetLine || null,
        item.description || null, 
        item.descriptionAr || null, 
        item.specifications || null,
        item.specificationsAr || null, 
        item.quantity || 0, 
        item.unit || null,
        item.unitPrice || 0, 
        item.totalPrice || 0
      ]);
      
      console.log(`✓ Imported line item ${item.lineNumber} for PR ${item.purchaseRequestId}`);
    }
    
    console.log('\n✅ Import completed successfully!');
    console.log(`- Imported ${purchaseRequests.length} purchase requests`);
    console.log(`- Imported ${lineItems.length} line items`);
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

importData().catch(console.error);
