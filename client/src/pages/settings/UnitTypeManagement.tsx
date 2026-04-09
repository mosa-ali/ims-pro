/**
 * Unit Type Management Page
 * Admin interface for managing standardized unit types across all modules
 */

import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Search, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslation } from '@/i18n/useTranslation';

interface UnitType {
 id: number;
 name: string;
 nameAr: string;
 category: "goods" | "time_based" | "programmatic";
 description?: string;
 descriptionAr?: string;
 active: boolean;
}

type CategoryType = "goods" | "time_based" | "programmatic" | "all";

export default function UnitTypeManagement() {
 const { t } = useTranslation();
 const { isRTL } = useLanguage();
 const [searchQuery, setSearchQuery] = useState("");
 const [selectedCategory, setSelectedCategory] = useState<CategoryType>("all");
 const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
 const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
 const [editingUnit, setEditingUnit] = useState<UnitType | null>(null);
 const [formData, setFormData] = useState({
 name: "",
 nameAr: "",
 category: "goods" as const,
 description: "",
 descriptionAr: "",
 });

 // Fetch all unit types
 const { data: unitTypes, isLoading, refetch } = trpc.masterData.unitTypes.getAll.useQuery({});

 // Mutations
 const createMutation = trpc.masterData.unitTypes.create.useMutation({
 onSuccess: () => {
 toast.success(t.settingsModule.unitTypeCreatedSuccessfully);
 refetch();
 resetForm();
 setIsAddDialogOpen(false);
 },
 onError: (error) => {
 toast.error(error.message || (t.settingsModule.errorCreatingUnitType));
 },
 });

 const updateMutation = trpc.masterData.unitTypes.update.useMutation({
 onSuccess: () => {
 toast.success(t.settingsModule.unitTypeUpdatedSuccessfully);
 refetch();
 resetForm();
 setIsEditDialogOpen(false);
 },
 onError: (error) => {
 toast.error(error.message || (t.settingsModule.errorUpdatingUnitType));
 },
 });

 const deleteMutation = trpc.masterData.unitTypes.delete.useMutation({
 onSuccess: () => {
 toast.success(t.settingsModule.unitTypeDeletedSuccessfully);
 refetch();
 },
 onError: (error) => {
 toast.error(error.message || (t.settingsModule.errorDeletingUnitType));
 },
 });

 // Filter and search
 const filteredUnits = useMemo(() => {
 if (!unitTypes) return [];

 return unitTypes.filter((unit) => {
 const matchesSearch =
 unit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 unit.nameAr.includes(searchQuery);

 const matchesCategory = selectedCategory === "all" || unit.category === selectedCategory;

 return matchesSearch && matchesCategory;
 });
 }, [unitTypes, searchQuery, selectedCategory]);

 const resetForm = () => {
 setFormData({
 name: "",
 nameAr: "",
 category: "goods",
 description: "",
 descriptionAr: "",
 });
 setEditingUnit(null);
 };

 const handleAddUnit = () => {
 if (!formData.name.trim() || !formData.nameAr.trim()) {
 toast.error(t.settingsModule.pleaseFillAllRequiredFields);
 return;
 }

 createMutation.mutate({
 name: formData.name,
 nameAr: formData.nameAr,
 category: formData.category,
 description: formData.description,
 descriptionAr: formData.descriptionAr,
 });
 };

 const handleEditUnit = () => {
 if (!formData.name.trim() || !formData.nameAr.trim() || !editingUnit) {
 toast.error(t.settingsModule.pleaseFillAllRequiredFields);
 return;
 }

 updateMutation.mutate({
 id: editingUnit.id,
 name: formData.name,
 nameAr: formData.nameAr,
 category: formData.category,
 description: formData.description,
 descriptionAr: formData.descriptionAr,
 });
 };

 const handleDeleteUnit = (id: number) => {
 if (window.confirm(t.settingsModule.areYouSureYouWantTo)) {
 deleteMutation.mutate({ id });
 }
 };

 const openEditDialog = (unit: UnitType) => {
 setEditingUnit(unit);
 setFormData({
 name: unit.name,
 nameAr: unit.nameAr,
 category: unit.category,
 description: unit.description || "",
 descriptionAr: unit.descriptionAr || "",
 });
 setIsEditDialogOpen(true);
 };

 const getCategoryLabel = (category: string) => {
 const labels: Record<string, string> = {
 goods: t.settingsModule.goodsPhysical,
 time_based: t.settingsModule.timebased,
 programmatic: t.settingsModule.programmaticservices,
 };
 return labels[category] || category;
 };

 return (
 <div className={`space-y-6 $""`} dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-3xl font-bold">{t.settingsModule.unitTypeManagement}</h1>
 <p className="text-muted-foreground mt-1">
 {'Manage standardized units used across all modules'}
 </p>
 </div>
 <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
 <Plus className="w-4 h-4" />
 {t.settingsModule.addUnit}
 </Button>
 </div>

 {/* Filters */}
 <Card>
 <CardContent className="pt-6">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {/* Search */}
 <div className="relative">
 <Search className="absolute start-3 top-3 w-4 h-4 text-muted-foreground" />
 <Input
 placeholder={t.settingsModule.searchUnits}
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className={'ps-10'}
 />
 </div>

 {/* Category Filter */}
 <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as CategoryType)}>
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{t.settingsModule.allCategories}</SelectItem>
 <SelectItem value="goods">{getCategoryLabel("goods")}</SelectItem>
 <SelectItem value="time_based">{getCategoryLabel("time_based")}</SelectItem>
 <SelectItem value="programmatic">{getCategoryLabel("programmatic")}</SelectItem>
 </SelectContent>
 </Select>

 {/* Results count */}
 <div className="flex items-center text-sm text-muted-foreground">
 {`${filteredUnits.length} units`}
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Units Table */}
 <Card>
 <CardHeader>
 <CardTitle>{t.settingsModule.unitsList}</CardTitle>
 </CardHeader>
 <CardContent>
 {isLoading ? (
 <div className="flex items-center justify-center py-8">
 <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
 </div>
 ) : filteredUnits.length === 0 ? (
 <Alert>
 <AlertTriangle className="h-4 w-4" />
 <AlertDescription>
 {t.settingsModule.noUnitsFound}
 </AlertDescription>
 </Alert>
 ) : (
 <div className="overflow-x-auto">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="text-center">{t.settingsModule.name}</TableHead>
 <TableHead className="text-center">{t.settingsModule.arabicName}</TableHead>
 <TableHead className="text-center">{t.settingsModule.category}</TableHead>
 <TableHead className="text-center">{t.settingsModule.status}</TableHead>
 <TableHead className="text-center">{t.settingsModule.actions}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filteredUnits.map((unit) => (
 <TableRow key={unit.id}>
 <TableCell className="text-center">{unit.name}</TableCell>
 <TableCell className="text-center">{unit.nameAr}</TableCell>
 <TableCell className="text-center">
 <Badge variant="outline">{getCategoryLabel(unit.category)}</Badge>
 </TableCell>
 <TableCell className="text-center">
 <Badge variant={unit.active ? "default" : "secondary"}>
 {unit.active ? (t.settingsModule.active) : t.settingsModule.inactive}
 </Badge>
 </TableCell>
 <TableCell className="text-center">
 <div className="flex items-center justify-center gap-2">
 <Button
 variant="ghost"
 size="sm"
 onClick={() => openEditDialog(unit)}
 disabled={updateMutation.isPending}
 >
 <Edit2 className="w-4 h-4" />
 </Button>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleDeleteUnit(unit.id)}
 disabled={deleteMutation.isPending}
 >
 <Trash2 className="w-4 h-4 text-destructive" />
 </Button>
 </div>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>
 )}
 </CardContent>
 </Card>

 {/* Add Unit Dialog */}
 <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
 <DialogContent className="">
 <DialogHeader>
 <DialogTitle>{t.settingsModule.addNewUnit}</DialogTitle>
 <DialogDescription>
 {t.settingsModule.createANewStandardizedUnitFor}
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.settingsModule.nameEnglish}</Label>
 <Input
 value={formData.name}
 onChange={(e) => setFormData({ ...formData, name: e.target.value })}
 placeholder={t.settingsModule.egPiece}
 />
 </div>
 <div>
 <Label>{t.settingsModule.nameArabic}</Label>
 <Input
 value={formData.nameAr}
 onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
 placeholder={t.settingsModule.eg}
 />
 </div>
 </div>

 <div>
 <Label>{t.settingsModule.category}</Label>
 <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v as any })}>
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="goods">{getCategoryLabel("goods")}</SelectItem>
 <SelectItem value="time_based">{getCategoryLabel("time_based")}</SelectItem>
 <SelectItem value="programmatic">{getCategoryLabel("programmatic")}</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div>
 <Label>{t.settingsModule.descriptionOptional}</Label>
 <Input
 value={formData.description}
 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
 placeholder={t.settingsModule.unitDescription}
 />
 </div>

 <div>
 <Label>{t.settingsModule.descriptionArabicOptional}</Label>
 <Input
 value={formData.descriptionAr}
 onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
 placeholder={'وصف الوحدة'}
 />
 </div>
 </div>

 <DialogFooter>
 <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
 {t.settingsModule.cancel}
 </Button>
 <Button onClick={handleAddUnit} disabled={createMutation.isPending}>
 {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin me-2" />}
 {t.settingsModule.add}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Edit Unit Dialog */}
 <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
 <DialogContent className="">
 <DialogHeader>
 <DialogTitle>{t.settingsModule.editUnit}</DialogTitle>
 <DialogDescription>
 {t.settingsModule.updateTheStandardizedUnitDetails}
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.settingsModule.nameEnglish}</Label>
 <Input
 value={formData.name}
 onChange={(e) => setFormData({ ...formData, name: e.target.value })}
 placeholder={t.settingsModule.egPiece}
 />
 </div>
 <div>
 <Label>{t.settingsModule.nameArabic}</Label>
 <Input
 value={formData.nameAr}
 onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
 placeholder={t.settingsModule.eg}
 />
 </div>
 </div>

 <div>
 <Label>{t.settingsModule.category}</Label>
 <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v as any })}>
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="goods">{getCategoryLabel("goods")}</SelectItem>
 <SelectItem value="time_based">{getCategoryLabel("time_based")}</SelectItem>
 <SelectItem value="programmatic">{getCategoryLabel("programmatic")}</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div>
 <Label>{t.settingsModule.descriptionOptional}</Label>
 <Input
 value={formData.description}
 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
 placeholder={t.settingsModule.unitDescription}
 />
 </div>

 <div>
 <Label>{t.settingsModule.descriptionArabicOptional}</Label>
 <Input
 value={formData.descriptionAr}
 onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
 placeholder={'وصف الوحدة'}
 />
 </div>
 </div>

 <DialogFooter>
 <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
 {t.settingsModule.cancel}
 </Button>
 <Button onClick={handleEditUnit} disabled={updateMutation.isPending}>
 {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin me-2" />}
 {t.settingsModule.saveChanges}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
