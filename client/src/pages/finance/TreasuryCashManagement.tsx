/**
 * Treasury & Cash Management Page
 * Provides bank accounts, cash transactions, and fund balances management
 * Features: CRUD, Import/Export, RTL/LTR support
 */

import { useState, useMemo } from 'react';
import { useNavigate } from '@/lib/router-compat';
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
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
 ArrowLeft, ArrowRight,
 Plus,
 Pencil,
 Trash2,
 Download,
 Upload,
 Search,
 Building2,
 CreditCard,
 ArrowUpDown,
 Wallet,
 RefreshCw,
 FileSpreadsheet,
 AlertCircle,
 CheckCircle2,
 Eye,
 Play,
 Loader2,
 Link as LinkIcon,
} from 'lucide-react';
import { Link } from 'wouter';
import * as XLSX from 'xlsx';
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

// Translations
const accountTypeOptions = [
 { value: 'CHECKING', labelEn: 'Checking', labelAr: 'جاري' },
 { value: 'SAVINGS', labelEn: 'Savings', labelAr: 'توفير' },
 { value: 'MONEY_MARKET', labelEn: 'Money Market', labelAr: 'سوق المال' },
 { value: 'PETTY_CASH', labelEn: 'Petty Cash', labelAr: 'صندوق نثرية' },
 { value: 'SAFE', labelEn: 'Safe', labelAr: 'خزنة' },
];

const transactionTypeOptions = [
 { value: 'DEPOSIT', labelEn: 'Deposit', labelAr: 'إيداع' },
 { value: 'WITHDRAWAL', labelEn: 'Withdrawal', labelAr: 'سحب' },
 { value: 'TRANSFER_IN', labelEn: 'Transfer In', labelAr: 'تحويل وارد' },
 { value: 'TRANSFER_OUT', labelEn: 'Transfer Out', labelAr: 'تحويل صادر' },
 { value: 'BANK_CHARGE', labelEn: 'Bank Charge', labelAr: 'رسوم بنكية' },
 { value: 'INTEREST', labelEn: 'Interest', labelAr: 'فائدة' },
 { value: 'ADJUSTMENT', labelEn: 'Adjustment', labelAr: 'تسوية' },
];

const fundTypeOptions = [
 { value: 'RESTRICTED', labelEn: 'Restricted', labelAr: 'مقيد' },
 { value: 'UNRESTRICTED', labelEn: 'Unrestricted', labelAr: 'غير مقيد' },
 { value: 'TEMPORARILY_RESTRICTED', labelEn: 'Temporarily Restricted', labelAr: 'مقيد مؤقتاً' },
 { value: 'DONOR_DESIGNATED', labelEn: 'Donor Designated', labelAr: 'مخصص من المانح' },
];

