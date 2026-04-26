import express from "express";
import puppeteer from "puppeteer";
import { getDb } from "../db";
import { eq } from "drizzle-orm";
import { generatePRHtml } from "../utils/generatePRHtml";
import {
  purchaseRequests,
  purchaseRequestLineItems,
  organizations,
  operatingUnits,
  organizationBranding
} from "../../drizzle/schema";
const router = express.Router();

/**
 * GET /api/pdf/purchase-request/:id
 * Generate and download a Purchase Request PDF
 */
router.get("/purchase-request/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        message: "Invalid purchase request ID",
      });
    }

    // Fetch purchase request with related data
    const db = await getDb();
    const pr = await db.query.purchaseRequests.findFirst({
      where: eq(purchaseRequests.id, id),
    });

    if (!pr) {
      return res.status(404).json({
        message: "Purchase request not found",
      });
    }

    // Fetch organization (if available in your schema)
    // For now, we'll use data from the PR record

    // Generate HTML
    // Fetch line items
  const lineItems = await db.query.purchaseRequestLineItems.findMany({
    where: eq(purchaseRequestLineItems.purchaseRequestId, id),
  });

  // Fetch organization details
  const organization = await db.query.organizations.findFirst({
    where: eq(organizations.id, pr.organizationId),
  });

  // Fetch operating unit details
  const operatingUnit = await db.query.operatingUnits.findFirst({
    where: eq(operatingUnits.id, pr.operatingUnitId),
  });
  // Fetch branding
const branding = await db.query.organizationBranding.findFirst({
  where: eq(
    organizationBranding.organizationId,
    pr.organizationId
  ),
});
  // Generate HTML
  const html = generatePRHtml({
  ...pr,
    lineItems: lineItems.map((item) => ({
      ...item,
      quantity: Number(item.quantity || 0),
      recurrence: Number(item.recurrence || 1),
      unitPrice: Number(item.unitPrice || 0),
      totalPrice: Number(item.totalPrice || 0),
      unit: item.unit || "-",
    })),

    organizationName: organization?.name || "",
    organizationLogo: branding?.logoUrl || "",
    operatingUnitName: operatingUnit?.name || "",
  });

    // Launch Puppeteer with Azure-safe configuration
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    const page = await browser.newPage();

    // Set content and wait for network to be idle
    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    // Generate PDF
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "15mm",
        bottom: "15mm",
        left: "10mm",
        right: "10mm",
      },
    });

    await browser.close();

    // Set response headers for PDF download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="PR-${pr.prNumber}.pdf"`
    );
    res.setHeader("Content-Length", pdf.length);

    // Send PDF
    res.send(pdf);
  } catch (error) {
    console.error("[PDF Generation Error]", error);
    res.status(500).json({
      message: "Failed to generate PDF",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
