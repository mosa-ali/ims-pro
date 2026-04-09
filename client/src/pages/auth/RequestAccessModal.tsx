import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useOrganizationsForAccess } from '@/hooks/useOrganizationsForAccess';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface RequestAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (formData: RequestAccessFormData) => Promise<void>;
  organizationName?: string;
  operatingUnitName?: string;
}

export interface RequestAccessFormData {
  fullName: string;
  workEmail: string;
  requestType: 'organization_user' | 'platform_admin';
  authProvider: 'microsoft' | 'local';
  accountType: 'personal' | 'shared';
  organization?: string;
  operatingUnit?: string;
  jobTitle: string;
  reasonForAccess: string;
  phoneNumber?: string;
}

const translations = {
  en: {
    title: 'Request Access',
    description: 'Fill out the form below to request access to the system.',
    fullName: 'Full Name',
    workEmail: 'Work Email Address',
    requestType: 'Request Type',
    requestTypeOrgUser: 'Organization User',
    requestTypePlatformAdmin: 'Platform Admin',
    authProvider: 'Authentication Provider',
    authProviderMicrosoft: 'Microsoft 365',
    authProviderLocal: 'Local Account',
    accountType: 'Account Type',
    accountTypePersonal: 'Personal Account',
    accountTypeShared: 'Shared Account',
    organization: 'Select Organization',
    operatingUnit: 'Select Operating Unit / Office',
    jobTitle: 'Job Title / Role',
    reasonForAccess: 'Reason for Access Request',
    phoneNumber: 'Phone Number (Optional)',
    submitButton: 'Submit Request',
    cancelButton: 'Cancel',
    submitting: 'Submitting...',
    successMessage: 'Your access request has been submitted successfully.',
    successDescription:
      'Your request will be reviewed by the platform administrator and your organization administrator. You will receive a notification once your request has been processed.',
    errorMessage: 'Failed to submit request. Please try again.',
    requiredField: 'This field is required',
    invalidEmail: 'Please enter a valid email address',
    selectOrgFirst: 'Please select an organization first',
  },
  ar: {
    title: 'طلب الوصول',
    description: 'املأ النموذج أدناه لطلب الوصول إلى النظام.',
    fullName: 'الاسم الكامل',
    workEmail: 'البريد الإلكتروني للعمل',
    requestType: 'نوع الطلب',
    requestTypeOrgUser: 'مستخدم المنظمة',
    requestTypePlatformAdmin: 'مسؤول المنصة',
    authProvider: 'مزود المصادقة',
    authProviderMicrosoft: 'Microsoft 365',
    authProviderLocal: 'حساب محلي',
    accountType: 'نوع الحساب',
    accountTypePersonal: 'حساب شخصي',
    accountTypeShared: 'حساب مشترك',
    organization: 'اختر المنظمة',
    operatingUnit: 'اختر الوحدة التشغيلية / المكتب',
    jobTitle: 'المسمى الوظيفي / الدور',
    reasonForAccess: 'سبب طلب الوصول',
    phoneNumber: 'رقم الهاتف (اختياري)',
    submitButton: 'إرسال الطلب',
    cancelButton: 'إلغاء',
    submitting: 'جاري الإرسال...',
    successMessage: 'تم إرسال طلب الوصول بنجاح.',
    successDescription:
      'سيتم مراجعة طلبك من قبل مسؤول المنصة ومسؤول النظام في منظمتك. سيتم إشعارك عند معالجة الطلب.',
    errorMessage: 'فشل في إرسال الطلب. يرجى المحاولة مرة أخرى.',
    requiredField: 'هذا الحقل مطلوب',
    invalidEmail: 'يرجى إدخال عنوان بريد إلكتروني صحيح',
    selectOrgFirst: 'يرجى اختيار منظمة أولاً',
  },
};

