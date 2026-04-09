/**
 * Treasury - Fund Balances Section Page
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
  Pencil,
  Trash2,
  Download,
  Upload,
  Search,
  Wallet,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useTranslation } from '@/i18n/useTranslation';

const fundTypeOptions = [
  { value: 'RESTRICTED', labelEn: 'Restricted', labelAr: 'مقيد' },
  { value: 'UNRESTRICTED', labelEn: 'Unrestricted', labelAr: 'غير مقيد' },
  { value: 'TEMPORARILY_RESTRICTED', labelEn: 'Temporarily Restricted', labelAr: 'مقيد مؤقتاً' },
  { value: 'DONOR_DESIGNATED', labelEn: 'Donor Designated', labelAr: 'مخصص من المانح' },
];

export default function TreasuryFundBalances() {
  const { t } = useTranslation();
  const { language, isRTL } = useLanguage();
  const { currentOrganization, currentOperatingUnit } = useOrganization();
  const organizationId = currentOrganization?.id || 30001;
  const operatingUnitId = currentOperatingUnit?.id;
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [showFundDialog, setShowFundDialog] = useState(false);
  const [editingFund, setEditingFund] = useState<any>(null);
  const [showFundImportDialog, setShowFundImportDialog] = useState(false);

  const [fundForm, setFundForm] = useState({
    fundCode: '',
    fundName: '',
    fundType: 'UNRESTRICTED' as const,
    currency: 'USD',
    totalBudget: 0,
    currentBalance: 0,
    notes: '',
  });

  // Fetch data
  const fundBalancesQuery = trpc.treasury.listFundBalances.useQuery({ organizationId, operatingUnitId });

  const fundStatsQuery = trpc.treasury.getFundBalanceStatistics.useQuery({ organizationId, operatingUnitId });

  const createFundMutation = trpc.treasury.createFundBalance.useMutation({
    onSuccess: () => {
      toast.success(t.treasuryCashManagement.fundCreated || 'Fund created');
      fundBalancesQuery.refetch();
      setShowFundDialog(false);
      resetFundForm();
    },
  });

  const updateFundMutation = trpc.treasury.updateFundBalance.useMutation({
    onSuccess: () => {
      toast.success(t.treasuryCashManagement.fundUpdated || 'Fund updated');
      fundBalancesQuery.refetch();
      setShowFundDialog(false);
      resetFundForm();
    },
  });

  const deleteFundMutation = trpc.treasury.deleteFundBalance.useMutation({
    onSuccess: () => {
      toast.success(t.treasuryCashManagement.fundDeleted || 'Fund deleted');
      fundBalancesQuery.refetch();
    },
  });

  const resetFundForm = () => {
    setFundForm({
      fundCode: '',
      fundName: '',
      fundType: 'UNRESTRICTED',
      currency: 'USD',
      totalBudget: 0,
      currentBalance: 0,
      notes: '',
    });
    setEditingFund(null);
  };

  const handleSaveFund = () => {
    if (!fundForm.fundCode || !fundForm.fundName) {
      toast.error(t.treasuryCashManagement.fillRequiredFields || 'Please fill required fields');
      return;
    }

    if (editingFund) {
      updateFundMutation.mutate({
        id: editingFund.id,
        organizationId,
        operatingUnitId,
        ...fundForm,
      });
    } else {
      createFundMutation.mutate({
        organizationId,
        operatingUnitId,
        ...fundForm,
      });
    }
  };

  const handleEditFund = (fund: any) => {
    setFundForm(fund);
    setEditingFund(fund);
    setShowFundDialog(true);
  };

  const handleDeleteFund = (id: number) => {
    if (confirm(t.treasuryCashManagement.confirmDelete || 'Are you sure?')) {
      deleteFundMutation.mutate({
        id,
        organizationId,
        operatingUnitId,
      });
    }
  };

  const exportFunds = () => {
    if (!fundBalancesQuery.data || fundBalancesQuery.data.length === 0) {
      toast.error(t.treasuryCashManagement.noDataToExport || 'No data to export');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(fundBalancesQuery.data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fund Balances');
    XLSX.writeFile(wb, 'fund-balances.xlsx');
  };

  const filteredFunds = (fundBalancesQuery.data || []).filter((fund: any) =>
    fund.fundName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fund.fundCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getFundTypeLabel = (type: string) => {
    const option = fundTypeOptions.find((o) => o.value === type);
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
              <Wallet className="h-8 w-8 text-primary" />
              {t.treasuryCashManagement.fundBalances || 'Fund Balances'}
            </h1>
            <p className="text-muted-foreground">
              {isRTL
                ? 'تتبع أرصدة الصناديق والتخصيصات المالية عبر المشاريع'
                : 'Track fund balances and financial allocations across projects.'}
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.treasuryCashManagement.totalBalance}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(fundStatsQuery.data?.totalBalance || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.treasuryCashManagement.restrictedFunds}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(fundStatsQuery.data?.restrictedBalance || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.treasuryCashManagement.unrestrictedFunds}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(fundStatsQuery.data?.unrestrictedBalance || 0)}
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
            <Button variant="outline" size="sm" onClick={exportFunds}>
              <Download className="h-4 w-4 me-2" />
              {t.treasuryCashManagement.export}
            </Button>
            <Button onClick={() => { resetFundForm(); setEditingFund(null); setShowFundDialog(true); }}>
              <Plus className="h-4 w-4 me-2" />
              {t.treasuryCashManagement.newFund}
            </Button>
          </div>
        </div>

        {/* Fund Balances Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.treasuryCashManagement.fundCode}</TableHead>
                <TableHead>{t.treasuryCashManagement.fundName}</TableHead>
                <TableHead>{t.treasuryCashManagement.fundType}</TableHead>
                <TableHead>{t.treasuryCashManagement.totalBudget}</TableHead>
                <TableHead>{t.treasuryCashManagement.currentBalance}</TableHead>
                <TableHead>{t.treasuryCashManagement.status}</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFunds.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {fundBalancesQuery.isLoading ? t.treasuryCashManagement.loading : t.treasuryCashManagement.noData}
                  </TableCell>
                </TableRow>
              ) : (
                filteredFunds.map((fund: any) => (
                  <TableRow key={fund.id}>
                    <TableCell className="font-mono">{fund.fundCode}</TableCell>
                    <TableCell className="font-medium">
                      {language === 'ar' && fund.fundNameAr ? fund.fundNameAr : fund.fundName}
                    </TableCell>
                    <TableCell>
                      <Badge variant={fund.fundType === 'RESTRICTED' ? 'destructive' : 'default'}>
                        {getFundTypeLabel(fund.fundType)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">{formatCurrency(fund.totalBudget, fund.currency)}</TableCell>
                    <TableCell className="font-mono">{formatCurrency(fund.currentBalance, fund.currency)}</TableCell>
                    <TableCell>
                      <Badge variant={fund.isActive ? 'default' : 'secondary'}>
                        {fund.isActive ? t.treasuryCashManagement.active : t.treasuryCashManagement.inactive}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditFund(fund)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteFund(fund.id)}>
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

      {/* Fund Dialog */}
      <Dialog open={showFundDialog} onOpenChange={setShowFundDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingFund ? t.treasuryCashManagement.editFund : t.treasuryCashManagement.newFund}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>{t.treasuryCashManagement.fundCode} *</Label>
              <Input
                value={fundForm.fundCode}
                onChange={(e) => setFundForm({ ...fundForm, fundCode: e.target.value })}
                placeholder={t.treasuryCashManagement.fundCode}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.treasuryCashManagement.fundName} *</Label>
              <Input
                value={fundForm.fundName}
                onChange={(e) => setFundForm({ ...fundForm, fundName: e.target.value })}
                placeholder={t.treasuryCashManagement.fundName}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.treasuryCashManagement.fundType}</Label>
              <Select value={fundForm.fundType} onValueChange={(value: any) => setFundForm({ ...fundForm, fundType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fundTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {language === 'ar' ? option.labelAr : option.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.treasuryCashManagement.totalBudget}</Label>
              <Input
                type="number"
                value={fundForm.totalBudget}
                onChange={(e) => setFundForm({ ...fundForm, totalBudget: parseFloat(e.target.value) })}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowFundDialog(false); resetFundForm(); }}>
              {t.treasuryCashManagement.cancel}
            </Button>
            <Button onClick={handleSaveFund} disabled={createFundMutation.isPending || updateFundMutation.isPending}>
              {createFundMutation.isPending || updateFundMutation.isPending ? t.treasuryCashManagement.saving : t.treasuryCashManagement.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
