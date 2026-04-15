import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import { LoginShell } from './LoginShell';
import { BrandingPanel } from './BrandingPanel';
import { SignInCard } from './SignInCard';
import { RequestAccessModal, RequestAccessFormData } from './RequestAccessModal';
import { Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function Login() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();

  const [requestAccessOpen, setRequestAccessOpen] = useState(false);
  const [signInError, setSignInError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  const [orgContext, setOrgContext] = useState({
    organizationId: '',
    organizationName: '',
    organizationLogo: '',
    operatingUnitId: '',
    operatingUnitName: '',
  });

    const microsoftStatusQuery = trpc.auth.microsoftStatus.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const microsoftConfigured =
    microsoftStatusQuery.data?.configured ??
    (microsoftStatusQuery.isError ? false : null);

  const utils = trpc.useUtils();

  /**
   * ✅ FIXED: Email sign-in mutation
   * 
   * Key changes:
   * 1. Removed premature window.location.href redirect
   * 2. Added cache invalidation to force auth refetch
   * 3. Added delay to allow session cookie to settle
   * 4. Let useEffect handle the redirect after auth is confirmed
   */
  const emailSignInMutation = trpc.auth.emailSignIn.useMutation({
    onSuccess: async () => {
      console.log('[Login] Email sign-in successful, invalidating auth cache...');
      
      try {
        // Invalidate the auth cache to force a refetch
        await utils.auth.me.invalidate();
        
        // Give the session cookie time to be properly set and recognized
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('[Login] Auth cache invalidated, waiting for redirect...');
        // The useEffect below will handle the redirect once isAuthenticated updates
      } catch (error) {
        console.error('[Login] Error invalidating auth cache:', error);
      }
    },
    onError: (error) => {
      const message = error.message || 'Sign-in failed. Please try again.';

      if (message.includes('Invalid email or password')) {
        setSignInError('Invalid email or password. Please check your credentials and try again.');
        return;
      }

      if (message.includes('deactivated')) {
        setSignInError('This account has been deactivated. Please contact your administrator.');
        return;
      }

      if (message.includes('authentication')) {
        setSignInError(message);
        return;
      }

      if (message.includes('restricted')) {
        setSignInError(message);
        return;
      }

      setSignInError('Sign-in failed. Please try again.');
    },
  });

  /**
   * ✅ FIXED: Redirect after authentication is confirmed
   * 
   * This useEffect waits for:
   * 1. Auth hook to finish loading
   * 2. User to be authenticated
   * 3. User data to be available
   * 
   * Only then does it redirect to the appropriate dashboard
   * 
   * ✅ CORRECTED: Uses 'role' field instead of 'platformRole'
   * User roles: platform_super_admin, platform_admin, organization_admin, user, etc.
   */
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      console.log('[Login] User authenticated, redirecting...', {
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // Determine redirect based on user role
      // Platform admins go to /platform, others go to /organization
      const redirectPath = 
        user.role === 'platform_super_admin' || user.role === 'platform_admin'
          ? '/platform'
          : '/organization';

      console.log('[Login] Redirecting to:', redirectPath);
      setLocation(redirectPath);
    }
  }, [loading, isAuthenticated, user, setLocation]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orgId = params.get('orgId');
    const orgName = params.get('orgName');
    const orgLogo = params.get('orgLogo');
    const ouId = params.get('ouId');
    const ouName = params.get('ouName');

    if (orgId && orgName) {
      setOrgContext({
        organizationId: orgId,
        organizationName: orgName,
        organizationLogo: orgLogo || '',
        operatingUnitId: ouId || '',
        operatingUnitName: ouName || '',
      });
    }
  }, []);

  const handleMicrosoftSignIn = async () => {
    setSignInError('');

    try {
      const result = await utils.auth.getMicrosoftLoginUrl.fetch();

      if (!result?.loginUrl) {
        setSignInError('Microsoft 365 sign-in is not available in this environment.');
        return;
      }

      window.location.href = result.loginUrl;
    } catch (error: any) {
      setSignInError(
        error?.message || 'Microsoft 365 sign-in is not configured in this environment.',
      );
    }
  };

  const handleEmailSignIn = async (email: string, password: string) => {
    setSignInError('');
    setIsSigningIn(true);

    try {
      await emailSignInMutation.mutateAsync({ email, password });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleRequestAccess = async (formData: RequestAccessFormData) => {
    try {
      const response = await fetch('/api/auth/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          organizationId:
            formData.requestType === 'organization_user' && orgContext.organizationId
              ? Number(orgContext.organizationId)
              : undefined,
          operatingUnitId:
            formData.requestType === 'organization_user' && orgContext.operatingUnitId
              ? Number(orgContext.operatingUnitId)
              : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Request access error:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return null;
  }

  return (
    <>
      <LoginShell
        brandingPanel={
          <BrandingPanel
            organizationLogo={orgContext.organizationLogo}
            organizationName={orgContext.organizationName}
            operatingUnitName={orgContext.operatingUnitName}
          />
        }
        accessPanel={
          <SignInCard
            onMicrosoftSignIn={handleMicrosoftSignIn}
            onEmailSignIn={handleEmailSignIn}
            onRequestAccess={() => setRequestAccessOpen(true)}
            isLoading={isSigningIn}
            error={signInError}
            microsoftConfigured={microsoftConfigured}
          />
        }
      />

      <RequestAccessModal
        open={requestAccessOpen}
        onOpenChange={setRequestAccessOpen}
        onSubmit={handleRequestAccess}
        organizationName={orgContext.organizationName}
        operatingUnitName={orgContext.operatingUnitName}
      />
    </>
  );
}
