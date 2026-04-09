/**
 * ============================================================================
 * SALARY SCALE TABLE - MASTER COMPONENT WITH SUB-TABS
 * ============================================================================
 * 
 * STRUCTURE:
 * - Tab 1: Guideline (read-only guidance)
 * - Tab 2: Salary Scale Table (data table - single source of truth)
 * - Tab 3: Salary Scale Policy (policy document management)
 * 
 * ============================================================================
 */

import { useState } from 'react';
import { BookOpen, Table2, FileText } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import * as Tabs from '@radix-ui/react-tabs';
import { SalaryScaleGuideline } from './SalaryScaleGuideline';
import { SalaryScaleTableTab } from './SalaryScaleTableTab';
import { SalaryScalePolicy } from './SalaryScalePolicy';
import { BackToModulesButton } from './BackToModulesButton';

export function SalaryScale() {
  const { language, isRTL } = useLanguage();
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('table');

  const t = {
    title: language === 'en' ? 'Salary Scale Table' : 'جدول الرواتب',
    subtitle: language === 'en'
      ? 'Single source of truth for all salary data - Payroll reads from this table'
      : 'المصدر الوحيد لجميع بيانات الرواتب - كشف الرواتب يقرأ من هذا الجدول',

    // Sub-tabs
    guideline: language === 'en' ? 'Guideline' : 'الدليل',
    table: language === 'en' ? 'Salary Scale Table' : 'جدول الرواتب',
    policy: language === 'en' ? 'Salary Scale Policy' : 'سياسة جدول الرواتب'
  };

  const subTabs = [
    { id: 'guideline', label: t.guideline, icon: BookOpen },
    { id: 'table', label: t.table, icon: Table2 },
    { id: 'policy', label: t.policy, icon: FileText }
  ];

  return (
    <div className="space-y-6">
      {/* Back to Modules Button */}
      <BackToModulesButton 
        targetPath="/organization/hr"
        parentModuleName={language === 'en' ? 'HR Dashboard' : 'لوحة الموارد البشرية'}
      />

      {/* Header */}
      <div className={isRTL ? 'text-right' : 'text-left'}>
        <h2 className="text-2xl font-bold text-gray-900">{t.title}</h2>
        <p className="text-sm text-gray-600 mt-1">{t.subtitle}</p>
      </div>

      {/* Sub-tabs */}
      <Tabs.Root value={activeSubTab} onValueChange={setActiveSubTab}>
        <Tabs.List className={`flex gap-1 border-b border-gray-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Tabs.Trigger
                key={tab.id}
                value={tab.id}
                className={`inline-flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                  activeSubTab === tab.id
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                } ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>

        <div className="mt-6">
          <Tabs.Content value="guideline">
            <SalaryScaleGuideline language={language} isRTL={isRTL} />
          </Tabs.Content>

          <Tabs.Content value="table">
            <SalaryScaleTableTab />
          </Tabs.Content>

          <Tabs.Content value="policy">
            <SalaryScalePolicy language={language} isRTL={isRTL} userName={user?.name || 'System'} />
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
}