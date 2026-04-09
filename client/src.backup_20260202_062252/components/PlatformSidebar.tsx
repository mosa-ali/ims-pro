import { LayoutDashboard, Building2, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "@/i18n/useTranslation";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  labelAr: string;
  path: string;
}

export default function PlatformSidebar() {
  const [location] = useLocation();
  const { t, language } = useTranslation();
  const isRTL = language === 'ar';

  const navItems: NavItem[] = [
    {
      icon: LayoutDashboard,
      label: t.platform.dashboard.title,
      labelAr: t.platform.dashboard.title,
      path: "/platform",
    },
    {
      icon: Building2,
      label: t.platform.organizationManagement,
      labelAr: t.platform.organizationManagement,
      path: "/platform/organizations",
    },
    {
      icon: Settings,
      label: t.platform.platformSettings,
      labelAr: t.platform.platformSettings,
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
          {t.platform.sidebarTitle}
        </h2>
        <p className={cn(
          "text-sm text-muted-foreground mt-1",
          isRTL && "text-right"
        )}>
          {t.platform.sidebarSubtitle}
        </p>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;

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
              <span className="text-sm">{isRTL ? item.labelAr : item.label}</span>
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
          {t.common.settings}
        </p>
      </div>
    </aside>
  );
}
