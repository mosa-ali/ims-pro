import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";

export default function MaintenancePredictor() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    setIsRTL(document.documentElement.dir === "rtl");
  }, []);

  const { data: predictions, isLoading } = trpc.logistics.vehicleMaintenance.getPredictiveAnalytics.useQuery({});

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
            <h1 className="text-3xl font-bold">{isRTL ? "التنبؤ بالصيانة" : "Maintenance Predictor"}</h1>
            <p className="text-gray-600">{isRTL ? "التنبؤ بالصيانة المطلوبة بناءً على البيانات التاريخية" : "Predict maintenance needs based on historical data"}</p>
          </div>
        </div>
      </div>

      {/* Critical Alerts */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            {isRTL ? "تنبيهات حرجة" : "Critical Alerts"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {predictions?.criticalAlerts && predictions.criticalAlerts.length > 0 ? (
              predictions.criticalAlerts.map((alert: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                  <span className="font-semibold">{alert.vehicle}</span>
                  <Badge variant="destructive">{alert.issue}</Badge>
                </div>
              ))
            ) : (
              <p className="text-gray-600">{isRTL ? "لا توجد تنبيهات حرجة" : "No critical alerts"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Maintenance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {isRTL ? "الصيانة القادمة" : "Upcoming Maintenance"}
          </CardTitle>
          <CardDescription>{isRTL ? "الصيانة المتوقعة في الأسابيع القادمة" : "Expected maintenance in upcoming weeks"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {predictions?.upcomingMaintenance && predictions.upcomingMaintenance.length > 0 ? (
              predictions.upcomingMaintenance.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-semibold">{item.vehicle}</p>
                    <p className="text-sm text-gray-600">{item.maintenanceType}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-blue-600">{item.daysUntilDue} {isRTL ? "أيام" : "days"}</p>
                    <p className="text-xs text-gray-600">{item.dueDate}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600">{isRTL ? "لا توجد صيانة قادمة" : "No upcoming maintenance"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "جدول الصيانة الموصى به" : "Recommended Maintenance Schedule"}</CardTitle>
          <CardDescription>{isRTL ? "بناءً على نوع المركبة والاستخدام" : "Based on vehicle type and usage"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {predictions?.schedule && predictions.schedule.length > 0 ? (
              predictions.schedule.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold">{item.maintenanceType}</p>
                    <p className="text-sm text-gray-600">{item.frequency}</p>
                  </div>
                  <Badge variant={item.status === "completed" ? "default" : "secondary"}>
                    {item.status}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-gray-600">{isRTL ? "لا توجد بيانات جدول" : "No schedule data available"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            {isRTL ? "حالة الصحة" : "Health Status"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-gray-600">{isRTL ? "مركبات صحية" : "Healthy Vehicles"}</p>
              <p className="text-2xl font-bold text-green-600">{predictions?.healthyVehicles || 0}</p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-gray-600">{isRTL ? "تحتاج انتباه" : "Needs Attention"}</p>
              <p className="text-2xl font-bold text-yellow-600">{predictions?.needsAttention || 0}</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-gray-600">{isRTL ? "حرجة" : "Critical"}</p>
              <p className="text-2xl font-bold text-red-600">{predictions?.critical || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
