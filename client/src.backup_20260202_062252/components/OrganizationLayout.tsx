import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { getLoginUrl } from "@/const";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { useLanguage } from "@/contexts/LanguageContext";

interface OrganizationLayoutProps {
  children: React.ReactNode;
}

/**
 * OrganizationLayout - Layout wrapper for organization-level pages
 * 
 * Features:
 * - Context-aware header (Organization branded)
 * - Optional sidebar for organization navigation
 * - Authentication and role checks
 */
export default function OrganizationLayout({ children }: OrganizationLayoutProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { isRTL } = useLanguage();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [loading, isAuthenticated]);

  // Block Platform Admins from Organization routes (strict isolation)
  useEffect(() => {
    if (!loading && user && user.platformRole === "platform_admin") {
      // Redirect Platform Admins to their dashboard
      setLocation("/platform");
    }
  }, [loading, user, setLocation]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div 
      className={`min-h-screen flex bg-background ${isRTL ? 'flex-row-reverse' : ''}`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Unified Sidebar (Organization Mode) */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Context-Aware Header (Organization branded) */}
        <Header />

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
