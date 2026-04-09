import { useState } from 'react';
import { Plus, Edit2, Trash2, X, ExternalLink, AlertTriangle, Send, Archive } from 'lucide-react';
import { useLanguage, formatCurrency } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';

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

// Mock data removed - data is fetched from database via tRPC queries
// Initialize with empty array - will be populated from API

export function OpportunitiesCards() {
 const { t } = useTranslation();
 const { isRTL } = useLanguage();
 const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
 const [showAddModal, setShowAddModal] = useState(false);
 const [showEditModal, setShowEditModal] = useState(false);
 const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
 const [showDeleteConfirm, setShowDeleteConfirm] = useState<Opportunity | null>(null);
 const [showSendToPipeline, setShowSendToPipeline] = useState<Opportunity | null>(null);

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
 title: t.proposals.fundingOpportunities,
 subtitle: t.proposals.trackFundingCallsAndOpportunitiesBefore,
 addOpportunity: t.proposals.addOpportunity,
 donor: t.proposals.donor,
 interestArea: t.proposals.interestArea,
 geographicAreas: t.proposals.geographicAreas,
 deadline: t.proposals.deadline,
 budget: t.proposals.budget,
 coFunding: t.proposals.cofunding,
 yes: t.proposals.yes,
 no: t.proposals.no,
 edit: t.proposals.edit,
 delete: t.proposals.delete,
 archive: t.proposals.archive,
 sendToPipeline: t.proposals.sendToPipeline,
 cancel: t.proposals.cancel,
 save: t.proposals.save,
 addNew: t.proposals.addNewOpportunity,
 editOpportunity: t.proposals.editOpportunity,
 deleteConfirm: t.proposals.areYouSureYouWantTo,
 notes: t.proposals.notes,
 required: t.proposals.required,
 cfpLink: t.proposals.cfpLink,
 applicationLink: t.proposals.applicationLink,
 donorType: t.proposals.donorType,
 status: {
 open: t.proposals.open,
 closingSoon: t.proposals.closingSoon,
 urgent: t.proposals.urgent,
 closed: t.proposals.closed
 },
 sendToPipelineTitle: t.proposals.sendToPipeline,
 sendToPipelineDesc: t.proposals.aNewPipelineOpportunityWillBe,
 confirm: t.proposals.confirm
 };

 const interestAreas = ['Education in Emergencies', 'WASH', 'Health', 'Protection', 'Child Protection', 'Livelihoods', 'Food Security', 'Nutrition', 'Shelter'];

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
 'open': { label: t.status.open, className: 'bg-green-100 text-green-700' },
 'closing-soon': { label: t.status.closingSoon, className: 'bg-yellow-100 text-yellow-700' },
 'urgent': { label: t.status.urgent, className: 'bg-red-100 text-red-700' },
 'closed': { label: t.status.closed, className: 'bg-gray-100 text-gray-500' }
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

 // Get card border class based on deadline
 const getCardBorderClass = (status: DeadlineStatus) => {
 const borders = {
 'open': 'border-gray-200',
 'closing-soon': 'border-yellow-400 border-2',
 'urgent': 'border-red-500 border-2',
 'closed': 'border-gray-300 opacity-60'
 };
 return borders[status];
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
 setOpportunities([...opportunities, newOpportunity]);
 setShowAddModal(false);
 resetForm();
 };

 const handleEdit = () => {
 if (!editingOpportunity) return;
 const updated = opportunities.map(opp =>
 opp.id === editingOpportunity.id
 ? {
 ...opp,
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
 }
 : opp
 );
 setOpportunities(updated);
 setShowEditModal(false);
 setEditingOpportunity(null);
 resetForm();
 };

 const handleDelete = (opportunity: Opportunity) => {
 setOpportunities(opportunities.filter(opp => opp.id !== opportunity.id));
 setShowDeleteConfirm(null);
 };

 const handleSendToPipeline = (opportunity: Opportunity) => {
 // TODO: Create Pipeline entry via tRPC with pre-filled data
 console.log('Sending to Pipeline:', opportunity);
 setShowSendToPipeline(null);
 // Show success toast
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

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className={`flex items-center justify-between`}>
 <div>
 <h2 className="text-2xl font-bold text-gray-900">{labels.title}</h2>
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

 {/* Cards Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {opportunities.map((opp) => {
 const status = getDeadlineStatus(opp.applicationDeadline);
 const statusBadge = getStatusBadge(status);
 const borderClass = getCardBorderClass(status);

 return (
 <div
 key={opp.id}
 className={`bg-white rounded-lg shadow-sm border ${borderClass} p-5 space-y-4 transition-all hover:shadow-md`}
 >
 {/* Header */}
 <div className="space-y-2">
 <div className={`flex items-start justify-between gap-2`}>
 <h3 className="font-semibold text-gray-900 text-lg flex-1">{opp.donorName}</h3>
 {status === 'urgent' && (
 <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
 )}
 </div>
 <div className={`flex flex-wrap gap-2`}>
 <span className={`px-2 py-1 rounded text-xs font-medium ${getDonorTypeBadge(opp.donorType)}`}>
 {opp.donorType}
 </span>
 <span className={`px-2 py-1 rounded text-xs font-medium ${statusBadge.className}`}>
 {statusBadge.label}
 </span>
 </div>
 </div>

 {/* Core Details */}
 <div className="space-y-3">
 {/* Interest Areas */}
 <div>
 <p className="text-xs text-gray-500 mb-1">{labels.interestArea}</p>
 <div className={`flex flex-wrap gap-1`}>
 {opp.interestArea.map((area, idx) => (
 <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
 {area}
 </span>
 ))}
 </div>
 </div>

 {/* Geographic Areas */}
 <div>
 <p className="text-xs text-gray-500">{labels.geographicAreas}</p>
 <p className="text-sm text-gray-900">{opp.geographicAreas}</p>
 </div>

 {/* Deadline */}
 <div>
 <p className="text-xs text-gray-500">{labels.deadline}</p>
 <p className={`text-sm font-medium ${status === 'urgent' ? 'text-red-600' : status === 'closing-soon' ? 'text-yellow-600' : 'text-gray-900'}`}>
 {new Date(opp.applicationDeadline).toLocaleDateString()}
 </p>
 </div>

 {/* Budget */}
 {opp.allocatedBudget && (
 <div>
 <p className="text-xs text-gray-500">{labels.budget}</p>
 <p className="text-sm font-semibold text-gray-900">
 {formatCurrency(opp.allocatedBudget, opp.currency, isRTL)}
 </p>
 </div>
 )}

 {/* Co-Funding */}
 <div className={`flex items-center gap-2`}>
 <span className="text-xs text-gray-500">{labels.coFunding}:</span>
 <span className={`px-2 py-1 rounded text-xs ${opp.isCoFunding ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
 {opp.isCoFunding ? labels.yes : labels.no}
 </span>
 </div>
 </div>

 {/* Links */}
 <div className={`flex gap-2 pt-2 border-t border-gray-100`}>
 {opp.cfpLink && (
 <a
 href={opp.cfpLink}
 target="_blank"
 rel="noopener noreferrer"
 className="text-primary hover:text-primary/80 text-sm flex items-center gap-1"
 >
 <ExternalLink className="w-4 h-4" />
 CFP
 </a>
 )}
 {opp.applicationLink && (
 <a
 href={opp.applicationLink}
 target="_blank"
 rel="noopener noreferrer"
 className="text-primary hover:text-primary/80 text-sm flex items-center gap-1"
 >
 <ExternalLink className="w-4 h-4" />
 {labels.applicationLink}
 </a>
 )}
 </div>

 {/* Actions */}
 <div className={`flex gap-2 pt-2 border-t border-gray-100`}>
 <button
 onClick={() => openEditModal(opp)}
 className="flex-1 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded border border-gray-300 flex items-center justify-center gap-2"
 disabled={status === 'closed'}
 >
 <Edit2 className="w-4 h-4" />
 {labels.edit}
 </button>
 <button
 onClick={() => setShowSendToPipeline(opp)}
 className="flex-1 px-3 py-2 text-sm text-white bg-primary hover:bg-primary/90 rounded flex items-center justify-center gap-2"
 disabled={status === 'closed'}
 >
 <Send className="w-4 h-4" />
 {labels.sendToPipeline}
 </button>
 <button
 onClick={() => setShowDeleteConfirm(opp)}
 className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded border border-red-300 flex items-center justify-center"
 >
 <Archive className="w-4 h-4" />
 </button>
 </div>
 </div>
 );
 })}
 </div>

 {/* Add/Edit Modal - Reuse existing modal code from OpportunitiesManagement */}
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
 placeholder={t.placeholders.unicefEchoUsaid}
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
 placeholder={t.placeholders.yemenSanaAHodeidah}
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
 <label className="block text-sm font-medium text-gray-700 mb-1">{t.currency}</label>
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
 <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.sendToPipelineTitle}</h3>
 <p className="text-gray-600 mb-6">{t.sendToPipelineDesc}</p>
 <div className="flex items-center justify-end gap-3">
 <Button onClick={() => setShowSendToPipeline(null)} variant="outline">
 {labels.cancel}
 </Button>
 <Button
 onClick={() => handleSendToPipeline(showSendToPipeline)}
 className="bg-primary text-white hover:bg-primary/90"
 >
 {t.confirm}
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
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
