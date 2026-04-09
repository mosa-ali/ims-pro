import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Download, AlertCircle, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { useEffect, useState } from "react";

export default function DriverDetail() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const driverId = params?.id ? parseInt(params.id) : null;
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    setIsRTL(document.documentElement.dir === "rtl");
  }, []);

  const { data: driver, isLoading, error } = trpc.logistics.drivers.getById.useQuery(
    { id: driverId! },
    { enabled: !!driverId }
  );

  if (!driverId) {
    return (
      <div className={`p-6 text-center ${isRTL ? "rtl" : "ltr"}`}>
        <p className="text-red-500">{isRTL ? "معرف السائق غير موجود" : "Driver ID not found"}</p>
        <Button onClick={() => setLocation("/organization/logistics/fleet/drivers")} className="mt-4">
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

  if (error || !driver) {
    return (
      <div className={`p-6 text-center ${isRTL ? "rtl" : "ltr"}`}>
        <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
        <p className="text-red-500">{isRTL ? "خطأ في تحميل بيانات السائق" : "Error loading driver data"}</p>
        <Button onClick={() => setLocation("/organization/logistics/fleet/drivers")} className="mt-4">
          {isRTL ? "العودة" : "Back"}
        </Button>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "suspended":
        return "bg-red-100 text-red-800";
      case "on_leave":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: isRTL ? "نشط" : "Active",
      inactive: isRTL ? "غير نشط" : "Inactive",
      suspended: isRTL ? "موقوف" : "Suspended",
      on_leave: isRTL ? "في إجازة" : "On Leave",
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
            onClick={() => setLocation("/organization/logistics/fleet/drivers")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{driver.fullName || "N/A"}</h1>
            <p className="text-gray-600">{driver.licenseNumber || "N/A"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4" />
            {isRTL ? "طباعة" : "Print"}
          </Button>
          <Button
            onClick={() => setLocation(`/organization/logistics/fleet/drivers/${driverId}/edit`)}
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
          <Badge className={getStatusColor(driver.status || "active")}>
            {getStatusLabel(driver.status || "active")}
          </Badge>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "المعلومات الشخصية" : "Personal Information"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600">{isRTL ? "الاسم الكامل" : "Full Name"}</p>
              <p className="font-semibold">{driver.fullName || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{isRTL ? "رقم الهاتف" : "Phone"}</p>
              <p className="font-semibold">{driver.phone || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{isRTL ? "البريد الإلكتروني" : "Email"}</p>
              <p className="font-semibold text-sm">{driver.email || "-"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* License Information */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "معلومات الرخصة" : "License Information"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600">{isRTL ? "رقم الرخصة" : "License Number"}</p>
              <p className="font-semibold">{driver.licenseNumber || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{isRTL ? "فئة الرخصة" : "License Class"}</p>
              <p className="font-semibold">{driver.licenseType || "-"}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-gray-600">{isRTL ? "تاريخ الانتهاء" : "Expiry Date"}</p>
              <p className="font-semibold">
                {driver.licenseExpiry ? new Date(driver.licenseExpiry).toLocaleDateString() : "-"}
              </p>
              {driver.licenseExpiry && new Date(driver.licenseExpiry) < new Date() && (
                <Badge variant="destructive" className="mt-2">{isRTL ? "منتهي الصلاحية" : "Expired"}</Badge>
              )}
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
            <p>{driver.createdAt ? new Date(driver.createdAt).toLocaleString() : "-"}</p>
          </div>
          <div>
            <p className="text-gray-600">{isRTL ? "آخر تحديث:" : "Last Updated:"}</p>
            <p>{driver.updatedAt ? new Date(driver.updatedAt).toLocaleString() : "-"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
