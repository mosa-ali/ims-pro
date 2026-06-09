import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export default function FuelTrackingList() {
 const { t } = useTranslation();
 const [, setLocation] = useLocation();
 const { isRTL } = useLanguage();
 const [searchTerm, setSearchTerm] = useState("");
 const { data: recordsData, isLoading } = trpc.logistics.fuelLogs.list.useQuery({});
 const records = recordsData?.items || [];

 const labels = {
 title: t.logistics.fuelTracking11,
 addNew: t.logistics.newRecord,
 search: t.logistics.search,
 vehicle: t.logistics.vehicle,
 date: t.logistics.date,
 quantity: t.logistics.quantityL,
 cost: t.logistics.cost,
 odometer: t.logistics.odometer,
 actions: t.logistics.actions,
 noRecords: t.logistics.noRecordsFound,
 loading: t.logistics.loading,
 };

 return (
 <div className="min-h-screen bg-background p-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="container max-w-7xl">
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-4">
 <BackButton href="/organization/logistics/fleet" iconOnly />
 <h1 className="text-3xl font-bold">{labels.title}</h1>
 </div>
 <Button onClick={() => setLocation("/organization/logistics/fleet/fuel/new")}>
 <Plus className="h-4 w-4 me-2" />{labels.addNew}
 </Button>
 </div>
 <Card className="mb-6">
 <CardContent className="pt-6">
 <Input placeholder={labels.search} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
 </CardContent>
 </Card>
 <Card>
 <CardContent className="p-0">
 {isLoading ? (
 <div className="p-8 text-center">{labels.loading}</div>
 ) : records.length === 0 ? (
 <div className="p-8 text-center">{labels.noRecords}</div>
 ) : (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{labels.vehicle}</TableHead>
 <TableHead>{labels.date}</TableHead>
 <TableHead>{labels.quantity}</TableHead>
 <TableHead>{labels.cost}</TableHead>
 <TableHead>{labels.odometer}</TableHead>
 <TableHead className="text-center">{labels.actions}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {records.map((record: any) => (
 <TableRow key={record.id}>
 <TableCell>{record.vehicleId}</TableCell>
 <TableCell>{new Date(record.fuelDate).toLocaleDateString()}</TableCell>
 <TableCell>{record.quantityLiters}</TableCell>
 <TableCell>${record.cost}</TableCell>
 <TableCell>{record.odometerReading}</TableCell>
 <TableCell className="text-end">
 <Button variant="ghost" size="icon" onClick={() => setLocation(`/organization/logistics/fleet/fuel/${record.id}/edit`)}>
 <Edit className="h-4 w-4" />
 </Button>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 )}
 </CardContent>
 </Card>
 </div>
 </div>
 );
}
