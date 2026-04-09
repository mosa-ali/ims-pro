import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Download, AlertCircle, MapPin } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { useEffect, useState } from "react";

export default function TripDetail() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const tripId = params?.id ? parseInt(params.id) : null;
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    setIsRTL(document.documentElement.dir === "rtl");
  }, []);

  const { data: trip, isLoading, error } = trpc.logistics.tripLogs.getById.useQuery(
    { id: tripId! },
    { enabled: !!tripId }
  );

  if (!tripId) {
    return (
      <div className={`p-6 text-center ${isRTL ? "rtl" : "ltr"}`}>
        <p className="text-red-500">{isRTL ? "معرف الرحلة غير موجود" : "Trip ID not found"}</p>
        <Button onClick={() => setLocation("/organization/logistics/fleet/trips")} className="mt-4">
          {isRTL ? "العودة" : "Back"}
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${isRTL ? "rtl" : "ltr"}`}>
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className={`p-6 text-center ${isRTL ? "rtl" : "ltr"}`}>
        <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
        <p className="text-red-500">{isRTL ? "خطأ في تحميل بيانات الرحلة" : "Error loading trip data"}</p>
        <Button onClick={() => setLocation("/organization/logistics/fleet/trips")} className="mt-4">
          {isRTL ? "العودة" : "Back"}
        </Button>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "planned":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      completed: isRTL ? "مكتملة" : "Completed",
      in_progress: isRTL ? "جارية" : "In Progress",
      planned: isRTL ? "مخطط لها" : "Planned",
      cancelled: isRTL ? "ملغاة" : "Cancelled",
    };
    return labels[status] || status;
  };

  return (
    <div className={`p-6 space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLocation("/organization/logistics/fleet/trips")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{trip.tripNumber || "N/A"}</h1>
            <p className="text-gray-600">{trip.startLocation} → {trip.endLocation}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4" />
            {isRTL ? "طباعة" : "Print"}
          </Button>
          <Button
            onClick={() => setLocation(`/organization/logistics/fleet/trips/${tripId}/edit`)}
          >
            {isRTL ? "تعديل" : "Edit"}
          </Button>
        </div>
      </div>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "الحالة" : "Status"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Badge className={getStatusColor(trip.status || "planned")}>
            {getStatusLabel(trip.status || "planned")}
          </Badge>
        </CardContent>
      </Card>

      {/* Trip Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {isRTL ? "معلومات الرحلة" : "Trip Information"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600">{isRTL ? "رقم الرحلة" : "Trip Number"}</p>
              <p className="font-semibold">{trip.tripNumber || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{isRTL ? "نقطة البداية" : "Start Location"}</p>
              <p className="font-semibold">{trip.startLocation || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{isRTL ? "نقطة النهاية" : "End Location"}</p>
              <p className="font-semibold">{trip.endLocation || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{isRTL ? "المسافة" : "Distance"}</p>
              <p className="font-semibold">{trip.distance || 0} km</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{isRTL ? "الوقود المستهلك" : "Fuel Consumed"}</p>
              <p className="font-semibold">{trip.fuelConsumed || 0} L</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{isRTL ? "كفاءة الوقود" : "Fuel Efficiency"}</p>
              <p className="font-semibold">{trip.distance && trip.fuelConsumed ? (trip.distance / trip.fuelConsumed).toFixed(2) : 0} km/L</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dates */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "التواريخ" : "Dates"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600">{isRTL ? "تاريخ البداية" : "Start Date"}</p>
              <p className="font-semibold">{trip.startDate ? new Date(trip.startDate).toLocaleString() : "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{isRTL ? "تاريخ النهاية" : "End Date"}</p>
              <p className="font-semibold">{trip.endDate ? new Date(trip.endDate).toLocaleString() : "-"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Trail */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "سجل التدقيق" : "Audit Trail"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <p className="text-gray-600">{isRTL ? "تم الإنشاء:" : "Created:"}</p>
            <p>{trip.createdAt ? new Date(trip.createdAt).toLocaleString() : "-"}</p>
          </div>
          <div>
            <p className="text-gray-600">{isRTL ? "آخر تحديث:" : "Last Updated:"}</p>
            <p>{trip.updatedAt ? new Date(trip.updatedAt).toLocaleString() : "-"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
