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
  Trash2,
  Archive as ArchiveIcon,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';

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
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');

  // Fetch employees from database using tRPC
  const organizationId = user?.organizationId || 30001;
  const operatingUnitId = user?.operatingUnitId || 30001;
  
  const { data: employees = [], isLoading, refetch } = trpc.hrEmployees.getAll.useQuery({
    organizationId,
    operatingUnitId,
    status: 'active',
    limit: 500,
  });

  // Delete mutation
  const deleteMutation = trpc.hrEmployees.delete.useMutation({
    onSuccess: () => {
      refetch();
      alert(t.deleteSuccess);
    },
    onError: (err) => {
      alert(language === 'en' ? `Delete failed: ${err.message}` : 'فشل الحذف');
    }
  });

  // Update mutation for archive
  const updateMutation = trpc.hrEmployees.update.useMutation({
    onSuccess: () => {
      refetch();
      alert(t.archiveSuccess);
    },
    onError: (err) => {
      alert(language === 'en' ? `Archive failed: ${err.message}` : 'فشل الأرشفة');
    }
  });

  const t = {
    title: language === 'en' ? 'Employees Directory' : 'دليل الموظفين',
    subtitle: language === 'en' ? 'Active employees with full lifecycle profiles' : 'الموظفون النشطون مع ملفات دورة الحياة الكاملة',
    
    back: language === 'en' ? 'Employees Profiles' : 'ملفات الموظفين',
    search: language === 'en' ? 'Search employees...' : 'البحث عن موظفين...',
    addEmployee: language === 'en' ? 'Add Employee' : 'إضافة موظف',
    exportExcel: language === 'en' ? 'Export' : 'تصدير',
    importExcel: language === 'en' ? 'Import' : 'استيراد',
    
    // Table columns (10 columns)
    staffId: language === 'en' ? 'Staff ID' : 'رقم الموظف',
    fullName: language === 'en' ? 'Name' : 'الاسم',
    gender: language === 'en' ? 'Gender' : 'الجنس',
    position: language === 'en' ? 'Position' : 'المنصب',
    projects: language === 'en' ? 'Project(s)' : 'المشاريع',
    contractType: language === 'en' ? 'Contract Type' : 'نوع العقد',
    status: language === 'en' ? 'Status' : 'الحالة',
    startedDate: language === 'en' ? 'Started Date' : 'تاريخ البدء',
    endDate: language === 'en' ? 'End Date' : 'تاريخ الانتهاء',
    actions: language === 'en' ? 'Actions' : 'الإجراءات',
    
    // Status & Gender
    active: language === 'en' ? 'Active' : 'نشط',
    archived: language === 'en' ? 'Archived' : 'مؤرشف',
    exited: language === 'en' ? 'Exited' : 'غادر',
    male: language === 'en' ? 'Male' : 'ذكر',
    female: language === 'en' ? 'Female' : 'أنثى',
    
    // Contract types
    fullTime: language === 'en' ? 'Full-time' : 'دوام كامل',
    partTime: language === 'en' ? 'Part-time' : 'دوام جزئي',
    contract: language === 'en' ? 'Contract' : 'عقد',
    consultant: language === 'en' ? 'Consultant' : 'استشاري',
    intern: language === 'en' ? 'Intern' : 'متدرب',
    
    // Actions
    view: language === 'en' ? 'View' : 'عرض',
    delete: language === 'en' ? 'Delete' : 'حذف',
    archive: language === 'en' ? 'Archive' : 'أرشفة',
    
    // Messages
    deleteConfirm: language === 'en' 
      ? 'Delete this employee? This can be restored from Settings → Deleted Records.' 
      : 'حذف هذا الموظف؟ يمكن استعادته من الإعدادات → السجلات المحذوفة.',
    archiveConfirm: language === 'en'
      ? 'Archive this employee? They will be excluded from payroll and active operations.'
      : 'أرشفة هذا الموظف؟ سيتم استبعاده من كشف الرواتب.',
    deleteSuccess: language === 'en'
      ? 'Employee deleted. Can be restored from Settings → Deleted Records.'
      : 'تم حذف الموظف. يمكن استعادته من الإعدادات → السجلات المحذوفة.',
    archiveSuccess: language === 'en'
      ? 'Employee archived successfully.'
      : 'تم أرشفة الموظف بنجاح.',
    
    noEmployees: language === 'en' ? 'No employees found' : 'لم يتم العثور على موظفين',
    filterDept: language === 'en' ? 'All Departments' : 'جميع الأقسام',
    loading: language === 'en' ? 'Loading employees...' : 'جاري تحميل الموظفين...',
  };

  // Handle Delete (Soft-delete)
  const handleDelete = (employee: Employee) => {
    if (!confirm(t.deleteConfirm)) return;
    deleteMutation.mutate({ id: employee.id });
  };

  // Handle Archive
  const handleArchive = (employee: Employee) => {
    if (!confirm(t.archiveConfirm)) return;
    updateMutation.mutate({ id: employee.id, status: 'suspended' });
  };

  // Handle Excel Export (placeholder)
  const handleExport = () => {
    alert(language === 'en' ? 'Export feature coming soon' : 'ميزة التصدير قريباً');
  };

  // Handle Excel Import (placeholder)
  const handleImportClick = () => {
    alert(language === 'en' ? 'Import feature coming soon' : 'ميزة الاستيراد قريباً');
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
    return new Date(date).toLocaleDateString(language === 'ar' ? 'ar' : 'en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get gender label
  const getGenderLabel = (gender: string | null) => {
    if (!gender) return '-';
    if (language === 'ar') {
      return gender.toLowerCase() === 'male' ? t.male : t.female;
    }
    return gender.charAt(0).toUpperCase() + gender.slice(1);
  };

  // Get contract type label
  const getContractTypeLabel = (employmentType: string | null) => {
    if (!employmentType) return '-';
    if (language === 'ar') {
      switch (employmentType.toLowerCase()) {
        case 'full_time': return t.fullTime;
        case 'part_time': return t.partTime;
        case 'contract': return t.contract;
        case 'consultant': return t.consultant;
        case 'intern': return t.intern;
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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">{t.loading}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Back Button */}
      <button
        onClick={() => navigate('/organization/hr/employees-profiles')}
        className={`flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
      >
        <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
        <span>{t.back}</span>
      </button>

      {/* Header */}
      <div className={isRTL ? 'text-right' : 'text-left'}>
        <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        <p className="text-gray-600 mt-1">{t.subtitle}</p>
      </div>

      {/* Actions Bar */}
      <div className={`flex items-center justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {/* Search */}
          <div className="relative">
            <Search className={`absolute top-2.5 ${isRTL ? 'right-3' : 'left-3'} w-5 h-5 text-gray-400`} />
            <input
              type="text"
              placeholder={t.search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${isRTL ? 'pr-10 text-right' : 'pl-10'} py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64`}
            />
          </div>
          
          {/* Department Filter */}
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t.filterDept}</option>
            {departments.map(dept => (
              <option key={dept} value={dept!}>{dept}</option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => navigate('/organization/hr/employees/add')}
            className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Plus className="w-5 h-5" />
            <span>{t.addEmployee}</span>
          </button>
          <button
            onClick={handleImportClick}
            className={`flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Upload className="w-5 h-5" />
            <span>{t.importExcel}</span>
          </button>
          <button
            onClick={handleExport}
            className={`flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Download className="w-5 h-5" />
            <span>{t.exportExcel}</span>
          </button>
        </div>
      </div>

      {/* Employees Table with 10 Columns */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredEmployees.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <p>{t.noEmployees}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-3 text-xs font-semibold text-gray-700 text-left" style={{ minWidth: '100px' }}>{t.staffId}</th>
                  <th className="px-3 py-3 text-xs font-semibold text-gray-700 text-left" style={{ minWidth: '180px' }}>{t.fullName}</th>
                  <th className="px-3 py-3 text-xs font-semibold text-gray-700 text-left">{t.gender}</th>
                  <th className="px-3 py-3 text-xs font-semibold text-gray-700 text-left">{t.position}</th>
                  <th className="px-3 py-3 text-xs font-semibold text-gray-700 text-left" style={{ minWidth: '150px' }}>{t.projects}</th>
                  <th className="px-3 py-3 text-xs font-semibold text-gray-700 text-left">{t.contractType}</th>
                  <th className="px-3 py-3 text-xs font-semibold text-gray-700 text-center">{t.status}</th>
                  <th className="px-3 py-3 text-xs font-semibold text-gray-700 text-center" style={{ minWidth: '110px' }}>{t.startedDate}</th>
                  <th className="px-3 py-3 text-xs font-semibold text-gray-700 text-center" style={{ minWidth: '110px' }}>{t.endDate}</th>
                  <th className="px-3 py-3 text-xs font-semibold text-gray-700 text-center" style={{ minWidth: '140px' }}>{t.actions}</th>
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
                        {t.active}
                      </span>
                    </td>
                    
                    {/* 8. Started Date (Contract Start) */}
                    <td className="px-3 py-2 text-xs text-gray-700 text-center">{formatDate(employee.contractStartDate || employee.hireDate)}</td>
                    
                    {/* 9. End Date (Contract End) */}
                    <td className="px-3 py-2 text-xs text-gray-700 text-center">{formatDate(employee.contractEndDate)}</td>
                    
                    {/* 10. Actions (View, Delete, Archive) */}
                    <td className="px-3 py-2 text-xs text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => navigate(`/organization/hr/employees-profiles/view/${employee.id}`)}
                          className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                          title={t.view}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(employee)}
                          className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                          title={t.delete}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleArchive(employee)}
                          className="p-1.5 text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                          title={t.archive}
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
      <div className={`text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
        {language === 'en' 
          ? `Showing ${filteredEmployees.length} of ${employees.length} active employees`
          : `عرض ${filteredEmployees.length} من ${employees.length} موظف نشط`
        }
      </div>
    </div>
  );
}
