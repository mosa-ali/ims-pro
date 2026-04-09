import { AlertCircle, CheckCircle2, Download, Upload, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface ImportError {
  row: number;
  field: string;
  message: string;
  suggestedFix?: string;
  data?: any;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: ImportError[];
}

interface ImportResultPanelProps {
  open: boolean;
  onClose: () => void;
  result: ImportResult | null;
  onDownloadErrorReport?: () => void;
  onReupload?: () => void;
  onSendReportToAdmin?: () => void;
  isRTL?: boolean;
}

export function ImportResultPanel({
  open,
  onClose,
  result,
  onDownloadErrorReport,
  onReupload,
  onSendReportToAdmin,
  isRTL = false,
}: ImportResultPanelProps) {
  if (!result) return null;

  const hasErrors = result.errors.length > 0;
  const totalProcessed = result.imported + result.skipped + result.errors.length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasErrors ? (
              <AlertCircle className="w-5 h-5 text-destructive" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            )}
            {isRTL ? "نتيجة الاستيراد" : "Import Results"}
          </DialogTitle>
          <DialogDescription>
            {isRTL
              ? `تمت معالجة ${totalProcessed} صف(صفوف)`
              : `Processed ${totalProcessed} row(s)`}
          </DialogDescription>
        </DialogHeader>

        {/* Summary Section */}
        <div className="grid grid-cols-3 gap-4 py-4">
          <div className="flex flex-col items-center p-4 border rounded-lg bg-green-50 dark:bg-green-950">
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              {result.imported}
            </div>
            <div className="text-sm text-muted-foreground">
              {isRTL ? "مستورد" : "Imported"}
            </div>
          </div>

          <div className="flex flex-col items-center p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950">
            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
              {result.skipped}
            </div>
            <div className="text-sm text-muted-foreground">
              {isRTL ? "متخطى" : "Skipped"}
            </div>
          </div>

          <div className="flex flex-col items-center p-4 border rounded-lg bg-red-50 dark:bg-red-950">
            <div className="text-2xl font-bold text-destructive">
              {result.errors.length}
            </div>
            <div className="text-sm text-muted-foreground">
              {isRTL ? "أخطاء" : "Errors"}
            </div>
          </div>
        </div>

        {/* Error Details Table */}
        {hasErrors && (
          <div className="flex-1 min-h-0">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
              {isRTL ? "تفاصيل الأخطاء" : "Error Details"}
            </h4>
            <ScrollArea className="h-[300px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">
                      {isRTL ? "الصف" : "Row"}
                    </TableHead>
                    <TableHead className="w-[150px]">
                      {isRTL ? "الحقل" : "Field"}
                    </TableHead>
                    <TableHead>{isRTL ? "الرسالة" : "Message"}</TableHead>
                    <TableHead>{isRTL ? "الإصلاح المقترح" : "Suggested Fix"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.errors.map((error, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">
                        <Badge variant="destructive">{error.row}</Badge>
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {error.field}
                      </TableCell>
                      <TableCell className="text-sm text-destructive">
                        {error.message}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {error.suggestedFix || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}

        {/* Success Message */}
        {!hasErrors && result.imported > 0 && (
          <div className="flex items-center gap-2 p-4 border rounded-lg bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">
              {isRTL
                ? `تم استيراد جميع السجلات بنجاح!`
                : `All records imported successfully!`}
            </span>
          </div>
        )}

        <DialogFooter className="flex-row justify-between gap-2">
          <div className="flex gap-2">
            {hasErrors && onDownloadErrorReport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDownloadErrorReport}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                {isRTL ? "تنزيل تقرير الأخطاء" : "Download Error Report"}
              </Button>
            )}
            {hasErrors && onSendReportToAdmin && (
              <Button
                variant="default"
                size="sm"
                onClick={onSendReportToAdmin}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-4 h-4" />
                {isRTL ? "إرسال تقرير إلى مسؤول المنصة" : "Send Report to Platform Admin"}
              </Button>
            )}
            {hasErrors && onReupload && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReupload}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                {isRTL ? "إعادة التحميل" : "Re-upload"}
              </Button>
            )}
          </div>
          <Button onClick={onClose} size="sm">
            <X className="w-4 h-4 mr-2" />
            {isRTL ? "إغلاق" : "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
