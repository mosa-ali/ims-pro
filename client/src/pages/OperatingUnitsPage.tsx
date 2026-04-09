import { useTranslation } from '@/i18n/useTranslation';
import { useState } from "react";
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { MapPin, Plus, Building2, Pencil, Trash2 } from "lucide-react";
import { OperatingUnitFormModal } from "@/components/OperatingUnitFormModal";
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";
import { toast } from "sonner";

/**
 * Operating Units Management Page
 * Platform Admin only - Manage all operating units across organizations
 */
export default function OperatingUnitsPage() {
 const { language, isRTL} = useLanguage();
  const { t } = useTranslation();
const { data: organizations = [], isLoading: orgsLoading } = trpc.ims.organizations.list.useQuery();
 
 const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
 const [editingUnitId, setEditingUnitId] = useState<number | undefined>();
 const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
 const [deletingUnitId, setDeletingUnitId] = useState<number | undefined>();
 const [deletingUnitName, setDeletingUnitName] = useState<string>("");
 
 const utils = trpc.useUtils();
 const softDeleteMutation = trpc.ims.operatingUnits.softDelete.useMutation({
 onSuccess: () => {
 toast.success(t.operatingUnitsPage.deletedSuccessfully);
 // Invalidate all operating units queries
 organizations.forEach((org) => {
 utils.ims.operatingUnits.listByOrganization.invalidate({ organizationId: org.id });
 });
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

 // Fetch all operating units at once (no conditional hooks)
 const { data: allOperatingUnits = [], isLoading: unitsLoading } = trpc.ims.operatingUnits.list.useQuery();

 const isLoading = orgsLoading || unitsLoading;

 // Group operating units by organization
 const unitsByOrg: Record<number, any[]> = {};
 organizations.forEach((org) => {
 unitsByOrg[org.id] = allOperatingUnits.filter((unit: any) => unit.organizationId === org.id);
 });

 const handleCreateUnit = (orgId: number) => {
 setSelectedOrgId(orgId);
 setIsCreateModalOpen(true);
 };

 return (
 <div className="container py-8" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="mb-8">
 <h1 className="text-3xl font-bold text-foreground">{t.operatingUnitsPage.operatingUnits}</h1>
 <p className="text-muted-foreground mt-2">Manage country offices and field locations across all organizations</p>
 </div>

 {isLoading ? (
 <Card>
 <CardContent className="py-8">
 <p className="text-muted-foreground text-center">{t.operatingUnitsPage.loading}</p>
 </CardContent>
 </Card>
 ) : organizations.length === 0 ? (
 <Card>
 <CardContent className="py-12 text-center">
 <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
 <h3 className="text-lg font-semibold mb-2">No organizations configured</h3>
 <p className="text-muted-foreground">Create organizations first before adding operating units</p>
 </CardContent>
 </Card>
 ) : (
 <div className="space-y-6">
 {organizations.map((org) => {
 const orgUnits = unitsByOrg[org.id] || [];
 
 return (
 <Card key={org.id}>
 <CardHeader>
 <div className="flex items-center justify-between">
 <div>
 <CardTitle className="flex items-center gap-2">
 <Building2 className="w-5 h-5" />
 {org.name}
 </CardTitle>
 <CardDescription>
 {orgUnits.length} {orgUnits.length === 1 ? "operating unit" : "operating units"}
 </CardDescription>
 </div>
 <Button 
 variant="outline" 
 size="sm"
 onClick={() => handleCreateUnit(org.id)}
 >
 <Plus className="w-4 h-4 me-2" />
 Add Unit
 </Button>
 </div>
 </CardHeader>
 <CardContent>
 {orgUnits.length === 0 ? (
 <div className="text-center py-8 text-muted-foreground">
 <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
 <p>No operating units for this organization</p>
 </div>
 ) : (
 <div className="space-y-3">
 {orgUnits.map((unit: any) => (
 <div
 key={unit.id}
 className="flex items-center gap-4 p-3 border border-border rounded-lg hover:bg-accent/5 transition-colors"
 >
 <MapPin className="w-6 h-6 text-primary flex-shrink-0" />
 <div className="flex-1">
 <h4 className="font-medium text-foreground">{unit.name}</h4>
 <p className="text-sm text-muted-foreground">
 {unit.type.toUpperCase()} • {unit.country || "No country"} • {t.operatingUnitsPage.status}
 </p>
 </div>
 <div className="flex items-center gap-2">
 <Button 
 variant="ghost" 
 size="sm"
 onClick={() => setEditingUnitId(unit.id)}
 >
 <Pencil className="w-4 h-4 me-2" />
 {t.operatingUnitsPage.edit}
 </Button>
 <Button 
 variant="ghost" 
 size="sm"
 onClick={() => handleDeleteClick(unit.id, unit.name)}
 className="text-red-600 hover:text-red-700 hover:bg-red-50"
 >
 <Trash2 className="w-4 h-4 me-2" />
 {t.operatingUnitsPage.delete}
 </Button>
 </div>
 </div>
 ))}
 </div>
 )}
 </CardContent>
 </Card>
 );
 })}
 </div>
 )}

 {/* Create Modal */}
 <OperatingUnitFormModal
 open={isCreateModalOpen}
 onOpenChange={(open) => {
 setIsCreateModalOpen(open);
 if (!open) setSelectedOrgId(null);
 }}
 mode="create"
 />

 {/* Edit Modal */}
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
 recordType={t.operatingUnitsPage.operatingUnit}
 />
 </div>
 );
}
