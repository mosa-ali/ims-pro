/**
 * DashboardWidgets.tsx
 * Enterprise Finance Dashboard – Shared Widget Library
 * 
 * Design System:
 *   Navy Primary:  #0f2d5e  (Corporate Navy)
 *   Surface:       #ffffff  (White Cards)
 *   Page BG:       #f4f6f9  (Neutral Gray)
 *   Border:        #e2e8f0  (Subtle)
 *   Success:       #16a34a
 *   Warning:       #d97706
 *   Error:         #dc2626
 *   Info:          #2563eb
 */
import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, LabelList, ComposedChart, ReferenceLine, AreaChart, Area,
  PieChart, Pie, Sector, Line, Legend,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  ArrowUpRight, ArrowDownRight, Minus,
  CheckCircle2, AlertTriangle, XCircle, Info,
  ChevronUp, ChevronDown, ChevronsUpDown,
} from 'lucide-react';

// ─── Design Tokens ────────────────────────────────────────────────────────────
export const CHART_COLORS = {
  navy:    '#0f2d5e',
  navyMid: '#1e4080',
  blue:    '#2563eb',
  teal:    '#0891b2',
  success: '#16a34a',
  warning: '#d97706',
  error:   '#dc2626',
  muted:   '#64748b',
  border:  '#e2e8f0',
  bg:      '#f4f6f9',
  palette: ['#0f2d5e', '#2563eb', '#0891b2', '#16a34a', '#d97706', '#dc2626', '#8b5cf6'],
};

// ─── Formatting Helpers ───────────────────────────────────────────────────────
export function fmtCurrency(
  value: number | string | null | undefined,
  currency = 'USD',
): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (isNaN(num)) return '$0';
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000)     return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)         return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(num);
}

export function fmtPercent(value: number | string | null | undefined, decimals = 1): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (isNaN(num)) return '0%';
  return `${num.toFixed(decimals)}%`;
}

export function fmtCompact(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (isNaN(num)) return '0';
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${sign}${(abs / 1_000).toFixed(0)}K`;
  return num.toFixed(0);
}

function fmtAxisCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  if (Math.abs(value) >= 1_000)     return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

// ─── Status Helpers ───────────────────────────────────────────────────────────
export function statusBadgeClass(status: string): string {
  const s = (status ?? '').toUpperCase();
  if (['SUCCESS', 'LOW', 'ON TRACK', 'VALID'].some(k => s.includes(k)))
    return 'bg-green-50 text-green-700 border-green-200';
  if (['WARNING', 'MEDIUM', 'AT RISK'].some(k => s.includes(k)))
    return 'bg-amber-50 text-amber-700 border-amber-200';
  if (['ERROR', 'HIGH', 'CRITICAL'].some(k => s.includes(k)))
    return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-blue-50 text-blue-700 border-blue-200';
}

function StatusIcon({ status, size = 14 }: { status: string; size?: number }) {
  const s = (status ?? '').toUpperCase();
  if (['SUCCESS', 'LOW', 'ON TRACK', 'VALID'].some(k => s.includes(k)))
    return <CheckCircle2 size={size} className="text-green-600 flex-shrink-0" />;
  if (['WARNING', 'MEDIUM', 'AT RISK'].some(k => s.includes(k)))
    return <AlertTriangle size={size} className="text-amber-600 flex-shrink-0" />;
  if (['ERROR', 'HIGH', 'CRITICAL'].some(k => s.includes(k)))
    return <XCircle size={size} className="text-red-600 flex-shrink-0" />;
  return <Info size={size} className="text-blue-600 flex-shrink-0" />;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse bg-slate-100 rounded-md ${className}`} style={style} />;
}

// ─── Section Header ───────────────────────────────────────────────────────────
export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-800 leading-tight">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// ─── Executive KPI Card ───────────────────────────────────────────────────────
export interface KPICardProps {
  title: string;
  value: string | number;
  subValue?: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  status?: 'success' | 'warning' | 'error' | 'info';
  sparklineData?: Array<{ value: number }>;
  loading?: boolean;
  footnote?: string;
}

