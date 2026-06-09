import { useState, useRef, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import {
  Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle,
  TrendingUp, TrendingDown, ClipboardCheck, FileText, Loader2, ScanLine, Plus
} from "lucide-react";
import BarcodeScanner, { type ScannedItem } from "@/components/BarcodeScanner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/i18n/useTranslation";
import { BackButton } from "@/components/BackButton";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-300",
  in_progress: "bg-blue-100 text-blue-700 border-blue-300",
  reviewed: "bg-orange-100 text-orange-700 border-orange-300",
  adjustments_generated: "bg-purple-100 text-purple-700 border-purple-300",
  completed: "bg-green-100 text-green-700 border-green-300",
};

export default function PhysicalCountForm() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const isNew = params.id === "new";
  const sessionId = isNew ? null : Number(params.id);

  const statusLabels: Record<string, string> = {
    draft: isRTL ? "مسودة" : "Draft",
    in_progress: isRTL ? "قيد التنفيذ" : "In Progress",
    reviewed: isRTL ? "تمت المراجعة" : "Reviewed",
    adjustments_generated: isRTL ? "تم إنشاء التسويات" : "Adj. Generated",
    completed: isRTL ? "مكتمل" : "Completed",
  };

  // New session form state
  const [warehouse, setWarehouse] = useState("");
  const [countedBy, setCountedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(isNew);

  // File upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const utils = trpc.useUtils();

  // Queries
  const { data: session, isLoading: sessionLoading } = trpc.logistics.stockMgmt.physicalCount.getDetail.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId }
  );

  const { data: templateData } = trpc.logistics.stockMgmt.physicalCount.getTemplate.useQuery(
    { warehouse: warehouse || undefined },
    { enabled: true }
  );

  // Mutations
  const createSession = trpc.logistics.stockMgmt.physicalCount.create.useMutation({
    onSuccess: (data: any) => {
      toast.success(isRTL ? `تم إنشاء جلسة الجرد ${data.sessionNumber}` : `Count session ${data.sessionNumber} created`);
      setShowCreateDialog(false);
      setLocation(`/organization/logistics/stock/physical-count/${data.id}`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const uploadData = trpc.logistics.stockMgmt.physicalCount.uploadCountData.useMutation({
    onSuccess: (data: any) => {
      toast.success(isRTL
        ? `تم رفع ${data.totalItems} صنف. تم العثور على ${data.discrepancyCount} فرق.`
        : `Uploaded ${data.totalItems} items. ${data.discrepancyCount} discrepancies found.`);
      utils.logistics.stockMgmt.physicalCount.getDetail.invalidate({ sessionId: sessionId! });
      setUploading(false);
    },
    onError: (err: any) => { toast.error(err.message); setUploading(false); },
  });

  const reviewSession = trpc.logistics.stockMgmt.physicalCount.review.useMutation({
    onSuccess: () => {
      toast.success(isRTL ? "تم تحديد الجلسة كمراجعة" : "Session marked as reviewed");
      utils.logistics.stockMgmt.physicalCount.getDetail.invalidate({ sessionId: sessionId! });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const generateAdj = trpc.logistics.stockMgmt.physicalCount.generateAdjustment.useMutation({
    onSuccess: (data: any) => {
      toast.success(isRTL
        ? `تم إنشاء التسوية ${data.adjustmentNumber} بعدد ${data.lineCount} سطر`
        : `Adjustment ${data.adjustmentNumber} generated with ${data.lineCount} lines`);
      utils.logistics.stockMgmt.physicalCount.getDetail.invalidate({ sessionId: sessionId! });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Barcode scanner lookup
  const scanLookupUtils = trpc.useUtils();
  const lookupBatch = useCallback(async (code: string) => {
    try {
      const result = await scanLookupUtils.logistics.stockMgmt.physicalCount.scanLookup.fetch({ code });
      return result as any;
    } catch {
      return { found: false };
    }
  }, [scanLookupUtils]);

  // Handle scanned items from barcode scanner
  const handleScannerConfirm = (items: ScannedItem[]) => {
    if (!sessionId || items.length === 0) {
      setScannerOpen(false);
      return;
    }
    const lines = items.map(item => ({
      itemCode: item.itemCode || item.code,
      itemName: item.itemName || item.code,
      batchNumber: item.batchNumber || undefined,
      countedQty: item.quantity,
      unit: item.unit || undefined,
      notes: isRTL
        ? `تم المسح عبر الباركود (${item.scanCount} مسح)`
        : `Scanned via barcode (${item.scanCount} scan${item.scanCount > 1 ? 's' : ''})`,
    }));
    uploadData.mutate({ sessionId, lines });
    setScannerOpen(false);
  };

  // CSV parsing
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sessionId) return;
    setUploading(true);
    try {
      const text = await file.text();
      const lines = parseCSV(text);
      if (lines.length === 0) {
        toast.error(isRTL
          ? "لم يتم العثور على بيانات صالحة في الملف"
          : "No valid data found in file. Expected columns: Item Code, Item Name, Batch Number, Counted Qty, Unit, Notes");
        setUploading(false);
        return;
      }
      uploadData.mutate({ sessionId, lines });
    } catch (err: any) {
      toast.error((isRTL ? "فشل في تحليل الملف: " : "Failed to parse file: ") + err.message);
      setUploading(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const parseCSV = (text: string): any[] => {
    const rows = text.split("\n").map(r => r.trim()).filter(r => r.length > 0);
    if (rows.length < 2) return [];
    const delimiter = rows[0].includes("\t") ? "\t" : ",";
    const headers = rows[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
    const itemCodeIdx = headers.findIndex(h => h.includes("item") && h.includes("code") || h === "itemcode" || h === "code");
    const itemNameIdx = headers.findIndex(h => h.includes("item") && h.includes("name") || h === "itemname" || h === "name" || h === "description");
    const batchIdx = headers.findIndex(h => h.includes("batch") || h === "batchnumber" || h === "lot");
    const qtyIdx = headers.findIndex(h => h.includes("counted") || h.includes("qty") || h.includes("quantity") || h === "count");
    const unitIdx = headers.findIndex(h => h.includes("unit") || h === "uom");
    const notesIdx = headers.findIndex(h => h.includes("note") || h.includes("remark") || h.includes("comment"));
    if (itemNameIdx === -1 && itemCodeIdx === -1) return [];
    if (qtyIdx === -1) return [];
    const result: any[] = [];
    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i].split(delimiter).map(c => c.trim().replace(/^['"]|['"]$/g, ""));
      const itemName = itemNameIdx >= 0 ? cols[itemNameIdx] : "";
      const itemCode = itemCodeIdx >= 0 ? cols[itemCodeIdx] : "";
      const countedQty = parseFloat(cols[qtyIdx] || "0");
      if ((!itemName && !itemCode) || isNaN(countedQty)) continue;
      result.push({
        itemCode: itemCode || undefined,
        itemName: itemName || itemCode || "Unknown",
        batchNumber: batchIdx >= 0 ? cols[batchIdx] || undefined : undefined,
        countedQty,
        unit: unitIdx >= 0 ? cols[unitIdx] || undefined : undefined,
        notes: notesIdx >= 0 ? cols[notesIdx] || undefined : undefined,
      });
    }
    return result;
  };

  const downloadTemplate = () => {
    if (!templateData || templateData.length === 0) {
      toast.info(isRTL ? "لم يتم العثور على أصناف مخزون لإنشاء القالب" : "No stock items found to generate template");
      return;
    }
    const headers = ["Item Code", "Item Name", "Batch Number", "System Qty", "Counted Qty", "Unit", "Notes"];
    const rows = templateData.map((r: any) =>
      [r.itemCode, r.itemName, r.batchNumber, r.systemQty, "", r.unit, ""].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `physical_count_template_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(isRTL ? "تم تنزيل القالب" : "Template downloaded");
  };

  const summary = useMemo(() => {
    if (!session?.lines) return { total: 0, matched: 0, surplus: 0, shortage: 0, totalVarianceValue: 0 };
    const lines = session.lines as any[];
    return {
      total: lines.length,
      matched: lines.filter((l: any) => l.varianceType === "match").length,
      surplus: lines.filter((l: any) => l.varianceType === "surplus").length,
      shortage: lines.filter((l: any) => l.varianceType === "shortage").length,
      totalVarianceValue: lines.reduce((sum: number, l: any) => sum + Math.abs(parseFloat(String(l.varianceValue || 0))), 0),
    };
  }, [session?.lines]);

  if (sessionLoading && !isNew) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <BackButton href="/organization/logistics/stock/physical-count" label={t.logistics?.physicalCount || "Physical Count"} />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">
            {isNew
              ? (isRTL ? "جلسة جرد فعلي جديدة" : "New Physical Count")
              : `${isRTL ? "جلسة الجرد:" : "Count Session:"} ${(session as any)?.sessionNumber || ""}`}
          </h1>
          {session && (
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <Badge variant="outline" className={statusColors[(session as any).status] || ""}>
                {statusLabels[(session as any).status] || (session as any).status}
              </Badge>
              {(session as any).warehouse && (
                <span className="text-sm text-muted-foreground">{isRTL ? "المستودع:" : "Warehouse:"} {(session as any).warehouse}</span>
              )}
              {(session as any).countedBy && (
                <span className="text-sm text-muted-foreground">{isRTL ? "بواسطة:" : "By:"} {(session as any).countedBy}</span>
              )}
            </div>
          )}
        </div>
        {session && (
          <div className="flex gap-2 flex-wrap">
            {((session as any).status === "draft" || (session as any).status === "in_progress") && (
              <>
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 me-2" /> {isRTL ? "تنزيل القالب" : "Download Template"}
                </Button>
                <Button variant="outline" onClick={() => setScannerOpen(true)}>
                  <ScanLine className="h-4 w-4 me-2" /> {isRTL ? "مسح الباركود" : "Scan Barcode"}
                </Button>
                <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Upload className="h-4 w-4 me-2" />}
                  {isRTL ? "رفع CSV" : "Upload CSV"}
                </Button>
                <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleFileUpload} />
              </>
            )}
            {(session as any).status === "in_progress" && (
              <Button variant="secondary" onClick={() => reviewSession.mutate({ sessionId: sessionId! })}>
                <ClipboardCheck className="h-4 w-4 me-2" /> {isRTL ? "تحديد كمراجعة" : "Mark Reviewed"}
              </Button>
            )}
            {(session as any).status === "reviewed" && (
              <Button onClick={() => generateAdj.mutate({ sessionId: sessionId! })}>
                <FileText className="h-4 w-4 me-2" /> {isRTL ? "إنشاء تسوية" : "Generate Adjustment"}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {session && (session as any).status !== "draft" && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold">{summary.total}</p>
              <p className="text-xs text-muted-foreground">{isRTL ? "إجمالي الأصناف" : "Total Items"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-green-600">{summary.matched}</p>
              <p className="text-xs text-muted-foreground">{isRTL ? "متطابق" : "Matched"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{summary.surplus}</p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><TrendingUp className="h-3 w-3" /> {isRTL ? "فائض" : "Surplus"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-red-600">{summary.shortage}</p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><TrendingDown className="h-3 w-3" /> {isRTL ? "نقص" : "Shortage"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-amber-600">${summary.totalVarianceValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-xs text-muted-foreground">{isRTL ? "قيمة الفروقات" : "Variance Value"}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Adjustment Link */}
      {session && (session as any).adjustmentId && (
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium">{isRTL ? "تم إنشاء تسوية من جلسة الجرد هذه" : "Adjustment generated from this count session"}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setLocation("/organization/logistics/stock/adjustments")}>
              {isRTL ? "عرض التسويات" : "View Adjustments"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Count Lines Table */}
      {session && (session as any).lines && (session as any).lines.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" /> {isRTL ? `سطور الجرد (${(session as any).lines.length} صنف)` : `Count Lines (${(session as any).lines.length} items)`}
            </CardTitle>
            <CardDescription>{isRTL ? "المقارنة بين كميات النظام والجرد الفعلي" : "Comparison between system quantities and physical count"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground" style={{ textAlign: isRTL ? "right" : "left" }}>
                    <th className="py-3 px-3 font-medium">#</th>
                    <th className="py-3 px-3 font-medium">{isRTL ? "رمز الصنف" : "Item Code"}</th>
                    <th className="py-3 px-3 font-medium">{isRTL ? "اسم الصنف" : "Item Name"}</th>
                    <th className="py-3 px-3 font-medium">{isRTL ? "الدفعة" : "Batch"}</th>
                    <th className="py-3 px-3 font-medium" style={{ textAlign: isRTL ? "left" : "right" }}>{isRTL ? "كمية النظام" : "System Qty"}</th>
                    <th className="py-3 px-3 font-medium" style={{ textAlign: isRTL ? "left" : "right" }}>{isRTL ? "الكمية المعدودة" : "Counted Qty"}</th>
                    <th className="py-3 px-3 font-medium" style={{ textAlign: isRTL ? "left" : "right" }}>{isRTL ? "الفرق" : "Variance"}</th>
                    <th className="py-3 px-3 font-medium text-center">{t.logistics?.status || "Status"}</th>
                    <th className="py-3 px-3 font-medium" style={{ textAlign: isRTL ? "left" : "right" }}>{isRTL ? "تكلفة الوحدة" : "Unit Cost"}</th>
                    <th className="py-3 px-3 font-medium" style={{ textAlign: isRTL ? "left" : "right" }}>{isRTL ? "قيمة الفرق" : "Variance Value"}</th>
                  </tr>
                </thead>
                <tbody>
                  {(session as any).lines.map((line: any, idx: number) => {
                    const systemQty = parseFloat(String(line.systemQty || 0));
                    const countedQty = parseFloat(String(line.countedQty || 0));
                    const varianceQty = parseFloat(String(line.varianceQty || 0));
                    const varianceValue = parseFloat(String(line.varianceValue || 0));
                    const unitCost = parseFloat(String(line.unitCost || 0));

                    return (
                      <tr key={line.id || idx} className={`border-b hover:bg-muted/50 transition-colors ${
                        line.varianceType === "surplus" ? "bg-blue-50/30" :
                        line.varianceType === "shortage" ? "bg-red-50/30" : ""
                      }`}>
                        <td className="py-2.5 px-3 text-muted-foreground">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono text-xs">{line.itemCode || "—"}</td>
                        <td className="py-2.5 px-3">{line.itemName}</td>
                        <td className="py-2.5 px-3 text-xs">{line.batchNumber || "—"}</td>
                        <td className="py-2.5 px-3 font-mono" style={{ textAlign: isRTL ? "left" : "right" }}>{systemQty.toFixed(2)}</td>
                        <td className="py-2.5 px-3 font-mono font-medium" style={{ textAlign: isRTL ? "left" : "right" }}>{countedQty.toFixed(2)}</td>
                        <td className={`py-2.5 px-3 font-mono font-medium ${
                          varianceQty > 0 ? "text-blue-600" : varianceQty < 0 ? "text-red-600" : "text-muted-foreground"
                        }`} style={{ textAlign: isRTL ? "left" : "right" }}>
                          {varianceQty > 0 ? "+" : ""}{varianceQty.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {line.varianceType === "match" ? (
                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                              <CheckCircle2 className="h-3 w-3 me-1" /> {isRTL ? "متطابق" : "Match"}
                            </Badge>
                          ) : line.varianceType === "surplus" ? (
                            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                              <TrendingUp className="h-3 w-3 me-1" /> {isRTL ? "فائض" : "Surplus"}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                              <TrendingDown className="h-3 w-3 me-1" /> {isRTL ? "نقص" : "Shortage"}
                            </Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs" style={{ textAlign: isRTL ? "left" : "right" }}>${unitCost.toFixed(2)}</td>
                        <td className="py-2.5 px-3 font-mono text-xs" style={{ textAlign: isRTL ? "left" : "right" }}>${varianceValue.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state for draft sessions */}
      {session && (session as any).status === "draft" && (!(session as any).lines || (session as any).lines.length === 0) && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-lg font-medium text-foreground">{isRTL ? "رفع ورقة الجرد" : "Upload Count Sheet"}</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              {isRTL
                ? "قم بتنزيل قالب CSV، واملأ الكميات المعدودة، ثم ارفعه للمقارنة مع مخزون النظام. الصيغ المدعومة: CSV, TSV."
                : "Download the template CSV, fill in counted quantities, then upload it to compare with system stock. Supported formats: CSV, TSV."}
            </p>
            <div className="flex gap-3 justify-center mt-4 flex-wrap">
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4 me-2" /> {isRTL ? "تنزيل القالب" : "Download Template"}
              </Button>
              <Button variant="outline" onClick={() => setScannerOpen(true)}>
                <ScanLine className="h-4 w-4 me-2" /> {isRTL ? "مسح الباركود" : "Scan Barcode"}
              </Button>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 me-2" /> {isRTL ? "رفع CSV" : "Upload CSV"}
              </Button>
              <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt" className="hidden" onChange={handleFileUpload} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Session Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) setLocation("/organization/logistics/stock/physical-count"); setShowCreateDialog(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isRTL ? "جلسة جرد فعلي جديدة" : "New Physical Count Session"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>{isRTL ? "المستودع (اختياري)" : "Warehouse (optional)"}</Label>
              <Input value={warehouse} onChange={(e) => setWarehouse(e.target.value)} placeholder={isRTL ? "مثال: المستودع الرئيسي" : "e.g., Main Warehouse"} />
            </div>
            <div>
              <Label>{isRTL ? "بواسطة" : "Counted By"}</Label>
              <Input value={countedBy} onChange={(e) => setCountedBy(e.target.value)} placeholder={isRTL ? "اسم الشخص المنفذ للجرد" : "Name of person performing count"} />
            </div>
            <div>
              <Label>{isRTL ? "ملاحظات (اختياري)" : "Notes (optional)"}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={isRTL ? "أي ملاحظات إضافية..." : "Any additional notes..."} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); setLocation("/organization/logistics/stock/physical-count"); }}>
              {t.common?.cancel || "Cancel"}
            </Button>
            <Button onClick={() => createSession.mutate({
              warehouse: warehouse || undefined,
              countDate: Date.now(),
              countedBy: countedBy || undefined,
              notes: notes || undefined,
            })} disabled={createSession.isPending}>
              {createSession.isPending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Plus className="h-4 w-4 me-2" />}
              {isRTL ? "إنشاء الجلسة" : "Create Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner Dialog */}
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onConfirm={handleScannerConfirm}
        lookupBatch={lookupBatch}
      />
    </div>
  );
}
