import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { Globe, MousePointer2 } from "lucide-react";
import { useTranslation } from '@/i18n/useTranslation';
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOperatingUnit } from "@/contexts/OperatingUnitContext";
import GeographicFundingMap, { type ProjectMapData } from "@/components/charts/GeographicFundingMap";
import { resolveCountryGeoJson, normalizeCountryName } from "../../utils/countryGeoJsonMap";

interface Props {
  data?: { operatingUnitCountry: string | null; projects: any[] } | any[];
  isLoading: boolean;
}

/**
 * ExecutiveGeographicPanel
 * Location: src/components/executive/ExecutiveGeographicPanel.tsx
 *
 * Fixes applied:
 * - Map fills full container height — no fixed height gaps
 * - Governorate names always visible on target governorates
 * - Removed bottom overlays (legend + coverage count)
 * - Maintains title banner and hover tooltips
 */
export default function ExecutiveGeographicPanel({ data, isLoading }: Props) {
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  // Get org name for the map title overlay
  const { currentOrganization } = useOrganization();
  const { currentOperatingUnit } = useOperatingUnit();
  


  // ── Normalize data shape ───────────────────────────────────────────────────
  const { operatingUnitCountry, rawProjects } = useMemo(() => {
    if (!data) return { operatingUnitCountry: null, rawProjects: [] };
    if (!Array.isArray(data) && "projects" in data) {
      return {
        operatingUnitCountry: data.operatingUnitCountry,
        rawProjects: data.projects,
      };
    }
    return {
      operatingUnitCountry: null,
      rawProjects: Array.isArray(data) ? data : [],
    };
  }, [data]);

  const geoJsonUrl = useMemo(
    () => resolveCountryGeoJson(operatingUnitCountry),
    [operatingUnitCountry]
  );

  const countryDisplayName = useMemo(
    () => normalizeCountryName(operatingUnitCountry),
    [operatingUnitCountry]
  );

  const normalizedProjects: ProjectMapData[] = useMemo(() => {
    return rawProjects.map((p: any) => ({
      projectId:   p.projectId,
      projectCode: p.projectCode ?? "",
      status:      p.status ?? "active",
      totalBudget: Number(p.totalBudget ?? 0),
      totalSpent:  Number(p.totalSpent ?? 0),
      governorates: (p.governorates ?? []).map((g: any) => ({
        governorateId:   g.governorateId,
        governorateName: g.governorateName ?? "",
        country:         g.country ?? "",
      })),
    }));
  }, [rawProjects]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Card className="h-full border-none shadow-sm overflow-hidden bg-white">
        <CardHeader className="border-b bg-slate-50/50 py-4 px-6">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32 mt-1" />
        </CardHeader>
        <CardContent className="p-0 flex-1">
          <Skeleton className="w-full h-full rounded-none" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full border-none shadow-sm overflow-hidden bg-white flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <CardHeader className="border-b bg-slate-50/50 py-4 px-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-teal-100 p-1.5 rounded-lg">
              <Globe className="w-4 h-4 text-teal-700" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-slate-800">
                {t?.NewDashboardTranslations?.humanitarianFootprint ??
                  "Humanitarian Footprint"}
              </CardTitle>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">
                {currentOrganization?.name} · {countryDisplayName} · Geographic Coverage
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* ── Map — fills full remaining height, no padding ────────────────── */}
      <CardContent className="p-0 flex-1 overflow-hidden">
        <GeographicFundingMap
          projects={normalizedProjects}
          geoJsonUrl={geoJsonUrl}
          countryName={countryDisplayName}
          height="100%"
          operatingUnitName={currentOperatingUnit?.name}
        />
      </CardContent>
    </Card>
  );
}
