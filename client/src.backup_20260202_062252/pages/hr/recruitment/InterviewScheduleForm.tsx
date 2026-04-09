/**
 * ============================================================================
 * INTERVIEW SCHEDULE FORM
 * ============================================================================
 * 
 * Schedule interviews for shortlisted candidates
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { X, Calendar, Save } from 'lucide-react';
import {
  interviewService,
  candidateService,
  vacancyService
} from './recruitmentService';
import { Candidate, Vacancy } from './types';

interface Props {
  language: string;
  isRTL: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function InterviewScheduleForm({ language, isRTL, onClose, onSave }: Props) {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedVacancy, setSelectedVacancy] = useState('');
  
  const [formData, setFormData] = useState({
    candidateId: '',
    scheduledDate: '',
    scheduledTime: '',
    location: '',
    interviewType: 'In-Person' as 'In-Person' | 'Video Call' | 'Phone',
    panelMembers: [''],
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadVacancies();
  }, []);

  useEffect(() => {
    if (selectedVacancy) {
      loadCandidates();
    }
  }, [selectedVacancy]);

  const loadVacancies = () => {
    const data = vacancyService.getAll().filter(v => v.status === 'Open' || v.status === 'Closed');
    setVacancies(data);
    if (data.length > 0) {
      setSelectedVacancy(data[0].id);
    }
  };

  const loadCandidates = () => {
    // Load shortlisted candidates for the selected vacancy
    const allCandidates = candidateService.getByVacancy(selectedVacancy);
    const shortlisted = allCandidates.filter(c => 
      c.isShortlisted && (c.status === 'Shortlisted' || c.status === 'Under Review')
    );
    setCandidates(shortlisted);
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

  const addPanelMember = () => {
    setFormData(prev => ({
      ...prev,
      panelMembers: [...prev.panelMembers, '']
    }));
  };

  const updatePanelMember = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      panelMembers: prev.panelMembers.map((m, i) => i === index ? value : m)
    }));
  };

  const removePanelMember = (index: number) => {
    setFormData(prev => ({
      ...prev,
      panelMembers: prev.panelMembers.filter((_, i) => i !== index)
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.candidateId) newErrors.candidateId = t.requiredField;
    if (!formData.scheduledDate) newErrors.scheduledDate = t.requiredField;
    if (!formData.scheduledTime) newErrors.scheduledTime = t.requiredField;
    if (!formData.location.trim()) newErrors.location = t.requiredField;
    
    const validPanelMembers = formData.panelMembers.filter(m => m.trim());
    if (validPanelMembers.length === 0) {
      newErrors.panelMembers = t.atLeastOnePanelMember;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const validPanelMembers = formData.panelMembers.filter(m => m.trim());

    interviewService.create({
      vacancyId: selectedVacancy,
      candidateId: formData.candidateId,
      scheduledDate: formData.scheduledDate,
      scheduledTime: formData.scheduledTime,
      location: formData.location,
      interviewType: formData.interviewType,
      panelMembers: validPanelMembers,
      notes: formData.notes,
      status: 'Scheduled'
    });

    // Update candidate status
    candidateService.updateStatus(formData.candidateId, 'Interviewed');

    onSave();
  };

  const t = {
    title: language === 'en' ? 'Schedule Interview' : 'جدولة مقابلة',
    
    selectVacancy: language === 'en' ? 'Select Vacancy' : 'اختر الشاغر',
    candidate: language === 'en' ? 'Candidate' : 'المرشح',
    scheduledDate: language === 'en' ? 'Interview Date' : 'تاريخ المقابلة',
    scheduledTime: language === 'en' ? 'Interview Time' : 'وقت المقابلة',
    location: language === 'en' ? 'Location / Meeting Link' : 'الموقع / رابط الاجتماع',
    interviewType: language === 'en' ? 'Interview Type' : 'نوع المقابلة',
    panelMembers: language === 'en' ? 'Interview Panel Members' : 'أعضاء لجنة المقابلة',
    notes: language === 'en' ? 'Notes (Optional)' : 'ملاحظات (اختياري)',
    
    inPerson: language === 'en' ? 'In-Person' : 'شخصياً',
    videoCall: language === 'en' ? 'Video Call' : 'مكالمة فيديو',
    phone: language === 'en' ? 'Phone' : 'هاتف',
    
    addPanelMember: language === 'en' ? 'Add Panel Member' : 'إضافة عضو',
    remove: language === 'en' ? 'Remove' : 'إزالة',
    
    save: language === 'en' ? 'Schedule Interview' : 'جدولة المقابلة',
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    
    requiredField: language === 'en' ? 'This field is required' : 'هذا الحقل مطلوب',
    atLeastOnePanelMember: language === 'en' ? 'At least one panel member is required' : 'مطلوب عضو واحد على الأقل',
    
    noCandidates: language === 'en' 
      ? 'No shortlisted candidates available for interview' 
      : 'لا يوجد مرشحون في القائمة المختصرة متاحون للمقابلة'
  };

  return (
    <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6" />
            <h2 className="text-xl font-bold">{t.title}</h2>
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
          {/* Vacancy Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.selectVacancy} <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedVacancy}
              onChange={(e) => setSelectedVacancy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {vacancies.map(vacancy => (
                <option key={vacancy.id} value={vacancy.id}>
                  {vacancy.vacancyRef} - {vacancy.positionTitle}
                </option>
              ))}
            </select>
          </div>

          {/* Candidate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.candidate} <span className="text-red-500">*</span>
            </label>
            {candidates.length === 0 ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                {t.noCandidates}
              </div>
            ) : (
              <select
                value={formData.candidateId}
                onChange={(e) => handleInputChange('candidateId', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.candidateId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select candidate...</option>
                {candidates.map(candidate => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.candidateRef} - {candidate.fullName} (Score: {candidate.totalScore.toFixed(1)}%)
                  </option>
                ))}
              </select>
            )}
            {errors.candidateId && <p className="text-xs text-red-500 mt-1">{errors.candidateId}</p>}
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.scheduledDate} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.scheduledDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.scheduledDate && <p className="text-xs text-red-500 mt-1">{errors.scheduledDate}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.scheduledTime} <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.scheduledTime}
                onChange={(e) => handleInputChange('scheduledTime', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.scheduledTime ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.scheduledTime && <p className="text-xs text-red-500 mt-1">{errors.scheduledTime}</p>}
            </div>
          </div>

          {/* Interview Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.interviewType} <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.interviewType}
              onChange={(e) => handleInputChange('interviewType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="In-Person">{t.inPerson}</option>
              <option value="Video Call">{t.videoCall}</option>
              <option value="Phone">{t.phone}</option>
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.location} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.location ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Office Room 301 or https://zoom.us/..."
            />
            {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location}</p>}
          </div>

          {/* Panel Members */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                {t.panelMembers} <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={addPanelMember}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {t.addPanelMember}
              </button>
            </div>
            <div className="space-y-2">
              {formData.panelMembers.map((member, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={member}
                    onChange={(e) => updatePanelMember(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Panel member name"
                  />
                  {formData.panelMembers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePanelMember(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      {t.remove}
                    </button>
                  )}
                </div>
              ))}
            </div>
            {errors.panelMembers && <p className="text-xs text-red-500 mt-1">{errors.panelMembers}</p>}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.notes}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any additional notes or instructions..."
            />
          </div>
        </form>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={candidates.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
