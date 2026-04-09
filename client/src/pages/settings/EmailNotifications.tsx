import { useState, useEffect, useMemo } from 'react';
import {
 ArrowLeft, ArrowRight, Mail, Save, Bell, BellOff, TestTube, Shield, Server,
 CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp,
 RefreshCw, Eye, EyeOff, Send, Clock, RotateCcw, Inbox,
 Settings2, Zap, Users, FileText, Plus, Pencil, Trash2, Copy,
 Code, Tag, X, Check, FileCode
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { isUserAdmin } from '@/lib/adminCheck';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

type TabId = 'provider' | 'events' | 'templates' | 'outbox';

const CATEGORY_ICONS: Record<string, string> = {
 grants: '🏦', finance: '💰', projects: '📋', system: '⚙️',
 hr: '👥', logistics: '🚚', meal: '📊', documents: '📄',
};

const CATEGORY_LABELS: Record<string, { en: string; ar: string }> = {
 grants: { en: 'Grants', ar: 'المنح' },
 finance: { en: 'Finance', ar: 'المالية' },
 projects: { en: 'Projects', ar: 'المشاريع' },
 system: { en: 'System', ar: 'النظام' },
 hr: { en: 'Human Resources', ar: 'الموارد البشرية' },
 logistics: { en: 'Logistics', ar: 'اللوجستيات' },
 meal: { en: 'MEAL', ar: 'الرصد والتقييم' },
 documents: { en: 'Documents', ar: 'المستندات' },
};

export function EmailNotifications() {
 const { t } = useTranslation();
 const [, navigate] = useLocation();
 const { language, isRTL } = useLanguage();
 const { user } = useAuth();
 const [activeTab, setActiveTab] = useState<TabId>('provider');

 if (!isUserAdmin(user)) {
 return (
 <div className="flex items-center justify-center h-64">
 <div className="text-center p-8 bg-white rounded-2xl shadow border">
 <h2 className="text-xl font-bold text-gray-900">
 {t.emailNotifications.accessDenied}
 </h2>
 </div>
 </div>
 );
 }

 const labels = {
 title: t.emailNotifications.emailNotifications,
 subtitle: t.emailNotifications.configureEmailProvidersNotificationEventsAnd,
 back: t.emailNotifications.backToSettings,
 tabProvider: t.emailNotifications.emailProvider,
 tabEvents: t.emailNotifications.notificationEvents,
 tabOutbox: t.emailNotifications.deliveryLog,
 tabTemplates: t.emailNotifications.emailTemplates,
 };

 const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
 { id: 'provider', label: labels.tabProvider, icon: <Mail className="w-4 h-4" /> },
 { id: 'events', label: labels.tabEvents, icon: <Bell className="w-4 h-4" /> },
 { id: 'templates', label: labels.tabTemplates, icon: <FileCode className="w-4 h-4" /> },
 { id: 'outbox', label: labels.tabOutbox, icon: <Inbox className="w-4 h-4" /> },
 ];

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className={`flex items-center gap-3`}>
 <BackButton onClick={() => navigate('/organization/settings')} label={labels.back} />
 </div>
 <div className={`flex items-center gap-3`}>
 <div className="p-3 bg-yellow-50 rounded-lg"><Mail className="w-6 h-6 text-yellow-600" /></div>
 <div>
 <h1 className={`text-2xl font-bold text-gray-900 ${isRTL ? 'text-end' : ''}`}>{labels.title}</h1>
 <p className={`text-sm text-gray-500 ${isRTL ? 'text-end' : ''}`}>{labels.subtitle}</p>
 </div>
 </div>

 {/* Tabs */}
 <div className={`flex gap-1 bg-gray-100 rounded-lg p-1`}>
 {tabs.map(tab => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${ activeTab === tab.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50' }`}
 >
 {tab.icon}{tab.label}
 </button>
 ))}
 </div>

 {/* Tab Content */}
 {activeTab === 'provider' && <EmailProviderTab />}
 {activeTab === 'events' && <NotificationEventsTab />}
 {activeTab === 'templates' && <EmailTemplatesTab />}
 {activeTab === 'outbox' && <OutboxTab />}
 </div>
 );
}

// ============================================================================
// TAB 1: EMAIL PROVIDER
// ============================================================================

