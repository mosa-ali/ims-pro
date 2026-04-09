import { useState } from 'react';
import { Plus, Edit2, Trash2, X, ExternalLink } from 'lucide-react';
import { useLanguage, formatCurrency } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';

interface Opportunity {
  id: string;
  donorName: string;
  cfpLink?: string;
  interestArea: string[];
  geographicAreas: string;
  applicationDeadline: string;
  allocatedBudget?: number;
  currency: string;
  isCoFunding: boolean;
  applicationLink?: string;
  notes?: string;
}

const mockOpportunities: Opportunity[] = [
  {
    id: '1',
    donorName: 'UNICEF',
    cfpLink: 'https://unicef.org/cfp/2024-edu-001',
    interestArea: ['Education in Emergencies', 'Child Protection'],
    geographicAreas: 'Yemen (Sana\'a, Hodeidah)',
    applicationDeadline: '2024-09-30',
    allocatedBudget: 500000,
    currency: 'USD',
    isCoFunding: false,
    applicationLink: 'https://unicef.org/apply/2024-edu-001',
    notes: 'Focus on conflict-affected areas'
  },
  {
    id: '2',
    donorName: 'European Commission - ECHO',
    cfpLink: 'https://ec.europa.eu/echo/cfp/wash-2024',
    interestArea: ['WASH', 'Health'],
    geographicAreas: 'Yemen (Hodeidah, Taiz)',
    applicationDeadline: '2024-08-15',
    allocatedBudget: 1200000,
    currency: 'EUR',
    isCoFunding: true,
    applicationLink: 'https://ec.europa.eu/echo/apply',
    notes: 'Consortium approach required'
  }
];

export function OpportunitiesManagement() {
  const { isRTL } = useLanguage();
  const [opportunities, setOpportunities] = useState<Opportunity[]>(mockOpportunities);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Opportunity | null>(null);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    donorName: '',
    cfpLink: '',
    interestArea: [] as string[],
    geographicAreas: '',
    applicationDeadline: '',
    allocatedBudget: '',
    currency: 'USD',
    isCoFunding: false,
    applicationLink: '',
    notes: ''
  });

  const t = {
    title: isRTL ? 'إدارة الفرص التمويلية' : 'Opportunities Management',
    subtitle: isRTL ? 'تتبع نداءات التمويل والفرص قبل اتخاذ القرار الداخلي' : 'Track funding calls and opportunities before internal decision',
    addOpportunity: isRTL ? 'إضافة فرصة' : 'Add Opportunity',
    exportExcel: isRTL ? 'تصدير Excel' : 'Export Excel',
    search: isRTL ? 'البحث بالمانح أو مجال الاهتمام...' : 'Search by donor or interest area...',
    donor: isRTL ? 'المانح / المؤسسة' : 'Donors / Foundations',
    cfpLink: isRTL ? 'رابط CFP' : 'CFP Link',
    interestArea: isRTL ? 'مجال الاهتمام' : 'Interest Area',
    geographicAreas: isRTL ? 'المناطق الجغرافية' : 'Geographic Areas',
    deadline: isRTL ? 'الموعد النهائي' : 'Application Deadline',
    budget: isRTL ? 'الميزانية المخصصة' : 'Allocated Budget',
    currency: isRTL ? 'العملة' : 'Currency',
    coFunding: isRTL ? 'تمويل مشترك' : 'Co-Funding',
    applicationLink: isRTL ? 'رابط التقديم' : 'Application Link',
    actions: isRTL ? 'الإجراءات' : 'Actions',
    yes: isRTL ? 'نعم' : 'Yes',
    no: isRTL ? 'لا' : 'No',
    edit: isRTL ? 'تعديل' : 'Edit',
    delete: isRTL ? 'حذف' : 'Delete',
    cancel: isRTL ? 'إلغاء' : 'Cancel',
    save: isRTL ? 'حفظ' : 'Save',
    addNew: isRTL ? 'إضافة فرصة جديدة' : 'Add New Opportunity',
    editOpportunity: isRTL ? 'تعديل الفرصة' : 'Edit Opportunity',
    deleteConfirm: isRTL ? 'هل أنت متأكد من حذف هذه الفرصة؟' : 'Are you sure you want to delete this opportunity?',
    notes: isRTL ? 'ملاحظات' : 'Notes',
    required: isRTL ? 'مطلوب' : 'Required'
  };

  const interestAreas = ['Education in Emergencies', 'WASH', 'Health', 'Protection', 'Child Protection', 'Livelihoods', 'Food Security', 'Nutrition', 'Shelter'];

  // Filter opportunities
  const filteredOpportunities = opportunities.filter(opp => {
    const matchesSearch = opp.donorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.interestArea.some(area => area.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const handleAdd = () => {
    const newOpportunity: Opportunity = {
      id: String(opportunities.length + 1),
      donorName: formData.donorName,
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

  const openEditModal = (opportunity: Opportunity) => {
    setEditingOpportunity(opportunity);
    setFormData({
      donorName: opportunity.donorName,
      cfpLink: opportunity.cfpLink || '',
      interestArea: opportunity.interestArea,
      geographicAreas: opportunity.geographicAreas,
      applicationDeadline: opportunity.applicationDeadline,
      allocatedBudget: opportunity.allocatedBudget?.toString() || '',
      currency: opportunity.currency,
      isCoFunding: opportunity.isCoFunding,
      applicationLink: opportunity.applicationLink || '',
      notes: opportunity.notes || ''
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      donorName: '',
      cfpLink: '',
      interestArea: [],
      geographicAreas: '',
      applicationDeadline: '',
      allocatedBudget: '',
      currency: 'USD',
      isCoFunding: false,
      applicationLink: '',
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
    <div dir={isRTL ? 'rtl' : 'ltr'} className="space-y-4">
      {/* Actions Bar */}
      <div className={`flex ${isRTL ? 'flex-row-reverse' : ''} items-center justify-between gap-4`}>
        <div className="flex-1">
          <input
            type="text"
            placeholder={t.search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className={`flex ${isRTL ? 'flex-row-reverse' : ''} gap-2`}>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-primary text-white hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t.addOpportunity}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t.donor}</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t.cfpLink}</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t.interestArea}</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t.geographicAreas}</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t.deadline}</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t.budget}</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t.currency}</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t.coFunding}</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{t.applicationLink}</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">{t.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredOpportunities.map((opp) => (
              <tr key={opp.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">{opp.donorName}</td>
                <td className="px-4 py-3 text-sm">
                  {opp.cfpLink ? (
                    <a href={opp.cfpLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      Link
                    </a>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex flex-wrap gap-1">
                    {opp.interestArea.map((area, idx) => (
                      <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        {area}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{opp.geographicAreas}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{new Date(opp.applicationDeadline).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {opp.allocatedBudget ? formatCurrency(opp.allocatedBudget, opp.currency, isRTL) : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{opp.currency}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded text-xs ${opp.isCoFunding ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {opp.isCoFunding ? t.yes : t.no}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  {opp.applicationLink ? (
                    <a href={opp.applicationLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      Link
                    </a>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => openEditModal(opp)}
                      className="text-primary hover:text-primary/80"
                      title={t.edit}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(opp)}
                      className="text-red-600 hover:text-red-700"
                      title={t.delete}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.cfpLink}</label>
                  <input
                    type="url"
                    value={formData.cfpLink}
                    onChange={(e) => setFormData({ ...formData, cfpLink: e.target.value })}
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
