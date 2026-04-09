import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Upload, X, FileIcon, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface ProcurementDocumentUploadUIProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prId: string;
  procurementStatus: string;
  onUploadSuccess?: () => void;
}

interface FileWithProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export function ProcurementDocumentUploadUI({

  open,
  onOpenChange,
  prId,
  procurementStatus,
  onUploadSuccess,
}: ProcurementDocumentUploadUIProps) {
  const { language, isRTL } = useLanguage();
  const [filesWithProgress, setFilesWithProgress] = useState<FileWithProgress[]>([]);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.documentManagement.uploadDocument.useMutation();

  const translations = {
    en: {
      title: 'Upload Procurement Document',
      dragDrop: 'Drag and drop files here or click to browse',
      selectFiles: 'Select Files',
      description: 'Description (optional)',
      tags: 'Tags (comma-separated)',
      upload: 'Upload All',
      cancel: 'Cancel',
      uploading: 'Uploading...',
      fileSize: 'File size:',
      uploadSuccess: 'Document uploaded successfully',
      uploadError: 'Failed to upload document',
      selectFile: 'Please select at least one file',
      maxSize: 'File size must be less than 100MB',
      stage: 'Will be routed to stage:',
      currentStatus: 'Current PR Status:',
      autoRoute: 'Documents will be automatically routed to the correct procurement stage',
      uploadingFile: 'Uploading',
      of: 'of',
      files: 'files',
      remove: 'Remove',
      retrying: 'Retrying...',
      MB: 'MB',
    },
    ar: {
      title: 'تحميل مستند المشتريات',
      dragDrop: 'اسحب وأفلت الملفات هنا أو انقر للاستعراض',
      selectFiles: 'اختر الملفات',
      description: 'الوصف (اختياري)',
      tags: 'الوسوم (مفصولة بفواصل)',
      upload: 'تحميل الكل',
      cancel: 'إلغاء',
      uploading: 'جاري التحميل...',
      fileSize: 'حجم الملف:',
      uploadSuccess: 'تم تحميل المستند بنجاح',
      uploadError: 'فشل تحميل المستند',
      selectFile: 'يرجى اختيار ملف واحد على الأقل',
      maxSize: 'يجب أن يكون حجم الملف أقل من 100 ميجابايت',
      stage: 'سيتم توجيهه إلى المرحلة:',
      currentStatus: 'حالة الطلب الحالية:',
      autoRoute: 'سيتم توجيه المستندات تلقائياً إلى مرحلة المشتريات الصحيحة',
      uploadingFile: 'جاري التحميل',
      of: 'من',
      files: 'ملفات',
      remove: 'إزالة',
      retrying: 'إعادة المحاولة...',
      MB: 'ميجابايت',
    },
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  const stageMapping: Record<string, string> = {
    draft: '01_Purchase_Requests',
    submitted: '01_Purchase_Requests',
    validated_by_logistic: '01_Purchase_Requests',
    validated_by_finance: '01_Purchase_Requests',
    approved: '01_Purchase_Requests',
    rfqs: '02_RFQ_Tender_Documents',
    quotations_analysis: '04_Supplier_Quotations',
    tender_invitation: '02_RFQ_Tender_Documents',
    bids_analysis: '05_Bid_Evaluation',
    purchase_order: '08_Purchase_Orders',
    delivery: '10_Delivery_Notes',
    grn: '09_Goods_Receipt_Notes',
    payment: '12_Payments',
    completed: '13_Audit_Logs',
  };

  const currentStage = stageMapping[procurementStatus] || '01_Purchase_Requests';

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  };

  const addFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => {
      if (file.size > 100 * 1024 * 1024) {
        toast.error(`${file.name}: ${t.maxSize}`);
        return false;
      }
      return true;
    });

    const newFilesWithProgress: FileWithProgress[] = validFiles.map(file => ({
      file,
      progress: 0,
      status: 'pending',
    }));

    setFilesWithProgress(prev => [...prev, ...newFilesWithProgress]);
  };

  const removeFile = (index: number) => {
    setFilesWithProgress(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    addFiles(selectedFiles);
  };

  const handleUpload = async () => {
    if (filesWithProgress.length === 0) {
      toast.error(t.selectFile);
      return;
    }

    setIsUploading(true);
    let successCount = 0;

    try {
      for (let i = 0; i < filesWithProgress.length; i++) {
        const { file } = filesWithProgress[i];

        // Update status to uploading
        setFilesWithProgress(prev => {
          const updated = [...prev];
          updated[i] = { ...updated[i], status: 'uploading', progress: 0 };
          return updated;
        });

        try {
          const buffer = await file.arrayBuffer();
          
          // Simulate progress
          const progressInterval = setInterval(() => {
            setFilesWithProgress(prev => {
              const updated = [...prev];
              if (updated[i].progress < 90) {
                updated[i] = { ...updated[i], progress: updated[i].progress + Math.random() * 30 };
              }
              return updated;
            });
          }, 200);

          await uploadMutation.mutateAsync({
            prId,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            fileBuffer: new Uint8Array(buffer),
            documentType: 'purchase_request',
            description,
            tags: tags.split(',').map(t => t.trim()).filter(t => t),
          });

          clearInterval(progressInterval);

          // Update status to success
          setFilesWithProgress(prev => {
            const updated = [...prev];
            updated[i] = { ...updated[i], status: 'success', progress: 100 };
            return updated;
          });

          successCount++;
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          
          setFilesWithProgress(prev => {
            const updated = [...prev];
            updated[i] = {
              ...updated[i],
              status: 'error',
              error: error instanceof Error ? error.message : 'Upload failed',
            };
            return updated;
          });
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} ${t.uploadSuccess}`);
        
        // Clear successful uploads after 2 seconds
        setTimeout(() => {
          setFilesWithProgress(prev =>
            prev.filter(f => f.status !== 'success')
          );
          
          if (successCount === filesWithProgress.length) {
            setDescription('');
            setTags('');
            onOpenChange(false);
            onUploadSuccess?.();
          }
        }, 2000);
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Current Status Info */}
          <Card className="p-4 bg-amber-50 border-amber-200 sticky top-0">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900">
                  {t.currentStatus} <span className="font-bold capitalize">{procurementStatus.replace(/_/g, ' ')}</span>
                </p>
                <p className="text-sm font-medium text-amber-900 mt-1">
                  {t.stage} <span className="font-bold">{currentStage}</span>
                </p>
              </div>
            </div>
          </Card>

          {/* Auto-routing Notice */}
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-900">{t.autoRoute}</p>
              </div>
            </div>
          </Card>

          {/* Drag and Drop Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <Upload className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p className="text-sm font-medium text-gray-700">{t.dragDrop}</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
          </div>

          {/* File List */}
          {filesWithProgress.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                {filesWithProgress.length} {filesWithProgress.length === 1 ? 'file' : 'files'} selected
              </p>
              {filesWithProgress.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t.fileSize} {(item.file.size / 1024 / 1024).toFixed(2)} {t.MB}
                      </p>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center gap-2 ml-2">
                    {item.status === 'pending' && (
                      <span className="text-xs text-gray-500">Pending</span>
                    )}
                    {item.status === 'uploading' && (
                      <div className="flex items-center gap-1">
                        <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                        <span className="text-xs text-blue-600">{Math.round(item.progress)}%</span>
                      </div>
                    )}
                    {item.status === 'success' && (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    )}
                    {item.status === 'error' && (
                      <div className="flex items-center gap-1">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span className="text-xs text-red-600">Error</span>
                      </div>
                    )}

                    {/* Progress Bar */}
                    {item.status === 'uploading' && (
                      <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}

                    {/* Remove Button */}
                    {item.status !== 'uploading' && (
                      <button
                        onClick={() => removeFile(index)}
                        className="p-1 hover:bg-gray-200 rounded"
                        disabled={isUploading}
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.description}
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter document description..."
              className="resize-none"
              rows={3}
              disabled={isUploading}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.tags}
            </label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., urgent, confidential, approved"
              disabled={isUploading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
            {t.cancel}
          </Button>
          <Button
            onClick={handleUpload}
            disabled={isUploading || filesWithProgress.length === 0}
          >
            {isUploading ? t.uploading : t.upload}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
