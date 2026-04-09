import React, { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/layouts/DashboardLayoutNew";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Shield, Save, RotateCcw } from "lucide-react";
import { trpc } from "@/lib/trpc";

type Permission = "view" | "create" | "edit" | "delete";
type Module = "grants" | "projects" | "finance" | "meal" | "surveys" | "cases" | "documents" | "settings";
type Role = "org_admin" | "program_manager" | "finance_manager" | "meal_officer" | "case_worker" | "viewer";

interface PermissionMatrix {
  [role: string]: {
    [module: string]: Permission[];
  };
}

const defaultPermissions: PermissionMatrix = {
  org_admin: {
    grants: ["view", "create", "edit", "delete"],
    projects: ["view", "create", "edit", "delete"],
    finance: ["view", "create", "edit", "delete"],
    meal: ["view", "create", "edit", "delete"],
    surveys: ["view", "create", "edit", "delete"],
    cases: ["view", "create", "edit", "delete"],
    documents: ["view", "create", "edit", "delete"],
    settings: ["view", "create", "edit", "delete"],
  },
  program_manager: {
    grants: ["view", "create", "edit"],
    projects: ["view", "create", "edit", "delete"],
    finance: ["view"],
    meal: ["view", "create", "edit"],
    surveys: ["view", "create", "edit"],
    cases: ["view", "create", "edit"],
    documents: ["view", "create", "edit", "delete"],
    settings: [],
  },
  finance_manager: {
    grants: ["view"],
    projects: ["view"],
    finance: ["view", "create", "edit", "delete"],
    meal: ["view"],
    surveys: [],
    cases: [],
    documents: ["view", "create"],
    settings: [],
  },
  meal_officer: {
    grants: ["view"],
    projects: ["view"],
    finance: ["view"],
    meal: ["view", "create", "edit", "delete"],
    surveys: ["view", "create", "edit"],
    cases: [],
    documents: ["view", "create"],
    settings: [],
  },
  case_worker: {
    grants: ["view"],
    projects: ["view"],
    finance: [],
    meal: ["view"],
    surveys: ["view"],
    cases: ["view", "create", "edit", "delete"],
    documents: ["view", "create"],
    settings: [],
  },
  viewer: {
    grants: ["view"],
    projects: ["view"],
    finance: [],
    meal: ["view"],
    surveys: ["view"],
    cases: ["view"],
    documents: ["view"],
    settings: [],
  },
};

const roleLabels: Record<Role, string> = {
  org_admin: "Organization Admin",
  program_manager: "Program Manager",
  finance_manager: "Finance Manager",
  meal_officer: "MEAL Officer",
  case_worker: "Case Worker",
  viewer: "Viewer",
};

const moduleLabels: Record<Module, string> = {
  grants: "Grants",
  projects: "Projects",
  finance: "Finance",
  meal: "MEAL",
  surveys: "Surveys",
  cases: "Cases",
  documents: "Documents",
  settings: "Settings",
};

const roles: Role[] = ["org_admin", "program_manager", "finance_manager", "meal_officer", "case_worker", "viewer"];
const modules: Module[] = ["grants", "projects", "finance", "meal", "surveys", "cases", "documents", "settings"];
const permissions: Permission[] = ["view", "create", "edit", "delete"];

export default function RolesPermissions() {
  const { user } = useAuth();
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrix>(defaultPermissions);

  const organizationId = user?.currentOrganizationId;

  // Load permissions from backend
  const { data: savedPermissions, isLoading, refetch } = trpc.rolePermissions.list.useQuery(
    { organizationId: organizationId || undefined },
    { enabled: !!organizationId && user?.role === 'admin' }
  );

  // Convert backend format to frontend matrix format
  useEffect(() => {
    if (savedPermissions && savedPermissions.length > 0) {
      const matrix: PermissionMatrix = {};
      
      // Initialize with default structure
      roles.forEach(role => {
        matrix[role] = {};
        modules.forEach(module => {
          matrix[role][module] = [];
        });
      });

      // Populate from saved permissions
      savedPermissions.forEach((perm: any) => {
        if (!matrix[perm.role]) matrix[perm.role] = {};
        if (!matrix[perm.role][perm.module]) matrix[perm.role][perm.module] = [];
        
        const perms: Permission[] = [];
        if (perm.canView) perms.push("view");
        if (perm.canCreate) perms.push("create");
        if (perm.canEdit) perms.push("edit");
        if (perm.canDelete) perms.push("delete");
        
        matrix[perm.role][perm.module] = perms;
      });

      setPermissionMatrix(matrix);
    } else {
      // Use defaults if no saved permissions
      setPermissionMatrix(defaultPermissions);
    }
  }, [savedPermissions]);

  const updateMutation = trpc.rolePermissions.update.useMutation({
    onSuccess: () => {
      toast.success("Permissions saved successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to save permissions: ${error.message}`);
    },
  });

  const togglePermission = (role: Role, module: Module, permission: Permission) => {
    // Organization Admin permissions are locked
    if (role === "org_admin") {
      toast.info("Organization Admin permissions cannot be modified");
      return;
    }

    setPermissionMatrix((prev) => {
      const current = prev[role][module] || [];
      const updated = current.includes(permission)
        ? current.filter((p) => p !== permission)
        : [...current, permission];

      return {
        ...prev,
        [role]: {
          ...prev[role],
          [module]: updated,
        },
      };
    });
  };

  const hasPermission = (role: Role, module: Module, permission: Permission): boolean => {
    return permissionMatrix[role]?.[module]?.includes(permission) || false;
  };

  const handleSave = () => {
    if (!organizationId) {
      toast.error("Organization ID is required");
      return;
    }

    // Convert matrix to backend format
    const permissionsArray: Array<{
      role: Role;
      module: string;
      canView: boolean;
      canCreate: boolean;
      canEdit: boolean;
      canDelete: boolean;
    }> = [];

    roles.forEach(role => {
      modules.forEach(module => {
        const perms = permissionMatrix[role][module] || [];
        permissionsArray.push({
          role,
          module,
          canView: perms.includes("view"),
          canCreate: perms.includes("create"),
          canEdit: perms.includes("edit"),
          canDelete: perms.includes("delete"),
        });
      });
    });

    updateMutation.mutate({
      organizationId,
      permissions: permissionsArray,
    });
  };

  const handleReset = () => {
    setPermissionMatrix(defaultPermissions);
    toast.info("Reset to default permissions (not saved yet)");
  };

  if (user?.role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="container py-6">
          <Card>
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>Only administrators can access role permissions settings.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Roles & Permissions
            </h1>
            <p className="text-muted-foreground mt-2">
              Define what each role can access and edit across the system
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset} disabled={isLoading}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Default
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending || isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Permission Matrix</CardTitle>
            <CardDescription>
              Check the boxes to grant permissions. Organization Admin permissions are locked and cannot be changed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold sticky left-0 bg-background z-10">Role / Module</th>
                    {modules.map((module) => (
                      <th key={module} className="text-center p-3 font-semibold" colSpan={4}>
                        {moduleLabels[module]}
                      </th>
                    ))}
                  </tr>
                  <tr className="border-b bg-muted/50">
                    <th className="sticky left-0 bg-muted/50 z-10"></th>
                    {modules.map((module) => (
                      <React.Fragment key={module}>
                        {permissions.map((perm) => (
                          <th key={`${module}-${perm}`} className="text-center p-2 text-xs font-medium">
                            {perm.charAt(0).toUpperCase() + perm.slice(1)}
                          </th>
                        ))}
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => (
                    <tr key={role} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium sticky left-0 bg-background">
                        {roleLabels[role]}
                        {role === "org_admin" && (
                          <span className="ml-2 text-xs text-muted-foreground">(Locked)</span>
                        )}
                      </td>
                      {modules.map((module) => (
                        <React.Fragment key={`${role}-${module}`}>
                          {permissions.map((permission) => (
                            <td key={`${role}-${module}-${permission}`} className="text-center p-2">
                              <Checkbox
                                checked={hasPermission(role, module, permission)}
                                onCheckedChange={() => togglePermission(role, module, permission)}
                                disabled={role === "org_admin" || isLoading}
                              />
                            </td>
                          ))}
                        </React.Fragment>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role Descriptions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h3 className="font-semibold">Organization Admin</h3>
              <p className="text-sm text-muted-foreground">Full access to all modules and settings. Can manage users and permissions.</p>
            </div>
            <div>
              <h3 className="font-semibold">Program Manager</h3>
              <p className="text-sm text-muted-foreground">Manages grants, projects, and program activities. Limited financial access.</p>
            </div>
            <div>
              <h3 className="font-semibold">Finance Manager</h3>
              <p className="text-sm text-muted-foreground">Full access to financial data, budgets, and expenditures. View-only for other modules.</p>
            </div>
            <div>
              <h3 className="font-semibold">MEAL Officer</h3>
              <p className="text-sm text-muted-foreground">Monitoring, Evaluation, Accountability & Learning specialist. Manages indicators and surveys.</p>
            </div>
            <div>
              <h3 className="font-semibold">Case Worker</h3>
              <p className="text-sm text-muted-foreground">Manages individual cases and beneficiary support. Limited access to other modules.</p>
            </div>
            <div>
              <h3 className="font-semibold">Viewer</h3>
              <p className="text-sm text-muted-foreground">Read-only access to most modules. Cannot create, edit, or delete records.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
