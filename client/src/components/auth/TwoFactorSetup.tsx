import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Copy, CheckCircle, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface TwoFactorSetupProps {
  userId: number;
  organizationId: number;
  onSuccess?: () => void;
}

export function TwoFactorSetup({ userId, organizationId, onSuccess }: TwoFactorSetupProps) {
  const [activeTab, setActiveTab] = useState<'totp' | 'sms'>('totp');
  const [totpSetupStep, setTotpSetupStep] = useState<'setup' | 'verify'>('setup');
  const [smsSetupStep, setSmsSetupStep] = useState<'setup' | 'verify'>('setup');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [totpToken, setTotpToken] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [recoveryToken, setRecoveryToken] = useState<string>('');

  // Setup TOTP mutation
  const setupTOTPMutation = trpc.twoFactor.setupTOTP.useMutation({
    onSuccess: (data) => {
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setBackupCodes(data.backupCodes);
      setRecoveryToken(data.secret); // Store for recovery
      setTotpSetupStep('verify');
      toast.success('TOTP setup initiated. Scan the QR code with your authenticator app.');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to setup TOTP');
    },
  });

  // Verify TOTP mutation
  const verifyTOTPMutation = trpc.twoFactor.verifyTOTP.useMutation({
    onSuccess: () => {
      toast.success('TOTP verified and enabled successfully!');
      setTotpSetupStep('setup');
      setTotpToken('');
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || 'Invalid TOTP token');
    },
  });

  // Setup SMS mutation
  const setupSMSMutation = trpc.twoFactor.setupSMS.useMutation({
    onSuccess: (data) => {
      setSmsSetupStep('verify');
      toast.success(data.message);
      if (data.code && process.env.NODE_ENV === 'development') {
        toast.info(`Dev mode - SMS code: ${data.code}`);
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to setup SMS');
    },
  });

  // Verify SMS mutation
  const verifySMSMutation = trpc.twoFactor.verifySMS.useMutation({
    onSuccess: () => {
      toast.success('SMS verified and enabled successfully!');
      setSmsSetupStep('setup');
      setSmsCode('');
      setPhoneNumber('');
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || 'Invalid SMS code');
    },
  });

  const handleSetupTOTP = () => {
    setupTOTPMutation.mutate({
      userId,
      organizationId,
    });
  };

  const handleVerifyTOTP = () => {
    if (totpToken.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    verifyTOTPMutation.mutate({
      userId,
      organizationId,
      token: totpToken,
    });
  };

  const handleSetupSMS = () => {
    if (!phoneNumber) {
      toast.error('Please enter a phone number');
      return;
    }

    setupSMSMutation.mutate({
      userId,
      organizationId,
      phoneNumber,
    });
  };

  const handleVerifySMS = () => {
    if (smsCode.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    verifySMSMutation.mutate({
      userId,
      organizationId,
      code: smsCode,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Two-Factor Authentication</CardTitle>
        <CardDescription>
          Enhance your account security with two-factor authentication
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'totp' | 'sms')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="totp">Authenticator App</TabsTrigger>
            <TabsTrigger value="sms">SMS Code</TabsTrigger>
          </TabsList>

          {/* TOTP Tab */}
          <TabsContent value="totp" className="space-y-4">
            {totpSetupStep === 'setup' ? (
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Use an authenticator app like Google Authenticator, Microsoft Authenticator, or Authy
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={handleSetupTOTP}
                  disabled={setupTOTPMutation.isPending}
                  className="w-full"
                >
                  {setupTOTPMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Start TOTP Setup
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {qrCode && (
                  <div className="flex flex-col items-center space-y-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">Scan this QR code with your authenticator app</p>
                      <img src={qrCode} alt="TOTP QR Code" className="w-48 h-48 border rounded" />
                    </div>

                    <div className="w-full">
                      <Label htmlFor="secret">Or enter this code manually:</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          id="secret"
                          value={secret}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(secret)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="totp-token">Enter 6-digit code from your app</Label>
                  <Input
                    id="totp-token"
                    placeholder="000000"
                    value={totpToken}
                    onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    className="text-center text-lg tracking-widest"
                  />
                </div>

                {backupCodes.length > 0 && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-900">
                      <p className="font-semibold mb-2">Save your backup codes</p>
                      <p className="text-sm mb-2">Keep these codes in a safe place. You can use them to access your account if you lose access to your authenticator app.</p>
                      <div className="bg-white p-2 rounded border border-blue-200 text-xs font-mono space-y-1">
                        {backupCodes.map((code, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{code}</span>
                            <button
                              onClick={() => copyToClipboard(code)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleVerifyTOTP}
                  disabled={verifyTOTPMutation.isPending || totpToken.length !== 6}
                  className="w-full"
                >
                  {verifyTOTPMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify & Enable
                </Button>
              </div>
            )}
          </TabsContent>

          {/* SMS Tab */}
          <TabsContent value="sms" className="space-y-4">
            {smsSetupStep === 'setup' ? (
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    We'll send a verification code to your phone number
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="+1 (555) 123-4567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    type="tel"
                  />
                  <p className="text-xs text-muted-foreground">
                    Include country code (e.g., +1 for USA)
                  </p>
                </div>

                <Button
                  onClick={handleSetupSMS}
                  disabled={setupSMSMutation.isPending || !phoneNumber}
                  className="w-full"
                >
                  {setupSMSMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Verification Code
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    We've sent a 6-digit code to {phoneNumber}
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="sms-code">Enter 6-digit code</Label>
                  <Input
                    id="sms-code"
                    placeholder="000000"
                    value={smsCode}
                    onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    className="text-center text-lg tracking-widest"
                  />
                </div>

                <Button
                  onClick={handleVerifySMS}
                  disabled={verifySMSMutation.isPending || smsCode.length !== 6}
                  className="w-full"
                >
                  {verifySMSMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify & Enable
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setSmsSetupStep('setup')}
                  className="w-full"
                >
                  Change Phone Number
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
