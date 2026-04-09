import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/i18n/useTranslation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Calendar } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { toast } from "sonner";

interface ForecastPlanProps {
  projectId: number;
}

// Helper to get currency symbol
const getCurrencySymbol = (currency: string) => {
  const symbols: Record<string, string> = {
    'EUR': '€',
    'USD': '$',
    'CHF': 'CHF ',
    'YER': 'YER ',
    'SAR': 'SAR ',
  };
  return symbols[currency] || currency + ' ';
};

// Helper to format currency
const formatCurrency = (amount: number, currency: string) => {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function ForecastPlan({ projectId }: ForecastPlanProps) {
  const { t, language } = useTranslation();
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [budgetCodeFilter, setBudgetCodeFilter] = useState<string>("all");
  
  // Fetch budget data
  const { data: budgetItems = [], isLoading } = trpc.projectBudgets.listByProject.useQuery({ 
    projectId 
  });
  
  // Get project currency from first budget item
  const projectCurrency = useMemo(() => {
    return budgetItems[0]?.currency || 'USD';
  }, [budgetItems]);
  
  // Get unique budget codes for filter
  const budgetCodes = useMemo(() => {
    const codes = new Set(budgetItems.map(item => item.budgetCode).filter(Boolean));
    return Array.from(codes);
  }, [budgetItems]);
  
  // Get available years from budget items (current year + next 3 years for forecasting)
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear + 1, currentYear + 2, currentYear + 3];
  }, []);
  
  // Filter budget items
  const filteredItems = useMemo(() => {
    let items = budgetItems;
    
    if (budgetCodeFilter !== "all") {
      items = items.filter(item => item.budgetCode === budgetCodeFilter);
    }
    
    return items;
  }, [budgetItems, budgetCodeFilter]);
  
  // Group items by budget code
  const groupedItems = useMemo(() => {
    const groups = new Map<string, typeof budgetItems>();
    filteredItems.forEach(item => {
      const code = item.budgetCode || "Uncategorized";
      if (!groups.has(code)) {
        groups.set(code, []);
      }
      groups.get(code)!.push(item);
    });
    return groups;
  }, [filteredItems]);
  
  // Calculate totals for each year
  const yearlyTotals = useMemo(() => {
    const totals = new Map<number, { budget: number; spent: number; forecast: number }>();
    
    availableYears.forEach(year => {
      const yearData = {
        budget: 0,
        spent: 0,
        forecast: 0,
      };
      
      filteredItems.forEach(item => {
        const totalBudget = parseFloat(item.totalBudgetLine?.toString() || "0");
        const actualSpent = parseFloat(item.actualSpent?.toString() || "0");
        
        // For current year, use actual spent; for future years, use budget as forecast
        const currentYear = new Date().getFullYear();
        if (year === currentYear) {
          yearData.budget += totalBudget;
          yearData.spent += actualSpent;
          yearData.forecast += totalBudget - actualSpent; // Remaining budget as forecast
        } else if (year > currentYear) {
          yearData.forecast += totalBudget; // Future years show full budget as forecast
        }
      });
      
      totals.set(year, yearData);
    });
    
    return totals;
  }, [filteredItems, availableYears]);
  
  // Export to Excel with multi-year forecast
  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Forecast Plan');
      
      // Define columns
      const columns = [
        { header: language === 'ar' ? 'رمز الميزانية' : 'Budget Code', key: 'budgetCode', width: 15 },
        { header: language === 'ar' ? 'بند الميزانية الفرعي' : 'Sub Budget Line', key: 'subBudgetLine', width: 15 },
        { header: language === 'ar' ? 'اسم النشاط' : 'Activity Name', key: 'activityName', width: 30 },
        { header: language === 'ar' ? 'بند الميزانية' : 'Budget Item', key: 'budgetItem', width: 30 },
        { header: language === 'ar' ? 'الكمية' : 'Qty', key: 'qty', width: 10 },
        { header: language === 'ar' ? 'نوع الوحدة' : 'Unit Type', key: 'unitType', width: 15 },
        { header: language === 'ar' ? 'تكلفة الوحدة' : 'Unit Cost', key: 'unitCost', width: 15 },
        { header: language === 'ar' ? 'التكرار' : 'Recurrence', key: 'recurrence', width: 12 },
        { header: language === 'ar' ? 'إجمالي الميزانية' : 'Total Budget', key: 'totalBudget', width: 15 },
        { header: language === 'ar' ? 'الإنفاق الفعلي' : 'Actual Spent', key: 'actualSpent', width: 15 },
      ];
      
      // Add year columns
      availableYears.forEach(year => {
        columns.push({
          header: `${language === 'ar' ? 'توقعات' : 'Forecast'} ${year}`,
          key: `forecast_${year}`,
          width: 15,
        });
      });
      
      worksheet.columns = columns;
      
      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4B5563' },
      };
      worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
      
      // Add data rows
      filteredItems.forEach(item => {
        const totalBudget = parseFloat(item.totalBudgetLine?.toString() || "0");
        const actualSpent = parseFloat(item.actualSpent?.toString() || "0");
        const currentYear = new Date().getFullYear();
        
        const row: any = {
          budgetCode: item.budgetCode || '',
          subBudgetLine: item.subBudgetLine || '',
          activityName: item.activityName || '',
          budgetItem: item.budgetItem || '',
          qty: item.qty || 0,
          unitType: item.unitType || '',
          unitCost: item.unitCost || 0,
          recurrence: item.recurrence || 0,
          totalBudget: totalBudget,
          actualSpent: actualSpent,
        };
        
        // Add forecast for each year
        availableYears.forEach(year => {
          if (year === currentYear) {
            row[`forecast_${year}`] = totalBudget - actualSpent; // Remaining budget
          } else if (year > currentYear) {
            row[`forecast_${year}`] = totalBudget; // Full budget for future years
          }
        });
        
        worksheet.addRow(row);
      });
      
      // Add totals row
      const totalsRow: any = {
        budgetCode: '',
        subBudgetLine: '',
        activityName: '',
        budgetItem: language === 'ar' ? 'الإجمالي' : 'TOTAL',
        qty: '',
        unitType: '',
        unitCost: '',
        recurrence: '',
        totalBudget: filteredItems.reduce((sum, item) => sum + parseFloat(item.totalBudgetLine?.toString() || "0"), 0),
        actualSpent: filteredItems.reduce((sum, item) => sum + parseFloat(item.actualSpent?.toString() || "0"), 0),
      };
      
      availableYears.forEach(year => {
        const yearData = yearlyTotals.get(year);
        if (yearData) {
          totalsRow[`forecast_${year}`] = yearData.forecast;
        }
      });
      
      const totalRow = worksheet.addRow(totalsRow);
      totalRow.font = { bold: true };
      totalRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' },
      };
      
      // Generate file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Forecast_Plan_Project_${projectId}_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      toast.success(language === 'ar' ? 'تم تصدير ملف Excel بنجاح' : 'Excel file exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error(language === 'ar' ? 'فشل تصدير الملف' : 'Failed to export file');
    }
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            {language === 'ar' ? 'جاري تحميل بيانات التوقعات...' : 'Loading forecast data...'}
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header with filters and export */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {language === 'ar' ? 'خطة التوقعات المالية' : 'Financial Forecast Plan'}
            </CardTitle>
            <Button onClick={handleExportExcel} className="gap-2">
              <Download className="h-4 w-4" />
              {language === 'ar' ? 'تصدير إلى Excel' : 'Export to Excel'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">
                {language === 'ar' ? 'تصفية حسب رمز الميزانية' : 'Filter by Budget Code'}
              </label>
              <Select value={budgetCodeFilter} onValueChange={setBudgetCodeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'ar' ? 'الكل' : 'All'}</SelectItem>
                  {budgetCodes.map(code => (
                    <SelectItem key={code} value={code}>{code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">
                {language === 'ar' ? 'عرض السنة' : 'View Year'}
              </label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'ar' ? 'جميع السنوات' : 'All Years'}</SelectItem>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Multi-Year Forecast Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {language === 'ar' ? 'ملخص التوقعات متعدد السنوات' : 'Multi-Year Forecast Summary'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold">
                    {language === 'ar' ? 'السنة' : 'Year'}
                  </th>
                  <th className="text-right p-3 font-semibold">
                    {language === 'ar' ? 'الميزانية' : 'Budget'}
                  </th>
                  <th className="text-right p-3 font-semibold">
                    {language === 'ar' ? 'الإنفاق الفعلي' : 'Actual Spent'}
                  </th>
                  <th className="text-right p-3 font-semibold">
                    {language === 'ar' ? 'التوقعات' : 'Forecast'}
                  </th>
                  <th className="text-right p-3 font-semibold">
                    {language === 'ar' ? 'الفرق' : 'Variance'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {availableYears.map(year => {
                  const yearData = yearlyTotals.get(year);
                  if (!yearData) return null;
                  
                  const variance = yearData.budget - yearData.spent - yearData.forecast;
                  const currentYear = new Date().getFullYear();
                  
                  return (
                    <tr key={year} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">
                        {year}
                        {year === currentYear && (
                          <span className="ml-2 text-xs text-blue-600 font-semibold">
                            {language === 'ar' ? '(الحالي)' : '(Current)'}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {formatCurrency(yearData.budget, projectCurrency)}
                      </td>
                      <td className="p-3 text-right text-blue-600">
                        {formatCurrency(yearData.spent, projectCurrency)}
                      </td>
                      <td className="p-3 text-right text-green-600">
                        {formatCurrency(yearData.forecast, projectCurrency)}
                      </td>
                      <td className={`p-3 text-right font-semibold ${variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(Math.abs(variance), projectCurrency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {/* Detailed Budget Items by Code */}
      <div className="space-y-4">
        {Array.from(groupedItems.entries()).map(([budgetCode, items]) => {
          const groupTotal = items.reduce((sum, item) => sum + parseFloat(item.totalBudgetLine?.toString() || "0"), 0);
          const groupSpent = items.reduce((sum, item) => sum + parseFloat(item.actualSpent?.toString() || "0"), 0);
          const groupBalance = groupTotal - groupSpent;
          
          return (
            <Card key={budgetCode}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{budgetCode}</CardTitle>
                  <div className="flex gap-6 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {language === 'ar' ? 'الميزانية' : 'Budget'}
                      </p>
                      <p className="font-semibold">{formatCurrency(groupTotal, projectCurrency)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {language === 'ar' ? 'المنفق' : 'Spent'}
                      </p>
                      <p className="font-semibold text-blue-600">{formatCurrency(groupSpent, projectCurrency)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {language === 'ar' ? 'الرصيد' : 'Balance'}
                      </p>
                      <p className={`font-semibold ${groupBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(groupBalance, projectCurrency)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">{language === 'ar' ? 'بند فرعي' : 'Sub BL'}</th>
                        <th className="text-left p-2">{language === 'ar' ? 'النشاط' : 'Activity'}</th>
                        <th className="text-left p-2">{language === 'ar' ? 'البند' : 'Item'}</th>
                        <th className="text-right p-2">{language === 'ar' ? 'الكمية' : 'Qty'}</th>
                        <th className="text-left p-2">{language === 'ar' ? 'الوحدة' : 'Unit'}</th>
                        <th className="text-right p-2">{language === 'ar' ? 'التكلفة' : 'Cost'}</th>
                        <th className="text-right p-2">{language === 'ar' ? 'التكرار' : 'Recur'}</th>
                        <th className="text-right p-2">{language === 'ar' ? 'الإجمالي' : 'Total'}</th>
                        <th className="text-right p-2">{language === 'ar' ? 'المنفق' : 'Spent'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => {
                        const total = parseFloat(item.totalBudgetLine?.toString() || "0");
                        const spent = parseFloat(item.actualSpent?.toString() || "0");
                        
                        return (
                          <tr key={item.id} className="border-b hover:bg-muted/50">
                            <td className="p-2">{item.subBudgetLine || '-'}</td>
                            <td className="p-2">{item.activityName || '-'}</td>
                            <td className="p-2">{item.budgetItem || '-'}</td>
                            <td className="p-2 text-right">{item.qty || '-'}</td>
                            <td className="p-2">{item.unitType || '-'}</td>
                            <td className="p-2 text-right">{formatCurrency(parseFloat(item.unitCost?.toString() || "0"), projectCurrency)}</td>
                            <td className="p-2 text-right">{item.recurrence || '-'}</td>
                            <td className="p-2 text-right font-semibold">{formatCurrency(total, projectCurrency)}</td>
                            <td className="p-2 text-right text-blue-600">{formatCurrency(spent, projectCurrency)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {filteredItems.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              {language === 'ar' ? 'لا توجد بيانات ميزانية متاحة' : 'No budget data available'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
