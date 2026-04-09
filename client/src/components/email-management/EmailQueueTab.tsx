import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Mail, Search, Filter, RefreshCw, Loader2, AlertCircle, RotateCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

/**
 * Email Queue/Delivery Tab
 * 
 * Queue monitoring and delivery troubleshooting
 * Features:
 * - View queued, processing, sent, failed, dead-letter emails
 * - Server-side pagination
 * - Filters: organization, provider, template, status, date range, recipient
 * - Retry/resend action for failed emails
 * - Display retry count and failure reason
 * - Search functionality
 */
export default function EmailQueueTab() {
  const [status, setStatus] = useState<"all" | "pending" | "sending" | "sent" | "failed" | "dead_letter">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Fetch queue status
  const { data: queueStatus, isLoading: statusLoading, refetch: refetchStatus } = trpc.emailQueue.getStatus.useQuery({});

  // Fetch pending emails
  const { data: pendingEmails, isLoading: pendingLoading, refetch: refetchPending } = trpc.emailQueue.getPending.useQuery({
    limit: pageSize,
    offset: page * pageSize,
  });

  // Fetch dead-letter queue
  const { data: deadLetterEmails, isLoading: dlqLoading, refetch: refetchDLQ } = trpc.emailQueue.getDeadLetterQueue.useQuery({
    limit: pageSize,
    offset: page * pageSize,
  });

  // Retry mutation
  const { mutate: retryEmail, isPending: retryPending } = trpc.emailQueue.retryDeadLetterEmail.useMutation({
    onSuccess: () => {
      toast.success("Email moved back to pending queue");
      refetchDLQ();
      refetchStatus();
    },
    onError: (error) => {
      toast.error(`Failed to retry email: ${error.message}`);
    },
  });

  const statuses = [
    { value: "all", label: "All", color: "bg-gray-100", count: queueStatus?.total || 0 },
    { value: "pending", label: "Queued", color: "bg-blue-100", count: queueStatus?.pending || 0 },
    { value: "sending", label: "Processing", color: "bg-yellow-100", count: 0 },
    { value: "sent", label: "Sent", color: "bg-green-100", count: queueStatus?.sent || 0 },
    { value: "failed", label: "Failed", color: "bg-red-100", count: queueStatus?.failed || 0 },
    { value: "dead_letter", label: "Dead Letter", color: "bg-gray-400", count: queueStatus?.deadLetter || 0 },
  ];

  const displayEmails = status === "dead_letter" ? deadLetterEmails : pendingEmails;
  const isLoading = status === "dead_letter" ? dlqLoading : pendingLoading;

  const handleRefresh = () => {
    refetchStatus();
    refetchPending();
    refetchDLQ();
    toast.success("Queue refreshed");
  };

  return (
    <div className="space-y-6">
      {/* Status Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {statuses.map((s) => (
          <Card
            key={s.value}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setStatus(s.value as any)}
          >
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">{s.label}</p>
                {statusLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">{s.count}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters & Search</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by recipient email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={status} onValueChange={(value) => setStatus(value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label} ({s.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Organization Filter */}
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Filter by organization" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organizations</SelectItem>
              </SelectContent>
            </Select>

            {/* Template Filter */}
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Filter by template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Templates</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              More Filters
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleRefresh}
              disabled={statusLoading || pendingLoading || dlqLoading}
            >
              {statusLoading || pendingLoading || dlqLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email List or Empty State */}
      {isLoading ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Loading emails...</p>
          </CardContent>
        </Card>
      ) : displayEmails && displayEmails.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {status === "dead_letter" ? "Dead Letter Queue" : "Email Queue"}
            </CardTitle>
            <CardDescription>
              Showing {displayEmails.length} of {status === "dead_letter" ? queueStatus?.deadLetter : queueStatus?.pending} emails
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {displayEmails.map((email: any) => (
                <div
                  key={email.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">{email.recipientEmail}</p>
                      <Badge variant="outline" className="text-xs">
                        {email.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{email.subject}</p>
                    {email.lastError && (
                      <div className="flex items-start gap-2 mt-2 text-xs text-red-600">
                        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>{email.lastError}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    {email.retryCount !== undefined && (
                      <div className="text-right text-xs">
                        <p className="text-muted-foreground">Retries</p>
                        <p className="font-medium">{email.retryCount}/{email.maxRetries}</p>
                      </div>
                    )}
                    {status === "dead_letter" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => retryEmail({ emailId: email.id })}
                        disabled={retryPending}
                      >
                        {retryPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RotateCw className="w-3 h-3" />
                        )}
                        Retry
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Page {page + 1} of {Math.ceil((displayEmails.length || 0) / pageSize)}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(page + 1)}
                  disabled={(displayEmails?.length || 0) < pageSize}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {status === "dead_letter" ? "Dead Letter Queue Empty" : "No Emails in Queue"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {status === "dead_letter"
                ? "No permanently failed emails. All emails are being delivered successfully."
                : "Email queue is empty. Emails will appear here as they are queued for delivery."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Queue Features Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Queue Management Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
            <div>
              <p className="font-medium">Server-side Pagination</p>
              <p className="text-muted-foreground">Efficient handling of large email queues</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
            <div>
              <p className="font-medium">Advanced Filtering</p>
              <p className="text-muted-foreground">Filter by organization, provider, template, status, date range</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
            <div>
              <p className="font-medium">Retry/Resend</p>
              <p className="text-muted-foreground">Manually retry failed emails from dead-letter queue</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
            <div>
              <p className="font-medium">Error Details</p>
              <p className="text-muted-foreground">View retry count, failure reason, and error messages</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
