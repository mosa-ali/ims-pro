/**
 * client/src/pages/organization/OrganizationDashboardPage.tsx
 * ============================================================================
 * ORGANIZATION DASHBOARD PAGE
 * ============================================================================
 *
 * Main page component that displays the Power BI-style executive dashboard
 * with real data from the database via tRPC procedures.
 *
 * Features:
 * - Uses PowerBIExecutiveDashboard component
 * - Real data from useOrganizationDashboard hook
 * - Language and RTL/LTR support
 * - Loading and error states
 *
 * NO MOCK DATA - All data is real from database
 */

import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2 } from "lucide-react";
import ExecutiveIntelligenceCenter from "@/components/executive/ExecutiveIntelligenceCenter";

/**
 * Organization Dashboard Page
 * Displays the Power BI-style executive dashboard with real data
 */
export default function OrganizationDashboardPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { language, isRTL } = useLanguage();
  const [, setLocation] = useLocation();
  const [refreshKey, setRefreshKey] = useState(0);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  // Redirect if user is not part of an organization
  useEffect(() => {
    if (!authLoading && isAuthenticated && user && !user.organizationId) {
      setLocation("/");
    }
  }, [authLoading, isAuthenticated, user, setLocation]);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // Show loading state while authenticating
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  // Render dashboard
  return (
    <ExecutiveIntelligenceCenter
      key={refreshKey}
      language={language as "en" | "ar" | "it"}
      isRTL={isRTL}
      onRefresh={handleRefresh}
    />
  );
}
