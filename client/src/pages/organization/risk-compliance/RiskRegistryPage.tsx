import { BackButton } from "@/components/BackButton";
/**
 * ============================================================================
 * RISK REGISTRY PAGE (Standalone)
 * ============================================================================
 * 
 * Displays list of risks with filtering and CRUD operations
 * 
 * Accessed from: Cards Grid Landing View → Risk Registry card
 * 
 * ============================================================================
 */

import { useLanguage } from '@/contexts/LanguageContext';
import { useState } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { useLocation, Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Filter, Download, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
// Select component removed - using native HTML select for consistency with MEAL
import { useRisksList } from '@/hooks/useRisksData';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { riskComplianceUtils } from '@/services/riskComplianceService';
import { RiskFormDialog } from './forms/RiskFormDialog';
import { exportRisksToCSV } from '@/lib/riskExportUtils';
import type { Risk } from '@/services/riskComplianceService';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from '@/components/ui/table';

export function RiskRegistryPage() {
const { t, language } = useTranslation();
  const { isRTL } = useLanguage();
 const [, setLocation] = useLocation();
 const [filters, setFilters] = useState<any>({});
 const { risks, isLoading, error } = useRisksList(filters);
 const [formOpen, setFormOpen] = useState(false);
 const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
 const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
 const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
 const [isEvaluating, setIsEvaluating] = useState(false);

 // Fetch projects for dropdown (context will fill organizationId/operatingUnitId)
 const { data: projectsData = [] } = trpc.projects.list.useQuery({});

 // Mutation for evaluating project risks
 const evaluateProjectMutation = trpc.riskCompliance.risks.evaluateProject.useMutation({
 onSuccess: (data) => {
 toast.success(
 `${data.risksCreated} risks created, ${data.risksUpdated} risks updated`
 );
 setIsEvaluating(false);
 // Refresh risks list
 window.location.reload();
 },
 onError: (error) => {
 toast.error(
 'Failed to evaluate project risks'
 );
 setIsEvaluating(false);
 console.error('Risk evaluation error:', error);
 },
 });

 const handleAutoDetectClick = () => {
 if (!selectedProjectId) {
 toast.error(
 'Please select a project first'
 );
 return;
 }

 setIsEvaluating(true);
 evaluateProjectMutation.mutate({
 projectId: selectedProjectId,
 });
 };

 const handleCreateClick = () => {
 setSelectedRisk(null);
 setFormMode('create');
 setFormOpen(true);
 };

 const handleExportClick = () => {
 if (risks && risks.length > 0) {
 exportRisksToCSV(risks);
 }
 };

 const handleViewClick = (riskId: number) => {
 setLocation(`/organization/risk-compliance/${riskId}`);
 };

 if (isLoading) {
 return (
 <Card>
 <CardHeader>
 <Skeleton className="h-6 w-32" />
 </CardHeader>
 <CardContent>
 <div className="space-y-2">
 {[...Array(5)].map((_, i) => (
 <Skeleton key={i} className="h-12 w-full" />
 ))}
 </div>
 </CardContent>
 </Card>
 );
 }

 if (error) {
 return (
 <Alert variant="destructive">
 <AlertDescription>
 {t.organizationModule.failedToLoadRiskRegistry}
 </AlertDescription>
 </Alert>
 );
 }

 const getLevelBadgeVariant = (level: string) => {
 switch (level) {
 case 'low': return 'default';
 case 'medium': return 'secondary';
 case 'high': return 'destructive';
 case 'critical': return 'destructive';
 default: return 'default';
 }
 };

 return (
 <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Back to Risk & Compliance Link */}
 <BackButton href="/organization/risk-compliance" label={t.organizationModule.backToRiskCompliance} />

 {/* Page Title */}
 <div>
 <h1 className="text-3xl font-bold text-gray-900">
 {t.riskCompliance.riskRegistry}
 </h1>
 <p className="text-sm text-gray-600 mt-1">
 {t.organizationModule.identifyAssessAndManageOrganizationalRisks}
 </p>
 </div>

 {/* Header Actions */}
 <Card>
 <CardHeader>
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
 <CardTitle className="text-xl">
 {t.riskCompliance.riskRegistry}
 </CardTitle>
 <div className="flex flex-wrap gap-2">
 {/* Project Selector for Auto-Detect */}
 <select
 value={selectedProjectId || ''}
 onChange={(e) => {
 const val = e.target.value;
 setSelectedProjectId(val ? parseInt(val) : null);
 }}
 className="w-[200px] px-4 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
 >
 <option value="">{t.organizationModule.selectProject29}</option>
 {projectsData?.map((project: any) => (
 <option key={project.id} value={project.id}>
 {isRTL
 ? (project.titleAr || project.title || project.titleEn)
 : (project.title || project.titleEn)
 }
 </option>
 ))}
 </select>

 {/* Auto-Detect Risks Button */}
 <Button 
 variant="default" 
 size="sm" 
 onClick={handleAutoDetectClick}
 disabled={isEvaluating || !selectedProjectId}
 className="bg-blue-600 hover:bg-blue-700"
 >
 <Sparkles className={`h-4 w-4 me-2`} />
 {isEvaluating 
 ? (t.organizationModule.evaluating) 
 : (t.organizationModule.autodetect)}
 </Button>

 <Button variant="outline" size="sm">
 <Filter className={`h-4 w-4 me-2`} />
 {t.riskCompliance.filter}
 </Button>
 <Button variant="outline" size="sm" onClick={handleExportClick}>
 <Download className={`h-4 w-4 me-2`} />
 {t.riskCompliance.export}
 </Button>
 <Button size="sm" onClick={handleCreateClick}>
 <Plus className={`h-4 w-4 me-2`} />
 {t.riskCompliance.addRisk}
 </Button>
 </div>
 </div>
 </CardHeader>
 <CardContent>
 {risks.length === 0 ? (
 <div className="text-center py-12 text-muted-foreground">
 <p>{t.riskCompliance.noRisksRegistered}</p>
 <Button variant="outline" size="sm" className="mt-4" onClick={handleCreateClick}>
 <Plus className={`h-4 w-4 me-2`} />
 {t.riskCompliance.addFirstRisk}
 </Button>
 </div>
 ) : (
 <div className="rounded-md border">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.organizationModule.code}</TableHead>
 <TableHead>{t.organizationModule.title}</TableHead>
 <TableHead>{t.organizationModule.category}</TableHead>
 <TableHead>{t.organizationModule.level}</TableHead>
 <TableHead>{t.organizationModule.score}</TableHead>
 <TableHead>{t.organizationModule.status}</TableHead>
 <TableHead>{t.organizationModule.owner}</TableHead>
 <TableHead className="text-center">{t.organizationModule.actions}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {risks.map((risk) => (
 <TableRow key={risk.id}>
 <TableCell className="font-mono text-sm">
 {risk.riskCode || '-'}
 </TableCell>
 <TableCell className="font-medium">
 {isRTL && risk.titleAr ? risk.titleAr : risk.title}
 </TableCell>
 <TableCell>
 {riskComplianceUtils.getCategoryLabel(risk.category, 'en')}
 </TableCell>
 <TableCell>
 <Badge variant={getLevelBadgeVariant(risk.level)}>
 {riskComplianceUtils.getLevelLabel(risk.level, 'en')}
 </Badge>
 </TableCell>
 <TableCell className="font-bold">{risk.score}</TableCell>
 <TableCell>
 {riskComplianceUtils.getStatusLabel(risk.status, 'en')}
 </TableCell>
 <TableCell>{risk.ownerName || '-'}</TableCell>
 <TableCell className="text-end">
 <Button variant="ghost" size="sm" onClick={() => handleViewClick(risk.id)}>
 {t.organizationModule.view}
 </Button>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>
 )}
 </CardContent>
 </Card>

 {/* Risk Form Dialog */}
 <RiskFormDialog
 open={formOpen}
 onOpenChange={setFormOpen}
 risk={selectedRisk}
 mode={formMode}
 />
 </div>
 );
}

export default RiskRegistryPage;