function EmailProviderTab() {
  const { t } = useTranslation();
  const { language, isRTL} = useLanguage();
 const providerQuery = trpc.settings.emailProvider.getProvider.useQuery();
 const saveMutation = trpc.settings.emailProvider.saveProvider.useMutation({
 onSuccess: () => { toast.success(t.emailNotifications.providerSettingsSaved); providerQuery.refetch(); },
 onError: (e: any) => toast.error(e.message),
 });
 const testMutation = trpc.settings.emailProvider.testConnection.useMutation({
 onSuccess: (data) => {
 if (data.success) toast.success(data.message);
 else toast.error(data.message);
 providerQuery.refetch();
 },
 onError: (e: any) => toast.error(e.message),
 });

 const [providerType, setProviderType] = useState<'m365' | 'smtp' | 'disabled'>('disabled');
 const [tenantId, setTenantId] = useState('');
 const [clientId, setClientId] = useState('');
 const [authType, setAuthType] = useState<'secret' | 'certificate'>('secret');
 const [secretRef, setSecretRef] = useState('');
 const [senderMode, setSenderMode] = useState<'shared_mailbox' | 'user_mailbox'>('shared_mailbox');
 const [fromEmail, setFromEmail] = useState('');
 const [fromName, setFromName] = useState('');
 const [replyToEmail, setReplyToEmail] = useState('');
 const [defaultCc, setDefaultCc] = useState('');
 const [defaultBcc, setDefaultBcc] = useState('');
 const [allowedDomains, setAllowedDomains] = useState('');
 const [smtpHost, setSmtpHost] = useState('');
 const [smtpPort, setSmtpPort] = useState(587);
 const [smtpUsername, setSmtpUsername] = useState('');
 const [smtpPassword, setSmtpPassword] = useState('');
 const [smtpEncryption, setSmtpEncryption] = useState<'tls' | 'ssl' | 'none'>('tls');
 const [showSecret, setShowSecret] = useState(false);
 const [smtpExpanded, setSmtpExpanded] = useState(false);

 useEffect(() => {
 if (providerQuery.data) {
 const d = providerQuery.data;
 setProviderType(d.providerType as any || 'disabled');
 setTenantId(d.tenantId || '');
 setClientId(d.clientId || '');
 setAuthType((d.authType as any) || 'secret');
 setSecretRef(d.secretRef || '');
 setSenderMode((d.senderMode as any) || 'shared_mailbox');
 setFromEmail(d.fromEmail || '');
 setFromName(d.fromName || '');
 setReplyToEmail(d.replyToEmail || '');
 setDefaultCc(d.defaultCc || '');
 setDefaultBcc(d.defaultBcc || '');
 setAllowedDomains(d.allowedDomains || '');
 setSmtpHost(d.smtpHost || '');
 setSmtpPort(d.smtpPort || 587);
 setSmtpUsername(d.smtpUsername || '');
 setSmtpEncryption((d.smtpEncryption as any) || 'tls');
 if (d.providerType === 'smtp') setSmtpExpanded(true);
 }
 }, [providerQuery.data]);

 const handleSave = () => {
 saveMutation.mutate({
 providerType,
 tenantId: providerType === 'm365' ? tenantId : null,
 clientId: providerType === 'm365' ? clientId : null,
 authType: providerType === 'm365' ? authType : null,
 secretRef: providerType === 'm365' && secretRef && secretRef !== '••••••••' ? secretRef : undefined,
 senderMode: providerType === 'm365' ? senderMode : null,
 smtpHost: providerType === 'smtp' ? smtpHost : null,
 smtpPort: providerType === 'smtp' ? smtpPort : null,
 smtpUsername: providerType === 'smtp' ? smtpUsername : null,
 smtpPassword: providerType === 'smtp' && smtpPassword && smtpPassword !== '••••••••' ? smtpPassword : undefined,
 smtpEncryption: providerType === 'smtp' ? smtpEncryption : null,
 fromEmail, fromName, replyToEmail, defaultCc, defaultBcc, allowedDomains,
 });
 };

 const data = providerQuery.data;
 const isConnected = data?.isConnected;
 const lastError = data?.lastError;
 const lastTestedAt = data?.lastTestedAt;

 const labels = {
 save: t.emailNotifications.saveConfiguration,
 testConnection: t.emailNotifications.testConnection,
 sendTestEmail: t.emailNotifications.sendTestEmail,
 m365Title: t.emailNotifications.microsoft365,
 m365Desc: t.emailNotifications.sendEmailsViaMicrosoftGraphApi,
 m365Recommended: t.emailNotifications.recommended,
 smtpTitle: t.emailNotifications.smtpServer,
 smtpDesc: t.emailNotifications.useOnlyIfMicrosoft365Is,
 smtpAdvanced: t.emailNotifications.advancedOptional,
 disabledTitle: t.emailNotifications.disabled,
 disabledDesc: t.emailNotifications.noEmailSendingUsefulForTeststaging,
 connected: t.emailNotifications.connected,
 notConnected: t.emailNotifications.notConnected,
 tenantId: t.emailNotifications.tenantIdGuid,
 clientId: t.emailNotifications.clientIdApplicationId,
 authMethod: t.emailNotifications.authenticationMethod,
 clientSecret: t.emailNotifications.clientSecret,
 certificate: t.emailNotifications.certificate,
 senderMode: t.emailNotifications.senderMode,
 sharedMailbox: t.emailNotifications.sharedMailboxRecommended,
 userMailbox: t.emailNotifications.userMailbox,
 fromEmail: t.emailNotifications.fromEmailAddress,
 fromName: t.emailNotifications.displayName,
 replyTo: t.emailNotifications.replytoEmail,
 defaultCc: t.emailNotifications.defaultCc,
 defaultBcc: t.emailNotifications.defaultBcc,
 allowedDomains: t.emailNotifications.allowedDomains,
 smtpHost: t.emailNotifications.smtpHost,
 smtpPort: t.emailNotifications.smtpPort,
 smtpUser: t.emailNotifications.smtpUsername,
 smtpPass: t.emailNotifications.smtpPassword,
 encryption: t.emailNotifications.encryption,
 connectionStatus: t.emailNotifications.connectionStatus,
 lastTested: t.emailNotifications.lastTested,
 lastErrorLabel: t.emailNotifications.lastError,
 commonSettings: t.emailNotifications.commonEmailSettings,
 requiredFields: t.emailNotifications.requiredFieldsAdminOnly,
 optionalFields: t.emailNotifications.optionalRecommended,
 smtpWarning: t.emailNotifications.useSmtpOnlyIfMicrosoft365,
 selectProvider: t.emailNotifications.selectEmailProvider,
 };

  return (
  <div className="space-y-6">
  {/* Area A Header - Email Provider Configuration */}
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
    <div className="flex items-start gap-3">
      <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
      <div className={isRTL ? 'text-end' : ''}>
        <h3 className="font-semibold text-blue-900 mb-1">
          {language === 'ar' ? 'المنطقة أ: تكوين موفر البريد الإلكتروني' : 'Area A: Email Provider Configuration'}
        </h3>
        <p className="text-sm text-blue-800">
          {language === 'ar' 
            ? 'قم بتكوين موفر البريد الإلكتروني (Microsoft 365 أو SMTP) لإرسال رسائل البريد الإلكتروني من منظمتك. هذا منفصل عن اتصال المستأجر في المنطقة ب.'
            : 'Configure your email provider (Microsoft 365 or SMTP) for sending emails from your organization. This is separate from tenant connection in Area B.'}
        </p>
      </div>
    </div>
  </div>

  {/* Provider Selection Cards */}
  <div>
  <h3 className={`text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 ${isRTL ? 'text-end' : ''}`}>
  {labels.selectProvider}
  </h3>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {/* M365 Card */}
 <button
 onClick={() => setProviderType('m365')}
 className={`relative p-5 rounded-xl border-2 transition-all text-start ${isRTL ? 'text-end' : ''} ${ providerType === 'm365' ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-200' : 'border-gray-200 hover:border-gray-300 bg-white' }`}
 >
 <div className={`flex items-start gap-3`}>
 <div className={`p-2.5 rounded-lg ${providerType === 'm365' ? 'bg-blue-100' : 'bg-gray-100'}`}>
 <Shield className={`w-5 h-5 ${providerType === 'm365' ? 'text-blue-600' : 'text-gray-500'}`} />
 </div>
 <div className="flex-1 min-w-0">
 <div className={`flex items-center gap-2`}>
 <span className="font-semibold text-gray-900">{labels.m365Title}</span>
 <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">{labels.m365Recommended}</span>
 </div>
 <p className="text-xs text-gray-500 mt-1">{labels.m365Desc}</p>
 </div>
 </div>
 {providerType === 'm365' && isConnected && (
 <div className={`flex items-center gap-1.5 mt-3 text-xs font-medium text-green-600`}>
 <CheckCircle2 className="w-3.5 h-3.5" />{labels.connected}
 </div>
 )}
 {providerType === 'm365' && !isConnected && data?.providerType === 'm365' && (
 <div className={`flex items-center gap-1.5 mt-3 text-xs font-medium text-amber-600`}>
 <XCircle className="w-3.5 h-3.5" />{labels.notConnected}
 </div>
 )}
 </button>

 {/* SMTP Card */}
 <button
 onClick={() => { setProviderType('smtp'); setSmtpExpanded(true); }}
 className={`relative p-5 rounded-xl border-2 transition-all text-start ${isRTL ? 'text-end' : ''} ${ providerType === 'smtp' ? 'border-amber-500 bg-amber-50/50 ring-1 ring-amber-200' : 'border-gray-200 hover:border-gray-300 bg-white' }`}
 >
 <div className={`flex items-start gap-3`}>
 <div className={`p-2.5 rounded-lg ${providerType === 'smtp' ? 'bg-amber-100' : 'bg-gray-100'}`}>
 <Server className={`w-5 h-5 ${providerType === 'smtp' ? 'text-amber-600' : 'text-gray-500'}`} />
 </div>
 <div className="flex-1 min-w-0">
 <div className={`flex items-center gap-2`}>
 <span className="font-semibold text-gray-900">{labels.smtpTitle}</span>
 <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">{labels.smtpAdvanced}</span>
 </div>
 <p className="text-xs text-gray-500 mt-1">{labels.smtpDesc}</p>
 </div>
 </div>
 {providerType === 'smtp' && isConnected && (
 <div className={`flex items-center gap-1.5 mt-3 text-xs font-medium text-green-600`}>
 <CheckCircle2 className="w-3.5 h-3.5" />{labels.connected}
 </div>
 )}
 </button>

 {/* Disabled Card */}
 <button
 onClick={() => setProviderType('disabled')}
 className={`relative p-5 rounded-xl border-2 transition-all text-start ${isRTL ? 'text-end' : ''} ${ providerType === 'disabled' ? 'border-gray-500 bg-gray-50 ring-1 ring-gray-300' : 'border-gray-200 hover:border-gray-300 bg-white' }`}
 >
 <div className={`flex items-start gap-3`}>
 <div className={`p-2.5 rounded-lg ${providerType === 'disabled' ? 'bg-gray-200' : 'bg-gray-100'}`}>
 <BellOff className={`w-5 h-5 ${providerType === 'disabled' ? 'text-gray-600' : 'text-gray-500'}`} />
 </div>
 <div className="flex-1 min-w-0">
 <span className="font-semibold text-gray-900">{labels.disabledTitle}</span>
 <p className="text-xs text-gray-500 mt-1">{labels.disabledDesc}</p>
 </div>
 </div>
 </button>
 </div>
 </div>

 {/* M365 Configuration */}
 {providerType === 'm365' && (
 <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
 {/* Required Fields */}
 <div className="p-6">
 <h3 className={`text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 ${isRTL ? 'text-end' : ''}`}>
 {labels.requiredFields}
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className={`text-sm font-medium text-gray-700 block mb-1.5 ${isRTL ? 'text-end' : ''}`}>{labels.tenantId}</label>
 <input type="text" value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className={`w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isRTL ? 'text-end' : ''}`} />
 </div>
 <div>
 <label className={`text-sm font-medium text-gray-700 block mb-1.5 ${isRTL ? 'text-end' : ''}`}>{labels.clientId}</label>
 <input type="text" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className={`w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isRTL ? 'text-end' : ''}`} />
 </div>
 <div>
 <label className={`text-sm font-medium text-gray-700 block mb-1.5 ${isRTL ? 'text-end' : ''}`}>{labels.authMethod}</label>
 <select value={authType} onChange={(e) => setAuthType(e.target.value as any)} className={`w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isRTL ? 'text-end' : ''}`}>
 <option value="secret">{labels.clientSecret}</option>
 <option value="certificate">{labels.certificate}</option>
 </select>
 </div>
 <div>
 <label className={`text-sm font-medium text-gray-700 block mb-1.5 ${isRTL ? 'text-end' : ''}`}>
 {authType === 'secret' ? labels.clientSecret : labels.certificate}
 </label>
 <div className="relative">
 <input
 type={showSecret ? 'text' : 'password'}
 value={secretRef}
 onChange={(e) => setSecretRef(e.target.value)}
 placeholder={authType === 'secret' ? 'Enter client secret...' : 'Certificate thumbprint...'}
 className={`w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pe-10`}
 />
 <button onClick={() => setShowSecret(!showSecret)} className={`absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 ${'end-3'}`}>
 {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
 </button>
 </div>
 </div>
 <div>
 <label className={`text-sm font-medium text-gray-700 block mb-1.5 ${isRTL ? 'text-end' : ''}`}>{labels.senderMode}</label>
 <select value={senderMode} onChange={(e) => setSenderMode(e.target.value as any)} className={`w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isRTL ? 'text-end' : ''}`}>
 <option value="shared_mailbox">{labels.sharedMailbox}</option>
 <option value="user_mailbox">{labels.userMailbox}</option>
 </select>
 </div>
 <div>
 <label className={`text-sm font-medium text-gray-700 block mb-1.5 ${isRTL ? 'text-end' : ''}`}>{labels.fromEmail}</label>
 <input type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder={t.placeholders.imsYourdomainOrg} className={`w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isRTL ? 'text-end' : ''}`} />
 </div>
 </div>
 </div>

 {/* Connection Status */}
 {data?.providerType === 'm365' && (
 <div className="p-6">
 <h3 className={`text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 ${isRTL ? 'text-end' : ''}`}>
 {labels.connectionStatus}
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className={`flex items-center gap-2`}>
 {isConnected ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
 <span className={`text-sm font-medium ${isConnected ? 'text-green-700' : 'text-red-700'}`}>
 {isConnected ? labels.connected : labels.notConnected}
 </span>
 </div>
 {lastTestedAt && (
 <div className={`flex items-center gap-2 text-sm text-gray-500`}>
 <Clock className="w-4 h-4" />
 <span>{labels.lastTested}: {new Date(lastTestedAt).toLocaleString()}</span>
 </div>
 )}
 {lastError && (
 <div className={`flex items-center gap-2 text-sm text-red-600`}>
 <AlertTriangle className="w-4 h-4" />
 <span className="truncate">{lastError}</span>
 </div>
 )}
 </div>
 </div>
 )}
 </div>
 )}

 {/* SMTP Configuration */}
 {providerType === 'smtp' && (
 <div className="bg-white rounded-xl border border-gray-200">
 {/* Warning Banner */}
 <div className={`flex items-start gap-3 p-4 bg-amber-50 border-b border-amber-100 rounded-t-xl`}>
 <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
 <p className={`text-sm text-amber-800 ${isRTL ? 'text-end' : ''}`}>{labels.smtpWarning}</p>
 </div>
 <div className="p-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className={`text-sm font-medium text-gray-700 block mb-1.5 ${isRTL ? 'text-end' : ''}`}>{labels.smtpHost}</label>
 <input type="text" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder={t.placeholders.smtpOffice365Com} className={`w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isRTL ? 'text-end' : ''}`} />
 </div>
 <div>
 <label className={`text-sm font-medium text-gray-700 block mb-1.5 ${isRTL ? 'text-end' : ''}`}>{labels.smtpPort}</label>
 <input type="number" value={smtpPort} onChange={(e) => setSmtpPort(Number(e.target.value))} className={`w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isRTL ? 'text-end' : ''}`} />
 </div>
 <div>
 <label className={`text-sm font-medium text-gray-700 block mb-1.5 ${isRTL ? 'text-end' : ''}`}>{labels.smtpUser}</label>
 <input type="text" value={smtpUsername} onChange={(e) => setSmtpUsername(e.target.value)} className={`w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isRTL ? 'text-end' : ''}`} />
 </div>
 <div>
 <label className={`text-sm font-medium text-gray-700 block mb-1.5 ${isRTL ? 'text-end' : ''}`}>{labels.smtpPass}</label>
 <div className="relative">
 <input type={showSecret ? 'text' : 'password'} value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} className={`w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pe-10`} />
 <button onClick={() => setShowSecret(!showSecret)} className={`absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 ${'end-3'}`}>
 {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
 </button>
 </div>
 </div>
 <div>
 <label className={`text-sm font-medium text-gray-700 block mb-1.5 ${isRTL ? 'text-end' : ''}`}>{labels.encryption}</label>
 <select value={smtpEncryption} onChange={(e) => setSmtpEncryption(e.target.value as any)} className={`w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isRTL ? 'text-end' : ''}`}>
 <option value="tls">TLS (Port 587)</option>
 <option value="ssl">SSL (Port 465)</option>
 <option value="none">None (Port 25)</option>
 </select>
 </div>
 <div>
 <label className={`text-sm font-medium text-gray-700 block mb-1.5 ${isRTL ? 'text-end' : ''}`}>{labels.fromEmail}</label>
 <input type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder={t.placeholders.noreplyYourdomainOrg} className={`w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isRTL ? 'text-end' : ''}`} />
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Common Email Settings (for M365 and SMTP) */}
 {providerType !== 'disabled' && (
 <div className="bg-white rounded-xl border border-gray-200 p-6">
 <h3 className={`text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 ${isRTL ? 'text-end' : ''}`}>
 {labels.commonSettings}
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className={`text-sm font-medium text-gray-700 block mb-1.5 ${isRTL ? 'text-end' : ''}`}>{labels.fromName}</label>
 <input type="text" value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder={t.placeholders.imsNotifications} className={`w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isRTL ? 'text-end' : ''}`} />
 </div>
 <div>
 <label className={`text-sm font-medium text-gray-700 block mb-1.5 ${isRTL ? 'text-end' : ''}`}>{labels.replyTo}</label>
 <input type="email" value={replyToEmail} onChange={(e) => setReplyToEmail(e.target.value)} placeholder={t.placeholders.supportYourdomainOrg} className={`w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isRTL ? 'text-end' : ''}`} />
 </div>
 <div>
 <label className={`text-sm font-medium text-gray-700 block mb-1.5 ${isRTL ? 'text-end' : ''}`}>{labels.defaultCc}</label>
 <input type="text" value={defaultCc} onChange={(e) => setDefaultCc(e.target.value)} placeholder={t.placeholders.ccYourdomainOrg} className={`w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isRTL ? 'text-end' : ''}`} />
 </div>
 <div>
 <label className={`text-sm font-medium text-gray-700 block mb-1.5 ${isRTL ? 'text-end' : ''}`}>{labels.defaultBcc}</label>
 <input type="text" value={defaultBcc} onChange={(e) => setDefaultBcc(e.target.value)} placeholder={t.placeholders.auditYourdomainOrg} className={`w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isRTL ? 'text-end' : ''}`} />
 </div>
 <div className="md:col-span-2">
 <label className={`text-sm font-medium text-gray-700 block mb-1.5 ${isRTL ? 'text-end' : ''}`}>{labels.allowedDomains}</label>
 <input type="text" value={allowedDomains} onChange={(e) => setAllowedDomains(e.target.value)} placeholder={t.placeholders.yourdomainOrgPartnerOrg} className={`w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isRTL ? 'text-end' : ''}`} />
 <p className={`text-xs text-gray-400 mt-1 ${isRTL ? 'text-end' : ''}`}>
 {t.emailNotifications.commaseparatedListOfAllowedRecipientDomains}
 </p>
 </div>
 </div>
 </div>
 )}

 {/* Action Buttons */}
 <div className={`flex items-center gap-3`}>
 <button
 onClick={handleSave}
 disabled={saveMutation.isPending}
 className={`px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 transition-colors`}
 >
 <Save className="w-4 h-4" />{labels.save}
 </button>
 {providerType !== 'disabled' && (
 <button
 onClick={() => testMutation.mutate()}
 disabled={testMutation.isPending}
 className={`px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 transition-colors`}
 >
 {testMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
 {labels.testConnection}
 </button>
 )}
 </div>
 </div>
 );
}

// ============================================================================
// TAB 2: NOTIFICATION EVENTS
// ============================================================================

function NotificationEventsTab() {
  const { t } = useTranslation();
  const { language, isRTL} = useLanguage();
 const eventsQuery = trpc.settings.notificationEvents.list.useQuery();
 const updateMutation = trpc.settings.notificationEvents.update.useMutation({
 onSuccess: () => { toast.success(t.emailNotifications.eventSettingUpdated); eventsQuery.refetch(); },
 onError: (e: any) => toast.error(e.message),
 });

 const [editingId, setEditingId] = useState<number | null>(null);
 const [editRecipientsMode, setEditRecipientsMode] = useState('role');
 const [editExplicitEmails, setEditExplicitEmails] = useState('');

 const events = eventsQuery.data || [];

 // Group events by category
 const grouped = useMemo(() => {
 const map = new Map<string, typeof events>();
 events.forEach(evt => {
 const cat = evt.category;
 if (!map.has(cat)) map.set(cat, []);
 map.get(cat)!.push(evt);
 });
 return Array.from(map.entries());
 }, [events]);

 const toggleEmail = (id: number, current: boolean) => {
 updateMutation.mutate({ id, emailEnabled: !current });
 };

 const toggleInApp = (id: number, current: boolean) => {
 updateMutation.mutate({ id, inAppEnabled: !current });
 };

 const startEdit = (evt: any) => {
 setEditingId(evt.id);
 setEditRecipientsMode(evt.recipientsMode || 'role');
 setEditExplicitEmails(evt.explicitEmails || '');
 };

 const saveRecipients = (id: number) => {
 updateMutation.mutate({
 id,
 recipientsMode: editRecipientsMode as any,
 explicitEmails: editRecipientsMode === 'explicit_emails' || editRecipientsMode === 'mixed' ? editExplicitEmails : null,
 });
 setEditingId(null);
 };

 const labels = {
 title: t.emailNotifications.notificationEvents,
 subtitle: t.emailNotifications.configureWhichEventsTriggerNotificationsAnd,
 email: t.emailNotifications.email,
 inApp: t.emailNotifications.inapp,
 recipients: t.emailNotifications.recipients,
 recipientsMode: t.emailNotifications.recipientRule,
 roleBased: t.emailNotifications.rolebased,
 explicitEmails: t.emailNotifications.explicitEmails,
 workflowAssignees: t.emailNotifications.workflowAssignees,
 mixed: t.emailNotifications.mixedRoleEmail,
 edit: t.emailNotifications.edit,
 save: t.emailNotifications.save,
 cancel: t.emailNotifications.cancel,
 emailPlaceholder: t.emailNotifications.enterEmailsSeparatedByCommas,
 loading: t.emailNotifications.loadingEvents,
 };

 const recipientsModeLabels: Record<string, string> = {
 role: labels.roleBased,
 explicit_emails: labels.explicitEmails,
 workflow_assignees: labels.workflowAssignees,
 mixed: labels.mixed,
 };

 if (eventsQuery.isLoading) {
 return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
 }

 return (
 <div className="space-y-6">
 <div className={isRTL ? 'text-end' : ''}>
 <h3 className="text-lg font-semibold text-gray-900">{labels.title}</h3>
 <p className="text-sm text-gray-500 mt-1">{labels.subtitle}</p>
 </div>

 {grouped.map(([category, categoryEvents]) => (
 <div key={category} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
 {/* Category Header */}
 <div className={`flex items-center gap-2 px-5 py-3 bg-gray-50 border-b border-gray-200`}>
 <span className="text-lg">{CATEGORY_ICONS[category] || '📌'}</span>
 <span className="font-semibold text-gray-800 text-sm">
 {language === 'en' ? CATEGORY_LABELS[category]?.en || category : CATEGORY_LABELS[category]?.ar || category}
 </span>
 <span className="text-xs text-gray-400 ms-2">({categoryEvents.length})</span>
 </div>

 {/* Events Table */}
 <div className="divide-y divide-gray-100">
 {/* Table Header */}
 <div className={`grid grid-cols-12 gap-3 px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50/50 ${isRTL ? 'text-end' : ''}`}>
 <div className="col-span-4">{t.emailNotifications.event}</div>
 <div className="col-span-2 text-center">{labels.email}</div>
 <div className="col-span-2 text-center">{labels.inApp}</div>
 <div className="col-span-3">{labels.recipients}</div>
 <div className="col-span-1"></div>
 </div>

 {categoryEvents.map(evt => (
 <div key={evt.id}>
 <div className={`grid grid-cols-12 gap-3 px-5 py-3.5 items-center hover:bg-gray-50/50 transition-colors ${isRTL ? 'text-end' : ''}`}>
 {/* Event Name & Description */}
 <div className="col-span-4">
 <p className="text-sm font-medium text-gray-900">{evt.name}</p>
 <p className="text-xs text-gray-500 mt-0.5">{evt.description}</p>
 </div>

 {/* Email Toggle */}
 <div className="col-span-2 flex justify-center">
 <button
 onClick={() => toggleEmail(evt.id, evt.emailEnabled)}
 className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${ evt.emailEnabled ? 'bg-blue-600' : 'bg-gray-200' }`}
 >
 <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${ evt.emailEnabled ? ('translate-x-6') : ('translate-x-1') }`} />
 </button>
 </div>

 {/* In-App Toggle */}
 <div className="col-span-2 flex justify-center">
 <button
 onClick={() => toggleInApp(evt.id, evt.inAppEnabled)}
 className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${ evt.inAppEnabled ? 'bg-green-600' : 'bg-gray-200' }`}
 >
 <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${ evt.inAppEnabled ? ('translate-x-6') : ('translate-x-1') }`} />
 </button>
 </div>

 {/* Recipients Mode */}
 <div className="col-span-3">
 <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${ evt.recipientsMode === 'role' ? 'bg-purple-50 text-purple-700' : evt.recipientsMode === 'explicit_emails' ? 'bg-blue-50 text-blue-700' : evt.recipientsMode === 'workflow_assignees' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700' }`}>
 <Users className="w-3 h-3" />
 {recipientsModeLabels[evt.recipientsMode] || evt.recipientsMode}
 </span>
 </div>

 {/* Edit Button */}
 <div className="col-span-1 flex justify-end">
 <button
 onClick={() => editingId === evt.id ? setEditingId(null) : startEdit(evt)}
 className="text-gray-400 hover:text-blue-600 text-xs font-medium"
 >
 {editingId === evt.id ? labels.cancel : labels.edit}
 </button>
 </div>
 </div>

 {/* Expanded Edit Row */}
 {editingId === evt.id && (
 <div className={`px-5 py-4 bg-blue-50/30 border-t border-blue-100 ${isRTL ? 'text-end' : ''}`}>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
 <div>
 <label className={`text-xs font-medium text-gray-600 block mb-1.5 ${isRTL ? 'text-end' : ''}`}>{labels.recipientsMode}</label>
 <select
 value={editRecipientsMode}
 onChange={(e) => setEditRecipientsMode(e.target.value)}
 className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isRTL ? 'text-end' : ''}`}
 >
 <option value="role">{labels.roleBased}</option>
 <option value="explicit_emails">{labels.explicitEmails}</option>
 <option value="workflow_assignees">{labels.workflowAssignees}</option>
 <option value="mixed">{labels.mixed}</option>
 </select>
 </div>
 {(editRecipientsMode === 'explicit_emails' || editRecipientsMode === 'mixed') && (
 <div>
 <label className={`text-xs font-medium text-gray-600 block mb-1.5 ${isRTL ? 'text-end' : ''}`}>{labels.explicitEmails}</label>
 <input
 type="text"
 value={editExplicitEmails}
 onChange={(e) => setEditExplicitEmails(e.target.value)}
 placeholder={labels.emailPlaceholder}
 className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isRTL ? 'text-end' : ''}`}
 />
 </div>
 )}
 </div>
 <div className={`flex gap-2 mt-3`}>
 <button onClick={() => saveRecipients(evt.id)} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">{labels.save}</button>
 <button onClick={() => setEditingId(null)} className="px-4 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50">{labels.cancel}</button>
 </div>
 </div>
 )}
 </div>
 ))}
 </div>
 </div>
 ))}
 </div>
 );
}

