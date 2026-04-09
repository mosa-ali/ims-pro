/**
 * ============================================================================
 * ADD INDICATOR - Form for creating new indicators
 * ============================================================================
 * 
 * Converted from Figma React Native (add-indicator.tsx) to Web React
 * Uses tRPC backend (no localStorage/mealService)
 * 
 * ============================================================================
 */
import { useState } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { Save, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function AddIndicator() {
 const { t } = useTranslation();
 const navigate = useNavigate();
 const { language, isRTL} = useLanguage();

 const [formData, setFormData] = useState({
 projectId: '',
 indicatorName: '',
 indicatorNameAr: '',
 type: 'OUTPUT',
 category: '',
 baseline: '',
 target: '',
 unit: 'units',
 verificationMethod: '',
 reportingFrequency: 'MONTHLY',
 });

 const [saving, setSaving] = useState(false);

 const labels = {
 backToIndicators: t.meal.backToIndicators,
 title: t.meal.addNewIndicator,
 subtitle: t.meal.defineANewIndicatorForTracking,
 selectProject: t.meal.selectProject,
 indicatorName: t.meal.indicatorNameEnglish,
 indicatorNameAr: t.meal.indicatorNameArabic,
 type: t.meal.indicatorType,
 output: t.meal.output,
 outcome: t.meal.outcome,
 impact: t.meal.impact,
 category: t.meal.categoryActivity,
 baseline: t.meal.baselineValue,
 target: t.meal.targetValue,
 unit: t.meal.unitOfMeasurement,
 verification: t.meal.sourceOfVerification,
 frequency: t.meal.reportingFrequency,
 monthly: t.meal.monthly,
 quarterly: t.meal.quarterly,
 annually: t.meal.annually,
 save: t.meal.saveIndicator,
 saving: t.meal.saving,
 comingSoon: t.meal.fullFormImplementationComingSoonBasic,
 };

 const { data: projects = [] } = trpc.projects.list.useQuery({});
 const utils = trpc.useUtils();

 const createMutation = trpc.indicators.create.useMutation({
 onSuccess: () => {
 // Invalidate all indicator caches for bidirectional sync
 utils.indicators.getByProject.invalidate();
 utils.indicators.getStatistics.invalidate();
 toast.success(t.meal.indicatorCreatedSuccessfully);
 navigate('/organization/meal/indicators');
 },
 onError: (error: any) => {
 toast.error(error.message);
 },
 });

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!formData.projectId || !formData.indicatorName || !formData.target) {
 toast.error(t.meal.pleaseFillInAllRequiredFields);
 return;
 }

 setSaving(true);
 try {
 await createMutation.mutateAsync({
 projectId: parseInt(formData.projectId),
 indicatorName: formData.indicatorName,
 indicatorNameAr: formData.indicatorNameAr || undefined,
 type: formData.type as any,
 category: formData.category || undefined,
 baseline: formData.baseline || '0',
 target: formData.target,
 unit: formData.unit,
 verificationMethod: formData.verificationMethod || undefined,
 reportingFrequency: formData.reportingFrequency as any,
 });
 } catch {
 // Error handled by mutation
 } finally {
 setSaving(false);
 }
 };

 const updateField = (field: string, value: string) => {
 setFormData(prev => ({ ...prev, [field]: value }));
 };

 return (
 <div className={`min-h-screen bg-background`}>
 <div className="max-w-3xl mx-auto px-4 py-6">
 {/* Back to Indicators */}
 <BackButton onClick={() => navigate('/organization/meal/indicators')} label={labels.backToIndicators} />

 {/* Header */}
 <div className="mb-6">
 <div className="flex items-center gap-3 mb-2">
 <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
 <Target className="h-5 w-5 text-blue-600" />
 </div>
 <div>
 <h1 className="text-2xl font-bold text-foreground">{labels.title}</h1>
 <p className="text-sm text-muted-foreground">{labels.subtitle}</p>
 </div>
 </div>
 </div>

 {/* Info Banner */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
 <p className="text-sm text-blue-700">{labels.comingSoon}</p>
 </div>

 {/* Form */}
 <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-5">
 {/* Project */}
 <div>
 <label className="block text-sm font-medium text-foreground mb-1.5">
 {labels.selectProject} <span className="text-red-500">*</span>
 </label>
 <select
 value={formData.projectId}
 onChange={(e) => updateField('projectId', e.target.value)}
 className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
 required
 >
 <option value="">{labels.selectProject}...</option>
 {projects.map((project: any) => (
 <option key={project.id} value={project.id}>
 {language === 'en' ? (project.title || project.titleEn) : (project.titleAr || project.title || project.titleEn)}
 </option>
 ))}
 </select>
 </div>

 {/* Indicator Name EN */}
 <div>
 <label className="block text-sm font-medium text-foreground mb-1.5">
 {labels.indicatorName} <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 value={formData.indicatorName}
 onChange={(e) => updateField('indicatorName', e.target.value)}
 className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
 required
 />
 </div>

 {/* Indicator Name AR */}
 <div>
 <label className="block text-sm font-medium text-foreground mb-1.5">{labels.indicatorNameAr}</label>
 <input
 type="text"
 value={formData.indicatorNameAr}
 onChange={(e) => updateField('indicatorNameAr', e.target.value)}
 className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
 dir="rtl"
 />
 </div>

 {/* Type */}
 <div>
 <label className="block text-sm font-medium text-foreground mb-1.5">{labels.type}</label>
 <select
 value={formData.type}
 onChange={(e) => updateField('type', e.target.value)}
 className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
 >
 <option value="OUTPUT">{labels.output}</option>
 <option value="OUTCOME">{labels.outcome}</option>
 <option value="IMPACT">{labels.impact}</option>
 </select>
 </div>

 {/* Category */}
 <div>
 <label className="block text-sm font-medium text-foreground mb-1.5">{labels.category}</label>
 <input
 type="text"
 value={formData.category}
 onChange={(e) => updateField('category', e.target.value)}
 className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
 />
 </div>

 {/* Baseline + Target Row */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-foreground mb-1.5">{labels.baseline}</label>
 <input
 type="number"
 value={formData.baseline}
 onChange={(e) => updateField('baseline', e.target.value)}
 className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-foreground mb-1.5">
 {labels.target} <span className="text-red-500">*</span>
 </label>
 <input
 type="number"
 value={formData.target}
 onChange={(e) => updateField('target', e.target.value)}
 className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
 required
 />
 </div>
 </div>

 {/* Unit */}
 <div>
 <label className="block text-sm font-medium text-foreground mb-1.5">{labels.unit}</label>
 <select
 value={formData.unit}
 onChange={(e) => updateField('unit', e.target.value)}
 className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
 >
 <option value="units">Units</option>
 <option value="percentage">Percentage (%)</option>
 <option value="people">People</option>
 <option value="households">Households</option>
 <option value="sessions">Sessions</option>
 <option value="reports">Reports</option>
 </select>
 </div>

 {/* Verification */}
 <div>
 <label className="block text-sm font-medium text-foreground mb-1.5">{labels.verification}</label>
 <input
 type="text"
 value={formData.verificationMethod}
 onChange={(e) => updateField('verificationMethod', e.target.value)}
 className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
 />
 </div>

 {/* Frequency */}
 <div>
 <label className="block text-sm font-medium text-foreground mb-1.5">{labels.frequency}</label>
 <select
 value={formData.reportingFrequency}
 onChange={(e) => updateField('reportingFrequency', e.target.value)}
 className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
 >
 <option value="MONTHLY">{labels.monthly}</option>
 <option value="QUARTERLY">{labels.quarterly}</option>
 <option value="ANNUALLY">{labels.annually}</option>
 </select>
 </div>

 {/* Submit */}
 <div className="pt-4 border-t border-border">
 <Button type="submit" disabled={saving} className="w-full gap-2">
 <Save className="h-4 w-4" />
 {saving ? labels.saving : labels.save}
 </Button>
 </div>
 </form>
 </div>
 </div>
 );
}
