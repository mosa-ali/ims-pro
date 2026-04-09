/**
 * Vendor Management Dashboard
 * Card-based module layout matching Finance module style
 * Centralized vendor/supplier master database with lifecycle automation
 */

import { useTranslation } from '@/i18n/useTranslation';
import { useState } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
 ArrowLeft, ArrowRight,
 Building2,
 Users,
 HardHat,
 Briefcase,
 FileText,
 Plus,
 Download,
 Upload,
 Settings,
 TrendingUp,
 TrendingDown,
 AlertCircle,
 CheckCircle,
 Clock,
 DollarSign,
 Award,
 ShieldAlert,
 BarChart3,
 ClipboardCheck,
 LayoutDashboard,
 History,
 GitBranch,
} from 'lucide-react';
import { Link } from 'wouter';
import { BackButton } from "@/components/BackButton";

export default function VendorManagement() {
 const navigate = useNavigate();
 const { language, isRTL} = useLanguage();
  const { t } = useTranslation();
 const { currentOrganization } = useOrganization();

 const organizationId = currentOrganization?.id || 0;

 // Fetch vendor statistics
 const statsQuery = trpc.vendors.getStatistics.useQuery(
 undefined,
 { enabled: !!organizationId }
 );

 const stats = statsQuery.data || {
 totalVendors: 0,
 activeVendors: 0,
 financiallyActiveVendors: 0,
 pendingApproval: 0,
 blacklistedVendors: 0,
 };

 // Module cards configuration
 const moduleCards = [
 {
 title: t.vendorManagement2.suppliers,
 description: t.vendorManagement2.suppliersDesc,
 icon: Users,
 color: 'bg-green-500',
 stats: [
{ label: isRTL ? 'نشط' : 'Active', value: (stats as any).suppliers?.active ?? 0 },
	 { label: isRTL ? 'الإجمالي' : 'Total', value: (stats as any).suppliers?.total ?? 0 },
 ],
 href: '/organization/logistics/vendors/suppliers',
 },
 {
 title: t.vendorManagement2.contractors,
 description: t.vendorManagement2.contractorsDesc,
 icon: HardHat,
 color: 'bg-orange-500',
 stats: [
{ label: isRTL ? 'نشط' : 'Active', value: (stats as any).contractors?.active ?? 0 },
	 { label: isRTL ? 'الإجمالي' : 'Total', value: (stats as any).contractors?.total ?? 0 },
 ],
 href: '/organization/logistics/vendors/contractors',
 },
 {
 title: t.vendorManagement2.serviceProviders,
 description: t.vendorManagement2.serviceProvidersDesc,
 icon: Briefcase,
 color: 'bg-purple-500',
 stats: [
{ label: isRTL ? 'نشط' : 'Active', value: (stats as any).serviceProviders?.active ?? 0 },
	 { label: isRTL ? 'الإجمالي' : 'Total', value: (stats as any).serviceProviders?.total ?? 0 },
 ],
 href: '/organization/logistics/vendors/service-providers',
 },
 ];

 // Quick action cards
 const quickActions = [
 {
 title: t.vendorManagement2.addVendor,
 description: t.vendorManagement2.addVendorDesc,
 icon: Plus,
 onClick: () => navigate('/organization/logistics/vendors/new'),
 },
 {
 title: t.vendorManagement2.importVendors,
 description: t.vendorManagement2.importVendorsDesc,
 icon: Upload,
 onClick: () => {/* Import dialog */},
 },
 {
 title: t.vendorManagement2.exportVendors,
 description: t.vendorManagement2.exportVendorsDesc,
 icon: Download,
 onClick: () => {/* Export vendors */},
 },
 ];

 // Evaluation & Performance sub-cards configuration (from guidelines)
 const evalSubCards = [
 {
   title: t.vendorManagement2.evaluationChecklist ?? 'Evaluation Checklist',
   description: t.vendorManagement2.evaluationChecklistDesc ?? 'IMS standard checklist: Legal, Experience, Operational, Samples, References',
   icon: ClipboardCheck,
   color: 'text-blue-600',
   bgColor: 'bg-blue-50 dark:bg-blue-950/20',
   borderColor: 'border-blue-200',
   href: '/organization/logistics/evaluation-performance/checklist',
 },
 {
   title: t.vendorManagement2.scoreDashboard ?? 'Score Dashboard',
   description: t.vendorManagement2.scoreDashboardDesc ?? 'Final score, vendor classification, risk level, last evaluation date',
   icon: LayoutDashboard,
   color: 'text-emerald-600',
   bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
   borderColor: 'border-emerald-200',
   href: '/organization/logistics/evaluation-performance/score-dashboard',
 },
 {
   title: t.vendorManagement2.evaluationHistoryCard ?? 'Evaluation History',
   description: t.vendorManagement2.evaluationHistoryCardDesc ?? 'Track evaluator, date, score changes, version history',
   icon: History,
   color: 'text-amber-600',
   bgColor: 'bg-amber-50 dark:bg-amber-950/20',
   borderColor: 'border-amber-200',
   href: '/organization/logistics/evaluation-performance/history',
 },
 {
   title: t.vendorManagement2.approvalWorkflow ?? 'Approval Workflow',
   description: t.vendorManagement2.approvalWorkflowDesc ?? 'Procurement Officer \u2192 Compliance \u2192 Finance \u2192 Final Approval',
   icon: GitBranch,
   color: 'text-violet-600',
   bgColor: 'bg-violet-50 dark:bg-violet-950/20',
   borderColor: 'border-violet-200',
   href: '/organization/logistics/evaluation-performance/approval-workflow',
 },
 ];

 return (
 <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="border-b bg-card">
 <div className="container py-6">
 <div className="flex items-center gap-4 mb-4">
 <Link href="/organization/logistics">
 <BackButton label={t.vendorManagement2.backToLogistics} />
 </Link>
 </div>
 <div>
 <h1 className="text-3xl font-bold text-foreground">{t.vendorManagement2.title}</h1>
 <p className="text-muted-foreground mt-1">{t.vendorManagement2.subtitle}</p>
 </div>
 </div>
 </div>

 {/* Main Content */}
 <div className="container py-8">
 {/* Statistics Cards */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
 <Card>
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
 <Building2 className="h-4 w-4" />
 {t.vendorManagement2.totalVendors}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-3xl font-bold">{stats.totalVendors}</div>
 </CardContent>
 </Card>

 <Card>
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
 <CheckCircle className="h-4 w-4" />
 {t.vendorManagement2.activeVendors}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-3xl font-bold text-green-600">{stats.activeVendors}</div>
 </CardContent>
 </Card>

 <Card>
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
 <DollarSign className="h-4 w-4" />
 {t.vendorManagement2.totalPayables}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-3xl font-bold">{stats.totalPayables !== undefined ? `$${Number(stats.totalPayables).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00'}</div>
 </CardContent>
 </Card>

 <Card>
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
 <Clock className="h-4 w-4" />
 {t.vendorManagement2.pendingPayments}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-3xl font-bold text-yellow-600">{stats.pendingPayments ?? 0}</div>
 </CardContent>
 </Card>
 </div>

 {/* Vendor Type Modules */}
 <div className="mb-8">
 <h2 className="text-xl font-semibold mb-4">{isRTL ? 'فئات الموردين' : 'Vendor Categories'}</h2>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {moduleCards.map((module, index) => {
 const Icon = module.icon;
 return (
 <Card 
 key={index}
 className="hover:shadow-lg transition-shadow cursor-pointer group"
 onClick={() => navigate(module.href)}
 >
 <CardHeader>
 <div className="flex items-center justify-between mb-2">
 <div className={`${module.color} p-3 rounded-lg text-white`}>
 <Icon className="h-6 w-6" />
 </div>
 <Badge variant="secondary">{module.stats[0].value}</Badge>
 </div>
 <CardTitle className="text-lg group-hover:text-primary transition-colors">
 {module.title}
 </CardTitle>
 <CardDescription className="text-sm">
 {module.description}
 </CardDescription>
 </CardHeader>
 <CardContent>
 <div className="flex justify-between text-sm">
 {module.stats.map((stat, i) => (
 <div key={i}>
 <span className="text-muted-foreground">{stat.label}: </span>
 <span className="font-semibold">{stat.value}</span>
 </div>
 ))}
 </div>
 <Button variant="ghost" size="sm" className="w-full mt-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
 {t.vendorManagement2.viewDetails} →
 </Button>
 </CardContent>
 </Card>
 );
 })}
 </div>
 </div>

 {/* Evaluation & Performance Card — Clickable */}
 <div className="mb-8">
 <Card
   className="border-2 border-primary/20 hover:shadow-lg transition-shadow cursor-pointer group"
   onClick={() => navigate('/organization/logistics/evaluation-performance')}
 >
 <CardHeader>
   <div className="flex items-center justify-between">
     <div className="flex items-center gap-3">
       <div className="bg-primary p-3 rounded-lg text-primary-foreground">
         <Award className="h-6 w-6" />
       </div>
       <div>
         <CardTitle className="text-xl group-hover:text-primary transition-colors">
           {t.vendorManagement2.evaluationAndPerformance ?? 'Evaluation & Performance'}
         </CardTitle>
         <CardDescription className="mt-1">
           {t.vendorManagement2.evaluationAndPerformanceDesc ?? 'Unified vendor evaluation checklist with weighted scoring, classification automation, and audit tracking'}
         </CardDescription>
       </div>
     </div>
     <Button
       onClick={(e: React.MouseEvent) => { e.stopPropagation(); navigate('/organization/logistics/vendor-performance-evaluation'); }}
       size="sm"
     >
       <Plus className="h-4 w-4 me-2" />
       {t.vendorManagement2.newEvaluation ?? 'New Evaluation'}
     </Button>
   </div>
 </CardHeader>
 <CardContent>
   {/* Sub-cards grid — each clickable */}
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
     {evalSubCards.map((card, index) => {
       const Icon = card.icon;
       return (
         <Card
           key={index}
           className={`${card.bgColor} ${card.borderColor} border hover:shadow-md transition-shadow cursor-pointer`}
           onClick={(e: React.MouseEvent) => { e.stopPropagation(); navigate(card.href); }}
         >
           <CardHeader className="pb-2">
             <div className="flex items-center gap-2">
               <Icon className={`h-5 w-5 ${card.color}`} />
               <CardTitle className="text-sm font-semibold">{card.title}</CardTitle>
             </div>
           </CardHeader>
           <CardContent>
             <p className="text-xs text-muted-foreground">{card.description}</p>
           </CardContent>
         </Card>
       );
     })}
   </div>

   {/* View All Evaluations — Performance Tracking cards are in the Evaluation Hub */}
   <div className="text-center">
     <Button
       variant="outline"
       size="sm"
       onClick={(e: React.MouseEvent) => { e.stopPropagation(); navigate('/organization/logistics/evaluation-performance'); }}
     >
       <BarChart3 className="h-4 w-4 me-2" />
       {t.vendorManagement2.viewAllEvaluations ?? (isRTL ? 'عرض جميع التقييمات' : 'View All Evaluations')}
     </Button>
   </div>
 </CardContent>
 </Card>
 </div>
 </div>
 </div>
 );
}
