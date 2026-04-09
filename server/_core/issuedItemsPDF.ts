import PDFDocument from "pdfkit";
import type { Response } from "express";

interface IssuedItemData {
  issueNumber: string;
  issueDate: string;
  issuedTo: string;
  issuedBy: string;
  department?: string;
  remarks?: string;
  lineItems: Array<{
    itemDescription: string;
    quantityIssued: number;
    unit: string;
  }>;
}

interface OrganizationBranding {
  name: string;
  logo?: string;
  address?: string;
}

export function generateIssuedItemsPDF(
  data: IssuedItemData,
  branding: OrganizationBranding,
  res: Response,
  language: "en" | "ar" = "en"
) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=issued-items-${data.issueNumber}.pdf`);
  doc.pipe(res);

  doc.fontSize(20).font("Helvetica-Bold").text(branding.name, { align: "center" });
  if (branding.address) doc.fontSize(10).font("Helvetica").text(branding.address, { align: "center" });
  doc.moveDown();

  const title = language === "ar" ? "سند صرف أصناف" : "Stock Issue Voucher";
  doc.fontSize(16).font("Helvetica-Bold").text(title, { align: "center", underline: true });
  doc.moveDown();

  const labels = {
    issueNumber: language === "ar" ? "رقم السند" : "Issue Number",
    issueDate: language === "ar" ? "التاريخ" : "Issue Date",
    issuedTo: language === "ar" ? "صرف إلى" : "Issued To",
    issuedBy: language === "ar" ? "صرف بواسطة" : "Issued By",
    department: language === "ar" ? "القسم" : "Department",
    item: language === "ar" ? "الصنف" : "Item",
    quantity: language === "ar" ? "الكمية" : "Quantity",
    unit: language === "ar" ? "الوحدة" : "Unit",
  };

  doc.fontSize(11).font("Helvetica");
  doc.text(`${labels.issueNumber}: ${data.issueNumber}`);
  doc.text(`${labels.issueDate}: ${data.issueDate}`);
  doc.text(`${labels.issuedTo}: ${data.issuedTo}`);
  doc.text(`${labels.issuedBy}: ${data.issuedBy}`);
  if (data.department) doc.text(`${labels.department}: ${data.department}`);
  doc.moveDown();

  const tableTop = doc.y;
  doc.fontSize(11).font("Helvetica-Bold");
  doc.text(labels.item, 50, tableTop);
  doc.text(labels.quantity, 350, tableTop);
  doc.text(labels.unit, 450, tableTop);
  doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

  let currentY = tableTop + 25;
  doc.fontSize(10).font("Helvetica");
  data.lineItems.forEach((item) => {
    doc.text(item.itemDescription, 50, currentY, { width: 280 });
    doc.text(item.quantityIssued.toString(), 350, currentY);
    doc.text(item.unit, 450, currentY);
    currentY += 25;
  });

  doc.moveTo(50, currentY).lineTo(550, currentY).stroke();
  if (data.remarks) {
    doc.moveDown();
    doc.fontSize(10).font("Helvetica-Bold").text("Remarks:");
    doc.fontSize(10).font("Helvetica").text(data.remarks);
  }

  doc.fontSize(8).text(`Generated: ${new Date().toISOString()}`, 50, 750, { align: "center" });
  doc.end();
}
