import { UserPlus, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface RecruitmentStats {
 timeToHire: number;
 candidatesPerVacancy: number;
 selectionRate: number;
 vacancyAging: { position: string; daysOpen: number; appCount: number; status: string }[];
}

interface Props {
 data: RecruitmentStats;
}

export function RecruitmentAnalytics({
 data }: Props) {
 const { t } = useTranslation();
 const { language, isRTL} = useLanguage();
 const localT = {
 recruitmentAnalytics: t.orgReports.recruitmentAnalytics,
 timeToHire: t.orgReports.timetohire,
 candidatesPerVacancy: t.orgReports.candidatesPerVacancy,
 selectionRate: t.orgReports.selectionRate,
 vacancyAging: t.orgReports.vacancyAging,
 days: t.orgReports.days,
 position: t.orgReports.position,
 daysOpen: t.orgReports.daysOpen,
 applicants: t.orgReports.applicants,
 status: t.orgReports.status,
 };

 return (
 <div className="space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
 <h2 className="text-2xl font-black text-gray-900 border-s-4 border-orange-600 ps-4 mb-8">
 {t.recruitmentAnalytics}
 </h2>

 {/* Summary Cards */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <div className="bg-white border border-gray-200 rounded-[20px] p-8 shadow-sm">
 <p className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-2">{t.timeToHire}</p>
 <p className="text-4xl font-black text-orange-600">{data.timeToHire} {t.days}</p>
 <p className="text-[10px] font-black text-emerald-600 mt-2 uppercase tracking-widest">
 {t.orgReports.target45Days}
 </p>
 </div>
 <div className="bg-white border border-gray-200 rounded-[20px] p-8 shadow-sm">
 <p className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-2">{t.candidatesPerVacancy}</p>
 <p className="text-4xl font-black text-gray-900">{data.candidatesPerVacancy.toFixed(1)}</p>
 </div>
 <div className="bg-white border border-gray-200 rounded-[20px] p-8 shadow-sm">
 <p className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-2">{t.selectionRate}</p>
 <p className="text-4xl font-black text-emerald-600">{data.selectionRate.toFixed(1)}%</p>
 </div>
 </div>

 {/* Vacancy Aging Table */}
 {data.vacancyAging.length > 0 && (
 <div className="bg-white border border-gray-200 rounded-[24px] p-10 shadow-sm overflow-hidden">
 <h3 className="font-black text-gray-900 mb-8 flex items-center gap-3 uppercase tracking-wider text-sm">
 <div className="p-2 bg-orange-50 rounded-lg"><TrendingUp className="w-5 h-5 text-orange-600" /></div>
 {t.vacancyAging}
 </h3>
 <div className="overflow-x-auto -mx-10 px-10">
 <table className="w-full">
 <thead className="border-b-2 border-gray-100">
 <tr>
 <th className="px-6 py-5 text-start text-[10px] font-black text-gray-400 uppercase tracking-[2px]">{t.position}</th>
 <th className="px-6 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-[2px]">{t.daysOpen}</th>
 <th className="px-6 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-[2px]">{t.applicants}</th>
 <th className="px-6 py-5 text-end text-[10px] font-black text-gray-400 uppercase tracking-[2px]">{t.status}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-50">
 {data.vacancyAging.map((v, i) => (
 <tr key={i} className="hover:bg-gray-50/50 transition-colors">
 <td className="px-6 py-6 text-sm font-black text-gray-900">{v.position}</td>
 <td className="px-6 py-6 text-sm text-center">
 <span className={`px-4 py-1 rounded-full font-black ${v.daysOpen > 30 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
 {v.daysOpen} {t.days}
 </span>
 </td>
 <td className="px-6 py-6 text-sm text-center font-bold text-gray-500">{v.appCount}</td>
 <td className="px-6 py-6 text-end">
 <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
 {t.orgReports.ongoingScreening}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}
 </div>
 );
}
