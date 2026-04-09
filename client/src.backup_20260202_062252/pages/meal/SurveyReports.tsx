/**
 * ============================================================================
 * SURVEY & DATA COLLECTION - REPORTS (SYSTEM-WIDE)
 * ============================================================================
 * 
 * System-wide survey reports showing all surveys in a table format
 * 
 * FEATURES:
 * - Table of all surveys with metadata
 * - Survey Name, Date Started, Date End, Status
 * - View Survey action (navigates to Survey Detail View)
 * - Export functionality
 * - Bilingual support (EN/AR) with RTL
 * 
 * ============================================================================
 */

import { useLocation, useSearch } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect } from 'react';
import { Download, ArrowLeft, Eye } from 'lucide-react';
import { surveyService } from '@/services/mealService';

interface Survey {
  id: string;
  name: string;
  projectId: string;
  status: 'draft' | 'published' | 'paused' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
  deployedAt?: string;
  completedAt?: string;
}

export function SurveyReports() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const { language, isRTL } = useLanguage();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);

  const projectId = searchParams.get('projectId') || '';
  const projectName = searchParams.get('projectName') || '';

  const t = {
    title: language === 'en' ? 'Survey & Data Collection – Reports' : 'المسح وجمع البيانات - التقارير',
    project: language === 'en' ? 'Project' : 'المشروع',
    period: language === 'en' ? 'Period: Q1 2025' : 'الفترة: الربع الأول 2025',
    export: language === 'en' ? '⬇ Export' : '⬇ تصدير',
    back: language === 'en' ? 'Back' : 'رجوع',
    surveyName: language === 'en' ? 'Survey Name' : 'اسم المسح',
    dateStarted: language === 'en' ? 'Date Started' : 'تاريخ البدء',
    dateEnd: language === 'en' ? 'Date End' : 'تاريخ الانتهاء',
    status: language === 'en' ? 'Status' : 'الحالة',
    actions: language === 'en' ? 'Actions' : 'الإجراءات',
    viewSurvey: language === 'en' ? 'View Survey' : 'عرض المسح',
    draft: language === 'en' ? 'Draft' : 'مسودة',
    published: language === 'en' ? 'Published' : 'منشور',
    deployed: language === 'en' ? 'Deployed' : 'منتشر',
    paused: language === 'en' ? 'Paused' : 'متوقف',
    completed: language === 'en' ? 'Completed' : 'مكتمل',
    archived: language === 'en' ? 'Archived' : '��ؤرشف',
    noSurveys: language === 'en' ? 'No surveys found' : 'لم يتم العثور على مسوحات',
    loading: language === 'en' ? 'Loading surveys...' : 'جاري تحميل المسوحات...',
    notStarted: language === 'en' ? 'Not Started' : 'لم يبدأ',
    ongoing: language === 'en' ? 'Ongoing' : 'جاري',
  };

  useEffect(() => {
    loadSurveys();
  }, [projectId]);

  const loadSurveys = () => {
    try {
      setLoading(true);
      const allSurveys = surveyService.getAllSurveys();
      
      // Filter by project if projectId is provided
      const filteredSurveys = projectId 
        ? allSurveys.filter(s => s.projectId === projectId)
        : allSurveys;
      
      setSurveys(filteredSurveys);
    } catch (error) {
      console.error('Error loading surveys:', error);
      setSurveys([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: Survey['status']) => {
    const badges = {
      'draft': { label: t.draft, bg: 'bg-gray-100', text: 'text-gray-700' },
      'published': { label: t.deployed, bg: 'bg-blue-100', text: 'text-blue-700' },
      'paused': { label: t.paused, bg: 'bg-yellow-100', text: 'text-yellow-700' },
      'completed': { label: t.completed, bg: 'bg-green-100', text: 'text-green-700' },
      'archived': { label: t.archived, bg: 'bg-gray-300', text: 'text-gray-700' },
    };
    
    const badge = badges[status];
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'en' ? 'en-US' : 'ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleViewSurvey = (survey: Survey) => {
    navigate(`/meal/survey/detail/${survey.id}?projectId=${projectId}&projectName=${projectName}&tab=summary`);
  };

  const handleExport = () => {
    // Export logic - can export to Excel/CSV
    alert(language === 'en' ? 'Exporting survey reports...' : 'جاري تصدير تقارير المسح...');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
          <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
          {projectName && (
            <p className="text-sm text-gray-600 mt-1">
              {t.project}: {projectName} • {t.period}
            </p>
          )}
        </div>
        
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={handleExport}
            className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Download className="w-4 h-4" />
            {t.export}
          </button>
          <button
            onClick={() => navigate(`/meal/survey/dashboard?projectId=${projectId}&projectName=${projectName}`)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            <span className="text-sm font-medium text-gray-700">{t.back}</span>
          </button>
        </div>
      </div>

      {/* Surveys Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">{t.loading}</p>
          </div>
        ) : surveys.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">{t.noSurveys}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className={`px-6 py-4 text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.surveyName}
                  </th>
                  <th className={`px-6 py-4 text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.dateStarted}
                  </th>
                  <th className={`px-6 py-4 text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.dateEnd}
                  </th>
                  <th className={`px-6 py-4 text-xs font-medium text-gray-700 uppercase tracking-wider text-center`}>
                    {t.status}
                  </th>
                  <th className={`px-6 py-4 text-xs font-medium text-gray-700 uppercase tracking-wider text-center`}>
                    {t.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {surveys.map((survey) => (
                  <tr key={survey.id} className="hover:bg-gray-50 transition-colors">
                    <td className={`px-6 py-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                      <div className="text-sm font-medium text-gray-900">
                        {survey.name}
                      </div>
                    </td>
                    <td className={`px-6 py-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                      <div className="text-sm text-gray-700">
                        {formatDate(survey.deployedAt || survey.createdAt)}
                      </div>
                    </td>
                    <td className={`px-6 py-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                      <div className="text-sm text-gray-700">
                        {formatDate(survey.completedAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(survey.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => handleViewSurvey(survey)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm hover:underline"
                        >
                          {t.viewSurvey}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}