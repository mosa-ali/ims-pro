/**
 * ============================================================================
 * STAFF DICTIONARY - READ-ONLY INDEX VIEW
 * ============================================================================
 * 
 * ⚠️ STRUCTURE UPDATE (MANDATORY):
 * This is a READ-ONLY navigation layer ONLY.
 * 
 * PRIMARY DATA SOURCE: Employees Directory (inside Employees Profiles)
 * 
 * FEATURES:
 * - Quick HR overview + navigation entry point
 * - View button ONLY (navigates to Employees Directory → Employee Profile)
 * - NO Edit, NO Delete, NO Add from this view
 * - Auto-synced from Employees Directory
 * - Excel export only (no import)
 * - Full bilingual support
 * - Data filtered by Organization ID and Operating Unit ID
 * 
 * All data modifications must occur in:
 * HR → Employees Profiles → Employees Directory
 * 
 * ============================================================================
 */

import { useState } from 'react';
import { 
  Download, 
  Search,
  Eye,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { exportStaffToExcel } from '@/app/utils/staffExcel';
import { BackToModulesButton } from './BackToModulesButton';

// Staff member interface for display
interface StaffMember {
  id: string;
  staffId: string;
  fullName: string;
  gender: string;
  nationality: string;
  position: string;
  department: string;
  projects: string[];
  contractType: string;
  status: 'active' | 'archived' | 'exited';
  hireDate: string;
  contractStartDate: string;
  contractEndDate?: string;
}

export function StaffDictionary() {
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived' | 'exited'>('all');

  // Get organizationId and operatingUnitId from user context
  const organizationId = user?.organizationId || 0;
  const operatingUnitId = user?.operatingUnitId || 0;

  // Fetch employees from database using tRPC with organization/OU filtering
  const { data: employees, isLoading, error } = trpc.hrEmployees.getAll.useQuery(
    { organizationId, operatingUnitId },
    { enabled: organizationId > 0 && operatingUnitId > 0 }
  );

  // Transform database employees to StaffMember format
  const staff: StaffMember[] = (employees || []).map(emp => ({
    id: String(emp.id),
    staffId: emp.employeeCode || `EMP-${emp.id}`,
    fullName: emp.fullName,
    gender: emp.gender || 'Other',
    nationality: emp.nationality || '',
    position: emp.position || '',
    department: emp.department || '',
    projects: emp.department ? [emp.department] : [],
    contractType: emp.employmentType || 'Full-Time',
    status: (emp.status as 'active' | 'archived' | 'exited') || 'active',
    hireDate: emp.hireDate ? new Date(emp.hireDate).toISOString().split('T')[0] : '',
    contractStartDate: emp.contractStartDate ? new Date(emp.contractStartDate).toISOString().split('T')[0] : '',
    contractEndDate: emp.contractEndDate ? new Date(emp.contractEndDate).toISOString().split('T')[0] : undefined,
  }));

  // Translations
  const t = {
    title: language === 'en' ? 'Staff Dictionary' : 'سجل الموظفين',
    subtitle: language === 'en' ? 'Master staff registry and profiles' : 'السجل الرئيسي للموظفين',
    readOnlyWarning: language === 'en' 
      ? '📌 Read-only view. To add, edit, or delete employees, go to Employees Profiles → Employees Directory' 
      : '📌 عرض للقراءة فقط. للإضافة أو التعديل أو الحذف، انتقل إلى ملفات الموظفين → دليل الموظفين',
    
    // Actions
    exportStaff: language === 'en' ? 'Export Staff' : 'تصدير',
    search: language === 'en' ? 'Search staff...' : 'البحث...',
    
    // Table headers
    staffId: language === 'en' ? 'Staff ID' : 'رقم الموظف',
    fullName: language === 'en' ? 'Full Name' : 'الاسم الكامل',
    gender: language === 'en' ? 'Gender' : 'الجنس',
    nationality: language === 'en' ? 'Nationality' : 'الجنسية',
    position: language === 'en' ? 'Position' : 'المنصب',
    hireDate: language === 'en' ? 'Hire Date' : 'تاريخ التعيين',
    department: language === 'en' ? 'Department' : 'القسم',
    projects: language === 'en' ? 'Project(s)' : 'المشاريع',
    contractType: language === 'en' ? 'Contract Type' : 'نوع العقد',
    status: language === 'en' ? 'Status' : 'الحالة',
    startedDate: language === 'en' ? 'Started Date' : 'تاريخ البدء',
    endDate: language === 'en' ? 'End Date' : 'تاريخ الانتهاء',
    actions: language === 'en' ? 'Actions' : 'الإجراءات',
    
    // Status
    active: language === 'en' ? 'Active' : 'نشط',
    archived: language === 'en' ? 'Archived' : 'مؤرشف',
    exited: language === 'en' ? 'Exited' : 'غادر',
    all: language === 'en' ? 'All' : 'الكل',
    
    // Gender translations
    male: language === 'en' ? 'Male' : 'ذكر',
    female: language === 'en' ? 'Female' : 'أنثى',
    
    // Contract type translations
    fixedTerm: language === 'en' ? 'Fixed-Term' : 'محدد المدة',
    shortTerm: language === 'en' ? 'Short-Term' : 'قصير المدة',
    consultancy: language === 'en' ? 'Consultancy' : 'استشاري',
    permanent: language === 'en' ? 'Permanent' : 'دائم',
    fullTime: language === 'en' ? 'Full-Time' : 'دوام كامل',
    partTime: language === 'en' ? 'Part-Time' : 'دوام جزئي',
    
    // Action button
    view: language === 'en' ? 'View Profile' : 'عرض الملف',
    
    // Messages
    noStaff: language === 'en' ? 'No staff members found' : 'لم يتم العثور على موظفين',
    loading: language === 'en' ? 'Loading staff...' : 'جاري تحميل الموظفين...',
    error: language === 'en' ? 'Error loading staff' : 'خطأ في تحميل الموظفين',
    showing: language === 'en' ? 'Showing' : 'عرض',
    of: language === 'en' ? 'of' : 'من',
    staffMembers: language === 'en' ? 'staff members' : 'موظفين',
  };

  // Handle View (Navigate to Employee Profile in Employees Directory)
  const handleView = (staffMember: StaffMember) => {
    navigate(`/hr/employees-profiles/view/${staffMember.id}`);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-50 text-green-700 border border-green-200';
      case 'archived': return 'bg-gray-50 text-gray-600 border border-gray-300';
      case 'exited': return 'bg-red-50 text-red-600 border border-red-200';
      default: return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };
  
  // Get status label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return t.active;
      case 'archived': return t.archived;
      case 'exited': return t.exited;
      default: return status;
    }
  };
  
  // Get gender label
  const getGenderLabel = (gender: string) => {
    if (language === 'ar') {
      return gender.toLowerCase() === 'male' ? t.male : t.female;
    }
    return gender;
  };
  
  // Get contract type label
  const getContractTypeLabel = (contractType: string) => {
    if (language === 'ar') {
      switch (contractType.toLowerCase()) {
        case 'fixed-term': return t.fixedTerm;
        case 'short-term': return t.shortTerm;
        case 'consultancy': return t.consultancy;
        case 'permanent': return t.permanent;
        case 'full-time': return t.fullTime;
        case 'part-time': return t.partTime;
        default: return contractType;
      }
    }
    return contractType;
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar' : 'en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter staff
  const filteredStaff = staff.filter(s => {
    const matchesSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.staffId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <BackToModulesButton 
          targetPath="/organization/hr"
          parentModuleName={language === 'en' ? 'HR Dashboard' : 'لوحة الموارد البشرية'}
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">{t.loading}</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <BackToModulesButton 
          targetPath="/organization/hr"
          parentModuleName={language === 'en' ? 'HR Dashboard' : 'لوحة الموارد البشرية'}
        />
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-900">{t.error}: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back to HR Dashboard */}
      <BackToModulesButton 
        targetPath="/organization/hr"
        parentModuleName={language === 'en' ? 'HR Dashboard' : 'لوحة الموارد البشرية'}
      />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        <p className="text-gray-600 mt-1">{t.subtitle}</p>
      </div>

      {/* Read-Only Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-900">{t.readOnlyWarning}</p>
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
          
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t.all}</option>
            <option value="active">{t.active}</option>
            <option value="archived">{t.archived}</option>
            <option value="exited">{t.exited}</option>
          </select>
        </div>

        {/* Export Button Only */}
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => exportStaffToExcel(staff as any)}
            className={`flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Download className="w-5 h-5" />
            <span>{t.exportStaff}</span>
          </button>
        </div>
      </div>

      {/* Table with 10 Columns */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredStaff.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <p>{t.noStaff}</p>
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
                  <th className="px-3 py-3 text-xs font-semibold text-gray-700 text-center" style={{ minWidth: '100px' }}>{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStaff.map((staffMember) => (
                  <tr key={staffMember.id} className="hover:bg-gray-50">
                    {/* 1. Staff ID */}
                    <td className="px-3 py-2 text-xs text-blue-600 font-mono">{staffMember.staffId}</td>
                    
                    {/* 2. Full Name */}
                    <td className="px-3 py-2 text-xs text-gray-900 font-medium">{staffMember.fullName}</td>
                    
                    {/* 3. Gender */}
                    <td className="px-3 py-2 text-xs text-gray-700">{getGenderLabel(staffMember.gender)}</td>
                    
                    {/* 4. Position */}
                    <td className="px-3 py-2 text-xs text-gray-700">{staffMember.position}</td>
                    
                    {/* 5. Project(s) - Display as tags */}
                    <td className="px-3 py-2 text-xs">
                      <div className="flex flex-wrap gap-1">
                        {staffMember.projects.map((project, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                            {project}
                          </span>
                        ))}
                      </div>
                    </td>
                    
                    {/* 6. Contract Type */}
                    <td className="px-3 py-2 text-xs text-gray-700">{getContractTypeLabel(staffMember.contractType)}</td>
                    
                    {/* 7. Status */}
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(staffMember.status)}`}>
                        {getStatusLabel(staffMember.status)}
                      </span>
                    </td>
                    
                    {/* 8. Started Date */}
                    <td className="px-3 py-2 text-xs text-gray-700 text-center">{formatDate(staffMember.contractStartDate || staffMember.hireDate)}</td>
                    
                    {/* 9. End Date */}
                    <td className="px-3 py-2 text-xs text-gray-700 text-center">{formatDate(staffMember.contractEndDate)}</td>
                    
                    {/* 10. Actions - View Only */}
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => handleView(staffMember)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title={t.view}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer with count */}
      <div className="text-sm text-gray-500">
        {t.showing} {filteredStaff.length} {t.of} {staff.length} {t.staffMembers}
      </div>
    </div>
  );
}
