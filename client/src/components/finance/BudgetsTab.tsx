import { useState } from "react";
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from "@/lib/trpc";
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
import { Plus, Edit, Trash2, Download, Upload, Clock, CheckCircle, XCircle } from "lucide-react";
import * as XLSX from 'xlsx';
import { useTranslation } from '@/i18n/useTranslation';

/**
 * Budgets Tab Component
 * 
 * Features:
 * - Full CRUD operations for budgets
 * - Bilingual support (English/Arabic) with RTL/LTR switching
 * - Budget status workflow: Draft → Approved → Revised → Closed
 * - Link budgets to projects and chart of accounts
 * - Budget line items management
 * - Export to Excel (data or template)
 * - Import from Excel with validation
 * - Soft delete support
 * 
 * File Path: /client/src/components/finance/BudgetsTab.tsx
 * 
 * Usage:
 * import BudgetsTab from '@/components/finance/BudgetsTab';
 * <BudgetsTab />
 */
export default function BudgetsTab() {
 const { t } = useTranslation();
 const { language, isRTL} = useLanguage();
 // Helper function to get account name in current language
 const getAccountName = (account: any) => {
 if (!account) return "N/A";
 return isRTL && account.accountNameAr 
 ? account.accountNameAr 
 : account.accountName;
 };

 const { data: budgets, refetch } = trpc.budgets.list.useQuery();
 // Projects query requires organizationId and operatingUnitId - using defaults for now
 const { data: projects = [] } = trpc.projects.list.useQuery(
 {},
 { enabled: true }
 );
 const { data: accounts } = trpc.chartOfAccounts.list.useQuery();
 const [isCreateOpen, setIsCreateOpen] = useState(false);

 const createMutation = trpc.budgets.create.useMutation({
 onSuccess: () => {
 toast.success(t.budgetsTab.budgetCreated);
 refetch();
 setIsCreateOpen(false);
 },
 onError: (error) => {
 toast.error(`Failed to create budget: ${error.message}`);
 },
 });

 const updateMutation = trpc.budgets.update.useMutation({
 onSuccess: () => {
 toast.success(t.budgetsTab.budgetStatusUpdated);
 refetch();
 },
 onError: (error) => {
 toast.error(`Failed to update budget: ${error.message}`);
 },
 });

 const deleteMutation = trpc.budgets.delete.useMutation({
 onSuccess: () => {
 toast.success(t.budgetsTab.budgetDeleted);
 refetch();
 },
 onError: (error) => {
 toast.error(`Failed to delete budget: ${error.message}`);
 },
 });

 const getStatusBadge = (status: string) => {
 const config: Record<string, { variant: any; icon: any; label: string }> = {
 draft: { variant: "secondary", icon: Clock, label: t.budgetsTab.draft },
 approved: { variant: "default", icon: CheckCircle, label: t.budgetsTab.approved },
 revised: { variant: "outline", icon: Edit, label: t.budgetsTab.revised },
 closed: { variant: "destructive", icon: XCircle, label: t.budgetsTab.closed },
 };
 const { variant, icon: Icon, label } = config[status] || config.draft;
 return (
 <Badge variant={variant}>
 <Icon className={`h-3 w-3 me-1`} />
 {label}
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
 headers = isRTL
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
 toast.success(t.budgetsTab.exportedSuccessfully);
 } else {
 // Export template with example data
 headers = isRTL
 ? ['رقم المشروع', 'رقم الفئة', 'رقم الحساب', 'المبلغ المدرج', 'المبلغ المتوقع', 'العملة', 'الفترة', 'ملاحظات']
 : ['Project ID', 'Category ID', 'Account ID', 'Budgeted Amount', 'Forecast Amount', 'Currency', 'Period', 'Notes'];
 
 const exampleRow = isRTL
 ? ['1', '1', '1110', '10000', '9500', 'USD', 'الربع الأول 2024', 'ملاحظات اختيارية']
 : ['1', '1', '1110', '10000', '9500', 'USD', 'Q1 2024', 'Optional notes'];
 data = [exampleRow];
 filename = 'budgets_template.xlsx';
 toast.success(t.budgetsTab.templateDownloaded);
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
 toast.error(t.budgetsTab.noDataInFile);
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

 toast.success(`${t.budgetsTab.importedSuccessfully}: ${successCount} ${t.budgetsTab.records}`);
 if (errorCount > 0) {
 toast.warning(`${t.budgetsTab.skippedInvalidRows}: ${errorCount}`);
 }
 } catch (error) {
 toast.error(t.budgetsTab.importFailed);
 console.error('Import error:', error);
 }
 };
 
 reader.readAsArrayBuffer(file);
 e.target.value = '';
 };

 return (
 <Card>
 <CardHeader>
 <div className={`flex items-center justify-between`}>
 <div className={'text-start'}>
 <CardTitle>{t.budgetsTab.budgetManagement}</CardTitle>
 <CardDescription>{t.budgetsTab.budgetManagementDesc}</CardDescription>
 </div>
 <div className={`flex gap-2`}>
 <Button variant="outline" size="sm" onClick={handleExportToExcel}>
 <Download className={`h-4 w-4 me-2`} />
 {t.budgetsTab.exportToExcel}
 </Button>
 <Button variant="outline" size="sm" asChild>
 <label className="cursor-pointer flex items-center">
 <Upload className={`h-4 w-4 me-2`} />
 {t.budgetsTab.importExcel}
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
 <Plus className={`h-4 w-4 me-2`} />
 {t.budgetsTab.newBudget}
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
 {t.budgetsTab.noBudgetsYet}
 </div>
 ) : (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className={'text-start'}>{t.budgetsTab.project}</TableHead>
 <TableHead className={'text-start'}>{t.budgetsTab.account}</TableHead>
 <TableHead className={'text-start'}>{t.budgetsTab.budgeted}</TableHead>
 <TableHead className={'text-start'}>{t.budgetsTab.forecast}</TableHead>
 <TableHead className={'text-start'}>{t.budgetsTab.status}</TableHead>
 <TableHead className={'text-start'}>{t.budgetsTab.period}</TableHead>
 <TableHead className={'text-center'}>{t.budgetsTab.actions}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {budgets.map((budget) => {
 const project = projects?.find(p => p.id === budget.projectId);
 const account = accounts?.find(a => a.id === budget.accountId);
 return (
 <TableRow key={budget.id}>
 <TableCell className={'text-start'}>
 {isRTL && project?.titleAr ? project.titleAr : project?.titleEn || "N/A"}
 </TableCell>
 <TableCell className={'text-start'}>{getAccountName(account)}</TableCell>
 <TableCell className={`font-mono text-start`}>
 ${parseFloat(budget.budgetedAmount || "0").toLocaleString()}
 </TableCell>
 <TableCell className={`font-mono text-start`}>
 ${parseFloat(budget.forecastAmount || "0").toLocaleString()}
 </TableCell>
 <TableCell className={'text-start'}>{getStatusBadge(budget.status || 'draft')}</TableCell>
 <TableCell className={'text-start'}>{budget.period || "-"}</TableCell>
 <TableCell className={'text-end'}>
 <div className={`flex items-center gap-2 justify-end`}>
 {budget.status === "draft" && (
 <Button
 variant="outline"
 size="sm"
 onClick={() => updateMutation.mutate({ id: budget.id, status: "approved" })}
 >
 {t.budgetsTab.approve}
 </Button>
 )}
 {budget.status === "approved" && (
 <Button
 variant="outline"
 size="sm"
 onClick={() => updateMutation.mutate({ id: budget.id, status: "closed" })}
 >
 {t.budgetsTab.close}
 </Button>
 )}
 {budget.status === "draft" && (
 <Button
 variant="ghost"
 size="icon"
 onClick={() => {
 if (confirm(t.budgetsTab.confirmDeleteBudget)) {
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
  const { t } = useTranslation();
 const { language, isRTL} = useLanguage();
 // Helper function to get account name in current language
 const getAccountName = (account: any) => {
 return isRTL && account.accountNameAr 
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
 toast.error(t.budgetsTab.pleaseSelectProjectAccount);
 return;
 }
 if (!formData.budgetedAmount) {
 toast.error(t.budgetsTab.pleaseEnterBudgetedAmount);
 return;
 }
 onSubmit(formData);
 };

 return (
 <form onSubmit={handleSubmit} className="space-y-4">
 <DialogHeader>
 <DialogTitle>{t.budgetsTab.createNewBudget}</DialogTitle>
 <DialogDescription>{t.budgetsTab.linkBudgetToProjectAccount}</DialogDescription>
 </DialogHeader>

 <div className="space-y-4">
 <div>
 <Label htmlFor="projectId">{t.budgetsTab.project} *</Label>
 <Select
 value={formData.projectId.toString()}
 onValueChange={(value) => setFormData({ ...formData, projectId: parseInt(value) })}
 >
 <SelectTrigger>
 <SelectValue placeholder={t.budgetsTab.selectProject} />
 </SelectTrigger>
 <SelectContent>
 {projects.map((project: any) => (
 <SelectItem key={project.id} value={project.id.toString()}>
 {isRTL && project.titleAr ? project.titleAr : project.titleEn}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div>
 <Label htmlFor="accountId">{t.budgetsTab.account} *</Label>
 <Select
 value={formData.accountId.toString()}
 onValueChange={(value) => setFormData({ ...formData, accountId: parseInt(value) })}
 >
 <SelectTrigger>
 <SelectValue placeholder={t.budgetsTab.selectAccount} />
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
 <Label htmlFor="budgetedAmount">{t.budgetsTab.budgetedAmount} *</Label>
 <Input
 id="budgetedAmount"
 type="number"
 step="0.01"
 value={formData.budgetedAmount}
 onChange={(e) => setFormData({ ...formData, budgetedAmount: e.target.value })}
 placeholder="0.00"
 required
 className={'text-start'}
 />
 </div>

 <div>
 <Label htmlFor="forecastAmount">{t.budgetsTab.forecastAmount}</Label>
 <Input
 id="forecastAmount"
 type="number"
 step="0.01"
 value={formData.forecastAmount}
 onChange={(e) => setFormData({ ...formData, forecastAmount: e.target.value })}
 placeholder="0.00"
 className={'text-start'}
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label htmlFor="currency">{t.budgetsTab.currency}</Label>
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
 <Label htmlFor="period">{t.budgetsTab.period}</Label>
 <Input
 id="period"
 value={formData.period}
 onChange={(e) => setFormData({ ...formData, period: e.target.value })}
 placeholder={t.financeModule.egQ12024}
 className={'text-start'}
 />
 </div>
 </div>

 <div>
 <Label htmlFor="notes">{t.budgetsTab.notes}</Label>
 <Textarea
 id="notes"
 value={formData.notes}
 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
 placeholder={t.budgetsTab.notesPlaceholder}
 rows={3}
 className={'text-start'}
 />
 </div>
 </div>

 <DialogFooter className={''}>
 <Button type="submit">{t.budgetsTab.createBudget}</Button>
 </DialogFooter>
 </form>
 );
}
