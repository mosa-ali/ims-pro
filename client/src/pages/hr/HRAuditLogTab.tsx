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
import { useTranslation } from '@/i18n/useTranslation';

export function HRAuditLogTab() {
 const { t } = useTranslation();
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

 const labels = {
 title: t.hr.hrLogEventsAuditTrail,
 subtitle: t.hr.auditLogSubtitle,
 
 // Security notices
 readOnlyNotice: '🔒 ' + t.hr.readOnlyAuditTrail,
 accessRestricted: '🔐 ' + t.hr.accessRestrictedToHRManagerAdmin,
 systemGenerated: '📋 ' + t.hr.systemGeneratedLogsOnly,
 
 // Columns
 dateTime: t.hr.dateTime,
 module: t.hr.module,
 actionType: t.hr.actionType,
 recordType: t.hr.recordType,
 recordRef: t.hr.recordReference,
 performedBy: t.hr.performedBy,
 affectedEmployee: t.hr.affectedEmployee,
 status: t.hr.status,
 viewDetails: t.hr.viewDetails,
 
 // Status
 success: t.hr.success,
 failed: t.hr.failed,
 
 // Actions
 export: t.hr.exportToExcel,
 print: t.hr.printPdf,
 filters: t.hr.filters,
 applyFilters: t.hr.applyFilters,
 clearFilters: t.hr.clearFilters,
 close: t.hr.close,
 
 // Filters
 dateFrom: t.hr.dateFrom,
 dateTo: t.hr.dateTo,
 allModules: t.hr.allModules,
 allActionTypes: t.hr.allActionTypes,
 allRecordTypes: t.hr.allRecordTypes,
 searchEmployee: t.hr.searchEmployee,
 searchUser: t.hr.searchUser,
 
 // Event Details Modal
 eventDetails: t.hr.eventDetails,
 eventSummary: t.hr.eventSummary,
 changeDetails: t.hr.changeDetails,
 justification: t.hr.justification,
 errorMessage: t.hr.errorMessage,
 noChanges: t.hr.noFieldChangesApprovalActionOnly,
 before: t.hr.before,
 after: t.hr.after,
 ipAddress: t.hr.ipAddress,
 role: t.hr.role,
 
 totalEvents: t.hr.totalEvents,
 showingResults: t.hr.showingCountResults
 };

 const modules: HRModule[] = ['HR', 'Payroll', 'Attendance', 'Recruitment', 'Disciplinary', 'Settings'];
 const actionTypes: ActionType[] = ['Create', 'Update', 'Approve', 'Reject', 'Lock', 'Unlock', 'Delete', 'Archive', 'Restore'];
 const recordTypes: RecordType[] = ['Employee', 'Contract', 'Salary', 'Leave', 'Disciplinary', 'Attendance', 'Vacancy', 'Candidate', 'Configuration'];

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div>
 <h3 className="text-lg font-semibold text-gray-900 mb-2">{labels.title}</h3>
 <p className="text-sm text-gray-600">{labels.subtitle}</p>
 </div>

 {/* Security Notices */}
 <div className="space-y-3">
 <div className="bg-red-50 border border-red-200 rounded-lg p-3">
 <p className="text-sm text-red-900">{labels.readOnlyNotice}</p>
 </div>
 <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
 <p className="text-sm text-orange-900">{labels.accessRestricted}</p>
 </div>
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
 <p className="text-sm text-blue-900">{labels.systemGenerated}</p>
 </div>
 </div>

 {/* Actions Bar */}
 <div className={`flex items-center justify-between gap-4`}>
 <div className={`flex items-center gap-2`}>
 <button
 onClick={() => setShowFilters(!showFilters)}
 className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
 >
 <Filter className="w-4 h-4" />
 {labels.filters}
 </button>
 <span className="text-sm text-gray-600">
 {t.showingResults.replace('{count}', events.length.toString())}
 </span>
 </div>
 
 <div className={`flex items-center gap-2`}>
 <button
 onClick={handleExport}
 className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
 >
 <Download className="w-4 h-4" />
 {labels.export}
 </button>
 <button
 onClick={handlePrint}
 className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
 >
 <Printer className="w-4 h-4" />
 {labels.print}
 </button>
 </div>
 </div>

 {/* Filters Panel */}
 {showFilters && (
 <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {/* Date From */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{labels.dateFrom}</label>
 <input
 type="date"
 value={filters.dateFrom || ''}
 onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg"
 />
 </div>

 {/* Date To */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{labels.dateTo}</label>
 <input
 type="date"
 value={filters.dateTo || ''}
 onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg"
 />
 </div>

 {/* Module Filter */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{labels.module}</label>
 <select
 value={filters.module || ''}
 onChange={(e) => setFilters({ ...filters, module: e.target.value as HRModule || undefined })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg"
 >
 <option value="">{labels.allModules}</option>
 {modules.map(m => <option key={m} value={m}>{m}</option>)}
 </select>
 </div>

 {/* Action Type Filter */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{labels.actionType}</label>
 <select
 value={filters.actionType || ''}
 onChange={(e) => setFilters({ ...filters, actionType: e.target.value as ActionType || undefined })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg"
 >
 <option value="">{labels.allActionTypes}</option>
 {actionTypes.map(a => <option key={a} value={a}>{a}</option>)}
 </select>
 </div>

 {/* Record Type Filter */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{labels.recordType}</label>
 <select
 value={filters.recordType || ''}
 onChange={(e) => setFilters({ ...filters, recordType: e.target.value as RecordType || undefined })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg"
 >
 <option value="">{labels.allRecordTypes}</option>
 {recordTypes.map(r => <option key={r} value={r}>{r}</option>)}
 </select>
 </div>

 {/* Employee Search */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{labels.affectedEmployee}</label>
 <input
 type="text"
 value={filters.employee || ''}
 onChange={(e) => setFilters({ ...filters, employee: e.target.value })}
 placeholder={labels.searchEmployee}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg"
 />
 </div>

 {/* User Search */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-2">{labels.performedBy}</label>
 <input
 type="text"
 value={filters.performedBy || ''}
 onChange={(e) => setFilters({ ...filters, performedBy: e.target.value })}
 placeholder={labels.searchUser}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg"
 />
 </div>
 </div>

 <div className={`flex items-center gap-2 mt-4`}>
 <button
 onClick={() => setFilters({})}
 className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
 >
 {labels.clearFilters}
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
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>{labels.dateTime}</th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>{labels.module}</th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>{labels.actionType}</th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>{labels.recordType}</th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>{labels.recordRef}</th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>{labels.performedBy}</th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>{labels.affectedEmployee}</th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>{labels.status}</th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start`}>{labels.viewDetails}</th>
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
 <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${ event.status === 'Success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700' }`}>
 {event.status === 'Success' ? labels.success : labels.failed}
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
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
 <div className="p-6">
 {/* Modal Header */}
 <div className={`flex items-center justify-between mb-6`}>
 <h3 className="text-xl font-bold text-gray-900">{labels.eventDetails}</h3>
 <button
 onClick={() => setSelectedEvent(null)}
 className="text-gray-400 hover:text-gray-600"
 >
 <X className="w-6 h-6" />
 </button>
 </div>

 {/* Event Summary */}
 <div className="mb-6">
 <h4 className="text-lg font-semibold text-gray-900 mb-3">{labels.eventSummary}</h4>
 <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <span className="text-sm font-medium text-gray-500">{labels.dateTime}:</span>
 <p className="text-sm text-gray-900">{new Date(selectedEvent.timestamp).toLocaleString()}</p>
 </div>
 <div>
 <span className="text-sm font-medium text-gray-500">{labels.module}:</span>
 <p className="text-sm text-gray-900">{selectedEvent.module}</p>
 </div>
 <div>
 <span className="text-sm font-medium text-gray-500">{labels.actionType}:</span>
 <p className="text-sm text-gray-900">{selectedEvent.actionType}</p>
 </div>
 <div>
 <span className="text-sm font-medium text-gray-500">{labels.recordType}:</span>
 <p className="text-sm text-gray-900">{selectedEvent.recordType}</p>
 </div>
 <div>
 <span className="text-sm font-medium text-gray-500">{labels.recordRef}:</span>
 <p className="text-sm font-mono text-gray-900">{selectedEvent.recordReference}</p>
 </div>
 <div>
 <span className="text-sm font-medium text-gray-500">{labels.performedBy}:</span>
 <p className="text-sm text-gray-900">{selectedEvent.performedBy}</p>
 </div>
 <div>
 <span className="text-sm font-medium text-gray-500">{labels.role}:</span>
 <p className="text-sm text-gray-900">{selectedEvent.performedByRole}</p>
 </div>
 {selectedEvent.affectedEmployee && (
 <div>
 <span className="text-sm font-medium text-gray-500">{labels.affectedEmployee}:</span>
 <p className="text-sm text-gray-900">{selectedEvent.affectedEmployee}</p>
 </div>
 )}
 {selectedEvent.ipAddress && (
 <div>
 <span className="text-sm font-medium text-gray-500">{labels.ipAddress}:</span>
 <p className="text-sm font-mono text-gray-900">{selectedEvent.ipAddress}</p>
 </div>
 )}
 </div>
 </div>
 </div>

 {/* Change Details */}
 {selectedEvent.changeDetails && selectedEvent.changeDetails.length > 0 && (
 <div className="mb-6">
 <h4 className="text-lg font-semibold text-gray-900 mb-3">{labels.changeDetails}</h4>
 <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
 <table className="w-full">
 <thead className="bg-gray-100">
 <tr>
 <th className={`px-4 py-2 text-xs font-medium text-gray-500 uppercase text-start`}>Field</th>
 <th className={`px-4 py-2 text-xs font-medium text-gray-500 uppercase text-start`}>{labels.before}</th>
 <th className={`px-4 py-2 text-xs font-medium text-gray-500 uppercase text-start`}>{labels.after}</th>
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
 <h4 className="text-lg font-semibold text-gray-900 mb-3">{labels.changeDetails}</h4>
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
 <p className="text-sm text-blue-900">{labels.noChanges}</p>
 </div>
 </div>
 )}

 {/* Justification */}
 {selectedEvent.justification && (
 <div className="mb-6">
 <h4 className="text-lg font-semibold text-gray-900 mb-3">{labels.justification}</h4>
 <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
 <p className="text-sm text-amber-900">{selectedEvent.justification}</p>
 </div>
 </div>
 )}

 {/* Error Message */}
 {selectedEvent.errorMessage && (
 <div className="mb-6">
 <h4 className="text-lg font-semibold text-gray-900 mb-3">{labels.errorMessage}</h4>
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
 {labels.close}
 </button>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
