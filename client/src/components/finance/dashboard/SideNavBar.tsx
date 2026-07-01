import { useLocation } from "wouter";
import {
  LayoutDashboard,
  BarChart3,
  CheckCircle2,
  FileText,
  Wallet,
  HelpCircle,
  Settings,
} from "lucide-react";

interface SideNavBarProps {
  activeTab?: string;
}

const tabs = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/finance" },
  { label: "Portfolio", icon: Wallet, path: "/finance/portfolio" },
  { label: "Analytics", icon: BarChart3, path: "/finance/analytics" },
  { label: "Compliance", icon: CheckCircle2, path: "/finance/compliance" },
  { label: "Reports", icon: FileText, path: "/finance/reports" },
];

/**
 * Utility to merge tailwind classes
 */
function cn(...classes: (string | undefined | boolean | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * SideNavBar Component
 * Path: client/src/components/layout/SideNavBar.tsx
 * Executive Finance Portal sidebar navigation
 */
export const SideNavBar: React.FC<SideNavBarProps> = () => {
  const [location, setLocation] = useLocation();

  const handleNavigation = (path: string) => {
    setLocation(path);
  };

  const isActive = (path: string) => {
    return location === path || location.startsWith(path + "/");
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col bg-surface-container-lowest border-r border-border z-40 p-4">
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
          <Wallet className="size-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-primary uppercase tracking-tight">
            IMS Finance
          </h2>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase opacity-60">
            Executive Portal
          </p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.path);

          return (
            <button
              key={tab.label}
              onClick={() => handleNavigation(tab.path)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-left",
                active
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="size-5 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-semibold uppercase tracking-wider">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="mt-auto space-y-4">
        <button className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95">
          Export Global Data
        </button>

        <div className="pt-4 border-t border-border space-y-1">
          <button
            onClick={() => handleNavigation("/support")}
            className="w-full flex items-center gap-3 px-4 py-2 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-accent/50"
          >
            <HelpCircle className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Support
            </span>
          </button>

          <button
            onClick={() => handleNavigation("/settings")}
            className="w-full flex items-center gap-3 px-4 py-2 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-accent/50"
          >
            <Settings className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Settings
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
};
