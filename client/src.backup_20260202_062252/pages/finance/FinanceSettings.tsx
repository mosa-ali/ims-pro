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

import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
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
} from "lucide-react";
import { Link } from "wouter";

// Translations
const translations = {
  en: {
    title: "Financial Settings",
    subtitle: "Configure currencies, fiscal years, approval workflows, and access control",
    backToFinance: "Back to Finance",
    
    // Tabs
    currencies: "Currencies",
    fiscalYears: "Fiscal Years",
    approvalThresholds: "Approval Thresholds",
    budgetCategories: "Budget Categories",
    rolesPermissions: "Roles & Permissions",
    
    // Statistics
    totalCurrencies: "Total Currencies",
    activeCurrencies: "Active Currencies",
    baseCurrency: "Base Currency",
    totalFiscalYears: "Total Fiscal Years",
    currentFiscalYear: "Current Fiscal Year",
    totalThresholds: "Total Thresholds",
    activeThresholds: "Active Thresholds",
    totalCategories: "Total Categories",
    totalRoles: "Total Roles",
    totalPermissions: "Total Permissions",
    
    // Actions
    newCurrency: "New Currency",
    newFiscalYear: "New Fiscal Year",
    newThreshold: "New Threshold",
    newCategory: "New Category",
    newRole: "New Role",
    newPermission: "New Permission",
    import: "Import",
    export: "Export",
    search: "Search...",
    save: "Save",
    cancel: "Cancel",
    create: "Create",
    update: "Update",
    delete: "Delete",
    edit: "Edit",
    
    // Currency fields
    currencyCode: "Currency Code",
    currencyName: "Currency Name",
    currencyNameAr: "Currency Name (Arabic)",
    currencySymbol: "Symbol",
    exchangeRateToUSD: "Exchange Rate",
    isBaseCurrency: "Base Currency",
    decimalPlaces: "Decimal Places",
    
    // Fiscal Year fields
    fiscalYearName: "Fiscal Year Name",
    fiscalYearNameAr: "Fiscal Year Name (Arabic)",
    fiscalYearCode: "Code",
    startDate: "Start Date",
    endDate: "End Date",
    status: "Status",
    isCurrent: "Current Year",
    
    // Fiscal Year statuses
    planning: "Planning",
    active: "Active",
    closed: "Closed",
    archived: "Archived",
    
    // Threshold fields
    thresholdName: "Threshold Name",
    thresholdNameAr: "Threshold Name (Arabic)",
    category: "Category",
    minAmount: "Minimum Amount",
    maxAmount: "Maximum Amount",
    currency: "Currency",
    approverRole: "Approver Role",
    requiresMultiple: "Requires Multiple Approvers",
    minimumApprovers: "Minimum Approvers",
    
    // Threshold categories
    expense: "Expense",
    advance: "Advance",
    budget: "Budget",
    assetDisposal: "Asset Disposal",
    procurement: "Procurement",
    
    // Budget Category fields
    categoryCode: "Category Code",
    categoryName: "Category Name",
    categoryNameAr: "Category Name (Arabic)",
    description: "Description",
    parentCategory: "Parent Category",
    accountCode: "Account Code",
    budgetType: "Budget Type",
    sortOrder: "Sort Order",
    
    // Budget Types
    personnel: "Personnel",
    operational: "Operational",
    capital: "Capital",
    indirect: "Indirect",
    program: "Program",
    
    // Role fields
    roleCode: "Role Code",
    roleName: "Role Name",
    roleNameAr: "Role Name (Arabic)",
    roleDescription: "Description",
    roleLevel: "Level",
    
    // Permission fields
    permissionCode: "Permission Code",
    permissionName: "Permission Name",
    permissionNameAr: "Permission Name (Arabic)",
    module: "Module",
    action: "Action",
    
    // Permission actions
    view: "View",
    createAction: "Create",
    editAction: "Edit",
    deleteAction: "Delete",
    approve: "Approve",
    exportAction: "Export",
    importAction: "Import",
    
    // Messages
    noData: "No data found",
    confirmDelete: "Are you sure you want to delete this item?",
    createSuccess: "Created successfully",
    updateSuccess: "Updated successfully",
    deleteSuccess: "Deleted successfully",
    importSuccess: "Imported successfully",
    exportSuccess: "Export started",
    
    // Common
    yes: "Yes",
    no: "No",
    none: "None",
    all: "All",
  },
  ar: {
    title: "الإعدادات المالية",
    subtitle: "تكوين العملات والسنوات المالية وسير عمل الموافقات والتحكم في الوصول",
    backToFinance: "العودة إلى المالية",
    
    // Tabs
    currencies: "العملات",
    fiscalYears: "السنوات المالية",
    approvalThresholds: "حدود الموافقة",
    budgetCategories: "فئات الميزانية",
    rolesPermissions: "الأدوار والصلاحيات",
    
    // Statistics
    totalCurrencies: "إجمالي العملات",
    activeCurrencies: "العملات النشطة",
    baseCurrency: "العملة الأساسية",
    totalFiscalYears: "إجمالي السنوات المالية",
    currentFiscalYear: "السنة المالية الحالية",
    totalThresholds: "إجمالي الحدود",
    activeThresholds: "الحدود النشطة",
    totalCategories: "إجمالي الفئات",
    totalRoles: "إجمالي الأدوار",
    totalPermissions: "إجمالي الصلاحيات",
    
    // Actions
    newCurrency: "عملة جديدة",
    newFiscalYear: "سنة مالية جديدة",
    newThreshold: "حد جديد",
    newCategory: "فئة جديدة",
    newRole: "دور جديد",
    newPermission: "صلاحية جديدة",
    import: "استيراد",
    export: "تصدير",
    search: "بحث...",
    save: "حفظ",
    cancel: "إلغاء",
    create: "إنشاء",
    update: "تحديث",
    delete: "حذف",
    edit: "تعديل",
    
    // Currency fields
    currencyCode: "رمز العملة",
    currencyName: "اسم العملة",
    currencyNameAr: "اسم العملة (عربي)",
    currencySymbol: "الرمز",
    exchangeRateToUSD: "سعر الصرف",
    isBaseCurrency: "العملة الأساسية",
    decimalPlaces: "الخانات العشرية",
    
    // Fiscal Year fields
    fiscalYearName: "اسم السنة المالية",
    fiscalYearNameAr: "اسم السنة المالية (عربي)",
    fiscalYearCode: "الرمز",
    startDate: "تاريخ البدء",
    endDate: "تاريخ الانتهاء",
    status: "الحالة",
    isCurrent: "السنة الحالية",
    
    // Fiscal Year statuses
    planning: "تخطيط",
    active: "نشط",
    closed: "مغلق",
    archived: "مؤرشف",
    
    // Threshold fields
    thresholdName: "اسم الحد",
    thresholdNameAr: "اسم الحد (عربي)",
    category: "الفئة",
    minAmount: "الحد الأدنى",
    maxAmount: "الحد الأقصى",
    currency: "العملة",
    approverRole: "دور المعتمد",
    requiresMultiple: "يتطلب موافقين متعددين",
    minimumApprovers: "الحد الأدنى للموافقين",
    
    // Threshold categories
    expense: "مصروف",
    advance: "سلفة",
    budget: "ميزانية",
    assetDisposal: "التخلص من الأصول",
    procurement: "مشتريات",
    
    // Budget Category fields
    categoryCode: "رمز الفئة",
    categoryName: "اسم الفئة",
    categoryNameAr: "اسم الفئة (عربي)",
    description: "الوصف",
    parentCategory: "الفئة الأم",
    accountCode: "رمز الحساب",
    budgetType: "نوع الميزانية",
    sortOrder: "ترتيب الفرز",
    
    // Budget Types
    personnel: "موظفين",
    operational: "تشغيلي",
    capital: "رأسمالي",
    indirect: "غير مباشر",
    program: "برنامج",
    
    // Role fields
    roleCode: "رمز الدور",
    roleName: "اسم الدور",
    roleNameAr: "اسم الدور (عربي)",
    roleDescription: "الوصف",
    roleLevel: "المستوى",
    
    // Permission fields
    permissionCode: "رمز الصلاحية",
    permissionName: "اسم الصلاحية",
    permissionNameAr: "اسم الصلاحية (عربي)",
    module: "الوحدة",
    action: "الإجراء",
    
    // Permission actions
    view: "عرض",
    createAction: "إنشاء",
    editAction: "تعديل",
    deleteAction: "حذف",
    approve: "موافقة",
    exportAction: "تصدير",
    importAction: "استيراد",
    
    // Messages
    noData: "لا توجد بيانات",
    confirmDelete: "هل أنت متأكد من حذف هذا العنصر؟",
    createSuccess: "تم الإنشاء بنجاح",
    updateSuccess: "تم التحديث بنجاح",
    deleteSuccess: "تم الحذف بنجاح",
    importSuccess: "تم الاستيراد بنجاح",
    exportSuccess: "بدأ التصدير",
    
    // Common
    yes: "نعم",
    no: "لا",
    none: "لا شيء",
    all: "الكل",
  },
};

