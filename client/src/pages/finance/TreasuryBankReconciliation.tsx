/**
 * Treasury - Bank Reconciliation Section Page
 * Extracted from TreasuryCashManagement.tsx
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
  RefreshCw,
  Eye,
} from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';

export default function TreasuryBankReconciliation() {
  const { t } = useTranslation();
  const { language, isRTL } = useLanguage();
  const { currentOrganization, currentOperatingUnit } = useOrganization();
  const organizationId = currentOrganization?.id || 30001;
  const operatingUnitId = currentOperatingUnit?.id;
  const navigate = useNavigate();

  const [selectedBankAccountId, setSelectedBankAccountId] = useState<number | null>(null);
  const [showNewReconciliationDialog, setShowNewReconciliationDialog] = useState(false);
  const [showReconciliationDetailDialog, setShowReconciliationDetailDialog] = useState(false);
  const [selectedReconciliation, setSelectedReconciliation] = useState<any>(null);

  const [reconciliationForm, setReconciliationForm] = useState({
    reconciliationDate: new Date().toISOString().split('T')[0],
    periodStart: '',
    periodEnd: '',
    statementBalance: '',
    bookBalance: '',
    notes: '',
  });

  // Fetch data
  const bankAccountsQuery = trpc.treasury.listBankAccounts.useQuery({ organizationId, operatingUnitId });

  const reconciliationsQuery = trpc.bankReconciliations.list.useQuery({
    organizationId,
    operatingUnitId,
    bankAccountId: selectedBankAccountId || undefined,
    limit: 50,
  });

  const reconciliationSummaryQuery = trpc.bankReconciliations.getSummary.useQuery(
    { id: selectedReconciliation?.id || 0 },
    { enabled: !!selectedReconciliation?.id }
  );

  const createReconciliationMutation = trpc.bankReconciliations.create.useMutation({
    onSuccess: () => {
      toast.success(t.treasuryCashManagement.createSuccess);
      setShowNewReconciliationDialog(false);
      reconciliationsQuery.refetch();
      resetReconciliationForm();
    },
  });

  const startReconciliationMutation = trpc.bankReconciliations.startReconciliation.useMutation({
    onSuccess: () => {
      toast.success(t.treasuryCashManagement.startReconciliation);
      reconciliationsQuery.refetch();
      if (selectedReconciliation) {
        reconciliationSummaryQuery.refetch();
      }
    },
  });

  const completeReconciliationMutation = trpc.bankReconciliations.completeReconciliation.useMutation({
    onSuccess: () => {
      toast.success(t.treasuryCashManagement.completeReconciliation);
      reconciliationsQuery.refetch();
      setShowReconciliationDetailDialog(false);
    },
  });

  const resetReconciliationForm = () => {
    setReconciliationForm({
      reconciliationDate: new Date().toISOString().split('T')[0],
      periodStart: '',
      periodEnd: '',
      statementBalance: '',
      bookBalance: '',
      notes: '',
    });
  };

  const handleCreateReconciliation = () => {
    if (!selectedBankAccountId) {
      toast.error(t.treasuryCashManagement.selectBankAccount);
      return;
    }
    createReconciliationMutation.mutate({
      organizationId,
      operatingUnitId,
      bankAccountId: selectedBankAccountId!,
      reconciliationDate: reconciliationForm.reconciliationDate,
      periodStart: reconciliationForm.periodStart,
      periodEnd: reconciliationForm.periodEnd,
      statementBalance: reconciliationForm.statementBalance,
      bookBalance: reconciliationForm.bookBalance,
      notes: reconciliationForm.notes,
    });
  };

  const handleViewReconciliation = (recon: any) => {
    navigate(`/organization/finance/treasury/reconciliation/${recon.id}`);
  };

  const formatCurrency = (amount: number | null, currency: string = 'USD') => {
    if (!amount) return `${currency} 0.00`;
    return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: 'default' | 'secondary' | 'destructive' } = {
      DRAFT: 'secondary',
      IN_PROGRESS: 'default',
      COMPLETED: 'default',
      APPROVED: 'default',
    };
    return statusMap[status] || 'secondary';
  };

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          {/* Back arrow */}
          <div className="mb-4">
            <button
              onClick={() => navigate('/organization/finance/treasury')}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isRTL ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
              <span>{isRTL ? 'العودة إلى إدارة الخزينة' : 'Back to Treasury'}</span>
            </button>
          </div>

          {/* Title */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2 mb-2">
              <RefreshCw className="h-8 w-8 text-primary" />
              {t.treasuryCashManagement.bankReconciliation || 'Bank Reconciliation'}
            </h1>
            <p className="text-muted-foreground">
              {isRTL
                ? 'مطابقة كشوف الحساب البنكية مع السجلات الداخلية للدقة'
                : 'Match bank statements with internal records for accuracy.'}
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.treasuryCashManagement.totalReconciliations || 'Total Reconciliations'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reconciliationsQuery.data?.reconciliations?.length || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.treasuryCashManagement.pending || 'Pending'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {reconciliationsQuery.data?.reconciliations?.filter((r: any) => r.status === 'IN_PROGRESS').length || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.treasuryCashManagement.completed || 'Completed'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {reconciliationsQuery.data?.reconciliations?.filter((r: any) => r.status === 'COMPLETED').length || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.treasuryCashManagement.approved || 'Approved'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {reconciliationsQuery.data?.reconciliations?.filter((r: any) => r.status === 'APPROVED').length || 0}
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
          <div className="w-64">
            <Select
              value={selectedBankAccountId?.toString() || 'all'}
              onValueChange={(v) => setSelectedBankAccountId(v === 'all' ? null : parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t.treasuryCashManagement.bankAccounts} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.financeModule.allAccounts}</SelectItem>
                {(bankAccountsQuery.data || []).map((account: any) => (
                  <SelectItem key={account.id} value={account.id.toString()}>
                    {language === 'ar' && account.accountNameAr ? account.accountNameAr : account.accountName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => { resetReconciliationForm(); setShowNewReconciliationDialog(true); }}>
            <Plus className="h-4 w-4 me-2" />
            {t.treasuryCashManagement.newReconciliation}
          </Button>
        </div>

        {/* Reconciliations Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.treasuryCashManagement.reconciliationDate}</TableHead>
                <TableHead>{t.treasuryCashManagement.periodStart}</TableHead>
                <TableHead>{t.treasuryCashManagement.periodEnd}</TableHead>
                <TableHead>{t.treasuryCashManagement.statementBalance}</TableHead>
                <TableHead>{t.treasuryCashManagement.bookBalance}</TableHead>
                <TableHead>{t.treasuryCashManagement.status}</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!reconciliationsQuery.data?.reconciliations || reconciliationsQuery.data.reconciliations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {reconciliationsQuery.isLoading ? t.treasuryCashManagement.loading : t.treasuryCashManagement.noData}
                  </TableCell>
                </TableRow>
              ) : (
                reconciliationsQuery.data.reconciliations.map((recon: any) => (
                  <TableRow key={recon.id}>
                    <TableCell>{new Date(recon.reconciliationDate).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(recon.periodStart).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(recon.periodEnd).toLocaleDateString()}</TableCell>
                    <TableCell className="font-mono">{formatCurrency(recon.statementBalance)}</TableCell>
                    <TableCell className="font-mono">{formatCurrency(recon.bookBalance)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadge(recon.status)}>
                        {recon.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleViewReconciliation(recon)}>
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

      {/* New Reconciliation Dialog */}
      <Dialog open={showNewReconciliationDialog} onOpenChange={setShowNewReconciliationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.treasuryCashManagement.newReconciliation}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>{t.treasuryCashManagement.reconciliationDate} *</Label>
              <Input
                type="date"
                value={reconciliationForm.reconciliationDate}
                onChange={(e) => setReconciliationForm({ ...reconciliationForm, reconciliationDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.treasuryCashManagement.periodStart}</Label>
              <Input
                type="date"
                value={reconciliationForm.periodStart}
                onChange={(e) => setReconciliationForm({ ...reconciliationForm, periodStart: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.treasuryCashManagement.periodEnd}</Label>
              <Input
                type="date"
                value={reconciliationForm.periodEnd}
                onChange={(e) => setReconciliationForm({ ...reconciliationForm, periodEnd: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.treasuryCashManagement.statementBalance}</Label>
              <Input
                type="number"
                value={reconciliationForm.statementBalance}
                onChange={(e) => setReconciliationForm({ ...reconciliationForm, statementBalance: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.treasuryCashManagement.bookBalance}</Label>
              <Input
                type="number"
                value={reconciliationForm.bookBalance}
                onChange={(e) => setReconciliationForm({ ...reconciliationForm, bookBalance: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>{t.treasuryCashManagement.notes}</Label>
              <Input
                value={reconciliationForm.notes}
                onChange={(e) => setReconciliationForm({ ...reconciliationForm, notes: e.target.value })}
                placeholder={t.treasuryCashManagement.notes}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNewReconciliationDialog(false); resetReconciliationForm(); }}>
              {t.treasuryCashManagement.cancel}
            </Button>
            <Button onClick={handleCreateReconciliation} disabled={createReconciliationMutation.isPending}>
              {createReconciliationMutation.isPending ? t.treasuryCashManagement.saving : t.treasuryCashManagement.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
