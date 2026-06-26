import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from '@/i18n/useTranslation';


interface Props {
  data: Array<{ month: string; cumulativeBudget: number; cumulativeActual: number }>;
  height?: number;
}

/**
 * BurnRateChart
 * Location: src/components/charts/BurnRateChart.tsx
 * 
 * Displays cumulative spend vs. plan to visualize portfolio-wide velocity.
 */
export default function BurnRateChart({ data, height = 300 }: Props) {
  const {language } = useLanguage();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorBudget" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0d9488" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="month" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
          />
          <YAxis hide />
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
          />
          <Area 
            type="monotone" 
            dataKey="cumulativeBudget" 
            stroke="#94a3b8" 
            strokeDasharray="5 5"
            fillOpacity={1} 
            fill="url(#colorBudget)" 
            name={t.budgetsTab.plannedBudget ?? "Planned"}
          />
          <Area 
            type="monotone" 
            dataKey="cumulativeActual" 
            stroke="#0d9488" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorActual)" 
            name={t.budgetsTab.actualSpend ?? "Actual"}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
