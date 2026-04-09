/**
 * Assets - Asset Registry Section Page
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Pencil,
  Trash2,
  Download,
  Upload,
  Search,
  Package,
} from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import { AssetImportExportDialog, type ImportResult, type TemplateColumn } from '@/components/AssetImportExportDialog';

export default function AssetRegistry() {
  const { t } = useTranslation();
  const { language, isRTL } = useLanguage();
  const { currentOrganization, currentOperatingUnit } = useOrganization();
  const organizationId = currentOrganization?.id || 30001;
  const operatingUnitId = currentOperatingUnit?.id;
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAssetDialog, setShowAssetDialog] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const [assetForm, setAssetForm] = useState({
    assetCode: '',
    name: '',
    category: '',
    acquisitionCost: 0,
    acquisitionDate: new Date().toISOString().split('T')[0],
    location: '',
    donor: '',
    status: 'active',
  });

  // Fetch data
  const assetsQuery = trpc.assets.listAssets.useQuery({ organizationId, operatingUnitId });

  const assetStatsQuery = trpc.assets.getAssetStatistics.useQuery({ organizationId, operatingUnitId });

  const createAssetMutation = trpc.assets.createAsset.useMutation({
    onSuccess: () => {
      toast.success(t.financeModule.assetCreated || 'Asset created');
      assetsQuery.refetch();
      setShowAssetDialog(false);
      resetAssetForm();
    },
  });

  const updateAssetMutation = trpc.assets.updateAsset.useMutation({
    onSuccess: () => {
      toast.success(t.financeModule.assetUpdated || 'Asset updated');
      assetsQuery.refetch();
      setShowAssetDialog(false);
      resetAssetForm();
    },
  });

  const deleteAssetMutation = trpc.assets.deleteAsset.useMutation({
    onSuccess: () => {
      toast.success(t.financeModule.assetDeleted || 'Asset deleted');
      assetsQuery.refetch();
    },
  });

  const resetAssetForm = () => {
    setAssetForm({
      assetCode: '',
      name: '',
      category: '',
      acquisitionCost: 0,
      acquisitionDate: new Date().toISOString().split('T')[0],
      location: '',
      donor: '',
      status: 'active',
    });
    setEditingAsset(null);
  };

  const handleSaveAsset = () => {
    if (!assetForm.assetCode || !assetForm.name) {
      toast.error(t.financeModule.fillRequiredFields || 'Please fill required fields');
      return;
    }

    if (editingAsset) {
      updateAssetMutation.mutate({
        id: editingAsset.id,
        organizationId,
        operatingUnitId,
        ...assetForm,
      });
    } else {
      createAssetMutation.mutate({
        organizationId,
        operatingUnitId,
        ...assetForm,
      });
    }
  };

  const handleEditAsset = (asset: any) => {
    setAssetForm(asset);
    setEditingAsset(asset);
    setShowAssetDialog(true);
  };

  const handleDeleteAsset = (id: number) => {
    if (confirm(t.financeModule.confirmDelete || 'Are you sure?')) {
      deleteAssetMutation.mutate({
        id,
        organizationId,
        operatingUnitId,
      });
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'USD 0.00';
    return `USD ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const importAssetsMutation = trpc.assets.importAssets.useMutation({
    onSuccess: () => { assetsQuery.refetch(); },
  });

  const registryTemplateColumns: TemplateColumn[] = [
    { key: 'assetCode', header: 'Asset Code', required: true, example: 'AST-2024-0001', description: 'Unique asset identifier code' },
    { key: 'name', header: 'Asset Name', required: true, example: 'Laptop Dell XPS 15', description: 'Full descriptive name of the asset' },
    { key: 'acquisitionCost', header: 'Acquisition Cost', required: false, example: 1500.00, description: 'Purchase cost in USD' },
    { key: 'acquisitionDate', header: 'Acquisition Date', required: false, example: '2024-01-15', description: 'Date of purchase (YYYY-MM-DD)' },
    { key: 'location', header: 'Location', required: false, example: 'Sana\'a Office', description: 'Physical location of the asset' },
    { key: 'donorName', header: 'Donor Name', required: false, example: 'USAID', description: 'Donor or funding source name' },
    { key: 'status', header: 'Status', required: false, example: 'active', description: 'active | in_maintenance | disposed | lost | transferred' },
  ];

  const handleImportAssets = async (rows: Record<string, any>[]): Promise<ImportResult> => {
    const assets = rows.map((r) => ({
      assetCode: String(r.assetCode || ''),
      name: String(r.name || ''),
      acquisitionCost: r.acquisitionCost ? String(r.acquisitionCost) : undefined,
      acquisitionDate: r.acquisitionDate ? String(r.acquisitionDate) : undefined,
      location: r.location ? String(r.location) : undefined,
      donorName: r.donorName ? String(r.donorName) : undefined,
      status: r.status as any,
    }));
    return await importAssetsMutation.mutateAsync({ organizationId, operatingUnitId, assets });
  };

  const exportData = (assetsQuery.data || []).map((a: any) => ({
    assetCode: a.assetCode,
    name: a.name,
    acquisitionCost: a.acquisitionCost,
    acquisitionDate: a.acquisitionDate ? new Date(a.acquisitionDate).toISOString().split('T')[0] : '',
    location: a.location,
    donorName: a.donorName,
    status: a.status,
  }));

  const filteredAssets = (assetsQuery.data || []).filter((asset: any) => {
    const matchesSearch = asset.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.assetCode?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2 mb-2">
              <Package className="h-8 w-8 text-primary" />
              {t.financeModule.assetRegistry || 'Asset Registry'}
            </h1>
            <p className="text-muted-foreground">
              {isRTL
                ? 'عرض وإدارة جميع الأصول الثابتة مع تفاصيل الاستهلاك'
                : 'View and manage all fixed assets with depreciation details.'}
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.financeModule.totalAssets || 'Total Assets'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{assetStatsQuery.data?.totalAssets || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.financeModule.activeAssets || 'Active Assets'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{assetStatsQuery.data?.activeAssets || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.financeModule.totalValue || 'Total Value'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(assetStatsQuery.data?.totalValue || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.financeModule.inMaintenance || 'In Maintenance'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{assetStatsQuery.data?.inMaintenance || 0}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-8">
        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex gap-2 flex-1 min-w-0">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.financeModule.searchAssets}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ps-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t.financeModule.status} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.financeModule.allStatuses}</SelectItem>
                <SelectItem value="active">{isRTL ? 'نشط' : 'Active'}</SelectItem>
                <SelectItem value="in_maintenance">{isRTL ? 'قيد الصيانة' : 'In Maintenance'}</SelectItem>
                <SelectItem value="disposed">{isRTL ? 'تم التخلص' : 'Disposed'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowExportDialog(true)}>
              <Download className="h-4 w-4 me-2" />
              {t.financeModule.export}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
              <Upload className="h-4 w-4 me-2" />
              {t.financeModule.import}
            </Button>
            <Button onClick={() => { resetAssetForm(); setEditingAsset(null); setShowAssetDialog(true); }}>
              <Plus className="h-4 w-4 me-2" />
              {t.financeModule.newAsset}
            </Button>
          </div>
        </div>

        {/* Assets Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.financeModule.assetCode}</TableHead>
                <TableHead>{t.financeModule.name}</TableHead>
                <TableHead>{t.financeModule.acquisitionCost}</TableHead>
                <TableHead>{t.financeModule.location}</TableHead>
                <TableHead>{t.financeModule.donor}</TableHead>
                <TableHead>{t.financeModule.status}</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {assetsQuery.isLoading ? t.financeModule.loading : t.financeModule.noAssetsFound}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssets.map((asset: any) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-mono">{asset.assetCode}</TableCell>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell className="font-mono">{formatCurrency(asset.acquisitionCost)}</TableCell>
                    <TableCell>{asset.location}</TableCell>
                    <TableCell>{asset.donor}</TableCell>
                    <TableCell>
                      <Badge variant={asset.status === 'active' ? 'default' : 'secondary'}>
                        {asset.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditAsset(asset)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteAsset(asset.id)}>
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
        title={isRTL ? 'استيراد الأصول' : 'Import Assets'}
        templateColumns={registryTemplateColumns}
        exportFileName="assets_registry"
        onImport={handleImportAssets}
        isRTL={isRTL}
      />

      {/* Export Dialog */}
      <AssetImportExportDialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        mode="export"
        title={isRTL ? 'تصدير الأصول' : 'Export Assets'}
        templateColumns={registryTemplateColumns}
        exportData={exportData}
        exportFileName="assets_registry"
        isRTL={isRTL}
      />

      {/* Asset Dialog */}
      <Dialog open={showAssetDialog} onOpenChange={setShowAssetDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingAsset ? t.financeModule.editAsset : t.financeModule.newAsset}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>{t.financeModule.assetCode} *</Label>
              <Input
                value={assetForm.assetCode}
                onChange={(e) => setAssetForm({ ...assetForm, assetCode: e.target.value })}
                placeholder={t.financeModule.assetCode}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.financeModule.name} *</Label>
              <Input
                value={assetForm.name}
                onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                placeholder={t.financeModule.name}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.financeModule.acquisitionCost}</Label>
              <Input
                type="number"
                value={assetForm.acquisitionCost}
                onChange={(e) => setAssetForm({ ...assetForm, acquisitionCost: parseFloat(e.target.value) })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.financeModule.acquisitionDate}</Label>
              <Input
                type="date"
                value={assetForm.acquisitionDate}
                onChange={(e) => setAssetForm({ ...assetForm, acquisitionDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.financeModule.location}</Label>
              <Input
                value={assetForm.location}
                onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })}
                placeholder={t.financeModule.location}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.financeModule.donor}</Label>
              <Input
                value={assetForm.donor}
                onChange={(e) => setAssetForm({ ...assetForm, donor: e.target.value })}
                placeholder={t.financeModule.donor}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAssetDialog(false); resetAssetForm(); }}>
              {t.financeModule.cancel}
            </Button>
            <Button onClick={handleSaveAsset} disabled={createAssetMutation.isPending || updateAssetMutation.isPending}>
              {createAssetMutation.isPending || updateAssetMutation.isPending ? t.financeModule.saving : t.financeModule.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
