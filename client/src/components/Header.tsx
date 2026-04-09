import { useState } from 'react';
import { ChevronDown, Globe, LogOut, Settings as SettingsIcon, User, MapPin, LayoutGrid } from 'lucide-react';
import { useAuth } from "@/_core/hooks/useAuth";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOperatingUnit } from "@/contexts/OperatingUnitContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/i18n/useTranslation";
import { useLocation } from "wouter";

/**
 * Header Component - Context-Aware Navigation Header
 * 
 * Visual Boundaries (Phase 0 Spec):
 * - Platform Context: Dark background (Slate-900)
 * - Organization Context: Branded background (Blue-600)
 * 
 * Features:
 * - Context-aware breadcrumbs
 * - Operating Unit selector (hidden for single-OU users, visible for multiple)
 * - Language switcher (EN ↔ AR)
 * - User profile dropdown with logout
 */
export function Header() {
  const { user, logout } = useAuth();
 const { currentOrganization, availableOrganizations } = useOrganization();
 const { currentOperatingUnit, userOperatingUnits, switchOperatingUnit } = useOperatingUnit();
 const { direction, setLanguage, isRTL} = useLanguage();
 const { t, language } = useTranslation();
const [location] = useLocation();
 
 const [showOperatingUnitMenu, setShowOperatingUnitMenu] = useState(false);
 const [showUserMenu, setShowUserMenu] = useState(false);


 // CONTEXT CHECK: Route-based (not role-based)
 // /platform/* routes → Platform context (dark slate header)
 // /organization/* routes → Organization context (blue header)
 const isPlatformContext = location.startsWith('/platform');

 // Visual Styles based on Context (Phase 0 Boundary Rule)
 const headerBgClass = isPlatformContext 
 ? 'bg-slate-900 text-white' 
 : 'bg-blue-600 text-white';
 const textColorClass = 'text-white';
 const subTextColorClass = isPlatformContext ? 'text-slate-300' : 'text-blue-100';
 const iconColorClass = isPlatformContext ? 'text-slate-300' : 'text-blue-100';
 const buttonHoverClass = isPlatformContext ? 'hover:bg-slate-800' : 'hover:bg-blue-700';

 // Breadcrumb text
 const contextLabel = isPlatformContext 
 ? t.header.platformAdmin
 : (isRTL ? (currentOrganization?.nameAr || currentOrganization?.name) : currentOrganization?.name);

 const pageLabel = t.header.dashboard;

 // Handle logout - redirect to /login after clearing session
 const handleLogout = async () => {
 try {
 await logout();
 } finally {
 setShowUserMenu(false);
 // Redirect to Sign-In page after logout
 window.location.href = '/login';
 }
 };

 // Handle language switch
 const handleLanguageSwitch = () => {
 const newLang = t.components.ar;
 setLanguage(newLang);
 };

 // Handle OU switch
 const handleOperatingUnitSwitch = (unitId: string) => {
 switchOperatingUnit(unitId);
 setShowOperatingUnitMenu(false);
 };

 return (
 <div className={`h-16 w-full flex items-center justify-between px-6 transition-colors duration-300 ${headerBgClass}`}>
 {/* Left: Context-Aware Breadcrumbs (Phase 0 Spec 3) */}
 <div className={`flex items-center gap-2 text-sm`}>
 <LayoutGrid className={`w-4 h-4 ${iconColorClass}`} />
 <span className={`font-bold tracking-tight uppercase ${textColorClass}`}>
 {contextLabel || 'Organization'}
 </span>
 <span className={subTextColorClass}>/</span>
 <span className={`font-medium ${subTextColorClass}`}>
 {pageLabel}
 </span>
 </div>
 
 {/* Right: Controls */}
 <div className={`flex items-center gap-3`}>
 
 {/* Operating Unit Switcher (Phase 0 Spec 4) */}
 {/* VISIBILITY RULE: Always visible in organization context to show current office */}
 {!isPlatformContext && userOperatingUnits && userOperatingUnits.length >= 1 && (
 <div className="relative">
 <button
 onClick={() => setShowOperatingUnitMenu(!showOperatingUnitMenu)}
 className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-all border border-white/20 ${buttonHoverClass} cursor-pointer`}
 >
 <div className="w-6 h-6 bg-white/20 text-white rounded flex items-center justify-center shadow-sm">
 <MapPin className="w-3.5 h-3.5" />
 </div>
 <div className={'text-start'}>
 <div className={`text-[10px] uppercase font-bold tracking-wider ${subTextColorClass}`}>
 {t.header.activeOffice}
 </div>
 <div className={`font-semibold max-w-[150px] truncate ${textColorClass}`}>
 {isRTL ? (currentOperatingUnit?.nameAr || currentOperatingUnit?.name) : currentOperatingUnit?.name}
 </div>
 </div>
 <ChevronDown className={`w-3.5 h-3.5 ${subTextColorClass}`} />
 </button>
 
 {showOperatingUnitMenu && (
 <>
 <div className="fixed inset-0 z-40" onClick={() => setShowOperatingUnitMenu(false)} />
 <div className={`absolute mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50 ${isRTL ? 'start-0' : 'end-0'}`}>
 <div className={`px-4 py-3 border-b border-gray-100 text-start`}>
 <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
 {t.header.switchOperatingUnit}
 </p>
 </div>
 {userOperatingUnits.map((unit) => (
 <button
 key={unit.id}
 onClick={() => handleOperatingUnitSwitch(unit.id)}
 className={`w-full px-4 py-3 text-sm hover:bg-gray-50 transition-colors text-start ${unit.id === currentOperatingUnit?.id ? 'bg-blue-50 border-e-4 border-blue-600' : ''}`}
 >
 <div className="font-bold text-gray-900">{isRTL ? (unit.nameAr || unit.name) : unit.name}</div>
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
