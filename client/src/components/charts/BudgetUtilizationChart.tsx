import React from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip 
} from 'recharts';
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from '@/i18n/useTranslation';


interface Props {
  utilization: number;
  isLoading?: boolean;
  height?: number;
}


/**
 * BudgetUtilizationChart
 * Location: src/components/charts/BudgetUtilizationChart.tsx
 * 
 * High-density donut chart showing portfolio-wide budget exhaustion.
 */
export default function BudgetUtilizationChart({
  utilization,
  isLoading = false,
  height = 200,
}: Props) {
  const {language } = useLanguage();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  
  const data = [
    { name: t.projects.spent ?? 'Spent', value: utilization },
    { name: t.projectDetail.remaining ?? 'Remaining', value: Math.max(0, 100 - utilization) }
  ];

  const COLORS = ['#0d9488', '#f1f5f9'];

  return (
    <div className="relative w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            innerRadius="70%"
            outerRadius="90%"
            paddingAngle={5}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-3xl font-black text-slate-900 tracking-tighter">
          {Math.round(utilization)}%
        </span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {t.overviewTab.utilized ?? 'Utilized'}
        </span>
      </div>
    </div>
  );
}
