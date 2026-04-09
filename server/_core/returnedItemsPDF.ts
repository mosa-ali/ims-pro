import PDFDocument from "pdfkit";
import type { Response } from "express";

interface ReturnedItemData {
  returnNumber: string;
  returnDate: string;
  returnedBy: string;
  inspectedBy?: string;
  department?: string;
  reason?: string;
  remarks?: string;
  lineItems: Array<{
    itemDescription: string;
    quantityReturned: number;
    acceptedQuantity?: number;
    condition: string;
    unit: string;
  }>;
}

interface OrganizationBranding {
  name: string;
  logo?: string;
  address?: string;
}

export function generateReturnedItemsPDF(
  data: ReturnedItemData,
  branding: OrganizationBranding,
  res: Response,
  language: "en" | "ar" = "en"
) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=returned-items-${data.returnNumber}.pdf`);
  doc.pipe(res);

  doc.fontSize(20).font("Helvetica-Bold").text(branding.name, { align: "center" });
  if (branding.address) doc.fontSize(10).font("Helvetica").text(branding.address, { align: "center" });
  doc.moveDown();

  const title = language === "ar" ? "سند إرجاع أصناف" : "Stock Return Receipt";
  doc.fontSize(16).font("Helvetica-Bold").text(title, { align: "center", underline: true });
  doc.moveDown();

  const labels = {
    returnNumber: language === "ar" ? "رقم السند" : "Return Number",
    returnDate: language === "ar" ? "التاريخ" : "Return Date",
    returnedBy: language === "ar" ? "أرجع بواسطة" : "Returned By",
    inspectedBy: language === "ar" ? "فحص بواسطة" : "Inspected By",
    department: language === "ar" ? "القسم" : "Department",
    reason: language === "ar" ? "السبب" : "Reason",
    item: language === "ar" ? "الصنف" : "Item",
    quantity: language === "ar" ? "الكمية" : "Quantity",
    accepted: language === "ar" ? "المقبول" : "Accepted",
    condition: language === "ar" ? "الحالة" : "Condition",
    unit: language === "ar" ? "الوحدة" : "Unit",
  };

  doc.fontSize(11).font("Helvetica");
  doc.text(`${labels.returnNumber}: ${data.returnNumber}`);
  doc.text(`${labels.returnDate}: ${data.returnDate}`);
  doc.text(`${labels.returnedBy}: ${data.returnedBy}`);
  if (data.inspectedBy) doc.text(`${labels.inspectedBy}: ${data.inspectedBy}`);
  if (data.department) doc.text(`${labels.department}: ${data.department}`);
  if (data.reason) doc.text(`${labels.reason}: ${data.reason}`);
  doc.moveDown();

  const tableTop = doc.y;
  doc.fontSize(10).font("Helvetica-Bold");
  doc.text(labels.item, 50, tableTop);
  doc.text(labels.quantity, 280, tableTop);
  doc.text(labels.accepted, 350, tableTop);
  doc.text(labels.condition, 420, tableTop);
  doc.text(labels.unit, 500, tableTop);
  doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

  let currentY = tableTop + 25;
  doc.fontSize(9).font("Helvetica");
  data.lineItems.forEach((item) => {
    doc.text(item.itemDescription, 50, currentY, { width: 210 });
    doc.text(item.quantityReturned.toString(), 280, currentY);
    doc.text(item.acceptedQuantity?.toString() || "-", 350, currentY);
    doc.text(item.condition, 420, currentY);
    doc.text(item.unit, 500, currentY);
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
