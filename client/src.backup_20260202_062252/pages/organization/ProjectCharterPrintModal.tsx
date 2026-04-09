/**
 * ============================================================================
 * PROJECT CHARTER PRINT MODAL - Project Initiation Document
 * ============================================================================
 * ✅ Official project authorization document
 * ✅ A4 Layout, print-optimized
 * ✅ Organization branding
 * ✅ Project overview, objectives, team structure, timeline
 * ✅ Suitable for stakeholder approval & project kickoff
 * ============================================================================
 */

import { X, Printer, FileText, Target, Users, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getOrganizationSettings } from '@/services/organizationService';

interface TeamMember {
  name: string;
  role: string;
  department?: string;
}

interface Objective {
  id: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
}

interface Milestone {
  name: string;
  date: string;
  deliverable?: string;
}

interface Props {
  projectName: string;
  projectCode: string;
  projectManager: string;
  sponsor: string;
  startDate: string;
  endDate: string;
  
  background: string;
  objectives: Objective[];
  scope: string;
  outOfScope?: string;
  
  teamMembers: TeamMember[];
  milestones: Milestone[];
  
  budget: number;
  currency: string;
  
  risks?: string;
  assumptions?: string;
  
  onClose: () => void;
}

export function ProjectCharterPrintModal({
  projectName,
  projectCode,
  projectManager,
  sponsor,
  startDate,
  endDate,
  background,
  objectives,
  scope,
  outOfScope,
  teamMembers,
  milestones,
  budget,
  currency,
  risks,
  assumptions,
  onClose
}: Props) {
  const [language, setLanguage] = useState<'en' | 'ar'>('en');
  const [isRTL, setIsRTL] = useState(false);
  const orgSettings = getOrganizationSettings();
  const orgName = language === 'ar' && orgSettings.nameAr ? orgSettings.nameAr : orgSettings.name;

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as 'en' | 'ar' || 'en';
    setLanguage(savedLanguage);
    setIsRTL(savedLanguage === 'ar');
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar' : 'en', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar' : 'en', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      'High': 'bg-red-100 text-red-700 border-red-200',
      'Medium': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'Low': 'bg-green-100 text-green-700 border-green-200'
    };
    return colors[priority as keyof typeof colors] || colors.Medium;
  };

  const t = {
    title: language === 'en' ? 'PROJECT CHARTER' : 'ميثاق المشروع',
    subtitle: language === 'en' ? 'Project Initiation Document' : 'وثيقة بدء المشروع',
    
    projectInfo: language === 'en' ? 'Project Information' : 'معلومات المشروع',
    projectName: language === 'en' ? 'Project Name' : 'اسم المشروع',
    projectCode: language === 'en' ? 'Project Code' : 'رمز المشروع',
    projectManager: language === 'en' ? 'Project Manager' : 'مدير المشروع',
    sponsor: language === 'en' ? 'Project Sponsor' : 'راعي المشروع',
    duration: language === 'en' ? 'Duration' : 'المدة الزمنية',
    budget: language === 'en' ? 'Total Budget' : 'الميزانية الإجمالية',
    
    background: language === 'en' ? '1. Project Background' : '1. خلفية المشروع',
    objectives: language === 'en' ? '2. Project Objectives' : '2. أهداف المشروع',
    priority: language === 'en' ? 'Priority' : 'الأولوية',
    high: language === 'en' ? 'High' : 'عالية',
    medium: language === 'en' ? 'Medium' : 'متوسطة',
    low: language === 'en' ? 'Low' : 'منخفضة',
    
    scope: language === 'en' ? '3. Project Scope' : '3. نطاق المشروع',
    inScope: language === 'en' ? 'In Scope:' : 'ضمن النطاق:',
    outOfScope: language === 'en' ? 'Out of Scope:' : 'خارج النطاق:',
    
    team: language === 'en' ? '4. Project Team Structure' : '4. هيكل فريق المشروع',
    name: language === 'en' ? 'Name' : 'الاسم',
    role: language === 'en' ? 'Role' : 'الدور',
    department: language === 'en' ? 'Department' : 'القسم',
    
    milestones: language === 'en' ? '5. Key Milestones' : '5. المعالم الرئيسية',
    milestone: language === 'en' ? 'Milestone' : 'المعلم',
    date: language === 'en' ? 'Date' : 'التاريخ',
    deliverable: language === 'en' ? 'Deliverable' : 'المخرج',
    
    risks: language === 'en' ? '6. Key Risks' : '6. المخاطر الرئيسية',
    assumptions: language === 'en' ? '7. Key Assumptions' : '7. الافتراضات الرئيسية',
    
    approval: language === 'en' ? 'Approval & Sign-Off' : 'الاعتماد والتوقيع',
    preparedBy: language === 'en' ? 'Prepared By:' : 'أعده:',
    approvedBy: language === 'en' ? 'Approved By:' : 'اعتمده:',
    signature: language === 'en' ? 'Signature' : 'التوقيع',
    dateLabel: language === 'en' ? 'Date' : 'التاريخ',
    
    print: language === 'en' ? 'Print' : 'طباعة',
    close: language === 'en' ? 'Close' : 'إغلاق',
    
    docNumber: language === 'en' ? 'Document #' : 'رقم الوثيقة #',
    generatedOn: language === 'en' ? 'Generated on' : 'تم الإنشاء في',
    confidential: language === 'en' 
      ? 'This document is confidential and intended for authorized personnel only.' 
      : 'هذه الوثيقة سرية ومخصصة للموظفين المصرح لهم فقط.'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header - Hidden on print */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between print:hidden z-10">
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <h2 className="text-xl font-semibold text-gray-900">{t.title}</h2>
            <p className="text-sm text-gray-600 mt-1">{t.subtitle}</p>
          </div>
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <button
              onClick={handlePrint}
              className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <Printer className="w-4 h-4" />
              <span>{t.print}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
              aria-label={t.close}
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Print Content */}
        <div className="p-8" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* Header with Logo */}
          <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-gray-300">
            <div className={isRTL ? 'text-right' : 'text-left'}>
              {orgSettings.logoUrl && (
                <img 
                  src={orgSettings.logoUrl} 
                  alt="Organization Logo" 
                  className="h-16 mb-3"
                />
              )}
              <h1 className="text-2xl font-bold text-gray-900">{orgName}</h1>
              <p className="text-sm text-gray-600 mt-1">{t.subtitle}</p>
            </div>
            <div className={`text-sm ${isRTL ? 'text-left' : 'text-right'}`}>
              <p className="text-gray-600">{t.docNumber}: PC-{projectCode}-{new Date().getFullYear()}</p>
              <p className="text-gray-600">{t.generatedOn}: {formatDate(new Date().toISOString())}</p>
            </div>
          </div>

          {/* Document Title */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">{t.title}</h2>
            <p className="text-xl text-blue-600 mt-2">{projectName}</p>
          </div>

          {/* Project Information Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.projectInfo}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">{t.projectCode}</p>
                <p className="text-base font-semibold text-gray-900">{projectCode}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{t.projectManager}</p>
                <p className="text-base font-semibold text-gray-900">{projectManager}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{t.sponsor}</p>
                <p className="text-base font-semibold text-gray-900">{sponsor}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">{t.duration}</p>
                <p className="text-base font-semibold text-gray-900">
                  {formatDate(startDate)} - {formatDate(endDate)}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-600">{t.budget}</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(budget)}</p>
              </div>
            </div>
          </div>

          {/* 1. Background */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              {t.background}
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {background}
            </p>
          </div>

          {/* 2. Objectives */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              {t.objectives}
            </h3>
            <div className="space-y-3">
              {objectives.map((obj, index) => (
                <div key={obj.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{obj.description}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityBadge(obj.priority)}`}>
                    {t[obj.priority.toLowerCase() as 'high' | 'medium' | 'low']}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Scope */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">{t.scope}</h3>
            <div className="space-y-3">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-semibold text-green-900 mb-2">{t.inScope}</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{scope}</p>
              </div>
              {outOfScope && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-semibold text-red-900 mb-2">{t.outOfScope}</p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{outOfScope}</p>
                </div>
              )}
            </div>
          </div>

          {/* 4. Team Structure */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              {t.team}
            </h3>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-left">
                    {t.name}
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-left">
                    {t.role}
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-left">
                    {t.department}
                  </th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((member, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900">
                      {member.name}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-gray-700">
                      {member.role}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-gray-700">
                      {member.department || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 5. Milestones */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              {t.milestones}
            </h3>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-left">
                    {t.milestone}
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-left">
                    {t.date}
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 text-left">
                    {t.deliverable}
                  </th>
                </tr>
              </thead>
              <tbody>
                {milestones.map((milestone, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900">
                      {milestone.name}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-gray-700">
                      {formatDate(milestone.date)}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm text-gray-700">
                      {milestone.deliverable || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 6. Risks */}
          {risks && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{t.risks}</h3>
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{risks}</p>
              </div>
            </div>
          )}

          {/* 7. Assumptions */}
          {assumptions && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{t.assumptions}</h3>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{assumptions}</p>
              </div>
            </div>
          )}

          {/* Approval Section */}
          <div className="mt-8 pt-6 border-t-2 border-gray-300">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.approval}</h3>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <p className="text-sm font-semibold text-gray-900">{t.preparedBy}</p>
                <div className="space-y-2">
                  <div className="border-b border-gray-400 pb-12">
                    <p className="text-xs text-gray-500">{t.signature}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t.name}</p>
                      <p className="text-sm font-semibold">{projectManager}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t.dateLabel}</p>
                      <div className="border-b border-gray-400 h-6"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-sm font-semibold text-gray-900">{t.approvedBy}</p>
                <div className="space-y-2">
                  <div className="border-b border-gray-400 pb-12">
                    <p className="text-xs text-gray-500">{t.signature}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t.name}</p>
                      <p className="text-sm font-semibold">{sponsor}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t.dateLabel}</p>
                      <div className="border-b border-gray-400 h-6"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">{t.confidential}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
