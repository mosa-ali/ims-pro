/**
 * ============================================================================
 * PAYROLL & ALLOWANCES - FULLY FUNCTIONAL MODULE
 * ============================================================================
 * 
 * FEATURES:
 * ✅ Form 1: Monthly Payroll Sheet (all fields editable)
 * ✅ Form 2: Payroll Calculator (linked to Form 1)
 * ✅ Full CRUD operations with localStorage persistence
 * ✅ Status workflow: Draft → Submitted → Approved
 * ✅ Professional print layout (audit-ready)
 * ✅ Excel export (CSV format)
 * ✅ Bilingual support (EN/AR with RTL)
 * ✅ Multi-country flexible (Yemen, others, custom policies)
 * 
 * CALCULATION PHILOSOPHY:
 * - ALL fields are editable (values AND percentages)
 * - System CALCULATES but does NOT ENFORCE policy
 * - No hard-coded tax rules or country assumptions
 * 
 * ============================================================================
 */

import { useState, useEffect, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { 
  Plus, 
  Download, 
  Printer,
  Calculator,
  Save,
  X,
  Eye,
  Check,
  Trash2,
  Edit,
  ArrowRight
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { 
  PayrollSheet, 
  PayrollRecord,
} from '@/app/services/hrService';
import { exportPayrollToExcel } from '@/app/utils/excelExport';
import { PayrollCalculatorModal } from './PayrollCalculatorModal';
import { PayrollViewModal } from './PayrollViewModal';
import { ModalOverlay } from '@/app/components/ui/ModalOverlay';
import { BackToModulesButton } from './BackToModulesButton';

export function PayrollAllowances() {
  const { language, isRTL } = useLanguage();
  const { user } = useAuth();

  // tRPC queries and mutations
  const { data: payrollData, refetch: refetchPayrolls, isLoading: isLoadingPayrolls } = trpc.hrPayroll.getAll.useQuery(
    {
      organizationId: user?.organizationId || 0,
      operatingUnitId: user?.operatingUnitId || 0,
    },
    { enabled: !!user?.organizationId && !!user?.operatingUnitId }
  );

  const generateMutation = trpc.hrPayroll.generateFromSalaryScale.useMutation({
    onSuccess: () => {
      toast.success(language === 'en' ? 'Payroll generated successfully' : 'تم إنشاء كشف الرواتب بنجاح');
      refetchPayrolls();
      setShowGenerateModal(false);
      setSelectedMonth('');
      setPreparedBy(user?.name || '');
      setPreparedByTitle('');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.hrPayroll.delete.useMutation({
    onSuccess: () => {
      toast.success(language === 'en' ? 'Payroll deleted' : 'تم حذف كشف الرواتب');
      refetchPayrolls();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateStatusMutation = trpc.hrPayroll.updateStatus.useMutation({
    onSuccess: () => {
      toast.success(language === 'en' ? 'Status updated' : 'تم تحديث الحالة');
      refetchPayrolls();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Transform payroll data to match the expected format
  // Database returns individual records per employee, we need to group by month/year
  const payrolls = useMemo(() => {
    if (!payrollData || !Array.isArray(payrollData)) return [];
    
    // Group records by month/year
    const grouped = new Map<string, any[]>();
    payrollData.forEach(record => {
      if (!record) return;
      const key = `${record.payrollYear}-${String(record.payrollMonth).padStart(2, '0')}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(record);
    });
    
    // Convert to PayrollSheet format
    const monthNames: Record<number, string> = {
      1: 'January', 2: 'February', 3: 'March', 4: 'April',
      5: 'May', 6: 'June', 7: 'July', 8: 'August',
      9: 'September', 10: 'October', 11: 'November', 12: 'December'
    };
    
    const sheets: PayrollSheet[] = [];
    grouped.forEach((records, key) => {
      const [year, month] = key.split('-');
      const monthNum = parseInt(month);
      const firstRecord = records[0];
      
      // Transform database records to PayrollRecord format
      const payrollRecords: PayrollRecord[] = records.map(r => ({
        id: String(r.id),
        staffId: r.employeeCode || `EMP${r.employeeId}`,
        staffName: r.employeeName || 'Unknown',
        position: r.position || 'Unknown',
        project: r.projectCode || '',
        basicSalary: Number(r.basicSalary) || 0,
        housingAllowance: Number(r.housingAllowance) || 0,
        transportAllowance: Number(r.transportAllowance) || 0,
        representationAllowance: Number(r.representationAllowance) || 0,
        otherAllowances: Number(r.otherAllowances) || 0,
        grossSalary: Number(r.grossSalary) || 0,
        taxableIncomeBase: Number(r.grossSalary) || 0,
        taxRate: Number(r.taxRate) || 0,
        taxAmount: Number(r.taxAmount) || 0,
        socialSecurityRate: Number(r.socialSecurityRate) || 0,
        socialSecurityAmount: Number(r.socialSecurityAmount) || 0,
        healthInsuranceRate: Number(r.healthInsuranceRate) || 0,
        healthInsuranceAmount: Number(r.healthInsuranceAmount) || 0,
        otherDeductions: Number(r.otherDeductions) || 0,
        totalDeductions: Number(r.totalDeductions) || 0,
        netSalary: Number(r.netSalary) || 0,
        currency: r.currency || 'USD',
      }));
      
      // Calculate totals
      const totalBasicSalary = payrollRecords.reduce((sum, r) => sum + r.basicSalary, 0);
      const totalGrossSalary = payrollRecords.reduce((sum, r) => sum + r.grossSalary, 0);
      const totalDeductions = payrollRecords.reduce((sum, r) => sum + r.totalDeductions, 0);
      const totalNetSalary = payrollRecords.reduce((sum, r) => sum + r.netSalary, 0);
      
      sheets.push({
        id: key,
        month: month,
        year: year,
        monthName: monthNames[monthNum] || 'Unknown',
        records: payrollRecords,
        totalBasicSalary,
        totalGrossSalary,
        totalDeductions,
        totalNetSalary,
        preparedBy: firstRecord?.preparedBy || '',
        preparedByTitle: '',
        status: firstRecord?.status || 'draft',
        createdAt: firstRecord?.createdAt || new Date().toISOString(),
        updatedAt: firstRecord?.updatedAt || new Date().toISOString(),
        createdBy: firstRecord?.createdBy || '',
      });
    });
    
    // Sort by date descending
    return sheets.sort((a, b) => {
      const keyA = `${a.year}-${a.month}`;
      const keyB = `${b.year}-${b.month}`;
      return keyB.localeCompare(keyA);
    });
  }, [payrollData]);

  // State
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollSheet | null>(null);

  // Form state for new payroll
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [preparedBy, setPreparedBy] = useState(user?.name || '');
  const [preparedByTitle, setPreparedByTitle] = useState('');

  // Calculator state
  const [calcBasic, setCalcBasic] = useState('0');
  const [calcHousing, setCalcHousing] = useState('0');
  const [calcTransport, setCalcTransport] = useState('0');
  const [calcRepresentation, setCalcRepresentation] = useState('0');
  const [calcOther, setCalcOther] = useState('0');
  const [calcTaxableBase, setCalcTaxableBase] = useState('0');
  const [calcTaxRate, setCalcTaxRate] = useState('15');
  const [calcSocialSecRate, setCalcSocialSecRate] = useState('7');
  const [calcHealthRate, setCalcHealthRate] = useState('5');
  const [calcOtherDed, setCalcOtherDed] = useState('0');

  // Initialize preparedBy when user loads
  useEffect(() => {
    if (user?.name && !preparedBy) {
      setPreparedBy(user.name);
    }
  }, [user?.name]);

  // Translations
  const t = {
    title: language === 'en' ? 'Payroll & Allowances' : 'الرواتب والبدلات',
    subtitle: language === 'en' 
      ? 'Monthly payroll sheets and salary management' 
      : 'كشوف الرواتب الشهرية وإدارة الأجور',
    
    // Actions
    generatePayroll: language === 'en' ? 'Generate Monthly Payroll' : 'إنشاء كشف رواتب شهري',
    openCalculator: language === 'en' ? 'Salary Calculator' : 'حاسبة الرواتب',
    exportExcel: language === 'en' ? 'Export to Excel' : 'تصدير إلى Excel',
    printPDF: language === 'en' ? 'Print PDF' : 'طباعة PDF',
    save: language === 'en' ? 'Save' : 'حفظ',
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    delete: language === 'en' ? 'Delete' : 'حذف',
    view: language === 'en' ? 'View' : 'عرض',
    edit: language === 'en' ? 'Edit' : 'تعديل',
    submit: language === 'en' ? 'Submit' : 'إرسال',
    approve: language === 'en' ? 'Approve' : 'اعتماد',
    generate: language === 'en' ? 'Generate' : 'إنشاء',
    close: language === 'en' ? 'Close' : 'إغلاق',
    
    // Form labels
    monthYear: language === 'en' ? 'Month / Year' : 'الشهر / السنة',
    selectMonth: language === 'en' ? 'Select Month' : 'اختر الشهر',
    selectYear: language === 'en' ? 'Select Year' : 'اختر السنة',
    preparedBy: language === 'en' ? 'Prepared By' : 'أعده',
    approvedBy: language === 'en' ? 'Approved By' : 'اعتمده',
    jobTitle: language === 'en' ? 'Title' : 'المسمى الوظيفي',
    
    // Table columns
    staffId: language === 'en' ? 'Staff ID' : 'رقم الموظف',
    staffName: language === 'en' ? 'Staff Name' : 'اسم الموظف',
    position: language === 'en' ? 'Position' : 'المنصب',
    project: language === 'en' ? 'Project' : 'المشروع',
    basicSalary: language === 'en' ? 'Basic Salary' : 'الراتب الأساسي',
    housingAllowance: language === 'en' ? 'Housing' : 'بدل السكن',
    transportAllowance: language === 'en' ? 'Transport' : 'بدل المواصلات',
    representationAllowance: language === 'en' ? 'Representation' : 'بدل التمثيل',
    otherAllowances: language === 'en' ? 'Other' : 'بدلات أخرى',
    grossSalary: language === 'en' ? 'Gross Salary' : 'إجمالي الراتب',
    taxableIncome: language === 'en' ? 'Taxable Base' : 'الوعاء الضريبي',
    taxRate: language === 'en' ? 'Tax %' : 'الضريبة %',
    taxAmount: language === 'en' ? 'Tax' : 'الضريبة',
    socialSecurity: language === 'en' ? 'Social Sec.' : 'الضمان',
    healthInsurance: language === 'en' ? 'Health Ins.' : 'التأمين',
    deductions: language === 'en' ? 'Deductions' : 'الخصومات',
    netSalary: language === 'en' ? 'Net Salary' : 'صافي الراتب',
    total: language === 'en' ? 'TOTAL' : 'المجموع',
    
    // Calculator
    calculatorTitle: language === 'en' ? 'Salary Calculator' : 'حاسبة الرواتب',
    calculatorDesc: language === 'en' 
      ? 'Calculate salary breakdown for one staff member'
      : 'احسب تفاصيل الراتب لموظف واحد',
    allowances: language === 'en' ? 'Allowances' : 'البدلات',
    taxableIncomeBase: language === 'en' ? 'Taxable Income Base' : 'الوعاء الضريبي',
    taxCalculation: language === 'en' ? 'Tax Calculation' : 'حساب الضريبة',
    deductionsCalc: language === 'en' ? 'Deductions' : 'الخصومات',
    results: language === 'en' ? 'Results' : 'النتائج',
    otherDeductions: language === 'en' ? 'Other Deductions' : 'خصومات أخرى',
    totalDeductions: language === 'en' ? 'Total Deductions' : 'إجمالي الخصومات',
    
    // Status
    draft: language === 'en' ? 'Draft' : 'مسودة',
    submitted: language === 'en' ? 'Submitted' : 'مقدم',
    approved: language === 'en' ? 'Approved' : 'معتمد',
    
    // Payroll list
    payrollHistory: language === 'en' ? 'Payroll History' : 'سجل الرواتب',
    month: language === 'en' ? 'Month/Year' : 'الشهر/السنة',
    staffCount: language === 'en' ? 'Staff Count' : 'عدد الموظفين',
    totalAmount: language === 'en' ? 'Total Net' : 'الصافي الإجمالي',
    status: language === 'en' ? 'Status' : 'الحالة',
    actions: language === 'en' ? 'Actions' : 'الإجراءات',
    noPayrolls: language === 'en' 
      ? 'No payroll records found. Click "Generate Monthly Payroll" to start.' 
      : 'لا توجد سجلات رواتب. انقر "إنشاء كشف رواتب شهري" للبدء.',
    
    // Messages
    confirmDelete: language === 'en' ? 'Delete this payroll?' : 'حذف كشف الرواتب؟',
    approvedByPrompt: language === 'en' ? 'Approved by (name):' : 'اعتمد من قب (الاسم):',
    payrollExists: language === 'en' 
      ? 'Payroll for this month already exists' 
      : 'شف الواب لهذا الشهر موجود بالفعل',
    selectMonthError: language === 'en' 
      ? 'Please select month and enter prepared by' 
      : 'الرجاء اختيار الشهر وإدخال اسم المعد',
    
    // Months
    months: {
      '01': language === 'en' ? 'January' : 'يناير',
      '02': language === 'en' ? 'February' : 'فبراير',
      '03': language === 'en' ? 'March' : 'مارس',
      '04': language === 'en' ? 'April' : 'أبريل',
      '05': language === 'en' ? 'May' : 'مايو',
      '06': language === 'en' ? 'June' : 'يونيو',
      '07': language === 'en' ? 'July' : 'يوليو',
      '08': language === 'en' ? 'August' : 'أغسطس',
      '09': language === 'en' ? 'September' : 'سبتمبر',
      '10': language === 'en' ? 'October' : 'أكتوبر',
      '11': language === 'en' ? 'November' : 'نوفمبر',
      '12': language === 'en' ? 'December' : 'ديسمبر'
    },
    
    // Help text
    editableNote: language === 'en'
      ? 'Note: All values are editable to support multi-country policies'
      : 'ملاحظة: جميع القيم قابلة للتحرير لدعم سياسات متعددة البلدان',
    yemenPolicy: language === 'en'
      ? 'Yemen: Set Taxable Income = Basic Salary'
      : 'اليمن: اضبط الوعاء الضريب = الراتب الأساسي',
    otherPolicy: language === 'en'
      ? 'Other countries: Set Taxable Income = Gross Salary'
      : 'بلدان أخرى: اضبط الوعاء الضريبي = إجمالي الراتب'
  };

  // Calculator functions
  const calcGross = () => {
    const basic = parseFloat(calcBasic) || 0;
    const housing = parseFloat(calcHousing) || 0;
    const transport = parseFloat(calcTransport) || 0;
    const representation = parseFloat(calcRepresentation) || 0;
    const other = parseFloat(calcOther) || 0;
    return basic + housing + transport + representation + other;
  };

  const calcTax = () => {
    const base = parseFloat(calcTaxableBase) || 0;
    const rate = parseFloat(calcTaxRate) || 0;
    return (base * rate) / 100;
  };

  const calcSocialSec = () => {
    const gross = calcGross();
    const rate = parseFloat(calcSocialSecRate) || 0;
    return (gross * rate) / 100;
  };

  const calcHealth = () => {
    const gross = calcGross();
    const rate = parseFloat(calcHealthRate) || 0;
    return (gross * rate) / 100;
  };

  const calcTotalDed = () => {
    const tax = calcTax();
    const social = calcSocialSec();
    const health = calcHealth();
    const other = parseFloat(calcOtherDed) || 0;
    return tax + social + health + other;
  };

  const calcNet = () => {
    const gross = calcGross();
    const deductions = calcTotalDed();
    return gross - deductions;
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar' : 'en', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Handle generate payroll
  const handleGeneratePayroll = () => {
    if (!selectedMonth || !preparedBy) {
      toast.error(t.selectMonthError);
      return;
    }

    const monthName = t.months[selectedMonth as keyof typeof t.months];
    const monthKey = `${selectedYear}-${selectedMonth}`;

    // Check if exists
    const existing = payrolls.find(p => p.month === monthKey);
    if (existing) {
      toast.error(t.payrollExists);
      return;
    }

    generateMutation.mutate({
      organizationId: user?.organizationId || 0,
      operatingUnitId: user?.operatingUnitId || 0,
      payrollMonth: parseInt(selectedMonth),
      payrollYear: parseInt(selectedYear),
      preparedBy,
    });
  };

  // Handle delete
  const handleDelete = (id: string) => {
    if (confirm(t.confirmDelete)) {
      deleteMutation.mutate({
        id: parseInt(id),
        organizationId: user?.organizationId || 0,
        operatingUnitId: user?.operatingUnitId || 0,
      });
      if (selectedPayroll?.id === id) {
        setSelectedPayroll(null);
        setShowViewModal(false);
      }
    }
  };

  // Handle submit
  const handleSubmit = (id: string) => {
    updateStatusMutation.mutate({
      id: parseInt(id),
      organizationId: user?.organizationId || 0,
      operatingUnitId: user?.operatingUnitId || 0,
      status: 'submitted',
    });
  };

  // Handle approve
  const handleApprove = (id: string) => {
    const approvedBy = prompt(t.approvedByPrompt);
    if (approvedBy) {
      updateStatusMutation.mutate({
        id: parseInt(id),
        organizationId: user?.organizationId || 0,
        operatingUnitId: user?.operatingUnitId || 0,
        status: 'approved',
        approvedBy,
      });
    }
  };

  // Handle export
  const handleExportExcel = async (payroll: PayrollSheet) => {
    await exportPayrollToExcel(payroll);
  };

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'submitted': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'approved': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Back to Modules Button */}
      <BackToModulesButton 
        targetPath="/hr/overview"
        parentModuleName={language === 'en' ? 'HR Dashboard' : 'لوحة الموارد البشرية'}
      />

      {/* Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : 'text-left'}>
          <h2 className="text-2xl font-bold text-gray-900">{t.title}</h2>
          <p className="text-sm text-gray-600 mt-1">{t.subtitle}</p>
        </div>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => setShowGenerateModal(true)}
            className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Plus className="w-4 h-4" />
            <span>{t.generatePayroll}</span>
          </button>
          <button
            onClick={() => setShowCalculator(true)}
            className={`flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Calculator className="w-4 h-4" />
            <span>{t.openCalculator}</span>
          </button>
        </div>
      </div>

      {/* Payroll History List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className={`text-lg font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.payrollHistory}
          </h3>
        </div>
        
        {payrolls.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <Calculator className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>{t.noPayrolls}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className={`px-4 py-3 text-sm font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.month}
                  </th>
                  <th className={`px-4 py-3 text-sm font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.staffCount}
                  </th>
                  <th className={`px-4 py-3 text-sm font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.totalAmount}
                  </th>
                  <th className={`px-4 py-3 text-sm font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.preparedBy}
                  </th>
                  <th className={`px-4 py-3 text-sm font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.status}
                  </th>
                  <th className={`px-4 py-3 text-sm font-semibold text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payrolls.map((payroll) => (
                  <tr key={payroll.id} className="hover:bg-gray-50">
                    <td className={`px-4 py-3 text-sm text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {payroll.monthName} {payroll.year}
                    </td>
                    <td className={`px-4 py-3 text-sm text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {payroll.records.length}
                    </td>
                    <td className={`px-4 py-3 text-sm font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {formatCurrency(payroll.totalNetSalary, 'USD')}
                    </td>
                    <td className={`px-4 py-3 text-sm text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {payroll.preparedBy}
                    </td>
                    <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      <span className={`inline-block px-2 py-1 rounded border text-xs font-medium ${getStatusColor(payroll.status)}`}>
                        {t[payroll.status as keyof typeof t]}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                        <button
                          onClick={() => {
                            setSelectedPayroll(payroll);
                            setShowViewModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-700 p-1"
                          title={t.view}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {payroll.status === 'draft' && (
                          <>
                            <button
                              onClick={() => handleSubmit(payroll.id)}
                              className="text-green-600 hover:text-green-700 p-1"
                              title={t.submit}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {payroll.status === 'submitted' && (
                          <button
                            onClick={() => handleApprove(payroll.id)}
                            className="text-green-600 hover:text-green-700 p-1"
                            title={t.approve}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(payroll.id)}
                          className="text-red-600 hover:text-red-700 p-1"
                          title={t.delete}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleExportExcel(payroll)}
                          className="text-gray-600 hover:text-gray-700 p-1"
                          title={t.exportExcel}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generate Payroll Modal */}
      {showGenerateModal && (
        <ModalOverlay onClose={() => setShowGenerateModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{t.generatePayroll}</h3>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* Month Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.selectMonth}
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t.selectMonth}</option>
                  {Object.entries(t.months)
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                </select>
              </div>

              {/* Year Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.selectYear}
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                </select>
              </div>

              {/* Prepared By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.preparedBy}
                </label>
                <input
                  type="text"
                  value={preparedBy}
                  onChange={(e) => setPreparedBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.jobTitle} ({language === 'en' ? 'Optional' : 'اختياري'})
                </label>
                <input
                  type="text"
                  value={preparedByTitle}
                  onChange={(e) => setPreparedByTitle(e.target.value)}
                  placeholder={language === 'en' ? 'e.g., HR Manager' : 'مثال: مدير الموارد البشرية'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleGeneratePayroll}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                {t.generate}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Calculator Modal */}
      <PayrollCalculatorModal
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
        language={language}
        isRTL={isRTL}
        calcBasic={calcBasic}
        setCalcBasic={setCalcBasic}
        calcHousing={calcHousing}
        setCalcHousing={setCalcHousing}
        calcTransport={calcTransport}
        setCalcTransport={setCalcTransport}
        calcRepresentation={calcRepresentation}
        setCalcRepresentation={setCalcRepresentation}
        calcOther={calcOther}
        setCalcOther={setCalcOther}
        calcTaxableBase={calcTaxableBase}
        setCalcTaxableBase={setCalcTaxableBase}
        calcTaxRate={calcTaxRate}
        setCalcTaxRate={setCalcTaxRate}
        calcSocialSecRate={calcSocialSecRate}
        setCalcSocialSecRate={setCalcSocialSecRate}
        calcHealthRate={calcHealthRate}
        setCalcHealthRate={setCalcHealthRate}
        calcOtherDed={calcOtherDed}
        setCalcOtherDed={setCalcOtherDed}
        formatCurrency={formatCurrency}
      />

      {/* View Payroll Modal */}
      <PayrollViewModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        payroll={selectedPayroll}
        language={language}
        isRTL={isRTL}
        formatCurrency={formatCurrency}
        onPrint={handlePrint}
      />
    </div>
  );
}