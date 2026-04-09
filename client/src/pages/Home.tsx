import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * IMS Home/Landing Page
 * Handles authentication and redirects authenticated users to appropriate dashboard
 */
export default function Home() {
  const { user, loading, error, isAuthenticated, logout } = useAuth();
  const { language, isRTL } = useLanguage();
  const [, setLocation] = useLocation();
  


  // Redirect authenticated users to appropriate dashboard
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      // Only redirect once when user is authenticated
      const timer = setTimeout(() => {
        if (user.platformRole === "platform_admin") {
          setLocation("/platform");
        } else {
          setLocation("/organization");
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [loading, isAuthenticated, user?.platformRole, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading IMS...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page
    useEffect(() => {
      setLocation('/login');
    }, []);
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Redirecting to Sign-In...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="container py-16">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-primary mb-2">
              {isRTL ? "مرحباً بك في نظام IMS" : "Welcome to IMS"}
            </h1>
            <p className="text-lg text-muted-foreground">
              {isRTL ? "نظام الإدارة المتكامل" : "Integrated Management System"}
            </p>
          </div>

          <div className="bg-card rounded-lg shadow-sm p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? "تم تسجيل الدخول باسم" : "Signed in as"}
                </p>
                <p className="text-lg font-semibold text-foreground">{user?.name || user?.email}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {isRTL ? "الدور" : "Role"}: {user?.role}
                </p>
              </div>
              <button
                onClick={() => logout()}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90"
              >
                {isRTL ? "تسجيل الخروج" : "Sign Out"}
              </button>
            </div>

            <div className="border-t border-border pt-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                {isRTL ? "نظام الإدارة المتكامل" : "Integrated Management System"}
              </h2>
              <p className="text-muted-foreground mb-4">
                {isRTL
                  ? "أنت الآن متصل بنظام الإدارة المتكامل. يمكنك الوصول إلى جميع الميزات والوظائف."
                  : "You are now connected to the Integrated Management System. You can access all features and functionalities."}
              </p>
              <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
                <p className="text-sm text-accent font-semibold">
                  {isRTL ? "✓ جاهز للاستخدام" : "✓ Ready to Use"}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {isRTL
                    ? "سيتم إعادة توجيهك إلى لوحة التحكم المناسبة بناءً على دورك."
                    : "You will be redirected to the appropriate dashboard based on your role."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
