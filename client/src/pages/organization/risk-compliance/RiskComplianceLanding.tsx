import { useTranslation } from "@/i18n/useTranslation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "@/lib/router-compat";

import {
  LayoutDashboard,
  Shield,
  AlertTriangle,
} from "lucide-react";

interface RiskComplianceModule {
  id: string;
  nameKey: string; // e.g., 'riskCompliance.dashboardModule'
  descriptionKey: string; // e.g., 'riskCompliance.dashboardModuleDesc'
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  status: 'active' | 'coming-soon' | 'under-development';
}

export function RiskComplianceLanding() {
  const { t, language } = useTranslation();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();

  const labels = {
    title: t.organizationModule?.riskCompliance || "Risk & Compliance",
    subtitle: t.riskCompliance?.subtitle || "Identify, assess, and mitigate organizational risks and track incidents",
    // Status badges
    active: t.organizationModule?.active || "Active",
    comingSoon: t.organizationModule?.comingSoon || "Coming Soon",
    // Tooltips
    clickToOpen: t.organizationModule?.clickToOpenModule || "Click to open module",
    underDevelopment: t.organizationModule?.moduleUnderDevelopment || "Module under development",
    moduleStatusLegend: t.organizationModule?.moduleStatusLegend || "Module Status Legend:",
    fullyFunctionalAndReadyToUse: t.organizationModule?.fullyFunctionalAndReadyToUse || "Fully functional and ready to use",
    comingSoonDescription: t.organizationModule?.comingSoon || "Module under development",
    underDevelopmentDescription: t.hr?.underDevelopment || "Module under development",
  };

  // Module definitions using translation keys
  const modules: RiskComplianceModule[] = [
    {
      id: 'dashboard',
      nameKey: 'riskCompliance.dashboardModule',
      descriptionKey: 'riskCompliance.dashboardModuleDesc',
      icon: LayoutDashboard,
      path: '/organization/risk-compliance/dashboard',
      status: 'active'
    },
    {
      id: 'risk-registry',
      nameKey: 'riskCompliance.riskRegistryModule',
      descriptionKey: 'riskCompliance.riskRegistryModuleDesc',
      icon: Shield,
      path: '/organization/risk-compliance/risk-registry',
      status: 'active'
    },
    {
      id: 'incident-log',
      nameKey: 'riskCompliance.incidentLogModule',
      descriptionKey: 'riskCompliance.incidentLogModuleDesc',
      icon: AlertTriangle,
      path: '/organization/risk-compliance/incident-log',
      status: 'active'
    },
  ];

  const handleModuleClick = (module: RiskComplianceModule) => {
    if (module.status === 'active') {
      navigate(module.path);
    }
  };

  /**
   * Helper function to resolve translation keys with proper fallback
   * Supports both simple keys (t.organizationModule.active) 
   * and nested keys (riskCompliance.dashboardModule)
   */
  const getTranslationValue = (keyPath: string): string => {
    try {
      // Split the key path by dots
      const keys = keyPath.split('.');
      
      // Start with the translation object
      let value: any = t;
      
      // Navigate through the nested structure
      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key];
        } else {
          // Key not found, return the key path as fallback
          console.warn(`Translation key not found: ${keyPath}`);
          return keyPath;
        }
      }
      
      // If we found a value, return it
      if (typeof value === 'string') {
        return value;
      }
      
      // If value is an object (shouldn't happen with proper keys), return key path
      console.warn(`Translation key resolved to non-string: ${keyPath}`);
      return keyPath;
    } catch (error) {
      console.error(`Error resolving translation key: ${keyPath}`, error);
      return keyPath;
    }
  };

  const getStatusBadge = (module: RiskComplianceModule) => {
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
      case 'under-development':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
            🔧 {labels.underDevelopment}
          </span>
        );
      default:
        return null;
    }
  };

  const getCardClasses = (module: RiskComplianceModule) => {
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
          // Resolve the translation keys to actual values
          const moduleName = getTranslationValue(module.nameKey);
          const moduleDescription = getTranslationValue(module.descriptionKey);

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
                <div
                  className={`p-3 rounded-lg ${
                    module.status === 'active'
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <div>{getStatusBadge(module)}</div>
              </div>

              {/* Module Name - Resolved from translation key */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2 text-start">
                {moduleName}
              </h3>

              {/* Module Description - Resolved from translation key */}
              <p className="text-sm text-gray-600 text-start">
                {moduleDescription}
              </p>

              {/* Active indicator */}
              {module.status === 'active' && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-sm text-emerald-600 font-medium">
                  <span>{labels.clickToOpen}</span>
                  {!isRTL && (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
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
              {labels.comingSoonDescription}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
              🔧 {t.organizationModule?.moduleUnderDevelopment || "Under Development"}
            </span>
            <span className="text-xs text-gray-600">
              {labels.underDevelopmentDescription}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RiskComplianceLanding;