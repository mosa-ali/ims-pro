/**
 * ============================================================================
 * TRAINING MANAGEMENT - CENTRALIZED TRAINING OVERSIGHT
 * ============================================================================
 * 
 * PURPOSE:
 * - Centralized view of ALL training records across ALL employees
 * - Reporting & oversight card (NOT a data entry point)
 * - Links back to individual employee profiles
 * - Filters for training analysis and donor reporting
 * 
 * DATA SOURCE:
 * - Reads from 'hr_training_records' localStorage
 * - Training records created ONLY in Employee Profile → Training & Development
 * - This is a READ-ONLY aggregated view
 * 
 * FEATURES:
 * - All training records in one table
 * - Multi-criteria filters (Status, Type, Provider, Date Range, Department, Project)
 * - Export to Excel
 * - Links to employee profiles
 * - Statistics dashboard
 * 
 * PERMISSIONS:
 * - HR Manager: Full view
 * - Admin: Full view
 * - Programs: View only
 * - Finance: View only
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { 
  GraduationCap, 
  Filter, 
  Download, 
  Eye, 
  Calendar,
  Users,
  Award,
  TrendingUp,
  Search,
  FileText,
  CheckCircle,
  Clock,
  X
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { BackToModulesButton } from './BackToModulesButton';
import * as XLSX from 'xlsx';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface TrainingRecord {
  id: string;
  staffId: string;
  employeeName: string;
  position: string;
  department: string;
  trainingTitle: string;
  provider: string;
  trainingType: 'Technical' | 'Soft Skills' | 'Management' | 'Compliance' | 'Safety' | 'Other';
  startDate: string;
  endDate: string;
  duration?: string;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  completionDate?: string;
  certificateIssued: boolean;
  certificateUrl?: string;
  certificateNumber?: string;
  cost?: number;
  currency?: string;
  fundedBy?: string;
  createdBy: string;
  createdDate: string;
  notes?: string;
}

interface TrainingFilters {
  status: string;
  trainingType: string;
  provider: string;
  department: string;
  fundedBy: string;
  dateFrom: string;
  dateTo: string;
  searchTerm: string;
}

// ============================================================================
// TRAINING SERVICE
// ============================================================================

const trainingService = {
  getAll(): TrainingRecord[] {
    try {
      const data = localStorage.getItem('hr_training_records');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }
};

// ============================================================================
// COMPONENT
// ============================================================================

export function TrainingManagement() {
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();

  const [trainings, setTrainings] = useState<TrainingRecord[]>([]);
  const [filteredTrainings, setFilteredTrainings] = useState<TrainingRecord[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState<TrainingFilters>({
    status: '',
    trainingType: '',
    provider: '',
    department: '',
    fundedBy: '',
    dateFrom: '',
    dateTo: '',
    searchTerm: ''
  });

  // Load all training records
  useEffect(() => {
    loadTrainings();
  }, []);

  // Apply filters
  useEffect(() => {
    applyFilters();
  }, [trainings, filters]);

  const loadTrainings = () => {
    const records = trainingService.getAll();
    // Sort by start date descending
    records.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    setTrainings(records);
  };

  const applyFilters = () => {
    let filtered = [...trainings];

    // Search term
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.employeeName.toLowerCase().includes(term) ||
        t.trainingTitle.toLowerCase().includes(term) ||
        t.staffId.toLowerCase().includes(term) ||
        t.provider.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(t => t.status === filters.status);
    }

    // Training type filter
    if (filters.trainingType) {
      filtered = filtered.filter(t => t.trainingType === filters.trainingType);
    }

    // Provider filter
    if (filters.provider) {
      filtered = filtered.filter(t => 
        t.provider.toLowerCase().includes(filters.provider.toLowerCase())
      );
    }

    // Department filter
    if (filters.department) {
      filtered = filtered.filter(t => 
        t.department.toLowerCase().includes(filters.department.toLowerCase())
      );
    }

    // Funded by filter
    if (filters.fundedBy) {
      filtered = filtered.filter(t => 
        t.fundedBy?.toLowerCase().includes(filters.fundedBy.toLowerCase())
      );
    }

    // Date range filter
    if (filters.dateFrom) {
      filtered = filtered.filter(t => 
        new Date(t.startDate) >= new Date(filters.dateFrom)
      );
    }
    if (filters.dateTo) {
      filtered = filtered.filter(t => 
        new Date(t.startDate) <= new Date(filters.dateTo)
      );
    }

    setFilteredTrainings(filtered);
  };

  const resetFilters = () => {
    setFilters({
      status: '',
      trainingType: '',
      provider: '',
      department: '',
      fundedBy: '',
      dateFrom: '',
      dateTo: '',
      searchTerm: ''
    });
  };

  const exportToExcel = () => {
    const data = filteredTrainings.map(t => ({
      'Staff ID': t.staffId,
      'Full Name': t.employeeName,
      'Position': t.position,
      'Department': t.department,
      'Training Title': t.trainingTitle,
      'Provider': t.provider,
      'Training Type': t.trainingType,
      'Start Date': formatDate(t.startDate),
      'End Date': formatDate(t.endDate),
      'Duration': t.duration || '-',
      'Status': t.status,
      'Certificate Issued': t.certificateIssued ? 'Yes' : 'No',
      'Certificate Number': t.certificateNumber || '-',
      'Cost': t.cost ? `${t.cost} ${t.currency || ''}` : '-',
      'Funded By': t.fundedBy || '-',
      'Notes': t.notes || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Training Records');
    XLSX.writeFile(wb, `Training_Records_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleViewEmployee = (staffId: string) => {
    navigate(`/hr/employees-profiles/directory?staffId=${staffId}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar' : 'en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      'Scheduled': 'bg-blue-100 text-blue-700 border-blue-200',
      'In Progress': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'Completed': 'bg-green-100 text-green-700 border-green-200',
      'Cancelled': 'bg-red-100 text-red-700 border-red-200'
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  // Calculate statistics
  const stats = {
    total: filteredTrainings.length,
    completed: filteredTrainings.filter(t => t.status === 'Completed').length,
    inProgress: filteredTrainings.filter(t => t.status === 'In Progress').length,
    scheduled: filteredTrainings.filter(t => t.status === 'Scheduled').length,
    withCertificate: filteredTrainings.filter(t => t.certificateIssued).length,
    totalCost: filteredTrainings.reduce((sum, t) => sum + (t.cost || 0), 0)
  };

  const t = {
    title: language === 'en' ? 'Training Management' : 'إدارة التدريب',
    subtitle: language === 'en' 
      ? 'Centralized overview of all training records across the organization'
      : 'نظرة عامة مركزية لجميع سجلات التدريب عبر المنظمة',
    
    // Statistics
    totalTrainings: language === 'en' ? 'Total Trainings' : 'إجمالي التدريبات',
    completed: language === 'en' ? 'Completed' : 'مكتمل',
    inProgress: language === 'en' ? 'In Progress' : 'قيد التنفيذ',
    scheduled: language === 'en' ? 'Scheduled' : 'مجدول',
    withCertificate: language === 'en' ? 'With Certificate' : 'بشهادة',
    totalCost: language === 'en' ? 'Total Cost' : 'التكلفة الإجمالية',
    
    // Actions
    filters: language === 'en' ? 'Filters' : 'الفلاتر',
    export: language === 'en' ? 'Export to Excel' : 'تصدير إلى Excel',
    search: language === 'en' ? 'Search by name, training, or Staff ID...' : 'البحث بالاسم أو التدريب أو رقم الموظف...',
    applyFilters: language === 'en' ? 'Apply Filters' : 'تطبيق الفلاتر',
    resetFilters: language === 'en' ? 'Reset' : 'إعادة تعيين',
    showFilters: language === 'en' ? 'Show Filters' : 'إظهار الفلاتر',
    hideFilters: language === 'en' ? 'Hide Filters' : 'إخفاء الفلاتر',
    
    // Table headers
    staffId: language === 'en' ? 'Staff ID' : 'رقم الموظف',
    fullName: language === 'en' ? 'Full Name' : 'الاسم الكامل',
    position: language === 'en' ? 'Position' : 'الوظيفة',
    department: language === 'en' ? 'Department' : 'القسم',
    trainingTitle: language === 'en' ? 'Training Title' : 'عنوان التدريب',
    provider: language === 'en' ? 'Provider' : 'مقدم الخدمة',
    trainingType: language === 'en' ? 'Training Type' : 'نوع التدريب',
    startDate: language === 'en' ? 'Start Date' : 'تاريخ البدء',
    endDate: language === 'en' ? 'End Date' : 'تاريخ الانتهاء',
    status: language === 'en' ? 'Status' : 'الحالة',
    certificate: language === 'en' ? 'Certificate' : 'الشهادة',
    actions: language === 'en' ? 'Actions' : 'الإجراءات',
    
    // Filter labels
    filterByStatus: language === 'en' ? 'Status' : 'الحالة',
    filterByType: language === 'en' ? 'Training Type' : 'نوع التدريب',
    filterByProvider: language === 'en' ? 'Provider' : 'مقدم الخدمة',
    filterByDepartment: language === 'en' ? 'Department' : 'القسم',
    filterByProject: language === 'en' ? 'Funded By (Project)' : 'ممول من (مشروع)',
    dateFrom: language === 'en' ? 'Date From' : '��ن تاريخ',
    dateTo: language === 'en' ? 'Date To' : 'إلى تاريخ',
    
    // Options
    allStatuses: language === 'en' ? 'All Statuses' : 'جميع الحالات',
    allTypes: language === 'en' ? 'All Types' : 'جميع الأنواع',
    
    // Actions
    viewProfile: language === 'en' ? 'View Profile' : 'عرض الملف',
    viewCertificate: language === 'en' ? 'View Certificate' : 'عرض الشهادة',
    noCertificate: language === 'en' ? 'No certificate' : 'لا توجد شهادة',
    
    // Empty states
    noRecords: language === 'en' ? 'No training records found' : 'لم يتم العثور على سجلات تدريب',
    noRecordsDesc: language === 'en' 
      ? 'Training records are created from individual employee profiles.'
      : 'يتم إنشاء سجلات التدريب من ملفات الموظفين الفردية.',
    
    // Note
    noteTitle: language === 'en' ? 'Important Note' : 'ملاحظة هامة',
    noteText: language === 'en'
      ? 'Training records are created and managed from Employee Profile → Training & Development. This view is for reporting and oversight only.'
      : 'يتم إنشاء وإدارة سجلات التدريب من ملف الموظف ← التدريب والتطوير. هذا العرض للتقارير والإشراف فقط.',
    
    // Types
    technical: language === 'en' ? 'Technical' : 'تقني',
    softSkills: language === 'en' ? 'Soft Skills' : 'مهارات ناعمة',
    management: language === 'en' ? 'Management' : 'إدارة',
    compliance: language === 'en' ? 'Compliance' : 'امتثال',
    safety: language === 'en' ? 'Safety' : 'سلامة',
    other: language === 'en' ? 'Other' : 'أخرى',
    
    cancelled: language === 'en' ? 'Cancelled' : 'ملغي'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <BackToModulesButton 
            targetPath="/organization/hr/employees-profiles"
            parentModuleName={language === 'en' ? 'Employees Profiles' : 'ملفات الموظفين'}
          />
          
          <div className={`flex items-center justify-between mt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-purple-600" />
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
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <GraduationCap className="w-8 h-8 text-blue-600" />
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-xs text-gray-600">{t.totalTrainings}</p>
                <p className="text-xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-xs text-gray-600">{t.completed}</p>
                <p className="text-xl font-bold text-green-600">{stats.completed}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Clock className="w-8 h-8 text-yellow-600" />
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-xs text-gray-600">{t.inProgress}</p>
                <p className="text-xl font-bold text-yellow-600">{stats.inProgress}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Calendar className="w-8 h-8 text-blue-600" />
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-xs text-gray-600">{t.scheduled}</p>
                <p className="text-xl font-bold text-blue-600">{stats.scheduled}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Award className="w-8 h-8 text-purple-600" />
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-xs text-gray-600">{t.withCertificate}</p>
                <p className="text-xl font-bold text-purple-600">{stats.withCertificate}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <TrendingUp className="w-8 h-8 text-green-600" />
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-xs text-gray-600">{t.totalCost}</p>
                <p className="text-lg font-bold text-green-600">
                  ${stats.totalCost.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Important Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <h3 className="text-sm font-semibold text-blue-900">{t.noteTitle}</h3>
              <p className="text-sm text-blue-700 mt-1">{t.noteText}</p>
            </div>
          </div>
        </div>

        {/* Search and Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className={`flex flex-col md:flex-row gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} w-5 h-5 text-gray-400`} />
                <input
                  type="text"
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                  placeholder={t.search}
                  className={`w-full ${isRTL ? 'pr-10 text-right' : 'pl-10'} py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <Filter className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  {showFilters ? t.hideFilters : t.showFilters}
                </span>
              </button>

              <button
                onClick={exportToExcel}
                className={`flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <Download className="w-5 h-5" />
                <span className="text-sm font-medium">{t.export}</span>
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Status Filter */}
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                    {t.filterByStatus}
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">{t.allStatuses}</option>
                    <option value="Scheduled">{t.scheduled}</option>
                    <option value="In Progress">{t.inProgress}</option>
                    <option value="Completed">{t.completed}</option>
                    <option value="Cancelled">{t.cancelled}</option>
                  </select>
                </div>

                {/* Training Type Filter */}
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                    {t.filterByType}
                  </label>
                  <select
                    value={filters.trainingType}
                    onChange={(e) => setFilters({ ...filters, trainingType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">{t.allTypes}</option>
                    <option value="Technical">{t.technical}</option>
                    <option value="Soft Skills">{t.softSkills}</option>
                    <option value="Management">{t.management}</option>
                    <option value="Compliance">{t.compliance}</option>
                    <option value="Safety">{t.safety}</option>
                    <option value="Other">{t.other}</option>
                  </select>
                </div>

                {/* Provider Filter */}
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                    {t.filterByProvider}
                  </label>
                  <input
                    type="text"
                    value={filters.provider}
                    onChange={(e) => setFilters({ ...filters, provider: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder={t.filterByProvider}
                  />
                </div>

                {/* Department Filter */}
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                    {t.filterByDepartment}
                  </label>
                  <input
                    type="text"
                    value={filters.department}
                    onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder={t.filterByDepartment}
                  />
                </div>

                {/* Project/Funded By Filter */}
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                    {t.filterByProject}
                  </label>
                  <input
                    type="text"
                    value={filters.fundedBy}
                    onChange={(e) => setFilters({ ...filters, fundedBy: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder={t.filterByProject}
                  />
                </div>

                {/* Date From */}
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                    {t.dateFrom}
                  </label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Date To */}
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                    {t.dateTo}
                  </label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Reset Button */}
                <div className="flex items-end">
                  <button
                    onClick={resetFilters}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <X className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">{t.resetFilters}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Training Records Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {filteredTrainings.length === 0 ? (
            <div className="p-12 text-center">
              <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.noRecords}</h3>
              <p className="text-sm text-gray-600">{t.noRecordsDesc}</p>
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
                    <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-left">{t.trainingTitle}</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-left">{t.provider}</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-left">{t.trainingType}</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-left">{t.startDate}</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-left">{t.endDate}</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-left">{t.status}</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-left">{t.certificate}</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-left">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTrainings.map((training) => (
                    <tr key={training.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 font-mono">{training.staffId}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{training.employeeName}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{training.position}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{training.department}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{training.trainingTitle}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{training.provider}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{training.trainingType}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatDate(training.startDate)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatDate(training.endDate)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(training.status)}`}>
                          {training.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {training.certificateIssued ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <Award className="w-4 h-4" />
                            <span className="text-xs">{training.certificateNumber || t.withCertificate}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">{t.noCertificate}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleViewEmployee(training.staffId)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Eye className="w-4 h-4" />
                          <span>{t.viewProfile}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}