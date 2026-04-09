/**
 * Assets - Transfers Section Page
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
  ArrowRightLeft,
  Download,
  Upload,
} from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import { AssetImportExportDialog, type ImportResult, type TemplateColumn } from '@/components/AssetImportExportDialog';

export default function AssetTransfers() {
  const { t } = useTranslation();
  const { language, isRTL } = useLanguage();
  const { currentOrganization, currentOperatingUnit } = useOrganization();
  const organizationId = currentOrganization?.id || 30001;
  const operatingUnitId = currentOperatingUnit?.id;
  const navigate = useNavigate();

  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const [transferForm, setTransferForm] = useState({
    assetId: 0,
    fromLocation: '',
    toLocation: '',
    transferDate: new Date().toISOString().split('T')[0],
    reason: '',
  });

  // Fetch data
  const transfersQuery = trpc.assets.listTransfers.useQuery({ organizationId, operatingUnitId });

  const assetsQuery = trpc.assets.listAssets.useQuery({ organizationId, operatingUnitId });

  const createTransferMutation = trpc.assets.createTransfer.useMutation({
    onSuccess: () => {
      toast.success(t.financeModule.transferCreated || 'Transfer created');
      transfersQuery.refetch();
      setShowTransferDialog(false);
      resetTransferForm();
    },
  });

  const resetTransferForm = () => {
    setTransferForm({
      assetId: 0,
      fromLocation: '',
      toLocation: '',
      transferDate: new Date().toISOString().split('T')[0],
      reason: '',
    });
  };

  const handleSaveTransfer = () => {
    if (!transferForm.assetId || !transferForm.toLocation) {
      toast.error(t.financeModule.fillRequiredFields || 'Please fill required fields');
      return;
    }

    createTransferMutation.mutate({
      organizationId,
      operatingUnitId,
      ...transferForm,
    });
  };

  const importTransfersMutation = trpc.assets.importTransfers.useMutation({
    onSuccess: () => { transfersQuery.refetch(); },
  });

  const transfersTemplateColumns: TemplateColumn[] = [
    { key: 'assetId', header: 'Asset ID', required: true, example: 1, description: 'Numeric ID of the asset to transfer (from Asset Registry)' },
    { key: 'fromLocation', header: 'From Location', required: false, example: "Sana'a Office", description: 'Current location of the asset' },
    { key: 'toLocation', header: 'To Location', required: false, example: 'Aden Field Office', description: 'Destination location for the asset' },
    { key: 'fromAssignee', header: 'From Assignee', required: false, example: 'Ahmed Ali', description: 'Current person responsible for the asset' },
    { key: 'toAssignee', header: 'To Assignee', required: false, example: 'Sara Hassan', description: 'New person responsible for the asset' },
    { key: 'transferDate', header: 'Transfer Date', required: false, example: '2024-03-15', description: 'Date of the transfer (YYYY-MM-DD)' },
    { key: 'reason', header: 'Reason', required: false, example: 'Project relocation', description: 'Reason for the transfer' },
  ];

  const handleImportTransfers = async (rows: Record<string, any>[]): Promise<ImportResult> => {
    const transfers = rows.map((r) => ({
      assetId: Number(r.assetId || r['Asset ID'] || 0),
      fromLocation: r.fromLocation ? String(r.fromLocation) : undefined,
      toLocation: r.toLocation ? String(r.toLocation) : undefined,
      fromAssignee: r.fromAssignee ? String(r.fromAssignee) : undefined,
      toAssignee: r.toAssignee ? String(r.toAssignee) : undefined,
      transferDate: r.transferDate ? String(r.transferDate) : undefined,
      reason: r.reason ? String(r.reason) : undefined,
    }));
    return await importTransfersMutation.mutateAsync({ organizationId, operatingUnitId, transfers });
  };

  const exportTransfersData = (transfersQuery.data || []).map((t: any) => ({
    assetId: t.assetId,
    fromLocation: t.fromLocation,
    toLocation: t.toLocation,
    fromAssignee: t.fromAssignee,
    toAssignee: t.toAssignee,
    transferDate: t.transferDate ? new Date(t.transferDate).toISOString().split('T')[0] : '',
    reason: t.reason,
  }));

  const filteredTransfers = (transfersQuery.data || []).filter((transfer: any) => {
    if (statusFilter === 'all') return true;
    return transfer.status === statusFilter;
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
              <ArrowRightLeft className="h-8 w-8 text-primary" />
              {t.financeModule.transfers || 'Transfers'}
            </h1>
            <p className="text-muted-foreground">
              {isRTL
                ? 'تسجيل وتتبع تحويلات الأصول بين الوحدات والمواقع'
                : 'Record and track asset transfers between units and locations.'}
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.financeModule.totalTransfers || 'Total Transfers'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{transfersQuery.data?.length || 0}</div>
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
                  {transfersQuery.data?.filter((t: any) => t.status === 'pending').length || 0}
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
                  {transfersQuery.data?.filter((t: any) => t.status === 'completed').length || 0}
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
            <Button onClick={() => { resetTransferForm(); setShowTransferDialog(true); }}>
              <Plus className="h-4 w-4 me-2" />
              {t.financeModule.newTransfer}
            </Button>
          </div>
        </div>

        {/* Transfers Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.financeModule.assetCode}</TableHead>
                <TableHead>{t.financeModule.assetName}</TableHead>
                <TableHead>{t.financeModule.fromLocation}</TableHead>
                <TableHead>{t.financeModule.toLocation}</TableHead>
                <TableHead>{t.financeModule.transferDate}</TableHead>
                <TableHead>{t.financeModule.status}</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransfers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {transfersQuery.isLoading ? t.financeModule.loading : t.financeModule.noData}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransfers.map((transfer: any) => (
                  <TableRow key={transfer.id}>
                    <TableCell className="font-mono">{transfer.assetCode}</TableCell>
                    <TableCell>{transfer.assetName}</TableCell>
                    <TableCell>{transfer.fromLocation}</TableCell>
                    <TableCell>{transfer.toLocation}</TableCell>
                    <TableCell>{new Date(transfer.transferDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={transfer.status === 'completed' ? 'default' : 'secondary'}>
                        {transfer.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
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
        title={isRTL ? 'استيراد التحويلات' : 'Import Transfers'}
        templateColumns={transfersTemplateColumns}
        exportFileName="asset_transfers"
        onImport={handleImportTransfers}
        isRTL={isRTL}
      />

      {/* Export Dialog */}
      <AssetImportExportDialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        mode="export"
        title={isRTL ? 'تصدير التحويلات' : 'Export Transfers'}
        templateColumns={transfersTemplateColumns}
        exportData={exportTransfersData}
        exportFileName="asset_transfers"
        isRTL={isRTL}
      />

      {/* Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.financeModule.newTransfer}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-4">
            <div className="space-y-2">
              <Label>{t.financeModule.asset} *</Label>
              <Select value={transferForm.assetId?.toString() || ''} onValueChange={(value) => setTransferForm({ ...transferForm, assetId: parseInt(value) })}>
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
              <Label>{t.financeModule.fromLocation}</Label>
              <Input
                value={transferForm.fromLocation}
                onChange={(e) => setTransferForm({ ...transferForm, fromLocation: e.target.value })}
                placeholder={t.financeModule.fromLocation}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.financeModule.toLocation} *</Label>
              <Input
                value={transferForm.toLocation}
                onChange={(e) => setTransferForm({ ...transferForm, toLocation: e.target.value })}
                placeholder={t.financeModule.toLocation}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.financeModule.transferDate}</Label>
              <Input
                type="date"
                value={transferForm.transferDate}
                onChange={(e) => setTransferForm({ ...transferForm, transferDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.financeModule.reason}</Label>
              <Input
                value={transferForm.reason}
                onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
                placeholder={t.financeModule.reason}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowTransferDialog(false); resetTransferForm(); }}>
              {t.financeModule.cancel}
            </Button>
            <Button onClick={handleSaveTransfer} disabled={createTransferMutation.isPending}>
              {createTransferMutation.isPending ? t.financeModule.saving : t.financeModule.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
