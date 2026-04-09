/**
 * ============================================================================
 * RISK & COMPLIANCE PAGE
 * ============================================================================
 * 
 * Main page for Risk & Compliance module with tabs:
 * - Dashboard: Analytics and KPIs
 * - Risk Registry: List and manage risks
 * - Incident Log: List and manage incidents
 * 
 * ARCHITECTURE: Component → Hook → Service → tRPC Router → Database
 * GOVERNANCE: Backend-first, no localStorage, org/OU scoping enforced
 * 
 * ============================================================================
 */

import { useState } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutDashboard, ShieldAlert, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { RiskDashboardTab } from './tabs/RiskDashboardTab';
import { RiskRegistryTab } from './tabs/RiskRegistryTab';
import { IncidentLogTab } from './tabs/IncidentLogTab';
import { useLanguage } from '@/contexts/LanguageContext';
import { BackButton } from "@/components/BackButton";

export default function RiskCompliancePage() {
 const { t } = useTranslation();
  const { isRTL } = useLanguage();
console.log('DEBUG: t.riskCompliance.title =', t.riskCompliance.title);
 console.log('DEBUG: full t.riskCompliance =', t.riskCompliance);
 const { t, language } = useTranslation();
 const [, setLocation] = useLocation();
 const [activeTab, setActiveTab] = useState('dashboard');

 return (
 <div className="min-h-screen bg-gray-50/50 p-4 md:p-6 lg:p-8" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="max-w-[1600px] mx-auto space-y-6">
 {/* Header with Back Button */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
 <div className="space-y-2">
 <BackButton onClick={() => setLocation('/organization')} label={t.riskCompliance.back} />
 <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-3">
 <ShieldAlert className="h-8 w-8 text-orange-600" />
 {t.riskCompliance.title}
 </h1>
 <p className="text-gray-600">
 {t.riskCompliance.subtitle}
 </p>
 </div>
 </div>

 {/* Tabs */}
 <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
 <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
 <TabsTrigger value="dashboard" className="flex items-center gap-2">
 <LayoutDashboard className="h-4 w-4" />
 <span className="hidden sm:inline">{t.riskCompliance.dashboard}</span>
 </TabsTrigger>
 <TabsTrigger value="registry" className="flex items-center gap-2">
 <ShieldAlert className="h-4 w-4" />
 <span className="hidden sm:inline">{t.riskCompliance.riskRegistry}</span>
 </TabsTrigger>
 <TabsTrigger value="incidents" className="flex items-center gap-2">
 <AlertTriangle className="h-4 w-4" />
 <span className="hidden sm:inline">{t.riskCompliance.incidentLog}</span>
 </TabsTrigger>
 </TabsList>

 <TabsContent value="dashboard" className="space-y-6">
 <RiskDashboardTab />
 </TabsContent>

 <TabsContent value="registry" className="space-y-6">
 <RiskRegistryTab />
 </TabsContent>

 <TabsContent value="incidents" className="space-y-6">
 <IncidentLogTab />
 </TabsContent>
 </Tabs>
 </div>
 </div>
 );
}
