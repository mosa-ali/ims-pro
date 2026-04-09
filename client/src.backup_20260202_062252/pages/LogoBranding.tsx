import React, { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/layouts/DashboardLayoutNew";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Palette, Upload, Save, Image as ImageIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function LogoBranding() {
  const { user } = useAuth();
  
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [brandingSettings, setBrandingSettings] = useState({
    primaryColor: "#3b82f6",
    secondaryColor: "#10b981",
    accentColor: "#f59e0b",
    logoUrl: "",
    faviconUrl: "",
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [faviconPreview, setFaviconPreview] = useState<string>("");

  // Fetch all organizations
  const { data: organizations, isLoading: orgsLoading } = trpc.organizations.list.useQuery();

  // Set default organization when organizations load
  useEffect(() => {
    if (organizations && organizations.length > 0 && !selectedOrgId) {
      setSelectedOrgId(organizations[0].id);
    }
  }, [organizations, selectedOrgId]);

  // Load branding settings when organization changes
  const { data: brandingData, refetch: refetchBranding } = trpc.organizations.getBranding.useQuery(
    { organizationId: selectedOrgId! },
    { enabled: !!selectedOrgId }
  );

  const updateBrandingMutation = trpc.organizations.updateBranding.useMutation({
    onSuccess: () => {
      toast.success("Branding settings saved successfully");
      refetchBranding();
    },
    onError: (error) => {
      toast.error(`Failed to save branding: ${error.message}`);
    },
  });

  useEffect(() => {
    if (brandingData) {
      setBrandingSettings({
        primaryColor: brandingData.primaryColor,
        secondaryColor: brandingData.secondaryColor,
        accentColor: brandingData.accentColor,
        logoUrl: brandingData.logoUrl,
        faviconUrl: brandingData.faviconUrl,
      });
      setLogoPreview(brandingData.logoUrl);
      setFaviconPreview(brandingData.faviconUrl);
    }
  }, [brandingData]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFaviconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFaviconFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFaviconPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveBranding = async () => {
    if (!selectedOrgId) {
      toast.error("Please select an organization");
      return;
    }
    
    // TODO: Implement file upload to S3 for logo and favicon files
    // For now, just save color settings
    updateBrandingMutation.mutate({
      organizationId: selectedOrgId,
      primaryColor: brandingSettings.primaryColor,
      secondaryColor: brandingSettings.secondaryColor,
      accentColor: brandingSettings.accentColor,
      logoUrl: brandingSettings.logoUrl,
      faviconUrl: brandingSettings.faviconUrl,
    });
  };

  const handleResetToDefault = () => {
    setBrandingSettings({
      primaryColor: "#3b82f6",
      secondaryColor: "#10b981",
      accentColor: "#f59e0b",
      logoUrl: "",
      faviconUrl: "",
    });
    setLogoFile(null);
    setFaviconFile(null);
    setLogoPreview("");
    setFaviconPreview("");
    toast.success("Branding reset to default");
  };

  if (user?.role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="container py-6">
          <Card>
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>Only administrators can access branding settings.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Palette className="h-8 w-8" />
            Logo & Branding
          </h1>
          <p className="text-muted-foreground mt-2">
            Customize your organization's visual identity and branding
          </p>
        </div>

        {/* Organization Identity */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Identity</CardTitle>
            <CardDescription>Select organization to customize branding</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="orgSelect">Organization</Label>
              {orgsLoading ? (
                <p className="text-sm text-muted-foreground mt-2">Loading organizations...</p>
              ) : (
                <select
                  id="orgSelect"
                  value={selectedOrgId || ""}
                  onChange={(e) => setSelectedOrgId(Number(e.target.value))}
                  className="w-full mt-2 px-3 py-2 border rounded-md bg-background"
                >
                  {organizations?.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Logo Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Logo & Favicon
            </CardTitle>
            <CardDescription>Upload your organization's logo and favicon</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo Upload */}
            <div className="space-y-3">
              <Label htmlFor="logo">Organization Logo</Label>
              <p className="text-sm text-muted-foreground">
                Recommended size: 200x200px, PNG or SVG format
              </p>
              <div className="flex items-center gap-4">
                <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo preview" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <Input
                    id="logo"
                    type="file"
                    accept="image/png,image/svg+xml,image/jpeg"
                    onChange={handleLogoChange}
                  />
                </div>
              </div>
            </div>

            {/* Favicon Upload */}
            <div className="space-y-3">
              <Label htmlFor="favicon">Favicon</Label>
              <p className="text-sm text-muted-foreground">
                Recommended size: 32x32px or 64x64px, ICO or PNG format
              </p>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted">
                  {faviconPreview ? (
                    <img src={faviconPreview} alt="Favicon preview" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <Input
                    id="favicon"
                    type="file"
                    accept="image/x-icon,image/png"
                    onChange={handleFaviconChange}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Color Scheme */}
        <Card>
          <CardHeader>
            <CardTitle>Color Scheme</CardTitle>
            <CardDescription>Customize the color palette for your organization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={brandingSettings.primaryColor}
                    onChange={(e) => setBrandingSettings({ ...brandingSettings, primaryColor: e.target.value })}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    type="text"
                    value={brandingSettings.primaryColor}
                    onChange={(e) => setBrandingSettings({ ...brandingSettings, primaryColor: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="secondaryColor">Secondary Color</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    id="secondaryColor"
                    type="color"
                    value={brandingSettings.secondaryColor}
                    onChange={(e) => setBrandingSettings({ ...brandingSettings, secondaryColor: e.target.value })}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    type="text"
                    value={brandingSettings.secondaryColor}
                    onChange={(e) => setBrandingSettings({ ...brandingSettings, secondaryColor: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="accentColor">Accent Color</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    id="accentColor"
                    type="color"
                    value={brandingSettings.accentColor}
                    onChange={(e) => setBrandingSettings({ ...brandingSettings, accentColor: e.target.value })}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    type="text"
                    value={brandingSettings.accentColor}
                    onChange={(e) => setBrandingSettings({ ...brandingSettings, accentColor: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border rounded-lg space-y-2">
              <p className="text-sm font-medium">Color Preview</p>
              <div className="flex gap-2">
                <div 
                  className="w-20 h-20 rounded-lg border" 
                  style={{ backgroundColor: brandingSettings.primaryColor }}
                  title="Primary"
                />
                <div 
                  className="w-20 h-20 rounded-lg border" 
                  style={{ backgroundColor: brandingSettings.secondaryColor }}
                  title="Secondary"
                />
                <div 
                  className="w-20 h-20 rounded-lg border" 
                  style={{ backgroundColor: brandingSettings.accentColor }}
                  title="Accent"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button onClick={handleSaveBranding}>
            <Save className="h-4 w-4 mr-2" />
            Save Branding Settings
          </Button>
          <Button variant="outline" onClick={handleResetToDefault}>
            Reset to Default
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
