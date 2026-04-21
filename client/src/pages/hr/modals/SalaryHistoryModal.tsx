import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';

interface SalaryHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: number | undefined;
  employeeName?: string;
}

interface SalaryVersion {
  id: number;
  version: number;
  gradeCode: string;
  step: string;
  basicSalary: string | number; // ✅ NEW: Base salary field
  approvedGrossSalary: string | number;
  housingAllowance: string | number;
  transportAllowance: string | number;
  representationAllowance: string | number;
  otherAllowances: string | number;
  // ✅ NEW: Social Security fields
  employerContribution?: string | number;
  employeeContribution?: string | number;
  socialSecurityDeduction?: string | number;
  effectiveStartDate: string;
  status: 'active' | 'draft' | 'superseded';
  createdAt: string;
  createdBy: number | null;
  updatedAt: string;
  updatedBy: number | null;
  organizationId?: number;
  operatingUnitId?: number | null;
  employeeId?: number;
  staffId?: string;
  staffFullName?: string;
  position?: string;
  department?: string;
  contractType?: string;
  gradeId?: number | null;
  minSalary?: string | number;
  maxSalary?: string | number;
  housingAllowanceType?: 'value' | 'percentage';
  transportAllowanceType?: 'value' | 'percentage';
  representationAllowanceType?: 'value' | 'percentage';
  annualAllowance?: string | number;
  bonus?: string | number;
  currency?: string;
  effectiveEndDate?: string | null;
  isLocked?: number;
  usedInPayroll?: number;
  lastApprovedBy?: number | null;
  lastApprovedAt?: string | null;
  isDeleted?: number;
  deletedAt?: string | null;
  deletedBy?: number | null;
}

