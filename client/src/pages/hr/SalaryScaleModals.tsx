/**
 * ============================================================================
 * SALARY SCALE MODALS - EDIT, HISTORY, ADD GRADE
 * ============================================================================
 */

import { useState } from 'react';
import { X, Save, AlertTriangle, Clock, CheckCircle, Trash2, Loader2 } from 'lucide-react';
import { ModalOverlay } from '@/app/components/ui/ModalOverlay';
import { useTranslation } from '@/i18n/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { calculateAllowanceValue } from '@/utils/salary';

// ============================================================================
// TYPES
// ============================================================================

type SalaryGrade = {
  id: number;
  organizationId: number;
  gradeCode: string;
  gradeName: string;
  gradeNameAr?: string;
  minSalary: string | number;
  maxSalary: string | number;
  midSalary?: string | number;
  steps?: string;
  currency: string;
  housingAllowance?: string | number;
  transportAllowance?: string | number;
  otherAllowances?: string;
  effectiveDate?: string;
  expiryDate?: string;
  status: 'active' | 'inactive' | 'draft';
  notes?: string;
  isDeleted: number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
  deletedBy?: number;
};

type SalaryScaleRecord = {
  id: number;
  organizationId: number;
  employeeId: number;
  staffId: string;
  staffFullName: string;
  position?: string;
  department?: string;
  contractType?: string;
  gradeId?: number;
  gradeCode: string;
  grade: string;
  step: string;
  minSalary?: string | number;
  maxSalary?: string | number;
  approvedGrossSalary: string | number;
  housingAllowance?: string | number;
  housingAllowanceType?: 'value' | 'percentage';
  transportAllowance?: string | number;
  transportAllowanceType?: 'value' | 'percentage';
  representationAllowance?: string | number;
  representationAllowanceType?: 'value' | 'percentage';
  annualAllowance?: string | number;
  bonus?: string | number;
  otherAllowances?: string | number;
  currency?: string;
  status: 'draft' | 'active' | 'superseded';
  version: number;
  effectiveStartDate: string;
  effectiveEndDate?: string;
  isLocked?: boolean;
  isDeleted: boolean;
  createdBy?: string | number;
  updatedBy?: string | number;
  createdAt?: string;
  updatedAt?: string;
  lastApprovedBy?: string;
};

// ============================================================================
// EDIT SALARY MODAL
// ============================================================================

interface EditSalaryModalProps {
  record: SalaryScaleRecord;
  language?: string;
  isRTL?: boolean;
  onClose: () => void;
  onSave: () => void;
  userName?: string;
}

