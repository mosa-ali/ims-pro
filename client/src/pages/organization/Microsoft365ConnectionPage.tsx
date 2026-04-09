/**
 * Microsoft 365 Connection Page
 * 
 * Handles the Microsoft 365 tenant connection workflow for organization admins.
 * Accessed via email link: /organizations/{id}/connect-microsoft-365
 * 
 * Flow:
 * 1. Validate onboarding token
 * 2. Show organization info and connection steps
 * 3. Redirect to Microsoft consent screen
 * 4. Handle callback and store tenant info
 * 5. Verify tenant and complete connection
 */

import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BackButton } from "@/components/BackButton";
import { toast } from "sonner";
import {
  Cloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Shield,
  Key,
  Building2,
} from "lucide-react";

interface Microsoft365ConnectionPageProps {
  organizationId?: number;
  token?: string;
}

type ConnectionStep = "validate" | "info" | "connecting" | "success" | "error";

export default function Microsoft365ConnectionPage() {
  const { language, isRTL } = useLanguage();
  const { id, token } = useParams<{ id: string; token?: string }>();
  const [, navigate] = useLocation();

  const [step, setStep] = useState<ConnectionStep>("validate");
  const [error, setError] = useState<string | null>(null);

  // Fetch organization details
  const { data: organization, isLoading: orgLoading } = trpc.ims.organizations.getById.useQuery(
    { id: parseInt(id || "0") },
    { enabled: !!id }
  );

  // Validate onboarding token
  const validateTokenMutation = trpc.onboarding.validateToken.useMutation({
    onSuccess: (data) => {
      if (data.valid) {
        setStep("info");
      } else {
        setError(
          language === "ar"
            ? "انتهت صلاحية الرابط. يرجى طلب رابط جديد من مسؤول المنصة."
            : "The link has expired. Please request a new link from the platform administrator."
        );
        setStep("error");
      }
    },
    onError: (error) => {
      setError(error.message);
      setStep("error");
    },
  });

  // Start Microsoft connection
  const startConnectionMutation = trpc.onboarding.startMicrosoftConnection.useMutation({
    onSuccess: (data) => {
      // Redirect to Microsoft consent screen
      window.location.href = data.authorizationUrl;
    },
    onError: (error) => {
      setError(error.message);
      setStep("error");
      toast.error(error.message);
    },
  });

  // Validate token on mount
  useEffect(() => {
    if (id && token) {
      validateTokenMutation.mutate({
        organizationId: parseInt(id),
        token,
      });
    } else if (id) {
      // No token provided, show info step
      setStep("info");
    }
  }, [id, token]);

  const handleStartConnection = () => {
    if (!organization) return;

    setStep("connecting");
    startConnectionMutation.mutate({
      organizationId: organization.id,
      token: token || "",
    });
  };

  const handleBackToOrganization = () => {
    navigate(`/platform/organizations/${organization?.shortCode}`);
  };

  if (orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {language === "ar" ? "لم يتم العثور على المنظمة" : "Organization not found"}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4" dir={isRTL ? "rtl" : "ltr"}>
      <div className="max-w-2xl mx-auto">
        <BackButton onClick={handleBackToOrganization} />

        <div className="mt-6 space-y-6">
          {/* Header Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Cloud className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>
                    {language === "ar" ? "اتصال Microsoft 365" : "Microsoft 365 Connection"}
                  </CardTitle>
                  <CardDescription>
                    {organization.name}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Validation Step */}
          {step === "validate" && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <p>
                    {language === "ar" ? "جاري التحقق من الرابط..." : "Validating link..."}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info Step */}
          {step === "info" && (
            <>
              {/* Organization Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {language === "ar" ? "معلومات المنظمة" : "Organization Information"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">
                        {language === "ar" ? "اسم المنظمة" : "Organization Name"}
                      </p>
                      <p className="font-medium">{organization.name}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">
                        {language === "ar" ? "الكود القصير" : "Short Code"}
                      </p>
                      <p className="font-medium">{organization.shortCode}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">
                        {language === "ar" ? "الدولة" : "Country"}
                      </p>
                      <p className="font-medium">{organization.country || "-"}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">
                        {language === "ar" ? "النطاق" : "Domain"}
                      </p>
                      <p className="font-medium">{organization.domain || "-"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Connection Steps */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {language === "ar" ? "خطوات الاتصال" : "Connection Steps"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
                          1
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium">
                          {language === "ar" ? "مراجعة معلومات المنظمة" : "Review Organization Information"}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {language === "ar"
                            ? "تحقق من أن معلومات المنظمة أعلاه صحيحة"
                            : "Verify that the organization information above is correct"}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
                          2
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium">
                          {language === "ar" ? "الموافقة على الأذونات" : "Grant Permissions"}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {language === "ar"
                            ? "سيتم نقلك إلى Microsoft لمنح الأذونات المطلوبة"
                            : "You will be redirected to Microsoft to grant required permissions"}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
                          3
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium">
                          {language === "ar" ? "اكتمال الاتصال" : "Connection Complete"}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {language === "ar"
                            ? "سيتم إعادة توجيهك تلقائياً بعد اكتمال الموافقة"
                            : "You will be automatically redirected after consent is complete"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Security Info */}
              <Alert className="bg-blue-50 border-blue-200">
                <Shield className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  {language === "ar"
                    ? "نحن نستخدم OAuth 2.0 الآمن للاتصال بـ Microsoft. لن نخزن كلمات المرور الخاصة بك."
                    : "We use secure OAuth 2.0 to connect with Microsoft. Your passwords are never stored."}
                </AlertDescription>
              </Alert>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleStartConnection}
                  disabled={startConnectionMutation.isPending}
                  className="gap-2"
                >
                  {startConnectionMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  {language === "ar" ? "بدء الاتصال" : "Start Connection"}
                </Button>
                <Button
                  onClick={handleBackToOrganization}
                  variant="outline"
                  disabled={startConnectionMutation.isPending}
                >
                  {language === "ar" ? "إلغاء" : "Cancel"}
                </Button>
              </div>
            </>
          )}

          {/* Connecting Step */}
          {step === "connecting" && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center gap-4 py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-center">
                    {language === "ar"
                      ? "جاري توجيهك إلى Microsoft..."
                      : "Redirecting to Microsoft..."}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Step */}
          {step === "error" && (
            <>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button onClick={handleBackToOrganization}>
                  {language === "ar" ? "العودة إلى المنظمة" : "Back to Organization"}
                </Button>
              </div>
            </>
          )}

          {/* Success Step */}
          {step === "success" && (
            <>
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center gap-4 py-8">
                    <CheckCircle2 className="w-12 h-12 text-green-600" />
                    <div className="text-center">
                      <h3 className="font-semibold text-lg text-green-900">
                        {language === "ar" ? "تم الاتصال بنجاح!" : "Connection Successful!"}
                      </h3>
                      <p className="text-sm text-green-800 mt-2">
                        {language === "ar"
                          ? "تم توصيل Microsoft 365 بنجاح بمنظمتك"
                          : "Microsoft 365 has been successfully connected to your organization"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button onClick={handleBackToOrganization} className="w-full">
                {language === "ar" ? "العودة إلى المنظمة" : "Back to Organization"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