export default function TreasuryCashManagement() {
 const { t } = useTranslation();
 const { language, isRTL } = useLanguage();
 const { currentOrganization, currentOperatingUnit } = useOrganization();
 const organizationId = currentOrganization?.id || 30001;
 const operatingUnitId = currentOperatingUnit?.id;

 const [activeTab, setActiveTab] = useState('bank-accounts');
 const [searchTerm, setSearchTerm] = useState('');
 
 // Bank Account State
 const [showBankAccountDialog, setShowBankAccountDialog] = useState(false);
 const [editingBankAccount, setEditingBankAccount] = useState<any>(null);
 const [showBankImportDialog, setShowBankImportDialog] = useState(false);
 const [bankImportAllowDuplicates, setBankImportAllowDuplicates] = useState(false);
 const [bankImportResults, setBankImportResults] = useState<any>(null);
 
 // Transaction State
 const [showTransactionDialog, setShowTransactionDialog] = useState(false);
 const [selectedBankAccountId, setSelectedBankAccountId] = useState<number | null>(null);
 
 // Fund State
 const [showFundDialog, setShowFundDialog] = useState(false);
 const [editingFund, setEditingFund] = useState<any>(null);
 const [showFundImportDialog, setShowFundImportDialog] = useState(false);
 const [fundImportAllowDuplicates, setFundImportAllowDuplicates] = useState(false);
 const [fundImportResults, setFundImportResults] = useState<any>(null);

 // Form State
 const [bankAccountForm, setBankAccountForm] = useState({
 accountName: '',
 accountNameAr: '',
 accountNumber: '',
 bankName: '',
 bankNameAr: '',
 branchName: '',
 branchCode: '',
 swiftCode: '',
 accountType: 'CHECKING' as const,
 currency: 'USD',
 openingBalance: 0,
 contactPerson: '',
 contactPhone: '',
 notes: '',
 });

 const [transactionForm, setTransactionForm] = useState({
 bankAccountId: 0,
 transactionDate: new Date().toISOString().split('T')[0],
 transactionType: 'DEPOSIT' as const,
 amount: 0,
 description: '',
 referenceNumber: '',
 payee: '',
 });

 const [fundForm, setFundForm] = useState({
 fundCode: '',
 fundName: '',
 fundNameAr: '',
 fundType: 'UNRESTRICTED' as const,
 currency: 'USD',
 openingBalance: 0,
 description: '',
 });

 // Queries
 const bankAccountsQuery = trpc.treasury.listBankAccounts.useQuery({ organizationId });
 const bankStatsQuery = trpc.treasury.getBankAccountStatistics.useQuery({ organizationId });
 const transactionsQuery = trpc.treasury.listCashTransactions.useQuery({ 
 organizationId,
 bankAccountId: selectedBankAccountId || undefined,
 });
 const fundBalancesQuery = trpc.treasury.listFundBalances.useQuery({ organizationId });
 const fundStatsQuery = trpc.treasury.getFundBalanceStatistics.useQuery({ organizationId });
 const nextTxnNumberQuery = trpc.treasury.getNextTransactionNumber.useQuery({ organizationId });

 // Mutations
 const createBankAccountMutation = trpc.treasury.createBankAccount.useMutation({
 onSuccess: () => {
 toast.success(t.treasuryCashManagement.createSuccess);
 setShowBankAccountDialog(false);
 bankAccountsQuery.refetch();
 bankStatsQuery.refetch();
 resetBankAccountForm();
 },
 onError: (error) => toast.error(error.message),
 });

 const updateBankAccountMutation = trpc.treasury.updateBankAccount.useMutation({
 onSuccess: () => {
 toast.success(t.treasuryCashManagement.updateSuccess);
 setShowBankAccountDialog(false);
 bankAccountsQuery.refetch();
 setEditingBankAccount(null);
 resetBankAccountForm();
 },
 onError: (error) => toast.error(error.message),
 });

 const deleteBankAccountMutation = trpc.treasury.deleteBankAccount.useMutation({
 onSuccess: () => {
 toast.success(t.treasuryCashManagement.deleteSuccess);
 bankAccountsQuery.refetch();
 bankStatsQuery.refetch();
 },
 onError: (error) => toast.error(error.message),
 });

 const bulkImportBankAccountsMutation = trpc.treasury.bulkImportBankAccounts.useMutation({
 onSuccess: (results) => {
 setBankImportResults(results);
 toast.success(`${t.treasuryCashManagement.importSuccess}: ${results.imported} ${t.treasuryCashManagement.imported}`);
 bankAccountsQuery.refetch();
 bankStatsQuery.refetch();
 },
 onError: (error) => toast.error(error.message),
 });

 const createTransactionMutation = trpc.treasury.createCashTransaction.useMutation({
 onSuccess: () => {
 toast.success(t.treasuryCashManagement.createSuccess);
 setShowTransactionDialog(false);
 transactionsQuery.refetch();
 bankAccountsQuery.refetch();
 bankStatsQuery.refetch();
 resetTransactionForm();
 },
 onError: (error) => toast.error(error.message),
 });

 const deleteTransactionMutation = trpc.treasury.deleteCashTransaction.useMutation({
 onSuccess: () => {
 toast.success(t.treasuryCashManagement.deleteSuccess);
 transactionsQuery.refetch();
 bankAccountsQuery.refetch();
 bankStatsQuery.refetch();
 },
 onError: (error) => toast.error(error.message),
 });

 const createFundMutation = trpc.treasury.createFundBalance.useMutation({
 onSuccess: () => {
 toast.success(t.treasuryCashManagement.createSuccess);
 setShowFundDialog(false);
 fundBalancesQuery.refetch();
 fundStatsQuery.refetch();
 resetFundForm();
 },
 onError: (error) => toast.error(error.message),
 });

 const updateFundMutation = trpc.treasury.updateFundBalance.useMutation({
 onSuccess: () => {
 toast.success(t.treasuryCashManagement.updateSuccess);
 setShowFundDialog(false);
 fundBalancesQuery.refetch();
 setEditingFund(null);
 resetFundForm();
 },
 onError: (error) => toast.error(error.message),
 });

 const deleteFundMutation = trpc.treasury.deleteFundBalance.useMutation({
 onSuccess: () => {
 toast.success(t.treasuryCashManagement.deleteSuccess);
 fundBalancesQuery.refetch();
 fundStatsQuery.refetch();
 },
 onError: (error) => toast.error(error.message),
 });

 const bulkImportFundsMutation = trpc.treasury.bulkImportFundBalances.useMutation({
 onSuccess: (results) => {
 setFundImportResults(results);
 toast.success(`${t.treasuryCashManagement.importSuccess}: ${results.imported} ${t.treasuryCashManagement.imported}`);
 fundBalancesQuery.refetch();
 fundStatsQuery.refetch();
 },
 onError: (error) => toast.error(error.message),
 });

 // Form Reset Functions
 const resetBankAccountForm = () => {
 setBankAccountForm({
 accountName: '',
 accountNameAr: '',
 accountNumber: '',
 bankName: '',
 bankNameAr: '',
 branchName: '',
 branchCode: '',
 swiftCode: '',
 accountType: 'CHECKING',
 currency: 'USD',
 openingBalance: 0,
 contactPerson: '',
 contactPhone: '',
 notes: '',
 });
 };

 const resetTransactionForm = () => {
 setTransactionForm({
 bankAccountId: 0,
 transactionDate: new Date().toISOString().split('T')[0],
 transactionType: 'DEPOSIT',
 amount: 0,
 description: '',
 referenceNumber: '',
 payee: '',
 });
 };

 const resetFundForm = () => {
 setFundForm({
 fundCode: '',
 fundName: '',
 fundNameAr: '',
 fundType: 'UNRESTRICTED',
 currency: 'USD',
 openingBalance: 0,
 description: '',
 });
 };

 // Handlers
 const handleEditBankAccount = (account: any) => {
 setEditingBankAccount(account);
 setBankAccountForm({
 accountName: account.accountName || '',
 accountNameAr: account.accountNameAr || '',
 accountNumber: account.accountNumber || '',
 bankName: account.bankName || '',
 bankNameAr: account.bankNameAr || '',
 branchName: account.branchName || '',
 branchCode: account.branchCode || '',
 swiftCode: account.bankCode || '',
 accountType: account.accountType || 'CHECKING',
 currency: account.currency || 'USD',
 openingBalance: parseFloat(account.openingBalance) || 0,
 contactPerson: account.contactPerson || '',
 contactPhone: account.contactPhone || '',
 notes: account.notes || '',
 });
 setShowBankAccountDialog(true);
 };

 const handleSaveBankAccount = () => {
 if (editingBankAccount) {
 updateBankAccountMutation.mutate({
 id: editingBankAccount.id,
 accountName: bankAccountForm.accountName,
 accountNameAr: bankAccountForm.accountNameAr || undefined,
 bankName: bankAccountForm.bankName,
 bankNameAr: bankAccountForm.bankNameAr || undefined,
 branchName: bankAccountForm.branchName || undefined,
 branchCode: bankAccountForm.branchCode || undefined,
 bankCode: bankAccountForm.swiftCode || undefined,
 accountType: bankAccountForm.accountType,
 contactPerson: bankAccountForm.contactPerson || undefined,
 contactPhone: bankAccountForm.contactPhone || undefined,
 notes: bankAccountForm.notes || undefined,
 });
 } else {
 createBankAccountMutation.mutate({
 organizationId,
 ...bankAccountForm,
 });
 }
 };

 const handleDeleteBankAccount = (id: number) => {
 if (window.confirm(t.treasuryCashManagement.confirmDelete)) {
 deleteBankAccountMutation.mutate({ id });
 }
 };

 const handleEditFund = (fund: any) => {
 setEditingFund(fund);
 setFundForm({
 fundCode: fund.fundCode || '',
 fundName: fund.fundName || '',
 fundNameAr: fund.fundNameAr || '',
 fundType: fund.fundType || 'UNRESTRICTED',
 currency: fund.currency || 'USD',
 openingBalance: parseFloat(fund.totalBudget) || 0,
 description: fund.notes || '',
 });
 setShowFundDialog(true);
 };

 const handleSaveFund = () => {
 if (editingFund) {
 updateFundMutation.mutate({
 id: editingFund.id,
 fundName: fundForm.fundName,
 fundNameAr: fundForm.fundNameAr || undefined,
 fundType: fundForm.fundType,
 });
 } else {
 createFundMutation.mutate({
 organizationId,
 ...fundForm,
 });
 }
 };

 const handleDeleteFund = (id: number) => {
 if (window.confirm(t.treasuryCashManagement.confirmDelete)) {
 deleteFundMutation.mutate({ id });
 }
 };

 const handleSaveTransaction = () => {
 if (!transactionForm.bankAccountId) {
 toast.error('Please select a bank account');
 return;
 }
 createTransactionMutation.mutate({
 organizationId,
 bankAccountId: transactionForm.bankAccountId,
 transactionNumber: nextTxnNumberQuery.data || `TXN-${Date.now()}`,
 transactionDate: transactionForm.transactionDate,
 transactionType: transactionForm.transactionType,
 amount: transactionForm.amount,
 description: transactionForm.description || undefined,
 referenceNumber: transactionForm.referenceNumber || undefined,
 payee: transactionForm.payee || undefined,
 });
 };

 const handleDeleteTransaction = (id: number) => {
 if (window.confirm(t.treasuryCashManagement.confirmDelete)) {
 deleteTransactionMutation.mutate({ id });
 }
 };

 // Import/Export Functions
 const downloadBankAccountTemplate = () => {
 const template = [
 {
 'Account Name': 'Main Operating Account',
 'Account Number': '1234567890',
 'Bank Name': 'First National Bank',
 'Account Type': 'CHECKING',
 'Currency': 'USD',
 'Opening Balance': 10000,
 'SWIFT Code': 'FNBKUS33',
 },
 ];
 const ws = XLSX.utils.json_to_sheet(template);
 const wb = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb, ws, 'Bank Accounts');
 XLSX.writeFile(wb, 'bank_accounts_template.xlsx');
 };

 const downloadFundTemplate = () => {
 const template = [
 {
 'Fund Code': 'FUND-001',
 'Fund Name': 'General Operating Fund',
 'Fund Type': 'UNRESTRICTED',
 'Currency': 'USD',
 'Opening Balance': 50000,
 'Description': 'General unrestricted operating fund',
 },
 ];
 const ws = XLSX.utils.json_to_sheet(template);
 const wb = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb, ws, 'Fund Balances');
 XLSX.writeFile(wb, 'fund_balances_template.xlsx');
 };

 const handleBankAccountImport = (event: React.ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0];
 if (!file) return;

 const reader = new FileReader();
 reader.onload = (e) => {
 try {
 const data = new Uint8Array(e.target?.result as ArrayBuffer);
 const workbook = XLSX.read(data, { type: 'array' });
 const sheetName = workbook.SheetNames[0];
 const worksheet = workbook.Sheets[sheetName];
 const jsonData = XLSX.utils.sheet_to_json(worksheet);

 const accounts = jsonData.map((row: any) => ({
 accountName: row['Account Name'] || '',
 accountNumber: String(row['Account Number'] || ''),
 bankName: row['Bank Name'] || '',
 accountType: (row['Account Type'] || 'CHECKING') as any,
 currency: row['Currency'] || 'USD',
 openingBalance: parseFloat(row['Opening Balance']) || 0,
 swiftCode: row['SWIFT Code'] || '',
 }));

 bulkImportBankAccountsMutation.mutate({
 organizationId,
 accounts,
 allowDuplicates: bankImportAllowDuplicates,
 });
 } catch (error) {
 toast.error('Failed to parse Excel file');
 }
 };
 reader.readAsArrayBuffer(file);
 };

 const handleFundImport = (event: React.ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0];
 if (!file) return;

 const reader = new FileReader();
 reader.onload = (e) => {
 try {
 const data = new Uint8Array(e.target?.result as ArrayBuffer);
 const workbook = XLSX.read(data, { type: 'array' });
 const sheetName = workbook.SheetNames[0];
 const worksheet = workbook.Sheets[sheetName];
 const jsonData = XLSX.utils.sheet_to_json(worksheet);

 const funds = jsonData.map((row: any) => ({
 fundCode: row['Fund Code'] || '',
 fundName: row['Fund Name'] || '',
 fundType: (row['Fund Type'] || 'UNRESTRICTED') as any,
 currency: row['Currency'] || 'USD',
 openingBalance: parseFloat(row['Opening Balance']) || 0,
 description: row['Description'] || '',
 }));

 bulkImportFundsMutation.mutate({
 organizationId,
 funds,
 allowDuplicates: fundImportAllowDuplicates,
 });
 } catch (error) {
 toast.error('Failed to parse Excel file');
 }
 };
 reader.readAsArrayBuffer(file);
 };

 const exportBankAccounts = () => {
 const data = (bankAccountsQuery.data || []).map((account: any) => ({
 'Account Name': account.accountName,
 'Account Number': account.accountNumber,
 'Bank Name': account.bankName,
 'Account Type': account.accountType,
 'Currency': account.currency,
 'Opening Balance': account.openingBalance,
 'Current Balance': account.currentBalance,
 'SWIFT Code': account.bankCode || '',
 'Status': account.isActive ? 'Active' : 'Inactive',
 }));
 const ws = XLSX.utils.json_to_sheet(data);
 const wb = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb, ws, 'Bank Accounts');
 XLSX.writeFile(wb, `bank_accounts_export_${new Date().toISOString().split('T')[0]}.xlsx`);
 };

 const exportFundBalances = () => {
 const data = (fundBalancesQuery.data || []).map((fund: any) => ({
 'Fund Code': fund.fundCode,
 'Fund Name': fund.fundName,
 'Fund Type': fund.fundType,
 'Currency': fund.currency,
 'Total Budget': fund.totalBudget,
 'Current Balance': fund.currentBalance,
 'Status': fund.isActive ? 'Active' : 'Inactive',
 }));
 const ws = XLSX.utils.json_to_sheet(data);
 const wb = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb, ws, 'Fund Balances');
 XLSX.writeFile(wb, `fund_balances_export_${new Date().toISOString().split('T')[0]}.xlsx`);
 };

 // Filtered Data
 const filteredBankAccounts = useMemo(() => {
 if (!bankAccountsQuery.data) return [];
 if (!searchTerm) return bankAccountsQuery.data;
 const term = searchTerm.toLowerCase();
 return bankAccountsQuery.data.filter((account: any) =>
 account.accountName?.toLowerCase().includes(term) ||
 account.accountNameAr?.toLowerCase().includes(term) ||
 account.accountNumber?.toLowerCase().includes(term) ||
 account.bankName?.toLowerCase().includes(term)
 );
 }, [bankAccountsQuery.data, searchTerm]);

 const filteredFunds = useMemo(() => {
 if (!fundBalancesQuery.data) return [];
 if (!searchTerm) return fundBalancesQuery.data;
 const term = searchTerm.toLowerCase();
 return fundBalancesQuery.data.filter((fund: any) =>
 fund.fundCode?.toLowerCase().includes(term) ||
 fund.fundName?.toLowerCase().includes(term) ||
 fund.fundNameAr?.toLowerCase().includes(term)
 );
 }, [fundBalancesQuery.data, searchTerm]);

 const getAccountTypeLabel = (type: string) => {
 const option = accountTypeOptions.find(o => o.value === type);
 return language === 'ar' ? option?.labelAr : option?.labelEn;
 };

 const getTransactionTypeLabel = (type: string) => {
 const option = transactionTypeOptions.find(o => o.value === type);
 return language === 'ar' ? option?.labelAr : option?.labelEn;
 };

 const getFundTypeLabel = (type: string) => {
 const option = fundTypeOptions.find(o => o.value === type);
 return language === 'ar' ? option?.labelAr : option?.labelEn;
 };

 const formatCurrency = (amount: string | number, currency: string = 'USD') => {
 const num = typeof amount === 'string' ? parseFloat(amount) : amount;
 return new Intl.NumberFormat('en-US', {
 style: 'currency',
 currency,
 }).format(num || 0);
 };

 return (
 <div className="min-h-screen bg-background">
 {/* Header */}
 <div className="border-b bg-card">
 <div className="container py-6">
 <div className="flex items-center gap-4 mb-4">
 <Link href="/organization/finance">
 <BackButton label={t.treasuryCashManagement.backToFinance} />
 </Link>
 </div>
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-3xl font-bold text-foreground">{t.treasuryCashManagement.title}</h1>
 <p className="text-muted-foreground mt-1">{t.treasuryCashManagement.subtitle}</p>
 </div>
 <div className="flex items-center gap-2">
 <Link href="/organization/finance/bank-statement-import">
 <Button>
 <Upload className="h-4 w-4 me-2" />
 {t.financeModule.importBankStatement}
 </Button>
 </Link>
 <Link href="/organization/finance/bank-reconciliation-matching">
 <Button variant="outline">
 <LinkIcon className="h-4 w-4 me-2" />
 {t.financeModule.matchTransactions}
 </Button>
 </Link>
 </div>
 </div>
 </div>
 </div>

 {/* Main Content */}
 <div className="container py-8">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
 <Card
 className={`cursor-pointer transition-all ${
 activeTab === 'bank-accounts'
 ? 'ring-2 ring-primary bg-primary/5'
 : 'hover:shadow-md'
 }`}
 onClick={() => setActiveTab('bank-accounts')}
 >
 <CardHeader className="pb-3">
 <CardTitle className="flex items-center gap-2 text-base">
 <Building2 className="h-5 w-5" />
 {t.treasuryCashManagement.bankAccounts}
 </CardTitle>
 </CardHeader>
 </Card>
 <Card
 className={`cursor-pointer transition-all ${
 activeTab === 'cash-transactions'
 ? 'ring-2 ring-primary bg-primary/5'
 : 'hover:shadow-md'
 }`}
 onClick={() => setActiveTab('cash-transactions')}
 >
 <CardHeader className="pb-3">
 <CardTitle className="flex items-center gap-2 text-base">
 <ArrowUpDown className="h-5 w-5" />
 {t.treasuryCashManagement.cashTransactions}
 </CardTitle>
 </CardHeader>
 </Card>
 <Card
 className={`cursor-pointer transition-all ${
 activeTab === 'fund-balances'
 ? 'ring-2 ring-primary bg-primary/5'
 : 'hover:shadow-md'
 }`}
 onClick={() => setActiveTab('fund-balances')}
 >
 <CardHeader className="pb-3">
 <CardTitle className="flex items-center gap-2 text-base">
 <Wallet className="h-5 w-5" />
 {t.treasuryCashManagement.fundBalances}
 </CardTitle>
 </CardHeader>
 </Card>
 <Card
 className={`cursor-pointer transition-all ${
 activeTab === 'bank-reconciliation'
 ? 'ring-2 ring-primary bg-primary/5'
 : 'hover:shadow-md'
 }`}
 onClick={() => setActiveTab('bank-reconciliation')}
 >
 <CardHeader className="pb-3">
 <CardTitle className="flex items-center gap-2 text-base">
 <RefreshCw className="h-5 w-5" />
 {t.treasuryCashManagement.bankReconciliation}
 </CardTitle>
 </CardHeader>
 </Card>
 </div>

 <Tabs value={activeTab} onValueChange={setActiveTab}>

 {/* Bank Accounts Tab */}
 <TabsContent value="bank-accounts">
 {/* Statistics Cards */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
 <Card>
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium text-muted-foreground">
 {t.treasuryCashManagement.totalAccounts}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold">{bankStatsQuery.data?.total || 0}</div>
 </CardContent>
 </Card>
 <Card>
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium text-muted-foreground">
 {t.treasuryCashManagement.activeAccounts}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-green-600">{bankStatsQuery.data?.active || 0}</div>
 </CardContent>
 </Card>
 <Card>
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium text-muted-foreground">
 {t.treasuryCashManagement.totalBalance}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-blue-600">
 {formatCurrency(bankStatsQuery.data?.totalBalance || 0)}
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Actions Bar */}
 <div className="flex items-center justify-between mb-4">
 <div className="relative w-64">
 <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
 <Input
 placeholder={t.treasuryCashManagement.search}
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="ps-10"
 />
 </div>
 <div className="flex items-center gap-2">
 <Button variant="outline" size="sm" onClick={exportBankAccounts}>
 <Download className="h-4 w-4 me-2" />
 {t.treasuryCashManagement.export}
 </Button>
 <Button variant="outline" size="sm" onClick={() => setShowBankImportDialog(true)}>
 <Upload className="h-4 w-4 me-2" />
 {t.treasuryCashManagement.import}
 </Button>
 <Button onClick={() => { resetBankAccountForm(); setEditingBankAccount(null); setShowBankAccountDialog(true); }}>
 <Plus className="h-4 w-4 me-2" />
 {t.treasuryCashManagement.newBankAccount}
 </Button>
 </div>
 </div>

 {/* Bank Accounts Table */}
 <Card>
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.treasuryCashManagement.accountName}</TableHead>
 <TableHead>{t.treasuryCashManagement.accountNumber}</TableHead>
 <TableHead>{t.treasuryCashManagement.bankName}</TableHead>
 <TableHead>{t.treasuryCashManagement.accountType}</TableHead>
 <TableHead>{t.treasuryCashManagement.currentBalance}</TableHead>
 <TableHead>{t.treasuryCashManagement.status}</TableHead>
 <TableHead className="w-[100px]"></TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filteredBankAccounts.length === 0 ? (
 <TableRow>
 <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
 {bankAccountsQuery.isLoading ? t.treasuryCashManagement.loading : t.treasuryCashManagement.noData}
 </TableCell>
 </TableRow>
 ) : (
 filteredBankAccounts.map((account: any) => (
 <TableRow key={account.id}>
 <TableCell className="font-medium">
 {language === 'ar' && account.accountNameAr ? account.accountNameAr : account.accountName}
 </TableCell>
 <TableCell className="font-mono">{account.accountNumber}</TableCell>
 <TableCell>
 {language === 'ar' && account.bankNameAr ? account.bankNameAr : account.bankName}
 </TableCell>
 <TableCell>{getAccountTypeLabel(account.accountType)}</TableCell>
 <TableCell className="font-mono">
 {formatCurrency(account.currentBalance, account.currency)}
 </TableCell>
 <TableCell>
 <Badge variant={account.isActive ? 'default' : 'secondary'}>
 {account.isActive ? t.treasuryCashManagement.active : t.treasuryCashManagement.inactive}
 </Badge>
 </TableCell>
 <TableCell>
 <div className="flex items-center gap-1">
 <Button variant="ghost" size="icon" onClick={() => handleEditBankAccount(account)}>
 <Pencil className="h-4 w-4" />
 </Button>
 <Button variant="ghost" size="icon" onClick={() => handleDeleteBankAccount(account.id)}>
 <Trash2 className="h-4 w-4 text-destructive" />
 </Button>
 </div>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </Card>
 </TabsContent>

 {/* Cash Transactions Tab */}
 <TabsContent value="cash-transactions">
 {/* Actions Bar */}
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-4">
 <Select
 value={selectedBankAccountId?.toString() || 'all'}
 onValueChange={(v) => setSelectedBankAccountId(v === 'all' ? null : parseInt(v))}
 >
 <SelectTrigger className="w-[250px]">
 <SelectValue placeholder={t.treasuryCashManagement.bankAccounts} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">{t.financeModule.allAccounts}</SelectItem>
 {(bankAccountsQuery.data || []).map((account: any) => (
 <SelectItem key={account.id} value={account.id.toString()}>
 {language === 'ar' && account.accountNameAr ? account.accountNameAr : account.accountName}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <Button onClick={() => { resetTransactionForm(); setShowTransactionDialog(true); }}>
 <Plus className="h-4 w-4 me-2" />
 {t.treasuryCashManagement.newTransaction}
 </Button>
 </div>

 {/* Transactions Table */}
 <Card>
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="text-center">{t.treasuryCashManagement.transactionNumber}</TableHead>
 <TableHead className="text-center">{t.treasuryCashManagement.transactionDate}</TableHead>
 <TableHead className="text-center">{t.treasuryCashManagement.transactionType}</TableHead>
 <TableHead>{t.treasuryCashManagement.amount}</TableHead>
 <TableHead>{t.treasuryCashManagement.description}</TableHead>
 <TableHead>{t.treasuryCashManagement.balanceAfter}</TableHead>
 <TableHead className="w-[80px]"></TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {!transactionsQuery.data || transactionsQuery.data.length === 0 ? (
 <TableRow>
 <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
 {transactionsQuery.isLoading ? t.treasuryCashManagement.loading : t.treasuryCashManagement.noData}
 </TableCell>
 </TableRow>
 ) : (
 transactionsQuery.data.map((txn: any) => (
 <TableRow key={txn.id}>
 <TableCell className="font-mono">{txn.transactionNumber}</TableCell>
 <TableCell>{new Date(txn.transactionDate).toLocaleDateString()}</TableCell>
 <TableCell>
 <Badge variant={['DEPOSIT', 'TRANSFER_IN', 'INTEREST'].includes(txn.transactionType) ? 'default' : 'secondary'}>
 {getTransactionTypeLabel(txn.transactionType)}
 </Badge>
 </TableCell>
 <TableCell className={`font-mono ${['DEPOSIT', 'TRANSFER_IN', 'INTEREST'].includes(txn.transactionType) ? 'text-green-600' : 'text-red-600'}`}>
 {['DEPOSIT', 'TRANSFER_IN', 'INTEREST'].includes(txn.transactionType) ? '+' : '-'}
 {formatCurrency(txn.amount, txn.currency)}
 </TableCell>
 <TableCell className="max-w-[200px] truncate">
 {language === 'ar' && txn.descriptionAr ? txn.descriptionAr : txn.description}
 </TableCell>
 <TableCell className="font-mono">{formatCurrency(txn.balanceAfter, txn.currency)}</TableCell>
 <TableCell>
 <Button variant="ghost" size="icon" onClick={() => handleDeleteTransaction(txn.id)}>
 <Trash2 className="h-4 w-4 text-destructive" />
 </Button>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </Card>
 </TabsContent>

 {/* Fund Balances Tab */}
 <TabsContent value="fund-balances">
 {/* Statistics Cards */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
 <Card>
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium text-muted-foreground">
 {t.treasuryCashManagement.totalBalance}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold">
 {formatCurrency(fundStatsQuery.data?.totalBalance || 0)}
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium text-muted-foreground">
 {t.treasuryCashManagement.restrictedFunds}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-orange-600">
 {formatCurrency(fundStatsQuery.data?.restrictedBalance || 0)}
 </div>
 </CardContent>
 </Card>
 <Card>
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium text-muted-foreground">
 {t.treasuryCashManagement.unrestrictedFunds}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="text-2xl font-bold text-green-600">
 {formatCurrency(fundStatsQuery.data?.unrestrictedBalance || 0)}
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Actions Bar */}
 <div className="flex items-center justify-between mb-4">
 <div className="relative w-64">
 <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
 <Input
 placeholder={t.treasuryCashManagement.search}
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="ps-10"
 />
 </div>
 <div className="flex items-center gap-2">
 <Button variant="outline" size="sm" onClick={exportFundBalances}>
 <Download className="h-4 w-4 me-2" />
 {t.treasuryCashManagement.export}
 </Button>
 <Button variant="outline" size="sm" onClick={() => setShowFundImportDialog(true)}>
 <Upload className="h-4 w-4 me-2" />
 {t.treasuryCashManagement.import}
 </Button>
 <Button onClick={() => { resetFundForm(); setEditingFund(null); setShowFundDialog(true); }}>
 <Plus className="h-4 w-4 me-2" />
 {t.treasuryCashManagement.newFund}
 </Button>
 </div>
 </div>

 {/* Fund Balances Table */}
 <Card>
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.treasuryCashManagement.fundCode}</TableHead>
 <TableHead>{t.treasuryCashManagement.fundName}</TableHead>
 <TableHead>{t.treasuryCashManagement.fundType}</TableHead>
 <TableHead>{t.treasuryCashManagement.totalBudget}</TableHead>
 <TableHead>{t.treasuryCashManagement.currentBalance}</TableHead>
 <TableHead>{t.treasuryCashManagement.status}</TableHead>
 <TableHead className="w-[100px]"></TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filteredFunds.length === 0 ? (
 <TableRow>
 <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
 {fundBalancesQuery.isLoading ? t.treasuryCashManagement.loading : t.treasuryCashManagement.noData}
 </TableCell>
 </TableRow>
 ) : (
 filteredFunds.map((fund: any) => (
 <TableRow key={fund.id}>
 <TableCell className="font-mono">{fund.fundCode}</TableCell>
 <TableCell className="font-medium">
 {language === 'ar' && fund.fundNameAr ? fund.fundNameAr : fund.fundName}
 </TableCell>
 <TableCell>
 <Badge variant={fund.fundType === 'RESTRICTED' ? 'destructive' : 'default'}>
 {getFundTypeLabel(fund.fundType)}
 </Badge>
 </TableCell>
 <TableCell className="font-mono">{formatCurrency(fund.totalBudget, fund.currency)}</TableCell>
 <TableCell className="font-mono">{formatCurrency(fund.currentBalance, fund.currency)}</TableCell>
 <TableCell>
 <Badge variant={fund.isActive ? 'default' : 'secondary'}>
 {fund.isActive ? t.treasuryCashManagement.active : t.treasuryCashManagement.inactive}
 </Badge>
 </TableCell>
 <TableCell>
 <div className="flex items-center gap-1">
 <Button variant="ghost" size="icon" onClick={() => handleEditFund(fund)}>
 <Pencil className="h-4 w-4" />
 </Button>
 <Button variant="ghost" size="icon" onClick={() => handleDeleteFund(fund.id)}>
 <Trash2 className="h-4 w-4 text-destructive" />
 </Button>
 </div>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </Card>
 </TabsContent>

 {/* Bank Reconciliation Tab */}
 <TabsContent value="bank-reconciliation">
 <BankReconciliationTab 
 organizationId={organizationId}
 operatingUnitId={operatingUnitId}
 bankAccounts={bankAccountsQuery.data || []}
 language={language}
 isRTL={isRTL}
 t={t}
 formatCurrency={formatCurrency}
 />
 </TabsContent>
 </Tabs>
 </div>

 {/* Bank Account Dialog */}
 <Dialog open={showBankAccountDialog} onOpenChange={setShowBankAccountDialog}>
 <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>{editingBankAccount ? t.treasuryCashManagement.editBankAccount : t.treasuryCashManagement.newBankAccount}</DialogTitle>
 </DialogHeader>
 <div className="grid grid-cols-2 gap-4 py-4">
 <div className="space-y-2">
 <Label>{t.treasuryCashManagement.accountName} *</Label>
 <Input
 value={bankAccountForm.accountName}
 onChange={(e) => setBankAccountForm({ ...bankAccountForm, accountName: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.treasuryCashManagement.accountNameAr}</Label>
 <Input
 value={bankAccountForm.accountNameAr}
 onChange={(e) => setBankAccountForm({ ...bankAccountForm, accountNameAr: e.target.value })}
 dir="rtl"
 />
 </div>
 <div className="space-y-2">
 <Label>{t.treasuryCashManagement.accountNumber} *</Label>
 <Input
 value={bankAccountForm.accountNumber}
 onChange={(e) => setBankAccountForm({ ...bankAccountForm, accountNumber: e.target.value })}
 disabled={!!editingBankAccount}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.treasuryCashManagement.accountType} *</Label>
 <Select
 value={bankAccountForm.accountType}
 onValueChange={(v: any) => setBankAccountForm({ ...bankAccountForm, accountType: v })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {accountTypeOptions.map((opt) => (
 <SelectItem key={opt.value} value={opt.value}>
 {language === 'ar' ? opt.labelAr : opt.labelEn}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2">
 <Label>{t.treasuryCashManagement.bankName} *</Label>
 <Input
 value={bankAccountForm.bankName}
 onChange={(e) => setBankAccountForm({ ...bankAccountForm, bankName: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.treasuryCashManagement.bankNameAr}</Label>
 <Input
 value={bankAccountForm.bankNameAr}
 onChange={(e) => setBankAccountForm({ ...bankAccountForm, bankNameAr: e.target.value })}
 dir="rtl"
 />
 </div>
 <div className="space-y-2">
 <Label>{t.treasuryCashManagement.branchName}</Label>
 <Input
 value={bankAccountForm.branchName}
 onChange={(e) => setBankAccountForm({ ...bankAccountForm, branchName: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.treasuryCashManagement.branchCode}</Label>
 <Input
 value={bankAccountForm.branchCode}
 onChange={(e) => setBankAccountForm({ ...bankAccountForm, branchCode: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.treasuryCashManagement.swiftCode}</Label>
 <Input
 value={bankAccountForm.swiftCode}
 onChange={(e) => setBankAccountForm({ ...bankAccountForm, swiftCode: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.treasuryCashManagement.currency}</Label>
 <Select
 value={bankAccountForm.currency}
 onValueChange={(v) => setBankAccountForm({ ...bankAccountForm, currency: v })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="USD">USD</SelectItem>
 <SelectItem value="EUR">EUR</SelectItem>
 <SelectItem value="GBP">GBP</SelectItem>
 <SelectItem value="SAR">SAR</SelectItem>
 <SelectItem value="AED">AED</SelectItem>
 </SelectContent>
 </Select>
 </div>
 {!editingBankAccount && (
 <div className="space-y-2">
 <Label>{t.treasuryCashManagement.openingBalance}</Label>
 <Input
 type="number"
 value={bankAccountForm.openingBalance}
 onChange={(e) => setBankAccountForm({ ...bankAccountForm, openingBalance: parseFloat(e.target.value) || 0 })}
 />
 </div>
 )}
 <div className="space-y-2">
 <Label>{t.treasuryCashManagement.contactPerson}</Label>
 <Input
 value={bankAccountForm.contactPerson}
 onChange={(e) => setBankAccountForm({ ...bankAccountForm, contactPerson: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.treasuryCashManagement.contactPhone}</Label>
 <Input
 value={bankAccountForm.contactPhone}
 onChange={(e) => setBankAccountForm({ ...bankAccountForm, contactPhone: e.target.value })}
 />
 </div>
 <div className="col-span-2 space-y-2">
 <Label>{t.treasuryCashManagement.notes}</Label>
 <Textarea
 value={bankAccountForm.notes}
 onChange={(e) => setBankAccountForm({ ...bankAccountForm, notes: e.target.value })}
 rows={3}
 />
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowBankAccountDialog(false)}>{t.treasuryCashManagement.cancel}</Button>
 <Button onClick={handleSaveBankAccount} disabled={createBankAccountMutation.isPending || updateBankAccountMutation.isPending}>
 {editingBankAccount ? t.treasuryCashManagement.update : t.treasuryCashManagement.create}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Transaction Dialog */}
 <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
 <DialogContent className="max-w-lg">
 <DialogHeader>
 <DialogTitle>{t.treasuryCashManagement.newTransaction}</DialogTitle>
 </DialogHeader>
 <div className="space-y-4 py-4">
 <div className="space-y-2">
 <Label>{t.treasuryCashManagement.bankAccounts} *</Label>
 <Select
 value={transactionForm.bankAccountId?.toString() || ''}
 onValueChange={(v) => setTransactionForm({ ...transactionForm, bankAccountId: parseInt(v) })}
 >
 <SelectTrigger>
 <SelectValue placeholder={t.financeModule.selectAccount} />
 </SelectTrigger>
 <SelectContent>
 {(bankAccountsQuery.data || []).map((account: any) => (
 <SelectItem key={account.id} value={account.id.toString()}>
 {language === 'ar' && account.accountNameAr ? account.accountNameAr : account.accountName}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>{t.treasuryCashManagement.transactionDate} *</Label>
 <Input
 type="date"
 value={transactionForm.transactionDate}
 onChange={(e) => setTransactionForm({ ...transactionForm, transactionDate: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.treasuryCashManagement.transactionType} *</Label>
 <Select
 value={transactionForm.transactionType}
 onValueChange={(v: any) => setTransactionForm({ ...transactionForm, transactionType: v })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {transactionTypeOptions.map((opt) => (
 <SelectItem key={opt.value} value={opt.value}>
 {language === 'ar' ? opt.labelAr : opt.labelEn}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>
 <div className="space-y-2">
 <Label>{t.treasuryCashManagement.amount} *</Label>
 <Input
 type="number"
 value={transactionForm.amount}
 onChange={(e) => setTransactionForm({ ...transactionForm, amount: parseFloat(e.target.value) || 0 })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.treasuryCashManagement.referenceNumber}</Label>
 <Input
 value={transactionForm.referenceNumber}
 onChange={(e) => setTransactionForm({ ...transactionForm, referenceNumber: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.treasuryCashManagement.payee}</Label>
 <Input
 value={transactionForm.payee}
 onChange={(e) => setTransactionForm({ ...transactionForm, payee: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.treasuryCashManagement.description}</Label>
 <Textarea
 value={transactionForm.description}
 onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
 rows={2}
 />
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowTransactionDialog(false)}>{t.treasuryCashManagement.cancel}</Button>
 <Button onClick={handleSaveTransaction} disabled={createTransactionMutation.isPending}>
 {t.treasuryCashManagement.create}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Fund Dialog */}
 <Dialog open={showFundDialog} onOpenChange={setShowFundDialog}>
 <DialogContent className="max-w-lg">
 <DialogHeader>
 <DialogTitle>{editingFund ? t.treasuryCashManagement.editFund : t.treasuryCashManagement.newFund}</DialogTitle>
 </DialogHeader>
 <div className="space-y-4 py-4">
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>{t.treasuryCashManagement.fundCode} *</Label>
 <Input
 value={fundForm.fundCode}
 onChange={(e) => setFundForm({ ...fundForm, fundCode: e.target.value })}
 disabled={!!editingFund}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.treasuryCashManagement.fundType} *</Label>
 <Select
 value={fundForm.fundType}
 onValueChange={(v: any) => setFundForm({ ...fundForm, fundType: v })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {fundTypeOptions.map((opt) => (
 <SelectItem key={opt.value} value={opt.value}>
 {language === 'ar' ? opt.labelAr : opt.labelEn}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>
 <div className="space-y-2">
 <Label>{t.treasuryCashManagement.fundName} *</Label>
 <Input
 value={fundForm.fundName}
 onChange={(e) => setFundForm({ ...fundForm, fundName: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.treasuryCashManagement.fundNameAr}</Label>
 <Input
 value={fundForm.fundNameAr}
 onChange={(e) => setFundForm({ ...fundForm, fundNameAr: e.target.value })}
 dir="rtl"
 />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>{t.treasuryCashManagement.currency}</Label>
 <Select
 value={fundForm.currency}
 onValueChange={(v) => setFundForm({ ...fundForm, currency: v })}
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="USD">USD</SelectItem>
 <SelectItem value="EUR">EUR</SelectItem>
 <SelectItem value="GBP">GBP</SelectItem>
 <SelectItem value="SAR">SAR</SelectItem>
 <SelectItem value="AED">AED</SelectItem>
 </SelectContent>
 </Select>
 </div>
 {!editingFund && (
 <div className="space-y-2">
 <Label>{t.treasuryCashManagement.openingBalance}</Label>
 <Input
 type="number"
 value={fundForm.openingBalance}
 onChange={(e) => setFundForm({ ...fundForm, openingBalance: parseFloat(e.target.value) || 0 })}
 />
 </div>
 )}
 </div>
 <div className="space-y-2">
 <Label>{t.treasuryCashManagement.description}</Label>
 <Textarea
 value={fundForm.description}
 onChange={(e) => setFundForm({ ...fundForm, description: e.target.value })}
 rows={2}
 />
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowFundDialog(false)}>{t.treasuryCashManagement.cancel}</Button>
 <Button onClick={handleSaveFund} disabled={createFundMutation.isPending || updateFundMutation.isPending}>
 {editingFund ? t.treasuryCashManagement.update : t.treasuryCashManagement.create}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Bank Import Dialog */}
 <Dialog open={showBankImportDialog} onOpenChange={setShowBankImportDialog}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>{t.treasuryCashManagement.importBankAccounts}</DialogTitle>
 </DialogHeader>
 <div className="space-y-4 py-4">
 <Button variant="outline" onClick={downloadBankAccountTemplate} className="w-full">
 <FileSpreadsheet className="h-4 w-4 me-2" />
 {t.treasuryCashManagement.downloadTemplate}
 </Button>
 <div className="flex items-center space-x-2">
 <Checkbox
 id="allowDuplicates"
 checked={bankImportAllowDuplicates}
 onCheckedChange={(checked) => setBankImportAllowDuplicates(!!checked)}
 />
 <Label htmlFor="allowDuplicates">{t.treasuryCashManagement.allowDuplicates}</Label>
 </div>
 <div className="space-y-2">
 <Label>{t.treasuryCashManagement.selectFile}</Label>
 <Input
 type="file"
 accept=".xlsx,.xls"
 onChange={handleBankAccountImport}
 />
 </div>
 {bankImportResults && (
 <div className="p-4 bg-muted rounded-lg space-y-2">
 <h4 className="font-medium">{t.treasuryCashManagement.importResults}</h4>
 <div className="flex items-center gap-2 text-green-600">
 <CheckCircle2 className="h-4 w-4" />
 {t.treasuryCashManagement.imported}: {bankImportResults.imported}
 </div>
 <div className="flex items-center gap-2 text-yellow-600">
 <AlertCircle className="h-4 w-4" />
 {t.treasuryCashManagement.skipped}: {bankImportResults.skipped}
 </div>
 {bankImportResults.errors.length > 0 && (
 <div className="text-red-600 text-sm">
 {t.treasuryCashManagement.errors}: {bankImportResults.errors.length}
 </div>
 )}
 </div>
 )}
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => { setShowBankImportDialog(false); setBankImportResults(null); }}>
 {t.treasuryCashManagement.cancel}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Fund Import Dialog */}
 <Dialog open={showFundImportDialog} onOpenChange={setShowFundImportDialog}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>{t.treasuryCashManagement.importFunds}</DialogTitle>
 </DialogHeader>
 <div className="space-y-4 py-4">
 <Button variant="outline" onClick={downloadFundTemplate} className="w-full">
 <FileSpreadsheet className="h-4 w-4 me-2" />
 {t.treasuryCashManagement.downloadTemplate}
 </Button>
 <div className="flex items-center space-x-2">
 <Checkbox
 id="allowFundDuplicates"
 checked={fundImportAllowDuplicates}
 onCheckedChange={(checked) => setFundImportAllowDuplicates(!!checked)}
 />
 <Label htmlFor="allowFundDuplicates">{t.treasuryCashManagement.allowDuplicates}</Label>
 </div>
 <div className="space-y-2">
 <Label>{t.treasuryCashManagement.selectFile}</Label>
 <Input
 type="file"
 accept=".xlsx,.xls"
 onChange={handleFundImport}
 />
 </div>
 {fundImportResults && (
 <div className="p-4 bg-muted rounded-lg space-y-2">
 <h4 className="font-medium">{t.treasuryCashManagement.importResults}</h4>
 <div className="flex items-center gap-2 text-green-600">
 <CheckCircle2 className="h-4 w-4" />
 {t.treasuryCashManagement.imported}: {fundImportResults.imported}
 </div>
 <div className="flex items-center gap-2 text-yellow-600">
 <AlertCircle className="h-4 w-4" />
 {t.treasuryCashManagement.skipped}: {fundImportResults.skipped}
 </div>
 {fundImportResults.errors.length > 0 && (
 <div className="text-red-600 text-sm">
 {t.treasuryCashManagement.errors}: {fundImportResults.errors.length}
 </div>
 )}
 </div>
 )}
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => { setShowFundImportDialog(false); setFundImportResults(null); }}>
 {t.treasuryCashManagement.cancel}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}


// Bank Reconciliation Tab Component
interface BankReconciliationTabProps {
 organizationId: number;
 operatingUnitId?: number;
 bankAccounts: any[];
 language: string;
 isRTL: boolean;
 t: any;
 formatCurrency: (amount: string | number, currency?: string) => string;
}

function BankReconciliationTab({ 
 organizationId, 
 operatingUnitId, 
 bankAccounts, 
 language, 
 isRTL, 
 t,
 formatCurrency 
}: BankReconciliationTabProps) {
 const [selectedBankAccountId, setSelectedBankAccountId] = useState<number | null>(null);
 const [showNewReconciliationDialog, setShowNewReconciliationDialog] = useState(false);
 const [showReconciliationDetailDialog, setShowReconciliationDetailDialog] = useState(false);
 const [selectedReconciliation, setSelectedReconciliation] = useState<any>(null);
 const [reconciliationForm, setReconciliationForm] = useState({
 reconciliationDate: new Date().toISOString().split('T')[0],
 periodStart: '',
 periodEnd: '',
 statementBalance: '',
 bookBalance: '',
 notes: '',
 });

 // Queries
 const reconciliationsQuery = trpc.bankReconciliations.list.useQuery(
 {
 organizationId,
 operatingUnitId,
 bankAccountId: selectedBankAccountId || undefined,
 limit: 50,
 },
 { enabled: !!organizationId }
 );

 const reconciliationSummaryQuery = trpc.bankReconciliations.getSummary.useQuery(
 { id: selectedReconciliation?.id || 0 },
 { enabled: !!selectedReconciliation?.id }
 );

 const unreconciledTransactionsQuery = trpc.bankTransactions.getUnreconciled.useQuery(
 {
 organizationId,
 bankAccountId: selectedBankAccountId || 0,
 },
 { enabled: !!selectedBankAccountId }
 );

 // Mutations
 const createReconciliationMutation = trpc.bankReconciliations.create.useMutation({
 onSuccess: () => {
 toast.success(t.treasuryCashManagement.createSuccess);
 setShowNewReconciliationDialog(false);
 reconciliationsQuery.refetch();
 resetReconciliationForm();
 },
 onError: (error) => toast.error(error.message),
 });

 const startReconciliationMutation = trpc.bankReconciliations.startReconciliation.useMutation({
 onSuccess: () => {
 toast.success(t.treasuryCashManagement.startReconciliation);
 reconciliationsQuery.refetch();
 if (selectedReconciliation) {
 reconciliationSummaryQuery.refetch();
 }
 },
 onError: (error) => toast.error(error.message),
 });

 const completeReconciliationMutation = trpc.bankReconciliations.completeReconciliation.useMutation({
 onSuccess: () => {
 toast.success(t.treasuryCashManagement.completeReconciliation);
 reconciliationsQuery.refetch();
 setShowReconciliationDetailDialog(false);
 },
 onError: (error) => toast.error(error.message),
 });

 const approveReconciliationMutation = trpc.bankReconciliations.approveReconciliation.useMutation({
 onSuccess: () => {
 toast.success(t.treasuryCashManagement.approveReconciliation);
 reconciliationsQuery.refetch();
 },
 onError: (error) => toast.error(error.message),
 });

 const addTransactionsMutation = trpc.bankReconciliations.addTransactions.useMutation({
 onSuccess: () => {
 toast.success('Transactions added');
 reconciliationSummaryQuery.refetch();
 unreconciledTransactionsQuery.refetch();
 },
 onError: (error) => toast.error(error.message),
 });

 const resetReconciliationForm = () => {
 setReconciliationForm({
 reconciliationDate: new Date().toISOString().split('T')[0],
 periodStart: '',
 periodEnd: '',
 statementBalance: '',
 bookBalance: '',
 notes: '',
 });
 };

 const handleCreateReconciliation = () => {
 if (!selectedBankAccountId) {
 toast.error(t.treasuryCashManagement.selectBankAccount);
 return;
 }
 createReconciliationMutation.mutate({
 organizationId,
 operatingUnitId,
 bankAccountId: selectedBankAccountId,
 reconciliationDate: reconciliationForm.reconciliationDate,
 periodStart: reconciliationForm.periodStart,
 periodEnd: reconciliationForm.periodEnd,
 statementBalance: reconciliationForm.statementBalance,
 bookBalance: reconciliationForm.bookBalance,
 notes: reconciliationForm.notes,
 });
 };

 const navigate = useNavigate();
 const handleViewReconciliation = (recon: any) => {
 navigate(`/organization/finance/treasury/reconciliation/${recon.id}`);
 };

 const getStatusBadge = (status: string) => {
 const statusColors: Record<string, string> = {
 draft: 'bg-gray-100 text-gray-800',
 in_progress: 'bg-blue-100 text-blue-800',
 completed: 'bg-green-100 text-green-800',
 approved: 'bg-emerald-100 text-emerald-800',
 };
 const statusLabels: Record<string, string> = {
 draft: t.treasuryCashManagement.draft,
 in_progress: t.treasuryCashManagement.inProgress,
 completed: t.treasuryCashManagement.completed,
 approved: t.treasuryCashManagement.approved,
 };
 return (
 <Badge className={statusColors[status] || 'bg-gray-100'}>
 {statusLabels[status] || status}
 </Badge>
 );
 };

 const formatDate = (date: string | Date) => {
 if (!date) return '-';
 return new Date(date).toLocaleDateString('en-US');
 };

 return (
 <div className="space-y-6">
 {/* Bank Account Selection */}
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">{t.treasuryCashManagement.selectBankAccount}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="flex items-center gap-4">
 <Select
 value={selectedBankAccountId?.toString() || ''}
 onValueChange={(v) => setSelectedBankAccountId(parseInt(v))}
 >
 <SelectTrigger className="w-[300px]">
 <SelectValue placeholder={t.treasuryCashManagement.selectBankAccount} />
 </SelectTrigger>
 <SelectContent>
 {bankAccounts.map((account: any) => (
 <SelectItem key={account.id} value={account.id.toString()}>
 {language === 'ar' && account.accountNameAr ? account.accountNameAr : account.accountName} - {account.accountNumber}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 <Button

 onClick={() => setShowNewReconciliationDialog(true)}
 disabled={!selectedBankAccountId}
 >
 <Plus className="h-4 w-4 me-2" />
 {t.treasuryCashManagement.newReconciliation}
 </Button>
 </div>
 </CardContent>
 </Card>

 {/* Reconciliation History */}
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">{t.treasuryCashManagement.reconciliationHistory}</CardTitle>
 </CardHeader>
 <CardContent>
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead>{t.treasuryCashManagement.reconciliationDate}</TableHead>
 <TableHead>{t.treasuryCashManagement.periodStart}</TableHead>
 <TableHead>{t.treasuryCashManagement.periodEnd}</TableHead>
 <TableHead className="text-end">{t.treasuryCashManagement.statementBalance}</TableHead>
 <TableHead className="text-end">{t.treasuryCashManagement.bookBalance}</TableHead>
 <TableHead className="text-end">{t.treasuryCashManagement.difference}</TableHead>
 <TableHead>{t.treasuryCashManagement.reconciliationStatus}</TableHead>
 <TableHead className="text-center">{t.treasuryCashManagement.actions}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {reconciliationsQuery.isLoading ? (
 <TableRow>
 <TableCell colSpan={8} className="text-center py-8">
 <Loader2 className="h-6 w-6 animate-spin mx-auto" />
 </TableCell>
 </TableRow>
 ) : !reconciliationsQuery.data?.length ? (
 <TableRow>
 <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
 {t.treasuryCashManagement.noReconciliations}
 </TableCell>
 </TableRow>
 ) : (
 reconciliationsQuery.data.map((recon: any) => (
 <TableRow key={recon.id}>
 <TableCell>{formatDate(recon.reconciliationDate)}</TableCell>
 <TableCell>{formatDate(recon.periodStart)}</TableCell>
 <TableCell>{formatDate(recon.periodEnd)}</TableCell>
 <TableCell className="text-end">{formatCurrency(recon.statementBalance || 0)}</TableCell>
 <TableCell className="text-end">{formatCurrency(recon.bookBalance || 0)}</TableCell>
 <TableCell className="text-end">
 <span className={parseFloat(recon.difference || '0') !== 0 ? 'text-red-600' : 'text-green-600'}>
 {formatCurrency(recon.difference || 0)}
 </span>
 </TableCell>
 <TableCell>{getStatusBadge(recon.status)}</TableCell>
 <TableCell>
 <div className="flex items-center gap-1">
 <Button variant="ghost" size="icon" onClick={() => handleViewReconciliation(recon)}>
 <Eye className="h-4 w-4" />
 </Button>
 {recon.status === 'draft' && (
 <Button 
 variant="ghost" 
 size="icon" 
 onClick={() => startReconciliationMutation.mutate({ id: recon.id })}
 >
 <Play className="h-4 w-4" />
 </Button>
 )}
 {recon.status === 'completed' && (
 <Button 
 variant="ghost" 
 size="icon" 
 onClick={() => approveReconciliationMutation.mutate({ id: recon.id })}
 >
 <CheckCircle2 className="h-4 w-4 text-green-600" />
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

 {/* New Reconciliation Dialog */}
 <Dialog open={showNewReconciliationDialog} onOpenChange={setShowNewReconciliationDialog}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>{t.treasuryCashManagement.newReconciliation}</DialogTitle>
 </DialogHeader>
 <div className="grid gap-4 py-4">
 <div className="space-y-2">
 <Label>{t.treasuryCashManagement.reconciliationDate}</Label>
 <Input
 type="date"
 value={reconciliationForm.reconciliationDate}
 onChange={(e) => setReconciliationForm({ ...reconciliationForm, reconciliationDate: e.target.value })}
 />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>{t.treasuryCashManagement.periodStart}</Label>
 <Input
 type="date"
 value={reconciliationForm.periodStart}
 onChange={(e) => setReconciliationForm({ ...reconciliationForm, periodStart: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.treasuryCashManagement.periodEnd}</Label>
 <Input
 type="date"
 value={reconciliationForm.periodEnd}
 onChange={(e) => setReconciliationForm({ ...reconciliationForm, periodEnd: e.target.value })}
 />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>{t.treasuryCashManagement.statementBalance}</Label>
 <Input
 type="number"
 step="0.01"
 value={reconciliationForm.statementBalance}
 onChange={(e) => setReconciliationForm({ ...reconciliationForm, statementBalance: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <Label>{t.treasuryCashManagement.bookBalance}</Label>
 <Input
 type="number"
 step="0.01"
 value={reconciliationForm.bookBalance}
 onChange={(e) => setReconciliationForm({ ...reconciliationForm, bookBalance: e.target.value })}
 />
 </div>
 </div>
 <div className="space-y-2">
 <Label>{t.treasuryCashManagement.notes}</Label>
 <Textarea
 value={reconciliationForm.notes}
 onChange={(e) => setReconciliationForm({ ...reconciliationForm, notes: e.target.value })}
 />
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowNewReconciliationDialog(false)}>
 {t.treasuryCashManagement.cancel}
 </Button>
 <Button onClick={handleCreateReconciliation} disabled={createReconciliationMutation.isPending}>
 {createReconciliationMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t.treasuryCashManagement.create}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Reconciliation Detail Dialog */}
 <Dialog open={showReconciliationDetailDialog} onOpenChange={setShowReconciliationDetailDialog}>
 <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>{t.treasuryCashManagement.reconciliationSummary}</DialogTitle>
 </DialogHeader>
 {selectedReconciliation && (
 <div className="space-y-6 py-4">
 {/* Summary Cards */}
 <div className="grid grid-cols-4 gap-4">
 <Card>
 <CardContent className="pt-4">
 <div className="text-sm text-muted-foreground">{t.treasuryCashManagement.statementBalance}</div>
 <div className="text-xl font-bold">{formatCurrency(selectedReconciliation.statementBalance || 0)}</div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-4">
 <div className="text-sm text-muted-foreground">{t.treasuryCashManagement.bookBalance}</div>
 <div className="text-xl font-bold">{formatCurrency(selectedReconciliation.bookBalance || 0)}</div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-4">
 <div className="text-sm text-muted-foreground">{t.treasuryCashManagement.reconciledBalance}</div>
 <div className="text-xl font-bold">{formatCurrency(selectedReconciliation.reconciledBalance || 0)}</div>
 </CardContent>
 </Card>
 <Card>
 <CardContent className="pt-4">
 <div className="text-sm text-muted-foreground">{t.treasuryCashManagement.difference}</div>
 <div className={`text-xl font-bold ${parseFloat(selectedReconciliation.difference || '0') !== 0 ? 'text-red-600' : 'text-green-600'}`}>
 {formatCurrency(selectedReconciliation.difference || 0)}
 </div>
 </CardContent>
 </Card>
 </div>

 {/* Status and Actions */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <span className="text-muted-foreground">{t.treasuryCashManagement.reconciliationStatus}:</span>
 {getStatusBadge(selectedReconciliation.status)}
 </div>
 <div className="flex items-center gap-2">
 {selectedReconciliation.status === 'in_progress' && (
 <Button 
 onClick={() => completeReconciliationMutation.mutate({ 
 id: selectedReconciliation.id,
 reconciledBalance: selectedReconciliation.bookBalance,
 })}
 disabled={completeReconciliationMutation.isPending}
 >
 {completeReconciliationMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t.treasuryCashManagement.completeReconciliation}
 </Button>
 )}
 </div>
 </div>

 {/* Unmatched Transactions */}
 {selectedReconciliation.status === 'in_progress' && unreconciledTransactionsQuery.data?.length > 0 && (
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">{t.treasuryCashManagement.unmatchedTransactions}</CardTitle>
 </CardHeader>
 <CardContent>
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="text-center">{t.treasuryCashManagement.transactionDate}</TableHead>
 <TableHead>{t.treasuryCashManagement.description}</TableHead>
 <TableHead className="text-end">{t.treasuryCashManagement.amount}</TableHead>
 <TableHead className="text-center">{t.treasuryCashManagement.actions}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {unreconciledTransactionsQuery.data.map((txn: any) => (
 <TableRow key={txn.id}>
 <TableCell>{formatDate(txn.transactionDate)}</TableCell>
 <TableCell>{txn.description}</TableCell>
 <TableCell className="text-end">{formatCurrency(txn.amount)}</TableCell>
 <TableCell>
 <Button 
 variant="outline" 
 size="sm"
 onClick={() => addTransactionsMutation.mutate({
 reconciliationId: selectedReconciliation.id,
 transactionIds: [txn.id],
 })}
 >
 {t.treasuryCashManagement.matchTransactions}
 </Button>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </CardContent>
 </Card>
 )}
 </div>
 )}
 <DialogFooter>
 <Button variant="outline" onClick={() => setShowReconciliationDetailDialog(false)}>
 {t.treasuryCashManagement.cancel}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
