import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/_core/hooks/useAuth";
import { formatCurrency } from "@/lib/formatters";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Download, FileText, DollarSign, TrendingUp, AlertCircle, CheckCircle, Clock, XCircle, Upload, ArrowLeft, FileDown } from "lucide-react";
import { useLocation } from "wouter";
import * as XLSX from 'xlsx';

export default function Finance() {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");

  if (!isAuthenticated || !user?.organizationId) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('finance.accessDeniedTitle')}</CardTitle>
            <CardDescription>{t('finance.accessDeniedOrgDesc')}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const hasFinanceAccess = user.role === "admin";
  
  if (!hasFinanceAccess) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('finance.accessDeniedTitle')}</CardTitle>
            <CardDescription>{t('finance.accessDeniedAdminDesc')}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/projects')}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t('finance.title')}</h1>
          </div>
        </div>
        <p className="text-muted-foreground">
          {t('finance.description')}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">{t('finance.overview')}</TabsTrigger>
          <TabsTrigger value="accounts">{t('finance.chartOfAccounts')}</TabsTrigger>
          <TabsTrigger value="budgets">{t('finance.budgets')}</TabsTrigger>
          <TabsTrigger value="expenditures">{t('finance.expenditures')}</TabsTrigger>
          <TabsTrigger value="reports">{t('finance.reports')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <FinanceOverview />
        </TabsContent>

        <TabsContent value="accounts">
          <ChartOfAccountsTab />
        </TabsContent>

        <TabsContent value="budgets">
          <BudgetsTab />
        </TabsContent>

        <TabsContent value="expenditures">
          <ExpendituresTab />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Finance Overview Component
function FinanceOverview() {
  const { t, i18n } = useTranslation();
  const { data: budgets } = trpc.finance.listBudgets.useQuery();
  const { data: expenditures } = trpc.finance.listExpenditures.useQuery();

  const totalBudget = budgets?.reduce((sum, b) => sum + parseFloat(b.budgetedAmount || "0"), 0) || 0;
  const totalSpent = expenditures?.filter(e => e.status === t('finance.approved') || e.status === t('finance.paid'))
    .reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0) || 0;
  const variance = totalBudget - totalSpent;
  const utilizationRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('finance.totalBudget')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBudget, 'USD')}</div>
            <p className="text-xs text-muted-foreground">{t('finance.acrossAllProjects')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('finance.totalSpent')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpent, 'USD')}</div>
            <p className="text-xs text-muted-foreground">{utilizationRate.toFixed(1)}% {t('finance.utilized')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('finance.variance')}</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${variance >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(Math.abs(variance), 'USD')}
            </div>
            <p className="text-xs text-muted-foreground">{variance >= 0 ? t('finance.underBudget') : t('finance.overBudget')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('finance.pendingApprovals')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {expenditures?.filter(e => e.status === t('finance.submitted')).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">{t('finance.expendituresAwaitingReview')}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('finance.budgetUtilization')}</CardTitle>
          <CardDescription>{t('finance.overallSpending')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{t('finance.utilizationRate')}</span>
              <span className="font-medium">{utilizationRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  utilizationRate > 90 ? "bg-red-500" : utilizationRate > 75 ? "bg-yellow-500" : "bg-green-500"
                }`}
                style={{ width: `${Math.min(utilizationRate, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Chart of Accounts Tab (already implemented in previous checkpoint)
function ChartOfAccountsTab() {
  const { t, i18n } = useTranslation();
  
  // Helper function to translate account type
  const translateAccountType = (type: string) => {
    const typeMap: Record<string, string> = {
      'ASSET': t('finance.accountTypeAsset'),
      'LIABILITY': t('finance.accountTypeLiability'),
      'EQUITY': t('finance.accountTypeEquity'),
      'INCOME': t('finance.accountTypeIncome'),
      'EXPENSE': t('finance.accountTypeExpense'),
    };
    return typeMap[type] || type;
  };
  
  // Helper function to get account name in current language
  const getAccountName = (account: any) => {
    return i18n.language === 'ar' && account.accountNameAr 
      ? account.accountNameAr 
      : account.accountName;
  };
  const { data: accounts, refetch } = trpc.chartOfAccounts.list.useQuery();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);

  const createMutation = trpc.chartOfAccounts.create.useMutation({
    onSuccess: () => {
      toast.success(t('finance.accountCreated'));
      refetch();
      setIsCreateOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to create account: ${error.message}`);
    },
  });

  const updateMutation = trpc.chartOfAccounts.update.useMutation({
    onSuccess: () => {
      toast.success(t('finance.accountUpdated'));
      refetch();
      setEditingAccount(null);
    },
    onError: (error) => {
      toast.error(`Failed to update account: ${error.message}`);
    },
  });

  const deleteMutation = trpc.chartOfAccounts.delete.useMutation({
    onSuccess: () => {
      toast.success(t('finance.accountDeleted'));
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete account: ${error.message}`);
    },
  });

  // Export to Excel: exports data if exists, otherwise template
  const handleExportToExcel = () => {
    // Bilingual headers
    const headers = i18n.language === 'ar'
      ? ['رمز الحساب', 'اسم الحساب (إنجليزي)', 'اسم الحساب (عربي)', 'نوع الحساب', 'رمز الحساب الرئيسي', 'الوصف']
      : ['Account Code', 'Account Name (English)', 'Account Name (Arabic)', 'Account Type', 'Parent Account Code', 'Description'];
    
    let data;
    let filename;
    
    if (accounts && accounts.length > 0) {
      // Export actual account data
      data = accounts.map((account: any) => {
        const parentAccount = accounts.find((a: any) => a.id === account.parentAccountId);
        return [
          account.accountCode,
          account.accountName,
          account.accountNameAr || '',
          account.accountType,
          parentAccount?.accountCode || '',
          account.description || ''
        ];
      });
      filename = `chart_of_accounts_${new Date().toISOString().split('T')[0]}.xlsx`;
      toast.success(t('finance.exportedSuccessfully'));
    } else {
      // Export template with example data
      const exampleRow = i18n.language === 'ar'
        ? ['1000', 'Assets', 'الأصول', 'ASSET', '', 'وصف الحساب هنا']
        : ['1000', 'Assets', 'الأصول', 'ASSET', '', 'Account description here'];
      data = [exampleRow];
      filename = 'chart_of_accounts_template.xlsx';
      toast.success(t('finance.templateDownloaded'));
    }
    
    const sheetData = [headers, ...data];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Chart of Accounts');
    XLSX.writeFile(wb, filename);
  };

  // Import from Excel
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Skip header row
        const rows = jsonData.slice(1) as any[];
        
        if (rows.length === 0) {
          toast.error(t('finance.noDataInFile'));
          return;
        }

        // Validate and import each row
        let successCount = 0;
        let errorCount = 0;

        rows.forEach((row: any[]) => {
          if (!row[0] || !row[1] || !row[3]) {
            errorCount++;
            return;
          }

          const accountData = {
            accountCode: row[0].toString(),
            accountName: row[1],
            accountNameAr: row[2] || '',
            accountType: row[3],
            parentAccountId: row[4] ? 
              accounts?.find((a: any) => a.accountCode === row[4])?.id : undefined,
            description: row[5] || ''
          };

          // Check if account exists
          const existingAccount = accounts?.find((a: any) => a.accountCode === accountData.accountCode);
          
          if (existingAccount) {
            updateMutation.mutate({ id: existingAccount.id, ...accountData });
          } else {
            createMutation.mutate(accountData);
          }
          successCount++;
        });

        toast.success(`${t('finance.importedSuccessfully')}: ${successCount} ${t('finance.records')}`);
        if (errorCount > 0) {
          toast.warning(`${t('finance.skippedInvalidRows')}: ${errorCount}`);
        }
      } catch (error) {
        toast.error(t('finance.importFailed'));
        console.error('Import error:', error);
      }
    };
    
    reader.readAsArrayBuffer(file);
    e.target.value = ''; // Reset input
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('finance.chartOfAccounts')}</CardTitle>
            <CardDescription>{t('finance.chartOfAccountsDesc')}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportToExcel}>
              <Download className="mr-2 h-4 w-4" />
              {t('finance.exportToExcel')}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <label className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                {t('finance.importExcel')}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleImportExcel}
                />
              </label>
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('finance.newAccount')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <AccountForm
                  onSubmit={(data: any) => createMutation.mutate(data)}
                  accounts={accounts || []}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!accounts || accounts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t('finance.noAccountsYet')}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('finance.code')}</TableHead>
                <TableHead>{t('finance.name')}</TableHead>
                <TableHead>{t('finance.type')}</TableHead>
                <TableHead>{t('finance.parent')}</TableHead>
                <TableHead className="text-right">{t('finance.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-mono">{account.accountCode}</TableCell>
                  <TableCell>{getAccountName(account)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{translateAccountType(account.accountType)}</Badge>
                  </TableCell>
                  <TableCell>
                    {account.parentAccountId
                      ? getAccountName(accounts.find(a => a.id === account.parentAccountId))
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Dialog open={editingAccount?.id === account.id} onOpenChange={(open) => !open && setEditingAccount(null)}>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingAccount(account)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <AccountForm
                            initialData={account}
                            onSubmit={(data: any) => updateMutation.mutate({ id: account.id, ...data })}
                            accounts={accounts}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(t('finance.confirmDeleteAccount'))) {
                            deleteMutation.mutate({ id: account.id });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// Account Form Component
function AccountForm({ initialData, onSubmit, accounts }: any) {
  const { t, i18n } = useTranslation();
  
  // Helper function to get account name in current language
  const getAccountName = (account: any) => {
    return i18n.language === 'ar' && account.accountNameAr 
      ? account.accountNameAr 
      : account.accountName;
  };
  const [formData, setFormData] = useState({
    accountCode: initialData?.accountCode || "",
    accountName: initialData?.accountName || "",
    accountNameAr: initialData?.accountNameAr || "",
    accountType: initialData?.accountType || "EXPENSE",
    parentAccountId: initialData?.parentAccountId || undefined,
    description: initialData?.description || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{initialData ? t('finance.updateAccount') : t('finance.createAccount')}</DialogTitle>
        <DialogDescription>
          {initialData ? t('finance.accountDescriptionPlaceholder') : t('finance.chartOfAccountsDesc')}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <Label htmlFor="accountCode">Account Code *</Label>
          <Input
            id="accountCode"
            value={formData.accountCode}
            onChange={(e) => setFormData({ ...formData, accountCode: e.target.value })}
            placeholder="e.g., 1000, 5100"
            required
          />
        </div>

        <div>
          <Label htmlFor="accountName">Account Name (English) *</Label>
          <Input
            id="accountName"
            value={formData.accountName}
            onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
            placeholder="e.g., Cash, Salaries Expense"
            required
          />
        </div>

        <div>
          <Label htmlFor="accountNameAr">Account Name (Arabic)</Label>
          <Input
            id="accountNameAr"
            value={formData.accountNameAr}
            onChange={(e) => setFormData({ ...formData, accountNameAr: e.target.value })}
            placeholder="اسم الحساب بالعربية"
            dir="rtl"
          />
        </div>

        <div>
          <Label htmlFor="accountType">Account Type *</Label>
          <Select
            value={formData.accountType}
            onValueChange={(value) => setFormData({ ...formData, accountType: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ASSET">ASSET</SelectItem>
              <SelectItem value="LIABILITY">LIABILITY</SelectItem>
              <SelectItem value="EQUITY">EQUITY</SelectItem>
              <SelectItem value="INCOME">INCOME</SelectItem>
              <SelectItem value="EXPENSE">EXPENSE</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="parentAccountId">Parent Account</Label>
          <Select
            value={formData.parentAccountId?.toString() || "none"}
            onValueChange={(value) =>
              setFormData({ ...formData, parentAccountId: value === "none" ? undefined : parseInt(value) })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={t('finance.noneTopLevel')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (Top-level account)</SelectItem>
              {accounts
                ?.filter((a: any) => a.id !== initialData?.id)
                .map((account: any) => (
                  <SelectItem key={account.id} value={account.id.toString()}>
                    {account.accountCode} - {getAccountName(account)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder={t('finance.accountDescriptionPlaceholder')}
            rows={3}
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="submit">
          {initialData ? t('finance.updateAccount') : t('finance.createAccount')}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Budgets Tab Component
function BudgetsTab() {
  const { t, i18n } = useTranslation();
  
  // Helper function to get account name in current language
  const getAccountName = (account: any) => {
    if (!account) return "N/A";
    return i18n.language === 'ar' && account.accountNameAr 
      ? account.accountNameAr 
      : account.accountName;
  };
  const { data: budgets, refetch } = trpc.finance.listBudgets.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();
  const { data: accounts } = trpc.chartOfAccounts.list.useQuery();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const createMutation = trpc.finance.createBudget.useMutation({
    onSuccess: () => {
      toast.success(t('finance.budgetCreated'));
      refetch();
      setIsCreateOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to create budget: ${error.message}`);
    },
  });

  const updateMutation = trpc.finance.updateBudget.useMutation({
    onSuccess: () => {
      toast.success(t('finance.budgetStatusUpdated'));
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update budget: ${error.message}`);
    },
  });

  const deleteMutation = trpc.finance.deleteBudget.useMutation({
    onSuccess: () => {
      toast.success(t('finance.budgetDeleted'));
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete budget: ${error.message}`);
    },
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; icon: any }> = {
      draft: { variant: "secondary", icon: Clock },
      approved: { variant: "default", icon: CheckCircle },
      revised: { variant: "outline", icon: Edit },
      closed: { variant: "destructive", icon: XCircle },
    };
    const { variant, icon: Icon } = config[status] || config.draft;
    return (
      <Badge variant={variant}>
        <Icon className="mr-1 h-3 w-3" />
        {status}
      </Badge>
    );
  };

  // Export to Excel: exports data if exists, otherwise template
  const handleExportToExcel = () => {
    let data;
    let filename;
    let headers;
    
    if (budgets && budgets.length > 0) {
      // Export actual budget data
      headers = i18n.language === 'ar'
        ? ['رقم الميزانية', 'المشروع', 'الفئة', 'الحساب', 'المبلغ المدرج', 'المبلغ المتوقع', 'العملة', 'الفترة', 'الحالة', 'ملاحظات']
        : ['Budget ID', 'Project', 'Category', 'Account', 'Budgeted Amount', 'Forecast Amount', 'Currency', 'Period', 'Status', 'Notes'];
      
      data = budgets.map((budget: any) => {
        const project = projects?.find((p: any) => p.id === budget.projectId);
        const account = accounts?.find((a: any) => a.id === budget.accountId);
        return [
          budget.id,
          project?.titleEn || project?.titleAr || 'N/A',
          budget.categoryId || 'N/A',
          getAccountName(account),
          budget.budgetedAmount,
          budget.forecastAmount || '',
          budget.currency || 'USD',
          budget.period || '',
          budget.status || 'draft',
          budget.notes || ''
        ];
      });
      filename = `budgets_${new Date().toISOString().split('T')[0]}.xlsx`;
      toast.success(t('finance.exportedSuccessfully'));
    } else {
      // Export template with example data
      headers = i18n.language === 'ar'
        ? ['رقم المشروع', 'رقم الفئة', 'رقم الحساب', 'المبلغ المدرج', 'المبلغ المتوقع', 'العملة', 'الفترة', 'ملاحظات']
        : ['Project ID', 'Category ID', 'Account ID', 'Budgeted Amount', 'Forecast Amount', 'Currency', 'Period', 'Notes'];
      
      const exampleRow = i18n.language === 'ar'
        ? ['1', '1', '1110', '10000', '9500', 'USD', 'الربع الأول 2024', 'ملاحظات اختيارية']
        : ['1', '1', '1110', '10000', '9500', 'USD', 'Q1 2024', 'Optional notes'];
      data = [exampleRow];
      filename = 'budgets_template.xlsx';
      toast.success(t('finance.templateDownloaded'));
    }
    
    const sheetData = [headers, ...data];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Budgets');
    XLSX.writeFile(wb, filename);
  };

  // Import from Excel
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        const rows = jsonData.slice(1) as any[];
        
        if (rows.length === 0) {
          toast.error(t('finance.noDataInFile'));
          return;
        }

        let successCount = 0;
        let errorCount = 0;

        rows.forEach((row: any[]) => {
          if (!row[0] || !row[1] || !row[2]) {
            errorCount++;
            return;
          }

          const budgetData = {
            projectId: parseInt(row[0]),
            categoryId: parseInt(row[1]),
            accountId: row[2] ? parseInt(row[2]) : undefined,
            budgetedAmount: row[3].toString(),
            forecastAmount: row[4] ? row[4].toString() : undefined,
            currency: row[5] || 'USD',
            period: row[6] || '',
            notes: row[7] || ''
          };

          createMutation.mutate(budgetData);
          successCount++;
        });

        toast.success(`${t('finance.importedSuccessfully')}: ${successCount} ${t('finance.records')}`);
        if (errorCount > 0) {
          toast.warning(`${t('finance.skippedInvalidRows')}: ${errorCount}`);
        }
      } catch (error) {
        toast.error(t('finance.importFailed'));
        console.error('Import error:', error);
      }
    };
    
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('finance.budgetManagement')}</CardTitle>
            <CardDescription>{t('finance.budgetManagementDesc')}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportToExcel}>
              <Download className="mr-2 h-4 w-4" />
              {t('finance.exportToExcel')}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <label className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                {t('finance.importExcel')}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleImportExcel}
                />
              </label>
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('finance.newBudget')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <BudgetForm
                  onSubmit={(data: any) => createMutation.mutate(data)}
                  projects={projects || []}
                  accounts={accounts || []}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!budgets || budgets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No budgets created yet. Create your first budget to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Budgeted</TableHead>
                <TableHead>Forecast</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {budgets.map((budget) => {
                const project = projects?.find(p => p.id === budget.projectId);
                const account = accounts?.find(a => a.id === budget.accountId);
                return (
                  <TableRow key={budget.id}>
                    <TableCell>{project?.titleEn || "N/A"}</TableCell>
                    <TableCell>{getAccountName(account)}</TableCell>
                    <TableCell className="font-mono">
                      ${parseFloat(budget.budgetedAmount || "0").toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono">
                      ${parseFloat(budget.forecastAmount || "0").toLocaleString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(budget.status || t('finance.draft'))}</TableCell>
                    <TableCell>{budget.period || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {budget.status === "draft" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateMutation.mutate({ id: budget.id, status: "approved" })}
                          >
                            Approve
                          </Button>
                        )}
                        {budget.status === "approved" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateMutation.mutate({ id: budget.id, status: "closed" })}
                          >
                            Close
                          </Button>
                        )}
                        {budget.status === t('finance.draft') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm(t('finance.confirmDeleteBudget'))) {
                                deleteMutation.mutate({ id: budget.id });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// Budget Form Component
function BudgetForm({ projects, accounts, onSubmit }: any) {
  const { t, i18n } = useTranslation();
  
  // Helper function to get account name in current language
  const getAccountName = (account: any) => {
    return i18n.language === 'ar' && account.accountNameAr 
      ? account.accountNameAr 
      : account.accountName;
  };
  const [formData, setFormData] = useState({
    projectId: 0,
    categoryId: 1,
    accountId: 0,
    budgetedAmount: "",
    forecastAmount: "",
    currency: "USD",
    period: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectId || !formData.accountId) {
      toast.error(t('finance.pleaseSelectProjectAccount'));
      return;
    }
    if (!formData.budgetedAmount) {
      toast.error(t('finance.pleaseEnterBudgetedAmount'));
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{t('finance.createNewBudget')}</DialogTitle>
        <DialogDescription>Link budget to project and chart of accounts</DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <Label htmlFor="projectId">Project *</Label>
          <Select
            value={formData.projectId.toString()}
            onValueChange={(value) => setFormData({ ...formData, projectId: parseInt(value) })}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('finance.selectProject')} />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project: any) => (
                <SelectItem key={project.id} value={project.id.toString()}>
                  {project.titleEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="accountId">Account *</Label>
          <Select
            value={formData.accountId.toString()}
            onValueChange={(value) => setFormData({ ...formData, accountId: parseInt(value) })}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('finance.selectAccount')} />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account: any) => (
                <SelectItem key={account.id} value={account.id.toString()}>
                  {account.accountCode} - {getAccountName(account)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="budgetedAmount">Budgeted Amount *</Label>
            <Input
              id="budgetedAmount"
              type="number"
              step="0.01"
              value={formData.budgetedAmount}
              onChange={(e) => setFormData({ ...formData, budgetedAmount: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <Label htmlFor="forecastAmount">Forecast Amount</Label>
            <Input
              id="forecastAmount"
              type="number"
              step="0.01"
              value={formData.forecastAmount}
              onChange={(e) => setFormData({ ...formData, forecastAmount: e.target.value })}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="currency">Currency</Label>
            <Select
              value={formData.currency}
              onValueChange={(value) => setFormData({ ...formData, currency: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
                <SelectItem value="CHF">CHF</SelectItem>
                <SelectItem value="YER">YER</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="period">Period</Label>
            <Input
              id="period"
              value={formData.period}
              onChange={(e) => setFormData({ ...formData, period: e.target.value })}
              placeholder="e.g., Q1 2024"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder={t('finance.notesPlaceholder')}
            rows={3}
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="submit">Create Budget</Button>
      </DialogFooter>
    </form>
  );
}

// Expenditures Tab Component
function ExpendituresTab() {
  const { t } = useTranslation();
  const { data: expenditures, refetch } = trpc.finance.listExpenditures.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();
  const { data: budgets } = trpc.finance.listBudgets.useQuery();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const createMutation = trpc.finance.createExpenditure.useMutation({
    onSuccess: () => {
      toast.success(t('finance.expenditureCreated'));
      refetch();
      setIsCreateOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to create expenditure: ${error.message}`);
    },
  });

  const updateMutation = trpc.finance.updateExpenditure.useMutation({
    onSuccess: () => {
      toast.success(t('finance.expenditureStatusUpdated'));
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update expenditure: ${error.message}`);
    },
  });

  const deleteMutation = trpc.finance.deleteExpenditure.useMutation({
    onSuccess: () => {
      toast.success(t('finance.expenditureDeleted'));
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete expenditure: ${error.message}`);
    },
  });

  // Export to Excel: exports data if exists, otherwise template
  const handleExportToExcel = () => {
    const { i18n } = useTranslation();
    let data;
    let filename;
    let headers;
    
    if (expenditures && expenditures.length > 0) {
      // Export actual expenditure data
      headers = i18n.language === 'ar'
        ? ['رقم النفقة', 'رقم المشروع', 'رقم الميزانية', 'المبلغ', 'التاريخ', 'المورد', 'رقم الفاتورة', 'رابط الإيصال', 'الوصف']
        : ['Expenditure ID', 'Project ID', 'Budget ID', 'Amount', 'Date', 'Vendor', 'Invoice Number', 'Receipt URL', 'Description'];
      
      data = expenditures.map((exp: any) => [
        exp.id,
        exp.projectId || '',
        exp.budgetId || '',
        exp.amount,
        exp.expenditureDate ? new Date(exp.expenditureDate).toISOString().split('T')[0] : '',
        exp.vendor || '',
        exp.invoiceNumber || '',
        exp.receiptUrl || '',
        exp.description || ''
      ]);
      filename = `expenditures_${new Date().toISOString().split('T')[0]}.xlsx`;
      toast.success(t('finance.exportedSuccessfully'));
    } else {
      // Export template with example data
      headers = i18n.language === 'ar'
        ? ['رقم المشروع', 'رقم الميزانية', 'المبلغ', 'التاريخ', 'المورد', 'رقم الفاتورة', 'رابط الإيصال', 'الوصف']
        : ['Project ID', 'Budget ID', 'Amount', 'Date', 'Vendor', 'Invoice Number', 'Receipt URL', 'Description'];
      
      const exampleRow = i18n.language === 'ar'
        ? ['1', '1', '5000', '2025-01-15', 'مورد مثالي', 'INV-001', 'https://example.com/receipt.pdf', 'وصف اختياري']
        : ['1', '1', '5000', '2025-01-15', 'Example Vendor', 'INV-001', 'https://example.com/receipt.pdf', 'Optional description'];
      data = [exampleRow];
      filename = 'expenditures_template.xlsx';
      toast.success(t('finance.templateDownloaded'));
    }
    
    const sheetData = [headers, ...data];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expenditures');
    XLSX.writeFile(wb, filename);
  };

  // Import from Excel
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          toast.error(t('finance.noDataInFile'));
          return;
        }
        
        const rows = jsonData.slice(1); // Skip header
        let imported = 0;
        
        rows.forEach((row: any) => {
          if (row.length < 4) return; // Skip empty rows (need at least projectId, budgetId, amount, date)
          
          const expenditureData = {
            projectId: parseInt(row[0]),
            budgetId: parseInt(row[1]),
            amount: row[2].toString(), // amount must be string
            expenditureDate: new Date(row[3]),
            vendor: row[4] || '',
            invoiceNumber: row[5] || '',
            receiptUrl: row[6] || '',
            description: row[7] || '',
          };
          
          if (expenditureData.projectId && expenditureData.budgetId && expenditureData.amount && expenditureData.expenditureDate) {
            createMutation.mutate(expenditureData);
            imported++;
          }
        });
        
        toast.success(`${t('finance.importedSuccessfully')}: ${imported} ${t('finance.records')}`);
      } catch (error) {
        toast.error(t('finance.importFailed'));
      }
    };
    
    reader.readAsArrayBuffer(file);
    e.target.value = ''; // Reset input
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; icon: any }> = {
      draft: { variant: "secondary", icon: Clock },
      submitted: { variant: "outline", icon: AlertCircle },
      approved: { variant: "default", icon: CheckCircle },
      rejected: { variant: "destructive", icon: XCircle },
      paid: { variant: "default", icon: CheckCircle },
    };
    const { variant, icon: Icon } = config[status] || config.draft;
    return (
      <Badge variant={variant}>
        <Icon className="mr-1 h-3 w-3" />
        {status}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('finance.expenditureRecording')}</CardTitle>
            <CardDescription>{t('finance.expenditureRecordingDesc')}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportToExcel}>
              <Download className="mr-2 h-4 w-4" />
              {t('finance.exportToExcel')}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <label className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                {t('finance.importExcel')}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleImportExcel}
                />
              </label>
            </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t('finance.newExpenditure')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <ExpenditureForm
                onSubmit={(data: any) => createMutation.mutate(data)}
                projects={projects || []}
                budgets={budgets || []}
              />
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!expenditures || expenditures.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No expenditures recorded yet. Create your first expenditure to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenditures.map((expenditure) => {
                const project = projects?.find(p => p.id === expenditure.projectId);
                return (
                  <TableRow key={expenditure.id}>
                    <TableCell>
                      {new Date(expenditure.expenditureDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{project?.titleEn || "N/A"}</TableCell>
                    <TableCell>{expenditure.description || "-"}</TableCell>
                    <TableCell>{expenditure.vendor || "-"}</TableCell>
                    <TableCell className="font-mono">
                      ${parseFloat(expenditure.amount || "0").toLocaleString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(expenditure.status || t('finance.draft'))}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {expenditure.status === "draft" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateMutation.mutate({ id: expenditure.id, status: "submitted" })}
                            >
                              Submit
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm(t('finance.confirmDeleteExpenditure'))) {
                                  deleteMutation.mutate({ id: expenditure.id });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {expenditure.status === "submitted" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateMutation.mutate({ id: expenditure.id, status: "approved" })}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateMutation.mutate({ id: expenditure.id, status: "rejected" })}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {expenditure.status === "approved" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateMutation.mutate({ id: expenditure.id, status: "paid" })}
                          >
                            Mark Paid
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// Expenditure Form Component
function ExpenditureForm({ onSubmit, projects, budgets }: any) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    projectId: 0,
    budgetId: 0,
    amount: "",
    currency: "USD",
    expenditureDate: new Date().toISOString().split("T")[0],
    description: "",
    vendor: "",
    invoiceNumber: "",
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectId || !formData.budgetId) {
      toast.error(t('finance.pleaseSelectProjectBudget'));
      return;
    }
    if (!formData.amount) {
      toast.error(t('finance.pleaseEnterAmount'));
      return;
    }

    // Validate file size (5MB max)
    if (receiptFile && receiptFile.size > 5 * 1024 * 1024) {
      toast.error(t('finance.receiptFileTooLarge'));
      return;
    }

    let receiptUrl = "";
    
    // Upload receipt to S3 if provided
    if (receiptFile) {
      setUploading(true);
      try {
        const formDataUpload = new FormData();
        formDataUpload.append("file", receiptFile);
        
        const response = await fetch("/api/upload-receipt", {
          method: "POST",
          body: formDataUpload,
        });
        
        if (!response.ok) {
          throw new Error(t('finance.receiptUploadFailed'));
        }
        
        const { url } = await response.json();
        receiptUrl = url;
        toast.success(t('finance.receiptUploaded'));
      } catch (error) {
        toast.error(t('finance.receiptUploadFailed'));
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    onSubmit({
      ...formData,
      expenditureDate: new Date(formData.expenditureDate),
      receiptUrl,
    });
  };

  const projectBudgets = budgets.filter((b: any) => b.projectId === formData.projectId);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{t('finance.recordNewExpenditure')}</DialogTitle>
        <DialogDescription>Enter expenditure details</DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <Label htmlFor="projectId">Project *</Label>
          <Select
            value={formData.projectId.toString()}
            onValueChange={(value) => setFormData({ ...formData, projectId: parseInt(value), budgetId: 0 })}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('finance.selectProject')} />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project: any) => (
                <SelectItem key={project.id} value={project.id.toString()}>
                  {project.titleEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="budgetId">Budget Line *</Label>
          <Select
            value={formData.budgetId.toString()}
            onValueChange={(value) => setFormData({ ...formData, budgetId: parseInt(value) })}
            disabled={!formData.projectId}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('finance.selectBudgetLine')} />
            </SelectTrigger>
            <SelectContent>
              {projectBudgets.map((budget: any) => (
                <SelectItem key={budget.id} value={budget.id.toString()}>
                  Budget #{budget.id} - ${parseFloat(budget.budgetedAmount || "0").toLocaleString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <Label htmlFor="currency">Currency *</Label>
            <Select
              value={formData.currency}
              onValueChange={(value) => setFormData({ ...formData, currency: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
                <SelectItem value="CHF">CHF</SelectItem>
                <SelectItem value="YER">YER</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="expenditureDate">Date *</Label>
            <Input
              id="expenditureDate"
              type="date"
              value={formData.expenditureDate}
              onChange={(e) => setFormData({ ...formData, expenditureDate: e.target.value })}
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder={t('finance.expenditureDescription')}
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="vendor">Vendor</Label>
            <Input
              id="vendor"
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              placeholder={t('finance.vendorName')}
            />
          </div>

          <div>
            <Label htmlFor="invoiceNumber">Invoice Number</Label>
            <Input
              id="invoiceNumber"
              value={formData.invoiceNumber}
              onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
              placeholder={t('finance.invoiceNumberPlaceholder')}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="receipt">Receipt Upload</Label>
          <div className="border-2 border-dashed rounded-lg p-4">
            <Input
              id="receipt"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
              className="cursor-pointer"
            />
            {receiptFile && (
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{receiptFile.name} ({(receiptFile.size / 1024).toFixed(2)} KB)</span>
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Supported formats: PDF, JPG, PNG (max 5MB)
            </p>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={uploading}>
          {uploading ? t('finance.uploadingReceipt') : t('finance.createExpenditure')}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Reports Tab Component
function ReportsTab() {
  const { t, i18n } = useTranslation();
  const { data: budgets } = trpc.finance.listBudgets.useQuery();
  const { data: expenditures } = trpc.finance.listExpenditures.useQuery();

  const totalBudget = budgets?.reduce((sum, b) => sum + parseFloat(b.budgetedAmount || "0"), 0) || 0;
  const totalSpent = expenditures?.filter(e => e.status === t('finance.approved') || e.status === t('finance.paid'))
    .reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0) || 0;
  const variance = totalBudget - totalSpent;

  const exportToPDF = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      
      // Load Arabic font if needed
      const isArabic = i18n.language === 'ar';
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // For Arabic, we'll use right-aligned text
      const pageWidth = doc.internal.pageSize.getWidth();
      const leftMargin = isArabic ? pageWidth - 20 : 20;
      const textAlign = isArabic ? 'right' : 'left';
      
      // Helper function for bilingual text positioning
      const addText = (text: string, x: number, y: number, fontSize: number = 10) => {
        doc.setFontSize(fontSize);
        if (isArabic) {
          // For Arabic, position from right
          doc.text(text, pageWidth - x, y, { align: 'right' });
        } else {
          doc.text(text, x, y);
        }
      };
      
      // Title (bilingual)
      const title = isArabic 
        ? 'تقرير تحليل التباين المالي'
        : 'Financial Variance Analysis Report';
      addText(title, 20, 20, 18);
      
      // Date (bilingual)
      const dateLabel = isArabic ? 'تاريخ الإنشاء' : 'Generated';
      addText(`${dateLabel}: ${new Date().toLocaleDateString()}`, 20, 30, 10);
      
      // Summary Section (bilingual)
      const summaryTitle = isArabic ? 'الملخص المالي' : 'Financial Summary';
      addText(summaryTitle, 20, 45, 12);
      
      const totalBudgetLabel = isArabic ? 'الميزانية الإجمالية' : 'Total Budget';
      const totalSpentLabel = isArabic ? 'الإنفاق الإجمالي' : 'Total Spent';
      const varianceLabel = isArabic ? 'الفرق' : 'Variance';
      const utilizationLabel = isArabic ? 'معدل الاستخدام' : 'Utilization Rate';
      const underBudgetLabel = isArabic ? '(أقل من الميزانية)' : '(Under Budget)';
      const overBudgetLabel = isArabic ? '(أكثر من الميزانية)' : '(Over Budget)';
      
      addText(`${totalBudgetLabel}: $${totalBudget.toLocaleString()}`, 30, 55, 10);
      addText(`${totalSpentLabel}: $${totalSpent.toLocaleString()}`, 30, 62, 10);
      addText(`${varianceLabel}: $${Math.abs(variance).toLocaleString()} ${variance >= 0 ? underBudgetLabel : overBudgetLabel}`, 30, 69, 10);
      addText(`${utilizationLabel}: ${totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0}%`, 30, 76, 10);
      
      // Budget Details (bilingual)
      if (budgets && budgets.length > 0) {
        const budgetBreakdownLabel = isArabic ? 'تفصيل الميزانية' : 'Budget Breakdown';
        addText(budgetBreakdownLabel, 20, 90, 10);
        
        let yPos = 100;
        budgets.forEach((budget: any, index: number) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          const budgetIdLabel = isArabic ? 'رقم الميزانية' : 'Budget ID';
          const amountLabel = isArabic ? 'المبلغ' : 'Amount';
          const statusLabel = isArabic ? 'الحالة' : 'Status';
          
          addText(`${index + 1}. ${budgetIdLabel}: ${budget.id}`, 30, yPos, 10);
          addText(`   ${amountLabel}: $${parseFloat(budget.budgetedAmount || "0").toLocaleString()}`, 30, yPos + 7, 10);
          addText(`   ${statusLabel}: ${budget.status}`, 30, yPos + 14, 10);
          yPos += 25;
        });
      }
      
      // Compliance Statement (bilingual)
      const complianceText = isArabic
        ? 'يتوافق هذا التقرير مع معايير التقارير المالية للاتحاد الأوروبي والأمم المتحدة وECHO'
        : 'This report complies with EU, UN, and ECHO financial reporting standards.';
      doc.setFontSize(8);
      if (isArabic) {
        doc.text(complianceText, pageWidth - 20, 280, { align: 'right' });
      } else {
        doc.text(complianceText, 20, 280);
      }
      
      doc.save(`financial-report-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success(t('finance.pdfReportGenerated'));
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error(t('finance.pdfReportFailed'));
    }
  };

  const exportToExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Summary sheet with bilingual headers
      const summaryData = [
        [t('finance.financialSummaryReport')],
        [t('finance.generated'), new Date().toLocaleDateString()],
        [],
        [t('finance.metric'), t('finance.amount')],
        [t('finance.totalBudget'), totalBudget],
        [t('finance.totalSpent'), totalSpent],
        [t('finance.variance'), variance],
        [t('finance.utilizationRate'), totalBudget > 0 ? `${((totalSpent / totalBudget) * 100).toFixed(1)}%` : "0%"],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");
      
      // Budgets sheet with bilingual headers
      if (budgets && budgets.length > 0) {
        const budgetData = budgets.map((b: any) => ({
          [t('finance.budgetId')]: b.id,
          [t('finance.projectId')]: b.projectId,
          [t('finance.accountId')]: b.accountId,
          [t('finance.budgetedAmount')]: parseFloat(b.budgetedAmount || "0"),
          [t('finance.forecastAmount')]: parseFloat(b.forecastAmount || "0"),
          [t('finance.currency')]: b.currency,
          [t('finance.status')]: b.status,
          [t('finance.period')]: b.period,
        }));
        const budgetSheet = XLSX.utils.json_to_sheet(budgetData);
        XLSX.utils.book_append_sheet(wb, budgetSheet, t('finance.budgets'));
      }
      
      // Expenditures sheet with bilingual headers
      if (expenditures && expenditures.length > 0) {
        const expData = expenditures.map((e: any) => ({
          [t('finance.expenditureId')]: e.id,
          [t('finance.budgetId')]: e.budgetId,
          [t('finance.amount')]: parseFloat(e.amount || "0"),
          [t('finance.currency')]: e.currency,
          [t('finance.date')]: new Date(e.expenditureDate).toLocaleDateString(),
          [t('finance.vendor')]: e.vendor || "",
          [t('finance.status')]: e.status,
          [t('finance.excelDescription')]: e.description || "",
        }));
        const expSheet = XLSX.utils.json_to_sheet(expData);
        XLSX.utils.book_append_sheet(wb, expSheet, t('finance.expenditures'));
      }
      
      // Write file
      XLSX.writeFile(wb, `financial-report-${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success(t('finance.excelReportGenerated'));
    } catch (error) {
      console.error("Excel export error:", error);
      toast.error(t('finance.excelReportFailed'));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('finance.financialReports')}</CardTitle>
          <CardDescription>{t('finance.financialReportsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('finance.varianceAnalysisReport')}</CardTitle>
                <CardDescription>{t('finance.budgetVsActualComparison')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t('finance.totalBudget')}:</span>
                    <span className="font-mono">${totalBudget.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('finance.totalSpent')}:</span>
                    <span className="font-mono">${totalSpent.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span>{t('finance.variance')}:</span>
                    <span className={`font-mono ${variance >= 0 ? "text-green-600" : "text-red-600"}`}>
                      ${Math.abs(variance).toLocaleString()} {variance >= 0 ? "(Under)" : "(Over)"}
                    </span>
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={exportToPDF}>
                  <FileText className="mr-2 h-4 w-4" />
                  {t('finance.exportToPDF')}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('finance.budgetUtilizationReport')}</CardTitle>
                <CardDescription>{t('finance.spendingAnalysisByProject')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-4">
                  <div className="text-3xl font-bold">
                    {totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0}%
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{t('finance.budgetUtilized')}</p>
                </div>
                <Button variant="outline" className="w-full" onClick={exportToExcel}>
                  <Download className="mr-2 h-4 w-4" />
                  {t('finance.exportToExcel')}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('finance.expenditureSummary')}</CardTitle>
                <CardDescription>{t('finance.detailedExpenditureBreakdown')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t('finance.draft')}:</span>
                    <span>{expenditures?.filter(e => e.status === t('finance.draft')).length || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('finance.submitted')}:</span>
                    <span>{expenditures?.filter(e => e.status === t('finance.submitted')).length || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('finance.approved')}:</span>
                    <span>{expenditures?.filter(e => e.status === t('finance.approved')).length || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('finance.paid')}:</span>
                    <span>{expenditures?.filter(e => e.status === t('finance.paid')).length || 0}</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={exportToExcel}>
                  <Download className="mr-2 h-4 w-4" />
                  {t('finance.exportToExcel')}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('finance.donorComplianceReport')}</CardTitle>
                <CardDescription>{t('finance.euUnEchoFormat')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  {t('finance.donorComplianceReportDesc')}
                </div>
                <Button variant="outline" className="w-full" disabled>
                  <Download className="mr-2 h-4 w-4" />
                  {t('finance.generateReportComingSoon')}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>{t('finance.note')}:</strong> {t('finance.exportNote')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
