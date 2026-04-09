import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface EmailVerificationProps {
  userId: number;
  email: string;
  onSuccess?: () => void;
  onVerified?: (email: string) => void;
}

export function EmailVerification({ userId, email, onSuccess, onVerified }: EmailVerificationProps) {
  const [verificationMethod, setVerificationMethod] = useState<'otp' | 'magic_link'>('otp');
  const [otpStep, setOtpStep] = useState<'send' | 'verify'>('send');
  const [magicLinkStep, setMagicLinkStep] = useState<'send' | 'verify'>('send');
  const [otp, setOtp] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [magicLinkToken, setMagicLinkToken] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  // Send OTP mutation
  const sendOTPMutation = trpc.emailVerification.sendOTP.useMutation({
    onSuccess: (data) => {
      setOtpToken(data.token);
      setOtpStep('verify');
      setResendCountdown(60);
      toast.success(data.message);
      if (data.otp && process.env.NODE_ENV === 'development') {
        toast.info(`Dev mode - OTP: ${data.otp}`);
      }

      // Start countdown timer
      const interval = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to send OTP');
    },
  });

  // Verify OTP mutation
  const verifyOTPMutation = trpc.emailVerification.verifyOTP.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setOtpStep('send');
      setOtp('');
      setOtpToken('');
      onVerified?.(data.email);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || 'Invalid OTP');
    },
  });

  // Send magic link mutation
  const sendMagicLinkMutation = trpc.emailVerification.sendMagicLink.useMutation({
    onSuccess: (data) => {
      setMagicLinkToken(data.token);
      setMagicLinkStep('verify');
      setResendCountdown(60);
      toast.success(data.message);
      if (data.magicLink && process.env.NODE_ENV === 'development') {
        toast.info(`Dev mode - Magic link: ${data.magicLink}`);
      }

      // Start countdown timer
      const interval = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to send magic link');
    },
  });

  // Verify magic link mutation
  const verifyMagicLinkMutation = trpc.emailVerification.verifyMagicLink.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setMagicLinkStep('send');
      setMagicLinkToken('');
      onVerified?.(data.email);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || 'Invalid or expired link');
    },
  });

  // Resend OTP mutation
  const resendOTPMutation = trpc.emailVerification.resendToken.useMutation({
    onSuccess: (data) => {
      setOtpToken(data.token);
      setResendCountdown(60);
      toast.success(data.message);
      if (data.otp && process.env.NODE_ENV === 'development') {
        toast.info(`Dev mode - OTP: ${data.otp}`);
      }

      // Start countdown timer
      const interval = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to resend OTP');
    },
  });

  const handleSendOTP = () => {
    sendOTPMutation.mutate({
      userId,
      email,
    });
  };

  const handleVerifyOTP = () => {
    if (otp.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    verifyOTPMutation.mutate({
      userId,
      token: otpToken,
      otp,
    });
  };

  const handleSendMagicLink = () => {
    sendMagicLinkMutation.mutate({
      userId,
      email,
    });
  };

  const handleVerifyMagicLink = () => {
    verifyMagicLinkMutation.mutate({
      userId,
      token: magicLinkToken,
    });
  };

  const handleResendOTP = () => {
    resendOTPMutation.mutate({
      userId,
      email,
      tokenType: 'otp',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Verification</CardTitle>
        <CardDescription>
          Verify your email address to secure your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={verificationMethod} onValueChange={(v) => setVerificationMethod(v as 'otp' | 'magic_link')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="otp">OTP Code</TabsTrigger>
            <TabsTrigger value="magic_link">Magic Link</TabsTrigger>
          </TabsList>

          {/* OTP Tab */}
          <TabsContent value="otp" className="space-y-4">
            {otpStep === 'send' ? (
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    We'll send a 6-digit code to {email}
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={handleSendOTP}
                  disabled={sendOTPMutation.isPending}
                  className="w-full"
                >
                  {sendOTPMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send OTP Code
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-900">
                    We've sent a 6-digit code to {email}. It expires in 15 minutes.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="otp">Enter 6-digit code</Label>
                  <Input
                    id="otp"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    className="text-center text-lg tracking-widest"
                  />
                </div>

                <Button
                  onClick={handleVerifyOTP}
                  disabled={verifyOTPMutation.isPending || otp.length !== 6}
                  className="w-full"
                >
                  {verifyOTPMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify Email
                </Button>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Didn't receive code?</span>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={handleResendOTP}
                    disabled={resendCountdown > 0 || resendOTPMutation.isPending}
                  >
                    {resendCountdown > 0 ? (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Resend in {resendCountdown}s
                      </span>
                    ) : (
                      'Resend Code'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Magic Link Tab */}
          <TabsContent value="magic_link" className="space-y-4">
            {magicLinkStep === 'send' ? (
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    We'll send a magic link to {email}. Click the link to verify your email.
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={handleSendMagicLink}
                  disabled={sendMagicLinkMutation.isPending}
                  className="w-full"
                >
                  {sendMagicLinkMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Magic Link
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    We've sent a magic link to {email}. The link expires in 24 hours.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Check your email and click the link to verify your email address.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    If you don't see the email, check your spam folder.
                  </p>
                </div>

                <Button
                  onClick={() => setMagicLinkStep('send')}
                  variant="outline"
                  className="w-full"
                >
                  Send Another Link
                </Button>

                <div className="text-center">
                  <span className="text-sm text-muted-foreground">
                    Already clicked the link?{' '}
                    <Button
                      variant="link"
                      size="sm"
                      onClick={handleVerifyMagicLink}
                      disabled={verifyMagicLinkMutation.isPending}
                    >
                      {verifyMagicLinkMutation.isPending ? 'Verifying...' : 'Verify Now'}
                    </Button>
                  </span>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
