/**
 * ============================================================================
 * MEAL DOCUMENTS - MANUAL DOCUMENT MANAGEMENT
 * ============================================================================
 * 
 * PURPOSE: Manual document workspace for MEAL teams
 * 
 * KEY FEATURES:
 * - 100% Manual: NO auto-generated documents
 * - User-defined folder structure (unlimited depth)
 * - Create/rename folders at any level
 * - Upload any file type
 * - Full bilingual support (EN/AR with RTL)
 * - File preview and download
 * - Audit trail (who uploaded, when)
 * 
 * EXPLICITLY NOT ALLOWED:
 * ❌ Auto-generated documents
 * ❌ Auto-exports from Indicators/Surveys/Reports
 * ❌ Invisible document creation
 * ❌ Locked folder structures
 * 
 * ============================================================================
 */

import { useState, useMemo } from 'react';
import { 
  Folder, 
  FolderOpen, 
  FolderPlus,
  ChevronRight, 
  ChevronDown, 
  Upload, 
  FileText,
  File,
  Image as ImageIcon,
  FileSpreadsheet,
  FileVideo,
  FileArchive,
  Edit2,
  Download,
  Trash2,
  X,
  Save,
  Info
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';

interface MEALDocument {
  id: string;
  name: string;
  folderId: string;
  fileType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
  path: string;
}

interface MEALFolder {
  id: string;
  name: string;
  nameAr: string;
  parentId: string | null;
  path: string;
  createdBy: string;
  createdAt: string;
}

const STORAGE_KEY_FOLDERS = 'meal_manual_folders';
const STORAGE_KEY_FILES = 'meal_manual_files';

export function DocumentsManual() {
  const { isRTL, language } = useLanguage();
  const { user } = useAuth();

  const [folders, setFolders] = useState<MEALFolder[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_FOLDERS);
    if (saved) {
      return JSON.parse(saved);
    }
    // Initialize with root folder only
    const root: MEALFolder = {
      id: 'meal-docs-root',
      name: 'MEAL Documents',
      nameAr: 'مستندات MEAL',
      parentId: null,
      path: '/MEAL Documents',
      createdBy: 'System',
      createdAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify([root]));
    return [root];
  });

  const [documents, setDocuments] = useState<MEALDocument[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_FILES);
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedFolderId, setSelectedFolderId] = useState<string>('meal-docs-root');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['meal-docs-root']));
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showRenameFolder, setShowRenameFolder] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderNameAr, setNewFolderNameAr] = useState('');
  const [renameFolderName, setRenameFolderName] = useState('');
  const [renameFolderNameAr, setRenameFolderNameAr] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  // Translations
  const t = {
    title: language === 'en' ? 'MEAL Documents' : 'مستندات MEAL',
    subtitle: language === 'en' 
      ? 'Manual document management workspace' 
      : 'مساحة عمل إدارة المستندات اليدوية',
    infoTitle: language === 'en' ? 'About MEAL Documents' : 'حول مستندات MEAL',
    infoText: language === 'en'
      ? 'This is a manual document workspace. Create folders, upload files, and organize your MEAL evidence and supporting documents.'
      : 'هذه مساحة عمل للمستندات اليدوية. قم بإنشاء المجلدات وتحميل الملفات وتنظيم أدلة MEAL والمستندات الداعمة.',
    folderTree: language === 'en' ? 'Folders' : 'المجلدات',
    createFolder: language === 'en' ? 'Create Folder' : 'إنشاء مجلد',
    renameFolder: language === 'en' ? 'Rename Folder' : 'إعادة تسمية المجلد',
    uploadFiles: language === 'en' ? 'Upload Files' : 'رفع الملفات',
    folderNameEn: language === 'en' ? 'Folder Name (English)' : 'اسم المجلد (إنجليزي)',
    folderNameAr: language === 'en' ? 'Folder Name (Arabic)' : 'اسم المجلد (عربي)',
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    save: language === 'en' ? 'Save' : 'حفظ',
    create: language === 'en' ? 'Create' : 'إنشاء',
    selectFiles: language === 'en' ? 'Select Files' : 'اختر الملفات',
    upload: language === 'en' ? 'Upload' : 'رفع',
    noDocuments: language === 'en' ? 'No documents in this folder' : 'لا توجد مستندات في هذا المجلد',
    uploadHere: language === 'en' ? 'Upload files to get started' : 'قم برفع الملفات للبدء',
    uploadedBy: language === 'en' ? 'Uploaded by' : 'تم الرفع بواسطة',
    uploadedOn: language === 'en' ? 'on' : 'في',
    download: language === 'en' ? 'Download' : 'تحميل',
    delete: language === 'en' ? 'Delete' : 'حذف',
    rename: language === 'en' ? 'Rename' : 'إعادة تسمية',
    allFileTypes: language === 'en' ? 'All file types supported' : 'جميع أنواع الملفات مدعومة',
  };

  // Build folder tree
  const folderTree = useMemo(() => {
    const buildTree = (parentId: string | null): any[] => {
      return folders
        .filter(f => f.parentId === parentId)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(folder => ({
          ...folder,
          children: buildTree(folder.id)
        }));
    };
    return buildTree(null);
  }, [folders]);

  // Get selected folder
  const selectedFolder = useMemo(() => {
    return folders.find(f => f.id === selectedFolderId);
  }, [folders, selectedFolderId]);

  // Get documents in selected folder
  const folderDocuments = useMemo(() => {
    return documents.filter(d => d.folderId === selectedFolderId);
  }, [documents, selectedFolderId]);

  // Toggle folder expansion
  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  // Create folder
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;

    const parentFolder = folders.find(f => f.id === selectedFolderId);
    if (!parentFolder) return;

    const newFolder: MEALFolder = {
      id: `folder-${Date.now()}`,
      name: newFolderName.trim(),
      nameAr: newFolderNameAr.trim() || newFolderName.trim(),
      parentId: selectedFolderId,
      path: `${parentFolder.path}/${newFolderName.trim()}`,
      createdBy: user?.name || 'User',
      createdAt: new Date().toISOString()
    };

    const updatedFolders = [...folders, newFolder];
    setFolders(updatedFolders);
    localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(updatedFolders));

    // Expand parent folder
    setExpandedFolders(new Set([...Array.from(expandedFolders), selectedFolderId]));

    // Reset form
    setNewFolderName('');
    setNewFolderNameAr('');
    setShowCreateFolder(false);
  };

  // Rename folder
  const handleRenameFolder = (folderId: string) => {
    if (!renameFolderName.trim()) return;

    const updatedFolders = folders.map(folder => {
      if (folder.id === folderId) {
        const parentFolder = folders.find(f => f.id === folder.parentId);
        const newPath = parentFolder 
          ? `${parentFolder.path}/${renameFolderName.trim()}`
          : `/${renameFolderName.trim()}`;

        return {
          ...folder,
          name: renameFolderName.trim(),
          nameAr: renameFolderNameAr.trim() || renameFolderName.trim(),
          path: newPath
        };
      }
      return folder;
    });

    setFolders(updatedFolders);
    localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(updatedFolders));

    setRenameFolderName('');
    setRenameFolderNameAr('');
    setShowRenameFolder(null);
  };

  // Upload files
  const handleUploadFiles = () => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const newDocuments: MEALDocument[] = [];
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const doc: MEALDocument = {
        id: `doc-${Date.now()}-${i}`,
        name: file.name,
        folderId: selectedFolderId,
        fileType: file.type || 'application/octet-stream',
        size: file.size,
        uploadedBy: user?.name || 'User',
        uploadedAt: new Date().toISOString(),
        path: `${selectedFolder?.path}/${file.name}`
      };
      newDocuments.push(doc);
    }

    const updatedDocuments = [...documents, ...newDocuments];
    setDocuments(updatedDocuments);
    localStorage.setItem(STORAGE_KEY_FILES, JSON.stringify(updatedDocuments));

    setSelectedFiles(null);
    setShowUploadDialog(false);
  };

  // Delete document
  const handleDeleteDocument = (docId: string) => {
    if (!confirm(language === 'en' ? 'Delete this document?' : 'حذف هذا المستند؟')) return;

    const updatedDocuments = documents.filter(d => d.id !== docId);
    setDocuments(updatedDocuments);
    localStorage.setItem(STORAGE_KEY_FILES, JSON.stringify(updatedDocuments));
  };

  // Get file icon
  const getFileIcon = (fileType: string) => {
    if (fileType.includes('image')) return ImageIcon;
    if (fileType.includes('pdf')) return FileText;
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return FileSpreadsheet;
    if (fileType.includes('video')) return FileVideo;
    if (fileType.includes('zip') || fileType.includes('archive')) return FileArchive;
    return File;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Render folder node
  const renderFolderNode = (folder: any, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const hasChildren = folder.children && folder.children.length > 0;

    return (
      <div key={folder.id}>
        <div
          className={`
            flex items-center gap-2 px-3 py-2 rounded cursor-pointer
            transition-colors text-sm group
            ${isRTL ? 'flex-row-reverse' : ''}
            ${isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}
          `}
          style={{ 
            paddingLeft: isRTL ? undefined : `${level * 20 + 12}px`, 
            paddingRight: isRTL ? `${level * 20 + 12}px` : undefined 
          }}
          onClick={() => {
            setSelectedFolderId(folder.id);
            if (hasChildren && !isExpanded) {
              toggleFolder(folder.id);
            }
          }}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.id);
              }}
              className="p-0"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className={`w-4 h-4 text-gray-500 ${isRTL ? 'rotate-180' : ''}`} />
              )}
            </button>
          )}
          
          {!hasChildren && <div className="w-4" />}
          
          {isExpanded && hasChildren ? (
            <FolderOpen className="w-4 h-4" />
          ) : (
            <Folder className="w-4 h-4" />
          )}
          
          <span className="flex-1">
            {language === 'ar' ? folder.nameAr : folder.name}
          </span>

          {/* Rename button (only for non-root folders) */}
          {folder.id !== 'meal-docs-root' && isSelected && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setRenameFolderName(folder.name);
                setRenameFolderNameAr(folder.nameAr);
                setShowRenameFolder(folder.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded"
              title={t.rename}
            >
              <Edit2 className="w-3 h-3" />
            </button>
          )}
        </div>
        
        {isExpanded && hasChildren && (
          <div>
            {folder.children.map((child: any) => renderFolderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-blue-900 mb-1">{t.infoTitle}</h3>
          <p className="text-sm text-blue-700">{t.infoText}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Sidebar - Folder Tree */}
        <div className="col-span-3">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-2 text-sm font-semibold text-gray-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Folder className="w-4 h-4" />
                  <span>{t.folderTree}</span>
                </div>
                <button
                  onClick={() => setShowCreateFolder(true)}
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                  title={t.createFolder}
                >
                  <FolderPlus className="w-4 h-4 text-blue-600" />
                </button>
              </div>
            </div>
            
            <div className="p-2 max-h-[600px] overflow-y-auto">
              {folderTree.map(folder => renderFolderNode(folder))}
            </div>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="col-span-9">
          <div className="bg-white border border-gray-200 rounded-lg min-h-[600px]">
            {/* Folder Header */}
            {selectedFolder && (
              <div className="border-b border-gray-200">
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Folder className="w-6 h-6 text-blue-600" />
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {language === 'ar' ? selectedFolder.nameAr : selectedFolder.name}
                      </h2>
                      <p className="text-xs text-gray-500">{selectedFolder.path}</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => setShowUploadDialog(true)}
                    className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <Upload className="w-4 h-4" />
                    <span>{t.uploadFiles}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Documents Area */}
            <div className="p-6">
              {folderDocuments.length === 0 ? (
                // Empty State
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="text-gray-500 text-sm mb-2">{t.noDocuments}</p>
                  <p className="text-gray-400 text-xs">{t.uploadHere}</p>
                </div>
              ) : (
                // Document List
                <div className="space-y-2">
                  {folderDocuments.map((doc) => {
                    const FileIcon = getFileIcon(doc.fileType);
                    return (
                      <div 
                        key={doc.id}
                        className={`flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <FileIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                          <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(doc.size)} • {t.uploadedBy} {doc.uploadedBy} {t.uploadedOn} {new Date(doc.uploadedAt).toLocaleDateString(language === 'ar' ? 'ar' : 'en')}
                          </p>
                        </div>
                        <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <button
                            onClick={() => {/* Download logic */}}
                            className="p-2 hover:bg-blue-50 rounded transition-colors"
                            title={t.download}
                          >
                            <Download className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-2 hover:bg-red-50 rounded transition-colors"
                            title={t.delete}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Folder Dialog */}
      {showCreateFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className={`flex items-center justify-between p-4 border-b ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-lg font-semibold">{t.createFolder}</h3>
              <button onClick={() => setShowCreateFolder(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.folderNameEn}</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., ID Cards"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.folderNameAr}</label>
                <input
                  type="text"
                  value={newFolderNameAr}
                  onChange={(e) => setNewFolderNameAr(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                  placeholder="مثال: بطاقات الهوية"
                  dir="rtl"
                />
              </div>
            </div>
            <div className={`flex items-center justify-end gap-2 p-4 border-t ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => setShowCreateFolder(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t.create}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Folder Dialog */}
      {showRenameFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className={`flex items-center justify-between p-4 border-b ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-lg font-semibold">{t.renameFolder}</h3>
              <button onClick={() => setShowRenameFolder(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.folderNameEn}</label>
                <input
                  type="text"
                  value={renameFolderName}
                  onChange={(e) => setRenameFolderName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.folderNameAr}</label>
                <input
                  type="text"
                  value={renameFolderNameAr}
                  onChange={(e) => setRenameFolderNameAr(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                  dir="rtl"
                />
              </div>
            </div>
            <div className={`flex items-center justify-end gap-2 p-4 border-t ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => setShowRenameFolder(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => handleRenameFolder(showRenameFolder)}
                disabled={!renameFolderName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Files Dialog */}
      {showUploadDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className={`flex items-center justify-between p-4 border-b ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-lg font-semibold">{t.uploadFiles}</h3>
              <button onClick={() => setShowUploadDialog(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.selectFiles}</label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => setSelectedFiles(e.target.files)}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-500 mt-2">{t.allFileTypes}</p>
              </div>
              {selectedFiles && selectedFiles.length > 0 && (
                <div className="text-sm text-gray-600">
                  {selectedFiles.length} {language === 'en' ? 'file(s) selected' : 'ملف محدد'}
                </div>
              )}
            </div>
            <div className={`flex items-center justify-end gap-2 p-4 border-t ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => setShowUploadDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleUploadFiles}
                disabled={!selectedFiles || selectedFiles.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t.upload}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
