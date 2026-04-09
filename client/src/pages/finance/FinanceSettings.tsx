/**
 * Finance Settings Page
 * 
 * Comprehensive financial configuration management:
 * - Currencies (with exchange rates)
 * - Fiscal Years
 * - Approval Thresholds
 * - Budget Categories
 * - Finance Roles & Permissions
 * 
 * Full CRUD, Import/Export, RTL/LTR support
 * Global INGO/Donor standards compliant
 */

import { useTranslation } from '@/i18n/useTranslation';
import { useState, useMemo } from"react";
import { useLanguage } from"@/contexts/LanguageContext";
import { useOrganization } from"@/contexts/OrganizationContext";
import { trpc } from"@/lib/trpc";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Label } from"@/components/ui/label";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogFooter,
} from"@/components/ui/dialog";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from"@/components/ui/select";
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from"@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from"@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { Badge } from"@/components/ui/badge";
import { Checkbox } from"@/components/ui/checkbox";
import { Textarea } from"@/components/ui/textarea";
import { toast } from"sonner";
import {
 Settings,
 DollarSign,
 Calendar,
 CheckCircle,
 FolderTree,
 Shield,
 Key,
 Plus,
 Search,
 Download,
 Upload,
 Edit,
 Trash2,
 ArrowLeft,
 ArrowRight,
 Star,
 RefreshCw,
} from"lucide-react";
import { Link } from"wouter";
import { BackButton } from "@/components/BackButton";

