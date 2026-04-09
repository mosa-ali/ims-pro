import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { Plus, Trash2, Download, Upload, Clock, AlertCircle, CheckCircle, XCircle, FileText } from "lucide-react";
import * as XLSX from 'xlsx';

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
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const { data: expenditures, refetch } = trpc.finance.listExpenditures.useQuery();
  const { data: projects } = trpc.projects.list.useQuery();
  const { data: budgets } = trpc.finance.listBudgets.useQuery();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const createMutation = trpc.finance.createExpenditure.useMutation({
    onSuccess: () => {
      toast.success(t('finance.expenditureCreated'));
      refetch();
      setIsCreateOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to create expenditure: ${error.message}`);
    },
  });

  const updateMutation = trpc.finance.updateExpenditure.useMutation({
    onSuccess: () => {
      toast.success(t('finance.expenditureStatusUpdated'));
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update expenditure: ${error.message}`);
    },
  });

  const deleteMutation = trpc.finance.deleteExpenditure.useMutation({
    onSuccess: () => {
      toast.success(t('finance.expenditureDeleted'));
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete expenditure: ${error.message}`);
    },
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; icon: any; label: string }> = {
      draft: { variant: "secondary", icon: Clock, label: t('finance.draft') },
      submitted: { variant: "outline", icon: AlertCircle, label: t('finance.submitted') },
      approved: { variant: "default", icon: CheckCircle, label: t('finance.approved') },
      rejected: { variant: "destructive", icon: XCircle, label: t('finance.rejected') },
      paid: { variant: "default", icon: CheckCircle, label: t('finance.paid') },
    };
    const { variant, icon: Icon, label } = config[status] || config.draft;
    return (
      <Badge variant={variant}>
        <Icon className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
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
      toast.success(t('finance.exportedSuccessfully'));
    } else {
      headers = isRTL
        ? ['رقم المشروع', 'رقم الميزانية', 'المبلغ', 'التاريخ', 'المورد', 'رقم الفاتورة', 'رابط الإيصال', 'الوصف']
        : ['Project ID', 'Budget ID', 'Amount', 'Date', 'Vendor', 'Invoice Number', 'Receipt URL', 'Description'];
      
      const exampleRow = isRTL
        ? ['1', '1', '5000', '2025-01-15', 'مورد مثالي', 'INV-001', 'https://example.com/receipt.pdf', 'وصف اختياري']
        : ['1', '1', '5000', '2025-01-15', 'Example Vendor', 'INV-001', 'https://example.com/receipt.pdf', 'Optional description'];
      data = [exampleRow];
      filename = 'expenditures_template.xlsx';
      toast.success(t('finance.templateDownloaded'));
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
          toast.error(t('finance.noDataInFile'));
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
        
        toast.success(`${t('finance.importedSuccessfully')}: ${imported} ${t('finance.records')}`);
      } catch (error) {
        toast.error(t('finance.importFailed'));
      }
    };
    
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  return (
    <Card dir={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader>
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <CardTitle>{t('finance.expenditureRecording')}</CardTitle>
            <CardDescription>{t('finance.expenditureRecordingDesc')}</CardDescription>
          </div>
          <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button variant="outline" size="sm" onClick={handleExportToExcel}>
              <Download className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t('finance.exportToExcel')}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <label className="cursor-pointer flex items-center">
                <Upload className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {t('finance.importExcel')}
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />
              </label>
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {t('finance.newExpenditure')}
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
            {t('finance.noExpendituresYet')}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('finance.date')}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('finance.project')}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('finance.description')}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('finance.vendor')}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('finance.amount')}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('finance.status')}</TableHead>
                <TableHead className={isRTL ? 'text-left' : 'text-right'}>{t('finance.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenditures.map((expenditure) => {
                const project = projects?.find(p => p.id === expenditure.projectId);
                return (
                  <TableRow key={expenditure.id}>
                    <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                      {new Date(expenditure.expenditureDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                      {isRTL && project?.titleAr ? project.titleAr : project?.titleEn || "N/A"}
                    </TableCell>
                    <TableCell className={isRTL ? 'text-right' : 'text-left'}>{expenditure.description || "-"}</TableCell>
                    <TableCell className={isRTL ? 'text-right' : 'text-left'}>{expenditure.vendor || "-"}</TableCell>
                    <TableCell className={`font-mono ${isRTL ? 'text-right' : 'text-left'}`}>
                      ${parseFloat(expenditure.amount || "0").toLocaleString()}
                    </TableCell>
                    <TableCell className={isRTL ? 'text-right' : 'text-left'}>{getStatusBadge(expenditure.status || 'draft')}</TableCell>
                    <TableCell className={isRTL ? 'text-left' : 'text-right'}>
                      <div className={`flex items-center gap-2 ${isRTL ? 'justify-start flex-row-reverse' : 'justify-end'}`}>
                        {expenditure.status === "draft" && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => updateMutation.mutate({ id: expenditure.id, status: "submitted" })}>
                              {t('finance.submit')}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => {
                              if (confirm(t('finance.confirmDeleteExpenditure'))) {
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
                              {t('finance.approve')}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => updateMutation.mutate({ id: expenditure.id, status: "rejected" })}>
                              {t('finance.reject')}
                            </Button>
                          </>
                        )}
                        {expenditure.status === "approved" && (
                          <Button variant="outline" size="sm" onClick={() => updateMutation.mutate({ id: expenditure.id, status: "paid" })}>
                            {t('finance.markPaid')}
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
  );
}

function ExpenditureForm({ onSubmit, projects, budgets }: any) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
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
      toast.error(t('finance.pleaseSelectProjectBudget'));
      return;
    }
    if (!formData.amount) {
      toast.error(t('finance.pleaseEnterAmount'));
      return;
    }

    if (receiptFile && receiptFile.size > 5 * 1024 * 1024) {
      toast.error(t('finance.receiptFileTooLarge'));
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
          throw new Error(t('finance.receiptUploadFailed'));
        }
        
        const { url } = await response.json();
        receiptUrl = url;
        toast.success(t('finance.receiptUploaded'));
      } catch (error) {
        toast.error(t('finance.receiptUploadFailed'));
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
    <form onSubmit={handleSubmit} className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <DialogHeader>
        <DialogTitle>{t('finance.recordNewExpenditure')}</DialogTitle>
        <DialogDescription>{t('finance.enterExpenditureDetails')}</DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <Label htmlFor="projectId">{t('finance.project')} *</Label>
          <Select value={formData.projectId.toString()} onValueChange={(value) => setFormData({ ...formData, projectId: parseInt(value), budgetId: 0 })}>
            <SelectTrigger><SelectValue placeholder={t('finance.selectProject')} /></SelectTrigger>
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
          <Label htmlFor="budgetId">{t('finance.budgetLine')} *</Label>
          <Select value={formData.budgetId.toString()} onValueChange={(value) => setFormData({ ...formData, budgetId: parseInt(value) })} disabled={!formData.projectId}>
            <SelectTrigger><SelectValue placeholder={t('finance.selectBudgetLine')} /></SelectTrigger>
            <SelectContent>
              {projectBudgets.map((budget: any) => (
                <SelectItem key={budget.id} value={budget.id.toString()}>
                  {t('finance.budget')} #{budget.id} - ${parseFloat(budget.budgetedAmount || "0").toLocaleString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="amount">{t('finance.amount')} *</Label>
            <Input id="amount" type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" required className={isRTL ? 'text-right' : 'text-left'} />
          </div>

          <div>
            <Label htmlFor="currency">{t('finance.currency')} *</Label>
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
            <Label htmlFor="expenditureDate">{t('finance.date')} *</Label>
            <Input id="expenditureDate" type="date" value={formData.expenditureDate} onChange={(e) => setFormData({ ...formData, expenditureDate: e.target.value })} required />
          </div>
        </div>

        <div>
          <Label htmlFor="description">{t('finance.description')}</Label>
          <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder={t('finance.expenditureDescription')} rows={2} className={isRTL ? 'text-right' : 'text-left'} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="vendor">{t('finance.vendor')}</Label>
            <Input id="vendor" value={formData.vendor} onChange={(e) => setFormData({ ...formData, vendor: e.target.value })} placeholder={t('finance.vendorName')} className={isRTL ? 'text-right' : 'text-left'} />
          </div>

          <div>
            <Label htmlFor="invoiceNumber">{t('finance.invoiceNumber')}</Label>
            <Input id="invoiceNumber" value={formData.invoiceNumber} onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })} placeholder={t('finance.invoiceNumberPlaceholder')} className={isRTL ? 'text-right' : 'text-left'} />
          </div>
        </div>

        <div>
          <Label htmlFor="receipt">{t('finance.receiptUpload')}</Label>
          <div className="border-2 border-dashed rounded-lg p-4">
            <Input id="receipt" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} className="cursor-pointer" />
            {receiptFile && (
              <div className={`mt-2 flex items-center gap-2 text-sm text-muted-foreground ${isRTL ? 'flex-row-reverse' : ''}`}>
                <FileText className="h-4 w-4" />
                <span>{receiptFile.name} ({(receiptFile.size / 1024).toFixed(2)} KB)</span>
              </div>
            )}
            <p className={`mt-2 text-xs text-muted-foreground ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('finance.supportedFormats')}: PDF, JPG, PNG ({t('finance.maxFileSize')}: 5MB)
            </p>
          </div>
        </div>
      </div>

      <DialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
        <Button type="submit" disabled={uploading}>
          {uploading ? t('finance.uploadingReceipt') : t('finance.createExpenditure')}
        </Button>
      </DialogFooter>
    </form>
  );
}
