import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  const orgId = 30001;
  const ouId = 30001;
  const userId = 1080332;
  
  // PR #1: $800 Office Supplies (Multiple Quotations tier $500-$5K)
  const [pr1] = await conn.execute(
    `INSERT INTO purchase_requests (prNumber, category, projectId, projectTitle, donorName, currency, prTotalUSD, department, requesterName, requesterEmail, requesterId, prDate, urgency, neededBy, deliveryLocation, justification, procurementLadder, status, procurementStatus, operatingUnitId, organizationId, isDeleted, createdBy, approvedBy, approvedOn, approverEmail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, DATE_ADD(NOW(), INTERVAL 30 DAY), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
    ['PR-HQ-2026-101', 'goods', 2, 'Water & Sanitation - Phase 2', 'UNICEF', 'USD', '800.00', 'Logistics', 'Mosa Drwesh', 'mdrwesh82@gmail.com', userId, 'normal', 'YDH Headquarters', 'Office supplies for project team', 'three_quotations', 'approved', 'rfqs', ouId, orgId, 0, userId, userId, 'mdrwesh82@gmail.com']
  );
  const pr1Id = pr1.insertId;
  
  // Line items for PR #1
  await conn.execute(`INSERT INTO purchase_request_line_items (purchaseRequestId, lineNumber, description, quantity, unit, unitPrice, totalPrice) VALUES (?, 1, 'A4 Paper (500 sheets/ream)', '20', 'Ream', '15.00', '300.00'), (?, 2, 'Printer Toner Cartridge', '5', 'Piece', '60.00', '300.00'), (?, 3, 'Desk Organizer Set', '10', 'Set', '20.00', '200.00')`, [pr1Id, pr1Id, pr1Id]);
  
  console.log(`PR #1 created: ID=${pr1Id}, $800 Office Supplies`);
  
  // PR #2: $3,500 IT Equipment (Multiple Quotations tier $500-$5K)
  const [pr2] = await conn.execute(
    `INSERT INTO purchase_requests (prNumber, category, projectId, projectTitle, donorName, currency, prTotalUSD, department, requesterName, requesterEmail, requesterId, prDate, urgency, neededBy, deliveryLocation, justification, procurementLadder, status, procurementStatus, operatingUnitId, organizationId, isDeleted, createdBy, approvedBy, approvedOn, approverEmail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, DATE_ADD(NOW(), INTERVAL 14 DAY), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
    ['PR-HQ-2026-102', 'goods', 4, 'Mobile Health Clinics', 'WHO', 'USD', '3500.00', 'IT', 'Mosa Drwesh', 'mdrwesh82@gmail.com', userId, 'high', 'YDH Headquarters', 'IT equipment for mobile health clinics', 'three_quotations', 'approved', 'rfqs', ouId, orgId, 0, userId, userId, 'mdrwesh82@gmail.com']
  );
  const pr2Id = pr2.insertId;
  
  await conn.execute(`INSERT INTO purchase_request_line_items (purchaseRequestId, lineNumber, description, quantity, unit, unitPrice, totalPrice) VALUES (?, 1, 'Laptop Computer (Dell Latitude)', '2', 'Piece', '1200.00', '2400.00'), (?, 2, 'Portable Printer', '2', 'Piece', '350.00', '700.00'), (?, 3, 'USB External Drive 1TB', '4', 'Piece', '100.00', '400.00')`, [pr2Id, pr2Id, pr2Id]);
  
  console.log(`PR #2 created: ID=${pr2Id}, $3,500 IT Equipment`);
  
  // PR #3: $35,000 Construction Materials (Tender tier > $25K)
  const [pr3] = await conn.execute(
    `INSERT INTO purchase_requests (prNumber, category, projectId, projectTitle, donorName, currency, prTotalUSD, department, requesterName, requesterEmail, requesterId, prDate, urgency, neededBy, deliveryLocation, justification, procurementLadder, status, procurementStatus, operatingUnitId, organizationId, isDeleted, createdBy, approvedBy, approvedOn, approverEmail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, DATE_ADD(NOW(), INTERVAL 60 DAY), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
    ['PR-HQ-2026-103', 'goods', 2, 'Water & Sanitation - Phase 2', 'UNICEF', 'USD', '35000.00', 'Engineering', 'Mosa Drwesh', 'mdrwesh82@gmail.com', userId, 'normal', 'Field Office - Aden', 'Construction materials for water sanitation infrastructure', 'tender', 'approved', 'tender_invitation', ouId, orgId, 0, userId, userId, 'mdrwesh82@gmail.com']
  );
  const pr3Id = pr3.insertId;
  
  await conn.execute(`INSERT INTO purchase_request_line_items (purchaseRequestId, lineNumber, description, quantity, unit, unitPrice, totalPrice) VALUES (?, 1, 'PVC Pipes (4 inch, 6m length)', '500', 'Piece', '25.00', '12500.00'), (?, 2, 'Water Storage Tank (5000L)', '5', 'Piece', '2000.00', '10000.00'), (?, 3, 'Cement (50kg bags)', '200', 'Bag', '12.50', '2500.00'), (?, 4, 'Water Pump (Solar Powered)', '2', 'Piece', '5000.00', '10000.00')`, [pr3Id, pr3Id, pr3Id, pr3Id]);
  
  console.log(`PR #3 created: ID=${pr3Id}, $35,000 Construction Materials`);
  
  console.log(`\nAll 3 PRs created and approved!`);
  console.log(`PR #1 (ID ${pr1Id}): $800 → QA (Multiple Quotations)`);
  console.log(`PR #2 (ID ${pr2Id}): $3,500 → QA (Multiple Quotations)`);
  console.log(`PR #3 (ID ${pr3Id}): $35,000 → BA (Tender)`);
  
  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
