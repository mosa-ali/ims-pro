import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, CheckCircle, AlertCircle, XCircle, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";

export default function ComplianceDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    setIsRTL(document.documentElement.dir === "rtl");
  }, []);

  const { data: dashboard, isLoading } = trpc.logistics.vehicleCompliance.getDashboard.useQuery({});

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
            <h1 className="text-3xl font-bold">{isRTL ? "لوحة التوافقية" : "Compliance Dashboard"}</h1>
            <p className="text-gray-600">{isRTL ? "مراقبة الامتثال والشهادات والفحوصات" : "Monitor compliance, certifications, and inspections"}</p>
          </div>
        </div>
      </div>

      {/* Compliance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              {isRTL ? "متوافقة" : "Compliant"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {dashboard?.compliant || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              {isRTL ? "قريبة من الانتهاء" : "Expiring Soon"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {dashboard?.expiringSoon || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-600" />
              {isRTL ? "تحتاج انتباه" : "Needs Attention"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {dashboard?.needsAttention || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600" />
              {isRTL ? "غير متوافقة" : "Non-Compliant"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {dashboard?.nonCompliant || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Alerts */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-600">{isRTL ? "تنبيهات الامتثال" : "Compliance Alerts"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {dashboard?.alerts && dashboard.alerts.length > 0 ? (
              dashboard.alerts.map((alert: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                  <div>
                    <p className="font-semibold">{alert.vehicle}</p>
                    <p className="text-sm text-gray-600">{alert.issue}</p>
                  </div>
                  <Badge variant="destructive">{alert.severity}</Badge>
                </div>
              ))
            ) : (
              <p className="text-gray-600">{isRTL ? "لا توجد تنبيهات" : "No alerts"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documents Status */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "حالة المستندات" : "Documents Status"}</CardTitle>
          <CardDescription>{isRTL ? "حالة الشهادات والتراخيص" : "Status of certifications and licenses"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dashboard?.documents && dashboard.documents.length > 0 ? (
              dashboard.documents.map((doc: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-semibold">{doc.name}</p>
                    <p className="text-sm text-gray-600">{isRTL ? "ينتهي في" : "Expires"}: {doc.expiryDate}</p>
                  </div>
                  <Badge variant={
                    doc.status === "valid" ? "default" :
                    doc.status === "expiring" ? "secondary" :
                    "destructive"
                  }>
                    {doc.status === "valid" ? (isRTL ? "صالح" : "Valid") :
                     doc.status === "expiring" ? (isRTL ? "قريب الانتهاء" : "Expiring") :
                     (isRTL ? "منتهي الصلاحية" : "Expired")}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-gray-600">{isRTL ? "لا توجد مستندات" : "No documents"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Inspection Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "جدول الفحوصات" : "Inspection Schedule"}</CardTitle>
          <CardDescription>{isRTL ? "الفحوصات المجدولة والمتوقعة" : "Scheduled and expected inspections"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dashboard?.inspections && dashboard.inspections.length > 0 ? (
              dashboard.inspections.map((insp: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold">{insp.vehicle}</p>
                    <p className="text-sm text-gray-600">{insp.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{insp.scheduledDate}</p>
                    <Badge variant={insp.status === "scheduled" ? "secondary" : "default"}>
                      {insp.status === "scheduled" ? (isRTL ? "مجدول" : "Scheduled") : (isRTL ? "مكتمل" : "Completed")}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600">{isRTL ? "لا توجد فحوصات" : "No inspections"}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
