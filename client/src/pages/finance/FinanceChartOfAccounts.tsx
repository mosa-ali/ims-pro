import { BackButton } from "@/components/BackButton";
/**
 * Finance Chart of Accounts Page - Enhanced Version
 * 
 * Features:
 * - Hierarchical tree view for GL account categories
 * - Inline editing for category names
 * - Drag-drop reorganization
 * - Expand/collapse all functionality
 * - GL accounts management within each category
 * - Full bilingual support (Arabic/English) with RTL/LTR
 */
import { useTranslation } from '@/i18n/useTranslation';
import { useState, useEffect, useCallback } from"react";
import { useLanguage } from"@/contexts/LanguageContext";
import { useOrganization } from"@/contexts/OrganizationContext";
import { useOperatingUnit } from"@/contexts/OperatingUnitContext";
import { useNavigate } from"@/lib/router-compat";
import { trpc } from"@/lib/trpc";
import { Button } from"@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from"@/components/ui/dialog";
import { Input } from"@/components/ui/input";
import { Label } from"@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select";
import { Textarea } from"@/components/ui/textarea";
import { Badge } from"@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from"@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from"@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from"@/components/ui/collapsible";
import { toast } from"sonner";
import {
 ArrowLeft, ArrowRight, Download, Upload, Plus, Edit, Trash2, 
 ChevronRight, ChevronDown, GripVertical, Check, X, 
 FolderTree, FileText, Loader2, Search, ChevronsUpDown,
 Building2, Wallet, Scale, TrendingUp, TrendingDown
} from"lucide-react";

// Types
interface CategoryNode {
 id: number;
 code: string;
 name: string;
 accountType: string;
 normalBalance: string;
 level: number;
 parentId: number | null;
 sortOrder: number;
 isActive: boolean;
 children: CategoryNode[];
}

interface GLAccount {
 id: number;
 accountCode: string;
 name: string;
 accountType: string;
 normalBalance: string;
 categoryId: number | null;
 isActive: boolean;
 isBankAccount: boolean;
 isCashAccount: boolean;
 isPostable: boolean;
 currentBalance: string;
}

// Translations
// Account type icons
const accountTypeIcons: Record<string, React.ReactNode> = {
 asset: <Building2 className="w-4 h-4 text-blue-500" />,
 liability: <Scale className="w-4 h-4 text-red-500" />,
 equity: <Wallet className="w-4 h-4 text-purple-500" />,
 revenue: <TrendingUp className="w-4 h-4 text-green-500" />,
 expense: <TrendingDown className="w-4 h-4 text-orange-500" />,
};

