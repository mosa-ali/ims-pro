import { useTranslation } from '@/i18n/useTranslation';
import { useState } from "react";
import { useLanguage } from '@/contexts/LanguageContext';
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Building2, MapPin, Plus, Pencil, Trash2, Globe, DollarSign, Clock, Users, Briefcase, Eye, Cloud } from "lucide-react";
import { OperatingUnitFormModal } from "@/components/OperatingUnitFormModal";
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { BackButton } from "@/components/BackButton";
import { Microsoft365OnboardingTab } from "@/components/Microsoft365OnboardingTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Organization Detail Page
 * Shows full organization information and its operating units
 * Hierarchical navigation: Organizations List → Organization Detail → Operating Units
 */
export default function OrganizationDetailPage() {
 const { language, isRTL} = useLanguage();
  const { t } = useTranslation();
const { shortCode } = useParams<{ shortCode: string }>();
 const [, navigate] = useLocation();

 const [isCreateUnitModalOpen, setIsCreateUnitModalOpen] = useState(false);
 const [editingUnitId, setEditingUnitId] = useState<number | undefined>();
 const [deletingUnitId, setDeletingUnitId] = useState<number | undefined>();
 const [deletingUnitName, setDeletingUnitName] = useState<string>("");
 const [selectedUnitIds, setSelectedUnitIds] = useState<Set<number>>(new Set());
 const [isBulkOperating, setIsBulkOperating] = useState(false);
 const [activeTab, setActiveTab] = useState<"details" | "microsoft365">("details");

 // Fetch organization details by shortCode
 const { data: organization, isLoading: orgLoading } = trpc.ims.organizations.getByShortCode.useQuery(
 { shortCode: shortCode || "" },
 { enabled: !!shortCode }
 );

 const organizationId = organization?.id || 0;

 // Fetch operating units for this organization
 const { data: operatingUnits = [], isLoading: unitsLoading } = trpc.ims.operatingUnits.listByOrganization.useQuery(
 { organizationId },
 { enabled: !!organizationId }
 );

 // Fetch organization admins
 const { data: admins = [] } = trpc.ims.getOrganizationAdmins.useQuery(
 { organizationId },
 { enabled: !!organizationId }
 );

 const utils = trpc.useUtils();
 const softDeleteMutation = trpc.ims.operatingUnits.softDelete.useMutation({
 onSuccess: () => {
 toast.success(t.organizationDetailPage.deletedSuccessfully);
 utils.ims.operatingUnits.listByOrganization.invalidate({ organizationId });
 setDeletingUnitId(undefined);
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const handleDeleteClick = (unitId: number, unitName: string) => {
 setDeletingUnitId(unitId);
 setDeletingUnitName(unitName);
 };

 const handleDeleteConfirm = () => {
 if (deletingUnitId) {
 softDeleteMutation.mutate({ id: deletingUnitId });
 }
 };

 const toggleUnitSelection = (unitId: number) => {
 const newSelected = new Set(selectedUnitIds);
 if (newSelected.has(unitId)) {
 newSelected.delete(unitId);
 } else {
 newSelected.add(unitId);
 }
 setSelectedUnitIds(newSelected);
 };

 const toggleSelectAll = () => {
 if (selectedUnitIds.size === operatingUnits.length) {
 setSelectedUnitIds(new Set());
 } else {
 setSelectedUnitIds(new Set(operatingUnits.map((u: any) => u.id)));
 }
 };

 // Bulk delete mutation
 const bulkDeleteMutation = trpc.ims.operatingUnits.bulkSoftDelete.useMutation({
 onSuccess: (data) => {
 toast.success(t.organizationDetailPage.bulkDeleteSuccess);
 setSelectedUnitIds(new Set());
 utils.ims.operatingUnits.listByOrganization.invalidate({ organizationId });
 setIsBulkDeleting(false);
 setShowBulkDeleteConfirm(false);
 },
 onError: (error) => {
 toast.error(error.message);
 setIsBulkDeleting(false);
 },
 });

 const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
 const [isBulkDeleting, setIsBulkDeleting] = useState(false);

 const handleBulkDeleteClick = () => {
 if (selectedUnitIds.size === 0) {
 toast.error(t.organizationDetailPage.selectUnitsFirst);
 return;
 }
 setShowBulkDeleteConfirm(true);
 };

 const handleBulkDeleteConfirm = () => {
 setIsBulkDeleting(true);
 bulkDeleteMutation.mutate({ ids: Array.from(selectedUnitIds) });
 };

 const handleBulkStatusChange = async (newStatus: "active" | "inactive") => {
 if (selectedUnitIds.size === 0) {
 toast.error(t.organizationDetailPage.selectUnitsFirst);
 return;
 }

 setIsBulkOperating(true);
 try {
 // Call bulk update mutation for each selected unit
 for (const unitId of Array.from(selectedUnitIds)) {
 await utils.client.ims.operatingUnits.update.mutate({
 id: unitId,
 status: newStatus,
 });
 }
 toast.success(t.organizationDetailPage.bulkUpdateSuccess);
 setSelectedUnitIds(new Set());
 utils.ims.operatingUnits.listByOrganization.invalidate({ organizationId });
 } catch (error: any) {
 toast.error(t.organizationDetailPage.bulkUpdateError);
 } finally {
 setIsBulkOperating(false);
 }
 };

 const isLoading = orgLoading || unitsLoading;

 if (isLoading) {
 return (
 <div className="container py-8" dir={isRTL ? 'rtl' : 'ltr'}>
 <p className="text-muted-foreground text-center">{t.organizationDetailPage.loading}</p>
 </div>
 );
 }

 if (!organization) {
 return (
 <div className="container py-8">
 <Card>
 <CardContent className="py-12 text-center">
 <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
 <h3 className="text-lg font-semibold mb-2">Organization not found</h3>
 <BackButton onClick={() => navigate("~/platform/organizations")} label={t.organizationDetailPage.backToOrganizations} />
 </CardContent>
 </Card>
 </div>
 );
 }

 return (
 <div className="container py-8">
 {/* Header with Back Button */}
 <div className="mb-6">
 <BackButton onClick={() => navigate("~/platform/organizations")} label={t.organizationDetailPage.backToOrganizations} />
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
 <Building2 className="w-8 h-8 text-primary" />
 {organization.name}
 </h1>
 <p className="text-muted-foreground mt-2">
 {t.organizationDetailPage.organizationDetailTitle}
 </p>
 </div>
 <div className="flex items-center gap-2">
 <span
 className={`px-3 py-1 rounded-full text-sm font-medium ${ organization.status === "active" ? "bg-green-100 text-green-800" : organization.status === "suspended" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800" }`}
 >
 {t.organizationDetailPage.status}
 </span>
 </div>
 </div>
 </div>

 {/* Organization Statistics Card */}
 <Card className="mb-6">
 <CardHeader>
 <CardTitle>{t.organizationDetailPage.statistics}</CardTitle>
 <CardDescription>{t.organizationDetailPage.statisticsDescription}</CardDescription>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {/* Total Users */}
 <div className="flex items-center gap-4">
 <div className="p-3 bg-blue-100 rounded-lg">
 <Users className="w-6 h-6 text-blue-600" />
 </div>
 <div>
 <p className="text-sm text-muted-foreground">{t.organizationDetailPage.totalUsers}</p>
 <p className="text-2xl font-bold text-foreground">-</p>
 <p className="text-xs text-muted-foreground">{t.organizationDetailPage.comingSoon}</p>
 </div>
 </div>

 {/* Active Projects */}
 <div className="flex items-center gap-4">
 <div className="p-3 bg-green-100 rounded-lg">
 <Briefcase className="w-6 h-6 text-green-600" />
 </div>
 <div>
 <p className="text-sm text-muted-foreground">{t.organizationDetailPage.activeProjects}</p>
 <p className="text-2xl font-bold text-foreground">-</p>
 <p className="text-xs text-muted-foreground">{t.organizationDetailPage.comingSoon}</p>
 </div>
 </div>

 {/* Budget Allocation */}
 <div className="flex items-center gap-4">
 <div className="p-3 bg-purple-100 rounded-lg">
 <DollarSign className="w-6 h-6 text-purple-600" />
 </div>
 <div>
 <p className="text-sm text-muted-foreground">{t.organizationDetailPage.budgetAllocation}</p>
 <p className="text-2xl font-bold text-foreground">-</p>
 <p className="text-xs text-muted-foreground">{t.organizationDetailPage.comingSoon}</p>
 </div>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Tab Navigation */}
 <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="w-full mb-6">
 <TabsList className="grid w-full grid-cols-2">
 <TabsTrigger value="details">
 {language === "ar" ? "تفاصيل المنظمة" : "Organization Details"}
 </TabsTrigger>
 <TabsTrigger value="microsoft365" className="flex items-center gap-2">
 <Cloud className="w-4 h-4" />
 {language === "ar" ? "Microsoft 365" : "Microsoft 365"}
 </TabsTrigger>
 </TabsList>

 {/* Organization Details Tab */}
 <TabsContent value="details" className="mt-6">
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Organization Information Card */}
 <Card className="lg:col-span-1">
 <CardHeader>
 <CardTitle>{t.organizationDetailPage.organizationInfo}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div>
 <p className="text-sm text-muted-foreground mb-1">
 {t.organizationDetailPage.country}
 </p>
 <p className="font-medium flex items-center gap-2">
 <Globe className="w-4 h-4 text-primary" />
 {organization.country || "Not specified"}
 </p>
 </div>

 <div>
 <p className="text-sm text-muted-foreground mb-1">
 {t.organizationDetailPage.domain}
 </p>
 <p className="font-medium">
 {organization.domain || "No domain"}
 </p>
 </div>

 <div>
 <p className="text-sm text-muted-foreground mb-1">
 {t.organizationDetailPage.timezone}
 </p>
 <p className="font-medium flex items-center gap-2">
 <Clock className="w-4 h-4 text-primary" />
 {organization.timezone}
 </p>
 </div>

 <div>
 <p className="text-sm text-muted-foreground mb-1">
 {t.organizationDetailPage.currency}
 </p>
 <p className="font-medium flex items-center gap-2">
 <DollarSign className="w-4 h-4 text-primary" />
 {organization.currency}
 </p>
 </div>

 <div>
 <p className="text-sm text-muted-foreground mb-1">
 {t.organizationDetailPage.createdAt}
 </p>
 <p className="font-medium">
 {format(new Date(organization.createdAt), "PPP")}
 </p>
 </div>

 <div>
 <p className="text-sm text-muted-foreground mb-1">
 {t.organizationDetailPage.updatedAt}
 </p>
 <p className="font-medium">
 {format(new Date(organization.updatedAt), "PPP")}
 </p>
 </div>

 {/* Organization Admins Section */}
 {admins.length > 0 && (
 <div className="pt-4 border-t">
 <p className="text-sm text-muted-foreground mb-3">
 {t.organizationDetailPage.admins}
 </p>
 <div className="space-y-3">
 {admins.map((admin) => (
 <div key={admin.id} className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
 <Users className="w-4 h-4 text-primary" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-medium text-sm truncate">{admin.name}</p>
 <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </CardContent>
 </Card>

 {/* Operating Units Card */}
 <Card className="lg:col-span-2">
 <CardHeader>
 <div className="flex items-center justify-between">
 <div>
 <CardTitle>{t.organizationDetailPage.operatingUnits}</CardTitle>
 <CardDescription>
 {operatingUnits.length} {operatingUnits.length === 1 ? "operating unit" : "operating units"}
 {selectedUnitIds.size > 0 && ` • ${selectedUnitIds.size} selected`}
 </CardDescription>
 </div>
 <div className="flex items-center gap-2">
 {selectedUnitIds.size > 0 && (
 <>
 <Button
 variant="outline"
 size="sm"
 onClick={() => handleBulkStatusChange("active")}
 disabled={isBulkOperating || isBulkDeleting}
 >
 {t.organizationDetailPage.activateSelected}
 </Button>
 <Button
 variant="outline"
 size="sm"
 onClick={() => handleBulkStatusChange("inactive")}
 disabled={isBulkOperating || isBulkDeleting}
 >
 {t.organizationDetailPage.deactivateSelected}
 </Button>
 <Button
 variant="destructive"
 size="sm"
 onClick={handleBulkDeleteClick}
 disabled={isBulkOperating || isBulkDeleting}
 >
 <Trash2 className="w-4 h-4 me-2" />
 {t.organizationDetailPage.deleteSelected}
 </Button>
 </>
 )}

 </div>
 </div>
 </CardHeader>
 <CardContent>
 {operatingUnits.length === 0 ? (
 <div className="text-center py-12">
 <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
 <h3 className="text-lg font-semibold mb-2">
 {t.organizationDetailPage.noUnitsMessage}
 </h3>
 <p className="text-muted-foreground mb-4">
 {t.organizationDetailPage.addFirstUnit}
 </p>

 </div>
 ) : (
 <div className="space-y-3">
 {/* Select All Checkbox */}
 {operatingUnits.length > 1 && (
 <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
 <input
 type="checkbox"
 checked={selectedUnitIds.size === operatingUnits.length}
 onChange={toggleSelectAll}
 className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
 />
 <span className="text-sm font-medium text-muted-foreground">
 {t.organizationDetailPage.selectAll}
 </span>
 </div>
 )}
 {operatingUnits.map((unit: any) => (
 <div
 key={unit.id}
 className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-accent/5 transition-colors"
 >
 <input
 type="checkbox"
 checked={selectedUnitIds.has(unit.id)}
 onChange={() => toggleUnitSelection(unit.id)}
 className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
 />
 <MapPin className="w-6 h-6 text-primary flex-shrink-0" />
 <div className="flex-1">
 <h4 className="font-medium text-foreground">{unit.name}</h4>
 <p className="text-sm text-muted-foreground">
 {unit.type.toUpperCase()} • {unit.country || "No country"} • {t.organizationDetailPage.statusLabel}
 </p>
 {unit.code && (
 <p className="text-xs text-muted-foreground font-mono mt-1">
 Code: {unit.code}
 </p>
 )}
 </div>
 <div className="flex items-center gap-2">
 {unit.code && organization?.shortCode && (
 <Button
 variant="default"
 size="sm"
 onClick={() => {
 const suffix = unit.code.split('-').pop();
 navigate(`/platform/organizations/${organization.shortCode}/${suffix}`);
 }}
 >
 <Eye className="w-4 h-4 me-2" />
 {t.organizationDetailPage.view}
 </Button>
 )}

 </div>
 </div>
 ))}
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 </TabsContent>

 {/* Microsoft 365 Onboarding Tab */}
 <TabsContent value="microsoft365" className="mt-6">
 <Microsoft365OnboardingTab
 organizationId={organizationId}
 organizationName={organization?.name || ""}
 />
 </TabsContent>
 </Tabs>

 {/* Create Operating Unit Modal */}
 <OperatingUnitFormModal
 open={isCreateUnitModalOpen}
 onOpenChange={setIsCreateUnitModalOpen}
 mode="create"
 organizationId={organizationId}
 />

 {/* Edit Operating Unit Modal */}
 <OperatingUnitFormModal
 open={!!editingUnitId}
 onOpenChange={(open) => !open && setEditingUnitId(undefined)}
 operatingUnitId={editingUnitId}
 mode="edit"
 />

 {/* Delete Confirmation Dialog */}
 <DeleteConfirmationDialog
 open={!!deletingUnitId}
 onOpenChange={(open) => !open && setDeletingUnitId(undefined)}
 onConfirm={handleDeleteConfirm}
 recordName={deletingUnitName}
 recordType={t.organizationDetailPage.operatingUnit}
 />

 {/* Bulk Delete Confirmation Dialog */}
 <DeleteConfirmationDialog
 open={showBulkDeleteConfirm}
 onOpenChange={(open) => !open && setShowBulkDeleteConfirm(false)}
 onConfirm={handleBulkDeleteConfirm}
 recordName={`${selectedUnitIds.size} ${t.organizationDetailPage.units}`}
 recordType={t.organizationDetailPage.operatingUnits2}
 isLoading={isBulkDeleting}
 />
 </div>
 );
}
