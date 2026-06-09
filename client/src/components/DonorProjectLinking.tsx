import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/i18n/useTranslation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import {
 Command,
 CommandEmpty,
 CommandGroup,
 CommandInput,
 CommandItem,
 CommandList,
} from "@/components/ui/command";
import {
 Popover,
 PopoverContent,
 PopoverTrigger,
} from "@/components/ui/popover";
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
 Plus,
 Trash2,
 Edit,
 Link2,
 Check,
 ChevronsUpDown,
 Building2,
 FolderKanban,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Relationship types
const RELATIONSHIP_TYPES = [
 { value: "primary_funder", label: "Primary Funder", labelAr: "الممول الرئيسي" },
 { value: "co_funder", label: "Co-Funder", labelAr: "ممول مشارك" },
 { value: "in_kind", label: "In-Kind Support", labelAr: "دعم عيني" },
 { value: "technical_partner", label: "Technical Partner", labelAr: "شريك فني" },
 { value: "potential", label: "Potential", labelAr: "محتمل" },
 { value: "past", label: "Past", labelAr: "سابق" },
] as const;

const STATUS_OPTIONS = [
 { value: "active", label: "Active", labelAr: "نشط" },
 { value: "pending", label: "Pending", labelAr: "معلق" },
 { value: "completed", label: "Completed", labelAr: "مكتمل" },
 { value: "cancelled", label: "Cancelled", labelAr: "ملغي" },
] as const;

type RelationshipType = typeof RELATIONSHIP_TYPES[number]["value"];
type StatusType = typeof STATUS_OPTIONS[number]["value"];

interface DonorProjectLinkingProps {
 donorId?: number;
 projectId?: number;
 mode: "donor" | "project"; // donor mode shows linked projects, project mode shows linked donors
}

