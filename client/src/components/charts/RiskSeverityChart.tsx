import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/i18n/useTranslation";

interface RiskSeverityData {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface Props {
  data: RiskSeverityData;
}

/**
 * RiskSeverityChart Component
 * Location: src/components/executive/RiskSeverityChart.tsx
 * 
 * Displays risk severity distribution as a donut chart
 * Shows: Critical, High, Medium, Low risks
 * 
 * Features:
 * - Donut chart visualization
 * - Color-coded by severity level
 * - Total risk count display
 * - RTL/LTR support
 * - Bilingual (EN/AR)
 */
export default function RiskSeverityChart({ data }: Props) {
  const { isRTL } = useLanguage();
  const { t } = useTranslation();

  // Transform data for recharts
  const chartData = [
    {
      name: t.riskCompliance?.critical || "Critical",
      value: data.critical,
      fill: "#dc2626", // red-600
    },
    {
      name: t.riskCompliance?.high || "High",
      value: data.high,
      fill: "#f97316", // orange-500
    },
    {
      name: t.riskCompliance?.medium || "Medium",
      value: data.medium,
      fill: "#eab308", // yellow-500
    },
    {
      name: t.riskCompliance?.low || "Low",
      value: data.low,
      fill: "#22c55e", // green-500
    },
  ].filter((item) => item.value > 0); // Only show levels with risks

  const total = data.critical + data.high + data.medium + data.low;

  // Custom label for donut center
  const renderCustomLabel = () => {
    return (
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-slate-900 font-bold text-lg"
      >
        {total}
      </text>
    );
  };

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