export default function FinanceSettings() {
  const { language, isRTL } = useLanguage();
  const { currentOrganization } = useOrganization();
  const t = translations[language as keyof typeof translations] || translations.en;
  const organizationId = currentOrganization?.id || 1;
  
  const [activeTab, setActiveTab] = useState("currencies");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Dialog states
  const [currencyDialog, setCurrencyDialog] = useState<{ open: boolean; mode: "create" | "edit"; data?: any }>({ open: false, mode: "create" });
  const [fiscalYearDialog, setFiscalYearDialog] = useState<{ open: boolean; mode: "create" | "edit"; data?: any }>({ open: false, mode: "create" });
  const [thresholdDialog, setThresholdDialog] = useState<{ open: boolean; mode: "create" | "edit"; data?: any }>({ open: false, mode: "create" });
  const [categoryDialog, setCategoryDialog] = useState<{ open: boolean; mode: "create" | "edit"; data?: any }>({ open: false, mode: "create" });
  const [roleDialog, setRoleDialog] = useState<{ open: boolean; mode: "create" | "edit"; data?: any }>({ open: false, mode: "create" });
  const [permissionDialog, setPermissionDialog] = useState<{ open: boolean; mode: "create" | "edit"; data?: any }>({ open: false, mode: "create" });
  
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
    onSuccess: () => { toast.success(t.createSuccess); refetchCurrencies(); refetchStats(); setCurrencyDialog({ open: false, mode: "create" }); },
  });
  const updateCurrency = trpc.financeSettings.updateCurrency.useMutation({
    onSuccess: () => { toast.success(t.updateSuccess); refetchCurrencies(); refetchStats(); setCurrencyDialog({ open: false, mode: "create" }); },
  });
  const deleteCurrency = trpc.financeSettings.deleteCurrency.useMutation({
    onSuccess: () => { toast.success(t.deleteSuccess); refetchCurrencies(); refetchStats(); },
  });
  
  const createFiscalYear = trpc.financeSettings.createFiscalYear.useMutation({
    onSuccess: () => { toast.success(t.createSuccess); refetchFiscalYears(); refetchStats(); setFiscalYearDialog({ open: false, mode: "create" }); },
  });
  const updateFiscalYear = trpc.financeSettings.updateFiscalYear.useMutation({
    onSuccess: () => { toast.success(t.updateSuccess); refetchFiscalYears(); refetchStats(); setFiscalYearDialog({ open: false, mode: "create" }); },
  });
  const deleteFiscalYear = trpc.financeSettings.deleteFiscalYear.useMutation({
    onSuccess: () => { toast.success(t.deleteSuccess); refetchFiscalYears(); refetchStats(); },
  });
  
  const createThreshold = trpc.financeSettings.createApprovalThreshold.useMutation({
    onSuccess: () => { toast.success(t.createSuccess); refetchThresholds(); refetchStats(); setThresholdDialog({ open: false, mode: "create" }); },
  });
  const updateThreshold = trpc.financeSettings.updateApprovalThreshold.useMutation({
    onSuccess: () => { toast.success(t.updateSuccess); refetchThresholds(); refetchStats(); setThresholdDialog({ open: false, mode: "create" }); },
  });
  const deleteThreshold = trpc.financeSettings.deleteApprovalThreshold.useMutation({
    onSuccess: () => { toast.success(t.deleteSuccess); refetchThresholds(); refetchStats(); },
  });
  
  const createCategory = trpc.financeSettings.createBudgetCategory.useMutation({
    onSuccess: () => { toast.success(t.createSuccess); refetchCategories(); refetchStats(); setCategoryDialog({ open: false, mode: "create" }); },
  });
  const updateCategory = trpc.financeSettings.updateBudgetCategory.useMutation({
    onSuccess: () => { toast.success(t.updateSuccess); refetchCategories(); refetchStats(); setCategoryDialog({ open: false, mode: "create" }); },
  });
  const deleteCategory = trpc.financeSettings.deleteBudgetCategory.useMutation({
    onSuccess: () => { toast.success(t.deleteSuccess); refetchCategories(); refetchStats(); },
  });
  
  const createRole = trpc.financeSettings.createFinanceRole.useMutation({
    onSuccess: () => { toast.success(t.createSuccess); refetchRoles(); refetchStats(); setRoleDialog({ open: false, mode: "create" }); },
  });
  const updateRole = trpc.financeSettings.updateFinanceRole.useMutation({
    onSuccess: () => { toast.success(t.updateSuccess); refetchRoles(); refetchStats(); setRoleDialog({ open: false, mode: "create" }); },
  });
  const deleteRole = trpc.financeSettings.deleteFinanceRole.useMutation({
    onSuccess: () => { toast.success(t.deleteSuccess); refetchRoles(); refetchStats(); },
  });
  
  const createPermission = trpc.financeSettings.createFinancePermission.useMutation({
    onSuccess: () => { toast.success(t.createSuccess); refetchPermissions(); refetchStats(); setPermissionDialog({ open: false, mode: "create" }); },
  });
  const deletePermission = trpc.financeSettings.deleteFinancePermission.useMutation({
    onSuccess: () => { toast.success(t.deleteSuccess); refetchPermissions(); refetchStats(); },
  });
  
  const bulkImportCurrencies = trpc.financeSettings.bulkImportCurrencies.useMutation({
    onSuccess: (data) => { toast.success(`${t.importSuccess}: ${data.imported} items`); refetchCurrencies(); refetchStats(); },
  });
  const bulkImportCategories = trpc.financeSettings.bulkImportBudgetCategories.useMutation({
    onSuccess: (data) => { toast.success(`${t.importSuccess}: ${data.imported} items`); refetchCategories(); refetchStats(); },
  });
  
  // Export handler
  const handleExport = (type: string) => {
    let data: any[] = [];
    let filename = "";
    
    switch (type) {
      case "currencies":
        data = currencies;
        filename = "currencies.csv";
        break;
      case "fiscalYears":
        data = fiscalYears;
        filename = "fiscal_years.csv";
        break;
      case "thresholds":
        data = thresholds;
        filename = "approval_thresholds.csv";
        break;
      case "categories":
        data = categories;
        filename = "budget_categories.csv";
        break;
      case "roles":
        data = roles;
        filename = "finance_roles.csv";
        break;
    }
    
    if (data.length === 0) {
      toast.error(t.noData);
      return;
    }
    
    const headers = Object.keys(data[0]).filter(k => !k.includes("Id") && k !== "id" && !k.includes("At") && !k.includes("By") && k !== "isDeleted");
    const csv = [
      headers.join(","),
      ...data.map(row => headers.map(h => JSON.stringify(row[h] ?? "")).join(","))
    ].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t.exportSuccess);
  };
  
  // Import handler
  const handleImport = (type: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,.xlsx";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const text = await file.text();
      const lines = text.split("\n").filter((l: string) => l.trim());
      const headers = lines[0].split(",").map((h: string) => h.trim().replace(/"/g, ""));
      const items = lines.slice(1).map((line: string) => {
        const values = line.split(",").map((v: string) => v.trim().replace(/"/g, ""));
        const obj: any = {};
        headers.forEach((h: string, i: number) => { obj[h] = values[i]; });
        return obj;
      });
      
      if (type === "currencies") {
        bulkImportCurrencies.mutate({ organizationId, currencies: items });
      } else if (type === "categories") {
        bulkImportCategories.mutate({ organizationId, categories: items });
      }
    };
    input.click();
  };
  
  // Delete handlers
  const handleDelete = (type: string, id: number) => {
    if (!confirm(t.confirmDelete)) return;
    
    switch (type) {
      case "currency": deleteCurrency.mutate({ id }); break;
      case "fiscalYear": deleteFiscalYear.mutate({ id }); break;
      case "threshold": deleteThreshold.mutate({ id }); break;
      case "category": deleteCategory.mutate({ id }); break;
      case "role": deleteRole.mutate({ id }); break;
      case "permission": deletePermission.mutate({ id }); break;
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
              <p className="text-sm text-muted-foreground">{t.totalCurrencies}</p>
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
              <p className="text-sm text-muted-foreground">{t.totalFiscalYears}</p>
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
              <p className="text-sm text-muted-foreground">{t.totalThresholds}</p>
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
              <p className="text-sm text-muted-foreground">{t.totalCategories}</p>
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
              <p className="text-sm text-muted-foreground">{t.totalRoles}</p>
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
      code: currencyDialog.data?.code || "",
      name: currencyDialog.data?.name || "",
      nameAr: currencyDialog.data?.nameAr || "",
      symbol: currencyDialog.data?.symbol || "",
      exchangeRateToUSD: currencyDialog.data?.exchangeRateToUSD || "1.00",
      isBaseCurrency: currencyDialog.data?.isBaseCurrency || false,
      decimalPlaces: currencyDialog.data?.decimalPlaces || 2,
    });
    
    const handleSubmit = () => {
      if (currencyDialog.mode === "create") {
        createCurrency.mutate({ ...form, organizationId });
      } else {
        updateCurrency.mutate({ id: currencyDialog.data.id, ...form });
      }
    };
    
    return (
      <Dialog open={currencyDialog.open} onOpenChange={(open) => setCurrencyDialog({ ...currencyDialog, open })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{currencyDialog.mode === "create" ? t.newCurrency : t.edit}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t.currencyCode}</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="USD" />
              </div>
              <div>
                <Label>{t.currencySymbol}</Label>
                <Input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} placeholder="$" />
              </div>
            </div>
            <div>
              <Label>{t.currencyName}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="US Dollar" />
            </div>
            <div>
              <Label>{t.currencyNameAr}</Label>
              <Input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} placeholder="دولار أمريكي" dir="rtl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t.exchangeRateToUSD}</Label>
                <Input type="number" step="0.0001" value={form.exchangeRateToUSD} onChange={(e) => setForm({ ...form, exchangeRateToUSD: e.target.value })} />
              </div>
              <div>
                <Label>{t.decimalPlaces}</Label>
                <Input type="number" min="0" max="4" value={form.decimalPlaces} onChange={(e) => setForm({ ...form, decimalPlaces: parseInt(e.target.value) })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.isBaseCurrency} onCheckedChange={(checked) => setForm({ ...form, isBaseCurrency: !!checked })} />
              <Label>{t.isBaseCurrency}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCurrencyDialog({ open: false, mode: "create" })}>{t.cancel}</Button>
            <Button onClick={handleSubmit}>{currencyDialog.mode === "create" ? t.create : t.update}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  
  // Fiscal Year Form Dialog
  const FiscalYearFormDialog = () => {
    const [form, setForm] = useState({
      name: fiscalYearDialog.data?.name || "",
      nameAr: fiscalYearDialog.data?.nameAr || "",
      code: fiscalYearDialog.data?.code || "",
      startDate: fiscalYearDialog.data?.startDate ? new Date(fiscalYearDialog.data.startDate).toISOString().split("T")[0] : "",
      endDate: fiscalYearDialog.data?.endDate ? new Date(fiscalYearDialog.data.endDate).toISOString().split("T")[0] : "",
      status: fiscalYearDialog.data?.status || "planning",
      isCurrent: fiscalYearDialog.data?.isCurrent || false,
    });
    
    const handleSubmit = () => {
      if (fiscalYearDialog.mode === "create") {
        createFiscalYear.mutate({ ...form, organizationId });
      } else {
        updateFiscalYear.mutate({ id: fiscalYearDialog.data.id, ...form });
      }
    };
    
    return (
      <Dialog open={fiscalYearDialog.open} onOpenChange={(open) => setFiscalYearDialog({ ...fiscalYearDialog, open })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{fiscalYearDialog.mode === "create" ? t.newFiscalYear : t.edit}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t.fiscalYearCode}</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="FY2026" />
              </div>
              <div>
                <Label>{t.status}</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">{t.planning}</SelectItem>
                    <SelectItem value="active">{t.active}</SelectItem>
                    <SelectItem value="closed">{t.closed}</SelectItem>
                    <SelectItem value="archived">{t.archived}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{t.fiscalYearName}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Fiscal Year 2026" />
            </div>
            <div>
              <Label>{t.fiscalYearNameAr}</Label>
              <Input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} placeholder="السنة المالية 2026" dir="rtl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t.startDate}</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div>
                <Label>{t.endDate}</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.isCurrent} onCheckedChange={(checked) => setForm({ ...form, isCurrent: !!checked })} />
              <Label>{t.isCurrent}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFiscalYearDialog({ open: false, mode: "create" })}>{t.cancel}</Button>
            <Button onClick={handleSubmit}>{fiscalYearDialog.mode === "create" ? t.create : t.update}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  
  // Threshold Form Dialog
  const ThresholdFormDialog = () => {
    const [form, setForm] = useState({
      name: thresholdDialog.data?.name || "",
      nameAr: thresholdDialog.data?.nameAr || "",
      category: thresholdDialog.data?.category || "expense",
      minAmount: thresholdDialog.data?.minAmount || "0",
      maxAmount: thresholdDialog.data?.maxAmount || "",
      currency: thresholdDialog.data?.currency || "USD",
      approverRole: thresholdDialog.data?.approverRole || "",
      requiresMultipleApprovers: thresholdDialog.data?.requiresMultipleApprovers || false,
      minimumApprovers: thresholdDialog.data?.minimumApprovers || 1,
    });
    
    const handleSubmit = () => {
      if (thresholdDialog.mode === "create") {
        createThreshold.mutate({ ...form, organizationId });
      } else {
        updateThreshold.mutate({ id: thresholdDialog.data.id, ...form });
      }
    };
    
    return (
      <Dialog open={thresholdDialog.open} onOpenChange={(open) => setThresholdDialog({ ...thresholdDialog, open })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{thresholdDialog.mode === "create" ? t.newThreshold : t.edit}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t.thresholdName}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Level 1 Approval" />
            </div>
            <div>
              <Label>{t.thresholdNameAr}</Label>
              <Input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} placeholder="الموافقة المستوى 1" dir="rtl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t.category}</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">{t.expense}</SelectItem>
                    <SelectItem value="advance">{t.advance}</SelectItem>
                    <SelectItem value="budget">{t.budget}</SelectItem>
                    <SelectItem value="asset_disposal">{t.assetDisposal}</SelectItem>
                    <SelectItem value="procurement">{t.procurement}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t.currency}</Label>
                <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} placeholder="USD" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t.minAmount}</Label>
                <Input type="number" value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: e.target.value })} />
              </div>
              <div>
                <Label>{t.maxAmount}</Label>
                <Input type="number" value={form.maxAmount} onChange={(e) => setForm({ ...form, maxAmount: e.target.value })} placeholder="Unlimited" />
              </div>
            </div>
            <div>
              <Label>{t.approverRole}</Label>
              <Input value={form.approverRole} onChange={(e) => setForm({ ...form, approverRole: e.target.value })} placeholder="Finance Manager" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.requiresMultipleApprovers} onCheckedChange={(checked) => setForm({ ...form, requiresMultipleApprovers: !!checked })} />
              <Label>{t.requiresMultiple}</Label>
            </div>
            {form.requiresMultipleApprovers && (
              <div>
                <Label>{t.minimumApprovers}</Label>
                <Input type="number" min="2" value={form.minimumApprovers} onChange={(e) => setForm({ ...form, minimumApprovers: parseInt(e.target.value) })} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setThresholdDialog({ open: false, mode: "create" })}>{t.cancel}</Button>
            <Button onClick={handleSubmit}>{thresholdDialog.mode === "create" ? t.create : t.update}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  
  // Budget Category Form Dialog
  const CategoryFormDialog = () => {
    const [form, setForm] = useState({
      code: categoryDialog.data?.code || "",
      name: categoryDialog.data?.name || "",
      nameAr: categoryDialog.data?.nameAr || "",
      description: categoryDialog.data?.description || "",
      parentId: categoryDialog.data?.parentId || undefined,
      accountCode: categoryDialog.data?.accountCode || "",
      budgetType: categoryDialog.data?.budgetType || "operational",
      sortOrder: categoryDialog.data?.sortOrder || 0,
    });
    
    const handleSubmit = () => {
      if (categoryDialog.mode === "create") {
        createCategory.mutate({ ...form, organizationId });
      } else {
        updateCategory.mutate({ id: categoryDialog.data.id, ...form });
      }
    };
    
    return (
      <Dialog open={categoryDialog.open} onOpenChange={(open) => setCategoryDialog({ ...categoryDialog, open })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{categoryDialog.mode === "create" ? t.newCategory : t.edit}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t.categoryCode}</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="BC001" />
              </div>
              <div>
                <Label>{t.budgetType}</Label>
                <Select value={form.budgetType} onValueChange={(v) => setForm({ ...form, budgetType: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personnel">{t.personnel}</SelectItem>
                    <SelectItem value="operational">{t.operational}</SelectItem>
                    <SelectItem value="capital">{t.capital}</SelectItem>
                    <SelectItem value="indirect">{t.indirect}</SelectItem>
                    <SelectItem value="program">{t.program}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{t.categoryName}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Personnel Costs" />
            </div>
            <div>
              <Label>{t.categoryNameAr}</Label>
              <Input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} placeholder="تكاليف الموظفين" dir="rtl" />
            </div>
            <div>
              <Label>{t.description}</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t.accountCode}</Label>
                <Input value={form.accountCode} onChange={(e) => setForm({ ...form, accountCode: e.target.value })} placeholder="5000" />
              </div>
              <div>
                <Label>{t.sortOrder}</Label>
                <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialog({ open: false, mode: "create" })}>{t.cancel}</Button>
            <Button onClick={handleSubmit}>{categoryDialog.mode === "create" ? t.create : t.update}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  
  // Role Form Dialog
  const RoleFormDialog = () => {
    const [form, setForm] = useState({
      code: roleDialog.data?.code || "",
      name: roleDialog.data?.name || "",
      nameAr: roleDialog.data?.nameAr || "",
      description: roleDialog.data?.description || "",
      level: roleDialog.data?.level || 1,
    });
    
    const handleSubmit = () => {
      if (roleDialog.mode === "create") {
        createRole.mutate({ ...form, organizationId });
      } else {
        updateRole.mutate({ id: roleDialog.data.id, ...form });
      }
    };
    
    return (
      <Dialog open={roleDialog.open} onOpenChange={(open) => setRoleDialog({ ...roleDialog, open })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{roleDialog.mode === "create" ? t.newRole : t.edit}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t.roleCode}</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="FIN_MGR" />
              </div>
              <div>
                <Label>{t.roleLevel}</Label>
                <Input type="number" min="1" max="10" value={form.level} onChange={(e) => setForm({ ...form, level: parseInt(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>{t.roleName}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Finance Manager" />
            </div>
            <div>
              <Label>{t.roleNameAr}</Label>
              <Input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} placeholder="مدير مالي" dir="rtl" />
            </div>
            <div>
              <Label>{t.roleDescription}</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Role description..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialog({ open: false, mode: "create" })}>{t.cancel}</Button>
            <Button onClick={handleSubmit}>{roleDialog.mode === "create" ? t.create : t.update}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  
  // Permission Form Dialog
  const PermissionFormDialog = () => {
    const [form, setForm] = useState({
      code: "",
      name: "",
      nameAr: "",
      description: "",
      module: "budgets",
      action: "view" as "view" | "create" | "edit" | "delete" | "approve" | "export" | "import",
    });
    
    const handleSubmit = () => {
      createPermission.mutate({ ...form, organizationId });
    };
    
    return (
      <Dialog open={permissionDialog.open} onOpenChange={(open) => setPermissionDialog({ ...permissionDialog, open })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.newPermission}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t.permissionCode}</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="BUDGET_VIEW" />
              </div>
              <div>
                <Label>{t.action}</Label>
                <Select value={form.action} onValueChange={(v) => setForm({ ...form, action: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">{t.view}</SelectItem>
                    <SelectItem value="create">{t.createAction}</SelectItem>
                    <SelectItem value="edit">{t.editAction}</SelectItem>
                    <SelectItem value="delete">{t.deleteAction}</SelectItem>
                    <SelectItem value="approve">{t.approve}</SelectItem>
                    <SelectItem value="export">{t.exportAction}</SelectItem>
                    <SelectItem value="import">{t.importAction}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{t.module}</Label>
              <Input value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value })} placeholder="budgets" />
            </div>
            <div>
              <Label>{t.permissionName}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="View Budgets" />
            </div>
            <div>
              <Label>{t.permissionNameAr}</Label>
              <Input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} placeholder="عرض الميزانيات" dir="rtl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermissionDialog({ open: false, mode: "create" })}>{t.cancel}</Button>
            <Button onClick={handleSubmit}>{t.create}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };
  
  return (
    <div className={`min-h-screen bg-background ${isRTL ? "rtl" : "ltr"}`} dir={isRTL ? "rtl" : "ltr"}>
      <div className="container py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link href="/organization/finance">
                <Button variant="ghost" size="sm">
                  {isRTL ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                  {t.backToFinance}
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="h-8 w-8 text-primary" />
              {t.title}
            </h1>
            <p className="text-muted-foreground mt-1">{t.subtitle}</p>
          </div>
        </div>
        
        {/* Statistics */}
        {renderStatistics()}
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="currencies" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {t.currencies}
            </TabsTrigger>
            <TabsTrigger value="fiscalYears" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t.fiscalYears}
            </TabsTrigger>
            <TabsTrigger value="thresholds" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              {t.approvalThresholds}
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <FolderTree className="h-4 w-4" />
              {t.budgetCategories}
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              {t.rolesPermissions}
            </TabsTrigger>
          </TabsList>
          
          {/* Currencies Tab */}
          <TabsContent value="currencies">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t.currencies}</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9 w-64"
                      placeholder={t.search}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleExport("currencies")}>
                    <Download className="h-4 w-4 mr-1" />
                    {t.export}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleImport("currencies")}>
                    <Upload className="h-4 w-4 mr-1" />
                    {t.import}
                  </Button>
                  <Button size="sm" onClick={() => setCurrencyDialog({ open: true, mode: "create" })}>
                    <Plus className="h-4 w-4 mr-1" />
                    {t.newCurrency}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.currencyCode}</TableHead>
                      <TableHead>{t.currencyName}</TableHead>
                      <TableHead>{t.currencySymbol}</TableHead>
                      <TableHead>{t.exchangeRateToUSD}</TableHead>
                      <TableHead>{t.isBaseCurrency}</TableHead>
                      <TableHead>{t.status}</TableHead>
                      <TableHead className="text-right">{t.action}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currencies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          {t.noData}
                        </TableCell>
                      </TableRow>
                    ) : (
                      currencies.map((currency: any) => (
                        <TableRow key={currency.id}>
                          <TableCell className="font-mono font-bold">{currency.code}</TableCell>
                          <TableCell>{language === "ar" && currency.nameAr ? currency.nameAr : currency.name}</TableCell>
                          <TableCell>{currency.symbol}</TableCell>
                          <TableCell>{currency.exchangeRateToUSD}</TableCell>
                          <TableCell>
                            {currency.isBaseCurrency && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                          </TableCell>
                          <TableCell>
                            <Badge variant={currency.isActive ? "default" : "secondary"}>
                              {currency.isActive ? t.active : t.archived}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => setCurrencyDialog({ open: true, mode: "edit", data: currency })}>
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
                <CardTitle>{t.fiscalYears}</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleExport("fiscalYears")}>
                    <Download className="h-4 w-4 mr-1" />
                    {t.export}
                  </Button>
                  <Button size="sm" onClick={() => setFiscalYearDialog({ open: true, mode: "create" })}>
                    <Plus className="h-4 w-4 mr-1" />
                    {t.newFiscalYear}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.fiscalYearCode}</TableHead>
                      <TableHead>{t.fiscalYearName}</TableHead>
                      <TableHead>{t.startDate}</TableHead>
                      <TableHead>{t.endDate}</TableHead>
                      <TableHead>{t.status}</TableHead>
                      <TableHead>{t.isCurrent}</TableHead>
                      <TableHead className="text-right">{t.action}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fiscalYears.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          {t.noData}
                        </TableCell>
                      </TableRow>
                    ) : (
                      fiscalYears.map((fy: any) => (
                        <TableRow key={fy.id}>
                          <TableCell className="font-mono font-bold">{fy.code}</TableCell>
                          <TableCell>{language === "ar" && fy.nameAr ? fy.nameAr : fy.name}</TableCell>
                          <TableCell>{new Date(fy.startDate).toLocaleDateString()}</TableCell>
                          <TableCell>{new Date(fy.endDate).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant={fy.status === "active" ? "default" : "secondary"}>
                              {t[fy.status as keyof typeof t] || fy.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {fy.isCurrent && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => setFiscalYearDialog({ open: true, mode: "edit", data: fy })}>
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
                <CardTitle>{t.approvalThresholds}</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleExport("thresholds")}>
                    <Download className="h-4 w-4 mr-1" />
                    {t.export}
                  </Button>
                  <Button size="sm" onClick={() => setThresholdDialog({ open: true, mode: "create" })}>
                    <Plus className="h-4 w-4 mr-1" />
                    {t.newThreshold}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.thresholdName}</TableHead>
                      <TableHead>{t.category}</TableHead>
                      <TableHead>{t.minAmount}</TableHead>
                      <TableHead>{t.maxAmount}</TableHead>
                      <TableHead>{t.approverRole}</TableHead>
                      <TableHead>{t.requiresMultiple}</TableHead>
                      <TableHead className="text-right">{t.action}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {thresholds.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          {t.noData}
                        </TableCell>
                      </TableRow>
                    ) : (
                      thresholds.map((threshold: any) => (
                        <TableRow key={threshold.id}>
                          <TableCell>{language === "ar" && threshold.nameAr ? threshold.nameAr : threshold.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {t[threshold.category as keyof typeof t] || threshold.category}
                            </Badge>
                          </TableCell>
                          <TableCell>${parseFloat(threshold.minAmount).toLocaleString()}</TableCell>
                          <TableCell>{threshold.maxAmount ? `$${parseFloat(threshold.maxAmount).toLocaleString()}` : "∞"}</TableCell>
                          <TableCell>{threshold.approverRole || "-"}</TableCell>
                          <TableCell>
                            {threshold.requiresMultipleApprovers ? (
                              <Badge variant="default">{threshold.minimumApprovers}+</Badge>
                            ) : (
                              <Badge variant="secondary">{t.no}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => setThresholdDialog({ open: true, mode: "edit", data: threshold })}>
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
                <CardTitle>{t.budgetCategories}</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9 w-64"
                      placeholder={t.search}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleExport("categories")}>
                    <Download className="h-4 w-4 mr-1" />
                    {t.export}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleImport("categories")}>
                    <Upload className="h-4 w-4 mr-1" />
                    {t.import}
                  </Button>
                  <Button size="sm" onClick={() => setCategoryDialog({ open: true, mode: "create" })}>
                    <Plus className="h-4 w-4 mr-1" />
                    {t.newCategory}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.categoryCode}</TableHead>
                      <TableHead>{t.categoryName}</TableHead>
                      <TableHead>{t.budgetType}</TableHead>
                      <TableHead>{t.accountCode}</TableHead>
                      <TableHead>{t.status}</TableHead>
                      <TableHead className="text-right">{t.action}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          {t.noData}
                        </TableCell>
                      </TableRow>
                    ) : (
                      categories.map((category: any) => (
                        <TableRow key={category.id}>
                          <TableCell className="font-mono font-bold">{category.code}</TableCell>
                          <TableCell>{language === "ar" && category.nameAr ? category.nameAr : category.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {t[category.budgetType as keyof typeof t] || category.budgetType}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">{category.accountCode || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={category.isActive ? "default" : "secondary"}>
                              {category.isActive ? t.active : t.archived}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => setCategoryDialog({ open: true, mode: "edit", data: category })}>
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
                    {t.totalRoles}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleExport("roles")}>
                      <Download className="h-4 w-4 mr-1" />
                      {t.export}
                    </Button>
                    <Button size="sm" onClick={() => setRoleDialog({ open: true, mode: "create" })}>
                      <Plus className="h-4 w-4 mr-1" />
                      {t.newRole}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.roleCode}</TableHead>
                        <TableHead>{t.roleName}</TableHead>
                        <TableHead>{t.roleLevel}</TableHead>
                        <TableHead className="text-right">{t.action}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roles.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            {t.noData}
                          </TableCell>
                        </TableRow>
                      ) : (
                        roles.map((role: any) => (
                          <TableRow key={role.id}>
                            <TableCell className="font-mono font-bold">{role.code}</TableCell>
                            <TableCell>{language === "ar" && role.nameAr ? role.nameAr : role.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{role.level}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => setRoleDialog({ open: true, mode: "edit", data: role })}>
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
                    {t.totalPermissions}
                  </CardTitle>
                  <Button size="sm" onClick={() => setPermissionDialog({ open: true, mode: "create" })}>
                    <Plus className="h-4 w-4 mr-1" />
                    {t.newPermission}
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.permissionCode}</TableHead>
                        <TableHead>{t.module}</TableHead>
                        <TableHead>{t.action}</TableHead>
                        <TableHead className="text-right">{t.delete}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {permissions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            {t.noData}
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
                            <TableCell className="text-right">
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
