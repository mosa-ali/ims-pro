/**
 * Generate Payroll Modal
 * Generates payroll records from Salary Scale Table for all active employees
 */

import { useState } from 'react';
import { X, Loader2, AlertCircle, CheckCircle, Calendar, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface GeneratePayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: number;
  operatingUnitId: number;
  selectedMonth: string; // Format: "YYYY-MM"
  onSuccess: () => void;
}

export function GeneratePayrollModal({
  isOpen,
  onClose,
  organizationId,
  operatingUnitId,
  selectedMonth,
  onSuccess,
}: GeneratePayrollModalProps) {
  const { language, isRTL } = useLanguage();
  const [isGenerating, setIsGenerating] = useState(false);

  // Parse month and year from selectedMonth with fallback to current date
  const parseMonth = () => {
    if (!selectedMonth || !selectedMonth.includes('-')) {
      const now = new Date();
      return [now.getFullYear(), now.getMonth() + 1];
    }
    const parts = selectedMonth.split('-').map(Number);
    if (isNaN(parts[0]) || isNaN(parts[1])) {
      const now = new Date();
      return [now.getFullYear(), now.getMonth() + 1];
    }
    return parts;
  };
  const [year, month] = parseMonth();
  
  const monthNames = language === 'en' 
    ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    : ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  const generateMutation = trpc.hrPayroll.generateFromSalaryScale.useMutation({
    onSuccess: (data) => {
      setIsGenerating(false);
      toast.success(
        language === 'en' 
          ? `Successfully generated ${data.count} payroll records` 
          : `تم إنشاء ${data.count} سجل رواتب بنجاح`
      );
      onSuccess();
      onClose();
    },
    onError: (error) => {
      setIsGenerating(false);
      toast.error(
        language === 'en' 
          ? `Failed to generate payroll: ${error.message}` 
          : `فشل في إنشاء كشف الرواتب: ${error.message}`
      );
    },
  });

  const handleGenerate = () => {
    setIsGenerating(true);
    generateMutation.mutate({
      organizationId,
      operatingUnitId,
      payrollMonth: month,
      payrollYear: year,
    });
  };

  if (!isOpen) return null;

  const t = {
    title: language === 'en' ? 'Generate Payroll' : 'إنشاء كشف الرواتب',
    subtitle: language === 'en' 
      ? 'Generate payroll records for all active employees from Salary Scale Table' 
      : 'إنشاء سجلات الرواتب لجميع الموظفين النشطين من جدول سلم الرواتب',
    selectedPeriod: language === 'en' ? 'Selected Period' : 'الفترة المحددة',
    warning: language === 'en' 
      ? 'This will create payroll records for all active employees based on their salary scale data. Existing payroll records for this period will prevent generation.' 
      : 'سيؤدي هذا إلى إنشاء سجلات رواتب لجميع الموظفين النشطين بناءً على بيانات سلم الرواتب الخاصة بهم. ستمنع سجلات الرواتب الموجودة لهذه الفترة عملية الإنشاء.',
    dataSource: language === 'en' ? 'Data Source' : 'مصدر البيانات',
    salaryScaleTable: language === 'en' ? 'Salary Scale Table' : 'جدول سلم الرواتب',
    employeeProfiles: language === 'en' ? 'Employee Profiles' : 'ملفات الموظفين',
    generate: language === 'en' ? 'Generate Payroll' : 'إنشاء كشف الرواتب',
    generating: language === 'en' ? 'Generating...' : 'جاري الإنشاء...',
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 ${isRTL ? 'text-right' : 'text-left'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{t.title}</h2>
            <p className="text-sm text-gray-600 mt-1">{t.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Selected Period */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">{t.selectedPeriod}</p>
                <p className="text-lg font-bold text-blue-900">
                  {monthNames[month - 1]} {year}
                </p>
              </div>
            </div>
          </div>

          {/* Data Source Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-3">{t.dataSource}</p>
            <div className="space-y-2">
              <div className={`flex items-center gap-2 text-sm text-gray-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>{t.salaryScaleTable}</span>
              </div>
              <div className={`flex items-center gap-2 text-sm text-gray-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Users className="w-4 h-4 text-blue-500" />
                <span>{t.employeeProfiles}</span>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">{t.warning}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 p-6 border-t border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t.generating}</span>
              </>
            ) : (
              <span>{t.generate}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
