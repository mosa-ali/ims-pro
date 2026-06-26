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
  countryId: number | null;
  organizationId: number | null;
  officeAdminName: string;
  officeAdminEmail: string;
  officeAdminRole: "organization_admin" | "user";
}

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
 const { language, isRTL} = useLanguage();
  const { t } = useTranslation();
const utils = trpc.useUtils();

const [formData, setFormData] = useState<FormData>({
  name: "",
  type: "field",
  countryId: null,
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

  const { data: countries = [] } =
  trpc.organization.getCountries.useQuery();

 // Initialize form data when modal opens or mode/unit changes
 useEffect(() => {
 if (!open) return;
 
 if (mode === "edit" && operatingUnit) {
 setFormData({
  name: operatingUnit.name,
  type: operatingUnit.type as
    | "hq"
    | "country"
    | "regional"
    | "field",

  countryId:
    operatingUnit.countryId ?? null,

  organizationId:
    operatingUnit.organizationId,

  officeAdminName:
    operatingUnit.officeAdminName || "",

  officeAdminEmail:
    operatingUnit.officeAdminEmail || "",

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
 toast.error(error?.shape?.message || error.message);
 },
 });

 const updateMutation = trpc.ims.operatingUnits.update.useMutation({
 onSuccess: () => {
 toast.success("Operating Unit updated successfully");
 utils.ims.operatingUnits.listByOrganization.invalidate();
 onOpenChange(false);
 },
 onError: (error) => {
 toast.error(error?.shape?.message || error.message);
 },
 });

 const validateForm = (): boolean => {
 const newErrors: Partial<Record<keyof FormData, string>> = {};

 if (!formData.name.trim()) {
 newErrors.name = "Operating Unit name is required";
 }

 if (
  formData.type !== "hq" &&
  !formData.countryId
) {
  newErrors.countryId =
    "Country is required";
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

  country: countries.find(
    c => c.id === formData.countryId
  )?.name ?? "",

  organizationId:
    formData.organizationId!,

  officeAdminName:
    formData.officeAdminName.trim() ||
    undefined,

  officeAdminEmail:
    formData.officeAdminEmail.trim() ||
    undefined,

  officeAdminRole:
    formData.officeAdminRole,
});
 } else if (mode === "edit" && operatingUnitId) {
 updateMutation.mutate({
  id: operatingUnitId,
  name: formData.name.trim(),
  type: formData.type,
  countryId: formData.countryId ?? undefined,
  officeAdminName:
    formData.officeAdminName.trim() ||
    undefined,
  officeAdminEmail:
    formData.officeAdminEmail.trim() ||
    undefined,
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
 ? t.operatingUnitFormModal.createOperatingUnit
 : t.operatingUnitFormModal.editOperatingUnit}
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
 {t.operatingUnitFormModal.unitName} *
 </Label>
 <Input
 id="name"
 value={formData.name}
 onChange={(e) =>
 setFormData({ ...formData, name: e.target.value })
 }
 placeholder={t.placeholders.eGYemenFieldOffice}
 className={errors.name ? "border-red-500" : ""}
 />
 {errors.name && (
 <p className="text-sm text-red-500">{errors.name}</p>
 )}
 </div>

 {/* Organization Selector */}
 <div className="grid gap-2">
 <Label htmlFor="organization">
 {t.operatingUnitFormModal.organization} *
 </Label>
 <Select
 value={formData.organizationId?.toString() || ""}
 onValueChange={(value) =>
 setFormData({ ...formData, organizationId: parseInt(value) })
 }
 >
 <SelectTrigger className={errors.organizationId ? "border-red-500" : ""}>
 <SelectValue placeholder={t.placeholders.selectOrganization} />
 </SelectTrigger>
 <SelectContent>
  {countries.map((country) => (
    <SelectItem
      key={country.id}
      value={country.name}
    >
      {language === "ar"
        ? country.arabicName
        : country.name}
    </SelectItem>
  ))}
</SelectContent>
</Select>

{errors.organizationId && (
  <p className="text-sm text-red-500">
    {errors.organizationId}
  </p>
)}
</div>

{/* Type */}
<div className="grid gap-2">
  <Label htmlFor="type">
    {t.operatingUnitFormModal.unitType}
  </Label>

  <Select
    value={formData.type}
    onValueChange={(
      value:
        | "hq"
        | "country"
        | "regional"
        | "field"
    ) =>
      setFormData({
        ...formData,
        type: value,
      })
    }
  >
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>

    <SelectContent>
      {OU_TYPES.map((type) => (
        <SelectItem
          key={type.value}
          value={type.value}
        >
          {type.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

{/* Country */}
{formData.type !== "hq" && (
  <div className="grid gap-2">
    <Label htmlFor="countryId">
      {t.operatingUnitFormModal.unitCountry} *
    </Label>

    <Select
      value={
        formData.countryId?.toString() || ""
      }
      onValueChange={(value) =>
        setFormData({
          ...formData,
          countryId: Number(value),
        })
      }
    >
      <SelectTrigger
        className={
          errors.countryId
            ? "border-red-500"
            : ""
        }
      >
        <SelectValue
          placeholder={
            t.placeholders.selectCountry
          }
        />
      </SelectTrigger>

      <SelectContent>
        {countries.map((country) => (
          <SelectItem
            key={country.id}
            value={country.id.toString()}
          >
            {language === "ar"
              ? country.arabicName
              : country.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    {errors.countryId && (
      <p className="text-sm text-red-500">
        {errors.countryId}
      </p>
    )}
  </div>
)}

{/* Office Admin Name */}
<div className="grid gap-2">
  <Label htmlFor="officeAdminName">
    {t.operatingUnitFormModal.officeAdminName}
  </Label>

  <Input
    id="officeAdminName"
    type="text"
    value={formData.officeAdminName}
    onChange={(e) =>
      setFormData({
        ...formData,
        officeAdminName: e.target.value,
      })
    }
    placeholder={
      t.operatingUnitFormModal
        .officeAdminNamePlaceholder
    }
  />
</div>

{/* Office Admin Email */}
<div className="grid gap-2">
  <Label htmlFor="officeAdminEmail">
    {t.operatingUnitFormModal.officeAdminEmail}
  </Label>

  <Input
    id="officeAdminEmail"
    type="email"
    value={formData.officeAdminEmail}
    onChange={(e) =>
      setFormData({
        ...formData,
        officeAdminEmail: e.target.value,
      })
    }
    placeholder={
      t.operatingUnitFormModal
        .officeAdminEmailPlaceholder
    }
    className={
      errors.officeAdminEmail
        ? "border-red-500"
        : ""
    }
  />

  {errors.officeAdminEmail && (
    <p className="text-sm text-red-500">
      {errors.officeAdminEmail}
    </p>
  )}
</div>

{/* Office Admin Role */}
<div className="grid gap-2">
  <Label htmlFor="officeAdminRole">
    Office Admin Role
  </Label>

  <Select
    value={formData.officeAdminRole}
    onValueChange={(
      value:
        | "organization_admin"
        | "user"
    ) =>
      setFormData({
        ...formData,
        officeAdminRole: value,
      })
    }
  >
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>

    <SelectContent>
      <SelectItem value="user">
        User
      </SelectItem>

      <SelectItem value="organization_admin">
        Organization Admin
      </SelectItem>
    </SelectContent>
  </Select>

  <p className="text-xs text-muted-foreground">
    Organization Admins can manage users and
    settings for this operating unit.
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
    {t.operatingUnitFormModal.cancel}
  </Button>

  <Button
    type="submit"
    disabled={isLoading}
  >
    {isLoading && (
      <Loader2 className="me-2 h-4 w-4 animate-spin" />
    )}

    {mode === "create"
      ? t.operatingUnitFormModal.create
      : t.operatingUnitFormModal.update}
  </Button>
</DialogFooter>
</form>
</DialogContent>
</Dialog>
);
}