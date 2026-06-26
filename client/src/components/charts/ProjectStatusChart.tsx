import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface ProjectStatusChartProps {
  data?: Array<{ status: string; count: number; color: string }>;
}

export const ProjectStatusChart: React.FC<ProjectStatusChartProps> = ({ data }) => {
  return (
    <Card className="border-none shadow-sm bg-white">
      <CardHeader className="pb-2 border-b border-slate-50">
        <CardTitle className="text-sm font-bold text-slate-700">Project Delivery Health</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="status" 
                type="category" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
              />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                {data?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 grid grid-cols-2 gap-2">
          {data?.map((item) => (
            <div key={item.status} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-[10px] font-bold text-slate-500 uppercase">{item.status}: {item.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
