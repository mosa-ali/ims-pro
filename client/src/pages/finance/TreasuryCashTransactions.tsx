/**
 * Treasury - Cash Transactions Section Page
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
  Trash2,
  ArrowUpDown,
} from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';

const transactionTypeOptions = [
  { value: 'DEPOSIT', labelEn: 'Deposit', labelAr: 'إيداع' },
  { value: 'WITHDRAWAL', labelEn: 'Withdrawal', labelAr: 'سحب' },
  { value: 'TRANSFER_IN', labelEn: 'Transfer In', labelAr: 'تحويل وارد' },
  { value: 'TRANSFER_OUT', labelEn: 'Transfer Out', labelAr: 'تحويل صادر' },
  { value: 'BANK_CHARGE', labelEn: 'Bank Charge', labelAr: 'رسوم بنكية' },
  { value: 'INTEREST', labelEn: 'Interest', labelAr: 'فائدة' },
  { value: 'ADJUSTMENT', labelEn: 'Adjustment', labelAr: 'تسوية' },
];

export default function TreasuryCashTransactions() {
  const { t } = useTranslation();
  const { language, isRTL } = useLanguage();
  const { currentOrganization, currentOperatingUnit } = useOrganization();
  const organizationId = currentOrganization?.id || 30001;
  const operatingUnitId = currentOperatingUnit?.id;
  const navigate = useNavigate();

  const [selectedBankAccountId, setSelectedBankAccountId] = useState<number | null>(null);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);

  const [transactionForm, setTransactionForm] = useState({
    bankAccountId: 0,
    transactionDate: new Date().toISOString().split('T')[0],
    transactionType: 'DEPOSIT' as const,
    amount: 0,
    description: '',
    referenceNumber: '',
    payee: '',
  });

  // Fetch data
  const bankAccountsQuery = trpc.treasury.listBankAccounts.useQuery({ organizationId, operatingUnitId });

  const transactionsQuery = trpc.treasury.listCashTransactions.useQuery({
    organizationId,
    operatingUnitId,
    bankAccountId: selectedBankAccountId || undefined,
  });

  // Derive stats from transactions data
  const cashStatsQuery = { data: {
    totalTransactions: transactionsQuery.data?.length || 0,
    totalDeposits: transactionsQuery.data?.filter((t: any) => t.transactionType === 'DEPOSIT').reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0) || 0,
    totalWithdrawals: transactionsQuery.data?.filter((t: any) => t.transactionType === 'WITHDRAWAL').reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0) || 0,
  } };

  const createTransactionMutation = trpc.treasury.createCashTransaction.useMutation({
    onSuccess: () => {
      toast.success(t.treasuryCashManagement.transactionCreated || 'Transaction created');
      transactionsQuery.refetch();
      setShowTransactionDialog(false);
      resetTransactionForm();
    },
  });

  const deleteTransactionMutation = trpc.treasury.deleteCashTransaction.useMutation({
    onSuccess: () => {
      toast.success(t.treasuryCashManagement.transactionDeleted || 'Transaction deleted');
      transactionsQuery.refetch();
    },
  });

  const resetTransactionForm = () => {
    setTransactionForm({
      bankAccountId: selectedBankAccountId || 0,
      transactionDate: new Date().toISOString().split('T')[0],
      transactionType: 'DEPOSIT',
      amount: 0,
      description: '',
      referenceNumber: '',
      payee: '',
    });
  };

  const handleSaveTransaction = () => {
    if (!selectedBankAccountId || !transactionForm.amount) {
      toast.error(t.treasuryCashManagement.fillRequiredFields || 'Please fill required fields');
      return;
    }

    createTransactionMutation.mutate({
      organizationId,
      operatingUnitId,
      bankAccountId: selectedBankAccountId!,
      ...transactionForm,
    });
  };

  const handleDeleteTransaction = (id: number) => {
    if (confirm(t.treasuryCashManagement.confirmDelete || 'Are you sure?')) {
      deleteTransactionMutation.mutate({
        id,
        organizationId,
        operatingUnitId,
      });
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    const option = transactionTypeOptions.find((o) => o.value === type);
    return language === 'ar' && option?.labelAr ? option.labelAr : option?.labelEn;
  };

  const formatCurrency = (amount: number | null, currency: string = 'USD') => {
    if (!amount) return `${currency} 0.00`;
    return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
              <ArrowUpDown className="h-8 w-8 text-primary" />
              {t.treasuryCashManagement.cashTransactions || 'Cash Transactions'}
            </h1>
            <p className="text-muted-foreground">
              {isRTL
                ? 'تسجيل ومراجعة جميع المعاملات النقدية الواردة والصادرة'
                : 'Record and review all incoming and outgoing cash transactions.'}
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.treasuryCashManagement.totalTransactions || 'Total Transactions'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{transactionsQuery.data?.length || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.treasuryCashManagement.deposits || 'Deposits'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{cashStatsQuery.data?.deposits || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.treasuryCashManagement.withdrawals || 'Withdrawals'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{cashStatsQuery.data?.withdrawals || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.treasuryCashManagement.pending || 'Pending'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{cashStatsQuery.data?.pending || 0}</div>
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
          <Button onClick={() => { resetTransactionForm(); setShowTransactionDialog(true); }}>
            <Plus className="h-4 w-4 me-2" />
            {t.treasuryCashManagement.newTransaction}
          </Button>
        </div>

        {/* Transactions Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">{t.treasuryCashManagement.transactionDate}</TableHead>
                <TableHead className="text-center">{t.treasuryCashManagement.transactionType}</TableHead>
                <TableHead>{t.treasuryCashManagement.amount}</TableHead>
                <TableHead>{t.treasuryCashManagement.description}</TableHead>
                <TableHead>{t.treasuryCashManagement.referenceNumber}</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!transactionsQuery.data || transactionsQuery.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {transactionsQuery.isLoading ? t.treasuryCashManagement.loading : t.treasuryCashManagement.noData}
                  </TableCell>
                </TableRow>
              ) : (
                transactionsQuery.data.map((txn: any) => (
                  <TableRow key={txn.id}>
                    <TableCell>{new Date(txn.transactionDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={['DEPOSIT', 'TRANSFER_IN', 'INTEREST'].includes(txn.transactionType) ? 'default' : 'secondary'}>
                        {getTransactionTypeLabel(txn.transactionType)}
                      </Badge>
                    </TableCell>
                    <TableCell className={`font-mono ${['DEPOSIT', 'TRANSFER_IN', 'INTEREST'].includes(txn.transactionType) ? 'text-green-600' : 'text-red-600'}`}>
                      {['DEPOSIT', 'TRANSFER_IN', 'INTEREST'].includes(txn.transactionType) ? '+' : '-'}
                      {formatCurrency(txn.amount, txn.currency)}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {language === 'ar' && txn.descriptionAr ? txn.descriptionAr : txn.description}
                    </TableCell>
                    <TableCell>{txn.referenceNumber}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteTransaction(txn.id)}>
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

      {/* Transaction Dialog */}
      <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.treasuryCashManagement.newTransaction}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>{t.treasuryCashManagement.transactionDate} *</Label>
              <Input
                type="date"
                value={transactionForm.transactionDate}
                onChange={(e) => setTransactionForm({ ...transactionForm, transactionDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.treasuryCashManagement.transactionType} *</Label>
              <Select value={transactionForm.transactionType} onValueChange={(value: any) => setTransactionForm({ ...transactionForm, transactionType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {transactionTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {language === 'ar' ? option.labelAr : option.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.treasuryCashManagement.amount} *</Label>
              <Input
                type="number"
                value={transactionForm.amount}
                onChange={(e) => setTransactionForm({ ...transactionForm, amount: parseFloat(e.target.value) })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.treasuryCashManagement.referenceNumber}</Label>
              <Input
                value={transactionForm.referenceNumber}
                onChange={(e) => setTransactionForm({ ...transactionForm, referenceNumber: e.target.value })}
                placeholder={t.treasuryCashManagement.referenceNumber}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>{t.treasuryCashManagement.description}</Label>
              <Input
                value={transactionForm.description}
                onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                placeholder={t.treasuryCashManagement.description}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowTransactionDialog(false); resetTransactionForm(); }}>
              {t.treasuryCashManagement.cancel}
            </Button>
            <Button onClick={handleSaveTransaction} disabled={createTransactionMutation.isPending}>
              {createTransactionMutation.isPending ? t.treasuryCashManagement.saving : t.treasuryCashManagement.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
