/**
 * Microsoft 365 Onboarding Tab Component
 * 
 * Displays Microsoft 365 onboarding status
 * Organization admin receives email with one-link onboarding URL
 * Supports RTL/LTR languages (Arabic/English)
 * 
 * Features:
 * - Display onboarding status (Not Connected / Pending Consent / Connected / Error)
 * - Show consent granted date and connected by user
 * - Display allowed domains list
 * - Show tenant verification status
 * - Informational message about email notification to org admin
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Cloud, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  User, 
  Calendar, 
  Globe,
  Loader2,
  Mail,
  Info,
  RotateCcw
} from "lucide-react";
import { format } from "date-fns";

interface Microsoft365OnboardingTabProps {
  organizationId: number;
  organizationName: string;
}

type OnboardingStatus = "not_connected" | "pending_consent" | "connected" | "error";

export function Microsoft365OnboardingTab({
  organizationId,
  organizationName,
}: Microsoft365OnboardingTabProps) {
  const { language, isRTL } = useLanguage();
  const [showResendConfirm, setShowResendConfirm] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [emailDeliveryFailed, setEmailDeliveryFailed] = useState(false);

  // Fetch organization details including Microsoft onboarding fields
  const { data: organization, isLoading, refetch } = trpc.ims.organizations.getById.useQuery(
    { id: organizationId },
    { enabled: !!organizationId }
  );

  // Resend onboarding link mutation
  const resendMutation = trpc.onboarding.resendLink.useMutation({
    onSuccess: (data) => {
      setShowResendConfirm(false);
      refetch();
      // Store the generated link for display
      if (data.onboardingLink) {
        setGeneratedLink(data.onboardingLink);
        setEmailDeliveryFailed(!data.emailQueued);
      }
      if (data.emailQueued) {
        toast.success(
          language === "ar"
            ? "تم إرسال رابط الإعداد بنجاح"
            : "Onboarding link sent successfully"
        );
      } else {
        toast.warning(
          language === "ar"
            ? "تم إنشاء الرابط ولكن فشل إرسال البريد الإلكتروني - يرجى نسخ الرابط يدوياً"
            : "Link generated but email delivery failed - please copy the link manually"
        );
      }
    },
    onError: (error) => {
      toast.error(
        language === "ar"
          ? `خطأ: ${error.message}`
          : `Error: ${error.message}`
      );
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const status: OnboardingStatus = (organization?.onboardingStatus as OnboardingStatus) || "not_connected";
  const microsoft365Enabled = organization?.microsoft365Enabled || false;
  const consentGrantedAt = organization?.consentGrantedAt;
  const connectedBy = organization?.connectedBy;
  const allowedDomains = organization?.allowedDomains 
    ? JSON.parse(organization.allowedDomains) 
    : [];
  const tenantVerified = organization?.tenantVerified || false;

  // Status badge styling
  const getStatusBadge = () => {
    switch (status) {
      case "connected":
        return (
          <Badge className="bg-green-100 text-green-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {language === "ar" ? "متصل" : "Connected"}
          </Badge>
        );
      case "pending_consent":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {language === "ar" ? "في انتظار الموافقة" : "Pending Consent"}
          </Badge>
        );
      case "error":
        return (
          <Badge className="bg-red-100 text-red-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {language === "ar" ? "خطأ" : "Error"}
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 flex items-center gap-2">
            <Cloud className="w-4 h-4" />
            {language === "ar" ? "غير متصل" : "Not Connected"}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Area B Header - Microsoft 365 Tenant Connection */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Cloud className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div className={isRTL ? 'text-end' : ''}>
            <h3 className="font-semibold text-purple-900 mb-1">
              {language === "ar" ? "المنطقة ب: اتصال مستأجر Microsoft 365" : "Area B: Microsoft 365 Tenant Connection"}
            </h3>
            <p className="text-sm text-purple-800">
              {language === "ar"
                ? "قم بإدارة اتصال مستأجر Microsoft 365 الخاص بك وموافقة المسؤول. هذا منفصل عن تكوين موفر البريد في المنطقة أ."
                : "Manage your Microsoft 365 tenant connection and admin consent. This is separate from email provider configuration in Area A."}
            </p>
          </div>
        </div>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cloud className="w-6 h-6 text-blue-600" />
              <div>
                <CardTitle>
                  {language === "ar" ? "حالة الاتصال" : "Connection Status"}
                </CardTitle>
                <CardDescription>
                  {language === "ar"
                    ? "معلومات اتصال المستأجر والموافقة"
                    : "Tenant connection and consent information"}
                </CardDescription>
              </div>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Enabled Status */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                {language === "ar" ? "الحالة" : "Status"}
              </p>
              <p className="font-medium">
                {microsoft365Enabled
                  ? language === "ar"
                    ? "مفعّل"
                    : "Enabled"
                  : language === "ar"
                  ? "معطّل"
                  : "Disabled"}
              </p>
            </div>

            {/* Tenant Verification */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                {language === "ar" ? "التحقق من المستأجر" : "Tenant Verification"}
              </p>
              <div className="flex items-center gap-2">
                {tenantVerified ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-600">
                      {language === "ar" ? "تم التحقق" : "Verified"}
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    <span className="font-medium text-yellow-600">
                      {language === "ar" ? "لم يتم التحقق" : "Not Verified"}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Consent Information */}
          {status === "connected" && consentGrantedAt && (
            <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === "ar" ? "تاريخ الموافقة" : "Consent Granted"}
                  </p>
                  <p className="font-medium">
                    {format(new Date(consentGrantedAt), "PPP")}
                  </p>
                </div>
              </div>
              {connectedBy && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === "ar" ? "متصل بواسطة" : "Connected By"}
                    </p>
                    <p className="font-medium">{connectedBy}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Allowed Domains */}
          {allowedDomains.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                <p className="font-medium">
                  {language === "ar" ? "النطاقات المسموحة" : "Allowed Domains"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {allowedDomains.map((domain: string, index: number) => (
                  <Badge key={index} variant="secondary">
                    {domain}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Error Alert */}
          {status === "error" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {language === "ar"
                  ? "حدث خطأ أثناء عملية الإعداد. يرجى المحاولة مرة أخرى."
                  : "An error occurred during the onboarding process. Please try again."}
              </AlertDescription>
            </Alert>
          )}

          {/* Onboarding Instructions */}
          {status === "not_connected" && (
            <Alert className="bg-blue-50 border-blue-200">
              <Mail className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <div className="space-y-2">
                  <p className="font-medium">
                    {language === "ar"
                      ? "خطوات الإعداد"
                      : "Onboarding Steps"}
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>
                      {language === "ar"
                        ? "سيتم إرسال رابط الإعداد إلى مسؤول المنظمة عبر البريد الإلكتروني"
                        : "An onboarding link will be sent to the organization administrator via email"}
                    </li>
                    <li>
                      {language === "ar"
                        ? "انقر على الرابط في البريد الإلكتروني لبدء عملية الموافقة"
                        : "Click the link in the email to start the consent process"}
                    </li>
                    <li>
                      {language === "ar"
                        ? "اتبع تعليمات Microsoft للموافقة على الأذونات المطلوبة"
                        : "Follow Microsoft's instructions to grant the required permissions"}
                    </li>
                    <li>
                      {language === "ar"
                        ? "ستتم إعادة توجيهك تلقائياً بعد اكتمال الموافقة"
                        : "You will be automatically redirected after consent is complete"}
                    </li>
                  </ol>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Pending Consent Instructions */}
          {status === "pending_consent" && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <Clock className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                {language === "ar"
                  ? "في انتظار موافقة مسؤول المنظمة. يرجى التحقق من بريدك الإلكتروني وإكمال عملية الموافقة."
                  : "Waiting for organization administrator consent. Please check your email and complete the consent process."}
              </AlertDescription>
            </Alert>
          )}

          {/* Connection Organization Button - Always visible for platform admins */}
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => setShowResendConfirm(true)}
              disabled={resendMutation.isPending}
              className="gap-2"
            >
              {resendMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              {language === "ar" ? "إرسال رابط الاتصال" : "Connection Organization"}
            </Button>
            {status === "connected" && (
              <Button
                variant="outline"
                disabled={true}
                className="gap-2 opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {language === "ar" ? "متصل بالفعل" : "Already Connected"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Connection Organization Confirmation Dialog */}
      <AlertDialog open={showResendConfirm} onOpenChange={setShowResendConfirm}>
        <AlertDialogContent dir={isRTL ? "rtl" : "ltr"}>
          <AlertDialogTitle>
            {language === "ar" ? "إرسال رابط الاتصال" : "Send Connection Link"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {language === "ar"
              ? "هل أنت متأكد من رغبتك في إرسال رابط الاتصال إلى مسؤول المنظمة؟ سيتم إنشاء رابط جديد وإرساله عبر البريد الإلكتروني."
              : "Are you sure you want to send the connection link to the organization administrator? A new link will be generated and sent via email."}
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>
              {language === "ar" ? "إلغاء" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                resendMutation.mutate({ organizationId });
              }}
              disabled={resendMutation.isPending}
            >
              {resendMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {language === "ar" ? "جاري الإرسال..." : "Sending..."}
                </>
              ) : (
                language === "ar" ? "إعادة إرسال" : "Resend"
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Onboarding Link Display Dialog - shown when email delivery fails or as confirmation */}
      <Dialog open={!!generatedLink} onOpenChange={(open) => { if (!open) setGeneratedLink(null); }}>
        <DialogContent dir={isRTL ? "rtl" : "ltr"} className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {emailDeliveryFailed ? (
                <AlertCircle className="w-5 h-5 text-amber-500" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              )}
              {language === "ar" ? "رابط الإعداد" : "Onboarding Link"}
            </DialogTitle>
            <DialogDescription>
              {emailDeliveryFailed
                ? language === "ar"
                  ? "فشل إرسال البريد الإلكتروني (قد يكون سبب ذلك عدم تكوين مزود بريد M365). يرجى نسخ هذا الرابط ومشاركته مع مسؤول المنظمة يدوياً."
                  : "Email delivery failed (the organization may not have an M365 email provider configured yet). Please copy this link and share it with the organization administrator manually."
                : language === "ar"
                  ? "تم إرسال الرابط عبر البريد الإلكتروني بنجاح. يمكنك أيضاً نسخ هذا الرابط ومشاركته مباشرة."
                  : "The link was sent via email successfully. You can also copy this link and share it directly."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {emailDeliveryFailed && (
              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-sm">
                  {language === "ar"
                    ? "تلميح: تم إخطار مسؤول المنصة عبر الإشعارات بهذا الرابط."
                    : "Note: The platform owner has been notified via in-app notification with this link."}
                </AlertDescription>
              </Alert>
            )}
            <div className="flex gap-2">
              <Input
                value={generatedLink || ""}
                readOnly
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (generatedLink) {
                    navigator.clipboard.writeText(generatedLink);
                    toast.success(language === "ar" ? "تم نسخ الرابط" : "Link copied!");
                  }
                }}
                className="shrink-0"
              >
                {language === "ar" ? "نسخ" : "Copy"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {language === "ar"
                ? "تحذير: هذا الرابط صالح لمرة واحدة فقط وسينتهي صلاحيته خلال 24 ساعة."
                : "Warning: This link is single-use only and will expire in 24 hours."}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
