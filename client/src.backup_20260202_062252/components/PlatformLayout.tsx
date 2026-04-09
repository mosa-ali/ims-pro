import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useState, ReactNode } from "react";
import {
  LayoutDashboard,
  Building2,
  MapPin,
  Users,
  Activity,
  FileText,
  Settings,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PlatformLayoutProps {
  children: ReactNode;
}

const SIDEBAR_WIDTH_KEY = "platformSidebarWidth";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function PlatformLayout({ children }: PlatformLayoutProps) {
  const { t, i18n } = useTranslation();
  const { loading, user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const [isResizing, setIsResizing] = useState(false);

  // Check if user is platform admin
  const isPlatformAdmin = user?.role === 'admin';

  // Access denied screen for non-admin users
  if (!loading && !isPlatformAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-6 w-6" />
              <CardTitle>{t('platform.accessDenied')}</CardTitle>
            </div>
            <CardDescription>
              {t('platform.adminOnly')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setLocation('/dashboard')}
              className="w-full"
            >
              {t('platform.returnToDashboard')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const navItems = [
    { path: '/platform/dashboard', label: t('platform.nav.dashboard'), icon: LayoutDashboard },
    { path: '/platform/organizations', label: t('platform.nav.organizations'), icon: Building2 },
    { path: '/platform/operating-units', label: t('platform.nav.operatingUnits'), icon: MapPin },
    { path: '/platform/users', label: t('platform.nav.users'), icon: Users },
    { path: '/platform/system-health', label: t('platform.nav.systemHealth'), icon: Activity },
    { path: '/platform/audit-logs', label: t('platform.nav.auditLogs'), icon: FileText },
    { path: '/platform/settings', label: t('platform.nav.settings'), icon: Settings },
  ];

  const handleMouseDown = () => {
    setIsResizing(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    const newWidth = i18n.language === 'ar'
      ? window.innerWidth - e.clientX
      : e.clientX;
    if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
      setSidebarWidth(newWidth);
      localStorage.setItem(SIDEBAR_WIDTH_KEY, newWidth.toString());
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  // Add/remove mouse event listeners
  if (typeof window !== 'undefined') {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove as any);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove as any);
      window.removeEventListener('mouseup', handleMouseUp);
    }
  }

  return (
    <div className="min-h-screen flex" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Sidebar */}
      <aside
        className="border-r bg-card flex flex-col"
        style={{ width: `${sidebarWidth}px` }}
      >
        {/* Header */}
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">{t('platform.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('platform.platformAdmin')}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            return (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors
                  ${isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-foreground'
                  }
                `}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {isActive && (
                  <ChevronRight className={`h-4 w-4 flex-shrink-0 ${i18n.language === 'ar' ? 'rotate-180' : ''}`} />
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 hover:bg-muted p-2 rounded-md transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {user?.name?.charAt(0).toUpperCase() || 'A'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left text-sm">
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={i18n.language === 'ar' ? 'start' : 'end'} className="w-56">
              <DropdownMenuLabel>{t('platform.platformAdmin')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLocation('/dashboard')}>
                {t('platform.returnToDashboard')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                {t('auth.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Resize Handle */}
      <div
        className={`w-1 hover:bg-primary/50 cursor-col-resize transition-colors ${isResizing ? 'bg-primary' : ''}`}
        onMouseDown={handleMouseDown}
        style={{
          position: 'absolute',
          [i18n.language === 'ar' ? 'right' : 'left']: `${sidebarWidth}px`,
          top: 0,
          bottom: 0,
          zIndex: 10,
        }}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="container py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
