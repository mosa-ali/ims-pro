import { useState } from "react";
import { useTranslation } from "@/i18n/useTranslation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Edit2, Trash2, Check, X, Eye } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface EmailTemplate {
  id: number;
  organizationId: number;
  templateKey: string;
  name: string;
  nameAr?: string;
  subject?: string;
  subjectAr?: string;
  bodyHtml?: string;
  bodyHtmlAr?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TemplateFormData {
  templateKey: string;
  name: string;
  nameAr: string;
  subject: string;
  subjectAr: string;
  bodyHtml: string;
  bodyHtmlAr: string;
}

export default function EmailTemplateManagement() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [organizationId, setOrganizationId] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<TemplateFormData>({
    templateKey: "",
    name: "",
    nameAr: "",
    subject: "",
    subjectAr: "",
    bodyHtml: "",
    bodyHtmlAr: "",
  });

  // Get organization ID from localStorage (set by OrganizationContext)
  const orgIdFromStorage = localStorage.getItem("pms_current_org");

  // Fetch templates
  const { data: templates, isLoading, refetch } = trpc.emailTemplate.list.useQuery(
    { organizationId: organizationId || parseInt(orgIdFromStorage || "0") },
    { enabled: !!(organizationId || orgIdFromStorage) }
  );

  // Mutations
  const createMutation = trpc.emailTemplate.create.useMutation({
    onSuccess: () => {
      toast.success(t.emailTemplate?.createSuccess || "Template created successfully");
      setIsDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create template");
    },
  });

  const updateMutation = trpc.emailTemplate.update.useMutation({
    onSuccess: () => {
      toast.success(t.emailTemplate?.updateSuccess || "Template updated successfully");
      setIsDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update template");
    },
  });

  const deleteMutation = trpc.emailTemplate.delete.useMutation({
    onSuccess: () => {
      toast.success(t.emailTemplate?.deleteSuccess || "Template deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete template");
    },
  });

  const resetForm = () => {
    setFormData({
      templateKey: "",
      name: "",
      nameAr: "",
      subject: "",
      subjectAr: "",
      bodyHtml: "",
      bodyHtmlAr: "",
    });
    setSelectedTemplate(null);
    setIsEditing(false);
  };

  const handleOpenDialog = (template?: EmailTemplate) => {
    if (template) {
      setSelectedTemplate(template);
      setIsEditing(true);
      setFormData({
        templateKey: template.templateKey,
        name: template.name,
        nameAr: template.nameAr || "",
        subject: template.subject || "",
        subjectAr: template.subjectAr || "",
        bodyHtml: template.bodyHtml || "",
        bodyHtmlAr: template.bodyHtmlAr || "",
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const currentOrgId = organizationId || parseInt(orgIdFromStorage || "0");
    if (!currentOrgId) {
      toast.error("Organization not selected");
      return;
    }

    if (!formData.templateKey || !formData.name) {
      toast.error("Template key and name are required");
      return;
    }

    if (isEditing && selectedTemplate) {
      await updateMutation.mutateAsync({
        templateId: selectedTemplate.id,
        name: formData.name,
        nameAr: formData.nameAr || undefined,
        subject: formData.subject || undefined,
        subjectAr: formData.subjectAr || undefined,
        bodyHtml: formData.bodyHtml || undefined,
        bodyHtmlAr: formData.bodyHtmlAr || undefined,
      });
    } else {
      await createMutation.mutateAsync({
        organizationId: currentOrgId,
        templateKey: formData.templateKey,
        name: formData.name,
        nameAr: formData.nameAr || undefined,
        subject: formData.subject || undefined,
        subjectAr: formData.subjectAr || undefined,
        bodyHtml: formData.bodyHtml || undefined,
        bodyHtmlAr: formData.bodyHtmlAr || undefined,
      });
    }
  };

  const handleDelete = async (templateId: number) => {
    if (confirm(t.emailTemplate?.confirmDelete || "Are you sure you want to delete this template?")) {
      await deleteMutation.mutateAsync({ templateId });
    }
  };

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewLanguage, setPreviewLanguage] = useState<'en' | 'ar'>('en');

  const handlePreview = () => {
    if (!formData.bodyHtml && !formData.bodyHtmlAr) {
      toast.error("Please enter email body content to preview");
      return;
    }
    setIsPreviewOpen(true);
  };

  const getPreviewContent = () => {
    if (previewLanguage === 'ar') {
      return {
        subject: formData.subjectAr || "(No subject provided)",
        body: formData.bodyHtmlAr || "<p>(No content provided)</p>",
      };
    }
    return {
      subject: formData.subject || "(No subject provided)",
      body: formData.bodyHtml || "<p>(No content provided)</p>",
    };
  };

  const currentOrgId = organizationId || parseInt(orgIdFromStorage || "0");

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/platform/settings")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t.common?.back || "Back"}
          </Button>
          <h1 className="text-3xl font-bold text-foreground">
            {t.emailTemplate?.title || "Email Template Management"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t.emailTemplate?.description || "Customize email templates for your organization"}
          </p>
        </div>

        {/* Main Content */}
        <div className="grid gap-6">
          {/* Create Button */}
          <div className="flex justify-end">
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              {t.emailTemplate?.createNew || "Create New Template"}
            </Button>
          </div>

          {/* Templates Table */}
          <Card>
            <CardHeader>
              <CardTitle>{t.emailTemplate?.templates || "Email Templates"}</CardTitle>
              <CardDescription>
                {t.emailTemplate?.templatesDesc || "Manage email templates for your organization"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t.common?.loading || "Loading..."}
                </div>
              ) : !templates || templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t.emailTemplate?.noTemplates || "No templates found"}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.emailTemplate?.key || "Template Key"}</TableHead>
                        <TableHead>{t.emailTemplate?.name || "Name"}</TableHead>
                        <TableHead>{t.emailTemplate?.subject || "Subject"}</TableHead>
                        <TableHead>{t.emailTemplate?.status || "Status"}</TableHead>
                        <TableHead className="text-right">
                          {t.common?.actions || "Actions"}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templates.map((template) => (
                        <TableRow key={template.id}>
                          <TableCell className="font-mono text-sm">
                            {template.templateKey}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{template.name}</div>
                              {template.nameAr && (
                                <div className="text-sm text-muted-foreground">{template.nameAr}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate text-sm">
                              {template.subject || "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={template.isActive ? "default" : "secondary"}>
                              {template.isActive ? (
                                <Check className="mr-1 h-3 w-3" />
                              ) : (
                                <X className="mr-1 h-3 w-3" />
                              )}
                              {template.isActive
                                ? t.emailTemplate?.active || "Active"
                                : t.emailTemplate?.inactive || "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setFormData({
                                    templateKey: template.templateKey,
                                    name: template.name,
                                    nameAr: template.nameAr || "",
                                    subject: template.subject || "",
                                    subjectAr: template.subjectAr || "",
                                    bodyHtml: template.bodyHtml || "",
                                    bodyHtmlAr: template.bodyHtmlAr || "",
                                  });
                                  setPreviewLanguage('en');
                                  setIsPreviewOpen(true);
                                }}
                                title="Preview"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(template)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(template.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isEditing
                  ? t.emailTemplate?.editTemplate || "Edit Template"
                  : t.emailTemplate?.createTemplate || "Create New Template"}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? t.emailTemplate?.editTemplateDesc || "Update email template content"
                  : t.emailTemplate?.createTemplateDesc || "Create a new email template"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Template Key */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t.emailTemplate?.key || "Template Key"}
                  <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="e.g., organization_onboarding"
                  value={formData.templateKey}
                  onChange={(e) =>
                    setFormData({ ...formData, templateKey: e.target.value })
                  }
                  disabled={isEditing}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t.emailTemplate?.keyHelp || "Unique identifier for this template"}
                </p>
              </div>

              {/* English Section */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-foreground mb-3">
                  {t.emailTemplate?.englishContent || "English Content"}
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      {t.emailTemplate?.name || "Template Name"}
                      <span className="text-destructive">*</span>
                    </label>
                    <Input
                      placeholder="e.g., Organization Onboarding"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      {t.emailTemplate?.subject || "Email Subject"}
                    </label>
                    <Input
                      placeholder="e.g., Welcome to IMS - Organization Onboarding"
                      value={formData.subject}
                      onChange={(e) =>
                        setFormData({ ...formData, subject: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      {t.emailTemplate?.body || "Email Body (HTML)"}
                    </label>
                    <Textarea
                      placeholder="Enter HTML email content..."
                      value={formData.bodyHtml}
                      onChange={(e) =>
                        setFormData({ ...formData, bodyHtml: e.target.value })
                      }
                      rows={6}
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.emailTemplate?.bodyHelp ||
                        "Supports HTML tags. Use {{organizationName}}, {{adminName}}, {{link}} as placeholders"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Arabic Section */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-foreground mb-3">
                  {t.emailTemplate?.arabicContent || "Arabic Content (Optional)"}
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      {t.emailTemplate?.name || "Template Name"}
                    </label>
                    <Input
                      placeholder="e.g., إعداد المنظمة"
                      value={formData.nameAr}
                      onChange={(e) =>
                        setFormData({ ...formData, nameAr: e.target.value })
                      }
                      dir="rtl"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      {t.emailTemplate?.subject || "Email Subject"}
                    </label>
                    <Input
                      placeholder="e.g., أهلا بك في النظام"
                      value={formData.subjectAr}
                      onChange={(e) =>
                        setFormData({ ...formData, subjectAr: e.target.value })
                      }
                      dir="rtl"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      {t.emailTemplate?.body || "Email Body (HTML)"}
                    </label>
                    <Textarea
                      placeholder="أدخل محتوى البريد الإلكتروني بصيغة HTML..."
                      value={formData.bodyHtmlAr}
                      onChange={(e) =>
                        setFormData({ ...formData, bodyHtmlAr: e.target.value })
                      }
                      rows={6}
                      className="font-mono text-xs"
                      dir="rtl"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between gap-3 border-t pt-4">
                <Button
                  variant="outline"
                  onClick={handlePreview}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {t.emailTemplate?.preview || "Preview"}
                </Button>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                  >
                    {t.common?.cancel || "Cancel"}
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={
                      createMutation.isPending ||
                      updateMutation.isPending ||
                      !formData.templateKey ||
                      !formData.name
                    }
                  >
                    {isEditing
                      ? t.common?.update || "Update"
                      : t.common?.create || "Create"}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Email Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {t.emailTemplate?.preview || "Email Preview"}
              </DialogTitle>
              <DialogDescription>
                {t.emailTemplate?.previewDesc || "Preview how your email will look"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Language Toggle */}
              <div className="flex gap-2 border-b pb-4">
                <Button
                  variant={previewLanguage === 'en' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewLanguage('en')}
                >
                  English
                </Button>
                <Button
                  variant={previewLanguage === 'ar' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewLanguage('ar')}
                >
                  العربية
                </Button>
              </div>

              {/* Subject Preview */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t.emailTemplate?.subject || "Subject"}
                </label>
                <div className="bg-muted p-3 rounded-md text-sm font-medium">
                  {getPreviewContent().subject}
                </div>
              </div>

              {/* Body Preview */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t.emailTemplate?.body || "Email Body"}
                </label>
                <div
                  className="bg-white border border-border rounded-md p-4 min-h-[300px] text-sm"
                  dangerouslySetInnerHTML={{
                    __html: getPreviewContent().body,
                  }}
                />
              </div>

              {/* Close Button */}
              <div className="flex justify-end gap-3 border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsPreviewOpen(false)}
                >
                  {t.common?.close || "Close"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
