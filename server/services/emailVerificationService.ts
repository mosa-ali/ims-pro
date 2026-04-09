import { nanoid } from 'nanoid';
import { getDb } from '../db';
import { emailVerificationTokens, users } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Generate an email verification token for a user
 */
export async function generateEmailVerificationToken(
  userId: number,
  email: string,
  tokenType: 'otp' | 'magic_link' = 'magic_link'
): Promise<{ token: string; otp?: string; expiresAt: Date }> {
  const token = nanoid(32);
  const otp = tokenType === 'otp' ? Math.random().toString().slice(2, 8) : undefined;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const database = await getDb();

  // Delete any existing unverified tokens for this user
  await database.delete(emailVerificationTokens)
    .where(eq(emailVerificationTokens.userId, userId));

  // Create new verification token
  await database.insert(emailVerificationTokens).values({
    userId,
    email,
    token,
    tokenType,
    otp,
    isVerified: 0,
    attemptCount: 0,
    maxAttempts: 5,
    expiresAt: expiresAt.toISOString(),
  });

  return { token, otp, expiresAt };
}

/**
 * Verify an email verification token
 */
export async function verifyEmailToken(
  token: string,
  otp?: string
): Promise<{ success: boolean; userId?: number; email?: string; error?: string }> {
  const database = await getDb();

  const [tokenRecord] = await database.select().from(emailVerificationTokens)
    .where(eq(emailVerificationTokens.token, token))
    .limit(1);

  if (!tokenRecord) {
    return { success: false, error: 'Invalid verification token' };
  }

  // Check if token has expired
  if (new Date(tokenRecord.expiresAt) < new Date()) {
    return { success: false, error: 'Verification token has expired' };
  }

  // Check if token is already verified
  if (tokenRecord.isVerified) {
    return { success: false, error: 'Email already verified' };
  }

  // Check attempt count
  if (tokenRecord.attemptCount >= tokenRecord.maxAttempts) {
    return { success: false, error: 'Maximum verification attempts exceeded' };
  }

  // If OTP is required, verify it
  if (tokenRecord.tokenType === 'otp' && tokenRecord.otp) {
    if (!otp || otp !== tokenRecord.otp) {
      // Increment attempt count
      await database.update(emailVerificationTokens)
        .set({ attemptCount: tokenRecord.attemptCount + 1 })
        .where(eq(emailVerificationTokens.id, tokenRecord.id));

      return { success: false, error: 'Invalid OTP' };
    }
  }

  // Mark token as verified
  await database.update(emailVerificationTokens)
    .set({
      isVerified: 1,
      verifiedAt: new Date().toISOString(),
    })
    .where(eq(emailVerificationTokens.id, tokenRecord.id));

  // Mark user email as verified
  await database.update(users)
    .set({ emailVerified: 1 })
    .where(eq(users.id, tokenRecord.userId));

  return {
    success: true,
    userId: tokenRecord.userId,
    email: tokenRecord.email,
  };
}

/**
 * Check if a user's email is verified
 */
export async function isEmailVerified(userId: number): Promise<boolean> {
  const database = await getDb();

  const [user] = await database.select().from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user?.emailVerified === 1;
}

/**
 * Send verification email
 */
export async function sendVerificationEmail(
  organizationId: number,
  email: string,
  userName: string,
  token: string,
  verificationLink: string,
  otp?: string
): Promise<boolean> {
  try {
    const { sendEmail } = await import('./emailService');

    const subject = 'Verify Your Email Address';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome, ${userName}!</h2>
        <p>Please verify your email address to activate your account.</p>
        
        ${otp ? `
          <div style="background-color: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p>Your verification code is:</p>
            <h1 style="letter-spacing: 5px; color: #007bff;">${otp}</h1>
            <p style="color: #666;">This code expires in 24 hours.</p>
          </div>
        ` : `
          <div style="margin: 20px 0;">
            <a href="${verificationLink}?token=${token}" 
               style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">
              Verify Email
            </a>
          </div>
          <p style="color: #666; font-size: 12px;">Or copy this link: ${verificationLink}?token=${token}</p>
        `}
        
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          This email was sent to ${email}. If you didn't create this account, please ignore this email.
        </p>
      </div>
    `;

    await sendEmail(organizationId, email, subject, html);
    return true;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return false;
  }
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail(
  userId: number,
  verificationLink: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const database = await getDb();

    const [user] = await database.select().from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (user.emailVerified) {
      return { success: false, error: 'Email already verified' };
    }

    const { token, otp } = await generateEmailVerificationToken(
      userId,
      user.email || '',
      'magic_link'
    );

    await sendVerificationEmail(
      user.currentOrganizationId || 0,
      user.email || '',
      user.name || 'User',
      token,
      verificationLink,
      otp
    );

    return { success: true };
  } catch (error) {
    console.error('Failed to resend verification email:', error);
    return { success: false, error: 'Failed to resend verification email' };
  }
}
