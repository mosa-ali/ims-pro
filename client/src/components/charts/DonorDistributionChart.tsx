import React from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend 
} from 'recharts';

interface Props {
  data: Array<{ name: string; value: number }>;
  height?: number;
}

/**
 * DonorDistributionChart
 * Location: src/components/charts/DonorDistributionChart.tsx
 * 
 * Visualizes donor concentration across the portfolio.
 */
export default function DonorDistributionChart({ data, height = 300 }: Props) {
  const COLORS = ['#0d9488', '#0ea5e9', '#6366f1', '#f59e0b', '#f43f5e', '#64748b'];

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
          />
          <Legend 
            layout="vertical" 
            align="right" 
            verticalAlign="middle" 
            iconType="circle"
            wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingLeft: '20px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
