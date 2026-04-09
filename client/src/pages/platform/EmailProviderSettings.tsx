import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertCircle, Check, Eye, EyeOff, Loader2, Mail, Plus, Trash2, TestTube } from "lucide-react";
import { toast } from "sonner";

interface ProviderConfig {
  id: number;
  provider: "sendgrid" | "mailgun" | "aws_ses";
  apiKey: string;
  mailgunDomain?: string;
  awsRegion?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  webhookUrl?: string;
  webhookSigningKey?: string;
  isActive: boolean;
  isVerified: boolean;
  lastTestAt?: string;
  lastTestStatus?: "success" | "failed";
  lastTestError?: string;
}

export default function EmailProviderSettings() {
  const { user } = useAuth();
  const [selectedOrg, setSelectedOrg] = useState<number | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    provider: "sendgrid" as const,
    apiKey: "",
    mailgunDomain: "",
    awsRegion: "us-east-1",
    awsAccessKeyId: "",
    awsSecretAccessKey: "",
  });

  // Get all configs
  const { data: configs, isLoading: configsLoading, refetch } = trpc.emailProviderConfig.getAll.useQuery(
    { organizationId: selectedOrg || 0 },
    { enabled: !!selectedOrg }
  );

  // Create mutation
  const createMutation = trpc.emailProviderConfig.create.useMutation({
    onSuccess: () => {
      toast.success("Provider configuration created successfully");
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create configuration");
    },
  });

  // Update mutation
  const updateMutation = trpc.emailProviderConfig.update.useMutation({
    onSuccess: () => {
      toast.success("Provider configuration updated successfully");
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update configuration");
    },
  });

  // Delete mutation
  const deleteMutation = trpc.emailProviderConfig.delete.useMutation({
    onSuccess: () => {
      toast.success("Provider configuration deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete configuration");
    },
  });

  // Test connection mutation
  const testMutation = trpc.emailProviderConfig.testConnection.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to test connection");
    },
  });

  const resetForm = () => {
    setFormData({
      provider: "sendgrid",
      apiKey: "",
      mailgunDomain: "",
      awsRegion: "us-east-1",
      awsAccessKeyId: "",
      awsSecretAccessKey: "",
    });
    setIsCreating(false);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!selectedOrg) {
      toast.error("Please select an organization");
      return;
    }

    if (!formData.apiKey) {
      toast.error("API key is required");
      return;
    }

    if (formData.provider === "mailgun" && !formData.mailgunDomain) {
      toast.error("Mailgun domain is required");
      return;
    }

    if (formData.provider === "aws_ses") {
      if (!formData.awsAccessKeyId || !formData.awsSecretAccessKey) {
        toast.error("AWS credentials are required");
        return;
      }
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          organizationId: selectedOrg,
          ...formData,
        });
      } else {
        await createMutation.mutateAsync({
          organizationId: selectedOrg,
          ...formData,
        });
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  const handleEdit = (config: ProviderConfig) => {
    setFormData({
      provider: config.provider,
      apiKey: "",
      mailgunDomain: config.mailgunDomain || "",
      awsRegion: config.awsRegion || "us-east-1",
      awsAccessKeyId: "",
      awsSecretAccessKey: "",
    });
    setEditingId(config.id);
    setIsCreating(true);
  };

  const handleDelete = (id: number) => {
    if (!selectedOrg) return;
    if (confirm("Are you sure you want to delete this configuration?")) {
      deleteMutation.mutate({ id, organizationId: selectedOrg });
    }
  };

  const handleTest = (id: number) => {
    if (!selectedOrg) return;
    testMutation.mutate({ id, organizationId: selectedOrg });
  };

  const togglePasswordVisibility = (id: number) => {
    setShowPasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (!user?.organizationIds || user.organizationIds.length === 0) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
        <p className="text-muted-foreground">No organizations available</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Email Provider Configuration</h1>
        <p className="text-muted-foreground">
          Manage API keys and settings for SendGrid, Mailgun, and AWS SES
        </p>
      </div>

      {/* Organization Selector */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedOrg?.toString() || ""} onValueChange={(val) => setSelectedOrg(parseInt(val))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose an organization" />
            </SelectTrigger>
            <SelectContent>
              {user.organizationIds.map((orgId) => (
                <SelectItem key={orgId} value={orgId.toString()}>
                  Organization {orgId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedOrg && (
        <>
          {/* Create/Edit Form */}
          {isCreating && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{editingId ? "Edit Provider Configuration" : "Add New Provider"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Email Provider</Label>
                  <Select
                    value={formData.provider}
                    onValueChange={(val) =>
                      setFormData({ ...formData, provider: val as "sendgrid" | "mailgun" | "aws_ses" })
                    }
                    disabled={!!editingId}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sendgrid">SendGrid</SelectItem>
                      <SelectItem value="mailgun">Mailgun</SelectItem>
                      <SelectItem value="aws_ses">AWS SES</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* SendGrid */}
                {formData.provider === "sendgrid" && (
                  <div className="space-y-2">
                    <Label>SendGrid API Key</Label>
                    <Input
                      type="password"
                      placeholder="SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      value={formData.apiKey}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Get your API key from SendGrid dashboard → Settings → API Keys
                    </p>
                  </div>
                )}

                {/* Mailgun */}
                {formData.provider === "mailgun" && (
                  <>
                    <div className="space-y-2">
                      <Label>Mailgun Domain</Label>
                      <Input
                        placeholder="mail.example.com"
                        value={formData.mailgunDomain}
                        onChange={(e) => setFormData({ ...formData, mailgunDomain: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">Your verified Mailgun domain</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Mailgun API Key</Label>
                      <Input
                        type="password"
                        placeholder="key-xxxxxxxxxxxxxxxxxxxxxxxx"
                        value={formData.apiKey}
                        onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Get your API key from Mailgun dashboard → Settings → API Security
                      </p>
                    </div>
                  </>
                )}

                {/* AWS SES */}
                {formData.provider === "aws_ses" && (
                  <>
                    <div className="space-y-2">
                      <Label>AWS Region</Label>
                      <Select value={formData.awsRegion} onValueChange={(val) => setFormData({ ...formData, awsRegion: val })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                          <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                          <SelectItem value="eu-west-1">EU (Ireland)</SelectItem>
                          <SelectItem value="eu-central-1">EU (Frankfurt)</SelectItem>
                          <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>AWS Access Key ID</Label>
                      <Input
                        type="password"
                        placeholder="AKIAIOSFODNN7EXAMPLE"
                        value={formData.awsAccessKeyId}
                        onChange={(e) => setFormData({ ...formData, awsAccessKeyId: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>AWS Secret Access Key</Label>
                      <Input
                        type="password"
                        placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                        value={formData.awsSecretAccessKey}
                        onChange={(e) => setFormData({ ...formData, awsSecretAccessKey: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Create IAM user with SES permissions in AWS Console
                      </p>
                    </div>
                  </>
                )}

                <div className="flex gap-2">
                  <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                    {createMutation.isPending || updateMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        {editingId ? "Update" : "Create"}
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Configurations List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Active Configurations</CardTitle>
                <CardDescription>Manage your email provider credentials</CardDescription>
              </div>
              {!isCreating && (
                <Button onClick={() => setIsCreating(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Provider
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {configsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : configs && configs.length > 0 ? (
                <div className="space-y-4">
                  {configs.map((config) => (
                    <div key={config.id} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Mail className="w-5 h-5 text-blue-500" />
                          <div>
                            <h3 className="font-semibold capitalize">{config.provider}</h3>
                            {config.provider === "mailgun" && config.mailgunDomain && (
                              <p className="text-sm text-muted-foreground">{config.mailgunDomain}</p>
                            )}
                            {config.provider === "aws_ses" && config.awsRegion && (
                              <p className="text-sm text-muted-foreground">{config.awsRegion}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {config.isVerified ? (
                            <div className="flex items-center gap-1 text-green-600 text-sm">
                              <Check className="w-4 h-4" />
                              Verified
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-yellow-600 text-sm">
                              <AlertCircle className="w-4 h-4" />
                              Not Verified
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-muted p-3 rounded space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">API Key:</span>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-background px-2 py-1 rounded">
                              {showPasswords[config.id] ? config.apiKey : "••••••••••••••••"}
                            </code>
                            <button
                              onClick={() => togglePasswordVisibility(config.id)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              {showPasswords[config.id] ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                        {config.lastTestAt && (
                          <p className="text-xs text-muted-foreground">
                            Last tested: {new Date(config.lastTestAt).toLocaleString()}
                          </p>
                        )}
                        {config.lastTestError && (
                          <p className="text-xs text-red-600">Error: {config.lastTestError}</p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTest(config.id)}
                          disabled={testMutation.isPending}
                        >
                          <TestTube className="w-4 h-4 mr-2" />
                          Test Connection
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(config)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(config.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground mb-4">No provider configurations yet</p>
                  <Button onClick={() => setIsCreating(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Provider
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}