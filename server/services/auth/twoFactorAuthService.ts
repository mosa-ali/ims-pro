/**
 * Two-Factor Authentication (2FA) Service
 * 
 * Implements TOTP (Time-Based One-Time Password) based on RFC 6238
 * Supports QR code generation for authenticator apps (Google Authenticator, Authy, Microsoft Authenticator, etc.)
 * 
 * CRITICAL DESIGN DECISIONS:
 * 1. All secrets encrypted at rest (AES-256-GCM)
 * 2. All operations use ctx.session (never frontend userId)
 * 3. All data isolated by organizationId + operatingUnitId
 * 4. All attempts rate-limited and logged
 * 5. All timestamps in UTC
 */

import crypto from 'crypto';
import QRCode from 'qrcode';
import { getDb } from '../../db';
import { twoFactorAuth, twoFactorAttempts, twoFactorAuditLog } from '../../../drizzle/schema';
import { eq, and, gt } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

// ============================================================================
// TOTP Implementation (RFC 6238)
// ============================================================================

/**
 * Generate TOTP secret using crypto module (no external dependencies)
 * Returns base32-encoded secret suitable for authenticator apps
 */
function generateTOTPSecret(length: number = 32): string {
  // Generate random bytes
  const randomBytes = crypto.randomBytes(length);
  
  // Base32 encode (RFC 4648)
  const base32Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let base32 = '';
  let bits = 0;
  let value = 0;

  for (let i = 0; i < randomBytes.length; i++) {
    value = (value << 8) | randomBytes[i];
    bits += 8;

    while (bits >= 5) {
      bits -= 5;
      base32 += base32Alphabet[(value >> bits) & 31];
    }
  }

  if (bits > 0) {
    base32 += base32Alphabet[(value << (5 - bits)) & 31];
  }

  return base32;
}

/**
 * Convert base32 string to bytes
 */
function base32Decode(base32: string): Buffer {
  const base32Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < base32.length; i++) {
    const index = base32Alphabet.indexOf(base32[i].toUpperCase());
    if (index === -1) throw new Error('Invalid base32 character');

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >> bits) & 255);
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generate TOTP token using HMAC-SHA1
 * Based on RFC 6238
 */
function generateTOTPToken(secret: string, timeStep: number = 30): string {
  // Get current time in 30-second intervals
  let time = Math.floor(Date.now() / 1000 / timeStep);
  const timeBuffer = Buffer.alloc(8);
  
  for (let i = 7; i >= 0; i--) {
    timeBuffer[i] = time & 0xff;
    // eslint-disable-next-line no-bitwise
    time = time >> 8;
  }

  // Decode secret from base32
  const secretBytes = base32Decode(secret);

  // Generate HMAC-SHA1
  const hmac = crypto.createHmac('sha1', secretBytes);
  hmac.update(timeBuffer);
  const digest = hmac.digest();

  // Extract 4 bytes from digest (dynamic truncation)
  const offset = digest[digest.length - 1] & 0x0f;
  const code = (
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)
  );

  // Return 6-digit code
  return String(code % 1000000).padStart(6, '0');
}

/**
 * Verify TOTP token with time window tolerance
 */
function verifyTOTPToken(secret: string, token: string, window: number = 1): boolean {
  const timeStep = 30;
  const currentTime = Math.floor(Date.now() / 1000 / timeStep);

  // Check current and adjacent time windows
  for (let i = -window; i <= window; i++) {
    let testTime = currentTime + i;
    const testTimeBuffer = Buffer.alloc(8);
    
    for (let j = 7; j >= 0; j--) {
      testTimeBuffer[j] = testTime & 0xff;
      // eslint-disable-next-line no-bitwise
      testTime = testTime >> 8;
    }

    const secretBytes = base32Decode(secret);
    const hmac = crypto.createHmac('sha1', secretBytes);
    hmac.update(testTimeBuffer);
    const digest = hmac.digest();

    const offset = digest[digest.length - 1] & 0x0f;
    const code = (
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff)
    );

    const testToken = String(code % 1000000).padStart(6, '0');
    if (testToken === token) return true;
  }

  return false;
}

