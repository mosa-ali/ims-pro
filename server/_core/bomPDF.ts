import PDFDocument from "pdfkit";
import type { Response } from "express";

/**
 * Bid Opening Minutes (BOM) PDF Generator
 * 
 * Generates an official document recording the bid opening ceremony
 * 
 * Layout:
 * - Header with organization branding
 * - Meeting details (date, time, location)
 * - Committee members/attendees list
 * - Bids received table (no prices disclosed)
 * - Notes and remarks
 * - Committee signatures
 */

interface BOMData {
  // Organization
  organizationName: string;
  organizationLogo?: string;
  
  // Tender reference
  prNumber: string;
  tenderReference: string;
  cbaNumber: string;
  
  // Meeting details
  meetingDate: string;
  meetingTime: string;
  location: string;
  
  // Attendees
  attendees: Array<{
    name: string;
    title: string;
    organization?: string;
  }>;
  
  // Bidders (no prices)
  bidders: Array<{
    bidderName: string;
    submissionDate: string;
    status: string;
  }>;
  
  // Notes
  notes?: string;
  
  // Signatures
  signatures: Array<{
    name: string;
    title: string;
    date: string;
  }>;
}

export function generateBOMPDF(data: BOMData, res: Response) {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
  });

  // Pipe to response
  doc.pipe(res);

  // Colors
  const primaryBlue = "#1e40af";
  const lightBlue = "#dbeafe";
  const darkGray = "#1f2937";
  const lightGray = "#f3f4f6";
  const borderGray = "#d1d5db";

  // ============================================================================
  // HEADER
  // ============================================================================
  doc.fontSize(20).fillColor(primaryBlue).font("Helvetica-Bold").text("BID OPENING MINUTES", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(12).fillColor(darkGray).font("Helvetica").text(data.organizationName, { align: "center" });
  doc.moveDown(1);

  // Horizontal line
  doc.strokeColor(borderGray).lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(1);

  // ============================================================================
  // TENDER REFERENCE
  // ============================================================================
  const refY = doc.y;
  doc.fontSize(10).fillColor(darkGray).font("Helvetica-Bold");
  doc.text("PR Number:", 50, refY, { continued: true });
  doc.font("Helvetica").text(` ${data.prNumber}`);
  
  doc.font("Helvetica-Bold").text("Tender Reference:", 50, doc.y, { continued: true });
  doc.font("Helvetica").text(` ${data.tenderReference}`);
  
  doc.font("Helvetica-Bold").text("CBA Number:", 50, doc.y, { continued: true });
  doc.font("Helvetica").text(` ${data.cbaNumber}`);
  
  doc.moveDown(1.5);

  // ============================================================================
  // MEETING DETAILS
  // ============================================================================
  doc.fontSize(12).fillColor(primaryBlue).font("Helvetica-Bold").text("Meeting Details");
  doc.moveDown(0.5);

  // Meeting details box
  const meetingBoxY = doc.y;
  doc.rect(50, meetingBoxY, 495, 80).fillAndStroke(lightBlue, borderGray);
  
  doc.fontSize(10).fillColor(darkGray).font("Helvetica-Bold");
  doc.text("Date:", 60, meetingBoxY + 15, { continued: true });
  doc.font("Helvetica").text(` ${data.meetingDate}`);
  
  doc.font("Helvetica-Bold").text("Time:", 60, doc.y + 5, { continued: true });
  doc.font("Helvetica").text(` ${data.meetingTime}`);
  
  doc.font("Helvetica-Bold").text("Location:", 60, doc.y + 5, { continued: true });
  doc.font("Helvetica").text(` ${data.location}`, { width: 420 });
  
  doc.y = meetingBoxY + 90;
  doc.moveDown(1);

  // ============================================================================
  // COMMITTEE MEMBERS & ATTENDEES
  // ============================================================================
  doc.fontSize(12).fillColor(primaryBlue).font("Helvetica-Bold").text("Committee Members & Attendees");
  doc.moveDown(0.5);

  // Attendees table
  const attendeesTableY = doc.y;
  const colWidths = [40, 200, 200, 55];
  const rowHeight = 25;

  // Table header
  doc.rect(50, attendeesTableY, 495, rowHeight).fillAndStroke(primaryBlue, primaryBlue);
  doc.fontSize(10).fillColor("#ffffff").font("Helvetica-Bold");
  doc.text("#", 55, attendeesTableY + 8, { width: colWidths[0], align: "left" });
  doc.text("Name", 95, attendeesTableY + 8, { width: colWidths[1], align: "left" });
  doc.text("Title/Position", 295, attendeesTableY + 8, { width: colWidths[2], align: "left" });
  doc.text("Org", 495, attendeesTableY + 8, { width: colWidths[3], align: "left" });

  let currentY = attendeesTableY + rowHeight;

  // Table rows
  data.attendees.forEach((attendee, index) => {
    const fillColor = index % 2 === 0 ? "#ffffff" : lightGray;
    doc.rect(50, currentY, 495, rowHeight).fillAndStroke(fillColor, borderGray);
    
    doc.fontSize(9).fillColor(darkGray).font("Helvetica");
    doc.text(`${index + 1}`, 55, currentY + 8, { width: colWidths[0], align: "left" });
    doc.text(attendee.name, 95, currentY + 8, { width: colWidths[1], align: "left" });
    doc.text(attendee.title, 295, currentY + 8, { width: colWidths[2], align: "left" });
    doc.text(attendee.organization || "N/A", 495, currentY + 8, { width: colWidths[3], align: "left" });
    
    currentY += rowHeight;
  });

  doc.y = currentY + 10;
  doc.moveDown(1);

  // ============================================================================
  // BIDS RECEIVED (NO PRICES)
  // ============================================================================
  doc.fontSize(12).fillColor(primaryBlue).font("Helvetica-Bold").text("Bids Received");
  doc.fontSize(9).fillColor(darkGray).font("Helvetica-Oblique").text("(Bid amounts are NOT disclosed in the BOM)");
  doc.moveDown(0.5);

  // Bidders table
  const biddersTableY = doc.y;
  const bidderColWidths = [40, 250, 120, 85];

  // Table header
  doc.rect(50, biddersTableY, 495, rowHeight).fillAndStroke(primaryBlue, primaryBlue);
  doc.fontSize(10).fillColor("#ffffff").font("Helvetica-Bold");
  doc.text("#", 55, biddersTableY + 8, { width: bidderColWidths[0], align: "left" });
  doc.text("Bidder Name", 95, biddersTableY + 8, { width: bidderColWidths[1], align: "left" });
  doc.text("Submission Date", 345, biddersTableY + 8, { width: bidderColWidths[2], align: "left" });
  doc.text("Status", 465, biddersTableY + 8, { width: bidderColWidths[3], align: "left" });

  currentY = biddersTableY + rowHeight;

  // Table rows
  data.bidders.forEach((bidder, index) => {
    const fillColor = index % 2 === 0 ? "#ffffff" : lightGray;
    doc.rect(50, currentY, 495, rowHeight).fillAndStroke(fillColor, borderGray);
    
    doc.fontSize(9).fillColor(darkGray).font("Helvetica");
    doc.text(`${index + 1}`, 55, currentY + 8, { width: bidderColWidths[0], align: "left" });
    doc.text(bidder.bidderName, 95, currentY + 8, { width: bidderColWidths[1], align: "left" });
    doc.text(bidder.submissionDate, 345, currentY + 8, { width: bidderColWidths[2], align: "left" });
    doc.text(bidder.status, 465, currentY + 8, { width: bidderColWidths[3], align: "left" });
    
    currentY += rowHeight;
  });

  doc.y = currentY + 10;
  doc.moveDown(1);

  // ============================================================================
  // NOTES & REMARKS
  // ============================================================================
  if (data.notes && data.notes.trim()) {
    doc.fontSize(12).fillColor(primaryBlue).font("Helvetica-Bold").text("Notes & Remarks");
    doc.moveDown(0.5);

    const notesBoxY = doc.y;
    const notesHeight = Math.max(60, Math.min(150, data.notes.length / 3)); // Dynamic height based on content
    doc.rect(50, notesBoxY, 495, notesHeight).fillAndStroke(lightGray, borderGray);
    
    doc.fontSize(9).fillColor(darkGray).font("Helvetica");
    doc.text(data.notes, 60, notesBoxY + 10, { width: 475, align: "left" });
    
    doc.y = notesBoxY + notesHeight + 10;
    doc.moveDown(1);
  }

  // ============================================================================
  // COMMITTEE SIGNATURES
  // ============================================================================
  doc.fontSize(12).fillColor(primaryBlue).font("Helvetica-Bold").text("Committee Signatures");
  doc.fontSize(9).fillColor(darkGray).font("Helvetica-Oblique").text("All committee members present must sign to certify the accuracy of this record.");
  doc.moveDown(0.5);

  // Signatures table
  const signaturesTableY = doc.y;
  const sigColWidths = [40, 200, 200, 55];

  // Table header
  doc.rect(50, signaturesTableY, 495, rowHeight).fillAndStroke(primaryBlue, primaryBlue);
  doc.fontSize(10).fillColor("#ffffff").font("Helvetica-Bold");
  doc.text("#", 55, signaturesTableY + 8, { width: sigColWidths[0], align: "left" });
  doc.text("Name", 95, signaturesTableY + 8, { width: sigColWidths[1], align: "left" });
  doc.text("Title/Position", 295, signaturesTableY + 8, { width: sigColWidths[2], align: "left" });
  doc.text("Date", 495, signaturesTableY + 8, { width: sigColWidths[3], align: "left" });

  currentY = signaturesTableY + rowHeight;

  // Signature rows (with extra space for manual signatures)
  const signatureRowHeight = 40;
  data.signatures.forEach((sig, index) => {
    const fillColor = index % 2 === 0 ? "#ffffff" : lightGray;
    doc.rect(50, currentY, 495, signatureRowHeight).fillAndStroke(fillColor, borderGray);
    
    doc.fontSize(9).fillColor(darkGray).font("Helvetica");
    doc.text(`${index + 1}`, 55, currentY + 15, { width: sigColWidths[0], align: "left" });
    doc.text(sig.name || "_____________________", 95, currentY + 15, { width: sigColWidths[1], align: "left" });
    doc.text(sig.title || "_____________________", 295, currentY + 15, { width: sigColWidths[2], align: "left" });
    doc.text(sig.date || "__________", 495, currentY + 15, { width: sigColWidths[3], align: "left" });
    
    currentY += signatureRowHeight;
  });

  doc.y = currentY + 10;
  doc.moveDown(1);

  // ============================================================================
  // FOOTER
  // ============================================================================
  doc.fontSize(8).fillColor(darkGray).font("Helvetica-Oblique");
  doc.text(
    "This document is an official record of the bid opening ceremony and must be retained for audit purposes.",
    50,
    doc.page.height - 70,
    { align: "center", width: 495 }
  );

  doc.fontSize(7).fillColor(darkGray).text(
    `Generated on ${new Date().toLocaleString()}`,
    50,
    doc.page.height - 50,
    { align: "center", width: 495 }
  );

  // Finalize PDF
  doc.end();
}
