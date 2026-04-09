import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  FolderKanban, 
  DollarSign, 
  TrendingUp, 
  ClipboardList, 
  FolderOpen, 
  Settings,
  Building2,
  History,
  Archive
} from "lucide-react";

const menuItems = [
  { icon: LayoutDashboard, labelKey: "nav.dashboard", path: "/dashboard" },
  { icon: Building2, labelKey: "nav.organizations", path: "/organizations" },
  { icon: FileText, labelKey: "nav.grants", path: "/grants" },
  { icon: FolderKanban, labelKey: "nav.projects", path: "/projects" },
  { icon: DollarSign, labelKey: "nav.finance", path: "/finance" },
  { icon: TrendingUp, labelKey: "nav.meal", path: "/meal" },
  { icon: ClipboardList, labelKey: "nav.surveys", path: "/surveys" },
  { icon: Users, labelKey: "nav.cases", path: "/cases" },
  { icon: FolderOpen, labelKey: "nav.documents", path: "/documents" },
  { icon: History, labelKey: "nav.importHistory", path: "/import-history" },
  { icon: Archive, labelKey: "nav.deletedRecords", path: "/admin/deleted-records" },
  { icon: Settings, labelKey: "nav.settings", path: "/settings" },
];

export default function DashboardHeader() {
  const { t } = useTranslation();
  const [location] = useLocation();
  
  const activeMenuItem = menuItems.find(item => item.path === location);
  const pageTitle = activeMenuItem ? t(activeMenuItem.labelKey) : t('nav.dashboard');

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b sticky top-0 z-10">
      <h2 className="text-lg font-semibold">
        {pageTitle}
      </h2>
    </header>
  );
}
