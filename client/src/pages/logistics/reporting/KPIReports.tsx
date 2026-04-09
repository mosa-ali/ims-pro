import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, TrendingUp, TrendingDown, Target } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";

export default function KPIReports() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    setIsRTL(document.documentElement.dir === "rtl");
  }, []);

  const { data: kpis, isLoading } = trpc.logistics.reporting.getKPIReports.useQuery({});

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${isRTL ? "rtl" : "ltr"}`}>
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const getTrendIcon = (trend: string) => {
    return trend === "up" ? (
      <TrendingUp className="w-4 h-4 text-green-600" />
    ) : (
      <TrendingDown className="w-4 h-4 text-red-600" />
    );
  };

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
            <h1 className="text-3xl font-bold">{isRTL ? "تقارير المؤشرات الرئيسية" : "KPI Reports"}</h1>
            <p className="text-gray-600">{isRTL ? "مؤشرات الأداء الرئيسية للأسطول" : "Fleet key performance indicators"}</p>
          </div>
        </div>
      </div>

      {/* Operational KPIs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            {isRTL ? "مؤشرات التشغيل" : "Operational KPIs"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {kpis?.operationalKPIs && kpis.operationalKPIs.length > 0 ? (
              kpis.operationalKPIs.map((kpi: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-semibold">{kpi.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-600">{isRTL ? "الهدف" : "Target"}: {kpi.target}</span>
                      <span className="text-sm text-gray-600">|</span>
                      <span className="text-sm text-gray-600">{isRTL ? "الفعلي" : "Actual"}: {kpi.actual}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">{kpi.percentage}%</span>
                      {getTrendIcon(kpi.trend)}
                    </div>
                    <Badge variant={kpi.status === "on_track" ? "default" : kpi.status === "warning" ? "secondary" : "destructive"}>
                      {kpi.status === "on_track" ? (isRTL ? "على المسار" : "On Track") : 
                       kpi.status === "warning" ? (isRTL ? "تحذير" : "Warning") : 
                       (isRTL ? "متأخر" : "Behind")}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600">{isRTL ? "لا توجد بيانات" : "No data"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Financial KPIs */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "مؤشرات مالية" : "Financial KPIs"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {kpis?.financialKPIs && kpis.financialKPIs.length > 0 ? (
              kpis.financialKPIs.map((kpi: any, idx: number) => (
                <div key={idx} className="p-4 border rounded-lg">
                  <p className="text-sm text-gray-600">{kpi.name}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-2xl font-bold">${kpi.value}</p>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(kpi.trend)}
                      <span className="text-sm font-semibold">{kpi.change}%</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600">{isRTL ? "لا توجد بيانات" : "No data"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Safety KPIs */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "مؤشرات السلامة" : "Safety KPIs"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {kpis?.safetyKPIs && kpis.safetyKPIs.length > 0 ? (
              kpis.safetyKPIs.map((kpi: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold">{kpi.name}</p>
                    <p className="text-sm text-gray-600">{kpi.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{kpi.value}</p>
                    <Badge variant={kpi.status === "good" ? "default" : "secondary"}>
                      {kpi.status === "good" ? (isRTL ? "جيد" : "Good") : (isRTL ? "يحتاج تحسين" : "Needs Improvement")}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600">{isRTL ? "لا توجد بيانات" : "No data"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Efficiency KPIs */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "مؤشرات الكفاءة" : "Efficiency KPIs"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {kpis?.efficiencyKPIs && kpis.efficiencyKPIs.length > 0 ? (
              kpis.efficiencyKPIs.map((kpi: any, idx: number) => (
                <div key={idx} className="p-4 border rounded-lg text-center">
                  <p className="text-sm text-gray-600 mb-2">{kpi.name}</p>
                  <p className="text-3xl font-bold mb-2">{kpi.value}</p>
                  <p className="text-xs text-gray-600">{kpi.unit}</p>
                  <div className="mt-3">
                    <Badge variant={kpi.status === "excellent" ? "default" : "secondary"}>
                      {kpi.status === "excellent" ? (isRTL ? "ممتاز" : "Excellent") :
                       kpi.status === "good" ? (isRTL ? "جيد" : "Good") :
                       (isRTL ? "متوسط" : "Average")}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600">{isRTL ? "لا توجد بيانات" : "No data"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Compliance KPIs */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "مؤشرات الامتثال" : "Compliance KPIs"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {kpis?.complianceKPIs && kpis.complianceKPIs.length > 0 ? (
              kpis.complianceKPIs.map((kpi: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-semibold">{kpi.name}</p>
                    <p className="text-sm text-gray-600">{kpi.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{kpi.percentage}%</p>
                    <Badge variant={kpi.compliant ? "default" : "destructive"}>
                      {kpi.compliant ? (isRTL ? "متوافق" : "Compliant") : (isRTL ? "غير متوافق" : "Non-Compliant")}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600">{isRTL ? "لا توجد بيانات" : "No data"}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
