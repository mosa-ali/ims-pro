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
import { useAuth } from '@/_core/hooks/useAuth';
import { PayrollSlipPrintModal } from '../modals/PayrollSlipPrintModal';

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

export function SalaryCompensationCard({ employee, language, isRTL, onEmployeeUpdate }: Props) {
  const { user } = useAuth();
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<any>(null);

  // Get organization context
  const organizationId = employee.organizationId || user?.organizationId || 1;

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

  const t = {
    title: language === 'en' ? 'Salary & Compensation' : 'الراتب والتعويضات',
    subtitle: language === 'en' ? 'Read-only - Managed centrally via Salary Scale Table' : 'قراءة فقط - تُدار مركزياً عبر جدول سلم الرواتب',
    
    currentSalary: language === 'en' ? 'Current Salary Structure' : 'هيكل الراتب الحالي',
    readOnlyNotice: language === 'en' 
      ? '🔒 Salary data is managed centrally via the Salary Scale Table'
      : '🔒 يتم إدارة بيانات الراتب مركزياً عبر جدول سلم الرواتب',
    grade: language === 'en' ? 'Grade' : 'الدرجة',
    step: language === 'en' ? 'Step' : 'الخطوة',
    baseSalary: language === 'en' ? 'Base Salary' : 'الراتب الأساسي',
    allowances: language === 'en' ? 'Allowances' : 'البدلات',
    housing: language === 'en' ? 'Housing' : 'السكن',
    transport: language === 'en' ? 'Transport' : 'المواصلات',
    representation: language === 'en' ? 'Representation' : 'التمثيل',
    other: language === 'en' ? 'Other' : 'أخرى',
    grossSalary: language === 'en' ? 'Gross Salary' : 'إجمالي الراتب',
    effectiveDate: language === 'en' ? 'Effective Date' : 'تاريخ السريان',
    status: language === 'en' ? 'Status' : 'الحالة',
    
    // Payroll Slips
    payrollSlips: language === 'en' ? 'Payroll Slips (Read-only)' : 'كشوف الرواتب (قراءة فقط)',
    payrollSlipsSubtitle: language === 'en' ? 'Generated from Payroll & Allowances module' : 'تم إنشاؤها من وحدة كشف الرواتب والبدلات',
    noPayrollSlips: language === 'en' ? 'No payroll slips available' : 'لا توجد كشوف رواتب متاحة',
    
    // Status messages
    loading: language === 'en' ? 'Loading salary data...' : 'جاري تحميل بيانات الراتب...',
    noSalaryData: language === 'en' ? 'No salary record found' : 'لم يتم العثور على سجل راتب',
    noSalaryDataHint: language === 'en' 
      ? 'This employee does not have an active salary record in the Salary Scale Table. Please configure their salary in the Salary Scale Table module.'
      : 'هذا الموظف ليس لديه سجل راتب نشط في جدول سلم الرواتب. يرجى تكوين راتبه في وحدة جدول سلم الرواتب.',
    draftStatus: language === 'en' ? 'Draft - Pending Activation' : 'مسودة - في انتظار التفعيل',
    activeStatus: language === 'en' ? 'Active' : 'نشط',
    
    note: language === 'en' 
      ? '📌 Note: Payroll reads ONLY from approved salary scale records'
      : '📌 ملاحظة: كشف الرواتب يقرأ فقط من سجلات سلم الرواتب المعتمدة'
  };

  const formatCurrency = (amount: string | number | null, currency: string = 'USD') => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
    return new Intl.NumberFormat(language === 'ar' ? 'ar' : 'en', {
      style: 'currency',
      currency: currency
    }).format(numAmount);
  };

  // Calculate gross salary
  const calculateGrossSalary = () => {
    if (!salaryRecord) return 0;
    const base = parseFloat(salaryRecord.approvedGrossSalary || '0');
    const housing = parseFloat(salaryRecord.housingAllowance || '0');
    const transport = parseFloat(salaryRecord.transportAllowance || '0');
    const representation = parseFloat(salaryRecord.representationAllowance || '0');
    const other = parseFloat(salaryRecord.otherAllowances || '0');
    return base + housing + transport + representation + other;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center gap-3 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>{t.loading}</span>
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
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <h3 className="text-lg font-semibold text-gray-900">{t.currentSalary}</h3>
              <p className="text-sm text-gray-600 mt-1">{t.subtitle}</p>
            </div>
          </div>

          <div className="p-6">
            <div className={`flex flex-col items-center justify-center py-8 text-center ${isRTL ? 'text-right' : 'text-left'}`}>
              <AlertCircle className="w-12 h-12 text-yellow-500 mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">{t.noSalaryData}</h4>
              <p className="text-sm text-gray-600 max-w-md">{t.noSalaryDataHint}</p>
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
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <h3 className="text-lg font-semibold text-gray-900">{t.currentSalary}</h3>
            <p className="text-sm text-gray-600 mt-1">{t.subtitle}</p>
          </div>
        </div>

        {/* Read-Only Notice */}
        <div className="px-6 pt-4">
          <div className={`p-3 bg-blue-50 border border-blue-200 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
            <p className="text-sm text-blue-900 font-medium">{t.readOnlyNotice}</p>
          </div>
        </div>

        {/* Status Badge */}
        {salaryRecord.status === 'draft' && (
          <div className="px-6 pt-4">
            <div className={`p-3 bg-yellow-50 border border-yellow-200 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="text-sm text-yellow-800 font-medium">⚠️ {t.draftStatus}</p>
            </div>
          </div>
        )}

        <div className="p-6 space-y-4">
          {/* Base Salary */}
          <div className={`p-4 bg-blue-50 border border-blue-200 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
            <p className="text-sm text-blue-900 font-semibold mb-2">{t.baseSalary}</p>
            <p className="text-3xl font-bold text-blue-600">
              {formatCurrency(salaryRecord.approvedGrossSalary, currency)}
            </p>
            <p className="text-xs text-blue-700 mt-1">
              {t.grade}: {salaryRecord.gradeCode} | {t.step}: {salaryRecord.step}
            </p>
          </div>

          {/* Allowances Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className={`p-3 bg-gray-50 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="text-xs text-gray-500">{t.housing}</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatCurrency(salaryRecord.housingAllowance, currency)}
              </p>
            </div>
            <div className={`p-3 bg-gray-50 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="text-xs text-gray-500">{t.transport}</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatCurrency(salaryRecord.transportAllowance, currency)}
              </p>
            </div>
            <div className={`p-3 bg-gray-50 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="text-xs text-gray-500">{t.representation}</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatCurrency(salaryRecord.representationAllowance, currency)}
              </p>
            </div>
            <div className={`p-3 bg-gray-50 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="text-xs text-gray-500">{t.other}</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatCurrency(salaryRecord.otherAllowances, currency)}
              </p>
            </div>
          </div>

          {/* Gross Salary */}
          <div className={`p-4 bg-green-50 border border-green-200 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
            <p className="text-xs text-green-700">{t.grossSalary}</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(grossSalary, currency)}
            </p>
          </div>
        </div>
      </div>

      {/* Payroll Slips Section */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className={`text-lg font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.payrollSlips}
          </h3>
          <p className={`text-sm text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.payrollSlipsSubtitle}
          </p>
        </div>
        <div className="p-6">
          <div className={`text-center py-8 text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p>{t.noPayrollSlips}</p>
          </div>
        </div>
      </div>

      {/* Note */}
      <div className={`p-3 bg-gray-50 border border-gray-200 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
        <p className="text-xs text-gray-600">{t.note}</p>
      </div>
    </div>
  );
}

export default SalaryCompensationCard;
