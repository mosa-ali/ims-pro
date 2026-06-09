/**
 * ============================================================================
 * BACK NAVIGATION BUTTON - Reusable Component
 * ============================================================================
 * Shows parent module name (e.g., "← HR Dashboard" or "← Employees Profiles")
 * 
 * NAVIGATION HIERARCHY:
 * - HR Module Launcher (/organization/hr) → No back button needed
 * - HR Sub-modules (overview, staff-dictionary, etc.) → Back to HR Module Launcher
 * - HR Sub-screens (employee profile, add employee, etc.) → Back to parent sub-module
 */

import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

interface BackToModulesButtonProps {
 targetPath?: string;
 parentModuleName?: string;
}

export function BackToModulesButton({
 targetPath = '/organization/hr',
 parentModuleName 
}: BackToModulesButtonProps) {
 const { t } = useTranslation(); 
 const { language, isRTL } = useLanguage();
 const navigate = useNavigate();

 // Default to "HR Dashboard" if no parent module name provided
 const defaultText = {
 backText: t.hr.hrDashboard
 };

 const displayText = parentModuleName || defaultText.backText;

 return (
 <BackButton onClick={() => navigate(targetPath)} label={displayText} />
 );
}