export function SalaryHistoryModal({
  isOpen,
  onClose,
  employeeId,
  employeeName = 'Employee',
}: SalaryHistoryModalProps) {
  const [expandedVersions, setExpandedVersions] = useState<Set<number>>(new Set());

  // ✅ FIXED: Fetch salary history with proper enabled condition
  const { data: salaryHistory, isLoading, error } = trpc.hrSalaryScale.getHistoryByEmployeeId.useQuery(
    { employeeId: employeeId || 0 },
    { 
      enabled: isOpen && !!employeeId,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  );

  const translations = {
    en: {
      title: 'Salary History',
      description: 'View all salary versions and changes',
      version: 'Version',
      status: 'Status',
      grade: 'Grade',
      step: 'Step',
      basicSalary: 'Base Salary',
      grossSalary: 'Gross Salary',
      housing: 'Housing',
      transport: 'Transport',
      representation: 'Representation',
      other: 'Other',
      effective: 'Effective Date',
      createdBy: 'Created By',
      updatedBy: 'Updated By',
      active: 'Active',
      draft: 'Draft',
      superseded: 'Superseded',
      noHistory: 'No salary history found',
      close: 'Close',
      details: 'Salary Details',
      auditTrail: 'Audit Trail',
      created: 'Created',
      updated: 'Updated',
      socialSecurity: 'Social Security',
      employerContribution: 'Employer Contribution',
      employeeContribution: 'Employee Contribution',
      totalDeduction: 'Total Deduction',
    },
    ar: {
      title: 'سجل الرواتب',
      description: 'عرض جميع إصدارات الرواتب والتغييرات',
      version: 'الإصدار',
      status: 'الحالة',
      grade: 'الدرجة',
      step: 'الخطوة',
      basicSalary: 'الراتب الأساسي',
      grossSalary: 'الراتب الإجمالي',
      housing: 'السكن',
      transport: 'المواصلات',
      representation: 'التمثيل',
      other: 'أخرى',
      effective: 'تاريخ السريان',
      createdBy: 'أنشأ بواسطة',
      updatedBy: 'تم التحديث بواسطة',
      active: 'نشط',
      draft: 'مسودة',
      superseded: 'ملغى',
      noHistory: 'لا يوجد سجل رواتب',
      close: 'إغلاق',
      details: 'تفاصيل الراتب',
      auditTrail: 'سجل التدقيق',
      created: 'تم الإنشاء',
      updated: 'تم التحديث',
      socialSecurity: 'الضمان الاجتماعي',
      employerContribution: 'مساهمة صاحب العمل',
      employeeContribution: 'مساهمة الموظف',
      totalDeduction: 'إجمالي الخصم',
    },
  };

  const t = translations['en']; // Default to English; can be made dynamic if LanguageContext is available

  const toggleExpanded = (versionId: number) => {
    const newExpanded = new Set(expandedVersions);
    if (newExpanded.has(versionId)) {
      newExpanded.delete(versionId);
    } else {
      newExpanded.add(versionId);
    }
    setExpandedVersions(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'superseded':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return t.active;
      case 'draft':
        return t.draft;
      case 'superseded':
        return t.superseded;
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number | string | undefined) => {
    if (amount === undefined || amount === null) return '$0.00';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const parseAmount = (amount: string | number | undefined): number => {
    if (amount === undefined || amount === null) return 0;
    return typeof amount === 'string' ? parseFloat(amount) : amount;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {t.title}
          </DialogTitle>
          <DialogDescription>
            {employeeName} • {t.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              Failed to load salary history: {error.message}
            </div>
          )}

          {!isLoading && !error && (!salaryHistory || salaryHistory.length === 0) && (
            <div className="text-center py-8 text-gray-500">{t.noHistory}</div>
          )}

          {!isLoading &&
            !error &&
            salaryHistory &&
            salaryHistory.length > 0 &&
            salaryHistory.map((record: SalaryVersion) => (
              <div
                key={record.id}
                className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Header - Summary Row */}
                <button
                  onClick={() => toggleExpanded(record.id)}
                  className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div>
                      {expandedVersions.has(record.id) ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>

                    <div className="text-left">
                      <div className="font-semibold">
                        {t.version} {record.version}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatDate(record.effectiveStartDate)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatCurrency(record.approvedGrossSalary)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {record.gradeCode} • {record.step}
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                        record.status
                      )}`}
                    >
                      {getStatusLabel(record.status)}
                    </span>
                  </div>
                </button>

                {/* Expanded Details */}
                {expandedVersions.has(record.id) && (
                  <div className="px-4 py-4 bg-white border-t space-y-4">
                    {/* Salary Details Section */}
                    <div>
                      <h4 className="font-semibold mb-3 text-sm uppercase text-gray-700">
                        {t.details}
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {/* ✅ NEW: Display Base Salary */}
                        <div>
                          <span className="text-gray-600">{t.basicSalary}:</span>
                          <div className="font-semibold text-lg">
                            {formatCurrency(record.basicSalary)}
                          </div>
                        </div>

                        <div>
                          <span className="text-gray-600">{t.grossSalary}:</span>
                          <div className="font-semibold text-lg">
                            {formatCurrency(record.approvedGrossSalary)}
                          </div>
                        </div>

                        {parseAmount(record.housingAllowance) > 0 && (
                          <div>
                            <span className="text-gray-600">{t.housing}:</span>
                            <div className="font-semibold">
                              {formatCurrency(record.housingAllowance)}
                            </div>
                          </div>
                        )}

                        {parseAmount(record.transportAllowance) > 0 && (
                          <div>
                            <span className="text-gray-600">{t.transport}:</span>
                            <div className="font-semibold">
                              {formatCurrency(record.transportAllowance)}
                            </div>
                          </div>
                        )}

                        {parseAmount(record.representationAllowance) > 0 && (
                          <div>
                            <span className="text-gray-600">{t.representation}:</span>
                            <div className="font-semibold">
                              {formatCurrency(record.representationAllowance)}
                            </div>
                          </div>
                        )}

                        {parseAmount(record.otherAllowances) > 0 && (
                          <div>
                            <span className="text-gray-600">{t.other}:</span>
                            <div className="font-semibold">
                              {formatCurrency(record.otherAllowances)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ✅ NEW: Social Security Section */}
                    {(parseAmount(record.employerContribution) > 0 || parseAmount(record.employeeContribution) > 0) && (
                      <div className="border-t pt-4">
                        <h4 className="font-semibold mb-3 text-sm uppercase text-gray-700">
                          {t.socialSecurity}
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {parseAmount(record.employerContribution) > 0 && (
                            <div>
                              <span className="text-gray-600">{t.employerContribution}:</span>
                              <div className="font-semibold">
                                {formatCurrency(record.employerContribution)}
                              </div>
                            </div>
                          )}

                          {parseAmount(record.employeeContribution) > 0 && (
                            <div>
                              <span className="text-gray-600">{t.employeeContribution}:</span>
                              <div className="font-semibold">
                                {formatCurrency(record.employeeContribution)}
                              </div>
                            </div>
                          )}

                          {parseAmount(record.socialSecurityDeduction) > 0 && (
                            <div className="col-span-2 bg-blue-50 p-2 rounded">
                              <span className="text-gray-600">{t.totalDeduction}:</span>
                              <div className="font-semibold text-blue-600">
                                {formatCurrency(record.socialSecurityDeduction)}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Audit Trail Section */}
                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-3 text-sm uppercase text-gray-700">
                        {t.auditTrail}
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">{t.created}:</span>
                          <span>
                            {formatDate(record.createdAt)} • {record.createdBy ? `User #${record.createdBy}` : 'System'}
                          </span>
                        </div>
                        {record.updatedAt !== record.createdAt && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">{t.updated}:</span>
                            <span>
                              {formatDate(record.updatedAt)} • {record.updatedBy ? `User #${record.updatedBy}` : 'System'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            {t.close}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
