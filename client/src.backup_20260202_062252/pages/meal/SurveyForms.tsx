/**
 * ============================================================================
 * SURVEY FORMS
 * ============================================================================
 * 
 * Converted from React Native to Web React
 * Browse and manage survey forms with filtering and actions
 * 
 * FEATURES:
 * - Search forms
 * - Filter by status (all, draft, published, archived)
 * - Create/Edit/Delete forms
 * - Publish/Export forms
 * - View form details
 * - Import forms
 * - Bilingual support (EN/AR) with RTL
 * 
 * ============================================================================
 */

import { useLocation, useSearch } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { useState, useEffect } from 'react';
import { Search, Plus, Upload, Loader2, Edit, Eye, Play, Download, Trash2, AlertCircle, ArrowLeft } from 'lucide-react';
import { surveyService, type Survey } from '@/services/mealService';

type FormStatus = 'all' | 'draft' | 'published' | 'archived';

export function SurveyForms() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const { language, isRTL } = useLanguage();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FormStatus>('all');
  const [forms, setForms] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const projectId = searchParams.get('projectId') || '';
  const projectName = searchParams.get('projectName') || '';

  const t = {
    title: language === 'en' ? 'Survey Forms' : 'نماذج المسح',
    subtitle: language === 'en' ? 'Browse and manage survey forms' : 'تصفح وإدارة نماذج المسح',
    back: language === 'en' ? 'Back' : 'رجوع',
    createForm: language === 'en' ? '+ Create Form' : '+ إنشاء نموذج',
    import: language === 'en' ? '⬆️ Import' : '⬆️ استيراد',
    searchPlaceholder: language === 'en' ? 'Search forms...' : 'البحث في النماذج...',
    all: language === 'en' ? 'All' : 'الكل',
    draft: language === 'en' ? 'Draft' : 'مسودة',
    published: language === 'en' ? 'Published' : 'منشور',
    archived: language === 'en' ? 'Archived' : 'مؤرشف',
    noForms: language === 'en' ? 'No forms found' : 'لم يتم العثور على نماذج',
    createFirst: language === 'en' ? 'Create your first survey form to get started' : 'أنشئ نموذج المسح الأول للبدء',
    type: language === 'en' ? 'Type' : 'النوع',
    questions: language === 'en' ? 'Questions' : 'الأسئلة',
    submissions: language === 'en' ? 'Submissions' : 'التقديمات',
    created: language === 'en' ? 'Created' : 'تاريخ الإنشاء',
    edit: language === 'en' ? 'Edit' : 'تحديث',
    view: language === 'en' ? 'View' : 'عرض',
    publish: language === 'en' ? 'Publish' : 'نشر',
    export: language === 'en' ? 'Export' : 'تصدير',
    delete: language === 'en' ? 'Delete' : 'حذف',
    confirmDelete: language === 'en'
      ? 'Are you sure you want to delete this form?'
      : 'هل أنت متأكد من حذف هذا النموذج؟',
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    deleteSuccess: language === 'en' ? 'Survey archived successfully' : 'تم أرشفة المسح بنجاح',
    publishSuccess: language === 'en' ? 'Form published successfully' : 'تم نشر النموذج بنجاح',
    noDescription: language === 'en' ? 'No description' : 'لا يوجد وصف',
  };

  useEffect(() => {
    loadForms();
  }, [projectId]);

  const loadForms = () => {
    setLoading(true);
    try {
      const allForms = surveyService.getAllSurveys({ projectId });
      setForms(allForms);
    } catch (error) {
      console.error('Error loading forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    try {
      surveyService.deleteSurvey(id, user?.openId || 'system');
      loadForms();
      setDeleteConfirm(null);
      alert(t.deleteSuccess);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handlePublish = (id: string) => {
    try {
      surveyService.updateSurvey(id, { status: 'published' }, user?.openId || 'system');
      loadForms();
      alert(t.publishSuccess);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const filteredForms = forms.filter((form) => {
    const matchesSearch =
      searchQuery === '' ||
      form.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (form.description && form.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = filterStatus === 'all' || form.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="space-y-6 p-6">
      {/* Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => navigate(`/meal/survey?projectId=${projectId}&projectName=${projectName}`)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <div>
            <h1 className={`text-2xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.title}
            </h1>
            <p className={`text-sm text-gray-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {projectName}
            </p>
          </div>
        </div>
        <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => navigate(`/meal/survey/create-form?projectId=${projectId}&projectName=${projectName}`)}
            className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Plus className="w-4 h-4" />
            {t.createForm}
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className={`flex flex-col md:flex-row gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
          {/* Search */}
          <div className="flex-1 relative">
            <Search className={`absolute top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className={`w-full ${isRTL ? 'pr-10 text-right' : 'pl-10 text-left'} py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FormStatus)}
            className={`px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
          >
            <option value="all">{t.all}</option>
            <option value="draft">{t.draft}</option>
            <option value="published">{t.published}</option>
            <option value="archived">{t.archived}</option>
          </select>
        </div>
      </div>

      {/* Forms List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12">
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.noForms}</h3>
            <p className="text-sm text-gray-600 mb-4">{t.createFirst}</p>
            <button
              onClick={() => navigate(`/meal/survey/create-form?projectId=${projectId}&projectName=${projectName}`)}
              className={`inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <Plus className="w-4 h-4" />
              {t.createForm}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                    Form Name
                  </th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.type}
                  </th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-center`}>
                    {t.questions}
                  </th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-center`}>
                    {t.submissions}
                  </th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-center`}>
                    Status
                  </th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-center`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredForms.map((form) => (
                  <tr key={form.id} className="hover:bg-gray-50">
                    <td className={`px-6 py-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {language === 'ar' && form.nameAr ? form.nameAr : form.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {language === 'ar' && form.descriptionAr ? form.descriptionAr : (form.description || t.noDescription)}
                        </div>
                      </div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                        {form.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm text-gray-900" dir="ltr">{form.questions?.length || 0}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm text-gray-900" dir="ltr">{form.submissionsCount || 0}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        form.status === 'published' ? 'bg-green-100 text-green-800' :
                        form.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {form.status === 'published' ? t.published : form.status === 'draft' ? t.draft : t.archived}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className={`flex items-center justify-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <button
                          onClick={() => navigate(`/meal/survey/create-form?projectId=${projectId}&projectName=${projectName}&formId=${form.id}`)}
                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                          title={t.edit}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {form.status === 'draft' && (
                          <button
                            onClick={() => handlePublish(form.id)}
                            className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                            title={t.publish}
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteConfirm(form.id)}
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                          title={t.delete}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className={`px-6 py-4 border-b border-gray-200 ${isRTL ? 'text-right' : 'text-left'}`}>
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <AlertCircle className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">{t.confirmDelete}</h3>
              </div>
            </div>
            <div className={`px-6 py-4 ${isRTL ? 'flex-row-reverse gap-3' : 'flex gap-3 justify-end'} flex border-t border-gray-200 bg-gray-50`}>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}