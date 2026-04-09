/**
 * ============================================================================
 * EMPLOYEES PROFILES - LANDING VIEW (CARDS GRID)
 * ============================================================================
 * 
 * Consistent with HR main landing, MEAL landing, Finance landing
 * 
 * CARDS (9 total - ALL ACTIVE per Figma):
 * - Employees Directory (Active Employees)
 * - Training Management
 * - Archived Employees 
 * - Exited Staff
 * - New Hires
 * - Contract Renewals
 * - Exit Processing
 * - Reference & Verification
 * - Profiles Summary (KPI card)
 * 
 * Core Principle: Each employee has ONE master profile card. All HR modules 
 * (Payroll, Leave, Training) reference this single source of truth. No duplication.
 * 
 * Auto-Creation: When a new staff member is added via Staff Dictionary or Excel 
 * import, an Employee Profile Card is automatically created. Staff ID is unique 
 * and links all HR modules.
 * ============================================================================
 */
import { Link } from 'wouter';

import { useNavigate } from '@/lib/router-compat';
import { 
 Users, Archive, DoorOpen, FileCheck, BarChart3, UserCheck, 
 GraduationCap, UserPlus, FileText, LogOut 
, ArrowLeft, ArrowRight} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

interface ProfileCard {
 id: string;
 name: { en: string; ar: string };
 description: { en: string; ar: string };
 icon: any;
 path: string;
 status: 'active' | 'coming-soon';
 count?: number;
 countKey?: 'active' | 'archived' | 'exited' | 'newHires' | 'contractRenewals' | 'exitProcessing' | 'references';
}

