import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Download, TrendingUp, AlertCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

/**
 * Email Delivery Performance Dashboard
 * 
 * Platform-level analytics showing:
 * - Delivery trends over time
 * - Provider performance comparison
 * - Bounce and complaint rates
 * - Organization performance
 */
export default function PerformanceDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [days, setDays] = useState(30);

  // Check authorization
  if (!authLoading && (!user || (user.role !== "platform_admin" && user.role !== "platform_super_admin"))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Only platform administrators can access the Performance Dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch analytics data
  const { data: summary, isLoading: summaryLoading } =
    trpc.performanceDashboard.getSummary.useQuery({ days });
  const { data: trends, isLoading: trendsLoading } =
    trpc.performanceDashboard.getDeliveryTrends.useQuery({ days });
  const { data: providers, isLoading: providersLoading } =
    trpc.performanceDashboard.getProviderPerformance.useQuery({ days });
  const { data: bounceRates, isLoading: bounceLoading } =
    trpc.performanceDashboard.getBounceRates.useQuery({ days });
  const { data: complaintRates, isLoading: complaintLoading } =
    trpc.performanceDashboard.getComplaintRates.useQuery({ days });
  const { data: organizations, isLoading: orgsLoading } =
    trpc.performanceDashboard.getOrganizationPerformance.useQuery({ days });

  const isLoading =
    summaryLoading ||
    trendsLoading ||
    providersLoading ||
    bounceLoading ||
    complaintLoading ||
    orgsLoading;

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading performance data...</p>
        </div>
      </div>
    );
  }

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Email Delivery Performance Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor email delivery metrics, provider performance, and bounce rates across all organizations
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={days.toString()} onValueChange={(v) => setDays(Number(v))}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Sent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.totalSent || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary?.period}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {summary?.overallSuccessRate || 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary?.totalDelivered || 0} delivered
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Bounce Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {summary?.averageBounceRate || 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary?.totalBounced || 0} bounced
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Complaint Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {summary?.averageComplaintRate || 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary?.totalComplained || 0} complaints
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Delivery Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Delivery Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trends || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sent"
                    stroke="#3b82f6"
                    name="Sent"
                  />
                  <Line
                    type="monotone"
                    dataKey="failed"
                    stroke="#ef4444"
                    name="Failed"
                  />
                  <Line
                    type="monotone"
                    dataKey="bounced"
                    stroke="#f59e0b"
                    name="Bounced"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Provider Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Provider Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={providers || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="provider" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="delivered" fill="#10b981" name="Delivered" />
                  <Bar dataKey="bounced" fill="#f59e0b" name="Bounced" />
                  <Bar dataKey="complained" fill="#ef4444" name="Complained" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bounce Rates */}
          <Card>
            <CardHeader>
              <CardTitle>Bounce Rate Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Hard Bounce</span>
                  <span className="font-semibold">{bounceRates?.hardBounceRate || 0}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full"
                    style={{
                      width: `${Math.min(bounceRates?.hardBounceRate || 0, 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Soft Bounce</span>
                  <span className="font-semibold">{bounceRates?.softBounceRate || 0}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-orange-600 h-2 rounded-full"
                    style={{
                      width: `${Math.min(bounceRates?.softBounceRate || 0, 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Trend: <span className="font-semibold">{bounceRates?.trend}</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Complaint Rates */}
          <Card>
            <CardHeader>
              <CardTitle>Complaint Rate Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall Complaint Rate</span>
                  <span className="font-semibold">{complaintRates?.complaintRate || 0}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full"
                    style={{
                      width: `${Math.min(complaintRates?.complaintRate || 0, 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Spam Complaints</p>
                  <p className="text-lg font-semibold">{complaintRates?.spamComplaints || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Unsubscribe</p>
                  <p className="text-lg font-semibold">{complaintRates?.unsubscribeComplaints || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Organization Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4 font-semibold">Organization</th>
                    <th className="text-right py-2 px-4 font-semibold">Sent</th>
                    <th className="text-right py-2 px-4 font-semibold">Delivered</th>
                    <th className="text-right py-2 px-4 font-semibold">Bounced</th>
                    <th className="text-right py-2 px-4 font-semibold">Success Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {organizations?.map((org: any) => (
                    <tr key={org.organizationId} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">{org.organizationName}</td>
                      <td className="text-right py-3 px-4">{org.totalSent}</td>
                      <td className="text-right py-3 px-4">{org.delivered}</td>
                      <td className="text-right py-3 px-4">{org.bounced}</td>
                      <td className="text-right py-3 px-4">
                        <span className="font-semibold text-green-600">
                          {org.successRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
