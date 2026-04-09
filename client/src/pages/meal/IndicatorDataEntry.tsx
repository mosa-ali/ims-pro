/**
 * ============================================================================
 * INDICATOR DATA ENTRY FORM
 * ============================================================================
 * 
 * Complete form for entering indicator data with disaggregation.
 * Uses tRPC for database persistence (mealIndicatorData router).
 * 
 * FEATURES:
 * - Full CRUD operations via tRPC (DB-backed, not localStorage)
 * - Proper date picker for reporting period
 * - Read-only Target Value display
 * - Editable Achieved Value
 * - Unit type display
 * - Conditional Disaggregated data (only for beneficiary unit types)
 * - Data validation
 * - Bilingual support (EN/AR) with RTL
 * 
 * ============================================================================
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from '@/lib/router-compat';
import { useSearch } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Save, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
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

export function IndicatorDataEntryForm() {
 const { t } = useTranslation();
 const navigate = useNavigate();
 const params = useParams();
 const searchString = useSearch();
 const searchParams = useMemo(() => new URLSearchParams(searchString), [searchString]);
 const { language, isRTL } = useLanguage();
 const { user } = useAuth();
 const utils = trpc.useUtils();

 // Route param: /organization/meal/indicators/:id/data-entry
 const numericIndicatorId = params.id ? parseInt(params.id, 10) : 0;
 // Query params for editing existing entry
 const entryId = searchParams.get('entryId');
 const isEditing = !!entryId;

 // Form state
 const [reportingDate, setReportingDate] = useState('');
 const [value, setValue] = useState('');
 const [notes, setNotes] = useState('');
 
 // Disaggregated data
 const [male, setMale] = useState('');
 const [female, setFemale] = useState('');
 const [ageGroup0_5, setAgeGroup0_5] = useState('');
 const [ageGroup6_17, setAgeGroup6_17] = useState('');
 const [ageGroup18_59, setAgeGroup18_59] = useState('');
 const [ageGroup60Plus, setAgeGroup60Plus] = useState('');
 const [pwd, setPwd] = useState('');
 const [nonPwd, setNonPwd] = useState('');

 // UI state
 const [error, setError] = useState('');
 const [success, setSuccess] = useState('');

 // ---- Translations ----
 const labels = {
 title: t.meal.indicatorDataEntry,
 titleEdit: t.meal.editDataEntry,
 indicator: t.meal.indicator9,
 reportingDate: t.meal.reportingDate,
 targetValue: t.meal.targetValue,
 achievedValue: t.meal.achievedValue,
 achievedPlaceholder: t.meal.enterAchievedValue,
 unitType: t.meal.unitType,
 disaggregation: t.meal.disaggregatedData,
 disaggregationNote: t.meal.disaggregationIsRequiredForBeneficiarytypeIndicators,
 gender: t.meal.genderDisaggregation,
 male: t.meal.male,
 female: t.meal.female,
 age: t.meal.ageDisaggregation,
 age0_5: t.meal.k05Years,
 age6_17: t.meal.k617Years,
 age18_59: t.meal.k1859Years,
 age60Plus: t.meal.k60Years,
 disability: t.meal.disabilityDisaggregation,
 pwd: t.meal.personsWithDisabilities,
 nonPwd: t.meal.personsWithoutDisabilities,
 notes: t.meal.notesOptional,
 notesPlaceholder: t.meal.addAnyRelevantNotesOrComments,
 save: t.meal.saveData,
 update: t.meal.updateData,
 cancel: t.meal.cancel,
 saving: t.meal.saving,
 dateRequired: t.meal.pleaseSelectAReportingDate,
 valueRequired: t.meal.pleaseEnterAnAchievedValue,
 saveError: t.meal.failedToSaveData,
 dataCreated: t.meal.dataEntryCreatedSuccessfully,
 dataUpdated: t.meal.dataEntryUpdatedSuccessfully,
 loadingIndicator: t.meal.loadingIndicator,
 indicatorNotFound: t.meal.indicatorNotFound,
 backToIndicators: t.meal.backToIndicators,
 baseline: t.meal.baseline,
 target: t.meal.target12,
 progress: t.meal.progress,
 };

 // ---- tRPC Queries ----

 // Load all data entries for this indicator to find existing entry when editing
 const { data: dataEntries } = trpc.mealIndicatorData.getByIndicator.useQuery(
 { indicatorId: numericIndicatorId },
 { enabled: numericIndicatorId > 0 }
 );

 // Load existing entry if editing
 const { data: existingEntry } = trpc.mealIndicatorData.getById.useQuery(
 { id: parseInt(entryId || '0', 10) },
 { enabled: isEditing && !!entryId }
 );

 // Get indicator details including unit type
 const { data: cumulativeData } = trpc.mealIndicatorData.getCumulativeProgress.useQuery(
 { indicatorId: numericIndicatorId },
 { enabled: numericIndicatorId > 0 }
 );

 const indicatorName = cumulativeData?.indicatorName || `Indicator #${numericIndicatorId}`;
 const indicatorTarget = cumulativeData?.target || '0';
 const indicatorBaseline = cumulativeData?.baseline || '0';
 const indicatorUnit = cumulativeData?.unit || '';
 const showDisaggregation = isBeneficiaryUnit(indicatorUnit);

 // Populate form when editing
 useEffect(() => {
 if (existingEntry) {
 // Convert reportingPeriod (YYYY-MM) to date (YYYY-MM-01) for the date input
 if (existingEntry.reportingPeriod) {
 // If it's YYYY-MM format, convert to YYYY-MM-DD for date input
 const period = existingEntry.reportingPeriod;
 if (/^\d{4}-\d{2}$/.test(period)) {
 setReportingDate(`${period}-01`);
 } else {
 setReportingDate(existingEntry.periodStartDate || period);
 }
 }
 setValue(existingEntry.achievedValue?.toString() || '');
 setNotes(existingEntry.notes || '');

 const disagg = existingEntry.disaggregation as any;
 if (disagg) {
 setMale(disagg.male?.toString() || '');
 setFemale(disagg.female?.toString() || '');

 if (disagg.ageGroups) {
 setAgeGroup0_5(disagg.ageGroups['0-5']?.toString() || '');
 setAgeGroup6_17(disagg.ageGroups['6-17']?.toString() || '');
 setAgeGroup18_59(disagg.ageGroups['18-59']?.toString() || '');
 setAgeGroup60Plus(disagg.ageGroups['60+']?.toString() || '');
 }

 if (disagg.disability) {
 setPwd(disagg.disability.pwd?.toString() || '');
 setNonPwd(disagg.disability.nonPwd?.toString() || '');
 }
 }
 }
 }, [existingEntry]);

 // ---- tRPC Mutations ----

 const invalidateAllCaches = () => {
 utils.mealIndicatorData.getByIndicator.invalidate();
 utils.mealIndicatorData.getByProject.invalidate();
 utils.mealIndicatorData.getStatistics.invalidate();
 utils.mealIndicatorData.getCumulativeProgress.invalidate();
 utils.indicators.getByProject.invalidate();
 utils.indicators.getStatistics.invalidate();
 };

 const createMutation = trpc.mealIndicatorData.create.useMutation({
 onSuccess: () => {
 setSuccess(labels.dataCreated);
 invalidateAllCaches();
 setTimeout(() => {
 navigate('/organization/meal/indicators');
 }, 1500);
 },
 onError: (err: any) => {
 setError(err.message || labels.saveError);
 },
 });

 const updateMutation = trpc.mealIndicatorData.update.useMutation({
 onSuccess: () => {
 setSuccess(labels.dataUpdated);
 invalidateAllCaches();
 utils.mealIndicatorData.getById.invalidate();
 setTimeout(() => {
 navigate('/organization/meal/indicators');
 }, 1500);
 },
 onError: (err: any) => {
 setError(err.message || labels.saveError);
 },
 });

 const loading = createMutation.isPending || updateMutation.isPending;

 const validateForm = (): boolean => {
 if (!reportingDate) {
 setError(labels.dateRequired);
 return false;
 }

 if (!value.trim() || parseFloat(value) < 0) {
 setError(labels.valueRequired);
 return false;
 }

 return true;
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setError('');
 setSuccess('');

 if (!validateForm()) {
 return;
 }

 // Build disaggregation JSON (only if beneficiary unit type)
 const disaggregation: any = {};

 if (showDisaggregation) {
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

 // Convert date to period format and start/end dates
 const dateObj = new Date(reportingDate);
 const year = dateObj.getFullYear();
 const month = dateObj.getMonth() + 1;
 const reportingPeriod = `${year}-${String(month).padStart(2, '0')}`;
 const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
 const lastDay = new Date(year, month, 0).getDate();
 const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

 if (isEditing && entryId) {
 updateMutation.mutate({
 id: parseInt(entryId, 10),
 reportingPeriod,
 periodStartDate: startDate,
 periodEndDate: endDate,
 achievedValue: parseFloat(value).toFixed(2),
 disaggregation: Object.keys(disaggregation).length > 0 ? disaggregation : undefined,
 notes: notes.trim() || undefined,
 });
 } else {
 createMutation.mutate({
 indicatorId: numericIndicatorId,
 reportingPeriod,
 periodStartDate: startDate,
 periodEndDate: endDate,
 achievedValue: parseFloat(value).toFixed(2),
 disaggregation: Object.keys(disaggregation).length > 0 ? disaggregation : undefined,
 notes: notes.trim() || undefined,
 });
 }
 };

 // Loading state
 if (numericIndicatorId > 0 && !cumulativeData) {
 return (
 <div className="p-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <BackButton onClick={() => navigate('/organization/meal/indicators')} label={labels.backToIndicators} />
 <div className="flex items-center gap-3">
 <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
 <p className="text-muted-foreground">{labels.loadingIndicator}</p>
 </div>
 </div>
 );
 }

 return (
 <div className="p-6 max-w-4xl mx-auto">
 {/* Back Navigation */}
 <BackButton onClick={() => navigate('/organization/meal/indicators')} label={labels.backToIndicators} />

 {/* Header */}
 <div className="mb-6">
 <h1 className={`text-2xl font-bold text-foreground text-start`}>
 {isEditing ? labels.titleEdit : labels.title}
 </h1>
 <p className={`text-sm text-muted-foreground mt-1 text-start`}>
 {labels.indicator}: {language === 'ar' && cumulativeData?.indicatorNameAr ? cumulativeData.indicatorNameAr : indicatorName}
 </p>
 {cumulativeData && (
 <p className={`text-xs text-muted-foreground mt-0.5 text-start`}>
 {labels.baseline}: {indicatorBaseline} | {labels.target}: {indicatorTarget} | {labels.progress}: {cumulativeData.progressPercentage}%
 </p>
 )}
 </div>

 {/* Error/Success Messages */}
 {error && (
 <div className={`mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3`}>
 <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
 <p className={`text-sm text-red-800 text-start`}>{error}</p>
 </div>
 )}

 {success && (
 <div className={`mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3`}>
 <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
 <p className={`text-sm text-green-800 text-start`}>{success}</p>
 </div>
 )}

 {/* Form */}
 <form onSubmit={handleSubmit} className="space-y-6 bg-card rounded-lg border border-border p-6">
 {/* Row 1: Reporting Date + Target Value (read-only) */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {/* Reporting Date - proper date picker */}
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

 {/* Target Value - Read Only */}
 <div>
 <label className={`block text-sm font-medium text-foreground mb-1 text-start`}>
 {labels.targetValue}
 </label>
 <div className="ltr-safe w-full px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed">
 {indicatorTarget}
 </div>
 </div>
 </div>

 {/* Row 2: Achieved Value + Unit Type */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {/* Achieved Value - Editable */}
 <div>
 <label className={`block text-sm font-medium text-foreground mb-1 text-start`}>
 {labels.achievedValue} <span className="text-red-600">*</span>
 </label>
 <input
 type="number"
 value={value}
 onChange={(e) => setValue(e.target.value)}
 placeholder={labels.achievedPlaceholder}
 className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-primary/30 focus:border-transparent"
 required
 min="0"
 step="0.01"
 />
 </div>

 {/* Unit Type - Read Only */}
 <div>
 <label className={`block text-sm font-medium text-foreground mb-1 text-start`}>
 {labels.unitType}
 </label>
 <div className="ltr-safe w-full px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed">
 {indicatorUnit || 'N/A'}
 </div>
 </div>
 </div>

 {/* Disaggregated Data - Only shown for beneficiary unit types */}
 {showDisaggregation && (
 <div className="border-t border-border pt-6">
 <div className={`flex items-center gap-2 mb-4`}>
 <h2 className={`text-lg font-semibold text-foreground text-start`}>
 {labels.disaggregation}
 </h2>
 <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
 <Info className="h-3 w-3" />
 <span>{labels.disaggregationNote}</span>
 </div>
 </div>

 {/* Gender Disaggregation */}
 <div className="mb-6">
 <h3 className={`text-sm font-medium text-foreground mb-3 text-start`}>
 {labels.gender}
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm text-muted-foreground mb-1 text-start`}>
 {labels.male}
 </label>
 <input
 type="number"
 value={male}
 onChange={(e) => setMale(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-primary/30 focus:border-transparent"
 min="0"
 step="1"
 />
 </div>
 <div>
 <label className={`block text-sm text-muted-foreground mb-1 text-start`}>
 {labels.female}
 </label>
 <input
 type="number"
 value={female}
 onChange={(e) => setFemale(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-primary/30 focus:border-transparent"
 min="0"
 step="1"
 />
 </div>
 </div>
 </div>

 {/* Age Disaggregation */}
 <div className="mb-6">
 <h3 className={`text-sm font-medium text-foreground mb-3 text-start`}>
 {labels.age}
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm text-muted-foreground mb-1 text-start`}>
 {labels.age0_5}
 </label>
 <input
 type="number"
 value={ageGroup0_5}
 onChange={(e) => setAgeGroup0_5(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-primary/30 focus:border-transparent"
 min="0"
 step="1"
 />
 </div>
 <div>
 <label className={`block text-sm text-muted-foreground mb-1 text-start`}>
 {labels.age6_17}
 </label>
 <input
 type="number"
 value={ageGroup6_17}
 onChange={(e) => setAgeGroup6_17(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-primary/30 focus:border-transparent"
 min="0"
 step="1"
 />
 </div>
 <div>
 <label className={`block text-sm text-muted-foreground mb-1 text-start`}>
 {labels.age18_59}
 </label>
 <input
 type="number"
 value={ageGroup18_59}
 onChange={(e) => setAgeGroup18_59(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-primary/30 focus:border-transparent"
 min="0"
 step="1"
 />
 </div>
 <div>
 <label className={`block text-sm text-muted-foreground mb-1 text-start`}>
 {labels.age60Plus}
 </label>
 <input
 type="number"
 value={ageGroup60Plus}
 onChange={(e) => setAgeGroup60Plus(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-primary/30 focus:border-transparent"
 min="0"
 step="1"
 />
 </div>
 </div>
 </div>

 {/* Disability Disaggregation */}
 <div className="mb-6">
 <h3 className={`text-sm font-medium text-foreground mb-3 text-start`}>
 {labels.disability}
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className={`block text-sm text-muted-foreground mb-1 text-start`}>
 {labels.pwd}
 </label>
 <input
 type="number"
 value={pwd}
 onChange={(e) => setPwd(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-primary/30 focus:border-transparent"
 min="0"
 step="1"
 />
 </div>
 <div>
 <label className={`block text-sm text-muted-foreground mb-1 text-start`}>
 {labels.nonPwd}
 </label>
 <input
 type="number"
 value={nonPwd}
 onChange={(e) => setNonPwd(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-primary/30 focus:border-transparent"
 min="0"
 step="1"
 />
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Notes */}
 <div className="border-t border-border pt-6">
 <label className={`block text-sm font-medium text-foreground mb-1 text-start`}>
 {labels.notes}
 </label>
 <textarea
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 rows={3}
 className={`w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-primary/30 focus:border-transparent text-start`}
 placeholder={labels.notesPlaceholder}
 />
 </div>

 {/* Actions */}
 <div className={`flex gap-3 pt-6 border-t border-border`}>
 <Button
 type="submit"
 disabled={loading}
 className="gap-2"
 >
 {loading ? (
 <>
 <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
 {labels.saving}
 </>
 ) : (
 <>
 <Save className="w-4 h-4" />
 {isEditing ? labels.update : labels.save}
 </>
 )}
 </Button>
 <Button
 type="button"
 variant="outline"
 onClick={() => navigate('/organization/meal/indicators')}
 >
 {labels.cancel}
 </Button>
 </div>
 </form>
 </div>
 );
}
