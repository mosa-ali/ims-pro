import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Lock, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect } from "react";

/**
 * Inline translations for dual authentication login
 */
const t = {
  // English
  en: {
    title: "ClientSphere CRM Portal",
    subtitle: "Unified Management System",
    description: "Choose your preferred authentication method",
    
    // Email/Password Tab
    emailPasswordTab: "Email & Password",
    emailLabel: "Email Address",
    emailPlaceholder: "your.email@example.com",
    passwordLabel: "Password",
    passwordPlaceholder: "Enter your password",
    loginButton: "Sign In",
    registerLink: "Don't have an account? Register",
    
    // Microsoft Tab
    microsoftTab: "Microsoft 365",
    microsoftDescription: "Sign in with your Microsoft account",
    microsoftButton: "Sign in with Microsoft",
    
    // Manus Tab
    manusTab: "Manus OAuth",
    manusDescription: "Sign in with Manus platform credentials",
    manusButton: "Sign in with Manus",
    
    // Messages
    loading: "Signing in...",
    error: "Error",
    success: "Success",
    invalidEmail: "Please enter a valid email address",
    passwordRequired: "Password is required",
    loginFailed: "Login failed. Please check your credentials.",
    accountInactive: "This account has been deactivated",
    accountNotFound: "Account not found",
    
    // Footer
    privacyPolicy: "Privacy Policy",
    termsOfService: "Terms of Service",
    support: "Support",
  },
  
  // Arabic
  ar: {
    title: "بوابة إدارة العملاء",
    subtitle: "نظام الإدارة الموحد",
    description: "اختر طريقة المصادقة المفضلة لديك",
    
    // Email/Password Tab
    emailPasswordTab: "البريد الإلكتروني وكلمة المرور",
    emailLabel: "عنوان البريد الإلكتروني",
    emailPlaceholder: "your.email@example.com",
    passwordLabel: "كلمة المرور",
    passwordPlaceholder: "أدخل كلمة المرور الخاصة بك",
    loginButton: "تسجيل الدخول",
    registerLink: "ليس لديك حساب؟ سجل",
    
    // Microsoft Tab
    microsoftTab: "مايكروسوفت 365",
    microsoftDescription: "تسجيل الدخول باستخدام حسابك على مايكروسوفت",
    microsoftButton: "تسجيل الدخول باستخدام مايكروسوفت",
    
    // Manus Tab
    manusTab: "Manus OAuth",
    manusDescription: "تسجيل الدخول باستخدام بيانات اعتماد منصة Manus",
    manusButton: "تسجيل الدخول باستخدام Manus",
    
    // Messages
    loading: "جاري تسجيل الدخول...",
    error: "خطأ",
    success: "نجح",
    invalidEmail: "يرجى إدخال عنوان بريد إلكتروني صحيح",
    passwordRequired: "كلمة المرور مطلوبة",
    loginFailed: "فشل تسجيل الدخول. يرجى التحقق من بيانات الاعتماد الخاصة بك.",
    accountInactive: "تم إلغاء تنشيط هذا الحساب",
    accountNotFound: "الحساب غير موجود",
    
    // Footer
    privacyPolicy: "سياسة الخصوصية",
    termsOfService: "شروط الخدمة",
    support: "الدعم",
  },
};

