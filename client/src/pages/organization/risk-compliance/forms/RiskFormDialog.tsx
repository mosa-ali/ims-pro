import { useTranslation } from '@/i18n/useTranslation';
import { useState, useEffect } from "react";
import { useLanguage } from '@/contexts/LanguageContext';
import { useCreateRisk, useUpdateRisk } from "@/hooks/useRisksData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";
import type { Risk } from "@/services/riskComplianceService";

interface RiskFormDialogProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 risk?: Risk | null;
 mode: "create" | "edit";
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
 "application/pdf",
 "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
 "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
 "image/jpeg",
 "image/png",
];

export function RiskFormDialog({ open, onOpenChange, risk, mode }: RiskFormDialogProps) {
 const { language, isRTL} = useLanguage();
  const { t } = useTranslation();
 const createRisk = useCreateRisk();
 const updateRisk = useUpdateRisk();

 const [formData, setFormData] = useState({
 title: "",
 titleAr: "",
 description: "",
 descriptionAr: "",
 category: "operational" as const,
 likelihood: 3,
 impact: 3,
 status: "identified" as const,
 owner: "",
 ownerAr: "",
 mitigation: "",
 mitigationAr: "",
 reviewDate: "",
 });

 const [attachments, setAttachments] = useState<File[]>([]);
 const [uploading, setUploading] = useState(false);
 const [errors, setErrors] = useState<Record<string, string>>({});

 useEffect(() => {
 if (risk && mode === "edit") {
 setFormData({
 title: risk.title || "",
 titleAr: risk.titleAr || "",
 description: risk.description || "",
 descriptionAr: risk.descriptionAr || "",
 category: risk.category || "operational",
 likelihood: risk.likelihood || 3,
 impact: risk.impact || 3,
 status: risk.status || "identified",
 owner: risk.owner || "",
 ownerAr: risk.ownerAr || "",
 mitigation: risk.mitigation || "",
 mitigationAr: risk.mitigationAr || "",
 reviewDate: risk.reviewDate || "",
 });
 } else {
 // Reset form for create mode
 setFormData({
 title: "",
 titleAr: "",
 description: "",
 descriptionAr: "",
 category: "operational",
 likelihood: 3,
 impact: 3,
 status: "identified",
 owner: "",
 ownerAr: "",
 mitigation: "",
 mitigationAr: "",
 reviewDate: "",
 });
 setAttachments([]);
 }
 setErrors({});
 }, [risk, mode, open]);

 const validateForm = (): boolean => {
 const newErrors: Record<string, string> = {};

 // Required fields
 if (!formData.title.trim()) {
 newErrors.title = t.riskFormDialog.titleIsRequired;
 }
 if (!formData.titleAr.trim()) {
 newErrors.titleAr = t.riskFormDialog.arabicTitleIsRequired;
 }
 if (!formData.description.trim()) {
 newErrors.description = t.riskFormDialog.descriptionIsRequired;
 }
 if (!formData.descriptionAr.trim()) {
 newErrors.descriptionAr = t.riskFormDialog.arabicDescriptionIsRequired;
 }

 // Likelihood and Impact validation
 if (formData.likelihood < 1 || formData.likelihood > 5) {
 newErrors.likelihood = t.riskFormDialog.likelihoodMustBeBetween1And5;
 }
 if (formData.impact < 1 || formData.impact > 5) {
 newErrors.impact = t.riskFormDialog.impactMustBeBetween1And5;
 }

 setErrors(newErrors);
 return Object.keys(newErrors).length === 0;
 };

 const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const files = Array.from(e.target.files || []);
 const validFiles: File[] = [];
 const invalidFiles: string[] = [];

 files.forEach((file) => {
 if (file.size > MAX_FILE_SIZE) {
 invalidFiles.push(`${file.name} (exceeds 10MB)`);
 } else if (!ALLOWED_FILE_TYPES.includes(file.type)) {
 invalidFiles.push(`${file.name} (invalid type)`);
 } else {
 validFiles.push(file);
 }
 });

 if (invalidFiles.length > 0) {
 toast.error(`Invalid files: ${invalidFiles.join(", ")}`);
 }

 setAttachments((prev) => [...prev, ...validFiles]);
 };

 const removeFile = (index: number) => {
 setAttachments((prev) => prev.filter((_, i) => i !== index));
 };

 const uploadFilesToS3 = async (): Promise<string[]> => {
 if (attachments.length === 0) return [];

 setUploading(true);
 const uploadedUrls: string[] = [];

 try {
 for (const file of attachments) {
 const formData = new FormData();
 formData.append("file", file);

 // TODO: Replace with actual S3 upload endpoint
 // const response = await fetch("/api/upload", {
 // method: "POST",
 // body: formData,
 // });
 // const { url } = await response.json();
 // uploadedUrls.push(url);

 // Placeholder for now
 uploadedUrls.push(`https://s3.example.com/${file.name}`);
 }

 return uploadedUrls;
 } catch (error) {
 console.error("File upload error:", error);
 toast.error(t.riskFormDialog.failedToUploadAttachments);
 return [];
 } finally {
 setUploading(false);
 }
 };

 const handleSubmit = async () => {
 if (!validateForm()) {
 toast.error(t.riskFormDialog.pleaseFixValidationErrors);
 return;
 }

 try {
 // Upload attachments if any
 const attachmentUrls = await uploadFilesToS3();

 const riskData = {
 ...formData,
 attachments: attachmentUrls.length > 0 ? JSON.stringify(attachmentUrls) : undefined,
 };

 if (mode === "create") {
 await createRisk.mutateAsync(riskData);
 toast.success(t.riskFormDialog.riskCreatedSuccessfully);
 } else if (risk) {
 await updateRisk.mutateAsync({ id: risk.id, ...riskData });
 toast.success(t.riskFormDialog.riskUpdatedSuccessfully);
 }

 onOpenChange(false);
 } catch (error: any) {
 console.error("Submit error:", error);
 toast.error(error.message || t.riskFormDialog.failedToSaveRisk);
 }
 };

 const isLoading = createRisk.isPending || updateRisk.isPending || uploading;

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>
 {mode === "create" ? t.riskFormDialog.createNewRisk : t.riskFormDialog.editRisk}
 </DialogTitle>
 <DialogDescription>
 {t.riskFormDialog.fillInTheRiskDetailsFieldsMarkedWithAreRequired}
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-6 py-4">
 {/* Title (EN) */}
 <div className="space-y-2">
 <Label htmlFor="title">
 {t.riskFormDialog.titleEnglish} <span className="text-destructive">*</span>
 </Label>
 <Input
 id="title"
 value={formData.title}
 onChange={(e) => setFormData({ ...formData, title: e.target.value })}
 placeholder={t.riskFormDialog.enterRiskTitleInEnglish}
 className={errors.title ? "border-destructive" : ""}
 />
 {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
 </div>

 {/* Title (AR) */}
 <div className="space-y-2">
 <Label htmlFor="titleAr">
 {t.riskFormDialog.titleArabic} <span className="text-destructive">*</span>
 </Label>
 <Input
 id="titleAr"
 value={formData.titleAr}
 onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })}
 placeholder={t.riskFormDialog.enterRiskTitleInArabic}
 className={errors.titleAr ? "border-destructive" : ""}
 dir="rtl"
 />
 {errors.titleAr && <p className="text-sm text-destructive">{errors.titleAr}</p>}
 </div>

 {/* Description (EN) */}
 <div className="space-y-2">
 <Label htmlFor="description">
 {t.riskFormDialog.descriptionEnglish} <span className="text-destructive">*</span>
 </Label>
 <Textarea
 id="description"
 value={formData.description}
 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
 placeholder={t.riskFormDialog.enterRiskDescriptionInEnglish}
 rows={3}
 className={errors.description ? "border-destructive" : ""}
 />
 {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
 </div>

 {/* Description (AR) */}
 <div className="space-y-2">
 <Label htmlFor="descriptionAr">
 {t.riskFormDialog.descriptionArabic} <span className="text-destructive">*</span>
 </Label>
 <Textarea
 id="descriptionAr"
 value={formData.descriptionAr}
 onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
 placeholder={t.riskFormDialog.enterRiskDescriptionInArabic}
 rows={3}
 className={errors.descriptionAr ? "border-destructive" : ""}
 dir="rtl"
 />
 {errors.descriptionAr && <p className="text-sm text-destructive">{errors.descriptionAr}</p>}
 </div>

 {/* Category, Likelihood, Impact */}
 <div className="grid grid-cols-3 gap-4">
 <div className="space-y-2">
 <Label htmlFor="category">{t.riskFormDialog.category}</Label>
 <Select
 value={formData.category}
 onValueChange={(value: any) => setFormData({ ...formData, category: value })}
 >
 <SelectTrigger id="category">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="operational">{t.riskFormDialog.operational}</SelectItem>
 <SelectItem value="financial">{t.riskFormDialog.financial}</SelectItem>
 <SelectItem value="strategic">{t.riskFormDialog.strategic}</SelectItem>
 <SelectItem value="compliance">{t.riskFormDialog.compliance}</SelectItem>
 <SelectItem value="reputational">{t.riskFormDialog.reputational}</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <Label htmlFor="likelihood">
 {t.riskFormDialog.likelihood} (1-5) <span className="text-destructive">*</span>
 </Label>
 <Input
 id="likelihood"
 type="number"
 min="1"
 max="5"
 value={formData.likelihood}
 onChange={(e) => setFormData({ ...formData, likelihood: parseInt(e.target.value) || 1 })}
 className={errors.likelihood ? "border-destructive" : ""}
 />
 {errors.likelihood && <p className="text-sm text-destructive">{errors.likelihood}</p>}
 </div>

 <div className="space-y-2">
 <Label htmlFor="impact">
 {t.riskFormDialog.impact} (1-5) <span className="text-destructive">*</span>
 </Label>
 <Input
 id="impact"
 type="number"
 min="1"
 max="5"
 value={formData.impact}
 onChange={(e) => setFormData({ ...formData, impact: parseInt(e.target.value) || 1 })}
 className={errors.impact ? "border-destructive" : ""}
 />
 {errors.impact && <p className="text-sm text-destructive">{errors.impact}</p>}
 </div>
 </div>

 {/* Status, Owner, Review Date */}
 <div className="grid grid-cols-3 gap-4">
 <div className="space-y-2">
 <Label htmlFor="status">{t.riskFormDialog.status}</Label>
 <Select
 value={formData.status}
 onValueChange={(value: any) => setFormData({ ...formData, status: value })}
 >
 <SelectTrigger id="status">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="identified">{t.riskFormDialog.identified}</SelectItem>
 <SelectItem value="assessed">{t.riskFormDialog.assessed}</SelectItem>
 <SelectItem value="mitigated">{t.riskFormDialog.mitigated}</SelectItem>
 <SelectItem value="closed">{t.riskFormDialog.closed}</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <Label htmlFor="owner">{t.riskFormDialog.riskOwnerEn}</Label>
 <Input
 id="owner"
 value={formData.owner}
 onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
 placeholder={t.riskFormDialog.enterOwnerName}
 />
 </div>

 <div className="space-y-2">
 <Label htmlFor="reviewDate">{t.riskFormDialog.reviewDate}</Label>
 <Input
 id="reviewDate"
 type="date"
 value={formData.reviewDate}
 onChange={(e) => setFormData({ ...formData, reviewDate: e.target.value })}
 />
 </div>
 </div>

 {/* Mitigation Plan */}
 <div className="space-y-2">
 <Label htmlFor="mitigation">{t.riskFormDialog.mitigationPlanEn}</Label>
 <Textarea
 id="mitigation"
 value={formData.mitigation}
 onChange={(e) => setFormData({ ...formData, mitigation: e.target.value })}
 placeholder={t.riskFormDialog.enterMitigationPlan}
 rows={3}
 />
 </div>

 <div className="space-y-2">
 <Label htmlFor="mitigationAr">{t.riskFormDialog.mitigationPlanAr}</Label>
 <Textarea
 id="mitigationAr"
 value={formData.mitigationAr}
 onChange={(e) => setFormData({ ...formData, mitigationAr: e.target.value })}
 placeholder={t.riskFormDialog.enterMitigationPlanInArabic}
 rows={3}
 dir="rtl"
 />
 </div>

 {/* Attachments */}
 <div className="space-y-2">
 <Label htmlFor="attachments">{t.riskFormDialog.attachments}</Label>
 <div className="flex items-center gap-2">
 <Input
 id="attachments"
 type="file"
 multiple
 accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
 onChange={handleFileChange}
 className="flex-1"
 />
 <Button type="button" variant="outline" size="icon" disabled={isLoading}>
 <Upload className="h-4 w-4" />
 </Button>
 </div>
 <p className="text-sm text-muted-foreground">
 {t.riskFormDialog.max10mbPerFileAllowedPdfDocxXlsxJpgPng}
 </p>

 {attachments.length > 0 && (
 <div className="space-y-2 mt-2">
 {attachments.map((file, index) => (
 <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
 <span className="text-sm truncate flex-1">{file.name}</span>
 <span className="text-sm text-muted-foreground mx-2">
 {(file.size / 1024 / 1024).toFixed(2)} MB
 </span>
 <Button
 type="button"
 variant="ghost"
 size="icon"
 onClick={() => removeFile(index)}
 disabled={isLoading}
 >
 <X className="h-4 w-4" />
 </Button>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>

 <div className="flex justify-end gap-2 pt-4 border-t">
 <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
 {t.riskFormDialog.cancel}
 </Button>
 <Button onClick={handleSubmit} disabled={isLoading}>
 {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
 {mode === "create" ? t.riskFormDialog.createRisk : t.riskFormDialog.updateRisk}
 </Button>
 </div>
 </DialogContent>
 </Dialog>
 );
}
