import React, { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/layouts/DashboardLayoutNew";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Settings as SettingsIcon, Activity, Shield, AlertTriangle, Search } from "lucide-react";

export default function AdministratorAccess() {
  const { user } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLogType, setSelectedLogType] = useState("all");

  // Mock system logs data
  const systemLogs = [
    {
      id: 1,
      timestamp: "2026-01-08 15:00:00",
      user: "Mosa Drwesh",
      action: "User Login",
      module: "Authentication",
      status: "Success",
      ipAddress: "192.168.1.100",
      details: "Successful login from web interface",
    },
    {
      id: 2,
      timestamp: "2026-01-08 14:45:00",
      user: "Mosa Drwesh",
      action: "Grant Created",
      module: "Grants",
      status: "Success",
      ipAddress: "192.168.1.100",
      details: "Created grant: Emergency Relief Program",
    },
    {
      id: 3,
      timestamp: "2026-01-08 14:30:00",
      user: "System",
      action: "Database Backup",
      module: "System",
      status: "Success",
      ipAddress: "127.0.0.1",
      details: "Automated daily backup completed",
    },
    {
      id: 4,
      timestamp: "2026-01-08 14:15:00",
      user: "Mosa Drwesh",
      action: "Permission Changed",
      module: "Settings",
      status: "Success",
      ipAddress: "192.168.1.100",
      details: "Updated role permissions for Program Manager",
    },
    {
      id: 5,
      timestamp: "2026-01-08 14:00:00",
      user: "Unknown",
      action: "Failed Login Attempt",
      module: "Authentication",
      status: "Failed",
      ipAddress: "203.0.113.45",
      details: "Invalid credentials provided",
    },
  ];

  const systemStats = {
    totalUsers: 12,
    activeUsers: 8,
    totalOrganizations: 2,
    databaseSize: "245 MB",
    lastBackup: "2026-01-08 14:30:00",
    uptime: "15 days, 6 hours",
  };

  const handleClearLogs = () => {
    toast.success("System logs cleared successfully");
  };

  const handleExportLogs = () => {
    toast.success("Exporting system logs...");
  };

  if (user?.role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="container py-6">
          <Card>
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>Only administrators can access system administration settings.</CardDescription>
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
            <SettingsIcon className="h-8 w-8" />
            Administrator Access
          </h1>
          <p className="text-muted-foreground mt-2">
            Advanced system controls, monitoring, and maintenance
          </p>
        </div>

        {/* System Statistics */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.totalUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">{systemStats.activeUsers} active</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Organizations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.totalOrganizations}</div>
              <p className="text-xs text-muted-foreground mt-1">Multi-tenant</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Database Size</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.databaseSize}</div>
              <p className="text-xs text-muted-foreground mt-1">Last backup: {systemStats.lastBackup}</p>
            </CardContent>
          </Card>
        </div>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health
            </CardTitle>
            <CardDescription>Current system status and performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <div>
                  <p className="font-medium text-sm">Database Connection</p>
                  <p className="text-xs text-muted-foreground">Connected and healthy</p>
                </div>
              </div>
              <span className="text-xs text-green-600 font-medium">Operational</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <div>
                  <p className="font-medium text-sm">API Services</p>
                  <p className="text-xs text-muted-foreground">All endpoints responding</p>
                </div>
              </div>
              <span className="text-xs text-green-600 font-medium">Operational</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <div>
                  <p className="font-medium text-sm">File Storage</p>
                  <p className="text-xs text-muted-foreground">S3 connection active</p>
                </div>
              </div>
              <span className="text-xs text-green-600 font-medium">Operational</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <div>
                  <p className="font-medium text-sm">System Uptime</p>
                  <p className="text-xs text-muted-foreground">{systemStats.uptime}</p>
                </div>
              </div>
              <span className="text-xs text-green-600 font-medium">Operational</span>
            </div>
          </CardContent>
        </Card>

        {/* System Logs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  System Activity Logs
                </CardTitle>
                <CardDescription>Monitor system activities and security events</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportLogs}>
                  Export Logs
                </Button>
                <Button variant="outline" size="sm" onClick={handleClearLogs}>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Clear Logs
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Filter */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={selectedLogType}
                onChange={(e) => setSelectedLogType(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">All Logs</option>
                <option value="auth">Authentication</option>
                <option value="grants">Grants</option>
                <option value="system">System</option>
                <option value="settings">Settings</option>
              </select>
            </div>

            {/* Logs Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {systemLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">{log.timestamp}</TableCell>
                      <TableCell className="text-xs">{log.user}</TableCell>
                      <TableCell className="text-xs">{log.action}</TableCell>
                      <TableCell className="text-xs">{log.module}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded ${
                          log.status === 'Success' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {log.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">{log.ipAddress}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Mode */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Maintenance Mode
            </CardTitle>
            <CardDescription>Enable maintenance mode to perform system updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> Enabling maintenance mode will prevent all users (except administrators) from accessing the system.
              </p>
            </div>
            <Button variant="destructive">
              Enable Maintenance Mode
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
