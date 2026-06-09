/**
 * ============================================================================
 * MEAL REPORTS - Unified Analytical Summary Dashboard (UPGRADED)
 * ============================================================================
 * 
 * Executive dashboard that aggregates and visualizes data from all MEAL modules
 * using REAL tRPC backend data (no localStorage/mock services).
 * 
 * DATA SOURCES (all via tRPC):
 * - mealReports.getSnapshot → KPI aggregation
 * - mealReports.getIndicatorPerformance → charts
 * - mealReports.getSurveyInsights → survey charts
 * - mealReports.getAccountabilitySummary → accountability charts
 * - mealReports.getProjectsForFilter → project dropdown
 * 
 * SECTIONS:
 * 1. Overall MEAL Snapshot (KPIs + Donut Chart)
 * 2. Indicator Performance Analysis (Bar, Line, Pie Charts)
 * 3. Survey & Data Collection Insights
 * 4. Accountability & CRM Summary
 * 5. Integrated Risk & Learning Analysis
 * 
 * FEATURES:
 * - Real-time data aggregation (100% REAL DATA via tRPC)
 * - Interactive charts (Recharts)
 * - Filters (project)
 * - Auto-generated analysis text
 * - Official PDF generation with org branding
 * - Bilingual support (EN/AR) with RTL
 * ============================================================================
 */

import { useLanguage } from '@/contexts/LanguageContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useRef, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { 
 Target, 
 ClipboardList, 
 MessageSquare, 
 TrendingUp,
 AlertTriangle,
 CheckCircle,
 Clock,
 Download,
 Filter,
 BarChart3,
 FileText,
 Shield,
 Database,
 Loader2,
 ArrowLeft, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from '@/lib/router-compat';
import {
 BarChart,
 Bar,
 LineChart,
 Line,
 PieChart,
 Pie,
 Cell,
 XAxis,
 YAxis,
 CartesianGrid,
 Tooltip,
 Legend,
 ResponsiveContainer,
 Area,
 AreaChart
} from 'recharts';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

// Chart colors
const COLORS = {
 achieved: '#22C55E',
 onTrack: '#3B82F6',
 atRisk: '#F59E0B',
 offTrack: '#EF4444',
 primary: '#3B82F6',
 secondary: '#8B5CF6',
 validated: '#10B981',
 pending: '#F59E0B',
 resolved: '#22C55E',
 inProgress: '#F59E0B',
};

const PIE_COLORS = [COLORS.achieved, COLORS.onTrack, COLORS.atRisk, COLORS.offTrack];

