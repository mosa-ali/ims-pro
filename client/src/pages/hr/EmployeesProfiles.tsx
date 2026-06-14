/**
 * ============================================================================
 * EMPLOYEES PROFILES - LANDING VIEW (CARDS GRID)
 * ============================================================================
 * 
 * PURPOSE:
 * - Single source of truth for each employee across full lifecycle
 * - Landing view with interactive cards (like HR & MEAL main landing)
 * - No duplication across Payroll, Leave, Salary, Training modules
 * 
 * STRUCTURE:
 * - Landing View: Cards Grid → Opens filtered employee views
 * - Employee Card: ONE record per employee with 8 sub-cards
 * 
 * ============================================================================
 */
import { Link } from 'wouter';

import { useState, useEffect } from 'react';
import { 
 Users,
 Archive,
 FileText,
 UserPlus,
 RefreshCw,
 UserMinus,
 UserCheck,
 GraduationCap,
 ArrowLeft, ArrowRight
} from 'lucide-react';
import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

interface LocalizedText {
  en: string;
  ar: string;
  it: string;
}

interface ModuleCard {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  icon: any;
  path: string;
  status: 'active' | 'coming-soon';
  count?: number;
}

export function EmployeesProfiles() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const navigate = useNavigate();
 const [staffCounts, setStaffCounts] = useState({
 active: 0,
 archived: 0,
 exited: 0,
 total: 0,
 newHires: 0,
 renewals: 0,
 exitProcessing: 0
 });

 // Fetch statistics via tRPC
 const { data: stats } = trpc.hrEmployees.getStatistics.useQuery({});

 useEffect(() => {
   if (!stats) return;
   
   setStaffCounts({
     active: stats.byStatus.active,
     archived: 0, // Not in new schema
     exited: stats.byStatus.terminated + stats.byStatus.resigned,
     total: stats.total,
     newHires: 0, // Will need separate query
     renewals: 0, // Will need separate query
     exitProcessing: 0 // Will need separate query
   });
 }, [stats]);

 const labels = {
 title: t.hr.employeesProfiles,
 subtitle: t.hr.employeeProfilesSubtitle,
 
 // Status badges
 active: t.hr.active,
 comingSoon: t.hr.comingSoon2,
 
 // Cards
 employeesDirectory: t.hr.employeesDirectory,
 employeesDirectoryDesc: t.hr.activeEmployeesWithFullProfilesAnd,
 
 archivedEmployees: t.hr.archivedEmployees,
 archivedEmployeesDesc: t.hr.viewArchivedEmployeeRecords,
 
 profilesSummary: t.hr.profilesSummary,
 profilesSummaryDesc: t.hr.overviewAndStatisticsOfAllEmployee,
 
 exitedStaff: t.hr.exitedStaff,
 exitedStaffDesc: t.hr.employeesWhoCompletedOffboardingProcess,
 
 referenceVerification: t.hr.referenceVerification,
 referenceVerificationDesc: t.hr.postexitReferenceAndEmploymentVerification,
 };

 const cards: ModuleCard[] = [
 {
 id: 'directory',
 name: {
  en: 'Employees Directory',
  ar: 'دليل الموظفين',
  it: 'Elenco Dipendenti'
},
description: {
  en: 'Active employees with full profiles',
  ar: 'الموظفون النشطون مع الملفات الكاملة',
  it: 'Dipendenti attivi con profili completi'
},
 icon: Users,
 path: '/organization/hr/employees-profiles/directory',
 status: 'active',
 count: staffCounts.active
 },
 {
 id: 'training',
 name: {
  en: 'Training Management',
  ar: 'إدارة التدريب',
  it: 'Gestione della Formazione'
},
description: {
  en: 'Centralized view of all training records for reporting and oversight',
  ar: 'عرض مركزي لجميع سجلات التدريب للتقارير والإشراف',
  it: 'Vista centralizzata di tutti i registri di formazione per reporting e supervisione'
},
 icon: GraduationCap,
 path: '/organization/hr/employees-profiles/training-management',
 status: 'active'
 },
 {
 id: 'archived',
name: {
  en: 'Archived Employees',
  ar: 'الموظفون المؤرشفون',
  it: 'Dipendenti Archiviati'
},
description: {
  en: 'Inactive staff (historical records)',
  ar: 'الموظفون غير النشطين (سجلات تاريخية)',
  it: 'Personale non attivo (archivio storico)'
},
 icon: Archive,
 path: '/organization/hr/employees-profiles/archived',
 status: 'active',
 count: staffCounts.archived
 },
 {
 id: 'exited',
 name: {
  en: 'Exited Staff',
  ar: 'الموظفون المغادرون',
  it: 'Personale Uscito'
},
description: {
  en: 'Completed exit process',
  ar: 'أكملوا عملية الخروج',
  it: 'Ha completato il processo di uscita'
},
 icon: FileText,
 path: '/organization/hr/employees-profiles/exited',
 status: 'active',
 count: staffCounts.exited
 },
 {
 id: 'new-hires',
name: {
  en: 'New Hires',
  ar: 'التعيينات الجديدة',
  it: 'Nuove Assunzioni'
},
description: {
  en: 'Hired within last 90 days',
  ar: 'معينون خلال آخر 90 يوماً',
  it: 'Assunti negli ultimi 90 giorni'
},
 icon: UserPlus,
 path: '/organization/hr/employees-profiles/new-hires',
 status: 'active',
 count: staffCounts.newHires
 },
 {
 id: 'contract-renewals',
name: {
  en: 'Contract Renewals',
  ar: 'تجديدات العقود',
  it: 'Rinnovi Contrattuali'
},
description: {
  en: 'Contracts expiring within 60 days',
  ar: 'عقود تنتهي خلال 60 يوماً',
  it: 'Contratti in scadenza entro 60 giorni'
},
 icon: FileText,
 path: '/organization/hr/employees-profiles/renewals',
 status: 'active',
 count: staffCounts.renewals
 },
 {
 id: 'exit-processing',
name: {
  en: 'Exit Processing',
  ar: 'معالجة الخروج',
  it: 'Gestione delle Uscite'
},
description: {
  en: 'Staff in exit process',
  ar: 'موظفون في عملية الخروج',
  it: 'Personale attualmente nel processo di uscita'
},
 icon: FileText,
 path: '/organization/hr/employees-profiles/exit-processing',
 status: 'active',
 count: staffCounts.exitProcessing
 },
 {
 id: 'reference',
name: {
  en: 'Reference & Verification',
  ar: 'المراجع والتحقق',
  it: 'Referenze e Verifiche'
},
description: {
  en: 'Generate employment references',
  ar: 'إنشاء مراجع التوظيف',
  it: 'Genera referenze lavorative'
},
 icon: FileText,
 path: '/organization/hr/employees-profiles/reference',
 status: 'active',
 count: staffCounts.exited
 },
 {
 id: 'summary',
name: {
  en: 'Profiles Summary',
  ar: 'ملخص الملفات',
  it: 'Riepilogo dei Profili'
},
description: {
  en: 'KPIs and statistics dashboard',
  ar: 'لوحة المؤشرات والإحصاءات',
  it: 'Dashboard con KPI e statistiche'
},
 icon: FileText,
 path: '/organization/hr/employees-profiles/summary',
 status: 'active'
 }
 ];

 const handleCardClick = (card: ModuleCard) => {
 if (card.status === 'active') {
 navigate(card.path);
 }
 };

 const getStatusColor = (status: string) => {
 switch (status) {
 case 'active':
 return 'bg-green-50 text-green-700 border-green-200';
 case 'coming-soon':
 return 'bg-yellow-50 text-yellow-700 border-yellow-200';
 default:
 return 'bg-gray-50 text-gray-600 border-gray-200';
 }
 };

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Back Button */}
 <BackButton href="/organization/hr" label={t.hr.hrDashboard} />
 

 {/* Header */}
 <div className={'text-start'}>
 <h1 className="text-2xl font-bold text-gray-900">{labels.title}</h1>
 <p className="text-gray-600 mt-1">{labels.subtitle}</p>
 </div>

 {/* Cards Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {cards.map((card) => {
 const Icon = card.icon;
 const isActive = card.status === 'active';
 
 return (
 <button
 key={card.id}
 onClick={() => handleCardClick(card)}
 disabled={!isActive}
 className={`bg-white rounded-lg border-2 p-6 text-left transition-all ${isActive ? 'border-gray-200 hover:border-blue-400 hover:shadow-md cursor-pointer' : 'border-gray-200 opacity-60 cursor-not-allowed' } text-start`}
 >
 {/* Icon & Status Badge */}
 <div className="flex items-start justify-between mb-4">
 <div className={`p-3 rounded-lg ${isActive ? 'bg-blue-50' : 'bg-gray-50'}`}>
 <Icon className={`w-6 h-6 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
 </div>
 <span className={`text-xs font-medium px-2 py-1 rounded border ${getStatusColor(card.status)}`}>
 {card.status === 'active' ? labels.active : labels.comingSoon}
 </span>
 </div>

 {/* Card Content */}
 <div className="space-y-2">
 <h3 className="text-base font-semibold text-gray-900">
 {card.name[language as keyof LocalizedText]}
 </h3>
 <p className="text-sm text-gray-600 leading-relaxed">
 {card.description[language as keyof LocalizedText]}
 </p>
 
 {/* Count Badge (if available) */}
 {card.count !== undefined && (
 <div className={`flex items-center gap-2 pt-2`}>
 <span className="text-2xl font-bold text-blue-600">{card.count}</span>
 <span className="text-sm text-gray-500">
 {t.hr.records}
 </span>
 </div>
 )}
 </div>

 {/* Arrow Indicator (only for active cards) */}
 {isActive && (
 <div className={`flex items-center justify-end mt-4 text-blue-600`}>
 {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
 </div>
 )}
 </button>
 );
 })}
 </div>

 {/* Info Box */}
 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
 <p className={`text-sm text-blue-800 text-start`}>
 <strong>
 {t.hr.corePrinciple}
 </strong>
 {' '}
 {'Each employee has ONE master profile card. All HR modules (Payroll, Leave, Training) reference this single source of truth. No duplication of employee data.'
 }
 </p>
 </div>

 {/* Auto-Creation Notice */}
 <div className="bg-green-50 border border-green-200 rounded-lg p-4">
 <p className={`text-sm text-green-800 text-start`}>
 <strong>
 {t.hr.autocreationEnabled}
 </strong>
 {' '}
 {'When a new staff member is added via Staff Dictionary or Excel import, an Employee Profile Card is automatically created. Staff ID is unique and links all HR modules.'
 }
 </p>
 </div>
 </div>
 );
}
