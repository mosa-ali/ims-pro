import { router, publicProcedure, protectedProcedure } from '@/server/_core/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { db } from '@/server/db';
import { twoFactorAuth, twoFactorChallenges, users } from '@/drizzle/schema';
import { eq, and, isNull } from 'drizzle-orm';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

const SetupTOTPSchema = z.object({
  userId: z.number(),
  organizationId: z.number(),
});

const VerifyTOTPSchema = z.object({
  userId: z.number(),
  organizationId: z.number(),
  token: z.string().length(6, 'Token must be 6 digits'),
});

const SetupSMSSchema = z.object({
  userId: z.number(),
  organizationId: z.number(),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
});

const VerifySMSSchema = z.object({
  userId: z.number(),
  organizationId: z.number(),
  code: z.string().length(6, 'Code must be 6 digits'),
});

const VerifyBackupCodeSchema = z.object({
  userId: z.number(),
  organizationId: z.number(),
  backupCode: z.string(),
});

export const twoFactorRouter = router({
  // Setup TOTP - Generate secret and QR code
  setupTOTP: protectedProcedure
    .input(SetupTOTPSchema)
    .mutation(async ({ input }) => {
      try {
        // Generate TOTP secret
        const secret = speakeasy.generateSecret({
          name: `ClientSphere (${input.userId})`,
          issuer: 'ClientSphere',
          length: 32,
        });

        if (!secret.base32) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to generate TOTP secret',
          });
        }

        // Generate QR code
        const qrCode = await QRCode.toDataURL(secret.otpauth_url || '');

        // Generate 8 backup codes
        const backupCodes = Array.from({ length: 8 }, () => {
          return crypto.randomBytes(4).toString('hex').toUpperCase();
        });

        // Hash backup codes before storing
        const hashedBackupCodes = backupCodes.map((code) => {
          return crypto.createHash('sha256').update(code).digest('hex');
        });

        // Store temporary TOTP setup (not verified yet)
        await db
          .insert(twoFactorAuth)
          .values({
            userId: input.userId,
            organizationId: input.organizationId,
            method: 'totp',
            secret: secret.base32, // In production, encrypt this
            isEnabled: false,
            isVerified: false,
            backupCodes: hashedBackupCodes as any,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: input.userId,
          })
          .onDuplicateKeyUpdate({
            set: {
              secret: secret.base32,
              backupCodes: hashedBackupCodes as any,
              updatedAt: new Date(),
              updatedBy: input.userId,
            },
          });

        return {
          success: true,
          secret: secret.base32,
          qrCode,
          backupCodes, // Return unhashed codes to user (only shown once)
          message: 'TOTP setup initiated. Scan QR code and verify with 6-digit code.',
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('TOTP setup error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to setup TOTP',
        });
      }
    }),

  // Verify TOTP token
  verifyTOTP: protectedProcedure
    .input(VerifyTOTPSchema)
    .mutation(async ({ input }) => {
      try {
        // Get the TOTP setup record
        const totpRecord = await db
          .select()
          .from(twoFactorAuth)
          .where(
            and(
              eq(twoFactorAuth.userId, input.userId),
              eq(twoFactorAuth.organizationId, input.organizationId),
              eq(twoFactorAuth.method, 'totp'),
              isNull(twoFactorAuth.deletedAt)
            )
          )
          .limit(1);

        if (totpRecord.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'TOTP not setup for this user',
          });
        }

        // Verify token
        const verified = speakeasy.totp.verify({
          secret: totpRecord[0].secret,
          encoding: 'base32',
          token: input.token,
          window: 2, // Allow 2 time steps
        });

        if (!verified) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid TOTP token',
          });
        }

        // Mark as verified and enabled
        await db
          .update(twoFactorAuth)
          .set({
            isVerified: true,
            isEnabled: true,
            updatedAt: new Date(),
            updatedBy: input.userId,
          })
          .where(
            and(
              eq(twoFactorAuth.userId, input.userId),
              eq(twoFactorAuth.organizationId, input.organizationId),
              eq(twoFactorAuth.method, 'totp')
            )
          );

        return {
          success: true,
          message: 'TOTP verified and enabled successfully',
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('TOTP verification error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to verify TOTP',
        });
      }
    }),

  // Setup SMS 2FA
  setupSMS: protectedProcedure
    .input(SetupSMSSchema)
    .mutation(async ({ input }) => {
      try {
        // Generate 6-digit SMS code
        const smsCode = Math.floor(100000 + Math.random() * 900000).toString();

        // TODO: Send SMS code to phone number
        // await sendSMS(input.phoneNumber, `Your ClientSphere verification code is: ${smsCode}`);

        // Store SMS setup (not verified yet)
        await db
          .insert(twoFactorAuth)
          .values({
            userId: input.userId,
            organizationId: input.organizationId,
            method: 'sms',
            secret: smsCode, // Store code temporarily
            phoneNumber: input.phoneNumber,
            isEnabled: false,
            isVerified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: input.userId,
          })
          .onDuplicateKeyUpdate({
            set: {
              phoneNumber: input.phoneNumber,
              secret: smsCode,
              updatedAt: new Date(),
              updatedBy: input.userId,
            },
          });

        return {
          success: true,
          message: `SMS code sent to ${input.phoneNumber}`,
          // In development, return code for testing
          code: process.env.NODE_ENV === 'development' ? smsCode : undefined,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('SMS setup error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to setup SMS 2FA',
        });
      }
    }),

  // Verify SMS code
  verifySMS: protectedProcedure
    .input(VerifySMSSchema)
    .mutation(async ({ input }) => {
      try {
        // Get the SMS setup record
        const smsRecord = await db
          .select()
          .from(twoFactorAuth)
          .where(
            and(
              eq(twoFactorAuth.userId, input.userId),
              eq(twoFactorAuth.organizationId, input.organizationId),
              eq(twoFactorAuth.method, 'sms'),
              isNull(twoFactorAuth.deletedAt)
            )
          )
          .limit(1);

        if (smsRecord.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'SMS 2FA not setup for this user',
          });
        }

        // Verify code (in production, compare hashed codes)
        if (smsRecord[0].secret !== input.code) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid SMS code',
          });
        }

        // Mark as verified and enabled
        await db
          .update(twoFactorAuth)
          .set({
            isVerified: true,
            isEnabled: true,
            secret: '', // Clear the temporary code
            updatedAt: new Date(),
            updatedBy: input.userId,
          })
          .where(
            and(
              eq(twoFactorAuth.userId, input.userId),
              eq(twoFactorAuth.organizationId, input.organizationId),
              eq(twoFactorAuth.method, 'sms')
            )
          );

        return {
          success: true,
          message: 'SMS 2FA verified and enabled successfully',
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('SMS verification error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to verify SMS code',
        });
      }
    }),

  // Verify backup code (for account recovery)
  verifyBackupCode: protectedProcedure
    .input(VerifyBackupCodeSchema)
    .mutation(async ({ input }) => {
      try {
        // Get 2FA record with backup codes
        const twoFaRecord = await db
          .select()
          .from(twoFactorAuth)
          .where(
            and(
              eq(twoFactorAuth.userId, input.userId),
              eq(twoFactorAuth.organizationId, input.organizationId),
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

        // Hash the provided backup code and check against stored hashes
        const hashedInput = crypto
          .createHash('sha256')
          .update(input.backupCode)
          .digest('hex');

        const backupCodes = twoFaRecord[0].backupCodes as string[];
        const codeIndex = backupCodes.indexOf(hashedInput);

        if (codeIndex === -1) {
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
            updatedBy: input.userId,
          })
          .where(
            and(
              eq(twoFactorAuth.userId, input.userId),
              eq(twoFactorAuth.organizationId, input.organizationId)
            )
          );

        return {
          success: true,
          message: 'Backup code verified and consumed',
          remainingCodes: backupCodes.length,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Backup code verification error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to verify backup code',
        });
      }
    }),

  // Disable 2FA
  disable2FA: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        organizationId: z.number(),
        method: z.enum(['totp', 'sms']),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await db
          .update(twoFactorAuth)
          .set({
            isEnabled: false,
            isVerified: false,
            deletedAt: new Date(),
            deletedBy: input.userId,
            updatedAt: new Date(),
            updatedBy: input.userId,
          })
          .where(
            and(
              eq(twoFactorAuth.userId, input.userId),
              eq(twoFactorAuth.organizationId, input.organizationId),
              eq(twoFactorAuth.method, input.method)
            )
          );

        return {
          success: true,
          message: `${input.method.toUpperCase()} 2FA disabled`,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Disable 2FA error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to disable 2FA',
        });
      }
    }),

  // Get 2FA status
  get2FAStatus: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        organizationId: z.number(),
      })
    )
    .query(async ({ input }) => {
      try {
        const twoFaRecords = await db
          .select()
          .from(twoFactorAuth)
          .where(
            and(
              eq(twoFactorAuth.userId, input.userId),
              eq(twoFactorAuth.organizationId, input.organizationId),
              isNull(twoFactorAuth.deletedAt)
            )
          );

        const status = {
          totp: {
            enabled: false,
            verified: false,
          },
          sms: {
            enabled: false,
            verified: false,
            phoneNumber: null as string | null,
          },
        };

        twoFaRecords.forEach((record) => {
          if (record.method === 'totp') {
            status.totp.enabled = record.isEnabled === 1;
            status.totp.verified = record.isVerified === 1;
          } else if (record.method === 'sms') {
            status.sms.enabled = record.isEnabled === 1;
            status.sms.verified = record.isVerified === 1;
            status.sms.phoneNumber = record.phoneNumber;
          }
        });

        return status;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error('Get 2FA status error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get 2FA status',
        });
      }
    }),
});
