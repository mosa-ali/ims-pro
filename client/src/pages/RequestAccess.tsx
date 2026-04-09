import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, CheckCircle, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface RequestAccessPageProps {
  isRTL?: boolean;
}

export default function RequestAccessPage({ isRTL = false }: RequestAccessPageProps) {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    organizationName: "",
    reason: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestAccessMutation = trpc.requestAccess.submitRequest.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setError(null);
      setFormData({ email: "", fullName: "", organizationName: "", reason: "" });
    },
    onError: (err) => {
      setError(err.message || "Failed to submit request. Please try again.");
    },
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.email || !formData.fullName || !formData.organizationName) {
      setError("Please fill in all required fields");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Please enter a valid email address");
      return;
    }

    requestAccessMutation.mutate(formData);
  };

  if (submitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-green-100 rounded-full animate-pulse" />
                <CheckCircle className="relative h-16 w-16 text-green-500" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {isRTL ? "تم استقبال طلبك" : "Request Received"}
            </h2>

            <p className="text-slate-600 mb-4 leading-relaxed">
              {isRTL
                ? "شكراً لتقديمك طلب الوصول. سيتم مراجعة طلبك من قبل مسؤول المنظمة وسيتم إخطارك عند الموافقة."
                : "Thank you for submitting your access request. Your request will be reviewed by your organization administrator and you will be notified once approved."}
            </p>

            <p className="text-sm text-slate-500 mb-6">
              {isRTL
                ? "سيتم إرسال تأكيد إلى بريدك الإلكتروني"
                : "A confirmation has been sent to your email"}
            </p>

            <Button
              onClick={() => setLocation("/")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isRTL ? "العودة إلى الرئيسية" : "Go Home"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            {isRTL ? "طلب الوصول" : "Request Access"}
          </CardTitle>
          <CardDescription>
            {isRTL
              ? "إذا لم يكن لديك حساب بعد، يمكنك تقديم طلب وصول. سيتم مراجعة طلبك من قبل مسؤول المنظمة."
              : "If you don't have access to the system, you can submit a request. Your request will be reviewed by your organization administrator."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {isRTL ? "الاسم الكامل *" : "Full Name *"}
              </label>
              <Input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder={isRTL ? "أدخل اسمك الكامل" : "Enter your full name"}
                required
                className="w-full"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {isRTL ? "البريد الإلكتروني *" : "Email Address *"}
              </label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder={isRTL ? "أدخل بريدك الإلكتروني" : "Enter your email address"}
                required
                className="w-full"
              />
            </div>

            {/* Organization Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {isRTL ? "اسم المنظمة *" : "Organization Name *"}
              </label>
              <Input
                type="text"
                name="organizationName"
                value={formData.organizationName}
                onChange={handleInputChange}
                placeholder={isRTL ? "أدخل اسم منظمتك" : "Enter your organization name"}
                required
                className="w-full"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {isRTL ? "السبب" : "Reason for Access"}
              </label>
              <Textarea
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                placeholder={isRTL ? "اشرح سبب طلبك للوصول" : "Explain why you need access"}
                className="w-full min-h-24"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={requestAccessMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {requestAccessMutation.isPending
                ? isRTL
                  ? "جاري الإرسال..."
                  : "Submitting..."
                : isRTL
                  ? "تقديم الطلب"
                  : "Submit Request"}
            </Button>
          </form>

          {/* Sign In Link */}
          <div className="mt-6 text-center text-sm">
            <span className="text-slate-600">
              {isRTL ? "هل لديك حساب بالفعل؟" : "Already have an account?"}
            </span>{" "}
            <button
              onClick={() => setLocation("/login")}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              {isRTL ? "تسجيل الدخول" : "Sign In"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
