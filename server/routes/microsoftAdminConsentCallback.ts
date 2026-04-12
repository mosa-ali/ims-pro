import { Router, Request, Response } from "express";
import { getDb } from "../db";
import { organizations } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { createAuditLog } from "../db";
import axios from "axios";
import { ENV } from "../_core/env";

// 🔹 NEW IMPORTS (for login flow)
import { appRouter } from "../routers";
import { createContext } from "../_core/context";

const router = Router();

interface MicrosoftTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface MicrosoftTenantInfo {
  id: string;
  displayName: string;
  verifiedDomains: Array<{
    name: string;
    isDefault: boolean;
    isInitial: boolean;
    capabilities: string[];
  }>;
}

//
// ======================================================
// ✅ 1. LOGIN CALLBACK (USER AUTHENTICATION)
// ======================================================
//
router.get("/api/oauth/microsoft/callback", async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      console.error("[Microsoft OAuth Login] Error:", error);
      return res.redirect(`/login?error=oauth_error`);
    }

    if (!code || typeof code !== "string") {
      console.error("[Microsoft OAuth Login] Missing code", req.query);
      return res.redirect(`/login?error=missing_code`);
    }

    if (!state || typeof state !== "string") {
      return res.redirect(`/login?error=invalid_state`);
    }

    // 🔹 Create tRPC context
    const ctx = await createContext({
      req,
      res,
      info: {} as any, // ✅ required by tRPC adapter
    });
    const caller = appRouter.createCaller(ctx);

    // 🔹 Call your EXISTING auth logic
    await caller.auth.handleMicrosoftCallback({
      code,
      state,
    });

    // ✅ SUCCESS
    return res.redirect("/organization");

  } catch (err) {
    console.error("[Microsoft OAuth Login] Failed:", err);
    return res.redirect("/login?error=oauth_failed");
  }
});

//
// ======================================================
// ✅ 2. ADMIN CONSENT CALLBACK (TENANT CONNECTION)
// ======================================================
//
router.get("/api/oauth/microsoft/admin-consent/callback", async (req: Request, res: Response) => {
  try {
    const { code, state, error, error_description } = req.query;

    // 🔴 Handle OAuth error
    if (error) {
      console.error("[Microsoft OAuth] Error:", error, error_description);
      return res.status(400).json({
        success: false,
        error,
        description: error_description,
      });
    }

    if (!code || typeof code !== "string") {
      return res.status(400).json({
        success: false,
        error: "Missing authorization code",
      });
    }

    if (!state || typeof state !== "string") {
      return res.status(400).json({
        success: false,
        error: "Missing state parameter",
      });
    }

    // 🔹 Parse state → contains organizationId
    let organizationId: number;
    try {
      const parsed = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
      organizationId = parsed.organizationId;
    } catch {
      return res.status(400).json({
        success: false,
        error: "Invalid state",
      });
    }

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: "Organization context missing",
      });
    }

    const db = await getDb();

    const orgResult = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!orgResult.length) {
      return res.status(404).json({
        success: false,
        error: "Organization not found",
      });
    }

    // 🔹 Exchange code for token
    const params = new URLSearchParams({
      client_id: process.env.MS_CLIENT_ID!,
      client_secret: process.env.MS_CLIENT_SECRET!,
      code,
      redirect_uri: `${ENV.APP_BASE_URL}/api/auth/microsoft/admin-consent/callback`,
      grant_type: "authorization_code",
      scope: "openid profile email User.Read offline_access",
    });

    let tokenResponse: MicrosoftTokenResponse;

    try {
      const tokenRes = await axios.post(
        `https://login.microsoftonline.com/${process.env.MS_TENANT_ID}/oauth2/v2.0/token`,
        params.toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      tokenResponse = tokenRes.data;
    } catch (error: any) {
      console.error("[Microsoft OAuth] Token exchange failed:", error.response?.data || error.message);
      return res.status(500).json({
        success: false,
        error: "Token exchange failed",
      });
    }

    // 🔹 Get tenant info
    let tenantInfo: MicrosoftTenantInfo;

    try {
      const graphRes = await axios.get("https://graph.microsoft.com/v1.0/organization", {
        headers: {
          Authorization: `Bearer ${tokenResponse.access_token}`,
        },
      });

      tenantInfo = graphRes.data.value[0];
    } catch (error: any) {
      console.error("[Microsoft OAuth] Graph error:", error.message);
      return res.status(500).json({
        success: false,
        error: "Failed to retrieve tenant info",
      });
    }

    const verifiedDomains =
      tenantInfo.verifiedDomains
        ?.filter((d) => d.capabilities?.includes("Email"))
        .map((d) => d.name) || [];

    // 🔹 Update organization
<<<<<<< HEAD
    // ✅ FIX: Added missing tenantVerified field
=======
>>>>>>> 31cbf4d586efa6aa4c0b334c1984418dc05a54bf
    await db
      .update(organizations)
      .set({
        tenantId: tenantInfo.id,
        onboardingStatus: "connected",
        microsoft365Enabled: 1,
<<<<<<< HEAD
        tenantVerified: 1, // ✅ FIXED: Added this field
=======
>>>>>>> 31cbf4d586efa6aa4c0b334c1984418dc05a54bf
        consentGrantedAt: new Date().toISOString(),
        allowedDomains: JSON.stringify(verifiedDomains),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(organizations.id, organizationId));

    // 🔹 Audit log
    await createAuditLog({
      userId: null,
      organizationId,
      action: "microsoft_365_connected",
      entityType: "organization",
      entityId: organizationId,
      ipAddress: req.ip || "unknown",
    });

    return res.status(200).json({
      success: true,
      tenantId: tenantInfo.id,
      organizationId,
      verifiedDomains,
    });

  } catch (error: any) {
    console.error("[Microsoft OAuth] Unexpected error:", error.message);
    return res.status(500).json({
      success: false,
      error: "Unexpected error",
    });
  }
});

//
// ======================================================
// ✅ 3. ERROR HANDLER
// ======================================================
//
router.get("/api/oauth/microsoft/error", (req: Request, res: Response) => {
  const { error, error_description } = req.query;

  console.warn("[Microsoft OAuth] Error from Microsoft:", {
    error,
    error_description,
  });

  return res.status(400).json({
    success: false,
    error: error || "Unknown error",
    description: error_description || "An error occurred during the Microsoft OAuth flow",
  });
});

export default router;
