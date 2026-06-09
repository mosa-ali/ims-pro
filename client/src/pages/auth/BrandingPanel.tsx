import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Building2 } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';

interface BrandingPanelProps {
  organizationLogo?: string;
  organizationName?: string;
  operatingUnitName?: string;
}

const translations = {
  en: {
    welcomeTitle: 'Welcome to IMS',
    systemName: 'Integrated Management System',
    systemDescription:
      'The Integrated Management System (IMS) is a unified platform designed to support organizational operations including programs, HR, finance, logistics, procurement, MEAL, donor CRM, reporting, and compliance.',
    organizationWelcome: 'Welcome to',
    operatingUnit: 'Operating Unit:',
    orgWelcomeMessage:
      'Please sign in if your account has already been created by your organization administrator. If you do not yet have access, you may request access using the option below.',
    supportTitle: 'Having trouble signing in?',
    supportMessage:
      'If you believe you should have access, please contact your organization administrator or submit a request for access.',
    footer: 'Integrated Management System (IMS)',
    footerSubtitle: 'Secure access for organizational operations and management.',
  },
  ar: {
    welcomeTitle: 'مرحبًا بكم في نظام IMS',
    systemName: 'النظام المتكامل للإدارة',
    systemDescription:
      'نظام الإدارة المتكامل (IMS) هو منصة موحدة مصممة لدعم عمليات المنظمة بما في ذلك البرامج، الموارد البشرية، المالية، اللوجستيات، المشتريات، المتابعة والتقييم والمساءلة والتعلم (MEAL)، إدارة المانحين، التقارير والامتثال.',
    organizationWelcome: 'مرحبًا بكم في',
    operatingUnit: 'الوحدة التشغيلية:',
    orgWelcomeMessage:
      'يرجى تسجيل الدخول إذا تم إنشاء حسابك مسبقًا بواسطة مسؤول النظام في منظمتك. إذا لم يكن لديك وصول بعد، يمكنك طلب الوصول باستخدام الخيار أدناه.',
    supportTitle: 'هل تواجه مشكلة في تسجيل الدخول؟',
    supportMessage:
      'إذا كنت تعتقد أنه يجب أن يكون لديك وصول، يرجى التواصل مع مسؤول النظام في منظمتك أو تقديم طلب وصول.',
    footer: 'نظام الإدارة المتكامل (IMS)',
    footerSubtitle: 'وصول آمن لإدارة عمليات المنظمة.',
  },
};

export function BrandingPanel({
  organizationLogo,
  organizationName,
  operatingUnitName,
}: BrandingPanelProps) {
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.en;
  const isOrgContext = organizationName && operatingUnitName;

  return (
    <div className="flex flex-col gap-8">
      {/* Logo */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t.welcomeTitle}</h1>
        <p className="text-sm text-slate-600">{t.systemName}</p>
      </div>

      {/* System Description */}
      <div>
        <p className="text-slate-700 leading-relaxed">{t.systemDescription}</p>
      </div>

      {/* Organization Context Card */}
      {isOrgContext && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-start gap-4">
            {organizationLogo ? (
              <img
                src={organizationLogo}
                alt={organizationName}
                className="h-12 w-12 rounded-lg object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
            )}

            <div className="flex-1">
              <h2 className="text-lg font-semibold text-slate-900">
                {t.organizationWelcome} {organizationName}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                {t.operatingUnit} {operatingUnitName}
              </p>
              <p className="text-sm text-slate-700 mt-3">{t.orgWelcomeMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Support Section */}
      <div className="border-t border-slate-200 pt-6">
        <h3 className="font-semibold text-slate-900 mb-2">{t.supportTitle}</h3>
        <p className="text-sm text-slate-600">{t.supportMessage}</p>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 pt-6 text-center">
        <p className="font-semibold text-slate-900">{t.footer}</p>
        <p className="text-sm text-slate-600">{t.footerSubtitle}</p>
      </div>
    </div>
  );
}
