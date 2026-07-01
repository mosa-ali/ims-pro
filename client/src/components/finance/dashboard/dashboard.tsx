import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, LabelList 
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table } from "@/components/ui/table";
import { SideNavBar, TopNavBar } from './Layout';

/**
 * Utility to merge tailwind classes
 */
function cn(...classes: (string | undefined | boolean | null)[]) {
  return classes.filter(Boolean).join(' ');
}

// ============================================================================
// 1. DashboardLayout: The unified page shell for Finance modules
// ============================================================================
export const DashboardLayout: React.FC<{
  children: React.ReactNode;
  activeModule?: string;
  activePage?: string;
}> = ({
  children,
  activePage = "Dashboard",
}) => (
  <div className="flex h-screen bg-surface overflow-hidden">
    <SideNavBar activeTab={activePage} />

    <div className="flex-1 flex flex-col min-w-0">
      {children}
    </div>
  </div>
);

// ============================================================================
// 2. TopAppBar: Context-aware header with breadcrumbs and actions
// ============================================================================
export const TopAppBar: React.FC<{
  title: string;
  showReturnToHub?: boolean;
  actions?: Array<{ label: string; icon: string; variant?: any; onClick?: () => void; path?: string }>;
}> = ({ title, actions }) => (
  <header className="sticky top-0 z-[50] bg-white border-b border-border-subtle h-16 px-8 flex justify-between items-center shadow-sm">
    <h1 className="text-lg font-black text-primary tracking-tight uppercase">{title}</h1>
    <div className="flex gap-3">
      {actions?.map((action, i) => (
        <Button 
          key={i} 
          variant={action.variant || 'outline'} 
          size="sm" 
          onClick={action.onClick}
          className="h-9 px-4 rounded-lg font-bold text-[11px] uppercase tracking-widest"
        >
          <span className="material-icons text-sm mr-2">{action.icon}</span>
          {action.label}
        </Button>
      ))}
    </div>
  </header>
);

