import { useState, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogHeader,
 DialogTitle,
 DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from '@/i18n/useTranslation';

interface InvoiceUploadDialogProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 prId: number;
 poId: number;
 grnId: number;
 vendorId: number;
 organizationId: number;
 operatingUnitId?: number;
 payableId?: number;
 sourceType?: 'goods' | 'services';
 onSuccess?: () => void;
}

export function InvoiceUploadDialog({
 open,
 onOpenChange,
 prId,
 poId,
 grnId,
 vendorId,
 organizationId,
 operatingUnitId,
 payableId,
 sourceType = 'goods',
 onSuccess,
}: InvoiceUploadDialogProps) {
 const { t } = useTranslation();
 const { language, isRTL} = useLanguage();
 const { user } = useAuth();

 const [vendorInvoiceNumber, setVendorInvoiceNumber] = useState("");
 const [invoiceDate, setInvoiceDate] = useState("");
 const [invoiceAmount, setInvoiceAmount] = useState("");
 const [currency, setCurrency] = useState("USD");
 const [file, setFile] = useState<File | null>(null);
 const [dragActive, setDragActive] = useState(false);
 const fileInputRef = useRef<HTMLInputElement>(null);

 // For Services payables, use submitInvoice which handles Contract/SAC/Invoice matching
 const submitInvoiceMutation = trpc.prFinance.submitInvoice.useMutation({
 onSuccess: (result) => {
 const status = result.matchingStatus;
 if (status === 'matched') {
 toast.success(`Invoice auto-approved — ${result.matchingType === 'services' ? 'Contract/SAC/Invoice' : 'PO/GRN/Invoice'} matched`);
 } else {
 toast.warning(`Invoice created with variance detected — requires manual approval`);
 }
 resetForm();
 onOpenChange(false);
 onSuccess?.();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const uploadInvoiceMutation = trpc.prFinance.uploadInvoice.useMutation({
 onSuccess: (result) => {
 if (result && result.success === false) {
 toast.error(result.message || 'Invoice upload failed');
 return;
 }
 toast.success(
 result?.message || 'Invoice uploaded successfully'
 );
 resetForm();
 onOpenChange(false);
 onSuccess?.();
 },
 onError: (error) => {
 toast.error(error.message);
 },
 });

 const resetForm = () => {
 setVendorInvoiceNumber("");
 setInvoiceDate("");
 setInvoiceAmount("");
 setCurrency("USD");
 setFile(null);
 };

 const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
 e.preventDefault();
 e.stopPropagation();
 if (e.type === "dragenter" || e.type === "dragover") {
 setDragActive(true);
 } else if (e.type === "dragleave") {
 setDragActive(false);
 }
 };

 const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
 e.preventDefault();
 e.stopPropagation();
 setDragActive(false);

 const files = e.dataTransfer.files;
 if (files && files.length > 0) {
 const selectedFile = files[0];
 if (validateFile(selectedFile)) {
 setFile(selectedFile);
 }
 }
 };

 const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const files = e.target.files;
 if (files && files.length > 0) {
 const selectedFile = files[0];
 if (validateFile(selectedFile)) {
 setFile(selectedFile);
 }
 }
 };

 const validateFile = (selectedFile: File): boolean => {
 const maxSize = 10 * 1024 * 1024; // 10MB
 const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];

 if (selectedFile.size > maxSize) {
 toast.error(
 'File size exceeds 10MB limit'
 );
 return false;
 }

 if (!allowedTypes.includes(selectedFile.type)) {
 toast.error(
 'Unsupported file type. Use PDF or images'
 );
 return false;
 }

 return true;
 };

  // S3 file upload mutation
  const uploadFileMutation = trpc.prFinance.uploadInvoiceFile.useMutation();

  const handleUpload = async () => {
   if (!vendorInvoiceNumber || !invoiceDate || !invoiceAmount) {
   toast.error(
   'Please fill all required fields'
   );
   return;
   }

   let invoiceDocumentUrl: string | undefined;

   // Upload file to S3 if a file is selected
   if (file && payableId) {
     try {
       const reader = new FileReader();
       const fileData = await new Promise<string>((resolve, reject) => {
         reader.onload = () => {
           const base64 = (reader.result as string).split(',')[1];
           resolve(base64);
         };
         reader.onerror = reject;
         reader.readAsDataURL(file);
       });

       const uploadResult = await uploadFileMutation.mutateAsync({
         payableId: payableId,
         fileName: file.name,
         fileData: fileData,
         fileType: file.type,
       });
       invoiceDocumentUrl = uploadResult.fileUrl;
       toast.success('Invoice file uploaded to storage');
     } catch (err: any) {
       toast.error(`File upload failed: ${err.message}`);
       return;
     }
   }

    if (sourceType === 'services' && payableId) {
     // Services flow: use submitInvoice which handles Contract/SAC/Invoice matching
     submitInvoiceMutation.mutate({
       payableId: payableId,
       invoiceNumber: vendorInvoiceNumber,
       invoiceDate: new Date(invoiceDate),
       invoiceAmount: invoiceAmount,
       description: `Invoice for service payable`,
       attachmentUrl: invoiceDocumentUrl,
     });
    } else {
     // Goods flow: use uploadInvoice which handles PO/GRN/Invoice matching
     uploadInvoiceMutation.mutate({
       purchaseRequestId: prId,
       purchaseOrderId: poId,
       grnId: grnId,
       vendorId: vendorId,
       vendorInvoiceNumber: vendorInvoiceNumber,
       invoiceDate: new Date(invoiceDate),
       invoiceAmount: parseFloat(invoiceAmount),
       currency: currency,
       invoiceDocumentUrl: invoiceDocumentUrl,
     });
    }
 };
 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent dir={isRTL ? 'rtl' : 'ltr'} className={`max-w-md`}>
 <DialogHeader>
 <DialogTitle>{t.invoiceUploadDialog.title}</DialogTitle>
 <DialogDescription>{t.invoiceUploadDialog.description}</DialogDescription>
 </DialogHeader>

 <div className="space-y-4">
 {/* Vendor Invoice Number */}
 <div className="space-y-2">
 <Label htmlFor="vendorInvoiceNumber">{t.invoiceUploadDialog.vendorInvoiceNumber}</Label>
 <Input
 id="vendorInvoiceNumber"
 placeholder="INV-2026-001"
 value={vendorInvoiceNumber}
 onChange={(e) => setVendorInvoiceNumber(e.target.value)}
 
 />
 </div>

 {/* Invoice Date */}
 <div className="space-y-2">
 <Label htmlFor="invoiceDate">{t.invoiceUploadDialog.invoiceDate}</Label>
 <Input
 id="invoiceDate"
 type="date"
 value={invoiceDate}
 onChange={(e) => setInvoiceDate(e.target.value)}
 
 />
 </div>

 {/* Invoice Amount & Currency */}
 <div className="grid grid-cols-3 gap-2">
 <div className="col-span-2 space-y-2">
 <Label htmlFor="invoiceAmount">{t.invoiceUploadDialog.invoiceAmount}</Label>
 <Input
 id="invoiceAmount"
 type="number"
 placeholder="0.00"
 value={invoiceAmount}
 onChange={(e) => setInvoiceAmount(e.target.value)}
 step="0.01"
 
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="currency">{t.invoiceUploadDialog.currency}</Label>
 <select
 id="currency"
 value={currency}
 onChange={(e) => setCurrency(e.target.value)}
 className="w-full h-10 px-3 rounded-md border border-input bg-background"
 >
 <option value="USD">USD</option>
 <option value="EUR">EUR</option>
 <option value="GBP">GBP</option>
 <option value="SAR">SAR</option>
 </select>
 </div>
 </div>

 {/* File Upload Area */}
 <div className="space-y-2">
 <Label>{t.invoiceUploadDialog.uploadFile}</Label>
 <div
 onDragEnter={handleDrag}
 onDragLeave={handleDrag}
 onDragOver={handleDrag}
 onDrop={handleDrop}
 className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${ dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25" } ${file ? "bg-green-50 border-green-300" : ""}`}
 >
 <input
 ref={fileInputRef}
 type="file"
 onChange={handleFileChange}
 accept=".pdf,.jpg,.jpeg,.png"
 className="hidden"
 />

 {file ? (
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <FileText className="w-5 h-5 text-green-600" />
 <span className="text-sm font-medium text-green-700">
 {file.name}
 </span>
 </div>
 <button
 onClick={() => setFile(null)}
 className="text-muted-foreground hover:text-destructive"
 >
 <X className="w-4 h-4" />
 </button>
 </div>
 ) : (
 <div className="space-y-2">
 <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
 <p className="text-sm text-muted-foreground">{t.invoiceUploadDialog.dragDrop}</p>
 <p className="text-xs text-muted-foreground">
 {t.invoiceUploadDialog.or}{" "}
 <button
 onClick={() => fileInputRef.current?.click()}
 className="text-primary hover:underline"
 >
 {t.invoiceUploadDialog.clickBrowse}
 </button>
 </p>
 <p className="text-xs text-muted-foreground">{t.invoiceUploadDialog.fileInfo}</p>
 </div>
 )}
 </div>
 </div>
 </div>

 <DialogFooter>
 <Button
 variant="outline"
 onClick={() => {
 resetForm();
 onOpenChange(false);
 }}
 >
 {t.invoiceUploadDialog.cancel}
 </Button>
 <Button
 onClick={handleUpload}
 disabled={uploadInvoiceMutation.isPending || submitInvoiceMutation.isPending || uploadFileMutation.isPending}
 >
 {(uploadInvoiceMutation.isPending || submitInvoiceMutation.isPending || uploadFileMutation.isPending) ? t.invoiceUploadDialog.uploading : t.invoiceUploadDialog.upload}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
}
