import { useState, useMemo } from 'react';
import { Plus, Lightbulb, FileText, TrendingUp, DollarSign, Target, AlertCircle, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { PipelineManagement } from '@/pages/organization/proposals/PipelineManagement';
import { ProposalDevelopment } from '@/pages/organization/proposals/ProposalDevelopment';

import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';

// Import mock data to calculate real stats
const mockPipelineOpportunities = [
  {
    id: '1',
    title: 'Emergency Education Support in Conflict Areas',
    donorName: 'UNICEF',
    donorType: 'UN',
    fundingWindow: 'Q3 2024 Emergency Call',
    deadline: '2024-09-30',
    indicativeBudgetMin: 300000,
    indicativeBudgetMax: 500000,
    sector: ['Education in Emergencies', 'Child Protection'],
    country: 'Yemen',
    governorate: "Sana'a",
    stage: 'Concept Requested',
    probability: 75,
    focalPoint: 'Sarah Johnson',
    notes: 'Strong alignment with our EiE program. Partner meeting scheduled.',
    createdAt: '2024-05-15T10:00:00Z',
    updatedAt: '2024-06-01T14:30:00Z'
  },
  {
    id: '2',
    title: 'WASH Infrastructure Rehabilitation',
    donorName: 'European Commission - ECHO',
    donorType: 'EU',
    fundingWindow: 'Humanitarian Implementation Plan 2024',
    deadline: '2024-08-15',
    indicativeBudgetMin: 800000,
    indicativeBudgetMax: 1200000,
    sector: ['WASH', 'Health'],
    country: 'Yemen',
    governorate: 'Hodeidah',
    stage: 'Under Review',
    probability: 60,
    focalPoint: 'Ahmed Ali',
    notes: 'Requires consortium approach. Discussing with 2 partners.',
    createdAt: '2024-05-20T09:00:00Z',
    updatedAt: '2024-05-28T11:00:00Z'
  }
];

const mockProposals = [
  {
    id: '1',
    proposalTitle: 'Emergency Education Support in Conflict-Affected Areas',
    donorName: 'UNICEF',
    callReference: 'UNICEF-YEM-2024-EDU-007',
    proposalType: 'Concept Note',
    country: 'Yemen',
    governorate: "Sana'a",
    sector: ['Education in Emergencies', 'Child Protection'],
    projectDuration: 12,
    totalRequestedBudget: 450000,
    currency: 'USD',
    submissionDeadline: '2024-09-30',
    proposalStatus: 'Draft',
    completionPercentage: 65,
    createdBy: 'Sarah Johnson',
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-15T14:30:00Z',
    pipelineId: '1'
  },
  {
    id: '2',
    proposalTitle: 'Integrated WASH and Health Services',
    donorName: 'European Commission - ECHO',
    callReference: 'ECHO-YEM-2024-WASH-012',
    proposalType: 'Full Proposal',
    country: 'Yemen',
    governorate: 'Hodeidah',
    sector: ['WASH', 'Health'],
    projectDuration: 18,
    totalRequestedBudget: 950000,
    currency: 'EUR',
    submissionDeadline: '2024-08-15',
    proposalStatus: 'Submitted',
    completionPercentage: 100,
    createdBy: 'Ahmed Ali',
    createdAt: '2024-05-25T09:00:00Z',
    updatedAt: '2024-06-10T16:45:00Z',
    pipelineId: '2'
  },
  {
    id: '3',
    proposalTitle: 'Community-Based Nutrition Program',
    donorName: 'USAID',
    callReference: 'USAID-YEM-2024-NUT-005',
    proposalType: 'Full Proposal',
    country: 'Yemen',
    governorate: 'Taiz',
    sector: ['Nutrition', 'Health'],
    projectDuration: 24,
    totalRequestedBudget: 1200000,
    currency: 'USD',
    submissionDeadline: '2024-10-20',
    proposalStatus: 'Submitted',
    completionPercentage: 100,
    createdBy: 'Fatima Hassan',
    createdAt: '2024-04-15T11:30:00Z',
    updatedAt: '2024-06-05T13:20:00Z'
  },
  {
    id: '4',
    proposalTitle: 'Livelihood Restoration for Displaced Families',
    donorName: 'UNHCR',
    callReference: 'UNHCR-YEM-2024-LIV-003',
    proposalType: 'Concept Note',
    country: 'Yemen',
    governorate: 'Marib',
    sector: ['Livelihoods', 'Protection'],
    projectDuration: 15,
    totalRequestedBudget: 680000,
    currency: 'USD',
    submissionDeadline: '2024-11-15',
    proposalStatus: 'Under Internal Review',
    completionPercentage: 85,
    createdBy: 'Mohammed Saleh',
    createdAt: '2024-06-10T08:00:00Z',
    updatedAt: '2024-06-18T10:15:00Z'
  },
  {
    id: '5',
    proposalTitle: 'Child Protection in Emergency Settings',
    donorName: 'Save the Children - Global Fund',
    callReference: 'STC-YEM-2024-CP-009',
    proposalType: 'Full Proposal',
    country: 'Yemen',
    governorate: "Sana'a",
    sector: ['Child Protection', 'Education in Emergencies'],
    projectDuration: 12,
    totalRequestedBudget: 550000,
    currency: 'USD',
    submissionDeadline: '2024-07-30',
    proposalStatus: 'Approved',
    completionPercentage: 100,
    createdBy: 'Sarah Johnson',
    createdAt: '2024-03-20T09:30:00Z',
    updatedAt: '2024-05-25T14:00:00Z'
  }
];

export function ProposalPipeline() {
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
  const t = {
    title: isRTL ? 'إدارة مقترحات المشاريع وفرص التمويل' : 'Proposal & Pipeline Management',
    subtitle: isRTL 
      ? 'تتبع فرص التمويل وتطوير المقترحات وإدارة دورة الحياة الكاملة من الفكرة إلى المشروع'
      : 'Track funding opportunities, develop proposals, and manage the full lifecycle from concept to project',
    cards: {
      pipelineOpportunities: isRTL ? 'فرص خط التمويل' : 'Pipeline Opportunities',
      conceptNotesRequested: isRTL ? 'ملاحظات مفاهيم مطلوبة' : 'concept notes requested',
      activeProposals: isRTL ? 'المقترحات النشطة' : 'Active Proposals',
      submitted: isRTL ? 'مقدم' : 'submitted',
      approved: isRTL ? 'موافق عليه' : 'approved',
      totalPipelineValue: isRTL ? 'إجمالي قيمة خط التمويل' : 'Total Pipeline Value',
      submittedValue: isRTL ? 'مقدم' : 'submitted',
      successRate: isRTL ? 'معدل النجاح' : 'Success Rate',
      of: isRTL ? 'من' : 'of'
    },
    tabs: {
      pipeline: isRTL ? 'خط التمويل' : 'Pipeline',
      proposals: isRTL ? 'المقترحات وملاحظات المفاهيم' : 'Proposals & Concept Notes'
    },
    help: {
      title: isRTL ? 'كيف يعمل هذا' : 'How This Works',
      pipeline: isRTL ? 'خط التمويل' : 'Pipeline',
      pipelineDesc: isRTL ? 'تتبع فرص التمويل قبل كتابة المقترحات (قرارات المتابعة/عدم المتابعة)' : 'Track funding opportunities before writing proposals (Go/No-Go decisions)',
      proposalsLabel: isRTL ? 'المقترحات' : 'Proposals',
      proposalsDesc: isRTL ? 'تطوير مقترحات كاملة داخل النظام بنماذج منظمة' : 'Develop full proposals IN-SYSTEM with structured forms',
      workflow: isRTL ? 'سير العمل' : 'Workflow',
      workflowDesc: isRTL ? 'خط التمويل ← ملاحظة المفهوم ← المقترح الكامل ← التقديم ← الموافقة ← إنشاء المشر��ع' : 'Pipeline → Concept Note → Full Proposal → Submission → Approval → Project Creation',
      export: isRTL ? 'التصدير' : 'Export',
      exportDesc: isRTL ? 'إنشاء ملفات PDF و Word من البيانات المنظمة' : 'Generate PDF and Word documents from structured data',
      templates: isRTL ? 'القوالب' : 'Templates',
      templatesDesc: isRTL ? 'معدة مسبقاً للمنظمات الوطنية والدولية' : 'Pre-configured templates for national and international organizations'
    }
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="space-y-6 p-6">
      {/* Back Button */}
      <button
        onClick={() => setLocation('/organization/donor-crm')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
      >
        <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
        <span className="text-sm font-medium">
          {isRTL ? 'العودة إلى لوحة إدارة علاقات المانحين' : 'Back to Donor CRM Dashboard'}
        </span>
      </button>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-page-title font-bold text-gray-900">{t.title}</h1>
        <p className="text-gray-600 mt-1">
          {t.subtitle}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title={t.cards.pipelineOpportunities}
          value={stats.pipeline.total}
          subtitle={`${stats.pipeline.conceptRequested} ${t.cards.conceptNotesRequested}`}
          icon={<Lightbulb className="w-5 h-5" />}
          color="blue"
        />
        <SummaryCard
          title={t.cards.activeProposals}
          value={stats.proposals.total}
          subtitle={`${stats.proposals.submitted} ${t.cards.submitted}, ${stats.proposals.approved} ${t.cards.approved}`}
          icon={<FileText className="w-5 h-5" />}
          color="green"
        />
        <SummaryCard
          title={t.cards.totalPipelineValue}
          value={`$${(stats.financial.pipelineValue / 1000000).toFixed(1)}M`}
          subtitle={`$${(stats.financial.submittedValue / 1000000).toFixed(1)}M ${t.cards.submittedValue}`}
          icon={<DollarSign className="w-5 h-5" />}
          color="purple"
        />
        <SummaryCard
          title={t.cards.successRate}
          value={`${stats.financial.successRate}%`}
          subtitle={`${stats.proposals.approved} ${t.cards.of} ${stats.proposals.submitted + stats.proposals.approved} ${t.cards.submitted}`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="orange"
        />
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className={`flex ${isRTL ? 'flex-row-reverse' : ''}`}>

            <button
              onClick={() => setActiveTab('pipeline')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'pipeline'
                  ? 'border-primary text-primary bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Lightbulb className="w-4 h-4" />
                <span>{t.tabs.pipeline} ({stats.pipeline.total})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('proposals')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'proposals'
                  ? 'border-primary text-primary bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <FileText className="w-4 h-4" />
                <span>{t.tabs.proposals} ({stats.proposals.total})</span>
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
        <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <h4 className="font-semibold text-blue-900 mb-2">{t.help.title}</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>{t.help.pipeline}:</strong> {t.help.pipelineDesc}</li>
              <li>• <strong>{t.help.proposalsLabel}:</strong> {t.help.proposalsDesc}</li>
              <li>• <strong>{t.help.workflow}:</strong> {t.help.workflowDesc}</li>
              <li>• <strong>{t.help.export}:</strong> {t.help.exportDesc}</li>
              <li>• <strong>{t.help.templates}:</strong> {t.help.templatesDesc}</li>
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
  const { isRTL } = useLanguage();

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600'
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className={`flex items-start justify-between mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
          <div className="text-xs font-medium text-gray-600 mb-1">{title}</div>
          <div className="text-2xl font-bold text-gray-900" dir="ltr">{value}</div>
        </div>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      <p className={`text-xs text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>{subtitle}</p>
    </div>
  );
}export default ProposalPipeline;
