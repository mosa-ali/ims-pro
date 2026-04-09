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
   * Register a new user with email and password
   */
  async registerUser(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    organizationId?: number,
    operatingUnitId?: number
  ): Promise<AuthUser> {
    try {
      EmailPasswordAuthSchema.parse({ email, password });

      const db = await getDb();

      // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (existingUser.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User with this email already exists',
        });
      }

      const passwordHash = hashPassword(password);
      const fullName = [firstName, lastName].filter(Boolean).join(' ') || email;

      // Insert — id is auto-increment, do not set it
      await db.insert(users).values({
        email: email.toLowerCase(),
        name: fullName,
        passwordHash,
        organizationId: organizationId ?? null,
        isActive: 1,
        role: 'user',
        authenticationProvider: 'email',
      });

      // Fetch the newly created user to get the auto-assigned id
      const [newUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      return {
        id: newUser.id,
        email: newUser.email ?? email.toLowerCase(),
        name: newUser.name ?? fullName,
        organizationId: newUser.organizationId ?? undefined,
        role: newUser.role,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error('User registration error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to register user',
      });
    }
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

      // Update last sign-in time
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