// Translations
export default function FinanceSettings() {
  const { t } = useTranslation();
  const { language, isRTL } = useLanguage();
 const { currentOrganization } = useOrganization();
 const organizationId = currentOrganization?.id || 1;
 
 const [activeTab, setActiveTab] = useState("currencies");
 const [searchTerm, setSearchTerm] = useState("");
 
 // Dialog states
 const [currencyDialog, setCurrencyDialog] = useState<{ open: boolean; mode:"create" |"edit"; data?: any }>({ open: false, mode:"create" });
 const [fiscalYearDialog, setFiscalYearDialog] = useState<{ open: boolean; mode:"create" |"edit"; data?: any }>({ open: false, mode:"create" });
 const [thresholdDialog, setThresholdDialog] = useState<{ open: boolean; mode:"create" |"edit"; data?: any }>({ open: false, mode:"create" });
 const [categoryDialog, setCategoryDialog] = useState<{ open: boolean; mode:"create" |"edit"; data?: any }>({ open: false, mode:"create" });
 const [roleDialog, setRoleDialog] = useState<{ open: boolean; mode:"create" |"edit"; data?: any }>({ open: false, mode:"create" });
 const [permissionDialog, setPermissionDialog] = useState<{ open: boolean; mode:"create" |"edit"; data?: any }>({ open: false, mode:"create" });
 
 // Queries
 const { data: statistics, refetch: refetchStats } = trpc.financeSettings.getSettingsStatistics.useQuery({ organizationId });
 const { data: currencies = [], refetch: refetchCurrencies } = trpc.financeSettings.listCurrencies.useQuery({ organizationId, search: searchTerm });
 const { data: fiscalYears = [], refetch: refetchFiscalYears } = trpc.financeSettings.listFiscalYears.useQuery({ organizationId });
 const { data: thresholds = [], refetch: refetchThresholds } = trpc.financeSettings.listApprovalThresholds.useQuery({ organizationId });
 const { data: categories = [], refetch: refetchCategories } = trpc.financeSettings.listBudgetCategories.useQuery({ organizationId, search: searchTerm });
 const { data: roles = [], refetch: refetchRoles } = trpc.financeSettings.listFinanceRoles.useQuery({ organizationId });
 const { data: permissions = [], refetch: refetchPermissions } = trpc.financeSettings.listFinancePermissions.useQuery({ organizationId });
 
 // Mutations
 const createCurrency = trpc.financeSettings.createCurrency.useMutation({
 onSuccess: () => { toast.success(t.financeSettings.createSuccess); refetchCurrencies(); refetchStats(); setCurrencyDialog({ open: false, mode:"create" }); },
 });
 const updateCurrency = trpc.financeSettings.updateCurrency.useMutation({
 onSuccess: () => { toast.success(t.financeSettings.updateSuccess); refetchCurrencies(); refetchStats(); setCurrencyDialog({ open: false, mode:"create" }); },
 });
 const deleteCurrency = trpc.financeSettings.deleteCurrency.useMutation({
 onSuccess: () => { toast.success(t.financeSettings.deleteSuccess); refetchCurrencies(); refetchStats(); },
 });
 
 const createFiscalYear = trpc.financeSettings.createFiscalYear.useMutation({
 onSuccess: () => { toast.success(t.financeSettings.createSuccess); refetchFiscalYears(); refetchStats(); setFiscalYearDialog({ open: false, mode:"create" }); },
 });
 const updateFiscalYear = trpc.financeSettings.updateFiscalYear.useMutation({
 onSuccess: () => { toast.success(t.financeSettings.updateSuccess); refetchFiscalYears(); refetchStats(); setFiscalYearDialog({ open: false, mode:"create" }); },
 });
 const deleteFiscalYear = trpc.financeSettings.deleteFiscalYear.useMutation({
 onSuccess: () => { toast.success(t.financeSettings.deleteSuccess); refetchFiscalYears(); refetchStats(); },
 });
 
 const createThreshold = trpc.financeSettings.createApprovalThreshold.useMutation({
 onSuccess: () => { toast.success(t.financeSettings.createSuccess); refetchThresholds(); refetchStats(); setThresholdDialog({ open: false, mode:"create" }); },
 });
 const updateThreshold = trpc.financeSettings.updateApprovalThreshold.useMutation({
 onSuccess: () => { toast.success(t.financeSettings.updateSuccess); refetchThresholds(); refetchStats(); setThresholdDialog({ open: false, mode:"create" }); },
 });
 const deleteThreshold = trpc.financeSettings.deleteApprovalThreshold.useMutation({
 onSuccess: () => { toast.success(t.financeSettings.deleteSuccess); refetchThresholds(); refetchStats(); },
 });
 
 const createCategory = trpc.financeSettings.createBudgetCategory.useMutation({
 onSuccess: () => { toast.success(t.financeSettings.createSuccess); refetchCategories(); refetchStats(); setCategoryDialog({ open: false, mode:"create" }); },
 });
 const updateCategory = trpc.financeSettings.updateBudgetCategory.useMutation({
 onSuccess: () => { toast.success(t.financeSettings.updateSuccess); refetchCategories(); refetchStats(); setCategoryDialog({ open: false, mode:"create" }); },
 });
 const deleteCategory = trpc.financeSettings.deleteBudgetCategory.useMutation({
 onSuccess: () => { toast.success(t.financeSettings.deleteSuccess); refetchCategories(); refetchStats(); },
 });
 
 const createRole = trpc.financeSettings.createFinanceRole.useMutation({
 onSuccess: () => { toast.success(t.financeSettings.createSuccess); refetchRoles(); refetchStats(); setRoleDialog({ open: false, mode:"create" }); },
 });
 const updateRole = trpc.financeSettings.updateFinanceRole.useMutation({
 onSuccess: () => { toast.success(t.financeSettings.updateSuccess); refetchRoles(); refetchStats(); setRoleDialog({ open: false, mode:"create" }); },
 });
 const deleteRole = trpc.financeSettings.deleteFinanceRole.useMutation({
 onSuccess: () => { toast.success(t.financeSettings.deleteSuccess); refetchRoles(); refetchStats(); },
 });
 
 const createPermission = trpc.financeSettings.createFinancePermission.useMutation({
 onSuccess: () => { toast.success(t.financeSettings.createSuccess); refetchPermissions(); refetchStats(); setPermissionDialog({ open: false, mode:"create" }); },
 });
 const deletePermission = trpc.financeSettings.deleteFinancePermission.useMutation({
 onSuccess: () => { toast.success(t.financeSettings.deleteSuccess); refetchPermissions(); refetchStats(); },
 });
 
 const bulkImportCurrencies = trpc.financeSettings.bulkImportCurrencies.useMutation({
 onSuccess: (data) => { toast.success(`${t.financeSettings.importSuccess}: ${data.imported} items`); refetchCurrencies(); refetchStats(); },
 });
 const bulkImportCategories = trpc.financeSettings.bulkImportBudgetCategories.useMutation({
 onSuccess: (data) => { toast.success(`${t.financeSettings.importSuccess}: ${data.imported} items`); refetchCategories(); refetchStats(); },
 });
 
 // Export handler
 const handleExport = (type: string) => {
 let data: any[] = [];
 let filename ="";
 
 switch (type) {
 case"currencies":
 data = currencies;
 filename ="currencies.csv";
 break;
 case"fiscalYears":
 data = fiscalYears;
 filename ="fiscal_years.csv";
 break;
 case"thresholds":
 data = thresholds;
 filename ="approval_thresholds.csv";
 break;
 case"categories":
 data = categories;
 filename ="budget_categories.csv";
 break;
 case"roles":
 data = roles;
 filename ="finance_roles.csv";
 break;
 }
 
 if (data.length === 0) {
 toast.error(t.financeSettings.noData);
 return;
 }
 
 const headers = Object.keys(data[0]).filter(k => !k.includes("Id") && k !=="id" && !k.includes("At") && !k.includes("By") && k !=="isDeleted");
 const csv = [
 headers.join(","),
 ...data.map(row => headers.map(h => JSON.stringify(row[h] ??"")).join(","))
 ].join("\n");
 
 const blob = new Blob([csv], { type:"text/csv" });
 const url = URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = url;
 a.download = filename;
 a.click();
 URL.revokeObjectURL(url);
 toast.success(t.financeSettings.exportSuccess);
 };
 
 // Import handler
 const handleImport = (type: string) => {
 const input = document.createElement("input");
 input.type ="file";
 input.accept =".csv,.xlsx";
 input.onchange = async (e: any) => {
 const file = e.target.files?.[0];
 if (!file) return;
 
 const text = await file.text();
 const lines = text.split("\n").filter((l: string) => l.trim());
 const headers = lines[0].split(",").map((h: string) => h.trim().replace(/"/g,""));
 const items = lines.slice(1).map((line: string) => {
 const values = line.split(",").map((v: string) => v.trim().replace(/"/g,""));
 const obj: any = {};
 headers.forEach((h: string, i: number) => { obj[h] = values[i]; });
 return obj;
 });
 
 if (type ==="currencies") {
 bulkImportCurrencies.mutate({ organizationId, currencies: items });
 } else if (type ==="categories") {
 bulkImportCategories.mutate({ organizationId, categories: items });
 }
 };
 input.click();
 };
 
 // Delete handlers
 const handleDelete = (type: string, id: number) => {
 if (!confirm(t.financeSettings.confirmDelete)) return;
 
 switch (type) {
 case"currency": deleteCurrency.mutate({ id }); break;
 case"fiscalYear": deleteFiscalYear.mutate({ id }); break;
 case"threshold": deleteThreshold.mutate({ id }); break;
 case"category": deleteCategory.mutate({ id }); break;
 case"role": deleteRole.mutate({ id }); break;
 case"permission": deletePermission.mutate({ id }); break;
 }
 };
 
 // Render statistics cards
 const renderStatistics = () => (
 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
 <Card>
 <CardContent className="p-4">
 <div className="flex items-center gap-2">
 <DollarSign className="h-5 w-5 text-green-600" />
 <div>
 <p className="text-sm text-muted-foreground">{t.financeSettings.totalCurrencies}</p>
 <p className="text-2xl font-bold">{statistics?.totalCurrencies || 0}</p>
 </div>
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="p-4">
 <div className="flex items-center gap-2">
 <Calendar className="h-5 w-5 text-blue-600" />
 <div>
 <p className="text-sm text-muted-foreground">{t.financeSettings.totalFiscalYears}</p>
 <p className="text-2xl font-bold">{statistics?.totalFiscalYears || 0}</p>
 </div>
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="p-4">
 <div className="flex items-center gap-2">
 <CheckCircle className="h-5 w-5 text-purple-600" />
 <div>
 <p className="text-sm text-muted-foreground">{t.financeSettings.totalThresholds}</p>
 <p className="text-2xl font-bold">{statistics?.totalThresholds || 0}</p>
 </div>
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="p-4">
 <div className="flex items-center gap-2">
 <FolderTree className="h-5 w-5 text-orange-600" />
 <div>
 <p className="text-sm text-muted-foreground">{t.financeSettings.totalCategories}</p>
 <p className="text-2xl font-bold">{statistics?.totalBudgetCategories || 0}</p>
 </div>
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="p-4">
 <div className="flex items-center gap-2">
 <Shield className="h-5 w-5 text-red-600" />
 <div>
 <p className="text-sm text-muted-foreground">{t.financeSettings.totalRoles}</p>
 <p className="text-2xl font-bold">{statistics?.totalRoles || 0}</p>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>
 );
 
 // Currency Form Dialog
 const CurrencyFormDialog = () => {
 const [form, setForm] = useState({
 code: currencyDialog.data?.code ||"",
 name: currencyDialog.data?.name ||"",
 symbol: currencyDialog.data?.symbol ||"",
 exchangeRateToUSD: currencyDialog.data?.exchangeRateToUSD ||"1.00",
 isBaseCurrency: currencyDialog.data?.isBaseCurrency || false,
 decimalPlaces: currencyDialog.data?.decimalPlaces || 2,
 });
 
 const handleSubmit = () => {
 if (currencyDialog.mode ==="create") {
 createCurrency.mutate({ ...form, organizationId });
 } else {
 updateCurrency.mutate({ id: currencyDialog.data.id, ...form });
 }
 };
 
 return (
 <Dialog open={currencyDialog.open} onOpenChange={(open) => setCurrencyDialog({ ...currencyDialog, open })}>
 <DialogContent className="max-w-md">
 <DialogHeader>
 <DialogTitle>{currencyDialog.mode ==="create" ? t.financeSettings.newCurrency : t.financeSettings.edit}</DialogTitle>
 </DialogHeader>
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.financeSettings.currencyCode}</Label>
 <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="USD" />
 </div>
 <div>
 <Label>{t.financeSettings.currencySymbol}</Label>
 <Input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} placeholder="$" />
 </div>
 </div>
 <div>
 <Label>{t.financeSettings.currencyName}</Label>
 <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t.placeholders.usDollar} />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.financeSettings.exchangeRateToUSD}</Label>
 <Input type="number" step="0.0001" value={form.exchangeRateToUSD} onChange={(e) => setForm({ ...form, exchangeRateToUSD: e.target.value })} />
 </div>
 <div>
 <Label>{t.financeSettings.decimalPlaces}</Label>
 <Input type="number" min="0" max="4" value={form.decimalPlaces} onChange={(e) => setForm({ ...form, decimalPlaces: parseInt(e.target.value) })} />
 </div>
 </div>
 <div className="flex items-center gap-2">
 <Checkbox checked={form.isBaseCurrency} onCheckedChange={(checked) => setForm({ ...form, isBaseCurrency: !!checked })} />
 <Label>{t.financeSettings.isBaseCurrency}</Label>
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setCurrencyDialog({ open: false, mode:"create" })}>{t.financeSettings.cancel}</Button>
 <Button onClick={handleSubmit}>{currencyDialog.mode ==="create" ? t.financeSettings.create : t.financeSettings.update}</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
 };
 
 // Fiscal Year Form Dialog
 const FiscalYearFormDialog = () => {
 const [form, setForm] = useState({
 name: fiscalYearDialog.data?.name ||"",
 code: fiscalYearDialog.data?.code ||"",
 startDate: fiscalYearDialog.data?.startDate ? new Date(fiscalYearDialog.data.startDate).toISOString().split("T")[0] :"",
 endDate: fiscalYearDialog.data?.endDate ? new Date(fiscalYearDialog.data.endDate).toISOString().split("T")[0] :"",
 status: fiscalYearDialog.data?.status ||"planning",
 isCurrent: fiscalYearDialog.data?.isCurrent || false,
 });
 
 const handleSubmit = () => {
 if (fiscalYearDialog.mode ==="create") {
 createFiscalYear.mutate({ ...form, organizationId });
 } else {
 updateFiscalYear.mutate({ id: fiscalYearDialog.data.id, ...form });
 }
 };
 
 return (
 <Dialog open={fiscalYearDialog.open} onOpenChange={(open) => setFiscalYearDialog({ ...fiscalYearDialog, open })}>
 <DialogContent className="max-w-md">
 <DialogHeader>
 <DialogTitle>{fiscalYearDialog.mode ==="create" ? t.financeSettings.newFiscalYear : t.financeSettings.edit}</DialogTitle>
 </DialogHeader>
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.financeSettings.fiscalYearCode}</Label>
 <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder={t.placeholders.fy2026} />
 </div>
 <div>
 <Label>{t.financeSettings.status}</Label>
 <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="planning">{t.financeSettings.planning}</SelectItem>
 <SelectItem value="active">{t.financeSettings.active}</SelectItem>
 <SelectItem value="closed">{t.financeSettings.closed}</SelectItem>
 <SelectItem value="archived">{t.financeSettings.archived}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 <div>
 <Label>{t.financeSettings.fiscalYearName}</Label>
 <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t.placeholders.fiscalYear2026} />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.financeSettings.startDate}</Label>
 <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
 </div>
 <div>
 <Label>{t.financeSettings.endDate}</Label>
 <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
 </div>
 </div>
 <div className="flex items-center gap-2">
 <Checkbox checked={form.isCurrent} onCheckedChange={(checked) => setForm({ ...form, isCurrent: !!checked })} />
 <Label>{t.financeSettings.isCurrent}</Label>
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setFiscalYearDialog({ open: false, mode:"create" })}>{t.financeSettings.cancel}</Button>
 <Button onClick={handleSubmit}>{fiscalYearDialog.mode ==="create" ? t.financeSettings.create : t.financeSettings.update}</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
 };
 
 // Threshold Form Dialog
 const ThresholdFormDialog = () => {
 const [form, setForm] = useState({
 name: thresholdDialog.data?.name ||"",
 category: thresholdDialog.data?.category ||"expense",
 minAmount: thresholdDialog.data?.minAmount ||"0",
 maxAmount: thresholdDialog.data?.maxAmount ||"",
 currency: thresholdDialog.data?.currency ||"USD",
 approverRole: thresholdDialog.data?.approverRole ||"",
 requiresMultipleApprovers: thresholdDialog.data?.requiresMultipleApprovers || false,
 minimumApprovers: thresholdDialog.data?.minimumApprovers || 1,
 });
 
 const handleSubmit = () => {
 if (thresholdDialog.mode ==="create") {
 createThreshold.mutate({ ...form, organizationId });
 } else {
 updateThreshold.mutate({ id: thresholdDialog.data.id, ...form });
 }
 };
 
 return (
 <Dialog open={thresholdDialog.open} onOpenChange={(open) => setThresholdDialog({ ...thresholdDialog, open })}>
 <DialogContent className="max-w-md">
 <DialogHeader>
 <DialogTitle>{thresholdDialog.mode ==="create" ? t.financeSettings.newThreshold : t.financeSettings.edit}</DialogTitle>
 </DialogHeader>
 <div className="space-y-4">
 <div>
 <Label>{t.financeSettings.thresholdName}</Label>
 <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t.placeholders.level1Approval} />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.financeSettings.category}</Label>
 <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as any })}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="expense">{t.financeSettings.expense}</SelectItem>
 <SelectItem value="advance">{t.financeSettings.advance}</SelectItem>
 <SelectItem value="budget">{t.financeSettings.budget}</SelectItem>
 <SelectItem value="asset_disposal">{t.financeSettings.assetDisposal}</SelectItem>
 <SelectItem value="procurement">{t.financeSettings.procurement}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div>
 <Label>{t.financeSettings.currency}</Label>
 <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} placeholder="USD" />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.financeSettings.minAmount}</Label>
 <Input type="number" value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: e.target.value })} />
 </div>
 <div>
 <Label>{t.financeSettings.maxAmount}</Label>
 <Input type="number" value={form.maxAmount} onChange={(e) => setForm({ ...form, maxAmount: e.target.value })} placeholder={t.placeholders.unlimited} />
 </div>
 </div>
 <div>
 <Label>{t.financeSettings.approverRole}</Label>
 <Input value={form.approverRole} onChange={(e) => setForm({ ...form, approverRole: e.target.value })} placeholder={t.placeholders.financeManager} />
 </div>
 <div className="flex items-center gap-2">
 <Checkbox checked={form.requiresMultipleApprovers} onCheckedChange={(checked) => setForm({ ...form, requiresMultipleApprovers: !!checked })} />
 <Label>{t.financeSettings.requiresMultiple}</Label>
 </div>
 {form.requiresMultipleApprovers && (
 <div>
 <Label>{t.financeSettings.minimumApprovers}</Label>
 <Input type="number" min="2" value={form.minimumApprovers} onChange={(e) => setForm({ ...form, minimumApprovers: parseInt(e.target.value) })} />
 </div>
 )}
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setThresholdDialog({ open: false, mode:"create" })}>{t.financeSettings.cancel}</Button>
 <Button onClick={handleSubmit}>{thresholdDialog.mode ==="create" ? t.financeSettings.create : t.financeSettings.update}</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
 };
 
 // Budget Category Form Dialog
 const CategoryFormDialog = () => {
 const [form, setForm] = useState({
 code: categoryDialog.data?.code ||"",
 name: categoryDialog.data?.name ||"",
 description: categoryDialog.data?.description ||"",
 parentId: categoryDialog.data?.parentId || undefined,
 accountCode: categoryDialog.data?.accountCode ||"",
 budgetType: categoryDialog.data?.budgetType ||"operational",
 sortOrder: categoryDialog.data?.sortOrder || 0,
 });
 
 const handleSubmit = () => {
 if (categoryDialog.mode ==="create") {
 createCategory.mutate({ ...form, organizationId });
 } else {
 updateCategory.mutate({ id: categoryDialog.data.id, ...form });
 }
 };
 
 return (
 <Dialog open={categoryDialog.open} onOpenChange={(open) => setCategoryDialog({ ...categoryDialog, open })}>
 <DialogContent className="max-w-md">
 <DialogHeader>
 <DialogTitle>{categoryDialog.mode ==="create" ? t.financeSettings.newCategory : t.financeSettings.edit}</DialogTitle>
 </DialogHeader>
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.financeSettings.categoryCode}</Label>
 <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder={t.placeholders.bc001} />
 </div>
 <div>
 <Label>{t.financeSettings.budgetType}</Label>
 <Select value={form.budgetType} onValueChange={(v) => setForm({ ...form, budgetType: v as any })}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="personnel">{t.financeSettings.personnel}</SelectItem>
 <SelectItem value="operational">{t.financeSettings.operational}</SelectItem>
 <SelectItem value="capital">{t.financeSettings.capital}</SelectItem>
 <SelectItem value="indirect">{t.financeSettings.indirect}</SelectItem>
 <SelectItem value="program">{t.financeSettings.program}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 <div>
 <Label>{t.financeSettings.categoryName}</Label>
 <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t.placeholders.personnelCosts} />
 </div>

 <div>
 <Label>{t.financeSettings.description}</Label>
 <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t.placeholders.description} />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.financeSettings.accountCode}</Label>
 <Input value={form.accountCode} onChange={(e) => setForm({ ...form, accountCode: e.target.value })} placeholder="5000" />
 </div>
 <div>
 <Label>{t.financeSettings.sortOrder}</Label>
 <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) })} />
 </div>
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setCategoryDialog({ open: false, mode:"create" })}>{t.financeSettings.cancel}</Button>
 <Button onClick={handleSubmit}>{categoryDialog.mode ==="create" ? t.financeSettings.create : t.financeSettings.update}</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
 };
 
 // Role Form Dialog
 const RoleFormDialog = () => {
 const [form, setForm] = useState({
 code: roleDialog.data?.code ||"",
 name: roleDialog.data?.name ||"",
 description: roleDialog.data?.description ||"",
 level: roleDialog.data?.level || 1,
 });
 
 const handleSubmit = () => {
 if (roleDialog.mode ==="create") {
 createRole.mutate({ ...form, organizationId });
 } else {
 updateRole.mutate({ id: roleDialog.data.id, ...form });
 }
 };
 
 return (
 <Dialog open={roleDialog.open} onOpenChange={(open) => setRoleDialog({ ...roleDialog, open })}>
 <DialogContent className="max-w-md">
 <DialogHeader>
 <DialogTitle>{roleDialog.mode ==="create" ? t.financeSettings.newRole : t.financeSettings.edit}</DialogTitle>
 </DialogHeader>
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.financeSettings.roleCode}</Label>
 <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder={t.placeholders.fin_mgr} />
 </div>
 <div>
 <Label>{t.financeSettings.roleLevel}</Label>
 <Input type="number" min="1" max="10" value={form.level} onChange={(e) => setForm({ ...form, level: parseInt(e.target.value) })} />
 </div>
 </div>
 <div>
 <Label>{t.financeSettings.roleName}</Label>
 <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t.placeholders.financeManager} />
 </div>

 <div>
 <Label>{t.financeSettings.roleDescription}</Label>
 <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t.placeholders.roleDescription} />
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setRoleDialog({ open: false, mode:"create" })}>{t.financeSettings.cancel}</Button>
 <Button onClick={handleSubmit}>{roleDialog.mode ==="create" ? t.financeSettings.create : t.financeSettings.update}</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
 };
 
 // Permission Form Dialog
 const PermissionFormDialog = () => {
 const [form, setForm] = useState({
 code:"",
 name:"",
 description:"",
 module:"budgets",
 action:"view" as"view" |"create" |"edit" |"delete" |"approve" |"export" |"import",
 });
 
 const handleSubmit = () => {
 createPermission.mutate({ ...form, organizationId });
 };
 
 return (
 <Dialog open={permissionDialog.open} onOpenChange={(open) => setPermissionDialog({ ...permissionDialog, open })}>
 <DialogContent className="max-w-md">
 <DialogHeader>
 <DialogTitle>{t.financeSettings.newPermission}</DialogTitle>
 </DialogHeader>
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label>{t.financeSettings.permissionCode}</Label>
 <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="BUDGET_VIEW" />
 </div>
 <div>
 <Label>{t.financeSettings.action}</Label>
 <Select value={form.action} onValueChange={(v) => setForm({ ...form, action: v as any })}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="view">{t.financeSettings.view}</SelectItem>
 <SelectItem value="create">{t.financeSettings.createAction}</SelectItem>
 <SelectItem value="edit">{t.financeSettings.editAction}</SelectItem>
 <SelectItem value="delete">{t.financeSettings.deleteAction}</SelectItem>
 <SelectItem value="approve">{t.financeSettings.approve}</SelectItem>
 <SelectItem value="export">{t.financeSettings.exportAction}</SelectItem>
 <SelectItem value="import">{t.financeSettings.importAction}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 <div>
 <Label>{t.financeSettings.module}</Label>
 <Input value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value })} placeholder={t.placeholders.budgets} />
 </div>
 <div>
 <Label>{t.financeSettings.permissionName}</Label>
 <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t.placeholders.viewBudgets} />
 </div>

 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setPermissionDialog({ open: false, mode:"create" })}>{t.financeSettings.cancel}</Button>
 <Button onClick={handleSubmit}>{t.financeSettings.create}</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
 };
 
 return (
 <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
 <div className="container py-6">
 {/* Header */}
 <div className="flex items-center justify-between mb-6">
 <div>
 <div className="flex items-center gap-2 mb-2">
 <Link href="/organization/finance">
 <BackButton label={t.financeSettings.backToFinance} />
 </Link>
 </div>
 <h1 className="text-3xl font-bold flex items-center gap-2">
 <Settings className="h-8 w-8 text-primary" />
 {t.financeSettings.title}
 </h1>
 <p className="text-muted-foreground mt-1">{t.financeSettings.subtitle}</p>
 </div>
 </div>
 
 {/* Statistics */}
 {renderStatistics()}
 
 {/* Tabs */}
 <Tabs value={activeTab} onValueChange={setActiveTab}>
 <TabsList className="mb-4">
 <TabsTrigger value="currencies" className="flex items-center gap-2">
 <DollarSign className="h-4 w-4" />
 {t.financeSettings.currencies}
 </TabsTrigger>
 <TabsTrigger value="fiscalYears" className="flex items-center gap-2">
 <Calendar className="h-4 w-4" />
 {t.financeSettings.fiscalYears}
 </TabsTrigger>
 <TabsTrigger value="thresholds" className="flex items-center gap-2">
 <CheckCircle className="h-4 w-4" />
 {t.financeSettings.approvalThresholds}
 </TabsTrigger>
 <TabsTrigger value="categories" className="flex items-center gap-2">
 <FolderTree className="h-4 w-4" />
 {t.financeSettings.budgetCategories}
 </TabsTrigger>
 <TabsTrigger value="roles" className="flex items-center gap-2">
 <Shield className="h-4 w-4" />
 {t.financeSettings.rolesPermissions}
 </TabsTrigger>
 </TabsList>
 
 {/* Currencies Tab */}
 <TabsContent value="currencies">
 <Card>
 <CardHeader className="flex flex-row items-center justify-between">
 <CardTitle>{t.financeSettings.currencies}</CardTitle>
 <div className="flex items-center gap-2">
 <div className="relative">
 <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
 <Input
 className="ps-9 w-64"
 placeholder={t.financeSettings.search}
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 />
 </div>
 <Button variant="outline" size="sm" onClick={() => handleExport("currencies")}>
 <Download className="h-4 w-4 me-1" />
 {t.financeSettings.export}
 </Button>
 <Button variant="outline" size="sm" onClick={() => handleImport("currencies")}>
 <Upload className="h-4 w-4 me-1" />
 {t.financeSettings.import}
 </Button>
 <Button size="sm" onClick={() => setCurrencyDialog({ open: true, mode:"create" })}>
 <Plus className="h-4 w-4 me-1" />
 {t.financeSettings.newCurrency}
 </Button>
 </div>
 </CardHeader>
 <CardContent>
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.financeSettings.currencyCode}</TableHead>
 <TableHead>{t.financeSettings.currencyName}</TableHead>
 <TableHead>{t.financeSettings.currencySymbol}</TableHead>
 <TableHead>{t.financeSettings.exchangeRateToUSD}</TableHead>
 <TableHead>{t.financeSettings.isBaseCurrency}</TableHead>
 <TableHead>{t.financeSettings.status}</TableHead>
 <TableHead className="text-center">{t.financeSettings.action}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {currencies.length === 0 ? (
 <TableRow>
 <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
 {t.financeSettings.noData}
 </TableCell>
 </TableRow>
 ) : (
 currencies.map((currency: any) => (
 <TableRow key={currency.id}>
 <TableCell className="font-mono font-bold">{currency.code}</TableCell>
 <TableCell>{language ==="ar" && currency.nameAr ? currency.nameAr : currency.name}</TableCell>
 <TableCell>{currency.symbol}</TableCell>
 <TableCell>{currency.exchangeRateToUSD}</TableCell>
 <TableCell>
 {currency.isBaseCurrency && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
 </TableCell>
 <TableCell>
 <Badge variant={currency.isActive ?"default" :"secondary"}>
 {currency.isActive ? t.financeSettings.active : t.financeSettings.archived}
 </Badge>
 </TableCell>
 <TableCell className="text-end">
 <Button variant="ghost" size="sm" onClick={() => setCurrencyDialog({ open: true, mode:"edit", data: currency })}>
 <Edit className="h-4 w-4" />
 </Button>
 <Button variant="ghost" size="sm" onClick={() => handleDelete("currency", currency.id)}>
 <Trash2 className="h-4 w-4 text-destructive" />
 </Button>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </CardContent>
 </Card>
 </TabsContent>
 
 {/* Fiscal Years Tab */}
 <TabsContent value="fiscalYears">
 <Card>
 <CardHeader className="flex flex-row items-center justify-between">
 <CardTitle>{t.financeSettings.fiscalYears}</CardTitle>
 <div className="flex items-center gap-2">
 <Button variant="outline" size="sm" onClick={() => handleExport("fiscalYears")}>
 <Download className="h-4 w-4 me-1" />
 {t.financeSettings.export}
 </Button>
 <Button size="sm" onClick={() => setFiscalYearDialog({ open: true, mode:"create" })}>
 <Plus className="h-4 w-4 me-1" />
 {t.financeSettings.newFiscalYear}
 </Button>
 </div>
 </CardHeader>
 <CardContent>
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.financeSettings.fiscalYearCode}</TableHead>
 <TableHead>{t.financeSettings.fiscalYearName}</TableHead>
 <TableHead>{t.financeSettings.startDate}</TableHead>
 <TableHead>{t.financeSettings.endDate}</TableHead>
 <TableHead>{t.financeSettings.status}</TableHead>
 <TableHead>{t.financeSettings.isCurrent}</TableHead>
 <TableHead className="text-center">{t.financeSettings.action}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {fiscalYears.length === 0 ? (
 <TableRow>
 <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
 {t.financeSettings.noData}
 </TableCell>
 </TableRow>
 ) : (
 fiscalYears.map((fy: any) => (
 <TableRow key={fy.id}>
 <TableCell className="font-mono font-bold">{fy.code}</TableCell>
 <TableCell>{language ==="ar" && fy.nameAr ? fy.nameAr : fy.name}</TableCell>
 <TableCell>{new Date(fy.startDate).toLocaleDateString()}</TableCell>
 <TableCell>{new Date(fy.endDate).toLocaleDateString()}</TableCell>
 <TableCell>
 <Badge variant={fy.status ==="active" ?"default" :"secondary"}>
 {t[fy.status as keyof typeof t] || fy.status}
 </Badge>
 </TableCell>
 <TableCell>
 {fy.isCurrent && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
 </TableCell>
 <TableCell className="text-end">
 <Button variant="ghost" size="sm" onClick={() => setFiscalYearDialog({ open: true, mode:"edit", data: fy })}>
 <Edit className="h-4 w-4" />
 </Button>
 <Button variant="ghost" size="sm" onClick={() => handleDelete("fiscalYear", fy.id)}>
 <Trash2 className="h-4 w-4 text-destructive" />
 </Button>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </CardContent>
 </Card>
 </TabsContent>
 
 {/* Approval Thresholds Tab */}
 <TabsContent value="thresholds">
 <Card>
 <CardHeader className="flex flex-row items-center justify-between">
 <CardTitle>{t.financeSettings.approvalThresholds}</CardTitle>
 <div className="flex items-center gap-2">
 <Button variant="outline" size="sm" onClick={() => handleExport("thresholds")}>
 <Download className="h-4 w-4 me-1" />
 {t.financeSettings.export}
 </Button>
 <Button size="sm" onClick={() => setThresholdDialog({ open: true, mode:"create" })}>
 <Plus className="h-4 w-4 me-1" />
 {t.financeSettings.newThreshold}
 </Button>
 </div>
 </CardHeader>
 <CardContent>
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.financeSettings.thresholdName}</TableHead>
 <TableHead>{t.financeSettings.category}</TableHead>
 <TableHead>{t.financeSettings.minAmount}</TableHead>
 <TableHead>{t.financeSettings.maxAmount}</TableHead>
 <TableHead>{t.financeSettings.approverRole}</TableHead>
 <TableHead>{t.financeSettings.requiresMultiple}</TableHead>
 <TableHead className="text-center">{t.financeSettings.action}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {thresholds.length === 0 ? (
 <TableRow>
 <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
 {t.financeSettings.noData}
 </TableCell>
 </TableRow>
 ) : (
 thresholds.map((threshold: any) => (
 <TableRow key={threshold.id}>
 <TableCell>{language ==="ar" && threshold.nameAr ? threshold.nameAr : threshold.name}</TableCell>
 <TableCell>
 <Badge variant="outline">
 {t[threshold.category as keyof typeof t] || threshold.category}
 </Badge>
 </TableCell>
 <TableCell>${parseFloat(threshold.minAmount).toLocaleString()}</TableCell>
 <TableCell>{threshold.maxAmount ? `$${parseFloat(threshold.maxAmount).toLocaleString()}` :"∞"}</TableCell>
 <TableCell>{threshold.approverRole ||"-"}</TableCell>
 <TableCell>
 {threshold.requiresMultipleApprovers ? (
 <Badge variant="default">{threshold.minimumApprovers}+</Badge>
 ) : (
 <Badge variant="secondary">{t.financeSettings.no}</Badge>
 )}
 </TableCell>
 <TableCell className="text-end">
 <Button variant="ghost" size="sm" onClick={() => setThresholdDialog({ open: true, mode:"edit", data: threshold })}>
 <Edit className="h-4 w-4" />
 </Button>
 <Button variant="ghost" size="sm" onClick={() => handleDelete("threshold", threshold.id)}>
 <Trash2 className="h-4 w-4 text-destructive" />
 </Button>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </CardContent>
 </Card>
 </TabsContent>
 
 {/* Budget Categories Tab */}
 <TabsContent value="categories">
 <Card>
 <CardHeader className="flex flex-row items-center justify-between">
 <CardTitle>{t.financeSettings.budgetCategories}</CardTitle>
 <div className="flex items-center gap-2">
 <div className="relative">
 <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
 <Input
 className="ps-9 w-64"
 placeholder={t.financeSettings.search}
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 />
 </div>
 <Button variant="outline" size="sm" onClick={() => handleExport("categories")}>
 <Download className="h-4 w-4 me-1" />
 {t.financeSettings.export}
 </Button>
 <Button variant="outline" size="sm" onClick={() => handleImport("categories")}>
 <Upload className="h-4 w-4 me-1" />
 {t.financeSettings.import}
 </Button>
 <Button size="sm" onClick={() => setCategoryDialog({ open: true, mode:"create" })}>
 <Plus className="h-4 w-4 me-1" />
 {t.financeSettings.newCategory}
 </Button>
 </div>
 </CardHeader>
 <CardContent>
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.financeSettings.categoryCode}</TableHead>
 <TableHead>{t.financeSettings.categoryName}</TableHead>
 <TableHead>{t.financeSettings.budgetType}</TableHead>
 <TableHead>{t.financeSettings.accountCode}</TableHead>
 <TableHead>{t.financeSettings.status}</TableHead>
 <TableHead className="text-center">{t.financeSettings.action}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {categories.length === 0 ? (
 <TableRow>
 <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
 {t.financeSettings.noData}
 </TableCell>
 </TableRow>
 ) : (
 categories.map((category: any) => (
 <TableRow key={category.id}>
 <TableCell className="font-mono font-bold">{category.code}</TableCell>
 <TableCell>{language ==="ar" && category.nameAr ? category.nameAr : category.name}</TableCell>
 <TableCell>
 <Badge variant="outline">
 {t[category.budgetType as keyof typeof t] || category.budgetType}
 </Badge>
 </TableCell>
 <TableCell className="font-mono">{category.accountCode ||"-"}</TableCell>
 <TableCell>
 <Badge variant={category.isActive ?"default" :"secondary"}>
 {category.isActive ? t.financeSettings.active : t.financeSettings.archived}
 </Badge>
 </TableCell>
 <TableCell className="text-end">
 <Button variant="ghost" size="sm" onClick={() => setCategoryDialog({ open: true, mode:"edit", data: category })}>
 <Edit className="h-4 w-4" />
 </Button>
 <Button variant="ghost" size="sm" onClick={() => handleDelete("category", category.id)}>
 <Trash2 className="h-4 w-4 text-destructive" />
 </Button>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </CardContent>
 </Card>
 </TabsContent>
 
 {/* Roles & Permissions Tab */}
 <TabsContent value="roles">
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Roles */}
 <Card>
 <CardHeader className="flex flex-row items-center justify-between">
 <CardTitle className="flex items-center gap-2">
 <Shield className="h-5 w-5" />
 {t.financeSettings.totalRoles}
 </CardTitle>
 <div className="flex items-center gap-2">
 <Button variant="outline" size="sm" onClick={() => handleExport("roles")}>
 <Download className="h-4 w-4 me-1" />
 {t.financeSettings.export}
 </Button>
 <Button size="sm" onClick={() => setRoleDialog({ open: true, mode:"create" })}>
 <Plus className="h-4 w-4 me-1" />
 {t.financeSettings.newRole}
 </Button>
 </div>
 </CardHeader>
 <CardContent>
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.financeSettings.roleCode}</TableHead>
 <TableHead>{t.financeSettings.roleName}</TableHead>
 <TableHead>{t.financeSettings.roleLevel}</TableHead>
 <TableHead className="text-center">{t.financeSettings.action}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {roles.length === 0 ? (
 <TableRow>
 <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
 {t.financeSettings.noData}
 </TableCell>
 </TableRow>
 ) : (
 roles.map((role: any) => (
 <TableRow key={role.id}>
 <TableCell className="font-mono font-bold">{role.code}</TableCell>
 <TableCell>{language ==="ar" && role.nameAr ? role.nameAr : role.name}</TableCell>
 <TableCell>
 <Badge variant="outline">{role.level}</Badge>
 </TableCell>
 <TableCell className="text-end">
 <Button variant="ghost" size="sm" onClick={() => setRoleDialog({ open: true, mode:"edit", data: role })}>
 <Edit className="h-4 w-4" />
 </Button>
 <Button variant="ghost" size="sm" onClick={() => handleDelete("role", role.id)}>
 <Trash2 className="h-4 w-4 text-destructive" />
 </Button>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </CardContent>
 </Card>
 
 {/* Permissions */}
 <Card>
 <CardHeader className="flex flex-row items-center justify-between">
 <CardTitle className="flex items-center gap-2">
 <Key className="h-5 w-5" />
 {t.financeSettings.totalPermissions}
 </CardTitle>
 <Button size="sm" onClick={() => setPermissionDialog({ open: true, mode:"create" })}>
 <Plus className="h-4 w-4 me-1" />
 {t.financeSettings.newPermission}
 </Button>
 </CardHeader>
 <CardContent>
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.financeSettings.permissionCode}</TableHead>
 <TableHead>{t.financeSettings.module}</TableHead>
 <TableHead className="text-center">{t.financeSettings.action}</TableHead>
 <TableHead className="text-end">{t.financeSettings.delete}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {permissions.length === 0 ? (
 <TableRow>
 <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
 {t.financeSettings.noData}
 </TableCell>
 </TableRow>
 ) : (
 permissions.map((perm: any) => (
 <TableRow key={perm.id}>
 <TableCell className="font-mono text-xs">{perm.code}</TableCell>
 <TableCell>{perm.module}</TableCell>
 <TableCell>
 <Badge variant="outline">{perm.action}</Badge>
 </TableCell>
 <TableCell className="text-end">
 <Button variant="ghost" size="sm" onClick={() => handleDelete("permission", perm.id)}>
 <Trash2 className="h-4 w-4 text-destructive" />
 </Button>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </CardContent>
 </Card>
 </div>
 </TabsContent>
 </Tabs>
 
 {/* Dialogs */}
 <CurrencyFormDialog />
 <FiscalYearFormDialog />
 <ThresholdFormDialog />
 <CategoryFormDialog />
 <RoleFormDialog />
 <PermissionFormDialog />
 </div>
 </div>
 );
}
