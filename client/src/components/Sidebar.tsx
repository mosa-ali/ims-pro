import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { 
 LayoutDashboard, Building2, DollarSign, Briefcase, Wallet, Target, 
 ClipboardList, Users, FileText, Settings, 
 ChevronLeft, ChevronRight, BarChart3, Package, Activity, 
 HeartHandshake, MapPin, Shield, ShieldCheck, FileSearch, Archive, ChevronDown, ChevronUp,
 UserCircle, Lightbulb, TrendingUp, DollarSign as DollarIcon, MessageSquare, FileBarChart,
 Globe, User, LogOut, Clock, Mail
 } from 'lucide-react';
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/i18n/useTranslation";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOperatingUnit } from "@/contexts/OperatingUnitContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Building2 as BuildingIcon, ChevronDown as ChevronDownIcon } from 'lucide-react';

/**
 * Unified Sidebar Component - Switches between Platform and Organization modes
 * 
 * Platform Mode (3 items):
 * - Dashboard, Organizations, Platform Settings
 * 
 * Organization Mode (13+ items in 3 groups):
 * - STRATEGIC: Dashboard, Programs Management
 * - OPERATIONS: HR, Finance, Logistics, MEAL, Donor CRM (collapsible), Risk, Assets
 * - SYSTEM: Documents, Reports, System Status, Settings
 */

// Icon mapping for all modules
const iconMap: Record<string, any> = {
 Dashboard: LayoutDashboard,
 Organizations: Building2,
 OperatingUnits: MapPin,
 PlatformUsers: Users,
 SystemHealth: Activity,
 AuditLogs: FileSearch,
 DeletedRecords: Archive,
 PlatformSettings: Settings,
 Mail: Mail,
 Projects: Briefcase,
 Grants: HeartHandshake,
 HR: Users,
 Finance: Wallet,
 Logistics: Package,
 MEAL: ClipboardList,
 CRM: HeartHandshake,
 Risk: Shield,
 RegressionProtection: ShieldCheck,
 Assets: Package,
 Documents: FileText,
 Reports: BarChart3,
 SystemStatus: Activity,
 Settings: Settings,
 // Donor CRM sub-items
 DonorRegistry: UserCircle,
 Opportunities: Lightbulb,
 ProposalPipeline: TrendingUp,
 GrantsManagement: DollarIcon,
 DonorCommunications: MessageSquare,
 DonorReports: FileBarChart,
 RetentionPolicy: Clock,

 // Direct icon references for menu items
 FileText: FileText,
 ClipboardList: ClipboardList,
 TrendingUp: TrendingUp,
};

interface NavItem {
 id: string;
 label: string;
 labelAr: string;
 path: string;
 icon: string;
 subItems?: NavItem[]; // For collapsible menu items
}

interface NavGroup {
 group: string;
 groupAr: string;
 items: NavItem[];
}

