import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Check, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface TwoFactorSetupProps {
  method: 'totp' | 'sms';
  phoneNumber?: string;
  onComplete: (success: boolean) => void;
}

export default function TwoFactorSetup({ method, phoneNumber, onComplete }: TwoFactorSetupProps) {
  const { user } = useAuth();
  const { language, isRTL } = useLanguage();
  const [step, setStep] = useState<'setup' | 'verify' | 'backup'>('setup');
  const [totpSecret, setTotpSecret] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const t = {
    en: {
      title: 'Two-Factor Authentication Setup',
      description: 'Secure your account with two-factor authentication',
      totpTitle: 'Authenticator App',
      totpDesc: 'Scan this QR code with your authenticator app (Google Authenticator, Microsoft Authenticator, Authy, etc.)',
      secretKey: 'Secret Key',
      enterCode: 'Enter the 6-digit code from your authenticator app',
      verify: 'Verify',
      smsTitle: 'SMS Verification',
      smsDesc: 'We\'ll send a code to your phone number',
      sendCode: 'Send Code',
      enterSmsCode: 'Enter the 6-digit code sent to your phone',
      backupTitle: 'Backup Codes',
      backupDesc: 'Save these backup codes in a safe place. You can use them to access your account if you lose access to your authenticator app.',
      copyCode: 'Copy',
      copied: 'Copied!',
      complete: 'Setup Complete',
      warning: 'Keep these codes safe. Each code can only be used once.',
      next: 'Next',
      done: 'Done',
      error: 'An error occurred. Please try again.',
    },
    ar: {
      title: 'إعداد المصادقة الثنائية',
      description: 'أمّن حسابك بمصادقة ثنائية',
      totpTitle: 'تطبيق المصادقة',
      totpDesc: 'امسح رمز QR هذا باستخدام تطبيق المصادقة الخاص بك',
      secretKey: 'المفتاح السري',
      enterCode: 'أدخل الرمز المكون من 6 أرقام من تطبيق المصادقة الخاص بك',
      verify: 'تحقق',
      smsTitle: 'التحقق عبر الرسائل النصية',
      smsDesc: 'سنرسل رمزًا إلى رقم هاتفك',
      sendCode: 'إرسال الرمز',
      enterSmsCode: 'أدخل الرمز المكون من 6 أرقام المرسل إلى هاتفك',
      backupTitle: 'رموز النسخة الاحتياطية',
      backupDesc: 'احفظ هذه الرموز في مكان آمن. يمكنك استخدامها للوصول إلى حسابك إذا فقدت الوصول إلى تطبيق المصادقة الخاص بك.',
      copyCode: 'نسخ',
      copied: 'تم النسخ!',
      complete: 'اكتمل الإعداد',
      warning: 'احفظ هذه الرموز بأمان. لا يمكن استخدام كل رمز إلا مرة واحدة.',
      next: 'التالي',
      done: 'تم',
      error: 'حدث خطأ. يرجى المحاولة مرة أخرى.',
    },
  };

  const labels = t[language as keyof typeof t] || t.en;

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    try {
      // TODO: Call backend API to verify code
      // const response = await trpc.auth.verify2FA.useMutation();
      setStep('backup');
      // setBackupCodes(response.backupCodes);
    } catch (err) {
      setError(labels.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-background flex items-center justify-center p-4 ${isRTL ? 'rtl' : 'ltr'}`}>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{labels.title}</CardTitle>
          <CardDescription>{labels.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 'setup' && method === 'totp' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">{labels.totpTitle}</h3>
                <p className="text-sm text-muted-foreground mb-4">{labels.totpDesc}</p>
                {qrCode && (
                  <div className="bg-white p-4 rounded-lg flex justify-center mb-4">
                    <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">{labels.secretKey}</label>
                <div className="flex gap-2 mt-2">
                  <Input value={totpSecret} readOnly className="font-mono text-sm" />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyCode(totpSecret)}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button onClick={() => setStep('verify')} className="w-full">
                {labels.next}
              </Button>
            </div>
          )}

          {step === 'setup' && method === 'sms' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">{labels.smsTitle}</h3>
                <p className="text-sm text-muted-foreground mb-4">{labels.smsDesc}</p>
                <p className="text-sm font-medium">{phoneNumber}</p>
              </div>

              <Button onClick={() => setStep('verify')} className="w-full">
                {labels.sendCode}
              </Button>
            </div>
          )}

          {step === 'verify' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">
                  {method === 'totp' ? labels.enterCode : labels.enterSmsCode}
                </label>
                <Input
                  type="text"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="mt-2 text-center text-2xl tracking-widest font-mono"
                  maxLength={6}
                />
              </div>

              <Button
                onClick={handleVerifyCode}
                disabled={loading || verificationCode.length !== 6}
                className="w-full"
              >
                {loading ? 'Verifying...' : labels.verify}
              </Button>
            </div>
          )}

          {step === 'backup' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">{labels.backupTitle}</h3>
                <p className="text-sm text-muted-foreground mb-4">{labels.backupDesc}</p>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{labels.warning}</AlertDescription>
              </Alert>

              <div className="bg-muted p-4 rounded-lg space-y-2 max-h-48 overflow-y-auto">
                {backupCodes.map((code, index) => (
                  <div key={index} className="flex items-center justify-between font-mono text-sm">
                    <span>{code}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopyCode(code)}
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => {
                  onComplete(true);
                }}
                className="w-full"
              >
                {labels.done}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
