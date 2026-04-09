import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
 ArrowLeft, ArrowRight,
 Download,
 Edit2,
 Save,
 X,
 TrendingUp,
 Users,
 DollarSign,
 CheckCircle2,
 Target,
 AlertCircle,
 Lightbulb,
 FileText,
 Lock,
 Info
} from 'lucide-react';
import { useLanguage, formatNumber, formatCurrency } from '@/contexts/LanguageContext';
import { useAnnualProgramsData } from '@/hooks/useAnnualProgramsData';
import { updateAPRSection } from '@/services/aprDataService';
import { useAuth } from '@/_core/hooks/useAuth';
import { MENA_COUNTRIES } from '@/constants/countries';
import {
 PieChart,
 Pie,
 Cell,
 BarChart,
 Bar,
 LineChart,
 Line,
 XAxis,
 YAxis,
 CartesianGrid,
 Tooltip,
 Legend,
 ResponsiveContainer
} from 'recharts';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export default function AnnualProgramsReport() {
 const { t } = useTranslation();
 const { direction, language, isRTL} = useLanguage();
 const [, setLocation] = useLocation();
 const { user } = useAuth();

 const currentYear = new Date().getFullYear();
 const [selectedYear, setSelectedYear] = useState(currentYear);
 const [selectedCountry, setSelectedCountry] = useState<string>('');

 const reportData = useAnnualProgramsData({
 year: selectedYear,
 country: selectedCountry || undefined
 });

 const [editingSection, setEditingSection] = useState<string | null>(null);
 const [narrativeData, setNarrativeData] = useState({
 executiveSummary: reportData.executiveSummary.narrative,
 challenges: reportData.challenges.narrative,
 strategicOutlook: reportData.pipelineOutlook.strategicOutlook,
 managementNotes: reportData.managementNotes.notes
 });

 useEffect(() => {
 setNarrativeData({
 executiveSummary: reportData.executiveSummary.narrative,
 challenges: reportData.challenges.narrative,
 strategicOutlook: reportData.pipelineOutlook.strategicOutlook,
 managementNotes: reportData.managementNotes.notes
 });
 setEditingSection(null);
 }, [selectedYear, reportData.executiveSummary.narrative, reportData.challenges.narrative, reportData.pipelineOutlook.strategicOutlook, reportData.managementNotes.notes]);

 const canEdit = 
 user?.role === 'admin' || 
 user?.role === 'Admin' ||
 user?.role === 'Country Director' ||
 user?.role === 'country_director' ||
 user?.role === 'Program Manager' ||
 user?.role === 'program_manager' ||
 user?.role === 'Executive Manager' ||
 user?.role === 'executive_manager';
 
 // DEBUG: Check permissions
 console.log('APR Permissions Debug:', {
 userId: user?.id,
 userRole: user?.role,
 userName: user?.name,
 canEdit: canEdit
 });

 const labels = {
 title: t.organizationModule.annualProgramsReport,
 subtitle: t.organizationModule.annualProgramsReportSubtitle,
 year: t.organizationModule.year,
 country: t.organizationModule.country,
 allCountries: t.organizationModule.allCountries,
 exportPDF: t.organizationModule.exportPdf,
 edit: t.organizationModule.edit1,
 save: t.organizationModule.save,
 cancel: t.organizationModule.cancel,
 sectionA: t.organizationModule.aExecutiveSummary,
 sectionB: t.organizationModule.bKeyAchievements,
 sectionC: t.organizationModule.cProgramGrantPerformance,
 sectionD: t.organizationModule.dChallengesConstraints,
 sectionE: t.organizationModule.ePipelineFutureOutlook,
 sectionF: t.organizationModule.fManagementNotes,
 totalProjects: t.organizationModule.totalProjects,
 totalBeneficiaries: t.organizationModule.totalBeneficiaries,
 totalBudget: t.organizationModule.totalBudget,
 budgetUtilization: t.organizationModule.budgetUtilization,
 completedProjects: t.organizationModule.completedProjects,
 ongoingProjects: t.organizationModule.ongoingProjects,
 projectsByStatus: t.organizationModule.projectsByStatus,
 budgetVsSpent: t.organizationModule.budgetVsSpentBySector,
 monthlyTrend: t.organizationModule.monthlyTrend,
 budget: t.organizationModule.budget,
 spent: t.organizationModule.spent,
 projects: t.organizationModule.projects,
 noDataEntered: t.organizationModule.noDataEnteredYetClickEdit,
 enterNarrative: t.organizationModule.enterExecutiveSummaryHere,
 enterChallenges: t.organizationModule.describeChallengesAndOperationalConstraints,
 enterOutlook: t.organizationModule.enterStrategicOutlookForNextYear,
 enterNotes: t.organizationModule.enterManagementNotesLessonsLearnedDonor,
 proposalsSubmitted: t.organizationModule.proposalsSubmitted,
 pipelineValue: t.organizationModule.pipelineValue,
 approvalRate: t.organizationModule.approvalRate,
 highlights: t.organizationModule.highlights,
 dataSource: t.organizationModule.dataSource,
 autoAggregated: t.organizationModule.autoaggregatedFromRealSystemData,
 readOnly: t.organizationModule.readonly,
 editable: t.organizationModule.editable,
 noEditPermission: t.organizationModule.youDontHavePermissionToEdit,
 editableByRoles: t.organizationModule.editableByAdminCountryDirectorProgram,
 noDataForYear: `No project data available for year ${selectedYear}`,
 noDataMessage: t.organizationModule.noActiveProjectsOrGrantsFound,
 activeGrants: t.organizationModule.activeGrants,
 closedGrants: t.organizationModule.closedGrants,
 totalGrantValue: t.organizationModule.totalGrantValue,
 strategicOutlook: t.organizationModule.strategicOutlook,
 savedSuccessfully: t.organizationModule.savedSuccessfully,
 lastUpdated: t.organizationModule.lastUpdated
 };

 const handleSaveNarrative = (section: keyof typeof narrativeData) => {
 try {
 updateAPRSection(selectedYear, section, narrativeData[section], user?.id);
 setEditingSection(null);
 alert(`${t.savedSuccessfully} (${selectedYear})`);
 } catch (error) {
 console.error('Error saving APR narrative:', error);
 alert(t.organizationModule.saveFailed);
 }
 };

 const availableYears = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2, currentYear - 3];

 const hasRealData = reportData.projectCount > 0;

 return (
 <div className="min-h-screen bg-gray-50 p-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="max-w-7xl mx-auto space-y-6">
 <div className={`flex items-start gap-2`}>
 <BackButton onClick={() => setLocation('/organization/projects')} iconOnly />

 <div className={`flex-1 text-start`}>
 <h1 className="text-page-title font-bold text-gray-900">{labels.title}</h1>
 <p className="text-gray-600 mt-1">{labels.subtitle}</p>
 </div>

 <button
 onClick={() => window.print()}
 className={`px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2`}
 >
 <Download className="w-4 h-4" />
 {labels.exportPDF}
 </button>
 </div>

 <div className={`flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-200`}>
 <div className={`flex items-center gap-2`}>
 <label className="text-sm font-medium text-gray-700">{labels.year}:</label>
 <select
 value={selectedYear}
 onChange={(e) => setSelectedYear(parseInt(e.target.value))}
 className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
 >
 {availableYears.map((year) => (
 <option key={year} value={year}>{year}</option>
 ))}
 </select>
 </div>

 <div className={`flex items-center gap-2`}>
 <label className="text-sm font-medium text-gray-700">{labels.country}:</label>
 <select
 value={selectedCountry}
 onChange={(e) => setSelectedCountry(e.target.value)}
 className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
 >
 <option value="">{labels.allCountries}</option>
 {MENA_COUNTRIES.map((country) => (
 <option key={country} value={country}>{country}</option>
 ))}
 </select>
 </div>

 <div className={`flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-md`}>
 <Info className="w-4 h-4 text-blue-600" />
 <span className="text-xs text-blue-700">{labels.autoAggregated}</span>
 </div>
 </div>

 {!hasRealData && (
 <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
 <div className={`flex items-start gap-3`}>
 <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
 <div className={'text-start'}>
 <h3 className="font-semibold text-yellow-900">{labels.noDataForYear}</h3>
 <p className="text-sm text-yellow-700 mt-1">{t.noDataMessage}</p>
 </div>
 </div>
 </div>
 )}

 <div className={`grid grid-cols-4 gap-4`}>
 <KPICard
 title={labels.totalProjects}
 value={reportData.keyAchievements.totalProjects}
 icon={<Target className="w-5 h-5" />}
 color="blue"
 isRTL={isRTL}
 isReadOnly={true}
 />
 <KPICard
 title={labels.totalBeneficiaries}
 value={formatNumber(reportData.keyAchievements.totalBeneficiaries)}
 icon={<Users className="w-5 h-5" />}
 color="green"
 isRTL={isRTL}
 isReadOnly={true}
 />
 <KPICard
 title={labels.totalBudget}
 value={formatCurrency(reportData.keyAchievements.totalBudget, 'USD', language)}
 icon={<DollarSign className="w-5 h-5" />}
 color="purple"
 isRTL={isRTL}
 isReadOnly={true}
 />
 <KPICard
 title={labels.budgetUtilization}
 value={`${reportData.keyAchievements.totalBudget > 0 ? Math.round((reportData.keyAchievements.totalSpent / reportData.keyAchievements.totalBudget) * 100) : 0}%`}
 icon={<TrendingUp className="w-5 h-5" />}
 color="orange"
 isRTL={isRTL}
 isReadOnly={true}
 />
 </div>

 <Section
 id="section-a"
 title={labels.sectionA}
 editable={true}
 isEditing={editingSection === 'executiveSummary'}
 onEdit={() => canEdit && setEditingSection('executiveSummary')}
 onSave={() => handleSaveNarrative('executiveSummary')}
 onCancel={() => setEditingSection(null)}
 isRTL={isRTL}
 t={t}
 canEdit={canEdit}
 badge="editable"
 >
 {editingSection === 'executiveSummary' ? (
 <textarea
 value={narrativeData.executiveSummary}
 onChange={(e) => setNarrativeData({ ...narrativeData, executiveSummary: e.target.value })}
 rows={8}
 className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 placeholder={labels.enterNarrative}
 
 />
 ) : (
 <div className="text-gray-700 whitespace-pre-wrap">
 {narrativeData.executiveSummary || (
 <div className="text-gray-400 italic">{labels.noDataEntered}</div>
 )}
 </div>
 )}
 </Section>

 <Section
 id="section-b"
 title={labels.sectionB}
 editable={false}
 isRTL={isRTL}
 t={t}
 badge="auto"
 >
 <div className="space-y-6">
 <div className="grid grid-cols-3 gap-4">
 <StatBox
 label={labels.completedProjects}
 value={reportData.keyAchievements.completedProjects}
 icon={<CheckCircle2 className="w-4 h-4 text-green-600" />}
 isRTL={isRTL}
 />
 <StatBox
 label={labels.ongoingProjects}
 value={reportData.keyAchievements.ongoingProjects}
 icon={<Target className="w-4 h-4 text-blue-600" />}
 isRTL={isRTL}
 />
 <StatBox
 label={labels.totalBeneficiaries}
 value={formatNumber(reportData.keyAchievements.totalBeneficiaries)}
 icon={<Users className="w-4 h-4 text-purple-600" />}
 isRTL={isRTL}
 />
 </div>

 <div>
 <h4 className={`text-sm font-semibold text-gray-700 mb-3 text-start`}>
 {labels.highlights}
 </h4>
 <div className="space-y-2">
 {reportData.keyAchievements.highlights.map((highlight, index) => (
 <div key={index} className={`flex items-start gap-2`}>
 <Lightbulb className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
 <span className="text-gray-700">{highlight}</span>
 </div>
 ))}
 </div>
 </div>
 </div>
 </Section>

 <Section
 id="section-c"
 title={labels.sectionC}
 editable={false}
 isRTL={isRTL}
 t={t}
 badge="auto"
 >
 <div className="space-y-6">
 <div className="grid grid-cols-2 gap-6">
 <div>
 <h4 className={`text-sm font-semibold text-gray-700 mb-3 text-start`}>
 {labels.projectsByStatus}
 </h4>
 {hasRealData ? (
 <ResponsiveContainer width="100%" height={250}>
 <PieChart>
 <Pie
 data={reportData.programPerformance.projectsByStatus}
 cx="50%"
 cy="50%"
 labelLine={false}
 label={(entry) => `${entry.name}: ${entry.value}`}
 outerRadius={80}
 fill="#8884d8"
 dataKey="value"
 >
 {reportData.programPerformance.projectsByStatus.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={entry.color} />
 ))}
 </Pie>
 <Tooltip />
 </PieChart>
 </ResponsiveContainer>
 ) : (
 <div className="h-[250px] flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
 <span className="text-gray-400">{t.noDataMessage}</span>
 </div>
 )}
 </div>

 <div>
 <h4 className={`text-sm font-semibold text-gray-700 mb-3 text-start`}>
 {labels.budgetVsSpent}
 </h4>
 {hasRealData && reportData.programPerformance.budgetVsSpent.length > 0 ? (
 <ResponsiveContainer width="100%" height={250}>
 <BarChart data={reportData.programPerformance.budgetVsSpent}>
 <CartesianGrid strokeDasharray="3 3" />
 <XAxis dataKey="name" />
 <YAxis />
 <Tooltip />
 <Legend />
 <Bar dataKey="budget" fill="#3b82f6" name={labels.budget} />
 <Bar dataKey="spent" fill="#10b981" name={labels.spent} />
 </BarChart>
 </ResponsiveContainer>
 ) : (
 <div className="h-[250px] flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
 <span className="text-gray-400">{t.noDataMessage}</span>
 </div>
 )}
 </div>
 </div>

 <div>
 <h4 className={`text-sm font-semibold text-gray-700 mb-3 text-start`}>
 {labels.monthlyTrend}
 </h4>
 {hasRealData ? (
 <ResponsiveContainer width="100%" height={250}>
 <LineChart data={reportData.programPerformance.monthlyTrend}>
 <CartesianGrid strokeDasharray="3 3" />
 <XAxis dataKey="month" />
 <YAxis yAxisId="left" />
 <YAxis yAxisId="right" orientation="right" />
 <Tooltip />
 <Legend />
 <Line yAxisId="left" type="monotone" dataKey="projects" stroke="#3b82f6" name={labels.projects} />
 <Line yAxisId="right" type="monotone" dataKey="budget" stroke="#10b981" name={labels.budget} />
 </LineChart>
 </ResponsiveContainer>
 ) : (
 <div className="h-[250px] flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
 <span className="text-gray-400">{t.noDataMessage}</span>
 </div>
 )}
 </div>

 <div className="grid grid-cols-4 gap-4">
 <StatBox
 label={t.activeGrants}
 value={reportData.grantPerformance.activeGrants}
 icon={<FileText className="w-4 h-4 text-blue-600" />}
 isRTL={isRTL}
 />
 <StatBox
 label={t.closedGrants}
 value={reportData.grantPerformance.closedGrants}
 icon={<CheckCircle2 className="w-4 h-4 text-green-600" />}
 isRTL={isRTL}
 />
 <StatBox
 label={t.totalGrantValue}
 value={formatCurrency(reportData.grantPerformance.totalGrantValue, 'USD', language)}
 icon={<DollarSign className="w-4 h-4 text-purple-600" />}
 isRTL={isRTL}
 />
 <StatBox
 label={labels.budgetUtilization}
 value={`${reportData.grantPerformance.utilizationRate}%`}
 icon={<TrendingUp className="w-4 h-4 text-orange-600" />}
 isRTL={isRTL}
 />
 </div>
 </div>
 </Section>

 <Section
 id="section-d"
 title={labels.sectionD}
 editable={true}
 isEditing={editingSection === 'challenges'}
 onEdit={() => canEdit && setEditingSection('challenges')}
 onSave={() => handleSaveNarrative('challenges')}
 onCancel={() => setEditingSection(null)}
 isRTL={isRTL}
 t={t}
 canEdit={canEdit}
 badge="editable"
 >
 {editingSection === 'challenges' ? (
 <textarea
 value={narrativeData.challenges}
 onChange={(e) => setNarrativeData({ ...narrativeData, challenges: e.target.value })}
 rows={6}
 className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 placeholder={labels.enterChallenges}
 
 />
 ) : (
 <div className="text-gray-700 whitespace-pre-wrap">
 {narrativeData.challenges || (
 <div className="text-gray-400 italic">{labels.noDataEntered}</div>
 )}
 </div>
 )}
 </Section>

 <Section
 id="section-e"
 title={labels.sectionE}
 editable={true}
 isEditing={editingSection === 'strategicOutlook'}
 onEdit={() => canEdit && setEditingSection('strategicOutlook')}
 onSave={() => handleSaveNarrative('strategicOutlook')}
 onCancel={() => setEditingSection(null)}
 isRTL={isRTL}
 t={t}
 canEdit={canEdit}
 badge="mixed"
 >
 <div className="space-y-6">
 {hasRealData && (
 <div>
 <div className={`flex items-center gap-2 mb-3`}>
 <Lock className="w-4 h-4 text-gray-400" />
 <span className="text-xs text-gray-500">{labels.readOnly}</span>
 </div>
 <div className="grid grid-cols-3 gap-4">
 <StatBox
 label={labels.proposalsSubmitted}
 value={reportData.pipelineOutlook.proposalsSubmitted}
 icon={<FileText className="w-4 h-4 text-blue-600" />}
 isRTL={isRTL}
 />
 <StatBox
 label={labels.pipelineValue}
 value={formatCurrency(reportData.pipelineOutlook.pipelineValue, 'USD', language)}
 icon={<DollarSign className="w-4 h-4 text-green-600" />}
 isRTL={isRTL}
 />
 <StatBox
 label={labels.approvalRate}
 value={`${reportData.pipelineOutlook.approvalRate}%`}
 icon={<TrendingUp className="w-4 h-4 text-purple-600" />}
 isRTL={isRTL}
 />
 </div>
 </div>
 )}

 <div>
 <h4 className={`text-sm font-semibold text-gray-700 mb-3 text-start`}>
 {t.strategicOutlook} ({labels.editable})
 </h4>
 {editingSection === 'strategicOutlook' ? (
 <textarea
 value={narrativeData.strategicOutlook}
 onChange={(e) => setNarrativeData({ ...narrativeData, strategicOutlook: e.target.value })}
 rows={4}
 className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 placeholder={labels.enterOutlook}
 
 />
 ) : (
 <div className="text-gray-700 whitespace-pre-wrap">
 {narrativeData.strategicOutlook || (
 <div className="text-gray-400 italic">{labels.noDataEntered}</div>
 )}
 </div>
 )}
 </div>
 </div>
 </Section>

 <Section
 id="section-f"
 title={labels.sectionF}
 editable={true}
 isEditing={editingSection === 'managementNotes'}
 onEdit={() => canEdit && setEditingSection('managementNotes')}
 onSave={() => handleSaveNarrative('managementNotes')}
 onCancel={() => setEditingSection(null)}
 isRTL={isRTL}
 t={t}
 canEdit={canEdit}
 badge="editable"
 >
 {editingSection === 'managementNotes' ? (
 <textarea
 value={narrativeData.managementNotes}
 onChange={(e) => setNarrativeData({ ...narrativeData, managementNotes: e.target.value })}
 rows={8}
 className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
 placeholder={labels.enterNotes}
 
 />
 ) : (
 <div className="text-gray-700 whitespace-pre-wrap">
 {narrativeData.managementNotes || (
 <div className="text-gray-400 italic">{labels.noDataEntered}</div>
 )}
 </div>
 )}
 </Section>
 </div>
 </div>
 );
}