export function EmployeesProfilesLanding() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const navigate = useNavigate();
 const { currentOrganizationId } = useOrganization();
 const { currentOperatingUnitId } = useOperatingUnit();

 // Fetch real employee counts from database
 const { data: employeeCounts } = trpc.hrEmployees.getCounts.useQuery(
 {},
 {
 enabled: !!currentOrganizationId && !!currentOperatingUnitId,
 }
 );

 const labels = {
 title: t.hr.employeesProfiles,
 subtitle: t.hr.employeeProfilesSubtitle,
 
 active: t.hr.active,
 comingSoon: t.hr.comingSoon2,
 clickToOpen: t.hr.clickToOpen,
 underDevelopment: t.hr.underDevelopment,
 
 records: t.hr.records3,
 employees: t.hr.employees,
 
 // Info banner
 corePrinciple: t.hr.corePrinciple4,
 corePrincipleText: 'Each employee has ONE master profile card. All HR modules (Payroll, Leave, Training) reference this single source of truth. No duplication of employee data.',
 autoCreation: t.hr.autocreationEnabled5,
 autoCreationText: 'When a new staff member is added via Staff Dictionary or Excel import, an Employee Profile Card is automatically created. Staff ID is unique and links all HR modules.',
 };

 // All 9 cards - ALL ACTIVE per Figma design
 const cards: ProfileCard[] = [
 {
 id: 'directory',
 name: { en: 'Employees Directory', ar: 'دليل الموظفين' },
 description: { en: 'Active employees with full profiles', ar: 'الموظفون النشطون مع الملفات الكاملة' },
 icon: Users,
 path: '/organization/hr/employees-profiles/directory',
 status: 'active',
 countKey: 'active'
 },
 {
 id: 'training',
 name: { en: 'Training Management', ar: 'إدارة التدريب' },
 description: { en: 'Centralized view of all training records for reporting and oversight', ar: 'عرض مركزي لجميع سجلات التدريب للتقارير والإشراف' },
 icon: GraduationCap,
 path: '/organization/hr/employees-profiles/training-management',
 status: 'active'
 },
 {
 id: 'archived',
 name: { en: 'Archived Employees', ar: 'الموظفون المؤرشفون' },
 description: { en: 'Inactive staff (historical records)', ar: 'الموظفون غير النشطين (السجلات التاريخية)' },
 icon: Archive,
 path: '/organization/hr/employees-profiles/archived',
 status: 'active',
 countKey: 'archived'
 },
 {
 id: 'exited',
 name: { en: 'Exited Staff', ar: 'الموظفون المغادرون' },
 description: { en: 'Completed exit process', ar: 'أكملوا عملية المغادرة' },
 icon: DoorOpen,
 path: '/organization/hr/employees-profiles/exited',
 status: 'active',
 countKey: 'exited'
 },
 {
 id: 'new-hires',
 name: { en: 'New Hires', ar: 'التعيينات الجديدة' },
 description: { en: 'Hired within last 90 days', ar: 'تم توظيفهم خلال آخر 90 يوماً' },
 icon: UserPlus,
 path: '/organization/hr/employees-profiles/new-hires',
 status: 'active',
 countKey: 'newHires'
 },
 {
 id: 'contract-renewals',
 name: { en: 'Contract Renewals', ar: 'تجديد العقود' },
 description: { en: 'Contracts expiring within 60 days', ar: 'عقود تنتهي خلال 60 يوماً' },
 icon: FileText,
 path: '/organization/hr/employees-profiles/contract-renewals',
 status: 'active',
 countKey: 'contractRenewals'
 },
 {
 id: 'exit-processing',
 name: { en: 'Exit Processing', ar: 'معالجة المغادرة' },
 description: { en: 'Staff in exit process', ar: 'الموظفون في عملية المغادرة' },
 icon: LogOut,
 path: '/organization/hr/employees-profiles/exit-processing',
 status: 'active',
 countKey: 'exitProcessing'
 },
 {
 id: 'reference',
 name: { en: 'Reference & Verification', ar: 'المرجع والتحقق' },
 description: { en: 'Generate employment references', ar: 'إنشاء مراجع العمل' },
 icon: FileCheck,
 path: '/organization/hr/employees-profiles/reference',
 status: 'active',
 countKey: 'references'
 },
 {
 id: 'summary',
 name: { en: 'Profiles Summary', ar: 'ملخص الملفات' },
 description: { en: 'KPIs and statistics dashboard', ar: 'لوحة المؤشرات والإحصاءات' },
 icon: BarChart3,
 path: '/organization/hr/employees-profiles/summary',
 status: 'active'
 }
 ];

 const handleCardClick = (card: ProfileCard) => {
 if (card.status === 'active') {
 navigate(card.path);
 }
 };

 const getCardCount = (card: ProfileCard): number | undefined => {
 if (!card.countKey || !employeeCounts) return undefined;
 // Map countKey to actual data from API
 const countMap: Record<string, number> = {
 active: employeeCounts.active ?? 0,
 archived: employeeCounts.archived ?? 0,
 exited: employeeCounts.exited ?? 0,
 newHires: employeeCounts.newHires ?? 0,
 contractRenewals: employeeCounts.contractRenewals ?? 0,
 exitProcessing: employeeCounts.exitProcessing ?? 0,
 references: employeeCounts.references ?? 0,
 };
 return countMap[card.countKey] ?? 0;
 };

 const getStatusBadge = (status: string) => {
 if (status === 'active') {
 return (
 <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
 {labels.active}
 </span>
 );
 } else {
 return (
 <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
 ⏳ {labels.comingSoon}
 </span>
 );
 }
 };

 const getCardClasses = (status: string) => {
 const baseClasses = "bg-white rounded-lg border-2 p-6 transition-all duration-200";
 
 if (status === 'active') {
 return `${baseClasses} border-gray-200 hover:border-blue-500 hover:shadow-lg cursor-pointer`;
 } else {
 return `${baseClasses} border-gray-200 opacity-60 cursor-not-allowed`;
 }
 };

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Back Button */}
 <BackButton href="/organization/hr" label={t.hr.hrDashboard} />

 {/* Header */}
 <div className={'text-start'}>
 <h1 className="text-3xl font-bold text-gray-900">{labels.title}</h1>
 <p className="text-base text-gray-600 mt-2">{labels.subtitle}</p>
 </div>

 {/* Cards Grid - 3 columns */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {cards.map((card) => {
 const Icon = card.icon;
 const count = getCardCount(card);
 
 return (
 <div
 key={card.id}
 className={getCardClasses(card.status)}
 onClick={() => handleCardClick(card)}
 title={card.status === 'active' ? labels.clickToOpen : labels.underDevelopment}
 >
 <div className={`flex items-start justify-between`}>
 <div className="p-2 bg-blue-100 rounded-lg">
 <Icon className="w-6 h-6 text-blue-600" />
 </div>
 {getStatusBadge(card.status)}
 </div>
 
 <h3 className={`text-lg font-semibold text-gray-900 mt-4 text-start`}>
 {card.name[language as 'en' | 'ar']}
 </h3>
 
 <p className={`text-sm text-gray-600 mt-2 text-start`}>
 {card.description[language as 'en' | 'ar']}
 </p>
 
 {count !== undefined && (
 <div className={`mt-4 text-start`}>
 <span className="text-2xl font-bold text-blue-600">{count}</span>
 <span className="text-sm text-gray-500 ms-1">{labels.records}</span>
 </div>
 )}
 
 {card.status === 'active' && (
 <p className={`text-xs text-blue-600 mt-3 flex items-center gap-1 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
 <span>←</span>
 </p>
 )}
 </div>
 );
 })}
 </div>

 {/* Info Banner - Core Principle (below cards) */}
 <div className="bg-blue-50 border-s-4 border-blue-400 p-4 rounded">
 <div className={`flex items-start gap-3`}>
 <div className="flex-shrink-0">
 <UserCheck className="w-5 h-5 text-blue-600" />
 </div>
 <div className="flex-1">
 <h3 className={`text-sm font-medium text-blue-900 text-start`}>
 💎💎💎 {labels.corePrinciple}:
 </h3>
 <p className={`text-sm text-blue-800 mt-1 text-start`}>
 {labels.corePrincipleText}
 </p>
 </div>
 </div>
 </div>

 {/* Info Banner - Auto-Creation (below cards) */}
 <div className="bg-green-50 border-s-4 border-green-400 p-4 rounded">
 <div className={`flex items-start gap-3`}>
 <div className="flex-shrink-0">
 <UserPlus className="w-5 h-5 text-green-600" />
 </div>
 <div className="flex-1">
 <h3 className={`text-sm font-medium text-green-900 text-start`}>
 ✅ {labels.autoCreation}:
 </h3>
 <p className={`text-sm text-green-800 mt-1 text-start`}>
 {labels.autoCreationText}
 </p>
 </div>
 </div>
 </div>
 </div>
 );
}