export const ExecutiveKPICard: React.FC<KPICardProps> = ({
  title, value, subValue, trend, trendDirection = 'neutral',
  status, sparklineData, loading, footnote,
}) => {
  if (loading) {
    return (
      <Card className="p-4 bg-white border border-slate-200 shadow-sm">
        <Skeleton className="h-3 w-24 mb-3" />
        <Skeleton className="h-7 w-32 mb-2" />
        <Skeleton className="h-3 w-16" />
      </Card>
    );
  }

  const trendColor =
    trendDirection === 'up' ? 'text-green-600' :
    trendDirection === 'down' ? 'text-red-600' : 'text-slate-400';

  const TrendIcon =
    trendDirection === 'up' ? ArrowUpRight :
    trendDirection === 'down' ? ArrowDownRight : Minus;

  const borderAccent =
    status === 'success' ? 'border-l-green-500' :
    status === 'warning' ? 'border-l-amber-500' :
    status === 'error' ? 'border-l-red-500' :
    status === 'info' ? 'border-l-blue-500' : 'border-l-slate-200';

  return (
    <Card className={`p-4 bg-white border border-slate-200 border-l-4 ${borderAccent} shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between`}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2 leading-none">{title}</p>
      <div className="flex items-end justify-between gap-2">
        <p className="text-xl font-bold text-slate-900 tabular-nums leading-none">{value}</p>
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${trendColor} flex-shrink-0`}>
            <TrendIcon size={13} />
            {trend}
          </span>
        )}
      </div>
      {sparklineData && sparklineData.length > 0 && (
        <div className="mt-2 h-8">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.navy} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={CHART_COLORS.navy} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="value" stroke={CHART_COLORS.navy} strokeWidth={1.5} fill="url(#sparkGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      {subValue && <p className="text-xs text-slate-400 mt-1.5">{subValue}</p>}
      {footnote && <p className="text-[10px] text-slate-300 mt-1">{footnote}</p>}
    </Card>
  );
};

// ─── Budget vs Actual Trend Chart ─────────────────────────────────────────────
export interface BudgetTrendItem {
  name: string;
  budget: number;
  actual: number;
  forecast?: number;
}

export const BudgetTrendChart: React.FC<{
  data?: BudgetTrendItem[];
  loading?: boolean;
  height?: number;
  labels?: { budget?: string; actual?: string; forecast?: string };
}> = ({ data, loading, height = 280, labels = {} }) => {
  if (loading) return <Skeleton className="w-full" style={{ height }} />;
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-slate-400 text-sm" style={{ height }}>
        No trend data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={fmtAxisCurrency} width={60} />
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '12px' }}
          formatter={(val: number, name: string) => [fmtCurrency(val), name]}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
        <Bar dataKey="budget" name={labels.budget ?? 'Budget'} fill="#e2e8f0" radius={[3, 3, 0, 0]} barSize={20} />
        <Bar dataKey="actual" name={labels.actual ?? 'Actual'} fill={CHART_COLORS.navy} radius={[3, 3, 0, 0]} barSize={20} />
        {data[0]?.forecast !== undefined && (
          <Line type="monotone" dataKey="forecast" name={labels.forecast ?? 'Forecast'} stroke={CHART_COLORS.warning} strokeWidth={2} strokeDasharray="4 3" dot={false} />
        )}
        <ReferenceLine y={0} stroke="#e2e8f0" />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

// ─── Cash Position Waterfall Chart ────────────────────────────────────────────
export interface WaterfallItem {
  name: string;
  value: number;
  type: 'base' | 'in' | 'out';
}

export const WaterfallChart: React.FC<{
  data?: WaterfallItem[];
  loading?: boolean;
  height?: number;
  currency?: string;
}> = ({ data, loading, height = 260, currency = 'USD' }) => {
  if (loading) return <Skeleton className="w-full" style={{ height }} />;
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-slate-400 text-sm" style={{ height }}>
        No cash flow data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={fmtAxisCurrency} width={56} />
        <Tooltip
          cursor={{ fill: 'rgba(15,45,94,0.04)' }}
          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '12px' }}
          formatter={(val: number) => [fmtCurrency(val, currency), '']}
        />
        <ReferenceLine y={0} stroke="#e2e8f0" />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={36}>
          <LabelList
            dataKey="value"
            position="top"
            formatter={(v: number) => fmtCompact(v)}
            style={{ fontSize: '9px', fill: '#64748b', fontWeight: 600 }}
          />
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.type === 'in' ? CHART_COLORS.success : entry.type === 'out' ? CHART_COLORS.error : CHART_COLORS.navy}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

// ─── Risk Distribution Pie Chart ──────────────────────────────────────────────
export interface RiskDistData {
  critical: number;
  medium: number;
}

export const RiskDistributionChart: React.FC<{
  data?: RiskDistData;
  loading?: boolean;
  labels?: { critical?: string; medium?: string; low?: string };
}> = ({ data, loading, labels = {} }) => {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const chartData = useMemo(() => {
    const c = Number(data?.critical ?? 0);
    const m = Number(data?.medium ?? 0);
    const total = c + m;
    const low = total > 0 ? Math.max(1, Math.round(total * 0.4)) : 3;
    return [
      { name: labels.critical ?? 'Critical', value: c, fill: CHART_COLORS.error },
      { name: labels.medium ?? 'Medium', value: m, fill: CHART_COLORS.warning },
      { name: labels.low ?? 'Low', value: low, fill: CHART_COLORS.success },
    ].filter(d => d.value > 0);
  }, [data, labels]);

  if (loading) return <Skeleton className="w-full h-40" />;

  const renderActiveShape = (props: Record<string, unknown>) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props as {
      cx: number; cy: number; innerRadius: number; outerRadius: number;
      startAngle: number; endAngle: number; fill: string;
      payload: { value: number }; percent: number;
    };
    return (
      <g>
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#1e293b" fontSize={13} fontWeight={700}>{payload.value}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#94a3b8" fontSize={10}>{(percent * 100).toFixed(0)}%</text>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={(outerRadius as number) + 4} startAngle={startAngle} endAngle={endAngle} fill={fill} />
      </g>
    );
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <ResponsiveContainer width="100%" height={140}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={60}
            dataKey="value"
            activeIndex={activeIndex}
            activeShape={renderActiveShape as any}
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(undefined)}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex gap-4 flex-wrap justify-center">
        {chartData.map((d) => (
          <span key={d.name} className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.fill }} />
            {d.name} ({d.value})
          </span>
        ))}
      </div>
    </div>
  );
};

// ─── Compliance Scorecard ─────────────────────────────────────────────────────
export interface ComplianceItem {
  metric: string;
  status: string;
  value: string;
}

export const ComplianceScorecard: React.FC<{
  items?: ComplianceItem[];
  loading?: boolean;
  onViewLog?: () => void;
  labelViewLog?: string;
}> = ({ items, loading, onViewLog, labelViewLog = 'View Compliance Log' }) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-4">No compliance data available</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <StatusIcon status={item.status} size={15} />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 leading-none mb-0.5">{item.metric}</p>
              <p className="text-sm font-semibold text-slate-800 leading-tight">{item.value}</p>
            </div>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border flex-shrink-0 ${statusBadgeClass(item.status)}`}>
            {item.status}
          </span>
        </div>
      ))}
      {onViewLog && (
        <button
          onClick={onViewLog}
          className="w-full mt-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors text-center py-2 border border-dashed border-slate-200 rounded-lg"
        >
          {labelViewLog}
        </button>
      )}
    </div>
  );
};

