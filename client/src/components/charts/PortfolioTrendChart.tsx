import React from 'react';
import { 
  ComposedChart, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from '@/i18n/useTranslation';


interface Props {
  data: Array<{ month: string; budget: number; actual: number }>;
  height?: number;
}

/**
 * PortfolioTrendChart
 * Location: src/components/charts/PortfolioTrendChart.tsx
 * 
 * Mixed chart showing budget vs actual spending trends.
 */
export default function PortfolioTrendChart({ data, height = 300 }: Props) {
    const {language } = useLanguage();
    const { t } = useTranslation();
    const { isRTL } = useLanguage();

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid stroke="#f5f5f5" vertical={false} />
          <XAxis 
            dataKey="month" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#94a3b8' }}
          />
          <Tooltip 
             contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
          <Bar dataKey="budget" barSize={20} fill="#f1f5f9" name={t.financeModule.budget ?? "Budget"} radius={[4, 4, 0, 0]} />
          <Line type="monotone" dataKey="actual" stroke="#0d9488" strokeWidth={3} name={t.financeModule.actual ?? "Actual"} dot={{ r: 4, fill: '#0d9488', strokeWidth: 2, stroke: '#fff' }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
