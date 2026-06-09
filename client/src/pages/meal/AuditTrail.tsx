/**
 * ============================================================================
 * AUDIT TRAIL
 * ============================================================================
 * 
 * Complete audit log of all data changes for compliance and donor reporting
 * 
 * FEATURES:
 * - Chronological log of all data changes
 * - Filter by date range, user, action type, entity
 * - Search functionality
 * - Export to Excel/CSV
 * - Color-coded action types
 * - Bilingual support (EN/AR) with RTL
 * 
 * ============================================================================
 */

import { useNavigate } from '@/lib/router-compat';
import { useSearch } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { Download, Search, Filter, Calendar } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

interface AuditLogEntry {
 id: string;
 timestamp: string;
 user: string;
 userRole: string;
 action: 'create' | 'update' | 'delete' | 'export' | 'approve' | 'reject';
 entity: string;
 entityId: string;
 details: string;
 ipAddress: string;
}

export function AuditTrail() {
 const { t } = useTranslation();
 const navigate = useNavigate();
 const searchString = useSearch();
 const searchParams = new URLSearchParams(searchString);
 const { language, isRTL } = useLanguage();
 
 const [searchQuery, setSearchQuery] = useState('');
 const [filterAction, setFilterAction] = useState<string>('all');
 const [filterEntity, setFilterEntity] = useState<string>('all');
 const [startDate, setStartDate] = useState('');
 const [endDate, setEndDate] = useState('');

 const projectId = searchParams.get('projectId') || '';
 const projectName = searchParams.get('projectName') || '';

 const labels = {
 title: t.meal.auditTrail,
 subtitle: t.meal.auditTrailSubtitle,
 search: t.meal.searchAuditLog,
 filterByAction: t.meal.filterByAction,
 filterByEntity: t.meal.filterByEntity,
 startDate: t.meal.startDate,
 endDate: t.meal.endDate,
 export: t.meal.export,
 timestamp: t.meal.timestamp,
 user: t.meal.user,
 action: t.meal.action,
 entity: t.meal.entity,
 details: t.meal.details,
 ipAddress: t.meal.ipAddress,
 
 // Actions
 create: t.meal.create,
 update: t.meal.update,
 delete: t.meal.delete,
 exportAction: t.meal.export,
 approve: t.meal.approve,
 reject: t.meal.reject,
 all: t.meal.allActions,
 
 // Entities
 survey: t.meal.survey,
 submission: t.meal.submission,
 indicator: t.meal.indicator,
 report: t.meal.report,
 allEntities: t.meal.allEntities,
 
 noResults: t.meal.noAuditLogsFound,
 };

 // Mock audit log data
 const mockAuditLogs: AuditLogEntry[] = [
 {
 id: '1',
 timestamp: '2024-01-21 14:35:22',
 user: 'Ahmed Hassan',
 userRole: 'MEAL Officer',
 action: 'create',
 entity: 'Survey',
 entityId: 'SRV-001',
 details: 'Created new survey "Household Needs Assessment - Q1 2024"',
 ipAddress: '192.168.1.45',
 },
 {
 id: '2',
 timestamp: '2024-01-21 13:22:18',
 user: 'Fatima Ali',
 userRole: 'Field Monitor',
 action: 'approve',
 entity: 'Submission',
 entityId: 'SUB-458',
 details: 'Approved submission from Enumerator "Mohamed Saleh"',
 ipAddress: '192.168.1.67',
 },
 {
 id: '3',
 timestamp: '2024-01-21 12:15:09',
 user: 'John Smith',
 userRole: 'Program Manager',
 action: 'update',
 entity: 'Indicator',
 entityId: 'IND-023',
 details: 'Updated indicator "Number of beneficiaries reached" target from 1,000 to 1,500',
 ipAddress: '192.168.1.89',
 },
 {
 id: '4',
 timestamp: '2024-01-21 11:45:33',
 user: 'Sara Ahmed',
 userRole: 'Data Manager',
 action: 'export',
 entity: 'Report',
 entityId: 'RPT-112',
 details: 'Exported "Monthly Activity Report - December 2023" to Excel',
 ipAddress: '192.168.1.56',
 },
 {
 id: '5',
 timestamp: '2024-01-21 10:30:15',
 user: 'Omar Ibrahim',
 userRole: 'Enumerator',
 action: 'create',
 entity: 'Submission',
 entityId: 'SUB-459',
 details: 'Submitted survey response for "Household Needs Assessment"',
 ipAddress: '192.168.1.72',
 },
 {
 id: '6',
 timestamp: '2024-01-21 09:18:42',
 user: 'Ahmed Hassan',
 userRole: 'MEAL Officer',
 action: 'delete',
 entity: 'Survey',
 entityId: 'SRV-045',
 details: 'Deleted survey "Test Survey - Draft"',
 ipAddress: '192.168.1.45',
 },
 {
 id: '7',
 timestamp: '2024-01-20 16:55:21',
 user: 'Fatima Ali',
 userRole: 'Field Monitor',
 action: 'reject',
 entity: 'Submission',
 entityId: 'SUB-457',
 details: 'Rejected submission due to incomplete data',
 ipAddress: '192.168.1.67',
 },
 {
 id: '8',
 timestamp: '2024-01-20 15:20:37',
 user: 'John Smith',
 userRole: 'Program Manager',
 action: 'update',
 entity: 'Survey',
 entityId: 'SRV-001',
 details: 'Updated survey settings: Changed data retention to 2 years',
 ipAddress: '192.168.1.89',
 },
 ];

 const actionColors: Record<string, { bg: string; text: string }> = {
 create: { bg: 'bg-green-100', text: 'text-green-700' },
 update: { bg: 'bg-blue-100', text: 'text-blue-700' },
 delete: { bg: 'bg-red-100', text: 'text-red-700' },
 export: { bg: 'bg-purple-100', text: 'text-purple-700' },
 approve: { bg: 'bg-teal-100', text: 'text-teal-700' },
 reject: { bg: 'bg-orange-100', text: 'text-orange-700' },
 };

 const getActionLabel = (action: string) => {
 const labels: Record<string, string> = {
 create: labels.create,
 update: labels.update,
 delete: labels.delete,
 export: labels.exportAction,
 approve: labels.approve,
 reject: labels.reject,
 };
 return labels[action] || action;
 };

 const filteredLogs = mockAuditLogs.filter((log) => {
 const matchesSearch = log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
 log.user.toLowerCase().includes(searchQuery.toLowerCase());
 const matchesAction = filterAction === 'all' || log.action === filterAction;
 const matchesEntity = filterEntity === 'all' || log.entity.toLowerCase() === filterEntity.toLowerCase();
 
 // Date filtering would go here
 
 return matchesSearch && matchesAction && matchesEntity;
 });

 const handleExport = () => {
 alert(t.meal.exportingAuditTrailToExcel);
 };

 return (
 <div className="min-h-screen bg-gray-50 p-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Back Navigation */}
 <BackButton onClick={() => navigate('/organization/meal/survey/settings')} label={t.meal.backToSettings} />
 <div className="max-w-7xl mx-auto space-y-4">
 {/* Header */}
 <div className={`flex items-center justify-between mb-2`}>
 <div className={`flex-1 text-start`}>
 <h1 className="text-2xl font-bold text-gray-900">{labels.title}</h1>
 <p className="text-sm text-gray-600 mt-1">{labels.subtitle}</p>
 </div>
 </div>

 {/* Filters */}
 <div className="bg-white rounded-lg border border-gray-200 p-4">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
 {/* Search */}
 <div className="lg:col-span-2">
 <div className="relative">
 <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 ${'start-3'}`} />
 <input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder={labels.search}
 className={`w-full py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ps-10 pe-4 text-start`}
 />
 </div>
 </div>

 {/* Filter by Action */}
 <div>
 <select
 value={filterAction}
 onChange={(e) => setFilterAction(e.target.value)}
 className={`w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-start`}
 >
 <option value="all">{labels.all}</option>
 <option value="create">{labels.create}</option>
 <option value="update">{labels.update}</option>
 <option value="delete">{labels.delete}</option>
 <option value="export">{labels.exportAction}</option>
 <option value="approve">{labels.approve}</option>
 <option value="reject">{labels.reject}</option>
 </select>
 </div>

 {/* Filter by Entity */}
 <div>
 <select
 value={filterEntity}
 onChange={(e) => setFilterEntity(e.target.value)}
 className={`w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-start`}
 >
 <option value="all">{labels.allEntities}</option>
 <option value="survey">{labels.survey}</option>
 <option value="submission">{labels.submission}</option>
 <option value="indicator">{labels.indicator}</option>
 <option value="report">{labels.report}</option>
 </select>
 </div>

 {/* Export Button */}
 <div>
 <button
 onClick={handleExport}
 className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors`}
 >
 <Download className="w-4 h-4" />
 <span className="text-sm font-medium">{labels.export}</span>
 </button>
 </div>
 </div>
 </div>

 {/* Audit Log Table */}
 <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider text-start`}>
 {labels.timestamp}
 </th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider text-start`}>
 {labels.user}
 </th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider text-start`}>
 {labels.action}
 </th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider text-start`}>
 {labels.entity}
 </th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider text-start`}>
 {labels.details}
 </th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider text-start`}>
 {labels.ipAddress}
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {filteredLogs.length > 0 ? (
 filteredLogs.map((log) => (
 <tr key={log.id} className="hover:bg-gray-50 transition-colors">
 <td className={`px-4 py-3 text-sm text-gray-900 whitespace-nowrap text-start`}>
 {log.timestamp}
 </td>
 <td className={`px-4 py-3 text-start`}>
 <div className="text-sm font-medium text-gray-900">{log.user}</div>
 <div className="text-xs text-gray-500">{log.userRole}</div>
 </td>
 <td className={`px-4 py-3 text-start`}>
 <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${actionColors[log.action].bg} ${actionColors[log.action].text}`}>
 {getActionLabel(log.action)}
 </span>
 </td>
 <td className={`px-4 py-3 text-sm text-gray-900 text-start`}>
 <div>{log.entity}</div>
 <div className="text-xs text-gray-500">{log.entityId}</div>
 </td>
 <td className={`px-4 py-3 text-sm text-gray-700 text-start`}>
 {log.details}
 </td>
 <td className={`px-4 py-3 text-sm text-gray-500 whitespace-nowrap text-start`}>
 {log.ipAddress}
 </td>
 </tr>
 ))
 ) : (
 <tr>
 <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
 {labels.noResults}
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 </div>
 );
}
