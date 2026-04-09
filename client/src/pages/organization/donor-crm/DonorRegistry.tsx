import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/i18n/useTranslation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
 Plus,
 Search,
 Edit,
 Trash2,
 Eye,
 Download,
 ArrowLeft, ArrowRight,
 RefreshCw,
 UserCircle,
 Building2,
 Mail,
 Phone,
 Globe,
 MapPin,
 RotateCcw,
} from "lucide-react";
import { Link } from "wouter";
import * as XLSX from "xlsx";
import { DonorProjectLinking } from "@/components/DonorProjectLinking";
import { useLanguage } from '@/contexts/LanguageContext';
import { BackButton } from "@/components/BackButton";

// Donor types
const DONOR_TYPES = [
 { value: "bilateral", label: "Bilateral", labelAr: "ثنائي" },
 { value: "multilateral", label: "Multilateral", labelAr: "متعدد الأطراف" },
 { value: "foundation", label: "Foundation", labelAr: "مؤسسة" },
 { value: "corporate", label: "Corporate", labelAr: "شركة" },
 { value: "individual", label: "Individual", labelAr: "فرد" },
 { value: "government", label: "Government", labelAr: "حكومة" },
 { value: "ngo", label: "NGO", labelAr: "منظمة غير حكومية" },
 { value: "other", label: "Other", labelAr: "أخرى" },
] as const;

type DonorType = typeof DONOR_TYPES[number]["value"];

interface DonorFormData {
 code: string;
 name: string;
 nameAr: string;
 type: DonorType;
 category: string;
 contactPersonName: string;
 contactPersonTitle: string;
 email: string;
 phone: string;
 website: string;
 address: string;
 city: string;
 country: string;
 postalCode: string;
 notes: string;
 notesAr: string;
 isActive: boolean;
}

const initialFormData: DonorFormData = {
 code: "",
 name: "",
 nameAr: "",
 type: "other",
 category: "",
 contactPersonName: "",
 contactPersonTitle: "",
 email: "",
 phone: "",
 website: "",
 address: "",
 city: "",
 country: "",
 postalCode: "",
 notes: "",
 notesAr: "",
 isActive: true,
};

