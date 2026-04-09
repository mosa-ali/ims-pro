/**
 * Issued Items Form - Batch-Based FEFO/FIFO Issuing
 * 
 * Flow:
 * 1. User selects item and enters qty
 * 2. System suggests batches via FEFO/FIFO allocation
 * 3. User can accept suggestion or manually adjust batch quantities
 * 4. On submit, issue is created with batch-level lines and ledger entries
 * 
 * Supports partial issuance when insufficient stock.
 */

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, Loader2, Sparkles, AlertTriangle, Clock } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/i18n/useTranslation";
import { toast } from "sonner";
import { BackButton } from "@/components/BackButton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type IssueLine = {
  id: string; // client-side key
  itemId: number | null;
  itemName: string;
  requestedQty: number;
  allocations: Array<{
    batchId: number;
    batchNumber: string;
    qty: number;
    expiryDate: string | null;
    unitCost: number;
  }>;
  allocationMethod: string;
  shortfall: number;
  unit: string;
  notes: string;
};

let lineCounter = 0;
function nextLineId() {
  return `line-${++lineCounter}`;
}

export default function IssuedItemsForm() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const [, navigate] = useLocation();
  const params = useParams();
  const isEdit = !!params.id;

  const [formData, setFormData] = useState({
    issuedTo: "",
    issuedToType: "person" as "person" | "department" | "project" | "activity",
    projectId: undefined as number | undefined,
    warehouseName: "",
    purpose: "",
    remarks: "",
  });

  const [lines, setLines] = useState<IssueLine[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [requestedQty, setRequestedQty] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch stock items for dropdown
  const { data: stockItemsData } = trpc.logistics.stock.listItems.useQuery({
    limit: 1000,
    offset: 0,
  });
  const stockItems = stockItemsData?.items || [];

  // If editing, fetch existing issue
  const { data: existingIssue } = trpc.logistics.stockMgmt.issues.getById.useQuery(
    { id: parseInt(params.id || "0") },
    { enabled: isEdit }
  );

  // Create mutation
  const createMutation = trpc.logistics.stockMgmt.issues.create.useMutation();

  // Populate form if editing
  useEffect(() => {
    if (existingIssue) {
      setFormData({
        issuedTo: existingIssue.issuedTo || "",
        issuedToType: existingIssue.issuedToType || "person",
        projectId: existingIssue.projectId || undefined,
        warehouseName: existingIssue.warehouseName || "",
        purpose: existingIssue.purpose || "",
        remarks: existingIssue.remarks || "",
      });
      // Map existing lines
      if (existingIssue.lines) {
        setLines(existingIssue.lines.map((l: any) => ({
          id: nextLineId(),
          itemId: l.itemId,
          itemName: l.itemName || "",
          requestedQty: parseFloat(l.qtyIssued || "0"),
          allocations: [{
            batchId: l.batchId,
            batchNumber: l.batchNumber || "",
            qty: parseFloat(l.qtyIssued || "0"),
            expiryDate: l.expiryDate,
            unitCost: 0,
          }],
          allocationMethod: "EXISTING",
          shortfall: 0,
          unit: l.unit || "Piece",
          notes: l.notes || "",
        })));
      }
    }
  }, [existingIssue]);

  // Add item with FEFO/FIFO suggestion
  const handleAddItem = async () => {
    const itemId = parseInt(selectedItemId);
    const qty = parseFloat(requestedQty);
    if (!itemId || !qty || qty <= 0) {
      toast.error("Please select an item and enter a valid quantity");
      return;
    }

    // Check if item already added
    if (lines.some(l => l.itemId === itemId)) {
      toast.error("This item is already in the issue list. Remove it first to re-add.");
      return;
    }

    const item = stockItems.find((i: any) => i.id === itemId);
    if (!item) return;

    // Get FEFO/FIFO suggestion from backend
    try {
      const suggestion = await trpc.logistics.stockMgmt.batches.getSuggested.query({
        itemId,
        requestedQty: qty,
      });

      const newLine: IssueLine = {
        id: nextLineId(),
        itemId,
        itemName: item.itemName || "",
        requestedQty: qty,
        allocations: suggestion.allocations,
        allocationMethod: suggestion.allocationMethod,
        shortfall: suggestion.shortfall,
        unit: item.unitType || "Piece",
        notes: "",
      };

      setLines(prev => [...prev, newLine]);
      setSelectedItemId("");
      setRequestedQty("");

      if (suggestion.shortfall > 0) {
        toast.warning(`Partial allocation: ${suggestion.totalAllocated} of ${qty} available. Shortfall: ${suggestion.shortfall}`);
      } else {
        toast.success(`${suggestion.allocationMethod} allocation: ${suggestion.allocations.length} batch(es) selected`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to get batch allocation");
    }
  };

  const handleRemoveLine = (lineId: string) => {
    setLines(prev => prev.filter(l => l.id !== lineId));
  };

  const handleSubmit = async () => {
    if (!formData.issuedTo.trim()) {
      toast.error("Please enter who the items are issued to");
      return;
    }
    if (lines.length === 0) {
      toast.error("Please add at least one item to issue");
      return;
    }

    // Flatten allocations into issue lines
    const issueLines = lines.flatMap(line =>
      line.allocations.map(alloc => ({
        itemId: line.itemId!,
        batchId: alloc.batchId,
        qtyIssued: alloc.qty,
        unit: line.unit,
        notes: line.notes || undefined,
      }))
    );

    if (issueLines.length === 0) {
      toast.error("No batch allocations to issue. Check if stock is available.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createMutation.mutateAsync({
        issuedTo: formData.issuedTo,
        issuedToType: formData.issuedToType,
        projectId: formData.projectId,
        warehouseName: formData.warehouseName || undefined,
        purpose: formData.purpose || undefined,
        remarks: formData.remarks || undefined,
        lines: issueLines,
      });

      toast.success(`Stock issue ${result.issueNumber} created successfully`);
      navigate("/organization/logistics/stock/issued");
    } catch (err: any) {
      toast.error(err.message || "Failed to create stock issue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalItems = lines.length;
  const totalQty = lines.reduce((sum, l) => sum + l.allocations.reduce((s, a) => s + a.qty, 0), 0);
  const totalValue = lines.reduce((sum, l) => sum + l.allocations.reduce((s, a) => s + a.qty * a.unitCost, 0), 0);
  const hasShortfall = lines.some(l => l.shortfall > 0);

  const isNearExpiry = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const now = new Date();
    const expiry = new Date(expiryDate);
    const thirtyDaysLater = new Date(now);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    return expiry > now && expiry <= thirtyDaysLater;
  };

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <BackButton href="/organization/logistics/stock/issued" label={isRTL ? "المصروفات" : "Back to Issued Items"} />
          <h1 className="text-2xl font-bold text-start mt-2">
            {isEdit ? (isRTL ? "تعديل إصدار المخزون" : "Edit Stock Issue") : (isRTL ? "إصدار مخزون جديد" : "New Stock Issue")}
          </h1>
          <p className="text-muted-foreground text-start">
            {isRTL ? "إصدار الأصناف من المخزون باستخدام تخصيص الدفعات FEFO/FIFO" : "Issue items from stock using FEFO/FIFO batch allocation"}
          </p>
        </div>
      </div>

      <div className="container py-6 space-y-6">
        {/* Issue Header Form */}
        <Card>
          <CardHeader>
            <CardTitle>{isRTL ? "تفاصيل الإصدار" : "Issue Details"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label>{isRTL ? "صادر إلى *" : "Issued To *"}</Label>
                <Input
                  value={formData.issuedTo}
                  onChange={(e) => setFormData(prev => ({ ...prev, issuedTo: e.target.value }))}
                  placeholder={isRTL ? "اسم الشخص أو القسم أو المشروع" : "Person, department, or project name"}
                />
              </div>
              <div>
                <Label>{isRTL ? "نوع المستلم" : "Recipient Type"}</Label>
                <Select
                  value={formData.issuedToType}
                  onValueChange={(v: any) => setFormData(prev => ({ ...prev, issuedToType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="person">{isRTL ? "شخص" : "Person"}</SelectItem>
                    <SelectItem value="department">{isRTL ? "قسم" : "Department"}</SelectItem>
                    <SelectItem value="project">{isRTL ? "مشروع" : "Project"}</SelectItem>
                    <SelectItem value="activity">{isRTL ? "نشاط" : "Activity"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t.logistics?.warehouse || (isRTL ? "المستودع" : "Warehouse")}</Label>
                <Input
                  value={formData.warehouseName}
                  onChange={(e) => setFormData(prev => ({ ...prev, warehouseName: e.target.value }))}
                  placeholder={isRTL ? "اسم المستودع" : "Warehouse name"}
                />
              </div>
              <div className="md:col-span-2">
                <Label>{isRTL ? "الغرض" : "Purpose"}</Label>
                <Input
                  value={formData.purpose}
                  onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                  placeholder={isRTL ? "غرض الإصدار" : "Purpose of issuance"}
                />
              </div>
              <div>
                <Label>{isRTL ? "ملاحظات" : "Remarks"}</Label>
                <Textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                  placeholder={isRTL ? "ملاحظات إضافية" : "Additional notes"}
                  rows={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Item Section */}
        {!isEdit && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                {isRTL ? "إضافة صنف (تخصيص تلقائي FEFO/FIFO)" : "Add Item (FEFO/FIFO Auto-Allocation)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <Label>{isRTL ? "صنف المخزون" : "Stock Item"}</Label>
                  <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                    <SelectTrigger>
                      <SelectValue placeholder={isRTL ? "اختر صنفاً..." : "Select an item..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {stockItems.map((item: any) => (
                        <SelectItem key={item.id} value={String(item.id)}>
                          {item.itemCode} — {item.itemName} (Qty: {item.currentQuantity || 0})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[150px]">
                  <Label>{isRTL ? "الكمية" : "Quantity"}</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={requestedQty}
                    onChange={(e) => setRequestedQty(e.target.value)}
                    placeholder="Qty"
                  />
                </div>
                <Button onClick={handleAddItem} className="shrink-0">
                  <Plus className="h-4 w-4 me-2" />
                  {isRTL ? "إضافة وتخصيص" : "Add & Allocate"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                The system will automatically suggest batches using FEFO (First Expiry, First Out) for items with expiry dates, 
                or FIFO (First In, First Out) for items without expiry dates.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Issue Lines with Batch Allocations */}
        {lines.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {isRTL ? `بنود الإصدار (${totalItems} أصناف، ${totalQty} وحدات)` : `Issue Lines (${totalItems} items, ${totalQty} units)`}
                </CardTitle>
                {hasShortfall && (
                  <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                    <AlertTriangle className="h-3 w-3 me-1" />
                    {isRTL ? "تخصيص جزئي" : "Partial Allocation"}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lines.map((line) => (
                  <div key={line.id} className="border rounded-lg p-4">
                    {/* Line Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-sm">{line.itemName}</span>
                        <Badge variant="outline" className="text-xs">
                          {isRTL ? `المطلوب: ${line.requestedQty} ${line.unit}` : `Requested: ${line.requestedQty} ${line.unit}`}
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${line.allocationMethod === "FEFO" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>
                          {line.allocationMethod}
                        </Badge>
                        {line.shortfall > 0 && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 text-xs">
                            {isRTL ? `عجز: ${line.shortfall}` : `Shortfall: ${line.shortfall}`}
                          </Badge>
                        )}
                      </div>
                      {!isEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveLine(line.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Batch Allocation Table */}
                    {line.allocations.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="text-xs">{isRTL ? "رقم الدفعة" : "Batch #"}</TableHead>
                            <TableHead className="text-xs text-center">{isRTL ? "الكمية للإصدار" : "Qty to Issue"}</TableHead>
                            <TableHead className="text-xs">{isRTL ? "تاريخ الانتهاء" : "Expiry Date"}</TableHead>
                            <TableHead className="text-xs text-end">{isRTL ? "سعر الوحدة" : "Unit Cost"}</TableHead>
                            <TableHead className="text-xs text-end">{isRTL ? "قيمة البند" : "Line Value"}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {line.allocations.map((alloc, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-xs">{alloc.batchNumber}</TableCell>
                              <TableCell className="text-center font-semibold">{alloc.qty}</TableCell>
                              <TableCell className="text-xs">
                                <span className={`inline-flex items-center gap-1 ${isNearExpiry(alloc.expiryDate) ? "text-amber-600" : ""}`}>
                                  {isNearExpiry(alloc.expiryDate) && <Clock className="h-3 w-3" />}
                                  {alloc.expiryDate
                                    ? new Date(alloc.expiryDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
                                    : (isRTL ? "بدون انتهاء" : "No expiry")}
                                </span>
                              </TableCell>
                              <TableCell className="text-end text-xs">${alloc.unitCost.toFixed(2)}</TableCell>
                              <TableCell className="text-end text-xs font-medium">
                                ${(alloc.qty * alloc.unitCost).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-red-500 py-2">
                        {isRTL ? "لا توجد دفعات متاحة لهذا الصنف. لا يمكن الإصدار." : "No batches available for this item. Cannot issue."}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-6 pt-4 border-t flex items-center justify-between">
                <div className="flex items-center gap-6 text-sm">
                  <span>{isRTL ? "إجمالي الأصناف" : "Total Items"}: <strong>{totalItems}</strong></span>
                  <span>{isRTL ? "إجمالي الكمية" : "Total Qty"}: <strong>{totalQty}</strong></span>
                  <span>{isRTL ? "إجمالي القيمة" : "Total Value"}: <strong>${totalValue.toFixed(2)}</strong></span>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" asChild>
                    <Link href="/organization/logistics/stock/issued">{isRTL ? "إلغاء" : "Cancel"}</Link>
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || lines.length === 0}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin me-2" />
                    ) : (
                      <Save className="h-4 w-4 me-2" />
                    )}
                    {isEdit ? (isRTL ? "تحديث الإصدار" : "Update Issue") : (isRTL ? "إنشاء الإصدار" : "Create Issue")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
