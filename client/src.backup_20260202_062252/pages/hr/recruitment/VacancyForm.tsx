/**
 * ============================================================================
 * VACANCY CREATION/EDIT FORM
 * ============================================================================
 * 
 * Complete vacancy form with:
 * - Position details
 * - Criteria configuration
 * - Weight validation (must total 100%)
 * - Bilingual support
 * 
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, AlertCircle, Save, CheckCircle } from 'lucide-react';
import { 
  vacancyService, 
  vacancyCriteriaService 
} from './recruitmentService';
import { 
  Vacancy, 
  VacancyCriteria, 
  VacancyType, 
  CriteriaType 
} from './types';

interface Props {
  language: string;
  isRTL: boolean;
  vacancy?: Vacancy;
  onClose: () => void;
  onSave: () => void;
}

interface CriteriaFormData {
  id?: string;
  criteriaName: string;
  criteriaType: CriteriaType;
  weightPercentage: number;
  required: boolean;
  options?: string[];
  minValue?: number;
  maxValue?: number;
  description?: string;
}

export function VacancyForm({ language, isRTL, vacancy, onClose, onSave }: Props) {
  const isEdit = !!vacancy;

  // Vacancy form state
  const [formData, setFormData] = useState({
    positionTitle: vacancy?.positionTitle || '',
    department: vacancy?.department || '',
    project: vacancy?.project || '',
    dutyStation: vacancy?.dutyStation || '',
    contractType: vacancy?.contractType || '',
    grade: vacancy?.grade || '',
    vacancyType: (vacancy?.vacancyType || 'New') as VacancyType,
    justification: vacancy?.justification || '',
    openingDate: vacancy?.openingDate || '',
    closingDate: vacancy?.closingDate || '',
    hiringManager: vacancy?.hiringManager || '',
    shortlistThreshold: vacancy?.shortlistThreshold || 60,
    status: vacancy?.status || 'Draft'
  });

  // Criteria state
  const [criteria, setCriteria] = useState<CriteriaFormData[]>([]);
  const [showCriteriaForm, setShowCriteriaForm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (vacancy) {
      const existingCriteria = vacancyCriteriaService.getByVacancy(vacancy.id);
      setCriteria(existingCriteria.map(c => ({
        id: c.id,
        criteriaName: c.criteriaName,
        criteriaType: c.criteriaType,
        weightPercentage: c.weightPercentage,
        required: c.required,
        options: c.options,
        minValue: c.minValue,
        maxValue: c.maxValue,
        description: c.description
      })));
    }
  }, [vacancy]);

  const t = {
    title: language === 'en' 
      ? (isEdit ? 'Edit Vacancy' : 'Create New Vacancy')
      : (isEdit ? 'تحرير الشاغر' : 'إنشاء شاغر جديد'),
    
    // Sections
    vacancyDetails: language === 'en' ? 'Vacancy Details' : 'تفاصيل الشاغر',
    selectionCriteria: language === 'en' ? 'Selection Criteria & Scoring' : 'معايير الاختيار والتقييم',
    
    // Fields
    positionTitle: language === 'en' ? 'Position Title' : 'المسمى الوظيفي',
    department: language === 'en' ? 'Department' : 'القسم',
    project: language === 'en' ? 'Project (Optional)' : 'المشروع (اختياري)',
    dutyStation: language === 'en' ? 'Duty Station' : 'مكان العمل',
    contractType: language === 'en' ? 'Contract Type' : 'نوع العقد',
    grade: language === 'en' ? 'Grade (Optional)' : 'الدرجة (اختياري)',
    vacancyType: language === 'en' ? 'Vacancy Type' : 'نوع الشاغر',
    justification: language === 'en' ? 'Justification' : 'المبرر',
    openingDate: language === 'en' ? 'Opening Date' : 'تاريخ الفتح',
    closingDate: language === 'en' ? 'Closing Date' : 'تاريخ الإغلاق',
    hiringManager: language === 'en' ? 'Hiring Manager' : 'مدير التوظيف',
    shortlistThreshold: language === 'en' ? 'Shortlist Threshold (%)' : 'حد القائمة المختصرة (%)',
    
    // Vacancy types
    new: language === 'en' ? 'New Position' : 'منصب جديد',
    replacement: language === 'en' ? 'Replacement' : 'استبدال',
    
    // Contract types
    fullTime: language === 'en' ? 'Full-time' : 'دوام كامل',
    partTime: language === 'en' ? 'Part-time' : 'دوام جزئي',
    contract: language === 'en' ? 'Contract' : 'عقد',
    consultant: language === 'en' ? 'Consultant' : 'استشاري',
    
    // Criteria
    addCriteria: language === 'en' ? 'Add Selection Criterion' : 'إضافة معيار اختيار',
    criteriaName: language === 'en' ? 'Criterion Name' : 'اسم المعيار',
    criteriaType: language === 'en' ? 'Type' : 'النوع',
    weight: language === 'en' ? 'Weight (%)' : 'الوزن (%)',
    required: language === 'en' ? 'Required' : 'مطلوب',
    totalWeight: language === 'en' ? 'Total Weight' : 'الوزن الإجمالي',
    mustEqual100: language === 'en' ? 'Weights must total 100%' : 'يجب أن يكون مجموع الأوزان 100%',
    
    // Criteria types
    yesNo: language === 'en' ? 'Yes/No' : 'نعم/لا',
    numeric: language === 'en' ? 'Numeric (e.g., years)' : 'رقمي (مثل السنوات)',
    scale: language === 'en' ? 'Scale (1-5)' : 'مقياس (1-5)',
    checklist: language === 'en' ? 'Checklist' : 'قائمة تحقق',
    
    // Actions
    save: language === 'en' ? 'Save Vacancy' : 'حفظ الشاغر',
    saveDraft: language === 'en' ? 'Save as Draft' : 'حفظ كمسودة',
    publish: language === 'en' ? 'Publish Vacancy' : 'نشر الشاغر',
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    remove: language === 'en' ? 'Remove' : 'إزالة',
    
    // Validation
    requiredField: language === 'en' ? 'This field is required' : 'هذا الحقل مطلوب',
    invalidDate: language === 'en' ? 'Closing date must be after opening date' : 'يجب أن يكون تاريخ الإغلاق بعد تاريخ الفتح',
    
    // Success
    vacancyCreated: language === 'en' ? 'Vacancy created successfully!' : 'تم إنشاء الشاغر بنجاح!',
    vacancyUpdated: language === 'en' ? 'Vacancy updated successfully!' : 'تم تحديث الشاغر بنجاح!'
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

  const addCriterion = () => {
    setCriteria(prev => [...prev, {
      criteriaName: '',
      criteriaType: 'YesNo',
      weightPercentage: 0,
      required: false
    }]);
  };

  const updateCriterion = (index: number, field: string, value: any) => {
    setCriteria(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeCriterion = (index: number) => {
    setCriteria(prev => prev.filter((_, i) => i !== index));
  };

  const getTotalWeight = () => {
    return criteria.reduce((sum, c) => sum + (c.weightPercentage || 0), 0);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.positionTitle.trim()) {
      newErrors.positionTitle = t.requiredField;
    }
    if (!formData.department.trim()) {
      newErrors.department = t.requiredField;
    }
    if (!formData.dutyStation.trim()) {
      newErrors.dutyStation = t.requiredField;
    }
    if (!formData.contractType.trim()) {
      newErrors.contractType = t.requiredField;
    }
    if (!formData.justification.trim()) {
      newErrors.justification = t.requiredField;
    }
    if (!formData.openingDate) {
      newErrors.openingDate = t.requiredField;
    }
    if (!formData.closingDate) {
      newErrors.closingDate = t.requiredField;
    }
    if (formData.openingDate && formData.closingDate && 
        new Date(formData.closingDate) <= new Date(formData.openingDate)) {
      newErrors.closingDate = t.invalidDate;
    }
    if (!formData.hiringManager.trim()) {
      newErrors.hiringManager = t.requiredField;
    }

    // Validate criteria weights
    const totalWeight = getTotalWeight();
    if (criteria.length > 0 && Math.abs(totalWeight - 100) > 0.01) {
      newErrors.criteria = t.mustEqual100;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = (publish: boolean = false) => {
    if (!validate()) {
      return;
    }

    const vacancyData = {
      ...formData,
      status: publish ? 'Open' : 'Draft',
      createdBy: 'Current User', // TODO: Get from auth context
    };

    let savedVacancy: Vacancy;

    if (isEdit && vacancy) {
      vacancyService.update(vacancy.id, vacancyData);
      savedVacancy = vacancyService.getById(vacancy.id)!;
      
      // Update criteria
      const existingCriteria = vacancyCriteriaService.getByVacancy(vacancy.id);
      existingCriteria.forEach(c => {
        if (!criteria.find(nc => nc.id === c.id)) {
          vacancyCriteriaService.delete(c.id);
        }
      });
    } else {
      savedVacancy = vacancyService.create(vacancyData);
    }

    // Save criteria
    criteria.forEach(c => {
      if (c.id) {
        vacancyCriteriaService.update(c.id, {
          criteriaName: c.criteriaName,
          criteriaType: c.criteriaType,
          weightPercentage: c.weightPercentage,
          required: c.required,
          options: c.options,
          minValue: c.minValue,
          maxValue: c.maxValue,
          description: c.description
        });
      } else {
        vacancyCriteriaService.create({
          vacancyId: savedVacancy.id,
          criteriaName: c.criteriaName,
          criteriaType: c.criteriaType,
          weightPercentage: c.weightPercentage,
          required: c.required,
          options: c.options,
          minValue: c.minValue,
          maxValue: c.maxValue,
          description: c.description
        });
      }
    });

    onSave();
  };

  const totalWeight = getTotalWeight();
  const isWeightValid = Math.abs(totalWeight - 100) < 0.01;

  return (
    <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{t.title}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Vacancy Details Section */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              {t.vacancyDetails}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Position Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.positionTitle} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.positionTitle}
                  onChange={(e) => handleInputChange('positionTitle', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.positionTitle ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Project Manager"
                />
                {errors.positionTitle && (
                  <p className="text-xs text-red-500 mt-1">{errors.positionTitle}</p>
                )}
              </div>

              {/* Department */}
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
                  placeholder="e.g., Programs"
                />
                {errors.department && (
                  <p className="text-xs text-red-500 mt-1">{errors.department}</p>
                )}
              </div>

              {/* Project */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.project}
                </label>
                <input
                  type="text"
                  value={formData.project}
                  onChange={(e) => handleInputChange('project', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Optional"
                />
              </div>

              {/* Duty Station */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.dutyStation} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.dutyStation}
                  onChange={(e) => handleInputChange('dutyStation', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.dutyStation ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Amman, Jordan"
                />
                {errors.dutyStation && (
                  <p className="text-xs text-red-500 mt-1">{errors.dutyStation}</p>
                )}
              </div>

              {/* Contract Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.contractType} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.contractType}
                  onChange={(e) => handleInputChange('contractType', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.contractType ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select...</option>
                  <option value="Full-time">{t.fullTime}</option>
                  <option value="Part-time">{t.partTime}</option>
                  <option value="Contract">{t.contract}</option>
                  <option value="Consultant">{t.consultant}</option>
                </select>
                {errors.contractType && (
                  <p className="text-xs text-red-500 mt-1">{errors.contractType}</p>
                )}
              </div>

              {/* Grade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.grade}
                </label>
                <input
                  type="text"
                  value={formData.grade}
                  onChange={(e) => handleInputChange('grade', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Grade 5"
                />
              </div>

              {/* Vacancy Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.vacancyType} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.vacancyType}
                  onChange={(e) => handleInputChange('vacancyType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="New">{t.new}</option>
                  <option value="Replacement">{t.replacement}</option>
                </select>
              </div>

              {/* Hiring Manager */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.hiringManager} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.hiringManager}
                  onChange={(e) => handleInputChange('hiringManager', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.hiringManager ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Manager name"
                />
                {errors.hiringManager && (
                  <p className="text-xs text-red-500 mt-1">{errors.hiringManager}</p>
                )}
              </div>

              {/* Opening Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.openingDate} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.openingDate}
                  onChange={(e) => handleInputChange('openingDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.openingDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.openingDate && (
                  <p className="text-xs text-red-500 mt-1">{errors.openingDate}</p>
                )}
              </div>

              {/* Closing Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.closingDate} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.closingDate}
                  onChange={(e) => handleInputChange('closingDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.closingDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.closingDate && (
                  <p className="text-xs text-red-500 mt-1">{errors.closingDate}</p>
                )}
              </div>

              {/* Shortlist Threshold */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.shortlistThreshold}
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.shortlistThreshold}
                  onChange={(e) => handleInputChange('shortlistThreshold', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Justification - Full Width */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.justification} <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.justification}
                  onChange={(e) => handleInputChange('justification', e.target.value)}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.justification ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Explain why this position is needed..."
                />
                {errors.justification && (
                  <p className="text-xs text-red-500 mt-1">{errors.justification}</p>
                )}
              </div>
            </div>
          </div>

          {/* Selection Criteria Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                {t.selectionCriteria}
              </h3>
              <button
                onClick={addCriterion}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                {t.addCriteria}
              </button>
            </div>

            {criteria.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-500">{language === 'en' ? 'No criteria added yet' : 'لم تتم إضافة معايير بعد'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {criteria.map((criterion, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {t.criteriaName}
                        </label>
                        <input
                          type="text"
                          value={criterion.criteriaName}
                          onChange={(e) => updateCriterion(index, 'criteriaName', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., Years of experience"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {t.criteriaType}
                        </label>
                        <select
                          value={criterion.criteriaType}
                          onChange={(e) => updateCriterion(index, 'criteriaType', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="YesNo">{t.yesNo}</option>
                          <option value="Numeric">{t.numeric}</option>
                          <option value="Scale">{t.scale}</option>
                          <option value="Checklist">{t.checklist}</option>
                        </select>
                      </div>
                      
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            {t.weight}
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={criterion.weightPercentage}
                            onChange={(e) => updateCriterion(index, 'weightPercentage', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <button
                          onClick={() => removeCriterion(index)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                          title={t.remove}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Total Weight Display */}
                <div className={`p-3 rounded-lg border-2 flex items-center justify-between ${
                  isWeightValid 
                    ? 'bg-green-50 border-green-300' 
                    : 'bg-yellow-50 border-yellow-300'
                }`}>
                  <div className="flex items-center gap-2">
                    {isWeightValid ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                    )}
                    <span className="font-medium text-gray-900">{t.totalWeight}:</span>
                  </div>
                  <span className={`text-xl font-bold ${
                    isWeightValid ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {totalWeight.toFixed(1)}%
                  </span>
                </div>
                
                {!isWeightValid && (
                  <p className="text-sm text-yellow-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {t.mustEqual100}
                  </p>
                )}
                {errors.criteria && (
                  <p className="text-sm text-red-600 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {errors.criteria}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {t.cancel}
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSave(false)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {t.saveDraft}
            </button>
            <button
              onClick={() => handleSave(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              {t.publish}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
