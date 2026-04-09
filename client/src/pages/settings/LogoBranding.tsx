import { useState, useEffect, useRef } from 'react';
import { Palette, Upload, Save, X, Image } from 'lucide-react';
import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { isUserAdmin } from '@/lib/adminCheck';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

function fileToBase64(file: File): Promise<string> {
 return new Promise((resolve, reject) => {
 const reader = new FileReader();
 reader.onload = () => {
 const result = reader.result as string;
 // Remove data URL prefix (e.g., "data:image/png;base64,")
 const base64 = result.split(',')[1];
 resolve(base64);
 };
 reader.onerror = reject;
 reader.readAsDataURL(file);
 });
}

export function LogoBranding() {
 const { t } = useTranslation();
 const [, navigate] = useLocation();
 const { language, isRTL } = useLanguage();
 const { user } = useAuth();
 const [systemName, setSystemName] = useState('');
 const [systemNameAr, setSystemNameAr] = useState('');
 const [primaryColor, setPrimaryColor] = useState('#2563EB');
 const [secondaryColor, setSecondaryColor] = useState('#7C3AED');
 const [accentColor, setAccentColor] = useState('#F59E0B');
 const [footerText, setFooterText] = useState('');
 const [footerTextAr, setFooterTextAr] = useState('');
 const [logoUrl, setLogoUrl] = useState<string | null>(null);
 const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
 const [uploadingLogo, setUploadingLogo] = useState(false);
 const [uploadingFavicon, setUploadingFavicon] = useState(false);
 const logoInputRef = useRef<HTMLInputElement>(null);
 const faviconInputRef = useRef<HTMLInputElement>(null);

 if (!isUserAdmin(user)) {
 return <div className="flex items-center justify-center h-64"><div className="text-center p-8 bg-white rounded-2xl shadow border"><h2 className="text-xl font-bold text-gray-900">Access Denied</h2></div></div>;
 }

 const brandingQuery = trpc.settings.branding.get.useQuery();
 const updateMutation = trpc.settings.branding.update.useMutation({
 onSuccess: () => { toast.success(t.settingsModule.brandingUpdated); brandingQuery.refetch(); },
 onError: (e: any) => toast.error(e.message),
 });
 const uploadMutation = trpc.settings.branding.uploadFile.useMutation({
 onSuccess: (data: any, variables: any) => {
 if (variables.fileType === 'logo') {
 setLogoUrl(data.url);
 toast.success(t.settingsModule.logoUploadedSuccessfully);
 } else {
 setFaviconUrl(data.url);
 toast.success(t.settingsModule.faviconUploadedSuccessfully);
 }
 brandingQuery.refetch();
 },
 onError: (e: any) => toast.error(e.message),
 });

 useEffect(() => {
 if (brandingQuery.data) {
 const b = brandingQuery.data;
 setSystemName(b.systemName || '');
 setSystemNameAr(b.systemNameAr || '');
 setPrimaryColor(b.primaryColor || '#2563EB');
 setSecondaryColor(b.secondaryColor || '#7C3AED');
 setAccentColor(b.accentColor || '#F59E0B');
 setFooterText(b.footerText || '');
 setFooterTextAr(b.footerTextAr || '');
 setLogoUrl(b.logoUrl || null);
 setFaviconUrl(b.faviconUrl || null);
 }
 }, [brandingQuery.data]);

 const handleFileUpload = async (file: File, fileType: 'logo' | 'favicon') => {
 if (file.size > 5 * 1024 * 1024) {
 toast.error(t.settingsModule.fileSizeMustBeUnder5mb);
 return;
 }
 const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp', 'image/x-icon', 'image/ico'];
 if (!validTypes.includes(file.type)) {
 toast.error(t.settingsModule.invalidFileTypeUsePngJpg);
 return;
 }
 if (fileType === 'logo') setUploadingLogo(true);
 else setUploadingFavicon(true);
 try {
 const base64 = await fileToBase64(file);
 await uploadMutation.mutateAsync({
 fileBase64: base64,
 fileName: file.name,
 contentType: file.type,
 fileType,
 });
 } catch (err) {
 // error handled by onError
 } finally {
 if (fileType === 'logo') setUploadingLogo(false);
 else setUploadingFavicon(false);
 }
 };

 const handleSave = () => {
 updateMutation.mutate({ systemName, systemNameAr, primaryColor, secondaryColor, accentColor, footerText, footerTextAr });
 };

 const localT = {
 title: t.settingsModule.logoBranding,
 subtitle: t.settingsModule.customizeSystemBrandingAndAppearance,
 back: t.settingsModule.backToSettings,
 systemName: t.settingsModule.systemName,
 systemNameAr: t.settingsModule.systemNameArabic,
 primaryColor: t.settingsModule.primaryColor,
 secondaryColor: t.settingsModule.secondaryColor,
 accentColor: t.settingsModule.accentColor,
 footerText: t.settingsModule.footerText,
 footerTextAr: t.settingsModule.footerTextArabic,
 save: t.settingsModule.saveChanges,
 preview: t.settingsModule.preview,
 colorPalette: t.settingsModule.colorPalette,
 systemIdentity: t.settingsModule.systemIdentity,
 footerConfig: t.settingsModule.footerConfiguration,
 logoUpload: t.settingsModule.organizationLogo,
 logoDesc: t.settingsModule.uploadYourOrganizationLogoRecommended200x200px,
 uploadLogo: t.settingsModule.uploadLogo,
 faviconUpload: t.settingsModule.favicon,
 faviconDesc: t.settingsModule.uploadAFaviconForBrowserTabs,
 uploadFavicon: t.settingsModule.uploadFavicon,
 uploading: t.settingsModule.uploading,
 removeLogo: t.settingsModule.remove,
 };

 return (
 <div className="space-y-6">
 <div className={`flex items-center gap-3`}>
 <BackButton onClick={() => navigate('/organization/settings')} label={t.back} />
 </div>
 <div className={`flex items-center justify-between`}>
 <div className={`flex items-center gap-3`}>
 <div className="p-3 bg-pink-50 rounded-lg"><Palette className="w-6 h-6 text-pink-600" /></div>
 <div>
 <h1 className={`text-2xl font-bold text-gray-900 ${isRTL ? 'text-end' : ''}`}>{t.title}</h1>
 <p className={`text-sm text-gray-500 ${isRTL ? 'text-end' : ''}`}>{t.subtitle}</p>
 </div>
 </div>
 <button onClick={handleSave} disabled={updateMutation.isPending} className="px-4 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700 flex items-center gap-2 disabled:opacity-50">
 <Save className="w-4 h-4" />{t.save}
 </button>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Logo Upload */}
 <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
 <h2 className="font-semibold text-gray-900">{t.logoUpload}</h2>
 <p className="text-sm text-gray-500">{t.logoDesc}</p>
 <input
 ref={logoInputRef}
 type="file"
 accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
 className="hidden"
 onChange={(e) => {
 const file = e.target.files?.[0];
 if (file) handleFileUpload(file, 'logo');
 e.target.value = '';
 }}
 />
 <div className={`flex items-center gap-4`}>
 <div className="w-24 h-24 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative">
 {logoUrl ? (
 <>
 <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
 <button
 onClick={() => { setLogoUrl(null); updateMutation.mutate({ logoUrl: null } as any); }}
 className="absolute -top-1 -end-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
 >
 <X className="w-3 h-3" />
 </button>
 </>
 ) : (
 <Image className="w-8 h-8 text-gray-400" />
 )}
 </div>
 <button
 onClick={() => logoInputRef.current?.click()}
 disabled={uploadingLogo}
 className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
 >
 {uploadingLogo ? (
 <><div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />{t.uploading}</>
 ) : (
 <><Upload className="w-4 h-4" />{t.uploadLogo}</>
 )}
 </button>
 </div>
 </div>

 {/* Favicon Upload */}
 <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
 <h2 className="font-semibold text-gray-900">{t.faviconUpload}</h2>
 <p className="text-sm text-gray-500">{t.faviconDesc}</p>
 <input
 ref={faviconInputRef}
 type="file"
 accept="image/png,image/x-icon,image/ico,image/svg+xml"
 className="hidden"
 onChange={(e) => {
 const file = e.target.files?.[0];
 if (file) handleFileUpload(file, 'favicon');
 e.target.value = '';
 }}
 />
 <div className={`flex items-center gap-4`}>
 <div className="w-16 h-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative">
 {faviconUrl ? (
 <>
 <img src={faviconUrl} alt="Favicon" className="w-full h-full object-contain" />
 <button
 onClick={() => { setFaviconUrl(null); updateMutation.mutate({ faviconUrl: null } as any); }}
 className="absolute -top-1 -end-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
 >
 <X className="w-3 h-3" />
 </button>
 </>
 ) : (
 <Image className="w-6 h-6 text-gray-400" />
 )}
 </div>
 <button
 onClick={() => faviconInputRef.current?.click()}
 disabled={uploadingFavicon}
 className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
 >
 {uploadingFavicon ? (
 <><div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />{t.uploading}</>
 ) : (
 <><Upload className="w-4 h-4" />{t.uploadFavicon}</>
 )}
 </button>
 </div>
 </div>

 {/* System Identity */}
 <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
 <h2 className="font-semibold text-gray-900">{t.systemIdentity}</h2>
 <div>
 <label className="text-sm font-medium text-gray-700 block mb-1">{t.systemName}</label>
 <input type="text" value={systemName} onChange={(e) => setSystemName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
 </div>
 <div>
 <label className="text-sm font-medium text-gray-700 block mb-1">{t.systemNameAr}</label>
 <input type="text" value={systemNameAr} onChange={(e) => setSystemNameAr(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" dir="rtl" />
 </div>
 </div>

 {/* Color Palette */}
 <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
 <h2 className="font-semibold text-gray-900">{t.colorPalette}</h2>
 <div className="grid grid-cols-3 gap-4">
 <div>
 <label className="text-sm font-medium text-gray-700 block mb-1">{t.primaryColor}</label>
 <div className="flex items-center gap-2">
 <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded border cursor-pointer" />
 <input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs font-mono" />
 </div>
 </div>
 <div>
 <label className="text-sm font-medium text-gray-700 block mb-1">{t.secondaryColor}</label>
 <div className="flex items-center gap-2">
 <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="w-10 h-10 rounded border cursor-pointer" />
 <input type="text" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs font-mono" />
 </div>
 </div>
 <div>
 <label className="text-sm font-medium text-gray-700 block mb-1">{t.accentColor}</label>
 <div className="flex items-center gap-2">
 <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-10 h-10 rounded border cursor-pointer" />
 <input type="text" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs font-mono" />
 </div>
 </div>
 </div>
 <div className="mt-4 p-4 rounded-lg border border-gray-100">
 <p className="text-xs font-medium text-gray-500 mb-2">{t.preview}</p>
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 rounded-lg" style={{ backgroundColor: primaryColor }} />
 <div className="w-12 h-12 rounded-lg" style={{ backgroundColor: secondaryColor }} />
 <div className="w-12 h-12 rounded-lg" style={{ backgroundColor: accentColor }} />
 </div>
 </div>
 </div>

 {/* Footer Config */}
 <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 lg:col-span-2">
 <h2 className="font-semibold text-gray-900">{t.footerConfig}</h2>
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
 <div>
 <label className="text-sm font-medium text-gray-700 block mb-1">{t.footerText}</label>
 <textarea value={footerText} onChange={(e) => setFooterText(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" rows={3} />
 </div>
 <div>
 <label className="text-sm font-medium text-gray-700 block mb-1">{t.footerTextAr}</label>
 <textarea value={footerTextAr} onChange={(e) => setFooterTextAr(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" rows={3} dir="rtl" />
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}

export default LogoBranding;
