/**
 * ============================================================================
 * 3. SALARY & COMPENSATION CARD
 * ============================================================================
 * READ-ONLY DISPLAY - Reads from Salary Scale Table (Single Source of Truth)
 * All salary editing must be done via Salary Scale Table module
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Eye, Printer, Download, FileText, Lock, Loader2, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';
import { PayrollSlipPrintModal } from '../modals/PayrollSlipPrintModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface Props {
 employee: {
 id: number;
 staffId: string;
 fullName: string;
 position?: string;
 department?: string;
 organizationId?: number;
 };
 language: string;
 isRTL: boolean;
 onEmployeeUpdate?: () => void;
}

export function SalaryCompensationCard({
 employee, language, isRTL, onEmployeeUpdate }: Props) {
 const { t } = useTranslation();
 const { currentOrganizationId } = useOrganization();
 const { currentOperatingUnitId } = useOperatingUnit();
 const [showPrintModal, setShowPrintModal] = useState(false);
 const [selectedSlip, setSelectedSlip] = useState<any>(null);

 // Get organization context for proper data isolation
 const organizationId = employee.organizationId || currentOrganizationId!;

 // Fetch salary data from Salary Scale Table via tRPC
 const { data: salaryRecord, isLoading, error } = trpc.hrSalaryScale.getActiveByEmployeeId.useQuery({
 employeeId: employee.id,
 organizationId,
 }, {
 enabled: !!employee.id && !!organizationId,
 });

 // Fetch salary history
 const { data: salaryHistory = [] } = trpc.hrSalaryScale.getHistoryByEmployeeId.useQuery({
 employeeId: employee.id,
 organizationId,
 }, {
 enabled: !!employee.id && !!organizationId,
 });

 const localT = {
 title: t.hrEmployeeCards.salaryCompensation,
 subtitle: t.hrEmployeeCards.readonlyManagedCentrallyViaSalaryScale,
 
 currentSalary: t.hrEmployeeCards.currentSalaryStructure,
 readOnlyNotice: '🔒 ' + t.hr.salaryDataManagedCentrally,
 grade: t.hrEmployeeCards.grade,
 step: t.hrEmployeeCards.step,
 baseSalary: t.hrEmployeeCards.baseSalary,
 allowances: t.hrEmployeeCards.allowances,
 housing: t.hrEmployeeCards.housing,
 transport: t.hrEmployeeCards.transport,
 representation: t.hrEmployeeCards.representation,
 other: t.hrEmployeeCards.other,
 grossSalary: t.hrEmployeeCards.grossSalary,
 effectiveDate: t.hrEmployeeCards.effectiveDate,
 status: t.hrEmployeeCards.status,
 
 // Payroll Slips
 payrollSlips: t.hrEmployeeCards.payrollSlipsReadonly,
 payrollSlipsSubtitle: t.hrEmployeeCards.generatedFromPayrollAllowancesModule,
 noPayrollSlips: t.hrEmployeeCards.noPayrollSlipsAvailable,
 
 // Status messages
 loading: t.hrEmployeeCards.loadingSalaryData,
 noSalaryData: t.hrEmployeeCards.noSalaryRecordFound,
 noSalaryDataHint: 'This employee does not have an active salary record in the Salary Scale Table. Please configure their salary in the Salary Scale Table module.',
 draftStatus: t.hrEmployeeCards.draftPendingActivation,
 activeStatus: t.hrEmployeeCards.active,
 
 note: '📌 Note: Payroll reads ONLY from approved salary scale records'
 };

 const formatCurrency = (amount: string | number | null, currency: string = 'USD') => {
 const numAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
 return new Intl.NumberFormat(t.hrEmployeeCards.en, {
 style: 'currency',
 currency: currency
 }).format(numAmount);
 };

 // Calculate gross salary
 const calculateGrossSalary = () => {
 if (!salaryRecord) return 0;
 const base = parseFloat(salaryRecord.baseSalary || '0');
 const housing = parseFloat(salaryRecord.housingAllowance || '0');
 const transport = parseFloat(salaryRecord.transportAllowance || '0');
 const representation = parseFloat(salaryRecord.representationAllowance || '0');
 const other = parseFloat(salaryRecord.otherAllowances || '0');
 return base + housing + transport + representation + other;
 };

 // Loading state
 if (isLoading) {
 return (
 <div className="bg-white rounded-lg border border-gray-200 p-8" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="flex items-center justify-center gap-3 text-gray-500">
 <Loader2 className="w-6 h-6 animate-spin" />
 <span>{localT.loading}</span>
 </div>
 </div>
 );
 }

 // No salary data state
 if (!salaryRecord) {
 return (
 <div className="space-y-6">
 <div className="bg-white rounded-lg border border-gray-200">
 <div className="px-6 py-4 border-b border-gray-200">
 <div className={'text-start'}>
 <h3 className="text-lg font-semibold text-gray-900">{localT.currentSalary}</h3>
 <p className="text-sm text-gray-600 mt-1">{localT.subtitle}</p>
 </div>
 </div>

 <div className="p-6">
 <div className={`flex flex-col items-center justify-center py-8 text-center text-start`}>
 <AlertCircle className="w-12 h-12 text-yellow-500 mb-4" />
 <h4 className="text-lg font-medium text-gray-900 mb-2">{localT.noSalaryData}</h4>
 <p className="text-sm text-gray-600 max-w-md">{localT.noSalaryDataHint}</p>
 </div>
 </div>
 </div>
 </div>
 );
 }

 const grossSalary = calculateGrossSalary();
 const currency = salaryRecord.currency || 'USD';

 return (
 <div className="space-y-6">
 {/* Current Salary */}
 <div className="bg-white rounded-lg border border-gray-200">
 <div className="px-6 py-4 border-b border-gray-200">
 <div className={'text-start'}>
 <h3 className="text-lg font-semibold text-gray-900">{localT.currentSalary}</h3>
 <p className="text-sm text-gray-600 mt-1">{localT.subtitle}</p>
 </div>
 </div>

 {/* Read-Only Notice */}
 <div className="px-6 pt-4">
 <div className={`p-3 bg-blue-50 border border-blue-200 rounded-lg text-start`}>
 <p className="text-sm text-blue-900 font-medium">{localT.readOnlyNotice}</p>
 </div>
 </div>

 {/* Status Badge */}
 {salaryRecord.status === 'draft' && (
 <div className="px-6 pt-4">
 <div className={`p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-start`}>
 <p className="text-sm text-yellow-800 font-medium">⚠️ {localT.draftStatus}</p>
 </div>
 </div>
 )}

 <div className="p-6 space-y-4">
 {/* Base Salary */}
 <div className={`p-4 bg-blue-50 border border-blue-200 rounded-lg text-start`}>
 <p className="text-sm text-blue-900 font-semibold mb-2">{localT.baseSalary}</p>
 <p className="text-3xl font-bold text-blue-600">
 {formatCurrency(salaryRecord.approvedGrossSalary, currency)}
 </p>
 <p className="text-xs text-blue-700 mt-1">
 {localT.grade}: {salaryRecord.gradeCode} | {localT.step}: {salaryRecord.step}
 </p>
 </div>

 {/* Allowances Grid */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
 <div className={`p-3 bg-gray-50 rounded-lg text-start`}>
 <p className="text-xs text-gray-500">{localT.housing}</p>
 <p className="text-sm font-semibold text-gray-900">
 {formatCurrency(salaryRecord.housingAllowance, currency)}
 </p>
 </div>
 <div className={`p-3 bg-gray-50 rounded-lg text-start`}>
 <p className="text-xs text-gray-500">{localT.transport}</p>
 <p className="text-sm font-semibold text-gray-900">
 {formatCurrency(salaryRecord.transportAllowance, currency)}
 </p>
 </div>
 <div className={`p-3 bg-gray-50 rounded-lg text-start`}>
 <p className="text-xs text-gray-500">{localT.representation}</p>
 <p className="text-sm font-semibold text-gray-900">
 {formatCurrency(salaryRecord.representationAllowance, currency)}
 </p>
 </div>
 <div className={`p-3 bg-gray-50 rounded-lg text-start`}>
 <p className="text-xs text-gray-500">{localT.other}</p>
 <p className="text-sm font-semibold text-gray-900">
 {formatCurrency(salaryRecord.otherAllowances, currency)}
 </p>
 </div>
 </div>

 {/* Gross Salary */}
 <div className={`p-4 bg-green-50 border border-green-200 rounded-lg text-start`}>
 <p className="text-xs text-green-700">{localT.grossSalary}</p>
 <p className="text-2xl font-bold text-green-600">
 {formatCurrency(grossSalary, currency)}
 </p>
 </div>
 </div>
 </div>

 {/* Payroll Slips Section */}
 <div className="bg-white rounded-lg border border-gray-200">
 <div className="px-6 py-4 border-b border-gray-200">
 <h3 className={`text-lg font-semibold text-gray-900 text-start`}>
 {localT.payrollSlips}
 </h3>
 <p className={`text-sm text-gray-500 text-start`}>
 {localT.payrollSlipsSubtitle}
 </p>
 </div>
 <div className="p-6">
 <div className={`text-center py-8 text-gray-500 text-start`}>
 <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
 <p>{localT.noPayrollSlips}</p>
 </div>
 </div>
 </div>

 {/* Note */}
 <div className={`p-3 bg-gray-50 border border-gray-200 rounded-lg text-start`}>
 <p className="text-xs text-gray-600">{localT.note}</p>
 </div>
 </div>
 );
}

export default SalaryCompensationCard;
