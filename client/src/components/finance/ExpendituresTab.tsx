import { useState } from "react";
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Download, Upload, Clock, AlertCircle, CheckCircle, XCircle, FileText, Layers } from "lucide-react";
import * as XLSX from 'xlsx';
import { VersionHistoryModal } from '@/components/finance/VersionHistoryModal';
import { useTranslation } from '@/i18n/useTranslation';

/**
 * Expenditures Tab Component
 * 
 * Features:
 * - Full CRUD operations for expenditures
 * - Bilingual support (English/Arabic) with RTL/LTR switching
 * - Expenditure status workflow: Draft → Submitted → Approved/Rejected → Paid
 * - Receipt uploads to S3 storage
 * - Vendor tracking
 * - Real-time variance calculations
 * - Export to Excel (data or template)
 * - Import from Excel with validation
 * - Soft delete support
 * 
 * File Path: /client/src/components/finance/ExpendituresTab.tsx
 */
export default function ExpendituresTab() {
 const { t } = useTranslation();
 const { language, isRTL} = useLanguage();
 const { data: expenditures, refetch } = trpc.expenditures.list.useQuery();
 // Projects query requires organizationId and operatingUnitId - using defaults for now
 const { data: projects = [] } = trpc.projects.list.useQuery(
 {},
 { enabled: true }
 );
 const { data: budgets } = trpc.budgets.list.useQuery();
 const { data: payablesSummary } = trpc.prFinance.getPayablesSummary.useQuery();
 const [isCreateOpen, setIsCreateOpen] = useState(false);
 const [showVersionHistory, setShowVersionHistory] = useState(false);
 const [versionHistoryExpenditureId, setVersionHistoryExpenditureId] = useState<number | null>(null);

 // Version history query
 const { data: versionHistoryData, isLoading: isLoadingVersions } = trpc.expenditures.getVersionHistory.useQuery(
 { id: versionHistoryExpenditureId! },
 { enabled: versionHistoryExpenditureId !== null }
 );

 const createMutation = trpc.expenditures.create.useMutation({
 onSuccess: () => {
 toast.success(t.expendituresTab.expenditureCreated);
 refetch();
 setIsCreateOpen(false);
 },
 onError: (error) => {
 toast.error(`Failed to create expenditure: ${error.message}`);
 },
 });

 const updateMutation = trpc.expenditures.update.useMutation({
 onSuccess: () => {
 toast.success(t.expendituresTab.expenditureStatusUpdated);
 refetch();
 },
 onError: (error) => {
 toast.error(`Failed to update expenditure: ${error.message}`);
 },
 });

 const deleteMutation = trpc.expenditures.delete.useMutation({
 onSuccess: () => {
 toast.success(t.expendituresTab.expenditureDeleted);
 refetch();
 },
 onError: (error) => {
 toast.error(`Failed to delete expenditure: ${error.message}`);
 },
 });

 const getStatusBadge = (status: string) => {
 const config: Record<string, { variant: any; icon: any; label: string }> = {
 draft: { variant: "secondary", icon: Clock, label: t.expendituresTab.draft },
 submitted: { variant: "outline", icon: AlertCircle, label: t.expendituresTab.submitted },
 approved: { variant: "default", icon: CheckCircle, label: t.expendituresTab.approved },
 rejected: { variant: "destructive", icon: XCircle, label: t.expendituresTab.rejected },
 paid: { variant: "default", icon: CheckCircle, label: t.expendituresTab.paid },
 };
 const { variant, icon: Icon, label } = config[status] || config.draft;
 return (
 <Badge variant={variant}>
 <Icon className={`h-3 w-3 me-1`} />
 {label}
 </Badge>
 );
 };

 const handleExportToExcel = () => {
 let data;
 let filename;
 let headers;
 
 if (expenditures && expenditures.length > 0) {
 headers = isRTL
 ? ['رقم النفقة', 'رقم المشروع', 'رقم الميزانية', 'المبلغ', 'التاريخ', 'المورد', 'رقم الفاتورة', 'رابط الإيصال', 'الوصف', 'الحالة']
 : ['Expenditure ID', 'Project ID', 'Budget ID', 'Amount', 'Date', 'Vendor', 'Invoice Number', 'Receipt URL', 'Description', 'Status'];
 
 data = expenditures.map((exp: any) => [
 exp.id,
 exp.projectId || '',
 exp.budgetId || '',
 exp.amount,
 exp.expenditureDate ? new Date(exp.expenditureDate).toISOString().split('T')[0] : '',
 exp.vendor || '',
 exp.invoiceNumber || '',
 exp.receiptUrl || '',
 exp.description || '',
 exp.status || 'draft'
 ]);
 filename = `expenditures_${new Date().toISOString().split('T')[0]}.xlsx`;
 toast.success(t.expendituresTab.exportedSuccessfully);
 } else {
 headers = isRTL
 ? ['رقم المشروع', 'رقم الميزانية', 'المبلغ', 'التاريخ', 'المورد', 'رقم الفاتورة', 'رابط الإيصال', 'الوصف']
 : ['Project ID', 'Budget ID', 'Amount', 'Date', 'Vendor', 'Invoice Number', 'Receipt URL', 'Description'];
 
 const exampleRow = isRTL
 ? ['1', '1', '5000', '2025-01-15', 'مورد مثالي', 'INV-001', 'https://example.com/receipt.pdf', 'وصف اختياري']
 : ['1', '1', '5000', '2025-01-15', 'Example Vendor', 'INV-001', 'https://example.com/receipt.pdf', 'Optional description'];
 data = [exampleRow];
 filename = 'expenditures_template.xlsx';
 toast.success(t.expendituresTab.templateDownloaded);
 }
 
 const sheetData = [headers, ...data];
 const ws = XLSX.utils.aoa_to_sheet(sheetData);
 const wb = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb, ws, 'Expenditures');
 XLSX.writeFile(wb, filename);
 };

 const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;
 const reader = new FileReader();
 
 reader.onload = (event) => {
 try {
 const data = new Uint8Array(event.target?.result as ArrayBuffer);
 const workbook = XLSX.read(data, { type: 'array' });
 const worksheet = workbook.Sheets[workbook.SheetNames[0]];
 const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
 
 if (jsonData.length < 2) {
 toast.error(t.expendituresTab.noDataInFile);
 return;
 }
 
 const rows = jsonData.slice(1);
 let imported = 0;
 
 rows.forEach((row: any) => {
 if (row.length < 4) return;
 
 const expenditureData = {
 projectId: parseInt(row[0]),
 budgetId: parseInt(row[1]),
 amount: row[2].toString(),
 expenditureDate: new Date(row[3]),
 vendor: row[4] || '',
 invoiceNumber: row[5] || '',
 receiptUrl: row[6] || '',
 description: row[7] || '',
 };
 
 if (expenditureData.projectId && expenditureData.budgetId && expenditureData.amount && expenditureData.expenditureDate) {
 createMutation.mutate(expenditureData);
 imported++;
 }
 });
 
 toast.success(`${t.expendituresTab.importedSuccessfully}: ${imported} ${t.expendituresTab.records}`);
 } catch (error) {
 toast.error(t.expendituresTab.importFailed);
 }
 };
 
 reader.readAsArrayBuffer(file);
 e.target.value = '';
 };

 return (
 <>
 {/* Payables Management Card */}
 <Card 
 className="cursor-pointer hover:bg-accent/50 transition-colors"
 onClick={() => window.location.href = '/organization/finance/payables'}
 
 >
 <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2`}>
 <CardTitle className={`text-sm font-medium text-start`}>
 {t.financeModule.payablesManagement}
 </CardTitle>
 <FileText className="h-4 w-4 text-muted-foreground" />
 </CardHeader>
 <CardContent>
 <div className={`text-2xl font-bold text-start`}>
 ${(payablesSummary?.totalPayables || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
 </div>
 <p className={`text-xs text-muted-foreground text-start`}>
 {payablesSummary?.pendingInvoices || 0} {t.financeModule.pendingInvoices}
 </p>
 </CardContent>
 </Card>

 <Card>
 <CardHeader>
 <div className={`flex items-center justify-between`}>
 <div className={'text-start'}>
 <CardTitle>{t.financeModule.manualExpenditures}</CardTitle>
 <CardDescription>{t.expendituresTab.expenditureRecordingDesc}</CardDescription>
 </div>
 <div className={`flex gap-2`}>
 <Button variant="outline" size="sm" onClick={handleExportToExcel}>
 <Download className={`h-4 w-4 me-2`} />
 {t.expendituresTab.exportToExcel}
 </Button>
 <Button variant="outline" size="sm" asChild>
 <label className="cursor-pointer flex items-center">
 <Upload className={`h-4 w-4 me-2`} />
 {t.expendituresTab.importExcel}
 <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />
 </label>
 </Button>
 <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
 <DialogTrigger asChild>
 <Button>
 <Plus className={`h-4 w-4 me-2`} />
 {t.expendituresTab.newExpenditure}
 </Button>
 </DialogTrigger>
 <DialogContent className="max-w-2xl">
 <ExpenditureForm
 onSubmit={(data: any) => createMutation.mutate(data)}
 projects={projects || []}
 budgets={budgets || []}
 />
 </DialogContent>
 </Dialog>
 </div>
 </div>
 </CardHeader>
 <CardContent>
 {!expenditures || expenditures.length === 0 ? (
 <div className="text-center py-8 text-muted-foreground">
 {t.expendituresTab.noExpendituresYet}
 </div>
 ) : (
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className={'text-start'}>{t.expendituresTab.date}</TableHead>
 <TableHead className={'text-start'}>{t.expendituresTab.project}</TableHead>
 <TableHead className={'text-start'}>{t.expendituresTab.financeDescription}</TableHead>
 <TableHead className={'text-start'}>{t.expendituresTab.vendor}</TableHead>
 <TableHead className={'text-start'}>{t.expendituresTab.amount}</TableHead>
 <TableHead className={'text-start'}>{t.expendituresTab.status}</TableHead>
 <TableHead className={'text-center'}>{t.expendituresTab.actions}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {expenditures.map((expenditure) => {
 const project = projects?.find(p => p.id === expenditure.projectId);
 return (
 <TableRow key={expenditure.id}>
 <TableCell className={'text-start'}>
 {new Date(expenditure.expenditureDate).toLocaleDateString()}
 </TableCell>
 <TableCell className={'text-start'}>
 {isRTL && project?.titleAr ? project.titleAr : project?.titleEn || "N/A"}
 </TableCell>
 <TableCell className={'text-start'}>{expenditure.description || "-"}</TableCell>
 <TableCell className={'text-start'}>{expenditure.vendor || "-"}</TableCell>
 <TableCell className={`font-mono text-start`}>
 ${parseFloat(expenditure.amount || "0").toLocaleString()}
 </TableCell>
 <TableCell className={'text-start'}>{getStatusBadge(expenditure.status || 'draft')}</TableCell>
 <TableCell className={'text-end'}>
 <div className={`flex items-center gap-2 justify-end`}>
 <Button variant="ghost" size="icon" onClick={() => {
 setVersionHistoryExpenditureId(expenditure.id);
 setShowVersionHistory(true);
 }} title={t.financeModule.versionHistory}>
 <Layers className="h-4 w-4" />
 </Button>
 {expenditure.status === "draft" && (
 <>
 <Button variant="outline" size="sm" onClick={() => updateMutation.mutate({ id: expenditure.id, status: "submitted" })}>
 {t.expendituresTab.submit}
 </Button>
 <Button variant="ghost" size="icon" onClick={() => {
 if (confirm(t.expendituresTab.confirmDeleteExpenditure)) {
 deleteMutation.mutate({ id: expenditure.id });
 }
 }}>
 <Trash2 className="h-4 w-4" />
 </Button>
 </>
 )}
 {expenditure.status === "submitted" && (
 <>
 <Button variant="outline" size="sm" onClick={() => updateMutation.mutate({ id: expenditure.id, status: "approved" })}>
 {t.expendituresTab.approve}
 </Button>
 <Button variant="outline" size="sm" onClick={() => updateMutation.mutate({ id: expenditure.id, status: "rejected" })}>
 {t.expendituresTab.reject}
 </Button>
 </>
 )}
 {expenditure.status === "approved" && (
 <Button variant="outline" size="sm" onClick={() => updateMutation.mutate({ id: expenditure.id, status: "paid" })}>
 {t.expendituresTab.markPaid}
 </Button>
 )}
 </div>
 </TableCell>
 </TableRow>
 );
 })}
 </TableBody>
 </Table>
 )}
 </CardContent>
 </Card>

 {/* Version History Modal */}
 <VersionHistoryModal
 open={showVersionHistory}
 onOpenChange={(open) => {
 setShowVersionHistory(open);
 if (!open) setVersionHistoryExpenditureId(null);
 }}
 versions={versionHistoryData || []}
 title={versionHistoryData?.[0]?.expenditureNumber || (t.financeModule.expenditures)}
 isLoading={isLoadingVersions}
 language={language as 'en' | 'ar'}
 renderVersionDetails={(version) => (
 <div className="grid grid-cols-2 gap-2 text-sm">
 <div>
 <span className="font-medium">{t.financeModule.vendor}:</span> {version.vendorName}
 </div>
 <div>
 <span className="font-medium">{t.financeModule.amount}:</span> {version.amount}
 </div>
 <div>
 <span className="font-medium">{t.financeModule.type}:</span> {version.expenditureType}
 </div>
 <div>
 <span className="font-medium">{t.financeModule.status}:</span> {version.status}
 </div>
 <div>
 <span className="font-medium">{t.financeModule.date}:</span> {new Date(version.expenditureDate).toLocaleDateString('en-US')}
 </div>
 </div>
 )}
 />
 </>
 );
}

function ExpenditureForm({ onSubmit, projects, budgets }: any) {
  const { t } = useTranslation();
 const { language, isRTL} = useLanguage();
 const [formData, setFormData] = useState({
 projectId: 0,
 budgetId: 0,
 amount: "",
 currency: "USD",
 expenditureDate: new Date().toISOString().split("T")[0],
 description: "",
 vendor: "",
 invoiceNumber: "",
 });
 const [receiptFile, setReceiptFile] = useState<File | null>(null);
 const [uploading, setUploading] = useState(false);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!formData.projectId || !formData.budgetId) {
 toast.error(t.expendituresTab.pleaseSelectProjectBudget);
 return;
 }
 if (!formData.amount) {
 toast.error(t.expendituresTab.pleaseEnterAmount);
 return;
 }

 if (receiptFile && receiptFile.size > 5 * 1024 * 1024) {
 toast.error(t.expendituresTab.receiptFileTooLarge);
 return;
 }

 let receiptUrl = "";
 
 if (receiptFile) {
 setUploading(true);
 try {
 const formDataUpload = new FormData();
 formDataUpload.append("file", receiptFile);
 
 const response = await fetch("/api/upload-receipt", {
 method: "POST",
 body: formDataUpload,
 });
 
 if (!response.ok) {
 throw new Error(t.expendituresTab.receiptUploadFailed);
 }
 
 const { url } = await response.json();
 receiptUrl = url;
 toast.success(t.expendituresTab.receiptUploaded);
 } catch (error) {
 toast.error(t.expendituresTab.receiptUploadFailed);
 setUploading(false);
 return;
 }
 setUploading(false);
 }

 onSubmit({
 ...formData,
 expenditureDate: new Date(formData.expenditureDate),
 receiptUrl,
 });
 };

 const projectBudgets = budgets.filter((b: any) => b.projectId === formData.projectId);

 return (
 <form onSubmit={handleSubmit} className="space-y-4">
 <DialogHeader>
 <DialogTitle>{t.expendituresTab.recordNewExpenditure}</DialogTitle>
 <DialogDescription>{t.expendituresTab.enterExpenditureDetails}</DialogDescription>
 </DialogHeader>

 <div className="space-y-4">
 <div>
 <Label htmlFor="projectId">{t.expendituresTab.project} *</Label>
 <Select value={formData.projectId.toString()} onValueChange={(value) => setFormData({ ...formData, projectId: parseInt(value), budgetId: 0 })}>
 <SelectTrigger><SelectValue placeholder={t.expendituresTab.selectProject} /></SelectTrigger>
 <SelectContent>
 {projects.map((project: any) => (
 <SelectItem key={project.id} value={project.id.toString()}>
 {isRTL && project.titleAr ? project.titleAr : project.titleEn}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div>
 <Label htmlFor="budgetId">{t.expendituresTab.budgetLine} *</Label>
 <Select value={formData.budgetId.toString()} onValueChange={(value) => setFormData({ ...formData, budgetId: parseInt(value) })} disabled={!formData.projectId}>
 <SelectTrigger><SelectValue placeholder={t.expendituresTab.selectBudgetLine} /></SelectTrigger>
 <SelectContent>
 {projectBudgets.map((budget: any) => (
 <SelectItem key={budget.id} value={budget.id.toString()}>
 {t.expendituresTab.budget} #{budget.id} - ${parseFloat(budget.budgetedAmount || "0").toLocaleString()}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="grid grid-cols-3 gap-4">
 <div>
 <Label htmlFor="amount">{t.expendituresTab.amount} *</Label>
 <Input id="amount" type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" required className={'text-start'} />
 </div>

 <div>
 <Label htmlFor="currency">{t.expendituresTab.currency} *</Label>
 <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="USD">USD</SelectItem>
 <SelectItem value="EUR">EUR</SelectItem>
 <SelectItem value="GBP">GBP</SelectItem>
 <SelectItem value="CHF">CHF</SelectItem>
 <SelectItem value="YER">YER</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div>
 <Label htmlFor="expenditureDate">{t.expendituresTab.date} *</Label>
 <Input id="expenditureDate" type="date" value={formData.expenditureDate} onChange={(e) => setFormData({ ...formData, expenditureDate: e.target.value })} required />
 </div>
 </div>

 <div>
 <Label htmlFor="description">{t.expendituresTab.financeDescription}</Label>
 <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder={t.expendituresTab.expenditureDescription} rows={2} className={'text-start'} />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <Label htmlFor="vendor">{t.expendituresTab.vendor}</Label>
 <Input id="vendor" value={formData.vendor} onChange={(e) => setFormData({ ...formData, vendor: e.target.value })} placeholder={t.expendituresTab.vendorName} className={'text-start'} />
 </div>

 <div>
 <Label htmlFor="invoiceNumber">{t.expendituresTab.invoiceNumber}</Label>
 <Input id="invoiceNumber" value={formData.invoiceNumber} onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })} placeholder={t.expendituresTab.invoiceNumberPlaceholder} className={'text-start'} />
 </div>
 </div>

 <div>
 <Label htmlFor="receipt">{t.expendituresTab.receiptUpload}</Label>
 <div className="border-2 border-dashed rounded-lg p-4">
 <Input id="receipt" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} className="cursor-pointer" />
 {receiptFile && (
 <div className={`mt-2 flex items-center gap-2 text-sm text-muted-foreground`}>
 <FileText className="h-4 w-4" />
 <span>{receiptFile.name} ({(receiptFile.size / 1024).toFixed(2)} KB)</span>
 </div>
 )}
 <p className={`mt-2 text-xs text-muted-foreground text-start`}>
 {t.expendituresTab.supportedFormats}: PDF, JPG, PNG ({t.expendituresTab.maxFileSize}: 5MB)
 </p>
 </div>
 </div>
 </div>

 <DialogFooter className={''}>
 <Button type="submit" disabled={uploading}>
 {uploading ? t.expendituresTab.uploadingReceipt : t.expendituresTab.createExpenditure}
 </Button>
 </DialogFooter>
 </form>
 );
}
