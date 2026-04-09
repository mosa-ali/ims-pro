import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Mail } from "lucide-react";
import EmailTemplatesTab from "@/components/email-management/EmailTemplatesTab";
import EmailQueueTab from "@/components/email-management/EmailQueueTab";
import EmailWebhooksTab from "@/components/email-management/EmailWebhooksTab";
import EmailAnalyticsTab from "@/components/email-management/EmailAnalyticsTab";

/**
 * Platform Email Management Module
 * 
 * Platform-level email governance and monitoring dashboard
 * Provides cross-organization visibility into:
 * - Email template inventory and management
 * - Queue/delivery status and troubleshooting
 * - Webhook event processing
 * - Analytics and metrics
 * 
 * Access: Platform Admin only
 * Scope: All organizations
 */
export default function EmailManagement() {
  const { user, isAuthenticated, loading } = useAuth();
  const { isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState("templates");

  // Access control: Platform Admin and Platform Super Admin only
  const isAuthorized = user?.role === "admin" || user?.role === "platform_admin" || user?.role === "platform_super_admin";
  if (!loading && (!isAuthenticated || !isAuthorized)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <CardTitle>Access Denied</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This module is only available to Platform Administrators (platform_admin or platform_super_admin).
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Mail className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading Email Management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-background", isRTL && "rtl")}>
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
            <Mail className="w-8 h-8 text-primary" />
            <div className={isRTL ? "text-right" : "text-left"}>
              <h1 className="text-3xl font-bold text-foreground">Email Management</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Platform-wide email governance, queue monitoring, and analytics
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Email Governance Dashboard</CardTitle>
            <CardDescription>
              Monitor email delivery, manage templates, process webhooks, and track analytics across all organizations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className={cn(
                "grid w-full grid-cols-4",
                isRTL && "flex-row-reverse"
              )}>
                <TabsTrigger value="templates">Templates</TabsTrigger>
                <TabsTrigger value="queue">Queue/Delivery</TabsTrigger>
                <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              {/* Templates Tab */}
              <TabsContent value="templates" className="mt-6">
                <EmailTemplatesTab />
              </TabsContent>

              {/* Queue/Delivery Tab */}
              <TabsContent value="queue" className="mt-6">
                <EmailQueueTab />
              </TabsContent>

              {/* Webhooks Tab */}
              <TabsContent value="webhooks" className="mt-6">
                <EmailWebhooksTab />
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="mt-6">
                <EmailAnalyticsTab />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
