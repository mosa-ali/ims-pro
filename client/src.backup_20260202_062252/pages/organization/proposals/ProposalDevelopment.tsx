import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, X, Download, FileText, Eye, CheckCircle, Clock } from 'lucide-react';
import { useLanguage, formatCurrency } from '@/contexts/LanguageContext';
import { ProposalEditor } from '@/pages/organization/proposals/ProposalEditor';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';

interface Proposal {
  id: string;
  proposalTitle: string;
  donorName: string;
  callReference: string;
  proposalType: 'Concept Note' | 'Full Proposal';
  country: string;
  governorate: string;
  sector: string[];
  projectDuration: number;
  totalRequestedBudget: number;
  currency: 'USD' | 'EUR' | 'GBP';
  submissionDeadline: string;
  proposalStatus: 'Draft' | 'Under Internal Review' | 'Submitted' | 'Approved' | 'Rejected';
  completionPercentage: number;
  projectManagerName?: string;
  projectManagerEmail?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  pipelineId?: string;
}

const mockProposals: Proposal[] = [
  {
    id: '1',
    proposalTitle: 'Emergency Education Support in Conflict-Affected Areas',
    donorName: 'UNICEF',
    callReference: 'UNICEF-YEM-2024-EDU-007',
    proposalType: 'Concept Note',
    country: 'Yemen',
    governorate: 'Sana\'a',
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
    callReference: 'ECHO/YEM/BUD/2024/91001',
    proposalType: 'Full Proposal',
    country: 'Yemen',
    governorate: 'Hodeidah',
    sector: ['WASH', 'Health'],
    projectDuration: 18,
    totalRequestedBudget: 1200000,
    currency: 'EUR',
    submissionDeadline: '2024-08-15',
    proposalStatus: 'Under Internal Review',
    completionPercentage: 85,
    createdBy: 'Ahmed Ali',
    createdAt: '2024-05-10T09:00:00Z',
    updatedAt: '2024-06-18T16:00:00Z'
  },
  {
    id: '3',
    proposalTitle: 'Child Protection and Psychosocial Support',
    donorName: 'Save the Children',
    callReference: 'SC-MENA-2024-CP-003',
    proposalType: 'Full Proposal',
    country: 'Yemen',
    governorate: 'Taiz',
    sector: ['Child Protection', 'Mental Health'],
    projectDuration: 24,
    totalRequestedBudget: 800000,
    currency: 'USD',
    submissionDeadline: '2024-07-20',
    proposalStatus: 'Submitted',
    completionPercentage: 100,
    createdBy: 'Fatima Hassan',
    createdAt: '2024-04-15T11:00:00Z',
    updatedAt: '2024-06-10T10:00:00Z'
  }
];

