import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export default function FuelTrackingForm() {
 const { t } = useTranslation();
 const [, setLocation] = useLocation();
 const { isRTL } = useLanguage();
 const [formData, setFormData] = useState({
 vehicleId: "",
 fuelDate: new Date().toISOString().split("T")[0],
 quantityLiters: "",
 cost: "",
 odometerReading: "",
 fuelStation: "",
 });

 const labels = {
 title: t.logistics.newFuelRecord,
 vehicleId: t.logistics.vehicle,
 date: t.logistics.date,
 quantity: t.logistics.quantityL,
 cost: t.logistics.cost,
 odometer: t.logistics.odometerReading,
 fuelStation: t.logistics.fuelStation,
 save: t.logistics.save,
 cancel: t.logistics.cancel,
 };

 return (
 <div className="min-h-screen bg-background p-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="container max-w-4xl">
 <div className="flex items-center gap-4 mb-6">
 <BackButton href="/organization/logistics/fleet/fuel" iconOnly />
 <h1 className="text-3xl font-bold">{labels.title}</h1>
 </div>
 <Card>
 <CardHeader><CardTitle>{t.logistics.fuelDetails}</CardTitle></CardHeader>
 <CardContent className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2"><Label>{labels.vehicleId}</Label><Input value={formData.vehicleId} onChange={(e) => setFormData({...formData, vehicleId: e.target.value})} /></div>
 <div className="space-y-2"><Label>{labels.date}</Label><Input type="date" value={formData.fuelDate} onChange={(e) => setFormData({...formData, fuelDate: e.target.value})} /></div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2"><Label>{labels.quantity}</Label><Input type="number" value={formData.quantityLiters} onChange={(e) => setFormData({...formData, quantityLiters: e.target.value})} /></div>
 <div className="space-y-2"><Label>{labels.cost}</Label><Input type="number" value={formData.cost} onChange={(e) => setFormData({...formData, cost: e.target.value})} /></div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2"><Label>{labels.odometer}</Label><Input type="number" value={formData.odometerReading} onChange={(e) => setFormData({...formData, odometerReading: e.target.value})} /></div>
 <div className="space-y-2"><Label>{labels.fuelStation}</Label><Input value={formData.fuelStation} onChange={(e) => setFormData({...formData, fuelStation: e.target.value})} /></div>
 </div>
 </CardContent>
 </Card>
 <div className="flex justify-end gap-4 mt-6">
 <Button variant="outline" onClick={() => setLocation("/organization/logistics/fleet/fuel")}>{labels.cancel}</Button>
 <Button><Save className="h-4 w-4 me-2" />{labels.save}</Button>
 </div>
 </div>
 </div>
 );
}
