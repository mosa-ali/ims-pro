/**
 * ============================================================================
 * LEAVE BALANCES VIEW (tRPC VERSION WITH i18n)
 * ============================================================================
 * 
 * Displays all staff members with their calculated annual leave balances
 * Uses tRPC for real data and i18n for translations
 * 
 * ============================================================================
 */

import { useState } from 'react';
import {
 Calendar,
 Plus,
 TrendingUp,
 Users,
 Loader2,
 AlertCircle
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useLanguage } from '@/contexts/LanguageContext';
import type { StaffMember } from '../types/hrTypes';
import { hrAnnualLeaveTranslations } from '@/i18n/hrAnnualLeave-i18n';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';

interface Props {
 language: string;
 isRTL: boolean;
 onRequestLeave: (employee: StaffMember) => void;
}

export function LeaveBalancesView({
 language, isRTL, onRequestLeave }: Props) {
 const { language: currentLanguage } = useLanguage();
 const t =
  hrAnnualLeaveTranslations[
    language as keyof typeof hrAnnualLeaveTranslations
  ];
 const [searchTerm, setSearchTerm] = useState('');
 const [selectedYear] = useState(new Date().getFullYear());
 const { currentOrganization } = useOrganization();
 const { currentOperatingUnit } = useOperatingUnit();
 const organizationId = currentOrganization?.id || 0;
 const operatingUnitId = currentOperatingUnit?.id || 0;

 // Fetch employees with annual leave data via tRPC
 const { data: employees = [], isLoading, error } = trpc.hrAnnualLeave.getEmployeesAnnualLeave.useQuery(
 {
  year: selectedYear,
 },
 { enabled: !!organizationId && !!operatingUnitId }
 );

 // Fetch leave balance summary via tRPC
 const { data: balanceSummary = { totalStaff: 0, avgAvailable: 0, totalUsed: 0, totalPending: 0 } } = trpc.hrAnnualLeave.getLeaveBalanceSummary.useQuery(
 {
  year: selectedYear,
 },
 { enabled: !!organizationId && !!operatingUnitId }
 );

 const filteredEmployees = employees.filter(emp => {
 if (!searchTerm) return true;
 const term = searchTerm.toLowerCase();
 return (
 emp.employeeCode?.toLowerCase().includes(term) ||
 emp.firstName?.toLowerCase().includes(term) ||
 emp.lastName?.toLowerCase().includes(term) ||
 emp.jobTitle?.toLowerCase().includes(term) ||
 emp.department?.toLowerCase().includes(term)
 );
 });

 const formatDate = (dateString?: string) => {
 if (!dateString) return '-';
 return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
 year: 'numeric',
 month: 'short',
 day: 'numeric'
 });
 };

 const getBalanceColor = (available: number) => {
 if (available > 15) return 'text-green-600';
 if (available > 5) return 'text-yellow-600';
 return 'text-red-600';
 };

 const localT = {
 title: t.annualLeaveView.title,
 subtitle: t.annualLeaveView.subtitle,
 search: t.search.placeholder,
 
 staffId: t.tableColumns.staffId,
 name: t.tableColumns.name,
 position: t.tableColumns.position,
 department: t.tableColumns.department,
 contractPeriod: t.tableColumns.contractPeriod,
 accrued: t.leaveBalance.accrued,
 used: t.leaveBalance.used,
 pending: t.leaveBalance.pending,
 remaining: t.leaveBalance.remaining,
 available: t.leaveBalance.available,
 actions: t.tableColumns.actions,
 requestLeave: t.buttons.newLeaveRequest,
 
 days: t.units.days,
 noStaff: t.emptyStates.noEmployees,
 
 totalStaff: t.statistics.totalActiveStaff,
 avgBalance: t.statistics.avgAvailableBalance,
 totalUsed: t.statistics.totalLeaveUsed,
 totalPending: t.statistics.totalPending
 };

 // Statistics
 const stats = {
 totalStaff: filteredEmployees.length,
 avgAvailable: balanceSummary.avgAvailable?.toFixed(1) || '0',
 totalUsed: balanceSummary.totalUsed?.toFixed(1) || '0',
 totalPending: balanceSummary.totalPending?.toFixed(1) || '0'
 };

 return (
 <div dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="px-6 py-4 border-b border-gray-200">
 <h3 className="text-lg font-semibold text-gray-900">{localT.title}</h3>
 <p className="text-sm text-gray-600 mt-1">{localT.subtitle}</p>
 </div>

 {/* Statistics */}
 <div className="grid grid-cols-4 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200">
 <div>
 <p className="text-xs font-medium text-gray-600 uppercase">{localT.totalStaff}</p>
 <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalStaff}</p>
 </div>
 <div>
 <p className="text-xs font-medium text-gray-600 uppercase">{localT.avgBalance}</p>
 <p className="text-2xl font-bold text-green-600 mt-1">{stats.avgAvailable} {localT.days}</p>
 </div>
 <div>
 <p className="text-xs font-medium text-gray-600 uppercase">{localT.totalUsed}</p>
 <p className="text-2xl font-bold text-blue-600 mt-1">{stats.totalUsed} {localT.days}</p>
 </div>
 <div>
 <p className="text-xs font-medium text-gray-600 uppercase">{localT.totalPending}</p>
 <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.totalPending} {localT.days}</p>
 </div>
 </div>

 {/* Search */}
 <div className="px-6 py-4 border-b border-gray-200">
 <input
 type="text"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 placeholder={localT.search}
 className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 />
 </div>

 {/* Table */}
 <div className="overflow-x-auto">
 {isLoading ? (
 <div className="text-center py-12">
 <Loader2 className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
 <p className="text-gray-600 font-medium">{t.messages.loading}</p>
 </div>
 ) : error ? (
 <div className="text-center py-12">
 <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-4" />
 <p className="text-red-600 font-medium">{t.messages.fetchError}</p>
 </div>
 ) : filteredEmployees.length === 0 ? (
 <div className="text-center py-12">
 <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
 <p className="text-gray-600 font-medium">{localT.noStaff}</p>
 </div>
 ) : (
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className={`px-4 py-3 text-xs font-medium text-gray-600 uppercase text-start`}>{localT.staffId}</th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-600 uppercase text-start`}>{localT.name}</th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-600 uppercase text-start`}>{localT.department}</th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-600 uppercase text-start`}>{localT.contractPeriod}</th>
 <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">{localT.accrued}</th>
 <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">{localT.used}</th>
 <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">{localT.pending}</th>
 <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">{localT.remaining}</th>
 <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">{localT.available}</th>
 <th className={`px-4 py-3 text-xs font-medium text-gray-600 uppercase text-start`}>{localT.actions}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {filteredEmployees.map((emp) => (
 <tr key={emp.id} className="hover:bg-gray-50">
 <td className="px-4 py-3 text-sm font-mono text-gray-900">{emp.employeeCode}</td>
 <td className="px-4 py-3 text-sm text-gray-900">
 <div>
 <p className="font-medium">{emp.firstName} {emp.lastName}</p>
 <p className="text-xs text-gray-500">{emp.jobTitle || '-'}</p>
 </div>
 </td>
 <td className="px-4 py-3 text-sm text-gray-600">{emp.department || '-'}</td>
 <td className="px-4 py-3 text-xs text-gray-600">
 <div>
 <p>{formatDate(emp.contractStartDate ?? undefined)}</p>
 <p className="text-gray-500">{t.dateTime.to} {formatDate(emp.contractEndDate ?? undefined)}</p>
 </div>
 </td>
 <td className="px-4 py-3 text-center">
 <span className="text-sm font-semibold text-blue-600">
 {emp.annualEntitlement || 0}
 </span>
 </td>
 <td className="px-4 py-3 text-center">
 <span className="text-sm font-semibold text-red-600">
 {emp.used || 0}
 </span>
 </td>
 <td className="px-4 py-3 text-center">
 <span className="text-sm font-semibold text-yellow-600">
 {emp.pending || 0}
 </span>
 </td>
 <td className="px-4 py-3 text-center">
 <span className="text-sm font-semibold text-gray-900">
 {emp.remaining || 0}
 </span>
 </td>
 <td className="px-4 py-3 text-center">
 <span className={`text-lg font-bold ${getBalanceColor(emp.available || 0)}`}>
 {emp.available || 0}
 </span>
 </td>
 <td className="px-4 py-3">
 <button
 onClick={() => {
 const staffMember: StaffMember = {
 id: emp.employeeId,
 staffId: emp.employeeCode || '',
 fullName: `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
 jobTitle: emp.jobTitle || '',
 department: emp.department || '',
 status: 'active',
 email: emp.email || '',
 phone: emp.phone || '',
 gender: emp.gender || 'other',
 dateOfBirth: emp.dateOfBirth || '',
 nationality: emp.nationality || '',
 contractStartDate: emp.contractStartDate || '',
 contractEndDate: emp.contractEndDate || '',
 reportingTo: emp.reportingTo ?? null,
 employmentType: emp.employmentType || 'full-time',
 createdAt: emp.createdAt || new Date().toISOString(),
 updatedAt: emp.updatedAt || new Date().toISOString(),
 organizationId: Number(emp.organizationId),
 };
 onRequestLeave(staffMember);
 }}
 className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 cursor-pointer"
 >
 <Plus className="w-4 h-4" />
 <span>{localT.requestLeave}</span>
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 )}
 </div>
 </div>
 );
}