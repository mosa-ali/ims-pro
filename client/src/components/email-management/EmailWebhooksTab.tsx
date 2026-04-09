import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Webhook, RefreshCw, Copy, Check, AlertCircle, CheckCircle2, Clock, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { WebhookEventSimulator } from "./WebhookEventSimulator";

/**
 * Email Webhooks Tab
 * 
 * Webhook event processing and provider health
 * Features:
 * - Recent webhook events with real-time updates
 * - Provider delivery status
 * - Signature verification result
 * - Processing result
 * - Webhook health/troubleshooting
 * - API key and HMAC verification
 * - Event filtering by provider and status
 */
export default function EmailWebhooksTab() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>();

  // Fetch webhook configuration
  const { data: config, isLoading: configLoading } = trpc.emailWebhook.getConfiguration.useQuery();

  // Fetch webhook events
  const { data: eventsData, isLoading: eventsLoading, refetch } = trpc.emailWebhook.getEvents.useQuery({
    provider: selectedProvider as any,
    status: selectedStatus as any,
    limit: 20,
    offset: 0,
  });

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "processed":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <Webhook className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "processed":
        return "default";
      case "failed":
        return "destructive";
      case "pending":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case "delivered":
        return "bg-green-100 text-green-800";
      case "bounce":
        return "bg-red-100 text-red-800";
      case "complaint":
        return "bg-orange-100 text-orange-800";
      case "open":
        return "bg-blue-100 text-blue-800";
      case "click":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (configLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Webhook Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook Configuration</CardTitle>
          <CardDescription>
            Configure webhooks to receive delivery status updates from email providers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Webhook Endpoint */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              Webhook Endpoint
            </label>
            <div className="flex gap-2">
              <code className="flex-1 bg-muted p-3 rounded-lg text-sm font-mono text-muted-foreground break-all">
                {config?.webhookUrl || "/api/webhooks/email-delivery"}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyKey(config?.webhookUrl || "/api/webhooks/email-delivery")}
              >
                {copiedKey === config?.webhookUrl ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* API Key */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              API Key (for authentication)
            </label>
            <div className="flex gap-2">
              <code className="flex-1 bg-muted p-3 rounded-lg text-sm font-mono text-muted-foreground break-all">
                {config?.apiKey ? `${config.apiKey.substring(0, 10)}...` : "sk_test_***"}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyKey(config?.apiKey || "")}
              >
                {copiedKey === config?.apiKey ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Security Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Security Features</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              {config?.securityFeatures?.map((feature, idx) => (
                <li key={idx}>✓ {feature}</li>
              ))}
            </ul>
          </div>

          {/* Supported Providers */}
          <div>
            <h4 className="font-medium text-foreground mb-3">Supported Providers</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {config?.supportedProviders?.map((provider) => (
                <div key={provider} className="flex items-center gap-2 p-3 border border-border rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-sm capitalize">{provider.replace(/_/g, " ")}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Event Simulator */}
      <WebhookEventSimulator />

      {/* Recent Webhook Events */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle>Recent Webhook Events</CardTitle>
              <CardDescription>Latest webhook events from email providers</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => refetch()}
              disabled={eventsLoading}
            >
              <RefreshCw className={`w-4 h-4 ${eventsLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Provider</label>
              <select
                value={selectedProvider || ""}
                onChange={(e) => setSelectedProvider(e.target.value || undefined)}
                className="text-sm border border-border rounded px-2 py-1 bg-background"
              >
                <option value="">All Providers</option>
                {config?.supportedProviders?.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Status</label>
              <select
                value={selectedStatus || ""}
                onChange={(e) => setSelectedStatus(e.target.value || undefined)}
                className="text-sm border border-border rounded px-2 py-1 bg-background"
              >
                <option value="">All Status</option>
                <option value="processed">Processed</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : eventsData?.events && eventsData.events.length > 0 ? (
            <div className="space-y-3">
              {eventsData.events.map((event) => (
                <div key={event.id} className="border border-border rounded-lg p-4 hover:bg-muted/50 transition">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(event.status)}
                      <div>
                        <p className="font-medium text-sm">
                          {event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)}
                        </p>
                        <p className="text-xs text-muted-foreground">{event.recipientEmail}</p>
                      </div>
                    </div>
                    <Badge variant={getStatusBadgeVariant(event.status)}>
                      {event.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getEventTypeColor(event.eventType)}`}>
                      {event.eventType}
                    </span>
                    <span>•</span>
                    <span className="capitalize">{event.provider.replace(/_/g, " ")}</span>
                    <span>•</span>
                    <span>{new Date(event.createdAt).toLocaleString()}</span>
                  </div>
                  {event.failureReason && (
                    <p className="text-xs text-red-600 mt-2">Error: {event.failureReason}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Webhook className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Webhook Events</h3>
              <p className="text-sm text-muted-foreground">
                Webhook events will appear here as providers send delivery status updates
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhook Features Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Webhook Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
            <div>
              <p className="font-medium">Provider-Agnostic Design</p>
              <p className="text-muted-foreground">Support for multiple email providers with unified interface</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
            <div>
              <p className="font-medium">API Key Verification</p>
              <p className="text-muted-foreground">Secure authentication for webhook requests</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
            <div>
              <p className="font-medium">HMAC Signature Verification</p>
              <p className="text-muted-foreground">Verify payload authenticity and prevent tampering</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
            <div>
              <p className="font-medium">Automatic Queue Updates</p>
              <p className="text-muted-foreground">Webhook events automatically update email queue status</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
            <div>
              <p className="font-medium">Event Logging</p>
              <p className="text-muted-foreground">All webhook events logged for audit trail and troubleshooting</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
