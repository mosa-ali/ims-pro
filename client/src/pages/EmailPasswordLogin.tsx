import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Eye, EyeOff, Mail, Lock, ArrowLeft, Globe } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Inline translations for email/password login
 */
const t = {
  en: {
    signIn: 'Sign In',
    enterEmailPassword: 'Enter your email and password to access your account',
    emailAddress: 'Email Address',
    emailPlaceholder: 'your@email.com',
    password: 'Password',
    passwordPlaceholder: '••••••••',
    signingIn: 'Signing in...',
    forgotPassword: 'Forgot your password?',
    usingMicrosoft: 'Using Microsoft 365?',
    signInWithMicrosoft: 'Sign in with Microsoft',
    resetPassword: 'Reset Password',
    enterEmailReset: 'Enter your email address and we\'ll send you a password reset link',
    backToSignIn: 'Back to Sign In',
    sendResetLink: 'Send Reset Link',
    sending: 'Sending...',
    checkEmail: 'Check your email',
    resetLinkSent: 'We\'ve sent a password reset link to',
    linkExpires: 'The link will expire in 1 hour. If you don\'t see the email, check your spam folder.',
    pleaseEnterBoth: 'Please enter both email and password',
    enterEmail: 'Please enter your email address',
  },
  ar: {
    signIn: 'تسجيل الدخول',
    enterEmailPassword: 'أدخل بريدك الإلكتروني وكلمة المرور للوصول إلى حسابك',
    emailAddress: 'البريد الإلكتروني',
    emailPlaceholder: 'your@email.com',
    password: 'كلمة المرور',
    passwordPlaceholder: '••••••••',
    signingIn: 'جاري تسجيل الدخول...',
    forgotPassword: 'هل نسيت كلمة المرور؟',
    usingMicrosoft: 'هل تستخدم Microsoft 365؟',
    signInWithMicrosoft: 'تسجيل الدخول باستخدام مايكروسوفت',
    resetPassword: 'إعادة تعيين كلمة المرور',
    enterEmailReset: 'أدخل عنوان بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور',
    backToSignIn: 'العودة إلى تسجيل الدخول',
    sendResetLink: 'إرسال رابط إعادة التعيين',
    sending: 'جاري الإرسال...',
    checkEmail: 'تحقق من بريدك الإلكتروني',
    resetLinkSent: 'لقد أرسلنا رابط إعادة تعيين كلمة المرور إلى',
    linkExpires: 'سينتهي الرابط في غضون ساعة واحدة. إذا لم تر البريد، تحقق من مجلد البريد العشوائي.',
    pleaseEnterBoth: 'يرجى إدخال البريد الإلكتروني وكلمة المرور',
    enterEmail: 'يرجى إدخال عنوان بريدك الإلكتروني',
  },
};

export default function EmailPasswordLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const { language, setLanguage, isRTL } = useLanguage();

  const translations = t[language as keyof typeof t];

  const loginMutation = trpc.auth.emailSignIn.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Sign in successful!');
        // Redirect to dashboard or home
        setLocation('/');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Sign in failed');
    },
  });

  const resetMutation = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => {
      toast.success('Password reset link sent to your email');
      setResetSent(true);
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetSent(false);
        setForgotEmail('');
      }, 3000);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to send reset email');
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error(translations.pleaseEnterBoth);
      return;
    }

    loginMutation.mutate({ email, password });
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();

    if (!forgotEmail) {
      toast.error(translations.enterEmail);
      return;
    }

    // Get the base URL for reset link
    const baseUrl = window.location.origin;
    const resetLink = `${baseUrl}/reset-password`;

    resetMutation.mutate({ email: forgotEmail, resetLink });
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Language Switcher */}
      <div className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'}`}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
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
      </div>

      <Card className="w-full max-w-md shadow-lg">
        {showForgotPassword ? (
          <>
            <CardHeader>
              <button
                onClick={() => setShowForgotPassword(false)}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                {translations.backToSignIn}
              </button>
              <CardTitle className="text-2xl">{translations.resetPassword}</CardTitle>
              <CardDescription>{translations.enterEmailReset}</CardDescription>
            </CardHeader>
            <CardContent>
              {resetSent ? (
                <div className="text-center py-8">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <p className="text-green-800 font-medium">{translations.checkEmail}</p>
                    <p className="text-green-700 text-sm mt-1">
                      {translations.resetLinkSent} {forgotEmail}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600">{translations.linkExpires}</p>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      {translations.emailAddress}
                    </label>
                    <div className="relative">
                      <Mail className={`absolute top-3 w-4 h-4 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
                      <Input
                        type="email"
                        placeholder={translations.emailPlaceholder}
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className={isRTL ? 'pr-10' : 'pl-10'}
                        disabled={resetMutation.isPending}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={resetMutation.isPending}
                  >
                    {resetMutation.isPending ? (
                      <>
                        <Loader2 className={`w-4 h-4 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        {translations.sending}
                      </>
                    ) : (
                      translations.sendResetLink
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="text-2xl">{translations.signIn}</CardTitle>
              <CardDescription>{translations.enterEmailPassword}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    {translations.emailAddress}
                  </label>
                  <div className="relative">
                    <Mail className={`absolute top-3 w-4 h-4 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
                    <Input
                      type="email"
                      placeholder={translations.emailPlaceholder}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={isRTL ? 'pr-10' : 'pl-10'}
                      disabled={loginMutation.isPending}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">{translations.password}</label>
                  <div className="relative">
                    <Lock className={`absolute top-3 w-4 h-4 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={translations.passwordPlaceholder}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'}
                      disabled={loginMutation.isPending}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute top-3 text-gray-400 hover:text-gray-600 ${isRTL ? 'left-3' : 'right-3'}`}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className={`w-4 h-4 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} />
                      {translations.signingIn}
                    </>
                  ) : (
                    translations.signIn
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium py-2"
                >
                  {translations.forgotPassword}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 text-center">
                  {translations.usingMicrosoft}{' '}
                  <button
                    onClick={() => setLocation('/login')}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {translations.signInWithMicrosoft}
                  </button>
                </p>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
