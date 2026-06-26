/**
 * Assets - Categories Section Page
 */

import { useState } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOperatingUnit } from "@/contexts/OperatingUnitContext";
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Pencil,
  Trash2,
  Tag,
  Download,
  Upload,
} from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import { AssetImportExportDialog, type ImportResult, type TemplateColumn } from '@/components/AssetImportExportDialog';

export default function AssetCategories() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { currentOrganization } = useOrganization();
   const { currentOperatingUnit } = useOperatingUnit();
 const organizationId = currentOrganization?.id || 0;
 const operatingUnitId = currentOperatingUnit?.id;
  const navigate = useNavigate();

  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const [categoryForm, setCategoryForm] = useState<{
    code: string;
    name: string;
    description: string;
    assetClass: string;
    parentId: number | undefined;
    usefulLifeYears: number;
    depreciationRate: string;
    residualValuePercentage: string;
    capitalizationThreshold: string;
    defaultDepreciationMethod: string;
    ownershipType: string;
    trackSerialNumber: number;
    requiresCustodian: number;
    requiresLocation: number;
    requiresInsurance: number;
    isDonorReportable: number;
    isActive: number;
  }>({
    code: '',
    name: '',
    description: '',
    assetClass: '',
    parentId: undefined,
    usefulLifeYears: 5,
    depreciationRate: '0.00',
    residualValuePercentage: '0.00',
    capitalizationThreshold: '500',
    defaultDepreciationMethod: 'straight_line',
    ownershipType: 'organization',
    trackSerialNumber: 1,
    requiresCustodian: 1,
    requiresLocation: 1,
    requiresInsurance: 0,
    isDonorReportable: 1,
    isActive: 1,
  });

  // Fetch data
  const categoriesQuery = trpc.assets.listCategories.useQuery({});

  const createCategoryMutation = trpc.assets.createCategory.useMutation({
    onSuccess: () => {
      toast.success(t.financeModule.categoryCreatedSuccessfully || 'Category created');
      categoriesQuery.refetch();
      setShowCategoryDialog(false);
      resetCategoryForm();
    },
  });

  const updateCategoryMutation = trpc.assets.updateCategory.useMutation({
    onSuccess: () => {
      toast.success(t.financeModule.categoryUpdatedSuccessfully || 'Category updated');
      categoriesQuery.refetch();
      setShowCategoryDialog(false);
      resetCategoryForm();
    },
  });

  const deleteCategoryMutation = trpc.assets.deleteCategory.useMutation({
    onSuccess: () => {
      toast.success(t.financeModule.categoryDeletedSuccessfully || 'Category deleted');
      categoriesQuery.refetch();
    },
  });

  const resetCategoryForm = () => {
    setCategoryForm({
      code: '',
      name: '',
      description: '',
      assetClass: '',
      parentId: undefined,
      usefulLifeYears: 5,
      depreciationRate: '0.00',
      residualValuePercentage: '0.00',
      capitalizationThreshold: '500',
      defaultDepreciationMethod: 'straight_line',
      ownershipType: 'organization',
      trackSerialNumber: 1,
      requiresCustodian: 1,
      requiresLocation: 1,
      requiresInsurance: 0,
      isDonorReportable: 1,
      isActive: 1,
    });
    setEditingCategory(null);
  };

  const handleSaveCategory = () => {
    if (!categoryForm.code || !categoryForm.name) {
      toast.error(isRTL ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    const payload = {
      code: categoryForm.code,
      name: categoryForm.name,
      description: categoryForm.description || undefined,
      assetClass: (categoryForm.assetClass as any) || undefined,
      parentId: categoryForm.parentId || undefined,
      usefulLifeYears: categoryForm.usefulLifeYears,
      depreciationRate: categoryForm.depreciationRate,
      residualValuePercentage: categoryForm.residualValuePercentage,
      capitalizationThreshold: categoryForm.capitalizationThreshold,
      defaultDepreciationMethod: categoryForm.defaultDepreciationMethod as any,
      ownershipType: categoryForm.ownershipType as any,
      trackSerialNumber: categoryForm.trackSerialNumber,
      requiresCustodian: categoryForm.requiresCustodian,
      requiresLocation: categoryForm.requiresLocation,
      requiresInsurance: categoryForm.requiresInsurance,
      isDonorReportable: categoryForm.isDonorReportable,
      isActive: categoryForm.isActive,
    };

    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, ...payload });
    } else {
      createCategoryMutation.mutate(payload);
    }
  };

  const handleEditCategory = (category: any) => {
    setCategoryForm({
      code: category.code || '',
      name: category.name || '',
      description: category.description || '',
      assetClass: category.assetClass || '',
      parentId: category.parentId || undefined,
      usefulLifeYears: category.usefulLifeYears || 5,
      depreciationRate: category.depreciationRate || '0.00',
      residualValuePercentage: category.residualValuePercentage || '0.00',
      capitalizationThreshold: category.capitalizationThreshold || '500',
      defaultDepreciationMethod: category.defaultDepreciationMethod || 'straight_line',
      ownershipType: category.ownershipType || 'organization',
      trackSerialNumber: category.trackSerialNumber ?? 1,
      requiresCustodian: category.requiresCustodian ?? 1,
      requiresLocation: category.requiresLocation ?? 1,
      requiresInsurance: category.requiresInsurance ?? 0,
      isDonorReportable: category.isDonorReportable ?? 1,
      isActive: category.isActive ?? 1,
    });
    setEditingCategory(category);
    setShowCategoryDialog(true);
  };

  const importCategoriesMutation = trpc.assets.importCategories.useMutation({
    onSuccess: () => { categoriesQuery.refetch(); },
  });

  const categoriesTemplateColumns: TemplateColumn[] = [
    { key: 'code', header: 'Category Code', required: true, example: 'IT-EQUIP', description: 'Unique category code (no spaces)' },
    { key: 'name', header: 'Category Name', required: true, example: 'IT Equipment', description: 'Full name of the category' },
    { key: 'nameAr', header: 'Arabic Name', required: false, example: 'معدات تقنية المعلومات', description: 'Arabic translation of the category name' },
    { key: 'description', header: 'Description', required: false, example: 'Computers, laptops, and peripherals', description: 'Brief description of what this category includes' },
    { key: 'depreciationRate', header: 'Depreciation Rate (%)', required: false, example: 20, description: 'Annual depreciation rate as a percentage (e.g. 20 for 20%)' },
    { key: 'defaultUsefulLife', header: 'Useful Life (Years)', required: false, example: 5, description: 'Default useful life in years for assets in this category' },
  ];

  const handleImportCategories = async (rows: Record<string, any>[]): Promise<ImportResult> => {
    const categories = rows.map((r) => ({
      code: String(r.code || ''),
      name: String(r.name || ''),
      nameAr: r.nameAr ? String(r.nameAr) : undefined,
      description: r.description ? String(r.description) : undefined,
      depreciationRate: r['Depreciation Rate (%)'] ? String(r['Depreciation Rate (%)']) : (r.depreciationRate ? String(r.depreciationRate) : undefined),
      defaultUsefulLife: r['Useful Life (Years)'] ? Number(r['Useful Life (Years)']) : (r.defaultUsefulLife ? Number(r.defaultUsefulLife) : undefined),
    }));
    return await importCategoriesMutation.mutateAsync({ categories });
  };

  const exportCategoriesData = (categoriesQuery.data || []).map((c: any) => ({
    code: c.code,
    name: c.name,
    nameAr: c.nameAr,
    description: c.description,
    depreciationRate: c.depreciationRate,
    defaultUsefulLife: c.defaultUsefulLife,
  }));

  const handleDeleteCategory = (id: number) => {
    if (confirm(t.financeModule.confirmDelete || 'Are you sure?')) {
      deleteCategoryMutation.mutate({
        id,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          {/* Back arrow */}
          <div className="mb-4">
            <button
              onClick={() => navigate('/organization/finance/assets')}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isRTL ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
              <span>{isRTL ? 'العودة إلى إدارة الأصول' : 'Back to Assets'}</span>
            </button>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2 mb-2">
              <Tag className="h-8 w-8 text-primary" />
              {t.financeModule.categories || 'Categories'}
            </h1>
            <p className="text-muted-foreground">
              {isRTL
                ? 'تنظيم الأصول إلى فئات لتسهيل التتبع والإبلاغ'
                : 'Organize assets into categories for easier tracking and reporting.'}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-8">
        {/* Actions Bar */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowExportDialog(true)}>
              <Download className="h-4 w-4 me-2" />
              {t.financeModule.export || 'Export'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
              <Upload className="h-4 w-4 me-2" />
              {t.financeModule.import || 'Import'}
            </Button>
          </div>
          <Button onClick={() => { resetCategoryForm(); setEditingCategory(null); setShowCategoryDialog(true); }}>
            <Plus className="h-4 w-4 me-2" />
            {t.financeModule.newCategory}
          </Button>
        </div>

        {/* Categories Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isRTL ? 'الرمز' : 'Code'}</TableHead>
                <TableHead>{isRTL ? 'الاسم' : 'Name'}</TableHead>
                <TableHead>{isRTL ? 'فئة الأصل' : 'Asset Class'}</TableHead>
                <TableHead>{isRTL ? 'نوع الملكية' : 'Ownership'}</TableHead>
                <TableHead>{isRTL ? 'العمر (سنوات)' : 'Life (Yrs)'}</TableHead>
                <TableHead>{isRTL ? 'معدل الاستهلاك' : 'Depr. Rate'}</TableHead>
                <TableHead>{isRTL ? 'الحالة' : 'Status'}</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!categoriesQuery.data || categoriesQuery.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    {categoriesQuery.isLoading ? t.financeModule.loading : t.financeModule.noData}
                  </TableCell>
                </TableRow>
              ) : (
                categoriesQuery.data.map((category: any) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-mono text-xs">{category.code}</TableCell>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="capitalize">{category.assetClass?.replace('_', ' ') || '—'}</TableCell>
                    <TableCell className="capitalize">{category.ownershipType || '—'}</TableCell>
                    <TableCell>{category.usefulLifeYears ?? 5}</TableCell>
                    <TableCell>{category.depreciationRate ?? '0.00'}%</TableCell>
                    <TableCell>
                      <Badge variant={category.isActive ? 'default' : 'secondary'}>
                        {category.isActive ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'غير نشط' : 'Inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditCategory(category)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(category.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Import Dialog */}
      <AssetImportExportDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        mode="import"
        title={isRTL ? 'استيراد الفئات' : 'Import Categories'}
        templateColumns={categoriesTemplateColumns}
        exportFileName="asset_categories"
        onImport={handleImportCategories}
        isRTL={isRTL}
      />

      {/* Export Dialog */}
      <AssetImportExportDialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        mode="export"
        title={isRTL ? 'تصدير الفئات' : 'Export Categories'}
        templateColumns={categoriesTemplateColumns}
        exportData={exportCategoriesData}
        exportFileName="asset_categories"
        isRTL={isRTL}
      />

      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingCategory
                ? (isRTL ? 'تعديل الفئة' : 'Edit Category')
                : (isRTL ? 'فئة جديدة' : 'New Category')}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="grid grid-cols-2 gap-4 py-4" dir={isRTL ? 'rtl' : 'ltr'}>

              {/* Code */}
              <div className="space-y-2">
                <Label>{isRTL ? 'الرمز' : 'Code'} *</Label>
                <Input
                  value={categoryForm.code}
                  onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value })}
                  placeholder={isRTL ? 'مثال: IT-EQUIP' : 'e.g. IT-EQUIP'}
                />
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label>{isRTL ? 'الاسم' : 'Name'} *</Label>
                <Input
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder={isRTL ? 'اسم الفئة' : 'Category name'}
                />
              </div>

              {/* Description - full width */}
              <div className="space-y-2 col-span-2">
                <Label>{isRTL ? 'الوصف' : 'Description'}</Label>
                <Input
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder={isRTL ? 'وصف مختصر' : 'Brief description'}
                />
              </div>

              {/* Asset Class */}
              <div className="space-y-2">
                <Label>{isRTL ? 'فئة الأصل' : 'Asset Class'}</Label>
                <Select
                  value={categoryForm.assetClass || ''}
                  onValueChange={(v) => setCategoryForm({ ...categoryForm, assetClass: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isRTL ? 'اختر الفئة' : 'Select class'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="land">{isRTL ? 'أراضي' : 'Land'}</SelectItem>
                    <SelectItem value="building">{isRTL ? 'مبانٍ' : 'Building'}</SelectItem>
                    <SelectItem value="vehicle">{isRTL ? 'مركبات' : 'Vehicle'}</SelectItem>
                    <SelectItem value="equipment">{isRTL ? 'معدات' : 'Equipment'}</SelectItem>
                    <SelectItem value="furniture">{isRTL ? 'أثاث' : 'Furniture'}</SelectItem>
                    <SelectItem value="it_equipment">{isRTL ? 'معدات تقنية المعلومات' : 'IT Equipment'}</SelectItem>
                    <SelectItem value="medical_equipment">{isRTL ? 'معدات طبية' : 'Medical Equipment'}</SelectItem>
                    <SelectItem value="infrastructure">{isRTL ? 'بنية تحتية' : 'Infrastructure'}</SelectItem>
                    <SelectItem value="intangible">{isRTL ? 'غير ملموس' : 'Intangible'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Ownership Type */}
              <div className="space-y-2">
                <Label>{isRTL ? 'نوع الملكية' : 'Ownership Type'}</Label>
                <Select
                  value={categoryForm.ownershipType}
                  onValueChange={(v) => setCategoryForm({ ...categoryForm, ownershipType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="organization">{isRTL ? 'المنظمة' : 'Organization'}</SelectItem>
                    <SelectItem value="donor">{isRTL ? 'المانح' : 'Donor'}</SelectItem>
                    <SelectItem value="government">{isRTL ? 'الحكومة' : 'Government'}</SelectItem>
                    <SelectItem value="shared">{isRTL ? 'مشترك' : 'Shared'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Useful Life */}
              <div className="space-y-2">
                <Label>{isRTL ? 'العمر الافتراضي (سنوات)' : 'Useful Life (Years)'}</Label>
                <Input
                  type="number"
                  min={1}
                  value={categoryForm.usefulLifeYears}
                  onChange={(e) => setCategoryForm({ ...categoryForm, usefulLifeYears: parseInt(e.target.value) || 5 })}
                />
              </div>

              {/* Depreciation Rate */}
              <div className="space-y-2">
                <Label>{isRTL ? 'معدل الاستهلاك (%)' : 'Depreciation Rate (%)'}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={categoryForm.depreciationRate}
                  onChange={(e) => setCategoryForm({ ...categoryForm, depreciationRate: e.target.value })}
                />
              </div>

              {/* Depreciation Method */}
              <div className="space-y-2">
                <Label>{isRTL ? 'طريقة الاستهلاك' : 'Depreciation Method'}</Label>
                <Select
                  value={categoryForm.defaultDepreciationMethod}
                  onValueChange={(v) => setCategoryForm({ ...categoryForm, defaultDepreciationMethod: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="straight_line">{isRTL ? 'القسط الثابت' : 'Straight Line'}</SelectItem>
                    <SelectItem value="declining_balance">{isRTL ? 'القسط المتناقص' : 'Declining Balance'}</SelectItem>
                    <SelectItem value="units_of_production">{isRTL ? 'وحدات الإنتاج' : 'Units of Production'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Residual Value % */}
              <div className="space-y-2">
                <Label>{isRTL ? 'نسبة القيمة المتبقية (%)' : 'Residual Value (%)'}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={categoryForm.residualValuePercentage}
                  onChange={(e) => setCategoryForm({ ...categoryForm, residualValuePercentage: e.target.value })}
                />
              </div>

              {/* Capitalization Threshold */}
              <div className="space-y-2">
                <Label>{isRTL ? 'حد الرسملة' : 'Capitalization Threshold'}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={categoryForm.capitalizationThreshold}
                  onChange={(e) => setCategoryForm({ ...categoryForm, capitalizationThreshold: e.target.value })}
                />
              </div>

              {/* Checkboxes - full width */}
              <div className="col-span-2">
                <Separator className="my-2" />
                <p className="text-sm font-medium mb-3">{isRTL ? 'الإعدادات' : 'Settings'}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="trackSerial"
                      checked={categoryForm.trackSerialNumber === 1}
                      onCheckedChange={(v) => setCategoryForm({ ...categoryForm, trackSerialNumber: v ? 1 : 0 })}
                    />
                    <Label htmlFor="trackSerial" className="cursor-pointer">
                      {isRTL ? 'تتبع الرقم التسلسلي' : 'Track Serial Number'}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="requiresCustodian"
                      checked={categoryForm.requiresCustodian === 1}
                      onCheckedChange={(v) => setCategoryForm({ ...categoryForm, requiresCustodian: v ? 1 : 0 })}
                    />
                    <Label htmlFor="requiresCustodian" className="cursor-pointer">
                      {isRTL ? 'يتطلب حارساً' : 'Requires Custodian'}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="requiresLocation"
                      checked={categoryForm.requiresLocation === 1}
                      onCheckedChange={(v) => setCategoryForm({ ...categoryForm, requiresLocation: v ? 1 : 0 })}
                    />
                    <Label htmlFor="requiresLocation" className="cursor-pointer">
                      {isRTL ? 'يتطلب موقعاً' : 'Requires Location'}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="requiresInsurance"
                      checked={categoryForm.requiresInsurance === 1}
                      onCheckedChange={(v) => setCategoryForm({ ...categoryForm, requiresInsurance: v ? 1 : 0 })}
                    />
                    <Label htmlFor="requiresInsurance" className="cursor-pointer">
                      {isRTL ? 'يتطلب تأميناً' : 'Requires Insurance'}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="isDonorReportable"
                      checked={categoryForm.isDonorReportable === 1}
                      onCheckedChange={(v) => setCategoryForm({ ...categoryForm, isDonorReportable: v ? 1 : 0 })}
                    />
                    <Label htmlFor="isDonorReportable" className="cursor-pointer">
                      {isRTL ? 'قابل للإبلاغ للمانح' : 'Donor Reportable'}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="isActive"
                      checked={categoryForm.isActive === 1}
                      onCheckedChange={(v) => setCategoryForm({ ...categoryForm, isActive: v ? 1 : 0 })}
                    />
                    <Label htmlFor="isActive" className="cursor-pointer">
                      {isRTL ? 'نشط' : 'Active'}
                    </Label>
                  </div>
                </div>
              </div>

            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCategoryDialog(false); resetCategoryForm(); }}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleSaveCategory} disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}>
              {createCategoryMutation.isPending || updateCategoryMutation.isPending
                ? (isRTL ? 'جارٍ الحفظ...' : 'Saving...')
                : (isRTL ? 'حفظ' : 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
