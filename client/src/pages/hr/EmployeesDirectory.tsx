import { Link } from 'wouter';
/**
 * ============================================================================
 * EMPLOYEES DIRECTORY - MASTER DATA SOURCE
 * ============================================================================
 * 
 * ⚠️ AUTHORITATIVE DATA SOURCE (MANDATORY):
 * This is the PRIMARY and ONLY location for employee data management.
 * 
 * FULL CRUD OPERATIONS:
 * - Create (Add Employee)
 * - Read (View Employee Profile with 8 sub-tabs)
 * - Update (Edit Employee)
 * - Delete (Soft-delete with restore capability)
 * - Archive (Change status to Archived)
 * 
 * SINGLE SOURCE OF TRUTH:
 * - All other HR views (Staff Dictionary, Reports) are READ-ONLY
 * - Changes here propagate system-wide instantly
 * - Used by: Payroll, Leave, Contracts, Salary Scale
 * 
 * 10 COLUMNS DISPLAYED:
 * 1. Staff ID
 * 2. Name
 * 3. Gender
 * 4. Position
 * 5. Project(s)
 * 6. Contract Type
 * 7. Status
 * 8. Started Date
 * 9. End Date
 * 10. Actions (View, Delete, Archive)
 * 
 * Note: Nationality, Hire Date, and Department are visible in employee profile view
 * 
 * ============================================================================
 */

import { useState } from 'react';
import { 
 Plus, 
 Download, 
 Upload,
 Search,
 Eye,
 Edit,
 Trash2,
 Archive as ArchiveIcon,
 ArrowLeft, ArrowRight,
 Loader2
} from 'lucide-react';
import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';
import { trpc } from '@/lib/trpc';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

// Employee type from database
interface Employee {
 id: number;
 employeeCode: string | null;
 firstName: string | null;
 lastName: string | null;
 gender: string | null;
 position: string | null;
 department: string | null;
 employmentType: string | null;
 status: string | null;
 contractStartDate: Date | null;
 contractEndDate: Date | null;
 hireDate: Date | null;
}

