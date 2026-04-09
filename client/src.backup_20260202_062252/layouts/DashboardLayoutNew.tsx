import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { DashboardLayoutSkeleton } from '@/components/DashboardLayoutSkeleton';
import { initializeLanguage } from '@/lib/i18nInit';
import { trpc } from '@/lib/trpc';
import { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { AppLayoutLTR } from "./AppLayoutLTR";
import { AppLayoutRTL } from "./AppLayoutRTL";

export default function DashboardLayoutNew({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const { loading, user } = useAuth();
  const { data: organizations } = trpc.organizations.list.useQuery(undefined, { enabled: !!user });
  const [currentLang, setCurrentLang] = useState(i18n.language);

  // Initialize language based on user preference, org default, and browser detection
  useEffect(() => {
    if (user && organizations && organizations.length > 0) {
      const currentOrg = organizations.find(org => org.id === user.currentOrganizationId);
      const orgDefaultLang = currentOrg?.defaultLanguage;
      const userLangPref = (user as any).languagePreference;
      
      initializeLanguage(userLangPref, orgDefaultLang);
    }
  }, [user, organizations]);

  // Track language changes for transition effect
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previousLang, setPreviousLang] = useState(i18n.language);

  // Set dir attribute on html element and track language changes
  useEffect(() => {
    const dir = i18n.dir();
    document.documentElement.setAttribute('dir', dir);
    
    // Trigger transition if language changed
    if (previousLang !== i18n.language) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setPreviousLang(i18n.language);
        setCurrentLang(i18n.language);
      }, 150); // Match transition duration
      return () => clearTimeout(timer);
    } else {
      setCurrentLang(i18n.language);
    }
  }, [i18n.language, previousLang]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              {t('common.signInToContinue', 'Sign in to continue')}
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {t('common.authRequired', 'Access to this dashboard requires authentication. Continue to launch the login flow.')}
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            {t('common.signIn', 'Sign in')}
          </Button>
        </div>
      </div>
    );
  }

  // Determine if RTL based on current language
  const isRTL = currentLang === 'ar' || currentLang.startsWith('ar-');

  // Choose layout based on direction
  const LayoutComponent = isRTL ? AppLayoutRTL : AppLayoutLTR;

  return (
    <div 
      className="transition-opacity duration-150 ease-in-out"
      style={{ opacity: isTransitioning ? 0.6 : 1 }}
    >
      <LayoutComponent>{children}</LayoutComponent>
    </div>
  );
}
