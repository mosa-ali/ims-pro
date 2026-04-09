import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  organizationCode: string;
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
  const { t } = useTranslation();
  const utils = trpc.useUtils();

  const [formData, setFormData] = useState<FormData>({
    name: "",
    country: "",
    domain: "",
    status: "active",
    organizationCode: "",
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
        organizationCode: organization.organizationCode || "",
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
        organizationCode: "",
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
      toast.success(t("platform.organizations.wizard.createSuccess"));
      utils.ims.organizations.list.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(t("platform.organizations.wizard.createError", { message: error.message }));
    },
  });

  const updateMutation = trpc.ims.organizations.update.useMutation({
    onSuccess: () => {
      toast.success(t("platform.organizations.wizard.updateSuccess"));
      utils.ims.organizations.list.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(t("platform.organizations.wizard.updateError", { message: error.message }));
    },
  });

  const validateStep1 = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = t("platform.organizations.wizard.nameRequired");
    }

    if (!formData.country.trim()) {
      newErrors.country = t("platform.organizations.wizard.countryRequired");
    }

    if (formData.domain && !/^[a-z0-9.-]+$/.test(formData.domain)) {
      newErrors.domain = t("platform.organizations.wizard.domainInvalid");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    // Validate Primary Admin (required for create mode, editable in edit mode)
    if (!formData.adminName.trim()) {
      newErrors.adminName = t("platform.organizations.wizard.adminNameRequired");
    }

    if (!formData.adminEmail.trim()) {
      newErrors.adminEmail = t("platform.organizations.wizard.adminEmailRequired");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
      newErrors.adminEmail = t("platform.organizations.wizard.adminEmailInvalid");
    }

    // Validate Secondary Admin (optional, but if name provided, email is required)
    if (formData.secondaryAdminName.trim() && !formData.secondaryAdminEmail.trim()) {
      newErrors.secondaryAdminEmail = t("platform.organizations.wizard.adminEmailRequired");
    } else if (formData.secondaryAdminEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.secondaryAdminEmail)) {
      newErrors.secondaryAdminEmail = t("platform.organizations.wizard.adminEmailInvalid");
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
      toast.error(t("platform.organizations.wizard.ouNameRequired"));
      return;
    }
    if (!newOU.country.trim()) {
      toast.error(t("platform.organizations.wizard.ouCountryRequired"));
      return;
    }

    if (editingOUIndex !== null) {
      // Update existing OU
      const updated = [...operatingUnits];
      // Preserve the ID field when updating
      updated[editingOUIndex] = { ...newOU, id: operatingUnits[editingOUIndex].id };
      setOperatingUnits(updated);
      setEditingOUIndex(null);
      toast.success(t("platform.organizations.wizard.ouUpdated"));
    } else {
      // Add new OU
      setOperatingUnits([...operatingUnits, { ...newOU, tempId: `temp-${Date.now()}` }]);
      toast.success(t("platform.organizations.wizard.ouAdded"));
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
    toast.success(t("platform.organizations.wizard.ouRemoved"));
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
        organizationCode: formData.organizationCode.trim() || undefined,
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
        organizationCode: formData.organizationCode.trim() || undefined,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create"
              ? t("platform.organizations.wizard.createTitle")
              : t("platform.organizations.wizard.editTitle")}
          </DialogTitle>
          <DialogDescription>
            {currentStep === 1
              ? t("platform.organizations.wizard.step1Description")
              : currentStep === 2
              ? t("platform.organizations.wizard.step2Description")
              : t("platform.organizations.wizard.step3Description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          {currentStep === 1 ? (
            <div className="grid gap-4 py-4">
              {/* Organization Name */}
              <div className="grid gap-2">
                <Label htmlFor="name">{t("platform.organizations.wizard.nameLabel")} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder={t("platform.organizations.wizard.namePlaceholder")}
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name}</p>
                )}
              </div>

              {/* Country */}
              <div className="grid gap-2">
                <Label htmlFor="country">{t("platform.organizations.wizard.countryLabel")} *</Label>
                <Select
                  value={formData.country}
                  onValueChange={(value) =>
                    setFormData({ ...formData, country: value })
                  }
                >
                  <SelectTrigger className={errors.country ? "border-red-500" : ""}>
                    <SelectValue placeholder={t("platform.organizations.wizard.countryPlaceholder")} />
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
                <Label htmlFor="domain">{t("platform.organizations.wizard.domainLabel")}</Label>
                <Input
                  id="domain"
                  value={formData.domain}
                  onChange={(e) =>
                    setFormData({ ...formData, domain: e.target.value })
                  }
                  placeholder={t("platform.organizations.wizard.domainPlaceholder")}
                  className={errors.domain ? "border-red-500" : ""}
                />
                <p className="text-xs text-muted-foreground">
                  {t("platform.organizations.wizard.domainHelper")}
                </p>
                {errors.domain && (
                  <p className="text-sm text-red-500">{errors.domain}</p>
                )}
              </div>

              {/* Organization Code */}
              <div className="grid gap-2">
                <Label htmlFor="organizationCode">{t("platform.organizations.wizard.organizationCodeLabel")}</Label>
                <Input
                  id="organizationCode"
                  value={formData.organizationCode}
                  onChange={(e) =>
                    setFormData({ ...formData, organizationCode: e.target.value })
                  }
                  placeholder={t("platform.organizations.wizard.organizationCodePlaceholder")}
                />
                <p className="text-xs text-muted-foreground">
                  {t("platform.organizations.wizard.organizationCodeHelper")}
                </p>
              </div>

              {/* Tenant ID */}
              <div className="grid gap-2">
                <Label htmlFor="tenantId">{t("platform.organizations.wizard.tenantIdLabel")}</Label>
                <Input
                  id="tenantId"
                  value={formData.tenantId}
                  onChange={(e) =>
                    setFormData({ ...formData, tenantId: e.target.value })
                  }
                  placeholder={t("platform.organizations.wizard.tenantIdPlaceholder")}
                />
                <p className="text-xs text-muted-foreground">
                  {t("platform.organizations.wizard.tenantIdHelper")}
                </p>
              </div>

              {/* Status */}
              <div className="grid gap-2">
                <Label htmlFor="status">{t("platform.organizations.wizard.statusLabel")}</Label>
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
                    <SelectItem value="active">{t("common.active")}</SelectItem>
                    <SelectItem value="inactive">{t("common.inactive")}</SelectItem>
                    <SelectItem value="suspended">{t("common.suspended")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </div>
          ) : currentStep === 2 ? (
            <div className="grid gap-4 py-4">
              {/* Primary Admin Section */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-2">{t("platform.organizations.wizard.adminSectionTitle")}</h3>
                <p className="text-xs text-muted-foreground">
                  {mode === "create"
                    ? t("platform.organizations.wizard.adminSectionDescCreate")
                    : t("platform.organizations.wizard.adminSectionDescEdit")}
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="adminName">{t("platform.organizations.wizard.adminNameLabel")} *</Label>
                <Input
                  id="adminName"
                  value={formData.adminName}
                  onChange={(e) =>
                    setFormData({ ...formData, adminName: e.target.value })
                  }
                  placeholder={t("platform.organizations.wizard.adminNamePlaceholder")}
                  className={errors.adminName ? "border-red-500" : ""}
                />
                {errors.adminName && (
                  <p className="text-sm text-red-500">{errors.adminName}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="adminEmail">{t("platform.organizations.wizard.adminEmailLabel")} *</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, adminEmail: e.target.value })
                  }
                  placeholder={t("platform.organizations.wizard.adminEmailPlaceholder")}
                  className={errors.adminEmail ? "border-red-500" : ""}
                />
                {errors.adminEmail && (
                  <p className="text-sm text-red-500">{errors.adminEmail}</p>
                )}
              </div>

              {/* Admin Role */}
              <div className="grid gap-2">
                <Label htmlFor="adminRole">{t("platform.organizations.wizard.roleLabel")}</Label>
                <Input
                  id="adminRole"
                  value={t("platform.organizations.wizard.organizationAdminRole")}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  {t("platform.organizations.wizard.roleDescription")}
                </p>
              </div>

              {/* Secondary Admin Section (Optional) */}
              <div className="border-t pt-4 mt-2">
                <h3 className="text-sm font-semibold mb-2">{t("platform.organizations.wizard.secondaryAdminSectionTitle")}</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  {t("platform.organizations.wizard.secondaryAdminSectionDesc")}
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="secondaryAdminName">{t("platform.organizations.wizard.secondaryAdminNameLabel")}</Label>
                <Input
                  id="secondaryAdminName"
                  value={formData.secondaryAdminName}
                  onChange={(e) =>
                    setFormData({ ...formData, secondaryAdminName: e.target.value })
                  }
                  placeholder={t("platform.organizations.wizard.secondaryAdminNamePlaceholder")}
                  className={errors.secondaryAdminName ? "border-red-500" : ""}
                />
                {errors.secondaryAdminName && (
                  <p className="text-sm text-red-500">{errors.secondaryAdminName}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="secondaryAdminEmail">{t("platform.organizations.wizard.secondaryAdminEmailLabel")}</Label>
                <Input
                  id="secondaryAdminEmail"
                  type="email"
                  value={formData.secondaryAdminEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, secondaryAdminEmail: e.target.value })
                  }
                  placeholder={t("platform.organizations.wizard.secondaryAdminEmailPlaceholder")}
                  className={errors.secondaryAdminEmail ? "border-red-500" : ""}
                />
                {errors.secondaryAdminEmail && (
                  <p className="text-sm text-red-500">{errors.secondaryAdminEmail}</p>
                )}
              </div>

              {/* Secondary Admin Role (same as primary) */}
              <div className="grid gap-2">
                <Label htmlFor="secondaryAdminRole">{t("platform.organizations.wizard.roleLabel")}</Label>
                <Input
                  id="secondaryAdminRole"
                  value={t("platform.organizations.wizard.organizationAdminRole")}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  {t("platform.organizations.wizard.roleDescription")}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 py-4">
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-2">{t("platform.organizations.wizard.ouSectionTitle")}</h3>
                <p className="text-xs text-muted-foreground">
                  {t("platform.organizations.wizard.ouSectionDesc")}
                </p>
              </div>

              {/* Add/Edit OU Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {editingOUIndex !== null ? t("platform.organizations.wizard.editOuCardTitle") : t("platform.organizations.wizard.addOuCardTitle")}
                  </CardTitle>
                  <CardDescription>
                    {t("platform.organizations.wizard.addOuCardDesc")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="ouName">{t("platform.organizations.wizard.ouNameLabel")} *</Label>
                    <Input
                      id="ouName"
                      value={newOU.name}
                      onChange={(e) =>
                        setNewOU({ ...newOU, name: e.target.value })
                      }
                      placeholder={t("platform.organizations.wizard.ouNamePlaceholder")}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="ouType">{t("platform.organizations.wizard.ouTypeLabel")} *</Label>
                    <Select
                      value={newOU.type}
                      onValueChange={(value: "hq" | "regional" | "field") =>
                        setNewOU({ ...newOU, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("platform.organizations.wizard.ouTypePlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hq">{t("platform.organizations.wizard.ouTypeHq")}</SelectItem>
                        <SelectItem value="regional">{t("platform.organizations.wizard.ouTypeRegional")}</SelectItem>
                        <SelectItem value="field">{t("platform.organizations.wizard.ouTypeField")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="ouCountry">{t("platform.organizations.wizard.ouCountryLabel")} *</Label>
                    <Select
                      value={newOU.country}
                      onValueChange={(value) =>
                        setNewOU({ ...newOU, country: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("platform.organizations.wizard.ouCountryPlaceholder")} />
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
                          <Edit2 className="mr-2 h-4 w-4" />
                          {t("platform.organizations.wizard.updateOuButton")}
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          {t("platform.organizations.wizard.addOuButton")}
                        </>
                      )}
                    </Button>
                    {editingOUIndex !== null && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancelEdit}
                      >
                        {t("platform.organizations.wizard.cancelEditButton")}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* OU List */}
              {operatingUnits.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">
                    {t("platform.organizations.wizard.addedOusTitle", { count: operatingUnits.length })}
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
                  <p className="text-sm">{t("platform.organizations.wizard.noOusMessage")}</p>
                  <p className="text-xs mt-1">{t("platform.organizations.wizard.noOusHelper")}</p>
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
                disabled={isLoading}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                {t("platform.organizations.wizard.backButton")}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {t("platform.organizations.wizard.cancelButton")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {currentStep === 1 ? (
                <>
                  {t("platform.organizations.wizard.nextAdminsButton")}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              ) : currentStep === 2 ? (
                <>
                  {t("platform.organizations.wizard.nextOusButton")}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              ) : mode === "create" ? (
                t("platform.organizations.wizard.createButton")
              ) : (
                t("platform.organizations.wizard.updateButton")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
