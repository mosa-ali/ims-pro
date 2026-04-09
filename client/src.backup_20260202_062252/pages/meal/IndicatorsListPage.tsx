/**
 * ============================================================================
 * INDICATORS LIST PAGE - Complete with Backend Integration
 * ============================================================================
 * 
 * Full CRUD operations for indicators with real data persistence
 * 
 * FEATURES:
 * - List all indicators with filters
 * - Create new indicator
 * - Edit existing indicators
 * - Delete indicators
 * - Real-time data from backend service
 * - Bilingual support (EN/AR) with RTL
 * - Progress tracking
 * - Export functionality
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { Plus, Edit, Trash2, TrendingUp, Target, BarChart3, AlertCircle } from 'lucide-react';
import { indicatorService, type Indicator, type IndicatorType } from '@/services/mealService';

export function IndicatorsListPage() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const { language, isRTL } = useLanguage();
  const { user } = useAuth();

  const projectId = searchParams.get('projectId') || '';
  const projectName = searchParams.get('projectName') || 'Project';

  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [filteredIndicators, setFilteredIndicators] = useState<Indicator[]>([]);
  const [typeFilter, setTypeFilter] = useState<IndicatorType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const t = {
    title: language === 'en' ? 'Indicators Management' : 'إدارة المؤشرات',
    project: language === 'en' ? 'Project:' : 'المشروع:',
    addIndicator: language === 'en' ? 'Add Indicator' : 'إضافة مؤشر',
    search: language === 'en' ? 'Search indicators...' : 'البحث عن المؤشرات...',
    filterByType: language === 'en' ? 'Filter by Type' : 'تصفية حسب النوع',
    filterByStatus: language === 'en' ? 'Filter by Status' : 'تصفية حسب الحالة',
    allTypes: language === 'en' ? 'All Types' : 'جميع الأنواع',
    output: language === 'en' ? 'Output' : 'المخرجات',
    outcome: language === 'en' ? 'Outcome' : 'النتائج',
    impact: language === 'en' ? 'Impact' : 'التأثير',
    allStatus: language === 'en' ? 'All Status' : 'جميع الحالات',
    active: language === 'en' ? 'Active' : 'نشط',
    inactive: language === 'en' ? 'Inactive' : 'غير نشط',
    noIndicators: language === 'en' ? 'No indicators found' : 'لم يتم العثور على مؤشرات',
    noIndicatorsDesc: language === 'en' ? 'Create your first indicator to start tracking progress' : 'أنشئ مؤشرك الأول لبدء تتبع التقدم',
    code: language === 'en' ? 'Code' : 'الرمز',
    name: language === 'en' ? 'Name' : 'الاسم',
    type: language === 'en' ? 'Type' : 'النوع',
    baseline: language === 'en' ? 'Baseline' : 'خط الأساس',
    target: language === 'en' ? 'Target' : 'الهدف',
    current: language === 'en' ? 'Current' : 'الحالي',
    progress: language === 'en' ? 'Progress' : 'التقدم',
    status: language === 'en' ? 'Status' : 'الحالة',
    actions: language === 'en' ? 'Actions' : 'الإجراءات',
    edit: language === 'en' ? 'Edit' : 'تعديل',
    delete: language === 'en' ? 'Delete' : 'حذف',
    confirmDelete: language === 'en' ? 'Are you sure you want to delete this indicator?' : 'هل أنت متأكد من حذف هذا المؤشر؟',
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    confirmButton: language === 'en' ? 'Delete' : 'حذف',
    deleteSuccess: language === 'en' ? 'Indicator deleted successfully' : 'تم حذف المؤشر بنجاح',
  };

  // Load indicators
  useEffect(() => {
    loadIndicators();
  }, [projectId]);

  // Apply filters
  useEffect(() => {
    let filtered = indicators;

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(ind => ind.type === typeFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ind => ind.status === statusFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ind =>
        ind.code.toLowerCase().includes(query) ||
        ind.name.toLowerCase().includes(query) ||
        ind.description.toLowerCase().includes(query)
      );
    }

    setFilteredIndicators(filtered);
  }, [indicators, typeFilter, statusFilter, searchQuery]);

  const loadIndicators = () => {
    setLoading(true);
    try {
      const data = indicatorService.getAllIndicators({ projectId, status: 'active' });
      setIndicators(data);
    } catch (error) {
      console.error('Error loading indicators:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      indicatorService.deleteIndicator(id, user?.openId || 'system');
      loadIndicators();
      setDeleteConfirm(null);
      alert(t.deleteSuccess);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const calculateProgress = (baseline: number, target: number, current: number): number => {
    if (target === 0) return 0;
    return Math.min(((current - baseline) / (target - baseline)) * 100, 100);
  };

  const getProgressColor = (progress: number): string => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className={`text-2xl font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.title}
        </h1>
        <p className={`text-sm text-gray-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.project} {projectName}
        </p>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className={`flex flex-col md:flex-row gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.search}
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className={`px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
          >
            <option value="all">{t.allTypes}</option>
            <option value="output">{t.output}</option>
            <option value="outcome">{t.outcome}</option>
            <option value="impact">{t.impact}</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className={`px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
          >
            <option value="all">{t.allStatus}</option>
            <option value="active">{t.active}</option>
            <option value="inactive">{t.inactive}</option>
          </select>

          {/* Add Button */}
          <button
            onClick={() => navigate(`/meal/add-indicator?projectId=${projectId}&projectName=${projectName}`)}
            className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Plus className="w-4 h-4" />
            {t.addIndicator}
          </button>
        </div>
      </div>

      {/* Indicators Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : filteredIndicators.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t.noIndicators}</h3>
            <p className="text-sm text-gray-600 mb-4">{t.noIndicatorsDesc}</p>
            <button
              onClick={() => navigate(`/meal/add-indicator?projectId=${projectId}&projectName=${projectName}`)}
              className={`inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <Plus className="w-4 h-4" />
              {t.addIndicator}
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
                    {t.code}
                  </th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.name}
                  </th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.type}
                  </th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-center`}>
                    {t.baseline}
                  </th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-center`}>
                    {t.target}
                  </th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-center`}>
                    {t.current}
                  </th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.progress}
                  </th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-center`}>
                    {t.status}
                  </th>
                  <th className={`px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-center`}>
                    {t.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredIndicators.map((indicator) => {
                  const progress = calculateProgress(indicator.baseline, indicator.target, indicator.current);
                  
                  return (
                    <tr key={indicator.id} className="hover:bg-gray-50">
                      <td className={`px-6 py-4 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}>
                        <span className="text-sm font-medium text-gray-900" dir="ltr">{indicator.code}</span>
                      </td>
                      <td className={`px-6 py-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className="text-sm font-medium text-gray-900">{language === 'ar' && indicator.nameAr ? indicator.nameAr : indicator.name}</div>
                        <div className="text-xs text-gray-500">{indicator.category}</div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap ${isRTL ? 'text-right' : 'text-left'}`}>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          indicator.type === 'output' ? 'bg-blue-100 text-blue-800' :
                          indicator.type === 'outcome' ? 'bg-purple-100 text-purple-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {indicator.type === 'output' ? t.output : indicator.type === 'outcome' ? t.outcome : t.impact}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm text-gray-900" dir="ltr">{indicator.baseline}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm font-medium text-gray-900" dir="ltr">{indicator.target}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm font-semibold text-blue-600" dir="ltr">{indicator.current}</span>
                      </td>
                      <td className={`px-6 py-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[100px]">
                            <div
                              className={`h-2 rounded-full ${getProgressColor(progress)}`}
                              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-700 min-w-[40px] text-right" dir="ltr">
                            {Math.round(progress)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          indicator.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {indicator.status === 'active' ? t.active : t.inactive}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className={`flex items-center justify-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <button
                            onClick={() => navigate(`/meal/add-indicator?projectId=${projectId}&projectName=${projectName}&id=${indicator.id}`)}
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                            title={t.edit}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(indicator.id)}
                            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                            title={t.delete}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                {t.confirmButton}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
