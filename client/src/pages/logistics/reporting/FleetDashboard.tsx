import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, TrendingUp, Truck, Users, Fuel, Wrench } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";

export default function FleetDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    setIsRTL(document.documentElement.dir === "rtl");
  }, []);

  const { data: dashboard, isLoading } = trpc.logistics.reporting.getFleetDashboard.useQuery({});

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${isRTL ? "rtl" : "ltr"}`}>
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLocation("/organization/logistics/fleet")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{isRTL ? "لوحة معلومات الأسطول" : "Fleet Dashboard"}</h1>
            <p className="text-gray-600">{isRTL ? "نظرة عامة شاملة على أداء الأسطول" : "Comprehensive fleet performance overview"}</p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Truck className="w-4 h-4" />
              {isRTL ? "إجمالي المركبات" : "Total Vehicles"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.totalVehicles || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="w-4 h-4" />
              {isRTL ? "السائقون" : "Drivers"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.totalDrivers || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Fuel className="w-4 h-4" />
              {isRTL ? "الوقود اليومي" : "Daily Fuel"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{dashboard?.dailyFuel || 0}L</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              {isRTL ? "الصيانة" : "Maintenance"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{dashboard?.maintenanceDue || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              {isRTL ? "الكفاءة" : "Efficiency"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{dashboard?.efficiency || 0}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Fleet Status */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "حالة الأسطول" : "Fleet Status"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-gray-600">{isRTL ? "نشطة" : "Active"}</p>
              <p className="text-2xl font-bold text-green-600">{dashboard?.activeVehicles || 0}</p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-gray-600">{isRTL ? "تحت الصيانة" : "In Maintenance"}</p>
              <p className="text-2xl font-bold text-yellow-600">{dashboard?.maintenanceVehicles || 0}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600">{isRTL ? "في الرحلات" : "In Transit"}</p>
              <p className="text-2xl font-bold text-blue-600">{dashboard?.inTransitVehicles || 0}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600">{isRTL ? "متوقفة" : "Idle"}</p>
              <p className="text-2xl font-bold text-gray-600">{dashboard?.idleVehicles || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "أفضل السائقين" : "Top Drivers"}</CardTitle>
          <CardDescription>{isRTL ? "السائقون الأفضل أداءً" : "Best performing drivers"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dashboard?.topDrivers && dashboard.topDrivers.length > 0 ? (
              dashboard.topDrivers.map((driver: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-semibold">{driver.name}</p>
                    <p className="text-sm text-gray-600">{driver.trips} {isRTL ? "رحلات" : "trips"}</p>
                  </div>
                  <Badge variant="default">{driver.rating}/5 ⭐</Badge>
                </div>
              ))
            ) : (
              <p className="text-gray-600">{isRTL ? "لا توجد بيانات" : "No data"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Trips */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "آخر الرحلات" : "Recent Trips"}</CardTitle>
          <CardDescription>{isRTL ? "آخر 10 رحلات" : "Last 10 trips"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dashboard?.recentTrips && dashboard.recentTrips.length > 0 ? (
              dashboard.recentTrips.map((trip: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-semibold">{trip.tripNumber}</p>
                    <p className="text-sm text-gray-600">{trip.route}</p>
                  </div>
                  <Badge variant={trip.status === "completed" ? "default" : "secondary"}>
                    {trip.status === "completed" ? (isRTL ? "مكتملة" : "Completed") : (isRTL ? "جارية" : "In Progress")}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-gray-600">{isRTL ? "لا توجد رحلات" : "No trips"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Performance Trends */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "اتجاهات الأداء" : "Performance Trends"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">{isRTL ? "متوسط كفاءة الوقود" : "Avg Fuel Efficiency"}</p>
              <p className="text-2xl font-bold text-blue-600">{dashboard?.avgFuelEfficiency || 0} km/L</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">{isRTL ? "معدل السلامة" : "Safety Score"}</p>
              <p className="text-2xl font-bold text-green-600">{dashboard?.safetyScore || 0}/100</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600">{isRTL ? "استخدام الأسطول" : "Fleet Utilization"}</p>
              <p className="text-2xl font-bold text-purple-600">{dashboard?.fleetUtilization || 0}%</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-gray-600">{isRTL ? "تكلفة التشغيل" : "Operating Cost"}</p>
              <p className="text-2xl font-bold text-orange-600">${dashboard?.operatingCost || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