export function DonorProjectLinking({ donorId, projectId, mode }: DonorProjectLinkingProps) {
 const { t } = useTranslation();
const utils = trpc.useUtils();

 // State
 const [linkDialogOpen, setLinkDialogOpen] = useState(false);
 const [editDialogOpen, setEditDialogOpen] = useState(false);
 const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
 const [selectedLink, setSelectedLink] = useState<any>(null);
 const [selectorOpen, setSelectorOpen] = useState(false);

 // Form state
 const [formData, setFormData] = useState({
 donorId: donorId || 0,
 projectId: projectId || 0,
 relationshipType: "primary_funder" as RelationshipType,
 status: "active" as StatusType,
 fundingAmount: "",
 currency: "USD",
 fundingPercentage: "",
 notes: "",
 notesAr: "",
 });

 // Queries
 const linkedProjectsQuery = trpc.donorProjects.getProjectsByDonor.useQuery(
 { donorId: donorId! },
 { enabled: mode === "donor" && !!donorId }
 );

 const linkedDonorsQuery = trpc.donorProjects.getDonorsByProject.useQuery(
 { projectId: projectId! },
 { enabled: mode === "project" && !!projectId }
 );

 // Get available donors/projects for linking
 const availableDonorsQuery = trpc.donors.list.useQuery(
 { page: 1, pageSize: 100, isActive: true },
 { enabled: mode === "project" && linkDialogOpen }
 );

 const availableProjectsQuery = trpc.projects.list.useQuery(
 { limit: 100, offset: 0 },
 { enabled: mode === "donor" && linkDialogOpen }
 );

 // Mutations
 const createMutation = trpc.donorProjects.create.useMutation({
 onSuccess: () => {
 const { t, language } = useTranslation();
 toast.success(t.donorProjectLinking.linkCreatedSuccessfully);
 setLinkDialogOpen(false);
 resetForm();
 if (mode === "donor") {
 utils.donorProjects.getProjectsByDonor.invalidate({ donorId: donorId! });
 } else {
 utils.donorProjects.getDonorsByProject.invalidate({ projectId: projectId! });
 }
 },
 onError: (error) => {
 toast.error(error.message || (t.donorProjectLinking.failedToCreateLink));
 },
 });

 const updateMutation = trpc.donorProjects.update.useMutation({
 onSuccess: () => {
 toast.success(t.donorProjectLinking.linkUpdatedSuccessfully);
 setEditDialogOpen(false);
 setSelectedLink(null);
 if (mode === "donor") {
 utils.donorProjects.getProjectsByDonor.invalidate({ donorId: donorId! });
 } else {
 utils.donorProjects.getDonorsByProject.invalidate({ projectId: projectId! });
 }
 },
 onError: (error) => {
 toast.error(error.message || (t.donorProjectLinking.failedToUpdateLink));
 },
 });

 const deleteMutation = trpc.donorProjects.delete.useMutation({
 onSuccess: () => {
 toast.success(t.donorProjectLinking.linkRemovedSuccessfully);
 setDeleteDialogOpen(false);
 setSelectedLink(null);
 if (mode === "donor") {
 utils.donorProjects.getProjectsByDonor.invalidate({ donorId: donorId! });
 } else {
 utils.donorProjects.getDonorsByProject.invalidate({ projectId: projectId! });
 }
 },
 onError: (error) => {
 toast.error(error.message || (t.donorProjectLinking.failedToRemoveLink));
 },
 });

 // Helpers
 const resetForm = () => {
 setFormData({
 donorId: donorId || 0,
 projectId: projectId || 0,
 relationshipType: "primary_funder",
 status: "active",
 fundingAmount: "",
 currency: "USD",
 fundingPercentage: "",
 notes: "",
 notesAr: "",
 });
 };

 const getRelationshipLabel = (type: string) => {
 const rel = RELATIONSHIP_TYPES.find((r) => r.value === type);
 return rel ? (language === "en" ? rel.label : rel.labelAr) : type;
 };

 const getStatusLabel = (status: string) => {
 const st = STATUS_OPTIONS.find((s) => s.value === status);
 return st ? (language === "en" ? st.label : st.labelAr) : status;
 };

 const getStatusVariant = (status: string) => {
 switch (status) {
 case "active":
 return "default";
 case "pending":
 return "secondary";
 case "completed":
 return "outline";
 case "cancelled":
 return "destructive";
 default:
 return "outline";
 }
 };

 const handleCreate = () => {
 createMutation.mutate({
 donorId: formData.donorId,
 projectId: formData.projectId,
 relationshipType: formData.relationshipType,
 status: formData.status,
 fundingAmount: formData.fundingAmount ? parseFloat(formData.fundingAmount) : null,
 currency: formData.currency,
 fundingPercentage: formData.fundingPercentage ? parseFloat(formData.fundingPercentage) : null,
 notes: formData.notes || null,
 notesAr: formData.notesAr || null,
 });
 };

 const handleUpdate = () => {
 if (!selectedLink) return;
 updateMutation.mutate({
 id: selectedLink.id,
 relationshipType: formData.relationshipType,
 status: formData.status,
 fundingAmount: formData.fundingAmount ? parseFloat(formData.fundingAmount) : null,
 currency: formData.currency,
 fundingPercentage: formData.fundingPercentage ? parseFloat(formData.fundingPercentage) : null,
 notes: formData.notes || null,
 notesAr: formData.notesAr || null,
 });
 };

 const handleDelete = () => {
 if (!selectedLink) return;
 deleteMutation.mutate({ id: selectedLink.id });
 };

 const openEditDialog = (link: any) => {
 setSelectedLink(link);
 setFormData({
 donorId: link.donorId,
 projectId: link.projectId,
 relationshipType: link.relationshipType || "primary_funder",
 status: link.status || "active",
 fundingAmount: link.fundingAmount ? String(link.fundingAmount) : "",
 currency: link.currency || "USD",
 fundingPercentage: link.fundingPercentage ? String(link.fundingPercentage) : "",
 notes: link.notes || "",
 notesAr: link.notesAr || "",
 });
 setEditDialogOpen(true);
 };

 const openDeleteDialog = (link: any) => {
 setSelectedLink(link);
 setDeleteDialogOpen(true);
 };

 // Data
 const links = mode === "donor" 
 ? linkedProjectsQuery.data?.projects || []
 : linkedDonorsQuery.data?.donors || [];
 
 const isLoading = mode === "donor" ? linkedProjectsQuery.isLoading : linkedDonorsQuery.isLoading;

 // Available items for selection (excluding already linked)
 const linkedIds = useMemo(() => {
 return new Set(links.map((l: any) => mode === "donor" ? l.projectId : l.donorId));
 }, [links, mode]);

 const availableItems = useMemo(() => {
 if (mode === "donor") {
 // projects.list returns an array directly, not { projects: [...] }
 return (availableProjectsQuery.data || []).filter(
 (p: any) => !linkedIds.has(p.id)
 );
 } else {
 return (availableDonorsQuery.data?.donors || []).filter(
 (d: any) => !linkedIds.has(d.id)
 );
 }
 }, [mode, availableProjectsQuery.data, availableDonorsQuery.data, linkedIds]);

 return (
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <h4 className="font-medium flex items-center gap-2">
 <Link2 className="w-4 h-4" />
 {mode === "donor"
 ? (t.donorProjectLinking.linkedProjects)
 : (t.donorProjectLinking.linkedDonors)}
 </h4>
 <Button size="sm" onClick={() => { resetForm(); setLinkDialogOpen(true); }}>
 <Plus className="w-4 h-4 me-1" />
 {mode === "donor"
 ? (t.donorProjectLinking.linkProject)
 : (t.donorProjectLinking.linkDonor)}
 </Button>
 </div>

 {isLoading ? (
 <div className="text-center py-4 text-muted-foreground">
 {t.donorProjectLinking.loading}
 </div>
 ) : links.length === 0 ? (
 <div className="text-center py-8 text-muted-foreground border rounded-lg">
 {mode === "donor"
 ? (t.donorProjectLinking.noProjectsLinkedToThisDonorYet)
 : (t.donorProjectLinking.noDonorsLinkedToThisProjectYet)}
 </div>
 ) : (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>
 {mode === "donor"
 ? (t.donorProjectLinking.project)
 : (t.donorProjectLinking.donor)}
 </TableHead>
 <TableHead>{t.donorProjectLinking.relationship}</TableHead>
 <TableHead>{t.donorProjectLinking.funding}</TableHead>
 <TableHead>{t.donorProjectLinking.status}</TableHead>
 <TableHead className="text-center">{t.donorProjectLinking.actions}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {links.map((link: any) => (
 <TableRow key={link.id}>
 <TableCell>
 <div className="flex items-center gap-2">
 {mode === "donor" ? (
 <FolderKanban className="w-4 h-4 text-muted-foreground" />
 ) : (
 <Building2 className="w-4 h-4 text-muted-foreground" />
 )}
 <div>
 <p className="font-medium">
 {mode === "donor"
 ? (language === "en" ? link.projectTitle : link.projectTitleAr || link.projectTitle)
 : (language === "en" ? link.donorName : link.donorNameAr || link.donorName)}
 </p>
 <p className="text-xs text-muted-foreground">
 {mode === "donor" ? link.projectCode : link.donorCode}
 </p>
 </div>
 </div>
 </TableCell>
 <TableCell>
 <Badge variant="outline">{getRelationshipLabel(link.relationshipType)}</Badge>
 </TableCell>
 <TableCell>
 {link.fundingAmount ? (
 <span>
 {new Intl.NumberFormat(t.components.enus, {
 style: "currency",
 currency: link.currency || "USD",
 maximumFractionDigits: 0,
 }).format(Number(link.fundingAmount))}
 {link.fundingPercentage && (
 <span className="text-muted-foreground ms-1">
 ({link.fundingPercentage}%)
 </span>
 )}
 </span>
 ) : (
 "-"
 )}
 </TableCell>
 <TableCell>
 <Badge variant={getStatusVariant(link.status) as any}>
 {getStatusLabel(link.status)}
 </Badge>
 </TableCell>
 <TableCell className="text-end">
 <div className="flex justify-end gap-1">
 <Button variant="ghost" size="sm" onClick={() => openEditDialog(link)}>
 <Edit className="w-4 h-4" />
 </Button>
 <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(link)}>
 <Trash2 className="w-4 h-4 text-destructive" />
 </Button>
 </div>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 )}

 {/* Create Link Dialog */}
 <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
 <DialogContent className="max-w-md">
 <DialogHeader>
 <DialogTitle>
 {mode === "donor"
 ? (t.donorProjectLinking.linkProjectToDonor)
 : (t.donorProjectLinking.linkDonorToProject)}
 </DialogTitle>
 <DialogDescription>
 {mode === "donor"
 ? (t.donorProjectLinking.selectAProjectToLinkWithThisDonor)
 : (t.donorProjectLinking.selectADonorToLinkWithThisProject)}
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-4">
 {/* Searchable Selector */}
 <div>
 <Label>
 {mode === "donor"
 ? (t.donorProjectLinking.project2)
 : (t.donorProjectLinking.donor2)}
 </Label>
 <Popover open={selectorOpen} onOpenChange={setSelectorOpen}>
 <PopoverTrigger asChild>
 <Button
 variant="outline"
 role="combobox"
 aria-expanded={selectorOpen}
 className="w-full justify-between"
 >
 {mode === "donor" ? (
 formData.projectId ? (
 availableItems.find((p: any) => p.id === formData.projectId)?.titleEn ||
 (t.donorProjectLinking.selectProject)
 ) : (
 t.donorProjectLinking.selectProject
 )
 ) : (
 formData.donorId ? (
 availableItems.find((d: any) => d.id === formData.donorId)?.name ||
 (t.donorProjectLinking.selectDonor)
 ) : (
 t.donorProjectLinking.selectDonor
 )
 )}
 <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
 </Button>
 </PopoverTrigger>
 <PopoverContent className="w-full p-0">
 <Command>
 <CommandInput
 placeholder={
 mode === "donor"
 ? (t.donorProjectLinking.searchProjects)
 : (t.donorProjectLinking.searchDonors)
 }
 />
 <CommandList>
 <CommandEmpty>
 {mode === "donor"
 ? (t.donorProjectLinking.noProjectsFound)
 : (t.donorProjectLinking.noDonorsFound)}
 </CommandEmpty>
 <CommandGroup>
 {availableItems.map((item: any) => (
 <CommandItem
 key={item.id}
 value={mode === "donor" ? item.titleEn : item.name}
 onSelect={() => {
 if (mode === "donor") {
 setFormData({ ...formData, projectId: item.id });
 } else {
 setFormData({ ...formData, donorId: item.id });
 }
 setSelectorOpen(false);
 }}
 >
 <Check
 className={cn(
 "mr-2 h-4 w-4",
 (mode === "donor" ? formData.projectId === item.id : formData.donorId === item.id)
 ? "opacity-100"
 : "opacity-0"
 )}
 />
 <div>
 <p>{mode === "donor" ? item.titleEn : item.name}</p>
 <p className="text-xs text-muted-foreground">
 {mode === "donor" ? item.projectCode : item.code}
 </p>
 </div>
 </CommandItem>
 ))}
 </CommandGroup>
 </CommandList>
 </Command>
 </PopoverContent>
 </Popover>
 </div>

 {/* Relationship Type */}
 <div>
 <Label>{t.donorProjectLinking.relationshipType}</Label>
 <Select
 value={formData.relationshipType}
 onValueChange={(v) => setFormData({ ...formData, relationshipType: v as RelationshipType })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {RELATIONSHIP_TYPES.map((type) => (
 <SelectItem key={type.value} value={type.value}>
 {language === "en" ? type.label : type.labelAr}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* Status */}
 <div>
 <Label>{t.donorProjectLinking.status}</Label>
 <Select
 value={formData.status}
 onValueChange={(v) => setFormData({ ...formData, status: v as StatusType })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {STATUS_OPTIONS.map((status) => (
 <SelectItem key={status.value} value={status.value}>
 {language === "en" ? status.label : status.labelAr}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* Funding Information */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.donorProjectLinking.fundingAmount}</Label>
 <Input
 type="number"
 value={formData.fundingAmount}
 onChange={(e) => setFormData({ ...formData, fundingAmount: e.target.value })}
 placeholder="0.00"
 />
 </div>
 <div>
 <Label>{t.donorProjectLinking.currency}</Label>
 <Select
 value={formData.currency}
 onValueChange={(v) => setFormData({ ...formData, currency: v })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="USD">USD</SelectItem>
 <SelectItem value="EUR">EUR</SelectItem>
 <SelectItem value="GBP">GBP</SelectItem>
 <SelectItem value="YER">YER</SelectItem>
 <SelectItem value="SAR">SAR</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 <div>
 <Label>{t.donorProjectLinking.fundingPercentage}</Label>
 <Input
 type="number"
 min="0"
 max="100"
 value={formData.fundingPercentage}
 onChange={(e) => setFormData({ ...formData, fundingPercentage: e.target.value })}
 placeholder="0"
 />
 </div>

 {/* Notes */}
 <div>
 <Label>{t.donorProjectLinking.notes}</Label>
 <Textarea
 value={formData.notes}
 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
 rows={2}
 />
 </div>
 </div>

 <DialogFooter>
 <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
 {t.donorProjectLinking.cancel}
 </Button>
 <Button
 onClick={handleCreate}
 disabled={createMutation.isPending || (mode === "donor" ? !formData.projectId : !formData.donorId)}
 >
 {createMutation.isPending
 ? (t.donorProjectLinking.linking)
 : (t.donorProjectLinking.link)}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Edit Dialog */}
 <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
 <DialogContent className="max-w-md">
 <DialogHeader>
 <DialogTitle>{t.donorProjectLinking.editLink}</DialogTitle>
 </DialogHeader>

 <div className="space-y-4">
 {/* Relationship Type */}
 <div>
 <Label>{t.donorProjectLinking.relationshipType}</Label>
 <Select
 value={formData.relationshipType}
 onValueChange={(v) => setFormData({ ...formData, relationshipType: v as RelationshipType })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {RELATIONSHIP_TYPES.map((type) => (
 <SelectItem key={type.value} value={type.value}>
 {language === "en" ? type.label : type.labelAr}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* Status */}
 <div>
 <Label>{t.donorProjectLinking.status}</Label>
 <Select
 value={formData.status}
 onValueChange={(v) => setFormData({ ...formData, status: v as StatusType })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {STATUS_OPTIONS.map((status) => (
 <SelectItem key={status.value} value={status.value}>
 {language === "en" ? status.label : status.labelAr}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* Funding Information */}
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.donorProjectLinking.fundingAmount}</Label>
 <Input
 type="number"
 value={formData.fundingAmount}
 onChange={(e) => setFormData({ ...formData, fundingAmount: e.target.value })}
 placeholder="0.00"
 />
 </div>
 <div>
 <Label>{t.donorProjectLinking.currency}</Label>
 <Select
 value={formData.currency}
 onValueChange={(v) => setFormData({ ...formData, currency: v })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="USD">USD</SelectItem>
 <SelectItem value="EUR">EUR</SelectItem>
 <SelectItem value="GBP">GBP</SelectItem>
 <SelectItem value="YER">YER</SelectItem>
 <SelectItem value="SAR">SAR</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 <div>
 <Label>{t.donorProjectLinking.fundingPercentage}</Label>
 <Input
 type="number"
 min="0"
 max="100"
 value={formData.fundingPercentage}
 onChange={(e) => setFormData({ ...formData, fundingPercentage: e.target.value })}
 placeholder="0"
 />
 </div>

 {/* Notes */}
 <div>
 <Label>{t.donorProjectLinking.notes}</Label>
 <Textarea
 value={formData.notes}
 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
 rows={2}
 />
 </div>
 </div>

 <DialogFooter>
 <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
 {t.donorProjectLinking.cancel}
 </Button>
 <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
 {updateMutation.isPending
 ? (t.donorProjectLinking.saving)
 : (t.donorProjectLinking.saveChanges)}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Delete Confirmation Dialog */}
 <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>{t.donorProjectLinking.removeLink}</DialogTitle>
 <DialogDescription>
 {t.donorProjectLinking.areYouSureYouWantToRemoveThisLinkThisAct}
 </DialogDescription>
 </DialogHeader>
 <DialogFooter>
 <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
 {t.donorProjectLinking.cancel}
 </Button>
 <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
 {deleteMutation.isPending
 ? (t.donorProjectLinking.removing)
 : (t.donorProjectLinking.remove)}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
