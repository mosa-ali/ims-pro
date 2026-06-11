import { useState, useEffect } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Plus, Trash2, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";
import { toast } from "sonner";

interface LineItem {
  stockItemId: string;
  quantityRequested: string;
  unit: string;
  notes: string;
}

export default function StockRequestsForm() {
 const { t } = useTranslation();
 const [, setLocation] = useLocation();
 const [, params] = useRoute("/organization/logistics/stock/requests/:id");
 const [, editParams] = useRoute("/organization/logistics/stock/requests/:id/edit");
 const requestId = params?.id || editParams?.id;
 const isEditMode = !!requestId;
 const { data: existingRequest } =
  trpc.logistics.stockMgmt.requests.getById.useQuery(
    { id: Number(requestId) },
    {
      enabled: !!requestId,
    }
  );
 const { isRTL } = useLanguage();

 const [formData, setFormData] = useState({
 requestNumber: "",
 requestDate: new Date().toISOString().split("T")[0],
 requestedBy: "",
 department: "",
 purpose: "",
 remarks: "",
 status: "draft",
 });

 const [lineItems, setLineItems] = useState<LineItem[]>([
 { stockItemId: "", quantityRequested: "", unit: "", notes: "" },
 ]);

 const [isSaving, setIsSaving] = useState(false);

 const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

 const { data: stockItemsData } =
    trpc.logistics.stock.listItems.useQuery({});
    const stockItems = stockItemsData?.items ?? [];

 const utils = trpc.useUtils();

 // tRPC mutations - CORRECTED PATH
 const createRequestMutation = trpc.logistics.stockMgmt.requests.create.useMutation({
   onSuccess: (data: any) => {
     toast.success(t.logistics?.createdSuccessfully || "Stock Request created successfully");
     utils.logistics.stockMgmt.requests.list.invalidate();
     setLocation("/organization/logistics/stock/requests");
   },
   onError: (error: any) => {
     toast.error(error.message || t.common?.errorOccurred);
     setIsSaving(false);
   },
 });

 const handleAddLineItem = () => {
 setLineItems([...lineItems, { stockItemId: "", quantityRequested: "", unit: "", notes: "" }]);
 };

 const handleRemoveLineItem = (index: number) => {
 setLineItems(lineItems.filter((_, i) => i !== index));
 };

 const handleLineItemChange = (index: number, field: string, value: any) => {
 const updated = [...lineItems];
 updated[index] = { ...updated[index], [field]: value };
 setLineItems(updated);
 };

 const handleSubmit = async (e: React.FormEvent, status: string = "draft") => {
 e.preventDefault();
 
 // Validate form
 if (!formData.requestedBy.trim()) {
   toast.error((t.logistics?.requestedBy || "Requester") + " " + (t.common?.required || "is required"));
   return;
 }

 const validLineItems = lineItems.filter(item => item.stockItemId && item.quantityRequested);
 if (validLineItems.length === 0) {
   toast.error(t.logistics?.atLeastOneLineItemIs || "At least one line item is required");
   return;
 }

 try {
   setIsSaving(true);

   // Transform line items to match backend schema
   const payload = {
     requesterName: formData.requestedBy,
     requesterDepartment: formData.department || undefined,
     purpose: formData.purpose || undefined,
     neededByDate: formData.requestDate || undefined,
     lines: validLineItems.map(item => ({
       stockItemId: parseInt(item.stockItemId),
       description: item.notes || "",
       requestedQty: String(item.quantityRequested),
       unit: item.unit || "Piece",
       remarks: item.notes || undefined,
     })),
   };

   // Call the tRPC mutation to save to database
   await createRequestMutation.mutateAsync(payload);
 } catch (error) {
   console.error("Error saving request:", error);
   // Error is already handled by onError callback
 } finally {
   setIsSaving(false);
 }
 };

 useEffect(() => {
  if (!existingRequest) return;

  setFormData({
    requestNumber: existingRequest.requestNumber || "",
    requestDate: existingRequest.neededByDate
      ? new Date(existingRequest.neededByDate)
          .toISOString()
          .split("T")[0]
      : new Date().toISOString().split("T")[0],

    requestedBy: existingRequest.requesterName || "",
    department: existingRequest.requesterDepartment || "",
    purpose: existingRequest.purpose || "",
    remarks: existingRequest.remarks || "",
    status: existingRequest.status || "draft",
  });

  if (existingRequest.lines?.length) {
    setLineItems(
      existingRequest.lines.map((line: any) => ({
        stockItemId: String(line.stockItemId),
        quantityRequested: String(line.requestedQty || ""),
        unit: line.unit || "Piece",
        notes: line.remarks || "",
      }))
    );
  }
}, [existingRequest]);

 return (
 <div className="min-h-screen bg-background p-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="container max-w-6xl">
 <div className="flex items-center gap-4 mb-6">
 <BackButton href="/organization/logistics/stock/requests" iconOnly />
 <h1 className="text-3xl font-bold text-foreground">
   {isEditMode ? t.logistics?.editRequest : t.logistics?.newRequest}
 </h1>
 </div>

 <form onSubmit={(e) => handleSubmit(e, "submitted")}>
 <Card className="mb-6">
 <CardHeader>
 <CardTitle>{t.logistics?.requestInformation}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label htmlFor="requestNumber">{t.logistics?.requestNumber}</Label>
 <Input
 id="requestNumber"
 value={formData.requestNumber}
 placeholder={t.logistics?.autogenerated}
 disabled
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="requestDate">{t.logistics?.requestDate} *</Label>
 <Input
 id="requestDate"
 type="date"
 value={formData.requestDate}
 onChange={(e) => setFormData({ ...formData, requestDate: e.target.value })}
 required
 />
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label htmlFor="requestedBy">{t.logistics?.requestedBy} *</Label>
 <Input
 id="requestedBy"
 value={formData.requestedBy}
 onChange={(e) => setFormData({ ...formData, requestedBy: e.target.value })}
 required
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="department">{t.logistics?.department}</Label>
 <Input
 id="department"
 value={formData.department}
 onChange={(e) => setFormData({ ...formData, department: e.target.value })}
 />
 </div>
 </div>

 <div className="space-y-2">
 <Label htmlFor="purpose">{t.logistics?.purpose}</Label>
 <Textarea
 id="purpose"
 value={formData.purpose}
 onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
 rows={2}
 />
 </div>

 <div className="space-y-2">
 <Label htmlFor="remarks">{t.logistics?.remarks}</Label>
 <Textarea
 id="remarks"
 value={formData.remarks}
 onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
 rows={2}
 />
 </div>
 </CardContent>
 </Card>

 <Card className="mb-6">
 <CardHeader>
 <div className="flex items-center justify-between">
 <CardTitle>{t.logistics?.requestedItems}</CardTitle>
 <Button type="button" variant="outline" size="sm" onClick={handleAddLineItem} disabled={isSaving}>
 <Plus className="h-4 w-4 me-2" />
 {t.logistics?.addItem20}
 </Button>
 </div>
 </CardHeader>
 <CardContent className="space-y-4">
 {lineItems.map((item, index) => (
 <div key={index} className="grid grid-cols-12 gap-4 items-end">
 <div className="col-span-4 space-y-2">
 <Label>{t.logistics?.item}</Label>
 <select
 className="w-full h-10 px-3 rounded-md border border-input bg-background"
 value={item.stockItemId}
 onChange={(e) => handleLineItemChange(index, "stockItemId", e.target.value)}
 disabled={isSaving}
 >
 <option value="">{t.common?.select}...</option>
 {Array.isArray(stockItems) &&
  stockItems.map((stockItem: any) => (
 <option key={stockItem.id} value={stockItem.id}>
 {stockItem.itemName}
 </option>
 ))}
 </select>
 </div>
 <div className="col-span-2 space-y-2">
 <Label>{t.logistics?.quantity}</Label>
 <Input
 type="number"
 value={item.quantityRequested}
 onChange={(e) => handleLineItemChange(index, "quantityRequested", e.target.value)}
 disabled={isSaving}
 />
 </div>
 <div className="col-span-2 space-y-2">
 <Label>{t.logistics?.unit}</Label>
 <Input
 value={item.unit}
 onChange={(e) => handleLineItemChange(index, "unit", e.target.value)}
 disabled={isSaving}
 placeholder="Piece"
 />
 </div>
 <div className="col-span-3 space-y-2">
 <Label>{t.logistics?.notes}</Label>
 <Input
 value={item.notes}
 onChange={(e) => handleLineItemChange(index, "notes", e.target.value)}
 disabled={isSaving}
 />
 </div>
 <div className="col-span-1">
 <Button
 type="button"
 variant="ghost"
 size="icon"
 onClick={() => handleRemoveLineItem(index)}
 disabled={isSaving}
 >
 <Trash2 className="h-4 w-4 text-destructive" />
 </Button>
 </div>
 </div>
 ))}
 </CardContent>
 </Card>

 <div className="flex justify-end gap-4">
 <Button
 type="button"
 variant="outline"
 onClick={() => setLocation("/organization/logistics/stock/requests")}
 disabled={isSaving}
 >
 {t.common?.cancel}
 </Button>
 <Button 
   type="submit" 
   variant="outline"
   disabled={isSaving}
   onClick={(e: any) => {
     e.preventDefault();
     handleSubmit(e, "draft");
   }}
 >
 <Save className="h-4 w-4 me-2" />
 {t.logistics?.saveDraft}
 </Button>
 <Button 
   type="submit"
   disabled={isSaving}
 >
   {isSaving ? (
     <>
       <Loader2 className="h-4 w-4 me-2 animate-spin" />
       {t.common?.savingChanges || t.financeModule?.saving}
     </>
   ) : (
     t.common?.submit
   )}
 </Button>
 </div>
 </form>
 </div>
 </div>
 );
}
