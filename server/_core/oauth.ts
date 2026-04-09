import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { resolveDomain } from "./domainResolver";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      // Validate user data - prevent NULL values for critical fields
      if (!userInfo.name || userInfo.name.trim() === '') {
        console.warn(`[OAuth] Missing user name for openId: ${userInfo.openId}`);
        res.status(400).json({ error: "User name is required from OAuth provider" });
        return;
      }

      if (!userInfo.email || userInfo.email.trim() === '') {
        console.warn(`[OAuth] Missing user email for openId: ${userInfo.openId}`);
        res.status(400).json({ error: "User email is required from OAuth provider" });
        return;
      }

      // Domain resolution security check
      if (userInfo.email) {
        const ipAddress = req.ip || req.socket.remoteAddress;
        const userAgent = req.get('user-agent');
        
        const resolution = await resolveDomain(
          userInfo.email,
          userInfo.openId,
          ipAddress,
          userAgent
        );

        if (!resolution.allowed) {
          console.warn(
            `[OAuth] Domain resolution denied: ${resolution.reason} | Email: ${userInfo.email}`
          );
          res.status(403).json({
            error: "Access denied",
            reason: resolution.reason,
          });
          return;
        }

        // Log successful resolution
        console.log(
          `[OAuth] Domain resolution allowed: ${resolution.reason} | Email: ${userInfo.email}`
        );
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name.trim(), // Guaranteed to be non-empty after validation
        email: userInfo.email.trim(), // Guaranteed to be non-empty after validation
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? 'unknown', // Default to 'unknown' instead of null
        lastSignedIn: new Date(),
      });

      // Block login for soft-deleted users
      const existingUser = await db.getUserByOpenId(userInfo.openId);
      if (existingUser && (existingUser as any).isDeleted) {
        console.warn(`[OAuth] Blocked login for soft-deleted user: ${userInfo.openId}`);
        res.status(403).json({ error: "Your account has been deactivated. Please contact your administrator." });
        return;
      }

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
