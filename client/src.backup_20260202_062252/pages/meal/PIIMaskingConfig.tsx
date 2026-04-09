/**
 * ============================================================================
 * PII MASKING CONFIGURATION
 * ============================================================================
 * 
 * Configure which fields are masked in exports for privacy protection
 * 
 * FEATURES:
 * - List of all form fields across surveys
 * - Enable/disable masking per field
 * - Preview masked vs unmasked data
 * - Common PII fields (name, phone, email, ID) auto-detected
 * - Save configuration
 * - Bilingual support (EN/AR) with RTL
 * 
 * ============================================================================
 */

import { useLocation, useSearch } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowLeft, Save, Eye, EyeOff, Shield, AlertCircle } from 'lucide-react';
import { useState } from 'react';

interface MaskableField {
  id: string;
  fieldName: string;
  fieldType: 'text' | 'number' | 'email' | 'phone' | 'date' | 'file';
  surveyName: string;
  isPII: boolean;
  isMasked: boolean;
  exampleValue: string;
  maskedExample: string;
}

export function PIIMaskingConfig() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const { language, isRTL } = useLanguage();

  const projectId = searchParams.get('projectId') || '';
  const projectName = searchParams.get('projectName') || '';

  const t = {
    title: language === 'en' ? 'PII Masking Configuration' : 'تكوين إخفاء المعلومات الشخصية',
    subtitle: language === 'en' 
      ? 'Configure which fields are masked in exports for privacy protection' 
      : 'تكوين الحقول التي يتم إخفاؤها في الصادرات لحماية الخصوصية',
    back: language === 'en' ? 'Back' : 'رجوع',
    saveConfig: language === 'en' ? 'Save Configuration' : 'حفظ التكوين',
    
    infoTitle: language === 'en' ? 'What is PII Masking?' : 'ما هو إخفاء المعلومات الشخصية؟',
    infoDesc: language === 'en'
      ? 'PII (Personally Identifiable Information) masking protects sensitive data by replacing real values with masked versions in exports. This ensures compliance with data protection regulations (GDPR, etc.).'
      : 'يحمي إخفاء المعلومات الشخصية (PII) البيانات الحساسة عن طريق استبدال القيم الحقيقية بإصدارات مقنعة في الصادرات. يضمن ذلك الامتثال للوائح حماية البيانات (GDPR وما إلى ذلك).',
    
    fieldName: language === 'en' ? 'Field Name' : 'اسم الحقل',
    surveyName: language === 'en' ? 'Survey' : 'المسح',
    fieldType: language === 'en' ? 'Type' : 'النوع',
    isPII: language === 'en' ? 'PII' : 'معلومات شخصية',
    masked: language === 'en' ? 'Masked' : 'مخفي',
    preview: language === 'en' ? 'Preview' : 'معاينة',
    
    exampleValue: language === 'en' ? 'Example Value' : 'قيمة مثال',
    maskedValue: language === 'en' ? 'Masked Value' : 'قيمة مخفية',
    
    selectAll: language === 'en' ? 'Select All PII Fields' : 'تحديد جميع حقول المعلومات الشخصية',
    deselectAll: language === 'en' ? 'Deselect All' : 'إلغاء تحديد الكل',
    
    piiDetected: language === 'en' ? 'PII Detected' : 'تم الكشف عن معلومات شخصية',
    
    success: language === 'en' ? 'Success' : 'نجح',
    configSaved: language === 'en' ? 'PII masking configuration saved successfully' : 'تم حفظ تكوين إخفاء المعلومات الشخصية بنجاح',
  };

  // Mock data - Common form fields with auto-detected PII
  const [fields, setFields] = useState<MaskableField[]>([
    {
      id: '1',
      fieldName: 'Beneficiary Full Name',
      fieldType: 'text',
      surveyName: 'Household Needs Assessment',
      isPII: true,
      isMasked: true,
      exampleValue: 'Ahmed Mohamed Hassan',
      maskedExample: 'A****** M****** H******',
    },
    {
      id: '2',
      fieldName: 'Phone Number',
      fieldType: 'phone',
      surveyName: 'Household Needs Assessment',
      isPII: true,
      isMasked: true,
      exampleValue: '+967 771 234 567',
      maskedExample: '+967 *** *** ***',
    },
    {
      id: '3',
      fieldName: 'Email Address',
      fieldType: 'email',
      surveyName: 'Household Needs Assessment',
      isPII: true,
      isMasked: true,
      exampleValue: 'ahmed.hassan@example.com',
      maskedExample: 'a****@*******.com',
    },
    {
      id: '4',
      fieldName: 'National ID Number',
      fieldType: 'text',
      surveyName: 'Household Needs Assessment',
      isPII: true,
      isMasked: true,
      exampleValue: '01234567890123',
      maskedExample: '******7890123',
    },
    {
      id: '5',
      fieldName: 'Date of Birth',
      fieldType: 'date',
      surveyName: 'Household Needs Assessment',
      isPII: true,
      isMasked: false,
      exampleValue: '1985-03-15',
      maskedExample: '****-**-15',
    },
    {
      id: '6',
      fieldName: 'GPS Location',
      fieldType: 'text',
      surveyName: 'Household Needs Assessment',
      isPII: true,
      isMasked: false,
      exampleValue: '15.3694° N, 44.1910° E',
      maskedExample: '**.****° N, **.****° E',
    },
    {
      id: '7',
      fieldName: 'Household Size',
      fieldType: 'number',
      surveyName: 'Household Needs Assessment',
      isPII: false,
      isMasked: false,
      exampleValue: '6',
      maskedExample: '6',
    },
    {
      id: '8',
      fieldName: 'District',
      fieldType: 'text',
      surveyName: 'Household Needs Assessment',
      isPII: false,
      isMasked: false,
      exampleValue: 'Sana\'a District',
      maskedExample: 'Sana\'a District',
    },
    {
      id: '9',
      fieldName: 'Assistance Type',
      fieldType: 'text',
      surveyName: 'Distribution Monitoring',
      isPII: false,
      isMasked: false,
      exampleValue: 'Food Basket',
      maskedExample: 'Food Basket',
    },
    {
      id: '10',
      fieldName: 'Beneficiary Signature',
      fieldType: 'file',
      surveyName: 'Distribution Monitoring',
      isPII: true,
      isMasked: true,
      exampleValue: 'signature.png',
      maskedExample: '[REDACTED]',
    },
  ]);

  const handleToggleMasking = (fieldId: string) => {
    setFields(fields.map(field => 
      field.id === fieldId 
        ? { ...field, isMasked: !field.isMasked }
        : field
    ));
  };

  const handleSelectAllPII = () => {
    setFields(fields.map(field => ({
      ...field,
      isMasked: field.isPII ? true : field.isMasked,
    })));
  };

  const handleDeselectAll = () => {
    setFields(fields.map(field => ({
      ...field,
      isMasked: false,
    })));
  };

  const handleSave = () => {
    const maskedCount = fields.filter(f => f.isMasked).length;
    console.log('Saving PII masking config:', fields.filter(f => f.isMasked));
    alert(`${t.configSaved}\n\n${maskedCount} ${language === 'en' ? 'fields will be masked' : 'حقول سيتم إخفاؤها'}`);
  };

  const piiFieldsCount = fields.filter(f => f.isPII).length;
  const maskedFieldsCount = fields.filter(f => f.isMasked).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className={`flex items-center justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
            <p className="text-sm text-gray-600 mt-1">{t.subtitle}</p>
          </div>
          <button
            onClick={() => navigate(`/meal/survey/settings?projectId=${projectId}&projectName=${projectName}`)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            <span className="text-sm font-medium text-gray-700">{t.back}</span>
          </button>
        </div>

        {/* Info Banner */}
        <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
            <h3 className="text-sm font-bold text-blue-900 mb-1">{t.infoTitle}</h3>
            <p className="text-sm text-blue-700">{t.infoDesc}</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="p-3 bg-red-100 rounded-lg">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-sm text-gray-600">{t.piiDetected}</p>
                <p className="text-2xl font-bold text-gray-900">{piiFieldsCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="p-3 bg-green-100 rounded-lg">
                <EyeOff className="w-6 h-6 text-green-600" />
              </div>
              <div className={isRTL ? 'text-right' : 'text-left'}>
                <p className="text-sm text-gray-600">{t.masked}</p>
                <p className="text-2xl font-bold text-gray-900">{maskedFieldsCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={handleSelectAllPII}
            className="px-4 py-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium text-sm transition-colors"
          >
            {t.selectAll}
          </button>
          <button
            onClick={handleDeselectAll}
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium text-sm transition-colors"
          >
            {t.deselectAll}
          </button>
        </div>

        {/* Fields Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.fieldName}
                  </th>
                  <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.surveyName}
                  </th>
                  <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.fieldType}
                  </th>
                  <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider text-center`}>
                    {t.isPII}
                  </th>
                  <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider text-center`}>
                    {t.masked}
                  </th>
                  <th className={`px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.preview}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {fields.map((field) => (
                  <tr key={field.id} className="hover:bg-gray-50 transition-colors">
                    <td className={`px-4 py-3 text-sm font-medium text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {field.fieldName}
                    </td>
                    <td className={`px-4 py-3 text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {field.surveyName}
                    </td>
                    <td className={`px-4 py-3 text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700">
                        {field.fieldType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {field.isPII && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-700">
                          {t.piiDetected}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleMasking(field.id)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${
                          field.isMasked ? 'bg-green-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            field.isMasked ? (isRTL ? 'left-1' : 'right-1') : (isRTL ? 'right-1' : 'left-1')
                          }`}
                        />
                      </button>
                    </td>
                    <td className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                      <div className="space-y-1">
                        <div className={`text-xs text-gray-500 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <Eye className="w-3 h-3" />
                          <span>{field.exampleValue}</span>
                        </div>
                        <div className={`text-xs text-gray-900 font-medium flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <EyeOff className="w-3 h-3" />
                          <span>{field.isMasked ? field.maskedExample : field.exampleValue}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className={`w-full flex items-center justify-center gap-2 rounded-lg py-4 bg-blue-600 hover:bg-blue-700 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <Save className="w-5 h-5 text-white" />
          <span className="font-semibold text-white">{t.saveConfig}</span>
        </button>
      </div>
    </div>
  );
}
