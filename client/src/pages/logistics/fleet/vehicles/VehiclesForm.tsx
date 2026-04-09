import { useState, useEffect } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOperatingUnit } from "@/contexts/OperatingUnitContext";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export default function VehiclesForm() {
 const { t } = useTranslation();
 const [, setLocation] = useLocation();
 const [, params] = useRoute("/organization/logistics/fleet/vehicles/:id");
 const [, editParams] = useRoute("/organization/logistics/fleet/vehicles/:id/edit");
 const vehicleId = params?.id || editParams?.id;
 const isEditMode = !!vehicleId;

 const { language, isRTL } = useLanguage();
 const { currentOrganization } = useOrganization();
 const { currentOperatingUnit } = useOperatingUnit();

 const [formData, setFormData] = useState({
 vehicleNumber: "",
 make: "",
 model: "",
 year: "",
 vehicleType: "",
 fuelType: "",
 registrationNumber: "",
 chassisNumber: "",
 engineNumber: "",
 color: "",
 purchaseDate: "",
 purchasePrice: "",
 currentOdometer: "",
 status: "active",
 insuranceProvider: "",
 insuranceExpiry: "",
 remarks: "",
 });

 const { data: vehicle, isLoading } = trpc.logistics.vehicles.getById.useQuery(
 { id: parseInt(vehicleId!) },
 { enabled: isEditMode }
 );

 const createMutation = trpc.logistics.vehicles.create.useMutation();
 const updateMutation = trpc.logistics.vehicles.update.useMutation();
 const utils = trpc.useUtils();

 useEffect(() => {
 if (vehicle) {
 setFormData({
 vehicleNumber: vehicle.vehicleNumber || "",
 make: vehicle.make || "",
 model: vehicle.model || "",
 year: vehicle.year?.toString() || "",
 vehicleType: vehicle.vehicleType || "",
 fuelType: vehicle.fuelType || "",
 registrationNumber: vehicle.registrationNumber || "",
 chassisNumber: vehicle.chassisNumber || "",
 engineNumber: vehicle.engineNumber || "",
 color: vehicle.color || "",
 purchaseDate: vehicle.purchaseDate || "",
 purchasePrice: vehicle.purchasePrice || "",
 currentOdometer: vehicle.currentOdometer?.toString() || "",
 status: vehicle.status || "active",
 insuranceProvider: vehicle.insuranceProvider || "",
 insuranceExpiry: vehicle.insuranceExpiry || "",
 remarks: vehicle.remarks || "",
 });
 }
 }, [vehicle]);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 try {
 if (isEditMode) {
 await updateMutation.mutateAsync({
 id: parseInt(vehicleId!),
 ...formData,
 year: parseInt(formData.year) || undefined,
 currentOdometer: parseInt(formData.currentOdometer) || undefined,
 });
 } else {
 await createMutation.mutateAsync({
 ...formData,
 year: parseInt(formData.year) || undefined,
 currentOdometer: parseInt(formData.currentOdometer) || undefined,
 });
 }
 utils.logistics.vehicles.list.invalidate();
 setLocation("/organization/logistics/fleet/vehicles");
 } catch (error) {
 console.error("Error saving vehicle:", error);
 }
 };

 const labels = {
 title: isEditMode ? (t.logistics.editVehicle) : (t.logistics.addVehicle),
 vehicleNumber: t.logistics.vehicleNumber,
 make: t.logistics.make,
 model: t.logistics.model,
 year: t.logistics.year,
 vehicleType: t.logistics.vehicleType,
 fuelType: t.logistics.fuelType,
 registrationNumber: t.logistics.registrationNumber,
 chassisNumber: t.logistics.chassisNumber,
 engineNumber: t.logistics.engineNumber,
 color: t.logistics.color,
 purchaseDate: t.logistics.purchaseDate,
 purchasePrice: t.logistics.purchasePrice,
 currentOdometer: t.logistics.currentOdometer,
 status: t.logistics.status,
 active: t.logistics.active,
 maintenance: t.logistics.maintenance14,
 inactive: t.logistics.inactive,
 insuranceProvider: t.logistics.insuranceProvider,
 insuranceExpiry: t.logistics.insuranceExpiry,
 remarks: t.logistics.remarks,
 save: t.logistics.save,
 cancel: t.logistics.cancel,
 loading: t.logistics.loading,
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
 {/* Header */}
 <div className="flex items-center gap-4 mb-6">
 <BackButton href="/organization/logistics/fleet/vehicles" iconOnly />
 <h1 className="text-3xl font-bold text-foreground">{labels.title}</h1>
 </div>

 {/* Form */}
 <form onSubmit={handleSubmit}>
 <Card>
 <CardHeader>
 <CardTitle>{t.logistics.vehicleInformation}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label htmlFor="vehicleNumber">{labels.vehicleNumber} *</Label>
 <Input
 id="vehicleNumber"
 value={formData.vehicleNumber}
 onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
 required
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="registrationNumber">{labels.registrationNumber}</Label>
 <Input
 id="registrationNumber"
 value={formData.registrationNumber}
 onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
 />
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="space-y-2">
 <Label htmlFor="make">{labels.make} *</Label>
 <Input
 id="make"
 value={formData.make}
 onChange={(e) => setFormData({ ...formData, make: e.target.value })}
 required
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="model">{labels.model} *</Label>
 <Input
 id="model"
 value={formData.model}
 onChange={(e) => setFormData({ ...formData, model: e.target.value })}
 required
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="year">{labels.year}</Label>
 <Input
 id="year"
 type="number"
 value={formData.year}
 onChange={(e) => setFormData({ ...formData, year: e.target.value })}
 />
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label htmlFor="vehicleType">{labels.vehicleType}</Label>
 <Select
 value={formData.vehicleType}
 onValueChange={(value) => setFormData({ ...formData, vehicleType: value })}
 >
 <SelectTrigger>
 <SelectValue placeholder={labels.vehicleType} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="sedan">{t.logistics.sedan}</SelectItem>
 <SelectItem value="suv">{t.logistics.suv}</SelectItem>
 <SelectItem value="truck">{t.logistics.truck}</SelectItem>
 <SelectItem value="van">{t.logistics.van}</SelectItem>
 <SelectItem value="bus">{t.logistics.bus}</SelectItem>
 <SelectItem value="motorcycle">{t.logistics.motorcycle}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2">
 <Label htmlFor="fuelType">{labels.fuelType}</Label>
 <Select
 value={formData.fuelType}
 onValueChange={(value) => setFormData({ ...formData, fuelType: value })}
 >
 <SelectTrigger>
 <SelectValue placeholder={labels.fuelType} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="petrol">{t.logistics.petrol}</SelectItem>
 <SelectItem value="diesel">{t.logistics.diesel}</SelectItem>
 <SelectItem value="electric">{t.logistics.electric}</SelectItem>
 <SelectItem value="hybrid">{t.logistics.hybrid}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="space-y-2">
 <Label htmlFor="chassisNumber">{labels.chassisNumber}</Label>
 <Input
 id="chassisNumber"
 value={formData.chassisNumber}
 onChange={(e) => setFormData({ ...formData, chassisNumber: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="engineNumber">{labels.engineNumber}</Label>
 <Input
 id="engineNumber"
 value={formData.engineNumber}
 onChange={(e) => setFormData({ ...formData, engineNumber: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="color">{labels.color}</Label>
 <Input
 id="color"
 value={formData.color}
 onChange={(e) => setFormData({ ...formData, color: e.target.value })}
 />
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="space-y-2">
 <Label htmlFor="purchaseDate">{labels.purchaseDate}</Label>
 <Input
 id="purchaseDate"
 type="date"
 value={formData.purchaseDate}
 onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="purchasePrice">{labels.purchasePrice}</Label>
 <Input
 id="purchasePrice"
 type="number"
 step="0.01"
 value={formData.purchasePrice}
 onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="currentOdometer">{labels.currentOdometer}</Label>
 <Input
 id="currentOdometer"
 type="number"
 value={formData.currentOdometer}
 onChange={(e) => setFormData({ ...formData, currentOdometer: e.target.value })}
 />
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="space-y-2">
 <Label htmlFor="status">{labels.status}</Label>
 <Select
 value={formData.status}
 onValueChange={(value) => setFormData({ ...formData, status: value })}
 >
 <SelectTrigger>
 <SelectValue placeholder={labels.status} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="active">{labels.active}</SelectItem>
 <SelectItem value="maintenance">{labels.maintenance}</SelectItem>
 <SelectItem value="inactive">{labels.inactive}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2">
 <Label htmlFor="insuranceProvider">{labels.insuranceProvider}</Label>
 <Input
 id="insuranceProvider"
 value={formData.insuranceProvider}
 onChange={(e) => setFormData({ ...formData, insuranceProvider: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="insuranceExpiry">{labels.insuranceExpiry}</Label>
 <Input
 id="insuranceExpiry"
 type="date"
 value={formData.insuranceExpiry}
 onChange={(e) => setFormData({ ...formData, insuranceExpiry: e.target.value })}
 />
 </div>
 </div>

 <div className="space-y-2">
 <Label htmlFor="remarks">{labels.remarks}</Label>
 <Textarea
 id="remarks"
 value={formData.remarks}
 onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
 rows={3}
 />
 </div>
 </CardContent>
 </Card>

 {/* Actions */}
 <div className="flex justify-end gap-4 mt-6">
 <Button
 type="button"
 variant="outline"
 onClick={() => setLocation("/organization/logistics/fleet/vehicles")}
 >
 {labels.cancel}
 </Button>
 <Button type="submit">
 <Save className="h-4 w-4 me-2" />
 {labels.save}
 </Button>
 </div>
 </form>
 </div>
 </div>
 );
}
