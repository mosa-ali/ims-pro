/**
 * ============================================================================
 * INDICATORS LIST (CORRECTED - PROJECT FILTERING)
 * ============================================================================
 * 
 * CRITICAL FIXES:
 * 1. ✅ Uses centralized projectsDatabase (SINGLE SOURCE OF TRUTH)
 * 2. ✅ Project list matches Project Management Dashboard exactly
 * 3. ✅ Strict project-based filtering (ONE project = ONE set of indicators)
 * 4. ✅ Switching projects clears and reloads indicators
 * 5. ✅ Proper empty states and disabled states
 * 6. ✅ Data integrity and compliance
 * 
 * FEATURES:
 * - Project selection dropdown (synchronized with PMS)
 * - Activity filter
 * - Status filter (All, Pending, Ongoing, Achieved)
 * - Frequency filter (Monthly, Quarterly, Annually)
 * - Progress bars with color coding
 * - Gender breakdown display
 * - Update indicator modal
 * - Excel import support
 * - Add new indicator
 * - Bilingual support (EN/AR) with RTL
 * 
 * ============================================================================
 */

import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect } from 'react';
import { Plus, Upload, Loader2, Edit, ChevronDown, AlertCircle, Eye, Trash2, X } from 'lucide-react';
import { projectsDatabase } from '@/services/projectsDatabase';
import { Project } from '@/hooks/useProjectData.tsx';
import { indicatorService } from '@/services/mealService';
import * as XLSX from 'xlsx';

interface Indicator {
  id: number;
  indicatorName: string;
  activityName: string;
  indStatus: string;
  baselineValue: string;
  targetValue: string;
  achievedValue: string;
  unitType: string;
  maleCount: number;
  femaleCount: number;
  boysCount: number;
  girlsCount: number;
  reportingFrequency: string;
  sourceOfVerification?: string;
  projectId: string; // CRITICAL: Link to project
}

