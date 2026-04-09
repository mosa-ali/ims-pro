/**
 * Finance Overview Page
 * 
 * Standalone page for Financial Overview dashboard.
 * Accessed from Finance Landing cards grid.
 */
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "@/lib/router-compat";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Download, Upload } from "lucide-react";
import OverviewTab from "@/components/finance/OverviewTab";

export default function FinanceOverview() {
  const { t, i18n } = useTranslation();
  const { language } = useLanguage();
  const navigate = useNavigate();
  
  // Sync react-i18next language with app's LanguageContext
  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);
  
  const isRTL = language === 'ar';

  const pageT = {
    title: language === 'en' ? 'Financial Overview' : 'نظرة عامة مالية',
    subtitle: language === 'en' 
      ? 'High-level financial dashboard with budgets, expenditures, and variance' 
      : 'لوحة تحكم مالية عالية المستوى مع الميزانيات والنفقات والفروقات',
    backToFinance: language === 'en' ? 'Back to Finance' : 'العودة إلى المالية',
    import: language === 'en' ? 'Import' : 'استيراد',
    export: language === 'en' ? 'Export' : 'تصدير',
  };

  return (
    <div className="container mx-auto py-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="space-y-6">
        {/* Page Header with Back Button */}
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <Button 
              variant="ghost" 
              onClick={() => navigate('/organization/finance')}
              className={`mb-2 -ml-2 ${isRTL ? '-mr-2 ml-0' : ''}`}
            >
              {isRTL ? (
                <>
                  {pageT.backToFinance}
                  <ArrowRight className="w-4 h-4 mr-2" />
                </>
              ) : (
                <>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {pageT.backToFinance}
                </>
              )}
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">{pageT.title}</h1>
            <p className="text-muted-foreground mt-2">{pageT.subtitle}</p>
          </div>
          
          {/* Import/Export Buttons */}
          <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button variant="outline" className="gap-2">
              <Upload className="w-4 h-4" />
              {pageT.import}
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              {pageT.export}
            </Button>
          </div>
        </div>

        {/* Overview Content */}
        <OverviewTab />
      </div>
    </div>
  );
}