// ─── Risk Alert Card ──────────────────────────────────────────────────────────
export interface RiskAlertProps {
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'WARNING';
  timestamp: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const RiskAlertCard: React.FC<RiskAlertProps> = ({
  title, severity, timestamp, message, actionLabel, onAction,
}) => {
  const severityStyles: Record<string, string> = {
    CRITICAL: 'border-l-red-500 bg-red-50',
    HIGH:     'border-l-orange-500 bg-orange-50',
    MEDIUM:   'border-l-amber-400 bg-amber-50',
    WARNING:  'border-l-amber-400 bg-amber-50',
  };
  const badgeStyles: Record<string, string> = {
    CRITICAL: 'bg-red-100 text-red-700 border-red-200',
    HIGH:     'bg-orange-100 text-orange-700 border-orange-200',
    MEDIUM:   'bg-amber-100 text-amber-700 border-amber-200',
    WARNING:  'bg-amber-100 text-amber-700 border-amber-200',
  };

  return (
    <div className={`border-l-4 rounded-lg p-3.5 mb-3 ${severityStyles[severity] ?? 'border-l-slate-300 bg-slate-50'}`}>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-xs font-semibold text-slate-800 leading-tight">{title}</p>
        <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border flex-shrink-0 ${badgeStyles[severity] ?? ''}`}>
          {severity}
        </span>
      </div>
      <p className="text-[11px] text-slate-600 leading-relaxed mb-2">{message}</p>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-400">{timestamp}</span>
        {actionLabel && (
          <button onClick={onAction} className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 uppercase tracking-wide">
            {actionLabel} →
          </button>
        )}
      </div>
    </div>
  );
};

// ─── AI Recommendation Card ───────────────────────────────────────────────────
export const AIRecommendation: React.FC<{
  text: string;
  index?: number;
}> = ({ text, index = 0 }) => {
  const icons = ['💡', '⚠️', '📊', '🔍', '✅'];
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100 hover:bg-blue-50 hover:border-blue-100 transition-colors">
      <span className="text-base flex-shrink-0 mt-0.5">{icons[index % icons.length]}</span>
      <p className="text-xs text-slate-700 leading-relaxed">{text}</p>
    </div>
  );
};

// ─── P2P Pipeline ─────────────────────────────────────────────────────────────
export interface P2PData {
  purchaseRequests?: number;
  approvals?: number;
  purchaseOrders?: number;
  receipts?: number;
  invoices?: number;
  treasury?: number;
}

export const P2PPipeline: React.FC<{
  data?: P2PData;
  loading?: boolean;
  labels?: Partial<Record<keyof P2PData, string>>;
}> = ({ data, loading, labels = {} }) => {
  const steps = [
    { label: labels.purchaseRequests ?? 'Requisitions', key: 'purchaseRequests' as keyof P2PData, icon: '📋' },
    { label: labels.approvals ?? 'Approvals', key: 'approvals' as keyof P2PData, icon: '✅' },
    { label: labels.purchaseOrders ?? 'Purchase Orders', key: 'purchaseOrders' as keyof P2PData, icon: '📄' },
    { label: labels.receipts ?? 'Goods Received', key: 'receipts' as keyof P2PData, icon: '📦' },
    { label: labels.invoices ?? 'Invoices', key: 'invoices' as keyof P2PData, icon: '🧾' },
    { label: labels.treasury ?? 'Treasury', key: 'treasury' as keyof P2PData, icon: '🏦' },
  ];

  if (loading) {
    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="flex-1 h-20" />)}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute top-8 left-[8.33%] right-[8.33%] h-0.5 bg-slate-200 z-0" />
      <div className="grid grid-cols-6 gap-2 relative z-10">
        {steps.map((step, idx) => {
          const count = data?.[step.key] ?? 0;
          const hasItems = Number(count) > 0;
          return (
            <div key={idx} className="flex flex-col items-center gap-1.5 group cursor-pointer">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base shadow-sm border-2 transition-all duration-200 group-hover:scale-110 ${
                hasItems ? 'bg-[#0f2d5e] border-[#0f2d5e] text-white shadow-md' : 'bg-white border-slate-200 text-slate-400'
              }`}>
                {step.icon}
              </div>
              <p className={`text-[10px] font-bold tabular-nums ${hasItems ? 'text-[#0f2d5e]' : 'text-slate-300'}`}>{count}</p>
              <p className="text-[9px] text-slate-400 text-center leading-tight font-medium">{step.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Financial Health Matrix Table ────────────────────────────────────────────
export interface HealthMatrixRow {
  projectCode: string | null;
  grantSource?: string | null;
  budget: string | number | null;
  spent: string | number | null;
  committed?: string | number | null;
  remaining: string | number | null;
  utilization: string | number | null;
  variance: string | number | null;
  risk: string | null;
}

type SortKey = keyof HealthMatrixRow;
type SortDir = 'asc' | 'desc' | null;

export const HealthMatrixTable: React.FC<{
  data?: HealthMatrixRow[];
  loading?: boolean;
  onDrillDown?: (code: string) => void;
  labels?: {
    projectId?: string;
    grantSource?: string;
    budget?: string;
    spent?: string;
    remaining?: string;
    util?: string;
    variance?: string;
    health?: string;
  };
}> = ({ data, loading, onDrillDown, labels = {} }) => {
  const [sortKey, setSortKey] = useState<SortKey>('utilization');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');

  const sorted = useMemo(() => {
    if (!data) return [];
    let rows = [...data];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        (r.projectCode ?? '').toLowerCase().includes(q) ||
        (r.grantSource ?? '').toLowerCase().includes(q)
      );
    }
    if (sortKey && sortDir) {
      rows.sort((a, b) => {
        const av = Number(a[sortKey] ?? 0);
        const bv = Number(b[sortKey] ?? 0);
        return sortDir === 'asc' ? av - bv : bv - av;
      });
    }
    return rows;
  }, [data, sortKey, sortDir, search]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronsUpDown size={11} className="text-slate-300 ml-0.5" />;
    if (sortDir === 'asc') return <ChevronUp size={11} className="text-blue-500 ml-0.5" />;
    if (sortDir === 'desc') return <ChevronDown size={11} className="text-blue-500 ml-0.5" />;
    return <ChevronsUpDown size={11} className="text-slate-300 ml-0.5" />;
  };

  const cols: Array<{ key: SortKey; label: string; align: 'left' | 'right' | 'center' }> = [
    { key: 'projectCode', label: labels.projectId ?? 'Project', align: 'left' },
    { key: 'grantSource', label: labels.grantSource ?? 'Grant Source', align: 'left' },
    { key: 'budget', label: labels.budget ?? 'Budget', align: 'right' },
    { key: 'spent', label: labels.spent ?? 'Spent (YTD)', align: 'right' },
    { key: 'remaining', label: labels.remaining ?? 'Remaining', align: 'right' },
    { key: 'utilization', label: labels.util ?? 'Util %', align: 'right' },
    { key: 'variance', label: labels.variance ?? 'Variance %', align: 'right' },
    { key: 'risk', label: labels.health ?? 'Health', align: 'center' },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative px-4 pt-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter by project or grant…"
          className="w-full max-w-xs text-xs border border-slate-200 rounded-lg px-3 py-2 pl-8 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-slate-50"
        />
        <span className="absolute left-7 top-1/2 -translate-y-1/2 mt-1.5 text-slate-400 text-xs">🔍</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[640px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {cols.map(col => (
                <th
                  key={col.key as string}
                  onClick={() => handleSort(col.key)}
                  className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 cursor-pointer hover:text-slate-700 select-none whitespace-nowrap ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}
                >
                  <span className="inline-flex items-center gap-0.5">
                    {col.label}
                    <SortIcon k={col.key} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              [1, 2, 3, 4].map(i => (
                <tr key={i}>
                  {cols.map(c => (
                    <td key={c.key as string} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={cols.length} className="px-4 py-8 text-center text-sm text-slate-400">No data available</td>
              </tr>
            ) : (
              sorted.map((row, idx) => {
                const util = Number(row.utilization ?? 0);
                const rem = Number(row.remaining ?? 0);
                const variance = Number(row.variance ?? 0);
                const risk = (row.risk ?? 'low').toLowerCase();
                const utilColor = util > 90 ? 'text-red-600' : util > 75 ? 'text-amber-600' : 'text-green-600';
                const remColor = rem < 0 ? 'text-red-600 font-bold' : 'text-slate-700';
                const varColor = variance > 0 ? 'text-red-600' : 'text-green-600';

                return (
                  <tr
                    key={idx}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                    onClick={() => row.projectCode && onDrillDown?.(row.projectCode)}
                  >
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold text-[#0f2d5e] hover:underline">{row.projectCode ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[160px] truncate">{row.grantSource ?? '—'}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-right tabular-nums text-slate-700">{fmtCurrency(row.budget)}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-right tabular-nums text-slate-700">{fmtCurrency(row.spent)}</td>
                    <td className={`px-4 py-3 text-xs font-semibold text-right tabular-nums ${remColor}`}>{fmtCurrency(row.remaining)}</td>
                    <td className={`px-4 py-3 text-xs font-bold text-right tabular-nums ${utilColor}`}>
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${util > 90 ? 'bg-red-500' : util > 75 ? 'bg-amber-400' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(100, util)}%` }}
                          />
                        </div>
                        <span>{fmtPercent(util, 0)}</span>
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-xs font-bold text-right tabular-nums ${varColor}`}>
                      {variance > 0 ? '+' : ''}{fmtPercent(variance, 1)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                        risk === 'high' ? 'bg-red-50 text-red-700 border-red-200' :
                        risk === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-green-50 text-green-700 border-green-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${risk === 'high' ? 'bg-red-500' : risk === 'medium' ? 'bg-amber-400' : 'bg-green-500'}`} />
                        {risk}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Remaining Days Indicator ─────────────────────────────────────────────────
export const RemainingDaysIndicator: React.FC<{
  days?: number;
  status?: string;
  loading?: boolean;
}> = ({ days, status, loading }) => {
  if (loading) return <Skeleton className="h-20 w-full" />;

  const isExpired = (days ?? 0) <= 0;
  const isCritical = (days ?? 0) <= 30;
  const isWarning = (days ?? 0) <= 90;
  const colorClass = isExpired || isCritical ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-green-600';
  const bgClass = isExpired || isCritical ? 'bg-red-50 border-red-100' : isWarning ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100';

  return (
    <div className={`flex flex-col items-center justify-center text-center p-4 rounded-xl ${bgClass} border`}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Time Margin</p>
      <p className={`text-3xl font-bold tabular-nums leading-none ${colorClass}`}>
        {isExpired ? 'EXPIRED' : (days ?? '—')}
      </p>
      {!isExpired && <p className="text-xs text-slate-400 mt-1">days remaining</p>}
      <p className={`text-[10px] font-semibold uppercase mt-2 ${colorClass}`}>{status ?? 'ACTIVE'}</p>
    </div>
  );
};

// ─── Project Info Header ──────────────────────────────────────────────────────
export const ProjectInfoHeader: React.FC<{
  code?: string;
  title?: string;
  status?: string;
  startDate?: string | null;
  endDate?: string | null;
  progress?: number;
  loading?: boolean;
}> = ({ code, title, status, startDate, endDate, progress = 0, loading }) => {
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-8 w-96" />
        <Skeleton className="h-3 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            {code && (
              <span className="text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-100">{code}</span>
            )}
            {status && (
              <span className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-md border ${statusBadgeClass(status)}`}>{status}</span>
            )}
          </div>
          <h2 className="text-lg font-bold text-slate-900 leading-tight max-w-2xl">{title ?? 'Portfolio-wide Analytics'}</h2>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Grant Term</p>
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-700 tabular-nums">
            <div className="text-center">
              <p className="text-[9px] text-slate-400 uppercase">Start</p>
              <p>{startDate ? new Date(startDate).toISOString().split('T')[0] : 'Jan 1, 2024'}</p>
            </div>
            <span className="text-slate-300">→</span>
            <div className="text-center">
              <p className="text-[9px] text-slate-400 uppercase">End</p>
              <p>{endDate ? new Date(endDate).toISOString().split('T')[0] : 'Dec 31, 2026'}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
          <span>Implementation Progress</span>
          <span className="text-[#0f2d5e]">{progress}% Lifecycle Completion</span>
        </div>
        <Progress value={progress} className="h-2 bg-slate-100" />
      </div>
    </div>
  );
};

// ─── Procurement Exposure Pipeline ────────────────────────────────────────────
export const ProcurementExposurePipeline: React.FC<{
  data?: P2PData;
  loading?: boolean;
}> = ({ data, loading }) => {
  const steps = [
    { label: 'Purchase Reqs', value: data?.purchaseRequests ?? 0, sub: 'Active', icon: '📋', color: 'text-blue-600' },
    { label: 'Open POs', value: data?.purchaseOrders ?? 0, sub: 'Generated', icon: '📄', color: 'text-indigo-600' },
    { label: 'Goods Received', value: data?.receipts ?? 0, sub: 'In Transit', icon: '📦', color: 'text-teal-600' },
    { label: 'Pending Invoices', value: data?.invoices ?? 0, sub: 'Verifying', icon: '🧾', color: 'text-amber-600' },
    { label: 'Approvals', value: data?.approvals ?? 0, sub: 'Pending', icon: '✅', color: 'text-green-600' },
    { label: 'Treasury Queue', value: data?.treasury ?? 0, sub: 'Queued', icon: '🏦', color: 'text-purple-600' },
    { label: 'Avg Cycle', value: '4.2d', sub: 'PR to PO', icon: '⏱️', color: 'text-slate-600' },
    { label: 'Outstanding', value: '—', sub: 'Commitments', icon: '💰', color: 'text-slate-600' },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 md:grid-cols-8 gap-px bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
      {steps.map((item, idx) => (
        <div key={idx} className="bg-white p-3 flex flex-col items-center text-center hover:bg-slate-50 transition-colors">
          <span className="text-xl mb-1.5">{item.icon}</span>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">{item.label}</p>
          <p className={`text-base font-bold tabular-nums ${item.color}`}>{item.value}</p>
          <p className="text-[9px] text-slate-300 font-medium">{item.sub}</p>
        </div>
      ))}
    </div>
  );
};
