import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";

/**
 * KPI Card: High-density metric display with trend and progress indicators.
 */
export const KPICard: React.FC<{
  title: string;
  value: string | number;
  trend?: string;
  trendPositive?: boolean;
  subtext?: string;
  progress?: number;
  status?: "stable" | "warning" | "critical";
  loading?: boolean;
}> = ({
  title,
  value,
  trend,
  trendPositive,
  subtext,
  progress,
  status,
  loading,
}) => (
  <Card className="p-5 bg-surface-container-lowest border border-border shadow-sm flex flex-col justify-between h-full">
    <div>
      <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-2">
        {title}
      </p>
      {loading ? (
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
      ) : (
        <div className="flex items-baseline gap-2">
          <h3 className="text-xl font-extrabold text-primary">{value}</h3>
          {trend && (
            <Badge
              variant={trendPositive ? "secondary" : "destructive"}
              className="text-xs py-0 px-1.5 font-bold"
            >
              {trend}
            </Badge>
          )}
        </div>
      )}
    </div>
    <div className="mt-4">
      {progress !== undefined && (
        <div className="space-y-1.5">
          <Progress value={progress} className="h-1.5 bg-muted" />
          <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase">
            <span>Utilization</span>
            <span>{progress}%</span>
          </div>
        </div>
      )}
      {subtext && (
        <p className="text-muted-foreground text-xs font-medium italic mt-2">
          {subtext}
        </p>
      )}
      {status === "critical" && (
        <div className="flex items-center gap-1 mt-2 text-destructive">
          <span className="text-xs">⚠️</span>
          <span className="text-xs font-bold uppercase">Over Forecast</span>
        </div>
      )}
    </div>
  </Card>
);

/**
 * NavigationTile: Actionable tile for high-level module navigation.
 */
export const NavigationTile: React.FC<{
  title: string;
  description: string;
  icon: string;
  onClick: () => void;
  metric?: { label: string; value: string };
}> = ({ title, description, icon, onClick, metric }) => (
  <div
    className="bg-surface-container-lowest p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between h-full"
    onClick={onClick}
  >
    <div>
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
          <span className="text-lg">{icon}</span>
        </div>
        {metric && (
          <div className="text-right">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              {metric.label}
            </p>
            <p className="text-lg font-black text-primary">{metric.value}</p>
          </div>
        )}
      </div>
      <h3 className="text-base font-bold mb-2 group-hover:text-primary transition-colors">
        {title}
      </h3>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
        {description}
      </p>
    </div>
    <div className="mt-4 flex items-center text-xs font-bold text-primary uppercase opacity-0 group-hover:opacity-100 transition-opacity">
      Open Module <span className="ml-1">→</span>
    </div>
  </div>
);

/**
 * PredictiveAlertPanel: Real-time risk detection for budget overspends.
 */
