import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Edit, Trash2, Eye } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export default function DriversList() {
 const { t } = useTranslation();
 const [, setLocation] = useLocation();
 const { isRTL } = useLanguage();
 const [searchTerm, setSearchTerm] = useState("");

 const { data: driversData, isLoading } = trpc.logistics.drivers.list.useQuery({});
 const drivers = driversData?.items || [];
 const deleteMutation = trpc.logistics.drivers.delete.useMutation();
 const utils = trpc.useUtils();

 const handleDelete = async (id: number) => {
 if (!confirm(t.logistics.areYouSureYouWantTo9)) return;
 await deleteMutation.mutateAsync({ id });
 utils.logistics.drivers.list.invalidate();
 };

 const filteredDrivers = drivers.filter((d: any) =>
 d.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
 d.licenseNumber?.toLowerCase().includes(searchTerm.toLowerCase())
 );

 const labels = {
 title: t.logistics.driversRegistry,
 addNew: t.logistics.addDriver10,
 search: t.logistics.search,
 driverName: t.logistics.driverName,
 licenseNumber: t.logistics.licenseNumber,
 licenseExpiry: t.logistics.licenseExpiry,
 phone: t.logistics.phone,
 status: t.logistics.status,
 actions: t.logistics.actions,
 noRecords: t.logistics.noRecordsFound,
 loading: t.logistics.loading,
 active: t.logistics.active,
 inactive: t.logistics.inactive,
 };

 return (
 <div className="min-h-screen bg-background p-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="container max-w-7xl">
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-4">
 <BackButton href="/organization/logistics/fleet" iconOnly />
 <h1 className="text-3xl font-bold text-foreground">{labels.title}</h1>
 </div>
 <Button onClick={() => setLocation("/organization/logistics/fleet/drivers/new")}>
 <Plus className="h-4 w-4 me-2" />
 {labels.addNew}
 </Button>
 </div>

 <Card className="mb-6">
 <CardContent className="pt-6">
 <div className="relative">
 <Search className={`absolute ${'start-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
 <Input
 placeholder={labels.search}
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className={'ps-10'}
 />
 </div>
 </CardContent>
 </Card>

 <Card>
 <CardContent className="p-0">
 {isLoading ? (
 <div className="p-8 text-center text-muted-foreground">{labels.loading}</div>
 ) : filteredDrivers.length === 0 ? (
 <div className="p-8 text-center text-muted-foreground">{labels.noRecords}</div>
 ) : (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{labels.driverName}</TableHead>
 <TableHead>{labels.licenseNumber}</TableHead>
 <TableHead>{labels.licenseExpiry}</TableHead>
 <TableHead>{labels.phone}</TableHead>
 <TableHead>{labels.status}</TableHead>
 <TableHead className="text-center">{labels.actions}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filteredDrivers.map((driver: any) => (
 <TableRow key={driver.id}>
 <TableCell className="font-medium">{driver.driverName}</TableCell>
 <TableCell>{driver.licenseNumber}</TableCell>
 <TableCell>{driver.licenseExpiry}</TableCell>
 <TableCell>{driver.phoneNumber}</TableCell>
 <TableCell>
 <span className={`px-2 py-1 rounded-full text-xs ${ driver.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800" }`}>
 {driver.status === "active" ? labels.active : labels.inactive}
 </span>
 </TableCell>
 <TableCell className="text-end">
 <div className="flex justify-end gap-2">
 <Button variant="ghost" size="icon" onClick={() => setLocation(`/organization/logistics/fleet/drivers/${driver.id}`)}>
 <Eye className="h-4 w-4" />
 </Button>
 <Button variant="ghost" size="icon" onClick={() => setLocation(`/organization/logistics/fleet/drivers/${driver.id}/edit`)}>
 <Edit className="h-4 w-4" />
 </Button>
 <Button variant="ghost" size="icon" onClick={() => handleDelete(driver.id)}>
 <Trash2 className="h-4 w-4 text-destructive" />
 </Button>
 </div>
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
