import { Calendar } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface LeaveStats {
 takenByType: { type: string; count: number }[];
 totalDaysUsed: number;
 averageLeavePerStaff: number;
 liabilityEstimate: number;
}

interface Props {
 data: LeaveStats;
}

export function LeaveAnalytics({
 data }: Props) {
 const { t } = useTranslation();
 const { language, isRTL} = useLanguage();
 const localT = {
 leaveAnalytics: t.orgReports.leaveAnalytics,
 totalDaysUsed: t.orgReports.totalDaysUsed,
 avgPerStaff: t.orgReports.avgstaffYear,
 leaveLiability: t.orgReports.leaveLiabilityProjection,
 leaveBalances: t.orgReports.leaveBalancesByType,
 daysTaken: t.orgReports.daysTaken,
 };

 return (
 <div className="space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
 <h2 className="text-2xl font-black text-gray-900 border-s-4 border-indigo-600 ps-4 mb-8">
 {t.leaveAnalytics}
 </h2>

 {/* Summary Cards */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
 <div className="bg-white border border-gray-200 rounded-[20px] p-8 shadow-sm">
 <p className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-2">{t.totalDaysUsed}</p>
 <p className="text-4xl font-black text-indigo-600">{data.totalDaysUsed}</p>
 </div>
 <div className="bg-white border border-gray-200 rounded-[20px] p-8 shadow-sm">
 <p className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-2">{t.avgPerStaff}</p>
 <p className="text-4xl font-black text-gray-900">{data.averageLeavePerStaff.toFixed(1)}</p>
 </div>
 <div className="bg-white border border-gray-200 rounded-[20px] p-8 shadow-sm md:col-span-2">
 <p className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-2">{t.leaveLiability}</p>
 <p className="text-4xl font-black text-rose-600">${data.liabilityEstimate.toLocaleString()}</p>
 <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-widest italic">
 {t.orgReports.unusedLeaveAccrualFinancialProjection}
 </p>
 </div>
 </div>

 {/* By Type */}
 <div className="bg-white border border-gray-200 rounded-[24px] p-10 shadow-sm">
 <h3 className="font-black text-gray-900 mb-10 flex items-center gap-3 uppercase tracking-wider text-sm">
 <div className="p-2 bg-indigo-50 rounded-lg"><Calendar className="w-5 h-5 text-indigo-600" /></div>
 {t.leaveBalances}
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
 {data.takenByType.map(type => (
 <div key={type.type} className="flex flex-col items-center p-10 bg-gray-50 border border-gray-100 rounded-[32px] transition-all hover:shadow-xl hover:bg-white group">
 <span className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-4">{type.type}</span>
 <span className="text-6xl font-black text-gray-900 transition-transform group-hover:scale-110 duration-500">{type.count}</span>
 <span className="text-xs font-black text-gray-400 mt-4 uppercase tracking-[1px]">{t.daysTaken}</span>
 </div>
 ))}
 </div>
 </div>
 </div>
 );
}
