/**
 * ============================================================================
 * RISK REGISTRY PAGE (Standalone) - WITH PAGINATION
 * ============================================================================
 * 
 * Displays list of risks with filtering and CRUD operations
 * Paginated: 25 items per page with numbered pagination (1, 2, 3...)
 * 
 * Accessed from: Cards Grid Landing View → Risk Registry card
 * 
 * ============================================================================
 */

import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useMemo } from 'react';
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
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';
import { BackButton } from '@/components/BackButton';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from '@/components/ui/table';
import {
 Pagination,
 PaginationContent,
 PaginationItem,
 PaginationLink,
 PaginationPrevious,
 PaginationNext,
 PaginationEllipsis,
} from '@/components/ui/pagination';

// ─── Constants ────────────────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 25;

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
 const [currentPage, setCurrentPage] = useState(1);
 const { currentOrganization } = useOrganization();
  const { currentOperatingUnit } = useOperatingUnit();
 const organizationId = currentOrganization?.id || 0;
 const operatingUnitId = currentOperatingUnit?.id;
  
 
 // Fetch projects for dropdown (context will fill organizationId/operatingUnitId)
  const { data: projectsData = [] } = trpc.projects.list.useQuery({});
 
 // Mutation for evaluating project risks
// ✅ CORRECT - Mutation defined once
const evaluateProjectMutation = trpc.riskCompliance.evaluateProject.useMutation({
  onSuccess: (data) => {
    toast.success(
      `${data.risksCreated} risks created, ${data.risksUpdated} risks updated`
    );
    setIsEvaluating(false);
    setCurrentPage(1); // Reset to first page
    window.location.reload();
  },
  onError: () => {
    toast.error("Failed to evaluate project risks");
    setIsEvaluating(false);
  },
});

// ✅ CORRECT - Mutation only called when button is clicked
const handleAutoDetectClick = () => {
  if (!selectedProjectId) {
    toast.error("Please select a project first");
    return;
  }

  setIsEvaluating(true);

  // ✅ Only called when user clicks the button
  evaluateProjectMutation.mutate({
    projectId: selectedProjectId!,
    organizationId,
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

 // ─── Pagination Logic ─────────────────────────────────────────────────────
 const paginationData = useMemo(() => {
   const totalItems = risks?.length || 0;
   const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
   
   // Ensure current page is valid
   const validPage = Math.min(Math.max(1, currentPage), totalPages || 1);
   
   const startIdx = (validPage - 1) * ITEMS_PER_PAGE;
   const endIdx = startIdx + ITEMS_PER_PAGE;
   const paginatedRisks = risks?.slice(startIdx, endIdx) || [];
   
   return {
     totalItems,
     totalPages,
     currentPage: validPage,
     paginatedRisks,
     startIdx,
     endIdx,
   };
 }, [risks, currentPage]);

 // Generate pagination page numbers with ellipsis
 const getPaginationPages = () => {
   const { totalPages, currentPage } = paginationData;
   const pages: (number | string)[] = [];
   
   if (totalPages <= 7) {
     // Show all pages if 7 or fewer
     for (let i = 1; i <= totalPages; i++) {
       pages.push(i);
     }
   } else {
     // Show first page
     pages.push(1);
     
     // Show ellipsis if needed
     if (currentPage > 3) {
       pages.push('...');
     }
     
     // Show pages around current page
     const start = Math.max(2, currentPage - 1);
     const end = Math.min(totalPages - 1, currentPage + 1);
     for (let i = start; i <= end; i++) {
       if (!pages.includes(i)) {
         pages.push(i);
       }
     }
     
     // Show ellipsis if needed
     if (currentPage < totalPages - 2) {
       pages.push('...');
     }
     
     // Show last page
     if (!pages.includes(totalPages)) {
       pages.push(totalPages);
     }
   }
   
   return pages;
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
 {paginationData.totalItems === 0 ? (
 <div className="text-center py-12 text-muted-foreground">
 <p>{t.riskCompliance.noRisksRegistered}</p>
 <Button variant="outline" size="sm" className="mt-4" onClick={handleCreateClick}>
 <Plus className={`h-4 w-4 me-2`} />
 {t.riskCompliance.addFirstRisk}
 </Button>
 </div>
 ) : (
 <div className="space-y-4">
   {/* Results Counter */}
   <div className="text-sm text-muted-foreground">
     Showing {paginationData.startIdx + 1} to {Math.min(paginationData.endIdx, paginationData.totalItems)} of {paginationData.totalItems} risks
   </div>

   {/* Table */}
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
   {paginationData.paginatedRisks.map((risk) => (
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

   {/* Pagination Controls */}
   {paginationData.totalPages > 1 && (
     <div className="mt-6">
       <Pagination>
         <PaginationContent>
           {/* Previous Button */}
           <PaginationItem>
             <PaginationPrevious
               href="#"
               onClick={(e) => {
                 e.preventDefault();
                 if (paginationData.currentPage > 1) {
                   setCurrentPage(paginationData.currentPage - 1);
                 }
               }}
               className={paginationData.currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
             />
           </PaginationItem>

           {/* Page Numbers */}
           {getPaginationPages().map((page, idx) => (
             <PaginationItem key={idx}>
               {page === '...' ? (
                 <PaginationEllipsis />
               ) : (
                 <PaginationLink
                   href="#"
                   isActive={page === paginationData.currentPage}
                   onClick={(e) => {
                     e.preventDefault();
                     setCurrentPage(page as number);
                   }}
                 >
                   {page}
                 </PaginationLink>
               )}
             </PaginationItem>
           ))}

           {/* Next Button */}
           <PaginationItem>
             <PaginationNext
               href="#"
               onClick={(e) => {
                 e.preventDefault();
                 if (paginationData.currentPage < paginationData.totalPages) {
                   setCurrentPage(paginationData.currentPage + 1);
                 }
               }}
               className={paginationData.currentPage === paginationData.totalPages ? 'pointer-events-none opacity-50' : ''}
             />
           </PaginationItem>
         </PaginationContent>
       </Pagination>
     </div>
   )}
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
