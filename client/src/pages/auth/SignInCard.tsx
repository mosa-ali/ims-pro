import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2, Mail, CheckCircle, Globe } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useTranslation } from '@/i18n/useTranslation';

interface SignInCardProps {
  onMicrosoftSignIn: () => void;
  onEmailSignIn: (email: string, password: string) => Promise<void>;
  onRequestAccess: () => void;
  isLoading?: boolean;
  error?: string;
  /** null = still loading; true = configured; false = not configured */
  microsoftConfigured?: boolean | null;
}

const translations = {
  en: {
    signInTitle: 'Sign in to continue',
    signInDescription: 'Use your organization account to access the system.',
    microsoftButton: 'Sign in with Microsoft 365',
    emailPlaceholder: 'Work Email Address',
    passwordPlaceholder: 'Password',
    signInButton: 'Sign In',
    divider: 'or',
    needAccess: 'Need access?',
    needAccessDescription:
      'If you do not yet have access to the system, you can submit a request. Your request will be reviewed by your organization administrator.',
    requestAccessButton: 'Request Access',
    invalidEmail: 'Please enter a valid email address',
    requiredField: 'This field is required',
    signingIn: 'Signing in...',
    forgotPassword: 'Forgot password?',
    // Forgot Password Modal
    forgotPasswordTitle: 'Reset Password',
    forgotPasswordDescription: 'Enter your work email address and we will send you a password reset link.',
    forgotPasswordEmailPlaceholder: 'Work Email Address',
    forgotPasswordSend: 'Send Reset Link',
    forgotPasswordSending: 'Sending...',
    forgotPasswordSuccess: 'Reset link sent',
    forgotPasswordSuccessMessage: 'If an account exists for that email, a password reset link has been sent. Please check your inbox.',
    forgotPasswordBackToLogin: 'Back to Sign In',
    forgotPasswordCancel: 'Cancel',
  },
  ar: {
    signInTitle: 'تسجيل الدخول للمتابعة',
    signInDescription: 'استخدم حسابك الخاص بالمنظمة للوصول إلى النظام.',
    microsoftButton: 'تسجيل الدخول عبر Microsoft 365',
    emailPlaceholder: 'البريد الإلكتروني للعمل',
    passwordPlaceholder: 'كلمة المرور',
    signInButton: 'تسجيل الدخول',
    divider: 'أو',
    needAccess: 'هل تحتاج إلى وصول؟',
    needAccessDescription:
      'إذا لم يكن لديك وصول إلى النظام بعد، يمكنك تقديم طلب وصول. سيتم مراجعة طلبك من قبل مسؤول النظام في منظمتك.',
    requestAccessButton: 'طلب الوصول',
    invalidEmail: 'يرجى إدخال عنوان بريد إلكتروني صحيح',
    requiredField: 'هذا الحقل مطلوب',
    signingIn: 'جاري تسجيل الدخول...',
    forgotPassword: 'نسيت كلمة المرور؟',
    // Forgot Password Modal
    forgotPasswordTitle: 'إعادة تعيين كلمة المرور',
    forgotPasswordDescription: 'أدخل عنوان بريدك الإلكتروني للعمل وسنرسل لك رابط إعادة تعيين كلمة المرور.',
    forgotPasswordEmailPlaceholder: 'البريد الإلكتروني للعمل',
    forgotPasswordSend: 'إرسال رابط الإعادة',
    forgotPasswordSending: 'جاري الإرسال...',
    forgotPasswordSuccess: 'تم إرسال الرابط',
    forgotPasswordSuccessMessage: 'إذا كان هناك حساب مرتبط بهذا البريد الإلكتروني، فقد تم إرسال رابط إعادة تعيين كلمة المرور. يرجى التحقق من صندوق الوارد.',
    forgotPasswordBackToLogin: 'العودة إلى تسجيل الدخول',
    forgotPasswordCancel: 'إلغاء',
  },
};

