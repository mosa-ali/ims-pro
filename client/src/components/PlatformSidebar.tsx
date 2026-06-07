import { LayoutDashboard, Building2, Settings, ClipboardList, Mail } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "@/i18n/TranslationProvider";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  labelAr: string;
  labelIt: string;
  path: string;
}

export default function PlatformSidebar() {
  const t = useTranslation();
  const { isRTL, language } = useLanguage();
  const [location] = useLocation();

  const navItems: NavItem[] = [
    {
      icon: LayoutDashboard,
      label: t.platform?.dashboard?.title || "Dashboard",
      labelAr: t.platform?.dashboard?.title || "لوحة التحكم",
      labelIt: t.platform?.dashboard?.title || "Cruscotto Piattaforma",
      path: "/platform",
    },
    {
      icon: Building2,
      label: t.platform?.dashboard.organizationManagement || "Organization Management",
      labelAr: t.platform?.dashboard.organizationManagement || "إدارة المنظمات",
      labelIt: t.platform?.dashboard.organizationManagement || "Gestione Organizzazioni",
      path: "/platform/organizations",
    },
    {
      icon: ClipboardList,
      label: "Access Requests",
      labelAr: "طلبات الوصول",
      labelIt: "Gestione Email",
      path: "/platform/access-requests",
    },
    {
      icon: Mail,
      label: "Email Management",
      labelAr: "إدارة البريد الإلكتروني",
      labelIt: "Impostazioni Piattaforma",
      path: "/platform/email-management",
    },
    {
      icon: Settings,
      label: t.platform?.dashboard.platformSettings || "Platform Settings",
      labelAr: t.platform?.dashboard.platformSettings || "إعدادات المنصة",
      labelIt: t.platform?.dashboard.platformSettings || "Impostazioni Piattaforma",
      path: "/platform/settings",
    },
  ];

  return (
    <aside className={cn(
      "w-64 bg-card border-r border-border flex flex-col",
      isRTL && "border-l border-r-0"
    )}>
      {/* Sidebar Header */}
      <div className="p-6 border-b border-border">
        <h2 className={cn(
          "text-lg font-semibold text-foreground",
          isRTL && "text-right"
        )}>
          {t.platform.dashboard.sidebarTitle}
        </h2>
        <p className={cn(
          "text-sm text-muted-foreground mt-1",
          isRTL && "text-right"
        )}>
          {t.platform.dashboard.sidebarSubtitle}
        </p>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path || location.startsWith(item.path + '/');

          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                isActive && "bg-accent text-accent-foreground font-medium",
                isRTL && "flex-row-reverse text-right"
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{language === 'ar' ? item.labelAr : (language === 'it' ? item.labelIt : item.label)}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-border">
        <p className={cn(
          "text-xs text-muted-foreground",
          isRTL && "text-right"
        )}>
          {t.common?.settings || "Settings"}
        </p>
      </div>
    </aside>
  );
}
