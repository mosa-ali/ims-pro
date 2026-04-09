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
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface BackToModulesButtonProps {
  targetPath?: string;
  parentModuleName?: string;
}

export function BackToModulesButton({ 
  targetPath = '/organization/hr',
  parentModuleName 
}: BackToModulesButtonProps) {
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();

  // Default to "HR Dashboard" if no parent module name provided
  const defaultText = {
    backText: language === 'en' ? 'HR Dashboard' : 'لوحة الموارد البشرية'
  };

  const displayText = parentModuleName || defaultText.backText;

  return (
    <button
      onClick={() => navigate(targetPath)}
      className={`flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
      aria-label={`Back to ${displayText}`}
    >
      <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
      <span>{displayText}</span>
    </button>
  );
}
