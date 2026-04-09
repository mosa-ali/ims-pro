import { useTranslation } from '@/i18n/useTranslation';
import { useState } from "react";
import { useLanguage } from '@/contexts/LanguageContext';
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { MapPin, Building2, Users, DollarSign, Calendar, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { BackButton } from "@/components/BackButton";

/**
 * Operating Unit Detail Page
 * Shows full operating unit information and statistics
 * URL Pattern: /platform/organizations/:shortCode/:ouSuffix
 * Example: /platform/organizations/YDH/01
 */
export default function OperatingUnitDetailPage() {
 const { language, isRTL} = useLanguage();
  const { t } = useTranslation();
const { shortCode, ouSuffix } = useParams<{ shortCode: string; ouSuffix: string }>();
 const [, navigate] = useLocation();

 // Fetch organization by shortCode
 const { data: organization, isLoading: orgLoading } = trpc.ims.organizations.getByShortCode.useQuery(
 { shortCode: shortCode || "" },
 { enabled: !!shortCode }
 );

 // Construct full operating unit code from organization shortCode and suffix
 const operatingUnitCode = organization?.shortCode && ouSuffix 
 ? `${organization.shortCode}-${ouSuffix}` 
 : "";

 // Fetch operating unit by code
 const { data: operatingUnit, isLoading: ouLoading } = trpc.ims.operatingUnits.getByCode.useQuery(
 { code: operatingUnitCode },
 { enabled: !!operatingUnitCode }
 );

 // Fetch operating unit statistics
 const { data: statistics, isLoading: statsLoading } = trpc.ims.operatingUnits.getStatistics.useQuery(
 { operatingUnitId: operatingUnit?.id || 0 },
 { enabled: !!operatingUnit?.id }
 );

 // Fetch compliance alerts
 const { data: complianceAlerts, isLoading: alertsLoading } = trpc.ims.operatingUnits.getComplianceAlerts.useQuery(
 { operatingUnitId: operatingUnit?.id || 0 },
 { enabled: !!operatingUnit?.id }
 );

 const isLoading = orgLoading || ouLoading;

 if (isLoading) {
 return (
 <div className="container py-8" dir={isRTL ? 'rtl' : 'ltr'}>
 <p className="text-muted-foreground">{t.operatingUnitDetailPage.loading}</p>
 </div>
 );
 }

 if (!organization || !operatingUnit) {
 return (
 <div className="container py-8">
 <div className="text-center py-12">
 <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
 <h3 className="text-lg font-semibold mb-2">Operating unit not found</h3>
 <BackButton onClick={() => navigate(`/platform/organizations/${shortCode}`)} label={t.common.backToOrganization} />
 </div>
 </div>
 );
 }

 return (
 <div className="container py-8">
 {/* Back Button */}
 <BackButton onClick={() => navigate(`/platform/organizations/${shortCode}`)} label={t.common.backToOrganization} />

 {/* Header */}
 <div className="mb-8">
 <div className="flex items-start justify-between">
 <div className="flex items-start gap-4">
 <div className="p-3 bg-primary/10 rounded-lg">
 <MapPin className="w-8 h-8 text-primary" />
 </div>
 <div>
 <h1 className="text-3xl font-bold text-foreground mb-2">{operatingUnit.name}</h1>
 <div className="flex items-center gap-4 text-muted-foreground">
 <div className="flex items-center gap-2">
 <Building2 className="w-4 h-4" />
 <span>{organization.name}</span>
 </div>
 <span>•</span>
 <div className="flex items-center gap-2">
 <MapPin className="w-4 h-4" />
 <span>{operatingUnit.country}</span>
 </div>
 <span>•</span>
 <span className={`px-2 py-0.5 rounded-full text-sm ${ operatingUnit.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700' }`}>
 {t.operatingUnitDetailPage.status}
 </span>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Statistics */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
 <Card>
 <CardHeader className="pb-3">
 <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
 <Users className="w-4 h-4" />
 Total Employees
 </CardTitle>
 </CardHeader>
 <CardContent>
 {statsLoading ? (
 <div className="text-2xl font-bold text-muted-foreground">...</div>
 ) : (
 <>
 <div className="text-2xl font-bold">{statistics?.totalEmployees || 0}</div>
 <p className="text-xs text-muted-foreground mt-1">Full-time staff</p>
 </>
 )}
 </CardContent>
 </Card>

 <Card>
 <CardHeader className="pb-3">
 <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
 <Building2 className="w-4 h-4" />
 Active Projects
 </CardTitle>
 </CardHeader>
 <CardContent>
 {statsLoading ? (
 <div className="text-2xl font-bold text-muted-foreground">...</div>
 ) : (
 <>
 <div className="text-2xl font-bold">{statistics?.activeProjects || 0}</div>
 <p className="text-xs text-muted-foreground mt-1">Across all programs</p>
 </>
 )}
 </CardContent>
 </Card>

 <Card>
 <CardHeader className="pb-3">
 <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
 <DollarSign className="w-4 h-4" />
 Budget Allocation
 </CardTitle>
 </CardHeader>
 <CardContent>
 {statsLoading ? (
 <div className="text-2xl font-bold text-muted-foreground">...</div>
 ) : (
 <>
 <div className="text-2xl font-bold">
 ${statistics?.totalBudget ? (statistics.totalBudget / 1000000).toFixed(1) : 0}M
 </div>
 <p className="text-xs text-muted-foreground mt-1">
 {statistics?.budgetExecution || 0}% execution rate
 </p>
 </>
 )}
 </CardContent>
 </Card>
 </div>

 {/* Compliance Alerts */}
 {complianceAlerts && complianceAlerts.length > 0 && (
 <Card className="mb-8 border-orange-200 bg-orange-50/50">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-orange-900">
 <AlertCircle className="w-5 h-5" />
 Compliance Alerts
 </CardTitle>
 <CardDescription>Items requiring attention</CardDescription>
 </CardHeader>
 <CardContent>
 <div className="space-y-3">
 {complianceAlerts.map((alert, index) => (
 <div
 key={index}
 className="flex items-start gap-3 p-3 bg-white rounded-lg border border-orange-200"
 >
 <div className="flex-shrink-0">
 <span
 className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${ alert.priority === 'high' ? 'bg-red-100 text-red-700' : alert.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700' }`}
 >
 {alert.priority?.toUpperCase()}
 </span>
 </div>
 <div className="flex-1">
 <h4 className="font-semibold text-foreground mb-1">{alert.title}</h4>
 <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
 {alert.projectCode && (
 <p className="text-xs text-muted-foreground">
 Project: <span className="font-mono">{alert.projectCode}</span>
 {alert.variance && ` • Variance: ${alert.variance.toFixed(1)}%`}
 </p>
 )}
 {alert.daysAgo && (
 <p className="text-xs text-muted-foreground">
 {alert.daysAgo} days ago
 </p>
 )}
 </div>
 </div>
 ))}
 </div>
 </CardContent>
 </Card>
 )}

 {/* Operating Unit Information */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <Card>
 <CardHeader>
 <CardTitle>Operating Unit Information</CardTitle>
 <CardDescription>Basic details and configuration</CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <div>
 <p className="text-sm font-medium text-muted-foreground">Code</p>
 <p className="text-foreground font-mono">{operatingUnit.code}</p>
 </div>
 <div>
 <p className="text-sm font-medium text-muted-foreground">Type</p>
 <p className="text-foreground capitalize">{operatingUnit.type?.replace('_', ' ')}</p>
 </div>
 <div>
 <p className="text-sm font-medium text-muted-foreground">Country</p>
 <p className="text-foreground">{operatingUnit.country}</p>
 </div>
 <div>
 <p className="text-sm font-medium text-muted-foreground">Status</p>
 <span className={`px-2 py-0.5 rounded-full text-sm ${ operatingUnit.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700' }`}>
 {t.operatingUnitDetailPage.status}
 </span>
 </div>
 </CardContent>
 </Card>

 <Card>
 <CardHeader>
 <CardTitle>Metadata</CardTitle>
 <CardDescription>Creation and update information</CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 <div>
 <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
 <Calendar className="w-4 h-4" />
 Created At
 </p>
 <p className="text-foreground">
 {operatingUnit.createdAt ? format(new Date(operatingUnit.createdAt), "MMMM do, yyyy") : "-"}
 </p>
 </div>
 <div>
 <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
 <Calendar className="w-4 h-4" />
 Last Updated
 </p>
 <p className="text-foreground">
 {operatingUnit.updatedAt ? format(new Date(operatingUnit.updatedAt), "MMMM do, yyyy") : "-"}
 </p>
 </div>
 </CardContent>
 </Card>
 </div>
 </div>
 );
}
