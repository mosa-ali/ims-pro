import { router, publicProcedure, protectedProcedure } from '@/server/_core/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { db } from '@/server/db';
import { accountRecoveryRequests, twoFactorAuth, emailVerificationTokens, users } from '@/drizzle/schema';
import { eq, and, isNull, gt } from 'drizzle-orm';
import * as crypto from 'crypto';

const InitiateRecoverySchema = z.object({
  userId: z.number(),
  organizationId: z.number(),
  email: z.string().email(),
  recoveryMethod: z.enum(['backup_code', 'email', 'support']),
  reason: z.string().optional(),
});

const VerifyRecoveryCodeSchema = z.object({
  recoveryToken: z.string(),
  code: z.string(),
});

const CompleteRecoverySchema = z.object({
  recoveryToken: z.string(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

const ResendRecoveryEmailSchema = z.object({
  recoveryToken: z.string(),
});

export const accountRecoveryRouter = router({
  // Initiate account recovery
  initiateRecovery: publicProcedure
    .input(InitiateRecoverySchema)
    .mutation(async ({ input }) => {
      try {
        // Check if user exists
        const user = await db
          .select()
          .from(users)
          .where(
            and(eq(users.id, input.userId), isNull(users.deletedAt))
          )
          .limit(1);

        if (user.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        }

        // Generate recovery token
        const recoveryToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

        // Create recovery request
        await db.insert(accountRecoveryRequests).values({
          userId: input.userId,
          organizationId: input.organizationId,
          email: input.email,
          recoveryMethod: input.recoveryMethod,
          recoveryToken,
          status: 'pending',
          attemptCount: 0,
          maxAttempts: 3,
          expiresAt,
          reason: input.reason || null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        });

        if (input.recoveryMethod === 'backup_code') {
          return {
            success: true,
            recoveryToken,
            message: 'Recovery initiated. Please provide a backup code.',
            nextStep: 'verify_backup_code',
          };
        } else if (input.recoveryMethod === 'email') {
          // Generate OTP for email verification
          const otp = Math.floor(100000 + Math.random() * 900000).toString();
          const emailToken = crypto.randomBytes(32).toString('hex');

          await db.insert(emailVerificationTokens).values({
            userId: input.userId,
            email: input.email,
            token: emailToken,
            tokenType: 'otp',
            otp,
            isVerified: false,
            attemptCount: 0,
            maxAttempts: 5,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            createdAt: new Date(),
            deletedAt: null,
          });

          // TODO: Send OTP via email
          // await sendEmail({
          //   to: input.email,
          //   subject: 'Account Recovery - Verification Code',
          //   html: `<p>Your account recovery code is: <strong>${otp}</strong></p>`,
          // });

          return {
            success: true,
            recoveryToken,
            message: 'Recovery code sent to your email',
            nextStep: 'verify_email',
            otp: process.env.NODE_ENV === 'development' ? otp : undefined,
          };
        } else {
          // Support recovery - manual review
          // TODO: Notify support team
          // await notifySupport({
          //   userId: input.userId,
          //   reason: input.reason,
          //   email: input.email,
          // });

          return {
            success: true,
            recoveryToken,
            message: 'Recovery request submitted. Support team will contact you soon.',
            nextStep: 'wait_for_support',
          };
        }
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Initiate recovery error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to initiate account recovery',
        });
      }
    }),

  // Verify backup code for recovery
  verifyBackupCodeRecovery: publicProcedure
    .input(VerifyRecoveryCodeSchema)
    .mutation(async ({ input }) => {
      try {
        // Get recovery request
        const recoveryRequest = await db
          .select()
          .from(accountRecoveryRequests)
          .where(
            and(
              eq(accountRecoveryRequests.recoveryToken, input.recoveryToken),
              eq(accountRecoveryRequests.recoveryMethod, 'backup_code'),
              eq(accountRecoveryRequests.status, 'pending'),
              isNull(accountRecoveryRequests.deletedAt)
            )
          )
          .limit(1);

        if (recoveryRequest.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Recovery request not found',
          });
        }

        const request = recoveryRequest[0];

        // Check if expired
        if (new Date() > new Date(request.expiresAt)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Recovery request has expired',
          });
        }

        // Check attempt count
        if (request.attemptCount >= request.maxAttempts) {
          throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many failed attempts. Please request a new recovery.',
          });
        }

        // Get 2FA record with backup codes
        const twoFaRecord = await db
          .select()
          .from(twoFactorAuth)
          .where(
            and(
              eq(twoFactorAuth.userId, request.userId),
              eq(twoFactorAuth.organizationId, request.organizationId),
              isNull(twoFactorAuth.deletedAt)
            )
          )
          .limit(1);

        if (twoFaRecord.length === 0 || !twoFaRecord[0].backupCodes) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'No backup codes found',
          });
        }

        // Verify backup code
        const hashedInput = crypto
          .createHash('sha256')
          .update(input.code)
          .digest('hex');

        const backupCodes = twoFaRecord[0].backupCodes as string[];
        const codeIndex = backupCodes.indexOf(hashedInput);

        if (codeIndex === -1) {
          // Increment attempt count
          await db
            .update(accountRecoveryRequests)
            .set({
              attemptCount: request.attemptCount + 1,
            })
            .where(eq(accountRecoveryRequests.recoveryToken, input.recoveryToken));

          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid backup code',
          });
        }

        // Remove used backup code
        backupCodes.splice(codeIndex, 1);

        await db
          .update(twoFactorAuth)
          .set({
            backupCodes: backupCodes as any,
            updatedAt: new Date(),
          })
          .where(eq(twoFactorAuth.id, twoFaRecord[0].id));

        // Mark recovery as verified
        await db
          .update(accountRecoveryRequests)
          .set({
            status: 'verified',
            verifiedAt: new Date(),
          })
          .where(eq(accountRecoveryRequests.recoveryToken, input.recoveryToken));

        return {
          success: true,
          message: 'Backup code verified. You can now reset your password.',
          nextStep: 'reset_password',
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Verify backup code recovery error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to verify backup code',
        });
      }
    }),

  // Complete account recovery (reset password)
  completeRecovery: publicProcedure
    .input(CompleteRecoverySchema)
    .mutation(async ({ input }) => {
      try {
        // Get recovery request
        const recoveryRequest = await db
          .select()
          .from(accountRecoveryRequests)
          .where(
            and(
              eq(accountRecoveryRequests.recoveryToken, input.recoveryToken),
              eq(accountRecoveryRequests.status, 'verified'),
              isNull(accountRecoveryRequests.deletedAt)
            )
          )
          .limit(1);

        if (recoveryRequest.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Recovery request not found or not verified',
          });
        }

        const request = recoveryRequest[0];

        // Check if expired
        if (new Date() > new Date(request.expiresAt)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Recovery request has expired',
          });
        }

        // Hash new password
        const bcryptjs = require('bcryptjs');
        const passwordHash = await bcryptjs.hash(input.newPassword, 10);

        // Update user password
        await db
          .update(users)
          .set({
            passwordHash,
            updatedAt: new Date(),
          })
          .where(eq(users.id, request.userId));

        // Mark recovery as completed
        await db
          .update(accountRecoveryRequests)
          .set({
            status: 'completed',
            completedAt: new Date(),
          })
          .where(eq(accountRecoveryRequests.recoveryToken, input.recoveryToken));

        return {
          success: true,
          message: 'Account recovery completed. You can now login with your new password.',
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Complete recovery error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to complete account recovery',
        });
      }
    }),

  // Get recovery status
  getRecoveryStatus: publicProcedure
    .input(z.object({ recoveryToken: z.string() }))
    .query(async ({ input }) => {
      try {
        const recoveryRequest = await db
          .select()
          .from(accountRecoveryRequests)
          .where(
            and(
              eq(accountRecoveryRequests.recoveryToken, input.recoveryToken),
              isNull(accountRecoveryRequests.deletedAt)
            )
          )
          .limit(1);

        if (recoveryRequest.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Recovery request not found',
          });
        }

        const request = recoveryRequest[0];

        // Check if expired
        const isExpired = new Date() > new Date(request.expiresAt);

        return {
          status: request.status,
          method: request.recoveryMethod,
          isExpired,
          expiresAt: request.expiresAt,
          attemptsRemaining: Math.max(0, request.maxAttempts - request.attemptCount),
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Get recovery status error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get recovery status',
        });
      }
    }),

  // Resend recovery email
  resendRecoveryEmail: publicProcedure
    .input(ResendRecoveryEmailSchema)
    .mutation(async ({ input }) => {
      try {
        // Get recovery request
        const recoveryRequest = await db
          .select()
          .from(accountRecoveryRequests)
          .where(
            and(
              eq(accountRecoveryRequests.recoveryToken, input.recoveryToken),
              eq(accountRecoveryRequests.recoveryMethod, 'email'),
              eq(accountRecoveryRequests.status, 'pending'),
              isNull(accountRecoveryRequests.deletedAt)
            )
          )
          .limit(1);

        if (recoveryRequest.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Recovery request not found',
          });
        }

        // Generate new OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const emailToken = crypto.randomBytes(32).toString('hex');

        await db.insert(emailVerificationTokens).values({
          userId: recoveryRequest[0].userId,
          email: recoveryRequest[0].email,
          token: emailToken,
          tokenType: 'otp',
          otp,
          isVerified: false,
          attemptCount: 0,
          maxAttempts: 5,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          createdAt: new Date(),
          deletedAt: null,
        });

        // TODO: Send OTP via email
        // await sendEmail({...});

        return {
          success: true,
          message: 'Recovery code resent to your email',
          otp: process.env.NODE_ENV === 'development' ? otp : undefined,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Resend recovery email error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to resend recovery email',
        });
      }
    }),
});
