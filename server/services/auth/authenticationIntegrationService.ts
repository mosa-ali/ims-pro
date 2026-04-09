import { TRPCError } from '@trpc/server';
import { domainValidationService } from './domainValidationService';
import { platformAdminVerificationService } from './platformAdminVerificationService';
import { getDb } from '../../db';
import { users, organizations } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Authentication Integration Service
 * Orchestrates domain validation, email verification, and auth method enforcement
 * Provides unified authentication flow for all user types
 */
export class AuthenticationIntegrationService {
  /**
   * Validate user authentication based on role and organization
   */
  async validateUserAuthentication(
    email: string,
    role: string,
    organizationId?: number
  ): Promise<{ valid: boolean; error?: string; requiresVerification?: boolean }> {
    try {
      // Step 1: Validate email domain based on role
      const domainValidation = await domainValidationService.validateEmailByRole(
        email,
        role,
        organizationId
      );

      if (!domainValidation.valid) {
        return {
          valid: false,
          error: domainValidation.error,
        };
      }

      // Step 2: Check if platform admin needs email verification
      if (role === 'platform_admin' || role === 'platform_super_admin') {
        const isVerified = await platformAdminVerificationService.isPlatformAdminEmailVerified(
          email
        );

        if (!isVerified) {
          return {
            valid: true,
            requiresVerification: true,
            error: 'Email verification required. An OTP has been sent to your email.',
          };
        }
      }

      return { valid: true };
    } catch (error) {
      console.error('Authentication validation error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Authentication validation failed',
      });
    }
  }

  /**
   * Handle Microsoft OAuth user authentication
   */
  async handleMicrosoftOAuthAuthentication(
    userInfo: {
      id: string;
      email: string;
      displayName: string;
      userPrincipalName: string;
    },
    organizationId: number
  ): Promise<{
    valid: boolean;
    error?: string;
    requiresVerification?: boolean;
    user?: any;
  }> {
    try {
      const db = await getDb();

      // Get organization details
      const org = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      if (!org || org.length === 0) {
        return {
          valid: false,
          error: 'Organization not found',
        };
      }

      const organization = org[0];

      // Check organization's authentication method
      if (
        organization.authMethod !== 'microsoft365' &&
        organization.authMethod !== 'mixed'
      ) {
        return {
          valid: false,
          error: `This organization does not support Microsoft 365 authentication. Allowed method: ${organization.authMethod}`,
        };
      }

      // Validate user's email domain against organization's allowed domains
      const domainValidation = await domainValidationService.validateOrganizationUserEmail(
        userInfo.email,
        organizationId
      );

      if (!domainValidation.valid) {
        return {
          valid: false,
          error: domainValidation.error,
        };
      }

      // Get or create user
      let user = await db
        .select()
        .from(users)
        .where(eq(users.email, userInfo.email.toLowerCase()))
        .limit(1);

      if (!user || user.length === 0) {
        // Create new user
        await db.insert(users).values({
          email: userInfo.email.toLowerCase(),
          name: userInfo.displayName,
          organizationId,
          role: 'user',
          authenticationProvider: 'microsoft365',
          loginMethod: 'microsoft365',
          isActive: 1,
          emailVerified: 1, // Microsoft OAuth emails are pre-verified
          emailVerifiedAt: new Date().toISOString(),
        });

        user = await db
          .select()
          .from(users)
          .where(eq(users.email, userInfo.email.toLowerCase()))
          .limit(1);
      } else {
        // Update existing user
        await db
          .update(users)
          .set({
            authenticationProvider: 'microsoft365',
            loginMethod: 'microsoft365',
            emailVerified: 1,
          })
          .where(eq(users.email, userInfo.email.toLowerCase()));
      }

      return {
        valid: true,
        user: user?.[0],
      };
    } catch (error) {
      console.error('Microsoft OAuth authentication error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Microsoft OAuth authentication failed',
      });
    }
  }

  /**
   * Handle email/password user authentication
   */
  async handleEmailPasswordAuthentication(
    email: string,
    organizationId?: number
  ): Promise<{
    valid: boolean;
    error?: string;
    requiresVerification?: boolean;
  }> {
    try {
      // If user belongs to organization, validate domain
      if (organizationId) {
        const domainValidation = await domainValidationService.validateOrganizationUserEmail(
          email,
          organizationId
        );

        if (!domainValidation.valid) {
          return {
            valid: false,
            error: domainValidation.error,
          };
        }
      }

      return { valid: true };
    } catch (error) {
      console.error('Email/password authentication error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Email/password authentication validation failed',
      });
    }
  }

  /**
   * Get organization's authentication configuration
   */
  async getOrganizationAuthConfig(organizationId: number): Promise<{
    authMethod: string;
    allowedDomains: string[];
    microsoft365Enabled: boolean;
    onboardingStatus: string;
  }> {
    try {
      const db = await getDb();

      const org = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      if (!org || org.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found',
        });
      }

      const organization = org[0];
      let allowedDomains: string[] = [];

      if (organization.allowedDomains) {
        try {
          allowedDomains = JSON.parse(organization.allowedDomains);
        } catch (error) {
          console.error('Failed to parse allowed domains:', error);
        }
      }

      return {
        authMethod: organization.authMethod || 'mixed',
        allowedDomains,
        microsoft365Enabled: organization.microsoft365Enabled === 1,
        onboardingStatus: organization.onboardingStatus || 'not_connected',
      };
    } catch (error) {
      console.error('Error getting organization auth config:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get organization authentication configuration',
      });
    }
  }

  /**
   * Request email verification for platform admin
   */
  async requestPlatformAdminVerification(email: string): Promise<{
    success: boolean;
    message: string;
    expiresIn: number;
  }> {
    try {
      const otp = await platformAdminVerificationService.createOTPForPlatformAdmin(email);

      // In production, send OTP via email
      console.log(`[Platform Admin Verification] OTP for ${email}: ${otp}`);

      return {
        success: true,
        message: 'Verification OTP has been sent to your email',
        expiresIn: 15 * 60 * 1000, // 15 minutes in milliseconds
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error('Error requesting platform admin verification:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to request email verification',
      });
    }
  }

  /**
   * Verify platform admin email with OTP
   */
  async verifyPlatformAdminEmail(email: string, otp: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      await platformAdminVerificationService.verifyOTPForPlatformAdmin(email, otp);

      return {
        success: true,
        message: 'Email verified successfully',
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error('Error verifying platform admin email:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to verify email',
      });
    }
  }
}

// Export singleton instance
export const authenticationIntegrationService = new AuthenticationIntegrationService();
