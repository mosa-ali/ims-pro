import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, X, ExternalLink, AlertTriangle, Send, Archive, Loader2, Search, Download, RefreshCw, Upload } from 'lucide-react';
import { useLocation } from 'wouter';
import { useLanguage, formatCurrency } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';
import { useTranslation } from '@/i18n/useTranslation';
import { useAuth } from '@/_core/hooks/useAuth';
import { BackButton } from "@/components/BackButton";
import { exportOpportunities } from '@/utils/exportOpportunities';
import { ImportOpportunitiesModal } from '@/components/donor-crm/ImportOpportunitiesModal';

interface Opportunity {
 id: string;
 donorName: string;
 donorType: 'UN' | 'EU' | 'INGO' | 'Foundation' | 'Government' | 'Other';
 cfpLink?: string;
 interestArea: string[];
 geographicAreas: string;
 applicationDeadline: string;
 allocatedBudget?: number;
 currency: string;
 isCoFunding: boolean;
 applicationLink?: string;
 projectManagerName?: string;
 projectManagerEmail?: string;
 notes?: string;
}

type DeadlineStatus = 'open' | 'closing-soon' | 'urgent' | 'closed';

export default function Opportunities() {
 const { t } = useTranslation();
 const { isRTL } = useLanguage();
 const [, setLocation] = useLocation();
 const { currentOrganizationId } = useOrganization();
 const { currentOperatingUnitId } = useOperatingUnit();
 const { user } = useAuth();
 
 // Fetch real opportunities from database
 const { data: opportunitiesData, isLoading, refetch } = trpc.proposals.getAllFundingOpportunities.useQuery(
 {
 organizationId: currentOrganizationId!,
 operatingUnitId: currentOperatingUnitId!,
 limit: 100,
 offset: 0,
 },
 {
 enabled: !!currentOrganizationId,
 }
 );
 
 const [showAddModal, setShowAddModal] = useState(false);
 const [showEditModal, setShowEditModal] = useState(false);
 const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
 const [showDeleteConfirm, setShowDeleteConfirm] = useState<Opportunity | null>(null);
 const [showSendToPipeline, setShowSendToPipeline] = useState<Opportunity | null>(null);
 const [isSending, setIsSending] = useState(false);
 const [searchTerm, setSearchTerm] = useState('');
 const [filterType, setFilterType] = useState('All');
 const [filterStatus, setFilterStatus] = useState('All');
 const [showImportModal, setShowImportModal] = useState(false);

 const [formData, setFormData] = useState({
 donorName: '',
 donorType: 'UN' as Opportunity['donorType'],
 cfpLink: '',
 interestArea: [] as string[],
 geographicAreas: '',
 applicationDeadline: '',
 allocatedBudget: '',
 currency: 'USD',
 isCoFunding: false,
 applicationLink: '',
 projectManagerName: '',
 projectManagerEmail: '',
 notes: ''
 });

 const labels = {
 title: t.donorCRM.fundingOpportunities,
 subtitle: t.donorCRM.trackFundingCallsAndOpportunitiesBefore,
 addOpportunity: t.donorCRM.addOpportunity,
 donor: t.donorCRM.donor,
 interestArea: t.donorCRM.interestArea,
 geographicAreas: t.donorCRM.geographicAreas,
 deadline: t.donorCRM.deadline,
 budget: t.donorCRM.budget,
 coFunding: t.donorCRM.cofunding,
 yes: t.donorCRM.yes,
 no: t.donorCRM.no,
 edit: t.donorCRM.edit,
 delete: t.donorCRM.delete,
 archive: t.donorCRM.archive,
 sendToPipeline: t.donorCRM.sendToPipeline,
 cancel: t.donorCRM.cancel,
 save: t.donorCRM.save,
 addNew: t.donorCRM.addNewOpportunity,
 editOpportunity: t.donorCRM.editOpportunity,
 deleteConfirm: t.donorCRM.areYouSureYouWantTo,
 notes: t.donorCRM.notes,
 required: t.donorCRM.required,
 cfpLink: t.donorCRM.cfpLink,
 applicationLink: t.donorCRM.applicationLink,
 donorType: t.donorCRM.donorType,
 status: {
 open: t.donorCRM.open,
 closingSoon: t.donorCRM.closingSoon,
 urgent: t.donorCRM.urgent,
 closed: t.donorCRM.closed
 },
 sendToPipelineTitle: t.donorCRM.sendToPipeline,
 sendToPipelineDesc: t.donorCRM.aNewPipelineOpportunityWillBe,
 confirm: t.donorCRM.confirm,
 totalOpportunities: t.donorCRM.totalOpportunities || 'Total Opportunities',
 activeOpportunities: t.donorCRM.activeOpportunities || 'Active Opportunities',
 expiringOpportunities: t.donorCRM.expiringOpportunities || 'Expiring Soon (7 days)',
 opportunityTypes: t.donorCRM.opportunityTypes || 'Opportunity Types',
 search: t.donorCRM.searchOpportunities || 'Search opportunities...',
 allTypes: t.donorCRM.allTypes || 'All Types',
 allStatus: t.donorCRM.allStatus || 'All Status',
 export: t.donorCRM.export || 'Export',
 import: t.donorCRM.import || 'Import',
 refresh: t.common.refresh,
 noOpportunities: t.donorCRM.noFundingOpportunitiesFound
 };

 const interestAreas = ['Education in Emergencies', 'WASH', 'Health', 'Protection', 'Child Protection', 'Livelihoods', 'Food Security', 'Nutrition', 'Shelter'];
 const donorTypes = ['UN', 'EU', 'INGO', 'Foundation', 'Government', 'Other'];

 // Calculate deadline status
 const getDeadlineStatus = (deadline: string): DeadlineStatus => {
 const today = new Date();
 const deadlineDate = new Date(deadline);
 const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

 if (daysUntilDeadline < 0) return 'closed';
 if (daysUntilDeadline <= 7) return 'urgent';
 if (daysUntilDeadline <= 14) return 'closing-soon';
 return 'open';
 };

 // Get status badge
 const getStatusBadge = (status: DeadlineStatus) => {
 const badges = {
 'open': { label: t.status?.open || 'Open', className: 'bg-green-100 text-green-700' },
 'closing-soon': { label: t.status?.closingSoon || 'Closing Soon', className: 'bg-yellow-100 text-yellow-700' },
 'urgent': { label: t.status?.urgent || 'Urgent', className: 'bg-red-100 text-red-700' },
 'closed': { label: t.status?.closed || 'Closed', className: 'bg-gray-100 text-gray-500' }
 };
 return badges[status];
 };

 // Get donor type badge color
 const getDonorTypeBadge = (type: Opportunity['donorType']) => {
 const badges = {
 'UN': 'bg-blue-100 text-blue-700',
 'EU': 'bg-purple-100 text-purple-700',
 'INGO': 'bg-teal-100 text-teal-700',
 'Foundation': 'bg-pink-100 text-pink-700',
 'Government': 'bg-indigo-100 text-indigo-700',
 'Other': 'bg-gray-100 text-gray-700'
 };
 return badges[type];
 };

 // Transform data for display
 const opportunities: Opportunity[] = useMemo(() => {
 if (!opportunitiesData) return [];
 return opportunitiesData.map((opp: any) => ({
 id: String(opp.id),
 donorName: opp.donorName || '',
 donorType: opp.donorType || 'Other',
 cfpLink: opp.cfpLink,
 interestArea: Array.isArray(opp.interestArea) ? opp.interestArea : [],
 geographicAreas: opp.geographicAreas || '',
 applicationDeadline: opp.applicationDeadline ? (typeof opp.applicationDeadline === 'string' ? opp.applicationDeadline : opp.applicationDeadline.toISOString().split('T')[0]) : '',
 allocatedBudget: opp.allocatedBudget ? parseFloat(opp.allocatedBudget.toString()) : undefined,
 currency: opp.currency || 'USD',
 isCoFunding: opp.isCoFunding || false,
 applicationLink: opp.applicationLink,
 projectManagerName: opp.projectManagerName,
 projectManagerEmail: opp.projectManagerEmail,
 notes: opp.notes
 }));
 }, [opportunitiesData]);

 // Filter opportunities
 const filteredOpportunities = useMemo(() => {
 return opportunities.filter(opp => {
 const typeMatch = filterType === 'All' || opp.donorType === filterType;
 const statusMatch = filterStatus === 'All' || getDeadlineStatus(opp.applicationDeadline) === filterStatus.toLowerCase().replace(' ', '-');
 const searchMatch = opp.donorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
 opp.geographicAreas.toLowerCase().includes(searchTerm.toLowerCase()) ||
 opp.interestArea.some(area => area.toLowerCase().includes(searchTerm.toLowerCase()));
 return typeMatch && statusMatch && searchMatch;
 });
 }, [opportunities, filterType, filterStatus, searchTerm]);

 // Calculate KPI values
 const kpiValues = useMemo(() => {
 const total = opportunities.length;
 const active = opportunities.filter(opp => getDeadlineStatus(opp.applicationDeadline) !== 'closed').length;
 const expiringIn7Days = opportunities.filter(opp => getDeadlineStatus(opp.applicationDeadline) === 'urgent').length;
 const types = new Set(opportunities.map(opp => opp.donorType)).size;

 return { total, active, expiringIn7Days, types };
 }, [opportunities]);

 // tRPC mutation for transitioning to Pipeline
 const utils = trpc.useUtils();
 const transitionMutation = trpc.proposals.transitionToPipeline.useMutation({
 onSuccess: async () => {
 toast.success(t.donorCRM.opportunitySentToPipelineSuccessfully);
 setShowSendToPipeline(null);
 setIsSending(false);
 await utils.proposals.getAllFundingOpportunities.invalidate();
 await utils.proposals.getAllPipelineOpportunities.invalidate();
 await utils.proposals.getPipelineKPIs.invalidate();
 await utils.proposals.getDonorCRMKPIs.invalidate();
 },
 onError: (error) => {
 toast.error(error.message || t.donorCRM.failedToSendOpportunityToPipeline);
 setIsSending(false);
 },
 });

 const handleSendToPipeline = async (opportunity: Opportunity) => {
 if (!user?.organizationId) {
 toast.error(t.donorCRM.organizationInformationNotFound);
 return;
 }

 setIsSending(true);
 
 try {
 await transitionMutation.mutateAsync({
 opportunityId: parseInt(opportunity.id),
 organizationId: user.organizationId,
 operatingUnitId: user.operatingUnitId,
 stage: 'Identified',
 });
 } catch (error) {
 // Error handled in onError callback
 }
 };

 const handleAdd = () => {
 const newOpportunity: Opportunity = {
 id: String(opportunities.length + 1),
 donorName: formData.donorName,
 donorType: formData.donorType,
 cfpLink: formData.cfpLink || undefined,
 interestArea: formData.interestArea,
 geographicAreas: formData.geographicAreas,
 applicationDeadline: formData.applicationDeadline,
 allocatedBudget: formData.allocatedBudget ? parseFloat(formData.allocatedBudget) : undefined,
 currency: formData.currency,
 isCoFunding: formData.isCoFunding,
 applicationLink: formData.applicationLink || undefined,
 notes: formData.notes || undefined
 };
 setShowAddModal(false);
 resetForm();
 };

 const handleEdit = () => {
 if (!editingOpportunity) return;
 setShowEditModal(false);
 setEditingOpportunity(null);
 resetForm();
 };

 const handleDelete = (opportunity: Opportunity) => {
 setShowDeleteConfirm(null);
 };

 const openEditModal = (opportunity: Opportunity) => {
 setEditingOpportunity(opportunity);
 setFormData({
 donorName: opportunity.donorName,
 donorType: opportunity.donorType,
 cfpLink: opportunity.cfpLink || '',
 interestArea: opportunity.interestArea,
 geographicAreas: opportunity.geographicAreas,
 applicationDeadline: opportunity.applicationDeadline,
 allocatedBudget: opportunity.allocatedBudget?.toString() || '',
 currency: opportunity.currency,
 isCoFunding: opportunity.isCoFunding,
 applicationLink: opportunity.applicationLink || '',
 projectManagerName: opportunity.projectManagerName || '',
 projectManagerEmail: opportunity.projectManagerEmail || '',
 notes: opportunity.notes || ''
 });
 setShowEditModal(true);
 };

 const resetForm = () => {
 setFormData({
 donorName: '',
 donorType: 'UN',
 cfpLink: '',
 interestArea: [],
 geographicAreas: '',
 applicationDeadline: '',
 allocatedBudget: '',
 currency: 'USD',
 isCoFunding: false,
 applicationLink: '',
 projectManagerName: '',
 projectManagerEmail: '',
 notes: ''
 });
 };

 const toggleInterestArea = (area: string) => {
 if (formData.interestArea.includes(area)) {
 setFormData({ ...formData, interestArea: formData.interestArea.filter(a => a !== area) });
 } else {
 setFormData({ ...formData, interestArea: [...formData.interestArea, area] });
 }
 };

 // Export opportunities
 const handleExport = async (format: 'excel' | 'csv' = 'excel') => {
 try {
 const filteredOpps = filteredOpportunities.map(opp => ({
 id: opp.id,
 donorName: opp.donorName,
 donorType: opp.donorType || 'Other',
 cfpLink: opp.cfpLink,
 interestArea: opp.interestArea,
 geographicAreas: opp.geographicAreas,
 applicationDeadline: opp.applicationDeadline,
 allocatedBudget: opp.allocatedBudget,
 currency: opp.currency,
 isCoFunding: opp.isCoFunding,
 applicationLink: opp.applicationLink,
 projectManagerName: opp.projectManagerName,
 projectManagerEmail: opp.projectManagerEmail,
 notes: opp.notes,
 }));

 await exportOpportunities(filteredOpps, format, isRTL ? 'ar' : 'en');
 toast.success(`${filteredOpps.length} opportunities exported successfully`);
 } catch (error) {
 toast.error('Failed to export opportunities');
 }
 };

 // Import opportunities
 const bulkImportMutation = trpc.proposals.bulkImportFundingOpportunities.useMutation();

 const handleImport = async (opportunities: any[]) => {
 try {
 const result = await bulkImportMutation.mutateAsync({
 opportunities: opportunities.map(opp => ({
 donorName: opp.donorName,
 donorType: opp.donorType,
 cfpLink: opp.cfpLink,
 interestArea: opp.interestArea,
 geographicAreas: opp.geographicAreas,
 applicationDeadline: opp.applicationDeadline,
 allocatedBudget: opp.allocatedBudget,
 currency: opp.currency,
 isCoFunding: opp.isCoFunding,
 applicationLink: opp.applicationLink,
 projectManagerName: opp.projectManagerName,
 projectManagerEmail: opp.projectManagerEmail,
 notes: opp.notes,
 })),
 });

 if (result.success > 0) {
 toast.success(`${result.success} opportunities imported successfully`);
 }
 if (result.failed > 0) {
 toast.error(`${result.failed} opportunities failed to import`);
 }
 refetch();
 } catch (error) {
 toast.error('Failed to import opportunities');
 }
 };

 return (
 <div className="space-y-6 p-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Back Button */}
 <BackButton onClick={() => setLocation('/organization/donor-crm')} label={t.donorCRM.backToDonorCrmDashboard} />

 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-3xl font-bold text-gray-900">{labels.title}</h2>
 <p className="text-gray-600 mt-1">{labels.subtitle}</p>
 </div>
 <Button
 onClick={() => setShowAddModal(true)}
 className="bg-primary text-white hover:bg-primary/90"
 >
 <Plus className="w-4 h-4 me-2" />
 {labels.addOpportunity}
 </Button>
 </div>

 {/* KPI Cards */}
 {!isLoading && (
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <Card className="p-4">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-muted-foreground text-sm">{labels.totalOpportunities}</p>
 <p className="text-2xl font-bold mt-1">{kpiValues.total}</p>
 </div>
 <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
 <span className="text-blue-600 text-lg">📋</span>
 </div>
 </div>
 </Card>

 <Card className="p-4">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-muted-foreground text-sm">{labels.activeOpportunities}</p>
 <p className="text-2xl font-bold mt-1">{kpiValues.active}</p>
 </div>
 <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
 <span className="text-green-600 text-lg">✓</span>
 </div>
 </div>
 </Card>

 <Card className="p-4">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-muted-foreground text-sm">{labels.expiringOpportunities}</p>
 <p className="text-2xl font-bold mt-1">{kpiValues.expiringIn7Days}</p>
 </div>
 <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
 <span className="text-yellow-600 text-lg">⏰</span>
 </div>
 </div>
 </Card>

 <Card className="p-4">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-muted-foreground text-sm">{labels.opportunityTypes}</p>
 <p className="text-2xl font-bold mt-1">{kpiValues.types}</p>
 </div>
 <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
 <span className="text-purple-600 text-lg">🏢</span>
 </div>
 </div>
 </Card>
 </div>
 )}

 {/* Filters and Search */}
 {!isLoading && (
 <div className="space-y-4 bg-white p-4 rounded-lg border border-gray-200">
 <div className={`flex items-center gap-4 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
 <div className="flex-1 min-w-[250px]">
 <div className="relative">
 <Search className={`absolute top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
 <input
 type="text"
 placeholder={labels.search}
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className={`w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'pr-10 pl-3 text-right' : 'pl-10 pr-3 text-left'}`}
 />
 </div>
 </div>
 <select
 value={filterType}
 onChange={(e) => setFilterType(e.target.value)}
 className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 >
 <option value="All">{labels.allTypes}</option>
 {donorTypes.map(type => (
 <option key={type} value={type}>{type}</option>
 ))}
 </select>
 <select
 value={filterStatus}
 onChange={(e) => setFilterStatus(e.target.value)}
 className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 >
 <option value="All">{labels.allStatus}</option>
 <option value="open">{labels.status.open}</option>
 <option value="closing-soon">{labels.status.closingSoon}</option>
 <option value="urgent">{labels.status.urgent}</option>
 <option value="closed">{labels.status.closed}</option>
 </select>
 <Button
 onClick={() => refetch()}
 variant="outline"
 size="sm"
 >
 <RefreshCw className="w-4 h-4" />
 </Button>
 <Button
 onClick={() => handleExport('excel')}
 variant="outline"
 size="sm"
 >
 <Download className="w-4 h-4 me-2" />
 {labels.export}
 </Button>
 <Button
 onClick={() => setShowImportModal(true)}
 variant="outline"
 size="sm"
 >
 <Upload className="w-4 h-4 me-2" />
 {labels.import}
 </Button>
 </div>
 </div>
 )}

 {/* Loading State */}
 {isLoading && (
 <div className="flex items-center justify-center py-12">
 <Loader2 className="w-8 h-8 animate-spin text-primary" />
 <span className="ms-3 text-gray-600">{t.donorCRM.loading}</span>
 </div>
 )}

 {/* Empty State */}
 {!isLoading && opportunities.length === 0 && (
 <div className="text-center py-12">
 <p className="text-gray-500">{labels.noOpportunities}</p>
 </div>
 )}

 {/* Data Table */}
 {!isLoading && filteredOpportunities.length > 0 && (
 <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className={`px-6 py-3 text-sm font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{labels.donor}</th>
 <th className={`px-6 py-3 text-sm font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{labels.donorType}</th>
 <th className={`px-6 py-3 text-sm font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{labels.interestArea}</th>
 <th className={`px-6 py-3 text-sm font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{labels.deadline}</th>
 <th className={`px-6 py-3 text-sm font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{labels.budget}</th>
 <th className={`px-6 py-3 text-sm font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{t.common.status}</th>
 <th className={`px-6 py-3 text-sm font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{t.common.actions}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {filteredOpportunities.map((opp) => {
 const status = getDeadlineStatus(opp.applicationDeadline);
 const statusBadge = getStatusBadge(status);
 
 return (
 <tr key={opp.id} className="hover:bg-gray-50 transition-colors">
 <td className={`px-6 py-4 text-sm text-gray-900 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{opp.donorName}</td>
 <td className={`px-6 py-4 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
 <span className={`px-2 py-1 rounded text-xs font-medium ${getDonorTypeBadge(opp.donorType)}`}>
 {opp.donorType}
 </span>
 </td>
 <td className={`px-6 py-4 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
 <div className={`flex flex-wrap gap-1 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
 {opp.interestArea.slice(0, 2).map((area, idx) => (
 <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
 {area}
 </span>
 ))}
 {opp.interestArea.length > 2 && (
 <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
 +{opp.interestArea.length - 2}
 </span>
 )}
 </div>
 </td>
 <td className={`px-6 py-4 text-sm text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
 {new Date(opp.applicationDeadline).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
 </td>
 <td className={`px-6 py-4 text-sm text-gray-900 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
 {opp.allocatedBudget ? formatCurrency(opp.allocatedBudget, opp.currency, isRTL) : '-'}
 </td>
 <td className={`px-6 py-4 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
 <span className={`px-2 py-1 rounded text-xs font-medium ${statusBadge.className}`}>
 {statusBadge.label}
 </span>
 </td>
 <td className={`px-6 py-4 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
 <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
 <button
 onClick={() => openEditModal(opp)}
 className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
 disabled={status === 'closed'}
 title={labels.edit}
 >
 <Edit2 className="w-4 h-4" />
 </button>
 <button
 onClick={() => setShowSendToPipeline(opp)}
 className="p-2 text-primary hover:bg-primary/10 rounded transition-colors"
 disabled={status === 'closed'}
 title={labels.sendToPipeline}
 >
 <Send className="w-4 h-4" />
 </button>
 <button
 onClick={() => setShowDeleteConfirm(opp)}
 className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
 title={labels.delete}
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* No Results */}
 {!isLoading && opportunities.length > 0 && filteredOpportunities.length === 0 && (
 <div className="text-center py-12">
 <p className="text-gray-500">No opportunities match your filters</p>
 </div>
 )}

 {/* Add/Edit Modal */}
 {(showAddModal || showEditModal) && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
 <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
 <h3 className="text-lg font-semibold text-gray-900">
 {showAddModal ? labels.addNew : labels.editOpportunity}
 </h3>
 <button
 onClick={() => {
 setShowAddModal(false);
 setShowEditModal(false);
 setEditingOpportunity(null);
 resetForm();
 }}
 className="text-gray-400 hover:text-gray-600"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 <div className="p-6 space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {labels.donor} <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 value={formData.donorName}
 onChange={(e) => setFormData({ ...formData, donorName: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 placeholder="UNICEF, ECHO, USAID"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {labels.donorType} <span className="text-red-500">*</span>
 </label>
 <select
 value={formData.donorType}
 onChange={(e) => setFormData({ ...formData, donorType: e.target.value as Opportunity['donorType'] })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 >
 <option value="UN">UN</option>
 <option value="EU">EU</option>
 <option value="INGO">INGO</option>
 <option value="Foundation">Foundation</option>
 <option value="Government">Government</option>
 <option value="Other">Other</option>
 </select>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{labels.cfpLink}</label>
 <input
 type="url"
 value={formData.cfpLink}
 onChange={(e) => setFormData({ ...formData, cfpLink: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 placeholder="https://..."
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{labels.applicationLink}</label>
 <input
 type="url"
 value={formData.applicationLink}
 onChange={(e) => setFormData({ ...formData, applicationLink: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 placeholder="https://..."
 />
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">
 {labels.interestArea} <span className="text-red-500">*</span>
 </label>
 <div className="flex flex-wrap gap-2">
 {interestAreas.map((area) => (
 <button
 key={area}
 type="button"
 onClick={() => toggleInterestArea(area)}
 className={`px-3 py-1 rounded text-sm ${ formData.interestArea.includes(area) ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200' }`}
 >
 {area}
 </button>
 ))}
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {labels.geographicAreas} <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 value={formData.geographicAreas}
 onChange={(e) => setFormData({ ...formData, geographicAreas: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 placeholder="Yemen (Sana'a, Hodeidah)"
 />
 </div>

 <div className="grid grid-cols-3 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {labels.deadline} <span className="text-red-500">*</span>
 </label>
 <input
 type="date"
 value={formData.applicationDeadline}
 onChange={(e) => setFormData({ ...formData, applicationDeadline: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{labels.budget}</label>
 <input
 type="number"
 value={formData.allocatedBudget}
 onChange={(e) => setFormData({ ...formData, allocatedBudget: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 placeholder="500000"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
 <select
 value={formData.currency}
 onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 >
 <option value="USD">USD</option>
 <option value="EUR">EUR</option>
 <option value="GBP">GBP</option>
 </select>
 </div>
 </div>

 <div>
 <label className="flex items-center gap-2">
 <input
 type="checkbox"
 checked={formData.isCoFunding}
 onChange={(e) => setFormData({ ...formData, isCoFunding: e.target.checked })}
 className="w-4 h-4 text-primary focus:ring-primary/50 border-gray-300 rounded"
 />
 <span className="text-sm font-medium text-gray-700">{labels.coFunding}</span>
 </label>
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
 placeholder="john@example.com"
 />
 </div>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{labels.notes}</label>
 <textarea
 value={formData.notes}
 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
 rows={3}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 placeholder={labels.notes}
 />
 </div>
 </div>

 <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200">
 <Button
 onClick={() => {
 setShowAddModal(false);
 setShowEditModal(false);
 setEditingOpportunity(null);
 resetForm();
 }}
 variant="outline"
 >
 {labels.cancel}
 </Button>
 <Button
 onClick={showAddModal ? handleAdd : handleEdit}
 className="bg-primary text-white hover:bg-primary/90"
 disabled={!formData.donorName || formData.interestArea.length === 0 || !formData.geographicAreas || !formData.applicationDeadline}
 >
 {labels.save}
 </Button>
 </div>
 </div>
 </div>
 )}

 {/* Send to Pipeline Confirmation Modal */}
 {showSendToPipeline && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-4">{labels.sendToPipelineTitle}</h3>
 <p className="text-gray-600 mb-6">{labels.sendToPipelineDesc}</p>
 <div className="flex items-center justify-end gap-3">
 <Button onClick={() => setShowSendToPipeline(null)} variant="outline">
 {labels.cancel}
 </Button>
 <Button
 onClick={() => handleSendToPipeline(showSendToPipeline)}
 className="bg-primary text-white hover:bg-primary/90"
 disabled={isSending}
 >
 {isSending ? (
 <>
 <Loader2 className="w-4 h-4 animate-spin" />
 Sending...
 </>
 ) : (
 labels.confirm
 )}
 </Button>
 </div>
 </div>
 </div>
 )}

 {/* Delete Confirmation Modal */}
 {showDeleteConfirm && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
 <h3 className="text-lg font-semibold text-gray-900 mb-4">{labels.delete}</h3>
 <p className="text-gray-600 mb-6">{labels.deleteConfirm}</p>
 <div className="flex items-center justify-end gap-3">
 <Button onClick={() => setShowDeleteConfirm(null)} variant="outline">
 {labels.cancel}
 </Button>
 <Button
 onClick={() => handleDelete(showDeleteConfirm)}
 className="bg-red-600 text-white hover:bg-red-700"
 >
 {labels.delete}
 </Button>
 </div> </div>
 </div>
 )}

 {/* Import Modal */}
 <ImportOpportunitiesModal
 open={showImportModal}
 onOpenChange={setShowImportModal}
 onImport={handleImport}
 />
 </div>
 );
}