export function Sidebar() {
 const [collapsed, setCollapsed] = useState(false);
 const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
 const [showUserMenu, setShowUserMenu] = useState(false);
 const [location] = useLocation();
 const { user, logout } = useAuth();
 const { direction, setLanguage, isRTL} = useLanguage();
 const { t, language } = useTranslation();
const { currentOrganization, availableOrganizations, switchOrganization, currentRole } = useOrganization();
 const { currentOperatingUnit, userOperatingUnits, switchOperatingUnit } = useOperatingUnit();
 const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);
 const [showOUSwitcher, setShowOUSwitcher] = useState(false);
 const { canView, isAdmin } = usePermissions();

 // Map sidebar item IDs to RBAC module IDs for permission filtering
 const sidebarToRbacMap: Record<string, string> = {
 'projects': 'projects',
 'hr': 'hr',
 'finance': 'finance',
 'logistics': 'logistics',
 'meal': 'meal',
 'crm': 'donor_management',
 'risk': 'risk_compliance',
 'reports': 'reports_analytics',
 'docs': 'documents',
 'settings-org': 'settings',
 };

 // Items that are always visible regardless of permissions
 const alwaysVisibleItems = new Set(['dash', 'assets']);
 
 
 // Context detection: Route-based (not role-based)
 // /platform/* routes → Platform sidebar (dark slate)
 // /organization/* routes → Organization sidebar (blue)
 const isPlatformContext = window.location.pathname.startsWith("/platform");

 // Toggle expanded state for collapsible items
 const toggleExpanded = (itemId: string) => {
 const newExpanded = new Set(expandedItems);
 if (newExpanded.has(itemId)) {
 newExpanded.delete(itemId);
 } else {
 newExpanded.add(itemId);
 }
 setExpandedItems(newExpanded);
 };

 // Handle language switch
 const handleLanguageSwitch = () => {
 const newLang = t.components.ar;
 setLanguage(newLang);
 };

 // Handle logout
 const handleLogout = () => {
 logout();
 };

 // PLATFORM MENU (3 items - updated structure)
 // Platform Admins manage Dashboard, Organizations, and Platform Settings
 const platformMenu: NavGroup[] = [
 {
 group: 'PLATFORM',
 groupAr: 'المنصة',
 items: [
 { id: 'dashboard', label: t.platform.dashboard.title, labelAr: t.platform.dashboard.title, path: '/platform', icon: 'Dashboard' },
 { id: 'orgs', label: t.platform.organizationManagement, labelAr: t.platform.organizationManagement, path: '/platform/organizations', icon: 'Organizations' },
 { id: 'email-management', label: 'Email Management', labelAr: 'إدارة البريد الإلكتروني', path: '/platform/email-management', icon: 'Mail' },
 { id: 'performance-dashboard', label: 'Email Performance', labelAr: 'أداء البريد الإلكتروني', path: '/platform/performance-dashboard', icon: 'TrendingUp' },
 { id: 'system-health', label: 'System Health & Protection', labelAr: 'صحة النظام والحماية', path: '/platform/system-health', icon: 'SystemHealth' },
 { id: 'settings', label: t.platform.platformSettings, labelAr: t.platform.platformSettings, path: '/platform/settings', icon: 'Settings' },
 ]
 }
 ];

 // ORGANIZATION MENU (15+ items - 3 groups)
 // Organization users see only operational modules, not Platform management
 const orgMenu: NavGroup[] = [
 {
 group: 'STRATEGIC',
 groupAr: 'استراتيجي',
 items: [
 { id: 'dash', label: 'Dashboard', labelAr: 'لوحة المعلومات', path: '/organization', icon: 'Dashboard' },
 { id: 'projects', label: 'Programs Management', labelAr: 'إدارة البرامج', path: '/organization/projects', icon: 'Projects' },
 ]
 },
 {
 group: 'OPERATIONS',
 groupAr: 'العمليات',
 items: [
 { id: 'hr', label: 'Human Resources', labelAr: 'الموارد البشرية', path: '/organization/hr', icon: 'HR' },
 { id: 'finance', label: 'Financial Management', labelAr: 'الإدارة المالية', path: '/organization/finance', icon: 'Finance' },
 { id: 'logistics', label: 'Logistics & Procurement', labelAr: 'الخدمات اللوجستية والمشتريات', path: '/organization/logistics', icon: 'Logistics' },
 { id: 'meal', label: 'MEAL', labelAr: 'المتابعة والتقييم والمساءلة (MEAL)', path: '/organization/meal', icon: 'MEAL' },
 { id: 'crm', label: 'Donor CRM', labelAr: 'علاقات المانحين', path: '/organization/donor-crm', icon: 'CRM' },
 { id: 'risk', label: 'Risk & Compliance', labelAr: 'المخاطر والامتثال', path: '/organization/risk-compliance', icon: 'Risk' },
 { id: 'reports', label: 'Reports & Analytics', labelAr: 'التقارير والتحليلات', path: '/organization/reports-analytics', icon: 'Reports' },
 ]
 },
 {
 group: 'SYSTEM',
 groupAr: 'النظام',
 items: [
 { id: 'settings-org', label: 'Settings', labelAr: 'الإعدادات', path: '/organization/settings', icon: 'Settings' },
 ]
 }
 ];

 // Filter organization menu items based on RBAC permissions
 const filteredOrgMenu = orgMenu.map(group => ({
 ...group,
 items: group.items.filter(item => {
 // Always show items not mapped to RBAC modules
 if (alwaysVisibleItems.has(item.id)) return true;
 // Admin sees everything
 if (isAdmin) return true;
 // Check RBAC permission for mapped modules
 const rbacModuleId = sidebarToRbacMap[item.id];
 if (!rbacModuleId) return true; // No mapping = always visible
 return canView(rbacModuleId);
 }),
 })).filter(group => group.items.length > 0);

 const activeMenu = isPlatformContext ? platformMenu : filteredOrgMenu;

 const ToggleIcon = collapsed 
 ? (isRTL ? ChevronLeft : ChevronRight)
 : (isRTL ? ChevronRight : ChevronLeft);

 return (
 <div 
 
 
 className={`h-full bg-white flex flex-col transition-all duration-300 border-s border-gray-200 ${collapsed ? 'w-20' : 'w-72'}`}
 >
 {/* Branding Section with Organization Switcher */}
 <div 
 className={`relative flex items-center ${collapsed ? 'justify-center h-16' : 'justify-between h-16'} border-b border-gray-100 shrink-0`}
 style={{ paddingInlineStart: '1.5rem', paddingInlineEnd: '1.5rem' }}
 >
 {!collapsed && (
 <div className="flex items-center gap-3 flex-1">
 <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${isPlatformContext ? 'bg-slate-900' : 'bg-blue-600'}`}>
 <span className="text-white font-black text-xs">IMS</span>
 </div>
 {/* Organization Switcher Dropdown - Show only for Org Admins with multiple orgs */}
 {!isPlatformContext && availableOrganizations.length > 1 && (currentRole === 'organization_admin' || currentRole === 'admin' || currentRole === 'platform_admin') ? (
 <div className="relative flex-1">
 <button
 onClick={() => setShowOrgSwitcher(!showOrgSwitcher)}
 className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors text-start`}
 >
 <div className="flex-1 min-w-0">
 <h1 className="text-sm font-black text-gray-900 tracking-tight truncate">
 {currentOrganization?.code?.toUpperCase() || currentOrganization?.name?.split(' - ')[0]?.toUpperCase() || 'LOADING...'}
 </h1>
 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-0.5">
 {t.sidebar.organization}
 </p>
 </div>
 <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showOrgSwitcher ? 'rotate-180' : ''}`} />
 </button>
 {/* Organization Dropdown Menu */}
 {showOrgSwitcher && (
 <>
 <div className="fixed inset-0 z-40" onClick={() => setShowOrgSwitcher(false)} />
 <div 
 className={`absolute top-full mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 ${isRTL ? 'end-0' : 'start-0'}`}
 >
 <div className="px-3 py-2 border-b border-gray-100">
 <p className="text-xs font-semibold text-gray-500">
 {t.sidebar.switchOrganization}
 </p>
 </div>
 {availableOrganizations.map((org) => (
 <button
 key={org.id}
 onClick={() => {
 switchOrganization(org.id);
 setShowOrgSwitcher(false);
 }}
 className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-start ${currentOrganization?.id === org.id ? 'bg-blue-50' : ''}`}
 >
 <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${currentOrganization?.id === org.id ? 'bg-blue-600' : 'bg-gray-200'}`}>
 <BuildingIcon className={`w-4 h-4 ${currentOrganization?.id === org.id ? 'text-white' : 'text-gray-500'}`} />
 </div>
 <div className="flex-1 min-w-0">
 <p className={`text-sm font-medium truncate ${currentOrganization?.id === org.id ? 'text-blue-600' : 'text-gray-900'}`}>
 {org.code?.toUpperCase() || org.name?.split(' - ')[0]}
 </p>
 <p className="text-xs text-gray-500 truncate">
 {language === 'ar' && org.nameAr ? org.nameAr : org.name}
 </p>
 </div>
 {currentOrganization?.id === org.id && (
 <div className="w-2 h-2 rounded-full bg-blue-600" />
 )}
 </button>
 ))}
 </div>
 </>
 )}
 </div>
 ) : (
 <div className={'text-start'} style={isRTL ? { direction: 'rtl', unicodeBidi: 'embed' } : undefined}>
 <h1 className="text-sm font-black text-gray-900 tracking-tight">
 {isPlatformContext 
 ? t.sidebar.imsFoundation
 : (currentOrganization?.code?.toUpperCase() || currentOrganization?.name?.split(' - ')[0]?.toUpperCase() || 'LOADING...')
 }
 </h1>
 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-0.5">
 {isPlatformContext 
 ? t.sidebar.platformAdmin
 : t.sidebar.organization
 }
 </p>
 </div>
 )}
 </div>
 )}
 <button
 onClick={() => setCollapsed(!collapsed)}
 className="p-1.5 hover:bg-gray-50 rounded-md transition-colors text-gray-400 hover:text-gray-900"
 aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
 >
 <ToggleIcon className="w-4 h-4" />
 </button>
 </div>

 {/* OU Switcher removed from sidebar - now only in header */}
 
 {/* Navigation Groups */}
 <nav className="flex-1 overflow-y-auto py-4 space-y-6 scrollbar-hide" style={{ paddingInlineStart: '0.75rem', paddingInlineEnd: '0.75rem' }}>
 {activeMenu.map((group) => (
 <div key={group.group} className="space-y-1">
 {!collapsed && (
 <h2 
 className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-2"
 style={{ paddingInlineStart: '12px', textAlign: 'start', unicodeBidi: 'embed' }}
 >
 {language === 'ar' ? group.groupAr : group.group}
 </h2>
 )}
 <div className="space-y-0.5">
 {group.items.map((item) => {
 const Icon = iconMap[item.icon];
 const isActive = location === item.path || (item.subItems && item.subItems.some(sub => location === sub.path));
 const isExpanded = expandedItems.has(item.id);
 const label = language === 'ar' ? item.labelAr : item.label;
 
 // Check if any sub-item is active
 const hasActiveSubItem = item.subItems && item.subItems.some(sub => location === sub.path);
 
 // For links within nested routes, use native anchor tags to avoid wouter's
 // nested route path resolution issues that cause double path prefixes
 const needsNativeAnchor = (
 (!isPlatformContext && item.path.startsWith('/platform')) ||
 (isPlatformContext && item.path.startsWith('/platform')) ||
 item.path.startsWith('/organization')
 );
 
 // If item has sub-items, render as collapsible
 if (item.subItems) {
 return (
 <div key={item.id}>
 <button
 onClick={() => toggleExpanded(item.id)}
 className={`w-full flex items-center gap-3 py-2 rounded-lg transition-all group ${isActive || hasActiveSubItem ? (isPlatformContext ? 'bg-slate-100 text-slate-900 font-bold' : 'bg-blue-50 text-blue-700 font-bold shadow-sm') : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900' }`}
 style={{ paddingInlineStart: '0.75rem', paddingInlineEnd: '0.75rem' }}
 title={collapsed ? label : undefined}
 >
 <Icon className={`w-5 h-5 shrink-0 ${isActive || hasActiveSubItem ? (isPlatformContext ? 'text-slate-900' : 'text-blue-600') : 'text-gray-400 group-hover:text-gray-600'}`} />
 {!collapsed && <span className="text-sm truncate flex-1" style={{ textAlign: 'start', unicodeBidi: 'embed' }}>{label}</span>}
 {!collapsed && (
 <div style={{ marginInlineStart: 'auto' }}>
 {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
 </div>
 )}
 </button>
 
 {/* Sub-items */}
 {!collapsed && isExpanded && (
 <div className="mt-1 space-y-0.5" style={{ paddingInlineStart: '1rem' }}>
 {item.subItems.map((subItem) => {
 const SubIcon = iconMap[subItem.icon];
 const isSubActive = location === subItem.path;
 const subLabel = language === 'ar' ? subItem.labelAr : subItem.label;
 
 return (
 <a
 key={subItem.id}
 href={subItem.path}
 className={`flex items-center gap-3 py-2 rounded-lg transition-all group ${isSubActive ? (isPlatformContext ? 'bg-slate-50 text-slate-900 font-semibold' : 'bg-blue-100 text-blue-700 font-semibold') : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900' }`}
 style={{ paddingInlineStart: '0.75rem', paddingInlineEnd: '0.75rem' }}
 >
 <SubIcon className={`w-4 h-4 shrink-0 ${isSubActive ? (isPlatformContext ? 'text-slate-900' : 'text-blue-600') : 'text-gray-400 group-hover:text-gray-600'}`} />
 <span className="text-xs truncate flex-1" style={{ textAlign: 'start' }}>{subLabel}</span>
 {isSubActive && (
 <div className={`w-1 h-3 rounded-full ${isPlatformContext ? 'bg-slate-900' : 'bg-blue-600'}`} style={{ marginInlineStart: 'auto' }} />
 )}
 </a>
 );
 })}
 </div>
 )}
 </div>
 );
 }
 
 // Regular menu item (no sub-items)
 if (needsNativeAnchor) {
 return (
 <a
 key={item.id}
 href={item.path}
 className={`flex items-center gap-3 py-2 rounded-lg transition-all group ${isActive ? (isPlatformContext ? 'bg-slate-100 text-slate-900 font-bold' : 'bg-blue-50 text-blue-700 font-bold shadow-sm') : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900' }`}
 style={{ paddingInlineStart: '0.75rem', paddingInlineEnd: '0.75rem' }}
 title={collapsed ? label : undefined}
 >
 <Icon className={`w-5 h-5 shrink-0 ${isActive ? (isPlatformContext ? 'text-slate-900' : 'text-blue-600') : 'text-gray-400 group-hover:text-gray-600'}`} />
 {!collapsed && <span className="text-sm truncate flex-1" style={{ textAlign: 'start', unicodeBidi: 'embed' }}>{label}</span>}
 {!collapsed && isActive && (
 <div className={`w-1 h-4 rounded-full ${isPlatformContext ? 'bg-slate-900' : 'bg-blue-600'}`} style={{ marginInlineStart: 'auto' }} />
 )}
 </a>
 );
 }
 
 return (
 <Link
 key={item.id}
 href={item.path}
 className={`flex items-center gap-3 py-2 rounded-lg transition-all group ${isActive ? (isPlatformContext ? 'bg-slate-100 text-slate-900 font-bold' : 'bg-blue-50 text-blue-700 font-bold shadow-sm') : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900' }`}
 style={{ paddingInlineStart: '0.75rem', paddingInlineEnd: '0.75rem' }}
 title={collapsed ? label : undefined}
 >
 <Icon className={`w-5 h-5 shrink-0 ${isActive ? (isPlatformContext ? 'text-slate-900' : 'text-blue-600') : 'text-gray-400 group-hover:text-gray-600'}`} />
 {!collapsed && <span className="text-sm truncate flex-1" style={{ textAlign: 'start', unicodeBidi: 'embed' }}>{label}</span>}
 {!collapsed && isActive && (
 <div className={`w-1 h-4 rounded-full ${isPlatformContext ? 'bg-slate-900' : 'bg-blue-600'}`} style={{ marginInlineStart: 'auto' }} />
 )}
 </Link>
 );
 })}
 </div>
 </div>
 ))}
 </nav>

 {/* Language Switcher & User Profile Section */}
 {!collapsed && (
 <div className="border-t border-gray-100 space-y-2" style={{ padding: '0.75rem' }}>
 {/* Language Switcher */}
 <button
 onClick={handleLanguageSwitch}
 className="w-full flex items-center gap-3 py-2 rounded-lg transition-all hover:bg-gray-100"
 style={{ paddingInlineStart: '0.75rem', paddingInlineEnd: '0.75rem' }}
 >
 <Globe className="w-4 h-4 text-gray-500" />
 <span className="text-sm font-medium text-gray-700 flex-1" style={{ textAlign: 'start' }}>
 {t.sidebar.languageToggle}
 </span>
 </button>

 {/* User Profile */}
 <div className="relative">
 <button
 onClick={() => setShowUserMenu(!showUserMenu)}
 className="w-full flex items-center gap-3 py-2 rounded-lg transition-all hover:bg-gray-100"
 style={{ paddingInlineStart: '0.75rem', paddingInlineEnd: '0.75rem' }}
 >
 <User className="w-4 h-4 text-gray-500" />
 <div className="flex-1" style={{ textAlign: 'start', unicodeBidi: 'embed' }}>
 <div className="text-sm font-medium text-gray-900 truncate">{user?.name || 'User'}</div>
 <div className="text-[10px] uppercase font-bold tracking-wider text-gray-500 truncate">
 {user?.role?.replace('_', ' ') || 'user'}
 </div>
 </div>
 <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
 </button>

 {/* User Dropdown Menu */}
 {showUserMenu && (
 <>
 <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
 <div 
 className="absolute bottom-full mb-2 w-full bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50"
 
 >
 <div className="border-b border-gray-100" style={{ paddingInlineStart: '1rem', paddingInlineEnd: '1rem', paddingTop: '0.75rem', paddingBottom: '0.75rem', textAlign: 'start', unicodeBidi: 'embed' }}>
 <div className="text-sm font-bold text-gray-900">{user?.name || 'User'}</div>
 <div className="text-xs text-gray-500 mt-0.5">{user?.email || 'No email'}</div>
 </div>
 <div className="py-1">
 <button 
 onClick={handleLogout}
 className="w-full flex items-center gap-3 py-2 hover:bg-gray-50 transition-colors text-red-600"
 style={{ paddingInlineStart: '1rem', paddingInlineEnd: '1rem' }}
 >
 <LogOut className="w-4 h-4" />
 <span className="text-sm font-medium" style={{ textAlign: 'start' }}>
 {t.sidebar.signOut}
 </span>
 </button>
 </div>
 </div>
 </>
 )}
 </div>
 </div>
 )}
 </div>
 );
}
