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

import { useLocation, useSearch } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Play, ArrowLeft } from 'lucide-react';
import { surveyService } from '@/services/mealService';

export function SurveyTemplates() {
  const [, navigate] = useLocation();
  const { language, isRTL } = useLanguage();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const [searchQuery, setSearchQuery] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);

  const projectId = searchParams.get('projectId') || '';
  const projectName = searchParams.get('projectName') || '';

  const t = {
    title: language === 'en' ? 'Survey & Data Collection' : 'المسح وجمع البيانات',
    createTemplate: language === 'en' ? 'Create Template' : 'إنشاء قالب',
    back: language === 'en' ? 'Back' : 'رجوع',
    searchPlaceholder: language === 'en' ? 'Search templates...' : 'البحث في القوالب...',
    questions: language === 'en' ? 'Questions' : 'الأسئلة',
    created: language === 'en' ? 'Created' : 'تاريخ الإنشاء',
    use: language === 'en' ? 'Use' : 'استخدام',
    edit: language === 'en' ? 'Edit' : 'تعديل',
    noTemplates: language === 'en' ? 'No templates found' : 'لم يتم العثور على قوالب',
    createFirst: language === 'en' ? 'Create your first survey template to get started' : 'أنشئ قالب المسح الأول للبدء',
  };

  // Load templates
  useEffect(() => {
    const loadTemplates = () => {
      try {
        const allTemplates = surveyService.getAllTemplates();
        setTemplates(allTemplates);
      } catch (error) {
        console.error('Error loading templates:', error);
      }
    };
    loadTemplates();
  }, []);

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUseTemplate = (templateId: string) => {
    // Navigate to survey creation with template
    navigate(`/meal/survey/create?projectId=${projectId}&projectName=${projectName}&templateId=${templateId}`);
  };

  const handleEditTemplate = (templateId: string) => {
    // Navigate to the survey detail view to edit template
    navigate(`/meal/survey/detail/${templateId}?projectId=${projectId}&projectName=${projectName}&tab=form`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'en' ? 'en-US' : 'ar-EG', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex items-center justify-between pb-6 border-b border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => navigate('/meal/survey/editor')}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <span className="text-sm font-semibold text-white flex items-center gap-2">
              <Plus className="w-4 h-4" /> {t.createTemplate}
            </span>
          </button>
          <button
            onClick={() => window.history.back()}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            <span className="text-sm font-semibold text-gray-700">{t.back}</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className={`absolute top-3 w-5 h-5 text-gray-400 ${isRTL ? 'right-4' : 'left-4'}`} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          className={`w-full px-4 py-3 rounded-lg text-base bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            isRTL ? 'pr-12 text-right' : 'pl-12'
          }`}
        />
      </div>

      {/* Templates List */}
      <div className="space-y-4">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="rounded-xl p-6 bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className={`flex items-start justify-between mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                <h2 className="text-lg font-bold text-gray-900 mb-2">
                  {language === 'en' ? template.name : template.nameAr || template.name}
                </h2>
                <p className="text-sm text-gray-600 mb-3">
                  {language === 'en' ? template.description : template.descriptionAr || template.description}
                </p>
              </div>
            </div>

            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <p className="text-xs text-gray-600">{t.questions}</p>
                  <p className="text-base font-semibold text-gray-900">
                    {template.questions?.length || 0}
                  </p>
                </div>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <p className="text-xs text-gray-600">{t.created}</p>
                  <p className="text-base font-semibold text-gray-900">
                    {formatDate(template.createdAt)}
                  </p>
                </div>
              </div>

              <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={() => handleUseTemplate(template.id)}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <span className="text-sm font-semibold text-white flex items-center gap-1">
                    <Play className="w-3 h-3" /> {t.use}
                  </span>
                </button>
                <button
                  onClick={() => handleEditTemplate(template.id)}
                  className="px-4 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                    <Edit className="w-3 h-3" /> {t.edit}
                  </span>
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredTemplates.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-lg text-gray-600 mb-2">{t.noTemplates}</p>
            <p className="text-sm text-gray-500">{t.createFirst}</p>
          </div>
        )}
      </div>
    </div>
  );
}