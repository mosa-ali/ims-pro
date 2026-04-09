// Production routers.ts - Fixed auth procedure references
// Only showing the auth router section with all fixes

import { authRouter } from "./routers/authRouter";
import { router } from "./_core/trpc";

// ... other router imports ...

export const appRouter = router({
  // ... other routers ...

  auth: router({
    // Microsoft Entra ID procedures
    getMicrosoftLoginUrl: authRouter.getMicrosoftLoginUrl,
    handleMicrosoftCallback: authRouter.handleMicrosoftCallback,
    searchMicrosoft365Users: authRouter.searchMicrosoft365Users,
    getMicrosoft365User: authRouter.getMicrosoft365User,
    logout: authRouter.logout,  // FIXED: was logoutMicrosoft (doesn't exist)
    
    // Email/Password Authentication
    loginWithEmail: authRouter.loginWithEmail,
    emailSignIn: authRouter.emailSignIn,
    registerWithEmail: authRouter.registerWithEmail,
    
    // Password Reset
    requestPasswordReset: authRouter.requestPasswordReset,
    resetPassword: authRouter.resetPassword,  // FIXED: was resetPasswor (truncated)
    
    // Email Verification
    verifyEmail: authRouter.verifyEmail,
    
    // User Info
    me: authRouter.me,
    
    // Microsoft Status
    microsoftStatus: authRouter.microsoftStatus,
  }),

  // ... rest of routers ...
});
