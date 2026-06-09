import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Building2, MapPin, Plus, Settings, Users } from "lucide-react";
import { Link, useParams } from "wouter";
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

/**
 * Organization Management Page
 * Platform Admin only - View and manage a specific organization
 */
export default function OrganizationManagement() {
  const { language, isRTL} = useLanguage();
  const { t } = useTranslation();
 const { user } = useAuth();
 const params = useParams();
 const organizationId = params.id ? parseInt(params.id) : undefined;

 const { data: organizations = [] } = trpc.ims.organizations.list.useQuery(undefined, {
 enabled: user?.role === "platform_admin",
 });

 const { data: operatingUnits = [] } = trpc.ims.operatingUnits.listByOrganization.useQuery(
 { organizationId: organizationId! },
 { enabled: !!organizationId }
 );

 const organization = organizations.find((org) => org.id === organizationId);

 if (user?.role !== "platform_admin") {
 return (
 <div className="container py-16" dir={isRTL ? 'rtl' : 'ltr'}>
 <Card>
 <CardHeader>
 <CardTitle>Access Denied</CardTitle>
 <CardDescription>You do not have permission to access organization management.</CardDescription>
 </CardHeader>
 </Card>
 </div>
 );
 }

 if (!organizationId || !organization) {
 return (
 <div className="container py-16">
 <Card>
 <CardHeader>
 <CardTitle>Organization Not Found</CardTitle>
 <CardDescription>The requested organization could not be found.</CardDescription>
 </CardHeader>
 <CardContent>
 <Button asChild>
 <Link href="/platform">Back to Platform Dashboard</Link>
 </Button>
 </CardContent>
 </Card>
 </div>
 );
 }

 return (
 <div className="container py-8">
 {/* Header */}
 <div className="mb-8">
 <BackButton onClick={() => window.history.back()} label={t.common.backToPlatformDashboard} />
 <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
 <Link href="/platform" className="hover:text-foreground">
 Platform
 </Link>
 <span>/</span>
 <span>Organizations</span>
 <span>/</span>
 <span className="text-foreground">{organization.name}</span>
 </div>
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-3xl font-bold text-foreground">{organization.name}</h1>
 <p className="text-muted-foreground mt-2">
 {organization.domain} • {organization.country}
 </p>
 </div>
 <Button variant="outline">
 <Settings className="w-4 h-4 me-2" />
 Edit Organization
 </Button>
 </div>
 </div>

 {/* Organization Details */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
 <Card>
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-sm font-medium">Status</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold capitalize">{organization.status}</div>
 <p className="text-xs text-muted-foreground mt-1">Organization status</p>
 </CardContent>
 </Card>

 <Card>
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-sm font-medium">Operating Units</CardTitle>
 <MapPin className="h-4 w-4 text-muted-foreground" />
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold">{operatingUnits.length}</div>
 <p className="text-xs text-muted-foreground mt-1">Active units</p>
 </CardContent>
 </Card>

 <Card>
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
 <CardTitle className="text-sm font-medium">Users</CardTitle>
 <Users className="h-4 w-4 text-muted-foreground" />
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold">-</div>
 <p className="text-xs text-muted-foreground mt-1">Assigned users</p>
 </CardContent>
 </Card>
 </div>

 {/* Operating Units */}
 <Card>
 <CardHeader>
 <div className="flex items-center justify-between">
 <div>
 <CardTitle>Operating Units</CardTitle>
 <CardDescription>Manage country offices and field locations</CardDescription>
 </div>
 <Button>
 <Plus className="w-4 h-4 me-2" />
 Add Operating Unit
 </Button>
 </div>
 </CardHeader>
 <CardContent>
 {operatingUnits.length === 0 ? (
 <div className="text-center py-8">
 <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
 <p className="text-muted-foreground mb-4">No operating units yet</p>
 <Button>
 <Plus className="w-4 h-4 me-2" />
 Add First Operating Unit
 </Button>
 </div>
 ) : (
 <div className="space-y-4">
 {operatingUnits.map((unit) => (
 <div
 key={unit.id}
 className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/5 transition-colors"
 >
 <div className="flex items-center gap-4">
 <MapPin className="w-8 h-8 text-primary" />
 <div>
 <h3 className="font-semibold text-foreground">{unit.name}</h3>
 <p className="text-sm text-muted-foreground">
 {unit.city ? `${unit.city}, ` : ""}
 {unit.country} • {unit.type} • {unit.status}
 </p>
 </div>
 </div>
 <Button variant="outline" size="sm">
 Manage
 </Button>
 </div>
 ))}
 </div>
 )}
 </CardContent>
 </Card>

 {/* Organization Users Section */}
 <Card className="mt-6">
 <CardHeader>
 <div className="flex items-center justify-between">
 <div>
 <CardTitle>Organization Users</CardTitle>
 <CardDescription>Manage user access and roles for this organization</CardDescription>
 </div>
 <Button>
 <Plus className="w-4 h-4 me-2" />
 Assign User
 </Button>
 </div>
 </CardHeader>
 <CardContent>
 <div className="text-center py-8">
 <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
 <p className="text-muted-foreground mb-4">User management interface coming soon</p>
 <p className="text-sm text-muted-foreground">
 Users must first log in via Manus OAuth before they can be assigned to organizations
 </p>
 </div>
 </CardContent>
 </Card>
 </div>
 );
}
