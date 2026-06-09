/**
 * ============================================================================
 * SURVEY TEMPLATES - REAL DATA IMPLEMENTATION
 * ============================================================================
 * 
 * Browse and manage survey templates library
 * 
 * FEATURES:
 * - Real templates from service
 * - Search templates
 * - View template details
 * - Create new template
 * - Use/Edit templates
 * - Template metadata display
 * - Bilingual support (EN/AR) with RTL
 * 
 * ============================================================================
 */

import { useNavigate } from '@/lib/router-compat';
import { useSearch } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Play } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function SurveyTemplates() {
 const { t } = useTranslation();
 const navigate = useNavigate();
 const { language, isRTL } = useLanguage();
 const searchString = useSearch();
 const searchParams = new URLSearchParams(searchString);
 const { currentOrganizationId } = useOrganization();
 const { currentOperatingUnitId } = useOperatingUnit();
 const [searchQuery, setSearchQuery] = useState('');
 const [templates, setTemplates] = useState<any[]>([]);

 const projectId = searchParams.get('projectId') || '';
 const projectName = searchParams.get('projectName') || '';

 // ✅ Use tRPC query for templates
 const { data: templatesData = [], isLoading } = trpc.mealSurveys.getAll.useQuery(
   { isTemplate: true },
   { enabled: !!currentOrganizationId && !!currentOperatingUnitId }
 );

 const labels = {
 title: t.mealSurvey.surveyDataCollection,
 createTemplate: t.mealSurvey.createTemplate,
 back: t.mealSurvey.back,
 searchPlaceholder: t.mealSurvey.searchTemplates,
 questions: t.mealSurvey.questions,
 created: t.mealSurvey.created,
 use: t.mealSurvey.use,
 edit: t.mealSurvey.edit,
 noTemplates: t.mealSurvey.noTemplatesFound,
 createFirst: t.mealSurvey.createYourFirstSurveyTemplateTo,
 };

 // ✅ Update templates from tRPC data
 useEffect(() => {
 setTemplates(templatesData);
 }, [templatesData]);

 const filteredTemplates = templates.filter(
 (t) =>
 (t.title || t.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
 (t.description || '').toLowerCase().includes(searchQuery.toLowerCase())
 );

 const handleUseTemplate = (templateId: string) => {
 // Navigate to survey creation with template
 navigate(`/organization/meal/survey/create?projectId=${projectId}&projectName=${projectName}&templateId=${templateId}`);
 };

 const handleEditTemplate = (templateId: string) => {
 // Navigate to the survey detail view to edit template
 navigate(`/organization/meal/survey/detail/${templateId}?projectId=${projectId}&projectName=${projectName}&tab=form`);
 };

 const formatDate = (dateString: string) => {
 return new Date(dateString).toLocaleDateString(t.mealSurvey.enus, {
 month: 'numeric',
 day: 'numeric',
 year: 'numeric'
 });
 };

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Back Navigation */}
 <BackButton onClick={() => navigate('/organization/meal/survey')} label={t.mealSurvey.backToSurveys} />
 {/* Header */}
 <div className={`flex items-center justify-between pb-6 border-b border-gray-200`}>
 <h1 className="text-2xl font-bold text-gray-900">{labels.title}</h1>
 <div className={`flex gap-2`}>
 <button
 onClick={() => navigate('/organization/meal/survey/editor')}
 className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
 >
 <span className="text-sm font-semibold text-white flex items-center gap-2">
 <Plus className="w-4 h-4" /> {labels.createTemplate}
 </span>
 </button>
 </div>
 </div>

 {/* Search */}
 <div className="relative">
 <Search className={`absolute top-3 w-5 h-5 text-gray-400 ${'start-4'}`} />
 <input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder={labels.searchPlaceholder}
 className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${ t.mealSurvey.pl12 }`}
 />
 </div>

 {/* Templates List */}
 <div className="space-y-4">
 {filteredTemplates.map((template) => (
 <div
 key={template.id}
 className="rounded-xl p-6 bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
 >
 <div className={`flex items-start justify-between mb-3`}>
 <div className={`flex-1 text-start`}>
 <h2 className="text-lg font-bold text-gray-900 mb-2">
 {language === 'en' ? template.name : template.nameAr || template.name}
 </h2>
 <p className="text-sm text-gray-600 mb-3">
 {language === 'en' ? template.description : template.descriptionAr || template.description}
 </p>
 </div>
 </div>

 <div className={`flex items-center justify-between`}>
 <div className={`flex gap-4`}>
 <div className={'text-start'}>
 <p className="text-xs text-gray-600">{labels.questions}</p>
 <p className="text-base font-semibold text-gray-900">
 {template.questions?.length || 0}
 </p>
 </div>
 <div className={'text-start'}>
 <p className="text-xs text-gray-600">{labels.created}</p>
 <p className="text-base font-semibold text-gray-900">
 {formatDate(template.createdAt)}
 </p>
 </div>
 </div>

 <div className={`flex gap-2`}>
 <button
 onClick={() => handleUseTemplate(template.id)}
 className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
 >
 <span className="text-sm font-semibold text-white flex items-center gap-1">
 <Play className="w-3 h-3" /> {labels.use}
 </span>
 </button>
 <button
 onClick={() => handleEditTemplate(template.id)}
 className="px-4 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
 >
 <span className="text-sm font-semibold text-gray-900 flex items-center gap-1">
 <Edit className="w-3 h-3" /> {labels.edit}
 </span>
 </button>
 </div>
 </div>
 </div>
 ))}

 {filteredTemplates.length === 0 && (
 <div className="py-12 text-center">
 <p className="text-lg text-gray-600 mb-2">{labels.noTemplates}</p>
 <p className="text-sm text-gray-500">{labels.createFirst}</p>
 </div>
 )}
 </div>
 </div>
 );
}