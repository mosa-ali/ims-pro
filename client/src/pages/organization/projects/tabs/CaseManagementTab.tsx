import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

// Import sub-screens
import { CasesDashboard } from './case-management/CasesDashboard';
import { CasesList } from './case-management/CasesList';
import { CaseProfile } from './case-management/CaseProfile';
import { PSSSessions } from './case-management/PSSSessions';
import { ActivitiesServices } from './case-management/ActivitiesServices';
import { ChildSafeSpace } from './case-management/ChildSafeSpace';
import { Referrals } from './case-management/Referrals';
import { ReportsAnalytics } from './case-management/ReportsAnalytics';

interface CaseManagementTabProps {
 projectId: string;
}

type CaseManagementScreen = 
 | 'dashboard'
 | 'cases-list'
 | 'case-profile'
 | 'pss-sessions'
 | 'activities'
 | 'css'
 | 'referrals'
 | 'reports';

export function CaseManagementTab({
 projectId }: CaseManagementTabProps) {
 const { t } = useTranslation();
 const [activeScreen, setActiveScreen] = useState<CaseManagementScreen>('dashboard');
 const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
 const { isRTL } = useLanguage();
// Define tabs in logical order (Dashboard first, Reports last)
 // The array order stays the same for both LTR and RTL
 // RTL layout is handled by dir="rtl" on the container, which naturally
 // places the first item (Dashboard) on the right side
 const screens = [
 { id: 'dashboard', label: t.caseManagement.dashboard, icon: '📊' },
 { id: 'cases-list', label: t.caseManagement.casesList, icon: '📋' },
 { id: 'pss-sessions', label: t.caseManagement.pssSessions, icon: '💬' },
 { id: 'activities', label: t.caseManagement.activities, icon: '🎯' },
 { id: 'css', label: t.caseManagement.safeSpace, icon: '🏠' },
 { id: 'referrals', label: t.caseManagement.referrals, icon: '🔄' },
 { id: 'reports', label: t.caseManagement.reports, icon: '📈' }
 ];
 
 // Handle navigation with case selection
 const handleViewCase = (caseId: number) => {
 setSelectedCaseId(caseId);
 setActiveScreen('case-profile');
 };
 
 const handleBackToCases = () => {
 setSelectedCaseId(null);
 setActiveScreen('cases-list');
 };
 
 return (
 <div className="space-y-6">
 {/* Sub-navigation */}
 <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
 <div className="flex items-center gap-2 flex-wrap">
 {screens.map((screen) => (
 <button
 key={screen.id}
 onClick={() => setActiveScreen(screen.id as CaseManagementScreen)}
 className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors flex items-center gap-2 ${activeScreen === screen.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200' }`}
 >
 <span>{screen.icon}</span>
 <span>{screen.label}</span>
 </button>
 ))}
 </div>
 </div>
 
 {/* Screen Content */}
 <div>
 {activeScreen === 'dashboard' && (
 <CasesDashboard 
 projectId={Number(projectId)} 
 onViewCase={handleViewCase}
 />
 )}
 
 {activeScreen === 'cases-list' && (
 <CasesList 
 projectId={Number(projectId)} 
 onViewCase={handleViewCase}
 />
 )}
 
 {activeScreen === 'case-profile' && selectedCaseId && (
 <CaseProfile 
 caseId={selectedCaseId} 
 onBack={handleBackToCases}
 />
 )}
 
 {activeScreen === 'pss-sessions' && (
 <PSSSessions 
 projectId={Number(projectId)}
 />
 )}
 
 {activeScreen === 'activities' && (
 <ActivitiesServices 
 projectId={Number(projectId)}
 />
 )}
 
 {activeScreen === 'css' && (
 <ChildSafeSpace 
 projectId={Number(projectId)}
 />
 )}
 
 {activeScreen === 'referrals' && (
 <Referrals 
 projectId={Number(projectId)}
 />
 )}
 
 {activeScreen === 'reports' && (
 <ReportsAnalytics 
 projectId={Number(projectId)}
 projectName="Promoting Inclusion and Social Change through Sports"
 donorName="Adidas"
 />
 )}
 </div>
 </div>
 );
}