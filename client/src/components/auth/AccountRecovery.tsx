import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AlertCircle, CheckCircle, Shield } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface AccountRecoveryProps {
  userId: number;
  organizationId: number;
  email: string;
  onSuccess?: () => void;
}

export function AccountRecovery({ userId, organizationId, email, onSuccess }: AccountRecoveryProps) {
  const [recoveryMethod, setRecoveryMethod] = useState<'backup_code' | 'email' | 'support'>('backup_code');
  const [step, setStep] = useState<'initiate' | 'verify' | 'reset'>('initiate');
  const [backupCode, setBackupCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryReason, setRecoveryReason] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);

  // Initiate recovery mutation
  const initiateRecoveryMutation = trpc.accountRecovery.initiateRecovery.useMutation({
    onSuccess: (data) => {
      setRecoveryToken(data.recoveryToken);
      setStep('verify');
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to initiate recovery');
    },
  });

  // Verify backup code mutation
  const verifyBackupCodeMutation = trpc.accountRecovery.verifyBackupCodeRecovery.useMutation({
    onSuccess: (data) => {
      setStep('reset');
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.message || 'Invalid backup code');
      setAttemptsRemaining((prev) => Math.max(0, prev - 1));
    },
  });

  // Complete recovery mutation
  const completeRecoveryMutation = trpc.accountRecovery.completeRecovery.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setStep('initiate');
      setNewPassword('');
      setConfirmPassword('');
      setRecoveryToken('');
      setBackupCode('');
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to complete recovery');
    },
  });

  const handleInitiateRecovery = () => {
    if (recoveryMethod === 'support' && !recoveryReason) {
      toast.error('Please provide a reason for account recovery');
      return;
    }

    initiateRecoveryMutation.mutate({
      userId,
      organizationId,
      email,
      recoveryMethod,
      reason: recoveryReason || undefined,
    });
  };

  const handleVerifyBackupCode = () => {
    if (!backupCode) {
      toast.error('Please enter your backup code');
      return;
    }

    verifyBackupCodeMutation.mutate({
      recoveryToken,
      code: backupCode,
    });
  };

  const handleCompleteRecovery = () => {
    if (!newPassword) {
      toast.error('Please enter a new password');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    completeRecoveryMutation.mutate({
      recoveryToken,
      newPassword,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Recovery</CardTitle>
        <CardDescription>
          Recover access to your account using backup codes or alternative verification methods
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'initiate' ? (
          <div className="space-y-4">
            <Tabs value={recoveryMethod} onValueChange={(v) => setRecoveryMethod(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="backup_code">Backup Code</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="support">Support</TabsTrigger>
              </TabsList>

              {/* Backup Code Recovery */}
              <TabsContent value="backup_code" className="space-y-4">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Use one of the backup codes you saved during 2FA setup
                  </AlertDescription>
                </Alert>
                <p className="text-sm text-muted-foreground">
                  Backup codes are 8-character codes that can be used to access your account if you lose access to your authenticator app.
                </p>
              </TabsContent>

              {/* Email Recovery */}
              <TabsContent value="email" className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    We'll send a verification code to {email}
                  </AlertDescription>
                </Alert>
                <p className="text-sm text-muted-foreground">
                  Check your email for a 6-digit verification code. The code expires in 15 minutes.
                </p>
              </TabsContent>

              {/* Support Recovery */}
              <TabsContent value="support" className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Our support team will help you regain access to your account
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason for recovery</Label>
                  <Textarea
                    id="reason"
                    placeholder="Describe why you need account recovery..."
                    value={recoveryReason}
                    onChange={(e) => setRecoveryReason(e.target.value)}
                    rows={4}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <Button
              onClick={handleInitiateRecovery}
              disabled={initiateRecoveryMutation.isPending}
              className="w-full"
            >
              {initiateRecoveryMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Start Recovery
            </Button>
          </div>
        ) : step === 'verify' ? (
          <div className="space-y-4">
            {recoveryMethod === 'backup_code' ? (
              <>
                <Alert className="bg-blue-50 border-blue-200">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    Enter one of your backup codes to verify your identity
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="backup-code">Backup Code</Label>
                  <Input
                    id="backup-code"
                    placeholder="XXXXXXXX"
                    value={backupCode}
                    onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    className="font-mono text-lg tracking-widest"
                  />
                  <p className="text-xs text-muted-foreground">
                    {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining
                  </p>
                </div>

                <Button
                  onClick={handleVerifyBackupCode}
                  disabled={verifyBackupCodeMutation.isPending || !backupCode || attemptsRemaining === 0}
                  className="w-full"
                >
                  {verifyBackupCodeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify Code
                </Button>
              </>
            ) : recoveryMethod === 'email' ? (
              <>
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-900">
                    We've sent a verification code to {email}
                  </AlertDescription>
                </Alert>

                <p className="text-sm text-muted-foreground">
                  Check your email for a 6-digit code and enter it below.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="email-code">Verification Code</Label>
                  <Input
                    id="email-code"
                    placeholder="000000"
                    maxLength={6}
                    className="text-center text-lg tracking-widest"
                  />
                </div>

                <Button className="w-full">Verify Code</Button>
              </>
            ) : (
              <>
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-900">
                    Support team will contact you within 24 hours at {email}
                  </AlertDescription>
                </Alert>

                <p className="text-sm text-muted-foreground">
                  We've received your recovery request. Our support team will verify your identity and help you regain access to your account.
                </p>

                <Button
                  onClick={() => setStep('initiate')}
                  variant="outline"
                  className="w-full"
                >
                  Back to Recovery Options
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                Identity verified! Now set a new password for your account.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <Button
              onClick={handleCompleteRecovery}
              disabled={completeRecoveryMutation.isPending || !newPassword || !confirmPassword}
              className="w-full"
            >
              {completeRecoveryMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reset Password & Recover Account
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
