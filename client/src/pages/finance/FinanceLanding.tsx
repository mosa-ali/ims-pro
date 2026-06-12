/**
 * ============================================================================
 * FINANCE MODULE LAUNCHER - INTERACTIVE CARDS GRID
 * ============================================================================
 * 
 * PURPOSE:
 * - Replace horizontal scrolling tabs with scalable card-based navigation
 * - Clear visibility of all Finance modules (implemented + coming soon)
 * - Better UX consistent with HR and MEAL modules
 * - Status badges for module maturity
 * 
 * FEATURES:
 * ✅ Responsive grid (3 cols desktop, 2 tablet, 1 mobile)
 * ✅ Status badges (Active / Coming Soon)
 * ✅ Trilingual (EN/AR/IT with RTL)
 * ✅ Module icons, names, descriptions
 * ✅ Click to navigate to active modules
 * ✅ Disabled state for coming-soon modules
 * 
 * ============================================================================
 */

import { useNavigate } from '@/lib/router-compat';
import {
  BarChart3,
  BookOpen,
  Calculator,
  Receipt,
  FileText,
  Wallet,
  Package,
  Landmark,
  Settings,
  Users,
  AlertTriangle,
  Layers
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface FinanceModule {
  id: string;
  name: { en: string; ar: string; it: string };
  description: { en: string; ar: string; it: string };
  icon: any;
  path: string;
  status: 'active' | 'coming-soon';
}

export function FinanceLanding() {
  const { t } = useTranslation();
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();

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

  const labels = {
    title: getText(
      t.financeModule.financialManagement || "Financial Management",
      t.financeModule.financialManagement || "الإدارة المالية",
      t.financeModule.financialManagement || "Gestione Finanziaria"
    ),
    subtitle: getText(
      t.financeModule.financeLandingSubtitle || "Budget, expenses, accounts and financial reconciliation",
      t.financeModule.financeLandingSubtitle || "الميزانية والنفقات والحسابات والمصالحة المالية",
      t.financeModule.financeLandingSubtitle || "Budget, spese, conti e riconciliazione finanziaria"
    ),
    
    // Status badges
    active: getText(
      t.financeModule.active || "Active",
      t.financeModule.active || "نشط",
      t.financeModule.active || "Attivo"
    ),
    comingSoon: getText(
      t.financeModule.comingSoon || "Coming Soon",
      t.financeModule.comingSoon || "قريبا",
      t.financeModule.comingSoon || "Prossimamente"
    ),
    
    // Tooltips
    clickToOpen: getText(
      t.financeModule.clickToOpenModule || "Click to open module",
      t.financeModule.clickToOpenModule || "انقر لفتح الوحدة",
      t.financeModule.clickToOpenModule || "Fai clic per aprire il modulo"
    ),
    underDevelopment: getText(
      t.financeModule.moduleUnderDevelopment || "Module under development",
      t.financeModule.moduleUnderDevelopment || "الوحدة قيد التطوير",
      t.financeModule.moduleUnderDevelopment || "Modulo in fase di sviluppo"
    ),

    // Footer info
    moduleStatusLegend: getText(
      t.financeModule.moduleStatusLegend || "Module Status Legend",
      t.financeModule.moduleStatusLegend || "وسيلة إيضاح حالة الوحدة",
      t.financeModule.moduleStatusLegend || "Legenda dello Stato del Modulo"
    ),
    fullyFunctionalAndReadyToUse: getText(
      t.financeModule.fullyFunctionalAndReadyToUse || "Fully functional and ready to use",
      t.financeModule.fullyFunctionalAndReadyToUse || "وظيفي بالكامل وجاهز للاستخدام",
      t.financeModule.fullyFunctionalAndReadyToUse || "Completamente funzionale e pronto all'uso"
    ),
  };

  const modules: FinanceModule[] = [
    {
      id: 'overview',
      name: {
        en: 'Financial Overview',
        ar: 'نظرة عامة مالية',
        it: 'Panoramica Finanziaria'
      },
      description: {
        en: 'High-level financial dashboard with budgets, expenditures, and variance.',
        ar: 'لوحة تحكم مالية عالية المستوى مع الميزانيات والنفقات والفروقات.',
        it: 'Dashboard finanziario di alto livello con budget, spese e varianze.'
      },
      icon: BarChart3,
      path: '/organization/finance/overview',
      status: 'active'
    },
    {
      id: 'chart-of-accounts',
      name: {
        en: 'Chart of Accounts',
        ar: 'دليل الحسابات',
        it: 'Piano dei Conti'
      },
      description: {
        en: 'Manage account codes, categories, and financial structure.',
        ar: 'إدارة رموز الحسابات والفئات والهيكل المالي.',
        it: 'Gestisci i codici dei conti, le categorie e la struttura finanziaria.'
      },
      icon: BookOpen,
      path: '/organization/finance/chart-of-accounts',
      status: 'active'
    },
    {
      id: 'budgets',
      name: {
        en: 'Budgets',
        ar: 'الميزانيات',
        it: 'Budget'
      },
      description: {
        en: 'Create, submit, approve, and track project and organizational budgets.',
        ar: 'إنشاء وتقديم واعتماد وتتبع ميزانيات المشاريع والمنظمة.',
        it: 'Crea, invia, approva e traccia i budget dei progetti e dell\'organizzazione.'
      },
      icon: Calculator,
      path: '/organization/finance/budgets',
      status: 'active'
    },
    {
      id: 'expenditures',
      name: {
        en: 'Expenditures',
        ar: 'النفقات',
        it: 'Spese'
      },
      description: {
        en: 'Track expenses, payment status, and budget consumption.',
        ar: 'تتبع المصروفات وحالة الدفع واستهلاك الميزانية.',
        it: 'Traccia le spese, lo stato dei pagamenti e il consumo del budget.'
      },
      icon: Receipt,
      path: '/organization/finance/expenditures',
      status: 'active'
    },
    {
      id: 'reports',
      name: {
        en: 'Financial Reports',
        ar: 'التقارير المالية',
        it: 'Rapporti Finanziari'
      },
      description: {
        en: 'Generate financial summaries and internal reports.',
        ar: 'إنشاء الملخصات المالية والتقارير الداخلية.',
        it: 'Genera riepiloghi finanziari e rapporti interni.'
      },
      icon: FileText,
      path: '/organization/finance/reports',
      status: 'active'
    },
    {
      id: 'advances',
      name: {
        en: 'Advances & Settlements',
        ar: 'السلف والتسويات',
        it: 'Anticipi e Regolamenti'
      },
      description: {
        en: 'Staff advances, liquidation, and settlement tracking.',
        ar: 'سلف الموظفين والتصفية وتتبع التسويات.',
        it: 'Anticipi al personale, liquidazione e tracciamento dei regolamenti.'
      },
      icon: Wallet,
      path: '/organization/finance/advances',
      status: 'active'
    },
    {
      id: 'assets',
      name: {
        en: 'Assets Management',
        ar: 'إدارة الأصول',
        it: 'Gestione dei Beni'
      },
      description: {
        en: 'Track fixed assets, depreciation, and assignments.',
        ar: 'تتبع الأصول الثابتة والإهلاك والتخصيصات.',
        it: 'Traccia i beni fissi, l\'ammortamento e le assegnazioni.'
      },
      icon: Package,
      path: '/organization/finance/assets',
      status: 'active'
    },
    {
      id: 'treasury',
      name: {
        en: 'Treasury & Cash Management',
        ar: 'الخزينة وإدارة النقد',
        it: 'Tesoreria e Gestione della Liquidità'
      },
      description: {
        en: 'Cash flow, bank accounts, and fund balances.',
        ar: 'التدفق النقدي والحسابات البنكية وأرصدة الصناديق.',
        it: 'Flusso di cassa, conti bancari e saldi dei fondi.'
      },
      icon: Landmark,
      path: '/organization/finance/treasury',
      status: 'active'
    },
    {
      id: 'vendors',
      name: {
        en: 'Vendor Management',
        ar: 'إدارة الموردين',
        it: 'Gestione dei Fornitori'
      },
      description: {
        en: 'View vendor master data from Logistics — read-only mirror.',
        ar: 'عرض بيانات الموردين من الخدمات اللوجستية — للقراءة فقط.',
        it: 'Visualizza i dati master dei fornitori dalla Logistica — mirror di sola lettura.'
      },
      icon: Users,
      path: '/organization/finance/vendors',
      status: 'active'
    },
    {
      id: 'payments',
      name: {
        en: 'Payments',
        ar: 'المدفوعات',
        it: 'Pagamenti'
      },
      description: {
        en: 'Process vendor payments with approval workflow and bank selection.',
        ar: 'معالجة مدفوعات الموردين مع سير عمل الموافقة واختيار البنك.',
        it: 'Elabora i pagamenti ai fornitori con flusso di approvazione e selezione della banca.'
      },
      icon: Receipt,
      path: '/organization/finance/payments',
      status: 'active'
    },
    {
      id: 'cost-allocation',
      name: {
        en: 'Cost Allocation',
        ar: 'توزيع التكاليف',
        it: 'Allocazione dei Costi'
      },
      description: {
        en: 'Distribute overhead costs across projects using configurable allocation methods.',
        ar: 'توزيع التكاليف العامة على المشاريع باستخدام طرق توزيع قابلة للتكوين.',
        it: 'Distribuisci i costi generali tra i progetti utilizzando metodi di allocazione configurabili.'
      },
      icon: Layers,
      path: '/organization/finance/cost-allocation',
      status: 'active'
    },
    {
      id: 'settings',
      name: {
        en: 'Financial Settings',
        ar: 'الإعدادات المالية',
        it: 'Impostazioni Finanziarie'
      },
      description: {
        en: 'Currencies, fiscal years, approval workflows, and configuration.',
        ar: 'العملات والسنوات المالية وسير عمل الموافقات والتكوين.',
        it: 'Valute, anni fiscali, flussi di approvazione e configurazione.'
      },
      icon: Settings,
      path: '/organization/finance/settings',
      status: 'active'
    }
  ];

  const handleModuleClick = (module: FinanceModule) => {
    if (module.status === 'active') {
      navigate(module.path);
    }
  };

  const getStatusBadge = (module: FinanceModule) => {
    switch (module.status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
            ✅ {labels.active}
          </span>
        );
      case 'coming-soon':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
            ⏳ {labels.comingSoon}
          </span>
        );
      default:
        return null;
    }
  };

  const getCardClasses = (module: FinanceModule) => {
    const baseClasses = "bg-white rounded-lg border-2 p-6 transition-all duration-200";
    
    if (module.status === 'active') {
      return `${baseClasses} border-gray-200 hover:border-emerald-500 hover:shadow-lg cursor-pointer`;
    } else {
      return `${baseClasses} border-gray-200 opacity-60 cursor-not-allowed`;
    }
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="text-start">
        <h1 className="text-3xl font-bold text-gray-900">{labels.title}</h1>
        <p className="text-base text-gray-600 mt-2">{labels.subtitle}</p>
      </div>

      {/* Module Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module) => {
          const Icon = module.icon;
          
          return (
            <div
              key={module.id}
              onClick={() => handleModuleClick(module)}
              className={getCardClasses(module)}
              title={
                module.status === 'active' 
                  ? labels.clickToOpen
                  : labels.underDevelopment
              }
            >
              {/* Icon and Status Badge */}
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${module.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>{getStatusBadge(module)}</div>
              </div>

              {/* Module Name */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2 text-start">
                {getText(module.name.en, module.name.ar, module.name.it)}
              </h3>

              {/* Module Description */}
              <p className="text-sm text-gray-600 text-start">
                {getText(module.description.en, module.description.ar, module.description.it)}
              </p>

              {/* Active indicator */}
              {module.status === 'active' && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-sm text-emerald-600 font-medium">
                  <span>{labels.clickToOpen}</span>
                  {!isRTL && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="mt-8 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-start">
        <p className="text-sm text-emerald-900">
          <strong>{labels.moduleStatusLegend}</strong>
        </p>
        <div className="mt-2 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
              ✅ {labels.active}
            </span>
            <span className="text-xs text-gray-600">
              {labels.fullyFunctionalAndReadyToUse}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
              ⏳ {labels.comingSoon}
            </span>
            <span className="text-xs text-gray-600">
              {labels.underDevelopment}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FinanceLanding;