export default function DualAuthLogin() {
  const { language, setLanguage, isRTL } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();

  // Ensure html[dir] is set correctly (LanguageContext should handle this)
  useEffect(() => {
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
  }, [isRTL]);

  const translations = t[language as keyof typeof t];

  // Get Microsoft login URL
  const getMicrosoftLoginUrl = trpc.auth.getMicrosoftLoginUrl.useQuery();

  // Handle email/password login
  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate inputs
    if (!email || !password) {
      setError(translations.passwordRequired);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(translations.invalidEmail);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/email-signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.message || translations.loginFailed);
        return;
      }

      // Redirect to organization dashboard on success
      setLocation("/organization");
    } catch (err) {
      setError(translations.loginFailed);
      console.error("Email login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Microsoft login
  const handleMicrosoftLogin = () => {
    if (getMicrosoftLoginUrl.data?.loginUrl) {
      window.location.href = getMicrosoftLoginUrl.data.loginUrl;
    }
  };

  // Handle Manus OAuth login
  const handleManusLogin = () => {
    // Redirect to Manus OAuth login
    window.location.href = "/api/oauth/login";
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 ${
        isRTL ? "rtl" : "ltr"
      }`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="w-full max-w-md mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">{translations.title}</h1>
          <p className="text-lg text-slate-600 mb-1">{translations.subtitle}</p>
          <p className="text-sm text-slate-500">{translations.description}</p>
        </div>

        {/* Language Selector */}
        <div className="flex justify-center gap-2 mb-6">
          <Button
            variant={language === "en" ? "default" : "outline"}
            size="sm"
            onClick={() => setLanguage("en" as const)}
          >
            English
          </Button>
          <Button
            variant={language === "ar" ? "default" : "outline"}
            size="sm"
            onClick={() => setLanguage("ar" as const)}
          >
            العربية
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Authentication Tabs */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl">{translations.title}</CardTitle>
            <CardDescription>{translations.description}</CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="email" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="email" className="text-xs sm:text-sm">
                  {translations.emailPasswordTab}
                </TabsTrigger>
                <TabsTrigger value="microsoft" className="text-xs sm:text-sm">
                  {translations.microsoftTab}
                </TabsTrigger>
                <TabsTrigger value="manus" className="text-xs sm:text-sm">
                  {translations.manusTab}
                </TabsTrigger>
              </TabsList>

              {/* Email/Password Tab */}
              <TabsContent value="email" className="space-y-4">
                <form onSubmit={handleEmailPasswordLogin} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      {translations.emailLabel}
                    </label>
                    <Input
                      type="email"
                      placeholder={translations.emailPlaceholder}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      {translations.passwordLabel}
                    </label>
                    <Input
                      type="password"
                      placeholder={translations.passwordPlaceholder}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="h-10"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-10 bg-blue-600 hover:bg-blue-700"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {translations.loading}
                      </>
                    ) : (
                      <>
                        <Mail className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
                        {translations.loginButton}
                      </>
                    )}
                  </Button>

                  <p className="text-center text-sm text-slate-600">
                    {translations.registerLink}
                  </p>
                </form>
              </TabsContent>

              {/* Microsoft Tab */}
              <TabsContent value="microsoft" className="space-y-4">
                <div className="text-center mb-4">
                  <p className="text-sm text-slate-600">{translations.microsoftDescription}</p>
                </div>

                <Button
                  onClick={handleMicrosoftLogin}
                  disabled={isLoading || !getMicrosoftLoginUrl.data}
                  className="w-full h-10 bg-blue-500 hover:bg-blue-600"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {translations.loading}
                    </>
                  ) : (
                    <>
                      <svg
                        className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`}
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" />
                      </svg>
                      {translations.microsoftButton}
                    </>
                  )}
                </Button>
              </TabsContent>

              {/* Manus OAuth Tab */}
              <TabsContent value="manus" className="space-y-4">
                <div className="text-center mb-4">
                  <p className="text-sm text-slate-600">{translations.manusDescription}</p>
                </div>

                <Button
                  onClick={handleManusLogin}
                  disabled={isLoading}
                  className="w-full h-10 bg-purple-600 hover:bg-purple-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {translations.loading}
                    </>
                  ) : (
                    <>
                      <Lock className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
                      {translations.manusButton}
                    </>
                  )}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="flex justify-center gap-6 mt-8 text-sm text-slate-600">
          <a href="#" className="hover:text-slate-900">
            {translations.privacyPolicy}
          </a>
          <span>•</span>
          <a href="#" className="hover:text-slate-900">
            {translations.termsOfService}
          </a>
          <span>•</span>
          <a href="#" className="hover:text-slate-900">
            {translations.support}
          </a>
        </div>
      </div>
    </div>
  );
}
