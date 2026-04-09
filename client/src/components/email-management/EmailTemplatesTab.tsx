import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Edit2, Trash2, Eye, Loader2, X } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmailTemplatePreviewModal } from "./EmailTemplatePreviewModal";

/**
 * Email Templates Tab
 * 
 * Global template governance and inventory
 * Features:
 * - View all email templates
 * - Create/edit templates
 * - Bilingual subject/body (English/Arabic)
 * - Template preview
 * - Activation/deactivation
 * - Merge tags support
 */

interface TemplateFormData {
  key: string;
  nameEn: string;
  nameAr: string;
  subjectEn: string;
  subjectAr: string;
  bodyHtmlEn: string;
  bodyHtmlAr: string;
  bodyTextEn: string;
  bodyTextAr: string;
  isActive: boolean;
}

const MERGE_TAGS = [
  { tag: "{{firstName}}", description: "Recipient first name" },
  { tag: "{{lastName}}", description: "Recipient last name" },
  { tag: "{{email}}", description: "Recipient email address" },
  { tag: "{{organizationName}}", description: "Organization name" },
  { tag: "{{organizationId}}", description: "Organization ID" },
  { tag: "{{activationLink}}", description: "Activation/onboarding link" },
  { tag: "{{resetLink}}", description: "Password reset link" },
  { tag: "{{currentYear}}", description: "Current year" },
  { tag: "{{currentDate}}", description: "Current date" },
];

