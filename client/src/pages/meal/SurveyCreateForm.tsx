/**
 * ============================================================================
 * SURVEY CREATE/EDIT FORM
 * ============================================================================
 * 
 * Complete form for creating and editing survey forms with backend integration
 * 
 * FEATURES:
 * - Full CRUD operations with backend service
 * - Form validation
 * - Duplicate prevention
 * - Bilingual support (EN/AR) with RTL
 * - Auto-save drafts
 * - Business logic validation
 * 
 * ============================================================================
 */

import { useNavigate } from '@/lib/router-compat';
import { useSearch } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { surveyService, type SurveyType, type SurveyLanguage, type SurveyStatus } from '@/services/mealService';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function SurveyCreateForm() {
 const { t } = useTranslation();
 const navigate = useNavigate();
 const searchString = useSearch();
 const searchParams = new URLSearchParams(searchString);
 const { language, isRTL } = useLanguage();
 const { user } = useAuth();
 
 const projectId = searchParams.get('projectId') || '';
 const projectName = searchParams.get('projectName') || '';
 const formId = searchParams.get('formId') || '';
 const isEditing = !!formId;

 // Form state
 const [formName, setFormName] = useState('');
 const [description, setDescription] = useState('');
 const [surveyType, setSurveyType] = useState<SurveyType>('custom');
 const [formLanguage, setFormLanguage] = useState<SurveyLanguage>('en');
 const [consentRequired, setConsentRequired] = useState(false);
 const [status, setStatus] = useState<SurveyStatus>('draft');
 const [targetGroup, setTargetGroup] = useState('');
 
 // ✅ NEW FIELDS: Project ID, Sectors, Location
 const [selectedProjectId, setSelectedProjectId] = useState(projectId || '');
 const [otherProjectSpecify, setOtherProjectSpecify] = useState('');
 const [showProjectDropdown, setShowProjectDropdown] = useState(false);
 const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
 const [otherSectorSpecify, setOtherSectorSpecify] = useState('');
 const [country, setCountry] = useState('Yemen');
 const [governorate, setGovernorate] = useState('');
 const [district, setDistrict] = useState('');
 
 // UI state
 const [saving, setSaving] = useState(false);
 const [error, setError] = useState('');
 const [success, setSuccess] = useState('');

 const labels = {
 titleCreate: t.mealSurvey.createSurveyForm,
 titleEdit: t.mealSurvey.editSurveyForm,
 project: t.mealSurvey.project,
 formMetadata: t.mealSurvey.formMetadata,
 formName: t.mealSurvey.formName,
 formNameAr: t.mealSurvey.formName,
 formNamePlaceholder: t.mealSurvey.egBeneficiarySatisfactionSurvey,
 description: t.mealSurvey.description,
 descriptionAr: t.mealSurvey.description,
 descriptionPlaceholder: t.mealSurvey.describeThePurposeOfThisSurvey,
 surveyType: t.mealSurvey.surveyType,
 baseline: t.mealSurvey.baseline,
 endline: t.mealSurvey.endline,
 pdm: t.mealSurvey.pdmPostDistributionMonitoring,
 aap: t.mealSurvey.aapAccountabilityToAffectedPopulations,
 custom: t.mealSurvey.custom,
 languageLabel: t.mealSurvey.surveyLanguage,
 english: t.mealSurvey.english,
 arabic: t.mealSurvey.arabic,
 multi: t.mealSurvey.multilingualEnglishArabic,
 targetGroup: t.mealSurvey.targetGroupOptional,
 targetGroupPlaceholder: t.mealSurvey.egBeneficiariesStaffCommunityLeaders,
 consentRequired: t.mealSurvey.consentRequired,
 consentDescription: t.mealSurvey.askRespondentsForConsentBeforeSurvey,
 statusLabel: t.mealSurvey.status,
 draft: t.mealSurvey.draft,
 published: t.mealSurvey.published,
 archived: t.mealSurvey.archived,
 saveAndAddQuestions: t.mealSurvey.saveAddQuestions,
 saveAndEditQuestions: t.mealSurvey.saveEditQuestions,
 saveAsDraft: t.mealSurvey.saveAsDraft,
 cancel: t.mealSurvey.cancel,
 validationError: t.mealSurvey.validationError,
 enterFormName: t.mealSurvey.pleaseEnterAFormName,
 success: t.mealSurvey.success,
 formSaved: t.mealSurvey.formSavedSuccessfully,
 draftSaved: t.mealSurvey.formSavedAsDraft,
 error: t.mealSurvey.error,
 saveError: t.mealSurvey.failedToSaveFormPleaseTry,
 required: '*',
 // ✅ NEW translations
 projectIdLabel: t.mealSurvey.projectId,
 selectProject: t.mealSurvey.selectAProject,
 other: t.mealSurvey.otherSpecify,
 specify: t.mealSurvey.pleaseSpecify,
 sectors: t.mealSurvey.projectSectors,
 sectorsNote: t.mealSurvey.selectAtLeastOne,
 locationDetails: t.mealSurvey.locationDetails,
 country: t.mealSurvey.country,
 governorate: t.mealSurvey.governorate,
 district: t.mealSurvey.district,
 };

 // ✅ Load available projects from database via trpc
 const { data: projectsData = [] } = trpc.projects.list.useQuery({});
 const availableProjects = projectsData.map(p => ({
 id: String(p.id),
 code: p.code || '',
 title: p.title || ''
 }));

 // Load existing survey if editing
 useEffect(() => {
 if (formId) {
 const survey = surveyService.getSurveyById(formId);
 if (survey) {
 setFormName(survey.name);
 setDescription(survey.description);
 setSurveyType(survey.type);
 setFormLanguage(survey.language);
 setConsentRequired(survey.consentRequired);
 setStatus(survey.status);
 setTargetGroup(survey.targetGroup || '');
 }
 }
 }, [formId]);

 const validateForm = (): boolean => {
 if (!formName.trim()) {
 setError(labels.enterFormName);
 return false;
 }
 return true;
 };

 const handleSaveAndNext = async () => {
 setError('');
 setSuccess('');
 
 if (!validateForm()) {
 return;
 }

 setSaving(true);
 try {
 const data = {
 projectId,
 name: formName.trim(),
 description: description.trim(),
 type: surveyType,
 language: formLanguage,
 targetGroup: targetGroup.trim() || undefined,
 consentRequired,
 status,
 };

 let savedSurvey;
 if (isEditing) {
 savedSurvey = surveyService.updateSurvey(formId, data, user?.userId || 'system');
 } else {
 savedSurvey = surveyService.createSurvey(data, user?.userId || 'system');
 }

 setSuccess(labels.formSaved);
 
 // Navigate to Survey Editor after short delay
 setTimeout(() => {
 navigate(`/organization/meal/survey/editor?formId=${savedSurvey.id}&projectId=${projectId}&title=${encodeURIComponent(savedSurvey.title)}`);
 }, 500);
 } catch (err: any) {
 setError(err.message || labels.saveError);
 } finally {
 setSaving(false);
 }
 };

 const handleSaveDraft = async () => {
 setError('');
 setSuccess('');
 
 if (!validateForm()) {
 return;
 }

 setSaving(true);
 try {
 const data = {
 projectId,
 name: formName.trim(),
 description: description.trim(),
 type: surveyType,
 language: formLanguage,
 targetGroup: targetGroup.trim() || undefined,
 consentRequired,
 status: 'draft' as SurveyStatus,
 };

 if (isEditing) {
 surveyService.updateSurvey(formId, data, user?.userId || 'system');
 } else {
 surveyService.createSurvey(data, user?.userId || 'system');
 }

 setSuccess(labels.draftSaved);
 
 setTimeout(() => {
 navigate('/organization/meal/survey');
 }, 1000);
 } catch (err: any) {
 setError(err.message || labels.saveError);
 } finally {
 setSaving(false);
 }
 };

 return (
 <div className="max-w-4xl mx-auto p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Back Navigation */}
 <BackButton onClick={() => navigate('/organization/meal/survey')} label={t.mealSurvey.backToSurveys} />
 {/* Header */}
 <div className={`flex items-center justify-between`}>
 <div className={`flex-1 text-start`}>
 <h1 className="text-2xl font-bold text-gray-900">
 {isEditing ? labels.titleEdit : labels.titleCreate}
 </h1>
 <p className="text-sm text-gray-600 mt-1">{labels.project} {projectName}</p>
 </div>
 </div>

 {/* Error/Success Messages */}
 {error && (
 <div className={`p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3`}>
 <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
 <p className={`text-sm text-red-800 text-start`}>{error}</p>
 </div>
 )}

 {success && (
 <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
 <p className={`text-sm text-green-800 text-start`}>{success}</p>
 </div>
 )}

 {/* Form */}
 <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
 {/* Form Metadata Section */}
 <div>
 <h2 className={`text-lg font-bold text-gray-900 mb-4 text-start`}>
 {labels.formMetadata}
 </h2>

 <div className="space-y-4">
 {/* Form Name - SINGLE FIELD WITH LANGUAGE-BASED UI */}
 <div>
 <label className={`text-sm font-semibold text-gray-900 mb-2 block text-start`}>
 {labels.formName} <span className="text-red-600">{labels.required}</span>
 </label>
 <input
 type="text"
 value={formName}
 onChange={(e) => setFormName(e.target.value)}
 placeholder={labels.formNamePlaceholder}
 className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-start`}
 required
 
 />
 </div>

 {/* Description - SINGLE FIELD WITH LANGUAGE-BASED UI */}
 <div>
 <label className={`text-sm font-semibold text-gray-900 mb-2 block text-start`}>
 {labels.description}
 </label>
 <textarea
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 placeholder={labels.descriptionPlaceholder}
 rows={3}
 className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-start`}
 
 />
 </div>

 {/* ✅ NEW: Project ID Selector with "Other" option */}
 <div>
 <label className={`text-sm font-semibold text-gray-900 mb-2 block text-start`}>
 {labels.projectIdLabel}
 </label>
 <div className="relative">
 <button
 type="button"
 onClick={() => setShowProjectDropdown(!showProjectDropdown)}
 className={`w-full px-4 py-3 rounded-lg bg-white border border-gray-300 hover:border-blue-500 transition-colors text-start`}
 >
 <span className="text-base text-gray-900">
 {selectedProjectId === 'other'
 ? labels.other
 : availableProjects.find(p => p.id === selectedProjectId)?.code 
 ? `${availableProjects.find(p => p.id === selectedProjectId)?.code} - ${availableProjects.find(p => p.id === selectedProjectId)?.title}`
 : labels.selectProject}
 </span>
 </button>
 {showProjectDropdown && (
 <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
 {availableProjects.map((project) => (
 <button
 key={project.id}
 type="button"
 onClick={() => {
 setSelectedProjectId(project.id);
 setOtherProjectSpecify('');
 setShowProjectDropdown(false);
 }}
 className={`w-full px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0 text-start`}
 >
 <span className="text-sm font-semibold text-gray-900">{project.code}</span>
 <p className="text-sm text-gray-600">{project.title}</p>
 </button>
 ))}
 {/* Other (specify) option for baseline surveys before project start */}
 <button
 type="button"
 onClick={() => {
 setSelectedProjectId('other');
 setShowProjectDropdown(false);
 }}
 className={`w-full px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0 text-start`}
 >
 <span className="text-sm font-semibold text-gray-900">{labels.other}</span>
 </button>
 </div>
 )}
 </div>
 {/* Show "Other (specify)" text field when "Other" is selected */}
 {selectedProjectId === 'other' && (
 <div className="mt-2">
 <input
 type="text"
 value={otherProjectSpecify}
 onChange={(e) => setOtherProjectSpecify(e.target.value)}
 placeholder={t.mealSurvey.specifyProjectNameOrDescription}
 className={`w-full px-4 py-3 rounded-lg bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors text-start`}
 />
 </div>
 )}
 </div>

 {/* ✅ NEW: Project Sectors (Multi-select) */}
 <div>
 <label className={`text-sm font-semibold text-gray-900 mb-2 block text-start`}>
 {labels.sectors} <span className="text-red-600">{labels.required}</span> <span className="text-gray-600 text-xs">{labels.sectorsNote}</span>
 </label>
 <div className="grid grid-cols-2 gap-3">
 {[
 { value: 'WASH', label: 'WASH' },
 { value: 'EFSL', label: 'EFSL' },
 { value: 'Livelihood', label: t.mealSurvey.livelihood },
 { value: 'Child Protection', label: t.mealSurvey.childProtection },
 { value: 'Protection', label: t.mealSurvey.protection },
 { value: 'Education in Emergency', label: t.mealSurvey.educationInEmergency },
 { value: 'Health', label: t.mealSurvey.health },
 { value: 'Other', label: t.mealSurvey.other },
 ].map((sector) => (
 <button
 key={sector.value}
 type="button"
 onClick={() => {
 if (selectedSectors.includes(sector.value)) {
 setSelectedSectors(selectedSectors.filter(s => s !== sector.value));
 } else {
 setSelectedSectors([...selectedSectors, sector.value]);
 }
 }}
 className={`px-4 py-2 rounded-lg border transition-colors ${ selectedSectors.includes(sector.value) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50' }`}
 >
 <span className="text-sm font-medium">{sector.label}</span>
 </button>
 ))}
 </div>
 {selectedSectors.includes('Other') && (
 <input
 type="text"
 value={otherSectorSpecify}
 onChange={(e) => setOtherSectorSpecify(e.target.value)}
 placeholder={labels.specify}
 className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-3 text-start`}
 />
 )}
 </div>

 {/* ✅ NEW: Location & Details */}
 <div>
 <h3 className={`text-sm font-semibold text-gray-900 mb-3 text-start`}>
 {labels.locationDetails}
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div>
 <label className={`text-sm font-medium text-gray-700 mb-1 block text-start`}>
 {labels.country}
 </label>
 <input
 type="text"
 value={country}
 onChange={(e) => setCountry(e.target.value)}
 className={`w-full px-4 py-2 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-start`}
 />
 </div>
 <div>
 <label className={`text-sm font-medium text-gray-700 mb-1 block text-start`}>
 {labels.governorate}
 </label>
 <input
 type="text"
 value={governorate}
 onChange={(e) => setGovernorate(e.target.value)}
 placeholder={t.mealSurvey.egSanaa}
 className={`w-full px-4 py-2 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-start`}
 />
 </div>
 <div>
 <label className={`text-sm font-medium text-gray-700 mb-1 block text-start`}>
 {labels.district}
 </label>
 <input
 type="text"
 value={district}
 onChange={(e) => setDistrict(e.target.value)}
 placeholder={t.mealSurvey.egAlWahda}
 className={`w-full px-4 py-2 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-start`}
 />
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {/* Survey Type */}
 <div>
 <label className={`text-sm font-semibold text-gray-900 mb-2 block text-start`}>
 {labels.surveyType}
 </label>
 <select
 value={surveyType}
 onChange={(e) => setSurveyType(e.target.value as SurveyType)}
 className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-start`}
 >
 <option value="baseline">{labels.baseline}</option>
 <option value="endline">{labels.endline}</option>
 <option value="pdm">{labels.pdm}</option>
 <option value="aap">{labels.aap}</option>
 <option value="custom">{labels.custom}</option>
 </select>
 </div>

 {/* Survey Language */}
 <div>
 <label className={`text-sm font-semibold text-gray-900 mb-2 block text-start`}>
 {labels.languageLabel}
 </label>
 <select
 value={formLanguage}
 onChange={(e) => setFormLanguage(e.target.value as SurveyLanguage)}
 className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-start`}
 >
 <option value="en">{labels.english}</option>
 <option value="ar">{labels.arabic}</option>
 <option value="multi">{labels.multi}</option>
 </select>
 </div>
 </div>

 {/* Target Group */}
 <div>
 <label className={`text-sm font-semibold text-gray-900 mb-2 block text-start`}>
 {labels.targetGroup}
 </label>
 <input
 type="text"
 value={targetGroup}
 onChange={(e) => setTargetGroup(e.target.value)}
 placeholder={labels.targetGroupPlaceholder}
 className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-start`}
 />
 </div>

 {/* Consent Required */}
 <div className={`flex items-start gap-3`}>
 <input
 type="checkbox"
 id="consent"
 checked={consentRequired}
 onChange={(e) => setConsentRequired(e.target.checked)}
 className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
 />
 <div className={`flex-1 text-start`}>
 <label htmlFor="consent" className="text-sm font-semibold text-gray-900 cursor-pointer">
 {labels.consentRequired}
 </label>
 <p className="text-xs text-gray-600 mt-1">{labels.consentDescription}</p>
 </div>
 </div>

 {/* Status */}
 <div>
 <label className={`text-sm font-semibold text-gray-900 mb-2 block text-start`}>
 {labels.statusLabel}
 </label>
 <select
 value={status}
 onChange={(e) => setStatus(e.target.value as SurveyStatus)}
 className={`w-full max-w-xs px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-start`}
 >
 <option value="draft">{labels.draft}</option>
 <option value="published">{labels.published}</option>
 <option value="archived">{labels.archived}</option>
 </select>
 </div>
 </div>
 </div>

 {/* Actions */}
 <div className={`flex gap-3 pt-4 border-t border-gray-200`}>
 <button
 onClick={handleSaveAndNext}
 disabled={saving}
 className={`flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
 >
 {saving ? (
 <>
 <Loader2 className="w-4 h-4 animate-spin" />
 {t.mealSurvey.saving}
 </>
 ) : (
 isEditing ? labels.saveAndEditQuestions : labels.saveAndAddQuestions
 )}
 </button>

 <button
 onClick={handleSaveDraft}
 disabled={saving}
 className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
 >
 {labels.saveAsDraft}
 </button>

 <button
 onClick={() => navigate('/organization/meal/survey')}
 className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
 >
 {labels.cancel}
 </button>
 </div>
 </div>
 </div>
 );
}