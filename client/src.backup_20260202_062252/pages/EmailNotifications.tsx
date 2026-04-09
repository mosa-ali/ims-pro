import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTranslation } from "react-i18next";
import DashboardLayout from "@/layouts/DashboardLayoutNew";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Bell, Save, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function EmailNotifications() {
  const { user } = useAuth();
  const { t } = useTranslation();
  
  const [notificationSettings, setNotificationSettings] = useState({
    enableEmailNotifications: true,
    enableGrantAlerts: true,
    enableProjectUpdates: true,
    enableCaseAlerts: true,
    enableFinanceAlerts: true,
    enableSystemAlerts: true,
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    try {
      // TODO: Implement backend API call to save notification preferences
      // await trpc.notifications.updatePreferences.mutate(notificationSettings);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast.success(t("settings.notifications.saveSuccess") || "Notification preferences saved successfully");
    } catch (error) {
      toast.error(t("settings.notifications.saveError") || "Failed to save notification preferences");
    } finally {
      setIsSaving(false);
    }
  };

  // Only organization admins can access this page
  if (user?.role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="container py-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("common.accessDenied") || "Access Denied"}</CardTitle>
              <CardDescription>
                {t("settings.notifications.adminOnly") || "Only organization administrators can access notification settings."}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8" />
            {t("settings.notifications.title") || "Email & Notifications"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("settings.notifications.description") || "Configure notification preferences for your organization"}
          </p>
        </div>

        {/* System Email Information */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {t("settings.notifications.systemInfo") || 
              "Email delivery is managed at the system level using Microsoft 365. Organization administrators can control which notifications are sent, but email infrastructure is configured by system administrators."}
          </AlertDescription>
        </Alert>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {t("settings.notifications.preferences") || "Notification Preferences"}
            </CardTitle>
            <CardDescription>
              {t("settings.notifications.preferencesDescription") || "Choose which notifications to receive"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Master Switch */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div className="space-y-1">
                <Label htmlFor="enableEmailNotifications" className="text-base font-semibold">
                  {t("settings.notifications.enableAll") || "Enable Email Notifications"}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("settings.notifications.enableAllDescription") || "Master switch for all email notifications"}
                </p>
              </div>
              <Switch
                id="enableEmailNotifications"
                checked={notificationSettings.enableEmailNotifications}
                onCheckedChange={(checked) => 
                  setNotificationSettings({ ...notificationSettings, enableEmailNotifications: checked })
                }
              />
            </div>

            {/* Individual Notification Toggles */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="enableGrantAlerts">
                    {t("settings.notifications.grantAlerts") || "Grant Alerts"}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.notifications.grantAlertsDescription") || "Notifications for grant approvals and updates"}
                  </p>
                </div>
                <Switch
                  id="enableGrantAlerts"
                  checked={notificationSettings.enableGrantAlerts}
                  onCheckedChange={(checked) => 
                    setNotificationSettings({ ...notificationSettings, enableGrantAlerts: checked })
                  }
                  disabled={!notificationSettings.enableEmailNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="enableProjectUpdates">
                    {t("settings.notifications.projectUpdates") || "Project Updates"}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.notifications.projectUpdatesDescription") || "Notifications for project status changes"}
                  </p>
                </div>
                <Switch
                  id="enableProjectUpdates"
                  checked={notificationSettings.enableProjectUpdates}
                  onCheckedChange={(checked) => 
                    setNotificationSettings({ ...notificationSettings, enableProjectUpdates: checked })
                  }
                  disabled={!notificationSettings.enableEmailNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="enableCaseAlerts">
                    {t("settings.notifications.caseAlerts") || "Case Alerts"}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.notifications.caseAlertsDescription") || "Notifications for case assignments and updates"}
                  </p>
                </div>
                <Switch
                  id="enableCaseAlerts"
                  checked={notificationSettings.enableCaseAlerts}
                  onCheckedChange={(checked) => 
                    setNotificationSettings({ ...notificationSettings, enableCaseAlerts: checked })
                  }
                  disabled={!notificationSettings.enableEmailNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="enableFinanceAlerts">
                    {t("settings.notifications.financeAlerts") || "Finance Alerts"}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.notifications.financeAlertsDescription") || "Notifications for budget and expenditure alerts"}
                  </p>
                </div>
                <Switch
                  id="enableFinanceAlerts"
                  checked={notificationSettings.enableFinanceAlerts}
                  onCheckedChange={(checked) => 
                    setNotificationSettings({ ...notificationSettings, enableFinanceAlerts: checked })
                  }
                  disabled={!notificationSettings.enableEmailNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="enableSystemAlerts">
                    {t("settings.notifications.systemAlerts") || "System Alerts"}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.notifications.systemAlertsDescription") || "Notifications for system maintenance and updates"}
                  </p>
                </div>
                <Switch
                  id="enableSystemAlerts"
                  checked={notificationSettings.enableSystemAlerts}
                  onCheckedChange={(checked) => 
                    setNotificationSettings({ ...notificationSettings, enableSystemAlerts: checked })
                  }
                  disabled={!notificationSettings.enableEmailNotifications}
                />
              </div>
            </div>

            <div className="pt-4">
              <Button 
                onClick={handleSaveNotifications}
                disabled={isSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving 
                  ? (t("common.saving") || "Saving...") 
                  : (t("common.save") || "Save Preferences")
                }
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Email Templates Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.notifications.emailTemplates") || "Email Templates"}</CardTitle>
            <CardDescription>
              {t("settings.notifications.emailTemplatesDescription") || 
                "Email templates are managed by the system and automatically adapt to your organization's language settings (English/Arabic)."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                {t("settings.notifications.templatesInfo") || 
                  "The following email templates are available:"}
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>{t("settings.notifications.template.grantApproval") || "Grant Approval Notifications"}</li>
                <li>{t("settings.notifications.template.projectUpdate") || "Project Status Updates"}</li>
                <li>{t("settings.notifications.template.caseAssignment") || "Case Assignment Alerts"}</li>
                <li>{t("settings.notifications.template.financeAlert") || "Budget and Expenditure Alerts"}</li>
                <li>{t("settings.notifications.template.systemAlert") || "System Maintenance Notifications"}</li>
              </ul>
              <p className="mt-4">
                {t("settings.notifications.templatesContact") || 
                  "For template customization requests, please contact your system administrator."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
