/**
 * Purchase Request Form Page
 * Create and edit purchase requests with line items
 */

import { useState, useEffect } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, ArrowLeft, ArrowRight, Save, Send } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import { useTranslation } from "@/hooks/useTranslation";
import { toast } from "sonner";

interface LineItem {
  id?: number;
  budgetLine: string;
  description: string;
  descriptionAr: string;
  specifications: string;
  quantity: string;
  unit: string;
  unitPrice: string;
}

export default function PurchaseRequestForm() {
  const { user } = useAuth();
  const { isRTL } = useTranslation();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const isEdit = !!params.id;

  // Get organizationId from context (same pattern as Finance and HR modules)
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id || 1;

  const [formData, setFormData] = useState({
    prNumber: "",
    category: "goods" as "goods" | "services" | "works" | "consultancy",
    projectTitle: "",
    projectTitleAr: "",
    donor: "",
    budgetCode: "",
    subBudgetLine: "",
    activityName: "",
    totalBudgetLine: "",
    currency: "USD",
    department: "",
    requesterName: user?.name || "",
    requesterEmail: user?.email || "",
    neededByDate: "",
    urgency: "normal" as "low" | "normal" | "high" | "critical",
    deliveryLocation: "",
    deliveryLocationAr: "",
    justification: "",
    justificationAr: "",
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { budgetLine: "", description: "", descriptionAr: "", specifications: "", quantity: "1", unit: "Piece", unitPrice: "0" },
  ]);

  const { data: existingPR } = trpc.logistics.purchaseRequests.getById.useQuery(
    { id: parseInt(params.id || "0") },
    { enabled: isEdit }
  );

  useEffect(() => {
    if (existingPR) {
      setFormData({
        prNumber: existingPR.prNumber || "",
        category: existingPR.category as any || "goods",
        projectTitle: existingPR.projectTitle || "",
        projectTitleAr: existingPR.projectTitleAr || "",
        donor: existingPR.donor || "",
        budgetCode: existingPR.budgetCode || "",
        subBudgetLine: existingPR.subBudgetLine || "",
        activityName: existingPR.activityName || "",
        totalBudgetLine: existingPR.totalBudgetLine || "",
        currency: existingPR.currency || "USD",
        department: existingPR.department || "",
        requesterName: existingPR.requesterName || "",
        requesterEmail: existingPR.requesterEmail || "",
        neededByDate: existingPR.neededByDate ? new Date(existingPR.neededByDate).toISOString().split("T")[0] : "",
        urgency: existingPR.urgency as any || "normal",
        deliveryLocation: existingPR.deliveryLocation || "",
        deliveryLocationAr: existingPR.deliveryLocationAr || "",
        justification: existingPR.justification || "",
        justificationAr: existingPR.justificationAr || "",
      });
      if (existingPR.lineItems?.length) {
        setLineItems(existingPR.lineItems.map((item: any) => ({
          id: item.id,
          budgetLine: item.budgetLine || "",
          description: item.description || "",
          descriptionAr: item.descriptionAr || "",
          specifications: item.specifications || "",
          quantity: item.quantity || "1",
          unit: item.unit || "Piece",
          unitPrice: item.unitPrice || "0",
        })));
      }
    }
  }, [existingPR]);

  const createMutation = trpc.logistics.purchaseRequests.create.useMutation({
    onSuccess: () => {
      toast.success(isRTL ? "تم إنشاء طلب الشراء" : "Purchase request created");
      navigate("/logistics/purchase-requests");
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = trpc.logistics.purchaseRequests.update.useMutation({
    onSuccess: () => {
      toast.success(isRTL ? "تم تحديث طلب الشراء" : "Purchase request updated");
      navigate("/logistics/purchase-requests");
    },
    onError: (error) => toast.error(error.message),
  });

  const addLineItem = () => {
    setLineItems([...lineItems, { budgetLine: "", description: "", descriptionAr: "", specifications: "", quantity: "1", unit: "Piece", unitPrice: "0" }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      return sum + qty * price;
    }, 0);
  };

  const handleSubmit = (status: "draft" | "submitted") => {
    const payload = {
      organizationId,
      ...formData,
      neededByDate: formData.neededByDate ? new Date(formData.neededByDate) : undefined,
      status,
      lineItems: lineItems.map((item) => ({
        budgetLine: item.budgetLine,
        description: item.description,
        descriptionAr: item.descriptionAr,
        specifications: item.specifications,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
      })),
    };

    if (isEdit) {
      updateMutation.mutate({ id: parseInt(params.id!), ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/logistics/purchase-requests">
                  {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {isEdit ? (isRTL ? "تعديل طلب الشراء" : "Edit Purchase Request") : (isRTL ? "طلب شراء جديد" : "New Purchase Request")}
                </h1>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleSubmit("draft")} disabled={createMutation.isPending || updateMutation.isPending}>
                <Save className="h-4 w-4 me-2" />
                {isRTL ? "حفظ كمسودة" : "Save Draft"}
              </Button>
              <Button onClick={() => handleSubmit("submitted")} disabled={createMutation.isPending || updateMutation.isPending}>
                <Send className="h-4 w-4 me-2" />
                {isRTL ? "إرسال للموافقة" : "Submit for Approval"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6 space-y-6">
        <Card>
          <CardHeader><CardTitle>{isRTL ? "معلومات أساسية" : "Basic Information"}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><Label>{isRTL ? "رقم الطلب" : "PR Number"}</Label><Input value={formData.prNumber} onChange={(e) => setFormData({ ...formData, prNumber: e.target.value })} placeholder="PR-2024-001" /></div>
            <div><Label>{isRTL ? "الفئة" : "Category"}</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="goods">{isRTL ? "سلع" : "Goods"}</SelectItem>
                  <SelectItem value="services">{isRTL ? "خدمات" : "Services"}</SelectItem>
                  <SelectItem value="works">{isRTL ? "أعمال" : "Works"}</SelectItem>
                  <SelectItem value="consultancy">{isRTL ? "استشارات" : "Consultancy"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>{isRTL ? "الأولوية" : "Urgency"}</Label>
              <Select value={formData.urgency} onValueChange={(v) => setFormData({ ...formData, urgency: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{isRTL ? "منخفضة" : "Low"}</SelectItem>
                  <SelectItem value="normal">{isRTL ? "عادية" : "Normal"}</SelectItem>
                  <SelectItem value="high">{isRTL ? "عالية" : "High"}</SelectItem>
                  <SelectItem value="critical">{isRTL ? "حرجة" : "Critical"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2"><Label>{isRTL ? "عنوان المشروع (إنجليزي)" : "Project Title (English)"}</Label><Input value={formData.projectTitle} onChange={(e) => setFormData({ ...formData, projectTitle: e.target.value })} /></div>
            <div><Label>{isRTL ? "عنوان المشروع (عربي)" : "Project Title (Arabic)"}</Label><Input value={formData.projectTitleAr} onChange={(e) => setFormData({ ...formData, projectTitleAr: e.target.value })} dir="rtl" /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{isRTL ? "معلومات الميزانية" : "Budget Information"}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div><Label>{isRTL ? "المانح" : "Donor"}</Label><Input value={formData.donor} onChange={(e) => setFormData({ ...formData, donor: e.target.value })} /></div>
            <div><Label>{isRTL ? "رمز الميزانية" : "Budget Code"}</Label><Input value={formData.budgetCode} onChange={(e) => setFormData({ ...formData, budgetCode: e.target.value })} /></div>
            <div><Label>{isRTL ? "بند الميزانية الفرعي" : "Sub Budget Line"}</Label><Input value={formData.subBudgetLine} onChange={(e) => setFormData({ ...formData, subBudgetLine: e.target.value })} /></div>
            <div><Label>{isRTL ? "العملة" : "Currency"}</Label>
              <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="GBP">GBP</SelectItem><SelectItem value="SAR">SAR</SelectItem><SelectItem value="AED">AED</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{isRTL ? "معلومات مقدم الطلب" : "Requester Information"}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div><Label>{isRTL ? "اسم مقدم الطلب" : "Requester Name"}</Label><Input value={formData.requesterName} onChange={(e) => setFormData({ ...formData, requesterName: e.target.value })} /></div>
            <div><Label>{isRTL ? "البريد الإلكتروني" : "Email"}</Label><Input type="email" value={formData.requesterEmail} onChange={(e) => setFormData({ ...formData, requesterEmail: e.target.value })} /></div>
            <div><Label>{isRTL ? "القسم" : "Department"}</Label><Input value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} /></div>
            <div><Label>{isRTL ? "تاريخ الحاجة" : "Needed By Date"}</Label><Input type="date" value={formData.neededByDate} onChange={(e) => setFormData({ ...formData, neededByDate: e.target.value })} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{isRTL ? "بنود الطلب" : "Line Items"}</CardTitle>
              <Button variant="outline" size="sm" onClick={addLineItem}><Plus className="h-4 w-4 me-2" />{isRTL ? "إضافة بند" : "Add Item"}</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>{isRTL ? "الوصف" : "Description"}</TableHead>
                  <TableHead className="w-[100px]">{isRTL ? "الكمية" : "Qty"}</TableHead>
                  <TableHead className="w-[100px]">{isRTL ? "الوحدة" : "Unit"}</TableHead>
                  <TableHead className="w-[120px]">{isRTL ? "سعر الوحدة" : "Unit Price"}</TableHead>
                  <TableHead className="w-[120px]">{isRTL ? "الإجمالي" : "Total"}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell><Input value={item.description} onChange={(e) => updateLineItem(index, "description", e.target.value)} placeholder={isRTL ? "وصف البند" : "Item description"} /></TableCell>
                    <TableCell><Input type="number" min="1" value={item.quantity} onChange={(e) => updateLineItem(index, "quantity", e.target.value)} /></TableCell>
                    <TableCell>
                      <Select value={item.unit} onValueChange={(v) => updateLineItem(index, "unit", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Piece">Piece</SelectItem><SelectItem value="Box">Box</SelectItem><SelectItem value="Set">Set</SelectItem><SelectItem value="Kg">Kg</SelectItem><SelectItem value="Liter">Liter</SelectItem><SelectItem value="Meter">Meter</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateLineItem(index, "unitPrice", e.target.value)} /></TableCell>
                    <TableCell className="font-medium">{((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)).toFixed(2)}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => removeLineItem(index)} disabled={lineItems.length === 1}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex justify-end">
              <div className="text-lg font-bold">{isRTL ? "الإجمالي:" : "Total:"} {formData.currency} {calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{isRTL ? "المبررات" : "Justification"}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>{isRTL ? "المبرر (إنجليزي)" : "Justification (English)"}</Label><Textarea rows={4} value={formData.justification} onChange={(e) => setFormData({ ...formData, justification: e.target.value })} /></div>
            <div><Label>{isRTL ? "المبرر (عربي)" : "Justification (Arabic)"}</Label><Textarea rows={4} value={formData.justificationAr} onChange={(e) => setFormData({ ...formData, justificationAr: e.target.value })} dir="rtl" /></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
