import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  ArrowLeft,
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
import { useLanguage } from '@/contexts/LanguageContext';
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

export default function AnnualProgramsReport() {
  const { direction, formatCurrency, formatNumber } = useLanguage();
  const isRTL = direction === 'rtl';
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

  const t = {
    title: isRTL ? 'التقرير السنوي للبرامج' : 'Annual Programs Report',
    subtitle: isRTL
      ? 'تقرير استراتيجي شامل للإنجازات والأداء والتخطيط للعام القادم'
      : 'Comprehensive strategic report on achievements, performance, and next-year planning',
    year: isRTL ? 'السنة' : 'Year',
    country: isRTL ? 'الدولة' : 'Country',
    allCountries: isRTL ? 'جميع الدول' : 'All Countries',
    exportPDF: isRTL ? 'تصدير PDF' : 'Export PDF',
    edit: isRTL ? 'تعديل' : 'Edit',
    save: isRTL ? 'حفظ' : 'Save',
    cancel: isRTL ? 'إلغاء' : 'Cancel',
    sectionA: isRTL ? 'أ. الملخص التنفيذي' : 'A. Executive Summary',
    sectionB: isRTL ? 'ب. الإنجازات الرئيسية' : 'B. Key Achievements',
    sectionC: isRTL ? 'ج. أداء البرامج والمنح' : 'C. Program & Grant Performance',
    sectionD: isRTL ? 'د. التحديات والقيود' : 'D. Challenges & Constraints',
    sectionE: isRTL ? 'هـ. خط المشاريع والتوقعات المستقبلية' : 'E. Pipeline & Future Outlook',
    sectionF: isRTL ? 'و. ملاحظات الإدارة' : 'F. Management Notes',
    totalProjects: isRTL ? 'إجمالي المشاريع' : 'Total Projects',
    totalBeneficiaries: isRTL ? 'إجمالي المستفيدين' : 'Total Beneficiaries',
    totalBudget: isRTL ? 'إجمالي الميزانية' : 'Total Budget',
    budgetUtilization: isRTL ? 'نسبة استخدام الميزانية' : 'Budget Utilization',
    completedProjects: isRTL ? 'المشاريع المكتملة' : 'Completed Projects',
    ongoingProjects: isRTL ? 'المشاريع الجارية' : 'Ongoing Projects',
    projectsByStatus: isRTL ? 'المشاريع حسب الحالة' : 'Projects by Status',
    budgetVsSpent: isRTL ? 'الميزانية مقابل المصروف حسب القطاع' : 'Budget vs Spent by Sector',
    monthlyTrend: isRTL ? 'الاتجاه الشهري' : 'Monthly Trend',
    budget: isRTL ? 'ميزانية' : 'Budget',
    spent: isRTL ? 'مصروف' : 'Spent',
    projects: isRTL ? 'مشاريع' : 'Projects',
    noDataEntered: isRTL ? 'لم يتم إدخال بيانات بعد. انقر على "تعديل" للإضافة.' : 'No data entered yet. Click "Edit" to add.',
    enterNarrative: isRTL ? 'أدخل الملخص التنفيذي هنا...' : 'Enter executive summary here...',
    enterChallenges: isRTL ? 'صف التحديات والقيود التشغيلية...' : 'Describe challenges and operational constraints...',
    enterOutlook: isRTL ? 'أدخل التوقعات الاستراتيجية للعام القادم...' : 'Enter strategic outlook for next year...',
    enterNotes: isRTL ? 'أدخل ملاحظات الإدارة، الدروس المستفادة، ملاحظات الجهات المانحة...' : 'Enter management notes, lessons learned, donor remarks...',
    proposalsSubmitted: isRTL ? 'المقترحات المقدمة' : 'Proposals Submitted',
    pipelineValue: isRTL ? 'قيمة خط المشاريع' : 'Pipeline Value',
    approvalRate: isRTL ? 'معدل الموافقة' : 'Approval Rate',
    highlights: isRTL ? 'أبرز الإنجازات' : 'Highlights',
    dataSource: isRTL ? 'مصدر البيانات' : 'Data Source',
    autoAggregated: isRTL ? 'تم التجميع تلقائيًا من بيانات النظام الفعلية' : 'Auto-aggregated from real system data',
    readOnly: isRTL ? 'للقراءة فقط' : 'Read-Only',
    editable: isRTL ? 'قابل للتعديل' : 'Editable',
    noEditPermission: isRTL ? 'ليس لديك صلاحية للتعديل' : 'You don\'t have permission to edit',
    editableByRoles: isRTL ? 'قابل للتعديل من قبل: المسؤول، مدير الدولة، مدير البرنامج' : 'Editable by: Admin, Country Director, Program Manager',
    noDataForYear: isRTL ? `لا توجد بيانات مشاريع لعام ${selectedYear}` : `No project data available for year ${selectedYear}`,
    noDataMessage: isRTL ? 'لم يتم العثور على مشاريع أو منح نشطة لهذا العام. الرسوم البيانية والمؤشرات تعتمد على البيانات الفعلية فقط.' : 'No active projects or grants found for this year. Charts and metrics rely on real data only.',
    activeGrants: isRTL ? 'المنح النشطة' : 'Active Grants',
    closedGrants: isRTL ? 'المنح المغلقة' : 'Closed Grants',
    totalGrantValue: isRTL ? 'إجمالي قيمة المنح' : 'Total Grant Value',
    strategicOutlook: isRTL ? 'التوقعات الاستراتيجية' : 'Strategic Outlook',
    savedSuccessfully: isRTL ? 'تم الحفظ بنجاح' : 'Saved successfully',
    lastUpdated: isRTL ? 'آخر تحديث' : 'Last Updated'
  };

  const handleSaveNarrative = (section: keyof typeof narrativeData) => {
    try {
      updateAPRSection(selectedYear, section, narrativeData[section], user?.id);
      setEditingSection(null);
      alert(`${t.savedSuccessfully} (${selectedYear})`);
    } catch (error) {
      console.error('Error saving APR narrative:', error);
      alert(isRTL ? 'فشل الحفظ' : 'Save failed');
    }
  };

  const availableYears = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2, currentYear - 3];

  const hasRealData = reportData.projectCount > 0;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className={`flex items-start ${isRTL ? 'flex-row-reverse gap-3' : 'gap-2'}`}>
          <button
            onClick={() => setLocation('/organization/projects')}
            className="text-gray-500 hover:text-gray-900 mt-1 flex-shrink-0"
          >
            <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
          </button>

          <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            <h1 className="text-page-title font-bold text-gray-900">{t.title}</h1>
            <p className="text-gray-600 mt-1">{t.subtitle}</p>
          </div>

          <button
            onClick={() => window.print()}
            className={`px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Download className="w-4 h-4" />
            {t.exportPDF}
          </button>
        </div>

        <div className={`flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <label className="text-sm font-medium text-gray-700">{t.year}:</label>
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

          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <label className="text-sm font-medium text-gray-700">{t.country}:</label>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
            >
              <option value="">{t.allCountries}</option>
              {MENA_COUNTRIES.map((country) => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>

          <div className={`flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-md ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Info className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-blue-700">{t.autoAggregated}</span>
          </div>
        </div>

        {!hasRealData && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <h3 className="font-semibold text-yellow-900">{t.noDataForYear}</h3>
                <p className="text-sm text-yellow-700 mt-1">{t.noDataMessage}</p>
              </div>
            </div>
          </div>
        )}

        <div className={`grid grid-cols-4 gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <KPICard
            title={t.totalProjects}
            value={reportData.keyAchievements.totalProjects}
            icon={<Target className="w-5 h-5" />}
            color="blue"
            isRTL={isRTL}
            isReadOnly={true}
          />
          <KPICard
            title={t.totalBeneficiaries}
            value={formatNumber(reportData.keyAchievements.totalBeneficiaries)}
            icon={<Users className="w-5 h-5" />}
            color="green"
            isRTL={isRTL}
            isReadOnly={true}
          />
          <KPICard
            title={t.totalBudget}
            value={formatCurrency(reportData.keyAchievements.totalBudget, 'USD')}
            icon={<DollarSign className="w-5 h-5" />}
            color="purple"
            isRTL={isRTL}
            isReadOnly={true}
          />
          <KPICard
            title={t.budgetUtilization}
            value={`${reportData.keyAchievements.totalBudget > 0 ? Math.round((reportData.keyAchievements.totalSpent / reportData.keyAchievements.totalBudget) * 100) : 0}%`}
            icon={<TrendingUp className="w-5 h-5" />}
            color="orange"
            isRTL={isRTL}
            isReadOnly={true}
          />
        </div>

        <Section
          id="section-a"
          title={t.sectionA}
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
              placeholder={t.enterNarrative}
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          ) : (
            <div className="text-gray-700 whitespace-pre-wrap">
              {narrativeData.executiveSummary || (
                <div className="text-gray-400 italic">{t.noDataEntered}</div>
              )}
            </div>
          )}
        </Section>

        <Section
          id="section-b"
          title={t.sectionB}
          editable={false}
          isRTL={isRTL}
          t={t}
          badge="auto"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <StatBox
                label={t.completedProjects}
                value={reportData.keyAchievements.completedProjects}
                icon={<CheckCircle2 className="w-4 h-4 text-green-600" />}
                isRTL={isRTL}
              />
              <StatBox
                label={t.ongoingProjects}
                value={reportData.keyAchievements.ongoingProjects}
                icon={<Target className="w-4 h-4 text-blue-600" />}
                isRTL={isRTL}
              />
              <StatBox
                label={t.totalBeneficiaries}
                value={formatNumber(reportData.keyAchievements.totalBeneficiaries)}
                icon={<Users className="w-4 h-4 text-purple-600" />}
                isRTL={isRTL}
              />
            </div>

            <div>
              <h4 className={`text-sm font-semibold text-gray-700 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.highlights}
              </h4>
              <div className="space-y-2">
                {reportData.keyAchievements.highlights.map((highlight, index) => (
                  <div key={index} className={`flex items-start gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
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
          title={t.sectionC}
          editable={false}
          isRTL={isRTL}
          t={t}
          badge="auto"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className={`text-sm font-semibold text-gray-700 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.projectsByStatus}
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
                <h4 className={`text-sm font-semibold text-gray-700 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.budgetVsSpent}
                </h4>
                {hasRealData && reportData.programPerformance.budgetVsSpent.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={reportData.programPerformance.budgetVsSpent}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="budget" fill="#3b82f6" name={t.budget} />
                      <Bar dataKey="spent" fill="#10b981" name={t.spent} />
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
              <h4 className={`text-sm font-semibold text-gray-700 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.monthlyTrend}
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
                    <Line yAxisId="left" type="monotone" dataKey="projects" stroke="#3b82f6" name={t.projects} />
                    <Line yAxisId="right" type="monotone" dataKey="budget" stroke="#10b981" name={t.budget} />
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
                value={formatCurrency(reportData.grantPerformance.totalGrantValue, 'USD')}
                icon={<DollarSign className="w-4 h-4 text-purple-600" />}
                isRTL={isRTL}
              />
              <StatBox
                label={t.budgetUtilization}
                value={`${reportData.grantPerformance.utilizationRate}%`}
                icon={<TrendingUp className="w-4 h-4 text-orange-600" />}
                isRTL={isRTL}
              />
            </div>
          </div>
        </Section>

        <Section
          id="section-d"
          title={t.sectionD}
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
              placeholder={t.enterChallenges}
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          ) : (
            <div className="text-gray-700 whitespace-pre-wrap">
              {narrativeData.challenges || (
                <div className="text-gray-400 italic">{t.noDataEntered}</div>
              )}
            </div>
          )}
        </Section>

        <Section
          id="section-e"
          title={t.sectionE}
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
                <div className={`flex items-center gap-2 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Lock className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500">{t.readOnly}</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <StatBox
                    label={t.proposalsSubmitted}
                    value={reportData.pipelineOutlook.proposalsSubmitted}
                    icon={<FileText className="w-4 h-4 text-blue-600" />}
                    isRTL={isRTL}
                  />
                  <StatBox
                    label={t.pipelineValue}
                    value={formatCurrency(reportData.pipelineOutlook.pipelineValue, 'USD')}
                    icon={<DollarSign className="w-4 h-4 text-green-600" />}
                    isRTL={isRTL}
                  />
                  <StatBox
                    label={t.approvalRate}
                    value={`${reportData.pipelineOutlook.approvalRate}%`}
                    icon={<TrendingUp className="w-4 h-4 text-purple-600" />}
                    isRTL={isRTL}
                  />
                </div>
              </div>
            )}

            <div>
              <h4 className={`text-sm font-semibold text-gray-700 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.strategicOutlook} ({t.editable})
              </h4>
              {editingSection === 'strategicOutlook' ? (
                <textarea
                  value={narrativeData.strategicOutlook}
                  onChange={(e) => setNarrativeData({ ...narrativeData, strategicOutlook: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder={t.enterOutlook}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              ) : (
                <div className="text-gray-700 whitespace-pre-wrap">
                  {narrativeData.strategicOutlook || (
                    <div className="text-gray-400 italic">{t.noDataEntered}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Section>

        <Section
          id="section-f"
          title={t.sectionF}
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
              placeholder={t.enterNotes}
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          ) : (
            <div className="text-gray-700 whitespace-pre-wrap">
              {narrativeData.managementNotes || (
                <div className="text-gray-400 italic">{t.noDataEntered}</div>
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
      <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {badge && (
            <span
              className={`px-2 py-0.5 text-xs rounded-full ${
                badge === 'auto'
                  ? 'bg-blue-100 text-blue-700'
                  : badge === 'editable'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-purple-100 text-purple-700'
              }`}
            >
              {badge === 'auto' ? t.readOnly : badge === 'editable' ? t.editable : 'Mixed'}
            </span>
          )}
        </div>
        {editable && (
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {isEditing ? (
              <>
                <button
                  onClick={onSave}
                  className={`px-3 py-1.5 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <Save className="w-3.5 h-3.5" />
                  {t.save}
                </button>
                <button
                  onClick={onCancel}
                  className={`px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <X className="w-3.5 h-3.5" />
                  {t.cancel}
                </button>
              </>
            ) : (
              <button
                onClick={onEdit}
                disabled={!canEdit}
                className={`px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''} ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={!canEdit ? t.noEditPermission : ''}
              >
                {!canEdit && <Lock className="w-3.5 h-3.5" />}
                <Edit2 className="w-3.5 h-3.5" />
                {t.edit}
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
        <div className="absolute top-2 right-2">
          <Lock className="w-3 h-3 text-gray-400" />
        </div>
      )}
      <div className={`flex items-start justify-between mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
          <div className="text-xs font-medium text-gray-600 mb-1">{title}</div>
          <div className="text-2xl font-bold text-gray-900" dir="ltr">{value}</div>
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
      <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        {icon}
        <div className={`text-xs text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{label}</div>
      </div>
      <div className="text-xl font-bold text-gray-900" dir="ltr">{value}</div>
    </div>
  );
}
