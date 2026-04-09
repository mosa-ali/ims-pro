import { useState, useMemo } from 'react';
import { Plus, Lightbulb, FileText, TrendingUp, DollarSign, Target, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { PipelineManagement } from '@/pages/organization/proposals/PipelineManagement';
import { ProposalDevelopment } from '@/pages/organization/proposals/ProposalDevelopment';

import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

// All data is fetched from the database via tRPC queries
// No mock data is used - see PipelineManagement and ProposalDevelopment components for data fetching

export function ProposalPipeline() {
 const { t } = useTranslation();
 const { isRTL } = useLanguage();
 const [, setLocation] = useLocation();
 const [activeTab, setActiveTab] = useState<'pipeline' | 'proposals'>('pipeline');
 const { user } = useAuth();

 // Fetch real KPIs from database
 const { data: kpis, isLoading } = trpc.proposals.getPipelineKPIs.useQuery(
 {
 organizationId: user?.organizationId || 0,
 operatingUnitId: user?.operatingUnitId,
 },
 {
 enabled: !!user?.organizationId,
 }
 );

 // Use real KPIs from database
 const stats = useMemo(() => {
 if (isLoading || !kpis) {
 return {
 pipeline: {
 total: 0,
 identified: 0,
 underReview: 0,
 conceptRequested: 0,
 proposalRequested: 0
 },
 proposals: {
 total: 0,
 draft: 0,
 underReview: 0,
 submitted: 0,
 approved: 0,
 rejected: 0
 },
 financial: {
 pipelineValue: 0,
 submittedValue: 0,
 approvedValue: 0,
 successRate: 0
 }
 };
 }

 return {
 pipeline: {
 total: kpis.pipelineCount,
 identified: 0, // TODO: Add stage-specific counts
 underReview: 0,
 conceptRequested: 0,
 proposalRequested: 0
 },
 proposals: {
 total: kpis.activeProposals,
 draft: 0, // TODO: Add status-specific counts
 underReview: 0,
 submitted: 0,
 approved: 0,
 rejected: 0
 },
 financial: {
 pipelineValue: kpis.totalPipelineValue,
 submittedValue: 0, // TODO: Calculate from proposals
 approvedValue: 0,
 successRate: kpis.successRate
 }
 };
 }, [kpis, isLoading]);

 // Translations
 const labels = {
 title: t.proposals.proposalPipelineManagement,
 subtitle: t.proposals.subtitle || 'Track funding opportunities, develop proposals, and manage the full project lifecycle',
 cards: {
 pipelineOpportunities: t.proposals.pipelineOpportunities,
 conceptNotesRequested: t.proposals.conceptNotesRequested,
 activeProposals: t.proposals.activeProposals,
 submitted: t.proposals.submitted11,
 approved: t.proposals.approved12,
 totalPipelineValue: t.proposals.totalFundingPipeline,
 submittedValue: t.proposals.submitted11,
 successRate: t.proposals.successRate,
 of: t.proposals.of
 },
 tabs: {
 pipeline: t.proposals.pipeline,
 proposals: t.proposals.proposalsConceptNotes
 },
 help: {
 title: t.proposals.howThisWorks,
 pipeline: t.proposals.pipeline,
 pipelineDesc: t.proposals.howThisWorksPipelineDesc,
 proposalsLabel: t.proposals.proposals,
 proposalsDesc: t.proposals.developFullProposalsInsystemWithStructured,
 workflow: t.proposals.howThisWorksWorkflow,
 workflowDesc: t.proposals.pipelineConceptNoteFullProposalSubmission,
 export: t.proposals.export13,
 exportDesc: t.proposals.generatePdfAndWordDocumentsFrom,
 templates: t.proposals.templates,
 templatesDesc: t.proposals.preconfiguredTemplatesForNationalAndInternational
 }
 };

 return (
 <div className="space-y-6 p-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Back Button */}
 <BackButton onClick={() => setLocation('/organization/donor-crm')} label={t.proposals.backToDonorCrmDashboard} />

 {/* Header */}
 <div className="mb-6">
 <h1 className="text-page-title font-bold text-gray-900">{labels.title}</h1>
 <p className="text-gray-600 mt-1">
 {labels.subtitle}
 </p>
 </div>

 {/* Summary Cards */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <SummaryCard
 title={labels.cards.pipelineOpportunities}
 value={stats.pipeline.total}
 subtitle={`${stats.pipeline.conceptRequested} ${labels.cards.conceptNotesRequested}`}
 icon={<Lightbulb className="w-5 h-5" />}
 color="blue"
 />
 <SummaryCard
 title={labels.cards.activeProposals}
 value={stats.proposals.total}
 subtitle={`${stats.proposals.submitted} ${labels.cards.submitted}, ${stats.proposals.approved} ${labels.cards.approved}`}
 icon={<FileText className="w-5 h-5" />}
 color="green"
 />
 <SummaryCard
 title={labels.cards.totalPipelineValue}
 value={`$${(stats.financial.pipelineValue / 1000000).toFixed(1)}M`}
 subtitle={`$${(stats.financial.submittedValue / 1000000).toFixed(1)}M ${labels.cards.submittedValue}`}
 icon={<DollarSign className="w-5 h-5" />}
 color="purple"
 />
 <SummaryCard
 title={labels.cards.successRate}
 value={`${stats.financial.successRate}%`}
 subtitle={`${stats.proposals.approved} ${labels.cards.of} ${stats.proposals.submitted + stats.proposals.approved} ${labels.cards.submitted}`}
 icon={<TrendingUp className="w-5 h-5" />}
 color="orange"
 />
 </div>

 {/* Tabs Navigation */}
 <div className="bg-white rounded-lg shadow-sm border border-gray-200">
 <div className="border-b border-gray-200">
 <div className={`flex`}>

 <button
 onClick={() => setActiveTab('pipeline')}
 className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${ activeTab === 'pipeline' ? 'border-primary text-primary bg-blue-50' : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300' }`}
 >
 <div className={`flex items-center gap-2`}>
 <Lightbulb className="w-4 h-4" />
 <span>{labels.tabs.pipeline} ({stats.pipeline.total})</span>
 </div>
 </button>
 <button
 onClick={() => setActiveTab('proposals')}
 className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${ activeTab === 'proposals' ? 'border-primary text-primary bg-blue-50' : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300' }`}
 >
 <div className={`flex items-center gap-2`}>
 <FileText className="w-4 h-4" />
 <span>{labels.tabs.proposals} ({stats.proposals.total})</span>
 </div>
 </button>
 </div>
 </div>

 {/* Tab Content */}
 <div className="p-6">
 {activeTab === 'pipeline' && <PipelineManagement />}
 {activeTab === 'proposals' && <ProposalDevelopment />}
 </div>
 </div>

 {/* Help Section */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
 <div className={`flex items-start gap-3`}>
 <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
 <div className={'text-start'}>
 <h4 className="font-semibold text-blue-900 mb-2">{labels.help.title}</h4>
 <ul className="text-sm text-blue-800 space-y-1">
 <li>• <strong>{labels.help.pipeline}:</strong> {labels.help.pipelineDesc}</li>
 <li>• <strong>{labels.help.proposalsLabel}:</strong> {labels.help.proposalsDesc}</li>
 <li>• <strong>{labels.help.workflow}:</strong> {labels.help.workflowDesc}</li>
 <li>• <strong>{labels.help.export}:</strong> {labels.help.exportDesc}</li>
 <li>• <strong>{labels.help.templates}:</strong> {labels.help.templatesDesc}</li>
 </ul>
 </div>
 </div>
 </div>
 </div>
 );
}

// Summary Card Component
interface SummaryCardProps {
 title: string;
 value: string | number;
 subtitle: string;
 icon: React.ReactNode;
 color: 'blue' | 'green' | 'purple' | 'orange';
}

function SummaryCard({ title, value, subtitle, icon, color }: SummaryCardProps) {

 const colorClasses = {
 blue: 'bg-blue-50 text-blue-600',
 green: 'bg-green-50 text-green-600',
 purple: 'bg-purple-50 text-purple-600',
 orange: 'bg-orange-50 text-orange-600'
 };

 return (
 <div className="bg-white border border-gray-200 rounded-lg p-4">
 <div className={`flex items-start justify-between mb-3`}>
 <div className={`flex-1 text-start`}>
 <div className="text-xs font-medium text-gray-600 mb-1">{title}</div>
 <div className="ltr-safe text-2xl font-bold text-gray-900">{value}</div>
 </div>
 <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
 {icon}
 </div>
 </div>
 <p className={`text-xs text-gray-500 text-start`}>{subtitle}</p>
 </div>
 );
}export default ProposalPipeline;
