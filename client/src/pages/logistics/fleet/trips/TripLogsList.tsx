import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Eye } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export default function TripLogsList() {
 const { t } = useTranslation();
 const [, setLocation] = useLocation();
 const { isRTL } = useLanguage();
 const [searchTerm, setSearchTerm] = useState("");

 const { data: tripsData, isLoading } = trpc.logistics.tripLogs.list.useQuery({});
 const trips = tripsData?.items || [];

 const filteredTrips = trips.filter((trip: any) =>
 trip.vehicleId?.toString().includes(searchTerm) ||
 trip.driverId?.toString().includes(searchTerm) ||
 trip.destination?.toLowerCase().includes(searchTerm.toLowerCase())
 );

 const labels = {
 title: t.logistics.tripLogs12,
 addNew: t.logistics.newTrip13,
 search: t.logistics.search,
 vehicle: t.logistics.vehicle,
 driver: t.logistics.driver,
 destination: t.logistics.destination,
 tripDate: t.logistics.tripDate,
 distance: t.logistics.distanceKm,
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
 <Button onClick={() => setLocation("/organization/logistics/fleet/trips/new")}>
 <Plus className="h-4 w-4 me-2" />
 {labels.addNew}
 </Button>
 </div>

 <Card className="mb-6">
 <CardContent className="pt-6">
 <Input
 placeholder={labels.search}
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 />
 </CardContent>
 </Card>

 <Card>
 <CardContent className="p-0">
 {isLoading ? (
 <div className="p-8 text-center">{labels.loading}</div>
 ) : filteredTrips.length === 0 ? (
 <div className="p-8 text-center">{labels.noRecords}</div>
 ) : (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{labels.vehicle}</TableHead>
 <TableHead>{labels.driver}</TableHead>
 <TableHead>{labels.destination}</TableHead>
 <TableHead>{labels.tripDate}</TableHead>
 <TableHead>{labels.distance}</TableHead>
 <TableHead className="text-center">{labels.actions}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filteredTrips.map((trip: any) => (
 <TableRow key={trip.id}>
 <TableCell>{trip.vehicleId}</TableCell>
 <TableCell>{trip.driverId}</TableCell>
 <TableCell>{trip.destination}</TableCell>
 <TableCell>{new Date(trip.tripDate).toLocaleDateString()}</TableCell>
 <TableCell>{trip.distanceTraveled}</TableCell>
 <TableCell className="text-end">
 <div className="flex justify-end gap-2">
 <Button variant="ghost" size="icon" onClick={() => setLocation(`/organization/logistics/fleet/trips/${trip.id}`)}>
 <Eye className="h-4 w-4" />
 </Button>
 <Button variant="ghost" size="icon" onClick={() => setLocation(`/organization/logistics/fleet/trips/${trip.id}/edit`)}>
 <Edit className="h-4 w-4" />
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
