import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Building2, ExternalLink } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { useTranslation } from '@/i18n/useTranslation';
import { trpc } from "@/lib/trpc";
import { useNavigate } from"@/lib/router-compat";

interface Props {
  isLoading: boolean;
}

/**
 * ExecutiveDonorPanel
 * Location: src/components/executive/ExecutiveDonorPanel.tsx
 * 
 * Strategic donor relationship and concentration dashboard.
 */
export default function ExecutiveDonorPanel({ isLoading }: Props) {
  const { language } = useLanguage();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();

  const {
    data: donors = [],
     isLoading: donorsLoading
  } =
    trpc.executiveDashboard.getTopDonors.useQuery();

  const {
    data: summary
  } =
    trpc.executiveDashboard.getDonorPortfolioSummary.useQuery();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Donor Ranking List */}
      <Card className="lg:col-span-8 border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b py-5 px-6 bg-slate-50/30">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-teal-600" />
            <CardTitle className="text-sm font-bold text-slate-800">
              {t.NewDashboardTranslations.topDonorsByValue ?? "Top 5 Donors by Value"}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {donors.map((donor, idx) => (
                <div
                  key={`${donor.donorName}-${idx}`}
                  className="p-4 grid grid-cols-[1fr_180px] gap-4 items-center hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 flex-shrink-0">
                      #{idx + 1}
                    </div>

                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">
                        {donor.donorName}
                      </p>

                      <p className="text-xs text-slate-400 uppercase">
                        {donor.activeProjects} {donor.activeProjects === 1 ? "Project" : "Projects"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                      Total Value
                    </p>

                    <p className="font-black text-teal-700 text-xl">
                      {formatCurrency(
                        Number(donor.totalValue ?? 0),
                        donor.currency ?? "USD",
                        language
                      )}
                    </p>
                  </div>
                </div>
                  ))}
                </div>
              )}
        </CardContent>
      </Card>

      {/* Donor Intelligence Stats */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        <Card className="border-none shadow-sm bg-teal-800 text-white overflow-hidden">
          <CardContent className="p-6 space-y-4">
            <div className="bg-white/10 w-10 h-10 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-teal-300 uppercase tracking-widest mb-1">{t.NewDashboardTranslations.donorRetentionRate ?? "Active Donors"}</p>
              <h3 className="text-4xl font-black tracking-tighter">{summary?.totalDonors ?? 0}</h3>
            </div>
            <p className="text-[10px] font-medium text-teal-100 opacity-60 leading-relaxed">
              Based on YoY comparison of multi-year grant agreements and pipeline renewals.
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black text-slate-500 uppercase tracking-widest">{t.NewDashboardTranslations.strategicEngagement ?? "Strategic Engagement"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-indigo-50 p-2 rounded-lg mt-1">
                <Building2 className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 leading-tight">Bilateral Concentration High</p>
                <p className="text-[10px] text-slate-500 mt-1">{summary?.concentration ?? 0}%
                  of portfolio value comes from
                  the two largest donors. Diversification recommended.</p>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100">
               <button
              onClick={() => navigate("/organization/grants")}
              className="w-full py-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 uppercase tracking-widest hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
            >
              {t.NewDashboardTranslations.openGrantTracker ?? "Open Grant Tracker"}
              <ExternalLink className="w-3 h-3" />
            </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