export default function EmailTemplatesTab() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [formData, setFormData] = useState<TemplateFormData>({
    key: "",
    nameEn: "",
    nameAr: "",
    subjectEn: "",
    subjectAr: "",
    bodyHtmlEn: "",
    bodyHtmlAr: "",
    bodyTextEn: "",
    bodyTextAr: "",
    isActive: true,
  });

  // Fetch templates
  const { data: templates, isLoading: templatesLoading, refetch } = trpc.emailTemplate.list.useQuery({
    limit: 50,
    offset: 0,
  });

  // Create template mutation
  const createMutation = trpc.emailTemplate.create.useMutation({
    onSuccess: () => {
      refetch();
      setIsCreateDialogOpen(false);
      resetForm();
    },
  });

  // Update template mutation
  const updateMutation = trpc.emailTemplate.update.useMutation({
    onSuccess: () => {
      refetch();
      setIsEditDialogOpen(false);
      resetForm();
    },
  });

  // Delete template mutation
  const deleteMutation = trpc.emailTemplate.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const resetForm = () => {
    setFormData({
      key: "",
      nameEn: "",
      nameAr: "",
      subjectEn: "",
      subjectAr: "",
      bodyHtmlEn: "",
      bodyHtmlAr: "",
      bodyTextEn: "",
      bodyTextAr: "",
      isActive: true,
    });
  };

  const handleCreateClick = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const handleEditClick = (template: any) => {
    setSelectedTemplate(template);
    setFormData({
      key: template.key,
      nameEn: template.nameEn || "",
      nameAr: template.nameAr || "",
      subjectEn: template.subjectEn || "",
      subjectAr: template.subjectAr || "",
      bodyHtmlEn: template.bodyHtmlEn || "",
      bodyHtmlAr: template.bodyHtmlAr || "",
      bodyTextEn: template.bodyTextEn || "",
      bodyTextAr: template.bodyTextAr || "",
      isActive: template.isActive !== false,
    });
    setIsEditDialogOpen(true);
  };

  const handlePreviewClick = (template: any) => {
    setPreviewTemplate({
      templateKey: template.key,
      nameEn: template.nameEn,
      nameAr: template.nameAr,
      subjectEn: template.subjectEn,
      subjectAr: template.subjectAr,
      bodyHtmlEn: template.bodyHtmlEn,
      bodyHtmlAr: template.bodyHtmlAr,
      bodyTextEn: template.bodyTextEn,
      bodyTextAr: template.bodyTextAr,
    });
    setIsPreviewModalOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!formData.key || !formData.nameEn) {
      alert("Template key and English name are required");
      return;
    }

    if (selectedTemplate) {
      await updateMutation.mutateAsync({
        id: selectedTemplate.id,
        ...formData,
      });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (confirm("Are you sure you want to delete this template?")) {
      await deleteMutation.mutateAsync({ id });
    }
  };

  if (templatesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Email Templates</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Manage global email templates for all organizations
          </p>
        </div>
        <Button className="gap-2" onClick={handleCreateClick}>
          <Plus className="w-4 h-4" />
          Create Template
        </Button>
      </div>

      {/* Templates List or Empty State */}
      {templates && templates.length > 0 ? (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{template.nameEn}</h4>
                      {template.nameAr && (
                        <span className="text-sm text-muted-foreground">/ {template.nameAr}</span>
                      )}
                      {template.isActive ? (
                        <Badge variant="default" className="ml-2">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="ml-2">Inactive</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Key: <code className="bg-muted px-2 py-1 rounded">{template.key}</code>
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Subject: {template.subjectEn}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreviewClick(template)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClick(template)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Templates Yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Create your first email template to get started
            </p>
            <Button className="gap-2" onClick={handleCreateClick}>
              <Plus className="w-4 h-4" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Features Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Template Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
            <div>
              <p className="font-medium">Bilingual Support</p>
              <p className="text-muted-foreground">English and Arabic subject/body</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
            <div>
              <p className="font-medium">Merge Tags</p>
              <p className="text-muted-foreground">Support for dynamic fields like firstName, organizationName, etc.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
            <div>
              <p className="font-medium">Template Preview</p>
              <p className="text-muted-foreground">Preview how templates render with sample data</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
            <div>
              <p className="font-medium">Global vs Org-Overridable</p>
              <p className="text-muted-foreground">Define global templates or allow org customization</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Template Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setIsEditDialogOpen(false);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? "Edit Template" : "Create New Template"}
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate
                ? "Update the template details below"
                : "Create a new email template with bilingual support"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Template Key */}
            <div>
              <label className="text-sm font-medium block mb-2">Template Key *</label>
              <Input
                placeholder="e.g., onboarding_welcome"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                disabled={!!selectedTemplate}
              />
            </div>

            {/* English Name */}
            <div>
              <label className="text-sm font-medium block mb-2">Template Name (English) *</label>
              <Input
                placeholder="e.g., Welcome Email"
                value={formData.nameEn}
                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
              />
            </div>

            {/* Arabic Name */}
            <div>
              <label className="text-sm font-medium block mb-2">Template Name (Arabic)</label>
              <Input
                placeholder="e.g., رسالة الترحيب"
                value={formData.nameAr}
                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                dir="rtl"
              />
            </div>

            {/* English Subject */}
            <div>
              <label className="text-sm font-medium block mb-2">Subject (English) *</label>
              <Input
                placeholder="e.g., Welcome to {{organizationName}}"
                value={formData.subjectEn}
                onChange={(e) => setFormData({ ...formData, subjectEn: e.target.value })}
              />
            </div>

            {/* Arabic Subject */}
            <div>
              <label className="text-sm font-medium block mb-2">Subject (Arabic)</label>
              <Input
                placeholder="e.g., أهلا بك في {{organizationName}}"
                value={formData.subjectAr}
                onChange={(e) => setFormData({ ...formData, subjectAr: e.target.value })}
                dir="rtl"
              />
            </div>

            {/* English Body HTML */}
            <div>
              <label className="text-sm font-medium block mb-2">Body HTML (English) *</label>
              <Textarea
                placeholder="Enter HTML template content..."
                value={formData.bodyHtmlEn}
                onChange={(e) => setFormData({ ...formData, bodyHtmlEn: e.target.value })}
                rows={6}
              />
            </div>

            {/* Arabic Body HTML */}
            <div>
              <label className="text-sm font-medium block mb-2">Body HTML (Arabic)</label>
              <Textarea
                placeholder="Enter HTML template content..."
                value={formData.bodyHtmlAr}
                onChange={(e) => setFormData({ ...formData, bodyHtmlAr: e.target.value })}
                rows={6}
                dir="rtl"
              />
            </div>

            {/* Merge Tags Reference */}
            <Card className="bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Available Merge Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {MERGE_TAGS.map((tag) => (
                    <div key={tag.tag} className="flex items-center gap-2">
                      <code className="bg-background px-2 py-1 rounded font-mono">{tag.tag}</code>
                      <span className="text-muted-foreground">{tag.description}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Active Status */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
              <label htmlFor="isActive" className="text-sm font-medium">
                Active (template can be used for sending emails)
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Template"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <EmailTemplatePreviewModal
        open={isPreviewModalOpen}
        onOpenChange={setIsPreviewModalOpen}
        template={previewTemplate}
      />
    </div>
  );
}
