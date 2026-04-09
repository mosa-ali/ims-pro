import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Users, Shield, Key, FileText, Trash2, ScrollText, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Platform Admin Settings
 * Global governance and control over the IMS platform
 */
export default function PlatformSettingsPage() {
  const { language, isRTL} = useLanguage();
const [, setLocation] = useLocation();

 const settingsCards = [
 {
 icon: Users,
 title: "Platform Users",
 description: "Manage who can administer the platform itself. Add, remove, or suspend Platform Admins.",
 badge: "Mandatory",
 badgeVariant: "default" as const,
 onClick: () => setLocation("/platform/users"),
 },
 {
 icon: Shield,
 title: "Platform Roles & Permissions",
 description: "View platform-level roles and their permissions. Read-only in Phase 0.",
 badge: "Read-Only",
 badgeVariant: "secondary" as const,
 onClick: () => setLocation("/platform/roles"),
 },
 {
 icon: Settings,
 title: "Global System Settings",
 description: "Configure default language, timezone, currency, and environment label.",
 badge: null,
 onClick: () => setLocation("/platform/global-settings"),
 },
 {
 icon: Key,
 title: "Authentication & Identity",
 description: "View authentication provider status, OAuth connection, and MFA enforcement.",
 badge: "Read-Only",
 badgeVariant: "secondary" as const,
 onClick: () => setLocation("/platform/auth-settings"),
 },
 {
 icon: FileText,
 title: "Organization Lifecycle Rules",
 description: "Understand organization states (Active, Suspended, Deleted) and who can change them.",
 badge: "Read-Only",
 badgeVariant: "secondary" as const,
 onClick: () => setLocation("/platform/org-lifecycle"),
 },
 {
 icon: ScrollText,
 title: "Audit & Compliance",
 description: "View platform activity logs including organization changes, user actions, and login events.",
 badge: "Real Data",
 badgeVariant: "outline" as const,
 onClick: () => setLocation("/platform/audit-logs"),
 },
 {
 icon: Trash2,
 title: "Deleted Records",
 description: "View and manage soft-deleted records across all organizations with restore capabilities.",
 badge: "Real Data",
 badgeVariant: "outline" as const,
 onClick: () => setLocation("/platform/deleted-records"),
 },
 {
 icon: Clock,
 title: "Retention Policy",
 description: "Configure automatic purging of soft-deleted records after a specified retention period.",
 badge: "Policy Control",
 badgeVariant: "outline" as const,
 onClick: () => setLocation("/platform/retention-policy"),
 },
 ];

 return (
 <div className="container py-8" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="mb-8">
 <h1 className="text-3xl font-bold text-foreground">Platform Admin Settings</h1>
 <p className="text-muted-foreground mt-2">
 Global governance and control over the IMS platform
 </p>
 <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
 Platform Admin Only
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {settingsCards.map((card, index) => {
 const Icon = card.icon;
 return (
 <Card key={index} className="hover:shadow-md transition-shadow">
 <CardHeader>
 <div className="flex items-start justify-between mb-2">
 <div className="p-2 rounded-lg bg-primary/10">
 <Icon className="w-6 h-6 text-primary" />
 </div>
 {card.badge && (
 <span
 className={`px-2 py-1 rounded text-xs font-medium ${ card.badgeVariant === "default" ? "bg-primary text-primary-foreground" : card.badgeVariant === "secondary" ? "bg-secondary text-secondary-foreground" : "bg-background border border-border text-foreground" }`}
 >
 {card.badge}
 </span>
 )}
 </div>
 <CardTitle className="text-lg">{card.title}</CardTitle>
 <CardDescription className="text-sm">{card.description}</CardDescription>
 </CardHeader>
 <CardContent>
 <Button
 variant="ghost"
 className="w-full justify-start text-primary hover:text-primary hover:bg-primary/10"
 onClick={card.onClick}
 >
 Open →
 </Button>
 </CardContent>
 </Card>
 );
 })}
 </div>
 </div>
 );
}
