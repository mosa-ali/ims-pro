import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Building2, Upload, X, Users } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ar", label: "العربية (Arabic)" },
];

const CURRENCIES = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "YER", label: "YER - Yemeni Rial" },
  { value: "SYP", label: "SYP - Syrian Pound" },
  { value: "IQD", label: "IQD - Iraqi Dinar" },
];

const TIMEZONES = [
  { value: "UTC", label: "UTC (GMT+0)" },
  { value: "Asia/Riyadh", label: "Asia/Riyadh (GMT+3)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GMT+4)" },
  { value: "Europe/London", label: "Europe/London (GMT+0)" },
  { value: "Europe/Paris", label: "Europe/Paris (GMT+1)" },
  { value: "America/New_York", label: "America/New_York (GMT-5)" },
];

export default function OrganizationSettings() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const orgId = parseInt(id || "0");

  const { data: org, isLoading, refetch } = trpc.organizations.getById.useQuery({ id: orgId });
  const { data: settings } = trpc.organizations.getSettings.useQuery({ organizationId: orgId });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const updateBasicMutation = trpc.organizations.updateBasicSettings.useMutation({
    onSuccess: () => {
      toast.success("Basic settings updated successfully");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update settings");
    },
  });

  const updateSystemMutation = trpc.organizations.updateSystemSettings.useMutation({
    onSuccess: () => {
      toast.success("System settings updated successfully");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update settings");
    },
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Logo file size must be less than 2MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Logo must be an image file");
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBasicSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    updateBasicMutation.mutate({
      organizationId: orgId,
      name: formData.get("name") as string,
      nameAr: formData.get("nameAr") as string || undefined,
      description: formData.get("description") as string || undefined,
      descriptionAr: formData.get("descriptionAr") as string || undefined,
      defaultLanguage: formData.get("defaultLanguage") as string,
      timezone: formData.get("timezone") as string,
      defaultCurrency: formData.get("defaultCurrency") as string,
      // TODO: Handle logo upload to S3
    });
  };

  const handleSystemSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    updateSystemMutation.mutate({
      organizationId: orgId,
      modulesEnabled: {
        finance: formData.get("moduleFinance") === "on",
        meal: formData.get("moduleMeal") === "on",
        surveys: formData.get("moduleSurveys") === "on",
        caseManagement: formData.get("moduleCaseManagement") === "on",
      },
      dataRetentionDays: parseInt(formData.get("dataRetentionDays") as string) || 365,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading organization settings...</div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-muted-foreground">Organization not found</div>
        <Button variant="outline" onClick={() => setLocation("/organizations")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Organizations
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/organizations")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Organization Settings</h1>
            <p className="text-muted-foreground">{org.name}</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => setLocation(`/organizations/${orgId}/invitations`)}
        >
          <Users className="h-4 w-4 mr-2" />
          Manage Invitations
        </Button>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList>
          <TabsTrigger value="basic">Basic Settings</TabsTrigger>
          <TabsTrigger value="system">System Settings</TabsTrigger>
        </TabsList>

        {/* Basic Settings Tab */}
        <TabsContent value="basic">
          <form onSubmit={handleBasicSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Basic Settings</CardTitle>
                <CardDescription>
                  Manage organization identity, branding, and regional preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Organization ID/Code - Read Only */}
                <div className="space-y-2">
                  <Label htmlFor="code">Organization ID</Label>
                  <Input
                    id="code"
                    name="code"
                    value={org.code || "N/A"}
                    readOnly
                    disabled
                    className="bg-muted font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    This is a unique identifier for your organization and cannot be changed.
                  </p>
                </div>

                {/* Organization Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Organization Name (English) *</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={org.name}
                      required
                      placeholder="Enter organization name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nameAr">Organization Name (Arabic)</Label>
                    <Input
                      id="nameAr"
                      name="nameAr"
                      defaultValue={org.nameAr || ""}
                      placeholder="أدخل اسم المنظمة"
                      dir="rtl"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (English)</Label>
                    <Textarea
                      id="description"
                      name="description"
                      defaultValue={org.description || ""}
                      placeholder="Brief description of the organization"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descriptionAr">Description (Arabic)</Label>
                    <Textarea
                      id="descriptionAr"
                      name="descriptionAr"
                      defaultValue={org.descriptionAr || ""}
                      placeholder="وصف موجز للمنظمة"
                      dir="rtl"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label>Organization Logo</Label>
                  <div className="flex items-center gap-4">
                    {logoPreview || org.logoUrl ? (
                      <div className="relative">
                        <img
                          src={logoPreview || org.logoUrl || ""}
                          alt="Organization logo"
                          className="h-20 w-20 object-contain border rounded-lg"
                        />
                        {logoPreview && (
                          <button
                            type="button"
                            onClick={() => {
                              setLogoFile(null);
                              setLogoPreview(null);
                            }}
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="h-20 w-20 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
                        <Building2 className="h-8 w-8" />
                      </div>
                    )}
                    <div className="flex-1">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                        id="logo-upload"
                      />
                      <Label htmlFor="logo-upload" className="cursor-pointer">
                        <div className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-accent transition-colors w-fit">
                          <Upload className="h-4 w-4" />
                          <span className="text-sm">Upload Logo</span>
                        </div>
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG up to 2MB. Recommended: 200x200px
                      </p>
                    </div>
                  </div>
                </div>

                {/* Regional Settings */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="defaultLanguage">Default Language *</Label>
                    <Select name="defaultLanguage" defaultValue={settings?.defaultLanguage || "en"}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Time Zone *</Label>
                    <Select name="timezone" defaultValue={settings?.timezone || "UTC"}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="defaultCurrency">Default Currency *</Label>
                    <Select name="defaultCurrency" defaultValue={org.defaultCurrency || "USD"}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((curr) => (
                          <SelectItem key={curr.value} value={curr.value}>
                            {curr.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/organizations")}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateBasicMutation.isPending}>
                    {updateBasicMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        {/* System Settings Tab */}
        <TabsContent value="system">
          <form onSubmit={handleSystemSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>
                  Configure modules, features, and data retention policies
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Module Toggles */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-3">Enabled Modules</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Control which modules are available for this organization
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Label htmlFor="moduleFinance" className="font-medium">Finance Module</Label>
                        <p className="text-sm text-muted-foreground">
                          Budget management, expenditure tracking, financial reports
                        </p>
                      </div>
                      <Switch
                        id="moduleFinance"
                        name="moduleFinance"
                        defaultChecked={settings?.modulesEnabled?.finance !== false}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Label htmlFor="moduleMeal" className="font-medium">MEAL Module</Label>
                        <p className="text-sm text-muted-foreground">
                          Monitoring, evaluation, accountability, and learning
                        </p>
                      </div>
                      <Switch
                        id="moduleMeal"
                        name="moduleMeal"
                        defaultChecked={settings?.modulesEnabled?.meal !== false}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Label htmlFor="moduleSurveys" className="font-medium">Surveys Module</Label>
                        <p className="text-sm text-muted-foreground">
                          Survey creation, data collection, and analysis
                        </p>
                      </div>
                      <Switch
                        id="moduleSurveys"
                        name="moduleSurveys"
                        defaultChecked={settings?.modulesEnabled?.surveys !== false}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Label htmlFor="moduleCaseManagement" className="font-medium">Case Management Module</Label>
                        <p className="text-sm text-muted-foreground">
                          Case tracking, referrals, and complaint handling
                        </p>
                      </div>
                      <Switch
                        id="moduleCaseManagement"
                        name="moduleCaseManagement"
                        defaultChecked={settings?.modulesEnabled?.caseManagement !== false}
                      />
                    </div>
                  </div>
                </div>

                {/* Data Retention */}
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <h3 className="text-lg font-medium mb-3">Data Retention</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Configure how long data is retained before archival (placeholder)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dataRetentionDays">Data Retention Period (Days)</Label>
                    <Input
                      id="dataRetentionDays"
                      name="dataRetentionDays"
                      type="number"
                      min="30"
                      max="3650"
                      defaultValue={settings?.dataRetentionDays || 365}
                      placeholder="365"
                    />
                    <p className="text-xs text-muted-foreground">
                      Number of days to retain data before archival (30-3650 days)
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/organizations")}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateSystemMutation.isPending}>
                    {updateSystemMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
