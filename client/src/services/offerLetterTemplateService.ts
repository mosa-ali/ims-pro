/**
 * ============================================================================
 * OFFER LETTER TEMPLATE SERVICE
 * ============================================================================
 * 
 * Manages reusable offer letter templates
 * Templates contain merge fields that auto-populate from candidate/vacancy data
 * 
 * ============================================================================
 */

export interface OfferLetterTemplate {
 templateId: string;
 templateName: string;
 isDefault: boolean;
 active: boolean;
 createdAt: string;
 updatedAt: string;
 
 // Template Content
 content: {
 // Organization
 organizationName: string;
 organizationAddress: string;
 organizationPhone: string;
 organizationEmail: string;
 organizationWebsite?: string;
 
 // Letter Structure
 letterHeading: string; // e.g., "Employment Offer Letter"
 openingParagraph: string; // Can include {{candidateName}}, {{positionTitle}}
 
 // Employment Terms Section
 employmentTermsIntro: string;
 probationPeriodText: string;
 
 // Compensation Section
 compensationIntro: string;
 benefitsText: string;
 
 // Working Conditions
 workingHoursText: string;
 workLocationText: string;
 
 // Terms & Conditions
 termsAndConditions: string;
 
 // Closing
 closingParagraph: string;
 closingStatement: string; // e.g., "Sincerely,"
 
 // Signature
 signatoryName: string;
 signatoryTitle: string;
 
 // Additional Fields
 additionalNotes: string;
 };
 
 // Default values for merge fields
 defaults: {
 probationPeriod: string;
 annualLeave: string;
 currency: string;
 salaryFrequency: string;
 };
}

const STORAGE_KEY = 'hr_offer_letter_templates';

class OfferLetterTemplateService {
 // Get all templates
 getAll(): OfferLetterTemplate[] {
 try {
 const data = localStorage.getItem(STORAGE_KEY);
 if (!data) {
 return this.getDefaultTemplates();
 }
 return JSON.parse(data);
 } catch (error) {
 console.error('Error loading templates:', error);
 return this.getDefaultTemplates();
 }
 }

 // Get active templates only
 getActive(): OfferLetterTemplate[] {
 return this.getAll().filter(t => t.active);
 }

 // Get default template
 getDefault(): OfferLetterTemplate | null {
 const templates = this.getAll();
 return templates.find(t => t.isDefault && t.active) || templates.find(t => t.active) || null;
 }

 // Get by ID
 getById(templateId: string): OfferLetterTemplate | null {
 return this.getAll().find(t => t.templateId === templateId) || null;
 }

