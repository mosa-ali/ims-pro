import { useState } from 'react';
import { Plus, Edit2, Trash2, X, ExternalLink, AlertTriangle, Send, Archive } from 'lucide-react';
import { useLanguage, formatCurrency } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';

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

const mockOpportunities: Opportunity[] = [
  {
    id: '1',
    donorName: 'UNICEF',
    donorType: 'UN',
    cfpLink: 'https://unicef.org/cfp/2024-edu-001',
    interestArea: ['Education in Emergencies', 'Child Protection'],
    geographicAreas: 'Yemen (Sana\'a, Hodeidah)',
    applicationDeadline: '2024-10-15',
    allocatedBudget: 500000,
    currency: 'USD',
    isCoFunding: false,
    applicationLink: 'https://unicef.org/apply/2024-edu-001',
    notes: 'Focus on conflict-affected areas'
  },
  {
    id: '2',
    donorName: 'European Commission - ECHO',
    donorType: 'EU',
    cfpLink: 'https://ec.europa.eu/echo/cfp/wash-2024',
    interestArea: ['WASH', 'Health'],
    geographicAreas: 'Yemen (Hodeidah, Taiz)',
    applicationDeadline: '2024-02-10', // Urgent (7 days)
    allocatedBudget: 1200000,
    currency: 'EUR',
    isCoFunding: true,
    applicationLink: 'https://ec.europa.eu/echo/apply',
    notes: 'Consortium approach required'
  },
  {
    id: '3',
    donorName: 'Gates Foundation',
    donorType: 'Foundation',
    cfpLink: 'https://gatesfoundation.org/cfp/health-2024',
    interestArea: ['Health', 'Nutrition'],
    geographicAreas: 'Yemen (Nationwide)',
    applicationDeadline: '2024-02-08', // Closing soon (14 days)
    allocatedBudget: 800000,
    currency: 'USD',
    isCoFunding: false,
    notes: 'Innovation focus'
  },
  {
    id: '4',
    donorName: 'USAID',
    donorType: 'Government',
    cfpLink: 'https://usaid.gov/cfp/livelihoods-2024',
    interestArea: ['Livelihoods', 'Food Security'],
    geographicAreas: 'Yemen (Taiz, Ibb)',
    applicationDeadline: '2024-01-20', // Closed
    allocatedBudget: 600000,
    currency: 'USD',
    isCoFunding: true,
    notes: 'Closed - missed deadline'
  }
];

