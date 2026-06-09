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
 * Uses tRPC backend for persistent storage (not localStorage)
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
 Loader2
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export function HRDocuments() {
 const { t } = useTranslation();
 const { isRTL } = useLanguage();
 const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
 const [searchQuery, setSearchQuery] = useState('');
 const [filterType, setFilterType] = useState<string>('all');

 // Fetch all HR documents from tRPC backend
 const { data: documents = [], isLoading, error } = trpc.hr.documents.getAll.useQuery({
   search: searchQuery || undefined,
   documentType: filterType !== 'all' ? (filterType as any) : undefined,
   limit: 1000,
   offset: 0,
 });

 // Fetch statistics from tRPC backend
 const { data: stats } = trpc.hr.documents.getStatistics.useQuery({});

 const labels = {
   title: t.hr.hrDocuments,
   subtitle: t.hr.centralArchiveForAllHrDocumentation,
   back: t.hr.overview,
   
   search: t.hr.searchDocuments,
   allFolders: t.hr.allFolders,
   folders: t.hr.folders,
   documents: t.hr.documents,
   
   staffId: t.hr.staffId,
   staffName: t.hr.staffName,
   fileName: t.hr.fileName,
   documentType: t.hr.documentType,
   sourceModule: t.hr.sourceModule,
   createdDate: t.hr.createdDate,
   createdBy: t.hr.createdBy,
   actions: t.hr.actions,
   
   view: t.hr.view,
   download: t.hr.download,
   print: t.hr.print,
   locked: t.hr.locked,
   unlocked: t.hr.unlocked,
   
   filterBy: t.hr.filterByType,
   allTypes: t.hr.allTypes,
   
   totalDocuments: t.hr.totalDocuments,
   lockedDocuments: t.hr.lockedDocuments,
   
   noDocuments: t.hr.noDocumentsFound,
   readOnlyNote: t.hr.thisIsAReadonlyArchiveDocuments,
   loading: 'Loading documents...',
   error: 'Error loading documents'
 };

 // Extract unique categories from documents for folder structure
 const folders = Array.from(new Set(documents.map(doc => doc.category).filter(Boolean)))
   .map((category, idx) => ({
     folderId: `F${idx}`,
     folderName: category || 'Uncategorized',
     displayOrder: idx,
     documentCount: documents.filter(doc => doc.category === category).length
   }));

 const getDisplayedDocuments = () => {
   let filtered = documents;
   
   // Filter by folder/category
   if (selectedFolder) {
     filtered = filtered.filter(doc => doc.category === selectedFolder);
   }
   
   // Filter by type
   if (filterType !== 'all') {
     filtered = filtered.filter(doc => doc.documentType === filterType);
   }
   
   return filtered;
 };

 const handleView = (doc: any) => {
   if (doc.fileUrl) {
     window.open(doc.fileUrl, '_blank');
   } else {
     toast.info('Document file not available');
   }
 };

 const handleDownload = (doc: any) => {
   if (doc.fileUrl) {
     const link = document.createElement('a');
     link.href = doc.fileUrl;
     link.download = doc.documentName || 'document';
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
     toast.success('Download started');
   } else {
     toast.error('Document file not available');
   }
 };

 const handlePrint = (doc: any) => {
   if (doc.fileUrl) {
     window.print();
     toast.success('Print dialog opened');
   } else {
     toast.error('Document file not available');
   }
 };

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

 const displayedDocs = getDisplayedDocuments();
 
 const documentTypes = ['policy', 'template', 'form', 'contract', 'certificate', 'id_document', 'other'];

 if (error) {
   return (
     <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
       <BackButton href="/organization/hr" label={t.hr.hrDashboard} />
       <div className="bg-red-50 border border-red-200 rounded-lg p-4">
         <p className="text-sm text-red-900">{labels.error}</p>
       </div>
     </div>
   );
 }

 return (
   <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
     {/* Back Button */}
     <BackButton href="/organization/hr" label={t.hr.hrDashboard} />

     {/* Header */}
     <div>
       <h1 className="text-3xl font-bold text-gray-900">{labels.title}</h1>
       <p className="text-base text-gray-600 mt-2">{labels.subtitle}</p>
     </div>

     {/* Read-Only Note */}
     <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
       <p className="text-sm text-blue-900">{labels.readOnlyNote}</p>
     </div>

     {/* Statistics Cards */}
     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
       <div className="bg-white rounded-lg border border-gray-200 p-4">
         <div className="flex items-center gap-3">
           <div className="p-2 bg-blue-100 rounded-lg">
             <FileText className="w-5 h-5 text-blue-600" />
           </div>
           <div>
             <p className="text-xs text-gray-500">{labels.totalDocuments}</p>
             <p className="text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
           </div>
         </div>
       </div>
       
       <div className="bg-white rounded-lg border border-gray-200 p-4">
         <div className="flex items-center gap-3">
           <div className="p-2 bg-amber-100 rounded-lg">
             <Lock className="w-5 h-5 text-amber-600" />
           </div>
           <div>
             <p className="text-xs text-gray-500">{labels.lockedDocuments}</p>
             <p className="text-2xl font-bold text-gray-900">0</p>
           </div>
         </div>
       </div>
       
       <div className="bg-white rounded-lg border border-gray-200 p-4">
         <div className="flex items-center gap-3">
           <div className="p-2 bg-green-100 rounded-lg">
             <FolderOpen className="w-5 h-5 text-green-600" />
           </div>
           <div>
             <p className="text-xs text-gray-500">{labels.folders}</p>
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
           <h3 className="text-sm font-bold text-gray-900 mb-4">{labels.folders}</h3>
           
           <div className="space-y-1">
             <button
               onClick={() => setSelectedFolder(null)}
               className={`w-full text-start px-3 py-2 rounded-lg text-sm transition-colors ${
                 selectedFolder === null ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
               }`}
             >
               <div className="flex items-center justify-between">
                 <span>{labels.allFolders}</span>
                 <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                   {documents.length}
                 </span>
               </div>
             </button>
             
             {folders.map(folder => (
               <button
                 key={folder.folderId}
                 onClick={() => setSelectedFolder(folder.folderName)}
                 className={`w-full text-start px-3 py-2 rounded-lg text-sm transition-colors ${
                   selectedFolder === folder.folderName ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
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
                 <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                 <input
                   type="text"
                   placeholder={labels.search}
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   className="w-full ps-10 pe-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                 />
               </div>
               
               <select
                 value={filterType}
                 onChange={(e) => setFilterType(e.target.value)}
                 className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
               >
                 <option value="all">{labels.allTypes}</option>
                 {documentTypes.map(type => (
                   <option key={type} value={type}>{type}</option>
                 ))}
               </select>
             </div>
           </div>

           {/* Documents Table */}
           <div className="overflow-x-auto">
             {isLoading ? (
               <div className="flex items-center justify-center p-8">
                 <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                 <span className="ms-2 text-gray-600">{labels.loading}</span>
               </div>
             ) : (
               <table className="w-full">
                 <thead className="bg-gray-50 border-b border-gray-200">
                   <tr>
                     <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start">{labels.fileName}</th>
                     <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start">{labels.documentType}</th>
                     <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start">{labels.createdDate}</th>
                     <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-start">{labels.actions}</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-200">
                   {displayedDocs.length === 0 ? (
                     <tr>
                       <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                         {labels.noDocuments}
                       </td>
                     </tr>
                   ) : (
                     displayedDocs.map(doc => (
                       <tr key={doc.id} className="hover:bg-gray-50">
                         <td className="px-4 py-3 text-sm">
                           <div className="flex items-center gap-2">
                             <FileText className="w-4 h-4 text-gray-400" />
                             <span className="text-gray-900">{doc.documentName}</span>
                           </div>
                         </td>
                         <td className="px-4 py-3 text-sm">
                           <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                             {doc.documentType}
                           </span>
                         </td>
                         <td className="px-4 py-3 text-sm text-gray-500">
                           {formatDate(doc.createdAt)}
                         </td>
                         <td className="px-4 py-3 text-sm">
                           <div className="flex items-center gap-1">
                             <button
                               onClick={() => handleView(doc)}
                               className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                               title={labels.view}
                             >
                               <Eye className="w-4 h-4" />
                             </button>
                             <button
                               onClick={() => handleDownload(doc)}
                               className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                               title={labels.download}
                             >
                               <Download className="w-4 h-4" />
                             </button>
                             <button
                               onClick={() => handlePrint(doc)}
                               className="p-1.5 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                               title={labels.print}
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
             )}
           </div>
         </div>
       </div>
     </div>
   </div>
 );
}
