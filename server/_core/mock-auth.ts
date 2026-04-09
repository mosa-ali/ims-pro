/**
 * Mock Authentication for Local Development
 *
 * Provides automatic session injection for local development without requiring
 * Manus OAuth, Microsoft Entra ID, or any external identity provider.
 *
 * IMPORTANT: This is for development only and MUST NEVER be used in production.
 * Automatically disabled when NODE_ENV !== 'development' or MOCK_AUTH !== 'true'.
 */

import type { NextFunction, Request, Response } from 'express';
import { COOKIE_NAME, ONE_YEAR_MS } from '@shared/const';
import { ENV } from './env';
import { sdk } from './sdk';
import { getSessionCookieOptions } from './cookies';
import * as db from '../db';

export interface MockUser {
  openId: string;
  name: string;
  email: string;
  role: 'platform_super_admin' | 'platform_admin' | 'user';
}

export function getMockUser(): MockUser {
  const email = ENV.MOCK_AUTH_USER_EMAIL || 'admin@ims.local';
  const name = ENV.MOCK_AUTH_USER_NAME || 'IMS Local Admin';
  const role = (ENV.MOCK_AUTH_USER_ROLE || 'platform_super_admin') as MockUser['role'];
  const openId = `mock-${email.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  return { openId, name, email, role };
}

export async function mockAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!ENV.MOCK_AUTH || ENV.isProduction) {
    return next();
  }
  try {
    const existingCookie = req.headers.cookie
      ?.split(';')
      .find((c) => c.trim().startsWith(`${COOKIE_NAME}=`))
      ?.split('=')
      .slice(1)
      .join('=')
      .trim();
    if (existingCookie) {
      return next();
    }
    const mockUser = getMockUser();
    await db.upsertUser({
      openId: mockUser.openId,
      name: mockUser.name,
      email: mockUser.email,
      loginMethod: 'mock',
      lastSignedIn: new Date(),
    });
    const sessionToken = await sdk.createSessionToken(mockUser.openId, { name: mockUser.name });
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
    console.log(`[Mock Auth] Auto-session injected for: ${mockUser.email}`);
  } catch (err) {
    console.error('[Mock Auth] Failed to inject session:', err);
  }
  next();
}

export async function handleMockLogin(req: Request, res: Response): Promise<void> {
  if (!ENV.MOCK_AUTH || ENV.isProduction) {
    res.status(403).json({ error: 'Mock auth not enabled' });
    return;
  }
  try {
    const mockUser = getMockUser();
    await db.upsertUser({
      openId: mockUser.openId,
      name: mockUser.name,
      email: mockUser.email,
      loginMethod: 'mock',
      lastSignedIn: new Date(),
    });
    const sessionToken = await sdk.createSessionToken(mockUser.openId, { name: mockUser.name });
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
    console.log(`[Mock Auth] Explicit login for: ${mockUser.email}`);
    res.json({ success: true, user: { openId: mockUser.openId, name: mockUser.name, email: mockUser.email, role: mockUser.role } });
  } catch (err) {
    console.error('[Mock Auth] Login error:', err);
    res.status(500).json({ error: 'Mock login failed' });
  }
}

export function handleMockLogout(_req: Request, res: Response): void {
  if (!ENV.MOCK_AUTH || ENV.isProduction) {
    res.status(403).json({ error: 'Mock auth not enabled' });
    return;
  }
  res.clearCookie(COOKIE_NAME, { path: '/' });
  console.log('[Mock Auth] Logout');
  res.json({ success: true });
}
