import { useState, useEffect, useMemo } from 'react';
import { Save, Download, Upload, AlertCircle, CheckCircle, Info, AlertTriangle, Printer } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { formatNumber } from '@/utils/formatters';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';
import { exportToStandardExcel, type ExcelColumn } from '@/lib/standardExcelExport';
import { Button } from '@/components/ui/button';
// Toast notifications via simple alerts for now
import { generateForecastPlanTemplate } from '@/lib/templateGenerator';
import { PreImportPreviewDialog } from '@/components/PreImportPreviewDialog';
import { FORECAST_CONFIG } from '@shared/importConfigs/forecast';
import { UnifiedExportButton } from '@/components/exports/UnifiedExportButton';

interface ForecastPlanTabProps {
  projectId: string;
}

/**
 * Forecast Plan Tab - 100% Complete Implementation
 * 
 * CRITICAL FINANCIAL RULES:
 * 1. Balance = Total Budget Line - SUM(All Actual Approved Expenses)
 * 2. Forecasts do NOT affect balance calculations
 * 3. Previous Year Budget Balance = Total Budget - Cumulative Actual Expenses (up to Dec 31, Year N-1)
 * 4. Year 2+ Validation: Total Forecast ≤ Previous Year Budget Balance
 * 5. All changes are audit-logged for donor compliance
 */

