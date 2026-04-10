// Production-only server entry point
// This file is used when bundling for production
// It contains NO vite imports or development-only code

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
import { healthRouter } from "./health";
import { startOutboxWorker } from "../services/outboxWorker";
import { startAutoPurgeJob } from "../services/autoPurgeJob";
import { emailQueueWorker } from "../services/emailQueueWorker";
import { initializeSchedulers } from "../schedulers/index";
import { scheduleAuditLogRetentionCleanup } from "../jobs/auditLogRetentionCleanup";
import { isNull } from "drizzle-orm";
import { mockAuthMiddleware, handleMockLogin, handleMockLogout } from "./mock-auth";
import { ENV } from "./env";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
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
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
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
  app.use(mockAuthMiddleware);

  if (ENV.MOCK_AUTH && !ENV.isProduction) {
    app.post("/api/auth/mock/login", handleMockLogin);
    app.post("/api/auth/mock/logout", handleMockLogout);
    console.log("[Mock Auth] Mock auth endpoints registered");
  }

  // ─── Email/Password Sign-In endpoint ────────────────────────────────────────
  app.post("/api/auth/email-signin", express.json(), async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      // Placeholder for email/password authentication
      // This would integrate with your user database
      return res.status(501).json({ error: "Email/password auth not yet implemented" });
    } catch (error) {
      console.error("[Email Sign-In] Error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // ─── tRPC API Routes ────────────────────────────────────────────────────────
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // ─── Static File Serving (Production) ────────────────────────────────────────
  // Production mode uses static files only
  const { serveStatic } = await import("./static");
  serveStatic(app);

  // Local file storage fallback
  if (!process.env.BUILT_IN_FORGE_API_URL) {
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    app.use('/uploads', express.static(uploadsDir));
    console.log(`[Local Storage] Serving uploads from: ${uploadsDir}`);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    startOutboxWorker();
    startAutoPurgeJob();
    emailQueueWorker.start();
    initializeSchedulers();
    scheduleAuditLogRetentionCleanup();
  });
}

startServer().catch(console.error);