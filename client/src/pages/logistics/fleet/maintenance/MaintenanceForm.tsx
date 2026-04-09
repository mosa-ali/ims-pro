import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export default function MaintenanceForm() {
 const { t } = useTranslation();
 const [, setLocation] = useLocation();
 const { isRTL } = useLanguage();
 const [formData, setFormData] = useState({
 vehicleId: "",
 maintenanceType: "",
 maintenanceDate: new Date().toISOString().split("T")[0],
 cost: "",
 serviceProvider: "",
 description: "",
 });

 const labels = {
 title: t.logistics.newMaintenanceRecord,
 vehicleId: t.logistics.vehicle,
 maintenanceType: t.logistics.maintenanceType,
 date: t.logistics.date,
 cost: t.logistics.cost,
 serviceProvider: t.logistics.serviceProvider,
 description: t.logistics.description,
 save: t.logistics.save,
 cancel: t.logistics.cancel,
 };

 return (
 <div className="min-h-screen bg-background p-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="container max-w-4xl">
 <div className="flex items-center gap-4 mb-6">
 <BackButton href="/organization/logistics/fleet/maintenance" iconOnly />
 <h1 className="text-3xl font-bold">{labels.title}</h1>
 </div>
 <Card>
 <CardHeader><CardTitle>{t.logistics.maintenanceDetails}</CardTitle></CardHeader>
 <CardContent className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2"><Label>{labels.vehicleId}</Label><Input value={formData.vehicleId} onChange={(e) => setFormData({...formData, vehicleId: e.target.value})} /></div>
 <div className="space-y-2"><Label>{labels.maintenanceType}</Label><Input value={formData.maintenanceType} onChange={(e) => setFormData({...formData, maintenanceType: e.target.value})} /></div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2"><Label>{labels.date}</Label><Input type="date" value={formData.maintenanceDate} onChange={(e) => setFormData({...formData, maintenanceDate: e.target.value})} /></div>
 <div className="space-y-2"><Label>{labels.cost}</Label><Input type="number" value={formData.cost} onChange={(e) => setFormData({...formData, cost: e.target.value})} /></div>
 </div>
 <div className="space-y-2"><Label>{labels.serviceProvider}</Label><Input value={formData.serviceProvider} onChange={(e) => setFormData({...formData, serviceProvider: e.target.value})} /></div>
 <div className="space-y-2"><Label>{labels.description}</Label><Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={4} /></div>
 </CardContent>
 </Card>
 <div className="flex justify-end gap-4 mt-6">
 <Button variant="outline" onClick={() => setLocation("/organization/logistics/fleet/maintenance")}>{labels.cancel}</Button>
 <Button><Save className="h-4 w-4 me-2" />{labels.save}</Button>
 </div>
 </div>
 </div>
 );
}