 // Create template
 create(template: Omit<OfferLetterTemplate, 'templateId' | 'createdAt' | 'updatedAt'>): OfferLetterTemplate {
 const templates = this.getAll();
 
 // If this is being set as default, unset all others
 if (template.isDefault) {
 templates.forEach(t => t.isDefault = false);
 }
 
 const newTemplate: OfferLetterTemplate = {
 ...template,
 templateId: `TPL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
 createdAt: new Date().toISOString(),
 updatedAt: new Date().toISOString()
 };
 
 templates.push(newTemplate);
 localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
 return newTemplate;
 }

 // Update template
 update(templateId: string, data: Partial<OfferLetterTemplate>): boolean {
 const templates = this.getAll();
 const index = templates.findIndex(t => t.templateId === templateId);
 if (index === -1) return false;
 
 // If setting as default, unset all others
 if (data.isDefault) {
 templates.forEach(t => t.isDefault = false);
 }
 
 templates[index] = {
 ...templates[index],
 ...data,
 updatedAt: new Date().toISOString()
 };
 
 localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
 return true;
 }

 // Delete template
 delete(templateId: string): boolean {
 const templates = this.getAll();
 const template = templates.find(t => t.templateId === templateId);
 
 // Cannot delete default template
 if (template?.isDefault) {
 throw new Error('Cannot delete default template. Set another template as default first.');
 }
 
 const filtered = templates.filter(t => t.templateId !== templateId);
 localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
 return true;
 }

 // Set as default
 setAsDefault(templateId: string): boolean {
 const templates = this.getAll();
 templates.forEach(t => {
 t.isDefault = t.templateId === templateId;
 });
 localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
 return true;
 }

 // Initialize with default templates
 initializeDefaults(): void {
 const existing = this.getAll();
 if (existing.length === 0) {
 const defaults = this.getDefaultTemplates();
 localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
 }
 }

 // Get default templates (English & Arabic)
 private getDefaultTemplates(): OfferLetterTemplate[] {
 return [
 {
 templateId: 'TPL-DEFAULT-EN',
 templateName: 'Standard Offer Letter (English)',
 isDefault: true,
 active: true,
 createdAt: new Date().toISOString(),
 updatedAt: new Date().toISOString(),
 content: {
 organizationName: 'Humanitarian Organization',
 organizationAddress: '123 Main Street, City, Country',
 organizationPhone: '+1 234 567 8900',
 organizationEmail: 'hr@organization.org',
 organizationWebsite: 'www.organization.org',
 
 letterHeading: 'Employment Offer Letter',
 openingParagraph: 'Dear {{candidateName}},\n\nWe are pleased to offer you the position of {{positionTitle}} with our organization. This letter outlines the terms and conditions of your employment.',
 
 employmentTermsIntro: 'Your employment will be on a {{contractType}} basis, commencing on {{startDate}}.',
 probationPeriodText: 'You will be subject to a probation period of {{probationPeriod}}, during which your performance will be evaluated.',
 
 compensationIntro: 'Your monthly salary will be {{currency}} {{salary}}, paid on a {{salaryFrequency}} basis.',
 benefitsText: 'You will be entitled to the following benefits:\n• Annual Leave: {{annualLeave}}\n• Medical Insurance: Comprehensive health coverage\n• Other Benefits: As per organization policy',
 
 workingHoursText: 'Standard working hours are 40 hours per week (8 hours per day, Sunday to Thursday).',
 workLocationText: 'You will be based at {{workLocation}}.',
 
 termsAndConditions: '1. This offer is contingent upon successful completion of reference checks and background verification.\n2. You will be required to comply with all organizational policies and procedures.\n3. Either party may terminate this employment with 30 days written notice during probation, and 60 days after confirmation.\n4. You will be required to sign a confidentiality agreement.\n5. All intellectual property created during your employment belongs to the organization.',
 
 closingParagraph: 'We believe that your skills and experience will be a valuable addition to our team. We look forward to working with you.',
 closingStatement: 'Sincerely,',
 
 signatoryName: 'Human Resources Manager',
 signatoryTitle: 'HR Manager',
 
 additionalNotes: ''
 },
 defaults: {
 probationPeriod: '3 months',
 annualLeave: '30 days per year',
 currency: 'USD',
 salaryFrequency: 'Monthly'
 }
 },
 {
 templateId: 'TPL-DEFAULT-AR',
 templateName: 'خطاب عرض وظيفة قياسي (عربي)',
 isDefault: false,
 active: true,
 createdAt: new Date().toISOString(),
 updatedAt: new Date().toISOString(),
 content: {
 organizationName: 'المنظمة الإنسانية',
 organizationAddress: '123 الشارع الرئيسي، المدينة، البلد',
 organizationPhone: '+1 234 567 8900',
 organizationEmail: 'hr@organization.org',
 organizationWebsite: 'www.organization.org',
 
 letterHeading: 'خطاب عرض وظيفة',
 openingParagraph: 'عزيزي/عزيزتي {{candidateName}}،\n\nيسعدنا أن نقدم لك عرضاً للعمل في منصب {{positionTitle}} في منظمتنا. يوضح هذا الخطاب شروط وأحكام عملك.',
 
 employmentTermsIntro: 'سيكون عملك على أساس {{contractType}}، ابتداءً من تاريخ {{startDate}}.',
 probationPeriodText: 'ستخضع لفترة تجريبية مدتها {{probationPeriod}}، سيتم خلالها تقييم أدائك.',
 
 compensationIntro: 'سيكون راتبك الشهري {{currency}} {{salary}}، يُدفع على أساس {{salaryFrequency}}.',
 benefitsText: 'سيحق لك الحصول على المزايا التالية:\n• الإجازة السنوية: {{annualLeave}}\n• التأمين الطبي: تغطية صحية شاملة\n• مزايا أخرى: وفقاً لسياسة المنظمة',
 
 workingHoursText: 'ساعات العمل القياسية هي 40 ساعة في الأسبوع (8 ساعات يومياً، من الأحد إلى الخميس).',
 workLocationText: 'سيكون مقر عملك في {{workLocation}}.',
 
 termsAndConditions: '1. هذا العرض مشروط بإتمام فحوصات المراجع والتحقق من الخلفية بنجاح.\n2. سيُطلب منك الامتثال لجميع سياسات وإجراءات المنظمة.\n3. يجوز لأي من الطرفين إنهاء هذا التوظيف بإشعار كتابي مدته 30 يوماً خلال فترة التجربة، و60 يوماً بعد التثبيت.\n4. سيُطلب منك التوقيع على اتفاقية سرية.\n5. جميع الملكية الفكرية التي يتم إنشاؤها خلال فترة عملك تخص المنظمة.',
 
 closingParagraph: 'نعتقد أن مهاراتك وخبرتك ستكون إضافة قيمة لفريقنا. نتطلع للعمل معك.',
 closingStatement: 'مع خالص التحية،',
 
 signatoryName: 'مدير الموارد البشرية',
 signatoryTitle: 'مدير الموارد البشرية',
 
 additionalNotes: ''
 },
 defaults: {
 probationPeriod: '3 أشهر',
 annualLeave: '30 يوماً في السنة',
 currency: 'USD',
 salaryFrequency: 'شهري'
 }
 }
 ];
 }

 // Merge template with actual data
 mergeTemplate(template: OfferLetterTemplate, data: {
 candidateName: string;
 positionTitle: string;
 contractType: string;
 startDate: string;
 salary: number;
 workLocation: string;
 probationPeriod?: string;
 annualLeave?: string;
 }): any {
 const mergeFields = {
 '{{candidateName}}': data.candidateName,
 '{{positionTitle}}': data.positionTitle,
 '{{contractType}}': data.contractType,
 '{{startDate}}': new Date(data.startDate).toLocaleDateString(),
 '{{salary}}': data.salary.toLocaleString(),
 '{{workLocation}}': data.workLocation,
 '{{probationPeriod}}': data.probationPeriod || template.defaults.probationPeriod,
 '{{annualLeave}}': data.annualLeave || template.defaults.annualLeave,
 '{{currency}}': template.defaults.currency,
 '{{salaryFrequency}}': template.defaults.salaryFrequency
 };

 // Create merged content
 const mergedContent: any = {};
 
 Object.keys(template.content).forEach(key => {
 let value = (template.content as any)[key];
 
 // Replace all merge fields
 Object.keys(mergeFields).forEach(field => {
 if (typeof value === 'string') {
 value = value.replace(new RegExp(field, 'g'), mergeFields[field as keyof typeof mergeFields]);
 }
 });
 
 mergedContent[key] = value;
 });

 return {
 ...mergedContent,
 templateId: template.templateId,
 templateName: template.templateName
 };
 }
}

export const offerLetterTemplateService = new OfferLetterTemplateService();
