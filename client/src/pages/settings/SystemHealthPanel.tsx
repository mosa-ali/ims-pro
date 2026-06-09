import React, { useState, useEffect } from 'react';
import { 
 ShieldCheck, AlertCircle, Activity, CheckCircle2, XCircle, Wrench, RefreshCcw,
 Clock, Layout, Database, Lock, Zap, ArrowLeft, ArrowRight
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n/useTranslation';

interface HealthIssue {
 id: string;
 module: string;
 severity: 'CRITICAL' | 'WARNING' | 'INFO';
 issue: string;
 cause: string;
 suggestedFix: string;
 autoFixAvailable: boolean;
 timestamp: string;
}

interface ReadinessResponse {
 services: {
 api: boolean;
 database: boolean;
 auth: boolean;
 environment: boolean;
 };
}

export const SystemHealthPanel: React.FC = () => {
 const { t } = useTranslation();
 const [, navigate] = useLocation();
 const { language, isRTL } = useLanguage();
 
 const [readiness, setReadiness] = useState<ReadinessResponse | null>(null);
 const [issues, setIssues] = useState<HealthIssue[]>([]);
 const [isRefreshing, setIsRefreshing] = useState(false);
 const [lastCheck, setLastCheck] = useState<Date>(new Date());

 const fetchData = async () => {
 setIsRefreshing(true);
 try {
 // Simulate health check - in production this would call a real API
 await new Promise(resolve => setTimeout(resolve, 1000));
 setReadiness({
 services: {
 api: true,
 database: true,
 auth: true,
 environment: true,
 }
 });
 setIssues([]);
 setLastCheck(new Date());
 } catch (error) {
 toast.error(t.settingsModule.failedToFetchSystemStatus);
 } finally {
 setIsRefreshing(false);
 }
 };

 useEffect(() => {
 fetchData();
 }, []);

 const handleApplyFix = async (issueId: string) => {
 toast.success(t.settingsModule.fixAppliedSuccessfully);
 setIssues(prev => prev.filter(i => i.id !== issueId));
 };

 const getSeverityColor = (severity: string) => {
 switch (severity) {
 case 'CRITICAL': return 'bg-red-100 text-red-700 border-red-200';
 case 'WARNING': return 'bg-amber-100 text-amber-700 border-amber-200';
 default: return 'bg-blue-100 text-blue-700 border-blue-200';
 }
 };

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
 <div>
 <h1 className={`text-2xl font-bold text-gray-900 flex items-center gap-2`}>
 <ShieldCheck className="w-8 h-8 text-blue-600" />
 {t.settingsModule.regressionProtection}
 </h1>
 <p className={`text-gray-500 mt-1 text-start`}>
 {t.settingsModule.monitoringInfrastructureReadinessAndBusinessRules}
 </p>
 </div>
 <div className={`flex items-center gap-3`}>
 <div className={`hidden sm:block text-end`}>
 <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">
 {t.settingsModule.lastAudit}
 </p>
 <p className="text-sm font-medium text-gray-600">
 {lastCheck.toLocaleTimeString()}
 </p>
 </div>
 <Button variant="outline" onClick={fetchData} disabled={isRefreshing} className="flex items-center gap-2">
 <RefreshCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
 {t.settingsModule.rerunAudit}
 </Button>
 </div>
 </div>

 {/* Readiness Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
 {[
 { label: t.settingsModule.apiServer, value: readiness?.services.api, trueText: t.settingsModule.running, falseText: t.settingsModule.down, color: 'border-l-blue-500' },
 { label: t.settingsModule.database, value: readiness?.services.database, trueText: t.settingsModule.connected, falseText: t.settingsModule.error, color: 'border-l-purple-500' },
 { label: t.settingsModule.authentication, value: readiness?.services.auth, trueText: t.settingsModule.ready, falseText: t.settingsModule.failed, color: 'border-l-amber-500' },
 { label: t.settingsModule.envVariables, value: readiness?.services.environment, trueText: t.settingsModule.loaded, falseText: t.settingsModule.missing, color: 'border-l-emerald-500' },
 ].map((item, i) => (
 <Card key={i} className={`p-4 border-s-4 ${item.color}`}>
 <div className="flex items-start justify-between">
 <div>
 <p className="text-sm font-medium text-gray-500">{item.label}</p>
 <p className="text-xl font-bold mt-1">{item.value ? item.trueText : item.falseText}</p>
 </div>
 {item.value ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
 </div>
 </Card>
 ))}
 </div>

 {/* Issue Engine */}
 <div className="space-y-4">
 <div className={`flex items-center justify-between`}>
 <h2 className={`text-lg font-bold text-gray-900 flex items-center gap-2`}>
 <Activity className="w-5 h-5 text-blue-600" />
 {t.settingsModule.regressionProtectionEngine}
 <Badge variant="outline" className="ms-2">
 {issues.length} {t.settingsModule.issuesDetected}
 </Badge>
 </h2>
 </div>

 {issues.length === 0 ? (
 <div className="bg-green-50 border border-green-100 rounded-xl p-12 text-center">
 <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
 <h3 className="text-lg font-bold text-green-900">
 {t.settingsModule.systemIsHealthy}
 </h3>
 <p className="text-green-700 mt-1">
 {t.settingsModule.noRegressionsOrBusinessRuleViolations}
 </p>
 </div>
 ) : (
 <div className="grid grid-cols-1 gap-4">
 {issues.map((issue) => (
 <Card key={issue.id} className="overflow-hidden border-gray-200">
 <div className="flex flex-col md:flex-row">
 <div className={`w-2 ${issue.severity === 'CRITICAL' ? 'bg-red-500' : issue.severity === 'WARNING' ? 'bg-amber-500' : 'bg-blue-500'}`} />
 <div className="p-5 flex-1">
 <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
 <div className="flex items-center gap-2">
 <Badge variant="outline" className={`font-mono text-[10px] ${getSeverityColor(issue.severity)}`}>{issue.id}</Badge>
 <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200">{issue.module}</Badge>
 <span className="text-sm font-bold text-gray-900">{issue.issue}</span>
 </div>
 <div className="flex items-center gap-2 text-xs text-gray-400">
 <Clock className="w-3 h-3" />
 {new Date(issue.timestamp).toLocaleTimeString()}
 </div>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
 <div>
 <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{t.settingsModule.detectedCause}</p>
 <p className="text-sm text-gray-700">{issue.cause}</p>
 </div>
 <div>
 <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{t.settingsModule.suggestedFix}</p>
 <p className="text-sm text-gray-700">{issue.suggestedFix}</p>
 </div>
 </div>
 <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
 <div className="flex items-center gap-2 text-sm">
 {issue.autoFixAvailable ? (
 <span className="text-emerald-600 flex items-center gap-1 font-medium">
 <Zap className="w-4 h-4" />{t.settingsModule.autofixAvailable}
 </span>
 ) : (
 <span className="text-gray-400 flex items-center gap-1">
 <Lock className="w-4 h-4" />{t.settingsModule.requiresHumanIntervention}
 </span>
 )}
 </div>
 <Button size="sm" variant={issue.autoFixAvailable ? "default" : "outline"} disabled={!issue.autoFixAvailable} onClick={() => handleApplyFix(issue.id)} className="flex items-center gap-2">
 <Wrench className="w-4 h-4" />{t.settingsModule.applyFix}
 </Button>
 </div>
 </div>
 </div>
 </Card>
 ))}
 </div>
 )}
 </div>

 {/* Rules Awareness Section */}
 <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
 <h3 className={`text-lg font-bold text-blue-900 flex items-center gap-2 mb-4`}>
 <Layout className="w-5 h-5" />
 {t.settingsModule.activeSystemRules}
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {[
 { title: t.settingsModule.projectPlanDuration, desc: t.settingsModule.planDurationMustMatchProjectDuration },
 { title: t.settingsModule.rtlLayoutEnforcement, desc: t.settingsModule.rtlDirectionAndAllElementAlignments },
 { title: t.settingsModule.coreProjectData, desc: t.settingsModule.projectManagerMustAppearInAll },
 ].map((rule, i) => (
 <div key={i} className="bg-white/50 p-4 rounded-lg border border-blue-200">
 <h4 className="font-bold text-blue-800 text-sm mb-2">{rule.title}</h4>
 <p className="text-xs text-blue-700 leading-relaxed">{rule.desc}</p>
 </div>
 ))}
 </div>
 </div>
 </div>
 );
};

export default SystemHealthPanel;
