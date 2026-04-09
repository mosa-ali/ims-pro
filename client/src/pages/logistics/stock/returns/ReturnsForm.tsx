/**
 * Returns Form Page
 * Create and edit returned items with inspection workflow
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
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
import { Plus, Trash2, Save, CheckCircle, XCircle } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

type LineItem = {
 id?: number;
 stockItemId?: number;
 lineNumber: number;
 description: string;
 returnedQty: string;
 acceptedQty?: string;
 condition?: "good" | "damaged" | "expired" | "defective";
 unit: string;
 remarks?: string;
};

export default function ReturnsForm() {
 const { t } = useTranslation();
 const { user } = useAuth();
 const { isRTL } = useLanguage();
 const [, navigate] = useLocation();
 const params = useParams();
 const isEdit = !!params.id;
 const { currentOrganization } = useOrganization();

 const [formData, setFormData] = useState({
 returnNumber: "",
 returnDate: new Date().toISOString().split("T")[0],
 returnedBy: "",
 department: "",
 reason: "",
 remarks: "",
 status: "draft" as "draft" | "submitted" | "inspected" | "accepted" | "rejected",
 inspectedBy: "",
 });

 const [lineItems, setLineItems] = useState<LineItem[]>([
 { lineNumber: 1, description: "", returnedQty: "", unit: "Piece", condition: "good" },
 ]);

 // Fetch existing record if editing
 const { data: existingRecord } = trpc.logistics.returnedItems.getById.useQuery(
 { id: parseInt(params.id || "0") },
 { enabled: isEdit }
 );

 // Fetch stock items for dropdown
 const { data: stockItems } = trpc.logistics.stock.listItems.useQuery({
 limit: 1000,
 offset: 0,
 });

 // Mutations
 const createMutation = trpc.logistics.returnedItems.create.useMutation();
 const updateMutation = trpc.logistics.returnedItems.update.useMutation();

 useEffect(() => {
 if (existingRecord) {
 setFormData({
 returnNumber: existingRecord.returnNumber,
 returnDate: existingRecord.returnDate ? new Date(existingRecord.returnDate).toISOString().split("T")[0] : "",
 returnedBy: existingRecord.returnedBy,
 department: existingRecord.department || "",
 reason: existingRecord.reason || "",
 remarks: existingRecord.remarks || "",
 status: existingRecord.status as any,
 inspectedBy: existingRecord.inspectedBy || "",
 });
 if (existingRecord.lineItems && existingRecord.lineItems.length > 0) {
 setLineItems(existingRecord.lineItems.map((item: any) => ({
 id: item.id,
 stockItemId: item.stockItemId,
 lineNumber: item.lineNumber,
 description: item.description,
 returnedQty: item.returnedQty,
 acceptedQty: item.acceptedQty || "",
 condition: item.condition || "good",
 unit: item.unit || "Piece",
 remarks: item.remarks || "",
 })));
 }
 }
 }, [existingRecord]);

 const handleAddLineItem = () => {
 setLineItems([
 ...lineItems,
 {
 lineNumber: lineItems.length + 1,
 description: "",
 returnedQty: "",
 unit: "Piece",
 condition: "good",
 },
 ]);
 };

 const handleRemoveLineItem = (index: number) => {
 if (lineItems.length === 1) {
 toast.error(t.logistics.atLeastOneLineItemIs);
 return;
 }
 const updated = lineItems.filter((_, i) => i !== index);
 // Renumber line items
 updated.forEach((item, idx) => {
 item.lineNumber = idx + 1;
 });
 setLineItems(updated);
 };

 const handleLineItemChange = (index: number, field: keyof LineItem, value: any) => {
 const updated = [...lineItems];
 updated[index] = { ...updated[index], [field]: value };
 
 // If stock item is selected, auto-fill description and unit
 if (field === "stockItemId" && value && stockItems?.items) {
 const selectedItem = stockItems.items.find((item: any) => item.id === parseInt(value));
 if (selectedItem) {
 updated[index].description = selectedItem.itemName;
 updated[index].unit = selectedItem.unitType || "Piece";
 }
 }
 
 setLineItems(updated);
 };

 const handleSubmit = async (e: React.FormEvent, saveStatus: "draft" | "submitted" | "inspected" | "accepted" | "rejected") => {
 e.preventDefault();

 // Validation
 if (!formData.returnNumber || !formData.returnedBy) {
 toast.error(t.logistics.pleaseFillAllRequiredFields);
 return;
 }

 if (lineItems.some(item => !item.description || !item.returnedQty)) {
 toast.error(t.logistics.pleaseFillAllLineItems);
 return;
 }

 // For accepted status, ensure all items have acceptedQty
 if (saveStatus === "accepted" && lineItems.some(item => !item.acceptedQty)) {
 toast.error(t.logistics.pleaseEnterAcceptedQuantityForAll);
 return;
 }

 try {
 const payload = {
 ...formData,
 status: saveStatus,
 lineItems: lineItems.map(item => ({
 stockItemId: item.stockItemId,
 lineNumber: item.lineNumber,
 description: item.description,
 returnedQty: item.returnedQty,
 acceptedQty: item.acceptedQty,
 condition: item.condition,
 unit: item.unit,
 remarks: item.remarks,
 })),
 };

 if (isEdit) {
 await updateMutation.mutateAsync({ id: parseInt(params.id!), ...payload });
 toast.success(t.logistics.updatedSuccessfully);
 } else {
 await createMutation.mutateAsync(payload);
 toast.success(t.logistics.createdSuccessfully);
 }

 navigate("/organization/logistics/stock/returns");
 } catch (error: any) {
 toast.error(error.message || (t.logistics.anErrorOccurred));
 }
 };

 const conditionLabels = {
 good: { en: "Good", ar: "جيد" },
 damaged: { en: "Damaged", ar: "تالف" },
 expired: { en: "Expired", ar: "منتهي الصلاحية" },
 defective: { en: "Defective", ar: "معيب" },
 };

 const isInspectionMode = formData.status === "submitted" || formData.status === "inspected";
 const isReadOnly = formData.status === "accepted" || formData.status === "rejected";

 return (
 <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="border-b bg-card">
 <div className="container py-6">
 <BackButton href="/organization/logistics/stock/returns" label={t.logistics.backToReturns} />
 
 <h1 className="text-2xl font-bold">
 {isEdit ? (t.logistics.editReturn) : (t.logistics.newReturn)}
 </h1>
 </div>
 </div>

 {/* Form */}
 <div className="container py-6">
 <form onSubmit={(e) => handleSubmit(e, "draft")}>
 <div className="grid gap-6">
 {/* Basic Information */}
 <Card>
 <CardHeader>
 <CardTitle>{t.logistics.basicInformation16}</CardTitle>
 </CardHeader>
 <CardContent className="grid gap-4">
 <div className="grid md:grid-cols-2 gap-4">
 <div>
 <Label htmlFor="returnNumber">{t.logistics.returnNumber} *</Label>
 <Input
 id="returnNumber"
 value={formData.returnNumber}
 onChange={(e) => setFormData({ ...formData, returnNumber: e.target.value })}
 placeholder={t.logistics.egRet2026001}
 required
 disabled={isReadOnly}
 />
 </div>
 <div>
 <Label htmlFor="returnDate">{t.logistics.returnDate} *</Label>
 <Input
 id="returnDate"
 type="date"
 value={formData.returnDate}
 onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
 required
 disabled={isReadOnly}
 />
 </div>
 </div>

 <div className="grid md:grid-cols-2 gap-4">
 <div>
 <Label htmlFor="returnedBy">{t.logistics.returnedBy} *</Label>
 <Input
 id="returnedBy"
 value={formData.returnedBy}
 onChange={(e) => setFormData({ ...formData, returnedBy: e.target.value })}
 placeholder={t.logistics.returnerName}
 required
 disabled={isReadOnly}
 />
 </div>
 <div>
 <Label htmlFor="department">{t.logistics.department}</Label>
 <Input
 id="department"
 value={formData.department}
 onChange={(e) => setFormData({ ...formData, department: e.target.value })}
 placeholder={t.logistics.departmentOrUnit}
 disabled={isReadOnly}
 />
 </div>
 </div>

 <div>
 <Label htmlFor="reason">{t.logistics.reason}</Label>
 <Input
 id="reason"
 value={formData.reason}
 onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
 placeholder={t.logistics.reasonForReturn}
 disabled={isReadOnly}
 />
 </div>

 {isInspectionMode && (
 <div>
 <Label htmlFor="inspectedBy">{t.logistics.inspectedBy}</Label>
 <Input
 id="inspectedBy"
 value={formData.inspectedBy}
 onChange={(e) => setFormData({ ...formData, inspectedBy: e.target.value })}
 placeholder={t.logistics.inspectorName}
 />
 </div>
 )}

 <div>
 <Label htmlFor="remarks">{t.logistics.remarks}</Label>
 <Textarea
 id="remarks"
 value={formData.remarks}
 onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
 placeholder={t.logistics.additionalRemarks}
 rows={3}
 disabled={isReadOnly}
 />
 </div>
 </CardContent>
 </Card>

 {/* Line Items */}
 <Card>
 <CardHeader>
 <div className="flex items-center justify-between">
 <CardTitle>{t.logistics.lineItems17}</CardTitle>
 {!isReadOnly && (
 <Button type="button" variant="outline" size="sm" onClick={handleAddLineItem}>
 <Plus className="h-4 w-4 me-2" />
 {t.logistics.addItem18}
 </Button>
 )}
 </div>
 </CardHeader>
 <CardContent>
 <div className="overflow-x-auto">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="w-12">#</TableHead>
 <TableHead>{t.logistics.stockItem}</TableHead>
 <TableHead>{t.logistics.description}</TableHead>
 <TableHead className="w-32">{t.logistics.returnedQty}</TableHead>
 {isInspectionMode && (
 <TableHead className="w-32">{t.logistics.acceptedQty}</TableHead>
 )}
 <TableHead className="w-32">{t.logistics.condition}</TableHead>
 <TableHead className="w-32">{t.logistics.unit}</TableHead>
 <TableHead>{t.logistics.remarks}</TableHead>
 {!isReadOnly && <TableHead className="w-12"></TableHead>}
 </TableRow>
 </TableHeader>
 <TableBody>
 {lineItems.map((item, index) => (
 <TableRow key={index}>
 <TableCell>{item.lineNumber}</TableCell>
 <TableCell>
 <Select
 value={item.stockItemId?.toString() || ""}
 onValueChange={(value) => handleLineItemChange(index, "stockItemId", parseInt(value))}
 disabled={isReadOnly}
 >
 <SelectTrigger>
 <SelectValue placeholder={t.logistics.selectItem} />
 </SelectTrigger>
 <SelectContent>
 {stockItems?.items?.map((stockItem: any) => (
 <SelectItem key={stockItem.id} value={stockItem.id.toString()}>
 {stockItem.itemName}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </TableCell>
 <TableCell>
 <Input
 value={item.description}
 onChange={(e) => handleLineItemChange(index, "description", e.target.value)}
 placeholder={t.logistics.description}
 required
 disabled={isReadOnly}
 />
 </TableCell>
 <TableCell>
 <Input
 type="number"
 step="0.01"
 value={item.returnedQty}
 onChange={(e) => handleLineItemChange(index, "returnedQty", e.target.value)}
 placeholder="0"
 required
 disabled={isReadOnly}
 />
 </TableCell>
 {isInspectionMode && (
 <TableCell>
 <Input
 type="number"
 step="0.01"
 value={item.acceptedQty || ""}
 onChange={(e) => handleLineItemChange(index, "acceptedQty", e.target.value)}
 placeholder="0"
 />
 </TableCell>
 )}
 <TableCell>
 <Select
 value={item.condition || "good"}
 onValueChange={(value) => handleLineItemChange(index, "condition", value)}
 disabled={isReadOnly}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {Object.entries(conditionLabels).map(([key, labels]) => (
 <SelectItem key={key} value={key}>
 {isRTL ? labels.ar : labels.en}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </TableCell>
 <TableCell>
 <Input
 value={item.unit}
 onChange={(e) => handleLineItemChange(index, "unit", e.target.value)}
 placeholder={t.placeholders.unit}
 disabled={isReadOnly}
 />
 </TableCell>
 <TableCell>
 <Input
 value={item.remarks || ""}
 onChange={(e) => handleLineItemChange(index, "remarks", e.target.value)}
 placeholder={t.logistics.remarks}
 disabled={isReadOnly}
 />
 </TableCell>
 {!isReadOnly && (
 <TableCell>
 <Button
 type="button"
 variant="ghost"
 size="icon"
 onClick={() => handleRemoveLineItem(index)}
 >
 <Trash2 className="h-4 w-4 text-destructive" />
 </Button>
 </TableCell>
 )}
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>
 </CardContent>
 </Card>

 {/* Actions */}
 {!isReadOnly && (
 <div className="flex justify-end gap-3">
 <Button type="button" variant="outline" onClick={() => navigate("/organization/logistics/stock/returns")}>
 {t.logistics.cancel}
 </Button>
 {!isInspectionMode && (
 <>
 <Button type="submit" variant="outline">
 <Save className="h-4 w-4 me-2" />
 {t.logistics.saveAsDraft}
 </Button>
 <Button type="button" onClick={(e) => handleSubmit(e, "submitted")}>
 {t.logistics.submit22}
 </Button>
 </>
 )}
 {isInspectionMode && (
 <>
 <Button type="button" variant="outline" onClick={(e) => handleSubmit(e, "inspected")}>
 {t.logistics.markInspected}
 </Button>
 <Button type="button" variant="outline" className="text-red-600" onClick={(e) => handleSubmit(e, "rejected")}>
 <XCircle className="h-4 w-4 me-2" />
 {t.logistics.reject}
 </Button>
 <Button type="button" onClick={(e) => handleSubmit(e, "accepted")}>
 <CheckCircle className="h-4 w-4 me-2" />
 {t.logistics.accept}
 </Button>
 </>
 )}
 </div>
 )}
 </div>
 </form>
 </div>
 </div>
 );
}
