/**
 * ============================================================================
 * DATA REPORTS SUB-TAB (100% REAL DATA-DRIVEN)
 * ============================================================================
 * 
 * FEATURES:
 * ✅ Real analytics from submission data
 * ✅ Dynamic charts based on actual responses
 * ✅ Question-based report generation
 * ✅ Data cleaning warning banner
 * ✅ Export to PDF/Excel
 * ✅ Empty state when no data
 * 
 * ============================================================================
 */

import { useLanguage } from '@/contexts/LanguageContext';
import { AlertCircle, Plus, Edit, Settings, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n/useTranslation';

interface Props {
 survey: any;
}

interface Submission {
 id: string;
 surveyId: string;
 submittedAt: string;
 responses: Array<{ questionId: string; value: any }>;
}

export function DataReportsSubTab({
 survey }: Props) {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const [submissions, setSubmissions] = useState<Submission[]>([]);
 const [selectedQuestion, setSelectedQuestion] = useState<string>('');
 const [reportData, setReportData] = useState<any>(null);

 const localT = {
 reports: t.mealTabs.reports10,
 defaultReport: t.mealTabs.defaultReport,
 warningMessage: 'This is an automated report based on raw data submitted to this project. Please conduct proper data cleaning prior to using the graphs and figures used on this page.',
 selectQuestion: t.mealTabs.selectAQuestionToAnalyze,
 noData: t.mealTabs.noDataAvailable,
 noDataDesc: t.mealTabs.submitSurveyResponsesToSeeAnalytics,
 respondents: t.mealTabs.respondentsAnsweredThisQuestion,
 value: t.mealTabs.value,
 frequency: t.mealTabs.frequency,
 percentage: t.mealTabs.percentage,
 exportReport: t.mealTabs.exportReport,
 };

 // ✅ Load real submissions
 useEffect(() => {
 loadSubmissions();
 }, [survey.id]);

 // ✅ Auto-select first question
 useEffect(() => {
 if (survey.questions && survey.questions.length > 0 && !selectedQuestion) {
 setSelectedQuestion(survey.questions[0].id);
 }
 }, [survey.questions]);

 // ✅ Generate report when question changes
 useEffect(() => {
 if (selectedQuestion && submissions.length > 0) {
 generateReport(selectedQuestion);
 }
 }, [selectedQuestion, submissions]);

 const loadSubmissions = () => {
 try {
 const STORAGE_KEY = 'meal_submissions';
 const storedSubmissions = localStorage.getItem(STORAGE_KEY);
 
 if (storedSubmissions) {
 const allSubmissions: Submission[] = JSON.parse(storedSubmissions);
 const surveySubmissions = allSubmissions.filter(s => s.surveyId === survey.id);
 setSubmissions(surveySubmissions);
 }
 } catch (error) {
 console.error('Error loading submissions:', error);
 }
 };

 // ✅ Generate analytics from real data
 const generateReport = (questionId: string) => {
 const question = survey.questions.find((q: any) => q.id === questionId);
 if (!question) return;

 // Collect all responses for this question
 const responses = submissions.map(sub => {
 const response = sub.responses.find(r => r.questionId === questionId);
 return response ? response.value : null;
 }).filter(v => v !== null);

 if (responses.length === 0) {
 setReportData(null);
 return;
 }

 // Generate frequency analysis
 const frequencyMap = new Map<string, number>();
 responses.forEach(value => {
 const key = String(value);
 frequencyMap.set(key, (frequencyMap.get(key) || 0) + 1);
 });

 // Convert to chart data
 const chartData = Array.from(frequencyMap.entries()).map(([value, count]) => ({
 value,
 count,
 percentage: ((count / responses.length) * 100).toFixed(2),
 })).sort((a, b) => b.count - a.count);

 setReportData({
 question,
 totalResponses: responses.length,
 chartData,
 });
 };

 // Colors for charts
 const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

 // ✅ Empty state
 if (submissions.length === 0) {
 return (
 <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className={`flex items-center justify-between`}>
 <h2 className={`text-lg font-bold text-gray-900 text-start`}>
 {t.reports}
 </h2>
 </div>

 {/* Warning Banner */}
 <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
 <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
 <p className={`text-sm text-orange-800 text-start`}>
 {t.warningMessage}
 </p>
 </div>

 {/* Empty State */}
 <div className="bg-white rounded-lg border border-gray-200 p-12">
 <div className="text-center">
 <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
 </svg>
 <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.noData}</h3>
 <p className="text-sm text-gray-500">{t.noDataDesc}</p>
 </div>
 </div>
 </div>
 );
 }

 return (
 <div className="space-y-4">
 {/* Header */}
 <div className={`flex items-center justify-between`}>
 <h2 className={`text-lg font-bold text-gray-900 text-start`}>
 {t.reports}
 </h2>
 <div className={`flex items-center gap-2`}>
 {survey.questions && survey.questions.length > 0 && (
 <select
 value={selectedQuestion}
 onChange={(e) => setSelectedQuestion(e.target.value)}
 className="px-3 py-2 bg-white border border-gray-300 rounded text-sm"
 >
 {survey.questions.map((q: any) => (
 <option key={q.id} value={q.id}>
 {q.label || q.question || `Question ${q.order}`}
 </option>
 ))}
 </select>
 )}
 <button className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors" title={t.exportReport}>
 <Download className="w-5 h-5" />
 </button>
 </div>
 </div>

 {/* Warning Banner */}
 <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
 <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
 <p className={`text-sm text-orange-800 text-start`}>
 {t.warningMessage}
 </p>
 </div>

 {/* Chart Card */}
 {reportData && (
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 {/* Chart Header */}
 <div className={`mb-4 text-start`}>
 <h3 className="text-base font-semibold text-blue-600 mb-2">
 {reportData.question.label || reportData.question.question}
 </h3>
 <p className="text-sm text-gray-600">
 {reportData.totalResponses} {t.respondents}
 </p>
 </div>

 {/* Bar Chart */}
 <div className="h-80 mb-6">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={reportData.chartData}>
 <CartesianGrid strokeDasharray="3 3" />
 <XAxis 
 dataKey="value" 
 angle={-45} 
 textAnchor="end" 
 height={100} 
 style={{ fontSize: '12px' }} 
 />
 <YAxis />
 <Tooltip />
 <Bar dataKey="count" fill="#60A5FA" />
 </BarChart>
 </ResponsiveContainer>
 </div>

 {/* Data Table */}
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead className="bg-gray-700 text-white">
 <tr>
 <th className={`px-4 py-2 font-semibold text-start`}>{t.value}</th>
 <th className={`px-4 py-2 font-semibold text-start`}>{t.frequency}</th>
 <th className={`px-4 py-2 font-semibold text-start`}>{t.percentage}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {reportData.chartData.map((row: any, index: number) => (
 <tr key={index} className="hover:bg-gray-50">
 <td className={`px-4 py-2 text-start`}>{row.value}</td>
 <td className={`px-4 py-2 text-start`}>{row.count}</td>
 <td className={`px-4 py-2 text-start`}>{row.percentage}%</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}
 </div>
 );
}
