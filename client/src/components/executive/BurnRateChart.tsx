import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

interface BurnRateChartProps {
  data?: Array<{ date: string; actual: number; predicted: number }>;
}

export const BurnRateChart: React.FC<BurnRateChartProps> = ({ data }) => {
  return (
    <Card className="border-none shadow-sm bg-white overflow-hidden">
      <CardHeader className="pb-2 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider">Burn Rate Forecast</CardTitle>
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-teal-500" />
              <span className="text-[10px] font-bold text-slate-500 uppercase">Actual</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-teal-200" />
              <span className="text-[10px] font-bold text-slate-500 uppercase">Forecast</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Area 
                type="monotone" 
                dataKey="predicted" 
                stroke="#2dd4bf" 
                strokeWidth={2} 
                strokeDasharray="5 5" 
                fill="transparent" 
              />
              <Area 
                type="monotone" 
                dataKey="actual" 
                stroke="#0d9488" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorActual)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
