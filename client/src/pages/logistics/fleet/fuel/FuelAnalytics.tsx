import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, TrendingDown, TrendingUp, Fuel } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";

export default function FuelAnalytics() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    setIsRTL(document.documentElement.dir === "rtl");
  }, []);

  const { data: analytics, isLoading } = trpc.logistics.fuelLogs.getAnalytics.useQuery({});

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
            <h1 className="text-3xl font-bold">{isRTL ? "تحليل الوقود" : "Fuel Analytics"}</h1>
            <p className="text-gray-600">{isRTL ? "تحليل شامل لاستهلاك الوقود" : "Comprehensive fuel consumption analysis"}</p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{isRTL ? "إجمالي الوقود" : "Total Fuel"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Fuel className="w-5 h-5 text-orange-500" />
              {analytics?.totalFuel || 0} L
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{isRTL ? "إجمالي التكلفة" : "Total Cost"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${analytics?.totalCost || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{isRTL ? "متوسط الكفاءة" : "Avg Efficiency"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {analytics?.averageEfficiency || 0} km/L
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{isRTL ? "عدد السجلات" : "Records"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.recordCount || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Efficiency Trends */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "اتجاهات الكفاءة" : "Efficiency Trends"}</CardTitle>
          <CardDescription>{isRTL ? "تحليل كفاءة الوقود على مدى الوقت" : "Fuel efficiency analysis over time"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <span className="font-semibold">{isRTL ? "أفضل كفاءة" : "Best Efficiency"}</span>
              <span className="text-lg font-bold text-blue-600">{analytics?.bestEfficiency || 0} km/L</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <span className="font-semibold">{isRTL ? "أسوأ كفاءة" : "Worst Efficiency"}</span>
              <span className="text-lg font-bold text-red-600">{analytics?.worstEfficiency || 0} km/L</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
              <span className="font-semibold">{isRTL ? "الاتجاه" : "Trend"}</span>
              <span className="text-lg font-bold text-purple-600 flex items-center gap-2">
                {analytics?.trend === "improving" ? (
                  <>
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    {isRTL ? "تحسن" : "Improving"}
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-5 h-5 text-red-500" />
                    {isRTL ? "تراجع" : "Declining"}
                  </>
                )}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "تحليل التكاليف" : "Cost Analysis"}</CardTitle>
          <CardDescription>{isRTL ? "تفصيل تكاليف الوقود" : "Detailed fuel cost breakdown"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span>{isRTL ? "متوسط السعر لكل لتر" : "Avg Price per Liter"}</span>
              <span className="font-semibold">${analytics?.avgPricePerLiter || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span>{isRTL ? "أعلى تكلفة" : "Highest Cost"}</span>
              <span className="font-semibold text-red-600">${analytics?.highestCost || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span>{isRTL ? "أقل تكلفة" : "Lowest Cost"}</span>
              <span className="font-semibold text-green-600">${analytics?.lowestCost || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
