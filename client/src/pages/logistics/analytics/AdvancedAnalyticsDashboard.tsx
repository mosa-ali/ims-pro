/**
 * Advanced Analytics Dashboard
 * Displays predictive analytics for fuel consumption, maintenance costs, and fleet optimization
 * Supports RTL/LTR bilingual (English/Arabic) interface
 */

import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Zap,
  DollarSign,
  Target,
  RefreshCw,
} from "lucide-react";

interface FuelPrediction {
  vehicleId: string;
  currentMonthConsumption: number;
  predictedMonthConsumption: number;
  trend: "increasing" | "decreasing" | "stable";
  anomalies: Array<{
    date: string;
    consumption: number;
    expectedConsumption: number;
    deviation: number;
  }>;
  recommendations: string[];
}

interface MaintenancePrediction {
  vehicleId: string;
  predictedCostNextMonth: number;
  predictedCostNextQuarter: number;
  riskLevel: "low" | "medium" | "high";
  upcomingMaintenanceItems: Array<{
    type: string;
    estimatedDate: string;
    estimatedCost: number;
    priority: "low" | "medium" | "high";
  }>;
  recommendations: string[];
}

interface OptimizationRecommendation {
  type: "route" | "vehicle" | "driver" | "cost";
  title: string;
  description: string;
  potentialSavings: number;
  priority: "low" | "medium" | "high";
  implementation: string;
}

