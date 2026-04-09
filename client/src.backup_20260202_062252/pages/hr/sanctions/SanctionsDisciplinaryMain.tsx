/**
 * ============================================================================
 * SANCTIONS & DISCIPLINARY - MAIN VIEW (EMPLOYEES LIST)
 * ============================================================================
 * 
 * PURPOSE:
 * Entry point for disciplinary case management
 * 
 * FEATURES:
 * - Tab 1: Employees List (Active + Archived staff)
 * - Tab 2: Policies & Guidelines
 * - Filters: Department, Position, Status
 * - Action: Start Disciplinary Case
 * 
 * DATA SOURCE:
 * - Auto-loaded from Staff Dictionary (hr_staff_members)
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { useNavigate } from '@/lib/router-compat';
import {
  AlertTriangle,
  Users,
  FileText,
  Filter,
  Search,
  Plus,
  Eye,
  Shield,
  BookOpen,
  ChevronRight
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { BackToModulesButton } from '../BackToModulesButton';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface StaffMember {
  staffId: string;
  fullName: string;
  position: string;
  department: string;
  status: 'active' | 'archived' | 'exited';
  contractType?: string;
  grade?: string;
  hireDate?: string;
}

interface Filters {
  department: string;
  position: string;
  status: string;
  searchTerm: string;
}

// ============================================================================
// STAFF SERVICE
// ============================================================================

const staffService = {
  getAll(): StaffMember[] {
    try {
      const data = localStorage.getItem('hr_staff_members');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }
};

// ============================================================================
// COMPONENT
// ============================================================================

export function SanctionsDisciplinaryMain() {
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'employees' | 'policies'>('employees');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState<Filters>({
    department: '',
    position: '',
    status: '',
    searchTerm: ''
  });

  useEffect(() => {
    loadStaff();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [staff, filters]);

  const loadStaff = () => {
    const allStaff = staffService.getAll();
    // Only show Active and Archived staff (not Exited)
    const activeOrArchived = allStaff.filter(s => 
      s.status === 'active' || s.status === 'archived'
    );
    setStaff(activeOrArchived);
  };

  const applyFilters = () => {
    let filtered = [...staff];

    // Search term
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.staffId.toLowerCase().includes(term) ||
        s.fullName.toLowerCase().includes(term) ||
        s.position.toLowerCase().includes(term) ||
        s.department.toLowerCase().includes(term)
      );
    }

    // Department filter
    if (filters.department) {
      filtered = filtered.filter(s => s.department === filters.department);
    }

    // Position filter
    if (filters.position) {
      filtered = filtered.filter(s => 
        s.position.toLowerCase().includes(filters.position.toLowerCase())
      );
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(s => s.status === filters.status);
    }

    setFilteredStaff(filtered);
  };

  const resetFilters = () => {
    setFilters({
      department: '',
      position: '',
      status: '',
      searchTerm: ''
    });
  };

  const handleStartDisciplinaryCase = (staffMember: StaffMember) => {
    // Navigate to Form 1 - Disciplinary Case Initiation
    navigate(`/organization/hr/sanctions/form1/${staffMember.staffId}`);
  };

  // Get unique departments
  const departments = Array.from(new Set(staff.map(s => s.department))).filter(Boolean);

  const t = {
    title: language === 'en' ? 'Sanctions & Disciplinary' : 'العقوبات والإجراءات التأديبية',
    subtitle: language === 'en'
      ? 'Complete disciplinary case management from allegation to closure'
      : 'إدارة القضايا التأديبية الكاملة من الادعاء إلى الإغلاق',
    
    // Tabs
    employeesTab: language === 'en' ? 'Employees List' : 'قائمة الموظفين',
    policiesTab: language === 'en' ? 'Policies & Guidelines' : 'السياسات والإرشادات',
    
    // Actions
    startCase: language === 'en' ? 'Start Disciplinary Case' : 'بدء قضية تأديبية',
    filters: language === 'en' ? 'Filters' : 'الفلاتر',
    search: language === 'en' ? 'Search by name, Staff ID, position...' : 'البحث بالاسم أو رقم الموظف أو الوظيفة...',
    resetFilters: language === 'en' ? 'Reset' : 'إعادة تعيين',
    showFilters: language === 'en' ? 'Show Filters' : 'إظهار الفلاتر',
    hideFilters: language === 'en' ? 'Hide Filters' : 'إخفاء الفلاتر',
    
    // Filters
    filterByDepartment: language === 'en' ? 'Department' : 'القسم',
    filterByPosition: language === 'en' ? 'Position' : 'الوظيفة',
    filterByStatus: language === 'en' ? 'Status' : 'الحالة',
    allDepartments: language === 'en' ? 'All Departments' : 'جميع الأقسام',
    allStatuses: language === 'en' ? 'All Statuses' : 'جميع الحالات',
    
    // Table headers
    staffId: language === 'en' ? 'Staff ID' : 'رقم الموظف',
    fullName: language === 'en' ? 'Full Name' : 'الاسم الكامل',
    position: language === 'en' ? 'Position' : 'الوظيفة',
    department: language === 'en' ? 'Department' : 'القسم',
    status: language === 'en' ? 'Status' : 'الحالة',
    actions: language === 'en' ? 'Actions' : 'الإجراءات',
    
    // Empty state
    noStaff: language === 'en' ? 'No staff members found' : 'لم يتم العثور على موظفين',
    noStaffDesc: language === 'en' 
      ? 'Try adjusting your filters or search term'
      : 'حاول تعديل الفلاتر أو مصطلح البحث',
    
    // Info banner
    importantNote: language === 'en' ? 'Important Note' : 'ملاحظة هامة',
    noteText: language === 'en'
      ? 'All disciplinary cases must follow the official 6-step workflow. Each step is documented with official HR forms. Cases become read-only after submission at each stage.'
      : 'يجب أن تتبع جميع القضايا التأديبية سير العمل الرسمي المكون من 6 خطوات. يتم توثيق كل خطوة بنماذج الموارد البشرية الرسمية. تصبح القضايا للقراءة فقط بعد التقديم في كل مرحلة.',
    
    // Policies tab
    policiesTitle: language === 'en' ? 'Disciplinary Policies & Procedures' : 'السياسات والإجراءات التأديبية',
    policiesDesc: language === 'en'
      ? 'Upload and manage disciplinary policies, code of conduct, and internal procedures'
      : 'تحميل وإدارة السياسات التأديبية ومدونة السلوك والإجراءات الداخلية',
    uploadPolicy: language === 'en' ? 'Upload Policy Document' : 'تحميل وثيقة السياسة',
    noPolicies: language === 'en' ? 'No policies uploaded yet' : 'لم يتم تحميل أي سياسات بعد',
    noPoliciesDesc: language === 'en'
      ? 'Upload your organization\'s disciplinary policies and procedures'
      : 'قم بتحميل السياسات والإجراءات التأديبية لمنظمتك',
    
    // Status labels
    active: language === 'en' ? 'Active' : 'نشط',
    archived: language === 'en' ? 'Archived' : 'مؤرشف',
    
    // Statistics
    totalStaff: language === 'en' ? 'Total Staff' : 'جمالي الموظفين',
    activeStaff: language === 'en' ? 'Active' : 'نشط',
    archivedStaff: language === 'en' ? 'Archived' : 'مؤرشف'
  };

  // Calculate statistics
  const stats = {
    total: filteredStaff.length,
    active: filteredStaff.filter(s => s.status === 'active').length,
    archived: filteredStaff.filter(s => s.status === 'archived').length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <BackToModulesButton 
            targetPath="/organization/hr"
            parentModuleName={language === 'en' ? 'HR Dashboard' : 'لوحة الموارد البشرية'}
          />
          
          <div className={`flex items-center justify-between mt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
                  <p className="text-sm text-gray-600 mt-1">{t.subtitle}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Important Note Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <h3 className="text-sm font-semibold text-amber-900">{t.importantNote}</h3>
              <p className="text-sm text-amber-700 mt-1">{t.noteText}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className={`flex border-b border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={() => setActiveTab('employees')}
              className={`flex-1 px-6 py-3 text-sm font-medium ${
                activeTab === 'employees'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className={`flex items-center justify-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Users className="w-4 h-4" />
                <span>{t.employeesTab}</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('policies')}
              className={`flex-1 px-6 py-3 text-sm font-medium ${
                activeTab === 'policies'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className={`flex items-center justify-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <BookOpen className="w-4 h-4" />
                <span>{t.policiesTab}</span>
              </div>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'employees' ? (
              <>
                {/* Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Users className="w-8 h-8 text-blue-600" />
                      <div className={isRTL ? 'text-right' : 'text-left'}>
                        <p className="text-xs text-blue-700">{t.totalStaff}</p>
                        <p className="text-xl font-bold text-blue-900">{stats.total}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-lg border border-green-200 p-4">
                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Shield className="w-8 h-8 text-green-600" />
                      <div className={isRTL ? 'text-right' : 'text-left'}>
                        <p className="text-xs text-green-700">{t.activeStaff}</p>
                        <p className="text-xl font-bold text-green-900">{stats.active}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <FileText className="w-8 h-8 text-gray-600" />
                      <div className={isRTL ? 'text-right' : 'text-left'}>
                        <p className="text-xs text-gray-700">{t.archivedStaff}</p>
                        <p className="text-xl font-bold text-gray-900">{stats.archived}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Search and Filters */}
                <div className={`flex flex-col md:flex-row gap-4 mb-6 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
                  {/* Search */}
                  <div className="flex-1">
                    <div className="relative">
                      <Search className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} w-5 h-5 text-gray-400`} />
                      <input
                        type="text"
                        value={filters.searchTerm}
                        onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                        placeholder={t.search}
                        className={`w-full ${isRTL ? 'pr-10 text-right' : 'pl-10'} py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent`}
                      />
                    </div>
                  </div>

                  {/* Filter Toggle */}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <Filter className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">
                      {showFilters ? t.hideFilters : t.showFilters}
                    </span>
                  </button>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Department Filter */}
                      <div>
                        <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                          {t.filterByDepartment}
                        </label>
                        <select
                          value={filters.department}
                          onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                        >
                          <option value="">{t.allDepartments}</option>
                          {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                      </div>

                      {/* Position Filter */}
                      <div>
                        <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                          {t.filterByPosition}
                        </label>
                        <input
                          type="text"
                          value={filters.position}
                          onChange={(e) => setFilters({ ...filters, position: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                          placeholder={t.filterByPosition}
                        />
                      </div>

                      {/* Status Filter */}
                      <div>
                        <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                          {t.filterByStatus}
                        </label>
                        <select
                          value={filters.status}
                          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                        >
                          <option value="">{t.allStatuses}</option>
                          <option value="active">{t.active}</option>
                          <option value="archived">{t.archived}</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-4">
                      <button
                        onClick={resetFilters}
                        className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        {t.resetFilters}
                      </button>
                    </div>
                  </div>
                )}

                {/* Staff Table */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  {filteredStaff.length === 0 ? (
                    <div className="p-12 text-center">
                      <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.noStaff}</h3>
                      <p className="text-sm text-gray-600">{t.noStaffDesc}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-left">{t.staffId}</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-left">{t.fullName}</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-left">{t.position}</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-left">{t.department}</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-left">{t.status}</th>
                            <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-left">{t.actions}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {filteredStaff.map((member) => (
                            <tr key={member.staffId} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900 font-mono">{member.staffId}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                                {member.fullName}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">{member.position}</td>
                              <td className="px-4 py-3 text-sm text-gray-700">{member.department}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                                  member.status === 'active'
                                    ? 'bg-green-100 text-green-700 border-green-200'
                                    : 'bg-gray-100 text-gray-700 border-gray-200'
                                }`}>
                                  {member.status === 'active' ? t.active : t.archived}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => handleStartDisciplinaryCase(member)}
                                  className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}
                                >
                                  <Plus className="w-4 h-4" />
                                  <span>{t.startCase}</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : (
              // Policies Tab
              <div>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">{t.policiesTitle}</h2>
                  <p className="text-sm text-gray-600 mb-6">{t.policiesDesc}</p>
                </div>

                <div className="p-12 text-center border-2 border-dashed border-gray-300 rounded-lg">
                  <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.noPolicies}</h3>
                  <p className="text-sm text-gray-600 mb-4">{t.noPoliciesDesc}</p>
                  <button className={`inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Plus className="w-4 h-4" />
                    <span>{t.uploadPolicy}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}