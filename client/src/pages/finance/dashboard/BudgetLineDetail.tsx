import React from 'react';
import { useParams } from "wouter";
import { 
  LedgerTable, 
  AuditTrailSidebar, 
  BudgetLineHeader, 
  DocumentAuditPanel,
  VoucherStatusGrid,
  IconButton,
} from '@/components/finance/dashboard/ledger';
import { trpc } from '@/lib/trpc';
import { SideNavBar } from "@/components/layout/SideNavBar";
import { TopNavBar } from "@/components/layout/TopNavBar";
import {
  DashboardLayout,
  TopAppBar,
} from "@/components/finance/dashboard/dashboard";


/**
 * Budget Line Detail (Tier 3 Transactional View)
 * Provides granular General Ledger analysis, adjustment logs, 
 * and full audit trail for specific budget lines.
 */
const BudgetLineDetail: React.FC = () => {
  const { budgetLineId } = useParams<{ budgetLineId: string }>();
  
  // High-performance transaction retrieval from journal_lines and vouchers
  const transactions = trpc.financeDashboard.getBudgetLineTransactions.useQuery({ 
    budgetLineId: Number(budgetLineId) 
  });

  const summary = trpc.financeDashboard.getBudgetLineSummary.useQuery({ 
    budgetLineId: Number(budgetLineId) 
  });

  return (
        <DashboardLayout
            activeModule="Finance"
            activePage="Budget Line Detail"
        >
            <TopAppBar
            title="Budget Line Transaction View"
            showReturnToHub={true}
            actions={[
                {
                label: "Export XLSX",
                icon: "download",
                variant: "outline",
                },
                {
                label: "Print",
                icon: "print",
                variant: "outline",
                },
            ]}
            />

            <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Granular Line Summary Header */}
        <section className="bg-surface-container-lowest border-b p-8 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <BudgetLineHeader 
              code={summary.data?.code} 
              description={summary.data?.description}
              category={summary.data?.category ?? ""}
            />
            <div className="flex gap-4">
              <VoucherStatusGrid 
                spent={summary.data?.actualSpent} 
                committed={summary.data?.commitments} 
                available={summary.data?.availableBalance}
              />
            </div>
          </div>
          
          {/* Quick Contextual Info */}
          <div className="flex gap-8 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-on-surface-variant uppercase font-bold text-xs tracking-tighter">Project:</span>
              <span className="font-medium text-primary underline cursor-pointer">{summary.data?.projectName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-on-surface-variant uppercase font-bold text-xs tracking-tighter">Grant:</span>
              <span className="font-medium">{summary.data?.grantCode}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-on-surface-variant uppercase font-bold text-xs tracking-tighter">Operating Unit:</span>
              <span className="font-medium">{summary.data?.ouName}</span>
            </div>
          </div>
        </section>

        {/* Transaction Ledger & Audit Sidebar Layout */}
        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 overflow-y-auto p-8 space-y-6">
            <header className="flex justify-between items-center">
              <div>
                <h4 className="font-bold text-headline-xs">General Ledger Transactions</h4>
                <p className="text-body-sm text-on-surface-variant italic">Real-time postings from posted journal entries.</p>
              </div>
              <div className="flex gap-2">
                <IconButton icon="filter_list" label="Filter" />
                <IconButton icon="download" label="Export XLSX" />
                <IconButton icon="print" label="Print Ledger" />
              </div>
            </header>

            {/* High-density Transaction Table (TanStack Table) */}
            <div className="bg-surface-container-lowest rounded-2xl border border-border-subtle shadow-sm overflow-hidden">
              <LedgerTable 
                data={transactions.data} 
                loading={transactions.isLoading} 
              />
            </div>
            
            {/* Supporting Document Proof Grid */}
            <DocumentAuditPanel budgetLineId={Number(budgetLineId)} />
          </main>

          {/* Audit Sidebar: Integrated workflow history */}
          <aside className="w-96 border-l bg-surface-container-lowest flex flex-col shadow-lg">
            <AuditTrailSidebar 
              budgetLineId={Number(budgetLineId)}
              onClose={() => {/* toggle visibility */}}
            />
          </aside>
        </div>
      </div>
      </DashboardLayout>
  );
};

export default BudgetLineDetail;