import { Router, Request, Response } from "express";
import axios from "axios";
import { getDb } from "../db";
import { organizations } from "../../drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";
import { createAuditLog } from "../db";
import session from "express-session";
import { sdk } from "../_core/sdk";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";

// 🔵 Services
import { userProvisioningService } from "../services/microsoft/userProvisioningService";
import { tenantOrganizationMappingService } from "../services/microsoft/tenantOrganizationMappingService";

// ✅ Fix session typing
declare module "express-session" {
interface SessionData {
user?: {
id: number;
email: string;
organizationId: number;
};
}
}

export const microsoftOAuthCallbackRouter = Router();

microsoftOAuthCallbackRouter.get(
"/api/oauth/microsoft/callback",
async (req: Request, res: Response) => {
try {
const { code, state, error, error_description } = req.query;
  // ============================================================
  // 1️⃣ Handle Microsoft error
  // ============================================================
  if (error) {
    console.error("[Microsoft OAuth] Error:", error, error_description);

    return res.redirect(
      `${process.env.APP_BASE_URL}/login?error=${encodeURIComponent(
        typeof error_description === "string"
          ? error_description
          : "OAuth error"
      )}`
    );
  }

  if (!code || typeof code !== "string") {
    return res.status(400).json({
      success: false,
      error: "Missing authorization code",
    });
  }

  // ============================================================
  // 2️⃣ Exchange token
  // ============================================================
  const params = new URLSearchParams({
    client_id: process.env.MS_CLIENT_ID!,
    client_secret: process.env.MS_CLIENT_SECRET!,
    code,
    redirect_uri: process.env.MS_REDIRECT_URI!,
    grant_type: "authorization_code",
    scope: "openid profile email User.Read offline_access",
  });

  let accessToken: string;
  let idToken: string;

  try {
    const tokenRes = await axios.post(
      `https://login.microsoftonline.com/organizations/oauth2/v2.0/token`,
      params.toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    accessToken = tokenRes.data.access_token;
    idToken = tokenRes.data.id_token;

    if (!idToken) {
      throw new Error("Missing ID token");
    }

  } catch (err: any) {
    console.error("[OAuth] Token exchange failed:", err.response?.data || err.message);
    return res.redirect(`${process.env.APP_BASE_URL}/login?error=token_failed`);
  }

  // ============================================================
  // 3️⃣ Extract tenantId (✅ FIXED)
  // ============================================================
  const payload = JSON.parse(
    Buffer.from(idToken.split(".")[1], "base64").toString()
  );

  const tenantId = payload.tid;

  // ============================================================
  // 4️⃣ Get user info
  // ============================================================
  let userInfo: any;

  try {
    const userRes = await axios.get("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    userInfo = userRes.data;
  } catch (err: any) {
    console.error("[OAuth] Failed to fetch user:", err.message);
    return res.redirect(`${process.env.APP_BASE_URL}/login?error=user_fetch_failed`);
  }

  const email = userInfo.mail || userInfo.userPrincipalName;

  // ============================================================
  // 5️⃣ Resolve organization
  // ============================================================
  const orgContext =
    await tenantOrganizationMappingService.resolveOrganizationByTenant(
      tenantId
    );

  if (!orgContext) {
    console.warn("[OAuth] Tenant not mapped:", tenantId);

    return res.redirect(
      `${process.env.APP_BASE_URL}/request-access?tenant=${tenantId}`
    );
  }

  // ============================================================
  // 6️⃣ Provision user
  // ============================================================
  const provisioned =
    await userProvisioningService.provisionMicrosoftUser(
      {
        id: userInfo.id,
        email,
        displayName: userInfo.displayName,
      },
      orgContext.organizationId
    );

  // ============================================================
  // 7️⃣ Admin consent (optional)
  // ============================================================
  if (state && typeof state === "string") {
    try {
      const parsed = JSON.parse(
        Buffer.from(state, "base64").toString("utf-8")
      );

      if (parsed.organizationId === orgContext.organizationId) {
        const db = await getDb();

        await db
          .update(organizations)
          .set({
            tenantId,
            onboardingStatus: "connected",
            microsoft365Enabled: 1,
            consentGrantedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .where(
            and(
              eq(organizations.id, orgContext.organizationId),
              isNull(organizations.deletedAt)
            )
          );

        await createAuditLog({
          userId: null,
          organizationId: orgContext.organizationId,
          action: "microsoft_365_connected",
          entityType: "organization",
          entityId: orgContext.organizationId,
          ipAddress: req.ip || "unknown",
        });
      }
    } catch {
      // ignore
    }
  }

  // ============================================================
  // 8️⃣ Create session (FIXED)
  // ============================================================
  (req as any).session.user = {
    id: provisioned.userId,
    email: provisioned.email,
    organizationId: orgContext.organizationId,
  };

  // ============================================================
  // 9️⃣ Redirect
  // ============================================================
  return res.redirect(`${process.env.APP_BASE_URL}/organization`);

} catch (error: any) {
  console.error("[Microsoft OAuth] Unexpected error:", error.message);

  return res.redirect(
    `${process.env.APP_BASE_URL}/login?error=unexpected`
  );
}})
