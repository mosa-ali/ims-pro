import { useState, useEffect } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOperatingUnit } from "@/contexts/OperatingUnitContext";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export default function DriversForm() {
 const { t } = useTranslation();
 const [, setLocation] = useLocation();
 const [, params] = useRoute("/organization/logistics/fleet/drivers/:id");
 const [, editParams] = useRoute("/organization/logistics/fleet/drivers/:id/edit");
 const driverId = params?.id || editParams?.id;
 const isEditMode = !!driverId;
 const { isRTL } = useLanguage();
 const { currentOrganization } = useOrganization();
 const { currentOperatingUnit } = useOperatingUnit();

 const [formData, setFormData] = useState({
 driverName: "",
 licenseNumber: "",
 licenseExpiry: "",
 phoneNumber: "",
 email: "",
 address: "",
 emergencyContact: "",
 emergencyPhone: "",
 status: "active",
 notes: "",
 });

 const { data: driver, isLoading } = trpc.logistics.drivers.getById.useQuery(
 { id: parseInt(driverId!) },
 { enabled: isEditMode }
 );

 const createMutation = trpc.logistics.drivers.create.useMutation();
 const updateMutation = trpc.logistics.drivers.update.useMutation();
 const utils = trpc.useUtils();

 useEffect(() => {
 if (driver) {
 setFormData({
 driverName: driver.driverName || "",
 licenseNumber: driver.licenseNumber || "",
 licenseExpiry: driver.licenseExpiry || "",
 phoneNumber: driver.phoneNumber || "",
 email: driver.email || "",
 address: driver.address || "",
 emergencyContact: driver.emergencyContact || "",
 emergencyPhone: driver.emergencyPhone || "",
 status: driver.status || "active",
 notes: driver.notes || "",
 });
 }
 }, [driver]);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 try {
 const payload = {
 ...formData,
 organizationId: currentOrganization?.id!,
 operatingUnitId: currentOperatingUnit?.id!,
 };

 if (isEditMode) {
 await updateMutation.mutateAsync({ id: parseInt(driverId!), ...payload });
 } else {
 await createMutation.mutateAsync(payload);
 }

 utils.logistics.drivers.list.invalidate();
 setLocation("/organization/logistics/fleet/drivers");
 } catch (error) {
 console.error("Error saving driver:", error);
 }
 };

 const labels = {
 title: isEditMode ? (t.logistics.editDriver) : (t.logistics.newDriver),
 driverName: t.logistics.driverName,
 licenseNumber: t.logistics.licenseNumber,
 licenseExpiry: t.logistics.licenseExpiry,
 phoneNumber: t.logistics.phoneNumber,
 email: t.logistics.email,
 address: t.logistics.address,
 emergencyContact: t.logistics.emergencyContact,
 emergencyPhone: t.logistics.emergencyPhone,
 status: t.logistics.status,
 notes: t.logistics.notes,
 save: t.logistics.save,
 cancel: t.logistics.cancel,
 loading: t.logistics.loading,
 active: t.logistics.active,
 inactive: t.logistics.inactive,
 };

 if (isLoading) {
 return (
 <div className="min-h-screen bg-background p-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="container max-w-4xl">
 <div className="text-center py-12">{labels.loading}</div>
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-background p-6">
 <div className="container max-w-4xl">
 <div className="flex items-center gap-4 mb-6">
 <BackButton href="/organization/logistics/fleet/drivers" iconOnly />
 <h1 className="text-3xl font-bold text-foreground">{labels.title}</h1>
 </div>

 <form onSubmit={handleSubmit}>
 <Card className="mb-6">
 <CardHeader>
 <CardTitle>{t.logistics.driverInformation}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label htmlFor="driverName">{labels.driverName} *</Label>
 <Input
 id="driverName"
 value={formData.driverName}
 onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
 required
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="licenseNumber">{labels.licenseNumber} *</Label>
 <Input
 id="licenseNumber"
 value={formData.licenseNumber}
 onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
 required
 />
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label htmlFor="licenseExpiry">{labels.licenseExpiry}</Label>
 <Input
 id="licenseExpiry"
 type="date"
 value={formData.licenseExpiry}
 onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="phoneNumber">{labels.phoneNumber}</Label>
 <Input
 id="phoneNumber"
 type="tel"
 value={formData.phoneNumber}
 onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
 />
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label htmlFor="email">{labels.email}</Label>
 <Input
 id="email"
 type="email"
 value={formData.email}
 onChange={(e) => setFormData({ ...formData, email: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="status">{labels.status}</Label>
 <select
 id="status"
 className="w-full h-10 px-3 rounded-md border border-input bg-background"
 value={formData.status}
 onChange={(e) => setFormData({ ...formData, status: e.target.value })}
 >
 <option value="active">{labels.active}</option>
 <option value="inactive">{labels.inactive}</option>
 </select>
 </div>
 </div>

 <div className="space-y-2">
 <Label htmlFor="address">{labels.address}</Label>
 <Textarea
 id="address"
 value={formData.address}
 onChange={(e) => setFormData({ ...formData, address: e.target.value })}
 rows={2}
 />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label htmlFor="emergencyContact">{labels.emergencyContact}</Label>
 <Input
 id="emergencyContact"
 value={formData.emergencyContact}
 onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="emergencyPhone">{labels.emergencyPhone}</Label>
 <Input
 id="emergencyPhone"
 type="tel"
 value={formData.emergencyPhone}
 onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
 />
 </div>
 </div>

 <div className="space-y-2">
 <Label htmlFor="notes">{labels.notes}</Label>
 <Textarea
 id="notes"
 value={formData.notes}
 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
 rows={3}
 />
 </div>
 </CardContent>
 </Card>

 <div className="flex justify-end gap-4">
 <Button
 type="button"
 variant="outline"
 onClick={() => setLocation("/organization/logistics/fleet/drivers")}
 >
 {labels.cancel}
 </Button>
 <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
 <Save className="h-4 w-4 me-2" />
 {labels.save}
 </Button>
 </div>
 </form>
 </div>
 </div>
 );
}
