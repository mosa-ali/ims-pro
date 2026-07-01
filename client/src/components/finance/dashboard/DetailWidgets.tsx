import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table } from "@/components/ui/table";
import { useNavigate } from"@/lib/router-compat";

/**
 * Grant Allocation List (Tier 2 supportive grants)
 */
export const GrantAllocationList: React.FC<{
  grants?: any[];
}> = ({ grants }) => (
  <Table>
    <thead>
      <tr className="text-[10px] uppercase font-bold text-on-surface-variant border-b border-border-subtle bg-surface-container-low/20">
        <th className="px-4 py-3 text-left">Donor / Agency</th>
        <th className="px-4 py-3 text-left">Grant ID</th>
        <th className="px-4 py-3 text-right">Contribution</th>
        <th className="px-4 py-3 text-center">Utilization</th>
        <th className="px-4 py-3 text-center">Status</th>
      </tr>
    </thead>
    <tbody>
      {grants?.map((grant, idx) => (
        <tr key={idx} className="border-b border-border-subtle hover:bg-neutral-gray-surface transition-colors">
          <td className="px-4 py-4 text-sm font-bold text-primary">{grant.donorName}</td>
          <td className="px-4 py-4 text-sm font-mono text-on-surface-variant">{grant.grantCode}</td>
          <td className="px-4 py-4 text-sm text-right font-bold tabular-nums">${Number(grant.fundingAmount).toLocaleString()}</td>
          <td className="px-4 py-4 w-40">
            <div className="space-y-1">
              <Progress value={grant.utilization} className="h-1.5" />
              <div className="text-[9px] font-bold text-on-surface-variant text-right">{grant.utilization}%</div>
            </div>
          </td>
          <td className="px-4 py-4 text-center">
            <Badge variant={grant.status === 'COMPLIANT' ? "secondary" : "destructive"}>{grant.status}</Badge>
          </td>
        </tr>
      ))}
    </tbody>
  </Table>
);

/**
 * Budget Line Consumption component with stacked bars
 */
export const ConsumptionByCategory: React.FC<{
  data?: any[];
  total?: number;
}> = ({ data, total }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-8 p-2">
      {data?.map((item, idx) => (
        <div key={idx} className="space-y-3 cursor-pointer group" onClick={() => navigate(`/finance/ledger/${item.budgetLineId}`)}>
          <div className="flex justify-between items-end">
            <div className="space-y-0.5">
              <h4 className="text-sm font-black text-primary uppercase tracking-tight group-hover:underline">{item.category}</h4>
              <p className="text-[10px] text-on-surface-variant font-medium">Lifecycle Consumption Status</p>
            </div>
            <div className="text-right tabular-nums">
              <span className="text-sm font-black text-primary">${(item.spent / 1000000).toFixed(1)}M</span>
              <span className="text-xs text-on-surface-variant mx-1.5 opacity-40">/</span>
              <span className="text-xs font-bold text-on-surface-variant/70">${(item.budget / 1000000).toFixed(1)}M</span>
            </div>
          </div>
          <div className="relative h-5 bg-surface-container-low rounded-lg overflow-hidden flex border border-border-subtle shadow-inner">
            <div 
              className="h-full bg-primary transition-all duration-700 ease-out relative" 
              style={{ width: `${(item.spent / item.budget) * 100}%` }}
            >
               <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div 
              className="h-full bg-secondary opacity-30 transition-all duration-700 ease-out border-l border-white/20" 
              style={{ width: `${(item.commitments / item.budget) * 100}%` }}
            />
          </div>
          <div className="flex gap-6 text-[9px] font-black text-on-surface-variant uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-primary rounded-sm shadow-sm"></span>
              Actual: {((item.spent / item.budget) * 100).toFixed(1)}%
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-secondary opacity-40 rounded-sm shadow-sm"></span>
              Encumbered: {((item.commitments / item.budget) * 100).toFixed(1)}%
            </div>
            <div className="flex items-center gap-2 ml-auto opacity-60">
               <span className="material-icons text-[10px]">info</span>
               Variance: {(((item.budget - item.spent - item.commitments) / item.budget) * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Transaction Timeline for project detail views
 */
export const TransactionTimeline: React.FC<{
  projectId: number;
  limit?: number;
  showDrillDown?: boolean;
}> = ({ projectId, limit = 5, showDrillDown }) => {
  const navigate = useNavigate();

  return (
    <div className="relative pl-9 space-y-10 before:absolute before:left-[13px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border-subtle/50 before:border-l before:border-dashed before:border-primary/20">
      {[
        { title: 'Drawdown Processed', desc: 'Disbursement of $1.2M from World Bank IDA for Phase 2 Site Preparation.', date: '2h ago', icon: 'payments', status: 'info', ref: 'TRX-99827-BC', budgetLineId: 101 },
        { title: 'Compliance Milestone', desc: 'Q3 environmental impact report approved by EU audit board.', date: 'Yesterday', icon: 'verified_user', status: 'success', budgetLineId: 102 },
        { title: 'Budget Variance Alert', desc: 'Labor costs in Region 4 exceeded forecast by 12.5% due to local regulatory changes.', date: 'Aug 14', icon: 'warning', status: 'error', budgetLineId: 103 },
        { title: 'Project Initialized', desc: 'Charter signed and initial funding pool established in ERP module.', date: 'Jan 12', icon: 'rocket_launch', status: 'neutral', budgetLineId: 104 },
      ].slice(0, limit).map((event, idx) => (
        <div key={idx} className="relative group">
          <div className={`absolute -left-[32px] top-0 w-6 h-6 rounded-full border-4 border-white flex items-center justify-center z-10 shadow-md transition-transform group-hover:scale-110
            ${event.status === 'success' ? 'bg-success text-white' : 
              event.status === 'error' ? 'bg-error text-white' : 
              event.status === 'info' ? 'bg-primary text-white' : 'bg-surface-dim text-on-surface-variant'}`}
          >
            <span className="material-icons text-[12px]">{event.icon}</span>
          </div>
          <div className="flex justify-between items-start mb-1.5">
            <h4 className="font-black text-sm text-primary tracking-tight">{event.title}</h4>
            <span className="text-[10px] font-bold text-on-surface-variant/50 uppercase tabular-nums">{event.date}</span>
          </div>
          <p className="text-xs text-on-surface-variant/80 leading-relaxed font-medium mb-3">{event.desc}</p>
          {showDrillDown && event.ref && (
            <div 
              className="bg-surface-container-low/50 p-2.5 rounded-lg border border-border-subtle flex justify-between items-center group/btn cursor-pointer hover:bg-primary/5 hover:border-primary/30 transition-all"
              onClick={() => navigate(`/finance/ledger/${event.budgetLineId}`)}
            >
              <span className="text-[10px] font-mono font-black text-on-surface-variant group-hover/btn:text-primary">{event.ref}</span>
              <span className="material-icons text-xs text-on-surface-variant/40 group-hover/btn:text-primary group-hover/btn:translate-x-0.5 transition-all">open_in_new</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};