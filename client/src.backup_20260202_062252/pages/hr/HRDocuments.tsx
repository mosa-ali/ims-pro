/**
 * ============================================================================
 * HR DOCUMENTS MODULE
 * ============================================================================
 * 
 * Central archive for all HR documents
 * Read-only with View/Download/Print
 * Auto-synced from source modules
 * Organized by folders
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { 
  FolderOpen, 
  FileText, 
  Search, 
  Eye, 
  Download, 
  Printer, 
  Lock, 
  Unlock,
  Filter,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { hrDocumentsService, HRDocument, DocumentFolder } from '@/app/services/hrDocumentsService';

export function HRDocuments() {
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [documents, setDocuments] = useState<HRDocument[]>([]);
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    hrDocumentsService.autoSyncFromModules();
    setFolders(hrDocumentsService.getFolders());
    setDocuments(hrDocumentsService.getAll());
  };

  const t = {
    title: language === 'en' ? 'HR Documents' : 'مستندات الموارد البشرية',
    subtitle: language === 'en' ? 'Central archive for all HR documentation' : 'الأرشيف المركزي لجميع وثائق الموارد البشرية',
    back: language === 'en' ? 'Overview' : 'نظرة عامة',
    
    search: language === 'en' ? 'Search documents...' : 'بحث في المستندات...',
    allFolders: language === 'en' ? 'All Folders' : 'جميع المجلدات',
    folders: language === 'en' ? 'Folders' : 'المجلدات',
    documents: language === 'en' ? 'Documents' : 'المستندات',
    
    staffId: language === 'en' ? 'Staff ID' : 'رقم الموظف',
    staffName: language === 'en' ? 'Staff Name' : 'اسم الموظف',
    fileName: language === 'en' ? 'File Name' : 'اسم الملف',
    documentType: language === 'en' ? 'Document Type' : 'نوع المستند',
    sourceModule: language === 'en' ? 'Source Module' : 'الوحدة المصدر',
    createdDate: language === 'en' ? 'Created Date' : 'تاريخ الإنشاء',
    createdBy: language === 'en' ? 'Created By' : 'أنشأه',
    actions: language === 'en' ? 'Actions' : 'الإجراءات',
    
    view: language === 'en' ? 'View' : 'عرض',
    download: language === 'en' ? 'Download' : 'تحميل',
    print: language === 'en' ? 'Print' : 'طباعة',
    locked: language === 'en' ? 'Locked' : 'مقفل',
    unlocked: language === 'en' ? 'Unlocked' : 'غير مقفل',
    
    filterBy: language === 'en' ? 'Filter by Type' : 'تصفية حسب النوع',
    allTypes: language === 'en' ? 'All Types' : 'جميع الأنواع',
    
    totalDocuments: language === 'en' ? 'Total Documents' : 'إجمالي المستندات',
    lockedDocuments: language === 'en' ? 'Locked Documents' : 'المستندات المقفلة',
    
    noDocuments: language === 'en' ? 'No documents found' : 'لم يتم العثور على مستندات',
    readOnlyNote: language === 'en' ? '📌 This is a read-only archive. Documents are auto-synced from source modules.' : '📌 هذا أرشيف للقراءة فقط. يتم مزامنة المستندات تلقائياً من الوحدات المصدر.'
  };

  const getDisplayedDocuments = () => {
    let filtered = documents;
    
    // Filter by folder
    if (selectedFolder) {
      filtered = filtered.filter(doc => doc.folder === selectedFolder);
    }
    
    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(doc => doc.documentType === filterType);
    }
    
    // Search
    if (searchQuery) {
      filtered = hrDocumentsService.search(searchQuery);
      if (selectedFolder) {
        filtered = filtered.filter(doc => doc.folder === selectedFolder);
      }
      if (filterType !== 'all') {
        filtered = filtered.filter(doc => doc.documentType === filterType);
      }
    }
    
    return filtered;
  };

  const handleView = (doc: HRDocument) => {
    alert(`View document: ${doc.fileName}\n\nIn a real system, this would open the document viewer.`);
  };

  const handleDownload = (doc: HRDocument) => {
    alert(`Download document: ${doc.fileName}\n\nIn a real system, this would trigger a file download.`);
  };

  const handlePrint = (doc: HRDocument) => {
    alert(`Print document: ${doc.fileName}\n\nIn a real system, this would open the print dialog.`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar' : 'en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const stats = hrDocumentsService.getStatistics();
  const displayedDocs = getDisplayedDocuments();
  
  const documentTypes = ['Contract', 'Appraisal', 'Disciplinary', 'Clearance', 'Exit', 'Recruitment', 'Reference', 'Offer Letter', 'Training', 'Leave'];

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Back Button */}
      <button
        onClick={() => navigate('/organization/hr')}
        className={`flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
      >
        <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
        <span>{t.back}</span>
      </button>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
        <p className="text-base text-gray-600 mt-2">{t.subtitle}</p>
      </div>

      {/* Read-Only Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">{t.readOnlyNote}</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{t.totalDocuments}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalDocuments}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Lock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{t.lockedDocuments}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.lockedDocuments}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FolderOpen className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{t.folders}</p>
              <p className="text-2xl font-bold text-gray-900">{folders.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Folders */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-4">{t.folders}</h3>
            
            <div className="space-y-1">
              <button
                onClick={() => setSelectedFolder(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedFolder === null
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{t.allFolders}</span>
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                    {documents.length}
                  </span>
                </div>
              </button>
              
              {folders.map(folder => (
                <button
                  key={folder.folderId}
                  onClick={() => setSelectedFolder(folder.folderName)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedFolder === folder.folderName
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4" />
                      <span>{folder.folderName}</span>
                    </div>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                      {folder.documentCount}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Content - Documents Table */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg border border-gray-200">
            {/* Search and Filters */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t.search}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">{t.allTypes}</option>
                  {documentTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Documents Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.staffId}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.staffName}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.fileName}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.documentType}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.createdDate}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {displayedDocs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                        {t.noDocuments}
                      </td>
                    </tr>
                  ) : (
                    displayedDocs.map(doc => (
                      <tr key={doc.documentId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          <span className="font-mono text-blue-600">{doc.staffId}</span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {doc.staffFullName}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-900">{doc.fileName}</span>
                            {doc.locked && <Lock className="w-3 h-3 text-amber-500" />}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {doc.documentType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDate(doc.createdDate)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleView(doc)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title={t.view}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownload(doc)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                              title={t.download}
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handlePrint(doc)}
                              className="p-1.5 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                              title={t.print}
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}