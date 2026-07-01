import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table } from '@/components/ui/table';


/**
 * Utility to merge tailwind classes
 */
function cn(...classes: (string | undefined | boolean | null)[]) {
  return classes.filter(Boolean).join(' ');
}

// --- SHARED UI COMPONENTS (Button / IconButton re-implementation for stability) ---

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'tonal' | 'text';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, variant = 'primary', size = 'md', fullWidth, className, ...props 
}) => {
  const variants = {
    primary: 'bg-[#003461] text-white hover:bg-[#002a4d] shadow-sm',
    secondary: 'bg-secondary text-on-secondary hover:bg-secondary/90',
    outline: 'border border-border-subtle hover:bg-surface-container-low',
    ghost: 'hover:bg-surface-container-low text-on-surface-variant',
    tonal: 'bg-[#003461]/10 text-[#003461] hover:bg-[#003461]/20',
    text: 'text-[#003461] hover:bg-[#003461]/5',
  };
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' };
  
  return (
    <button 
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50',
        variants[variant],
        sizes[size],
        fullWidth ? 'w-full' : '',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export const IconButton: React.FC<{
  icon: string;
  variant?: 'primary' | 'outline' | 'ghost' | 'tonal';
  size?: 'sm' | 'md';
  onClick?: () => void;
  label?: string;
}> = ({ icon, variant = 'ghost', size = 'md', onClick, label }) => {
  const variants = {
    primary: 'bg-[#003461] text-white',
    outline: 'border border-border-subtle text-primary',
    ghost: 'text-on-surface-variant hover:bg-surface-container-low',
    tonal: 'bg-[#003461]/10 text-primary'
  };
  const sizes = { sm: 'p-1.5', md: 'p-2.5' };
  const iconSizes = { sm: 'text-sm', md: 'text-lg' };

  return (
    <button 
      onClick={onClick}
      className={cn('rounded-lg transition-all active:scale-90 flex items-center gap-2', variants[variant], sizes[size])}
      title={label}
    >
      <span className={cn('material-icons', iconSizes[size])}>{icon}</span>
      {label && <span className="text-[10px] font-black uppercase tracking-tighter pr-1">{label}</span>}
    </button>
  );
};

// --- LEDGER SPECIFIC COMPONENTS ---

/**
 * BudgetLineHeader: High-density identity block for the transactional view.
 */
export const BudgetLineHeader: React.FC<{
  code?: string;
  description?: string;
  category?: string;
}> = ({ code, description, category }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-3">
      <Badge variant="outline" className="font-black text-[10px] border-primary text-primary px-2 bg-primary/5">
        {code || 'LINE-ID'}
      </Badge>
      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em] opacity-60">
        {category || 'Budget Category'}
      </span>
    </div>
    <h2 className="text-headline-sm font-black text-primary leading-tight max-w-3xl">
      {description || 'Loading Line Description...'}
    </h2>
  </div>
);

/**
 * VoucherStatusGrid: Vital signs for a specific budget line.
 */
export const VoucherStatusGrid: React.FC<{
  spent?: string | number;
  committed?: string | number;
  available?: string | number;
}> = ({ spent, committed, available }) => (
  <div className="flex gap-4">
    {[
      { label: 'Actual Spent', val: spent, color: 'text-error' },
      { label: 'Encumbered', val: committed, color: 'text-primary' },
      { label: 'Net Available', val: available, color: 'text-success' },
    ].map((m, i) => (
      <div key={i} className="bg-surface-container-low px-5 py-3 rounded-2xl border border-border-subtle min-w-[140px]">
        <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-1">{m.label}</p>
        <h4 className={cn('text-lg font-black tabular-nums', m.color)}>
          ${Number(m.val || 0).toLocaleString()}
        </h4>
      </div>
    ))}
  </div>
);

/**
 * LedgerTable: High-density transaction table for Tier 3 analysis.
 */
export const LedgerTable: React.FC<{
  data?: any[];
  loading?: boolean;
}> = ({ data, loading }) => (
  <Table className="w-full">
    <thead>
      <tr className="text-[10px] uppercase font-black text-on-surface-variant border-b border-border-subtle bg-surface-container-low/40">
        <th className="px-6 py-4 text-left tracking-widest">Date</th>
        <th className="px-6 py-4 text-left tracking-widest">Post Particulars</th>
        <th className="px-6 py-4 text-left tracking-widest">Reference No.</th>
        <th className="px-6 py-4 text-left tracking-widest">Account</th>
        <th className="px-6 py-4 text-right tracking-widest">Debit</th>
        <th className="px-6 py-4 text-right tracking-widest">Credit</th>
        <th className="px-6 py-4 text-center tracking-widest">Action</th>
      </tr>
    </thead>
    <tbody>
      {loading ? (
        [1, 2, 3, 4].map(i => (
          <tr key={i} className="animate-pulse bg-surface-dim/20 h-16 border-b border-border-subtle" />
        ))
      ) : data?.length ? (
        data.map((row, idx) => (
          <tr key={idx} className="border-b border-border-subtle hover:bg-neutral-gray-surface transition-colors">
            <td className="px-6 py-5 text-xs font-black text-on-surface-variant tabular-nums">
              {new Date(row.date).toLocaleDateString()}
            </td>
            <td className="px-6 py-5">
              <span className="text-sm font-bold text-primary block line-clamp-1">{row.description}</span>
              <span className="text-[9px] font-medium text-on-surface-variant opacity-60 uppercase">General Ledger Entry</span>
            </td>
            <td className="px-6 py-5">
              <code className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded">{row.reference}</code>
            </td>
            <td className="px-6 py-5 text-[10px] font-bold text-on-surface-variant uppercase">{row.account}</td>
            <td className="px-6 py-5 text-right text-sm font-black text-error tabular-nums">
              {row.debit > 0 ? `$${Number(row.debit).toLocaleString()}` : '—'}
            </td>
            <td className="px-6 py-5 text-right text-sm font-black text-success tabular-nums">
              {row.credit > 0 ? `$${Number(row.credit).toLocaleString()}` : '—'}
            </td>
            <td className="px-6 py-5">
              <div className="flex justify-center">
                <IconButton icon="receipt_long" size="sm" variant="tonal" label="Voucher" />
              </div>
            </td>
          </tr>
        ))
      ) : (
        <tr>
          <td colSpan={7} className="px-6 py-20 text-center text-on-surface-variant italic font-medium opacity-50">
            No GL postings found for this budget line in the selected period.
          </td>
        </tr>
      )}
    </tbody>
  </Table>
);

/**
 * AuditTrailSidebar: Vertical timeline of workflow events.
 */
export const AuditTrailSidebar: React.FC<{
  budgetLineId: number;
  onClose?: () => void;
}> = ({ budgetLineId, onClose }) => (
  <div className="flex flex-col h-full">
    <header className="p-6 border-b border-border-subtle flex justify-between items-center bg-surface-container-low/20">
      <div className="space-y-0.5">
        <h3 className="text-sm font-black text-primary uppercase tracking-widest">Workflow Audit</h3>
        <p className="text-[10px] text-on-surface-variant font-medium">Compliance & Approval History</p>
      </div>
      <IconButton icon="close" onClick={onClose} />
    </header>
    <div className="flex-1 overflow-y-auto p-6 space-y-8 relative before:absolute before:left-[39px] before:top-8 before:bottom-8 before:w-px before:bg-border-subtle before:border-l before:border-dashed">
      {[
        { title: 'Payment Released', date: 'Oct 24, 2024', user: 'Marcus Sterling (CFO)', icon: 'payments', status: 'success' },
        { title: 'Final Technical Approval', date: 'Oct 22, 2024', user: 'Sarah Jenkins (PM)', icon: 'verified', status: 'success' },
        { title: 'Compliance Flag Resolved', date: 'Oct 21, 2024', user: 'Audit Team', icon: 'spellcheck', status: 'info' },
        { title: 'Variance Alert Raised', date: 'Oct 19, 2024', user: 'System Bot', icon: 'warning', status: 'error' },
        { title: 'Purchase Request Validated', date: 'Oct 15, 2024', user: 'Finance Officer', icon: 'fact_check', status: 'success' },
      ].map((event, idx) => (
        <div key={idx} className="relative pl-12">
          <div className={cn(
            'absolute left-0 top-0 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center z-10 shadow-sm',
            event.status === 'success' ? 'bg-success text-white' : 
            event.status === 'error' ? 'bg-error text-white' : 
            'bg-primary text-white'
          )}>
            <span className="material-icons text-xs">{event.icon}</span>
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-black text-primary leading-tight">{event.title}</h4>
            <p className="text-[10px] font-bold text-on-surface-variant opacity-70">{event.date}</p>
            <p className="text-[10px] font-medium text-on-surface-variant italic">by {event.user}</p>
          </div>
        </div>
      ))}
    </div>
    <div className="p-6 border-t border-border-subtle bg-surface-container-low/10">
      <Button variant="outline" fullWidth size="sm" className="h-10 text-[10px]">Download Full Audit Trail</Button>
    </div>
  </div>
);

/**
 * DocumentAuditPanel: Grid for supporting document verification.
 */
export const DocumentAuditPanel: React.FC<{
  budgetLineId: number;
}> = ({ budgetLineId }) => (
  <Card className="bg-white border-border-subtle shadow-sm overflow-hidden">
    <header className="p-6 border-b border-border-subtle flex justify-between items-center bg-surface-container-low/20">
      <div className="flex items-center gap-2">
        <span className="material-icons text-primary">description</span>
        <h3 className="text-sm font-black text-primary uppercase tracking-widest">Supporting Document Proof</h3>
      </div>
      <Badge variant="outline" className="text-[9px] font-black uppercase text-success border-success/30 bg-success/5">100% Compliant</Badge>
    </header>
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { name: 'PR-2024-001.pdf', size: '1.2 MB', type: 'Purchase Request' },
        { name: 'INV-VENDOR-99.pdf', size: '440 KB', type: 'Supplier Invoice' },
        { name: 'GRN-SITE-A.pdf', size: '890 KB', type: 'Goods Receipt' },
        { name: 'APPROVAL-CHAIN.pdf', size: '1.5 MB', type: 'Authorization' },
      ].map((doc, idx) => (
        <div key={idx} className="p-4 rounded-xl border border-border-subtle hover:border-primary/30 hover:bg-primary/5 transition-all group cursor-pointer">
          <div className="flex justify-between items-start mb-3">
             <span className="material-icons text-on-surface-variant group-hover:text-primary transition-colors">insert_drive_file</span>
             <IconButton icon="download" size="sm" />
          </div>
          <p className="text-xs font-black text-primary truncate mb-0.5">{doc.name}</p>
          <div className="flex justify-between text-[9px] font-bold text-on-surface-variant opacity-60 uppercase">
            <span>{doc.type}</span>
            <span>{doc.size}</span>
          </div>
        </div>
      ))}
    </div>
  </Card>
);
