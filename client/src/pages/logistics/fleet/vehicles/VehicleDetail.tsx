import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Download, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { useEffect, useState } from "react";

export default function VehicleDetail() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const vehicleId = params?.id ? parseInt(params.id) : null;
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    setIsRTL(document.documentElement.dir === "rtl");
  }, []);

  const { data: vehicle, isLoading, error } = trpc.logistics.vehicles.getById.useQuery(
    { id: vehicleId! },
    { enabled: !!vehicleId }
  );

  if (!vehicleId) {
    return (
      <div className={`p-6 text-center ${isRTL ? "rtl" : "ltr"}`}>
        <p className="text-red-500">{isRTL ? "معرف المركبة غير موجود" : "Vehicle ID not found"}</p>
        <Button onClick={() => setLocation("/organization/logistics/fleet/vehicles")} className="mt-4">
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

  if (error || !vehicle) {
    return (
      <div className={`p-6 text-center ${isRTL ? "rtl" : "ltr"}`}>
        <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
        <p className="text-red-500">{isRTL ? "خطأ في تحميل بيانات المركبة" : "Error loading vehicle data"}</p>
        <Button onClick={() => setLocation("/organization/logistics/fleet/vehicles")} className="mt-4">
          {isRTL ? "العودة" : "Back"}
        </Button>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "under_maintenance":
        return "bg-yellow-100 text-yellow-800";
      case "retired":
        return "bg-red-100 text-red-800";
      case "disposed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: isRTL ? "نشط" : "Active",
      under_maintenance: isRTL ? "تحت الصيانة" : "Under Maintenance",
      retired: isRTL ? "متقاعد" : "Retired",
      disposed: isRTL ? "مستبعد" : "Disposed",
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
            onClick={() => setLocation("/organization/logistics/fleet/vehicles")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{vehicle.vehicleNumber || "N/A"}</h1>
            <p className="text-gray-600">{vehicle.brand} {vehicle.model} ({vehicle.year})</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4" />
            {isRTL ? "طباعة" : "Print"}
          </Button>
          <Button
            onClick={() => setLocation(`/organization/logistics/fleet/vehicles/${vehicleId}/edit`)}
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
          <Badge className={getStatusColor(vehicle.status)}>
            {getStatusLabel(vehicle.status)}
          </Badge>
        </CardContent>
      </Card>

      {/* Vehicle Information */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "معلومات المركبة" : "Vehicle Information"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600">{isRTL ? "رقم المركبة" : "Vehicle Number"}</p>
              <p className="font-semibold">{vehicle.vehicleNumber || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{isRTL ? "نوع المركبة" : "Vehicle Type"}</p>
              <p className="font-semibold">{vehicle.vehicleType || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{isRTL ? "الماركة" : "Brand"}</p>
              <p className="font-semibold">{vehicle.brand || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{isRTL ? "الموديل" : "Model"}</p>
              <p className="font-semibold">{vehicle.model || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{isRTL ? "السنة" : "Year"}</p>
              <p className="font-semibold">{vehicle.year || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{isRTL ? "اللون" : "Color"}</p>
              <p className="font-semibold">{vehicle.color || "-"}</p>
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
            <p>{vehicle.createdAt ? new Date(vehicle.createdAt).toLocaleString() : "-"}</p>
          </div>
          <div>
            <p className="text-gray-600">{isRTL ? "آخر تحديث:" : "Last Updated:"}</p>
            <p>{vehicle.updatedAt ? new Date(vehicle.updatedAt).toLocaleString() : "-"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
