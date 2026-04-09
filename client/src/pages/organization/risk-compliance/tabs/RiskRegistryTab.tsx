/**
 * ============================================================================
 * RISK REGISTRY TAB
 * ============================================================================
 * 
 * Displays list of risks with filtering and CRUD operations
 * 
 * ============================================================================
 */

import { useLanguage } from '@/contexts/LanguageContext';
import { useState } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Filter, Download, Zap, Activity } from 'lucide-react';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useRisksList } from '@/hooks/useRisksData';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { riskComplianceUtils } from '@/services/riskComplianceService';
import { RiskFormDialog } from '../forms/RiskFormDialog';
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

export function RiskRegistryTab() {
const { t, language } = useTranslation();
  const { isRTL } = useLanguage();
 const [, setLocation] = useLocation();
 const [filters, setFilters] = useState<any>({});
 const { risks, isLoading, error } = useRisksList(filters);
 const [formOpen, setFormOpen] = useState(false);
 const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
 const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
 const [selectedProjectId, setSelectedProjectId] = useState<string>('');
 
 // Pagination state
 const [currentPage, setCurrentPage] = useState(1);
 const [rowsPerPage, setRowsPerPage] = useState(30);
 
 // Calculate pagination
 const totalPages = Math.ceil(risks.length / rowsPerPage);
 const startIndex = (currentPage - 1) * rowsPerPage;
 const endIndex = startIndex + rowsPerPage;
 const paginatedRisks = risks.slice(startIndex, endIndex);

 // Fetch projects for Auto-Detect dropdown
 const { data: projects = [] } = trpc.projects.list.useQuery({});

 // Auto-Detect mutation
 const evaluateProject = trpc.risks.evaluateProject.useMutation({
 onSuccess: (result) => {
 toast.success(
 `Risks evaluated successfully: ${result.risksCreated} risks created, ${result.risksUpdated} risks updated`
 );
 // Refresh risks list
 window.location.reload();
 },
 onError: (error) => {
 toast.error(
 `Failed to evaluate risks: ${error.message}`
 );
 },
 });

 // Evaluate All Projects mutation
 const evaluateAll = trpc.risks.evaluateAllProjects.useMutation({
 onSuccess: (result) => {
 toast.success(
 `Evaluated ${result.projectsEvaluated} projects: ${result.totalRisksGenerated} risks generated, ${result.totalRisksUpdated} risks updated`
 );
 // Refresh risks list
 window.location.reload();
 },
 onError: (error) => {
 toast.error(
 `Failed to evaluate projects: ${error.message}`
 );
 },
 });

 const handleAutoDetect = () => {
 if (!selectedProjectId) {
 toast.error(
 'Please select a project first'
 );
 return;
 }
 toast.info(
 'Evaluating risks...'
 );
 evaluateProject.mutate({ projectId: parseInt(selectedProjectId) });
 };

 const handleEvaluateAll = () => {
 toast.info(
 'Evaluating all active projects...'
 );
 evaluateAll.mutate();
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
 {/* Auto-Detect Section */}
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">
 {t.organizationModule.autodetectRisks}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
 <div className="flex-1 space-y-2">
 <label className="text-sm font-medium">
 {t.organizationModule.selectProject30}
 </label>
 <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
 <SelectTrigger className="w-full">
 <SelectValue placeholder={t.organizationModule.selectAProject} />
 </SelectTrigger>
 <SelectContent>
 {projects.map((project) => (
 <SelectItem key={project.id} value={project.id.toString()}>
 {project.projectCode} - {isRTL ? (project.titleAr || project.titleEn) : project.titleEn}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div className="flex gap-2">
 <Button
 onClick={handleAutoDetect}
 disabled={!selectedProjectId || evaluateProject.isPending}
 className="w-full sm:w-auto"
 >
 <Zap className={`h-4 w-4 me-2`} />
 {t.organizationModule.autodetect}
 </Button>
 <Button
 onClick={handleEvaluateAll}
 disabled={evaluateAll.isPending}
 variant="outline"
 className="w-full sm:w-auto"
 >
 <Activity className={`h-4 w-4 me-2`} />
 {t.organizationModule.evaluateAllProjects}
 </Button>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Header Actions */}
 <Card>
 <CardHeader>
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
 <CardTitle className="text-xl">
 {t.riskCompliance.riskRegistry}
 </CardTitle>
 <div className="flex gap-2">
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
 {paginatedRisks.map((risk) => (
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
 
 {/* Pagination Controls */}
 {risks.length > 0 && (
 <div className="flex items-center justify-between px-2 py-4">
 <div className="text-sm text-muted-foreground">
 {`${risks.length} rows • Rows per page:`}
 </div>
 <div className="flex items-center gap-4">
 <select
 value={rowsPerPage}
 onChange={(e) => {
 setRowsPerPage(Number(e.target.value));
 setCurrentPage(1);
 }}
 className="px-3 py-1.5 rounded-md border border-border bg-background text-sm"
 >
 <option value={10}>10</option>
 <option value={20}>20</option>
 <option value={30}>30</option>
 <option value={50}>50</option>
 <option value={100}>100</option>
 <option value={300}>300</option>
 <option value={1000}>1000</option>
 </select>
 <div className="flex items-center gap-2">
 <Button
 variant="outline"
 size="sm"
 onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
 disabled={currentPage === 1}
 >
 {'‹'}
 </Button>
 <span className="text-sm">
 {currentPage} / {totalPages}
 </span>
 <Button
 variant="outline"
 size="sm"
 onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
 disabled={currentPage === totalPages}
 >
 {'›'}
 </Button>
 </div>
 </div>
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
