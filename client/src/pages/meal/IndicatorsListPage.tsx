/**
 * ============================================================================
 * INDICATORS TRACKING - Main Dashboard
 * ============================================================================
 * 
 * Main dashboard for indicators tracking with project filtering.
 * Update data entry is now a modal card overlay instead of a separate page.
 * 
 * FEATURES:
 * - Project selector dropdown
 * - KPI summary cards (Total, Achieved, On Track, At Risk, Off Track)
 * - Filter by status
 * - Indicator cards with progress bars
 * - Navigate to indicator details
 * - Inline Update modal card for data entry
 * - Sync Data button
 * - Bilingual support (EN/AR) with RTL
 * - Back to MEAL navigation
 * 
 * ============================================================================
 */
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { Target, TrendingUp, CheckCircle, Clock, BarChart3, ChevronRight, Activity, Filter, RefreshCw, X, Save, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

// Beneficiary-related unit types that require disaggregated data
const BENEFICIARY_UNITS = [
 'families', 'family',
 'household', 'households', 'hhs', 'hh',
 'individual', 'individuals', 'person', 'persons', 'people',
 'teacher', 'teachers',
 'student', 'students',
 'child', 'children',
 'beneficiary', 'beneficiaries',
 'participant', 'participants',
 'woman', 'women', 'man', 'men',
 'boy', 'boys', 'girl', 'girls',
 'youth', 'farmer', 'farmers',
 'caregiver', 'caregivers',
 'patient', 'patients',
 'refugee', 'refugees',
 'idp', 'idps',
 // Arabic equivalents
 'أسر', 'عائلات', 'عائلة',
 'أفراد', 'فرد', 'شخص', 'أشخاص',
 'معلم', 'معلمين', 'معلمات',
 'طالب', 'طلاب', 'طالبات',
 'طفل', 'أطفال',
 'مستفيد', 'مستفيدين', 'مستفيدات',
 'مشارك', 'مشاركين', 'مشاركات',
];

function isBeneficiaryUnit(unit: string): boolean {
 if (!unit) return false;
 const normalized = unit.toLowerCase().trim();
 return BENEFICIARY_UNITS.some(bu => normalized.includes(bu));
}

export function IndicatorsListPage() {
 const { t } = useTranslation();
 const navigate = useNavigate();
 const { language, isRTL} = useLanguage();

 const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
 const [statusFilter, setStatusFilter] = useState<string>('All');
 const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
 const utils = trpc.useUtils();

 // ---- Update Modal State ----
 const [updateModalOpen, setUpdateModalOpen] = useState(false);
 const [updateIndicator, setUpdateIndicator] = useState<any>(null);
 const [reportingDate, setReportingDate] = useState('');
 const [achievedValue, setAchievedValue] = useState('');
 const [notes, setNotes] = useState('');
 const [male, setMale] = useState('');
 const [female, setFemale] = useState('');
 const [ageGroup0_5, setAgeGroup0_5] = useState('');
 const [ageGroup6_17, setAgeGroup6_17] = useState('');
 const [ageGroup18_59, setAgeGroup18_59] = useState('');
 const [ageGroup60Plus, setAgeGroup60Plus] = useState('');
 const [pwd, setPwd] = useState('');
 const [nonPwd, setNonPwd] = useState('');
 const [formError, setFormError] = useState('');
 const [formSuccess, setFormSuccess] = useState('');

 const labels = {
 backToMeal: t.meal.backToMeal19,
 title: t.meal.indicatorsTracking,
 subtitle: t.meal.monitorProjectPerformanceThroughIndicatorDashboards,
 selectProject: t.meal.selectProject,
 totalIndicators: t.meal.totalIndicators,
 achieved: t.meal.achieved16,
 onTrack: t.meal.onTrack,
 atRisk: t.meal.atRisk,
 offTrack: t.meal.offTrack,
 status: t.meal.status,
 all: t.meal.all,
 noProject: t.meal.pleaseSelectAProjectToView,
 baseline: t.meal.baseline,
 target: t.meal.target,
 achievedVal: t.meal.achieved,
 unit: t.meal.unit,
 progress: t.meal.achievementProgress,
 update: t.meal.update,
 viewDetails: t.meal.viewDetails,
 noIndicators: t.meal.noIndicatorsMatchTheSelectedFilters,
 sourceOfVerification: t.meal.sourceOfVerification,
 indicatorType: t.meal.type13,
 output: t.meal.output,
 outcome: t.meal.outcome,
 impact: t.meal.impact,
 loading: t.meal.loadingIndicators,
 syncData: t.meal.syncData,
 dataVerification: t.meal.dataVerification,
 bulkImport: t.meal.bulkImport,
 syncing: t.meal.syncing,
 syncSuccess: t.meal.dataSyncedSuccessfully,
 syncError: t.meal.failedToSyncData,
 // Modal translations
 updateDataEntry: t.meal.updateIndicatorData,
 reportingDate: t.meal.reportingDate,
 targetValue: t.meal.targetValue,
 achievedValueLabel: t.meal.achievedValue,
 achievedPlaceholder: t.meal.enterAchievedValue,
 unitType: t.meal.unitType,
 disaggregation: t.meal.disaggregatedData,
 disaggregationNote: t.meal.requiredForBeneficiarytypeIndicators,
 gender: t.meal.genderDisaggregation,
 maleLabel: t.meal.male,
 femaleLabel: t.meal.female,
 age: t.meal.ageDisaggregation,
 age0_5: t.meal.k05Years,
 age6_17: t.meal.k617Years,
 age18_59: t.meal.k1859Years,
 age60Plus: t.meal.k60Years,
 disability: t.meal.disabilityDisaggregation,
 pwdLabel: t.meal.personsWithDisabilities,
 nonPwdLabel: t.meal.personsWithoutDisabilities,
 notesLabel: t.meal.notesOptional,
 notesPlaceholder: t.meal.addAnyRelevantNotesOrComments,
 saveData: t.meal.saveData,
 cancel: t.meal.cancel,
 saving: t.meal.saving,
 dateRequired: t.meal.pleaseSelectAReportingDate,
 valueRequired: t.meal.pleaseEnterAnAchievedValue,
 saveError: t.meal.failedToSaveData,
 dataCreated: t.meal.dataEntrySavedSuccessfully,
 };

 // Fetch projects
 const { data: projects = [] } = trpc.projects.list.useQuery({});

 // Fetch indicators for selected project
 const { data: indicators = [], isLoading: indicatorsLoading } = trpc.indicators.getByProject.useQuery(
 { projectId: selectedProjectId! },
 { enabled: !!selectedProjectId }
 );

 // Sync mutation
 const syncMutation = trpc.mealIndicatorData.syncFromProject.useMutation({
 onSuccess: (data) => {
 setSyncMessage({ type: 'success', text: `${labels.syncSuccess} (${data.synced}/${data.total})` });
 utils.indicators.getByProject.invalidate();
 utils.indicators.getStatistics.invalidate();
 setTimeout(() => setSyncMessage(null), 4000);
 },
 onError: () => {
 setSyncMessage({ type: 'error', text: labels.syncError });
 setTimeout(() => setSyncMessage(null), 4000);
 },
 });

 // Create data entry mutation
 const createMutation = trpc.mealIndicatorData.create.useMutation({
 onSuccess: () => {
 setFormSuccess(labels.dataCreated);
 setFormError('');
 utils.mealIndicatorData.getByIndicator.invalidate();
 utils.mealIndicatorData.getByProject.invalidate();
 utils.mealIndicatorData.getStatistics.invalidate();
 utils.mealIndicatorData.getCumulativeProgress.invalidate();
 utils.indicators.getByProject.invalidate();
 utils.indicators.getStatistics.invalidate();
 setTimeout(() => {
 closeUpdateModal();
 }, 1500);
 },
 onError: (err: any) => {
 setFormError(err.message || labels.saveError);
 },
 });

 // Filter indicators
 const filteredIndicators = useMemo(() => {
 let result = [...indicators];
 if (statusFilter === 'ON_TRACK') {
 result = result.filter((ind: any) => getProgress(ind) >= 75);
 } else if (statusFilter === 'AT_RISK') {
 result = result.filter((ind: any) => getProgress(ind) < 50);
 }
 return result;
 }, [indicators, statusFilter]);

 // Calculate progress percentage (same logic as Project Indicators tab)
 const getProgress = (indicator: any) => {
 const target = parseFloat(indicator.target) || 0;
 const baseline = parseFloat(indicator.baseline) || 0;
 const achieved = parseFloat(indicator.achievedValue) || 0;
 if (target === baseline) return 0;
 const progress = ((achieved - baseline) / (target - baseline)) * 100;
 return Math.min(Math.max(progress, 0), 100);
 };

 // Derive status from progress (same thresholds as Project Indicators tab)
 const getDerivedStatus = (indicator: any) => {
 const progress = getProgress(indicator);
 if (progress >= 100) return 'ACHIEVED';
 if (progress >= 75) return 'ON_TRACK';
 if (progress >= 50) return 'AT_RISK';
 return 'OFF_TRACK';
 };

 // KPI calculations - EXACTLY matching Project Indicators tab (4 cards: Total, On Track ≥75%, At Risk <50%, Avg Progress)
 const kpis = useMemo(() => {
 const total = indicators.length;
 const onTrack = indicators.filter((i: any) => getProgress(i) >= 75).length;
 const atRisk = indicators.filter((i: any) => getProgress(i) < 50).length;
 const avgProgress = total > 0 
 ? (indicators.reduce((sum: number, i: any) => sum + getProgress(i), 0) / total).toFixed(1)
 : '0';
 return { total, onTrack, atRisk, avgProgress };
 }, [indicators]);

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

 const getTypeLabel = (type: string) => {
 switch (type) {
 case 'OUTPUT': return labels.output;
 case 'OUTCOME': return labels.outcome;
 case 'IMPACT': return labels.impact;
 default: return type;
 }
 };

 // ---- Modal Helpers ----
 const openUpdateModal = (indicator: any) => {
 setUpdateIndicator(indicator);
 setReportingDate('');
 setAchievedValue('');
 setNotes('');
 setMale('');
 setFemale('');
 setAgeGroup0_5('');
 setAgeGroup6_17('');
 setAgeGroup18_59('');
 setAgeGroup60Plus('');
 setPwd('');
 setNonPwd('');
 setFormError('');
 setFormSuccess('');
 setUpdateModalOpen(true);
 };

 const closeUpdateModal = () => {
 setUpdateModalOpen(false);
 setUpdateIndicator(null);
 setFormError('');
 setFormSuccess('');
 };

 const handleUpdateSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 setFormError('');
 setFormSuccess('');

 if (!reportingDate) {
 setFormError(labels.dateRequired);
 return;
 }
 if (!achievedValue.trim() || parseFloat(achievedValue) < 0) {
 setFormError(labels.valueRequired);
 return;
 }

 const showDisagg = updateIndicator ? isBeneficiaryUnit(updateIndicator.unit || '') : false;

 // Build disaggregation JSON
 const disaggregation: any = {};
 if (showDisagg) {
 if (male || female) {
 disaggregation.male = parseFloat(male) || 0;
 disaggregation.female = parseFloat(female) || 0;
 }
 if (ageGroup0_5 || ageGroup6_17 || ageGroup18_59 || ageGroup60Plus) {
 disaggregation.ageGroups = {
 '0-5': parseFloat(ageGroup0_5) || 0,
 '6-17': parseFloat(ageGroup6_17) || 0,
 '18-59': parseFloat(ageGroup18_59) || 0,
 '60+': parseFloat(ageGroup60Plus) || 0,
 };
 }
 if (pwd || nonPwd) {
 disaggregation.disability = {
 pwd: parseFloat(pwd) || 0,
 nonPwd: parseFloat(nonPwd) || 0,
 };
 }
 }

 // Convert date to period format
 const dateObj = new Date(reportingDate);
 const year = dateObj.getFullYear();
 const month = dateObj.getMonth() + 1;
 const reportingPeriod = `${year}-${String(month).padStart(2, '0')}`;
 const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
 const lastDay = new Date(year, month, 0).getDate();
 const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

 createMutation.mutate({
 indicatorId: updateIndicator.id,
 reportingPeriod,
 periodStartDate: startDate,
 periodEndDate: endDate,
 achievedValue: parseFloat(achievedValue).toFixed(2),
 disaggregation: Object.keys(disaggregation).length > 0 ? disaggregation : undefined,
 notes: notes.trim() || undefined,
 });
 };

 const showDisaggregation = updateIndicator ? isBeneficiaryUnit(updateIndicator.unit || '') : false;

 return (
 <div className={`min-h-screen bg-background`} dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="max-w-7xl mx-auto px-4 py-6">
 {/* Back to MEAL */}
 <BackButton onClick={() => navigate('/organization/meal')} label={labels.backToMeal} />

 {/* Header */}
 <div className="flex items-start justify-between mb-6">
 <div>
 <h1 className="text-2xl font-bold text-foreground">{labels.title}</h1>
 <p className="text-sm text-muted-foreground mt-1">{labels.subtitle}</p>
 </div>
 <div className="flex items-center gap-2 flex-wrap">
 <Button
 variant="outline"
 className="gap-2"
 onClick={() => navigate('/organization/meal/indicators/data-verification')}
 >
 <CheckCircle className="h-4 w-4" />
 {labels.dataVerification}
 </Button>
 <Button
 variant="outline"
 className="gap-2"
 onClick={() => navigate('/organization/meal/indicators/bulk-import')}
 >
 <BarChart3 className="h-4 w-4" />
 {labels.bulkImport}
 </Button>
 {selectedProjectId && (
 <Button
 variant="outline"
 className="gap-2"
 disabled={syncMutation.isPending}
 onClick={() => syncMutation.mutate({ projectId: selectedProjectId })}
 >
 <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
 {syncMutation.isPending ? labels.syncing : labels.syncData}
 </Button>
 )}
 </div>
 </div>

 {/* Sync Message */}
 {syncMessage && (
 <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${ syncMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200' }`}>
 {syncMessage.text}
 </div>
 )}

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

 {/* KPI Cards - Matching Project Indicators tab exactly (4 cards) */}
 {selectedProjectId && (
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
 <div className="bg-card border border-border rounded-xl p-4">
 <div className="flex items-center gap-2 mb-2">
 <Target className="w-5 h-5 text-blue-600" />
 <div className="text-sm text-muted-foreground text-start">{labels.totalIndicators}</div>
 </div>
 <div className="ltr-safe text-2xl font-bold text-foreground">{kpis.total}</div>
 </div>
 <div className="bg-card border border-border rounded-xl p-4">
 <div className="flex items-center gap-2 mb-2">
 <TrendingUp className="w-5 h-5 text-green-600" />
 <div className="text-sm text-muted-foreground text-start">{labels.onTrack}</div>
 </div>
 <div className="ltr-safe text-2xl font-bold text-green-600">{kpis.onTrack}</div>
 </div>
 <div className="bg-card border border-border rounded-xl p-4">
 <div className="flex items-center gap-2 mb-2">
 <Activity className="w-5 h-5 text-orange-600" />
 <div className="text-sm text-muted-foreground text-start">{labels.atRisk}</div>
 </div>
 <div className="ltr-safe text-2xl font-bold text-orange-600">{kpis.atRisk}</div>
 </div>
 <div className="bg-card border border-border rounded-xl p-4">
 <div className="flex items-center gap-2 mb-2">
 <Clock className="w-5 h-5 text-purple-600" />
 <div className="text-sm text-muted-foreground text-start">{(t as any).avgProgress || 'Avg. Progress'}</div>
 </div>
 <div className="ltr-safe text-2xl font-bold text-foreground">{kpis.avgProgress}%</div>
 </div>
 </div>
 )}

 {/* Status Filters */}
 {selectedProjectId && (
 <div className="flex flex-wrap items-center gap-3 mb-6">
 <Filter className="h-4 w-4 text-muted-foreground" />
 <span className="text-sm font-medium text-foreground">{labels.status}:</span>
 {['All', 'ON_TRACK', 'AT_RISK'].map(s => (
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

 {/* Indicators List */}
 {selectedProjectId ? (
 <div className="bg-card border border-border rounded-xl">
 {indicatorsLoading ? (
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
 const indicatorProgress = getProgress(indicator);
 const progressStatus = indicatorProgress >= 75 ? 'ON_TRACK' : indicatorProgress < 50 ? 'AT_RISK' : 'MODERATE';
 const statusStyle = progressStatus === 'ON_TRACK' 
 ? { bg: 'bg-green-100', text: 'text-green-700' }
 : progressStatus === 'AT_RISK'
 ? { bg: 'bg-orange-100', text: 'text-orange-700' }
 : { bg: 'bg-blue-100', text: 'text-blue-700' };
 const statusLabel = progressStatus === 'ON_TRACK' 
 ? labels.onTrack 
 : progressStatus === 'AT_RISK'
 ? labels.atRisk
 : (t as any).moderate || 'Moderate';

 return (
 <div key={indicator.id} className="p-5 hover:bg-muted/30 transition-colors">
 {/* Header Row */}
 <div className="flex items-center justify-between mb-2">
 <h3 className="text-base font-bold text-foreground flex-1">
 {language === 'en' ? indicator.indicatorName : (indicator.indicatorNameAr || indicator.indicatorName)}
 </h3>
 <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
 {statusLabel}
 </span>
 </div>

 {/* Type Badge */}
 <div className="flex items-center gap-3 mb-3">
 <span className="text-xs text-muted-foreground">
 {labels.indicatorType}: <span className="font-semibold text-foreground">{getTypeLabel(indicator.type)}</span>
 </span>
 {indicator.category && (
 <span className="text-xs text-muted-foreground">
 | {indicator.category}
 </span>
 )}
 </div>

 {/* Metrics Row */}
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

 {/* Verification Source */}
 {indicator.verificationMethod && (
 <p className="text-xs text-muted-foreground mb-3">
 {labels.sourceOfVerification}: <span className="font-medium text-foreground">{indicator.verificationMethod}</span>
 </p>
 )}

 {/* Action Buttons */}
 <div className="flex gap-2 mt-2">
 <Button
 size="sm"
 onClick={() => navigate(`/organization/meal/indicators/${indicator.id}`)}
 className="gap-1"
 >
 {labels.viewDetails}
 <ChevronRight className={`h-3 w-3 ${isRTL ? 'rotate-180' : ''}`} />
 </Button>
 <Button
 size="sm"
 variant="outline"
 onClick={() => openUpdateModal(indicator)}
 >
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
 <BarChart3 className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
 <p className="text-muted-foreground">{labels.noProject}</p>
 </div>
 )}
 </div>

 {/* ======== UPDATE DATA ENTRY MODAL ======== */}
 {updateModalOpen && updateIndicator && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm" onClick={closeUpdateModal}>
 <div
 className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4"
 onClick={(e) => e.stopPropagation()}
 
 >
 {/* Modal Header */}
 <div className="flex items-center justify-between p-6 border-b border-border">
 <div>
 <h2 className="text-lg font-bold text-foreground">{labels.updateDataEntry}</h2>
 <p className="text-sm text-muted-foreground mt-0.5">
 {language === 'en' ? updateIndicator.indicatorName : (updateIndicator.indicatorNameAr || updateIndicator.indicatorName)}
 </p>
 </div>
 <button
 onClick={closeUpdateModal}
 className="p-2 rounded-lg hover:bg-muted transition-colors"
 >
 <X className="h-5 w-5 text-muted-foreground" />
 </button>
 </div>

 {/* Modal Body */}
 <form onSubmit={handleUpdateSubmit} className="p-6 space-y-5">
 {/* Error/Success Messages */}
 {formError && (
 <div className={`p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2`}>
 <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
 <p className="text-sm text-red-800">{formError}</p>
 </div>
 )}
 {formSuccess && (
 <div className={`p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2`}>
 <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
 <p className="text-sm text-green-800">{formSuccess}</p>
 </div>
 )}

 {/* Row 1: Reporting Date + Target Value (read-only) */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-foreground mb-1 text-start`}>
 {labels.reportingDate} <span className="text-red-600">*</span>
 </label>
 <input
 type="date"
 value={reportingDate}
 onChange={(e) => setReportingDate(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-primary/30 focus:border-transparent"
 required
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-foreground mb-1 text-start`}>
 {labels.targetValue}
 </label>
 <div className="ltr-safe w-full px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed">
 {updateIndicator.target || '0'}
 </div>
 </div>
 </div>

 {/* Row 2: Achieved Value + Unit Type */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm font-medium text-foreground mb-1 text-start`}>
 {labels.achievedValueLabel} <span className="text-red-600">*</span>
 </label>
 <input
 type="number"
 value={achievedValue}
 onChange={(e) => setAchievedValue(e.target.value)}
 placeholder={labels.achievedPlaceholder}
 className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-primary/30 focus:border-transparent"
 required
 min="0"
 step="0.01"
 />
 </div>
 <div>
 <label className={`block text-sm font-medium text-foreground mb-1 text-start`}>
 {labels.unitType}
 </label>
 <div className="ltr-safe w-full px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed">
 {updateIndicator.unit || 'N/A'}
 </div>
 </div>
 </div>

 {/* Disaggregated Data - Only shown for beneficiary unit types */}
 {showDisaggregation && (
 <div className="border-t border-border pt-5">
 <div className={`flex items-center gap-2 mb-4`}>
 <h3 className={`text-base font-semibold text-foreground text-start`}>
 {labels.disaggregation}
 </h3>
 <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
 <Info className="h-3 w-3" />
 <span>{labels.disaggregationNote}</span>
 </div>
 </div>

 {/* Gender */}
 <div className="mb-4">
 <h4 className={`text-sm font-medium text-foreground mb-2 text-start`}>{labels.gender}</h4>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className={`block text-xs text-muted-foreground mb-1 text-start`}>{labels.maleLabel}</label>
 <input type="number" value={male} onChange={(e) => setMale(e.target.value)} min="0" step="1" className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-primary/30 focus:border-transparent" />
 </div>
 <div>
 <label className={`block text-xs text-muted-foreground mb-1 text-start`}>{labels.femaleLabel}</label>
 <input type="number" value={female} onChange={(e) => setFemale(e.target.value)} min="0" step="1" className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-primary/30 focus:border-transparent" />
 </div>
 </div>
 </div>

 {/* Age */}
 <div className="mb-4">
 <h4 className={`text-sm font-medium text-foreground mb-2 text-start`}>{labels.age}</h4>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className={`block text-xs text-muted-foreground mb-1 text-start`}>{labels.age0_5}</label>
 <input type="number" value={ageGroup0_5} onChange={(e) => setAgeGroup0_5(e.target.value)} min="0" step="1" className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-primary/30 focus:border-transparent" />
 </div>
 <div>
 <label className={`block text-xs text-muted-foreground mb-1 text-start`}>{labels.age6_17}</label>
 <input type="number" value={ageGroup6_17} onChange={(e) => setAgeGroup6_17(e.target.value)} min="0" step="1" className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-primary/30 focus:border-transparent" />
 </div>
 <div>
 <label className={`block text-xs text-muted-foreground mb-1 text-start`}>{labels.age18_59}</label>
 <input type="number" value={ageGroup18_59} onChange={(e) => setAgeGroup18_59(e.target.value)} min="0" step="1" className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-primary/30 focus:border-transparent" />
 </div>
 <div>
 <label className={`block text-xs text-muted-foreground mb-1 text-start`}>{labels.age60Plus}</label>
 <input type="number" value={ageGroup60Plus} onChange={(e) => setAgeGroup60Plus(e.target.value)} min="0" step="1" className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-primary/30 focus:border-transparent" />
 </div>
 </div>
 </div>

 {/* Disability */}
 <div>
 <h4 className={`text-sm font-medium text-foreground mb-2 text-start`}>{labels.disability}</h4>
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className={`block text-xs text-muted-foreground mb-1 text-start`}>{labels.pwdLabel}</label>
 <input type="number" value={pwd} onChange={(e) => setPwd(e.target.value)} min="0" step="1" className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-primary/30 focus:border-transparent" />
 </div>
 <div>
 <label className={`block text-xs text-muted-foreground mb-1 text-start`}>{labels.nonPwdLabel}</label>
 <input type="number" value={nonPwd} onChange={(e) => setNonPwd(e.target.value)} min="0" step="1" className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-primary/30 focus:border-transparent" />
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Notes */}
 <div>
 <label className={`block text-sm font-medium text-foreground mb-1 text-start`}>
 {labels.notesLabel}
 </label>
 <textarea
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 rows={2}
 className={`w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-primary/30 focus:border-transparent text-start`}
 placeholder={labels.notesPlaceholder}
 />
 </div>

 {/* Actions */}
 <div className={`flex gap-3 pt-4 border-t border-border`}>
 <Button type="submit" disabled={createMutation.isPending} className="gap-2">
 {createMutation.isPending ? (
 <>
 <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
 {labels.saving}
 </>
 ) : (
 <>
 <Save className="w-4 h-4" />
 {labels.saveData}
 </>
 )}
 </Button>
 <Button type="button" variant="outline" onClick={closeUpdateModal}>
 {labels.cancel}
 </Button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
}
