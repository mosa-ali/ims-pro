/**
 * ============================================================================
 * INDICATORS LIST - Project-Specific View
 * ============================================================================
 * 
 * Converted from Figma React Native (indicators-list.tsx) to Web React
 * Project-specific indicators list with filtering and CRUD
 * Uses tRPC backend (no localStorage)
 * 
 * ============================================================================
 */
import { useState, useMemo } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { Plus, Target, Filter, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function IndicatorsList() {
 const { t } = useTranslation();
 const navigate = useNavigate();
 const { language, isRTL} = useLanguage();

 const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
 const [statusFilter, setStatusFilter] = useState<string>('All');

 const labels = {
 backToMeal: t.meal.backToMeal19,
 title: t.meal.indicatorsList,
 subtitle: t.meal.viewAndManageProjectIndicatorsWith,
 selectProject: t.meal.selectProject,
 addNew: t.meal.addIndicator,
 all: t.meal.all,
 achieved: t.meal.achieved16,
 onTrack: t.meal.onTrack,
 atRisk: t.meal.atRisk,
 offTrack: t.meal.offTrack,
 baseline: t.meal.baseline,
 target: t.meal.target,
 achievedVal: t.meal.achieved,
 unit: t.meal.unit,
 progress: t.meal.achievementProgress,
 update: t.meal.update,
 noIndicators: t.meal.noIndicatorsMatchTheSelectedFilters,
 noProject: t.meal.pleaseSelectAProjectToView,
 male: t.meal.male10,
 female: t.meal.female11,
 boys: t.meal.boys,
 girls: t.meal.girls,
 reportingFrequency: t.meal.reportingFrequency,
 sourceOfVerification: t.meal.sourceOfVerification,
 status: t.meal.status,
 loading: t.meal.loading,
 };

 const { data: projects = [] } = trpc.projects.list.useQuery({});
 const { data: indicators = [], isLoading } = trpc.indicators.getByProject.useQuery(
 { projectId: selectedProjectId! },
 { enabled: !!selectedProjectId }
 );

 const filteredIndicators = useMemo(() => {
 let result = [...indicators];
 if (statusFilter !== 'All') {
 result = result.filter((ind: any) => ind.status === statusFilter);
 }
 return result;
 }, [indicators, statusFilter]);

 const getStatusColor = (status: string) => {
 switch (status) {
 case 'ACHIEVED': return { bg: 'bg-green-100', text: 'text-green-700' };
 case 'ON_TRACK': return { bg: 'bg-blue-100', text: 'text-blue-700' };
 case 'AT_RISK': return { bg: 'bg-orange-100', text: 'text-orange-700' };
 case 'OFF_TRACK': return { bg: 'bg-red-100', text: 'text-red-700' };
 default: return { bg: 'bg-gray-100', text: 'text-gray-700' };
 }
 };

 const getStatusLabel = (status: string) => {
 switch (status) {
 case 'ACHIEVED': return labels.achieved;
 case 'ON_TRACK': return labels.onTrack;
 case 'AT_RISK': return labels.atRisk;
 case 'OFF_TRACK': return labels.offTrack;
 default: return status;
 }
 };

 return (
 <div className={`min-h-screen bg-background`} dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="max-w-7xl mx-auto px-4 py-6">
 {/* Back to MEAL */}
 <BackButton onClick={() => navigate('/organization/meal')} label={labels.backToMeal} />

 {/* Header */}
 <div className="flex items-center justify-between mb-6">
 <div>
 <h1 className="text-2xl font-bold text-foreground">{labels.title}</h1>
 <p className="text-sm text-muted-foreground mt-1">{labels.subtitle}</p>
 </div>
 {selectedProjectId && (
 <Button onClick={() => navigate('/organization/meal/indicators/add')} className="gap-2">
 <Plus className="h-4 w-4" />
 {labels.addNew}
 </Button>
 )}
 </div>

 {/* Project Selector */}
 <div className="mb-6">
 <label className="block text-sm font-medium text-foreground mb-2">{labels.selectProject}</label>
 <select
 value={selectedProjectId || ''}
 onChange={(e) => {
 const val = e.target.value;
 setSelectedProjectId(val ? parseInt(val) : null);
 setStatusFilter('All');
 }}
 className="w-full max-w-md px-4 py-2.5 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
 >
 <option value="">{labels.selectProject}...</option>
 {projects.map((project: any) => (
 <option key={project.id} value={project.id}>
 {language === 'en' ? (project.title || project.titleEn) : (project.titleAr || project.title || project.titleEn)}
 </option>
 ))}
 </select>
 </div>

 {/* Status Filters */}
 {selectedProjectId && (
 <div className="flex flex-wrap items-center gap-3 mb-6">
 <Filter className="h-4 w-4 text-muted-foreground" />
 <span className="text-sm font-medium text-foreground">{labels.status}:</span>
 {['All', 'ON_TRACK', 'AT_RISK', 'OFF_TRACK', 'ACHIEVED'].map(s => (
 <button
 key={s}
 onClick={() => setStatusFilter(s)}
 className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${ statusFilter === s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80' }`}
 >
 {s === 'All' ? labels.all : getStatusLabel(s)}
 </button>
 ))}
 </div>
 )}

 {/* Indicators */}
 {selectedProjectId ? (
 <div className="bg-card border border-border rounded-xl">
 {isLoading ? (
 <div className="p-8 text-center">
 <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
 <p className="text-sm text-muted-foreground">{labels.loading}</p>
 </div>
 ) : filteredIndicators.length === 0 ? (
 <div className="p-8 text-center">
 <Target className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
 <p className="text-sm text-muted-foreground">{labels.noIndicators}</p>
 </div>
 ) : (
 <div className="divide-y divide-border">
 {filteredIndicators.map((indicator: any) => {
 const targetVal = parseFloat(indicator.target) || 0;
 const achievedVal = parseFloat(indicator.achievedValue) || 0;
 const progressPercent = targetVal > 0 ? (achievedVal / targetVal) * 100 : 0;
 const barColor = progressPercent >= 80 ? '#10B981' : progressPercent >= 50 ? '#F59E0B' : '#EF4444';
 const statusStyle = getStatusColor(indicator.status);

 return (
 <div key={indicator.id} className="p-5">
 {/* Header */}
 <div className="flex items-center justify-between mb-2">
 <h3 className="text-base font-bold text-foreground flex-1">
 {language === 'en' ? indicator.indicatorName : (indicator.indicatorNameAr || indicator.indicatorName)}
 </h3>
 <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
 {getStatusLabel(indicator.status)}
 </span>
 </div>

 {/* Metrics */}
 <div className="flex flex-wrap gap-6 mb-3">
 <div>
 <p className="text-xs text-muted-foreground">{labels.baseline}</p>
 <p className="text-sm font-semibold text-foreground">{indicator.baseline || '0'}</p>
 </div>
 <div>
 <p className="text-xs text-muted-foreground">{labels.target}</p>
 <p className="text-sm font-semibold text-foreground">{indicator.target || '0'}</p>
 </div>
 <div>
 <p className="text-xs text-muted-foreground">{labels.achievedVal}</p>
 <p className="text-sm font-semibold text-foreground">{indicator.achievedValue || '0'}</p>
 </div>
 <div>
 <p className="text-xs text-muted-foreground">{labels.unit}</p>
 <p className="text-sm font-semibold text-foreground">{indicator.unit || 'N/A'}</p>
 </div>
 </div>

 {/* Progress Bar */}
 <div className="mb-3">
 <div className="flex items-center justify-between mb-1">
 <span className="text-xs text-muted-foreground">{labels.progress}</span>
 <span className="text-xs font-semibold" style={{ color: barColor }}>
 {Math.round(progressPercent)}%
 </span>
 </div>
 <div className="h-2 bg-muted rounded-full overflow-hidden">
 <div
 className="h-full rounded-full transition-all duration-500"
 style={{
 width: `${Math.min(progressPercent, 100)}%`,
 backgroundColor: barColor,
 }}
 />
 </div>
 </div>

 {/* Verification */}
 {indicator.verificationMethod && (
 <p className="text-xs text-muted-foreground mb-3">
 {labels.sourceOfVerification}: <span className="font-medium text-foreground">{indicator.verificationMethod}</span>
 </p>
 )}

 {/* Update Button */}
 <div className="flex gap-2">
 <Button
 size="sm"
 onClick={() => navigate(`/organization/meal/indicators/${indicator.id}/data-entry`)}
 className="gap-1"
 >
 <Edit className="h-3 w-3" />
 {labels.update}
 </Button>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 ) : (
 <div className="bg-card border border-border rounded-xl p-12 text-center">
 <Target className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
 <p className="text-muted-foreground">{labels.noProject}</p>
 </div>
 )}
 </div>
 </div>
 );
}
