import { useState } from 'react';
import { Plus, Edit, Trash2, Download, Upload, X } from 'lucide-react';

import { useTranslation } from 'react-i18next';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface Referral {
  id: number;
  beneficiaryId: string;
  beneficiaryName: string;
  referralDate: string;
  referralType: 'Internal' | 'External';
  referredTo: string;
  serviceNeeded: string;
  urgencyLevel: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'Accepted' | 'Completed' | 'Rejected';
  followUpDate: string;
  consentObtained: boolean;
  referredBy: string;
  contactPerson: string;
  contactPhone: string;
  notes: string;
}

export function Referrals({ projectId }: { projectId: number }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n?.language === 'ar';
  
  const [referrals, setReferrals] = useState<Referral[]>([
    {
      id: 1,
      beneficiaryId: 'BEN-001',
      beneficiaryName: 'Ahmed Ali',
      referralDate: '2024-01-15',
      referralType: 'External',
      referredTo: 'Al-Salam Hospital',
      serviceNeeded: 'Mental Health Support',
      urgencyLevel: 'High',
      status: 'Accepted',
      followUpDate: '2024-01-22',
      consentObtained: true,
      referredBy: 'Dr. Sarah Mohammed',
      contactPerson: 'Dr. Khalid Ahmed',
      contactPhone: '+967 777 123 456',
      notes: 'Requires immediate psychological assessment'
    },
    {
      id: 2,
      beneficiaryId: 'BEN-002',
      beneficiaryName: 'Fatima Hassan',
      referralDate: '2024-01-14',
      referralType: 'Internal',
      referredTo: 'Legal Aid Unit',
      serviceNeeded: 'Legal Counseling',
      urgencyLevel: 'Medium',
      status: 'Completed',
      followUpDate: '2024-01-21',
      consentObtained: true,
      referredBy: 'Case Worker - Ahmed',
      contactPerson: 'Legal Officer - Nadia',
      contactPhone: '+967 777 654 321',
      notes: 'Documentation support provided'
    }
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingReferral, setEditingReferral] = useState<Referral | null>(null);
  const [deletingReferralId, setDeletingReferralId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Referral>>({
    referralType: 'Internal',
    urgencyLevel: 'Medium',
    status: 'Pending',
    consentObtained: false
  });

  const resetForm = () => {
    setFormData({
      referralType: 'Internal',
      urgencyLevel: 'Medium',
      status: 'Pending',
      consentObtained: false
    });
  };

  const handleAdd = () => {
    if (!formData.beneficiaryId || !formData.beneficiaryName || !formData.referralDate || !formData.referredTo || !formData.serviceNeeded) {
      alert(t('caseManagement.fillRequiredFields'));
      return;
    }

    if (!formData.consentObtained) {
      alert(t('caseManagement.consentRequiredMessage'));
      return;
    }

    const newReferral: Referral = {
      id: Math.max(0, ...referrals.map(r => r.id)) + 1,
      beneficiaryId: formData.beneficiaryId!,
      beneficiaryName: formData.beneficiaryName!,
      referralDate: formData.referralDate!,
      referralType: formData.referralType as 'Internal' | 'External',
      referredTo: formData.referredTo!,
      serviceNeeded: formData.serviceNeeded!,
      urgencyLevel: formData.urgencyLevel as 'Low' | 'Medium' | 'High',
      status: formData.status as 'Pending' | 'Accepted' | 'Completed' | 'Rejected',
      followUpDate: formData.followUpDate || '',
      consentObtained: formData.consentObtained || false,
      referredBy: formData.referredBy || '',
      contactPerson: formData.contactPerson || '',
      contactPhone: formData.contactPhone || '',
      notes: formData.notes || ''
    };

    setReferrals([...referrals, newReferral]);
    setShowAddModal(false);
    resetForm();
    alert(t('caseManagement.referralCreatedSuccess'));
  };

  const handleEdit = () => {
    if (!editingReferral || !formData.beneficiaryId || !formData.beneficiaryName) {
      alert(t('caseManagement.fillRequiredFields'));
      return;
    }

    setReferrals(referrals.map(r =>
      r.id === editingReferral.id
        ? { ...r, ...formData } as Referral
        : r
    ));

    setShowEditModal(false);
    setEditingReferral(null);
    resetForm();
    alert(t('caseManagement.referralUpdatedSuccess'));
  };

  const handleDelete = () => {
    if (deletingReferralId !== null) {
      setReferrals(referrals.filter(r => r.id !== deletingReferralId));
      setShowDeleteModal(false);
      setDeletingReferralId(null);
      alert(t('caseManagement.referralDeletedSuccess'));
    }
  };

  const openEdit = (referral: Referral) => {
    setEditingReferral(referral);
    setFormData(referral);
    setShowEditModal(true);
  };

  const openDelete = (referralId: number) => {
    setDeletingReferralId(referralId);
    setShowDeleteModal(true);
  };

  // Excel Export
  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Referrals');

    worksheet.columns = [
      { header: 'Referral ID', key: 'id', width: 12 },
      { header: 'Beneficiary ID', key: 'beneficiaryId', width: 15 },
      { header: 'Beneficiary Name', key: 'beneficiaryName', width: 25 },
      { header: 'Referral Date', key: 'referralDate', width: 15 },
      { header: 'Referral Type', key: 'referralType', width: 15 },
      { header: 'Referred To', key: 'referredTo', width: 30 },
      { header: 'Service Needed', key: 'serviceNeeded', width: 30 },
      { header: 'Urgency Level', key: 'urgencyLevel', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Follow-up Date', key: 'followUpDate', width: 15 },
      { header: 'Consent Obtained', key: 'consentObtained', width: 18 },
      { header: 'Referred By', key: 'referredBy', width: 25 },
      { header: 'Contact Person', key: 'contactPerson', width: 25 },
      { header: 'Contact Phone', key: 'contactPhone', width: 20 },
      { header: 'Notes', key: 'notes', width: 40 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    referrals.forEach(referral => {
      worksheet.addRow({
        id: referral.id,
        beneficiaryId: referral.beneficiaryId,
        beneficiaryName: referral.beneficiaryName,
        referralDate: referral.referralDate,
        referralType: referral.referralType,
        referredTo: referral.referredTo,
        serviceNeeded: referral.serviceNeeded,
        urgencyLevel: referral.urgencyLevel,
        status: referral.status,
        followUpDate: referral.followUpDate,
        consentObtained: referral.consentObtained ? 'Yes' : 'No',
        referredBy: referral.referredBy,
        contactPerson: referral.contactPerson,
        contactPhone: referral.contactPhone,
        notes: referral.notes
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Referrals_${new Date().toISOString().split('T')[0]}.xlsx`);
    alert(t('caseManagement.exportSuccess'));
  };

  // Excel Import Template
  const handleDownloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Referrals Template');

    worksheet.columns = [
      { header: 'Beneficiary ID*', key: 'beneficiaryId', width: 15 },
      { header: 'Beneficiary Name*', key: 'beneficiaryName', width: 25 },
      { header: 'Referral Date* (YYYY-MM-DD)', key: 'referralDate', width: 25 },
      { header: 'Referral Type* (Internal/External)', key: 'referralType', width: 30 },
      { header: 'Referred To*', key: 'referredTo', width: 30 },
      { header: 'Service Needed*', key: 'serviceNeeded', width: 30 },
      { header: 'Urgency Level (Low/Medium/High)', key: 'urgencyLevel', width: 30 },
      { header: 'Status (Pending/Accepted/Completed/Rejected)', key: 'status', width: 40 },
      { header: 'Follow-up Date (YYYY-MM-DD)', key: 'followUpDate', width: 25 },
      { header: 'Consent Obtained* (Yes/No)', key: 'consentObtained', width: 25 },
      { header: 'Referred By', key: 'referredBy', width: 25 },
      { header: 'Contact Person', key: 'contactPerson', width: 25 },
      { header: 'Contact Phone', key: 'contactPhone', width: 20 },
      { header: 'Notes', key: 'notes', width: 40 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };

    // Add sample row
    worksheet.addRow({
      beneficiaryId: 'BEN-001',
      beneficiaryName: 'Ahmed Ali',
      referralDate: '2024-01-15',
      referralType: 'External',
      referredTo: 'Al-Salam Hospital',
      serviceNeeded: 'Mental Health Support',
      urgencyLevel: 'High',
      status: 'Pending',
      followUpDate: '2024-01-22',
      consentObtained: 'Yes',
      referredBy: 'Dr. Sarah Mohammed',
      contactPerson: 'Dr. Khalid Ahmed',
      contactPhone: '+967 777 123 456',
      notes: 'Sample referral record'
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'Referrals_Import_Template.xlsx');
    alert(t('caseManagement.templateDownloadSuccess'));
  };

  // Excel Import
  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const workbook = new ExcelJS.Workbook();
    const arrayBuffer = await file.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      alert(t('caseManagement.noWorksheetFound'));
      return;
    }

    const importedReferrals: Referral[] = [];
    let maxId = Math.max(0, ...referrals.map(r => r.id));

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const referralData = {
        id: ++maxId,
        beneficiaryId: row.getCell(1).value?.toString() || '',
        beneficiaryName: row.getCell(2).value?.toString() || '',
        referralDate: row.getCell(3).value?.toString() || '',
        referralType: row.getCell(4).value?.toString() as 'Internal' | 'External' || 'Internal',
        referredTo: row.getCell(5).value?.toString() || '',
        serviceNeeded: row.getCell(6).value?.toString() || '',
        urgencyLevel: row.getCell(7).value?.toString() as 'Low' | 'Medium' | 'High' || 'Medium',
        status: row.getCell(8).value?.toString() as 'Pending' | 'Accepted' | 'Completed' | 'Rejected' || 'Pending',
        followUpDate: row.getCell(9).value?.toString() || '',
        consentObtained: row.getCell(10).value?.toString()?.toLowerCase() === 'yes',
        referredBy: row.getCell(11).value?.toString() || '',
        contactPerson: row.getCell(12).value?.toString() || '',
        contactPhone: row.getCell(13).value?.toString() || '',
        notes: row.getCell(14).value?.toString() || ''
      };

      if (referralData.beneficiaryId && referralData.beneficiaryName && referralData.consentObtained) {
        importedReferrals.push(referralData);
      }
    });

    setReferrals([...referrals, ...importedReferrals]);
    alert(t('caseManagement.importSuccess').replace('{count}', importedReferrals.length.toString()));
    event.target.value = '';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-700';
      case 'Accepted': return 'bg-blue-100 text-blue-700';
      case 'Completed': return 'bg-green-100 text-green-700';
      case 'Rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'High': return 'bg-red-100 text-red-700';
      case 'Medium': return 'bg-orange-100 text-orange-700';
      case 'Low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h3 className="text-sm font-semibold text-gray-900">{t('caseManagement.referralsTitle')}</h3>
          <p className="text-xs text-gray-600 mt-0.5">{t('caseManagement.referralsDescription')}</p>
        </div>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={handleDownloadTemplate}
            className={`px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Download className="w-4 h-4" />
            {t('common.template')}
          </button>
          <label className={`px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 cursor-pointer ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Upload className="w-4 h-4" />
            {t('common.import')}
            <input type="file" accept=".xlsx,.xls" onChange={handleImportExcel} className="hidden" />
          </label>
          <button
            onClick={handleExportExcel}
            className={`px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Download className="w-4 h-4" />
            {t('common.export')}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className={`px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Plus className="w-4 h-4" />
            {t('caseManagement.createReferral')}
          </button>
        </div>
      </div>

      {/* Referrals Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto" dir={isRTL ? 'rtl' : 'ltr'}>
          <table className="w-full text-sm" dir={isRTL ? 'rtl' : 'ltr'}>
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('caseManagement.beneficiaryId')}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('caseManagement.beneficiaryName')}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('common.date')}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('caseManagement.referralType')}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('caseManagement.referredTo')}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('caseManagement.serviceNeeded')}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('caseManagement.urgencyLevel')}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('common.status')}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-center'}`}>{t('caseManagement.consent')}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-center'}`}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {referrals.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                    {t('caseManagement.noReferralsYet')}
                  </td>
                </tr>
              ) : (
                referrals.map(referral => (
                  <tr key={referral.id} className="hover:bg-gray-50">
                    <td className={`px-4 py-3 text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{referral.beneficiaryId}</td>
                    <td className={`px-4 py-3 text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{referral.beneficiaryName}</td>
                    <td className={`px-4 py-3 text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">{referral.referralDate}</td>
                    <td className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                      <span className={`px-2 py-1 rounded text-xs ${referral.referralType === 'Internal' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {referral.referralType === 'Internal' ? t('caseManagement.internal') : t('caseManagement.external')}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{referral.referredTo}</td>
                    <td className={`px-4 py-3 text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{referral.serviceNeeded}</td>
                    <td className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                      <span className={`px-2 py-1 rounded text-xs ${getUrgencyColor(referral.urgencyLevel)}`}>
                        {referral.urgencyLevel === 'High' ? t('caseManagement.urgencyHigh') : 
                         referral.urgencyLevel === 'Medium' ? t('caseManagement.urgencyMedium') : 
                         t('caseManagement.urgencyLow')}
                      </span>
                    </td>
                    <td className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(referral.status)}`}>
                        {referral.status === 'Pending' ? t('caseManagement.statusPending') :
                         referral.status === 'Accepted' ? t('caseManagement.statusAccepted') :
                         referral.status === 'Completed' ? t('caseManagement.statusCompleted') :
                         t('caseManagement.statusRejected')}
                      </span>
                    </td>
                    <td className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-center'}`}>
                      {referral.consentObtained ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-red-600">✗</span>
                      )}
                    </td>
                    <td className={`px-4 py-3 ${isRTL ? 'text-left' : 'text-center'}`}>
                      <div className={`flex items-center gap-2 ${isRTL ? 'justify-start' : 'justify-center'}`}>
                        <button
                          onClick={() => openEdit(referral)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDelete(referral.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className={`sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-lg font-semibold text-gray-900">
                {showAddModal ? t('caseManagement.createReferral') : t('caseManagement.editReferral')}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setEditingReferral(null);
                  resetForm();
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Row 1 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('caseManagement.beneficiaryId')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.beneficiaryId || ''}
                    onChange={(e) => setFormData({ ...formData, beneficiaryId: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                    placeholder="BEN-001"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('caseManagement.beneficiaryName')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.beneficiaryName || ''}
                    onChange={(e) => setFormData({ ...formData, beneficiaryName: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                    placeholder="Ahmed Ali"
                  />
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('caseManagement.referralDate')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.referralDate || ''}
                    onChange={(e) => setFormData({ ...formData, referralDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('caseManagement.referralType')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.referralType || 'Internal'}
                    onChange={(e) => setFormData({ ...formData, referralType: e.target.value as 'Internal' | 'External' })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    <option value="Internal">{t('caseManagement.internal')}</option>
                    <option value="External">{t('caseManagement.external')}</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('caseManagement.urgencyLevel')}
                  </label>
                  <select
                    value={formData.urgencyLevel || 'Medium'}
                    onChange={(e) => setFormData({ ...formData, urgencyLevel: e.target.value as 'Low' | 'Medium' | 'High' })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    <option value="Low">{t('caseManagement.urgencyLow')}</option>
                    <option value="Medium">{t('caseManagement.urgencyMedium')}</option>
                    <option value="High">{t('caseManagement.urgencyHigh')}</option>
                  </select>
                </div>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('caseManagement.referredTo')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.referredTo || ''}
                    onChange={(e) => setFormData({ ...formData, referredTo: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                    placeholder="Al-Salam Hospital"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('caseManagement.serviceNeeded')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.serviceNeeded || ''}
                    onChange={(e) => setFormData({ ...formData, serviceNeeded: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                    placeholder="Mental Health Support"
                  />
                </div>
              </div>

              {/* Row 4 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('common.status')}
                  </label>
                  <select
                    value={formData.status || 'Pending'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Referral['status'] })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    <option value="Pending">{t('caseManagement.statusPending')}</option>
                    <option value="Accepted">{t('caseManagement.statusAccepted')}</option>
                    <option value="Completed">{t('caseManagement.statusCompleted')}</option>
                    <option value="Rejected">{t('caseManagement.statusRejected')}</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('caseManagement.followUpDate')}
                  </label>
                  <input
                    type="date"
                    value={formData.followUpDate || ''}
                    onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              {/* Row 5 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('caseManagement.referredBy')}
                  </label>
                  <input
                    type="text"
                    value={formData.referredBy || ''}
                    onChange={(e) => setFormData({ ...formData, referredBy: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                    placeholder="Dr. Sarah Mohammed"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('caseManagement.contactPerson')}
                  </label>
                  <input
                    type="text"
                    value={formData.contactPerson || ''}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                    placeholder="Dr. Khalid Ahmed"
                  />
                </div>
              </div>

              {/* Row 6 */}
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('caseManagement.contactPhone')}
                </label>
                <input
                  type="text"
                  value={formData.contactPhone || ''}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  placeholder="+967 777 123 456"
                />
              </div>

              {/* Row 7: Consent */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <input
                    type="checkbox"
                    checked={formData.consentObtained || false}
                    onChange={(e) => setFormData({ ...formData, consentObtained: e.target.checked })}
                    className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <label className="block text-sm font-medium text-gray-900">
                      {t('caseManagement.consentObtained')} <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-gray-600 mt-1">
                      {t('caseManagement.consentConfirmationText')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Row 8 */}
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('caseManagement.notes')}
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  placeholder="Additional notes or special requirements"
                />
              </div>
            </div>

            <div className={`sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center gap-3 ${isRTL ? 'flex-row-reverse justify-start' : 'justify-end'}`}>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setEditingReferral(null);
                  resetForm();
                }}
                className="px-6 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={showAddModal ? handleAdd : handleEdit}
                className="px-6 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90"
              >
                {showAddModal ? t('caseManagement.createReferral') : t('caseManagement.updateReferral')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className={`text-lg font-semibold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>{t('caseManagement.deleteReferral')}</h3>
            <p className={`text-sm text-gray-600 mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('caseManagement.deleteReferralMessage')}
            </p>
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse justify-start' : 'justify-end'}`}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingReferralId(null);
                }}
                className="px-6 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDelete}
                className="px-6 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}