import {
 UserCircle,
 Lightbulb,
 TrendingUp,
 DollarSign,
 MessageSquare,
 FileBarChart,
 Clock,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/useTranslation";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOperatingUnit } from "@/contexts/OperatingUnitContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "wouter";

/**
 * Donor CRM Dashboard - Landing page with CRUD cards
 * 
 * This dashboard follows the IMS pattern: Dashboard → Cards → CRUD
 * Each card represents a sub-module and links to its respective CRUD page
 * 
 * Architecture:
 * - No sidebar expansion (single Donor CRM item in sidebar)
 * - Dashboard-based navigation (consistent with HR, MEAL, Projects modules)
 * - Cards display module name, description, and key KPIs
 * - Clicking a card opens the existing CRUD page
 */

interface CRUDCard {
 id: string;
 title: string;
 titleAr: string;
 description: string;
 descriptionAr: string;
 icon: React.ElementType;
 iconBg: string;
 path: string;
 kpi?: {
 label: string;
 labelAr: string;
 value: string | number;
 };
}

export default function DonorCRMDashboard() {
  const { language, isRTL} = useLanguage();
 const { t } = useTranslation();
const { currentOrganizationId } = useOrganization();
 const { currentOperatingUnitId } = useOperatingUnit();

 // Fetch real KPIs from database
 const { data: kpis, isLoading } = trpc.proposals.getDonorCRMKPIs.useQuery(
 {},
 {
 enabled: !!currentOrganizationId,
 }
 );

 // Fetch grants KPIs for active grants count
 const { data: grantsKPIs, isLoading: grantsLoading } = trpc.grants.getDashboardKPIs.useQuery(
 {},
 {
 enabled: !!currentOrganizationId,
 }
 );

 // CRUD Cards for Donor CRM sub-modules
 const crudCards: CRUDCard[] = [
 {
 id: "donor-registry",
 title: "Donor Registry",
 titleAr: "سجل المانحين",
 description: "Manage donor profiles, contact information, and funding history",
 descriptionAr: "إدارة ملفات المانحين ومعلومات الاتصال وتاريخ التمويل",
 icon: UserCircle,
 iconBg: "bg-blue-50",
 path: "/organization/donor-crm/donors",
 kpi: {
 label: "Active Donors",
 labelAr: "المانحون النشطون",
 value: "-", // Placeholder - will be replaced with real data
 },
 },
 {
 id: "opportunities",
 title: "Opportunities",
 titleAr: "الفرص",
 description: "Track funding opportunities and potential partnerships",
 descriptionAr: "تتبع فرص التمويل والشراكات المحتملة",
 icon: Lightbulb,
 iconBg: "bg-yellow-50",
 path: "/organization/donor-crm/opportunities",
 kpi: {
 label: "Open Opportunities",
 labelAr: "الفرص المفتوحة",
 value: isLoading ? "-" : (kpis?.openOpportunities || 0),
 },
 },
 {
 id: "proposal-pipeline",
 title: "Proposal & Pipeline",
 titleAr: "المقترحات والفرص",
 description: "Manage proposals from concept to submission",
 descriptionAr: "إدارة المقترحات من المفهوم إلى التقديم",
 icon: TrendingUp,
 iconBg: "bg-orange-50",
 path: "/organization/proposals",
 kpi: {
 label: "Active Proposals",
 labelAr: "المقترحات النشطة",
 value: isLoading ? "-" : (kpis?.activeProposals || 0),
 },
 },
 {
 id: "grants-management",
 title: "Grants Management",
 titleAr: "إدارة المنح",
 description: "Track active grants, budgets, and compliance requirements",
 descriptionAr: "تتبع المنح النشطة والميزانيات ومتطلبات الامتثال",
 icon: DollarSign,
 iconBg: "bg-green-50",
 path: "/organization/grants",
 kpi: {
 label: "Active Grants",
 labelAr: "المنح النشطة",
 value: grantsLoading ? "-" : (grantsKPIs?.activeGrants || 0),
 },
 },
 {
 id: "donor-communications",
 title: "Donor Communications",
 titleAr: "تواصل المانحين",
 description: "Manage donor correspondence, reports, and relationship updates",
 descriptionAr: "إدارة مراسلات المانحين والتقارير وتحديثات العلاقات",
 icon: MessageSquare,
 iconBg: "bg-purple-50",
 path: "/organization/donor-crm/communications",
 kpi: {
 label: "Pending Communications",
 labelAr: "الاتصالات المعلقة",
 value: "-",
 },
 },
 {
 id: "donor-reports",
 title: "Donor Reports",
 titleAr: "تقارير المانحين",
 description: "Generate donor-specific reports and funding analytics",
 descriptionAr: "إنشاء تقارير خاصة بالمانحين وتحليلات التمويل",
 icon: FileBarChart,
 iconBg: "bg-indigo-50",
 path: "/organization/donor-crm/reports",
 kpi: {
 label: "Reports Generated",
 labelAr: "التقارير المنشأة",
 value: "-",
 },
 },
 {
 id: "funding-opportunities",
 title: "Funding Opportunities",
 titleAr: "فرص التمويل",
 description: "Track funding calls and opportunities before internal decision",
 descriptionAr: "تتبع فرص التمويل قبل القرار الداخلي",
 icon: Clock,
 iconBg: "bg-teal-50",
 path: "/organization/donor-crm/funding-opportunities",
 kpi: {
 label: "Open Opportunities",
 labelAr: "الفرص المفتوحة",
 value: isLoading ? "-" : (kpis?.openFundingOpportunities || 0),
 },
 },
 ];

 return (
 <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="bg-white border-b border-gray-200 px-8 py-6">
 <div className="max-w-7xl mx-auto">
 <h1 className="text-3xl font-bold text-gray-900">
 {t.donorCRM.donorCrm}
 </h1>
 <p className="text-gray-600 mt-2">
 {t.donorCRM.manageDonorRelationshipsOpportunitiesPro}
 </p>
 </div>
 </div>

 {/* CRUD Cards Grid */}
 <div className="max-w-7xl mx-auto px-8 py-8">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {crudCards.map((card) => {
 const Icon = card.icon;
 return (
 <Link key={card.id} href={card.path}>
 <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
 <CardHeader>
 <div className="flex items-start justify-between">
 <div className={`p-3 rounded-lg ${card.iconBg}`}>
 <Icon className="w-6 h-6 text-gray-700" />
 </div>
 {card.kpi && (
 <div className="text-end">
 <p className="text-2xl font-bold text-gray-900">
 {card.kpi.value}
 </p>
 <p className="text-xs text-gray-500">
 {language === "en" ? card.kpi.label : card.kpi.labelAr}
 </p>
 </div>
 )}
 </div>
 <CardTitle className="mt-4">
 {language === "en" ? card.title : card.titleAr}
 </CardTitle>
 <CardDescription>
 {language === "en" ? card.description : card.descriptionAr}
 </CardDescription>
 </CardHeader>
 <CardContent>
 <Button variant="outline" className="w-full">
 {t.donorCRM.open} →
 </Button>
 </CardContent>
 </Card>
 </Link>
 );
 })}
 </div>
 </div>

 {/* Quick Info Section */}
 <div className="max-w-7xl mx-auto px-8 pb-8">
 <Card>
 <CardHeader>
 <CardTitle>
 {t.donorCRM.aboutDonorCrm}
 </CardTitle>
 <CardDescription>
 {t.donorCRM.theDonorCrmModuleHelpsYouManageTheComple}
 </CardDescription>
 </CardHeader>
 </Card>
 </div>
 </div>
 );
}
