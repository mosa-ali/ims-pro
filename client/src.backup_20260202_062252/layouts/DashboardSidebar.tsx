import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  LayoutDashboard, 
  LogOut, 
  Users, 
  FileText, 
  FolderKanban, 
  DollarSign, 
  TrendingUp, 
  ClipboardList, 
  Briefcase, 
  FolderOpen, 
  Settings,
  Building2,
  History,
  Archive
} from "lucide-react";
import { useLocation } from "wouter";
import OrganizationSwitcher from '@/components/OrganizationSwitcher';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

const menuItems = [
  { icon: LayoutDashboard, labelKey: "nav.dashboard", path: "/dashboard" },
  { icon: Building2, labelKey: "nav.organizations", path: "/organizations", adminOnly: true },
  { icon: FolderKanban, labelKey: "nav.projects", path: "/projects" },
  { icon: DollarSign, labelKey: "nav.finance", path: "/finance" },
  { icon: TrendingUp, labelKey: "nav.meal", path: "/meal" },
  { icon: ClipboardList, labelKey: "nav.surveys", path: "/surveys" },
  { icon: Users, labelKey: "nav.cases", path: "/cases" },
  { icon: FolderOpen, labelKey: "nav.documents", path: "/documents" },
  { icon: History, labelKey: "nav.importHistory", path: "/import-history" },
  { icon: Archive, labelKey: "nav.deletedRecords", path: "/admin/deleted-records", adminOnly: true },
  { icon: Settings, labelKey: "nav.settings", path: "/settings" },
];

export default function DashboardSidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();

  const handleNavigation = (path: string) => {
    setLocation(path);
    onNavigate?.(); // Call onNavigate callback if provided (for mobile)
  };

  return (
    <aside className="h-screen bg-white border-e border-gray-200 p-4 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-semibold text-lg">
          {t('common.appName', 'Integrated Management System')}
        </h1>
      </div>

      {/* Navigation */}
      <nav className="space-y-1">
        {menuItems
          .filter(item => !item.adminOnly || user?.role === 'admin')
          .map(item => {
            const isActive = location === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive 
                    ? "bg-blue-100 text-blue-700 font-medium" 
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span>{t(item.labelKey)}</span>
              </button>
            );
          })}
      </nav>

      {/* Language Switcher */}
      <div className="py-3 border-t border-b">
        <LanguageSwitcher />
      </div>

      {/* Footer */}
      <div className="space-y-3 pt-4 mt-auto">
        <OrganizationSwitcher />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-gray-100 transition-colors w-full text-left">
              <Avatar className="h-9 w-9 border">
                <AvatarFallback className="text-xs font-medium">
                  {user?.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.name || "-"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email || "-"}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={logout}
              className="cursor-pointer text-red-600 focus:text-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t('common.signOut', 'Sign out')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
