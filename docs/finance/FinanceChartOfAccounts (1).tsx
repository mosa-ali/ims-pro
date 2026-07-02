// ============================================================================
// FINANCE MODULE — Chart of Accounts
// Phase 2.1.A Financial Configuration Domain
// 
// Uses existing translation system via useTranslation() hook
// Supports existing multi-language system (EN/AR/IT)
// 
// Uses existing tRPC routers:
// - trpc.finance.accounts.*
// - trpc.finance.categories.*
// ============================================================================

import { useState } from "react";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { useTranslation } from "@/i18n/useTranslation";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useOperatingUnit } from "@/contexts/OperatingUnitContext";
import { trpc } from "@/lib/trpc";
import { FinancePageHeader } from "@/components/Finance/FinancePageHeader";
import { FinanceFilterBar, type FilterDropdown } from "@/components/Finance/FinanceFilterBar";
import { ExecutiveTable } from "@/components/Finance/ExecutiveTable";
import { FinanceCard } from "@/components/Finance/FinanceCard";
import { WidgetHeader } from "@/components/Finance/WidgetHeader";
import { LoadingSkeleton } from "@/components/Finance/LoadingSkeleton";
import { StatusChip } from "@/components/Finance/StatusChip";
import { FINANCE_COLORS, SPACING, TYPE, ELEVATION, RADIUS } from "@/components/Finance/tokens";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Download,
  Upload,
  Search,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface GLCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  accountType: "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";
  normalBalance: "Debit" | "Credit";
  isActive: boolean;
  parentId: string | null;
  level: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface GLAccount {
  id: string;
  code: string;
  name: string;
  description: string | null;
  accountType: "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";
  normalBalance: "Debit" | "Credit";
  categoryId: string | null;
  isActive: boolean;
  isPostable: boolean;
  isBankAccount: boolean;
  isCashAccount: boolean;
  currentBalance: number | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function FinanceChartOfAccounts() {
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  const { currentOrganization } = useOrganization();
  const { currentOperatingUnit } = useOperatingUnit();

  // Scope
  const organizationId = currentOrganization?.id || "";
  const operatingUnitId = currentOperatingUnit?.id || "";

  // State
  const [activeTab, setActiveTab] = useState<"categories" | "accounts">("categories");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [editingCategory, setEditingCategory] = useState<GLCategory | null>(null);
  const [editingAccount, setEditingAccount] = useState<GLAccount | null>(null);

  // tRPC Queries
  const { data: categories = [], isLoading: categoriesLoading } = trpc.finance.categories.list.useQuery(
    { organizationId, operatingUnitId, filter: { type: selectedType !== "all" ? selectedType : undefined } },
    { enabled: !!organizationId }
  );

  const { data: accounts = [], isLoading: accountsLoading } = trpc.finance.accounts.list.useQuery(
    { organizationId, operatingUnitId, search: searchTerm },
    { enabled: !!organizationId }
  );

  // tRPC Mutations
  const createCategoryMutation = trpc.finance.categories.create.useMutation();
  const updateCategoryMutation = trpc.finance.categories.update.useMutation();
  const deleteCategoryMutation = trpc.finance.categories.delete.useMutation();

  const createAccountMutation = trpc.finance.accounts.create.useMutation();
  const updateAccountMutation = trpc.finance.accounts.update.useMutation();
  const deleteAccountMutation = trpc.finance.accounts.delete.useMutation();

  // Handlers
  const handleAddCategory = async (formData: Partial<GLCategory>) => {
    try {
      await createCategoryMutation.mutateAsync({
        organizationId,
        operatingUnitId,
        ...formData,
      });
      toast.success(t.financeChartOfAccounts.categoryCreated);
      setShowAddCategory(false);
    } catch (error) {
      toast.error(t.common.errorOccurred);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategoryMutation.mutateAsync({
        organizationId,
        operatingUnitId,
        id,
      });
      toast.success(t.financeChartOfAccounts.categoryDeleted);
    } catch (error) {
      toast.error(t.common.errorOccurred);
    }
  };

  const handleAddAccount = async (formData: Partial<GLAccount>) => {
    try {
      await createAccountMutation.mutateAsync({
        organizationId,
        operatingUnitId,
        ...formData,
      });
      toast.success(t.financeChartOfAccounts.accountCreated);
      setShowAddAccount(false);
    } catch (error) {
      toast.error(t.common.errorOccurred);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      await deleteAccountMutation.mutateAsync({
        organizationId,
        operatingUnitId,
        id,
      });
      toast.success(t.financeChartOfAccounts.accountDeleted);
    } catch (error) {
      toast.error(t.common.errorOccurred);
    }
  };

  const handleExport = () => {
    const data = activeTab === "categories" ? categories : accounts;
    const csv = [
      ["Code", "Name", "Type", "Balance", "Active"],
      ...data.map((item) => [
        item.code,
        item.name,
        item.accountType,
        "normalBalance" in item ? item.normalBalance : "",
        item.isActive ? "Yes" : "No",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chart-of-accounts-${activeTab}.csv`;
    a.click();
  };

  // Filter dropdowns
  const typeFilter: FilterDropdown = {
    id: "type",
    label: t.financeChartOfAccounts.type,
    options: [
      { value: "all", label: t.common.all },
      { value: "Asset", label: t.financeChartOfAccounts.asset },
      { value: "Liability", label: t.financeChartOfAccounts.liability },
      { value: "Equity", label: t.financeChartOfAccounts.equity },
      { value: "Revenue", label: t.financeChartOfAccounts.revenue },
      { value: "Expense", label: t.financeChartOfAccounts.expense },
    ],
    value: selectedType,
    onChange: setSelectedType,
  };

  return (
    <div className={`min-h-screen ${SPACING.pageX} space-y-6`} dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <FinancePageHeader
        icon={BookOpen}
        title={t.financeChartOfAccounts.title}
        subtitle={t.financeChartOfAccounts.subtitle}
        onRefresh={() => {}}
        onExport={handleExport}
      />

      {/* Filter Bar */}
      <FinanceFilterBar
        dropdowns={[typeFilter]}
        showSearch
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={t.common.searchPlaceholder}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "categories" | "accounts")}>
        <TabsList>
          <TabsTrigger value="categories">
            {t.financeChartOfAccounts.categories}
          </TabsTrigger>
          <TabsTrigger value="accounts">
            {t.financeChartOfAccounts.accounts}
          </TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className={TYPE.sectionTitle}>{t.financeChartOfAccounts.categories}</h2>
            <Button
              onClick={() => setShowAddCategory(true)}
              className="gap-2"
              style={{ background: FINANCE_COLORS.navy }}
            >
              <Plus className="h-4 w-4" />
              {t.financeChartOfAccounts.addCategory}
            </Button>
          </div>

          {categoriesLoading ? (
            <LoadingSkeleton />
          ) : categories.length === 0 ? (
            <FinanceCard className="py-12 text-center">
              <p className={TYPE.widgetSubtitle}>{t.financeChartOfAccounts.noCategories}</p>
            </FinanceCard>
          ) : (
            <FinanceCard>
              <ExecutiveTable
                columns={[
                  { key: "code", label: t.financeChartOfAccounts.code, width: "120px" },
                  { key: "name", label: t.financeChartOfAccounts.name, width: "200px" },
                  { key: "accountType", label: t.financeChartOfAccounts.type, width: "100px" },
                  {
                    key: "isActive",
                    label: t.financeChartOfAccounts.status,
                    width: "100px",
                    render: (value) => (
                      <StatusChip status={value ? "Active" : "Inactive"} />
                    ),
                  },
                  {
                    key: "actions",
                    label: t.common.actions,
                    width: "100px",
                    render: (_, row: GLCategory) => (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingCategory(row)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(row.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ),
                  },
                ]}
                data={categories}
                onExport={handleExport}
              />
            </FinanceCard>
          )}
        </TabsContent>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className={TYPE.sectionTitle}>{t.financeChartOfAccounts.accounts}</h2>
            <Button
              onClick={() => setShowAddAccount(true)}
              className="gap-2"
              style={{ background: FINANCE_COLORS.navy }}
            >
              <Plus className="h-4 w-4" />
              {t.financeChartOfAccounts.addAccount}
            </Button>
          </div>

          {accountsLoading ? (
            <LoadingSkeleton />
          ) : accounts.length === 0 ? (
            <FinanceCard className="py-12 text-center">
              <p className={TYPE.widgetSubtitle}>{t.financeChartOfAccounts.noAccounts}</p>
            </FinanceCard>
          ) : (
            <FinanceCard>
              <ExecutiveTable
                columns={[
                  { key: "code", label: t.financeChartOfAccounts.code, width: "120px" },
                  { key: "name", label: t.financeChartOfAccounts.name, width: "200px" },
                  { key: "accountType", label: t.financeChartOfAccounts.type, width: "100px" },
                  {
                    key: "isActive",
                    label: t.financeChartOfAccounts.status,
                    width: "100px",
                    render: (value) => (
                      <StatusChip status={value ? "Active" : "Inactive"} />
                    ),
                  },
                  {
                    key: "actions",
                    label: t.common.actions,
                    width: "100px",
                    render: (_, row: GLAccount) => (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingAccount(row)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(row.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ),
                  },
                ]}
                data={accounts}
                onExport={handleExport}
              />
            </FinanceCard>
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Category Dialog */}
      <AddCategoryDialog
        open={showAddCategory || !!editingCategory}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddCategory(false);
            setEditingCategory(null);
          }
        }}
        data={editingCategory}
        onSubmit={editingCategory ? undefined : handleAddCategory}
        accountTypes={["Asset", "Liability", "Equity", "Revenue", "Expense"]}
      />

      {/* Add/Edit Account Dialog */}
      <AddAccountDialog
        open={showAddAccount || !!editingAccount}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddAccount(false);
            setEditingAccount(null);
          }
        }}
        data={editingAccount}
        onSubmit={editingAccount ? undefined : handleAddAccount}
        accountTypes={["Asset", "Liability", "Equity", "Revenue", "Expense"]}
        categories={categories}
      />
    </div>
  );
}

// ============================================================================
// ADD CATEGORY DIALOG
// ============================================================================

interface AddCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data?: GLCategory | null;
  onSubmit?: (data: Partial<GLCategory>) => Promise<void>;
  accountTypes: string[];
}

function AddCategoryDialog({
  open,
  onOpenChange,
  data,
  onSubmit,
  accountTypes,
}: AddCategoryDialogProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Partial<GLCategory>>(
    data || { accountType: "Asset", normalBalance: "Debit", isActive: true }
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.code || !formData.name) {
      toast.error(t.common.required);
      return;
    }
    setIsLoading(true);
    try {
      await onSubmit?.(formData);
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {data ? t.financeChartOfAccounts.editCategory : t.financeChartOfAccounts.addCategory}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>{t.financeChartOfAccounts.code}</Label>
            <Input
              value={formData.code || ""}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="1000"
            />
          </div>

          <div>
            <Label>{t.financeChartOfAccounts.name}</Label>
            <Input
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t.financeChartOfAccounts.asset}
            />
          </div>

          <div>
            <Label>{t.financeChartOfAccounts.type}</Label>
            <Select value={formData.accountType || "Asset"} onValueChange={(v) => setFormData({ ...formData, accountType: v as any })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accountTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            style={{ background: FINANCE_COLORS.navy }}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// ADD ACCOUNT DIALOG
// ============================================================================

interface AddAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data?: GLAccount | null;
  onSubmit?: (data: Partial<GLAccount>) => Promise<void>;
  accountTypes: string[];
  categories: GLCategory[];
}

function AddAccountDialog({
  open,
  onOpenChange,
  data,
  onSubmit,
  accountTypes,
  categories,
}: AddAccountDialogProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Partial<GLAccount>>(
    data || { accountType: "Asset", normalBalance: "Debit", isActive: true, isPostable: true }
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.code || !formData.name) {
      toast.error(t.common.required);
      return;
    }
    setIsLoading(true);
    try {
      await onSubmit?.(formData);
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {data ? t.financeChartOfAccounts.editAccount : t.financeChartOfAccounts.addAccount}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>{t.financeChartOfAccounts.code}</Label>
            <Input
              value={formData.code || ""}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="1001"
            />
          </div>

          <div>
            <Label>{t.financeChartOfAccounts.name}</Label>
            <Input
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Cash"
            />
          </div>

          <div>
            <Label>{t.financeChartOfAccounts.type}</Label>
            <Select value={formData.accountType || "Asset"} onValueChange={(v) => setFormData({ ...formData, accountType: v as any })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accountTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isPostable || false}
              onChange={(e) => setFormData({ ...formData, isPostable: e.target.checked })}
            />
            <span className="text-sm">{t.financeChartOfAccounts.postable}</span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            style={{ background: FINANCE_COLORS.navy }}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
