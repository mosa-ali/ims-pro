import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, Info, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { ExecutiveAlert } from "@shared/types/executive";
import { useTranslation } from '@/i18n/useTranslation';

interface Props {
  alerts: ExecutiveAlert[];
}

/**
 * ExecutiveAlertsPanel
 * Location: src/components/executive/ExecutiveAlertsPanel.tsx
 * 
 * Aggregated operational and data integrity flags.
 */
export default function ExecutiveAlertsPanel({ alerts }: Props) {
      const {language } = useLanguage();
    const { t } = useTranslation();
    const { isRTL } = useLanguage();

    const [showAllAlerts, setShowAllAlerts] = React.useState(false);

  const getAlertConfig = (type: string) => {
    switch (type) {
      case 'critical':
        return { icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', label: t.NewDashboardTranslations.critical ?? 'Critical' };
      case 'warning':
        return { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', label: t.NewDashboardTranslations.warning ?? 'Warning' };
      default:
        return { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', label: t.NewDashboardTranslations.info ?? 'Info' };
    }
  };

  const visibleAlerts = showAllAlerts
  ? alerts
  : alerts.slice(0, 3);

      return (
      <Card className="border-none shadow-sm bg-white overflow-hidden h-full">
        <CardHeader className="border-b py-4 px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <CardTitle className="text-sm font-bold text-slate-800">
                {t.NewDashboardTranslations.operationalFlags ??
                  "Operational Flags & Compliance"}
              </CardTitle>
            </div>

            <Badge
              variant="secondary"
              className="bg-slate-100 text-slate-600 text-[10px] font-bold"
            >
              {alerts.length} Active
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {alerts.length > 0 ? (
            <>
              <div className="divide-y divide-slate-100">
                {visibleAlerts.map((alert) => {
                  const config = getAlertConfig(alert.type);
                  const Icon = config.icon;

                  return (
                    <div
                      key={alert.id}
                      className="p-4 hover:bg-slate-50/50 transition-colors flex gap-4"
                    >
                      <div
                        className={`${config.bg} ${config.color} p-2 rounded-xl h-fit flex-shrink-0`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <Badge
                            variant="outline"
                            className={`${config.color} ${config.border} text-[9px] font-black uppercase tracking-widest px-2 py-0 h-4`}
                          >
                            {alert.category}
                          </Badge>

                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium whitespace-nowrap">
                            <Clock className="w-3 h-3" />
                            {alert.date}
                          </div>
                        </div>

                        <p className="text-xs font-bold text-slate-900 leading-normal">
                          {alert.message}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {alerts.length > 3 && (
                <div className="border-t border-slate-100 p-4 flex justify-center bg-slate-50/50">
                  <button
                    onClick={() => setShowAllAlerts(!showAllAlerts)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    {showAllAlerts
                      ? "View Less"
                      : `View More (${alerts.length - 3} Remaining)`}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-slate-400">
              <p className="text-sm font-medium">
                {t.projectDetail.noAlertsYet ??
                  "No critical alerts detected"}
              </p>
            </div>
          )}
        </CardContent>
    </Card>
  );
}
