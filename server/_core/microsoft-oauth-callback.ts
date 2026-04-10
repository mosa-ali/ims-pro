import { Router, Request, Response } from "express";
import axios from "axios";
import { getDb } from "../db";
import { organizations } from "../../drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";
import { createAuditLog } from "../db";
import { sdk } from "../_core/sdk";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { ENV } from "../_core/env";

// Services
import { userProvisioningService } from "../services/microsoft/userProvisioningService";
import { tenantOrganizationMappingService } from "../services/microsoft/tenantOrganizationMappingService";

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
        return res.redirect(
          `${ENV.APP_BASE_URL}/login?error=${encodeURIComponent(
            typeof error_description === "string"
              ? error_description
              : "OAuth error"
          )}`
        );
      }

      if (!code || typeof code !== "string") {
        return res.redirect(`${ENV.APP_BASE_URL}/login?error=missing_code`);
      }

      // ============================================================
      // 2️⃣ Exchange token
      // ============================================================
      const params = new URLSearchParams({
        client_id: ENV.MS_CLIENT_ID!,
        client_secret: ENV.MS_CLIENT_SECRET!,
        code,
        redirect_uri: ENV.MS_REDIRECT_URI!,
        grant_type: "authorization_code",
        scope: "openid profile email User.Read",
      });

      const tokenRes = await axios.post(
        `https://login.microsoftonline.com/organizations/oauth2/v2.0/token`,
        params.toString(),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      const accessToken = tokenRes.data.access_token;
      const idToken = tokenRes.data.id_token;

      if (!idToken) {
        throw new Error("Missing ID token");
      }

      // ============================================================
      // 3️⃣ Extract tenantId
      // ============================================================
      const payload = JSON.parse(
        Buffer.from(idToken.split(".")[1], "base64").toString()
      );

      const tenantId = payload.tid;

      // ============================================================
      // 4️⃣ Get user info
      // ============================================================
      const userRes = await axios.get("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const userInfo = userRes.data;
      const email = userInfo.mail || userInfo.userPrincipalName;

      // 🚨 Critical validation
      if (!email) {
        return res.redirect(`${ENV.APP_BASE_URL}/login?error=no_email`);
      }

      // ============================================================
      // 5️⃣ Resolve organization
      // ============================================================
      const orgContext =
        await tenantOrganizationMappingService.resolveOrganizationByTenant(
          tenantId
        );

      if (!orgContext) {
        return res.redirect(
          `${ENV.APP_BASE_URL}/request-access?tenant=${tenantId}`
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
      // 7️⃣ 🔥 SAVE TENANT CONNECTION (CRITICAL FIX)
      // ============================================================
      const db = await getDb();

      await db
        .update(organizations)
        .set({
          tenantId,
          onboardingStatus: "connected",
          microsoft365Enabled: 1,
          tenantVerified: 1, // 🔥 ADD THIS FIELD
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
        userId: provisioned.userId,
        organizationId: orgContext.organizationId,
        action: "microsoft_365_connected",
        entityType: "organization",
        entityId: orgContext.organizationId,
        ipAddress: req.ip || "unknown",
      });

      // ============================================================
      // 8️⃣ Create session
      // ============================================================
      const openId = `ms-${userInfo.id}`;

      const sessionToken = await sdk.createSessionToken(openId, {
        name: userInfo.displayName || email,
      });

      const cookieOptions = getSessionCookieOptions(req);

      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
      });

      // ============================================================
      // 9️⃣ Redirect to organization page (WITH FLAG)
      // ============================================================
          return res.redirect(`${process.env.APP_BASE_URL}/organization`);

        } catch (error: any) {
          console.error("[Microsoft OAuth] Unexpected error:", error.message);

          return res.redirect(
            `${process.env.APP_BASE_URL}/login?error=unexpected`
          );
        }})
