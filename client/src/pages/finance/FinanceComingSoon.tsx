/**
 * Finance Coming Soon Page
 * 
 * Placeholder page for modules under development.
 * Shows a professional"Coming Soon" message.
 */
import { useLanguage } from"@/contexts/LanguageContext";
import { useNavigate } from"@/lib/router-compat";
import { Button } from"@/components/ui/button";
import { Card, CardContent } from"@/components/ui/card";
import { Clock } from"lucide-react";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

interface FinanceComingSoonProps {
 moduleName: { en: string; ar: string };
 moduleDescription: { en: string; ar: string };
}

export default function FinanceComingSoon({
 moduleName, moduleDescription }: FinanceComingSoonProps) {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const navigate = useNavigate();

 const pageT = {
 backToFinance: t.financeModule.backToFinance,
 comingSoon: t.financeModule.comingSoon,
 underDevelopment: 'This module is currently under development and will be available in a future release.',
 stayTuned: 'Stay tuned for updates!',
 };

 return (
 <div className="container mx-auto py-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="space-y-6">
 {/* Page Header with Back Button */}
 <div className="text-start">
 <BackButton onClick={() => navigate('/organization/finance')} label={pageT.backToFinance} />
 <h1 className="text-3xl font-bold tracking-tight">{moduleName[language]}</h1>
 <p className="text-muted-foreground mt-2">{moduleDescription[language]}</p>
 </div>

 {/* Coming Soon Card */}
 <Card className="max-w-2xl mx-auto">
 <CardContent className="pt-12 pb-12">
 <div className="flex flex-col items-center text-center space-y-6">
 <div className="p-4 bg-yellow-100 rounded-full">
 <Clock className="w-12 h-12 text-yellow-600" />
 </div>
 
 <div className="space-y-2">
 <h2 className="text-2xl font-bold text-gray-900">
 {pageT.comingSoon}
 </h2>
 <p className="text-gray-600 max-w-md">
 {pageT.underDevelopment}
 </p>
 <p className="text-emerald-600 font-medium">
 {pageT.stayTuned}
 </p>
 </div>

 <Button 
 onClick={() => navigate('/organization/finance')}
 className="mt-4"
 >
 {pageT.backToFinance}
 </Button>
 </div>
 </CardContent>
 </Card>
 </div>
 </div>
 );
}
