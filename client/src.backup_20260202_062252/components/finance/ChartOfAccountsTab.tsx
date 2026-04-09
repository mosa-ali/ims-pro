import { useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Download, Upload, Loader2, AlertCircle } from "lucide-react";
import * as XLSX from 'xlsx';

/**
 * Chart of Accounts Tab Component
 * 
 * Features:
 * - Full CRUD operations backed by tRPC/database
 * - Bilingual support (English/Arabic) with RTL/LTR switching
 * - Account hierarchy (parent-child relationships via parentAccountCode)
 * - Account types: ASSET, LIABILITY, EQUITY, INCOME, EXPENSE
 * - Export to Excel (data or template)
 * - Import from Excel with validation and error reporting
 * - Soft delete support (NO HARD DELETE)
 * 
 * File Path: /client/src/components/finance/ChartOfAccountsTab.tsx
 */
export default function ChartOfAccountsTab() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id || 1;
  
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
    return isRTL && account.accountNameAr 
      ? account.accountNameAr 
      : account.accountNameEn;
  };

  // tRPC queries and mutations
  const { data: accounts, refetch, isLoading, error } = trpc.chartOfAccounts.getAll.useQuery({
    organizationId,
  });
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  const [showImportResults, setShowImportResults] = useState(false);

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

  const bulkImportMutation = trpc.chartOfAccounts.bulkImport.useMutation({
    onSuccess: (results) => {
      setImportResults(results);
      setShowImportResults(true);
      refetch();
      if (results.imported > 0) {
        toast.success(`${results.imported} accounts imported successfully`);
      }
      if (results.errors.length > 0) {
        toast.warning(`${results.errors.length} rows had errors`);
      }
    },
    onError: (error) => {
      toast.error(`Import failed: ${error.message}`);
    },
    onSettled: () => {
      setIsImporting(false);
    },
  });

  // Export to Excel: exports data if exists, otherwise template
  const handleExportToExcel = () => {
    // Bilingual headers
    const headers = isRTL
      ? ['رمز الحساب', 'اسم الحساب (إنجليزي)', 'اسم الحساب (عربي)', 'نوع الحساب', 'رمز الحساب الرئيسي', 'الوصف']
      : ['Account Code', 'Account Name (English)', 'Account Name (Arabic)', 'Account Type', 'Parent Account Code', 'Description'];
    
    let data;
    let filename;
    
    if (accounts && accounts.length > 0) {
      // Export actual account data
      data = accounts.map((account: any) => {
        return [
          account.accountCode,
          account.accountNameEn,
          account.accountNameAr || '',
          account.accountType,
          account.parentAccountCode || '',
          account.description || ''
        ];
      });
      filename = `chart_of_accounts_${new Date().toISOString().split('T')[0]}.xlsx`;
      toast.success(t('finance.exportedSuccessfully'));
    } else {
      // Export template with example data
      const exampleRow = isRTL
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
    
    setIsImporting(true);
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
          setIsImporting(false);
          return;
        }

        // Parse rows into account objects
        const accountsToImport = rows
          .filter((row: any[]) => row[0] && row[1] && row[3]) // Must have code, name, type
          .map((row: any[]) => ({
            accountCode: row[0]?.toString() || '',
            accountNameEn: row[1]?.toString() || '',
            accountNameAr: row[2]?.toString() || '',
            accountType: row[3]?.toString() as 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE',
            parentAccountCode: row[4]?.toString() || undefined,
            description: row[5]?.toString() || undefined,
          }));

        if (accountsToImport.length === 0) {
          toast.error('No valid accounts found in file');
          setIsImporting(false);
          return;
        }

        // Call bulk import mutation
        bulkImportMutation.mutate({
          organizationId,
          accounts: accountsToImport,
          allowDuplicates: false,
        });
      } catch (error) {
        toast.error(t('finance.importFailed'));
        console.error('Import error:', error);
        setIsImporting(false);
      }
    };
    
    reader.readAsArrayBuffer(file);
    e.target.value = ''; // Reset input
  };

  // Loading state
  if (isLoading) {
    return (
      <Card dir={isRTL ? 'rtl' : 'ltr'}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card dir={isRTL ? 'rtl' : 'ltr'}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mb-4" />
          <p className="text-destructive">{error.message}</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            {isRTL ? 'إعادة المحاولة' : 'Retry'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card dir={isRTL ? 'rtl' : 'ltr'}>
        <CardHeader>
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <CardTitle>{t('finance.chartOfAccounts')}</CardTitle>
              <CardDescription>{t('finance.chartOfAccountsDesc')}</CardDescription>
            </div>
            <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Button variant="outline" size="sm" onClick={handleExportToExcel}>
                <Download className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {t('finance.exportToExcel')}
              </Button>
              <Button variant="outline" size="sm" asChild disabled={isImporting}>
                <label className="cursor-pointer flex items-center">
                  {isImporting ? (
                    <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  ) : (
                    <Upload className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  )}
                  {t('finance.importExcel')}
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleImportExcel}
                    disabled={isImporting}
                  />
                </label>
              </Button>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {t('finance.newAccount')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <AccountForm
                    organizationId={organizationId}
                    onSubmit={(data: any) => createMutation.mutate(data)}
                    accounts={accounts || []}
                    isLoading={createMutation.isPending}
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
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('finance.code')}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('finance.name')}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('finance.type')}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('finance.parent')}</TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>{isRTL ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead className={isRTL ? 'text-left' : 'text-right'}>{t('finance.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account: any) => (
                  <TableRow key={account.id}>
                    <TableCell className={`font-mono ${isRTL ? 'text-right' : 'text-left'}`}>{account.accountCode}</TableCell>
                    <TableCell className={isRTL ? 'text-right' : 'text-left'}>{getAccountName(account)}</TableCell>
                    <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                      <Badge variant="outline">{translateAccountType(account.accountType)}</Badge>
                    </TableCell>
                    <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                      {account.parentAccountCode || "-"}
                    </TableCell>
                    <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                      <Badge variant={account.isActive ? "default" : "secondary"}>
                        {account.isActive ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'غير نشط' : 'Inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-2 ${isRTL ? 'justify-start flex-row-reverse' : 'justify-end'}`}>
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
                              organizationId={organizationId}
                              initialData={account}
                              onSubmit={(data: any) => updateMutation.mutate({ id: account.id, ...data })}
                              accounts={accounts}
                              isLoading={updateMutation.isPending}
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
                          disabled={deleteMutation.isPending}
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

      {/* Import Results Dialog */}
      <Dialog open={showImportResults} onOpenChange={setShowImportResults}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isRTL ? 'نتائج الاستيراد' : 'Import Results'}</DialogTitle>
          </DialogHeader>
          {importResults && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{importResults.imported}</div>
                  <div className="text-sm text-green-700">{isRTL ? 'تم الاستيراد' : 'Imported'}</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{importResults.skipped}</div>
                  <div className="text-sm text-yellow-700">{isRTL ? 'تم التخطي' : 'Skipped'}</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{importResults.errors.length}</div>
                  <div className="text-sm text-red-700">{isRTL ? 'أخطاء' : 'Errors'}</div>
                </div>
              </div>
              
              {importResults.errors.length > 0 && (
                <div className="max-h-60 overflow-y-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{isRTL ? 'الصف' : 'Row'}</TableHead>
                        <TableHead>{isRTL ? 'الحقل' : 'Field'}</TableHead>
                        <TableHead>{isRTL ? 'الرسالة' : 'Message'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importResults.errors.map((err: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>{err.row}</TableCell>
                          <TableCell>{err.field}</TableCell>
                          <TableCell>{err.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowImportResults(false)}>
              {isRTL ? 'إغلاق' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Account Form Component
function AccountForm({ organizationId, initialData, onSubmit, accounts, isLoading }: any) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  // Helper function to get account name in current language
  const getAccountName = (account: any) => {
    return isRTL && account.accountNameAr 
      ? account.accountNameAr 
      : account.accountNameEn;
  };

  const [formData, setFormData] = useState({
    accountCode: initialData?.accountCode || "",
    accountNameEn: initialData?.accountNameEn || "",
    accountNameAr: initialData?.accountNameAr || "",
    accountType: initialData?.accountType || "EXPENSE",
    parentAccountCode: initialData?.parentAccountCode || "",
    description: initialData?.description || "",
    isActive: initialData?.isActive ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      organizationId,
      ...formData,
      parentAccountCode: formData.parentAccountCode || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <DialogHeader>
        <DialogTitle>{initialData ? t('finance.updateAccount') : t('finance.createAccount')}</DialogTitle>
        <DialogDescription>
          {initialData ? t('finance.accountDescriptionPlaceholder') : t('finance.chartOfAccountsDesc')}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <Label htmlFor="accountCode">{t('finance.accountCode')} *</Label>
          <Input
            id="accountCode"
            value={formData.accountCode}
            onChange={(e) => setFormData({ ...formData, accountCode: e.target.value })}
            placeholder="e.g., 1000, 5100"
            required
            className={isRTL ? 'text-right' : 'text-left'}
          />
        </div>

        <div>
          <Label htmlFor="accountNameEn">{t('finance.accountNameEnglish')} *</Label>
          <Input
            id="accountNameEn"
            value={formData.accountNameEn}
            onChange={(e) => setFormData({ ...formData, accountNameEn: e.target.value })}
            placeholder="e.g., Cash, Salaries Expense"
            required
            dir="ltr"
            className="text-left"
          />
        </div>

        <div>
          <Label htmlFor="accountNameAr">{t('finance.accountNameArabic')}</Label>
          <Input
            id="accountNameAr"
            value={formData.accountNameAr}
            onChange={(e) => setFormData({ ...formData, accountNameAr: e.target.value })}
            placeholder="اسم الحساب بالعربية"
            dir="rtl"
            className="text-right"
          />
        </div>

        <div>
          <Label htmlFor="accountType">{t('finance.accountType')} *</Label>
          <Select
            value={formData.accountType}
            onValueChange={(value) => setFormData({ ...formData, accountType: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ASSET">{t('finance.accountTypeAsset')}</SelectItem>
              <SelectItem value="LIABILITY">{t('finance.accountTypeLiability')}</SelectItem>
              <SelectItem value="EQUITY">{t('finance.accountTypeEquity')}</SelectItem>
              <SelectItem value="INCOME">{t('finance.accountTypeIncome')}</SelectItem>
              <SelectItem value="EXPENSE">{t('finance.accountTypeExpense')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="parentAccountCode">{t('finance.parentAccount')}</Label>
          <Select
            value={formData.parentAccountCode || "none"}
            onValueChange={(value) =>
              setFormData({ ...formData, parentAccountCode: value === "none" ? "" : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={t('finance.noneTopLevel')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('finance.noneTopLevel')}</SelectItem>
              {accounts
                ?.filter((a: any) => a.id !== initialData?.id)
                .map((account: any) => (
                  <SelectItem key={account.id} value={account.accountCode}>
                    {account.accountCode} - {getAccountName(account)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="description">{t('finance.description')}</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder={t('finance.accountDescriptionPlaceholder')}
            rows={3}
            className={isRTL ? 'text-right' : 'text-left'}
          />
        </div>
      </div>

      <DialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {initialData ? t('finance.updateAccount') : t('finance.createAccount')}
        </Button>
      </DialogFooter>
    </form>
  );
}
