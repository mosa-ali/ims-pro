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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface OperatingUnitFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operatingUnitId?: number;
  mode: "create" | "edit";
  organizationId?: number; // Pre-select organization when creating from Organization Detail page
}

interface FormData {
  name: string;
  type: "hq" | "country" | "regional" | "field";
  country: string;
  organizationId: number | null;
  officeAdminName: string;
  officeAdminEmail: string;
  officeAdminRole: "organization_admin" | "user";
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

const OU_TYPES = [
  { value: "hq", label: "Headquarters" },
  { value: "country", label: "Country Office" },
  { value: "regional", label: "Regional Office" },
  { value: "field", label: "Field Office" },
];

export function OperatingUnitFormModal({
  open,
  onOpenChange,
  operatingUnitId,
  mode,
  organizationId: preSelectedOrgId,
}: OperatingUnitFormModalProps) {
  const { t } = useTranslation();
  const utils = trpc.useUtils();

  const [formData, setFormData] = useState<FormData>({
    name: "",
    type: "field",
    country: "",
    organizationId: null,
    officeAdminName: "",
    officeAdminEmail: "",
    officeAdminRole: "user",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  // Fetch organizations for selector
  const { data: organizations = [] } = trpc.ims.organizations.list.useQuery();

  // Fetch operating unit data for edit mode
  const { data: operatingUnit } = trpc.ims.operatingUnits.getById.useQuery(
    { id: operatingUnitId! },
    {
      enabled: mode === "edit" && !!operatingUnitId,
    }
  );

  // Initialize form data when modal opens or mode/unit changes
  useEffect(() => {
    if (!open) return;
    
    if (mode === "edit" && operatingUnit) {
      setFormData({
        name: operatingUnit.name,
        type: operatingUnit.type as "hq" | "country" | "regional" | "field",
        country: operatingUnit.country || "",
        organizationId: operatingUnit.organizationId,
        officeAdminName: operatingUnit.officeAdminName || "",
        officeAdminEmail: operatingUnit.officeAdminEmail || "",
        officeAdminRole: "user", // Default for edit mode
      });
    } else if (mode === "create") {
      setFormData({
        name: "",
        type: "field",
        country: "",
        organizationId: preSelectedOrgId || organizations[0]?.id || null,
        officeAdminName: "",
        officeAdminEmail: "",
        officeAdminRole: "user",
      });
    }
    setErrors({});
  }, [mode, operatingUnit, open]); // Removed organizations from deps to prevent infinite re-renders

  const createMutation = trpc.ims.operatingUnits.create.useMutation({
    onSuccess: () => {
      toast.success("Operating Unit created successfully");
      utils.ims.operatingUnits.listByOrganization.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = trpc.ims.operatingUnits.update.useMutation({
    onSuccess: () => {
      toast.success("Operating Unit updated successfully");
      utils.ims.operatingUnits.listByOrganization.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Operating Unit name is required";
    }

    if (!formData.country.trim()) {
      newErrors.country = "Country is required";
    }

    if (!formData.organizationId) {
      newErrors.organizationId = "Organization is required";
    }

    // Validate email if provided
    if (formData.officeAdminEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.officeAdminEmail)) {
        newErrors.officeAdminEmail = "Invalid email format";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (mode === "create") {
      createMutation.mutate({
        name: formData.name.trim(),
        type: formData.type,
        country: formData.country.trim(),
        organizationId: formData.organizationId!,
        officeAdminName: formData.officeAdminName.trim() || undefined,
        officeAdminEmail: formData.officeAdminEmail.trim() || undefined,
        officeAdminRole: formData.officeAdminRole,
      });
    } else if (mode === "edit" && operatingUnitId) {
      updateMutation.mutate({
        id: operatingUnitId,
        name: formData.name.trim(),
        type: formData.type,
        country: formData.country.trim(),
        officeAdminName: formData.officeAdminName.trim() || undefined,
        officeAdminEmail: formData.officeAdminEmail.trim() || undefined,
      });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create"
              ? t("platform.operatingUnits.createOperatingUnit")
              : t("platform.operatingUnits.editOperatingUnit")}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new operating unit within an organization"
              : "Update operating unit details and settings"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Operating Unit Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">
                {t("platform.operatingUnits.unitName")} *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Yemen Field Office"
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            {/* Organization Selector */}
            <div className="grid gap-2">
              <Label htmlFor="organization">
                {t("common.organization")} *
              </Label>
              <Select
                value={formData.organizationId?.toString() || ""}
                onValueChange={(value) =>
                  setFormData({ ...formData, organizationId: parseInt(value) })
                }
              >
                <SelectTrigger className={errors.organizationId ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id.toString()}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.organizationId && (
                <p className="text-sm text-red-500">{errors.organizationId}</p>
              )}
            </div>

            {/* Type */}
            <div className="grid gap-2">
              <Label htmlFor="type">
                {t("platform.operatingUnits.unitType")}
              </Label>
              <Select
                value={formData.type}
                onValueChange={(value: "hq" | "country" | "regional" | "field") =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OU_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Country */}
            <div className="grid gap-2">
              <Label htmlFor="country">
                {t("platform.operatingUnits.unitCountry")} *
              </Label>
              <Select
                value={formData.country}
                onValueChange={(value) =>
                  setFormData({ ...formData, country: value })
                }
              >
                <SelectTrigger className={errors.country ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select country" />
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

            {/* Office Admin Name */}
            <div className="grid gap-2">
              <Label htmlFor="officeAdminName">
                {t("platform.operatingUnits.officeAdminName")}
              </Label>
              <Input
                id="officeAdminName"
                type="text"
                value={formData.officeAdminName}
                onChange={(e) =>
                  setFormData({ ...formData, officeAdminName: e.target.value })
                }
                placeholder={t("platform.operatingUnits.officeAdminNamePlaceholder")}
              />
            </div>

            {/* Office Admin Email */}
            <div className="grid gap-2">
              <Label htmlFor="officeAdminEmail">
                {t("platform.operatingUnits.officeAdminEmail")}
              </Label>
              <Input
                id="officeAdminEmail"
                type="email"
                value={formData.officeAdminEmail}
                onChange={(e) =>
                  setFormData({ ...formData, officeAdminEmail: e.target.value })
                }
                placeholder={t("platform.operatingUnits.officeAdminEmailPlaceholder")}
                className={errors.officeAdminEmail ? "border-red-500" : ""}
              />
              {errors.officeAdminEmail && (
                <p className="text-sm text-red-500">{errors.officeAdminEmail}</p>
              )}
            </div>

            {/* Office Admin Role */}
            <div className="grid gap-2">
              <Label htmlFor="officeAdminRole">
                Office Admin Role
              </Label>
              <Select
                value={formData.officeAdminRole}
                onValueChange={(value: "organization_admin" | "user") =>
                  setFormData({ ...formData, officeAdminRole: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="organization_admin">Organization Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Organization Admins can manage users and settings for this operating unit
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? t("common.create") : t("common.update")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
