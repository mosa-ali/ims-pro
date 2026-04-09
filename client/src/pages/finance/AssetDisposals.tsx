/**
 * Assets - Disposals Section Page
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
  Eye,
  Trash2,
  Download,
  Upload,
} from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import { AssetImportExportDialog, type ImportResult, type TemplateColumn } from '@/components/AssetImportExportDialog';

const disposalTypeOptions = [
  { value: 'sale', labelEn: 'Sale', labelAr: 'بيع' },
  { value: 'donation', labelEn: 'Donation', labelAr: 'تبرع' },
  { value: 'scrap', labelEn: 'Scrap', labelAr: 'خردة' },
  { value: 'theft', labelEn: 'Theft', labelAr: 'سرقة' },
  { value: 'loss', labelEn: 'Loss', labelAr: 'فقدان' },
];

export default function AssetDisposals() {
  const { t } = useTranslation();
  const { language, isRTL } = useLanguage();
  const { currentOrganization, currentOperatingUnit } = useOrganization();
  const organizationId = currentOrganization?.id || 30001;
  const operatingUnitId = currentOperatingUnit?.id;
  const navigate = useNavigate();

  const [showDisposalDialog, setShowDisposalDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const [disposalForm, setDisposalForm] = useState({
    assetId: 0,
    disposalType: 'sale' as const,
    disposalDate: new Date().toISOString().split('T')[0],
    disposalValue: 0,
    reason: '',
    approvedBy: '',
  });

  // Fetch data
  const disposalsQuery = trpc.assets.listDisposals.useQuery({ organizationId, operatingUnitId });

  const assetsQuery = trpc.assets.listAssets.useQuery({ organizationId, operatingUnitId });

  const createDisposalMutation = trpc.assets.createDisposal.useMutation({
    onSuccess: () => {
      toast.success(t.financeModule.disposalCreated || 'Disposal created');
      disposalsQuery.refetch();
      setShowDisposalDialog(false);
      resetDisposalForm();
    },
  });

  const deleteDisposalMutation = trpc.assets.deleteDisposal.useMutation({
    onSuccess: () => {
      toast.success(t.financeModule.disposalDeleted || 'Disposal deleted');
      disposalsQuery.refetch();
    },
  });

  const resetDisposalForm = () => {
    setDisposalForm({
      assetId: 0,
      disposalType: 'sale',
      disposalDate: new Date().toISOString().split('T')[0],
      disposalValue: 0,
      reason: '',
      approvedBy: '',
    });
  };

  const handleSaveDisposal = () => {
    if (!disposalForm.assetId) {
      toast.error(t.financeModule.fillRequiredFields || 'Please fill required fields');
      return;
    }

    createDisposalMutation.mutate({
      organizationId,
      operatingUnitId,
      ...disposalForm,
    });
  };

  const handleDeleteDisposal = (id: number) => {
    if (confirm(t.financeModule.confirmDelete || 'Are you sure?')) {
      deleteDisposalMutation.mutate({
        id,
        organizationId,
        operatingUnitId,
      });
    }
  };

  const getDisposalTypeLabel = (type: string) => {
    const option = disposalTypeOptions.find((o) => o.value === type);
    return language === 'ar' && option?.labelAr ? option.labelAr : option?.labelEn;
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'USD 0.00';
    return `USD ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const importDisposalsMutation = trpc.assets.importDisposals.useMutation({
    onSuccess: () => { disposalsQuery.refetch(); },
  });

  const disposalsTemplateColumns: TemplateColumn[] = [
    { key: 'assetId', header: 'Asset ID', required: true, example: 1, description: 'Numeric ID of the asset to dispose (from Asset Registry)' },
    { key: 'disposalType', header: 'Disposal Type', required: false, example: 'sale', description: 'sale | donation | scrap | theft | loss | transfer_out | write_off' },
    { key: 'proposedDate', header: 'Proposed Date', required: false, example: '2024-06-30', description: 'Proposed disposal date (YYYY-MM-DD)' },
    { key: 'proposedValue', header: 'Proposed Value', required: false, example: 500.00, description: 'Expected proceeds from disposal (USD)' },
    { key: 'reason', header: 'Reason', required: false, example: 'End of useful life', description: 'Reason for disposal' },
    { key: 'buyerInfo', header: 'Buyer Info', required: false, example: 'ABC Company', description: 'Buyer details (for sale type)' },
    { key: 'notes', header: 'Notes', required: false, example: 'Approved by management', description: 'Additional notes' },
  ];

  const handleImportDisposals = async (rows: Record<string, any>[]): Promise<ImportResult> => {
    const disposals = rows.map((r) => ({
      assetId: Number(r.assetId || r['Asset ID'] || 0),
      disposalType: r.disposalType as any,
      proposedDate: r.proposedDate ? String(r.proposedDate) : undefined,
      proposedValue: r.proposedValue ? String(r.proposedValue) : undefined,
      reason: r.reason ? String(r.reason) : undefined,
      buyerInfo: r.buyerInfo ? String(r.buyerInfo) : undefined,
      notes: r.notes ? String(r.notes) : undefined,
    }));
    return await importDisposalsMutation.mutateAsync({ organizationId, operatingUnitId, disposals });
  };

  const exportDisposalsData = (disposalsQuery.data || []).map((d: any) => ({
    assetId: d.assetId,
    disposalType: d.disposalType,
    proposedDate: d.proposedDate ? new Date(d.proposedDate).toISOString().split('T')[0] : '',
    proposedValue: d.proposedValue,
    reason: d.reason,
    buyerInfo: d.buyerInfo,
    notes: d.notes,
  }));

  const filteredDisposals = (disposalsQuery.data || []).filter((disposal: any) => {
    if (statusFilter === 'all') return true;
    return disposal.status === statusFilter;
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
              <Trash2 className="h-8 w-8 text-primary" />
              {t.financeModule.disposals || 'Disposals'}
            </h1>
            <p className="text-muted-foreground">
              {isRTL
                ? 'إدارة عمليات التخلص من الأصول بما في ذلك البيع والتبرع'
                : 'Manage asset disposal processes including sales and donations.'}
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.financeModule.totalDisposals || 'Total Disposals'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{disposalsQuery.data?.length || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.financeModule.pending || 'Pending'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {disposalsQuery.data?.filter((d: any) => d.status === 'pending').length || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.financeModule.completed || 'Completed'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {disposalsQuery.data?.filter((d: any) => d.status === 'completed').length || 0}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-8">
        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t.financeModule.status} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.financeModule.allStatuses}</SelectItem>
              <SelectItem value="pending">{isRTL ? 'قيد الانتظار' : 'Pending'}</SelectItem>
              <SelectItem value="completed">{isRTL ? 'مكتمل' : 'Completed'}</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowExportDialog(true)}>
              <Download className="h-4 w-4 me-2" />
              {t.financeModule.export || 'Export'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
              <Upload className="h-4 w-4 me-2" />
              {t.financeModule.import || 'Import'}
            </Button>
            <Button onClick={() => { resetDisposalForm(); setShowDisposalDialog(true); }}>
              <Plus className="h-4 w-4 me-2" />
              {t.financeModule.newDisposal}
            </Button>
          </div>
        </div>

        {/* Disposals Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.financeModule.assetCode}</TableHead>
                <TableHead>{t.financeModule.assetName}</TableHead>
                <TableHead>{t.financeModule.disposalType}</TableHead>
                <TableHead>{t.financeModule.disposalDate}</TableHead>
                <TableHead>{t.financeModule.disposalValue}</TableHead>
                <TableHead>{t.financeModule.status}</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDisposals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {disposalsQuery.isLoading ? t.financeModule.loading : t.financeModule.noData}
                  </TableCell>
                </TableRow>
              ) : (
                filteredDisposals.map((disposal: any) => (
                  <TableRow key={disposal.id}>
                    <TableCell className="font-mono">{disposal.assetCode}</TableCell>
                    <TableCell>{disposal.assetName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getDisposalTypeLabel(disposal.disposalType)}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(disposal.disposalDate).toLocaleDateString()}</TableCell>
                    <TableCell className="font-mono">{formatCurrency(disposal.disposalValue)}</TableCell>
                    <TableCell>
                      <Badge variant={disposal.status === 'completed' ? 'default' : 'secondary'}>
                        {disposal.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteDisposal(disposal.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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
        title={isRTL ? 'استيراد عمليات التخلص' : 'Import Disposals'}
        templateColumns={disposalsTemplateColumns}
        exportFileName="asset_disposals"
        onImport={handleImportDisposals}
        isRTL={isRTL}
      />

      {/* Export Dialog */}
      <AssetImportExportDialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        mode="export"
        title={isRTL ? 'تصدير عمليات التخلص' : 'Export Disposals'}
        templateColumns={disposalsTemplateColumns}
        exportData={exportDisposalsData}
        exportFileName="asset_disposals"
        isRTL={isRTL}
      />

      {/* Disposal Dialog */}
      <Dialog open={showDisposalDialog} onOpenChange={setShowDisposalDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.financeModule.newDisposal}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-4">
            <div className="space-y-2">
              <Label>{t.financeModule.asset} *</Label>
              <Select value={disposalForm.assetId?.toString() || ''} onValueChange={(value) => setDisposalForm({ ...disposalForm, assetId: parseInt(value) })}>
                <SelectTrigger>
                  <SelectValue placeholder={t.financeModule.selectAsset} />
                </SelectTrigger>
                <SelectContent>
                  {(assetsQuery.data || []).map((asset: any) => (
                    <SelectItem key={asset.id} value={asset.id.toString()}>
                      {asset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.financeModule.disposalType}</Label>
              <Select value={disposalForm.disposalType} onValueChange={(value: any) => setDisposalForm({ ...disposalForm, disposalType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {disposalTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {language === 'ar' ? option.labelAr : option.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.financeModule.disposalDate}</Label>
              <Input
                type="date"
                value={disposalForm.disposalDate}
                onChange={(e) => setDisposalForm({ ...disposalForm, disposalDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.financeModule.disposalValue}</Label>
              <Input
                type="number"
                value={disposalForm.disposalValue}
                onChange={(e) => setDisposalForm({ ...disposalForm, disposalValue: parseFloat(e.target.value) })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.financeModule.reason}</Label>
              <Input
                value={disposalForm.reason}
                onChange={(e) => setDisposalForm({ ...disposalForm, reason: e.target.value })}
                placeholder={t.financeModule.reason}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDisposalDialog(false); resetDisposalForm(); }}>
              {t.financeModule.cancel}
            </Button>
            <Button onClick={handleSaveDisposal} disabled={createDisposalMutation.isPending}>
              {createDisposalMutation.isPending ? t.financeModule.saving : t.financeModule.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