export default function AdvancedAnalyticsDashboard() {  const { user } = useAuth();
  const { language, isRTL } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [fuelPredictions, setFuelPredictions] = useState<FuelPrediction[]>([]);
  const [maintenancePredictions, setMaintenancePredictions] = useState<MaintenancePrediction[]>([]);
  const [recommendations, setRecommendations] = useState<OptimizationRecommendation[]>([]);
  const [metrics, setMetrics] = useState({
    totalVehicles: 0,
    averageFuelConsumption: 0,
    averageMaintenanceCost: 0,
    fleetEfficiency: 0,
    predictedMonthlyFuelCost: 0,
    predictedMonthlyMaintenanceCost: 0,
  });

  const translations = {
    en: {
      title: "Advanced Analytics Dashboard",
      subtitle: "Predictive Analytics & Fleet Optimization",
      fuelConsumption: "Fuel Consumption Prediction",
      maintenanceCost: "Maintenance Cost Prediction",
      fleetOptimization: "Fleet Optimization",
      metrics: "Fleet Metrics",
      currentMonth: "Current Month",
      predicted: "Predicted",
      trend: "Trend",
      anomalies: "Anomalies",
      recommendations: "Recommendations",
      riskLevel: "Risk Level",
      upcomingMaintenance: "Upcoming Maintenance",
      potentialSavings: "Potential Savings",
      implementation: "Implementation",
      refresh: "Refresh Data",
      totalVehicles: "Total Vehicles",
      avgFuelConsumption: "Avg Fuel Consumption",
      avgMaintenanceCost: "Avg Maintenance Cost",
      fleetEfficiency: "Fleet Efficiency",
      predictedMonthlyFuel: "Predicted Monthly Fuel Cost",
      predictedMonthlyMaintenance: "Predicted Monthly Maintenance",
      low: "Low",
      medium: "Medium",
      high: "High",
      increasing: "Increasing",
      decreasing: "Decreasing",
      stable: "Stable",
    },
    ar: {
      title: "لوحة تحليلات متقدمة",
      subtitle: "التحليلات التنبؤية وتحسين الأسطول",
      fuelConsumption: "توقع استهلاك الوقود",
      maintenanceCost: "توقع تكاليف الصيانة",
      fleetOptimization: "تحسين الأسطول",
      metrics: "مقاييس الأسطول",
      currentMonth: "الشهر الحالي",
      predicted: "المتوقع",
      trend: "الاتجاه",
      anomalies: "الشذوذات",
      recommendations: "التوصيات",
      riskLevel: "مستوى المخاطرة",
      upcomingMaintenance: "الصيانة القادمة",
      potentialSavings: "المدخرات المحتملة",
      implementation: "التنفيذ",
      refresh: "تحديث البيانات",
      totalVehicles: "إجمالي المركبات",
      avgFuelConsumption: "متوسط استهلاك الوقود",
      avgMaintenanceCost: "متوسط تكلفة الصيانة",
      fleetEfficiency: "كفاءة الأسطول",
      predictedMonthlyFuel: "تكلفة الوقود الشهرية المتوقعة",
      predictedMonthlyMaintenance: "تكلفة الصيانة الشهرية المتوقعة",
      low: "منخفض",
      medium: "متوسط",
      high: "مرتفع",
      increasing: "في ازدياد",
      decreasing: "في انخفاض",
      stable: "مستقر",
    },
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  useEffect(() => {
    // Simulate loading analytics data
    const loadAnalytics = async () => {
      setLoading(true);
      try {
        // Mock data - in real implementation, would fetch from backend
        setFuelPredictions([
          {
            vehicleId: "VEH-001",
            currentMonthConsumption: 450,
            predictedMonthConsumption: 480,
            trend: "increasing",
            anomalies: [
              {
                date: "2024-03-05",
                consumption: 65,
                expectedConsumption: 50,
                deviation: 15,
              },
            ],
            recommendations: [
              "Fuel consumption is increasing. Check vehicle maintenance.",
              "Review driver behavior and consider driver training.",
            ],
          },
        ]);

        setMaintenancePredictions([
          {
            vehicleId: "VEH-001",
            predictedCostNextMonth: 2500,
            predictedCostNextQuarter: 7500,
            riskLevel: "medium",
            upcomingMaintenanceItems: [
              {
                type: "Oil Change",
                estimatedDate: "2024-03-20",
                estimatedCost: 50,
                priority: "high",
              },
              {
                type: "Brake Inspection",
                estimatedDate: "2024-04-15",
                estimatedCost: 150,
                priority: "high",
              },
            ],
            recommendations: [
              "Monitor vehicle condition closely.",
              "Plan maintenance schedule for upcoming items.",
            ],
          },
        ]);

        setRecommendations([
          {
            type: "route",
            title: "Implement Route Optimization",
            description: "Use AI-powered route planning to reduce travel time and fuel consumption.",
            potentialSavings: 15000,
            priority: "high",
            implementation: "Integrate with Google Maps or OpenStreetMap for route optimization.",
          },
          {
            type: "vehicle",
            title: "Improve Vehicle Utilization",
            description: "Current fleet utilization is 65%. Consolidate trips or reduce fleet size.",
            potentialSavings: 20000,
            priority: "high",
            implementation: "Analyze trip patterns and consolidate routes.",
          },
          {
            type: "driver",
            title: "Driver Training Program",
            description: "Implement driver training to improve fuel efficiency and safety.",
            potentialSavings: 12000,
            priority: "medium",
            implementation: "Conduct eco-driving training and monitor driver metrics.",
          },
          {
            type: "cost",
            title: "Fuel Card Optimization",
            description: "Negotiate better rates with fuel providers and monitor fuel prices.",
            potentialSavings: 18000,
            priority: "medium",
            implementation: "Compare fuel card providers and optimize fuel procurement.",
          },
        ]);

        setMetrics({
          totalVehicles: 50,
          averageFuelConsumption: 450,
          averageMaintenanceCost: 2500,
          fleetEfficiency: 85,
          predictedMonthlyFuelCost: 67500,
          predictedMonthlyMaintenanceCost: 125000,
        });
      } catch (error) {
        console.error("Error loading analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low":
        return "text-green-600";
      case "medium":
        return "text-yellow-600";
      case "high":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "high":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className={`min-h-screen bg-background p-4 md:p-8 ${isRTL ? "rtl" : "ltr"}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">{t.title}</h1>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t.totalVehicles}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalVehicles}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t.fleetEfficiency}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.fleetEfficiency}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t.predictedMonthlyFuel}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${metrics.predictedMonthlyFuelCost.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="fuel" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="fuel">{t.fuelConsumption}</TabsTrigger>
            <TabsTrigger value="maintenance">{t.maintenanceCost}</TabsTrigger>
            <TabsTrigger value="optimization">{t.fleetOptimization}</TabsTrigger>
          </TabsList>

          {/* Fuel Consumption Tab */}
          <TabsContent value="fuel" className="space-y-4">
            {fuelPredictions.map((prediction) => (
              <Card key={prediction.vehicleId}>
                <CardHeader>
                  <CardTitle>{prediction.vehicleId}</CardTitle>
                  <CardDescription>{t.fuelConsumption}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Consumption Comparison */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{t.currentMonth}</p>
                      <p className="text-2xl font-bold">{prediction.currentMonthConsumption}L</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t.predicted}</p>
                      <p className="text-2xl font-bold">{prediction.predictedMonthConsumption}L</p>
                    </div>
                  </div>

                  {/* Trend */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{t.trend}:</span>
                    <div className="flex items-center gap-1">
                      {prediction.trend === "increasing" ? (
                        <>
                          <TrendingUp className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-medium text-red-600">{t.increasing}</span>
                        </>
                      ) : prediction.trend === "decreasing" ? (
                        <>
                          <TrendingDown className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-600">{t.decreasing}</span>
                        </>
                      ) : (
                        <span className="text-sm font-medium text-yellow-600">{t.stable}</span>
                      )}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <h4 className="font-semibold mb-2">{t.recommendations}</h4>
                    <ul className="space-y-2">
                      {prediction.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Maintenance Cost Tab */}
          <TabsContent value="maintenance" className="space-y-4">
            {maintenancePredictions.map((prediction) => (
              <Card key={prediction.vehicleId}>
                <CardHeader>
                  <CardTitle>{prediction.vehicleId}</CardTitle>
                  <CardDescription>{t.maintenanceCost}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Cost Predictions */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Next Month</p>
                      <p className="text-2xl font-bold">${prediction.predictedCostNextMonth}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Next Quarter</p>
                      <p className="text-2xl font-bold">${prediction.predictedCostNextQuarter}</p>
                    </div>
                  </div>

                  {/* Risk Level */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{t.riskLevel}:</span>
                    <span className={`text-sm font-medium ${getRiskColor(prediction.riskLevel)}`}>
                      {prediction.riskLevel === "low"
                        ? t.low
                        : prediction.riskLevel === "medium"
                          ? t.medium
                          : t.high}
                    </span>
                  </div>

                  {/* Upcoming Maintenance */}
                  <div>
                    <h4 className="font-semibold mb-3">{t.upcomingMaintenance}</h4>
                    <div className="space-y-2">
                      {prediction.upcomingMaintenanceItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start p-2 bg-muted rounded">
                          <div>
                            <p className="font-medium text-sm">{item.type}</p>
                            <p className="text-xs text-muted-foreground">{item.estimatedDate}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-sm">${item.estimatedCost}</p>
                            <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(item.priority)}`}>
                              {item.priority === "low"
                                ? t.low
                                : item.priority === "medium"
                                  ? t.medium
                                  : t.high}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Fleet Optimization Tab */}
          <TabsContent value="optimization" className="space-y-4">
            {recommendations.map((rec, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {rec.type === "route" ? (
                          <Target className="w-5 h-5" />
                        ) : rec.type === "vehicle" ? (
                          <Zap className="w-5 h-5" />
                        ) : rec.type === "driver" ? (
                          <RefreshCw className="w-5 h-5" />
                        ) : (
                          <DollarSign className="w-5 h-5" />
                        )}
                        {rec.title}
                      </CardTitle>
                      <CardDescription>{rec.description}</CardDescription>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full ${getPriorityColor(rec.priority)}`}>
                      {rec.priority === "low"
                        ? t.low
                        : rec.priority === "medium"
                          ? t.medium
                          : t.high}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t.potentialSavings}</p>
                    <p className="text-2xl font-bold text-green-600">${rec.potentialSavings.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t.implementation}</p>
                    <p className="text-sm">{rec.implementation}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Refresh Button */}
        <div className="mt-8 flex justify-center">
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {t.refresh}
          </Button>
        </div>
      </div>
    </div>
  );
}
