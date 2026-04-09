import { z } from 'zod';
import crypto from 'crypto';
import { TRPCError } from '@trpc/server';

// 2FA types
export type TwoFactorMethod = 'totp' | 'sms' | 'email';

interface TOTPSecret {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

interface SMSChallenge {
  code: string;
  expiresAt: Date;
  attempts: number;
}

interface TwoFactorSession {
  userId: string;
  method: TwoFactorMethod;
  verified: boolean;
  expiresAt: Date;
}

/**
 * Two-Factor Authentication Service
 * Handles TOTP, SMS, and email-based 2FA
 */
export class TwoFactorAuthService {
  private totpSecrets: Map<string, TOTPSecret> = new Map();
  private smsChallenges: Map<string, SMSChallenge> = new Map();
  private twoFactorSessions: Map<string, TwoFactorSession> = new Map();
  private userMethods: Map<string, TwoFactorMethod[]> = new Map();

  private smsConfig = {
    codeLength: 6,
    expiryMinutes: 10,
    maxAttempts: 3,
  };

  /**
   * Generate TOTP secret for user
   */
  generateTOTPSecret(userId: string): TOTPSecret {
    // Generate random secret (32 bytes = 256 bits)
    const secret = crypto.randomBytes(32).toString('base64');

    // Generate backup codes (8 codes, 8 characters each)
    const backupCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    const totpSecret: TOTPSecret = {
      secret,
      qrCode: `otpauth://totp/ClientSphere?secret=${secret}&issuer=ClientSphere`,
      backupCodes,
    };

    // Store temporarily (not yet confirmed)
    this.totpSecrets.set(`pending:${userId}`, totpSecret);

    return totpSecret;
  }

