import { useState } from 'react';
import { Save, Clock, AlertTriangle, Info } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/i18n/useTranslation';

export default function RetentionPolicyPage() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 // Fetch current retention policy
 const { data: currentPolicy, isLoading, refetch } = trpc.ims.retentionPolicy.get.useQuery();
 
 const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

 // Update mutation
 const updateMutation = trpc.ims.retentionPolicy.update.useMutation({
 onSuccess: () => {
 toast.success(t.retentionPolicyPage.successMessage);
 refetch();
 },
 onError: (error) => {
 toast.error(t.retentionPolicyPage.errorMessage + ': ' + error.message);
 },
 });

 const handleSave = () => {
 if (selectedPeriod === null) {
 toast.error(t.retentionPolicyPage.settingsModule.pleaseSelectARetentionPeriod);
 return;
 }

 const days = selectedPeriod === 'never' ? null : parseInt(selectedPeriod);
 updateMutation.mutate({ retentionPeriodDays: days });
 };

 const getCurrentPolicyDisplay = () => {
 if (!currentPolicy) return t.retentionPolicyPage.never;
 if (currentPolicy.retentionPeriodDays === null) return t.retentionPolicyPage.never;
 
 switch (currentPolicy.retentionPeriodDays) {
 case 30: return t.retentionPolicyPage.days30;
 case 60: return t.retentionPolicyPage.days60;
 case 90: return t.retentionPolicyPage.days90;
 case 365: return t.retentionPolicyPage.days365;
 default: return `${currentPolicy.retentionPeriodDays} ${t.retentionPolicyPage.settingsModule.days}`;
 }
 };

 if (isLoading) {
 return (
 <div className="flex items-center justify-center h-screen" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
 </div>
 );
 }

 return (
 <div className={`min-h-screen bg-gray-50 p-6`}>
 <div className="max-w-4xl mx-auto">
 {/* Header */}
 <div className="mb-6">
 <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.retentionPolicyPage.title}</h1>
 <p className="text-gray-600">{t.retentionPolicyPage.subtitle}</p>
 </div>

 {/* Main Card */}
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Clock className="w-5 h-5 text-blue-600" />
 {t.retentionPolicyPage.currentPolicy}
 </CardTitle>
 <CardDescription>{t.retentionPolicyPage.description}</CardDescription>
 </CardHeader>
 <CardContent className="space-y-6">
 {/* Current Policy Display */}
 <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
 <div className="flex items-center gap-2 mb-2">
 <Info className="w-5 h-5 text-blue-600" />
 <span className="font-semibold text-blue-900">{t.retentionPolicyPage.currentPolicy}:</span>
 </div>
 <p className="text-2xl font-bold text-blue-900">{getCurrentPolicyDisplay()}</p>
 </div>

 {/* Retention Period Selector */}
 <div className="space-y-2">
 <Label htmlFor="retention-period" className="text-base font-semibold">
 {t.retentionPolicyPage.selectPeriod}
 </Label>
 <Select
 value={selectedPeriod || undefined}
 onValueChange={setSelectedPeriod}
 >
 <SelectTrigger id="retention-period" className="w-full">
 <SelectValue placeholder={t.retentionPolicyPage.selectPeriod} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="30">{t.retentionPolicyPage.days30}</SelectItem>
 <SelectItem value="60">{t.retentionPolicyPage.days60}</SelectItem>
 <SelectItem value="90">{t.retentionPolicyPage.days90}</SelectItem>
 <SelectItem value="365">{t.retentionPolicyPage.days365}</SelectItem>
 <SelectItem value="never">{t.retentionPolicyPage.never}</SelectItem>
 </SelectContent>
 </Select>
 </div>

 {/* Warning Box */}
 <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg">
 <div className="flex items-start gap-3">
 <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
 <div>
 <h3 className="font-semibold text-amber-900 mb-1">{t.retentionPolicyPage.warningTitle}</h3>
 <p className="text-sm text-amber-800 mb-2">{t.retentionPolicyPage.warningText}</p>
 <p className="text-sm text-amber-700">{t.retentionPolicyPage.notificationInfo}</p>
 </div>
 </div>
 </div>

 {/* Save Button */}
 <Button
 onClick={handleSave}
 disabled={updateMutation.isPending || selectedPeriod === null}
 className="w-full"
 size="lg"
 >
 <Save className={`w-4 h-4 me-2`} />
 {updateMutation.isPending ? t.retentionPolicyPage.saving : t.retentionPolicyPage.save}
 </Button>
 </CardContent>
 </Card>
 </div>
 </div>
 );
}
