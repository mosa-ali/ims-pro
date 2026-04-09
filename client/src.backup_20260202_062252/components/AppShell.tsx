import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { ReactNode, useMemo, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface AppShellProps {
  children: ReactNode;
}

/**
 * AppShell - Single Root Layout Component
 * 
 * CRITICAL: This component mounts ONCE and never remounts during navigation.
 * Only the children (page content) changes when navigating.
 * 
 * This ensures:
 * - Sidebar never reloads
 * - Header never reloads
 * - Context preserved across navigation
 * - Instant navigation (<300ms)
 * 
 * Layout selection is based on current route, but the AppShell itself
 * stays mounted for the entire session.
 * 
 * Auth checks happen here at the layout level, not per page.
 */
export default function AppShell({ children }: AppShellProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();

  // Determine which layout to show based on current route
  // This is a simple check, not a remount trigger
  const layoutType = useMemo(() => {
    if (location.startsWith("/platform")) return "platform";
    if (location.startsWith("/organization")) return "organization";
    return "none"; // Home page or other routes without layout
  }, [location]);

  // Auth check: Redirect to login if not authenticated (for protected routes)
  useEffect(() => {
    if (!loading && !isAuthenticated && layoutType !== "none") {
      window.location.href = getLoginUrl();
    }
  }, [loading, isAuthenticated, layoutType]);

  // Role-based routing: Restrict non-platform-admins from platform routes
  // NOTE: Platform admins CAN access organization routes during development for testing
  useEffect(() => {
    if (!loading && user) {
      if (user.platformRole !== "platform_admin" && layoutType === "platform") {
        // Non-platform-admins trying to access platform routes → redirect to home
        setLocation("/");
      }
      // Platform admins are allowed to access both /platform/* and /organization/* routes
    }
  }, [loading, user, layoutType, setLocation]);

  // Show loading state (only on initial load, not on navigation)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // No layout for home page or public routes
  if (layoutType === "none") {
    return <>{children}</>;
  }

  // Don't render protected routes if not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  // Platform layout (for platform admins only)
  if (layoutType === "platform") {
    if (user.platformRole !== "platform_admin") {
      return null; // Will redirect via useEffect
    }

    return (
      <div className="min-h-screen flex bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    );
  }

  // Organization layout (for organization users AND platform admins during development)
  if (layoutType === "organization") {
    // Allow both organization users and platform admins to access organization routes
    return (
      <div className="min-h-screen flex bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    );
  }

  // Fallback (should never reach here)
  return <>{children}</>;
}
