import { useTranslation } from '@/i18n/useTranslation';
import { Button } from "@/components/ui/button";
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { Building2, Plus, Pencil, Trash2, Eye } from "lucide-react";
import { OrganizationFormModal } from "@/components/OrganizationFormModal";
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * Organizations Management Page
 * Platform Admin only - Manage all tenant organizations
 */
export default function OrganizationsPage() {
 const { language, isRTL} = useLanguage();
  const { t } = useTranslation();
const [, navigate] = useLocation();
 const { user } = useAuth();
 const { data: organizations = [], isLoading } = trpc.ims.organizations.list.useQuery();
 
 // Selection state for bulk delete
 const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
 const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
 
 // Helper function to check if current user can manage an organization
 const canManageOrganization = (org: typeof organizations[0]) => {
 if (!user) return false;
 // Platform admins can manage any organization
 if (user.role === 'platform_admin' || user.role === 'platform_super_admin') return true;
 // Organization admins can only manage their own organization
 if (user.role === 'organization_admin' && org.primaryAdminId === user.id) return true;
 return false;
 };
 
 // Check if all organizations are selected
 const allSelected = useMemo(() => {
 if (organizations.length === 0) return false;
 return organizations.every(org => selectedIds.has(org.id));
 }, [organizations, selectedIds]);
 
 // Check if some but not all are selected
 const someSelected = useMemo(() => {
 return selectedIds.size > 0 && !allSelected;
 }, [selectedIds, allSelected]);
 
 const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
 const [editingOrgId, setEditingOrgId] = useState<number | undefined>();
 const [deletingOrgId, setDeletingOrgId] = useState<number | undefined>();
 const [deletingOrgName, setDeletingOrgName] = useState<string>("");
 
 const utils = trpc.useUtils();
 
 // Single delete mutation
 const softDeleteMutation = trpc.ims.organizations.softDelete.useMutation({
 onSuccess: () => {
 toast.success(t.organizationsPage.deletedSuccessfully);
 utils.ims.organizations.list.invalidate();
 setDeletingOrgId(undefined);
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });
 
 // Bulk delete mutation
 const bulkSoftDeleteMutation = trpc.ims.organizations.bulkSoftDelete.useMutation({
 onSuccess: (result) => {
 toast.success(t.organizationsPage.bulkDeleteSuccess);
 utils.ims.organizations.list.invalidate();
 setSelectedIds(new Set());
 setShowBulkDeleteDialog(false);
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const handleDeleteClick = (orgId: number, orgName: string) => {
 setDeletingOrgId(orgId);
 setDeletingOrgName(orgName);
 };

 const handleDeleteConfirm = (reason?: string) => {
 if (deletingOrgId) {
 softDeleteMutation.mutate({ id: deletingOrgId, reason: reason || "Deleted by platform admin" });
 }
 };
 
 // Toggle select all
 const handleSelectAll = () => {
 if (allSelected) {
 // Deselect all
 setSelectedIds(new Set());
 } else {
 // Select all
 setSelectedIds(new Set(organizations.map(org => org.id)));
 }
 };
 
 // Toggle single selection
 const handleSelectOne = (orgId: number) => {
 const newSelected = new Set(selectedIds);
 if (newSelected.has(orgId)) {
 newSelected.delete(orgId);
 } else {
 newSelected.add(orgId);
 }
 setSelectedIds(newSelected);
 };
 
 // Handle bulk delete
 const handleBulkDeleteConfirm = (reason?: string) => {
 if (selectedIds.size > 0) {
 bulkSoftDeleteMutation.mutate({ ids: Array.from(selectedIds), reason: reason || "Bulk deleted by platform admin" });
 }
 };

 return (
 <div className="container py-8" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="mb-8 flex items-start justify-between">
 <div>
 <h1 className="text-3xl font-bold text-foreground">{t.organizationsPage.organizations}</h1>
 <p className="text-muted-foreground mt-2">{t.organizationsPage.manageDescription}</p>
 </div>
 <div className="flex items-center gap-2">
 {selectedIds.size > 0 && (
 <Button 
 variant="destructive" 
 onClick={() => setShowBulkDeleteDialog(true)}
 >
 <Trash2 className="w-4 h-4 me-2" />
 {t.organizationsPage.deleteSelected}
 </Button>
 )}
 <Button onClick={() => setIsCreateModalOpen(true)}>
 <Plus className="w-4 h-4 me-2" />
 {t.organizationsPage.createOrganization}
 </Button>
 </div>
 </div>

 <Card>
 <CardHeader>
 <div className="flex items-center justify-between">
 <div>
 <CardTitle>{t.organizationsPage.allOrganizations}</CardTitle>
 <CardDescription>
                {`${organizations.length} ${organizations.length === 1 ? t.organizationsPage.organization : t.organizationsPage.organizations2}`}
 </CardDescription>
 </div>
 {organizations.length > 0 && (user?.role === 'platform_admin' || user?.role === 'platform_super_admin') && (
 <div className="flex items-center gap-2">
 <Checkbox
 id="select-all"
 checked={allSelected}
 onCheckedChange={handleSelectAll}
 className="data-[state=indeterminate]:bg-primary"
 {...(someSelected ? { "data-state": "indeterminate" } : {})}
 />
 <label htmlFor="select-all" className="text-sm text-muted-foreground cursor-pointer">
 {t.organizationsPage.selectAll}
 </label>
 </div>
 )}
 </div>
 </CardHeader>
 <CardContent>
 {isLoading ? (
 <p className="text-muted-foreground">{t.organizationsPage.loading}</p>
 ) : organizations.length === 0 ? (
 <div className="text-center py-12">
 <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
 <h3 className="text-lg font-semibold mb-2">{t.organizationsPage.noOrganizationsYet}</h3>
 <p className="text-muted-foreground mb-6">{t.organizationsPage.createFirstOrganization}</p>
 <Button onClick={() => setIsCreateModalOpen(true)}>
 <Plus className="w-4 h-4 me-2" />
 {t.organizationsPage.createFirstOrganizationButton}
 </Button>
 </div>
 ) : (
 <div className="space-y-4">
 {organizations.map((org) => (
 <div
 key={org.id}
 className={`flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/5 transition-colors ${ selectedIds.has(org.id) ? 'bg-accent/10 border-primary/50' : '' }`}
 >
 <div className="flex items-center gap-4 flex-1">
 {(user?.role === 'platform_admin' || user?.role === 'platform_super_admin') && (
 <Checkbox
 checked={selectedIds.has(org.id)}
 onCheckedChange={() => handleSelectOne(org.id)}
 />
 )}
 <Building2 className="w-10 h-10 text-primary flex-shrink-0" />
 <div className="flex-1">
 <h3 className="font-semibold text-foreground text-lg">{org.name}</h3>
 <div className="flex items-center gap-4 mt-1">
 <p className="text-sm text-muted-foreground">
 {org.country || t.organizationsPage.noCountry}
 </p>
 <span className="text-muted-foreground">•</span>
 <p className="text-sm text-muted-foreground">
 {org.domain || t.organizationsPage.noDomain}
 </p>
 <span className="text-muted-foreground">•</span>
 <span className={`text-sm px-2 py-0.5 rounded-full ${ org.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700' }`}>
 {t.organizationsPage.status}
 </span>
 </div>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <Button 
 variant="default" 
 size="sm"
 onClick={() => navigate(`/platform/organizations/${org.shortCode}`)}
 >
 <Eye className="w-4 h-4 me-2" />
 {t.organizationsPage.view}
 </Button>
 {canManageOrganization(org) && (
 <>
 <Button 
 variant="outline" 
 size="sm"
 onClick={() => setEditingOrgId(org.id)}
 >
 <Pencil className="w-4 h-4 me-2" />
 {t.organizationsPage.edit}
 </Button>
 <Button 
 variant="outline" 
 size="sm"
 onClick={() => handleDeleteClick(org.id, org.name)}
 className="text-red-600 hover:text-red-700 hover:bg-red-50"
 >
 <Trash2 className="w-4 h-4 me-2" />
 {t.organizationsPage.delete}
 </Button>
 </>
 )}
 </div>
 </div>
 ))}
 </div>
 )}
 </CardContent>
 </Card>

 {/* Create Modal */}
 <OrganizationFormModal
 open={isCreateModalOpen}
 onOpenChange={setIsCreateModalOpen}
 mode="create"
 />

 {/* Edit Modal */}
 <OrganizationFormModal
 open={!!editingOrgId}
 onOpenChange={(open) => !open && setEditingOrgId(undefined)}
 organizationId={editingOrgId}
 mode="edit"
 />

 {/* Single Delete Confirmation Dialog */}
 <DeleteConfirmationDialog
 open={!!deletingOrgId}
 onOpenChange={(open) => !open && setDeletingOrgId(undefined)}
 onConfirm={handleDeleteConfirm}
 recordName={deletingOrgName}
 recordType={t.organizationsPage.organization}
 requireReason
 />
 
 {/* Bulk Delete Confirmation Dialog */}
 <DeleteConfirmationDialog
 open={showBulkDeleteDialog}
 onOpenChange={setShowBulkDeleteDialog}
 onConfirm={handleBulkDeleteConfirm}
 recordName={t.organizationsPage.selectedOrganizations}
 recordType={t.organizationsPage.organizations2}
 requireReason
 />
 </div>
 );
}
