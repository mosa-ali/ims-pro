import React, { useState, useEffect } from 'react';
import { X, FileText, Calendar, FolderOpen, Building2, DollarSign, Clock, User, AlertCircle, Upload, Download, Trash2, Eye } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { DocumentService, DocumentRecord } from '@/services/DocumentService';

interface Grant {
  id: string;
  grantNumber: string;
  grantName: string;
  donorName: string;
  donorReference: string;
  currency: string;
  grantAmount: number;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Completed' | 'Pending' | 'On Hold';
  reportingStatus: 'On track' | 'Due' | 'Overdue';
  projectId: string;
  projectName: string;
  sector: string;
  responsible: string;
  description: string;
  reportingFrequency: string;
  coFunding: boolean;
  coFunderName: string;
  createdAt: string;
  updatedAt: string;
  milestones?: Milestone[];
  documents?: Document[];
}

interface Milestone {
  id: string;
  name: string;
  type: 'Contract' | 'Report' | 'Amendment' | 'Payment' | 'Audit';
  description: string;
  dueDate: string;
  submittedDate: string | null;
  status: 'Pending' | 'Submitted' | 'Approved' | 'Overdue';
  responsibleUnit: string;
  remarks: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  category: 'Contractual' | 'Financial' | 'Programmatic' | 'Supporting';
  version: string;
  uploadedBy: string;
  uploadDate: string;
  status: 'Draft' | 'Final' | 'Approved';
  fileType?: string; // e.g., 'pdf', 'docx', 'xlsx'
  fileData?: string; // Base64 or blob URL for the file
}

interface GrantDetailsModalProps {
  grant: Grant;
  onClose: () => void;
  onDocumentAdded?: () => void; // Callback to refresh grant data after document upload
}

