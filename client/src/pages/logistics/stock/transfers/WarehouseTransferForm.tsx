/**
 * Warehouse Transfer Form - Create new inter-warehouse transfer
 */

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Loader2, Save } from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/i18n/useTranslation";
import { BackButton } from "@/components/BackButton";
import { toast } from "sonner";

interface TransferLine {
  itemId: number | null;
  batchId: number | null;
  quantity: string;
  unitCost: string;
  notes: string;
}

export default function WarehouseTransferForm() {
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [sourceWarehouse, setSourceWarehouse] = useState("");
  const [destinationWarehouse, setDestinationWarehouse] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<TransferLine[]>([
    { itemId: null, batchId: null, quantity: "", unitCost: "", notes: "" },
  ]);

  const { data: stockItems } = trpc.logistics.stock.getItems.useQuery({});
  const { data: allBatches } = trpc.logistics.stockMgmt.batches.list.useQuery({});

  const createMutation = trpc.logistics.stockMgmt.transfers.create.useMutation({
    onSuccess: () => { toast.success(isRTL ? "تم إنشاء التحويل كمسودة" : "Transfer created as draft"); setLocation("/organization/logistics/stock/transfers"); },
    onError: (err) => toast.error(err.message),
  });

  const addLine = () => setLines([...lines, { itemId: null, batchId: null, quantity: "", unitCost: "", notes: "" }]);
  const removeLine = (idx: number) => { if (lines.length > 1) setLines(lines.filter((_, i) => i !== idx)); };
  const updateLine = (idx: number, field: keyof TransferLine, value: any) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === "itemId") updated[idx].batchId = null;
    setLines(updated);
  };
  const getBatchesForItem = (itemId: number | null) => {
    if (!itemId || !allBatches) return [];
    return allBatches.filter((b: any) => b.itemId === itemId);
  };

  const handleSubmit = () => {
    if (!sourceWarehouse.trim()) { toast.error(isRTL ? "يرجى إدخال المستودع المصدر" : "Please enter source warehouse"); return; }
    if (!destinationWarehouse.trim()) { toast.error(isRTL ? "يرجى إدخال المستودع الوجهة" : "Please enter destination warehouse"); return; }
    if (sourceWarehouse.trim() === destinationWarehouse.trim()) { toast.error(isRTL ? "يجب أن يختلف المصدر والوجهة" : "Source and destination must differ"); return; }
    const validLines = lines.filter((l) => l.itemId && l.quantity && parseFloat(l.quantity) > 0);
    if (!validLines.length) { toast.error(isRTL ? "أضف سطراً واحداً على الأقل" : "Add at least one line item"); return; }
    createMutation.mutate({
      sourceWarehouse: sourceWarehouse.trim(), destinationWarehouse: destinationWarehouse.trim(),
      notes: notes || undefined,
      lines: validLines.map((l) => ({
        itemId: l.itemId!, batchId: l.batchId || undefined,
        quantity: parseFloat(l.quantity), unitCost: l.unitCost ? parseFloat(l.unitCost) : undefined,
        notes: l.notes || undefined,
      })),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container py-6">
          <BackButton href="/organization/logistics/stock/transfers" label={t.logistics?.warehouseTransfers || "Back to Transfers"} />
          <h1 className="text-2xl font-bold text-start mt-2">{isRTL ? "تحويل مستودع جديد" : "New Warehouse Transfer"}</h1>
          <p className="text-muted-foreground text-start">{isRTL ? "نقل المخزون بين المستودعات مع تتبع كامل في السجل" : "Move stock between warehouses with full ledger tracking"}</p>
        </div>
      </div>
      <div className="container py-6 max-w-4xl space-y-6">
        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <h2 className="text-lg font-semibold">{isRTL ? "تفاصيل التحويل" : "Transfer Details"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? "المستودع المصدر *" : "Source Warehouse *"}</Label>
              <Input placeholder={isRTL ? "مثال: المستودع الرئيسي" : "e.g. Main Warehouse"} value={sourceWarehouse} onChange={(e) => setSourceWarehouse(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? "المستودع الوجهة *" : "Destination Warehouse *"}</Label>
              <Input placeholder={isRTL ? "مثال: المكتب الميداني" : "e.g. Field Office"} value={destinationWarehouse} onChange={(e) => setDestinationWarehouse(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{isRTL ? "ملاحظات" : "Notes"}</Label>
            <Textarea placeholder={isRTL ? "ملاحظات التحويل..." : "Transfer notes..."} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{isRTL ? "بنود التحويل" : "Transfer Lines"}</h2>
            <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-4 w-4 me-1" />{isRTL ? "إضافة سطر" : "Add Line"}</Button>
          </div>
          <div className="space-y-4">
            {lines.map((line, idx) => (
              <div key={idx} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">{isRTL ? `سطر ${idx + 1}` : `Line ${idx + 1}`}</span>
                  {lines.length > 1 && <Button variant="ghost" size="sm" onClick={() => removeLine(idx)}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{isRTL ? "الصنف *" : "Item *"}</Label>
                    <Select value={line.itemId?.toString() || ""} onValueChange={(v) => updateLine(idx, "itemId", parseInt(v))}>
                      <SelectTrigger><SelectValue placeholder={isRTL ? "اختر الصنف..." : "Select item..."} /></SelectTrigger>
                      <SelectContent>
                        {(stockItems || []).map((item: any) => (
                          <SelectItem key={item.id} value={item.id.toString()}>{item.itemName || item.description || `Item #${item.id}`}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{isRTL ? "الدفعة (اختياري)" : "Batch (optional)"}</Label>
                    <Select value={line.batchId?.toString() || ""} onValueChange={(v) => updateLine(idx, "batchId", v && v !== "none" ? parseInt(v) : null)}>
                      <SelectTrigger><SelectValue placeholder={isRTL ? "اختر الدفعة..." : "Select batch..."} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{isRTL ? "بدون دفعة محددة" : "No specific batch"}</SelectItem>
                        {getBatchesForItem(line.itemId).map((batch: any) => (
                          <SelectItem key={batch.id} value={batch.id.toString()}>{batch.batchNumber} ({isRTL ? "الكمية:" : "Qty:"} {batch.availableQty})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{isRTL ? "الكمية *" : "Quantity *"}</Label>
                    <Input type="number" min="0" step="0.01" placeholder="0" value={line.quantity} onChange={(e) => updateLine(idx, "quantity", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{isRTL ? "تكلفة الوحدة ($)" : "Unit Cost ($)"}</Label>
                    <Input type="number" step="0.01" placeholder="0.00" value={line.unitCost} onChange={(e) => updateLine(idx, "unitCost", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{isRTL ? "ملاحظات" : "Notes"}</Label>
                  <Input placeholder={isRTL ? "ملاحظات على مستوى السطر..." : "Line-level notes..."} value={line.notes} onChange={(e) => updateLine(idx, "notes", e.target.value)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setLocation("/organization/logistics/stock/transfers")}>{t.common?.cancel || "Cancel"}</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Save className="h-4 w-4 me-2" />}
            {isRTL ? "إنشاء التحويل (مسودة)" : "Create Transfer (Draft)"}
          </Button>
        </div>
      </div>
    </div>
  );
}