export function EditSalaryModal({
  record,
  language = 'en',
  isRTL = false,
  onClose,
  onSave,
  userName = 'System'
}: EditSalaryModalProps) {
  const { t } = useTranslation();
  const { data: grades = [] } = trpc.hrSalaryGrades.getAll.useQuery();
  
  const [formData, setFormData] = useState({
    grade: record.grade,
    step: record.step,
    approvedGrossSalary: record.approvedGrossSalary,
    housingAllowance: record.housingAllowance,
    housingAllowanceType: record.housingAllowanceType,
    transportAllowance: record.transportAllowance,
    transportAllowanceType: record.transportAllowanceType,
    representationAllowance: record.representationAllowance,
    representationAllowanceType: record.representationAllowanceType,
    annualAllowance: record.annualAllowance,
    bonus: record.bonus,
    otherAllowances: record.otherAllowances,
    effectiveStartDate: record.effectiveStartDate
  });

  const selectedGrade = grades.find((g: SalaryGrade) => g.gradeCode === formData.grade);
  const minSalary = Number(selectedGrade?.minSalary) || 0;
  const maxSalary = Number(selectedGrade?.maxSalary) || 0;

  const handleGradeChange = (newGrade: string) => {
    const grade = grades.find((g: SalaryGrade) => g.gradeCode === newGrade);
    const steps = grade?.steps ? JSON.parse(grade.steps) : [];
    setFormData({
      ...formData,
      grade: newGrade,
      step: steps[0] || 'Step 1'
    });
  };

  const updateMutation = trpc.hrSalaryScale.update.useMutation({
    onSuccess: () => {
      toast.success(t.hrModals?.salaryRecordUpdated || 'Salary record updated successfully');
      onSave();
      onClose();
    },
    onError: (error: any) => {
      toast.error('Error: ' + (error?.message || 'Failed to update salary'));
    }
  });

  const handleSave = () => {
    updateMutation.mutate({
      id: record.id,
      gradeCode: formData.grade,
      step: formData.step,
      approvedGrossSalary: parseFloat(String(formData.approvedGrossSalary)),
      housingAllowance: formData.housingAllowance ? parseFloat(String(formData.housingAllowance)) : undefined,
      housingAllowanceType: formData.housingAllowanceType,
      transportAllowance: formData.transportAllowance ? parseFloat(String(formData.transportAllowance)) : undefined,
      transportAllowanceType: formData.transportAllowanceType,
      representationAllowance: formData.representationAllowance ? parseFloat(String(formData.representationAllowance)) : undefined,
      representationAllowanceType: formData.representationAllowanceType,
      annualAllowance: formData.annualAllowance ? parseFloat(String(formData.annualAllowance)) : undefined,
      bonus: formData.bonus ? parseFloat(String(formData.bonus)) : undefined,
      otherAllowances: formData.otherAllowances ? parseFloat(String(formData.otherAllowances)) : undefined,
      effectiveStartDate: formData.effectiveStartDate
    });
  };

  const localT = {
    title: t.hr?.editSalaryRecord || 'Edit Salary Record',
    staffInfo: t.hr?.staffInformation || 'Staff Information',
    gradeScale: t.hr?.gradeScale || 'Grade & Scale',
    grade: t.hr?.grade || 'Grade',
    step: t.hr?.step || 'Step',
    salaryRange: t.hr?.salaryRange || 'Salary Range',
    minSalary: t.hr?.min || 'Min',
    maxSalary: t.hr?.max || 'Max',
    approvedSalary: t.hr?.approvedGrossSalary || 'Approved Gross Salary',
    allowances: t.hr?.allowances || 'Allowances',
    housing: t.hr?.housingAllowance || 'Housing Allowance',
    transport: t.hr?.transportAllowance || 'Transport Allowance',
    representation: t.hr?.representationAllowance || 'Representation Allowance',
    annual: t.hr?.annualAllowance || 'Annual Allowance',
    bonus: t.hr?.bonus || 'Bonus',
    other: t.hr?.otherAllowances || 'Other Allowances',
    effectiveDate: t.hr?.effectiveStartDate || 'Effective Date',
    value: t.hr?.value || 'Value',
    percentage: t.hr?.percentage || 'Percentage',
    cancel: t.hr?.cancel || 'Cancel',
    save: t.hr?.saveAsNewVersion || 'Save as New Version'
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{localT.title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-6 overflow-y-auto flex-1">
          <div className="bg-gray-50 p-4 rounded">
            <h4 className="font-semibold text-gray-900 mb-2">{localT.staffInfo}</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-600">ID:</span> <span className="font-medium">{record.staffId}</span></div>
              <div><span className="text-gray-600">Name:</span> <span className="font-medium">{record.staffFullName}</span></div>
              <div><span className="text-gray-600">Position:</span> <span className="font-medium">{record.position}</span></div>
              <div><span className="text-gray-600">Department:</span> <span className="font-medium">{record.department}</span></div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">{localT.gradeScale}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{localT.grade}</label>
                <select
                  value={formData.grade}
                  onChange={(e) => handleGradeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {grades.length > 0 ? (
                    grades.map((g: SalaryGrade) => (
                      <option key={g.id} value={g.gradeCode}>
                        {g.gradeCode} - {g.gradeName}
                      </option>
                    ))
                  ) : (
                    <option value="">No grades available</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{localT.step}</label>
                <select
                  value={formData.step}
                  onChange={(e) => setFormData({ ...formData, step: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!selectedGrade}
                >
                  {selectedGrade?.steps ? (
                    (JSON.parse(selectedGrade.steps) as string[]).map((s: string) => (
                      <option key={s} value={s}>{s}</option>
                    ))
                  ) : (
                    <option value="">Select grade first</option>
                  )}
                </select>
              </div>
            </div>
            {selectedGrade && (
              <div className="mt-2 text-sm text-gray-600">
                {localT.salaryRange}: ${minSalary.toLocaleString()} - ${maxSalary.toLocaleString()}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{localT.approvedSalary}</label>
            <input
              type="number"
              value={formData.approvedGrossSalary}
              onChange={(e) => setFormData({ ...formData, approvedGrossSalary: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">{localT.allowances}</h4>
            <div className="space-y-3">
              {[
                { key: 'housingAllowance', label: localT.housing, typeKey: 'housingAllowanceType' },
                { key: 'transportAllowance', label: localT.transport, typeKey: 'transportAllowanceType' },
                { key: 'representationAllowance', label: localT.representation, typeKey: 'representationAllowanceType' }
              ].map((item) => {
                const allowanceValue = formData[item.key as keyof typeof formData] as number;
                const allowanceType = formData[item.typeKey as keyof typeof formData] as 'value' | 'percentage';
                const calculatedValue = calculateAllowanceValue(
                  Number(formData.approvedGrossSalary),
                  allowanceValue || 0,
                  allowanceType === 'percentage' ? 'percentage' : 'value'
                );

                return (
                  <div key={item.key} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">{item.label}</label>
                      <span className="text-sm text-gray-600">Calculated: ${calculatedValue.toLocaleString()}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        value={allowanceValue || ''}
                        onChange={(e) => setFormData({ ...formData, [item.key]: parseFloat(e.target.value) || 0 })}
                        placeholder="Amount"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <select
                        value={allowanceType || 'value'}
                        onChange={(e) => setFormData({ ...formData, [item.typeKey]: e.target.value as 'value' | 'percentage' })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="value">{localT.value}</option>
                        <option value="percentage">{localT.percentage}</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {localT.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : localT.save}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ============================================================================
// SALARY HISTORY MODAL
// ============================================================================

interface SalaryHistoryModalProps {
  staffId: string;
  staffName: string;
  language: string;
  isRTL: boolean;
  onClose: () => void;
}

export function SalaryHistoryModal({
  staffId,
  staffName,
  language,
  isRTL,
  onClose
}: SalaryHistoryModalProps) {
  const { t } = useTranslation();
  const { data: history = [], isLoading } = trpc.hrSalaryScale.getHistoryByStaffId.useQuery({ staffId });

  const localT = {
    title: t.hr?.salaryHistory || 'Salary History',
    for: t.hr?.for || 'for',
    noHistory: t.hr?.noSalaryHistory || 'No salary history found',
    version: t.hr?.version || 'Version',
    current: t.hr?.current || 'Current',
    effectiveDate: t.hr?.effectiveDate || 'Effective Date',
    endDate: t.hr?.endDate || 'End Date',
    grade: t.hr?.grade || 'Grade',
    step: t.hr?.step || 'Step',
    salary: t.hr?.salary || 'Salary',
    approvedBy: t.hr?.approvedBy || 'Approved By',
    close: t.hr?.close || 'Close'
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{localT.title}</h3>
            <p className="text-sm text-gray-600">{localT.for} {staffName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 mx-auto animate-spin text-gray-400" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>{localT.noHistory}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((record: SalaryScaleRecord) => {
                const salaryAmount = typeof record.approvedGrossSalary === 'string'
                  ? parseFloat(record.approvedGrossSalary)
                  : record.approvedGrossSalary;
                return (
                  <div
                    key={record.id}
                    className={`border rounded-lg p-4 ${record.status === 'active' ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{localT.version} {record.version}</span>
                          {record.status === 'active' && (
                            <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded font-medium">
                              {localT.current}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {localT.effectiveDate}: {record.effectiveStartDate}
                          {record.effectiveEndDate && ` → ${localT.endDate}: ${record.effectiveEndDate}`}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        record.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                        record.status === 'active' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {record.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">{localT.grade}:</span>
                        <span className="font-medium ms-2">{record.grade}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">{localT.step}:</span>
                        <span className="font-medium ms-2">{record.step}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">{localT.salary}:</span>
                        <span className="font-medium ms-2">${salaryAmount.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">{localT.approvedBy}:</span>
                        <span className="font-medium ms-2">{record.lastApprovedBy || '-'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {localT.close}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ============================================================================
// ADD GRADE MODAL
// ============================================================================

interface AddGradeModalProps {
  language: string;
  isRTL: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function AddGradeModal({
  language,
  isRTL,
  onClose,
  onSave
}: AddGradeModalProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    gradeCode: '',
    gradeName: '',
    minSalary: 0,
    maxSalary: 0,
    steps: ['Step 1', 'Step 2', 'Step 3'],
    currency: 'USD'
  });

  const createMutation = trpc.hrSalaryGrades.create.useMutation({
    onSuccess: () => {
      toast.success(t.hr?.gradeAddedSuccessfully || 'Grade added successfully');
      onSave();
      onClose();
    },
    onError: (error: any) => {
      toast.error('Error: ' + (error?.message || 'Failed to add grade'));
    }
  });

  const handleSave = () => {
    if (!formData.gradeCode || !formData.gradeName) {
      toast.error(t.hr?.pleaseFillAllRequiredFields || 'Please fill all required fields');
      return;
    }

    createMutation.mutate({
      gradeCode: formData.gradeCode,
      gradeName: formData.gradeName,
      minSalary: formData.minSalary,
      maxSalary: formData.maxSalary,
      steps: JSON.stringify(formData.steps),
      currency: formData.currency
    });
  };

  const localT = {
    title: t.hr?.addNewGrade || 'Add New Grade',
    gradeCode: t.hrStaff.gradeCode || 'Grade Code',
    gradeName: t.hr?.gradeName || 'Grade Name',
    minSalary: t.hr?.minimumSalary || 'Minimum Salary',
    maxSalary: t.hr?.maximumSalary || 'Maximum Salary',
    currency: t.hr?.currency || 'Currency',
    cancel: t.hr?.cancel || 'Cancel',
    save: t.hr?.addGrade || 'Add Grade'
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{localT.title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{localT.gradeCode} *</label>
            <input
              type="text"
              value={formData.gradeCode}
              onChange={(e) => setFormData({ ...formData, gradeCode: e.target.value })}
              placeholder="e.g., G1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{localT.gradeName} *</label>
            <input
              type="text"
              value={formData.gradeName}
              onChange={(e) => setFormData({ ...formData, gradeName: e.target.value })}
              placeholder="e.g., Entry Level"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{localT.minSalary}</label>
              <input
                type="number"
                value={formData.minSalary}
                onChange={(e) => setFormData({ ...formData, minSalary: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{localT.maxSalary}</label>
              <input
                type="number"
                value={formData.maxSalary}
                onChange={(e) => setFormData({ ...formData, maxSalary: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{localT.currency}</label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="SAR">SAR</option>
              <option value="AED">AED</option>
            </select>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {localT.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={createMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : localT.save}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ============================================================================
// MANAGE GRADES MODAL
// ============================================================================

interface ManageGradesModalProps {
  language: string;
  isRTL: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function ManageGradesModal({
  language,
  isRTL,
  onClose,
  onSave
}: ManageGradesModalProps) {
  const { t } = useTranslation();
  const { data: grades = [], isLoading } = trpc.hrSalaryGrades.getAll.useQuery();
  const deleteMutation = trpc.hrSalaryGrades.delete.useMutation({
    onSuccess: () => {
      toast.success(localT.gradeDeletedSuccessfully || 'Grade deleted successfully');
      onSave();
    },
    onError: (error: any) => {
      toast.error('Error: ' + (error?.message || 'Failed to delete grade'));
    }
  });

  const handleDelete = (id: number) => {
    if (confirm(localT.confirmDelete || 'Are you sure?')) {
      deleteMutation.mutate({ id });
    }
  };

  const localT = {
    title: t.hr?.manageGrades || 'Manage Grades',
    noGrades: t.hr?.noGradesFound || 'No grades found',
    gradeCode: t.hr?.gradeCode || 'Grade Code',
    gradeName: t.hrModals.gradeName || 'Grade Name',
    minSalary: t.hr?.minimumSalary || 'Min Salary',
    maxSalary: t.hr?.maximumSalary || 'Max Salary',
    action: localT.action || 'Action',
    delete: t.hr?.delete || 'Delete',
    close: t.hr?.close || 'Close'
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{localT.title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 mx-auto animate-spin text-gray-400" />
            </div>
          ) : grades.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>{localT.noGrades}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">{localT.gradeCode}</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">{localT.gradeName}</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">{localT.minSalary}</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">{localT.maxSalary}</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700">{localT.action}</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.map((grade: SalaryGrade) => (
                    <tr key={grade.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-900">{grade.gradeCode}</td>
                      <td className="px-4 py-2 text-gray-600">{grade.gradeName}</td>
                      <td className="px-4 py-2 text-gray-600">${Number(grade.minSalary).toLocaleString()}</td>
                      <td className="px-4 py-2 text-gray-600">${Number(grade.maxSalary).toLocaleString()}</td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => handleDelete(grade.id)}
                          disabled={deleteMutation.isPending}
                          className="text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {localT.close}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
