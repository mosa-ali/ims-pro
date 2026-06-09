import { useState } from 'react';
import { RefreshCw, Cloud, CheckCircle, Pause, AlertCircle, Play } from 'lucide-react';
import { useLocation } from 'wouter';
import { useLanguage, formatDate } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { isUserAdmin } from '@/lib/adminCheck';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

interface SyncJob {
 id: string; name: string; nameAr: string; status: 'active' | 'paused' | 'error';
 lastRun: string | null; nextRun: string | null; frequency: string;
}

const mockJobs: SyncJob[] = [
 { id: '1', name: 'Database Backup', nameAr: 'نسخ احتياطي', status: 'active', lastRun: '2025-02-07T06:00:00Z', nextRun: '2025-02-08T06:00:00Z', frequency: 'Daily' },
 { id: '2', name: 'Report Generation', nameAr: 'إنشاء التقارير', status: 'active', lastRun: '2025-02-07T00:00:00Z', nextRun: '2025-02-14T00:00:00Z', frequency: 'Weekly' },
 { id: '3', name: 'Data Validation', nameAr: 'التحقق من البيانات', status: 'paused', lastRun: '2025-02-05T12:00:00Z', nextRun: null, frequency: 'Daily' },
 { id: '4', name: 'External API Sync', nameAr: 'مزامنة API', status: 'error', lastRun: '2025-02-06T18:00:00Z', nextRun: '2025-02-07T18:00:00Z', frequency: 'Every 6 hours' },
];

export function PublishSync() {
 const { t } = useTranslation();
 const [, navigate] = useLocation();
 const { language, isRTL } = useLanguage();
 const { user } = useAuth();
 const [jobs] = useState(mockJobs);

 if (!isUserAdmin(user)) {
 return <div className="flex items-center justify-center h-64"><div className="text-center p-8 bg-white rounded-2xl shadow border"><h2 className="text-xl font-bold text-gray-900">Access Denied</h2></div></div>;
 }

 const labels = {
 title: t.settingsModule.systemPublishSync,
 subtitle: t.settingsModule.controlPublishingAndDataSynchronization,
 back: t.settingsModule.backToSettings,
 publishAll: t.settingsModule.publishAllChanges,
 publishDesc: t.settingsModule.pushAllPendingChangesToThe,
 syncJobs: t.settingsModule.syncJobs,
 runNow: t.settingsModule.runNow,
 never: t.settingsModule.never,
 };

 const getStatusBadge = (status: string) => {
 const map: Record<string, { icon: any; label: string; cls: string }> = {
 active: { icon: <CheckCircle className="w-3 h-3" />, label: 'Active', cls: 'bg-green-50 text-green-700' },
 paused: { icon: <Pause className="w-3 h-3" />, label: 'Paused', cls: 'bg-yellow-50 text-yellow-700' },
 error: { icon: <AlertCircle className="w-3 h-3" />, label: 'Error', cls: 'bg-red-50 text-red-700' },
 };
 const s = map[status] || map.active;
 return <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${s.cls}`}>{s.icon}{s.label}</span>;
 };

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className={`flex items-center gap-3`}>
 <BackButton onClick={() => navigate('/organization/settings')} label={labels.back} />
 </div>
 <div className={`flex items-center justify-between`}>
 <div className={`flex items-center gap-3`}>
 <div className="p-3 bg-cyan-50 rounded-lg"><RefreshCw className="w-6 h-6 text-cyan-600" /></div>
 <div>
 <h1 className={`text-2xl font-bold text-gray-900`}>{labels.title}</h1>
 <p className="text-sm text-gray-500">{labels.subtitle}</p>
 </div>
 </div>
 <button onClick={() => toast.info('Publish feature coming soon')} className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700 flex items-center gap-2">
 <Cloud className="w-4 h-4" />{labels.publishAll}
 </button>
 </div>

 <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg border border-cyan-200 p-6">
 <div className={`flex items-center gap-3`}>
 <Cloud className="w-8 h-8 text-cyan-600" />
 <div><h3 className="font-semibold text-gray-900">{labels.publishAll}</h3><p className="text-sm text-gray-600">{labels.publishDesc}</p></div>
 </div>
 </div>

 <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
 <div className="p-4 border-b border-gray-200"><h2 className="font-semibold text-gray-900">{labels.syncJobs}</h2></div>
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead><tr className="bg-gray-50">
 <th className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-start`}>Job</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-start`}>Status</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-start`}>Frequency</th>
 <th className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-start`}>Last Run</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Action</th>
 </tr></thead>
 <tbody className="divide-y divide-gray-100">
 {jobs.map(job => (
 <tr key={job.id} className="hover:bg-gray-50">
 <td className="px-4 py-3 text-sm font-medium text-gray-900">{language === 'en' ? job.name : job.nameAr}</td>
 <td className="px-4 py-3">{getStatusBadge(job.status)}</td>
 <td className="px-4 py-3 text-sm text-gray-600">{job.frequency}</td>
 <td className="px-4 py-3 text-sm text-gray-500">{job.lastRun ? formatDate(new Date(job.lastRun), language) : labels.never}</td>
 <td className="px-4 py-3 text-center">
 <button onClick={() => toast.info('Manual run coming soon')} className="px-3 py-1 text-xs font-medium text-cyan-700 bg-cyan-50 rounded-lg hover:bg-cyan-100 inline-flex items-center gap-1">
 <Play className="w-3 h-3" />{labels.runNow}
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
}

export default PublishSync;
