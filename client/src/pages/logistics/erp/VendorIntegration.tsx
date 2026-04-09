import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, RotateCw, CheckCircle, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";

export default function VendorIntegration() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    setIsRTL(document.documentElement.dir === "rtl");
  }, []);

  const { data: integration, isLoading } = trpc.logistics.erpIntegration.getVendorStatus.useQuery({});
  const syncMutation = trpc.logistics.erpIntegration.syncVendors.useMutation();

  const handleSync = async () => {
    await syncMutation.mutateAsync({});
  };

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
            <h1 className="text-3xl font-bold">{isRTL ? "تكامل الموردين" : "Vendor Integration"}</h1>
            <p className="text-gray-600">{isRTL ? "مزامنة بيانات الموردين مع نظام ERP" : "Sync vendor data with ERP system"}</p>
          </div>
        </div>
        <Button onClick={handleSync} disabled={syncMutation.isPending}>
          <RotateCw className="w-4 h-4 me-2" />
          {syncMutation.isPending ? (isRTL ? "جاري المزامنة..." : "Syncing...") : (isRTL ? "مزامنة الآن" : "Sync Now")}
        </Button>
      </div>

      {/* Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {integration?.status === "connected" ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
            {isRTL ? "حالة الاتصال" : "Connection Status"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{isRTL ? "حالة الاتصال" : "Connection Status"}</span>
              <Badge variant={integration?.status === "connected" ? "default" : "destructive"}>
                {integration?.status === "connected" ? (isRTL ? "متصل" : "Connected") : (isRTL ? "غير متصل" : "Disconnected")}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">{isRTL ? "آخر مزامنة" : "Last Sync"}</span>
              <span>{integration?.lastSync ? new Date(integration.lastSync).toLocaleString() : "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold">{isRTL ? "عدد الموردين" : "Vendor Count"}</span>
              <span className="text-lg font-bold text-blue-600">{integration?.vendorCount || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync History */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "سجل المزامنة" : "Sync History"}</CardTitle>
          <CardDescription>{isRTL ? "آخر 10 عمليات مزامنة" : "Last 10 sync operations"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {integration?.syncHistory && integration.syncHistory.length > 0 ? (
              integration.syncHistory.map((sync: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-semibold">{new Date(sync.timestamp).toLocaleString()}</p>
                    <p className="text-sm text-gray-600">{sync.recordsCount} {isRTL ? "سجلات" : "records"}</p>
                  </div>
                  <Badge variant={sync.status === "success" ? "default" : "destructive"}>
                    {sync.status === "success" ? (isRTL ? "نجح" : "Success") : (isRTL ? "فشل" : "Failed")}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-gray-600">{isRTL ? "لا توجد عمليات مزامنة" : "No sync operations"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "الإعدادات" : "Configuration"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">{isRTL ? "نقطة نهاية ERP" : "ERP Endpoint"}</p>
              <p className="font-semibold text-sm">{integration?.erpEndpoint || "Not configured"}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">{isRTL ? "مفتاح API" : "API Key"}</p>
              <p className="font-semibold text-sm">{integration?.apiKeyConfigured ? "✓ Configured" : "Not configured"}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">{isRTL ? "تكرار المزامنة" : "Sync Frequency"}</p>
              <p className="font-semibold text-sm">{integration?.syncFrequency || "Manual"}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">{isRTL ? "حالة الأتمتة" : "Automation Status"}</p>
              <p className="font-semibold text-sm">{integration?.automationEnabled ? (isRTL ? "مفعل" : "Enabled") : (isRTL ? "معطل" : "Disabled")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
