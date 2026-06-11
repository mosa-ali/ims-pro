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
  const utils = trpc.useUtils();

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
  const { data: existingIssue } = trpc.logistics.stockManagement.issues.getById.useQuery(
    { id: parseInt(params.id || "0") },
    { enabled: isEdit }
  );

  // Create mutation
  const createMutation = trpc.logistics.stockManagement.issues.create.useMutation();

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
  // getSuggested is a query, not a mutation - will be called directly in handleAddItem

  const handleAddItem = async () => {
    const itemId = parseInt(selectedItemId);
    const qty = parseFloat(requestedQty);
    if (!itemId || !qty || qty <= 0) {
      toast.error(t.logistics.pleaseFillAllRequiredFields || "Please select an item and enter a valid quantity");
      return;
    }

    // Check if item already added
    if (lines.some(l => l.itemId === itemId)) {
      toast.error(t.logistics.itemAlreadyAdded || "This item is already in the issue list. Remove it first to re-add.");
      return;
    }

    const item = stockItems.find((i: any) => i.id === itemId);
    if (!item) return;

    // Get FEFO/FIFO suggestion from backend
    try {
        // Call getSuggested query directly
        const suggestion =
        await utils.logistics.stockManagement.issues.getSuggested.fetch({
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
        toast.warning(`${t.logistics.partialAllocation || "Partial allocation"}: ${suggestion.totalAllocated} of ${qty} available. ${t.logistics.shortfall || "Shortfall"}: ${suggestion.shortfall}`);
      } else {
        toast.success(`${suggestion.allocationMethod} ${t.logistics.allocation || "allocation"}: ${suggestion.allocations.length} batch(es) selected`);
      }
    } catch (err: any) {
      toast.error(err.message || t.common.errorOccurred);
    }
  };

  const handleRemoveLine = (lineId: string) => {
    setLines(prev => prev.filter(l => l.id !== lineId));
  };

  const handleSubmit = async () => {
    if (!formData.issuedTo.trim()) {
      toast.error(t.logistics.pleaseEnterWhoTheItemsAreIssuedTo || "Please enter who the items are issued to");
      return;
    }
    if (lines.length === 0) {
      toast.error(t.logistics.pleaseAddAtLeastOneItemToIssue || "Please add at least one item to issue");
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
      toast.error(t.logistics.noBatchAllocationsToIssue || "No batch allocations to issue. Check if stock is available.");
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

      toast.success(`${t.logistics.stockIssue || "Stock issue"} ${result.issueNumber} ${t.common.savedSuccessfully || "created successfully"}`);
      navigate("/organization/logistics/stock/issued");
    } catch (err: any) {
      toast.error(err.message || t.common.errorOccurred);
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
          <BackButton href="/organization/logistics/stock/issued" label={t.logistics.backToIssuedItems} />
          <h1 className="text-2xl font-bold text-start mt-2">
            {isEdit ? t.logistics.editIssue : t.logistics.newIssue}
          </h1>
          <p className="text-muted-foreground text-start">
            {t.logistics.issueItemsFromStockUsingFefoFifoBatchAllocation || "Issue items from stock using FEFO/FIFO batch allocation"}
          </p>
        </div>
      </div>

      <div className="container py-6 space-y-6">
        {/* Issue Header Form */}
        <Card>
          <CardHeader>
            <CardTitle>{t.logistics.issueDetails}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label>{t.logistics.issuedTo} *</Label>
                <Input
                  value={formData.issuedTo}
                  onChange={(e) => setFormData(prev => ({ ...prev, issuedTo: e.target.value }))}
                  placeholder={t.logistics.personDepartmentOrProjectName || "Person, department, or project name"}
                />
              </div>
              <div>
                <Label>{t.logistics.recipientType}</Label>
                <Select
                  value={formData.issuedToType}
                  onValueChange={(v: any) => setFormData(prev => ({ ...prev, issuedToType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="person">{t.logistics.person}</SelectItem>
                    <SelectItem value="department">{t.logistics.department}</SelectItem>
                    <SelectItem value="project">{t.logistics.project}</SelectItem>
                    <SelectItem value="activity">{t.logistics.activity}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t.logistics.warehouse}</Label>
                <Input
                  value={formData.warehouseName}
                  onChange={(e) => setFormData(prev => ({ ...prev, warehouseName: e.target.value }))}
                  placeholder={t.logistics.warehouseName || "Warehouse name"}
                />
              </div>
              <div className="md:col-span-2">
                <Label>{t.logistics.purpose}</Label>
                <Input
                  value={formData.purpose}
                  onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                  placeholder={t.logistics.purposeOfIssuance || "Purpose of issuance"}
                />
              </div>
              <div>
                <Label>{t.logistics.remarks}</Label>
                <Textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                  placeholder={t.placeholders.additionalNotes || "Additional notes"}
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
                {t.logistics.addItemFefoFifoAutoAllocation || "Add Item (FEFO/FIFO Auto-Allocation)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <Label>{t.logistics.stockItem}</Label>
                  <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t.common.select} />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(stockItems) &&
                        stockItems.map((stockItem: any) => (
                        <SelectItem key={stockItem.id} value={String(stockItem.id)}>
                          {stockItem.itemCode} — {stockItem.itemName} (Qty: {stockItem.currentQuantity || 0})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[150px]">
                  <Label>{t.logistics.quantity}</Label>
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
                  {t.logistics.addAndAllocate || "Add & Allocate"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {t.logistics.systemWillAutomaticallySuggestBatches || "The system will automatically suggest batches using FEFO (First Expiry, First Out) for items with expiry dates, or FIFO (First In, First Out) for items without expiry dates."}
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
                  {t.logistics.issueLines || `Issue Lines`} ({totalItems} {t.logistics.item}, {totalQty} {t.logistics.unit})
                </CardTitle>
                {hasShortfall && (
                  <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                    <AlertTriangle className="h-3 w-3 me-1" />
                    {t.logistics.partialAllocation}
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
                          {t.logistics.requested}: {line.requestedQty} {line.unit}
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${line.allocationMethod === "FEFO" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>
                          {line.allocationMethod}
                        </Badge>
                        {line.shortfall > 0 && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 text-xs">
                            {t.logistics.shortfall}: {line.shortfall}
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
                            <TableHead className="text-xs">{t.logistics.batchNumber}</TableHead>
                            <TableHead className="text-xs text-center">{t.logistics.qtyToIssue}</TableHead>
                            <TableHead className="text-xs">{t.financeModule.expiryDate}</TableHead>
                            <TableHead className="text-xs text-end">{t.logistics.unitCost}</TableHead>
                            <TableHead className="text-xs text-end">{t.logistics.lineValue}</TableHead>
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
                                    : t.logistics.noExpiry}
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
                        {t.logistics.noBatchesAvailableForThisItem || "No batches available for this item. Cannot issue."}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-6 pt-4 border-t flex items-center justify-between">
                <div className="flex items-center gap-6 text-sm">
                  <span>{t.logistics.totalItems}: <strong>{totalItems}</strong></span>
                  <span>{t.logistics.totalQty}: <strong>{totalQty}</strong></span>
                  <span>{t.logistics.totalValue}: <strong>${totalValue.toFixed(2)}</strong></span>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" asChild>
                    <Link href="/organization/logistics/stock/issued">{t.common.cancel}</Link>
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
                    {isEdit ? t.logistics.updateIssue : t.logistics.createIssue}
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