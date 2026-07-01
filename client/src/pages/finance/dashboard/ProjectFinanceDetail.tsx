import React from 'react';
import { useNavigate } from '@/lib/router-compat';
import { useParams, useLocation } from "wouter";
import { 
  GrantAllocationList, 
  ConsumptionByCategory, 
  TransactionTimeline 
} from '@/components/finance/dashboard/DetailWidgets';
import { ProjectInfoHeader, RemainingDaysIndicator } from '@/components/finance/dashboard/DashboardWidgets';
import { KPICard } from '@/components/finance/dashboard/FinanceShared';
import { trpc } from '@/lib/trpc';
import { TopNavBar, SideNavBar } from '@/components/finance/dashboard/Layout';
import { Card } from '@/components/ui/card';
import { Button } from "@/components/ui/button";

/**
 * Project Finance Detail (Tier 2 Drill-down)
 */
const ProjectFinanceDetail: React.FC = () => {
  const params = useParams();
  const projectId = params?.projectId;
  const navigate = useNavigate();

  // Integrated real-time project granularity from v8 router
  const detail = trpc.financeDashboard.getProjectFinancialDetail.useQuery({ 
    projectId: Number(projectId) 
  });

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <SideNavBar activeTab="Portfolio" />
      
      <div className="flex-1 flex flex-col min-w-0">
        <TopNavBar title="Project Intelligence Detail" />
        
        <main className="flex-1 overflow-y-auto p-8 space-y-8">
           <header className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-border-subtle">
             <div className="flex items-center gap-2">
               <span className="text-xs font-bold text-muted-foreground uppercase">Finance Hub</span>
               <span className="text-muted-foreground">/</span>
               <span className="text-xs font-bold text-muted-foreground uppercase">Portfolio</span>
               <span className="text-muted-foreground">/</span>
               <span className="text-xs font-bold text-primary uppercase">{detail.data?.projectCode || 'Project Detail'}</span>
             </div>
             <div className="flex gap-3">
               <Button variant="outline" onClick={() => {/* Trigger Server-side PDF Export */}}>Export PDF</Button>
               <Button variant="default" onClick={() => navigate('/finance/dashboard')}>Return to Portfolio</Button>
             </div>
           </header>

           {/* Hero Section: Dynamic Lifecycle Tracking */}
           <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
             <Card className="lg:col-span-3 p-8 rounded-3xl border border-border-subtle shadow-sm">
               <ProjectInfoHeader 
                 code={detail.data?.projectCode}
                 title={detail.data?.title}
                 status={detail.data?.status}
                 startDate={detail.data?.startDate ?? undefined}
                 endDate={detail.data?.endDate ?? undefined}
                 progress={Number(detail.data?.completionPct ?? 0)}
               />
             </Card>
             <Card className="p-8 rounded-3xl border border-border-subtle shadow-sm flex items-center justify-center">
               <RemainingDaysIndicator 
                 days={detail.data?.remainingDays} 
                 status={detail.data?.status} 
               />
             </Card>
           </div>

           {/* Metrics Row: Direct from Source of Truth (budget_lines) */}
           <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
             <KPICard title="Total Budget" value={`$${Number(detail.data?.totalBudget || 0).toLocaleString()}`} loading={detail.isLoading} />
             <KPICard title="Spent (Actual)" value={`$${Number(detail.data?.spent || 0).toLocaleString()}`} loading={detail.isLoading} />
             <KPICard title="Remaining" value={`$${Number(detail.data?.availableBudget || 0).toLocaleString()}`} loading={detail.isLoading} />
             <KPICard title="Burn Rate" value={`$${Number(detail.data?.burnRate || 0).toLocaleString()}/mo`} loading={detail.isLoading} />
             <KPICard title="Utilization" value={`${detail.data?.utilization || 0}%`} progress={detail.data?.utilization} loading={detail.isLoading} />
           </div>

           {/* Comparative Analysis: Dynamic Grant Mappings & Category Analysis */}
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             <div className="lg:col-span-2 space-y-8">
               <Card className="p-6 rounded-2xl border border-border-subtle shadow-sm">
                 <h3 className="font-black text-sm uppercase tracking-widest text-primary mb-6">Supportive Grants (Fund Sources)</h3>
                 <GrantAllocationList grants={detail.data?.grants} />
               </Card>

               <Card className="p-6 rounded-2xl border border-border-subtle shadow-sm">
                 <h3 className="font-black text-sm uppercase tracking-widest text-primary mb-6">Budget Consumption (Top Categories)</h3>
                 <ConsumptionByCategory data={detail.data?.consumptionByCategory} />
               </Card>
             </div>

             <aside className="space-y-6">
               <Card className="p-6 rounded-2xl border border-border-subtle shadow-sm">
                 <h3 className="font-black text-sm uppercase tracking-widest text-primary mb-6">Transaction Timeline</h3>
                 <TransactionTimeline projectId={Number(projectId)} limit={5} showDrillDown={true} />
                 <Button variant="ghost" className="w-full mt-6 font-bold" onClick={() => navigate(`/finance/ledger?projectId=${projectId}`)}>View All Transactions</Button>
               </Card>
             </aside>
           </div>
        </main>
      </div>
    </div>
  );
};

export default ProjectFinanceDetail;
