import { useTranslation } from '@/i18n/useTranslation';
import { useState, useEffect } from "react";
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from "@/lib/trpc";
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Edit2, ChevronRight, ChevronLeft } from "lucide-react";

interface OrganizationFormModalProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 organizationId?: number;
 mode: "create" | "edit";
}

interface FormData {
 // Step 1: Organization Information
 name: string;
 country: string;
 domain: string;
 status: "active" | "inactive" | "suspended";
 shortCode: string;
 tenantId: string;
 // Step 2: Organization Admins
 primaryAdminId: number | null;
 adminName: string;
 adminEmail: string;
 secondaryAdminId: number | null;
 secondaryAdminName: string;
 secondaryAdminEmail: string;
}

interface OperatingUnitForm {
 id?: number; // For editing existing OUs
 tempId?: string; // For new OUs before creation
 name: string;
 type: "hq" | "regional" | "field";
 country: string;
}

const COUNTRIES = [
 "Yemen",
 "Jordan",
 "Lebanon",
 "Syria",
 "Palestine",
 "Iraq",
 "Egypt",
 "Sudan",
 "Turkey",
 "Other"
];

// OU Types for dropdown
const OU_TYPES = [
 { value: "hq", label: "Headquarters (HQ)" },
 { value: "regional", label: "Regional Office" },
 { value: "field", label: "Field Office" },
] as const;

