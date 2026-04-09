import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, RefreshCw, Activity } from "lucide-react";
import { HealthStatus, checkBackendReady } from "@/lib/health";
import DashboardLayout from "@/layouts/DashboardLayoutNew";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

export default function SystemStatus() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const status = await checkBackendReady();
      setHealthStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch health status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && user && user.role !== "admin") {
      setLocation("/dashboard");
    }
  }, [user, authLoading, setLocation]);

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  const ServiceStatus = ({ name, status }: { name: string; status: boolean }) => (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-3">
        {status ? (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        ) : (
          <XCircle className="h-5 w-5 text-red-600" />
        )}
        <span className="font-medium">{name}</span>
      </div>
      <Badge variant={status ? "default" : "destructive"}>
        {status ? "Healthy" : "Unhealthy"}
      </Badge>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Activity className="h-8 w-8" />
              System Status
            </h1>
            <p className="text-muted-foreground mt-2">
              Monitor the health and status of all system services
            </p>
          </div>
          <Button onClick={fetchHealth} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-red-800">
                <XCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Service Health</CardTitle>
            <CardDescription>
              Real-time status of all critical system components
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : healthStatus ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg mb-6">
                  <div>
                    <div className="text-sm text-muted-foreground">Overall Status</div>
                    <div className="text-2xl font-bold">
                      {healthStatus.status === "READY" ? "System Ready" : "System Not Ready"}
                    </div>
                  </div>
                  <Badge
                    variant={healthStatus.status === "READY" ? "default" : "destructive"}
                    className="text-lg px-4 py-2"
                  >
                    {healthStatus.status}
                  </Badge>
                </div>

                <ServiceStatus name="API Server" status={healthStatus.services.api} />
                <ServiceStatus name="Database" status={healthStatus.services.database} />
                <ServiceStatus name="Authentication" status={healthStatus.services.auth} />
                <ServiceStatus name="Environment Variables" status={healthStatus.services.env} />

                <div className="mt-6 pt-6 border-t">
                  <div className="text-sm text-muted-foreground">
                    Last checked: {new Date(healthStatus.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No health data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Environment</span>
                <span className="font-medium">
                  {import.meta.env.MODE === "development" ? "Development" : "Production"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Health Endpoint</span>
                <span className="font-mono text-xs">/health/ready</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
