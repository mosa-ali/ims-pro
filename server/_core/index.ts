 import "dotenv/config";
// json-patch.ts now exports scoped utilities instead of patching globals
// Import safeDateReplacer/safeStringify where needed

import fs from 'node:fs';
import path from 'node:path';
import compression from "compression";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { microsoftOAuthCallbackRouter } from "./microsoft-oauth-callback";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./static";
import { healthRouter } from "./health";
import { startOutboxWorker } from "../services/outboxWorker";
import { startAutoPurgeJob } from "../services/autoPurgeJob";
import { emailQueueWorker } from "../services/emailQueueWorker";
import { initializeSchedulers } from "../schedulers/index";
import { scheduleAuditLogRetentionCleanup } from "../jobs/auditLogRetentionCleanup";
import { isNull } from "drizzle-orm";
import { mockAuthMiddleware, handleMockLogin, handleMockLogout } from "./mock-auth";
import { ENV } from "./env";
import { getSessionCookieOptions } from "../_core/cookies";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 8181): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Enable gzip compression for all responses
  app.use(compression({
    level: 6, // Balanced compression level (1-9)
    threshold: 1024, // Only compress responses > 1KB
    filter: (req, res) => {
      // Compress all compressible content types
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // Health check endpoints (must be before auth to allow monitoring)
  app.use("/health", healthRouter);
  
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  
  // Microsoft OAuth callback for tenant connection
  app.use(microsoftOAuthCallbackRouter);
  
  // Microsoft admin consent callback
  const microsoftAdminConsentCallback = await import("../routes/microsoftAdminConsentCallback");
  app.use("/api/auth/microsoft/admin-consent", microsoftAdminConsentCallback.default);
  
  // Public onboarding endpoint (no auth required)
  const { handlePublicOnboardingLink } = await import("./onboardingEndpoint");
  app.get("/api/auth/microsoft/onboarding/:token", handlePublicOnboardingLink);

  // ─── Mock Auth (local development only) ────────────────────────────────────
  // Auto-injects a session cookie when MOCK_AUTH=true and not in production.
  // This allows the system to run without any external OAuth provider.
  app.use(mockAuthMiddleware);

  // Mock auth explicit login/logout endpoints (only active when MOCK_AUTH=true)
  if (ENV.MOCK_AUTH && !ENV.isProduction) {
    app.post("/api/auth/mock/login", handleMockLogin);
    app.post("/api/auth/mock/logout", handleMockLogout);
    console.log("[Mock Auth] Mock auth endpoints registered: POST /api/auth/mock/login, POST /api/auth/mock/logout");
  }

    // ─── Email/Password Sign-In endpoint ────────────────────────────────────────
// Authenticates user with email and password, creates session cookie
app.post("/api/auth/email-signin", express.json(), async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    const { EmailPasswordAuthService } = await import("../services/auth/emailPasswordAuthService");

    // ✅ FIX: correct destructuring
    const authResult = await EmailPasswordAuthService.authenticateUser(email, password);

    if (!authResult.success || !authResult.user) {
      res.status(401).json({
        message: authResult.error || "Invalid email or password",
      });
      return;
    }

    const user = authResult.user;

    // 🚨 CRITICAL: block invalid users (prevents NULL records)
    if (!user.email) {
      console.error("[Auth] BLOCKED: user has no email", user);
      res.status(400).json({
        message: "User account is invalid (missing email)",
      });
      return;
    }

    // Normalize data
    const emailNormalized = user.email.toLowerCase().trim();
    const displayName = user.name?.trim() || emailNormalized;

    // Create session token using SDK (same as OAuth)
    const { sdk } = await import("./sdk");
    const { COOKIE_NAME, ONE_YEAR_MS } = await import("@shared/const");
    const dbModule = await import("../db");

    // Generate a stable openId for email-auth users
    const stableOpenId = `email-${emailNormalized.replace(/[^a-z0-9]/g, "-")}`;
    const nowSql = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // ✅ FIX: safe upsert (NO NULL values)
    await dbModule.upsertUser({
      openId: stableOpenId,
      name: displayName,
      email: emailNormalized, // 🚨 NEVER NULL
      loginMethod: "email",
      lastSignedIn: nowSql,
    });

    const sessionToken = await sdk.createSessionToken(stableOpenId, {
      name: displayName,
    });
    
      // Set session cookie
      const cookieOptions = getSessionCookieOptions(req);

      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
      });

      res.json({ success: true, user });
    } catch (error: any) {
      console.error("[Email Sign-In] Error:", error.message);
      res.status(401).json({ message: error.message || "Authentication failed" });
    }
  });

  // ─── Request Access endpoint ────────────────────────────────────────────────
  // Handles access request form submissions from the Sign-In page
  app.post("/api/auth/request-access", express.json(), async (req, res) => {
    try {
      const { fullName, workEmail, requestType, authProvider, accountType, organization, operatingUnit, jobTitle, reasonForAccess, phoneNumber, organizationId, operatingUnitId } = req.body;

      // Basic validation
      if (!fullName || !workEmail || !requestType || !authProvider || !accountType || !jobTitle || !reasonForAccess) {
        res.status(400).json({ message: "All required fields must be filled" });
        return;
      }

      // For organization users, organization and operatingUnit are required
      if (requestType === 'organization_user' && (!organization || !operatingUnit)) {
        res.status(400).json({ message: "Organization and Operating Unit are required for organization user requests" });
        return;
      }

      // Validate requestType and authProvider values
      if (!['organization_user', 'platform_admin'].includes(requestType)) {
        res.status(400).json({ message: "Invalid request type" });
        return;
      }
      if (!['microsoft', 'local'].includes(authProvider)) {
        res.status(400).json({ message: "Invalid authentication provider" });
        return;
      }
      if (!['personal', 'shared'].includes(accountType)) {
        res.status(400).json({ message: "Invalid account type" });
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(workEmail)) {
        res.status(400).json({ message: "Invalid email address" });
        return;
      }

      const dbModule = await import("../db");
      const db = await dbModule.getDb();
      const { requestAccessRequests } = await import("../../drizzle/schema");
      const { eq, and, isNull } = await import("drizzle-orm");

      // Check for duplicate requests within 24 hours
      const existingRequest = await db
        .select()
        .from(requestAccessRequests)
        .where(and(eq(requestAccessRequests.email, workEmail), isNull(requestAccessRequests.deletedAt)))
        .limit(1);

      if (existingRequest.length > 0) {
        const lastRequest = new Date(existingRequest[0].createdAt);
        const hoursSince = (Date.now() - lastRequest.getTime()) / (1000 * 60 * 60);
        if (hoursSince < 24) {
          res.status(409).json({ message: "You have already submitted a request recently. Please wait 24 hours before submitting again." });
          return;
        }
      }

      // Determine the requested role based on request type
      let requestedRole = 'user';
      if (requestType === 'platform_admin') {
        requestedRole = 'platform_admin';
      }

      // Determine provisioning mode based on request type and auth provider
      let provisioningMode = null;
      if (requestType === 'platform_admin' && authProvider === 'microsoft') {
        provisioningMode = 'microsoft_mapping_only';
      } else if (requestType === 'platform_admin' && authProvider === 'local') {
        provisioningMode = 'local_account_created';
      }

      // Insert request access record
      await db.insert(requestAccessRequests).values({
        id: `RAR-${Date.now()}`,
        fullName,
        email: workEmail,
        organizationName: organization || null,
        operatingUnitName: operatingUnit || null,
        jobTitle,
        reasonForAccess,
        phoneNumber: phoneNumber || null,
        organizationId: organizationId || null,
        operatingUnitId: operatingUnitId || null,
        requestType,
        requestedAuthProvider: authProvider,
        requestedAccountType: accountType,
        requestedRole,
        provisioningMode,
        status: 'new',
        createdAt: new Date(),
        createdBy: 'system',
        updatedAt: new Date(),
        updatedBy: 'system',
        deletedAt: null,
        deletedBy: null,
        reviewDecision: null,
        reviewedBy: null,
        reviewedAt: null,
        reviewNotes: null,
        reviewComments: null,
        routedToUserId: null,
        routedToRole: null,
        routedAt: null,
        fallbackToPlatformAdmin: 0,
        provisionedUserId: null,
        provisionedAt: null,
      });

      console.log(`[Request Access] New request from: ${workEmail}`);
      res.json({ success: true, message: "Access request submitted successfully" });
    } catch (error: any) {
      console.error("[Request Access] Error:", error.message);
      res.status(500).json({ message: error.message || "Failed to submit request" });
    }
  });

  // ─── Microsoft OAuth status endpoint ───────────────────────────────────────
  // Returns whether Microsoft OAuth is configured, so the frontend can show/hide
  // the Microsoft Sign-In button gracefully without requiring a redirect.
  app.get("/api/auth/microsoft/status", async (req, res) => {
    const { ENV: envConfig } = await import("./env");
    const configured = !!(envConfig.MS_CLIENT_ID && envConfig.MS_TENANT_ID && envConfig.MS_CLIENT_SECRET && envConfig.MS_REDIRECT_URI);
    res.json({ configured });
  });

  // ─── Microsoft OAuth start endpoint ────────────────────────────────────────
  // Redirects to Microsoft OAuth authorization URL for Microsoft 365 login.
  app.get("/api/auth/microsoft/start", async (req, res) => {
    try {
      const { ENV: envConfig } = await import("./env");
      const tenantId = envConfig.MS_TENANT_ID || "common";
      const clientId = envConfig.MS_CLIENT_ID;
      const redirectUri = envConfig.MS_REDIRECT_URI || `${req.protocol}://${req.get("host")}/api/oauth/microsoft/callback`;
      if (!clientId) {
        res.status(503).json({ error: "Microsoft OAuth not configured (MS_CLIENT_ID missing)" });
        return;
      }
      const state = Math.random().toString(36).substring(2);
      const nonce = Math.random().toString(36).substring(2);
      const params = new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        redirect_uri: redirectUri,
        response_mode: "query",
        scope: "openid profile email User.Read",
        state,
        nonce,
      });
      const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
      res.redirect(authUrl);
    } catch (err) {
      console.error("[Microsoft OAuth] Failed to start auth flow:", err);
      res.status(500).json({ error: "Failed to start Microsoft OAuth flow" });
    }
  });

  // File upload endpoint for quotation attachments
  app.post("/api/upload", express.raw({ type: "application/octet-stream", limit: "50mb" }), async (req, res) => {
    try {
      const { storagePut } = await import("../storage");
      const { nanoid } = await import("nanoid");
      
      // Get file from request
      const fileBuffer = req.body;
      const contentType = req.headers["content-type"] || "application/octet-stream";
      const filename = req.headers["x-filename"] as string || `upload-${nanoid()}`;
      
      // Upload to S3
      const fileKey = `quotations/${nanoid()}-${filename}`;
      const { url } = await storagePut(fileKey, fileBuffer, contentType);
      
      res.json({ url, key: fileKey });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "File upload failed" });
    }
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  
  // PDF Export Routes
  app.get("/api/logistics/issued/:id/pdf", async (req, res) => {
    try {
      const { generateIssuedItemsPDF } = await import("./issuedItemsPDF");
      const { getDb } = await import("../db");
      const db = await getDb();
      const { stockIssued, stockIssuedLineItems, stockItems } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      const id = parseInt(req.params.id);
      const issued = await db.select().from(stockIssued).where(eq(stockIssued.id, id)).limit(1);
      if (!issued.length) return res.status(404).json({ error: "Issued item not found" });
      
      const lineItems = await db.select({
        itemDescription: stockItems.itemName,
        quantityIssued: stockIssuedLineItems.issuedQty,
        unit: stockItems.unitType,
      }).from(stockIssuedLineItems)
        .leftJoin(stockItems, eq(stockIssuedLineItems.stockItemId, stockItems.id))
        .where(eq(stockIssuedLineItems.stockIssuedId, id));
      
      const data = {
        issueNumber: issued[0].issueNumber || "",
        issueDate: issued[0].issueDate?.toString().split("T")[0] || "",
        issuedTo: issued[0].issuedTo || "",
        issuedBy: issued[0].issuedBy || "",
        department: issued[0].department || undefined,
        remarks: issued[0].remarks || undefined,
        lineItems: lineItems.map((item: any) => ({
          itemDescription: item.itemDescription || "",
          quantityIssued: Number(item.quantityIssued) || 0,
          unit: item.unit || "",
        })),
      };
      
      const branding = { name: process.env.OWNER_NAME || 'Organization', address: '' };
      const language = req.query.lang === 'ar' ? 'ar' : 'en';
      generateIssuedItemsPDF(data, branding, res, language);
    } catch (error) {
      console.error('PDF generation error:', error);
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  });
  
  // Bid Receipt Acknowledgement PDF Route
  app.get("/api/logistics/bid-analysis/:baId/bidder/:bidderId/acknowledgement-pdf", async (req, res) => {
    try {
      const { generateBidReceiptAcknowledgementPDF } = await import("./bidReceiptAcknowledgementPDF");
      const { getDb } = await import("../db");
      const { bidAnalyses, bidAnalysisBidders } = await import("../../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      
      const baId = parseInt(req.params.baId);
      const bidderId = parseInt(req.params.bidderId);
      const language = (req.query.lang as "en" | "ar") || "en";
      
      // Get organization ID from query parameter (passed from frontend)
      const ctx = (req as any).ctx;

        if (!ctx?.scope?.organizationId) {
          return res.status(403).json({ error: "Missing organization scope" });
        }

        const organizationId = ctx.scope.organizationId;
      
      const db = await getDb();
      
      // Verify BA exists
      const [ba] = await db.select()
        .from(bidAnalyses)
        .where(and(
          eq(bidAnalyses.id, baId),
          eq(bidAnalyses.organizationId, organizationId)
        ))
        .limit(1);
      
      if (!ba) {
        return res.status(404).json({ error: "Bid Analysis not found" });
      }
      
      // Verify bidder exists
      const [bidder] = await db.select()
        .from(bidAnalysisBidders)
        .where(and(
          eq(bidAnalysisBidders.id, bidderId),
          eq(bidAnalysisBidders.bidAnalysisId, baId)
        ))
        .limit(1);
      
      if (!bidder) {
        return res.status(404).json({ error: "Bidder not found" });
      }
      
      // Generate PDF
      const pdfBuffer = await generateBidReceiptAcknowledgementPDF(
        baId,
        bidderId,
        organizationId,
        language
      );
      
      // Mark acknowledgement as printed
      const nowSql = new Date()
  .toLocaleString("sv-SE")
  .replace("T", " ");
      await db.update(bidAnalysisBidders)
        .set({
          bidReceiptAcknowledgementPrinted: 1,
          acknowledgementPrintedAt: nowSql,
          // acknowledgementPrintedBy: userId, // TODO: Get from authenticated user
        })
        .where(eq(bidAnalysisBidders.id, bidderId));
      
      // Send PDF
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Length", pdfBuffer.length);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="Bid_Receipt_Acknowledgement_${(bidder.bidderName || "Bidder").replace(/\s+/g, "_")}.pdf"`
      );
      res.end(pdfBuffer);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : '';
      console.error("PDF generation error:", errorMsg);
      console.error("Stack:", stack);
      res.status(500).json({ error: `Failed to generate PDF: ${errorMsg}` });
    }
  });

  // CBA (Competitive Bid Analysis) PDF Route
  app.get("/api/logistics/bid-analysis/:id/cba-pdf", async (req, res) => {
    try {
      const { generateCBAPDF } = await import("./cbaPDF");
      const baId = parseInt(req.params.id);
      if (isNaN(baId)) {
        return res.status(400).json({ error: "Invalid bid analysis ID" });
      }
      const language = (req.query.lang as "en" | "ar") || "en";
      const orgIdRaw = req.query.orgId as string;
      const ctx = (req as any).ctx;
      if (!ctx?.scope?.organizationId) {
        return res.status(403).json({ error: "Missing organization scope" });
      }
      const organizationId = ctx.scope.organizationId;
   
      const pdfBuffer = await generateCBAPDF(baId, organizationId, language);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Length", pdfBuffer.length);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="CBA_${baId}.pdf"`
      );
      res.end(pdfBuffer);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("CBA PDF generation error:", errorMsg);
      res.status(500).json({ error: "Failed to generate CBA PDF", details: errorMsg });
    }
  });

  // SAC (Service Acceptance Certificate) PDF Route
  app.get("/api/logistics/sac/:id/pdf", async (req, res) => {
    try {
      const { generateSACPDF } = await import("./sacPDF");
      const sacId = parseInt(req.params.id);
      if (isNaN(sacId)) {
        return res.status(400).json({ error: "Invalid SAC ID" });
      }
      const language = (req.query.lang as "en" | "ar") || "en";
      const ctx = (req as any).ctx;

        if (!ctx?.scope?.organizationId) {
          return res.status(403).json({ error: "Missing organization scope" });
        }

        const organizationId = ctx.scope.organizationId;
      const pdfBuffer = await generateSACPDF(sacId, organizationId, language);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Length", pdfBuffer.length);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="SAC_${sacId}.pdf"`
      );
      res.end(pdfBuffer);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("SAC PDF generation error:", errorMsg);
      res.status(500).json({ error: "Failed to generate SAC PDF", details: errorMsg });
    }
  });

  // QA (Quotation Analysis) PDF Route — Puppeteer + HTML (matches CBA approach)
  app.get("/api/logistics/quotation-analysis/:id/qa-pdf", async (req, res) => {
    try {
      const { generateQAPDF } = await import("./qaPDF");
      const qaId = parseInt(req.params.id);
      if (isNaN(qaId)) {
        return res.status(400).json({ error: "Invalid QA ID" });
      }
      const language = (req.query.lang as "en" | "ar") || "en";
      const orgIdRaw = req.query.orgId as string;
      const ctx = (req as any).ctx;

      if (!ctx?.scope?.organizationId) {
        return res.status(403).json({ error: "Missing organization scope" });
      }

      const organizationId = ctx.scope.organizationId;
      const pdfBuffer = await generateQAPDF(qaId, organizationId, language);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Length", pdfBuffer.length);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="QA_${qaId}.pdf"`
      );
      res.end(pdfBuffer);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("QA PDF generation error:", errorMsg);
      res.status(500).json({ error: "Failed to generate QA PDF", details: errorMsg });
    }
  });

  // BOM (Bid Opening Minutes) PDF Route
  app.get("/api/logistics/bid-analysis/:id/bom-pdf", async (req, res) => {
    try {
      const { generateBOMPDF } = await import("./bomPDF");
      const { getDb } = await import("../db");
      const { bidAnalyses, bidAnalysisBidders } = await import("../../drizzle/schema");
      const { eq, and, isNull } = await import("drizzle-orm");
      
      const baId = parseInt(req.params.id);
      
      // Get organization ID from session/context (simplified for now)
      const ctx = (req as any).ctx;
        if (!ctx?.scope?.organizationId) {
          return res.status(403).json({ error: "Missing organization scope" });
        }

        const organizationId = ctx.scope.organizationId;
        const operatingUnitId = ctx.scope.operatingUnitId;
      const db = await getDb();
      
      // Fetch BA
      const [ba] = await db.select()
        .from(bidAnalyses)
        .where(and(
          eq(bidAnalyses.id, baId),
          eq(bidAnalyses.organizationId, organizationId),
          eq(bidAnalyses.operatingUnitId, operatingUnitId),
          isNull(bidAnalyses.deletedAt)
        ))
        .limit(1);
      
      if (!ba) {
        return res.status(404).json({ error: "Bid Analysis not found" });
      }
      
      // Check if BOM is completed
      if (!ba.bomCompleted) {
        return res.status(400).json({ error: "Bid Opening Minutes not yet completed" });
      }
      
        // Fetch bidders
        const bidders = await db.select()
          .from(bidAnalysisBidders)
          .where(and(
            eq(bidAnalysisBidders.bidAnalysisId, baId),
          ));
      
      // Fetch organization details
      const { organizations, organizationBranding } = await import("../../drizzle/schema");
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId));

      const [branding] = await db
        .select()
        .from(organizationBranding)
        .where(eq(organizationBranding.organizationId, organizationId));

      // Parse BOM data
      const attendees = ba.bomAttendees ? JSON.parse(ba.bomAttendees) : [];
      const signatures = ba.bomSignatures ? JSON.parse(ba.bomSignatures) : [];
      
      // Prepare PDF data
      // ✅ FIX #5: Fixed prNumber type - convert to string if needed
      const pdfData = {
        organizationName: org?.name || "Organization",
        organizationLogo: branding?.logoUrl || undefined,
        prNumber: String(ba.purchaseRequestId || `PR-${ba.purchaseRequestId}`),
        tenderReference: ba.announcementReference || "",
        cbaNumber: ba.cbaNumber || `CBA-${ba.id}`,
        meetingDate: ba.bomMeetingDate || "",
        meetingTime: ba.bomMeetingTime || "",
        location: ba.bomLocation || "",
        attendees,
        bidders: bidders.map((b) => ({
          bidderName: b.bidderName || "Unknown",
          submissionDate: b.submissionDate ? new Date(b.submissionDate).toLocaleDateString() : "N/A",
          status: b.submissionStatus || "Received",
        })),
        notes: ba.bomNotes || "",
        signatures,
      };
      
      // Generate PDF
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="BOM_${ba.cbaNumber || ba.id}.pdf"`
      );
      
      generateBOMPDF(pdfData, res);
    } catch (error) {
      console.error("BOM PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate BOM PDF" });
    }
  });

  // ── Bid Evaluation Checklist PDF ──────────────────────────────────────
  app.get("/api/logistics/bid-analysis/:id/evaluation-checklist-pdf", async (req, res) => {
    try {
      const { generateBidEvaluationChecklistPDF } = await import("./bidEvaluationChecklistPDF");
      const baId = parseInt(req.params.id);
      const language = (req.query.lang as "en" | "ar") || "en";
      const ctx = (req as any).ctx;

        if (!ctx?.scope?.organizationId) {
          return res.status(403).json({ error: "Missing organization scope" });
        }

        const organizationId = ctx.scope.organizationId;
      const pdfBuffer = await generateBidEvaluationChecklistPDF(baId, organizationId, language);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Length", pdfBuffer.length);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="Bid_Evaluation_Checklist_${baId}.pdf"`
      );
      res.end(pdfBuffer);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("Bid Evaluation Checklist PDF error:", errorMsg);
      res.status(500).json({ error: "Failed to generate Bid Evaluation Checklist PDF", details: errorMsg });
    }
  });

  // ── Bid Evaluation Checklist Excel Export ──────────────────────────────
  app.get("/api/logistics/bid-analysis/:id/evaluation-checklist-excel", async (req, res) => {
    try {
      const { generateBidEvaluationChecklistExcel } = await import("./bidEvaluationChecklistExcel");
      const baId = parseInt(req.params.id);
      const language = (req.query.lang as "en" | "ar") || "en";
      const ctx = (req as any).ctx;
        if (!ctx?.scope?.organizationId) {
          return res.status(403).json({ error: "Missing organization scope" });
        }

        const organizationId = ctx.scope.organizationId;
      const mode = (req.query.mode as "template" | "data") || "data";

      const buffer = await generateBidEvaluationChecklistExcel(baId, organizationId, language, mode);

      const suffix = mode === "template" ? "Template" : "Data";
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Length", buffer.length);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="Bid_Evaluation_Checklist_${suffix}_${baId}.xlsx"`
      );
      res.end(buffer);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("Bid Evaluation Checklist Excel error:", errorMsg);
      res.status(500).json({ error: "Failed to generate Excel", details: errorMsg });
    }
  });

  app.get("/api/logistics/returns/:id/pdf", async (req, res) => {
    try {
        const { generateReturnedItemsPDF } = await import("./returnedItemsPDF");
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) return res.status(500).json({ error: "Database not available" });
      const { returnedItems, returnedItemLineItems, stockItems } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      const id = parseInt(req.params.id);
      const returned = await db.select().from(returnedItems).where(eq(returnedItems.id, id)).limit(1);
      if (!returned.length) return res.status(404).json({ error: "Returned item not found" });
      
      const lineItems = await db.select({
        itemDescription: stockItems.itemName,
        quantityReturned: returnedItemLineItems.returnedQty,
        acceptedQuantity: returnedItemLineItems.acceptedQty,
        condition: returnedItemLineItems.condition,
        unit: stockItems.unitType,
      }).from(returnedItemLineItems)
        .leftJoin(stockItems, eq(returnedItemLineItems.stockItemId, stockItems.id))
        .where(eq(returnedItemLineItems.returnedItemId, id));
      
      const data = {
          returnNumber: returned[0].returnNumber || "",
          returnDate: returned[0].returnDate?.toString().split("T")[0] || "",
          returnedBy: returned[0].returnedBy || "",
          inspectedBy: returned[0].inspectedBy || undefined,
          department: returned[0].department || undefined,
          reason: returned[0].reason || undefined,
          remarks: returned[0].remarks || undefined,
          lineItems: lineItems.map((item: any) => ({
            itemDescription: item.itemDescription || "",
            quantityReturned: Number(item.quantityReturned) || 0,
            acceptedQuantity: Number(item.acceptedQuantity) || 0,
            condition: item.condition || "good",
            unit: item.unit || "",
          })),
        };
      
      const branding = { name: process.env.OWNER_NAME || 'Organization', address: '' };
      const language = req.query.lang === 'ar' ? 'ar' : 'en';
      generateReturnedItemsPDF(data, branding, res, language);
    } catch (error) {
      console.error('PDF generation error:', error);
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  });
  // ─── Local uploads static serving ─────────────────────────────────────────
  // When BUILT_IN_FORGE_API_URL is not set (local dev), serve uploaded files
  // from the ./uploads/ directory so file URLs resolve correctly.
  if (!process.env.BUILT_IN_FORGE_API_URL) {
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    app.use('/uploads', express.static(uploadsDir));
    console.log(`[Local Storage] Serving uploads from: ${uploadsDir}`);
  }

    // development mode uses Vite, production mode uses static files
      if (!ENV.isProduction) {
        const { setupVite } = await import("./vite");
        await setupVite(app, server);
      } else {
        serveStatic(app);
      }

  const preferredPort = parseInt(process.env.PORT || "4000", 10);
  const port = ENV.isProduction
    ? preferredPort
    : await findAvailablePort(preferredPort);

  if (!ENV.isProduction && port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port}`);

    startOutboxWorker();
    startAutoPurgeJob();
    emailQueueWorker.start();
    initializeSchedulers();
    scheduleAuditLogRetentionCleanup();
  });
}

startServer().catch(console.error);