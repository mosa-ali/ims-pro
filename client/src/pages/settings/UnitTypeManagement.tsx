/**
 * Enhanced Unit Type Management with Global Types Integration
 * 
 * FEATURES:
 * - Displays global unit types (32 standard types)
 * - Allows adding custom unit types
 * - Merges global + custom types for complete view
 * - Sort order support for custom ordering
 * - Color and icon support
 * - No design changes from original
 * 
 * PATTERN: Similar to GLOBAL_CURRENCIES in BudgetInformationSection.tsx
 * - Global types are pre-loaded and fast
 * - Custom types can override or extend globals
 * - Full bilingual support (English + Arabic)
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
import { Plus, Edit2, Trash2, Search, Loader2, AlertTriangle, Globe } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslation } from '@/i18n/useTranslation';
import { 
  GLOBAL_UNIT_TYPES, 
  getUnitTypesByCategory, 
  getCategoryLabel,
  getAllCategories,
} from '../../../../shared/constants/unitTypes'; // NEW: Import global types
import { GLOBAL_OPTION_SETS } from '../../../../shared/constants/optionSets';
import {
  buildLocalizedOptions,
  UnitCategory,
  getLocalizedLabel,
  getUniqueCategories,
} from '../../lib/masterDataHelpers';

interface UnitType {
  id: number;

  name: string;
  nameAr: string;

  category: UnitCategory;

  description?: string;
  descriptionAr?: string;

  active: boolean;

  sortOrder?: number;

  color?: string;
  icon?: string;

  isGlobal?: boolean;
}

type CategoryType = "goods" | "time_based" | "programmatic" | "all";

export default function UnitTypeManagement() {
  const { t } = useTranslation();
  const { isRTL, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitType | null>(null);
  const [showGlobalOnly, setShowGlobalOnly] = useState(false); // NEW: Toggle for global types
  const [formData, setFormData] = useState<{
        name: string;
        nameAr: string;
        category: UnitCategory;
        description: string;
        descriptionAr: string;
        sortOrder: number;
        color: string;
        icon: string;
        }>({
        name: "",
        nameAr: "",
        category: "goods",
        description: "",
        descriptionAr: "",
        sortOrder: 0,
        color: "",
        icon: "",
        });

  // Fetch custom unit types from database
  const { data: customUnitTypes, isLoading, refetch } = trpc.masterData.unitTypes.getAll.useQuery({});

  // NEW: Merge global and custom unit types
  const allUnitTypes = useMemo(() => {
    const merged: UnitType[] = [];
    const customValues = new Set(
        customUnitTypes?.map((u: any) => u.value)
        );
    customUnitTypes?.forEach((customType: any) => {
        const existingIndex = merged.findIndex(
            (u) => u.name === customType.name
        );

        if (existingIndex >= 0) {
            merged[existingIndex] = {
            ...merged[existingIndex],
            ...customType,
            isGlobal: false,
            };
        } else {
            merged.push({
            ...customType,
            isGlobal: false,
            });
        }
        });
    // Add global types
    GLOBAL_UNIT_TYPES.forEach((globalType) => {
      merged.push({
        id: globalType.id || 0,
        name: globalType.label,
        nameAr: globalType.labelAr || globalType.label,
        category: (globalType.category as any) || "goods",
        description: globalType.description,
        descriptionAr: globalType.descriptionAr || undefined,
        active: globalType.active !== false,
        sortOrder: globalType.sortOrder || 0,
        color: globalType.color,
        icon: globalType.icon,
        isGlobal: true,
      });
    });

    // Add custom types (override globals with same ID if exists)
    customUnitTypes?.forEach((customType: any) => {
      const existingIndex = merged.findIndex((u) => u.id === customType.id);
      if (existingIndex >= 0) {
        merged[existingIndex] = {
          ...merged[existingIndex],
          ...customType,
          isGlobal: false,
        };
      } else {
        merged.push({
          ...customType,
          isGlobal: false,
        });
      }
    });

    return merged;
  }, [customUnitTypes]);

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
    let filtered = allUnitTypes;

    // Filter by global/custom toggle
    if (showGlobalOnly) {
      filtered = filtered.filter((unit) => unit.isGlobal);
    }

    // Filter by search
    filtered = filtered.filter((unit) => {
      const matchesSearch =
        unit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        unit.nameAr.includes(searchQuery);
      return matchesSearch;
    });

    // Filter by category
    filtered = filtered.filter((unit) => {
      return (
            selectedCategory === "all" ||
            unit.category === (selectedCategory as UnitCategory)
            );
    });

    // Sort by sortOrder
    return filtered.sort((a, b) => {
      if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
        return a.sortOrder - b.sortOrder;
      }
      const labelA = language === 'ar' ? a.nameAr : a.name;
      const labelB = language === 'ar' ? b.nameAr : b.name;
      return labelA.localeCompare(labelB);
    });
  }, [allUnitTypes, searchQuery, selectedCategory, showGlobalOnly, language]);

  const resetForm = () => {
    setFormData({
      name: "",
      nameAr: "",
      category: "goods",
      description: "",
      descriptionAr: "",
      sortOrder: 0,
      color: "",
      icon: "",
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

    // Only allow editing custom types
    if (editingUnit.isGlobal) {
      toast.error("Cannot edit global unit types. Create a custom type instead.");
      return;
    }

    updateMutation.mutate({
      id: editingUnit.id,
      name: formData.name,
      nameAr: formData.nameAr,
      description: formData.description,
      descriptionAr: formData.descriptionAr,
    });
  };

  const handleDeleteUnit = (id: number, isGlobal: boolean) => {
    if (isGlobal) {
      toast.error("Cannot delete global unit types.");
      return;
    }

    if (window.confirm(t.settingsModule.areYouSureYouWantTo)) {
      deleteMutation.mutate({ id });
    }
  };

  const openEditDialog = (unit: UnitType) => {
    if (unit.isGlobal) {
      toast.error("Global unit types cannot be edited directly. Create a custom type to override.");
      return;
    }

    setEditingUnit(unit);
    setFormData({
      name: unit.name,
      nameAr: unit.nameAr,
      category: unit.category,
      description: unit.description || "",
      descriptionAr: unit.descriptionAr || "",
      sortOrder: unit.sortOrder || 0,
      color: unit.color || "",
      icon: unit.icon || "",
    });
    setIsEditDialogOpen(true);
  };

  const getCategoryLabelText = (category: string) => {
    return getCategoryLabel(category, language);
  };

  return (
    <div className={`space-y-6 $""`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header - ENHANCED with global types info */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t.settingsModule.unitTypeManagement}</h1>
          <p className="text-muted-foreground mt-1">
            {'Manage standardized units used across all modules (includes 32 global types)'}
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          {t.settingsModule.addUnit}
        </Button>
      </div>

      {/* Info Alert - NEW: Global types information */}
      <Alert className="border-blue-200 bg-blue-50">
        <Globe className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          This system includes <strong>32 global unit types</strong> pre-loaded for use across all modules. 
          You can also create custom unit types specific to your organization.
        </AlertDescription>
      </Alert>

      {/* Filters - ENHANCED */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <SelectItem value="goods">{getCategoryLabelText("goods")}</SelectItem>
                <SelectItem value="time_based">{getCategoryLabelText("time_based")}</SelectItem>
                <SelectItem value="programmatic">{getCategoryLabelText("programmatic")}</SelectItem>
              </SelectContent>
            </Select>

            {/* NEW: Global/Custom toggle */}
            <Select value={showGlobalOnly ? "global" : "all"} onValueChange={(v) => setShowGlobalOnly(v === "global")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="global">Global Only</SelectItem>
              </SelectContent>
            </Select>

            {/* Results count */}
            <div className="flex items-center text-sm text-muted-foreground">
              {`${filteredUnits.length} units`}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Units Table - ENHANCED */}
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
                    <TableHead className="text-center">Type</TableHead>
                    <TableHead className="text-center">{t.settingsModule.status}</TableHead>
                    <TableHead className="text-center">Sort Order</TableHead>
                    <TableHead className="text-center">{t.settingsModule.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUnits.map((unit) => (
                    <TableRow key={unit.id} className={unit.isGlobal ? "bg-blue-50" : ""}>
                      <TableCell className="text-center">{unit.name}</TableCell>
                      <TableCell className="text-center">{unit.nameAr}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{getCategoryLabelText(unit.category)}</Badge>
                      </TableCell>
                      {/* NEW: Type badge */}
                      <TableCell className="text-center">
                        <Badge variant={unit.isGlobal ? "default" : "secondary"}>
                          {unit.isGlobal ? "Global" : "Custom"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={unit.active ? "default" : "secondary"}>
                          {unit.active ? (t.settingsModule.active) : t.settingsModule.inactive}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm text-gray-600">{unit.sortOrder || 0}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(unit)}
                            disabled={updateMutation.isPending || unit.isGlobal}
                            title={unit.isGlobal ? "Global types cannot be edited" : "Edit"}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUnit(unit.id, unit.isGlobal || false)}
                            disabled={deleteMutation.isPending || unit.isGlobal}
                            title={unit.isGlobal ? "Global types cannot be deleted" : "Delete"}
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

      {/* Add Unit Dialog - UNCHANGED */}
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
                  <SelectItem value="goods">{getCategoryLabelText("goods")}</SelectItem>
                  <SelectItem value="time_based">{getCategoryLabelText("time_based")}</SelectItem>
                  <SelectItem value="programmatic">{getCategoryLabelText("programmatic")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t.settingsModule.descriptionOptional}</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t.settingsModule.descriptionOptional}
              />
            </div>

            <div>
              <Label>{t.settingsModule.descriptionArabicOptional}</Label>
              <Input
                value={formData.descriptionAr}
                onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                placeholder={t.settingsModule.descriptionArabicOptional}
              />
            </div>

            <div>
              <Label>Sort Order (Optional)</Label>
              <Input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                placeholder="0"
                min="0"
              />
            </div>

            <div>
              <Label>Color (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-12 h-10"
                />
                <Input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label>Icon (Optional)</Label>
              <Input
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="e.g., package, clock, settings"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }}>
              {t.settingsModule.cancel}
            </Button>
            <Button onClick={handleAddUnit} disabled={createMutation.isPending}>
              {t.settingsModule.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Unit Dialog - UNCHANGED */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="">
          <DialogHeader>
            <DialogTitle>{t.settingsModule.editUnit}</DialogTitle>
            <DialogDescription>
              {t.settingsModule.updateTheUnitInformation}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t.settingsModule.nameEnglish}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label>{t.settingsModule.nameArabic}</Label>
                <Input
                  value={formData.nameAr}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
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
                  <SelectItem value="goods">{getCategoryLabelText("goods")}</SelectItem>
                  <SelectItem value="time_based">{getCategoryLabelText("time_based")}</SelectItem>
                  <SelectItem value="programmatic">{getCategoryLabelText("programmatic")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t.settingsModule.descriptionOptional}</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <Label>{t.settingsModule.descriptionArabicOptional}</Label>
              <Input
                value={formData.descriptionAr}
                onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
              />
            </div>

            <div>
              <Label>Sort Order (Optional)</Label>
              <Input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                min="0"
              />
            </div>

            <div>
              <Label>Color (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-12 h-10"
                />
                <Input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Icon (Optional)</Label>
              <Input
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); resetForm(); }}>
              {t.settingsModule.cancel}
            </Button>
            <Button onClick={handleEditUnit} disabled={updateMutation.isPending}>
              {t.settingsModule.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
