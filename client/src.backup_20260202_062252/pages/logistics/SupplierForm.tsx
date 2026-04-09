/**
 * Supplier Form Page
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import { useTranslation } from "@/hooks/useTranslation";
import { toast } from "sonner";

export default function SupplierForm() {
  const { user } = useAuth();
  const { isRTL } = useTranslation();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const isEdit = !!params.id;
  // Get organizationId from context (same pattern as Finance and HR modules)
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id || 1;

  const [formData, setFormData] = useState({
    supplierCode: "", name: "", nameAr: "", category: "goods" as "goods" | "services" | "works" | "consultancy",
    email: "", phone: "", address: "", addressAr: "", city: "", country: "", taxNumber: "", registrationNumber: "",
    bankName: "", bankAccount: "", iban: "", swiftCode: "", contactPerson: "", contactPhone: "", contactEmail: "",
    website: "", notes: "", notesAr: "", status: "active" as "active" | "inactive" | "suspended" | "pending",
  });

  const { data: existingSupplier } = trpc.logistics.suppliers.getById.useQuery({ id: parseInt(params.id || "0") }, { enabled: isEdit });

  useEffect(() => {
    if (existingSupplier) {
      setFormData({
        supplierCode: existingSupplier.supplierCode || "", name: existingSupplier.name || "", nameAr: existingSupplier.nameAr || "",
        category: existingSupplier.category as any || "goods", email: existingSupplier.email || "", phone: existingSupplier.phone || "",
        address: existingSupplier.address || "", addressAr: existingSupplier.addressAr || "", city: existingSupplier.city || "",
        country: existingSupplier.country || "", taxNumber: existingSupplier.taxNumber || "", registrationNumber: existingSupplier.registrationNumber || "",
        bankName: existingSupplier.bankName || "", bankAccount: existingSupplier.bankAccount || "", iban: existingSupplier.iban || "",
        swiftCode: existingSupplier.swiftCode || "", contactPerson: existingSupplier.contactPerson || "", contactPhone: existingSupplier.contactPhone || "",
        contactEmail: existingSupplier.contactEmail || "", website: existingSupplier.website || "", notes: existingSupplier.notes || "",
        notesAr: existingSupplier.notesAr || "", status: existingSupplier.status as any || "active",
      });
    }
  }, [existingSupplier]);

  const createMutation = trpc.logistics.suppliers.create.useMutation({
    onSuccess: () => { toast.success(isRTL ? "تم إنشاء المورد" : "Supplier created"); navigate("/logistics/suppliers"); },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = trpc.logistics.suppliers.update.useMutation({
    onSuccess: () => { toast.success(isRTL ? "تم تحديث المورد" : "Supplier updated"); navigate("/logistics/suppliers"); },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = () => {
    if (isEdit) updateMutation.mutate({ id: parseInt(params.id!), organizationId, ...formData });
    else createMutation.mutate({ organizationId, ...formData });
  };

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild><Link href="/logistics/suppliers">{isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}</Link></Button>
              <h1 className="text-2xl font-bold">{isEdit ? (isRTL ? "تعديل المورد" : "Edit Supplier") : (isRTL ? "مورد جديد" : "New Supplier")}</h1>
            </div>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}><Save className="h-4 w-4 me-2" />{isRTL ? "حفظ" : "Save"}</Button>
          </div>
        </div>
      </div>

      <div className="container py-6 space-y-6">
        <Card>
          <CardHeader><CardTitle>{isRTL ? "معلومات أساسية" : "Basic Information"}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><Label>{isRTL ? "رمز المورد" : "Supplier Code"}</Label><Input value={formData.supplierCode} onChange={(e) => setFormData({ ...formData, supplierCode: e.target.value })} /></div>
            <div><Label>{isRTL ? "الاسم (إنجليزي)" : "Name (English)"}</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
            <div><Label>{isRTL ? "الاسم (عربي)" : "Name (Arabic)"}</Label><Input value={formData.nameAr} onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })} dir="rtl" /></div>
            <div><Label>{isRTL ? "الفئة" : "Category"}</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v as any })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="goods">{isRTL ? "سلع" : "Goods"}</SelectItem><SelectItem value="services">{isRTL ? "خدمات" : "Services"}</SelectItem><SelectItem value="works">{isRTL ? "أعمال" : "Works"}</SelectItem><SelectItem value="consultancy">{isRTL ? "استشارات" : "Consultancy"}</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>{isRTL ? "الحالة" : "Status"}</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as any })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">{isRTL ? "نشط" : "Active"}</SelectItem><SelectItem value="inactive">{isRTL ? "غير نشط" : "Inactive"}</SelectItem><SelectItem value="suspended">{isRTL ? "معلق" : "Suspended"}</SelectItem><SelectItem value="pending">{isRTL ? "قيد الانتظار" : "Pending"}</SelectItem></SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{isRTL ? "معلومات الاتصال" : "Contact Information"}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><Label>{isRTL ? "البريد الإلكتروني" : "Email"}</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
            <div><Label>{isRTL ? "الهاتف" : "Phone"}</Label><Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
            <div><Label>{isRTL ? "الموقع الإلكتروني" : "Website"}</Label><Input value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>{isRTL ? "العنوان (إنجليزي)" : "Address (English)"}</Label><Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} /></div>
            <div><Label>{isRTL ? "العنوان (عربي)" : "Address (Arabic)"}</Label><Input value={formData.addressAr} onChange={(e) => setFormData({ ...formData, addressAr: e.target.value })} dir="rtl" /></div>
            <div><Label>{isRTL ? "المدينة" : "City"}</Label><Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} /></div>
            <div><Label>{isRTL ? "الدولة" : "Country"}</Label><Input value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{isRTL ? "جهة الاتصال" : "Contact Person"}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label>{isRTL ? "اسم جهة الاتصال" : "Contact Person"}</Label><Input value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} /></div>
            <div><Label>{isRTL ? "هاتف جهة الاتصال" : "Contact Phone"}</Label><Input value={formData.contactPhone} onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })} /></div>
            <div><Label>{isRTL ? "بريد جهة الاتصال" : "Contact Email"}</Label><Input type="email" value={formData.contactEmail} onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{isRTL ? "المعلومات البنكية" : "Banking Information"}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div><Label>{isRTL ? "اسم البنك" : "Bank Name"}</Label><Input value={formData.bankName} onChange={(e) => setFormData({ ...formData, bankName: e.target.value })} /></div>
            <div><Label>{isRTL ? "رقم الحساب" : "Account Number"}</Label><Input value={formData.bankAccount} onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })} /></div>
            <div><Label>IBAN</Label><Input value={formData.iban} onChange={(e) => setFormData({ ...formData, iban: e.target.value })} /></div>
            <div><Label>SWIFT Code</Label><Input value={formData.swiftCode} onChange={(e) => setFormData({ ...formData, swiftCode: e.target.value })} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{isRTL ? "معلومات قانونية" : "Legal Information"}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>{isRTL ? "الرقم الضريبي" : "Tax Number"}</Label><Input value={formData.taxNumber} onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })} /></div>
            <div><Label>{isRTL ? "رقم التسجيل" : "Registration Number"}</Label><Input value={formData.registrationNumber} onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{isRTL ? "ملاحظات" : "Notes"}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>{isRTL ? "ملاحظات (إنجليزي)" : "Notes (English)"}</Label><Textarea rows={4} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} /></div>
            <div><Label>{isRTL ? "ملاحظات (عربي)" : "Notes (Arabic)"}</Label><Textarea rows={4} value={formData.notesAr} onChange={(e) => setFormData({ ...formData, notesAr: e.target.value })} dir="rtl" /></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
