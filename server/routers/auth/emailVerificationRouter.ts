import { router, publicProcedure, protectedProcedure } from '@/server/_core/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { db } from '@/server/db';
import { emailVerificationTokens, users } from '@/drizzle/schema';
import { eq, and, isNull, gt } from 'drizzle-orm';
import * as crypto from 'crypto';
import { ENV } from '@/server/_core/env';

const SendOTPSchema = z.object({
  userId: z.number(),
  email: z.string().email('Invalid email address'),
});

const VerifyOTPSchema = z.object({
  userId: z.number(),
  token: z.string(),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

const SendMagicLinkSchema = z.object({
  userId: z.number(),
  email: z.string().email('Invalid email address'),
});

const VerifyMagicLinkSchema = z.object({
  userId: z.number(),
  token: z.string(),
});

const ResendTokenSchema = z.object({
  userId: z.number(),
  email: z.string().email('Invalid email address'),
  tokenType: z.enum(['otp', 'magic_link']),
});

export const emailVerificationRouter = router({
  // Send OTP to email
  sendOTP: publicProcedure
    .input(SendOTPSchema)
    .mutation(async ({ input }) => {
      try {
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Generate token
        const token = crypto.randomBytes(32).toString('hex');

        // Expiry: 15 minutes
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        // Store OTP token
        await db.insert(emailVerificationTokens).values({
          userId: input.userId,
          email: input.email,
          token,
          tokenType: 'otp',
          otp,
          isVerified: false,
          attemptCount: 0,
          maxAttempts: 5,
          expiresAt,
          createdAt: new Date(),
          deletedAt: null,
        });

        // TODO: Send OTP via email
        // await sendEmail({
        //   to: input.email,
        //   subject: 'Your ClientSphere Verification Code',
        //   html: `<p>Your verification code is: <strong>${otp}</strong></p><p>This code expires in 15 minutes.</p>`,
        // });

        return {
          success: true,
          token, // Return token for frontend to use in verification
          message: 'OTP sent to your email',
          // In development, return OTP for testing
          otp: process.env.NODE_ENV === 'development' ? otp : undefined,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Send OTP error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send OTP',
        });
      }
    }),

  // Verify OTP
  verifyOTP: publicProcedure
    .input(VerifyOTPSchema)
    .mutation(async ({ input }) => {
      try {
        // Get the OTP token record
        const tokenRecord = await db
          .select()
          .from(emailVerificationTokens)
          .where(
            and(
              eq(emailVerificationTokens.token, input.token),
              eq(emailVerificationTokens.tokenType, 'otp'),
              isNull(emailVerificationTokens.deletedAt)
            )
          )
          .limit(1);

        if (tokenRecord.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Verification token not found',
          });
        }

        const record = tokenRecord[0];

        // Check if token is expired
        if (new Date() > new Date(record.expiresAt)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Verification code has expired',
          });
        }

        // Check attempt count
        if (record.attemptCount >= record.maxAttempts) {
          throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many failed attempts. Please request a new code.',
          });
        }

        // Verify OTP
        if (record.otp !== input.otp) {
          // Increment attempt count
          await db
            .update(emailVerificationTokens)
            .set({
              attemptCount: record.attemptCount + 1,
            })
            .where(eq(emailVerificationTokens.token, input.token));

          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid verification code',
          });
        }

        // Mark as verified
        await db
          .update(emailVerificationTokens)
          .set({
            isVerified: true,
            verifiedAt: new Date(),
          })
          .where(eq(emailVerificationTokens.token, input.token));

        // Update user email if not already set
        if (input.userId) {
          await db
            .update(users)
            .set({
              email: record.email,
              updatedAt: new Date(),
            })
            .where(eq(users.id, input.userId));
        }

        return {
          success: true,
          message: 'Email verified successfully',
          email: record.email,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Verify OTP error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to verify OTP',
        });
      }
    }),

  // Send magic link
  sendMagicLink: publicProcedure
    .input(SendMagicLinkSchema)
    .mutation(async ({ input }) => {
      try {
        // Generate token
        const token = crypto.randomBytes(32).toString('hex');

        // Expiry: 24 hours
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Store magic link token
        await db.insert(emailVerificationTokens).values({
          userId: input.userId,
          email: input.email,
          token,
          tokenType: 'magic_link',
          isVerified: false,
          attemptCount: 0,
          maxAttempts: 5,
          expiresAt,
          createdAt: new Date(),
          deletedAt: null,
        });

        // Generate magic link
        const magicLink = `${ENV.APP_BASE_URL}/verify-email?token=${token}`;

        // TODO: Send magic link via email
        // await sendEmail({
        //   to: input.email,
        //   subject: 'Verify Your ClientSphere Email',
        //   html: `<p><a href="${magicLink}">Click here to verify your email</a></p><p>This link expires in 24 hours.</p>`,
        // });

        return {
          success: true,
          token,
          message: 'Magic link sent to your email',
          // In development, return link for testing
          magicLink: process.env.NODE_ENV === 'development' ? magicLink : undefined,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Send magic link error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send magic link',
        });
      }
    }),

  // Verify magic link
  verifyMagicLink: publicProcedure
    .input(VerifyMagicLinkSchema)
    .mutation(async ({ input }) => {
      try {
        // Get the magic link token record
        const tokenRecord = await db
          .select()
          .from(emailVerificationTokens)
          .where(
            and(
              eq(emailVerificationTokens.token, input.token),
              eq(emailVerificationTokens.tokenType, 'magic_link'),
              isNull(emailVerificationTokens.deletedAt)
            )
          )
          .limit(1);

        if (tokenRecord.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Verification link not found or already used',
          });
        }

        const record = tokenRecord[0];

        // Check if token is expired
        if (new Date() > new Date(record.expiresAt)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Verification link has expired',
          });
        }

        // Mark as verified
        await db
          .update(emailVerificationTokens)
          .set({
            isVerified: true,
            verifiedAt: new Date(),
          })
          .where(eq(emailVerificationTokens.token, input.token));

        // Update user email if not already set
        if (input.userId) {
          await db
            .update(users)
            .set({
              email: record.email,
              updatedAt: new Date(),
            })
            .where(eq(users.id, input.userId));
        }

        return {
          success: true,
          message: 'Email verified successfully',
          email: record.email,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Verify magic link error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to verify magic link',
        });
      }
    }),

  // Resend verification token
  resendToken: publicProcedure
    .input(ResendTokenSchema)
    .mutation(async ({ input }) => {
      try {
        // Delete old tokens for this email
        await db
          .update(emailVerificationTokens)
          .set({
            deletedAt: new Date(),
          })
          .where(
            and(
              eq(emailVerificationTokens.userId, input.userId),
              eq(emailVerificationTokens.email, input.email),
              eq(emailVerificationTokens.tokenType, input.tokenType),
              isNull(emailVerificationTokens.deletedAt)
            )
          );

        if (input.tokenType === 'otp') {
          // Generate new OTP
          const otp = Math.floor(100000 + Math.random() * 900000).toString();
          const token = crypto.randomBytes(32).toString('hex');
          const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

          await db.insert(emailVerificationTokens).values({
            userId: input.userId,
            email: input.email,
            token,
            tokenType: 'otp',
            otp,
            isVerified: false,
            attemptCount: 0,
            maxAttempts: 5,
            expiresAt,
            createdAt: new Date(),
            deletedAt: null,
          });

          // TODO: Send OTP via email
          // await sendEmail({...});

          return {
            success: true,
            token,
            message: 'New OTP sent to your email',
            otp: process.env.NODE_ENV === 'development' ? otp : undefined,
          };
        } else {
          // Generate new magic link
          const token = crypto.randomBytes(32).toString('hex');
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

          await db.insert(emailVerificationTokens).values({
            userId: input.userId,
            email: input.email,
            token,
            tokenType: 'magic_link',
            isVerified: false,
            attemptCount: 0,
            maxAttempts: 5,
            expiresAt,
            createdAt: new Date(),
            deletedAt: null,
          });

          const magicLink = `${ENV.APP_BASE_URL}/verify-email?token=${token}`;

          // TODO: Send magic link via email
          // await sendEmail({...});

          return {
            success: true,
            token,
            message: 'New magic link sent to your email',
            magicLink: process.env.NODE_ENV === 'development' ? magicLink : undefined,
          };
        }
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Resend token error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to resend verification token',
        });
      }
    }),

  // Check if email is verified
  isEmailVerified: publicProcedure
    .input(
      z.object({
        userId: z.number(),
        email: z.string().email(),
      })
    )
    .query(async ({ input }) => {
      try {
        const verified = await db
          .select()
          .from(emailVerificationTokens)
          .where(
            and(
              eq(emailVerificationTokens.userId, input.userId),
              eq(emailVerificationTokens.email, input.email),
              eq(emailVerificationTokens.isVerified, true),
              isNull(emailVerificationTokens.deletedAt)
            )
          )
          .limit(1);

        return {
          isVerified: verified.length > 0,
          verifiedAt: verified.length > 0 ? verified[0].verifiedAt : null,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Check email verified error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to check email verification status',
        });
      }
    }),
});
