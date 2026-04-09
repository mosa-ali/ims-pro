/**
 * Treasury & Cash Management Page
 * Provides bank accounts, cash transactions, and fund balances management
 * Features: CRUD, Import/Export, RTL/LTR support
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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  ArrowLeft,
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
} from 'lucide-react';
import { Link } from 'wouter';
import * as XLSX from 'xlsx';

// Translations
const translations = {
  en: {
    title: 'Treasury & Cash Management',
    subtitle: 'Manage bank accounts, cash transactions, and fund balances',
    backToFinance: 'Back to Finance',
    
    // Tabs
    bankAccounts: 'Bank Accounts',
    cashTransactions: 'Cash Transactions',
    fundBalances: 'Fund Balances',
    
    // Bank Accounts
    newBankAccount: 'New Bank Account',
    editBankAccount: 'Edit Bank Account',
    accountName: 'Account Name',
    accountNameAr: 'Account Name (Arabic)',
    accountNumber: 'Account Number',
    bankName: 'Bank Name',
    bankNameAr: 'Bank Name (Arabic)',
    branchName: 'Branch Name',
    branchCode: 'Branch Code',
    swiftCode: 'SWIFT/BIC Code',
    accountType: 'Account Type',
    currency: 'Currency',
    openingBalance: 'Opening Balance',
    currentBalance: 'Current Balance',
    contactPerson: 'Contact Person',
    contactPhone: 'Contact Phone',
    notes: 'Notes',
    status: 'Status',
    active: 'Active',
    inactive: 'Inactive',
    
    // Account Types
    checking: 'Checking',
    savings: 'Savings',
    moneyMarket: 'Money Market',
    pettyCash: 'Petty Cash',
    safe: 'Safe',
    
    // Cash Transactions
    newTransaction: 'New Transaction',
    transactionNumber: 'Transaction #',
    transactionDate: 'Date',
    transactionType: 'Type',
    amount: 'Amount',
    description: 'Description',
    referenceNumber: 'Reference #',
    payee: 'Payee/Payer',
    balanceAfter: 'Balance After',
    
    // Transaction Types
    deposit: 'Deposit',
    withdrawal: 'Withdrawal',
    transferIn: 'Transfer In',
    transferOut: 'Transfer Out',
    bankCharge: 'Bank Charge',
    interest: 'Interest',
    adjustment: 'Adjustment',
    
    // Fund Balances
    newFund: 'New Fund',
    editFund: 'Edit Fund',
    fundCode: 'Fund Code',
    fundName: 'Fund Name',
    fundNameAr: 'Fund Name (Arabic)',
    fundType: 'Fund Type',
    totalBudget: 'Total Budget',
    
    // Fund Types
    restricted: 'Restricted',
    unrestricted: 'Unrestricted',
    temporarilyRestricted: 'Temporarily Restricted',
    donorDesignated: 'Donor Designated',
    
    // Actions
    create: 'Create',
    update: 'Update',
    delete: 'Delete',
    cancel: 'Cancel',
    save: 'Save',
    import: 'Import',
    export: 'Export',
    search: 'Search...',
    
    // Import
    importBankAccounts: 'Import Bank Accounts',
    importFunds: 'Import Funds',
    allowDuplicates: 'Allow Duplicates',
    downloadTemplate: 'Download Template',
    selectFile: 'Select Excel File',
    importing: 'Importing...',
    importResults: 'Import Results',
    imported: 'Imported',
    skipped: 'Skipped',
    errors: 'Errors',
    
    // Messages
    confirmDelete: 'Are you sure you want to delete this item?',
    deleteSuccess: 'Item deleted successfully',
    createSuccess: 'Item created successfully',
    updateSuccess: 'Item updated successfully',
    importSuccess: 'Import completed',
    noData: 'No data found',
    loading: 'Loading...',
    
    // Statistics
    totalAccounts: 'Total Accounts',
    activeAccounts: 'Active Accounts',
    totalBalance: 'Total Balance',
    restrictedFunds: 'Restricted Funds',
    unrestrictedFunds: 'Unrestricted Funds',
  },
  ar: {
    title: 'الخزينة وإدارة النقد',
    subtitle: 'إدارة الحسابات البنكية والمعاملات النقدية وأرصدة الصناديق',
    backToFinance: 'العودة إلى المالية',
    
    // Tabs
    bankAccounts: 'الحسابات البنكية',
    cashTransactions: 'المعاملات النقدية',
    fundBalances: 'أرصدة الصناديق',
    
    // Bank Accounts
    newBankAccount: 'حساب بنكي جديد',
    editBankAccount: 'تعديل الحساب البنكي',
    accountName: 'اسم الحساب',
    accountNameAr: 'اسم الحساب (عربي)',
    accountNumber: 'رقم الحساب',
    bankName: 'اسم البنك',
    bankNameAr: 'اسم البنك (عربي)',
    branchName: 'اسم الفرع',
    branchCode: 'رمز الفرع',
    swiftCode: 'رمز SWIFT/BIC',
    accountType: 'نوع الحساب',
    currency: 'العملة',
    openingBalance: 'الرصيد الافتتاحي',
    currentBalance: 'الرصيد الحالي',
    contactPerson: 'جهة الاتصال',
    contactPhone: 'هاتف الاتصال',
    notes: 'ملاحظات',
    status: 'الحالة',
    active: 'نشط',
    inactive: 'غير نشط',
    
    // Account Types
    checking: 'جاري',
    savings: 'توفير',
    moneyMarket: 'سوق المال',
    pettyCash: 'صندوق نثرية',
    safe: 'خزنة',
    
    // Cash Transactions
    newTransaction: 'معاملة جديدة',
    transactionNumber: 'رقم المعاملة',
    transactionDate: 'التاريخ',
    transactionType: 'النوع',
    amount: 'المبلغ',
    description: 'الوصف',
    referenceNumber: 'رقم المرجع',
    payee: 'المستفيد/الدافع',
    balanceAfter: 'الرصيد بعد',
    
    // Transaction Types
    deposit: 'إيداع',
    withdrawal: 'سحب',
    transferIn: 'تحويل وارد',
    transferOut: 'تحويل صادر',
    bankCharge: 'رسوم بنكية',
    interest: 'فائدة',
    adjustment: 'تسوية',
    
    // Fund Balances
    newFund: 'صندوق جديد',
    editFund: 'تعديل الصندوق',
    fundCode: 'رمز الصندوق',
    fundName: 'اسم الصندوق',
    fundNameAr: 'اسم الصندوق (عربي)',
    fundType: 'نوع الصندوق',
    totalBudget: 'إجمالي الميزانية',
    
    // Fund Types
    restricted: 'مقيد',
    unrestricted: 'غير مقيد',
    temporarilyRestricted: 'مقيد مؤقتاً',
    donorDesignated: 'مخصص من المانح',
    
    // Actions
    create: 'إنشاء',
    update: 'تحديث',
    delete: 'حذف',
    cancel: 'إلغاء',
    save: 'حفظ',
    import: 'استيراد',
    export: 'تصدير',
    search: 'بحث...',
    
    // Import
    importBankAccounts: 'استيراد الحسابات البنكية',
    importFunds: 'استيراد الصناديق',
    allowDuplicates: 'السماح بالتكرار',
    downloadTemplate: 'تحميل القالب',
    selectFile: 'اختر ملف Excel',
    importing: 'جاري الاستيراد...',
    importResults: 'نتائج الاستيراد',
    imported: 'تم استيراده',
    skipped: 'تم تخطيه',
    errors: 'أخطاء',
    
    // Messages
    confirmDelete: 'هل أنت متأكد من حذف هذا العنصر؟',
    deleteSuccess: 'تم حذف العنصر بنجاح',
    createSuccess: 'تم إنشاء العنصر بنجاح',
    updateSuccess: 'تم تحديث العنصر بنجاح',
    importSuccess: 'اكتمل الاستيراد',
    noData: 'لا توجد بيانات',
    loading: 'جاري التحميل...',
    
    // Statistics
    totalAccounts: 'إجمالي الحسابات',
    activeAccounts: 'الحسابات النشطة',
    totalBalance: 'إجمالي الرصيد',
    restrictedFunds: 'الصناديق المقيدة',
    unrestrictedFunds: 'الصناديق غير المقيدة',
  },
};

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
  const { language, isRTL } = useLanguage();
  const { currentOrganization } = useOrganization();
  const t = translations[language as keyof typeof translations] || translations.en;
  const organizationId = currentOrganization?.id || 30001;

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
      toast.success(t.createSuccess);
      setShowBankAccountDialog(false);
      bankAccountsQuery.refetch();
      bankStatsQuery.refetch();
      resetBankAccountForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateBankAccountMutation = trpc.treasury.updateBankAccount.useMutation({
    onSuccess: () => {
      toast.success(t.updateSuccess);
      setShowBankAccountDialog(false);
      bankAccountsQuery.refetch();
      setEditingBankAccount(null);
      resetBankAccountForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteBankAccountMutation = trpc.treasury.deleteBankAccount.useMutation({
    onSuccess: () => {
      toast.success(t.deleteSuccess);
      bankAccountsQuery.refetch();
      bankStatsQuery.refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const bulkImportBankAccountsMutation = trpc.treasury.bulkImportBankAccounts.useMutation({
    onSuccess: (results) => {
      setBankImportResults(results);
      toast.success(`${t.importSuccess}: ${results.imported} ${t.imported}`);
      bankAccountsQuery.refetch();
      bankStatsQuery.refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const createTransactionMutation = trpc.treasury.createCashTransaction.useMutation({
    onSuccess: () => {
      toast.success(t.createSuccess);
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
      toast.success(t.deleteSuccess);
      transactionsQuery.refetch();
      bankAccountsQuery.refetch();
      bankStatsQuery.refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const createFundMutation = trpc.treasury.createFundBalance.useMutation({
    onSuccess: () => {
      toast.success(t.createSuccess);
      setShowFundDialog(false);
      fundBalancesQuery.refetch();
      fundStatsQuery.refetch();
      resetFundForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateFundMutation = trpc.treasury.updateFundBalance.useMutation({
    onSuccess: () => {
      toast.success(t.updateSuccess);
      setShowFundDialog(false);
      fundBalancesQuery.refetch();
      setEditingFund(null);
      resetFundForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteFundMutation = trpc.treasury.deleteFundBalance.useMutation({
    onSuccess: () => {
      toast.success(t.deleteSuccess);
      fundBalancesQuery.refetch();
      fundStatsQuery.refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const bulkImportFundsMutation = trpc.treasury.bulkImportFundBalances.useMutation({
    onSuccess: (results) => {
      setFundImportResults(results);
      toast.success(`${t.importSuccess}: ${results.imported} ${t.imported}`);
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
    if (window.confirm(t.confirmDelete)) {
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
    if (window.confirm(t.confirmDelete)) {
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
    if (window.confirm(t.confirmDelete)) {
      deleteTransactionMutation.mutate({ id });
    }
  };

  // Import/Export Functions
  const downloadBankAccountTemplate = () => {
    const template = [
      {
        'Account Name': 'Main Operating Account',
        'Account Name (Arabic)': 'الحساب التشغيلي الرئيسي',
        'Account Number': '1234567890',
        'Bank Name': 'First National Bank',
        'Bank Name (Arabic)': 'البنك الوطني الأول',
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
        'Fund Name (Arabic)': 'صندوق التشغيل العام',
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
          accountNameAr: row['Account Name (Arabic)'] || '',
          accountNumber: String(row['Account Number'] || ''),
          bankName: row['Bank Name'] || '',
          bankNameAr: row['Bank Name (Arabic)'] || '',
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
          fundNameAr: row['Fund Name (Arabic)'] || '',
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
      'Account Name (Arabic)': account.accountNameAr || '',
      'Account Number': account.accountNumber,
      'Bank Name': account.bankName,
      'Bank Name (Arabic)': account.bankNameAr || '',
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
      'Fund Name (Arabic)': fund.fundNameAr || '',
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
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency,
    }).format(num || 0);
  };

  return (
    <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/organization/finance">
              <Button variant="ghost" size="sm">
                <ArrowLeft className={`h-4 w-4 ${isRTL ? 'ml-2 rotate-180' : 'mr-2'}`} />
                {t.backToFinance}
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t.title}</h1>
              <p className="text-muted-foreground mt-1">{t.subtitle}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="bank-accounts" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {t.bankAccounts}
            </TabsTrigger>
            <TabsTrigger value="cash-transactions" className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4" />
              {t.cashTransactions}
            </TabsTrigger>
            <TabsTrigger value="fund-balances" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              {t.fundBalances}
            </TabsTrigger>
          </TabsList>

          {/* Bank Accounts Tab */}
          <TabsContent value="bank-accounts">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t.totalAccounts}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{bankStatsQuery.data?.total || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t.activeAccounts}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{bankStatsQuery.data?.active || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t.totalBalance}
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
                <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
                <Input
                  placeholder={t.search}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={isRTL ? 'pr-10' : 'pl-10'}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={exportBankAccounts}>
                  <Download className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {t.export}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowBankImportDialog(true)}>
                  <Upload className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {t.import}
                </Button>
                <Button onClick={() => { resetBankAccountForm(); setEditingBankAccount(null); setShowBankAccountDialog(true); }}>
                  <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {t.newBankAccount}
                </Button>
              </div>
            </div>

            {/* Bank Accounts Table */}
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.accountName}</TableHead>
                    <TableHead>{t.accountNumber}</TableHead>
                    <TableHead>{t.bankName}</TableHead>
                    <TableHead>{t.accountType}</TableHead>
                    <TableHead>{t.currentBalance}</TableHead>
                    <TableHead>{t.status}</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBankAccounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {bankAccountsQuery.isLoading ? t.loading : t.noData}
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
                            {account.isActive ? t.active : t.inactive}
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
                    <SelectValue placeholder={t.bankAccounts} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'ar' ? 'جميع الحسابات' : 'All Accounts'}</SelectItem>
                    {(bankAccountsQuery.data || []).map((account: any) => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {language === 'ar' && account.accountNameAr ? account.accountNameAr : account.accountName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => { resetTransactionForm(); setShowTransactionDialog(true); }}>
                <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {t.newTransaction}
              </Button>
            </div>

            {/* Transactions Table */}
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.transactionNumber}</TableHead>
                    <TableHead>{t.transactionDate}</TableHead>
                    <TableHead>{t.transactionType}</TableHead>
                    <TableHead>{t.amount}</TableHead>
                    <TableHead>{t.description}</TableHead>
                    <TableHead>{t.balanceAfter}</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!transactionsQuery.data || transactionsQuery.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {transactionsQuery.isLoading ? t.loading : t.noData}
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
                    {t.totalBalance}
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
                    {t.restrictedFunds}
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
                    {t.unrestrictedFunds}
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
                <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
                <Input
                  placeholder={t.search}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={isRTL ? 'pr-10' : 'pl-10'}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={exportFundBalances}>
                  <Download className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {t.export}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowFundImportDialog(true)}>
                  <Upload className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {t.import}
                </Button>
                <Button onClick={() => { resetFundForm(); setEditingFund(null); setShowFundDialog(true); }}>
                  <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {t.newFund}
                </Button>
              </div>
            </div>

            {/* Fund Balances Table */}
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.fundCode}</TableHead>
                    <TableHead>{t.fundName}</TableHead>
                    <TableHead>{t.fundType}</TableHead>
                    <TableHead>{t.totalBudget}</TableHead>
                    <TableHead>{t.currentBalance}</TableHead>
                    <TableHead>{t.status}</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFunds.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {fundBalancesQuery.isLoading ? t.loading : t.noData}
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
                            {fund.isActive ? t.active : t.inactive}
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
        </Tabs>
      </div>

      {/* Bank Account Dialog */}
      <Dialog open={showBankAccountDialog} onOpenChange={setShowBankAccountDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBankAccount ? t.editBankAccount : t.newBankAccount}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>{t.accountName} *</Label>
              <Input
                value={bankAccountForm.accountName}
                onChange={(e) => setBankAccountForm({ ...bankAccountForm, accountName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.accountNameAr}</Label>
              <Input
                value={bankAccountForm.accountNameAr}
                onChange={(e) => setBankAccountForm({ ...bankAccountForm, accountNameAr: e.target.value })}
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.accountNumber} *</Label>
              <Input
                value={bankAccountForm.accountNumber}
                onChange={(e) => setBankAccountForm({ ...bankAccountForm, accountNumber: e.target.value })}
                disabled={!!editingBankAccount}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.accountType} *</Label>
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
              <Label>{t.bankName} *</Label>
              <Input
                value={bankAccountForm.bankName}
                onChange={(e) => setBankAccountForm({ ...bankAccountForm, bankName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.bankNameAr}</Label>
              <Input
                value={bankAccountForm.bankNameAr}
                onChange={(e) => setBankAccountForm({ ...bankAccountForm, bankNameAr: e.target.value })}
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.branchName}</Label>
              <Input
                value={bankAccountForm.branchName}
                onChange={(e) => setBankAccountForm({ ...bankAccountForm, branchName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.branchCode}</Label>
              <Input
                value={bankAccountForm.branchCode}
                onChange={(e) => setBankAccountForm({ ...bankAccountForm, branchCode: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.swiftCode}</Label>
              <Input
                value={bankAccountForm.swiftCode}
                onChange={(e) => setBankAccountForm({ ...bankAccountForm, swiftCode: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.currency}</Label>
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
                <Label>{t.openingBalance}</Label>
                <Input
                  type="number"
                  value={bankAccountForm.openingBalance}
                  onChange={(e) => setBankAccountForm({ ...bankAccountForm, openingBalance: parseFloat(e.target.value) || 0 })}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>{t.contactPerson}</Label>
              <Input
                value={bankAccountForm.contactPerson}
                onChange={(e) => setBankAccountForm({ ...bankAccountForm, contactPerson: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.contactPhone}</Label>
              <Input
                value={bankAccountForm.contactPhone}
                onChange={(e) => setBankAccountForm({ ...bankAccountForm, contactPhone: e.target.value })}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>{t.notes}</Label>
              <Textarea
                value={bankAccountForm.notes}
                onChange={(e) => setBankAccountForm({ ...bankAccountForm, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBankAccountDialog(false)}>{t.cancel}</Button>
            <Button onClick={handleSaveBankAccount} disabled={createBankAccountMutation.isPending || updateBankAccountMutation.isPending}>
              {editingBankAccount ? t.update : t.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Dialog */}
      <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.newTransaction}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t.bankAccounts} *</Label>
              <Select
                value={transactionForm.bankAccountId?.toString() || ''}
                onValueChange={(v) => setTransactionForm({ ...transactionForm, bankAccountId: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر الحساب' : 'Select Account'} />
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
                <Label>{t.transactionDate} *</Label>
                <Input
                  type="date"
                  value={transactionForm.transactionDate}
                  onChange={(e) => setTransactionForm({ ...transactionForm, transactionDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.transactionType} *</Label>
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
              <Label>{t.amount} *</Label>
              <Input
                type="number"
                value={transactionForm.amount}
                onChange={(e) => setTransactionForm({ ...transactionForm, amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.referenceNumber}</Label>
              <Input
                value={transactionForm.referenceNumber}
                onChange={(e) => setTransactionForm({ ...transactionForm, referenceNumber: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.payee}</Label>
              <Input
                value={transactionForm.payee}
                onChange={(e) => setTransactionForm({ ...transactionForm, payee: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.description}</Label>
              <Textarea
                value={transactionForm.description}
                onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransactionDialog(false)}>{t.cancel}</Button>
            <Button onClick={handleSaveTransaction} disabled={createTransactionMutation.isPending}>
              {t.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fund Dialog */}
      <Dialog open={showFundDialog} onOpenChange={setShowFundDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFund ? t.editFund : t.newFund}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.fundCode} *</Label>
                <Input
                  value={fundForm.fundCode}
                  onChange={(e) => setFundForm({ ...fundForm, fundCode: e.target.value })}
                  disabled={!!editingFund}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.fundType} *</Label>
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
              <Label>{t.fundName} *</Label>
              <Input
                value={fundForm.fundName}
                onChange={(e) => setFundForm({ ...fundForm, fundName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.fundNameAr}</Label>
              <Input
                value={fundForm.fundNameAr}
                onChange={(e) => setFundForm({ ...fundForm, fundNameAr: e.target.value })}
                dir="rtl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.currency}</Label>
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
                  <Label>{t.openingBalance}</Label>
                  <Input
                    type="number"
                    value={fundForm.openingBalance}
                    onChange={(e) => setFundForm({ ...fundForm, openingBalance: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t.description}</Label>
              <Textarea
                value={fundForm.description}
                onChange={(e) => setFundForm({ ...fundForm, description: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFundDialog(false)}>{t.cancel}</Button>
            <Button onClick={handleSaveFund} disabled={createFundMutation.isPending || updateFundMutation.isPending}>
              {editingFund ? t.update : t.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bank Import Dialog */}
      <Dialog open={showBankImportDialog} onOpenChange={setShowBankImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.importBankAccounts}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Button variant="outline" onClick={downloadBankAccountTemplate} className="w-full">
              <FileSpreadsheet className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t.downloadTemplate}
            </Button>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allowDuplicates"
                checked={bankImportAllowDuplicates}
                onCheckedChange={(checked) => setBankImportAllowDuplicates(!!checked)}
              />
              <Label htmlFor="allowDuplicates">{t.allowDuplicates}</Label>
            </div>
            <div className="space-y-2">
              <Label>{t.selectFile}</Label>
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleBankAccountImport}
              />
            </div>
            {bankImportResults && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <h4 className="font-medium">{t.importResults}</h4>
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  {t.imported}: {bankImportResults.imported}
                </div>
                <div className="flex items-center gap-2 text-yellow-600">
                  <AlertCircle className="h-4 w-4" />
                  {t.skipped}: {bankImportResults.skipped}
                </div>
                {bankImportResults.errors.length > 0 && (
                  <div className="text-red-600 text-sm">
                    {t.errors}: {bankImportResults.errors.length}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowBankImportDialog(false); setBankImportResults(null); }}>
              {t.cancel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fund Import Dialog */}
      <Dialog open={showFundImportDialog} onOpenChange={setShowFundImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.importFunds}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Button variant="outline" onClick={downloadFundTemplate} className="w-full">
              <FileSpreadsheet className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t.downloadTemplate}
            </Button>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allowFundDuplicates"
                checked={fundImportAllowDuplicates}
                onCheckedChange={(checked) => setFundImportAllowDuplicates(!!checked)}
              />
              <Label htmlFor="allowFundDuplicates">{t.allowDuplicates}</Label>
            </div>
            <div className="space-y-2">
              <Label>{t.selectFile}</Label>
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFundImport}
              />
            </div>
            {fundImportResults && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <h4 className="font-medium">{t.importResults}</h4>
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  {t.imported}: {fundImportResults.imported}
                </div>
                <div className="flex items-center gap-2 text-yellow-600">
                  <AlertCircle className="h-4 w-4" />
                  {t.skipped}: {fundImportResults.skipped}
                </div>
                {fundImportResults.errors.length > 0 && (
                  <div className="text-red-600 text-sm">
                    {t.errors}: {fundImportResults.errors.length}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowFundImportDialog(false); setFundImportResults(null); }}>
              {t.cancel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
