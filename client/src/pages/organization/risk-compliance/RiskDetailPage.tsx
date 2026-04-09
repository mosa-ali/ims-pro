import { BackButton } from "@/components/BackButton";
/**
 * ============================================================================
 * RISK DETAIL PAGE
 * ============================================================================
 * 
 * Displays detailed risk information with tabs for:
 * - Overview (full risk details and mitigation plan)
 * - Related Incidents (incidents linked to this risk)
 * - Audit History (change log from risk_history table)
 * 
 * ============================================================================
 */

import { useParams, useLocation } from 'wouter';
import { useTranslation } from '@/i18n/useTranslation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Edit, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { riskComplianceUtils } from '@/services/riskComplianceService';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { useState } from 'react';
import { RiskFormDialog } from './forms/RiskFormDialog';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from '@/components/ui/table';

export default function RiskDetailPage() {
 const { t } = useTranslation();
  const { isRTL } = useLanguage();
 const { id } = useParams<{ id: string }>();
 const [, setLocation] = useLocation();
 
 const [formOpen, setFormOpen] = useState(false);

 // Fetch risk details
 const { data: risk, isLoading, error } = trpc.riskCompliance.risks.getById.useQuery(
 { id: parseInt(id!) },
 { enabled: !!id }
 );

 // Fetch related incidents
 const { data: relatedIncidents = [] } = trpc.riskCompliance.incidents.list.useQuery(
 { relatedRiskId: parseInt(id!) },
 { enabled: !!id }
 );

 // Fetch audit history
 const { data: auditHistory = [] } = trpc.riskCompliance.risks.getHistory.useQuery(
 { riskId: parseInt(id!) },
 { enabled: !!id }
 );

 if (isLoading) {
 return (
 <div className="container py-6" dir={isRTL ? 'rtl' : 'ltr'}>
 <Skeleton className="h-8 w-64 mb-6" />
 <Card>
 <CardHeader>
 <Skeleton className="h-6 w-48" />
 </CardHeader>
 <CardContent>
 <div className="space-y-4">
 {[...Array(6)].map((_, i) => (
 <Skeleton key={i} className="h-12 w-full" />
 ))}
 </div>
 </CardContent>
 </Card>
 </div>
 );
 }

 if (error || !risk) {
 return (
 <div className="container py-6">
 <BackButton onClick={() => setLocation('/organization/risk-compliance')} label={t.organizationModule.back} />
 <Alert variant="destructive" className="mt-6">
 <AlertTriangle className="h-4 w-4" />
 <AlertDescription>
 {t.organizationModule.failedToLoadRiskDetails}
 </AlertDescription>
 </Alert>
 </div>
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
 <div className="container py-6">
 {/* Header */}
 <div className="flex items-center justify-between mb-6">
 <div className="flex items-center gap-4">
 <BackButton onClick={() => setLocation('/organization/risk-compliance')} label={t.organizationModule.back} />
 <div>
 <h1 className="text-2xl font-bold">
 {isRTL && risk.titleAr ? risk.titleAr : risk.title}
 </h1>
 <p className="text-sm text-muted-foreground">
 {risk.riskCode || `RISK-${risk.id}`}
 </p>
 </div>
 </div>
 <Button onClick={() => setFormOpen(true)}>
 <Edit className={`h-4 w-4 me-2`} />
 {t.organizationModule.edit1}
 </Button>
 </div>

 {/* Tabs */}
 <Tabs defaultValue="overview" className="space-y-6">
 <TabsList>
 <TabsTrigger value="overview">
 {t.organizationModule.overview}
 </TabsTrigger>
 <TabsTrigger value="incidents">
 {t.organizationModule.relatedIncidents} ({relatedIncidents.length})
 </TabsTrigger>
 <TabsTrigger value="history">
 {t.organizationModule.auditHistory}
 </TabsTrigger>
 </TabsList>

 {/* Overview Tab */}
 <TabsContent value="overview" className="space-y-6">
 {/* Risk Metrics */}
 <Card>
 <CardHeader>
 <CardTitle>{t.organizationModule.riskMetrics}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
 <div>
 <p className="text-sm text-muted-foreground mb-1">
 {t.organizationModule.level}
 </p>
 <Badge variant={getLevelBadgeVariant(risk.level)} className="text-base">
 {riskComplianceUtils.getLevelLabel(risk.level, 'en')}
 </Badge>
 </div>
 <div>
 <p className="text-sm text-muted-foreground mb-1">
 {t.organizationModule.score}
 </p>
 <p className="text-2xl font-bold">{risk.score}</p>
 </div>
 <div>
 <p className="text-sm text-muted-foreground mb-1">
 {t.organizationModule.likelihood}
 </p>
 <p className="text-2xl font-bold">{risk.likelihood}/5</p>
 </div>
 <div>
 <p className="text-sm text-muted-foreground mb-1">
 {t.organizationModule.impact}
 </p>
 <p className="text-2xl font-bold">{risk.impact}/5</p>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Risk Details */}
 <Card>
 <CardHeader>
 <CardTitle>{t.organizationModule.riskDetails}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <p className="text-sm font-medium text-muted-foreground mb-1">
 {t.organizationModule.category}
 </p>
 <p>{riskComplianceUtils.getCategoryLabel(risk.category, 'en')}</p>
 </div>
 <div>
 <p className="text-sm font-medium text-muted-foreground mb-1">
 {t.organizationModule.status}
 </p>
 <p>{riskComplianceUtils.getStatusLabel(risk.status, 'en')}</p>
 </div>
 <div>
 <p className="text-sm font-medium text-muted-foreground mb-1">
 {t.organizationModule.owner}
 </p>
 <p>{(isRTL && risk.ownerAr) ? risk.ownerAr : risk.owner || '-'}</p>
 </div>
 <div>
 <p className="text-sm font-medium text-muted-foreground mb-1">
 {t.organizationModule.reviewDate}
 </p>
 <p>{risk.reviewDate ? riskComplianceUtils.formatDate(risk.reviewDate) : '-'}</p>
 </div>
 </div>

 <div>
 <p className="text-sm font-medium text-muted-foreground mb-2">
 {t.organizationModule.description}
 </p>
 <p className="text-sm whitespace-pre-wrap">
 {(isRTL && risk.descriptionAr) ? risk.descriptionAr : risk.description}
 </p>
 </div>
 </CardContent>
 </Card>

 {/* Mitigation Plan */}
 <Card>
 <CardHeader>
 <CardTitle>{t.organizationModule.mitigationPlan}</CardTitle>
 </CardHeader>
 <CardContent>
 {risk.mitigation || risk.mitigationAr ? (
 <p className="text-sm whitespace-pre-wrap">
 {(isRTL && risk.mitigationAr) ? risk.mitigationAr : risk.mitigation}
 </p>
 ) : (
 <p className="text-sm text-muted-foreground italic">
 {t.organizationModule.noMitigationPlanSpecified}
 </p>
 )}
 </CardContent>
 </Card>
 </TabsContent>

 {/* Related Incidents Tab */}
 <TabsContent value="incidents">
 <Card>
 <CardHeader>
 <CardTitle>
 {t.organizationModule.incidentsRelatedToThisRisk}
 </CardTitle>
 </CardHeader>
 <CardContent>
 {relatedIncidents.length === 0 ? (
 <div className="text-center py-12 text-muted-foreground">
 <p>{t.organizationModule.noRelatedIncidents}</p>
 </div>
 ) : (
 <div className="rounded-md border">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.organizationModule.code}</TableHead>
 <TableHead>{t.organizationModule.title}</TableHead>
 <TableHead>{t.organizationModule.severity}</TableHead>
 <TableHead>{t.organizationModule.date}</TableHead>
 <TableHead>{t.organizationModule.status}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {relatedIncidents.map((incident) => (
 <TableRow key={incident.id}>
 <TableCell className="font-mono text-sm">
 {incident.incidentCode || `INC-${incident.id}`}
 </TableCell>
 <TableCell className="font-medium">
 {(isRTL && incident.titleAr) ? incident.titleAr : incident.title}
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
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>
 )}
 </CardContent>
 </Card>
 </TabsContent>

 {/* Audit History Tab */}
 <TabsContent value="history">
 <Card>
 <CardHeader>
 <CardTitle>{t.organizationModule.changeHistory}</CardTitle>
 </CardHeader>
 <CardContent>
 {auditHistory.length === 0 ? (
 <div className="text-center py-12 text-muted-foreground">
 <p>{t.organizationModule.noChangeHistory}</p>
 </div>
 ) : (
 <div className="space-y-4">
 {auditHistory.map((entry, index) => (
 <div key={index} className="flex gap-4 pb-4 border-b last:border-0">
 <div className="flex-shrink-0 w-24 text-sm text-muted-foreground">
 {riskComplianceUtils.formatDate(entry.changedAt)}
 </div>
 <div className="flex-1">
 <p className="text-sm font-medium">
 {riskComplianceUtils.getChangeTypeLabel(entry.changeType, 'en')}
 </p>
 <p className="text-sm text-muted-foreground">
 {t.organizationModule.by} {entry.changedBy || 'System'}
 </p>
 {entry.changes && (
 <p className="text-sm mt-1 text-muted-foreground">
 {entry.changes}
 </p>
 )}
 </div>
 </div>
 ))}
 </div>
 )}
 </CardContent>
 </Card>
 </TabsContent>
 </Tabs>

 {/* Edit Dialog */}
 <RiskFormDialog
 open={formOpen}
 onOpenChange={setFormOpen}
 risk={risk}
 mode="edit"
 />
 </div>
 );
}
