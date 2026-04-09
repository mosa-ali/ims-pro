import { DollarSign, BarChart3, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { translateEntityName } from '@/utils/translateEntityName';
import { useTranslation } from '@/i18n/useTranslation';

interface PayrollStats {
 monthlyCosts: { month: string; amount: number }[];
 totalAnnualCost: number;
 byProject: { name: string; amount: number; count: number }[];
 byDepartment: { name: string; amount: number }[];
}

interface Props {
 data: PayrollStats;
}

export function PayrollAnalytics({
 data }: Props) {
 const { t } = useTranslation();
 const { language, isRTL} = useLanguage();
 const localT = {
 payrollAnalytics: t.orgReports.payrollCostAnalytics,
 annualPayroll: t.orgReports.estAnnualPayroll,
 payrollByProject: t.orgReports.payrollByProject,
 payrollByMonth: t.orgReports.payrollCostByMonth,
 amount: t.orgReports.amount,
 count: t.orgReports.count,
 };

 return (
 <div className="space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
 <h2 className="text-2xl font-black text-gray-900 border-s-4 border-emerald-600 ps-4 mb-8">
 {t.payrollAnalytics}
 </h2>

 {/* Annual Cost Card */}
 <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[32px] p-12 text-white shadow-2xl">
 <p className="text-[10px] font-black text-emerald-100 uppercase tracking-[3px] mb-4">{t.annualPayroll}</p>
 <p className="text-6xl font-black mb-2">${data.totalAnnualCost.toLocaleString()}</p>
 <p className="text-sm font-medium text-emerald-100">
 {t.orgReports.totalEstimatedAnnualPayrollCost}
 </p>
 </div>

 {/* By Project */}
 <div className="bg-white border border-gray-200 rounded-[24px] p-10 shadow-sm overflow-hidden">
 <h3 className="font-black text-gray-900 mb-8 flex items-center gap-3 uppercase tracking-wider text-sm">
 <div className="p-2 bg-emerald-50 rounded-lg"><BarChart3 className="w-5 h-5 text-emerald-600" /></div>
 {t.payrollByProject}
 </h3>
 <div className="overflow-x-auto -mx-10 px-10">
 <table className="w-full">
 <thead className="border-b-2 border-gray-100">
 <tr>
 <th className="px-6 py-5 text-start text-[10px] font-black text-gray-400 uppercase tracking-[2px]">
 {t.orgReports.project}
 </th>
 <th className="px-6 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-[2px]">
 {t.count}
 </th>
 <th className="px-6 py-5 text-end text-[10px] font-black text-gray-400 uppercase tracking-[2px]">
 {t.amount}
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-50">
 {data.byProject.map((project, i) => (
 <tr key={i} className="hover:bg-gray-50/50 transition-colors">
 <td className="px-6 py-6 text-sm font-black text-gray-900">{translateEntityName(project.name, language)}</td>
 <td className="px-6 py-6 text-sm text-center font-bold text-gray-500">{project.count}</td>
 <td className="px-6 py-6 text-sm text-end font-black text-emerald-600">
 ${project.amount.toLocaleString()}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 {/* Monthly Costs */}
 {data.monthlyCosts.length > 0 && (
 <div className="bg-white border border-gray-200 rounded-[24px] p-10 shadow-sm">
 <h3 className="font-black text-gray-900 mb-8 flex items-center gap-3 uppercase tracking-wider text-sm">
 <div className="p-2 bg-blue-50 rounded-lg"><TrendingUp className="w-5 h-5 text-blue-600" /></div>
 {t.payrollByMonth}
 </h3>
 <div className="space-y-6">
 {data.monthlyCosts.map((month, i) => (
 <div key={i} className="space-y-2">
 <div className="flex justify-between items-center">
 <span className="text-sm font-bold text-gray-700">{month.month}</span>
 <span className="text-sm font-black text-gray-900">${month.amount.toLocaleString()}</span>
 </div>
 <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
 <div 
 className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full rounded-full"
 style={{ width: `${(month.amount / data.totalAnnualCost) * 100}%` }}
 />
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 );
}
