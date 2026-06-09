/**
 * ============================================================================
 * INTERVIEW EVALUATION FORM - REFACTORED FOR tRPC
 * ============================================================================
 * 
 * Form for entering interview evaluation with:
 * - Star rating
 * - Evaluation notes
 * - Save functionality
 * - Bilingual support (EN/AR)
 * - RTL/LTR support
 * 
 * ============================================================================
 */

import { useState } from 'react';
import { Star, Save, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';
import { toast } from 'sonner';

interface Props {
  language: string;
  isRTL: boolean;
  interview: any;
  onSuccess: () => void;
}

export function InterviewEvaluationForm({ language, isRTL, interview, onSuccess }: Props) {
  const { t } = useTranslation();
  const { isRTL: contextIsRTL } = useLanguage();
  const dir = isRTL || contextIsRTL ? 'rtl' : 'ltr';

  const [formData, setFormData] = useState({
    rating: interview.rating || 3,
    notes: interview.notes || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // tRPC mutations
  const updateInterviewMutation = trpc.hrRecruitment.updateInterview.useMutation({
    onSuccess: () => {
      toast.success(t.hrRecruitment?.evaluationSaved || 'Evaluation saved successfully');
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save evaluation');
      setIsSubmitting(false);
    },
  });

  // Handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      updateInterviewMutation.mutate({
        id: interview.id,
        rating: formData.rating,
        notes: formData.notes || undefined,
      });
    } catch (error) {
      toast.error(t.common?.error || 'An error occurred');
      setIsSubmitting(false);
    }
  };

  // Translations
  const localT = {
    title: t.hrRecruitment?.evaluateInterview || 'Evaluate Interview',
    rating: t.hrRecruitment?.rating || 'Rating',
    notes: t.hrRecruitment?.notes || 'Notes',
    save: t.common?.save || 'Save',
    saving: t.hrRecruitment?.saving || 'Saving...',
    poor: t.hrRecruitment?.poor || 'Poor',
    fair: t.hrRecruitment?.fair || 'Fair',
    good: t.hrRecruitment?.good || 'Good',
    veryGood: t.hrRecruitment?.veryGood || 'Very Good',
    excellent: t.hrRecruitment?.excellent || 'Excellent',
  };

  const ratingLabels = [localT.poor, localT.fair, localT.good, localT.veryGood, localT.excellent];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" dir={dir}>
      <h3 className="text-lg font-semibold text-gray-900 mb-6">{localT.title}</h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {localT.rating}
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, rating: star }))}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= formData.rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300 hover:text-yellow-300'
                  }`}
                />
              </button>
            ))}
            <span className="ml-3 text-sm text-gray-600">
              {ratingLabels[formData.rating - 1]}
            </span>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {localT.notes}
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder={localT.notes}
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Submit Button */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {localT.saving}
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {localT.save}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
