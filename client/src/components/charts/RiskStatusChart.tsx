import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/i18n/useTranslation";

interface RiskStatusData {
  identified: number;
  mitigated: number;
  accepted: number;
  transferred: number;
  closed: number;
}

interface Props {
  data: RiskStatusData;
}

/**
 * RiskStatusChart Component
 * Location: src/components/executive/RiskStatusChart.tsx
 * 
 * Displays risk status distribution as a donut chart
 * Shows: Identified, Mitigated, Accepted, Transferred, Closed
 * 
 * Features:
 * - Donut chart visualization
 * - Color-coded by status
 * - Total risk count display
 * - RTL/LTR support
 * - Bilingual (EN/AR)
 */
export default function RiskStatusChart({ data }: Props) {
  const { isRTL } = useLanguage();
  const { t } = useTranslation();

  // Status colors mapping
  const statusColors: Record<string, string> = {
    identified: "#ef4444", // red-500
    mitigated: "#f97316", // orange-500
    accepted: "#3b82f6", // blue-500
    transferred: "#a855f7", // purple-500
    closed: "#22c55e", // green-500
  };

  // Transform data for recharts
  const chartData = [
    {
      name: t.riskCompliance?.identified || "Identified",
      value: data.identified,
      fill: statusColors.identified,
    },
    {
      name: t.riskCompliance?.mitigated || "Mitigated",
      value: data.mitigated,
      fill: statusColors.mitigated,
    },
    {
      name: t.riskCompliance?.accepted || "Accepted",
      value: data.accepted,
      fill: statusColors.accepted,
    },
    {
      name: t.riskCompliance?.transferred || "Transferred",
      value: data.transferred,
      fill: statusColors.transferred,
    },
    {
      name: t.riskCompliance?.closed || "Closed",
      value: data.closed,
      fill: statusColors.closed,
    },
  ].filter((item) => item.value > 0); // Only show statuses with risks

  const total =
    data.identified +
    data.mitigated +
    data.accepted +
    data.transferred +
    data.closed;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;
      return (
        <div className="bg-white p-2 border border-slate-200 rounded shadow-lg">
          <p className="text-sm font-semibold text-slate-900">{data.name}</p>
          <p className="text-sm text-slate-600">
            {data.value} ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      {total > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className={`grid grid-cols-2 gap-3 mt-4 w-full ${isRTL ? "rtl" : "ltr"}`}>
            {chartData.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.fill }}
                />
                <span className="text-xs text-slate-600">
                  {item.name} ({item.value})
                </span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="mt-4 text-center">
            <p className="text-xs text-slate-500">
              {t.riskCompliance?.totalRisks || "Total Risks"}
            </p>
            <p className="text-lg font-bold text-slate-900">{total}</p>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-64 text-slate-500">
          <p className="text-sm">{t.common?.noData || "No risks identified"}</p>
        </div>
      )}
    </div>
  );
}
