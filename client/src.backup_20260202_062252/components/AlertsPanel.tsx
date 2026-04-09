import { trpc } from "@/lib/trpc";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  X,
  Clock
} from "lucide-react";
import { toast } from "sonner";

const severityIcons = {
  info: <Info className="h-5 w-5 text-blue-600" />,
  warning: <AlertTriangle className="h-5 w-5 text-orange-600" />,
  critical: <AlertCircle className="h-5 w-5 text-red-600" />,
};

const severityColors = {
  info: "bg-blue-100 text-blue-800 border-blue-200",
  warning: "bg-orange-100 text-orange-800 border-orange-200",
  critical: "bg-red-100 text-red-800 border-red-200",
};

export function AlertsPanel() {
  const { t } = useTranslation();
  const { data: alerts = [], isLoading, refetch } = trpc.alerts.list.useQuery();

  const acknowledgeMutation = trpc.alerts.acknowledge.useMutation({
    onSuccess: () => {
      toast.success("Alert acknowledged");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const dismissMutation = trpc.alerts.dismiss.useMutation({
    onSuccess: () => {
      toast.success("Alert dismissed");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(date).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.alerts')}</CardTitle>
          <CardDescription>{t('dashboard.alertsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="h-10 w-10 bg-muted rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.alerts')}</CardTitle>
          <CardDescription>{t('dashboard.alertsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50 text-green-600" />
            <p>{t('dashboard.noAlerts')}</p>
            <p className="text-sm mt-1">{t('dashboard.allSystemsRunning')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.alerts')}</CardTitle>
          <CardDescription>{t('dashboard.alertsDesc')} ({alerts.length} active)</CardDescription>
        </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`p-4 rounded-lg border ${severityColors[alert.severity]}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {severityIcons[alert.severity]}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-sm">{alert.title}</h4>
                        <p className="text-xs mt-1 opacity-90">{alert.message}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => dismissMutation.mutate({ alertId: alert.id })}
                        disabled={dismissMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs opacity-75 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(alert.createdAt)}
                      </p>
                      {alert.status === "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => acknowledgeMutation.mutate({ alertId: alert.id })}
                          disabled={acknowledgeMutation.isPending}
                        >
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
