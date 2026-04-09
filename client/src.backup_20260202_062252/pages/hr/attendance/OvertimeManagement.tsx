/**
 * ============================================================================
 * OVERTIME MANAGEMENT
 * ============================================================================
 * 
 * Approve and track overtime
 * - Overtime requests list
 * - Pending approvals
 * - Approve/reject actions
 * - Overtime statistics
 * - Payroll eligibility tracking
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import {
  Timer,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  Users,
  DollarSign,
  Filter,
  Search
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { BackToModulesButton } from '../BackToModulesButton';
import { attendanceService, AttendanceRecord } from '@/app/services/attendanceService';

export function OvertimeManagement() {
  const { language, isRTL } = useLanguage();

  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current');

  useEffect(() => {
    loadRecords();
  }, [selectedPeriod]);

  useEffect(() => {
    applyFilters();
  }, [allRecords, filterStatus, searchTerm]);

  const loadRecords = () => {
    let records: AttendanceRecord[] = [];

    if (selectedPeriod === 'current') {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      records = attendanceService.getByPeriod(currentMonth);
    } else {
      records = attendanceService.getAll();
    }

    // Filter only records with overtime
    const overtimeRecords = records.filter(r => r.overtimeHours > 0);
    
    // Sort by date descending
    overtimeRecords.sort((a, b) => b.date.localeCompare(a.date));
    
    setAllRecords(overtimeRecords);
  };

  const applyFilters = () => {
    let filtered = [...allRecords];

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => r.overtimeApprovalStatus === filterStatus);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(r =>
        r.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.staffId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredRecords(filtered);
  };

  const handleApproveOvertime = (recordId: string) => {
    const success = attendanceService.approveOvertime(recordId, 'Current User'); // TODO: Get real user
    if (success) {
      loadRecords();
      alert(language === 'en' ? 'Overtime approved successfully' : 'تمت الموافقة على العمل الإضافي بنجاح');
    }
  };

  const handleRejectOvertime = (recordId: string) => {
    const reason = prompt(language === 'en' ? 'Rejection reason:' : 'سبب الرفض:');
    if (reason) {
      const success = attendanceService.rejectOvertime(recordId, 'Current User');
      if (success) {
        loadRecords();
        alert(language === 'en' ? 'Overtime rejected' : 'تم رفض العمل الإضافي');
      }
    }
  };

  const calculateStats = () => {
    const pending = filteredRecords.filter(r => r.overtimeApprovalStatus === 'pending');
    const approved = filteredRecords.filter(r => r.overtimeApprovalStatus === 'approved');
    const rejected = filteredRecords.filter(r => r.overtimeApprovalStatus === 'rejected');
    
    const totalOvertimeHours = approved.reduce((sum, r) => sum + r.overtimeHours, 0);
    const uniqueStaff = new Set(filteredRecords.map(r => r.staffId)).size;

    return {
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
      totalHours: totalOvertimeHours,
      uniqueStaff
    };
  };

  const stats = calculateStats();

  const t = {
    title: language === 'en' ? 'Overtime Management' : 'إدارة العمل الإضافي',
    subtitle: language === 'en' ? 'Approve, reject, and track overtime hours' : 'الموافقة والرفض وتتبع ساعات العمل الإضافي',
    
    // Filters
    search: language === 'en' ? 'Search by name or ID...' : 'بحث بالاسم أو الرقم...',
    filterStatus: language === 'en' ? 'Filter by Status' : 'تصفية حسب الحالة',
    period: language === 'en' ? 'Period' : 'الفترة',
    currentMonth: language === 'en' ? 'Current Month' : 'الشهر الحالي',
    allPeriods: language === 'en' ? 'All Periods' : 'جميع الفترات',
    all: language === 'en' ? 'All' : 'الكل',
    
    // Stats
    pendingApprovals: language === 'en' ? 'Pending Approvals' : 'الموافقات المعلقة',
    approvedOvertime: language === 'en' ? 'Approved Overtime' : 'عمل إضافي معتمد',
    rejectedOvertime: language === 'en' ? 'Rejected Overtime' : 'عمل إضافي مرفوض',
    totalHours: language === 'en' ? 'Total Hours' : 'إجمالي الساعات',
    staffWithOvertime: language === 'en' ? 'Staff with Overtime' : 'موظفون بعمل إضافي',
    
    // Table
    staffName: language === 'en' ? 'Staff Name' : 'اسم الموظف',
    date: language === 'en' ? 'Date' : 'التاريخ',
    plannedHours: language === 'en' ? 'Planned' : 'مخطط',
    actualHours: language === 'en' ? 'Actual' : 'فعلي',
    overtimeHours: language === 'en' ? 'Overtime' : 'عمل إضافي',
    status: language === 'en' ? 'Status' : 'الحالة',
    payroll: language === 'en' ? 'Payroll' : 'الرواتب',
    actions: language === 'en' ? 'Actions' : 'الإجراءات',
    
    // Status
    pending: language === 'en' ? 'Pending' : 'معلق',
    approved: language === 'en' ? 'Approved' : 'معتمد',
    rejected: language === 'en' ? 'Rejected' : 'مرفوض',
    
    // Actions
    approve: language === 'en' ? 'Approve' : 'موافقة',
    reject: language === 'en' ? 'Reject' : 'رفض',
    
    yes: language === 'en' ? 'Yes' : 'نعم',
    no: language === 'en' ? 'No' : 'لا',
    
    noRecords: language === 'en' ? 'No overtime records found' : 'لم يتم العثور على سجلات عمل إضافي',
    totalRecords: language === 'en' ? 'Total Records' : 'إجمالي السجلات',
    
    hours: language === 'en' ? 'hours' : 'ساعات',
    staff: language === 'en' ? 'staff' : 'موظف'
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Pending Approvals */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className={`flex items-center justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-2 bg-orange-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-xs text-gray-600 mb-1">{t.pendingApprovals}</p>
            <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
          </div>
        </div>

        {/* Approved */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className={`flex items-center justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-xs text-gray-600 mb-1">{t.approvedOvertime}</p>
            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
          </div>
        </div>

        {/* Rejected */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className={`flex items-center justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-2 bg-red-50 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-xs text-gray-600 mb-1">{t.rejectedOvertime}</p>
            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
          </div>
        </div>

        {/* Total Hours */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className={`flex items-center justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-2 bg-purple-50 rounded-lg">
              <Timer className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-xs text-gray-600 mb-1">{t.totalHours}</p>
            <p className="text-2xl font-bold text-purple-600">{stats.totalHours.toFixed(1)}</p>
            <p className="text-xs text-gray-500">{t.hours}</p>
          </div>
        </div>

        {/* Unique Staff */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className={`flex items-center justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <p className="text-xs text-gray-600 mb-1">{t.staffWithOvertime}</p>
            <p className="text-2xl font-bold text-blue-600">{stats.uniqueStaff}</p>
            <p className="text-xs text-gray-500">{t.staff}</p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
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
            <option value="current">{t.currentMonth}</option>
            <option value="all">{t.allPeriods}</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-right' : ''}`}
          >
            <option value="all">{t.all}</option>
            <option value="pending">{t.pending}</option>
            <option value="approved">{t.approved}</option>
            <option value="rejected">{t.rejected}</option>
          </select>
        </div>

        {/* Records Count */}
        <div className={`mt-4 pt-4 border-t border-gray-200 ${isRTL ? 'text-right' : 'text-left'}`}>
          <p className="text-sm text-gray-600">
            {t.totalRecords}: <span className="font-semibold text-gray-900">{filteredRecords.length}</span>
          </p>
        </div>
      </div>

      {/* Records Table */}
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
                  {t.payroll}
                </th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    {t.noRecords}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const statusColor = 
                    record.overtimeApprovalStatus === 'approved' ? 'bg-green-100 text-green-700' :
                    record.overtimeApprovalStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-orange-100 text-orange-700';

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
                        <span className="inline-flex items-center gap-1 text-sm font-bold text-purple-600">
                          <Timer className="w-4 h-4" />
                          {record.overtimeHours.toFixed(1)}h
                        </span>
                      </td>
                      <td className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                          {record.overtimeApprovalStatus === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {record.overtimeApprovalStatus === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                          {record.overtimeApprovalStatus === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                          {record.overtimeApprovalStatus === 'approved' ? t.approved : 
                           record.overtimeApprovalStatus === 'rejected' ? t.rejected : t.pending}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                        {record.overtimeApprovalStatus === 'approved' ? (
                          <span className="text-green-600 font-medium">{t.yes}</span>
                        ) : (
                          <span className="text-red-600 font-medium">{t.no}</span>
                        )}
                      </td>
                      <td className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {record.overtimeApprovalStatus === 'pending' && (
                          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <button
                              onClick={() => handleApproveOvertime(record.id)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                              title={t.approve}
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleRejectOvertime(record.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title={t.reject}
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                        {record.overtimeApprovalStatus !== 'pending' && (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