export const PredictiveAlertPanel: React.FC<{
  alerts?: any[];
  loading?: boolean;
}> = ({ alerts, loading }) => {
  const [, setLocation] = useLocation();

  const getSeverityTier = (pct: number) => {
    if (pct >= 20)
      return {
        label: "CRITICAL RISK",
        color: "text-destructive",
        bg: "bg-destructive/10",
        variant: "destructive" as const,
        showAction: true,
      };
    if (pct >= 10)
      return {
        label: "HIGH RISK",
        color: "text-orange-500",
        bg: "bg-orange-500/10",
        variant: "warning" as const,
        showAction: false,
      };
    return {
      label: "WARNING",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      variant: "warning" as const,
      showAction: false,
    };
  };

  return (
    <Card className="bg-surface-container-lowest border border-border shadow-sm overflow-hidden flex flex-col h-full">
      <header className="bg-destructive/10 p-4 border-b border-border flex justify-between items-center">
        <div className="flex items-center gap-2 text-destructive font-bold">
          <span className="text-sm">🔔</span>
          <h3 className="text-xs uppercase tracking-widest">
            Predictive Risk Alerts
          </h3>
        </div>
        <Badge variant="destructive" className="font-bold">
          SYSTEM ACTIVE
        </Badge>
      </header>
      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="p-4 h-20 bg-muted/50 animate-pulse" />
          ))
        ) : alerts?.length ? (
          alerts.map((alert, idx) => {
            const tier = getSeverityTier(Number(alert.overspendPercentage));
            return (
              <div
                key={idx}
                className="p-4 hover:bg-surface-container-low/50 transition-colors flex justify-between items-center gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-black ${tier.color} px-1.5 py-0.5 rounded ${tier.bg}`}
                    >
                      {alert.projectCode}
                    </span>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-tighter">
                      {tier.label}
                    </span>
                  </div>
                  <h4
                    className="font-bold text-sm text-primary line-clamp-1 cursor-pointer hover:underline"
                    onClick={() =>
                      setLocation(`/finance/project/${alert.id}`)
                    }
                  >
                    {alert.title}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Projected overspend:{" "}
                    <span className={`font-bold ${tier.color}`}>
                      ${Number(alert.overspendAmount).toLocaleString()}
                    </span>{" "}
                    ({alert.overspendPercentage}%)
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-bold px-3"
                    onClick={() =>
                      setLocation(`/finance/ledger?projectId=${alert.id}`)
                    }
                  >
                    Review GL
                  </Button>
                  {tier.showAction && (
                    <Button
                      variant="default"
                      size="sm"
                      className="h-8 text-xs font-bold px-3 bg-destructive hover:bg-destructive/90"
                      onClick={() =>
                        setLocation(`/finance/project/${alert.id}/mitigate`)
                      }
                    >
                      MITIGATE NOW
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No alerts at this time
          </div>
        )}
      </div>
    </Card>
  );
};

/**
 * FinancialHealthMatrix: Portfolio-wide financial health matrix.
 */
interface FinancialHealthMatrixRow {
  projectCode: string | null;
  title: string | null;
  budget: string | null;
  spent: string | null;
  variancePct: unknown;
  health: unknown;
}

interface FinancialHealthMatrixProps {
  data?: FinancialHealthMatrixRow[];
  loading?: boolean;
}

export const FinancialHealthMatrix: React.FC<FinancialHealthMatrixProps> = ({
  data = [],
  loading = false,
}) => {
  if (loading) {
    return (
      <Card className="p-6 bg-surface-container-lowest border border-border shadow-sm">
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Loading financial health matrix...
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="p-6 bg-surface-container-lowest border border-border shadow-sm">
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          No financial health data available.
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-0 bg-surface-container-lowest border-0 shadow-none">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">

          <thead className="bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-bold">Project</th>
              <th className="px-4 py-3 text-right font-bold">Budget</th>
              <th className="px-4 py-3 text-right font-bold">Spent</th>
              <th className="px-4 py-3 text-right font-bold">Variance</th>
              <th className="px-4 py-3 text-center font-bold">Health</th>
            </tr>
          </thead>

          <tbody>
            {data.map((row, index) => (
              <tr
                key={`${row.projectCode}-${index}`}
                className="border-t border-border hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-4">
                  <div className="font-semibold text-primary">
                    {row.projectCode ?? "-"}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {row.title ?? "-"}
                  </div>
                </td>

                <td className="px-4 py-4 text-right">
                  {Number(row.budget ?? 0).toLocaleString()}
                </td>

                <td className="px-4 py-4 text-right">
                  {Number(row.spent ?? 0).toLocaleString()}
                </td>

                <td className="px-4 py-4 text-right">
                  {Number(row.variancePct ?? 0).toFixed(1)}%
                </td>

                <td className="px-4 py-4 text-center">
                  <Badge
                    variant={
                      row.health === "CRITICAL"
                        ? "destructive"
                        : row.health === "AT RISK"
                        ? "secondary"
                        : "default"
                    }
                  >
                    {String(row.health)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      </div>
    </Card>
  );
};