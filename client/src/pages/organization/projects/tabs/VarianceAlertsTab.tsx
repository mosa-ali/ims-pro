import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Bell, AlertTriangle, AlertCircle, Check, X, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';
import { useLanguage } from '@/contexts/LanguageContext';

interface VarianceAlertsTabProps {
 projectId: string;
 isRTL: boolean;
}

export function VarianceAlertsTab({
 projectId, isRTL }: VarianceAlertsTabProps) {
 const { t } = useTranslation();
 const projectIdNum = parseInt(projectId);
 const [showConfigModal, setShowConfigModal] = useState(false);
 const [configData, setConfigData] = useState({
 warningThreshold: 10,
 criticalThreshold: 20,
 isEnabled: true,
 notifyProjectManager: true,
 notifyFinanceTeam: true,
 notifyOwner: false,
 });

 // Fetch alert configuration
 const { data: config, refetch: refetchConfig } = trpc.varianceAlerts.getConfig.useQuery({ projectId: projectIdNum });

 // Fetch alert history
 const { data: alerts = [], refetch: refetchAlerts } = trpc.varianceAlerts.getHistory.useQuery({ projectId: projectIdNum, limit: 100 });

 // Update config mutation
 const updateConfigMutation = trpc.varianceAlerts.upsertConfig.useMutation({
 onSuccess: () => {
 refetchConfig();
 setShowConfigModal(false);
 alert(t.projectDetail.alertSettingsUpdatedSuccessfully);
 },
 onError: (error) => {
 alert(`${t.projectDetail.updateFailed}: ${error.message}`);
 },
 });

 // Acknowledge alert mutation
 const acknowledgeMutation = trpc.varianceAlerts.acknowledgeAlert.useMutation({
 onSuccess: () => {
 refetchAlerts();
 },
 onError: (error) => {
 alert(`${t.projectDetail.acknowledgmentFailed}: ${error.message}`);
 },
 });

 // Initialize config data when loaded
 React.useEffect(() => {
 if (config) {
 setConfigData({
 warningThreshold: parseFloat(config.warningThreshold || '10'),
 criticalThreshold: parseFloat(config.criticalThreshold || '20'),
isEnabled: config.isEnabled === 1,
notifyProjectManager: config.notifyProjectManager === 1,
notifyFinanceTeam: config.notifyFinanceTeam === 1,
notifyOwner: config.notifyOwner === 1,
 });
 }
 }, [config]);

 const handleSaveConfig = () => {
 if (configData.criticalThreshold <= configData.warningThreshold) {
 alert(t.projectDetail.criticalThresholdMustBeGreaterThan);
 return;
 }

 updateConfigMutation.mutate({
 projectId: projectIdNum,
 ...configData,
 });
 };

 const handleAcknowledge = (alertId: number) => {
 acknowledgeMutation.mutate({ alertId });
 };

 // Count unacknowledged alerts
 const unacknowledgedCount = alerts.filter(a => !a.acknowledgedAt).length;

 return (
 <div className="p-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
 <Bell className="w-5 h-5 text-orange-600" />
 </div>
 <div>
 <h2 className="text-xl font-bold text-gray-900">
 {t.projectDetail.spendingVarianceAlerts}
 </h2>
 <p className="text-sm text-gray-600">
 {t.projectDetail.monitorOverspendingAndReceiveAutomatedAlerts}
 </p>
 </div>
 </div>
 <Button onClick={() => setShowConfigModal(true)} variant="outline" size="sm">
 <Settings className="w-4 h-4 me-2" />
 {t.projectDetail.settings}
 </Button>
 </div>

 {/* Status Card */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
 <div className="bg-white border border-gray-200 rounded-lg p-4">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-gray-600">{t.projectDetail.status}</p>
 <p className="text-lg font-bold text-gray-900">
 {config?.isEnabled ? (t.projectDetail.enabled) : (t.projectDetail.disabled)}
 </p>
 </div>
 <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${config?.isEnabled ? 'bg-green-100' : 'bg-gray-100'}`}>
 <Bell className={`w-6 h-6 ${config?.isEnabled ? 'text-green-600' : 'text-gray-400'}`} />
 </div>
 </div>
 </div>

 <div className="bg-white border border-gray-200 rounded-lg p-4">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-gray-600">{t.projectDetail.totalAlerts}</p>
 <p className="text-lg font-bold text-gray-900">{alerts.length}</p>
 </div>
 <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
 <AlertCircle className="w-6 h-6 text-blue-600" />
 </div>
 </div>
 </div>

 <div className="bg-white border border-gray-200 rounded-lg p-4">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-gray-600">{t.projectDetail.unacknowledged}</p>
 <p className="text-lg font-bold text-gray-900">{unacknowledgedCount}</p>
 </div>
 <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
 <AlertTriangle className="w-6 h-6 text-orange-600" />
 </div>
 </div>
 </div>
 </div>

 {/* Thresholds Info */}
 {config && (
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
 <h3 className="font-semibold text-gray-900 mb-2">
 {t.projectDetail.currentAlertThresholds}
 </h3>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <p className="text-sm text-gray-600">{t.projectDetail.warningThreshold}</p>
 <p className="text-lg font-bold text-yellow-600">{config.warningThreshold}%</p>
 </div>
 <div>
 <p className="text-sm text-gray-600">{t.projectDetail.criticalThreshold}</p>
 <p className="text-lg font-bold text-red-600">{config.criticalThreshold}%</p>
 </div>
 </div>
 </div>
 )}

 {/* Alerts History */}
 <div className="bg-white border border-gray-200 rounded-lg">
 <div className="p-4 border-b border-gray-200">
 <h3 className="font-semibold text-gray-900">
 {t.projectDetail.alertHistory}
 </h3>
 </div>

 <div className="divide-y divide-gray-200">
 {alerts.length === 0 ? (
 <div className="p-8 text-center text-gray-500">
 <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
 <p>{t.projectDetail.noAlertsYet}</p>
 <p className="text-sm mt-1">
 {t.projectDetail.alertsWillAppearHereWhenSpending}
 </p>
 </div>
 ) : (
 alerts.map((alert) => (
 <div key={alert.id} className={`p-4 ${!alert.acknowledgedAt ? 'bg-orange-50' : ''}`}>
 <div className="flex items-start justify-between">
 <div className="flex items-start gap-3 flex-1">
 <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${ alert.alertLevel === 'critical' ? 'bg-red-100' : 'bg-yellow-100' }`}>
 <AlertTriangle className={`w-5 h-5 ${ alert.alertLevel === 'critical' ? 'text-red-600' : 'text-yellow-600' }`} />
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-1">
 <span className={`px-2 py-0.5 rounded text-xs font-semibold ${ alert.alertLevel === 'critical' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700' }`}>
 {alert.alertLevel === 'critical' ? (t.projectDetail.critical19) : (t.projectDetail.warning)}
 </span>
 <span className="text-xs text-gray-500">
 {new Date(alert.createdAt).toLocaleString('en')}
 </span>
 </div>
 <h4 className="font-semibold text-gray-900 mb-1">
 {alert.budgetItem}
 </h4>
 <p className="text-sm text-gray-600 mb-2">
 {t.projectDetail.budgetCode}: <span className="font-mono">{alert.budgetCode}</span>
 </p>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
 <div>
 <p className="text-gray-600">{t.projectDetail.totalBudget20}</p>
 <p className="font-semibold text-gray-900">${parseFloat(alert.totalBudget).toFixed(2)}</p>
 </div>
 <div>
 <p className="text-gray-600">{t.projectDetail.actualSpent}</p>
 <p className="font-semibold text-gray-900">${parseFloat(alert.actualSpent).toFixed(2)}</p>
 </div>
 <div>
 <p className="text-gray-600">{t.projectDetail.overspending21}</p>
 <p className="font-semibold text-red-600">${parseFloat(alert.varianceAmount).toFixed(2)}</p>
 </div>
 <div>
 <p className="text-gray-600">{t.projectDetail.percentage}</p>
 <p className="font-semibold text-red-600">{parseFloat(alert.variancePercentage).toFixed(2)}%</p>
 </div>
 </div>
 {alert.acknowledgedAt && (
 <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
 <Check className="w-3 h-3" />
 {t.projectDetail.acknowledged} - {new Date(alert.acknowledgedAt).toLocaleString('en')}
 </div>
 )}
 </div>
 </div>
 {!alert.acknowledgedAt && (
 <Button
 onClick={() => handleAcknowledge(alert.id)}
 variant="outline"
 size="sm"
 disabled={acknowledgeMutation.isPending}
 >
 <Check className="w-4 h-4 me-1" />
 {t.projectDetail.acknowledge}
 </Button>
 )}
 </div>
 </div>
 ))
 )}
 </div>
 </div>

 {/* Configuration Modal */}
 {showConfigModal && (
 <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-xl font-bold text-gray-900">
 {t.projectDetail.varianceAlertSettings}
 </h2>
 <button onClick={() => setShowConfigModal(false)} className="text-gray-500 hover:text-gray-700">
 <X className="w-5 h-5" />
 </button>
 </div>

 <div className="space-y-4">
 {/* Enable/Disable */}
 <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
 <div>
 <label className="font-medium text-gray-900">
 {t.projectDetail.enableAlerts}
 </label>
 <p className="text-sm text-gray-600">
 {t.projectDetail.turnVarianceAlertsOnOrOff}
 </p>
 </div>
 <input
 type="checkbox"
 checked={configData.isEnabled}
 onChange={(e) => setConfigData({ ...configData, isEnabled: e.target.checked })}
 className="w-5 h-5"
 />
 </div>

 {/* Thresholds */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {t.projectDetail.warningThreshold22}
 </label>
 <input
 type="number"
 min="0"
 max="100"
 step="0.1"
 value={configData.warningThreshold}
 onChange={(e) => setConfigData({ ...configData, warningThreshold: parseFloat(e.target.value) })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
 />
 <p className="text-xs text-gray-500 mt-1">
 {t.projectDetail.aWarningAlertWillBeSent}
 </p>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">
 {t.projectDetail.criticalThreshold23}
 </label>
 <input
 type="number"
 min="0"
 max="100"
 step="0.1"
 value={configData.criticalThreshold}
 onChange={(e) => setConfigData({ ...configData, criticalThreshold: parseFloat(e.target.value) })}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
 />
 <p className="text-xs text-gray-500 mt-1">
 {t.projectDetail.aCriticalAlertWillBeSent}
 </p>
 </div>

 {/* Notification Settings */}
 <div className="border-t border-gray-200 pt-4">
 <h3 className="font-semibold text-gray-900 mb-3">
 {t.projectDetail.notificationSettings}
 </h3>

 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <label className="text-sm text-gray-700">
 {t.projectDetail.notifyProjectManager}
 </label>
 <input
 type="checkbox"
 checked={configData.notifyProjectManager}
 onChange={(e) => setConfigData({ ...configData, notifyProjectManager: e.target.checked })}
 className="w-4 h-4"
 />
 </div>

 <div className="flex items-center justify-between">
 <label className="text-sm text-gray-700">
 {t.projectDetail.notifyFinanceTeam}
 </label>
 <input
 type="checkbox"
 checked={configData.notifyFinanceTeam}
 onChange={(e) => setConfigData({ ...configData, notifyFinanceTeam: e.target.checked })}
 className="w-4 h-4"
 />
 </div>

 <div className="flex items-center justify-between">
 <label className="text-sm text-gray-700">
 {t.projectDetail.notifyOwner}
 </label>
 <input
 type="checkbox"
 checked={configData.notifyOwner}
 onChange={(e) => setConfigData({ ...configData, notifyOwner: e.target.checked })}
 className="w-4 h-4"
 />
 </div>
 </div>
 </div>
 </div>

 <div className="flex gap-2 mt-6">
 <Button
 onClick={handleSaveConfig}
 disabled={updateConfigMutation.isPending}
 className="flex-1"
 >
 {t.projectDetail.save}
 </Button>
 <Button
 variant="outline"
 onClick={() => setShowConfigModal(false)}
 className="flex-1"
 >
 {t.projectDetail.cancel}
 </Button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
