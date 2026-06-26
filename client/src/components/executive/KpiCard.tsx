import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";

interface KpiCardProps {
  title: string;
  value: number | string | undefined;
  icon: React.ReactNode;
  trend?: number;
  format?: 'currency' | 'number' | 'percent';
  suffix?: string;
  threshold?: { warning: number; critical: number };
  totalEmployees: number;
}

export const KpiCard: React.FC<KpiCardProps> = ({ 
  title, 
  value, 
  icon, 
  trend, 
  format = 'number',
  suffix = '',
  threshold
}) => {
  const numericValue = typeof value === 'string' ? parseFloat(value) : (value || 0);
  
  const displayValue = React.useMemo(() => {
    if (value === undefined) return '—';
    if (format === 'currency') return formatCurrency(numericValue, 'USD');
    if (format === 'percent') return `${numericValue.toFixed(1)}%`;
    return numericValue.toLocaleString();
  }, [value, format, numericValue]);

  const statusColor = React.useMemo(() => {
    if (!threshold) return 'text-slate-900';
    if (numericValue >= threshold.critical) return 'text-rose-600';
    if (numericValue >= threshold.warning) return 'text-amber-600';
    return 'text-teal-600';
  }, [numericValue, threshold]);

  return (
    <Card className="overflow-hidden border-none shadow-sm bg-white hover:shadow-md transition-all duration-300">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 bg-slate-50 rounded-lg">
            {icon}
          </div>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-xs font-bold ${trend > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trend > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            {title}
          </p>
          <div className="flex items-baseline gap-1">
            <h3 className={`text-2xl font-black tracking-tight ${statusColor}`}>
              {displayValue}
            </h3>
            {suffix && <span className="text-xs font-bold text-slate-400">{suffix}</span>}
          </div>
        </div>
        
        {/* Sparkline Decorative bar */}
        <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full opacity-60 ${statusColor.replace('text-', 'bg-')}`}
            style={{ width: `${Math.min(100, (numericValue / 100) * 100)}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
};