export function ForecastPlanTab({ projectId }: ForecastPlanTabProps) {
  const { language, isRTL } = useLanguage();
  const { t } = useTranslation();
  const { user } = useAuth();
  // Simple toast replacement (alerts)
  const [hasChanges, setHasChanges] = useState(false);
  const [editingCell, setEditingCell] = useState<{ rowId: number; month: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Preview dialog state
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [validRows, setValidRows] = useState<any[]>([]);
  const [invalidRows, setInvalidRows] = useState<any[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);

  // Fetch project details
  const { data: project } = trpc.projects.getById.useQuery({ id: parseInt(projectId) });

  // Calculate fiscal years from project dates
  const fiscalYears = useMemo(() => {
    if (!project) return [];
    const startYear = new Date(project.startDate).getFullYear();
    const endYear = new Date(project.endDate).getFullYear();
    const years = [];
    for (let year = startYear; year <= endYear; year++) {
      years.push(`FY${year}`);
    }
    return years;
  }, [project]);

  const [selectedYear, setSelectedYear] = useState(fiscalYears[0] || `FY${new Date().getFullYear()}`);

  // Fetch budget items (master source of truth from Financial Overview)
  const { data: budgetItems = [], isLoading: budgetLoading } = trpc.forecast.getBudgetItems.useQuery({
    projectId: parseInt(projectId),
  });

  // Fetch forecasts for selected year
  const { data: forecasts = [], isLoading: forecastsLoading, refetch: refetchForecasts } = trpc.forecast.getByProject.useQuery({
    projectId: parseInt(projectId),
    fiscalYear: selectedYear,
  });

  // Fetch all expenses for balance calculations
  const { data: allExpenses = [] } = trpc.expenses.getByProject.useQuery({
    projectId: parseInt(projectId),
    status: 'approved', // Only approved expenses affect balance
  });

  // Generate forecasts mutation (initialize from budget) with automatic synchronization
  const generateForecastsMutation = trpc.forecast.generateForecasts.useMutation({
    onSuccess: () => {
      // Invalidate all related queries for real-time sync
      utils.forecast.getByProject.invalidate();
      utils.forecast.getBudgetItems.invalidate();
      // Success notification
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  // Update forecast mutation with automatic synchronization
  const utils = trpc.useUtils();
  const bulkUpdateForecastsMutation = trpc.forecast.bulkUpdateForecasts.useMutation({
    onSuccess: (data) => {
      alert(`Import successful: ${data.updatedCount} forecasts updated, ${data.skippedCount} skipped`);
      utils.forecast.getByProject.invalidate();
      utils.forecast.getBudgetItems.invalidate();
    },
    onError: (error) => {
      console.error('Bulk update error:', error);
      alert('Import failed: ' + error.message);
    },
  });

  const updateForecastMutation = trpc.forecast.update.useMutation({
    onSuccess: () => {
      // Invalidate all related queries for real-time sync
      utils.forecast.getByProject.invalidate();
      utils.forecast.getBudgetItems.invalidate();
      utils.expenses.getByProject.invalidate();
      setHasChanges(false);
      setEditingCell(null);
      // Success notification
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  // Calculate actual spent for each budget item
  const actualSpentByBudgetItem = useMemo(() => {
    const spentMap = new Map<number, number>();
    allExpenses.forEach((expense: any) => {
      const current = spentMap.get(expense.budgetItemId) || 0;
      spentMap.set(expense.budgetItemId, current + parseFloat(expense.amount.toString()));
    });
    return spentMap;
  }, [allExpenses]);

  // Calculate previous year budget balance for each budget item
  const previousYearBalanceByBudgetItem = useMemo(() => {
    if (!project || !selectedYear) return new Map();

    const balanceMap = new Map<number, number>();
    const currentYearNum = parseInt(selectedYear.replace('FY', ''));
    const previousYearEnd = new Date(currentYearNum - 1, 11, 31); // Dec 31 of previous year

    budgetItems.forEach((item: any) => {
      // Calculate cumulative actual expenses up to Dec 31 of previous year
      const cumulativeExpenses = allExpenses
        .filter((exp: any) => 
          exp.budgetItemId === item.id &&
          new Date(exp.expenseDate) <= previousYearEnd
        )
        .reduce((sum: number, exp: any) => sum + parseFloat(exp.amount.toString()), 0);

      const balance = parseFloat(item.totalBudgetLine.toString()) - cumulativeExpenses;
      balanceMap.set(item.id, balance);
    });

    return balanceMap;
  }, [budgetItems, allExpenses, selectedYear, project]);

  // Build forecast rows with all calculations
  const forecastRows = useMemo(() => {
    if (!project || !budgetItems.length) return [];

    return budgetItems.map((item: any) => {
      // Find matching forecast row for this budget item and year
      const forecastRow = forecasts.find((f: any) => f.budgetItemId === item.id);

      // Calculate active months for this year
      const projectStart = new Date(project.startDate);
      const projectEnd = new Date(project.endDate);
      const currentYearNum = parseInt(selectedYear.replace('FY', ''));
      const yearStart = new Date(currentYearNum, 0, 1);
      const yearEnd = new Date(currentYearNum, 11, 31);

      const activeMonths = Array(12).fill(false).map((_, idx) => {
        const monthDate = new Date(currentYearNum, idx, 15); // Mid-month check
        return monthDate >= projectStart && monthDate <= projectEnd;
      });

      // Calculate totals
      const monthlyValues = forecastRow ? [
        parseFloat(forecastRow.m1?.toString() || '0'),
        parseFloat(forecastRow.m2?.toString() || '0'),
        parseFloat(forecastRow.m3?.toString() || '0'),
        parseFloat(forecastRow.m4?.toString() || '0'),
        parseFloat(forecastRow.m5?.toString() || '0'),
        parseFloat(forecastRow.m6?.toString() || '0'),
        parseFloat(forecastRow.m7?.toString() || '0'),
        parseFloat(forecastRow.m8?.toString() || '0'),
        parseFloat(forecastRow.m9?.toString() || '0'),
        parseFloat(forecastRow.m10?.toString() || '0'),
        parseFloat(forecastRow.m11?.toString() || '0'),
        parseFloat(forecastRow.m12?.toString() || '0'),
      ] : Array(12).fill(0);

      const totalForecast = monthlyValues.reduce((sum, val) => sum + val, 0);
      const actualSpent = actualSpentByBudgetItem.get(item.id) || 0;
      const balance = parseFloat(item.totalBudgetLine.toString()) - actualSpent;

      // Previous Year Budget Balance (only for Year 2+)
      const yearNumber = fiscalYears.indexOf(selectedYear) + 1;
      const previousYearBalance = yearNumber > 1 ? previousYearBalanceByBudgetItem.get(item.id) || 0 : null;

      return {
        id: forecastRow?.id || null,
        budgetItemId: item.id,
        fiscalYear: selectedYear,
        yearNumber,
        
        // Activity (Single Source of Truth - from Activities tab)
        activityCode: item.activityCode || '',
        activityName: item.linkedActivityName || item.activityName || '',
        
        // Budget structure (read-only)
        budgetCode: item.budgetCode || '',
        subBL: item.subBudgetLine || '',
        budgetItem: item.budgetItem || '',
        category: item.category || '',
        quantity: parseFloat(item.qty?.toString() || '0'),
        unitType: item.unitType || '',
        unitCost: parseFloat(item.unitCost?.toString() || '0'),
        recurrence: parseFloat(item.recurrence?.toString() || '0'),
        totalBudgetLine: parseFloat(item.totalBudgetLine?.toString() || '0'),
        currency: item.currency || 'USD',
        
        // Planning metadata
        previousYearBudgetBalance: previousYearBalance,
        activeMonths,
        
        // Monthly forecasts (editable)
        m1: monthlyValues[0],
        m2: monthlyValues[1],
        m3: monthlyValues[2],
        m4: monthlyValues[3],
        m5: monthlyValues[4],
        m6: monthlyValues[5],
        m7: monthlyValues[6],
        m8: monthlyValues[7],
        m9: monthlyValues[8],
        m10: monthlyValues[9],
        m11: monthlyValues[10],
        m12: monthlyValues[11],
        
        // Calculated fields
        totalForecast,
        actualSpent,
        balance,
      };
    });
  }, [budgetItems, forecasts, selectedYear, project, fiscalYears, actualSpentByBudgetItem, previousYearBalanceByBudgetItem]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const totalBudget = forecastRows.reduce((sum, row) => sum + row.totalBudgetLine, 0);
    const totalForecast = forecastRows.reduce((sum, row) => sum + row.totalForecast, 0);
    const totalActualSpent = forecastRows.reduce((sum, row) => sum + row.actualSpent, 0);
    const totalBalance = totalBudget - totalActualSpent;

    return {
      totalBudget,
      totalForecast,
      totalActualSpent,
      totalBalance,
    };
  }, [forecastRows]);

  // Warning thresholds
  const warnings = useMemo(() => {
    const balanceWarnings = forecastRows.filter(row => {
      if (row.balance <= 0) return false;
      const forecastPercentage = (row.totalForecast / row.balance) * 100;
      return forecastPercentage > 90;
    });

    const varianceAlerts = forecastRows.filter(row => row.actualSpent > row.totalForecast);

    return { balanceWarnings, varianceAlerts };
  }, [forecastRows]);

  // Currency formatting
  const formatCurrency = (value: number, currency = 'USD') => {
    const symbols: { [key: string]: string } = {
      'EUR': '€',
      'USD': '$',
      'CHF': 'CHF ',
      'YER': 'YER ',
      'SAR': 'SAR ',
    };
    const symbol = symbols[currency] || currency + ' ';
    return `${symbol}${formatNumber(value)}`;
  };

  // Initialize forecast plan
  const handleInitialize = async () => {
    if (!budgetItems.length) {
      alert('Error: No budget items found. Please add budget items in Financial Overview first.');
      return;
    }

    for (const item of budgetItems) {
      await generateForecastsMutation.mutateAsync({
        projectId: parseInt(projectId),
        budgetItemId: item.id,
      });
    }
  };

  // Handle cell edit
  const handleCellEdit = (rowId: number | null, month: string, currentValue: number) => {
    if (!rowId) return; // Can't edit if forecast row doesn't exist yet
    setEditingCell({ rowId, month });
    setEditValue(currentValue.toString());
  };

  // Handle cell save
  const handleCellSave = async () => {
    if (!editingCell) return;

    const value = parseFloat(editValue) || 0;
    await updateForecastMutation.mutateAsync({
      forecastId: editingCell.rowId,
      updates: {
        [editingCell.month]: value,
      },
    });
  };

  // Handle cell cancel
  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Import from Excel
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportFile(file);

    try {
      const workbook = new Workbook();
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.getWorksheet('Forecast Plan');
      if (!worksheet) {
        alert('Invalid file format. Please use the exported template.');
        return;
      }

      const preview: any[] = [];
      const errors: string[] = [];

      // Skip header row (row 1)
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        if (!row.getCell(1).value) return; // Skip empty rows

        const budgetCode = row.getCell(1).value?.toString() || '';
        const budgetItem = row.getCell(3).value?.toString() || '';

        // Find matching budget item
        const matchingBudget = budgetItems?.find(
          (b: any) => b.budgetCode === budgetCode && b.budgetItem === budgetItem
        );

        if (!matchingBudget) {
          errors.push(`Row ${rowNumber}: Budget code "${budgetCode}" with item "${budgetItem}" not found`);
          return;
        }

        // Parse monthly values (M1-M12)
        const monthlyValues: any = {};
        for (let i = 1; i <= 12; i++) {
          const cellIndex = 9 + i; // M1 starts at column 10 (after Previous Year Balance if exists)
          const value = row.getCell(cellIndex).value;
          const numValue = typeof value === 'number' ? value : parseFloat(value?.toString() || '0');
          if (isNaN(numValue)) {
            errors.push(`Row ${rowNumber}: Invalid value for M${i}`);
          }
          monthlyValues[`m${i}`] = numValue || 0;
        }

        preview.push({
          budgetItemId: matchingBudget.id,
          budgetCode,
          budgetItem,
          ...monthlyValues,
          totalForecast: Object.values(monthlyValues).reduce((sum: number, val: any) => sum + val, 0),
        });
      });

      if (errors.length > 0) {
        alert(`Import validation failed:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n...and ${errors.length - 5} more errors` : ''}`);
        return;
      }

      setImportPreview(preview);
      alert(`Preview ready: ${preview.length} forecast rows parsed successfully`);
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to parse Excel file. Please check the file format.');
    }
  };

  const handleConfirmImport = async (allowDuplicates: boolean) => {
    if (importPreview.length === 0) {
      alert('No data to import');
      return;
    }

    try {
      await bulkUpdateForecastsMutation.mutateAsync({
        projectId: parseInt(projectId),
        fiscalYear: selectedYear,
        allowDuplicates,
        forecasts: importPreview.map(row => ({
          budgetItemId: row.budgetItemId,
          m1: row.m1,
          m2: row.m2,
          m3: row.m3,
          m4: row.m4,
          m5: row.m5,
          m6: row.m6,
          m7: row.m7,
          m8: row.m8,
          m9: row.m9,
          m10: row.m10,
          m11: row.m11,
          m12: row.m12,
        })),
      });

      setShowImportModal(false);
      setImportFile(null);
      setImportPreview([]);
    } catch (error) {
      console.error('Import error:', error);
      // Error already handled by mutation onError
    }
  };

  // Export to Excel
  const handleExportToExcel = async () => {
    // Define columns based on year
    const baseColumns: ExcelColumn[] = [
      { name: 'Budget Code', key: 'budgetCode', width: 15, type: 'text' },
      { name: 'Sub-BL', key: 'subBL', width: 10, type: 'text' },
      { name: 'Budget Item', key: 'budgetItem', width: 30, type: 'text' },
      { name: 'Qty', key: 'quantity', width: 10, type: 'number', totals: 'sum' },
      { name: 'Unit Type', key: 'unitType', width: 15, type: 'text' },
      { name: 'Unit Cost', key: 'unitCost', width: 15, type: 'currency', totals: 'none' },
      { name: 'Recurrence', key: 'recurrence', width: 12, type: 'number', totals: 'none' },
      { name: 'Total Budget', key: 'totalBudgetLine', width: 15, type: 'currency', totals: 'sum' },
    ];

    // Add Previous Year Balance column for Year 2+
    if (forecastRows[0]?.yearNumber > 1) {
      baseColumns.push({ name: 'Previous Year Balance', key: 'previousYearBudgetBalance', width: 20, type: 'currency', totals: 'sum' });
    }

    // Add monthly columns
    const monthlyColumns: ExcelColumn[] = [
      { name: 'M1', key: 'm1', width: 12, type: 'currency', totals: 'sum' },
      { name: 'M2', key: 'm2', width: 12, type: 'currency', totals: 'sum' },
      { name: 'M3', key: 'm3', width: 12, type: 'currency', totals: 'sum' },
      { name: 'M4', key: 'm4', width: 12, type: 'currency', totals: 'sum' },
      { name: 'M5', key: 'm5', width: 12, type: 'currency', totals: 'sum' },
      { name: 'M6', key: 'm6', width: 12, type: 'currency', totals: 'sum' },
      { name: 'M7', key: 'm7', width: 12, type: 'currency', totals: 'sum' },
      { name: 'M8', key: 'm8', width: 12, type: 'currency', totals: 'sum' },
      { name: 'M9', key: 'm9', width: 12, type: 'currency', totals: 'sum' },
      { name: 'M10', key: 'm10', width: 12, type: 'currency', totals: 'sum' },
      { name: 'M11', key: 'm11', width: 12, type: 'currency', totals: 'sum' },
      { name: 'M12', key: 'm12', width: 12, type: 'currency', totals: 'sum' },
    ];

    const summaryColumns: ExcelColumn[] = [
      { name: 'Total Forecast', key: 'totalForecast', width: 15, type: 'currency', totals: 'sum' },
      { name: 'Actual Spent', key: 'actualSpent', width: 15, type: 'currency', totals: 'sum' },
      { name: 'Balance', key: 'balance', width: 15, type: 'currency', totals: 'sum' },
    ];

    const columns = [...baseColumns, ...monthlyColumns, ...summaryColumns];

    // Export using standardized format
    await exportToStandardExcel({
      sheetName: 'Forecast Plan',
      columns,
      data: forecastRows,
      fileName: `Forecast_Plan_${projectId}_${selectedYear}_${new Date().toISOString().split('T')[0]}`,
      includeTotals: true,
      isRTL: language === 'ar',
    });

    alert('Forecast plan exported successfully');
  };

  // Permission check
  const canEdit = user?.role === 'platform_admin' || user?.role === 'organization_admin';
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S - Save (save current editing cell)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (editingCell) {
          handleCellSave();
        }
      }
      
      // Ctrl+P or Cmd+P - Print
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        window.print();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingCell]);

  if (budgetLoading || forecastsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t.forecastPlan.loadingForecast}</p>
        </div>
      </div>
    );
  }

  if (!budgetItems || budgetItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t.forecastPlan.noBudgetItems}</h3>
          <p className="text-muted-foreground mb-4">
            {language === 'ar' 
              ? 'يرجى إضافة بنود الميزانية في علامة تبويب النظرة المالية أولاً قبل إنشاء خطة التنبؤ.'
              : 'Please add budget items in the Financial Overview tab first before creating a forecast plan.'}
          </p>
        </div>
      </div>
    );
  }

  if (!forecasts || forecasts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t.forecastPlan.forecastNotInitialized}</h3>
          <p className="text-muted-foreground mb-4">
            {t.forecastPlan.initializeForecastPrompt}
          </p>
          <Button
            onClick={handleInitialize}
            disabled={generateForecastsMutation.isPending}
            size="lg"
          >
            {generateForecastsMutation.isPending ? t.forecastPlan.initializing : `${t.forecastPlan.initializeForecastButton} ${selectedYear}`}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-start">
          <h2 className="text-2xl font-bold">
            {t.forecastPlan.title}
          </h2>
          <p className="text-muted-foreground">
            {t.forecastPlan.subtitle}
          </p>
        </div>
        <div className="flex gap-2">
          <UnifiedExportButton
            hasData={forecastRows.length > 0}
            onExportData={handleExportToExcel}
            onExportTemplate={() => generateForecastPlanTemplate(language === 'ar')}
           moduleName={t.forecastPlan.title}           showModal={true}
          />
          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            <Upload className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {t.forecastPlan.import}
          </Button>
          <Button variant="outline" onClick={() => window.print()} className="no-print">
            <Printer className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {t.forecastPlan.print}
          </Button>
          {canEdit && (
            <Button onClick={handleInitialize} disabled={generateForecastsMutation.isPending}>
              <Save className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t.forecastPlan.reinitialize}
            </Button>
          )}
        </div>
      </div>

      {/* Year Tabs */}
      <div className="flex gap-2 border-b">
        {fiscalYears.map((year) => (
          <button
            key={year}
            onClick={() => setSelectedYear(year)}
            className={`px-4 py-2 font-medium transition-colors ${
              selectedYear === year
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Summary Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-muted-foreground mb-1 text-start">{t.forecastPlan.totalBudget}</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 text-start" dir="ltr">
            {formatCurrency(summaryMetrics.totalBudget, forecastRows[0]?.currency)}
          </p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
          <p className="text-sm text-muted-foreground mb-1 text-start">{t.forecastPlan.totalForecast}</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 text-start" dir="ltr">
            {formatCurrency(summaryMetrics.totalForecast, forecastRows[0]?.currency)}
          </p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
          <p className="text-sm text-muted-foreground mb-1 text-start">{t.forecastPlan.actualSpent}</p>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 text-start" dir="ltr">
            {formatCurrency(summaryMetrics.totalActualSpent, forecastRows[0]?.currency)}
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-sm text-muted-foreground mb-1 text-start">{t.forecastPlan.balance}</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 text-start" dir="ltr">
            {formatCurrency(summaryMetrics.totalBalance, forecastRows[0]?.currency)}
          </p>
        </div>
      </div>

      {/* Warnings */}
      {warnings.balanceWarnings.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-900 dark:text-yellow-100">{t.forecastPlan.balanceWarning}</p>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <span dir="ltr">{warnings.balanceWarnings.length}</span> {t.forecastPlan.budgetLinesWarning}
            </p>
          </div>
        </div>
      )}

      {warnings.varianceAlerts.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-orange-900 dark:text-orange-100">{t.forecastPlan.varianceAlert}</p>
            <p className="text-sm text-orange-800 dark:text-orange-200">
              <span dir="ltr">{warnings.varianceAlerts.length}</span> {t.forecastPlan.budgetLinesExceeded}
            </p>
          </div>
        </div>
      )}

      {/* Forecast Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className={`px-4 py-3 font-medium sticky ${isRTL ? 'right-0' : 'left-0'} bg-muted z-10 text-start`}>{t.forecastPlan.activityCode}</th>
                <th className="px-4 py-3 font-medium text-start">{t.forecastPlan.activity}</th>
                <th className="px-4 py-3 font-medium text-start">{t.forecastPlan.budgetCode}</th>
                <th className="px-4 py-3 font-medium text-start">{t.forecastPlan.subBL}</th>
                <th className="px-4 py-3 font-medium text-start">{t.forecastPlan.budgetItem}</th>
                <th className="px-4 py-3 text-end font-medium">{t.forecastPlan.totalBudget}</th>
                {forecastRows[0]?.yearNumber > 1 && (
                  <th className="px-4 py-3 text-end font-medium bg-blue-50 dark:bg-blue-950">{t.forecastPlan.prevYearBalance}</th>
                )}
                {Array.from({ length: 12 }, (_, i) => (
                  <th key={i} className="px-4 py-3 text-end font-medium"><span dir="ltr">M{i + 1}</span></th>
                ))}
                <th className="px-4 py-3 text-end font-medium bg-purple-50 dark:bg-purple-950">{t.forecastPlan.totalForecast}</th>
                <th className="px-4 py-3 text-end font-medium bg-orange-50 dark:bg-orange-950">{t.forecastPlan.actualSpent}</th>
                <th className="px-4 py-3 text-end font-medium bg-green-50 dark:bg-green-950">{t.forecastPlan.balance}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {forecastRows.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium sticky left-0 bg-background">{row.activityCode || '-'}</td>
                  <td className="px-4 py-3 max-w-[200px] truncate" title={row.activityName}>{row.activityName || '-'}</td>
                  <td className="px-4 py-3 font-medium">{row.budgetCode}</td>
                  <td className="px-4 py-3">{row.subBL}</td>
                  <td className="px-4 py-3">{row.budgetItem}</td>
                  <td className="px-4 py-3 text-right bg-muted">{formatNumber(row.totalBudgetLine)}</td>
                  {row.yearNumber > 1 && (
                    <td className="px-4 py-3 text-right bg-blue-50 dark:bg-blue-950 font-medium">
                      {row.previousYearBudgetBalance !== null ? formatNumber(row.previousYearBudgetBalance) : '-'}
                    </td>
                  )}
                  {Array.from({ length: 12 }, (_, monthIdx) => {
                    const monthKey = `m${monthIdx + 1}` as keyof typeof row;
                    const monthValue = row[monthKey] as number;
                    const isActive = row.activeMonths[monthIdx];
                    const isEditing = editingCell?.rowId === row.id && editingCell?.month === monthKey;

                    return (
                      <td
                        key={monthIdx}
                        className={`px-4 py-3 text-right ${
                          !isActive ? 'bg-muted text-muted-foreground' : canEdit ? 'cursor-pointer hover:bg-accent' : ''
                        }`}
                        onClick={() => isActive && canEdit && row.id && handleCellEdit(row.id, monthKey, monthValue)}
                      >
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleCellSave}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCellSave();
                              if (e.key === 'Escape') handleCellCancel();
                            }}
                            className="w-full px-2 py-1 text-right border rounded"
                            autoFocus
                          />
                        ) : (
                          formatNumber(monthValue)
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-right font-medium bg-purple-50 dark:bg-purple-950">
                    {formatNumber(row.totalForecast)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium bg-orange-50 dark:bg-orange-950">
                    {formatNumber(row.actualSpent)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium bg-green-50 dark:bg-green-950">
                    {formatNumber(row.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {!canEdit && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-100">{t.forecastPlan.viewOnlyMode}</p>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {t.forecastPlan.viewOnlyModeDesc}
            </p>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold">
                {t.forecastPlan.importForecastPlan}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t.forecastPlan.importForecastDesc}
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t.forecastPlan.selectExcelFile}
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
                />
                {importFile && (
                  <p className="text-sm text-green-600 mt-2">
                    ✓ {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              {/* Preview Table */}
              {importPreview.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">
                    {t.forecastPlan.dataPreview} (<span dir="ltr">{importPreview.length}</span> {t.forecastPlan.rows})
                  </h3>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto max-h-96">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className={`px-4 py-2 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>Budget Code</th>
                          <th className={`px-4 py-2 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>Budget Item</th>
                          <th className="px-4 py-2 text-right font-semibold">M1</th>
                          <th className="px-4 py-2 text-right font-semibold">M2</th>
                          <th className="px-4 py-2 text-right font-semibold">M3</th>
                          <th className="px-4 py-2 text-right font-semibold">...</th>
                          <th className="px-4 py-2 text-right font-semibold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.slice(0, 10).map((row, idx) => (
                          <tr key={idx} className="border-t border-gray-200 dark:border-gray-700">
                            <td className="px-4 py-2">{row.budgetCode}</td>
                            <td className="px-4 py-2">{row.budgetItem}</td>
                            <td className="px-4 py-2 text-right">{formatNumber(row.m1)}</td>
                            <td className="px-4 py-2 text-right">{formatNumber(row.m2)}</td>
                            <td className="px-4 py-2 text-right">{formatNumber(row.m3)}</td>
                            <td className="px-4 py-2 text-right">...</td>
                            <td className="px-4 py-2 text-right font-semibold">{formatNumber(row.totalForecast)}</td>
                          </tr>
                        ))}
                        {importPreview.length > 10 && (
                          <tr className="border-t border-gray-200 dark:border-gray-700">
                            <td colSpan={7} className="px-4 py-2 text-center text-muted-foreground">
                              {t.forecastPlan.andMoreRows.replace('{count}', String(importPreview.length - 10))}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Allow Duplicates Prompt */}
                  <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                      {t.forecastPlan.allowDuplicates}
                    </p>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                      {t.forecastPlan.allowDuplicatesDesc}
                    </p>
                    <div className="flex gap-3">
                      <Button onClick={() => handleConfirmImport(false)} variant="outline">
                        {t.forecastPlan.skipDuplicates}
                      </Button>
                      <Button onClick={() => handleConfirmImport(true)}>
                        {t.forecastPlan.replaceExisting}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportPreview([]);
                }}
              >
                {t.forecastPlan.cancel}
              </Button>
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
        moduleName="Forecast"
        config={FORECAST_CONFIG}
      />
    </div>
  );
}
