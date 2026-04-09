import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, CheckCircle2, Building2, Mail, Globe } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * ConnectMicrosoft365Page
 * 
 * This page handles the Microsoft 365 tenant connection flow:
 * 1. Validates the onboarding token from the URL
 * 2. Displays organization details
 * 3. Allows the admin to connect their Microsoft 365 tenant
 * 4. Redirects to Microsoft login for admin consent
 */
export default function ConnectMicrosoft365Page() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { user, loading: authLoading } = useAuth();
  const { language, isRTL } = useLanguage();
  
  const [token, setToken] = useState<string>("");
  const [validating, setValidating] = useState(true);
  const [connecting, setConnecting] = useState(false);

  // Extract token from URL
  useEffect(() => {
    const params = new URLSearchParams(search);
    const tokenParam = params.get("token");
    
    if (!tokenParam) {
      toast.error(language === "ar" ? "رمز الاتصال مفقود" : "Connection token is missing");
      setValidating(false);
      return;
    }
    
    setToken(tokenParam);
  }, [search, language]);

  // Validate token
  const { data: validationResult, isLoading: isValidating, error: validationError } = trpc.onboarding.validateToken.useQuery(
    { token },
    { enabled: !!token && !authLoading, retry: false }
  );

  // Start Microsoft connection
  const startConnectionMutation = trpc.onboarding.startMicrosoftConnection.useMutation({
    onSuccess: (data) => {
      // Redirect to Microsoft login
      window.location.href = data.authorizationUrl;
    },
    onError: (error) => {
      setConnecting(false);
      const errorMsg = error.message || (language === "ar" ? "فشل بدء الاتصال" : "Failed to start connection");
      toast.error(errorMsg);
    },
  });

  useEffect(() => {
    setValidating(isValidating);
  }, [isValidating]);

  const handleConnect = async () => {
    if (!validationResult || !token) {
      toast.error(language === "ar" ? "البيانات غير صحيحة" : "Invalid data");
      return;
    }

    setConnecting(true);
    startConnectionMutation.mutate({
      organizationId: validationResult.organizationId,
      token,
    });
  };

  const handleCancel = () => {
    setLocation("/");
  };

  // Loading state
  if (authLoading || validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100" dir={isRTL ? "rtl" : "ltr"}>
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-8 pb-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">
              {language === "ar" ? "جاري التحقق من الاتصال..." : "Verifying connection..."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (validationError || !validationResult) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100" dir={isRTL ? "rtl" : "ltr"}>
        <Card className="w-full max-w-md mx-4 border-red-200 bg-red-50">
          <CardContent className="pt-8 pb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 rounded-full p-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <h2 className="text-lg font-semibold text-center mb-2 text-red-900">
              {language === "ar" ? "رابط غير صحيح" : "Invalid Link"}
            </h2>
            <p className="text-sm text-red-700 text-center mb-6">
              {validationError?.message || (language === "ar" 
                ? "رابط الاتصال غير صحيح أو انتهت صلاحيته. يرجى طلب رابط جديد من المسؤول."
                : "The connection link is invalid or has expired. Please request a new link from your administrator."
              )}
            </p>
            <Button onClick={handleCancel} variant="outline" className="w-full">
              {language === "ar" ? "العودة" : "Go Back"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state - show organization details
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 py-8" dir={isRTL ? "rtl" : "ltr"}>
      <Card className="w-full max-w-lg mx-4 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-100 rounded-lg p-2">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl">
                {language === "ar" ? "ربط Microsoft 365" : "Connect Microsoft 365"}
              </CardTitle>
              <CardDescription>
                {language === "ar" 
                  ? "قم بربط حساب Microsoft 365 الخاص بمؤسستك"
                  : "Connect your organization's Microsoft 365 account"
                }
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-8 pb-8">
          {/* Organization Details */}
          <div className="space-y-4 mb-8">
            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              {/* Organization Name */}
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-slate-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    {language === "ar" ? "اسم المؤسسة" : "Organization Name"}
                  </p>
                  <p className="text-sm font-semibold text-slate-900 break-words">
                    {validationResult.organizationName}
                  </p>
                </div>
              </div>

              {/* Organization Code */}
              <div className="flex items-start gap-3">
                <Globe className="w-5 h-5 text-slate-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    {language === "ar" ? "رمز المؤسسة" : "Organization Code"}
                  </p>
                  <p className="text-sm font-semibold text-slate-900 font-mono">
                    {validationResult.shortCode}
                  </p>
                </div>
              </div>

              {/* Allowed Domains */}
              {validationResult.allowedDomains && validationResult.allowedDomains.length > 0 && (
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {language === "ar" ? "النطاقات المسموحة" : "Allowed Domains"}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {validationResult.allowedDomains.map((domain) => (
                        <Badge key={domain} variant="secondary" className="text-xs">
                          {domain}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="flex items-start gap-3 pt-2 border-t border-slate-200">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    {language === "ar" ? "حالة الاتصال" : "Connection Status"}
                  </p>
                  <Badge className="mt-2 bg-blue-100 text-blue-800 hover:bg-blue-100">
                    {language === "ar" ? "جاهز للاتصال" : "Ready to Connect"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Information Alert */}
          <Alert className="mb-8 border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-sm">
              {language === "ar"
                ? "ستتم إعادة توجيهك إلى Microsoft لمنح الموافقة على المستوى الإداري. تأكد من أنك تملك صلاحيات إدارية في Microsoft 365."
                : "You will be redirected to Microsoft to grant admin consent. Make sure you have admin privileges in Microsoft 365."
              }
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10 font-medium"
            >
              {connecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {language === "ar" ? "جاري الاتصال..." : "Connecting..."}
                </>
              ) : (
                <>
                  {language === "ar" ? "ربط Microsoft 365" : "Connect Microsoft 365"}
                </>
              )}
            </Button>

            <Button
              onClick={handleCancel}
              variant="outline"
              disabled={connecting}
              className="w-full"
            >
              {language === "ar" ? "إلغاء" : "Cancel"}
            </Button>
          </div>

          {/* Help Text */}
          <p className="text-xs text-slate-500 text-center mt-6">
            {language === "ar"
              ? "إذا واجهت مشاكل، يرجى التواصل مع دعم النظام"
              : "If you encounter any issues, please contact system support"
            }
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
