import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine, 
  ResponsiveContainer 
} from 'recharts';
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from '@/i18n/useTranslation';

interface Props {
  data: Array<{ month: string; actual: number; forecast: number }>;
  exhaustionPoint?: string;
  height?: number;
}

/**
 * ForecastChart
 * Location: src/components/charts/ForecastChart.tsx
 * 
 * Predictive visualization of future spending vs liquidity.
 */
export default function ForecastChart({ data, exhaustionPoint, height = 300 }: Props) {
  const {language } = useLanguage();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="month" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
          />
          <YAxis hide />
          <Tooltip 
             contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
          />
          <ReferenceLine x={exhaustionPoint} stroke="#f43f5e" strokeDasharray="3 3" label={{ position: 'top', value: 'Exhaustion', fill: '#f43f5e', fontSize: 10, fontWeight: 'bold' }} />
          <Line 
            type="monotone" 
            dataKey="actual" 
            stroke="#0d9488" 
            strokeWidth={3} 
            dot={{ r: 4, fill: '#0d9488' }} 
            name={t.financeModule.actual ?? "Actual"}
          />
          <Line 
            type="monotone" 
            dataKey="forecast" 
            stroke="#94a3b8" 
            strokeWidth={2} 
            strokeDasharray="5 5" 
            dot={false}
            name={t.budgetsTab.forecast ?? "Forecast"}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
