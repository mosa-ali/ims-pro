import { Shield, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface ComplianceStats {
 expiringContracts: number;
 missingDocuments: number;
 pendingAppraisals: number;
 disciplinaryCases: number;
}

interface Props {
 data: ComplianceStats;
}

export function ComplianceAnalytics({
 data }: Props) {
 const { t } = useTranslation();
 const { language, isRTL} = useLanguage();
 const localT = {
 complianceAnalytics: t.orgReports.complianceRiskAnalytics,
 contractsExpiring: t.orgReports.contractsExpiring,
 missingDocuments: t.orgReports.missingDocuments,
 pendingAppraisals: t.orgReports.pendingAppraisals,
 disciplinaryCases: t.orgReports.disciplinaryCases,
 complianceShield: t.orgReports.complianceShieldStatus,
 };

 const items = [
 { label: t.contractsExpiring, val: data.expiringContracts, color: 'text-rose-600', icon: FileText },
 { label: t.missingDocuments, val: data.missingDocuments, color: 'text-amber-600', icon: Shield },
 { label: t.pendingAppraisals, val: data.pendingAppraisals, color: 'text-indigo-600', icon: CheckCircle2 },
 { label: t.disciplinaryCases, val: data.disciplinaryCases, color: 'text-gray-900', icon: AlertTriangle }
 ];

 return (
 <div className="space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
 <h2 className="text-2xl font-black text-gray-900 border-s-4 border-slate-600 ps-4 mb-8">
 {t.complianceAnalytics}
 </h2>

 {/* Summary Cards */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 {items.map(item => {
 const Icon = item.icon;
 return (
 <div key={item.label} className="bg-white border border-gray-200 rounded-[20px] p-8 shadow-sm transition-all hover:shadow-xl group">
 <div className="flex items-center justify-between mb-4">
 <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-gray-100 transition-colors">
 <Icon className="w-4 h-4 text-gray-400" />
 </div>
 <span className={`text-3xl font-black ${item.color}`}>{item.val}</span>
 </div>
 <p className="text-[10px] font-black text-gray-400 uppercase tracking-[2px]">{item.label}</p>
 </div>
 );
 })}
 </div>

 {/* Compliance Shield Banner */}
 <div className="bg-slate-900 rounded-[32px] p-12 text-white shadow-2xl overflow-hidden relative">
 <div className="absolute top-0 end-0 p-8 opacity-10">
 <Shield className="w-64 h-64 text-white" />
 </div>
 <div className="relative z-10">
 <h3 className="text-xl font-black uppercase tracking-[4px] mb-4">{t.complianceShield}</h3>
 <p className="text-slate-400 max-w-2xl text-sm font-medium leading-relaxed">
 {'The system currently shows an aggregate compliance score of 92%. Most audit flags are related to document expiries in the Operations department. All high-risk cases have been flagged for executive review.'}
 </p>
 <div className="mt-10 flex flex-wrap gap-4">
 <button className="px-8 py-3 bg-white text-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95">
 {t.orgReports.downloadRiskRegister}
 </button>
 <button className="px-8 py-3 bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-all active:scale-95 border border-slate-700">
 {t.orgReports.auditTrailLog}
 </button>
 </div>
 </div>
 </div>
 </div>
 );
}
