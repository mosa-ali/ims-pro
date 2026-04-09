import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/i18n/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';
import { parseCSVFile } from '@/utils/exportOpportunities';
import { downloadTemplate } from '@/utils/generateImportTemplate';
import { toast } from 'sonner';
import { Upload, AlertCircle, CheckCircle, Download } from 'lucide-react';

interface ImportOpportunitiesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (opportunities: any[]) => Promise<void>;
}

export function ImportOpportunitiesModal({
  open,
  onOpenChange,
  onImport,
}: ImportOpportunitiesModalProps) {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.name.endsWith('.csv')) {
      toast.error(t.opportunities?.importInvalidFormat || 'Invalid file format. Please use CSV.');
      return;
    }

    setFile(selectedFile);
    setErrors([]);

    try {
      const opportunities = await parseCSVFile(selectedFile);
      
      if (opportunities.length === 0) {
        setErrors(['No valid opportunities found in file']);
        return;
      }

      // Validate opportunities
      const validationErrors: string[] = [];
      opportunities.forEach((opp, index) => {
        if (!opp.donorName) validationErrors.push(`Row ${index + 2}: Donor name is required`);
        if (!opp.applicationDeadline) validationErrors.push(`Row ${index + 2}: Application deadline is required`);
      });

      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }

      setPreview(opportunities);
      toast.success(`${opportunities.length} ${t.opportunities?.opportunitiesFound || 'opportunities found'}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse file';
      setErrors([errorMessage]);
      toast.error(errorMessage);
    }
  };

  const handleImport = async () => {
    if (preview.length === 0) {
      toast.error(t.opportunities?.noOpportunitiesToImport || 'No opportunities to import');
      return;
    }

    setIsLoading(true);
    try {
      await onImport(preview);
      toast.success(`${preview.length} ${t.opportunities?.opportunitiesImported || 'opportunities imported'}`);
      onOpenChange(false);
      setFile(null);
      setPreview([]);
      setErrors([]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to import opportunities';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    try {
      downloadTemplate({ language: isRTL ? 'ar' : 'en', includeSampleData: true });
      toast.success(t.opportunities?.templateDownloaded || 'Template downloaded successfully');
    } catch (error) {
      toast.error(t.opportunities?.templateDownloadFailed || 'Failed to download template');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{t.opportunities?.importOpportunities || 'Import Opportunities'}</DialogTitle>
            <Button
              onClick={handleDownloadTemplate}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              {t.opportunities?.downloadTemplate || 'Download Template'}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-slate-400 transition">
            <label className="cursor-pointer">
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-slate-400" />
                <p className="text-sm font-medium text-slate-700">
                  {file?.name || (t.opportunities?.selectCSVFile || 'Select CSV file')}
                </p>
                <p className="text-xs text-slate-500">
                  {t.opportunities?.csvFileDescription || 'Drag and drop or click to select'}
                </p>
              </div>
            </label>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-2">
                    {t.opportunities?.validationErrors || 'Validation Errors'}
                  </h3>
                  <ul className="space-y-1">
                    {errors.map((error, index) => (
                      <li key={index} className="text-sm text-red-800">
                        • {error}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && errors.length === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900 mb-2">
                    {t.opportunities?.readyToImport || 'Ready to Import'}
                  </h3>
                  <p className="text-sm text-green-800 mb-3">
                    {preview.length} {t.opportunities?.opportunitiesReady || 'opportunities ready to import'}
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {preview.slice(0, 5).map((opp, index) => (
                      <div key={index} className="text-sm text-green-700 bg-white p-2 rounded">
                        <strong>{opp.donorName}</strong> - {opp.donorType}
                      </div>
                    ))}
                    {preview.length > 5 && (
                      <p className="text-sm text-green-700 italic">
                        +{preview.length - 5} {t.opportunities?.more || 'more'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setFile(null);
              setPreview([]);
              setErrors([]);
            }}
          >
            {t.opportunities?.cancel || 'Cancel'}
          </Button>
          <Button
            onClick={handleImport}
            disabled={preview.length === 0 || isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Importing...' : t.opportunities?.import || 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