// ============================================================================
// TAB 3: EMAIL TEMPLATES (Rich-text editor with merge tags)
// ============================================================================

function EmailTemplatesTab() {
  const { t } = useTranslation();
  const { language, isRTL} = useLanguage();
 const utils = trpc.useUtils();
 const templatesQuery = trpc.settings.emailTemplates.list.useQuery();
 const mergeTagsQuery = trpc.settings.emailTemplates.getMergeTags.useQuery();
 const createMutation = trpc.settings.emailTemplates.create.useMutation({
 onSuccess: () => { toast.success(t.emailNotifications.templateCreated); utils.settings.emailTemplates.list.invalidate(); setEditing(null); },
 onError: (e: any) => toast.error(e.message),
 });
 const updateMutation = trpc.settings.emailTemplates.update.useMutation({
 onSuccess: () => { toast.success(t.emailNotifications.templateUpdated); utils.settings.emailTemplates.list.invalidate(); setEditing(null); },
 onError: (e: any) => toast.error(e.message),
 });
 const deleteMutation = trpc.settings.emailTemplates.delete.useMutation({
 onSuccess: () => { toast.success(t.emailNotifications.templateDeleted); utils.settings.emailTemplates.list.invalidate(); },
 onError: (e: any) => toast.error(e.message),
 });
 const previewMutation = trpc.settings.emailTemplates.preview.useMutation();

 const [editing, setEditing] = useState<'new' | number | null>(null);
 const [formData, setFormData] = useState({
 templateKey: '', name: '', nameAr: '', subject: '', subjectAr: '', bodyHtml: '', bodyHtmlAr: '', isActive: true,
 });
 const [showPreview, setShowPreview] = useState(false);
 const [previewHtml, setPreviewHtml] = useState('');
 const [showMergeTags, setShowMergeTags] = useState(false);
 const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

 const templates = templatesQuery.data || [];
 const mergeTags = mergeTagsQuery.data || [];

 const labels = {
 title: t.emailNotifications.emailTemplates1,
 subtitle: t.emailNotifications.createAndManageEmailTemplatesWith,
 newTemplate: t.emailNotifications.newTemplate,
 editTemplate: t.emailNotifications.editTemplate,
 templateKey: t.emailNotifications.templateKey,
 templateKeyHint: t.emailNotifications.uniqueIdentifierEgGrantapprovedTaskreminder,
 name: t.emailNotifications.templateName,
 nameAr: t.emailNotifications.templateNameArabic,
 subject: t.emailNotifications.emailSubject,
 subjectAr: t.emailNotifications.emailSubjectArabic,
 bodyHtml: t.emailNotifications.emailBodyHtml,
 bodyHtmlAr: t.emailNotifications.emailBodyArabicHtml,
 active: t.emailNotifications.active,
 inactive: t.emailNotifications.inactive,
 save: t.emailNotifications.saveTemplate,
 cancel: t.emailNotifications.cancel,
 preview: t.emailNotifications.preview,
 delete: t.emailNotifications.delete,
 confirmDelete: t.emailNotifications.areYouSureThisCannotBe,
 mergeTags: t.emailNotifications.mergeTags,
 mergeTagsHint: t.emailNotifications.clickATagToCopyIt,
 noTemplates: t.emailNotifications.noEmailTemplatesYet,
 noTemplatesHint: t.emailNotifications.createYourFirstTemplateToCustomize,
 insertTag: t.emailNotifications.insertTag,
 copiedTag: t.emailNotifications.tagCopiedToClipboard,
 };

 const startCreate = () => {
 setFormData({ templateKey: '', name: '', nameAr: '', subject: '', subjectAr: '', bodyHtml: '', bodyHtmlAr: '', isActive: true });
 setEditing('new');
 setShowPreview(false);
 };

 const startEdit = (tmpl: any) => {
 setFormData({
 templateKey: tmpl.templateKey || '', name: tmpl.name || '', nameAr: tmpl.nameAr || '',
 subject: tmpl.subject || '', subjectAr: tmpl.subjectAr || '',
 bodyHtml: tmpl.bodyHtml || '', bodyHtmlAr: tmpl.bodyHtmlAr || '',
 isActive: tmpl.isActive ?? true,
 });
 setEditing(tmpl.id);
 setShowPreview(false);
 };

 const handleSave = () => {
 if (!formData.templateKey || !formData.name) {
 toast.error(t.emailNotifications.templateKeyAndNameAreRequired);
 return;
 }
 if (editing === 'new') {
 createMutation.mutate(formData);
 } else if (typeof editing === 'number') {
 updateMutation.mutate({ id: editing, ...formData });
 }
 };

 const handlePreview = () => {
 const html = formData.bodyHtml || '<p>No content</p>';
 previewMutation.mutate({ bodyHtml: html }, {
 onSuccess: (data) => { setPreviewHtml(data.html); setShowPreview(true); },
 });
 };

 const copyTag = (tag: string) => {
 navigator.clipboard.writeText(tag);
 toast.success(labels.copiedTag);
 };

 const handleDelete = (id: number) => {
 if (deleteConfirm === id) {
 deleteMutation.mutate({ id });
 setDeleteConfirm(null);
 } else {
 setDeleteConfirm(id);
 setTimeout(() => setDeleteConfirm(null), 5000);
 }
 };

 // Editor form
 if (editing !== null) {
 return (
 <div className="space-y-6">
 <div className={`flex items-center justify-between`}>
 <h3 className="text-lg font-semibold text-gray-900">
 {editing === 'new' ? labels.newTemplate : labels.editTemplate}
 </h3>
 <button onClick={() => setEditing(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Merge Tags Panel */}
 <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
 <button onClick={() => setShowMergeTags(!showMergeTags)} className={`flex items-center gap-2 w-full text-sm font-medium text-blue-700`}>
 <Tag className="w-4 h-4" />
 {labels.mergeTags}
 {showMergeTags ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
 </button>
 {showMergeTags && (
 <div className="mt-3 space-y-2">
 <p className="text-xs text-blue-600">{labels.mergeTagsHint}</p>
 <div className="flex flex-wrap gap-2 mt-2">
 {mergeTags.map((mt: any) => (
 <button
 key={mt.tag}
 onClick={() => copyTag(mt.tag)}
 className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-mono text-blue-800 hover:bg-blue-100 transition-colors`}
 title={mt.description}
 >
 <Copy className="w-3 h-3" />
 {mt.tag}
 </button>
 ))}
 </div>
 </div>
 )}
 </div>

 {/* Form Fields */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{labels.templateKey}</label>
 <input
 type="text" value={formData.templateKey}
 onChange={e => setFormData(p => ({ ...p, templateKey: e.target.value }))}
 placeholder={t.placeholders.eGGrant_approved}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 />
 <p className="text-xs text-gray-400 mt-1">{labels.templateKeyHint}</p>
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{labels.name}</label>
 <input
 type="text" value={formData.name}
 onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{labels.nameAr}</label>
 <input
 type="text" value={formData.nameAr} dir="rtl"
 onChange={e => setFormData(p => ({ ...p, nameAr: e.target.value }))}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 />
 </div>
 <div className={`flex items-center gap-3`}>
 <label className="text-sm font-medium text-gray-700">{formData.isActive ? labels.active : labels.inactive}</label>
 <button
 onClick={() => setFormData(p => ({ ...p, isActive: !p.isActive }))}
 className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
 >
 <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isActive ? ('translate-x-6') : ('translate-x-1')}`} />
 </button>
 </div>
 </div>

 {/* Subject Lines */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{labels.subject}</label>
 <input
 type="text" value={formData.subject}
 onChange={e => setFormData(p => ({ ...p, subject: e.target.value }))}
 placeholder={t.placeholders.eGYourGrantGrantnameHasBeenApproved}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{labels.subjectAr}</label>
 <input
 type="text" value={formData.subjectAr} dir="rtl"
 onChange={e => setFormData(p => ({ ...p, subjectAr: e.target.value }))}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 />
 </div>
 </div>

 {/* Body HTML Editor */}
 <div>
 <div className={`flex items-center justify-between mb-1`}>
 <label className="text-sm font-medium text-gray-700">{labels.bodyHtml}</label>
 <button onClick={handlePreview} className={`flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800`}>
 <Eye className="w-3.5 h-3.5" />{labels.preview}
 </button>
 </div>
 <textarea
 value={formData.bodyHtml}
 onChange={e => setFormData(p => ({ ...p, bodyHtml: e.target.value }))}
 rows={12}
 placeholder='<div style="font-family: Arial, sans-serif;">\n <h2>Hello {{recipientName}},</h2>\n <p>Your grant {{grantName}} has been approved.</p>\n</div>'
 className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
 />
 </div>

 {/* Body HTML Arabic */}
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">{labels.bodyHtmlAr}</label>
 <textarea
 value={formData.bodyHtmlAr} dir="rtl"
 onChange={e => setFormData(p => ({ ...p, bodyHtmlAr: e.target.value }))}
 rows={8}
 className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
 />
 </div>

 {/* Preview Panel */}
 {showPreview && previewHtml && (
 <div className="border border-gray-200 rounded-xl overflow-hidden">
 <div className={`flex items-center justify-between px-4 py-2 bg-gray-50 border-b`}>
 <span className="text-sm font-medium text-gray-700">{labels.preview}</span>
 <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
 </div>
 <div className="p-6 bg-white">
 <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
 </div>
 </div>
 )}

 {/* Actions */}
 <div className={`flex gap-3`}>
 <button
 onClick={handleSave}
 disabled={createMutation.isPending || updateMutation.isPending}
 className={`flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50`}
 >
 <Save className="w-4 h-4" />{labels.save}
 </button>
 <button onClick={() => setEditing(null)} className="px-6 py-2.5 border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50">
 {labels.cancel}
 </button>
 </div>
 </div>
 );
 }

 // Template List
 return (
 <div className="space-y-6">
 <div className={`flex items-center justify-between`}>
 <div>
 <h3 className={`text-lg font-semibold text-gray-900 ${isRTL ? 'text-end' : ''}`}>{labels.title}</h3>
 <p className={`text-sm text-gray-500 ${isRTL ? 'text-end' : ''}`}>{labels.subtitle}</p>
 </div>
 <button
 onClick={startCreate}
 className={`flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700`}
 >
 <Plus className="w-4 h-4" />{labels.newTemplate}
 </button>
 </div>

 {templates.length === 0 ? (
 <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-300">
 <FileCode className="w-12 h-12 text-gray-300 mx-auto mb-3" />
 <p className="text-gray-500 font-medium">{labels.noTemplates}</p>
 <p className="text-sm text-gray-400 mt-1">{labels.noTemplatesHint}</p>
 <button onClick={startCreate} className={`mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700`}>
 <Plus className="w-4 h-4" />{labels.newTemplate}
 </button>
 </div>
 ) : (
 <div className="space-y-3">
 {templates.map((tmpl: any) => (
 <div key={tmpl.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-200 transition-colors">
 <div className={`flex items-start justify-between`}>
 <div className={`flex-1 ${isRTL ? 'text-end' : ''}`}>
 <div className={`flex items-center gap-2`}>
 <h4 className="font-medium text-gray-900">{language === 'ar' && tmpl.nameAr ? tmpl.nameAr : tmpl.name}</h4>
 <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tmpl.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
 {tmpl.isActive ? labels.active : labels.inactive}
 </span>
 </div>
 <p className="text-xs text-gray-400 font-mono mt-1">{tmpl.templateKey}</p>
 {tmpl.subject && <p className="text-sm text-gray-600 mt-1">{language === 'ar' && tmpl.subjectAr ? tmpl.subjectAr : tmpl.subject}</p>}
 </div>
 <div className={`flex items-center gap-1`}>
 <button onClick={() => startEdit(tmpl)} className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50" title={labels.editTemplate}>
 <Pencil className="w-4 h-4" />
 </button>
 <button
 onClick={() => handleDelete(tmpl.id)}
 className={`p-2 rounded-lg ${deleteConfirm === tmpl.id ? 'text-red-600 bg-red-50' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
 title={deleteConfirm === tmpl.id ? labels.confirmDelete : labels.delete}
 >
 {deleteConfirm === tmpl.id ? <Check className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
 </button>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 );
}

// ============================================================================
// TAB 4: NOTIFICATION OUTBOX (Delivery Log)
// ============================================================================

function OutboxTab() {
  const { t } = useTranslation();
  const { language, isRTL} = useLanguage();
 const outboxQuery = trpc.settings.notificationOutbox.list.useQuery();
 const statsQuery = trpc.settings.notificationOutbox.stats.useQuery();
 const retryMutation = trpc.settings.notificationOutbox.retry.useMutation({
 onSuccess: () => { toast.success(t.emailNotifications.notificationQueuedForRetry); outboxQuery.refetch(); statsQuery.refetch(); },
 onError: (e: any) => toast.error(e.message),
 });

 const entries = outboxQuery.data || [];
 const stats = statsQuery.data || { queued: 0, sending: 0, sent: 0, failed: 0, dead_letter: 0 };

 const labels = {
 title: t.emailNotifications.deliveryLog,
 subtitle: t.emailNotifications.monitorNotificationDeliveryStatusAndRetry,
 queued: t.emailNotifications.queued,
 sending: t.emailNotifications.sending,
 sent: t.emailNotifications.sent,
 failed: t.emailNotifications.failed,
 deadLetter: t.emailNotifications.deadLetter,
 retry: t.emailNotifications.retry,
 noEntries: t.emailNotifications.noNotificationEntriesYet,
 noEntriesDesc: t.emailNotifications.notificationsWillAppearHereOnceThe,
 event: t.emailNotifications.event,
 channel: t.emailNotifications.channel,
 recipientsLabel: t.emailNotifications.recipients,
 status: t.emailNotifications.status,
 attempts: t.emailNotifications.attempts,
 created: t.emailNotifications.created,
 actions: t.emailNotifications.actions,
 };

 const statusColors: Record<string, string> = {
 queued: 'bg-blue-50 text-blue-700',
 sending: 'bg-yellow-50 text-yellow-700',
 sent: 'bg-green-50 text-green-700',
 failed: 'bg-red-50 text-red-700',
 dead_letter: 'bg-gray-100 text-gray-700',
 };

 const statusLabels: Record<string, string> = {
 queued: labels.queued, sending: labels.sending, sent: labels.sent, failed: labels.failed, dead_letter: labels.deadLetter,
 };

 return (
 <div className="space-y-6">
 <div className={isRTL ? 'text-end' : ''}>
 <h3 className="text-lg font-semibold text-gray-900">{labels.title}</h3>
 <p className="text-sm text-gray-500 mt-1">{labels.subtitle}</p>
 </div>

 {/* Stats Cards */}
 <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
 {[
 { key: 'queued', label: labels.queued, color: 'blue', icon: <Clock className="w-4 h-4" /> },
 { key: 'sending', label: labels.sending, color: 'yellow', icon: <Send className="w-4 h-4" /> },
 { key: 'sent', label: labels.sent, color: 'green', icon: <CheckCircle2 className="w-4 h-4" /> },
 { key: 'failed', label: labels.failed, color: 'red', icon: <XCircle className="w-4 h-4" /> },
 { key: 'dead_letter', label: labels.deadLetter, color: 'gray', icon: <AlertTriangle className="w-4 h-4" /> },
 ].map(s => (
 <div key={s.key} className={`bg-white rounded-xl border border-gray-200 p-4 ${isRTL ? 'text-end' : ''}`}>
 <div className={`flex items-center gap-2 mb-2`}>
 <div className={`text-${s.color}-500`}>{s.icon}</div>
 <span className="text-xs font-medium text-gray-500 uppercase">{s.label}</span>
 </div>
 <p className="text-2xl font-bold text-gray-900">{(stats as any)[s.key] || 0}</p>
 </div>
 ))}
 </div>

 {/* Outbox Table */}
 {entries.length === 0 ? (
 <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
 <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
 <h4 className="text-lg font-semibold text-gray-700">{labels.noEntries}</h4>
 <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">{labels.noEntriesDesc}</p>
 </div>
 ) : (
 <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className={`bg-gray-50 border-b border-gray-200 text-start`}>
 <th className="px-4 py-3 font-medium text-gray-600 text-xs uppercase">{labels.event}</th>
 <th className="px-4 py-3 font-medium text-gray-600 text-xs uppercase">{labels.channel}</th>
 <th className="px-4 py-3 font-medium text-gray-600 text-xs uppercase">{labels.recipientsLabel}</th>
 <th className="px-4 py-3 font-medium text-gray-600 text-xs uppercase">{labels.status}</th>
 <th className="px-4 py-3 font-medium text-gray-600 text-xs uppercase">{labels.attempts}</th>
 <th className="px-4 py-3 font-medium text-gray-600 text-xs uppercase">{labels.created}</th>
 <th className="px-4 py-3 font-medium text-gray-600 text-xs uppercase">{labels.actions}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100">
 {entries.map((entry: any) => (
 <tr key={entry.id} className="hover:bg-gray-50/50">
 <td className="px-4 py-3 font-medium text-gray-900">{entry.eventKey}</td>
 <td className="px-4 py-3">
 <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ entry.channel === 'email' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700' }`}>
 {entry.channel === 'email' ? <Mail className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
 {entry.channel}
 </span>
 </td>
 <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{entry.recipients || '-'}</td>
 <td className="px-4 py-3">
 <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[entry.status] || 'bg-gray-100 text-gray-700'}`}>
 {statusLabels[entry.status] || entry.status}
 </span>
 </td>
 <td className="px-4 py-3 text-gray-600">{entry.attemptCount}</td>
 <td className="px-4 py-3 text-gray-500 text-xs">{new Date(entry.createdAt).toLocaleString()}</td>
 <td className="px-4 py-3">
 {(entry.status === 'failed' || entry.status === 'dead_letter') && (
 <button
 onClick={() => retryMutation.mutate({ id: entry.id })}
 disabled={retryMutation.isPending}
 className={`flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium`}
 >
 <RotateCcw className="w-3 h-3" />{labels.retry}
 </button>
 )}
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

export default EmailNotifications;
