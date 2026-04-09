import { ArrowLeft } from 'lucide-react';
import { useLanguage, formatDate } from '@/contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { getCaseById, getPSSSessions, getCaseReferrals, getCaseActivities } from '@/services/caseManagementService';

interface CaseProfileProps {
  caseId: number;
  onBack: () => void;
}

export function CaseProfile({ caseId, onBack }: CaseProfileProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n?.language === 'ar';
  
  
  const caseRecord = getCaseById(caseId);
  const pssSessions = getPSSSessions(caseId);
  const referrals = getCaseReferrals(caseId);
  const activities = getCaseActivities(caseId);
  
  if (!caseRecord) {
    return <div className="text-center py-12 text-gray-500">{t('common.noData')}</div>;
  }
  
  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Back Button */}
      <button
        onClick={onBack}
        className={`inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 ${isRTL ? 'flex-row-reverse' : ''}`}
      >
        <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
        {t('caseManagement.backToCasesList')}
      </button>
      
      {/* Case Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <h2 className="text-2xl font-bold text-gray-900">{t('caseManagement.caseIdLabel')}: {caseRecord.caseCode}</h2>
            <div className={`flex items-center gap-4 mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${
                caseRecord.status === 'open' ? 'bg-blue-100 text-blue-700' :
                caseRecord.status === 'ongoing' ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {caseRecord.status === 'open' ? t('caseManagement.statusOpen') :
                 caseRecord.status === 'ongoing' ? t('caseManagement.statusOngoing') :
                 t('caseManagement.statusClosed')}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${
                caseRecord.riskLevel === 'high' ? 'bg-red-100 text-red-700' :
                caseRecord.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'
              }`}>
                {t('caseManagement.riskLevel')}: {
                  caseRecord.riskLevel === 'high' ? t('caseManagement.riskHigh') :
                  caseRecord.riskLevel === 'medium' ? t('caseManagement.riskMedium') :
                  t('caseManagement.riskLow')
                }
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* A. Beneficiary Information */}
      <InfoSection title={t('caseManagement.beneficiaryInformation')}>
        <InfoGrid
          data={[
            { label: t('caseManagement.beneficiaryCode'), value: caseRecord.beneficiaryCode },
            { label: t('caseManagement.gender'), value: caseRecord.gender === 'male' ? t('caseManagement.male') : t('caseManagement.female') },
            { label: t('caseManagement.age'), value: caseRecord.age },
            { label: t('caseManagement.disability'), value: caseRecord.hasDisability ? t('caseManagement.yes') : t('caseManagement.no') },
            { label: t('caseManagement.location'), value: caseRecord.location || t('caseManagement.notAvailable') },
            { label: t('caseManagement.district'), value: caseRecord.district || t('caseManagement.notAvailable') },
            { label: t('caseManagement.householdSize'), value: caseRecord.householdSize || t('caseManagement.notAvailable') },
            { label: t('caseManagement.vulnerabilityCategory'), value: caseRecord.vulnerabilityCategory || t('caseManagement.notAvailable') }
          ]}
        />
      </InfoSection>
      
      {/* B. Case Details */}
      <InfoSection title={t('caseManagement.caseDetails')}>
        <InfoGrid
          data={[
            { label: t('caseManagement.caseType'), value: caseRecord.caseType.toUpperCase() },
            { label: t('caseManagement.caseOpeningDate'), value: formatDate(new Date(caseRecord.openedAt), language) },
            { label: t('caseManagement.informedConsent'), value: caseRecord.informedConsentObtained ? t('caseManagement.yes') : t('caseManagement.no') }
          ]}
        />
        <div className="mt-4 space-y-2">
          <div>
            <p className="text-sm font-medium text-gray-700">{t('caseManagement.identifiedNeeds')}:</p>
            <p className="text-sm text-gray-600">{caseRecord.identifiedNeeds || t('caseManagement.notAvailable')}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">{t('caseManagement.riskFactors')}:</p>
            <p className="text-sm text-gray-600">{caseRecord.riskFactors || t('caseManagement.notAvailable')}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">{t('caseManagement.immediateConcerns')}:</p>
            <p className="text-sm text-gray-600">{caseRecord.immediateConcerns || t('caseManagement.notAvailable')}</p>
          </div>
        </div>
      </InfoSection>
      
      {/* C. Case Plan */}
      <InfoSection title={t('caseManagement.casePlan')}>
        <div className="space-y-2">
          <div>
            <p className="text-sm font-medium text-gray-700">{t('caseManagement.plannedInterventions')}:</p>
            <p className="text-sm text-gray-600">{caseRecord.plannedInterventions || t('caseManagement.notAvailable')}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">{t('caseManagement.expectedOutcomes')}:</p>
            <p className="text-sm text-gray-600">{caseRecord.expectedOutcomes || t('caseManagement.notAvailable')}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">{t('caseManagement.timeline')}:</p>
            <p className="text-sm text-gray-600">{caseRecord.timeline || t('caseManagement.notAvailable')}</p>
          </div>
        </div>
      </InfoSection>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
        <SummaryCard title={t('caseManagement.pssSessions')} count={pssSessions.length} />
        <SummaryCard title={t('caseManagement.referrals')} count={referrals.length} />
        <SummaryCard title={t('caseManagement.activities')} count={activities.length} />
      </div>
    </div>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n?.language === 'ar';
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className={`text-lg font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function InfoGrid({ data }: { data: Array<{ label: string; value: any }> }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n?.language === 'ar';
  
  return (
    <div className="grid grid-cols-2 gap-4" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      {data.map((item, idx) => (
        <div key={idx} className={isRTL ? 'text-right' : 'text-left'}>
          <p className="text-sm text-gray-600">{item.label}</p>
          <p className="text-sm font-medium text-gray-900">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function SummaryCard({ title, count }: { title: string; count: number }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n?.language === 'ar';
  
  return (
    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
      <p className="text-3xl font-bold text-primary" dir="ltr">{count}</p>
      <p className={`text-sm text-gray-700 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>{title}</p>
    </div>
  );
}
