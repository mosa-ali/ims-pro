import { useState, useEffect } from 'react';
import { 
  Plus, Download, Upload, Edit2, Trash2, X, Search, 
  AlertTriangle, Package, DollarSign, Calendar, Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { trpc } from '@/lib/trpc';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface ProcurementItem {
  id: string;
  projectId: string;
  activityCode: string;
  activityName: string;
  itemDescription: string;
  category: 'Goods' | 'Services' | 'Works';
  quantity: number;
  unitOfMeasure: string;
  estimatedUnitCost: number;
  estimatedTotalCost: number;
  budgetCode: string;
  budgetLine: string;
  approvedBudget: number;
  currency: string;
  procurementMethod: string;
  procurementType: 'One-time' | 'Framework' | 'Recurrent';
  plannedStartDate: string;
  plannedEndDate: string;
  responsibleDepartment: string;
  status: 'Planned' | 'Submitted' | 'Approved' | 'In Progress' | 'Completed' | 'Cancelled';
  notes: string;
}

interface ProcurementPlanTabProps {
  projectId: number;
}

export function ProcurementPlan({ projectId }: ProcurementPlanTabProps) {
  const { isRTL } = useLanguage();
  const { t } = useTranslation();

  // Helper function to safely format dates
  const formatDate = (date: any): string => {
    if (!date) return '';
    if (typeof date === 'string') return date;
    if (date instanceof Date) return date.toISOString().split('T')[0];
    return String(date);
  };

  // ✅ Load project data using tRPC
  const { data: project } = trpc.projects.getById.useQuery({ id: projectId });

  // ✅ Load activities using tRPC (auto-synced)
  const { data: activities = [] } = trpc.projectActivities.list.useQuery({ projectId });

  // ✅ Load procurement items from localStorage
  const loadProcurementItems = (): ProcurementItem[] => {
    const stored = localStorage.getItem('pms_procurement_plan');
    if (!stored) return [];
    const allItems = JSON.parse(stored);
    return allItems.filter((item: ProcurementItem) => item.projectId === projectId);
  };

  // ✅ Save procurement items to localStorage
  const saveProcurementItems = (items: ProcurementItem[]) => {
    const stored = localStorage.getItem('pms_procurement_plan');
    const allItems = stored ? JSON.parse(stored) : [];
    
    // Remove old items for this project
    const otherItems = allItems.filter((item: ProcurementItem) => item.projectId !== projectId);
    
    // Add new items
    localStorage.setItem('pms_procurement_plan', JSON.stringify([...otherItems, ...items]));
  };

  const [procurementItems, setProcurementItems] = useState<ProcurementItem[]>(loadProcurementItems);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ProcurementItem | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    activityCode: '',
    activityName: '',
    itemDescription: '',
    category: 'Goods' as ProcurementItem['category'],
    quantity: 1,
    unitOfMeasure: '',
    estimatedUnitCost: 0,
    budgetCode: '',
    budgetLine: '',
    approvedBudget: 0,
    currency: 'USD',
    procurementMethod: 'Direct Procurement',
    procurementType: 'One-time' as ProcurementItem['procurementType'],
    plannedStartDate: '',
    plannedEndDate: '',
    responsibleDepartment: 'Procurement',
    status: 'Planned' as ProcurementItem['status'],
    notes: ''
  });

  // Filter items
  const filteredItems = procurementItems.filter(item =>
    item.itemDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.activityCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.budgetCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate totals
  const totalEstimatedCost = procurementItems.reduce((sum, item) => sum + item.estimatedTotalCost, 0);
  const totalApprovedBudget = project?.totalBudget || 0;
  const remainingBudget = totalApprovedBudget - totalEstimatedCost;
  const budgetExceeded = remainingBudget < 0;

  // Auto-populate activity name when activity code changes
  useEffect(() => {
    if (formData.activityCode) {
      const activity = activities.find((a: any) => a.activityCode === formData.activityCode);
      if (activity) {
        setFormData(prev => ({
          ...prev,
          activityName: activity.activityTitle || activity.title || '',
          budgetLine: `Activity ${formData.activityCode}`,
          approvedBudget: activity.budget || 0,
          currency: project?.currency || 'USD'
        }));
      }
    }
  }, [formData.activityCode, activities, project]);

  // Calculate total cost when quantity or unit cost changes
  useEffect(() => {
    const total = formData.quantity * formData.estimatedUnitCost;
    setFormData(prev => ({
      ...prev,
      estimatedTotalCost: total
    }));
  }, [formData.quantity, formData.estimatedUnitCost]);

  // Export to Excel
  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(t.projectDetail.procurementPlanTitle);

    worksheet.columns = [
      { header: t.projectDetail.activityCode, key: 'activityCode', width: 15 },
      { header: t.projectDetail.activityTitle, key: 'activityName', width: 30 },
      { header: t.projectDetail.itemDescription, key: 'itemDescription', width: 40 },
      { header: t.projectDetail.procurementCategory, key: 'category', width: 15 },
      { header: t.projectDetail.quantityLabel, key: 'quantity', width: 12 },
      { header: t.projectDetail.unitOfMeasure, key: 'unitOfMeasure', width: 15 },
      { header: t.projectDetail.estimatedUnitCost, key: 'estimatedUnitCost', width: 18 },
      { header: t.projectDetail.estimatedTotalCost, key: 'estimatedTotalCost', width: 18 },
      { header: t.projectDetail.budgetCode, key: 'budgetCode', width: 15 },
      { header: t.projectDetail.procurementMethod, key: 'procurementMethod', width: 25 },
      { header: t.projectDetail.procurementType, key: 'procurementType', width: 18 },
      { header: t.projectDetail.plannedStartDate, key: 'plannedStartDate', width: 15 },
      { header: t.projectDetail.plannedEndDate, key: 'plannedEndDate', width: 15 },
      { header: t.projectDetail.responsibleDepartment, key: 'responsibleDepartment', width: 20 },
      { header: t.common.status, key: 'status', width: 15 },
      { header: t.common.notes, key: 'notes', width: 30 }
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' }
    };

    // Add data
    filteredItems.forEach(item => {
      worksheet.addRow(item);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    saveAs(blob, `Procurement_Plan_${project?.code || projectId}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export Empty Template
  const handleExportTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(t.projectDetail.procurementPlanTitle);

    worksheet.columns = [
      { header: `${t.projectDetail.activityCode}*`, key: 'activityCode', width: 15 },
      { header: `${t.projectDetail.itemDescription}*`, key: 'itemDescription', width: 40 },
      { header: `${t.projectDetail.procurementCategory}*`, key: 'category', width: 15 },
      { header: `${t.projectDetail.quantityLabel}*`, key: 'quantity', width: 12 },
      { header: `${t.projectDetail.unitOfMeasure}*`, key: 'unitOfMeasure', width: 15 },
      { header: `${t.projectDetail.estimatedUnitCost}*`, key: 'estimatedUnitCost', width: 18 },
      { header: t.projectDetail.budgetCode, key: 'budgetCode', width: 15 },
      { header: `${t.projectDetail.procurementMethod}*`, key: 'procurementMethod', width: 25 },
      { header: t.projectDetail.procurementType, key: 'procurementType', width: 18 },
      { header: `${t.projectDetail.plannedStartDate}*`, key: 'plannedStartDate', width: 15 },
      { header: `${t.projectDetail.plannedEndDate}*`, key: 'plannedEndDate', width: 15 },
      { header: t.projectDetail.responsibleDepartment, key: 'responsibleDepartment', width: 20 },
      { header: t.common.notes, key: 'notes', width: 30 }
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF059669' }
    };

    // Add example row
    worksheet.addRow({
      activityCode: 'ACT-001',
      itemDescription: 'Office Supplies',
      category: 'Goods',
      quantity: 100,
      unitOfMeasure: 'Units',
      estimatedUnitCost: 5.5,
      budgetCode: '6010',
      procurementMethod: 'Direct Procurement',
      procurementType: 'One-time',
      plannedStartDate: '2024-02-01',
      plannedEndDate: '2024-02-15',
      responsibleDepartment: 'Procurement',
      notes: 'Example procurement item'
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    saveAs(blob, 'Procurement_Plan_Template.xlsx');
  };

  // Import from Excel
  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const workbook = new ExcelJS.Workbook();
    const arrayBuffer = await file.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];
    const importedData: ProcurementItem[] = [];
    const errors: string[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const activityCode = row.getCell(1).value?.toString() || '';
      const itemDescription = row.getCell(2).value?.toString() || '';
      const category = row.getCell(3).value?.toString() || '';
      const quantity = parseFloat(row.getCell(4).value?.toString() || '0');
      const unitOfMeasure = row.getCell(5).value?.toString() || '';
      const estimatedUnitCost = parseFloat(row.getCell(6).value?.toString() || '0');
      const procurementMethod = row.getCell(8).value?.toString() || '';
      const plannedStartDate = row.getCell(10).value?.toString() || '';
      const plannedEndDate = row.getCell(11).value?.toString() || '';

      // Validation
      if (!activityCode) errors.push(`Row ${rowNumber}: Activity Code is required`);
      if (!itemDescription) errors.push(`Row ${rowNumber}: Item Description is required`);
      if (!category) errors.push(`Row ${rowNumber}: Category is required`);
      if (!quantity || quantity <= 0) errors.push(`Row ${rowNumber}: Valid Quantity is required`);
      if (!unitOfMeasure) errors.push(`Row ${rowNumber}: Unit of Measure is required`);
      if (!estimatedUnitCost || estimatedUnitCost <= 0) errors.push(`Row ${rowNumber}: Valid Unit Cost is required`);

      // Find matching activity
      const activity = activities.find((a: any) => a.activityCode === activityCode);
      if (!activity) {
        errors.push(`Row ${rowNumber}: Activity Code "${activityCode}" not found in project activities`);
      }

      const estimatedTotalCost = quantity * estimatedUnitCost;

      importedData.push({
        id: `proc-${Date.now()}-${rowNumber}`,
        projectId,
        activityCode,
        activityName: activity?.activityTitle || activity?.title || '',
        itemDescription,
        category: category as ProcurementItem['category'],
        quantity,
        unitOfMeasure,
        estimatedUnitCost,
        estimatedTotalCost,
        budgetCode: row.getCell(7).value?.toString() || '',
        budgetLine: `Activity ${activityCode}`,
        approvedBudget: activity?.budget || 0,
        currency: project?.currency || 'USD',
        procurementMethod: procurementMethod || 'Direct Procurement',
        procurementType: (row.getCell(9).value?.toString() || 'One-time') as ProcurementItem['procurementType'],
        plannedStartDate,
        plannedEndDate,
        responsibleDepartment: row.getCell(12).value?.toString() || 'Procurement',
        status: 'Planned',
        notes: row.getCell(13).value?.toString() || ''
      });
    });

    if (errors.length > 0) {
      alert(`Import errors:\n${errors.join('\n')}`);
      return;
    }

    const updated = [...procurementItems, ...importedData];
    setProcurementItems(updated);
    saveProcurementItems(updated);
    alert(`Successfully imported ${importedData.length} procurement items`);
    setShowImportModal(false);
  };

  // Create Item
  const handleCreate = () => {
    if (!formData.activityCode || !formData.itemDescription || !formData.quantity || 
        !formData.unitOfMeasure || !formData.estimatedUnitCost) {
      alert(t.projectDetail.fillRequiredFields);
      return;
    }

    const newItem: ProcurementItem = {
      id: `proc-${Date.now()}`,
      projectId,
      ...formData,
      estimatedTotalCost: formData.quantity * formData.estimatedUnitCost
    };

    const updated = [...procurementItems, newItem];
    setProcurementItems(updated);
    saveProcurementItems(updated);
    setShowCreateModal(false);
    resetForm();
    alert(t.common.createSuccess);
  };

  // Edit Item
  const handleEdit = () => {
    if (!selectedItem) return;

    const updated = procurementItems.map(item => 
      item.id === selectedItem.id 
        ? { 
            ...item, 
            ...formData,
            estimatedTotalCost: formData.quantity * formData.estimatedUnitCost
          } 
        : item
    );
    setProcurementItems(updated);
    saveProcurementItems(updated);
    setShowEditModal(false);
    setSelectedItem(null);
    resetForm();
    alert(t.common.updateSuccess);
  };

  // Delete Item
  const handleDelete = () => {
    if (!selectedItem) return;
    
    const updated = procurementItems.filter(item => item.id !== selectedItem.id);
    setProcurementItems(updated);
    saveProcurementItems(updated);
    setShowDeleteConfirm(false);
    setSelectedItem(null);
    alert(t.common.deleteSuccess);
  };

  const resetForm = () => {
    setFormData({
      activityCode: '',
      activityName: '',
      itemDescription: '',
      category: 'Goods',
      quantity: 1,
      unitOfMeasure: '',
      estimatedUnitCost: 0,
      budgetCode: '',
      budgetLine: '',
      approvedBudget: 0,
      currency: 'USD',
      procurementMethod: 'Direct Procurement',
      procurementType: 'One-time',
      plannedStartDate: '',
      plannedEndDate: '',
      responsibleDepartment: 'Procurement',
      status: 'Planned',
      notes: ''
    });
  };

  const openEditModal = (item: ProcurementItem) => {
    setSelectedItem(item);
    setFormData({
      activityCode: item.activityCode,
      activityName: item.activityName,
      itemDescription: item.itemDescription,
      category: item.category,
      quantity: item.quantity,
      unitOfMeasure: item.unitOfMeasure,
      estimatedUnitCost: item.estimatedUnitCost,
      budgetCode: item.budgetCode,
      budgetLine: item.budgetLine,
      approvedBudget: item.approvedBudget,
      currency: item.currency,
      procurementMethod: item.procurementMethod,
      procurementType: item.procurementType,
      plannedStartDate: item.plannedStartDate,
      plannedEndDate: item.plannedEndDate,
      responsibleDepartment: item.responsibleDepartment,
      status: item.status,
      notes: item.notes
    });
    setShowEditModal(true);
  };

  const openDeleteConfirm = (item: ProcurementItem) => {
    setSelectedItem(item);
    setShowDeleteConfirm(true);
  };

  const getStatusColor = (status: ProcurementItem['status']) => {
    switch (status) {
      case 'Planned': return 'bg-gray-100 text-gray-700';
      case 'Submitted': return 'bg-blue-100 text-blue-700';
      case 'Approved': return 'bg-green-100 text-green-700';
      case 'In Progress': return 'bg-yellow-100 text-yellow-700';
      case 'Completed': return 'bg-emerald-100 text-emerald-700';
      case 'Cancelled': return 'bg-red-100 text-red-700';
    }
  };

  const getCategoryColor = (category: ProcurementItem['category']) => {
    switch (category) {
      case 'Goods': return 'bg-blue-100 text-blue-700';
      case 'Services': return 'bg-purple-100 text-purple-700';
      case 'Works': return 'bg-orange-100 text-orange-700';
    }
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="space-y-6">
      {/* Header Section */}
      <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200 ${isRTL ? 'text-right' : 'text-left'}`}>
        <div className={`flex items-start justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-1">{t.projectDetail.procurementPlanTitle}</h2>
            <p className="text-xs text-gray-600">{t.projectDetail.procurementPlanSubtitle}</p>
            <div className={`flex items-center gap-4 mt-3 text-xs ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div>
                <span className="text-gray-600">{t.projectDetail.projectCode}: </span>
                <span className="font-medium" dir="ltr">{project?.code}</span>
              </div>
              <div>
                <span className="text-gray-600">{t.projectDetail.projectName}: </span>
                <span className="font-medium">{project?.title}</span>
              </div>
              {project && (
                <div>
                  <span className="text-gray-600">{t.projectDetail.procurementPlanPeriod}: </span>
                  <span className="font-medium" dir="ltr">{formatDate(project.startDate)} - {formatDate(project.endDate)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={filteredItems.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {t.finance.exportToExcel || "Export to Excel"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportTemplate}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {t.finance.exportTemplate || "Export Template"}
          </Button>
          <button
            onClick={() => setShowImportModal(true)}
            className={`px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Upload className="w-4 h-4" />
            {t.projectDetail.importActivities}
          </button>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className={`px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <Plus className="w-4 h-4" />
          {t.projectDetail.addProcurementItem}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 ${isRTL ? 'end-3' : 'start-3'}`} />
        <input
          type="text"
          placeholder={t.projectDetail.searchProcurementItems}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'pe-10 ps-4 text-right' : 'ps-10 pe-4 text-left'}`}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Package className="w-5 h-5 text-blue-600" />
            <div className={`text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t.projectDetail.totalProcurementItems}</div>
          </div>
          <div className="text-2xl font-bold text-gray-900" dir="ltr">{procurementItems.length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <DollarSign className="w-5 h-5 text-green-600" />
            <div className={`text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>{t.projectDetail.totalEstimatedCost}</div>
          </div>
          <div className="text-2xl font-bold text-gray-900" dir="ltr">
            ${totalEstimatedCost.toLocaleString()}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Calendar className="w-5 h-5 text-purple-600" />
            <div className={`text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>Approved Budget</div>
          </div>
          <div className="text-2xl font-bold text-gray-900" dir="ltr">
            ${totalApprovedBudget.toLocaleString()}
          </div>
        </div>
        <div className={`bg-white border rounded-lg p-4 ${budgetExceeded ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
          <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {budgetExceeded ? (
              <AlertTriangle className="w-5 h-5 text-red-600" />
            ) : (
              <DollarSign className="w-5 h-5 text-emerald-600" />
            )}
            <div className={`text-sm ${budgetExceeded ? 'text-red-700' : 'text-gray-600'} ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.projectDetail.remainingBudget}
            </div>
          </div>
          <div className={`text-2xl font-bold ${budgetExceeded ? 'text-red-600' : 'text-emerald-600'}`} dir="ltr">
            ${remainingBudget.toLocaleString()}
          </div>
          {budgetExceeded && (
            <div className={`text-xs text-red-600 mt-2 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.projectDetail.budgetExceededWarning}
            </div>
          )}
        </div>
      </div>

      {/* Procurement Items Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{t.projectDetail.activityCode}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{t.projectDetail.itemDescription}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{t.projectDetail.procurementCategory}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{t.projectDetail.quantityLabel}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{t.projectDetail.estimatedTotalCost}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{t.projectDetail.procurementMethod}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{t.projectDetail.plannedStartDate}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{t.common.status}</th>
                <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase ${isRTL ? 'text-right' : 'text-left'}`}>{t.common.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    {t.projectDetail.noProcurementItemsFound}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">
                      {item.activityCode}
                    </td>
                    <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      <div className="font-medium text-gray-900">{item.itemDescription}</div>
                      <div className="text-xs text-gray-500">
                        {item.quantity} {item.unitOfMeasure} × ${item.estimatedUnitCost}
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(item.category)}`}>
                        {item.category === 'Goods' ? t.projectDetail.categoryGoods :
                         item.category === 'Services' ? t.projectDetail.categoryServices :
                         t.projectDetail.categoryWorks}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">
                      {item.quantity}
                    </td>
                    <td className={`px-4 py-3 text-sm font-medium ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">
                      ${item.estimatedTotalCost.toLocaleString()}
                    </td>
                    <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      {item.procurementMethod}
                    </td>
                    <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">
                      {formatDate(item.plannedStartDate)}
                    </td>
                    <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title={t.common.edit}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteConfirm(item)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title={t.common.delete}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <ProcurementItemModal
          isRTL={isRTL}
          t={t}
          title={t.projectDetail.addProcurementItem}
          formData={formData}
          setFormData={setFormData}
          activities={activities}
          onClose={() => {
            setShowCreateModal(false);
            resetForm();
          }}
          onSubmit={handleCreate}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <ProcurementItemModal
          isRTL={isRTL}
          t={t}
          title={t.projectDetail.editProcurementItem}
          formData={formData}
          setFormData={setFormData}
          activities={activities}
          onClose={() => {
            setShowEditModal(false);
            setSelectedItem(null);
            resetForm();
          }}
          onSubmit={handleEdit}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className={`text-lg font-semibold mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t.common.confirmDelete}</h3>
            <p className={`text-gray-600 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.common.deleteConfirmMessage.replace('{item}', selectedItem.itemDescription)}
            </p>
            <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 border rounded">{t.common.cancel}</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded">{t.common.delete}</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className={`text-lg font-semibold mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t.projectDetail.importActivities}</h3>
            <input type="file" accept=".xlsx,.xls" onChange={handleImportExcel} className="w-full mb-4" />
            <button onClick={() => setShowImportModal(false)} className="px-4 py-2 border rounded">{t.common.cancel}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Procurement Item Modal Component
interface ProcurementItemModalProps {
  isRTL: boolean;
  t: any;
  title: string;
  formData: any;
  setFormData: (data: any) => void;
  activities: any[];
  onClose: () => void;
  onSubmit: () => void;
}

function ProcurementItemModal({ 
  isRTL, 
  t, 
  title, 
  formData, 
  setFormData, 
  activities,
  onClose, 
  onSubmit 
}: ProcurementItemModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className={`sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Row 1: Activity Code (Dropdown) */}
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.projectDetail.activityCode} <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.activityCode}
              onChange={(e) => setFormData({ ...formData, activityCode: e.target.value })}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
            >
              <option value="">-- Select Activity --</option>
              {activities.map((activity: any) => (
                <option key={activity.id} value={activity.activityCode}>
                  {activity.activityCode} - {activity.activityTitle || activity.title}
                </option>
              ))}
            </select>
          </div>

          {/* Row 2: Activity Name (Read-only) */}
          {formData.activityName && (
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.projectDetail.activityTitle}
              </label>
              <input
                type="text"
                value={formData.activityName}
                readOnly
                className={`w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-md ${isRTL ? 'text-right' : 'text-left'}`}
              />
            </div>
          )}

          {/* Row 3: Item Description */}
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.projectDetail.itemDescription} <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.itemDescription}
              onChange={(e) => setFormData({ ...formData, itemDescription: e.target.value })}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
              rows={2}
              placeholder="Describe the item or service to be procured"
            />
          </div>

          {/* Row 4: Category and Procurement Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.projectDetail.procurementCategory} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                <option value="Goods">{t.projectDetail.categoryGoods}</option>
                <option value="Services">{t.projectDetail.categoryServices}</option>
                <option value="Works">{t.projectDetail.categoryWorks}</option>
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.projectDetail.procurementType}
              </label>
              <select
                value={formData.procurementType}
                onChange={(e) => setFormData({ ...formData, procurementType: e.target.value })}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                <option value="One-time">{t.projectDetail.typeOneTime}</option>
                <option value="Framework">{t.projectDetail.typeFramework}</option>
                <option value="Recurrent">{t.projectDetail.typeRecurrent}</option>
              </select>
            </div>
          </div>

          {/* Row 5: Quantity, Unit, Unit Cost */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.projectDetail.quantityLabel} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.projectDetail.unitOfMeasure} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.unitOfMeasure}
                onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
                placeholder="Units, Kg, Hours, etc."
              />
            </div>
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.projectDetail.estimatedUnitCost} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.estimatedUnitCost}
                onChange={(e) => setFormData({ ...formData, estimatedUnitCost: parseFloat(e.target.value) || 0 })}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
              />
            </div>
          </div>

          {/* Row 6: Total Cost (Calculated, Read-only) */}
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.projectDetail.estimatedTotalCost}
            </label>
            <div className={`w-full px-3 py-2 border border-gray-200 bg-blue-50 rounded-md text-blue-700 font-semibold ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">
              ${(formData.quantity * formData.estimatedUnitCost).toLocaleString()}
            </div>
          </div>

          {/* Row 7: Procurement Method */}
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.projectDetail.procurementMethod} <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.procurementMethod}
              onChange={(e) => setFormData({ ...formData, procurementMethod: e.target.value })}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
            >
              <option value="Direct Procurement">{t.projectDetail.methodDirectProcurement}</option>
              <option value="Request for Quotation (RFQ)">{t.projectDetail.methodRFQ}</option>
              <option value="National Competitive Bidding">{t.projectDetail.methodNationalBidding}</option>
              <option value="International Competitive Bidding">{t.projectDetail.methodInternationalBidding}</option>
              <option value="Long-Term Agreement (LTA)">{t.projectDetail.methodLTA}</option>
              <option value="Emergency Procurement">{t.projectDetail.methodEmergency}</option>
            </select>
          </div>

          {/* Row 8: Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.projectDetail.plannedStartDate} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.plannedStartDate}
                onChange={(e) => setFormData({ ...formData, plannedStartDate: e.target.value })}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.projectDetail.plannedEndDate} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.plannedEndDate}
                onChange={(e) => setFormData({ ...formData, plannedEndDate: e.target.value })}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
              />
            </div>
          </div>

          {/* Row 9: Department and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.projectDetail.responsibleDepartment}
              </label>
              <select
                value={formData.responsibleDepartment}
                onChange={(e) => setFormData({ ...formData, responsibleDepartment: e.target.value })}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                <option value="Program">{t.projectDetail.deptProgram}</option>
                <option value="Logistics">{t.projectDetail.deptLogistics}</option>
                <option value="Procurement">{t.projectDetail.deptProcurement}</option>
                <option value="Finance">{t.projectDetail.deptFinance}</option>
                <option value="MEAL">{t.projectDetail.deptMEAL}</option>
                <option value="Other">{t.projectDetail.deptOther}</option>
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t.common.status}
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
              >
                <option value="Planned">{t.projectDetail.statusPlanned}</option>
                <option value="Submitted">{t.projectDetail.statusSubmitted}</option>
                <option value="Approved">{t.projectDetail.statusApproved}</option>
                <option value="In Progress">{t.projectDetail.statusInProgress}</option>
                <option value="Completed">{t.projectDetail.statusCompleted}</option>
                <option value="Cancelled">{t.projectDetail.statusCancelled}</option>
              </select>
            </div>
          </div>

          {/* Row 10: Budget Code (optional) */}
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.projectDetail.budgetCode}
            </label>
            <input
              type="text"
              value={formData.budgetCode}
              onChange={(e) => setFormData({ ...formData, budgetCode: e.target.value })}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
              placeholder="e.g., 6010"
            />
          </div>

          {/* Row 11: Notes */}
          <div>
            <label className={`block text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t.common.notes}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 ${isRTL ? 'text-right' : 'text-left'}`}
              rows={2}
              placeholder="Additional notes or specifications"
            />
          </div>
        </div>

        <div className={`sticky bottom-0 bg-gray-50 px-6 py-4 flex gap-3 border-t border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
            {t.common.cancel}
          </button>
          <button onClick={onSubmit} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90">
            {t.common.save}
          </button>
        </div>
      </div>
    </div>
  );
}
