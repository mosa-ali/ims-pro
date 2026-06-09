/**
 * Stock Items List Page
 * Follows the same design pattern as Returns/Issued Items:
 * Header (back link + title + description + action buttons) → Content Card (section title + search/filter + table + empty state)
 * 
 * Data source: Real stock items created from GRN acceptance (zero hardcoded/mock data)
 */

import React, { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Download, Eye, Edit, Trash2, Package, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";
import { PaginationControls } from "@/components/PaginationControls";

export default function StockItemsList() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { isRTL } = useLanguage();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading } = trpc.logistics.stock.listItems.useQuery({});
  const items = data?.items || [];
  const deleteMutation = trpc.logistics.stock.delete.useMutation();
  const utils = trpc.useUtils();

  const handleDelete = async (id: number) => {
    if (!confirm(t.logistics.areYouSureYouWantTo9)) return;
    await deleteMutation.mutateAsync({ id });
    utils.logistics.stock.listItems.invalidate();
  };

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = new Set<string>();
    items.forEach((item: any) => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats).sort();
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item: any) => {
      const matchesSearch = !search || 
        item.itemName?.toLowerCase().includes(search.toLowerCase()) ||
        item.itemCode?.toLowerCase().includes(search.toLowerCase()) ||
        item.description?.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [items, search, categoryFilter]);

  // Paginate filtered items
  const paginatedItems = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredItems.slice(startIdx, startIdx + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter]);

  const lowStockCount = items.filter((item: any) => {
    const qty = parseFloat(item.currentQuantity || "0");
    const reorder = parseFloat(item.reorderLevel || "0");
    return reorder > 0 && qty <= reorder;
  }).length;

  const totalStockValue = items.reduce((sum: number, item: any) => sum + parseFloat(item.totalValue || "0"), 0);

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <BackButton href="/organization/logistics/stock" label={t.logistics.backToStockManagement} />

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{t.logistics.stockItems19}</h1>
              <p className="text-muted-foreground">{t.logistics.stockItemsDesc || "Manage stock items sourced from approved GRN records"}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Download className="h-4 w-4 me-2" />
                {t.logistics.export}
              </Button>
              <Button asChild>
                <Link href="/organization/logistics/stock/items/new">
                  <Plus className="h-4 w-4 me-2" />
                  {t.logistics.addItem20}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-6">
        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي الأصناف" : "Total Items"}</p>
              <p className="text-2xl font-bold">{items.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-sm text-muted-foreground">{isRTL ? "إجمالي القيمة" : "Total Stock Value"}</p>
              <p className="text-2xl font-bold">${totalStockValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-sm text-muted-foreground">{isRTL ? "الفئات" : "Categories"}</p>
              <p className="text-2xl font-bold">{categories.length}</p>
            </CardContent>
          </Card>
          <Card className={lowStockCount > 0 ? "border-orange-500" : ""}>
            <CardContent className="pt-4 pb-3">
              <p className="text-sm text-muted-foreground">{isRTL ? "مخزون منخفض" : "Low Stock Alerts"}</p>
              <p className={`text-2xl font-bold ${lowStockCount > 0 ? "text-orange-600" : ""}`}>{lowStockCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Low stock alert banner */}
        {lowStockCount > 0 && (
          <Card className="mb-6 border-orange-500 bg-orange-50 dark:bg-orange-950">
            <CardContent className="pt-6 pb-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <span className="font-semibold text-orange-900 dark:text-orange-100">
                  {t.logistics.alertCountItemsWithLowStock?.replace("{count}", lowStockCount.toString()) || `${lowStockCount} item(s) below reorder level`}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t.logistics.stockItemRecords || "Item Records"}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t.logistics.searchByItemCodeOrName || "Search by item code or name..."}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ps-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder={t.logistics.allCategories || "All Categories"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.logistics.allCategories || "All Categories"}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">{t.logistics.itemCode}</TableHead>
                    <TableHead className="text-start">{t.logistics.itemName}</TableHead>
                    <TableHead className="text-start">{t.logistics.category}</TableHead>
                    <TableHead className="text-start">{t.logistics.unit}</TableHead>
                    <TableHead className="text-end">{t.logistics.quantity}</TableHead>
                    <TableHead className="text-end">{isRTL ? "سعر الوحدة" : "Unit Cost"}</TableHead>
                    <TableHead className="text-end">{isRTL ? "القيمة الإجمالية" : "Total Value"}</TableHead>
                    <TableHead className="text-center">{t.logistics.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {t.logistics.loading}
                      </TableCell>
                    </TableRow>
                  ) : paginatedItems.length > 0 ? (
                    paginatedItems.map((item: any) => {
                      const qty = parseFloat(item.currentQuantity || "0");
                      const reorder = parseFloat(item.reorderLevel || "0");
                      const isLow = reorder > 0 && qty <= reorder;
                      const unitCost = parseFloat(item.unitCost || "0");
                      const totalVal = parseFloat(item.totalValue || "0");

                      return (
                        <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/organization/logistics/stock/items/${item.id}`)}>
                          <TableCell className="font-mono text-sm">{item.itemCode}</TableCell>
                          <TableCell className="font-medium">{item.itemName}</TableCell>
                          <TableCell>
                            {item.category ? (
                              <Badge variant="secondary">{item.category}</Badge>
                            ) : "-"}
                          </TableCell>
                          <TableCell>{item.unitType || item.unit || "Piece"}</TableCell>
                          <TableCell className="text-end">
                            <div className="flex items-center justify-end gap-2">
                              <span className={isLow ? "text-red-600 font-semibold" : "font-medium"}>
                                {qty.toLocaleString()}
                              </span>
                              {isLow && (
                                <Badge variant="destructive" className="text-xs">
                                  {t.logistics.lowStock21 || "Low"}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-end font-mono">${unitCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-end font-mono">${totalVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell>
                            <div className="flex justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" onClick={() => navigate(`/organization/logistics/stock/items/${item.id}`)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => navigate(`/organization/logistics/stock/items/${item.id}/edit`)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Package className="h-12 w-12 text-muted-foreground/50" />
                          <p className="text-muted-foreground">{t.logistics.noRecordsFound}</p>
                          <p className="text-sm text-muted-foreground">
                            {isRTL ? "ستظهر الأصناف تلقائياً عند قبول سندات استلام البضائع" : "Items will appear automatically when GRNs are approved"}
                          </p>
                          <Button asChild variant="outline" size="sm">
                            <Link href="/organization/logistics/stock/items/new">
                              <Plus className="h-4 w-4 me-2" />
                              {t.logistics.createFirstItem || "Add Item Manually"}
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            {filteredItems.length > 0 && (
              <div className="mt-6">
                <PaginationControls
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalItems={filteredItems.length}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
