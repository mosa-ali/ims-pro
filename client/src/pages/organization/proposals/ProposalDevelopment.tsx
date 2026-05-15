import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, X, Download, FileText, Eye, CheckCircle, Clock } from 'lucide-react';
import { useLanguage, formatCurrency } from '@/contexts/LanguageContext';
import { ProposalEditor } from '@/pages/organization/proposals/ProposalEditor';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { useTranslation } from '@/i18n/useTranslation';
import { toast } from 'sonner';

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

// Mock data removed - using real database data via tRPC

export function ProposalDevelopment() {
 const { t } = useTranslation();
 const { isRTL } = useLanguage();
 const { user } = useAuth();
 
 // Fetch real proposals from database (scoped to current organization/operating unit)
 const { data: proposalsData, isLoading, refetch } = trpc.proposals.getAll.useQuery(
 {},
 {
 enabled: !!user?.organizationId,
 }
 );
 
 // Transform database records to match component interface
 const proposals = useMemo(() => {
 if (!proposalsData) return [];
 return proposalsData.map((record: any) => ({
 id: String(record.id),
 proposalTitle: record.proposalTitle || '',
 donorName: record.donorName || '',
 callReference: record.callReference || '',
 proposalType: (record.proposalType || 'Concept Note') as Proposal['proposalType'],
 country: record.country || 'Yemen',
 governorate: record.governorate || '',
 sector: Array.isArray(record.sectors) ? record.sectors : [],
 projectDuration: record.projectDuration || 12,
 totalRequestedBudget: typeof record.totalRequestedBudget === 'string' ? parseFloat(record.totalRequestedBudget) : (record.totalRequestedBudget || 0),
 currency: (record.currency || 'USD') as Proposal['currency'],
 submissionDeadline: record.submissionDeadline ? (typeof record.submissionDeadline === 'string' ? record.submissionDeadline : record.submissionDeadline.toISOString().split('T')[0]) : '',
 proposalStatus: (record.proposalStatus || 'Draft') as Proposal['proposalStatus'],
 completionPercentage: record.completionPercentage || 0,
 projectManagerName: record.leadWriter || undefined,
 projectManagerEmail: record.projectManagerEmail || undefined,
 createdBy: record.createdBy ? String(record.createdBy) : 'Unknown',
 createdAt: typeof record.createdAt === 'string' ? record.createdAt : (record.createdAt?.toISOString() || new Date().toISOString()),
 updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : (record.updatedAt?.toISOString() || new Date().toISOString()),
 pipelineId: record.pipelineOpportunityId ? String(record.pipelineOpportunityId) : undefined,
 }));
 }, [proposalsData]);
 const [showCreateModal, setShowCreateModal] = useState(false);
 const [showDeleteConfirm, setShowDeleteConfirm] = useState<Proposal | null>(null);
 const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
 const [filterStatus, setFilterStatus] = useState<string>('All');
 const [searchTerm, setSearchTerm] = useState('');
 
 // Comprehensive translations
 const labels = {
 title: t.proposals.proposalPipelineManagement,
 subtitle: t.proposals.trackFundingOpportunitiesDevelopProposalsAnd,
 createNewProposal: t.proposals.createNewProposal,
 proposalsFound: t.proposals.proposalsFound,
 proposalFound: t.proposals.proposalFound,
 searchPlaceholder: t.proposals.searchByTitleOrDonor,
 noProposalsFound: t.proposals.noProposalsFound,
 clickToGetStarted: t.proposals.clickCreateNewProposalToGet,
 // Status translations
 all: t.proposals.all,
 draft: t.proposals.draft,
 underInternalReview: t.proposals.underInternalReview,
 submitted: t.proposals.submitted,
 approved: t.proposals.approved,
 rejected: t.proposals.rejected,
 // Proposal types
 conceptNote: t.proposals.conceptNote,
 fullProposal: t.proposals.fullProposal,
 // Card labels
 donor: t.proposals.donor7,
 budget: t.proposals.budget,
 duration: t.proposals.duration,
 deadline: t.proposals.deadline,
 location: t.proposals.location,
 completion: t.proposals.completion,
 months: t.proposals.months,
 createdBy: t.proposals.createdBy,
 updatedOn: t.proposals.updated,
 // Actions
 viewEdit: t.proposals.viewedit,
 continueEditing: t.proposals.continueEditing,
 delete: t.proposals.delete,
 // Modal
 proposalTitle: t.proposals.proposalTitle,
 donorName: t.proposals.donorName8,
 callReference: t.proposals.callReference,
 proposalType: t.proposals.proposalType,
 country: t.proposals.country,
 governorate: t.proposals.governorate,
 sector: t.proposals.sector,
 projectDuration: t.proposals.projectDurationMonths,
 totalRequestedBudget: t.proposals.totalRequestedBudget,
 currency: t.proposals.currency,
 submissionDeadline: t.proposals.submissionDeadline,
 cancel: t.proposals.cancel,
 create: t.proposals.create,
 startWriting: t.proposals.startWriting,
 deleteProposal: t.proposals.deleteProposal,
 // Delete confirm
 confirmDelete: t.proposals.confirmDelete,
 deleteMessage: t.proposals.areYouSureYouWantTo9,
 // Tabs
 proposalsAndDesigns: t.proposals.proposalsDesigns,
 opportunitiesPipeline: t.proposals.opportunitiesPipeline
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
 totalRequestedBudget: '0',
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
 'All': labels.all,
 'Draft': labels.draft,
 'Under Internal Review': labels.underInternalReview,
 'Submitted': labels.submitted,
 'Approved': labels.approved,
 'Rejected': labels.rejected
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

 // tRPC mutation for creating proposal
 const createProposalMutation = trpc.proposals.create.useMutation({
 onSuccess: (data) => {
 toast.success('Proposal created successfully!');
 setShowCreateModal(false);
 resetForm();
 refetch();
 // Open the proposal editor for the new proposal
 setSelectedProposal({
 id: String(data.id),
 proposalTitle: formData.proposalTitle,
 donorName: formData.donorName,
 callReference: formData.callReference,
 proposalType: formData.proposalType,
 country: formData.country,
 governorate: formData.governorate,
 sector: formData.sector,
 projectDuration: formData.projectDuration,
 totalRequestedBudget: typeof formData.totalRequestedBudget === 'string' ? parseFloat(formData.totalRequestedBudget) : formData.totalRequestedBudget,
 currency: formData.currency,
 submissionDeadline: formData.submissionDeadline,
 proposalStatus: 'Draft',
 completionPercentage: 0,
 projectManagerName: formData.projectManagerName,
 projectManagerEmail: formData.projectManagerEmail,
 createdBy: String(user?.id || 'Unknown'),
 createdAt: new Date().toISOString(),
 updatedAt: new Date().toISOString()
 });
 },
 onError: (error) => {
 toast.error(`Failed to create proposal: ${error.message}`);
 },
 });

 // Handlers
 const handleCreate = async () => {
 // Validate required fields
 if (!formData.proposalTitle || !formData.donorName || formData.sector.length === 0) {
 toast.error('Please fill in all required fields');
 return;
 }

 // Call mutation with form data
 await createProposalMutation.mutateAsync({
 proposalTitle: formData.proposalTitle,
 donorName: formData.donorName,
 callReference: formData.callReference,
 proposalType: formData.proposalType,
 country: formData.country,
 governorate: formData.governorate,
 sectors: formData.sector,
 projectDuration: formData.projectDuration,
 totalRequestedBudget: formData.totalRequestedBudget,
 currency: formData.currency,
 submissionDeadline: formData.submissionDeadline,
 });
 };

 const handleDelete = () => {
 if (!showDeleteConfirm) return;

 // TODO: Implement delete mutation
 setShowDeleteConfirm(null);
 toast.success('Proposal deleted successfully!');
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
 totalRequestedBudget: '0',
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
 <div className={`flex items-center justify-between`}>
 <div className={`text-sm text-gray-600 text-start`}>
 {filteredProposals.length} {filteredProposals.length !== 1 ? labels.proposalsFound : labels.proposalFound}
 </div>
 <button
 onClick={() => setShowCreateModal(true)}
 className={`px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2`}
 >
 <Plus className="w-4 h-4" />
 {labels.createNewProposal}
 </button>
 </div>

 {/* Filters */}
 <div className={`flex items-center gap-4`}>
 <input
 type="text"
 placeholder={labels.searchPlaceholder}
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className={`flex-1 px-3 py-2 border border-gray-300 rounded-md text-start`}
 />
 <div className={`flex items-center gap-2`}>
 {statuses.map(status => (
 <button
 key={status}
 onClick={() => setFilterStatus(status)}
 className={`px-3 py-1.5 text-xs rounded-md transition-colors ${ filterStatus === status ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300' }`}
 >
 {getTranslatedStatus(status)}
 </button>
 ))}
 </div>
 </div>

 {/* Proposals Grid */}
 <div className={`flex flex-wrap gap-4`}>
 {filteredProposals.length === 0 ? (
 <div className="col-span-full text-center py-12 text-gray-500">
 <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
 <p className="font-medium">{labels.noProposalsFound}</p>
 <p className="text-sm mt-1">{labels.clickToGetStarted}</p>
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
 <span className={`px-2 py-1 text-xs font-medium rounded-full ${ proposal.proposalType === 'Concept Note' ? 'bg-teal-100 text-teal-700' : 'bg-indigo-100 text-indigo-700' }`}>
 {proposal.proposalType === 'Concept Note' ? labels.conceptNote : labels.fullProposal}
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
 <span>{labels.donor}:</span>
 <span className="font-medium text-gray-900" dir="auto">{proposal.donorName}</span>
 </div>
 <div className="flex items-center justify-between">
 <span>{labels.budget}:</span>
 <span className="ltr-safe font-medium text-gray-900">
 {formatCurrency(proposal.totalRequestedBudget, proposal.currency, 'en')}
 </span>
 </div>
 <div className="flex items-center justify-between">
 <span>{labels.duration}:</span>
 <span className="font-medium text-gray-900">{proposal.projectDuration} {labels.months}</span>
 </div>
 <div className="flex items-center justify-between">
 <span>{labels.deadline}:</span>
 <span className="ltr-safe font-medium text-gray-900">{proposal.submissionDeadline}</span>
 </div>
 <div className="flex items-center justify-between">
 <span>{labels.location}:</span>
 <span className="font-medium text-gray-900" dir="auto">{proposal.governorate}, {proposal.country}</span>
 </div>
 </div>

 {/* Progress */}
 <div className="mb-4">
 <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
 <span>{labels.completion}</span>
 <span className="font-medium">{proposal.completionPercentage}%</span>
 </div>
 <div className="w-full bg-gray-200 rounded-full h-2">
 <div
 className={`h-2 rounded-full transition-all ${ proposal.completionPercentage === 100 ? 'bg-green-500' : proposal.completionPercentage >= 70 ? 'bg-blue-500' : proposal.completionPercentage >= 40 ? 'bg-yellow-500' : 'bg-red-500' }`}
 style={{ width: `${proposal.completionPercentage}%` }}
 />
 </div>
 </div>

 {/* Metadata */}
 <div className="text-xs text-gray-500 border-t border-gray-200 pt-3 mb-3">
 <div>{labels.createdBy}: {proposal.createdBy}</div>
 <div className="ltr-safe">{labels.updatedOn}: {new Date(proposal.updatedAt).toLocaleDateString()}</div>
 </div>

 {/* Actions */}
 <div className="flex items-center gap-2">
 <button
 onClick={() => handleOpenEditor(proposal)}
 className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-1"
 >
 <Edit2 className="w-3 h-3" />
 {proposal.proposalStatus === 'Draft' ? labels.continueEditing : labels.viewEdit}
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
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
 <div className="flex items-center justify-between p-6 border-b border-gray-200">
 <h3 className="text-lg font-semibold text-gray-900">{labels.createNewProposal}</h3>
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
 <label className="block text-sm font-medium text-gray-700 mb-1">{labels.proposalTitle}*</label>
 <input
 type="text"
 required
 value={formData.proposalTitle}
 onChange={(e) => setFormData({ ...formData, proposalTitle: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 placeholder={t.placeholders.eGEmergencyEducationSupportProgram}
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{labels.donorName}*</label>
 <input
 type="text"
 required
 value={formData.donorName}
 onChange={(e) => setFormData({ ...formData, donorName: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{labels.callReference}</label>
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
 <label className="block text-sm font-medium text-gray-700 mb-1">{labels.proposalType}*</label>
 <select
 value={formData.proposalType}
 onChange={(e) => setFormData({ ...formData, proposalType: e.target.value as any })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 >
 <option value="Concept Note">{labels.conceptNote}</option>
 <option value="Full Proposal">{labels.fullProposal}</option>
 </select>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{labels.submissionDeadline}</label>
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
 <label className="block text-sm font-medium text-gray-700 mb-1">{labels.country}</label>
 <input
 type="text"
 value={formData.country}
 onChange={(e) => setFormData({ ...formData, country: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{labels.governorate}</label>
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
 placeholder={t.placeholders.johnDoe}
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Project Manager Email</label>
 <input
 type="email"
 value={formData.projectManagerEmail}
 onChange={(e) => setFormData({ ...formData, projectManagerEmail: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 placeholder={t.placeholders.johnDoeExampleCom}
 />
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{labels.sector}*</label>
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
 <label className="block text-sm font-medium text-gray-700 mb-1">{labels.projectDuration}*</label>
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
 <label className="block text-sm font-medium text-gray-700 mb-1">{labels.totalRequestedBudget}*</label>
 <input
 type="number"
 min="0"
 step="1000"
 value={formData.totalRequestedBudget}
 onChange={(e) => setFormData({ ...formData, totalRequestedBudget: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{labels.currency}*</label>
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
 {labels.cancel}
 </button>
 <button
 type="button"
 onClick={handleCreate}
 disabled={createProposalMutation.isPending}
 className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {createProposalMutation.isPending ? 'Creating...' : `${labels.create} & ${labels.startWriting}`}
 </button>
 </div>
 </form>
 </div>
 </div>
 </div>
 )}

 {/* Delete Confirmation */}
 {showDeleteConfirm && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg max-w-md w-full p-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-4">{labels.confirmDelete}</h3>
 <p className="text-sm text-gray-600 mb-6">
 {labels.deleteMessage}
 </p>
 <div className="flex items-center justify-end gap-2">
 <button
 onClick={() => setShowDeleteConfirm(null)}
 className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
 >
 {labels.cancel}
 </button>
 <button
 onClick={handleDelete}
 className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
 >
 {labels.deleteProposal}
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}