import { Users, TrendingUp, PieChart } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { translateEntityName } from '@/utils/translateEntityName';
import { useTranslation } from '@/i18n/useTranslation';

interface WorkforceStats {
 activeCount: number;
 archivedCount: number;
 exitedCount: number;
 totalCount: number;
 byDepartment: { name: string; count: number; percentage: number }[];
 byGender: { male: number; female: number; malePercentage: number; femalePercentage: number };
 byContract: { type: string; count: number }[];
}

interface Props {
 data: WorkforceStats;
}

export function WorkforceAnalytics({
 data }: Props) {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const localT = {
 workforceAnalytics: t.orgReports.workforceAnalytics,
 headcountByDepartment: t.orgReports.headcountByDepartment,
 headcountByContract: t.orgReports.headcountByContractType,
 genderDistribution: t.orgReports.genderDistribution,
 active: t.orgReports.active,
 archived: t.orgReports.archived,
 exited: t.orgReports.exited,
 total: t.orgReports.total,
 male: t.orgReports.male,
 female: t.orgReports.female,
 };

 return (
 <div className="space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
 <h2 className="text-2xl font-black text-gray-900 border-s-4 border-blue-600 ps-4 mb-8">
 {t.workforceAnalytics}
 </h2>

 {/* Summary Cards */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
 <div className="bg-white border border-gray-200 rounded-[20px] p-8 shadow-sm">
 <p className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-2">{t.active}</p>
 <p className="text-4xl font-black text-emerald-600">{data.activeCount}</p>
 </div>
 <div className="bg-white border border-gray-200 rounded-[20px] p-8 shadow-sm">
 <p className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-2">{t.archived}</p>
 <p className="text-4xl font-black text-amber-600">{data.archivedCount}</p>
 </div>
 <div className="bg-white border border-gray-200 rounded-[20px] p-8 shadow-sm">
 <p className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-2">{t.exited}</p>
 <p className="text-4xl font-black text-rose-600">{data.exitedCount}</p>
 </div>
 <div className="bg-white border border-gray-200 rounded-[20px] p-8 shadow-sm">
 <p className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-2">{t.total}</p>
 <p className="text-4xl font-black text-gray-900">{data.totalCount}</p>
 </div>
 </div>

 {/* Department Distribution */}
 <div className="bg-white border border-gray-200 rounded-[24px] p-10 shadow-sm">
 <h3 className="font-black text-gray-900 mb-8 flex items-center gap-3 uppercase tracking-wider text-sm">
 <div className="p-2 bg-blue-50 rounded-lg"><Users className="w-5 h-5 text-blue-600" /></div>
 {t.headcountByDepartment}
 </h3>
 <div className="space-y-6">
 {data.byDepartment.map(dept => (
 <div key={dept.name} className="space-y-2">
 <div className="flex justify-between items-center">
 <span className="text-sm font-bold text-gray-700">{translateEntityName(dept.name, language)}</span>
 <span className="text-sm font-black text-gray-900">{dept.count} ({dept.percentage.toFixed(1)}%)</span>
 </div>
 <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
 <div 
 className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-1000"
 style={{ width: `${dept.percentage}%` }}
 />
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Gender Distribution */}
 <div className="bg-white border border-gray-200 rounded-[24px] p-10 shadow-sm">
 <h3 className="font-black text-gray-900 mb-10 flex items-center gap-3 uppercase tracking-wider text-sm">
 <div className="p-2 bg-indigo-50 rounded-lg"><PieChart className="w-5 h-5 text-indigo-600" /></div>
 {t.genderDistribution}
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <div className="flex flex-col items-center p-10 bg-blue-50 border border-blue-100 rounded-[32px]">
 <span className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-4">{t.male}</span>
 <span className="text-6xl font-black text-blue-600">{data.byGender.male}</span>
 <span className="text-xs font-black text-gray-400 mt-4 uppercase tracking-[1px]">
 {data.byGender.malePercentage.toFixed(1)}%
 </span>
 </div>
 <div className="flex flex-col items-center p-10 bg-pink-50 border border-pink-100 rounded-[32px]">
 <span className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-4">{t.female}</span>
 <span className="text-6xl font-black text-pink-600">{data.byGender.female}</span>
 <span className="text-xs font-black text-gray-400 mt-4 uppercase tracking-[1px]">
 {data.byGender.femalePercentage.toFixed(1)}%
 </span>
 </div>
 </div>
 </div>

 {/* Contract Types */}
 <div className="bg-white border border-gray-200 rounded-[24px] p-10 shadow-sm">
 <h3 className="font-black text-gray-900 mb-8 flex items-center gap-3 uppercase tracking-wider text-sm">
 <div className="p-2 bg-emerald-50 rounded-lg"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
 {t.headcountByContract}
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {data.byContract.map(contract => (
 <div key={contract.type} className="flex flex-col items-center p-8 bg-gray-50 border border-gray-100 rounded-[24px]">
 <span className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-4">{translateEntityName(contract.type, language)}</span>
 <span className="text-5xl font-black text-gray-900">{contract.count}</span>
 </div>
 ))}
 </div>
 </div>
 </div>
 );
}
