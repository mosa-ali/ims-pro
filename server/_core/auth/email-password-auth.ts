import { z } from 'zod';
import { getDb } from '../../db';
import { users } from '../../../drizzle/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { createHash } from 'crypto';

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

const EmailPasswordAuthSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type EmailPasswordAuthInput = z.infer<typeof EmailPasswordAuthSchema>;

interface AuthUser {
  id: number;
  email: string;
  name: string;
  organizationId?: number;
  role: string;
}

export class EmailPasswordAuthService {
  /**
   * ✅ HARDENED: User registration is DISABLED
   * 
   * SECURITY FIX: Users must be pre-created by admin
   * System NEVER auto-creates users
   */
  async registerUser(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    organizationId?: number,
    operatingUnitId?: number
  ): Promise<AuthUser> {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'User registration is disabled. Please contact your administrator to create an account.',
    });
  }

  /**
   * Authenticate user with email and password
   */
  async authenticateUser(email: string, password: string): Promise<AuthUser> {
    try {
      EmailPasswordAuthSchema.parse({ email, password });

      const db = await getDb();

      const [user] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.email, email.toLowerCase()),
            eq(users.isDeleted, 0)
          )
        )
        .limit(1);

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        });
      }

      if (!user.isActive) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'User account is not active',
        });
      }

      if (!user.passwordHash || !verifyPassword(password, user.passwordHash)) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        });
      }

      // ✅ Validate user has required fields
      if (!user.email || !user.name || !user.organizationId) {
        console.error(
          `[Email Auth] User has incomplete data: ID=${user.id}, email=${user.email}, name=${user.name}, orgId=${user.organizationId}`
        );
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Your user account is not properly configured. Please contact your administrator.',
        });
      }

      // ✅ Update last sign-in time
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 19).replace('T', ' ');
      await db
        .update(users)
        .set({ lastSignedIn: timestamp })
        .where(eq(users.id, user.id));

      return {
        id: user.id,
        email: user.email ?? email.toLowerCase(),
        name: user.name ?? email,
        organizationId: user.organizationId ?? undefined,
        role: user.role,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error('User authentication error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Authentication failed',
      });
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<void> {
    try {
      EmailPasswordAuthSchema.parse({ email: 'test@example.com', password: newPassword });

      const db = await getDb();

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      if (!user.passwordHash || !verifyPassword(oldPassword, user.passwordHash)) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Current password is incorrect',
        });
      }

      await db
        .update(users)
        .set({ passwordHash: hashPassword(newPassword) })
        .where(eq(users.id, userId));
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error('Password change error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to change password',
      });
    }
  }

  /**
   * Reset password (admin or forgot password flow)
   */
  async resetPassword(userId: number, newPassword: string, resetBy: string): Promise<void> {
    try {
      EmailPasswordAuthSchema.parse({ email: 'test@example.com', password: newPassword });

      const db = await getDb();
      await db
        .update(users)
        .set({ passwordHash: hashPassword(newPassword) })
        .where(eq(users.id, userId));
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error('Password reset error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to reset password',
      });
    }
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (password.length < 8) errors.push('Password must be at least 8 characters');
    if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
    if (!/[0-9]/.test(password)) errors.push('Password must contain at least one number');
    if (!/[!@#$%^&*]/.test(password)) errors.push('Password must contain at least one special character (!@#$%^&*)');
    return { valid: errors.length === 0, errors };
  }
}

export function createEmailPasswordAuthService(): EmailPasswordAuthService {
  return new EmailPasswordAuthService();
}