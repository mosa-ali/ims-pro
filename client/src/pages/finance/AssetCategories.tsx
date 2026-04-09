/**
 * Assets - Categories Section Page
 */

import { useState } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const { language, isRTL } = useLanguage();
  const { currentOrganization, currentOperatingUnit } = useOrganization();
  const organizationId = currentOrganization?.id || 30001;
  const operatingUnitId = currentOperatingUnit?.id;
  const navigate = useNavigate();

  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    depreciationRate: 0,
  });

  // Fetch data
  const categoriesQuery = trpc.assets.listCategories.useQuery({ organizationId, operatingUnitId });

  const createCategoryMutation = trpc.assets.createCategory.useMutation({
    onSuccess: () => {
      toast.success(t.financeModule.categoryCreated || 'Category created');
      categoriesQuery.refetch();
      setShowCategoryDialog(false);
      resetCategoryForm();
    },
  });

  const updateCategoryMutation = trpc.assets.updateCategory.useMutation({
    onSuccess: () => {
      toast.success(t.financeModule.categoryUpdated || 'Category updated');
      categoriesQuery.refetch();
      setShowCategoryDialog(false);
      resetCategoryForm();
    },
  });

  const deleteCategoryMutation = trpc.assets.deleteCategory.useMutation({
    onSuccess: () => {
      toast.success(t.financeModule.categoryDeleted || 'Category deleted');
      categoriesQuery.refetch();
    },
  });

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      description: '',
      depreciationRate: 0,
    });
    setEditingCategory(null);
  };

  const handleSaveCategory = () => {
    if (!categoryForm.name) {
      toast.error(t.financeModule.fillRequiredFields || 'Please fill required fields');
      return;
    }

    if (editingCategory) {
      updateCategoryMutation.mutate({
        id: editingCategory.id,
        organizationId,
        operatingUnitId,
        ...categoryForm,
      });
    } else {
      createCategoryMutation.mutate({
        organizationId,
        operatingUnitId,
        ...categoryForm,
      });
    }
  };

  const handleEditCategory = (category: any) => {
    setCategoryForm(category);
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
    return await importCategoriesMutation.mutateAsync({ organizationId, operatingUnitId, categories });
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
        organizationId,
        operatingUnitId,
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
                <TableHead>{t.financeModule.name}</TableHead>
                <TableHead>{t.financeModule.description}</TableHead>
                <TableHead>{t.financeModule.depreciationRate}</TableHead>
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
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>{category.description}</TableCell>
                    <TableCell>{category.depreciationRate}%</TableCell>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? t.financeModule.editCategory : t.financeModule.newCategory}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-4">
            <div className="space-y-2">
              <Label>{t.financeModule.name} *</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder={t.financeModule.name}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.financeModule.description}</Label>
              <Input
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder={t.financeModule.description}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.financeModule.depreciationRate} (%)</Label>
              <Input
                type="number"
                value={categoryForm.depreciationRate}
                onChange={(e) => setCategoryForm({ ...categoryForm, depreciationRate: parseFloat(e.target.value) })}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCategoryDialog(false); resetCategoryForm(); }}>
              {t.financeModule.cancel}
            </Button>
            <Button onClick={handleSaveCategory} disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}>
              {createCategoryMutation.isPending || updateCategoryMutation.isPending ? t.financeModule.saving : t.financeModule.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
