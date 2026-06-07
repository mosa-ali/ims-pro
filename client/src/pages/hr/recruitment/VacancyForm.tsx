/**
 * ============================================================================
 * VACANCY CREATION/EDIT FORM - REFACTORED FOR tRPC
 * ============================================================================
 * 
 * Complete vacancy form with:
 * - Position details
 * - Multi-tenancy support
 * - Bilingual support (EN/AR)
 * - RTL/LTR support
 * - Real tRPC data
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/TranslationProvider';
import { RecruitmentJob, JobEmploymentType, JobStatus } from '@shared/types/recruitment-canonical';
import { toast } from 'sonner';

interface Props {
  language: string;
  isRTL: boolean;
  vacancy?: RecruitmentJob;
  onClose: () => void;
  onSave: () => void;
}

export function VacancyForm({ language, isRTL, vacancy, onClose, onSave }: Props) {
  const t = useTranslation();
  const { user } = useAuth();
  const { isRTL: contextIsRTL } = useLanguage();
  const dir = isRTL || contextIsRTL ? 'rtl' : 'ltr';
  const isEdit = !!vacancy;

  // Form state
  const [formData, setFormData] = useState({
    jobTitle: vacancy?.jobTitle || '',
    jobTitleAr: vacancy?.jobTitleAr || '',
    jobCode: vacancy?.jobCode || '',
    department: vacancy?.department || '',
    employmentType: (vacancy?.employmentType || 'full_time') as JobEmploymentType,
    numberOfPositions: vacancy?.numberOfPositions || 1,
    gradeLevel: vacancy?.gradeLevel || '',
    salaryRange: vacancy?.salaryRange || '',
    description: vacancy?.description || '',
    requirements: vacancy?.requirements || '',
    responsibilities: vacancy?.responsibilities || '',
    benefits: vacancy?.benefits || '',
    location: vacancy?.location || '',
    isRemote: vacancy?.isRemote || false,
    postingDate: vacancy?.postingDate || new Date().toISOString().split('T')[0],
    closingDate: vacancy?.closingDate || '',
    status: (vacancy?.status || 'draft') as JobStatus,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // tRPC mutations
  const createJobMutation = trpc.hrRecruitment.createVacancy.useMutation({
    onSuccess: () => {
      toast.success(t.hrRecruitment?.jobCreated || 'Job created successfully');
      onSave();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create job');
      setIsSubmitting(false);
    },
  });

  const updateJobMutation = trpc.hrRecruitment.updateVacancy.useMutation({
    onSuccess: () => {
      toast.success(t.hrRecruitment?.jobUpdated || 'Job updated successfully');
      onSave();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update job');
      setIsSubmitting(false);
    },
  });

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.jobTitle.trim()) {
      newErrors.jobTitle = t.hrRecruitment?.jobTitleRequired || 'Job title is required';
    }
    if (!formData.department.trim()) {
      newErrors.department = t.hrRecruitment?.departmentRequired || 'Department is required';
    }
    if (!formData.closingDate) {
      newErrors.closingDate = t.hrRecruitment?.closingDateRequired || 'Closing date is required';
    }
    if (formData.numberOfPositions < 1) {
      newErrors.numberOfPositions = t.hrRecruitment?.positionsRequired || 'At least 1 position required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error(t.hrRecruitment?.pleaseFixErrors || 'Please fix the errors');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEdit && vacancy) {
        updateJobMutation.mutate({
          id: vacancy.id,
          ...formData,
        });
      } else {
        createJobMutation.mutate(formData);
      }
    } catch (error) {
      toast.error(t.common?.error || 'An error occurred');
      setIsSubmitting(false);
    }
  };

  // Handle input change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) : value,
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Translations
  const localT = {
    title: isEdit ? (t.hrRecruitment?.editVacancy || 'Edit Vacancy') : (t.hrRecruitment?.newVacancy || 'New Vacancy'),
    close: t.common?.close || 'Close',
    save: t.common?.save || 'Save',
    jobTitle: t.hrRecruitment?.jobTitle || 'Job Title',
    jobTitleAr: t.hrRecruitment?.jobTitleAr || 'Job Title (Arabic)',
    jobCode: t.hrRecruitment?.jobCode || 'Job Code',
    department: t.hrRecruitment?.department || 'Department',
    employmentType: t.hrRecruitment?.employmentType || 'Employment Type',
    numberOfPositions: t.hrRecruitment?.numberOfPositions || 'Number of Positions',
    gradeLevel: t.hrRecruitment?.gradeLevel || 'Grade Level',
    salaryRange: t.hrRecruitment?.salaryRange || 'Salary Range',
    description: t.hrRecruitment?.description || 'Description',
    requirements: t.hrRecruitment?.requirements || 'Requirements',
    responsibilities: t.hrRecruitment?.responsibilities || 'Responsibilities',
    benefits: t.hrRecruitment?.benefits || 'Benefits',
    location: t.hrRecruitment?.location || 'Location',
    isRemote: t.hrRecruitment?.isRemote || 'Remote Position',
    postingDate: t.hrRecruitment?.postingDate || 'Posting Date',
    closingDate: t.hrRecruitment?.closingDate || 'Closing Date',
    status: t.hrRecruitment?.status || 'Status',
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
          {/* Job Title */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {localT.jobTitle} *
              </label>
              <input
                type="text"
                name="jobTitle"
                value={formData.jobTitle}
                onChange={handleChange}
                placeholder={localT.jobTitle}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.jobTitle ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.jobTitle && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.jobTitle}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {localT.jobTitleAr}
              </label>
              <input
                type="text"
                name="jobTitleAr"
                value={formData.jobTitleAr}
                onChange={handleChange}
                placeholder={localT.jobTitleAr}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Job Code & Department */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {localT.jobCode}
              </label>
              <input
                type="text"
                name="jobCode"
                value={formData.jobCode}
                onChange={handleChange}
                placeholder={localT.jobCode}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {localT.department} *
              </label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder={localT.department}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.department ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.department && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.department}
                </p>
              )}
            </div>
          </div>

          {/* Employment Type & Positions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {localT.employmentType}
              </label>
              <select
                name="employmentType"
                value={formData.employmentType}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {[
                'full_time',
                'part_time',
                'contract',
                'consultant',
                'intern',
                ].map((type) => (
                <option key={type} value={type}>
                    {type}
                </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {localT.numberOfPositions} *
              </label>
              <input
                type="number"
                name="numberOfPositions"
                value={formData.numberOfPositions}
                onChange={handleChange}
                min="1"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.numberOfPositions ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.numberOfPositions && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.numberOfPositions}
                </p>
              )}
            </div>
          </div>

          {/* Grade & Salary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {localT.gradeLevel}
              </label>
              <input
                type="text"
                name="gradeLevel"
                value={formData.gradeLevel}
                onChange={handleChange}
                placeholder={localT.gradeLevel}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {localT.salaryRange}
              </label>
              <input
                type="text"
                name="salaryRange"
                value={formData.salaryRange}
                onChange={handleChange}
                placeholder={localT.salaryRange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Location & Remote */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="isRemote"
                  checked={formData.isRemote}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">{localT.isRemote}</span>
              </label>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {localT.postingDate}
              </label>
              <input
                type="date"
                name="postingDate"
                value={formData.postingDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {localT.closingDate} *
              </label>
              <input
                type="date"
                name="closingDate"
                value={formData.closingDate}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.closingDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.closingDate && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.closingDate}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {localT.description}
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder={localT.description}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Requirements */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {localT.requirements}
            </label>
            <textarea
              name="requirements"
              value={formData.requirements}
              onChange={handleChange}
              placeholder={localT.requirements}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Responsibilities */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {localT.responsibilities}
            </label>
            <textarea
              name="responsibilities"
              value={formData.responsibilities}
              onChange={handleChange}
              placeholder={localT.responsibilities}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Benefits */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {localT.benefits}
            </label>
            <textarea
              name="benefits"
              value={formData.benefits}
              onChange={handleChange}
              placeholder={localT.benefits}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {localT.status}
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {[
                'draft',
                'open',
                'on_hold',
                'closed',
                'filled',
                'cancelled',
                ].map((status) => (
                <option key={status} value={status}>
                    {status}
                </option>
                ))}
            </select>
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