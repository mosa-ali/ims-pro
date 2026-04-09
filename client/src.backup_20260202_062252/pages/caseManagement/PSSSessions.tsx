import { useState } from 'react';
import { Plus, Edit, Trash2, Download, Upload, X, Calendar } from 'lucide-react';

import { useTranslation } from 'react-i18next';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface PSSSession {
  id: number;
  beneficiaryId: string;
  beneficiaryName: string;
  sessionDate: string;
  sessionType: 'Individual' | 'Group';
  sessionDuration: number; // minutes
  pssApproach: string;
  topicsDiscussed: string;
  followUpDate: string;
  facilitator: string;
  notes: string;
  participantsCount?: number; // for group sessions
}

export function PSSSessions({ projectId }: { projectId: number }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n?.language === 'ar';
  
  const [sessions, setSessions] = useState<PSSSession[]>([
    {
      id: 1,
      beneficiaryId: 'BEN-001',
      beneficiaryName: 'Ahmed Ali',
      sessionDate: '2024-01-15',
      sessionType: 'Individual',
      sessionDuration: 60,
      pssApproach: 'Cognitive Behavioral Therapy',
      topicsDiscussed: 'Trauma processing, Coping strategies',
      followUpDate: '2024-01-22',
      facilitator: 'Dr. Sarah Mohammed',
      notes: 'Beneficiary showed significant progress'
    },
    {
      id: 2,
      beneficiaryId: 'GROUP-01',
      beneficiaryName: 'Youth Support Group',
      sessionDate: '2024-01-14',
      sessionType: 'Group',
      sessionDuration: 90,
      pssApproach: 'Group Therapy',
      topicsDiscussed: 'Peer support, Stress management',
      followUpDate: '2024-01-21',
      facilitator: 'Dr. Sarah Mohammed',
      notes: 'Good participation from all members',
      participantsCount: 12
    }
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingSession, setEditingSession] = useState<PSSSession | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<PSSSession>>({
    sessionType: 'Individual',
    sessionDuration: 60
  });

  const resetForm = () => {
    setFormData({
      sessionType: 'Individual',
      sessionDuration: 60
    });
  };

  const handleAdd = () => {
    if (!formData.beneficiaryId || !formData.beneficiaryName || !formData.sessionDate || !formData.pssApproach || !formData.facilitator) {
      alert(t('caseManagement.fillRequiredFields'));
      return;
    }

    const newSession: PSSSession = {
      id: Math.max(0, ...sessions.map(s => s.id)) + 1,
      beneficiaryId: formData.beneficiaryId!,
      beneficiaryName: formData.beneficiaryName!,
      sessionDate: formData.sessionDate!,
      sessionType: formData.sessionType as 'Individual' | 'Group',
      sessionDuration: formData.sessionDuration || 60,
      pssApproach: formData.pssApproach!,
      topicsDiscussed: formData.topicsDiscussed || '',
      followUpDate: formData.followUpDate || '',
      facilitator: formData.facilitator!,
      notes: formData.notes || '',
      participantsCount: formData.participantsCount
    };

    setSessions([...sessions, newSession]);
    setShowAddModal(false);
    resetForm();
    alert(t('caseManagement.sessionAddedSuccess'));
  };

  const handleEdit = () => {
    if (!editingSession || !formData.beneficiaryId || !formData.beneficiaryName || !formData.sessionDate) {
      alert(t('caseManagement.fillRequiredFields'));
      return;
    }

    setSessions(sessions.map(s =>
      s.id === editingSession.id
        ? { ...s, ...formData } as PSSSession
        : s
    ));

    setShowEditModal(false);
    setEditingSession(null);
    resetForm();
    alert(t('caseManagement.sessionUpdatedSuccess'));
  };

  const handleDelete = () => {
    if (deletingSessionId !== null) {
      setSessions(sessions.filter(s => s.id !== deletingSessionId));
      setShowDeleteModal(false);
      setDeletingSessionId(null);
      alert(t('caseManagement.sessionDeletedSuccess'));
    }
  };

  const openEdit = (session: PSSSession) => {
    setEditingSession(session);
    setFormData(session);
    setShowEditModal(true);
  };

  const openDelete = (sessionId: number) => {
    setDeletingSessionId(sessionId);
    setShowDeleteModal(true);
  };

  // Excel Export
  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(t('caseManagement.pssSessionsTitle'));

    // Define columns with bilingual headers
    worksheet.columns = [
      { header: t('caseManagement.sessionId'), key: 'id', width: 12 },
      { header: t('caseManagement.beneficiaryCode'), key: 'beneficiaryId', width: 15 },
      { header: t('common.name'), key: 'beneficiaryName', width: 25 },
      { header: t('caseManagement.sessionDate'), key: 'sessionDate', width: 15 },
      { header: t('caseManagement.sessionType'), key: 'sessionType', width: 15 },
      { header: t('caseManagement.sessionDuration'), key: 'sessionDuration', width: 15 },
      { header: t('caseManagement.pssApproach'), key: 'pssApproach', width: 30 },
      { header: t('caseManagement.topicsDiscussed'), key: 'topicsDiscussed', width: 40 },
      { header: t('caseManagement.followUpDate'), key: 'followUpDate', width: 15 },
      { header: t('caseManagement.facilitator'), key: 'facilitator', width: 25 },
      { header: t('caseManagement.participantsCount'), key: 'participantsCount', width: 18 },
      { header: t('caseManagement.notes'), key: 'notes', width: 40 }
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Add data
    sessions.forEach(session => {
      worksheet.addRow({
        id: session.id,
        beneficiaryId: session.beneficiaryId,
        beneficiaryName: session.beneficiaryName,
        sessionDate: session.sessionDate,
        sessionType: session.sessionType,
        sessionDuration: session.sessionDuration,
        pssApproach: session.pssApproach,
        topicsDiscussed: session.topicsDiscussed,
        followUpDate: session.followUpDate,
        facilitator: session.facilitator,
        participantsCount: session.participantsCount || '',
        notes: session.notes
      });
    });

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `PSS_Sessions_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Excel Import Template
  const handleDownloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('PSS Sessions Template');

    worksheet.columns = [
      { header: `${t('caseManagement.beneficiaryCode')}*`, key: 'beneficiaryId', width: 15 },
      { header: `${t('common.name')}*`, key: 'beneficiaryName', width: 25 },
      { header: `${t('caseManagement.sessionDate')}* (YYYY-MM-DD)`, key: 'sessionDate', width: 25 },
      { header: `${t('caseManagement.sessionType')}* (Individual/Group)`, key: 'sessionType', width: 30 },
      { header: `${t('caseManagement.sessionDuration')} (${t('caseManagement.minutes')})*`, key: 'sessionDuration', width: 20 },
      { header: `${t('caseManagement.pssApproach')}*`, key: 'pssApproach', width: 30 },
      { header: t('caseManagement.topicsDiscussed'), key: 'topicsDiscussed', width: 40 },
      { header: `${t('caseManagement.followUpDate')} (YYYY-MM-DD)`, key: 'followUpDate', width: 25 },
      { header: `${t('caseManagement.facilitator')}*`, key: 'facilitator', width: 25 },
      { header: t('caseManagement.participantsCount'), key: 'participantsCount', width: 25 },
      { header: t('caseManagement.notes'), key: 'notes', width: 40 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };

    // Add sample row
    worksheet.addRow({
      beneficiaryId: 'BEN-001',
      beneficiaryName: 'Ahmed Ali',
      sessionDate: '2024-01-15',
      sessionType: 'Individual',
      sessionDuration: 60,
      pssApproach: 'Cognitive Behavioral Therapy',
      topicsDiscussed: 'Trauma processing, Coping strategies',
      followUpDate: '2024-01-22',
      facilitator: 'Dr. Sarah Mohammed',
      participantsCount: '',
      notes: 'Sample session record'
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'PSS_Sessions_Import_Template.xlsx');
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

    const importedSessions: PSSSession[] = [];
    let maxId = Math.max(0, ...sessions.map(s => s.id));

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const sessionData = {
        id: ++maxId,
        beneficiaryId: row.getCell(1).value?.toString() || '',
        beneficiaryName: row.getCell(2).value?.toString() || '',
        sessionDate: row.getCell(3).value?.toString() || '',
        sessionType: row.getCell(4).value?.toString() as 'Individual' | 'Group' || 'Individual',
        sessionDuration: Number(row.getCell(5).value) || 60,
        pssApproach: row.getCell(6).value?.toString() || '',
        topicsDiscussed: row.getCell(7).value?.toString() || '',
        followUpDate: row.getCell(8).value?.toString() || '',
        facilitator: row.getCell(9).value?.toString() || '',
        participantsCount: row.getCell(10).value ? Number(row.getCell(10).value) : undefined,
        notes: row.getCell(11).value?.toString() || ''
      };

      if (sessionData.beneficiaryId && sessionData.beneficiaryName && sessionData.sessionDate) {
        importedSessions.push(sessionData);
      }
    });

    setSessions([...sessions, ...importedSessions]);
    alert(`${t('common.success')}: ${importedSessions.length} sessions imported`);
    event.target.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h3 className="text-sm font-semibold text-gray-900">{t('caseManagement.pssSessionsTitle')}</h3>
          <p className="text-xs text-gray-600 mt-0.5">{t('caseManagement.pssSessionsDescription')}</p>
        </div>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={handleDownloadTemplate}
            className={`px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Download className="w-4 h-4" />
            {t('caseManagement.exportSessionsTemplate')}
          </button>
          <label className={`px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 cursor-pointer ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Upload className="w-4 h-4" />
            {t('caseManagement.importSessions')}
            <input type="file" accept=".xlsx,.xls" onChange={handleImportExcel} className="hidden" />
          </label>
          <button
            onClick={handleExportExcel}
            className={`px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Download className="w-4 h-4" />
            {t('caseManagement.exportSessions')}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className={`px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Plus className="w-4 h-4" />
            {t('caseManagement.addSession')}
          </button>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto" dir={isRTL ? 'rtl' : 'ltr'}>
          <table className="w-full text-sm" dir={isRTL ? 'rtl' : 'ltr'}>
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>ID</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('caseManagement.beneficiaryCode')}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('caseManagement.sessionDate')}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('caseManagement.sessionType')}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('caseManagement.sessionDuration')}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('caseManagement.pssApproach')}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('caseManagement.facilitator')}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('caseManagement.followUpDate')}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-center'}`}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    {t('caseManagement.noSessionsFound')}
                  </td>
                </tr>
              ) : (
                sessions.map(session => (
                  <tr key={session.id} className="hover:bg-gray-50">
                    <td className={`px-4 py-3 text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{session.beneficiaryId}</td>
                    <td className={`px-4 py-3 text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{session.beneficiaryName}</td>
                    <td className={`px-4 py-3 text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">{session.sessionDate}</td>
                    <td className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                      <span className={`px-2 py-1 rounded text-xs ${session.sessionType === 'Individual' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {session.sessionType === 'Individual' ? t('caseManagement.typeIndividual') : t('caseManagement.typeGroup')}
                        {session.sessionType === 'Group' && session.participantsCount && ` (${session.participantsCount})`}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">{session.sessionDuration} {t('caseManagement.minutes')}</td>
                    <td className={`px-4 py-3 text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{session.pssApproach}</td>
                    <td className={`px-4 py-3 text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{session.facilitator}</td>
                    <td className={`px-4 py-3 text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">{session.followUpDate || '-'}</td>
                    <td className={`px-4 py-3 ${isRTL ? 'text-left' : 'text-center'}`}>
                      <div className={`flex items-center gap-2 ${isRTL ? 'justify-start' : 'justify-center'}`}>
                        <button
                          onClick={() => openEdit(session)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title={t('caseManagement.editSession')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDelete(session.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title={t('caseManagement.deleteSession')}
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
                {showAddModal ? t('caseManagement.addNewSession') : t('caseManagement.updateSession')}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setEditingSession(null);
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
                    {t('caseManagement.beneficiaryCode')} <span className="text-red-500">*</span>
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
                    {t('common.name')} <span className="text-red-500">*</span>
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
                    {t('caseManagement.sessionDate')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.sessionDate || ''}
                    onChange={(e) => setFormData({ ...formData, sessionDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('caseManagement.sessionType')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.sessionType || 'Individual'}
                    onChange={(e) => setFormData({ ...formData, sessionType: e.target.value as 'Individual' | 'Group' })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    <option value="Individual">{t('caseManagement.typeIndividual')}</option>
                    <option value="Group">{t('caseManagement.typeGroup')}</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('caseManagement.sessionDuration')} ({t('caseManagement.minutes')}) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.sessionDuration || 60}
                    onChange={(e) => setFormData({ ...formData, sessionDuration: Number(e.target.value) })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                    min="1"
                  />
                </div>
              </div>

              {/* Row 3 */}
              {formData.sessionType === 'Group' && (
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('caseManagement.participantsCount')}
                  </label>
                  <input
                    type="number"
                    value={formData.participantsCount || ''}
                    onChange={(e) => setFormData({ ...formData, participantsCount: Number(e.target.value) })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                    placeholder="12"
                    min="1"
                  />
                </div>
              )}

              {/* Row 4 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('caseManagement.pssApproach')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.pssApproach || ''}
                    onChange={(e) => setFormData({ ...formData, pssApproach: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                    placeholder="Cognitive Behavioral Therapy"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('caseManagement.facilitator')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.facilitator || ''}
                    onChange={(e) => setFormData({ ...formData, facilitator: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                    placeholder="Dr. Sarah Mohammed"
                  />
                </div>
              </div>

              {/* Row 5 */}
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('caseManagement.topicsDiscussed')}
                </label>
                <input
                  type="text"
                  value={formData.topicsDiscussed || ''}
                  onChange={(e) => setFormData({ ...formData, topicsDiscussed: e.target.value })}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  placeholder="Trauma processing, Coping strategies"
                />
              </div>

              {/* Row 6 */}
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

              {/* Row 7 */}
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('caseManagement.notes')}
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  placeholder="Session observations and notes"
                />
              </div>
            </div>

            <div className={`sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center gap-3 ${isRTL ? 'flex-row-reverse justify-start' : 'justify-end'}`}>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setEditingSession(null);
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
                {showAddModal ? t('caseManagement.addNewSession') : t('caseManagement.updateSession')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className={`text-lg font-semibold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('caseManagement.confirmDeleteSession')}
            </h3>
            <p className={`text-sm text-gray-600 mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('caseManagement.sessionDeleteMessage')}
            </p>
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse justify-start' : 'justify-end'}`}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingSessionId(null);
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