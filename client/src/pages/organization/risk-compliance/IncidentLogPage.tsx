/**
 * ============================================================================
 * INCIDENT LOG PAGE (Standalone) - WITH PAGINATION
 * ============================================================================
 * 
 * Displays list of incidents with filtering and CRUD operations
 * Paginated: 25 items per page with numbered pagination (1, 2, 3...)
 * 
 * Accessed from: Cards Grid Landing View → Incident Log card
 * 
 * ============================================================================
 */

import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useMemo } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Filter, Download } from 'lucide-react';
import { useIncidentsList } from '@/hooks/useIncidentsData';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BackButton } from '@/components/BackButton';
import { Badge } from '@/components/ui/badge';
import { riskComplianceUtils } from '@/services/riskComplianceService';
import { IncidentFormDialog } from './forms/IncidentFormDialog';
import { exportIncidentsToCSV } from '@/lib/riskExportUtils';
import type { Incident } from '@/services/riskComplianceService';
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

export function IncidentLogPage() {
 const { t, language } = useTranslation();
 const { isRTL } = useLanguage();
 const [filters, setFilters] = useState<any>({});
 const { incidents, isLoading, error } = useIncidentsList(filters);
 const [formOpen, setFormOpen] = useState(false);
 const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
 const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
 const [currentPage, setCurrentPage] = useState(1);

 const handleCreateClick = () => {
 setSelectedIncident(null);
 setFormMode('create');
 setFormOpen(true);
 };

 const handleExportClick = () => {
 if (incidents && incidents.length > 0) {
 exportIncidentsToCSV(incidents);
 }
 };

 const handleEditClick = (incident: Incident) => {
 setSelectedIncident(incident);
 setFormMode('edit');
 setFormOpen(true);
 };

 // ─── Pagination Logic ─────────────────────────────────────────────────────
 const paginationData = useMemo(() => {
   const totalItems = incidents?.length || 0;
   const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
   
   // Ensure current page is valid
   const validPage = Math.min(Math.max(1, currentPage), totalPages || 1);
   
   const startIdx = (validPage - 1) * ITEMS_PER_PAGE;
   const endIdx = startIdx + ITEMS_PER_PAGE;
   const paginatedIncidents = incidents?.slice(startIdx, endIdx) || [];
   
   return {
     totalItems,
     totalPages,
     currentPage: validPage,
     paginatedIncidents,
     startIdx,
     endIdx,
   };
 }, [incidents, currentPage]);

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
 {t.riskCompliance.errorLoading}
 </AlertDescription>
 </Alert>
 );
 }

 const getSeverityBadgeVariant = (severity: string) => {
 switch (severity) {
 case 'minor': return 'default';
 case 'moderate': return 'secondary';
 case 'major': return 'destructive';
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
 {t.riskCompliance.incidentLog}
 </h1>
 <p className="text-sm text-gray-600 mt-1">
 {t.organizationModule.trackAndManageIncidentsAndMonitor}
 </p>
 </div>

 {/* Header Actions */}
 <Card>
 <CardHeader>
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
 <CardTitle className="text-xl">
 {t.riskCompliance.incidentLog}
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
 {t.riskCompliance.addIncident}
 </Button>
 </div>
 </div>
 </CardHeader>
 <CardContent>
 {paginationData.totalItems === 0 ? (
 <div className="text-center py-12 text-muted-foreground">
 <p>{t.riskCompliance.noIncidentsRegistered}</p>
 <Button variant="outline" size="sm" className="mt-4" onClick={handleCreateClick}>
 <Plus className={`h-4 w-4 me-2`} />
 {t.riskCompliance.addFirstIncident}
 </Button>
 </div>
 ) : (
 <div className="space-y-4">
   {/* Results Counter */}
   <div className="text-sm text-muted-foreground">
     Showing {paginationData.startIdx + 1} to {Math.min(paginationData.endIdx, paginationData.totalItems)} of {paginationData.totalItems} incidents
   </div>

   {/* Table */}
   <div className="rounded-md border">
   <Table>
   <TableHeader>
   <TableRow>
   <TableHead>{t.organizationModule.code}</TableHead>
   <TableHead>{t.organizationModule.title}</TableHead>
   <TableHead>{t.organizationModule.severity}</TableHead>
   <TableHead>{t.organizationModule.status}</TableHead>
   <TableHead>{t.incidentFormDialog.reportedByEn}</TableHead>
   <TableHead>{t.riskCompliance.reportedDate}</TableHead>
   <TableHead className="text-center">{t.organizationModule.actions}</TableHead>
   </TableRow>
   </TableHeader>
   <TableBody>
   {paginationData.paginatedIncidents.map((incident: any) => (
   <TableRow key={incident.id}>
   <TableCell className="font-mono text-sm">
   {incident.incidentCode || '-'}
   </TableCell>
   <TableCell className="font-medium">
   {isRTL && incident.titleAr ? incident.titleAr : incident.title}
   </TableCell>
   <TableCell>
   <Badge variant={getSeverityBadgeVariant(incident.severity)}>
   {riskComplianceUtils.getSeverityLabel(incident.severity, 'en')}
   </Badge>
   </TableCell>
   <TableCell>
   {riskComplianceUtils.getIncidentStatusLabel(incident.status, 'en')}
   </TableCell>
   <TableCell>{(incident as any).reportedByName || '-'}</TableCell>
   <TableCell>{(incident as any).reportedDate ? new Date((incident as any).reportedDate).toLocaleDateString() : '-'}</TableCell>
   <TableCell className="text-end">
   <Button variant="ghost" size="sm" onClick={() => handleEditClick(incident)}>
   {t.organizationModule.edit}
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

 {/* Incident Form Dialog */}
 <IncidentFormDialog
 open={formOpen}
 onOpenChange={setFormOpen}
 incident={selectedIncident}
 mode={formMode}
 />
 </div>
 );
}

export default IncidentLogPage;
