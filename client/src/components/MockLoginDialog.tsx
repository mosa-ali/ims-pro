/**
 * Mock Login Dialog Component
 * 
 * This component provides a mock login interface for local development.
 * It allows users to quickly authenticate without OAuth setup.
 * 
 * IMPORTANT: This is for development only and should NEVER be used in production.
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MockLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoginSuccess?: () => void;
}

export function MockLoginDialog({ open, onOpenChange, onLoginSuccess }: MockLoginDialogProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/mock-auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      
      if (data.success) {
        setEmail('');
        setPassword('');
        onOpenChange(false);
        onLoginSuccess?.();
        // Reload page to refresh auth state
        window.location.reload();
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/mock-auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: '', password: '' }), // Empty credentials for mock
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      
      if (data.success) {
        onOpenChange(false);
        onLoginSuccess?.();
        // Reload page to refresh auth state
        window.location.reload();
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Mock Login (Development)</DialogTitle>
          <DialogDescription>
            This is a development-only login for local testing. Credentials are not validated.
          </DialogDescription>
        </DialogHeader>

        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Development Mode:</strong> Mock authentication is enabled. Any email/password will work.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter any email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use default admin user from .env.local
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password (optional)</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter any password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Password is not validated in development mode
            </p>
          </div>

          <div className="space-y-2">
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Login
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleQuickLogin}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Quick Login (Use Default User)
            </Button>
          </div>
        </form>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p><strong>Default User (from .env.local):</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Email: {process.env.VITE_MOCK_AUTH_EMAIL || 'mdrwesh@outlook.com'}</li>
            <li>Role: {process.env.VITE_MOCK_AUTH_ROLE || 'platform_admin'}</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
