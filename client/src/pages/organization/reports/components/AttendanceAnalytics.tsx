import { Clock, Activity } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface AttendanceStats {
 overallRate: number;
 byDepartment: { name: string; rate: number; lateCount: number }[];
 overtimeHoursByProject: { project: string; hours: number }[];
 anomalyCount: number;
}

interface Props {
 data: AttendanceStats;
}

export function AttendanceAnalytics({
 data }: Props) {
 const { t } = useTranslation();
 const { language, isRTL} = useLanguage();
 const localT = {
 attendanceAnalytics: t.orgReports.attendanceAnalytics,
 overallRate: t.orgReports.overallAttendanceRate,
 attendanceByDept: t.orgReports.attendanceRateByDepartment,
 anomalies: t.orgReports.flaggedAnomalies,
 };

 return (
 <div className="space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
 <h2 className="text-2xl font-black text-gray-900 border-s-4 border-amber-600 ps-4 mb-8">
 {t.attendanceAnalytics}
 </h2>

 {/* Summary Cards */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="bg-white border border-gray-200 rounded-[20px] p-8 shadow-sm">
 <p className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-2">{t.overallRate}</p>
 <p className="text-4xl font-black text-emerald-600">{data.overallRate.toFixed(1)}%</p>
 </div>
 <div className="bg-white border border-gray-200 rounded-[20px] p-8 shadow-sm">
 <p className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-2">{t.anomalies}</p>
 <p className="text-4xl font-black text-rose-600">{data.anomalyCount}</p>
 </div>
 </div>

 {/* By Department */}
 <div className="bg-white border border-gray-200 rounded-[24px] p-10 shadow-sm">
 <h3 className="font-black text-gray-900 mb-8 flex items-center gap-3 uppercase tracking-wider text-sm">
 <div className="p-2 bg-amber-50 rounded-lg"><Activity className="w-5 h-5 text-amber-600" /></div>
 {t.attendanceByDept}
 </h3>
 <div className="space-y-6">
 {data.byDepartment.map(dept => (
 <div key={dept.name} className="space-y-2">
 <div className="flex justify-between items-center">
 <span className="text-sm font-bold text-gray-700">{dept.name}</span>
 <div className="flex items-center gap-4">
 <span className="text-xs font-bold text-gray-400">
 {t.orgReports.late}: {dept.lateCount}
 </span>
 <span className="text-sm font-black text-gray-900">{dept.rate.toFixed(1)}%</span>
 </div>
 </div>
 <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
 <div 
 className="bg-gradient-to-r from-amber-500 to-orange-600 h-full rounded-full"
 style={{ width: `${dept.rate}%` }}
 />
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 );
}
