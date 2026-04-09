import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
  AlertCircle,
  CheckCircle,
  Clock,
  Mail,
  TrendingUp,
  Eye,
  MousePointer,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  queued: "#94a3b8",
  sending: "#3b82f6",
  sent: "#10b981",
  delivered: "#06b6d4",
  bounced: "#ef4444",
  complained: "#f59e0b",
  opened: "#8b5cf6",
  clicked: "#ec4899",
  failed: "#dc2626",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  queued: <Clock className="w-4 h-4" />,
  sending: <RefreshCw className="w-4 h-4 animate-spin" />,
  sent: <Mail className="w-4 h-4" />,
  delivered: <CheckCircle className="w-4 h-4" />,
  bounced: <AlertTriangle className="w-4 h-4" />,
  complained: <AlertCircle className="w-4 h-4" />,
  opened: <Eye className="w-4 h-4" />,
  clicked: <MousePointer className="w-4 h-4" />,
  failed: <AlertCircle className="w-4 h-4" />,
};

export default function EmailDeliveryDashboard() {
  const { user } = useAuth();
  const [selectedOrg, setSelectedOrg] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Get stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.emailDeliveryStatus.getStats.useQuery(
    { organizationId: selectedOrg || 0 },
    { enabled: !!selectedOrg, refetchInterval: autoRefresh ? 30000 : false }
  );

  // Get recent events
  const { data: recentEvents, isLoading: eventsLoading, refetch: refetchEvents } = trpc.emailDeliveryStatus.getRecentEvents.useQuery(
    { organizationId: selectedOrg || 0, limit: 10 },
    { enabled: !!selectedOrg, refetchInterval: autoRefresh ? 30000 : false }
  );

  // Get engagement metrics
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = trpc.emailDeliveryStatus.getEngagementMetrics.useQuery(
    { organizationId: selectedOrg || 0 },
    { enabled: !!selectedOrg, refetchInterval: autoRefresh ? 30000 : false }
  );

  // Get bounced emails
  const { data: bouncedEmails, isLoading: bouncedLoading } = trpc.emailDeliveryStatus.getBouncedEmails.useQuery(
    { organizationId: selectedOrg || 0, limit: 5 },
    { enabled: !!selectedOrg }
  );

  // Get complained emails
  const { data: complainedEmails, isLoading: complainedLoading } = trpc.emailDeliveryStatus.getComplainedEmails.useQuery(
    { organizationId: selectedOrg || 0, limit: 5 },
    { enabled: !!selectedOrg }
  );

  const handleRefresh = () => {
    refetchStats();
    refetchEvents();
    refetchMetrics();
    toast.success("Dashboard refreshed");
  };

  if (!user?.organizationIds || user.organizationIds.length === 0) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
        <p className="text-muted-foreground">No organizations available</p>
      </div>
    );
  }

  // Prepare chart data
  const statusChartData = stats
    ? [
        { name: "Queued", value: stats.queued || 0, fill: STATUS_COLORS.queued },
        { name: "Sending", value: stats.sending || 0, fill: STATUS_COLORS.sending },
        { name: "Sent", value: stats.sent || 0, fill: STATUS_COLORS.sent },
        { name: "Delivered", value: stats.delivered || 0, fill: STATUS_COLORS.delivered },
        { name: "Bounced", value: stats.bounced || 0, fill: STATUS_COLORS.bounced },
        { name: "Complained", value: stats.complained || 0, fill: STATUS_COLORS.complained },
        { name: "Opened", value: stats.opened || 0, fill: STATUS_COLORS.opened },
        { name: "Clicked", value: stats.clicked || 0, fill: STATUS_COLORS.clicked },
        { name: "Failed", value: stats.failed || 0, fill: STATUS_COLORS.failed },
      ]
    : [];

  const engagementChartData = metrics
    ? [
        { name: "Open Rate", value: parseFloat(metrics.openRate.toFixed(2)) },
        { name: "Click Rate", value: parseFloat(metrics.clickRate.toFixed(2)) },
        { name: "Bounce Rate", value: parseFloat(metrics.bounceRate.toFixed(2)) },
        { name: "Complaint Rate", value: parseFloat(metrics.complaintRate.toFixed(2)) },
      ]
    : [];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Email Delivery Dashboard</h1>
            <p className="text-muted-foreground">Real-time email delivery status and engagement metrics</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={autoRefresh ? "default" : "outline"}
              onClick={() => setAutoRefresh(!autoRefresh)}
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
            </Button>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Organization Selector */}
        <Select value={selectedOrg?.toString() || ""} onValueChange={(val) => setSelectedOrg(parseInt(val))}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Choose an organization" />
          </SelectTrigger>
          <SelectContent>
            {user.organizationIds.map((orgId) => (
              <SelectItem key={orgId} value={orgId.toString()}>
                Organization {orgId}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedOrg && (
        <>
          {/* Key Metrics */}
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Sent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.totalSent}</div>
                  <p className="text-xs text-muted-foreground mt-1">emails</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Open Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.openRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground mt-1">{metrics.totalOpened} opens</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Click Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.clickRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground mt-1">{metrics.totalClicked} clicks</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Bounce Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{metrics.bounceRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground mt-1">{metrics.totalBounced} bounces</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Complaint Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">{metrics.complaintRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground mt-1">{metrics.totalComplained} complaints</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Email Status Distribution</CardTitle>
                <CardDescription>Current status of all emails</CardDescription>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    Loading...
                  </div>
                ) : statusChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Engagement Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Engagement Metrics</CardTitle>
                <CardDescription>Email engagement rates</CardDescription>
              </CardHeader>
              <CardContent>
                {metricsLoading ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    Loading...
                  </div>
                ) : engagementChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={engagementChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis label={{ value: "Percentage (%)", angle: -90, position: "insideLeft" }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tabs for detailed views */}
          <Tabs defaultValue="recent" className="mb-6">
            <TabsList>
              <TabsTrigger value="recent">Recent Events</TabsTrigger>
              <TabsTrigger value="bounced">Bounced Emails</TabsTrigger>
              <TabsTrigger value="complained">Complained Emails</TabsTrigger>
            </TabsList>

            {/* Recent Events */}
            <TabsContent value="recent">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Delivery Events</CardTitle>
                  <CardDescription>Latest email status changes</CardDescription>
                </CardHeader>
                <CardContent>
                  {eventsLoading ? (
                    <div className="py-8 text-center text-muted-foreground">Loading...</div>
                  ) : recentEvents && recentEvents.length > 0 ? (
                    <div className="space-y-4">
                      {recentEvents.map((event) => (
                        <div
                          key={event.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="p-2 rounded-lg"
                              style={{ backgroundColor: `${STATUS_COLORS[event.currentStatus]}20` }}
                            >
                              {STATUS_ICONS[event.currentStatus]}
                            </div>
                            <div>
                              <p className="font-medium capitalize">{event.currentStatus}</p>
                              <p className="text-sm text-muted-foreground">
                                {event.lastEventType} • {event.eventCount} events
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge
                              style={{ backgroundColor: STATUS_COLORS[event.currentStatus] }}
                              className="text-white"
                            >
                              {event.currentStatus}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(event.statusChangedAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">No recent events</div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bounced Emails */}
            <TabsContent value="bounced">
              <Card>
                <CardHeader>
                  <CardTitle>Bounced Emails</CardTitle>
                  <CardDescription>Emails that were bounced by the email provider</CardDescription>
                </CardHeader>
                <CardContent>
                  {bouncedLoading ? (
                    <div className="py-8 text-center text-muted-foreground">Loading...</div>
                  ) : bouncedEmails && bouncedEmails.length > 0 ? (
                    <div className="space-y-3">
                      {bouncedEmails.map((email) => (
                        <div key={email.id} className="p-3 border rounded-lg bg-red-50 dark:bg-red-950/20">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-red-900 dark:text-red-100">
                                {email.bounceType ? `${email.bounceType} Bounce` : "Bounce"}
                              </p>
                              <p className="text-sm text-red-700 dark:text-red-200">
                                {email.bounceSubtype || "Unknown reason"}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(email.statusChangedAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">No bounced emails</div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Complained Emails */}
            <TabsContent value="complained">
              <Card>
                <CardHeader>
                  <CardTitle>Complained Emails</CardTitle>
                  <CardDescription>Emails marked as spam or abuse</CardDescription>
                </CardHeader>
                <CardContent>
                  {complainedLoading ? (
                    <div className="py-8 text-center text-muted-foreground">Loading...</div>
                  ) : complainedEmails && complainedEmails.length > 0 ? (
                    <div className="space-y-3">
                      {complainedEmails.map((email) => (
                        <div key={email.id} className="p-3 border rounded-lg bg-amber-50 dark:bg-amber-950/20">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-amber-900 dark:text-amber-100">Spam Complaint</p>
                              <p className="text-sm text-amber-700 dark:text-amber-200">
                                {email.complaintType || "User marked as spam"}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(email.statusChangedAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">No complained emails</div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
