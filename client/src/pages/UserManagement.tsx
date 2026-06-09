import { useTranslation } from '@/i18n/useTranslation';
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Building2, CheckCircle2, User, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BackButton } from "@/components/BackButton";
/**
 * User Management Page
 * Platform Admin only - Assign users to organizations and manage roles
 */
export default function UserManagement() {
 const { language, isRTL} = useLanguage();
  const { t } = useTranslation();
const { user } = useAuth();
 const [selectedOrganizationId, setSelectedOrganizationId] = useState<number | null>(null);
 const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
 const [selectedRole, setSelectedRole] = useState<"user" | "organization_admin">("user");

 const { data: organizations = [] } = trpc.ims.organizations.list.useQuery(undefined, {
 enabled: user?.role === "platform_admin",
 });

 const assignMutation = trpc.ims.userAssignments.assignToOrganization.useMutation({
 onSuccess: () => {
 toast.success(t.userManagement.userAssignedSuccess);
 setSelectedUserId(null);
 setSelectedOrganizationId(null);
 setSelectedRole("user");
 },
 onError: (error) => {
 toast.error(t.userManagement.failedToAssignUser);
 },
 });

 const handleAssign = () => {
 if (!selectedUserId || !selectedOrganizationId) {
 toast.error(t.userManagement.pleaseSelectBoth);
 return;
 }

 assignMutation.mutate({
 userId: selectedUserId,
 organizationId: selectedOrganizationId,
 role: selectedRole,
 });
 };

 if (user?.role !== "platform_admin") {
 return (
 <div className="container py-16" dir={isRTL ? 'rtl' : 'ltr'}>
 <Card>
 <CardHeader>
 <CardTitle>{t.userManagement.accessDenied}</CardTitle>
 <CardDescription>{t.userManagement.noPermission}</CardDescription>
 </CardHeader>
 </Card>
 </div>
 );
 }

 return (
 <div className="container py-8">
 {/* Header */}
 <div className="mb-8">
 <BackButton onClick={() => window.history.back()} label={t.userManagement.backToPlatform} />
 <h1 className="text-3xl font-bold text-foreground">{t.userManagement.userManagementTitle}</h1>
 <p className="text-muted-foreground mt-2">{t.userManagement.userManagementSubtitle}</p>
 </div>

 {/* Assignment Card */}
 <Card className="mb-8">
 <CardHeader>
 <CardTitle>{t.userManagement.assignUserToOrganization}</CardTitle>
 <CardDescription>
 {t.userManagement.usersMustLogin}
 </CardDescription>
 </CardHeader>
 <CardContent className="space-y-6">
 {/* User ID Input (Temporary) */}
 <div className="space-y-2">
 <label className="text-sm font-medium text-foreground">{t.userManagement.userId}</label>
 <input
 type="number"
 placeholder={t.userManagement.enterUserId}
 className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
 value={selectedUserId || ""}
 onChange={(e) => setSelectedUserId(e.target.value ? parseInt(e.target.value) : null)}
 />
 <p className="text-xs text-muted-foreground">
 {t.userManagement.productionNote}
 </p>
 </div>

 {/* Organization Selector */}
 <div className="space-y-2">
 <label className="text-sm font-medium text-foreground">{t.userManagement.organization}</label>
 <Select
 value={selectedOrganizationId?.toString() || ""}
 onValueChange={(value) => setSelectedOrganizationId(parseInt(value))}
 >
 <SelectTrigger>
 <SelectValue placeholder={t.userManagement.selectOrganization} />
 </SelectTrigger>
 <SelectContent>
 {organizations.map((org) => (
 <SelectItem key={org.id} value={org.id.toString()}>
 <div className="flex items-center gap-2">
 <Building2 className="w-4 h-4" />
 <span>{org.name}</span>
 </div>
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* Role Selector */}
 <div className="space-y-2">
 <label className="text-sm font-medium text-foreground">{t.userManagement.role}</label>
 <Select value={selectedRole} onValueChange={(value: any) => setSelectedRole(value)}>
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="user">{t.userManagement.user}</SelectItem>
 <SelectItem value="organization_admin">{t.userManagement.organizationAdmin}</SelectItem>
 </SelectContent>
 </Select>
 <p className="text-xs text-muted-foreground">
 {t.userManagement.organizationAdminsCanManage}
 </p>
 </div>

 {/* Assign Button */}
 <Button onClick={handleAssign} disabled={assignMutation.isPending} className="w-full">
 {assignMutation.isPending ? t.userManagement.assigning : t.userManagement.assignUserToOrganizationButton}
 </Button>
 </CardContent>
 </Card>

 {/* Organizations Overview */}
 <Card>
 <CardHeader>
 <CardTitle>{t.userManagement.organizationsOverview}</CardTitle>
 <CardDescription>{t.userManagement.currentOrganizations}</CardDescription>
 </CardHeader>
 <CardContent>
 {organizations.length === 0 ? (
 <div className="text-center py-8">
 <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
 <p className="text-muted-foreground">No organizations yet</p>
 </div>
 ) : (
 <div className="space-y-4">
 {organizations.map((org) => (
 <div
 key={org.id}
 className="flex items-center justify-between p-4 border border-border rounded-lg"
 >
 <div className="flex items-center gap-4">
 <Building2 className="w-8 h-8 text-primary" />
 <div>
 <h3 className="font-semibold text-foreground">{org.name}</h3>
 <p className="text-sm text-muted-foreground">
 {org.domain} • {org.country}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <span
 className={`px-2 py-1 text-xs rounded-full ${ org.status === "active" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" }`}
 >
 {org.status}
 </span>
 </div>
 </div>
 ))}
 </div>
 )}
 </CardContent>
 </Card>

 {/* Instructions Card */}
 <Card className="mt-6 bg-accent/10 border-accent/20">
 <CardHeader>
 <CardTitle className="text-accent">📋 Assignment Instructions</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="flex items-start gap-3">
 <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
 <div>
 <p className="font-medium text-foreground">Step 1: User Login</p>
 <p className="text-sm text-muted-foreground">
 Have the organization admin log in via Manus OAuth first. This creates their user record in the
 system.
 </p>
 </div>
 </div>
 <div className="flex items-start gap-3">
 <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
 <div>
 <p className="font-medium text-foreground">Step 2: Get User ID</p>
 <p className="text-sm text-muted-foreground">
 After login, check the database or user list to get their user ID. (In production, this will be a
 searchable dropdown)
 </p>
 </div>
 </div>
 <div className="flex items-start gap-3">
 <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
 <div>
 <p className="font-medium text-foreground">Step 3: Assign to Organization</p>
 <p className="text-sm text-muted-foreground">
 Use the form above to assign the user to their organization with the appropriate role
 (organization_admin for YDH/EFADAH admins)
 </p>
 </div>
 </div>
 <div className="flex items-start gap-3">
 <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
 <div>
 <p className="font-medium text-foreground">Step 4: Assign to Operating Units</p>
 <p className="text-sm text-muted-foreground">
 After organization assignment, assign the user to specific operating units they should access
 </p>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>
 );
}
