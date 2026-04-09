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

import { useNavigate } from '@/lib/router-compat';
import { useSearch } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect } from 'react';
import { Download, Eye } from 'lucide-react';
import { surveyService } from '@/services/mealService';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

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
 const { t } = useTranslation();
 const navigate = useNavigate();
 const searchString = useSearch();
 const searchParams = new URLSearchParams(searchString);
 const { language, isRTL } = useLanguage();
 const [surveys, setSurveys] = useState<Survey[]>([]);
 const [loading, setLoading] = useState(true);

 const projectId = searchParams.get('projectId') || '';
 const projectName = searchParams.get('projectName') || '';

 const labels = {
 title: t.mealSurvey.surveyDataCollectionReports,
 project: t.mealSurvey.project2,
 period: t.mealSurvey.periodQ12025,
 export: t.mealSurvey.export16,
 surveyName: t.mealSurvey.surveyName,
 dateStarted: t.mealSurvey.dateStarted,
 dateEnd: t.mealSurvey.dateEnd,
 status: t.mealSurvey.status,
 actions: t.mealSurvey.actions,
 viewSurvey: t.mealSurvey.viewSurvey,
 draft: t.mealSurvey.draft,
 published: t.mealSurvey.published,
 deployed: t.mealSurvey.deployed17,
 paused: t.mealSurvey.paused,
 completed: t.mealSurvey.completed,
 archived: t.mealSurvey.archived18,
 noSurveys: t.mealSurvey.noSurveysFound,
 loading: t.mealSurvey.loadingSurveys,
 notStarted: t.mealSurvey.notStarted,
 ongoing: t.mealSurvey.ongoing,
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
 'draft': { label: labels.draft, bg: 'bg-gray-100', text: 'text-gray-700' },
 'published': { label: labels.deployed, bg: 'bg-blue-100', text: 'text-blue-700' },
 'paused': { label: labels.paused, bg: 'bg-yellow-100', text: 'text-yellow-700' },
 'completed': { label: labels.completed, bg: 'bg-green-100', text: 'text-green-700' },
 'archived': { label: labels.archived, bg: 'bg-gray-300', text: 'text-gray-700' },
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
 return date.toLocaleDateString(t.mealSurvey.enus, {
 year: 'numeric',
 month: 'short',
 day: 'numeric',
 });
 };

 const handleViewSurvey = (survey: Survey) => {
 navigate(`/organization/meal/survey/detail/${survey.id}?projectId=${projectId}&projectName=${projectName}&tab=summary`);
 };

 const handleExport = () => {
 // Export logic - can export to Excel/CSV
 alert(t.mealSurvey.exportingSurveyReports);
 };

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Back Navigation */}
 <BackButton onClick={() => navigate('/organization/meal/survey')} label={t.mealSurvey.backToSurveys} />
 {/* Header */}
 <div className={`flex items-center justify-between`}>
 <div className={`flex-1 text-start`}>
 <h1 className="text-2xl font-bold text-gray-900">{labels.title}</h1>
 {projectName && (
 <p className="text-sm text-gray-600 mt-1">
 {labels.project}: {projectName} • {labels.period}
 </p>
 )}
 </div>
 
 <div className={`flex items-center gap-3`}>
 <button
 onClick={handleExport}
 className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors`}
 >
 <Download className="w-4 h-4" />
 {labels.export}
 </button>
 </div>
 </div>

 {/* Surveys Table */}
 <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
 {loading ? (
 <div className="text-center py-12">
 <p className="text-gray-500">{labels.loading}</p>
 </div>
 ) : surveys.length === 0 ? (
 <div className="text-center py-12">
 <p className="text-gray-500">{labels.noSurveys}</p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className={`px-6 py-4 text-xs font-medium text-gray-700 uppercase tracking-wider text-start`}>
 {labels.surveyName}
 </th>
 <th className={`px-6 py-4 text-xs font-medium text-gray-700 uppercase tracking-wider text-start`}>
 {labels.dateStarted}
 </th>
 <th className={`px-6 py-4 text-xs font-medium text-gray-700 uppercase tracking-wider text-start`}>
 {labels.dateEnd}
 </th>
 <th className={`px-6 py-4 text-xs font-medium text-gray-700 uppercase tracking-wider text-center`}>
 {labels.status}
 </th>
 <th className={`px-6 py-4 text-xs font-medium text-gray-700 uppercase tracking-wider text-center`}>
 {labels.actions}
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200 bg-white">
 {surveys.map((survey) => (
 <tr key={survey.id} className="hover:bg-gray-50 transition-colors">
 <td className={`px-6 py-4 text-start`}>
 <div className="text-sm font-medium text-gray-900">
 {survey.name}
 </div>
 </td>
 <td className={`px-6 py-4 text-start`}>
 <div className="text-sm text-gray-700">
 {formatDate(survey.deployedAt || survey.createdAt)}
 </div>
 </td>
 <td className={`px-6 py-4 text-start`}>
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
 {labels.viewSurvey}
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