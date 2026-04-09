/**
 * ============================================================================
 * OFFER LETTER GENERATOR
 * ============================================================================
 * 
 * Features:
 * - Editable offer letter form pre-populated from hiring decision
 * - Professional A4 layout for printing/PDF
 * - Bilingual support (EN/AR)
 * - Save and print functionality
 * - Complete offer details (salary, benefits, terms)
 * 
 * ============================================================================
 */

import { useState, useRef } from 'react';
import { X, Save, Printer, FileText, Calendar, DollarSign } from 'lucide-react';
import { hiringDecisionService, candidateService, vacancyService } from './recruitmentService';
import { HiringDecision } from './types';
import { offerLetterTemplateService, OfferLetterTemplate } from '@/app/services/offerLetterTemplateService';

interface Props {
  language: string;
  isRTL: boolean;
  hiringDecision: HiringDecision;
  onClose: () => void;
  onSave: () => void;
}

export function OfferLetterGenerator({ language, isRTL, hiringDecision, onClose, onSave }: Props) {
  const candidate = candidateService.getById(hiringDecision.candidateId);
  const vacancy = vacancyService.getById(hiringDecision.vacancyId);
  const printRef = useRef<HTMLDivElement>(null);

  // Initialize templates
  offerLetterTemplateService.initializeDefaults();
  const availableTemplates = offerLetterTemplateService.getActive();
  const defaultTemplate = offerLetterTemplateService.getDefault();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(defaultTemplate?.templateId || '');
  const [selectedTemplate, setSelectedTemplate] = useState<OfferLetterTemplate | null>(defaultTemplate);

  // Merge template with hiring decision data
  const getMergedTemplate = (template: OfferLetterTemplate | null) => {
    if (!template || !candidate || !vacancy) return null;
    
    return offerLetterTemplateService.mergeTemplate(template, {
      candidateName: candidate.fullName,
      positionTitle: vacancy.positionTitle,
      contractType: hiringDecision.contractType,
      startDate: hiringDecision.startDate,
      salary: hiringDecision.proposedSalary,
      workLocation: vacancy.dutyStation || 'Main Office'
    });
  };

  const mergedTemplate = getMergedTemplate(selectedTemplate);

  const [formData, setFormData] = useState({
    // Template Selection
    templateId: selectedTemplateId,
    
    // Organization Details (from template or defaults)
    organizationName: mergedTemplate?.organizationName || 'Humanitarian Organization',
    organizationAddress: mergedTemplate?.organizationAddress || '123 Main Street, City, Country',
    organizationPhone: mergedTemplate?.organizationPhone || '+1 234 567 8900',
    organizationEmail: mergedTemplate?.organizationEmail || 'hr@organization.org',
    organizationWebsite: mergedTemplate?.organizationWebsite || '',
    
    // Letter Details
    letterDate: new Date().toISOString().split('T')[0],
    referenceNumber: `OFFER-${hiringDecision.id.substring(0, 8).toUpperCase()}`,
    letterHeading: mergedTemplate?.letterHeading || 'Employment Offer Letter',
    
    // Candidate Details
    candidateName: candidate?.fullName || '',
    candidateAddress: candidate?.currentLocation || '',
    
    // Position Details
    positionTitle: vacancy?.positionTitle || '',
    department: vacancy?.department || '',
    reportingTo: vacancy?.hiringManager || 'Department Manager',
    workLocation: vacancy?.dutyStation || '',
    
    // Employment Terms
    employmentType: hiringDecision.contractType,
    startDate: hiringDecision.startDate,
    contractEndDate: hiringDecision.contractType === 'Fixed-Term' ? '' : undefined,
    probationPeriod: selectedTemplate?.defaults.probationPeriod || '3 months',
    
    // Compensation
    salary: hiringDecision.proposedSalary.toString(),
    currency: selectedTemplate?.defaults.currency || 'USD',
    salaryFrequency: selectedTemplate?.defaults.salaryFrequency || 'Monthly',
    
    // Benefits
    annualLeave: selectedTemplate?.defaults.annualLeave || '30 days per year',
    medicalInsurance: 'Comprehensive health insurance coverage',
    otherBenefits: 'Transportation allowance, professional development opportunities',
    
    // Working Hours
    workingHours: mergedTemplate?.workingHoursText || '40 hours per week (8 hours per day, Sunday to Thursday)',
    
    // Letter Content (from template)
    openingParagraph: mergedTemplate?.openingParagraph || '',
    employmentTermsIntro: mergedTemplate?.employmentTermsIntro || '',
    probationPeriodText: mergedTemplate?.probationPeriodText || '',
    compensationIntro: mergedTemplate?.compensationIntro || '',
    benefitsText: mergedTemplate?.benefitsText || '',
    workingHoursText: mergedTemplate?.workingHoursText || '',
    workLocationText: mergedTemplate?.workLocationText || '',
    
    // Terms & Conditions
    termsAndConditions: mergedTemplate?.termsAndConditions || `1. This offer is contingent upon successful completion of reference checks and background verification.
2. You will be required to comply with all organizational policies and procedures.
3. This employment is subject to a probation period of three months.
4. Either party may terminate this employment with 30 days written notice.
5. You will be required to sign a confidentiality agreement.`,
    
    // Closing
    closingParagraph: mergedTemplate?.closingParagraph || 'We look forward to welcoming you to our team. Please sign and return a copy of this letter to confirm your acceptance.',
    closingStatement: mergedTemplate?.closingStatement || 'Sincerely,',
    
    // Additional Notes
    additionalNotes: mergedTemplate?.additionalNotes || '',
    
    // Signature Details
    signatoryName: mergedTemplate?.signatoryName || 'Human Resources Manager',
    signatoryTitle: mergedTemplate?.signatoryTitle || 'HR Manager',
    signatoryDate: new Date().toISOString().split('T')[0]
  });

  // Handle template change
  const handleTemplateChange = (templateId: string) => {
    const template = offerLetterTemplateService.getById(templateId);
    if (!template) return;
    
    setSelectedTemplateId(templateId);
    setSelectedTemplate(template);
    
    const merged = getMergedTemplate(template);
    if (merged) {
      setFormData(prev => ({
        ...prev,
        templateId,
        organizationName: merged.organizationName,
        organizationAddress: merged.organizationAddress,
        organizationPhone: merged.organizationPhone,
        organizationEmail: merged.organizationEmail,
        organizationWebsite: merged.organizationWebsite || '',
        letterHeading: merged.letterHeading,
        openingParagraph: merged.openingParagraph,
        employmentTermsIntro: merged.employmentTermsIntro,
        probationPeriodText: merged.probationPeriodText,
        compensationIntro: merged.compensationIntro,
        benefitsText: merged.benefitsText,
        workingHoursText: merged.workingHoursText,
        workLocationText: merged.workLocationText,
        termsAndConditions: merged.termsAndConditions,
        closingParagraph: merged.closingParagraph,
        closingStatement: merged.closingStatement,
        signatoryName: merged.signatoryName,
        signatoryTitle: merged.signatoryTitle,
        probationPeriod: template.defaults.probationPeriod,
        currency: template.defaults.currency,
        salaryFrequency: template.defaults.salaryFrequency,
        annualLeave: template.defaults.annualLeave
      }));
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // Update hiring decision with offer letter flag
    hiringDecisionService.update(hiringDecision.id, {
      offerLetterGenerated: true,
      offerLetterDate: formData.letterDate
    });

    // Store offer letter data
    const offerLetterData = {
      hiringDecisionId: hiringDecision.id,
      ...formData,
      generatedAt: new Date().toISOString()
    };
    
    localStorage.setItem(`offer_letter_${hiringDecision.id}`, JSON.stringify(offerLetterData));
    
    onSave();
  };

  const handlePrint = () => {
    window.print();
  };

  const t = {
    title: language === 'en' ? 'Generate Offer Letter' : 'إنشاء خطاب العرض',
    editForm: language === 'en' ? 'Edit Offer Details' : 'تعديل تفاصيل العرض',
    preview: language === 'en' ? 'Preview' : 'معاينة',
    
    // Form sections
    organizationDetails: language === 'en' ? 'Organization Details' : 'تفاصيل المنظمة',
    candidateDetails: language === 'en' ? 'Candidate Details' : 'تفاصيل المرشح',
    positionDetails: language === 'en' ? 'Position Details' : 'تفاصيل الوظيفة',
    employmentTerms: language === 'en' ? 'Employment Terms' : 'شروط التوظيف',
    compensation: language === 'en' ? 'Compensation & Benefits' : 'التعويضات والمزايا',
    termsConditions: language === 'en' ? 'Terms & Conditions' : 'الشروط والأحكام',
    
    // Fields
    organizationName: language === 'en' ? 'Organization Name' : 'اسم المنظمة',
    organizationAddress: language === 'en' ? 'Address' : 'العنوان',
    organizationPhone: language === 'en' ? 'Phone' : 'الهاتف',
    organizationEmail: language === 'en' ? 'Email' : 'البريد الإلكتروني',
    organizationWebsite: language === 'en' ? 'Website' : 'الموقع الإلكتروني',
    letterDate: language === 'en' ? 'Letter Date' : 'تاريخ الخطاب',
    referenceNumber: language === 'en' ? 'Reference Number' : 'الرقم المرجعي',
    letterHeading: language === 'en' ? 'Letter Heading' : 'عنوان الخطاب',
    
    candidateName: language === 'en' ? 'Candidate Name' : 'اسم المرشح',
    candidateAddress: language === 'en' ? 'Candidate Address' : 'عنوان المرشح',
    
    positionTitle: language === 'en' ? 'Position Title' : 'المسمى الوظيفي',
    department: language === 'en' ? 'Department' : 'القسم',
    reportingTo: language === 'en' ? 'Reporting To' : 'يرفع التقارير إلى',
    workLocation: language === 'en' ? 'Work Location' : 'موقع العمل',
    
    employmentType: language === 'en' ? 'Employment Type' : 'نوع التوظيف',
    startDate: language === 'en' ? 'Start Date' : 'تاريخ البدء',
    contractEndDate: language === 'en' ? 'Contract End Date (if applicable)' : 'تاريخ انتهاء العقد (إن وجد)',
    probationPeriod: language === 'en' ? 'Probation Period' : 'فترة التجربة',
    
    salary: language === 'en' ? 'Salary' : 'الراتب',
    currency: language === 'en' ? 'Currency' : 'العملة',
    salaryFrequency: language === 'en' ? 'Frequency' : 'التكرار',
    annualLeave: language === 'en' ? 'Annual Leave' : 'الإجازة السنوية',
    medicalInsurance: language === 'en' ? 'Medical Insurance' : 'التأمين الطبي',
    otherBenefits: language === 'en' ? 'Other Benefits' : 'مزايا أخرى',
    workingHours: language === 'en' ? 'Working Hours' : 'ساعات العمل',
    
    termsText: language === 'en' ? 'Terms & Conditions' : 'الشروط والأحكام',
    additionalNotes: language === 'en' ? 'Additional Notes' : 'ملاحظات إضافية',
    
    signatoryName: language === 'en' ? 'Signatory Name' : 'اسم الموقع',
    signatoryTitle: language === 'en' ? 'Signatory Title' : 'منصب الموقع',
    
    // Actions
    save: language === 'en' ? 'Save Offer Letter' : 'حفظ خطاب العرض',
    print: language === 'en' ? 'Print / Save PDF' : 'طباعة / حفظ PDF',
    cancel: language === 'en' ? 'Cancel' : 'إلغاء',
    
    // Letter content
    dear: language === 'en' ? 'Dear' : 'عزيزي/عزيزتي',
    offerSubject: language === 'en' ? 'Subject: Offer of Employment' : 'الموضوع: عرض توظيف',
    openingPara: language === 'en' 
      ? 'We are pleased to offer you the position of' 
      : 'يسعدنا أن نقدم لك عرضاً للعمل في منصب',
    closingPara: language === 'en'
      ? 'We look forward to welcoming you to our team. Please sign and return a copy of this letter to confirm your acceptance.'
      : 'نتطلع إلى الترحيب بك في فريقنا. يرجى التوقيع وإعادة نسخة من هذا الخطاب لتأكيد قبولك.',
    sincerely: language === 'en' ? 'Sincerely' : 'مع خالص التحية',
    candidateAcceptance: language === 'en' ? 'Candidate Acceptance' : 'قبول المرشح',
    signature: language === 'en' ? 'Signature' : 'التوقيع',
    date: language === 'en' ? 'Date' : 'التاريخ'
  };

  return (
    <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">{t.title}</h2>
              <p className="text-sm text-blue-100">
                {candidate?.fullName} - {vacancy?.positionTitle}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-blue-700 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Split View */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left: Editable Form */}
          <div className="w-1/2 border-r border-gray-200 overflow-y-auto p-6 space-y-6 print:hidden">
            <h3 className="text-lg font-bold text-gray-900">{t.editForm}</h3>

            {/* Template Selection */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-700">Template Selection</h4>
              
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Select Template
                </label>
                <select
                  value={formData.templateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {availableTemplates.map(template => (
                    <option key={template.templateId} value={template.templateId}>
                      {template.templateName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Organization Details */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-700">{t.organizationDetails}</h4>
              
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t.organizationName}
                </label>
                <input
                  type="text"
                  value={formData.organizationName}
                  onChange={(e) => handleInputChange('organizationName', e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t.organizationAddress}
                </label>
                <textarea
                  value={formData.organizationAddress}
                  onChange={(e) => handleInputChange('organizationAddress', e.target.value)}
                  rows={2}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t.organizationPhone}
                  </label>
                  <input
                    type="text"
                    value={formData.organizationPhone}
                    onChange={(e) => handleInputChange('organizationPhone', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t.organizationEmail}
                  </label>
                  <input
                    type="email"
                    value={formData.organizationEmail}
                    onChange={(e) => handleInputChange('organizationEmail', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t.letterDate}
                  </label>
                  <input
                    type="date"
                    value={formData.letterDate}
                    onChange={(e) => handleInputChange('letterDate', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t.referenceNumber}
                  </label>
                  <input
                    type="text"
                    value={formData.referenceNumber}
                    onChange={(e) => handleInputChange('referenceNumber', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Candidate Details */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-700">{t.candidateDetails}</h4>
              
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t.candidateName}
                </label>
                <input
                  type="text"
                  value={formData.candidateName}
                  onChange={(e) => handleInputChange('candidateName', e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t.candidateAddress}
                </label>
                <textarea
                  value={formData.candidateAddress}
                  onChange={(e) => handleInputChange('candidateAddress', e.target.value)}
                  rows={2}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Position Details */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-700">{t.positionDetails}</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t.positionTitle}
                  </label>
                  <input
                    type="text"
                    value={formData.positionTitle}
                    onChange={(e) => handleInputChange('positionTitle', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t.department}
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t.reportingTo}
                  </label>
                  <input
                    type="text"
                    value={formData.reportingTo}
                    onChange={(e) => handleInputChange('reportingTo', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t.workLocation}
                  </label>
                  <input
                    type="text"
                    value={formData.workLocation}
                    onChange={(e) => handleInputChange('workLocation', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Employment Terms */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-700">{t.employmentTerms}</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t.employmentType}
                  </label>
                  <input
                    type="text"
                    value={formData.employmentType}
                    onChange={(e) => handleInputChange('employmentType', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t.probationPeriod}
                  </label>
                  <input
                    type="text"
                    value={formData.probationPeriod}
                    onChange={(e) => handleInputChange('probationPeriod', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t.startDate}
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {formData.contractEndDate !== undefined && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {t.contractEndDate}
                    </label>
                    <input
                      type="date"
                      value={formData.contractEndDate}
                      onChange={(e) => handleInputChange('contractEndDate', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Compensation */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-700">{t.compensation}</h4>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t.salary}
                  </label>
                  <input
                    type="text"
                    value={formData.salary}
                    onChange={(e) => handleInputChange('salary', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t.currency}
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => handleInputChange('currency', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="JOD">JOD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t.salaryFrequency}
                  </label>
                  <select
                    value={formData.salaryFrequency}
                    onChange={(e) => handleInputChange('salaryFrequency', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Annually">Annually</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t.annualLeave}
                </label>
                <input
                  type="text"
                  value={formData.annualLeave}
                  onChange={(e) => handleInputChange('annualLeave', e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t.medicalInsurance}
                </label>
                <input
                  type="text"
                  value={formData.medicalInsurance}
                  onChange={(e) => handleInputChange('medicalInsurance', e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t.otherBenefits}
                </label>
                <textarea
                  value={formData.otherBenefits}
                  onChange={(e) => handleInputChange('otherBenefits', e.target.value)}
                  rows={2}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t.workingHours}
                </label>
                <input
                  type="text"
                  value={formData.workingHours}
                  onChange={(e) => handleInputChange('workingHours', e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-700">{t.termsConditions}</h4>
              
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t.termsText}
                </label>
                <textarea
                  value={formData.termsAndConditions}
                  onChange={(e) => handleInputChange('termsAndConditions', e.target.value)}
                  rows={6}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t.additionalNotes}
                </label>
                <textarea
                  value={formData.additionalNotes}
                  onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                  rows={3}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Signatory */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-700">Signatory Details</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t.signatoryName}
                  </label>
                  <input
                    type="text"
                    value={formData.signatoryName}
                    onChange={(e) => handleInputChange('signatoryName', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {t.signatoryTitle}
                  </label>
                  <input
                    type="text"
                    value={formData.signatoryTitle}
                    onChange={(e) => handleInputChange('signatoryTitle', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Print Preview */}
          <div className="w-1/2 overflow-y-auto bg-gray-100 p-6 print:w-full print:p-0 print:bg-white">
            <div 
              ref={printRef}
              className="bg-white shadow-lg mx-auto print:shadow-none print:mx-0"
              style={{ 
                width: '210mm',
                minHeight: '297mm',
                padding: '20mm'
              }}
            >
              {/* Letterhead */}
              <div className="border-b-2 border-gray-800 pb-4 mb-6">
                <h1 className="text-2xl font-bold text-gray-900">{formData.organizationName}</h1>
                <p className="text-sm text-gray-600 mt-1">{formData.organizationAddress}</p>
                <p className="text-sm text-gray-600">
                  Tel: {formData.organizationPhone} | Email: {formData.organizationEmail}
                </p>
              </div>

              {/* Reference and Date */}
              <div className="flex justify-between mb-6 text-sm">
                <div>
                  <p className="text-gray-600">Ref: {formData.referenceNumber}</p>
                </div>
                <div>
                  <p className="text-gray-600">
                    Date: {new Date(formData.letterDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {/* Recipient */}
              <div className="mb-6">
                <p className="font-medium">{formData.candidateName}</p>
                <p className="text-sm text-gray-600 whitespace-pre-line">{formData.candidateAddress}</p>
              </div>

              {/* Salutation */}
              <p className="mb-4">{t.dear} {formData.candidateName},</p>

              {/* Subject */}
              <p className="font-bold mb-4 text-center">{t.offerSubject}</p>

              {/* Body */}
              <div className="space-y-4 text-sm leading-relaxed">
                <p>
                  {t.openingPara} <strong>{formData.positionTitle}</strong> in our <strong>{formData.department}</strong> department. 
                  We believe your skills and experience will be a valuable asset to our organization.
                </p>

                {/* Position Details */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <p><strong>Position Title:</strong> {formData.positionTitle}</p>
                  <p><strong>Department:</strong> {formData.department}</p>
                  <p><strong>Reporting To:</strong> {formData.reportingTo}</p>
                  <p><strong>Work Location:</strong> {formData.workLocation}</p>
                  <p><strong>Employment Type:</strong> {formData.employmentType}</p>
                  <p><strong>Start Date:</strong> {new Date(formData.startDate).toLocaleDateString()}</p>
                  {formData.contractEndDate && (
                    <p><strong>Contract End Date:</strong> {new Date(formData.contractEndDate).toLocaleDateString()}</p>
                  )}
                  <p><strong>Probation Period:</strong> {formData.probationPeriod}</p>
                </div>

                {/* Compensation */}
                <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                  <p className="font-bold text-blue-900">Compensation & Benefits:</p>
                  <p><strong>Salary:</strong> {formData.currency} {formData.salary} ({formData.salaryFrequency})</p>
                  <p><strong>Annual Leave:</strong> {formData.annualLeave}</p>
                  <p><strong>Medical Insurance:</strong> {formData.medicalInsurance}</p>
                  <p><strong>Other Benefits:</strong> {formData.otherBenefits}</p>
                  <p><strong>Working Hours:</strong> {formData.workingHours}</p>
                </div>

                {/* Terms & Conditions */}
                <div>
                  <p className="font-bold mb-2">Terms & Conditions:</p>
                  <div className="text-sm whitespace-pre-line text-gray-700 pl-4">
                    {formData.termsAndConditions}
                  </div>
                </div>

                {/* Additional Notes */}
                {formData.additionalNotes && (
                  <div>
                    <p className="font-bold mb-2">Additional Notes:</p>
                    <p className="text-sm text-gray-700 whitespace-pre-line pl-4">
                      {formData.additionalNotes}
                    </p>
                  </div>
                )}

                <p className="mt-6">{t.closingPara}</p>
              </div>

              {/* Closing */}
              <div className="mt-8">
                <p className="mb-12">{t.sincerely},</p>
                <div>
                  <p className="font-bold">{formData.signatoryName}</p>
                  <p className="text-sm text-gray-600">{formData.signatoryTitle}</p>
                </div>
              </div>

              {/* Acceptance Section */}
              <div className="mt-12 pt-6 border-t-2 border-gray-300">
                <p className="font-bold mb-4">{t.candidateAcceptance}:</p>
                <p className="text-sm mb-6">
                  I, {formData.candidateName}, accept the terms and conditions stated in this offer letter.
                </p>
                
                <div className="grid grid-cols-2 gap-8 mt-8">
                  <div>
                    <div className="border-b border-gray-400 pb-1 mb-1">
                      <span className="invisible">Signature</span>
                    </div>
                    <p className="text-xs text-gray-600">{t.signature}</p>
                  </div>
                  
                  <div>
                    <div className="border-b border-gray-400 pb-1 mb-1">
                      <span className="invisible">Date</span>
                    </div>
                    <p className="text-xs text-gray-600">{t.date}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {t.cancel}
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              {t.print}
            </button>
            
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {t.save}
            </button>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}