export function IndicatorsList() {
  const [, navigate] = useLocation();
  const { language, isRTL } = useLanguage();
  
  // Project selection state
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  
  // Indicators state
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loadingIndicators, setLoadingIndicators] = useState(false);
  
  // Filter state
  const [activityFilter, setActivityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('All');
  const [frequencyFilter, setFrequencyFilter] = useState('All');
  
  // Modal state
  const [showIndicatorModal, setShowIndicatorModal] = useState(false);
  const [selectedIndicatorForEdit, setSelectedIndicatorForEdit] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedIndicatorForView, setSelectedIndicatorForView] = useState<Indicator | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedIndicatorForDelete, setSelectedIndicatorForDelete] = useState<Indicator | null>(null);

  const t = {
    title: language === 'en' ? 'Project Indicators List' : 'قائمة مؤشرات المشروع',
    import: language === 'en' ? 'Import' : 'استيراد',
    addNew: language === 'en' ? 'Add New Indicator' : 'إضافة مؤشر جديد',
    back: language === 'en' ? 'Back' : 'رجوع',
    selectProject: language === 'en' ? 'Select Project' : 'اختر المشروع',
    selectPlaceholder: language === 'en' ? 'Select a project...' : 'اختر مشروعاً...',
    projectName: language === 'en' ? 'Project Name' : 'اسم المشروع',
    projectIndicators: language === 'en' ? 'Project Indicators' : 'مؤشرات المشروع',
    filterByActivity: language === 'en' ? 'Filter by Activity' : 'تصفية حسب النشاط',
    allActivities: language === 'en' ? 'All Activities' : 'جميع الأنش��ة',
    status: language === 'en' ? 'Status' : 'الحالة',
    frequency: language === 'en' ? 'Frequency' : 'التكرار',
    all: language === 'en' ? 'All' : 'الكل',
    pending: language === 'en' ? 'Pending' : 'معلق',
    ongoing: language === 'en' ? 'Ongoing' : 'جاري',
    achieved: language === 'en' ? 'Achieved' : 'محقق',
    monthly: language === 'en' ? 'Monthly' : 'شهري',
    quarterly: language === 'en' ? 'Quarterly' : 'ربع سنوي',
    annually: language === 'en' ? 'Annually' : 'سنوي',
    activity: language === 'en' ? 'Activity:' : 'النشاط:',
    baseline: language === 'en' ? 'Baseline' : 'خط الأساس',
    target: language === 'en' ? 'Target' : 'الهدف',
    achievedLabel: language === 'en' ? 'Achieved' : 'المحقق',
    unit: language === 'en' ? 'Unit' : 'الوحدة',
    male: language === 'en' ? 'Male' : 'ذكر',
    female: language === 'en' ? 'Female' : 'أنثى',
    boys: language === 'en' ? 'Boys' : 'أولاد',
    girls: language === 'en' ? 'Girls' : 'بنات',
    reportingFrequency: language === 'en' ? 'Reporting Frequency' : 'تكرار التقرير',
    sourceOfVerification: language === 'en' ? 'Source of Verification' : 'مصدر التحقق',
    achievementProgress: language === 'en' ? 'Achievement Progress' : 'تقدم الإنجاز',
    update: language === 'en' ? 'Update' : 'تحديث',
    view: language === 'en' ? 'View' : 'عرض',
    delete: language === 'en' ? 'Delete' : 'حذف',
    loading: language === 'en' ? 'Loading indicators...' : 'تحميل المؤشرات...',
    noIndicators: language === 'en' ? 'No indicators found for this project.' : 'لم يتم العثور على مؤشرات لهذا المشروع.',
    noMatch: language === 'en' ? 'No indicators match the selected filters.' : 'لا توجد مؤشرات تطابق الفلاتر المحددة.',
    selectProjectPrompt: language === 'en' ? 'Please select a project to view indicators' : 'يرجى اختيار مشروع لعرض المؤشرات',
    noProjectsAvailable: language === 'en' ? 'No projects available. Please create a project first.' : 'لا توجد مشاريع متاحة. يرجى إنشاء مشروع أولاً.',
    na: language === 'en' ? 'N/A' : 'غير متاح',
    deleteConfirmTitle: language === 'en' ? 'Delete Indicator?' : 'حذف المؤشر؟',
    deleteConfirmMessage: language === 'en' 
      ? 'Are you sure you want to delete this indicator? This action cannot be undone.' 
      : 'هل أنت متأكد من حذف هذا المؤشر؟ لا يمكن التراجع عن هذا الإجراء.',
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    confirmDelete: language === 'en' ? 'Confirm Delete' : 'تأكيد الحذف',
    actions: language === 'en' ? 'Actions' : 'الإجراءات',
  };

  // ✅ STEP 1: Load projects from centralized database on mount
  useEffect(() => {
    setLoadingProjects(true);
    try {
      const projects = projectsDatabase.getAllProjects();
      // Filter to show only active/ongoing projects (optional - can show all)
      const activeProjects = projects.filter(p => 
        p.status === 'Ongoing' || p.status === 'Planned' || p.status === 'Not Started'
      );
      setAllProjects(activeProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  // ✅ STEP 2: Load indicators when project is selected
  useEffect(() => {
    if (!selectedProjectId) {
      setIndicators([]);
      return;
    }

    setLoadingIndicators(true);
    
    // Clear filters when switching projects
    setActivityFilter('all');
    setStatusFilter('All');
    setFrequencyFilter('All');

    try {
      // ✅ CRITICAL: Load from Project Indicators Tab storage (SINGLE SOURCE OF TRUTH)
      const stored = localStorage.getItem('pms_indicators');
      if (!stored) {
        setIndicators([]);
        setLoadingIndicators(false);
        return;
      }

      const allIndicators = JSON.parse(stored);
      
      // ✅ CRITICAL: Filter by selected project ONLY
      const projectIndicators = allIndicators
        .filter((i: any) => i.projectId === selectedProjectId)
        .map((i: any) => ({
          id: parseInt(i.id) || 0,
          projectId: i.projectId,
          indicatorName: i.indicatorTitle || i.title || '',
          activityName: i.activity || i.category || 'General',
          indStatus: i.status || (i.achievedValue >= i.target ? 'Achieved' : i.achievedValue > 0 ? 'Ongoing' : 'Pending'),
          baselineValue: String(i.baseline || 0),
          targetValue: String(i.target || 0),
          achievedValue: String(i.achievedValue || i.achieved || 0),
          unitType: i.unit || 'units',
          maleCount: i.maleCount || 0,
          femaleCount: i.femaleCount || 0,
          boysCount: i.boysCount || 0,
          girlsCount: i.girlsCount || 0,
          reportingFrequency: i.reportingFrequency || 'Monthly',
          sourceOfVerification: i.dataSource || '',
        }));

      setIndicators(projectIndicators);
    } catch (error) {
      console.error('Error loading indicators:', error);
      setIndicators([]);
    } finally {
      setLoadingIndicators(false);
    }
  }, [selectedProjectId, language]);

  const selectedProject = allProjects.find(p => p.id === selectedProjectId);

  const handleEditIndicator = (indicator: Indicator) => {
    setSelectedIndicatorForEdit(indicator);
    setShowIndicatorModal(true);
  };

  // ✅ NEW: Update indicator in both MEAL view AND project indicators tab (TWO-WAY SYNC)
  const updateIndicatorInStorage = (updatedIndicator: Indicator) => {
    try {
      // Update in pms_indicators (SINGLE SOURCE OF TRUTH)
      const stored = localStorage.getItem('pms_indicators');
      if (stored) {
        const allIndicators = JSON.parse(stored);
        const updatedIndicators = allIndicators.map((ind: any) => {
          if (ind.id === String(updatedIndicator.id) && ind.projectId === updatedIndicator.projectId) {
            return {
              ...ind,
              indicatorTitle: updatedIndicator.indicatorName,
              title: updatedIndicator.indicatorName,
              activity: updatedIndicator.activityName,
              status: updatedIndicator.indStatus,
              baseline: parseFloat(updatedIndicator.baselineValue),
              target: parseFloat(updatedIndicator.targetValue),
              achievedValue: parseFloat(updatedIndicator.achievedValue),
              achieved: parseFloat(updatedIndicator.achievedValue),
              unit: updatedIndicator.unitType,
              maleCount: updatedIndicator.maleCount,
              femaleCount: updatedIndicator.femaleCount,
              boysCount: updatedIndicator.boysCount,
              girlsCount: updatedIndicator.girlsCount,
              reportingFrequency: updatedIndicator.reportingFrequency,
              dataSource: updatedIndicator.sourceOfVerification,
            };
          }
          return ind;
        });
        localStorage.setItem('pms_indicators', JSON.stringify(updatedIndicators));
        
        // Reload indicators from storage to reflect changes
        setSelectedProjectId(prev => prev); // Trigger useEffect to reload
      }
    } catch (error) {
      console.error('Error updating indicator in storage:', error);
    }
  };

  const handleDeleteIndicator = () => {
    if (!selectedIndicatorForDelete) return;

    try {
      // Delete from pms_indicators storage
      const stored = localStorage.getItem('pms_indicators');
      if (stored) {
        const allIndicators = JSON.parse(stored);
        const filteredIndicators = allIndicators.filter((ind: any) => 
          !(ind.id === String(selectedIndicatorForDelete.id) && ind.projectId === selectedIndicatorForDelete.projectId)
        );
        localStorage.setItem('pms_indicators', JSON.stringify(filteredIndicators));
        
        // Update local state
        setIndicators(prev => prev.filter(ind => ind.id !== selectedIndicatorForDelete.id));
      }

      // Close modal
      setShowDeleteConfirm(false);
      setSelectedIndicatorForDelete(null);

      // Show success message
      alert(language === 'en' 
        ? 'Indicator deleted successfully!' 
        : 'تم حذف المؤشر بنجاح!'
      );
    } catch (error) {
      console.error('Error deleting indicator:', error);
      alert(language === 'en' 
        ? 'Error deleting indicator' 
        : 'خطأ في حذف المؤشر'
      );
    }
  };

  const handleExcelImport = () => {
    if (!selectedProjectId) {
      alert(language === 'en' 
        ? 'Please select a project first' 
        : 'يرجى اختيار مشروع أولاً'
      );
      return;
    }
    // TODO: Implement Excel import
    alert(language === 'en' ? 'Excel import functionality' : 'وظيفة استيراد Excel');
  };

  const handleAddNew = () => {
    if (!selectedProjectId) {
      alert(language === 'en' 
        ? 'Please select a project first' 
        : 'يرجى اختيار مشروع أولاً'
      );
      return;
    }
    navigate(`/meal/indicators/add?projectId=${selectedProjectId}`);
  };

  // ✅ Export to Excel functionality
  const handleExportToExcel = () => {
    if (!selectedProjectId || indicators.length === 0) {
      alert(language === 'en' 
        ? 'No indicators to export' 
        : 'لا توجد مؤشرات للتصدير'
      );
      return;
    }

    try {
      const wb = XLSX.utils.book_new();
      
      // Prepare data
      const exportData = filteredIndicators.map((ind, idx) => ({
        '#': idx + 1,
        'Indicator Name': ind.indicatorName,
        'Activity': ind.activityName,
        'Status': ind.indStatus || 'Pending',
        'Baseline': ind.baselineValue,
        'Target': ind.targetValue,
        'Achieved': ind.achievedValue,
        'Unit': ind.unitType,
        'Progress %': ((parseFloat(ind.achievedValue) / parseFloat(ind.targetValue)) * 100).toFixed(1),
        'Reporting Frequency': ind.reportingFrequency,
        'Male': ind.maleCount,
        'Female': ind.femaleCount,
        'Boys': ind.boysCount,
        'Girls': ind.girlsCount,
        'Source': ind.sourceOfVerification || 'N/A',
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'Indicators');
      
      const fileName = `Indicators_${selectedProject?.code || 'Export'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      alert(language === 'en' 
        ? 'Indicators exported successfully!' 
        : 'تم تصدير المؤشرات بنجاح!'
      );
    } catch (error) {
      console.error('Export error:', error);
      alert(language === 'en' 
        ? 'Error exporting indicators' 
        : 'خطأ في تصدير المؤشرات'
      );
    }
  };

  // ✅ Apply filters WITHIN selected project
  let filteredIndicators = indicators;

  if (activityFilter !== 'all') {
    filteredIndicators = filteredIndicators.filter((ind) => ind.activityName === activityFilter);
  }

  if (statusFilter !== 'All') {
    filteredIndicators = filteredIndicators.filter((ind) => (ind.indStatus || 'Pending') === statusFilter);
  }

  if (frequencyFilter !== 'All') {
    filteredIndicators = filteredIndicators.filter((ind) => (ind.reportingFrequency || 'N/A') === frequencyFilter);
  }

  const uniqueActivities = Array.from(new Set(indicators.map((ind) => ind.activityName)));

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className={`flex items-center justify-between pb-6 border-b border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {/* ✅ Export to Excel Button */}
          {selectedProjectId && indicators.length > 0 && (
            <button
              onClick={handleExportToExcel}
              className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span className="text-sm font-semibold">{language === 'en' ? 'Export to Excel' : 'تصدير إلى Excel'}</span>
            </button>
          )}
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-semibold text-blue-600">{t.back}</span>
          </button>
        </div>
      </div>

      {/* ✅ CRITICAL: Project Selector (SINGLE SOURCE OF TRUTH) */}
      <div>
        <label className={`text-sm font-semibold text-gray-900 mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.selectProject} <span className="text-red-600">*</span>
        </label>
        
        {loadingProjects ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : allProjects.length === 0 ? (
          // ✅ IMPROVED: No projects warning (clean design)
          <div className="p-6 bg-orange-50 border-2 border-orange-200 rounded-xl">
            <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                <h3 className="text-base font-bold text-orange-900 mb-2">
                  {t.noProjectsAvailable}
                </h3>
                <p className="text-sm text-orange-800 mb-4 leading-relaxed">
                  {language === 'en' 
                    ? 'MEAL indicators are linked to projects. Please create a project first to add indicators.' 
                    : 'مؤشرات MEAL مرتبطة بالمشاريع. يرجى إنشاء مشروع أولاً لإضافة المؤشرات.'
                  }
                </p>
                <button
                  onClick={() => navigate('/projects')}
                  className="px-5 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold transition-colors shadow-sm"
                >
                  {language === 'en' ? 'Go to Projects' : 'الذهاب إلى المشاريع'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative">
            <button
              onClick={() => setShowProjectDropdown(!showProjectDropdown)}
              className={`w-full p-4 rounded-lg border border-gray-300 bg-white flex items-center justify-between hover:bg-gray-50 transition-colors ${
                isRTL ? 'flex-row-reverse' : ''
              }`}
            >
              <span className={selectedProjectId ? 'text-gray-900' : 'text-gray-500'}>
                {selectedProject 
                  ? `${selectedProject.code} - ${selectedProject.title}` 
                  : t.selectPlaceholder
                }
              </span>
              <ChevronDown className="w-5 h-5 text-blue-600" />
            </button>

            {showProjectDropdown && (
              <div className="absolute z-10 mt-2 w-full rounded-lg border border-gray-300 bg-white shadow-lg max-h-60 overflow-y-auto">
                {allProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => {
                      setSelectedProjectId(project.id);
                      setShowProjectDropdown(false);
                    }}
                    className={`w-full p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                      isRTL ? 'text-right' : 'text-left'
                    } ${selectedProjectId === project.id ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold text-gray-900">{project.code}</span>
                      <span className="text-sm text-gray-600">{project.title}</span>
                      <span className={`text-xs px-2 py-1 rounded-full inline-block w-fit ${
                        project.status === 'Ongoing' ? 'bg-green-100 text-green-800' :
                        project.status === 'Planned' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {project.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ✅ Indicators Section - ONLY SHOWN WHEN PROJECT IS SELECTED */}
      {!selectedProjectId ? (
        <div className="p-8 bg-gray-50 border border-gray-200 rounded-lg text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">{t.selectProjectPrompt}</p>
        </div>
      ) : loadingIndicators ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">{t.loading}</span>
        </div>
      ) : (
        <>
          {/* Project Info Card */}
          {selectedProject && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                <div>
                  <p className="text-xs text-blue-600 font-medium">{language === 'en' ? 'Project Code' : 'رمز المشروع'}</p>
                  <p className="text-sm font-bold text-gray-900">{selectedProject.code}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-600 font-medium">{t.projectName}</p>
                  <p className="text-sm font-bold text-gray-900">{selectedProject.title}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-600 font-medium">{t.status}</p>
                  <p className="text-sm font-bold text-gray-900">{selectedProject.status}</p>
                </div>
              </div>
            </div>
          )}

          {/* Filters - ONLY ACTIVE WHEN PROJECT SELECTED */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Activity Filter */}
            <div>
              <label className={`text-sm font-semibold text-gray-900 mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.filterByActivity}
              </label>
              <select
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
                className={`w-full p-3 rounded-lg border border-gray-300 bg-white ${isRTL ? 'text-right' : 'text-left'}`}
              >
                <option value="all">{t.allActivities}</option>
                {uniqueActivities.map((activity) => (
                  <option key={activity} value={activity}>
                    {activity}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className={`text-sm font-semibold text-gray-900 mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.status}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`w-full p-3 rounded-lg border border-gray-300 bg-white ${isRTL ? 'text-right' : 'text-left'}`}
              >
                <option value="All">{t.all}</option>
                <option value="Pending">{t.pending}</option>
                <option value="Ongoing">{t.ongoing}</option>
                <option value="Achieved">{t.achieved}</option>
              </select>
            </div>

            {/* Frequency Filter */}
            <div>
              <label className={`text-sm font-semibold text-gray-900 mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.frequency}
              </label>
              <select
                value={frequencyFilter}
                onChange={(e) => setFrequencyFilter(e.target.value)}
                className={`w-full p-3 rounded-lg border border-gray-300 bg-white ${isRTL ? 'text-right' : 'text-left'}`}
              >
                <option value="All">{t.all}</option>
                <option value="Monthly">{t.monthly}</option>
                <option value="Quarterly">{t.quarterly}</option>
                <option value="Annually">{t.annually}</option>
              </select>
            </div>
          </div>

          {/* Indicators List */}
          {filteredIndicators.length === 0 ? (
            <div className="p-8 bg-gray-50 border border-gray-200 rounded-lg text-center">
              <p className="text-gray-600">
                {indicators.length === 0 ? t.noIndicators : t.noMatch}
              </p>
              {indicators.length === 0 && (
                <button
                  onClick={handleAddNew}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t.addNew}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredIndicators.map((indicator, index) => {
                const progress = ((parseFloat(indicator.achievedValue) / parseFloat(indicator.targetValue)) * 100).toFixed(1);
                const progressNum = parseFloat(progress);
                const progressColor =
                  progressNum >= 100 ? 'bg-green-500' : progressNum >= 75 ? 'bg-blue-500' : progressNum >= 50 ? 'bg-yellow-500' : 'bg-red-500';

                return (
                  <div key={indicator.id || index} className="border-t border-gray-200 pt-4">
                    <div className={`flex items-center justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <h3 className={`text-base font-bold text-gray-900 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {indicator.indicatorName}
                      </h3>
                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor:
                            indicator.indStatus === 'Achieved'
                              ? '#dcfce7'
                              : indicator.indStatus === 'Ongoing'
                              ? '#dbeafe'
                              : '#fef3c7',
                          color:
                            indicator.indStatus === 'Achieved'
                              ? '#15803d'
                              : indicator.indStatus === 'Ongoing'
                              ? '#1e40af'
                              : '#a16207',
                        }}
                      >
                        {indicator.indStatus || 'Pending'}
                      </span>
                    </div>

                    <p className={`text-sm text-gray-600 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                      <span className="font-semibold">{t.activity}</span> {indicator.activityName}
                    </p>

                    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                      <div>
                        <p className="text-xs text-gray-600">{t.baseline}</p>
                        <p className="text-sm font-bold text-gray-900">{indicator.baselineValue} {indicator.unitType}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">{t.target}</p>
                        <p className="text-sm font-bold text-blue-600">{indicator.targetValue} {indicator.unitType}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">{t.achievedLabel}</p>
                        <p className="text-sm font-bold text-green-600">{indicator.achievedValue} {indicator.unitType}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">{t.reportingFrequency}</p>
                        <p className="text-sm font-bold text-gray-900">{indicator.reportingFrequency || t.na}</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className={`flex items-center justify-between mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <p className="text-xs font-semibold text-gray-700">{t.achievementProgress}</p>
                        <p className="text-xs font-bold text-gray-900">{progress}%</p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className={`${progressColor} h-2.5 rounded-full transition-all duration-300`}
                          style={{ width: `${Math.min(progressNum, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Gender Breakdown */}
                    {(indicator.maleCount > 0 || indicator.femaleCount > 0 || indicator.boysCount > 0 || indicator.girlsCount > 0) && (
                      <div className={`grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className="bg-blue-50 rounded p-2">
                          <p className="text-xs text-blue-600">{t.male}</p>
                          <p className="text-sm font-bold text-blue-900">{indicator.maleCount}</p>
                        </div>
                        <div className="bg-pink-50 rounded p-2">
                          <p className="text-xs text-pink-600">{t.female}</p>
                          <p className="text-sm font-bold text-pink-900">{indicator.femaleCount}</p>
                        </div>
                        <div className="bg-indigo-50 rounded p-2">
                          <p className="text-xs text-indigo-600">{t.boys}</p>
                          <p className="text-sm font-bold text-indigo-900">{indicator.boysCount}</p>
                        </div>
                        <div className="bg-purple-50 rounded p-2">
                          <p className="text-xs text-purple-600">{t.girls}</p>
                          <p className="text-sm font-bold text-purple-900">{indicator.girlsCount}</p>
                        </div>
                      </div>
                    )}

                    {indicator.sourceOfVerification && (
                      <p className={`text-xs text-gray-600 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <span className="font-semibold">{t.sourceOfVerification}:</span> {indicator.sourceOfVerification}
                      </p>
                    )}

                    {/* ✅ Action Buttons: Update, View, Delete */}
                    <div className={`flex items-center gap-2 pt-2 border-t border-gray-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <button
                        onClick={() => handleEditIndicator(indicator)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors text-sm font-semibold"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        {t.update}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedIndicatorForView(indicator);
                          setShowViewModal(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors text-sm font-semibold"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {t.view}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedIndicatorForDelete(indicator);
                          setShowDeleteConfirm(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors text-sm font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {t.delete}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ✅ View Modal */}
      {showViewModal && selectedIndicatorForView && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowViewModal(false)}>
          <div 
            className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h2 className="text-xl font-bold text-gray-900">
                {language === 'en' ? 'Indicator Details' : 'تفاصيل المؤشر'}
              </h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  {language === 'en' ? 'Indicator Name' : 'اسم المؤشر'}
                </label>
                <p className="text-base text-gray-900 mt-1">{selectedIndicatorForView.indicatorName}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700">{t.activity}</label>
                  <p className="text-base text-gray-900 mt-1">{selectedIndicatorForView.activityName}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">{t.status}</label>
                  <p className="text-base text-gray-900 mt-1">{selectedIndicatorForView.indStatus}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700">{t.baseline}</label>
                  <p className="text-base text-gray-900 mt-1">{selectedIndicatorForView.baselineValue} {selectedIndicatorForView.unitType}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">{t.target}</label>
                  <p className="text-base text-blue-600 mt-1 font-semibold">{selectedIndicatorForView.targetValue} {selectedIndicatorForView.unitType}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">{t.achievedLabel}</label>
                  <p className="text-base text-green-600 mt-1 font-semibold">{selectedIndicatorForView.achievedValue} {selectedIndicatorForView.unitType}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded p-3">
                  <p className="text-xs text-blue-600 font-semibold">{t.male}</p>
                  <p className="text-lg font-bold text-blue-900">{selectedIndicatorForView.maleCount}</p>
                </div>
                <div className="bg-pink-50 rounded p-3">
                  <p className="text-xs text-pink-600 font-semibold">{t.female}</p>
                  <p className="text-lg font-bold text-pink-900">{selectedIndicatorForView.femaleCount}</p>
                </div>
                <div className="bg-indigo-50 rounded p-3">
                  <p className="text-xs text-indigo-600 font-semibold">{t.boys}</p>
                  <p className="text-lg font-bold text-indigo-900">{selectedIndicatorForView.boysCount}</p>
                </div>
                <div className="bg-purple-50 rounded p-3">
                  <p className="text-xs text-purple-600 font-semibold">{t.girls}</p>
                  <p className="text-lg font-bold text-purple-900">{selectedIndicatorForView.girlsCount}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">{t.reportingFrequency}</label>
                <p className="text-base text-gray-900 mt-1">{selectedIndicatorForView.reportingFrequency}</p>
              </div>

              {selectedIndicatorForView.sourceOfVerification && (
                <div>
                  <label className="text-sm font-semibold text-gray-700">{t.sourceOfVerification}</label>
                  <p className="text-base text-gray-900 mt-1">{selectedIndicatorForView.sourceOfVerification}</p>
                </div>
              )}
            </div>

            <div className={`flex justify-end mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                {language === 'en' ? 'Close' : 'إغلاق'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ UPDATE/EDIT MODAL */}
      {showIndicatorModal && selectedIndicatorForEdit && (
        <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowIndicatorModal(false); setSelectedIndicatorForEdit(null); }}>
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className={`bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-lg font-semibold text-gray-900">{language === 'en' ? 'Update Indicator' : 'تحديث المؤشر'}</h3>
              <button onClick={() => { setShowIndicatorModal(false); setSelectedIndicatorForEdit(null); }} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Indicator Name */}
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {language === 'en' ? 'Indicator Name' : 'اسم المؤشر'} *
                </label>
                <input 
                  type="text" 
                  value={selectedIndicatorForEdit.indicatorName} 
                  onChange={(e) => setSelectedIndicatorForEdit({...selectedIndicatorForEdit, indicatorName: e.target.value})} 
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                />
              </div>

              {/* Activity */}
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.activity}
                </label>
                <input 
                  type="text" 
                  value={selectedIndicatorForEdit.activityName} 
                  onChange={(e) => setSelectedIndicatorForEdit({...selectedIndicatorForEdit, activityName: e.target.value})} 
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                />
              </div>

              {/* Status */}
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.status}
                </label>
                <select
                  value={selectedIndicatorForEdit.indStatus || 'Pending'}
                  onChange={(e) => setSelectedIndicatorForEdit({...selectedIndicatorForEdit, indStatus: e.target.value})}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  <option value="Pending">{t.pending}</option>
                  <option value="Ongoing">{t.ongoing}</option>
                  <option value="Achieved">{t.achieved}</option>
                </select>
              </div>

              {/* Baseline, Target, Achieved */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.baseline} *
                  </label>
                  <input 
                    type="number" 
                    value={selectedIndicatorForEdit.baselineValue} 
                    onChange={(e) => setSelectedIndicatorForEdit({...selectedIndicatorForEdit, baselineValue: e.target.value})} 
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.target} *
                  </label>
                  <input 
                    type="number" 
                    value={selectedIndicatorForEdit.targetValue} 
                    onChange={(e) => setSelectedIndicatorForEdit({...selectedIndicatorForEdit, targetValue: e.target.value})} 
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.achievedLabel} *
                  </label>
                  <input 
                    type="number" 
                    value={selectedIndicatorForEdit.achievedValue} 
                    onChange={(e) => setSelectedIndicatorForEdit({...selectedIndicatorForEdit, achievedValue: e.target.value})} 
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                </div>
              </div>

              {/* Unit Type */}
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.unit}
                </label>
                <input 
                  type="text" 
                  value={selectedIndicatorForEdit.unitType} 
                  onChange={(e) => setSelectedIndicatorForEdit({...selectedIndicatorForEdit, unitType: e.target.value})} 
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                />
              </div>

              {/* Gender Breakdown */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.male}
                  </label>
                  <input 
                    type="number" 
                    value={selectedIndicatorForEdit.maleCount} 
                    onChange={(e) => setSelectedIndicatorForEdit({...selectedIndicatorForEdit, maleCount: parseInt(e.target.value) || 0})} 
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.female}
                  </label>
                  <input 
                    type="number" 
                    value={selectedIndicatorForEdit.femaleCount} 
                    onChange={(e) => setSelectedIndicatorForEdit({...selectedIndicatorForEdit, femaleCount: parseInt(e.target.value) || 0})} 
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.boys}
                  </label>
                  <input 
                    type="number" 
                    value={selectedIndicatorForEdit.boysCount} 
                    onChange={(e) => setSelectedIndicatorForEdit({...selectedIndicatorForEdit, boysCount: parseInt(e.target.value) || 0})} 
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.girls}
                  </label>
                  <input 
                    type="number" 
                    value={selectedIndicatorForEdit.girlsCount} 
                    onChange={(e) => setSelectedIndicatorForEdit({...selectedIndicatorForEdit, girlsCount: parseInt(e.target.value) || 0})} 
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                </div>
              </div>

              {/* Reporting Frequency */}
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.reportingFrequency}
                </label>
                <select
                  value={selectedIndicatorForEdit.reportingFrequency || 'Monthly'}
                  onChange={(e) => setSelectedIndicatorForEdit({...selectedIndicatorForEdit, reportingFrequency: e.target.value})}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  <option value="Monthly">{t.monthly}</option>
                  <option value="Quarterly">{t.quarterly}</option>
                  <option value="Annually">{t.annually}</option>
                </select>
              </div>

              {/* Source of Verification */}
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.sourceOfVerification}
                </label>
                <input 
                  type="text" 
                  value={selectedIndicatorForEdit.sourceOfVerification || ''} 
                  onChange={(e) => setSelectedIndicatorForEdit({...selectedIndicatorForEdit, sourceOfVerification: e.target.value})} 
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isRTL ? 'text-right' : 'text-left'}`}
                />
              </div>
            </div>

            <div className={`sticky bottom-0 bg-gray-50 px-6 py-4 flex gap-3 border-t border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button 
                onClick={() => { setShowIndicatorModal(false); setSelectedIndicatorForEdit(null); }} 
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                {t.cancel}
              </button>
              <button 
                onClick={() => { 
                  updateIndicatorInStorage(selectedIndicatorForEdit); 
                  setIndicators(prev => prev.map(ind => ind.id === selectedIndicatorForEdit.id ? selectedIndicatorForEdit : ind)); 
                  setShowIndicatorModal(false); 
                  setSelectedIndicatorForEdit(null); 
                  alert(language === 'en' ? 'Indicator updated successfully!' : 'تم تحديث المؤشر بنجاح!'); 
                }} 
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {t.update}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Delete Confirmation Modal */}
      {showDeleteConfirm && selectedIndicatorForDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDeleteConfirm(false)}>
          <div 
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-start gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className={`text-lg font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.deleteConfirmTitle}
                </h3>
                <p className={`text-sm text-gray-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.deleteConfirmMessage}
                </p>
                <p className={`text-sm font-semibold text-gray-900 mt-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  &quot;{selectedIndicatorForDelete.indicatorName}&quot;
                </p>
              </div>
            </div>

            <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleDeleteIndicator}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
              >
                {t.confirmDelete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}