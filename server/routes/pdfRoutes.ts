import express from "express";
import { generateBidEvaluationChecklistExcel } from "../_core/bidEvaluationChecklistExcel";
import { sdk } from "../_core/sdk";

const router = express.Router();

/**
 * GET /api/pdf/bid-analysis/:id/evaluation-checklist-excel
 * Generate and download the Bid Evaluation Checklist as Excel (.xlsx)
 *
 * Query params:
 *   lang  - "en" | "ar"  (default: "en")
 *   mode  - "data" | "template"  (default: "data")
 *
 * Auth: requires valid session cookie + X-Organization-ID header
 * (same as tRPC procedures)
 */
router.get("/bid-analysis/:id/evaluation-checklist-excel", async (req, res) => {
  try {
    const bidAnalysisId = Number(req.params.id);

    if (isNaN(bidAnalysisId) || bidAnalysisId <= 0) {
      return res.status(400).json({ message: "Invalid bid analysis ID" });
    }

    // ── Authenticate request ──────────────────────────────────────────────
    let user: any = null;
    try {
      user = await sdk.authenticateRequest(req as any);
    } catch {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // ── Extract organization scope (same as tRPC context) ─────────────────
    const orgIdHeader = req.headers["x-organization-id"];
    const orgIdQuery  = req.query.orgId as string | undefined;

    const organizationId = orgIdHeader
      ? parseInt(String(orgIdHeader), 10)
      : orgIdQuery
        ? parseInt(orgIdQuery, 10)
        : NaN;

    if (isNaN(organizationId) || organizationId <= 0) {
      return res.status(400).json({
        message: "Missing or invalid organization ID. Send X-Organization-ID header or orgId query param.",
      });
    }

    // ── Parse optional params ─────────────────────────────────────────────
    const lang  = (req.query.lang  as string) === "ar" ? "ar" : "en" : "it";
    const mode  = (req.query.mode  as string) === "template" ? "template" : "data";

    console.log(
      `[Excel Route] bid-analysis=${bidAnalysisId} org=${organizationId} lang=${lang} mode=${mode}`
    );

    // ── Generate Excel ────────────────────────────────────────────────────
    const buffer = await generateBidEvaluationChecklistExcel(
      bidAnalysisId,
      organizationId,
      lang,
      mode
    );

    if (!buffer || buffer.byteLength === 0) {
      return res.status(500).json({ message: "Generated Excel file is empty" });
    }

    const filename =
      mode === "template"
        ? `bid-evaluation-template-${bidAnalysisId}.xlsx`
        : `bid-evaluation-${bidAnalysisId}.xlsx`;

    // ── Send response ─────────────────────────────────────────────────────
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );
    res.setHeader("Content-Length", buffer.byteLength.toString());

    console.log(`[Excel Route] Sending ${buffer.byteLength} bytes as ${filename}`);
    res.send(buffer);

  } catch (error) {
    console.error("[Excel Route] Error:", error);
    res.status(500).json({
      message: "Failed to generate Excel file",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