export function ProposalDevelopment() {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  
  // Fetch real proposals from database
  const { data: proposalsData, isLoading, refetch } = trpc.proposals.getAll.useQuery(
    {
      organizationId: user?.organizationId || 0,
      operatingUnitId: user?.operatingUnitId,
      limit: 100,
      offset: 0,
    },
    {
      enabled: !!user?.organizationId,
    }
  );
  
  // Transform database records to match component interface
  const proposals = useMemo(() => {
    if (!proposalsData) return [];
    return proposalsData.map(record => ({
      id: String(record.id),
      proposalTitle: record.proposalTitle,
      donorName: record.donorName,
      callReference: record.callReference || '',
      proposalType: record.proposalType as Proposal['proposalType'],
      country: record.country || 'Yemen',
      governorate: record.governorate || '',
      sector: Array.isArray(record.sector) ? record.sector : [],
      projectDuration: record.projectDuration || 12,
      totalRequestedBudget: parseFloat(record.totalRequestedBudget?.toString() || '0'),
      currency: (record.currency || 'USD') as Proposal['currency'],
      submissionDeadline: record.submissionDeadline ? (typeof record.submissionDeadline === 'string' ? record.submissionDeadline : record.submissionDeadline.toISOString().split('T')[0]) : '',
      proposalStatus: record.proposalStatus as Proposal['proposalStatus'],
      completionPercentage: record.completionPercentage || 0,
      projectManagerName: record.projectManagerName || undefined,
      projectManagerEmail: record.projectManagerEmail || undefined,
      createdBy: record.createdBy || 'Unknown',
      createdAt: record.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: record.updatedAt?.toISOString() || new Date().toISOString(),
      pipelineId: record.pipelineId ? String(record.pipelineId) : undefined,
    }));
  }, [proposalsData]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Proposal | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Comprehensive translations
  const t = {
    title: isRTL ? 'إدارة مقترحات المشاريع وفرص التمويل' : 'Proposal & Pipeline Management',
    subtitle: isRTL ? 'تتبع فرص التمويل وتطوير المقترحات وإدارة دورة الحياة الكاملة من الفكرة إلى المشروع' : 'Track funding opportunities, develop proposals, and manage full lifecycle from idea to project',
    createNewProposal: isRTL ? 'إنشاء مقترح جديد' : 'Create New Proposal',
    proposalsFound: isRTL ? 'مقترحات موجودة' : 'proposals found',
    proposalFound: isRTL ? 'مقترح موجود' : 'proposal found',
    searchPlaceholder: isRTL ? 'البحث بالعنوان أو الجهة المانحة...' : 'Search by title or donor...',
    noProposalsFound: isRTL ? 'لم يتم العثور على مقترحات' : 'No proposals found',
    clickToGetStarted: isRTL ? 'انقر على "إنشاء مقترح جديد" للبدء' : 'Click "Create New Proposal" to get started',
    // Status translations
    all: isRTL ? 'الكل' : 'All',
    draft: isRTL ? 'مسودة' : 'Draft',
    underInternalReview: isRTL ? 'قيد المراجعة الداخلية' : 'Under Internal Review',
    submitted: isRTL ? 'مُقدم' : 'Submitted',
    approved: isRTL ? 'مُعتمد' : 'Approved',
    rejected: isRTL ? 'مرفوض' : 'Rejected',
    // Proposal types
    conceptNote: isRTL ? 'مذكرة مفاهيمية' : 'Concept Note',
    fullProposal: isRTL ? 'مقترح كامل' : 'Full Proposal',
    // Card labels
    donor: isRTL ? 'الجهة المانحة' : 'Donor',
    budget: isRTL ? 'الميزانية' : 'Budget',
    duration: isRTL ? 'المدة' : 'Duration',
    deadline: isRTL ? 'الموعد النهائي' : 'Deadline',
    location: isRTL ? 'الموقع' : 'Location',
    completion: isRTL ? 'الإنجاز' : 'Completion',
    months: isRTL ? 'أشهر' : 'months',
    createdBy: isRTL ? 'أنشأه' : 'Created by',
    updatedOn: isRTL ? 'آخر تحديث' : 'Updated',
    // Actions
    viewEdit: isRTL ? 'عرض/تعديل' : 'View/Edit',
    continueEditing: isRTL ? 'متابعة التعديل' : 'Continue Editing',
    delete: isRTL ? 'حذف' : 'Delete',
    // Modal
    proposalTitle: isRTL ? 'عنوان المقترح' : 'Proposal Title',
    donorName: isRTL ? 'اسم الجهة المانحة' : 'Donor Name',
    callReference: isRTL ? 'مرجع الإعلان' : 'Call Reference',
    proposalType: isRTL ? 'نوع المقترح' : 'Proposal Type',
    country: isRTL ? 'الدولة' : 'Country',
    governorate: isRTL ? 'المحافظة' : 'Governorate',
    sector: isRTL ? 'القطاع' : 'Sector',
    projectDuration: isRTL ? 'مدة المشروع (أشهر)' : 'Project Duration (months)',
    totalRequestedBudget: isRTL ? 'إجمالي الميزانية المطلوبة' : 'Total Requested Budget',
    currency: isRTL ? 'العملة' : 'Currency',
    submissionDeadline: isRTL ? 'الموعد النهائي للتقديم' : 'Submission Deadline',
    cancel: isRTL ? 'إلغاء' : 'Cancel',
    create: isRTL ? 'إنشاء' : 'Create',
    startWriting: isRTL ? 'بدء الكتابة' : 'Start Writing',
    deleteProposal: isRTL ? 'حذف المقترح' : 'Delete Proposal',
    // Delete confirm
    confirmDelete: isRTL ? 'تأكيد الحذف' : 'Confirm Delete',
    deleteMessage: isRTL ? 'هل أنت متأكد من حذف هذا المقترح؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this proposal? This action cannot be undone.',
    // Tabs
    proposalsAndDesigns: isRTL ? 'المقترحات وم заметات المفاهيم' : 'Proposals & Designs',
    opportunitiesPipeline: isRTL ? 'خط الفرص والمقترحات' : 'Opportunities & Pipeline'
  };
  
  const [formData, setFormData] = useState({
    proposalTitle: '',
    donorName: '',
    callReference: '',
    proposalType: 'Concept Note' as 'Concept Note' | 'Full Proposal',
    country: 'Yemen',
    governorate: '',
    sector: [] as string[],
    projectDuration: 12,
    totalRequestedBudget: 0,
    currency: 'USD' as 'USD' | 'EUR' | 'GBP',
    submissionDeadline: '',
    projectManagerName: '',
    projectManagerEmail: ''
  });

  const statuses = ['All', 'Draft', 'Under Internal Review', 'Submitted', 'Approved', 'Rejected'];
  const sectors = ['Education in Emergencies', 'WASH', 'Health', 'Protection', 'Child Protection', 'Livelihoods', 'Food Security', 'Nutrition'];
  
  // Helper to get translated status
  const getTranslatedStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'All': t.all,
      'Draft': t.draft,
      'Under Internal Review': t.underInternalReview,
      'Submitted': t.submitted,
      'Approved': t.approved,
      'Rejected': t.rejected
    };
    return statusMap[status] || status;
  };

  // Filter proposals
  const filteredProposals = proposals.filter(prop => {
    const matchesSearch = prop.proposalTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          prop.donorName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || prop.proposalStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Handlers
  const handleCreate = () => {
    const newProposal: Proposal = {
      id: `prop-${Date.now()}`,
      ...formData,
      proposalStatus: 'Draft',
      completionPercentage: 0,
      createdBy: 'Current User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setProposals([...proposals, newProposal]);
    setShowCreateModal(false);
    resetForm();
    
    // Open the proposal editor for the new proposal
    setSelectedProposal(newProposal);
  };

  const handleDelete = () => {
    if (!showDeleteConfirm) return;

    setProposals(proposals.filter(prop => prop.id !== showDeleteConfirm.id));
    setShowDeleteConfirm(null);
    alert('Proposal deleted successfully!');
  };

  const handleOpenEditor = (proposal: Proposal) => {
    setSelectedProposal(proposal);
  };

  const handleCloseEditor = () => {
    setSelectedProposal(null);
  };

  const resetForm = () => {
    setFormData({
      proposalTitle: '',
      donorName: '',
      callReference: '',
      proposalType: 'Concept Note',
      country: 'Yemen',
      governorate: '',
      sector: [],
      projectDuration: 12,
      totalRequestedBudget: 0,
      currency: 'USD',
      submissionDeadline: ''
    });
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      'Draft': 'bg-gray-100 text-gray-700',
      'Under Internal Review': 'bg-blue-100 text-blue-700',
      'Submitted': 'bg-purple-100 text-purple-700',
      'Approved': 'bg-green-100 text-green-700',
      'Rejected': 'bg-red-100 text-red-700'
    };
    return badges[status] || 'bg-gray-100 text-gray-700';
  };

  // If a proposal is selected, show the editor
  if (selectedProposal) {
    return <ProposalEditor proposal={selectedProposal} onClose={handleCloseEditor} />;
  }

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
          {filteredProposals.length} {filteredProposals.length !== 1 ? t.proposalsFound : t.proposalFound}
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className={`px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <Plus className="w-4 h-4" />
          {t.createNewProposal}
        </button>
      </div>

      {/* Filters */}
      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <input
          type="text"
          placeholder={t.searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`flex-1 px-3 py-2 border border-gray-300 rounded-md ${isRTL ? 'text-right' : 'text-left'}`}
        />
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {statuses.map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                filterStatus === status
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              {getTranslatedStatus(status)}
            </button>
          ))}
        </div>
      </div>

      {/* Proposals Grid */}
      <div className={`flex flex-wrap gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {filteredProposals.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="font-medium">{t.noProposalsFound}</p>
            <p className="text-sm mt-1">{t.clickToGetStarted}</p>
          </div>
        ) : (
          filteredProposals.map(proposal => (
            <div
              key={proposal.id}
              className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow w-full md:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)]"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2" dir="auto">
                    {proposal.proposalTitle}
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      proposal.proposalType === 'Concept Note' 
                        ? 'bg-teal-100 text-teal-700' 
                        : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {proposal.proposalType === 'Concept Note' ? t.conceptNote : t.fullProposal}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(proposal.proposalStatus)}`}>
                      {getTranslatedStatus(proposal.proposalStatus)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 text-xs text-gray-600 mb-4">
                <div className="flex items-center justify-between">
                  <span>{t.donor}:</span>
                  <span className="font-medium text-gray-900" dir="auto">{proposal.donorName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t.budget}:</span>
                  <span className="font-medium text-gray-900" dir="ltr">
                    {formatCurrency(proposal.totalRequestedBudget, proposal.currency, 'en')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t.duration}:</span>
                  <span className="font-medium text-gray-900">{proposal.projectDuration} {t.months}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t.deadline}:</span>
                  <span className="font-medium text-gray-900" dir="ltr">{proposal.submissionDeadline}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t.location}:</span>
                  <span className="font-medium text-gray-900" dir="auto">{proposal.governorate}, {proposal.country}</span>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>{t.completion}</span>
                  <span className="font-medium">{proposal.completionPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      proposal.completionPercentage === 100 ? 'bg-green-500' :
                      proposal.completionPercentage >= 70 ? 'bg-blue-500' :
                      proposal.completionPercentage >= 40 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${proposal.completionPercentage}%` }}
                  />
                </div>
              </div>

              {/* Metadata */}
              <div className="text-xs text-gray-500 border-t border-gray-200 pt-3 mb-3">
                <div>{t.createdBy}: {proposal.createdBy}</div>
                <div dir="ltr">{t.updatedOn}: {new Date(proposal.updatedAt).toLocaleDateString()}</div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEditor(proposal)}
                  className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  {proposal.proposalStatus === 'Draft' ? t.continueEditing : t.viewEdit}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(proposal)}
                  className="px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{t.createNewProposal}</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.proposalTitle}*</label>
                  <input
                    type="text"
                    required
                    value={formData.proposalTitle}
                    onChange={(e) => setFormData({ ...formData, proposalTitle: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="e.g., Emergency Education Support Program"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.donorName}*</label>
                    <input
                      type="text"
                      required
                      value={formData.donorName}
                      onChange={(e) => setFormData({ ...formData, donorName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.callReference}</label>
                    <input
                      type="text"
                      value={formData.callReference}
                      onChange={(e) => setFormData({ ...formData, callReference: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.proposalType}*</label>
                    <select
                      value={formData.proposalType}
                      onChange={(e) => setFormData({ ...formData, proposalType: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="Concept Note">{t.conceptNote}</option>
                      <option value="Full Proposal">{t.fullProposal}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.submissionDeadline}</label>
                    <input
                      type="date"
                      value={formData.submissionDeadline}
                      onChange={(e) => setFormData({ ...formData, submissionDeadline: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.country}</label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.governorate}</label>
                    <input
                      type="text"
                      value={formData.governorate}
                      onChange={(e) => setFormData({ ...formData, governorate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Manager Name</label>
                    <input
                      type="text"
                      value={formData.projectManagerName}
                      onChange={(e) => setFormData({ ...formData, projectManagerName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Manager Email</label>
                    <input
                      type="email"
                      value={formData.projectManagerEmail}
                      onChange={(e) => setFormData({ ...formData, projectManagerEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="john.doe@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.sector}*</label>
                  <div className="grid grid-cols-3 gap-2">
                    {sectors.map(sector => (
                      <label key={sector} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.sector.includes(sector)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, sector: [...formData.sector, sector] });
                            } else {
                              setFormData({ ...formData, sector: formData.sector.filter(s => s !== sector) });
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">{sector}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.projectDuration}*</label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={formData.projectDuration}
                      onChange={(e) => setFormData({ ...formData, projectDuration: parseInt(e.target.value) || 12 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.totalRequestedBudget}*</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={formData.totalRequestedBudget}
                      onChange={(e) => setFormData({ ...formData, totalRequestedBudget: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.currency}*</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={handleCreate}
                    className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90"
                  >
                    {t.create} & {t.startWriting}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.confirmDelete}</h3>
            <p className="text-sm text-gray-600 mb-6">
              {t.deleteMessage}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                {t.deleteProposal}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}