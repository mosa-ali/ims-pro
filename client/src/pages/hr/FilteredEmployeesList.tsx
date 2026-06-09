/**
 * ============================================================================
 * FILTERED EMPLOYEES LIST - Universal Component
 * ============================================================================
 * Handles all filtered views: Active, Archived, Exited, New Hires, Renewals, etc.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { Search, Download, Upload, Eye, Plus, Archive, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { staffService, StaffMember } from '@/app/services/hrService';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

interface FilteredEmployeesListProps {
 filter: 'active' | 'archived' | 'exited' | 'new-hires' | 'renewals' | 'exit-processing' | 'reference';
 title: { en: string; ar: string };
 subtitle: { en: string; ar: string };
 backPath: string;
 showAddButton?: boolean;
}

export function FilteredEmployeesList({
 filter, title, subtitle, backPath, showAddButton = false }: FilteredEmployeesListProps) {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const navigate = useNavigate();
 const [employees, setEmployees] = useState<StaffMember[]>([]);
 const [searchTerm, setSearchTerm] = useState('');

 useEffect(() => {
 loadEmployees();
 }, [filter]);

 const loadEmployees = () => {
 const allStaff = staffService.getAll();
 const today = new Date();
 let filtered: StaffMember[] = [];

 switch (filter) {
 case 'active':
 // ✅ CANONICAL: Only active staff (payroll-eligible)
 filtered = allStaff.filter(s => s.status === 'active');
 break;
 
 case 'archived':
 // ✅ CANONICAL: Only archived staff (inactive but not exited)
 filtered = allStaff.filter(s => s.status === 'archived');
 break;
 
 case 'exited':
 // ✅ CANONICAL: Only exited staff (employment ended)
 filtered = allStaff.filter(s => s.status === 'exited');
 break;
 
 case 'new-hires':
 // ✅ DYNAMIC: Recently hired (last 90 days) AND active
 const ninetyDaysAgo = new Date(today);
 ninetyDaysAgo.setDate(today.getDate() - 90);
 filtered = allStaff.filter(s => {
 if (s.status !== 'active') return false;
 if (!s.hireDate) return false;
 const hireDate = new Date(s.hireDate);
 return hireDate >= ninetyDaysAgo;
 });
 break;
 
 case 'renewals':
 // ✅ DYNAMIC: Contracts expiring within 60 days AND active
 const sixtyDaysFromNow = new Date(today);
 sixtyDaysFromNow.setDate(today.getDate() + 60);
 filtered = allStaff.filter(s => {
 if (s.status !== 'active') return false;
 if (!s.contractEndDate) return false;
 const endDate = new Date(s.contractEndDate);
 return endDate <= sixtyDaysFromNow && endDate >= today;
 });
 break;
 
 case 'exit-processing':
 // ✅ WORKFLOW-DRIVEN: Exit started but not completed
 filtered = allStaff.filter(s => s.exitStarted === true && s.status !== 'exited');
 break;
 
 case 'reference':
 // ✅ CANONICAL: Only exited staff (for reference generation)
 filtered = allStaff.filter(s => s.status === 'exited');
 break;
 }

 setEmployees(filtered);
 };

 const localT = {
 search: t.hr.searchEmployees,
 addEmployee: t.hr.addEmployee,
 export: t.hr.export,
 import: t.hr.import,
 
 staffId: t.hr.staffId,
 name: t.hr.name,
 position: t.hr.position,
 department: t.hr.department,
 contractType: t.hr.contractType,
 hireDate: t.hr.hireDate6,
 contractEnd: t.hr.contractEnd,
 exitDate: t.hr.exitDate,
 exitReason: t.hr.exitReason,
 status: t.hr.status,
 actions: t.hr.actions,
 viewProfile: t.hr.viewProfile,
 restoreStaff: t.hr.restoreStaff,
 
 active: t.hr.active,
 archived: t.hr.archived,
 exited: t.hr.exited,
 
 restoreConfirm: 'Are you sure you want to restore this staff member to Active status?',
 restoreSuccess: t.hr.staffMemberRestoredToActiveStatus,
 
 noEmployees: t.hr.noEmployeesFound,
 showing: t.hr.showing,
 of: t.hr.of,
 employees: t.hr.employees7
 };

 const filteredEmployees = employees.filter(e =>
 e.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
 e.staffId.toLowerCase().includes(searchTerm.toLowerCase())
 );

 const formatDate = (dateString?: string) => {
 if (!dateString) return '-';
 return new Date(dateString).toLocaleDateString(t.hr.en, {
 year: 'numeric',
 month: 'short',
 day: 'numeric'
 });
 };

 const getStatusDisplay = (employee: StaffMember) => {
 if (employee.status === 'exited') return t.exited;
 if (employee.status === 'archived') return t.archived;
 if (employee.status === 'active') return t.active;
 return employee.status; // Fallback to raw status value
 };

 /**
 * ✅ RESTORE ARCHIVED STAFF TO ACTIVE
 * System-wide restore: Updates status and triggers re-sync
 */
 const handleRestore = (employee: StaffMember) => {
 if (!confirm(t.restoreConfirm)) return;
 
 // Update status to active
 staffService.update(employee.id, { status: 'active' });
 
 // Reload employees list
 loadEmployees();
 
 // Show success notification
 alert(t.restoreSuccess);
 };

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Back Button */}
 <BackButton onClick={() => navigate(backPath)} iconOnly />

 {/* Header */}
 <div className={'text-start'}>
 <h1 className="text-2xl font-bold text-gray-900">{title[language]}</h1>
 <p className="text-gray-600 mt-1">{subtitle[language]}</p>
 </div>

 {/* Actions Bar */}
 <div className={`flex items-center justify-between gap-4`}>
 <div className="relative">
 <Search className={`absolute top-2.5 ${'start-3'} w-5 h-5 text-gray-400`} />
 <input
 type="text"
 placeholder={t.search}
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className={`ps-10 py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-64`}
 />
 </div>
 <div className={`flex items-center gap-2`}>
 {showAddButton && (
 <button className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700`}>
 <Plus className="w-5 h-5" />
 <span>{t.addEmployee}</span>
 </button>
 )}
 <button className={`flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50`}>
 <Download className="w-5 h-5" />
 <span>{t.export}</span>
 </button>
 </div>
 </div>

 {/* Table */}
 <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
 {filteredEmployees.length === 0 ? (
 <div className="px-6 py-12 text-center text-gray-500">
 <p>{t.noEmployees}</p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{t.staffId}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{t.name}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{t.position}</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-700 text-start`}>{t.department}</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-center">{t.hireDate}</th>
 {(filter === 'renewals' || filter === 'active') && (
 <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-center">{t.contractEnd}</th>
 )}
 <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-center">{t.status}</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-center">{t.actions}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {filteredEmployees.map((employee) => (
 <tr key={employee.id} className="hover:bg-gray-50">
 <td className="px-4 py-3 text-sm text-blue-600 font-mono">{employee.staffId}</td>
 <td className="px-4 py-3 text-sm text-gray-900 font-medium">{employee.fullName}</td>
 <td className="px-4 py-3 text-sm text-gray-700">{employee.position}</td>
 <td className="px-4 py-3 text-sm text-gray-700">{employee.department}</td>
 <td className="px-4 py-3 text-sm text-gray-700 text-center">{formatDate(employee.hireDate)}</td>
 {(filter === 'renewals' || filter === 'active') && (
 <td className="px-4 py-3 text-sm text-gray-700 text-center">{formatDate(employee.contractEndDate)}</td>
 )}
 <td className="px-4 py-3 text-sm text-center">
 <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${ employee.status === 'active' ? 'bg-green-100 text-green-700 border border-green-200' : employee.status === 'archived' ? 'bg-gray-100 text-gray-700 border border-gray-200' : 'bg-red-100 text-red-700 border border-red-200' }`}>
 {getStatusDisplay(employee)}
 </span>
 </td>
 <td className="px-4 py-3 text-sm text-center">
 <div className="flex items-center justify-center gap-2">
 <button
 onClick={() => navigate(`/organization/hr/employees-profiles/view/${employee.id}`)}
 className="text-blue-600 hover:text-blue-700 p-1 hover:bg-blue-50 rounded inline-flex items-center gap-1"
 title={t.viewProfile}
 >
 <Eye className="w-4 h-4" />
 </button>
 {filter === 'archived' && (
 <button
 onClick={() => handleRestore(employee)}
 className="text-green-600 hover:text-green-700 p-1 hover:bg-green-50 rounded inline-flex items-center gap-1 ms-1"
 title={t.restoreStaff}
 >
 <RotateCcw className="w-4 h-4" />
 </button>
 )}
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>

 {/* Stats */}
 <div className={`text-sm text-gray-600 text-start`}>
 {t.showing} {filteredEmployees.length} {t.of} {employees.length} {t.employees}
 </div>
 </div>
 );
}