/**
 * ============================================================================
 * HR AUDIT LOG TAB - COMPLIANCE-GRADE AUDIT TRAIL
 * ============================================================================
 * 
 * CRITICAL FEATURES:
 * - System-generated only (NO manual entries)
 * - Read-only (NO edits, NO deletes)
 * - Before/After tracking
 * - Advanced filtering
 * - Export & Print functionality
 * - Access restricted to HR Manager / Admin
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { Eye, X, Download, Printer, Filter, Calendar, Search } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { hrLogEventsService, HRLogEvent, HRLogFilters, HRModule, ActionType, RecordType } from '@/app/services/hrLogEventsService';

export function HRAuditLogTab() {
  const { language, isRTL } = useLanguage();
  const [events, setEvents] = useState<HRLogEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<HRLogEvent | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<HRLogFilters>({});

  useEffect(() => {
    hrLogEventsService.initializeSampleData();
    loadEvents();
  }, [filters]);

  const loadEvents = () => {
    const filtered = hrLogEventsService.getFiltered(filters);
    setEvents(filtered);
  };

  const handleExport = () => {
    hrLogEventsService.exportToExcel(filters);
  };

  const handlePrint = () => {
    window.print();
  };

  const t = {
    title: language === 'en' ? 'HR Log Events (Audit Trail)' : 'سجل أحداث الموارد البشرية (مسار التدقيق)',
    subtitle: language === 'en' 
      ? 'System-generated audit trail for compliance and oversight'
      : 'مسار تدقيق تم إنشاؤه بواسطة النظام للامتثال والإشراف',
    
    // Security notices
    readOnlyNotice: language === 'en'
      ? '🔒 Read-Only Audit Trail - No edits or deletions permitted'
      : '🔒 مسار تدقيق للقراءة فقط - لا يُسمح بالتعديل أو الحذف',
    accessRestricted: language === 'en'
      ? '🔐 Access restricted to HR Manager & Admin only'
      : '🔐 الوصول مقتصر على مدير الموارد البشرية والمسؤول فقط',
    systemGenerated: language === 'en'
      ? '📋 System-generated logs only - Permanent retention'
      : '📋 سجلات يتم إنشاؤها بواسطة النظام فقط - الاحتفاظ الدائم',
    
    // Columns
    dateTime: language === 'en' ? 'Date & Time' : 'التاريخ والوقت',
    module: language === 'en' ? 'Module' : 'الوحدة',
    actionType: language === 'en' ? 'Action Type' : 'نوع الإجراء',
    recordType: language === 'en' ? 'Record Type' : 'نوع السجل',
    recordRef: language === 'en' ? 'Record Reference' : 'مرجع السجل',
    performedBy: language === 'en' ? 'Performed By' : 'نفذه',
    affectedEmployee: language === 'en' ? 'Affected Employee' : 'الموظف المتأثر',
    status: language === 'en' ? 'Status' : 'الحالة',
    viewDetails: language === 'en' ? 'View Details' : 'عرض التفاصيل',
    
    // Status
    success: language === 'en' ? 'Success' : 'نجح',
    failed: language === 'en' ? 'Failed' : 'فشل',
    
    // Actions
    export: language === 'en' ? 'Export to Excel' : 'تصدير إلى Excel',
    print: language === 'en' ? 'Print / PDF' : 'طباعة / PDF',
    filters: language === 'en' ? 'Filters' : 'المرشحات',
    applyFilters: language === 'en' ? 'Apply Filters' : 'تطبيق المرشحات',
    clearFilters: language === 'en' ? 'Clear Filters' : 'مسح المرشحات',
    close: language === 'en' ? 'Close' : 'إغلاق',
    
    // Filters
    dateFrom: language === 'en' ? 'Date From' : 'من تاريخ',
    dateTo: language === 'en' ? 'Date To' : 'إلى تاريخ',
    allModules: language === 'en' ? 'All Modules' : 'جميع الوحدات',
    allActionTypes: language === 'en' ? 'All Action Types' : 'جميع أنواع الإجراءات',
    allRecordTypes: language === 'en' ? 'All Record Types' : 'جميع أنواع السجلات',
    searchEmployee: language === 'en' ? 'Search Employee...' : 'بحث عن موظف...',
    searchUser: language === 'en' ? 'Search User...' : 'بحث عن مستخدم...',
    
    // Event Details Modal
    eventDetails: language === 'en' ? 'Event Details' : 'تفاصيل الحدث',
    eventSummary: language === 'en' ? 'Event Summary' : 'ملخص الحدث',
    changeDetails: language === 'en' ? 'Change Details' : 'تفاصيل التغيير',
    justification: language === 'en' ? 'Justification' : 'المبرر',
    errorMessage: language === 'en' ? 'Error Message' : 'رسالة الخطأ',
    noChanges: language === 'en' ? 'No field changes - approval action only' : 'لا توجد تغييرات في الحقول - إجراء موافقة فقط',
    before: language === 'en' ? 'Before' : 'قبل',
    after: language === 'en' ? 'After' : 'بعد',
    ipAddress: language === 'en' ? 'IP Address' : 'عنوان IP',
    role: language === 'en' ? 'Role' : 'الدور',
    
    totalEvents: language === 'en' ? 'Total Events' : 'إجمالي الأحداث',
    showingResults: language === 'en' ? 'Showing {count} results' : 'عرض {count} نتيجة'
  };

  const modules: HRModule[] = ['HR', 'Payroll', 'Attendance', 'Recruitment', 'Disciplinary', 'Settings'];
  const actionTypes: ActionType[] = ['Create', 'Update', 'Approve', 'Reject', 'Lock', 'Unlock', 'Delete', 'Archive', 'Restore'];
  const recordTypes: RecordType[] = ['Employee', 'Contract', 'Salary', 'Leave', 'Disciplinary', 'Attendance', 'Vacancy', 'Candidate', 'Configuration'];

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.title}</h3>
        <p className="text-sm text-gray-600">{t.subtitle}</p>
      </div>

      {/* Security Notices */}
      <div className="space-y-3">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-900">{t.readOnlyNotice}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <p className="text-sm text-orange-900">{t.accessRestricted}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-900">{t.systemGenerated}</p>
        </div>
      </div>

      {/* Actions Bar */}
      <div className={`flex items-center justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <Filter className="w-4 h-4" />
            {t.filters}
          </button>
          <span className="text-sm text-gray-600">
            {t.showingResults.replace('{count}', events.length.toString())}
          </span>
        </div>
        
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            {t.export}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Printer className="w-4 h-4" />
            {t.print}
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.dateFrom}</label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.dateTo}</label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            {/* Module Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.module}</label>
              <select
                value={filters.module || ''}
                onChange={(e) => setFilters({ ...filters, module: e.target.value as HRModule || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">{t.allModules}</option>
                {modules.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {/* Action Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.actionType}</label>
              <select
                value={filters.actionType || ''}
                onChange={(e) => setFilters({ ...filters, actionType: e.target.value as ActionType || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">{t.allActionTypes}</option>
                {actionTypes.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            {/* Record Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.recordType}</label>
              <select
                value={filters.recordType || ''}
                onChange={(e) => setFilters({ ...filters, recordType: e.target.value as RecordType || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">{t.allRecordTypes}</option>
                {recordTypes.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Employee Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.affectedEmployee}</label>
              <input
                type="text"
                value={filters.employee || ''}
                onChange={(e) => setFilters({ ...filters, employee: e.target.value })}
                placeholder={t.searchEmployee}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            {/* User Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t.performedBy}</label>
              <input
                type="text"
                value={filters.performedBy || ''}
                onChange={(e) => setFilters({ ...filters, performedBy: e.target.value })}
                placeholder={t.searchUser}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className={`flex items-center gap-2 mt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={() => setFilters({})}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              {t.clearFilters}
            </button>
          </div>
        </div>
      )}

      {/* Events Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.dateTime}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.module}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.actionType}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.recordType}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.recordRef}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.performedBy}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.affectedEmployee}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.status}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.viewDetails}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {events.map(event => (
                <tr key={event.eventId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                    {new Date(event.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {event.module}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      {event.actionType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{event.recordType}</td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-600">{event.recordReference}</td>
                  <td className="px-4 py-3 text-sm">
                    <div>
                      <div className="font-medium text-gray-900">{event.performedBy}</div>
                      <div className="text-xs text-gray-500">{event.performedByRole}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{event.affectedEmployee || '—'}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      event.status === 'Success' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {event.status === 'Success' ? t.success : t.failed}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => setSelectedEvent(event)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <h3 className="text-xl font-bold text-gray-900">{t.eventDetails}</h3>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Event Summary */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">{t.eventSummary}</h4>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-500">{t.dateTime}:</span>
                      <p className="text-sm text-gray-900">{new Date(selectedEvent.timestamp).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">{t.module}:</span>
                      <p className="text-sm text-gray-900">{selectedEvent.module}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">{t.actionType}:</span>
                      <p className="text-sm text-gray-900">{selectedEvent.actionType}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">{t.recordType}:</span>
                      <p className="text-sm text-gray-900">{selectedEvent.recordType}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">{t.recordRef}:</span>
                      <p className="text-sm font-mono text-gray-900">{selectedEvent.recordReference}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">{t.performedBy}:</span>
                      <p className="text-sm text-gray-900">{selectedEvent.performedBy}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">{t.role}:</span>
                      <p className="text-sm text-gray-900">{selectedEvent.performedByRole}</p>
                    </div>
                    {selectedEvent.affectedEmployee && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">{t.affectedEmployee}:</span>
                        <p className="text-sm text-gray-900">{selectedEvent.affectedEmployee}</p>
                      </div>
                    )}
                    {selectedEvent.ipAddress && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">{t.ipAddress}:</span>
                        <p className="text-sm font-mono text-gray-900">{selectedEvent.ipAddress}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Change Details */}
              {selectedEvent.changeDetails && selectedEvent.changeDetails.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">{t.changeDetails}</h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Field</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t.before}</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t.after}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedEvent.changeDetails.map((change, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">{change.fieldName}</td>
                            <td className="px-4 py-2 text-sm text-red-600">{change.beforeValue}</td>
                            <td className="px-4 py-2 text-sm text-green-600">{change.afterValue}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {!selectedEvent.changeDetails && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">{t.changeDetails}</h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900">{t.noChanges}</p>
                  </div>
                </div>
              )}

              {/* Justification */}
              {selectedEvent.justification && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">{t.justification}</h4>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-900">{selectedEvent.justification}</p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {selectedEvent.errorMessage && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">{t.errorMessage}</h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-900">{selectedEvent.errorMessage}</p>
                  </div>
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  {t.close}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
