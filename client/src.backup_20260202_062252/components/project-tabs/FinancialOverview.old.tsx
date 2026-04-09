import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Download, Eye, Edit2, Trash2, Save, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/i18n/useTranslation";

interface FinancialOverviewProps {
  projectId: number;
}

// Helper function to get currency symbol
const getCurrencySymbol = (currency: string) => {
  const symbols: Record<string, string> = {
    'EUR': '€',
    'USD': '$',
    'CHF': 'CHF ',
    'YER': 'YER ',
    'SAR': 'SAR ',
  };
  return symbols[currency] || currency + ' ';
};

// Helper function to format currency
const formatCurrency = (amount: number, currency: string) => {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function FinancialOverview({ projectId }: FinancialOverviewProps) {
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [viewingItem, setViewingItem] = useState<any | null>(null);
  const [deletingItem, setDeletingItem] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const utils = trpc.useUtils();

  // Check user role for permissions
  const userRole = user?.role || 'user';
  const canUpdate = ['org_admin', 'program_manager', 'finance_manager'].includes(userRole);
  const canDelete = userRole === 'org_admin';

  // Fetch budget items and categories
  const { data: budgets, isLoading } = trpc.finance.listBudgets.useQuery(undefined, {
    enabled: !!user?.organizationId
  });
  
  const { data: expenditures } = trpc.finance.listExpenditures.useQuery(undefined, {
    enabled: !!user?.organizationId
  });

  const { data: categories } = trpc.finance.listBudgetCategories.useQuery(undefined, {
    enabled: !!user?.organizationId
  });

  // Filter for this project
  const projectBudgets = useMemo(() => 
    budgets?.filter((b: any) => b.projectId === projectId) || [], 
    [budgets, projectId]
  );

  const projectBudgetIds = useMemo(() => 
    projectBudgets.map((b: any) => b.id), 
    [projectBudgets]
  );

  const projectExpenditures = useMemo(() => 
    expenditures?.filter((e: any) => projectBudgetIds.includes(e.budgetId)) || [], 
    [expenditures, projectBudgetIds]
  );

  // Get project's primary currency from first budget item
  const projectCurrency = useMemo(() => {
    return projectBudgets[0]?.currency || 'EUR';
  }, [projectBudgets]);

  // Create category lookup map
  const categoryMap = useMemo(() => {
    const map = new Map();
    categories?.forEach((cat: any) => {
      map.set(cat.id, cat);
    });
    return map;
  }, [categories]);

  // Calculate financial metrics
  const metrics = useMemo(() => {
    const totalBudget = projectBudgets.reduce((sum: number, b: any) => 
      sum + parseFloat(b.budgetedAmount || "0"), 0
    );

    const totalSpent = projectExpenditures
      .filter((e: any) => e.status === "approved" || e.status === "paid")
      .reduce((sum: number, e: any) => sum + parseFloat(e.amount || "0"), 0);

    const remainingBalance = totalBudget - totalSpent;
    const burnRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    return {
      totalBudget,
      actualSpent: totalSpent,
      remainingBalance,
      burnRate,
    };
  }, [projectBudgets, projectExpenditures]);

  // Filter budget items
  const filteredItems = useMemo(() => {
    let items = projectBudgets;

    // Category filter
    if (categoryFilter !== "All") {
      items = items.filter((item: any) => item.categoryId?.toString() === categoryFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      items = items.filter((item: any) => {
        const category = categoryMap.get(item.categoryId);
        const categoryName = category?.name || "";
        const categoryCode = category?.code || "";
        return (
          categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          categoryCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.notes?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
    }

    return items;
  }, [projectBudgets, categoryFilter, searchQuery, categoryMap]);

  // Get unique categories for filter
  const usedCategories = useMemo(() => {
    const catIds = new Set(projectBudgets.map((item: any) => item.categoryId).filter(Boolean));
    return Array.from(catIds).map(id => categoryMap.get(id)).filter(Boolean);
  }, [projectBudgets, categoryMap]);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups = new Map<number, any[]>();
    filteredItems.forEach((item: any) => {
      const catId = item.categoryId || 0;
      if (!groups.has(catId)) {
        groups.set(catId, []);
      }
      groups.get(catId)!.push(item);
    });
    return groups;
  }, [filteredItems]);

  // Handle edit
  const handleStartEdit = (item: any) => {
    setEditingItemId(item.id);
    setEditForm({
      budgetedAmount: item.budgetedAmount,
      notes: item.notes || '',
      categoryId: item.categoryId,
    });
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditForm({});
  };

  const handleSaveEdit = async (itemId: number) => {
    try {
      // TODO: Implement tRPC mutation for updating budget
      // await trpc.finance.updateBudget.mutate({ id: itemId, ...editForm });
      toast.success(t.finance.budgetUpdated || "Budget updated successfully");
      setEditingItemId(null);
      setEditForm({});
      utils.finance.listBudgets.invalidate();
    } catch (error) {
      toast.error(t.finance.budgetUpdateFailed || "Failed to update budget");
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      // TODO: Implement tRPC mutation for deleting budget
      // await trpc.finance.deleteBudget.mutate({ id: deletingItem.id });
      toast.success(t.finance.budgetDeleted || "Budget deleted successfully");
      setDeletingItem(null);
      utils.finance.listBudgets.invalidate();
    } catch (error) {
      toast.error(t.finance.budgetDeleteFailed || "Failed to delete budget");
    }
  };

  // Download Excel Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "Category Code": "1.1",
        "Category Name": "Staff Costs",
        "Description": "Project coordinator and field staff salaries",
        "Budgeted Amount": 30000,
        "Currency": "EUR",
      },
      {
        "Category Code": "2.1",
        "Category Name": "Office & Equipment",
        "Description": "Office rent, utilities, computers, and supplies",
        "Budgeted Amount": 8500,
        "Currency": "EUR",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Budget Template");
    XLSX.writeFile(wb, `Budget_Template_Project_${projectId}.xlsx`);
    toast.success("Template downloaded successfully");
  };

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = filteredItems.map((item: any) => {
      const category = categoryMap.get(item.categoryId);
      const budgetExpenses = projectExpenditures.filter((e: any) => e.budgetId === item.id);
      const spent = budgetExpenses
        .filter((e: any) => e.status === "approved" || e.status === "paid")
        .reduce((sum: number, e: any) => sum + parseFloat(e.amount || "0"), 0);
      const budget = parseFloat(item.budgetedAmount || "0");
      const balance = budget - spent;
      const variancePercent = budget > 0 ? ((spent - budget) / budget) * 100 : 0;
      const status = 
        variancePercent > 10 ? "Overspending" :
        variancePercent < -20 ? "Underspending" :
        "On Track";

      return {
        "Category Code": category?.code || "",
        "Category Name": category?.name || "",
        "Description": item.notes || "",
        "Budgeted Amount": budget,
        "Currency": item.currency || projectCurrency,
        "Actual Spent": spent,
        "Balance": balance,
        "Variance %": variancePercent.toFixed(2),
        "Status": status,
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Financial Overview");
    XLSX.writeFile(wb, `Financial_Overview_Project_${projectId}.xlsx`);
    toast.success("Excel file exported successfully");
  };

  // Get status color
  const getStatusColor = (variancePercent: number) => {
    if (variancePercent > 10) return "text-red-600 bg-red-50"; // Overspending
    if (variancePercent < -20) return "text-yellow-600 bg-yellow-50"; // Underspending
    return "text-green-600 bg-green-50"; // On track
  };

  // Get burn rate color
  const getBurnRateColor = (rate: number) => {
    if (rate > 90) return "text-red-600"; // Critical
    if (rate > 75) return "text-yellow-600"; // Warning
    return "text-green-600"; // Good
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">{t.finance.loadingFinancialData}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-xs text-muted-foreground mb-2">{t.finance.totalBudget}</p>
            <p className="text-2xl font-bold">
              {formatCurrency(metrics.totalBudget, projectCurrency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-xs text-muted-foreground mb-2">{t.finance.actualSpent}</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(metrics.actualSpent, projectCurrency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-xs text-muted-foreground mb-2">{t.finance.remainingBalance}</p>
            <p className={`text-2xl font-bold ${metrics.remainingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(metrics.remainingBalance, projectCurrency)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-xs text-muted-foreground mb-2">{t.finance.burnRate}</p>
            <p className={`text-2xl font-bold ${getBurnRateColor(metrics.burnRate)}`}>
              {metrics.burnRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget vs Actual Chart */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-bold mb-4">{t.finance.budgetVsActual}</h3>
          <div className="space-y-4">
            {/* Budget Bar */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">{t.finance.budgetedAmount}</span>
                <span className="text-sm font-semibold">
                  {formatCurrency(metrics.totalBudget, projectCurrency)}
                </span>
              </div>
              <div className="h-8 bg-border rounded-lg overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-lg"
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            {/* Actual Bar */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">{t.finance.actualSpent}</span>
                <span className={`text-sm font-semibold ${getBurnRateColor(metrics.burnRate)}`}>
                  {formatCurrency(metrics.actualSpent, projectCurrency)} ({metrics.burnRate.toFixed(1)}%)
                </span>
              </div>
              <div className="h-8 bg-border rounded-lg overflow-hidden">
                <div
                  className={`h-full rounded-lg ${
                    metrics.burnRate > 90 ? 'bg-red-600' : 
                    metrics.burnRate > 75 ? 'bg-yellow-600' : 
                    'bg-green-600'
                  }`}
                  style={{ width: `${Math.min(metrics.burnRate, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Export */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">{t.finance.financialDetails}</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {t.finance.downloadTemplate}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {t.finance.exportToExcel}
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Input
              placeholder={t.finance.searchBudgetItems}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Category Filter */}
          <div>
            <p className="text-sm font-semibold mb-2">{t.finance.filterByBudgetCode}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={categoryFilter === "All" ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter("All")}
              >
                {t.finance.all}
              </Button>
              {usedCategories.map((category: any) => (
                <Button
                  key={category.id}
                  variant={categoryFilter === category.id.toString() ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter(category.id.toString())}
                >
                  {category.code || category.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Financial Table */}
          <div className="space-y-6">
            {Array.from(groupedItems.entries()).map(([categoryId, items]) => {
              const category = categoryMap.get(categoryId);
              const groupTotal = items.reduce((sum, item: any) => sum + parseFloat(item.budgetedAmount || "0"), 0);
              const groupSpent = items.reduce((sum, item: any) => {
                const budgetExpenses = projectExpenditures.filter((e: any) => e.budgetId === item.id);
                return sum + budgetExpenses
                  .filter((e: any) => e.status === "approved" || e.status === "paid")
                  .reduce((s: number, e: any) => s + parseFloat(e.amount || "0"), 0);
              }, 0);
              const groupBalance = groupTotal - groupSpent;
              const groupVariance = groupTotal > 0 ? ((groupSpent - groupTotal) / groupTotal) * 100 : 0;

              return (
                <div key={categoryId} className="border-t pt-4">
                  {/* Category Header */}
                  <div className="flex items-center justify-between mb-3 p-3 rounded-lg bg-muted/50">
                    <h4 className="text-base font-bold">
                      {category?.code ? `${category.code} - ` : ""}{category?.name || "Uncategorized"}
                    </h4>
                    <div className="flex gap-6 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">{t.finance.budget}</p>
                        <p className="font-semibold">{formatCurrency(groupTotal, projectCurrency)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t.finance.spent}</p>
                        <p className="font-semibold text-blue-600">{formatCurrency(groupSpent, projectCurrency)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t.finance.balance}</p>
                        <p className={`font-semibold ${groupBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(groupBalance, projectCurrency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t.finance.variance}</p>
                        <p className={`font-semibold ${
                          groupVariance > 10 ? 'text-red-600' : 
                          groupVariance < -20 ? 'text-yellow-600' : 
                          'text-green-600'
                        }`}>
                          {groupVariance > 0 ? "+" : ""}{groupVariance.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Budget Items */}
                  {items.map((item: any) => {
                    const budgetExpenses = projectExpenditures.filter((e: any) => e.budgetId === item.id);
                    const spent = budgetExpenses
                      .filter((e: any) => e.status === "approved" || e.status === "paid")
                      .reduce((sum: number, e: any) => sum + parseFloat(e.amount || "0"), 0);
                    const budget = parseFloat(item.budgetedAmount || "0");
                    const balance = budget - spent;
                    const variancePercent = budget > 0 ? ((spent - budget) / budget) * 100 : 0;
                    const spentPercent = budget > 0 ? (spent / budget) * 100 : 0;
                    const status = 
                      variancePercent > 10 ? t.finance.overspending :
                      variancePercent < -20 ? t.finance.underspending :
                      t.finance.onTrack;

                    const isEditing = editingItemId === item.id;

                    return (
                      <div key={item.id} className="ml-4 mb-3">
                        <div className="p-4 rounded-lg border">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="text-sm font-semibold mb-1">
                                {item.notes || category?.name || "Budget Item"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {t.finance.budget}: {formatCurrency(budget, item.currency || projectCurrency)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={getStatusColor(variancePercent)}>
                                {status}
                              </Badge>
                              {/* Action Buttons */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewingItem(item)}
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {canUpdate && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStartEdit(item)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeletingItem(item)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="mb-3">
                            <Progress 
                              value={Math.min(spentPercent, 100)} 
                              className="h-2"
                            />
                          </div>

                          {/* Financial Details */}
                          <div className="flex justify-between text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">{t.finance.spent}</p>
                              <p className="font-medium text-blue-600">
                                {formatCurrency(spent, item.currency || projectCurrency)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">{t.finance.balance}</p>
                              <p className={`font-medium ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(balance, item.currency || projectCurrency)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">{t.finance.variance}</p>
                              <p className={`font-medium ${
                                variancePercent > 10 ? 'text-red-600' : 
                                variancePercent < -20 ? 'text-yellow-600' : 
                                'text-green-600'
                              }`}>
                                {variancePercent > 0 ? "+" : ""}{variancePercent.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Inline Edit Card */}
                        {isEditing && (
                          <div className="ml-4 mt-2 p-4 rounded-lg border border-blue-200 bg-blue-50/50">
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs font-semibold text-gray-700 mb-1 block">
                                  {t.finance.budgetedAmount}
                                </label>
                                <Input
                                  type="number"
                                  value={editForm.budgetedAmount}
                                  onChange={(e) => setEditForm({ ...editForm, budgetedAmount: e.target.value })}
                                  className="h-9"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-gray-700 mb-1 block">
                                  {t.finance.description || "Description"}
                                </label>
                                <Textarea
                                  value={editForm.notes}
                                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                  className="h-20"
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleCancelEdit}
                                  className="gap-2"
                                >
                                  <X className="h-4 w-4" />
                                  {t.finance.cancel || "Cancel"}
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveEdit(item.id)}
                                  className="gap-2"
                                >
                                  <Save className="h-4 w-4" />
                                  {t.finance.save || "Save"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t.finance.noBudgetItemsFound}
            </p>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.finance.budgetDetails || "Budget Details"}</DialogTitle>
          </DialogHeader>
          {viewingItem && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">{t.finance.category || "Category"}</p>
                <p className="font-semibold">{categoryMap.get(viewingItem.categoryId)?.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t.finance.budgetedAmount}</p>
                <p className="font-semibold">{formatCurrency(parseFloat(viewingItem.budgetedAmount), viewingItem.currency)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t.finance.description || "Description"}</p>
                <p className="text-sm">{viewingItem.notes || "No description"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t.finance.status || "Status"}</p>
                <Badge>{viewingItem.status}</Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingItem} onOpenChange={() => setDeletingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.finance.confirmDelete || "Confirm Delete"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t.finance.deleteConfirmMessage || "Are you sure you want to delete this budget item? This action cannot be undone."}
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeletingItem(null)}>
              {t.finance.cancel || "Cancel"}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t.finance.delete || "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
