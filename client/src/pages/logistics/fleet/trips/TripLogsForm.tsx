import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

function VehicleDropdown({
 value, onChange, isRTL }: { value: string; onChange: (value: string) => void; isRTL: boolean }) {
  const { t } = useTranslation();
 const { data: vehicles } = trpc.logistics.vehicles.list.useQuery({ limit: 100, offset: 0 });
 return (
 <Select value={value} onValueChange={onChange}>
 <SelectTrigger>
 <SelectValue placeholder={t.logistics.selectVehicle} />
 </SelectTrigger>
 <SelectContent>
 {vehicles?.items?.map((vehicle: any) => (
 <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
 {vehicle.vehicleName} ({vehicle.plateNumber})
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 );
}

function DriverDropdown({
 value, onChange, isRTL }: { value: string; onChange: (value: string) => void; isRTL: boolean }) {
  const { t } = useTranslation();
 const { data: drivers } = trpc.logistics.drivers.list.useQuery({ limit: 100, offset: 0 });
 return (
 <Select value={value} onValueChange={onChange}>
 <SelectTrigger>
 <SelectValue placeholder={t.logistics.selectDriver} />
 </SelectTrigger>
 <SelectContent>
 {drivers?.items?.map((driver: any) => (
 <SelectItem key={driver.id} value={driver.id.toString()}>
 {driver.driverName} ({driver.licenseNumber})
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 );
}

export default function TripLogsForm() {
 const { t } = useTranslation();
 const [, setLocation] = useLocation();
 const [formData, setFormData] = useState({
 vehicleId: "",
 driverId: "",
 tripDate: new Date().toISOString().split("T")[0],
 startLocation: "",
 destination: "",
 startOdometer: "",
 endOdometer: "",
 distanceTraveled: "",
 fuelConsumed: "",
 purpose: "",
 });

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 console.log("Saving trip:", formData);
 setLocation("/organization/logistics/fleet/trips");
 };

 const labels = {
 title: t.logistics.newTrip,
 vehicleId: t.logistics.vehicle,
 driverId: t.logistics.driver,
 tripDate: t.logistics.tripDate,
 startLocation: t.logistics.startLocation,
 destination: t.logistics.destination,
 startOdometer: t.logistics.startOdometer,
 endOdometer: t.logistics.endOdometer,
 distanceTraveled: t.logistics.distanceTraveled,
 fuelConsumed: t.logistics.fuelConsumed,
 purpose: t.logistics.purpose,
 save: t.logistics.save,
 cancel: t.logistics.cancel,
 };

 return (
 <div className="min-h-screen bg-background p-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="container max-w-4xl">
 <div className="flex items-center gap-4 mb-6">
 <BackButton href="/organization/logistics/fleet/trips" iconOnly />
 <h1 className="text-3xl font-bold">{labels.title}</h1>
 </div>

 <form onSubmit={handleSubmit}>
 <Card>
 <CardHeader>
 <CardTitle>{t.logistics.tripDetails}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>{labels.vehicleId}</Label>
 <VehicleDropdown value={formData.vehicleId} onChange={(value) => setFormData({...formData, vehicleId: value})} isRTL={isRTL} />
 </div>
 <div className="space-y-2">
 <Label>{labels.driverId}</Label>
 <DriverDropdown value={formData.driverId} onChange={(value) => setFormData({...formData, driverId: value})} isRTL={isRTL} />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>{labels.tripDate}</Label>
 <Input type="date" value={formData.tripDate} onChange={(e) => setFormData({...formData, tripDate: e.target.value})} />
 </div>
 <div className="space-y-2">
 <Label>{labels.distanceTraveled}</Label>
 <Input type="number" value={formData.distanceTraveled} onChange={(e) => setFormData({...formData, distanceTraveled: e.target.value})} />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>{labels.startLocation}</Label>
 <Input value={formData.startLocation} onChange={(e) => setFormData({...formData, startLocation: e.target.value})} />
 </div>
 <div className="space-y-2">
 <Label>{labels.destination}</Label>
 <Input value={formData.destination} onChange={(e) => setFormData({...formData, destination: e.target.value})} />
 </div>
 </div>
 </CardContent>
 </Card>

 <div className="flex justify-end gap-4 mt-6">
 <Button type="button" variant="outline" onClick={() => setLocation("/organization/logistics/fleet/trips")}>{labels.cancel}</Button>
 <Button type="submit"><Save className="h-4 w-4 me-2" />{labels.save}</Button>
 </div>
 </form>
 </div>
 </div>
 );
}