export default function DonorRegistry() {
 const { t, language } = useTranslation();
  const { isRTL } = useLanguage();
const utils = trpc.useUtils();

 // State
 const [page, setPage] = useState(1);
 const [search, setSearch] = useState("");
 const [typeFilter, setTypeFilter] = useState<DonorType | "all">("all");
 const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
 const [showDeleted, setShowDeleted] = useState(false);

 // Dialogs
 const [createDialogOpen, setCreateDialogOpen] = useState(false);
 const [editDialogOpen, setEditDialogOpen] = useState(false);
 const [viewDialogOpen, setViewDialogOpen] = useState(false);
 const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
 const [selectedDonor, setSelectedDonor] = useState<any>(null);
 const [formData, setFormData] = useState<DonorFormData>(initialFormData);

 // Queries
 const { data: donorsData, isLoading, refetch } = trpc.donors.list.useQuery({
 page,
 pageSize: 20,
 search: search || undefined,
 type: typeFilter !== "all" ? typeFilter : undefined,
 isActive: activeFilter === "all" ? undefined : activeFilter === "active",
 includeDeleted: showDeleted,
 });

 const { data: kpis } = trpc.donors.getKPIs.useQuery();

 // Mutations
 const createMutation = trpc.donors.create.useMutation({
 onSuccess: () => {
 toast.success(t.donorRegistry.donorCreatedSuccessfully);
 setCreateDialogOpen(false);
 setFormData(initialFormData);
 utils.donors.list.invalidate();
 utils.donors.getKPIs.invalidate();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const updateMutation = trpc.donors.update.useMutation({
 onSuccess: () => {
 toast.success(t.donorRegistry.donorUpdatedSuccessfully);
 setEditDialogOpen(false);
 setSelectedDonor(null);
 utils.donors.list.invalidate();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const deleteMutation = trpc.donors.softDelete.useMutation({
 onSuccess: () => {
 toast.success(t.donorRegistry.donorDeletedSuccessfully);
 setDeleteDialogOpen(false);
 setSelectedDonor(null);
 utils.donors.list.invalidate();
 utils.donors.getKPIs.invalidate();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const restoreMutation = trpc.donors.restore.useMutation({
 onSuccess: () => {
 toast.success(t.donorRegistry.donorRestoredSuccessfully);
 utils.donors.list.invalidate();
 utils.donors.getKPIs.invalidate();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 // Export query
 const { refetch: exportData } = trpc.donors.exportData.useQuery(
 {
 search: search || undefined,
 type: typeFilter !== "all" ? typeFilter : undefined,
 isActive: activeFilter === "all" ? undefined : activeFilter === "active",
 },
 { enabled: false }
 );

 // Handlers
 const handleCreate = () => {
 createMutation.mutate({
 ...formData,
 nameAr: formData.nameAr || null,
 category: formData.category || null,
 contactPersonName: formData.contactPersonName || null,
 contactPersonTitle: formData.contactPersonTitle || null,
 email: formData.email || null,
 phone: formData.phone || null,
 website: formData.website || null,
 address: formData.address || null,
 city: formData.city || null,
 country: formData.country || null,
 postalCode: formData.postalCode || null,
 notes: formData.notes || null,
 notesAr: formData.notesAr || null,
 });
 };

 const handleUpdate = () => {
 if (!selectedDonor) return;
 updateMutation.mutate({
 id: selectedDonor.id,
 ...formData,
 nameAr: formData.nameAr || null,
 category: formData.category || null,
 contactPersonName: formData.contactPersonName || null,
 contactPersonTitle: formData.contactPersonTitle || null,
 email: formData.email || null,
 phone: formData.phone || null,
 website: formData.website || null,
 address: formData.address || null,
 city: formData.city || null,
 country: formData.country || null,
 postalCode: formData.postalCode || null,
 notes: formData.notes || null,
 notesAr: formData.notesAr || null,
 });
 };

 const handleDelete = () => {
 if (!selectedDonor) return;
 deleteMutation.mutate({ id: selectedDonor.id });
 };

 const handleRestore = (donor: any) => {
 restoreMutation.mutate({ id: donor.id });
 };

 const handleExport = async () => {
 const result = await exportData();
 if (result.data?.donors) {
 const exportRows = result.data.donors.map((d) => ({
 Code: d.code,
 Name: d.name,
 "Name (Arabic)": d.nameAr || "",
 Type: d.type,
 Category: d.category || "",
 "Contact Person": d.contactPersonName || "",
 Email: d.email || "",
 Phone: d.phone || "",
 Website: d.website || "",
 City: d.city || "",
 Country: d.country || "",
 Status: d.isActive ? "Active" : "Inactive",
 }));

 const ws = XLSX.utils.json_to_sheet(exportRows);
 const wb = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb, ws, "Donors");
 XLSX.writeFile(wb, `donors_export_${new Date().toISOString().split("T")[0]}.xlsx`);

 toast.success(t.donorRegistry.donorsExportedToExcel);
 }
 };

 const openEditDialog = (donor: any) => {
 setSelectedDonor(donor);
 setFormData({
 code: donor.code || "",
 name: donor.name || "",
 nameAr: donor.nameAr || "",
 type: donor.type || "other",
 category: donor.category || "",
 contactPersonName: donor.contactPersonName || "",
 contactPersonTitle: donor.contactPersonTitle || "",
 email: donor.email || "",
 phone: donor.phone || "",
 website: donor.website || "",
 address: donor.address || "",
 city: donor.city || "",
 country: donor.country || "",
 postalCode: donor.postalCode || "",
 notes: donor.notes || "",
 notesAr: donor.notesAr || "",
 isActive: donor.isActive ?? true,
 });
 setEditDialogOpen(true);
 };

 const openViewDialog = (donor: any) => {
 setSelectedDonor(donor);
 setViewDialogOpen(true);
 };

 const openDeleteDialog = (donor: any) => {
 setSelectedDonor(donor);
 setDeleteDialogOpen(true);
 };

 const getTypeLabel = (type: string) => {
 const found = DONOR_TYPES.find((t) => t.value === type);
 return language === "en" ? found?.label || type : found?.labelAr || type;
 };

 const donors = donorsData?.donors || [];
 const pagination = donorsData?.pagination;

 return (
 <div className="min-h-screen bg-gray-50">
 {/* Header */}
 <div className="bg-white border-b border-gray-200 px-8 py-6">
 <div className="max-w-7xl mx-auto">
 <div className="flex items-center gap-4 mb-4">
 <Link href="/organization/donor-crm">
 <BackButton label={t.donorRegistry.back} />
 </Link>
 </div>
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-3xl font-bold text-gray-900">
 {t.donorRegistry.donorRegistry}
 </h1>
 <p className="text-gray-600 mt-2">
 {t.donorRegistry.manageDonorProfilesContactInformationAnd}
 </p>
 </div>
 <div className="flex gap-2">
 <Button variant="outline" onClick={handleExport}>
 <Download className="w-4 h-4 me-2" />
 {t.donorRegistry.export}
 </Button>
 <Button onClick={() => {
 setFormData(initialFormData);
 setCreateDialogOpen(true);
 }}>
 <Plus className="w-4 h-4 me-2" />
 {t.donorRegistry.addDonor}
 </Button>
 </div>
 </div>
 </div>
 </div>

 {/* KPI Cards */}
 <div className="max-w-7xl mx-auto px-8 py-6">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">
 {t.donorRegistry.totalDonors}
 </p>
 <p className="text-2xl font-bold">{kpis?.totalDonors || 0}</p>
 </div>
 <UserCircle className="w-8 h-8 text-blue-500" />
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">
 {t.donorRegistry.activeDonors}
 </p>
 <p className="text-2xl font-bold text-green-600">{kpis?.activeDonors || 0}</p>
 </div>
 <Building2 className="w-8 h-8 text-green-500" />
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">
 {t.donorRegistry.donorTypes}
 </p>
 <p className="text-2xl font-bold">{kpis?.byType?.length || 0}</p>
 </div>
 <Globe className="w-8 h-8 text-purple-500" />
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Filters */}
 <Card className="mb-6">
 <CardContent className="pt-6">
 <div className="flex flex-wrap gap-4">
 <div className="flex-1 min-w-[200px]">
 <div className="relative">
 <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
 <Input
 placeholder={t.donorRegistry.searchDonors}
 value={search}
 onChange={(e) => {
 setSearch(e.target.value);
 setPage(1);
 }}
 className="ps-10"
 />
 </div>
 </div>
 <Select
 value={typeFilter}
 onValueChange={(v) => {
 setTypeFilter(v as DonorType | "all");
 setPage(1);
 }}
 >
 <SelectTrigger className="w-[180px]">
 <SelectValue placeholder={t.donorRegistry.allTypes} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{t.donorRegistry.allTypes}</SelectItem>
 {DONOR_TYPES.map((type) => (
 <SelectItem key={type.value} value={type.value}>
 {language === "en" ? type.label : type.labelAr}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 <Select
 value={activeFilter}
 onValueChange={(v) => {
 setActiveFilter(v as "all" | "active" | "inactive");
 setPage(1);
 }}
 >
 <SelectTrigger className="w-[150px]">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{t.donorRegistry.allStatus}</SelectItem>
 <SelectItem value="active">{t.donorRegistry.active}</SelectItem>
 <SelectItem value="inactive">{t.donorRegistry.inactive}</SelectItem>
 </SelectContent>
 </Select>
 <Button
 variant={showDeleted ? "default" : "outline"}
 onClick={() => setShowDeleted(!showDeleted)}
 >
 <Trash2 className="w-4 h-4 me-2" />
 {t.donorRegistry.showDeleted}
 </Button>
 <Button variant="outline" onClick={() => refetch()}>
 <RefreshCw className="w-4 h-4" />
 </Button>
 </div>
 </CardContent>
 </Card>

 {/* Table */}
 <Card>
 <CardContent className="p-0">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.donorRegistry.code}</TableHead>
 <TableHead>{t.donorRegistry.name}</TableHead>
 <TableHead>{t.donorRegistry.type}</TableHead>
 <TableHead>{t.donorRegistry.contact}</TableHead>
 <TableHead>{t.donorRegistry.email}</TableHead>
 <TableHead>{t.donorRegistry.status}</TableHead>
 <TableHead className="text-center">{t.donorRegistry.actions}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {isLoading ? (
 <TableRow>
 <TableCell colSpan={7} className="text-center py-8">
 {t.donorRegistry.loading}
 </TableCell>
 </TableRow>
 ) : donors.length === 0 ? (
 <TableRow>
 <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
 {t.donorRegistry.noDonorsFound}
 </TableCell>
 </TableRow>
 ) : (
 donors.map((donor) => (
 <TableRow key={donor.id} className={donor.deletedAt ? "opacity-50" : ""}>
 <TableCell className="font-medium">{donor.code}</TableCell>
 <TableCell>
 <div>
 <p className="font-medium">{language === "en" ? donor.name : donor.nameAr || donor.name}</p>
 {donor.nameAr && language === "en" && (
 <p className="text-xs text-muted-foreground">{donor.nameAr}</p>
 )}
 </div>
 </TableCell>
 <TableCell>
 <Badge variant="outline">{getTypeLabel(donor.type || "other")}</Badge>
 </TableCell>
 <TableCell>{donor.contactPersonName || "-"}</TableCell>
 <TableCell>{donor.email || "-"}</TableCell>
 <TableCell>
 {donor.deletedAt ? (
 <Badge variant="destructive">{t.donorRegistry.deleted}</Badge>
 ) : donor.isActive ? (
 <Badge variant="default" className="bg-green-500">{t.donorRegistry.active}</Badge>
 ) : (
 <Badge variant="secondary">{t.donorRegistry.inactive}</Badge>
 )}
 </TableCell>
 <TableCell className="text-end">
 <div className="flex justify-end gap-2">
 <Button variant="ghost" size="sm" onClick={() => openViewDialog(donor)}>
 <Eye className="w-4 h-4" />
 </Button>
 {donor.deletedAt ? (
 <Button variant="ghost" size="sm" onClick={() => handleRestore(donor)}>
 <RotateCcw className="w-4 h-4" />
 </Button>
 ) : (
 <>
 <Button variant="ghost" size="sm" onClick={() => openEditDialog(donor)}>
 <Edit className="w-4 h-4" />
 </Button>
 <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(donor)}>
 <Trash2 className="w-4 h-4 text-destructive" />
 </Button>
 </>
 )}
 </div>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </CardContent>
 </Card>

 {/* Pagination */}
 {pagination && pagination.totalPages > 1 && (
 <div className="flex justify-center gap-2 mt-4">
 <Button
 variant="outline"
 disabled={page === 1}
 onClick={() => setPage(page - 1)}
 >
 {t.donorRegistry.previous}
 </Button>
 <span className="flex items-center px-4">
 {`Page ${page} of ${pagination.totalPages}`}
 </span>
 <Button
 variant="outline"
 disabled={page === pagination.totalPages}
 onClick={() => setPage(page + 1)}
 >
 {t.donorRegistry.next}
 </Button>
 </div>
 )}
 </div>

 {/* Create Dialog */}
 <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
 <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>{t.donorRegistry.addNewDonor}</DialogTitle>
 <DialogDescription>
 {t.donorRegistry.fillInTheDonorInformationBelow}
 </DialogDescription>
 </DialogHeader>
 <DonorForm formData={formData} setFormData={setFormData} language={language} />
 <DialogFooter>
 <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
 {t.donorRegistry.cancel}
 </Button>
 <Button onClick={handleCreate} disabled={createMutation.isPending}>
 {createMutation.isPending
 ? (t.donorRegistry.creating)
 : (t.donorRegistry.createDonor)}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Edit Dialog */}
 <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
 <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>{t.donorRegistry.editDonor}</DialogTitle>
 <DialogDescription>
 {t.donorRegistry.updateTheDonorInformationBelow}
 </DialogDescription>
 </DialogHeader>
 <DonorForm formData={formData} setFormData={setFormData} language={language} />
 <DialogFooter>
 <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
 {t.donorRegistry.cancel}
 </Button>
 <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
 {updateMutation.isPending
 ? (t.donorRegistry.saving)
 : (t.donorRegistry.saveChanges)}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* View Dialog */}
 <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
 <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>{t.donorRegistry.donorDetails}</DialogTitle>
 </DialogHeader>
 {selectedDonor && (
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label className="text-muted-foreground">{t.donorRegistry.code}</Label>
 <p className="font-medium">{selectedDonor.code}</p>
 </div>
 <div>
 <Label className="text-muted-foreground">{t.donorRegistry.type}</Label>
 <p className="font-medium">{getTypeLabel(selectedDonor.type || "other")}</p>
 </div>
 <div>
 <Label className="text-muted-foreground">{t.donorRegistry.name}</Label>
 <p className="font-medium">{selectedDonor.name}</p>
 </div>
 <div>
 <Label className="text-muted-foreground">{t.donorRegistry.nameArabic}</Label>
 <p className="font-medium">{selectedDonor.nameAr || "-"}</p>
 </div>
 </div>
 <div className="border-t pt-4">
 <h4 className="font-medium mb-2">{t.donorRegistry.contactInformation}</h4>
 <div className="grid grid-cols-2 gap-4">
 <div className="flex items-center gap-2">
 <UserCircle className="w-4 h-4 text-muted-foreground" />
 <span>{selectedDonor.contactPersonName || "-"}</span>
 </div>
 <div className="flex items-center gap-2">
 <Mail className="w-4 h-4 text-muted-foreground" />
 <span>{selectedDonor.email || "-"}</span>
 </div>
 <div className="flex items-center gap-2">
 <Phone className="w-4 h-4 text-muted-foreground" />
 <span>{selectedDonor.phone || "-"}</span>
 </div>
 <div className="flex items-center gap-2">
 <Globe className="w-4 h-4 text-muted-foreground" />
 <span>{selectedDonor.website || "-"}</span>
 </div>
 </div>
 </div>
 <div className="border-t pt-4">
 <h4 className="font-medium mb-2">{t.donorRegistry.address}</h4>
 <div className="flex items-start gap-2">
 <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
 <div>
 <p>{selectedDonor.address || "-"}</p>
 <p>{[selectedDonor.city, selectedDonor.country].filter(Boolean).join(", ") || "-"}</p>
 </div>
 </div>
 </div>
 {selectedDonor.notes && (
 <div className="border-t pt-4">
 <h4 className="font-medium mb-2">{t.donorRegistry.notes}</h4>
 <p className="text-muted-foreground">{selectedDonor.notes}</p>
 </div>
 )}
 {/* Linked Projects Section */}
 <div className="border-t pt-4">
 <DonorProjectLinking donorId={selectedDonor.id} mode="donor" />
 </div>
 </div>
 )}
 <DialogFooter>
 <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
 {t.donorRegistry.close}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Delete Confirmation Dialog */}
 <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>{t.donorRegistry.deleteDonor}</DialogTitle>
 <DialogDescription>
 {`Are you sure you want to delete "${selectedDonor?.name}"? This action can be undone.`}
 </DialogDescription>
 </DialogHeader>
 <DialogFooter>
 <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
 {t.donorRegistry.cancel}
 </Button>
 <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
 {deleteMutation.isPending
 ? (t.donorRegistry.deleting)
 : (t.donorRegistry.delete)}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}

// Donor Form Component
function DonorForm({
 formData,
 setFormData,
 language,
}: {
 formData: DonorFormData;
 setFormData: React.Dispatch<React.SetStateAction<DonorFormData>>;
 language: string;
}) {
 const { t } = useTranslation();
 return (
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.donorRegistry.code2}</Label>
 <Input
 value={formData.code}
 onChange={(e) => setFormData({ ...formData, code: e.target.value })}
 placeholder={t.donorRegistry.egUsaid}
 />
 </div>
 <div>
 <Label>{t.donorRegistry.type}</Label>
 <Select
 value={formData.type}
 onValueChange={(v) => setFormData({ ...formData, type: v as DonorType })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {DONOR_TYPES.map((type) => (
 <SelectItem key={type.value} value={type.value}>
 {language === "en" ? type.label : type.labelAr}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.donorRegistry.nameEnglish}</Label>
 <Input
 value={formData.name}
 onChange={(e) => setFormData({ ...formData, name: e.target.value })}
 />
 </div>
 <div>
 <Label>{t.donorRegistry.nameArabic}</Label>
 <Input
 value={formData.nameAr}
 onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
 dir="rtl"
 />
 </div>
 </div>

 <div>
 <Label>{t.donorRegistry.category}</Label>
 <Input
 value={formData.category}
 onChange={(e) => setFormData({ ...formData, category: e.target.value })}
 placeholder={t.donorRegistry.egHealthEducation}
 />
 </div>

 <div className="border-t pt-4">
 <h4 className="font-medium mb-3">{t.donorRegistry.contactInformation}</h4>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.donorRegistry.contactPersonName}</Label>
 <Input
 value={formData.contactPersonName}
 onChange={(e) => setFormData({ ...formData, contactPersonName: e.target.value })}
 />
 </div>
 <div>
 <Label>{t.donorRegistry.contactPersonTitle}</Label>
 <Input
 value={formData.contactPersonTitle}
 onChange={(e) => setFormData({ ...formData, contactPersonTitle: e.target.value })}
 />
 </div>
 <div>
 <Label>{t.donorRegistry.email}</Label>
 <Input
 type="email"
 value={formData.email}
 onChange={(e) => setFormData({ ...formData, email: e.target.value })}
 />
 </div>
 <div>
 <Label>{t.donorRegistry.phone}</Label>
 <Input
 value={formData.phone}
 onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
 />
 </div>
 <div className="col-span-2">
 <Label>{t.donorRegistry.website}</Label>
 <Input
 value={formData.website}
 onChange={(e) => setFormData({ ...formData, website: e.target.value })}
 placeholder="https://"
 />
 </div>
 </div>
 </div>

 <div className="border-t pt-4">
 <h4 className="font-medium mb-3">{t.donorRegistry.address}</h4>
 <div className="space-y-4">
 <div>
 <Label>{t.donorRegistry.streetAddress}</Label>
 <Textarea
 value={formData.address}
 onChange={(e) => setFormData({ ...formData, address: e.target.value })}
 rows={2}
 />
 </div>
 <div className="grid grid-cols-3 gap-4">
 <div>
 <Label>{t.donorRegistry.city}</Label>
 <Input
 value={formData.city}
 onChange={(e) => setFormData({ ...formData, city: e.target.value })}
 />
 </div>
 <div>
 <Label>{t.donorRegistry.country}</Label>
 <Input
 value={formData.country}
 onChange={(e) => setFormData({ ...formData, country: e.target.value })}
 />
 </div>
 <div>
 <Label>{t.donorRegistry.postalCode}</Label>
 <Input
 value={formData.postalCode}
 onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
 />
 </div>
 </div>
 </div>
 </div>

 <div className="border-t pt-4">
 <h4 className="font-medium mb-3">{t.donorRegistry.notes}</h4>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.donorRegistry.notesEnglish}</Label>
 <Textarea
 value={formData.notes}
 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
 rows={3}
 />
 </div>
 <div>
 <Label>{t.donorRegistry.notesArabic}</Label>
 <Textarea
 value={formData.notesAr}
 onChange={(e) => setFormData({ ...formData, notesAr: e.target.value })}
 rows={3}
 dir="rtl"
 />
 </div>
 </div>
 </div>

 <div className="border-t pt-4">
 <div className="flex items-center gap-2">
 <input
 type="checkbox"
 id="isActive"
 checked={formData.isActive}
 onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
 className="rounded border-gray-300"
 />
 <Label htmlFor="isActive">{t.donorRegistry.active}</Label>
 </div>
 </div>
 </div>
 );
}
