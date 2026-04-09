import { BackButton } from "@/components/BackButton";
/**
 * ============================================================================
 * INCIDENT LOG PAGE (Standalone)
 * ============================================================================
 * 
 * Displays list of incidents with filtering and CRUD operations
 * 
 * Accessed from: Cards Grid Landing View → Incident Log card
 * 
 * ============================================================================
 */

import { useLanguage } from '@/contexts/LanguageContext';
import { useState } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Filter, Download } from 'lucide-react';
import { useIncidentsList } from '@/hooks/useIncidentsData';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

export function IncidentLogPage() {
const { t, language } = useTranslation();
  const { isRTL } = useLanguage();
 const [filters, setFilters] = useState<any>({});
 const { incidents, isLoading, error } = useIncidentsList(filters);
 const [formOpen, setFormOpen] = useState(false);
 const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
 const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

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
 {incidents.length === 0 ? (
 <div className="text-center py-12 text-muted-foreground">
 <p>{t.riskCompliance.noIncidentsRegistered}</p>
 <Button variant="outline" size="sm" className="mt-4" onClick={handleCreateClick}>
 <Plus className={`h-4 w-4 me-2`} />
 {t.riskCompliance.addFirstIncident}
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
 <TableHead>{t.organizationModule.severity}</TableHead>
 <TableHead>{t.organizationModule.date}</TableHead>
 <TableHead>{t.organizationModule.status}</TableHead>
 <TableHead>{t.organizationModule.relatedRisk}</TableHead>
 <TableHead className="text-center">{t.organizationModule.actions}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {incidents.map((incident) => (
 <TableRow key={incident.id}>
 <TableCell className="font-mono text-sm">
 {incident.incidentCode || '-'}
 </TableCell>
 <TableCell className="font-medium">
 {isRTL && incident.titleAr ? incident.titleAr : incident.title}
 </TableCell>
 <TableCell>
 {riskComplianceUtils.getCategoryLabel(incident.category, 'en')}
 </TableCell>
 <TableCell>
 <Badge variant={getSeverityBadgeVariant(incident.severity)}>
 {riskComplianceUtils.getSeverityLabel(incident.severity, 'en')}
 </Badge>
 </TableCell>
 <TableCell>
 {riskComplianceUtils.formatDate(incident.incidentDate)}
 </TableCell>
 <TableCell>
 {riskComplianceUtils.getStatusLabel(incident.status, 'en')}
 </TableCell>
 <TableCell>
 {incident.relatedRiskTitle || '-'}
 </TableCell>
 <TableCell className="text-end">
 <Button variant="ghost" size="sm" onClick={() => handleEditClick(incident)}>
 {t.organizationModule.edit1}
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
