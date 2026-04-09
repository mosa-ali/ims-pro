import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Link2, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";

export default function ProcurementLinkage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    setIsRTL(document.documentElement.dir === "rtl");
  }, []);

  const { data: linkage, isLoading } = trpc.logistics.erpIntegration.getProcurementLinkage.useQuery({});

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
            <h1 className="text-3xl font-bold">{isRTL ? "ربط المشتريات" : "Procurement Linkage"}</h1>
            <p className="text-gray-600">{isRTL ? "ربط طلبات الشراء مع نظام ERP" : "Link purchase orders with ERP system"}</p>
          </div>
        </div>
      </div>

      {/* Linkage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{isRTL ? "إجمالي الطلبات" : "Total Orders"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{linkage?.totalOrders || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{isRTL ? "مرتبطة" : "Linked"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{linkage?.linkedOrders || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{isRTL ? "معلقة" : "Pending"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{linkage?.pendingOrders || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{isRTL ? "معدل الربط" : "Link Rate"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{linkage?.linkRate || 0}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Linked Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            {isRTL ? "الطلبات المرتبطة" : "Linked Orders"}
          </CardTitle>
          <CardDescription>{isRTL ? "آخر 10 طلبات مرتبطة" : "Last 10 linked orders"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {linkage?.linkedOrdersList && linkage.linkedOrdersList.length > 0 ? (
              linkage.linkedOrdersList.map((order: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-semibold">{order.poNumber}</p>
                    <p className="text-sm text-gray-600">{isRTL ? "الموردين" : "Vendors"}: {order.vendorCount}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">
                      <CheckCircle className="w-3 h-3 me-1" />
                      {isRTL ? "مرتبط" : "Linked"}
                    </Badge>
                    <span className="text-sm text-gray-600">${order.amount}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600">{isRTL ? "لا توجد طلبات مرتبطة" : "No linked orders"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Linkage */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "الطلبات المعلقة" : "Pending Orders"}</CardTitle>
          <CardDescription>{isRTL ? "طلبات تنتظر الربط" : "Orders awaiting linkage"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {linkage?.pendingOrdersList && linkage.pendingOrdersList.length > 0 ? (
              linkage.pendingOrdersList.map((order: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-semibold">{order.poNumber}</p>
                    <p className="text-sm text-gray-600">{order.reason}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    {isRTL ? "ربط الآن" : "Link Now"}
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-gray-600">{isRTL ? "لا توجد طلبات معلقة" : "No pending orders"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Integration Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "مقاييس التكامل" : "Integration Metrics"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">{isRTL ? "متوسط وقت الربط" : "Avg Link Time"}</p>
              <p className="text-2xl font-bold text-blue-600">{linkage?.avgLinkTime || 0}s</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">{isRTL ? "نسبة النجاح" : "Success Rate"}</p>
              <p className="text-2xl font-bold text-green-600">{linkage?.successRate || 0}%</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600">{isRTL ? "الطلبات المعالجة اليوم" : "Processed Today"}</p>
              <p className="text-2xl font-bold text-purple-600">{linkage?.processedToday || 0}</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-gray-600">{isRTL ? "الأخطاء" : "Errors"}</p>
              <p className="text-2xl font-bold text-orange-600">{linkage?.errorCount || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
