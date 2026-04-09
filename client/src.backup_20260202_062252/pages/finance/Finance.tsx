import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OverviewTab from "@/components/finance/OverviewTab";
import ChartOfAccountsTab from "@/components/finance/ChartOfAccountsTab";
import BudgetsTab from "@/components/finance/BudgetsTab";
import ExpendituresTab from "@/components/finance/ExpendituresTab";
import ReportsTab from "@/components/finance/ReportsTab";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Finance Management Main Component
 * 
 * This is the main wrapper component that orchestrates all Finance Management tabs.
 * It provides a tabbed interface for accessing different financial management features.
 * 
 * Features:
 * - Tab-based navigation between 5 financial management modules
 * - Bilingual support (English/Arabic) with RTL/LTR switching
 * - Responsive layout
 * - Persistent tab state
 * 
 * File Path: /client/src/pages/Finance.tsx
 * 
 * Tab Components:
 * 1. Overview - Financial KPIs and budget utilization dashboard
 * 2. Chart of Accounts - Account hierarchy management with CRUD operations
 * 3. Budgets - Budget planning and tracking with line items
 * 4. Expenditures - Expenditure recording with receipt uploads and approval workflow
 * 5. Reports - Financial reports generation (PDF/Excel) for donor compliance
 * 
 * Usage:
 * import Finance from '@/pages/Finance';
 * <Route path="/finance" element={<Finance />} />
 */
export default function Finance() {
  const { t, i18n } = useTranslation();
  const { language } = useLanguage();
  
  // Sync react-i18next language with app's LanguageContext
  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);
  
  const isRTL = language === 'ar';

  return (
    <div className="container mx-auto py-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h1 className="text-3xl font-bold tracking-tight">{t('finance.financeManagement')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('finance.manageBudgetsExpenditures')}
          </p>
        </div>

        {/* Tabs Navigation */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className={`grid w-full grid-cols-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <TabsTrigger value="overview">{t('finance.overview')}</TabsTrigger>
            <TabsTrigger value="chart-of-accounts">{t('finance.chartOfAccounts')}</TabsTrigger>
            <TabsTrigger value="budgets">{t('finance.budgets')}</TabsTrigger>
            <TabsTrigger value="expenditures">{t('finance.expenditures')}</TabsTrigger>
            <TabsTrigger value="reports">{t('finance.reports')}</TabsTrigger>
          </TabsList>

          {/* Tab Contents */}
          <TabsContent value="overview">
            <OverviewTab />
          </TabsContent>

          <TabsContent value="chart-of-accounts">
            <ChartOfAccountsTab />
          </TabsContent>

          <TabsContent value="budgets">
            <BudgetsTab />
          </TabsContent>

          <TabsContent value="expenditures">
            <ExpendituresTab />
          </TabsContent>

          <TabsContent value="reports">
            <ReportsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