export function OpportunitiesCards() {
  const { isRTL } = useLanguage();
  const [opportunities, setOpportunities] = useState<Opportunity[]>(mockOpportunities);
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

  const t = {
    title: isRTL ? 'الفرص التمويلية' : 'Funding Opportunities',
    subtitle: isRTL ? 'تتبع نداءات التمويل والفرص قبل اتخاذ القرار الداخلي' : 'Track funding calls and opportunities before internal decision',
    addOpportunity: isRTL ? 'إضافة فرصة' : 'Add Opportunity',
    donor: isRTL ? 'المانح' : 'Donor',
    interestArea: isRTL ? 'مجال الاهتمام' : 'Interest Area',
    geographicAreas: isRTL ? 'المناطق الجغرافية' : 'Geographic Areas',
    deadline: isRTL ? 'الموعد النهائي' : 'Deadline',
    budget: isRTL ? 'الميزانية' : 'Budget',
    coFunding: isRTL ? 'تمويل مشترك' : 'Co-Funding',
    yes: isRTL ? 'نعم' : 'Yes',
    no: isRTL ? 'لا' : 'No',
    edit: isRTL ? 'تعديل' : 'Edit',
    delete: isRTL ? 'حذف' : 'Delete',
    archive: isRTL ? 'أرشفة' : 'Archive',
    sendToPipeline: isRTL ? 'إرسال إلى خط التمويل' : 'Send to Pipeline',
    cancel: isRTL ? 'إلغاء' : 'Cancel',
    save: isRTL ? 'حفظ' : 'Save',
    addNew: isRTL ? 'إضافة فرصة جديدة' : 'Add New Opportunity',
    editOpportunity: isRTL ? 'تعديل الفرصة' : 'Edit Opportunity',
    deleteConfirm: isRTL ? 'هل أنت متأكد من حذف هذه الفرصة؟' : 'Are you sure you want to delete this opportunity?',
    notes: isRTL ? 'ملاحظات' : 'Notes',
    required: isRTL ? 'مطلوب' : 'Required',
    cfpLink: isRTL ? 'رابط CFP' : 'CFP Link',
    applicationLink: isRTL ? 'رابط التقديم' : 'Application Link',
    donorType: isRTL ? 'نوع المانح' : 'Donor Type',
    status: {
      open: isRTL ? 'مفتوح' : 'Open',
      closingSoon: isRTL ? 'يغلق قريباً' : 'Closing Soon',
      urgent: isRTL ? 'عاجل' : 'Urgent',
      closed: isRTL ? 'مغلق' : 'Closed'
    },
    sendToPipelineTitle: isRTL ? 'إرسال إلى خط التمويل' : 'Send to Pipeline',
    sendToPipelineDesc: isRTL ? 'سيتم إنشاء فرصة جديدة في خط التمويل مع البيانات المملوءة مسبقاً' : 'A new pipeline opportunity will be created with pre-filled data',
    confirm: isRTL ? 'تأكيد' : 'Confirm'
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
    <div dir={isRTL ? 'rtl' : 'ltr'} className="space-y-6">
      {/* Header */}
      <div className={`flex ${isRTL ? 'flex-row-reverse' : ''} items-center justify-between`}>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t.title}</h2>
          <p className="text-gray-600 mt-1">{t.subtitle}</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-primary text-white hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t.addOpportunity}
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
                <div className={`flex ${isRTL ? 'flex-row-reverse' : ''} items-start justify-between gap-2`}>
                  <h3 className="font-semibold text-gray-900 text-lg flex-1">{opp.donorName}</h3>
                  {status === 'urgent' && (
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  )}
                </div>
                <div className={`flex ${isRTL ? 'flex-row-reverse' : ''} flex-wrap gap-2`}>
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
                  <p className="text-xs text-gray-500 mb-1">{t.interestArea}</p>
                  <div className={`flex ${isRTL ? 'flex-row-reverse' : ''} flex-wrap gap-1`}>
                    {opp.interestArea.map((area, idx) => (
                      <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Geographic Areas */}
                <div>
                  <p className="text-xs text-gray-500">{t.geographicAreas}</p>
                  <p className="text-sm text-gray-900">{opp.geographicAreas}</p>
                </div>

                {/* Deadline */}
                <div>
                  <p className="text-xs text-gray-500">{t.deadline}</p>
                  <p className={`text-sm font-medium ${status === 'urgent' ? 'text-red-600' : status === 'closing-soon' ? 'text-yellow-600' : 'text-gray-900'}`}>
                    {new Date(opp.applicationDeadline).toLocaleDateString()}
                  </p>
                </div>

                {/* Budget */}
                {opp.allocatedBudget && (
                  <div>
                    <p className="text-xs text-gray-500">{t.budget}</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(opp.allocatedBudget, opp.currency, isRTL)}
                    </p>
                  </div>
                )}

                {/* Co-Funding */}
                <div className={`flex ${isRTL ? 'flex-row-reverse' : ''} items-center gap-2`}>
                  <span className="text-xs text-gray-500">{t.coFunding}:</span>
                  <span className={`px-2 py-1 rounded text-xs ${opp.isCoFunding ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {opp.isCoFunding ? t.yes : t.no}
                  </span>
                </div>
              </div>

              {/* Links */}
              <div className={`flex ${isRTL ? 'flex-row-reverse' : ''} gap-2 pt-2 border-t border-gray-100`}>
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
                    {t.applicationLink}
                  </a>
                )}
              </div>

              {/* Actions */}
              <div className={`flex ${isRTL ? 'flex-row-reverse' : ''} gap-2 pt-2 border-t border-gray-100`}>
                <button
                  onClick={() => openEditModal(opp)}
                  className="flex-1 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded border border-gray-300 flex items-center justify-center gap-2"
                  disabled={status === 'closed'}
                >
                  <Edit2 className="w-4 h-4" />
                  {t.edit}
                </button>
                <button
                  onClick={() => setShowSendToPipeline(opp)}
                  className="flex-1 px-3 py-2 text-sm text-white bg-primary hover:bg-primary/90 rounded flex items-center justify-center gap-2"
                  disabled={status === 'closed'}
                >
                  <Send className="w-4 h-4" />
                  {t.sendToPipeline}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {showAddModal ? t.addNew : t.editOpportunity}
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
                    {t.donor} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.donorName}
                    onChange={(e) => setFormData({ ...formData, donorName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="UNICEF, ECHO, USAID..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.donorType} <span className="text-red-500">*</span>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.cfpLink}</label>
                  <input
                    type="url"
                    value={formData.cfpLink}
                    onChange={(e) => setFormData({ ...formData, cfpLink: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.applicationLink}</label>
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
                  {t.interestArea} <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {interestAreas.map((area) => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => toggleInterestArea(area)}
                      className={`px-3 py-1 rounded text-sm ${
                        formData.interestArea.includes(area)
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.geographicAreas} <span className="text-red-500">*</span>
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
                    {t.deadline} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.applicationDeadline}
                    onChange={(e) => setFormData({ ...formData, applicationDeadline: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.budget}</label>
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
                  <span className="text-sm font-medium text-gray-700">{t.coFunding}</span>
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
                    placeholder="john.doe@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.notes}</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder={t.notes}
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
                {t.cancel}
              </Button>
              <Button
                onClick={showAddModal ? handleAdd : handleEdit}
                className="bg-primary text-white hover:bg-primary/90"
                disabled={!formData.donorName || formData.interestArea.length === 0 || !formData.geographicAreas || !formData.applicationDeadline}
              >
                {t.save}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Send to Pipeline Confirmation Modal */}
      {showSendToPipeline && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.sendToPipelineTitle}</h3>
            <p className="text-gray-600 mb-6">{t.sendToPipelineDesc}</p>
            <div className="flex items-center justify-end gap-3">
              <Button onClick={() => setShowSendToPipeline(null)} variant="outline">
                {t.cancel}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.delete}</h3>
            <p className="text-gray-600 mb-6">{t.deleteConfirm}</p>
            <div className="flex items-center justify-end gap-3">
              <Button onClick={() => setShowDeleteConfirm(null)} variant="outline">
                {t.cancel}
              </Button>
              <Button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {t.delete}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
