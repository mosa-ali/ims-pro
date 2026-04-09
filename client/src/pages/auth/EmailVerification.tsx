import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Mail } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface EmailVerificationProps {
  email: string;
  verificationMethod: 'otp' | 'magic-link';
  onVerified: (success: boolean) => void;
  onResend?: () => void;
}

export default function EmailVerification({
  email,
  verificationMethod,
  onVerified,
  onResend,
}: EmailVerificationProps) {
  const { language, isRTL } = useLanguage();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [verified, setVerified] = useState(false);

  const t = {
    en: {
      title: 'Verify Your Email',
      description: 'We sent a verification code to your email address',
      otpTitle: 'Enter Verification Code',
      otpDesc: 'Enter the 6-digit code sent to your email',
      magicLinkTitle: 'Check Your Email',
      magicLinkDesc: 'Click the link in the email to verify your account',
      enterCode: 'Enter Code',
      verify: 'Verify',
      resend: 'Resend Code',
      resendIn: 'Resend in {seconds}s',
      verified: 'Email verified successfully',
      error: 'Invalid code. Please try again.',
      expiredError: 'Code expired. Please request a new one.',
      resendSuccess: 'Code sent successfully',
      openEmail: 'Open Email',
      didNotReceive: "Didn't receive the code?",
      checkSpam: 'Check your spam folder',
    },
    ar: {
      title: 'تحقق من بريدك الإلكتروني',
      description: 'أرسلنا رمز التحقق إلى عنوان بريدك الإلكتروني',
      otpTitle: 'أدخل رمز التحقق',
      otpDesc: 'أدخل الرمز المكون من 6 أرقام المرسل إلى بريدك الإلكتروني',
      magicLinkTitle: 'تحقق من بريدك الإلكتروني',
      magicLinkDesc: 'انقر على الرابط في البريد الإلكتروني للتحقق من حسابك',
      enterCode: 'أدخل الرمز',
      verify: 'تحقق',
      resend: 'إعادة إرسال الرمز',
      resendIn: 'إعادة إرسال في {seconds}ث',
      verified: 'تم التحقق من البريد الإلكتروني بنجاح',
      error: 'رمز غير صحيح. يرجى المحاولة مرة أخرى.',
      expiredError: 'انتهت صلاحية الرمز. يرجى طلب رمز جديد.',
      resendSuccess: 'تم إرسال الرمز بنجاح',
      openEmail: 'فتح البريد الإلكتروني',
      didNotReceive: 'لم تستقبل الرمز؟',
      checkSpam: 'تحقق من مجلد البريد العشوائي',
    },
  };

  const labels = t[language as keyof typeof t] || t.en;

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // TODO: Call backend API to verify OTP
      // const response = await trpc.auth.verifyEmailOTP.useMutation();
      setSuccess(true);
      setVerified(true);
      setTimeout(() => onVerified(true), 1500);
    } catch (err: any) {
      setError(err.message || labels.error);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      // TODO: Call backend API to resend code
      // await trpc.auth.resendVerificationCode.useMutation();
      setResendCountdown(60);
      setError('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || labels.error);
    } finally {
      setLoading(false);
    }
  };

  if (verified) {
    return (
      <div className={`min-h-screen bg-background flex items-center justify-center p-4 ${isRTL ? 'rtl' : 'ltr'}`}>
        <Card className="w-full max-w-md">
          <CardContent className="pt-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-600" />
              <h2 className="text-2xl font-bold">{labels.verified}</h2>
              <p className="text-muted-foreground">{email}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background flex items-center justify-center p-4 ${isRTL ? 'rtl' : 'ltr'}`}>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {verificationMethod === 'otp' ? labels.otpTitle : labels.magicLinkTitle}
          </CardTitle>
          <CardDescription>
            {verificationMethod === 'otp' ? labels.otpDesc : labels.magicLinkDesc}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{labels.resendSuccess}</AlertDescription>
            </Alert>
          )}

          {verificationMethod === 'otp' ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">{labels.enterCode}</label>
                <Input
                  type="text"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="mt-2 text-center text-2xl tracking-widest font-mono"
                  maxLength={6}
                  disabled={loading}
                />
              </div>

              <Button
                onClick={handleVerifyOTP}
                disabled={loading || otp.length !== 6}
                className="w-full"
              >
                {loading ? 'Verifying...' : labels.verify}
              </Button>

              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">{labels.didNotReceive}</p>
                <Button
                  variant="link"
                  onClick={handleResend}
                  disabled={loading || resendCountdown > 0}
                  className="text-sm"
                >
                  {resendCountdown > 0
                    ? labels.resendIn.replace('{seconds}', resendCountdown.toString())
                    : labels.resend}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">{labels.checkSpam}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  Check your email at <strong>{email}</strong> for the verification link
                </AlertDescription>
              </Alert>

              <Button
                onClick={() => window.open(`https://mail.google.com`, '_blank')}
                variant="outline"
                className="w-full"
              >
                {labels.openEmail}
              </Button>

              <div className="text-center">
                <Button
                  variant="link"
                  onClick={handleResend}
                  disabled={loading || resendCountdown > 0}
                  className="text-sm"
                >
                  {resendCountdown > 0
                    ? labels.resendIn.replace('{seconds}', resendCountdown.toString())
                    : labels.resend}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
