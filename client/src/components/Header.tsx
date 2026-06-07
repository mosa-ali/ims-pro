import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Globe, LogOut, Settings as SettingsIcon, User, MapPin, LayoutGrid, Loader2 } from 'lucide-react';
import { useAuth } from "@/_core/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOperatingUnit } from "@/contexts/OperatingUnitContext";
import { useTranslation } from "@/i18n/TranslationProvider";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "wouter";
import { useOrganizationBranding } from "@/hooks/useOrganizationBranding";
import { ROUTES, ROUTE_LABELS } from "@/pages/organization/constants";

/**
 * Header Component - Context-Aware Navigation Header
 *
 * Visual Boundaries (Phase 0 Spec):
 * - Platform Context: Dark background (Slate-900)
 * - Organization Context: Branded background (dynamic from org branding, fallback Blue-600)
 *
 * Features:
 * - Context-aware breadcrumbs
 * - Operating Unit selector (hidden for single-OU users, visible for multiple)
 * - Language switcher (EN ↔ AR)
 * - User profile dropdown with logout
 * - Dynamic organization branding (headerColor, headerTextColor, logo)
 */
export function Header() {
  const { user, logout } = useAuth();
  const { currentOrganization, availableOrganizations } = useOrganization();
  const { currentOperatingUnit, userOperatingUnits, switchOperatingUnit } = useOperatingUnit();
  const t = useTranslation();
  const { isRTL, language, changeLanguage } = useLanguage();

  const [location] = useLocation();
  const { branding } = useOrganizationBranding();

  const [showOperatingUnitMenu, setShowOperatingUnitMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // CONTEXT CHECK: Route-based (not role-based)
  // /platform/* routes → Platform context (dark slate header)
  // /organization/* routes → Organization context (branded header)
  const isPlatformContext = location.startsWith('/platform');

  // -----------------------------------------------------------------------
  // Dynamic branding for organization context
  // Priority: headerColor from DB → primaryColor from DB → fallback #2563EB
  // -----------------------------------------------------------------------
  const orgHeaderBg = branding.headerColor || branding.primaryColor || '#2563EB';
  const orgHeaderText = branding.headerTextColor || '#FFFFFF';

  // Visual Styles based on Context (Phase 0 Boundary Rule)
  const headerBgClass = isPlatformContext ? 'bg-slate-900 text-white' : '';
  const headerStyle = isPlatformContext
    ? undefined
    : { backgroundColor: orgHeaderBg, color: orgHeaderText };

  const textColorClass = isPlatformContext ? 'text-white' : '';
  const subTextColorClass = isPlatformContext ? 'text-slate-300' : '';
  const iconColorClass = isPlatformContext ? 'text-slate-300' : '';
  const buttonHoverClass = isPlatformContext ? 'hover:bg-slate-800' : 'hover:bg-black/10';

  // Inline styles for sub-text elements in org context
  const subStyle = !isPlatformContext ? { color: orgHeaderText, opacity: 0.8 } : undefined;
  const mainStyle = !isPlatformContext ? { color: orgHeaderText } : undefined;

  useEffect(() => {
  if (branding.faviconUrl) {
    let favicon = document.querySelector(
      "link[rel='icon']"
    ) as HTMLLinkElement;

    if (!favicon) {
      favicon = document.createElement("link");
      favicon.rel = "icon";
      document.head.appendChild(favicon);
    }

    favicon.href = branding.faviconUrl;
  }
}, [branding.faviconUrl]);

  // Breadcrumb text
  const contextLabel = isPlatformContext
    ? t.platform.dashboard.title
    : (language === 'ar' ? (currentOrganization?.nameAr || currentOrganization?.name) : currentOrganization?.name);

  const getPageLabel = () => {
  const matchedRoute = Object.keys(ROUTE_LABELS)
    .sort((a, b) => b.length - a.length)
    .find((route) => location.startsWith(route));

  if (!matchedRoute) {
    return language === 'ar' ? "الصفحة الرئيسية" : "Dashboard";
  }

  return language === 'ar'
    ? ROUTE_LABELS[matchedRoute as keyof typeof ROUTE_LABELS].ar
    : ROUTE_LABELS[matchedRoute as keyof typeof ROUTE_LABELS].en;
};

const pageLabel = getPageLabel();

  // Location display with loading state
  const locationDisplay = currentOperatingUnit?.name || 'Headquarters';
  const isLoadingLocation = !currentOperatingUnit;

  // Handle logout - redirect to /login after clearing session
  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setShowUserMenu(false);
      window.location.href = '/login';
    }
  };

  // Handle language switch
  const handleLanguageSwitch = () => {
    const newLang = language === 'en' ? 'ar' : 'en';
    changeLanguage(newLang);
  };

  // Handle OU switch
  const handleOperatingUnitSwitch = (unitId: string) => {
    switchOperatingUnit(unitId);
    setShowOperatingUnitMenu(false);
  };

  // Welcome message for the user
  const isDashboardPage =
  location === "/organization" ||
  location === "/organization/";
