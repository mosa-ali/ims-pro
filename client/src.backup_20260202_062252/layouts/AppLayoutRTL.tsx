import DashboardSidebar from "./DashboardSidebar";
import DashboardHeader from "./DashboardHeader";
import { useIsMobileOrTablet } from '@/hooks/useMediaQuery';
import { useState } from 'react';
import { Menu, X, FolderKanban } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AppLayoutRTL({ children }: { children: React.ReactNode }) {
  const isMobileOrTablet = useIsMobileOrTablet();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isMobileOrTablet) {
    return (
      <div className="min-h-screen flex flex-col" dir="rtl">
        {/* Mobile Header with Hamburger on RIGHT for RTL */}
        <div className="sticky top-0 z-50 bg-background border-b">
          <div className="flex items-center justify-between p-4">
            <div className="w-10" /> {/* Spacer for centering */}
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">نظام إدارة المشاريع</h1>
              <FolderKanban className="h-5 w-5 text-primary" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle menu"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setSidebarOpen(false)}
            />
            {/* Sidebar on RIGHT for RTL */}
            <div className="fixed inset-y-0 right-0 w-[280px] bg-background z-50 shadow-lg overflow-y-auto">
              <DashboardSidebar onNavigate={() => setSidebarOpen(false)} />
            </div>
          </>
        )}

        {/* Main content */}
        <main className="flex-1 p-4 bg-gray-50">
          {children}
        </main>
      </div>
    );
  }

  // Desktop layout - Sidebar on RIGHT for RTL
  return (
    <div className="min-h-screen grid grid-cols-[280px_1fr]" dir="rtl">
      {/* Sidebar RIGHT (first in DOM order, but appears right due to RTL) */}
      <DashboardSidebar />

      {/* Main Content */}
      <div className="flex flex-col">
        <DashboardHeader />
        <main className="flex-1 p-4 bg-gray-50 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
