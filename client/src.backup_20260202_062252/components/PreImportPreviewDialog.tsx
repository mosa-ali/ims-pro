import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, Download } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ValidationError {
  row: number;
  field: string;
  value: any;
  errorType: string;
  message: string;
  suggestedFix?: string;
  originalData: Record<string, any>;
}

interface PreviewRow {
  rowNumber: number;
  data: Record<string, any>;
  isValid: boolean;
  errors?: ValidationError[];
}

interface PreImportPreviewDialogProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  onConfirmImport: () => void;
  validRows: PreviewRow[];
  invalidRows: PreviewRow[];
  columns?: Array<{ key: string; label: string }>;
  config?: any;
  moduleName: string;
}

export function PreImportPreviewDialog({
  open,
  isOpen,
  onClose,
  onConfirmImport,
  validRows,
  invalidRows,
  columns,
  config,
  moduleName,
}: PreImportPreviewDialogProps) {
  // Support both old (isOpen, config) and new (open, columns) API
  const isDialogOpen = open ?? isOpen ?? false;
  const dialogColumns = columns || (config?.columns?.map((col: any) => ({ key: col.key, label: col.label })) ?? []);
  const safeValidRows = validRows || [];
  const safeInvalidRows = invalidRows || [];
  const totalRows = safeValidRows.length + safeInvalidRows.length;
  const validCount = safeValidRows.length;
  const invalidCount = safeInvalidRows.length;

  const handleDownloadErrors = () => {
    // Generate error report CSV
    const errorData = safeInvalidRows.flatMap(row => 
      row.errors?.map(error => ({
        Row: error.row,
        Field: error.field,
        Value: error.value,
        Error: error.message,
        'Suggested Fix': error.suggestedFix || '',
      })) || []
    );

    const csv = [
      Object.keys(errorData[0] || {}).join(','),
      ...errorData.map(row => Object.values(row).map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${moduleName}_Import_Errors_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-primary" />
            Import Preview - {moduleName}
          </DialogTitle>
          <DialogDescription>
            Review the data before importing. Only valid rows will be imported.
          </DialogDescription>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 my-4">
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground">Total Rows</div>
            <div className="text-2xl font-bold">{totalRows}</div>
          </div>
          <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
            <div className="text-sm text-green-700 dark:text-green-400 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              Valid (Will Import)
            </div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{validCount}</div>
          </div>
          <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950/20">
            <div className="text-sm text-red-700 dark:text-red-400 flex items-center gap-1">
              <XCircle className="w-4 h-4" />
              Invalid (Will Skip)
            </div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">{invalidCount}</div>
          </div>
        </div>

        {/* Tabs for Valid/Invalid Rows */}
        <Tabs defaultValue="valid" className="flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="valid" className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Valid Rows ({validCount})
            </TabsTrigger>
            <TabsTrigger value="invalid" className="flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Invalid Rows ({invalidCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="valid" className="mt-4">
            <ScrollArea className="h-[400px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Row</TableHead>
                    {dialogColumns.map(col => (
                      <TableHead key={col.key}>{col.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {safeValidRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={dialogColumns.length + 1} className="text-center text-muted-foreground">
                        No valid rows found
                      </TableCell>
                    </TableRow>
                  ) : (
                    safeValidRows.map(row => (
                      <TableRow key={row.rowNumber} className="bg-green-50/50 dark:bg-green-950/10">
                        <TableCell className="font-medium">{row.rowNumber}</TableCell>
                        {dialogColumns.map(col => (
                          <TableCell key={col.key}>
                            {row.data[col.key]?.toString() || '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="invalid" className="mt-4">
            <ScrollArea className="h-[400px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Row</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>Suggested Fix</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {safeInvalidRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No invalid rows found
                      </TableCell>
                    </TableRow>
                  ) : (
                    safeInvalidRows.flatMap(row =>
                      row.errors?.map((error, idx) => (
                        <TableRow key={`${row.rowNumber}-${idx}`} className="bg-red-50/50 dark:bg-red-950/10">
                          <TableCell className="font-medium">{error.row}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{error.field}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {error.value?.toString() || '(empty)'}
                          </TableCell>
                          <TableCell className="text-red-700 dark:text-red-400">
                            {error.message}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {error.suggestedFix || '-'}
                          </TableCell>
                        </TableRow>
                      )) || []
                    )
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex gap-2">
            {invalidCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleDownloadErrors}>
                <Download className="w-4 h-4 mr-2" />
                Download Error Report
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={onConfirmImport} 
              disabled={validCount === 0}
              className="bg-primary"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Import {validCount} Valid Row{validCount !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
