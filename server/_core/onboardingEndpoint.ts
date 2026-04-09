/**
 * ============================================================================
 * Public Onboarding Endpoint Handler
 * ============================================================================
 * 
 * Handles the public one-link onboarding endpoint.
 * This endpoint is called when org admin clicks the email link.
 * 
 * Route: GET /api/auth/microsoft/onboarding/:token
 * 
 * Flow:
 * 1. Validate token
 * 2. Get organization from token
 * 3. Redirect to Microsoft admin consent screen
 * 
 * ============================================================================
 */

import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { organizations } from "../../drizzle/schema";
import { adminConsentService } from "../services/microsoft/adminConsentService";
import { onboardingTokenService } from "../services/microsoft/onboardingTokenService";
import { ENV } from "./env";
import * as db from "../db";

export async function handlePublicOnboardingLink(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.params;

    if (!token) {
      res.status(400).json({
        success: false,
        error: "Token is required",
      });
      return;
    }

    // Get organization by token
    const dbInstance = await getDb();
    const [org] = await dbInstance
      .select()
      .from(organizations)
      .where(eq(organizations.onboardingToken, token))
      .limit(1);

    if (!org) {
      res.status(404).json({
        success: false,
        error: "Onboarding link not found or has expired",
      });
      return;
    }

    // Validate token
    const validation = onboardingTokenService.validateToken(
      token,
      org.onboardingTokenExpiry
    );

    if (!validation.valid) {
      // Log expired token
      await db.createAuditLog({
        userId: null,
        organizationId: org.id,
        operatingUnitId: null,
        action: "onboarding_token_expired",
        entityType: "organization",
        entityId: org.id,
        details: JSON.stringify({
          organizationName: org.name,
          error: validation.error,
          timestamp: new Date().toISOString(),
        }),
      });

      res.status(410).json({
        success: false,
        error: validation.error || "Onboarding link has expired",
      });
      return;
    }

    // Generate admin consent link
    const adminConsentLink = adminConsentService.generateAdminConsentLink(
      org.id,
      org.name
    );

    // Log token usage
    await db.createAuditLog({
      userId: null,
      organizationId: org.id,
      operatingUnitId: null,
      action: "onboarding_link_clicked",
      entityType: "organization",
      entityId: org.id,
      details: JSON.stringify({
        organizationName: org.name,
        timestamp: new Date().toISOString(),
        userAgent: req.get("user-agent"),
        ipAddress: req.ip,
      }),
    });

    // Redirect to Microsoft admin consent screen
    res.redirect(adminConsentLink);
  } catch (error) {
    console.error("[Onboarding Endpoint Error]", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}

/**
 * Resend onboarding link to organization admin
 * Called by platform admin when they want to resend the link
 */
export async function resendOnboardingLink(
  organizationId: number,
  adminEmail: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const dbInstance = await getDb();

    // Get organization
    const [org] = await dbInstance
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org) {
      return {
        success: false,
        error: "Organization not found",
      };
    }

    // Generate new token
    const { token, expiresAt } = onboardingTokenService.generateToken();

    // Update organization with new token
    await dbInstance
      .update(organizations)
      .set({
        onboardingToken: token,
        onboardingTokenExpiry: expiresAt.toISOString().slice(0, 19).replace("T", " "),
        onboardingLinkSentAt: new Date().toISOString().slice(0, 19).replace("T", " "),
        onboardingLinkSentTo: adminEmail,
      })
      .where(eq(organizations.id, organizationId));

    // Log the action
    await db.createAuditLog({
      userId: null,
      organizationId: organizationId,
      operatingUnitId: null,
      action: "onboarding_link_resent",
      entityType: "organization",
      entityId: organizationId,
      details: JSON.stringify({
        organizationName: org.name,
        sentTo: adminEmail,
        timestamp: new Date().toISOString(),
      }),
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to resend link: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
