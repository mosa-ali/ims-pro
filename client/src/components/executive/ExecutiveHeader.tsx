import React from 'react';
import { useLanguage } from "@/contexts/LanguageContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOperatingUnit } from "@/contexts/OperatingUnitContext";
import { ShieldCheck, Globe, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from '@/i18n/useTranslation';

/**
 * ExecutiveHeader
 * Location: src/components/executive/ExecutiveHeader.tsx
 * 
 * Branded header for the strategic dashboard.
 * Displays organizational context, trilingual support, and system health status.
 */
export default function ExecutiveHeader() {
  const { currentOrganization } = useOrganization();
  const { t } = useTranslation();

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      
      {/* LEFT: ONLY BRANDING */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="bg-teal-600 p-1.5 rounded-lg">
            <Activity className="w-5 h-5 text-white" />
          </div>

          <h1 className="text-2xl font-black uppercase">
            {t.organizationDashboard.executiveDashboard ?? "Executive Dashboard"}
          </h1>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Globe className="w-4 h-4" />
          <span>{currentOrganization?.name}</span>
        </div>
      </div>

      {/* RIGHT: EMPTY OR RESERVED FOR FUTURE GLOBAL ACTIONS */}
      <div />
    </div>
  );
}