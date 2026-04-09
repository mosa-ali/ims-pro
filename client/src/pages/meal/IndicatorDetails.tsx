/**
 * ============================================================================
 * INDICATOR DETAILS - Detailed view of individual indicator
 * ============================================================================
 * 
 * Shows detailed metrics, progress, disaggregation, and data entries history
 * Uses tRPC backend with correct DB field names
 * Supports Edit/Delete on data entries
 * 
 * ============================================================================
 */
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { Target, TrendingUp, BarChart3, Edit, Calendar, Trash2, CheckCircle, Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function IndicatorDetails() {
 const { t } = useTranslation();
 const navigate = useNavigate();
 const params = useParams();
 const indicatorId = params?.id ? parseInt(params.id) : null;
 const { language, isRTL} = useLanguage();
 const utils = trpc.useUtils();
 const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

 const labels = {
 backToIndicators: t.meal.backToIndicators,
 title: t.meal.indicatorDetails,
 overview: t.meal.overview,
 type: t.meal.type13,
 category: t.meal.category,
 unit: t.meal.unit,
 frequency: t.meal.reportingFrequency,
 verification: t.meal.sourceOfVerification,
 progressMetrics: t.meal.progressMetrics,
 baseline: t.meal.baseline,
 target: t.meal.target12,
 achieved: t.meal.achieved,
 balance: t.meal.balance,
 units: t.meal.units,
 achievementRate: t.meal.achievementRate,
 reportingFrequency: t.meal.reportingFrequency14,
 disaggregatedData: t.meal.disaggregatedData,
 male: t.meal.male,
 female: t.meal.female,
 pwd: t.meal.pwd,
 nonPwd: t.meal.nonpwd,
 totalIndividuals: t.meal.totalIndividuals,
 verificationDocs: t.meal.verificationDocumentation,
 sourceOfVerification: t.meal.sourceOfVerification,
 noSource: t.meal.noVerificationSourceSpecified,
 supportingDocs: t.meal.supportingDocuments,
 noDocs: t.meal.noDocumentsAttached,
 updateValue: t.meal.collectData,
 editIndicator: t.meal.editIndicator,
 viewCharts: t.meal.viewCharts,
 dataEntries: t.meal.dataEntryHistory,
 period: t.meal.period,
 value: t.meal.value,
 notes: t.meal.notes,
 noEntries: t.meal.noDataEntriesYetClickCollect,
 addEntry: t.meal.addDataEntry,
 loading: t.meal.loadingIndicatorDetails,
 notFound: t.meal.indicatorNotFound15,
 activity: t.meal.activity,
 project: t.meal.project,
 indicatorIdLabel: t.meal.indicatorId,
 na: t.meal.na,
 status: t.meal.status,
 onTrack: t.meal.onTrack,
 atRisk: t.meal.atRisk,
 offTrack: t.meal.offTrack,
 achievedStatus: t.meal.achieved16,
 ongoing: t.meal.ongoing,
 pending: t.meal.pending17,
 output: t.meal.output,
 outcome: t.meal.outcome,
 impact: t.meal.impact,
 actions: t.meal.actions,
 edit: t.meal.edit,
 delete: t.meal.delete,
 confirmDelete: t.meal.areYouSureYouWantTo18,
 yes: t.meal.yesDelete,
 no: t.meal.cancel,
 verified: t.meal.verified,
 unverified: t.meal.pending,
 verificationStatus: t.meal.status,
 deleteSuccess: t.meal.entryDeletedSuccessfully,
 age0_5: t.meal.k05Yrs,
 age6_17: t.meal.k617Yrs,
 age18_59: t.meal.k1859Yrs,
 age60Plus: t.meal.k60Yrs,
 };

 // Fetch indicator details from tRPC
 const { data: indicator, isLoading } = trpc.indicators.getById.useQuery(
 { id: indicatorId! },
 { enabled: !!indicatorId }
 );

 // Fetch data entries for this indicator
 const { data: dataEntries = [] } = trpc.mealIndicatorData.getByIndicator.useQuery(
 { indicatorId: indicatorId! },
 { enabled: !!indicatorId }
 );

 // Delete mutation
 const deleteMutation = trpc.mealIndicatorData.delete.useMutation({
 onSuccess: () => {
 setDeleteConfirmId(null);
 utils.mealIndicatorData.getByIndicator.invalidate({ indicatorId: indicatorId! });
 utils.mealIndicatorData.getCumulativeProgress.invalidate({ indicatorId: indicatorId! });
 utils.indicators.getByProject.invalidate();
 },
 });

 const metrics = useMemo(() => {
 if (!indicator) return null;
 const targetVal = parseFloat(indicator.target) || 0;
 const achievedVal = parseFloat(indicator.achievedValue) || 0;
 const baselineVal = parseFloat(indicator.baseline) || 0;
 const balance = Math.max(0, targetVal - achievedVal);
 const rate = targetVal > 0 ? (achievedVal / targetVal) * 100 : 0;
 return { targetVal, achievedVal, baselineVal, balance, rate };
 }, [indicator]);

 // Aggregate disaggregation from data entries (JSON format)
 const disaggregation = useMemo(() => {
 let male = 0, female = 0, pwd = 0, nonPwd = 0;
 let age0_5 = 0, age6_17 = 0, age18_59 = 0, age60Plus = 0;
 dataEntries.forEach((entry: any) => {
 const d = entry.disaggregation;
 if (d && typeof d === 'object') {
 male += parseFloat(d.male) || 0;
 female += parseFloat(d.female) || 0;
 pwd += parseFloat(d.pwd) || 0;
 nonPwd += parseFloat(d.nonPwd) || 0;
 age0_5 += parseFloat(d.age0_5) || 0;
 age6_17 += parseFloat(d.age6_17) || 0;
 age18_59 += parseFloat(d.age18_59) || 0;
 age60Plus += parseFloat(d.age60Plus) || 0;
 }
 });
 const total = male + female;
 return { male, female, pwd, nonPwd, age0_5, age6_17, age18_59, age60Plus, total };
 }, [dataEntries]);

 const getStatusColor = (status: string) => {
 switch (status) {
 case 'ACHIEVED': return '#4CAF50';
 case 'ON_TRACK': return '#2196F3';
 case 'AT_RISK': return '#FF9800';
 case 'OFF_TRACK': return '#EF4444';
 default: return '#6B7280';
 }
 };

 const getStatusLabel = (status: string) => {
 switch (status) {
 case 'ACHIEVED': return labels.achievedStatus;
 case 'ON_TRACK': return labels.onTrack;
 case 'AT_RISK': return labels.atRisk;
 case 'OFF_TRACK': return labels.offTrack;
 default: return status;
 }
 };

 if (isLoading) {
 return (
 <div className="flex items-center justify-center min-h-screen p-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="text-center">
 <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
 <p className="text-sm text-muted-foreground">{labels.loading}</p>
 </div>
 </div>
 );
 }

 if (!indicator) {
 return (
 <div className="flex items-center justify-center min-h-screen p-6">
 <div className="text-center">
 <Target className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
 <p className="text-muted-foreground">{labels.notFound}</p>
 <Button variant="outline" className="mt-4" onClick={() => navigate('/organization/meal/indicators')}>
 {labels.backToIndicators}
 </Button>
 </div>
 </div>
 );
 }

 return (
 <div className="p-6">
 {/* Back to Indicators */}
 <BackButton onClick={() => navigate('/organization/meal/indicators')} label={labels.backToIndicators} />

 {/* Header */}
 <div className={`flex items-center justify-between pb-6 border-b border-gray-200 mb-6`}>
 <h1 className="text-2xl font-bold text-gray-900 flex-1">{labels.title}</h1>
 <div className="flex gap-2">
 <Button variant="outline" size="sm" onClick={() => navigate(`/organization/meal/indicators/${indicatorId}/charts`)}>
 <BarChart3 className="h-4 w-4 me-1" />
 {labels.viewCharts}
 </Button>
 </div>
 </div>

 {/* Indicator Metadata */}
 <div className="rounded-xl p-6 mb-6 bg-white border border-gray-200">
 <div className={`flex items-center justify-between mb-4`}>
 <h2 className={`text-xl font-bold text-gray-900 flex-1 text-start`}>
 {language === 'en' ? indicator.indicatorName : (indicator.indicatorNameAr || indicator.indicatorName)}
 </h2>
 <span
 className="px-3 py-1 rounded-full text-xs font-semibold text-white"
 style={{ backgroundColor: getStatusColor(indicator.status) }}
 >
 {getStatusLabel(indicator.status)}
 </span>
 </div>

 <div className="space-y-3">
 <div className={`flex`}>
 <p className={`text-sm font-semibold text-gray-600 me-4`} style={{ width: '160px' }}>
 {labels.activity}
 </p>
 <p className={`text-sm text-gray-900 flex-1 text-start`}>
 {indicator.category || labels.na}
 </p>
 </div>

 <div className={`flex`}>
 <p className={`text-sm font-semibold text-gray-600 me-4`} style={{ width: '160px' }}>
 {labels.indicatorIdLabel}
 </p>
 <p className={`text-sm text-gray-900 flex-1 text-start`}>
 IND-{indicator.id}
 </p>
 </div>

 <div className={`flex`}>
 <p className={`text-sm font-semibold text-gray-600 me-4`} style={{ width: '160px' }}>
 {labels.type}
 </p>
 <p className={`text-sm text-gray-900 flex-1 text-start`}>
 {indicator.type || labels.na}
 </p>
 </div>
 </div>
 </div>

 {/* Progress Metrics */}
 {metrics && (
 <div className="mb-6">
 <h3 className={`text-lg font-bold text-gray-900 mb-4 text-start`}>
 {labels.progressMetrics}
 </h3>

 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
 <div className="rounded-xl p-4 bg-white border border-gray-200">
 <p className={`text-sm text-gray-600 mb-1 text-start`}>{labels.baseline}</p>
 <p className="text-2xl font-bold text-gray-900">{metrics.baselineVal}</p>
 <p className={`text-xs text-gray-500 mt-1 text-start`}>
 {indicator.unit || labels.units}
 </p>
 </div>

 <div className="rounded-xl p-4 bg-white border border-gray-200">
 <p className={`text-sm text-gray-600 mb-1 text-start`}>{labels.target}</p>
 <p className="text-2xl font-bold text-blue-600">{metrics.targetVal}</p>
 <p className={`text-xs text-gray-500 mt-1 text-start`}>
 {indicator.unit || labels.units}
 </p>
 </div>

 <div className="rounded-xl p-4 bg-white border border-gray-200">
 <p className={`text-sm text-gray-600 mb-1 text-start`}>{labels.achieved}</p>
 <p className="text-2xl font-bold text-green-600">{metrics.achievedVal}</p>
 <p className={`text-xs text-gray-500 mt-1 text-start`}>
 {indicator.unit || labels.units}
 </p>
 </div>

 <div className="rounded-xl p-4 bg-white border border-gray-200">
 <p className={`text-sm text-gray-600 mb-1 text-start`}>{labels.balance}</p>
 <p className="text-2xl font-bold text-orange-600">{metrics.balance}</p>
 <p className={`text-xs text-gray-500 mt-1 text-start`}>
 {indicator.unit || labels.units}
 </p>
 </div>
 </div>

 {/* Progress Bar */}
 <div className="rounded-xl p-4 bg-white border border-gray-200">
 <div className="flex justify-between mb-2">
 <span className="text-sm text-gray-600">{labels.achievementRate}</span>
 <span className="text-sm font-bold text-gray-900">{Math.round(metrics.rate)}%</span>
 </div>
 <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
 <div
 className="h-full rounded-full transition-all duration-500"
 style={{
 width: `${Math.min(metrics.rate, 100)}%`,
 backgroundColor: metrics.rate >= 80 ? '#4CAF50' : metrics.rate >= 50 ? '#FF9800' : '#EF4444',
 }}
 />
 </div>
 <p className={`text-sm text-gray-600 mt-2 text-start`}>
 {labels.reportingFrequency}: {indicator.reportingFrequency || labels.na}
 </p>
 </div>
 </div>
 )}

 {/* Disaggregated Data */}
 <div className="mb-6">
 <h3 className={`text-lg font-bold text-gray-900 mb-4 text-start`}>
 {labels.disaggregatedData}
 </h3>

 <div className="rounded-xl p-6 bg-white border border-gray-200">
 {/* Gender */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
 <div className="text-center">
 <p className="text-sm text-gray-600 mb-2">{labels.male}</p>
 <p className="text-3xl font-bold text-blue-600">{disaggregation.male}</p>
 </div>
 <div className="text-center">
 <p className="text-sm text-gray-600 mb-2">{labels.female}</p>
 <p className="text-3xl font-bold text-pink-600">{disaggregation.female}</p>
 </div>
 <div className="text-center">
 <p className="text-sm text-gray-600 mb-2">{labels.pwd}</p>
 <p className="text-3xl font-bold text-amber-600">{disaggregation.pwd}</p>
 </div>
 <div className="text-center">
 <p className="text-sm text-gray-600 mb-2">{labels.nonPwd}</p>
 <p className="text-3xl font-bold text-teal-600">{disaggregation.nonPwd}</p>
 </div>
 </div>

 {/* Age Groups */}
 {(disaggregation.age0_5 > 0 || disaggregation.age6_17 > 0 || disaggregation.age18_59 > 0 || disaggregation.age60Plus > 0) && (
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pt-4 border-t border-gray-100">
 <div className="text-center">
 <p className="text-sm text-gray-600 mb-2">{labels.age0_5}</p>
 <p className="text-2xl font-bold text-indigo-600">{disaggregation.age0_5}</p>
 </div>
 <div className="text-center">
 <p className="text-sm text-gray-600 mb-2">{labels.age6_17}</p>
 <p className="text-2xl font-bold text-indigo-600">{disaggregation.age6_17}</p>
 </div>
 <div className="text-center">
 <p className="text-sm text-gray-600 mb-2">{labels.age18_59}</p>
 <p className="text-2xl font-bold text-indigo-600">{disaggregation.age18_59}</p>
 </div>
 <div className="text-center">
 <p className="text-sm text-gray-600 mb-2">{labels.age60Plus}</p>
 <p className="text-2xl font-bold text-indigo-600">{disaggregation.age60Plus}</p>
 </div>
 </div>
 )}

 <div className="pt-4 border-t border-gray-200">
 <div className={`flex justify-between items-center`}>
 <p className="text-base font-semibold text-gray-900">{labels.totalIndividuals}</p>
 <p className="text-2xl font-bold text-blue-600">{disaggregation.total}</p>
 </div>
 </div>
 </div>
 </div>

 {/* Verification & Documents */}
 <div className="mb-6">
 <h3 className={`text-lg font-bold text-gray-900 mb-4 text-start`}>
 {labels.verificationDocs}
 </h3>

 <div className="rounded-xl p-6 mb-4 bg-white border border-gray-200">
 <p className={`text-sm font-semibold text-gray-600 mb-2 text-start`}>
 {labels.sourceOfVerification}
 </p>
 <p className={`text-base text-gray-900 text-start`}>
 {indicator.verificationMethod || labels.noSource}
 </p>
 </div>
 </div>

 {/* Data Entry History Table */}
 <div className="mb-6">
 <div className={`flex items-center justify-between mb-4`}>
 <h3 className="text-lg font-bold text-gray-900">{labels.dataEntries}</h3>
 <Button size="sm" onClick={() => navigate(`/organization/meal/indicators/${indicatorId}/data-entry`)}>
 <Plus className="h-3 w-3 me-1" />
 {labels.addEntry}
 </Button>
 </div>

 {dataEntries.length === 0 ? (
 <div className="rounded-xl p-8 bg-white border border-gray-200 text-center">
 <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
 <p className="text-sm text-gray-500">{labels.noEntries}</p>
 <Button
 size="sm"
 className="mt-4"
 onClick={() => navigate(`/organization/meal/indicators/${indicatorId}/data-entry`)}
 >
 <Plus className="h-3 w-3 me-1" />
 {labels.addEntry}
 </Button>
 </div>
 ) : (
 <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="bg-gray-50 border-b border-gray-200">
 <th className={`py-3 px-4 text-xs font-semibold text-gray-600 text-start`}>{labels.period}</th>
 <th className={`py-3 px-4 text-xs font-semibold text-gray-600 text-start`}>{labels.value}</th>
 <th className={`py-3 px-4 text-xs font-semibold text-gray-600 text-start`}>{labels.male}</th>
 <th className={`py-3 px-4 text-xs font-semibold text-gray-600 text-start`}>{labels.female}</th>
 <th className={`py-3 px-4 text-xs font-semibold text-gray-600 text-start`}>{labels.pwd}</th>
 <th className={`py-3 px-4 text-xs font-semibold text-gray-600 text-start`}>{labels.verificationStatus}</th>
 <th className={`py-3 px-4 text-xs font-semibold text-gray-600 text-start`}>{labels.notes}</th>
 <th className={`py-3 px-4 text-xs font-semibold text-gray-600 text-start`}>{labels.actions}</th>
 </tr>
 </thead>
 <tbody>
 {dataEntries.map((entry: any) => {
 const d = entry.disaggregation && typeof entry.disaggregation === 'object' ? entry.disaggregation : {};
 return (
 <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
 <td className="py-3 px-4 text-gray-900 font-medium">
 {entry.reportingPeriod || labels.na}
 </td>
 <td className="py-3 px-4 font-semibold text-gray-900">{entry.achievedValue || '0'}</td>
 <td className="py-3 px-4 text-gray-700">{d.male || 0}</td>
 <td className="py-3 px-4 text-gray-700">{d.female || 0}</td>
 <td className="py-3 px-4 text-gray-700">{d.pwd || 0}</td>
 <td className="py-3 px-4">
 {entry.isVerified ? (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
 <CheckCircle className="h-3 w-3" />
 {labels.verified}
 </span>
 ) : (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
 <Clock className="h-3 w-3" />
 {labels.unverified}
 </span>
 )}
 </td>
 <td className="py-3 px-4 text-gray-500 max-w-[150px] truncate">{entry.notes || '-'}</td>
 <td className="py-3 px-4">
 {deleteConfirmId === entry.id ? (
 <div className="flex items-center gap-1">
 <Button
 variant="destructive"
 size="sm"
 className="h-7 text-xs"
 onClick={() => deleteMutation.mutate({ id: entry.id })}
 disabled={deleteMutation.isPending}
 >
 {labels.yes}
 </Button>
 <Button
 variant="outline"
 size="sm"
 className="h-7 text-xs"
 onClick={() => setDeleteConfirmId(null)}
 >
 {labels.no}
 </Button>
 </div>
 ) : (
 <div className="flex items-center gap-1">
 <Button
 variant="ghost"
 size="sm"
 className="h-7 w-7 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
 onClick={() => navigate(`/organization/meal/indicators/${indicatorId}/data-entry?entryId=${entry.id}`)}
 title={labels.edit}
 >
 <Edit className="h-3.5 w-3.5" />
 </Button>
 <Button
 variant="ghost"
 size="sm"
 className="h-7 w-7 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
 onClick={() => setDeleteConfirmId(entry.id)}
 title={labels.delete}
 >
 <Trash2 className="h-3.5 w-3.5" />
 </Button>
 </div>
 )}
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>
 )}
 </div>

 {/* Action Buttons */}
 <div className={`flex gap-4`}>
 <button
 onClick={() => navigate(`/organization/meal/indicators/${indicatorId}/data-entry`)}
 className="flex-1 px-6 py-4 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
 >
 <span className="font-semibold text-white flex items-center justify-center gap-2">
 <TrendingUp className="w-4 h-4" /> {labels.updateValue}
 </span>
 </button>

 <button
 onClick={() => navigate(`/organization/meal/indicators/add?edit=${indicator.id}`)}
 className="flex-1 px-6 py-4 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
 >
 <span className="font-semibold text-gray-900 flex items-center justify-center gap-2">
 <Edit className="w-4 h-4" /> {labels.editIndicator}
 </span>
 </button>
 </div>
 </div>
 );
}
