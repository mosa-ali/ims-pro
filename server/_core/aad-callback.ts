import { Router, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { resolveDomain } from "./domainResolver";
import { sdk } from "../_core/sdk";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const aadCallbackRouter = Router();

aadCallbackRouter.get("/api/oauth/microsoft/callback", async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;
    const error = req.query.error as string | undefined;
    const errorDescription = req.query.error_description as string | undefined;

    // Handle Microsoft OAuth errors
    if (error) {
      console.warn("[AAD Callback] OAuth error:", { error, errorDescription });
      return res.redirect(`/login?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      console.error("[AAD Callback] Missing authorization code");
      return res.redirect("/login?error=missing_code");
    }

    if (!state) {
      console.error("[AAD Callback] Missing state");
      return res.redirect("/login?error=missing_state");
    }

    // Validate ENV
    if (!process.env.MS_CLIENT_ID || !process.env.MS_CLIENT_SECRET || !process.env.MS_REDIRECT_URI) {
      console.error("[AAD Callback] Missing OAuth ENV configuration");
      return res.redirect("/login?error=config_error");
    }

    console.log("[AAD Callback] Exchanging code for token");

    const tokenRes = await fetch(
      `https://login.microsoftonline.com/common/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.MS_CLIENT_ID,
          client_secret: process.env.MS_CLIENT_SECRET,
          code,
          redirect_uri: process.env.MS_REDIRECT_URI,
          grant_type: "authorization_code",
          scope: "openid profile email User.Read",
        }).toString(),
      }
    );

    if (!tokenRes.ok) {
      const err = await tokenRes.json();
      console.error("[AAD Callback] Token error:", err);
      return res.redirect("/login?error=token_failed");
    }

    const tokenData = await tokenRes.json();

    // Fetch user info
    const graphRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!graphRes.ok) {
      console.error("[AAD Callback] Graph API failed");
      return res.redirect("/login?error=graph_failed");
    }

    const data = await graphRes.json();

    const email = data.mail || data.userPrincipalName;

    if (!email) {
      console.error("[AAD Callback] No email found");
      return res.redirect("/login?error=no_email");
    }

    const userId = `ms-${data.id}`;

    // Domain check
    const resolution = await resolveDomain(
      email,
      data.id,
      req.ip,
      req.get("user-agent")
    );

    if (!resolution.allowed) {
      return res.redirect("/login?error=access_denied");
    }

    const nowSql = new Date().toISOString().slice(0, 19).replace("T", " ");

    await db.upsertUser({
      openId: userId,
      name: data.displayName || email,
      email,
      loginMethod: "microsoft_entra",
      lastSignedIn: nowSql,
    });

    // Create session
    const sessionToken = await sdk.createSessionToken(userId, {
      name: data.displayName || email,
    });

    res.cookie(COOKIE_NAME, sessionToken, {
      ...getSessionCookieOptions(req),
      maxAge: ONE_YEAR_MS,
    });

    console.log(`[AAD Callback] Success login: ${email}`);

    return res.redirect("/organization");

  } catch (err: any) {
    console.error("[AAD Callback] Unexpected error:", err.message);
    return res.redirect("/login?error=server_error");
  }
});