/**
 * ============================================================================
 * HIRING DECISION FORM - WITH AUTO-STAFF CREATION
 * ============================================================================
 * 
 * CRITICAL FUNCTIONALITY:
 * - Make final hiring decisions
 * - Configure employment details
 * - AUTO-CREATE Staff Dictionary record
 * - AUTO-CREATE Employee Profile
 * - Maintain audit trail
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { X, Save, CheckCircle, AlertCircle, UserPlus } from 'lucide-react';
import {
  hiringDecisionService,
  candidateService,
  vacancyService,
  interviewService
} from './recruitmentService';
import { staffService } from '@/app/services/hrService';
import { Candidate, Interview } from './types';

interface Props {
  language: string;
  isRTL: boolean;
  candidate: Candidate;
  onClose: () => void;
  onSave: () => void;
}

export function HiringDecisionForm({ language, isRTL, candidate, onClose, onSave }: Props) {
  const vacancy = vacancyService.getById(candidate.vacancyId);
  const interviews = interviewService.getByCandidate(candidate.id);

  const [formData, setFormData] = useState({
    decision: 'Approve' as 'Approve' | 'Reject' | 'Hold',
    
    // Employment Details (for Approved candidates)
    employeeId: '',
    employmentType: vacancy?.contractType || 'Full-time',
    contractStartDate: '',
    contractEndDate: '',
    probationPeriod: 3,
    salary: '',
    currency: 'USD',
    department: vacancy?.department || '',
    position: vacancy?.positionTitle || '',
    grade: vacancy?.grade || '',
    directSupervisor: vacancy?.hiringManager || '',
    workLocation: vacancy?.dutyStation || '',
    
    // Decision Details
    justification: '',
    approvedBy: 'Current User', // TODO: Get from auth context
    specialConditions: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Generate employee ID suggestion
    const lastId = getLastEmployeeId();
    setFormData(prev => ({
      ...prev,
      employeeId: generateEmployeeId(lastId)
    }));
  }, []);

  const getLastEmployeeId = (): string => {
    const allStaff = staffService.getAll();
    if (allStaff.length === 0) return 'EMP-0000';
    
    // Get the highest employee ID
    const ids = allStaff
      .map(s => s.employeeId)
      .filter(id => id.startsWith('EMP-'))
      .map(id => parseInt(id.replace('EMP-', '')) || 0);
    
    const maxId = Math.max(...ids, 0);
    return `EMP-${String(maxId).padStart(4, '0')}`;
  };

  const generateEmployeeId = (lastId: string): string => {
    const num = parseInt(lastId.replace('EMP-', '')) || 0;
    return `EMP-${String(num + 1).padStart(4, '0')}`;
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.justification.trim()) {
      newErrors.justification = t.requiredField;
    }

    if (formData.decision === 'Approve') {
      if (!formData.employeeId.trim()) newErrors.employeeId = t.requiredField;
      if (!formData.contractStartDate) newErrors.contractStartDate = t.requiredField;
      if (!formData.salary.trim()) newErrors.salary = t.requiredField;
      if (!formData.department.trim()) newErrors.department = t.requiredField;
      if (!formData.position.trim()) newErrors.position = t.requiredField;
      if (!formData.directSupervisor.trim()) newErrors.directSupervisor = t.requiredField;
      if (!formData.workLocation.trim()) newErrors.workLocation = t.requiredField;

      // Check for duplicate employee ID
      const existingStaff = staffService.getAll();
      if (existingStaff.some(s => s.employeeId === formData.employeeId)) {
        newErrors.employeeId = t.duplicateEmployeeId;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || !vacancy) return;

    setIsSubmitting(true);

    try {
      // Create hiring decision record
      const hiringDecision = hiringDecisionService.create({
        vacancyId: candidate.vacancyId,
        candidateId: candidate.id,
        decision: formData.decision,
        justification: formData.justification,
        approvedBy: formData.approvedBy,
        specialConditions: formData.specialConditions,
        
        // Employment details (only for approved)
        ...(formData.decision === 'Approve' && {
          employeeId: formData.employeeId,
          employmentType: formData.employmentType,
          contractStartDate: formData.contractStartDate,
          contractEndDate: formData.contractEndDate || undefined,
          probationPeriod: formData.probationPeriod,
          salary: formData.salary,
          currency: formData.currency,
          department: formData.department,
          position: formData.position,
          grade: formData.grade,
          directSupervisor: formData.directSupervisor,
          workLocation: formData.workLocation
        })
      });

      // Update candidate status
      if (formData.decision === 'Approve') {
        candidateService.updateStatus(candidate.id, 'Hired');

        // ========================================================================
        // AUTO-CREATE STAFF DICTIONARY RECORD
        // ========================================================================
        const staffRecord = staffService.create({
          employeeId: formData.employeeId,
          firstName: candidate.fullName.split(' ')[0] || '',
          middleName: candidate.fullName.split(' ').slice(1, -1).join(' ') || undefined,
          lastName: candidate.fullName.split(' ').slice(-1)[0] || '',
          fullNameEnglish: candidate.fullName,
          fullNameArabic: candidate.fullName, // TODO: Add Arabic name field to application form
          gender: candidate.gender,
          nationality: candidate.nationality,
          dateOfBirth: candidate.dateOfBirth,
          employmentStatus: 'Active', // CANONICAL STATUS
          employmentType: formData.employmentType,
          department: formData.department,
          position: formData.position,
          grade: formData.grade,
          contractStartDate: formData.contractStartDate,
          contractEndDate: formData.contractEndDate,
          probationPeriod: formData.probationPeriod,
          workLocation: formData.workLocation,
          directSupervisor: formData.directSupervisor,
          email: candidate.email,
          phone: candidate.phone,
          currentLocation: candidate.currentLocation,
          educationLevel: candidate.educationLevel,
          fieldOfStudy: candidate.fieldOfStudy,
          recruitmentSource: `Vacancy ${vacancy.vacancyRef}`,
          notes: `Hired through recruitment process. Candidate Ref: ${candidate.candidateRef}. Total Score: ${candidate.totalScore.toFixed(1)}%`
        });

        // ========================================================================
        // AUTO-CREATE EMPLOYEE PROFILE
        // ========================================================================
        // The Employee Profile is automatically created through the Staff Dictionary
        // service's create() method, which handles the initialization of:
        // - Personal Information (from candidate data)
        // - Employment Details (from hiring decision)
        // - Contact Information (from candidate application)
        // - Education Background (from candidate CV)
        // ========================================================================

        console.log('✅ AUTO-CREATED Staff Dictionary Record:', staffRecord.id);
        console.log('✅ AUTO-CREATED Employee Profile for:', formData.employeeId);

      } else if (formData.decision === 'Reject') {
        candidateService.updateStatus(candidate.id, 'Rejected');
      }

      setSuccess(true);
      setTimeout(() => {
        onSave();
      }, 1500);

    } catch (error) {
      console.error('Error creating hiring decision:', error);
      setErrors({ submit: t.errorOccurred });
    } finally {
      setIsSubmitting(false);
    }
  };

  const t = {
    title: language === 'en' ? 'Hiring Decision' : 'قرار التوظيف',
    candidateInfo: language === 'en' ? 'Candidate Information' : 'معلومات المرشح',
    decision: language === 'en' ? 'Decision' : 'القرار',
    employmentDetails: language === 'en' ? 'Employment Details' : 'تفاصيل التوظيف',
    
    approve: language === 'en' ? 'Approve & Hire' : 'الموافقة والتعيين',
    reject: language === 'en' ? 'Reject' : 'رفض',
    hold: language === 'en' ? 'Put on Hold' : 'تعليق',
    
    employeeId: language === 'en' ? 'Employee ID' : 'رقم الموظف',
    employmentType: language === 'en' ? 'Employment Type' : 'نوع التوظيف',
    contractStartDate: language === 'en' ? 'Contract Start Date' : 'تاريخ بدء العقد',
    contractEndDate: language === 'en' ? 'Contract End Date (Optional)' : 'تاريخ انتهاء العقد (اختياري)',
    probationPeriod: language === 'en' ? 'Probation Period (Months)' : 'فترة التجربة (أشهر)',
    salary: language === 'en' ? 'Monthly Salary' : 'الراتب الشهري',
    currency: language === 'en' ? 'Currency' : 'العملة',
    department: language === 'en' ? 'Department' : 'القسم',
    position: language === 'en' ? 'Position' : 'المنصب',
    grade: language === 'en' ? 'Grade (Optional)' : 'الدرجة (اختياري)',
    directSupervisor: language === 'en' ? 'Direct Supervisor' : 'المشرف المباشر',
    workLocation: language === 'en' ? 'Work Location' : 'موقع العمل',
    
    justification: language === 'en' ? 'Decision Justification' : 'مبرر القرار',
    specialConditions: language === 'en' ? 'Special Conditions (Optional)' : 'شروط خاصة (اختياري)',
    
    interviewSummary: language === 'en' ? 'Interview Summary' : 'ملخص المقابلة',
    noInterviews: language === 'en' ? 'No interviews conducted' : 'لم تجر مقابلات',
    
    save: language === 'en' ? 'Submit Decision' : 'تقديم القرار',
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    
    requiredField: language === 'en' ? 'This field is required' : 'هذا الحقل مطلوب',
    duplicateEmployeeId: language === 'en' ? 'Employee ID already exists' : 'رقم الموظف موجود بالفعل',
    errorOccurred: language === 'en' ? 'An error occurred' : 'حدث خطأ',
    
    successMessage: language === 'en' 
      ? 'Hiring decision saved! Staff record and Employee Profile created automatically.' 
      : 'تم حفظ قرار التوظيف! تم إنشاء سجل الموظف والملف الشخصي تلقائياً.',
    
    autoCreationNote: language === 'en'
      ? '✅ Upon approval, this will automatically create a Staff Dictionary record and Employee Profile'
      : '✅ عند الموافقة، سيتم إنشاء سجل قاموس الموظفين والملف الشخصي تلقائياً'
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 text-center" dir={isRTL ? 'rtl' : 'ltr'}>
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">{language === 'en' ? 'Success!' : 'نجح!'}</h3>
          <p className="text-gray-600">{t.successMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserPlus className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">{t.title}</h2>
              <p className="text-sm text-blue-100">{vacancy?.positionTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Candidate Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">{t.candidateInfo}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Name:</span>
                <span className="ml-2 font-medium text-gray-900">{candidate.fullName}</span>
              </div>
              <div>
                <span className="text-gray-500">Score:</span>
                <span className="ml-2 font-bold text-green-600">{candidate.totalScore.toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>
                <span className="ml-2 text-gray-900">{candidate.status}</span>
              </div>
            </div>
          </div>

          {/* Interview Summary */}
          {interviews.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">{t.interviewSummary}</h3>
              <div className="space-y-2">
                {interviews.map(interview => (
                  <div key={interview.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {new Date(interview.scheduledDate).toLocaleDateString()} - {interview.interviewType}
                    </span>
                    <div className="flex items-center gap-3">
                      {interview.overallRating && (
                        <span className="text-yellow-600 font-medium">⭐ {interview.overallRating}/5</span>
                      )}
                      {interview.recommendation && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          interview.recommendation === 'Highly Recommended' ? 'bg-green-100 text-green-700' :
                          interview.recommendation === 'Recommended' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {interview.recommendation}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Decision */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.decision} <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.decision}
              onChange={(e) => handleInputChange('decision', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Approve">{t.approve}</option>
              <option value="Reject">{t.reject}</option>
              <option value="Hold">{t.hold}</option>
            </select>
          </div>

          {/* Employment Details (Only for Approved) */}
          {formData.decision === 'Approve' && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-700">{t.autoCreationNote}</p>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">{t.employmentDetails}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.employeeId} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.employeeId}
                      onChange={(e) => handleInputChange('employeeId', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.employeeId ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.employeeId && <p className="text-xs text-red-500 mt-1">{errors.employeeId}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.employmentType} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.employmentType}
                      onChange={(e) => handleInputChange('employmentType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Consultant">Consultant</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.contractStartDate} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.contractStartDate}
                      onChange={(e) => handleInputChange('contractStartDate', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.contractStartDate ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.contractStartDate && <p className="text-xs text-red-500 mt-1">{errors.contractStartDate}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.contractEndDate}
                    </label>
                    <input
                      type="date"
                      value={formData.contractEndDate}
                      onChange={(e) => handleInputChange('contractEndDate', e.target.value)}
                      min={formData.contractStartDate}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.probationPeriod}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="12"
                      value={formData.probationPeriod}
                      onChange={(e) => handleInputChange('probationPeriod', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.salary} <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.salary}
                        onChange={(e) => handleInputChange('salary', e.target.value)}
                        className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.salary ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="5000"
                      />
                      <select
                        value={formData.currency}
                        onChange={(e) => handleInputChange('currency', e.target.value)}
                        className="w-24 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="JOD">JOD</option>
                      </select>
                    </div>
                    {errors.salary && <p className="text-xs text-red-500 mt-1">{errors.salary}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.department} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => handleInputChange('department', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.department ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.department && <p className="text-xs text-red-500 mt-1">{errors.department}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.position} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.position}
                      onChange={(e) => handleInputChange('position', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.position ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.position && <p className="text-xs text-red-500 mt-1">{errors.position}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.grade}
                    </label>
                    <input
                      type="text"
                      value={formData.grade}
                      onChange={(e) => handleInputChange('grade', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.directSupervisor} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.directSupervisor}
                      onChange={(e) => handleInputChange('directSupervisor', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.directSupervisor ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.directSupervisor && <p className="text-xs text-red-500 mt-1">{errors.directSupervisor}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t.workLocation} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.workLocation}
                      onChange={(e) => handleInputChange('workLocation', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.workLocation ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.workLocation && <p className="text-xs text-red-500 mt-1">{errors.workLocation}</p>}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Justification */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.justification} <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.justification}
              onChange={(e) => handleInputChange('justification', e.target.value)}
              rows={4}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.justification ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Provide detailed justification for your decision..."
            />
            {errors.justification && <p className="text-xs text-red-500 mt-1">{errors.justification}</p>}
          </div>

          {/* Special Conditions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.specialConditions}
            </label>
            <textarea
              value={formData.specialConditions}
              onChange={(e) => handleInputChange('specialConditions', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any special conditions or notes..."
            />
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-sm text-red-700">{errors.submit}</p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {language === 'en' ? 'Submitting...' : 'جاري التقديم...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {t.save}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