export function GrantDetailsModal({ grant, onClose, onDocumentAdded }: GrantDetailsModalProps) {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'documents'>('overview');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Load documents from DocumentService on mount and when grant changes
  useEffect(() => {
    loadDocuments();
  }, [grant.id]);

  const loadDocuments = () => {
    const grantDocuments = DocumentService.getDocuments({ grant_id: grant.id });
    setDocuments(grantDocuments);
  };

  const tabs = [
    { id: 'overview' as const, label: isRTL ? 'نظرة عامة' : 'Overview', icon: FileText },
    { id: 'timeline' as const, label: isRTL ? 'الجدول الزمني' : 'Timeline', icon: Calendar },
    { id: 'documents' as const, label: isRTL ? 'المستندات' : 'Documents', icon: FolderOpen }
  ];

  const getStatusColor = (status: Grant['status']) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800 border-green-200';
      case 'Completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'On Hold': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getMilestoneStatusColor = (status: Milestone['status']) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'Submitted': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Overdue': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDocumentStatusColor = (status: Document['status']) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'Final': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Draft': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Project key documents list
  const keyDocumentTypes = [
    'Project Agreement',
    'Approved Proposal',
    'Approved Budget sheet',
    'Baseline Report',
    'Mid-term Narrative Report',
    'Mid-term Financial Report',
    'Final Narrative Report',
    'Final Financial Report',
    'Final Assessment Report'
  ];

  // Helper function to translate document types to Arabic
  const translateDocType = (type: string) => {
    if (!isRTL) return type;
    const translations: Record<string, string> = {
      'Project Agreement': 'اتفاقية المشروع',
      'Approved Proposal': 'المقترح المعتمد',
      'Approved Budget sheet': 'جدول الميزانية المعتمد',
      'Baseline Report': 'تقرير خط الأساس',
      'Mid-term Narrative Report': 'التقرير السردي المرحلي',
      'Mid-term Financial Report': 'التقرير المالي المرحلي',
      'Final Narrative Report': 'التقرير السردي النهائي',
      'Final Financial Report': 'التقرير المالي النهائي',
      'Final Assessment Report': 'تقرير التقييم النهائي'
    };
    return translations[type] || type;
  };

  // Helper function to translate document categories to Arabic
  const translateCategory = (category: string) => {
    if (!isRTL) return category;
    const translations: Record<string, string> = {
      'Contractual': 'تعاقدي',
      'Financial': 'مالي',
      'Programmatic': 'برنامجي',
      'Supporting': 'داعم'
    };
    return translations[category] || category;
  };

  // Helper function to translate document status to Arabic
  const translateStatus = (status: string) => {
    if (!isRTL) return status;
    const translations: Record<string, string> = {
      'Draft': 'مسودة',
      'Final': 'نهائي',
      'Approved': 'معتمد'
    };
    return translations[status] || status;
  };

  const handleUploadDocument = async () => {
    if (!selectedDocType || !documentName.trim() || !selectedFile) {
      alert(isRTL ? 'يرجى تحديد نوع المستند وإدخال الاسم وتحميل الملف' : 'Please select document type, enter name, and upload file');
      return;
    }

    setIsUploading(true);

    try {
      // Determine category based on document type
      let category: 'Contractual' | 'Financial' | 'Programmatic' | 'Supporting' = 'Programmatic';
      if (selectedDocType.includes('Agreement') || selectedDocType.includes('Proposal')) {
        category = 'Contractual';
      } else if (selectedDocType.includes('Financial') || selectedDocType.includes('Budget')) {
        category = 'Financial';
      } else if (selectedDocType.includes('Report') || selectedDocType.includes('Assessment')) {
        category = 'Programmatic';
      }

      // Upload document using DocumentService
      await DocumentService.uploadDocument({
        file: selectedFile,
        document_type: selectedDocType,
        category: category,
        grant_id: grant.id,
        project_id: grant.projectId,
        uploaded_by: user?.name || 'Current User',
        uploaded_by_id: user?.id,
        status: 'Final',
        description: documentName
      });

      // Reload documents
      loadDocuments();

      // Close modal and reset fields
      setShowUploadModal(false);
      setSelectedDocType('');
      setDocumentName('');
      setSelectedFile(null);

      // Show success message
      alert(isRTL ? `تم تحميل المستند بنجاح: ${documentName}` : `Document uploaded successfully: ${documentName}`);

      // Trigger callback to refresh parent component
      if (onDocumentAdded) {
        onDocumentAdded();
      }
    } catch (error) {
      console.error('Document upload error:', error);
      alert(isRTL ? 'فشل تحميل المستند. يرجى المحاولة مرة أخرى.' : 'Document upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewDocument = (documentId: string) => {
    try {
      DocumentService.viewDocument(documentId);
    } catch (error) {
      console.error('View document error:', error);
      alert(isRTL ? 'فشل عرض المستند' : 'Failed to view document');
    }
  };

  const handleDownloadDocument = (documentId: string) => {
    try {
      DocumentService.downloadDocument(documentId);
    } catch (error) {
      console.error('Download document error:', error);
      alert(isRTL ? 'فشل تنزيل المستند' : 'Failed to download document');
    }
  };

  const handleDeleteDocument = (documentId: string) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من حذف هذا المستند؟' : 'Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const success = DocumentService.deleteDocument(documentId, user?.name || 'Current User');
      
      if (success) {
        // Reload documents
        loadDocuments();
        alert(isRTL ? 'تم حذف المستند بنجاح' : 'Document deleted successfully');
        
        // Trigger callback to refresh parent component
        if (onDocumentAdded) {
          onDocumentAdded();
        }
      } else {
        alert(isRTL ? 'فشل حذف المستند' : 'Failed to delete document');
      }
    } catch (error) {
      console.error('Delete document error:', error);
      alert(isRTL ? 'فشل حذف المستند' : 'Failed to delete document');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            <h2 className="text-2xl font-semibold text-gray-900">
              {isRTL ? 'تفاصيل المنحة' : 'Grant Details'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {grant.grantNumber} - {grant.grantName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
            title={isRTL ? 'إغلاق' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex border-b border-gray-200 px-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                } ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Grant Information Card */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className={`text-lg font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {isRTL ? 'معلومات المنحة' : 'Grant Information'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <label className="text-xs font-semibold text-gray-600 uppercase">
                      {isRTL ? 'رقم المنحة' : 'Grant Number'}
                    </label>
                    <p className="text-sm text-gray-900 mt-1 font-medium">{grant.grantNumber}</p>
                  </div>
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <label className="text-xs font-semibold text-gray-600 uppercase">
                      {isRTL ? 'اسم المنحة' : 'Grant Name'}
                    </label>
                    <p className="text-sm text-gray-900 mt-1">{grant.grantName}</p>
                  </div>
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <label className="text-xs font-semibold text-gray-600 uppercase flex items-center gap-2">
                      <Building2 className="w-3 h-3" />
                      {isRTL ? 'المانح' : 'Donor'}
                    </label>
                    <p className="text-sm text-gray-900 mt-1">{grant.donorName}</p>
                  </div>
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <label className="text-xs font-semibold text-gray-600 uppercase">
                      {isRTL ? 'مرجع المانح' : 'Donor Reference'}
                    </label>
                    <p className="text-sm text-gray-900 mt-1">{grant.donorReference || '-'}</p>
                  </div>
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <label className="text-xs font-semibold text-gray-600 uppercase flex items-center gap-2">
                      <DollarSign className="w-3 h-3" />
                      {isRTL ? 'المبلغ' : 'Grant Amount'}
                    </label>
                    <p className="text-sm text-gray-900 mt-1 font-bold" dir="ltr">
                      {formatNumber(grant.grantAmount)} {grant.currency}
                    </p>
                  </div>
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <label className="text-xs font-semibold text-gray-600 uppercase">
                      {isRTL ? 'الحالة' : 'Status'}
                    </label>
                    <div className="mt-1">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(grant.status)}`}>
                        {isRTL ? (grant.status === 'Active' ? 'نشط' : grant.status === 'Completed' ? 'مكتمل' : grant.status === 'Pending' ? 'قيد الانتظار' : 'معلق') : grant.status}
                      </span>
                    </div>
                  </div>
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <label className="text-xs font-semibold text-gray-600 uppercase flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      {isRTL ? 'تاريخ البدء' : 'Start Date'}
                    </label>
                    <p className="text-sm text-gray-900 mt-1">{grant.startDate || '-'}</p>
                  </div>
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <label className="text-xs font-semibold text-gray-600 uppercase flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      {isRTL ? 'تاريخ الانتهاء' : 'End Date'}
                    </label>
                    <p className="text-sm text-gray-900 mt-1">{grant.endDate || '-'}</p>
                  </div>
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <label className="text-xs font-semibold text-gray-600 uppercase">
                      {isRTL ? 'القطاع' : 'Sector'}
                    </label>
                    <p className="text-sm text-gray-900 mt-1">{grant.sector}</p>
                  </div>
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <label className="text-xs font-semibold text-gray-600 uppercase flex items-center gap-2">
                      <User className="w-3 h-3" />
                      {isRTL ? 'المسؤول' : 'Responsible'}
                    </label>
                    <p className="text-sm text-gray-900 mt-1">{grant.responsible}</p>
                  </div>
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <label className="text-xs font-semibold text-gray-600 uppercase flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      {isRTL ? 'تكرار التقارير' : 'Reporting Frequency'}
                    </label>
                    <p className="text-sm text-gray-900 mt-1">{grant.reportingFrequency}</p>
                  </div>
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <label className="text-xs font-semibold text-gray-600 uppercase">
                      {isRTL ? 'حالة التقارير' : 'Reporting Status'}
                    </label>
                    <p className="text-sm text-gray-900 mt-1">{grant.reportingStatus}</p>
                  </div>
                </div>

                {grant.coFunding && (
                  <div className={`mt-4 pt-4 border-t border-gray-300 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <label className="text-xs font-semibold text-gray-600 uppercase">
                      {isRTL ? 'الممول المشارك' : 'Co-Funder'}
                    </label>
                    <p className="text-sm text-gray-900 mt-1">{grant.coFunderName}</p>
                  </div>
                )}

                {grant.description && (
                  <div className={`mt-4 pt-4 border-t border-gray-300 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <label className="text-xs font-semibold text-gray-600 uppercase">
                      {isRTL ? 'الوصف' : 'Description'}
                    </label>
                    <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{grant.description}</p>
                  </div>
                )}
              </div>

              {/* Linked Project Reference */}
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                <h3 className={`text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2 ${isRTL ? 'text-right flex-row-reverse' : 'text-left'}`}>
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                  {isRTL ? 'المشروع المرتبط' : 'Linked Project Reference'}
                </h3>
                <p className={`text-sm text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {isRTL ? 'هذه المنحة مرتبطة بـ: ' : 'This grant is linked to: '}
                  <span className="font-semibold text-primary">{grant.projectName}</span>
                </p>
                <p className={`text-xs text-gray-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {isRTL ? 'رقم المشروع: ' : 'Project ID: '}
                  <span className="font-mono">{grant.projectId}</span>
                </p>
              </div>
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                  <p className="text-sm text-blue-800">
                    {isRTL 
                      ? 'الجدول الزمني موروث من جدول التقارير الخاص بالمشروع' 
                      : 'Timeline is inherited from Project Reporting Schedule'}
                  </p>
                </div>
              </div>

              {grant.milestones && grant.milestones.length > 0 ? (
                <div className="space-y-3">
                  {grant.milestones.map((milestone, index) => (
                    <div key={milestone.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors">
                      <div className={`flex items-start justify-between mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                          <h4 className="font-semibold text-gray-900">{milestone.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                        </div>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getMilestoneStatusColor(milestone.status)} ${isRTL ? 'mr-4' : 'ml-4'}`}>
                          {milestone.status}
                        </span>
                      </div>
                      <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 text-xs ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div>
                          <span className="text-gray-600">{isRTL ? 'النوع:' : 'Type:'}</span>
                          <span className={`font-medium text-gray-900 ${isRTL ? 'mr-1' : 'ml-1'}`}>{milestone.type}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">{isRTL ? 'تاريخ الاستحقاق:' : 'Due Date:'}</span>
                          <span className={`font-medium text-gray-900 ${isRTL ? 'mr-1' : 'ml-1'}`}>{milestone.dueDate}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">{isRTL ? 'تاريخ التقديم:' : 'Submitted:'}</span>
                          <span className={`font-medium text-gray-900 ${isRTL ? 'mr-1' : 'ml-1'}`}>{milestone.submittedDate || '-'}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">{isRTL ? 'الوحدة المسؤولة:' : 'Responsible:'}</span>
                          <span className={`font-medium text-gray-900 ${isRTL ? 'mr-1' : 'ml-1'}`}>{milestone.responsibleUnit}</span>
                        </div>
                      </div>
                      {milestone.remarks && (
                        <div className={`mt-3 pt-3 border-t border-gray-200 ${isRTL ? 'text-right' : 'text-left'}`}>
                          <span className="text-xs text-gray-600">{isRTL ? 'ملاحظات:' : 'Remarks:'}</span>
                          <p className="text-xs text-gray-700 mt-1">{milestone.remarks}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">{isRTL ? 'لا توجد معالم حتى الآن' : 'No milestones yet'}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {isRTL ? 'سيتم إضافة امعالم من جدول التقارير الخاص بالمشروع' : 'Milestones will be added from project reporting schedule'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              {/* Project Key Documents Section */}
              <div>
                <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <h3 className={`text-lg font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'مستندات المشروع الرئيسية' : 'Project Key Documents'}
                  </h3>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className={`px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <Upload className="w-4 h-4" />
                    {isRTL ? 'تحميل مستند' : 'Upload document'}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {keyDocumentTypes.map((docType, index) => (
                    <div key={index} className={`bg-gray-50 rounded-lg p-3 border border-gray-200 flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <p className="text-sm font-medium text-gray-900">{translateDocType(docType)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Uploaded Documents Section */}
              <div>
                <h3 className={`text-lg font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {isRTL ? 'المستندا المرفوعة' : 'Uploaded Documents'}
                </h3>
                {documents && documents.length > 0 ? (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div key={doc.document_id} className="bg-white rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors">
                        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex items-center gap-3 flex-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <FolderOpen className="w-5 h-5 text-blue-600" />
                            <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                              <p className="font-medium text-gray-900">{doc.file_name}</p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                                <span>{translateCategory(doc.category)}</span>
                                <span>•</span>
                                <span>{isRTL ? 'الإصدار' : 'Version'} {doc.version}</span>
                                <span>•</span>
                                <span>{doc.uploaded_by}</span>
                                <span>•</span>
                                <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getDocumentStatusColor(doc.status)} ${isRTL ? 'mr-4' : 'ml-4'}`}>
                            {translateStatus(doc.status)}
                          </span>
                        </div>
                        <div className={`flex items-center gap-2 mt-3 ${isRTL ? 'flex-row-reverse justify-start' : 'justify-end'}`}>
                          <button
                            onClick={() => handleViewDocument(doc.document_id)}
                            className={`px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}
                          >
                            <Eye className="w-4 h-4" />
                            <span>{isRTL ? 'عرض' : 'View'}</span>
                          </button>
                          <button
                            onClick={() => handleDownloadDocument(doc.document_id)}
                            className={`px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}
                          >
                            <Download className="w-4 h-4" />
                            <span>{isRTL ? 'تنزيل' : 'Download'}</span>
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(doc.document_id)}
                            className={`px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>{isRTL ? 'حذف' : 'Delete'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">{isRTL ? 'لا توجد مستندات مرفوعة' : 'No documents uploaded yet'}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {isRTL ? 'استخدم زر "تحميل مستند" لرفع المستندات' : 'Use "Upload document" button to upload documents'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`text-xs text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
            <p>{isRTL ? 'تم الإنشاء:' : 'Created:'} {new Date(grant.createdAt).toLocaleString()}</p>
            <p>{isRTL ? 'آخر تحديث:' : 'Last updated:'} {new Date(grant.updatedAt).toLocaleString()}</p>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            {isRTL ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" dir={isRTL ? 'rtl' : 'ltr'}>
            <h3 className={`text-lg font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              {isRTL ? 'تحميل مستند' : 'Upload Document'}
            </h3>
            
            <div className="space-y-4">
              {/* Document Type Selector */}
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {isRTL ? 'نوع المستند' : 'Document Type'} <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  <option value="">{isRTL ? 'اختر نوع المستند' : 'Select document type'}</option>
                  {keyDocumentTypes.map((type, index) => (
                    <option key={index} value={type}>{translateDocType(type)}</option>
                  ))}
                </select>
              </div>

              {/* Document Name Input */}
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {isRTL ? 'اسم المستند' : 'Document Name'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  placeholder={isRTL ? 'أدخل اسم المستند' : 'Enter document name'}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                />
              </div>

              {/* File Upload */}
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {isRTL ? 'اختر الملف' : 'Choose File'}
                </label>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className={`flex items-center justify-end gap-3 mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedDocType('');
                  setDocumentName('');
                  setSelectedFile(null);
                }}
                className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleUploadDocument}
                className={`px-4 py-2 text-sm font-medium bg-primary text-white rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <Upload className="w-4 h-4" />
                {isRTL ? 'تحميل' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}