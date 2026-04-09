import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { getDb } from '../db';
import {
  generateEmailVerificationToken,
  verifyEmailToken,
  isEmailVerified,
  sendVerificationEmail,
  resendVerificationEmail,
} from '../services/emailVerificationService';

export const emailVerificationRouter = router({
  /**
   * Verify email with token
   */
  verifyEmail: publicProcedure
    .input(z.object({
      token: z.string().min(1),
      otp: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const result = await verifyEmailToken(input.token, input.otp);

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to verify email',
          });
        }

        return {
          success: true,
          message: 'Email verified successfully',
          userId: result.userId,
          email: result.email,
        };
      } catch (err: any) {
        console.error('Failed to verify email:', err);
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to verify email',
        });
      }
    }),

  /**
   * Check if user email is verified
   */
  isEmailVerified: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const verified = await isEmailVerified(ctx.user.id);
        return { verified };
      } catch (err) {
        console.error('Failed to check email verification status:', err);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to check email verification status',
        });
      }
    }),

  /**
   * Resend verification email
   */
  resendVerificationEmail: protectedProcedure
    .input(z.object({
      verificationLink: z.string().url(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await resendVerificationEmail(
          ctx.user.id,
          input.verificationLink
        );

        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.error || 'Failed to resend verification email',
          });
        }

        return {
          success: true,
          message: 'Verification email sent successfully',
        };
      } catch (err: any) {
        console.error('Failed to resend verification email:', err);
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to resend verification email',
        });
      }
    }),

  /**
   * Send verification email for new user (admin only)
   */
  sendVerificationEmailForNewUser: protectedProcedure
    .input(z.object({
      userId: z.number(),
      email: z.string().email(),
      verificationLink: z.string().url(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if user is admin
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only admins can send verification emails',
          });
        }

        const database = await getDb();
        const { users } = await import('@/drizzle/schema');
        const { eq } = await import('drizzle-orm');

        const [user] = await database.select().from(users)
          .where(eq(users.id, input.userId))
          .limit(1);

        if (!user) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        }

        const { token } = await generateEmailVerificationToken(
          input.userId,
          input.email,
          'magic_link'
        );

        await sendVerificationEmail(
          user.currentOrganizationId || 0,
          input.email,
          user.name || 'User',
          token,
          input.verificationLink
        );

        return {
          success: true,
          message: 'Verification email sent successfully',
        };
      } catch (err: any) {
        console.error('Failed to send verification email:', err);
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send verification email',
        });
      }
    }),
});
