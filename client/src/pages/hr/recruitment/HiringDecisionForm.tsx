/**
 * ============================================================================
 * HIRING DECISION FORM - REFACTORED FOR tRPC
 * ============================================================================
 * 
 * Create/edit hiring decision with:
 * - Candidate selection
 * - Salary and benefits
 * - Start date
 * - Bilingual support (EN/AR)
 * - RTL/LTR support
 * 
 * ============================================================================
 */

import { useState } from 'react';
import { X, Save, AlertCircle, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { toast } from 'sonner';

interface Props {
  language: string;
  isRTL: boolean;
  jobId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function HiringDecisionForm({ language, isRTL, jobId, onClose, onSuccess }: Props) {
  const { t } = useTranslation();
  const { isRTL: contextIsRTL } = useLanguage();
  const dir = isRTL || contextIsRTL ? 'rtl' : 'ltr';

  const [formData, setFormData] = useState({
    candidateId: '',
    offerSalary: '',
    startDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // tRPC queries
  const { data: candidatesData, isLoading: candidatesLoading } = trpc.hrRecruitment.getAllCandidates.useQuery({
    jobId,
    limit: 100,
    offset: 0,
  });

  // tRPC mutations
  const createDecisionMutation = trpc.hrRecruitment.createHiringDecision.useMutation({
    onSuccess: () => {
      toast.success(t.hrRecruitment?.decisionCreated || 'Hiring decision created successfully');
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create decision');
      setIsSubmitting(false);
    },
  });

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.candidateId) {
      newErrors.candidateId = t.hrRecruitment?.candidateRequired || 'Candidate is required';
    }
    if (!formData.offerSalary) {
      newErrors.offerSalary = t.hrRecruitment?.salaryRequired || 'Salary is required';
    }
    if (!formData.startDate) {
      newErrors.startDate = t.hrRecruitment?.startDateRequired || 'Start date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handlers
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error(t.hrRecruitment?.pleaseFixErrors || 'Please fix the errors');
      return;
    }

    setIsSubmitting(true);

    try {
      createDecisionMutation.mutate({
        candidateId: parseInt(formData.candidateId),
        jobId,
        proposedSalary: Number(formData.offerSalary),
        startDate: formData.startDate,
        offerStatus: 'Pending',
      });
    } catch (error) {
      toast.error(t.common?.error || 'An error occurred');
      setIsSubmitting(false);
    }
  };

  // Translations
  const localT = {
    title: t.hrRecruitment?.createHiringDecision || 'Create Hiring Decision',
    close: t.common?.close || 'Close',
    save: t.common?.save || 'Save',
    candidate: t.hrRecruitment?.candidate || 'Candidate',
    salary: t.hrRecruitment?.salary || 'Salary',
    startDate: t.hrRecruitment?.startDate || 'Start Date',
    notes: t.hrRecruitment?.notes || 'Notes',
    saving: t.hrRecruitment?.saving || 'Saving...',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir={dir}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{localT.title}</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Candidate Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {localT.candidate} *
            </label>
            <select
              name="candidateId"
              value={formData.candidateId}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.candidateId ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">-- {localT.candidate} --</option>
              {candidatesLoading ? (
                <option disabled>{t.common?.loading || 'Loading...'}</option>
              ) : (
                candidatesData?.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.firstName} {candidate.lastName}
                  </option>
                ))
              )}
            </select>
            {errors.candidateId && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.candidateId}
              </p>
            )}
          </div>

          {/* Salary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {localT.salary} *
            </label>
            <input
              type="number"
              name="offerSalary"
              value={formData.offerSalary}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.offerSalary ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.offerSalary && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.offerSalary}
              </p>
            )}
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {localT.startDate} *
            </label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.startDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.startDate && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.startDate}
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {localT.notes}
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder={localT.notes}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {localT.close}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {localT.saving}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {localT.save}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}