import { PDFDocument, PDFPage, rgb } from "pdf-lib";
import { getDb } from "../db";
import { purchaseRequests, purchaseOrders, goodsReceiptNotes, deliveryNotes, payments } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Generate PDF document for PR workflow
 */
export async function generatePRDocument(
  pr: any,
  documentType: "PR" | "RFQ" | "PO" | "GRN" | "DELIVERY" | "PAYMENT",
  organizationId: number
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size
  const { width, height } = page.getSize();

  const fontSize = 12;
  const margin = 50;
  const lineHeight = 20;

  let y = height - margin;

  // Helper function to draw text
  const drawText = (text: string, size: number = fontSize, bold: boolean = false) => {
    page.drawText(text, {
      x: margin,
      y,
      size,
      color: rgb(0, 0, 0),
    });
    y -= lineHeight;
  };

  // Helper function to draw section header
  const drawHeader = (text: string) => {
    y -= 10;
    page.drawText(text, {
      x: margin,
      y,
      size: 14,
      color: rgb(0, 51, 102),
    });
    y -= lineHeight + 5;
  };

  // Document header
  drawText("PROCUREMENT DOCUMENT", 16, true);
  drawText(`Document Type: ${documentType}`, 12, true);
  y -= 10;

  // PR Information
  drawHeader("Purchase Request Details");
  drawText(`PR Number: ${pr.prNumber}`);
  drawText(`PR Date: ${new Date(pr.createdAt).toLocaleDateString()}`);
  drawText(`Project ID: ${pr.projectId || "N/A"}`);
  drawText(`Status: ${pr.status}`);
  drawText(`Total Cost: ${pr.totalCost || 0}`);
  drawText(`Currency: ${pr.currency || "USD"}`);
  y -= 10;

  // Requester Information
  drawHeader("Requester Information");
  drawText(`Requester: ${pr.requestedBy || "N/A"}`);
  drawText(`Department: ${pr.department || "N/A"}`);
  drawText(`Description: ${pr.description || "N/A"}`);
  y -= 10;

  // Document-specific information
  if (documentType === "RFQ") {
    drawHeader("Request for Quotation");
    drawText("RFQ Status: Pending Vendor Responses");
    drawText("Expected Response Date: Within 7 days");
  } else if (documentType === "PO") {
    drawHeader("Purchase Order");
    drawText("PO Status: Pending Vendor Confirmation");
    drawText("Delivery Terms: As per agreement");
  } else if (documentType === "GRN") {
    drawHeader("Goods Receipt Note");
    drawText("GRN Status: Pending Verification");
    drawText("Received Items: As per PO");
  } else if (documentType === "DELIVERY") {
    drawHeader("Delivery Note");
    drawText("Delivery Status: Pending Acceptance");
    drawText("Delivery Date: As per schedule");
  } else if (documentType === "PAYMENT") {
    drawHeader("Payment Document");
    drawText("Payment Status: Pending Processing");
    drawText("Payment Terms: As per contract");
  }

  y -= 10;

  // Footer
  y = 50;
  page.drawText(`Generated on: ${new Date().toLocaleString()}`, {
    x: margin,
    y,
    size: 10,
    color: rgb(128, 128, 128),
  });

  page.drawText(`Organization ID: ${organizationId}`, {
    x: width - margin - 150,
    y,
    size: 10,
    color: rgb(128, 128, 128),
  });

  // Convert to buffer
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Generate comprehensive PR package with all documents
 */
export async function generatePRPackage(prId: number, organizationId: number): Promise<Buffer[]> {
  const documentTypes: Array<"PR" | "RFQ" | "PO" | "GRN" | "DELIVERY" | "PAYMENT"> = [
    "PR",
    "RFQ",
    "PO",
    "GRN",
    "DELIVERY",
    "PAYMENT",
  ];

  const db = await getDb();

  // Get PR details
  const pr = await db
    .select()
    .from(purchaseRequests)
    .where(eq(purchaseRequests.id, prId))
    .then((rows) => rows[0]);

  if (!pr) {
    throw new Error("Purchase request not found");
  }

  const pdfs: Buffer[] = [];

  for (const docType of documentTypes) {
    try {
      const pdf = await generatePRDocument(pr, docType, organizationId);
      pdfs.push(pdf);
    } catch (error) {
      console.error(`Error generating ${docType} document:`, error);
    }
  }

  return pdfs;
}
