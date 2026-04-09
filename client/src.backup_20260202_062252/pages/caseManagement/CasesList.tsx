import { useState } from 'react';
import { Plus, Search, Download, Upload, Edit2, Eye, Trash2, Save, X as XIcon, FileSpreadsheet } from 'lucide-react';

import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { getCaseRecords, createCaseRecord, updateCaseRecord, deleteCaseRecord } from '@/services/caseManagementService';
import type { CaseFilters, CaseRecord } from '@/types/caseManagement';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface CasesListProps {
  projectId: number;
  onViewCase: (caseId: number) => void;
}

export function CasesList({ projectId, onViewCase }: CasesListProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n?.language === 'ar';
  
  const { user } = useAuth();
  const [filters, setFilters] = useState<CaseFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCase, setEditingCase] = useState<CaseRecord | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [showViewDetails, setShowViewDetails] = useState<CaseRecord | null>(null);
  const [cases, setCases] = useState<CaseRecord[]>(getCaseRecords(projectId, filters));
  
  // Form state
  const [formData, setFormData] = useState<Partial<CaseRecord>>({
    beneficiaryCode: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    nationality: '',
    idNumber: '',
    phoneNumber: '',
    email: '',
    address: '',
    caseType: '',
    riskLevel: '',
    referralSource: '',
    intakeDate: new Date().toISOString().split('T')[0],
    status: 'open',
    assignedTo: user?.name || '',
    notes: ''
  });
  
  // Filter by search term
  const filteredCases = cases.filter(c =>
    c.caseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.beneficiaryCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ➕ ADD NEW CASE
  const handleAddCase = () => {
    setShowAddForm(true);
    setEditingCase(null);
    setFormData({
      beneficiaryCode: '',
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: '',
      nationality: '',
      idNumber: '',
      phoneNumber: '',
      email: '',
      address: '',
      caseType: '',
      riskLevel: '',
      referralSource: '',
      intakeDate: new Date().toISOString().split('T')[0],
      status: 'open',
      assignedTo: user?.name || '',
      notes: ''
    });
  };

  // ✏️ EDIT CASE
  const handleEditCase = (caseRecord: CaseRecord) => {
    setEditingCase(caseRecord);
    setFormData(caseRecord);
    setShowAddForm(true);
  };

  // 💾 SAVE CASE (Create or Update)
  const handleSaveCase = () => {
    // Validation
    if (!formData.beneficiaryCode || !formData.firstName || !formData.lastName) {
      alert(t('caseManagement.fillRequiredFields'));
      return;
    }

    if (editingCase) {
      // Update existing case
      const updated = updateCaseRecord(editingCase.id, formData as CaseRecord);
      setCases(cases.map(c => c.id === editingCase.id ? updated : c));
      alert(t('caseManagement.caseUpdatedSuccess'));
    } else {
      // Create new case
      const newCase = createCaseRecord(projectId, formData as CaseRecord);
      setCases([...cases, newCase]);
      alert(t('caseManagement.caseCreatedSuccess'));
    }
    
    setShowAddForm(false);
    setEditingCase(null);
  };

  // 🗑 DELETE CASE
  const handleDeleteCase = () => {
    if (showDeleteConfirm) {
      deleteCaseRecord(showDeleteConfirm);
      setCases(cases.filter(c => c.id !== showDeleteConfirm));
      setShowDeleteConfirm(null);
      alert(t('caseManagement.caseDeletedSuccess'));
    }
  };

  // 📥 EXPORT TO EXCEL
  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Cases List');

    // Define columns
    worksheet.columns = [
      { header: 'Case Code', key: 'caseCode', width: 15 },
      { header: 'Beneficiary Code', key: 'beneficiaryCode', width: 18 },
      { header: 'First Name', key: 'firstName', width: 15 },
      { header: 'Last Name', key: 'lastName', width: 15 },
      { header: 'Date of Birth', key: 'dateOfBirth', width: 15 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Nationality', key: 'nationality', width: 15 },
      { header: 'ID Number', key: 'idNumber', width: 18 },
      { header: 'Phone Number', key: 'phoneNumber', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'Case Type', key: 'caseType', width: 20 },
      { header: 'Risk Level', key: 'riskLevel', width: 12 },
      { header: 'Referral Source', key: 'referralSource', width: 20 },
      { header: 'Intake Date', key: 'intakeDate', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Assigned To', key: 'assignedTo', width: 18 },
      { header: 'Notes', key: 'notes', width: 40 }
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' }
    };

    // Add data
    filteredCases.forEach(caseRecord => {
      worksheet.addRow(caseRecord);
    });

    // Generate Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Cases_List_${new Date().toISOString().split('T')[0]}.xlsx`);
    alert(t('caseManagement.exportSuccess'));
  };

  // 📤 DOWNLOAD EXCEL TEMPLATE
  const handleDownloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Cases Template');

    worksheet.columns = [
      { header: 'Beneficiary Code*', key: 'beneficiaryCode', width: 18 },
      { header: 'First Name*', key: 'firstName', width: 15 },
      { header: 'Last Name*', key: 'lastName', width: 15 },
      { header: 'Date of Birth (YYYY-MM-DD)', key: 'dateOfBirth', width: 20 },
      { header: 'Gender (Male/Female/Other)', key: 'gender', width: 20 },
      { header: 'Nationality', key: 'nationality', width: 15 },
      { header: 'ID Number', key: 'idNumber', width: 18 },
      { header: 'Phone Number', key: 'phoneNumber', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'Case Type', key: 'caseType', width: 20 },
      { header: 'Risk Level (High/Medium/Low)', key: 'riskLevel', width: 25 },
      { header: 'Referral Source', key: 'referralSource', width: 20 },
      { header: 'Intake Date (YYYY-MM-DD)', key: 'intakeDate', width: 20 },
      { header: 'Status (open/closed/on-hold)', key: 'status', width: 25 },
      { header: 'Assigned To', key: 'assignedTo', width: 18 },
      { header: 'Notes', key: 'notes', width: 40 }
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' }
    };

    // Add sample row
    worksheet.addRow({
      beneficiaryCode: 'BEN-2024-001',
      firstName: 'Ahmed',
      lastName: 'Hassan',
      dateOfBirth: '1990-05-15',
      gender: 'Male',
      nationality: 'Syrian',
      idNumber: '1234567890',
      phoneNumber: '+962791234567',
      email: 'ahmed.hassan@example.com',
      address: 'Amman, Jordan',
      caseType: 'Protection',
      riskLevel: 'Medium',
      referralSource: 'Community Center',
      intakeDate: '2024-01-15',
      status: 'open',
      assignedTo: 'Case Worker 1',
      notes: 'Initial assessment completed'
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'Cases_Import_Template.xlsx');
    alert(t('caseManagement.templateDownloadSuccess'));
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className={`p-6 border-b border-gray-200 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h2 className="text-sm font-semibold text-gray-900">{t('caseManagement.casesList')}</h2>
          <p className="text-xs text-gray-600 mt-0.5">{t('common.searchPlaceholder')}</p>
        </div>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={handleDownloadTemplate}
            className={`px-4 py-2 text-sm border border-green-600 text-green-600 rounded-md hover:bg-green-50 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            {t('caseManagement.exportTemplate')}
          </button>
          <button
            onClick={handleExportExcel}
            className={`px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Download className="w-4 h-4" />
            {t('common.export')}
          </button>
          <button
            onClick={handleAddCase}
            className={`px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Plus className="w-4 h-4" />
            {t('caseManagement.addNewCase')}
          </button>
        </div>
      </div>
      
      {/* Search & Filters */}
      <div className="p-4 border-b border-gray-200">
        <div className={`flex items-center gap-4 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="flex-1 min-w-[200px] relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 ${isRTL ? 'end-3' : 'start-3'}`} />
            <input
              type="text"
              placeholder={t('caseManagement.searchCases')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'pe-10 ps-4 text-right' : 'ps-10 pe-4 text-left'}`}
            />
          </div>
          
          <select
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
            className={`px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`}
          >
            <option value="">{t('caseManagement.allStatus')}</option>
            <option value="open">{t('caseManagement.statusOpen')}</option>
            <option value="closed">{t('caseManagement.statusClosed')}</option>
            <option value="on-hold">{t('caseManagement.statusOnHold')}</option>
          </select>

          <select
            value={filters.riskLevel || ''}
            onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value || undefined })}
            className={`px-3 py-2 border border-gray-300 rounded-md text-sm ${isRTL ? 'text-right' : 'text-left'}`}
          >
            <option value="">{t('caseManagement.allRiskLevels')}</option>
            <option value="high">{t('caseManagement.riskHigh')}</option>
            <option value="medium">{t('caseManagement.riskMedium')}</option>
            <option value="low">{t('caseManagement.riskLow')}</option>
          </select>
        </div>
      </div>

      {/* Cases Table */}
      {filteredCases.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          <p className="text-lg font-medium">{t('caseManagement.noCasesFound')}</p>
          <p className="text-sm mt-2">{t('caseManagement.noCasesDescription')}</p>
          <button
            onClick={handleAddCase}
            className="mt-4 px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            {t('caseManagement.addFirstCase')}
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto" dir={isRTL ? 'rtl' : 'ltr'}>
          <table className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('caseManagement.caseCode')}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('caseManagement.beneficiaryCode')}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('common.name')}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('caseManagement.caseType')}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('caseManagement.riskLevel')}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('common.status')}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('caseManagement.assignedTo')}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('caseManagement.intakeDate')}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-center'}`}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCases.map((caseRecord) => (
                <tr key={caseRecord.id} className="hover:bg-gray-50">
                  <td className={`px-4 py-3 text-sm font-medium text-primary ${isRTL ? 'text-right' : 'text-left'}`}>{caseRecord.caseCode}</td>
                  <td className={`px-4 py-3 text-sm text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{caseRecord.beneficiaryCode}</td>
                  <td className={`px-4 py-3 text-sm text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{caseRecord.firstName} {caseRecord.lastName}</td>
                  <td className={`px-4 py-3 text-sm text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{caseRecord.caseType}</td>
                  <td className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase ${
                      caseRecord.riskLevel === 'high' ? 'bg-red-100 text-red-700' :
                      caseRecord.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {caseRecord.riskLevel}
                    </span>
                  </td>
                  <td className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase ${
                      caseRecord.status === 'open' ? 'bg-blue-100 text-blue-700' :
                      caseRecord.status === 'closed' ? 'bg-gray-100 text-gray-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {caseRecord.status}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-sm text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{caseRecord.assignedTo}</td>
                  <td className={`px-4 py-3 text-sm text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">{caseRecord.intakeDate}</td>
                  <td className={`px-4 py-3 ${isRTL ? 'text-left' : 'text-center'}`}>
                    <div className={`flex items-center gap-2 ${isRTL ? 'justify-start' : 'justify-center'}`}>
                      <button
                        onClick={() => onViewCase(caseRecord.id)}
                        className="text-blue-600 hover:text-blue-800"
                        title={t('caseManagement.viewFullProfile')}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditCase(caseRecord)}
                        className="text-green-600 hover:text-green-800"
                        title={t('caseManagement.editCase')}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(caseRecord.id)}
                        className="text-red-600 hover:text-red-800"
                        title={t('caseManagement.deleteCase')}
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
      )}

      {/* Add/Edit Case Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className={`sticky top-0 bg-white flex items-center justify-between p-6 border-b border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-lg font-semibold text-gray-900">
                {editingCase ? t('caseManagement.editCase') : t('caseManagement.addNewCase')}
              </h3>
              <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600">
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Personal Information */}
              <div>
                <h4 className={`text-sm font-semibold text-gray-900 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>{t('caseManagement.personalInformation')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('caseManagement.beneficiaryCode')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.beneficiaryCode || ''}
                      onChange={(e) => setFormData({ ...formData, beneficiaryCode: e.target.value })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                      placeholder={t('caseManagement.beneficiaryCodePlaceholder')}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('caseManagement.idNumber')}
                    </label>
                    <input
                      type="text"
                      value={formData.idNumber || ''}
                      onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                      placeholder={t('caseManagement.idNumberPlaceholder')}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('caseManagement.firstName')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.firstName || ''}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('caseManagement.lastName')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.lastName || ''}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('caseManagement.dateOfBirth')}
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfBirth || ''}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('caseManagement.gender')}
                    </label>
                    <select
                      value={formData.gender || ''}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                    >
                      <option value="">{t('caseManagement.selectGender')}</option>
                      <option value="Male">{t('caseManagement.genderMale')}</option>
                      <option value="Female">{t('caseManagement.genderFemale')}</option>
                      <option value="Other">{t('caseManagement.genderOther')}</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-xs font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('caseManagement.nationality')}
                    </label>
                    <input
                      type="text"
                      value={formData.nationality || ''}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h4 className={`text-sm font-semibold text-gray-900 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>{t('caseManagement.contactInformation')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('caseManagement.phoneNumber')}
                    </label>
                    <input
                      type="tel"
                      value={formData.phoneNumber || ''}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                      placeholder="+962791234567"
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('caseManagement.email')}
                    </label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className={`block text-xs font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('caseManagement.address')}
                    </label>
                    <textarea
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              {/* Case Information */}
              <div>
                <h4 className={`text-sm font-semibold text-gray-900 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>{t('caseManagement.caseInformation')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('caseManagement.caseType')}
                    </label>
                    <select
                      value={formData.caseType || ''}
                      onChange={(e) => setFormData({ ...formData, caseType: e.target.value })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                    >
                      <option value="">{t('caseManagement.selectCaseType')}</option>
                      <option value="Protection">{t('caseManagement.typeProtection')}</option>
                      <option value="GBV">GBV</option>
                      <option value="Child Protection">{t('caseManagement.typeChildProtection')}</option>
                      <option value="Mental Health">{t('caseManagement.typeMentalHealth')}</option>
                      <option value="Legal Assistance">{t('caseManagement.typeLegalAssistance')}</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-xs font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('caseManagement.riskLevel')}
                    </label>
                    <select
                      value={formData.riskLevel || ''}
                      onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                    >
                      <option value="">{t('caseManagement.selectRiskLevel')}</option>
                      <option value="high">{t('caseManagement.riskHigh')}</option>
                      <option value="medium">{t('caseManagement.riskMedium')}</option>
                      <option value="low">{t('caseManagement.riskLow')}</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-xs font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('caseManagement.referralSource')}
                    </label>
                    <input
                      type="text"
                      value={formData.referralSource || ''}
                      onChange={(e) => setFormData({ ...formData, referralSource: e.target.value })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                      placeholder="e.g., Community Center, Hospital"
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('caseManagement.intakeDate')}
                    </label>
                    <input
                      type="date"
                      value={formData.intakeDate || ''}
                      onChange={(e) => setFormData({ ...formData, intakeDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('common.status')}
                    </label>
                    <select
                      value={formData.status || 'open'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                    >
                      <option value="open">{t('caseManagement.statusOpen')}</option>
                      <option value="closed">{t('caseManagement.statusClosed')}</option>
                      <option value="on-hold">{t('caseManagement.statusOnHold')}</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-xs font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('caseManagement.assignedTo')}
                    </label>
                    <input
                      type="text"
                      value={formData.assignedTo || ''}
                      onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className={`block text-xs font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('caseManagement.notes')}
                    </label>
                    <textarea
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                      rows={3}
                      placeholder="Any additional notes or observations..."
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className={`sticky bottom-0 bg-gray-50 p-6 border-t border-gray-200 flex items-center gap-3 ${isRTL ? 'flex-row-reverse justify-start' : 'justify-end'}`}>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-6 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveCase}
                className="px-6 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingCase ? t('caseManagement.updateCase') : t('caseManagement.createCase')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className={`text-lg font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t('caseManagement.confirmDeleteCase')}</h3>
            <p className={`text-sm text-gray-600 mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('caseManagement.caseDeleteMessage')}
            </p>
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse justify-start' : 'justify-end'}`}>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteCase}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
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