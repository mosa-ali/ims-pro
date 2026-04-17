/**
 * ============================================================================
 * SURVEY EDITOR
 * ============================================================================
 * 
 * Converted from React Native to Web React
 * Advanced survey editor with question builder and offline support
 * 
 * FEATURES:
 * - Add/Edit/Delete questions
 * - Multiple question types (13 types)
 * - Drag to reorder questions
 * - Save draft/Publish
 * - Offline sync support
 * - Bilingual support (EN/AR) with RTL
 * 
 * ============================================================================
 */

import { useNavigate } from '@/lib/router-compat';
import { useSearch } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';
import { useState, useCallback, useEffect } from 'react';
import { 
 Loader2, Plus, Edit, Trash2, Save, Wifi, WifiOff, 
 Type, Hash, ListChecks, CheckSquare, HelpCircle, BarChart3,
 Calendar, Clock, MapPin, Upload, Star, ListOrdered, Grid3x3, 
 FileText, Image, Video, Mic, Camera, Link, Settings, Copy,
 GripVertical, ChevronDown, X, AlertTriangle, Eye, History, Rocket, ArrowLeft, ArrowRight } from 'lucide-react';
import { QuestionSettingsPanel } from '@/components/QuestionSettingsPanel';
import { FormPreview } from '@/components/FormPreview';
import { AddQuestionModal } from '@/components/AddQuestionModal';
import { FormStylePanel } from '@/components/FormStylePanel';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";
import { AlertCircle } from 'lucide-react';

type QuestionType =
 | 'select_one'
 | 'select_multiple'
 | 'text'
 | 'note'
 | 'integer'
 | 'decimal'
 | 'date'
 | 'time'
 | 'datetime'
 | 'range'
 | 'calculate'
 | 'photo'
 | 'audio'
 | 'video'
 | 'file'
 | 'geopoint'
 | 'geoline'
 | 'geoshape'
 | 'rating'
 | 'ranking'
 | 'matrix'
 | 'barcode'
 | 'acknowledge'
 | 'hidden'
 | 'xml_external';

interface Question {
 id: string;
 type: QuestionType;
 label: string;
 description?: string;
 required: boolean;
 options?: string[];
 constraint?: string;
 defaultValue?: string;
 calculation?: string;
 relevant?: string;
 appearance?: string;
 mediaQuality?: 'low' | 'normal' | 'high';
 gpsAccuracy?: number;
 minValue?: number;
 maxValue?: number;
}

const QUESTION_TYPES: { 
 type: QuestionType; 
 label: string; 
 labelAr: string; 
 description: string; 
 descriptionAr: string;
 category: string;
 categoryAr: string;
}[] = [
 // Selection & Text
 { type: 'select_one', label: 'Select One', labelAr: 'اختر واحد', description: 'Single choice from list', descriptionAr: 'اختيار واحد من القائمة', category: 'Selection & Text', categoryAr: 'الاختيار والنص' },
 { type: 'select_multiple', label: 'Select Many', labelAr: 'اختر متعدد', description: 'Multiple choices from list', descriptionAr: 'اختيارات متعددة من القائمة', category: 'Selection & Text', categoryAr: 'الاختيار والنص' },
 { type: 'text', label: 'Text', labelAr: 'نص', description: 'Free text input', descriptionAr: 'إدخال نص حر', category: 'Selection & Text', categoryAr: 'الاختيار والنص' },
 { type: 'note', label: 'Note', labelAr: 'ملاحظة', description: 'Display text only', descriptionAr: 'عرض نص فقط', category: 'Selection & Text', categoryAr: 'الاختيار والنص' },
 
 // Numeric & Date
 { type: 'integer', label: 'Integer', labelAr: 'عدد صحيح', description: 'Whole number', descriptionAr: 'رقم صحيح', category: 'Numeric & Date', categoryAr: 'رقمي وتاريخ' },
 { type: 'decimal', label: 'Decimal', labelAr: 'عشري', description: 'Decimal number', descriptionAr: 'رقم عشري', category: 'Numeric & Date', categoryAr: 'رقمي وتاريخ' },
 { type: 'date', label: 'Date', labelAr: 'تاريخ', description: 'Calendar date', descriptionAr: 'تاريخ بالتقويم', category: 'Numeric & Date', categoryAr: 'رقمي وتاريخ' },
 { type: 'time', label: 'Time', labelAr: 'وقت', description: 'Time of day', descriptionAr: 'وقت اليوم', category: 'Numeric & Date', categoryAr: 'رقمي وتاريخ' },
 { type: 'datetime', label: 'Date & Time', labelAr: 'تاريخ ووقت', description: 'Date and time', descriptionAr: 'تاريخ ووقت', category: 'Numeric & Date', categoryAr: 'رقمي وتاريخ' },
 { type: 'range', label: 'Range', labelAr: 'نطاق', description: 'Number range slider', descriptionAr: 'شريط نطاق رقمي', category: 'Numeric & Date', categoryAr: 'رقمي وتاريخ' },
 { type: 'calculate', label: 'Calculate', labelAr: 'حساب', description: 'Calculated field', descriptionAr: 'حقل محسوب', category: 'Numeric & Date', categoryAr: 'رقمي وتاريخ' },
 
 // Media
 { type: 'photo', label: 'Photo', labelAr: 'صورة', description: 'Capture photo', descriptionAr: 'التقاط صورة', category: 'Media', categoryAr: 'وسائط' },
 { type: 'audio', label: 'Audio', labelAr: 'صوت', description: 'Record audio', descriptionAr: 'تسجيل صوت', category: 'Media', categoryAr: 'وسائط' },
 { type: 'video', label: 'Video', labelAr: 'فيديو', description: 'Record video', descriptionAr: 'تسجيل فيديو', category: 'Media', categoryAr: 'وسائط' },
 { type: 'file', label: 'File', labelAr: 'ملف', description: 'Upload any file', descriptionAr: 'رفع أي ملف', category: 'Media', categoryAr: 'وسائط' },
 
 // Location & Geometry
 { type: 'geopoint', label: 'Point (GPS)', labelAr: 'نقطة (GPS)', description: 'GPS coordinates', descriptionAr: 'إحداثيات GPS', category: 'Location & Geometry', categoryAr: 'الموقع والهندسة' },
 { type: 'geoline', label: 'Line', labelAr: 'خط', description: 'GPS line path', descriptionAr: 'مسار خط GPS', category: 'Location & Geometry', categoryAr: 'الموقع والهندسة' },
 { type: 'geoshape', label: 'Area', labelAr: 'منطقة', description: 'GPS polygon area', descriptionAr: 'منطقة مضلعة GPS', category: 'Location & Geometry', categoryAr: 'الموقع والهندسة' },
 
 // Advanced
 { type: 'rating', label: 'Rating', labelAr: 'تقييم', description: 'Star rating', descriptionAr: 'تقييم بالنجوم', category: 'Advanced', categoryAr: 'متقدم' },
 { type: 'ranking', label: 'Ranking', labelAr: 'ترتيب', description: 'Rank items', descriptionAr: 'ترتيب العناصر', category: 'Advanced', categoryAr: 'متقدم' },
 { type: 'matrix', label: 'Question Matrix', labelAr: 'مصفوفة أسئلة', description: 'Grid of questions', descriptionAr: 'شبكة أسئلة', category: 'Advanced', categoryAr: 'متقدم' },
 { type: 'barcode', label: 'Barcode / QR Code', labelAr: 'باركود / رمز QR', description: 'Scan barcode', descriptionAr: 'مسح الباركود', category: 'Advanced', categoryAr: 'متقدم' },
 { type: 'acknowledge', label: 'Acknowledge', labelAr: 'إقرار', description: 'Checkbox acknowledgment', descriptionAr: 'مربع إ��رار', category: 'Advanced', categoryAr: 'متقدم' },
 { type: 'hidden', label: 'Hidden', labelAr: 'مخفي', description: 'Hidden field', descriptionAr: 'حل خفي', category: 'Advanced', categoryAr: 'متقدم' },
 { type: 'xml_external', label: 'External XML', labelAr: 'XML خارجي', description: 'External data source', descriptionAr: 'مصدر بيانات خارجي', category: 'Advanced', categoryAr: 'متقدم' },
];

