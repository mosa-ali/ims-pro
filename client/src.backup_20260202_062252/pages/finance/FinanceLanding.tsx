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
 * ✅ Bilingual (EN/AR with RTL)
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
  Settings
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface FinanceModule {
  id: string;
  name: { en: string; ar: string };
  description: { en: string; ar: string };
  icon: any;
  path: string;
  status: 'active' | 'coming-soon';
}

export function FinanceLanding() {
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();

  const t = {
    title: language === 'en' ? 'Financial Management' : 'الإدارة المالية',
    subtitle: language === 'en' 
      ? 'Budgets, expenditures, accounts, and financial reporting' 
      : 'الميزانيات والنفقات والحسابات والتقارير المالية',
    
    // Status badges
    active: language === 'en' ? 'Active' : 'نشط',
    comingSoon: language === 'en' ? 'Coming Soon' : 'قريباً',
    
    // Tooltips
    clickToOpen: language === 'en' ? 'Click to open module →' : '← انقر لفتح الوحدة',
    underDevelopment: language === 'en' ? 'Module under development' : 'الوحدة قيد التطوير',
  };

  const modules: FinanceModule[] = [
    {
      id: 'overview',
      name: { en: 'Financial Overview', ar: 'نظرة عامة مالية' },
      description: { 
        en: 'High-level financial dashboard with budgets, expenditures, and variance.', 
        ar: 'لوحة تحكم مالية عالية المستوى مع الميزانيات والنفقات والفروقات.' 
      },
      icon: BarChart3,
      path: '/organization/finance/overview',
      status: 'active'
    },
    {
      id: 'chart-of-accounts',
      name: { en: 'Chart of Accounts', ar: 'دليل الحسابات' },
      description: { 
        en: 'Manage account codes, categories, and financial structure.', 
        ar: 'إدارة رموز الحسابات والفئات والهيكل المالي.' 
      },
      icon: BookOpen,
      path: '/organization/finance/chart-of-accounts',
      status: 'active'
    },
    {
      id: 'budgets',
      name: { en: 'Budgets', ar: 'الميزانيات' },
      description: { 
        en: 'Create, submit, approve, and track project and organizational budgets.', 
        ar: 'إنشاء وتقديم واعتماد وتتبع ميزانيات المشاريع والمنظمة.' 
      },
      icon: Calculator,
      path: '/organization/finance/budgets',
      status: 'active'
    },
    {
      id: 'expenditures',
      name: { en: 'Expenditures', ar: 'النفقات' },
      description: { 
        en: 'Track expenses, payment status, and budget consumption.', 
        ar: 'تتبع المصروفات وحالة الدفع واستهلاك الميزانية.' 
      },
      icon: Receipt,
      path: '/organization/finance/expenditures',
      status: 'active'
    },
    {
      id: 'reports',
      name: { en: 'Financial Reports', ar: 'التقارير المالية' },
      description: { 
        en: 'Generate financial summaries and internal reports.', 
        ar: 'إنشاء الملخصات المالية والتقارير الداخلية.' 
      },
      icon: FileText,
      path: '/organization/finance/reports',
      status: 'active'
    },
    {
      id: 'advances',
      name: { en: 'Advances & Settlements', ar: 'السلف والتسويات' },
      description: { 
        en: 'Staff advances, liquidation, and settlement tracking.', 
        ar: 'سلف الموظفين والتصفية وتتبع التسويات.' 
      },
      icon: Wallet,
      path: '/organization/finance/advances',
      status: 'active'
    },
    {
      id: 'assets',
      name: { en: 'Assets Management', ar: 'إدارة الأصول' },
      description: { 
        en: 'Track fixed assets, depreciation, and assignments.', 
        ar: 'تتبع الأصول الثابتة والإهلاك والتخصيصات.' 
      },
      icon: Package,
      path: '/organization/finance/assets',
      status: 'active'
    },
    {
      id: 'treasury',
      name: { en: 'Treasury & Cash Management', ar: 'الخزينة وإدارة النقد' },
      description: { 
        en: 'Cash flow, bank accounts, and fund balances.', 
        ar: 'التدفق النقدي والحسابات البنكية وأرصدة الصناديق.' 
      },
      icon: Landmark,
      path: '/organization/finance/treasury',
      status: 'active'
    },
    {
      id: 'settings',
      name: { en: 'Financial Settings', ar: 'الإعدادات المالية' },
      description: { 
        en: 'Currencies, fiscal years, approval workflows, and configuration.', 
        ar: 'العملات والسنوات المالية وسير عمل الموافقات والتكوين.' 
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
            ✅ {t.active}
          </span>
        );
      case 'coming-soon':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
            ⏳ {t.comingSoon}
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
    <div className="space-y-6">
      {/* Header */}
      <div className={isRTL ? 'text-right' : 'text-left'}>
        <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
        <p className="text-base text-gray-600 mt-2">{t.subtitle}</p>
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
                  ? (language === 'en' ? 'Click to open module' : 'انقر لفتح الوحدة')
                  : t.underDevelopment
              }
            >
              {/* Icon and Status Badge */}
              <div className={`flex items-start justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`p-3 rounded-lg ${
                  module.status === 'active' 
                    ? 'bg-emerald-100 text-emerald-600' 
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>{getStatusBadge(module)}</div>
              </div>

              {/* Module Name */}
              <h3 className={`text-lg font-semibold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                {module.name[language]}
              </h3>

              {/* Module Description */}
              <p className={`text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                {module.description[language]}
              </p>

              {/* Active indicator */}
              {module.status === 'active' && (
                <div className={`mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-sm text-emerald-600 font-medium ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span>{t.clickToOpen}</span>
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
      <div className={`mt-8 p-4 bg-emerald-50 border border-emerald-200 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
        <p className="text-sm text-emerald-900">
          <strong>{language === 'en' ? 'Module Status Legend:' : 'دليل حالة الوحدة:'}</strong>
        </p>
        <div className={`mt-2 flex flex-wrap gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
              ✅ {t.active}
            </span>
            <span className="text-xs text-gray-600">
              {language === 'en' ? 'Fully functional and ready to use' : 'جاهز للاستخدام بالكامل'}
            </span>
          </div>
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
              ⏳ {t.comingSoon}
            </span>
            <span className="text-xs text-gray-600">
              {language === 'en' ? 'Module under development' : 'الوحدة قيد التطوير'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FinanceLanding;
