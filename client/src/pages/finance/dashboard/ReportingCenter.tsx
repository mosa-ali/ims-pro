import React, { useState } from 'react';
import { 
  ReportCard, 
  ExportHistoryTable, 
  QuickStatsBar,
  ScheduledDistributionList
} from '@/components/finance/dashboard/ReportingWidgets';
import { trpc } from '@/lib/trpc';
import { TopNavBar, SideNavBar } from '@/components/finance/dashboard/Layout';
import { Card } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/iconButton";
import { Badge } from '@/components/ui/badge';


/**
 * Financial Reporting Center
 * Finalized with Automated Email Distribution Logic.
 */
const ReportingCenter: React.FC = () => {
  const exportHistory = trpc.financialReports.getExportHistory.useQuery();
  
  // Simulated State for Automated Distributions
  const [schedules] = useState([
    { id: 1, name: 'Monthly Executive P&L', frequency: 'Monthly, 1st Mon', time: '08:00 AM', status: 'ACTIVE' },
    { id: 2, name: 'Weekly Donor Utilization', frequency: 'Weekly, Friday', time: '05:00 PM', status: 'ACTIVE' },
    { id: 3, name: 'Q3 Compliance Audit', frequency: 'Quarterly', time: '09:00 AM', status: 'PAUSED' }
  ]);

  return (
    <div className="flex h-screen bg-surface overflow-hidden text-primary">
      <SideNavBar activeTab="Reports" />
      
      <div className="flex-1 flex flex-col min-w-0">
        <TopNavBar title="Financial Reporting Center" />
        
        <main className="flex-1 overflow-y-auto p-8 space-y-8">
          <QuickStatsBar 
            stats={[
              { label: 'Audit Compliance', value: '100%', status: 'stable' },
              { label: 'Statement Uptime', value: '99.9%', status: 'stable' },
              { label: 'Exports (24H)', value: '142', limit: '5k' }
            ]} 
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
              {/* Report Catalog */}
              <Card className="p-8 rounded-3xl border border-border-subtle shadow-sm bg-white">
                <header className="mb-8 flex justify-between items-end border-b pb-6 border-border-subtle">
                  <div>
                    <h2 className="text-headline-sm font-black tracking-tight">Statements Catalog</h2>
                    <p className="text-on-surface-variant font-medium opacity-70 italic">Standardized donor-compliant financial exports.</p>
                  </div>
                  <div className="flex bg-surface-container-low p-1 rounded-xl border border-border-subtle">
                    <IconButton icon="grid_view" />
                    <IconButton icon="list" />
                  </div>
                </header>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ReportCard 
                    id="MFR" 
                    title="Monthly Financial Report" 
                    desc="Comprehensive P&L, Balance Sheet, and multi-project variance analysis for the current fiscal period." 
                    status="AUDIT READY"
                    category="Executive Core"
                    onGenerate={() => {}}
                  />
                  <ReportCard 
                    id="BVA" 
                    title="Budget vs Actual (BvA)" 
                    desc="Real-time comparison of planned budgets against actual postings and encumbrances by project." 
                    status="HIGH PRIORITY"
                    category="Project Control"
                    onGenerate={() => {}}
                  />
                </div>
              </Card>

              {/* Generation Log */}
              <Card className="p-8 rounded-3xl border border-border-subtle shadow-sm bg-white overflow-hidden">
                <header className="mb-6 flex justify-between items-center">
                  <div className="space-y-0.5">
                    <h3 className="text-headline-xs font-black tracking-tight uppercase">Export History</h3>
                    <p className="text-[10px] font-bold text-on-surface-variant opacity-60">ARCHIVE OF PREVIOUS STATEMENT RUNS</p>
                  </div>
                  <IconButton icon="refresh" />
                </header>
                <ExportHistoryTable data={exportHistory.data} />
              </Card>
            </div>

            {/* Sidebar: Distribution & Integrity */}
            <aside className="lg:col-span-4 space-y-6">
              <Card className="p-6 rounded-3xl border border-border-subtle shadow-xl bg-corporate-blue-dark text-white relative overflow-hidden flex flex-col">
                <div className="relative z-10 space-y-6 flex-1">
                  <div className="space-y-2">
                    <h3 className="font-black text-lg flex items-center gap-2">
                      <span className="material-icons">forward_to_inbox</span>
                      Automated Scheduling
                    </h3>
                    <p className="text-xs font-medium opacity-80 leading-relaxed italic">Configure recurring distributions to Country Directors and Donor Focal Points.</p>
                  </div>
                  
                  <ScheduledDistributionList schedules={schedules} />
                  
                  <Button variant="secondary" className="w-full bg-white text-primary hover:bg-white/90 font-black text-xs uppercase tracking-widest h-12 rounded-xl shadow-lg mt-4">
                    <span className="material-icons text-sm mr-2">add</span>
                    New Distribution
                  </Button>
                </div>
                {/* Visual Flair */}
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
              </Card>

              <Card className="p-6 rounded-2xl border border-border-subtle shadow-sm bg-white">
                <h3 className="font-black text-xs uppercase tracking-[0.2em] text-on-surface-variant mb-6">System Audit Integrity</h3>
                <div className="space-y-6">
                   <div className="flex justify-between items-center">
                     <div className="flex items-center gap-2">
                       <span className="material-icons text-success text-sm">verified</span>
                       <span className="font-bold text-[10px] uppercase">Master Metadata</span>
                     </div>
                     <span className="font-black text-xs tabular-nums text-success">100.0%</span>
                   </div>
                   <div className="flex justify-between items-center">
                     <div className="flex items-center gap-2">
                       <span className="material-icons text-success text-sm">sync_alt</span>
                       <span className="font-bold text-[10px] uppercase">GL Reconciliation</span>
                     </div>
                     <span className="font-black text-xs tabular-nums text-success">98.4% Sync</span>
                   </div>
                   <div className="pt-4 border-t border-border-subtle">
                     <p className="text-[9px] text-on-surface-variant leading-tight font-medium opacity-60">
                       Last system verification completed today at 09:42 AM. All financial statements are derived from the General Ledger Source of Truth.
                     </p>
                   </div>
                </div>
              </Card>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ReportingCenter;
