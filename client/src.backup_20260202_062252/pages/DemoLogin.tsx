import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/i18n/useTranslation";
import DemoAccountsPanel from "@/components/DemoAccountsPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function DemoLogin() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const demoLoginMutation = trpc.auth.demoLogin.useMutation({
    onSuccess: () => {
      toast.success(t.auth.loginSuccess);
      // Reload to trigger auth state refresh
      window.location.href = "/";
    },
    onError: (error) => {
      toast.error(error.message || t.auth.invalidCredentials);
      setIsLoading(false);
    },
  });

  const handleSelectAccount = (selectedEmail: string) => {
    setEmail(selectedEmail);
    // Focus password field after selection
    setTimeout(() => {
      document.getElementById("password-field")?.focus();
    }, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    setIsLoading(true);
    demoLoginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Panel: Demo Accounts */}
        <div className="flex items-center justify-center">
          <DemoAccountsPanel onSelectAccount={handleSelectAccount} />
        </div>

        {/* Right Panel: Login Form */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {t.common.appName || "Integrated Management System"}
              </h1>
              <p className="text-gray-600">
                {t.auth.loginToContinue}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="email-field">{t.auth.email}</Label>
                <Input
                  id="email-field"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.auth.enterEmail}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password-field">{t.auth.password}</Label>
                <Input
                  id="password-field"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.auth.enterPassword}
                  className="mt-1"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? t.common.loading : t.auth.login}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
              <p>{t.auth.demoAccountsInstructions}</p>
              <p className="font-mono font-semibold text-gray-900 mt-1">
                demo123
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