const welcomeLabel =
  isDashboardPage && user?.name
    ? `${t.common.welcome ?? "Welcome"}, ${user.name}`
    : undefined;

  return (
    <div
      className={`min-h-[4rem] w-full flex items-center justify-between px-3 sm:px-6 gap-2 transition-colors duration-300 ${headerBgClass}`}
      style={headerStyle}
    >
      {/* Left: Logo + Breadcrumbs + Welcome */}
<div className="flex items-center gap-3 min-w-0 flex-shrink">

  {/* Organization Logo */}
  {!isPlatformContext && (
    <div className="flex-shrink-0">

      {branding.logoUrl ? (
        <img
          src={branding.logoUrl}
          alt=""
          className="h-10 w-auto max-w-[140px] object-contain"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <div
          className="h-10 px-3 rounded-lg flex items-center justify-center font-bold text-sm bg-white/10"
          style={{
            color: orgHeaderText,
          }}
        >
          IMS
        </div>
      )}
    </div>
  )}

  {/* Breadcrumbs + Welcome */}
<div className="flex flex-col min-w-0">

  {/* Desktop Breadcrumb */}
  <div className="hidden sm:flex items-center gap-2 min-w-0">

    <LayoutGrid
      className={`w-4 h-4 flex-shrink-0 ${
        isPlatformContext ? iconColorClass : ""
      }`}
      style={!isPlatformContext ? subStyle : undefined}
    />

    {isDashboardPage ? (
      <>
        {/* Organization Name ONLY in Dashboard */}
        <span
          className={`font-bold tracking-tight uppercase truncate max-w-[260px] ${
            isPlatformContext ? textColorClass : ""
          }`}
          style={mainStyle}
          title={
            language === 'ar'
              ? (
                  branding.organizationNameAr ||
                  branding.organizationName ||
                  contextLabel
                )
              : (
                  branding.organizationName ||
                  contextLabel
                )
          }
        >
          {language === 'ar'
            ? (
                branding.organizationNameAr ||
                branding.organizationName ||
                contextLabel
              )
            : (
                branding.organizationName ||
                contextLabel
              )}
        </span>

        <span
          className={isPlatformContext ? subTextColorClass : ""}
          style={subStyle}
        >
          /
        </span>

        <span
          className={`font-medium truncate ${
            isPlatformContext ? subTextColorClass : ""
          }`}
          style={subStyle}
        >
          {pageLabel}
        </span>
      </>
    ) : (
      <>
        {/* ONLY MODULE NAME FOR INNER PAGES */}
        <span
          className={`font-semibold truncate max-w-[320px] ${
            isPlatformContext ? textColorClass : ""
          }`}
          style={mainStyle}
          title={pageLabel}
        >
          {pageLabel}
        </span>
      </>
    )}
  </div>

  {/* Mobile Header */}
  <span
    className={`sm:hidden font-semibold truncate max-w-[220px] ${
      isPlatformContext ? textColorClass : ""
    }`}
    style={mainStyle}
    title={pageLabel}
  >
    {pageLabel}
  </span>

  {/* Welcome Message - Dashboard ONLY */}
  {isDashboardPage && welcomeLabel && (
    <span
      className={`text-[11px] truncate leading-tight mt-0.5 ${
        isPlatformContext ? "text-slate-300" : ""
      }`}
      style={
        !isPlatformContext
          ? {
              color: orgHeaderText,
              opacity: 0.75,
            }
          : undefined
      }
    >
      {welcomeLabel}
    </span>
    )}
  </div>
</div>

      {/* Right: Controls */}
      <div className="flex items-center gap-3">

        {/* Operating Unit Switcher (Phase 0 Spec 4) */}
        {/* VISIBILITY RULE: Always visible in organization context to show current office */}
        {!isPlatformContext && userOperatingUnits && userOperatingUnits.length >= 1 && (
          <div className="relative">
            {/* Icon-only on very small screens (<375px), full button on sm+ */}
            <button
              onClick={() => setShowOperatingUnitMenu(!showOperatingUnitMenu)}
              className={`flex items-center gap-2 px-2 sm:px-3 py-1.5 text-sm rounded-lg transition-all border border-white/20 ${buttonHoverClass} cursor-pointer`}
            >
              <div
                className="w-6 h-6 rounded flex items-center justify-center shadow-sm flex-shrink-0"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                <MapPin
                  className="w-3.5 h-3.5"
                  style={mainStyle}
                />
              </div>
              {/* Hide text on very small screens, show on sm+ */}
              <div className="text-start hidden xs:block min-w-0" style={{ maxWidth: 'min(150px, 30vw)' }}>
                <div
                  className={`text-[10px] uppercase font-bold tracking-wider ${isPlatformContext ? subTextColorClass : ''}`}
                  style={subStyle}
                >
                  {t.header?.activeOffice || "Active Office"}
                </div>
                <div
                  className={`font-semibold truncate ${isPlatformContext ? textColorClass : ''}`}
                  style={mainStyle}
                >
                  {language === 'ar' ? (currentOperatingUnit?.nameAr || currentOperatingUnit?.name) : currentOperatingUnit?.name}
                </div>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 hidden xs:block flex-shrink-0 ${isPlatformContext ? subTextColorClass : ''}`}
                style={subStyle}
              />
            </button>

            {showOperatingUnitMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowOperatingUnitMenu(false)} />
                <div className={`absolute mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50 ${isRTL ? 'start-0' : 'end-0'}`}>
                  <div className="px-4 py-3 border-b border-gray-100 text-start">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      {t.header?.switchOperatingUnit || "Switch Operating Unit"}
                    </p>
                  </div>
                  {userOperatingUnits.map((unit) => (
                    <button
                      key={unit.id}
                      onClick={() => handleOperatingUnitSwitch(unit.id)}
                      className={`w-full px-4 py-3 text-sm hover:bg-gray-50 transition-colors text-start ${unit.id === currentOperatingUnit?.id ? 'bg-blue-50 border-e-4 border-blue-600' : ''}`}
                    >
                      <div className="font-bold text-gray-900">{language === 'ar' ? (unit.nameAr || unit.name) : unit.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{unit.type.replace('_', ' ')}</div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Language Switcher and User Profile moved to Sidebar */}
      </div>
    </div>
  );
}
