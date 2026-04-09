import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * Webhook Event Simulator
 * 
 * Allows platform admins to simulate webhook events from different providers
 * for testing and validation purposes
 */

const PROVIDERS = [
  { id: "sendgrid", name: "SendGrid", description: "Email delivery service" },
  { id: "mailgun", name: "Mailgun", description: "Email API platform" },
  { id: "aws_ses", name: "AWS SES", description: "Amazon Simple Email Service" },
  { id: "microsoft_365", name: "Microsoft 365", description: "Microsoft Exchange Online" },
  { id: "manus_custom", name: "Manus Custom", description: "Custom email provider" },
];

const EVENT_TYPES = [
  { id: "delivered", name: "Delivered", description: "Email successfully delivered" },
  { id: "bounce", name: "Bounce", description: "Email bounced (permanent or temporary)" },
  { id: "complaint", name: "Complaint", description: "Recipient marked as spam" },
  { id: "open", name: "Open", description: "Email opened by recipient" },
  { id: "click", name: "Click", description: "Link clicked in email" },
  { id: "failed", name: "Failed", description: "Email delivery failed" },
  { id: "deferred", name: "Deferred", description: "Email delivery deferred" },
];

export function WebhookEventSimulator() {
  const [selectedProvider, setSelectedProvider] = useState<string>("sendgrid");
  const [selectedEventType, setSelectedEventType] = useState<string>("delivered");
  const [recipientEmail, setRecipientEmail] = useState<string>("test@example.com");
  const [messageId, setMessageId] = useState<string>(`msg_${Date.now()}`);
  const [customData, setCustomData] = useState<string>("{}");
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const simulateMutation = trpc.emailWebhook.simulateEvent.useMutation({
    onSuccess: (result) => {
      setSimulationResult({
        success: true,
        message: "Webhook event simulated successfully",
        data: result,
      });
      setIsSimulating(false);
    },
    onError: (error) => {
      setSimulationResult({
        success: false,
        message: error.message || "Failed to simulate webhook event",
        error: error,
      });
      setIsSimulating(false);
    },
  });

  const handleSimulate = async () => {
    try {
      // Validate JSON
      const parsedData = JSON.parse(customData);

      setIsSimulating(true);
      await simulateMutation.mutateAsync({
        provider: selectedProvider as any,
        eventType: selectedEventType as any,
        recipientEmail,
        messageId,
        eventData: parsedData,
      });
    } catch (error: any) {
      setSimulationResult({
        success: false,
        message: "Invalid JSON in custom data",
        error: error.message,
      });
    }
  };

  const provider = PROVIDERS.find((p) => p.id === selectedProvider);
  const eventType = EVENT_TYPES.find((e) => e.id === selectedEventType);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Webhook Event Simulator</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Test webhook event processing by simulating events from different providers
        </p>
      </div>

      {/* Simulator Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Simulate Webhook Event</CardTitle>
          <CardDescription>Configure and send a test webhook event</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Provider Selection */}
          <div>
            <label className="text-sm font-medium block mb-2">Email Provider</label>
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {provider && (
              <p className="text-xs text-muted-foreground mt-2">{provider.description}</p>
            )}
          </div>

          {/* Event Type Selection */}
          <div>
            <label className="text-sm font-medium block mb-2">Event Type</label>
            <Select value={selectedEventType} onValueChange={setSelectedEventType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{e.name}</span>
                      <span className="text-xs text-muted-foreground">{e.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {eventType && (
              <p className="text-xs text-muted-foreground mt-2">{eventType.description}</p>
            )}
          </div>

          {/* Recipient Email */}
          <div>
            <label className="text-sm font-medium block mb-2">Recipient Email</label>
            <Input
              placeholder="test@example.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
          </div>

          {/* Message ID */}
          <div>
            <label className="text-sm font-medium block mb-2">Message ID</label>
            <Input
              placeholder="e.g., msg_123456789"
              value={messageId}
              onChange={(e) => setMessageId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Unique identifier for the email message
            </p>
          </div>

          {/* Custom Event Data */}
          <div>
            <label className="text-sm font-medium block mb-2">Custom Event Data (JSON)</label>
            <Textarea
              placeholder='{"timestamp": "2026-03-15T01:00:00Z", "status": "delivered"}'
              value={customData}
              onChange={(e) => setCustomData(e.target.value)}
              rows={4}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Optional: Add provider-specific event data as JSON
            </p>
          </div>

          {/* Simulate Button */}
          <Button
            className="w-full gap-2"
            onClick={handleSimulate}
            disabled={isSimulating}
          >
            {isSimulating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Simulating...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Simulate Event
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Simulation Result */}
      {simulationResult && (
        <Card
          className={
            simulationResult.success
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }
        >
          <CardHeader>
            <div className="flex items-center gap-2">
              {simulationResult.success ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <CardTitle className="text-base text-green-900">
                    Simulation Successful
                  </CardTitle>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <CardTitle className="text-base text-red-900">
                    Simulation Failed
                  </CardTitle>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p
              className={
                simulationResult.success
                  ? "text-sm text-green-800"
                  : "text-sm text-red-800"
              }
            >
              {simulationResult.message}
            </p>
            {simulationResult.data && (
              <div className="bg-background rounded p-3 text-xs font-mono overflow-auto max-h-48">
                <pre>{JSON.stringify(simulationResult.data, null, 2)}</pre>
              </div>
            )}
            {simulationResult.error && (
              <div className="bg-background rounded p-3 text-xs font-mono text-red-600 overflow-auto max-h-48">
                <pre>{JSON.stringify(simulationResult.error, null, 2)}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Provider Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Provider Examples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="font-medium mb-2">SendGrid Webhook Format</p>
            <code className="bg-muted p-2 rounded block text-xs overflow-auto">
              {JSON.stringify(
                {
                  event: "delivered",
                  email: "test@example.com",
                  timestamp: 1234567890,
                  "message-id": "msg_123456",
                },
                null,
                2
              )}
            </code>
          </div>

          <div>
            <p className="font-medium mb-2">Mailgun Webhook Format</p>
            <code className="bg-muted p-2 rounded block text-xs overflow-auto">
              {JSON.stringify(
                {
                  "event-data": {
                    event: "delivered",
                    recipient: "test@example.com",
                    timestamp: 1234567890,
                    "message-id": "<msg_123456@example.com>",
                  },
                },
                null,
                2
              )}
            </code>
          </div>

          <div>
            <p className="font-medium mb-2">AWS SES Bounce Format</p>
            <code className="bg-muted p-2 rounded block text-xs overflow-auto">
              {JSON.stringify(
                {
                  bounce: {
                    bounceType: "Permanent",
                    bounceSubType: "General",
                    bouncedRecipients: [
                      {
                        emailAddress: "test@example.com",
                        status: "5.1.1",
                        diagnosticCode: "smtp; 550 5.1.1 user unknown",
                      },
                    ],
                  },
                },
                null,
                2
              )}
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
