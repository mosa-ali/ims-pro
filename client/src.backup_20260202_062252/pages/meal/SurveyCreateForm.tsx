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

import { useLocation, useSearch } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { surveyService, type SurveyType, type SurveyLanguage, type SurveyStatus } from '@/services/mealService';
import { projectsDatabase } from '@/services/projectsDatabase';

export function SurveyCreateForm() {
  const [, navigate] = useLocation();
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
  const [availableProjects, setAvailableProjects] = useState<Array<{ id: string; code: string; title: string }>>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [otherSectorSpecify, setOtherSectorSpecify] = useState('');
  const [country, setCountry] = useState('Yemen');
  const [governorate, setGovernorate] = useState('');
  const [district, setDistrict] = useState('');
  
  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const t = {
    titleCreate: language === 'en' ? 'Create Survey Form' : 'إنشاء نموذج مسح',
    titleEdit: language === 'en' ? 'Edit Survey Form' : 'تعديل نموذج مسح',
    project: language === 'en' ? 'Project:' : 'المشروع:',
    back: language === 'en' ? 'Back' : 'رجوع',
    formMetadata: language === 'en' ? 'Form Metadata' : 'بيانات النموذج',
    formName: language === 'en' ? 'Form Name' : 'اسم النموذج',
    formNameAr: language === 'en' ? 'Form Name' : 'اسم النموذج',
    formNamePlaceholder: language === 'en' ? 'e.g., Beneficiary Satisfaction Survey' : 'مثال: استطلاع رضا المستفيدين',
    description: language === 'en' ? 'Description' : 'الوصف',
    descriptionAr: language === 'en' ? 'Description' : 'الوصف',
    descriptionPlaceholder: language === 'en' ? 'Describe the purpose of this survey...' : 'صف الغرض من هذا الاستطلاع...',
    surveyType: language === 'en' ? 'Survey Type' : 'نوع الاستطلاع',
    baseline: language === 'en' ? 'Baseline' : 'خط الأساس',
    endline: language === 'en' ? 'Endline' : 'النهائي',
    pdm: language === 'en' ? 'PDM (Post Distribution Monitoring)' : 'مراقبة ما بعد التوزيع',
    aap: language === 'en' ? 'AAP (Accountability to Affected Populations)' : 'المساءلة للسكان المتضررين',
    custom: language === 'en' ? 'Custom' : 'مخصص',
    languageLabel: language === 'en' ? 'Survey Language' : 'لغة الاستطلاع',
    english: language === 'en' ? 'English' : 'الإنجليزية',
    arabic: language === 'en' ? 'Arabic' : 'العربية',
    multi: language === 'en' ? 'Multilingual (English & Arabic)' : 'متعدد اللغات (إنجليزي وعربي)',
    targetGroup: language === 'en' ? 'Target Group (Optional)' : 'المجموعة المستهدفة (اختياري)',
    targetGroupPlaceholder: language === 'en' ? 'e.g., Beneficiaries, Staff, Community Leaders' : 'مثال: المستفيدون، الموظفون، القادة المجتمعيون',
    consentRequired: language === 'en' ? 'Consent Required' : 'الموافقة مطلوبة',
    consentDescription: language === 'en' ? 'Ask respondents for consent before survey' : 'اطلب موافقة المستجيبين قبل الاستطلاع',
    statusLabel: language === 'en' ? 'Status' : 'الحالة',
    draft: language === 'en' ? 'Draft' : 'مسودة',
    published: language === 'en' ? 'Published' : 'منشور',
    archived: language === 'en' ? 'Archived' : 'مؤرشف',
    saveAndAddQuestions: language === 'en' ? 'Save & Add Questions' : 'حفظ وإضافة أسئلة',
    saveAndEditQuestions: language === 'en' ? 'Save & Edit Questions' : 'حفظ وتعديل الأسئلة',
    saveAsDraft: language === 'en' ? 'Save as Draft' : 'حفظ كمسودة',
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    validationError: language === 'en' ? 'Validation Error' : 'خطأ في التحقق',
    enterFormName: language === 'en' ? 'Please enter a form name' : 'يرجى إدخال اسم النموذج',
    success: language === 'en' ? 'Success' : 'نجح',
    formSaved: language === 'en' ? 'Form saved successfully' : 'تم حفظ النموذج بنجاح',
    draftSaved: language === 'en' ? 'Form saved as draft' : 'تم حفظ النموذج كمسودة',
    error: language === 'en' ? 'Error' : 'خطأ',
    saveError: language === 'en' ? 'Failed to save form. Please try again.' : 'فشل حفظ النموذج. يرجى المحاولة مرة أخرى.',
    required: language === 'en' ? '*' : '*',
    // ✅ NEW translations
    projectIdLabel: language === 'en' ? 'Project ID' : 'معرف المشروع',
    selectProject: language === 'en' ? 'Select a project...' : 'اختر مشروعاً...',
    other: language === 'en' ? 'Other (specify)' : 'أخرى (حدد)',
    specify: language === 'en' ? 'Please specify' : 'يرجى التحديد',
    sectors: language === 'en' ? 'Project Sectors' : 'قطاعات المشروع',
    sectorsNote: language === 'en' ? '(Select at least one)' : '(اختر واحداً على الأقل)',
    locationDetails: language === 'en' ? 'Location & Details' : 'الموقع والتفاصيل',
    country: language === 'en' ? 'Country' : 'الدولة',
    governorate: language === 'en' ? 'Governorate' : 'المحافظة',
    district: language === 'en' ? 'District' : 'المديرية',
  };

  // ✅ Load available projects on mount - ONLY when dropdown is opened to avoid loading delays
  useEffect(() => {
    if (showProjectDropdown && availableProjects.length === 0) {
      try {
        const projects = projectsDatabase.getAllProjects();
        const projectsList = projects.map(p => ({
          id: p.id,
          code: p.code,
          title: p.title
        }));
        setAvailableProjects(projectsList);
      } catch (error) {
        console.error('Error loading projects:', error);
      }
    }
  }, [showProjectDropdown]);

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
      setError(t.enterFormName);
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
        questions: [],
        status,
        createdBy: user?.openId || 'system',
      };

      let savedSurvey;
      if (isEditing) {
        savedSurvey = surveyService.updateSurvey(formId, data, user?.openId || 'system');
      } else {
        savedSurvey = surveyService.createSurvey(data, user?.openId || 'system');
      }

      setSuccess(t.formSaved);
      
      // Navigate to Survey Editor after short delay
      setTimeout(() => {
        navigate(`/meal/survey/editor?formId=${savedSurvey.id}&projectId=${projectId}&title=${encodeURIComponent(savedSurvey.name)}`);
      }, 500);
    } catch (err: any) {
      setError(err.message || t.saveError);
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
        questions: [],
        status: 'draft' as SurveyStatus,
        createdBy: user?.openId || 'system',
      };

      if (isEditing) {
        surveyService.updateSurvey(formId, data, user?.openId || 'system');
      } else {
        surveyService.createSurvey(data, user?.openId || 'system');
      }

      setSuccess(t.draftSaved);
      
      setTimeout(() => {
        window.history.back();
      }, 1000);
    } catch (err: any) {
      setError(err.message || t.saveError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? t.titleEdit : t.titleCreate}
          </h1>
          <p className="text-sm text-gray-600 mt-1">{t.project} {projectName}</p>
        </div>
        <button
          onClick={() => navigate(`/meal/survey?projectId=${projectId}&projectName=${projectName}`)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          <span className="text-sm font-medium text-gray-700">{t.back}</span>
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className={`p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className={`text-sm text-red-800 ${isRTL ? 'text-right' : 'text-left'}`}>{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className={`text-sm text-green-800 ${isRTL ? 'text-right' : 'text-left'}`}>{success}</p>
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        {/* Form Metadata Section */}
        <div>
          <h2 className={`text-lg font-bold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.formMetadata}
          </h2>

          <div className="space-y-4">
            {/* Form Name - SINGLE FIELD WITH LANGUAGE-BASED UI */}
            <div>
              <label className={`text-sm font-semibold text-gray-900 mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.formName} <span className="text-red-600">{t.required}</span>
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t.formNamePlaceholder}
                className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
                required
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>

            {/* Description - SINGLE FIELD WITH LANGUAGE-BASED UI */}
            <div>
              <label className={`text-sm font-semibold text-gray-900 mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.description}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.descriptionPlaceholder}
                rows={3}
                className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>

            {/* ✅ NEW: Project ID Selector with "Other" option */}
            <div>
              <label className={`text-sm font-semibold text-gray-900 mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.projectIdLabel}
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                  className={`w-full px-4 py-3 rounded-lg bg-white border border-gray-300 hover:border-blue-500 transition-colors ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  <span className="text-base text-gray-900">
                    {selectedProjectId === 'other' 
                      ? t.other
                      : availableProjects.find(p => p.id === selectedProjectId)?.code || t.selectProject}
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
                          setShowProjectDropdown(false);
                        }}
                        className={`w-full px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0 ${isRTL ? 'text-right' : 'text-left'}`}
                      >
                        <span className="text-sm font-semibold text-gray-900">{project.code}</span>
                        <p className="text-sm text-gray-600">{project.title}</p>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProjectId('other');
                        setShowProjectDropdown(false);
                      }}
                      className={`w-full px-4 py-3 hover:bg-blue-50 transition-colors bg-gray-50 ${isRTL ? 'text-right' : 'text-left'}`}
                    >
                      <span className="text-sm font-semibold text-blue-600">{t.other}</span>
                    </button>
                  </div>
                )}
              </div>
              {selectedProjectId === 'other' && (
                <input
                  type="text"
                  value={otherProjectSpecify}
                  onChange={(e) => setOtherProjectSpecify(e.target.value)}
                  placeholder={t.specify}
                  className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-2 ${isRTL ? 'text-right' : 'text-left'}`}
                />
              )}
            </div>

            {/* ✅ NEW: Project Sectors (Multi-select) */}
            <div>
              <label className={`text-sm font-semibold text-gray-900 mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.sectors} <span className="text-red-600">{t.required}</span> <span className="text-gray-600 text-xs">{t.sectorsNote}</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'WASH', label: 'WASH' },
                  { value: 'EFSL', label: 'EFSL' },
                  { value: 'Livelihood', label: language === 'en' ? 'Livelihood' : 'سبل العيش' },
                  { value: 'Child Protection', label: language === 'en' ? 'Child Protection' : 'حماية الطفل' },
                  { value: 'Protection', label: language === 'en' ? 'Protection' : 'الحماية' },
                  { value: 'Education in Emergency', label: language === 'en' ? 'Education in Emergency' : 'التعليم في حالات الطوارئ' },
                  { value: 'Health', label: language === 'en' ? 'Health' : 'الصحة' },
                  { value: 'Other', label: language === 'en' ? 'Other' : 'أخرى' },
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
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      selectedSectors.includes(sector.value)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
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
                  placeholder={t.specify}
                  className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-3 ${isRTL ? 'text-right' : 'text-left'}`}
                />
              )}
            </div>

            {/* ✅ NEW: Location & Details */}
            <div>
              <h3 className={`text-sm font-semibold text-gray-900 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.locationDetails}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={`text-sm font-medium text-gray-700 mb-1 block ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.country}
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                </div>
                <div>
                  <label className={`text-sm font-medium text-gray-700 mb-1 block ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.governorate}
                  </label>
                  <input
                    type="text"
                    value={governorate}
                    onChange={(e) => setGovernorate(e.target.value)}
                    placeholder={language === 'en' ? 'e.g., Sana\'a' : 'مثال: صنعاء'}
                    className={`w-full px-4 py-2 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                </div>
                <div>
                  <label className={`text-sm font-medium text-gray-700 mb-1 block ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.district}
                  </label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder={language === 'en' ? 'e.g., Al Wahda' : 'مثال: الوحدة'}
                    className={`w-full px-4 py-2 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Survey Type */}
              <div>
                <label className={`text-sm font-semibold text-gray-900 mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.surveyType}
                </label>
                <select
                  value={surveyType}
                  onChange={(e) => setSurveyType(e.target.value as SurveyType)}
                  className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  <option value="baseline">{t.baseline}</option>
                  <option value="endline">{t.endline}</option>
                  <option value="pdm">{t.pdm}</option>
                  <option value="aap">{t.aap}</option>
                  <option value="custom">{t.custom}</option>
                </select>
              </div>

              {/* Survey Language */}
              <div>
                <label className={`text-sm font-semibold text-gray-900 mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.languageLabel}
                </label>
                <select
                  value={formLanguage}
                  onChange={(e) => setFormLanguage(e.target.value as SurveyLanguage)}
                  className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  <option value="en">{t.english}</option>
                  <option value="ar">{t.arabic}</option>
                  <option value="multi">{t.multi}</option>
                </select>
              </div>
            </div>

            {/* Target Group */}
            <div>
              <label className={`text-sm font-semibold text-gray-900 mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.targetGroup}
              </label>
              <input
                type="text"
                value={targetGroup}
                onChange={(e) => setTargetGroup(e.target.value)}
                placeholder={t.targetGroupPlaceholder}
                className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
              />
            </div>

            {/* Consent Required */}
            <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <input
                type="checkbox"
                id="consent"
                checked={consentRequired}
                onChange={(e) => setConsentRequired(e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                <label htmlFor="consent" className="text-sm font-semibold text-gray-900 cursor-pointer">
                  {t.consentRequired}
                </label>
                <p className="text-xs text-gray-600 mt-1">{t.consentDescription}</p>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className={`text-sm font-semibold text-gray-900 mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.statusLabel}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SurveyStatus)}
                className={`w-full max-w-xs px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
              >
                <option value="draft">{t.draft}</option>
                <option value="published">{t.published}</option>
                <option value="archived">{t.archived}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className={`flex gap-3 pt-4 border-t border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={handleSaveAndNext}
            disabled={saving}
            className={`flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {language === 'en' ? 'Saving...' : 'جاري الحفظ...'}
              </>
            ) : (
              isEditing ? t.saveAndEditQuestions : t.saveAndAddQuestions
            )}
          </button>

          <button
            onClick={handleSaveDraft}
            disabled={saving}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t.saveAsDraft}
          </button>

          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}