import { getDb } from '../db';
import { users } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Configuration for login rate limiting
 */
export interface LoginRateLimitConfig {
  maxAttempts: number; // Maximum failed attempts
  lockoutDurationMinutes: number; // How long to lock account
  attemptWindowMinutes: number; // Time window to count attempts
}

const DEFAULT_CONFIG: LoginRateLimitConfig = {
  maxAttempts: 5,
  lockoutDurationMinutes: 30,
  attemptWindowMinutes: 15,
};

/**
 * Check if account is locked
 */
export async function isAccountLocked(userId: number): Promise<{
  locked: boolean;
  remainingMinutes?: number;
}> {
  const database = await getDb();

  const [user] = await database.select().from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return { locked: false };
  }

  if (!user.lockoutUntil) {
    return { locked: false };
  }

  const lockoutUntil = new Date(user.lockoutUntil);
  const now = new Date();

  if (lockoutUntil <= now) {
    // Lockout has expired, unlock the account
    await database.update(users)
      .set({
        lockoutUntil: null,
        loginAttempts: 0,
      })
      .where(eq(users.id, userId));

    return { locked: false };
  }

  const remainingMs = lockoutUntil.getTime() - now.getTime();
  const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));

  return {
    locked: true,
    remainingMinutes,
  };
}

/**
 * Record a failed login attempt
 */
export async function recordFailedLoginAttempt(
  userId: number,
  config: LoginRateLimitConfig = DEFAULT_CONFIG
): Promise<{
  success: boolean;
  locked: boolean;
  attemptsRemaining: number;
  lockoutUntil?: Date;
  error?: string;
}> {
  const database = await getDb();

  const [user] = await database.select().from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return {
      success: false,
      locked: false,
      attemptsRemaining: 0,
      error: 'User not found',
    };
  }

  // Check if account is already locked
  const lockStatus = await isAccountLocked(userId);
  if (lockStatus.locked) {
    return {
      success: false,
      locked: true,
      attemptsRemaining: 0,
      lockoutUntil: new Date(user.lockoutUntil!),
    };
  }

  // Get current attempt count
  let currentAttempts = user.loginAttempts || 0;
  const lastAttemptTime = user.lastLoginAttempt ? new Date(user.lastLoginAttempt) : null;
  const now = new Date();

  // Reset attempts if outside the window
  if (lastAttemptTime) {
    const minutesElapsed = (now.getTime() - lastAttemptTime.getTime()) / (1000 * 60);
    if (minutesElapsed > config.attemptWindowMinutes) {
      currentAttempts = 0;
    }
  }

  // Increment attempt count
  currentAttempts += 1;

  // Determine if account should be locked
  let lockoutUntil: Date | null = null;
  if (currentAttempts >= config.maxAttempts) {
    lockoutUntil = new Date(now.getTime() + config.lockoutDurationMinutes * 60 * 1000);
  }

  // Update user record
  await database.update(users)
    .set({
      loginAttempts: currentAttempts,
      lastLoginAttempt: now.toISOString(),
      lockoutUntil: lockoutUntil?.toISOString() || null,
    })
    .where(eq(users.id, userId));

  const attemptsRemaining = Math.max(0, config.maxAttempts - currentAttempts);

  return {
    success: true,
    locked: lockoutUntil !== null,
    attemptsRemaining,
    lockoutUntil,
  };
}

/**
 * Clear failed login attempts (on successful login)
 */
export async function clearLoginAttempts(userId: number): Promise<boolean> {
  try {
    const database = await getDb();

    await database.update(users)
      .set({
        loginAttempts: 0,
        lastLoginAttempt: null,
        lockoutUntil: null,
      })
      .where(eq(users.id, userId));

    return true;
  } catch (error) {
    console.error('Failed to clear login attempts:', error);
    return false;
  }
}

/**
 * Manually unlock an account (admin only)
 */
export async function unlockAccount(userId: number): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const database = await getDb();

    const [user] = await database.select().from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    await database.update(users)
      .set({
        loginAttempts: 0,
        lastLoginAttempt: null,
        lockoutUntil: null,
      })
      .where(eq(users.id, userId));

    return { success: true };
  } catch (error) {
    console.error('Failed to unlock account:', error);
    return { success: false, error: 'Failed to unlock account' };
  }
}

/**
 * Get login attempt info for a user
 */
export async function getLoginAttemptInfo(userId: number): Promise<{
  attempts: number;
  locked: boolean;
  lockoutUntil?: Date;
  lastAttempt?: Date;
}> {
  const database = await getDb();

  const [user] = await database.select().from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return { attempts: 0, locked: false };
  }

  const lockStatus = await isAccountLocked(userId);

  return {
    attempts: user.loginAttempts || 0,
    locked: lockStatus.locked,
    lockoutUntil: user.lockoutUntil ? new Date(user.lockoutUntil) : undefined,
    lastAttempt: user.lastLoginAttempt ? new Date(user.lastLoginAttempt) : undefined,
  };
}
