/**
 * Stock Adjustment Form - Create new stock adjustments with line items
 * Admin-only: write-offs, physical counts, damage, corrections, donations
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

interface AdjustmentLine {
  itemId: number | null;
  batchId: number | null;
  qtyAdjusted: string;
  unitCost: string;
  notes: string;
}

export default function StockAdjustmentForm() {
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  const [, setLocation] = useLocation();

  const [type, setType] = useState<string>("");
  const [warehouse, setWarehouse] = useState("");
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState<AdjustmentLine[]>([
    { itemId: null, batchId: null, qtyAdjusted: "", unitCost: "", notes: "" },
  ]);

  const adjTypeLabels: Record<string, string> = {
    write_off: isRTL ? "شطب" : "Write-Off",
    physical_count: isRTL ? "جرد فعلي" : "Physical Count",
    damage: isRTL ? "تلف" : "Damage",
    correction: isRTL ? "تصحيح" : "Correction",
    donation: isRTL ? "تبرع" : "Donation",
    other: isRTL ? "أخرى" : "Other",
  };

  const { data: stockItems } = trpc.logistics.stock.getItems.useQuery({});
  const { data: allBatches } = trpc.logistics.stockMgmt.batches.list.useQuery({});

  const createMutation = trpc.logistics.stockMgmt.adjustments.create.useMutation({
    onSuccess: () => {
      toast.success(isRTL ? "تم إنشاء التسوية كمسودة" : "Adjustment created as draft");
      setLocation("/organization/logistics/stock/adjustments");
    },
    onError: (err) => toast.error(err.message),
  });

  const addLine = () => {
    setLines([...lines, { itemId: null, batchId: null, qtyAdjusted: "", unitCost: "", notes: "" }]);
  };

  const removeLine = (idx: number) => {
    if (lines.length > 1) setLines(lines.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, field: keyof AdjustmentLine, value: any) => {
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
    if (!type) { toast.error(isRTL ? "يرجى اختيار نوع التسوية" : "Please select an adjustment type"); return; }
    const validLines = lines.filter((l) => l.itemId && l.qtyAdjusted);
    if (validLines.length === 0) { toast.error(isRTL ? "يرجى إضافة سطر واحد على الأقل بالكمية" : "Please add at least one line item with quantity"); return; }

    createMutation.mutate({
      type,
      warehouse: warehouse || undefined,
      reason: reason || undefined,
      lines: validLines.map((l) => ({
        itemId: l.itemId!,
        batchId: l.batchId || undefined,
        qtyAdjusted: parseFloat(l.qtyAdjusted),
        unitCost: l.unitCost ? parseFloat(l.unitCost) : undefined,
        notes: l.notes || undefined,
      })),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container py-6">
          <BackButton href="/organization/logistics/stock/adjustments" label={t.logistics?.stockAdjustments || "Back to Adjustments"} />
          <h1 className="text-2xl font-bold text-start mt-2">{isRTL ? "تسوية مخزون جديدة" : "New Stock Adjustment"}</h1>
          <p className="text-muted-foreground text-start">{isRTL ? "إنشاء تصحيح يدوي (شطب، جرد فعلي، تلف، إلخ)" : "Create a manual correction (write-off, physical count, damage, etc.)"}</p>
        </div>
      </div>

      <div className="container py-6 max-w-4xl space-y-6">
        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <h2 className="text-lg font-semibold">{isRTL ? "تفاصيل التسوية" : "Adjustment Details"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? "نوع التسوية *" : "Adjustment Type *"}</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue placeholder={isRTL ? "اختر النوع..." : "Select type..."} /></SelectTrigger>
                <SelectContent>
                  {Object.entries(adjTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.logistics?.warehouse || "Warehouse"}</Label>
              <Input placeholder={isRTL ? "مثال: المستودع الرئيسي" : "e.g. Main Warehouse"} value={warehouse} onChange={(e) => setWarehouse(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{isRTL ? "السبب / المبرر" : "Reason / Justification"}</Label>
            <Textarea placeholder={isRTL ? "اشرح سبب هذه التسوية..." : "Explain the reason for this adjustment..."} value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{isRTL ? "بنود التسوية" : "Line Items"}</h2>
            <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-4 w-4 me-1" />{isRTL ? "إضافة سطر" : "Add Line"}</Button>
          </div>
          <div className="space-y-4">
            {lines.map((line, idx) => (
              <div key={idx} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">{isRTL ? `سطر ${idx + 1}` : `Line ${idx + 1}`}</span>
                  {lines.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeLine(idx)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  )}
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
                    <Label className="text-xs">{isRTL ? "الكمية المعدلة * (سالب = نقص)" : "Qty Adjusted * (negative = decrease)"}</Label>
                    <Input type="number" placeholder={isRTL ? "مثال: -10 أو +5" : "e.g. -10 or +5"} value={line.qtyAdjusted} onChange={(e) => updateLine(idx, "qtyAdjusted", e.target.value)} />
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
          <Button variant="outline" onClick={() => setLocation("/organization/logistics/stock/adjustments")}>{t.common?.cancel || "Cancel"}</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Save className="h-4 w-4 me-2" />}
            {isRTL ? "إنشاء التسوية (مسودة)" : "Create Adjustment (Draft)"}
          </Button>
        </div>
      </div>
    </div>
  );
}
