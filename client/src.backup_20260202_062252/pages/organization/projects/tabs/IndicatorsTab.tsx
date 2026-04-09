import { useState } from 'react';
import { 
  Plus, Download, Upload, FileSpreadsheet, Edit2, Trash2, X, Search, TrendingUp,
  BarChart3, PieChart, Database, Target
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';
import { exportToStandardExcel, exportExcelTemplate, type ExcelColumn } from '@/lib/standardExcelExport';
import { UnifiedExportButton } from '@/components/exports/UnifiedExportButton';
import { PreImportPreviewDialog } from '@/components/PreImportPreviewDialog';
import { validateImportData } from '@/lib/clientSideValidation';
import { INDICATORS_CONFIG } from '@shared/importConfigs/indicators';
import { generateIndicatorsTemplate } from '@/lib/templateGenerator';

// Indicator interface matching database schema
interface Indicator {
  id: number;
  projectId: number;
  organizationId: number;
  operatingUnitId: number | null;
  activityId: number | null; // Activity link (Single Source of Truth)
  indicatorName: string;
  indicatorNameAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  type: 'OUTPUT' | 'OUTCOME' | 'IMPACT';
  category: string | null;
  unit: string;
  baseline: string;
  target: string;
  achievedValue: string;
  targetDate: string | Date | null;
  dataSource: string | null;
  verificationMethod: string | null;
  status: 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK' | 'ACHIEVED';
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Helper to format dates
const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  if (typeof date === 'string') return date.split('T')[0];
  return date.toISOString().split('T')[0];
};

interface IndicatorsTabProps {
  projectId: string;
}

export function IndicatorsTab({ projectId }: IndicatorsTabProps) {
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  
  // ✅ tRPC Query - Load indicators from database
  const { data: indicatorsData, isLoading, refetch } = trpc.indicators.getByProject.useQuery({
    projectId: parseInt(projectId),
    organizationId: 30001, // TODO: Get from context
    operatingUnitId: 30001, // TODO: Get from context
  });
  
  // ✅ tRPC Query - Load activities for dropdown (Single Source of Truth)
  const { data: activitiesData } = trpc.activities.getDropdownList.useQuery({
    projectId: parseInt(projectId),
  });
  
  // ✅ tRPC Mutations
  const createMutation = trpc.indicators.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowCreateModal(false);
      resetForm();
    },
  });
  
  const updateMutation = trpc.indicators.update.useMutation({
    onSuccess: () => {
      refetch();
      setShowEditModal(false);
      resetForm();
    },
  });
  
  const deleteMutation = trpc.indicators.delete.useMutation({
    onSuccess: () => {
      refetch();
      setShowDeleteConfirm(false);
      setSelectedIndicator(null);
    },
  });
  
  // Use database data
  const indicators = indicatorsData || [];
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDataCollectionModal, setShowDataCollectionModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<Indicator | null>(null);
  
  // Preview dialog state
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [validRows, setValidRows] = useState<any[]>([]);
  const [invalidRows, setInvalidRows] = useState<any[]>([]);
  
  // Multi-indicator creation state - for adding multiple indicators in one session
  interface PendingIndicator {
    tempId: number;
    activityId: string;
    indicatorName: string;
    indicatorNameAr: string;
    description: string;
    descriptionAr: string;
    type: 'OUTPUT' | 'OUTCOME' | 'IMPACT';
    category: string;
    unit: string;
    baseline: string;
    target: string;
    achievedValue: string;
    targetDate: string;
    dataSource: string;
    verificationMethod: string;
    status: 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK' | 'ACHIEVED';
  }
  const [pendingIndicators, setPendingIndicators] = useState<PendingIndicator[]>([]);

  const [formData, setFormData] = useState({
    activityId: '' as string, // Activity link (Single Source of Truth)
    indicatorName: '',
    indicatorNameAr: '',
    description: '',
    descriptionAr: '',
    type: 'OUTPUT' as Indicator['type'],
    category: '',
    unit: '',
    baseline: '0',
    target: '0',
    achievedValue: '0',
    targetDate: '',
    dataSource: '',
    verificationMethod: '',
    status: 'ON_TRACK' as Indicator['status'],
  });

  const filteredIndicators = indicators.filter(indicator =>
    indicator.indicatorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    indicator.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate progress percentage
  const getProgress = (indicator: Indicator) => {
    const target = parseFloat(indicator.target) || 0;
    const baseline = parseFloat(indicator.baseline) || 0;
    const achieved = parseFloat(indicator.achievedValue) || 0;
    if (target === baseline) return 0;
    const progress = ((achieved - baseline) / (target - baseline)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  // Helper to get translated type label
  const getTypeLabel = (type: Indicator['type']) => {
    switch (type) {
      case 'OUTPUT': return t.projectDetail?.indicatorTypeOutput || 'Output';
      case 'OUTCOME': return t.projectDetail?.indicatorTypeOutcome || 'Outcome';
      case 'IMPACT': return t.projectDetail?.indicatorTypeImpact || 'Impact';
      default: return type;
    }
  };

  // Export to Excel
  const handleExportExcel = async () => {
    const exportData = filteredIndicators.map(indicator => ({
      ...indicator,
      type: getTypeLabel(indicator.type)
    }));

    const columns: ExcelColumn[] = [
      { name: t.projectDetail.indicatorCode, key: 'code', width: 15, type: 'text' },
      { name: t.projectDetail.indicatorTitle, key: 'title', width: 45, type: 'text' },
      { name: t.common.description, key: 'description', width: 50, type: 'text' },
      { name: t.projectDetail.indicatorType, key: 'type', width: 12, type: 'text' },
      { name: t.projectDetail.indicatorUnit, key: 'unit', width: 15, type: 'text' },
      { name: t.projectDetail.indicatorBaseline, key: 'baseline', width: 12, type: 'number', totals: 'sum' },
      { name: t.projectDetail.indicatorTarget, key: 'target', width: 12, type: 'number', totals: 'sum' },
      { name: t.projectDetail.indicatorAchieved, key: 'achieved', width: 12, type: 'number', totals: 'sum' },
    ];

    await exportToStandardExcel({
      sheetName: t.projectDetail.indicatorsPageTitle,
      columns,
      data: exportData,
      fileName: `Indicators_Export_${new Date().toISOString().split('T')[0]}`,
      includeTotals: true,
      isRTL,
    });
  };

  // Export Empty Template
  const handleExportTemplate = async () => {
    const columns: ExcelColumn[] = [
      { name: `${t.projectDetail.indicatorCode}*`, key: 'code', width: 15, type: 'text' },
      { name: `${t.projectDetail.indicatorTitle}*`, key: 'title', width: 45, type: 'text' },
      { name: t.common.description, key: 'description', width: 50, type: 'text' },
      { name: t.projectDetail.indicatorType, key: 'type', width: 12, type: 'text' },
      { name: `${t.projectDetail.indicatorUnit}*`, key: 'unit', width: 15, type: 'text' },
      { name: t.projectDetail.indicatorBaseline, key: 'baseline', width: 12, type: 'number' },
      { name: `${t.projectDetail.indicatorTarget}*`, key: 'target', width: 12, type: 'number' },
      { name: t.projectDetail.indicatorAchieved, key: 'achieved', width: 12, type: 'number' },
    ];

    await exportExcelTemplate({
      sheetName: t.projectDetail.indicatorsPageTitle,
      columns,
      fileName: 'Indicators_Template',
      isRTL,
    });
  };

  // Import from Excel with preview
  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const workbook = new Workbook();
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.worksheets[0];
      const rawData: any[] = [];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        
        const rowData: any = {};
        INDICATORS_CONFIG.columns.forEach((col, index) => {
          rowData[col.key] = row.getCell(index + 1).value?.toString() || '';
        });
        rawData.push(rowData);
      });

      // Validate using shared framework
      const { validRows: valid, invalidRows: invalid } = validateImportData(
        rawData,
        INDICATORS_CONFIG
      );

      setValidRows(valid);
      setInvalidRows(invalid);
      setShowImportModal(false);
      setShowPreviewDialog(true);
    } catch (error) {
      console.error('Import error:', error);
      alert(t.common.importErrors);
    }
  };

  // Confirm import after preview
  const handleConfirmImport = () => {
    const newIndicators = validRows.map((row: any) => ({
      id: `imported-${Date.now()}-${Math.random()}`,
      code: row.indicatorCode || '',
      title: row.indicatorTitle || '',
      description: row.description || '',
      type: (row.type || 'Output') as Indicator['type'],
      category: 'Quantitative',
      unit: row.unit || '',
      baseline: parseFloat(row.baseline || '0'),
      target: parseFloat(row.target || '0'),
      achieved: parseFloat(row.achieved || '0'),
      reportingFrequency: 'Monthly',
      dataSource: row.dataSource || '',
      responsible: row.responsible || '',
      lastUpdated: new Date().toISOString().split('T')[0]
    }));

    setIndicators([...indicators, ...newIndicators]);
    setShowPreviewDialog(false);
    alert(`${t.common.importSuccess} ${newIndicators.length}`);
  };

  // Add current form data to pending list (for multi-indicator creation)
  const handleAddToList = () => {
    if (!formData.indicatorName || !formData.unit || !formData.target) {
      alert(t.projectDetail?.fillRequiredFields || 'Please fill required fields');
      return;
    }

    const newPendingIndicator: PendingIndicator = {
      tempId: Date.now(),
      ...formData,
    };
    setPendingIndicators([...pendingIndicators, newPendingIndicator]);
    
    // Reset form for next indicator but keep activity selected
    const currentActivityId = formData.activityId;
    resetForm();
    setFormData(prev => ({ ...prev, activityId: currentActivityId }));
  };

  // Remove indicator from pending list
  const handleRemoveFromList = (tempId: number) => {
    setPendingIndicators(pendingIndicators.filter(ind => ind.tempId !== tempId));
  };

  const handleCreate = async () => {
    // If there are pending indicators, create them all
    // If no pending indicators, create just the current form data
    const indicatorsToCreate = pendingIndicators.length > 0 
      ? pendingIndicators 
      : (formData.indicatorName && formData.unit && formData.target) 
        ? [{ tempId: Date.now(), ...formData }] 
        : [];

    if (indicatorsToCreate.length === 0) {
      alert(t.projectDetail?.fillRequiredFields || 'Please fill required fields or add indicators to the list');
      return;
    }

    // Create all indicators sequentially
    for (const indicator of indicatorsToCreate) {
      await createMutation.mutateAsync({
        projectId: parseInt(projectId),
        organizationId: 30001, // TODO: Get from context
        operatingUnitId: 30001, // TODO: Get from context
        activityId: indicator.activityId ? parseInt(indicator.activityId) : undefined,
        indicatorName: indicator.indicatorName,
        indicatorNameAr: indicator.indicatorNameAr || undefined,
        description: indicator.description || undefined,
        descriptionAr: indicator.descriptionAr || undefined,
        type: indicator.type,
        category: indicator.category || undefined,
        unit: indicator.unit,
        baseline: indicator.baseline,
        target: indicator.target,
        achievedValue: indicator.achievedValue,
        targetDate: indicator.targetDate || undefined,
        dataSource: indicator.dataSource || undefined,
        verificationMethod: indicator.verificationMethod || undefined,
        status: indicator.status,
      });
    }

    // Clear pending list and close modal
    setPendingIndicators([]);
    setShowCreateModal(false);
    resetForm();
    refetch();
  };

  const handleEdit = () => {
    if (!selectedIndicator) return;

    updateMutation.mutate({
      id: selectedIndicator.id,
      activityId: formData.activityId ? parseInt(formData.activityId) : undefined,
      indicatorName: formData.indicatorName || undefined,
      indicatorNameAr: formData.indicatorNameAr || undefined,
      description: formData.description || undefined,
      descriptionAr: formData.descriptionAr || undefined,
      type: formData.type,
      category: formData.category || undefined,
      unit: formData.unit || undefined,
      baseline: formData.baseline || undefined,
      target: formData.target || undefined,
      achievedValue: formData.achievedValue || undefined,
      targetDate: formData.targetDate || undefined,
      dataSource: formData.dataSource || undefined,
      verificationMethod: formData.verificationMethod || undefined,
      status: formData.status,
    });
  };

  const handleDelete = () => {
    if (!selectedIndicator) return;
    
    deleteMutation.mutate({ id: selectedIndicator.id });
  };

  const handleDataCollection = () => {
    if (!selectedIndicator) return;

    const updated = indicators.map(ind => 
      ind.id === selectedIndicator.id 
        ? { ...ind, achieved: formData.achieved, lastUpdated: formData.lastUpdated } 
        : ind
    );
    setIndicators(updated);
    saveIndicators(updated);
    setShowDataCollectionModal(false);
    setSelectedIndicator(null);
    resetForm();
    alert(t.common.saveSuccess);
  };

  const resetForm = () => {
    setFormData({
      activityId: '',
      indicatorName: '',
      indicatorNameAr: '',
      description: '',
      descriptionAr: '',
      type: 'OUTPUT',
      category: '',
      unit: '',
      baseline: '0',
      target: '0',
      achievedValue: '0',
      targetDate: '',
      dataSource: '',
      verificationMethod: '',
      status: 'ON_TRACK',
    });
  };

  const openEditModal = (indicator: Indicator) => {
    setSelectedIndicator(indicator);
    setFormData({
      activityId: indicator.activityId?.toString() || '',
      indicatorName: indicator.indicatorName || '',
      indicatorNameAr: indicator.indicatorNameAr || '',
      description: indicator.description || '',
      descriptionAr: indicator.descriptionAr || '',
      type: indicator.type,
      category: indicator.category || '',
      unit: indicator.unit || '',
      baseline: indicator.baseline || '0',
      target: indicator.target || '0',
      achievedValue: indicator.achievedValue || '0',
      targetDate: formatDate(indicator.targetDate),
      dataSource: indicator.dataSource || '',
      verificationMethod: indicator.verificationMethod || '',
      status: indicator.status,
    });
    setShowEditModal(true);
  };

  const openDeleteConfirm = (indicator: Indicator) => {
    setSelectedIndicator(indicator);
    setShowDeleteConfirm(true);
  };

  const openDataCollectionModal = (indicator: Indicator) => {
    setSelectedIndicator(indicator);
    setFormData({ ...indicator });
    setShowDataCollectionModal(true);
  };

  const getTypeColor = (type: Indicator['type']) => {
    switch (type) {
      case 'OUTPUT': return 'bg-blue-100 text-blue-700';
      case 'OUTCOME': return 'bg-green-100 text-green-700';
      case 'IMPACT': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mt-6">
        <div className="text-start">
          <h2 className="text-sm font-semibold text-gray-900">{t.projectDetail.indicatorsPageTitle}</h2>
          <p className="text-xs text-gray-600 mt-0.5">{t.projectDetail.indicatorsPageSubtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <UnifiedExportButton
            hasData={filteredIndicators.length > 0}
            onExportData={handleExportExcel}
            onExportTemplate={handleExportTemplate}
            moduleName="Indicators"
            showModal={true}
          />
          <button
            onClick={() => setShowImportModal(true)}
            className={`px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Upload className="w-4 h-4" />
            {t.projectDetail.importActivities}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className={`px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Plus className="w-4 h-4" />
            {t.projectDetail.addIndicator}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 start-3" />
        <input
          type="text"
          placeholder={t.projectDetail.searchIndicators}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full py-2 ps-10 pe-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-start"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-blue-600" />
            <div className="text-sm text-gray-600 text-start">{t.projectDetail.totalIndicators}</div>
          </div>
          <div className="text-2xl font-bold text-gray-900" dir="ltr">{indicators.length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-green-600" />
            <div className="text-sm text-gray-600 text-start">{t.common.onTrack}</div>
          </div>
          <div className="text-2xl font-bold text-green-600" dir="ltr">
            {indicators.filter(i => getProgress(i) >= 75).length}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-orange-600" />
            <div className="text-sm text-gray-600 text-start">{t.common.atRisk}</div>
          </div>
          <div className="text-2xl font-bold text-orange-600" dir="ltr">
            {indicators.filter(i => getProgress(i) < 50).length}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <PieChart className="w-5 h-5 text-purple-600" />
            <div className="text-sm text-gray-600 text-start">{t.common.avgProgress}</div>
          </div>
          <div className="text-2xl font-bold text-gray-900" dir="ltr">
            {indicators.length > 0 
              ? (indicators.reduce((sum, i) => sum + getProgress(i), 0) / indicators.length).toFixed(1)
              : 0}%
          </div>
        </div>
      </div>

      {/* Indicators Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredIndicators.length === 0 ? (
          <div className="col-span-full py-12 text-center">
            <p className="text-lg text-gray-600 mb-2">{t.projectDetail.noIndicatorsFound}</p>
          </div>
        ) : (
          filteredIndicators.map((indicator) => {
            const progress = getProgress(indicator);
            return (
              <div
                key={indicator.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6"
              >
                {/* Header with Type Badge */}
                <div className="flex items-start justify-between mb-4">
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getTypeColor(indicator.type)}`}>
                    {getTypeLabel(indicator.type)}
                  </span>
                  <span className="text-xs text-gray-500 text-end" dir="ltr">
                    ID: {indicator.id}
                  </span>
                </div>

                {/* Indicator Name */}
                <h3 className="text-base font-bold text-gray-900 mb-2 line-clamp-2 text-start">
                  {isRTL ? indicator.indicatorNameAr || indicator.indicatorName : indicator.indicatorName}
                </h3>

                {/* Activity/Category */}
                <p className="text-xs text-gray-600 mb-4 text-start">
                  {t.projectDetail.indicatorUnit}: {indicator.unit}
                </p>

                {/* Metrics Row */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1 text-start">
                      {t.projectDetail.indicatorBaseline}
                    </p>
                    <p className="text-base font-semibold text-gray-900 text-start" dir="ltr">
                      {indicator.baseline}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1 text-start">
                      {t.projectDetail.indicatorTarget}
                    </p>
                    <p className="text-base font-semibold text-blue-600 text-start" dir="ltr">
                      {indicator.target}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1 text-start">
                      {t.projectDetail.indicatorAchieved}
                    </p>
                    <p className="text-base font-semibold text-green-600 text-start" dir="ltr">
                      {indicator.achievedValue}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-700 text-start">
                      {t.common.progress}
                    </span>
                    <span className="text-xs font-semibold text-gray-900" dir="ltr">
                      {progress.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2" dir="ltr">
                    <div
                      className={`h-2 rounded-full transition-all ${getProgressColor(progress)}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Reporting Frequency & Data Source */}
                <div className="mb-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-600 text-start">
                      {t.projectDetail.reportingFrequency}:
                    </span>
                    <span className="text-xs font-semibold text-gray-900 text-start">
                      {indicator.status}
                    </span>
                  </div>
                  {indicator.dataSource && (
                    <p className="text-xs text-gray-600 text-start">
                      {t.projectDetail.dataSource}: {indicator.dataSource}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openDataCollectionModal(indicator)}
                    className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    title={t.common.collectData}
                  >
                    <span className="flex items-center justify-center gap-1 text-xs font-semibold">
                      <Database className="w-4 h-4" />
                      {t.common.collectData}
                    </span>
                  </button>
                  <button
                    onClick={() => openEditModal(indicator)}
                    className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                    title={t.common.edit}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openDeleteConfirm(indicator)}
                    className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                    title={t.common.delete}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modals - Simplified placeholders for now */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className={`sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-lg font-semibold text-gray-900">{t.projectDetail.addIndicator}</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Row 1: Activity Selection (Single Source of Truth) */}
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  Activity (Source of Truth)
                </label>
                <select
                  value={formData.activityId}
                  onChange={(e) => setFormData({ ...formData, activityId: e.target.value })}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  <option value="">-- Select Activity --</option>
                  {activitiesData?.map((activity: any) => (
                    <option key={activity.id} value={activity.id}>
                      {activity.activityCode} - {activity.activityName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 2: Type and Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.projectDetail?.indicatorType || 'Type'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as Indicator['type'] })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    <option value="OUTPUT">Output</option>
                    <option value="OUTCOME">Outcome</option>
                    <option value="IMPACT">Impact</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Indicator['status'] })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    <option value="ON_TRACK">On Track</option>
                    <option value="AT_RISK">At Risk</option>
                    <option value="OFF_TRACK">Off Track</option>
                    <option value="ACHIEVED">Achieved</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Indicator Name */}
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  Indicator Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.indicatorName}
                  onChange={(e) => setFormData({ ...formData, indicatorName: e.target.value })}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  placeholder="Number of beneficiaries reached"
                />
              </div>

              {/* Row 3: Description */}
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.common.description}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  rows={3}
                  placeholder="Brief description of the indicator"
                />
              </div>

              {/* Row 4: Unit and Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.projectDetail.indicatorUnit} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                    placeholder="Persons / Percentage / Events"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.projectDetail.indicatorCategory}
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as Indicator['category'] })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    <option value="Quantitative">{t.projectDetail.indicatorQuantitative}</option>
                    <option value="Qualitative">{t.projectDetail.indicatorQualitative}</option>
                  </select>
                </div>
              </div>

              {/* Row 5: Baseline, Target, Achieved */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.projectDetail?.indicatorBaseline || 'Baseline'}
                  </label>
                  <input
                    type="text"
                    value={formData.baseline}
                    onChange={(e) => setFormData({ ...formData, baseline: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.projectDetail?.indicatorTarget || 'Target'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.target}
                    onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.projectDetail?.indicatorAchieved || 'Achieved'}
                  </label>
                  <input
                    type="text"
                    value={formData.achievedValue}
                    onChange={(e) => setFormData({ ...formData, achievedValue: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                </div>
              </div>

              {/* Row 6: Target Date, Data Source, Verification Method */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={formData.targetDate}
                    onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.projectDetail?.dataSource || 'Data Source'}
                  </label>
                  <input
                    type="text"
                    value={formData.dataSource}
                    onChange={(e) => setFormData({ ...formData, dataSource: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                    placeholder="Attendance Sheets"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    Verification Method
                  </label>
                  <input
                    type="text"
                    value={formData.verificationMethod}
                    onChange={(e) => setFormData({ ...formData, verificationMethod: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                    placeholder="Field visits, Reports"
                  />
                </div>
              </div>
              
              {/* Add New Indicator Button - allows adding multiple indicators before creating */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleAddToList}
                  className="w-full px-4 py-3 border-2 border-dashed border-primary/50 text-primary rounded-lg hover:bg-primary/5 flex items-center justify-center gap-2 font-medium"
                >
                  <Plus className="w-5 h-5" />
                  {isRTL ? 'إضافة مؤشر جديد' : 'Add New Indicator'}
                </button>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  {isRTL ? 'أضف مؤشرات متعددة لنفس النشاط قبل الإنشاء' : 'Add multiple indicators for the same activity before creating'}
                </p>
              </div>
              
              {/* Pending Indicators List */}
              {pendingIndicators.length > 0 && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-800 mb-3">
                    {isRTL ? `المؤشرات المعلقة (${pendingIndicators.length})` : `Pending Indicators (${pendingIndicators.length})`}
                  </h4>
                  <div className="space-y-2">
                    {pendingIndicators.map((indicator, index) => (
                      <div key={indicator.tempId} className="flex items-center justify-between bg-white p-3 rounded-md border border-blue-100">
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-800">
                            {index + 1}. {indicator.indicatorName}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({indicator.type} | Target: {indicator.target} {indicator.unit})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromList(indicator.tempId)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={`sticky bottom-0 bg-gray-50 px-6 py-4 flex gap-3 border-t border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setPendingIndicators([]);
                  resetForm();
                }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
              >
                {pendingIndicators.length > 0 
                  ? (isRTL ? `إنشاء ${pendingIndicators.length} مؤشرات` : `Create ${pendingIndicators.length} Indicator${pendingIndicators.length > 1 ? 's' : ''}`)
                  : t.common.create
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className={`text-lg font-semibold mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t.projectDetail.importActivities}</h3>
            <input type="file" accept=".xlsx,.xls" onChange={handleImportExcel} className="w-full mb-4" />
            <button onClick={() => setShowImportModal(false)} className="px-4 py-2 border rounded">{t.common.cancel}</button>
          </div>
        </div>
      )}

      {/* ✅ EDIT MODAL */}
      {showEditModal && selectedIndicator && (
        <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowEditModal(false); setSelectedIndicator(null); resetForm(); }}>
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className={`sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-lg font-semibold text-gray-900">Edit Indicator</h3>
              <button onClick={() => { setShowEditModal(false); setSelectedIndicator(null); resetForm(); }} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>Code *</label>
                  <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className={`w-full px-3 py-2 border border-gray-300 rounded-md ${isRTL ? 'text-right' : 'text-left'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>Type *</label>
                  <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as Indicator['type'] })} className={`w-full px-3 py-2 border border-gray-300 rounded-md ${isRTL ? 'text-right' : 'text-left'}`}>
                    <option value="Output">Output</option>
                    <option value="Outcome">Outcome</option>
                    <option value="Impact">Impact</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>Title *</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className={`w-full px-3 py-2 border border-gray-300 rounded-md ${isRTL ? 'text-right' : 'text-left'}`} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>Baseline</label>
                  <input type="number" value={formData.baseline} onChange={(e) => setFormData({ ...formData, baseline: parseFloat(e.target.value) })} className={`w-full px-3 py-2 border border-gray-300 rounded-md ${isRTL ? 'text-right' : 'text-left'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>Target *</label>
                  <input type="number" value={formData.target} onChange={(e) => setFormData({ ...formData, target: parseFloat(e.target.value) })} className={`w-full px-3 py-2 border border-gray-300 rounded-md ${isRTL ? 'text-right' : 'text-left'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>Achieved</label>
                  <input type="number" value={formData.achieved} onChange={(e) => setFormData({ ...formData, achieved: parseFloat(e.target.value) })} className={`w-full px-3 py-2 border border-gray-300 rounded-md ${isRTL ? 'text-right' : 'text-left'}`} />
                </div>
              </div>
            </div>
            <div className={`sticky bottom-0 bg-gray-50 px-6 py-4 flex gap-3 border-t border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button onClick={() => { setShowEditModal(false); setSelectedIndicator(null); resetForm(); }} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
              <button onClick={handleEdit} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90">Update</button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ DATA COLLECTION MODAL */}
      {showDataCollectionModal && selectedIndicator && (
        <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowDataCollectionModal(false); setSelectedIndicator(null); resetForm(); }}>
          <div className="bg-white rounded-lg w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className={`bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-lg font-semibold text-gray-900">Collect Data</h3>
              <button onClick={() => { setShowDataCollectionModal(false); setSelectedIndicator(null); resetForm(); }} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className={`font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{selectedIndicator.title}</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className={`text-xs text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>Baseline</p>
                    <p className="text-sm font-semibold text-gray-900" dir="ltr">{selectedIndicator.baseline} {selectedIndicator.unit}</p>
                  </div>
                  <div>
                    <p className={`text-xs text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>Target</p>
                    <p className="text-sm font-semibold text-blue-600" dir="ltr">{selectedIndicator.target} {selectedIndicator.unit}</p>
                  </div>
                  <div>
                    <p className={`text-xs text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>Current Achieved</p>
                    <p className="text-sm font-semibold text-green-600" dir="ltr">{selectedIndicator.achieved} {selectedIndicator.unit}</p>
                  </div>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>New Achieved Value *</label>
                <input type="number" value={formData.achieved} onChange={(e) => setFormData({ ...formData, achieved: parseFloat(e.target.value) })} className={`w-full px-3 py-2 border border-gray-300 rounded-md text-lg font-semibold ${isRTL ? 'text-right' : 'text-left'}`} placeholder="0" />
              </div>
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>Date</label>
                <input type="date" value={formData.lastUpdated} onChange={(e) => setFormData({ ...formData, lastUpdated: e.target.value })} className={`w-full px-3 py-2 border border-gray-300 rounded-md ${isRTL ? 'text-right' : 'text-left'}`} />
              </div>
            </div>
            <div className={`bg-gray-50 px-6 py-4 flex gap-3 border-t border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button onClick={() => { setShowDataCollectionModal(false); setSelectedIndicator(null); resetForm(); }} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
              <button onClick={handleDataCollection} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Save</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && selectedIndicator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className={`text-lg font-semibold mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.common.confirmDelete}
            </h3>
            <p className={`text-gray-600 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              {isRTL 
                ? `هل أنت متأكد من حذف المؤشر "${selectedIndicator.title}"؟`
                : `Are you sure you want to delete the indicator "${selectedIndicator.title}"?`
              }
            </p>
            <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 border rounded">{t.common.cancel}</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded">{t.common.delete}</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Dialog */}
      <PreImportPreviewDialog
        isOpen={showPreviewDialog}
        onClose={() => setShowPreviewDialog(false)}
        validRows={validRows}
        invalidRows={invalidRows}
        onConfirm={handleConfirmImport}
        moduleName="Indicators"
        config={INDICATORS_CONFIG}
      />
    </div>
  );
}