export function RequestAccessModal({
  open,
  onOpenChange,
  onSubmit,
  organizationName,
  operatingUnitName,
}: RequestAccessModalProps) {
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.en;
  const { organizations, isLoading: isLoadingOrgs } = useOrganizationsForAccess();

  const [formData, setFormData] = useState<RequestAccessFormData>({
    fullName: '',
    workEmail: '',
    requestType: 'organization_user',
    authProvider: 'microsoft',
    accountType: 'personal',
    organization: '',
    operatingUnit: '',
    jobTitle: '',
    reasonForAccess: '',
    phoneNumber: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Get operating units for selected organization
  const selectedOrgOperatingUnits = useMemo(() => {
    if (!formData.organization) return [];
    const org = organizations.find((o) => o.id.toString() === formData.organization);
    return org?.operatingUnits || [];
  }, [formData.organization, organizations]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = t.requiredField;
    }

    if (!formData.workEmail.trim()) {
      newErrors.workEmail = t.requiredField;
    } else if (!validateEmail(formData.workEmail)) {
      newErrors.workEmail = t.invalidEmail;
    }

    if (!formData.requestType) {
      newErrors.requestType = t.requiredField;
    }

    if (!formData.authProvider) {
      newErrors.authProvider = t.requiredField;
    }

    if (!formData.accountType) {
      newErrors.accountType = t.requiredField;
    }

    // Only validate organization/OU if requesting as organization user
    if (formData.requestType === 'organization_user') {
      if (!formData.organization?.trim()) {
        newErrors.organization = t.requiredField;
      }

      if (!formData.operatingUnit?.trim()) {
        newErrors.operatingUnit = t.requiredField;
      }
    }

    if (!formData.jobTitle.trim()) {
      newErrors.jobTitle = t.requiredField;
    }

    if (!formData.reasonForAccess.trim()) {
      newErrors.reasonForAccess = t.requiredField;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setSubmitSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setSubmitSuccess(false);
        setFormData({
          fullName: '',
          workEmail: '',
          requestType: 'organization_user',
          authProvider: 'microsoft',
          accountType: 'personal',
          organization: '',
          operatingUnit: '',
          jobTitle: '',
          reasonForAccess: '',
          phoneNumber: '',
        });
      }, 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        {submitSuccess ? (
          <div className="space-y-4 py-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="font-semibold text-green-900 text-sm">{t.successMessage}</p>
              <p className="text-xs text-green-700 mt-2">{t.successDescription}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto flex-1 pr-4">
            {/* Full Name */}
            <div>
              <label className="text-sm font-medium text-slate-700">{t.fullName}</label>
              <Input
                type="text"
                value={formData.fullName}
                onChange={(e) => {
                  setFormData({ ...formData, fullName: e.target.value });
                  if (errors.fullName) setErrors({ ...errors, fullName: '' });
                }}
                disabled={isSubmitting}
                className="mt-1 h-9 rounded-lg"
              />
              {errors.fullName && <p className="text-xs text-red-600 mt-1">{errors.fullName}</p>}
            </div>

            {/* Work Email */}
            <div>
              <label className="text-sm font-medium text-slate-700">{t.workEmail}</label>
              <Input
                type="email"
                value={formData.workEmail}
                onChange={(e) => {
                  setFormData({ ...formData, workEmail: e.target.value });
                  if (errors.workEmail) setErrors({ ...errors, workEmail: '' });
                }}
                disabled={isSubmitting}
                className="mt-1 h-9 rounded-lg"
              />
              {errors.workEmail && <p className="text-xs text-red-600 mt-1">{errors.workEmail}</p>}
            </div>

            {/* Request Type */}
            <div>
              <label className="text-sm font-medium text-slate-700">{t.requestType}</label>
              <Select
                value={formData.requestType}
                onValueChange={(value) => {
                  setFormData({ ...formData, requestType: value as 'organization_user' | 'platform_admin' });
                  if (errors.requestType) setErrors({ ...errors, requestType: '' });
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger className="mt-1 h-9 rounded-lg">
                  <SelectValue placeholder="Select request type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="organization_user">{t.requestTypeOrgUser}</SelectItem>
                  <SelectItem value="platform_admin">{t.requestTypePlatformAdmin}</SelectItem>
                </SelectContent>
              </Select>
              {errors.requestType && <p className="text-xs text-red-600 mt-1">{errors.requestType}</p>}
            </div>

            {/* Auth Provider */}
            <div>
              <label className="text-sm font-medium text-slate-700">{t.authProvider}</label>
              <Select
                value={formData.authProvider}
                onValueChange={(value) => {
                  setFormData({ ...formData, authProvider: value as 'microsoft' | 'local' });
                  if (errors.authProvider) setErrors({ ...errors, authProvider: '' });
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger className="mt-1 h-9 rounded-lg">
                  <SelectValue placeholder="Select auth provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="microsoft">{t.authProviderMicrosoft}</SelectItem>
                  <SelectItem value="local">{t.authProviderLocal}</SelectItem>
                </SelectContent>
              </Select>
              {errors.authProvider && <p className="text-xs text-red-600 mt-1">{errors.authProvider}</p>}
            </div>

            {/* Account Type */}
            <div>
              <label className="text-sm font-medium text-slate-700">{t.accountType}</label>
              <Select
                value={formData.accountType}
                onValueChange={(value) => {
                  setFormData({ ...formData, accountType: value as 'personal' | 'shared' });
                  if (errors.accountType) setErrors({ ...errors, accountType: '' });
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger className="mt-1 h-9 rounded-lg">
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">{t.accountTypePersonal}</SelectItem>
                  <SelectItem value="shared">{t.accountTypeShared}</SelectItem>
                </SelectContent>
              </Select>
              {errors.accountType && <p className="text-xs text-red-600 mt-1">{errors.accountType}</p>}
            </div>

            {/* Organization - Only show for organization users */}
            {formData.requestType === 'organization_user' && (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-700">{t.organization}</label>
                  <Select
                    value={formData.organization || ''}
                    onValueChange={(value) => {
                      setFormData({ ...formData, organization: value, operatingUnit: '' });
                      if (errors.organization) setErrors({ ...errors, organization: '' });
                    }}
                    disabled={isSubmitting || isLoadingOrgs}
                  >
                    <SelectTrigger className="mt-1 h-9 rounded-lg">
                      <SelectValue placeholder={isLoadingOrgs ? 'Loading...' : 'Select organization'} />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id.toString()}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.organization && <p className="text-xs text-red-600 mt-1">{errors.organization}</p>}
                </div>

                {/* Operating Unit */}
                <div>
                  <label className="text-sm font-medium text-slate-700">{t.operatingUnit}</label>
                  <Select
                    value={formData.operatingUnit || ''}
                    onValueChange={(value) => {
                      setFormData({ ...formData, operatingUnit: value });
                      if (errors.operatingUnit) setErrors({ ...errors, operatingUnit: '' });
                    }}
                    disabled={isSubmitting || !formData.organization || selectedOrgOperatingUnits.length === 0}
                  >
                    <SelectTrigger className="mt-1 h-9 rounded-lg">
                      <SelectValue
                        placeholder={!formData.organization ? t.selectOrgFirst : 'Select operating unit'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedOrgOperatingUnits.map((ou) => (
                        <SelectItem key={ou.id} value={ou.id.toString()}>
                          {ou.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.operatingUnit && <p className="text-xs text-red-600 mt-1">{errors.operatingUnit}</p>}
                </div>
              </>
            )}

            {/* Job Title */}
            <div>
              <label className="text-sm font-medium text-slate-700">{t.jobTitle}</label>
              <Input
                type="text"
                value={formData.jobTitle}
                onChange={(e) => {
                  setFormData({ ...formData, jobTitle: e.target.value });
                  if (errors.jobTitle) setErrors({ ...errors, jobTitle: '' });
                }}
                disabled={isSubmitting}
                className="mt-1 h-9 rounded-lg"
              />
              {errors.jobTitle && <p className="text-xs text-red-600 mt-1">{errors.jobTitle}</p>}
            </div>

            {/* Reason for Access */}
            <div>
              <label className="text-sm font-medium text-slate-700">{t.reasonForAccess}</label>
              <Textarea
                value={formData.reasonForAccess}
                onChange={(e) => {
                  setFormData({ ...formData, reasonForAccess: e.target.value });
                  if (errors.reasonForAccess) setErrors({ ...errors, reasonForAccess: '' });
                }}
                disabled={isSubmitting}
                className="mt-1 rounded-lg min-h-20"
              />
              {errors.reasonForAccess && <p className="text-xs text-red-600 mt-1">{errors.reasonForAccess}</p>}
            </div>

            {/* Phone Number */}
            <div>
              <label className="text-sm font-medium text-slate-700">{t.phoneNumber}</label>
              <Input
                type="tel"
                value={formData.phoneNumber || ''}
                onChange={(e) => {
                  setFormData({ ...formData, phoneNumber: e.target.value });
                }}
                disabled={isSubmitting}
                className="mt-1 h-9 rounded-lg"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="rounded-lg"
          >
            {t.cancelButton}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-lg bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t.submitting}
              </>
            ) : (
              t.submitButton
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
