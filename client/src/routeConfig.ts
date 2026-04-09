// ============================================================================
// ROUTE CONFIGURATION
// Maps routes to their required permissions
// ============================================================================

export interface RouteConfig {
 path: string;
 module: string;
 action: 'view' | 'create' | 'edit' | 'delete' | 'manage';
 label: string;
 labelAr?: string;
 icon?: string;
 adminOnly?: boolean;
 hideFromSidebar?: boolean;
}

export const routes: RouteConfig[] = [
 // Dashboard
 {
 path: '/',
 module: 'dashboard',
 action: 'view',
 label: 'Dashboard',
 labelAr: 'لوحة التحكم',
 icon: 'LayoutDashboard'
 },
 
 // Projects & Grants
 {
 path: '/projects',
 module: 'projects',
 action: 'view',
 label: 'Programs & Grants',
 labelAr: 'البرامج والمنح',
 icon: 'Target'
 },

 // Strategic Planning
 {
 path: '/strategic-planning',
 module: 'strategy',
 action: 'view',
 label: 'Strategic Planning',
 labelAr: 'التخطيط الاستراتيجي',
 icon: 'Lightbulb'
 },
 
 // Finance
 {
 path: '/finance',
 module: 'finance',
 action: 'view',
 label: 'Financial Management',
 labelAr: 'الإدارة المالية',
 icon: 'DollarSign'
 },
 
 // Logistics & Procurement
 {
 path: '/logistics',
 module: 'logistics',
 action: 'view',
 label: 'Logistics & Procurement',
 labelAr: 'الخدمات اللوجستية والمشتريات',
 icon: 'Truck'
 },
 
 // HR Management
 {
 path: '/hr',
 module: 'hr',
 action: 'view',
 label: 'Human Resources',
 labelAr: 'الموارد البشرية',
 icon: 'Users'
 },

 // MEAL
 {
 path: '/meal',
 module: 'meal',
 action: 'view',
 label: 'MEAL',
 labelAr: 'المتابعة والتقييم',
 icon: 'ClipboardList'
 },

 // Donor CRM
 {
 path: '/donor-crm',
 module: 'crm',
 action: 'view',
 label: 'Donor CRM',
 labelAr: 'إدارة المانحين',
 icon: 'Building2'
 },

 // Risk Management
 {
 path: '/risk-management',
 module: 'risk',
 action: 'view',
 label: 'Risk Management',
 labelAr: 'إدارة المخاطر',
 icon: 'ShieldAlert'
 },
 
 // Documents
 {
 path: '/documents',
 module: 'documents',
 action: 'view',
 label: 'Documents',
 labelAr: 'المستندات',
 icon: 'FileText'
 },

 // Reports
 {
 path: '/reports',
 module: 'reports',
 action: 'view',
 label: 'Reports & Analytics',
 labelAr: 'التقارير والتحليلات',
 icon: 'BarChart3'
 },
 
 // Settings
 {
 path: '/settings',
 module: 'settings',
 action: 'manage',
 label: 'Settings',
 labelAr: 'الإعدادات',
 icon: 'Settings'
 }
];

export interface NavCategory {
 category: string;
 categoryAr: string;
 items: RouteConfig[];
}

// Navigation menu items (Grouped by Hierarchy)
export const navigationItems: NavCategory[] = [
 {
 category: 'Strategic',
 categoryAr: 'الاستراتيجية',
 items: [
 routes.find(r => r.path === '/')!,
 routes.find(r => r.path === '/projects')!,
 routes.find(r => r.path === '/strategic-planning')!
 ]
 },
 {
 category: 'Operations',
 categoryAr: 'العمليات',
 items: [
 routes.find(r => r.path === '/finance')!,
 routes.find(r => r.path === '/logistics')!,
 routes.find(r => r.path === '/hr')!,
 routes.find(r => r.path === '/meal')!,
 routes.find(r => r.path === '/donor-crm')!,
 routes.find(r => r.path === '/risk-management')!
 ]
 },
 {
 category: 'System',
 categoryAr: 'النظام',
 items: [
 routes.find(r => r.path === '/documents')!,
 routes.find(r => r.path === '/reports')!,
 routes.find(r => r.path === '/settings')!
 ]
 }
];
