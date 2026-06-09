import { useState, useEffect } from 'react';
import { Layout, Save, Eye, Image } from 'lucide-react';
import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { isUserAdmin } from '@/lib/adminCheck';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

export function LandingSettings() {
 const { t } = useTranslation();
 const [, navigate] = useLocation();
 const { language, isRTL } = useLanguage();
 const { user } = useAuth();
 const [heroTitle, setHeroTitle] = useState('');
 const [heroTitleAr, setHeroTitleAr] = useState('');
 const [heroSubtitle, setHeroSubtitle] = useState('');
 const [heroSubtitleAr, setHeroSubtitleAr] = useState('');
 const [showQuickStats, setShowQuickStats] = useState(true);
 const [showAnnouncements, setShowAnnouncements] = useState(true);
 const [ctaText, setCtaText] = useState('');
 const [ctaTextAr, setCtaTextAr] = useState('');
 const [ctaUrl, setCtaUrl] = useState('');

 if (!isUserAdmin(user)) {
 return <div className="flex items-center justify-center h-64"><div className="text-center p-8 bg-white rounded-2xl shadow border"><h2 className="text-xl font-bold text-gray-900">Access Denied</h2></div></div>;
 }

 const landingQuery = trpc.settings.landing.get.useQuery();
 const updateMutation = trpc.settings.landing.update.useMutation({
 onSuccess: () => { toast.success(t.settingsModule.landingPageSettingsSaved); landingQuery.refetch(); },
 onError: (e: any) => toast.error(e.message),
 });

 useEffect(() => {
 if (landingQuery.data) {
 const d = landingQuery.data;
 setHeroTitle(d.heroTitle || '');
 setHeroTitleAr(d.heroTitleAr || '');
 setHeroSubtitle(d.heroSubtitle || '');
 setHeroSubtitleAr(d.heroSubtitleAr || '');
 setShowQuickStats(d.showQuickStats ?? true);
 setShowAnnouncements(d.showAnnouncements ?? true);
 setCtaText(d.ctaText || '');
 setCtaTextAr(d.ctaTextAr || '');
 setCtaUrl(d.ctaUrl || '');
 }
 }, [landingQuery.data]);

 const handleSave = () => {
 updateMutation.mutate({ heroTitle, heroTitleAr, heroSubtitle, heroSubtitleAr, showQuickStats, showAnnouncements, welcomeMessage: ctaText, welcomeMessageAr: ctaTextAr });
 };

 const labels = {
 title: t.settingsModule.landingPageSettings,
 subtitle: t.settingsModule.customizeThePublicLandingPageContent,
 back: t.settingsModule.backToSettings,
 save: t.settingsModule.saveChanges,
 heroSection: t.settingsModule.heroSection,
 heroTitle: t.settingsModule.heroTitle,
 heroTitleAr: t.settingsModule.heroTitleArabic,
 heroSubtitle: t.settingsModule.heroSubtitle,
 heroSubtitleAr: t.settingsModule.heroSubtitleArabic,
 ctaSection: t.settingsModule.callToAction,
 ctaText: t.settingsModule.buttonText,
 ctaTextAr: t.settingsModule.buttonTextArabic,
 ctaUrl: t.settingsModule.buttonUrl,
 displayOptions: t.settingsModule.displayOptions,
 showStats: t.settingsModule.showQuickStatistics,
 showAnnouncements: t.settingsModule.showAnnouncements,
 preview: t.settingsModule.previewLandingPage,
 };

 return (
 <div className="space-y-6">
 <div className={`flex items-center gap-3`}>
 <BackButton onClick={() => navigate('/organization/settings')} label={labels.back} />
 </div>
 <div className={`flex items-center justify-between`}>
 <div className={`flex items-center gap-3`}>
 <div className="p-3 bg-indigo-50 rounded-lg"><Layout className="w-6 h-6 text-indigo-600" /></div>
 <div>
 <h1 className={`text-2xl font-bold text-gray-900`}>{labels.title}</h1>
 <p className="text-sm text-gray-500">{labels.subtitle}</p>
 </div>
 </div>
 <div className="flex items-center gap-3">
 <button onClick={() => window.open('/', '_blank')} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2">
 <Eye className="w-4 h-4" />{labels.preview}
 </button>
 <button onClick={handleSave} disabled={updateMutation.isPending} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50">
 <Save className="w-4 h-4" />{labels.save}
 </button>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Hero Section */}
 <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
 <h2 className="font-semibold text-gray-900">{labels.heroSection}</h2>
 <div>
 <label className="text-sm font-medium text-gray-700 block mb-1">{labels.heroTitle}</label>
 <input type="text" value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
 </div>
 <div>
 <label className="text-sm font-medium text-gray-700 block mb-1">{labels.heroTitleAr}</label>
 <input type="text" value={heroTitleAr} onChange={(e) => setHeroTitleAr(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" dir="rtl" />
 </div>
 <div>
 <label className="text-sm font-medium text-gray-700 block mb-1">{labels.heroSubtitle}</label>
 <textarea value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" rows={3} />
 </div>
 <div>
 <label className="text-sm font-medium text-gray-700 block mb-1">{labels.heroSubtitleAr}</label>
 <textarea value={heroSubtitleAr} onChange={(e) => setHeroSubtitleAr(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" rows={3} dir="rtl" />
 </div>
 </div>

 {/* CTA + Display Options */}
 <div className="space-y-6">
 <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
 <h2 className="font-semibold text-gray-900">{labels.ctaSection}</h2>
 <div>
 <label className="text-sm font-medium text-gray-700 block mb-1">{labels.ctaText}</label>
 <input type="text" value={ctaText} onChange={(e) => setCtaText(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
 </div>
 <div>
 <label className="text-sm font-medium text-gray-700 block mb-1">{labels.ctaTextAr}</label>
 <input type="text" value={ctaTextAr} onChange={(e) => setCtaTextAr(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" dir="rtl" />
 </div>
 <div>
 <label className="text-sm font-medium text-gray-700 block mb-1">{labels.ctaUrl}</label>
 <input type="text" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
 </div>
 </div>

 <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
 <h2 className="font-semibold text-gray-900">{labels.displayOptions}</h2>
 <div className={`flex items-center justify-between`}>
 <span className="text-sm text-gray-700">{labels.showStats}</span>
 <button onClick={() => setShowQuickStats(!showQuickStats)}
 className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showQuickStats ? 'bg-indigo-500' : 'bg-gray-300'}`}>
 <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showQuickStats ? 'translate-x-6' : 'translate-x-1'}`} />
 </button>
 </div>
 <div className={`flex items-center justify-between`}>
 <span className="text-sm text-gray-700">{labels.showAnnouncements}</span>
 <button onClick={() => setShowAnnouncements(!showAnnouncements)}
 className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showAnnouncements ? 'bg-indigo-500' : 'bg-gray-300'}`}>
 <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showAnnouncements ? 'translate-x-6' : 'translate-x-1'}`} />
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}

export default LandingSettings;
