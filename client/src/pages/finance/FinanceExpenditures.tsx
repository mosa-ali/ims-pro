/**
 * Finance Expenditures Page
 * 
 * Standalone page for Expenditures management.
 * Accessed from Finance Landing cards grid.
 */
import { useEffect } from"react";
import { useLanguage } from"@/contexts/LanguageContext";
import { useNavigate } from"@/lib/router-compat";
import { Button } from"@/components/ui/button";
import { Download, Upload } from"lucide-react";
import ExpendituresTab from"@/components/finance/ExpendituresTab";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export default function FinanceExpenditures() {
  const { t } = useTranslation();
const { language, isRTL} = useLanguage();
 const navigate = useNavigate();
 

 const pageT = {
 title: t.financeModule.expenditures31,
 subtitle: t.financeModule.expendituresSubtitle,
 backToFinance: t.financeModule.backToFinance,
 import: t.financeModule.import,
 export: t.financeModule.export,
 };

 return (
 <div className="container mx-auto py-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="space-y-6">
 {/* Page Header with Back Button */}
 <div className="flex items-center justify-between">
 <div className="text-start">
 <BackButton onClick={() => navigate('/organization/finance')} label={pageT.backToFinance} />
 <h1 className="text-3xl font-bold tracking-tight">{pageT.title}</h1>
 <p className="text-muted-foreground mt-2">{pageT.subtitle}</p>
 </div>
 
 {/* Import/Export Buttons */}
 <div className="flex gap-2">
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

 {/* Expenditures Content */}
 <ExpendituresTab />
 </div>
 </div>
 );
}