interface SectionProps {
 id: string;
 title: string;
 editable: boolean;
 isEditing?: boolean;
 onEdit?: () => void;
 onSave?: () => void;
 onCancel?: () => void;
 children: React.ReactNode;
 isRTL: boolean;
 t: any;
 canEdit?: boolean;
 badge?: 'auto' | 'editable' | 'mixed';
}

function Section({ id, title, editable, isEditing, onEdit, onSave, onCancel, children, isRTL, t, canEdit = true, badge }: SectionProps) {
 return (
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <div className={`flex items-center justify-between mb-4`}>
 <div className={`flex items-center gap-2`}>
 <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
 {badge && (
 <span
 className={`px-2 py-0.5 text-xs rounded-full ${ badge === 'auto' ? 'bg-blue-100 text-blue-700' : badge === 'editable' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700' }`}
 >
 {badge === 'auto' ? labels.readOnly : badge === 'editable' ? labels.editable : 'Mixed'}
 </span>
 )}
 </div>
 {editable && (
 <div className={`flex items-center gap-2`}>
 {isEditing ? (
 <>
 <button
 onClick={onSave}
 className={`px-3 py-1.5 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-1`}
 >
 <Save className="w-3.5 h-3.5" />
 {labels.save}
 </button>
 <button
 onClick={onCancel}
 className={`px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-1`}
 >
 <X className="w-3.5 h-3.5" />
 {labels.cancel}
 </button>
 </>
 ) : (
 <button
 onClick={onEdit}
 disabled={!canEdit}
 className={`px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-1 ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
 title={!canEdit ? labels.noEditPermission : ''}
 >
 {!canEdit && <Lock className="w-3.5 h-3.5" />}
 <Edit2 className="w-3.5 h-3.5" />
 {labels.edit}
 </button>
 )}
 </div>
 )}
 </div>
 <div>{children}</div>
 </div>
 );
}

interface KPICardProps {
 title: string;
 value: string | number;
 icon: React.ReactNode;
 color: 'blue' | 'green' | 'purple' | 'orange';
 isRTL: boolean;
 isReadOnly?: boolean;
}

function KPICard({ title, value, icon, color, isRTL, isReadOnly }: KPICardProps) {
 const colorClasses = {
 blue: 'bg-blue-50 text-blue-600',
 green: 'bg-green-50 text-green-600',
 purple: 'bg-purple-50 text-purple-600',
 orange: 'bg-orange-50 text-orange-600'
 };

 return (
 <div className="bg-white border border-gray-200 rounded-lg p-4 relative">
 {isReadOnly && (
 <div className="absolute top-2 end-2">
 <Lock className="w-3 h-3 text-gray-400" />
 </div>
 )}
 <div className={`flex items-start justify-between mb-3`}>
 <div className={`flex-1 text-start`}>
 <div className="text-xs font-medium text-gray-600 mb-1">{title}</div>
 <div className="ltr-safe text-2xl font-bold text-gray-900">{value}</div>
 </div>
 <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
 {icon}
 </div>
 </div>
 </div>
 );
}

interface StatBoxProps {
 label: string;
 value: string | number;
 icon: React.ReactNode;
 isRTL: boolean;
}

function StatBox({ label, value, icon, isRTL }: StatBoxProps) {
 return (
 <div className="bg-gray-50 rounded-lg p-4">
 <div className={`flex items-center gap-2 mb-2`}>
 {icon}
 <div className={`text-xs text-gray-600 text-start`}>{label}</div>
 </div>
 <div className="ltr-safe text-xl font-bold text-gray-900">{value}</div>
 </div>
 );
}
