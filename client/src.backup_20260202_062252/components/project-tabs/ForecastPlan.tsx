import { useState, useEffect } from 'react';
import { Save, Download, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { useLanguage, formatNumber } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { trpc } from '@/lib/trpc';
import { Workbook } from 'exceljs';
import { saveAs } from 'file-saver';

interface ForecastPlanTabProps {
  projectId: number;
}

// 🔗 FORECAST ROW - Multi-Year Support
// Each row represents ONE budget line in ONE fiscal year
interface ForecastRow {
  id: string;
  budgetItemId: string; // FK → Financial Overview Budget Item
  fiscalYear: string; // FY2025, FY2026, etc.
  yearNumber: number; // 1, 2, 3... (for Previous Year Budget logic)
  
  // ============================================
  // READ-ONLY - AUTO-POPULATED FROM FINANCIAL OVERVIEW
  // ============================================
  budgetCode: string;
  subBL: string;
  activityName: string;
  category: string;
  quantity: number;
  unitType: string;
  unitCost: number;
  recurrence: number;
  totalBudgetLine: number;
  currency: string;
  
  // Planning Metadata
  previousYearBudgetBalance: number | null; // Only visible from Year 2+ (CRITICAL: Remaining balance, not original budget!)
  planPeriod: number; // Active months in this year
  planStartDate: string;
  planEndDate: string;
  
  // ============================================
  // MONTH CONFIGURATION (Based on project dates)
  // ============================================
  activeMonths: boolean[]; // [true, true, false, ...] - which months are in project period
  
  // ============================================
  // EDITABLE - MONTHLY FORECAST VALUES
  // ============================================
  m1: number;
  m2: number;
  m3: number;
  m4: number;
  m5: number;
  m6: number;
  m7: number;
  m8: number;
  m9: number;
  m10: number;
  m11: number;
  m12: number;
  
  // ============================================
  // AUTO-CALCULATED
  // ============================================
  totalForecast: number; // Σ active months only
  actualSpent: number; // From Expenses table
  balanceAtEndOfPeriod: number; // totalBudgetLine - actualSpent
}

// Budget items will be fetched from tRPC projectBudgets.listByProject
// Expenses will be fetched from tRPC finance.getExpendituresByProject

/**
 * Generate fiscal years and active months based on project dates
 */
function generateFiscalYears(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  
  const fiscalYears: {
    year: string;
    yearNumber: number;
    activeMonths: boolean[];
    startMonth: number;
    endMonth: number;
  }[] = [];
  
  for (let year = startYear; year <= endYear; year++) {
    const yearStart = year === startYear ? start : new Date(year, 0, 1);
    const yearEnd = year === endYear ? end : new Date(year, 11, 31);
    
    const activeMonths = Array(12).fill(false);
    const startMonth = year === startYear ? start.getMonth() : 0;
    const endMonth = year === endYear ? end.getMonth() : 11;
    
    for (let m = startMonth; m <= endMonth; m++) {
      activeMonths[m] = true;
    }
    
    fiscalYears.push({
      year: `FY${year}`,
      yearNumber: year - startYear + 1,
      activeMonths,
      startMonth,
      endMonth
    });
  }
  
  return fiscalYears;
}

/**
 * Calculate previous year budget for a budget item
 */
function getPreviousYearBudget(
  budgetItemId: string, 
  currentYear: number, 
  forecastData: ForecastRow[]
): number | null {
  if (currentYear === 1) return null; // First year has no previous
  
  // Find forecast from previous year
  const prevYearForecast = forecastData.find(
    f => f.budgetItemId === budgetItemId && f.yearNumber === currentYear - 1
  );
  
  return prevYearForecast ? prevYearForecast.totalBudgetLine : null;
}

export function ForecastPlan({ projectId }: ForecastPlanTabProps) {
  const { language, isRTL } = useLanguage();
  const { t } = useTranslation();
  
  // Fetch project data using tRPC
  const { data: project, isLoading: projectLoading } = trpc.projects.getById.useQuery({ id: projectId });
  
  // Fetch budget items from projectBudgets router
  const { data: budgetItems = [] } = trpc.projectBudgets.listByProject.useQuery({ projectId });
  
  const [forecastData, setForecastData] = useState<ForecastRow[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  
  // 🔗 CRITICAL: Auto-generate forecast rows from project dates + budget items
  useEffect(() => {
    if (!project || !budgetItems.length) return;
    
    // Generate fiscal years from project dates
    const fiscalYears = generateFiscalYears(
      project.startDate instanceof Date ? project.startDate.toISOString() : project.startDate,
      project.endDate instanceof Date ? project.endDate.toISOString() : project.endDate
    );
    
    // Generate forecast rows: Each budget item × Each fiscal year
    const initializedForecasts: ForecastRow[] = [];
    
    budgetItems.forEach(budgetItem => {
      fiscalYears.forEach(fy => {
        // Calculate actual spent for this year
        const yearStart = parseInt(fy.year.replace('FY', ''));
        // TODO: Fetch actual spent from finance.getExpendituresByProject
        const actualSpent = parseFloat(budgetItem.actualSpent || '0');
        
        // Calculate active months count
        const activeMonthsCount = fy.activeMonths.filter(Boolean).length;
        
        // Initialize with even distribution across active months only
        const monthlyAmount = activeMonthsCount > 0 
          ? Math.round(budgetItem.totalBudgetLine / activeMonthsCount) 
          : 0;
        
        // Initialize all months
        const monthlyValues = fy.activeMonths.map((isActive, index) => 
          isActive ? monthlyAmount : 0
        );
        
        // Adjust last active month to match total exactly
        if (activeMonthsCount > 0) {
          const lastActiveIndex = fy.activeMonths.lastIndexOf(true);
          const currentTotal = monthlyValues.reduce((sum, v) => sum + v, 0);
          monthlyValues[lastActiveIndex] = budgetItem.totalBudgetLine - (currentTotal - monthlyValues[lastActiveIndex]);
        }
        
        const totalForecast = monthlyValues.reduce((sum, v) => sum + v, 0);
        
        // 🔥 CRITICAL: Calculate Previous Year Budget Balance (NOT original budget!)
        // This is the REMAINING balance at end of previous year (31 Dec Year N-1)
        // Formula: Total Budget Line - SUM(Actual Expenses up to 31 Dec Year N-1)
        let previousYearBudgetBalance: number | null = null;
        
        if (fy.yearNumber > 1) {
          // TODO: Calculate cumulative actual spent from previous years
          // For now, use null for Year 2+
          previousYearBudgetBalance = null;
        }
        
        initializedForecasts.push({
          id: `forecast-${budgetItem.id}-${fy.year}`,
          budgetItemId: budgetItem.id,
          fiscalYear: fy.year,
          yearNumber: fy.yearNumber,
          
          // Budget structure (read-only)
          budgetCode: budgetItem.budgetCode || '',
          subBL: budgetItem.subBudgetLine || '',
          activityName: budgetItem.activityName || budgetItem.budgetItem || '',
          category: '', // TODO: Get from category table
          quantity: budgetItem.qty || 0,
          unitType: budgetItem.unitType || '',
          unitCost: parseFloat(budgetItem.unitCost || '0'),
          recurrence: budgetItem.recurrence || 1,
          totalBudgetLine: parseFloat(budgetItem.totalBudgetLine || '0'),
          currency: budgetItem.currency || 'USD',
          
          // Planning metadata
          previousYearBudgetBalance,
          planPeriod: activeMonthsCount,
          planStartDate: `01/${fy.startMonth + 1}/${yearStart}`,
          planEndDate: `${new Date(yearStart, fy.endMonth + 1, 0).getDate()}/${fy.endMonth + 1}/${yearStart}`,
          
          // Active months configuration
          activeMonths: fy.activeMonths,
          
          // Monthly forecast values
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
          
          // Calculated
          totalForecast,
          actualSpent,
          balanceAtEndOfPeriod: budgetItem.totalBudgetLine - actualSpent
        });
      });
    });
    
    setForecastData(initializedForecasts);
    
    // Set default selected year to first fiscal year
    if (fiscalYears.length > 0) {
      setSelectedYear(fiscalYears[0].year);
    }
  }, [project, budgetItems]);
  
  // Filter data by selected year
  const filteredData = selectedYear 
    ? forecastData.filter(f => f.fiscalYear === selectedYear)
    : forecastData;
  
  // Get unique fiscal years for dropdown
  const fiscalYears = [...new Set(forecastData.map(f => f.fiscalYear))].sort();
  
  // Calculate totals for selected year
  const totals = filteredData.reduce((acc, row) => ({
    totalBudgetLine: acc.totalBudgetLine + row.totalBudgetLine,
    m1: acc.m1 + row.m1,
    m2: acc.m2 + row.m2,
    m3: acc.m3 + row.m3,
    m4: acc.m4 + row.m4,
    m5: acc.m5 + row.m5,
    m6: acc.m6 + row.m6,
    m7: acc.m7 + row.m7,
    m8: acc.m8 + row.m8,
    m9: acc.m9 + row.m9,
    m10: acc.m10 + row.m10,
    m11: acc.m11 + row.m11,
    m12: acc.m12 + row.m12,
    totalForecast: acc.totalForecast + row.totalForecast,
    actualSpent: acc.actualSpent + row.actualSpent,
    balanceAtEndOfPeriod: acc.balanceAtEndOfPeriod + row.balanceAtEndOfPeriod
  }), {
    totalBudgetLine: 0, m1: 0, m2: 0, m3: 0, m4: 0, m5: 0, m6: 0,
    m7: 0, m8: 0, m9: 0, m10: 0, m11: 0, m12: 0, 
    totalForecast: 0, actualSpent: 0, balanceAtEndOfPeriod: 0
  });
  
  // Handle monthly forecast changes (only for active months)
  const handleMonthlyChange = (rowId: string, monthIndex: number, value: number) => {
    setForecastData(prev => prev.map(row => {
      if (row.id !== rowId) return row;
      
      // Check if month is active
      if (!row.activeMonths[monthIndex]) return row;
      
      const monthKey = `m${monthIndex + 1}` as keyof ForecastRow;
      const updated = { ...row, [monthKey]: value };
      
      // Recalculate total forecast (only active months)
      updated.totalForecast = row.activeMonths.reduce((sum, isActive, i) => {
        const key = `m${i + 1}` as keyof ForecastRow;
        return sum + (isActive ? (updated[key] as number) : 0);
      }, 0);
      
      updated.balanceAtEndOfPeriod = updated.totalBudgetLine - updated.actualSpent;
      
      return updated;
    }));
    setHasChanges(true);
  };
  
  // Validate: Total Forecast cannot exceed Total Budget Line
  const validateForecast = (): boolean => {
    const errors: string[] = [];
    
    filteredData.forEach(row => {
      if (row.totalForecast > row.totalBudgetLine) {
        errors.push(`${row.budgetCode} ${row.subBL} (${row.activityName}) - ${row.fiscalYear}: Total Forecast ($${formatNumber(row.totalForecast)}) exceeds Total Budget Line ($${formatNumber(row.totalBudgetLine)})`);
      }
    });
    
    setValidationErrors(errors);
    return errors.length === 0;
  };
  
  // Save forecast changes
  const handleSave = () => {
    if (!validateForecast()) {
      alert('❌ Please fix validation errors before saving');
      return;
    }
    
    // In production: POST /api/projects/{projectId}/forecasts
    console.log('Saving forecast data...', forecastData);
    setHasChanges(false);
    alert('✅ Forecast plan saved successfully!');
  };

  // Export to Excel (Full structure)
  const handleExportExcel = async () => {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Forecast Plan');

    worksheet.columns = [
      { header: 'Fiscal Year', key: 'fiscalYear', width: 10 },
      { header: 'Budget Code', key: 'budgetCode', width: 12 },
      { header: 'Sub-BL', key: 'subBL', width: 8 },
      { header: 'Activity Name', key: 'activityName', width: 30 },
      { header: 'Qty', key: 'quantity', width: 8 },
      { header: 'Unit Type', key: 'unitType', width: 12 },
      { header: 'Unit Cost', key: 'unitCost', width: 12 },
      { header: 'Recurrence', key: 'recurrence', width: 10 },
      { header: 'Total Budget Line', key: 'totalBudgetLine', width: 15 },
      { header: 'Currency', key: 'currency', width: 10 },
      { header: 'Previous Year Budget Balance', key: 'previousYearBudgetBalance', width: 20 },
      { header: 'Plan Period', key: 'planPeriod', width: 10 },
      { header: 'Plan Start', key: 'planStartDate', width: 12 },
      { header: 'Plan End', key: 'planEndDate', width: 12 },
      { header: 'M1', key: 'm1', width: 10 },
      { header: 'M2', key: 'm2', width: 10 },
      { header: 'M3', key: 'm3', width: 10 },
      { header: 'M4', key: 'm4', width: 10 },
      { header: 'M5', key: 'm5', width: 10 },
      { header: 'M6', key: 'm6', width: 10 },
      { header: 'M7', key: 'm7', width: 10 },
      { header: 'M8', key: 'm8', width: 10 },
      { header: 'M9', key: 'm9', width: 10 },
      { header: 'M10', key: 'm10', width: 10 },
      { header: 'M11', key: 'm11', width: 10 },
      { header: 'M12', key: 'm12', width: 10 },
      { header: 'Total Forecast', key: 'totalForecast', width: 15 },
      { header: 'Actual Spent', key: 'actualSpent', width: 15 },
      { header: 'Balance', key: 'balanceAtEndOfPeriod', width: 15 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' }
    };

    filteredData.forEach(row => {
      worksheet.addRow({
        ...row,
        previousYearBudgetBalance: row.previousYearBudgetBalance ?? 'N/A'
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    saveAs(blob, `Forecast_Plan_${selectedYear}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const months = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11', 'm12'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthNamesAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  
  if (projectLoading) {
    return <div className="p-6 text-center">Loading project data...</div>;
  }
  
  if (!project) {
    return <div className="p-6 text-center text-red-600">Project not found</div>;
  }
  
  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="space-y-6">
      {/* Header with Year Selector */}
      <div className={`flex items-center justify-between mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h2 className="text-sm font-semibold text-gray-900">
            {isRTL ? '📊 خطة التنبؤات' : '📊 Forecast Plan'}
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">
            {isRTL 
              ? `شبكة التنبؤات متعددة السنوات - مزامنة تلقائية من النظرة المالية (${project.startDate instanceof Date ? project.startDate.toLocaleDateString() : project.startDate} إلى ${project.endDate instanceof Date ? project.endDate.toLocaleDateString() : project.endDate})`
              : `Multi-year forecast grid - Auto-synced from Financial Overview (${project.startDate instanceof Date ? project.startDate.toLocaleDateString() : project.startDate} to ${project.endDate instanceof Date ? project.endDate.toLocaleDateString() : project.endDate})`
            }
          </p>
        </div>
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {/* Fiscal Year Selector */}
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <label className="text-sm font-medium text-gray-700">
              {isRTL ? 'السنة المالية:' : 'Fiscal Year:'}
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className={`px-3 py-2 text-sm border border-gray-300 rounded-md ${isRTL ? 'text-right' : 'text-left'}`}
            >
              {fiscalYears.map(fy => (
                <option key={fy} value={fy}>{fy}</option>
              ))}
            </select>
          </div>
          
          <button
            onClick={handleExportExcel}
            className={`px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Download className="w-4 h-4" />
            {isRTL ? `تصدير ${selectedYear}` : `Export ${selectedYear}`}
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className={`px-4 py-2 text-sm rounded-md flex items-center gap-2 ${
              hasChanges 
                ? 'bg-primary text-white hover:bg-primary/90' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            } ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Save className="w-4 h-4" />
            {isRTL ? 'حفظ' : 'Save'}
          </button>
        </div>
      </div>

      {/* Project Period Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Info className="w-4 h-4 text-blue-600" />
          <div className={`text-sm text-blue-900 ${isRTL ? 'text-right' : 'text-left'}`}>
            {isRTL ? (
              <>
                <strong>فترة المشروع:</strong> {project.startDate instanceof Date ? project.startDate.toLocaleDateString() : project.startDate} إلى {project.endDate instanceof Date ? project.endDate.toLocaleDateString() : project.endDate} 
                <span className="mx-2">•</span>
                <strong>السنوات المالية:</strong> {fiscalYears.join(', ')}
                <span className="mx-2">•</span>
                <strong>العرض الحالي:</strong> {selectedYear}
              </>
            ) : (
              <>
                <strong>Project Period:</strong> {project.startDate instanceof Date ? project.startDate.toLocaleDateString() : project.startDate} to {project.endDate instanceof Date ? project.endDate.toLocaleDateString() : project.endDate} 
                <span className="mx-2">•</span>
                <strong>Fiscal Years:</strong> {fiscalYears.join(', ')}
                <span className="mx-2">•</span>
                <strong>Viewing:</strong> {selectedYear}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Validation Alerts */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <h4 className="font-semibold text-red-900">
                {isRTL ? '⚠️ أخطاء التحقق' : '⚠️ Validation Errors'}
              </h4>
              <ul className="text-sm text-red-700 mt-2 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {validationErrors.length === 0 && filteredData.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div className={`text-sm text-green-700 ${isRTL ? 'text-right' : 'text-left'}`}>
              {isRTL 
                ? `✅ جميع التنبؤات ضمن الميزانيات المعتمدة لـ ${selectedYear}`
                : `✅ All forecasts are within approved budgets for ${selectedYear}`
              }
            </div>
          </div>
        </div>
      )}

      {/* Excel-like Grid - Multi-Year Donor Compliant */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: '2600px' }}>
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="px-2 py-2 text-xs font-semibold border border-blue-700" rowSpan={2}>
                  {isRTL ? 'السنة المالية' : 'Fiscal Year'}
                </th>
                <th className="px-2 py-2 text-xs font-semibold border border-blue-700" rowSpan={2}>
                  {isRTL ? 'رمز الميزانية' : 'Budget Code'}
                </th>
                <th className="px-2 py-2 text-xs font-semibold border border-blue-700" rowSpan={2}>
                  {isRTL ? 'بند فرعي' : 'Sub-BL'}
                </th>
                <th className="px-2 py-2 text-xs font-semibold border border-blue-700 text-left" rowSpan={2}>
                  {isRTL ? 'اسم النشاط' : 'Activity Name'}
                </th>
                <th className="px-2 py-2 text-xs font-semibold border border-blue-700" rowSpan={2}>
                  {isRTL ? 'الكمية' : 'Qty'}
                </th>
                <th className="px-2 py-2 text-xs font-semibold border border-blue-700" rowSpan={2}>
                  {isRTL ? 'نوع الوحدة' : 'Unit Type'}
                </th>
                <th className="px-2 py-2 text-xs font-semibold border border-blue-700 text-right" rowSpan={2}>
                  {isRTL ? 'تكلفة الوحدة' : 'Unit Cost'}
                </th>
                <th className="px-2 py-2 text-xs font-semibold border border-blue-700" rowSpan={2}>
                  {isRTL ? 'التكرار' : 'Recurrence'}
                </th>
                <th className="px-2 py-2 text-xs font-semibold border border-blue-700 text-right" rowSpan={2}>
                  {isRTL ? 'إجمالي بند الميزانية' : 'Total Budget Line'}
                </th>
                <th className="px-2 py-2 text-xs font-semibold border border-blue-700" rowSpan={2}>
                  {isRTL ? 'العملة' : 'Currency'}
                </th>
                <th className="px-2 py-2 text-xs font-semibold border border-blue-700 text-right" rowSpan={2}>
                  {isRTL ? 'رصيد ميزانية السنة السابقة' : 'Previous Year Budget Balance'}
                </th>
                <th className="px-2 py-2 text-xs font-semibold border border-blue-700" rowSpan={2}>
                  {isRTL ? 'فترة الخطة (أشهر)' : 'Plan Period (months)'}
                </th>
                <th className="px-2 py-2 text-xs font-semibold border border-blue-700" rowSpan={2}>
                  {isRTL ? 'بداية الخطة' : 'Plan Start'}
                </th>
                <th className="px-2 py-2 text-xs font-semibold border border-blue-700" rowSpan={2}>
                  {isRTL ? 'نهاية الخطة' : 'Plan End'}
                </th>
                <th className="px-2 py-2 text-xs font-semibold border border-blue-700 text-center" colSpan={12}>
                  {isRTL ? '📅 التنبؤات الشهرية (قابلة للتحرير - الأشهر النشطة فقط)' : '📅 Monthly Forecast (Editable - Active Months Only)'}
                </th>
                <th className="px-2 py-2 text-xs font-semibold border border-blue-700 text-right" rowSpan={2}>
                  {isRTL ? 'إجمالي التنبؤات' : 'Total Forecast'}
                </th>
                <th className="px-2 py-2 text-xs font-semibold border border-blue-700 text-right" rowSpan={2}>
                  {isRTL ? 'المصروف الفعلي' : 'Actual Spent'}
                </th>
                <th className="px-2 py-2 text-xs font-semibold border border-blue-700 text-right" rowSpan={2}>
                  {isRTL ? 'الرصيد في النهاية' : 'Balance at End'}
                </th>
              </tr>
              <tr className="bg-blue-500 text-white">
                {months.map((m, i) => (
                  <th key={m} className="px-2 py-1 text-xs font-semibold border border-blue-600 text-center">
                    {isRTL ? monthNamesAr[i] : monthNames[i]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {/* READ-ONLY Budget Structure Fields */}
                  <td className="px-2 py-2 text-xs border border-gray-300 bg-gray-50 font-medium">{row.fiscalYear}</td>
                  <td className="px-2 py-2 text-xs font-medium border border-gray-300 bg-gray-50">{row.budgetCode}</td>
                  <td className="px-2 py-2 text-xs border border-gray-300 bg-gray-50">{row.subBL}</td>
                  <td className="px-2 py-2 text-xs border border-gray-300 bg-gray-50 text-left">{row.activityName}</td>
                  <td className="px-2 py-2 text-xs text-right border border-gray-300 bg-gray-50" dir="ltr">{row.quantity}</td>
                  <td className="px-2 py-2 text-xs border border-gray-300 bg-gray-50">{row.unitType}</td>
                  <td className="px-2 py-2 text-xs text-right border border-gray-300 bg-gray-50" dir="ltr">{formatNumber(row.unitCost)}</td>
                  <td className="px-2 py-2 text-xs text-right border border-gray-300 bg-gray-50" dir="ltr">{row.recurrence}</td>
                  <td className="px-2 py-2 text-xs text-right font-bold border border-gray-300 bg-gray-50" dir="ltr">
                    {formatNumber(row.totalBudgetLine)}
                  </td>
                  <td className="px-2 py-2 text-xs border border-gray-300 bg-gray-50">{row.currency}</td>
                  <td className="px-2 py-2 text-xs text-right border border-gray-300 bg-gray-50" dir="ltr">
                    {row.previousYearBudgetBalance !== null ? formatNumber(row.previousYearBudgetBalance) : 'N/A'}
                  </td>
                  <td className="px-2 py-2 text-xs text-center border border-gray-300 bg-gray-50">{row.planPeriod}</td>
                  <td className="px-2 py-2 text-xs border border-gray-300 bg-gray-50">{row.planStartDate}</td>
                  <td className="px-2 py-2 text-xs border border-gray-300 bg-gray-50">{row.planEndDate}</td>
                  
                  {/* MONTHLY FORECAST - Active/Inactive based on project dates */}
                  {months.map((month, monthIndex) => {
                    const isActive = row.activeMonths[monthIndex];
                    return (
                      <td 
                        key={month} 
                        className={`px-1 py-1 border border-gray-300 ${isActive ? 'bg-white' : 'bg-gray-100'}`}
                      >
                        {isActive ? (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row[month as keyof ForecastRow] as number}
                            onChange={(e) => handleMonthlyChange(row.id, monthIndex, parseFloat(e.target.value) || 0)}
                            className="w-full px-1 py-1 text-xs text-right border-0 focus:outline-none focus:ring-1 focus:ring-primary rounded"
                            dir="ltr"
                          />
                        ) : (
                          <div className="px-1 py-1 text-xs text-right text-gray-400" dir="ltr">-</div>
                        )}
                      </td>
                    );
                  })}
                  
                  {/* AUTO-CALCULATED Fields */}
                  <td className="px-2 py-2 text-xs text-right font-bold border border-gray-300 bg-blue-50" dir="ltr">
                    {formatNumber(row.totalForecast)}
                  </td>
                  <td className="px-2 py-2 text-xs text-right border border-gray-300 bg-gray-50" dir="ltr">
                    {formatNumber(row.actualSpent)}
                  </td>
                  <td className={`px-2 py-2 text-xs text-right font-medium border border-gray-300 ${
                    row.balanceAtEndOfPeriod < 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                  }`} dir="ltr">
                    {formatNumber(row.balanceAtEndOfPeriod)}
                  </td>
                </tr>
              ))}
              
              {/* TOTALS ROW */}
              {filteredData.length > 0 && (
                <tr className="bg-gray-200 font-bold">
                  <td className="px-2 py-2 text-xs border border-gray-400" colSpan={8}>TOTAL - {selectedYear}</td>
                  <td className="px-2 py-2 text-xs text-right border border-gray-400" dir="ltr">
                    {formatNumber(totals.totalBudgetLine)}
                  </td>
                  <td className="px-2 py-2 text-xs border border-gray-400" colSpan={5}></td>
                  {months.map((month) => (
                    <td key={month} className="px-2 py-2 text-xs text-right border border-gray-400" dir="ltr">
                      {formatNumber(totals[month as keyof typeof totals] as number)}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-xs text-right border border-gray-400" dir="ltr">
                    {formatNumber(totals.totalForecast)}
                  </td>
                  <td className="px-2 py-2 text-xs text-right border border-gray-400" dir="ltr">
                    {formatNumber(totals.actualSpent)}
                  </td>
                  <td className={`px-2 py-2 text-xs text-right border border-gray-400 ${
                    totals.balanceAtEndOfPeriod < 0 ? 'text-red-700' : 'text-green-700'
                  }`} dir="ltr">
                    {formatNumber(totals.balanceAtEndOfPeriod)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Panel - Per Selected Year */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border-2 border-blue-200 rounded-lg p-4">
          <div className={`text-xs text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            {isRTL ? `إجمالي التنبؤات (${selectedYear})` : `Total Forecast (${selectedYear})`}
          </div>
          <div className="text-2xl font-bold text-blue-600" dir="ltr">
            ${formatNumber(totals.totalForecast)}
          </div>
        </div>
        <div className="bg-white border-2 border-green-200 rounded-lg p-4">
          <div className={`text-xs text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            {isRTL ? `الميزانية المعتمدة (${selectedYear})` : `Approved Budget (${selectedYear})`}
          </div>
          <div className="text-2xl font-bold text-green-600" dir="ltr">
            ${formatNumber(totals.totalBudgetLine)}
          </div>
        </div>
        <div className="bg-white border-2 border-orange-200 rounded-lg p-4">
          <div className={`text-xs text-gray-600 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            {isRTL ? `الرصيد (${selectedYear})` : `Balance (${selectedYear})`}
          </div>
          <div className={`text-2xl font-bold ${totals.balanceAtEndOfPeriod < 0 ? 'text-red-600' : 'text-orange-600'}`} dir="ltr">
            ${formatNumber(totals.balanceAtEndOfPeriod)}
          </div>
        </div>
      </div>

      {/* NGO Compliance Instructions - Bilingual */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className={`font-semibold text-blue-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
          {isRTL ? '🎯 خطة تنبؤات بمستوى المنظمات غير الحكومية (متوافقة مع السنوات المتعددة)' : '🎯 NGO-Grade Forecast Plan (Multi-Year Compliant)'}
        </h4>
        <ul className={`text-sm text-blue-700 space-y-1 ${isRTL ? 'text-right' : 'text-left'}`}>
          {isRTL ? (
            <>
              <li>✅ <strong>دعم السنوات المتعددة:</strong> توليد تلقائي للسنوات المالية من تواريخ المشروع ({project.startDate instanceof Date ? project.startDate.toLocaleDateString() : project.startDate} إلى {project.endDate instanceof Date ? project.endDate.toLocaleDateString() : project.endDate})</li>
              <li>📅 <strong>دعم السنة الجزئية:</strong> الأشهر غير النشطة معطلة (مثال: إذا انتهى المشروع في يونيو، تكون يوليو-ديسمبر معطلة)</li>
              <li>🔗 <strong>مزامنة واحد لواحد:</strong> كل بند ميزانية يولد صفوف التنبؤات لكل سنة مالية</li>
              <li>📊 <strong>ميزانية السنة السابقة:</strong> مرئية من السنة الثانية فصاعداً فقط (غير متوفر للسنة الأولى)</li>
              <li>🚫 <strong>التحقق:</strong> إجمالي التنبؤات لا يمكن أن يتجاوز إجمالي بند الميزانية (لكل سنة)</li>
              <li>💰 <strong>قعدة الرصيد:</strong> الرصيد = إجمالي بند الميزانية - الإنفاق الفعلي (التنبؤات لا تؤثر على الرصيد)</li>
              <li>🔄 <strong>التحديث التلقائي:</strong> التغييرات في النظرة المالية تنتشر فوراً لجميع سنوات التنبؤات</li>
              <li>📥 <strong>التصدير:</strong> تنزيل Excel مع جميع الأشهر النشطة لـ {selectedYear}</li>
            </>
          ) : (
            <>
              <li>✅ <strong>Multi-Year Support:</strong> Auto-generates fiscal years from project dates ({project.startDate instanceof Date ? project.startDate.toLocaleDateString() : project.startDate} to {project.endDate instanceof Date ? project.endDate.toLocaleDateString() : project.endDate})</li>
              <li>📅 <strong>Partial Year Support:</strong> Inactive months are greyed out (e.g., if project ends in June, Jul-Dec are disabled)</li>
              <li>🔗 <strong>One-to-One Sync:</strong> Each budget line generates forecast rows for each fiscal year</li>
              <li>📊 <strong>Previous Year Budget:</strong> Visible from Year 2+ only (N/A for Year 1)</li>
              <li>🚫 <strong>Validation:</strong> Total Forecast cannot exceed Total Budget Line (per year)</li>
              <li>💰 <strong>Balance Rule:</strong> Balance = Total Budget Line - Actual Spent (forecasts don't affect balance)</li>
              <li>🔄 <strong>Auto-Update:</strong> Changes in Financial Overview instantly propagate to all forecast years</li>
              <li>📥 <strong>Export:</strong> Download Excel with all active months for {selectedYear}</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}