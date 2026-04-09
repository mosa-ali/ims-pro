import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Mail,
  Save,
  TestTube,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Info,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function PlatformEmailSettingsPage() {
  const { language, isRTL } = useLanguage();
  const [, setLocation] = useLocation();

  // Form state
  const [providerType, setProviderType] = useState<"m365" | "smtp" | "disabled">("m365");
  const [tenantId, setTenantId] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderName, setSenderName] = useState("IMS Platform");
  const [replyToEmail, setReplyToEmail] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [testRecipient, setTestRecipient] = useState("");
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Load existing settings
  const { data: settings, isLoading } = trpc.ims.platformEmail.getSettings.useQuery(undefined, {
    onSuccess: (data) => {
      if (data && !initialized) {
        setProviderType(data.providerType as "m365" | "smtp" | "disabled");
        setTenantId(data.tenantId ?? "");
        setClientId(data.clientId ?? "");
        setClientSecret(data.clientSecret ?? "");
        setSenderEmail(data.senderEmail ?? "");
        setSenderName(data.senderName ?? "IMS Platform");
        setReplyToEmail(data.replyToEmail ?? "");
        setIsActive(data.isActive === 1);
        setInitialized(true);
      }
    },
  });

  const utils = trpc.useUtils();

  // Save mutation
  const saveMutation = trpc.ims.platformEmail.saveSettings.useMutation({
    onSuccess: () => {
      toast.success(
        language === "ar"
          ? "تم حفظ إعدادات البريد الإلكتروني بنجاح"
          : "Platform email settings saved successfully"
      );
      utils.ims.platformEmail.getSettings.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // Test mutation
  const testMutation = trpc.ims.platformEmail.testConfiguration.useMutation({
    onSuccess: (result) => {
      setTestResult(result);
      if (result.success) {
        toast.success(
          language === "ar"
            ? "تم إرسال بريد الاختبار بنجاح"
            : "Test email sent successfully"
        );
      } else {
        toast.error(
          language === "ar"
            ? `فشل إرسال بريد الاختبار: ${result.error}`
            : `Test failed: ${result.error}`
        );
      }
    },
    onError: (err) => {
      setTestResult({ success: false, error: err.message });
      toast.error(err.message);
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      providerType,
      tenantId: tenantId || undefined,
      clientId: clientId || undefined,
      clientSecret: clientSecret || undefined,
      senderEmail: senderEmail || undefined,
      senderName: senderName || undefined,
      replyToEmail: replyToEmail || undefined,
      isActive,
    });
  };

  const handleTest = () => {
    if (!testRecipient) {
      toast.error(
        language === "ar"
          ? "يرجى إدخال عنوان بريد إلكتروني للاختبار"
          : "Please enter a test recipient email"
      );
      return;
    }
    setTestResult(null);
    testMutation.mutate({ testRecipient });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
      </div>
    );
  }

  const t = {
    title: language === "ar" ? "إعدادات البريد الإلكتروني للمنصة" : "Platform Email Settings",
    subtitle:
      language === "ar"
        ? "تكوين صندوق بريد Microsoft 365 لإرسال روابط الإعداد والإشعارات"
        : "Configure the M365 mailbox used to send onboarding links and system notifications",
    back: language === "ar" ? "العودة إلى الإعدادات" : "Back to Settings",
    provider: language === "ar" ? "نوع المزود" : "Provider Type",
    m365: "Microsoft 365 (Graph API)",
    smtp: "SMTP",
    disabled: language === "ar" ? "معطل" : "Disabled",
    tenantId: language === "ar" ? "معرف المستأجر (Tenant ID)" : "Tenant ID",
    clientId: language === "ar" ? "معرف العميل (Client ID)" : "Client ID",
    clientSecret: language === "ar" ? "سر العميل (Client Secret)" : "Client Secret",
    senderEmail: language === "ar" ? "عنوان المرسل" : "Sender Email",
    senderName: language === "ar" ? "اسم المرسل" : "Sender Name",
    replyToEmail: language === "ar" ? "عنوان الرد (اختياري)" : "Reply-To Email (optional)",
    isActive: language === "ar" ? "تفعيل هذا المزود" : "Enable this provider",
    save: language === "ar" ? "حفظ الإعدادات" : "Save Settings",
    testConfig: language === "ar" ? "اختبار الإعدادات" : "Test Configuration",
    testRecipient: language === "ar" ? "بريد إلكتروني للاختبار" : "Test recipient email",
    sendTest: language === "ar" ? "إرسال بريد اختبار" : "Send Test Email",
    lastTested: language === "ar" ? "آخر اختبار" : "Last tested",
    status: language === "ar" ? "الحالة" : "Status",
    configuredLabel: language === "ar" ? "مُكوَّن" : "Configured",
    notConfiguredLabel: language === "ar" ? "غير مُكوَّن" : "Not Configured",
    activeLabel: language === "ar" ? "نشط" : "Active",
    inactiveLabel: language === "ar" ? "غير نشط" : "Inactive",
  };

  const lastTestStatus = settings?.lastTestStatus;
  const lastTestedAt = settings?.lastTestedAt;

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container py-6">
          <button
            onClick={() => setLocation("/platform/settings")}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
            {t.back}
          </button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
                <p className="text-sm text-gray-500 mt-0.5">{t.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {settings ? (
                <Badge
                  variant={isActive ? "default" : "secondary"}
                  className={isActive ? "bg-green-100 text-green-800 border-green-200" : ""}
                >
                  {isActive ? t.activeLabel : t.inactiveLabel}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
                  {t.notConfiguredLabel}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8 space-y-6">
        {/* Info Alert */}
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-800 text-sm">
            {language === "ar"
              ? "يُستخدم هذا الإعداد لإرسال روابط الإعداد لمسؤولي المنظمة الذين لم يقوموا بعد بتكوين مزود البريد الإلكتروني الخاص بمنظمتهم. يتطلب تسجيل تطبيق Azure AD مع إذن Mail.Send."
              : "This configuration is used to send onboarding links to organization admins who have not yet configured their own email provider. Requires an Azure AD app registration with Mail.Send application permission (admin consent granted)."}
          </AlertDescription>
        </Alert>

        {/* Last Test Status */}
        {lastTestedAt && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                {lastTestStatus === "success" ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : lastTestStatus === "failed" ? (
                  <XCircle className="w-5 h-5 text-red-600" />
                ) : null}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {t.lastTested}:{" "}
                    <span className={lastTestStatus === "success" ? "text-green-700" : "text-red-700"}>
                      {lastTestStatus === "success"
                        ? language === "ar" ? "ناجح" : "Successful"
                        : language === "ar" ? "فشل" : "Failed"}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(lastTestedAt).toLocaleString()}
                    {settings?.lastTestError && (
                      <span className="text-red-600 ml-2">— {settings.lastTestError}</span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Settings Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Provider Type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {language === "ar" ? "تكوين المزود" : "Provider Configuration"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t.provider}</Label>
                  <Select
                    value={providerType}
                    onValueChange={(v) => setProviderType(v as "m365" | "smtp" | "disabled")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="m365">{t.m365}</SelectItem>
                      <SelectItem value="smtp">{t.smtp}</SelectItem>
                      <SelectItem value="disabled">{t.disabled}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {providerType === "m365" && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label>{t.tenantId}</Label>
                      <Input
                        value={tenantId}
                        onChange={(e) => setTenantId(e.target.value)}
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.clientId}</Label>
                      <Input
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.clientSecret}</Label>
                      <div className="relative">
                        <Input
                          type={showSecret ? "text" : "password"}
                          value={clientSecret}
                          onChange={(e) => setClientSecret(e.target.value)}
                          placeholder={
                            settings?.clientSecret
                              ? language === "ar" ? "اتركه فارغاً للإبقاء على القيمة الحالية" : "Leave blank to keep existing"
                              : "Enter client secret"
                          }
                          dir="ltr"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecret(!showSecret)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Sender Identity */}
            {providerType !== "disabled" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {language === "ar" ? "هوية المرسل" : "Sender Identity"}
                  </CardTitle>
                  <CardDescription>
                    {language === "ar"
                      ? "عنوان البريد الإلكتروني واسم المرسل الذي سيظهر للمستلمين"
                      : "The email address and name that recipients will see"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t.senderEmail}</Label>
                    <Input
                      type="email"
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      placeholder="noreply@yourdomain.com"
                      dir="ltr"
                    />
                    <p className="text-xs text-gray-500">
                      {language === "ar"
                        ? "يجب أن يكون هذا مستخدماً أو صندوق بريد مشترك في مستأجر Azure AD الخاص بك"
                        : "Must be a user or shared mailbox in your Azure AD tenant"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>{t.senderName}</Label>
                    <Input
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="IMS Platform"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.replyToEmail}</Label>
                    <Input
                      type="email"
                      value={replyToEmail}
                      onChange={(e) => setReplyToEmail(e.target.value)}
                      placeholder="support@yourdomain.com"
                      dir="ltr"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Activation */}
            <Card>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{t.isActive}</p>
                    <p className="text-sm text-gray-500">
                      {language === "ar"
                        ? "عند التفعيل، سيتم استخدام هذا المزود لإرسال رسائل البريد الإلكتروني للإعداد"
                        : "When enabled, this provider will be used to send onboarding emails"}
                    </p>
                  </div>
                  <Switch
                    checked={isActive}
                    onCheckedChange={setIsActive}
                    disabled={providerType === "disabled"}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="w-full"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {t.save}
            </Button>
          </div>

          {/* Right Panel: Test Configuration */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TestTube className="w-4 h-4" />
                  {t.testConfig}
                </CardTitle>
                <CardDescription>
                  {language === "ar"
                    ? "أرسل بريداً إلكترونياً تجريبياً للتحقق من صحة الإعدادات"
                    : "Send a test email to verify the configuration works"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t.testRecipient}</Label>
                  <Input
                    type="email"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    placeholder="admin@example.com"
                    dir="ltr"
                  />
                </div>

                {testResult && (
                  <Alert
                    className={
                      testResult.success
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    }
                  >
                    {testResult.success ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <AlertDescription
                      className={testResult.success ? "text-green-800" : "text-red-800"}
                    >
                      {testResult.success
                        ? language === "ar" ? "تم إرسال البريد الإلكتروني بنجاح!" : "Email sent successfully!"
                        : testResult.error}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleTest}
                  disabled={testMutation.isPending || !settings}
                  variant="outline"
                  className="w-full"
                >
                  {testMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <TestTube className="w-4 h-4 mr-2" />
                  )}
                  {t.sendTest}
                </Button>

                {!settings && (
                  <p className="text-xs text-gray-500 text-center">
                    {language === "ar"
                      ? "احفظ الإعدادات أولاً قبل الاختبار"
                      : "Save settings first before testing"}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Requirements Card */}
            <Card className="bg-amber-50 border-amber-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-amber-900">
                  {language === "ar" ? "متطلبات Azure AD" : "Azure AD Requirements"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-xs text-amber-800 space-y-1.5 list-disc list-inside">
                  <li>
                    {language === "ar"
                      ? "تسجيل تطبيق في Azure AD"
                      : "App registration in Azure AD"}
                  </li>
                  <li>
                    {language === "ar"
                      ? "إذن Mail.Send (تطبيق، ليس مفوضاً)"
                      : "Mail.Send permission (Application, not Delegated)"}
                  </li>
                  <li>
                    {language === "ar"
                      ? "موافقة المسؤول الممنوحة"
                      : "Admin consent granted"}
                  </li>
                  <li>
                    {language === "ar"
                      ? "صندوق بريد مشترك أو مستخدم كمرسل"
                      : "Shared mailbox or user as sender"}
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
