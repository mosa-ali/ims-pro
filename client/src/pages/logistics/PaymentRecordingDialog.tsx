/**
 * Payment Recording Dialog Component
 * Allows users to record payments for payables
 * Supports: payment date, method, reference, notes, and proof upload
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Calendar, Upload, AlertCircle, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from '@/i18n/useTranslation';

interface PaymentRecordingDialogProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 payableId: number;
 payableAmount: number;
 payableNumber?: string;
 vendorName?: string;
 organizationId: number;
 operatingUnitId?: number;
 language?: "en" | "ar";
 onSuccess?: () => void;
}

export function PaymentRecordingDialog({
 open,
 onOpenChange,
 payableId,
 payableAmount,
 payableNumber,
 vendorName,
 organizationId,
 operatingUnitId,
 language = "en",
 onSuccess,
}: PaymentRecordingDialogProps) {
 const { t } = useTranslation();
 const isRTL = language === "ar";
 const [isLoading, setIsLoading] = useState(false);
 const [uploadedFile, setUploadedFile] = useState<File | null>(null);

 // Form state
 const [formData, setFormData] = useState({
 paymentDate: new Date().toISOString().split("T")[0],
 paymentMethod: "bank_transfer",
 referenceNumber: "",
 amount: payableAmount.toString(),
 remarks: "",
 });

 // Translations - use paymentRecording namespace
 const localT = t.paymentRecording;

 const recordPaymentMutation = trpc.prFinance.recordPayment.useMutation({
 onSuccess: (result) => {
 if (result && result.success === false) {
 toast.error(result.message || localT.error);
 return;
 }
 toast.success(result?.message || localT.success);
 setFormData({
 paymentDate: new Date().toISOString().split("T")[0],
 paymentMethod: "bank_transfer",
 referenceNumber: "",
 amount: payableAmount.toString(),
 remarks: "",
 });
 setUploadedFile(null);
 onOpenChange(false);
 onSuccess?.();
 },
 onError: (error) => {
 toast.error(localT.error);
 console.error("Payment recording error:", error);
 },
 });

 const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (file) {
 // Validate file type and size
 const validTypes = ["application/pdf", "image/jpeg", "image/png"];
 const maxSize = 10 * 1024 * 1024; // 10MB

 if (!validTypes.includes(file.type)) {
 toast.error("Only PDF and image files are allowed");
 return;
 }

 if (file.size > maxSize) {
 toast.error("File size must be less than 10MB");
 return;
 }

 setUploadedFile(file);
 }
 };

 const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
 e.preventDefault();
 e.stopPropagation();
 };

 const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
 e.preventDefault();
 e.stopPropagation();
 const file = e.dataTransfer.files?.[0];
 if (file) {
 handleFileChange({ target: { files: e.dataTransfer.files } } as any);
 }
 };

 const handleSubmit = async () => {
 // Validation
 if (!formData.paymentDate || !formData.paymentMethod || !formData.referenceNumber || !formData.amount) {
 toast.error(localT.validationError);
 return;
 }

 setIsLoading(true);
 try {
     await recordPaymentMutation.mutateAsync({
	 payableId,
	 paymentDate: formData.paymentDate, // Send YYYY-MM-DD string directly
 paymentMethod: formData.paymentMethod as "bank_transfer" | "cheque" | "cash" | "wire",
 referenceNumber: formData.referenceNumber,
 amount: parseFloat(formData.amount),
 remarks: formData.remarks,
 proofFileUrl: uploadedFile ? URL.createObjectURL(uploadedFile) : undefined,
 });
 } catch (error) {
 console.error("Error recording payment:", error);
 } finally {
 setIsLoading(false);
 }
 };

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent dir={isRTL ? 'rtl' : 'ltr'} className={`max-w-2xl`}>
 <DialogHeader>
 <DialogTitle>{localT.title}</DialogTitle>
 </DialogHeader>

 <div className="space-y-6">
 {/* Payable Summary */}
 <Card className="bg-blue-50 border-blue-200">
 <CardContent className="pt-6">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <p className="text-xs text-muted-foreground">{localT.payableNumber}</p>
 <p className="font-semibold text-sm">{payableNumber || "N/A"}</p>
 </div>
 <div>
 <p className="text-xs text-muted-foreground">{localT.vendor}</p>
 <p className="font-semibold text-sm">{vendorName || "N/A"}</p>
 </div>
 <div>
 <p className="text-xs text-muted-foreground">{localT.amount}</p>
 <p className="font-semibold text-lg text-blue-600">${payableAmount.toFixed(2)}</p>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Payment Form */}
 <div className="space-y-4">
 {/* Payment Date */}
 <div className="space-y-2">
 <Label htmlFor="paymentDate" className="flex items-center gap-1">
 <Calendar className="w-4 h-4" />
 {localT.paymentDate}
 <span className="text-red-500">*</span>
 </Label>
 <Input
 id="paymentDate"
 type="date"
 value={formData.paymentDate}
 onChange={(e) =>
 setFormData({ ...formData, paymentDate: e.target.value })
 }
 className={isRTL ? "text-end" : ""}
 />
 </div>

 {/* Payment Method */}
 <div className="space-y-2">
 <Label htmlFor="paymentMethod">
 {localT.paymentMethod}
 <span className="text-red-500">*</span>
 </Label>
 <Select
 value={formData.paymentMethod}
 onValueChange={(value) =>
 setFormData({ ...formData, paymentMethod: value })
 }
 >
 <SelectTrigger id="paymentMethod">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="bank_transfer">{localT.bankTransfer}</SelectItem>
 <SelectItem value="cheque">{localT.check}</SelectItem>
 <SelectItem value="cash">{localT.cash}</SelectItem>
 <SelectItem value="wire">{localT.letterOfCredit}</SelectItem>
 </SelectContent>
 </Select>
 </div>

 {/* Reference Number */}
 <div className="space-y-2">
 <Label htmlFor="referenceNumber">
 {localT.referenceNumber}
 <span className="text-red-500">*</span>
 </Label>
 <Input
 id="referenceNumber"
 placeholder={isRTL ? "أدخل رقم المرجع" : "Enter reference number"}
 value={formData.referenceNumber}
 onChange={(e) =>
 setFormData({ ...formData, referenceNumber: e.target.value })
 }
 className={isRTL ? "text-end" : ""}
 />
 </div>

 {/* Amount */}
 <div className="space-y-2">
 <Label htmlFor="amount">
 {localT.amount}
 <span className="text-red-500">*</span>
 </Label>
 <Input
 id="amount"
 type="number"
 step="0.01"
 value={formData.amount}
 onChange={(e) =>
 setFormData({ ...formData, amount: e.target.value })
 }
 className={isRTL ? "text-end" : ""}
 />
 </div>

 {/* Remarks */}
 <div className="space-y-2">
 <Label htmlFor="remarks">{localT.remarks}</Label>
 <Textarea
 id="remarks"
 placeholder={isRTL ? "أضف ملاحظات إضافية" : "Add additional remarks"}
 value={formData.remarks}
 onChange={(e) =>
 setFormData({ ...formData, remarks: e.target.value })
 }
 className={`min-h-24 ${isRTL ? "text-end" : ""}`}
 />
 </div>

 {/* File Upload */}
 <div className="space-y-2">
 <Label>{localT.uploadProof}</Label>
 <div
 onDragOver={handleDragOver}
 onDrop={handleDrop}
 className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
 >
 <input
 type="file"
 id="fileUpload"
 accept=".pdf,.jpg,.jpeg,.png"
 onChange={handleFileChange}
 className="hidden"
 />
 <label htmlFor="fileUpload" className="cursor-pointer block">
 {uploadedFile ? (
 <div className="flex items-center justify-center gap-2 text-green-600">
 <CheckCircle className="w-5 h-5" />
 <span className="text-sm font-medium">{uploadedFile.name}</span>
 </div>
 ) : (
 <div className="space-y-2">
 <Upload className="w-8 h-8 mx-auto text-gray-400" />
 <p className="text-sm text-gray-600">{localT.dragDrop}</p>
 </div>
 )}
 </label>
 </div>
 <p className="text-xs text-muted-foreground">
 {isRTL ? 'PDF أو صور (JPG, PNG) حتى 10 ميجابايت' : 'PDF or images (JPG, PNG) up to 10MB'}
 </p>
 </div>
 </div>

 {/* Info Alert */}
 <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
 <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
 <p className="text-xs text-blue-700">
 {isRTL
 ? 'تحقق من جميع تفاصيل الدفع قبل التسجيل. لا يمكن تعديل الدفع بعد التسجيل.'
 : 'Verify all payment details before recording. Payment cannot be edited after recording.'}
 </p>
 </div>
 </div>

 <DialogFooter className={`gap-2`}>
 <Button
 variant="outline"
 onClick={() => onOpenChange(false)}
 disabled={isLoading}
 >
 {localT.cancel}
 </Button>
 <Button
 onClick={handleSubmit}
 disabled={isLoading}
 className="bg-blue-600 hover:bg-blue-700"
 >
 {isLoading ? "..." : localT.recordPayment}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 );
}