// ✅ Icon mapping for each question type
const getQuestionIcon = (type: QuestionType) => {
 const { t } = useTranslation();
 const iconMap = {
 select_one: ListChecks,
 select_multiple: CheckSquare,
 text: Type,
 note: FileText,
 integer: Hash,
 decimal: Hash,
 date: Calendar,
 time: Clock,
 datetime: Calendar,
 range: BarChart3,
 calculate: Hash,
 photo: Camera,
 audio: Mic,
 video: Video,
 file: Upload,
 geopoint: MapPin,
 geoline: MapPin,
 geoshape: MapPin,
 rating: Star,
 ranking: ListOrdered,
 matrix: Grid3x3,
 barcode: Camera,
 acknowledge: CheckSquare,
 hidden: HelpCircle,
 xml_external: Link,
 };
 return iconMap[type] || Type;
};

export function SurveyEditor() {
 const navigate = useNavigate();
 const searchString = useSearch();
 const searchParams = new URLSearchParams(searchString);
 const { language, isRTL } = useLanguage();
 const { t } = useTranslation();
 const { currentOrganizationId } = useOrganization();
 const { currentOperatingUnitId } = useOperatingUnit();
 const [questions, setQuestions] = useState<Question[]>([]);
 const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
 const [newQuestion, setNewQuestion] = useState<Question | null>(null);
 const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
 const [showSettingsPanel, setShowSettingsPanel] = useState(false);
 const [settingsQuestionId, setSettingsQuestionId] = useState<string | null>(null);
 const [settingsTab, setSettingsTab] = useState<'options' | 'skip_logic' | 'validation'>('options');
 const [showPreview, setShowPreview] = useState(false);
 const [showFormStylePanel, setShowFormStylePanel] = useState(false);
 const [formStyle, setFormStyle] = useState<'default' | 'grid' | 'grid_caps' | 'multiple_pages' | 'grid_multiple' | 'grid_multiple_caps'>('default');
 const [surveyVersion, setSurveyVersion] = useState(1);
 const [isDeployed, setIsDeployed] = useState(false);
 const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
 const [lastModified, setLastModified] = useState(new Date());
 const [loading, setLoading] = useState(false);
 const [saving, setSaving] = useState(false);
 const [isOnline, setIsOnline] = useState(true);
 const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
 const [changeTypeQuestionId, setChangeTypeQuestionId] = useState<string | null>(null);

 const formId = searchParams.get('formId') || '';
 const projectId = searchParams.get('projectId') || '';
 const [surveyTitle, setSurveyTitle] = useState(searchParams.get('title') || 'Untitled Survey');
 const [scopeError, setScopeError] = useState(false);

 // ✅ FIXED: Check scope context on mount
 useEffect(() => {
   if (!currentOrganizationId || !currentOperatingUnitId) {
     setScopeError(true);
   } else {
     setScopeError(false);
   }
 }, [currentOrganizationId, currentOperatingUnitId]);

 // ✅ Load saved questions on mount (only if scope is valid)
 useEffect(() => {
 if (!currentOrganizationId || !currentOperatingUnitId) return;
 if (formId) {
 const surveyKey = `survey_questions_${formId}`;
 const storedData = localStorage.getItem(surveyKey);
 if (storedData) {
 try {
 const surveyData = JSON.parse(storedData);
 if (surveyData.questions && Array.isArray(surveyData.questions)) {
 setQuestions(surveyData.questions);
 setLastModified(new Date(surveyData.lastModified || Date.now()));
 }
 // ✅ Load survey title from localStorage if available
 if (surveyData.title) {
 setSurveyTitle(surveyData.title);
 }
 } catch (error) {
 console.error('Error loading survey questions:', error);
 }
 }
 
 // ✅ Also try to get title from the survey itself
 const surveysKey = 'meal_surveys';
 const storedSurveys = localStorage.getItem(surveysKey);
 if (storedSurveys) {
 try {
 const surveys = JSON.parse(storedSurveys);
 const currentSurvey = surveys.find((s: any) => s.id === formId);
 if (currentSurvey && currentSurvey.name) {
 setSurveyTitle(currentSurvey.name);
 }
 } catch (error) {
 console.error('Error loading survey from list:', error);
 }
 }
 }
 }, [formId]);

 const labels = {
 title: t.mealSurvey.surveyEditor,
 questionsAdded: t.mealSurvey.questionsAdded,
 question: t.mealSurvey.question,
 back: t.mealSurvey.back,
 online: t.mealSurvey.online,
 offline: t.mealSurvey.offlineMode,
 lastSaved: t.mealSurvey.lastSaved,
 noQuestions: t.mealSurvey.noQuestionsAddedYet,
 addQuestion: t.mealSurvey.addQuestion,
 saveAndContinue: t.mealSurvey.saveContinue,
 saveOffline: t.mealSurvey.saveOffline,
 selectType: t.mealSurvey.selectQuestionType,
 cancel: t.mealSurvey.cancel,
 edit: t.mealSurvey.edit,
 delete: t.mealSurvey.delete,
 required: t.mealSurvey.requiredField,
 validationError: t.mealSurvey.validationError,
 labelRequired: t.mealSurvey.questionLabelIsRequired,
 optionsRequired: t.mealSurvey.atLeast2OptionsAreRequired,
 version: t.mealSurvey.version,
 draft: t.mealSurvey.draft,
 deployed: t.mealSurvey.deployed,
 lastModified: t.mealSurvey.lastModified,
 unpublishedChanges: t.mealSurvey.youHaveUnpublishedChanges,
 editsNotAffectLive: t.mealSurvey.editsWillNotAffectLiveData,
 deploy: t.mealSurvey.deploy,
 redeploy: t.mealSurvey.redeploy,
 versionHistory: t.mealSurvey.versionHistory,
 previewForm: t.mealSurvey.previewForm,
 formStyle: t.mealSurvey.formStyle,
 defaultSinglePage: t.mealSurvey.defaultSinglePage,
 gridTheme: t.mealSurvey.gridTheme,
 gridThemeCaps: t.mealSurvey.gridThemeAllCaps,
 multiplePages: t.mealSurvey.multiplePages,
 gridMultiple: t.mealSurvey.gridMultiplePages,
 gridMultipleCaps: t.mealSurvey.gridMultiplePagesCaps,
 confirmDelete: t.mealSurvey.areYouSureYouWantTo,
 atLeastOne: t.mealSurvey.addAtLeastOneQuestionBefore,
 savedSuccess: t.mealSurvey.formSavedSuccessfully4,
 saveError: t.mealSurvey.errorSavingForm,
 };

 const handleAddQuestion = (type: QuestionType) => {
 const newQuestion: Question = {
 id: `q_${Date.now()}`,
 type,
 label: '',
 description: '',
 required: false,
 options: type === 'select_one' || type === 'select_multiple' ? ['Option 1', 'Option 2'] : undefined,
 };
 setNewQuestion(newQuestion);
 setShowAddQuestionModal(true);
 };

 // Handler to immediately add a blank question (inline editing)
 const handleAddQuestionDirect = () => {
 const newQuestion: Question = {
 id: `q_${Date.now()}`,
 type: 'text', // Default to text type
 label: '',
 description: '',
 required: false,
 };
 setQuestions([...questions, newQuestion]);
 setHasUnpublishedChanges(true);
 setLastModified(new Date());
 // Auto-focus on the new question (we'll add this via state)
 setEditingQuestionId(newQuestion.id);
 };

 const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

 const handleUpdateQuestionInline = (questionId: string, updates: Partial<Question>) => {
 setQuestions(questions.map(q => q.id === questionId ? { ...q, ...updates } : q));
 setHasUnpublishedChanges(true);
 setLastModified(new Date());
 };

 const handleSaveQuestion = useCallback(() => {
 if (!editingQuestion?.label.trim()) {
 alert(labels.labelRequired);
 return;
 }

 if (
 (editingQuestion.type === 'select_one' || editingQuestion.type === 'select_multiple') &&
 (!editingQuestion.options || editingQuestion.options.length < 2)
 ) {
 alert(labels.optionsRequired);
 return;
 }

 const existingIndex = questions.findIndex((q) => q.id === editingQuestion.id);
 let updated: Question[];
 if (existingIndex >= 0) {
 updated = [...questions];
 updated[existingIndex] = editingQuestion;
 } else {
 updated = [...questions, editingQuestion];
 }
 setQuestions(updated);
 setEditingQuestion(null);
 }, [editingQuestion, questions, t]);

 const handleDeleteQuestion = useCallback(
 (id: string) => {
 if (window.confirm(labels.confirmDelete)) {
 setQuestions(questions.filter((q) => q.id !== id));
 }
 },
 [questions, t]
 );

 const handleSaveForm = useCallback(async () => {
 if (questions.length === 0) {
 alert(labels.atLeastOne);
 return;
 }

 setSaving(true);
 try {
 // ✅ CRITICAL: Save questions to localStorage
 const surveyKey = `survey_questions_${formId}`;
 const surveyData = {
 formId,
 projectId,
 title: surveyTitle,
 questions,
 lastModified: new Date().toISOString(),
 questionCount: questions.length,
 status: 'draft',
 version: 'v1',
 };
 
 localStorage.setItem(surveyKey, JSON.stringify(surveyData));
 
 // ✅ Update survey metadata in surveys list
 const surveysKey = 'meal_surveys';
 const storedSurveys = localStorage.getItem(surveysKey);
 if (storedSurveys) {
 const surveys = JSON.parse(storedSurveys);
 const updatedSurveys = surveys.map((s: any) => {
 if (s.id === formId) {
 return {
 ...s,
 questionCount: questions.length,
 lastModified: new Date().toISOString(),
 status: questions.length > 0 ? 'undeployed' : 'draft',
 };
 }
 return s;
 });
 localStorage.setItem(surveysKey, JSON.stringify(updatedSurveys));
 }
 
 await new Promise((resolve) => setTimeout(resolve, 1000));
 setLastSyncTime(new Date());
 setHasUnpublishedChanges(false);
 alert(labels.savedSuccess);
 navigate('/organization/meal/survey');
 } catch (error) {
 alert(labels.saveError);
 } finally {
 setSaving(false);
 }
 }, [questions, t, navigate, formId, projectId, surveyTitle]);

 // ✅ Show error if scope context is missing
 if (scopeError) {
   return (
     <div className={`min-h-screen bg-gray-50 flex items-center justify-center ${isRTL ? 'rtl' : 'ltr'}`}>
       <div className="max-w-md w-full">
         <div className="bg-white rounded-lg shadow-lg p-6">
           <div className="flex items-start gap-4">
             <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
             <div>
               <h2 className="text-lg font-semibold text-gray-900 mb-2">Missing Scope Context</h2>
               <p className="text-sm text-gray-600">Organization and Operating Unit must be selected.</p>
             </div>
           </div>
         </div>
       </div>
     </div>
   );
 }

 if (loading) {
 return (
 <div className="flex items-center justify-center min-h-screen" dir={isRTL ? 'rtl' : 'ltr'}>
 <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-gray-50 p-6 space-y-6">
 {/* Back Navigation */}
 <BackButton onClick={() => navigate('/organization/meal/survey')} label={t.mealSurvey.backToSurveys} />
 {/* Header */}
 <div className={`flex items-center justify-between`}>
 <div className={`flex-1 text-start`}>
 <h1 className="text-2xl font-bold text-gray-900">{labels.title}</h1>
 <p className="text-sm text-gray-600">
 {questions.length} {questions.length === 1 ? labels.question : labels.questionsAdded}
 </p>
 </div>
 </div>

 {/* Sync Status */}
 <div
 className={`p-3 rounded-lg flex items-center justify-between ${ t.mealSurvey.borderl4 }`}
 style={{
 backgroundColor: isOnline ? '#ECFDF5' : '#FEF3C7',
 borderColor: isOnline ? '#10B981' : '#F59E0B',
 }}
 >
 <div className={`flex-1 text-start`}>
 <div className={`flex items-center gap-2`}>
 {isOnline ? <Wifi className="w-4 h-4 text-green-600" /> : <WifiOff className="w-4 h-4 text-orange-600" />}
 <span className="text-xs font-semibold" style={{ color: isOnline ? '#10B981' : '#F59E0B' }}>
 {isOnline ? labels.online : labels.offline}
 </span>
 </div>
 {lastSyncTime && (
 <p className="text-xs text-gray-600 mt-1">
 {labels.lastSaved} {lastSyncTime.toLocaleTimeString()}
 </p>
 )}
 </div>
 </div>

 {/* ✅ VERSION & DEPLOYMENT STATUS */}
 <div className="bg-white border border-gray-200 rounded-lg p-4">
 <div className={`flex items-center justify-between`}>
 {/* Left Side: Version Info */}
 <div className={`space-y-2 text-start`}>
 <div className={`flex items-center gap-3`}>
 <div className={`flex items-center gap-2`}>
 <span className="text-sm font-semibold text-gray-700">{labels.version}:</span>
 <span className="text-sm font-bold text-blue-600">v{surveyVersion}</span>
 </div>
 <div className="w-px h-4 bg-gray-300" />
 <div className={`flex items-center gap-2`}>
 <div className={`px-2 py-1 rounded-full text-xs font-semibold ${ isDeployed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700' }`}>
 {isDeployed ? labels.deployed : labels.draft}
 </div>
 </div>
 </div>
 <p className="text-xs text-gray-500">
 {labels.lastModified}: {lastModified.toLocaleDateString()} {lastModified.toLocaleTimeString()}
 </p>
 <p className="text-xs text-gray-600">
 {questions.length} {questions.length === 1 ? labels.question : labels.questionsAdded}
 </p>
 </div>

 {/* Right Side: Action Buttons */}
 <div className={`flex items-center gap-2`}>
 <button
 onClick={() => setShowPreview(true)}
 disabled={questions.length === 0}
 className="px-4 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
 >
 <Eye className="w-4 h-4" />
 <span className="text-sm font-medium text-gray-700">{labels.previewForm}</span>
 </button>
 
 <button
 onClick={() => setShowFormStylePanel(true)}
 className="px-4 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors flex items-center gap-2"
 >
 <Settings className="w-4 h-4" />
 <span className="text-sm font-medium text-gray-700">{labels.formStyle}</span>
 </button>

 <button
 onClick={() => alert('Version history feature')}
 className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
 title={labels.versionHistory}
 >
 <History className="w-4 h-4 text-gray-700" />
 </button>

 <button
 onClick={() => {
 setIsDeployed(true);
 setHasUnpublishedChanges(false);
 setSurveyVersion(v => v + 1);
 
 // ✅ Update survey status in localStorage
 const surveysKey = 'meal_surveys';
 const storedSurveys = localStorage.getItem(surveysKey);
 if (storedSurveys) {
 const surveys = JSON.parse(storedSurveys);
 const updatedSurveys = surveys.map((s: any) => {
 if (s.id === formId) {
 return {
 ...s,
 status: 'published',
 publishedAt: new Date().toISOString(),
 version: surveyVersion + 1,
 };
 }
 return s;
 });
 localStorage.setItem(surveysKey, JSON.stringify(updatedSurveys));
 }
 
 // ✅ Update survey_questions with deployment info
 const surveyKey = `survey_questions_${formId}`;
 const storedData = localStorage.getItem(surveyKey);
 if (storedData) {
 const surveyData = JSON.parse(storedData);
 surveyData.status = 'published';
 surveyData.publishedAt = new Date().toISOString();
 surveyData.version = surveyVersion + 1;
 localStorage.setItem(surveyKey, JSON.stringify(surveyData));
 }
 
 alert(isDeployed ? labels.redeploy + ' successful!' : labels.deploy + ' successful!');
 }}
 disabled={questions.length === 0}
 className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
 >
 <Rocket className="w-4 h-4 text-white" />
 <span className="text-sm font-semibold text-white">
 {isDeployed ? labels.redeploy : labels.deploy}
 </span>
 </button>
 </div>
 </div>

 {/* Unpublished Changes Warning */}
 {hasUnpublishedChanges && (
 <div className={`mt-3 p-3 rounded-lg bg-orange-50 border border-orange-200 flex items-start gap-3`}>
 <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
 <div className={`flex-1 text-start`}>
 <p className="text-sm font-semibold text-orange-900">⚠️ {labels.unpublishedChanges}</p>
 <p className="text-xs text-orange-700 mt-0.5">{labels.editsNotAffectLive}</p>
 </div>
 </div>
 )}
 </div>

 {/* Questions List */}
 {questions.length > 0 ? (
 <div className="space-y-2">
 {questions.map((question, index) => {
 const questionType = QUESTION_TYPES.find((t) => t.type === question.type);
 const Icon = questionType ? getQuestionIcon(questionType.type) : Type;
 
 return (
 <div 
 key={question.id} 
 className="bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
 >
 {/* Question Row */}
 <div className={`flex items-center gap-3 p-4`}>
 {/* Drag Handle */}
 <div className="flex-shrink-0 cursor-move text-gray-400 hover:text-gray-600">
 <GripVertical className="w-5 h-5" />
 </div>
 
 {/* Question Type Icon - Click to change type */}
 <button 
 onClick={() => {
 setChangeTypeQuestionId(question.id);
 setShowAddQuestionModal(true);
 }}
 className="flex-shrink-0 hover:opacity-70 transition-opacity"
 title={t.mealSurvey.changeQuestionType}
 >
 <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center">
 <Icon className="w-5 h-5 text-gray-600" />
 </div>
 </button>
 
 {/* Question Content - Editable Inline */}
 <div className={`flex-1 min-w-0 space-y-1 text-start`}>
 {/* Editable Question Label */}
 <input
 type="text"
 value={question.label}
 onChange={(e) => handleUpdateQuestionInline(question.id, { label: e.target.value })}
 placeholder={t.mealSurvey.untitledQuestion}
 className={`w-full text-sm font-semibold text-gray-900 bg-transparent border-none outline-none focus:ring-0 p-0 ${ 'text-start' }`}
 />
 {/* Editable Question Description */}
 <input
 type="text"
 value={question.description || ''}
 onChange={(e) => handleUpdateQuestionInline(question.id, { description: e.target.value })}
 placeholder={t.mealSurvey.questionHint}
 className={`w-full text-xs text-gray-500 bg-transparent border-none outline-none focus:ring-0 p-0 ${ 'text-start' }`}
 />
 </div>
 
 {/* Action Buttons */}
 <div className={`flex items-center gap-1 flex-shrink-0`}>
 {/* Settings Button */}
 <button
 onClick={() => {
 setSettingsQuestionId(question.id);
 setShowSettingsPanel(true);
 setSettingsTab('options');
 }}
 className="p-2 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
 title={t.mealSurvey.settings}
 >
 <Settings className="w-4 h-4" />
 </button>
 
 {/* Delete Button */}
 <button
 onClick={() => handleDeleteQuestion(question.id)}
 className="p-2 rounded-md hover:bg-red-50 text-gray-600 hover:text-red-600 transition-colors"
 title={t.mealSurvey.delete}
 >
 <Trash2 className="w-4 h-4" />
 </button>
 
 {/* Duplicate Button */}
 <button
 onClick={() => {
 const duplicated: Question = {
 ...question,
 id: `q_${Date.now()}`,
 label: `${question.label} (Copy)`,
 };
 setQuestions([...questions, duplicated]);
 }}
 className="p-2 rounded-md hover:bg-blue-50 text-gray-600 hover:text-blue-600 transition-colors"
 title={t.mealSurvey.duplicate}
 >
 <Copy className="w-4 h-4" />
 </button>
 
 {/* Expand/Collapse Button */}
 <button
 className="p-2 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
 title={t.mealSurvey.expand}
 >
 <ChevronDown className="w-4 h-4" />
 </button>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 ) : (
 <div className="text-center py-8">
 <p className="text-gray-500">{labels.noQuestions}</p>
 </div>
 )}

 {/* Add Question Button */}
 <button
 onClick={() => setShowAddQuestionModal(true)}
 className="w-full rounded-lg py-4 border-2 border-dashed border-blue-600 hover:bg-blue-50 transition-colors"
 >
 <span className="font-semibold text-blue-600 text-base">{labels.addQuestion}</span>
 </button>

 {/* Save Button */}
 <button
 onClick={handleSaveForm}
 disabled={saving || questions.length === 0}
 className="w-full rounded-lg py-4 bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
 >
 {saving ? (
 <Loader2 className="w-5 h-5 text-white animate-spin mx-auto" />
 ) : (
 <span className="font-semibold text-white text-base">
 {isOnline ? labels.saveAndContinue : labels.saveOffline}
 </span>
 )}
 </button>

 {/* Add Question Modal */}
 {showAddQuestionModal && (
 <AddQuestionModal
 onSave={(question) => {
 setQuestions([...questions, question]);
 setHasUnpublishedChanges(true);
 setLastModified(new Date());
 }}
 onClose={() => setShowAddQuestionModal(false)}
 />
 )}

 {/* Edit Question Modal */}
 {editingQuestion && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
 {/* Header */}
 <div className={`px-6 py-4 border-b border-gray-200 flex items-center justify-between`}>
 <h2 className={`text-lg font-bold text-gray-900 text-start`}>
 {t.mealSurvey.editQuestion}
 </h2>
 <button
 onClick={() => setEditingQuestion(null)}
 className="text-gray-400 hover:text-gray-600 transition-colors p-1"
 >
 <span className="text-2xl leading-none">×</span>
 </button>
 </div>

 {/* Form Content */}
 <div className="flex-1 overflow-y-auto p-6 space-y-5">
 {/* Question Label */}
 <div>
 <label className={`text-sm font-semibold text-gray-700 mb-2 block text-start`}>
 {t.mealSurvey.questionLabel} 
 <span className="text-red-500 ms-1">*</span>
 </label>
 <input
 type="text"
 value={editingQuestion.label}
 onChange={(e) => setEditingQuestion({ ...editingQuestion, label: e.target.value })}
 placeholder={t.mealSurvey.enterQuestionText}
 className={`w-full px-4 py-2.5 rounded-lg text-sm bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${ 'text-start' }`}
 />
 </div>

 {/* Question Description */}
 <div>
 <label className={`text-sm font-semibold text-gray-700 mb-2 block text-start`}>
 {t.mealSurvey.descriptionOptional}
 </label>
 <textarea
 value={editingQuestion.description || ''}
 onChange={(e) => setEditingQuestion({ ...editingQuestion, description: e.target.value })}
 placeholder={t.mealSurvey.addADescriptionOrHint}
 rows={2}
 className={`w-full px-4 py-2.5 rounded-lg text-sm bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none ${ 'text-start' }`}
 />
 </div>

 {/* Question Type Display */}
 <div>
 <label className={`text-sm font-semibold text-gray-700 mb-2 block text-start`}>
 {t.mealSurvey.questionType}
 </label>
 <div className="px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200">
 <span className="text-sm text-gray-800 font-medium">
 {language === 'en' 
 ? QUESTION_TYPES.find(t => t.type === editingQuestion.type)?.label 
 : QUESTION_TYPES.find(t => t.type === editingQuestion.type)?.labelAr
 }
 </span>
 </div>
 </div>

 {/* ✅ DYNAMIC FIELDS BASED ON QUESTION TYPE */}
 
 {/* Choice Options (for select_one, select_multiple, ranking, rating) */}
 {(editingQuestion.type === 'select_one' || editingQuestion.type === 'select_multiple' || editingQuestion.type === 'ranking') && (
 <div>
 <label className={`text-sm font-semibold text-gray-700 mb-2 block text-start`}>
 {t.mealSurvey.options}
 <span className="text-red-500 ms-1">*</span>
 </label>
 <div className="space-y-2">
 {(editingQuestion.options || []).map((option, idx) => (
 <div key={idx} className={`flex gap-2`}>
 <input
 type="text"
 value={option}
 onChange={(e) => {
 const newOptions = [...(editingQuestion.options || [])];
 newOptions[idx] = e.target.value;
 setEditingQuestion({ ...editingQuestion, options: newOptions });
 }}
 placeholder={`${t.mealSurvey.option} ${idx + 1}`}
 className={`flex-1 px-4 py-2 rounded-lg text-sm bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${ 'text-start' }`}
 />
 <button
 onClick={() => {
 const newOptions = (editingQuestion.options || []).filter((_, i) => i !== idx);
 setEditingQuestion({ ...editingQuestion, options: newOptions });
 }}
 className="px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 ))}
 <button
 onClick={() => {
 const newOptions = [...(editingQuestion.options || []), ''];
 setEditingQuestion({ ...editingQuestion, options: newOptions });
 }}
 className="w-full px-4 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors text-sm font-medium"
 >
 + {t.mealSurvey.addOption}
 </button>
 </div>
 </div>
 )}

 {/* Number Range (for integer, decimal, range) */}
 {(editingQuestion.type === 'integer' || editingQuestion.type === 'decimal' || editingQuestion.type === 'range') && (
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={`text-sm font-semibold text-gray-700 mb-2 block text-start`}>
 {t.mealSurvey.minimumValue}
 </label>
 <input
 type="number"
 value={editingQuestion.minValue || ''}
 onChange={(e) => setEditingQuestion({ ...editingQuestion, minValue: parseFloat(e.target.value) })}
 placeholder={t.mealSurvey.min}
 className={`w-full px-4 py-2.5 rounded-lg text-sm bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${ 'text-start' }`}
 />
 </div>
 <div>
 <label className={`text-sm font-semibold text-gray-700 mb-2 block text-start`}>
 {t.mealSurvey.maximumValue}
 </label>
 <input
 type="number"
 value={editingQuestion.maxValue || ''}
 onChange={(e) => setEditingQuestion({ ...editingQuestion, maxValue: parseFloat(e.target.value) })}
 placeholder={t.mealSurvey.max}
 className={`w-full px-4 py-2.5 rounded-lg text-sm bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${ 'text-start' }`}
 />
 </div>
 </div>
 )}

 {/* Calculation Formula (for calculate type) */}
 {editingQuestion.type === 'calculate' && (
 <div>
 <label className={`text-sm font-semibold text-gray-700 mb-2 block text-start`}>
 {t.mealSurvey.calculationFormula}
 <span className="text-red-500 ms-1">*</span>
 </label>
 <input
 type="text"
 value={editingQuestion.calculation || ''}
 onChange={(e) => setEditingQuestion({ ...editingQuestion, calculation: e.target.value })}
 placeholder={t.mealSurvey.egAge2}
 className={`w-full px-4 py-2.5 rounded-lg text-sm bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono ${ 'text-start' }`}
 />
 <p className="text-xs text-gray-500 mt-1">
 {t.mealSurvey.useFieldnameToReferenceOtherFields}
 </p>
 </div>
 )}

 {/* Media Quality (for photo, video, audio) */}
 {(editingQuestion.type === 'photo' || editingQuestion.type === 'video' || editingQuestion.type === 'audio') && (
 <div>
 <label className={`text-sm font-semibold text-gray-700 mb-2 block text-start`}>
 {t.mealSurvey.mediaQuality}
 </label>
 <select
 value={editingQuestion.mediaQuality || 'normal'}
 onChange={(e) => setEditingQuestion({ ...editingQuestion, mediaQuality: e.target.value as 'low' | 'normal' | 'high' })}
 className={`w-full px-4 py-2.5 rounded-lg text-sm bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${ 'text-start' }`}
 >
 <option value="low">{t.mealSurvey.lowFasterUpload}</option>
 <option value="normal">{t.mealSurvey.normalRecommended}</option>
 <option value="high">{t.mealSurvey.highBestQuality}</option>
 </select>
 </div>
 )}

 {/* GPS Accuracy (for geopoint, geoline, geoshape) */}
 {(editingQuestion.type === 'geopoint' || editingQuestion.type === 'geoline' || editingQuestion.type === 'geoshape') && (
 <div>
 <label className={`text-sm font-semibold text-gray-700 mb-2 block text-start`}>
 {t.mealSurvey.gpsAccuracyMeters}
 </label>
 <input
 type="number"
 value={editingQuestion.gpsAccuracy || 10}
 onChange={(e) => setEditingQuestion({ ...editingQuestion, gpsAccuracy: parseInt(e.target.value) })}
 placeholder="10"
 className={`w-full px-4 py-2.5 rounded-lg text-sm bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${ 'text-start' }`}
 />
 <p className="text-xs text-gray-500 mt-1">
 {t.mealSurvey.lowerValuesRequireMoreAccuracy}
 </p>
 </div>
 )}

 {/* Default Value (for text, integer, decimal, hidden) */}
 {(editingQuestion.type === 'text' || editingQuestion.type === 'integer' || editingQuestion.type === 'decimal' || editingQuestion.type === 'hidden') && (
 <div>
 <label className={`text-sm font-semibold text-gray-700 mb-2 block text-start`}>
 {t.mealSurvey.defaultValueOptional}
 </label>
 <input
 type={editingQuestion.type === 'integer' || editingQuestion.type === 'decimal' ? 'number' : 'text'}
 value={editingQuestion.defaultValue || ''}
 onChange={(e) => setEditingQuestion({ ...editingQuestion, defaultValue: e.target.value })}
 placeholder={t.mealSurvey.enterDefaultValue}
 className={`w-full px-4 py-2.5 rounded-lg text-sm bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${ 'text-start' }`}
 />
 </div>
 )}

 {/* Visibility Logic (for all types except note) */}
 {editingQuestion.type !== 'note' && (
 <div>
 <label className={`text-sm font-semibold text-gray-700 mb-2 block text-start`}>
 {t.mealSurvey.visibilityLogicOptional}
 </label>
 <input
 type="text"
 value={editingQuestion.relevant || ''}
 onChange={(e) => setEditingQuestion({ ...editingQuestion, relevant: e.target.value })}
 placeholder={t.mealSurvey.egAge18}
 className={`w-full px-4 py-2.5 rounded-lg text-sm bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono ${ 'text-start' }`}
 />
 <p className="text-xs text-gray-500 mt-1">
 {t.mealSurvey.showThisQuestionOnlyWhenCondition}
 </p>
 </div>
 )}

 {/* Constraint/Validation (for text, integer, decimal) */}
 {(editingQuestion.type === 'text' || editingQuestion.type === 'integer' || editingQuestion.type === 'decimal') && (
 <div>
 <label className={`text-sm font-semibold text-gray-700 mb-2 block text-start`}>
 {t.mealSurvey.validationRuleOptional}
 </label>
 <input
 type="text"
 value={editingQuestion.constraint || ''}
 onChange={(e) => setEditingQuestion({ ...editingQuestion, constraint: e.target.value })}
 placeholder={t.mealSurvey.eg18}
 className={`w-full px-4 py-2.5 rounded-lg text-sm bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono ${ 'text-start' }`}
 />
 <p className="text-xs text-gray-500 mt-1">
 {t.mealSurvey.useToReferToThisQuestions}
 </p>
 </div>
 )}

 {/* Appearance (for all types) */}
 <div>
 <label className={`text-sm font-semibold text-gray-700 mb-2 block text-start`}>
 {t.mealSurvey.appearanceOptional}
 </label>
 <select
 value={editingQuestion.appearance || ''}
 onChange={(e) => setEditingQuestion({ ...editingQuestion, appearance: e.target.value })}
 className={`w-full px-4 py-2.5 rounded-lg text-sm bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${ 'text-start' }`}
 >
 <option value="">{t.mealSurvey.default}</option>
 {editingQuestion.type === 'text' && (
 <>
 <option value="multiline">{t.mealSurvey.multiline}</option>
 <option value="numbers">{t.mealSurvey.numbersKeyboard}</option>
 </>
 )}
 {(editingQuestion.type === 'select_one' || editingQuestion.type === 'select_multiple') && (
 <>
 <option value="minimal">{t.mealSurvey.dropdown}</option>
 <option value="compact">{t.mealSurvey.compact}</option>
 <option value="quick">{t.mealSurvey.quickSelect}</option>
 </>
 )}
 </select>
 </div>

 {/* Required Toggle */}
 <div className={`flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-200`}>
 <div className={`text-start`}>
 <p className="text-sm font-semibold text-gray-800">
 {t.mealSurvey.required}
 </p>
 <p className="text-xs text-gray-500 mt-0.5">
 {t.mealSurvey.usersMustAnswerThisQuestion}
 </p>
 </div>
 <button
 onClick={() => setEditingQuestion({ ...editingQuestion, required: !editingQuestion.required })}
 className={`relative w-11 h-6 rounded-full transition-colors ${ editingQuestion.required ? 'bg-blue-600' : 'bg-gray-300' }`}
 >
 <span 
 className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${ editingQuestion.required ? ('left-5') : ('left-0.5') }`}
 />
 </button>
 </div>
 </div>

 {/* Footer Actions */}
 <div className={`px-6 py-4 border-t border-gray-100 flex gap-3`}>
 <button
 onClick={handleSaveQuestion}
 className="flex-1 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
 >
 <span className="font-semibold text-white text-sm">
 {t.mealSurvey.saveQuestion}
 </span>
 </button>

 <button
 onClick={() => setEditingQuestion(null)}
 className="px-6 py-2.5 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
 >
 <span className="font-medium text-gray-700 text-sm">{labels.cancel}</span>
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Settings Panel */}
 {showSettingsPanel && settingsQuestionId && (() => {
 const currentQuestion = questions.find(q => q.id === settingsQuestionId);
 if (!currentQuestion) return null;
 
 return (
 <QuestionSettingsPanel
 question={currentQuestion}
 allQuestions={questions}
 onUpdate={(updatedQuestion) => {
const updatedQuestions: Question[] = questions.map(q =>
  q.id === updatedQuestion.id
    ? (updatedQuestion as Question)
    : q
);
 }}
 onClose={() => setShowSettingsPanel(false)}
 />
 );
 })()}

 {/* Form Preview */}
 {showPreview && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
 {/* Header */}
 <div className={`px-6 py-4 border-b border-gray-200 flex items-center justify-between`}>
 <h2 className={`text-lg font-bold text-gray-900 text-start`}>
 {t.mealSurvey.formPreview}
 </h2>
 <button
 onClick={() => setShowPreview(false)}
 className="text-gray-400 hover:text-gray-600 transition-colors p-1"
 >
 <span className="text-2xl leading-none">×</span>
 </button>
 </div>

 {/* Preview Content */}
 <div className="flex-1 overflow-y-auto p-6">
 <FormPreview
 surveyTitle={surveyTitle}
 questions={questions}
 formStyle={formStyle}
 isRTL={isRTL}
 language={language}
 onClose={() => setShowPreview(false)}
 />
 </div>

 {/* Footer Actions */}
 <div className={`px-6 py-4 border-t border-gray-100 flex gap-3`}>
 <button
 onClick={() => setShowPreview(false)}
 className="flex-1 px-6 py-2.5 rounded-lg bg-gray-600 hover:bg-gray-700 transition-colors"
 >
 <span className="font-semibold text-white text-sm">
 {t.mealSurvey.close}
 </span>
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Form Style Panel */}
 {showFormStylePanel && (
 <FormStylePanel
 currentStyle={formStyle}
 onUpdate={(newStyle) => {
 setFormStyle(newStyle);
 setHasUnpublishedChanges(true);
 }}
 onClose={() => setShowFormStylePanel(false)}
 />
 )}
 </div>
 );
}
