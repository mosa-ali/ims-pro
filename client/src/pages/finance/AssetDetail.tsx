/**
 * Asset Detail Workspace Page
 * 
 * Full workspace page for viewing a single asset's details.
 * New detail page (no prior modal existed) — consolidates asset info,
 * depreciation, maintenance history, transfers, and disposals.
 * 
 * Route: /organization/finance/assets/:id
 * 
 * Features:
 * - Asset header with status badge and condition indicator
 * - KPI cards: Acquisition Cost, Current Value, Accumulated Depreciation, Useful Life
 * - Tabs: General Info, Depreciation, Maintenance History, Transfers, Disposal
 * - Full bilingual support (Arabic/English) with RTL/LTR
 */
import { useMemo } from "react";
import { useParams } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useNavigate } from "@/lib/router-compat";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
 ArrowLeft, ArrowRight, Package, Loader2, DollarSign, TrendingDown,
 Calendar, MapPin, User, FileText, Wrench, ArrowRightLeft, XCircle,
 Building, Tag, Clock, AlertTriangle, CheckCircle, Shield
} from "lucide-react";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

// ============================================================================
// CONSTANTS
// ============================================================================
const assetStatuses = [
 { value: "active", labelEn: "Active", labelAr: "نشط", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
 { value: "in_maintenance", labelEn: "In Maintenance", labelAr: "قيد الصيانة", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
 { value: "disposed", labelEn: "Disposed", labelAr: "تم التخلص منه", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400" },
 { value: "lost", labelEn: "Lost", labelAr: "مفقود", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
 { value: "transferred", labelEn: "Transferred", labelAr: "منقول", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
 { value: "pending_disposal", labelEn: "Pending Disposal", labelAr: "في انتظار التخلص", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
];

const assetConditions = [
 { value: "excellent", labelEn: "Excellent", labelAr: "ممتاز" },
 { value: "good", labelEn: "Good", labelAr: "جيد" },
 { value: "fair", labelEn: "Fair", labelAr: "مقبول" },
 { value: "poor", labelEn: "Poor", labelAr: "ضعيف" },
 { value: "non_functional", labelEn: "Non-Functional", labelAr: "غير صالح" },
];

const depreciationMethods = [
 { value: "straight_line", labelEn: "Straight Line", labelAr: "القسط الثابت" },
 { value: "declining_balance", labelEn: "Declining Balance", labelAr: "القسط المتناقص" },
 { value: "units_of_production", labelEn: "Units of Production", labelAr: "وحدات الإنتاج" },
 { value: "none", labelEn: "No Depreciation", labelAr: "بدون إهلاك" },
];

const maintenanceTypes = [
 { value: "preventive", labelEn: "Preventive", labelAr: "وقائية" },
 { value: "corrective", labelEn: "Corrective", labelAr: "تصحيحية" },
 { value: "inspection", labelEn: "Inspection", labelAr: "فحص" },
 { value: "upgrade", labelEn: "Upgrade", labelAr: "ترقية" },
 { value: "repair", labelEn: "Repair", labelAr: "إصلاح" },
];

// ============================================================================
// TRANSLATIONS
// ============================================================================
// ============================================================================
// HELPER
// ============================================================================
function InfoField({ label, value, icon: Icon }: { label: string; value: string | null | undefined; icon?: any }) {
 return (
 <div className="space-y-1" dir={isRTL ? 'rtl' : 'ltr'}>
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{label}</Label>
 <div className="flex items-center gap-2">
 {Icon && <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
 <p className="font-medium text-sm">{value || "—"}</p>
 </div>
 </div>
 );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function AssetDetail() {
 const { t } = useTranslation();
 const { id } = useParams<{ id: string }>();
 const assetId = parseInt(id || "0", 10);
 const navigate = useNavigate();
 const { language, isRTL } = useLanguage();
 const { currentOrganization } = useOrganization();
 const organizationId = currentOrganization?.id || 0;
 // Fetch asset data
 const { data: asset, isLoading } = trpc.assets.getAssetById.useQuery(
 { id: assetId },
 { enabled: assetId > 0 }
 );

 // Fetch related data
 const { data: maintenanceRecords = [] } = trpc.assets.listMaintenance.useQuery(
 { assetId },
 { enabled: assetId > 0 }
 );
 const { data: transfers = [] } = trpc.assets.listTransfers.useQuery(
 { assetId },
 { enabled: assetId > 0 }
 );
 const { data: disposals = [] } = trpc.assets.listDisposals.useQuery(
 { assetId },
 { enabled: assetId > 0 }
 );

 const formatCurrency = (amount: string | number, currency: string = "USD") => {
 const num = typeof amount === "string" ? parseFloat(amount) : amount;
 return new Intl.NumberFormat('en-US', {
 style: "currency",
 currency,
 }).format(num || 0);
 };

 const formatDate = (date: string | Date | null | undefined) => {
 if (!date) return "—";
 return new Date(date).toLocaleDateString('en-US', {
 year: "numeric", month: "short", day: "numeric",
 });
 };

 const getStatusBadge = (status: string) => {
 const s = assetStatuses.find((st) => st.value === status);
 const label = s ? (language === "ar" ? s.labelAr : s.labelEn) : status;
 return <Badge className={s?.color || "bg-gray-100"}>{label}</Badge>;
 };

 const getConditionLabel = (cond: string) => {
 const c = assetConditions.find((co) => co.value === cond);
 return c ? (language === "ar" ? c.labelAr : c.labelEn) : cond;
 };

 const getDepreciationMethodLabel = (method: string) => {
 const m = depreciationMethods.find((dm) => dm.value === method);
 return m ? (language === "ar" ? m.labelAr : m.labelEn) : method;
 };

 const getMaintenanceTypeLabel = (type: string) => {
 const m = maintenanceTypes.find((mt) => mt.value === type);
 return m ? (language === "ar" ? m.labelAr : m.labelEn) : type;
 };

 const depreciationRate = useMemo(() => {
 if (!asset || !asset.usefulLifeYears || asset.usefulLifeYears === 0) return 0;
 if (asset.depreciationMethod === "straight_line") {
 return (100 / asset.usefulLifeYears).toFixed(2);
 }
 if (asset.depreciationMethod === "declining_balance") {
 return ((2 / asset.usefulLifeYears) * 100).toFixed(2);
 }
 return "—";
 }, [asset]);

 // Loading state
 if (isLoading) {
 return (
 <div className="container mx-auto py-6">
 <div className="flex items-center justify-center min-h-[400px]">
 <div className="text-center space-y-3">
 <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
 <p className="text-muted-foreground">{t.assetDetail.loading}</p>
 </div>
 </div>
 </div>
 );
 }

 // Not found state
 if (!asset) {
 return (
 <div className="container mx-auto py-6">
 <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
 <Package className="h-16 w-16 text-muted-foreground" />
 <h2 className="text-xl font-semibold">{t.assetDetail.notFound}</h2>
 <p className="text-muted-foreground">{t.assetDetail.notFoundDesc}</p>
 <BackButton onClick={() => navigate("/organization/finance/assets")} label={t.assetDetail.goBack} />
 </div>
 </div>
 );
 }

 return (
 <div className="container mx-auto py-6">
 <div className="space-y-6">
 {/* Back Button & Header */}
 <div>
 <BackButton onClick={() => navigate("/organization/finance/assets")} label={t.assetDetail.backToAssets} />
 <div className="flex items-start justify-between">
 <div className="text-start">
 <h1 className="text-2xl font-bold tracking-tight">{asset.name}</h1>
 <div className="flex items-center gap-3 mt-2 text-muted-foreground flex-wrap">
 <span className="font-mono text-sm">{asset.assetCode}</span>
 <span>•</span>
 {getStatusBadge(asset.status)}
 <span>•</span>
 <span>{t.assetDetail.condition}: {getConditionLabel(asset.condition)}</span>
 {asset.serialNumber && (
 <>
 <span>•</span>
 <span>S/N: {asset.serialNumber}</span>
 </>
 )}
 </div>
 </div>
 <Button
 variant="outline"
 onClick={() => navigate("/organization/finance/assets")}
 >
 {t.assetDetail.edit}
 </Button>
 </div>
 </div>

 {/* KPI Summary Cards */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <Card>
 <CardContent className="pt-5 pb-4">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-primary/10">
 <DollarSign className="w-5 h-5 text-primary" />
 </div>
 <div>
 <p className="text-xs text-muted-foreground">{t.assetDetail.acquisitionCost}</p>
 <p className="text-xl font-bold text-primary">
 {formatCurrency(asset.acquisitionCost, asset.currency || "USD")}
 </p>
 </div>
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-5 pb-4">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-green-500/10">
 <DollarSign className="w-5 h-5 text-green-500" />
 </div>
 <div>
 <p className="text-xs text-muted-foreground">{t.assetDetail.currentValue}</p>
 <p className="text-xl font-bold text-green-600">
 {formatCurrency(asset.currentValue, asset.currency || "USD")}
 </p>
 </div>
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-5 pb-4">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-amber-500/10">
 <TrendingDown className="w-5 h-5 text-amber-500" />
 </div>
 <div>
 <p className="text-xs text-muted-foreground">{t.assetDetail.accumulatedDepreciation}</p>
 <p className="text-xl font-bold text-amber-600">
 {formatCurrency(asset.accumulatedDepreciation, asset.currency || "USD")}
 </p>
 </div>
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-5 pb-4">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-blue-500/10">
 <Calendar className="w-5 h-5 text-blue-500" />
 </div>
 <div>
 <p className="text-xs text-muted-foreground">{t.assetDetail.usefulLife}</p>
 <p className="text-xl font-bold">
 {asset.usefulLifeYears || "—"} {asset.usefulLifeYears ? t.assetDetail.years : ""}
 </p>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Tabs */}
 <Tabs defaultValue="general">
 <TabsList className="flex-wrap">
 <TabsTrigger value="general" className="flex items-center gap-2">
 <Package className="h-4 w-4" />
 {t.assetDetail.generalInfo}
 </TabsTrigger>
 <TabsTrigger value="depreciation" className="flex items-center gap-2">
 <TrendingDown className="h-4 w-4" />
 {t.assetDetail.depreciation}
 </TabsTrigger>
 <TabsTrigger value="maintenance" className="flex items-center gap-2">
 <Wrench className="h-4 w-4" />
 {t.assetDetail.maintenanceHistory}
 </TabsTrigger>
 <TabsTrigger value="transfers" className="flex items-center gap-2">
 <ArrowRightLeft className="h-4 w-4" />
 {t.assetDetail.transfers}
 </TabsTrigger>
 <TabsTrigger value="disposal" className="flex items-center gap-2">
 <XCircle className="h-4 w-4" />
 {t.assetDetail.disposal}
 </TabsTrigger>
 </TabsList>

 {/* General Information Tab */}
 <TabsContent value="general" className="space-y-6 mt-4">
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">{t.assetDetail.generalInfo}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 <InfoField label={t.assetDetail.assetCode} value={asset.assetCode} icon={Tag} />
 <InfoField label={t.assetDetail.assetName} value={asset.name} icon={Package} />
 <InfoField label={t.assetDetail.subcategory} value={asset.subcategory} />
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.assetDetail.status}</Label>
 <div>{getStatusBadge(asset.status)}</div>
 </div>
 <InfoField label={t.assetDetail.condition} value={getConditionLabel(asset.condition)} />
 <InfoField label={t.assetDetail.location} value={asset.location} icon={MapPin} />
 <InfoField label={t.assetDetail.assignedTo} value={asset.assignedTo} icon={User} />
 <InfoField label={t.assetDetail.serialNumber} value={asset.serialNumber} />
 <InfoField label={t.assetDetail.manufacturer} value={asset.manufacturer} icon={Building} />
 <InfoField label={t.assetDetail.model} value={asset.model} />
 <InfoField label={t.assetDetail.warrantyExpiry} value={formatDate(asset.warrantyExpiry)} icon={Shield} />
 <InfoField label={t.assetDetail.acquisitionDate} value={formatDate(asset.acquisitionDate)} icon={Calendar} />
 </div>
 {asset.description && (
 <>
 <Separator className="my-6" />
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.assetDetail.description}</Label>
 <p className="text-sm whitespace-pre-wrap">{asset.description}</p>
 </div>
 </>
 )}
 {/* Donor/Grant Info */}
 {(asset.donorName || asset.grantCode) && (
 <>
 <Separator className="my-6" />
 <h4 className="font-semibold mb-4">{t.assetDetail.donorGrantInfo}</h4>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 <InfoField label={t.assetDetail.donorName} value={asset.donorName} />
 <InfoField label={t.assetDetail.grantCode} value={asset.grantCode} />
 </div>
 </>
 )}
 {/* Insurance Info */}
 {(asset.insurancePolicy || asset.insuranceExpiry) && (
 <>
 <Separator className="my-6" />
 <h4 className="font-semibold mb-4">{t.assetDetail.insuranceInfo}</h4>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 <InfoField label={t.assetDetail.insurancePolicy} value={asset.insurancePolicy} icon={Shield} />
 <InfoField label={t.assetDetail.insuranceExpiry} value={formatDate(asset.insuranceExpiry)} icon={Calendar} />
 </div>
 </>
 )}
 </CardContent>
 </Card>
 </TabsContent>

 {/* Depreciation Tab */}
 <TabsContent value="depreciation" className="space-y-6 mt-4">
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">{t.assetDetail.depreciation}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 <InfoField
 label={t.assetDetail.depreciationMethod}
 value={getDepreciationMethodLabel(asset.depreciationMethod)}
 icon={TrendingDown}
 />
 <InfoField
 label={t.assetDetail.usefulLifeYears}
 value={asset.usefulLifeYears ? `${asset.usefulLifeYears} ${t.assetDetail.years}` : null}
 icon={Clock}
 />
 <InfoField
 label={t.assetDetail.salvageValue}
 value={formatCurrency(asset.salvageValue, asset.currency || "USD")}
 icon={DollarSign}
 />
 <InfoField
 label={t.assetDetail.acquisitionCost}
 value={formatCurrency(asset.acquisitionCost, asset.currency || "USD")}
 icon={DollarSign}
 />
 <InfoField
 label={t.assetDetail.accumulatedDepreciation}
 value={formatCurrency(asset.accumulatedDepreciation, asset.currency || "USD")}
 icon={TrendingDown}
 />
 <InfoField
 label={t.assetDetail.currentValue}
 value={formatCurrency(asset.currentValue, asset.currency || "USD")}
 icon={DollarSign}
 />
 <InfoField
 label={t.assetDetail.depreciationRate}
 value={typeof depreciationRate === "string" ? depreciationRate : `${depreciationRate}%`}
 />
 </div>
 </CardContent>
 </Card>
 </TabsContent>

 {/* Maintenance History Tab */}
 <TabsContent value="maintenance" className="space-y-6 mt-4">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
 <Card>
 <CardContent className="pt-5 pb-4">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-blue-500/10">
 <Wrench className="w-5 h-5 text-blue-500" />
 </div>
 <div>
 <p className="text-xs text-muted-foreground">{t.assetDetail.lastMaintenance}</p>
 <p className="text-lg font-bold">{formatDate(asset.lastMaintenanceDate)}</p>
 </div>
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-5 pb-4">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-amber-500/10">
 <AlertTriangle className="w-5 h-5 text-amber-500" />
 </div>
 <div>
 <p className="text-xs text-muted-foreground">{t.assetDetail.nextMaintenance}</p>
 <p className="text-lg font-bold">{formatDate(asset.nextMaintenanceDate)}</p>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">{t.assetDetail.maintenanceHistory}</CardTitle>
 </CardHeader>
 <CardContent>
 {maintenanceRecords.length > 0 ? (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.assetDetail.maintenanceType}</TableHead>
 <TableHead>{t.assetDetail.maintenanceDescription}</TableHead>
 <TableHead>{t.assetDetail.performedBy}</TableHead>
 <TableHead>{t.assetDetail.performedDate}</TableHead>
 <TableHead className="text-end">{t.assetDetail.maintenanceCost}</TableHead>
 <TableHead>{t.assetDetail.nextDueDate}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {maintenanceRecords.map((rec: any) => (
 <TableRow key={rec.id}>
 <TableCell>
 <Badge variant="outline">{getMaintenanceTypeLabel(rec.maintenanceType)}</Badge>
 </TableCell>
 <TableCell>{rec.description || "—"}</TableCell>
 <TableCell>{rec.performedBy || rec.vendorName || "—"}</TableCell>
 <TableCell>{formatDate(rec.performedDate)}</TableCell>
 <TableCell className="text-end font-medium">
 {formatCurrency(rec.cost, rec.currency || "USD")}
 </TableCell>
 <TableCell>{formatDate(rec.nextDueDate)}</TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 ) : (
 <div className="text-center py-12 text-muted-foreground">
 <Wrench className="h-12 w-12 mx-auto mb-3 opacity-30" />
 <p>{t.assetDetail.noMaintenance}</p>
 </div>
 )}
 </CardContent>
 </Card>
 </TabsContent>

 {/* Transfers Tab */}
 <TabsContent value="transfers" className="space-y-6 mt-4">
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">{t.assetDetail.transfers}</CardTitle>
 </CardHeader>
 <CardContent>
 {transfers.length > 0 ? (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.assetDetail.transferCode}</TableHead>
 <TableHead>{t.assetDetail.fromLocation}</TableHead>
 <TableHead>{t.assetDetail.toLocation}</TableHead>
 <TableHead>{t.assetDetail.fromAssignee}</TableHead>
 <TableHead>{t.assetDetail.toAssignee}</TableHead>
 <TableHead>{t.assetDetail.transferDate}</TableHead>
 <TableHead>{t.assetDetail.transferStatus}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {transfers.map((tr: any) => (
 <TableRow key={tr.id}>
 <TableCell className="font-mono">{tr.transferCode}</TableCell>
 <TableCell>{tr.fromLocation || "—"}</TableCell>
 <TableCell>{tr.toLocation || "—"}</TableCell>
 <TableCell>{tr.fromAssignee || "—"}</TableCell>
 <TableCell>{tr.toAssignee || "—"}</TableCell>
 <TableCell>{formatDate(tr.transferDate)}</TableCell>
 <TableCell>
 <Badge variant={tr.status === "completed" ? "default" : "outline"}>
 {tr.status}
 </Badge>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 ) : (
 <div className="text-center py-12 text-muted-foreground">
 <ArrowRightLeft className="h-12 w-12 mx-auto mb-3 opacity-30" />
 <p>{t.assetDetail.noTransfers}</p>
 </div>
 )}
 </CardContent>
 </Card>
 </TabsContent>

 {/* Disposal Tab */}
 <TabsContent value="disposal" className="space-y-6 mt-4">
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">{t.assetDetail.disposal}</CardTitle>
 </CardHeader>
 <CardContent>
 {disposals.length > 0 ? (
 <div className="space-y-6">
 {disposals.map((disp: any) => (
 <div key={disp.id} className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 <InfoField label={t.assetDetail.disposalMethod} value={disp.disposalType} icon={XCircle} />
 <InfoField label={t.assetDetail.disposalDate} value={formatDate(disp.actualDate || disp.proposedDate)} icon={Calendar} />
 <InfoField label={t.assetDetail.bookValue} value={formatCurrency(disp.bookValue, asset.currency || "USD")} icon={DollarSign} />
 <InfoField label={t.assetDetail.proceeds} value={formatCurrency(disp.proceedsAmount || 0, asset.currency || "USD")} icon={DollarSign} />
 <InfoField label={t.assetDetail.gainLoss} value={formatCurrency(disp.gainLoss || 0, asset.currency || "USD")} />
 </div>
 {disp.reason && (
 <>
 <Separator />
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.assetDetail.disposalReason}</Label>
 <p className="text-sm whitespace-pre-wrap">{disp.reason}</p>
 </div>
 </>
 )}
 </div>
 ))}
 </div>
 ) : asset.status === "disposed" ? (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 <InfoField label={t.assetDetail.disposalDate} value={formatDate(asset.disposalDate)} icon={Calendar} />
 <InfoField label={t.assetDetail.disposalMethod} value={asset.disposalMethod} icon={XCircle} />
 <InfoField label={t.assetDetail.disposalValue} value={asset.disposalValue ? formatCurrency(asset.disposalValue, asset.currency || "USD") : null} icon={DollarSign} />
 {asset.disposalReason && (
 <div className="col-span-full space-y-1">
 <Label className="text-xs text-muted-foreground uppercase tracking-wider">{t.assetDetail.disposalReason}</Label>
 <p className="text-sm whitespace-pre-wrap">{asset.disposalReason}</p>
 </div>
 )}
 </div>
 ) : (
 <div className="text-center py-12 text-muted-foreground">
 <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
 <p>{t.assetDetail.noDisposal}</p>
 </div>
 )}
 </CardContent>
 </Card>
 </TabsContent>
 </Tabs>
 </div>
 </div>
 );
}