export function EmployeesDirectory() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const navigate = useNavigate();
 const { currentOrganizationId } = useOrganization();
 const { currentOperatingUnitId } = useOperatingUnit();
 
 const [searchTerm, setSearchTerm] = useState('');
 const [filterDepartment, setFilterDepartment] = useState<string>('all');
 
 const { data: employees = [], isLoading, refetch } = trpc.hrEmployees.getAll.useQuery(
 {
 status: 'active',
 limit: 500,
 },
 {
 enabled: !!currentOrganizationId && !!currentOperatingUnitId,
 }
 );

 // Delete mutation
 const deleteMutation = trpc.hrEmployees.delete.useMutation({
 onSuccess: () => {
 refetch();
 alert(t.deleteSuccess);
 },
 onError: (err) => {
 alert(`Delete failed: ${err.message}`);
 }
 });

 // Update mutation for archive
 const updateMutation = trpc.hrEmployees.update.useMutation({
 onSuccess: () => {
 refetch();
 alert(t.archiveSuccess);
 },
 onError: (err) => {
 alert(`Archive failed: ${err.message}`);
 }
 });

 const labels = {
 title: t.hr.employeesDirectory,
 subtitle: t.hr.activeEmployeesWithFullLifecycleProfiles,
 
 back: t.hr.employeesProfiles,
 search: t.hr.searchEmployees,
 addEmployee: t.hr.addEmployee,
 exportExcel: t.hr.export,
 importExcel: t.hr.import,
 
 // Table columns (10 columns)
 staffId: t.hr.staffId,
 fullName: t.hr.name,
 gender: t.hr.gender,
 position: t.hr.position,
 projects: t.hr.projects,
 contractType: t.hr.contractType,
 status: t.hr.status,
 startedDate: t.hr.startedDate,
 endDate: t.hr.endDate,
 actions: t.hr.actions,
 
 // Status & Gender
 active: t.hr.active,
 archived: t.hr.archived,
 exited: t.hr.exited,
 male: t.hr.male,
 female: t.hr.female,
 
 // Contract types
 fullTime: t.hr.fulltime,
 partTime: t.hr.parttime,
 contract: t.hr.contract,
 consultant: t.hr.consultant,
 intern: t.hr.intern,
 
 // Actions
 view: t.hr.view,
 delete: t.hr.delete,
 archive: t.hr.archive,
 
 // Messages
 deleteConfirm: 'Delete this employee? This can be restored from Settings → Deleted Records.',
 archiveConfirm: 'Archive this employee? They will be excluded from payroll and active operations.',
 deleteSuccess: 'Employee deleted. Can be restored from Settings → Deleted Records.',
 archiveSuccess: 'Employee archived successfully.',
 
 noEmployees: t.hr.noEmployeesFound,
 filterDept: t.hr.allDepartments,
 loading: t.hr.loadingEmployees,
 };

 // Handle Delete (Soft-delete)
 const handleDelete = (employee: Employee) => {
 if (!confirm(labels.deleteConfirm)) return;
 deleteMutation.mutate({ id: employee.id });
 };

 // Handle Archive
 const handleArchive = (employee: Employee) => {
 if (!confirm(labels.archiveConfirm)) return;
 updateMutation.mutate({ id: employee.id, status: 'suspended' });
 };

 // Handle Excel Export (placeholder)
 const handleExport = () => {
 alert(t.hr.exportFeatureComingSoon);
 };

 // Handle Excel Import (placeholder)
 const handleImportClick = () => {
 alert(t.hr.importFeatureComingSoon);
 };

 // Get unique departments
 const departments = Array.from(new Set(employees.map(e => e.department).filter(Boolean)));

 // Filter employees
 const filteredEmployees = employees.filter(e => {
 const fullName = `${e.firstName || ''} ${e.lastName || ''}`.toLowerCase();
 const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
 (e.employeeCode || '').toLowerCase().includes(searchTerm.toLowerCase());
 const matchesDept = filterDepartment === 'all' || e.department === filterDepartment;
 return matchesSearch && matchesDept;
 });

 // Format date
 const formatDate = (date: Date | null | undefined) => {
 if (!date) return '-';
 return new Date(date).toLocaleDateString(t.hr.en, {
 year: 'numeric',
 month: 'short',
 day: 'numeric'
 });
 };

 // Get gender label
 const getGenderLabel = (gender: string | null) => {
 if (!gender) return '-';
 if (language === 'ar') {
 return gender.toLowerCase() === 'male' ? labels.male : labels.female;
 }
 return gender.charAt(0).toUpperCase() + gender.slice(1);
 };

 // Get contract type label
 const getContractTypeLabel = (employmentType: string | null) => {
 if (!employmentType) return '-';
 if (language === 'ar') {
 switch (employmentType.toLowerCase()) {
 case 'full_time': return labels.fullTime;
 case 'part_time': return labels.partTime;
 case 'contract': return labels.contract;
 case 'consultant': return labels.consultant;
 case 'intern': return labels.intern;
 default: return employmentType;
 }
 }
 return employmentType.replace('_', '-');
 };

 // Get full name
 const getFullName = (employee: Employee) => {
 return `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || '-';
 };

 if (isLoading) {
 return (
 <div className="flex items-center justify-center py-20" dir={isRTL ? 'rtl' : 'ltr'}>
 <BackButton href="/organization/hr" label={t.hr.hrDashboard} />

 <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
 <span className="ms-3 text-gray-600">{labels.loading}</span>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 {/* Back Button */}
 <button
 onClick={() => navigate('/organization/hr/employees-profiles')}
 className={`flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors`}
 >
 {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
 <span>{labels.back}</span>
 </button>

 {/* Header */}
 <div className={'text-start'}>
 <h1 className="text-2xl font-bold text-gray-900">{labels.title}</h1>
 <p className="text-gray-600 mt-1">{labels.subtitle}</p>
 </div>

 {/* Actions Bar */}
 <div className="flex items-center justify-between gap-4">
 <div className={`flex items-center gap-4`}>
 {/* Search */}
 <div className="relative">
 <Search className={`absolute top-2.5 ${'start-3'} w-5 h-5 text-gray-400`} />
 <input
 type="text"
 placeholder={labels.search}
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className={`ps-10 py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64`}
 />
 </div>
 
 {/* Department Filter */}
 <select
 value={filterDepartment}
 onChange={(e) => setFilterDepartment(e.target.value)}
 className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
 >
 <option value="all">{labels.filterDept}</option>
 {departments.map(dept => (
 <option key={dept} value={dept!}>{dept}</option>
 ))}
 </select>
 </div>

 {/* Action Buttons */}
 <div className={`flex items-center gap-2`}>
 <button
 onClick={() => navigate('/organization/hr/employees/add')}
 className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700`}
 >
 <Plus className="w-5 h-5" />
 <span>{labels.addEmployee}</span>
 </button>
 <button
 onClick={handleImportClick}
 className={`flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50`}
 >
 <Upload className="w-5 h-5" />
 <span>{labels.importExcel}</span>
 </button>
 <button
 onClick={handleExport}
 className={`flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50`}
 >
 <Download className="w-5 h-5" />
 <span>{labels.exportExcel}</span>
 </button>
 </div>
 </div>

 {/* Employees Table with 10 Columns */}
 <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
 {filteredEmployees.length === 0 ? (
 <div className="px-6 py-12 text-center text-gray-500">
 <p>{labels.noEmployees}</p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className={`px-3 py-3 text-xs font-semibold text-gray-700 text-start`} style={{ minWidth: '100px' }}>{labels.staffId}</th>
 <th className={`px-3 py-3 text-xs font-semibold text-gray-700 text-start`} style={{ minWidth: '180px' }}>{labels.fullName}</th>
 <th className={`px-3 py-3 text-xs font-semibold text-gray-700 text-start`}>{labels.gender}</th>
 <th className={`px-3 py-3 text-xs font-semibold text-gray-700 text-start`}>{labels.position}</th>
 <th className={`px-3 py-3 text-xs font-semibold text-gray-700 text-start`} style={{ minWidth: '150px' }}>{labels.projects}</th>
 <th className={`px-3 py-3 text-xs font-semibold text-gray-700 text-start`}>{labels.contractType}</th>
 <th className="px-3 py-3 text-xs font-semibold text-gray-700 text-center">{labels.status}</th>
 <th className="px-3 py-3 text-xs font-semibold text-gray-700 text-center" style={{ minWidth: '110px' }}>{labels.startedDate}</th>
 <th className="px-3 py-3 text-xs font-semibold text-gray-700 text-center" style={{ minWidth: '110px' }}>{labels.endDate}</th>
 <th className="px-3 py-3 text-xs font-semibold text-gray-700 text-center" style={{ minWidth: '140px' }}>{labels.actions}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {filteredEmployees.map((employee) => (
 <tr key={employee.id} className="hover:bg-gray-50">
 {/* 1. Staff ID */}
 <td className="px-3 py-2 text-xs text-blue-600 font-mono">{employee.employeeCode || `EMP-${employee.id}`}</td>
 
 {/* 2. Name */}
 <td className="px-3 py-2 text-xs text-gray-900 font-medium">{getFullName(employee)}</td>
 
 {/* 3. Gender */}
 <td className="px-3 py-2 text-xs text-gray-700">{getGenderLabel(employee.gender)}</td>
 
 {/* 4. Position */}
 <td className="px-3 py-2 text-xs text-gray-700">{employee.position || '-'}</td>
 
 {/* 5. Project(s) */}
 <td className="px-3 py-2 text-xs">
 <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
 {employee.department || '-'}
 </span>
 </td>
 
 {/* 6. Contract Type */}
 <td className="px-3 py-2 text-xs text-gray-700">{getContractTypeLabel(employee.employmentType)}</td>
 
 {/* 7. Status */}
 <td className="px-3 py-2 text-xs text-center">
 <span className="inline-block px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded text-xs font-medium">
 {labels.active}
 </span>
 </td>
 
 {/* 8. Started Date (Contract Start) */}
 <td className="px-3 py-2 text-xs text-gray-700 text-center">{formatDate(employee.contractStartDate || employee.hireDate)}</td>
 
 {/* 9. End Date (Contract End) */}
 <td className="px-3 py-2 text-xs text-gray-700 text-center">{formatDate(employee.contractEndDate)}</td>
 
 {/* 10. Actions (View, Edit, Delete, Archive) */}
 <td className="px-3 py-2 text-xs text-center">
 <div className="flex items-center justify-center gap-1">
 <button
 onClick={() => navigate(`/organization/hr/employees-profiles/view/${employee.id}`)}
 className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
 title={labels.view}
 >
 <Eye className="w-4 h-4" />
 </button>
 <button
 onClick={() => navigate(`/organization/hr/employees-profiles/edit/${employee.id}`)}
 className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
 title={t.hr.edit}
 >
 <Edit className="w-4 h-4" />
 </button>
 <button
 onClick={() => handleDelete(employee)}
 className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
 title={labels.delete}
 >
 <Trash2 className="w-4 h-4" />
 </button>
 <button
 onClick={() => handleArchive(employee)}
 className="p-1.5 text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
 title={labels.archive}
 >
 <ArchiveIcon className="w-4 h-4" />
 </button>
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
 {`Showing ${filteredEmployees.length} of ${employees.length} active employees`
 }
 </div>
 </div>
 );
}