export function OrganizationFormModal({
 open,
 onOpenChange,
 organizationId,
 mode,
}: OrganizationFormModalProps) {
 const { language, isRTL} = useLanguage();
  const { t } = useTranslation();
const utils = trpc.useUtils();

 const [formData, setFormData] = useState<FormData>({
 name: "",
 country: "",
 domain: "",
 status: "active",
 shortCode: "",
 tenantId: "",
 primaryAdminId: null,
 adminName: "",
 adminEmail: "",
 secondaryAdminId: null,
 secondaryAdminName: "",
 secondaryAdminEmail: "",
 });

 const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
 const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
 const [operatingUnits, setOperatingUnits] = useState<OperatingUnitForm[]>([]);
 const [newOU, setNewOU] = useState<OperatingUnitForm>({
 name: "",
 type: "field",
 country: "",
 });
 const [editingOUIndex, setEditingOUIndex] = useState<number | null>(null);

 // Fetch organization data for edit mode
 const { data: organizations } = trpc.ims.organizations.list.useQuery(undefined, {
 enabled: mode === "edit" && !!organizationId,
 });

 const organization = organizations?.find((org) => org.id === organizationId);

 // Fetch primary admin user details for edit mode
 const { data: adminUser } = trpc.ims.users.getById.useQuery(
 { id: organization?.primaryAdminId! },
 { enabled: mode === "edit" && !!organization?.primaryAdminId }
 );

 // Fetch secondary admin user details for edit mode
 const { data: secondaryAdminUser } = trpc.ims.users.getById.useQuery(
 { id: organization?.secondaryAdminId! },
 { enabled: mode === "edit" && !!organization?.secondaryAdminId }
 );

 // Fetch existing OUs for edit mode
 const { data: existingOUs } = trpc.ims.operatingUnits.listByOrganization.useQuery(
 { organizationId: organizationId! },
 { enabled: mode === "edit" && !!organizationId }
 );

 useEffect(() => {
 if (mode === "edit" && organization) {
 setFormData({
 name: organization.name,
 country: organization.country || "",
 domain: organization.domain || "",
 status: organization.status as "active" | "inactive" | "suspended",
 shortCode: organization.shortCode || "",
 tenantId: organization.tenantId || "",
 primaryAdminId: organization.primaryAdminId || null,
 adminName: adminUser?.name || "",
 adminEmail: adminUser?.email || "",
 secondaryAdminId: organization.secondaryAdminId || null,
 secondaryAdminName: secondaryAdminUser?.name || "",
 secondaryAdminEmail: secondaryAdminUser?.email || "",
 });
 }
 }, [mode, organization, adminUser, secondaryAdminUser]);

 useEffect(() => {
 if (mode === "edit" && existingOUs) {
 setOperatingUnits(
 existingOUs.map((ou) => ({
 id: ou.id,
 name: ou.name,
 type: ou.type as "hq" | "regional" | "field",
 country: ou.country || "",
 }))
 );
 }
 }, [mode, existingOUs]);

 // Reset form when dialog closes
 useEffect(() => {
 if (!open) {
 setFormData({
 name: "",
 country: "",
 domain: "",
 status: "active",
 shortCode: "",
 tenantId: "",
 primaryAdminId: null,
 adminName: "",
 adminEmail: "",
 });
 setErrors({});
 setCurrentStep(1);
 setOperatingUnits([]);
 setNewOU({ name: "", type: "field", country: "" });
 setEditingOUIndex(null);
 }
 }, [open]);

 const createMutation = trpc.ims.organizations.create.useMutation({
 onSuccess: () => {
 toast.success(t.organizationFormModal.createSuccess);
 utils.ims.organizations.list.invalidate();
 onOpenChange(false);
 },
 onError: (error) => {
 toast.error(t.organizationFormModal.createError);
 },
 });

 const updateMutation = trpc.ims.organizations.update.useMutation({
 onSuccess: () => {
 toast.success(t.organizationFormModal.updateSuccess);
 utils.ims.organizations.list.invalidate();
 onOpenChange(false);
 },
 onError: (error) => {
 toast.error(t.organizationFormModal.updateError);
 },
 });

 const validateStep1 = (): boolean => {
 const newErrors: Partial<Record<keyof FormData, string>> = {};

 if (!formData.name.trim()) {
 newErrors.name = t.organizationFormModal.nameRequired;
 }

 if (!formData.country.trim()) {
 newErrors.country = t.organizationFormModal.countryRequired;
 }

 if (formData.domain && !/^[a-z0-9.-]+$/.test(formData.domain)) {
 newErrors.domain = t.organizationFormModal.domainInvalid;
 }

 setErrors(newErrors);
 return Object.keys(newErrors).length === 0;
 };

 const validateStep2 = (): boolean => {
 const newErrors: Partial<Record<keyof FormData, string>> = {};

 // Validate Primary Admin (required for create mode, editable in edit mode)
 if (!formData.adminName.trim()) {
 newErrors.adminName = t.organizationFormModal.adminNameRequired;
 }

 if (!formData.adminEmail.trim()) {
 newErrors.adminEmail = t.organizationFormModal.adminEmailRequired;
 } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
 newErrors.adminEmail = t.organizationFormModal.adminEmailInvalid;
 }

 // Validate Secondary Admin (optional, but if name provided, email is required)
 if (formData.secondaryAdminName.trim() && !formData.secondaryAdminEmail.trim()) {
 newErrors.secondaryAdminEmail = t.organizationFormModal.adminEmailRequired;
 } else if (formData.secondaryAdminEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.secondaryAdminEmail)) {
 newErrors.secondaryAdminEmail = t.organizationFormModal.adminEmailInvalid;
 }

 // Prevent same email for both admins
 if (formData.adminEmail && formData.secondaryAdminEmail && 
 formData.adminEmail === formData.secondaryAdminEmail) {
 newErrors.secondaryAdminEmail = "Primary and secondary admin cannot have the same email";
 }

 setErrors(newErrors);
 return Object.keys(newErrors).length === 0;
 };

 const handleNext = () => {
 if (currentStep === 1 && validateStep1()) {
 setCurrentStep(2);
 } else if (currentStep === 2 && validateStep2()) {
 setCurrentStep(3);
 }
 };

 const handleBack = () => {
 if (currentStep === 3) {
 setCurrentStep(2);
 } else if (currentStep === 2) {
 setCurrentStep(1);
 }
 };

 const handleAddOU = () => {
 if (!newOU.name.trim()) {
 toast.error(t.organizationFormModal.ouNameRequired);
 return;
 }
 if (!newOU.country.trim()) {
 toast.error(t.organizationFormModal.ouCountryRequired);
 return;
 }

 if (editingOUIndex !== null) {
 // Update existing OU
 const updated = [...operatingUnits];
 // Preserve the ID field when updating
 updated[editingOUIndex] = { ...newOU, id: operatingUnits[editingOUIndex].id };
 setOperatingUnits(updated);
 setEditingOUIndex(null);
 toast.success(t.organizationFormModal.ouUpdated);
 } else {
 // Add new OU
 setOperatingUnits([...operatingUnits, { ...newOU, tempId: `temp-${Date.now()}` }]);
 toast.success(t.organizationFormModal.ouAdded);
 }

 // Reset form
 setNewOU({ name: "", type: "field", country: "" });
 };

 const handleEditOU = (index: number) => {
 setNewOU(operatingUnits[index]);
 setEditingOUIndex(index);
 };

 const handleDeleteOU = (index: number) => {
 setOperatingUnits(operatingUnits.filter((_, i) => i !== index));
 toast.success(t.organizationFormModal.ouRemoved);
 };

 const handleCancelEdit = () => {
 setNewOU({ name: "", type: "field", country: "" });
 setEditingOUIndex(null);
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();

 if (currentStep === 1 || currentStep === 2) {
 handleNext();
 return;
 }

 // Step 3: Submit everything
 if (mode === "create") {
 createMutation.mutate({
 name: formData.name.trim(),
 country: formData.country.trim(),
 domain: formData.domain.trim() || undefined,
 status: formData.status,
 shortCode: formData.shortCode.trim() || undefined,
 tenantId: formData.tenantId.trim() || undefined,
 primaryAdminId: formData.primaryAdminId || undefined,
 adminName: formData.adminName.trim(),
 adminEmail: formData.adminEmail.trim(),
 // Secondary admin (optional)
 secondaryAdminName: formData.secondaryAdminName.trim() || undefined,
 secondaryAdminEmail: formData.secondaryAdminEmail.trim() || undefined,
 // Send operating units array
 operatingUnits: operatingUnits.map(ou => ({
 name: ou.name,
 type: ou.type,
 country: ou.country,
 })),
 });
 } else if (mode === "edit" && organizationId) {
 const ousToSend = operatingUnits.map(ou => ({
 id: ou.id, // Will be undefined for new OUs
 name: ou.name,
 type: ou.type,
 country: ou.country,
 }));
 console.log('[UPDATE] Sending OUs:', ousToSend);
 updateMutation.mutate({
 id: organizationId,
 name: formData.name.trim(),
 country: formData.country.trim(),
 domain: formData.domain.trim() || undefined,
 status: formData.status,
 shortCode: formData.shortCode.trim() || undefined,
 tenantId: formData.tenantId.trim() || undefined,
 primaryAdminId: formData.primaryAdminId || undefined,
 // Admin editing support
 adminName: formData.adminName.trim() || undefined,
 adminEmail: formData.adminEmail.trim() || undefined,
 secondaryAdminName: formData.secondaryAdminName.trim() || undefined,
 secondaryAdminEmail: formData.secondaryAdminEmail.trim() || undefined,
 // Send operating units array with IDs for existing OUs
 operatingUnits: ousToSend,
 });
 }
 };

 const isLoading = createMutation.isPending || updateMutation.isPending;
 const isSubmitDisabled = isLoading || !formData.name.trim();

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>
 {mode === "create"
 ? t.organizationFormModal.createTitle
 : t.organizationFormModal.editTitle}
 </DialogTitle>
 <DialogDescription>
 {currentStep === 1
 ? t.organizationFormModal.step1Description
 : currentStep === 2
 ? t.organizationFormModal.step2Description
 : t.organizationFormModal.step3Description}
 </DialogDescription>
 </DialogHeader>

 <form onSubmit={handleSubmit}>
 {currentStep === 1 ? (
 <div className="grid gap-4 py-4">
 {/* Organization Name */}
 <div className="grid gap-2">
 <Label htmlFor="name">{t.organizationFormModal.nameLabel} *</Label>
 <Input
 id="name"
 value={formData.name}
 onChange={(e) =>
 setFormData({ ...formData, name: e.target.value })
 }
 placeholder={t.organizationFormModal.namePlaceholder}
 className={errors.name ? "border-red-500" : ""}
 />
 {errors.name && (
 <p className="text-sm text-red-500">{errors.name}</p>
 )}
 </div>

 {/* Country */}
 <div className="grid gap-2">
 <Label htmlFor="country">{t.organizationFormModal.countryLabel} *</Label>
 <Select
 value={formData.country}
 onValueChange={(value) =>
 setFormData({ ...formData, country: value })
 }
 >
 <SelectTrigger className={errors.country ? "border-red-500" : ""}>
 <SelectValue placeholder={t.organizationFormModal.countryPlaceholder} />
 </SelectTrigger>
 <SelectContent>
 {COUNTRIES.map((country) => (
 <SelectItem key={country} value={country}>
 {country}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 {errors.country && (
 <p className="text-sm text-red-500">{errors.country}</p>
 )}
 </div>

 {/* Domain */}
 <div className="grid gap-2">
 <Label htmlFor="domain">{t.organizationFormModal.domainLabel}</Label>
 <Input
 id="domain"
 value={formData.domain}
 onChange={(e) =>
 setFormData({ ...formData, domain: e.target.value })
 }
 placeholder={t.organizationFormModal.domainPlaceholder}
 className={errors.domain ? "border-red-500" : ""}
 />
 <p className="text-xs text-muted-foreground">
 {t.organizationFormModal.domainHelper}
 </p>
 {errors.domain && (
 <p className="text-sm text-red-500">{errors.domain}</p>
 )}
 </div>

 {/* Organization Code */}
 <div className="grid gap-2">
 <Label htmlFor="shortCode">{t.organizationFormModal.shortCodeLabel}</Label>
 <Input
 id="shortCode"
 value={formData.shortCode}
 onChange={(e) =>
 setFormData({ ...formData, shortCode: e.target.value })
 }
 placeholder={t.organizationFormModal.shortCodePlaceholder}
 />
 <p className="text-sm text-muted-foreground mt-1">
 {t.organizationFormModal.shortCodeHelper}
 </p>
 </div>

 {/* Tenant ID */}
 <div className="grid gap-2">
 <Label htmlFor="tenantId">{t.organizationFormModal.tenantIdLabel}</Label>
 <Input
 id="tenantId"
 value={formData.tenantId}
 onChange={(e) =>
 setFormData({ ...formData, tenantId: e.target.value })
 }
 placeholder={t.organizationFormModal.tenantIdPlaceholder}
 />
 <p className="text-xs text-muted-foreground">
 {t.organizationFormModal.tenantIdHelper}
 </p>
 </div>

 {/* Status */}
 <div className="grid gap-2">
 <Label htmlFor="status">{t.organizationFormModal.statusLabel}</Label>
 <Select
 value={formData.status}
 onValueChange={(value: "active" | "inactive" | "suspended") =>
 setFormData({ ...formData, status: value })
 }
 >
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="active">{t.organizationFormModal.active}</SelectItem>
 <SelectItem value="inactive">{t.organizationFormModal.inactive}</SelectItem>
 <SelectItem value="suspended">{t.organizationFormModal.suspended}</SelectItem>
 </SelectContent>
 </Select>
 </div>

 </div>
 ) : currentStep === 2 ? (
 <div className="grid gap-4 py-4">
 {/* Primary Admin Section */}
 <div className="mb-4">
 <h3 className="text-sm font-semibold mb-2">{t.organizationFormModal.adminSectionTitle}</h3>
 <p className="text-xs text-muted-foreground">
 {mode === "create"
 ? t.organizationFormModal.adminSectionDescCreate
 : t.organizationFormModal.adminSectionDescEdit}
 </p>
 </div>

 <div className="grid gap-2">
 <Label htmlFor="adminName">{t.organizationFormModal.adminNameLabel} *</Label>
 <Input
 id="adminName"
 value={formData.adminName}
 onChange={(e) =>
 setFormData({ ...formData, adminName: e.target.value })
 }
 placeholder={t.organizationFormModal.adminNamePlaceholder}
 className={errors.adminName ? "border-red-500" : ""}
 />
 {errors.adminName && (
 <p className="text-sm text-red-500">{errors.adminName}</p>
 )}
 </div>

 <div className="grid gap-2">
 <Label htmlFor="adminEmail">{t.organizationFormModal.adminEmailLabel} *</Label>
 <Input
 id="adminEmail"
 type="email"
 value={formData.adminEmail}
 onChange={(e) =>
 setFormData({ ...formData, adminEmail: e.target.value })
 }
 placeholder={t.organizationFormModal.adminEmailPlaceholder}
 className={errors.adminEmail ? "border-red-500" : ""}
 />
 {errors.adminEmail && (
 <p className="text-sm text-red-500">{errors.adminEmail}</p>
 )}
 </div>

 {/* Admin Role */}
 <div className="grid gap-2">
 <Label htmlFor="adminRole">{t.organizationFormModal.roleLabel}</Label>
 <Input
 id="adminRole"
 value={t.organizationFormModal.organizationAdminRole}
 disabled
 className="bg-muted"
 />
 <p className="text-xs text-muted-foreground">
 {t.organizationFormModal.roleDescription}
 </p>
 </div>

 {/* Secondary Admin Section (Optional) */}
 <div className="border-t pt-4 mt-2">
 <h3 className="text-sm font-semibold mb-2">{t.organizationFormModal.secondaryAdminSectionTitle}</h3>
 <p className="text-xs text-muted-foreground mb-4">
 {t.organizationFormModal.secondaryAdminSectionDesc}
 </p>
 </div>

 <div className="grid gap-2">
 <Label htmlFor="secondaryAdminName">{t.organizationFormModal.secondaryAdminNameLabel}</Label>
 <Input
 id="secondaryAdminName"
 value={formData.secondaryAdminName}
 onChange={(e) =>
 setFormData({ ...formData, secondaryAdminName: e.target.value })
 }
 placeholder={t.organizationFormModal.secondaryAdminNamePlaceholder}
 className={errors.secondaryAdminName ? "border-red-500" : ""}
 />
 {errors.secondaryAdminName && (
 <p className="text-sm text-red-500">{errors.secondaryAdminName}</p>
 )}
 </div>

 <div className="grid gap-2">
 <Label htmlFor="secondaryAdminEmail">{t.organizationFormModal.secondaryAdminEmailLabel}</Label>
 <Input
 id="secondaryAdminEmail"
 type="email"
 value={formData.secondaryAdminEmail}
 onChange={(e) =>
 setFormData({ ...formData, secondaryAdminEmail: e.target.value })
 }
 placeholder={t.organizationFormModal.secondaryAdminEmailPlaceholder}
 className={errors.secondaryAdminEmail ? "border-red-500" : ""}
 />
 {errors.secondaryAdminEmail && (
 <p className="text-sm text-red-500">{errors.secondaryAdminEmail}</p>
 )}
 </div>

 {/* Secondary Admin Role (same as primary) */}
 <div className="grid gap-2">
 <Label htmlFor="secondaryAdminRole">{t.organizationFormModal.roleLabel}</Label>
 <Input
 id="secondaryAdminRole"
 value={t.organizationFormModal.organizationAdminRole}
 disabled
 className="bg-muted"
 />
 <p className="text-xs text-muted-foreground">
 {t.organizationFormModal.roleDescription}
 </p>
 </div>
 </div>
 ) : (
 <div className="grid gap-4 py-4">
 <div className="mb-4">
 <h3 className="text-sm font-semibold mb-2">{t.organizationFormModal.ouSectionTitle}</h3>
 <p className="text-xs text-muted-foreground">
 {t.organizationFormModal.ouSectionDesc}
 </p>
 </div>

 {/* Add/Edit OU Form */}
 <Card>
 <CardHeader>
 <CardTitle className="text-base">
 {editingOUIndex !== null ? t.organizationFormModal.editOuCardTitle : t.organizationFormModal.addOuCardTitle}
 </CardTitle>
 <CardDescription>
 {t.organizationFormModal.addOuCardDesc}
 </CardDescription>
 </CardHeader>
 <CardContent className="grid gap-4">
 <div className="grid gap-2">
 <Label htmlFor="ouName">{t.organizationFormModal.ouNameLabel} *</Label>
 <Input
 id="ouName"
 value={newOU.name}
 onChange={(e) =>
 setNewOU({ ...newOU, name: e.target.value })
 }
 placeholder={t.organizationFormModal.ouNamePlaceholder}
 />
 </div>

 <div className="grid gap-2">
 <Label htmlFor="ouType">{t.organizationFormModal.ouTypeLabel} *</Label>
 <Select
 value={newOU.type}
 onValueChange={(value: "hq" | "regional" | "field") =>
 setNewOU({ ...newOU, type: value })
 }
 >
 <SelectTrigger>
 <SelectValue placeholder={t.organizationFormModal.ouTypePlaceholder} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="hq">{t.organizationFormModal.ouTypeHq}</SelectItem>
 <SelectItem value="regional">{t.organizationFormModal.ouTypeRegional}</SelectItem>
 <SelectItem value="field">{t.organizationFormModal.ouTypeField}</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="grid gap-2">
 <Label htmlFor="ouCountry">{t.organizationFormModal.ouCountryLabel} *</Label>
 <Select
 value={newOU.country}
 onValueChange={(value) =>
 setNewOU({ ...newOU, country: value })
 }
 >
 <SelectTrigger>
 <SelectValue placeholder={t.organizationFormModal.ouCountryPlaceholder} />
 </SelectTrigger>
 <SelectContent>
 {COUNTRIES.map((country) => (
 <SelectItem key={country} value={country}>
 {country}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="flex gap-2">
 <Button
 type="button"
 onClick={handleAddOU}
 className="flex-1"
 >
 {editingOUIndex !== null ? (
 <>
 <Edit2 className="me-2 h-4 w-4" />
 {t.organizationFormModal.updateOuButton}
 </>
 ) : (
 <>
 <Plus className="me-2 h-4 w-4" />
 {t.organizationFormModal.addOuButton}
 </>
 )}
 </Button>
 {editingOUIndex !== null && (
 <Button
 type="button"
 variant="outline"
 onClick={handleCancelEdit}
 >
 {t.organizationFormModal.cancelEditButton}
 </Button>
 )}
 </div>
 </CardContent>
 </Card>

 {/* OU List */}
 {operatingUnits.length > 0 && (
 <div className="space-y-2">
 <h4 className="text-sm font-medium">
 {t.organizationFormModal.addedOusTitle}
 </h4>
 {operatingUnits.map((ou, index) => (
 <Card key={ou.id || ou.tempId || index}>
 <CardContent className="flex items-center justify-between p-4">
 <div>
 <p className="font-medium">{ou.name}</p>
 <p className="text-sm text-muted-foreground">
 {OU_TYPES.find((t) => t.value === ou.type)?.label} • {ou.country}
 </p>
 </div>
 <div className="flex gap-2">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => handleEditOU(index)}
 >
 <Edit2 className="h-4 w-4" />
 </Button>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => handleDeleteOU(index)}
 >
 <Trash2 className="h-4 w-4" />
 </Button>
 </div>
 </CardContent>
 </Card>
 ))}
 </div>
 )}

 {operatingUnits.length === 0 && (
 <div className="text-center py-8 text-muted-foreground">
 <p className="text-sm">{t.organizationFormModal.noOusMessage}</p>
 <p className="text-xs mt-1">{t.organizationFormModal.noOusHelper}</p>
 </div>
 )}
 </div>
 )}

 <DialogFooter className="mt-6">
 {(currentStep === 2 || currentStep === 3) && (
 <Button
 type="button"
 variant="outline"
 onClick={handleBack}
 disabled={isLoading} data-back-nav>
 {isRTL ? <ChevronRight className="me-2 h-4 w-4" /> : <ChevronLeft className="me-2 h-4 w-4" />}
 {t.organizationFormModal.backButton}
 </Button>
 )}
 <Button
 type="button"
 variant="outline"
 onClick={() => onOpenChange(false)}
 disabled={isLoading}
 >
 {t.organizationFormModal.cancelButton}
 </Button>
 <Button type="submit" disabled={isSubmitDisabled} data-back-nav>
 {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
 {currentStep === 1 ? (
 <>
 {t.organizationFormModal.nextAdminsButton}
 <ChevronRight className="ms-2 h-4 w-4" />
 </>
 ) : currentStep === 2 ? (
 <>
 {t.organizationFormModal.nextOusButton}
 <ChevronRight className="ms-2 h-4 w-4" />
 </>
 ) : mode === "create" ? (
 t.organizationFormModal.createButton
 ) : (
 t.organizationFormModal.updateButton
 )}
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>
 );
}
