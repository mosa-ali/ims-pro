import React, { useState, useEffect } from 'react';
import { X, FileText, Calendar, FolderOpen, Building2, DollarSign, Clock, User, AlertCircle, Upload, Download, Trash2, Eye } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { DocumentService, DocumentRecord } from '@/services/DocumentService';
import { useTranslation } from '@/i18n/useTranslation';

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

export function GrantDetailsModal({
 grant, onClose, onDocumentAdded }: GrantDetailsModalProps) {
 const { t } = useTranslation();
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
 { id: 'overview' as const, label: t.organizationModule.overview, icon: FileText },
 { id: 'timeline' as const, label: t.organizationModule.timeline, icon: Calendar },
 { id: 'documents' as const, label: t.organizationModule.documents, icon: FolderOpen }
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
 alert(t.organizationModule.pleaseSelectDocumentTypeEnterName);
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
 alert(`Document uploaded successfully: ${documentName}`);

 // Trigger callback to refresh parent component
 if (onDocumentAdded) {
 onDocumentAdded();
 }
 } catch (error) {
 console.error('Document upload error:', error);
 alert(t.organizationModule.documentUploadFailedPleaseTryAgain);
 } finally {
 setIsUploading(false);
 }
 };

 const handleViewDocument = (documentId: string) => {
 try {
 DocumentService.viewDocument(documentId);
 } catch (error) {
 console.error('View document error:', error);
 alert(t.organizationModule.failedToViewDocument);
 }
 };

 const handleDownloadDocument = (documentId: string) => {
 try {
 DocumentService.downloadDocument(documentId);
 } catch (error) {
 console.error('Download document error:', error);
 alert(t.organizationModule.failedToDownloadDocument);
 }
 };

 const handleDeleteDocument = (documentId: string) => {
 if (!confirm(t.organizationModule.areYouSureYouWantTo)) {
 return;
 }

 try {
 const success = DocumentService.deleteDocument(documentId, user?.name || 'Current User');
 
 if (success) {
 // Reload documents
 loadDocuments();
 alert(t.organizationModule.documentDeletedSuccessfully);
 
 // Trigger callback to refresh parent component
 if (onDocumentAdded) {
 onDocumentAdded();
 }
 } else {
 alert(t.organizationModule.failedToDeleteDocument);
 }
 } catch (error) {
 console.error('Delete document error:', error);
 alert(t.organizationModule.failedToDeleteDocument);
 }
 };

 return (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
 {/* Header */}
 <div className="flex items-center justify-between p-6 border-b border-gray-200">
 <div className={`flex-1 text-start`}>
 <h2 className="text-2xl font-semibold text-gray-900">
 {t.organizationModule.grantDetails}
 </h2>
 <p className="text-sm text-gray-600 mt-1">
 {grant.grantNumber} - {grant.grantName}
 </p>
 </div>
 <button
 onClick={onClose}
 className="p-2 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
 title={t.organizationModule.close}
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Tabs */}
 <div className={`flex border-b border-gray-200 px-6`}>
 {tabs.map(tab => {
 const Icon = tab.icon;
 return (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${ activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-gray-600 hover:text-gray-900' }`}
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
 <h3 className={`text-lg font-semibold text-gray-900 mb-4 text-start`}>
 {t.organizationModule.grantInformation}
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className={'text-start'}>
 <label className="text-xs font-semibold text-gray-600 uppercase">
 {t.organizationModule.grantNumber}
 </label>
 <p className="text-sm text-gray-900 mt-1 font-medium">{grant.grantNumber}</p>
 </div>
 <div className={'text-start'}>
 <label className="text-xs font-semibold text-gray-600 uppercase">
 {t.organizationModule.grantName}
 </label>
 <p className="text-sm text-gray-900 mt-1">{grant.grantName}</p>
 </div>
 <div className={'text-start'}>
 <label className="text-xs font-semibold text-gray-600 uppercase flex items-center gap-2">
 <Building2 className="w-3 h-3" />
 {t.organizationModule.donor}
 </label>
 <p className="text-sm text-gray-900 mt-1">{grant.donorName}</p>
 </div>
 <div className={'text-start'}>
 <label className="text-xs font-semibold text-gray-600 uppercase">
 {t.organizationModule.donorReference}
 </label>
 <p className="text-sm text-gray-900 mt-1">{grant.donorReference || '-'}</p>
 </div>
 <div className={'text-start'}>
 <label className="text-xs font-semibold text-gray-600 uppercase flex items-center gap-2">
 <DollarSign className="w-3 h-3" />
 {t.organizationModule.grantAmount}
 </label>
 <p className="ltr-safe text-sm text-gray-900 mt-1 font-bold">
 {formatNumber(grant.grantAmount)} {grant.currency}
 </p>
 </div>
 <div className={'text-start'}>
 <label className="text-xs font-semibold text-gray-600 uppercase">
 {t.organizationModule.status}
 </label>
 <div className="mt-1">
 <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(grant.status)}`}>
 {isRTL ? (grant.status === 'Active' ? 'نشط' : grant.status === 'Completed' ? 'مكتمل' : grant.status === 'Pending' ? 'قيد الانتظار' : 'معلق') : grant.status}
 </span>
 </div>
 </div>
 <div className={'text-start'}>
 <label className="text-xs font-semibold text-gray-600 uppercase flex items-center gap-2">
 <Calendar className="w-3 h-3" />
 {t.organizationModule.startDate}
 </label>
 <p className="text-sm text-gray-900 mt-1">{grant.startDate || '-'}</p>
 </div>
 <div className={'text-start'}>
 <label className="text-xs font-semibold text-gray-600 uppercase flex items-center gap-2">
 <Calendar className="w-3 h-3" />
 {t.organizationModule.endDate}
 </label>
 <p className="text-sm text-gray-900 mt-1">{grant.endDate || '-'}</p>
 </div>
 <div className={'text-start'}>
 <label className="text-xs font-semibold text-gray-600 uppercase">
 {t.organizationModule.sector}
 </label>
 <p className="text-sm text-gray-900 mt-1">{grant.sector}</p>
 </div>
 <div className={'text-start'}>
 <label className="text-xs font-semibold text-gray-600 uppercase flex items-center gap-2">
 <User className="w-3 h-3" />
 {t.organizationModule.responsible}
 </label>
 <p className="text-sm text-gray-900 mt-1">{grant.responsible}</p>
 </div>
 <div className={'text-start'}>
 <label className="text-xs font-semibold text-gray-600 uppercase flex items-center gap-2">
 <Clock className="w-3 h-3" />
 {t.organizationModule.reportingFrequency}
 </label>
 <p className="text-sm text-gray-900 mt-1">{grant.reportingFrequency}</p>
 </div>
 <div className={'text-start'}>
 <label className="text-xs font-semibold text-gray-600 uppercase">
 {t.organizationModule.reportingStatus}
 </label>
 <p className="text-sm text-gray-900 mt-1">{grant.reportingStatus}</p>
 </div>
 </div>

 {grant.coFunding && (
 <div className={`mt-4 pt-4 border-t border-gray-300 text-start`}>
 <label className="text-xs font-semibold text-gray-600 uppercase">
 {t.organizationModule.cofunder}
 </label>
 <p className="text-sm text-gray-900 mt-1">{grant.coFunderName}</p>
 </div>
 )}

 {grant.description && (
 <div className={`mt-4 pt-4 border-t border-gray-300 text-start`}>
 <label className="text-xs font-semibold text-gray-600 uppercase">
 {t.organizationModule.description}
 </label>
 <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{grant.description}</p>
 </div>
 )}
 </div>

 {/* Linked Project Reference */}
 <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
 <h3 className={`text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2 text-start`}>
 <AlertCircle className="w-5 h-5 text-blue-600" />
 {t.organizationModule.linkedProjectReference}
 </h3>
 <p className={`text-sm text-gray-700 text-start`}>
 {t.organizationModule.thisGrantIsLinkedTo}
 <span className="font-semibold text-primary">{grant.projectName}</span>
 </p>
 <p className={`text-xs text-gray-600 mt-1 text-start`}>
 {t.organizationModule.projectId}
 <span className="font-mono">{grant.projectId}</span>
 </p>
 </div>
 </div>
 )}

 {/* Timeline Tab */}
 {activeTab === 'timeline' && (
 <div className="space-y-4">
 <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 text-start`}>
 <div className={`flex items-center gap-2`}>
 <AlertCircle className="w-5 h-5 text-blue-600" />
 <p className="text-sm text-blue-800">
 {'Timeline is inherited from Project Reporting Schedule'}
 </p>
 </div>
 </div>

 {grant.milestones && grant.milestones.length > 0 ? (
 <div className="space-y-3">
 {grant.milestones.map((milestone, index) => (
 <div key={milestone.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors">
 <div className={`flex items-start justify-between mb-3`}>
 <div className={`flex-1 text-start`}>
 <h4 className="font-semibold text-gray-900">{milestone.name}</h4>
 <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
 </div>
 <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getMilestoneStatusColor(milestone.status)} ms-4`}>
 {milestone.status}
 </span>
 </div>
 <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-start`}>
 <div>
 <span className="text-gray-600">{t.organizationModule.type}</span>
 <span className={`font-medium text-gray-900 ms-1`}>{milestone.type}</span>
 </div>
 <div>
 <span className="text-gray-600">{t.organizationModule.dueDate}</span>
 <span className={`font-medium text-gray-900 ms-1`}>{milestone.dueDate}</span>
 </div>
 <div>
 <span className="text-gray-600">{t.organizationModule.submitted}</span>
 <span className={`font-medium text-gray-900 ms-1`}>{milestone.submittedDate || '-'}</span>
 </div>
 <div>
 <span className="text-gray-600">{t.organizationModule.responsible2}</span>
 <span className={`font-medium text-gray-900 ms-1`}>{milestone.responsibleUnit}</span>
 </div>
 </div>
 {milestone.remarks && (
 <div className={`mt-3 pt-3 border-t border-gray-200 text-start`}>
 <span className="text-xs text-gray-600">{t.organizationModule.remarks}</span>
 <p className="text-xs text-gray-700 mt-1">{milestone.remarks}</p>
 </div>
 )}
 </div>
 ))}
 </div>
 ) : (
 <div className="text-center py-12">
 <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
 <p className="text-gray-600">{t.organizationModule.noMilestonesYet}</p>
 <p className="text-sm text-gray-500 mt-1">
 {t.organizationModule.milestonesWillBeAddedFromProject}
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
 <div className={`flex items-center justify-between mb-4`}>
 <h3 className={`text-lg font-semibold text-gray-900 text-start`}>
 {t.organizationModule.projectKeyDocuments}
 </h3>
 <button
 onClick={() => setShowUploadModal(true)}
 className={`px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2`}
 >
 <Upload className="w-4 h-4" />
 {t.organizationModule.uploadDocument}
 </button>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
 {keyDocumentTypes.map((docType, index) => (
 <div key={index} className={`bg-gray-50 rounded-lg p-3 border border-gray-200 flex items-center gap-3`}>
 <FileText className="w-5 h-5 text-gray-400" />
 <div className={`flex-1 text-start`}>
 <p className="text-sm font-medium text-gray-900">{translateDocType(docType)}</p>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Uploaded Documents Section */}
 <div>
 <h3 className={`text-lg font-semibold text-gray-900 mb-4 text-start`}>
 {t.organizationModule.uploadedDocuments}
 </h3>
 {documents && documents.length > 0 ? (
 <div className="space-y-2">
 {documents.map((doc) => (
 <div key={doc.document_id} className="bg-white rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors">
 <div className={`flex items-center justify-between`}>
 <div className={`flex items-center gap-3 flex-1`}>
 <FolderOpen className="w-5 h-5 text-blue-600" />
 <div className={`flex-1 text-start`}>
 <p className="font-medium text-gray-900">{doc.file_name}</p>
 <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
 <span>{translateCategory(doc.category)}</span>
 <span>•</span>
 <span>{t.organizationModule.version} {doc.version}</span>
 <span>•</span>
 <span>{doc.uploaded_by}</span>
 <span>•</span>
 <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
 </div>
 </div>
 </div>
 <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getDocumentStatusColor(doc.status)} ms-4`}>
 {translateStatus(doc.status)}
 </span>
 </div>
 <div className={`flex items-center gap-2 mt-3 justify-end`}>
 <button
 onClick={() => handleViewDocument(doc.document_id)}
 className={`px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-1.5`}
 >
 <Eye className="w-4 h-4" />
 <span>{t.organizationModule.view}</span>
 </button>
 <button
 onClick={() => handleDownloadDocument(doc.document_id)}
 className={`px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors flex items-center gap-1.5`}
 >
 <Download className="w-4 h-4" />
 <span>{t.organizationModule.download}</span>
 </button>
 <button
 onClick={() => handleDeleteDocument(doc.document_id)}
 className={`px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors flex items-center gap-1.5`}
 >
 <Trash2 className="w-4 h-4" />
 <span>{t.organizationModule.delete}</span>
 </button>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
 <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
 <p className="text-gray-600">{t.organizationModule.noDocumentsUploadedYet}</p>
 <p className="text-sm text-gray-500 mt-1">
 {t.organizationModule.useUploadDocumentButtonToUpload}
 </p>
 </div>
 )}
 </div>
 </div>
 )}
 </div>

 {/* Footer */}
 <div className={`flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50`}>
 <div className={`text-xs text-gray-600 text-start`}>
 <p>{t.organizationModule.created} {new Date(grant.createdAt).toLocaleString()}</p>
 <p>{t.organizationModule.lastUpdated3} {new Date(grant.updatedAt).toLocaleString()}</p>
 </div>
 <button
 onClick={onClose}
 className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
 >
 {t.organizationModule.close}
 </button>
 </div>
 </div>

 {/* Upload Document Modal */}
 {showUploadModal && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[60]">
 <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
 <h3 className={`text-lg font-semibold text-gray-900 mb-4 text-start`}>
 {t.organizationModule.uploadDocument4}
 </h3>
 
 <div className="space-y-4">
 {/* Document Type Selector */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 text-start`}>
 {t.organizationModule.documentType} <span className="text-red-500">*</span>
 </label>
 <select
 value={selectedDocType}
 onChange={(e) => setSelectedDocType(e.target.value)}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 >
 <option value="">{t.organizationModule.selectDocumentType}</option>
 {keyDocumentTypes.map((type, index) => (
 <option key={index} value={type}>{translateDocType(type)}</option>
 ))}
 </select>
 </div>

 {/* Document Name Input */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 text-start`}>
 {t.organizationModule.documentName} <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 value={documentName}
 onChange={(e) => setDocumentName(e.target.value)}
 placeholder={t.organizationModule.enterDocumentName}
 className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start`}
 />
 </div>

 {/* File Upload */}
 <div>
 <label className={`block text-sm font-medium text-gray-700 mb-2 text-start`}>
 {t.organizationModule.chooseFile}
 </label>
 <input
 type="file"
 onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 />
 </div>
 </div>

 {/* Modal Actions */}
 <div className={`flex items-center justify-end gap-3 mt-6`}>
 <button
 onClick={() => {
 setShowUploadModal(false);
 setSelectedDocType('');
 setDocumentName('');
 setSelectedFile(null);
 }}
 className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
 >
 {t.organizationModule.cancel}
 </button>
 <button
 onClick={handleUploadDocument}
 className={`px-4 py-2 text-sm font-medium bg-primary text-white rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2`}
 >
 <Upload className="w-4 h-4" />
 {t.organizationModule.upload}
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}