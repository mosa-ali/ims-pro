/**
 * ============================================================================
 * BENEFICIARY CERTIFICATE PRINT MODAL - Program Completion Certificate
 * ============================================================================
 * ✅ Official certificate for beneficiaries
 * ✅ A4 Layout, print-optimized
 * ✅ Organization branding with decorative design
 * ✅ Program completion, skills acquired
 * ✅ Suitable for framing and portfolio use
 * ============================================================================
 */

import { X, Printer, Award, Star, Seal } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getOrganizationSettings } from '@/services/organizationService';

interface Skill {
  name: string;
  level?: 'Basic' | 'Intermediate' | 'Advanced';
}

interface Props {
  beneficiaryName: string;
  programName: string;
  programType: string;
  startDate: string;
  completionDate: string;
  
  skillsAcquired: Skill[];
  hoursCompleted?: number;
  achievementLevel?: 'Outstanding' | 'Excellent' | 'Good' | 'Satisfactory';
  
  certificateNumber: string;
  issuedBy: string;
  issuerTitle: string;
  
  additionalNotes?: string;
  
  onClose: () => void;
}

export function BeneficiaryCertificatePrintModal({
  beneficiaryName,
  programName,
  programType,
  startDate,
  completionDate,
  skillsAcquired,
  hoursCompleted,
  achievementLevel,
  certificateNumber,
  issuedBy,
  issuerTitle,
  additionalNotes,
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar' : 'en', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getAchievementBadge = (level?: string) => {
    if (!level) return null;
    const colors = {
      'Outstanding': 'bg-purple-100 text-purple-700 border-purple-300',
      'Excellent': 'bg-green-100 text-green-700 border-green-300',
      'Good': 'bg-blue-100 text-blue-700 border-blue-300',
      'Satisfactory': 'bg-gray-100 text-gray-700 border-gray-300'
    };
    return colors[level as keyof typeof colors] || colors.Satisfactory;
  };

  const t = {
    certificate: language === 'en' ? 'CERTIFICATE OF COMPLETION' : 'شهادة إتمام',
    presentedTo: language === 'en' ? 'This certificate is proudly presented to' : 'تُمنح هذه الشهادة بفخر إلى',
    recognition: language === 'en' 
      ? 'In recognition of successful completion of' 
      : 'تقديراً للإتمام الناجح لـ',
    
    programType: language === 'en' ? 'Program Type' : 'نوع البرنامج',
    duration: language === 'en' ? 'Duration' : 'المدة',
    completionDate: language === 'en' ? 'Completion Date' : 'تاريخ الإتمام',
    hoursCompleted: language === 'en' ? 'Hours Completed' : 'ساعات الإتمام',
    achievementLevel: language === 'en' ? 'Achievement Level' : 'مستوى الإنجاز',
    
    skillsAcquired: language === 'en' ? 'Skills & Competencies Acquired' : 'المهارات والكفاءات المكتسبة',
    
    basic: language === 'en' ? 'Basic' : 'أساسي',
    intermediate: language === 'en' ? 'Intermediate' : 'متوسط',
    advanced: language === 'en' ? 'Advanced' : 'متقدم',
    
    outstanding: language === 'en' ? 'Outstanding' : 'متميز',
    excellent: language === 'en' ? 'Excellent' : 'ممتاز',
    good: language === 'en' ? 'Good' : 'جيد',
    satisfactory: language === 'en' ? 'Satisfactory' : 'مقبول',
    
    issuedBy: language === 'en' ? 'Issued By' : 'صادر عن',
    signature: language === 'en' ? 'Signature' : 'التوقيع',
    dateLabel: language === 'en' ? 'Date' : 'التاريخ',
    seal: language === 'en' ? 'Official Seal' : 'الختم الرسمي',
    
    certificateNumber: language === 'en' ? 'Certificate No.' : 'رقم الشهادة',
    
    print: language === 'en' ? 'Print' : 'طباعة',
    close: language === 'en' ? 'Close' : 'إغلاق',
    
    verifyOnline: language === 'en' 
      ? 'This certificate can be verified online at our official website.' 
      : 'يمكن التحقق من هذه الشهادة عبر موقعنا الإلكتروني الرسمي.',
    
    congratulations: language === 'en'
      ? 'Congratulations on your achievement!'
      : 'تهانينا على إنجازك!',
    
    from: language === 'en' ? 'From' : 'من',
    to: language === 'en' ? 'To' : 'إلى'
  };

  const calculateDuration = () => {
    const start = new Date(startDate);
    const end = new Date(completionDate);
    const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30);
    if (months > 0) {
      return `${months} ${language === 'en' ? 'months' : 'أشهر'}`;
    }
    return `${days} ${language === 'en' ? 'days' : 'يوم'}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header - Hidden on print */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between print:hidden z-10">
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <h2 className="text-xl font-semibold text-gray-900">{t.certificate}</h2>
            <p className="text-sm text-gray-600 mt-1">{programName}</p>
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

        {/* Print Content - Certificate Design */}
        <div className="p-8 bg-gradient-to-br from-blue-50 via-white to-purple-50" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* Decorative Border */}
          <div className="border-8 border-double border-blue-600 rounded-lg p-8 bg-white shadow-2xl">
            
            {/* Decorative Corner Elements */}
            <div className="absolute top-12 left-12 print:block hidden">
              <Star className="w-8 h-8 text-blue-300" />
            </div>
            <div className="absolute top-12 right-12 print:block hidden">
              <Star className="w-8 h-8 text-blue-300" />
            </div>
            
            {/* Header with Logo */}
            <div className="text-center mb-8">
              {orgSettings.logoUrl && (
                <img 
                  src={orgSettings.logoUrl} 
                  alt="Organization Logo" 
                  className="h-20 mx-auto mb-4"
                />
              )}
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{orgName}</h1>
              <div className="flex items-center justify-center gap-3 my-4">
                <div className="h-px bg-gradient-to-r from-transparent via-blue-600 to-transparent flex-1"></div>
                <Award className="w-8 h-8 text-blue-600" />
                <div className="h-px bg-gradient-to-r from-blue-600 via-blue-600 to-transparent flex-1"></div>
              </div>
            </div>

            {/* Certificate Title */}
            <div className="text-center mb-6">
              <h2 className="text-4xl font-bold text-blue-800 mb-2">{t.certificate}</h2>
              <p className="text-sm text-gray-600 italic">{t.congratulations}</p>
            </div>

            {/* Presented To */}
            <div className="text-center mb-6">
              <p className="text-base text-gray-700 mb-3">{t.presentedTo}</p>
              <div className="inline-block border-b-4 border-blue-600 px-12 py-2">
                <p className="text-3xl font-bold text-gray-900">{beneficiaryName}</p>
              </div>
            </div>

            {/* Recognition Text */}
            <div className="text-center mb-8">
              <p className="text-base text-gray-700 mb-3">{t.recognition}</p>
              <p className="text-2xl font-semibold text-blue-700 mb-4">{programName}</p>
            </div>

            {/* Program Details */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">{t.programType}</p>
                  <p className="text-base font-semibold text-gray-900">{programType}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">{t.duration}</p>
                  <p className="text-base font-semibold text-gray-900">{calculateDuration()}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(startDate)} - {formatDate(completionDate)}
                  </p>
                </div>
                {hoursCompleted && (
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">{t.hoursCompleted}</p>
                    <p className="text-base font-semibold text-gray-900">{hoursCompleted}</p>
                  </div>
                )}
                {achievementLevel && (
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">{t.achievementLevel}</p>
                    <span className={`inline-block px-4 py-2 rounded-lg text-sm font-bold border-2 ${getAchievementBadge(achievementLevel)}`}>
                      {t[achievementLevel.toLowerCase() as 'outstanding' | 'excellent' | 'good' | 'satisfactory']}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Skills Acquired */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-4">{t.skillsAcquired}</h3>
              <div className="grid grid-cols-2 gap-3">
                {skillsAcquired.map((skill, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <Star className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{skill.name}</p>
                      {skill.level && (
                        <p className="text-xs text-gray-600">
                          {t[skill.level.toLowerCase() as 'basic' | 'intermediate' | 'advanced']}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Notes */}
            {additionalNotes && (
              <div className="mb-6">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                  <p className="text-sm text-gray-700 italic">{additionalNotes}</p>
                </div>
              </div>
            )}

            {/* Signature Section */}
            <div className="grid grid-cols-3 gap-8 mt-12 mb-6">
              {/* Issuer Signature */}
              <div className="text-center">
                <div className="border-b-2 border-gray-400 pb-16 mb-2"></div>
                <p className="text-sm font-semibold text-gray-900">{issuedBy}</p>
                <p className="text-xs text-gray-600">{issuerTitle}</p>
              </div>

              {/* Official Seal */}
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <div className="w-24 h-24 rounded-full border-4 border-blue-600 flex items-center justify-center bg-blue-50">
                    <Seal className="w-12 h-12 text-blue-600" />
                  </div>
                </div>
                <p className="text-xs font-semibold text-gray-600">{t.seal}</p>
              </div>

              {/* Date */}
              <div className="text-center">
                <div className="border-b-2 border-gray-400 pb-16 mb-2"></div>
                <p className="text-sm font-semibold text-gray-900">{formatDate(completionDate)}</p>
                <p className="text-xs text-gray-600">{t.dateLabel}</p>
              </div>
            </div>

            {/* Certificate Number */}
            <div className="text-center pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-600">
                {t.certificateNumber}: <span className="font-mono font-semibold text-gray-900">{certificateNumber}</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">{t.verifyOnline}</p>
            </div>

            {/* Decorative Bottom Border */}
            <div className="mt-6 flex items-center justify-center gap-2">
              <div className="h-1 w-16 bg-gradient-to-r from-transparent to-blue-600 rounded-full"></div>
              <Star className="w-4 h-4 text-blue-600" />
              <div className="h-1 w-16 bg-gradient-to-l from-transparent to-blue-600 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
