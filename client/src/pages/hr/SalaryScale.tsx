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
import { Link } from 'wouter';

import { useState } from 'react';
import { BookOpen, Table2, FileText  } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';
import { useAuth } from '@/_core/hooks/useAuth';
import * as Tabs from '@radix-ui/react-tabs';
import { SalaryScaleGuideline } from './SalaryScaleGuideline';
import { SalaryScaleTableTab } from './SalaryScaleTableTab';
import { SalaryScalePolicy } from './SalaryScalePolicy';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";
export function SalaryScale() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const { currentOrganizationId } = useOrganization();
 const { currentOperatingUnitId } = useOperatingUnit();
 const { user } = useAuth();
 const [activeSubTab, setActiveSubTab] = useState('table');

 const labels = {
 title: t.hr.salaryScaleTable,
 subtitle: t.hr.salaryScaleSubtitle,

 // Sub-tabs
 guideline: t.hr.guideline,
 table: t.hr.salaryScaleTable,
 policy: t.hr.salaryScalePolicy
 };

 const subTabs = [
 { id: 'guideline', label: labels.guideline, icon: BookOpen },
 { id: 'table', label: labels.table, icon: Table2 },
 { id: 'policy', label: labels.policy, icon: FileText }
 ];

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <BackButton href="/organization/hr" label={t.hr.hrDashboard} />

 {/* Back to Modules Button */}
 

 {/* Header */}
 <div className={'text-start'}>
 <h2 className="text-2xl font-bold text-gray-900">{labels.title}</h2>
 <p className="text-sm text-gray-600 mt-1">{labels.subtitle}</p>
 </div>

 {/* Sub-tabs */}
 <Tabs.Root value={activeSubTab} onValueChange={setActiveSubTab}>
 <Tabs.List className={`flex gap-1 border-b border-gray-200`}>
 {subTabs.map((tab) => {
 const Icon = tab.icon;
 return (
 <Tabs.Trigger
 key={tab.id}
 value={tab.id}
 className={`inline-flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${ activeSubTab === tab.id ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50' }`}
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