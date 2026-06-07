/**
 * ============================================================================
 * INTERVIEW SCHEDULE FORM - REFACTORED FOR tRPC
 * ============================================================================
 * 
 * Create/edit interview schedule with:
 * - Candidate selection
 * - Interview type
 * - Date & time
 * - Interviewer assignment
 * - Bilingual support (EN/AR)
 * - RTL/LTR support
 * 
 * ============================================================================
 */

import { useState } from 'react';
import { X, Save, AlertCircle, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/TranslationProvider';
import { InterviewType } from '@shared/types/recruitment-canonical';
import { toast } from 'sonner';

interface Props {
  language: string;
  isRTL: boolean;
  jobId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function InterviewScheduleForm({ language, isRTL, jobId, onClose, onSuccess }: Props) {
  const t = useTranslation();
  const { isRTL: contextIsRTL } = useLanguage();
  const dir = isRTL || contextIsRTL ? 'rtl' : 'ltr';

  // State
  const [formData, setFormData] = useState({
    candidateId: '',
    interviewType: 'phone' as InterviewType,
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '10:00',
    location: '',
    interviewers: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const INTERVIEW_TYPES = [
  'Phone',
  'Technical',
  'HR',
  'Panel',
  'Final',
] as const;

  // tRPC queries
  const { data: candidatesData, isLoading: candidatesLoading } = trpc.hrRecruitment.getAllCandidates.useQuery({
    jobId,
    limit: 100,
    offset: 0,
  });

  // tRPC mutations
  const createInterviewMutation = trpc.hrRecruitment.createInterview.useMutation({
    onSuccess: () => {
      toast.success(t.hrRecruitment?.interviewScheduled || 'Interview scheduled successfully');
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to schedule interview');
      setIsSubmitting(false);
    },
  });

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.candidateId) {
      newErrors.candidateId = t.hrRecruitment?.candidateRequired || 'Candidate is required';
    }
    if (!formData.scheduledDate) {
      newErrors.scheduledDate = t.hrRecruitment?.dateRequired || 'Date is required';
    }
    if (!formData.scheduledTime) {
      newErrors.scheduledTime = t.hrRecruitment?.timeRequired || 'Time is required';
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
      createInterviewMutation.mutate({
        candidateId: parseInt(formData.candidateId),
        jobId,
        interviewType: formData.interviewType,
        interviewDate: formData.scheduledDate,
        location: formData.location || undefined,
        interviewers: formData.interviewers || undefined,
      });
    } catch (error) {
      toast.error(t.common?.error || 'An error occurred');
      setIsSubmitting(false);
    }
  };

  // Translations
  const localT = {
    title: t.hrRecruitment?.scheduleInterview || 'Schedule Interview',
    close: t.common?.close || 'Close',
    save: t.common?.save || 'Save',
    candidate: t.hrRecruitment?.candidate || 'Candidate',
    interviewType: t.hrRecruitment?.interviewType || 'Interview Type',
    date: t.hrRecruitment?.date || 'Date',
    time: t.hrRecruitment?.time || 'Time',
    location: t.hrRecruitment?.location || 'Location',
    interviewers: t.hrRecruitment?.interviewers || 'Interviewers',
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
                    {candidate.firstName} {candidate.lastName} ({candidate.email})
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

          {/* Interview Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {localT.interviewType}
            </label>
            <select
              name="interviewType"
              value={formData.interviewType}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {INTERVIEW_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {localT.date} *
              </label>
              <input
                type="date"
                name="scheduledDate"
                value={formData.scheduledDate}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.scheduledDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.scheduledDate && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.scheduledDate}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {localT.time} *
              </label>
              <input
                type="time"
                name="scheduledTime"
                value={formData.scheduledTime}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.scheduledTime ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.scheduledTime && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.scheduledTime}
                </p>
              )}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {localT.location}
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder={localT.location}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Interviewers */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {localT.interviewers}
            </label>
            <input
              type="text"
              name="interviewers"
              value={formData.interviewers}
              onChange={handleChange}
              placeholder={localT.interviewers}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
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