export default function FinanceChartOfAccounts() {
 const { language, isRTL} = useLanguage();
  const { t } = useTranslation();
 const navigate = useNavigate();
 const { currentOrganization } = useOrganization();
 const { currentOperatingUnit } = useOperatingUnit();
 
 
 const organizationId = currentOrganization?.id || 1;
 const operatingUnitId = currentOperatingUnit?.id;

 // State
 const [activeTab, setActiveTab] = useState<'categories' | 'accounts'>('categories');
 const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
 const [searchTerm, setSearchTerm] = useState('');
 const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
 const [editingCategoryName, setEditingCategoryName] = useState('');
 const [selectedCategory, setSelectedCategory] = useState<CategoryNode | null>(null);
 const [selectedAccount, setSelectedAccount] = useState<GLAccount | null>(null);
 
 // Dialog states
 const [showCategoryDialog, setShowCategoryDialog] = useState(false);
 const [showAccountDialog, setShowAccountDialog] = useState(false);
 const [showDeleteDialog, setShowDeleteDialog] = useState(false);
 const [deleteTarget, setDeleteTarget] = useState<{ type: 'category' | 'account', id: number } | null>(null);
 
 // Form states
 const [categoryForm, setCategoryForm] = useState({
 code: '',
 name: '',
 accountType: 'asset' as const,
 normalBalance: 'debit' as const,
 parentId: null as number | null,
 level: 1,
 isActive: true,
 });
 
 const [accountForm, setAccountForm] = useState({
 accountCode: '',
 name: '',
 description: '',
 descriptionAr: '',
 accountType: 'asset' as const,
 normalBalance: 'debit' as const,
 categoryId: null as number | null,
 isActive: true,
 isBankAccount: false,
 isCashAccount: false,
 isPostable: true,
 });

 // Drag state
 const [draggedCategory, setDraggedCategory] = useState<number | null>(null);
 const [dragOverCategory, setDragOverCategory] = useState<number | null>(null);

 // tRPC queries
 const categoriesQuery = trpc.glAccountCategories.getTree.useQuery({
 organizationId,
 operatingUnitId,
 });

 const flatCategoriesQuery = trpc.glAccountCategories.list.useQuery({
 organizationId,
 operatingUnitId,
 });

 const accountsQuery = trpc.glAccounts.list.useQuery({
 organizationId,
 operatingUnitId,
 search: searchTerm || undefined,
 limit: 500,
 });

 // tRPC mutations
 const createCategoryMutation = trpc.glAccountCategories.create.useMutation({
 onSuccess: () => {
 toast.success(t.financeChartOfAccounts.categoryCreated);
 categoriesQuery.refetch();
 flatCategoriesQuery.refetch();
 setShowCategoryDialog(false);
 resetCategoryForm();
 },
 onError: (error) => toast.error(error.message),
 });

 const updateCategoryMutation = trpc.glAccountCategories.update.useMutation({
 onSuccess: () => {
 toast.success(t.financeChartOfAccounts.categoryUpdated);
 categoriesQuery.refetch();
 flatCategoriesQuery.refetch();
 setShowCategoryDialog(false);
 setEditingCategoryId(null);
 resetCategoryForm();
 },
 onError: (error) => toast.error(error.message),
 });

 const deleteCategoryMutation = trpc.glAccountCategories.delete.useMutation({
 onSuccess: () => {
 toast.success(t.financeChartOfAccounts.categoryDeleted);
 categoriesQuery.refetch();
 flatCategoriesQuery.refetch();
 setShowDeleteDialog(false);
 setDeleteTarget(null);
 },
 onError: (error) => toast.error(error.message),
 });

 const createAccountMutation = trpc.glAccounts.create.useMutation({
 onSuccess: () => {
 toast.success(t.financeChartOfAccounts.accountCreated);
 accountsQuery.refetch();
 setShowAccountDialog(false);
 resetAccountForm();
 },
 onError: (error) => toast.error(error.message),
 });

 const updateAccountMutation = trpc.glAccounts.update.useMutation({
 onSuccess: () => {
 toast.success(t.financeChartOfAccounts.accountUpdated);
 accountsQuery.refetch();
 setShowAccountDialog(false);
 resetAccountForm();
 },
 onError: (error) => toast.error(error.message),
 });

 const deleteAccountMutation = trpc.glAccounts.delete.useMutation({
 onSuccess: () => {
 toast.success(t.financeChartOfAccounts.accountDeleted);
 accountsQuery.refetch();
 setShowDeleteDialog(false);
 setDeleteTarget(null);
 },
 onError: (error) => toast.error(error.message),
 });

 // Helper functions
 const resetCategoryForm = () => {
 setCategoryForm({
 code: '',
 name: '',
 accountType: 'asset',
 normalBalance: 'debit',
 parentId: null,
 level: 1,
 isActive: true,
 });
 setSelectedCategory(null);
 };

 const resetAccountForm = () => {
 setAccountForm({
 accountCode: '',
 name: '',
 description: '',
 descriptionAr: '',
 accountType: 'asset',
 normalBalance: 'debit',
 categoryId: null,
 isActive: true,
 isBankAccount: false,
 isCashAccount: false,
 isPostable: true,
 });
 setSelectedAccount(null);
 };

 const toggleCategory = (id: number) => {
 setExpandedCategories(prev => {
 const next = new Set(prev);
 if (next.has(id)) {
 next.delete(id);
 } else {
 next.add(id);
 }
 return next;
 });
 };

 const expandAll = () => {
 const allIds = new Set<number>();
 const collectIds = (nodes: CategoryNode[]) => {
 nodes.forEach(node => {
 if (node.children.length > 0) {
 allIds.add(node.id);
 collectIds(node.children);
 }
 });
 };
 if (categoriesQuery.data) {
 collectIds(categoriesQuery.data);
 }
 setExpandedCategories(allIds);
 };

 const collapseAll = () => {
 setExpandedCategories(new Set());
 };

 const handleEditCategory = (category: CategoryNode) => {
 setSelectedCategory(category);
 setCategoryForm({
 code: category.code,
 name: category.name,
 accountType: category.accountType as any,
 normalBalance: category.normalBalance as any,
 parentId: category.parentId,
 level: category.level,
 isActive: category.isActive,
 });
 setShowCategoryDialog(true);
 };

 const handleEditAccount = (account: GLAccount) => {
 setSelectedAccount(account);
 setAccountForm({
 accountCode: account.accountCode,
 name: account.name,
 description: '',
 descriptionAr: '',
 accountType: account.accountType as any,
 normalBalance: account.normalBalance as any,
 categoryId: account.categoryId,
 isActive: account.isActive,
 isBankAccount: account.isBankAccount,
 isCashAccount: account.isCashAccount,
 isPostable: account.isPostable,
 });
 setShowAccountDialog(true);
 };

 const handleSaveCategory = () => {
 if (selectedCategory) {
 updateCategoryMutation.mutate({
 id: selectedCategory.id,
 ...categoryForm,
 });
 } else {
 createCategoryMutation.mutate({
 organizationId,
 operatingUnitId,
 ...categoryForm,
 });
 }
 };

 const handleSaveAccount = () => {
 if (selectedAccount) {
 updateAccountMutation.mutate({
 id: selectedAccount.id,
 ...accountForm,
 });
 } else {
 createAccountMutation.mutate({
 organizationId,
 operatingUnitId,
 ...accountForm,
 });
 }
 };

 const handleDelete = () => {
 if (!deleteTarget) return;
 if (deleteTarget.type === 'category') {
 deleteCategoryMutation.mutate({ id: deleteTarget.id });
 } else {
 deleteAccountMutation.mutate({ id: deleteTarget.id });
 }
 };

 const handleInlineEdit = (categoryId: number, newName: string) => {
 updateCategoryMutation.mutate({
 id: categoryId,
 name: newName,
 });
 setEditingCategoryId(null);
 };

 // Drag and drop handlers
 const handleDragStart = (e: React.DragEvent, categoryId: number) => {
 setDraggedCategory(categoryId);
 e.dataTransfer.effectAllowed = 'move';
 };

 const handleDragOver = (e: React.DragEvent, categoryId: number) => {
 e.preventDefault();
 if (draggedCategory !== categoryId) {
 setDragOverCategory(categoryId);
 }
 };

 const handleDragLeave = () => {
 setDragOverCategory(null);
 };

 const handleDrop = (e: React.DragEvent, targetCategoryId: number) => {
 e.preventDefault();
 if (draggedCategory && draggedCategory !== targetCategoryId) {
 // Update sortOrder to move dragged category after target
 const targetCategory = flatCategoriesQuery.data?.find(c => c.id === targetCategoryId);
 if (targetCategory) {
 updateCategoryMutation.mutate({
 id: draggedCategory,
 sortOrder: (targetCategory.sortOrder || 0) + 1,
 });
 }
 }
 setDraggedCategory(null);
 setDragOverCategory(null);
 };

 // Render category tree node
 const renderCategoryNode = (node: CategoryNode, depth: number = 0) => {
 const isExpanded = expandedCategories.has(node.id);
 const hasChildren = node.children.length > 0;
 const isEditing = editingCategoryId === node.id;
 const isDragOver = dragOverCategory === node.id;
 const displayName = node.name;

 return (
 <div key={node.id} className="select-none" dir={isRTL ? 'rtl' : 'ltr'}>
 <div
 className={`flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors ${ isDragOver ? 'bg-primary/10 border-2 border-primary border-dashed' : '' }`}
 style={{ paddingLeft: isRTL ? undefined : `${depth * 24 + 12}px`, paddingRight: isRTL ? `${depth * 24 + 12}px` : undefined }}
 draggable
 onDragStart={(e) => handleDragStart(e, node.id)}
 onDragOver={(e) => handleDragOver(e, node.id)}
 onDragLeave={handleDragLeave}
 onDrop={(e) => handleDrop(e, node.id)}
 >
 {/* Drag handle */}
 <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab opacity-50 hover:opacity-100" />
 
 {/* Expand/collapse button */}
 {hasChildren ? (
 <button
 onClick={() => toggleCategory(node.id)}
 className="p-1 hover:bg-muted rounded"
 >
 {isExpanded ? (
 <ChevronDown className="w-4 h-4" />
 ) : (
 <ChevronRight className="w-4 h-4" />
 )}
 </button>
 ) : (
 <div className="w-6" />
 )}
 
 {/* Account type icon */}
 {accountTypeIcons[node.accountType]}
 
 {/* Category code */}
 <span className="font-mono text-sm text-muted-foreground w-16">{node.code}</span>
 
 {/* Category name (inline editable) */}
 {isEditing ? (
 <div className="flex items-center gap-2 flex-1">
 <Input
 value={editingCategoryName}
 onChange={(e) => setEditingCategoryName(e.target.value)}
 className="h-7 text-sm"
 autoFocus
 onKeyDown={(e) => {
 if (e.key === 'Enter') {
 handleInlineEdit(node.id, editingCategoryName);
 } else if (e.key === 'Escape') {
 setEditingCategoryId(null);
 }
 }}
 />
 <Button
 size="icon"
 variant="ghost"
 className="h-6 w-6"
 onClick={() => handleInlineEdit(node.id, editingCategoryName)}
 >
 <Check className="w-3 h-3 text-green-500" />
 </Button>
 <Button
 size="icon"
 variant="ghost"
 className="h-6 w-6"
 onClick={() => setEditingCategoryId(null)}
 >
 <X className="w-3 h-3 text-red-500" />
 </Button>
 </div>
 ) : (
 <span
 className="flex-1 cursor-pointer hover:text-primary"
 onDoubleClick={() => {
 setEditingCategoryId(node.id);
 setEditingCategoryName(node.name);
 }}
 >
 {displayName}
 </span>
 )}
 
 {/* Status badge */}
 <Badge variant={node.isActive ? 'default' : 'secondary'} className="text-xs">
 {node.isActive ? t.financeChartOfAccounts.active : t.financeChartOfAccounts.inactive}
 </Badge>
 
 {/* Normal balance */}
 <Badge variant="outline" className="text-xs">
 {node.normalBalance === 'debit' ? t.financeChartOfAccounts.debit : t.financeChartOfAccounts.credit}
 </Badge>
 
 {/* Actions */}
 <div className="flex items-center gap-1">
 <Button
 size="icon"
 variant="ghost"
 className="h-7 w-7"
 onClick={() => handleEditCategory(node)}
 >
 <Edit className="w-3 h-3" />
 </Button>
 <Button
 size="icon"
 variant="ghost"
 className="h-7 w-7 text-destructive hover:text-destructive"
 onClick={() => {
 setDeleteTarget({ type: 'category', id: node.id });
 setShowDeleteDialog(true);
 }}
 >
 <Trash2 className="w-3 h-3" />
 </Button>
 </div>
 </div>
 
 {/* Children */}
 {hasChildren && isExpanded && (
 <div>
 {node.children.map(child => renderCategoryNode(child, depth + 1))}
 </div>
 )}
 </div>
 );
 };

 return (
 <div className="container mx-auto py-6">
 <div className="space-y-6">
 {/* Page Header */}
 <div className="flex items-center justify-between">
 <div className="text-start">
 <BackButton onClick={() => navigate('/organization/finance')} label={t.financeChartOfAccounts.backToFinance} />
 <h1 className="text-3xl font-bold tracking-tight">{t.financeChartOfAccounts.title}</h1>
 <p className="text-muted-foreground mt-2">{t.financeChartOfAccounts.subtitle}</p>
 </div>
 
 {/* Import/Export Buttons */}
 <div className="flex gap-2">
 <Button variant="outline" className="gap-2">
 <Upload className="w-4 h-4" />
 {t.financeChartOfAccounts.import}
 </Button>
 <Button variant="outline" className="gap-2">
 <Download className="w-4 h-4" />
 {t.financeChartOfAccounts.export}
 </Button>
 </div>
 </div>

 {/* Main Content */}
 <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
 <div className="flex items-center justify-between mb-4">
 <TabsList>
 <TabsTrigger value="categories" className="gap-2">
 <FolderTree className="w-4 h-4" />
 {t.financeChartOfAccounts.categories}
 </TabsTrigger>
 <TabsTrigger value="accounts" className="gap-2">
 <FileText className="w-4 h-4" />
 {t.financeChartOfAccounts.accounts}
 </TabsTrigger>
 </TabsList>
 
 <div className="flex items-center gap-2">
 {activeTab === 'categories' && (
 <>
 <Button variant="outline" size="sm" onClick={expandAll}>
 <ChevronsUpDown className="w-4 h-4 me-1" />
 {t.financeChartOfAccounts.expandAll}
 </Button>
 <Button variant="outline" size="sm" onClick={collapseAll}>
 {t.financeChartOfAccounts.collapseAll}
 </Button>
 <Button size="sm" onClick={() => {
 resetCategoryForm();
 setShowCategoryDialog(true);
 }}>
 <Plus className="w-4 h-4 me-1" />
 {t.financeChartOfAccounts.addCategory}
 </Button>
 </>
 )}
 {activeTab === 'accounts' && (
 <>
 <div className="relative">
 <Search className="absolute top-2.5 w-4 h-4 text-muted-foreground start-3" />
 <Input
 placeholder={t.financeChartOfAccounts.search}
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-64 ps-9"
 />
 </div>
 <Button size="sm" onClick={() => {
 resetAccountForm();
 setShowAccountDialog(true);
 }}>
 <Plus className="w-4 h-4 me-1" />
 {t.financeChartOfAccounts.addAccount}
 </Button>
 </>
 )}
 </div>
 </div>

 {/* Categories Tab */}
 <TabsContent value="categories">
 <Card>
 <CardContent className="pt-6">
 {categoriesQuery.isLoading ? (
 <div className="flex items-center justify-center py-12">
 <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
 </div>
 ) : categoriesQuery.error ? (
 <div className="flex flex-col items-center justify-center py-12 text-center">
 <p className="text-destructive mb-4">{t.financeChartOfAccounts.error}</p>
 <Button onClick={() => categoriesQuery.refetch()}>{t.financeChartOfAccounts.retry}</Button>
 </div>
 ) : categoriesQuery.data && categoriesQuery.data.length > 0 ? (
 <div className="space-y-1">
 {categoriesQuery.data.map(node => renderCategoryNode(node))}
 </div>
 ) : (
 <div className="text-center py-12 text-muted-foreground">
 <FolderTree className="w-12 h-12 mx-auto mb-4 opacity-50" />
 <p>{t.financeChartOfAccounts.noCategories}</p>
 <Button 
 className="mt-4" 
 onClick={() => {
 resetCategoryForm();
 setShowCategoryDialog(true);
 }}
 >
 <Plus className="w-4 h-4 me-2" />
 {t.financeChartOfAccounts.addCategory}
 </Button>
 </div>
 )}
 </CardContent>
 </Card>
 </TabsContent>

 {/* Accounts Tab */}
 <TabsContent value="accounts">
 <Card>
 <CardContent className="pt-6">
 {accountsQuery.isLoading ? (
 <div className="flex items-center justify-center py-12">
 <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
 </div>
 ) : accountsQuery.error ? (
 <div className="flex flex-col items-center justify-center py-12 text-center">
 <p className="text-destructive mb-4">{t.financeChartOfAccounts.error}</p>
 <Button onClick={() => accountsQuery.refetch()}>{t.financeChartOfAccounts.retry}</Button>
 </div>
 ) : accountsQuery.data && accountsQuery.data.accounts.length > 0 ? (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.financeChartOfAccounts.code}</TableHead>
 <TableHead>{t.financeChartOfAccounts.name}</TableHead>
 <TableHead>{t.financeChartOfAccounts.type}</TableHead>
 <TableHead>{t.financeChartOfAccounts.normalBalance}</TableHead>
 <TableHead>{t.financeChartOfAccounts.status}</TableHead>
 <TableHead>{t.financeChartOfAccounts.bankAccount}</TableHead>
 <TableHead>{t.financeChartOfAccounts.cashAccount}</TableHead>
 <TableHead>{t.financeChartOfAccounts.postable}</TableHead>
 <TableHead className="text-end">{t.financeChartOfAccounts.balance}</TableHead>
 <TableHead className="text-center">{t.financeChartOfAccounts.actions}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {accountsQuery.data.accounts.map((account: any) => (
 <TableRow key={account.id}>
 <TableCell className="font-mono">{account.accountCode}</TableCell>
 <TableCell>{account.name}</TableCell>
 <TableCell>
 <div className="flex items-center gap-2">
 {accountTypeIcons[account.accountType]}
 <span>{t[account.accountType as keyof typeof t] || account.accountType}</span>
 </div>
 </TableCell>
 <TableCell>
 <Badge variant="outline">
 {account.normalBalance === 'debit' ? t.financeChartOfAccounts.debit : t.financeChartOfAccounts.credit}
 </Badge>
 </TableCell>
 <TableCell>
 <Badge variant={account.isActive ? 'default' : 'secondary'}>
 {account.isActive ? t.financeChartOfAccounts.active : t.financeChartOfAccounts.inactive}
 </Badge>
 </TableCell>
 <TableCell>{account.isBankAccount ? t.financeChartOfAccounts.yes : t.financeChartOfAccounts.no}</TableCell>
 <TableCell>{account.isCashAccount ? t.financeChartOfAccounts.yes : t.financeChartOfAccounts.no}</TableCell>
 <TableCell>{account.isPostable ? t.financeChartOfAccounts.yes : t.financeChartOfAccounts.no}</TableCell>
 <TableCell className="text-end font-mono">
 {parseFloat(account.currentBalance || '0').toLocaleString()}
 </TableCell>
 <TableCell>
 <div className="flex items-center gap-1">
 <Button
 size="icon"
 variant="ghost"
 className="h-7 w-7"
 onClick={() => handleEditAccount(account)}
 >
 <Edit className="w-3 h-3" />
 </Button>
 <Button
 size="icon"
 variant="ghost"
 className="h-7 w-7 text-destructive hover:text-destructive"
 onClick={() => {
 setDeleteTarget({ type: 'account', id: account.id });
 setShowDeleteDialog(true);
 }}
 >
 <Trash2 className="w-3 h-3" />
 </Button>
 </div>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 ) : (
 <div className="text-center py-12 text-muted-foreground">
 <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
 <p>{t.financeChartOfAccounts.noAccounts}</p>
 <Button 
 className="mt-4" 
 onClick={() => {
 resetAccountForm();
 setShowAccountDialog(true);
 }}
 >
 <Plus className="w-4 h-4 me-2" />
 {t.financeChartOfAccounts.addAccount}
 </Button>
 </div>
 )}
 </CardContent>
 </Card>
 </TabsContent>
 </Tabs>

 {/* Category Dialog */}
 <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
 <DialogContent className="max-w-lg">
 <DialogHeader>
 <DialogTitle>{selectedCategory ? t.financeChartOfAccounts.editCategory : t.financeChartOfAccounts.createCategory}</DialogTitle>
 </DialogHeader>
 <div className="space-y-4 py-4">
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>{t.financeChartOfAccounts.code}</Label>
 <Input
 value={categoryForm.code}
 onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value })}
 placeholder="1000"
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financeChartOfAccounts.type}</Label>
 <Select
 value={categoryForm.accountType}
 onValueChange={(v: any) => setCategoryForm({ ...categoryForm, accountType: v })}
 >
 <SelectTrigger>
 <SelectValue placeholder={t.financeChartOfAccounts.selectType} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="asset">{t.financeChartOfAccounts.asset}</SelectItem>
 <SelectItem value="liability">{t.financeChartOfAccounts.liability}</SelectItem>
 <SelectItem value="equity">{t.financeChartOfAccounts.equity}</SelectItem>
 <SelectItem value="revenue">{t.financeChartOfAccounts.revenue}</SelectItem>
 <SelectItem value="expense">{t.financeChartOfAccounts.expense}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 <div className="space-y-2">
 <Label>{t.financeChartOfAccounts.name}</Label>
 <Input
 value={categoryForm.name}
 onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
 placeholder={t.placeholders.assets}
 />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>{t.financeChartOfAccounts.normalBalance}</Label>
 <Select
 value={categoryForm.normalBalance}
 onValueChange={(v: any) => setCategoryForm({ ...categoryForm, normalBalance: v })}
 >
 <SelectTrigger>
 <SelectValue placeholder={t.financeChartOfAccounts.selectBalance} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="debit">{t.financeChartOfAccounts.debit}</SelectItem>
 <SelectItem value="credit">{t.financeChartOfAccounts.credit}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2">
 <Label>{t.financeChartOfAccounts.parent}</Label>
 <Select
 value={categoryForm.parentId?.toString() || 'null'}
 onValueChange={(v) => setCategoryForm({ 
 ...categoryForm, 
 parentId: v === 'null' ? null : parseInt(v),
 level: v === 'null' ? 1 : 2,
 })}
 >
 <SelectTrigger>
 <SelectValue placeholder={t.financeChartOfAccounts.selectParent} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="null">{t.financeChartOfAccounts.noParent}</SelectItem>
 {flatCategoriesQuery.data?.map((cat: any) => (
 <SelectItem key={cat.id} value={cat.id.toString()}>
 {cat.code} - {cat.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>
 {t.financeChartOfAccounts.cancel}
 </Button>
 <Button 
 onClick={handleSaveCategory}
 disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
 >
 {(createCategoryMutation.isPending || updateCategoryMutation.isPending) && (
 <Loader2 className="w-4 h-4 me-2 animate-spin" />
 )}
 {t.financeChartOfAccounts.save}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Account Dialog */}
 <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
 <DialogContent className="max-w-lg">
 <DialogHeader>
 <DialogTitle>{selectedAccount ? t.financeChartOfAccounts.editAccount : t.financeChartOfAccounts.createAccount}</DialogTitle>
 </DialogHeader>
 <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>{t.financeChartOfAccounts.code}</Label>
 <Input
 value={accountForm.accountCode}
 onChange={(e) => setAccountForm({ ...accountForm, accountCode: e.target.value })}
 placeholder="1001"
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financeChartOfAccounts.type}</Label>
 <Select
 value={accountForm.accountType}
 onValueChange={(v: any) => setAccountForm({ ...accountForm, accountType: v })}
 >
 <SelectTrigger>
 <SelectValue placeholder={t.financeChartOfAccounts.selectType} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="asset">{t.financeChartOfAccounts.asset}</SelectItem>
 <SelectItem value="liability">{t.financeChartOfAccounts.liability}</SelectItem>
 <SelectItem value="equity">{t.financeChartOfAccounts.equity}</SelectItem>
 <SelectItem value="revenue">{t.financeChartOfAccounts.revenue}</SelectItem>
 <SelectItem value="expense">{t.financeChartOfAccounts.expense}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 <div className="space-y-2">
 <Label>{t.financeChartOfAccounts.name}</Label>
 <Input
 value={accountForm.name}
 onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
 placeholder={t.placeholders.cashOnHand}
 />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>{t.financeChartOfAccounts.normalBalance}</Label>
 <Select
 value={accountForm.normalBalance}
 onValueChange={(v: any) => setAccountForm({ ...accountForm, normalBalance: v })}
 >
 <SelectTrigger>
 <SelectValue placeholder={t.financeChartOfAccounts.selectBalance} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="debit">{t.financeChartOfAccounts.debit}</SelectItem>
 <SelectItem value="credit">{t.financeChartOfAccounts.credit}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2">
 <Label>{t.financeChartOfAccounts.categories}</Label>
 <Select
 value={accountForm.categoryId?.toString() || 'null'}
 onValueChange={(v) => setAccountForm({ 
 ...accountForm, 
 categoryId: v === 'null' ? null : parseInt(v),
 })}
 >
 <SelectTrigger>
 <SelectValue placeholder={t.financeChartOfAccounts.selectCategory} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="null">-</SelectItem>
 {flatCategoriesQuery.data?.map((cat: any) => (
 <SelectItem key={cat.id} value={cat.id.toString()}>
 {cat.code} - {cat.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>
 <div className="space-y-2">
 <Label>{t.financeChartOfAccounts.description}</Label>
 <Textarea
 value={accountForm.description}
 onChange={(e) => setAccountForm({ ...accountForm, description: e.target.value })}
 rows={2}
 />
 </div>
 <div className="grid grid-cols-3 gap-4">
 <div className="flex items-center space-x-2">
 <input
 type="checkbox"
 id="isBankAccount"
 checked={accountForm.isBankAccount}
 onChange={(e) => setAccountForm({ ...accountForm, isBankAccount: e.target.checked })}
 className="h-4 w-4"
 />
 <Label htmlFor="isBankAccount" className="text-sm">{t.financeChartOfAccounts.bankAccount}</Label>
 </div>
 <div className="flex items-center space-x-2">
 <input
 type="checkbox"
 id="isCashAccount"
 checked={accountForm.isCashAccount}
 onChange={(e) => setAccountForm({ ...accountForm, isCashAccount: e.target.checked })}
 className="h-4 w-4"
 />
 <Label htmlFor="isCashAccount" className="text-sm">{t.financeChartOfAccounts.cashAccount}</Label>
 </div>
 <div className="flex items-center space-x-2">
 <input
 type="checkbox"
 id="isPostable"
 checked={accountForm.isPostable}
 onChange={(e) => setAccountForm({ ...accountForm, isPostable: e.target.checked })}
 className="h-4 w-4"
 />
 <Label htmlFor="isPostable" className="text-sm">{t.financeChartOfAccounts.postable}</Label>
 </div>
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowAccountDialog(false)}>
 {t.financeChartOfAccounts.cancel}
 </Button>
 <Button 
 onClick={handleSaveAccount}
 disabled={createAccountMutation.isPending || updateAccountMutation.isPending}
 >
 {(createAccountMutation.isPending || updateAccountMutation.isPending) && (
 <Loader2 className="w-4 h-4 me-2 animate-spin" />
 )}
 {t.financeChartOfAccounts.save}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Delete Confirmation Dialog */}
 <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>
 {deleteTarget?.type === 'category' ? t.financeChartOfAccounts.deleteCategory : t.financeChartOfAccounts.deleteAccount}
 </DialogTitle>
 <DialogDescription>{t.financeChartOfAccounts.confirmDelete}</DialogDescription>
 </DialogHeader>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
 {t.financeChartOfAccounts.cancel}
 </Button>
 <Button 
 variant="destructive" 
 onClick={handleDelete}
 disabled={deleteCategoryMutation.isPending || deleteAccountMutation.isPending}
 >
 {(deleteCategoryMutation.isPending || deleteAccountMutation.isPending) && (
 <Loader2 className="w-4 h-4 me-2 animate-spin" />
 )}
 {t.financeChartOfAccounts.delete}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 </div>
 );
}