// ============================================================================
// Encryption/Decryption (AES-256-GCM)
// ============================================================================

/**
 * Encrypt secret using AES-256-GCM
 * Returns { encrypted, iv, authTag } all hex-encoded
 */
function encryptSecret(secret: string, encryptionKey: string): { encrypted: string; iv: string; authTag: string } {
  const key = Buffer.from(encryptionKey, 'hex');
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

/**
 * Decrypt secret using AES-256-GCM
 */
function decryptSecret(encrypted: string, iv: string, authTag: string, encryptionKey: string): string {
  const key = Buffer.from(encryptionKey, 'hex');
  const ivBuffer = Buffer.from(iv, 'hex');
  const authTagBuffer = Buffer.from(authTag, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuffer);
  decipher.setAuthTag(authTagBuffer);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// ============================================================================
// Backup Code Management
// ============================================================================

/**
 * Generate backup codes for account recovery
 * Returns array of 10 codes (8 characters each)
 */
function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    // Generate 6 random bytes = 48 bits
    const randomBytes = crypto.randomBytes(6);
    
    // Convert to hex (12 characters)
    const code = randomBytes.toString('hex').toUpperCase();
    codes.push(code);
  }

  return codes;
}

/**
 * Hash backup code using SHA-256
 */
function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Verify backup code against hashed codes
 */
function verifyBackupCode(code: string, hashedCodes: string[]): boolean {
  const hashedCode = hashBackupCode(code);
  return hashedCodes.includes(hashedCode);
}

// ============================================================================
// Two-Factor Authentication Service
// ============================================================================

export class TwoFactorAuthService {
  /**
   * Generate TOTP secret and QR code
   * Returns secret and QR code data URL for user to scan
   */
  static async generateTOTPSecret(
    userEmail: string,
    appName: string = 'ClientSphere'
  ): Promise<{
    success: boolean;
    secret?: string;
    qrCodeUrl?: string;
    backupCodes?: string[];
    error?: string;
  }> {
    try {
      // Generate TOTP secret
      const secret = generateTOTPSecret(32);

      // Generate otpauth URL
      const otpauthUrl = `otpauth://totp/${appName}:${userEmail}?secret=${secret}&issuer=${appName}`;

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

      // Generate backup codes (10 codes for account recovery)
      const backupCodes = generateBackupCodes(10);

      return {
        success: true,
        secret,
        qrCodeUrl,
        backupCodes,
      };
    } catch (error) {
      console.error('[TwoFactorAuthService] Generate secret error:', error);
      return { success: false, error: 'Failed to generate 2FA secret' };
    }
  }

  /**
   * Verify TOTP token
   */
  static verifyTOTPToken(secret: string, token: string, window: number = 1): boolean {
    try {
      return verifyTOTPToken(secret, token, window);
    } catch (error) {
      console.error('[TwoFactorAuthService] Verify token error:', error);
      return false;
    }
  }

  /**
   * Setup TOTP for user
   * Stores encrypted secret in database
   */
  static async setupTOTP(
    userId: number,
    organizationId: number,
    operatingUnitId: number | null,
    totpSecret: string,
    encryptionKey: string
  ): Promise<{ success: boolean; backupCodes?: string[]; error?: string }> {
    try {
      const db = await getDb();

      // Generate backup codes
      const backupCodes = generateBackupCodes(10);
      const hashedBackupCodes = backupCodes.map(hashBackupCode);

      // Encrypt secret
      const { encrypted, iv, authTag } = encryptSecret(totpSecret, encryptionKey);

      // Store in database
      await db.insert(twoFactorAuth).values({
        userId,
        organizationId,
        operatingUnitId: operatingUnitId || null,
        method: 'totp',
        secret: encrypted,
        secretIv: iv,
        secretTag: authTag,
        backupCodes: hashedBackupCodes as any,
        isEnabled: 0,
        isVerified: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return { success: true, backupCodes };
    } catch (error) {
      console.error('[TwoFactorAuthService] Setup TOTP error:', error);
      return { success: false, error: 'Failed to setup TOTP' };
    }
  }

  /**
   * Verify TOTP setup and enable 2FA
   */
  static async verifyTOTPSetup(
    userId: number,
    organizationId: number,
    token: string,
    encryptionKey: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const db = await getDb();

      // Get unverified TOTP record
      const record = await db.query.twoFactorAuth.findFirst({
        where: and(
          eq(twoFactorAuth.userId, userId),
          eq(twoFactorAuth.organizationId, organizationId),
          eq(twoFactorAuth.method, 'totp'),
          eq(twoFactorAuth.isVerified, 0)
        ),
      });

      if (!record) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'TOTP setup not found' });
      }

