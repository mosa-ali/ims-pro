import { useTranslation } from '@/i18n/useTranslation';
import { useState, useEffect } from "react";
import { useLanguage } from '@/contexts/LanguageContext';
import { useCreateIncident, useUpdateIncident } from "@/hooks/useIncidentsData";
import { useRisksList } from "@/hooks/useRisksData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";
import type { Incident } from "@/services/riskComplianceService";

interface IncidentFormDialogProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 incident?: Incident | null;
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

export function IncidentFormDialog({ open, onOpenChange, incident, mode }: IncidentFormDialogProps) {
 const { language, isRTL} = useLanguage();
  const { t } = useTranslation();
 const createIncident = useCreateIncident();
 const updateIncident = useUpdateIncident();
 const { risks, isLoading: risksLoading } = useRisksList({});

 const [formData, setFormData] = useState({
 title: "",
 titleAr: "",
 description: "",
 descriptionAr: "",
 category: "operational" as const,
 severity: "moderate" as const,
 incidentDate: "",
 status: "reported" as const,
 reportedBy: "",
 reportedByAr: "",
 resolution: "",
 resolutionAr: "",
 relatedRiskId: null as number | null,
 });

 const [attachments, setAttachments] = useState<File[]>([]);
 const [uploading, setUploading] = useState(false);
 const [errors, setErrors] = useState<Record<string, string>>({});

 useEffect(() => {
 if (incident && mode === "edit") {
 setFormData({
 title: incident.title || "",
 titleAr: incident.titleAr || "",
 description: incident.description || "",
 descriptionAr: incident.descriptionAr || "",
 category: incident.category || "operational",
 severity: incident.severity || "moderate",
 incidentDate: incident.incidentDate || "",
 status: incident.status || "reported",
 reportedBy: incident.reportedBy || "",
 reportedByAr: incident.reportedByAr || "",
 resolution: incident.resolution || "",
 resolutionAr: incident.resolutionAr || "",
 relatedRiskId: incident.relatedRiskId || null,
 });
 } else {
 // Reset form for create mode
 setFormData({
 title: "",
 titleAr: "",
 description: "",
 descriptionAr: "",
 category: "operational",
 severity: "moderate",
 incidentDate: "",
 status: "reported",
 reportedBy: "",
 reportedByAr: "",
 resolution: "",
 resolutionAr: "",
 relatedRiskId: null,
 });
 setAttachments([]);
 }
 setErrors({});
 }, [incident, mode, open]);

 const validateForm = (): boolean => {
 const newErrors: Record<string, string> = {};

 // Required fields
 if (!formData.title.trim()) {
 newErrors.title = t.incidentFormDialog.titleIsRequired;
 }
 if (!formData.titleAr.trim()) {
 newErrors.titleAr = t.incidentFormDialog.arabicTitleIsRequired;
 }
 if (!formData.description.trim()) {
 newErrors.description = t.incidentFormDialog.descriptionIsRequired;
 }
 if (!formData.descriptionAr.trim()) {
 newErrors.descriptionAr = t.incidentFormDialog.arabicDescriptionIsRequired;
 }
 if (!formData.incidentDate) {
 newErrors.incidentDate = t.incidentFormDialog.incidentDateIsRequired;
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
 toast.error(t.incidentFormDialog.failedToUploadAttachments);
 return [];
 } finally {
 setUploading(false);
 }
 };

 const handleSubmit = async () => {
 if (!validateForm()) {
 toast.error(t.incidentFormDialog.pleaseFixValidationErrors);
 return;
 }

 try {
 // Upload attachments if any
 const attachmentUrls = await uploadFilesToS3();

 const incidentData = {
 ...formData,
 attachments: attachmentUrls.length > 0 ? JSON.stringify(attachmentUrls) : undefined,
 };

 if (mode === "create") {
 await createIncident.mutateAsync(incidentData);
 toast.success(t.incidentFormDialog.incidentCreatedSuccessfully);
 } else if (incident) {
 await updateIncident.mutateAsync({ id: incident.id, ...incidentData });
 toast.success(t.incidentFormDialog.incidentUpdatedSuccessfully);
 }

 onOpenChange(false);
 } catch (error: any) {
 console.error("Submit error:", error);
 toast.error(error.message || t.incidentFormDialog.failedToSaveIncident);
 }
 };

 const isLoading = createIncident.isPending || updateIncident.isPending || uploading;

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>
 {mode === "create" ? t.incidentFormDialog.createNewIncident : t.incidentFormDialog.editIncident}
 </DialogTitle>
 <DialogDescription>
 {t.incidentFormDialog.fillInTheIncidentDetailsFieldsMarkedWithAreRequired}
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-6 py-4">
 {/* Title (EN) */}
 <div className="space-y-2">
 <Label htmlFor="title">
 {t.incidentFormDialog.titleEnglish} <span className="text-destructive">*</span>
 </Label>
 <Input
 id="title"
 value={formData.title}
 onChange={(e) => setFormData({ ...formData, title: e.target.value })}
 placeholder={t.incidentFormDialog.enterIncidentTitleInEnglish}
 className={errors.title ? "border-destructive" : ""}
 />
 {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
 </div>

 {/* Title (AR) */}
 <div className="space-y-2">
 <Label htmlFor="titleAr">
 {t.incidentFormDialog.titleArabic} <span className="text-destructive">*</span>
 </Label>
 <Input
 id="titleAr"
 value={formData.titleAr}
 onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })}
 placeholder={t.incidentFormDialog.enterIncidentTitleInArabic}
 className={errors.titleAr ? "border-destructive" : ""}
 dir="rtl"
 />
 {errors.titleAr && <p className="text-sm text-destructive">{errors.titleAr}</p>}
 </div>

 {/* Description (EN) */}
 <div className="space-y-2">
 <Label htmlFor="description">
 {t.incidentFormDialog.descriptionEnglish} <span className="text-destructive">*</span>
 </Label>
 <Textarea
 id="description"
 value={formData.description}
 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
 placeholder={t.incidentFormDialog.enterIncidentDescriptionInEnglish}
 rows={3}
 className={errors.description ? "border-destructive" : ""}
 />
 {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
 </div>

 {/* Description (AR) */}
 <div className="space-y-2">
 <Label htmlFor="descriptionAr">
 {t.incidentFormDialog.descriptionArabic} <span className="text-destructive">*</span>
 </Label>
 <Textarea
 id="descriptionAr"
 value={formData.descriptionAr}
 onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
 placeholder={t.incidentFormDialog.enterIncidentDescriptionInArabic}
 rows={3}
 className={errors.descriptionAr ? "border-destructive" : ""}
 dir="rtl"
 />
 {errors.descriptionAr && <p className="text-sm text-destructive">{errors.descriptionAr}</p>}
 </div>

 {/* Category, Severity, Incident Date */}
 <div className="grid grid-cols-3 gap-4">
 <div className="space-y-2">
 <Label htmlFor="category">{t.incidentFormDialog.category}</Label>
 <Select
 value={formData.category}
 onValueChange={(value: any) => setFormData({ ...formData, category: value })}
 >
 <SelectTrigger id="category">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="operational">{t.incidentFormDialog.operational}</SelectItem>
 <SelectItem value="financial">{t.incidentFormDialog.financial}</SelectItem>
 <SelectItem value="safety">{t.incidentFormDialog.safety}</SelectItem>
 <SelectItem value="security">{t.incidentFormDialog.security}</SelectItem>
 <SelectItem value="compliance">{t.incidentFormDialog.compliance}</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <Label htmlFor="severity">{t.incidentFormDialog.severity}</Label>
 <Select
 value={formData.severity}
 onValueChange={(value: any) => setFormData({ ...formData, severity: value })}
 >
 <SelectTrigger id="severity">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="minor">{t.incidentFormDialog.minor}</SelectItem>
 <SelectItem value="moderate">{t.incidentFormDialog.moderate}</SelectItem>
 <SelectItem value="major">{t.incidentFormDialog.major}</SelectItem>
 <SelectItem value="critical">{t.incidentFormDialog.critical}</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <Label htmlFor="incidentDate">
 {t.incidentFormDialog.incidentDate} <span className="text-destructive">*</span>
 </Label>
 <Input
 id="incidentDate"
 type="date"
 value={formData.incidentDate}
 onChange={(e) => setFormData({ ...formData, incidentDate: e.target.value })}
 className={errors.incidentDate ? "border-destructive" : ""}
 />
 {errors.incidentDate && <p className="text-sm text-destructive">{errors.incidentDate}</p>}
 </div>
 </div>

 {/* Related Risk Dropdown */}
 <div className="space-y-2">
 <Label htmlFor="relatedRisk">{t.incidentFormDialog.relatedRisk}</Label>
 <Select
 value={formData.relatedRiskId?.toString() || "none"}
 onValueChange={(value) => 
 setFormData({ ...formData, relatedRiskId: value === "none" ? null : parseInt(value) })
 }
 >
 <SelectTrigger id="relatedRisk">
 <SelectValue placeholder={t.incidentFormDialog.selectARelatedRiskOptional} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="none">{t.incidentFormDialog.noRelatedRisk}</SelectItem>
 {risksLoading && <SelectItem value="loading" disabled>{t.incidentFormDialog.loadingRisks}</SelectItem>}
 {risks?.map((risk) => (
 <SelectItem key={risk.id} value={risk.id.toString()}>
                {isRTL ? risk.titleAr || risk.title : risk.title} - {(t as any)[risk.level] || risk.level}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 <p className="text-sm text-muted-foreground">
 {t.incidentFormDialog.linkThisIncidentToAnExistingRiskForBetterTracking}
 </p>
 </div>

 {/* Status, Reported By */}
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label htmlFor="status">{t.incidentFormDialog.status}</Label>
 <Select
 value={formData.status}
 onValueChange={(value: any) => setFormData({ ...formData, status: value })}
 >
 <SelectTrigger id="status">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="reported">{t.incidentFormDialog.reported}</SelectItem>
 <SelectItem value="investigating">{t.incidentFormDialog.investigating}</SelectItem>
 <SelectItem value="resolved">{t.incidentFormDialog.resolved}</SelectItem>
 <SelectItem value="closed">{t.incidentFormDialog.closed}</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <Label htmlFor="reportedBy">{t.incidentFormDialog.reportedByEn}</Label>
 <Input
 id="reportedBy"
 value={formData.reportedBy}
 onChange={(e) => setFormData({ ...formData, reportedBy: e.target.value })}
 placeholder={t.incidentFormDialog.enterReporterName}
 />
 </div>
 </div>

 {/* Resolution */}
 <div className="space-y-2">
 <Label htmlFor="resolution">{t.incidentFormDialog.resolutionEn}</Label>
 <Textarea
 id="resolution"
 value={formData.resolution}
 onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
 placeholder={t.incidentFormDialog.enterResolutionDetails}
 rows={3}
 />
 </div>

 <div className="space-y-2">
 <Label htmlFor="resolutionAr">{t.incidentFormDialog.resolutionAr}</Label>
 <Textarea
 id="resolutionAr"
 value={formData.resolutionAr}
 onChange={(e) => setFormData({ ...formData, resolutionAr: e.target.value })}
 placeholder={t.incidentFormDialog.enterResolutionDetailsInArabic}
 rows={3}
 dir="rtl"
 />
 </div>

 {/* Attachments */}
 <div className="space-y-2">
 <Label htmlFor="attachments">{t.incidentFormDialog.attachments}</Label>
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
 {t.incidentFormDialog.max10mbPerFileAllowedPdfDocxXlsxJpgPng}
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
 {t.incidentFormDialog.cancel}
 </Button>
 <Button onClick={handleSubmit} disabled={isLoading}>
 {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
 {mode === "create" ? t.incidentFormDialog.createIncident : t.incidentFormDialog.updateIncident}
 </Button>
 </div>
 </DialogContent>
 </Dialog>
 );
}
