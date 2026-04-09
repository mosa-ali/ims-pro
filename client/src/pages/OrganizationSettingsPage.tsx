import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Users, Shield, List, Mail, Palette, RefreshCw, Settings2, ChevronRight } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Organization Settings Page
 * Accessible only to Organization Admins
 * Card-based navigation to different setting sections
 */
export default function OrganizationSettingsPage() {
  const { language, isRTL} = useLanguage();
 const { user, loading } = useAuth();

 // Only organization admins can access settings
 if (loading) {
 return (
 <div className="flex items-center justify-center h-64" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
 </div>
 );
 }

 // Allow both platform_admin and organization_admin roles to access settings
 const isAdmin = user && (
 user.platformRole === "organization_admin" || 
 user.platformRole === "platform_admin" ||
 user.role === "platform_admin" ||
 user.role === "admin"
 );

 if (!user || !isAdmin) {
 return (
 <div className="container mx-auto py-8">
 <Card>
 <CardHeader>
 <CardTitle>Access Denied</CardTitle>
 <CardDescription>
 Only Organization Administrators can access settings.
 </CardDescription>
 </CardHeader>
 </Card>
 </div>
 );
 }

 const settingCards = [
 {
 id: "users",
 title: "User Management",
 description: "Manage system users and assign roles",
 icon: Users,
 path: "/organization/settings/users",
 adminOnly: true,
 },
 {
 id: "roles",
 title: "Roles & Permissions",
 description: "Define what each role can access and edit",
 icon: Shield,
 path: "/organization/settings/roles",
 adminOnly: true,
 },
 {
 id: "options",
 title: "Option Sets / Lookups",
 description: "Manage dropdown values used across the system",
 icon: List,
 path: "/organization/settings/options",
 adminOnly: true,
 },
 {
 id: "notifications",
 title: "Email & Notifications",
 description: "Control system notifications and templates",
 icon: Mail,
 path: "/organization/settings/notifications",
 adminOnly: true,
 },
 {
 id: "branding",
 title: "Logo & Branding",
 description: "Customize system branding and appearance",
 icon: Palette,
 path: "/organization/settings/branding",
 adminOnly: true,
 },
 {
 id: "publish",
 title: "System Publish & Sync",
 description: "Control publishing and data synchronization",
 icon: RefreshCw,
 path: "/organization/settings/publish",
 adminOnly: true,
 },
 {
 id: "admin",
 title: "Administrator Access",
 description: "Advanced system controls and maintenance",
 icon: Settings2,
 path: "/organization/settings/admin",
 adminOnly: true,
 },
 ];

 return (
 <div className="container mx-auto py-8">
 <div className="mb-8">
 <h1 className="text-3xl font-bold flex items-center gap-3">
 <Settings className="h-8 w-8" />
 Settings
 </h1>
 <p className="text-muted-foreground mt-2">
 Application settings and preferences
 </p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {settingCards.map((card) => {
 const Icon = card.icon;
 return (
 <Link key={card.id} href={card.path}>
 <Card className="cursor-pointer hover:shadow-lg transition-shadow h-full group">
 <CardHeader>
 <div className="flex items-start justify-between">
 <div className="flex items-center gap-3">
 <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
 <Icon className="h-6 w-6 text-blue-600" />
 </div>
 <div>
 <CardTitle className="text-lg flex items-center gap-2">
 {card.title}
 {card.adminOnly && (
 <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
 Admin only
 </span>
 )}
 </CardTitle>
 </div>
 </div>
 <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
 </div>
 </CardHeader>
 <CardContent>
 <p className="text-sm text-muted-foreground">
 {card.description}
 </p>
 </CardContent>
 </Card>
 </Link>
 );
 })}
 </div>
 </div>
 );
}
