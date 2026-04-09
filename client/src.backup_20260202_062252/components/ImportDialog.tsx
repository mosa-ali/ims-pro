import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ImportError {
  row: number;
  field?: string;
  message: string;
}

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onImport: (data: any[]) => Promise<{ success: boolean; errors?: ImportError[] }>;
  parseExcel: (file: File) => Promise<any[]>;
  previewColumns: { key: string; label: string }[];
}

export function ImportDialog({
  open,
  onOpenChange,
  title,
  description,
  onImport,
  parseExcel,
  previewColumns,
}: ImportDialogProps) {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      setErrors([{ row: 0, message: t('common.invalidFileType') || 'Please select an Excel file (.xlsx or .xls)' }]);
      return;
    }

    setFile(selectedFile);
    setErrors([]);
    setShowPreview(false);

    try {
      const data = await parseExcel(selectedFile);
      setPreviewData(data);
      setShowPreview(true);
    } catch (error: any) {
      setErrors([{ row: 0, message: error.message || t('common.parseError') || 'Failed to parse Excel file' }]);
    }
  };

  const handleImport = async () => {
    if (!previewData.length) return;

    setIsProcessing(true);
    setErrors([]);

    try {
      const result = await onImport(previewData);
      
      if (result.success) {
        // Reset and close on success
        setFile(null);
        setPreviewData([]);
        setShowPreview(false);
        setErrors([]);
        onOpenChange(false);
      } else if (result.errors) {
        setErrors(result.errors);
      }
    } catch (error: any) {
      setErrors([{ row: 0, message: error.message || t('common.importError') || 'Import failed' }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreviewData([]);
    setShowPreview(false);
    setErrors([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Upload */}
          <div className="grid gap-2">
            <Label htmlFor="file">{t('common.selectFile') || 'Select Excel File'}</Label>
            <Input
              id="file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={isProcessing}
            />
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {errors.map((error, idx) => (
                    <div key={idx}>
                      {error.row > 0 && `Row ${error.row}: `}
                      {error.field && `${error.field} - `}
                      {error.message}
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Preview Table */}
          {showPreview && previewData.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>{t('common.previewRecords') || 'Preview'}: {previewData.length} {t('common.records') || 'records'}</span>
              </div>
              <div className="border rounded-md max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      {previewColumns.map((col) => (
                        <TableHead key={col.key}>{col.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.slice(0, 10).map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{idx + 1}</TableCell>
                        {previewColumns.map((col) => (
                          <TableCell key={col.key}>{row[col.key] || '-'}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {previewData.length > 10 && (
                  <div className="p-2 text-center text-sm text-muted-foreground border-t">
                    {t('common.showingFirst') || 'Showing first'} 10 {t('common.of') || 'of'} {previewData.length} {t('common.records') || 'records'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            {t('common.cancel') || 'Cancel'}
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!showPreview || previewData.length === 0 || isProcessing}
          >
            {isProcessing ? (
              <>{t('common.importing') || 'Importing'}...</>
            ) : (
              <><Upload className="mr-2 h-4 w-4" />{t('common.import') || 'Import'}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
