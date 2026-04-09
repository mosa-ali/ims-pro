/**
 * Finance Coming Soon Page
 * 
 * Placeholder page for modules under development.
 * Shows a professional "Coming Soon" message.
 */
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "@/lib/router-compat";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";

interface FinanceComingSoonProps {
  moduleName: { en: string; ar: string };
  moduleDescription: { en: string; ar: string };
}

export default function FinanceComingSoon({ moduleName, moduleDescription }: FinanceComingSoonProps) {
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();

  const pageT = {
    backToFinance: language === 'en' ? 'Back to Finance' : 'العودة إلى المالية',
    comingSoon: language === 'en' ? 'Coming Soon' : 'قريباً',
    underDevelopment: language === 'en' 
      ? 'This module is currently under development and will be available in a future release.' 
      : 'هذه الوحدة قيد التطوير حالياً وستكون متاحة في إصدار مستقبلي.',
    stayTuned: language === 'en' 
      ? 'Stay tuned for updates!' 
      : 'ترقبوا التحديثات!',
  };

  return (
    <div className="container mx-auto py-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="space-y-6">
        {/* Page Header with Back Button */}
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
