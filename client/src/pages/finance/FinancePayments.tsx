import { useState, useMemo } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { useOperatingUnit } from '@/contexts/OperatingUnitContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
 ArrowLeft, ArrowRight, Plus, Search, Filter, Download, Upload, RefreshCw,
 MoreHorizontal, Eye, Edit, Trash2, CheckCircle, XCircle, Clock,
 Send, CreditCard, Building2, User, DollarSign, Calendar, FileText,
 AlertTriangle, Ban, Play, Check, CheckCheck, BarChart3, Layers
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Link } from 'wouter';
import { VersionHistoryModal } from '@/components/finance/VersionHistoryModal';
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuSeparator,
 DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

// Translations
type PaymentStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'processing' | 'completed' | 'cancelled' | 'failed';
type PaymentType = 'vendor' | 'staff' | 'advance' | 'refund' | 'other';
type PaymentMethod = 'bank_transfer' | 'check' | 'cash' | 'wire' | 'mobile_money' | 'other';

export default function FinancePayments() {
 const { t } = useTranslation();
 const { currentOrganization, currentOperatingUnit} = useOperatingUnit();
 const { language, isRTL} = useLanguage();
 // toast is imported from sonner
 const navigate = useNavigate();

 // State
 const [searchQuery, setSearchQuery] = useState('');
 const [statusFilter, setStatusFilter] = useState<string>('all');
 const [typeFilter, setTypeFilter] = useState<string>('all');
 const [methodFilter, setMethodFilter] = useState<string>('all');
 const [showCreateDialog, setShowCreateDialog] = useState(false);
 const [showViewDialog, setShowViewDialog] = useState(false);
 const [showApprovalDialog, setShowApprovalDialog] = useState(false);
 const [selectedPayment, setSelectedPayment] = useState<any>(null);
 const [approvalAction, setApprovalAction] = useState<'submit' | 'approve' | 'reject' | 'cancel' | 'complete' | null>(null);
 const [approvalNotes, setApprovalNotes] = useState('');
 const [transactionRef, setTransactionRef] = useState('');
 const [selectedPaymentIds, setSelectedPaymentIds] = useState<number[]>([]);
 const [showBatchDialog, setShowBatchDialog] = useState(false);
 const [batchAction, setBatchAction] = useState<'submit' | 'approve' | 'reject' | 'complete' | 'delete' | null>(null);
 const [showVersionHistory, setShowVersionHistory] = useState(false);
 const [versionHistoryPaymentId, setVersionHistoryPaymentId] = useState<number | null>(null);

 // Form state
 const [formData, setFormData] = useState({
 vendorId: '',
 projectId: '',
 grantId: '',
 payeeName: '',
 payeeNameAr: '',
 paymentType: 'vendor' as PaymentType,
 paymentMethod: 'bank_transfer' as PaymentMethod,
 bankAccountId: '',
 paymentDate: new Date().toISOString().split('T')[0],
 dueDate: '',
 totalAmount: '',
 description: '',
 reference: '',
 payeeBankName: '',
 payeeBankAccount: '',
 payeeIban: '',
 payeeSwiftCode: '',
 });

 const organizationId = currentOrganization?.id ? Number(String(currentOrganization.id).replace(/\D/g, '')) : 0;
 const operatingUnitId = currentOperatingUnit?.id ? Number(String(currentOperatingUnit.id).replace(/\D/g, '')) : undefined;

 // Queries
 const { data: paymentsData, isLoading, refetch } = trpc.payments.list.useQuery({
 organizationId,
 operatingUnitId,
 status: statusFilter !== 'all' ? statusFilter as PaymentStatus : undefined,
 paymentType: typeFilter !== 'all' ? typeFilter as PaymentType : undefined,
 paymentMethod: methodFilter !== 'all' ? methodFilter as PaymentMethod : undefined,
 search: searchQuery || undefined,
 limit: 100,
 }, {
 enabled: organizationId > 0,
 });

 const { data: vendorsData } = trpc.vendors.getForDropdown.useQuery({
 organizationId,
 operatingUnitId,
 }, {
 enabled: organizationId > 0,
 });

 const { data: bankAccountsData } = trpc.treasury.bankAccounts.list.useQuery({
 organizationId,
 operatingUnitId,
 }, {
 enabled: organizationId > 0,
 });

 const { data: projectsData } = trpc.projects.list.useQuery({organizationId}, {
 enabled: organizationId > 0 && operatingUnitId !== undefined,
 });

 // Version history query
 const { data: versionHistoryData, isLoading: isLoadingVersions } = trpc.payments.getVersionHistory.useQuery(
 { id: versionHistoryPaymentId! },
 { enabled: versionHistoryPaymentId !== null }
 );

 // Mutations
 const createMutation = trpc.payments.create.useMutation({
 onSuccess: () => {
 toast(t.financePayments.paymentCreated);
 setShowCreateDialog(false);
 resetForm();
 refetch();
 },
 onError: (error) => {
 toast.error(t.financePayments.error, { description: error.message });
 },
 });

 const updateMutation = trpc.payments.update.useMutation({
 onSuccess: () => {
 toast(t.financePayments.paymentUpdated);
 setShowCreateDialog(false);
 setSelectedPayment(null);
 resetForm();
 refetch();
 },
 onError: (error) => {
 toast.error(t.financePayments.error, { description: error.message });
 },
 });

 const deleteMutation = trpc.payments.delete.useMutation({
 onSuccess: () => {
 toast(t.financePayments.paymentDeleted);
 refetch();
 },
 onError: (error) => {
 toast.error(t.financePayments.error, { description: error.message });
 },
 });

 const submitMutation = trpc.payments.submitForApproval.useMutation({
 onSuccess: () => {
 toast(t.financePayments.paymentSubmitted);
 setShowApprovalDialog(false);
 setApprovalAction(null);
 refetch();
 },
 onError: (error) => {
 toast.error(t.financePayments.error, { description: error.message });
 },
 });

 const approveMutation = trpc.payments.approve.useMutation({
 onSuccess: () => {
 toast(t.financePayments.paymentApproved);
 setShowApprovalDialog(false);
 setApprovalAction(null);
 setApprovalNotes('');
 refetch();
 },
 onError: (error) => {
 toast.error(t.financePayments.error, { description: error.message });
 },
 });

 const rejectMutation = trpc.payments.reject.useMutation({
 onSuccess: () => {
 toast(t.financePayments.paymentRejected);
 setShowApprovalDialog(false);
 setApprovalAction(null);
 setApprovalNotes('');
 refetch();
 },
 onError: (error) => {
 toast.error(t.financePayments.error, { description: error.message });
 },
 });

 const cancelMutation = trpc.payments.cancel.useMutation({
 onSuccess: () => {
 toast(t.financePayments.paymentCancelled);
 setShowApprovalDialog(false);
 setApprovalAction(null);
 setApprovalNotes('');
 refetch();
 },
 onError: (error) => {
 toast.error(t.financePayments.error, { description: error.message });
 },
 });

 const completeMutation = trpc.payments.complete.useMutation({
 onSuccess: () => {
 toast(t.financePayments.paymentCompleted);
 setShowApprovalDialog(false);
 setApprovalAction(null);
 setTransactionRef('');
 refetch();
 },
 onError: (error) => {
 toast.error(t.financePayments.error, { description: error.message });
 },
 });

 // Batch mutations
 const batchSubmitMutation = trpc.paymentBatch.submitBatch.useMutation({
 onSuccess: (data) => {
 toast(data.message || t.financePayments.batchActionSuccess);
 setShowBatchDialog(false);
 setBatchAction(null);
 setSelectedPaymentIds([]);
 refetch();
 },
 onError: (error) => {
 toast.error(t.financePayments.error, { description: error.message });
 },
 });

 const batchApproveMutation = trpc.paymentBatch.approveBatch.useMutation({
 onSuccess: (data) => {
 toast(data.message || t.financePayments.batchActionSuccess);
 setShowBatchDialog(false);
 setBatchAction(null);
 setSelectedPaymentIds([]);
 refetch();
 },
 onError: (error) => {
 toast.error(t.financePayments.error, { description: error.message });
 },
 });

 const batchRejectMutation = trpc.paymentBatch.rejectBatch.useMutation({
 onSuccess: (data) => {
 toast(data.message || t.financePayments.batchActionSuccess);
 setShowBatchDialog(false);
 setBatchAction(null);
 setApprovalNotes('');
 setSelectedPaymentIds([]);
 refetch();
 },
 onError: (error) => {
 toast.error(t.financePayments.error, { description: error.message });
 },
 });

 const batchCompleteMutation = trpc.paymentBatch.completeBatch.useMutation({
 onSuccess: (data) => {
 toast(data.message || t.financePayments.batchActionSuccess);
 setShowBatchDialog(false);
 setBatchAction(null);
 setSelectedPaymentIds([]);
 refetch();
 },
 onError: (error) => {
 toast.error(t.financePayments.error, { description: error.message });
 },
 });

 const batchDeleteMutation = trpc.paymentBatch.deleteBatch.useMutation({
 onSuccess: (data) => {
 toast(data.message || t.financePayments.batchActionSuccess);
 setShowBatchDialog(false);
 setBatchAction(null);
 setSelectedPaymentIds([]);
 refetch();
 },
 onError: (error) => {
 toast.error(t.financePayments.error, { description: error.message });
 },
 });

 const resetForm = () => {
 setFormData({
 vendorId: '',
 projectId: '',
 grantId: '',
 payeeName: '',
 payeeNameAr: '',
 paymentType: 'vendor',
 paymentMethod: 'bank_transfer',
 bankAccountId: '',
 paymentDate: new Date().toISOString().split('T')[0],
 dueDate: '',
 totalAmount: '',
 description: '',
 reference: '',
 payeeBankName: '',
 payeeBankAccount: '',
 payeeIban: '',
 payeeSwiftCode: '',
 });
 };

 const handleCreate = () => {
 if (!formData.payeeName || !formData.totalAmount || !formData.paymentDate) {
 toast.error(t.financePayments.error, { description: t.financePayments.required });
 return;
 }

 createMutation.mutate({
 organizationId,
 operatingUnitId,
 vendorId: formData.vendorId ? Number(formData.vendorId) : undefined,
 projectId: formData.projectId ? Number(formData.projectId) : undefined,
 grantId: formData.grantId ? Number(formData.grantId) : undefined,
 payeeName: formData.payeeName,
 payeeNameAr: formData.payeeNameAr || undefined,
 paymentType: formData.paymentType,
 paymentMethod: formData.paymentMethod,
 bankAccountId: formData.bankAccountId ? Number(formData.bankAccountId) : undefined,
 paymentDate: new Date(formData.paymentDate),
 dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
 totalAmount: formData.totalAmount,
 description: formData.description || undefined,
 reference: formData.reference || undefined,
 payeeBankName: formData.payeeBankName || undefined,
 payeeBankAccount: formData.payeeBankAccount || undefined,
 payeeIban: formData.payeeIban || undefined,
 payeeSwiftCode: formData.payeeSwiftCode || undefined,
 });
 };

 const handleApprovalAction = () => {
 if (!selectedPayment || !approvalAction) return;

 switch (approvalAction) {
 case 'submit':
 submitMutation.mutate({ id: selectedPayment.id });
 break;
 case 'approve':
 approveMutation.mutate({ id: selectedPayment.id, approvalNotes: approvalNotes || undefined });
 break;
 case 'reject':
 if (!approvalNotes) {
 toast.error(t.financePayments.error, { description: t.financePayments.required });
 return;
 }
 rejectMutation.mutate({ id: selectedPayment.id, rejectionReason: approvalNotes });
 break;
 case 'cancel':
 if (!approvalNotes) {
 toast.error(t.financePayments.error, { description: t.financePayments.required });
 return;
 }
 cancelMutation.mutate({ id: selectedPayment.id, cancellationReason: approvalNotes });
 break;
 case 'complete':
 completeMutation.mutate({ 
 id: selectedPayment.id, 
 transactionReference: transactionRef || undefined,
 });
 break;
 }
 };

 // Batch action handlers
 const handleBatchAction = () => {
 if (selectedPaymentIds.length === 0 || !batchAction) return;

 switch (batchAction) {
 case 'submit':
 batchSubmitMutation.mutate({ paymentIds: selectedPaymentIds });
 break;
 case 'approve':
 batchApproveMutation.mutate({ paymentIds: selectedPaymentIds, approvalNotes: approvalNotes || undefined });
 break;
 case 'reject':
 if (!approvalNotes) {
 toast.error(t.financePayments.error, { description: t.financePayments.required });
 return;
 }
 batchRejectMutation.mutate({ paymentIds: selectedPaymentIds, rejectionReason: approvalNotes });
 break;
 case 'complete':
 batchCompleteMutation.mutate({ paymentIds: selectedPaymentIds });
 break;
 case 'delete':
 batchDeleteMutation.mutate({ paymentIds: selectedPaymentIds });
 break;
 }
 };

 const togglePaymentSelection = (paymentId: number) => {
 setSelectedPaymentIds(prev => 
 prev.includes(paymentId) 
 ? prev.filter(id => id !== paymentId)
 : [...prev, paymentId]
 );
 };

 const toggleSelectAll = () => {
 if (!paymentsData?.payments) return;
 if (selectedPaymentIds.length === paymentsData.payments.length) {
 setSelectedPaymentIds([]);
 } else {
 setSelectedPaymentIds(paymentsData.payments.map(p => p.id));
 }
 };

 const getSelectedPaymentsByStatus = () => {
 if (!paymentsData?.payments) return { draft: [], pending: [], approved: [] };
 const selected = paymentsData.payments.filter(p => selectedPaymentIds.includes(p.id));
 return {
 draft: selected.filter(p => p.status === 'draft'),
 pending: selected.filter(p => p.status === 'pending_approval'),
 approved: selected.filter(p => p.status === 'approved'),
 };
 };

 const getStatusBadge = (status: PaymentStatus) => {
 const statusConfig: Record<PaymentStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
 draft: { variant: 'secondary', icon: Clock },
 pending_approval: { variant: 'outline', icon: Clock },
 approved: { variant: 'default', icon: CheckCircle },
 rejected: { variant: 'destructive', icon: XCircle },
 processing: { variant: 'outline', icon: Play },
 completed: { variant: 'default', icon: Check },
 cancelled: { variant: 'secondary', icon: Ban },
 failed: { variant: 'destructive', icon: AlertTriangle },
 };

 const config = statusConfig[status] || statusConfig.draft;
 const Icon = config.icon;

 return (
 <Badge variant={config.variant} className="gap-1">
 <Icon className="h-3 w-3" />
 {t[status as keyof typeof t] || status}
 </Badge>
 );
 };

 const getTypeIcon = (type: PaymentType) => {
 switch (type) {
 case 'vendor': return Building2;
 case 'staff': return User;
 case 'advance': return DollarSign;
 default: return CreditCard;
 }
 };

 const formatCurrency = (amount: string | number) => {
 const num = typeof amount === 'string' ? parseFloat(amount) : amount;
 return new Intl.NumberFormat('en-US', {
 style: 'currency',
 currency: 'USD',
 }).format(num || 0);
 };

 const formatDate = (date: string | Date) => {
 return new Date(date).toLocaleDateString('en-US', {
 year: 'numeric',
 month: 'short',
 day: 'numeric',
 });
 };

 // Stats calculation
 const stats = useMemo(() => {
 const payments = paymentsData?.payments || [];
 const pending = payments.filter(p => p.status === 'pending_approval').length;
 const total = payments.reduce((sum, p) => sum + parseFloat(p.totalAmount || '0'), 0);
 const completedThisMonth = payments.filter(p => {
 if (p.status !== 'completed') return false;
 const paidAt = p.paidAt ? new Date(p.paidAt) : null;
 if (!paidAt) return false;
 const now = new Date();
 return paidAt.getMonth() === now.getMonth() && paidAt.getFullYear() === now.getFullYear();
 }).length;

 return { total: payments.length, pending, totalAmount: total, completedThisMonth };
 }, [paymentsData]);

 return (
 <div className="min-h-screen bg-gray-50">
 <div className="container mx-auto py-6 px-4">
 {/* Header */}
 <div className="mb-6">
 <BackButton href="/organization/finance" label={t.financePayments.backToFinance} />
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold">{t.financePayments.payments}</h1>
 <p className="text-muted-foreground">{t.financePayments.paymentsDescription}</p>
 </div>
 <div className="flex items-center gap-2">
 <Link href="/organization/finance/payment-reports">
 <Button variant="outline" size="sm">
 <BarChart3 className="h-4 w-4 me-2" />
 {t.financePayments.viewReports}
 </Button>
 </Link>
 <Button variant="outline" size="sm" onClick={() => toast({ title: t.financeModule.comingSoon })}>
 <Upload className="h-4 w-4 me-2" />
 {t.financePayments.import}
 </Button>
 <Button variant="outline" size="sm" onClick={() => toast({ title: t.financeModule.comingSoon })}>
 <Download className="h-4 w-4 me-2" />
 {t.financePayments.export}
 </Button>
 <Button onClick={() => setShowCreateDialog(true)}>
 <Plus className="h-4 w-4 me-2" />
 {t.financePayments.newPayment}
 </Button>
 </div>
 </div>
 </div>

 {/* Stats Cards */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">{t.financePayments.totalPayments}</p>
 <p className="text-2xl font-bold">{stats.total}</p>
 </div>
 <CreditCard className="h-8 w-8 text-muted-foreground" />
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">{t.financePayments.pendingApproval}</p>
 <p className="text-2xl font-bold">{stats.pending}</p>
 </div>
 <Clock className="h-8 w-8 text-yellow-500" />
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">{t.financePayments.totalAmount}</p>
 <p className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</p>
 </div>
 <DollarSign className="h-8 w-8 text-green-500" />
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm text-muted-foreground">{t.financePayments.completedThisMonth}</p>
 <p className="text-2xl font-bold">{stats.completedThisMonth}</p>
 </div>
 <CheckCircle className="h-8 w-8 text-blue-500" />
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Filters */}
 <Card className="mb-6">
 <CardContent className="pt-6">
 <div className="flex flex-wrap items-center gap-4">
 <div className="flex-1 min-w-[200px]">
 <div className="relative">
 <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
 <Input
 placeholder={t.financePayments.search}
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="ps-10"
 />
 </div>
 </div>
 <Select value={statusFilter} onValueChange={setStatusFilter}>
 <SelectTrigger className="w-[180px]">
 <SelectValue placeholder={t.financePayments.filterByStatus} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{t.financePayments.allStatuses}</SelectItem>
 <SelectItem value="draft">{t.financePayments.draft}</SelectItem>
 <SelectItem value="pending_approval">{t.financePayments.pending_approval}</SelectItem>
 <SelectItem value="approved">{t.financePayments.approved}</SelectItem>
 <SelectItem value="rejected">{t.financePayments.rejected}</SelectItem>
 <SelectItem value="processing">{t.financePayments.processing}</SelectItem>
 <SelectItem value="completed">{t.financePayments.completed}</SelectItem>
 <SelectItem value="cancelled">{t.financePayments.cancelled}</SelectItem>
 </SelectContent>
 </Select>
 <Select value={typeFilter} onValueChange={setTypeFilter}>
 <SelectTrigger className="w-[150px]">
 <SelectValue placeholder={t.financePayments.filterByType} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{t.financePayments.allTypes}</SelectItem>
 <SelectItem value="vendor">{t.financePayments.vendor}</SelectItem>
 <SelectItem value="staff">{t.financePayments.staff}</SelectItem>
 <SelectItem value="advance">{t.financePayments.advance}</SelectItem>
 <SelectItem value="refund">{t.financePayments.refund}</SelectItem>
 <SelectItem value="other">{t.financePayments.other}</SelectItem>
 </SelectContent>
 </Select>
 <Select value={methodFilter} onValueChange={setMethodFilter}>
 <SelectTrigger className="w-[180px]">
 <SelectValue placeholder={t.financePayments.filterByMethod} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{t.financePayments.allMethods}</SelectItem>
 <SelectItem value="bank_transfer">{t.financePayments.bank_transfer}</SelectItem>
 <SelectItem value="check">{t.financePayments.check}</SelectItem>
 <SelectItem value="cash">{t.financePayments.cash}</SelectItem>
 <SelectItem value="wire">{t.financePayments.wire}</SelectItem>
 <SelectItem value="mobile_money">{t.financePayments.mobile_money}</SelectItem>
 </SelectContent>
 </Select>
 <Button variant="outline" size="icon" onClick={() => refetch()}>
 <RefreshCw className="h-4 w-4" />
 </Button>
 </div>
 </CardContent>
 </Card>

 {/* Batch Actions Bar */}
 {selectedPaymentIds.length > 0 && (
 <Card className="mb-6 border-primary">
 <CardContent className="py-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <Badge variant="secondary" className="text-sm">
 <CheckCheck className="h-4 w-4 me-1" />
 {selectedPaymentIds.length} {t.financePayments.selectedCount}
 </Badge>
 <Button variant="ghost" size="sm" onClick={() => setSelectedPaymentIds([])}>
 {t.financePayments.clearSelection}
 </Button>
 </div>
 <div className="flex items-center gap-2">
 {getSelectedPaymentsByStatus().draft.length > 0 && (
 <Button
 variant="outline"
 size="sm"
 onClick={() => {
 setBatchAction('submit');
 setShowBatchDialog(true);
 }}
 >
 <Send className="h-4 w-4 me-1" />
 {t.financePayments.batchSubmit} ({getSelectedPaymentsByStatus().draft.length})
 </Button>
 )}
 {getSelectedPaymentsByStatus().pending.length > 0 && (
 <>
 <Button
 variant="outline"
 size="sm"
 onClick={() => {
 setBatchAction('approve');
 setShowBatchDialog(true);
 }}
 >
 <CheckCircle className="h-4 w-4 me-1" />
 {t.financePayments.batchApprove} ({getSelectedPaymentsByStatus().pending.length})
 </Button>
 <Button
 variant="outline"
 size="sm"
 onClick={() => {
 setBatchAction('reject');
 setShowBatchDialog(true);
 }}
 >
 <XCircle className="h-4 w-4 me-1" />
 {t.financePayments.batchReject} ({getSelectedPaymentsByStatus().pending.length})
 </Button>
 </>
 )}
 {getSelectedPaymentsByStatus().approved.length > 0 && (
 <Button
 variant="outline"
 size="sm"
 onClick={() => {
 setBatchAction('complete');
 setShowBatchDialog(true);
 }}
 >
 <Check className="h-4 w-4 me-1" />
 {t.financePayments.batchComplete} ({getSelectedPaymentsByStatus().approved.length})
 </Button>
 )}
 {getSelectedPaymentsByStatus().draft.length > 0 && (
 <Button
 variant="destructive"
 size="sm"
 onClick={() => {
 setBatchAction('delete');
 setShowBatchDialog(true);
 }}
 >
 <Trash2 className="h-4 w-4 me-1" />
 {t.financePayments.batchDelete} ({getSelectedPaymentsByStatus().draft.length})
 </Button>
 )}
 </div>
 </div>
 </CardContent>
 </Card>
 )}

 {/* Payments Table */}
 <Card>
 <CardContent className="pt-6">
 {isLoading ? (
 <div className="flex items-center justify-center py-12">
 <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
 </div>
 ) : !paymentsData?.payments?.length ? (
 <div className="flex flex-col items-center justify-center py-12 text-center">
 <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
 <h3 className="text-lg font-semibold">{t.financePayments.noPayments}</h3>
 <p className="text-muted-foreground mb-4">{t.financePayments.noPaymentsDescription}</p>
 <Button onClick={() => setShowCreateDialog(true)}>
 <Plus className="h-4 w-4 me-2" />
 {t.financePayments.createPayment}
 </Button>
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="border-b">
 <th className="py-3 px-2 w-10">
 <Checkbox
 checked={paymentsData?.payments?.length > 0 && selectedPaymentIds.length === paymentsData.payments.length}
 onCheckedChange={toggleSelectAll}
 />
 </th>
 <th className="py-3 px-4 text-start font-medium text-muted-foreground">{t.financePayments.paymentNumber}</th>
 <th className="py-3 px-4 text-start font-medium text-muted-foreground">{t.financePayments.payee}</th>
 <th className="py-3 px-4 text-start font-medium text-muted-foreground">{t.financePayments.type}</th>
 <th className="py-3 px-4 text-start font-medium text-muted-foreground">{t.financePayments.method}</th>
 <th className="py-3 px-4 text-end font-medium text-muted-foreground">{t.financePayments.amount}</th>
 <th className="py-3 px-4 text-start font-medium text-muted-foreground">{t.financePayments.date}</th>
 <th className="py-3 px-4 text-start font-medium text-muted-foreground">{t.financePayments.status}</th>
 <th className="py-3 px-4 text-start font-medium text-muted-foreground">{t.financePayments.actions}</th>
 </tr>
 </thead>
 <tbody>
 {paymentsData.payments.map((payment) => {
 const TypeIcon = getTypeIcon(payment.paymentType as PaymentType);
 return (
 <tr key={payment.id} className={`border-b hover:bg-muted/50 ${selectedPaymentIds.includes(payment.id) ? 'bg-muted/30' : ''}`}>
 <td className="py-3 px-2">
 <Checkbox
 checked={selectedPaymentIds.includes(payment.id)}
 onCheckedChange={() => togglePaymentSelection(payment.id)}
 />
 </td>
 <td className="py-3 px-4 font-mono text-sm">{payment.paymentNumber}</td>
 <td className="py-3 px-4">
 <div className="font-medium">{isRTL && payment.payeeNameAr ? payment.payeeNameAr : payment.payeeName}</div>
 </td>
 <td className="py-3 px-4">
 <div className="flex items-center gap-2">
 <TypeIcon className="h-4 w-4 text-muted-foreground" />
 {t[payment.paymentType as keyof typeof t] || payment.paymentType}
 </div>
 </td>
 <td className="py-3 px-4">
 {t[payment.paymentMethod as keyof typeof t] || payment.paymentMethod}
 </td>
 <td className="py-3 px-4 font-medium text-end">
 {formatCurrency(payment.totalAmount)}
 </td>
 <td className="py-3 px-4">{formatDate(payment.paymentDate)}</td>
 <td className="py-3 px-4">{getStatusBadge(payment.status as PaymentStatus)}</td>
 <td className="py-3 px-4">
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant="ghost" size="icon">
 <MoreHorizontal className="h-4 w-4" />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align={'end'}>
 <DropdownMenuItem onClick={() => {
 navigate(`/organization/finance/payments/${payment.id}`);
 }}>
 <Eye className="h-4 w-4 me-2" />
 {t.financePayments.view}
 </DropdownMenuItem>
 <DropdownMenuItem onClick={() => {
 setVersionHistoryPaymentId(payment.id);
 setShowVersionHistory(true);
 }}>
 <Layers className="h-4 w-4 me-2" />
 {t.financePayments.versionHistory}
 </DropdownMenuItem>
 <DropdownMenuSeparator />
 {payment.status === 'draft' && (
 <>
 <DropdownMenuItem onClick={() => {
 setSelectedPayment(payment);
 setFormData({
 ...formData,
 vendorId: payment.vendorId?.toString() || '',
 projectId: payment.projectId?.toString() || '',
 grantId: payment.grantId?.toString() || '',
 payeeName: payment.payeeName,
 payeeNameAr: payment.payeeNameAr || '',
 paymentType: payment.paymentType as PaymentType,
 paymentMethod: payment.paymentMethod as PaymentMethod,
 bankAccountId: payment.bankAccountId?.toString() || '',
 paymentDate: new Date(payment.paymentDate).toISOString().split('T')[0],
 dueDate: payment.dueDate ? new Date(payment.dueDate).toISOString().split('T')[0] : '',
 totalAmount: payment.totalAmount,
 description: payment.description || '',
 reference: payment.reference || '',
 payeeBankName: payment.payeeBankName || '',
 payeeBankAccount: payment.payeeBankAccount || '',
 payeeIban: payment.payeeIban || '',
 payeeSwiftCode: payment.payeeSwiftCode || '',
 });
 setShowCreateDialog(true);
 }}>
 <Edit className="h-4 w-4 me-2" />
 {t.financePayments.edit}
 </DropdownMenuItem>
 <DropdownMenuItem onClick={() => {
 setSelectedPayment(payment);
 setApprovalAction('submit');
 setShowApprovalDialog(true);
 }}>
 <Send className="h-4 w-4 me-2" />
 {t.financePayments.submit}
 </DropdownMenuItem>
 <DropdownMenuSeparator />
 <DropdownMenuItem 
 className="text-destructive"
 onClick={() => deleteMutation.mutate({ id: payment.id })}
 >
 <Trash2 className="h-4 w-4 me-2" />
 {t.financePayments.delete}
 </DropdownMenuItem>
 </>
 )}
 {payment.status === 'pending_approval' && (
 <>
 <DropdownMenuItem onClick={() => {
 setSelectedPayment(payment);
 setApprovalAction('approve');
 setShowApprovalDialog(true);
 }}>
 <CheckCircle className="h-4 w-4 me-2" />
 {t.financePayments.approve}
 </DropdownMenuItem>
 <DropdownMenuItem onClick={() => {
 setSelectedPayment(payment);
 setApprovalAction('reject');
 setShowApprovalDialog(true);
 }}>
 <XCircle className="h-4 w-4 me-2" />
 {t.financePayments.reject}
 </DropdownMenuItem>
 </>
 )}
 {(payment.status === 'approved' || payment.status === 'processing') && (
 <DropdownMenuItem onClick={() => {
 setSelectedPayment(payment);
 setApprovalAction('complete');
 setShowApprovalDialog(true);
 }}>
 <Check className="h-4 w-4 me-2" />
 {t.financePayments.complete}
 </DropdownMenuItem>
 )}
 {payment.status !== 'completed' && payment.status !== 'cancelled' && (
 <DropdownMenuItem onClick={() => {
 setSelectedPayment(payment);
 setApprovalAction('cancel');
 setShowApprovalDialog(true);
 }}>
 <Ban className="h-4 w-4 me-2" />
 {t.financePayments.cancel}
 </DropdownMenuItem>
 )}
 </DropdownMenuContent>
 </DropdownMenu>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 )}
 </CardContent>
 </Card>

 {/* Create/Edit Payment Dialog */}
 <Dialog open={showCreateDialog} onOpenChange={(open) => {
 setShowCreateDialog(open);
 if (!open) {
 setSelectedPayment(null);
 resetForm();
 }
 }}>
 <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>{selectedPayment ? t.financePayments.editPayment : t.financePayments.createNewPayment}</DialogTitle>
 </DialogHeader>
 <Tabs defaultValue="info" className="w-full">
 <TabsList className="grid w-full grid-cols-3">
 <TabsTrigger value="info">{t.financePayments.paymentInfo}</TabsTrigger>
 <TabsTrigger value="payee">{t.financePayments.payeeInfo}</TabsTrigger>
 <TabsTrigger value="bank">{t.financePayments.bankInfo}</TabsTrigger>
 </TabsList>
 <TabsContent value="info" className="space-y-4 mt-4">
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>{t.financePayments.paymentType}</Label>
 <Select value={formData.paymentType} onValueChange={(v) => setFormData({ ...formData, paymentType: v as PaymentType })}>
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="vendor">{t.financePayments.vendor}</SelectItem>
 <SelectItem value="staff">{t.financePayments.staff}</SelectItem>
 <SelectItem value="advance">{t.financePayments.advance}</SelectItem>
 <SelectItem value="refund">{t.financePayments.refund}</SelectItem>
 <SelectItem value="other">{t.financePayments.other}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2">
 <Label>{t.financePayments.paymentMethod}</Label>
 <Select value={formData.paymentMethod} onValueChange={(v) => setFormData({ ...formData, paymentMethod: v as PaymentMethod })}>
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="bank_transfer">{t.financePayments.bank_transfer}</SelectItem>
 <SelectItem value="check">{t.financePayments.check}</SelectItem>
 <SelectItem value="cash">{t.financePayments.cash}</SelectItem>
 <SelectItem value="wire">{t.financePayments.wire}</SelectItem>
 <SelectItem value="mobile_money">{t.financePayments.mobile_money}</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>{t.financePayments.paymentDate} *</Label>
 <Input
 type="date"
 value={formData.paymentDate}
 onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financePayments.dueDate}</Label>
 <Input
 type="date"
 value={formData.dueDate}
 onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
 />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>{t.financePayments.totalAmount} *</Label>
 <Input
 type="number"
 step="0.01"
 value={formData.totalAmount}
 onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
 placeholder="0.00"
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financePayments.reference}</Label>
 <Input
 value={formData.reference}
 onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
 placeholder={t.placeholders.invoicePoNumber}
 />
 </div>
 </div>
 <div className="space-y-2">
 <Label>{t.financePayments.bankAccount}</Label>
 <Select value={formData.bankAccountId} onValueChange={(v) => setFormData({ ...formData, bankAccountId: v })}>
 <SelectTrigger>
 <SelectValue placeholder={t.financePayments.selectBankAccount} />
 </SelectTrigger>
 <SelectContent>
 {bankAccountsData?.bankAccounts?.map((account: any) => (
 <SelectItem key={account.id} value={account.id.toString()}>
 {account.accountName} - {account.bankName}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2">
 <Label>{t.financePayments.description}</Label>
 <Textarea
 value={formData.description}
 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
 rows={3}
 />
 </div>
 </TabsContent>
 <TabsContent value="payee" className="space-y-4 mt-4">
 <div className="space-y-2">
 <Label>{t.financePayments.selectVendor}</Label>
 <Select value={formData.vendorId} onValueChange={(v) => {
 const vendor = vendorsData?.find((vnd: any) => vnd.id.toString() === v);
 setFormData({ 
 ...formData, 
 vendorId: v,
 payeeName: vendor?.name || formData.payeeName,
 });
 }}>
 <SelectTrigger>
 <SelectValue placeholder={t.financePayments.selectVendor} />
 </SelectTrigger>
 <SelectContent>
 {vendorsData?.map((vendor: any) => (
 <SelectItem key={vendor.id} value={vendor.id.toString()}>
 {vendor.vendorCode} - {vendor.name}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>{t.financePayments.payeeName} *</Label>
 <Input
 value={formData.payeeName}
 onChange={(e) => setFormData({ ...formData, payeeName: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financePayments.payeeNameAr}</Label>
 <Input
 value={formData.payeeNameAr}
 onChange={(e) => setFormData({ ...formData, payeeNameAr: e.target.value })}
 dir="rtl"
 />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>{t.financePayments.selectProject}</Label>
 <Select value={formData.projectId} onValueChange={(v) => setFormData({ ...formData, projectId: v })}>
 <SelectTrigger>
 <SelectValue placeholder={t.financePayments.selectProject} />
 </SelectTrigger>
 <SelectContent>
 {(projectsData || []).map((project: any) => (
 <SelectItem key={project.id} value={project.id.toString()}>
 {project.projectCode || project.code} - {isRTL && project.titleAr ? project.titleAr : project.title}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2">
 <Label>{t.financePayments.selectGrant}</Label>
 <Select value={formData.grantId} onValueChange={(v) => setFormData({ ...formData, grantId: v })}>
 <SelectTrigger>
 <SelectValue placeholder={t.financePayments.selectGrant} />
 </SelectTrigger>
 <SelectContent>
 {/* Grant options would be loaded here */}
 </SelectContent>
 </Select>
 </div>
 </div>
 </TabsContent>
 <TabsContent value="bank" className="space-y-4 mt-4">
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>{t.financePayments.payeeBankName}</Label>
 <Input
 value={formData.payeeBankName}
 onChange={(e) => setFormData({ ...formData, payeeBankName: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financePayments.payeeBankAccount}</Label>
 <Input
 value={formData.payeeBankAccount}
 onChange={(e) => setFormData({ ...formData, payeeBankAccount: e.target.value })}
 />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>{t.financePayments.payeeIban}</Label>
 <Input
 value={formData.payeeIban}
 onChange={(e) => setFormData({ ...formData, payeeIban: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.financePayments.payeeSwiftCode}</Label>
 <Input
 value={formData.payeeSwiftCode}
 onChange={(e) => setFormData({ ...formData, payeeSwiftCode: e.target.value })}
 />
 </div>
 </div>
 </TabsContent>
 </Tabs>
 <DialogFooter>
 <Button variant="outline" onClick={() => {
 setShowCreateDialog(false);
 setSelectedPayment(null);
 resetForm();
 }}>
 {t.financePayments.cancel}
 </Button>
 <Button 
 onClick={handleCreate}
 disabled={createMutation.isPending || updateMutation.isPending}
 >
 {createMutation.isPending || updateMutation.isPending ? t.financePayments.saving : t.financePayments.save}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* View Payment Dialog */}
 <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
 <DialogContent className="max-w-2xl">
 <DialogHeader>
 <DialogTitle>{t.financePayments.paymentDetails}</DialogTitle>
 </DialogHeader>
 {selectedPayment && (
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <span className="font-mono text-lg">{selectedPayment.paymentNumber}</span>
 {getStatusBadge(selectedPayment.status)}
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label className="text-muted-foreground">{t.financePayments.payee}</Label>
 <p className="font-medium">{isRTL && selectedPayment.payeeNameAr ? selectedPayment.payeeNameAr : selectedPayment.payeeName}</p>
 </div>
 <div>
 <Label className="text-muted-foreground">{t.financePayments.amount}</Label>
 <p className="font-medium text-lg">{formatCurrency(selectedPayment.totalAmount)}</p>
 </div>
 <div>
 <Label className="text-muted-foreground">{t.financePayments.type}</Label>
 <p>{t[selectedPayment.paymentType as keyof typeof t] || selectedPayment.paymentType}</p>
 </div>
 <div>
 <Label className="text-muted-foreground">{t.financePayments.method}</Label>
 <p>{t[selectedPayment.paymentMethod as keyof typeof t] || selectedPayment.paymentMethod}</p>
 </div>
 <div>
 <Label className="text-muted-foreground">{t.financePayments.paymentDate}</Label>
 <p>{formatDate(selectedPayment.paymentDate)}</p>
 </div>
 {selectedPayment.reference && (
 <div>
 <Label className="text-muted-foreground">{t.financePayments.reference}</Label>
 <p>{selectedPayment.reference}</p>
 </div>
 )}
 </div>
 {selectedPayment.description && (
 <div>
 <Label className="text-muted-foreground">{t.financePayments.description}</Label>
 <p>{selectedPayment.description}</p>
 </div>
 )}
 </div>
 )}
 </DialogContent>
 </Dialog>

 {/* Approval Action Dialog */}
 <Dialog open={showApprovalDialog} onOpenChange={(open) => {
 setShowApprovalDialog(open);
 if (!open) {
 setApprovalAction(null);
 setApprovalNotes('');
 setTransactionRef('');
 }
 }}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>
 {approvalAction === 'submit' && t.financePayments.confirmSubmit}
 {approvalAction === 'approve' && t.financePayments.confirmApprove}
 {approvalAction === 'reject' && t.financePayments.confirmReject}
 {approvalAction === 'cancel' && t.financePayments.confirmCancel}
 {approvalAction === 'complete' && t.financePayments.confirmComplete}
 </DialogTitle>
 <DialogDescription>
 {approvalAction === 'submit' && t.financePayments.submitMessage}
 {approvalAction === 'approve' && t.financePayments.approveMessage}
 {approvalAction === 'reject' && t.financePayments.rejectMessage}
 {approvalAction === 'cancel' && t.financePayments.cancelMessage}
 {approvalAction === 'complete' && t.financePayments.completeMessage}
 </DialogDescription>
 </DialogHeader>
 {(approvalAction === 'approve' || approvalAction === 'reject' || approvalAction === 'cancel') && (
 <div className="space-y-2">
 <Label>
 {approvalAction === 'approve' && t.financePayments.approvalNotes}
 {approvalAction === 'reject' && t.financePayments.rejectionReason}
 {approvalAction === 'cancel' && t.financePayments.cancellationReason}
 {(approvalAction === 'reject' || approvalAction === 'cancel') && ' *'}
 </Label>
 <Textarea
 value={approvalNotes}
 onChange={(e) => setApprovalNotes(e.target.value)}
 rows={3}
 />
 </div>
 )}
 {approvalAction === 'complete' && (
 <div className="space-y-2">
 <Label>{t.financePayments.transactionReference}</Label>
 <Input
 value={transactionRef}
 onChange={(e) => setTransactionRef(e.target.value)}
 placeholder={t.placeholders.bankTransactionReference}
 />
 </div>
 )}
 <DialogFooter>
 <Button variant="outline" onClick={() => {
 setShowApprovalDialog(false);
 setApprovalAction(null);
 setApprovalNotes('');
 setTransactionRef('');
 }}>
 {t.financePayments.cancel}
 </Button>
 <Button 
 onClick={handleApprovalAction}
 variant={approvalAction === 'reject' || approvalAction === 'cancel' ? 'destructive' : 'default'}
 disabled={
 submitMutation.isPending || 
 approveMutation.isPending || 
 rejectMutation.isPending || 
 cancelMutation.isPending ||
 completeMutation.isPending
 }
 >
 {approvalAction === 'submit' && t.financePayments.submit}
 {approvalAction === 'approve' && t.financePayments.approve}
 {approvalAction === 'reject' && t.financePayments.reject}
 {approvalAction === 'cancel' && t.financePayments.cancel}
 {approvalAction === 'complete' && t.financePayments.complete}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Batch Action Dialog */}
 <Dialog open={showBatchDialog} onOpenChange={(open) => {
 setShowBatchDialog(open);
 if (!open) {
 setBatchAction(null);
 setApprovalNotes('');
 }
 }}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>{t.financePayments.confirmBatchAction}</DialogTitle>
 <DialogDescription>
 {t.financePayments.batchActionMessage}
 </DialogDescription>
 </DialogHeader>
 <div className="py-4">
 <p className="text-sm text-muted-foreground mb-2">
 {batchAction === 'submit' && `${getSelectedPaymentsByStatus().draft.length} draft payment(s) will be submitted for approval.`}
 {batchAction === 'approve' && `${getSelectedPaymentsByStatus().pending.length} pending payment(s) will be approved.`}
 {batchAction === 'reject' && `${getSelectedPaymentsByStatus().pending.length} pending payment(s) will be rejected.`}
 {batchAction === 'complete' && `${getSelectedPaymentsByStatus().approved.length} approved payment(s) will be marked as completed.`}
 {batchAction === 'delete' && `${getSelectedPaymentsByStatus().draft.length} draft payment(s) will be deleted.`}
 </p>
 </div>
 {batchAction === 'reject' && (
 <div className="space-y-2">
 <Label>{t.financePayments.rejectionReason} *</Label>
 <Textarea
 value={approvalNotes}
 onChange={(e) => setApprovalNotes(e.target.value)}
 rows={3}
 placeholder={t.placeholders.pleaseProvideAReasonForRejection}
 />
 </div>
 )}
 <DialogFooter>
 <Button variant="outline" onClick={() => {
 setShowBatchDialog(false);
 setBatchAction(null);
 setApprovalNotes('');
 }}>
 {t.financePayments.cancel}
 </Button>
 <Button 
 onClick={handleBatchAction}
 variant={batchAction === 'reject' || batchAction === 'delete' ? 'destructive' : 'default'}
 disabled={
 batchSubmitMutation.isPending || 
 batchApproveMutation.isPending || 
 batchRejectMutation.isPending || 
 batchCompleteMutation.isPending ||
 batchDeleteMutation.isPending
 }
 >
 {batchAction === 'submit' && t.financePayments.batchSubmit}
 {batchAction === 'approve' && t.financePayments.batchApprove}
 {batchAction === 'reject' && t.financePayments.batchReject}
 {batchAction === 'complete' && t.financePayments.batchComplete}
 {batchAction === 'delete' && t.financePayments.batchDelete}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Version History Modal */}
 <VersionHistoryModal
 open={showVersionHistory}
 onOpenChange={(open) => {
 setShowVersionHistory(open);
 if (!open) setVersionHistoryPaymentId(null);
 }}
 versions={versionHistoryData || []}
 title={versionHistoryData?.[0]?.paymentNumber || t.financePayments.payment}
 isLoading={isLoadingVersions}
 language={language as 'en' | 'ar'}
 renderVersionDetails={(version) => (
 <div className="grid grid-cols-2 gap-2 text-sm">
 <div>
 <span className="font-medium">{t.financePayments.payee}:</span> {version.payeeName}
 </div>
 <div>
 <span className="font-medium">{t.financePayments.amount}:</span> {version.totalAmount}
 </div>
 <div>
 <span className="font-medium">{t.financePayments.type}:</span> {t[version.paymentType as PaymentType]}
 </div>
 <div>
 <span className="font-medium">{t.financePayments.method}:</span> {t[version.paymentMethod as PaymentMethod]}
 </div>
 <div>
 <span className="font-medium">{t.financePayments.status}:</span> {t[version.status as PaymentStatus]}
 </div>
 <div>
 <span className="font-medium">{t.financePayments.date}:</span> {new Date(version.paymentDate).toLocaleDateString('en-US')}
 </div>
 </div>
 )}
 />
 </div>
 </div>
 );
}
