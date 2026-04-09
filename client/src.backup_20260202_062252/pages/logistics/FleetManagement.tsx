/**
 * Fleet Management Page
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Download, Eye, Edit, ArrowLeft, ArrowRight, Car, Users, Fuel, Wrench } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "@/hooks/useTranslation";

export default function FleetManagement() {
  const { user } = useAuth();
  const { isRTL } = useTranslation();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("vehicles");
  // Get organizationId from context (same pattern as Finance and HR modules)
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id || 1;

  const { data: vehicles, isLoading: loadingVehicles } = trpc.logistics.fleet.listVehicles.useQuery({ organizationId, search: search || undefined, limit: 50, offset: 0 });
  const { data: drivers, isLoading: loadingDrivers } = trpc.logistics.fleet.listDrivers.useQuery({ organizationId, limit: 50, offset: 0 });

  const statusColors: Record<string, string> = { active: "bg-green-500", under_maintenance: "bg-yellow-500", retired: "bg-gray-500", disposed: "bg-red-500" };

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild><Link href="/logistics">{isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}</Link></Button>
              <div><h1 className="text-2xl font-bold">{isRTL ? "إدارة الأسطول" : "Fleet Management"}</h1><p className="text-muted-foreground">{isRTL ? "إدارة المركبات والسائقين" : "Manage vehicles and drivers"}</p></div>
            </div>
            <Button variant="outline"><Download className="h-4 w-4 me-2" />{isRTL ? "تصدير" : "Export"}</Button>
          </div>
        </div>
      </div>
      <div className="container py-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><Car className="h-8 w-8 text-blue-500" /><div><p className="text-sm text-muted-foreground">{isRTL ? "إجمالي المركبات" : "Total Vehicles"}</p><p className="text-2xl font-bold">{vehicles?.total || 0}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><Users className="h-8 w-8 text-green-500" /><div><p className="text-sm text-muted-foreground">{isRTL ? "السائقون" : "Drivers"}</p><p className="text-2xl font-bold">{drivers?.total || 0}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><Car className="h-8 w-8 text-emerald-500" /><div><p className="text-sm text-muted-foreground">{isRTL ? "نشطة" : "Active"}</p><p className="text-2xl font-bold">{vehicles?.items?.filter((v: any) => v.status === "active").length || 0}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><Wrench className="h-8 w-8 text-yellow-500" /><div><p className="text-sm text-muted-foreground">{isRTL ? "في الصيانة" : "In Maintenance"}</p><p className="text-2xl font-bold">{vehicles?.items?.filter((v: any) => v.status === "under_maintenance").length || 0}</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-4"><Fuel className="h-8 w-8 text-orange-500" /><div><p className="text-sm text-muted-foreground">{isRTL ? "متقاعدة" : "Retired"}</p><p className="text-2xl font-bold">{vehicles?.items?.filter((v: any) => v.status === "retired").length || 0}</p></div></div></CardContent></Card>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4"><TabsTrigger value="vehicles">{isRTL ? "المركبات" : "Vehicles"}</TabsTrigger><TabsTrigger value="drivers">{isRTL ? "السائقون" : "Drivers"}</TabsTrigger><TabsTrigger value="trips">{isRTL ? "الرحلات" : "Trip Logs"}</TabsTrigger><TabsTrigger value="fuel">{isRTL ? "الوقود" : "Fuel Logs"}</TabsTrigger><TabsTrigger value="maintenance">{isRTL ? "الصيانة" : "Maintenance"}</TabsTrigger><TabsTrigger value="compliance">{isRTL ? "الامتثال" : "Compliance"}</TabsTrigger></TabsList>
          <TabsContent value="vehicles">
            <Card>
              <CardHeader><div className="flex items-center justify-between"><CardTitle>{isRTL ? "المركبات" : "Vehicles"}</CardTitle><Button asChild><Link href="/logistics/fleet/vehicles/new"><Plus className="h-4 w-4 me-2" />{isRTL ? "مركبة جديدة" : "New Vehicle"}</Link></Button></div></CardHeader>
              <CardContent>
                <div className="mb-4"><div className="relative max-w-sm"><Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder={isRTL ? "بحث..." : "Search..."} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-10" /></div></div>
                <Table>
                  <TableHeader><TableRow><TableHead>{isRTL ? "رقم اللوحة" : "Plate No"}</TableHead><TableHead>{isRTL ? "الماركة/الموديل" : "Make/Model"}</TableHead><TableHead>{isRTL ? "النوع" : "Type"}</TableHead><TableHead>{isRTL ? "السنة" : "Year"}</TableHead><TableHead>{isRTL ? "الحالة" : "Status"}</TableHead><TableHead className="text-end">{isRTL ? "الإجراءات" : "Actions"}</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {loadingVehicles ? (<TableRow><TableCell colSpan={6} className="text-center py-8">{isRTL ? "جاري التحميل..." : "Loading..."}</TableCell></TableRow>
                    ) : !vehicles?.items?.length ? (<TableRow><TableCell colSpan={6} className="text-center py-8"><div className="flex flex-col items-center gap-2"><Car className="h-12 w-12 text-muted-foreground" /><p className="text-muted-foreground">{isRTL ? "لا توجد مركبات" : "No vehicles found"}</p></div></TableCell></TableRow>
                    ) : (vehicles.items.map((v: any) => (<TableRow key={v.id}><TableCell className="font-medium">{v.plateNumber}</TableCell><TableCell>{v.brand} {v.model}</TableCell><TableCell>{v.vehicleType}</TableCell><TableCell>{v.year}</TableCell><TableCell><Badge className={`${statusColors[v.status || "available"]} text-white`}>{v.status}</Badge></TableCell><TableCell><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => navigate(`/logistics/fleet/vehicles/${v.id}`)}><Eye className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => navigate(`/logistics/fleet/vehicles/${v.id}/edit`)}><Edit className="h-4 w-4" /></Button></div></TableCell></TableRow>)))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="drivers">
            <Card>
              <CardHeader><div className="flex items-center justify-between"><CardTitle>{isRTL ? "السائقون" : "Drivers"}</CardTitle><Button asChild><Link href="/logistics/fleet/drivers/new"><Plus className="h-4 w-4 me-2" />{isRTL ? "سائق جديد" : "New Driver"}</Link></Button></div></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>{isRTL ? "الاسم" : "Name"}</TableHead><TableHead>{isRTL ? "رقم الرخصة" : "License No"}</TableHead><TableHead>{isRTL ? "الهاتف" : "Phone"}</TableHead><TableHead>{isRTL ? "الحالة" : "Status"}</TableHead><TableHead className="text-end">{isRTL ? "الإجراءات" : "Actions"}</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {loadingDrivers ? (<TableRow><TableCell colSpan={5} className="text-center py-8">{isRTL ? "جاري التحميل..." : "Loading..."}</TableCell></TableRow>
                    ) : !drivers?.items?.length ? (<TableRow><TableCell colSpan={5} className="text-center py-8"><p className="text-muted-foreground">{isRTL ? "لا يوجد سائقون" : "No drivers found"}</p></TableCell></TableRow>
                    ) : (drivers.items.map((d: any) => (<TableRow key={d.id}><TableCell className="font-medium">{isRTL ? d.fullNameAr || d.fullName : d.fullName}</TableCell><TableCell>{d.licenseNumber}</TableCell><TableCell>{d.phone}</TableCell><TableCell><Badge className={d.status === "active" ? "bg-green-500" : "bg-gray-500"}>{d.status}</Badge></TableCell><TableCell><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => navigate(`/logistics/fleet/drivers/${d.id}`)}><Eye className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => navigate(`/logistics/fleet/drivers/${d.id}/edit`)}><Edit className="h-4 w-4" /></Button></div></TableCell></TableRow>)))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="trips"><Card><CardHeader><CardTitle>{isRTL ? "سجل الرحلات" : "Trip Logs"}</CardTitle></CardHeader><CardContent><p className="text-muted-foreground text-center py-8">{isRTL ? "قريباً..." : "Coming soon..."}</p></CardContent></Card></TabsContent>
          <TabsContent value="fuel"><Card><CardHeader><CardTitle>{isRTL ? "سجل الوقود" : "Fuel Logs"}</CardTitle></CardHeader><CardContent><p className="text-muted-foreground text-center py-8">{isRTL ? "قريباً..." : "Coming soon..."}</p></CardContent></Card></TabsContent>
          <TabsContent value="maintenance"><Card><CardHeader><CardTitle>{isRTL ? "الصيانة" : "Maintenance"}</CardTitle></CardHeader><CardContent><p className="text-muted-foreground text-center py-8">{isRTL ? "قريباً..." : "Coming soon..."}</p></CardContent></Card></TabsContent>
          <TabsContent value="compliance"><Card><CardHeader><CardTitle>{isRTL ? "الامتثال" : "Compliance"}</CardTitle></CardHeader><CardContent><p className="text-muted-foreground text-center py-8">{isRTL ? "قريباً..." : "Coming soon..."}</p></CardContent></Card></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
