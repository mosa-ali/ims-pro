import { useState } from 'react';
import { Lock, Shield, Key, RefreshCw, AlertTriangle, Download, Trash2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { isUserAdmin } from '@/lib/adminCheck';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function AdminAccess() {
 const { t } = useTranslation();
 const [, navigate] = useLocation();
 const { language, isRTL } = useLanguage();
 const { user } = useAuth();
 const [maintenanceMode, setMaintenanceMode] = useState(false);
 const [confirmAction, setConfirmAction] = useState<string | null>(null);

 if (!isUserAdmin(user)) {
 return <div className="flex items-center justify-center h-64"><div className="text-center p-8 bg-white rounded-2xl shadow border"><h2 className="text-xl font-bold text-gray-900">Access Denied</h2></div></div>;
 }

 const labels = {
 title: t.settingsModule.administratorAccess,
 subtitle: t.settingsModule.advancedSystemControlsAndMaintenance,
 back: t.settingsModule.backToSettings,
 dangerZone: t.settingsModule.dangerZone,
 dangerWarning: t.settingsModule.theseActionsAreIrreversibleProceedWith,
 maintenance: t.settingsModule.maintenanceMode,
 maintenanceDesc: t.settingsModule.enableToBlockAllNonadminUsers,
 resetSessions: t.settingsModule.resetAllSessions,
 resetSessionsDesc: t.settingsModule.forceLogoutAllUsersTheyWill,
 clearCache: t.settingsModule.clearSystemCache,
 clearCacheDesc: t.settingsModule.clearAllCachedDataMayTemporarily,
 exportData: t.settingsModule.exportAllData,
 exportDataDesc: t.settingsModule.downloadACompleteBackupOfAll,
 purgeDeleted: t.settingsModule.purgeAllDeletedRecords,
 purgeDeletedDesc: t.settingsModule.permanentlyRemoveAllSoftdeletedRecordsFrom,
 confirm: t.settingsModule.confirm,
 cancel: t.settingsModule.cancel,
 systemTools: t.settingsModule.systemTools,
 };

 const handleAction = (action: string) => {
 toast.info(`${action} feature coming soon`);
 setConfirmAction(null);
 };

 const adminActions = [
 { id: 'reset-sessions', icon: <Key className="w-5 h-5" />, title: labels.resetSessions, desc: labels.resetSessionsDesc, color: 'text-orange-600 bg-orange-50', danger: true },
 { id: 'clear-cache', icon: <RefreshCw className="w-5 h-5" />, title: labels.clearCache, desc: labels.clearCacheDesc, color: 'text-blue-600 bg-blue-50', danger: false },
 { id: 'export-data', icon: <Download className="w-5 h-5" />, title: labels.exportData, desc: labels.exportDataDesc, color: 'text-green-600 bg-green-50', danger: false },
 { id: 'purge-deleted', icon: <Trash2 className="w-5 h-5" />, title: labels.purgeDeleted, desc: labels.purgeDeletedDesc, color: 'text-red-600 bg-red-50', danger: true },
 ];

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className={`flex items-center gap-3`}>
 <BackButton onClick={() => navigate('/organization/settings')} label={labels.back} />
 </div>
 <div className={`flex items-center gap-3`}>
 <div className="p-3 bg-gray-100 rounded-lg"><Lock className="w-6 h-6 text-gray-600" /></div>
 <div>
 <h1 className={`text-2xl font-bold text-gray-900 ${isRTL ? 'text-end' : ''}`}>{labels.title}</h1>
 <p className={`text-sm text-gray-500 ${isRTL ? 'text-end' : ''}`}>{labels.subtitle}</p>
 </div>
 </div>

 {/* Maintenance Mode */}
 <div className="bg-white rounded-lg border border-gray-200 p-6">
 <div className={`flex items-center justify-between`}>
 <div className={`flex items-center gap-3`}>
 <Shield className="w-5 h-5 text-amber-600" />
 <div>
 <h3 className="font-semibold text-gray-900">{labels.maintenance}</h3>
 <p className="text-sm text-gray-500">{labels.maintenanceDesc}</p>
 </div>
 </div>
 <button onClick={() => setMaintenanceMode(!maintenanceMode)}
 className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${maintenanceMode ? 'bg-amber-500' : 'bg-gray-300'}`}>
 <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${maintenanceMode ? ('translate-x-6') : ('translate-x-1')}`} />
 </button>
 </div>
 </div>

 {/* System Tools */}
 <div className="space-y-4">
 <h2 className="font-semibold text-gray-900">{labels.systemTools}</h2>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {adminActions.map(action => (
 <div key={action.id} className="bg-white rounded-lg border border-gray-200 p-5">
 <div className={`flex items-start gap-3`}>
 <div className={`p-2 rounded-lg ${action.color}`}>{action.icon}</div>
 <div className="flex-1">
 <h3 className="font-medium text-gray-900 text-sm">{action.title}</h3>
 <p className="text-xs text-gray-500 mt-1">{action.desc}</p>
 <button onClick={() => action.danger ? setConfirmAction(action.id) : handleAction(action.id)}
 className={`mt-3 px-3 py-1.5 rounded-lg text-xs font-medium ${action.danger ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
 {action.title}
 </button>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Danger Zone */}
 <div className="border-2 border-red-200 rounded-lg p-6 bg-red-50/30">
 <div className={`flex items-center gap-2 mb-3`}>
 <AlertTriangle className="w-5 h-5 text-red-600" />
 <h2 className="font-semibold text-red-900">{labels.dangerZone}</h2>
 </div>
 <p className="text-sm text-red-700">{labels.dangerWarning}</p>
 </div>

 {/* Confirm Modal */}
 {confirmAction && (
 <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
 <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
 <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
 <h3 className="text-lg font-bold text-gray-900 mb-2">{t.settingsModule.areYouSure}</h3>
 <p className="text-sm text-gray-500 mb-6">{t.settingsModule.thisActionCannotBeUndone}</p>
 <div className="flex gap-3 justify-center">
 <button onClick={() => setConfirmAction(null)} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg">{labels.cancel}</button>
 <button onClick={() => handleAction(confirmAction)} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg">{labels.confirm}</button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}

export default AdminAccess;
