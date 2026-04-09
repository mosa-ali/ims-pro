import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Download, X } from "lucide-react";
import { toast } from "sonner";

interface EmailTemplatePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: {
    templateKey: string;
    nameEn?: string;
    nameAr?: string;
    subjectEn?: string;
    subjectAr?: string;
    bodyHtmlEn?: string;
    bodyHtmlAr?: string;
    bodyTextEn?: string;
    bodyTextAr?: string;
  };
}

// Sample merge tag data for preview
const SAMPLE_DATA = {
  firstName: "Ahmed",
  lastName: "Hassan",
  email: "ahmed@example.com",
  organizationName: "Yamany Foundation for Development",
  organizationNameAr: "مؤسسة اليماني للتنمية",
  onboardingLink: "https://app.example.com/onboarding/abc123",
  supportEmail: "support@example.com",
  currentDate: new Date().toLocaleDateString(),
};

// Merge tag definitions for reference
const MERGE_TAGS = [
  { tag: "{{firstName}}", description: "User's first name" },
  { tag: "{{lastName}}", description: "User's last name" },
  { tag: "{{email}}", description: "User's email address" },
  { tag: "{{organizationName}}", description: "Organization name (English)" },
  { tag: "{{organizationNameAr}}", description: "Organization name (Arabic)" },
  { tag: "{{onboardingLink}}", description: "One-link onboarding URL" },
  { tag: "{{supportEmail}}", description: "Support email address" },
  { tag: "{{currentDate}}", description: "Current date" },
];

function renderMergeTags(text: string | undefined): string {
  if (!text) return "";

  let result = text;
  Object.entries(SAMPLE_DATA).forEach(([key, value]) => {
    const tag = `{{${key}}}`;
    result = result.replace(new RegExp(tag, "g"), String(value));
  });
  return result;
}

export function EmailTemplatePreviewModal({
  open,
  onOpenChange,
  template,
}: EmailTemplatePreviewModalProps) {
  const [language, setLanguage] = useState<"en" | "ar">("en");

  if (!template) return null;

  const isArabic = language === "ar";
  const subject = isArabic ? template.subjectAr : template.subjectEn;
  const bodyHtml = isArabic ? template.bodyHtmlAr : template.bodyHtmlEn;
  const bodyText = isArabic ? template.bodyTextAr : template.bodyTextEn;

  const renderedSubject = renderMergeTags(subject);
  const renderedHtml = renderMergeTags(bodyHtml);
  const renderedText = renderMergeTags(bodyText);

  const handleCopySubject = () => {
    navigator.clipboard.writeText(renderedSubject);
    toast.success("Subject copied to clipboard");
  };

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(renderedHtml || "");
    toast.success("HTML body copied to clipboard");
  };

  const handleDownloadPreview = () => {
    const content = `
Subject: ${renderedSubject}

HTML Body:
${renderedHtml}

Text Body:
${renderedText}
    `.trim();

    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(content)
    );
    element.setAttribute(
      "download",
      `${template.templateKey}_preview_${language}.txt`
    );
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("Preview downloaded");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Email Template Preview</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Preview of {template.templateKey} template with sample data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Language Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Language:</span>
            <div className="flex gap-2">
              <Button
                variant={language === "en" ? "default" : "outline"}
                size="sm"
                onClick={() => setLanguage("en")}
              >
                English
              </Button>
              <Button
                variant={language === "ar" ? "default" : "outline"}
                size="sm"
                onClick={() => setLanguage("ar")}
              >
                العربية
              </Button>
            </div>
          </div>

          {/* Template Metadata */}
          <Card className="p-4 bg-slate-50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-600">Template Key</p>
                <p className="font-mono text-sm">{template.templateKey}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Template Name</p>
                <p className="text-sm">
                  {isArabic ? template.nameAr : template.nameEn}
                </p>
              </div>
            </div>
          </Card>

          {/* Subject Line */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Subject Line</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopySubject}
                className="h-8 w-8 p-0"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <Card className="p-4 bg-blue-50 border-blue-200">
              <p
                className="text-sm font-mono break-words"
                dir={isArabic ? "rtl" : "ltr"}
              >
                {renderedSubject}
              </p>
            </Card>
          </div>

          {/* HTML Body Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">HTML Body Preview</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyHtml}
                className="h-8 w-8 p-0"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <Card className="p-4 bg-white border border-slate-200">
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: renderedHtml || "" }}
                dir={isArabic ? "rtl" : "ltr"}
              />
            </Card>
          </div>

          {/* Text Body */}
          <div>
            <label className="text-sm font-medium block mb-2">
              Text Body
            </label>
            <Card className="p-4 bg-slate-50">
              <p
                className="text-sm whitespace-pre-wrap break-words font-mono"
                dir={isArabic ? "rtl" : "ltr"}
              >
                {renderedText}
              </p>
            </Card>
          </div>

          {/* Merge Tags Reference */}
          <div>
            <label className="text-sm font-medium block mb-2">
              Available Merge Tags
            </label>
            <Card className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {MERGE_TAGS.map((item) => (
                  <div
                    key={item.tag}
                    className="flex items-start gap-2 p-2 bg-slate-50 rounded border border-slate-200"
                  >
                    <Badge variant="outline" className="font-mono text-xs">
                      {item.tag}
                    </Badge>
                    <span className="text-xs text-slate-600">
                      {item.description}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={handleDownloadPreview}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Download Preview
            </Button>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
