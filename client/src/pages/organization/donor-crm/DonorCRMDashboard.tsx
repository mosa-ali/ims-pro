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
  titleIt: string;
  description: string;
  descriptionAr: string;
  descriptionIt: string;
  icon: React.ElementType;
  iconBg: string;
  path: string;
  kpi?: {
    label: string;
    labelAr: string;
    labelIt: string;
    value: string | number;
  };
}

export default function DonorCRMDashboard() {
  const { language, isRTL } = useLanguage();
  const { t } = useTranslation();
  const { currentOrganizationId } = useOrganization();
  const { currentOperatingUnitId } = useOperatingUnit();

  const donorCRM = (t as any)?.donorCRM ?? {};

  // ========== HELPER FUNCTION TO GET TEXT BY LANGUAGE ==========
  const getText = (en: string, ar: string, it: string): string => {
    switch (language) {
      case "ar":
        return ar;
      case "it":
        return it;
      case "en":
      default:
        return en;
    }
  };

  // ========== TRANSLATION OBJECT ==========
  const localT = {
    // Main title and description
    donorCrm: getText(
      donorCRM.donorCrm || "Donor CRM",
      donorCRM.donorCrm || "إدارة علاقات المانحين",
      donorCRM.donorCrm || "Gestione CRM Donatori"
    ),
    manageDonorRelationshipsOpportunitiesPro: getText(
      donorCRM.manageDonorRelationshipsOpportunitiesPro || "Manage donor relationships, opportunities, and proposals",
      donorCRM.manageDonorRelationshipsOpportunitiesPro || "إدارة علاقات المانحين والفرص والمقترحات",
      donorCRM.manageDonorRelationshipsOpportunitiesPro || "Gestisci relazioni con i donatori, opportunità e proposte"
    ),
    open: getText(
      donorCRM.open || "Open",
      donorCRM.open || "فتح",
      donorCRM.open || "Apri"
    ),
    aboutDonorCrm: getText(
      donorCRM.aboutDonorCrm || "About Donor CRM",
      donorCRM.aboutDonorCrm || "حول إدارة علاقات المانحين",
      donorCRM.aboutDonorCrm || "Informazioni su Gestione CRM Donatori"
    ),
    theDonorCrmModuleHelpsYouManageTheComple: getText(
      donorCRM.theDonorCrmModuleHelpsYouManageTheComple || "The Donor CRM module helps you manage the complete donor lifecycle from prospecting to grant management.",
      donorCRM.theDonorCrmModuleHelpsYouManageTheComple || "تساعدك وحدة إدارة علاقات المانحين على إدارة دورة حياة المانح الكاملة من البحث عن العملاء إلى إدارة المنح.",
      donorCRM.theDonorCrmModuleHelpsYouManageTheComple || "Il modulo Gestione CRM Donatori ti aiuta a gestire l'intero ciclo di vita del donatore dalla prospecting alla gestione delle sovvenzioni."
    ),

    // Card translations
    cards: {
      donorRegistry: {
        title: getText(
          donorCRM.donorRegistryTitle || "Donor Registry",
          donorCRM.donorRegistryTitleAr || "سجل المانحين",
          donorCRM.donorRegistryTitleIt || "Registro dei Donatori"
        ),
        description: getText(
          donorCRM.donorRegistryDescription || "Manage donor profiles, contact information, and funding history",
          donorCRM.donorRegistryDescriptionAr || "إدارة ملفات المانحين ومعلومات الاتصال وسجل التمويل",
          donorCRM.donorRegistryDescriptionIt || "Gestisci i profili dei donatori, le informazioni di contatto e la cronologia dei finanziamenti"
        ),
        kpi: getText(
          donorCRM.donorRegistryKpi || "Active Donors",
          donorCRM.donorRegistryKpiAr || "المانحون النشطون",
          donorCRM.donorRegistryKpiIt || "Donatori Attivi"
        ),
      },
      opportunities: {
        title: getText(
          donorCRM.opportunitiesTitle || "Opportunities",
          donorCRM.opportunitiesTitleAr || "الفرص",
          donorCRM.opportunitiesTitleIt || "Opportunità"
        ),
        description: getText(
          donorCRM.opportunitiesDescription || "Track funding opportunities and potential partnerships",
          donorCRM.opportunitiesDescriptionAr || "تتبع فرص التمويل والشراكات المحتملة",
          donorCRM.opportunitiesDescriptionIt || "Traccia le opportunità di finanziamento e le potenziali partnership"
        ),
        kpi: getText(
          donorCRM.opportunitiesKpi || "Open Opportunities",
          donorCRM.opportunitiesKpiAr || "الفرص المفتوحة",
          donorCRM.opportunitiesKpiIt || "Opportunità Aperte"
        ),
      },
      proposalPipeline: {
        title: getText(
          donorCRM.proposalPipelineTitle || "Proposal & Pipeline",
          donorCRM.proposalPipelineTitleAr || "المقترحات والخط الأنابيب",
          donorCRM.proposalPipelineTitleIt || "Proposte e Pipeline"
        ),
        description: getText(
          donorCRM.proposalPipelineDescription || "Manage proposals from concept to submission",
          donorCRM.proposalPipelineDescriptionAr || "إدارة المقترحات من المفهوم إلى التقديم",
          donorCRM.proposalPipelineDescriptionIt || "Gestisci le proposte dal concetto alla presentazione"
        ),
        kpi: getText(
          donorCRM.proposalPipelineKpi || "Active Proposals",
          donorCRM.proposalPipelineKpiAr || "المقترحات النشطة",
          donorCRM.proposalPipelineKpiIt || "Proposte Attive"
        ),
      },
      grantsManagement: {
        title: getText(
          donorCRM.grantsManagementTitle || "Grants Management",
          donorCRM.grantsManagementTitleAr || "إدارة المنح",
          donorCRM.grantsManagementTitleIt || "Gestione Sovvenzioni"
        ),
        description: getText(
          donorCRM.grantsManagementDescription || "Track active grants, budgets, and compliance requirements",
          donorCRM.grantsManagementDescriptionAr || "تتبع المنح النشطة والميزانيات ومتطلبات الامتثال",
          donorCRM.grantsManagementDescriptionIt || "Traccia le sovvenzioni attive, i budget e i requisiti di conformità"
        ),
        kpi: getText(
          donorCRM.grantsManagementKpi || "Active Grants",
          donorCRM.grantsManagementKpiAr || "المنح النشطة",
          donorCRM.grantsManagementKpiIt || "Sovvenzioni Attive"
        ),
      },
      donorCommunications: {
        title: getText(
          donorCRM.donorCommunicationsTitle || "Donor Communications",
          donorCRM.donorCommunicationsTitleAr || "اتصالات المانحين",
          donorCRM.donorCommunicationsTitleIt || "Comunicazioni Donatori"
        ),
        description: getText(
          donorCRM.donorCommunicationsDescription || "Manage donor correspondence, reports, and relationship updates",
          donorCRM.donorCommunicationsDescriptionAr || "إدارة مراسلات المانحين والتقارير وتحديثات العلاقات",
          donorCRM.donorCommunicationsDescriptionIt || "Gestisci la corrispondenza dei donatori, i rapporti e gli aggiornamenti delle relazioni"
        ),
        kpi: getText(
          donorCRM.donorCommunicationsKpi || "Pending Communications",
          donorCRM.donorCommunicationsKpiAr || "الاتصالات المعلقة",
          donorCRM.donorCommunicationsKpiIt || "Comunicazioni in Sospeso"
        ),
      },
      donorReports: {
        title: getText(
          donorCRM.donorReportsTitle || "Donor Reports",
          donorCRM.donorReportsTitleAr || "تقارير المانحين",
          donorCRM.donorReportsTitleIt || "Rapporti Donatori"
        ),
        description: getText(
          donorCRM.donorReportsDescription || "Generate donor-specific reports and funding analytics",
          donorCRM.donorReportsDescriptionAr || "إنشاء تقارير خاصة بالمانح وتحليلات التمويل",
          donorCRM.donorReportsDescriptionIt || "Genera rapporti specifici dei donatori e analisi dei finanziamenti"
        ),
        kpi: getText(
          donorCRM.donorReportsKpi || "Reports Generated",
          donorCRM.donorReportsKpiAr || "التقارير المنتجة",
          donorCRM.donorReportsKpiIt || "Rapporti Generati"
        ),
      },
      fundingOpportunities: {
        title: getText(
          donorCRM.fundingOpportunitiesTitle || "Funding Opportunities",
          donorCRM.fundingOpportunitiesTitleAr || "فرص التمويل",
          donorCRM.fundingOpportunitiesTitleIt || "Opportunità di Finanziamento"
        ),
        description: getText(
          donorCRM.fundingOpportunitiesDescription || "Track funding calls and opportunities before internal decision",
          donorCRM.fundingOpportunitiesDescriptionAr || "تتبع نداءات التمويل والفرص قبل القرار الداخلي",
          donorCRM.fundingOpportunitiesDescriptionIt || "Traccia le chiamate di finanziamento e le opportunità prima della decisione interna"
        ),
        kpi: getText(
          donorCRM.fundingOpportunitiesKpi || "Open Opportunities",
          donorCRM.fundingOpportunitiesKpiAr || "الفرص المفتوحة",
          donorCRM.fundingOpportunitiesKpiIt || "Opportunità Aperte"
        ),
      },
    },
  };

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
      title: getText(
        localT.cards.donorRegistry.title,
        localT.cards.donorRegistry.title,
        localT.cards.donorRegistry.title
      ),
      titleAr: localT.cards.donorRegistry.title,
      titleIt: localT.cards.donorRegistry.title,
      description: getText(
        localT.cards.donorRegistry.description,
        localT.cards.donorRegistry.description,
        localT.cards.donorRegistry.description
      ),
      descriptionAr: localT.cards.donorRegistry.description,
      descriptionIt: localT.cards.donorRegistry.description,
      icon: UserCircle,
      iconBg: "bg-blue-50",
      path: "/organization/donor-crm/donors",
      kpi: {
        label: getText(
          localT.cards.donorRegistry.kpi,
          localT.cards.donorRegistry.kpi,
          localT.cards.donorRegistry.kpi
        ),
        labelAr: localT.cards.donorRegistry.kpi,
        labelIt: localT.cards.donorRegistry.kpi,
        value: "-",
      },
    },
    {
      id: "opportunities",
      title: getText(
        localT.cards.opportunities.title,
        localT.cards.opportunities.title,
        localT.cards.opportunities.title
      ),
      titleAr: localT.cards.opportunities.title,
      titleIt: localT.cards.opportunities.title,
      description: getText(
        localT.cards.opportunities.description,
        localT.cards.opportunities.description,
        localT.cards.opportunities.description
      ),
      descriptionAr: localT.cards.opportunities.description,
      descriptionIt: localT.cards.opportunities.description,
      icon: Lightbulb,
      iconBg: "bg-yellow-50",
      path: "/organization/donor-crm/opportunities",
      kpi: {
        label: getText(
          localT.cards.opportunities.kpi,
          localT.cards.opportunities.kpi,
          localT.cards.opportunities.kpi
        ),
        labelAr: localT.cards.opportunities.kpi,
        labelIt: localT.cards.opportunities.kpi,
        value: isLoading ? "-" : kpis?.openOpportunities || 0,
      },
    },
    {
      id: "proposal-pipeline",
      title: getText(
        localT.cards.proposalPipeline.title,
        localT.cards.proposalPipeline.title,
        localT.cards.proposalPipeline.title
      ),
      titleAr: localT.cards.proposalPipeline.title,
      titleIt: localT.cards.proposalPipeline.title,
      description: getText(
        localT.cards.proposalPipeline.description,
        localT.cards.proposalPipeline.description,
        localT.cards.proposalPipeline.description
      ),
      descriptionAr: localT.cards.proposalPipeline.description,
      descriptionIt: localT.cards.proposalPipeline.description,
      icon: TrendingUp,
      iconBg: "bg-orange-50",
      path: "/organization/proposals",
      kpi: {
        label: getText(
          localT.cards.proposalPipeline.kpi,
          localT.cards.proposalPipeline.kpi,
          localT.cards.proposalPipeline.kpi
        ),
        labelAr: localT.cards.proposalPipeline.kpi,
        labelIt: localT.cards.proposalPipeline.kpi,
        value: isLoading ? "-" : kpis?.activeProposals || 0,
      },
    },
    {
      id: "grants-management",
      title: getText(
        localT.cards.grantsManagement.title,
        localT.cards.grantsManagement.title,
        localT.cards.grantsManagement.title
      ),
      titleAr: localT.cards.grantsManagement.title,
      titleIt: localT.cards.grantsManagement.title,
      description: getText(
        localT.cards.grantsManagement.description,
        localT.cards.grantsManagement.description,
        localT.cards.grantsManagement.description
      ),
      descriptionAr: localT.cards.grantsManagement.description,
      descriptionIt: localT.cards.grantsManagement.description,
      icon: DollarSign,
      iconBg: "bg-green-50",
      path: "/organization/grants",
      kpi: {
        label: getText(
          localT.cards.grantsManagement.kpi,
          localT.cards.grantsManagement.kpi,
          localT.cards.grantsManagement.kpi
        ),
        labelAr: localT.cards.grantsManagement.kpi,
        labelIt: localT.cards.grantsManagement.kpi,
        value: grantsLoading ? "-" : grantsKPIs?.activeGrants || 0,
      },
    },
    {
      id: "donor-communications",
      title: getText(
        localT.cards.donorCommunications.title,
        localT.cards.donorCommunications.title,
        localT.cards.donorCommunications.title
      ),
      titleAr: localT.cards.donorCommunications.title,
      titleIt: localT.cards.donorCommunications.title,
      description: getText(
        localT.cards.donorCommunications.description,
        localT.cards.donorCommunications.description,
        localT.cards.donorCommunications.description
      ),
      descriptionAr: localT.cards.donorCommunications.description,
      descriptionIt: localT.cards.donorCommunications.description,
      icon: MessageSquare,
      iconBg: "bg-purple-50",
      path: "/organization/donor-crm/communications",
      kpi: {
        label: getText(
          localT.cards.donorCommunications.kpi,
          localT.cards.donorCommunications.kpi,
          localT.cards.donorCommunications.kpi
        ),
        labelAr: localT.cards.donorCommunications.kpi,
        labelIt: localT.cards.donorCommunications.kpi,
        value: "-",
      },
    },
    {
      id: "donor-reports",
      title: getText(
        localT.cards.donorReports.title,
        localT.cards.donorReports.title,
        localT.cards.donorReports.title
      ),
      titleAr: localT.cards.donorReports.title,
      titleIt: localT.cards.donorReports.title,
      description: getText(
        localT.cards.donorReports.description,
        localT.cards.donorReports.description,
        localT.cards.donorReports.description
      ),
      descriptionAr: localT.cards.donorReports.description,
      descriptionIt: localT.cards.donorReports.description,
      icon: FileBarChart,
      iconBg: "bg-indigo-50",
      path: "/organization/donor-crm/reports",
      kpi: {
        label: getText(
          localT.cards.donorReports.kpi,
          localT.cards.donorReports.kpi,
          localT.cards.donorReports.kpi
        ),
        labelAr: localT.cards.donorReports.kpi,
        labelIt: localT.cards.donorReports.kpi,
        value: "-",
      },
    },
    {
      id: "funding-opportunities",
      title: getText(
        localT.cards.fundingOpportunities.title,
        localT.cards.fundingOpportunities.title,
        localT.cards.fundingOpportunities.title
      ),
      titleAr: localT.cards.fundingOpportunities.title,
      titleIt: localT.cards.fundingOpportunities.title,
      description: getText(
        localT.cards.fundingOpportunities.description,
        localT.cards.fundingOpportunities.description,
        localT.cards.fundingOpportunities.description
      ),
      descriptionAr: localT.cards.fundingOpportunities.description,
      descriptionIt: localT.cards.fundingOpportunities.description,
      icon: Clock,
      iconBg: "bg-teal-50",
      path: "/organization/donor-crm/funding-opportunities",
      kpi: {
        label: getText(
          localT.cards.fundingOpportunities.kpi,
          localT.cards.fundingOpportunities.kpi,
          localT.cards.fundingOpportunities.kpi
        ),
        labelAr: localT.cards.fundingOpportunities.kpi,
        labelIt: localT.cards.fundingOpportunities.kpi,
        value: isLoading ? "-" : kpis?.openOpportunities || 0,
      },
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900">{localT.donorCrm}</h1>
          <p className="text-gray-600 mt-2">
            {localT.manageDonorRelationshipsOpportunitiesPro}
          </p>
        </div>
      </div>

      {/* CRUD Cards Grid */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {crudCards.map((card) => {
            const Icon = card.icon;
            const displayTitle = getText(card.title, card.titleAr, card.titleIt);
            const displayDescription = getText(
              card.description,
              card.descriptionAr,
              card.descriptionIt
            );
            const displayKpiLabel = card.kpi
              ? getText(card.kpi.label, card.kpi.labelAr, card.kpi.labelIt)
              : "";

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
                            {displayKpiLabel}
                          </p>
                        </div>
                      )}
                    </div>
                    <CardTitle className="mt-4">{displayTitle}</CardTitle>
                    <CardDescription>{displayDescription}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">
                      {localT.open} →
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
            <CardTitle>{localT.aboutDonorCrm}</CardTitle>
            <CardDescription>
              {localT.theDonorCrmModuleHelpsYouManageTheComple}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
