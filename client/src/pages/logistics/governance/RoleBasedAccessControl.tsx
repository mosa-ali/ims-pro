import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Plus, Edit2, Trash2, Lock } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";

export default function RoleBasedAccessControl() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    setIsRTL(document.documentElement.dir === "rtl");
  }, []);

  const { data: rbac, isLoading } = trpc.logistics.governance.getRoleBasedAccessControl.useQuery({});

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${isRTL ? "rtl" : "ltr"}`}>
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${isRTL ? "rtl" : "ltr"}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLocation("/organization/logistics/fleet")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{isRTL ? "التحكم في الوصول بناءً على الأدوار" : "Role-Based Access Control"}</h1>
            <p className="text-gray-600">{isRTL ? "إدارة الأدوار والصلاحيات" : "Manage roles and permissions"}</p>
          </div>
        </div>
        <Button onClick={() => setLocation("/organization/logistics/governance/rbac/new")}>
          <Plus className="w-4 h-4 me-2" />
          {isRTL ? "دور جديد" : "New Role"}
        </Button>
      </div>

      {/* Roles Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{isRTL ? "إجمالي الأدوار" : "Total Roles"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rbac?.totalRoles || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{isRTL ? "المستخدمون" : "Users"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rbac?.totalUsers || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{isRTL ? "الصلاحيات" : "Permissions"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rbac?.totalPermissions || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{isRTL ? "الأدوار النشطة" : "Active Roles"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{rbac?.activeRoles || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Roles List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            {isRTL ? "الأدوار المتاحة" : "Available Roles"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rbac?.roles && rbac.roles.length > 0 ? (
              rbac.roles.map((role: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-semibold">{role.name}</p>
                    <p className="text-sm text-gray-600">{role.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-600">{role.permissionCount} {isRTL ? "صلاحية" : "permissions"}</span>
                      <span className="text-xs text-gray-600">|</span>
                      <span className="text-xs text-gray-600">{role.userCount} {isRTL ? "مستخدم" : "users"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={role.active ? "default" : "secondary"}>
                      {role.active ? (isRTL ? "نشط" : "Active") : (isRTL ? "معطل" : "Inactive")}
                    </Badge>
                    <Button variant="outline" size="sm">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600">{isRTL ? "لا توجد أدوار" : "No roles"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Permissions Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "مصفوفة الصلاحيات" : "Permissions Matrix"}</CardTitle>
          <CardDescription>{isRTL ? "الصلاحيات المعينة لكل دور" : "Permissions assigned to each role"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">{isRTL ? "الصلاحية" : "Permission"}</th>
                  {rbac?.roles && rbac.roles.slice(0, 4).map((role: any) => (
                    <th key={role.id} className="text-center p-2">{role.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rbac?.permissions && rbac.permissions.slice(0, 8).map((perm: any, idx: number) => (
                  <tr key={idx} className="border-b">
                    <td className="p-2 font-semibold">{perm.name}</td>
                    {rbac?.roles && rbac.roles.slice(0, 4).map((role: any) => (
                      <td key={role.id} className="text-center p-2">
                        {perm.roles.includes(role.id) ? (
                          <Badge variant="default">✓</Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* User Assignments */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "تعيينات المستخدمين" : "User Assignments"}</CardTitle>
          <CardDescription>{isRTL ? "آخر 10 تعيينات" : "Last 10 assignments"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {rbac?.userAssignments && rbac.userAssignments.length > 0 ? (
              rbac.userAssignments.map((assignment: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-semibold">{assignment.userName}</p>
                    <p className="text-sm text-gray-600">{assignment.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{assignment.roleName}</Badge>
                    <Button variant="outline" size="sm">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600">{isRTL ? "لا توجد تعيينات" : "No assignments"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Access Levels */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "مستويات الوصول" : "Access Levels"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rbac?.accessLevels && rbac.accessLevels.length > 0 ? (
              rbac.accessLevels.map((level: any, idx: number) => (
                <div key={idx} className="p-4 border rounded-lg">
                  <p className="font-semibold mb-2">{level.name}</p>
                  <p className="text-sm text-gray-600 mb-3">{level.description}</p>
                  <div className="space-y-1 text-xs">
                    {level.features && level.features.map((feature: string, fidx: number) => (
                      <div key={fidx} className="flex items-center gap-2">
                        <span className="text-green-600">✓</span>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600">{isRTL ? "لا توجد مستويات" : "No levels"}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
