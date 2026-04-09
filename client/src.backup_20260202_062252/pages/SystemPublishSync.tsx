import React, { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/layouts/DashboardLayoutNew";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { RefreshCw, Download, Database, Calendar } from "lucide-react";

export default function SystemPublishSync() {
  const { user } = useAuth();
  
  const [syncSettings, setSyncSettings] = useState({
    autoSync: true,
    syncInterval: "daily",
    lastSyncDate: "2026-01-08 14:30:00",
    enableBackup: true,
    backupFrequency: "weekly",
  });

  const [exportOptions, setExportOptions] = useState({
    includeGrants: true,
    includeProjects: true,
    includeCases: true,
    includeFinance: true,
    includeBeneficiaries: true,
    includeDocuments: false,
  });

  const handleExportData = () => {
    // TODO: Implement data export functionality
    toast.success("Data export started. You will be notified when complete.");
  };

  const handleSyncNow = () => {
    // TODO: Implement manual sync functionality
    toast.success("Manual sync initiated");
  };

  const handleSaveSettings = () => {
    // TODO: Implement save settings to database
    toast.success("Sync settings saved successfully");
  };

  if (user?.role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="container py-6">
          <Card>
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>Only administrators can access system publish and sync settings.</CardDescription>
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
            <RefreshCw className="h-8 w-8" />
            System Publish & Sync
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage data synchronization, backups, and system publishing
          </p>
        </div>

        {/* Sync Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Synchronization Status
            </CardTitle>
            <CardDescription>Current sync status and configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div>
                <p className="font-medium">Last Successful Sync</p>
                <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4" />
                  {syncSettings.lastSyncDate}
                </p>
              </div>
              <Button onClick={handleSyncNow}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Now
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="autoSync">Automatic Synchronization</Label>
                <p className="text-sm text-muted-foreground">Enable automatic data synchronization</p>
              </div>
              <Switch
                id="autoSync"
                checked={syncSettings.autoSync}
                onCheckedChange={(checked) => 
                  setSyncSettings({ ...syncSettings, autoSync: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="enableBackup">Automatic Backups</Label>
                <p className="text-sm text-muted-foreground">Enable automatic system backups</p>
              </div>
              <Switch
                id="enableBackup"
                checked={syncSettings.enableBackup}
                onCheckedChange={(checked) => 
                  setSyncSettings({ ...syncSettings, enableBackup: checked })
                }
              />
            </div>

            <Button onClick={handleSaveSettings}>
              Save Sync Settings
            </Button>
          </CardContent>
        </Card>

        {/* Data Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Data Export
            </CardTitle>
            <CardDescription>Export system data for backup or analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label>Select data to export:</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="includeGrants"
                    checked={exportOptions.includeGrants}
                    onChange={(e) => setExportOptions({ ...exportOptions, includeGrants: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="includeGrants" className="text-sm">Grants</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="includeProjects"
                    checked={exportOptions.includeProjects}
                    onChange={(e) => setExportOptions({ ...exportOptions, includeProjects: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="includeProjects" className="text-sm">Projects</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="includeCases"
                    checked={exportOptions.includeCases}
                    onChange={(e) => setExportOptions({ ...exportOptions, includeCases: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="includeCases" className="text-sm">Cases</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="includeFinance"
                    checked={exportOptions.includeFinance}
                    onChange={(e) => setExportOptions({ ...exportOptions, includeFinance: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="includeFinance" className="text-sm">Finance</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="includeBeneficiaries"
                    checked={exportOptions.includeBeneficiaries}
                    onChange={(e) => setExportOptions({ ...exportOptions, includeBeneficiaries: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="includeBeneficiaries" className="text-sm">Beneficiaries</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="includeDocuments"
                    checked={exportOptions.includeDocuments}
                    onChange={(e) => setExportOptions({ ...exportOptions, includeDocuments: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="includeDocuments" className="text-sm">Documents</label>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleExportData}>
                <Download className="h-4 w-4 mr-2" />
                Export to CSV
              </Button>
              <Button variant="outline" onClick={handleExportData}>
                <Download className="h-4 w-4 mr-2" />
                Export to Excel
              </Button>
              <Button variant="outline" onClick={handleExportData}>
                <Download className="h-4 w-4 mr-2" />
                Export to JSON
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Publish History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Sync History</CardTitle>
            <CardDescription>View recent synchronization and backup activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">Full System Backup</p>
                  <p className="text-xs text-muted-foreground">2026-01-08 14:30:00</p>
                </div>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Success</span>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">Data Synchronization</p>
                  <p className="text-xs text-muted-foreground">2026-01-07 14:30:00</p>
                </div>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Success</span>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">Data Export (CSV)</p>
                  <p className="text-xs text-muted-foreground">2026-01-06 10:15:00</p>
                </div>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Success</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
