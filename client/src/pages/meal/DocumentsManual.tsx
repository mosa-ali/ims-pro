/**
 * ============================================================================
 * MEAL DOCUMENTS - MANUAL DOCUMENT MANAGEMENT
 * ============================================================================
 * 
 * PURPOSE: Manual document workspace for MEAL teams
 * 
 * KEY FEATURES:
 * - 100% Manual: NO auto-generated documents
 * - Upload any file type
 * - Full bilingual support (EN/AR with RTL)
 * - File preview and download
 * - Audit trail (who uploaded, when)
 * - Persistent storage via tRPC backend (not localStorage)
 * 
 * EXPLICITLY NOT ALLOWED:
 * ❌ Auto-generated documents
 * ❌ Auto-exports from Indicators/Surveys/Reports
 * ❌ Invisible document creation
 * 
 * ============================================================================
 */

import { useState } from 'react';
import { 
 Upload, 
 FileText,
 File,
 Image as ImageIcon,
 FileSpreadsheet,
 FileVideo,
 FileArchive,
 Download,
 Trash2,
 X,
 Loader2,
 AlertCircle
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function DocumentsManual() {
 const { t } = useTranslation();
 const { isRTL } = useLanguage();
 const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
 const [isUploading, setIsUploading] = useState(false);
 const [filterCategory, setFilterCategory] = useState<string>('all');

 // Fetch all MEAL documents from tRPC backend
 const { data: documents = [], isLoading, error, refetch } = trpc.meal.documents.getAll.useQuery({
   category: filterCategory !== 'all' ? (filterCategory as any) : undefined,
   search: undefined,
 });

 // Fetch statistics from tRPC backend
 const { data: stats } = trpc.meal.documents.getStatistics.useQuery({});

 // Create document mutation
 const createDocMutation = trpc.meal.documents.create.useMutation({
   onSuccess: () => {
     toast.success('Document uploaded successfully');
     setSelectedFiles(null);
     refetch();
   },
   onError: (error) => {
     toast.error(`Upload failed: ${error.message}`);
   }
 });

 // Delete document mutation
 const deleteDocMutation = trpc.meal.documents.delete.useMutation({
   onSuccess: () => {
     toast.success('Document deleted successfully');
     refetch();
   },
   onError: (error) => {
     toast.error(`Delete failed: ${error.message}`);
   }
 });

 const labels = {
   title: t.mealDocuments.mealDocuments,
   subtitle: t.mealDocuments.manualDocumentsSubtitle,
   uploadFiles: t.mealDocuments.uploadFiles,
   selectFiles: t.mealDocuments.selectFiles,
   upload: t.mealDocuments.upload,
   cancel: t.mealDocuments.cancel,
   noDocuments: t.mealDocuments.noDocumentsInThisFolder,
   uploadHere: t.mealDocuments.uploadFilesToGetStarted,
   uploadedBy: t.mealDocuments.uploadedBy,
   uploadedOn: t.mealDocuments.on,
   download: t.mealDocuments.download,
   delete: t.mealDocuments.delete,
   allFileTypes: t.mealDocuments.allFileTypesSupported,
   filterBy: 'Filter by Category',
   allCategories: 'All Categories',
   fileName: 'File Name',
   documentType: 'Type',
   category: 'Category',
   createdDate: 'Created Date',
   actions: 'Actions',
   loading: 'Loading documents...',
   error: 'Error loading documents',
   deleteConfirm: 'Are you sure you want to delete this document?',
 };

 // Handle file upload
 const handleUploadFiles = async () => {
   if (!selectedFiles || selectedFiles.length === 0) {
     toast.error('Please select files to upload');
     return;
   }

   setIsUploading(true);

   try {
     for (let i = 0; i < selectedFiles.length; i++) {
       const file = selectedFiles[i];
       
       // For now, we'll create documents with placeholder URLs
       // In production, upload to S3 first and get the URL
       const fileUrl = URL.createObjectURL(file);
       
       await createDocMutation.mutateAsync({
         documentCode: `DOC-${Date.now()}-${i}`,
         title: file.name,
         fileName: file.name,
         fileUrl: fileUrl,
         fileSize: file.size,
         mimeType: file.type,
         documentType: 'other',
         category: 'other',
         isSystemGenerated: false,
         isPublic: false,
       });
     }

     setSelectedFiles(null);
   } catch (err) {
     console.error('Upload error:', err);
   } finally {
     setIsUploading(false);
   }
 };

 // Handle document delete
 const handleDeleteDocument = async (docId: number) => {
   if (!confirm(labels.deleteConfirm)) return;

   try {
     await deleteDocMutation.mutateAsync({ id: docId });
   } catch (err) {
     console.error('Delete error:', err);
   }
 };

 // Get file icon
 const getFileIcon = (mimeType: string | null | undefined) => {
   if (!mimeType) return File;
   if (mimeType.includes('image')) return ImageIcon;
   if (mimeType.includes('pdf')) return FileText;
   if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FileSpreadsheet;
   if (mimeType.includes('video')) return FileVideo;
   if (mimeType.includes('zip') || mimeType.includes('archive')) return FileArchive;
   return File;
 };

 // Format file size
 const formatFileSize = (bytes: number | null | undefined) => {
   if (!bytes) return '-';
   if (bytes < 1024) return `${bytes} B`;
   if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
   return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
 };

 // Format date
 const formatDate = (date: Date | string | null | undefined) => {
   if (!date) return '-';
   try {
     return new Date(date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
       year: 'numeric',
       month: 'short',
       day: 'numeric'
     });
   } catch {
     return '-';
   }
 };

 const categories = ['indicators', 'surveys', 'reports', 'accountability', 'other'];

 if (error) {
   return (
     <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
       <BackButton href="/organization/meal" label={t.mealDocuments.mealDashboard} />
       <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
         <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
         <p className="text-sm text-red-900">{labels.error}</p>
       </div>
     </div>
   );
 }

 return (
   <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
     {/* Back Button */}
     <BackButton href="/organization/meal" label={t.mealDocuments.mealDashboard} />

     {/* Header */}
     <div>
       <h1 className="text-3xl font-bold text-gray-900">{labels.title}</h1>
       <p className="text-base text-gray-600 mt-2">{labels.subtitle}</p>
     </div>

     {/* Statistics Cards */}
     <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
       <div className="bg-white rounded-lg border border-gray-200 p-4">
         <div className="flex items-center gap-3">
           <div className="p-2 bg-blue-100 rounded-lg">
             <FileText className="w-5 h-5 text-blue-600" />
           </div>
           <div>
             <p className="text-xs text-gray-500">Total Documents</p>
             <p className="text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
           </div>
         </div>
       </div>

       <div className="bg-white rounded-lg border border-gray-200 p-4">
         <div className="flex items-center gap-3">
           <div className="p-2 bg-purple-100 rounded-lg">
             <FileText className="w-5 h-5 text-purple-600" />
           </div>
           <div>
             <p className="text-xs text-gray-500">Reports</p>
             <p className="text-2xl font-bold text-gray-900">{stats?.byType?.reports || 0}</p>
           </div>
         </div>
       </div>

       <div className="bg-white rounded-lg border border-gray-200 p-4">
         <div className="flex items-center gap-3">
           <div className="p-2 bg-green-100 rounded-lg">
             <FileText className="w-5 h-5 text-green-600" />
           </div>
           <div>
             <p className="text-xs text-gray-500">Assessments</p>
             <p className="text-2xl font-bold text-gray-900">{stats?.byType?.assessments || 0}</p>
           </div>
         </div>
       </div>

       <div className="bg-white rounded-lg border border-gray-200 p-4">
         <div className="flex items-center gap-3">
           <div className="p-2 bg-orange-100 rounded-lg">
             <FileText className="w-5 h-5 text-orange-600" />
           </div>
           <div>
             <p className="text-xs text-gray-500">Tools</p>
             <p className="text-2xl font-bold text-gray-900">{stats?.byType?.tools || 0}</p>
           </div>
         </div>
       </div>
     </div>

     {/* Upload Section */}
     <div className="bg-white rounded-lg border border-gray-200 p-6">
       <div className="flex items-center justify-between mb-4">
         <h2 className="text-lg font-semibold text-gray-900">{labels.uploadFiles}</h2>
       </div>

       <div className="space-y-4">
         <div>
           <label className="block text-sm font-medium text-gray-700 mb-2">{labels.selectFiles}</label>
           <input
             type="file"
             multiple
             onChange={(e) => setSelectedFiles(e.target.files)}
             className="w-full text-sm text-gray-500 file:me-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
           />
           <p className="text-xs text-gray-500 mt-2">{labels.allFileTypes}</p>
         </div>

         {selectedFiles && selectedFiles.length > 0 && (
           <div className="text-sm text-gray-600">
             {selectedFiles.length} files selected
           </div>
         )}

         <div className="flex items-center justify-end gap-2">
           <Button
             variant="outline"
             onClick={() => setSelectedFiles(null)}
             disabled={isUploading}
           >
             {labels.cancel}
           </Button>
           <Button
             onClick={handleUploadFiles}
             disabled={!selectedFiles || selectedFiles.length === 0 || isUploading}
             className="flex items-center gap-2"
           >
             {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
             {labels.upload}
           </Button>
         </div>
       </div>
     </div>

     {/* Filter Section */}
     <div className="bg-white rounded-lg border border-gray-200 p-4">
       <div className="flex items-center gap-3">
         <label className="text-sm font-medium text-gray-700">{labels.filterBy}</label>
         <select
           value={filterCategory}
           onChange={(e) => setFilterCategory(e.target.value)}
           className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
         >
           <option value="all">{labels.allCategories}</option>
           {categories.map(cat => (
             <option key={cat} value={cat}>{cat}</option>
           ))}
         </select>
       </div>
     </div>

     {/* Documents Table */}
     <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
       {isLoading ? (
         <div className="flex items-center justify-center p-8">
           <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
           <span className="ms-2 text-gray-600">{labels.loading}</span>
         </div>
       ) : documents.length === 0 ? (
         <div className="p-8 text-center">
           <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
           <p className="text-gray-500">{labels.noDocuments}</p>
           <p className="text-sm text-gray-400 mt-1">{labels.uploadHere}</p>
         </div>
       ) : (
         <div className="overflow-x-auto">
           <table className="w-full">
             <thead className="bg-gray-50 border-b border-gray-200">
               <tr>
                 <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start">{labels.fileName}</th>
                 <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start">{labels.documentType}</th>
                 <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start">{labels.category}</th>
                 <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start">{labels.createdDate}</th>
                 <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start">{labels.actions}</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-200">
               {documents.map(doc => {
                 const FileIcon = getFileIcon(doc.mimeType);
                 return (
                   <tr key={doc.id} className="hover:bg-gray-50">
                     <td className="px-4 py-3 text-sm">
                       <div className="flex items-center gap-2">
                         <FileIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                         <span className="text-gray-900 truncate">{doc.fileName || doc.title}</span>
                       </div>
                     </td>
                     <td className="px-4 py-3 text-sm">
                       <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                         {doc.documentType}
                       </span>
                     </td>
                     <td className="px-4 py-3 text-sm text-gray-500">
                       {doc.category}
                     </td>
                     <td className="px-4 py-3 text-sm text-gray-500">
                       {formatDate(doc.createdAt)}
                     </td>
                     <td className="px-4 py-3 text-sm">
                       <div className="flex items-center gap-1">
                         {doc.fileUrl && (
                           <a
                             href={doc.fileUrl}
                             download={doc.fileName || doc.title}
                             className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                             title={labels.download}
                           >
                             <Download className="w-4 h-4" />
                           </a>
                         )}
                         <button
                           onClick={() => handleDeleteDocument(doc.id)}
                           disabled={deleteDocMutation.isPending}
                           className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                           title={labels.delete}
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                       </div>
                     </td>
                   </tr>
                 );
               })}
             </tbody>
           </table>
         </div>
       )}
     </div>
   </div>
 );
}
