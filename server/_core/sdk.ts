import { AXIOS_TIMEOUT_MS, COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import axios, { type AxiosInstance } from "axios";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

const nowSql = new Date().toISOString().slice(0, 19).replace('T', ' ');

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

const createOAuthHttpClient = (): AxiosInstance =>
  axios.create({
    baseURL: ENV.oAuthServerUrl,
    timeout: AXIOS_TIMEOUT_MS,
  });

class SDKServer {
  private readonly client: AxiosInstance;

  constructor(client: AxiosInstance = createOAuthHttpClient()) {
    this.client = client;
  }

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) return new Map<string, string>();
    return new Map(Object.entries(parseCookieHeader(cookieHeader)));
  }

  private getSessionSecret() {
    return new TextEncoder().encode(ENV.cookieSecret);
  }

  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string } = {}
  ): Promise<string> {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || "",
      },
      options
    );
  }

  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);

    return new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(this.getSessionSecret());
  }

  async verifySession(cookieValue: string | undefined | null) {
    if (!cookieValue) return null;

    try {
      const { payload } = await jwtVerify(cookieValue, this.getSessionSecret(), {
        algorithms: ["HS256"],
      });

      const { openId, appId, name } = payload as Record<string, unknown>;

      if (!isNonEmptyString(openId) || !isNonEmptyString(appId)) {
        return null;
      }

      return { openId, appId, name: String(name || "") };
    } catch {
      return null;
    }
  }

  // =================================================
  // 🔐 FINAL AUTHENTICATION FLOW (CLEAN & SAFE)
  // =================================================
  async authenticateRequest(req: Request): Promise<User> {

    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);

    if (!session) {
      throw ForbiddenError("Invalid session");
    }

    const openId = session.openId;

    // 🔹 1. GET USER
    const user = await db.getUserByOpenId(openId);

    if (!user) {
      console.error("[SECURITY] User not found for openId:", openId);
      throw ForbiddenError("User not found. Please contact administrator.");
    }

    // 🔹 2. HARD VALIDATION (CRITICAL)
    if (!user.email || !user.name) {
      console.error("[SECURITY] Corrupted user:", user.id);
      throw ForbiddenError("Invalid user record");
    }

    if (user.email === "temp@system.local") {
      console.error("[SECURITY] System user detected:", user.id);
      throw ForbiddenError("Invalid system user");
    }

    if ((user as any).isDeleted) {
      throw ForbiddenError("Account deactivated");
    }

    // 🔹 3. SAFE UPDATE (NO UPSERT)
    try {
      await db.updateUserLastLogin(user.id, nowSql);
    } catch (err) {
      console.warn("[Auth] Failed to update last login:", err);
    }

    return user;
  }
}

export const sdk = new SDKServer();