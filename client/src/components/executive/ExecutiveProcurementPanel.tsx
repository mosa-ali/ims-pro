/**
 * client/src/components/dashboard/ExecutiveProcurementPanel.tsx
 * 
 * Procurement & Logistics Performance Widget
 * 
 * Displays real-time PR analytics with:
 * - Interactive donut chart (Approved, Pending, Rejected)
 * - KPI summary (Total PRs, Approval Rate, Pending Rate, Rejected Rate)
 * - Navigation to purchase requests details
 * 
 * DESIGN:
 * - Center KPI: Total PRs count
 * - Donut Chart: Status distribution (Green/Amber/Red)
 * - Footer: Approval Rate, Pending Rate, Rejected Rate
 * - View Details: Navigate to /organization/logistics/purchase-requests
 * 
 * DATA SOURCE: Live database only (zero mock data)
 */

import React, { useMemo } from "react";
import { useLocation } from "wouter";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

interface ProcurementMetrics {
  totalPRs: number;
  approvedPRs: number;
  pendingPRs: number;
  rejectedPRs: number;
  approvalRate: number;
  pendingRate: number;
  rejectedRate: number;
}

interface ExecutiveProcurementPanelProps {
  organizationId: number;
  operatingUnitId?: number | null;
}

/**
 * Donut chart data formatter
 */
function formatChartData(metrics: ProcurementMetrics) {
  return [
    {
      name: "Approved",
      value: metrics.approvedPRs,
      color: "#10b981", // Green
    },
    {
      name: "Pending",
      value: metrics.pendingPRs,
      color: "#f59e0b", // Amber
    },
    {
      name: "Rejected",
      value: metrics.rejectedPRs,
      color: "#ef4444", // Red
    },
  ].filter((item) => item.value > 0); // Only show segments with data
}

/**
 * Custom tooltip for donut chart
 */
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border border-border rounded shadow-lg">
        <p className="text-sm font-medium">{payload[0].name}</p>
        <p className="text-sm text-muted-foreground">{payload[0].value} PRs</p>
      </div>
    );
  }
  return null;
}

/**
 * ExecutiveProcurementPanel Component
 */
export function ExecutiveProcurementPanel({
  organizationId,
  operatingUnitId,
}: ExecutiveProcurementPanelProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Query procurement analytics
  const {
  data,
  isLoading,
  error,
} =
  trpc.procurementAnalytics
    .getProcurementAnalytics
    .useQuery();

  // Format chart data
  const chartData = useMemo(() => {
    if (!data?.data) return [];
    return formatChartData(data.data);
  }, [data]);

  // Handle empty state
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Procurement & Logistics Performance</CardTitle>
          <CardDescription>Loading procurement analytics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Procurement & Logistics Performance</CardTitle>
          <CardDescription>Error loading procurement analytics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-destructive text-sm">{error.message}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.data || data.data.totalPRs === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Procurement & Logistics Performance</CardTitle>
          <CardDescription>Purchase request analytics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">No purchase requests found.</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const metrics = data.data;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Procurement & Logistics Performance
            </CardTitle>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        {/* Center KPI and Donut Chart */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value, entry) =>
                    `${value}: ${entry?.payload?.value ?? 0}`
                    }
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-4xl font-bold text-foreground">{metrics.totalPRs}</div>
              <div className="text-sm text-muted-foreground">PRs</div>
            </div>
          </div>
        </div>

        {/* Footer Metrics */}
        <div className="border-t pt-4 mt-4">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Approval Rate</div>
              <div className="text-lg font-semibold text-green-600">{metrics.approvalRate}%</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Pending</div>
              <div className="text-lg font-semibold text-amber-600">{metrics.pendingRate}%</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Rejected</div>
              <div className="text-lg font-semibold text-red-600">{metrics.rejectedRate}%</div>
            </div>
          </div>

          {/* View Details Button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setLocation("/organization/logistics/purchase-requests")}
          >
            View Details
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default ExecutiveProcurementPanel;
