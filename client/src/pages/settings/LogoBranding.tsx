import { useState, useEffect, useRef } from 'react';
import { Palette, Upload, Save, X, Image, Monitor } from 'lucide-react';
import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { isUserAdmin } from '@/lib/adminCheck';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n/TranslationProvider';
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
  const t = useTranslation();
  const [, navigate] = useLocation();
  const { language, isRTL } = useLanguage();
  const { user } = useAuth();
  const [systemName, setSystemName] = useState('');
  const [systemNameAr, setSystemNameAr] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2563EB');
  const [secondaryColor, setSecondaryColor] = useState('#7C3AED');
  const [accentColor, setAccentColor] = useState('#F59E0B');
  const [headerColor, setHeaderColor] = useState('#2563EB');
  const [headerTextColor, setHeaderTextColor] = useState('#FFFFFF');
  const [footerText, setFooterText] = useState('');
  const [footerTextAr, setFooterTextAr] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  if (!isUserAdmin(user)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center p-8 bg-white rounded-2xl shadow border">
          <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
        </div>
      </div>
    );
  }

  const brandingQuery = trpc.settings.branding.get.useQuery();
  const updateMutation = trpc.settings.branding.update.useMutation({
    onSuccess: () => {
      toast.success(t.settingsModule.brandingUpdated);
      brandingQuery.refetch();
    },
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
      const b = brandingQuery.data as any;
      setSystemName(b.systemName || '');
      setSystemNameAr(b.systemNameAr || '');
      setPrimaryColor(b.primaryColor || '#2563EB');
      setSecondaryColor(b.secondaryColor || '#7C3AED');
      setAccentColor(b.accentColor || '#F59E0B');
      setHeaderColor(b.headerColor || b.primaryColor || '#2563EB');
      setHeaderTextColor(b.headerTextColor || '#FFFFFF');
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
    updateMutation.mutate({
      systemName,
      systemNameAr,
      primaryColor,
      secondaryColor,
      accentColor,
      headerColor,
      headerTextColor,
      footerText,
      footerTextAr,
    } as any);
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
        <BackButton onClick={() => navigate('/organization/settings')} label={localT.back} />
      </div>
      <div className={`flex items-center justify-between`}>
        <div className={`flex items-center gap-3`}>
          <div className="p-3 bg-pink-50 rounded-lg">
            <Palette className="w-6 h-6 text-pink-600" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold text-gray-900 ${isRTL ? 'text-end' : ''}`}>{localT.title}</h1>
            <p className={`text-sm text-gray-500 ${isRTL ? 'text-end' : ''}`}>{localT.subtitle}</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="px-4 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700 flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />{localT.save}
        </button>
      </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

  {/* =========================
      ORGANIZATION LOGO
  ========================== */}
  <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5 shadow-sm">

    <div>
      <h2 className="text-lg font-semibold text-gray-900">
        {localT.logoUpload}
      </h2>

      <p className="text-sm text-gray-500 mt-1">
        {localT.logoDesc}
      </p>
    </div>

    {/* Hidden Input */}
    <input
      ref={logoInputRef}
      type="file"
      accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];

        if (file) {
          handleFileUpload(file, "logo");
        }

        e.target.value = "";
      }}
    />

    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">

      {/* Logo Preview */}
      <div className="relative">

        <div className="
          w-28 h-28
          bg-gray-50
          rounded-xl
          border-2 border-dashed border-gray-300
          flex items-center justify-center
          overflow-hidden
        ">

          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Organization Logo"
              className="w-full h-full object-contain p-2"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-400">
              <Image className="w-8 h-8 mb-2" />
              <span className="text-xs">
                No Logo
              </span>
            </div>
          )}
        </div>

        {/* Remove Logo */}
        {logoUrl && (
          <button
            type="button"
            onClick={() => {
              setLogoUrl(null);

              updateMutation.mutate({
                logoUrl: null,
              } as any);
            }}
            className="
              absolute
              -top-2
              -right-2
              w-6
              h-6
              bg-red-500
              hover:bg-red-600
              text-white
              rounded-full
              flex items-center justify-center
              shadow-md
              transition-colors
            "
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Upload Actions */}
      <div className="flex flex-col gap-3">

        <button
          type="button"
          onClick={() => logoInputRef.current?.click()}
          disabled={uploadingLogo}
          className="
            px-4 py-2.5
            border border-gray-300
            rounded-lg
            text-sm font-medium
            hover:bg-gray-50
            flex items-center gap-2
            transition-colors
            disabled:opacity-50
            disabled:cursor-not-allowed
          "
        >

          {uploadingLogo ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />

              <span>
                {localT.uploading}
              </span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />

              <span>
                {localT.uploadLogo}
              </span>
            </>
          )}
        </button>

        <div className="text-xs text-gray-400 space-y-1">
          <p>• PNG, JPG, SVG, WEBP</p>
          <p>• Recommended: 200×200px</p>
          <p>• Maximum size: 5MB</p>
        </div>

      </div>
    </div>
  </div>

  {/* =========================
      FAVICON
  ========================== */}
  <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5 shadow-sm">

    <div>
      <h2 className="text-lg font-semibold text-gray-900">
        {localT.faviconUpload}
      </h2>

      <p className="text-sm text-gray-500 mt-1">
        {localT.faviconDesc}
      </p>
    </div>

    {/* Hidden Input */}
    <input
      ref={faviconInputRef}
      type="file"
      accept="image/png,image/x-icon,image/ico,image/svg+xml"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];

        if (file) {
          handleFileUpload(file, "favicon");
        }

        e.target.value = "";
      }}
    />

    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">

      {/* Preview */}
      <div className="relative">

        <div className="
          w-20 h-20
          bg-gray-50
          rounded-xl
          border-2 border-dashed border-gray-300
          flex items-center justify-center
          overflow-hidden
        ">

          {faviconUrl ? (
            <img
              src={faviconUrl}
              alt="Favicon"
              className="w-full h-full object-contain p-2"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-400">
              <Image className="w-6 h-6 mb-1" />
              <span className="text-[10px]">
                No Icon
              </span>
            </div>
          )}
        </div>

        {/* Remove */}
        {faviconUrl && (
          <button
            type="button"
            onClick={() => {
              setFaviconUrl(null);

              updateMutation.mutate({
                faviconUrl: null,
              } as any);
            }}
            className="
              absolute
              -top-2
              -right-2
              w-6
              h-6
              bg-red-500
              hover:bg-red-600
              text-white
              rounded-full
              flex items-center justify-center
              shadow-md
              transition-colors
            "
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Upload */}
      <div className="flex flex-col gap-3">

        <button
          type="button"
          onClick={() => faviconInputRef.current?.click()}
          disabled={uploadingFavicon}
          className="
            px-4 py-2.5
            border border-gray-300
            rounded-lg
            text-sm font-medium
            hover:bg-gray-50
            flex items-center gap-2
            transition-colors
            disabled:opacity-50
            disabled:cursor-not-allowed
          "
        >

          {uploadingFavicon ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />

              <span>
                {localT.uploading}
              </span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />

              <span>
                {localT.uploadFavicon}
              </span>
            </>
          )}
        </button>

        <div className="text-xs text-gray-400 space-y-1">
          <p>• ICO, PNG, SVG</p>
          <p>• Recommended: 32×32px</p>
          <p>• Browser tab icon</p>
        </div>

      </div>
    </div>
  </div>

</div>
        {/* System Identity */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">{localT.systemIdentity}</h2>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">{localT.systemName}</label>
            <input
              type="text"
              value={systemName}
              onChange={(e) => setSystemName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">{localT.systemNameAr}</label>
            <input
              type="text"
              value={systemNameAr}
              onChange={(e) => setSystemNameAr(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              dir="rtl"
            />
          </div>
        </div>

        {/* Color Palette */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">{localT.colorPalette}</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">{localT.primaryColor}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">{localT.secondaryColor}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">{localT.accentColor}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs font-mono"
                />
              </div>
            </div>
          </div>
          <div className="mt-4 p-4 rounded-lg border border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-2">{localT.preview}</p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg" style={{ backgroundColor: primaryColor }} />
              <div className="w-12 h-12 rounded-lg" style={{ backgroundColor: secondaryColor }} />
              <div className="w-12 h-12 rounded-lg" style={{ backgroundColor: accentColor }} />
            </div>
          </div>
        </div>

        {/* Header Branding — NEW SECTION */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-gray-600" />
            <h2 className="font-semibold text-gray-900">
              {isRTL ? 'ألوان شريط التنقل العلوي' : 'Header Bar Colors'}
            </h2>
          </div>
          <p className="text-sm text-gray-500">
            {isRTL
              ? 'تخصيص لون خلفية شريط التنقل العلوي ولون النص. يُطبَّق فوراً على جميع صفحات المنظمة.'
              : 'Customize the top navigation bar background and text colors. Applied immediately across all organization pages.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Header Background Color */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                {isRTL ? 'لون خلفية الشريط العلوي' : 'Header Background Color'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={headerColor}
                  onChange={(e) => setHeaderColor(e.target.value)}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={headerColor}
                  onChange={(e) => setHeaderColor(e.target.value)}
                  className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs font-mono"
                  placeholder="#2563EB"
                />
              </div>
            </div>

            {/* Header Text Color */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                {isRTL ? 'لون نص الشريط العلوي' : 'Header Text Color'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={headerTextColor}
                  onChange={(e) => setHeaderTextColor(e.target.value)}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={headerTextColor}
                  onChange={(e) => setHeaderTextColor(e.target.value)}
                  className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs font-mono"
                  placeholder="#FFFFFF"
                />
              </div>
            </div>
          </div>

          {/* Live Header Preview */}
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-500 mb-2">
              {isRTL ? 'معاينة مباشرة للشريط العلوي' : 'Live Header Preview'}
            </p>
            <div
              className="h-14 rounded-lg flex items-center justify-between px-5 shadow-sm border border-gray-200"
              style={{ backgroundColor: headerColor }}
            >
              <div className="flex items-center gap-3">
                {/* Logo placeholder */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: headerTextColor }}
                >
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain rounded-lg" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  ) : (
                    'IMS'
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider" style={{ color: headerTextColor }}>
                    {systemName || 'Organization Name'}
                  </div>
                  <div className="text-[10px]" style={{ color: headerTextColor, opacity: 0.75 }}>
                    Dashboard
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="px-3 py-1 rounded text-xs font-medium"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: headerTextColor }}
                >
                  {isRTL ? 'المكتب الرئيسي' : 'Headquarters'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Config */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 lg:col-span-2">
          <h2 className="font-semibold text-gray-900">{localT.footerConfig}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">{localT.footerText}</label>
              <textarea
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">{localT.footerTextAr}</label>
              <textarea
                value={footerTextAr}
                onChange={(e) => setFooterTextAr(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                rows={3}
                dir="rtl"
              />
            </div>
          </div>
        </div>
      </div>
  );
}

export default LogoBranding;
