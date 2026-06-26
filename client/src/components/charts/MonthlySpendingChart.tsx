import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { formatCurrency } from "@/utils/formatters";
import { useLanguage } from "@/contexts/LanguageContext";

interface MonthlyData {
  month: string;
  spent: number;
}

interface Props {
  data: MonthlyData[];
  isLoading?: boolean;
  height?: number;
}

/**
 * MonthlySpendingChart
 * Location: src/components/charts/MonthlySpendingChart.tsx
 * 
 * Visualization of actual cash outflow trends over a 6-12 month period.
 */
export default function MonthlySpendingChart({ data, height = 250 }: Props) {
  const { language } = useLanguage();

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="month" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fontWeight: 500, fill: '#cbd5e1' }}
          />
          <Tooltip 
            cursor={{ fill: '#f8fafc' }}
            contentStyle={{ 
              borderRadius: '12px', 
              border: 'none', 
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
              fontSize: '11px'
            }}
            formatter={(value: number) => [formatCurrency(value, 'USD', language), 'Spent']}
          />
          <Bar 
            dataKey="spent" 
            fill="#2dd4bf" 
            radius={[4, 4, 0, 0]} 
            barSize={24}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={index === (data.length - 1) ? '#0d9488' : '#2dd4bf'} 
                fillOpacity={0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