// ============================================================================
// 3. WaterfallChart: Visualizes cash movement (Requirement 9)
// ============================================================================
export const WaterfallChart: React.FC<{
  data?: any[];
  height?: number;
  currency?: string;
}> = ({ data, height = 300, currency = 'USD' }) => (
  <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
      <XAxis 
        dataKey="category" 
        axisLine={false} 
        tickLine={false} 
        tick={{ fontSize: 9, fontWeight: 700, fill: '#64748B' }} 
      />
      <YAxis 
        axisLine={false} 
        tickLine={false} 
        tick={{ fontSize: 9, fill: '#64748B' }}
        tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
      />
      <Tooltip 
        cursor={{ fill: 'transparent' }}
        content={({ active, payload }) => {
          if (active && payload && payload.length) {
            return (
              <div className="bg-white p-3 shadow-xl border rounded-lg border-primary/10">
                <p className="text-[10px] font-black text-on-surface-variant mb-1 uppercase">{payload[0].payload.category}</p>
                <p className="text-sm font-black text-primary">
                  {currency} {Number(payload[0].value).toLocaleString()}
                </p>
              </div>
            );
          }
          return null;
        }}
      />
      <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
        {data?.map((entry, index) => (
          <Cell 
            key={`cell-${index}`} 
            fill={entry.type === 'baseline' ? '#003461' : entry.type === 'addition' ? '#10B981' : '#EF4444'} 
          />
        ))}
        <LabelList 
          dataKey="amount" 
          position="top" 
          formatter={(val: number) => `$${(val / 1000).toFixed(0)}k`} 
          style={{ fontSize: 9, fontWeight: 800, fill: '#334155' }}
        />
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

// ============================================================================
// 4. ProjectComplianceScorecard: RAG risk assessment (Requirement 11)
// ============================================================================
export const ProjectComplianceScorecard: React.FC<{
  data?: any[];
}> = ({ data }) => {
  const defaultItems = [
    { metric: 'Audit Compliance', status: 'GREEN', value: '100% Valid', trend: 'stable' },
    { metric: 'Late Reconciliations', status: 'AMBER', value: '2 Accounts', trend: 'up' },
    { metric: 'Outstanding Advances', status: 'RED', value: '12 Items', trend: 'up' },
    { metric: 'Budget Overruns', status: 'GREEN', value: '0 Lines', trend: 'stable' },
    { metric: 'Overdue Vendor Payments', status: 'RED', value: '8 Overdue', trend: 'down' },
    { metric: 'Donor Compliance', status: 'GREEN', value: '100% Valid', trend: 'stable' },
  ];

  const items = data || defaultItems;

  return (
    <div className="grid grid-cols-2 gap-4">
      {items.map((item, i) => (
        <div key={i} className="p-4 rounded-xl bg-surface-container-low border border-border-subtle flex flex-col justify-between h-24">
          <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest">{item.metric}</p>
          <div className="flex justify-between items-end">
            <h4 className="text-base font-black text-primary">{item.value}</h4>
            <Badge 
              variant={
                  item.status === "GREEN"
                    ? "default"
                    : item.status === "RED"
                      ? "destructive"
                      : "secondary"
                }
              className="text-[8px] font-black uppercase"
            >
              {item.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// 5. ProcurementExposurePipeline: PR to Payment tracking (Requirement 11)
// ============================================================================
export const ProcurementExposurePipeline: React.FC<{
  data?: any;
}> = ({ data }) => {
  const steps = [
    { label: 'Purchase Reqs', value: data?.purchaseRequests || '0', sub: 'Total Volume', icon: 'description' },
    { label: 'Open POs', value: data?.purchaseOrders || '0', sub: 'Active Contracts', icon: 'shopping_cart' },
    { label: 'Goods Received', value: data?.goodsReceived || '0', sub: 'Inventory Pending', icon: 'inventory_2' },
    { label: 'Pending Inv.', value: data?.pendingInvoices || '0', sub: 'Awaiting Matching', icon: 'receipt' },
    { label: 'A/P Aging', value: '$142k', sub: '8 Overdue', icon: 'pending_actions', color: 'text-error' },
    { label: 'Vend. Paid', value: '$3.1M', sub: 'Month-to-Date', icon: 'payments' },
    { label: 'Outst. Comm.', value: '$1.2M', sub: 'Total Obligation', icon: 'account_balance_wallet' },
    { label: 'Avg Cycle', value: '4.2d', sub: 'PR to PO', icon: 'speed' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-px bg-border-subtle rounded-xl overflow-hidden border border-border-subtle">
      {steps.map((item, idx) => (
        <div key={idx} className="bg-surface-container-lowest p-4 flex flex-col items-center text-center group hover:bg-primary/5 transition-colors">
          <div className={cn(
            "p-2 rounded-full mb-3 bg-surface-container-low transition-transform group-hover:scale-110",
            item.color || "text-primary"
          )}>
            <span className="material-icons text-lg">{item.icon}</span>
          </div>
          <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest mb-1">{item.label}</p>
          <h4 className={cn("text-base font-black", item.color || "text-primary")}>{item.value}</h4>
          <p className="text-[9px] text-on-surface-variant opacity-60 font-medium italic">{item.sub}</p>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// 6. FinancialHealthMatrixTable: Detailed Project Health (Requirement 12)
// ============================================================================
export const FinancialHealthMatrixTable: React.FC<{
  data?: any[];
  loading?: boolean;
}> = ({ data, loading }) => (
  <Table className="w-full">
    <thead>
      <tr className="text-[10px] uppercase font-black text-on-surface-variant border-b border-border-subtle bg-surface-container-low/30">
        <th className="px-6 py-4 text-left">Project Identity</th>
        <th className="px-6 py-4 text-right">Budget (Total)</th>
        <th className="px-6 py-4 text-right">Actuals (YTD)</th>
        <th className="px-6 py-4 text-right">Variance %</th>
        <th className="px-6 py-4 text-center">Health Status</th>
      </tr>
    </thead>
    <tbody>
      {loading ? (
        [1, 2, 3].map(i => <tr key={i} className="animate-pulse bg-surface-dim/20 h-16" />)
      ) : (
        data?.map((item, idx) => (
          <tr key={idx} className="border-b border-border-subtle hover:bg-neutral-gray-surface transition-colors cursor-pointer group">
            <td className="px-6 py-5">
              <div className="font-black text-sm text-primary group-hover:underline">{item.projectCode || item.project}</div>
              <div className="text-[10px] text-on-surface-variant font-medium line-clamp-1">{item.title || 'Strategic Initiative'}</div>
            </td>
            <td className="px-6 py-5 text-right text-sm font-bold tabular-nums">${Number(item.budget).toLocaleString()}</td>
            <td className="px-6 py-5 text-right text-sm font-bold tabular-nums">${Number(item.spent).toLocaleString()}</td>
            <td className={cn(
              "px-6 py-5 text-right text-sm font-black tabular-nums",
              Number(item.variancePct) < 0 ? "text-success" : "text-error"
            )}>
              {item.variancePct}%
            </td>
            <td className="px-6 py-5">
              <div className="flex justify-center">
                <Badge 
                  variant={
                        item.health === "ON TRACK"
                            ? "secondary"
                            : item.health === "AT RISK"
                            ? "outline"
                            : "destructive"
                    }
                  className="font-black text-[9px] uppercase min-w-[100px] justify-center"
                >
                  {item.health || 'STABLE'}
                </Badge>
              </div>
            </td>
          </tr>
        ))
      )}
    </tbody>
  </Table>
);

// ============================================================================
// 7. ProjectInfoHeader: Contextual project metadata (Requirement 4 & 6)
// ============================================================================
export const ProjectInfoHeader: React.FC<{
  code?: string;
  title?: string;
  status?: string;
  startDate?: string | null | undefined;
  endDate?: string | null | undefined;
  progress?: number;
}> = ({ code, title, status, startDate, endDate, progress = 0 }) => (
  <div className="space-y-6">
    <div className="flex justify-between items-start">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-black text-[10px] border-primary text-primary px-2 bg-primary/5">{code || 'PROJECT-ID'}</Badge>
          <Badge variant="default" className="font-black text-[10px] px-2">{status || 'ACTIVE'}</Badge>
        </div>
        <h2 className="text-headline-sm font-black text-primary leading-tight max-w-2xl">{title || 'Portfolio-wide Oversight'}</h2>
      </div>
      <div className="hidden md:block text-right">
        <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-1.5 opacity-60">Grant Term</p>
        <div className="flex items-center gap-4 text-xs font-black text-primary tabular-nums">
          <div className="flex flex-col">
            <span className="text-[8px] text-on-surface-variant uppercase">Start</span>
            {startDate || 'Jan 1, 2024'}
          </div>
          <span className="material-icons text-sm opacity-30 text-on-surface-variant">arrow_forward</span>
          <div className="flex flex-col">
            <span className="text-[8px] text-on-surface-variant uppercase">End</span>
            {endDate || 'Dec 31, 2026'}
          </div>
        </div>
      </div>
    </div>
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] font-black text-on-surface-variant uppercase tracking-tighter">
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-primary rounded-full" /> Implementation Progress</span>
        <span className="text-primary">{progress}% Lifecycle Completion</span>
      </div>
      <Progress value={progress} className="h-2.5 bg-surface-container-low border border-border-subtle" />
    </div>
  </div>
);

// ============================================================================
// 8. RemainingDaysIndicator: Time margin visualization (Requirement 5)
// ============================================================================
export const RemainingDaysIndicator: React.FC<{
  days?: number;
  status?: string;
}> = ({ days }) => {
  const isExpired = (days || 0) <= 0;
  const isCritical = (days || 0) <= 30;
  const isWarning = (days || 0) <= 90;

  const colorClass = isExpired ? 'text-error' : isCritical ? 'text-error' : isWarning ? 'text-warning' : 'text-success';

  return (
    <div className="flex flex-col items-center text-center space-y-2">
      <div className="flex items-center gap-2 text-on-surface-variant/70">
        <span className="material-icons text-sm">timer</span>
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Time Margin</span>
      </div>
      <div className="relative">
        <h3 className={cn("text-headline-lg font-black leading-none tracking-tighter", colorClass)}>
          {isExpired ? 'EXPIRED' : days || '--'}
        </h3>
        {!isExpired && <span className={cn("text-[10px] font-black absolute -right-8 bottom-1 uppercase", colorClass)}>Days</span>}
      </div>
      <p className="text-[9px] font-bold text-on-surface-variant bg-surface-container-low px-3 py-1 rounded-full border border-border-subtle mt-2 italic">
        NET DAYS TO CLOSURE
      </p>
    </div>
  );
};

// ============================================================================
// 9. KPICardRow: Horizontal row of the 6 core financial vital signs
// ============================================================================
export const KPICardRow: React.FC<{
  totalBudget?: string | number;
  actualSpent?: string | number;
  commitments?: string | number;
  cashBalance?: string | number;
  burnRate?: string | number;
  requiredBurnRate?: string | number;
  currency?: string;
  loading?: boolean;
}> = ({ totalBudget, actualSpent, commitments, cashBalance, burnRate, requiredBurnRate, currency = '$', loading }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
    {[
      { label: 'Portfolio Budget', val: totalBudget, sub: 'Approved Ceiling' },
      { label: 'Actual Spent', val: actualSpent, sub: 'Life-to-Date', progress: 62 },
      { label: 'Commitments', val: commitments, sub: 'Active Liabilities' },
      { label: 'Cash on Hand', val: cashBalance, sub: 'Liquid Balances' },
      { label: 'Current Burn', val: `${burnRate}/mo`, sub: '30-Day Average' },
      { label: 'Required Burn', val: `${requiredBurnRate}/mo`, sub: 'To Target Zero' },
    ].map((kpi, i) => (
      <Card key={i} className="p-5 bg-surface-container-lowest border-border-subtle shadow-sm flex flex-col justify-between min-h-[140px]">
        <div>
          <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-1.5 opacity-70">{kpi.label}</p>
          {loading ? (
            <div className="h-6 w-24 bg-surface-dim animate-pulse rounded" />
          ) : (
            <h4 className="text-xl font-black text-primary tabular-nums">
              {kpi.val?.toString().includes('/') ? kpi.val : `${currency}${Number(kpi.val || 0).toLocaleString()}`}
            </h4>
          )}
        </div>
        <div className="mt-4">
          {kpi.progress && <Progress value={kpi.progress} className="h-1.5 mb-2" />}
          <p className="text-[9px] font-bold text-on-surface-variant opacity-60 uppercase">{kpi.sub}</p>
        </div>
      </Card>
    ))}
  </div>
);