      // Decrypt secret
      const secret = decryptSecret(record.secret, record.secretIv || '', record.secretTag || '', encryptionKey);

      // Verify token
      if (!verifyTOTPToken(secret, token)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid TOTP token' });
      }

      // Enable TOTP
      await db
        .update(twoFactorAuth)
        .set({
          isVerified: 1,
          isEnabled: 1,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(twoFactorAuth.id, record.id));

      // Log audit event
      await db.insert(twoFactorAuditLog).values({
        userId,
        organizationId,
        event: 'totp_enabled',
        details: { method: 'totp', timestamp: new Date().toISOString() } as any,
        createdAt: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      console.error('[TwoFactorAuthService] Verify TOTP setup error:', error);
      if (error instanceof TRPCError) throw error;
      return { success: false, error: 'Failed to verify TOTP setup' };
    }
  }

  /**
   * Verify TOTP token during login
   */
  static async verifyTOTPLogin(
    userId: number,
    organizationId: number,
    token: string,
    encryptionKey: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const db = await getDb();

      // Get enabled TOTP record
      const record = await db.query.twoFactorAuth.findFirst({
        where: and(
          eq(twoFactorAuth.userId, userId),
          eq(twoFactorAuth.organizationId, organizationId),
          eq(twoFactorAuth.method, 'totp'),
          eq(twoFactorAuth.isEnabled, 1)
        ),
      });

      if (!record) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'TOTP not enabled' });
      }

      // Decrypt secret
      const secret = decryptSecret(record.secret, record.secretIv || '', record.secretTag || '', encryptionKey);

      // Verify token
      const isValid = verifyTOTPToken(secret, token);

      // Log attempt
      await db.insert(twoFactorAttempts).values({
        userId,
        organizationId,
        action: 'totp_login',
        success: isValid ? 1 : 0,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        createdAt: new Date().toISOString(),
      });

      if (!isValid) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid TOTP token' });
      }

      // Update last used
      await db
        .update(twoFactorAuth)
        .set({ lastUsedAt: new Date().toISOString() })
        .where(eq(twoFactorAuth.id, record.id));

      return { success: true };
    } catch (error) {
      console.error('[TwoFactorAuthService] Verify TOTP login error:', error);
      if (error instanceof TRPCError) throw error;
      return { success: false, error: 'TOTP verification failed' };
    }
  }

  /**
   * Verify backup code and use it
   */
  static async verifyBackupCode(
    userId: number,
    organizationId: number,
    code: string,
    encryptionKey: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; codesRemaining?: number; error?: string }> {
    try {
      const db = await getDb();

      // Get enabled 2FA record
      const record = await db.query.twoFactorAuth.findFirst({
        where: and(
          eq(twoFactorAuth.userId, userId),
          eq(twoFactorAuth.organizationId, organizationId),
          eq(twoFactorAuth.isEnabled, 1)
        ),
      });

      if (!record || !record.backupCodes) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '2FA not enabled' });
      }

      // Parse backup codes
      const hashedCodes = JSON.parse(record.backupCodes as unknown as string) as string[];

      // Verify code
      if (!verifyBackupCode(code, hashedCodes)) {
        // Log failed attempt
        await db.insert(twoFactorAttempts).values({
          userId,
          organizationId,
          action: 'backup_code_verify',
          success: 0,
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
          createdAt: new Date().toISOString(),
        });

        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid backup code' });
      }

      // Remove used code
      const hashedUsedCode = hashBackupCode(code);
      const remainingCodes = hashedCodes.filter((c) => c !== hashedUsedCode);

      // Update database
      await db
        .update(twoFactorAuth)
        .set({
          backupCodes: remainingCodes as any,
          lastUsedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(twoFactorAuth.id, record.id));

      // Log successful attempt
      await db.insert(twoFactorAttempts).values({
        userId,
        organizationId,
        action: 'backup_code_verify',
        success: 1,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        createdAt: new Date().toISOString(),
      });

      // Log audit event
      await db.insert(twoFactorAuditLog).values({
        userId,
        organizationId,
        event: 'backup_code_used',
        details: { codesRemaining: remainingCodes.length, timestamp: new Date().toISOString() } as any,
        createdAt: new Date().toISOString(),
      });

      return { success: true, codesRemaining: remainingCodes.length };
    } catch (error) {
      console.error('[TwoFactorAuthService] Verify backup code error:', error);
      if (error instanceof TRPCError) throw error;
      return { success: false, error: 'Backup code verification failed' };
    }
  }

  /**
   * Disable 2FA for user
   */
  static async disable2FA(
    userId: number,
    organizationId: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const db = await getDb();

      // Delete all 2FA records
      await db
        .update(twoFactorAuth)
        .set({
          isEnabled: 0,
          isVerified: 0,
          deletedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(and(eq(twoFactorAuth.userId, userId), eq(twoFactorAuth.organizationId, organizationId)));

      // Log audit event
      await db.insert(twoFactorAuditLog).values({
        userId,
        organizationId,
        event: '2fa_disabled_all',
        details: { timestamp: new Date().toISOString() } as any,
        createdAt: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      console.error('[TwoFactorAuthService] Disable 2FA error:', error);
      return { success: false, error: 'Failed to disable 2FA' };
    }
  }

  /**
   * Get user's 2FA status
   */
  static async get2FAStatus(userId: number, organizationId: number) {
    try {
      const db = await getDb();

      const records = await db.query.twoFactorAuth.findMany({
        where: and(eq(twoFactorAuth.userId, userId), eq(twoFactorAuth.organizationId, organizationId)),
      });

      return {
        enabled: records.some((r) => r.isEnabled === 1),
        methods: records.filter((r) => r.isEnabled === 1).map((r) => r.method),
        records,
      };
    } catch (error) {
      console.error('[TwoFactorAuthService] Get 2FA status error:', error);
      return { enabled: false, methods: [], records: [] };
    }
  }

  /**
   * Check rate limiting for 2FA attempts
   */
  static async checkRateLimit(
    userId: number,
    organizationId: number,
    action: string
  ): Promise<{ allowed: boolean; remainingAttempts: number; resetAt?: Date }> {
    try {
      const db = await getDb();

      // Get failed attempts in the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const failedAttempts = await db.query.twoFactorAttempts.findMany({
        where: and(
          eq(twoFactorAttempts.userId, userId),
          eq(twoFactorAttempts.organizationId, organizationId),
          eq(twoFactorAttempts.action, action),
          eq(twoFactorAttempts.success, 0),
          gt(twoFactorAttempts.createdAt, oneHourAgo)
        ),
      });

      const maxAttempts = 10;
      const allowed = failedAttempts.length < maxAttempts;

      return {
        allowed,
        remainingAttempts: Math.max(0, maxAttempts - failedAttempts.length),
        resetAt: failedAttempts.length > 0 ? new Date(failedAttempts[0].createdAt + 60 * 60 * 1000) : undefined,
      };
    } catch (error) {
      console.error('[TwoFactorAuthService] Check rate limit error:', error);
      return { allowed: true, remainingAttempts: 10 };
    }
  }
}

export { generateTOTPSecret, verifyTOTPToken, encryptSecret, decryptSecret, generateBackupCodes, hashBackupCode };
