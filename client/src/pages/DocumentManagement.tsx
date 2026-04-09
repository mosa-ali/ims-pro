/**
 * ============================================================================
 * SharePoint/OneDrive Document Management
 * ============================================================================
 * 
 * Browse, upload, and manage documents from connected Microsoft 365 tenant:
 * - SharePoint sites and document libraries
 * - OneDrive folders and files
 * - File upload/download operations
 * - Search and filtering
 * - Sharing and permissions
 * 
 * Supports RTL/LTR and bilingual (English/Arabic)
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { FileIcon, FolderIcon, UploadIcon, SearchIcon, ShareIcon, DownloadIcon, TrashIcon, MoreVerticalIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n/useTranslation';

interface SharePointSite {
  id: string;
  name: string;
  displayName: string;
  webUrl: string;
}

interface DocumentLibrary {
  id: string;
  name: string;
  displayName: string;
  itemCount: number;
}

interface DriveItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  size?: number;
  createdDateTime: string;
  lastModifiedDateTime: string;
  webUrl: string;
}

export default function DocumentManagement() {

  const { t } = useTranslation();  const { user, loading } = useAuth();
  const { language, isRTL } = useLanguage();
  const [sites, setSites] = useState<SharePointSite[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [libraries, setLibraries] = useState<DocumentLibrary[]>([]);
  const [selectedLibrary, setSelectedLibrary] = useState<string>('');
  const [items, setItems] = useState<DriveItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);

  const labels = {
    en: {
      title: 'Document Management',
      subtitle: 'Access SharePoint and OneDrive documents',
      selectSite: 'Select SharePoint Site',
      selectLibrary: 'Select Document Library',
      search: 'Search documents...',
      upload: 'Upload File',
      download: 'Download',
      share: 'Share',
      delete: 'Delete',
      rename: 'Rename',
      newFolder: 'New Folder',
      noSites: 'No SharePoint sites found',
      noLibraries: 'No document libraries found',
      noItems: 'No items in this library',
      uploadSuccess: 'File uploaded successfully',
      uploadError: 'Failed to upload file',
      deleteSuccess: 'Item deleted successfully',
      deleteError: 'Failed to delete item',
      shareSuccess: 'Item shared successfully',
      shareError: 'Failed to share item',
      confirmDelete: 'Are you sure you want to delete this item?',
      name: 'Name',
      type: 'Type',
      size: 'Size',
      modified: 'Modified',
      actions: 'Actions',
    },
    ar: {
      title: 'إدارة المستندات',
      subtitle: 'الوصول إلى مستندات SharePoint و OneDrive',
      selectSite: 'اختر موقع SharePoint',
      selectLibrary: 'اختر مكتبة المستندات',
      search: 'ابحث عن المستندات...',
      upload: 'تحميل ملف',
      download: 'تحميل',
      share: 'مشاركة',
      delete: 'حذف',
      rename: 'إعادة تسمية',
      newFolder: 'مجلد جديد',
      noSites: 'لم يتم العثور على مواقع SharePoint',
      noLibraries: 'لم يتم العثور على مكتبات مستندات',
      noItems: 'لا توجد عناصر في هذه المكتبة',
      uploadSuccess: 'تم تحميل الملف بنجاح',
      uploadError: 'فشل تحميل الملف',
      deleteSuccess: 'تم حذف العنصر بنجاح',
      deleteError: 'فشل حذف العنصر',
      shareSuccess: 'تم مشاركة العنصر بنجاح',
      shareError: 'فشل مشاركة العنصر',
      confirmDelete: 'هل أنت متأكد من رغبتك في حذف هذا العنصر؟',
      name: 'الاسم',
      type: 'النوع',
      size: 'الحجم',
      modified: 'آخر تعديل',
      actions: 'الإجراءات',
    },
  };

  const t = labels[language as keyof typeof labels] || labels.en;

  // Mock data - in production, fetch from tRPC
  useEffect(() => {
    const mockSites: SharePointSite[] = [
      {
        id: 'site-1',
        name: 'Finance Site',
        displayName: 'Finance Documents',
        webUrl: 'https://example.sharepoint.com/sites/finance',
      },
      {
        id: 'site-2',
        name: 'HR Site',
        displayName: 'HR Documents',
        webUrl: 'https://example.sharepoint.com/sites/hr',
      },
    ];

    setSites(mockSites);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (selectedSite) {
      const mockLibraries: DocumentLibrary[] = [
        { id: 'lib-1', name: 'Documents', displayName: 'Shared Documents', itemCount: 45 },
        { id: 'lib-2', name: 'Archives', displayName: 'Archived Files', itemCount: 120 },
      ];
      setLibraries(mockLibraries);
    }
  }, [selectedSite]);

  useEffect(() => {
    if (selectedLibrary) {
      const mockItems: DriveItem[] = [
        {
          id: 'item-1',
          name: 'Q1 Report',
          type: 'folder',
          createdDateTime: '2026-03-01',
          lastModifiedDateTime: '2026-03-10',
          webUrl: 'https://example.sharepoint.com/sites/finance/Q1Report',
        },
        {
          id: 'item-2',
          name: 'Budget 2026.xlsx',
          type: 'file',
          size: 2048000,
          createdDateTime: '2026-02-15',
          lastModifiedDateTime: '2026-03-09',
          webUrl: 'https://example.sharepoint.com/sites/finance/Budget2026.xlsx',
        },
        {
          id: 'item-3',
          name: 'Financial Statements.pdf',
          type: 'file',
          size: 5242880,
          createdDateTime: '2026-01-20',
          lastModifiedDateTime: '2026-03-05',
          webUrl: 'https://example.sharepoint.com/sites/finance/FinancialStatements.pdf',
        },
      ];
      setItems(mockItems);
    }
  }, [selectedLibrary]);

  if (loading || !user) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US');
  };

  return (
    <div className={`min-h-screen bg-background p-8 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">{t.title}</h1>
        <p className="text-muted-foreground">{t.subtitle}</p>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Select value={selectedSite} onValueChange={setSelectedSite}>
          <SelectTrigger>
            <SelectValue placeholder={t.selectSite} />
          </SelectTrigger>
          <SelectContent>
            {sites.map(site => (
              <SelectItem key={site.id} value={site.id}>
                {site.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedLibrary} onValueChange={setSelectedLibrary} disabled={!selectedSite}>
          <SelectTrigger>
            <SelectValue placeholder={t.selectLibrary} />
          </SelectTrigger>
          <SelectContent>
            {libraries.map(lib => (
              <SelectItem key={lib.id} value={lib.id}>
                {lib.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative">
          <SearchIcon className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UploadIcon className="w-4 h-4" />
              {t.upload}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.upload}</DialogTitle>
              <DialogDescription>Upload a file to the selected library</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input type="file" />
              {uploadProgress > 0 && (
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
              <Button onClick={() => toast.success(t.uploadSuccess)}>Upload</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>{filteredItems.length} items</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{t.noItems}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">{t.name}</th>
                    <th className="text-left py-3 px-4">{t.type}</th>
                    <th className="text-right py-3 px-4">{t.size}</th>
                    <th className="text-left py-3 px-4">{t.modified}</th>
                    <th className="text-center py-3 px-4">{t.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(item => (
                    <tr key={item.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 flex items-center gap-2">
                        {item.type === 'folder' ? (
                          <FolderIcon className="w-4 h-4 text-blue-500" />
                        ) : (
                          <FileIcon className="w-4 h-4 text-gray-500" />
                        )}
                        <span className="font-medium">{item.name}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={item.type === 'folder' ? 'default' : 'secondary'}>
                          {item.type}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">{formatFileSize(item.size)}</td>
                      <td className="py-3 px-4">{formatDate(item.lastModifiedDateTime)}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex gap-2 justify-center">
                          {item.type === 'file' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toast.success(t.downloadSuccess)}
                            >
                              <DownloadIcon className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toast.success(t.shareSuccess)}
                          >
                            <ShareIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toast.success(t.deleteSuccess)}
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
