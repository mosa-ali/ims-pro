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
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { staffService } from '@/app/services/hrService';
import { BackToModulesButton } from './BackToModulesButton';

interface ModuleCard {
  id: string;
  name: { en: string; ar: string };
  description: { en: string; ar: string };
  icon: any;
  path: string;
  status: 'active' | 'coming-soon';
  count?: number;
}

export function EmployeesProfiles() {
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

  useEffect(() => {
    // Load real staff counts with proper filters (HR BEST PRACTICE MODEL)
    const allStaff = staffService.getAll();
    const today = new Date();
    
    // 1. Active employees (✅ CANONICAL - Payroll-eligible)
    const active = allStaff.filter(s => s.status === 'active');
    
    // 2. Archived employees (✅ CANONICAL - Inactive but not exited)
    const archived = allStaff.filter(s => s.status === 'archived');
    
    // 3. Exited staff (✅ CANONICAL - Employment ended)
    const exited = allStaff.filter(s => s.status === 'exited');
    
    // 4. New Hires (✅ DYNAMIC - hired within last 90 days AND active)
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(today.getDate() - 90);
    const newHires = active.filter(s => {
      if (!s.hireDate) return false;
      const hireDate = new Date(s.hireDate);
      return hireDate >= ninetyDaysAgo;
    });
    
    // 5. Contract Renewals (✅ DYNAMIC - contracts expiring within 60 days AND active)
    const sixtyDaysFromNow = new Date(today);
    sixtyDaysFromNow.setDate(today.getDate() + 60);
    const renewals = active.filter(s => {
      if (!s.contractEndDate) return false;
      const endDate = new Date(s.contractEndDate);
      return endDate <= sixtyDaysFromNow && endDate >= today;
    });
    
    // 6. Exit Processing (✅ WORKFLOW-DRIVEN - exit started but not completed)
    const exitProcessing = allStaff.filter(s => 
      s.exitStarted === true && s.status !== 'exited'
    );
    
    setStaffCounts({
      active: active.length,
      archived: archived.length,
      exited: exited.length,
      total: allStaff.length,
      newHires: newHires.length,
      renewals: renewals.length,
      exitProcessing: exitProcessing.length
    });
  }, []);

  const t = {
    title: language === 'en' ? 'Employees Profiles' : 'ملفات الموظفين',
    subtitle: language === 'en' 
      ? 'Complete employee lifecycle management from hire to exit' 
      : 'إدارة دورة حياة الموظف الكاملة من التوظيف حتى المغادرة',
    
    // Status badges
    active: language === 'en' ? 'Active' : 'نشط',
    comingSoon: language === 'en' ? 'Coming Soon' : 'قريباً',
    
    // Cards
    employeesDirectory: language === 'en' ? 'Employees Directory' : 'دليل الموظفين',
    employeesDirectoryDesc: language === 'en' ? 'Active employees with full profiles and lifecycle management' : 'الموظفون النشطون مع الملفات الكاملة وإدارة دورة الحياة',
    
    archivedEmployees: language === 'en' ? 'Archived Employees' : 'الموظفون المؤرشون',
    archivedEmployeesDesc: language === 'en' ? 'View archived employee records' : 'عرض سجلات الموظفين المؤرشفين',
    
    profilesSummary: language === 'en' ? 'Profiles Summary' : 'ملخص الملفات',
    profilesSummaryDesc: language === 'en' ? 'Overview and statistics of all employee profiles' : 'نظرة عامة وإحصائيات لجميع ملفات الموظفين',
    
    exitedStaff: language === 'en' ? 'Exited Staff' : 'الموظفون المغادرون',
    exitedStaffDesc: language === 'en' ? 'Employees who completed offboarding process' : 'الموظفون الذين أكملوا عملية الخروج',
    
    referenceVerification: language === 'en' ? 'Reference & Verification' : 'المراجع والتحقق',
    referenceVerificationDesc: language === 'en' ? 'Post-exit reference and employment verification' : 'المراجع والتحقق من التوظيف بعد المغادرة',
  };

  const cards: ModuleCard[] = [
    {
      id: 'directory',
      name: { en: 'Employees Directory', ar: 'دليل الموظفين' },
      description: { en: 'Active employees with full profiles', ar: 'الموظفون النشطون مع الملفات الكاملة' },
      icon: Users,
      path: '/organization/hr/employees-profiles/directory',
      status: 'active',
      count: staffCounts.active
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
      description: { en: 'Inactive staff (historical records)', ar: 'الموظفون غير النشطين (سجلات تاريخية)' },
      icon: Archive,
      path: '/organization/hr/employees-profiles/archived',
      status: 'active',
      count: staffCounts.archived
    },
    {
      id: 'exited',
      name: { en: 'Exited Staff', ar: 'الموظفون المغادرون' },
      description: { en: 'Completed exit process', ar: 'أكملوا عملية الخروج' },
      icon: FileText,
      path: '/organization/hr/employees-profiles/exited',
      status: 'active',
      count: staffCounts.exited
    },
    {
      id: 'new-hires',
      name: { en: 'New Hires', ar: 'التعيينات الجديدة' },
      description: { en: 'Hired within last 90 days', ar: 'معينون خلال آخر 90 يوماً' },
      icon: UserPlus,
      path: '/organization/hr/employees-profiles/new-hires',
      status: 'active',
      count: staffCounts.newHires
    },
    {
      id: 'contract-renewals',
      name: { en: 'Contract Renewals', ar: 'تجديدات العقود' },
      description: { en: 'Contracts expiring within 60 days', ar: 'عقود تنتهي خلال 60 يوماً' },
      icon: FileText,
      path: '/organization/hr/employees-profiles/renewals',
      status: 'active',
      count: staffCounts.renewals
    },
    {
      id: 'exit-processing',
      name: { en: 'Exit Processing', ar: 'معالجة الخروج' },
      description: { en: 'Staff in exit process', ar: 'موظفون في عملية الخروج' },
      icon: FileText,
      path: '/organization/hr/employees-profiles/exit-processing',
      status: 'active',
      count: staffCounts.exitProcessing
    },
    {
      id: 'reference',
      name: { en: 'Reference & Verification', ar: 'المراجع والتحقق' },
      description: { en: 'Generate employment references', ar: 'إنشاء مراجع التوظيف' },
      icon: FileText,
      path: '/organization/hr/employees-profiles/reference',
      status: 'active',
      count: staffCounts.exited
    },
    {
      id: 'summary',
      name: { en: 'Profiles Summary', ar: 'ملخص الملفات' },
      description: { en: 'KPIs and statistics dashboard', ar: 'لوحة المؤشرات والإحصاءات' },
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
    <div className="space-y-6">
      {/* Back Button */}
      <BackToModulesButton 
        targetPath="/organization/hr"
        parentModuleName={language === 'en' ? 'HR Dashboard' : 'لوحة الموارد البشرية'}
      />

      {/* Header */}
      <div className={isRTL ? 'text-right' : 'text-left'}>
        <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        <p className="text-gray-600 mt-1">{t.subtitle}</p>
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
              className={`
                bg-white rounded-lg border-2 p-6 text-left transition-all
                ${isActive 
                  ? 'border-gray-200 hover:border-blue-400 hover:shadow-md cursor-pointer' 
                  : 'border-gray-200 opacity-60 cursor-not-allowed'
                }
                ${isRTL ? 'text-right' : 'text-left'}
              `}
            >
              {/* Icon & Status Badge */}
              <div className={`flex items-start justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`p-3 rounded-lg ${isActive ? 'bg-blue-50' : 'bg-gray-50'}`}>
                  <Icon className={`w-6 h-6 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded border ${getStatusColor(card.status)}`}>
                  {card.status === 'active' ? t.active : t.comingSoon}
                </span>
              </div>

              {/* Card Content */}
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-gray-900">
                  {card.name[language]}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {card.description[language]}
                </p>
                
                {/* Count Badge (if available) */}
                {card.count !== undefined && (
                  <div className={`flex items-center gap-2 pt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-2xl font-bold text-blue-600">{card.count}</span>
                    <span className="text-sm text-gray-500">
                      {language === 'en' ? 'records' : 'سجل'}
                    </span>
                  </div>
                )}
              </div>

              {/* Arrow Indicator (only for active cards) */}
              {isActive && (
                <div className={`flex items-center justify-end mt-4 text-blue-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className={`text-sm text-blue-800 ${isRTL ? 'text-right' : 'text-left'}`}>
          <strong>
            {language === 'en' ? '��� Core Principle:' : '🔒 المبدأ الأساسي:'}
          </strong>
          {' '}
          {language === 'en' 
            ? 'Each employee has ONE master profile card. All HR modules (Payroll, Leave, Training) reference this single source of truth. No duplication of employee data.'
            : 'كل موظف بطاقة ملف شخصي رئيسية واحدة. جميع وحدات الموارد البشرية (الرواتب، الإجازات، التدريب) تشير إلى هذا المصدر الوحيد. لا تكرار لبيانات الموظفين.'
          }
        </p>
      </div>

      {/* Auto-Creation Notice */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className={`text-sm text-green-800 ${isRTL ? 'text-right' : 'text-left'}`}>
          <strong>
            {language === 'en' ? '🔁 Auto-Creation Enabled:' : '🔁 الإنشاء التلقائي مفعّل:'}
          </strong>
          {' '}
          {language === 'en' 
            ? 'When a new staff member is added via Staff Dictionary or Excel import, an Employee Profile Card is automatically created. Staff ID is unique and links all HR modules.'
            : 'عند إضافة موظف جديد عبر سجل الموظفين أو الاستيراد من Excel، يتم إنشاء بطاقة ملف الموظف تلقائياً. رقم الموظف فريد ويربط جميع وحدات الموارد البشرية.'
          }
        </p>
      </div>
    </div>
  );
}