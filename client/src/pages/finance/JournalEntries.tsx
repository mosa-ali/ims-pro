/**
 * Journal Entries Page
 * General Ledger journal entries with double-entry bookkeeping
 * Features: CRUD, Posting, Reversal, Trial Balance, Account Ledger
 */

import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from '@/components/ui/dialog';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
 ArrowLeft, ArrowRight,
 Plus,
 Pencil,
 Trash2,
 Search,
 FileText,
 CheckCircle2,
 RotateCcw,
 Eye,
 Loader2,
 X,
} from 'lucide-react';
import { Link } from 'wouter';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

// Translations
const entryTypeOptions = [
 { value: 'standard', labelEn: 'Standard', labelAr: 'قياسي' },
 { value: 'adjusting', labelEn: 'Adjusting', labelAr: 'تسوية' },
 { value: 'closing', labelEn: 'Closing', labelAr: 'إقفال' },
 { value: 'reversing', labelEn: 'Reversing', labelAr: 'عكسي' },
 { value: 'opening', labelEn: 'Opening', labelAr: 'افتتاحي' },
];

const statusOptions = [
 { value: 'draft', labelEn: 'Draft', labelAr: 'مسودة' },
 { value: 'posted', labelEn: 'Posted', labelAr: 'مرحّل' },
 { value: 'reversed', labelEn: 'Reversed', labelAr: 'معكوس' },
];

