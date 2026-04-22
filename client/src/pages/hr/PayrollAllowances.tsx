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
import { Link } from 'wouter';

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
, ArrowLeft} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { 
 PayrollSheet, 
 PayrollRecord,
} from '@/app/services/hrService';
import { exportPayrollToExcel } from '@/app/utils/excelExport';
import { PayrollCalculatorModal } from './PayrollCalculatorModal';
import { PayrollViewModal } from './PayrollViewModal';
import { ModalOverlay } from '@/app/components/ui/ModalOverlay';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";
export function PayrollAllowances() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const { currentOrganizationId } = useOrganization();
 const { currentOperatingUnitId } = useOperatingUnit();
 const { user } = useAuth();

 // tRPC queries and mutations
 const { data: payrollData, refetch: refetchPayrolls, isLoading: isLoadingPayrolls } = trpc.hrPayroll.getAll.useQuery(
 {
 organizationId: currentOrganizationId!,
 operatingUnitId: currentOperatingUnitId!,
 },
 { enabled: !!currentOrganizationId && !!currentOperatingUnitId }
 );

 const generateMutation = trpc.hrPayroll.generateFromSalaryScale.useMutation({
 onSuccess: () => {
 toast.success(t.hrPayroll.payrollGeneratedSuccessfully);
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
 toast.success(t.hrPayroll.payrollDeleted);
 refetchPayrolls();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const updateStatusMutation = trpc.hrPayroll.updateStatus.useMutation({
 onSuccess: () => {
 toast.success(t.hrPayroll.statusUpdated);
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
 taxAmount: Number(r.taxDeduction) || 0,
 socialSecurityAmount: Number(r.socialSecurityDeduction) || 0,
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
 const labels = {
 title: t.hrPayroll.payrollAllowances,
 subtitle: t.hr.payrollSubtitle,
 
 // Actions
 generatePayroll: t.hrPayroll.generateMonthlyPayroll,
 openCalculator: t.hrPayroll.salaryCalculator,
 exportExcel: t.hrPayroll.exportToExcel,
 printPDF: t.hrPayroll.printPdf,
 save: t.hrPayroll.save,
 cancel: t.hrPayroll.cancel,
 delete: t.hrPayroll.delete,
 view: t.hrPayroll.view,
 edit: t.hrPayroll.edit,
 submit: t.hrPayroll.submit,
 approve: t.hrPayroll.approve,
 generate: t.hrPayroll.generate,
 close: t.hrPayroll.close,
 
 // Form labels
 monthYear: t.hrPayroll.monthYear,
 selectMonth: t.hrPayroll.selectMonth,
 selectYear: t.hrPayroll.selectYear,
 preparedBy: t.hrPayroll.preparedBy,
 approvedBy: t.hrPayroll.approvedBy,
 jobTitle: t.hrPayroll.title,
 
 // Table columns
 staffId: t.hrPayroll.staffId,
 staffName: t.hrPayroll.staffName,
 position: t.hrPayroll.position,
 project: t.hrPayroll.project,
 basicSalary: t.hrPayroll.basicSalary,
 housingAllowance: t.hrPayroll.housing,
 transportAllowance: t.hrPayroll.transport,
 representationAllowance: t.hrPayroll.representation,
 otherAllowances: t.hrPayroll.other,
 grossSalary: t.hrPayroll.grossSalary,
 taxableIncome: t.hrPayroll.taxableBase,
 taxRate: t.hrPayroll.tax,
 taxAmount: t.hrPayroll.tax1,
 socialSecurity: t.hrPayroll.socialSec,
 healthInsurance: t.hrPayroll.healthIns,
 deductions: t.hrPayroll.deductions,
 netSalary: t.hrPayroll.netSalary,
 total: t.hrPayroll.total,
 
 // Calculator
 calculatorTitle: t.hrPayroll.salaryCalculator,
 calculatorDesc: 'Calculate salary breakdown for one staff member',
 allowances: t.hrPayroll.allowances,
 taxableIncomeBase: t.hrPayroll.taxableIncomeBase,
 taxCalculation: t.hrPayroll.taxCalculation,
 deductionsCalc: t.hrPayroll.deductions,
 results: t.hrPayroll.results,
 otherDeductions: t.hrPayroll.otherDeductions,
 totalDeductions: t.hrPayroll.totalDeductions,
 
 // Status
 draft: t.hrPayroll.draft,
 submitted: t.hrPayroll.submitted,
 approved: t.hrPayroll.approved,
 
 // Payroll list
 payrollHistory: t.hrPayroll.payrollHistory,
 month: t.hrPayroll.monthyear,
 staffCount: t.hrPayroll.staffCount,
 totalAmount: t.hrPayroll.totalNet,
 status: t.hrPayroll.status,
 actions: t.hrPayroll.actions,
 noPayrolls: language === 'en' 
 ? 'No payroll records found. Click "Generate Monthly Payroll" to start.' 
 : 'لا توجد سجلات رواتب. انقر "إنشاء كشف رواتب شهري" للبدء.',
 
 // Messages
 confirmDelete: t.hrPayroll.deleteThisPayroll,
 approvedByPrompt: t.hrPayroll.approvedByName,
 payrollExists: 'Payroll for this month already exists',
 selectMonthError: 'Please select month and enter prepared by',
 
 // Months
 months: {
 '01': t.hrPayroll.january,
 '02': t.hrPayroll.february,
 '03': t.hrPayroll.march,
 '04': t.hrPayroll.april,
 '05': t.hrPayroll.may,
 '06': t.hrPayroll.june,
 '07': t.hrPayroll.july,
 '08': t.hrPayroll.august,
 '09': t.hrPayroll.september,
 '10': t.hrPayroll.october,
 '11': t.hrPayroll.november,
 '12': t.hrPayroll.december
 },
 
 // Help text
 editableNote: 'Note: All values are editable to support multi-country policies',
 yemenPolicy: 'Yemen: Set Taxable Income = Basic Salary',
 otherPolicy: 'Other countries: Set Taxable Income = Gross Salary'
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
 return new Intl.NumberFormat(t.hrPayroll.en, {
 style: 'currency',
 currency: currency,
 minimumFractionDigits: 2
 }).format(amount);
 };

 // Handle generate payroll
 const handleGeneratePayroll = () => {
 if (!selectedMonth || !preparedBy) {
 toast.error(labels.selectMonthError);
 return;
 }

 const monthName = labels.months[selectedMonth as keyof typeof labels.months];
 const monthKey = `${selectedYear}-${selectedMonth}`;

 // Check if exists
 const existing = payrolls.find(p => p.month === monthKey);
 if (existing) {
 toast.error(labels.payrollExists);
 return;
 }

 generateMutation.mutate({
 organizationId: currentOrganizationId!,
 operatingUnitId: user?.operatingUnitId || 0,
 payrollMonth: parseInt(selectedMonth),
 payrollYear: parseInt(selectedYear),
 preparedBy,
 });
 };

 // Handle delete
 const handleDelete = (id: string) => {
 if (confirm(labels.confirmDelete)) {
 deleteMutation.mutate({
 id: parseInt(id),
 organizationId: currentOrganizationId!,
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
 organizationId: currentOrganizationId!,
 operatingUnitId: user?.operatingUnitId || 0,
 status: 'submitted',
 });
 };

 // Handle approve
 const handleApprove = (id: string) => {
 const approvedBy = prompt(labels.approvedByPrompt);
 if (approvedBy) {
 updateStatusMutation.mutate({
 id: parseInt(id),
 organizationId: currentOrganizationId!,
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
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <BackButton href="/organization/hr" label={t.hrPayroll.hrDashboard} />

 {/* Back to Modules Button */}
 

 {/* Header */}
 <div className="flex items-center justify-between">
 <div className={'text-start'}>
 <h2 className="text-2xl font-bold text-gray-900">{labels.title}</h2>
 <p className="text-sm text-gray-600 mt-1">{labels.subtitle}</p>
 </div>
 <div className="flex items-center gap-2">
 <button
 onClick={() => setShowGenerateModal(true)}
 className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors`}
 >
 <Plus className="w-4 h-4" />
 <span>{labels.generatePayroll}</span>
 </button>
 <button
 onClick={() => setShowCalculator(true)}
 className={`flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors`}
 >
 <Calculator className="w-4 h-4" />
 <span>{labels.openCalculator}</span>
 </button>
 </div>
 </div>

 {/* Payroll History List */}
 <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
 <div className="px-6 py-4 border-b border-gray-200">
 <h3 className={`text-lg font-semibold text-gray-900 text-start`}>
 {labels.payrollHistory}
 </h3>
 </div>
 
 {payrolls.length === 0 ? (
 <div className="px-6 py-12 text-center text-gray-500">
 <Calculator className="w-12 h-12 mx-auto mb-3 text-gray-400" />
 <p>{labels.noPayrolls}</p>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead className="bg-gray-50 border-b border-gray-200">
 <tr>
 <th className={`px-4 py-3 text-sm font-semibold text-gray-700 text-start`}>
 {labels.month}
 </th>
 <th className={`px-4 py-3 text-sm font-semibold text-gray-700 text-start`}>
 {labels.staffCount}
 </th>
 <th className={`px-4 py-3 text-sm font-semibold text-gray-700 text-start`}>
 {labels.totalAmount}
 </th>
 <th className={`px-4 py-3 text-sm font-semibold text-gray-700 text-start`}>
 {labels.preparedBy}
 </th>
 <th className={`px-4 py-3 text-sm font-semibold text-gray-700 text-start`}>
 {labels.status}
 </th>
 <th className={`px-4 py-3 text-sm font-semibold text-gray-700 text-start`}>
 {labels.actions}
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200">
 {payrolls.map((payroll) => (
 <tr key={payroll.id} className="hover:bg-gray-50">
 <td className={`px-4 py-3 text-sm text-gray-900 text-start`}>
 {payroll.monthName} {payroll.year}
 </td>
 <td className={`px-4 py-3 text-sm text-gray-700 text-start`}>
 {payroll.records.length}
 </td>
 <td className={`px-4 py-3 text-sm font-semibold text-gray-900 text-start`}>
 {formatCurrency(payroll.totalNetSalary, 'USD')}
 </td>
 <td className={`px-4 py-3 text-sm text-gray-700 text-start`}>
 {payroll.preparedBy}
 </td>
 <td className={`px-4 py-3 text-sm text-start`}>
 <span className={`inline-block px-2 py-1 rounded border text-xs font-medium ${getStatusColor(payroll.status)}`}>
 {t[payroll.status as keyof typeof t]}
 </span>
 </td>
 <td className={`px-4 py-3 text-sm text-start`}>
 <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
 <button
 onClick={() => {
 setSelectedPayroll(payroll);
 setShowViewModal(true);
 }}
 className="text-blue-600 hover:text-blue-700 p-1"
 title={labels.view}
 >
 <Eye className="w-4 h-4" />
 </button>
 {payroll.status === 'draft' && (
 <>
 <button
 onClick={() => handleSubmit(payroll.id)}
 className="text-green-600 hover:text-green-700 p-1"
 title={labels.submit}
 >
 <Check className="w-4 h-4" />
 </button>
 </>
 )}
 {payroll.status === 'submitted' && (
 <button
 onClick={() => handleApprove(payroll.id)}
 className="text-green-600 hover:text-green-700 p-1"
 title={labels.approve}
 >
 <Check className="w-4 h-4" />
 </button>
 )}
 <button
 onClick={() => handleDelete(payroll.id)}
 className="text-red-600 hover:text-red-700 p-1"
 title={labels.delete}
 >
 <Trash2 className="w-4 h-4" />
 </button>
 <button
 onClick={() => handleExportExcel(payroll)}
 className="text-gray-600 hover:text-gray-700 p-1"
 title={labels.exportExcel}
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
 <h3 className="text-lg font-semibold text-gray-900">{labels.generatePayroll}</h3>
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
 {labels.selectMonth}
 </label>
 <select
 value={selectedMonth}
 onChange={(e) => setSelectedMonth(e.target.value)}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 >
 <option value="">{labels.selectMonth}</option>
 {Object.entries(labels.months)
 .sort((a, b) => a[0].localeCompare(b[0]))
 .map(([value, label]) => (
 <option key={value} value={value}>{label}</option>
 ))}
 </select>
 </div>

 {/* Year Selection */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {labels.selectYear}
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
 {labels.preparedBy}
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
 {labels.jobTitle} ({t.hrPayroll.optional})
 </label>
 <input
 type="text"
 value={preparedByTitle}
 onChange={(e) => setPreparedByTitle(e.target.value)}
 placeholder={t.hrPayroll.egHrManager}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 />
 </div>
 </div>
 <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
 <button
 onClick={() => setShowGenerateModal(false)}
 className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
 >
 {labels.cancel}
 </button>
 <button
 onClick={handleGeneratePayroll}
 className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
 >
 {labels.generate}
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