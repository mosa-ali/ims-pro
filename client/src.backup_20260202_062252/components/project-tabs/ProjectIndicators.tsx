import { useState } from 'react';
import { 
  Plus, Download, Upload, FileSpreadsheet, Edit2, Trash2, X, Search, TrendingUp,
  BarChart3, PieChart, Database, Target
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';

interface Indicator {
  id: string;
  code: string;
  title: string;
  description: string;
  type: 'Output' | 'Outcome' | 'Impact';
  category: 'Quantitative' | 'Qualitative';
  unit: string;
  baseline: number;
  target: number;
  achieved: number;
  reportingFrequency: 'Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual';
  dataSource: string;
  responsible: string;
  lastUpdated: string;
}

const mockIndicators: Indicator[] = [
  {
    id: '1',
    code: 'IND-001',
    title: 'Number of beneficiaries reached',
    description: 'Total number of direct beneficiaries who participated in project activities',
    type: 'Output',
    category: 'Quantitative',
    unit: 'Persons',
    baseline: 0,
    target: 5000,
    achieved: 1250,
    reportingFrequency: 'Monthly',
    dataSource: 'Attendance Sheets',
    responsible: 'Sarah Johnson',
    lastUpdated: '2024-01-15'
  },
  {
    id: '2',
    code: 'IND-002',
    title: 'Percentage of participants satisfied with training',
    description: 'Satisfaction rate based on post-training surveys',
    type: 'Outcome',
    category: 'Quantitative',
    unit: 'Percentage',
    baseline: 60,
    target: 85,
    achieved: 78,
    reportingFrequency: 'Quarterly',
    dataSource: 'Survey Forms',
    responsible: 'Mike Chen',
    lastUpdated: '2024-01-10'
  },
  {
    id: '3',
    code: 'IND-003',
    title: 'Number of community awareness events conducted',
    description: 'Total events organized for community engagement',
    type: 'Output',
    category: 'Quantitative',
    unit: 'Events',
    baseline: 0,
    target: 24,
    achieved: 6,
    reportingFrequency: 'Monthly',
    dataSource: 'Event Reports',
    responsible: 'Emma Davis',
    lastUpdated: '2024-01-20'
  },
  {
    id: '4',
    code: 'IND-004',
    title: 'Improvement in knowledge scores',
    description: 'Average increase in pre/post test scores',
    type: 'Outcome',
    category: 'Quantitative',
    unit: 'Points',
    baseline: 45,
    target: 75,
    achieved: 68,
    reportingFrequency: 'Quarterly',
    dataSource: 'Assessment Tests',
    responsible: 'John Smith',
    lastUpdated: '2024-01-18'
  }
];

interface IndicatorsTabProps {
  projectId: string;
}

export function IndicatorsTab({ projectId }: IndicatorsTabProps) {
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  
  // ✅ Load indicators from localStorage, linked to projectId
  const loadIndicators = (): Indicator[] => {
    const stored = localStorage.getItem('pms_indicators');
    if (!stored) return [];
    
    const allIndicators = JSON.parse(stored);
    return allIndicators
      .filter((i: any) => i.projectId === projectId)
      .map((i: any) => ({
        id: i.id,
        code: i.indicatorCode || i.code,
        title: i.indicatorTitle || i.title,
        description: i.description || '',
        type: i.type || 'Output',
        category: i.category || 'Quantitative',
        unit: i.unit || '',
        baseline: i.baseline || 0,
        target: i.target || 0,
        achieved: i.achievedValue || i.achieved || 0,
        reportingFrequency: i.reportingFrequency || 'Monthly',
        dataSource: i.dataSource || '',
        responsible: i.responsible || '',
        lastUpdated: i.lastUpdated || new Date().toISOString().split('T')[0]
      }));
  };

  // ✅ Save indicators to localStorage in report-compatible format
  const saveIndicators = (indicators: Indicator[]) => {
    const stored = localStorage.getItem('pms_indicators');
    const allIndicators = stored ? JSON.parse(stored) : [];
    
    // Remove old indicators for this project
    const otherIndicators = allIndicators.filter((i: any) => i.projectId !== projectId);
    
    // Add new indicators in report format
    const newIndicators = indicators.map(i => ({
      id: i.id,
      projectId: projectId,
      indicatorCode: i.code,
      indicatorTitle: i.title,
      description: i.description,
      baseline: i.baseline,
      target: i.target,
      achievedValue: i.achieved,
      unit: i.unit,
      trend: i.achieved > i.baseline ? 'UP' : i.achieved < i.baseline ? 'DOWN' : 'STABLE',
      linkedToRisk: false,
      lastUpdated: i.lastUpdated,
      type: i.type,
      category: i.category,
      reportingFrequency: i.reportingFrequency,
      dataSource: i.dataSource,
      responsible: i.responsible
    }));
    
    localStorage.setItem('pms_indicators', JSON.stringify([...otherIndicators, ...newIndicators]));
  };

  const [indicators, setIndicators] = useState<Indicator[]>(() => {
    const loaded = loadIndicators();
    // If no indicators exist for this project, initialize with mock data
    if (loaded.length === 0) {
      // Save mock indicators immediately on first load
      saveIndicators(mockIndicators);
      return mockIndicators;
    }
    return loaded;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDataCollectionModal, setShowDataCollectionModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState<Indicator | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    type: 'Output' as Indicator['type'],
    category: 'Quantitative' as Indicator['category'],
    unit: '',
    baseline: 0,
    target: 0,
    achieved: 0,
    reportingFrequency: 'Monthly' as Indicator['reportingFrequency'],
    dataSource: '',
    responsible: '',
    lastUpdated: new Date().toISOString().split('T')[0]
  });

  const filteredIndicators = indicators.filter(indicator =>
    indicator.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    indicator.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    indicator.responsible.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate progress percentage
  const getProgress = (indicator: Indicator) => {
    if (indicator.target === 0) return 0;
    const progress = ((indicator.achieved - indicator.baseline) / (indicator.target - indicator.baseline)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  // Helper to get translated type label
  const getTypeLabel = (type: Indicator['type']) => {
    switch (type) {
      case 'Output': return t('projectDetail.indicatorTypeOutput');
      case 'Outcome': return t('projectDetail.indicatorTypeOutcome');
      case 'Impact': return t('projectDetail.indicatorTypeImpact');
    }
  };

  // Export to Excel
  const handleExportExcel = async () => {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet(t('projectDetail.indicatorsPageTitle'));

    worksheet.columns = [
      { header: t('projectDetail.indicatorCode'), key: 'code', width: 15 },
      { header: t('projectDetail.indicatorTitle'), key: 'title', width: 45 },
      { header: t('common.description'), key: 'description', width: 50 },
      { header: t('projectDetail.indicatorType'), key: 'type', width: 12 },
      { header: t('projectDetail.indicatorUnit'), key: 'unit', width: 15 },
      { header: t('projectDetail.indicatorBaseline'), key: 'baseline', width: 12 },
      { header: t('projectDetail.indicatorTarget'), key: 'target', width: 12 },
      { header: t('projectDetail.indicatorAchieved'), key: 'achieved', width: 12 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' }
    };

    filteredIndicators.forEach(indicator => {
      worksheet.addRow({
        ...indicator,
        type: getTypeLabel(indicator.type)
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    saveAs(blob, `Indicators_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export Empty Template
  const handleExportTemplate = async () => {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet(t('projectDetail.indicatorsPageTitle'));

    worksheet.columns = [
      { header: `${t('projectDetail.indicatorCode')}*`, key: 'code', width: 15 },
      { header: `${t('projectDetail.indicatorTitle')}*`, key: 'title', width: 45 },
      { header: t('common.description'), key: 'description', width: 50 },
      { header: t('projectDetail.indicatorType'), key: 'type', width: 12 },
      { header: `${t('projectDetail.indicatorUnit')}*`, key: 'unit', width: 15 },
      { header: t('projectDetail.indicatorBaseline'), key: 'baseline', width: 12 },
      { header: `${t('projectDetail.indicatorTarget')}*`, key: 'target', width: 12 },
      { header: t('projectDetail.indicatorAchieved'), key: 'achieved', width: 12 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF059669' }
    };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    saveAs(blob, 'Indicators_Template_Empty.xlsx');
  };

  // Import from Excel
  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const workbook = new Workbook();
    const arrayBuffer = await file.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];
    const importedData: Indicator[] = [];
    const errors: string[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const code = row.getCell(1).value?.toString() || '';
      const title = row.getCell(2).value?.toString() || '';
      const unit = row.getCell(6).value?.toString() || '';
      const target = row.getCell(8).value?.toString() || '';

      if (!code) errors.push(`${t('common.row')} ${rowNumber}: ${t('projectDetail.indicatorCode')} ${t('common.required')}`);
      if (!title) errors.push(`${t('common.row')} ${rowNumber}: ${t('projectDetail.indicatorTitle')} ${t('common.required')}`);
      if (!unit) errors.push(`${t('common.row')} ${rowNumber}: ${t('projectDetail.indicatorUnit')} ${t('common.required')}`);
      if (!target) errors.push(`${t('common.row')} ${rowNumber}: ${t('projectDetail.indicatorTarget')} ${t('common.required')}`);

      importedData.push({
        id: `imported-${Date.now()}-${rowNumber}`,
        code,
        title,
        description: row.getCell(3).value?.toString() || '',
        type: (row.getCell(4).value?.toString() || 'Output') as Indicator['type'],
        category: 'Quantitative',
        unit,
        baseline: parseFloat(row.getCell(7).value?.toString() || '0'),
        target: parseFloat(target),
        achieved: parseFloat(row.getCell(8).value?.toString() || '0'),
        reportingFrequency: 'Monthly',
        dataSource: '',
        responsible: '',
        lastUpdated: new Date().toISOString().split('T')[0]
      });
    });

    if (errors.length > 0) {
      alert(`${t('common.importErrors')}:\n${errors.join('\n')}`);
      return;
    }

    setIndicators([...indicators, ...importedData]);
    alert(`${t('common.importSuccess')} ${importedData.length}`);
    setShowImportModal(false);
  };

  const handleCreate = () => {
    if (!formData.code || !formData.title || !formData.unit || !formData.target) {
      alert(t('projectDetail.fillRequiredFields'));
      return;
    }

    const newIndicator: Indicator = {
      id: `ind-${Date.now()}`,
      ...formData
    };

    const updated = [...indicators, newIndicator];
    setIndicators(updated);
    saveIndicators(updated);
    setShowCreateModal(false);
    resetForm();
    alert(t('common.createSuccess'));
  };

  const handleEdit = () => {
    if (!selectedIndicator) return;

    const updated = indicators.map(ind => 
      ind.id === selectedIndicator.id ? { ...selectedIndicator, ...formData } : ind
    );
    setIndicators(updated);
    saveIndicators(updated);
    setShowEditModal(false);
    setSelectedIndicator(null);
    resetForm();
    alert(t('common.updateSuccess'));
  };

  const handleDelete = () => {
    if (!selectedIndicator) return;
    
    const updated = indicators.filter(ind => ind.id !== selectedIndicator.id);
    setIndicators(updated);
    saveIndicators(updated);
    setShowDeleteConfirm(false);
    setSelectedIndicator(null);
    alert(t('common.deleteSuccess'));
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
    alert(t('common.saveSuccess'));
  };

  const resetForm = () => {
    setFormData({
      code: '',
      title: '',
      description: '',
      type: 'Output',
      category: 'Quantitative',
      unit: '',
      baseline: 0,
      target: 0,
      achieved: 0,
      reportingFrequency: 'Monthly',
      dataSource: '',
      responsible: '',
      lastUpdated: new Date().toISOString().split('T')[0]
    });
  };

  const openEditModal = (indicator: Indicator) => {
    setSelectedIndicator(indicator);
    setFormData(indicator);
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
      case 'Output': return 'bg-blue-100 text-blue-700';
      case 'Outcome': return 'bg-green-100 text-green-700';
      case 'Impact': return 'bg-purple-100 text-purple-700';
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
      <div className={`flex items-center justify-between mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h2 className="text-sm font-semibold text-gray-900">{t('projectDetail.indicatorsPageTitle')}</h2>
          <p className="text-xs text-gray-600 mt-0.5">{t('projectDetail.indicatorsPageSubtitle')}</p>
        </div>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={handleExportTemplate}
            className={`px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            {t('projectDetail.exportTemplate')}
          </button>
          <button
            onClick={handleExportExcel}
            disabled={filteredIndicators.length === 0}
            className={`px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Download className="w-4 h-4" />
            {t('projectDetail.exportIndicators')}
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className={`px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Upload className="w-4 h-4" />
            {t('projectDetail.importActivities')}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className={`px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Plus className="w-4 h-4" />
            {t('projectDetail.addIndicator')}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 ${isRTL ? 'end-3' : 'start-3'}`} />
        <input
          type="text"
          placeholder={t('projectDetail.searchIndicators')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'pe-10 ps-4 text-right' : 'ps-10 pe-4 text-left'}`}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Target className="w-5 h-5 text-blue-600" />
            <div className={`text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.totalIndicators')}</div>
          </div>
          <div className="text-2xl font-bold text-gray-900" dir="ltr">{indicators.length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <BarChart3 className="w-5 h-5 text-green-600" />
            <div className={`text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t('common.onTrack')}</div>
          </div>
          <div className="text-2xl font-bold text-green-600" dir="ltr">
            {indicators.filter(i => getProgress(i) >= 75).length}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <TrendingUp className="w-5 h-5 text-orange-600" />
            <div className={`text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t('common.atRisk')}</div>
          </div>
          <div className="text-2xl font-bold text-orange-600" dir="ltr">
            {indicators.filter(i => getProgress(i) < 50).length}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <PieChart className="w-5 h-5 text-purple-600" />
            <div className={`text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t('common.avgProgress')}</div>
          </div>
          <div className="text-2xl font-bold text-gray-900" dir="ltr">
            {indicators.length > 0 
              ? (indicators.reduce((sum, i) => sum + getProgress(i), 0) / indicators.length).toFixed(1)
              : 0}%
          </div>
        </div>
      </div>

      {/* Indicators Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.indicatorCode')}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.indicatorTitle')}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.indicatorType')}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.indicatorBaseline')}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.indicatorTarget')}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.indicatorAchieved')}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('common.progress')}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredIndicators.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    {t('projectDetail.noIndicatorsFound')}
                  </td>
                </tr>
              ) : (
                filteredIndicators.map((indicator) => {
                  const progress = getProgress(indicator);
                  return (
                    <tr key={indicator.id} className="hover:bg-gray-50">
                      <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">
                        {indicator.code}
                      </td>
                      <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className="font-medium text-gray-900">{indicator.title}</div>
                        <div className="text-xs text-gray-500">{indicator.unit}</div>
                      </td>
                      <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(indicator.type)}`}>
                          {getTypeLabel(indicator.type)}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">
                        {indicator.baseline}
                      </td>
                      <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">
                        {indicator.target}
                      </td>
                      <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">
                        <span className="font-medium text-blue-600">{indicator.achieved}</span>
                      </td>
                      <td className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[60px]" dir="ltr">
                            <div
                              className={`h-2 rounded-full transition-all ${getProgressColor(progress)}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 min-w-[45px]" dir="ltr">{progress.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <button
                            onClick={() => openDataCollectionModal(indicator)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title={t('common.collectData')}
                          >
                            <Database className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(indicator)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title={t('common.edit')}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteConfirm(indicator)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title={t('common.delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals - Simplified placeholders for now */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className={`sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-lg font-semibold text-gray-900">{t('projectDetail.addIndicator')}</h3>
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
              {/* Row 1: Code and Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('projectDetail.indicatorCode')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                    placeholder="IND-001"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('projectDetail.indicatorType')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as Indicator['type'] })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    <option value="Output">{t('projectDetail.indicatorTypeOutput')}</option>
                    <option value="Outcome">{t('projectDetail.indicatorTypeOutcome')}</option>
                    <option value="Impact">{t('projectDetail.indicatorTypeImpact')}</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Title */}
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('projectDetail.indicatorTitle')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  placeholder="Number of beneficiaries reached"
                />
              </div>

              {/* Row 3: Description */}
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('common.description')}
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
                    {t('projectDetail.indicatorUnit')} <span className="text-red-500">*</span>
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
                    {t('projectDetail.indicatorCategory')}
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as Indicator['category'] })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    <option value="Quantitative">{t('projectDetail.indicatorQuantitative')}</option>
                    <option value="Qualitative">{t('projectDetail.indicatorQualitative')}</option>
                  </select>
                </div>
              </div>

              {/* Row 5: Baseline, Target, Achieved */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('projectDetail.indicatorBaseline')}
                  </label>
                  <input
                    type="number"
                    value={formData.baseline}
                    onChange={(e) => setFormData({ ...formData, baseline: parseFloat(e.target.value) })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('projectDetail.indicatorTarget')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.target}
                    onChange={(e) => setFormData({ ...formData, target: parseFloat(e.target.value) })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('projectDetail.indicatorAchieved')}
                  </label>
                  <input
                    type="number"
                    value={formData.achieved}
                    onChange={(e) => setFormData({ ...formData, achieved: parseFloat(e.target.value) })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  />
                </div>
              </div>

              {/* Row 6: Reporting Frequency, Data Source, Responsible */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('projectDetail.reportingFrequency')}
                  </label>
                  <select
                    value={formData.reportingFrequency}
                    onChange={(e) => setFormData({ ...formData, reportingFrequency: e.target.value as Indicator['reportingFrequency'] })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    <option value="Monthly">{t('projectDetail.monthly')}</option>
                    <option value="Quarterly">{t('projectDetail.quarterly')}</option>
                    <option value="Semi-Annual">{t('projectDetail.semiAnnual')}</option>
                    <option value="Annual">{t('projectDetail.annual')}</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('projectDetail.dataSource')}
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
                    {t('projectDetail.responsible')}
                  </label>
                  <input
                    type="text"
                    value={formData.responsible}
                    onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                    placeholder="Staff Name"
                  />
                </div>
              </div>
            </div>

            <div className={`sticky bottom-0 bg-gray-50 px-6 py-4 flex gap-3 border-t border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
              >
                {t('common.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className={`text-lg font-semibold mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t('projectDetail.importActivities')}</h3>
            <input type="file" accept=".xlsx,.xls" onChange={handleImportExcel} className="w-full mb-4" />
            <button onClick={() => setShowImportModal(false)} className="px-4 py-2 border rounded">{t('common.cancel')}</button>
          </div>
        </div>
      )}

      {showDeleteConfirm && selectedIndicator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className={`text-lg font-semibold mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t('common.confirmDelete')}</h3>
            <p className={`text-gray-600 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('common.deleteConfirmMessage').replace('{item}', selectedIndicator.title)}
            </p>
            <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 border rounded">{t('common.cancel')}</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded">{t('common.delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}