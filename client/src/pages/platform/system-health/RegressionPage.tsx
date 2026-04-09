/**
 * ============================================================================
 * PLATFORM REGRESSION PROTECTION PAGE
 * ============================================================================
 * 
 * Dedicated platform-level regression protection & business rules page.
 * Contains the SystemHealthPanel (infrastructure readiness + regression engine).
 * 
 * Access: Platform Admin and Platform Super Admin only.
 * Route: /platform/system-health/regression
 * ============================================================================
 */

import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "@/lib/router-compat";
import { Button } from "@/components/ui/button";
import { SystemHealthPanel } from "../../settings/SystemHealthPanel";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export default function RegressionPage() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const navigate = useNavigate();
 
 const labels = {
 backToHealth: t.platformModule.backToSystemHealthProtection,
 };

 return (
 <div className="min-h-screen bg-gray-50/50" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="max-w-[1600px] mx-auto px-8 md:px-12 lg:px-16 py-8">
 {/* Back Button */}
 <div className="mb-6">
 <BackButton onClick={() => navigate('/platform/system-health')} label={labels.backToHealth} />
 </div>
 
 <SystemHealthPanel />
 </div>
 </div>
 );
}
