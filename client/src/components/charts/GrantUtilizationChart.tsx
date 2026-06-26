import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from '@/i18n/useTranslation';
import { formatCurrency } from "@/utils/formatters";

interface Props {
  data: Array<{ name: string; budget: number; actual: number }>;
  height?: number;
}

/**
 * GrantUtilizationChart
 * Location: src/components/charts/GrantUtilizationChart.tsx
 * 
 * Side-by-side comparison of budget vs actual spend per donor/grant.
 */
export default function GrantUtilizationChart({ data, height = 300 }: Props) {
    const {language } = useLanguage();
    const { t } = useTranslation();
    const { isRTL } = useLanguage();

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis type="number" hide />
          <YAxis 
            dataKey="name" 
            type="category" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
            width={100}
          />
          <Tooltip 
            formatter={(value: number) => formatCurrency(value, 'USD', language)}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
          <Bar dataKey="budget" fill="#e2e8f0" radius={[0, 4, 4, 0]} name={t.financeModule.budget ?? "Budget"} barSize={12} />
          <Bar dataKey="actual" fill="#0d9488" radius={[0, 4, 4, 0]} name={t.financeModule.actual ?? "Actual"} barSize={12} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
