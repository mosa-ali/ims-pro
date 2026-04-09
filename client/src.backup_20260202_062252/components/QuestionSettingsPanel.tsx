/**
 * ============================================================================
 * QUESTION SETTINGS PANEL
 * ============================================================================
 * 
 * Professional settings panel for survey questions with 3 tabs:
 * - Question Options
 * - Skip Logic
 * - Validation Criteria
 * 
 * Matches Kobo/ODK professional standards
 * ============================================================================
 */

import { useLanguage } from '@/contexts/LanguageContext';
import { X, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Question {
  id: string;
  type: string;
  label: string;
  description?: string;
  required: boolean;
  options?: string[];
  constraint?: string;
  defaultValue?: string;
  calculation?: string;
  relevant?: string;
  appearance?: string;
  mediaQuality?: 'low' | 'normal' | 'high';
  gpsAccuracy?: number;
  minValue?: number;
  maxValue?: number;
  readOnly?: boolean;
  skipLogicRules?: SkipLogicRule[];
  validationRules?: ValidationRule[];
}

interface SkipLogicRule {
  id: string;
  sourceQuestion: string;
  operator: string;
  value: string;
  action: 'show' | 'hide' | 'skip';
  targetQuestion: string;
}

interface ValidationRule {
  id: string;
  type: 'min' | 'max' | 'regex' | 'date_range' | 'custom';
  value: string;
  message: string;
}

interface QuestionSettingsPanelProps {
  question: Question;
  allQuestions: Question[];
  onUpdate: (question: Question) => void;
  onClose: () => void;
}

export function QuestionSettingsPanel({ 
  question, 
  allQuestions,
  onUpdate, 
  onClose 
}: QuestionSettingsPanelProps) {
  const { language, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState<'options' | 'skip_logic' | 'validation'>('options');
  const [localQuestion, setLocalQuestion] = useState<Question>(question);

  const t = {
    questionSettings: language === 'en' ? 'Question Settings' : 'إعدادات السؤال',
    questionOptions: language === 'en' ? 'Question Options' : 'خيارات السؤال',
    skipLogic: language === 'en' ? 'Skip Logic' : 'منطق التخطي',
    validation: language === 'en' ? 'Validation Criteria' : 'معايير التحقق',
    save: language === 'en' ? 'Save' : 'حفظ',
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    required: language === 'en' ? 'Required' : 'مطلوب',
    optional: language === 'en' ? 'Optional' : 'اختياري',
    readOnly: language === 'en' ? 'Read-only' : 'للقراءة فقط',
    defaultValue: language === 'en' ? 'Default Value' : 'القيمة الافتراضية',
    appearance: language === 'en' ? 'Appearance' : 'المظهر',
    addCondition: language === 'en' ? '+ Add a condition' : '+ إضافة شرط',
    manualXLSForm: language === 'en' ? 'Manually enter skip logic in XLSForm code' : 'أدخل منطق التخطي يدوياً في كود XLSForm',
    ifQuestion: language === 'en' ? 'IF question' : 'إذا كان السؤال',
    operator: language === 'en' ? 'Operator' : 'المعامل',
    value: language === 'en' ? 'Value' : 'القيمة',
    thenAction: language === 'en' ? 'THEN action' : 'إذن الإجراء',
    targetQuestion: language === 'en' ? 'Target question' : 'السؤال المستهدف',
    addValidation: language === 'en' ? '+ Add validation rule' : '+ إضافة قاعدة تحقق',
    validationType: language === 'en' ? 'Validation Type' : 'نوع التحقق',
    errorMessage: language === 'en' ? 'Error Message' : 'رسالة الخطأ',
    choiceList: language === 'en' ? 'Choice List' : 'قائمة الخيارات',
    addOption: language === 'en' ? 'Add Option' : 'إضافة خيار',
  };

  const handleSave = () => {
    onUpdate(localQuestion);
    onClose();
  };

  const addSkipLogicRule = () => {
    const newRule: SkipLogicRule = {
      id: `rule_${Date.now()}`,
      sourceQuestion: '',
      operator: 'equals',
      value: '',
      action: 'show',
      targetQuestion: localQuestion.id,
    };
    setLocalQuestion({
      ...localQuestion,
      skipLogicRules: [...(localQuestion.skipLogicRules || []), newRule],
    });
  };

  const updateSkipLogicRule = (ruleId: string, updates: Partial<SkipLogicRule>) => {
    const updatedRules = (localQuestion.skipLogicRules || []).map(rule =>
      rule.id === ruleId ? { ...rule, ...updates } : rule
    );
    setLocalQuestion({ ...localQuestion, skipLogicRules: updatedRules });
  };

  const deleteSkipLogicRule = (ruleId: string) => {
    const updatedRules = (localQuestion.skipLogicRules || []).filter(rule => rule.id !== ruleId);
    setLocalQuestion({ ...localQuestion, skipLogicRules: updatedRules });
  };

  const addValidationRule = () => {
    const newRule: ValidationRule = {
      id: `val_${Date.now()}`,
      type: 'custom',
      value: '',
      message: '',
    };
    setLocalQuestion({
      ...localQuestion,
      validationRules: [...(localQuestion.validationRules || []), newRule],
    });
  };

  const updateValidationRule = (ruleId: string, updates: Partial<ValidationRule>) => {
    const updatedRules = (localQuestion.validationRules || []).map(rule =>
      rule.id === ruleId ? { ...rule, ...updates } : rule
    );
    setLocalQuestion({ ...localQuestion, validationRules: updatedRules });
  };

  const deleteValidationRule = (ruleId: string) => {
    const updatedRules = (localQuestion.validationRules || []).filter(rule => rule.id !== ruleId);
    setLocalQuestion({ ...localQuestion, validationRules: updatedRules });
  };

  return (
    <div className="fixed inset-0 flex items-center justify-end z-50 pointer-events-none">
      <div className={`w-full max-w-md bg-white h-full shadow-2xl flex flex-col pointer-events-auto ${isRTL ? 'ml-auto' : 'mr-auto'}`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b border-gray-200 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h2 className={`text-lg font-bold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.questionSettings}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex border-b border-gray-200 px-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => setActiveTab('options')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'options'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.questionOptions}
          </button>
          <button
            onClick={() => setActiveTab('skip_logic')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'skip_logic'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.skipLogic}
          </button>
          <button
            onClick={() => setActiveTab('validation')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'validation'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.validation}
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Question Options Tab */}
          {activeTab === 'options' && (
            <div className="space-y-5">
              {/* Required Toggle */}
              <div className={`flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
                  <p className="text-sm font-semibold text-gray-800">{t.required}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {language === 'en' ? 'Response is mandatory' : 'الإجابة إلزامية'}
                  </p>
                </div>
                <button
                  onClick={() => setLocalQuestion({ ...localQuestion, required: !localQuestion.required })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    localQuestion.required ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span 
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      localQuestion.required ? (isRTL ? 'right-0.5' : 'left-5') : (isRTL ? 'right-5' : 'left-0.5')
                    }`}
                  />
                </button>
              </div>

              {/* Read-only Toggle */}
              <div className={`flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
                  <p className="text-sm font-semibold text-gray-800">{t.readOnly}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {language === 'en' ? 'Prevent editing after submission' : 'منع التعديل بعد الإرسال'}
                  </p>
                </div>
                <button
                  onClick={() => setLocalQuestion({ ...localQuestion, readOnly: !localQuestion.readOnly })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    localQuestion.readOnly ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span 
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      localQuestion.readOnly ? (isRTL ? 'right-0.5' : 'left-5') : (isRTL ? 'right-5' : 'left-0.5')
                    }`}
                  />
                </button>
              </div>

              {/* Default Value */}
              {(localQuestion.type === 'text' || localQuestion.type === 'integer' || localQuestion.type === 'decimal') && (
                <div>
                  <label className={`text-sm font-semibold text-gray-700 mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.defaultValue}
                  </label>
                  <input
                    type={localQuestion.type === 'integer' || localQuestion.type === 'decimal' ? 'number' : 'text'}
                    value={localQuestion.defaultValue || ''}
                    onChange={(e) => setLocalQuestion({ ...localQuestion, defaultValue: e.target.value })}
                    className={`w-full px-4 py-2.5 rounded-lg text-sm bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      isRTL ? 'text-right' : 'text-left'
                    }`}
                  />
                </div>
              )}

              {/* Appearance */}
              <div>
                <label className={`text-sm font-semibold text-gray-700 mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t.appearance}
                </label>
                <select
                  value={localQuestion.appearance || ''}
                  onChange={(e) => setLocalQuestion({ ...localQuestion, appearance: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-lg text-sm bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    isRTL ? 'text-right' : 'text-left'
                  }`}
                >
                  <option value="">{language === 'en' ? 'Default' : 'افتراضي'}</option>
                  {localQuestion.type === 'text' && (
                    <>
                      <option value="multiline">{language === 'en' ? 'Multiline' : 'متعدد الأسطر'}</option>
                      <option value="numbers">{language === 'en' ? 'Numbers keyboard' : 'لوحة مفاتيح أرقام'}</option>
                    </>
                  )}
                  {(localQuestion.type === 'select_one' || localQuestion.type === 'select_multiple') && (
                    <>
                      <option value="minimal">{language === 'en' ? 'Dropdown' : 'قائمة منسدلة'}</option>
                      <option value="compact">{language === 'en' ? 'Compact' : 'مدمج'}</option>
                      <option value="quick">{language === 'en' ? 'Quick select' : 'اختيار سريع'}</option>
                    </>
                  )}
                </select>
              </div>

              {/* Choice List Editor (for select questions) */}
              {(localQuestion.type === 'select_one' || localQuestion.type === 'select_multiple') && (
                <div>
                  <label className={`text-sm font-semibold text-gray-700 mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.choiceList}
                  </label>
                  <div className="space-y-2">
                    {(localQuestion.options || []).map((option, idx) => (
                      <div key={idx} className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...(localQuestion.options || [])];
                            newOptions[idx] = e.target.value;
                            setLocalQuestion({ ...localQuestion, options: newOptions });
                          }}
                          className={`flex-1 px-4 py-2 rounded-lg text-sm bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500 ${
                            isRTL ? 'text-right' : 'text-left'
                          }`}
                        />
                        <button
                          onClick={() => {
                            const newOptions = (localQuestion.options || []).filter((_, i) => i !== idx);
                            setLocalQuestion({ ...localQuestion, options: newOptions });
                          }}
                          className="px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const newOptions = [...(localQuestion.options || []), ''];
                        setLocalQuestion({ ...localQuestion, options: newOptions });
                      }}
                      className="w-full px-4 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-sm font-medium"
                    >
                      + {t.addOption}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Skip Logic Tab */}
          {activeTab === 'skip_logic' && (
            <div className="space-y-4">
              {(localQuestion.skipLogicRules || []).map((rule) => (
                <div key={rule.id} className="p-4 border border-gray-200 rounded-lg space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Source Question */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">
                        {t.ifQuestion}
                      </label>
                      <select
                        value={rule.sourceQuestion}
                        onChange={(e) => updateSkipLogicRule(rule.id, { sourceQuestion: e.target.value })}
                        className="w-full px-3 py-2 rounded-md text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select...</option>
                        {allQuestions.filter(q => q.id !== localQuestion.id).map(q => (
                          <option key={q.id} value={q.id}>{q.label || q.id}</option>
                        ))}
                      </select>
                    </div>

                    {/* Operator */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">
                        {t.operator}
                      </label>
                      <select
                        value={rule.operator}
                        onChange={(e) => updateSkipLogicRule(rule.id, { operator: e.target.value })}
                        className="w-full px-3 py-2 rounded-md text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="equals">=</option>
                        <option value="not_equals">!=</option>
                        <option value="greater_than">&gt;</option>
                        <option value="less_than">&lt;</option>
                        <option value="contains">{language === 'en' ? 'contains' : 'يحتوي'}</option>
                      </select>
                    </div>
                  </div>

                  {/* Value */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      {t.value}
                    </label>
                    <input
                      type="text"
                      value={rule.value}
                      onChange={(e) => updateSkipLogicRule(rule.id, { value: e.target.value })}
                      className="w-full px-3 py-2 rounded-md text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Action */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      {t.thenAction}
                    </label>
                    <select
                      value={rule.action}
                      onChange={(e) => updateSkipLogicRule(rule.id, { action: e.target.value as 'show' | 'hide' | 'skip' })}
                      className="w-full px-3 py-2 rounded-md text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="show">{language === 'en' ? 'Show this question' : 'إظهار هذا السؤال'}</option>
                      <option value="hide">{language === 'en' ? 'Hide this question' : 'إخفاء هذا السؤال'}</option>
                      <option value="skip">{language === 'en' ? 'Skip to question' : 'تخطي إلى السؤال'}</option>
                    </select>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => deleteSkipLogicRule(rule.id)}
                    className="w-full px-3 py-2 rounded-md bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium"
                  >
                    {language === 'en' ? 'Remove Condition' : 'إزالة الشرط'}
                  </button>
                </div>
              ))}

              <button
                onClick={addSkipLogicRule}
                className="w-full px-4 py-3 rounded-lg border-2 border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 font-medium transition-colors"
              >
                {t.addCondition}
              </button>

              {/* Manual XLSForm Entry */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">{t.manualXLSForm}</p>
                <textarea
                  value={localQuestion.relevant || ''}
                  onChange={(e) => setLocalQuestion({ ...localQuestion, relevant: e.target.value })}
                  placeholder="e.g., ${age} > 18 and ${country} = 'Syria'"
                  rows={3}
                  className="w-full px-3 py-2 rounded-md text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>
          )}

          {/* Validation Tab */}
          {activeTab === 'validation' && (
            <div className="space-y-4">
              {(localQuestion.validationRules || []).map((rule) => (
                <div key={rule.id} className="p-4 border border-gray-200 rounded-lg space-y-3">
                  {/* Validation Type */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      {t.validationType}
                    </label>
                    <select
                      value={rule.type}
                      onChange={(e) => updateValidationRule(rule.id, { type: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-md text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="min">{language === 'en' ? 'Minimum value' : 'القيمة الدنيا'}</option>
                      <option value="max">{language === 'en' ? 'Maximum value' : 'القيمة القصوى'}</option>
                      <option value="regex">{language === 'en' ? 'Pattern (regex)' : 'نمط (regex)'}</option>
                      <option value="date_range">{language === 'en' ? 'Date range' : 'نطاق التاريخ'}</option>
                      <option value="custom">{language === 'en' ? 'Custom expression' : 'تعبير مخصص'}</option>
                    </select>
                  </div>

                  {/* Value */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      {t.value}
                    </label>
                    <input
                      type="text"
                      value={rule.value}
                      onChange={(e) => updateValidationRule(rule.id, { value: e.target.value })}
                      placeholder={rule.type === 'regex' ? 'e.g., ^[A-Z]{3}$' : 'e.g., 18'}
                      className="w-full px-3 py-2 rounded-md text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  {/* Error Message */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      {t.errorMessage}
                    </label>
                    <input
                      type="text"
                      value={rule.message}
                      onChange={(e) => updateValidationRule(rule.id, { message: e.target.value })}
                      placeholder={language === 'en' ? 'Custom error message' : 'رسالة خطأ مخصصة'}
                      className="w-full px-3 py-2 rounded-md text-sm border border-gray-300 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => deleteValidationRule(rule.id)}
                    className="w-full px-3 py-2 rounded-md bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium"
                  >
                    {language === 'en' ? 'Remove Rule' : 'إزالة القاعدة'}
                  </button>
                </div>
              ))}

              <button
                onClick={addValidationRule}
                className="w-full px-4 py-3 rounded-lg border-2 border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 font-medium transition-colors"
              >
                {t.addValidation}
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={`px-6 py-4 border-t border-gray-100 flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={handleSave}
            className="flex-1 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <span className="font-semibold text-white text-sm">{t.save}</span>
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium text-gray-700 text-sm">{t.cancel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}