export function MEALReports() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const { currentOrganization } = useOrganization();
 const { user } = useAuth();
 const navigate = useNavigate();
 const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(undefined);
 const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
 const reportRef = useRef<HTMLDivElement>(null);

 // ============================================================================
 // TRANSLATIONS
 // ============================================================================
 const labels = {
 title: t.mealReports.mealReports,
    subtitle: t.mealReports.unifiedAnalyticalSummaryDashboard,
 reportTitle: 'MEAL Reports – Unified Analytical Summary',
 
 // Filters
 filters: t.mealReports.filters,
 project: t.mealReports.project,
 allProjects: t.mealReports.allProjects,
 exportPDF: t.mealReports.exportPdf,
 generatingPDF: t.mealReports.generatingPdf,

 // Section 1: MEAL Snapshot
 mealSnapshot: t.mealReports.overallMealSnapshot,
 totalIndicators: t.mealReports.totalIndicators,
 achievementRate: t.mealReports.achievementRate,
 totalSurveys: t.mealReports.totalSurveys,
 totalSubmissions: t.mealReports.totalSubmissions,
 totalFeedback: t.mealReports.totalFeedback,
 resolutionRate: t.mealReports.resolutionRate,
 dataCompleteness: t.mealReports.dataCompleteness,
 totalDocuments: t.mealReports.totalDocuments,
 
 // Indicator statuses
 achieved: t.mealReports.achieved,
 onTrack: t.mealReports.onTrack,
 atRisk: t.mealReports.atRisk,
 offTrack: t.mealReports.offTrack,
 statusDistribution: t.mealReports.indicatorStatusDistribution,

 // Section 2: Indicator Performance
 indicatorPerformance: t.mealReports.indicatorPerformanceAnalysis,
 targetVsActual: t.mealReports.targetVsActual,
 target: t.mealReports.target,
 actual: t.mealReports.actual,
 progressOverTime: t.mealReports.progressOverTime,
 atRiskIndicators: t.mealReports.atriskIndicators,
 
 // Section 3: Survey Insights
 surveyInsights: t.mealReports.surveyDataCollectionInsights,
 surveysByType: t.mealReports.surveysByType,
 surveysByStatus: t.mealReports.surveysByStatus,
 submissionStatus: t.mealReports.submissionStatus,
 completed: t.mealReports.completed,
 partial: t.mealReports.partial,
 draft: t.mealReports.draft,
 published: t.mealReports.published,
 closed: t.mealReports.closed,
 archived: t.mealReports.archived,
 
 // Section 4: Accountability
 accountabilitySummary: t.mealReports.accountabilityCrmSummary,
 feedbackByCategory: t.mealReports.feedbackByCategory,
 byType: t.mealReports.byType,
 bySeverity: t.mealReports.bySeverity,
 complaints: t.mealReports.complaints,
 feedback: t.mealReports.feedback,
 suggestions: t.mealReports.suggestions,
 resolved: t.mealReports.resolved,
 inProgress: t.mealReports.inProgress,
 open: t.mealReports.open,
 low: t.mealReports.low,
 medium: t.mealReports.medium,
 high: t.mealReports.high,
 critical: t.mealReports.critical,
 
 // Section 5: Risk & Learning
 riskLearning: t.mealReports.integratedRiskLearningAnalysis,
 keyRisks: t.mealReports.keyRisksIdentified,
 correctiveActions: t.mealReports.correctiveActionsNeeded,
 lessonsLearned: t.mealReports.lessonsLearned,
 
 // PDF
 preparedBy: t.mealReports.preparedBy,
 generatedOn: t.mealReports.generatedOn,
 page: t.mealReports.page,
 confidential: t.mealReports.confidentialInternalUseOnly,
 
 // Loading & Empty states
 loading: t.mealReports.loadingMealData,
 noData: t.mealReports.noDataAvailable,
 performanceSummary: t.mealReports.performanceSummary,

 // Future hooks
 dqaComingSoon: t.mealReports.dqaFindingsTrend,
 learningComingSoon: t.mealReports.learningItemsPublished,
 comingSoon: t.mealReports.comingSoonModuleUnderDevelopment,
 };

 // ============================================================================
 // DATA FETCHING - All via tRPC (REAL DATA)
 // ============================================================================
 
 const { data: projectList } = trpc.mealReports.getProjectsForFilter.useQuery({});
 
 const { data: snapshot, isLoading: snapshotLoading } = trpc.mealReports.getSnapshot.useQuery({
 projectId: selectedProjectId,
 });
 
 const { data: indicatorPerf, isLoading: indicatorLoading } = trpc.mealReports.getIndicatorPerformance.useQuery({
 projectId: selectedProjectId,
 limit: 10,
 });
 
 const { data: surveyInsights } = trpc.mealReports.getSurveyInsights.useQuery({
 projectId: selectedProjectId,
 });
 
 const { data: accountabilitySummary } = trpc.mealReports.getAccountabilitySummary.useQuery({
 projectId: selectedProjectId,
 });

 // ============================================================================
 // CHART DATA PREPARATION
 // ============================================================================
 
 const statusDistribution = snapshot ? [
 { name: labels.achieved, value: snapshot.indicatorsAchieved },
 { name: labels.onTrack, value: snapshot.indicatorsOnTrack },
 { name: labels.atRisk, value: snapshot.indicatorsAtRisk },
 { name: labels.offTrack, value: snapshot.indicatorsOffTrack },
 ].filter(item => item.value > 0) : [];

 const targetVsActualData = indicatorPerf?.targetVsActual?.map(ind => ({
 name: language === 'ar' && ind.nameAr ? ind.nameAr : ind.name,
 [labels.target]: ind.target,
 [labels.actual]: ind.actual,
 })) || [];

 const progressData = indicatorPerf?.progressOverTime || [];

 const surveyTypeData = surveyInsights?.surveysByType || [];
 
 const surveyStatusData = surveyInsights ? [
 { name: labels.draft, value: surveyInsights.surveysByStatus.draft },
 { name: labels.published, value: surveyInsights.surveysByStatus.published },
 { name: labels.closed, value: surveyInsights.surveysByStatus.closed },
 { name: labels.archived, value: surveyInsights.surveysByStatus.archived },
 ].filter(item => item.value > 0) : [];

 const submissionStatusData = surveyInsights ? [
 { name: labels.completed, value: surveyInsights.completedSubmissions },
 { name: labels.partial, value: surveyInsights.partialSubmissions },
 ].filter(item => item.value > 0) : [];

 const accountabilityTypeData = accountabilitySummary ? [
 { name: labels.complaints, value: accountabilitySummary.byType.complaints },
 { name: labels.feedback, value: accountabilitySummary.byType.feedback },
 { name: labels.suggestions, value: accountabilitySummary.byType.suggestions },
 ].filter(item => item.value > 0) : [];

 const accountabilityStatusData = accountabilitySummary ? [
 { name: labels.resolved, value: accountabilitySummary.byStatus.resolved + accountabilitySummary.byStatus.closed },
 { name: labels.inProgress, value: accountabilitySummary.byStatus.inProgress },
 { name: labels.open, value: accountabilitySummary.byStatus.open },
 ].filter(item => item.value > 0) : [];

 const severityData = accountabilitySummary ? [
 { name: labels.low, value: accountabilitySummary.bySeverity.low },
 { name: labels.medium, value: accountabilitySummary.bySeverity.medium },
 { name: labels.high, value: accountabilitySummary.bySeverity.high },
 { name: labels.critical, value: accountabilitySummary.bySeverity.critical },
 ].filter(item => item.value > 0) : [];

 // ============================================================================
 // PDF GENERATION
 // ============================================================================
 
 const handleExportPDF = useCallback(async () => {
 if (!reportRef.current) return;
 setIsGeneratingPDF(true);
 
 try {
 const html2canvas = (await import('html2canvas')).default;
 const { jsPDF } = await import('jspdf');
 
 const reportElement = reportRef.current;
 
 // Capture the report as canvas
 const canvas = await html2canvas(reportElement, {
 scale: 2,
 useCORS: true,
 logging: false,
 backgroundColor: '#ffffff',
 windowWidth: 1200,
 });
 
 const imgData = canvas.toDataURL('image/png');
 const imgWidth = 210; // A4 width in mm
 const pageHeight = 297; // A4 height in mm
 const imgHeight = (canvas.height * imgWidth) / canvas.width;
 
 const pdf = new jsPDF('p', 'mm', 'a4');
 const now = new Date();
 const orgName = language === 'ar' && currentOrganization?.nameAr 
 ? currentOrganization.nameAr 
 : currentOrganization?.name || 'Organization';
 
 // Header on first page
 pdf.setFontSize(10);
 pdf.setTextColor(100, 100, 100);
 pdf.text(orgName, isRTL ? 200 : 10, 8, { align: t.mealReports.left });
 pdf.text(labels.reportTitle, isRTL ? 200 : 10, 13, { align: t.mealReports.left });
 
 // Filters used
 const selectedProject = projectList?.find(p => p.id === selectedProjectId);
 const filterText = selectedProject 
 ? `${labels.project}: ${language === 'ar' && selectedProject.nameAr ? selectedProject.nameAr : selectedProject.name}`
 : `${labels.project}: ${labels.allProjects}`;
 pdf.text(filterText, isRTL ? 200 : 10, 18, { align: t.mealReports.left });
 
 // Generated timestamp + prepared by
 pdf.setFontSize(8);
 pdf.text(`${labels.generatedOn}: ${now.toLocaleString(t.mealReports.enus)}`, isRTL ? 200 : 10, 23, { align: t.mealReports.left });
 pdf.text(`${labels.preparedBy}: ${user?.name || 'System'}`, isRTL ? 200 : 10, 27, { align: t.mealReports.left });
 
 // Add report content
 let heightLeft = imgHeight;
 let position = 30;
 
 pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
 heightLeft -= (pageHeight - position);
 
 let pageNum = 1;
 
 while (heightLeft > 0) {
 position = heightLeft - imgHeight;
 pdf.addPage();
 pageNum++;
 pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
 heightLeft -= pageHeight;
 }
 
 // Add page numbers and footer to all pages
 const totalPages = pdf.getNumberOfPages();
 for (let i = 1; i <= totalPages; i++) {
 pdf.setPage(i);
 pdf.setFontSize(8);
 pdf.setTextColor(150, 150, 150);
 pdf.text(`${labels.page} ${i} / ${totalPages}`, 105, 290, { align: 'center' });
 pdf.text(labels.confidential, 105, 294, { align: 'center' });
 }
 
 const fileName = `MEAL_Report_${orgName.replace(/\s+/g, '_')}_${now.toISOString().split('T')[0]}.pdf`;
 pdf.save(fileName);
 } catch (error) {
 console.error('PDF generation error:', error);
 } finally {
 setIsGeneratingPDF(false);
 }
 }, [currentOrganization, language, isRTL, user, selectedProjectId, projectList, t]);

 // ============================================================================
 // LOADING STATE
 // ============================================================================
 
 if (snapshotLoading) {
 return (
 <div className="flex items-center justify-center min-h-[400px]" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="text-center space-y-4">
 <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
 <p className="text-lg text-gray-600">{labels.loading}</p>
 </div>
 </div>
 );
 }

 const s = snapshot || {
 totalIndicators: 0, indicatorsAchieved: 0, indicatorsOnTrack: 0,
 indicatorsAtRisk: 0, indicatorsOffTrack: 0, achievementRate: 0,
 totalSurveys: 0, totalSubmissions: 0, totalFeedback: 0,
 feedbackResolved: 0, resolutionRate: 0, dataCompletenessRate: 0,
 totalDataEntries: 0, verifiedDataEntries: 0, totalDocuments: 0,
 };

 return (
 <div className="space-y-8 pb-12">
 {/* Back to MEAL */}
 <div className="text-start">
 <BackButton onClick={() => navigate('/organization/meal')} label={t.mealReports.backToMeal} />
 </div>
 {/* Header */}
 <div className={`flex items-center justify-between`}>
 <div className={'text-start'}>
 <h1 className="text-3xl font-bold text-gray-900">{labels.title}</h1>
 <p className="text-base text-gray-600 mt-1">{labels.subtitle}</p>
 {currentOrganization && (
 <p className="text-sm text-gray-500 mt-1">
 {language === 'ar' && currentOrganization.nameAr ? currentOrganization.nameAr : currentOrganization.name}
 </p>
 )}
 </div>
 <button 
 onClick={handleExportPDF}
 disabled={isGeneratingPDF}
 className={`flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed`}
 >
 {isGeneratingPDF ? (
 <Loader2 className="w-4 h-4 animate-spin" />
 ) : (
 <Download className="w-4 h-4" />
 )}
 <span>{isGeneratingPDF ? labels.generatingPDF : labels.exportPDF}</span>
 </button>
 </div>

 {/* Filters */}
 <div className="bg-white rounded-lg border border-gray-200 p-5">
 <div className={`flex items-center gap-3 mb-4`}>
 <Filter className="w-5 h-5 text-gray-600" />
 <h3 className="text-lg font-semibold text-gray-900">{labels.filters}</h3>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className={'text-start'}>
 <label className="block text-sm font-medium text-gray-700 mb-1.5">{labels.project}</label>
 <select
 value={selectedProjectId || ''}
 onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : undefined)}
 className={`w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-start`}
 >
 <option value="">{labels.allProjects}</option>
 {projectList?.map(p => (
 <option key={p.id} value={p.id}>
 {language === 'ar' && p.nameAr ? p.nameAr : p.name} {p.code ? `(${p.code})` : ''}
 </option>
 ))}
 </select>
 </div>
 </div>
 </div>

 {/* ====== REPORT CONTENT (captured for PDF) ====== */}
 <div ref={reportRef} className="space-y-8">

 {/* ================================================================ */}
 {/* SECTION 1: OVERALL MEAL SNAPSHOT */}
 {/* ================================================================ */}
 <div>
 <h2 className={`text-2xl font-bold text-gray-900 mb-5 text-start`}>
 {labels.mealSnapshot}
 </h2>
 
 {/* KPI Cards - 4 columns */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
 {/* Total Indicators */}
 <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
 <div className={`flex items-start justify-between`}>
 <div className={`flex-1 text-start`}>
 <p className="text-sm text-gray-500 mb-1">{labels.totalIndicators}</p>
 <p className="text-3xl font-bold text-gray-900">{s.totalIndicators}</p>
 </div>
 <div className="p-2.5 bg-blue-50 rounded-lg">
 <Target className="w-6 h-6 text-blue-600" />
 </div>
 </div>
 </div>

 {/* Achievement Rate */}
 <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
 <div className={`flex items-start justify-between`}>
 <div className={`flex-1 text-start`}>
 <p className="text-sm text-gray-500 mb-1">{labels.achievementRate}</p>
 <p className="text-3xl font-bold text-gray-900">{s.achievementRate}%</p>
 </div>
 <div className="p-2.5 bg-green-50 rounded-lg">
 <TrendingUp className="w-6 h-6 text-green-600" />
 </div>
 </div>
 </div>

 {/* Total Surveys */}
 <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
 <div className={`flex items-start justify-between`}>
 <div className={`flex-1 text-start`}>
 <p className="text-sm text-gray-500 mb-1">{labels.totalSurveys}</p>
 <p className="text-3xl font-bold text-gray-900">{s.totalSurveys}</p>
 <p className="text-xs text-gray-400 mt-0.5">{s.totalSubmissions} {labels.totalSubmissions}</p>
 </div>
 <div className="p-2.5 bg-purple-50 rounded-lg">
 <ClipboardList className="w-6 h-6 text-purple-600" />
 </div>
 </div>
 </div>

 {/* Resolution Rate */}
 <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
 <div className={`flex items-start justify-between`}>
 <div className={`flex-1 text-start`}>
 <p className="text-sm text-gray-500 mb-1">{labels.resolutionRate}</p>
 <p className="text-3xl font-bold text-gray-900">{s.resolutionRate}%</p>
 <p className="text-xs text-gray-400 mt-0.5">{s.feedbackResolved}/{s.totalFeedback} {labels.resolved}</p>
 </div>
 <div className="p-2.5 bg-orange-50 rounded-lg">
 <MessageSquare className="w-6 h-6 text-orange-600" />
 </div>
 </div>
 </div>
 </div>

 {/* Second row KPIs - 3 columns */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
 {/* Data Completeness */}
 <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
 <div className={`flex items-start justify-between`}>
 <div className={`flex-1 text-start`}>
 <p className="text-sm text-gray-500 mb-1">{labels.dataCompleteness}</p>
 <p className="text-3xl font-bold text-gray-900">{s.dataCompletenessRate}%</p>
 <p className="text-xs text-gray-400 mt-0.5">{s.verifiedDataEntries}/{s.totalDataEntries}</p>
 </div>
 <div className="p-2.5 bg-teal-50 rounded-lg">
 <Database className="w-6 h-6 text-teal-600" />
 </div>
 </div>
 </div>

 {/* Total Feedback */}
 <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
 <div className={`flex items-start justify-between`}>
 <div className={`flex-1 text-start`}>
 <p className="text-sm text-gray-500 mb-1">{labels.totalFeedback}</p>
 <p className="text-3xl font-bold text-gray-900">{s.totalFeedback}</p>
 </div>
 <div className="p-2.5 bg-red-50 rounded-lg">
 <Shield className="w-6 h-6 text-red-600" />
 </div>
 </div>
 </div>

 {/* Total Documents */}
 <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow">
 <div className={`flex items-start justify-between`}>
 <div className={`flex-1 text-start`}>
 <p className="text-sm text-gray-500 mb-1">{labels.totalDocuments}</p>
 <p className="text-3xl font-bold text-gray-900">{s.totalDocuments}</p>
 </div>
 <div className="p-2.5 bg-indigo-50 rounded-lg">
 <FileText className="w-6 h-6 text-indigo-600" />
 </div>
 </div>
 </div>
 </div>

 {/* Indicator Status Donut Chart */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h3 className={`text-lg font-semibold text-gray-900 mb-4 text-start`}>
 {labels.statusDistribution}
 </h3>
 {statusDistribution.length > 0 ? (
 <ResponsiveContainer width="100%" height={280}>
 <PieChart>
 <Pie
 data={statusDistribution}
 cx="50%"
 cy="50%"
 innerRadius={60}
 outerRadius={100}
 fill="#8884d8"
 dataKey="value"
 label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
 >
 {statusDistribution.map((_entry, index) => (
 <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
 ))}
 </Pie>
 <Tooltip />
 <Legend />
 </PieChart>
 </ResponsiveContainer>
 ) : (
 <p className="text-center text-gray-500 text-sm py-10">{labels.noData}</p>
 )}
 </div>
 </div>

 {/* ================================================================ */}
 {/* SECTION 2: INDICATOR PERFORMANCE ANALYSIS */}
 {/* ================================================================ */}
 <div>
 <h2 className={`text-2xl font-bold text-gray-900 mb-5 text-start`}>
 {labels.indicatorPerformance}
 </h2>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
 {/* Target vs Actual Bar Chart */}
 <div className="bg-white rounded-lg border border-gray-200 p-6 lg:col-span-2">
 <h3 className={`text-lg font-semibold text-gray-900 mb-4 text-start`}>
 {labels.targetVsActual}
 </h3>
 {targetVsActualData.length > 0 ? (
 <ResponsiveContainer width="100%" height={350}>
 <BarChart data={targetVsActualData}>
 <CartesianGrid strokeDasharray="3 3" />
 <XAxis dataKey="name" tick={{ fontSize: 11 }} />
 <YAxis tick={{ fontSize: 12 }} />
 <Tooltip contentStyle={{ fontSize: 12 }} />
 <Legend wrapperStyle={{ fontSize: 12 }} />
 <Bar dataKey={labels.target} fill={COLORS.primary} radius={[4, 4, 0, 0]} />
 <Bar dataKey={labels.actual} fill={COLORS.achieved} radius={[4, 4, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 ) : (
 <p className="text-center text-gray-500 text-sm py-10">{labels.noData}</p>
 )}
 </div>

 {/* Progress Over Time */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h3 className={`text-lg font-semibold text-gray-900 mb-4 text-start`}>
 {labels.progressOverTime}
 </h3>
 {progressData.length > 0 ? (
 <ResponsiveContainer width="100%" height={280}>
 <AreaChart data={progressData}>
 <CartesianGrid strokeDasharray="3 3" />
 <XAxis dataKey="period" tick={{ fontSize: 11 }} />
 <YAxis tick={{ fontSize: 12 }} />
 <Tooltip contentStyle={{ fontSize: 12 }} />
 <Area type="monotone" dataKey="achieved" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.3} />
 </AreaChart>
 </ResponsiveContainer>
 ) : (
 <p className="text-center text-gray-500 text-sm py-10">{labels.noData}</p>
 )}
 </div>

 {/* At-Risk Indicators Table */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h3 className={`text-lg font-semibold text-gray-900 mb-4 text-start`}>
 {labels.atRiskIndicators}
 </h3>
 {indicatorPerf?.atRiskIndicators && indicatorPerf.atRiskIndicators.length > 0 ? (
 <div className="space-y-3">
 {indicatorPerf.atRiskIndicators.map((ind, idx) => {
 const pct = ind.target > 0 ? Math.round((ind.actual / ind.target) * 100) : 0;
 return (
 <div key={idx} className={`flex items-center justify-between p-3 rounded-lg ${ind.status === 'OFF_TRACK' ? 'bg-red-50' : 'bg-yellow-50'}`}>
 <div className={`flex-1 text-start`}>
 <p className="text-sm font-medium text-gray-900">
 {language === 'ar' && ind.nameAr ? ind.nameAr : ind.name}
 </p>
 <p className="text-xs text-gray-500">{ind.actual} / {ind.target} ({pct}%)</p>
 </div>
 <span className={`px-2 py-1 text-xs font-medium rounded-full ${ ind.status === 'OFF_TRACK' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700' }`}>
 {ind.status === 'OFF_TRACK' ? labels.offTrack : labels.atRisk}
 </span>
 </div>
 );
 })}
 </div>
 ) : (
 <p className="text-center text-gray-500 text-sm py-10">{labels.noData}</p>
 )}
 </div>
 </div>

 {/* Auto-generated Performance Summary */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
 <div className={`flex items-start gap-3`}>
 <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
 <div className={'text-start'}>
 <h4 className="text-base font-semibold text-blue-900 mb-1">{labels.performanceSummary}</h4>
 <p className="text-sm text-blue-800 leading-relaxed">
             {`${t.mealReports.overallAchievementRateIs} ${s.achievementRate}%. ${s.indicatorsAchieved} ${t.mealReports.indicatorsAchievedTargets}, ${s.indicatorsOnTrack} ${t.mealReports.onTrackCount}, ${s.indicatorsAtRisk + s.indicatorsOffTrack} ${t.mealReports.requireAttention}. ${t.mealReports.dataCompletenessStandsAt} ${s.dataCompletenessRate}% - ${s.verifiedDataEntries} ${t.mealReports.verifiedEntriesOutOf} ${s.totalDataEntries}.`
             }
 </p>
 </div>
 </div>
 </div>
 </div>

 {/* ================================================================ */}
 {/* SECTION 3: SURVEY & DATA COLLECTION INSIGHTS */}
 {/* ================================================================ */}
 <div>
 <h2 className={`text-2xl font-bold text-gray-900 mb-5 text-start`}>
 {labels.surveyInsights}
 </h2>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Surveys by Type */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h3 className={`text-lg font-semibold text-gray-900 mb-4 text-start`}>
 {labels.surveysByType}
 </h3>
 {surveyTypeData.length > 0 ? (
 <ResponsiveContainer width="100%" height={250}>
 <BarChart data={surveyTypeData}>
 <CartesianGrid strokeDasharray="3 3" />
 <XAxis dataKey="type" tick={{ fontSize: 11 }} />
 <YAxis tick={{ fontSize: 12 }} />
 <Tooltip contentStyle={{ fontSize: 12 }} />
 <Bar dataKey="count" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 ) : (
 <p className="text-center text-gray-500 text-sm py-10">{labels.noData}</p>
 )}
 </div>

 {/* Survey Status Distribution */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h3 className={`text-lg font-semibold text-gray-900 mb-4 text-start`}>
 {labels.surveysByStatus}
 </h3>
 {surveyStatusData.length > 0 ? (
 <ResponsiveContainer width="100%" height={250}>
 <PieChart>
 <Pie
 data={surveyStatusData}
 cx="50%"
 cy="50%"
 outerRadius={80}
 fill="#8884d8"
 dataKey="value"
 label={({ name, value }) => `${name}: ${value}`}
 >
 <Cell fill={COLORS.pending} />
 <Cell fill={COLORS.achieved} />
 <Cell fill={COLORS.atRisk} />
 <Cell fill="#94A3B8" />
 </Pie>
 <Tooltip />
 </PieChart>
 </ResponsiveContainer>
 ) : (
 <p className="text-center text-gray-500 text-sm py-10">{labels.noData}</p>
 )}
 </div>

 {/* Submission Status */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h3 className={`text-lg font-semibold text-gray-900 mb-4 text-start`}>
 {labels.submissionStatus}
 </h3>
 {submissionStatusData.length > 0 ? (
 <ResponsiveContainer width="100%" height={250}>
 <PieChart>
 <Pie
 data={submissionStatusData}
 cx="50%"
 cy="50%"
 innerRadius={50}
 outerRadius={80}
 fill="#8884d8"
 dataKey="value"
 label={({ name, value }) => `${name}: ${value}`}
 >
 <Cell fill={COLORS.validated} />
 <Cell fill={COLORS.pending} />
 </Pie>
 <Tooltip />
 </PieChart>
 </ResponsiveContainer>
 ) : (
 <p className="text-center text-gray-500 text-sm py-10">{labels.noData}</p>
 )}
 </div>
 </div>
 </div>

 {/* ================================================================ */}
 {/* SECTION 4: ACCOUNTABILITY & CRM SUMMARY */}
 {/* ================================================================ */}
 <div>
 <h2 className={`text-2xl font-bold text-gray-900 mb-5 text-start`}>
 {labels.accountabilitySummary}
 </h2>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
 {/* By Type */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h3 className={`text-lg font-semibold text-gray-900 mb-4 text-start`}>
 {labels.byType}
 </h3>
 {accountabilityTypeData.length > 0 ? (
 <ResponsiveContainer width="100%" height={250}>
 <BarChart data={accountabilityTypeData}>
 <CartesianGrid strokeDasharray="3 3" />
 <XAxis dataKey="name" tick={{ fontSize: 11 }} />
 <YAxis tick={{ fontSize: 12 }} />
 <Tooltip contentStyle={{ fontSize: 12 }} />
 <Bar dataKey="value" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 ) : (
 <p className="text-center text-gray-500 text-sm py-10">{labels.noData}</p>
 )}
 </div>

 {/* Resolution Status */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h3 className={`text-lg font-semibold text-gray-900 mb-4 text-start`}>
 {labels.resolutionRate}
 </h3>
 {accountabilityStatusData.length > 0 ? (
 <ResponsiveContainer width="100%" height={250}>
 <PieChart>
 <Pie
 data={accountabilityStatusData}
 cx="50%"
 cy="50%"
 innerRadius={50}
 outerRadius={80}
 fill="#8884d8"
 dataKey="value"
 label={({ name, value }) => `${name}: ${value}`}
 >
 <Cell fill={COLORS.resolved} />
 <Cell fill={COLORS.inProgress} />
 <Cell fill={COLORS.offTrack} />
 </Pie>
 <Tooltip />
 </PieChart>
 </ResponsiveContainer>
 ) : (
 <p className="text-center text-gray-500 text-sm py-10">{labels.noData}</p>
 )}
 </div>

 {/* By Severity */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h3 className={`text-lg font-semibold text-gray-900 mb-4 text-start`}>
 {labels.bySeverity}
 </h3>
 {severityData.length > 0 ? (
 <ResponsiveContainer width="100%" height={250}>
 <BarChart data={severityData}>
 <CartesianGrid strokeDasharray="3 3" />
 <XAxis dataKey="name" tick={{ fontSize: 11 }} />
 <YAxis tick={{ fontSize: 12 }} />
 <Tooltip contentStyle={{ fontSize: 12 }} />
 <Bar dataKey="value" radius={[4, 4, 0, 0]}>
 {severityData.map((entry, index) => (
 <Cell key={index} fill={
 entry.name === labels.low ? '#22C55E' :
 entry.name === labels.medium ? '#F59E0B' :
 entry.name === labels.high ? '#EF4444' :
 '#991B1B'
 } />
 ))}
 </Bar>
 </BarChart>
 </ResponsiveContainer>
 ) : (
 <p className="text-center text-gray-500 text-sm py-10">{labels.noData}</p>
 )}
 </div>
 </div>

 {/* Feedback by Category */}
 {accountabilitySummary && accountabilitySummary.byCategory.length > 0 && (
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <h3 className={`text-lg font-semibold text-gray-900 mb-4 text-start`}>
 {labels.feedbackByCategory}
 </h3>
 <ResponsiveContainer width="100%" height={280}>
 <BarChart data={accountabilitySummary.byCategory} layout="vertical">
 <CartesianGrid strokeDasharray="3 3" />
 <XAxis type="number" tick={{ fontSize: 12 }} />
 <YAxis dataKey="category" type="category" width={140} tick={{ fontSize: 11 }} />
 <Tooltip contentStyle={{ fontSize: 12 }} />
 <Bar dataKey="count" fill={COLORS.secondary} radius={[0, 4, 4, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 )}
 </div>

 {/* ================================================================ */}
 {/* SECTION 5: INTEGRATED RISK & LEARNING ANALYSIS */}
 {/* ================================================================ */}
 <div>
 <h2 className={`text-2xl font-bold text-gray-900 mb-5 text-start`}>
 {labels.riskLearning}
 </h2>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
 {/* Key Risks */}
 <div className="bg-red-50 border border-red-200 rounded-lg p-5">
 <div className={`flex items-start gap-3 mb-3`}>
 <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
 <h3 className={`text-base font-semibold text-red-900 text-start`}>
 {labels.keyRisks}
 </h3>
 </div>
 <ul className={`space-y-2 text-start`}>
 {s.indicatorsOffTrack > 0 && (
 <li className="text-sm text-red-800">
 • {s.indicatorsOffTrack} {t.mealReports.indicatorsOffTrack}
 </li>
 )}
 {s.resolutionRate < 80 && s.totalFeedback > 0 && (
 <li className="text-sm text-red-800">
 • {t.mealReports.lowFeedbackResolutionRate} ({s.resolutionRate}%)
 </li>
 )}
 {s.dataCompletenessRate < 90 && s.totalDataEntries > 0 && (
 <li className="text-sm text-red-800">
 • {t.mealReports.dataCompletenessBelowTarget} ({s.dataCompletenessRate}%)
 </li>
 )}
 {s.indicatorsOffTrack === 0 && s.resolutionRate >= 80 && s.dataCompletenessRate >= 90 && (
 <li className="text-sm text-green-800">
 • {t.mealReports.noCriticalRisksIdentified}
 </li>
 )}
 </ul>
 </div>

 {/* Corrective Actions */}
 <div className="bg-orange-50 border border-orange-200 rounded-lg p-5">
 <div className={`flex items-start gap-3 mb-3`}>
 <Clock className="w-5 h-5 text-orange-600 flex-shrink-0" />
 <h3 className={`text-base font-semibold text-orange-900 text-start`}>
 {labels.correctiveActions}
 </h3>
 </div>
 <ul className={`space-y-2 text-start`}>
 {s.indicatorsAtRisk + s.indicatorsOffTrack > 0 && (
 <li className="text-sm text-orange-800">
 • {t.mealReports.reviewUnderperformingIndicators} ({s.indicatorsAtRisk + s.indicatorsOffTrack})
 </li>
 )}
 {s.dataCompletenessRate < 100 && s.totalDataEntries > 0 && (
 <li className="text-sm text-orange-800">
 • {t.mealReports.improveDataCollectionProcesses}
 </li>
 )}
 {s.resolutionRate < 100 && s.totalFeedback > 0 && (
 <li className="text-sm text-orange-800">
 • {t.mealReports.resolvePendingFeedbackCases} ({s.totalFeedback - s.feedbackResolved})
 </li>
 )}
 </ul>
 </div>

 {/* Lessons Learned */}
 <div className="bg-green-50 border border-green-200 rounded-lg p-5">
 <div className={`flex items-start gap-3 mb-3`}>
 <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
 <h3 className={`text-base font-semibold text-green-900 text-start`}>
 {labels.lessonsLearned}
 </h3>
 </div>
 <ul className={`space-y-2 text-start`}>
 {s.achievementRate >= 70 && (
 <li className="text-sm text-green-800">
 • {t.mealReports.strongOverallPerformance} ({s.achievementRate}%)
 </li>
 )}
 {s.totalSurveys > 0 && (
 <li className="text-sm text-green-800">
            • {`${s.totalSurveys} ${t.mealReports.surveysDeployedSuccessfully}`}
 </li>
 )}
 {s.resolutionRate >= 80 && s.totalFeedback > 0 && (
 <li className="text-sm text-green-800">
 • {t.mealReports.goodAccountabilityPractices} ({s.resolutionRate}%)
 </li>
 )}
 </ul>
 </div>
 </div>

 {/* Future-Ready Hooks: DQA + Learning */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 opacity-60">
 <div className={`flex items-center gap-3 mb-3`}>
 <BarChart3 className="w-5 h-5 text-gray-400" />
 <h3 className={`text-base font-semibold text-gray-500 text-start`}>
 {labels.dqaComingSoon}
 </h3>
 </div>
 <p className={`text-sm text-gray-400 text-start`}>
 {labels.comingSoon}
 </p>
 </div>
 <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 opacity-60">
 <div className={`flex items-center gap-3 mb-3`}>
 <FileText className="w-5 h-5 text-gray-400" />
 <h3 className={`text-base font-semibold text-gray-500 text-start`}>
 {labels.learningComingSoon}
 </h3>
 </div>
 <p className={`text-sm text-gray-400 text-start`}>
 {labels.comingSoon}
 </p>
 </div>
 </div>
 </div>

 </div>
 {/* END REPORT CONTENT */}
 </div>
 );
}
