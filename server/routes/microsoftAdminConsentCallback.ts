import { Router, Request, Response } from "express";
import { getDb } from "../db";
import { organizations } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";
import { ENV } from "../_core/env";
import { createAuditLog } from "../db";

const router = Router();

/**
 * GET /api/auth/microsoft/admin-consent/callback
 */
router.get("/callback", async (req: Request, res: Response) => {
  try {
    const { admin_consent, tenant, error, error_description, state } = req.query;

    // 🔒 Parse & validate state (STRICT)
    let organizationId: number | null = null;

    if (state && typeof state === "string") {
      try {
        const parsed = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));

        // ✅ Validate structure
        if (!parsed.organizationId || !parsed.timestamp) {
          throw new Error("Invalid state structure");
        }

        // ✅ Prevent replay (5 min)
        const age = Date.now() - parsed.timestamp;
        if (age > 5 * 60 * 1000) {
          throw new Error("State expired");
        }

        organizationId = parsed.organizationId;
      } catch (e) {
        console.error("Failed to parse/validate state:", e);
      }
    }

    // 🔴 HARD ENFORCEMENT (data isolation)
    if (!organizationId) {
      return res.status(400).json({
        error: "Invalid state parameter",
        message: "Organization context missing or invalid",
      });
    }

    const db = await getDb();

    const now = new Date().toISOString().slice(0, 19).replace("T", " ");

    // ✅ SUCCESS FLOW
    if (admin_consent === "True" && tenant) {
      const tenantId = tenant as string;

      await db
        .update(organizations)
        .set({
          microsoft365Enabled: 1,
          onboardingStatus: "connected",
          tenantId: tenantId,
          consentGrantedAt: now,
          tenantVerified: 1,
          onboardingToken: null,
          onboardingTokenExpiry: null,
          updatedAt: now,
        })
        .where(eq(organizations.id, organizationId));

      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      // ✅ Audit log (ADDED)
      await createAuditLog({
        userId: null,
        organizationId,
        action: "microsoft_consent_granted",
        entityType: "organization",
        entityId: organizationId,
        ipAddress: req.ip || "unknown",
      });

      // Notification
      await notifyOwner({
        title: "Microsoft 365 Onboarding Completed",
        content: `Organization "${org?.name}" connected. Tenant ID: ${tenantId}`,
      });

      const redirectUrl = new URL(
        `/platform/organizations/${org?.shortCode}`,
        ENV.APP_BASE_URL
      );

      redirectUrl.searchParams.set("microsoft365_connected", "true");

      return res.redirect(redirectUrl.toString());
    }

    // ❌ ERROR FLOW
    const errorMsg =
  typeof error_description === "string"
    ? error_description
    : typeof error === "string"
    ? error
    : "Unknown error";

    await db
      .update(organizations)
      .set({
        onboardingStatus: "error",
        updatedAt: now,
      })
      .where(eq(organizations.id, organizationId));

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    // ✅ Audit log (ADDED)
    await createAuditLog({
      userId: null,
      organizationId,
      action: "microsoft_consent_failed",
      entityType: "organization",
      entityId: organizationId,
      ipAddress: req.ip || "unknown",
    });

    await notifyOwner({
      title: "Microsoft 365 Onboarding Failed",
      content: `Organization "${org?.name}" failed. Error: ${errorMsg}`,
    });

    const redirectUrl = new URL(
      `/platform/organizations/${org?.shortCode}`,
      ENV.APP_BASE_URL
    );

    redirectUrl.searchParams.set("microsoft365_error", "true");
    redirectUrl.searchParams.set("error_message", encodeURIComponent(errorMsg));

    return res.redirect(redirectUrl.toString());

  } catch (error) {
    console.error("Admin consent callback error:", error);

    await notifyOwner({
      title: "Microsoft 365 Admin Consent Callback Error",
      content: `Callback error: ${error instanceof Error ? error.message : "Unknown error"}`,
    });

    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to process admin consent callback",
    });
  }
});

export default router;