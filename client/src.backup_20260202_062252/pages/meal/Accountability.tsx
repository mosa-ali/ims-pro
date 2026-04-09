/**
 * ============================================================================
 * ACCOUNTABILITY & CRM
 * ============================================================================
 * 
 * Converted from React Native to Web React
 * Complete Accountability & Complaint Response Mechanism system
 * 
 * FEATURES:
 * - Full CRUD operations (Create, Read, Update, Delete)
 * - Search functionality
 * - Status filtering (All, Open, In Progress, Closed)
 * - Stats cards (Total, Open, Closed)
 * - Record cards with color-coded badges
 * - Add record modal with complete form
 * - Edit record modal
 * - View record modal (read-only)
 * - Excel export
 * - Excel import
 * - Project selection dropdown
 * - Type selection (Complaint/Feedback/Suggestion)
 * - Severity selection (Low/Medium/High)
 * - Anonymous submission toggle
 * - Sensitive case marking
 * - Complainant information (conditional)
 * - Form validation
 * - Bilingual support (EN/AR) with RTL
 * 
 * ============================================================================
 */

import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect } from 'react';
import { X, Search, Download, Upload, Plus, Eye, Edit, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { projectsDatabase } from '@/services/projectsDatabase';

interface AccountabilityRecord {
  id: string;
  recordCode: string;
  projectId: number;
  type: 'Complaint' | 'Feedback' | 'Suggestion';
  category: string;
  severity: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'In Progress' | 'Closed';
  subject: string;
  description: string;
  submittedVia: string;
  anonymous: boolean;
  complainantName?: string;
  complainantGender?: string;
  complainantAgeGroup?: string;
  complainantContact?: string;
  complainantLocation?: string;
  sensitiveCase: boolean;
  receivedAt: Date;
  resolvedAt?: Date;
  createdBy: string;
}

interface Project {
  id: number;
  projectId: string;
  projectsTitle: string;
  projectStatus: string;
}

export function Accountability() {
  const [, navigate] = useLocation();
  const { language, isRTL } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AccountabilityRecord | null>(null);
  
  // ✅ Load real projects from projectsDatabase
  const [activeProjects, setActiveProjects] = useState<Project[]>([]);

  // ✅ Load projects on mount
  useEffect(() => {
    try {
      const projects = projectsDatabase.getAllProjects();
      // Transform to match our interface
      const transformedProjects = projects.map((p, index) => ({
        id: index + 1, // Use simple sequential ID (1, 2, 3, ...)
        projectId: p.code, // Use code as projectId (e.g., "UEFA-FOUND-001")
        projectsTitle: p.title,
        projectStatus: p.status,
      }));
      setActiveProjects(transformedProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  }, []);
  
  const [formData, setFormData] = useState({
    projectId: 0,
    type: 'Complaint' as 'Complaint' | 'Feedback' | 'Suggestion',
    category: '',
    severity: 'Medium' as 'Low' | 'Medium' | 'High',
    subject: '',
    description: '',
    submittedVia: '',
    anonymous: false,
    complainantName: '',
    complainantGender: '',
    complainantAgeGroup: '',
    complainantContact: '',
    complainantLocation: '',
    sensitiveCase: false,
  });

  const t = {
    title: language === 'en' ? 'Accountability & CRM' : 'المساءلة وإدارة علاقات العملاء',
    back: language === 'en' ? 'Back' : 'رجوع',
    exportExcel: language === 'en' ? '📊 Export to Excel' : '📊 تصدير إلى Excel',
    importExcel: language === 'en' ? '📥 Import from Excel' : '📥 استيراد من Excel',
    addNewRecord: language === 'en' ? '➕ Add New Record' : '➕ إضافة سجل جديد',
    searchPlaceholder: language === 'en' ? 'Search complaints or feedback...' : 'البحث عن الشكاوى أو الملاحظات...',
    all: language === 'en' ? 'All' : 'الكل',
    open: language === 'en' ? 'Open' : 'مفتوح',
    inProgress: language === 'en' ? 'In Progress' : 'قيد المعالجة',
    closed: language === 'en' ? 'Closed' : 'مغلق',
    totalCases: language === 'en' ? 'Total Cases' : 'إجمالي الحالات',
    openCases: language === 'en' ? 'Open' : 'مفتوح',
    closedCases: language === 'en' ? 'Closed' : 'مغلق',
    complaint: language === 'en' ? 'Complaint' : 'شكوى',
    feedback: language === 'en' ? 'Feedback' : 'ملاحظات',
    suggestion: language === 'en' ? 'Suggestion' : 'اقتراح',
    low: language === 'en' ? 'Low' : 'منخفض',
    medium: language === 'en' ? 'Medium' : 'متوسط',
    high: language === 'en' ? 'High' : 'مرتفع',
    date: language === 'en' ? 'Date:' : 'التاريخ:',
    view: language === 'en' ? 'View' : 'عرض',
    edit: language === 'en' ? 'Edit' : 'تعديل',
    delete: language === 'en' ? 'Delete' : 'حذف',
    noCases: language === 'en' ? 'No cases found' : 'لم يتم العثور على حالات',
    adjustSearch: language === 'en' ? 'Try adjusting your search or filter' : 'حاول تعديل البحث أو الفلتر',
    addRecord: language === 'en' ? 'Add New Record' : 'إضافة سجل جديد',
    editRecord: language === 'en' ? 'Edit Record' : 'تعديل السجل',
    recordDetails: language === 'en' ? 'Record Details' : 'تفاصيل السجل',
    projectId: language === 'en' ? 'Project ID *' : 'معرف المشروع *',
    selectProject: language === 'en' ? 'Select a project ID...' : 'اختر معرف مشروع...',
    projectName: language === 'en' ? 'Project:' : 'المشروع:',
    type: language === 'en' ? 'Type *' : 'النوع *',
    severity: language === 'en' ? 'Severity *' : 'لخطورة *',
    subject: language === 'en' ? 'Subject *' : 'الموضوع *',
    enterSubject: language === 'en' ? 'Enter subject' : 'أدخل الموضوع',
    description: language === 'en' ? 'Description *' : 'الوصف *',
    enterDescription: language === 'en' ? 'Enter detailed description' : 'أدخل وصفاً مفصلاً',
    category: language === 'en' ? 'Category' : 'الفئة',
    categoryPlaceholder: language === 'en' ? 'e.g., Service, Staff Conduct, Safeguarding' : 'مثل: الخدمة، سلوك الموظفين، الحماية',
    submittedVia: language === 'en' ? 'Submitted Via' : 'تم التقديم عبر',
    submittedViaPlaceholder: language === 'en' ? 'e.g., Hotline, In-person, Online' : 'مثل: الخط الساخن، شخصياً، عبر الإنترنت',
    anonymous: language === 'en' ? 'Anonymous Submission' : 'تقديم مجهول',
    complainantInfo: language === 'en' ? 'Complainant Information (Optional)' : 'معلومات المشتكي (اختياري)',
    name: language === 'en' ? 'Name' : 'الاسم',
    enterName: language === 'en' ? 'Enter name' : 'أدخل الاسم',
    contact: language === 'en' ? 'Contact' : 'جهة الاتصال',
    phoneOrEmail: language === 'en' ? 'Phone or email' : 'هاتف أو بريد إلكتروني',
    sensitiveCase: language === 'en' ? 'Mark as Sensitive Case' : 'وضع علامة كحالة حساسة',
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    saveRecord: language === 'en' ? 'Save Record' : 'حفظ السجل',
    saving: language === 'en' ? 'Saving...' : 'جاري الحفظ...',
    updateRecord: language === 'en' ? 'Update Record' : 'تحديث السجل',
    updating: language === 'en' ? 'Updating...' : 'جاري التحديث...',
    close: language === 'en' ? 'Close' : 'إغلاق',
    recordCode: language === 'en' ? 'Record Code' : 'رمز السجل',
    status: language === 'en' ? 'Status' : 'الحالة',
    receivedDate: language === 'en' ? 'Received Date' : 'تاريخ الاستلام',
    yes: language === 'en' ? 'Yes' : 'نعم',
    no: language === 'en' ? 'No' : 'لا',
    validationError: language === 'en' ? 'Validation Error' : 'خطأ في التحقق',
    selectProjectMsg: language === 'en' ? 'Please select a project' : 'يرجى اختيار مشروع',
    enterSubjectMsg: language === 'en' ? 'Please enter a subject' : 'يرجى إدخال موضوع',
    enterDescriptionMsg: language === 'en' ? 'Please enter a description' : 'يرجى إدخال وصف',
    confirmDelete: language === 'en' ? 'Confirm Delete' : 'تأكيد الحذف',
    deleteMessage: language === 'en' ? 'Are you sure you want to delete this' : 'هل أنت متأكد من حذف هذا',
  };

  // Mock records data
  const MOCK_RECORDS: AccountabilityRecord[] = [
    {
      id: '1',
      recordCode: 'ACC-2024-001',
      projectId: 1,
      type: 'Complaint',
      category: 'Service Quality',
      severity: 'High',
      status: 'Open',
      subject: language === 'en' ? 'Water quality issue in Al-Hudaydah' : 'مشكلة جودة المياه في الحديدة',
      description: language === 'en' ? 'Beneficiaries reporting contaminated water supply' : 'المستفيدون يبلغون عن إمدادات مياه ملوثة',
      submittedVia: 'Hotline',
      anonymous: false,
      complainantName: language === 'en' ? 'Ahmed Hassan' : 'أحمد حسن',
      complainantContact: '+967 123 456 789',
      sensitiveCase: true,
      receivedAt: new Date('2024-01-15'),
      createdBy: 'System',
    },
    {
      id: '2',
      recordCode: 'ACC-2024-002',
      projectId: 2,
      type: 'Feedback',
      category: 'Staff Conduct',
      severity: 'Medium',
      status: 'In Progress',
      subject: language === 'en' ? 'Excellent teacher performance' : 'أداء ممتاز للمعلم',
      description: language === 'en' ? 'Parents appreciate the dedication of teachers' : 'يقدر الآباء تفاني المعلمين',
      submittedVia: 'In-person',
      anonymous: false,
      complainantName: language === 'en' ? 'Fatima Ali' : 'فاطمة علي',
      sensitiveCase: false,
      receivedAt: new Date('2024-02-01'),
      createdBy: 'System',
    },
  ];

  const [records, setRecords] = useState<AccountabilityRecord[]>(MOCK_RECORDS);

  const selectedProject = activeProjects.find((p) => p.id === formData.projectId);

  const filteredRecords = records.filter((r) => {
    const matchesFilter = filter === 'all' || r.status.toLowerCase().replace(' ', '') === filter.toLowerCase();
    const matchesSearch =
      r.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.recordCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: records.length,
    open: records.filter((r) => r.status === 'Open').length,
    closed: records.filter((r) => r.status === 'Closed').length,
  };

  const resetForm = () => {
    setFormData({
      projectId: 0,
      type: 'Complaint',
      category: '',
      severity: 'Medium',
      subject: '',
      description: '',
      submittedVia: '',
      anonymous: false,
      complainantName: '',
      complainantGender: '',
      complainantAgeGroup: '',
      complainantContact: '',
      complainantLocation: '',
      sensitiveCase: false,
    });
  };

  const handleSubmit = () => {
    if (!formData.projectId) {
      alert(t.selectProjectMsg);
      return;
    }
    if (!formData.subject.trim()) {
      alert(t.enterSubjectMsg);
      return;
    }
    if (!formData.description.trim()) {
      alert(t.enterDescriptionMsg);
      return;
    }

    const newRecord: AccountabilityRecord = {
      id: Date.now().toString(),
      recordCode: `ACC-2024-${String(records.length + 1).padStart(3, '0')}`,
      ...formData,
      status: 'Open',
      receivedAt: new Date(),
      createdBy: 'Current User',
    };

    setRecords([...records, newRecord]);
    setShowAddModal(false);
    resetForm();
    alert(language === 'en' ? 'Record created successfully' : 'تم إن��اء السجل بنجاح');
  };

  const handleUpdate = () => {
    if (!selectedRecord) return;
    if (!formData.subject.trim()) {
      alert(t.enterSubjectMsg);
      return;
    }
    if (!formData.description.trim()) {
      alert(t.enterDescriptionMsg);
      return;
    }

    // ✅ Update records with BOTH formData AND selectedRecord changes (status)
    setRecords(
      records.map((r) =>
        r.id === selectedRecord.id
          ? { ...r, ...formData, status: selectedRecord.status, updatedBy: 'Current User' }
          : r
      )
    );
    setShowEditModal(false);
    setSelectedRecord(null);
    resetForm();
    alert(language === 'en' ? 'Record updated successfully' : 'تم تحديث السجل بنجاح');
  };

  const handleDelete = (record: AccountabilityRecord) => {
    if (confirm(`${t.deleteMessage} ${record.type.toLowerCase()}?`)) {
      setRecords(records.filter((r) => r.id !== record.id));
      alert(language === 'en' ? 'Record deleted successfully' : 'تم حذف السجل بنجاح');
    }
  };

  const handleView = (record: AccountabilityRecord) => {
    setSelectedRecord(record);
    setShowViewModal(true);
  };

  const handleEdit = (record: AccountabilityRecord) => {
    setSelectedRecord(record);
    setFormData({
      projectId: record.projectId,
      type: record.type,
      category: record.category,
      severity: record.severity,
      subject: record.subject,
      description: record.description,
      submittedVia: record.submittedVia,
      anonymous: record.anonymous,
      complainantName: record.complainantName || '',
      complainantGender: record.complainantGender || '',
      complainantAgeGroup: record.complainantAgeGroup || '',
      complainantContact: record.complainantContact || '',
      complainantLocation: record.complainantLocation || '',
      sensitiveCase: record.sensitiveCase,
    });
    setShowEditModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return '#FF9800';
      case 'in progress':
        return '#2196F3';
      case 'closed':
        return '#4CAF50';
      default:
        return '#6B7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#FF9800';
      case 'low':
        return '#4CAF50';
      default:
        return '#6B7280';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Complaint':
        return '#EF4444';
      case 'Feedback':
        return '#4CAF50';
      case 'Suggestion':
        return '#2196F3';
      default:
        return '#6B7280';
    }
  };

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(records);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Records');
    XLSX.writeFile(workbook, 'AccountabilityRecords.xlsx');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx, .xls';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const importedRecords = XLSX.utils.sheet_to_json<AccountabilityRecord>(worksheet);
          setRecords(importedRecords);
          alert(language === 'en' ? 'Records imported successfully' : 'تم استيراد السجلات بنجاح');
        };
        reader.readAsArrayBuffer(file);
      }
    };
    input.click();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className={`flex items-center justify-between pb-6 border-b border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={handleExport}
            className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 transition-colors"
          >
            <span className="text-sm font-semibold text-white flex items-center gap-2">
              <Download className="w-4 h-4" /> {t.exportExcel}
            </span>
          </button>
          <button
            onClick={handleImport}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <span className="text-sm font-semibold text-white flex items-center gap-2">
              <Upload className="w-4 h-4" /> {t.importExcel}
            </span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <span className="text-sm font-semibold text-white flex items-center gap-2">
              <Plus className="w-4 h-4" /> {t.addNewRecord}
            </span>
          </button>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-semibold text-blue-600">{t.back}</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className={`absolute top-3 w-5 h-5 text-gray-400 ${isRTL ? 'right-4' : 'left-4'}`} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          className={`w-full py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'
          }`}
        />
      </div>

      {/* Filters */}
      <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {['all', 'open', 'inprogress', 'closed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <span className="text-sm font-semibold capitalize">
              {status === 'all' ? t.all : status === 'open' ? t.open : status === 'inprogress' ? t.inProgress : t.closed}
            </span>
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className={`grid grid-cols-3 gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className="p-4 rounded-lg bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">{t.totalCases}</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="p-4 rounded-lg bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">{t.openCases}</p>
          <p className="text-2xl font-bold text-orange-600">{stats.open}</p>
        </div>
        <div className="p-4 rounded-lg bg-white border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">{t.closedCases}</p>
          <p className="text-2xl font-bold text-green-600">{stats.closed}</p>
        </div>
      </div>

      {/* Records List */}
      <div className="space-y-4">
        {filteredRecords.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-lg text-gray-600 mb-2">{t.noCases}</p>
            <p className="text-sm text-gray-500">{t.adjustSearch}</p>
          </div>
        ) : (
          filteredRecords.map((record) => (
            <div key={record.id} className="rounded-xl p-6 bg-white border border-gray-200 shadow-sm">
              <div className={`flex items-start justify-between mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                    <span
                      className="px-2 py-1 rounded text-xs font-semibold text-white"
                      style={{ backgroundColor: getTypeColor(record.type) }}
                    >
                      {record.type === 'Complaint' ? t.complaint : record.type === 'Feedback' ? t.feedback : t.suggestion}
                    </span>
                    <span
                      className="px-2 py-1 rounded text-xs font-semibold text-white"
                      style={{ backgroundColor: getPriorityColor(record.severity) }}
                    >
                      {record.severity === 'High' ? t.high : record.severity === 'Medium' ? t.medium : t.low}
                    </span>
                    <span className="text-xs text-gray-600">{record.recordCode}</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900 mb-2">{record.subject}</p>
                  <p className="text-sm text-gray-600 mb-1">{record.description.substring(0, 100)}...</p>
                  <p className="text-sm text-gray-500">{t.date} {new Date(record.receivedAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span
                  className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: getStatusColor(record.status) }}
                >
                  {record.status === 'Open' ? t.open : record.status === 'In Progress' ? t.inProgress : t.closed}
                </span>

                <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <button
                    onClick={() => handleView(record)}
                    className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    <span className="text-sm font-semibold text-white flex items-center gap-1">
                      <Eye className="w-4 h-4" /> {t.view}
                    </span>
                  </button>
                  <button
                    onClick={() => handleEdit(record)}
                    className="px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors"
                  >
                    <span className="text-sm font-semibold text-white flex items-center gap-1">
                      <Edit className="w-4 h-4" /> {t.edit}
                    </span>
                  </button>
                  <button
                    onClick={() => handleDelete(record)}
                    className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors"
                  >
                    <span className="text-sm font-semibold text-white flex items-center gap-1">
                      <Trash2 className="w-4 h-4" /> {t.delete}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit/View Modals - Simplified for token efficiency */}
      {/* Note: Full modal implementations available in complete version */}

      {/* ADD NEW RECORD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className={`sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h2 className="text-xl font-bold text-gray-900">{t.addRecord}</h2>
              <button onClick={() => { setShowAddModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Project Selection */}
              <div>
                <label className={`block text-sm font-semibold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.projectId}
                </label>
                <div className="relative">
                  <button
                    onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                    className={`w-full px-4 py-3 rounded-lg bg-white border border-gray-300 hover:border-blue-500 transition-colors ${
                      isRTL ? 'text-right' : 'text-left'
                    }`}
                  >
                    <span className="text-base text-gray-900">
                      {selectedProject ? `${selectedProject.projectId} - ${selectedProject.projectsTitle}` : t.selectProject}
                    </span>
                  </button>
                  {showProjectDropdown && (
                    <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {activeProjects.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => {
                            setFormData({ ...formData, projectId: project.id });
                            setShowProjectDropdown(false);
                          }}
                          className={`w-full px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0 ${
                            isRTL ? 'text-right' : 'text-left'
                          }`}
                        >
                          <span className="text-sm font-semibold text-gray-900">{project.projectId}</span>
                          <p className="text-sm text-gray-600">{project.projectsTitle}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Type Selection */}
              <div>
                <label className={`block text-sm font-semibold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.type}
                </label>
                <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {['Complaint', 'Feedback', 'Suggestion'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setFormData({ ...formData, type: type as any })}
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                        formData.type === type
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-sm font-semibold">
                        {type === 'Complaint' ? t.complaint : type === 'Feedback' ? t.feedback : t.suggestion}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Severity Selection */}
              <div>
                <label className={`block text-sm font-semibold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.severity}
                </label>
                <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {['Low', 'Medium', 'High'].map((severity) => (
                    <button
                      key={severity}
                      onClick={() => setFormData({ ...formData, severity: severity as any })}
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                        formData.severity === severity
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-sm font-semibold">
                        {severity === 'High' ? t.high : severity === 'Medium' ? t.medium : t.low}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className={`block text-sm font-semibold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.subject}
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder={t.enterSubject}
                  className={`w-full px-4 py-3 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isRTL ? 'text-right' : 'text-left'
                  }`}
                />
              </div>

              {/* Description */}
              <div>
                <label className={`block text-sm font-semibold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.description}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t.enterDescription}
                  rows={4}
                  className={`w-full px-4 py-3 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isRTL ? 'text-right' : 'text-left'
                  }`}
                />
              </div>

              {/* Category */}
              <div>
                <label className={`block text-sm font-semibold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.category}
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder={t.categoryPlaceholder}
                  className={`w-full px-4 py-3 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isRTL ? 'text-right' : 'text-left'
                  }`}
                />
              </div>

              {/* Submitted Via */}
              <div>
                <label className={`block text-sm font-semibold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.submittedVia}
                </label>
                <input
                  type="text"
                  value={formData.submittedVia}
                  onChange={(e) => setFormData({ ...formData, submittedVia: e.target.value })}
                  placeholder={t.submittedViaPlaceholder}
                  className={`w-full px-4 py-3 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isRTL ? 'text-right' : 'text-left'
                  }`}
                />
              </div>

              {/* Anonymous Toggle */}
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <input
                  type="checkbox"
                  id="anonymous"
                  checked={formData.anonymous}
                  onChange={(e) => setFormData({ ...formData, anonymous: e.target.checked })}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="anonymous" className="text-sm font-semibold text-gray-900">
                  {t.anonymous}
                </label>
              </div>

              {/* Complainant Information (if not anonymous) */}
              {!formData.anonymous && (
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <h3 className={`text-base font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.complainantInfo}
                  </h3>

                  <div>
                    <label className={`block text-sm font-semibold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t.name}
                    </label>
                    <input
                      type="text"
                      value={formData.complainantName}
                      onChange={(e) => setFormData({ ...formData, complainantName: e.target.value })}
                      placeholder={t.enterName}
                      className={`w-full px-4 py-3 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        isRTL ? 'text-right' : 'text-left'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-semibold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t.contact}
                    </label>
                    <input
                      type="text"
                      value={formData.complainantContact}
                      onChange={(e) => setFormData({ ...formData, complainantContact: e.target.value })}
                      placeholder={t.phoneOrEmail}
                      className={`w-full px-4 py-3 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        isRTL ? 'text-right' : 'text-left'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Sensitive Case Toggle */}
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <input
                  type="checkbox"
                  id="sensitive"
                  checked={formData.sensitiveCase}
                  onChange={(e) => setFormData({ ...formData, sensitiveCase: e.target.checked })}
                  className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <label htmlFor="sensitive" className="text-sm font-semibold text-gray-900">
                  {t.sensitiveCase}
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="flex-1 px-4 py-3 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-semibold text-gray-900">{t.cancel}</span>
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <span className="text-sm font-semibold text-white">{t.saveRecord}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT RECORD MODAL */}
      {showEditModal && selectedRecord && (
        <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className={`sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h2 className="text-xl font-bold text-gray-900">{t.editRecord}</h2>
              <button onClick={() => { setShowEditModal(false); setSelectedRecord(null); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Record Code (Read-only) */}
              <div>
                <label className={`block text-sm font-semibold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.recordCode}
                </label>
                <input
                  type="text"
                  value={selectedRecord.recordCode}
                  disabled
                  className={`w-full px-4 py-3 rounded-lg bg-gray-100 border border-gray-300 text-gray-600 ${
                    isRTL ? 'text-right' : 'text-left'
                  }`}
                />
              </div>

              {/* Project (Read-only) */}
              <div>
                <label className={`block text-sm font-semibold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.projectName}
                </label>
                <input
                  type="text"
                  value={activeProjects.find(p => p.id === selectedRecord.projectId)?.projectsTitle || ''}
                  disabled
                  className={`w-full px-4 py-3 rounded-lg bg-gray-100 border border-gray-300 text-gray-600 ${
                    isRTL ? 'text-right' : 'text-left'
                  }`}
                />
              </div>

              {/* Status Selection */}
              <div>
                <label className={`block text-sm font-semibold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.status}
                </label>
                <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {['Open', 'In Progress', 'Closed'].map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setSelectedRecord({ ...selectedRecord, status: status as any });
                      }}
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                        selectedRecord.status === status
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-sm font-semibold">
                        {status === 'Open' ? t.open : status === 'In Progress' ? t.inProgress : t.closed}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Type Selection */}
              <div>
                <label className={`block text-sm font-semibold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.type}
                </label>
                <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {['Complaint', 'Feedback', 'Suggestion'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setFormData({ ...formData, type: type as any })}
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                        formData.type === type
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-sm font-semibold">
                        {type === 'Complaint' ? t.complaint : type === 'Feedback' ? t.feedback : t.suggestion}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Severity Selection */}
              <div>
                <label className={`block text-sm font-semibold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.severity}
                </label>
                <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {['Low', 'Medium', 'High'].map((severity) => (
                    <button
                      key={severity}
                      onClick={() => setFormData({ ...formData, severity: severity as any })}
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                        formData.severity === severity
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-sm font-semibold">
                        {severity === 'High' ? t.high : severity === 'Medium' ? t.medium : t.low}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className={`block text-sm font-semibold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.subject}
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder={t.enterSubject}
                  className={`w-full px-4 py-3 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isRTL ? 'text-right' : 'text-left'
                  }`}
                />
              </div>

              {/* Description */}
              <div>
                <label className={`block text-sm font-semibold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.description}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t.enterDescription}
                  rows={4}
                  className={`w-full px-4 py-3 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isRTL ? 'text-right' : 'text-left'
                  }`}
                />
              </div>

              {/* Category */}
              <div>
                <label className={`block text-sm font-semibold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.category}
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder={t.categoryPlaceholder}
                  className={`w-full px-4 py-3 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isRTL ? 'text-right' : 'text-left'
                  }`}
                />
              </div>

              {/* Submitted Via */}
              <div>
                <label className={`block text-sm font-semibold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.submittedVia}
                </label>
                <input
                  type="text"
                  value={formData.submittedVia}
                  onChange={(e) => setFormData({ ...formData, submittedVia: e.target.value })}
                  placeholder={t.submittedViaPlaceholder}
                  className={`w-full px-4 py-3 rounded-lg bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isRTL ? 'text-right' : 'text-left'
                  }`}
                />
              </div>

              {/* Sensitive Case Toggle */}
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <input
                  type="checkbox"
                  id="sensitive-edit"
                  checked={formData.sensitiveCase}
                  onChange={(e) => setFormData({ ...formData, sensitiveCase: e.target.checked })}
                  className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <label htmlFor="sensitive-edit" className="text-sm font-semibold text-gray-900">
                  {t.sensitiveCase}
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => { setShowEditModal(false); setSelectedRecord(null); resetForm(); }}
                className="flex-1 px-4 py-3 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-semibold text-gray-900">{t.cancel}</span>
              </button>
              <button
                onClick={handleUpdate}
                className="flex-1 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <span className="text-sm font-semibold text-white">{t.updateRecord}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW RECORD MODAL (Read-only) */}
      {showViewModal && selectedRecord && (
        <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className={`sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h2 className="text-xl font-bold text-gray-900">{t.recordDetails}</h2>
              <button onClick={() => { setShowViewModal(false); setSelectedRecord(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Record Code */}
              <div>
                <label className={`block text-sm font-semibold text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.recordCode}
                </label>
                <p className={`text-base text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{selectedRecord.recordCode}</p>
              </div>

              {/* Project */}
              <div>
                <label className={`block text-sm font-semibold text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.projectName}
                </label>
                <p className={`text-base text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {activeProjects.find(p => p.id === selectedRecord.projectId)?.projectsTitle || ''}
                </p>
              </div>

              {/* Type & Severity */}
              <div className={`grid grid-cols-2 gap-4`}>
                <div>
                  <label className={`block text-sm font-semibold text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.type}
                  </label>
                  <span
                    className="inline-block px-3 py-1 rounded text-sm font-semibold text-white"
                    style={{ backgroundColor: getTypeColor(selectedRecord.type) }}
                  >
                    {selectedRecord.type === 'Complaint' ? t.complaint : selectedRecord.type === 'Feedback' ? t.feedback : t.suggestion}
                  </span>
                </div>
                <div>
                  <label className={`block text-sm font-semibold text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.severity}
                  </label>
                  <span
                    className="inline-block px-3 py-1 rounded text-sm font-semibold text-white"
                    style={{ backgroundColor: getPriorityColor(selectedRecord.severity) }}
                  >
                    {selectedRecord.severity === 'High' ? t.high : selectedRecord.severity === 'Medium' ? t.medium : t.low}
                  </span>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className={`block text-sm font-semibold text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.status}
                </label>
                <span
                  className="inline-block px-3 py-1 rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: getStatusColor(selectedRecord.status) }}
                >
                  {selectedRecord.status === 'Open' ? t.open : selectedRecord.status === 'In Progress' ? t.inProgress : t.closed}
                </span>
              </div>

              {/* Subject */}
              <div>
                <label className={`block text-sm font-semibold text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.subject}
                </label>
                <p className={`text-base text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{selectedRecord.subject}</p>
              </div>

              {/* Description */}
              <div>
                <label className={`block text-sm font-semibold text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.description}
                </label>
                <p className={`text-base text-gray-900 whitespace-pre-wrap ${isRTL ? 'text-right' : 'text-left'}`}>{selectedRecord.description}</p>
              </div>

              {/* Category */}
              {selectedRecord.category && (
                <div>
                  <label className={`block text-sm font-semibold text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.category}
                  </label>
                  <p className={`text-base text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{selectedRecord.category}</p>
                </div>
              )}

              {/* Submitted Via */}
              {selectedRecord.submittedVia && (
                <div>
                  <label className={`block text-sm font-semibold text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.submittedVia}
                  </label>
                  <p className={`text-base text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{selectedRecord.submittedVia}</p>
                </div>
              )}

              {/* Received Date */}
              <div>
                <label className={`block text-sm font-semibold text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.receivedDate}
                </label>
                <p className={`text-base text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {new Date(selectedRecord.receivedAt).toLocaleDateString()}
                </p>
              </div>

              {/* Anonymous */}
              <div>
                <label className={`block text-sm font-semibold text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.anonymous}
                </label>
                <p className={`text-base text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {selectedRecord.anonymous ? t.yes : t.no}
                </p>
              </div>

              {/* Complainant Information (if not anonymous) */}
              {!selectedRecord.anonymous && selectedRecord.complainantName && (
                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <h3 className={`text-base font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.complainantInfo}
                  </h3>
                  
                  <div>
                    <label className={`block text-sm font-semibold text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t.name}
                    </label>
                    <p className={`text-base text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{selectedRecord.complainantName}</p>
                  </div>

                  {selectedRecord.complainantContact && (
                    <div>
                      <label className={`block text-sm font-semibold text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {t.contact}
                      </label>
                      <p className={`text-base text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{selectedRecord.complainantContact}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Sensitive Case */}
              <div>
                <label className={`block text-sm font-semibold text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.sensitiveCase}
                </label>
                <p className={`text-base ${selectedRecord.sensitiveCase ? 'text-red-600 font-bold' : 'text-gray-900'} ${isRTL ? 'text-right' : 'text-left'}`}>
                  {selectedRecord.sensitiveCase ? t.yes : t.no}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200 ${isRTL ? 'text-right' : 'text-left'}`}>
              <button
                onClick={() => { setShowViewModal(false); setSelectedRecord(null); }}
                className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <span className="text-sm font-semibold text-white">{t.close}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}