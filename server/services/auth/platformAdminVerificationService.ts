import { TRPCError } from '@trpc/server';
import { getDb } from '../../db';
import { users, emailVerificationTokens } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Platform Admin Email Verification Service
 * Handles OTP-based email verification for platform admins
 * Ensures platform admins verify their public domain email addresses
 */
export class PlatformAdminVerificationService {
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MINUTES = 15;
  private readonly MAX_ATTEMPTS = 5;

  /**
   * Generate a 6-digit OTP
   */
  generateOTP(): string {
    const otp = crypto.randomInt(0, Math.pow(10, this.OTP_LENGTH)).toString();
    return otp.padStart(this.OTP_LENGTH, '0');
  }

  /**
   * Create OTP for platform admin email verification
   */
  async createOTPForPlatformAdmin(email: string): Promise<string> {
    try {
      const db = await getDb();
      const otp = this.generateOTP();
      const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

      // Check if there's an existing token for this email
      const existingToken = await db
        .select()
        .from(emailVerificationTokens)
        .where(eq(emailVerificationTokens.email, email.toLowerCase()))
        .limit(1);

      if (existingToken && existingToken.length > 0) {
        // Update existing token
        await db
          .update(emailVerificationTokens)
          .set({
            otp,
            isVerified: 0,
            attemptCount: 0,
            expiresAt: expiresAt.toISOString(),
            tokenType: 'otp',
          })
          .where(eq(emailVerificationTokens.email, email.toLowerCase()));
      } else {
        // Create new token
        await db.insert(emailVerificationTokens).values({
          email: email.toLowerCase(),
          otp,
          tokenType: 'otp',
          token: crypto.randomBytes(32).toString('hex'),
          isVerified: 0,
          attemptCount: 0,
          maxAttempts: this.MAX_ATTEMPTS,
          expiresAt: expiresAt.toISOString(),
        });
      }

      return otp;
    } catch (error) {
      console.error('Error creating OTP for platform admin:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create verification OTP',
      });
    }
  }

  /**
   * Verify OTP for platform admin
   */
  async verifyOTPForPlatformAdmin(email: string, otp: string): Promise<boolean> {
    try {
      const db = await getDb();

      const token = await db
        .select()
        .from(emailVerificationTokens)
        .where(eq(emailVerificationTokens.email, email.toLowerCase()))
        .limit(1);

      if (!token || token.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'OTP not found. Please request a new one.',
        });
      }

      const verificationToken = token[0];

      // Check if token has expired
      if (new Date(verificationToken.expiresAt) < new Date()) {
        throw new TRPCError({
          code: 'GONE',
          message: 'OTP has expired. Please request a new one.',
        });
      }

      // Check attempt count
      if (verificationToken.attemptCount >= verificationToken.maxAttempts) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many failed attempts. Please request a new OTP.',
        });
      }

      // Verify OTP
      if (verificationToken.otp !== otp) {
        // Increment attempt count
        await db
          .update(emailVerificationTokens)
          .set({
            attemptCount: verificationToken.attemptCount + 1,
          })
          .where(eq(emailVerificationTokens.email, email.toLowerCase()));

        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid OTP. Please try again.',
        });
      }

      // OTP verified - mark as verified
      await db
        .update(emailVerificationTokens)
        .set({
          isVerified: 1,
          verifiedAt: new Date().toISOString(),
        })
        .where(eq(emailVerificationTokens.email, email.toLowerCase()));

      // Update user's email verification status
      await db
        .update(users)
        .set({
          emailVerified: 1,
          emailVerifiedAt: new Date().toISOString(),
        })
        .where(eq(users.email, email.toLowerCase()));

      return true;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error('Error verifying OTP for platform admin:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to verify OTP',
      });
    }
  }

  /**
   * Check if platform admin email is verified
   */
  async isPlatformAdminEmailVerified(email: string): Promise<boolean> {
    try {
      const db = await getDb();

      const user = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (!user || user.length === 0) {
        return false;
      }

      return user[0].emailVerified === 1;
    } catch (error) {
      console.error('Error checking platform admin email verification:', error);
      return false;
    }
  }

  /**
   * Get verification status for platform admin
   */
  async getVerificationStatus(email: string): Promise<{
    isVerified: boolean;
    expiresAt?: string;
    attemptsRemaining?: number;
  }> {
    try {
      const db = await getDb();

      const token = await db
        .select()
        .from(emailVerificationTokens)
        .where(eq(emailVerificationTokens.email, email.toLowerCase()))
        .limit(1);

      if (!token || token.length === 0) {
        return { isVerified: false };
      }

      const verificationToken = token[0];

      return {
        isVerified: verificationToken.isVerified === 1,
        expiresAt: verificationToken.expiresAt,
        attemptsRemaining: Math.max(
          0,
          verificationToken.maxAttempts - verificationToken.attemptCount
        ),
      };
    } catch (error) {
      console.error('Error getting verification status:', error);
      return { isVerified: false };
    }
  }

  /**
   * Resend OTP to platform admin
   */
  async resendOTP(email: string): Promise<string> {
    try {
      const db = await getDb();

      // Check if user exists and is platform admin
      const user = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (!user || user.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      const userRecord = user[0];
      if (userRecord.role !== 'platform_admin' && userRecord.role !== 'platform_super_admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only platform admins can request OTP resend',
        });
      }

      // Create new OTP
      return this.createOTPForPlatformAdmin(email);
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error('Error resending OTP:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to resend OTP',
      });
    }
  }
}

// Export singleton instance
export const platformAdminVerificationService = new PlatformAdminVerificationService();
