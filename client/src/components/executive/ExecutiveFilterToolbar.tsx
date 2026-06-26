import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Filter, Calendar, LayoutGrid, Search, RefreshCw } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOperatingUnit } from "@/contexts/OperatingUnitContext";
import { Button } from "@/components/ui/button";
import { useTranslation } from '@/i18n/useTranslation';

/**
 * ExecutiveFilterToolbar
 * Location: src/components/executive/ExecutiveFilterToolbar.tsx
 * 
 * Global dashboard filtering and scoping.
 */
export default function ExecutiveFilterToolbar() {
      const {language } = useLanguage();
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const { currentOrganization } = useOrganization();
    const { currentOperatingUnit } = useOperatingUnit();
    const organizationId = currentOrganization?.id || 0;
    const operatingUnitId = currentOperatingUnit?.id;
    

return (
  <div className="flex flex-col lg:flex-row items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">

      {/* Current Operating Unit Context */}
      <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 min-w-[220px]">
        <LayoutGrid className="w-4 h-4 text-slate-500 shrink-0" />

        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">
            Operating Unit
          </span>

          <span className="text-sm font-bold text-slate-800">
            {currentOperatingUnit?.name || "No Operating Unit Assigned"}
          </span>
        </div>
      </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
          <Calendar className="w-4 h-4 text-slate-400" />
          <Select defaultValue="fy24">
            <SelectTrigger className="border-none bg-transparent h-fit p-0 text-xs font-bold text-slate-700 shadow-none focus:ring-0">
              <SelectValue placeholder="Fiscal Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fy24">Fiscal Year 2024</SelectItem>
              <SelectItem value="fy23">Fiscal Year 2023</SelectItem>
              <SelectItem value="q3_24">Quarter 3, 2024</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
          <Filter className="w-4 h-4 text-slate-400" />
          <Select defaultValue="all">
            <SelectTrigger className="border-none bg-transparent h-fit p-0 text-xs font-bold text-slate-700 shadow-none focus:ring-0">
              <SelectValue placeholder="Project Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="at_risk">At Risk Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full lg:w-auto">
        <div className="relative flex-1 lg:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search Intelligence..." 
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>
        <Button variant="outline" size="icon" className="rounded-lg h-9 w-9 bg-slate-50 border-slate-100">
          <RefreshCw className="w-4 h-4 text-slate-500" />
        </Button>
      </div>
    </div>
  );
}