export function SignInCard({
  onMicrosoftSignIn,
  onEmailSignIn,
  onRequestAccess,
  isLoading = false,
  error,
  microsoftConfigured = null,
}: SignInCardProps) {
  const { language, setLanguage, isRTL } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.en;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Forgot Password Modal state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotEmailError, setForgotEmailError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const requestResetMutation = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => {
      setForgotSuccess(true);
      setForgotEmailError('');
    },
    onError: (err) => {
      setForgotEmailError(err.message || 'Failed to send reset link. Please try again.');
    },
  });

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const handleEmailSignIn = async () => {
    setEmailError('');

    if (!email.trim()) {
      setEmailError(t.requiredField);
      return;
    }

    if (!validateEmail(email)) {
      setEmailError(t.invalidEmail);
      return;
    }

    if (!password.trim()) {
      setEmailError(t.requiredField);
      return;
    }

    setIsSigningIn(true);
    try {
      await onEmailSignIn(email, password);
    } catch (error) {
      console.error('Sign-in error:', error);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleForgotPasswordOpen = () => {
    setForgotEmail(email); // Pre-fill with email if already typed
    setForgotEmailError('');
    setForgotSuccess(false);
    setForgotOpen(true);
  };

  const handleForgotPasswordSubmit = () => {
    setForgotEmailError('');
    if (!forgotEmail.trim()) {
      setForgotEmailError(t.requiredField);
      return;
    }
    if (!validateEmail(forgotEmail)) {
      setForgotEmailError(t.invalidEmail);
      return;
    }
    requestResetMutation.mutate({
        email: forgotEmail
      });
  };
  

  const handleForgotClose = () => {
    setForgotOpen(false);
    setForgotSuccess(false);
    setForgotEmail('');
    setForgotEmailError('');
  };

  return (
    <>
      <Card className="w-full shadow-lg border-0">
        <CardHeader className="flex flex-row items-start justify-between">
          <div className="flex-1">
            <CardTitle>{t.signInTitle}</CardTitle>
            <CardDescription>{t.signInDescription}</CardDescription>
          </div>
          {/* Language Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 whitespace-nowrap ml-4">
                <Globe className="w-4 h-4" />
                {language.toUpperCase()}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? 'start' : 'end'}>
              <DropdownMenuItem onClick={() => setLanguage('en')}>
                English
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('ar')}>
                العربية
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>

        <CardContent className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Microsoft Sign-In Button */}
          <div className="relative group">
            <Button
              onClick={onMicrosoftSignIn}
              disabled={isLoading || microsoftConfigured === false}
              title={microsoftConfigured === false ? (language === 'ar' ? 'Microsoft 365 غير مُهيأ في هذه البيئة' : 'Microsoft 365 is not configured in this environment') : undefined}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              {t.microsoftButton}
            </Button>
            {microsoftConfigured === false && (
              <p className="mt-1 text-xs text-amber-600 text-center">
                {language === 'ar' ? 'Microsoft 365 غير مُهيأ في هذه البيئة' : 'Microsoft 365 sign-in is not available in this environment'}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <Separator className="flex-1" />
            <span className="text-xs text-slate-500 font-medium">{t.divider}</span>
            <Separator className="flex-1" />
          </div>

          {/* Email/Password Section */}
          <div className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder={t.emailPlaceholder}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError('');
                }}
                disabled={isSigningIn}
                className="h-10 rounded-lg"
              />
              {emailError && <p className="text-xs text-red-600 mt-1">{emailError}</p>}
            </div>

            <div className="space-y-1">
              <Input
                type="password"
                placeholder={t.passwordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleEmailSignIn(); }}
                disabled={isSigningIn}
                className="h-10 rounded-lg"
              />
              {/* Forgot Password link */}
              <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
                <button
                  type="button"
                  onClick={handleForgotPasswordOpen}
                  disabled={isSigningIn}
                  className="text-xs text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-50 mt-1"
                >
                  {t.forgotPassword}
                </button>
              </div>
            </div>

            <Button
              onClick={handleEmailSignIn}
              disabled={isSigningIn || isLoading}
              className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg"
            >
              {isSigningIn ? (
                <>
                  <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {t.signingIn}
                </>
              ) : (
                t.signInButton
              )}
            </Button>
          </div>

          {/* Divider */}
          <Separator />

          {/* Request Access Section */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-slate-900 text-sm">{t.needAccess}</h3>
            <p className="text-xs text-slate-600">{t.needAccessDescription}</p>
            <Button
              onClick={onRequestAccess}
              variant="outline"
              className="w-full h-10 rounded-lg"
            >
              {t.requestAccessButton}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Forgot Password Modal */}
      <Dialog open={forgotOpen} onOpenChange={handleForgotClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.forgotPasswordTitle}</DialogTitle>
            <DialogDescription>{t.forgotPasswordDescription}</DialogDescription>
          </DialogHeader>

          {forgotSuccess ? (
            <div className="py-4 text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-green-600" />
                </div>
              </div>
              <h3 className="font-semibold text-slate-900">{t.forgotPasswordSuccess}</h3>
              <p className="text-sm text-slate-600">{t.forgotPasswordSuccessMessage}</p>
              <Button onClick={handleForgotClose} className="w-full">
                {t.forgotPasswordBackToLogin}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div>
                <Input
                  type="email"
                  placeholder={t.forgotPasswordEmailPlaceholder}
                  value={forgotEmail}
                  onChange={(e) => {
                    setForgotEmail(e.target.value);
                    setForgotEmailError('');
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleForgotPasswordSubmit(); }}
                  disabled={requestResetMutation.isPending}
                  className="h-10 rounded-lg"
                  autoFocus
                />
                {forgotEmailError && (
                  <p className="text-xs text-red-600 mt-1">{forgotEmailError}</p>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleForgotClose}
                  disabled={requestResetMutation.isPending}
                  className="flex-1"
                >
                  {t.forgotPasswordCancel}
                </Button>
                <Button
                  onClick={handleForgotPasswordSubmit}
                  disabled={requestResetMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {requestResetMutation.isPending ? (
                    <>
                      <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} />
                      {t.forgotPasswordSending}
                    </>
                  ) : (
                    t.forgotPasswordSend
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
