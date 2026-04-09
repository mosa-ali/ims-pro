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
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Edit, Trash2, Eye, Truck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOperatingUnit } from "@/contexts/OperatingUnitContext";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export default function VehiclesList() {
 const { t } = useTranslation();
 const [, setLocation] = useLocation();
 const { language, isRTL } = useLanguage();
 const { currentOrganization } = useOrganization();
 const { currentOperatingUnit } = useOperatingUnit();
 
 const [searchTerm, setSearchTerm] = useState("");
 const [statusFilter, setStatusFilter] = useState<string>("all");

 const { data, isLoading } = trpc.logistics.vehicles.list.useQuery({});
 const vehicles = data?.items || [];
 const deleteMutation = trpc.logistics.vehicles.delete.useMutation();
 const utils = trpc.useUtils();

 const handleDelete = async (id: number) => {
 if (!confirm(t.logistics.areYouSureYouWantTo9)) return;
 await deleteMutation.mutateAsync({ id });
 utils.logistics.vehicles.list.invalidate();
 };

 const filteredVehicles = vehicles.filter((v: any) => {
 const matchesSearch = 
 v.vehicleNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
 v.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
 v.model?.toLowerCase().includes(searchTerm.toLowerCase());
 const matchesStatus = statusFilter === "all" || v.status === statusFilter;
 return matchesSearch && matchesStatus;
 });

 const labels = {
 title: t.logistics.vehiclesRegistry,
 addNew: t.logistics.addVehicle15,
 search: t.logistics.search,
 status: t.logistics.status,
 all: t.logistics.all,
 active: t.logistics.active,
 maintenance: t.logistics.maintenance14,
 inactive: t.logistics.inactive,
 vehicleNumber: t.logistics.vehicleNumber,
 make: t.logistics.make,
 model: t.logistics.model,
 year: t.logistics.year,
 type: t.logistics.type,
 actions: t.logistics.actions,
 noRecords: t.logistics.noRecordsFound,
 loading: t.logistics.loading,
 };

 return (
 <div className="min-h-screen bg-background p-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="container max-w-7xl">
 {/* Header */}
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-4">
 <BackButton href="/organization/logistics/fleet" iconOnly />
 <div>
 <h1 className="text-3xl font-bold text-foreground">{labels.title}</h1>
 </div>
 </div>
 <Button onClick={() => setLocation("/organization/logistics/fleet/vehicles/new")}>
 <Plus className="h-4 w-4 me-2" />
 {labels.addNew}
 </Button>
 </div>

 {/* Filters */}
 <Card className="mb-6">
 <CardContent className="pt-6">
 <div className="flex flex-col md:flex-row gap-4">
 <div className="flex-1">
 <div className="relative">
 <Search className={`absolute ${'start-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
 <Input
 placeholder={labels.search}
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className={'ps-10'}
 />
 </div>
 </div>
 <Select value={statusFilter} onValueChange={setStatusFilter}>
 <SelectTrigger className="w-full md:w-[200px]">
 <SelectValue placeholder={labels.status} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{labels.all}</SelectItem>
 <SelectItem value="active">{labels.active}</SelectItem>
 <SelectItem value="maintenance">{labels.maintenance}</SelectItem>
 <SelectItem value="inactive">{labels.inactive}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </CardContent>
 </Card>

 {/* Table */}
 <Card>
 <CardContent className="p-0">
 {isLoading ? (
 <div className="p-8 text-center text-muted-foreground">{labels.loading}</div>
 ) : filteredVehicles.length === 0 ? (
 <div className="p-8 text-center text-muted-foreground">{labels.noRecords}</div>
 ) : (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{labels.vehicleNumber}</TableHead>
 <TableHead>{labels.make}</TableHead>
 <TableHead>{labels.model}</TableHead>
 <TableHead>{labels.year}</TableHead>
 <TableHead>{labels.type}</TableHead>
 <TableHead>{labels.status}</TableHead>
 <TableHead className="text-center">{labels.actions}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filteredVehicles.map((vehicle: any) => (
 <TableRow key={vehicle.id}>
 <TableCell className="font-medium">{vehicle.vehicleNumber}</TableCell>
 <TableCell>{vehicle.make}</TableCell>
 <TableCell>{vehicle.model}</TableCell>
 <TableCell>{vehicle.year}</TableCell>
 <TableCell>{vehicle.vehicleType}</TableCell>
 <TableCell>
 <span className={`px-2 py-1 rounded-full text-xs ${ vehicle.status === "active" ? "bg-green-100 text-green-800" : vehicle.status === "maintenance" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800" }`}>
 {vehicle.status === "active" ? labels.active :
 vehicle.status === "maintenance" ? labels.maintenance :
 labels.inactive}
 </span>
 </TableCell>
 <TableCell className="text-end">
 <div className="flex justify-end gap-2">
 <Button
 variant="ghost"
 size="icon"
 onClick={() => setLocation(`/organization/logistics/fleet/vehicles/${vehicle.id}`)}
 >
 <Eye className="h-4 w-4" />
 </Button>
 <Button
 variant="ghost"
 size="icon"
 onClick={() => setLocation(`/organization/logistics/fleet/vehicles/${vehicle.id}/edit`)}
 >
 <Edit className="h-4 w-4" />
 </Button>
 <Button
 variant="ghost"
 size="icon"
 onClick={() => handleDelete(vehicle.id)}
 >
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