export default function JournalEntriesPage() {
 const { t } = useTranslation();
 const { language, isRTL} = useLanguage();
 const { organizationId, operatingUnitId } = useOrganization();

 const [activeTab, setActiveTab] = useState('journal-entries');
 const [searchTerm, setSearchTerm] = useState('');
 const [statusFilter, setStatusFilter] = useState<string>('');
 const [entryTypeFilter, setEntryTypeFilter] = useState<string>('');
 const [showCreateDialog, setShowCreateDialog] = useState(false);
 const [showEditDialog, setShowEditDialog] = useState(false);
 const [showViewDialog, setShowViewDialog] = useState(false);
 const [selectedEntry, setSelectedEntry] = useState<any>(null);
 const [selectedAccountForLedger, setSelectedAccountForLedger] = useState<number | null>(null);

 // Journal Entry Form State
 const [entryForm, setEntryForm] = useState({
 entryDate: new Date().toISOString().split('T')[0],
 entryType: 'standard' as const,
 description: '',
 descriptionAr: '',
 lines: [
 { lineNumber: 1, glAccountId: 0, description: '', debitAmount: '0.00', creditAmount: '0.00' },
 { lineNumber: 2, glAccountId: 0, description: '', debitAmount: '0.00', creditAmount: '0.00' },
 ],
 });

 // Queries
 const entriesQuery = trpc.journalEntries.list.useQuery(
 {
 organizationId: organizationId || 0,
 operatingUnitId,
 status: statusFilter as any,
 entryType: entryTypeFilter as any,
 limit: 100,
 },
 { enabled: !!organizationId }
 );

 const glAccountsQuery = trpc.glAccounts.list.useQuery(
 { organizationId: organizationId || 0, limit: 500 },
 { enabled: !!organizationId }
 );

 const trialBalanceQuery = trpc.journalEntries.getTrialBalance.useQuery(
 { organizationId: organizationId || 0, operatingUnitId },
 { enabled: !!organizationId && activeTab === 'trial-balance' }
 );

 const accountLedgerQuery = trpc.journalEntries.getAccountLedger.useQuery(
 {
 organizationId: organizationId || 0,
 glAccountId: selectedAccountForLedger || 0,
 limit: 100,
 },
 { enabled: !!organizationId && !!selectedAccountForLedger && activeTab === 'account-ledger' }
 );

 // Mutations
 const createMutation = trpc.journalEntries.create.useMutation({
 onSuccess: () => {
 toast.success(t.journalEntries.createSuccess);
 setShowCreateDialog(false);
 resetForm();
 entriesQuery.refetch();
 },
 onError: (error) => toast.error(error.message),
 });

 const updateMutation = trpc.journalEntries.update.useMutation({
 onSuccess: () => {
 toast.success(t.journalEntries.updateSuccess);
 setShowEditDialog(false);
 entriesQuery.refetch();
 },
 onError: (error) => toast.error(error.message),
 });

 const postMutation = trpc.journalEntries.post.useMutation({
 onSuccess: () => {
 toast.success(t.journalEntries.postSuccess);
 entriesQuery.refetch();
 trialBalanceQuery.refetch();
 },
 onError: (error) => toast.error(error.message),
 });

 const reverseMutation = trpc.journalEntries.reverse.useMutation({
 onSuccess: () => {
 toast.success(t.journalEntries.reverseSuccess);
 entriesQuery.refetch();
 trialBalanceQuery.refetch();
 },
 onError: (error) => toast.error(error.message),
 });

 const deleteMutation = trpc.journalEntries.delete.useMutation({
 onSuccess: () => {
 toast.success(t.journalEntries.deleteSuccess);
 entriesQuery.refetch();
 },
 onError: (error) => toast.error(error.message),
 });

 // Filtered entries
 const filteredEntries = useMemo(() => {
 if (!entriesQuery.data) return [];
 return entriesQuery.data.filter((entry: any) =>
 entry.entryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
 entry.description?.toLowerCase().includes(searchTerm.toLowerCase())
 );
 }, [entriesQuery.data, searchTerm]);

 const resetForm = () => {
 setEntryForm({
 entryDate: new Date().toISOString().split('T')[0],
 entryType: 'standard',
 description: '',
 descriptionAr: '',
 lines: [
 { lineNumber: 1, glAccountId: 0, description: '', debitAmount: '0.00', creditAmount: '0.00' },
 { lineNumber: 2, glAccountId: 0, description: '', debitAmount: '0.00', creditAmount: '0.00' },
 ],
 });
 };

 const handleCreateEntry = () => {
 // Validate
 const totalDebit = entryForm.lines.reduce((sum, line) => sum + parseFloat(line.debitAmount || '0'), 0);
 const totalCredit = entryForm.lines.reduce((sum, line) => sum + parseFloat(line.creditAmount || '0'), 0);

 if (Math.abs(totalDebit - totalCredit) > 0.01) {
 toast.error(t.journalEntries.balanceError);
 return;
 }

 createMutation.mutate({
 organizationId: organizationId || 0,
 operatingUnitId,
 entryDate: entryForm.entryDate,
 entryType: entryForm.entryType,
 description: entryForm.description,
 descriptionAr: entryForm.descriptionAr,
 lines: entryForm.lines.filter(line => line.glAccountId > 0),
 });
 };

 const handleAddLine = () => {
 setEntryForm({
 ...entryForm,
 lines: [
 ...entryForm.lines,
 {
 lineNumber: entryForm.lines.length + 1,
 glAccountId: 0,
 description: '',
 debitAmount: '0.00',
 creditAmount: '0.00',
 },
 ],
 });
 };

 const handleRemoveLine = (index: number) => {
 if (entryForm.lines.length <= 2) {
 toast.error('At least 2 lines are required');
 return;
 }
 const newLines = entryForm.lines.filter((_, i) => i !== index);
 // Renumber lines
 newLines.forEach((line, i) => {
 line.lineNumber = i + 1;
 });
 setEntryForm({ ...entryForm, lines: newLines });
 };

 const handlePostEntry = (entry: any) => {
 if (window.confirm(t.journalEntries.confirmPost)) {
 postMutation.mutate({ id: entry.id });
 }
 };

 const handleReverseEntry = (entry: any) => {
 if (window.confirm(t.journalEntries.confirmReverse)) {
 reverseMutation.mutate({
 id: entry.id,
 reversalDate: new Date().toISOString().split('T')[0],
 });
 }
 };

 const handleDeleteEntry = (entry: any) => {
 if (window.confirm(t.journalEntries.confirmDelete)) {
 deleteMutation.mutate({ id: entry.id });
 }
 };

 const getStatusBadge = (status: string) => {
 const statusColors: Record<string, string> = {
 draft: 'bg-gray-100 text-gray-800',
 posted: 'bg-green-100 text-green-800',
 reversed: 'bg-red-100 text-red-800',
 void: 'bg-gray-100 text-gray-500',
 };
 const statusLabels: Record<string, string> = {
 draft: t.financeModule.draft,
 posted: t.financeModule.posted,
 reversed: t.financeModule.reversed,
 void: t.financeModule.void,
 };
 return (
 <Badge className={statusColors[status] || 'bg-gray-100'}>
 {statusLabels[status] || status}
 </Badge>
 );
 };

 const formatCurrency = (amount: string | number) => {
 const num = typeof amount === 'string' ? parseFloat(amount) : amount;
 return new Intl.NumberFormat('en-US', {
 minimumFractionDigits: 2,
 maximumFractionDigits: 2,
 }).format(num);
 };

 const formatDate = (date: string | Date) => {
 return new Date(date).toLocaleDateString('en-US');
 };

 const calculateTotals = () => {
 const totalDebit = entryForm.lines.reduce((sum, line) => sum + parseFloat(line.debitAmount || '0'), 0);
 const totalCredit = entryForm.lines.reduce((sum, line) => sum + parseFloat(line.creditAmount || '0'), 0);
 const difference = totalDebit - totalCredit;
 return { totalDebit, totalCredit, difference };
 };

 const totals = calculateTotals();

 if (!organizationId) {
 return (
 <div className="flex items-center justify-center h-screen" dir={isRTL ? 'rtl' : 'ltr'}>
 <p className="text-muted-foreground">{t.journalEntries.loading}</p>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-background">
 {/* Header */}
 <div className="bg-card border-b">
 <div className="container py-6">
 <div className="flex items-center justify-between">
 <div>
 <Link href="/organization/finance">
 <BackButton label={t.journalEntries.backToFinance} />
 </Link>
 <h1 className="text-3xl font-bold text-foreground">{t.journalEntries.title}</h1>
 <p className="text-muted-foreground mt-1">{t.journalEntries.subtitle}</p>
 </div>
 <div>
 <Button onClick={() => setShowCreateDialog(true)}>
 <Plus className="h-4 w-4 me-2" />
 {t.journalEntries.newEntry}
 </Button>
 </div>
 </div>
 </div>
 </div>

 {/* Main Content */}
 <div className="container py-8">
 <Tabs value={activeTab} onValueChange={setActiveTab}>
 <TabsList>
 <TabsTrigger value="journal-entries" className="flex items-center gap-2">
 <FileText className="h-4 w-4" />
 {t.journalEntries.journalEntries}
 </TabsTrigger>
 <TabsTrigger value="trial-balance" className="flex items-center gap-2">
 <CheckCircle2 className="h-4 w-4" />
 {t.journalEntries.trialBalance}
 </TabsTrigger>
 <TabsTrigger value="account-ledger" className="flex items-center gap-2">
 <FileText className="h-4 w-4" />
 {t.journalEntries.accountLedger}
 </TabsTrigger>
 </TabsList>

 {/* Journal Entries Tab */}
 <TabsContent value="journal-entries">
 {/* Filters */}
 <Card className="mb-6">
 <CardContent className="pt-6">
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div className="relative">
 <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
 <Input
 placeholder={t.journalEntries.search}
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="ps-10"
 />
 </div>
 <Select value={statusFilter} onValueChange={setStatusFilter}>
 <SelectTrigger>
 <SelectValue placeholder={t.journalEntries.status} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{t.financeModule.all}</SelectItem>
 {statusOptions.map((option) => (
 <SelectItem key={option.value} value={option.value}>
 {language === 'ar' ? option.labelAr : option.labelEn}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 <Select value={entryTypeFilter} onValueChange={setEntryTypeFilter}>
 <SelectTrigger>
 <SelectValue placeholder={t.journalEntries.entryType} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{t.financeModule.all}</SelectItem>
 {entryTypeOptions.map((option) => (
 <SelectItem key={option.value} value={option.value}>
 {language === 'ar' ? option.labelAr : option.labelEn}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </CardContent>
 </Card>

 {/* Journal Entries Table */}
 <Card>
 <CardHeader>
 <CardTitle>{t.journalEntries.journalEntries}</CardTitle>
 </CardHeader>
 <CardContent>
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.journalEntries.entryNumber}</TableHead>
 <TableHead>{t.journalEntries.entryDate}</TableHead>
 <TableHead>{t.journalEntries.entryType}</TableHead>
 <TableHead>{t.journalEntries.description}</TableHead>
 <TableHead className="text-end">{t.journalEntries.totalDebit}</TableHead>
 <TableHead className="text-end">{t.journalEntries.totalCredit}</TableHead>
 <TableHead>{t.journalEntries.status}</TableHead>
 <TableHead className="text-center">{t.financeModule.actions}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {entriesQuery.isLoading ? (
 <TableRow>
 <TableCell colSpan={8} className="text-center py-8">
 <Loader2 className="h-6 w-6 animate-spin mx-auto" />
 </TableCell>
 </TableRow>
 ) : !filteredEntries.length ? (
 <TableRow>
 <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
 {t.journalEntries.noEntries}
 </TableCell>
 </TableRow>
 ) : (
 filteredEntries.map((entry: any) => (
 <TableRow key={entry.id}>
 <TableCell className="font-medium">{entry.entryNumber}</TableCell>
 <TableCell>{formatDate(entry.entryDate)}</TableCell>
 <TableCell>
 {entryTypeOptions.find(o => o.value === entry.entryType)?.[t.financeModule.labelen]}
 </TableCell>
 <TableCell className="max-w-xs truncate">
 {language === 'ar' ? entry.descriptionAr || entry.description : entry.description}
 </TableCell>
 <TableCell className="text-end">{formatCurrency(entry.totalDebit || 0)}</TableCell>
 <TableCell className="text-end">{formatCurrency(entry.totalCredit || 0)}</TableCell>
 <TableCell>{getStatusBadge(entry.status)}</TableCell>
 <TableCell>
 <div className="flex items-center justify-end gap-1">
 <Button variant="ghost" size="icon" onClick={() => setSelectedEntry(entry)}>
 <Eye className="h-4 w-4" />
 </Button>
 {entry.status === 'draft' && (
 <>
 <Button variant="ghost" size="icon" onClick={() => handlePostEntry(entry)}>
 <CheckCircle2 className="h-4 w-4 text-green-600" />
 </Button>
 <Button variant="ghost" size="icon" onClick={() => handleDeleteEntry(entry)}>
 <Trash2 className="h-4 w-4 text-red-600" />
 </Button>
 </>
 )}
 {entry.status === 'posted' && (
 <Button variant="ghost" size="icon" onClick={() => handleReverseEntry(entry)}>
 <RotateCcw className="h-4 w-4 text-orange-600" />
 </Button>
 )}
 </div>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </CardContent>
 </Card>
 </TabsContent>

 {/* Trial Balance Tab */}
 <TabsContent value="trial-balance">
 <Card>
 <CardHeader>
 <CardTitle>{t.journalEntries.trialBalanceReport}</CardTitle>
 </CardHeader>
 <CardContent>
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.journalEntries.accountCode}</TableHead>
 <TableHead>{t.journalEntries.accountName}</TableHead>
 <TableHead>{t.journalEntries.accountType}</TableHead>
 <TableHead className="text-end">{t.journalEntries.totalDebit}</TableHead>
 <TableHead className="text-end">{t.journalEntries.totalCredit}</TableHead>
 <TableHead className="text-end">{t.journalEntries.balance}</TableHead>
 <TableHead>{t.journalEntries.balanceType}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {trialBalanceQuery.isLoading ? (
 <TableRow>
 <TableCell colSpan={7} className="text-center py-8">
 <Loader2 className="h-6 w-6 animate-spin mx-auto" />
 </TableCell>
 </TableRow>
 ) : !trialBalanceQuery.data?.length ? (
 <TableRow>
 <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
 {t.financeModule.noData}
 </TableCell>
 </TableRow>
 ) : (
 trialBalanceQuery.data.map((row: any) => (
 <TableRow key={row.glAccountId}>
 <TableCell className="font-medium">{row.accountCode}</TableCell>
 <TableCell>{language === 'ar' ? row.accountNameAr || row.accountName : row.accountName}</TableCell>
 <TableCell>{row.accountType}</TableCell>
 <TableCell className="text-end">{formatCurrency(row.totalDebit)}</TableCell>
 <TableCell className="text-end">{formatCurrency(row.totalCredit)}</TableCell>
 <TableCell className="text-end font-medium">{formatCurrency(row.balance)}</TableCell>
 <TableCell>
 <Badge className={row.balanceType === 'debit' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
 {row.balanceType === 'debit' ? t.journalEntries.debit : t.journalEntries.credit}
 </Badge>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </CardContent>
 </Card>
 </TabsContent>

 {/* Account Ledger Tab */}
 <TabsContent value="account-ledger">
 <Card className="mb-6">
 <CardContent className="pt-6">
 <div className="max-w-md">
 <Label>{t.journalEntries.selectAccount}</Label>
 <Select value={selectedAccountForLedger?.toString() || ''} onValueChange={(v) => setSelectedAccountForLedger(parseInt(v))}>
 <SelectTrigger>
 <SelectValue placeholder={t.journalEntries.selectAccount} />
 </SelectTrigger>
 <SelectContent>
 {glAccountsQuery.data?.map((account: any) => (
 <SelectItem key={account.id} value={account.id.toString()}>
 {account.accountCode} - {language === 'ar' ? account.accountNameAr || account.accountName : account.accountName}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </CardContent>
 </Card>

 {selectedAccountForLedger && (
 <Card>
 <CardHeader>
 <CardTitle>{t.journalEntries.accountLedger}</CardTitle>
 </CardHeader>
 <CardContent>
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.journalEntries.entryNumber}</TableHead>
 <TableHead>{t.journalEntries.entryDate}</TableHead>
 <TableHead>{t.journalEntries.description}</TableHead>
 <TableHead className="text-end">{t.journalEntries.debitAmount}</TableHead>
 <TableHead className="text-end">{t.journalEntries.creditAmount}</TableHead>
 <TableHead className="text-end">{t.journalEntries.runningBalance}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {accountLedgerQuery.isLoading ? (
 <TableRow>
 <TableCell colSpan={6} className="text-center py-8">
 <Loader2 className="h-6 w-6 animate-spin mx-auto" />
 </TableCell>
 </TableRow>
 ) : !accountLedgerQuery.data?.length ? (
 <TableRow>
 <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
 {t.financeModule.noTransactions}
 </TableCell>
 </TableRow>
 ) : (
 accountLedgerQuery.data.map((row: any) => (
 <TableRow key={row.id}>
 <TableCell className="font-medium">{row.entryNumber}</TableCell>
 <TableCell>{formatDate(row.entryDate)}</TableCell>
 <TableCell className="max-w-xs truncate">
 {language === 'ar' ? row.descriptionAr || row.description : row.description}
 </TableCell>
 <TableCell className="text-end">{formatCurrency(row.debitAmount || 0)}</TableCell>
 <TableCell className="text-end">{formatCurrency(row.creditAmount || 0)}</TableCell>
 <TableCell className="text-end font-medium">{formatCurrency(row.balance)}</TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </CardContent>
 </Card>
 )}
 </TabsContent>
 </Tabs>
 </div>

 {/* Create Journal Entry Dialog */}
 <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
 <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>{t.journalEntries.newEntry}</DialogTitle>
 </DialogHeader>
 <div className="space-y-6 py-4">
 {/* Header Fields */}
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>{t.journalEntries.entryDate}</Label>
 <Input
 type="date"
 value={entryForm.entryDate}
 onChange={(e) => setEntryForm({ ...entryForm, entryDate: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.journalEntries.entryType}</Label>
 <Select value={entryForm.entryType} onValueChange={(v: any) => setEntryForm({ ...entryForm, entryType: v })}>
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {entryTypeOptions.map((option) => (
 <SelectItem key={option.value} value={option.value}>
 {language === 'ar' ? option.labelAr : option.labelEn}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>
 <div className="space-y-2">
 <Label>{t.journalEntries.description}</Label>
 <Textarea
 value={entryForm.description}
 onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
 rows={2}
 />
 </div>
 {language === 'ar' && (
 <div className="space-y-2">
 <Label>{t.journalEntries.description} (عربي)</Label>
 <Textarea
 value={entryForm.descriptionAr}
 onChange={(e) => setEntryForm({ ...entryForm, descriptionAr: e.target.value })}
 rows={2}
 />
 </div>
 )}

 {/* Journal Lines */}
 <div>
 <div className="flex items-center justify-between mb-4">
 <Label className="text-lg font-semibold">{t.journalEntries.lines}</Label>
 <Button variant="outline" size="sm" onClick={handleAddLine}>
 <Plus className="h-4 w-4 me-2" />
 {t.journalEntries.addLine}
 </Button>
 </div>

 <div className="space-y-4">
 {entryForm.lines.map((line, index) => (
 <Card key={index}>
 <CardContent className="pt-4">
 <div className="grid grid-cols-12 gap-4 items-end">
 <div className="col-span-1">
 <Label>{t.journalEntries.lineNumber}</Label>
 <Input value={line.lineNumber} disabled />
 </div>
 <div className="col-span-4">
 <Label>{t.journalEntries.glAccount}</Label>
 <Select
 value={line.glAccountId.toString()}
 onValueChange={(v) => {
 const newLines = [...entryForm.lines];
 newLines[index].glAccountId = parseInt(v);
 setEntryForm({ ...entryForm, lines: newLines });
 }}
 >
 <SelectTrigger>
 <SelectValue placeholder={t.journalEntries.selectGLAccount} />
 </SelectTrigger>
 <SelectContent>
 {glAccountsQuery.data?.map((account: any) => (
 <SelectItem key={account.id} value={account.id.toString()}>
 {account.accountCode} - {language === 'ar' ? account.accountNameAr || account.accountName : account.accountName}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div className="col-span-3">
 <Label>{t.journalEntries.debitAmount}</Label>
 <Input
 type="number"
 step="0.01"
 value={line.debitAmount}
 onChange={(e) => {
 const newLines = [...entryForm.lines];
 newLines[index].debitAmount = e.target.value;
 newLines[index].creditAmount = '0.00';
 setEntryForm({ ...entryForm, lines: newLines });
 }}
 />
 </div>
 <div className="col-span-3">
 <Label>{t.journalEntries.creditAmount}</Label>
 <Input
 type="number"
 step="0.01"
 value={line.creditAmount}
 onChange={(e) => {
 const newLines = [...entryForm.lines];
 newLines[index].creditAmount = e.target.value;
 newLines[index].debitAmount = '0.00';
 setEntryForm({ ...entryForm, lines: newLines });
 }}
 />
 </div>
 <div className="col-span-1">
 <Button
 variant="ghost"
 size="icon"
 onClick={() => handleRemoveLine(index)}
 disabled={entryForm.lines.length <= 2}
 >
 <X className="h-4 w-4 text-red-600" />
 </Button>
 </div>
 </div>
 </CardContent>
 </Card>
 ))}
 </div>

 {/* Totals */}
 <Card className="mt-4 bg-muted/50">
 <CardContent className="pt-4">
 <div className="grid grid-cols-3 gap-4 text-sm">
 <div>
 <span className="text-muted-foreground">{t.journalEntries.totalDebit}:</span>
 <span className="font-semibold ms-2">{formatCurrency(totals.totalDebit)}</span>
 </div>
 <div>
 <span className="text-muted-foreground">{t.journalEntries.totalCredit}:</span>
 <span className="font-semibold ms-2">{formatCurrency(totals.totalCredit)}</span>
 </div>
 <div>
 <span className="text-muted-foreground">{t.financeModule.difference}:</span>
 <span className={`font-semibold ms-2 ${Math.abs(totals.difference) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
 {formatCurrency(Math.abs(totals.difference))}
 </span>
 </div>
 </div>
 {Math.abs(totals.difference) > 0.01 && (
 <p className="text-sm text-red-600 mt-2">{t.journalEntries.balanceError}</p>
 )}
 </CardContent>
 </Card>
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
 {t.journalEntries.cancel}
 </Button>
 <Button onClick={handleCreateEntry} disabled={createMutation.isPending || Math.abs(totals.difference) > 0.01}>
 {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t.journalEntries.create}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
