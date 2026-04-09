import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { BarChart3, RefreshCw, Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

/**
 * Email Analytics Tab
 * 
 * Platform-wide delivery metrics and trends
 * Features:
 * - Sent volume, failed volume, queued volume
 * - Retry rate, success/failure trends
 * - Metrics by organization
 * - Metrics by template/email type
 * - Metrics by provider
 * - Date range filters (7d, 30d, 90d, custom)
 * - Manual refresh capability
 */
export default function EmailAnalyticsTab() {
  const [dateRange, setDateRange] = useState("30");
  const [granularity, setGranularity] = useState<"daily" | "weekly" | "hourly">("daily");

  // Fetch metrics
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = trpc.emailAnalytics.getMetrics.useQuery({
    days: parseInt(dateRange),
  });

  // Fetch trends
  const { data: trends, isLoading: trendsLoading } = trpc.emailAnalytics.getTrends.useQuery({
    days: parseInt(dateRange),
    granularity,
  });

  // Fetch organization metrics
  const { data: orgMetrics, isLoading: orgLoading } = trpc.emailAnalytics.getByOrganization.useQuery({
    days: parseInt(dateRange),
  });

  // Export mutation
  const { mutate: exportMetrics, isPending: exportPending } = trpc.emailAnalytics.exportMetrics.useMutation({
    onSuccess: (data) => {
      // Create and download CSV
      const element = document.createElement("a");
      const file = new Blob([data.content], { type: "text/csv" });
      element.href = URL.createObjectURL(file);
      element.download = data.filename;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      toast.success("Analytics exported successfully");
    },
    onError: (error) => {
      toast.error(`Failed to export: ${error.message}`);
    },
  });

  const isLoading = metricsLoading || trendsLoading || orgLoading;

  const handleRefresh = () => {
    refetchMetrics();
    toast.success("Analytics refreshed");
  };

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Analytics Period</CardTitle>
              <CardDescription>Select the time range for analytics</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="14">Last 14 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="60">Last 60 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>

              <Select value={granularity} onValueChange={(value) => setGranularity(value as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Loading analytics...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-2">Total Sent</p>
                <p className="text-3xl font-bold text-green-600">{metrics?.summary.sent || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics?.summary.totalEmails || 0} total emails
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-2">Total Failed</p>
                <p className="text-3xl font-bold text-red-600">{metrics?.summary.failed || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics?.summary.failureRate || "0%"} failure rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-2">Total Queued</p>
                <p className="text-3xl font-bold text-blue-600">{metrics?.summary.queued || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Pending delivery</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-2">Avg Retries</p>
                <p className="text-3xl font-bold text-yellow-600">{metrics?.performance.averageRetries || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Max: {metrics?.performance.maxRetries || 0}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Success/Failure Rates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-2">Success Rate</p>
                <div className="inline-block px-3 py-1 rounded-lg bg-green-100 text-green-900 font-semibold">
                  {metrics?.summary.successRate || "0%"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-2">Failure Rate</p>
                <div className="inline-block px-3 py-1 rounded-lg bg-red-100 text-red-900 font-semibold">
                  {metrics?.summary.failureRate || "0%"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-2">Processing</p>
                <div className="inline-block px-3 py-1 rounded-lg bg-yellow-100 text-yellow-900 font-semibold">
                  {metrics?.summary.processing || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Delivery Trends Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery Trends</CardTitle>
              <CardDescription>Email delivery volume and success rate over time ({granularity})</CardDescription>
            </CardHeader>
            <CardContent>
              {trends && trends.trends.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="sent"
                      stroke="#10b981"
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
                      dataKey="pending"
                      stroke="#3b82f6"
                      name="Pending"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-sm text-muted-foreground">No trend data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Failures */}
          {metrics?.topFailures && metrics.topFailures.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Failure Reasons</CardTitle>
                <CardDescription>Most common email delivery failures</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={metrics.topFailures}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="code" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#ef4444" name="Occurrences" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Breakdown by Organization */}
          {orgMetrics && orgMetrics.organizations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Metrics by Organization</CardTitle>
                <CardDescription>Email delivery metrics for each organization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {orgMetrics.organizations.map((org: any) => (
                    <div
                      key={org.organizationId}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm">Organization {org.organizationId}</p>
                        <p className="text-xs text-muted-foreground">
                          {org.total} total emails
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-green-600">{org.sent} sent</p>
                          <p className="text-xs text-muted-foreground">{org.successRate}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-red-600">{org.failed} failed</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Breakdown by Email Type */}
          {metrics?.byTemplate && metrics.byTemplate.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Metrics by Email Type</CardTitle>
                <CardDescription>Delivery metrics for each email template</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.byTemplate.map((template: any) => (
                    <div
                      key={template.templateKey}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm">{template.templateKey}</p>
                        <p className="text-xs text-muted-foreground">
                          {template.total} total emails
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-green-600">{template.sent} sent</p>
                          <p className="text-xs text-muted-foreground">{template.successRate}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-red-600">{template.failed} failed</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Export Button */}
          <div className="flex justify-end">
            <Button
              className="gap-2"
              onClick={() => exportMetrics({ days: parseInt(dateRange) })}
              disabled={exportPending || isLoading}
            >
              {exportPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Export Analytics
            </Button>
          </div>

          {/* Analytics Features Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Analytics Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <div>
                  <p className="font-medium">Multiple Time Ranges</p>
                  <p className="text-muted-foreground">7, 14, 30, 60, or 90 days</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <div>
                  <p className="font-medium">Comprehensive Metrics</p>
                  <p className="text-muted-foreground">Sent, failed, queued, retries, success/failure rates</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <div>
                  <p className="font-medium">Multi-Dimensional Breakdowns</p>
                  <p className="text-muted-foreground">By organization and email type</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <div>
                  <p className="font-medium">Trend Visualization</p>
                  <p className="text-muted-foreground">Charts showing delivery volume and success rates over time</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <div>
                  <p className="font-medium">Export Capability</p>
                  <p className="text-muted-foreground">Download analytics data as CSV for further analysis</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
