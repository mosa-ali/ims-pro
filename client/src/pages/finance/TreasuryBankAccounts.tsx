/**
 * Treasury - Bank Accounts Section Page
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
import { Textarea } from '@/components/ui/textarea';
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
import { Checkbox } from '@/components/ui/checkbox';
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
  Building2,
} from 'lucide-react';
import { Link } from 'wouter';
import * as XLSX from 'xlsx';
import { useTranslation } from '@/i18n/useTranslation';

const accountTypeOptions = [
  { value: 'CHECKING', labelEn: 'Checking', labelAr: 'جاري' },
  { value: 'SAVINGS', labelEn: 'Savings', labelAr: 'توفير' },
  { value: 'MONEY_MARKET', labelEn: 'Money Market', labelAr: 'سوق المال' },
  { value: 'PETTY_CASH', labelEn: 'Petty Cash', labelAr: 'صندوق نثرية' },
  { value: 'SAFE', labelEn: 'Safe', labelAr: 'خزنة' },
];

export default function TreasuryBankAccounts() {
  const { t } = useTranslation();
  const { language, isRTL } = useLanguage();
  const { currentOrganization, currentOperatingUnit } = useOrganization();
  const organizationId = currentOrganization?.id || 30001;
  const operatingUnitId = currentOperatingUnit?.id;
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [showBankAccountDialog, setShowBankAccountDialog] = useState(false);
  const [editingBankAccount, setEditingBankAccount] = useState<any>(null);
  const [showBankImportDialog, setShowBankImportDialog] = useState(false);
  const [bankImportAllowDuplicates, setBankImportAllowDuplicates] = useState(false);
  const [bankImportResults, setBankImportResults] = useState<any>(null);

  const [bankAccountForm, setBankAccountForm] = useState({
    accountName: '',
    accountNameAr: '',
    accountNumber: '',
    bankName: '',
    bankNameAr: '',
    branchName: '',
    branchCode: '',
    swiftCode: '',
    accountType: 'CHECKING' as const,
    currency: 'USD',
    openingBalance: 0,
    contactPerson: '',
    contactPhone: '',
    notes: '',
  });

  // Fetch data
  const bankAccountsQuery = trpc.treasury.listBankAccounts.useQuery({ organizationId, operatingUnitId });

  const bankStatsQuery = trpc.treasury.getBankAccountStatistics.useQuery({ organizationId, operatingUnitId });

  const createBankAccountMutation = trpc.treasury.createBankAccount.useMutation({
    onSuccess: () => {
      toast.success(t.treasuryCashManagement.bankAccountCreated || 'Bank account created');
      bankAccountsQuery.refetch();
      setShowBankAccountDialog(false);
      resetBankAccountForm();
    },
  });

  const updateBankAccountMutation = trpc.treasury.updateBankAccount.useMutation({
    onSuccess: () => {
      toast.success(t.treasuryCashManagement.bankAccountUpdated || 'Bank account updated');
      bankAccountsQuery.refetch();
      setShowBankAccountDialog(false);
      resetBankAccountForm();
    },
  });

  const deleteBankAccountMutation = trpc.treasury.deleteBankAccount.useMutation({
    onSuccess: () => {
      toast.success(t.treasuryCashManagement.bankAccountDeleted || 'Bank account deleted');
      bankAccountsQuery.refetch();
    },
  });

  const resetBankAccountForm = () => {
    setBankAccountForm({
      accountName: '',
      accountNameAr: '',
      accountNumber: '',
      bankName: '',
      bankNameAr: '',
      branchName: '',
      branchCode: '',
      swiftCode: '',
      accountType: 'CHECKING',
      currency: 'USD',
      openingBalance: 0,
      contactPerson: '',
      contactPhone: '',
      notes: '',
    });
    setEditingBankAccount(null);
  };

  const handleSaveBankAccount = () => {
    if (!bankAccountForm.accountName || !bankAccountForm.accountNumber) {
      toast.error(t.treasuryCashManagement.fillRequiredFields || 'Please fill required fields');
      return;
    }

    if (editingBankAccount) {
      updateBankAccountMutation.mutate({
        id: editingBankAccount.id,
        organizationId,
        operatingUnitId,
        ...bankAccountForm,
      });
    } else {
      createBankAccountMutation.mutate({
        organizationId,
        operatingUnitId,
        ...bankAccountForm,
      });
    }
  };

  const handleEditBankAccount = (account: any) => {
    setBankAccountForm(account);
    setEditingBankAccount(account);
    setShowBankAccountDialog(true);
  };

  const handleDeleteBankAccount = (id: number) => {
    if (confirm(t.treasuryCashManagement.confirmDelete || 'Are you sure?')) {
      deleteBankAccountMutation.mutate({
        id,
        organizationId,
        operatingUnitId,
      });
    }
  };

  const exportBankAccounts = () => {
    if (!bankAccountsQuery.data || bankAccountsQuery.data.length === 0) {
      toast.error(t.treasuryCashManagement.noDataToExport || 'No data to export');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(bankAccountsQuery.data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bank Accounts');
    XLSX.writeFile(wb, 'bank-accounts.xlsx');
  };

  const filteredBankAccounts = (bankAccountsQuery.data || []).filter((account: any) =>
    account.accountName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.accountNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAccountTypeLabel = (type: string) => {
    const option = accountTypeOptions.find((o) => o.value === type);
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
              <Building2 className="h-8 w-8 text-primary" />
              {t.treasuryCashManagement.bankAccounts || 'Bank Accounts'}
            </h1>
            <p className="text-muted-foreground">
              {isRTL
                ? 'إدارة الحسابات البنكية والأرصدة ومعلومات الاتصال'
                : 'Manage bank accounts, balances, and contact information.'}
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.treasuryCashManagement.totalAccounts}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{bankStatsQuery.data?.total || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.treasuryCashManagement.activeAccounts}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{bankStatsQuery.data?.active || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.treasuryCashManagement.totalBalance}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(bankStatsQuery.data?.totalBalance || 0)}
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
          <div className="relative w-64">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.treasuryCashManagement.search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportBankAccounts}>
              <Download className="h-4 w-4 me-2" />
              {t.treasuryCashManagement.export}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowBankImportDialog(true)}>
              <Upload className="h-4 w-4 me-2" />
              {t.treasuryCashManagement.import}
            </Button>
            <Button onClick={() => { resetBankAccountForm(); setEditingBankAccount(null); setShowBankAccountDialog(true); }}>
              <Plus className="h-4 w-4 me-2" />
              {t.treasuryCashManagement.newBankAccount}
            </Button>
          </div>
        </div>

        {/* Bank Accounts Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.treasuryCashManagement.accountName}</TableHead>
                <TableHead>{t.treasuryCashManagement.accountNumber}</TableHead>
                <TableHead>{t.treasuryCashManagement.bankName}</TableHead>
                <TableHead>{t.treasuryCashManagement.accountType}</TableHead>
                <TableHead>{t.treasuryCashManagement.currentBalance}</TableHead>
                <TableHead>{t.treasuryCashManagement.status}</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBankAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {bankAccountsQuery.isLoading ? t.treasuryCashManagement.loading : t.treasuryCashManagement.noData}
                  </TableCell>
                </TableRow>
              ) : (
                filteredBankAccounts.map((account: any) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">
                      {language === 'ar' && account.accountNameAr ? account.accountNameAr : account.accountName}
                    </TableCell>
                    <TableCell className="font-mono">{account.accountNumber}</TableCell>
                    <TableCell>
                      {language === 'ar' && account.bankNameAr ? account.bankNameAr : account.bankName}
                    </TableCell>
                    <TableCell>{getAccountTypeLabel(account.accountType)}</TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(account.currentBalance, account.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={account.isActive ? 'default' : 'secondary'}>
                        {account.isActive ? t.treasuryCashManagement.active : t.treasuryCashManagement.inactive}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditBankAccount(account)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteBankAccount(account.id)}>
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

      {/* Bank Account Dialog */}
      <Dialog open={showBankAccountDialog} onOpenChange={setShowBankAccountDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBankAccount ? t.treasuryCashManagement.editBankAccount : t.treasuryCashManagement.newBankAccount}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>{t.treasuryCashManagement.accountName} *</Label>
              <Input
                value={bankAccountForm.accountName}
                onChange={(e) => setBankAccountForm({ ...bankAccountForm, accountName: e.target.value })}
                placeholder={t.treasuryCashManagement.accountName}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.treasuryCashManagement.accountNameAr}</Label>
              <Input
                value={bankAccountForm.accountNameAr}
                onChange={(e) => setBankAccountForm({ ...bankAccountForm, accountNameAr: e.target.value })}
                placeholder={t.treasuryCashManagement.accountNameAr}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.treasuryCashManagement.accountNumber} *</Label>
              <Input
                value={bankAccountForm.accountNumber}
                onChange={(e) => setBankAccountForm({ ...bankAccountForm, accountNumber: e.target.value })}
                placeholder={t.treasuryCashManagement.accountNumber}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.treasuryCashManagement.bankName}</Label>
              <Input
                value={bankAccountForm.bankName}
                onChange={(e) => setBankAccountForm({ ...bankAccountForm, bankName: e.target.value })}
                placeholder={t.treasuryCashManagement.bankName}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.treasuryCashManagement.accountType}</Label>
              <Select value={bankAccountForm.accountType} onValueChange={(value: any) => setBankAccountForm({ ...bankAccountForm, accountType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accountTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {language === 'ar' ? option.labelAr : option.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.treasuryCashManagement.currency}</Label>
              <Input
                value={bankAccountForm.currency}
                onChange={(e) => setBankAccountForm({ ...bankAccountForm, currency: e.target.value })}
                placeholder="USD"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowBankAccountDialog(false); resetBankAccountForm(); }}>
              {t.treasuryCashManagement.cancel}
            </Button>
            <Button onClick={handleSaveBankAccount} disabled={createBankAccountMutation.isPending || updateBankAccountMutation.isPending}>
              {createBankAccountMutation.isPending || updateBankAccountMutation.isPending ? t.treasuryCashManagement.saving : t.treasuryCashManagement.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
