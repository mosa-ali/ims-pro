/**
 * Bank Statement Import Page
 * 
 * Allows users to upload CSV/Excel bank statements with intelligent column mapping
 */

import { useState, useCallback } from"react";
import { useNavigate } from '@/lib/router-compat';
import { useLanguage } from"@/contexts/LanguageContext";
import { useOperatingUnit } from"@/contexts/OperatingUnitContext";
import { trpc } from"@/lib/trpc";
import { Button } from"@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from"@/components/ui/table";
import { Alert, AlertDescription } from"@/components/ui/alert";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download } from"lucide-react";
import { toast } from"react-hot-toast";
import { useTranslation } from '@/i18n/useTranslation';
import { BackButton } from "@/components/BackButton";

interface PreviewData {
 headers: string[];
 rows: Record<string, any>[];
 detectedColumns: {
 date?: string;
 description?: string;
 reference?: string;
 debit?: string;
 credit?: string;
 balance?: string;
 };
}

export default function BankStatementImport() {
 const { t } = useTranslation();
 const navigate = useNavigate();
 const { language, direction: dir, isRTL } = useLanguage();
 // Using centralized translations via t.bankStatementImport
 const { currentOrganizationId, currentOperatingUnitId } = useOperatingUnit();

 const [file, setFile] = useState<File | null>(null);
 const [fileData, setFileData] = useState<string>("");
 const [preview, setPreview] = useState<PreviewData | null>(null);
 const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
 const [selectedBankAccount, setSelectedBankAccount] = useState<string>("");
 const [isUploading, setIsUploading] = useState(false);
 const [importResult, setImportResult] = useState<{
 success: boolean;
 imported: number;
 duplicates: number;
 errors: string[];
 } | null>(null);

 // Fetch bank accounts
 const bankAccountsQuery = trpc.treasury.bankAccounts.list.useQuery(
 {
 organizationId: currentOrganizationId!,
 operatingUnitId: currentOperatingUnitId!,
 },
 { enabled: !!currentOrganizationId && !!currentOperatingUnitId }
 );

 const previewMutation = trpc.bankStatementImport.preview.useMutation();
 const importMutation = trpc.bankStatementImport.import.useMutation();

 // Handle file selection
 const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
 const selectedFile = e.target.files?.[0];
 if (!selectedFile) return;

 // Validate file type
 const ext = selectedFile.name.toLowerCase().split('.').pop();
 if (!['csv', 'xlsx', 'xls'].includes(ext || '')) {
 toast.error(t.bankStatementImport.invalidFileFormat);
 return;
 }

 setFile(selectedFile);
 setPreview(null);
 setImportResult(null);

 // Read file as base64
 const reader = new FileReader();
 reader.onload = async (event) => {
 const base64 = event.target?.result as string;
 const base64Data = base64.split(',')[1]; // Remove data:... prefix
 setFileData(base64Data);

 // Preview the file
 try {
 const result = await previewMutation.mutateAsync({
 fileData: base64Data,
 fileName: selectedFile.name,
 rowCount: 10,
 });

 if (result.success) {
 setPreview({
 headers: result.headers,
 rows: result.rows,
 detectedColumns: result.detectedColumns,
 });

 // Auto-set column mapping from detected columns
 const mapping: Record<string, string> = {};
 if (result.detectedColumns.date) mapping.date = result.detectedColumns.date;
 if (result.detectedColumns.description) mapping.description = result.detectedColumns.description;
 if (result.detectedColumns.reference) mapping.reference = result.detectedColumns.reference;
 if (result.detectedColumns.debit) mapping.debit = result.detectedColumns.debit;
 if (result.detectedColumns.credit) mapping.credit = result.detectedColumns.credit;
 if (result.detectedColumns.balance) mapping.balance = result.detectedColumns.balance;
 setColumnMapping(mapping);

 toast.success(t.bankStatementImport.filePreviewLoaded);
 } else {
 toast.error(result.errors.join(', '));
 }
 } catch (err) {
 toast.error(t.bankStatementImport.failedToPreviewFile);
 }
 };
 reader.readAsDataURL(selectedFile);
 }, [previewMutation, t]);

 // Handle import
 const handleImport = async () => {
 if (!file || !fileData || !selectedBankAccount) {
 toast.error(t.bankStatementImport.pleaseSelectFileAndAccount);
 return;
 }

 // Validate required mappings
 if (!columnMapping.date || !columnMapping.description || !columnMapping.debit || !columnMapping.credit) {
 toast.error(t.bankStatementImport.pleaseMapRequiredColumns);
 return;
 }

 setIsUploading(true);

 try {
 const result = await importMutation.mutateAsync({
 organizationId: currentOrganizationId!,
 operatingUnitId: currentOperatingUnitId!,
 bankAccountId: parseInt(selectedBankAccount),
 fileData,
 fileName: file.name,
 columnMapping: {
 date: columnMapping.date,
 description: columnMapping.description,
 reference: columnMapping.reference,
 debit: columnMapping.debit,
 credit: columnMapping.credit,
 balance: columnMapping.balance,
 },
 startReconciliation: false,
 });

 setImportResult(result);

 if (result.success) {
 toast.success(t.bankStatementImport.transactionsImported);
 } else {
 toast.error(t.bankStatementImport.importFailed);
 }
 } catch (err) {
 toast.error(t.bankStatementImport.failedToImport);
 } finally {
 setIsUploading(false);
 }
 };

 return (
 <div className="container mx-auto py-6" dir={isRTL ? 'rtl' : 'ltr'}>
 {/* Back Navigation */}
 <BackButton onClick={() => navigate('/organization/finance')} label={t.financeModule.backToFinance} />
 <div className="mb-6">
 <h1 className="text-3xl font-bold">
 {t.bankStatementImport.bankStatementImport}
 </h1>
 <p className="text-muted-foreground mt-2">
 {t.bankStatementImport.uploadBankStatementDescription}
 </p>
 </div>

 {/* Step 1: File Upload */}
 <Card className="mb-6">
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Upload className="h-5 w-5" />
 {t.bankStatementImport.step1UploadFile}
 </CardTitle>
 <CardDescription>
 {t.bankStatementImport.selectBankStatementFile}
 </CardDescription>
 </CardHeader>
 <CardContent>
 <div className="space-y-4">
 {/* Bank Account Selection */}
 <div>
 <label className="block text-sm font-medium mb-2">
 {t.bankStatementImport.bankAccount} <span className="text-red-500">*</span>
 </label>
 <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
 <SelectTrigger>
 <SelectValue placeholder={t.bankStatementImport.selectBankAccount} />
 </SelectTrigger>
 <SelectContent>
 {bankAccountsQuery.data?.items.map((account) => (
 <SelectItem key={account.id} value={account.id.toString()}>
 {account.accountName} ({account.accountNumber})
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* File Upload */}
 <div>
 <label className="block text-sm font-medium mb-2">
 {t.bankStatementImport.statementFile} <span className="text-red-500">*</span>
 </label>
 <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
 <input
 type="file"
 accept=".csv,.xlsx,.xls"
 onChange={handleFileSelect}
 className="hidden"
 id="file-upload"
 />
 <label htmlFor="file-upload" className="cursor-pointer">
 <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
 {file ? (
 <div>
 <p className="font-medium">{file.name}</p>
 <p className="text-sm text-muted-foreground">
 {(file.size / 1024).toFixed(2)} KB
 </p>
 </div>
 ) : (
 <div>
 <p className="font-medium">
 {t.bankStatementImport.clickToUpload}
 </p>
 <p className="text-sm text-muted-foreground">
 {t.bankStatementImport.supportedFormats}
 </p>
 </div>
 )}
 </label>
 </div>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Step 2: Column Mapping */}
 {preview && (
 <Card className="mb-6">
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <FileSpreadsheet className="h-5 w-5" />
 {t.bankStatementImport.step2MapColumns}
 </CardTitle>
 <CardDescription>
 {t.bankStatementImport.mapFileColumnsDescription}
 </CardDescription>
 </CardHeader>
 <CardContent>
 <div className="space-y-4">
 {/* Required Mappings */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium mb-2">
 {t.bankStatementImport.dateColumn} <span className="text-red-500">*</span>
 </label>
 <Select value={columnMapping.date ||""} onValueChange={(v) => setColumnMapping({ ...columnMapping, date: v })}>
 <SelectTrigger>
 <SelectValue placeholder={t.bankStatementImport.selectColumn} />
 </SelectTrigger>
 <SelectContent>
 {preview.headers.map((header) => (
 <SelectItem key={header} value={header}>{header}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div>
 <label className="block text-sm font-medium mb-2">
 {t.bankStatementImport.descriptionColumn} <span className="text-red-500">*</span>
 </label>
 <Select value={columnMapping.description ||""} onValueChange={(v) => setColumnMapping({ ...columnMapping, description: v })}>
 <SelectTrigger>
 <SelectValue placeholder={t.bankStatementImport.selectColumn} />
 </SelectTrigger>
 <SelectContent>
 {preview.headers.map((header) => (
 <SelectItem key={header} value={header}>{header}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div>
 <label className="block text-sm font-medium mb-2">
 {t.bankStatementImport.debitColumn} <span className="text-red-500">*</span>
 </label>
 <Select value={columnMapping.debit ||""} onValueChange={(v) => setColumnMapping({ ...columnMapping, debit: v })}>
 <SelectTrigger>
 <SelectValue placeholder={t.bankStatementImport.selectColumn} />
 </SelectTrigger>
 <SelectContent>
 {preview.headers.map((header) => (
 <SelectItem key={header} value={header}>{header}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div>
 <label className="block text-sm font-medium mb-2">
 {t.bankStatementImport.creditColumn} <span className="text-red-500">*</span>
 </label>
 <Select value={columnMapping.credit ||""} onValueChange={(v) => setColumnMapping({ ...columnMapping, credit: v })}>
 <SelectTrigger>
 <SelectValue placeholder={t.bankStatementImport.selectColumn} />
 </SelectTrigger>
 <SelectContent>
 {preview.headers.map((header) => (
 <SelectItem key={header} value={header}>{header}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>

 {/* Optional Mappings */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium mb-2">
 {t.bankStatementImport.referenceColumn} ({t.bankStatementImport.optional})
 </label>
 <Select value={columnMapping.reference || "__none__"} onValueChange={(v) => setColumnMapping({ ...columnMapping, reference: v === "__none__" ? "" : v })}>
 <SelectTrigger>
 <SelectValue placeholder={t.bankStatementImport.selectColumn} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="__none__">{t.bankStatementImport.none}</SelectItem>
 {preview.headers.map((header) => (
 <SelectItem key={header} value={header}>{header}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div>
 <label className="block text-sm font-medium mb-2">
 {t.bankStatementImport.balanceColumn} ({t.bankStatementImport.optional})
 </label>
 <Select value={columnMapping.balance || "__none__"} onValueChange={(v) => setColumnMapping({ ...columnMapping, balance: v === "__none__" ? "" : v })}>
 <SelectTrigger>
 <SelectValue placeholder={t.bankStatementImport.selectColumn} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="__none__">{t.bankStatementImport.none}</SelectItem>
 {preview.headers.map((header) => (
 <SelectItem key={header} value={header}>{header}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>
 </div>
 </CardContent>
 </Card>
 )}

 {/* Step 3: Preview Data */}
 {preview && (
 <Card className="mb-6">
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <CheckCircle className="h-5 w-5" />
 {t.bankStatementImport.step3PreviewData}
 </CardTitle>
 <CardDescription>
 {t.bankStatementImport.previewFirst10Rows}
 </CardDescription>
 </CardHeader>
 <CardContent>
 <div className="overflow-x-auto">
 <Table>
 <TableHeader>
 <TableRow>
 {preview.headers.map((header) => (
 <TableHead key={header}>{header}</TableHead>
 ))}
 </TableRow>
 </TableHeader>
 <TableBody>
 {preview.rows.map((row, idx) => (
 <TableRow key={idx}>
 {preview.headers.map((header) => (
 <TableCell key={header}>{String(row[header] || '')}</TableCell>
 ))}
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>
 </CardContent>
 </Card>
 )}

 {/* Import Button */}
 {preview && (
 <div className="flex justify-end gap-4">
 <Button
 variant="outline"
 onClick={() => {
 setFile(null);
 setPreview(null);
 setColumnMapping({});
 setImportResult(null);
 }}
 >
 {t.bankStatementImport.cancel}
 </Button>
 <Button
 onClick={handleImport}
 disabled={isUploading || !selectedBankAccount}
 >
 {isUploading ? t.bankStatementImport.importing : t.bankStatementImport.importTransactions}
 </Button>
 </div>
 )}

 {/* Import Result */}
 {importResult && (
 <Card className="mt-6">
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 {importResult.success ? (
 <CheckCircle className="h-5 w-5 text-green-500" />
 ) : (
 <AlertCircle className="h-5 w-5 text-red-500" />
 )}
 {t.bankStatementImport.importResults}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
 <p className="text-sm text-muted-foreground">{t.bankStatementImport.imported}</p>
 <p className="text-2xl font-bold text-green-600 dark:text-green-400">
 {importResult.imported}
 </p>
 </div>
 <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
 <p className="text-sm text-muted-foreground">{t.bankStatementImport.duplicates}</p>
 <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
 {importResult.duplicates}
 </p>
 </div>
 <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
 <p className="text-sm text-muted-foreground">{t.bankStatementImport.errors}</p>
 <p className="text-2xl font-bold text-red-600 dark:text-red-400">
 {importResult.errors.length}
 </p>
 </div>
 </div>

 {importResult.errors.length > 0 && (
 <Alert variant="destructive">
 <AlertCircle className="h-4 w-4" />
 <AlertDescription>
 <div className="space-y-1">
 {importResult.errors.map((error, idx) => (
 <p key={idx} className="text-sm">{error}</p>
 ))}
 </div>
 </AlertDescription>
 </Alert>
 )}
 </div>
 </CardContent>
 </Card>
 )}
 </div>
 );
}
