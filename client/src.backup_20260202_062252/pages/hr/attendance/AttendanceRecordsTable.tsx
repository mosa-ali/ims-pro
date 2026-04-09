/**
 * ============================================================================
 * ATTENDANCE RECORDS TABLE
 * ============================================================================
 * 
 * Complete attendance records management
 * - Search & filter
 * - All columns visible
 * - Row actions (view, edit, approve, etc.)
 * - Export functionality
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Check,
  X,
  Plus,
  AlertCircle,
  Clock,
  Timer,
  Lock,
  FileText
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { BackToModulesButton } from '../BackToModulesButton';
import { attendanceService, AttendanceRecord, AttendanceSource, AttendanceStatus } from '@/app/services/attendanceService';

export function AttendanceRecordsTable() {
  const { language, isRTL } = useLanguage();

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current');
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadRecords();
  }, [selectedPeriod]);

  useEffect(() => {
    applyFilters();
  }, [records, searchTerm, selectedStatus, selectedSource]);

  const loadRecords = () => {
    let allRecords: AttendanceRecord[] = [];
    
    if (selectedPeriod === 'current') {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      allRecords = attendanceService.getByPeriod(currentMonth);
    } else if (selectedPeriod === 'today') {
      allRecords = attendanceService.getToday();
    } else {
      allRecords = attendanceService.getAll();
    }
    
    // Sort by date descending
    allRecords.sort((a, b) => b.date.localeCompare(a.date));
    
    setRecords(allRecords);
  };

  const applyFilters = () => {
    let filtered = [...records];
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.staffId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(r => r.status === selectedStatus);
    }
    
    // Source filter
    if (selectedSource !== 'all') {
      filtered = filtered.filter(r => r.source === selectedSource);
    }
    
    setFilteredRecords(filtered);
  };

  const handleApprove = (recordId: string) => {
    const success = attendanceService.approve(recordId, 'Current User'); // TODO: Get real user
    if (success) {
      loadRecords();
    }
  };

  const handleReject = (recordId: string) => {
    const reason = prompt(language === 'en' ? 'Rejection reason:' : 'سبب الرفض:');
    if (reason) {
      const success = attendanceService.reject(recordId, 'Current User', reason);
      if (success) {
        loadRecords();
      }
    }
  };

  const handleViewDetail = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  const getSourceBadge = (source: AttendanceSource) => {
    switch (source) {
      case 'microsoft_teams_shifts':
        return { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '🟦', label: language === 'en' ? 'Teams Shifts' : 'Teams Shifts' };
      case 'manual_hr_entry':
        return { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: '🟨', label: language === 'en' ? 'Manual HR' : 'يدوي' };
      case 'microsoft_teams_presence':
        return { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: '⚪', label: language === 'en' ? 'Teams Presence' : 'Teams Presence' };
    }
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return { color: 'bg-green-100 text-green-700', label: language === 'en' ? 'Present' : 'حاضر' };
      case 'absent':
        return { color: 'bg-red-100 text-red-700', label: language === 'en' ? 'Absent' : 'غائب' };
      case 'late':
        return { color: 'bg-yellow-100 text-yellow-700', label: language === 'en' ? 'Late' : 'متأخر' };
      case 'on_leave':
        return { color: 'bg-blue-100 text-blue-700', label: language === 'en' ? 'On Leave' : 'في إجازة' };
      case 'field_work':
        return { color: 'bg-purple-100 text-purple-700', label: language === 'en' ? 'Field Work' : 'عمل ميداني' };
      case 'overtime':
        return { color: 'bg-indigo-100 text-indigo-700', label: language === 'en' ? 'Overtime' : 'عمل إضافي' };
    }
  };

  const getApprovalBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return { color: 'bg-green-100 text-green-700', label: language === 'en' ? 'Approved' : 'معتمد' };
      case 'pending':
        return { color: 'bg-orange-100 text-orange-700', label: language === 'en' ? 'Pending' : 'معلق' };
      case 'rejected':
        return { color: 'bg-red-100 text-red-700', label: language === 'en' ? 'Rejected' : 'مرفوض' };
    }
  };

  const t = {
    title: language === 'en' ? 'Attendance Records' : 'سجلات الحضور',
    subtitle: language === 'en' ? 'View, search, and manage all attendance records' : 'عرض والبحث وإدارة جميع سجلات الحضور',
    
    search: language === 'en' ? 'Search by name or ID...' : 'بحث بالاسم أو الرقم...',
    filterStatus: language === 'en' ? 'Filter by Status' : 'تصفية حسب الحالة',
    filterSource: language === 'en' ? 'Filter by Source' : 'تصفية حسب المصدر',
    filterPeriod: language === 'en' ? 'Period' : 'الفترة',
    
    today: language === 'en' ? 'Today' : 'اليوم',
    currentMonth: language === 'en' ? 'Current Month' : 'الشهر الحالي',
    allRecords: language === 'en' ? 'All Records' : 'جميع السجلات',
    all: language === 'en' ? 'All' : 'الكل',
    
    export: language === 'en' ? 'Export' : 'تصدير',
    addRecord: language === 'en' ? 'Add Record' : 'إضافة سجل',
    
    // Table Headers
    staffName: language === 'en' ? 'Staff Name' : 'اسم الموظف',
    date: language === 'en' ? 'Date' : 'التاريخ',
    plannedHours: language === 'en' ? 'Planned Hours' : 'الساعات المخططة',
    actualHours: language === 'en' ? 'Actual Hours' : 'الساعات الفعلية',
    overtimeHours: language === 'en' ? 'Overtime' : 'عمل إضافي',
    status: language === 'en' ? 'Status' : 'الحالة',
    source: language === 'en' ? 'Source' : 'المصدر',
    approval: language === 'en' ? 'Approval' : 'الموافقة',
    payrollEligible: language === 'en' ? 'Payroll' : 'الرواتب',
    actions: language === 'en' ? 'Actions' : 'الإجراءات',
    
    yes: language === 'en' ? 'Yes' : 'نعم',
    no: language === 'en' ? 'No' : 'لا',
    
    view: language === 'en' ? 'View' : 'عرض',
    approve: language === 'en' ? 'Approve' : 'موافقة',
    reject: language === 'en' ? 'Reject' : 'رفض',
    locked: language === 'en' ? 'Locked' : 'مغلق',
    
    noRecords: language === 'en' ? 'No attendance records found' : 'لم يتم العثور على سجلات حضور',
    totalRecords: language === 'en' ? 'Total Records' : 'إجمالي السجلات'
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <BackToModulesButton 
        targetPath="/organization/hr/attendance"
        parentModuleName={language === 'en' ? 'Attendance Dashboard' : 'لوحة الحضور'}
      />

      {/* Header */}
      <div>
        <h1 className={`text-2xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.title}
        </h1>
        <p className={`text-sm text-gray-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.subtitle}
        </p>
      </div>

      {/* Filters & Actions Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className={`flex flex-col lg:flex-row gap-4 ${isRTL ? 'lg:flex-row-reverse' : ''}`}>
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t.search}
                className={`w-full ${isRTL ? 'pr-10 text-right' : 'pl-10'} py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              />
            </div>
          </div>

          {/* Period Filter */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className={`px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-right' : ''}`}
          >
            <option value="today">{t.today}</option>
            <option value="current">{t.currentMonth}</option>
            <option value="all">{t.allRecords}</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className={`px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-right' : ''}`}
          >
            <option value="all">{t.all}</option>
            <option value="present">{language === 'en' ? 'Present' : 'حاضر'}</option>
            <option value="absent">{language === 'en' ? 'Absent' : 'غائب'}</option>
            <option value="late">{language === 'en' ? 'Late' : 'متأخر'}</option>
            <option value="on_leave">{language === 'en' ? 'On Leave' : 'في إجازة'}</option>
            <option value="field_work">{language === 'en' ? 'Field Work' : 'عمل ميداني'}</option>
            <option value="overtime">{language === 'en' ? 'Overtime' : 'عمل إضافي'}</option>
          </select>

          {/* Source Filter */}
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className={`px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-right' : ''}`}
          >
            <option value="all">{t.all}</option>
            <option value="microsoft_teams_shifts">{language === 'en' ? 'Teams Shifts' : 'Teams Shifts'}</option>
            <option value="manual_hr_entry">{language === 'en' ? 'Manual HR' : 'يدوي'}</option>
            <option value="microsoft_teams_presence">{language === 'en' ? 'Teams Presence' : 'Teams Presence'}</option>
          </select>

          {/* Export Button */}
          <button className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Download className="w-4 h-4" />
            <span>{t.export}</span>
          </button>
        </div>

        {/* Records Count */}
        <div className={`mt-4 pt-4 border-t border-gray-200 ${isRTL ? 'text-right' : 'text-left'}`}>
          <p className="text-sm text-gray-600">
            {t.totalRecords}: <span className="font-semibold text-gray-900">{filteredRecords.length}</span>
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.staffName}
                </th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.date}
                </th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.plannedHours}
                </th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.actualHours}
                </th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.overtimeHours}
                </th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.status}
                </th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.source}
                </th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.approval}
                </th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.payrollEligible}
                </th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-500">
                    {t.noRecords}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const sourceBadge = getSourceBadge(record.source);
                  const statusBadge = getStatusBadge(record.status);
                  const approvalBadge = getApprovalBadge(record.approvalStatus);

                  return (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{record.staffName}</p>
                          <p className="text-xs text-gray-500">{record.staffId}</p>
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-sm text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {record.date}
                      </td>
                      <td className={`px-4 py-3 text-sm text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {record.plannedHours.toFixed(1)}h
                      </td>
                      <td className={`px-4 py-3 text-sm text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {record.actualHours.toFixed(1)}h
                      </td>
                      <td className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {record.overtimeHours > 0 ? (
                          <span className="inline-flex items-center gap-1 text-sm font-medium text-purple-600">
                            <Timer className="w-4 h-4" />
                            {record.overtimeHours.toFixed(1)}h
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
                            {statusBadge.label}
                          </span>
                          {record.isFlagged && (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      </td>
                      <td className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${sourceBadge.color}`}>
                          {sourceBadge.icon} {sourceBadge.label}
                        </span>
                      </td>
                      <td className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${approvalBadge.color}`}>
                          {approvalBadge.label}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                        {record.payrollEligible ? (
                          <span className="text-green-600 font-medium">{t.yes}</span>
                        ) : (
                          <span className="text-red-600 font-medium">{t.no}</span>
                        )}
                      </td>
                      <td className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <button
                            onClick={() => handleViewDetail(record)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title={t.view}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {!record.periodLocked && record.approvalStatus === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(record.id)}
                                className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                                title={t.approve}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleReject(record.id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title={t.reject}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {record.periodLocked && (
                            <Lock className="w-4 h-4 text-gray-400" title={t.locked} />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal - Placeholder for now */}
      {showDetailModal && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className={`p-6 border-b border-gray-200 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h2 className="text-xl font-bold text-gray-900">
                {language === 'en' ? 'Attendance Detail' : 'تفاصيل الحضور'}
              </h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-600">
                {language === 'en' ? 'Detailed view coming soon...' : 'العرض التفصيلي قريباً...'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
