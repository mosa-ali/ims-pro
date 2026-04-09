import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { isPlatformAdmin, getLoginUrl } from "@/const";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface PlatformLayoutProps {
 children: React.ReactNode;
}

export default function PlatformLayout({ children }: PlatformLayoutProps) {
 const { user, loading, isAuthenticated } = useAuth();
 const [, setLocation] = useLocation();

 // Redirect to login if not authenticated
 useEffect(() => {
 if (!loading && !isAuthenticated) {
 window.location.href = '/login';
 }
 }, [loading, isAuthenticated]);

 // Redirect non-platform-admins to home
 useEffect(() => {
 if (!loading && user && !isPlatformAdmin(user.platformRole)) {
 setLocation("/");
 }
 }, [loading, user, setLocation]);

 // Show loading state
 if (loading) {
 return (
 <div className="min-h-screen flex items-center justify-center">
 <Loader2 className="w-8 h-8 animate-spin text-primary" />
 </div>
 );
 }

 // Don't render if not authenticated or not platform admin
 if (!isAuthenticated || !user || !isPlatformAdmin(user.platformRole)) {
 return null;
 }

 return (
 <div className="min-h-screen flex bg-background">
 {/* Unified Sidebar (Platform Mode) */}
 <Sidebar />

 {/* Main Content Area */}
 <div className="flex-1 flex flex-col">
 {/* Context-Aware Header */}
 <Header />

 {/* Page Content */}
 <main className="flex-1 overflow-auto">
 {children}
 </main>
 </div>
 </div>
 );
}
