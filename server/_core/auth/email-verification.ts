import { z } from 'zod';
import crypto from 'crypto';
import { db } from '../../db';
import { TRPCError } from '@trpc/server';
import { ENV } from '../env';

// Email verification types
export type VerificationType = 'email_confirmation' | 'password_reset' | 'email_change';

interface VerificationToken {
  token: string;
  expiresAt: Date;
  type: VerificationType;
  email: string;
  userId?: string;
}

interface OTPConfig {
  length: number;
  expiryMinutes: number;
  maxAttempts: number;
}

interface MagicLinkConfig {
  expiryMinutes: number;
  baseUrl: string;
}

/**
 * Email Verification Service
 * Handles OTP and magic link generation, validation, and expiration
 */
export class EmailVerificationService {
  private verificationTokens: Map<string, VerificationToken> = new Map();
  private otpAttempts: Map<string, { count: number; resetAt: Date }> = new Map();

  private otpConfig: OTPConfig = {
    length: 6,
    expiryMinutes: 15,
    maxAttempts: 5,
  };

  private magicLinkConfig: MagicLinkConfig = {
    expiryMinutes: 24 * 60, // 24 hours
    get baseUrl() { return ENV.APP_BASE_URL; },
  };

  /**
   * Generate a 6-digit OTP
   */
  generateOTP(): string {
    const otp = crypto.randomInt(0, Math.pow(10, this.otpConfig.length)).toString();
    return otp.padStart(this.otpConfig.length, '0');
  }

  /**
   * Generate a secure magic link token
   */
  generateMagicLinkToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create OTP for email verification
   */
  createOTP(email: string, type: VerificationType = 'email_confirmation'): string {
    const otp = this.generateOTP();
    const expiresAt = new Date(Date.now() + this.otpConfig.expiryMinutes * 60 * 1000);

    // Store OTP (in production, use database)
    const key = `otp:${email}:${type}`;
    this.verificationTokens.set(key, {
      token: otp,
      expiresAt,
      type,
      email,
    });

    // Reset OTP attempts for new OTP
    this.otpAttempts.delete(`otp_attempts:${email}`);

    return otp;
  }

  /**
   * Verify OTP
   */
  verifyOTP(email: string, otp: string, type: VerificationType = 'email_confirmation'): boolean {
    const key = `otp:${email}:${type}`;
    const attemptsKey = `otp_attempts:${email}`;

    // Check attempts
    const attempts = this.otpAttempts.get(attemptsKey);
    if (attempts && attempts.count >= this.otpConfig.maxAttempts) {
      if (new Date() < attempts.resetAt) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many OTP attempts. Please try again later.',
        });
      } else {
        this.otpAttempts.delete(attemptsKey);
      }
    }

    const stored = this.verificationTokens.get(key);

    if (!stored) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'OTP not found. Please request a new one.',
      });
    }

    if (new Date() > stored.expiresAt) {
      this.verificationTokens.delete(key);
      throw new TRPCError({
        code: 'GONE',
        message: 'OTP has expired. Please request a new one.',
      });
    }

    if (stored.token !== otp) {
      // Increment attempts
      if (attempts) {
        attempts.count++;
      } else {
        this.otpAttempts.set(attemptsKey, {
          count: 1,
          resetAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minute lockout
        });
      }

      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid OTP.',
      });
    }

    // OTP verified, clean up
    this.verificationTokens.delete(key);
    this.otpAttempts.delete(attemptsKey);

    return true;
  }

  /**
   * Create magic link for email verification
   */
  createMagicLink(
    email: string,
    type: VerificationType = 'email_confirmation',
    userId?: string
  ): string {
    const token = this.generateMagicLinkToken();
    const expiresAt = new Date(Date.now() + this.magicLinkConfig.expiryMinutes * 60 * 1000);

    const key = `magic_link:${token}`;
    this.verificationTokens.set(key, {
      token,
      expiresAt,
      type,
      email,
      userId,
    });

    // Generate magic link URL
    const magicLink = `${this.magicLinkConfig.baseUrl}/auth/verify?token=${token}&type=${type}`;
    return magicLink;
  }

  /**
   * Verify magic link token
   */
  verifyMagicLink(token: string): { email: string; type: VerificationType; userId?: string } {
    const key = `magic_link:${token}`;
    const stored = this.verificationTokens.get(key);

    if (!stored) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Magic link not found or already used.',
      });
    }

    if (new Date() > stored.expiresAt) {
      this.verificationTokens.delete(key);
      throw new TRPCError({
        code: 'GONE',
        message: 'Magic link has expired.',
      });
    }

    // Magic link verified, clean up
    this.verificationTokens.delete(key);

    return {
      email: stored.email,
      type: stored.type,
      userId: stored.userId,
    };
  }

  /**
   * Check if email is verified
   */
  isEmailVerified(email: string): boolean {
    const key = `verified_email:${email}`;
    return this.verificationTokens.has(key);
  }

  /**
   * Mark email as verified
   */
  markEmailAsVerified(email: string): void {
    const key = `verified_email:${email}`;
    this.verificationTokens.set(key, {
      token: 'verified',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      type: 'email_confirmation',
      email,
    });
  }

  /**
   * Get verification status
   */
  getVerificationStatus(email: string): {
    isVerified: boolean;
    pendingVerifications: VerificationType[];
  } {
    const pendingVerifications: VerificationType[] = [];

    // Check for pending OTPs
    const otpKey = `otp:${email}:email_confirmation`;
    if (this.verificationTokens.has(otpKey)) {
      pendingVerifications.push('email_confirmation');
    }

    // Check for pending magic links
    for (const [key, value] of this.verificationTokens.entries()) {
      if (key.startsWith('magic_link:') && value.email === email) {
        if (!pendingVerifications.includes(value.type)) {
          pendingVerifications.push(value.type);
        }
      }
    }

    return {
      isVerified: this.isEmailVerified(email),
      pendingVerifications,
    };
  }

  /**
   * Clean up expired tokens (should be called periodically)
   */
  cleanupExpiredTokens(): number {
    let cleaned = 0;
    const now = new Date();

    for (const [key, value] of this.verificationTokens.entries()) {
      if (now > value.expiresAt) {
        this.verificationTokens.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get OTP configuration
   */
  getOTPConfig(): OTPConfig {
    return { ...this.otpConfig };
  }

  /**
   * Update OTP configuration
   */
  updateOTPConfig(config: Partial<OTPConfig>): void {
    this.otpConfig = { ...this.otpConfig, ...config };
  }
}

// Export singleton instance
export const emailVerificationService = new EmailVerificationService();

// Start cleanup job (runs every 5 minutes)
setInterval(() => {
  const cleaned = emailVerificationService.cleanupExpiredTokens();
  if (cleaned > 0) {
    console.log(`[Email Verification] Cleaned up ${cleaned} expired tokens`);
  }
}, 5 * 60 * 1000);