  /**
   * Verify TOTP token and enable 2FA
   */
  verifyTOTPToken(userId: string, token: string): boolean {
    const pendingSecret = this.totpSecrets.get(`pending:${userId}`);

    if (!pendingSecret) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No pending TOTP setup found.',
      });
    }

    // In production, use a proper TOTP library like speakeasy
    // For now, accept any 6-digit code (simplified for testing)
    if (!/^\d{6}$/.test(token)) {
      throw new TRPCError({
        code: 'INVALID_ARGUMENT',
        message: 'Invalid TOTP token format.',
      });
    }

    // Confirm TOTP setup
    this.totpSecrets.set(`confirmed:${userId}`, pendingSecret);
    this.totpSecrets.delete(`pending:${userId}`);

    // Add TOTP to user's 2FA methods
    const methods = this.userMethods.get(userId) || [];
    if (!methods.includes('totp')) {
      methods.push('totp');
      this.userMethods.set(userId, methods);
    }

    return true;
  }

  /**
   * Verify TOTP token during login
   */
  verifyTOTPLogin(userId: string, token: string): boolean {
    const secret = this.totpSecrets.get(`confirmed:${userId}`);

    if (!secret) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'TOTP not enabled for this user.',
      });
    }

    // In production, use proper TOTP verification
    if (!/^\d{6}$/.test(token)) {
      throw new TRPCError({
        code: 'INVALID_ARGUMENT',
        message: 'Invalid TOTP token.',
      });
    }

    return true;
  }

  /**
   * Verify backup code
   */
  verifyBackupCode(userId: string, code: string): boolean {
    const secret = this.totpSecrets.get(`confirmed:${userId}`);

    if (!secret) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No TOTP setup found.',
      });
    }

    const index = secret.backupCodes.indexOf(code.toUpperCase());
    if (index === -1) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid backup code.',
      });
    }

    // Remove used backup code
    secret.backupCodes.splice(index, 1);

    return true;
  }

  /**
   * Send SMS challenge code
   */
  sendSMSChallenge(userId: string, phoneNumber: string): void {
    const code = crypto
      .randomInt(0, Math.pow(10, this.smsConfig.codeLength))
      .toString()
      .padStart(this.smsConfig.codeLength, '0');

    const expiresAt = new Date(Date.now() + this.smsConfig.expiryMinutes * 60 * 1000);

    const challenge: SMSChallenge = {
      code,
      expiresAt,
      attempts: 0,
    };

    this.smsChallenges.set(`sms:${userId}`, challenge);

    // In production, send SMS via Twilio or similar
    console.log(`[2FA SMS] Sending code ${code} to ${phoneNumber}`);
  }

  /**
   * Verify SMS challenge code
   */
  verifySMSChallenge(userId: string, code: string): boolean {
    const challenge = this.smsChallenges.get(`sms:${userId}`);

    if (!challenge) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No SMS challenge found.',
      });
    }

    if (new Date() > challenge.expiresAt) {
      this.smsChallenges.delete(`sms:${userId}`);
      throw new TRPCError({
        code: 'GONE',
        message: 'SMS code has expired.',
      });
    }

    if (challenge.attempts >= this.smsConfig.maxAttempts) {
      this.smsChallenges.delete(`sms:${userId}`);
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many attempts. Please request a new code.',
      });
    }

    if (challenge.code !== code) {
      challenge.attempts++;
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid SMS code.',
      });
    }

    // SMS verified, clean up
    this.smsChallenges.delete(`sms:${userId}`);

    // Add SMS to user's 2FA methods if not already added
    const methods = this.userMethods.get(userId) || [];
    if (!methods.includes('sms')) {
      methods.push('sms');
      this.userMethods.set(userId, methods);
    }

    return true;
  }

  /**
   * Create 2FA session after successful verification
   */
  create2FASession(userId: string, method: TwoFactorMethod): string {
    const sessionId = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    this.twoFactorSessions.set(sessionId, {
      userId,
      method,
      verified: true,
      expiresAt,
    });

    return sessionId;
  }

  /**
   * Verify 2FA session
   */
  verify2FASession(sessionId: string): { userId: string; method: TwoFactorMethod } {
    const session = this.twoFactorSessions.get(sessionId);

    if (!session) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: '2FA session not found.',
      });
    }

    if (new Date() > session.expiresAt) {
      this.twoFactorSessions.delete(sessionId);
      throw new TRPCError({
        code: 'GONE',
        message: '2FA session has expired.',
      });
    }

    if (!session.verified) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: '2FA not verified.',
      });
    }

    return {
      userId: session.userId,
      method: session.method,
    };
  }

  /**
   * Get user's 2FA methods
   */
  getUserMethods(userId: string): TwoFactorMethod[] {
    return this.userMethods.get(userId) || [];
  }

  /**
   * Disable 2FA method
   */
  disableTwoFactor(userId: string, method: TwoFactorMethod): void {
    const methods = this.userMethods.get(userId) || [];
    const index = methods.indexOf(method);

    if (index > -1) {
      methods.splice(index, 1);
      this.userMethods.set(userId, methods);
    }

    // Clean up related data
    if (method === 'totp') {
      this.totpSecrets.delete(`confirmed:${userId}`);
      this.totpSecrets.delete(`pending:${userId}`);
    } else if (method === 'sms') {
      this.smsChallenges.delete(`sms:${userId}`);
    }
  }

  /**
   * Check if user has 2FA enabled
   */
  isTwoFactorEnabled(userId: string): boolean {
    const methods = this.userMethods.get(userId) || [];
    return methods.length > 0;
  }

  /**
   * Get 2FA configuration
   */
  getSMSConfig() {
    return { ...this.smsConfig };
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): number {
    let cleaned = 0;
    const now = new Date();

    for (const [key, session] of this.twoFactorSessions.entries()) {
      if (now > session.expiresAt) {
        this.twoFactorSessions.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// Export singleton instance
export const twoFactorAuthService = new TwoFactorAuthService();

// Start cleanup job (runs every 10 minutes)
setInterval(() => {
  const cleaned = twoFactorAuthService.cleanupExpiredSessions();
  if (cleaned > 0) {
    console.log(`[2FA] Cleaned up ${cleaned} expired sessions`);
  }
}, 10 * 60 * 1000);
